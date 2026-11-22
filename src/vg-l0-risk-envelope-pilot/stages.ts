// The pilot's stages (PROTOCOL.md §12), each an OFFICIAL GPU job of its own (src/gpu-jobs/jobs.ts openJob →
// src/gpu-backend/official.ts openOfficialGpuSession → GpuPool → EvalLab; no CPU path), each writing one sealed record:
//
//   1  search C21 --arm CTRL   job C21-search (new)     D21   Assignment 3's 4 lanes (GA0.VA0, GB0.VD1 × R1, R2) under CTRL
//   2  search C24 --arm CTRL   job C24-search (new)     D24
//   3  e2                      (no evaluation)                CTRL lanes = Assignment 3's sealed lanes (envelopes stripped)
//   4  search C21 --arm EXP    job C21-search (resume)  D21   the same 4 lanes, seeds and schedules under EXP
//   5  search C24 --arm EXP    job C24-search (resume)  D24
//   6  qualify C21 / C24       jobs C21-qualify / C24-qualify   the union of both arms' shortlists + New L0 + N/original
//   7  select C21              (no evaluation)                P0 / RA1 per arm → sealed, COMMITTED before D23 opens
//   8  slice C21               job C21-slice            D23   2022-01-03 → 2023-12-29 (retrospective)
//   9  select C24 + freeze     (no evaluation)                sealed C24 selection and FROZEN_SELECTION.json, committed
//   10 authorize-full          (no evaluation)                the FULL door authorization record, committed
//   11 validate                job C24-validation       FULL  2025-01-02 → 2026-10-30, ONCE (retrospective)
//
// Guards of every official stage: the study preflight (standard 3.0.0, gpu-required), the sealed and committed protocol
// freeze with the frozen code digest, the sealed and committed engineering gates (E1, E3–E6 passed), no uncommitted change
// to the code closure or the protocol documents, the deterministic budget bound ≤ 700,000, the stage order. A stage whose
// record exists refuses to rerun; an interrupted job resumes from its archive (the same command with --resume).
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
import { type Cfg, canonicalCfg, cellOf, cfgId, legacyCellId, project } from '../vg-l0-full-joint/space.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import { RE_EXPERIMENTAL } from '../risk-envelope/policy.ts';
import {
  type ArmKey,
  type CutoffKey,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  STUDY_ID,
  armKeys,
  arms,
  cells,
  cutoffs,
  engineeringFile,
  execution,
  freezeFile,
  log,
  r2,
  replicates,
  repoRoot,
  researchDir,
  resultsDir
} from './context.ts';
import { assertBound, bound, finishReserve, laneCap } from './budget.ts';
import { Lane, type LaneResult, type LaneSpec } from './search.ts';
import { type Evidence, type Member, qualifyMembers } from './qualify.ts';
import { type SelectorName, selectArm, selectorsOf } from './select.ts';
import { assessArm } from './fitness.ts';
import { fullAuthorizationFile, frozenSelectionFile, openPilotDoor, selectionFile, validationFile } from './doors.ts';
import {
  assertCommitted,
  branchName,
  codeDigest,
  dirtyCode,
  headCommit,
  isSealed,
  plain,
  readJson,
  readSealed,
  rel,
  seal,
  sha256File
} from './records.ts';

// ----- files -----

export const searchFile = (cut: CutoffKey, arm: ArmKey) => path.join(resultsDir, 'search', cut, `${arm}.json`);
export const e2File = path.join(resultsDir, 'engineering', 'E2-ctrl-equals-assignment3.json');
export const qualificationFile = (cut: CutoffKey) => path.join(resultsDir, 'qualification', `${cut}.json`);
export const e2QualificationFile = (cut: CutoffKey) => path.join(resultsDir, 'engineering', `E2-qualification-${cut}.json`);
export const sliceFile = (cut: CutoffKey) => (cut === 'C21' ? path.join(resultsDir, 'slices', 'C21-slice.json') : validationFile);
export const lotRowsDir = path.join(researchDir, 'cache', 'lot-rows');
export const studyDocs = [
  'research/vg-l0-risk-envelope-pilot/PROTOCOL.md',
  'research/vg-l0-risk-envelope-pilot/AMENDMENTS.md',
  'research/vg-l0-risk-envelope-pilot/STANDARD_ADOPTION.json',
  'research/vg-l0-risk-envelope-pilot/DECISION_REGISTER.md'
];

