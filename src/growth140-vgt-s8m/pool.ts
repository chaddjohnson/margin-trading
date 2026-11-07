// The evaluation pool and the memory monitor (PROTOCOL.md §3).
//
// - Workers are child processes (one door copy each, measured), started one at a time so loading peaks never overlap.
// - Pending work is bounded: each worker holds at most `inflight` tasks; a batch's remaining keys wait as plain strings.
// - `Lab` puts the archive in front: a record already on disk is never recomputed; a fresh one is written through the
//   bounded write buffer.
// - The monitor samples every 10 s (job cgroup memory, per-process RSS, worker heap/external/arrayBuffers, cache and
//   queue sizes, completed evaluations) into a JSONL log, and requests a stop at the pressure threshold: dispatching
//   ends, in-flight work finishes, the caller checkpoints and exits (75).
import { type ChildProcess, fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { codeDir, log, resources } from './context.ts';
import type { PointRecord } from './engine.ts';
import { type Config, configId } from './space.ts';
import type { Store } from './store.ts';

export class StopRequested extends Error {
  constructor(readonly reason: string) {
    super(`stop requested: ${reason}`);
  }
}

interface Mem {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

interface WorkerState {
  child: ChildProcess;
  busy: Map<string, (value: unknown) => void>;
  mem: Mem | null;
  count: number;
  gcs: number;
  loadMs: number;
}

export interface PoolOptions {
  door: string;
  workers: number;
  inflight?: number;
  frozenSha256?: string;
}

export class Pool {
  private readonly ws: WorkerState[] = [];
  private queue: { k: string; c: Config; detail?: boolean; boundary?: string; resolve: (v: unknown) => void }[] = [];
  private stopReason: string | null = null;
  private failure: Error | null = null;
  private waiters: (() => void)[] = [];
  completed = 0;
  readonly inflight: number;

  constructor(private readonly options: PoolOptions) {
    this.inflight = options.inflight ?? resources.inflightPerWorker;
  }

  async start() {
    for (let i = 0; i < this.options.workers; i++) await this.spawn();
  }

  private spawn() {
    const child = fork(
      path.join(codeDir, 'worker.ts'),
      [
        this.options.door,
        String(resources.gcEveryEvaluations),
        String(resources.gcArrayBufferBytes),
        this.options.frozenSha256 ?? ''
      ],
      {
        execArgv: [
          '--expose-gc',
          `--max-old-space-size=${resources.workerOldSpaceMb}`,
          '--experimental-transform-types',
          '--disable-warning=ExperimentalWarning'
        ],
        serialization: 'advanced',
        stdio: ['ignore', 'inherit', 'inherit', 'ipc']
      }
    );
    const w: WorkerState = { child, busy: new Map(), mem: null, count: 0, gcs: 0, loadMs: 0 };

    return new Promise<void>((resolve, reject) => {
      child.on(
        'message',
        (m: {
          t: string;
          k?: string;
          r?: unknown;
          e?: string;
          mem?: Mem;
          loadMs?: number;
          count?: number;
          gcs?: number;
        }) => {
          if (m.t === 'ready') {
            w.mem = m.mem!;
            w.loadMs = m.loadMs!;
            this.ws.push(w);
            resolve();
          } else if (m.t === 'mem') {
            w.mem = m.mem!;
            w.count = m.count!;
            w.gcs = m.gcs!;
          } else if (m.t === 'res' || m.t === 'err') {
            const done = w.busy.get(m.k!);

            w.busy.delete(m.k!);
            if (m.t === 'err') this.fail(new Error(`worker ${child.pid}: ${m.e}`));
            else {
              this.completed++;
              done?.(m.r);
            }
            this.pump();
          }
        }
      );
      child.once('exit', (code, signal) => {
        const error = new Error(`worker ${child.pid} exited (${code ?? signal})`);

        if (!this.ws.includes(w)) reject(error);
        else if (!this.closing) this.fail(error);
      });
    });
  }

  private closing = false;

  private fail(error: Error) {
    if (!this.failure) this.failure = error;
    this.wake();
  }

  private wake() {
    const waiters = this.waiters;

    this.waiters = [];
    for (const w of waiters) w();
  }

  requestStop(reason: string) {
    if (!this.stopReason) {
      this.stopReason = reason;
      log(`stop requested (${reason}): dispatching ends; in-flight work finishes`);
    }
    this.wake();
  }

  get stopping() {
    return this.stopReason;
  }

  private pump() {
    if (this.stopReason || this.failure) {
      this.wake();
      return;
    }

    for (const w of this.ws) {
      while (w.busy.size < this.inflight && this.queue.length) {
        const task = this.queue.shift()!;

        w.busy.set(task.k, task.resolve);
        w.child.send({ t: 'eval', k: task.k, c: task.c, detail: task.detail, boundary: task.boundary });
      }
    }
  }

  get inFlight() {
    return this.ws.reduce((a, w) => a + w.busy.size, 0);
  }

  get queued() {
    return this.queue.length;
  }

  // Evaluates tasks (unique keys) and returns their results in order; rejects with StopRequested (after in-flight
  // work completed) or the first worker failure.
  async run<T>(tasks: { k: string; c: Config; detail?: boolean; boundary?: string }[]): Promise<T[]> {
    const results = new Array<T>(tasks.length);
    let left = tasks.length;

    if (left === 0) return results;

    const finished = new Promise<void>((resolve) => {
      tasks.forEach((task, i) =>
        this.queue.push({
          ...task,
          resolve: (v) => {
            results[i] = v as T;
            if (--left === 0) resolve();
            this.wake();
          }
        })
      );
    });

    this.pump();

    for (;;) {
      if (left === 0) break;
      if ((this.stopReason || this.failure) && this.inFlight === 0) break;
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }

    if (left > 0) {
      this.queue = [];
      if (this.failure) throw this.failure;
      throw new StopRequested(this.stopReason!);
    }

    await finished;
    return results;
  }

  async refreshMemory() {
    for (const w of this.ws) w.child.send({ t: 'mem' });
    await new Promise((r) => setTimeout(r, 50));
  }

  workerStats() {
    return this.ws.map((w) => ({
      pid: w.child.pid!,
      mem: w.mem,
      count: w.count,
      gcs: w.gcs,
      loadMs: w.loadMs,
      busy: w.busy.size
    }));
  }

  get size() {
    return this.ws.length;
  }

  async close() {
    this.closing = true;
    await Promise.all(
      this.ws.map(
        (w) =>
          new Promise<void>((resolve) => {
            if (w.child.exitCode !== null || w.child.signalCode !== null) return resolve();
            w.child.once('exit', () => resolve());
            w.child.send({ t: 'exit' });
            setTimeout(() => w.child.kill('SIGKILL'), 10000).unref();
          })
      )
    );
  }
}

// The archive in front of the pool: records keyed by door and configuration id.
export class Lab {
  fresh = 0;
  hits = 0;
  stopAfterFresh?: number; // restart tests: request a stop once this many fresh evaluations exist

  constructor(
    readonly door: string,
    readonly pool: Pool,
    readonly store: Store
  ) {}

  key(c: Config) {
    return `${this.door}|${configId(c)}`;
  }

  async points(configs: readonly Config[]): Promise<PointRecord[]> {
    const keys = configs.map((c) => this.key(c));
    const out = new Array<PointRecord>(configs.length);
    const missing = new Map<string, { c: Config; at: number[] }>();

    keys.forEach((k, i) => {
      const r = this.store.read<PointRecord>('points', k);

      if (r) {
        out[i] = r;
        this.hits++;
      } else {
        const m = missing.get(k);

        if (m) m.at.push(i);
        else missing.set(k, { c: configs[i]!, at: [i] });
      }
    });

    const tasks = [...missing.entries()].map(([k, m]) => ({ k, c: m.c }));
    const chunk = 4096; // the queue never holds more than one chunk of a large batch

    for (let start = 0; start < tasks.length; start += chunk) {
      const part = tasks.slice(start, start + chunk);
      const records = await this.pool.run<PointRecord>(part);

      part.forEach((task, j) => {
        const r = records[j]!;

        this.store.write('points', task.k, r);
        this.store.write('configs', configId(task.c), task.c);
        this.fresh++;
        for (const i of missing.get(task.k)!.at) out[i] = r;
      });

      if (this.stopAfterFresh !== undefined && this.fresh >= this.stopAfterFresh)
        this.pool.requestStop(`stop-after ${this.stopAfterFresh} fresh evaluations (restart test)`);
    }

    return out;
  }

  async point(c: Config) {
    return (await this.points([c]))[0]!;
  }
}

// ----- the monitor -----

const cgroupDir = () => {
  const line = fs
    .readFileSync('/proc/self/cgroup', 'utf8')
    .trim()
    .split('\n')
    .find((l) => l.startsWith('0::'));

  return line ? path.join('/sys/fs/cgroup', line.slice(3)) : null;
};

const readNumber = (file: string) => {
  try {
    const t = fs.readFileSync(file, 'utf8').trim();

    return t === 'max' ? Infinity : Number(t);
  } catch {
    return NaN;
  }
};

const readKv = (file: string) => {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(file, 'utf8')
        .trim()
        .split('\n')
        .map((l) => l.split(' '))
        .map(([k, v]) => [k!, Number(v)])
    );
  } catch {
    return {};
  }
};

