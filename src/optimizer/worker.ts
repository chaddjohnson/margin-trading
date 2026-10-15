// Worker thread: holds each dataset once, evaluates batches of candidates and posts back their metrics in
// request order. It has no randomness and no clock dependence.
import { parentPort } from 'node:worker_threads';
import type { AllInParams } from '../app/allIn-optimizable.ts';
import { type DatasetArrays, type EvalWindow, ReferenceHighCache, evaluateCandidate } from './evaluate.ts';

export type WorkerRequest =
  | { type: 'dataset'; dataset: DatasetArrays }
  | { type: 'release'; id: string }
  | { type: 'evaluate'; taskId: number; datasetId: string; window: EvalWindow; params: AllInParams[] };

export type WorkerResponse =
  | { type: 'result'; taskId: number; results: ReturnType<typeof evaluateCandidate>[] }
  | { type: 'error'; taskId: number; message: string };

const datasets = new Map<string, { dataset: DatasetArrays; highs: ReferenceHighCache }>();

parentPort!.on('message', (request: WorkerRequest) => {
  if (request.type === 'dataset') {
    datasets.set(request.dataset.id, { dataset: request.dataset, highs: new ReferenceHighCache(request.dataset.high) });

    return;
  }

  if (request.type === 'release') {
    datasets.delete(request.id);

    return;
  }

  try {
    const entry = datasets.get(request.datasetId);

    if (!entry) {
      throw new Error(`Dataset ${request.datasetId} was not sent to this worker`);
    }

    const results = request.params.map((params) =>
      evaluateCandidate(entry.dataset, entry.highs, params, request.window)
    );

    parentPort!.postMessage({ type: 'result', taskId: request.taskId, results } satisfies WorkerResponse);
  } catch (error) {
    parentPort!.postMessage({
      type: 'error',
      taskId: request.taskId,
      message: (error as Error)?.stack ?? String(error)
    } satisfies WorkerResponse);
  }
});
