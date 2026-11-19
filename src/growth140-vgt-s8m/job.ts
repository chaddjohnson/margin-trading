// The job harness: one archive, one pool, the monitor, the checkpointer and the stop path (PROTOCOL.md §3).
// A stop (memory pressure, SIGTERM/SIGINT from `systemctl --user stop`, or a restart test) ends dispatching, lets
// in-flight work finish, commits the archive, writes the checkpoint and exits 75; nothing restarts it automatically.
import fs from 'node:fs';
import path from 'node:path';
import { Checkpointer } from './checkpoint.ts';
import { STUDY, cacheRoot, log, resources, resultsDir } from './context.ts';
import { Lab, Monitor, Pool, StopRequested, cgroupInfo } from './pool.ts';
import { Store } from './store.ts';

export const EXIT_STOPPED = 75;

export interface JobOptions {
  name: string;
  door: string; // development | full | fixture:<sessions>
  workers: number;
  pins: Record<string, string>;
  lruCapacity?: number;
  pressureBytes?: number;
  frozenSha256?: string;
  memoryLog?: string;
  storeDir?: string;
  namespace?: string; // the archive binding (default: the job name)
}

export const jobDir = (name: string) => path.join(cacheRoot, 'jobs', name);

export const parseBytes = (text: string) => {
  const m = /^(\d+(?:\.\d+)?)([KMGT]?)$/i.exec(text.trim());

  if (!m) throw new Error(`not a size: ${text}`);
  return Math.round(Number(m[1]) * 1024 ** ' KMGT'.indexOf((m[2] || ' ').toUpperCase()));
};

export const openJob = async <T>(o: JobOptions) => {
  const dir = o.storeDir ?? jobDir(o.name);
  let stage = 'opening';
  const store = new Store(path.join(dir, 'archive.sqlite'), {
    binding: { study: STUDY, namespace: o.namespace ?? o.pins.namespace ?? o.name, door: o.door, ...o.pins },
    lruCapacity: o.lruCapacity ?? resources.lruCapacity,
    commitRows: resources.storeCommitRows,
    commitMs: resources.storeCommitMs
  });
  const pool = new Pool({ door: o.door, workers: o.workers, frozenSha256: o.frozenSha256 });
  const lab = new Lab(o.door, pool, store);
  const pressureBytes =
    o.pressureBytes ?? Math.min(parseBytes(resources.pressure), parseBytes(resources.memoryHigh) - 4 * 2 ** 30);
  const monitor = new Monitor({
    file: o.memoryLog ?? path.join(resultsDir, 'memory', `${o.name}.jsonl`),
    pool,
    lab: () => lab,
    store: () => store,
    stage: () => stage,
    pressureBytes
  });
  const checkpoint = new Checkpointer<T>(path.join(dir, 'checkpoint.json'), o.name, o.pins);
  const onSignal = (signal: string) => pool.requestStop(`signal ${signal}`);

  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGINT', () => onSignal('SIGINT'));

  const cg = cgroupInfo();

  log(
    `job ${o.name}: door ${o.door}, ${o.workers} worker(s), cgroup ${cg.path} (memory.high ${cg.high}, memory.max ${cg.max}, swap.max ${cg.swapMax}), pressure threshold ${pressureBytes}`
  );
  await monitor.sample('job-start (store open, no workers)');
  stage = 'starting workers';
  await pool.start();
  await monitor.sample('workers-ready (each holds its own copy of the door)');
  monitor.start();

  return {
    store,
    pool,
    lab,
    monitor,
    checkpoint,
    pressureBytes,
    setStage: (s: string) => {
      stage = s;
    },
    // Runs the job body; on a stop request writes the state through `onStop` and exits 75.
    async run<R>(body: () => Promise<R>, onStop: () => void): Promise<R> {
      try {
        const result = await body();

        return result;
      } catch (error) {
        if (error instanceof StopRequested) {
          store.commit();
          onStop();
          await monitor.sample(`stopped: ${error.reason}`);
          log(`stopped (${error.reason}); checkpoint written; resume with the same command and --resume`);
          monitor.stop();
          await pool.close();
          store.close();
          process.exit(EXIT_STOPPED);
        }

        throw error;
      }
    },
    async close(event = 'job-end') {
      store.commit();
      await monitor.sample(event);
      monitor.stop();
      await pool.close();
      store.close();
    }
  };
};

export type Job<T> = Awaited<ReturnType<typeof openJob<T>>>;

export const removeJob = (name: string) => fs.rmSync(jobDir(name), { recursive: true, force: true });
