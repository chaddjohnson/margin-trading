// The job harness (PROTOCOL.md §11): one door, one pool of child-process workers, an SQLite archive bound to the job,
// door and evaluation-code digest (src/growth140-vgt-s8m/store.ts, unchanged), the 10-second memory monitor
// (src/growth140-vgt-s8m/pool.ts Monitor, unchanged) with its stop threshold, and an atomic, hash-validated checkpoint
// at least every 30 s. A stop (memory pressure, SIGTERM/SIGINT, or a restart test) ends dispatching, lets in-flight work
// finish, commits, writes the checkpoint and exits 75; nothing restarts it. Rerunning the same command resumes: archived
// records are read back, never recomputed.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Monitor as PriorMonitor, cgroupInfo } from '../growth140-vgt-s8m/pool.ts';
import { sha256, writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import { Store, decode, encode } from '../growth140-vgt-s8m/store.ts';
import { type DoorName, STUDY, cacheRoot, log, repoRoot, resources, resultsDir } from './context.ts';
import type { EvalRecord } from './evaluate.ts';
import { Pool, StopRequested, type Task } from './pool.ts';
import { type Spec, specId } from './specs.ts';

export const EXIT_STOPPED = 75;

// The files whose behaviour an archived record depends on (the study's evaluation path and the shared engine).
export const evaluationFiles = [
  'src/vg-balanced-entry-eligibility/engine.ts',
  'src/vg-balanced-entry-eligibility/evaluate.ts',
  'src/vg-balanced-entry-eligibility/specs.ts',
  'src/vg-balanced-entry-eligibility/control.ts',
  'src/vg-balanced-entry-eligibility/data.ts',
  'src/vg-balanced-entry-eligibility/context.ts',
  'src/vg-balanced-entry-eligibility/worker.ts',
  'src/portfolio-aware-d1/nbook/engine.ts',
  'src/multi-etf-allocator/shadow.ts',
  'src/multi-etf-allocator/ledger.ts',
  'src/shared-margin-portfolio/strategy.ts',
  'src/pools/run.ts'
];

export const codeDigest = () =>
  createHash('sha256')
    .update(
      evaluationFiles
        .map(
          (file) =>
            `${file}:${createHash('sha256')
              .update(fs.readFileSync(path.join(repoRoot, file)))
              .digest('hex')}`
        )
        .join('\n')
    )
    .digest('hex');

export const jobDir = (name: string) => path.join(cacheRoot, 'jobs', name);

export const parseBytes = (text: string) => {
  const m = /^(\d+(?:\.\d+)?)([KMGT]?)$/i.exec(text.trim());

  if (!m) throw new Error(`not a size: ${text}`);
  return Math.round(Number(m[1]) * 1024 ** ' KMGT'.indexOf((m[2] || ' ').toUpperCase()));
};

const Monitor = PriorMonitor as unknown as new (o: {
  file: string;
  pool: Pool;
  store?: () => Store | null;
  stage: () => string;
  extra?: () => Record<string, unknown>;
  pressureBytes: number;
}) => { sample(event?: string): Promise<unknown>; start(): void; stop(): void; peakCurrent: number; peakRss: number };

export interface JobOptions {
  name: string;
  door: DoorName;
  purpose: string;
  workers: number;
  guard?: { file: string; sha256: string };
  stopAfterFresh?: number; // restart tests: request a stop after this many fresh evaluations
}

interface CheckpointBody {
  total: number;
  done: number;
  fresh: number;
  lastKey: string;
  startedAt: string;
}

export const runJob = async (o: JobOptions, specs: readonly Spec[]): Promise<EvalRecord[]> => {
  const dir = jobDir(o.name);
  const digest = codeDigest();
  const doorPins = fs.readFileSync(path.join(resultsDir, 'doors-pins.json'));
  const store = new Store(path.join(dir, 'archive.sqlite'), {
    binding: { study: STUDY, job: o.name, door: o.door, codeDigest: digest, doorPins: sha256(doorPins) },
    lruCapacity: resources.lruCapacity,
    commitRows: resources.storeCommitRows,
    commitMs: resources.storeCommitMs
  });
  const keys = specs.map(specId);
  const unique = [...new Set(keys)];
  const missing = unique.filter((key) => !store.read('points', key));
  const pool = new Pool({
    door: o.door,
    purpose: o.purpose,
    workers: Math.min(o.workers, Math.max(1, missing.length)),
    ...(o.guard ? { guardFile: o.guard.file, guardSha256: o.guard.sha256 } : {})
  });
  const pressureBytes = Math.min(parseBytes(resources.pressure), parseBytes(resources.memoryHigh) - 4 * 2 ** 30);
  let stage = 'opening';
  let fresh = 0;
  let lastKey = '';
  const startedAt = new Date().toISOString();
  const monitor = new Monitor({
    file: path.join(resultsDir, 'memory', `${o.name}.jsonl`),
    pool,
    store: () => store,
    stage: () => stage,
    extra: () => ({ job: o.name, door: o.door, fresh, missing: missing.length }),
    pressureBytes
  });
  const checkpointFile = path.join(dir, 'checkpoint.json');
  const writeCheckpoint = () => {
    const body: CheckpointBody = {
      total: unique.length,
      done: unique.length - missing.length + fresh,
      fresh,
      lastKey,
      startedAt
    };
    const text = encode(body);

    writeAtomic(
      checkpointFile,
      JSON.stringify({
        kind: `${STUDY} checkpoint`,
        job: o.name,
        door: o.door,
        codeDigest: digest,
        written: new Date().toISOString(),
        body: '__BODY__',
        bodySha256: sha256(text)
      }).replace('"__BODY__"', text)
    );
  };
  const onSignal = (signal: string) => pool.requestStop(`signal ${signal}`);

  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGINT', () => onSignal('SIGINT'));

  const cg = cgroupInfo();

  log(
    `job ${o.name}: door ${o.door}, ${unique.length} specs (${missing.length} to evaluate), ${pool['options'].workers} worker(s), cgroup ${cg.path} (memory.high ${cg.high}, memory.max ${cg.max}, swap.max ${cg.swapMax}), pressure ${pressureBytes}`
  );
  await monitor.sample('job-start');

  if (missing.length > 0) {
    stage = 'starting workers';
    await pool.start();
    await monitor.sample('workers-ready');
  }

  monitor.start();
  stage = 'evaluating';

  const timer = setInterval(writeCheckpoint, resources.checkpointEveryMs);

  timer.unref();

  try {
    await pool.run<EvalRecord>(
      missing.map((key): Task => ({ k: key, spec: decode<Spec>(key) })),
      (task, record) => {
        store.write('points', task.k, record);
        fresh++;
        lastKey = task.k;

        if (o.stopAfterFresh !== undefined && fresh >= o.stopAfterFresh)
          pool.requestStop(`stop-after ${o.stopAfterFresh} fresh evaluations (restart test)`);
      }
    );
  } catch (error) {
    clearInterval(timer);
    store.commit();
    writeCheckpoint();

    if (error instanceof StopRequested) {
      await monitor.sample(`stopped: ${error.reason}`);
      monitor.stop();
      await pool.close();
      store.close();
      log(
        `stopped (${error.reason}) after ${fresh} fresh evaluations; checkpoint written; resume with the same command`
      );
      process.exit(EXIT_STOPPED);
    }

    await monitor.sample(`failed: ${(error as Error).message.split('\n')[0]}`);
    monitor.stop();
    await pool.close();
    store.close();
    throw error;
  }

  clearInterval(timer);
  store.commit();
  writeCheckpoint();
  stage = 'done';
  await monitor.sample('job-end');
  monitor.stop();
  await pool.close();

  const records = keys.map((key) => {
    const record = store.read<EvalRecord>('points', key);

    if (!record) throw new Error(`${o.name}: ${key} missing after the run`);

    return record;
  });

  store.close();
  log(
    `job ${o.name}: done (${fresh} fresh, ${unique.length - missing.length} from the archive); peak cgroup ${monitor.peakCurrent}, peak RSS ${monitor.peakRss}`
  );

  return records;
};

// Full details of a few specs (never archived; written by the caller).
export const runDetails = async <T>(o: Omit<JobOptions, 'stopAfterFresh'>, specs: readonly Spec[]): Promise<T[]> => {
  const pool = new Pool({
    door: o.door,
    purpose: `${o.purpose} (detail)`,
    workers: Math.min(o.workers, specs.length),
    ...(o.guard ? { guardFile: o.guard.file, guardSha256: o.guard.sha256 } : {})
  });
  const out = new Array<T>(specs.length);

  await pool.start();

  try {
    await pool.run<T>(
      specs.map((spec, i) => ({ k: `${i}|${specId(spec)}`, spec, detail: true })),
      (task, value) => {
        out[Number(task.k.split('|')[0])] = value;
      }
    );
  } finally {
    await pool.close();
  }

  return out;
};

export const removeJob = (name: string) => fs.rmSync(jobDir(name), { recursive: true, force: true });