// Assignment 3's sealed records (read only; their sha256 are pinned in the protocol freeze)
export const a3Dir = path.join(repoRoot, 'research', 'vg-l0-full-joint');
export const a3SearchFile = (cut: CutoffKey) => path.join(a3Dir, 'results', 'search', cut, 'broad1.json');
export const a3QualificationFiles = (cut: CutoffKey) =>
  ['broad', 'refine', ...(cut === 'C24' ? ['informed'] : [])].map((s) => path.join(a3Dir, 'results', 'folds', cut, `${s}-qualification.json`));
export const a3FrozenSelection = path.join(a3Dir, 'FROZEN_SELECTION.json');

// ----- the lanes (Assignment 3's broad lanes of the two cells; seed key = lane key; the arm never enters it) -----

export const laneSpecs = (cut: CutoffKey): LaneSpec[] =>
  cells.flatMap((id) =>
    replicates.map((r) => {
      const key = `${cut}/broad/${id}/R${r}`;

      return { key, seedKey: key, position: key, stage: 'broad' as const, replicate: r, cutoff: cut, kind: 'indep' as const, res: 'coarse' as const, cell: cellOf(id) };
    })
  );

// ----- the benchmarks (descriptive, frozen; never selectable, never injected into a search: D-7) -----

export const newL0Cfg = (): Cfg => project(incumbents().NL0.quad, cellOf(legacyCellId), { GDX: {}, VGT: {} }, { GDX: false, VGT: false });
export const nOriginalLabel = 'C24/informed/GD.VB/R2#1 profit';
export const nOriginalCfg = (): Cfg => {
  const fs0 = readJson<{ finalists: { label: string; id: string; cfg: Cfg }[] }>(a3FrozenSelection);
  const f = fs0.finalists.find((x) => x.label === nOriginalLabel);

  if (!f) throw new Error(`N/original (${nOriginalLabel}) is not in Assignment 3's FROZEN_SELECTION.json`);

  const cfg = canonicalCfg(f.cfg);

  if (cfgId(cfg) !== f.id) throw new Error(`N/original's identity ${cfgId(cfg)} ≠ the sealed ${f.id}`);
  return cfg;
};
export const benchmarks = () => [
  { key: 'New L0', label: 'benchmark: New L0', cfg: newL0Cfg(), why: 'frozen New L0 (5B informed lane; chosen with later data)' },
  { key: 'N/original', label: 'benchmark: N/original', cfg: nOriginalCfg(), why: `Assignment 3's N/original primary ${nOriginalLabel} (informed; chosen with 2016–2024 in view)` }
];

// ----- guards -----

interface Freeze {
  protocol: { sha256: string };
  codeDigest: string;
  acceptanceSha256: string;
}

// code amendments (sealed, committed records results/amendments/<id>.json, each {from, to} chained from the frozen digest)
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
  // the code closure must be the frozen one, or the target of a sealed, committed code amendment chained from it
  // (AMENDMENTS.md; results/amendments/<id>.json — `code-amendment`)
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
  doorPurpose: string;
  validation?: boolean;
  maxFresh: number;
  body: (lab: EvalLab, ctx: { job: JobContext; door: Door; attestation: string; backend: string }) => Promise<T>;
  completeWhenDone: boolean;
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
    const door = await openPilotDoor(o.door, o.doorPurpose, { validation: o.validation });
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
    const doorPin =
      o.door === 'FULL'
        ? `GDX:${door.sym.GDX.dataSha256},VGT:${door.sym.VGT.dataSha256}`
        : `GDX:${pins!.pins.GDX!.sha256},VGT:${pins!.pins.VGT!.sha256}`;

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
    if (o.completeWhenDone) job.complete({ stage: o.identity.stage as string });
    job.release(o.completeWhenDone ? 'complete' : 'phase complete');
    return out;
  } catch (error) {
    const why = (error as Error).message.split('\n')[0]!.slice(0, 200);

    await lab?.close(error instanceof StopRequested ? `stopped: ${why}` : `failed: ${why}`).catch(() => undefined);
    job.release(`${error instanceof StopRequested ? 'stopped' : 'failed'}: ${why}`);
    throw error;
  }
};

// ----- the search phases -----

const dropEnvelopes = (x: unknown): unknown => {
  if (Array.isArray(x)) return x.map(dropEnvelopes);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'envelope').map(([k, v]) => [k, dropEnvelopes(v)]));
  return x;
};
export const stripEnvelopes = (x: unknown) => dropEnvelopes(plain(x));

