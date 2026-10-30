// A worker thread of the study's pool (./pool.ts). It receives the loaded window once (the datasets' typed arrays are
// SharedArrayBuffers, so every worker reads the main thread's memory; it never opens a door), builds the same window
// context as the main thread, and evaluates pure functions on request. No randomness, no clock; results in order.
import { parentPort } from 'node:worker_threads';
import type { Dataset } from '../four-family/data.ts';
import {
  type Context,
  type ExperimentClass,
  type WindowSpec,
  evaluateGenome,
  makeContext,
  standaloneOf
} from './evaluate.ts';
import type { Genome } from './space.ts';
import type { ExecSettings } from './trace.ts';
import type { Grid } from './context.ts';

export interface WorkerInit {
  type: 'init';
  spec: WindowSpec;
  datasets: Record<string, Dataset>;
  settings: ExecSettings;
}

export type WorkerTask =
  | { type: 'standalone'; taskId: number; items: { symbol: string; grid: Grid }[] }
  | { type: 'genomes'; taskId: number; cls: ExperimentClass; items: Genome[] };

export type WorkerReply =
  | { type: 'ready' }
  | { type: 'result'; taskId: number; results: unknown[]; cache: { hits: number; misses: number; size: number } }
  | { type: 'error'; taskId: number; message: string };

export const handleTask = (ctx: Context, task: WorkerTask): unknown[] => {
  if (task.type === 'standalone') {
    return task.items.map((item) => standaloneOf(ctx, item.symbol, item.grid));
  }

  return task.items.map((genome) => evaluateGenome(ctx, genome, task.cls));
};

let context: Context | undefined;

parentPort?.on('message', (message: WorkerInit | WorkerTask) => {
  if (message.type === 'init') {
    context = makeContext(message.spec, message.datasets, message.settings);
    parentPort!.postMessage({ type: 'ready' } satisfies WorkerReply);
    return;
  }

  try {
    const results = handleTask(context!, message);

    parentPort!.postMessage({
      type: 'result',
      taskId: message.taskId,
      results,
      cache: { hits: context!.cache.hits, misses: context!.cache.misses, size: context!.cache.size }
    } satisfies WorkerReply);
  } catch (error) {
    parentPort!.postMessage({
      type: 'error',
      taskId: message.taskId,
      message: (error as Error).stack ?? String(error)
    } satisfies WorkerReply);
  }
});
