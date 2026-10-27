// The evaluation pool: worker threads sharing the canonical series' memory. Requests are split into fixed batches and
// the results are returned in request order, so a run's outcome does not depend on the worker count or scheduling.
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import type { EvalRequest, Metrics } from './evaluate.ts';
import type { Series } from './snapshot.ts';

export const defaultWorkers = () => Math.max(1, os.availableParallelism() - 1);

export class Pool {
  private readonly workers: Worker[] = [];
  private taskId = 0;

  private constructor(readonly size: number) {}

  static async start(series: Series, size = defaultWorkers()) {
    const pool = new Pool(size);

    await Promise.all(
      Array.from({ length: size }, async () => {
        const worker = new Worker(new URL('./worker.ts', import.meta.url), {
          execArgv: ['--experimental-transform-types', '--disable-warning=ExperimentalWarning'],
          resourceLimits: { maxOldGenerationSizeMb: 1536 }
        });

        await new Promise<void>((resolve, reject) => {
          worker.once('message', () => resolve());
          worker.once('error', reject);
          worker.postMessage({ type: 'init', buffer: series.buffer, rows: series.rows });
        });
        pool.workers.push(worker);
      })
    );

    return pool;
  }

  async evaluate(items: EvalRequest[], batch = 16, onProgress?: (done: number, total: number) => void) {
    const results: Metrics[] = new Array(items.length);
    const batches: { start: number; items: EvalRequest[] }[] = [];

    for (let start = 0; start < items.length; start += batch) {
      batches.push({ start, items: items.slice(start, start + batch) });
    }

    let next = 0;
    let done = 0;

    await Promise.all(
      this.workers.map(async (worker) => {
        while (next < batches.length) {
          const job = batches[next++]!;
          const taskId = ++this.taskId;
          const reply = await new Promise<{ type: string; results?: Metrics[]; error?: string }>((resolve, reject) => {
            function onMessage(message: { type: string; taskId: number; results?: Metrics[]; error?: string }) {
              if (message.taskId === taskId) {
                worker.off('message', onMessage);
                worker.off('error', onError);
                resolve(message);
              }
            }

            function onError(error: Error) {
              worker.off('message', onMessage);
              reject(error);
            }

            worker.on('message', onMessage);
            worker.once('error', onError);
            worker.postMessage({ type: 'evaluate', taskId, items: job.items });
          });

          if (reply.type === 'error') {
            throw new Error(`worker failed: ${reply.error}`);
          }

          reply.results!.forEach((result, offset) => {
            results[job.start + offset] = result;
          });
          done += job.items.length;
          onProgress?.(done, items.length);
        }
      })
    );

    return results;
  }

  async close() {
    await Promise.all(this.workers.map((worker) => worker.terminate()));
  }
}
