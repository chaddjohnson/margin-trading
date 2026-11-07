// A ParallelLab worker: opens its door itself (the development door re-verifies the pinned prefix; the full door
// needs the committed frozen selection's body hash) and evaluates batches of effective configurations.
import { parentPort, workerData } from 'node:worker_threads';
import { loadDevelopmentSessions, loadFullSessions } from './data.ts';
import { type WorkerInit, doorView, pointOf } from './lab.ts';
import type { Effective } from './space.ts';

const init = workerData as WorkerInit;

try {
  const loaded =
    init.door === 'development'
      ? await loadDevelopmentSessions()
      : await loadFullSessions({ frozenBodyHash: init.frozenBodyHash ?? '' });
  const view = doorView(init.door, loaded.sessions, loaded.sha256);

  parentPort!.on('message', ({ jobs }: { jobs: Effective[] }) => {
    try {
      parentPort!.postMessage({ records: jobs.map((job) => pointOf(view, job)) });
    } catch (error) {
      parentPort!.postMessage({ error: String((error as Error).stack ?? error) });
    }
  });
  parentPort!.postMessage({ ready: true });
} catch (error) {
  parentPort!.postMessage({ error: String((error as Error).stack ?? error) });
}
