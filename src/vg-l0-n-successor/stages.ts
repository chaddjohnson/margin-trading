// P5-NS's stages (PROTOCOL.md §14), each OFFICIAL evaluating stage a GPU job of its own (src/gpu-jobs/jobs.ts openJob →
// src/gpu-backend/official.ts openOfficialGpuSession → GpuPool → EvalLab; no CPU path), each writing one sealed record.
// Per cutoff, strictly C19 → C21 → C23 → C24:
//
//   search --cutoff C --part broad1|broad2     Track F's base broad lanes (cells 1–32 | 33–64 × replicates R101–R104)
//   round  --cutoff C --track F --k k          the k-th replicate round's decision (and its 64 lanes if it fires)
//   qualify --cutoff C --stage broad           every broad shortlist (+ the controls N/original and New L0)
//   refine-plan --cutoff C                     the frozen stage-2 plan (no evaluation)
//   search --cutoff C --part refine            the refinement lanes (plan cells × 4 replicates)
//   qualify --cutoff C --stage refine
//   [C24] search --part informed1|informed2, round --track N --k k, qualify --stage informed   Track N
//   select --cutoff C                          (no evaluation) sealed AND COMMITTED before the next door opens
//   slice --cutoff C19|C21|C23                 the fold evaluation on the next slice (D21 / D23 / D24)
//   sequential                                 (no evaluation; after C23's slice; committed before D24 training)
//   freeze-selection, authorize-full           (no evaluation; after the C24 selection)
//   validate                                   C24 → 2025–2026 on FULL, once
//   outcome                                    (no evaluation) the precommitted successor determination
//
// Guards of every official stage: the study preflight, the sealed and committed protocol freeze with the frozen code
// digest (or a sealed code amendment chained from it), the sealed engineering gates, the acceptance record the freeze
// pinned, no uncommitted change to the code closure or the protocol documents, the fold order, the door guards
// (doors.ts), the study ledger and the disk reserve. A stage whose record exists refuses to rerun; an interrupted job
// resumes from its archive (the same command with --resume).
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { openOfficialGpuSession } from '../gpu-backend/official.ts';
import { GpuPool } from '../gpu-backend/pool.ts';
import { EvalLab, StopRequested } from '../gpu-backend/lab.ts';
import { compatManifest } from '../gpu-backend/compat.ts';
import { riskEnvelopePilotDomain } from '../gpu-backend/domain.ts';
import type { StudyDoor } from '../gpu-backend/doors.ts';
import { type JobContext, JobError, labOptionsOf, openJob, poolFilesOf } from '../gpu-jobs/jobs.ts';
import { doorSpecs } from '../vg-d1-growth-joint/context.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { wilson } from '../vg-d1-growth-diagnostic/risk.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { fidelity } from '../vg-l0-risk-families/qualify.ts';
import { drawsOf, famOf } from '../vg-l0-full-joint/qualify.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import type { DRec, SRec } from '../vg-l0-full-joint/evaluate.ts';
import { type Cfg, allCells, allPairs, canonicalCfg, cellOf, cellOfControls, cfgId } from '../vg-l0-full-joint/space.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import type { LaneResult, LaneSpec, Seed } from '../vg-l0-risk-envelope-pilot/search.ts';
import {
  type CutoffKey,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  STUDY_ID,
  ceiling,
  cutoffKeys,
  cutoffs,
  engineeringFile,
  execution,
  foldKeys,
  freezeFile,
  log,
  r2,
  repoRoot,
  researchDir,
  resultsDir
} from './context.ts';
import {
  type Kind,
  archiveBytesPerFresh,
  ceilingRequested,
  diskReserveBytes,
  firstReplicate,
  laneCaps,
  perMemberCap,
  perSubject,
  replicates,
  schedules
} from './budget.ts';
import { runLanes, roundTrigger, unionState } from './lanes.ts';
import { references } from './incumbents.ts';
import { projectedSeeds } from './informed.ts';
import { type Evidence, type QMember, qualifyMembers, sealedEvidence, stresses } from './qualify.ts';
import {
  type PopulationName,
  finalPopulations,
  foldPopulations,
  originalOrder,
  populationLabel,
  populations,
  refineCells,
  rolesOf,
  selectionSummary
} from './select.ts';
import { type SliceRow, chain, verdictOf } from './sequential.ts';
import { finalistsOf, successorPreDetermination } from './successor.ts';
import {
  fullAuthorizationFile,
  frozenSelectionFile,
  openP5Door,
  selectionFile,
  sequentialFile,
  sliceFile
} from './doors.ts';
import {
  assertCommitted,
  branchName,
  codeDigest,
  dirtyCode,
  headCommit,
  isCommitted,
  isSealed,
  readJson,
  readSealed,
  rel,
  seal,
  sha256File
} from './records.ts';

// ----- files -----

export type Part = 'broad1' | 'broad2' | 'refine' | 'informed1' | 'informed2';
export const searchFile = (cut: CutoffKey, part: string) => path.join(resultsDir, 'search', cut, `${part}.json`);
export const roundFile = (cut: CutoffKey, track: 'F' | 'N', k: number) => path.join(resultsDir, 'rounds', cut, `${track}-${k}.json`);
export const roundSearchFile = (cut: CutoffKey, track: 'F' | 'N', k: number) => searchFile(cut, `${track === 'F' ? 'rx' : 'nrx'}${k}`);
export type QStage = 'broad' | 'refine' | 'informed';
export const qualificationFile = (cut: CutoffKey, stage: QStage) => path.join(resultsDir, 'qualification', cut, `${stage}.json`);
export const refinePlanFile = (cut: CutoffKey) => path.join(resultsDir, 'refine-plan', `${cut}.json`);
export const outcomeFile = path.join(resultsDir, 'outcome.json');
export const lotRowsDir = path.join(researchDir, 'cache', 'lot-rows');
export const studyDocs = [
  'research/vg-l0-n-successor/PROTOCOL.md',
  'research/vg-l0-n-successor/AMENDMENTS.md',
  'research/vg-l0-n-successor/STANDARD_ADOPTION.json'
];

// ----- guards -----

interface Freeze {
  protocol: { sha256: string };
  codeDigest: string;
  acceptanceSha256: string;
  expected: Expected;
}
export interface Expected {
  // the pilot's means (requested per lane by kind and door, per member, per subject): launch rule only
  perLane: Record<Kind, Record<string, number>>;
  perMember: number;
  perSubject: number;
}

export const amendmentsDir = path.join(resultsDir, 'amendments');
export const codeAmendments = () =>
  fs.existsSync(amendmentsDir)
    ? fs
        .readdirSync(amendmentsDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => path.join(amendmentsDir, f))
    : [];