// One arm's lanes in one Lab: base islands, Assignment 3's extension rounds at barriers (one lane per position; the
// resource guard kept, non-binding: AD7), finishing — Assignment 3's stages.ts runSearch loop, unchanged.
export const runLanes = async (
  lab: EvalLab,
  specs: readonly LaneSpec[],
  budget: (typeof budgets)['study']['broad'],
  arm: (typeof arms)[ArmKey],
  laneBound: number,
  cap: number,
  reserve: number,
  stageName: string
) => {
  const lanes = specs.map((s) => new Lane(lab, s, budget, arm, laneBound));
  const requested = () => lanes.reduce((a, l) => a + l.requested, 0);
  const rounds: { round: number; positions: { position: string; fired: boolean; extended: boolean; atCap: boolean }[]; requestedBefore: number; worstCase: number; decision: string }[] = [];

  lab.stage = `${stageName}: base (${lanes.length} lanes)`;
  await Promise.all(lanes.map((l) => l.base()));

  const stops = new Map<string, string>();

  for (let round = 1; ; round++) {
    const live = lanes.filter((l) => !stops.has(l.spec.position));

    if (!live.length) break;

    const row = { round, positions: [] as (typeof rounds)[number]['positions'], requestedBefore: requested(), worstCase: 0, decision: '' };
    const go: Lane[] = [];

    for (const l of live) {
      const fired = l.lastTrigger?.fired ?? false;
      const atCap = l.atCap;

      row.positions.push({ position: l.spec.position, fired, extended: fired && !atCap, atCap });
      if (!fired) stops.set(l.spec.position, 'triggers not met');
      else if (atCap) stops.set(l.spec.position, 'extension cap reached (a trigger still fired: budget-bound, not converged)');
      else go.push(l);
    }
    row.worstCase = go.reduce((a, l) => a + l.islandWorstCase, 0);
    if (go.length && requested() + row.worstCase + reserve * lanes.length > cap) {
      for (const l of go) stops.set(l.spec.position, 'resource guard (the job cap on fresh simulations)');
      row.decision = `resource guard: ${requested()} requested + worst case ${row.worstCase} + finishing reserve ${reserve * lanes.length} > cap ${cap}`;
      rounds.push(row);
      break;
    }
    row.decision = go.length ? `extend ${go.length} lane(s)` : 'no lane extends';
    rounds.push(row);
    if (!go.length) break;
    lab.stage = `${stageName}: extension round ${round} (${go.length} lanes)`;
    lab.checkpoint({ [`extension ${arm.key}`]: { round, extending: go.map((l) => l.spec.key) } });
    await Promise.all(go.map((l) => l.extend()));
  }

  lab.stage = `${stageName}: finishing`;

  const results: LaneResult[] = await Promise.all(lanes.map((lane) => lane.finish(stops.get(lane.spec.position) ?? 'triggers not met')));

  return { results, rounds };
};

