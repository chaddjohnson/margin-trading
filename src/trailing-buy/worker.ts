// Worker thread: holds each dataset (and its indicator cache) once and runs batches of jobs in order.
import { parentPort } from 'node:worker_threads';
import { type DatasetMessage, type Job, type JobResult, runJob } from './evaluate.ts';
import { IndicatorCache } from './indicators.ts';

export type WorkerRequest =
  { type: 'dataset'; dataset: DatasetMessage } | { type: 'run'; taskId: number; datasetId: string; jobs: Job[] };

export type WorkerResponse =
  { type: 'result'; taskId: number; results: JobResult[] } | { type: 'error'; taskId: number; message: string };

const datasets = new Map<string, { dataset: DatasetMessage; cache: IndicatorCache }>();

parentPort!.on('message', (request: WorkerRequest) => {
  if (request.type === 'dataset') {
    datasets.set(request.dataset.id, { dataset: request.dataset, cache: new IndicatorCache(request.dataset) });

    return;
  }

  try {
    const entry = datasets.get(request.datasetId);

    if (!entry) {
      throw new Error(`Dataset ${request.datasetId} was not sent to this worker`);
    }

    const results = request.jobs.map((job) => runJob(entry.dataset, entry.cache, job));

    parentPort!.postMessage({ type: 'result', taskId: request.taskId, results } satisfies WorkerResponse);
  } catch (error) {
    parentPort!.postMessage({
      type: 'error',
      taskId: request.taskId,
      message: (error as Error)?.stack ?? String(error)
    } satisfies WorkerResponse);
  }
});