export const allowedCodeDigests = (frozen: string) => {
  const out = [frozen];

  for (const f of codeAmendments()) {
    if (!isSealed(f)) throw new Error(`${rel(f)} is not sealed`);
    assertCommitted(f);

    const a = readJson<{ from: string; to: string }>(f);

    if (a.from !== out.at(-1)) throw new Error(`${rel(f)}: an amendment from ${a.from.slice(0, 12)} does not chain from ${out.at(-1)!.slice(0, 12)}`);
    out.push(a.to);
  }
  return out;
};

export const officialGuards = (stage: string) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (!isSealed(freezeFile)) throw new Error(`${stage}: the protocol is not frozen (results/protocol-freeze.json)`);
  assertCommitted(freezeFile);

  const fz = readJson<Freeze>(freezeFile);
  const protocolSha = sha256File(path.join(researchDir, 'PROTOCOL.md'));

  if (fz.protocol.sha256 !== protocolSha) throw new Error(`${stage}: PROTOCOL.md (${protocolSha.slice(0, 12)}) ≠ the frozen ${fz.protocol.sha256.slice(0, 12)}`);

  const allowed = allowedCodeDigests(fz.codeDigest);

  if (!allowed.includes(codeDigest()))
    throw new Error(`${stage}: the code closure changed since the freeze (digest ${codeDigest().slice(0, 12)} ∉ {${allowed.map((d) => d.slice(0, 12)).join(', ')}}): record a code amendment`);
  if (fz.acceptanceSha256 !== sha256File(path.join(repoRoot, 'config/gpu-backend/acceptance.json')))
    throw new Error(`${stage}: the acceptance record differs from the one the freeze pinned`);
  if (!isSealed(engineeringFile)) throw new Error(`${stage}: the engineering gates are not sealed (results/engineering/gates.json)`);
  assertCommitted(engineeringFile);

  const g = readJson<{ pass: boolean }>(engineeringFile);

  if (!g.pass) throw new Error(`${stage}: an engineering gate did not pass: every official stage is blocked`);

  const dirty = dirtyCode(studyDocs);

  if (dirty.length) throw new Error(`${stage}: uncommitted changes to the code or protocol (an official run starts from a commit): ${dirty.slice(0, 5).join('; ')}`);
  return { freeze: fz, head: headCommit(), branch: branchName() };
};

// the fold order: a cutoff's first stage needs the previous fold complete (its slice record sealed and committed; C24
// also the sealed, committed sequential record), and no later cutoff may have started
export const foldGuard = (cut: CutoffKey, stage: string) => {
  const prev = cutoffs[cut].previous;

  if (prev && !(isSealed(sliceFile(prev)) && isCommitted(sliceFile(prev))))
    throw new Error(`${stage}: the ${prev} fold is not complete (its slice record is not sealed and committed)`);
  if (cut === 'C24' && !(isSealed(sequentialFile) && isCommitted(sequentialFile))) throw new Error(`${stage}: the sequential record is not sealed and committed`);
  for (const later of cutoffKeys.slice(cutoffKeys.indexOf(cut) + 1))
    if (fs.existsSync(path.join(resultsDir, 'search', later))) throw new Error(`${stage}: the later ${later} cutoff has started`);
  if (fs.existsSync(selectionFile(cut))) throw new Error(`${stage}: the ${cut} selection exists`);
};

// the study ledger: requested official evaluations of every sealed stage record
const sealedRecords = () => {
  const out: string[] = [];
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);

      if (e.isDirectory()) walk(f);
      else if (e.name.endsWith('.json') && isSealed(f)) out.push(f);
    }
  };

  for (const d of ['search', 'qualification', 'slices', 'validation']) walk(path.join(resultsDir, d));
  return out.sort();
};
export const ledger = () => {
  const rows = sealedRecords().map((f) => ({ file: rel(f), requested: readJson<{ requested?: number }>(f).requested ?? 0 }));

  return { rows, used: rows.reduce((a, r) => a + r.requested, 0), ceiling: ceilingRequested };
};
const freeBytes = () => {
  const s = fs.statfsSync(repoRoot);

  return Number(s.bavail) * Number(s.bsize);
};
// the launch rule: the remaining ceiling covers 1.5 × the expected cost, and the disk keeps its reserve after it
export const launchGuard = (stage: string, expectedRequested: number) => {
  const l = ledger();
  const remaining = l.ceiling - l.used;

  if (remaining < 1.5 * expectedRequested)
    throw new Error(`${stage}: resource ceiling — ${remaining} requested remain of ${l.ceiling}, expected ${expectedRequested} × 1.5 (PROTOCOL.md §7.7): the study stops here and reports`);

  const need = expectedRequested * archiveBytesPerFresh + diskReserveBytes;

  if (freeBytes() < need) throw new Error(`${stage}: disk reserve — ${(freeBytes() / 1024 ** 3).toFixed(1)} GiB free < ${(need / 1024 ** 3).toFixed(1)} GiB needed (PROTOCOL.md §7.7)`);
  return { ledgerUsed: l.used, remaining, expectedRequested, freeGiB: r2(freeBytes() / 1024 ** 3) };
};

const definitionOf = (stage: string, extra: Record<string, unknown>) => ({
  study: STUDY_ID,
  protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
  protocolSha256: readJson<Freeze>(freezeFile).protocol.sha256,
  frozenCodeDigest: readJson<Freeze>(freezeFile).codeDigest,
  codeDigest: codeDigest(),
  stage,
  ...extra
});

// ----- one official job: the gate, the attested pool, the Lab -----

interface JobRun<T> {
  job: string;
  resume: boolean;
  identity: Record<string, unknown>;
  door: StudyDoor;
  use: 'training' | 'slice' | 'validation';
  doorPurpose: string;
  maxFresh: number;
  body: (lab: EvalLab, ctx: { job: JobContext; door: Door; attestation: string; backend: string }) => Promise<T>;
}