export const rssOf = (pid: number) => {
  try {
    const m = /VmRSS:\s+(\d+) kB/.exec(fs.readFileSync(`/proc/${pid}/status`, 'utf8'));

    return m ? Number(m[1]) * 1024 : NaN;
  } catch {
    return NaN;
  }
};

export const cgroupInfo = () => {
  const dir = cgroupDir();

  return {
    path: dir,
    current: dir ? readNumber(path.join(dir, 'memory.current')) : NaN,
    peak: dir ? readNumber(path.join(dir, 'memory.peak')) : NaN,
    high: dir ? readNumber(path.join(dir, 'memory.high')) : NaN,
    max: dir ? readNumber(path.join(dir, 'memory.max')) : NaN,
    swapCurrent: dir ? readNumber(path.join(dir, 'memory.swap.current')) : NaN,
    swapMax: dir ? readNumber(path.join(dir, 'memory.swap.max')) : NaN,
    events: dir ? readKv(path.join(dir, 'memory.events')) : {},
    anon: dir ? (readKv(path.join(dir, 'memory.stat')).anon ?? NaN) : NaN
  };
};

export interface MonitorOptions {
  file: string;
  pool: Pool;
  lab?: () => Lab | null;
  store?: () => Store | null;
  stage: () => string;
  extra?: () => Record<string, unknown>;
  pressureBytes: number;
}