export const runSearch = async (cut: CutoffKey, armKey: ArmKey, resume = false) => {
  const file = searchFile(cut, armKey);
  const g = officialGuards(`search ${cut} ${armKey}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: that search is complete`);
  if (armKey === 'EXP') {
    for (const c of ['C21', 'C24'] as const) if (!isSealed(searchFile(c, 'CTRL'))) throw new Error(`EXP search: the ${c} CTRL phase is not sealed (E2 precedes every EXP evaluation)`);
    if (!isSealed(e2File)) throw new Error('EXP search: the E2 record is not sealed');
    assertCommitted(e2File);
    if (!readJson<{ identical: boolean }>(e2File).identical) throw new Error('EXP search: E2 failed (CTRL ≠ Assignment 3): every EXP evaluation is blocked');
  }
  if (fs.existsSync(selectionFile('C21')) || fs.existsSync(selectionFile('C24'))) throw new Error('a selection exists: no search may follow it');

  const arm = arms[armKey];
  const specs = laneSpecs(cut);
  const budget = budgets.study.broad;
  const cap = specs.length * laneCap;
  const spec = cutoffs[cut];
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-search`,
    // the CTRL phase creates the job; the EXP phase continues the same job (same identity, archive and door)
    resume: armKey === 'EXP' || resume,
    identity: definitionOf('search', {
      cutoff: cut,
      door: spec.door,
      arms: Object.fromEntries(armKeys.map((k) => [k, `${arms[k].policy.id}@${arms[k].policy.version}`])),
      phases: ['CTRL', 'EXP'],
      cells,
      replicates,
      schedule: 'Assignment 3 broad lane (NL0 V-cell schedule)',
      laneCap
    }),
    door: spec.door,
    doorPurpose: `official search ${cut} ${armKey} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: 2 * cap,
    completeWhenDone: armKey === 'EXP',
    body: async (lab, ctx) => {
      ctx.job.event('phase', { arm: armKey, head: g.head });

      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { results, rounds } = await runLanes(lab, specs, budget, arm, laneCap, cap, finishReserve, `search ${cut} ${armKey}`);

      for (const r of results) if (r.requested > laneCap) throw new Error(`${r.key}: ${r.requested} requested > the lane bound ${laneCap}`);

      const record = {
        stage: 'search',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        arm: armKey,
        policy: `${arm.policy.id}@${arm.policy.version}`,
        markedDdLimit: arm.markedDdLimit,
        door: spec.door,
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        branch: g.branch,
        lanesCount: specs.length,
        budget,
        laneCap,
        cap,
        extensionRounds: rounds,
        lanes: results,
        requested: results.reduce((a, r) => a + r.requested, 0),
        phaseCompute: { fresh: lab.fresh - fresh0, archiveHits: lab.hits - hits0, tallies: lab.tallies },
        compute: lab.compute,
        codeDigest: lab.digest,
        minutes: Math.round((Date.now() - t0) / 600) / 100,
        finished: new Date().toISOString()
      };

      seal(file, record, `search ${cut} ${armKey}`);
      log(`search ${cut} ${armKey}: sealed ${rel(file)} (${record.requested} requested, ${record.phaseCompute.fresh} fresh)`);
      return record;
    }
  });
};

// ----- E2: the CTRL lanes = Assignment 3's sealed lanes (no evaluation) -----

export const runE2 = () => {
  if (fs.existsSync(e2File)) throw new Error(`${rel(e2File)} exists`);

  const rows: { cutoff: CutoffKey; lane: string; identical: boolean; differences: { path: string }[]; requested: [number, number] }[] = [];

  for (const cut of ['C21', 'C24'] as const) {
    const mine = readSealed<{ lanes: LaneResult[] }>(searchFile(cut, 'CTRL'));
    const sealed = readSealed<{ lanes: LaneResult[] }>(a3SearchFile(cut));

    for (const l of mine.lanes) {
      const ref = sealed.lanes.find((x) => x.key === l.key);

      if (!ref) throw new Error(`${l.key}: no sealed Assignment 3 lane`);

      const diffs = deepDiff(ref, stripEnvelopes(l), '$', [], 40);

      rows.push({ cutoff: cut, lane: l.key, identical: diffs.length === 0, differences: diffs.map((d) => ({ path: d.path })), requested: [ref.requested, l.requested] });
    }
  }

  const record = {
    gate: 'E2',
    what: 'every CTRL pilot lane (official GPU, risk envelope requested on every evaluation) equals the corresponding sealed Assignment 3 lane result (screen and promotion counts, islands and trigger logs, rung fits, refinement paths, shortlists with their records, frontiers, failure reasons) after removing the envelope fields',
    sealedReferences: (['C21', 'C24'] as const).map((c) => ({ file: rel(a3SearchFile(c)), sha256: sha256File(a3SearchFile(c)) })),
    pilotRecords: (['C21', 'C24'] as const).map((c) => ({ file: rel(searchFile(c, 'CTRL')), sha256: sha256File(searchFile(c, 'CTRL')) })),
    lanes: rows,
    identical: rows.length === 8 && rows.every((r) => r.identical),
    finished: new Date().toISOString()
  };

  seal(e2File, record, 'E2 CTRL = Assignment 3');
  log(`E2: ${record.identical ? 'IDENTICAL' : 'DIFFERENT'} (${rows.filter((r) => r.identical).length}/${rows.length} lanes)`);
  if (!record.identical) throw new Error('E2 failed: the CTRL lanes differ from Assignment 3 — stop');
  return record;
};

// ----- qualification (the union of both arms' shortlists + the two benchmarks) -----

