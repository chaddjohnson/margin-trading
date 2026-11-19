// The CPU reference pool (S1/S5): Assignment 3's bounded evaluation pool (src/vg-l0-full-joint/workers.ts) with the
// same mechanics — child-process workers started four at a time, `inflight` tasks per worker (A3: 2), IPC with
// `serialization: 'advanced'`, a dead worker fails the run at once — driving this study's cpuWorker.ts.
import { type ChildProcess, fork } from 'node:child_process';
import path from 'node:path';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import type { RiskConfig2 } from '../d1-risk-controls-rc2/config.ts';

export interface Task {
  t?: 'eval' | 'growth'; // 'growth': only the Growth books (the hybrid benchmark's CPU half)
  k: string;
  quad: Quad;
  controls: RiskConfig2 | null;
  options: EvalOptions;
  noCache?: boolean;
}

interface W {
  child: ChildProcess;
  busy: Map<string, (h: string, ms: number, g?: unknown) => void>;
  loadMs: number;
  stats: Record<string, unknown> | null;
}

export class CpuPool {
  private readonly ws: W[] = [];
  private queue: (Task & { resolve: (h: string, ms: number, g?: unknown) => void })[] = [];
  private failure: Error | null = null;
  private waiters: (() => void)[] = [];
  private closing = false;
  computeMs = 0;
  completed = 0;

  constructor(
    private readonly o: { door: string; purpose: string; workers: number; inflight?: number; gcEvery?: number }
  ) {}

  async start() {
    for (let i = 0; i < this.o.workers; i += 4)
      await Promise.all(Array.from({ length: Math.min(4, this.o.workers - i) }, () => this.spawn()));
  }

  private spawn() {
    const child = fork(
      path.join(import.meta.dirname, 'cpuWorker.ts'),
      [this.o.door, this.o.purpose, String(this.o.gcEvery ?? 64), String(256 * 2 ** 20)],
      {
        execArgv: [
          '--expose-gc',
          '--max-old-space-size=1536',
          '--experimental-transform-types',
          '--disable-warning=ExperimentalWarning'
        ],
        serialization: 'advanced',
        stdio: ['ignore', 'inherit', 'inherit', 'ipc']
      }
    );
    const w: W = { child, busy: new Map(), loadMs: 0, stats: null };

    return new Promise<void>((resolve, reject) => {
      child.on(
        'message',
        (m: { t: string; k?: string; h?: string; g?: unknown; e?: string; ms?: number; loadMs?: number }) => {
          if (m.t === 'ready') {
            w.loadMs = m.loadMs!;
            this.ws.push(w);
            resolve();
          } else if (m.t === 'mem') w.stats = m as unknown as Record<string, unknown>;
          else if (m.t === 'res' || m.t === 'err') {
            const done = w.busy.get(m.k!);

            w.busy.delete(m.k!);
            this.completed++;
            this.computeMs += m.ms ?? 0;
            if (m.t === 'err') this.fail(new Error(`evaluation ${m.k} failed: ${m.e}`));
            else done?.(m.h ?? '', m.ms!, m.g);
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

  private fail(e: Error) {
    if (!this.failure) this.failure = e;
    this.wake();
  }

  private wake() {
    const ws = this.waiters;

    this.waiters = [];
    for (const f of ws) f();
  }

  private pump() {
    if (this.failure) return this.wake();
    for (const w of this.ws)
      while (w.busy.size < (this.o.inflight ?? 2) && this.queue.length) {
        const t = this.queue.shift()!;

        w.busy.set(t.k, t.resolve);
        w.child.send({
          t: t.t ?? 'eval',
          k: t.k,
          quad: t.quad,
          controls: t.controls,
          options: t.options,
          noCache: t.noCache
        });
      }
  }

  async run(tasks: Task[], onResult: (t: Task, h: string, ms: number, g?: unknown) => void) {
    let left = tasks.length;

    for (const t of tasks)
      this.queue.push({
        ...t,
        resolve: (h, ms, g) => {
          onResult(t, h, ms, g);
          left--;
          this.wake();
        }
      });
    this.pump();
    while (left > 0) {
      if (this.failure) throw this.failure;
      await new Promise<void>((r) => this.waiters.push(r));
    }
    if (this.failure) throw this.failure;
  }

  async stats() {
    for (const w of this.ws) w.child.send({ t: 'mem' });
    await new Promise((r) => setTimeout(r, 200));
    return this.ws.map((w) => ({ pid: w.child.pid, loadMs: w.loadMs, ...(w.stats ?? {}) }));
  }

  async close() {
    this.closing = true;
    for (const w of this.ws) if (w.child.connected) w.child.send({ t: 'exit' });
    await new Promise((r) => setTimeout(r, 300));
    for (const w of this.ws) if (w.child.exitCode === null) w.child.kill('SIGTERM');
  }
}
