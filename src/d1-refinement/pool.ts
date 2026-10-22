// Evaluators: a bounded pool of long-lived worker threads, and an in-process evaluator with the same interface.
// Both return results in request order whatever order the work finishes in (src/recovery-eligibility/pool.ts).
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { type Dataset, ReferenceHighCache } from '../four-family/data.ts';
import { ReferenceLowCache } from './engine.ts';
import { type Caches, type EvalSpec, type Metrics, evaluateCandidate } from './evaluate.ts';
import type { IntParams } from './families.ts';
import type { WorkerRequest, WorkerResponse } from './worker.ts';

export interface Evaluator {
  readonly description: string;
  readonly workers: number;
  register(dataset: Dataset): void;
  evaluate(datasetId: string, familyKey: string, spec: EvalSpec, params: IntParams[]): Promise<Metrics[]>;
  close(): Promise<void>;
}

export const defaultWorkerCount = () => Math.max(1, os.availableParallelism() - 1);

export const makeCaches = (dataset: Dataset): Caches => ({
  highs: new ReferenceHighCache(dataset),
  lows: new ReferenceLowCache(dataset)
});

export class LocalEvaluator implements Evaluator {
  readonly description = 'in-process (no worker threads)';
  readonly workers = 0;
  private readonly datasets = new Map<string, { dataset: Dataset; caches: Caches }>();

  register(dataset: Dataset) {
    this.datasets.set(dataset.id, { dataset, caches: makeCaches(dataset) });
  }

  async evaluate(datasetId: string, familyKey: string, spec: EvalSpec, params: IntParams[]) {
    const entry = this.datasets.get(datasetId);

    if (!entry) {
      throw new Error(`Dataset ${datasetId} is not registered`);
    }

    return params.map(
      (candidate) => evaluateCandidate(entry.dataset, entry.caches, familyKey, candidate, spec).metrics
    );
  }

  async close() {}
}

interface Task {
  id: number;
  datasetId: string;
  familyKey: string;
  spec: EvalSpec;
  params: IntParams[];
  resolve: (results: Metrics[]) => void;
  reject: (error: Error) => void;
}

interface Slot {
  worker: Worker;
  datasets: Set<string>;
  task?: Task;
  timer?: NodeJS.Timeout;
}

export class WorkerPool implements Evaluator {
  readonly description: string;
  readonly workers: number;
  private readonly slots: Slot[] = [];
  private readonly queue: Task[] = [];
  private readonly datasets = new Map<string, Dataset>();
  private readonly chunkSize: number;
  private readonly taskTimeoutMs: number;
  private nextTaskId = 0;
  private failure?: Error;
  private closed = false;

  constructor(options: { size?: number; chunkSize?: number; taskTimeoutMs?: number } = {}) {
    const size = options.size ?? defaultWorkerCount();

    if (!Number.isInteger(size) || size < 1) {
      throw new Error(`Worker count must be a positive integer, got ${size}`);
    }

    this.workers = size;
    this.chunkSize = options.chunkSize ?? 16;
    this.taskTimeoutMs = options.taskTimeoutMs ?? 10 * 60 * 1000;
    this.description = `${size} worker threads`;

    for (let index = 0; index < size; index++) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url));
      const slot: Slot = { worker, datasets: new Set() };

      worker.on('message', (response: WorkerResponse) => this.onMessage(slot, response));
      worker.on('error', (error) => this.fail(error));
      worker.on('exit', (code) => {
        if (!this.closed && code !== 0) {
          this.fail(new Error(`Worker exited with code ${code}`));
        }
      });
      this.slots.push(slot);
    }
  }

  register(dataset: Dataset) {
    this.datasets.set(dataset.id, dataset);
  }

  evaluate(datasetId: string, familyKey: string, spec: EvalSpec, params: IntParams[]): Promise<Metrics[]> {
    if (this.failure) {
      return Promise.reject(this.failure);
    }

    if (!this.datasets.has(datasetId)) {
      return Promise.reject(new Error(`Dataset ${datasetId} is not registered`));
    }

    if (params.length === 0) {
      return Promise.resolve([]);
    }

    const chunks: IntParams[][] = [];

    for (let index = 0; index < params.length; index += this.chunkSize) {
      chunks.push(params.slice(index, index + this.chunkSize));
    }

    return Promise.all(
      chunks.map(
        (chunk) =>
          new Promise<Metrics[]>((resolve, reject) => {
            this.queue.push({ id: this.nextTaskId++, datasetId, familyKey, spec, params: chunk, resolve, reject });
            this.dispatch();
          })
      )
    ).then((results) => results.flat());
  }

  async close() {
    this.closed = true;
    await Promise.all(this.slots.map((slot) => slot.worker.terminate()));
  }

  private dispatch() {
    for (const slot of this.slots) {
      if (slot.task || this.queue.length === 0) {
        continue;
      }

      const task = this.queue.shift()!;

      if (!slot.datasets.has(task.datasetId)) {
        slot.worker.postMessage({
          type: 'dataset',
          dataset: this.datasets.get(task.datasetId)!
        } satisfies WorkerRequest);
        slot.datasets.add(task.datasetId);
      }

      slot.task = task;
      slot.timer = setTimeout(() => this.fail(new Error(`Task ${task.id} timed out`)), this.taskTimeoutMs);
      slot.worker.postMessage({
        type: 'evaluate',
        taskId: task.id,
        datasetId: task.datasetId,
        familyKey: task.familyKey,
        spec: task.spec,
        params: task.params
      } satisfies WorkerRequest);
    }
  }

  private onMessage(slot: Slot, response: WorkerResponse) {
    const task = slot.task;

    if (!task || task.id !== response.taskId) {
      this.fail(new Error(`Unexpected response for task ${response.taskId}`));

      return;
    }

    clearTimeout(slot.timer);
    slot.task = undefined;

    if (response.type === 'error') {
      task.reject(new Error(response.message));
    } else {
      task.resolve(response.results);
    }

    this.dispatch();
  }

  private fail(error: Error) {
    if (this.failure) {
      return;
    }

    this.failure = error;

    for (const slot of this.slots) {
      clearTimeout(slot.timer);
      slot.task?.reject(error);
      slot.task = undefined;
    }

    for (const task of this.queue.splice(0)) {
      task.reject(error);
    }
  }
}