// the sealed form of an evidence row: the per-lot rows stay in the cache; idempotent (amendment A1: a row read back from a
// sealed qualification record has no rows any more and keeps its rowsKept)
export const sealedEvidence = (e: Evidence) => {
  const risk = e.risk as Evidence['risk'] & { rowsKept?: number };

  return { ...e, risk: { ...risk, rows: undefined, rowsKept: risk.rows ? risk.rows.length : risk.rowsKept } };
};

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

  for (const armKey of armKeys) {
    const rec = readSealed<{ lanes: LaneResult[] }>(searchFile(cut, armKey));

    for (const l of rec.lanes)
      l.shortlist.forEach((p, i) => {
        const label = `${armKey} ${l.key}#${i + 1} ${p.pick}`;

        add(
          { label, lane: l.key, stage: 'broad', track: 'I', replicate: l.replicate, cfg: canonicalCfg(p.cfg), pick: p.pick },
          { arm: armKey, label, lane: l.key, pick: p.pick }
        );
      });
  }
  for (const b of benchmarks())
    add({ label: b.label, lane: 'benchmark', stage: 'control', track: 'control', replicate: null, cfg: b.cfg, pick: b.why }, { arm: 'benchmark', label: b.label, lane: 'benchmark', pick: b.why });

  return { members: [...byId.values()], duplicates };
};

export const runQualify = async (cut: CutoffKey) => {
  const file = qualificationFile(cut);
  const g = officialGuards(`qualify ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  for (const c of ['C21', 'C24'] as const) for (const a of armKeys) if (!isSealed(searchFile(c, a))) throw new Error(`qualify ${cut}: the ${c} ${a} search is not sealed`);
  if (fs.existsSync(selectionFile(cut))) throw new Error(`qualify ${cut}: the selection exists`);

  const { members, duplicates } = membersOf(cut);
  const b = bound();

  if (members.length > b.membersPerCutoff) throw new Error(`qualify ${cut}: ${members.length} members > the bound ${b.membersPerCutoff}`);

  const spec = cutoffs[cut];

  return withOfficialJob({
    job: `${cut}-qualify`,
    resume: process.argv.includes('--resume'),
    identity: definitionOf('qualify', { cutoff: cut, door: spec.door, members: members.map((m) => ({ label: m.label, id: cfgId(m.cfg) })) }),
    door: spec.door,
    doorPurpose: `official qualification ${cut} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: members.length * b.perMember,
    completeWhenDone: true,
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
        phaseCompute: { fresh: lab.fresh - fresh0, archiveHits: lab.hits - hits0, tallies: lab.tallies },
        compute: lab.compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `qualify ${cut}`);
      log(`qualify ${cut}: ${members.length} members; qualified ${JSON.stringify(record.qualified)}; sealed`);
      return record;
    }
  });
};

// E2 (qualification part): every CTRL member's evidence = Assignment 3's sealed evidence of the same configuration at the
// same cutoff (same draws, same code), envelope fields and the pilot's additions removed — no evaluation
export const e2QualFields = ['id', 'cfg', 'centre', 'risk', 'select', 'selectTail', 'confirm', 'confirmTail', 'confirmReps', 'confirmDraws', 'selectDraws', 'stress', 'removal', 'gates', 'qualified', 'failed', 'severity', 'participation'] as const;

export const runE2Qualification = (cut: CutoffKey) => {
  const file = e2QualificationFile(cut);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);

  const mine = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut)).evidence;
  const a3 = new Map<string, Record<string, unknown>>();

  for (const f of a3QualificationFiles(cut)) for (const e of readSealed<{ evidence: (Record<string, unknown> & { id: string })[] }>(f).evidence) if (!a3.has(e.id)) a3.set(e.id, e);

  const pick = (e: Record<string, unknown>) => Object.fromEntries(e2QualFields.map((k) => [k, e[k]]));
  const rows = mine
    .filter((e) => e.shortlistedBy.some((s) => s.arm === 'CTRL' || s.arm === 'benchmark'))
    .map((e) => {
      const ref = a3.get(e.id);

      if (!ref) return { label: e.label, id: e.id, compared: false, identical: null as boolean | null, differences: [] as { path: string }[] };

      const diffs = deepDiff(pick(ref), stripEnvelopes(pick(e as unknown as Record<string, unknown>)), '$', [], 40);

      return { label: e.label, id: e.id, compared: true, identical: diffs.length === 0, differences: diffs.map((d) => ({ path: d.path })) };
    });
  const compared = rows.filter((r) => r.compared);
  const record = {
    gate: 'E2 (qualification)',
    cutoff: cut,
    what: 'every CTRL-shortlisted member and benchmark whose configuration Assignment 3 qualified at this cutoff has evidence identical to Assignment 3’s sealed evidence (centre, detailed centre, selection and confirmation families, stresses, removals, gates), envelope fields removed',
    references: a3QualificationFiles(cut).map((f) => ({ file: rel(f), sha256: sha256File(f) })),
    rows,
    compared: compared.length,
    identical: compared.length > 0 && compared.every((r) => r.identical),
    finished: new Date().toISOString()
  };

  seal(file, record, `E2 qualification ${cut}`);
  log(`E2 qualification ${cut}: ${compared.filter((r) => r.identical).length}/${compared.length} identical (${rows.length - compared.length} without an Assignment 3 reference)`);
  if (!record.identical) throw new Error(`E2 qualification ${cut} failed — stop`);
  return record;
};

