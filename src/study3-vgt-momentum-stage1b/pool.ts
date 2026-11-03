// Deterministic parallel evaluation: worker threads share the dataset's SharedArrayBuffer arrays, each runs a batch of
// (policy, options) tasks with its own Engine and returns run summaries in task order. Results never depend on the
// schedule of the workers. With `workers` = 0 everything runs in the calling thread.
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import type { Dataset } from '../four-family/data.ts';
import { Engine } from './engine.ts';
import { type Summary, summarise } from './metrics.ts';
import type { Policy, RunOptions, ScheduleItem } from './types.ts';

export interface Task {
  schedule: Policy | ScheduleItem[];
  options: RunOptions;
}

const defaultWorkers = () => Math.max(0, Math.min(14, os.cpus().length - 2));

export class Pool {
  private workers: Worker[] = [];
  private local?: Engine;
  private started = false;
  evaluations = 0;

  constructor(
    readonly ds: Dataset,
    readonly size = defaultWorkers()
  ) {}

  private start() {
    if (this.started) {
      return;
    }

    this.started = true;

    if (this.size === 0) {
      this.local = new Engine(this.ds);
      return;
    }

    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { workerData: { ds: this.ds } });

      worker.unref();
      this.workers.push(worker);
    }
  }

  async run(tasks: Task[]): Promise<Summary[]> {
    this.start();
    this.evaluations += tasks.length;

    if (this.local) {
      return tasks.map((task) => summarise(this.local!.run(task.schedule, task.options)));
    }

    const results: Summary[] = new Array(tasks.length);
    const chunk = Math.max(1, Math.ceil(tasks.length / (this.workers.length * 4)));
    let next = 0;

    await Promise.all(
      this.workers.map(
        (worker) =>
          new Promise<void>((resolve, reject) => {
            const send = () => {
              if (next >= tasks.length) {
                worker.off('message', onMessage);
                worker.off('error', reject);
                resolve();
                return;
              }

              const from = next;

              next = Math.min(tasks.length, next + chunk);
              worker.postMessage({ from, tasks: tasks.slice(from, next) });
            };
            const onMessage = (message: { from: number; summaries: Summary[] }) => {
              message.summaries.forEach((summary, i) => {
                results[message.from + i] = summary;
              });
              send();
            };

            worker.on('message', onMessage);
            worker.on('error', reject);
            send();
          })
      )
    );

    return results;
  }

  async close() {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
    this.workers = [];
    this.started = false;
  }
}