export const withOfficialJob = async <T>(o: JobRun<T>): Promise<T> => {
  let job: JobContext;

  try {
    job = openJob({ study: STUDY_ID, job: o.job, resume: o.resume, identity: o.identity, purpose: 'official-optimization' });
  } catch (e) {
    if (e instanceof JobError) console.error(`JOB-REFUSED ${e.code} ${e.message}`);
    throw e;
  }

  let lab: EvalLab | null = null;

  try {
    const door = await openP5Door(o.door, o.use, o.doorPurpose);
    const domain = riskEnvelopePilotDomain(references().NL0.cfg.d1.VGT);
    const session = await openOfficialGpuSession({
      study: STUDY_ID,
      job,
      purpose: 'official-optimization',
      door,
      domain,
      plannedBatch: execution.batchSize,
      hostWorkers: execution.hostWorkers
    });
    const pool = new GpuPool({
      door,
      session,
      ...poolFilesOf(job),
      batchSize: execution.batchSize,
      lingerMs: execution.lingerMs,
      domainFeatures: domain.features,
      log: (s) => job.log(s)
    });
    const backend = `gpu:${session.info.uuid}:${session.attestation.binary.sha256.slice(0, 16)}:${compatManifest().digest.slice(0, 16)}`;
    const pins = (doorSpecs as Record<string, { pins: Record<string, { sha256: string }> }>)[o.door];
    const doorPin = o.door === 'FULL' ? `GDX:${door.sym.GDX.dataSha256},VGT:${door.sym.VGT.dataSha256}` : `GDX:${pins!.pins.GDX!.sha256},VGT:${pins!.pins.VGT!.sha256}`;

    lab = new EvalLab({
      ...labOptionsOf(job),
      door: o.door,
      doorPin,
      purpose: 'official-optimization',
      pool,
      backend,
      codeDigest: codeDigest(),
      maxFresh: o.maxFresh,
      log: (s) => job.log(s)
    });
    await lab.open();

    const attestation = rel(session.attestationFile);
    const out = await o.body(lab, { job, door, attestation, backend });

    await lab.close('job-end');
    lab = null;
    job.complete({ stage: o.identity.stage as string });
    job.release('complete');
    return out;
  } catch (error) {
    const why = (error as Error).message.split('\n')[0]!.slice(0, 200);

    await lab?.close(error instanceof StopRequested ? `stopped: ${why}` : `failed: ${why}`).catch(() => undefined);
    job.release(`${error instanceof StopRequested ? 'stopped' : 'failed'}: ${why}`);
    throw error;
  }
};

const computeOf = (lab: EvalLab, fresh0: number, hits0: number, t0: number) => ({
  fresh: lab.fresh - fresh0,
  archiveHits: lab.hits - hits0,
  tallies: lab.tallies,
  lab: lab.compute,
  wallSeconds: Math.round((Date.now() - t0) / 100) / 10
});
const expectedOf = (): Expected => readJson<Freeze>(freezeFile).expected;

// ----- lane specs (seed key = lane key in Assignment 3's seed namespace: never a track label, never a later vector) -----

export const replicateOf = (i: number) => firstReplicate + i; // i = 0, 1, …
export const broadSpec = (cut: CutoffKey, cellId: string, r: number): LaneSpec => {
  const key = `${cut}/broad/${cellId}/R${r}`;

  return { key, seedKey: key, position: key, stage: 'broad', replicate: r, cutoff: cut, kind: 'indep', res: 'coarse', cell: cellOf(cellId) };
};
export const informedSpec = (cut: CutoffKey, pair: string, r: number): LaneSpec => {
  const key = `${cut}/informed/${pair}/R${r}`;

  return { key, seedKey: key, position: key, stage: 'informed', replicate: r, cutoff: cut, kind: 'informed', res: 'fine', pair, seeds: projectedSeeds(pair, r - firstReplicate + 1) };
};
const baseBroadReplicates = () => Array.from({ length: replicates.broadBase }, (_v, i) => replicateOf(i));
const baseInformedReplicates = () => Array.from({ length: replicates.informedBase }, (_v, i) => replicateOf(i));
export const partSpecs = (cut: CutoffKey, part: Part): { kind: Kind; specs: LaneSpec[] } => {
  if (part === 'broad1' || part === 'broad2') {
    const cells = part === 'broad1' ? allCells.slice(0, 32) : allCells.slice(32);

    return { kind: 'broad', specs: cells.flatMap((c) => baseBroadReplicates().map((r) => broadSpec(cut, c.id, r))) };
  }
  if (part === 'informed1' || part === 'informed2') {
    if (cut !== 'C24') throw new Error('Track N runs at C24 only');

    const pairs = part === 'informed1' ? allPairs.slice(0, 8) : allPairs.slice(8);

    return { kind: 'informed', specs: pairs.flatMap((p) => baseInformedReplicates().map((r) => informedSpec(cut, p, r))) };
  }

  // the refinement lanes: the sealed plan's cells × the refinement replicates, seeded by the cell's qualified broad members
  const plan = readSealed<{ cells: { cell: string; seeds: string[]; focus: string[] }[] }>(refinePlanFile(cut));
  const broad = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut, 'broad')).evidence;
  const byLabel = new Map(broad.map((e) => [e.label, e]));

  return {
    kind: 'refine',
    specs: plan.cells.flatMap((p) =>
      Array.from({ length: replicates.refine }, (_v, i) => {
        const r = replicateOf(i);
        const key = `${cut}/refine/${p.cell}/R${r}`;
        const seeds: Seed[] = p.seeds.map((label) => ({ label, cfg: canonicalCfg(byLabel.get(label)!.cfg), focus: p.focus.includes(label) }));

        return { key, seedKey: key, position: key, stage: 'refine' as const, replicate: r, cutoff: cut, kind: 'refine' as const, res: 'fine' as const, cell: cellOf(p.cell), seeds };
      })
    )
  };
};

// ----- search parts and replicate rounds -----

const expectedLanes = (kind: Kind, cut: CutoffKey, n: number) => n * (expectedOf().perLane[kind][cutoffs[cut].door] ?? laneCaps[kind]);