export class Monitor {
  private timer: NodeJS.Timeout | null = null;
  peakCurrent = 0;
  peakRss = 0;
  samples = 0;

  constructor(private readonly o: MonitorOptions) {
    fs.mkdirSync(path.dirname(o.file), { recursive: true });
  }

  async sample(event?: string) {
    await this.o.pool.refreshMemory();

    const cg = cgroupInfo();
    const workers = this.o.pool
      .workerStats()
      .map((w) => ({ pid: w.pid, rss: rssOf(w.pid), ...w.mem, count: w.count, gcs: w.gcs, busy: w.busy }));
    const self = process.memoryUsage();
    const lab = this.o.lab?.() ?? null;
    const rssTotal = rssOf(process.pid) + workers.reduce((a, w) => a + (w.rss || 0), 0);
    const line = {
      t: new Date().toISOString(),
      event: event ?? null,
      stage: this.o.stage(),
      cgroup: {
        current: cg.current,
        peak: cg.peak,
        high: cg.high,
        max: cg.max,
        swap: cg.swapCurrent,
        anon: cg.anon,
        events: cg.events
      },
      workers: workers.length,
      coordinator: {
        pid: process.pid,
        rss: rssOf(process.pid),
        heapUsed: self.heapUsed,
        heapTotal: self.heapTotal,
        external: self.external,
        arrayBuffers: self.arrayBuffers
      },
      workerMem: workers,
      rssTotal,
      store: this.o.store?.()?.stats() ?? null,
      queue: { queued: this.o.pool.queued, inFlight: this.o.pool.inFlight },
      evaluations: { completed: this.o.pool.completed, fresh: lab?.fresh ?? null, archiveHits: lab?.hits ?? null },
      ...(this.o.extra?.() ?? {})
    };

    this.samples++;
    this.peakCurrent = Math.max(this.peakCurrent, Number.isFinite(cg.current) ? cg.current : 0);
    this.peakRss = Math.max(this.peakRss, rssTotal);
    fs.appendFileSync(this.o.file, `${JSON.stringify(line)}\n`);

    if (Number.isFinite(cg.current) && cg.current >= this.o.pressureBytes)
      this.o.pool.requestStop(`memory pressure: cgroup memory.current ${cg.current} ≥ ${this.o.pressureBytes}`);

    return line;
  }

  start() {
    this.timer = setInterval(() => void this.sample(), resources.sampleEveryMs);
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}
