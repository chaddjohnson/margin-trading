// The coordinator's evaluation service (PROTOCOL.md §13; Priority 3's src/vg-d1-growth-joint/lab.ts bound to this
// study): one door, one pool of workers, one SQLite archive bound to the job (study, job name, door and its pin, the
// evaluation-code digest), a bounded LRU in front, the 10-second memory monitor with its stop threshold, and an
// atomic progress checkpoint at least once a minute (and at every generation boundary the search reports).
//
// RESUME. Every stage of a job is a deterministic function of its seeds and of the evaluations it asks for, and every
// evaluation is archived the moment it returns. Rerunning the same command therefore replays the job from its start:
// archived evaluations are read back (never recomputed), the interrupted batch is regenerated and only its missing
// evaluations run, so a resumed job reproduces an uninterrupted one exactly.
//
// COUNTS. Fresh evaluations and archive hits are counted per tag (centres, neighbours by rung, refinement, …) with the
// workers' compute time; an archive hit is never counted as new exploration.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Monitor as PriorMonitor, cgroupInfo } from '../growth140-vgt-s8m/pool.ts';
import { sha256, writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import { Store } from '../growth140-vgt-s8m/store.ts';
import { doorSpecs } from '../vg-d1-growth-joint/context.ts';
import { type EvalOptions, type Rec, evalKey } from '../vg-d1-growth-joint/evaluate.ts';
import { evaluationFiles as p3EvaluationFiles } from '../vg-d1-growth-joint/lab.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { STUDY, cacheRoot, log, repoRoot, resources, resultsDir } from './context.ts';
import type { DoorKey } from './doors.ts';
import { Pool, StopRequested, type Task } from './workers.ts';

export const EXIT_STOPPED = 75;

// The files an archived record depends on: Priority 3's evaluation path and the canonical engines (unchanged since its
// sealed parity), and this study's worker and door loader.
export const evaluationFiles = [
  ...p3EvaluationFiles,
  'src/vg-d1-growth-expanded/worker.ts',
  'src/vg-d1-growth-expanded/doors.ts'
];

export const digestOf = (files: readonly string[]) =>
  createHash('sha256')
    .update(
      files
        .map(
          (file) =>
            `${file}:${createHash('sha256')
              .update(fs.readFileSync(path.join(repoRoot, file)))
              .digest('hex')}`
        )
        .join('\n')
    )
    .digest('hex');

export const codeDigest = () => digestOf(evaluationFiles);
export const p3EvaluationDigest = () => digestOf(p3EvaluationFiles);

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
  door: DoorKey;
  purpose: string;
  workers: number;
  memoryLog?: string; // default results/memory/<job>.jsonl
  stopAfterFresh?: number; // pilot: request a stop after this many fresh evaluations
  killWorkerAfter?: number; // pilot: one worker SIGKILLs itself after this many evaluations
}

export interface Tally {
  fresh: number;
  hits: number;
  ms: number;
}

export class Lab {
  readonly store: Store;
  readonly pool: Pool;
  private readonly monitor: InstanceType<typeof Monitor>;
  readonly digest: string;
  stage = 'opening';
  fresh = 0;
  hits = 0;
  evalMs = 0;
  readonly tallies: Record<string, Tally> = {};
  private started = false;
  private progress: Record<string, unknown> = {};
  private timer: NodeJS.Timeout | null = null;
  readonly checkpointFile: string;
  private lastProgressWrite = 0;
  readonly t0 = Date.now();

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
    this.pool = new Pool({ door: o.door, purpose: o.purpose, workers: o.workers, killAfter: o.killWorkerAfter });
    this.checkpointFile = path.join(dir, 'progress.json');
    this.monitor = new Monitor({
      file:
        o.memoryLog ??
        (o.job.startsWith('pilot-')
          ? path.join(cacheRoot, 'pilot', 'memory', `${o.job}.jsonl`) // a pilot never writes into the study's results
          : path.join(resultsDir, 'memory', `${o.job}.jsonl`)),
      pool: this.pool,
      lab: () => ({ fresh: this.fresh, hits: this.hits }),
      store: () => this.store,
      stage: () => this.stage,
      extra: () => ({ job: o.job, door: o.door, fresh: this.fresh, hits: this.hits, evalMs: Math.round(this.evalMs) }),
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

    const stage = this.stage;

    this.stage = `${stage} (starting workers)`;
    await this.pool.start();
    this.stage = stage;
    await this.monitor.sample('workers-ready');
  }

  // A generation boundary (or any other checkpoint point): merges the search state and writes it now.
  checkpoint(p: Record<string, unknown>) {
    this.progress = { ...this.progress, ...p };
    this.writeProgress();
  }

  setProgress(p: Record<string, unknown>) {
    this.progress = { ...this.progress, ...p };
    if (Date.now() - this.lastProgressWrite > resources.checkpointEveryMs) this.writeProgress();
  }

  writeProgress() {
    this.lastProgressWrite = Date.now();
    this.store.commit();

    const body = JSON.stringify({
      stage: this.stage,
      fresh: this.fresh,
      hits: this.hits,
      evalMs: Math.round(this.evalMs),
      tallies: this.tallies,
      ...this.progress
    });

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

  private tally(tag: string) {
    return (this.tallies[tag] ??= { fresh: 0, hits: 0, ms: 0 });
  }

  // Evaluates every (configuration, options) pair not yet in the archive; returns the records in input order.
  async evalMany(items: readonly { quad: Quad; options?: EvalOptions }[], tag = 'other'): Promise<Rec[]> {
    const keys = items.map((x) => evalKey(this.o.door, x.quad, x.options));
    const missing = new Map<string, Task>();
    const t = this.tally(tag);

    keys.forEach((k, i) => {
      if (missing.has(k)) return;
      if (this.store.read('points', k)) {
        this.hits++;
        t.hits++;
        return;
      }
      missing.set(k, { k, quad: items[i]!.quad, options: items[i]!.options ?? {} });
    });

    if (missing.size) {
      await this.ensureWorkers();

      const tasks = [...missing.values()];

      for (let i = 0; i < tasks.length; i += resources.queueChunk)
        await this.pool.run<Rec>(tasks.slice(i, i + resources.queueChunk), (task, record, ms) => {
          this.store.write('points', task.k, record);
          this.fresh++;
          this.evalMs += ms;
          t.fresh++;
          t.ms += ms;
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

  async close(event = 'job-end') {
    if (this.timer) clearInterval(this.timer);
    this.store.commit();
    this.writeProgress();
    await this.monitor.sample(event);
    this.monitor.stop();
    await this.pool.close();
    this.store.close();
    log(
      `job ${this.o.job}: ${event} (${this.fresh} fresh, ${this.hits} archive hits, ${Math.round(this.evalMs / 1000)} worker-s); peak cgroup ${this.monitor.peakCurrent}, peak RSS ${this.monitor.peakRss}`
    );
  }

  get peaks() {
    return { cgroup: this.monitor.peakCurrent, rss: this.monitor.peakRss };
  }

  get compute() {
    return {
      fresh: this.fresh,
      archiveHits: this.hits,
      workerSeconds: Math.round(this.evalMs / 100) / 10,
      wallSeconds: Math.round((Date.now() - this.t0) / 100) / 10,
      tallies: this.tallies
    };
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
