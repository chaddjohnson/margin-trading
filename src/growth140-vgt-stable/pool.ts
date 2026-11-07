// The evaluation pool (PROTOCOL.md §3), the completed study's bounded design: child-process workers started one at a
// time (one door copy each), ≤ `inflight` tasks per worker, a batch queued ≤ 4,096 keys at a time, the archive in front
// (a stored record is never recomputed) and the 10-second monitor with the stop-and-checkpoint threshold. Changed here:
// the worker path and doors, the door guards, and failure recording (a failed evaluation is archived with its error
// and the job continues; it is infeasible everywhere).
import { type ChildProcess, fork } from 'node:child_process';
import path from 'node:path';
import { Monitor as PriorMonitor, StopRequested, cgroupInfo, rssOf } from '../growth140-vgt-s8m/pool.ts';
import type { Store } from '../growth140-vgt-s8m/store.ts';
import { codeDir, log, resources } from './context.ts';
import type { StableRecord } from './engine.ts';
import { type Config, configId } from './space.ts';

export { StopRequested, cgroupInfo, rssOf };

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
  guardFile?: string; // a sealed file the worker verifies (sha256) before it opens its door
  guardSha256?: string;
}

export interface Task {
  k: string;
  c: Config;
  detail?: boolean;
  boundary?: string;
  events?: boolean;
  marks?: boolean;
}

export class Pool {
  private readonly ws: WorkerState[] = [];
  private queue: (Task & { resolve: (v: unknown) => void })[] = [];
  private stopReason: string | null = null;
  private failure: Error | null = null;
  private waiters: (() => void)[] = [];
  private closing = false;
  completed = 0;
  failed = 0;
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
        this.options.guardFile ?? '',
        this.options.guardSha256 ?? ''
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
            this.completed++;
            if (m.t === 'err') {
              this.failed++;
              log(`evaluation ${m.k} failed (archived as a failure): ${String(m.e).split('\n')[0]}`);
              done?.({ __error: m.e });
            } else done?.(m.r);
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

    for (const w of this.ws)
      while (w.busy.size < this.inflight && this.queue.length) {
        const task = this.queue.shift()!;

        w.busy.set(task.k, task.resolve);
        w.child.send({ t: 'eval', ...task, resolve: undefined });
      }
  }

  get inFlight() {
    return this.ws.reduce((a, w) => a + w.busy.size, 0);
  }

  get queued() {
    return this.queue.length;
  }

  async run<T>(tasks: Task[]): Promise<T[]> {
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

// A failed evaluation's archived record: every figure NaN (infeasible), the error kept verbatim.
const failureRecord = (c: Config, error: string): StableRecord =>
  ({ id: configId(c), net: NaN, dd: NaN, trades: 0, halves: {}, signature: 'error', error }) as unknown as StableRecord;

// The archive in front of the pool: records keyed by door and configuration id.
export class Lab {
  fresh = 0;
  hits = 0;
  failures = 0;
  stopAfterFresh?: number;

  constructor(
    readonly door: string,
    readonly pool: Pool,
    readonly store: Store
  ) {}

  key(c: Config) {
    return `${this.door}|${configId(c)}`;
  }

  async points(configs: readonly Config[]): Promise<StableRecord[]> {
    const keys = configs.map((c) => this.key(c));
    const out = new Array<StableRecord>(configs.length);
    const missing = new Map<string, { c: Config; at: number[] }>();

    keys.forEach((k, i) => {
      const r = this.store.read<StableRecord>('points', k);

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
    const chunk = 4096;

    for (let start = 0; start < tasks.length; start += chunk) {
      const part = tasks.slice(start, start + chunk);
      const records = await this.pool.run<StableRecord | { __error: string }>(part);

      part.forEach((task, j) => {
        const raw = records[j]!;
        const r = '__error' in raw ? failureRecord(task.c, raw.__error) : raw;

        if ('__error' in raw) this.failures++;
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

  // On-demand detail (selected configurations only; never archived as a point).
  async detail<T = any>(c: Config, extra: Omit<Task, 'k' | 'c'> = {}) {
    const [d] = await this.pool.run<T | { __error: string }>([
      { k: `detail|${configId(c)}|${JSON.stringify(extra)}`, c, detail: true, ...extra }
    ]);

    if (d && typeof d === 'object' && '__error' in (d as object))
      throw new Error(`detail failed: ${(d as { __error: string }).__error}`);
    return d as T;
  }
}

export const Monitor = PriorMonitor as unknown as new (o: {
  file: string;
  pool: Pool;
  lab?: () => Lab | null;
  store?: () => Store | null;
  stage: () => string;
  extra?: () => Record<string, unknown>;
  pressureBytes: number;
}) => InstanceType<typeof PriorMonitor>;
