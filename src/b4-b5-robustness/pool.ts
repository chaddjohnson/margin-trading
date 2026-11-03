// The audit's parallel runner: long-lived worker threads (./worker.ts) holding the universe once, or the same work
// in-process. Results come back per specification whatever order the work finishes in, so every record is identical
// whatever the scheduling (src/d1-ranked-preemption/pool.ts's design).
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { type RunOutput, executeSpec } from './run.ts';
import type { RunSpec } from './specs.ts';
import type { WorkerReply } from './worker.ts';

export const defaultWorkerCount = () => Math.max(1, Math.min(8, os.availableParallelism() - 2));

export interface Runner {
  readonly description: string;
  run(spec: RunSpec): Promise<RunOutput>;
  close(): Promise<void>;
}

export class LocalRunner implements Runner {
  readonly description = 'in-process (no worker threads)';

  constructor(private readonly universe: NUniverse) {}

  async run(spec: RunSpec) {
    return executeSpec(this.universe, spec);
  }

  async close() {}
}

interface Pending {
  id: number;
  spec: RunSpec;
  resolve: (output: RunOutput) => void;
  reject: (error: Error) => void;
}

interface Slot {
  worker: Worker;
  ready: boolean;
  busy?: Pending;
}

export class WorkerRunner implements Runner {
  readonly description: string;
  private readonly slots: Slot[] = [];
  private readonly queue: Pending[] = [];
  private nextId = 1;
  private failure?: Error;
  private closed = false;

  constructor(universe: NUniverse, size: number = defaultWorkerCount()) {
    if (!Number.isInteger(size) || size < 1) {
      throw new Error(`Worker count must be a positive integer, got ${size}`);
    }

    this.description = `${size} worker threads`;

    for (let index = 0; index < size; index++) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        execArgv: ['--experimental-transform-types', '--disable-warning=ExperimentalWarning'],
        resourceLimits: { maxOldGenerationSizeMb: 2048 }
      });
      const slot: Slot = { worker, ready: false };

      worker.on('message', (reply: WorkerReply) => this.onMessage(slot, reply));
      worker.on('error', (error) => this.fail(new Error(`Worker ${index} failed: ${error.message}`)));
      worker.on('exit', (code) => {
        if (!this.closed && code !== 0) {
          this.fail(new Error(`Worker ${index} exited with code ${code}`));
        }
      });
      worker.postMessage({ type: 'init', universe });
      this.slots.push(slot);
    }
  }

  run(spec: RunSpec): Promise<RunOutput> {
    if (this.failure) {
      return Promise.reject(this.failure);
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ id: this.nextId++, spec, resolve, reject });
      this.dispatch();
    });
  }

  private dispatch() {
    for (const slot of this.slots) {
      if (slot.ready && !slot.busy && this.queue.length > 0) {
        const pending = this.queue.shift()!;

        slot.busy = pending;
        slot.worker.postMessage({ type: 'run', taskId: pending.id, spec: pending.spec });
      }
    }
  }

  private onMessage(slot: Slot, reply: WorkerReply) {
    if (reply.type === 'ready') {
      slot.ready = true;
      this.dispatch();
      return;
    }

    const pending = slot.busy;

    slot.busy = undefined;

    if (!pending || pending.id !== reply.taskId) {
      this.fail(new Error(`A worker answered task ${reply.taskId}, not ${pending?.id}`));
      return;
    }

    if (reply.type === 'error') {
      pending.reject(new Error(`${pending.spec.key}: ${reply.message}`));
    } else {
      pending.resolve(reply.output);
    }

    this.dispatch();
  }

  private fail(error: Error) {
    if (this.failure) {
      return;
    }

    this.failure = error;

    for (const pending of this.queue.splice(0)) {
      pending.reject(error);
    }

    for (const slot of this.slots) {
      slot.busy?.reject(error);
      slot.busy = undefined;
    }
  }

  async close() {
    this.closed = true;
    await Promise.all(this.slots.map((slot) => slot.worker.terminate()));
  }
}