const searchJob = async (cut: CutoffKey, name: string, file: string, kind: Kind, specs: LaneSpec[], resume: boolean, extra: Record<string, unknown>) => {
  const g = officialGuards(`search ${cut} ${name}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: that search is complete`);
  foldGuard(cut, `search ${cut} ${name}`);

  const guard = launchGuard(`search ${cut} ${name}`, expectedLanes(kind, cut, specs.length));
  const spec = cutoffs[cut];
  const cap = specs.length * laneCaps[kind];
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-${name}`,
    resume,
    identity: definitionOf('search', { cutoff: cut, part: name, door: spec.door, kind, lanes: specs.map((s) => s.key), schedule: schedules[kind], laneCap: laneCaps[kind] }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official search ${cut} ${name} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(cap, ceilingRequested - ledger().used),
    body: async (lab, ctx) => {
      ctx.job.event('phase', { head: g.head, guard });

      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { results, rounds } = await runLanes(lab, specs, kind, `search ${cut} ${name}`);
      const compute = computeOf(lab, fresh0, hits0, t0);
      const record = {
        stage: 'search',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        part: name,
        kind,
        track: kind === 'informed' ? 'N' : 'F',
        door: spec.door,
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        branch: g.branch,
        lanesCount: specs.length,
        schedule: schedules[kind],
        laneCap: laneCaps[kind],
        cap,
        launch: guard,
        ...extra,
        seeds: kind !== 'broad' ? Object.fromEntries(specs.map((s) => [s.key, s.seeds!.map((x) => ({ label: x.label, id: cfgId(x.cfg), focus: !!x.focus }))])) : null,
        extensionRounds: rounds,
        lanes: results,
        requested: results.reduce((a, r) => a + r.requested, 0),
        compute,
        wallSeconds: compute.wallSeconds,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `search ${cut} ${name}`);
      log(`search ${cut} ${name}: sealed ${rel(file)} (${record.requested} requested, ${compute.fresh} fresh, ${compute.wallSeconds} s)`);
      return record;
    }
  });
};

export const runSearch = async (cut: CutoffKey, part: Part, resume = false) => {
  if (part === 'refine' && !isSealed(refinePlanFile(cut))) throw new Error(`search ${cut} refine: the refinement plan is not sealed`);
  if (part === 'refine' && !isSealed(qualificationFile(cut, 'broad'))) throw new Error(`search ${cut} refine: the broad qualification is not sealed`);
  if ((part === 'broad2') && !isSealed(searchFile(cut, 'broad1'))) throw new Error(`search ${cut} broad2: broad1 first (the frozen order)`);
  if (part === 'informed1' && !isSealed(qualificationFile(cut, 'refine'))) throw new Error('Track N runs after Track F’s refinement qualification at C24 (the frozen order)');
  if (part === 'informed2' && !isSealed(searchFile(cut, 'informed1'))) throw new Error('informed2 after informed1');

  const { kind, specs } = partSpecs(cut, part);

  return searchJob(cut, part, searchFile(cut, part), kind, specs, resume, {});
};

// the lanes of a track at a cutoff so far (base parts + sealed replicate rounds), in replicate order
export const trackLanes = (cut: CutoffKey, track: 'F' | 'N') => {
  const parts = track === 'F' ? ['broad1', 'broad2'] : ['informed1', 'informed2'];
  const out: LaneResult[] = [];

  for (const p of parts) out.push(...readSealed<{ lanes: LaneResult[] }>(searchFile(cut, p)).lanes);
  for (let k = 1; k <= replicates.maxRounds; k++) {
    const f = roundSearchFile(cut, track, k);

    if (!fs.existsSync(f)) break;
    out.push(...readSealed<{ lanes: LaneResult[] }>(f).lanes);
  }
  return out;
};

export const runRound = async (cut: CutoffKey, track: 'F' | 'N', k: number, resume = false) => {
  const file = roundFile(cut, track, k);

  if (fs.existsSync(file) && !resume) throw new Error(`${rel(file)} exists`);
  if (k < 1 || k > replicates.maxRounds) throw new Error(`--k 1…${replicates.maxRounds}`);
  if (k > 1) {
    const prev = readSealed<{ fired: boolean }>(roundFile(cut, track, k - 1));

    if (!prev.fired) throw new Error(`round ${k}: round ${k - 1} did not fire (the track's replicate rounds have stopped)`);
    if (!isSealed(roundSearchFile(cut, track, k - 1))) throw new Error(`round ${k}: round ${k - 1}'s lanes are not sealed`);
  }

  const parts = track === 'F' ? ['broad1', 'broad2'] : ['informed1', 'informed2'];

  for (const p of parts) if (!isSealed(searchFile(cut, p))) throw new Error(`round ${k}: ${p} is not sealed`);
  if (fs.existsSync(qualificationFile(cut, track === 'F' ? 'broad' : 'informed'))) throw new Error(`round ${k}: the track is already qualified`);

  const lanes = trackLanes(cut, track);
  const lastReplicate = Math.max(...lanes.map((l) => l.replicate));
  const before = unionState(lanes.filter((l) => l.replicate < lastReplicate), track);
  const after = unionState(lanes, track);
  const t = roundTrigger(before, after, replicates.roundThreshold);
  const nextReplicate = lastReplicate + 1;

  if (!fs.existsSync(file)) {
    officialGuards(`round ${cut} ${track} ${k}`);
    seal(
      file,
      {
        stage: 'replicate round decision',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        track,
        k,
        rule: `one more replicate of every ${track === 'F' ? 'cell' : 'family pair'} iff the last replicate (R${lastReplicate}) raised the union hypervolume, best robust net or best centre net of the track's feasible rung-3 and shortlist fits by > ${replicates.roundThreshold * 100} % or gave a structure its first feasible fit`,
        lastReplicate,
        before,
        after,
        trigger: t,
        fired: t.fired,
        nextReplicate: t.fired ? nextReplicate : null,
        stop: t.fired ? null : 'replicate triggers not met (the track converged across seeds by the frozen 2 % rule)',
        finished: new Date().toISOString()
      },
      `round decision ${cut} ${track} ${k}`
    );
    log(`round ${cut} ${track} ${k}: ${t.fired ? `fires → R${nextReplicate}` : 'does not fire'} (${JSON.stringify(t)})`);
  }

  if (!readSealed<{ fired: boolean }>(file).fired) return null;

  const specs =
    track === 'F'
      ? allCells.map((c) => broadSpec(cut, c.id, nextReplicate))
      : allPairs.map((p) => informedSpec(cut, p, nextReplicate));

  return searchJob(cut, `${track === 'F' ? 'rx' : 'nrx'}${k}`, roundSearchFile(cut, track, k), track === 'F' ? 'broad' : 'informed', specs, resume, { round: k, replicate: nextReplicate });
};

// the round decision state of a track (operational; reports and the chain read it)
export const roundsOf = (cut: CutoffKey, track: 'F' | 'N') => {
  const out: { k: number; fired: boolean }[] = [];

  for (let k = 1; k <= replicates.maxRounds; k++) {
    const f = roundFile(cut, track, k);

    if (!fs.existsSync(f)) break;
    out.push({ k, fired: readSealed<{ fired: boolean }>(f).fired });
  }
  return out;
};
const roundsComplete = (cut: CutoffKey, track: 'F' | 'N') => {
  const r = roundsOf(cut, track);

  if (!r.length) return false;

  const last = r.at(-1)!;

  if (!last.fired) return true;
  return last.k === replicates.maxRounds && isSealed(roundSearchFile(cut, track, last.k));
};

// ----- qualification -----

const controlLabel = (key: 'NORIG' | 'NL0') => `control: ${references()[key].label}`;
export const controlMembers = (): QMember[] =>
  (['NORIG', 'NL0'] as const).map((key) => ({
    label: controlLabel(key),
    lane: 'control',
    stage: 'control',
    track: 'control',
    replicate: null,
    cfg: references()[key].cfg,
    pick: `${references()[key].label} (frozen reference: ${references()[key].source}; descriptive control, never a Track F member)`,
    sources: [{ track: 'control', label: controlLabel(key), lane: 'control', pick: references()[key].label }]
  }));

const membersOfLanes = (lanes: readonly LaneResult[], track: 'F' | 'N'): QMember[] =>
  lanes.flatMap((l) =>
    l.shortlist.map((p, i) => {
      const label = `${l.key}#${i + 1} ${p.pick}`;

      return {
        label,
        lane: l.key,
        stage: l.stage,
        track,
        replicate: l.replicate,
        cfg: canonicalCfg(p.cfg),
        pick: p.pick,
        sources: [{ track, label, lane: l.key, pick: p.pick }]
      };
    })
  );

