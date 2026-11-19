// gpu-phase2: a bounded pool of CPU reference workers (child processes, one door each). Non-official by construction:
// it produces the INDEPENDENT CPU parity reference (purpose 'parity-reference'), never an optimization score. A worker
// that dies fails the run (no restart, no silent loss).
import { type ChildProcess, fork } from 'node:child_process';
import path from 'node:path';
import type { DoorSpec } from './doorSpec.ts';
import type { RefResult, RefTask } from './cpuRefWorker.ts';

export class CpuRefPool {
  private ws: { child: ChildProcess; busy: boolean }[] = [];
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
          w.child.once('message', (m: { out: RefResult[] }) => {
            for (const r of m.out) out.set(r.k, r);
            done += m.out.length;
            w.busy = false;
            onProgress?.(done);
            pump();
          });
          w.child.send({ t: 'tasks', tasks: slice });
        }
      };

      for (const w of this.ws) w.child.once('exit', () => setTimeout(pump, 10));
      pump();
    });
    return tasks.map((t) => out.get(t.k)!);
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
