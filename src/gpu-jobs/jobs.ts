// gpu-jobs: AUTOMATIC ISOLATION OF OPTIMIZATION JOBS (GPU Phase 6, research/gpu-phase6/). Several independent
// optimization jobs may run on Apollo at once (GPU Phase 4: two jobs raise the total throughput). Each job gets, by
// default and without any configuration:
//
//   identity     research/<study>/results/jobs/<job>/job.json — the study, the job name and the job's DEFINITION (what
//                the runner declares: door, schedule, budget, backend kind, code digest…), with its sha256. Written once.
//   records      research/<study>/results/jobs/<job>/ — events.jsonl (open, resume, attestation, release, …), the GPU
//                receipts ledger and telemetry (receipts.jsonl, telemetry.jsonl), the runner's own result files,
//                complete.json once the job finished; logs/ (git-ignored) for the job's log
//   state        research/<study>/cache/jobs/<job>/ (git-ignored) — the evaluation archive and progress checkpoint of
//                the EvalLab (src/gpu-backend/lab.ts: <cacheRoot>/jobs/<job>), the ownership lock, owner.json
//   dataset      research/<study>/cache/jobs/<job>/dataset/ — the job's own GB2 dataset cache (exportDataset publishes
//                into it atomically, src/gpu-backend/dataset.ts — unchanged). Market data are never copied: every job
//                reads data/<SYMBOL>/ in place; only the derived ~34 MB GPU dataset is exported per job.
//
// Ownership: one live process per job (lock.ts — a kernel lock, released by any exit). Rules of openJob:
//   - a NEW job (resume false): refused if the job already exists (JOB_EXISTS) or another process holds it
//     (JOB_ACTIVE), or if its directories hold state that no job identity describes (JOB_FOREIGN_STATE);
//   - a RESUMED job (resume true): its own identity must match the declared definition exactly
//     (JOB_IDENTITY_CONFLICT otherwise), it must exist (JOB_NOT_FOUND) and no other process may hold it (JOB_ACTIVE);
//     its own checkpoint and archive are then read back by the Lab — never treated as a conflicting job;
//   - no name given: a fresh unique name is ALLOCATED (`<label>-<UTC time>-<random>`), so two runs can never collide.
// A job's failure, cancellation or kill touches only its own directories: nothing here writes outside them, and the
// shared inputs (market data, a dataset cache explicitly declared shared) are read-only or published write-once.
//
// Shared dataset caches stay possible where explicitly configured (`datasetCache: { shared: <dir> }`): the atomic
// write-once export makes concurrent use safe (research/gpu-phase5/ATOMIC_CACHE_AND_CONCURRENCY.md) and the job records
// the choice. Overrides: `cacheRoot` / `resultsRoot` options, or GPU_JOBS_CACHE_ROOT (e.g. a faster disk:
// <root>/<study name>/jobs/<job>).
//
// The module decides directories and ownership only. It never touches seeds, search order, evaluation or fitness: the
// search derives its seeds from its lane keys (never from a job name, an instance id or a time), so an isolated job, a
// resumed one and a concurrent one compute the same results.
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LockBusy, OwnershipLock } from './lock.ts';

export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const JOB_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/;
export const STUDY_ID = /^research\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;
export const CACHE_ROOT_ENV = 'GPU_JOBS_CACHE_ROOT';
export const IDENTITY_KIND = 'gpu-jobs job identity';

export type JobErrorCode =
  | 'JOB_ACTIVE'
  | 'JOB_EXISTS'
  | 'JOB_NOT_FOUND'
  | 'JOB_IDENTITY_CONFLICT'
  | 'JOB_FOREIGN_STATE'
  | 'JOB_INVALID'
  | 'JOB_NOT_OWNER';

export class JobError extends Error {
  constructor(
    readonly code: JobErrorCode,
    message: string
  ) {
    super(`${code}: ${message}`);
  }
}