export const membersOf = (cut: CutoffKey, stage: QStage) => {
  let members: QMember[] =
    stage === 'broad'
      ? [...membersOfLanes(trackLanes(cut, 'F'), 'F'), ...controlMembers()]
      : stage === 'refine'
        ? membersOfLanes(readSealed<{ lanes: LaneResult[] }>(searchFile(cut, 'refine')).lanes, 'F')
        : membersOfLanes(trackLanes(cut, 'N'), 'N');
  const duplicates: { label: string; sameAs: string }[] = [];
  const copied: Evidence[] = [];

  for (const m of members) if (cellOfControls(m.cfg.controls) !== m.cfg.cell) throw new Error(`${m.label}: its controls express ${cellOfControls(m.cfg.controls)}`);

  if (stage !== 'broad') {
    // a configuration identical to one already qualified at this cutoff keeps that evidence (the same draws): within
    // Track F it is dropped; a Track N member identical to a Track F member or a control gets a copy under its own label
    const earlier = (stage === 'refine' ? ['broad'] : ['broad', 'refine']).flatMap((s) => readSealed<{ evidence: Evidence[] }>(qualificationFile(cut, s as QStage)).evidence);
    const byId = new Map<string, Evidence>();

    for (const e of earlier) if (!byId.has(e.id)) byId.set(e.id, e);
    members = members.filter((m) => {
      const same = byId.get(cfgId(m.cfg));

      if (!same) return true;
      duplicates.push({ label: m.label, sameAs: same.label });
      // a Track N lane that re-shortlists a frozen reference is represented by the labelled incumbent row below
      if (stage === 'informed' && same.track !== 'control')
        copied.push({ ...same, label: m.label, lane: m.lane, stage: m.stage, track: m.track, pick: m.pick, replicate: m.replicate, sources: m.sources });
      return false;
    });
    // the incumbents of Track N (the qualifying-incumbent rule): copies of the C24 control evidence
    if (stage === 'informed')
      for (const key of ['NORIG', 'NL0'] as const) {
        const ctl = byId.get(references()[key].id);

        if (!ctl) throw new Error(`the C24 control evidence of ${references()[key].label} is missing`);

        const label = `incumbent: ${references()[key].label}`;

        copied.push({ ...ctl, label, lane: 'incumbent', stage: 'incumbent', track: 'N', pick: `${references()[key].label} (the qualifying-incumbent rule, standard §3.2; incumbent-informed)`, replicate: null, sources: [{ track: 'N', label, lane: 'incumbent', pick: references()[key].label }] });
      }
  }

  // one member per configuration within the stage (lanes can shortlist the same configuration): sources merged
  const seen = new Map<string, QMember>();

  members = members.filter((m) => {
    const id = cfgId(m.cfg);
    const same = seen.get(id);

    if (same) {
      duplicates.push({ label: m.label, sameAs: same.label });
      same.sources.push(...m.sources);
      return false;
    }
    seen.set(id, m);
    return true;
  });

  return { members, duplicates, copied };
};

export const runQualify = async (cut: CutoffKey, stage: QStage, resume = false) => {
  const file = qualificationFile(cut, stage);
  const g = officialGuards(`qualify ${cut} ${stage}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  foldGuard(cut, `qualify ${cut} ${stage}`);
  if (stage === 'informed' && cut !== 'C24') throw new Error('Track N is qualified at C24 only');
  if (stage === 'broad' && !roundsComplete(cut, 'F')) throw new Error(`qualify ${cut} broad: Track F's replicate rounds are not complete`);
  if (stage === 'refine' && !isSealed(searchFile(cut, 'refine'))) throw new Error(`qualify ${cut} refine: the refinement search is not sealed`);
  if (stage === 'informed' && !roundsComplete(cut, 'N')) throw new Error("qualify C24 informed: Track N's replicate rounds are not complete");

  const { members, duplicates, copied } = membersOf(cut, stage);
  const spec = cutoffs[cut];
  const guard = launchGuard(`qualify ${cut} ${stage}`, members.length * expectedOf().perMember);
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-qualify-${stage}`,
    resume,
    identity: definitionOf('qualify', { cutoff: cut, qualificationStage: stage, door: spec.door, members: members.map((m) => ({ label: m.label, id: cfgId(m.cfg) })) }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official qualification ${cut} ${stage} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(members.length * perMemberCap(), ceilingRequested - ledger().used),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { evidence, requested } = await qualifyMembers(lab, members, cut);

      if (requested > members.length * perMemberCap()) throw new Error(`qualify ${cut} ${stage}: ${requested} requested > the bound`);
      fs.mkdirSync(lotRowsDir, { recursive: true });
      fs.writeFileSync(path.join(lotRowsDir, `${cut}-${stage}.json`), JSON.stringify(evidence.map((e) => ({ label: e.label, rows: e.risk.rows }))));

      const all = [...evidence, ...copied];
      const byCell: Record<string, { members: number; qualified: number; failed: Record<string, number> }> = {};

      for (const e of all.filter((x) => x.track !== 'control')) {
        const c = (byCell[e.cell] ??= { members: 0, qualified: 0, failed: {} });

        c.members++;
        if (e.qualified) c.qualified++;
        for (const f of e.failed) c.failed[f] = (c.failed[f] ?? 0) + 1;
      }

      const record = {
        stage: 'qualification',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        qualificationStage: stage,
        door: spec.door,
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        launch: guard,
        members: all.length,
        evaluatedMembers: members.length,
        copiedEvidence: copied.length,
        qualified: all.filter((e) => e.qualified && e.track !== 'control').length,
        duplicates,
        byCell,
        evidence: all.map(sealedEvidence),
        requested,
        compute: computeOf(lab, fresh0, hits0, t0),
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `qualify ${cut} ${stage}`);
      log(`qualify ${cut} ${stage}: ${record.qualified} of ${record.members} qualified; sealed`);
      return record;
    }
  });
};

// ----- the refinement plan (frozen rule select.ts refineCells; no evaluation) -----

export const runRefinePlan = (cut: CutoffKey) => {
  const file = refinePlanFile(cut);

  officialGuards(`refine-plan ${cut}`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);

  const evidence = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut, 'broad')).evidence.filter((e) => e.track === 'F');
  const plan = refineCells(evidence);

  seal(file, { stage: 'refinement plan', protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`, cutoff: cut, rule: 'select.ts refineCells (PROTOCOL.md §7.2)', ...plan, finished: new Date().toISOString() }, `refine plan ${cut}`);
  log(`refinement plan ${cut}: ${plan.cells.length} cells (${plan.eligible} eligible)`);
  return plan;
};

// ----- the selection (no evaluation): every population, NL0's original rule and roles; committed before the slice -----

