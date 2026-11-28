// Stage B's stages (PROTOCOL.md §11), each OFFICIAL evaluating stage a GPU job of its own (src/gpu-jobs/jobs.ts openJob →
// src/gpu-backend/official.ts openOfficialGpuSession → GpuPool → EvalLab; no CPU path), each writing one sealed record.
// Per fold, in the strict order C19 → C21 → C24:
//
//   repro   --cutoff C    job C-repro     training door   E2's 4 CTRL reproduction lanes (R1/R2 × both cells)
//   e2      --cutoff C    (no evaluation)                 the reproduction lanes = Assignment 3's sealed lanes
//   search  --cutoff C    job C-search    training door   the 64 research lanes (both arms × 2 cells × R3–R18), one job
//   qualify --cutoff C    job C-qualify   training door   the union of both arms' shortlists + New L0 + N/original
//   select  --cutoff C    (no evaluation)                 lane values V, the paired statistic, pooled selectors → sealed,
//                                                         COMMITTED before the next door opens
//   interval --cutoff C   job C-interval  D21 / D23       (C19, C21) the next interval (retrospective)
//   freeze-selection, authorize-full (no evaluation), then validate (job C24-validation, FULL once)
//
// Guards of every official stage: the study preflight, the sealed and committed protocol freeze with the frozen code
// digest (or a sealed code amendment chained from it), the sealed and committed engineering gates, the acceptance record
// the freeze pinned, no uncommitted change to the code closure or the protocol documents, the deterministic budget bound,
// the fold order and the door guards (doors.ts). A stage whose record exists refuses to rerun; an interrupted job resumes
// from its archive (the same command with --resume).
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
import { deepDiff } from '../gpu-phase1/compare.ts';
import { budgets } from '../vg-l0-full-joint/budgets.ts';
import { incumbents, vOptions } from '../vg-l0-full-joint/nl0.ts';
import { drawsOf, famOf, stresses } from '../vg-l0-full-joint/qualify.ts';
import type { DRec, SRec } from '../vg-l0-full-joint/evaluate.ts';
import { fidelity } from '../vg-l0-risk-families/qualify.ts';
import { type Cfg, canonicalCfg, cellOf, cfgId } from '../vg-l0-full-joint/space.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import { Lane, type LaneResult, type LaneSpec } from '../vg-l0-risk-envelope-pilot/search.ts';
import { assessArm } from '../vg-l0-risk-envelope-pilot/fitness.ts';
import { benchmarks, stripEnvelopes } from '../vg-l0-risk-envelope-pilot/stages.ts';
import {
  type Arm,
  type ArmKey,
  type CutoffKey,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  STUDY_ID,
  armKeys,
  arms,
  asPilotArm,
  cells,
  cutoffKeys,
  cutoffs,
  engineeringFile,
  execution,
  freezeFile,
  latestSearchLaunch,
  log,
  r2,
  replicates,
  repoRoot,
  reproReplicates,
  researchDir,
  resultsDir
} from './context.ts';
import { assertBound, bound, finishReserve, laneCap, lanesPerCutoff } from './budget.ts';
import { type Evidence, type Member, qualifyMembers, sealedEvidence } from './qualify.ts';
import { type SelectorName, laneValues, selectArm, selectorsOf } from './select.ts';
import { intervalFile, frozenSelectionFile, fullAuthorizationFile, openStageBDoor, selectionFile } from './doors.ts';
import { pairsOf, primaryOf } from './stats.ts';
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

export const reproFile = (cut: CutoffKey) => path.join(resultsDir, 'repro', `${cut}.json`);
export const e2File = (cut: CutoffKey) => path.join(resultsDir, 'engineering', `E2-${cut}.json`);
export const searchFile = (cut: CutoffKey) => path.join(resultsDir, 'search', `${cut}.json`);
export const qualificationFile = (cut: CutoffKey) => path.join(resultsDir, 'qualification', `${cut}.json`);
export const lotRowsDir = path.join(researchDir, 'cache', 'lot-rows');
export const studyDocs = [
  'research/vg-l0-risk-envelope-stage-b/PROTOCOL.md',
  'research/vg-l0-risk-envelope-stage-b/AMENDMENTS.md',
  'research/vg-l0-risk-envelope-stage-b/STANDARD_ADOPTION.json',
  'research/vg-l0-risk-envelope-stage-b/SEED_BUDGET_MATRIX.json',
  'research/vg-l0-risk-envelope-stage-b/EXECUTION_PLAN.md'
];

// Assignment 3's sealed lanes (read only; pinned in the freeze)
export const a3Dir = path.join(repoRoot, 'research', 'vg-l0-full-joint');
export const a3SearchFile = (cut: CutoffKey) => path.join(a3Dir, 'results', 'search', cut, 'broad1.json');
export const a3FrozenSelection = path.join(a3Dir, 'FROZEN_SELECTION.json');

