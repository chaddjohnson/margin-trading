// Worker thread for the minute optimizer: holds each dataset once (shared memory), evaluates batches of
// candidates and posts their metrics back in request order. No randomness, no clock dependence.
import { parentPort } from 'node:worker_threads';
import type { MinuteParams } from '../app/allIn-minute-optimizable.ts';
import type { MinuteDataset } from './data.ts';
import { type EngineSettings, type EvalWindow, ReferenceHighCache } from './engine.ts';
import { type MinuteMetrics, evaluateCandidate } from './evaluate.ts';

export type WorkerRequest =
  | { type: 'dataset'; dataset: MinuteDataset }
  | {
      type: 'evaluate';
      taskId: number;
      datasetId: string;
      window: EvalWindow;
      settings: EngineSettings;
      params: MinuteParams[];
    };

export type WorkerResponse =
  { type: 'result'; taskId: number; results: MinuteMetrics[] } | { type: 'error'; taskId: number; message: string };

const datasets = new Map<string, { dataset: MinuteDataset; highs: ReferenceHighCache }>();

parentPort!.on('message', (request: WorkerRequest) => {
  if (request.type === 'dataset') {
    datasets.set(request.dataset.id, {
      dataset: request.dataset,
      highs: new ReferenceHighCache(request.dataset.sHigh)
    });

    return;
  }

  try {
    const entry = datasets.get(request.datasetId);

    if (!entry) {
      throw new Error(`Dataset ${request.datasetId} was not sent to this worker`);
    }

    const results = request.params.map((params) =>
      evaluateCandidate(entry.dataset, entry.highs, params, request.window, request.settings)
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
