// Evaluators: a bounded pool of long-lived worker threads, and an in-process evaluator with the same
// interface. Both return results in request order whatever order the work finishes in. Follows
// src/four-family/pool.ts; families registered after start-up (combinations) are forwarded to every worker.
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { type Dataset, ReferenceHighCache } from '../four-family/data.ts';
import { type EvalSpec, type Metrics, evaluateCandidate } from './evaluate.ts';
import { type Family, type IntParams, families } from './families.ts';
import type { WorkerRequest, WorkerResponse } from './worker.ts';

export interface Evaluator {
  readonly description: string;
  readonly workers: number;
  register(dataset: Dataset): void;
  registerFamily(family: Family): void;
  evaluate(datasetId: string, familyKey: string, spec: EvalSpec, params: IntParams[]): Promise<Metrics[]>;
  close(): Promise<void>;
}

export const defaultWorkerCount = () => Math.max(1, os.availableParallelism() - 2);

export class LocalEvaluator implements Evaluator {
  readonly description = 'in-process (no worker threads)';
  readonly workers = 0;
  private readonly datasets = new Map<string, { dataset: Dataset; highs: ReferenceHighCache }>();

  register(dataset: Dataset) {
    this.datasets.set(dataset.id, { dataset, highs: new ReferenceHighCache(dataset) });
  }

  registerFamily(family: Family) {
    families[family.key] = family;
  }

  async evaluate(datasetId: string, familyKey: string, spec: EvalSpec, params: IntParams[]) {
    const entry = this.datasets.get(datasetId);

    if (!entry) {
      throw new Error(`Dataset ${datasetId} is not registered`);
    }

    return params.map((candidate) => evaluateCandidate(entry.dataset, entry.highs, familyKey, candidate, spec).metrics);
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
    this.taskTimeoutMs = options.taskTimeoutMs ?? 600000;
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

  register(dataset: Dataset) {
    this.datasets.set(dataset.id, dataset);
  }

  registerFamily(family: Family) {
    families[family.key] = family;

    for (const slot of this.slots) {
      slot.worker.postMessage({ type: 'family', family } satisfies WorkerRequest);
    }
  }

  async evaluate(datasetId: string, familyKey: string, spec: EvalSpec, params: IntParams[]): Promise<Metrics[]> {
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
            familyKey,
            spec,
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
      const dataset = this.datasets.get(task.datasetId)!;

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
      this.fail(new Error(`Evaluation failed in a worker: ${response.message}`));

      return;
    }

    task.resolve(response.results);
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
