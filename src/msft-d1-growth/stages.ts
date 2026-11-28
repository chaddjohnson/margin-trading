// P9-MSFT's stages (PROTOCOL.md §14), each OFFICIAL evaluating stage a GPU job of its own (src/gpu-jobs/jobs.ts openJob →
// src/gpu-backend/official.ts openOfficialGpuSession → GpuPool → EvalLab; no CPU path), each writing one sealed record.
// Priority 5's stages.ts with this study's arms. Per cutoff, strictly C19 → C21 → C23 → C24, and within a cutoff the arms
// in the frozen order D → G → C → J → S:
//
//   search  --cutoff C --arm A --part broad           the arm's base broad lanes (cells × base replicates)
//   round   --cutoff C --arm A --k k                  the k-th replicate round's decision (and its lanes if it fires)
//   qualify --cutoff C --arm A --stage broad|refine    shortlists (+ the external controls at broad, arms D, G, J)
//   refine-plan --cutoff C --arm A                     the frozen stage-2 plan (no evaluation)
//   search  --cutoff C --arm A --part refine           the refinement lanes
//   select-arm --cutoff C --arm A                      the arm's selection (no evaluation)
//   freeze-d1 --cutoff C                               arm S's frozen D1 finalists from arm D's selection (no evaluation)
//   pairs   --cutoff C                                 arm C's pairs of the D and G finalists (no evaluation)
//   qualify --cutoff C --arm C --stage fixed           the pairs (no search)
//   select  --cutoff C                                 (no evaluation) every arm; sealed AND COMMITTED before the slice
//   slice   --cutoff C19|C21|C23                       the fold evaluation on the next slice (D21 / D23 / D24)
//   sequential                                          (no evaluation; after C23's slice; committed before D24 training)
//   freeze-selection, authorize-full                    (no evaluation; after the C24 selection)
//   validate                                            C24 → 2025-01-02 … 2026-10-30 on FULL, once
//   outcome                                             (no evaluation) the precommitted determination (outcome.ts)
//
// Guards of every official stage: the study preflight, the sealed and committed protocol freeze with the frozen code
// digest (or a sealed code amendment chained from it), the sealed engineering gates, the acceptance record the freeze
// pinned, no uncommitted change to the code closure or the protocol documents, the fold order, the arm order, the door
// guards (doors.ts), the study ledger and the disk reserve. A stage whose record exists refuses to rerun; an interrupted
// job resumes from its archive (the same command with --resume).
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { openOfficialGpuSession } from '../gpu-backend/official.ts';
import { GpuPool } from '../gpu-backend/pool.ts';
import { EvalLab, StopRequested, checkEnvelope } from '../gpu-backend/lab.ts';
import { compatManifest } from '../gpu-backend/compat.ts';
import { riskEnvelopePilotDomain } from '../gpu-backend/domain.ts';
import { type JobContext, JobError, labOptionsOf, openJob, poolFilesOf } from '../gpu-jobs/jobs.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { wilson } from '../vg-d1-growth-diagnostic/risk.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { fidelity } from '../vg-l0-risk-families/qualify.ts';
import type { DRec, SRec } from '../vg-l0-full-joint/evaluate.ts';
import { references } from '../vg-l0-n-successor/incumbents.ts';
import { type SliceRow, chain, verdictOf } from '../vg-l0-n-successor/sequential.ts';
import type { LaneResult, LaneSpec, Seed } from './search.ts';
import {
  type ArmKey,
  type CutoffKey,
  type DoorName,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  STUDY_ID,
  armName,
  armOptions,
  armPolicy,
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
  perSubject,
  replicates,
  schedules,
  sequentialReplicates
} from './budget.ts';
import { runLanes, roundTrigger, unionState } from './lanes.ts';
import { controlMembers } from './controls.ts';
import { type Evidence, type Member, drawsOf, famOf, perMember, qualifyMembers, sealedEvidence, stresses } from './qualify.ts';
import {
  type PopulationName,
  armPopulations,
  originalOrder,
  pairSides,
  populationLabel,
  populations,
  ra1Order,
  refineCells,
  rolesOf,
  selectionSummary,
  sequentialFinalists,
  subPopulations
} from './select.ts';
import {
  type Cfg,
  type FrozenD1,
  canonicalCfg,
  cellOf,
  cellsOfArm,
  cfgId,
  frozenFrom,
  pairCfg,
  registerFrozen,
  sequentialCells
} from './space.ts';
import {
  fullAuthorizationFile,
  frozenSelectionFile,
  openMsftDoor,
  readPins,
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

export type SearchArm = Exclude<ArmKey, 'C'>;
export const armOrder: readonly ArmKey[] = ['D', 'G', 'C', 'J', 'S'];

// ----- files -----

export const searchFile = (cut: CutoffKey, arm: SearchArm, part: string) => path.join(resultsDir, 'search', cut, `${arm}-${part}.json`);
export const roundFile = (cut: CutoffKey, arm: SearchArm, k: number) => path.join(resultsDir, 'rounds', cut, `${arm}-${k}.json`);
export const roundSearchFile = (cut: CutoffKey, arm: SearchArm, k: number) => searchFile(cut, arm, `rx${k}`);
export type QStage = 'broad' | 'refine' | 'fixed';
export const qualificationFile = (cut: CutoffKey, arm: ArmKey, stage: QStage) => path.join(resultsDir, 'qualification', cut, `${arm}-${stage}.json`);
export const refinePlanFile = (cut: CutoffKey, arm: SearchArm) => path.join(resultsDir, 'refine-plan', cut, `${arm}.json`);
export const frozenD1File = (cut: CutoffKey) => path.join(resultsDir, 'frozen-d1', `${cut}.json`);
export const pairsFile = (cut: CutoffKey) => path.join(resultsDir, 'pairs', `${cut}.json`);
export const armSelectionFile = (cut: CutoffKey, arm: ArmKey) => path.join(resultsDir, 'selection', `${cut}-${arm}.json`);
export const outcomeFile = path.join(resultsDir, 'outcome.json');
export const lotRowsDir = path.join(researchDir, 'cache', 'lot-rows');
export const studyDocs = ['research/msft-d1-growth/PROTOCOL.md', 'research/msft-d1-growth/AMENDMENTS.md', 'research/msft-d1-growth/STANDARD_ADOPTION.json'];

// ----- guards -----

interface Freeze {
  protocol: { sha256: string };
  codeDigest: string;
  acceptanceSha256: string;
  doorPinsSha256: string;
  expected: Expected;
}
export interface Expected {
  // the pilot's planning means (requested per lane by arm, kind and door; per member; per subject): launch rule only
  perLane: Record<string, Record<Kind, Record<string, number>>>;
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
  if (fz.doorPinsSha256 !== sha256File(path.join(researchDir, 'data', 'DOOR_PINS.json')))
    throw new Error(`${stage}: the door pins differ from the frozen ones`);
  if (!isSealed(engineeringFile)) throw new Error(`${stage}: the engineering gates are not sealed (results/engineering/gates.json)`);
  assertCommitted(engineeringFile);

  const g = readJson<{ pass: boolean }>(engineeringFile);

  if (!g.pass) throw new Error(`${stage}: an engineering gate did not pass: every official stage is blocked`);

  const dirty = dirtyCode(studyDocs);

  if (dirty.length) throw new Error(`${stage}: uncommitted changes to the code or protocol (an official run starts from a commit): ${dirty.slice(0, 5).join('; ')}`);
  return { freeze: fz, head: headCommit(), branch: branchName() };
};

// the fold order: a cutoff's first stage needs the previous fold complete (its slice record sealed and committed; C24
// also the sealed, committed sequential record); no later cutoff may have started; the cutoff selection may not exist
export const foldGuard = (cut: CutoffKey, stage: string) => {
  const prev = cutoffs[cut].previous;

  if (prev && !(isSealed(sliceFile(prev)) && isCommitted(sliceFile(prev))))
    throw new Error(`${stage}: the ${prev} fold is not complete (its slice record is not sealed and committed)`);
  if (cut === 'C24' && !(isSealed(sequentialFile) && isCommitted(sequentialFile))) throw new Error(`${stage}: the sequential record is not sealed and committed`);
  for (const later of cutoffKeys.slice(cutoffKeys.indexOf(cut) + 1))
    if (fs.existsSync(path.join(resultsDir, 'search', later))) throw new Error(`${stage}: the later ${later} cutoff has started`);
  if (fs.existsSync(selectionFile(cut))) throw new Error(`${stage}: the ${cut} selection exists`);
};

// the arm order within a cutoff: an arm's first stage needs the previous arm's selection sealed and committed
export const armGuard = (cut: CutoffKey, arm: ArmKey, stage: string) => {
  const i = armOrder.indexOf(arm);

  if (i > 0) {
    const prev = armSelectionFile(cut, armOrder[i - 1]!);

    if (!(isSealed(prev) && isCommitted(prev))) throw new Error(`${stage}: the ${armOrder[i - 1]} selection of ${cut} is not sealed and committed (arm order ${armOrder.join(' → ')})`);
  }
  if (fs.existsSync(armSelectionFile(cut, arm))) throw new Error(`${stage}: the ${arm} selection of ${cut} exists`);
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
export const launchGuard = (stage: string, expectedRequested: number) => {
  const l = ledger();
  const remaining = l.ceiling - l.used;

  if (remaining < 1.5 * expectedRequested)
    throw new Error(`${stage}: resource ceiling — ${remaining} requested remain of ${l.ceiling}, expected ${expectedRequested} × 1.5 (PROTOCOL.md §7.6): the study stops here and reports`);

  const need = expectedRequested * archiveBytesPerFresh + diskReserveBytes;

  if (freeBytes() < need) throw new Error(`${stage}: disk reserve — ${(freeBytes() / 1024 ** 3).toFixed(1)} GiB free < ${(need / 1024 ** 3).toFixed(1)} GiB needed (PROTOCOL.md §7.6)`);
  return { ledgerUsed: l.used, remaining, expectedRequested, freeGiB: r2(freeBytes() / 1024 ** 3) };
};

const readFreeze = () => readJson<Freeze>(freezeFile);
const definitionOf = (stage: string, extra: Record<string, unknown>) => ({
  study: STUDY_ID,
  protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
  protocolSha256: readFreeze().protocol.sha256,
  frozenCodeDigest: readFreeze().codeDigest,
  codeDigest: codeDigest(),
  stage,
  ...extra
});

// ----- one official job: the gate, the attested pool, the Lab -----

interface JobRun<T> {
  job: string;
  resume: boolean;
  identity: Record<string, unknown>;
  door: DoorName;
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
    const door = await openMsftDoor(o.door, o.use, o.doorPurpose);
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

    lab = new EvalLab({
      ...labOptionsOf(job),
      door: o.door,
      doorPin: `MSFT:${readPins().doors[o.door].sha256}`,
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
const expectedOf = (): Expected => readFreeze().expected;

// ----- arm S's frozen D1 finalists (registered in every process that reads S configurations) -----

export const ensureFrozen = (cut: CutoffKey) => {
  if (!fs.existsSync(frozenD1File(cut))) return [];

  const r = readSealed<{ frozen: FrozenD1[] }>(frozenD1File(cut));

  for (const f of r.frozen) registerFrozen(f);
  return r.frozen;
};
export const ensureAllFrozen = () => {
  for (const c of cutoffKeys) ensureFrozen(c);
};

// ----- lane specs (seed key = lane key in this study's namespace: never an arm-crossing or later vector) -----

export const replicateOf = (i: number) => firstReplicate + i;
export const cellsOfSearchArm = (cut: CutoffKey, arm: SearchArm) =>
  arm === 'S' ? ensureFrozen(cut).flatMap((f) => sequentialCells(f.key)) : cellsOfArm(arm);
export const broadSpec = (cut: CutoffKey, arm: SearchArm, cellId: string, r: number): LaneSpec => {
  const key = `${cut}/${arm}/broad/${cellId}/R${r}`;

  return { key, seedKey: key, position: key, stage: 'broad', replicate: r, cutoff: cut, kind: 'indep', res: 'coarse', cell: cellOf(cellId) };
};
const baseReplicates = (cut: CutoffKey, arm: SearchArm) =>
  Array.from({ length: arm === 'S' ? sequentialReplicates(ensureFrozen(cut).length) : replicates.base[arm] }, (_v, i) => replicateOf(i));

export const partSpecs = (cut: CutoffKey, arm: SearchArm, part: 'broad' | 'refine'): { kind: Kind; specs: LaneSpec[] } => {
  if (part === 'broad') return { kind: 'broad', specs: cellsOfSearchArm(cut, arm).flatMap((c) => baseReplicates(cut, arm).map((r) => broadSpec(cut, arm, c.id, r))) };

  // the refinement lanes: the sealed plan's cells × the refinement replicates, seeded by the cell's qualified broad members
  // (arm S: the cutoff's frozen D1 finalists are registered first, as in every other process that reads S cells — A1)
  if (arm === 'S') ensureFrozen(cut);

  const plan = readSealed<{ cells: { cell: string; seeds: string[]; focus: string[] }[] }>(refinePlanFile(cut, arm));
  const broad = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut, arm, 'broad')).evidence;
  const byLabel = new Map(broad.map((e) => [e.label, e]));

  return {
    kind: 'refine',
    specs: plan.cells.flatMap((p) =>
      Array.from({ length: replicates.refine }, (_v, i) => {
        const r = replicateOf(i);
        const key = `${cut}/${arm}/refine/${p.cell}/R${r}`;
        const seeds: Seed[] = p.seeds.map((label) => ({ label, cfg: canonicalCfg(byLabel.get(label)!.cfg), focus: p.focus.includes(label) }));

        return { key, seedKey: key, position: key, stage: 'refine' as const, replicate: r, cutoff: cut, kind: 'refine' as const, res: 'fine' as const, cell: cellOf(p.cell), seeds };
      })
    )
  };
};

// ----- search parts and replicate rounds -----

const expectedLanes = (arm: SearchArm, kind: Kind, cut: CutoffKey, n: number) => n * (expectedOf().perLane[arm]?.[kind]?.[cutoffs[cut].door] ?? laneCaps[kind]);

const searchJob = async (cut: CutoffKey, arm: SearchArm, name: string, file: string, kind: Kind, specs: LaneSpec[], resume: boolean, extra: Record<string, unknown>) => {
  const g = officialGuards(`search ${cut} ${arm} ${name}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: that search is complete`);
  foldGuard(cut, `search ${cut} ${arm} ${name}`);
  armGuard(cut, arm, `search ${cut} ${arm} ${name}`);
  if (!specs.length) throw new Error(`search ${cut} ${arm} ${name}: no lanes`);

  const guard = launchGuard(`search ${cut} ${arm} ${name}`, expectedLanes(arm, kind, cut, specs.length));
  const spec = cutoffs[cut];
  const cap = specs.length * laneCaps[kind];
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-${arm}-${name}`,
    resume,
    identity: definitionOf('search', { cutoff: cut, arm, part: name, door: spec.door, kind, lanes: specs.map((s) => s.key), schedule: schedules[kind], laneCap: laneCaps[kind] }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official search ${cut} arm ${arm} ${name} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(cap, ceilingRequested - ledger().used),
    body: async (lab, ctx) => {
      ctx.job.event('phase', { head: g.head, guard });

      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { results, rounds } = await runLanes(lab, armPolicy(arm), specs, kind, `search ${cut} ${arm} ${name}`);
      const compute = computeOf(lab, fresh0, hits0, t0);
      const record = {
        stage: 'search',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        arm,
        armName: armName[arm],
        part: name,
        kind,
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

      seal(file, record, `search ${cut} ${arm} ${name}`);
      log(`search ${cut} ${arm} ${name}: sealed ${rel(file)} (${record.requested} requested, ${compute.fresh} fresh, ${compute.wallSeconds} s)`);
      return record;
    }
  });
};

export const runSearch = async (cut: CutoffKey, arm: SearchArm, part: 'broad' | 'refine', resume = false) => {
  if (arm === 'S' && !(isSealed(frozenD1File(cut)) && isCommitted(frozenD1File(cut)))) throw new Error(`search ${cut} S: the frozen D1 record is not sealed and committed`);
  if (part === 'refine' && !isSealed(refinePlanFile(cut, arm))) throw new Error(`search ${cut} ${arm} refine: the refinement plan is not sealed`);
  if (part === 'refine' && !isSealed(qualificationFile(cut, arm, 'broad'))) throw new Error(`search ${cut} ${arm} refine: the broad qualification is not sealed`);

  const { kind, specs } = partSpecs(cut, arm, part);

  return searchJob(cut, arm, part, searchFile(cut, arm, part), kind, specs, resume, {});
};

// the broad lanes of an arm at a cutoff so far (base + sealed replicate rounds), in replicate order
export const armLanes = (cut: CutoffKey, arm: SearchArm) => {
  const out: LaneResult[] = [...readSealed<{ lanes: LaneResult[] }>(searchFile(cut, arm, 'broad')).lanes];

  for (let k = 1; k <= replicates.maxRounds; k++) {
    const f = roundSearchFile(cut, arm, k);

    if (!fs.existsSync(f)) break;
    out.push(...readSealed<{ lanes: LaneResult[] }>(f).lanes);
  }
  return out;
};

export const runRound = async (cut: CutoffKey, arm: SearchArm, k: number, resume = false) => {
  const file = roundFile(cut, arm, k);

  if (k < 1 || k > replicates.maxRounds) throw new Error(`--k 1…${replicates.maxRounds}`);
  if (fs.existsSync(file) && isSealed(roundSearchFile(cut, arm, k))) throw new Error(`round ${cut} ${arm} ${k}: complete (its decision and lanes are sealed)`);
  if (k > 1) {
    const prev = readSealed<{ fired: boolean }>(roundFile(cut, arm, k - 1));

    if (!prev.fired) throw new Error(`round ${k}: round ${k - 1} did not fire (the arm's replicate rounds have stopped)`);
    if (!isSealed(roundSearchFile(cut, arm, k - 1))) throw new Error(`round ${k}: round ${k - 1}'s lanes are not sealed`);
  }
  if (!isSealed(searchFile(cut, arm, 'broad'))) throw new Error(`round ${k}: the ${arm} broad search is not sealed`);
  if (fs.existsSync(qualificationFile(cut, arm, 'broad'))) throw new Error(`round ${k}: the arm is already qualified`);

  const lanes = armLanes(cut, arm);
  const lastReplicate = Math.max(...lanes.map((l) => l.replicate));
  const before = unionState(lanes.filter((l) => l.replicate < lastReplicate));
  const after = unionState(lanes);
  const t = roundTrigger(before, after, replicates.roundThreshold);
  const nextReplicate = lastReplicate + 1;

  if (!fs.existsSync(file)) {
    officialGuards(`round ${cut} ${arm} ${k}`);
    seal(
      file,
      {
        stage: 'replicate round decision',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        arm,
        k,
        rule: `one more replicate of every cell of arm ${arm} iff the last replicate (R${lastReplicate}) raised the arm's union hypervolume, best robust net or best centre net of feasible rung-3 and shortlist fits by > ${replicates.roundThreshold * 100} % or gave a cell its first feasible fit`,
        lastReplicate,
        before,
        after,
        trigger: t,
        fired: t.fired,
        nextReplicate: t.fired ? nextReplicate : null,
        stop: t.fired ? null : 'replicate triggers not met (the arm converged across seeds by the frozen 2 % rule)',
        finished: new Date().toISOString()
      },
      `round decision ${cut} ${arm} ${k}`
    );
    log(`round ${cut} ${arm} ${k}: ${t.fired ? `fires → R${nextReplicate}` : 'does not fire'} (${JSON.stringify(t)})`);
  }

  if (!readSealed<{ fired: boolean }>(file).fired) return null;

  const specs = cellsOfSearchArm(cut, arm).map((c) => broadSpec(cut, arm, c.id, nextReplicate));

  return searchJob(cut, arm, `rx${k}`, roundSearchFile(cut, arm, k), 'broad', specs, resume, { round: k, replicate: nextReplicate });
};

export const roundsOf = (cut: CutoffKey, arm: SearchArm) => {
  const out: { k: number; fired: boolean }[] = [];

  for (let k = 1; k <= replicates.maxRounds; k++) {
    const f = roundFile(cut, arm, k);

    if (!fs.existsSync(f)) break;
    out.push({ k, fired: readSealed<{ fired: boolean }>(f).fired });
  }
  return out;
};
export const roundsComplete = (cut: CutoffKey, arm: SearchArm) => {
  const r = roundsOf(cut, arm);

  if (!r.length) return false;

  const last = r.at(-1)!;

  if (!last.fired) return true;
  return last.k === replicates.maxRounds && isSealed(roundSearchFile(cut, arm, last.k));
};

// ----- qualification -----

const membersOfLanes = (lanes: readonly LaneResult[], arm: ArmKey): Member[] =>
  lanes.flatMap((l) =>
    l.shortlist.map((p, i) => {
      const label = `${l.key}#${i + 1} ${p.pick}`;

      return { label, arm, lane: l.key, stage: l.stage as 'broad' | 'refine', replicate: l.replicate, cfg: canonicalCfg(p.cfg), pick: p.pick, sources: [{ label, lane: l.key, pick: p.pick }] };
    })
  );

const dedupe = (members: Member[], duplicates: { label: string; sameAs: string }[]) => {
  const seen = new Map<string, Member>();

  return members.filter((m) => {
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
};

export const membersOf = (cut: CutoffKey, arm: ArmKey, stage: QStage) => {
  const duplicates: { label: string; sameAs: string }[] = [];

  if (arm === 'S') ensureFrozen(cut);
  if (stage === 'fixed') {
    if (arm !== 'C') throw new Error('only arm C has fixed members');

    const pairs = readSealed<{ pairs: { label: string; d1: string; g: string; cfg: Cfg }[] }>(pairsFile(cut)).pairs;

    return {
      members: dedupe(
        pairs.map((p) => ({ label: p.label, arm: 'C' as const, lane: 'pairs', stage: 'fixed' as const, replicate: null, cfg: canonicalCfg(p.cfg), pick: `${p.d1} × ${p.g}`, sources: [{ label: p.label, lane: 'pairs', pick: `${p.d1} × ${p.g}` }] })),
        duplicates
      ),
      duplicates
    };
  }
  if (arm === 'C') throw new Error('arm C has no search');

  let members: Member[] =
    stage === 'broad'
      ? [...membersOfLanes(armLanes(cut, arm), arm), ...(arm === 'S' ? [] : controlMembers(arm as 'D' | 'G' | 'J'))]
      : membersOfLanes(readSealed<{ lanes: LaneResult[] }>(searchFile(cut, arm, 'refine')).lanes, arm);

  if (stage === 'refine') {
    // a configuration identical to one already qualified at this cutoff and arm keeps that evidence (the same draws)
    const byId = new Map(readSealed<{ evidence: Evidence[] }>(qualificationFile(cut, arm, 'broad')).evidence.map((e) => [e.id, e]));

    members = members.filter((m) => {
      const same = byId.get(cfgId(m.cfg));

      if (!same) return true;
      duplicates.push({ label: m.label, sameAs: same.label });
      return false;
    });
  }

  return { members: dedupe(members, duplicates), duplicates };
};

export const runQualify = async (cut: CutoffKey, arm: ArmKey, stage: QStage, resume = false) => {
  const file = qualificationFile(cut, arm, stage);
  const g = officialGuards(`qualify ${cut} ${arm} ${stage}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  foldGuard(cut, `qualify ${cut} ${arm} ${stage}`);
  armGuard(cut, arm, `qualify ${cut} ${arm} ${stage}`);
  if (arm !== 'C' && stage === 'broad' && !roundsComplete(cut, arm)) throw new Error(`qualify ${cut} ${arm} broad: the replicate rounds are not complete`);
  if (arm !== 'C' && stage === 'refine' && !isSealed(searchFile(cut, arm, 'refine'))) throw new Error(`qualify ${cut} ${arm} refine: the refinement search is not sealed`);
  if (stage === 'fixed' && !(isSealed(pairsFile(cut)) && isCommitted(pairsFile(cut)))) throw new Error(`qualify ${cut} C fixed: the pairs are not sealed and committed`);

  const { members, duplicates } = membersOf(cut, arm, stage);
  const spec = cutoffs[cut];
  const guard = launchGuard(`qualify ${cut} ${arm} ${stage}`, members.length * expectedOf().perMember);
  const bound = members.length * perMember(arm);
  const t0 = Date.now();

  if (!members.length) {
    const record = { stage: 'qualification', protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`, cutoff: cut, arm, qualificationStage: stage, door: spec.door, head: g.head, members: 0, qualified: 0, duplicates, evidence: [], requested: 0, note: 'no member to qualify', finished: new Date().toISOString() };

    seal(file, record, `qualify ${cut} ${arm} ${stage}`);
    return record;
  }

  return withOfficialJob({
    job: `${cut}-${arm}-qualify-${stage}`,
    resume,
    identity: definitionOf('qualify', { cutoff: cut, arm, qualificationStage: stage, door: spec.door, members: members.map((m) => ({ label: m.label, id: cfgId(m.cfg) })) }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official qualification ${cut} arm ${arm} ${stage} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(bound, ceilingRequested - ledger().used),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { evidence, requested } = await qualifyMembers(lab, members, cut);

      if (requested > bound) throw new Error(`qualify ${cut} ${arm} ${stage}: ${requested} requested > the bound ${bound}`);
      fs.mkdirSync(lotRowsDir, { recursive: true });
      fs.writeFileSync(path.join(lotRowsDir, `${cut}-${arm}-${stage}.json`), JSON.stringify(evidence.map((e) => ({ label: e.label, rows: e.risk.rows }))));

      const byCell: Record<string, { members: number; qualified: number; failed: Record<string, number> }> = {};

      for (const e of evidence.filter((x) => x.stage !== 'control')) {
        const c = (byCell[e.cell] ??= { members: 0, qualified: 0, failed: {} });

        c.members++;
        if (e.qualified) c.qualified++;
        for (const f of e.failed) c.failed[f] = (c.failed[f] ?? 0) + 1;
      }

      const record = {
        stage: 'qualification',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        arm,
        qualificationStage: stage,
        door: spec.door,
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        launch: guard,
        members: evidence.length,
        qualified: evidence.filter((e) => e.qualified && e.stage !== 'control').length,
        duplicates,
        byCell,
        evidence: evidence.map(sealedEvidence),
        requested,
        compute: computeOf(lab, fresh0, hits0, t0),
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `qualify ${cut} ${arm} ${stage}`);
      log(`qualify ${cut} ${arm} ${stage}: ${record.qualified} of ${record.members} qualified; sealed`);
      return record;
    }
  });
};

// ----- the refinement plan (frozen rule select.ts refineCells; no evaluation) -----

export const runRefinePlan = (cut: CutoffKey, arm: SearchArm) => {
  const file = refinePlanFile(cut, arm);

  officialGuards(`refine-plan ${cut} ${arm}`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  if (arm === 'S') ensureFrozen(cut);

  const evidence = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut, arm, 'broad')).evidence.filter((e) => e.stage !== 'control');
  const plan = refineCells(arm, evidence);

  seal(file, { stage: 'refinement plan', protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`, cutoff: cut, arm, rule: 'select.ts refineCells (PROTOCOL.md §7.3)', ...plan, finished: new Date().toISOString() }, `refine plan ${cut} ${arm}`);
  log(`refinement plan ${cut} ${arm}: ${plan.cells.length} cells (${plan.eligible} eligible)`);
  return plan;
};

// ----- the arm selection (no evaluation) -----

// the qualification stages an arm has at a cutoff: C its fixed pairs; S nothing without a frozen D1 (arm D had no
// qualified member: the S procedure has no primary there); a search arm its broad stage and — when its sealed refinement
// plan has cells — its refinement stage
export const qStagesOfArm = (arm: ArmKey, cut?: CutoffKey): QStage[] => {
  if (arm === 'C') return ['fixed'];
  if (!cut) return ['broad', 'refine'];
  if (arm === 'S' && ensureFrozen(cut).length === 0) return [];

  const plan = refinePlanFile(cut, arm);
  const cells = fs.existsSync(plan) ? readSealed<{ cells: unknown[] }>(plan).cells.length : 1;

  return cells > 0 ? ['broad', 'refine'] : ['broad'];
};
export const armEvidence = (cut: CutoffKey, arm: ArmKey): Evidence[] => {
  if (arm === 'S') ensureFrozen(cut);

  const out: Evidence[] = [];
  const seen = new Set<string>();

  for (const st of qStagesOfArm(arm, cut))
    for (const e of readSealed<{ evidence: Evidence[] }>(qualificationFile(cut, arm, st)).evidence)
      if (!seen.has(e.label)) {
        seen.add(e.label);
        out.push(e);
      }
  return out;
};
const subsOfArm: Record<ArmKey, PopulationName[]> = { D: ['D-A'], G: ['G-P', 'G-U'], C: [], J: ['J-P', 'J-U'], S: ['S-P', 'S-U'] };

export const runSelectArm = (cut: CutoffKey, arm: ArmKey) => {
  const file = armSelectionFile(cut, arm);

  officialGuards(`select-arm ${cut} ${arm}`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  for (const st of qStagesOfArm(arm, cut)) assertCommitted(qualificationFile(cut, arm, st));

  const all = armEvidence(cut, arm);
  const candidates = all.filter((e) => e.stage !== 'control');
  const pops: PopulationName[] = [arm, ...subsOfArm[arm]];
  const primaries: Record<string, string | null> = {};
  const rankings: Record<string, ReturnType<typeof selectionSummary>[]> = {};
  const roles: Record<string, ReturnType<typeof rolesOf>> = {};
  const ra1: Record<string, { first: string | null; top: ReturnType<typeof selectionSummary>[] }> = {};

  for (const p of pops) {
    const pop = candidates.filter(populations[p]);
    const order = originalOrder(pop);

    primaries[p] = order[0]?.qualified ? order[0].label : null;
    rankings[p] = order.slice(0, 10).map(selectionSummary);
    roles[p] = rolesOf(`population ${p}`, pop);

    const r = ra1Order(pop.filter((e) => e.qualified));

    ra1[p] = { first: r[0]?.label ?? null, top: r.slice(0, 5).map(selectionSummary) };
  }

  const finalists = arm === 'D' || arm === 'G' ? sequentialFinalistsOf(candidates.filter(populations[arm])) : [];
  const subjectLabels = [...new Set([...Object.values(primaries), ...Object.values(roles).flatMap((r) => Object.values(r.roles)), ...finalists.map((f) => f.label)].filter((l): l is string => Boolean(l)))];
  const controls = all.filter((e) => e.stage === 'control');
  const record = {
    stage: 'arm selection',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    cutoff: cut,
    arm,
    armName: armName[arm],
    rule: 'NL0 1.0.0 §3.5 original rule: the actual-profit role among the Q1–Q6 qualified members (highest centre net; ties: higher selection robust net, lower centre DD, label)',
    ra1Note: 'RA1 (experimental; Assignment 3’s thresholds unchanged) on the identical qualified population: report-only, never a primary, finalist, frozen D1, pair or role',
    qualification: qStagesOfArm(arm, cut).map((st) => ({ file: rel(qualificationFile(cut, arm, st)), sha256: sha256File(qualificationFile(cut, arm, st)) })),
    populations: Object.fromEntries(pops.map((p) => [p, populationLabel[p]])),
    counts: Object.fromEntries(pops.map((p) => [p, { members: candidates.filter(populations[p]).length, qualified: candidates.filter(populations[p]).filter((e) => e.qualified).length }])),
    primaries,
    rankings,
    roles,
    ra1,
    finalists,
    subjects: subjectLabels.map((l) => sealedEvidence(candidates.find((e) => e.label === l)!)),
    controls: controls.map(sealedEvidence),
    finished: new Date().toISOString()
  };

  seal(file, record, `selection ${cut} ${arm}`);
  log(`selection ${cut} ${arm}: ${JSON.stringify(primaries)}`);
  return record;
};
const sequentialFinalistsOf = (pop: readonly Evidence[]) => sequentialFinalists(pop);

// ----- arm S's frozen D1 finalists and arm C's pairs (no evaluation) -----

export const runFreezeD1 = (cut: CutoffKey) => {
  const file = frozenD1File(cut);

  officialGuards(`freeze-d1 ${cut}`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  assertCommitted(armSelectionFile(cut, 'D'));

  const sel = readSealed<{ finalists: { key: string; why: string; label: string }[]; subjects: Evidence[] }>(armSelectionFile(cut, 'D'));
  const frozen = sel.finalists.map((f) => {
    const e = sel.subjects.find((x) => x.label === f.label)!;

    return frozenFrom(`${cut}${f.key}`, f.label, canonicalCfg(e.cfg));
  });
  const record = {
    stage: 'frozen D1 finalists (arm S)',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    cutoff: cut,
    rule: 'arm D’s primary, robust-profit and balanced role holders at this cutoff (distinct funded-lot ledgers; ≤ 3), frozen before arm S searches; never moved by arm S',
    source: { file: rel(armSelectionFile(cut, 'D')), sha256: sha256File(armSelectionFile(cut, 'D')) },
    frozen,
    whys: sel.finalists,
    note: frozen.length ? null : 'arm D has no qualified member at this cutoff: arm S cannot run (no frozen D1) — the S procedure has no primary at this cutoff',
    finished: new Date().toISOString()
  };

  seal(file, record, `frozen D1 ${cut}`);
  return record;
};

export const runPairs = (cut: CutoffKey) => {
  const file = pairsFile(cut);

  officialGuards(`pairs ${cut}`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  assertCommitted(armSelectionFile(cut, 'D'));
  assertCommitted(armSelectionFile(cut, 'G'));
  armGuard(cut, 'C', `pairs ${cut}`);

  const d = readSealed<{ subjects: Evidence[] }>(armSelectionFile(cut, 'D')).subjects;
  const g = readSealed<{ subjects: Evidence[] }>(armSelectionFile(cut, 'G')).subjects;
  const dEv = armEvidence(cut, 'D').filter(populations.D);
  const gEv = armEvidence(cut, 'G').filter(populations.G);
  const sides = pairSides(dEv, gEv);
  const pairs = sides.d1.flatMap((a) =>
    sides.g.map((b) => {
      const ea = d.find((x) => x.label === a.label) ?? dEv.find((x) => x.label === a.label)!;
      const eb = g.find((x) => x.label === b.label) ?? gEv.find((x) => x.label === b.label)!;
      const cfg = pairCfg(canonicalCfg(ea.cfg), canonicalCfg(eb.cfg));

      return { label: `${cut}/C/pair D${a.key}×G${b.key}`, d1: a.label, g: b.label, d1Why: a.why, gWhy: b.why, id: cfgId(cfg), cfg };
    })
  );
  const record = {
    stage: 'fixed pairs (arm C)',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    cutoff: cut,
    rule: 'every pair of arm D’s and arm G’s finalists (each: primary, robust-profit, balanced; distinct ledgers; ≤ 3 × 3), their parameter vectors unchanged, in one shared slot (D1 first); no re-optimization',
    sides,
    pairs,
    finished: new Date().toISOString()
  };

  seal(file, record, `pairs ${cut}`);
  return record;
};

// ----- the cutoff selection (no evaluation): every arm; committed before the slice -----

export const runSelect = (cut: CutoffKey) => {
  const file = selectionFile(cut);

  officialGuards(`select ${cut}`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  for (const a of armOrder) assertCommitted(armSelectionFile(cut, a));
  ensureFrozen(cut);

  type ArmSel = { primaries: Record<string, string | null>; roles: Record<string, unknown>; subjects: Evidence[]; controls: Evidence[] };
  const arms = armOrder.map((a) => ({ ...readSealed<ArmSel>(armSelectionFile(cut, a)), arm: a, file: rel(armSelectionFile(cut, a)), sha256: sha256File(armSelectionFile(cut, a)) }));
  const primaries: Record<string, string | null> = {};
  const roles: Record<string, unknown> = {};

  for (const a of arms) {
    Object.assign(primaries, a.primaries as Record<string, string | null>);
    Object.assign(roles, a.roles as Record<string, unknown>);
  }

  const record = {
    stage: 'selection',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    cutoff: cut,
    arms: arms.map((a) => ({ arm: a.arm, file: a.file, sha256: a.sha256 })),
    primaries,
    roles,
    subjects: arms.flatMap((a) => a.subjects as Evidence[]),
    controls: arms.flatMap((a) => a.controls as Evidence[]),
    finished: new Date().toISOString()
  };

  seal(file, record, `selection ${cut}`);
  log(`selection ${cut}: ${JSON.stringify(primaries)}`);
  return record;
};

// ----- the slice evaluation (C19 → D21, C21 → D23, C23 → D24) and the validation (C24 → FULL, once) -----

type Subject = { label: string; id: string; arm: ArmKey; roles: string[]; kind: 'selected' | 'control'; cfg: Cfg; selectBreachShare: number };

export const subjectsOf = (cut: CutoffKey): Subject[] => {
  ensureFrozen(cut);

  const sel = readSealed<{ primaries: Record<string, string | null>; roles: Record<string, { roles: Record<string, string | null> }>; subjects: Evidence[]; controls: Evidence[] }>(selectionFile(cut));
  const out = new Map<string, Subject>();
  const add = (e: Evidence, role: string, kind: Subject['kind']) => {
    const key = `${e.arm}|${e.id}`;
    const s = out.get(key);

    if (s) s.roles.push(role);
    else out.set(key, { label: e.label, id: e.id, arm: e.arm, roles: [role], kind, cfg: canonicalCfg(e.cfg), selectBreachShare: e.selectTail.breachShare });
  };
  const byLabel = new Map(sel.subjects.map((e) => [e.label, e]));

  for (const [p, l] of Object.entries(sel.primaries)) if (l) add(byLabel.get(l)!, `primary ${p}/original`, 'selected');
  for (const [p, r] of Object.entries(sel.roles)) for (const [role, l] of Object.entries(r.roles)) if (l) add(byLabel.get(l)!, `role ${p}/${role}`, 'selected');
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
  const t0 = Date.now();

  return withOfficialJob({
    job: isValidation ? 'C24-validation' : `${cut}-slice`,
    resume,
    identity: definitionOf(isValidation ? 'validation' : 'slice', { cutoff: cut, door: spec.sliceDoor, slice: spec.slice, boundary: spec.end, subjects: subjects.map((s) => `${s.arm}|${s.id}`) }),
    door: spec.sliceDoor,
    use: isValidation ? 'validation' : 'slice',
    doorPurpose: `official ${isValidation ? 'validation' : 'slice'} ${cut} → ${spec.slice.join('…')} (${PROTOCOL_ID})`,
    maxFresh: Math.min(subjects.length * perSubject, ceilingRequested - ledger().used),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const dates = sessionsAfter(ctx.door, spec.end);

      if (dates[0] !== spec.slice[0] || dates.at(-1) !== spec.slice[1]) throw new Error(`${cut}: the slice door spans ${dates[0]}…${dates.at(-1)}, not ${spec.slice.join('…')}`);

      type It = { cfg: Cfg; options: (typeof armOptions)[ArmKey]; detail?: boolean; risk?: true };
      const closeChunks = isValidation ? [] : chunks(dates, 16);
      const plans = subjects.map((s) => {
        const o = armOptions[s.arm];
        const opts = { ...o, boundaries: [spec.end] };
        const draws = [1, 2].flatMap((rep) => drawsOf(s.cfg, famOf('select', ['select', rep, cut], 1, fidelity.n)));
        const seen = new Set<string>();
        const unique = draws.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
        const items: It[] = [
          { cfg: s.cfg, options: opts, detail: true, risk: true },
          { cfg: s.cfg, options: opts, risk: true },
          ...Object.values(stresses).map((f) => ({ cfg: s.cfg, options: { ...opts, friction: { ...f } }, risk: true as const })),
          ...unique.map((d) => ({ cfg: d.cfg, options: opts, risk: true as const })),
          ...closeChunks.map((c) => ({ cfg: s.cfg, options: { ...o, boundaries: c } }))
        ];

        return { s, unique, items };
      });
      const items = plans.flatMap((p) => p.items);

      if (items.length > subjects.length * perSubject) throw new Error(`${cut}: ${items.length} requested > the bound`);

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
          arm: p.s.arm,
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
          interest: centre.interest,
          costs: centre.costs,
          closes,
          lots: lots.map((x) => ({ book: x.book, entry: x.entry, exit: x.exit, net: x.net, mae: x.mae, maeAt: x.maeAt, reason: x.reason, days: x.days })),
          openAtBoundary: carried.map((x) => ({ book: x.book, entry: x.entry, exit: x.exit, reason: x.reason, net: x.net, mae: x.mae })),
          nextSlice: {
            lots: nextLots.length,
            byBook: Object.fromEntries(['D1:VGT', 'G:VGT'].map((bk) => [bk === 'D1:VGT' ? 'D1·MSFT' : 'Growth·MSFT', nextLots.filter((x) => x.book === bk).length])),
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
        label: 'retrospective, previously examined broader-market history — never a pristine holdout or independent future validation',
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
    return readSealed<{ rows: (SliceRow & { roles: string[]; kind: string; arm: ArmKey })[] }>(sliceFile(c));
  });
  const sels = foldKeys.map((c) => readSealed<{ primaries: Record<string, string | null> }>(selectionFile(c)));
  const rowOf = (i: number, label: string | null) => (label ? (slices[i]!.rows.find((r) => r.label === label) ?? null) : null);
  const pathOf = (name: string, pick: (i: number) => string | null) => {
    const labels = foldKeys.map((_c, i) => pick(i));
    const c = chain(foldKeys, labels.map((l, i) => rowOf(i, l)));
    const verdict = verdictOf(foldKeys, labels, c);

    return { name, labels, ...c, verdict, supported: verdict.startsWith('supported') };
  };
  const procedures = armPopulations.map((p) => ({ population: p, armName: armName[p], independent: true, nominating: true, ...pathOf(`${p}/original`, (i) => sels[i]!.primaries[p] ?? null) }));
  const secondary = subPopulations.map((p) => ({ population: p, independent: true, nominating: false, ...pathOf(`${p}/original (report-only)`, (i) => sels[i]!.primaries[p] ?? null) }));
  const roleLabel = (i: number, role: string) => slices[i]!.rows.find((r) => r.roles.includes(role))?.label ?? null;
  const descriptive = [
    ...armPopulations.flatMap((a) => ['robust-profit', 'balanced', 'lower-drawdown'].map((role) => pathOf(`${a}: role ${role} (descriptive)`, (i) => roleLabel(i, `role ${a}/${role}`)))),
    ...slices[0]!.rows.filter((r) => r.kind === 'control').map((r) => pathOf(`${r.label}, fixed (descriptive: an external VGT phenotype)`, (i) => slices[i]!.rows.find((x) => x.label === r.label)?.label ?? null))
  ];
  const record = {
    stage: 'sequential',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    folds: foldKeys.map((c, i) => ({ fold: c, slice: cutoffs[c].slice, primaries: sels[i]!.primaries, slice_record: { file: rel(sliceFile(c)), sha256: sha256File(sliceFile(c)) } })),
    switchCharge: '5 bps of $100,000 per open lot closed or adopted at a switch',
    drawdown:
      'PROTOCOL.md §11.2 (Priority 5 AD4): the strict drawdown of the chain over every exactly observed GPU mark — each slice’s minute reset drawdown, every session close, every lot’s exact minute minimum',
    verdictRule: 'supported iff every fold produced a primary, the sequential net > 0 and the sequential drawdown ≤ $35,000',
    procedures,
    secondary,
    descriptive,
    scope:
      'each arm’s procedure (D, G, C, J, S) is an INDEPENDENT chronological test of that arm’s complete search-and-selection procedure (every phenotype searched fresh at every cutoff from that cutoff’s door only; arm C pairs and arm S’s frozen D1 come from the same cutoff’s D and G selections); the sub-populations are report-only; roles and the external controls are descriptive',
    finished: new Date().toISOString()
  };

  seal(sequentialFile, record, 'sequential');
  for (const p of procedures) log(`sequential ${p.population}/original: ${p.verdict}; net ${r2(p.net)}, DD ${r2(p.drawdown)}`);
  return record;
};

// ----- the frozen selection, the FULL authorization and the outcome -----

export const runFreezeSelection = async () => {
  const { finalistsOf, preDetermination } = await import('./outcome.ts');

  officialGuards('freeze-selection');
  if (fs.existsSync(frozenSelectionFile)) throw new Error('FROZEN_SELECTION.json exists');
  for (const c of cutoffKeys) assertCommitted(selectionFile(c));
  for (const c of foldKeys) assertCommitted(sliceFile(c));
  assertCommitted(sequentialFile);

  const sel = readSealed<{ primaries: Record<string, string | null> }>(selectionFile('C24'));
  const seq = readSealed<{ procedures: { population: string; verdict: string; supported: boolean }[] }>(sequentialFile);
  const finalists = finalistsOf('C24');
  const record = {
    kind: 'P9-MSFT frozen selection',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    frozenAt: new Date().toISOString(),
    head: headCommit(),
    codeDigest: codeDigest(),
    selections: cutoffKeys.map((c) => ({ cutoff: c, file: rel(selectionFile(c)), sha256: sha256File(selectionFile(c)) })),
    slices: foldKeys.map((c) => ({ cutoff: c, file: rel(sliceFile(c)), sha256: sha256File(sliceFile(c)) })),
    sequential: { file: rel(sequentialFile), sha256: sha256File(sequentialFile) },
    primaries: sel.primaries,
    finalists,
    preDetermination: preDetermination(finalists, seq.procedures),
    validationPlan: {
      door: 'FULL',
      slice: cutoffs.C24.slice,
      boundary: cutoffs.C24.end,
      subjects: 'every C24 primary and role of every arm and sub-population (selection/C24.json) and the external controls',
      evaluations: 'per subject: the detailed centre and the centre with the 2024-12-31 boundary, the eight stresses, the selection family 2 × 128 regenerated exactly — every one with the risk envelope',
      tests: 'V1 validation P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000',
      once: true,
      label: 'retrospective, previously examined broader-market history (2025–2026 examined by many studies of the program); never a pristine holdout; no validation-driven iteration'
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
    authority: 'brief Phase 5F ("Keep the 2025–2026 period isolated until the final C24 selection is frozen and committed. Open once for validation under predeclared gates, with no post-validation search changes") and Phase 3 item 8 ("Keep final selection sealed before opening the final period")',
    frozenSelection: { file: rel(frozenSelectionFile), sha256: sha256File(frozenSelectionFile) },
    c24Selection: { file: rel(selectionFile('C24')), sha256: sha256File(selectionFile('C24')) },
    once: 'the official validation job opens FULL once; afterwards only report-only diagnostics of the same frozen subjects'
  };

  seal(fullAuthorizationFile, record, 'FULL authorization');
  return record;
};

export const runOutcome = async () => {
  const { outcomeOf } = await import('./outcome.ts');

  officialGuards('outcome');
  if (fs.existsSync(outcomeFile)) throw new Error('the outcome exists');
  assertCommitted(sliceFile('C24'));

  const fz = readSealed<{ preDetermination: unknown }>(frozenSelectionFile);
  const v = readSealed<{ rows: { label: string; id: string; arm: ArmKey; kind: string; validation: { V1: boolean; V2: boolean; V3: boolean } }[] }>(sliceFile('C24'));
  const record = {
    stage: 'outcome',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    frozenSelection: { file: rel(frozenSelectionFile), sha256: sha256File(frozenSelectionFile) },
    validation: { file: rel(sliceFile('C24')), sha256: sha256File(sliceFile('C24')) },
    ...outcomeOf(fz.preDetermination as never, v.rows),
    finished: new Date().toISOString()
  };

  seal(outcomeFile, record, 'outcome');
  return record;
};
