// A worker thread of the study's pool (./pool.ts): it holds the loaded universe once (the datasets' typed arrays are
// SharedArrayBuffers, so every worker reads the main thread's memory) and executes specifications on request. Pure: no
// file, no clock, no randomness.
import { parentPort } from 'node:worker_threads';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { type Spec, executeSpec } from './run.ts';

export type WorkerMessage = { type: 'init'; universe: NUniverse } | { type: 'run'; taskId: number; spec: Spec };

export type WorkerReply =
  | { type: 'ready' }
  | { type: 'result'; taskId: number; output: ReturnType<typeof executeSpec> }
  | { type: 'error'; taskId: number; message: string };

let universe: NUniverse | undefined;

parentPort?.on('message', (message: WorkerMessage) => {
  if (message.type === 'init') {
    universe = message.universe;
    parentPort!.postMessage({ type: 'ready' } satisfies WorkerReply);
    return;
  }

  try {
    if (!universe) {
      throw new Error('the worker has no universe');
    }

    parentPort!.postMessage({
      type: 'result',
      taskId: message.taskId,
      output: executeSpec(universe, message.spec)
    } satisfies WorkerReply);
  } catch (error) {
    parentPort!.postMessage({
      type: 'error',
      taskId: message.taskId,
      message: (error as Error)?.stack ?? String(error)
    } satisfies WorkerReply);
  }
});
