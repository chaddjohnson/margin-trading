// The bounded evaluation pool (PROTOCOL.md §11), after the Growth studies' design: child-process workers started one
// at a time (one door copy each), ≤ `inflight` tasks per worker, a bounded queue, and the stop path (a requested stop
// ends dispatching, in-flight work finishes, the caller commits and exits). A worker that dies fails the job: there is
// no automatic restart; the job is resumed by rerunning the same command (stored records are never recomputed).
import { type ChildProcess, fork } from 'node:child_process';
import path from 'node:path';
import { StopRequested } from '../growth140-vgt-s8m/pool.ts';
import { codeDir, log, resources } from './context.ts';
import type { Spec } from './specs.ts';

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
  busy: Map<string, (value: unknown) => void>;
  mem: Mem | null;
  count: number;
  gcs: number;
  loadMs: number;
}

export interface Task {
  k: string;
  spec: Spec;
  detail?: boolean;
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

  constructor(
    private readonly options: {
      door: string;
      purpose: string;
      workers: number;
      guardFile?: string;
      guardSha256?: string;
    }
  ) {}

  async start() {
    for (let i = 0; i < this.options.workers; i++) await this.spawn();
  }

  private spawn() {
    const child = fork(
      path.join(codeDir, 'worker.ts'),
      [
        this.options.door,
        this.options.purpose,
        String(resources.gcEveryEvaluations),
        String(resources.gcArrayBufferBytes),
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
              this.fail(new Error(`evaluation ${m.k} failed: ${String(m.e)}`));
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
        w.child.send({ t: 'eval', k: task.k, spec: task.spec, detail: task.detail });
      }
  }

  get inFlight() {
    return this.ws.reduce((a, w) => a + w.busy.size, 0);
  }

  get queued() {
    return this.queue.length;
  }

  // Runs tasks; `onResult` sees each result as it arrives (the caller archives it at once).
  async run<T>(tasks: Task[], onResult: (task: Task, value: T) => void): Promise<void> {
    let left = tasks.length;

    if (left === 0) return;

    for (const task of tasks)
      this.queue.push({
        ...task,
        resolve: (v) => {
          onResult(task, v as T);
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
