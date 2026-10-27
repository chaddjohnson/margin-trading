// A worker thread of the audit's pool (./pool.ts): it holds the loaded canonical universe once (the datasets' typed
// arrays are SharedArrayBuffers, so every worker reads the main thread's memory) and executes run specifications on
// request. Pure: no file, no clock, no randomness.
import { parentPort } from 'node:worker_threads';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { executeSpec } from './run.ts';
import type { RunSpec } from './specs.ts';

export interface WorkerInit {
  type: 'init';
  universe: NUniverse;
}

export interface WorkerTask {
  type: 'run';
  taskId: number;
  spec: RunSpec;
}

export type WorkerReply =
  | { type: 'ready' }
  | { type: 'result'; taskId: number; output: ReturnType<typeof executeSpec> }
  | { type: 'error'; taskId: number; message: string };

let universe: NUniverse | undefined;

parentPort?.on('message', (message: WorkerInit | WorkerTask) => {
  if (message.type === 'init') {
    universe = message.universe;
    parentPort!.postMessage({ type: 'ready' } satisfies WorkerReply);
    return;
  }

  try {
    if (!universe) {
      throw new Error('the worker has no universe');
    }

    const output = executeSpec(universe, message.spec);

    parentPort!.postMessage({ type: 'result', taskId: message.taskId, output } satisfies WorkerReply);
  } catch (error) {
    parentPort!.postMessage({
      type: 'error',
      taskId: message.taskId,
      message: (error as Error)?.stack ?? String(error)
    } satisfies WorkerReply);
  }
});