export interface JobOptions {
  study: string; // 'research/<study>'
  job?: string; // the job name; omitted → a unique name is allocated
  label?: string; // the allocated name's prefix (default 'job')
  resume?: boolean; // continue an existing job (its own identity, checkpoint and archive)
  identity: Record<string, unknown>; // the job's definition; must be equal on resume
  purpose: string; // the run's declared execution purpose (recorded)
  datasetCache?: { shared: string }; // an explicitly shared dataset cache (default: the job's own)
  cacheRoot?: string; // default research/<study>/cache (or $GPU_JOBS_CACHE_ROOT/<study name>)
  resultsRoot?: string; // default research/<study>/results
  lockWaitMs?: number; // how long a start waits for a lock (default 1500 ms; a live owner keeps it)
}

export interface JobIdentity {
  kind: typeof IDENTITY_KIND;
  study: string;
  job: string;
  allocated: boolean;
  created: string;
  createdBy: { instance: string; pid: number; host: string; node: string };
  definition: Record<string, unknown>;
  definitionSha256: string;
  datasetCache: { mode: 'job' } | { mode: 'shared'; dir: string };
}

export interface JobContext {
  readonly study: string;
  readonly name: string;
  readonly id: string; // <study>/<job>
  readonly instance: string; // this process's session of the job (random; never a seed)
  readonly resumed: boolean;
  readonly allocated: boolean;
  readonly purpose: string;
  readonly identity: JobIdentity;
  readonly datasetShared: boolean;
  readonly labCacheRoot: string; // EvalLab's cacheRoot: its archive and checkpoint live in dirs.cache
  readonly dirs: { cache: string; dataset: string; results: string; logs: string };
  readonly files: {
    identity: string;
    owner: string;
    events: string;
    receipts: string;
    telemetry: string;
    log: string;
    completion: string;
  };
  holds(): boolean;
  event(kind: string, detail?: Record<string, unknown>): void;
  log(line: string): void;
  complete(summary?: Record<string, unknown>): void;
  release(outcome?: string): void;
}

// canonical JSON (sorted keys) — the definition's identity does not depend on key order
export const canonical = (x: unknown): string =>
  JSON.stringify(x, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : typeof v === 'bigint'
        ? `0x${v.toString(16)}`
        : v
  );
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const writeAtomic = (file: string, body: string) => {
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, file);
};
const readJson = <T>(file: string): T | null => (fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as T) : null);

export const studyName = (study: string) => study.slice('research/'.length);

// the job's directories (derived only from the study, the name and the roots — never from a time or a process)
export const jobLayout = (o: { study: string; job: string; cacheRoot?: string; resultsRoot?: string }) => {
  if (!STUDY_ID.test(o.study)) throw new JobError('JOB_INVALID', `study "${o.study}" is not research/<name>`);
  if (!JOB_NAME.test(o.job))
    throw new JobError('JOB_INVALID', `job name "${o.job}": letters, digits, '_', '.', '-' (≤ 96, starting alphanumeric)`);

  const envRoot = process.env[CACHE_ROOT_ENV];
  const cacheBase = path.resolve(
    o.cacheRoot ?? (envRoot ? path.join(envRoot, studyName(o.study)) : path.join(repoRoot, o.study, 'cache'))
  );
  const resultsBase = path.resolve(o.resultsRoot ?? path.join(repoRoot, o.study, 'results'));
  const cache = path.join(cacheBase, 'jobs', o.job);
  const results = path.join(resultsBase, 'jobs', o.job);

  return {
    labCacheRoot: cacheBase,
    cache,
    results,
    logs: path.join(results, 'logs'),
    dataset: path.join(cache, 'dataset'),
    identity: path.join(results, 'job.json'),
    owner: path.join(cache, 'owner.json'),
    events: path.join(results, 'events.jsonl'),
    receipts: path.join(results, 'receipts.jsonl'),
    telemetry: path.join(results, 'telemetry.jsonl'),
    log: path.join(results, 'logs', 'job.log'),
    completion: path.join(results, 'complete.json')
  };
};

