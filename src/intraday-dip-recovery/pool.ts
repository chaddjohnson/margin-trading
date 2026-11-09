// The bounded evaluation pool and the job archive (PROTOCOL.md §13). Child-process workers (one door each, started
// four at a time), ≤ `inflightPerWorker` tasks per worker, a bounded queue fed in chunks; a requested stop ends
// dispatching while in-flight work finishes; a worker that dies fails the job at once (its in-flight tasks dropped, so
// nothing waits forever) and nothing restarts it. The archive is an append-only JSONL file per job, bound to the study,
// the job, the door pin and the evaluation-code digest; results are appended as they arrive (flushed every 2 s or 500
// rows) and read back on a rerun, so a resumed job replays deterministically to the same result.
import { type ChildProcess, fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { type DoorKey, STUDY, cacheDir, codeDir, log, prefixDoors } from './context.ts';
import type { Rec, RunSpec } from './evaluate.ts';
import { resources } from './resources.ts';

export class StopRequested extends Error {
  constructor(reason: string) {
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
  busy: Map<string, (value: Rec) => void>;
  mem: Mem | null;
  count: number;
  gcs: number;
  loadMs: number;
}

export interface Task {
  k: string;
  spec: RunSpec;
}

export class Pool {
  private readonly ws: WorkerState[] = [];
  private queue: (Task & { resolve: (v: Rec) => void })[] = [];
  private stopReason: string | null = null;
  private failure: Error | null = null;
  private waiters: (() => void)[] = [];
  private closing = false;

  constructor(
    private readonly options: { door: DoorKey; purpose: string; workers: number; guardSha?: string; killAfter?: number }
  ) {}

  async start() {
    for (let i = 0; i < this.options.workers; i += 4)
      await Promise.all(Array.from({ length: Math.min(4, this.options.workers - i) }, (_v, k) => this.spawn(i + k)));
  }

  private spawn(index: number) {
    const child = fork(
      path.join(codeDir, 'worker.ts'),
      [
        this.options.door,
        this.options.purpose,
        String(resources.gcEveryEvaluations),
        String(resources.gcArrayBufferBytes),
        index === 0 && this.options.killAfter ? String(this.options.killAfter) : '0',
        ...(this.options.guardSha ? [this.options.guardSha] : [])
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
      child.on('message', (m: { t: string; k?: string; r?: Rec; e?: string; mem?: Mem; loadMs?: number; count?: number; gcs?: number }) => {
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

          if (m.t === 'err') this.fail(new Error(`evaluation ${m.k} failed: ${String(m.e)}`));
          else done?.(m.r!);

          this.pump();
        }
      });
      child.once('exit', (code, signal) => {
        const error = new Error(`worker ${child.pid} exited (${code ?? signal})`);

        if (!this.ws.includes(w)) reject(error);
        else if (!this.closing) {
          w.busy.clear();
          this.ws.splice(this.ws.indexOf(w), 1);
          this.fail(error);
        }
      });
    });
  }

  private fail(error: Error) {
    if (!this.failure) {
      this.failure = error;
      log(`pool failure: ${error.message.split('\n')[0]}`);
    }

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
      while (w.busy.size < resources.inflightPerWorker && this.queue.length) {
        const task = this.queue.shift()!;

        w.busy.set(task.k, task.resolve);
        w.child.send({ t: 'eval', k: task.k, spec: task.spec });
      }
  }

  get inFlight() {
    return this.ws.reduce((a, w) => a + w.busy.size, 0);
  }

  async run(tasks: Task[], onResult: (task: Task, value: Rec) => void): Promise<void> {
    let left = tasks.length;

    if (left === 0) return;
    if (this.failure) throw this.failure;
    if (this.stopReason) throw new StopRequested(this.stopReason);

    for (const task of tasks)
      this.queue.push({
        ...task,
        resolve: (v) => {
          onResult(task, v);
          left--;
          this.wake();
        }
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
  }

  async refreshMemory() {
    for (const w of this.ws) if (w.child.connected) w.child.send({ t: 'mem' });
    await new Promise((r) => setTimeout(r, 100));
  }

  workerStats() {
    return this.ws.map((w) => ({ pid: w.child.pid!, mem: w.mem, count: w.count, gcs: w.gcs, loadMs: w.loadMs }));
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
            if (w.child.connected) w.child.send({ t: 'exit' });
            setTimeout(() => w.child.kill('SIGKILL'), 10000).unref();
          })
      )
    );
  }
}

// The job archive.
export interface ArchiveHeader {
  study: string;
  job: string;
  door: string;
  doorSha256: string;
  codeDigest: string;
}

export class Archive {
  readonly file: string;
  private readonly map = new Map<string, Rec>();
  private buffer: string[] = [];
  private lastFlush = Date.now();
  readonly loaded: number;

  constructor(job: string, header: Omit<ArchiveHeader, 'study'>) {
    const dir = path.join(cacheDir, 'jobs', job);

    this.file = path.join(dir, 'archive.jsonl');
    fs.mkdirSync(dir, { recursive: true });

    const full: ArchiveHeader = { study: STUDY, ...header };

    if (fs.existsSync(this.file)) {
      const lines = fs.readFileSync(this.file, 'utf8').split('\n');
      const first = JSON.parse(lines[0]!) as ArchiveHeader;

      if (JSON.stringify(first) !== JSON.stringify(full))
        throw new Error(`archive ${this.file} belongs to ${JSON.stringify(first)}, not ${JSON.stringify(full)}`);

      for (const line of lines.slice(1)) {
        if (!line) continue;

        try {
          const { k, r } = JSON.parse(line) as { k: string; r: Rec };

          this.map.set(k, r);
        } catch {
          // a torn last line after an abrupt kill: ignored (the evaluation is recomputed)
        }
      }
    } else fs.writeFileSync(this.file, `${JSON.stringify(full)}\n`);

    this.loaded = this.map.size;
  }

  get(k: string) {
    return this.map.get(k);
  }

  has(k: string) {
    return this.map.has(k);
  }

  put(k: string, r: Rec) {
    this.map.set(k, r);
    this.buffer.push(`${JSON.stringify({ k, r })}\n`);
    if (this.buffer.length >= 500 || Date.now() - this.lastFlush > 2000) this.flush();
  }

  flush() {
    if (this.buffer.length) {
      const fd = fs.openSync(this.file, 'a');

      fs.writeSync(fd, this.buffer.join(''));
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      this.buffer = [];
    }

    this.lastFlush = Date.now();
  }

  get size() {
    return this.map.size;
  }
}

export const doorSha = (door: DoorKey, fullSha: string) => (door === 'FULL' ? fullSha : prefixDoors[door].sha256);
