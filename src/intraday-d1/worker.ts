// A ParallelLab worker: opens its door itself (the development door re-verifies the pinned prefix; the validation
// door needs the sealed selection's body hash) and evaluates batches of (grid, settings) jobs.
import { parentPort, workerData } from 'node:worker_threads';
import { loadDevelopmentSessions, loadValidationSessions } from './data.ts';
import { type Job, type WorkerInit, doorView, pointOf } from './lab.ts';

const init = workerData as WorkerInit;

try {
  const loaded =
    init.door === 'development'
      ? await loadDevelopmentSessions()
      : await loadValidationSessions({ frozenBodyHash: init.frozenBodyHash ?? '' });
  const view = doorView(init.door, loaded.sessions);

  parentPort!.on('message', ({ jobs }: { jobs: Job[] }) => {
    try {
      parentPort!.postMessage({ records: jobs.map((job) => pointOf(view, job.grid, job.settings)) });
    } catch (error) {
      parentPort!.postMessage({ error: String((error as Error).stack ?? error) });
    }
  });
  parentPort!.postMessage({ ready: true });
} catch (error) {
  parentPort!.postMessage({ error: String((error as Error).stack ?? error) });
}