export const allocateJobName = (label = 'job') => {
  if (!JOB_NAME.test(label) || label.length > 60) throw new JobError('JOB_INVALID', `label "${label}"`);
  return `${label}-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}-${randomBytes(3).toString('hex')}`;
};

// files a fresh job's directories may already hold (left by an earlier attempt that never got its identity written)
const benign = new Set(['job.lock', 'owner.json', 'job.lock-journal']);

export const openJob = (o: JobOptions): JobContext => {
  const allocated = !o.job;
  const name = o.job ?? allocateJobName(o.label);
  const L = jobLayout({ study: o.study, job: name, cacheRoot: o.cacheRoot, resultsRoot: o.resultsRoot });
  const id = `${o.study}/${name}`;

  if (o.resume && allocated) throw new JobError('JOB_INVALID', 'resume needs the name of the job to resume');
  if (o.datasetCache && !path.isAbsolute(o.datasetCache.shared))
    throw new JobError('JOB_INVALID', `a shared dataset cache must be an absolute path (${o.datasetCache.shared})`);

  // 1. ownership first: everything below happens under the job's lock
  let lock: OwnershipLock;

  try {
    lock = OwnershipLock.acquire(L.cache, o.lockWaitMs ?? 1500);
  } catch (e) {
    if (e instanceof LockBusy) {
      const owner = readJson<Record<string, unknown>>(L.owner);

      throw new JobError(
        'JOB_ACTIVE',
        `job ${id} is ${e.inThisProcess ? 'already open in this process' : 'running in another process'}${owner ? ` (owner: pid ${owner.pid} on ${owner.host}, instance ${owner.instance}, since ${owner.since})` : ''}; a job has one owner at a time — wait for it, stop it, or use another job name`
      );
    }
    throw e;
  }

  try {
    const definitionSha256 = sha256(canonical(o.identity));
    const existing = readJson<JobIdentity>(L.identity);
    const instance = randomBytes(8).toString('hex');
    let identity: JobIdentity;

    if (existing) {
      if (existing.kind !== IDENTITY_KIND || existing.study !== o.study || existing.job !== name)
        throw new JobError('JOB_IDENTITY_CONFLICT', `${L.identity} does not describe job ${id}`);
      if (!o.resume)
        throw new JobError(
          'JOB_EXISTS',
          `job ${id} already exists (created ${existing.created}${fs.existsSync(L.completion) ? ', complete' : ', not complete'}): resume it with its own definition, or choose a new job name — results are never overwritten`
        );
      if (existing.definitionSha256 !== definitionSha256 || canonical(existing.definition) !== canonical(o.identity))
        throw new JobError(
          'JOB_IDENTITY_CONFLICT',
          `job ${id} was created with another definition (sha256 ${existing.definitionSha256.slice(0, 16)}, this run ${definitionSha256.slice(0, 16)}): a resume continues exactly the same job; a different job needs its own name`
        );
      const mode = o.datasetCache ? 'shared' : 'job';

      if (existing.datasetCache.mode !== mode || (mode === 'shared' && existing.datasetCache.mode === 'shared' && path.resolve(existing.datasetCache.dir) !== path.resolve(o.datasetCache!.shared)))
        throw new JobError(
          'JOB_IDENTITY_CONFLICT',
          `job ${id} was created with dataset cache ${JSON.stringify(existing.datasetCache)}; this run declares ${JSON.stringify(o.datasetCache ?? { mode: 'job' })}`
        );
      identity = existing;
    } else {
      if (o.resume) throw new JobError('JOB_NOT_FOUND', `job ${id} does not exist (nothing to resume)`);

      const leftovers = [
        ...(fs.existsSync(L.cache) ? fs.readdirSync(L.cache).filter((f) => !benign.has(f)) : []),
        ...(fs.existsSync(L.results) ? fs.readdirSync(L.results).map((f) => `results/${f}`) : [])
      ];

      if (leftovers.length)
        throw new JobError(
          'JOB_FOREIGN_STATE',
          `the directories of job ${id} hold state that no job identity describes (${leftovers.slice(0, 6).join(', ')}): never adopted or overwritten — inspect and remove them, or use another job name`
        );
      identity = {
        kind: IDENTITY_KIND,
        study: o.study,
        job: name,
        allocated,
        created: new Date().toISOString(),
        createdBy: { instance, pid: process.pid, host: os.hostname(), node: process.version },
        definition: JSON.parse(canonical(o.identity)) as Record<string, unknown>,
        definitionSha256,
        datasetCache: o.datasetCache ? { mode: 'shared', dir: path.resolve(o.datasetCache.shared) } : { mode: 'job' }
      };
      fs.mkdirSync(L.results, { recursive: true });
      fs.writeFileSync(L.identity, `${JSON.stringify(identity, null, 1)}\n`, { flag: 'wx' });
    }

    const resumed = Boolean(existing);
    const dataset = identity.datasetCache.mode === 'shared' ? identity.datasetCache.dir : L.dataset;

    fs.mkdirSync(dataset, { recursive: true });
    fs.mkdirSync(L.logs, { recursive: true });
    writeAtomic(
      L.owner,
      `${JSON.stringify({ job: id, instance, pid: process.pid, host: os.hostname(), since: new Date().toISOString(), purpose: o.purpose, argv: process.argv.slice(1, 6) })}\n`
    );

    let released = false;
    const event = (kind: string, detail: Record<string, unknown> = {}) =>
      fs.appendFileSync(
        L.events,
        `${JSON.stringify({ t: new Date().toISOString(), event: kind, instance, pid: process.pid, ...detail })}\n`
      );
    const ctx: JobContext = {
      study: o.study,
      name,
      id,
      instance,
      resumed,
      allocated: identity.allocated,
      purpose: o.purpose,
      identity,
      datasetShared: identity.datasetCache.mode === 'shared',
      labCacheRoot: L.labCacheRoot,
      dirs: { cache: L.cache, dataset, results: L.results, logs: L.logs },
      files: {
        identity: L.identity,
        owner: L.owner,
        events: L.events,
        receipts: L.receipts,
        telemetry: L.telemetry,
        log: L.log,
        completion: L.completion
      },
      holds: () => !released && lock.holds,
      event: (kind, detail) => {
        if (released) throw new JobError('JOB_NOT_OWNER', `job ${id} was released by this process`);
        event(kind, detail);
      },
      log: (line) => {
        const s = `[${name} ${new Date().toISOString().slice(11, 19)}Z] ${line}`;

        console.log(s);
        if (!released) fs.appendFileSync(L.log, `${s}\n`);
      },
      complete: (summary = {}) => {
        if (released) throw new JobError('JOB_NOT_OWNER', `job ${id} was released by this process`);
        writeAtomic(
          L.completion,
          `${JSON.stringify({ job: id, instance, completed: new Date().toISOString(), ...summary }, null, 1)}\n`
        );
        event('complete', summary);
      },
      release: (outcome = 'released') => {
        if (released) return;
        try {
          event('release', { outcome });
        } finally {
          released = true;
          lock.release();
        }
      }
    };

    event(resumed ? 'resume' : 'open', {
      purpose: o.purpose,
      host: os.hostname(),
      node: process.version,
      datasetCache: identity.datasetCache,
      ...(resumed && fs.existsSync(L.completion) ? { note: 'resumed after completion' } : {})
    });
    return ctx;
  } catch (e) {
    // a refused start may leave its empty lock file behind: never deleted automatically (a waiting process may already
    // hold the lock through it), harmless (status reports such a directory as absent; a new job may use the name)
    lock.release();
    throw e;
  }
};