// ----- the lanes (seed key = lane key in Assignment 3's namespace; the arm never enters it) -----

export const specOf = (cut: CutoffKey, cell: string, r: number): LaneSpec => {
  const key = `${cut}/broad/${cell}/R${r}`;

  return { key, seedKey: key, position: key, stage: 'broad', replicate: r, cutoff: cut, kind: 'indep', res: 'coarse', cell: cellOf(cell) };
};
export const researchSpecs = (cut: CutoffKey) => cells.flatMap((c) => replicates.map((r) => specOf(cut, c, r)));
export const reproSpecs = (cut: CutoffKey) => cells.flatMap((c) => reproReplicates.map((r) => specOf(cut, c, r)));
// the seed/budget matrix (PROTOCOL.md §4; SEED_BUDGET_MATRIX.json is checked against it by a test)
export const matrix = () => ({
  research: cutoffKeys.flatMap((cut) =>
    researchSpecs(cut).flatMap((s) => armKeys.map((a) => ({ cutoff: cut, cell: s.cell!.id, replicate: s.replicate, arm: a, laneKey: s.key, seedKey: s.seedKey })))
  ),
  reproduction: cutoffKeys.flatMap((cut) => reproSpecs(cut).map((s) => ({ cutoff: cut, cell: s.cell!.id, replicate: s.replicate, arm: "CTRL" as const, laneKey: s.key, seedKey: s.seedKey })))
});

// ----- guards -----

interface Freeze {
  protocol: { sha256: string };
  codeDigest: string;
  acceptanceSha256: string;
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

  const g = readJson<{ pass: boolean; gates: Record<string, { pass: boolean }> }>(engineeringFile);

  if (!g.pass || !['E1', 'E3', 'E4', 'E5', 'E6'].every((k) => g.gates[k]?.pass === true))
    throw new Error(`${stage}: an engineering gate did not pass: every official stage is blocked`);

  const dirty = dirtyCode(studyDocs);

  if (dirty.length) throw new Error(`${stage}: uncommitted changes to the code or protocol (an official run starts from a commit): ${dirty.slice(0, 5).join('; ')}`);
  assertBound();
  return { freeze: fz, head: headCommit(), branch: branchName() };
};

// the fold order: a fold's first stage needs the previous fold complete (its interval sealed and committed), and no later
// fold may have started
export const foldGuard = (cut: CutoffKey, stage: string) => {
  const prev = cutoffs[cut].previous;

  if (prev && !(isSealed(intervalFile(prev)) && isCommitted(intervalFile(prev))))
    throw new Error(`${stage}: the ${prev} fold is not complete (its interval record is not sealed and committed): the folds run C19 → C21 → C24`);
  for (const later of cutoffKeys.slice(cutoffKeys.indexOf(cut) + 1))
    if (fs.existsSync(reproFile(later)) || fs.existsSync(searchFile(later))) throw new Error(`${stage}: the later ${later} fold has started`);
};

// the precommitted launch rule (PROTOCOL.md §13): now + the fold's conservative forecast ≤ 2026-11-23T04:30Z
const sessionsOf = (door: string) => (doorSpecs as Record<string, { sessions: number }>)[door]!.sessions;
// measured with the risk envelope (Phase 7's 8-lane benchmark: D21 366.7/s, D24 227.2/s → the lower session-throughput
// constant 227.2 × 2,264 sessions·evaluations/s) and the pilot's union qualification (16,978 in 24 s on D24)
const searchRate8 = (door: string) => (227.2 * 2264) / sessionsOf(door);
const qualifyRate = (door: string) => (707.4 * 2264) / sessionsOf(door);
export const forecastOf = (cut: CutoffKey) => {
  const spec = cutoffs[cut];
  const b = bound();
  const expected = lanesPerCutoff * b.expected.searchPerLaneMean[cut];
  const prev = spec.previous ? searchFile(spec.previous) : null;
  let rate = searchRate8(spec.door);
  let basis = 'Phase 7 8-lane rate scaled by door sessions';

  if (prev && isSealed(prev)) {
    const r = readJson<{ requested: number; wallSeconds: number; door: string }>(prev);
    const measured = (r.requested / r.wallSeconds) * (sessionsOf(r.door) / sessionsOf(spec.door));

    rate = measured / 1.5;
    basis = `the previous search's measured rate ${r2(r.requested / r.wallSeconds)}/s scaled by door sessions, ÷ 1.5`;
  }

  const seconds = expected / rate + (b.membersPerCutoff * b.perMember) / qualifyRate(spec.door) + (b.subjectsPerCutoff * b.perSubject) / qualifyRate(spec.sliceDoor === 'FULL' ? 'D24' : spec.sliceDoor) + 600;

  return { cutoff: cut, expectedRequested: expected, rate: r2(rate), basis, seconds: Math.round(seconds), latestLaunch: latestSearchLaunch };
};
export const launchGuard = (cut: CutoffKey) => {
  const f = forecastOf(cut);
  const end = Date.now() + f.seconds * 1000;

  if (end > Date.parse(latestSearchLaunch))
    throw new Error(`launch rule: now + the ${cut} fold's conservative forecast (${f.seconds} s, ${f.basis}) ends after ${latestSearchLaunch}: stop at the paired checkpoint (PROTOCOL.md §13)`);
  return f;
};

