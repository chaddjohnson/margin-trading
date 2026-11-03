// A pool worker (pool.ts): one Engine over the shared dataset; answers each batch with the run summaries in order.
import { parentPort, workerData } from 'node:worker_threads';
import type { Dataset } from '../four-family/data.ts';
import { Engine } from './engine.ts';
import { summarise } from './metrics.ts';
import type { Task } from './pool.ts';

const engine = new Engine((workerData as { ds: Dataset }).ds);

parentPort!.on('message', (message: { from: number; tasks: Task[] }) => {
  const summaries = message.tasks.map((task) => summarise(engine.run(task.schedule, task.options)));

  parentPort!.postMessage({ from: message.from, summaries });
});