// ----- ownership checks used by the Lab and the official gate -----

// The EvalLab's claim on its directory (<cacheRoot>/jobs/<job>): either the job that owns it (openJob, this process)
// or — for a Lab opened without a job context (non-official tools) — the Lab takes the directory's lock itself.
// Returns the lock the Lab must release at close (null: the job owns it).
export const claimJobDirectory = (o: {
  study: string;
  cacheRoot: string;
  job: string;
  owner?: JobContext;
}): OwnershipLock | null => {
  const dir = path.resolve(o.cacheRoot, 'jobs', o.job);

  if (o.owner) {
    const p = ownerProblem(o.owner, { study: o.study, job: o.job, dir });

    if (p) throw new JobError('JOB_NOT_OWNER', p);
    return null;
  }
  try {
    return OwnershipLock.acquire(dir);
  } catch (e) {
    if (e instanceof LockBusy)
      throw new JobError(
        'JOB_ACTIVE',
        `the job directory ${dir} is ${e.inThisProcess ? 'already open in this process' : 'owned by another live process'}: one writer per job`
      );
    throw e;
  }
};

// why `job` is not a valid owner of (study, job, dir) in this process (null: it is)
export const ownerProblem = (job: JobContext, want: { study?: string; job?: string; dir?: string }) => {
  if (!job.holds()) return `job ${job.id} is not held by this process (released, or never opened here)`;
  if (want.study !== undefined && want.study !== job.study) return `job ${job.id} belongs to ${job.study}, not ${want.study}`;
  if (want.job !== undefined && want.job !== job.name) return `job ${job.id} is not "${want.job}"`;
  if (want.dir !== undefined && path.resolve(want.dir) !== path.resolve(job.dirs.cache))
    return `job ${job.id} owns ${job.dirs.cache}, not ${want.dir}`;
  if (OwnershipLock.heldHere(job.dirs.cache) === null) return `job ${job.id}'s lock is not held by this process`;
  return null;
};