const definitionOf = (stage: string, extra: Record<string, unknown>) => ({
  study: STUDY_ID,
  protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
  protocolSha256: readJson<Freeze>(freezeFile).protocol.sha256,
  frozenCodeDigest: readJson<Freeze>(freezeFile).codeDigest,
  codeDigest: codeDigest(),
  stage,
  risk: true,
  ...extra
});

// ----- one official job: the gate, the attested pool, the Lab -----

interface JobRun<T> {
  job: string;
  resume: boolean;
  identity: Record<string, unknown>;
  door: StudyDoor;
  use: 'training' | 'interval' | 'validation';
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
    const door = await openStageBDoor(o.door, o.use, o.doorPurpose);
    const domain = riskEnvelopePilotDomain(incumbents().NL0.quad.d1.VGT);
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

// ----- the lanes of one job: each lane with its own arm, Assignment 3's barrier loop (runSearch) unchanged in its rules -----

export const runLanes = async (lab: EvalLab, plan: readonly { spec: LaneSpec; arm: Arm }[], budget: (typeof budgets)['study']['broad'], laneBound: number, cap: number, reserve: number, stageName: string) => {
  const lanes = plan.map((p) => ({ arm: p.arm, lane: new Lane(lab, p.spec, budget, asPilotArm(p.arm), laneBound) }));
  const id = (x: (typeof lanes)[number]) => `${x.arm.key} ${x.lane.spec.position}`;
  const requested = () => lanes.reduce((a, l) => a + l.lane.requested, 0);
  const rounds: { round: number; positions: { position: string; arm: ArmKey; fired: boolean; extended: boolean; atCap: boolean }[]; requestedBefore: number; worstCase: number; decision: string }[] = [];

  lab.stage = `${stageName}: base (${lanes.length} lanes)`;
  await Promise.all(lanes.map((l) => l.lane.base()));

  const stops = new Map<string, string>();

  for (let round = 1; ; round++) {
    const live = lanes.filter((l) => !stops.has(id(l)));

    if (!live.length) break;

    const row = { round, positions: [] as (typeof rounds)[number]['positions'], requestedBefore: requested(), worstCase: 0, decision: '' };
    const go: typeof lanes = [];

    for (const l of live) {
      const fired = l.lane.lastTrigger?.fired ?? false;
      const atCap = l.lane.atCap;

      row.positions.push({ position: l.lane.spec.position, arm: l.arm.key, fired, extended: fired && !atCap, atCap });
      if (!fired) stops.set(id(l), 'triggers not met');
      else if (atCap) stops.set(id(l), 'extension cap reached (a trigger still fired: budget-bound, not converged)');
      else go.push(l);
    }
    row.worstCase = go.reduce((a, l) => a + l.lane.islandWorstCase, 0);
    if (go.length && requested() + row.worstCase + reserve * lanes.length > cap) {
      for (const l of go) stops.set(id(l), 'resource guard (the job cap on fresh simulations)');
      row.decision = `resource guard: ${requested()} requested + worst case ${row.worstCase} + finishing reserve ${reserve * lanes.length} > cap ${cap}`;
      rounds.push(row);
      break;
    }
    row.decision = go.length ? `extend ${go.length} lane(s)` : 'no lane extends';
    rounds.push(row);
    if (!go.length) break;
    lab.stage = `${stageName}: extension round ${round} (${go.length} lanes)`;
    lab.checkpoint({ [`extension ${stageName}`]: { round, extending: go.map(id) } });
    await Promise.all(go.map((l) => l.lane.extend()));
  }

  lab.stage = `${stageName}: finishing`;

  const results = await Promise.all(lanes.map(async (l) => ({ arm: l.arm.key, result: await l.lane.finish(stops.get(id(l)) ?? 'triggers not met') })));

  return { results, rounds };
};

const computeOf = (lab: EvalLab, fresh0: number, hits0: number, t0: number) => ({
  fresh: lab.fresh - fresh0,
  archiveHits: lab.hits - hits0,
  tallies: lab.tallies,
  lab: lab.compute,
  wallSeconds: Math.round((Date.now() - t0) / 100) / 10
});

// ----- E2: the reproduction lanes (official GPU) and their comparison with Assignment 3 -----

export const runRepro = async (cut: CutoffKey, resume = false) => {
  const file = reproFile(cut);
  const g = officialGuards(`repro ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: the reproduction is complete`);
  foldGuard(cut, `repro ${cut}`);

  const specs = reproSpecs(cut);
  const spec = cutoffs[cut];
  const cap = specs.length * laneCap;
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-repro`,
    resume,
    identity: definitionOf('repro', { cutoff: cut, door: spec.door, arm: 'CTRL', lanes: specs.map((s) => s.key), schedule: 'Assignment 3 broad lane (NL0 V-cell schedule)', laneCap }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official E2 reproduction ${cut} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: cap,
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { results, rounds } = await runLanes(
        lab,
        specs.map((s) => ({ spec: s, arm: arms.CTRL })),
        budgets.study.broad,
        laneCap,
        cap,
        finishReserve,
        `repro ${cut}`
      );
      const lanes = results.map((r) => r.result);

      for (const r of lanes) if (r.requested > laneCap) throw new Error(`${r.key}: ${r.requested} requested > the lane bound ${laneCap}`);

      const record = {
        stage: 'repro',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        arm: 'CTRL',
        door: spec.door,
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        branch: g.branch,
        laneCap,
        extensionRounds: rounds,
        lanes,
        requested: lanes.reduce((a, r) => a + r.requested, 0),
        compute: computeOf(lab, fresh0, hits0, t0),
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `repro ${cut}`);
      log(`repro ${cut}: sealed ${rel(file)} (${record.requested} requested)`);
      return record;
    }
  });
};

export const runE2 = (cut: CutoffKey) => {
  const file = e2File(cut);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);

  const mine = readSealed<{ lanes: LaneResult[] }>(reproFile(cut));
  const sealed = readSealed<{ lanes: LaneResult[] }>(a3SearchFile(cut));
  const rows = mine.lanes.map((l) => {
    const ref = sealed.lanes.find((x) => x.key === l.key);

    if (!ref) throw new Error(`${l.key}: no sealed Assignment 3 lane`);

    const diffs = deepDiff(ref, stripEnvelopes(l), '$', [], 40);

    return { lane: l.key, identical: diffs.length === 0, differences: diffs.map((d) => ({ path: d.path })), requested: [ref.requested, l.requested] };
  });
  const record = {
    gate: 'E2',
    cutoff: cut,
    what: 'every CTRL reproduction lane (R1/R2 × both cells; official GPU, the risk envelope requested on every evaluation, the Stage B runner and lane grouping) equals the corresponding sealed Assignment 3 lane result after removing the envelope fields',
    sealedReference: { file: rel(a3SearchFile(cut)), sha256: sha256File(a3SearchFile(cut)) },
    reproduction: { file: rel(reproFile(cut)), sha256: sha256File(reproFile(cut)) },
    lanes: rows,
    identical: rows.length === reproSpecs(cut).length && rows.every((r) => r.identical),
    finished: new Date().toISOString()
  };

  seal(file, record, `E2 ${cut}`);
  log(`E2 ${cut}: ${record.identical ? 'IDENTICAL' : 'DIFFERENT'} (${rows.filter((r) => r.identical).length}/${rows.length} lanes)`);
  if (!record.identical) throw new Error(`E2 ${cut} failed: the CTRL reproduction lanes differ from Assignment 3 — every ${cut} search is blocked`);
  return record;
};

// ----- the search (both arms' 64 lanes in one job) -----

export const runSearch = async (cut: CutoffKey, resume = false) => {
  const file = searchFile(cut);
  const g = officialGuards(`search ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: that search is complete`);
  foldGuard(cut, `search ${cut}`);
  if (!isSealed(e2File(cut))) throw new Error(`search ${cut}: E2 is not sealed (the reproduction precedes the search)`);
  if (!readJson<{ identical: boolean }>(e2File(cut)).identical) throw new Error(`search ${cut}: E2 failed — blocked`);
  if (fs.existsSync(selectionFile(cut))) throw new Error(`search ${cut}: the selection exists`);

  const forecast = resume ? forecastOf(cut) : launchGuard(cut);
  const specs = researchSpecs(cut);
  const plan = specs.flatMap((s) => armKeys.map((a) => ({ spec: s, arm: arms[a] })));
  const spec = cutoffs[cut];
  const cap = plan.length * laneCap;
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-search`,
    resume,
    identity: definitionOf('search', {
      cutoff: cut,
      door: spec.door,
      arms: Object.fromEntries(armKeys.map((k) => [k, `${arms[k].policy.id}@${arms[k].policy.version}`])),
      cells,
      replicates,
      lanes: plan.map((p) => `${p.arm.key} ${p.spec.key}`),
      schedule: 'Assignment 3 broad lane (NL0 V-cell schedule)',
      laneCap
    }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official search ${cut}, both arms (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: cap,
    body: async (lab, ctx) => {
      ctx.job.event('phase', { head: g.head, forecast });

      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { results, rounds } = await runLanes(lab, plan, budgets.study.broad, laneCap, cap, finishReserve, `search ${cut}`);

      for (const r of results) if (r.result.requested > laneCap) throw new Error(`${r.result.key}: ${r.result.requested} requested > the lane bound ${laneCap}`);

      const byArm = Object.fromEntries(armKeys.map((a) => [a, results.filter((r) => r.arm === a).map((r) => r.result)])) as Record<ArmKey, LaneResult[]>;
      const compute = computeOf(lab, fresh0, hits0, t0);
      const record = {
        stage: 'search',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        role: spec.role,
        door: spec.door,
        arms: Object.fromEntries(armKeys.map((a) => [a, { policy: `${arms[a].policy.id}@${arms[a].policy.version}`, markedDdLimit: arms[a].markedDdLimit, nbInstrument: arms[a].nbInstrument }])),
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        branch: g.branch,
        lanesCount: plan.length,
        budget: budgets.study.broad,
        laneCap,
        cap,
        forecast,
        extensionRounds: rounds,
        lanes: byArm,
        requested: results.reduce((a, r) => a + r.result.requested, 0),
        requestedByArm: Object.fromEntries(armKeys.map((a) => [a, byArm[a].reduce((s, r) => s + r.requested, 0)])),
        compute,
        wallSeconds: compute.wallSeconds,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `search ${cut}`);
      log(`search ${cut}: sealed ${rel(file)} (${record.requested} requested, ${compute.fresh} fresh, ${compute.wallSeconds} s)`);
      return record;
    }
  });
};

// ----- qualification (the union of both arms' shortlists + the two benchmarks) -----

export const membersOf = (cut: CutoffKey) => {
  type M = Member & { shortlistedBy: Evidence['shortlistedBy'] };
  const byId = new Map<string, M>();
  const duplicates: { label: string; sameAs: string }[] = [];
  const add = (m: Member, by: Evidence['shortlistedBy'][number]) => {
    const id = cfgId(m.cfg);
    const prev = byId.get(id);

    if (prev) {
      prev.shortlistedBy.push(by);
      duplicates.push({ label: by.label, sameAs: prev.label });
    } else byId.set(id, { ...m, shortlistedBy: [by] });
  };
  const rec = readSealed<{ lanes: Record<ArmKey, LaneResult[]> }>(searchFile(cut));

  for (const armKey of armKeys)
    for (const l of rec.lanes[armKey])
      l.shortlist.forEach((p, i) => {
        const label = `${armKey} ${l.key}#${i + 1} ${p.pick}`;

        add({ label, lane: l.key, stage: 'broad', track: 'I', replicate: l.replicate, cfg: canonicalCfg(p.cfg), pick: p.pick }, { arm: armKey, label, lane: l.key, pick: p.pick });
      });
  for (const b of benchmarks())
    add({ label: b.label, lane: 'benchmark', stage: 'control', track: 'control', replicate: null, cfg: b.cfg, pick: b.why }, { arm: 'benchmark', label: b.label, lane: 'benchmark', pick: b.why });

  return { members: [...byId.values()], duplicates };
};

export const runQualify = async (cut: CutoffKey, resume = false) => {
  const file = qualificationFile(cut);
  const g = officialGuards(`qualify ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  if (!isSealed(searchFile(cut))) throw new Error(`qualify ${cut}: the search is not sealed`);
  if (fs.existsSync(selectionFile(cut))) throw new Error(`qualify ${cut}: the selection exists`);

  const { members, duplicates } = membersOf(cut);
  const b = bound();

  if (members.length > b.membersPerCutoff) throw new Error(`qualify ${cut}: ${members.length} members > the bound ${b.membersPerCutoff}`);

  const spec = cutoffs[cut];
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-qualify`,
    resume,
    identity: definitionOf('qualify', { cutoff: cut, door: spec.door, members: members.map((m) => ({ label: m.label, id: cfgId(m.cfg) })) }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official qualification ${cut} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: members.length * b.perMember,
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { evidence, requested } = await qualifyMembers(lab, members, cut);

      if (requested > members.length * b.perMember) throw new Error(`qualify ${cut}: ${requested} requested > the bound`);
      fs.mkdirSync(lotRowsDir, { recursive: true });
      fs.writeFileSync(path.join(lotRowsDir, `${cut}.json`), JSON.stringify(evidence.map((e) => ({ label: e.label, rows: e.risk.rows }))));

      const record = {
        stage: 'qualification',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        door: spec.door,
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        members: members.length,
        duplicates,
        requested,
        qualified: Object.fromEntries(armKeys.map((a) => [a, evidence.filter((e) => e.shortlistedBy.some((s) => s.arm === a) && e.arms[a].qualified).length])),
        evidence: evidence.map(sealedEvidence),
        compute: computeOf(lab, fresh0, hits0, t0),
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `qualify ${cut}`);
      log(`qualify ${cut}: ${members.length} members; sealed`);
      return record;
    }
  });
};

