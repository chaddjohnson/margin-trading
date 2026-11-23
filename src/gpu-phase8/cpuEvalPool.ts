// gpu-phase8 (a copy of src/gpu-phase6/cpuEvalPool.ts with this study's namespace; it forwards a task's `risk` flag): the CPU worker pool of the NON-OFFICIAL CPU arm (purpose 'parity-test'): Assignment 3's Pool semantics
// (≤ inflight tasks per worker, results keyed by task, a dead worker fails the run, a requested stop lets in-flight work
// finish) over src/gpu-phase8/cpuEvalWorker.ts.
import { type ChildProcess, fork } from 'node:child_process';
import path from 'node:path';
import { engineExecArgv, maglevDisabled } from '../gpu-backend/runtime.ts';
import { StopRequested } from '../growth140-vgt-s8m/pool.ts';
import type { Task } from '../gpu-backend/client.ts';
import type { PoolLike } from '../gpu-backend/lab.ts';
import type { DoorSpec } from './doorSpec.ts';

export class CpuEvalPool implements PoolLike {
  private ws: { child: ChildProcess; busy: Map<string, (v: unknown, ms: number) => void> }[] = [];
  private queue: (Task & { resolve: (v: unknown, ms: number) => void })[] = [];
  private stopReason: string | null = null;
  private failure: Error | null = null;
  private waiters: (() => void)[] = [];
  private closing = false;
  completed = 0;
  computeMs = 0;

  constructor(
    readonly workers: number,
    readonly door: DoorSpec,
    readonly inflightPerWorker = 4
  ) {}

  async start() {
    for (let i = 0; i < this.workers; i += 4)
      await Promise.all(Array.from({ length: Math.min(4, this.workers - i) }, () => this.spawn()));
  }

  private spawn() {
    const child = fork(path.join(import.meta.dirname, 'cpuEvalWorker.ts'), [], {
      execArgv: [
        // under the parent's engine configuration (src/gpu-backend/runtime.ts): no Maglev when the parent has none
        ...(maglevDisabled() ? engineExecArgv : []),
        '--expose-gc',
        '--max-old-space-size=3072',
        '--experimental-transform-types',
        '--disable-warning=ExperimentalWarning'
      ],
      serialization: 'advanced',
      env: { ...process.env, GPU_POLICY_PURPOSE: 'parity-test' },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc']
    });
    const w = { child, busy: new Map<string, (v: unknown, ms: number) => void>() };

    return new Promise<void>((resolve) => {
      child.on('message', (m: { t: string; k?: string; r?: unknown; e?: string; ms?: number }) => {
        if (m.t === 'ready') {
          this.ws.push(w);
          resolve();
        } else if (m.t === 'res' || m.t === 'err') {
          const done = w.busy.get(m.k!);

          w.busy.delete(m.k!);
          if (m.t === 'err') this.fail(new Error(`evaluation ${m.k} failed: ${m.e}`));
          else {
            this.completed++;
            this.computeMs += m.ms ?? 0;
            done?.(m.r, m.ms ?? 0);
          }
          this.pump();
        }
      });
      child.once('exit', (code, signal) => {
        if (!this.closing) {
          w.busy.clear();
          this.fail(new Error(`CPU worker ${child.pid} exited (${code ?? signal})`));
        }
      });
      child.send({ t: 'door', door: this.door });
    });
  }

  private fail(e: Error) {
    this.failure ??= e;
    this.wake();
  }

  private wake() {
    const w = this.waiters;

    this.waiters = [];
    for (const x of w) x();
  }

  requestStop(reason: string) {
    this.stopReason ??= reason;
    this.wake();
  }

  get stopping() {
    return this.stopReason;
  }

  private get inFlight() {
    return this.ws.reduce((a, w) => a + w.busy.size, 0);
  }

  private pump() {
    if (this.stopReason || this.failure) return this.wake();
    for (const w of this.ws)
      while (w.busy.size < this.inflightPerWorker && this.queue.length) {
        const t = this.queue.shift()!;

        w.busy.set(t.k, t.resolve);
        w.child.send({
          t: 'eval',
          k: t.k,
          quad: t.quad,
          controls: t.controls,
          options: t.options,
          detail: t.detail,
          risk: t.risk,
          ...(t.staged ? { staged: t.staged } : {}) // gpu-phase8
        });
      }
  }

  async run<T>(tasks: Task[], onResult: (task: Task, value: T, ms: number) => void): Promise<void> {
    let left = tasks.length;

    if (!left) return;
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
      await new Promise<void>((r) => this.waiters.push(r));
    }
    if (left > 0) {
      this.queue = [];
      if (this.failure) throw this.failure;
      throw new StopRequested(this.stopReason!);
    }
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
