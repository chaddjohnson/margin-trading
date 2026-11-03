// The study's parallel evaluator: a fixed set of long-lived worker threads (./worker.ts) holding the universe once
// (SharedArrayBuffer datasets), and an in-process runner with the same interface for tests and single-thread runs.
// Both return results in request order whatever order the work finishes in, so every log is byte-identical
// whatever the scheduling. Only pure functions run in the workers; all decisions stay on the main thread.
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { type WorkerInit, type WorkerReply, type WorkerTask, handleTask } from './worker.ts';

export type TaskBody = WorkerTask extends infer T ? (T extends { taskId: number } ? Omit<T, 'taskId'> : never) : never;

export interface Runner {
  readonly size: number;
  readonly description: string;
  run(task: TaskBody): Promise<unknown[]>;
  close(): Promise<void>;
}

export const defaultWorkerCount = () => Math.max(1, os.availableParallelism() - 2);

export class LocalRunner implements Runner {
  readonly size = 1;
  readonly description = 'in-process (no worker threads)';

  constructor(private readonly context: Omit<WorkerInit, 'type'>) {}

  async run(task: TaskBody) {
    return handleTask(this.context, { ...task, taskId: 0 } as WorkerTask);
  }

  async close() {}
}

interface Pending {
  id: number;
  task: TaskBody;
  resolve: (results: unknown[]) => void;
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
  private readyCount = 0;
  private readyResolve?: () => void;
  readonly ready: Promise<void>;

  constructor(
    context: Omit<WorkerInit, 'type'>,
    readonly size: number = defaultWorkerCount()
  ) {
    if (!Number.isInteger(size) || size < 1) {
      throw new Error(`Worker count must be a positive integer, got ${size}`);
    }

    this.description = `${size} worker threads`;
    this.ready = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

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
      worker.postMessage({ type: 'init', ...context } satisfies WorkerInit);
      this.slots.push(slot);
    }
  }

  run(task: TaskBody): Promise<unknown[]> {
    if (this.failure) {
      return Promise.reject(this.failure);
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ id: this.nextId++, task, resolve, reject });
      this.dispatch();
    });
  }

  private dispatch() {
    for (const slot of this.slots) {
      if (slot.ready && !slot.busy && this.queue.length > 0) {
        const pending = this.queue.shift()!;

        slot.busy = pending;
        slot.worker.postMessage({ ...pending.task, taskId: pending.id } as WorkerTask);
      }
    }
  }

  private onMessage(slot: Slot, reply: WorkerReply) {
    if (reply.type === 'ready') {
      slot.ready = true;
      this.readyCount++;

      if (this.readyCount === this.slots.length) {
        this.readyResolve?.();
      }

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
      pending.reject(new Error(reply.message));
    } else {
      pending.resolve(reply.results);
    }

    this.dispatch();
  }

  private fail(error: Error) {
    if (this.failure) {
      return;
    }

    this.failure = error;

    for (const slot of this.slots) {
      slot.busy?.reject(error);
      slot.busy = undefined;
    }

    for (const pending of this.queue.splice(0)) {
      pending.reject(error);
    }
  }

  async close() {
    this.closed = true;
    await Promise.all(this.slots.map((slot) => slot.worker.terminate()));
  }
}
