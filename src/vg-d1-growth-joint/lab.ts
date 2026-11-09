// The coordinator's evaluation service (PROTOCOL.md §13): one door, one pool of workers, one SQLite archive bound to
// the job (study, job name, door and its pin, the evaluation-code digest), a bounded LRU in front, the 10-second memory
// monitor with its stop threshold, and an atomic progress checkpoint at least once a minute.
//
// RESUME. Every stage of a job is a deterministic function of its seeds and of the evaluations it asks for, and every
// evaluation is archived the moment it returns. Rerunning the same command therefore replays the job from its start:
// archived evaluations are read back (never recomputed), the interrupted batch is regenerated and only its missing
// evaluations run, so a resumed job reproduces an uninterrupted one exactly. The progress checkpoint (stage, RNG
// states, generation counters) is written for monitoring and is compared with the replay when it passes the same
// point (a mismatch fails the job).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Monitor as PriorMonitor, cgroupInfo } from '../growth140-vgt-s8m/pool.ts';
import { sha256, writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import { Store } from '../growth140-vgt-s8m/store.ts';
import { type DoorName, STUDY, cacheRoot, doorSpecs, log, repoRoot, resources, resultsDir } from './context.ts';
import { type EvalOptions, type Rec, evalKey } from './evaluate.ts';
import type { Quad } from './space.ts';
import { Pool, StopRequested, type Task } from './workers.ts';

export const EXIT_STOPPED = 75;

// The files an archived record depends on (the study's evaluation path and the canonical engines).
export const evaluationFiles = [
  'src/vg-d1-growth-joint/pool.ts',
  'src/vg-d1-growth-joint/books.ts',
  'src/vg-d1-growth-joint/evaluate.ts',
  'src/vg-d1-growth-joint/space.ts',
  'src/vg-d1-growth-joint/data.ts',
  'src/vg-d1-growth-joint/context.ts',
  'src/vg-d1-growth-joint/worker.ts',
  'src/multi-etf-allocator/shadow.ts',
  'src/multi-etf-allocator/phenotypes.ts',
  'src/shared-margin-portfolio/strategy.ts',
  'src/growth-trading/riseTrading.ts',
  'src/growth-trading/optionalRules.ts',
  'src/growth-trading/entryGates.ts',
  'src/growth-trading/drawdownGate.ts',
  'src/growth-trading/continuation.ts',
  'src/entry-signals/riseFromRecentLow.ts',
  'src/entry-signals/bars.ts',
  'src/four-family/data.ts',
  'apps/strategy-lab/runner/growth-params.ts',
  'apps/strategy-lab/shared/params.ts',
  'apps/strategy-lab/shared/strategies.ts',
  'src/growth140-vgt-s8m/space.ts',
  'src/growth140-vgt-stable/space.ts'
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

const Monitor = PriorMonitor as unknown as new (o: {
  file: string;
  pool: Pool;
  lab?: () => { fresh: number; hits: number } | null;
  store?: () => Store | null;
  stage: () => string;
  extra?: () => Record<string, unknown>;
  pressureBytes: number;
}) => { sample(event?: string): Promise<unknown>; start(): void; stop(): void; peakCurrent: number; peakRss: number };

export interface LabOptions {
  job: string;
  door: DoorName;
  purpose: string;
  workers: number;
  guard?: { file: string; sha256: string };
  stopAfterFresh?: number; // pilot: request a stop after this many fresh evaluations
  killWorkerAfter?: number; // pilot: one worker SIGKILLs itself after this many evaluations
}

export class Lab {
  readonly store: Store;
  readonly pool: Pool;
  private readonly monitor: InstanceType<typeof Monitor>;
  readonly digest: string;
  stage = 'opening';
  fresh = 0;
  hits = 0;
  private started = false;
  private progress: Record<string, unknown> = {};
  private timer: NodeJS.Timeout | null = null;
  readonly checkpointFile: string;
  private lastProgressWrite = 0;

  constructor(readonly o: LabOptions) {
    const dir = jobDir(o.job);

    this.digest = codeDigest();
    this.store = new Store(path.join(dir, 'archive.sqlite'), {
      binding: {
        study: STUDY,
        job: o.job,
        door: o.door,
        doorPin:
          o.door === 'FULL'
            ? 'FULL'
            : `GDX:${doorSpecs[o.door].pins.GDX.sha256},VGT:${doorSpecs[o.door].pins.VGT.sha256}`,
        codeDigest: this.digest
      },
      lruCapacity: resources.lruCapacity,
      commitRows: resources.storeCommitRows,
      commitMs: resources.storeCommitMs
    });
    this.pool = new Pool({
      door: o.door,
      purpose: o.purpose,
      workers: o.workers,
      killAfter: o.killWorkerAfter,
      ...(o.guard ? { guardFile: o.guard.file, guardSha256: o.guard.sha256 } : {})
    });
    this.checkpointFile = path.join(dir, 'progress.json');
    this.monitor = new Monitor({
      file: path.join(resultsDir, 'memory', `${o.job}.jsonl`),
      pool: this.pool,
      lab: () => ({ fresh: this.fresh, hits: this.hits }),
      store: () => this.store,
      stage: () => this.stage,
      extra: () => ({ job: o.job, door: o.door, fresh: this.fresh, hits: this.hits }),
      pressureBytes: resources.pressureBytes
    });
  }

  async open() {
    const cg = cgroupInfo();

    log(
      `job ${this.o.job}: door ${this.o.door}, ${this.o.workers} worker(s), cgroup ${cg.path} (memory.high ${cg.high}, memory.max ${cg.max}, swap.max ${cg.swapMax}), stop at ${resources.pressureBytes}`
    );
    process.on('SIGTERM', () => this.pool.requestStop('signal SIGTERM'));
    process.on('SIGINT', () => this.pool.requestStop('signal SIGINT'));
    await this.monitor.sample('job-start');
    this.monitor.start();
    this.timer = setInterval(() => this.writeProgress(), resources.checkpointEveryMs);
    this.timer.unref();
  }

  private async ensureWorkers() {
    if (this.started) return;
    this.started = true;
    this.stage = `${this.stage} (starting workers)`;
    await this.pool.start();
    await this.monitor.sample('workers-ready');
  }

  setProgress(p: Record<string, unknown>) {
    this.progress = { ...this.progress, ...p };
    if (Date.now() - this.lastProgressWrite > resources.checkpointEveryMs) this.writeProgress();
  }

  writeProgress() {
    this.lastProgressWrite = Date.now();
    this.store.commit();

    const body = JSON.stringify({ stage: this.stage, fresh: this.fresh, hits: this.hits, ...this.progress });

    writeAtomic(
      this.checkpointFile,
      JSON.stringify({
        kind: `${STUDY} progress`,
        job: this.o.job,
        door: this.o.door,
        codeDigest: this.digest,
        written: new Date().toISOString(),
        body: JSON.parse(body),
        bodySha256: sha256(body)
      })
    );
  }

  read(key: string) {
    return this.store.read<Rec>('points', key);
  }

  // Evaluates every (configuration, options) pair not yet in the archive; returns the records in input order.
  async evalMany(items: readonly { quad: Quad; options?: EvalOptions }[]): Promise<Rec[]> {
    const keys = items.map((x) => evalKey(this.o.door, x.quad, x.options));
    const missing = new Map<string, Task>();

    keys.forEach((k, i) => {
      if (missing.has(k)) return;
      if (this.store.read('points', k)) {
        this.hits++;
        return;
      }
      missing.set(k, { k, quad: items[i]!.quad, options: items[i]!.options ?? {} });
    });

    if (missing.size) {
      await this.ensureWorkers();

      const tasks = [...missing.values()];

      // bounded queue: ≤ 4,096 tasks enter the pool at a time
      for (let i = 0; i < tasks.length; i += 4096)
        await this.pool.run<Rec>(tasks.slice(i, i + 4096), (task, record) => {
          this.store.write('points', task.k, record);
          this.fresh++;
          if (this.o.stopAfterFresh !== undefined && this.fresh >= this.o.stopAfterFresh)
            this.pool.requestStop(`stop-after ${this.o.stopAfterFresh} fresh evaluations (restart test)`);
        });
    }

    return keys.map((k) => {
      const r = this.store.read<Rec>('points', k);

      if (!r) throw new Error(`${k} missing after evaluation`);
      return r;
    });
  }

  readFit<T>(key: string) {
    return this.store.read<T>('fits', key);
  }

  writeFit(key: string, value: unknown) {
    this.store.write('fits', key, value);
  }

  async close(event = 'job-end') {
    if (this.timer) clearInterval(this.timer);
    this.store.commit();
    this.writeProgress();
    await this.monitor.sample(event);
    this.monitor.stop();
    await this.pool.close();
    this.store.close();
    log(
      `job ${this.o.job}: ${event} (${this.fresh} fresh, ${this.hits} archive hits); peak cgroup ${this.monitor.peakCurrent}, peak RSS ${this.monitor.peakRss}`
    );
  }

  get peaks() {
    return { cgroup: this.monitor.peakCurrent, rss: this.monitor.peakRss };
  }
}

// Runs a job body inside a Lab: a requested stop (memory pressure, SIGTERM/SIGINT, a pilot stop) commits, writes the
// progress checkpoint and exits 75; a failure commits, writes it and rethrows (exit 1). Nothing restarts the job.
export const withLab = async <T>(o: LabOptions, body: (lab: Lab) => Promise<T>): Promise<T> => {
  const lab = new Lab(o);

  await lab.open();

  try {
    lab.stage = 'running';

    const out = await body(lab);

    lab.stage = 'done';
    await lab.close('job-end');
    return out;
  } catch (error) {
    if (error instanceof StopRequested) {
      await lab.close(`stopped: ${error.reason}`);
      log(`stopped (${error.reason}); resume with the same command`);
      process.exit(EXIT_STOPPED);
    }

    await lab.close(`failed: ${(error as Error).message.split('\n')[0]}`);
    throw error;
  }
};