export const qStagesOf = (cut: CutoffKey): QStage[] => (cut === 'C24' ? ['broad', 'refine', 'informed'] : ['broad', 'refine']);
export const evidenceOf = (cut: CutoffKey): Evidence[] => {
  const out: Evidence[] = [];
  const seen = new Set<string>();

  for (const st of qStagesOf(cut))
    for (const e of readSealed<{ evidence: Evidence[] }>(qualificationFile(cut, st)).evidence)
      if (!seen.has(e.label)) {
        seen.add(e.label);
        out.push(e);
      }
  return out;
};
export const populationsOf = (cut: CutoffKey): PopulationName[] => (cut === 'C24' ? finalPopulations : foldPopulations);

export const runSelect = (cut: CutoffKey) => {
  const file = selectionFile(cut);

  officialGuards(`select ${cut}`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  for (const st of qStagesOf(cut)) assertCommitted(qualificationFile(cut, st));

  const all = evidenceOf(cut);
  const candidates = all.filter((e) => e.track !== 'control');
  const pops = populationsOf(cut);
  const primaries: Record<string, string | null> = {};
  const rankings: Record<string, ReturnType<typeof selectionSummary>[]> = {};
  const roles: Record<string, ReturnType<typeof rolesOf>> = {};

  for (const p of pops) {
    const pop = candidates.filter(populations[p]);
    const order = originalOrder(pop);

    primaries[p] = order[0]?.qualified ? order[0].label : null;
    rankings[p] = order.slice(0, 10).map(selectionSummary);
    roles[p] = rolesOf(`population ${p}`, pop);
  }

  // the slice / validation subjects: every population's primary and roles, and the two frozen references (controls)
  const subjectLabels = [...new Set([...Object.values(primaries), ...Object.values(roles).flatMap((r) => Object.values(r.roles))].filter((l): l is string => Boolean(l)))];
  const controls = all.filter((e) => e.track === 'control');
  const record: Record<string, unknown> = {
    stage: 'selection',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    cutoff: cut,
    rule: 'NL0 1.0.0 §3.5 original rule: the actual-profit role among the Q1–Q6 qualified members (highest centre net; ties: higher selection robust net, lower centre DD, label)',
    qualification: qStagesOf(cut).map((st) => ({ file: rel(qualificationFile(cut, st)), sha256: sha256File(qualificationFile(cut, st)) })),
    populations: Object.fromEntries(pops.map((p) => [p, populationLabel[p]])),
    counts: Object.fromEntries(pops.map((p) => [p, { members: candidates.filter(populations[p]).length, qualified: candidates.filter(populations[p]).filter((e) => e.qualified).length }])),
    primaries,
    rankings,
    roles,
    subjects: subjectLabels.map((l) => sealedEvidence(candidates.find((e) => e.label === l)!)),
    controls: controls.map(sealedEvidence),
    finished: new Date().toISOString()
  };

  if (cut === 'C24') {
    const seq = readSealed<{ procedures: { population: string; verdict: string; supported: boolean }[] }>(sequentialFile);

    record.finalists = finalistsOf(candidates, primaries, roles);
    record.successor = successorPreDetermination(record.finalists as ReturnType<typeof finalistsOf>, candidates, controls, seq);
  }

  seal(file, record, `selection ${cut}`);
  log(`selection ${cut}: ${JSON.stringify(primaries)}`);
  return record;
};

// ----- the slice evaluation (C19 → D21, C21 → D23, C23 → D24) and the validation (C24 → FULL, once) -----

type Subject = { label: string; id: string; roles: string[]; kind: 'selected' | 'control'; cfg: Cfg; selectBreachShare: number };

const subjectsOf = (cut: CutoffKey): Subject[] => {
  const sel = readSealed<{ primaries: Record<string, string | null>; roles: Record<string, { roles: Record<string, string | null> }>; subjects: Evidence[]; controls: Evidence[]; finalists?: { label: string }[] }>(selectionFile(cut));
  const out = new Map<string, Subject>();
  const add = (e: Evidence, role: string, kind: Subject['kind']) => {
    const s = out.get(e.id);

    if (s) s.roles.push(role);
    else out.set(e.id, { label: e.label, id: e.id, roles: [role], kind, cfg: canonicalCfg(e.cfg), selectBreachShare: e.selectTail.breachShare });
  };
  const byLabel = new Map(sel.subjects.map((e) => [e.label, e]));

  for (const [p, l] of Object.entries(sel.primaries)) if (l) add(byLabel.get(l)!, `primary ${p}/original`, 'selected');
  for (const [p, r] of Object.entries(sel.roles)) for (const [role, l] of Object.entries(r.roles)) if (l) add(byLabel.get(l)!, `role ${p}/${role}`, 'selected');
  if (sel.finalists)
    for (const f of sel.finalists) {
      const e = byLabel.get(f.label) ?? sel.subjects.find((x) => x.label === f.label);

      if (e) add(e, 'finalist', 'selected');
    }
  for (const c of sel.controls) add(c, `control ${c.label}`, 'control');
  return [...out.values()];
};

const sessionsAfter = (door: Door, end: string) => door.dates.filter((d) => d > end);
const chunks = <T>(xs: readonly T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_v, i) => xs.slice(i * n, i * n + n));

