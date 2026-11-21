// gpu-phase5 (a copy of src/gpu-phase4/cpuRefPool.ts with this study's namespace): a bounded pool of CPU reference workers (child processes, one door each). Non-official by construction:
// it produces the INDEPENDENT CPU parity reference (purpose 'parity-reference'), never an optimization score. A worker
// that dies fails the run (no restart, no silent loss).
import { type ChildProcess, fork } from 'node:child_process';
import path from 'node:path';
import { engineExecArgv, maglevDisabled } from '../gpu-backend/runtime.ts';
import type { DoorSpec } from './doorSpec.ts';
import type { Explanation, Keep, RefResult, RefTask } from './cpuRefWorker.ts';

export class CpuRefPool {
  private ws: { child: ChildProcess; busy: boolean }[] = [];
  // gpu-phase5 (PROTOCOL.md §4.4): which worker evaluated each task, and whether workers keep their original objects
  readonly owner = new Map<string, number>();
  keep: Keep | boolean = false;
  private failure: Error | null = null;

  constructor(
    readonly workers: number,
    readonly door: DoorSpec,
    readonly oldSpaceMb = 3072
  ) {}

  async start() {
    for (let i = 0; i < this.workers; i += 4)
      await Promise.all(
        Array.from({ length: Math.min(4, this.workers - i) }, () => {
          const child = fork(path.join(import.meta.dirname, 'cpuRefWorker.ts'), [], {
            execArgv: [
              // the workers run under the parent's engine configuration: without V8's Maglev when the parent was started
              // with --no-maglev (src/gpu-backend/runtime.ts; every acceptance run is), with it otherwise (reproductions)
              ...(maglevDisabled() ? engineExecArgv : []),
              '--expose-gc',
              `--max-old-space-size=${this.oldSpaceMb}`,
              '--experimental-transform-types',
              '--disable-warning=ExperimentalWarning'
            ],
            serialization: 'advanced',
            stdio: ['ignore', 'inherit', 'inherit', 'ipc']
          });
          const w = { child, busy: false };

          child.once('exit', (code, signal) => {
            if (!this.closing)
              this.failure ??= new Error(`CPU reference worker ${child.pid} exited (${code ?? signal})`);
          });
          this.ws.push(w);
          return new Promise<void>((resolve) => {
            child.once('message', () => resolve());
            child.send({ t: 'door', door: this.door });
          });
        })
      );
  }

  private closing = false;

  // tasks in chunks of `chunk` per message; results in task order
  async run(tasks: RefTask[], chunk = 4, onProgress?: (done: number) => void): Promise<RefResult[]> {
    const out = new Map<string, RefResult>();
    let next = 0;
    let done = 0;

    await new Promise<void>((resolve, reject) => {
      const pump = () => {
        if (this.failure) return reject(this.failure);
        if (done === tasks.length) return resolve();
        for (const w of this.ws) {
          if (w.busy || next >= tasks.length) continue;
          const slice = tasks.slice(next, next + chunk);

          next += slice.length;
          w.busy = true;
          const wi = this.ws.indexOf(w);

          w.child.once('message', (m: { out: RefResult[] }) => {
            for (const r of m.out) {
              out.set(r.k, r);
              this.owner.set(r.k, wi);
            }
            done += m.out.length;
            w.busy = false;
            onProgress?.(done);
            pump();
          });
          w.child.send({ t: 'tasks', tasks: slice, keep: this.keep });
        }
      };

      for (const w of this.ws) w.child.once('exit', () => setTimeout(pump, 10));
      pump();
    });
    return tasks.map((t) => out.get(t.k)!);
  }

  get pids() {
    return this.ws.map((w) => w.child.pid ?? -1);
  }

  // the ORIGINAL evidence of one task from the worker that evaluated it (it must have run with keep = true), followed
  // by that worker's labelled re-evaluation; `which` adds the books and pool leaves to the record's
  explain(k: string, which: string[] = ['record']): Promise<Explanation & { worker: number }> {
    const wi = this.owner.get(k);

    if (wi === undefined) return Promise.reject(new Error(`no CPU reference worker evaluated ${k}`));
    const w = this.ws[wi]!;

    return new Promise((resolve, reject) => {
      if (this.failure) return reject(this.failure);
      w.child.once('message', (m: { x: Explanation }) => resolve({ ...m.x, worker: wi }));
      w.child.send({ t: 'explain', k, which });
    });
  }

  async release() {
    await Promise.all(
      this.ws.map(
        (w) =>
          new Promise<void>((resolve) => {
            if (w.child.exitCode !== null || w.child.signalCode !== null) return resolve();
            w.child.once('message', () => resolve());
            w.child.send({ t: 'release' });
          })
      )
    );
    this.owner.clear();
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
          })
      )
    );
  }
}
