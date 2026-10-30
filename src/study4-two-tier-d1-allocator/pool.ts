// The study's parallel runner: long-lived worker threads (./worker.ts) holding the window once, and an in-process runner
// with the same interface for tests. Both return results in request order whatever order the work finishes in, so every
// record is identical whatever the scheduling. Only pure functions run in the workers; all decisions stay on the main
// thread.
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import type { Dataset } from '../four-family/data.ts';
import {
  type Context,
  type ExperimentClass,
  type Evaluation,
  type Standalone,
  type WindowSpec,
  makeContext
} from './evaluate.ts';
import type { Grid } from './context.ts';
import type { Genome } from './space.ts';
import type { ExecSettings } from './trace.ts';
import { type WorkerReply, type WorkerTask, handleTask } from './worker.ts';

export interface Runner {
  readonly size: number;
  readonly description: string;
  standalone(items: { symbol: string; grid: Grid }[]): Promise<Standalone[]>;
  genomes(items: Genome[], cls: ExperimentClass): Promise<Evaluation[]>;
  close(): Promise<void>;
}

export const defaultWorkerCount = () => Math.max(1, Math.min(14, os.availableParallelism() - 2));

const chunk = <T>(items: T[], size: number) => {
  const out: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }

  return out;
};

export class LocalRunner implements Runner {
  readonly size = 1;
  readonly description = 'in-process (no worker threads)';
  readonly ctx: Context;

  constructor(spec: WindowSpec, datasets: Record<string, Dataset>, settings: ExecSettings) {
    this.ctx = makeContext(spec, datasets, settings);
  }

  async standalone(items: { symbol: string; grid: Grid }[]) {
    return handleTask(this.ctx, { type: 'standalone', taskId: 0, items }) as Standalone[];
  }

  async genomes(items: Genome[], cls: ExperimentClass) {
    return handleTask(this.ctx, { type: 'genomes', taskId: 0, cls, items }) as Evaluation[];
  }

  async close() {}
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

interface Job {
  id: number;
  task: WorkerTask;
  resolve: (results: unknown[]) => void;
  reject: (error: Error) => void;
}

interface Slot {
  worker: Worker;
  ready: boolean;
  busy?: Job;
}

export class WorkerRunner implements Runner {
  readonly description: string;
  private readonly slots: Slot[] = [];
  private readonly queue: Job[] = [];
  private nextId = 1;
  private failure?: Error;
  private closed = false;
  private readyCount = 0;
  private readyResolve?: () => void;
  readonly ready: Promise<void>;
  cacheStats = { hits: 0, misses: 0 };

  constructor(
    spec: WindowSpec,
    datasets: Record<string, Dataset>,
    settings: ExecSettings,
    readonly size: number = defaultWorkerCount()
  ) {
    this.description = `${size} worker threads`;
    this.ready = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    for (let index = 0; index < size; index++) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), {
        execArgv: ['--experimental-transform-types', '--disable-warning=ExperimentalWarning'],
        resourceLimits: { maxOldGenerationSizeMb: 3584 }
      });
      const slot: Slot = { worker, ready: false };

      worker.on('message', (reply: WorkerReply) => this.onMessage(slot, reply));
      worker.on('error', (error) => this.fail(new Error(`worker ${index} failed: ${error.message}`)));
      worker.on('exit', (code) => {
        if (!this.closed && code !== 0) {
          this.fail(new Error(`worker ${index} exited with code ${code}`));
        }
      });
      worker.postMessage({ type: 'init', spec, datasets, settings });
      this.slots.push(slot);
    }
  }

  private run(task: DistributiveOmit<WorkerTask, 'taskId'>): Promise<unknown[]> {
    if (this.failure) {
      return Promise.reject(this.failure);
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ id: this.nextId, task: { ...task, taskId: this.nextId++ } as WorkerTask, resolve, reject });
      this.dispatch();
    });
  }

  private dispatch() {
    for (const slot of this.slots) {
      if (slot.ready && !slot.busy && this.queue.length > 0) {
        const job = this.queue.shift()!;

        slot.busy = job;
        slot.worker.postMessage(job.task);
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

    const job = slot.busy;

    slot.busy = undefined;

    if (!job) {
      return;
    }

    if (reply.type === 'error') {
      job.reject(new Error(reply.message));
      this.fail(new Error(reply.message));
    } else {
      job.resolve(reply.results);
    }

    this.dispatch();
  }

  private fail(error: Error) {
    if (this.failure) {
      return;
    }

    this.failure = error;

    for (const job of this.queue.splice(0)) {
      job.reject(error);
    }
  }

  async standalone(items: { symbol: string; grid: Grid }[], batch = 64) {
    const parts = await Promise.all(chunk(items, batch).map((part) => this.run({ type: 'standalone', items: part })));

    return parts.flat() as Standalone[];
  }

  async genomes(items: Genome[], cls: ExperimentClass, batch = 32) {
    const parts = await Promise.all(chunk(items, batch).map((part) => this.run({ type: 'genomes', cls, items: part })));

    return parts.flat() as Evaluation[];
  }

  async close() {
    this.closed = true;
    await Promise.all(this.slots.map((slot) => slot.worker.terminate()));
  }
}