export const runSlice = async (cut: CutoffKey, resume = false) => {
  const file = sliceFile(cut);
  const spec = cutoffs[cut];
  const isValidation = cut === 'C24';
  const g = officialGuards(`${isValidation ? 'validate' : 'slice'} ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: sealed`);
  assertCommitted(selectionFile(cut));
  if (isValidation) {
    assertCommitted(frozenSelectionFile);
    assertCommitted(fullAuthorizationFile);
  }

  const subjects = subjectsOf(cut);
  const guard = launchGuard(`slice ${cut}`, subjects.length * expectedOf().perSubject);
  const opts = { ...vOptions, boundaries: [spec.end] };
  const t0 = Date.now();

  return withOfficialJob({
    job: isValidation ? 'C24-validation' : `${cut}-slice`,
    resume,
    identity: definitionOf(isValidation ? 'validation' : 'slice', { cutoff: cut, door: spec.sliceDoor, slice: spec.slice, boundary: spec.end, subjects: subjects.map((s) => s.id) }),
    door: spec.sliceDoor,
    use: isValidation ? 'validation' : 'slice',
    doorPurpose: `official ${isValidation ? 'validation' : 'slice'} ${cut} → ${spec.slice.join('…')} (${PROTOCOL_ID})`,
    maxFresh: Math.min(subjects.length * perSubject(), ceilingRequested - ledger().used),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const dates = sessionsAfter(ctx.door, spec.end);

      if (dates[0] !== spec.slice[0] || dates.at(-1) !== spec.slice[1]) throw new Error(`${cut}: the slice door spans ${dates[0]}…${dates.at(-1)}, not ${spec.slice.join('…')}`);

      type It = { cfg: Cfg; options: typeof vOptions; detail?: boolean; risk?: true };
      const closeChunks = isValidation ? [] : chunks(dates, 16);
      const plans = subjects.map((s) => {
        const draws = [1, 2].flatMap((rep) => drawsOf(s.cfg, famOf('select', ['select', rep, cut], 'joint', 1, fidelity.n)));
        const seen = new Set<string>();
        const unique = draws.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
        const items: It[] = [
          { cfg: s.cfg, options: opts, detail: true, risk: true },
          { cfg: s.cfg, options: opts, risk: true },
          ...Object.values(stresses).map((f) => ({ cfg: s.cfg, options: { ...opts, friction: { ...f } }, risk: true as const })),
          ...unique.map((d) => ({ cfg: d.cfg, options: opts, risk: true as const })),
          ...closeChunks.map((c) => ({ cfg: s.cfg, options: { ...vOptions, boundaries: c } }))
        ];

        return { s, unique, items };
      });
      const items = plans.flatMap((p) => p.items);

      if (items.length > subjects.length * perSubject()) throw new Error(`${cut}: ${items.length} requested > the bound`);

      const recs = await lab.evalMany<SRec>(items, `${isValidation ? 'validation' : 'slice'} ${cut}`);
      let at = 0;
      const rows = plans.map((p) => {
        const detail = recs[at++]! as DRec;
        const centre = recs[at++]!;
        const st: Record<string, { sliceNet: number; sliceDd: number; wholeNet: number; wholeDd: number }> = {};

        for (const name of Object.keys(stresses)) {
          const r = recs[at++]!;

          st[name] = { sliceNet: r.periods[0]!.after, sliceDd: r.periods[0]!.dd, wholeNet: r.net, wholeDd: r.dd };
        }

        const nb = p.unique.map(() => recs[at++]!);
        const closes: { date: string; equity: number }[] = [];

        for (const c of closeChunks) {
          const r = recs[at++]!;

          if (r.periods.length !== c.length) throw new Error(`${p.s.label}: ${r.periods.length} periods for ${c.length} boundaries`);
          r.periods.forEach((x, i) => {
            if (x.boundary !== c[i]) throw new Error(`${p.s.label}: period ${x.boundary} ≠ ${c[i]}`);
            closes.push({ date: x.boundary, equity: x.equity });
          });
          if (r.net !== centre.net || r.signature !== centre.signature) throw new Error(`${p.s.label}: a close-series run differs from the centre`);
        }

        if (centre.net !== detail.net || centre.signature !== detail.signature) throw new Error(`${p.s.label}: detailed centre differs`);

        const period = centre.periods[0]!;
        const lots = detail.risk.rows;
        const after = (d: string) => d > spec.end;
        const nextLots = lots.filter((x) => after(x.entry));
        const carried = lots.filter((x) => !after(x.entry) && (x.exit === null || after(x.exit)));
        const maes = nextLots.map((x) => x.mae).sort((a, c) => a - c);
        const env = checkEnvelope((centre as SRec & { envelope?: unknown }).envelope, `${p.s.label} centre`);
        const sliceDds = nb.map((r) => r.periods[0]!.dd).sort((a, c) => a - c);
        const sliceNets = nb.map((r) => r.periods[0]!.after).sort((a, c) => a - c);
        const k = sliceDds.filter((d) => d > ceiling).length;
        const row: SliceRow & Record<string, unknown> = {
          label: p.s.label,
          id: p.s.id,
          kind: p.s.kind,
          roles: p.s.roles,
          cell: p.s.cfg.cell,
          boundary: spec.end,
          boundaryEquity: period.equity,
          sliceNet: period.after,
          sliceDd: period.dd,
          wholeNet: centre.net,
          wholeDd: centre.dd,
          wholeEnvelope: env,
          years: centre.years,
          lotsCount: centre.lots,
          closes,
          lots: lots.map((x) => ({ book: x.book, entry: x.entry, exit: x.exit, net: x.net, mae: x.mae, maeAt: x.maeAt, reason: x.reason, days: x.days })),
          openAtBoundary: carried.map((x) => ({ book: x.book, entry: x.entry, exit: x.exit, reason: x.reason, net: x.net, mae: x.mae })),
          nextSlice: {
            lots: nextLots.length,
            byBook: Object.fromEntries(['D1:GDX', 'D1:VGT', 'G:VGT'].map((bk) => [bk, nextLots.filter((x) => x.book === bk).length])),
            worstLotMae: maes.length ? maes[0]! : null,
            maeMedian: maes.length ? r2(quantile(maes, 0.5)) : null,
            worstRealized: nextLots.filter((x) => x.exit !== null).reduce<number | null>((a, x) => (a === null || x.net < a ? x.net : a), null),
            losing: nextLots.filter((x) => x.exit !== null && x.net < 0).length,
            exitReasons: nextLots.reduce<Record<string, number>>((a, x) => ((a[x.reason] = (a[x.reason] ?? 0) + 1), a), {})
          },
          stresses: st,
          neighbourhood: {
            draws: p.unique.length,
            medianSliceDd: r2(quantile(sliceDds, 0.5)),
            p90SliceDd: r2(quantile(sliceDds, 0.9)),
            worstSliceDd: r2(sliceDds.at(-1) ?? 0),
            medianSliceNet: r2(quantile(sliceNets, 0.5)),
            p10SliceNet: r2(quantile(sliceNets, 0.1)),
            breaches: k,
            breachShare: k / Math.max(1, sliceDds.length),
            wilson95: wilson(k, sliceDds.length),
            trainingBreachShare: p.s.selectBreachShare
          },
          validation: isValidation ? { V1: period.after > 0, V2: period.dd <= ceiling, V3: centre.dd <= ceiling } : undefined
        };

        return row;
      });
      const record = {
        stage: isValidation ? 'validation' : 'slice',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        door: spec.sliceDoor,
        slice: spec.slice,
        boundary: spec.end,
        basis:
          'one continuous run from 2016-01-04 (state, open lots and marks preserved); slice P&L = the change of the marked net from the boundary close; slice DD = the strict minute tracker restarted at the boundary close; whole-run figures beside it; session-close equities from 16-boundary period evaluations of the same run',
        label: 'retrospective, previously examined history — never a pristine holdout or independent future validation',
        selection: { file: rel(selectionFile(cut)), sha256: sha256File(selectionFile(cut)) },
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        launch: guard,
        requested: items.length,
        rows,
        compute: computeOf(lab, fresh0, hits0, t0),
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `${isValidation ? 'validation' : 'slice'} ${cut}`);
      log(`${isValidation ? 'validation' : 'slice'} ${cut}: ${rows.length} rows sealed (${items.length} requested)`);
      return record;
    }
  });
};

// ----- the sequential paths and their frozen verdicts (no evaluation) -----