// ----- selection (no evaluation): sealed and committed before the next door opens -----

export const runSelect = (cut: CutoffKey) => {
  const file = selectionFile(cut);

  requireStandardAdoption(researchDir, { repoRoot });
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  if (cut === 'C24' && !isSealed(sliceFile('C21'))) throw new Error('select C24: the C21 next-interval record is not sealed (the C21 fold completes first)');

  const q = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut));

  assertCommitted(qualificationFile(cut));

  const sel = Object.fromEntries(armKeys.map((a) => [a, selectArm(q.evidence, a)])) as Record<ArmKey, ReturnType<typeof selectArm>>;
  const subjects: Record<string, { label: string; id: string; roles: { arm: ArmKey; selector: SelectorName }[]; evidence: unknown }> = {};

  for (const a of armKeys)
    for (const s of selectorsOf(a)) {
      const label = sel[a].primaries[s];

      if (!label) continue;

      const e = q.evidence.find((x) => x.shortlistedBy.some((b) => b.label === label))!;
      const key = e.id;

      (subjects[key] ??= { label: e.label, id: e.id, roles: [], evidence: sealedEvidence(e) }).roles.push({ arm: a, selector: s });
    }

  const bench = q.evidence.filter((e) => e.shortlistedBy.some((b) => b.arm === 'benchmark'));
  const record = {
    stage: 'selection',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    cutoff: cut,
    qualification: { file: rel(qualificationFile(cut)), sha256: sha256File(qualificationFile(cut)) },
    arms: sel,
    // the distinct primaries (one row per configuration, every selector that chose it attributed) — the next-interval
    // subjects together with the two descriptive benchmarks
    subjects: Object.values(subjects),
    benchmarks: bench.map((e) => ({ label: e.label, id: e.id, arms: { CTRL: e.arms.CTRL.qualified, EXP: e.arms.EXP.qualified }, evidence: sealedEvidence(e) })),
    finished: new Date().toISOString()
  };

  seal(file, record, `selection ${cut}`);
  log(`selection ${cut}: ${JSON.stringify(Object.fromEntries(armKeys.map((a) => [a, sel[a].primaries])))}`);
  return record;
};

