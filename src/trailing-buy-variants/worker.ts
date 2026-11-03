// Worker thread: holds each dataset once (shared memory) with its reference-high cache, evaluates batches of
// candidates and posts their metrics back in request order. No randomness and no clock dependence.
import { parentPort } from 'node:worker_threads';
import { type Dataset, ReferenceHighCache } from '../four-family/data.ts';
import { type EvalSpec, type Metrics, evaluateCandidate } from './evaluate.ts';
import { type Family, type IntParams, registerFamily } from './families.ts';

export type WorkerRequest =
  | { type: 'dataset'; dataset: Dataset }
  | { type: 'family'; family: Family }
  | { type: 'evaluate'; taskId: number; datasetId: string; familyKey: string; spec: EvalSpec; params: IntParams[] };

export type WorkerResponse =
  { type: 'result'; taskId: number; results: Metrics[] } | { type: 'error'; taskId: number; message: string };

const datasets = new Map<string, { dataset: Dataset; highs: ReferenceHighCache }>();

parentPort!.on('message', (request: WorkerRequest) => {
  if (request.type === 'dataset') {
    datasets.set(request.dataset.id, { dataset: request.dataset, highs: new ReferenceHighCache(request.dataset) });

    return;
  }

  if (request.type === 'family') {
    registerFamily(request.family);

    return;
  }

  try {
    const entry = datasets.get(request.datasetId);

    if (!entry) {
      throw new Error(`Dataset ${request.datasetId} was not sent to this worker`);
    }

    const results = request.params.map(
      (params) => evaluateCandidate(entry.dataset, entry.highs, request.familyKey, params, request.spec).metrics
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