export const runSequential = () => {
  officialGuards('sequential');
  if (fs.existsSync(sequentialFile)) throw new Error('the sequential record exists');

  const slices = foldKeys.map((c) => {
    assertCommitted(sliceFile(c));
    return readSealed<{ rows: (SliceRow & { roles: string[]; kind: string })[] }>(sliceFile(c));
  });
  const sels = foldKeys.map((c) => readSealed<{ primaries: Record<string, string | null> }>(selectionFile(c)));
  const rowOf = (i: number, label: string | null) => (label ? slices[i]!.rows.find((r) => r.label === label) ?? null : null);
  const pathOf = (name: string, pick: (i: number) => string | null) => {
    const labels = foldKeys.map((_c, i) => pick(i));
    const c = chain(foldKeys, labels.map((l, i) => rowOf(i, l)));

    return { name, labels, ...c, verdict: verdictOf(foldKeys, labels, c), supported: verdictOf(foldKeys, labels, c).startsWith('supported') };
  };
  const procedures = foldPopulations.map((p) => ({ population: p, independent: true, nominating: p === 'F', ...pathOf(`${p}/original`, (i) => sels[i]!.primaries[p] ?? null) }));
  const roleLabel = (i: number, role: string) => slices[i]!.rows.find((r) => r.roles.includes(role))?.label ?? null;
  const descriptive = [
    ...['robust-profit', 'balanced', 'lower-drawdown'].map((role) => pathOf(`F: role ${role} (descriptive)`, (i) => roleLabel(i, `role F/${role}`))),
    ...(['NORIG', 'NL0'] as const).map((k) => pathOf(`${references()[k].label}, fixed (descriptive: chosen with later data)`, (i) => roleLabel(i, `control ${controlLabel(k)}`)))
  ];
  const record = {
    stage: 'sequential',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    folds: foldKeys.map((c, i) => ({ fold: c, slice: cutoffs[c].slice, primaries: sels[i]!.primaries, slice_record: { file: rel(sliceFile(c)), sha256: sha256File(sliceFile(c)) } })),
    switchCharge: '5 bps of $100,000 per open lot closed or adopted at a switch',
    drawdown:
      'PROTOCOL.md §11.2 (adaptation AD4): the strict drawdown of the chain over every exactly observed GPU mark — each slice’s minute reset drawdown, every session close, every lot’s exact minute minimum',
    verdictRule: 'supported iff every fold produced a primary, the sequential net > 0 and the sequential drawdown ≤ $35,000',
    procedures,
    descriptive,
    scope:
      'F/original is THE independent procedure (a frozen, INDEPENDENT chronological test of the full joint search-and-selection procedure: every phenotype searched fresh at every cutoff from that cutoff’s door only); L and B are report-only secondary procedures; roles and the fixed references are descriptive; Track N has no chronological test (C24 only)',
    finished: new Date().toISOString()
  };

  seal(sequentialFile, record, 'sequential');
  for (const p of procedures) log(`sequential ${p.population}/original: ${p.verdict}; net ${r2(p.net)}, DD ${r2(p.drawdown)}`);
  return record;
};

// ----- the frozen selection, the FULL authorization and the outcome -----

export const runFreezeSelection = () => {
  officialGuards('freeze-selection');
  if (fs.existsSync(frozenSelectionFile)) throw new Error('FROZEN_SELECTION.json exists');
  for (const c of cutoffKeys) assertCommitted(selectionFile(c));
  for (const c of foldKeys) assertCommitted(sliceFile(c));
  assertCommitted(sequentialFile);

  const sel = readSealed<{ primaries: Record<string, string | null>; finalists: unknown; successor: unknown }>(selectionFile('C24'));
  const record = {
    kind: 'P5-NS frozen selection',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    frozenAt: new Date().toISOString(),
    head: headCommit(),
    codeDigest: codeDigest(),
    selections: cutoffKeys.map((c) => ({ cutoff: c, file: rel(selectionFile(c)), sha256: sha256File(selectionFile(c)) })),
    slices: foldKeys.map((c) => ({ cutoff: c, file: rel(sliceFile(c)), sha256: sha256File(sliceFile(c)) })),
    sequential: { file: rel(sequentialFile), sha256: sha256File(sequentialFile) },
    primaries: sel.primaries,
    finalists: sel.finalists,
    successorPreDetermination: sel.successor,
    validationPlan: {
      door: 'FULL',
      slice: cutoffs.C24.slice,
      boundary: cutoffs.C24.end,
      subjects: 'every C24 primary, role and finalist of selection/C24.json and the two frozen references (controls)',
      evaluations: 'per subject: the detailed centre and the centre with the 2024-12-31 boundary, the frozen stresses, the selection family 2 × 128 regenerated exactly — every one with the risk envelope',
      tests: 'V1 validation P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000',
      once: true,
      label: 'retrospective, previously examined history (2025–2026 examined by many studies); never a pristine holdout; no validation-driven iteration'
    }
  };

  seal(frozenSelectionFile, record, 'frozen selection');
  return record;
};

export const runAuthorizeFull = () => {
  officialGuards('authorize-full');
  if (fs.existsSync(fullAuthorizationFile)) throw new Error('the FULL authorization exists');
  for (const f of [selectionFile('C24'), frozenSelectionFile]) assertCommitted(f);

  const record = {
    kind: 'FULL door authorization',
    t: new Date().toISOString(),
    head: headCommit(),
    authority: 'brief §3.4 ("2025–2026 … Open it only after the final selections, ranks, risk criteria and code/data identifiers have been sealed and committed. Evaluate it once for the final frozen slate")',
    frozenSelection: { file: rel(frozenSelectionFile), sha256: sha256File(frozenSelectionFile) },
    c24Selection: { file: rel(selectionFile('C24')), sha256: sha256File(selectionFile('C24')) },
    once: 'the official validation job opens FULL once; afterwards only report-only diagnostics of the same frozen subjects'
  };

  seal(fullAuthorizationFile, record, 'FULL authorization');
  return record;
};

export const runOutcome = async () => {
  const { outcomeOf } = await import('./successor.ts');

  officialGuards('outcome');
  if (fs.existsSync(outcomeFile)) throw new Error('the outcome exists');
  assertCommitted(sliceFile('C24'));

  const fz = readSealed<{ successorPreDetermination: unknown }>(frozenSelectionFile);
  const v = readSealed<{ rows: { label: string; id: string; validation: { V1: boolean; V2: boolean; V3: boolean } }[] }>(sliceFile('C24'));
  const record = {
    stage: 'outcome',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    frozenSelection: { file: rel(frozenSelectionFile), sha256: sha256File(frozenSelectionFile) },
    validation: { file: rel(sliceFile('C24')), sha256: sha256File(sliceFile('C24')) },
    ...outcomeOf(fz.successorPreDetermination as never, v.rows),
    finished: new Date().toISOString()
  };

  seal(outcomeFile, record, 'outcome');
  return record;
};
