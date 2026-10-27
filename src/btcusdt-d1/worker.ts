// A worker thread of the evaluation pool (./pool.ts): it views the main thread's canonical series through its
// SharedArrayBuffer and evaluates candidates on request. Pure: no clock, no randomness, results in request order.
import { parentPort } from 'node:worker_threads';
import { type EvalRequest, Evaluator } from './evaluate.ts';
import { seriesOfBuffer } from './snapshot.ts';

export type WorkerMessage =
  | { type: 'init'; buffer: SharedArrayBuffer; rows: number }
  | { type: 'evaluate'; taskId: number; items: EvalRequest[] };

let evaluator: Evaluator | undefined;

parentPort!.on('message', (message: WorkerMessage) => {
  if (message.type === 'init') {
    evaluator = new Evaluator(seriesOfBuffer(message.buffer, message.rows));
    parentPort!.postMessage({ type: 'ready' });
    return;
  }

  try {
    const results = message.items.map((item) => evaluator!.evaluate(item));

    parentPort!.postMessage({ type: 'result', taskId: message.taskId, results });
  } catch (error) {
    parentPort!.postMessage({ type: 'error', taskId: message.taskId, error: (error as Error).stack ?? String(error) });
  }
});