// the EvalLab and pool settings of a job (so a runner never assembles the paths by hand)
export const labOptionsOf = (job: JobContext) => ({
  study: job.study,
  job: job.name,
  owner: job,
  cacheRoot: job.labCacheRoot
});
export const poolFilesOf = (job: JobContext) => ({ ledgerFile: job.files.receipts, telemetryFile: job.files.telemetry });

// ----- status (read-only: never takes a job's lock for longer than a probe) -----

export type JobState = 'absent' | 'active' | 'complete' | 'interrupted' | 'foreign';

export const jobStatus = (o: { study: string; job: string; cacheRoot?: string; resultsRoot?: string }) => {
  const L = jobLayout(o);
  const identity = readJson<JobIdentity>(L.identity);
  const lock = fs.existsSync(L.cache) ? OwnershipLock.probe(L.cache) : 'free';
  const events = fs.existsSync(L.events) ? fs.readFileSync(L.events, 'utf8').trim().split('\n').filter(Boolean) : [];
  const last = events.length ? (JSON.parse(events.at(-1)!) as Record<string, unknown>) : null;
  const state: JobState =
    lock !== 'free'
      ? 'active'
      : !identity
        ? (fs.existsSync(L.cache) && fs.readdirSync(L.cache).some((f) => !benign.has(f))) ||
          (fs.existsSync(L.results) && fs.readdirSync(L.results).length > 0)
          ? 'foreign'
          : 'absent'
        : fs.existsSync(L.completion)
          ? 'complete'
          : 'interrupted';

  return {
    id: `${o.study}/${o.job}`,
    state,
    lock,
    owner: lock !== 'free' ? readJson<Record<string, unknown>>(L.owner) : null,
    created: identity?.created ?? null,
    definitionSha256: identity?.definitionSha256 ?? null,
    datasetCache: identity?.datasetCache ?? null,
    events: events.length,
    lastEvent: last,
    dirs: { cache: L.cache, results: L.results }
  };
};

export const listJobs = (o: { study: string; cacheRoot?: string; resultsRoot?: string }) => {
  const L = jobLayout({ ...o, job: 'x' });
  const names = new Set<string>();

  for (const d of [path.dirname(L.cache), path.dirname(L.results)])
    if (fs.existsSync(d)) for (const n of fs.readdirSync(d)) if (JOB_NAME.test(n)) names.add(n);
  return [...names].sort().map((job) => jobStatus({ ...o, job }));
};
