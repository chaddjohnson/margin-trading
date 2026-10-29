// A pool worker (pool.ts): one Stage 1c Engine over the shared dataset; answers each batch with the run summaries in
// order.
import { parentPort, workerData } from 'node:worker_threads';
import type { Dataset } from '../four-family/data.ts';
import { study } from './context.ts';
import { Engine } from './engine.ts';
import { summarise } from './metrics.ts';
import type { Task } from './pool.ts';

const { ds, door } = workerData as { ds: Dataset; door: string };

if (!(ds.lastDate <= door && door <= study.dataCap)) {
  throw new Error(`worker door: dataset to ${ds.lastDate}, door ${door}, cap ${study.dataCap}`);
}

const engine = new Engine(ds);

parentPort!.on('message', (message: { from: number; tasks: Task[] }) => {
  const summaries = message.tasks.map((task) => summarise(engine.run(task.schedule, task.options)));

  parentPort!.postMessage({ from: message.from, summaries });
});