// the frozen-selection manifest (after the C24 selection): both cutoffs' selections, the validation access plan
export const runFreezeSelection = () => {
  if (fs.existsSync(frozenSelectionFile)) throw new Error('FROZEN_SELECTION.json exists');
  for (const c of ['C21', 'C24'] as const) {
    if (!isSealed(selectionFile(c))) throw new Error(`the ${c} selection is not sealed`);
    assertCommitted(selectionFile(c));
  }

  const record = {
    kind: 'risk-envelope pilot frozen selection manifest',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    frozenAt: new Date().toISOString(),
    head: headCommit(),
    codeDigest: codeDigest(),
    selections: (['C21', 'C24'] as const).map((c) => ({ cutoff: c, file: rel(selectionFile(c)), sha256: sha256File(selectionFile(c)) })),
    c21Interval: { file: rel(sliceFile('C21')), sha256: sha256File(sliceFile('C21')) },
    validationPlan: {
      door: 'FULL',
      interval: cutoffs.C24.slice,
      boundary: cutoffs.C24.end,
      subjects: 'the distinct C24 primaries of selection/C24.json (every arm and selector) and the two descriptive benchmarks',
      evaluations: 'per subject: the detailed centre and the centre with the 2024-12-31 boundary, the six frozen stresses, the selection family 2 × 128 regenerated exactly — every one with the risk envelope (PROTOCOL.md §11)',
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
    authority: 'brief §4: "opened once only after sealed C24 selection/manifest commit and door authorization"',
    frozenSelection: { file: rel(frozenSelectionFile), sha256: sha256File(frozenSelectionFile) },
    c24Selection: { file: rel(selectionFile('C24')), sha256: sha256File(selectionFile('C24')) },
    once: 'the official validation job opens FULL once; afterwards only nonbinding CPU diagnostics of the same frozen subjects'
  };

  seal(fullAuthorizationFile, record, 'FULL authorization');
  return record;
};

// ----- the next interval (C21 → D23) and the validation (C24 → FULL, once) -----

export const runInterval = async (cut: CutoffKey) => {
  const file = sliceFile(cut);
  const g = officialGuards(`${cutoffs[cut].sliceStage} ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: the ${cutoffs[cut].sliceStage} is sealed`);

  const sel = readSealed<{ subjects: { label: string; id: string; roles: { arm: ArmKey; selector: SelectorName }[]; evidence: Evidence }[]; benchmarks: { label: string; id: string; evidence: Evidence }[] }>(selectionFile(cut));

  assertCommitted(selectionFile(cut));

  const spec = cutoffs[cut];
  const subjects = [
    ...sel.subjects.map((s) => ({ label: s.label, id: s.id, roles: s.roles as unknown[], kind: 'primary' as const, cfg: canonicalCfg(s.evidence.cfg), selectTail: s.evidence.selectTail })),
    ...sel.benchmarks.map((s) => ({ label: s.label, id: s.id, roles: [] as unknown[], kind: 'benchmark' as const, cfg: canonicalCfg(s.evidence.cfg), selectTail: s.evidence.selectTail }))
  ];
  const b = bound();

  if (subjects.length > b.subjectsPerCutoff) throw new Error(`${cut}: ${subjects.length} subjects > the bound ${b.subjectsPerCutoff}`);

  const opts = { ...vOptions, boundaries: [spec.end] };

  return withOfficialJob({
    job: cut === 'C21' ? 'C21-slice' : 'C24-validation',
    resume: process.argv.includes('--resume'),
    identity: definitionOf(spec.sliceStage, { cutoff: cut, door: spec.sliceDoor, interval: spec.slice, boundary: spec.end, subjects: subjects.map((s) => s.id) }),
    door: spec.sliceDoor,
    doorPurpose: cut === 'C21' ? `official next interval C21 → 2022–2023 (${PROTOCOL_ID})` : `official validation C24 → 2025–2026, once (${PROTOCOL_ID})`,
    validation: cut === 'C24',
    maxFresh: subjects.length * b.perSubject,
    completeWhenDone: true,
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
      const limits = { CTRL: arms.CTRL.markedDdLimit, EXP: arms.EXP.markedDdLimit };
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
          wholeAssessment: { CTRL: assessArm(centre, arms.CTRL).pass, EXP: assessArm(centre, arms.EXP).pass },
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
            above35pctC0: breaches(limits.CTRL),
            above40pctC0: breaches(limits.EXP),
            trainingBreachShare: p.s.selectTail.breachShare
          }
        };
      });
      const requested = items.length;
      const record = {
        stage: spec.sliceStage,
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        door: spec.sliceDoor,
        interval: spec.slice,
        boundary: spec.end,
        basis:
          'one continuous run from 2016-01-04 (state, open lots and marks preserved); interval P&L = the change of the marked net from the boundary close; interval DD = the strict tracker restarted at the boundary close (peak = the marked net there); whole-run figures beside it; the envelope is a whole-run statistic (window versions are CPU diagnostics)',
        label: 'retrospective, previously inspected history — never a pristine holdout or independent future validation',
        selection: { file: rel(selectionFile(cut)), sha256: sha256File(selectionFile(cut)) },
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        requested,
        rows,
        phaseCompute: { fresh: lab.fresh - fresh0, archiveHits: lab.hits - hits0, tallies: lab.tallies },
        compute: lab.compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `${spec.sliceStage} ${cut}`);
      log(`${spec.sliceStage} ${cut}: ${rows.length} rows sealed (${requested} requested)`);
      return record;
    }
  });
};

export const expPolicy = RE_EXPERIMENTAL;
