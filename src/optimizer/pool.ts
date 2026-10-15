// Evaluators: a bounded pool of long-lived worker threads, and an in-process evaluator with the same
// interface for tests and small runs. Both return results in request order, whatever order the work
// finishes in, which keeps experiments deterministic.
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import type { AllInParams } from '../app/allIn-optimizable.ts';
import {
  type DatasetArrays,
  type EvalWindow,
  type Metrics,
  ReferenceHighCache,
  evaluateCandidate
} from './evaluate.ts';
import type { WorkerRequest, WorkerResponse } from './worker.ts';

export interface Evaluator {
  readonly description: string;
  register(dataset: DatasetArrays): void;
  release(id: string): void;
  evaluate(datasetId: string, window: EvalWindow, params: AllInParams[]): Promise<Metrics[]>;
  close(): Promise<void>;
}

// All cores but two (one for the coordinator, one for the OS), at least one.
export const defaultWorkerCount = () => Math.max(1, os.availableParallelism() - 2);

export class LocalEvaluator implements Evaluator {
  readonly description = 'in-process (no worker threads)';
  private readonly datasets = new Map<string, { dataset: DatasetArrays; highs: ReferenceHighCache }>();

  register(dataset: DatasetArrays) {
    this.datasets.set(dataset.id, { dataset, highs: new ReferenceHighCache(dataset.high) });
  }

  release(id: string) {
    this.datasets.delete(id);
  }

  async evaluate(datasetId: string, window: EvalWindow, params: AllInParams[]) {
    const entry = this.datasets.get(datasetId);

    if (!entry) {
      throw new Error(`Dataset ${datasetId} is not registered`);
    }

    return params.map((candidate) => evaluateCandidate(entry.dataset, entry.highs, candidate, window));
  }

  async close() {}
}

interface Task {
  id: number;
  datasetId: string;
  window: EvalWindow;
  params: AllInParams[];
  resolve: (results: Metrics[]) => void;
  reject: (error: Error) => void;
}

interface Slot {
  worker: Worker;
  datasets: Set<string>;
  task?: Task;
  timer?: NodeJS.Timeout;
}

export interface PoolOptions {
  size?: number;
  chunkSize?: number; // candidates per message
  taskTimeoutMs?: number;
}

export class WorkerPool implements Evaluator {
  readonly description: string;
  private readonly slots: Slot[] = [];
  private readonly queue: Task[] = [];
  private readonly datasets = new Map<string, DatasetArrays>();
  private readonly chunkSize: number;
  private readonly taskTimeoutMs: number;
  private nextTaskId = 0;
  private failure?: Error;
  private closed = false;

  constructor(options: PoolOptions = {}) {
    const size = options.size ?? defaultWorkerCount();

    if (!Number.isInteger(size) || size < 1) {
      throw new Error(`Worker count must be a positive integer, got ${size}`);
    }

    this.chunkSize = options.chunkSize ?? 48;
    this.taskTimeoutMs = options.taskTimeoutMs ?? 300000;
    this.description = `${size} worker threads`;

    for (let index = 0; index < size; index++) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url));
      const slot: Slot = { worker, datasets: new Set() };

      worker.on('message', (response: WorkerResponse) => this.onMessage(slot, response));
      worker.on('error', (error) => this.fail(new Error(`Worker ${index} failed: ${error.message}`)));
      worker.on('exit', (code) => {
        if (!this.closed && code !== 0) {
          this.fail(new Error(`Worker ${index} exited with code ${code}`));
        }
      });
      this.slots.push(slot);
    }
  }

  register(dataset: DatasetArrays) {
    this.datasets.set(dataset.id, dataset);
  }

  release(id: string) {
    this.datasets.delete(id);

    for (const slot of this.slots) {
      if (slot.datasets.delete(id)) {
        slot.worker.postMessage({ type: 'release', id } satisfies WorkerRequest);
      }
    }
  }

  async evaluate(datasetId: string, window: EvalWindow, params: AllInParams[]): Promise<Metrics[]> {
    if (this.failure) {
      throw this.failure;
    }

    if (!this.datasets.has(datasetId)) {
      throw new Error(`Dataset ${datasetId} is not registered`);
    }

    const chunks: Promise<Metrics[]>[] = [];

    for (let start = 0; start < params.length; start += this.chunkSize) {
      chunks.push(
        new Promise<Metrics[]>((resolve, reject) => {
          this.queue.push({
            id: this.nextTaskId++,
            datasetId,
            window,
            params: params.slice(start, start + this.chunkSize),
            resolve,
            reject
          });
        })
      );
    }

    this.dispatch();

    return (await Promise.all(chunks)).flat();
  }

  private dispatch() {
    for (const slot of this.slots) {
      if (slot.task || this.queue.length === 0 || this.failure) {
        continue;
      }

      const task = this.queue.shift()!;
      const dataset = this.datasets.get(task.datasetId);

      if (!dataset) {
        task.reject(new Error(`Dataset ${task.datasetId} was released before its task ran`));
        continue;
      }

      if (!slot.datasets.has(task.datasetId)) {
        slot.worker.postMessage({ type: 'dataset', dataset } satisfies WorkerRequest);
        slot.datasets.add(task.datasetId);
      }

      slot.task = task;
      slot.timer = setTimeout(
        () => this.fail(new Error(`Task ${task.id} timed out after ${this.taskTimeoutMs} ms`)),
        this.taskTimeoutMs
      );
      slot.worker.postMessage({
        type: 'evaluate',
        taskId: task.id,
        datasetId: task.datasetId,
        window: task.window,
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
      this.fail(new Error(`Evaluation failed in a worker: ${response.message}`));

      return;
    }

    task.resolve(response.results);
    this.dispatch();
  }

  // Fail fast: reject everything in flight and queued, and stop the workers.
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

    void this.close();
  }

  async close() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    await Promise.all(this.slots.map((slot) => slot.worker.terminate()));
  }
}
