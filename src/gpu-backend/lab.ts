// gpu-backend: the evaluation Lab with an injected pool — Assignment 3's Lab (src/vg-l0-full-joint/lab.ts) carried over
// with the same semantics (an archive bound to the job, its door and the evaluation code; per-key in-flight dedupe;
// archive hits never recomputed; a frozen cap on unique fresh evaluations; atomic progress checkpoints; a requested stop
// commits and exits the job; resume = rerun the same command, archived evaluations are read back) — except that the pool
// is a parameter: the GPU pool (official or not) or a CPU pool for non-official parity references. The search code
// (Assignment 3's Lane, unchanged) takes it in place of its own Lab: it reads evalMany, store, checkpoint, stage,
// writeProgress, compute, digest and peaks, all provided here. The archive binding records the backend, so a CPU and a
// GPU archive can never be mixed or resumed into one another.
//
// OWNERSHIP (GPU Phase 6, research/gpu-phase6/): one process at a time writes a job's archive and checkpoint. A Lab is
// either opened for a job this process owns (`owner`: src/gpu-jobs/jobs.ts openJob — the normal case; the job's
// directory, study and name must be the Lab's), or it takes its directory's ownership lock itself (src/gpu-jobs/lock.ts;
// a kernel lock released by any exit) and releases it at close. A second writer — another process, or a second Lab on the
// same job in this process — is refused (JOB_ACTIVE) before the archive is opened. Nothing of evalMany changes.
import fs from 'node:fs';
import path from 'node:path';
import { sha256, writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import { Store } from '../growth140-vgt-s8m/store.ts';
import { StopRequested } from '../growth140-vgt-s8m/pool.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { DRec, SRec } from '../vg-l0-risk-families/evaluate.ts';
import { type Cfg, evalKeyOf, quadOf } from '../vg-l0-full-joint/space.ts';
import type { Task } from './client.ts';
import type { Envelope } from './batch.ts';
import { type JobContext, claimJobDirectory } from '../gpu-jobs/jobs.ts';
import type { OwnershipLock } from '../gpu-jobs/lock.ts';

export { StopRequested };

// ----- the optional risk-envelope delivery (GPU Phase 7, research/gpu-phase7/RISK_METRIC_INTEGRATION_SPEC.md) -----
// An item of evalMany with `risk: true` is evaluated with the device's risk-envelope inputs and archived under its own
// key (`…|risk`), so a risk-bearing record never mixes with a plain one; its archived value is the canonical record
// with one extra field, `envelope` (four dollar amounts, the definitions of src/vg-l0-risk-metrics/metrics.ts). An item
// without `risk` keeps the key, the task and the archived record of every earlier version, byte for byte.
export const RISK_KEY_SUFFIX = '|risk';
export const ENVELOPE_FIELDS = [
  'bankedDdMarked',
  'bankedDdLiquidation',
  'principalLossMarked',
  'principalLossLiquidation'
] as const;
export type RiskRec<R extends SRec = SRec> = R & { envelope: Envelope };

// The one validity check of a delivered envelope, used by the Lab on every write and every read and by the
// qualification code (src/risk-envelope/qualify.ts): exactly the four fields, each a finite number ≥ 0, and the
// liquidation basis never below the marked one (the device computes the liquidation mark as the marked P&L minus the
// open shares' exit cost, so both orderings hold exactly). Anything else throws: a missing, extra, non-finite, negative
// or inconsistent value is a defect, never repaired or approximated.
export const checkEnvelope = (e: unknown, where: string): Envelope => {
  if (typeof e !== 'object' || e === null || Array.isArray(e))
    throw new Error(`risk envelope missing or not an object (${where})`);

  const keys = Object.keys(e).sort();
  const want = [...ENVELOPE_FIELDS].sort();

  if (keys.join(',') !== want.join(','))
    throw new Error(`risk envelope fields [${keys.join(', ')}] ≠ [${want.join(', ')}] (${where})`);
  for (const f of ENVELOPE_FIELDS) {
    const v = (e as Record<string, unknown>)[f];

    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
      throw new Error(`risk envelope ${f} = ${String(v)} is not a finite number ≥ 0 (${where})`);
  }

  const x = e as Envelope;

  if (x.bankedDdLiquidation < x.bankedDdMarked)
    throw new Error(
      `risk envelope: liquidation banked DD ${x.bankedDdLiquidation} < marked ${x.bankedDdMarked} (${where})`
    );
  if (x.principalLossLiquidation < x.principalLossMarked)
    throw new Error(
      `risk envelope: liquidation principal loss ${x.principalLossLiquidation} < marked ${x.principalLossMarked} (${where})`
    );
  return x;
};

export interface PoolLike {
  start(): Promise<void>;
  run<T>(tasks: Task[], onResult: (task: Task, value: T, ms: number) => void): Promise<void>;
  requestStop(reason: string): void;
  readonly stopping: string | null;
  close(): Promise<void>;
}

export interface EvalLabOptions {
  study: string; // research/<study>
  job: string;
  door: string;
  doorPin: string;
  purpose: string;
  pool: PoolLike;
  backend: string; // e.g. "gpu:<uuid>:<binary sha256>:<compat digest>" or "cpu:<n> workers"
  codeDigest: string;
  cacheRoot: string; // the job archives live in <cacheRoot>/jobs/<job>
  owner?: JobContext; // the job (openJob) that owns <cacheRoot>/jobs/<job> in this process; otherwise the Lab locks it
  queueChunk?: number;
  stopAfterFresh?: number; // tests: request a stop after this many fresh evaluations (the resume test)
  maxFresh?: number;
  log?: (s: string) => void;
}

export interface Tally {
  fresh: number;
  hits: number;
  ms: number;
}

export class EvalLab {
  readonly store: Store;
  readonly pool: PoolLike;
  readonly digest: string;
  stage = 'opening';
  fresh = 0;
  hits = 0;
  evalMs = 0;
  readonly tallies: Record<string, Tally> = {};
  private progress: Record<string, unknown> = {};
  readonly checkpointFile: string;
  private lastProgressWrite = 0;
  readonly t0 = Date.now();
  archivedAtOpen = 0;
  private started = false;
  private readonly inflight = new Map<string, Promise<void>>();
  private peakRss = 0;
  private readonly ownLock: OwnershipLock | null; // the directory's lock when no job context owns it

  constructor(readonly o: EvalLabOptions) {
    const dir = path.join(o.cacheRoot, 'jobs', o.job);

    // one writer per job: the owning job of this process, or this Lab's own lock (refused while another holds it)
    this.ownLock = claimJobDirectory({ study: o.study, cacheRoot: o.cacheRoot, job: o.job, owner: o.owner });
    this.digest = o.codeDigest;
    this.pool = o.pool;
    try {
      this.store = this.openStore(dir, o);
    } catch (e) {
      this.ownLock?.release();
      throw e;
    }
    this.checkpointFile = path.join(dir, 'progress.json');
  }

  private openStore(dir: string, o: EvalLabOptions) {
    return new Store(path.join(dir, 'archive.sqlite'), {
      binding: {
        study: o.study,
        job: o.job,
        door: o.door,
        doorPin: o.doorPin,
        codeDigest: o.codeDigest,
        backend: o.backend
      },
      lruCapacity: 200000,
      commitRows: 2000,
      commitMs: 5000
    });
  }

  async open() {
    this.archivedAtOpen = this.store.count('points');
    this.o.log?.(`job ${this.o.job}: door ${this.o.door}, backend ${this.o.backend}, ${this.archivedAtOpen} archived`);
  }

  checkpoint(p: Record<string, unknown>) {
    this.progress = { ...this.progress, ...p };
    this.writeProgress();
  }

  setProgress(p: Record<string, unknown>) {
    this.progress = { ...this.progress, ...p };
    if (Date.now() - this.lastProgressWrite > 60000) this.writeProgress();
  }

  writeProgress() {
    this.lastProgressWrite = Date.now();
    this.store.commit();
    this.peakRss = Math.max(this.peakRss, process.memoryUsage().rss);

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
        kind: 'eval-lab progress',
        job: this.o.job,
        door: this.o.door,
        backend: this.o.backend,
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

  // Assignment 3's evalMany, unchanged in its semantics (keys, dedupe, archive reads, input order, the fresh cap). An
  // item may add `risk: true` (GPU Phase 7): its record carries the risk envelope (RiskRec) under the `|risk` key.
  async evalMany<R extends SRec = SRec>(
    items: readonly { cfg: Cfg; options: EvalOptions; detail?: boolean; risk?: boolean }[],
    tag = 'other'
  ): Promise<R[]> {
    const keys = items.map(
      (x) =>
        `${evalKeyOf(this.o.door as never, x.cfg, x.options)}${x.detail ? '|detail' : ''}${x.risk ? RISK_KEY_SUFFIX : ''}`
    );
    const missing = new Map<string, Task>();
    const waits: Promise<void>[] = [];
    const t = this.tally(tag);

    keys.forEach((k, i) => {
      if (missing.has(k)) return;

      const pending = this.inflight.get(k);

      if (pending) {
        waits.push(pending);
        this.hits++;
        t.hits++;
        return;
      }
      if (this.store.read('points', k)) {
        this.hits++;
        t.hits++;
        return;
      }

      const x = items[i]!;

      missing.set(k, {
        k,
        quad: quadOf(x.cfg),
        controls: x.cfg.controls,
        options: x.options,
        detail: Boolean(x.detail),
        ...(x.risk ? { risk: true } : {}) // a plain item's task is exactly the earlier task object
      });
    });

    if (missing.size) {
      const settle = new Map<string, { resolve: () => void; reject: (e: unknown) => void }>();

      for (const k of missing.keys()) {
        const p = new Promise<void>((resolve, reject) => settle.set(k, { resolve, reject }));

        p.catch(() => undefined);
        this.inflight.set(k, p);
      }

      try {
        if (!this.started) {
          this.started = true;
          await this.pool.start();
        }

        const tasks = [...missing.values()];
        const chunk = this.o.queueChunk ?? 4096;

        for (let i = 0; i < tasks.length; i += chunk)
          await this.pool.run<SRec | DRec>(tasks.slice(i, i + chunk), (task, record, ms) => {
            this.checkDelivered(task.k, record, 'delivered');
            this.store.write('points', task.k, record);
            this.fresh++;
            this.evalMs += ms;
            t.fresh++;
            t.ms += ms;
            this.inflight.delete(task.k);
            settle.get(task.k)!.resolve();
            if (this.o.stopAfterFresh !== undefined && this.fresh >= this.o.stopAfterFresh)
              this.pool.requestStop(`stop-after ${this.o.stopAfterFresh} fresh evaluations (resume test)`);
          });
      } catch (error) {
        for (const [k, x] of settle)
          if (this.inflight.get(k)) {
            this.inflight.delete(k);
            x.reject(error);
          }
        throw error;
      }
    }

    await Promise.all(waits);

    if (this.o.maxFresh !== undefined && this.archivedAtOpen + this.fresh > this.o.maxFresh)
      throw new Error(
        `job ${this.o.job}: ${this.archivedAtOpen + this.fresh} unique fresh evaluations exceed its frozen cap ${this.o.maxFresh}`
      );

    return keys.map((k) => {
      const r = this.store.read<R>('points', k);

      if (!r) throw new Error(`${k} missing after evaluation`);
      this.checkDelivered(k, r, 'archived');
      return r;
    });
  }

  // a `|risk` key's record must carry a valid envelope; any other key's record must carry none (fail closed)
  private checkDelivered(k: string, r: unknown, where: string) {
    const env = (r as { envelope?: unknown } | null)?.envelope;

    if (k.endsWith(RISK_KEY_SUFFIX)) checkEnvelope(env, `${where} ${k}`);
    else if (env !== undefined) throw new Error(`${where} ${k}: a record without a risk request carries an envelope`);
  }

  async close(event = 'job-end') {
    this.store.commit();
    fs.appendFileSync(
      path.join(path.dirname(this.checkpointFile), 'runs.jsonl'),
      `${JSON.stringify({ t: new Date().toISOString(), event, fresh: this.fresh, hits: this.hits, archivedAtOpen: this.archivedAtOpen, archived: this.store.count('points'), wallSeconds: Math.round((Date.now() - this.t0) / 1000) })}\n`
    );
    this.writeProgress();
    try {
      await this.pool.close();
      this.store.close();
    } finally {
      this.ownLock?.release();
    }
  }

  get peaks() {
    return { cgroup: null, rss: Math.max(this.peakRss, process.memoryUsage().rss) };
  }

  runs() {
    const f = path.join(path.dirname(this.checkpointFile), 'runs.jsonl');

    return fs.existsSync(f)
      ? fs
          .readFileSync(f, 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((l) => JSON.parse(l) as { fresh: number; hits: number; event: string })
      : [];
  }

  get compute() {
    const prior = this.runs();

    return {
      unique: this.archivedAtOpen + this.fresh,
      freshAllRuns: prior.reduce((a, r) => a + r.fresh, 0) + this.fresh,
      priorRuns: prior.map((r) => r.event),
      fresh: this.fresh,
      archiveHits: this.hits,
      workerSeconds: Math.round(this.evalMs / 100) / 10,
      wallSeconds: Math.round((Date.now() - this.t0) / 100) / 10,
      tallies: this.tallies
    };
  }
}