// ----- selection (no evaluation): lane values, the paired statistic, pooled selectors; committed before the next door -----

export const runSelect = (cut: CutoffKey) => {
  const file = selectionFile(cut);

  requireStandardAdoption(researchDir, { repoRoot });
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);

  const q = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut));

  assertCommitted(qualificationFile(cut));

  const s = readSealed<{ lanes: Record<ArmKey, LaneResult[]> }>(searchFile(cut));
  const lanesOf = (a: ArmKey) => s.lanes[a].map((l) => ({ key: l.key, cell: l.structure, replicate: l.replicate, shortlisted: l.shortlist.length }));
  const values = Object.fromEntries(armKeys.map((a) => [a, laneValues(q.evidence, a, lanesOf(a))])) as Record<ArmKey, ReturnType<typeof laneValues>>;
  const pairs = pairsOf(cut, values.CTRL, values.EXP30);
  const primary = primaryOf(cut, pairs);
  const sel = Object.fromEntries(armKeys.map((a) => [a, selectArm(q.evidence, a)])) as Record<ArmKey, ReturnType<typeof selectArm>>;
  const net = (label: string | null | undefined, a: ArmKey) => (label ? q.evidence.find((e) => e.shortlistedBy.some((b) => b.arm === a && b.label === label))!.centre.net : null);
  const p0 = { CTRL: net(sel.CTRL.primaries.P0, 'CTRL'), EXP30: net(sel.EXP30.primaries.P0, 'EXP30') };
  const pooledDelta = p0.CTRL === null || p0.EXP30 === null ? null : p0.EXP30 - p0.CTRL;

  // the interval subjects: every lane representative, the pooled primaries, the benchmarks (one row per configuration)
  type Role = { arm: ArmKey; kind: 'lane'; lane: string } | { arm: ArmKey; kind: 'pooled'; selector: SelectorName };
  const subjects: Record<string, { label: string; id: string; roles: Role[]; evidence: unknown }> = {};
  const addSubject = (id: string, label: string, role: Role) => {
    const e = q.evidence.find((x) => x.id === id)!;

    (subjects[id] ??= { label, id, roles: [], evidence: sealedEvidence(e) }).roles.push(role);
  };

  for (const a of armKeys) for (const v of values[a]) if (v.representative) addSubject(v.representative.id, v.representative.label, { arm: a, kind: 'lane', lane: v.lane });
  for (const a of armKeys)
    for (const sn of selectorsOf(a)) {
      const label = sel[a].primaries[sn];

      if (!label) continue;

      const e = q.evidence.find((x) => x.shortlistedBy.some((b) => b.arm === a && b.label === label))!;

      addSubject(e.id, label, { arm: a, kind: 'pooled', selector: sn });
    }

  const bench = q.evidence.filter((e) => e.shortlistedBy.some((b) => b.arm === 'benchmark'));
  const record = {
    stage: 'selection',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    cutoff: cut,
    role: cutoffs[cut].role,
    qualification: { file: rel(qualificationFile(cut)), sha256: sha256File(qualificationFile(cut)) },
    search: { file: rel(searchFile(cut)), sha256: sha256File(searchFile(cut)) },
    laneValues: values,
    pairs,
    primary,
    pooled: { arms: sel, p0CentreNet: p0, delta: pooledDelta },
    subjects: Object.values(subjects),
    benchmarks: bench.map((e) => ({ label: e.label, id: e.id, arms: { CTRL: e.arms.CTRL.qualified, EXP30: e.arms.EXP30.qualified }, evidence: sealedEvidence(e) })),
    finished: new Date().toISOString()
  };

  seal(file, record, `selection ${cut}`);
  log(`selection ${cut}: sealed (${pairs.length} pairs; ${Object.keys(subjects).length} interval subjects)`);
  return record;
};

