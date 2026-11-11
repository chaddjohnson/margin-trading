// The bounded evaluation pool (PROTOCOL.md §13; 4A's src/gdx-growth-standalone/workers.ts bound to this study):
// child-process workers started `resources.startBatch` at a time (one ETF door each), ≤ `inflightPerWorker` tasks per worker, a bounded
// queue fed in chunks by the caller, and the stop path (a requested stop ends dispatching, in-flight work finishes, the
// caller commits and exits). A worker that dies fails the job at once — its in-flight tasks are dropped so the wait
// loop ends (Priority 1's AMENDMENTS E1) — and nothing restarts it: the job is resumed by rerunning the same command.
// Each result carries its worker's compute time (evaluation time is reported beside the counts).
import { type ChildProcess, fork } from 'node:child_process';
import path from 'node:path';
import { StopRequested } from '../growth140-vgt-s8m/pool.ts';
import { codeDir, log, resources } from './context.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';

export { StopRequested };

interface Mem {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

interface WorkerState {
  child: ChildProcess;
  busy: Map<string, (value: unknown, ms: number) => void>;
  mem: Mem | null;
  count: number;
  gcs: number;
  loadMs: number;
}

export interface Task {
  k: string;
  quad: Quad;
  options: EvalOptions;
}

export class Pool {
  private readonly ws: WorkerState[] = [];
  private queue: (Task & { resolve: (v: unknown, ms: number) => void })[] = [];
  private stopReason: string | null = null;
  private failure: Error | null = null;
  private waiters: (() => void)[] = [];
  private closing = false;
  completed = 0;
  failed = 0;
  computeMs = 0; // Σ worker compute time of the completed evaluations

  constructor(
    private readonly options: {
      door: string;
      purpose: string;
      workers: number;
      guardFile?: string;
      guardSha256?: string;
      killAfter?: number; // pilot only: one worker SIGKILLs itself after this many evaluations
    }
  ) {}

  get workersWanted() {
    return this.options.workers;
  }

  // workers load their door in batches (bounded transient memory while the minute files are parsed)
  async start() {
    const n = Math.max(1, resources.startBatch);

    for (let i = 0; i < this.options.workers; i += n)
      await Promise.all(Array.from({ length: Math.min(n, this.options.workers - i) }, (_v, k) => this.spawn(i + k)));
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
        ...(this.options.guardFile ? [this.options.guardFile, this.options.guardSha256 ?? ''] : [])
      ],
      {
        execArgv: [
          '--expose-gc',
          `--max-old-space-size=${resources.workerOldSpaceMb}`,
          '--experimental-transform-types',
          '--disable-warning=ExperimentalWarning'
        ],
        serialization: 'advanced',
        env: { ...process.env, VGJ_BOOK_CACHE: String(resources.bookCacheEntries) },
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
          ms?: number;
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
            this.computeMs += m.ms ?? 0;

            if (m.t === 'err') {
              this.failed++;
              this.fail(new Error(`evaluation ${m.k} failed: ${String(m.e)}`));
            } else done?.(m.r, m.ms ?? 0);

            this.pump();
          }
        }
      );
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
        w.child.send({ t: 'eval', k: task.k, quad: task.quad, options: task.options });
      }
  }

  get inFlight() {
    return this.ws.reduce((a, w) => a + w.busy.size, 0);
  }

  get queued() {
    return this.queue.length;
  }

  // Runs tasks; `onResult` sees each result as it arrives (the caller archives it at once).
  async run<T>(tasks: Task[], onResult: (task: Task, value: T, ms: number) => void): Promise<void> {
    let left = tasks.length;

    if (left === 0) return;
    if (this.failure) throw this.failure;
    if (this.stopReason) throw new StopRequested(this.stopReason);

    for (const task of tasks)
      this.queue.push({
        ...task,
        resolve: (v, ms) => {
          onResult(task, v as T, ms);
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
            if (w.child.connected) w.child.send({ t: 'exit' });
            setTimeout(() => w.child.kill('SIGKILL'), 10000).unref();
          })
      )
    );
  }
}
