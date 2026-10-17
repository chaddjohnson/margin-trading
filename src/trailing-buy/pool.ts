// Evaluators with one interface: a bounded pool of long-lived worker threads, and an in-process evaluator
// for tests and small runs. Both return results in request order whatever order the work finishes in,
// which keeps every experiment deterministic and independent of the core count.
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { type DatasetMessage, type Job, type JobResult, runJob } from './evaluate.ts';
import { IndicatorCache } from './indicators.ts';
import type { WorkerRequest, WorkerResponse } from './worker.ts';

export interface Evaluator {
  readonly description: string;
  readonly workers: number;
  register(dataset: DatasetMessage): void;
  run(datasetId: string, jobs: Job[]): Promise<JobResult[]>;
  close(): Promise<void>;
}

export const defaultWorkerCount = () => Math.max(1, os.availableParallelism() - 2);

export class LocalEvaluator implements Evaluator {
  readonly description = 'in-process (no worker threads)';
  readonly workers = 0;
  private readonly datasets = new Map<string, { dataset: DatasetMessage; cache: IndicatorCache }>();

  register(dataset: DatasetMessage) {
    this.datasets.set(dataset.id, { dataset, cache: new IndicatorCache(dataset) });
  }

  async run(datasetId: string, jobs: Job[]) {
    const entry = this.datasets.get(datasetId);

    if (!entry) {
      throw new Error(`Dataset ${datasetId} is not registered`);
    }

    return jobs.map((job) => runJob(entry.dataset, entry.cache, job));
  }

  async close() {}
}

interface Task {
  id: number;
  datasetId: string;
  jobs: Job[];
  resolve: (results: JobResult[]) => void;
  reject: (error: Error) => void;
}

interface Slot {
  worker: Worker;
  datasets: Set<string>;
  task?: Task;
}

export class WorkerPool implements Evaluator {
  readonly description: string;
  readonly workers: number;
  private readonly slots: Slot[] = [];
  private readonly queue: Task[] = [];
  private readonly datasets = new Map<string, DatasetMessage>();
  private nextTaskId = 0;
  private failure?: Error;
  private closed = false;

  constructor(
    size = defaultWorkerCount(),
    private readonly chunkSize = 64
  ) {
    if (!Number.isInteger(size) || size < 1) {
      throw new Error(`Worker count must be a positive integer, got ${size}`);
    }

    this.workers = size;
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

  register(dataset: DatasetMessage) {
    this.datasets.set(dataset.id, dataset);
  }

  async run(datasetId: string, jobs: Job[]): Promise<JobResult[]> {
    if (this.failure) {
      throw this.failure;
    }

    if (!this.datasets.has(datasetId)) {
      throw new Error(`Dataset ${datasetId} is not registered`);
    }

    const chunks: Promise<JobResult[]>[] = [];

    for (let start = 0; start < jobs.length; start += this.chunkSize) {
      chunks.push(
        new Promise<JobResult[]>((resolve, reject) => {
          this.queue.push({
            id: this.nextTaskId++,
            datasetId,
            jobs: jobs.slice(start, start + this.chunkSize),
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
      slot.worker.postMessage({
        type: 'run',
        taskId: task.id,
        datasetId: task.datasetId,
        jobs: task.jobs
      } satisfies WorkerRequest);
    }
  }

  private onMessage(slot: Slot, response: WorkerResponse) {
    const task = slot.task;

    if (!task || task.id !== response.taskId) {
      this.fail(new Error(`Unexpected response for task ${response.taskId}`));

      return;
    }

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