// the frozen-selection manifest (after the C24 selection): every fold's selection and interval, the validation plan
export const runFreezeSelection = () => {
  if (fs.existsSync(frozenSelectionFile)) throw new Error('FROZEN_SELECTION.json exists');
  for (const c of cutoffKeys) {
    if (!isSealed(selectionFile(c))) throw new Error(`the ${c} selection is not sealed`);
    assertCommitted(selectionFile(c));
  }
  for (const c of ['C19', 'C21'] as const) {
    if (!isSealed(intervalFile(c))) throw new Error(`the ${c} interval is not sealed`);
    assertCommitted(intervalFile(c));
  }

  const record = {
    kind: 'Stage B frozen selection manifest',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    frozenAt: new Date().toISOString(),
    head: headCommit(),
    codeDigest: codeDigest(),
    selections: cutoffKeys.map((c) => ({ cutoff: c, file: rel(selectionFile(c)), sha256: sha256File(selectionFile(c)) })),
    intervals: (['C19', 'C21'] as const).map((c) => ({ cutoff: c, file: rel(intervalFile(c)), sha256: sha256File(intervalFile(c)) })),
    validationPlan: {
      door: 'FULL',
      interval: cutoffs.C24.slice,
      boundary: cutoffs.C24.end,
      subjects: 'the C24 interval subjects of selection/C24.json (every lane representative of both arms, the pooled primaries) and the two descriptive benchmarks',
      evaluations: 'per subject: the detailed centre and the centre with the 2024-12-31 boundary, the six frozen stresses, the selection family 2 × 128 regenerated exactly — every one with the risk envelope (PROTOCOL.md §9)',
      once: true,
      label: 'retrospective, previously inspected history (2025–2026 examined by many studies); never a pristine holdout'
    }
  };

  seal(frozenSelectionFile, record, 'frozen selection');
  return record;
};

export const runAuthorizeFull = () => {
  if (fs.existsSync(fullAuthorizationFile)) throw new Error('the FULL authorization exists');
  for (const f of [selectionFile('C24'), frozenSelectionFile]) {
    if (!isSealed(f)) throw new Error(`${rel(f)} is not sealed`);
    assertCommitted(f);
  }

  const record = {
    kind: 'FULL door authorization',
    t: new Date().toISOString(),
    head: headCommit(),
    authority: 'brief §4 ("Precommit and seal each cutoff\'s selected candidates and execution/data identities before opening its subsequent interval. Preserve the single-opening and seal/commit data-door discipline")',
    frozenSelection: { file: rel(frozenSelectionFile), sha256: sha256File(frozenSelectionFile) },
    c24Selection: { file: rel(selectionFile('C24')), sha256: sha256File(selectionFile('C24')) },
    once: 'the official validation job opens FULL once; afterwards only report-only CPU diagnostics of the same frozen subjects'
  };

  seal(fullAuthorizationFile, record, 'FULL authorization');
  return record;
};

// ----- the next interval (C19 → D21, C21 → D23) and the validation (C24 → FULL, once) -----

export const runInterval = async (cut: CutoffKey, resume = false) => {
  const file = intervalFile(cut);
  const spec = cutoffs[cut];
  const g = officialGuards(`${spec.sliceStage} ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: the ${spec.sliceStage} is sealed`);

  type Subject = { label: string; id: string; roles: unknown[]; evidence: Evidence };
  const sel = readSealed<{ subjects: Subject[]; benchmarks: Subject[] }>(selectionFile(cut));

  assertCommitted(selectionFile(cut));

  const subjects = [
    ...sel.subjects.map((s) => ({ label: s.label, id: s.id, roles: s.roles, kind: 'selected' as const, cfg: canonicalCfg(s.evidence.cfg), selectTail: s.evidence.selectTail })),
    ...sel.benchmarks.map((s) => ({ label: s.label, id: s.id, roles: [] as unknown[], kind: 'benchmark' as const, cfg: canonicalCfg(s.evidence.cfg), selectTail: s.evidence.selectTail }))
  ];
  const b = bound();

  if (subjects.length > b.subjectsPerCutoff) throw new Error(`${cut}: ${subjects.length} subjects > the bound ${b.subjectsPerCutoff}`);

  const opts = { ...vOptions, boundaries: [spec.end] };
  const t0 = Date.now();

  return withOfficialJob({
    job: cut === 'C24' ? 'C24-validation' : `${cut}-interval`,
    resume,
    identity: definitionOf(spec.sliceStage, { cutoff: cut, door: spec.sliceDoor, interval: spec.slice, boundary: spec.end, subjects: subjects.map((s) => s.id) }),
    door: spec.sliceDoor,
    use: cut === 'C24' ? 'validation' : 'interval',
    doorPurpose: `official ${spec.sliceStage} ${cut} → ${spec.slice.join('…')} (${PROTOCOL_ID})`,
    maxFresh: subjects.length * b.perSubject,
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      type It = { cfg: Cfg; options: typeof opts; detail?: boolean; risk: true };
      const plans = subjects.map((s) => {
        const draws = [1, 2].flatMap((rep) => drawsOf(s.cfg, famOf('select', ['select', rep, cut], 'joint', 1, fidelity.n)));
        const seen = new Set<string>();
        const unique = draws.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
        const items: It[] = [
          { cfg: s.cfg, options: opts, detail: true, risk: true },
          { cfg: s.cfg, options: opts, risk: true },
          ...Object.values(stresses).map((f) => ({ cfg: s.cfg, options: { ...opts, friction: { ...f } }, risk: true as const })),
          ...unique.map((d) => ({ cfg: d.cfg, options: opts, risk: true as const }))
        ];

        return { s, unique, items };
      });
      const items = plans.flatMap((p) => p.items);

      if (items.length > subjects.length * b.perSubject) throw new Error(`${cut}: ${items.length} requested > the bound`);

      const recs = await lab.evalMany<SRec>(items, `${spec.sliceStage} ${cut}`);
      let at = 0;
      const limits = { dd35: arms.CTRL.markedDdLimit, dd40: arms.EXP30.markedDdLimit };
      const rows = plans.map((p) => {
        const detail = recs[at++]! as DRec;
        const centre = recs[at++]!;
        const st: Record<string, { sliceNet: number; sliceDd: number; wholeNet: number; wholeDd: number }> = {};

        for (const name of Object.keys(stresses)) {
          const r = recs[at++]!;

          st[name] = { sliceNet: r.periods[0]!.after, sliceDd: r.periods[0]!.dd, wholeNet: r.net, wholeDd: r.dd };
        }

        const nb = p.unique.map(() => recs[at++]!);

        if (centre.net !== detail.net || centre.signature !== detail.signature) throw new Error(`${p.s.label}: detailed centre differs`);

        const period = centre.periods[0]!;
        const rows0 = detail.risk.rows;
        const after = (d: string) => d > spec.end;
        const nextLots = rows0.filter((x) => after(x.entry));
        const carried = rows0.filter((x) => !after(x.entry) && (x.exit === null || after(x.exit)));
        const maes = nextLots.map((x) => x.mae).sort((a, c) => a - c);
        const env = checkEnvelope((centre as SRec & { envelope?: unknown }).envelope, `${p.s.label} centre`);
        const sliceDds = nb.map((r) => r.periods[0]!.dd).sort((a, c) => a - c);
        const sliceNets = nb.map((r) => r.periods[0]!.after).sort((a, c) => a - c);
        const breaches = (lim: number) => {
          const k = sliceDds.filter((d) => d > lim).length;

          return { breaches: k, share: k / Math.max(1, sliceDds.length), wilson95: wilson(k, sliceDds.length) };
        };

        return {
          label: p.s.label,
          id: p.s.id,
          kind: p.s.kind,
          roles: p.s.roles,
          cell: p.s.cfg.cell,
          sliceNet: period.after,
          sliceDd: period.dd,
          boundaryEquity: period.equity,
          wholeNet: centre.net,
          wholeDd: centre.dd,
          wholeEnvelope: env,
          wholeAssessment: { CTRL: assessArm(centre, asPilotArm(arms.CTRL)).pass, EXP30: assessArm(centre, asPilotArm(arms.EXP30)).pass },
          years: centre.years,
          lots: centre.lots,
          openAtBoundary: carried.map((x) => ({ book: x.book, entry: x.entry, exit: x.exit, reason: x.reason, net: x.net, mae: x.mae })),
          nextInterval: {
            lots: nextLots.length,
            byBook: Object.fromEntries(['D1:GDX', 'D1:VGT', 'G:VGT'].map((bk) => [bk, nextLots.filter((x) => x.book === bk).length])),
            worstLotMae: maes.length ? maes[0]! : null,
            maxPrincipalLossMarked: maes.length ? Math.max(0, -maes[0]!) : 0,
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
            above35pctC0: breaches(limits.dd35),
            above40pctC0: breaches(limits.dd40),
            trainingBreachShare: p.s.selectTail.breachShare
          }
        };
      });
      const record = {
        stage: spec.sliceStage,
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        door: spec.sliceDoor,
        interval: spec.slice,
        boundary: spec.end,
        basis:
          'one continuous run from 2016-01-04 (state, open lots and marks preserved); interval P&L = the change of the marked net from the boundary close; interval DD = the strict tracker restarted at the boundary close (peak = the marked net there); whole-run figures beside it; the envelope is a whole-run statistic',
        label: 'retrospective, previously inspected history — never a pristine holdout or independent future validation',
        selection: { file: rel(selectionFile(cut)), sha256: sha256File(selectionFile(cut)) },
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        requested: items.length,
        rows,
        compute: computeOf(lab, fresh0, hits0, t0),
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `${spec.sliceStage} ${cut}`);
      log(`${spec.sliceStage} ${cut}: ${rows.length} rows sealed (${items.length} requested)`);
      return record;
    }
  });
};

