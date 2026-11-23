// Priority 4's stages (PROTOCOL.md §14). Each OFFICIAL evaluating stage is a GPU job of its own (jobs.ts withOfficialJob:
// openJob → openOfficialGpuSession → GpuPool → EvalLab; no CPU path) writing one sealed record:
//
//   ablate                 job ablation      D24 (after the freeze, before any search)   fixed-parameter points (§11)
//   search    --cutoff C   job C-search      training door   both arms' 128 lanes (2 cells × R3–R34 × CTRL/EXP)
//   gate-r    --cutoff C   (no evaluation)                   CTRL R3–R18 = Stage B's sealed CTRL lanes (§4)
//   extend    --cutoff C   job C-extend      training door   the single symmetric extension block, when triggered (§6.3)
//   informed               job C24-informed  D24             the informed lanes I1–I4 (§10)
//   qualify   --cutoff C   job C-qualify     training door   the union: shortlists, OFF projections, benchmarks (§7)
//   select    --cutoff C   (no evaluation)                   lane values, paired statistics, pooled P0 → sealed,
//                                                            COMMITTED before the next door opens
//   interval  --cutoff C   job C-interval    D21 / D23       the next interval (retrospective)
//   decompose              job C24-decomposition D24         the A/B/C decomposition rows (§12; after the C24 selection)
//   freeze-selection, authorize-full (no evaluation), validate (job C24-validation, FULL once)
//
// Guards of every official stage: the study preflight; the sealed, committed protocol freeze (protocol sha256, code digest
// or a sealed code amendment chained from it, the accepted GPU record); the sealed engineering gates; no uncommitted
// change to the code closure or the protocol documents; the hard ceiling ledger; the fold order and the door guards
// (doors.ts). A stage whose record exists refuses to rerun; an interrupted job resumes from its archive (--resume).
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import type { EvalLab } from '../gpu-backend/lab.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import { wilson } from '../vg-d1-growth-diagnostic/risk.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { deepDiff } from '../gpu-phase1/compare.ts';
import { finishReserve as a3FinishReserve } from '../vg-l0-full-joint/budgets.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import { famOf } from '../vg-l0-full-joint/qualify.ts';
import type { DRec, SRec } from '../vg-l0-full-joint/evaluate.ts';
import { fidelity } from '../vg-l0-risk-families/qualify.ts';
import { canonicalCfg, cellOf, pairOf } from '../vg-l0-full-joint/space.ts';
import { assessArm } from '../vg-l0-risk-envelope-pilot/fitness.ts';
import { benchmarks } from '../vg-l0-risk-envelope-pilot/stages.ts';
import type { Arm as PilotArm } from '../vg-l0-risk-envelope-pilot/context.ts';
import {
  type StagedBook,
  type StagedConfig,
  canonicalStaged,
  stagedBooks,
  stagedErrors
} from '../staged-stop/config.ts';
import {
  type Arm,
  type ArmKey,
  type CutoffKey,
  PROTOCOL_ID,
  PROTOCOL_VERSION,
  STUDY_ID,
  armKeys,
  armOf,
  cells,
  cutoffKeys,
  cutoffs,
  engineeringFile,
  freezeFile,
  log,
  primaryCutoffs,
  r2,
  replicates,
  repoRoot,
  researchDir,
  resultsDir,
  stageBReplicates
} from './context.ts';
import {
  type PCfg,
  type SpaceDef,
  a3GenesOf,
  actGeneOf,
  baseOf,
  ctrlSpace,
  expIndexOf,
  expSpace,
  restrictedSpace,
  stagedOf,
  stagedSlots,
  switchGene,
  t2GeneOf,
  tau1OfCfg,
  withStaged
} from './space.ts';
import type { Budget, LaneResult, LaneSpec } from './search.ts';
import {
  broadSchedule,
  extendedSchedule,
  finishReserve,
  informedSchedule,
  laneCaps,
  ledger,
  membersBound,
  perMember,
  perSubject,
  stageAllowance,
  stresses
} from './budget.ts';
import { type Evidence, type Member, type Origin, drawsOf, qualifyMembers, sealedEvidence } from './qualify.ts';
import { type LaneValue, laneValues, selectArm } from './select.ts';
import {
  type RiskMetric,
  chronologicalVerdict,
  intervalDdOf,
  intervalNetOf,
  mechanismOf,
  outcomeLabel,
  pairsOf,
  primaryOf,
  riskOf
} from './stats.ts';
import {
  ablationFile,
  frozenSelectionFile,
  fullAuthorizationFile,
  intervalFile,
  searchFile,
  selectionFile
} from './doors.ts';
import { broadSpecOf, runLanes, withOfficialJob } from './jobs.ts';
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

export const gateRFile = (cut: CutoffKey) => path.join(resultsDir, 'gate-r', `${cut}.json`);
export const extendFile = (cut: CutoffKey) => path.join(resultsDir, 'extend', `${cut}.json`);
export const informedFile = path.join(resultsDir, 'informed', 'C24.json');
export const qualificationFile = (cut: CutoffKey) => path.join(resultsDir, 'qualification', `${cut}.json`);
export const decompositionFile = path.join(resultsDir, 'decomposition', 'D24.json');
export const lotRowsDir = path.join(researchDir, 'cache', 'lot-rows');
export const studyDocs = [
  'research/vg-l0-staged-stop/PROTOCOL.md',
  'research/vg-l0-staged-stop/AMENDMENTS.md',
  'research/vg-l0-staged-stop/STANDARD_ADOPTION.json',
  'research/vg-l0-staged-stop/RULE_SPECIFICATION.md'
];

// Stage B's sealed lanes (read only; pinned in the freeze): gate R
export const stageBDir = path.join(repoRoot, 'research', 'vg-l0-risk-envelope-stage-b');
export const stageBSearchFile = (cut: CutoffKey) => path.join(stageBDir, 'results', 'search', `${cut}.json`);
export const stageBQualificationFile = (cut: CutoffKey) =>
  path.join(stageBDir, 'results', 'qualification', `${cut}.json`);

export const arms: Record<ArmKey, Arm> = { CTRL: armOf('CTRL', ctrlSpace), EXP: armOf('EXP', expSpace) };
const p0 = arms.CTRL as unknown as PilotArm;

// ----- lanes -----

export const researchSpecs = (cut: CutoffKey) => cells.flatMap((c) => replicates.map((r) => broadSpecOf(cut, c, r)));
export const searchPlan = (cut: CutoffKey) =>
  researchSpecs(cut).flatMap((s) => armKeys.map((a) => ({ spec: s, arm: arms[a] })));

// the informed lanes (PROTOCOL.md §10): type → centre, free genes per arm; CTRL I1/I2 are the incumbents themselves
export type InformedType = 'I1' | 'I2' | 'I3' | 'I4';
export const informedTypes: readonly InformedType[] = ['I1', 'I2', 'I3', 'I4'];
export const informedReplicates = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const exitGenes = [
  'GDX.trailingStopPercentage',
  'GDX.maximumHoldDays',
  'GDX.intradayLossBuffer',
  'VGT.trailingStopPercentage',
  'VGT.maximumHoldDays',
  'VGT.intradayLossBuffer',
  'G.trailingStopPercent',
  'G.maximumHoldDays',
  'G.initialStopAtrSessions',
  'G.initialStopAtrMultiple'
];
const rcGenes = [
  'GDX.d',
  'GDX.hx',
  'GDX.g',
  'GDX.k',
  'GDX.r',
  'GDX.c',
  'VGT.d',
  'VGT.hx',
  'VGT.g',
  'VGT.k',
  'VGT.r',
  'VGT.c'
];
const stagedGenes = () => stagedSlots.flatMap((_s, j) => [switchGene(j), actGeneOf(j), t2GeneOf(j)]);
export const informedCentre = (t: InformedType) =>
  benchmarks().find((b) => b.key === (t === 'I1' || t === 'I3' ? 'New L0' : 'N/original'))!;
export const informedFree = (t: InformedType, arm: ArmKey): number[] | null => {
  const a3 = t === 'I1' || t === 'I2' ? [] : a3GenesOf(t === 'I3' ? exitGenes : [...exitGenes, ...rcGenes]);

  if (arm === 'CTRL') return a3.length ? a3 : null; // I1/I2 CTRL: no free gene (the incumbent itself)
  return [...a3.map(expIndexOf), ...stagedGenes()].sort((a, b) => a - b);
};
export const informedSpecOf = (t: InformedType, r: number): LaneSpec => {
  const key = `C24/informed/${t}/R${r}`;
  const c = informedCentre(t);

  return {
    key,
    seedKey: key,
    position: key,
    stage: 'informed',
    replicate: r,
    cutoff: 'C24',
    kind: 'informed',
    res: 'fine',
    pair: pairOf(cellOf(c.cfg.cell)),
    seeds: [{ label: c.label, cfg: c.cfg, focus: true }]
  };
};
export const informedArm = (t: InformedType, arm: ArmKey): Arm | null => {
  const free = informedFree(t, arm);

  if (!free) return null;

  const sp: SpaceDef = restrictedSpace(
    arm === 'EXP' ? expSpace : ctrlSpace,
    informedCentre(t).cfg,
    new Set(free),
    'fine',
    `${t} ${arm}`
  );

  return armOf(arm, sp);
};
export const informedPlan = () =>
  informedTypes.flatMap((t) =>
    armKeys.flatMap((a) => {
      const arm = informedArm(t, a);

      return arm ? informedReplicates.map((r) => ({ type: t, spec: informedSpecOf(t, r), arm })) : [];
    })
  );

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

    if (a.from !== out.at(-1))
      throw new Error(
        `${rel(f)}: an amendment from ${a.from.slice(0, 12)} does not chain from ${out.at(-1)!.slice(0, 12)}`
      );
    out.push(a.to);
  }
  return out;
};

export const engineeringGates = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'] as const;

export const officialGuards = (stage: string) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (!isSealed(freezeFile)) throw new Error(`${stage}: the protocol is not frozen (results/protocol-freeze.json)`);
  assertCommitted(freezeFile);

  const fz = readJson<Freeze>(freezeFile);
  const protocolSha = sha256File(path.join(researchDir, 'PROTOCOL.md'));

  if (fz.protocol.sha256 !== protocolSha)
    throw new Error(
      `${stage}: PROTOCOL.md (${protocolSha.slice(0, 12)}) ≠ the frozen ${fz.protocol.sha256.slice(0, 12)}`
    );

  const allowed = allowedCodeDigests(fz.codeDigest);

  if (!allowed.includes(codeDigest()))
    throw new Error(
      `${stage}: the code closure changed since the freeze (digest ${codeDigest().slice(0, 12)} ∉ {${allowed.map((d) => d.slice(0, 12)).join(', ')}}): record a code amendment`
    );
  if (fz.acceptanceSha256 !== sha256File(path.join(repoRoot, 'config/gpu-backend/acceptance.json')))
    throw new Error(`${stage}: the acceptance record differs from the one the freeze pinned`);
  if (!isSealed(engineeringFile))
    throw new Error(`${stage}: the engineering gates are not sealed (results/engineering/gates.json)`);
  assertCommitted(engineeringFile);

  const g = readJson<{ pass: boolean; gates: Record<string, { pass: boolean }> }>(engineeringFile);

  if (!g.pass || !engineeringGates.every((k) => g.gates[k]?.pass === true))
    throw new Error(`${stage}: an engineering gate did not pass: every official stage is blocked`);

  const dirty = dirtyCode(studyDocs);

  if (dirty.length)
    throw new Error(
      `${stage}: uncommitted changes to the code or protocol (an official run starts from a commit): ${dirty.slice(0, 5).join('; ')}`
    );
  return { freeze: fz, head: headCommit(), branch: branchName() };
};

// the fold order: a fold's first stage needs the previous fold complete (its interval sealed and committed), and no later
// fold may have started
export const foldGuard = (cut: CutoffKey, stage: string) => {
  const prev = cutoffs[cut].previous;

  if (prev && !(isSealed(intervalFile(prev)) && isCommitted(intervalFile(prev))))
    throw new Error(
      `${stage}: the ${prev} fold is not complete (its interval record is not sealed and committed): the folds run C19 → C21 → C24`
    );
  for (const later of cutoffKeys.slice(cutoffKeys.indexOf(cut) + 1))
    if (fs.existsSync(searchFile(later))) throw new Error(`${stage}: the later ${later} fold has started`);
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

const computeOf = (lab: EvalLab, fresh0: number, hits0: number, t0: number) => ({
  fresh: lab.fresh - fresh0,
  archiveHits: lab.hits - hits0,
  tallies: lab.tallies,
  lab: lab.compute,
  wallSeconds: Math.round((Date.now() - t0) / 100) / 10
});

const budgetBound = (l: LaneResult) => l.extension.stop.startsWith('extension cap reached');
const assertLaneBounds = (rows: readonly { arm: ArmKey; result: LaneResult }[], bound: (a: ArmKey) => number) => {
  for (const r of rows)
    if (r.result.requested > bound(r.arm))
      throw new Error(`${r.arm} ${r.result.key}: ${r.result.requested} requested > the lane bound ${bound(r.arm)}`);
};
const byArmOf = (rows: readonly { arm: ArmKey; result: LaneResult }[]) =>
  Object.fromEntries(armKeys.map((a) => [a, rows.filter((r) => r.arm === a).map((r) => r.result)])) as Record<
    ArmKey,
    LaneResult[]
  >;

// ----- Stage A: the fixed-parameter ablations (D24; after the freeze, before any search; report-only) -----

export const ablationActivations = [75, 125, 200, 300, 400] as const; // tenths of a percent: 7.5 … 40 %
export const ablationRatios = [0.3, 0.5, 0.7, 0.85] as const;
export const ablationBookSets: readonly (readonly StagedBook[])[] = [
  ['D1:GDX'],
  ['D1:VGT'],
  ['G:VGT'],
  ['D1:GDX', 'D1:VGT', 'G:VGT']
];
export const ablationFrictions: Record<string, EvalOptions['friction'] | null> = {
  base: null,
  'stop slippage +10 bps': { stopSlippageBps: 10 },
  'stop slippage +25 bps': { stopSlippageBps: 25 },
  'next-open stops': { stopFill: 'next-open' }
};

export const ablationPoints = () => {
  type Point = {
    incumbent: string;
    books: string;
    activationTenths: number;
    ratio: number;
    staged: StagedConfig | null;
    errors: string[];
    id: string | null;
    duplicateOf: string | null;
    label: string;
  };
  const out: Point[] = [];
  const seen = new Map<string, string>();

  for (const b of benchmarks()) {
    const t1 = tau1OfCfg(b.cfg);

    for (const set of ablationBookSets)
      for (const a of ablationActivations)
        for (const r of ablationRatios) {
          const books: StagedConfig['books'] = {};

          for (const bk of set) books[bk] = { activationTenths: a, stage2Tenths: Math.round(r * t1[bk]) };

          const raw: StagedConfig = { version: 1, books };
          const errors = stagedErrors(raw, t1);
          const label = `${b.key} | ${set.join('+')} | A ${a / 10}% | τ₂ ${r} × τ₁`;
          const st = errors.length ? null : canonicalStaged(raw);
          const id = st ? expSpace.cfgId(withStaged(b.cfg, st)) : null;
          const dup = id ? (seen.get(id) ?? null) : null;

          if (id && !dup) seen.set(id, label);
          out.push({
            incumbent: b.key,
            books: set.join('+'),
            activationTenths: a,
            ratio: r,
            staged: st,
            errors,
            id,
            duplicateOf: dup,
            label
          });
        }
  }
  return out;
};

export const runAblation = async (resume = false) => {
  const file = ablationFile;
  const g = officialGuards('ablation');

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: the ablations are sealed`);

  const points = ablationPoints();
  const valid = points.filter((p) => p.staged && !p.duplicateOf);
  const subjects = [
    ...benchmarks().map((b) => ({ label: `${b.key} | OFF`, incumbent: b.key, cfg: b.cfg as PCfg })),
    ...valid.map((p) => ({
      label: p.label,
      incumbent: p.incumbent,
      cfg: withStaged(benchmarks().find((b) => b.key === p.incumbent)!.cfg, p.staged)
    }))
  ];
  const frictions = Object.entries(ablationFrictions);
  const forecast = subjects.length * frictions.length;
  const allowance = stageAllowance('ablation', forecast);
  const t0 = Date.now();

  return withOfficialJob({
    job: 'ablation',
    resume,
    identity: definitionOf('ablation', {
      door: 'D24',
      subjects: subjects.map((s) => s.label),
      frictions: Object.keys(ablationFrictions)
    }),
    door: 'D24',
    use: 'ablation',
    doorPurpose: `official fixed-parameter ablations (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(forecast, allowance.maxFresh),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const items = subjects.flatMap((s) =>
        frictions.map(([, f]) => ({
          cfg: s.cfg,
          options: f ? { ...vOptions, friction: { ...f } } : vOptions,
          detail: f === null,
          risk: true as const
        }))
      );
      const recs = await lab.evalMany<SRec>(items, 'ablation');
      let at = 0;
      const rows = subjects.map((s) => {
        const byFriction: Record<string, unknown> = {};

        for (const [name] of frictions) {
          const r = recs[at++]!;
          const env = checkEnvelope((r as SRec & { envelope?: unknown }).envelope, `${s.label} ${name}`);
          const d = name === 'base' ? (r as DRec) : null;

          byFriction[name] = {
            net: r.net,
            dd: r.dd,
            envelope: env,
            staged: (r as SRec & { staged?: unknown }).staged ?? null,
            lots: r.lots,
            years: r.years,
            ...(d
              ? {
                  exitReasons: d.risk.rows.reduce<Record<string, number>>(
                    (a, x) => ((a[`${x.book} ${x.reason}`] = (a[`${x.book} ${x.reason}`] ?? 0) + 1), a),
                    {}
                  )
                }
              : {})
          };
        }
        return {
          label: s.label,
          incumbent: s.incumbent,
          id: expSpace.cfgId(s.cfg),
          staged: stagedOf(s.cfg),
          byFriction
        };
      });
      // A0: the OFF incumbents reproduce their sealed development figures (Stage B's C24 qualification, D24) to the cent
      const sb = readSealed<{ evidence: { label: string; centre: { net: number; dd: number } }[] }>(
        stageBQualificationFile('C24')
      );
      const a0 = benchmarks().map((b) => {
        const ref = sb.evidence.find((e) => e.label === b.label)!;
        const mine = rows.find((r) => r.label === `${b.key} | OFF`)!.byFriction.base as { net: number; dd: number };

        return {
          incumbent: b.key,
          sealed: { net: ref.centre.net, dd: ref.centre.dd },
          here: { net: mine.net, dd: mine.dd },
          equal: ref.centre.net === mine.net && ref.centre.dd === mine.dd
        };
      });
      const record = {
        stage: 'ablation',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        door: 'D24',
        label: 'report-only fixed-parameter ablations: nothing here selects, ranks or narrows a search',
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        a0: {
          pass: a0.every((x) => x.equal),
          rows: a0,
          reference: { file: rel(stageBQualificationFile('C24')), sha256: sha256File(stageBQualificationFile('C24')) }
        },
        grid: {
          activations: ablationActivations,
          ratios: ablationRatios,
          bookSets: ablationBookSets,
          frictions: Object.keys(ablationFrictions)
        },
        points: points.map((p) => ({
          label: p.label,
          incumbent: p.incumbent,
          books: p.books,
          activationTenths: p.activationTenths,
          ratio: p.ratio,
          staged: p.staged,
          id: p.id,
          invalid: p.errors,
          duplicateOf: p.duplicateOf
        })),
        invalid: points.filter((p) => p.errors.length).length,
        duplicates: points.filter((p) => p.duplicateOf).length,
        rows,
        requested: items.length,
        compute: computeOf(lab, fresh0, hits0, t0),
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, 'ablation');
      log(
        `ablation: ${rows.length} subjects × ${frictions.length} frictions sealed; A0 ${record.a0.pass ? 'PASS' : 'FAIL'}`
      );
      if (!record.a0.pass)
        throw new Error('A0 failed: the OFF incumbents differ from their sealed development figures — the study stops');
      return record;
    }
  });
};

// ----- the search (both arms' 128 lanes in one job) -----

export const runSearch = async (cut: CutoffKey, resume = false) => {
  const file = searchFile(cut);
  const g = officialGuards(`search ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: that search is complete`);
  foldGuard(cut, `search ${cut}`);
  if (!isSealed(ablationFile) || !isCommitted(ablationFile))
    throw new Error(`search ${cut}: the ablations are not sealed and committed (Stage A precedes the searches)`);

  const plan = searchPlan(cut);
  const bound = (a: ArmKey) => laneCaps.broad[a];
  const cap = plan.reduce((s, p) => s + bound(p.arm.key), 0);
  const allowance = stageAllowance(`search ${cut}`, cap);
  const spec = cutoffs[cut];
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-search`,
    resume,
    identity: definitionOf('search', {
      cutoff: cut,
      door: spec.door,
      cells,
      replicates,
      lanes: plan.map((p) => `${p.arm.key} ${p.spec.key}`),
      schedule: 'Assignment 3 broad lane (NL0 V-cell schedule)',
      laneCaps: laneCaps.broad
    }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official search ${cut}, both arms (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(cap, allowance.maxFresh),
    body: async (lab, ctx) => {
      ctx.job.event('phase', { head: g.head, ledger: allowance });

      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { results, rounds } = await runLanes(lab, plan, broadSchedule, bound, cap, finishReserve, `search ${cut}`);

      assertLaneBounds(results, bound);

      const byArm = byArmOf(results);
      const compute = computeOf(lab, fresh0, hits0, t0);
      const record = {
        stage: 'search',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        role: spec.role,
        door: spec.door,
        arms: Object.fromEntries(
          armKeys.map((a) => [
            a,
            {
              space: arms[a].sp.name,
              genes: arms[a].sp.nGenes,
              maxMoves: arms[a].sp.maxMoves,
              policy: `${arms[a].policy.id}@${arms[a].policy.version}`
            }
          ])
        ),
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        branch: g.branch,
        lanesCount: plan.length,
        budget: broadSchedule,
        laneCaps: laneCaps.broad,
        cap,
        extensionRounds: rounds,
        lanes: byArm,
        budgetBound: Object.fromEntries(armKeys.map((a) => [a, byArm[a].filter(budgetBound).map((l) => l.key)])),
        requested: results.reduce((a, r) => a + r.result.requested, 0),
        requestedByArm: Object.fromEntries(armKeys.map((a) => [a, byArm[a].reduce((s, r) => s + r.requested, 0)])),
        compute,
        wallSeconds: compute.wallSeconds,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `search ${cut}`);
      log(
        `search ${cut}: sealed ${rel(file)} (${record.requested} requested, ${compute.fresh} fresh, ${compute.wallSeconds} s)`
      );
      return record;
    }
  });
};

// ----- gate R: CTRL R3–R18 equal Stage B's sealed CTRL lanes (no evaluation) -----

export const runGateR = (cut: CutoffKey) => {
  const file = gateRFile(cut);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);

  const mine = readSealed<{ lanes: Record<ArmKey, LaneResult[]> }>(searchFile(cut));
  const ref = readSealed<{ lanes: Record<string, LaneResult[]> }>(stageBSearchFile(cut));
  const wanted = cells.flatMap((c) => stageBReplicates.map((r) => broadSpecOf(cut, c, r).key));
  const rows = wanted.map((key) => {
    const a = ref.lanes.CTRL!.find((l) => l.key === key);
    const b = mine.lanes.CTRL.find((l) => l.key === key);

    if (!a || !b)
      return { lane: key, identical: false, differences: [{ path: a ? 'missing here' : 'missing in Stage B' }] };

    const diffs = deepDiff(a, b, '$', [], 40);

    return {
      lane: key,
      identical: diffs.length === 0,
      differences: diffs.map((d) => ({ path: d.path })),
      requested: [a.requested, b.requested]
    };
  });
  const record = {
    gate: 'R',
    cutoff: cut,
    what: "every CTRL lane R3–R18 (both cells) of this study's search equals Stage B's sealed CTRL lane (envelopes included): the derived lane, the CTRL space, the grouping of 128 lanes in one job and the accepted Phase 8 evaluator reproduce the sealed history",
    reference: { file: rel(stageBSearchFile(cut)), sha256: sha256File(stageBSearchFile(cut)) },
    search: { file: rel(searchFile(cut)), sha256: sha256File(searchFile(cut)) },
    lanes: rows,
    identical: rows.length === wanted.length && rows.every((r) => r.identical),
    finished: new Date().toISOString()
  };

  seal(file, record, `gate R ${cut}`);
  log(
    `gate R ${cut}: ${record.identical ? 'IDENTICAL' : 'DIFFERENT'} (${rows.filter((r) => r.identical).length}/${rows.length} lanes)`
  );
  if (!record.identical)
    throw new Error(`gate R ${cut} failed: the CTRL lanes differ from Stage B's sealed lanes — the study stops`);
  return record;
};

const requireGateR = (cut: CutoffKey, stage: string) => {
  if (!isSealed(gateRFile(cut)) || !readJson<{ identical: boolean }>(gateRFile(cut)).identical)
    throw new Error(`${stage}: gate R ${cut} is not sealed and passed`);
};

// ----- the single symmetric extension block (PROTOCOL.md §6.3) -----

export const extensionDecision = (cut: CutoffKey) => {
  const s = readSealed<{ lanes: Record<ArmKey, LaneResult[]> }>(searchFile(cut));
  const bound = Object.fromEntries(armKeys.map((a) => [a, s.lanes[a].filter(budgetBound).map((l) => l.key)])) as Record<
    ArmKey,
    string[]
  >;
  const share = Object.fromEntries(armKeys.map((a) => [a, bound[a].length / s.lanes[a].length])) as Record<
    ArmKey,
    number
  >;

  return {
    budgetBound: bound,
    share,
    triggered: armKeys.some((a) => share[a] > 0.25),
    rule: 'more than 25 % of either arm’s lanes budget-bound → re-run every budget-bound lane of both arms with the island cap × 1.5'
  };
};

export const runExtend = async (cut: CutoffKey, resume = false) => {
  const file = extendFile(cut);
  const g = officialGuards(`extend ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  requireGateR(cut, `extend ${cut}`);

  const decision = extensionDecision(cut);
  const spec = cutoffs[cut];

  if (!decision.triggered) {
    const record = {
      stage: 'extend',
      protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
      cutoff: cut,
      decision,
      triggered: false,
      lanes: { CTRL: [], EXP: [] },
      requested: 0,
      head: g.head,
      finished: new Date().toISOString()
    };

    seal(file, record, `extend ${cut}`);
    log(
      `extend ${cut}: not triggered (budget-bound CTRL ${decision.budgetBound.CTRL.length}, EXP ${decision.budgetBound.EXP.length})`
    );
    return record;
  }

  const plan = armKeys.flatMap((a) =>
    decision.budgetBound[a].map((key) => {
      const [, , cell, r] = key.split('/');

      return { spec: broadSpecOf(cut, cell!, Number(r!.slice(1))), arm: arms[a] };
    })
  );
  const bound = (a: ArmKey) => laneCaps.extended[a];
  const cap = plan.reduce((s, p) => s + bound(p.arm.key), 0);
  const allowance = stageAllowance(`extend ${cut}`, cap);
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-extend`,
    resume,
    identity: definitionOf('extend', {
      cutoff: cut,
      door: spec.door,
      lanes: plan.map((p) => `${p.arm.key} ${p.spec.key}`),
      islandsMax: extendedSchedule.islandsMax,
      laneCaps: laneCaps.extended
    }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official extension block ${cut} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(cap, allowance.maxFresh),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { results, rounds } = await runLanes(
        lab,
        plan,
        extendedSchedule,
        bound,
        cap,
        finishReserve,
        `extend ${cut}`
      );

      assertLaneBounds(results, bound);

      const byArm = byArmOf(results);
      const compute = computeOf(lab, fresh0, hits0, t0);
      const record = {
        stage: 'extend',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        door: spec.door,
        decision,
        triggered: true,
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        budget: extendedSchedule,
        laneCaps: laneCaps.extended,
        extensionRounds: rounds,
        lanes: byArm,
        stillBudgetBound: Object.fromEntries(armKeys.map((a) => [a, byArm[a].filter(budgetBound).map((l) => l.key)])),
        requested: results.reduce((a, r) => a + r.result.requested, 0),
        compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `extend ${cut}`);
      log(`extend ${cut}: ${plan.length} lanes sealed (${record.requested} requested)`);
      return record;
    }
  });
};

// the effective lanes of an arm (the extension block's result replaces the lane's base result)
export const effectiveLanes = (cut: CutoffKey, arm: ArmKey): LaneResult[] => {
  const s = readSealed<{ lanes: Record<ArmKey, LaneResult[]> }>(searchFile(cut));
  const x = readSealed<{ lanes: Record<ArmKey, LaneResult[]> }>(extendFile(cut));
  const repl = new Map(x.lanes[arm].map((l) => [l.key, l]));

  return s.lanes[arm].map((l) => repl.get(l.key) ?? l);
};
export const budgetBoundAfterExtension = (cut: CutoffKey) =>
  Object.fromEntries(
    armKeys.map((a) => [a, effectiveLanes(cut, a).filter(budgetBound).length / effectiveLanes(cut, a).length])
  ) as Record<ArmKey, number>;

// ----- the informed lanes (C24; PROTOCOL.md §10) -----

export const runInformed = async (resume = false) => {
  const file = informedFile;
  const g = officialGuards('informed C24');

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  if (!isSealed(extendFile('C24'))) throw new Error('informed: the C24 extension decision is not sealed');
  if (fs.existsSync(qualificationFile('C24'))) throw new Error('informed: the C24 qualification exists');

  const plan = informedPlan();
  const bound = (a: ArmKey) => laneCaps.informed[a];
  const cap = plan.reduce((s, p) => s + bound(p.arm.key), 0);
  const allowance = stageAllowance('informed C24', cap);
  const t0 = Date.now();

  return withOfficialJob({
    job: 'C24-informed',
    resume,
    identity: definitionOf('informed', {
      cutoff: 'C24',
      door: 'D24',
      lanes: plan.map((p) => `${p.arm.key} ${p.spec.key}`),
      free: Object.fromEntries(
        informedTypes.map((t) => [t, { CTRL: informedFree(t, 'CTRL'), EXP: informedFree(t, 'EXP') }])
      ),
      schedule: 'NL0 informed schedule',
      laneCaps: laneCaps.informed
    }),
    door: 'D24',
    use: 'training',
    doorPurpose: `official informed lanes C24 (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(cap, allowance.maxFresh),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { results, rounds } = await runLanes(
        lab,
        plan,
        informedSchedule as Budget,
        bound,
        cap,
        a3FinishReserve.informed,
        'informed C24'
      );

      assertLaneBounds(results, bound);

      const byArm = byArmOf(results);
      const compute = computeOf(lab, fresh0, hits0, t0);
      const record = {
        stage: 'informed',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: 'C24',
        door: 'D24',
        label: 'incumbent-informed lanes: separately labelled diagnostics, no chronological claim (PROTOCOL.md PD2)',
        types: Object.fromEntries(
          informedTypes.map((t) => [
            t,
            { centre: informedCentre(t).label, free: { CTRL: informedFree(t, 'CTRL'), EXP: informedFree(t, 'EXP') } }
          ])
        ),
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        budget: informedSchedule,
        laneCaps: laneCaps.informed,
        extensionRounds: rounds,
        lanes: byArm,
        requested: results.reduce((a, r) => a + r.result.requested, 0),
        compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, 'informed C24');
      log(`informed C24: ${plan.length} lanes sealed (${record.requested} requested)`);
      return record;
    }
  });
};

// ----- qualification: the union -----

const canonicalP = (c: PCfg): PCfg => withStaged(canonicalCfg(baseOf(c)), stagedOf(c));

// the OFF projections of an ON configuration: each ON book switched OFF alone and, when ≥ 2 books are ON, all OFF
export const projectionsOf = (c: PCfg) => {
  const st = stagedOf(c);

  if (!st) return [];

  const on = stagedBooks.filter((b) => st.books[b]);
  const base = baseOf(c);
  const out: { cfg: PCfg; dropped: string[]; tag: string }[] = on.map((b) => {
    const books = { ...st.books };

    delete books[b];
    return {
      cfg: withStaged(base, canonicalStaged({ version: 1, books })),
      dropped: [b],
      tag: on.length === 1 ? 'all OFF' : `−${b}`
    };
  });

  if (on.length >= 2) out.push({ cfg: base, dropped: [...on], tag: 'all OFF' });
  return out;
};

export const membersFromLanes = (
  lanes: Record<ArmKey, readonly LaneResult[]>,
  informed: Record<ArmKey, readonly LaneResult[]> | null
) => {
  type M = Member & { origins: Origin[] };
  const byId = new Map<string, M>();
  const duplicates: { label: string; sameAs: string }[] = [];
  const add = (cfg: PCfg, m: Omit<Member, 'cfg'>, origin: Origin) => {
    const c = canonicalP(cfg);
    const id = expSpace.cfgId(c);
    const prev = byId.get(id);

    if (prev) {
      prev.origins.push(origin);
      duplicates.push({ label: origin.label, sameAs: prev.label });
    } else byId.set(id, { ...m, cfg: c, origins: [origin] });
  };
  const addLane = (
    arm: ArmKey,
    l: LaneResult,
    roles: { member: Origin['role']; projection: Origin['role'] },
    stage: string,
    track: string
  ) =>
    l.shortlist.forEach((p, i) => {
      const label = `${arm} ${l.key}#${i + 1} ${p.pick}`;
      const m = { label, lane: l.key, stage, track, replicate: l.replicate, pick: p.pick } as Omit<Member, 'cfg'>;

      add(p.cfg as PCfg, m, { arm, role: roles.member, label, lane: l.key, pick: p.pick });
      if (arm === 'EXP')
        for (const x of projectionsOf(p.cfg as PCfg)) {
          const pl = `${label} [${x.tag}]`;

          add(
            x.cfg,
            { ...m, label: pl },
            {
              arm,
              role: roles.projection,
              label: pl,
              lane: l.key,
              pick: p.pick,
              projectionOf: label,
              dropped: x.dropped
            }
          );
        }
    });

  for (const arm of armKeys)
    for (const l of lanes[arm]) addLane(arm, l, { member: 'member', projection: 'projection' }, 'broad', 'I');
  if (informed)
    for (const arm of armKeys)
      for (const l of informed[arm])
        addLane(arm, l, { member: 'informed', projection: 'informed-projection' }, 'informed', 'N');
  for (const b of benchmarks())
    add(
      b.cfg,
      { label: b.label, lane: 'benchmark', stage: 'control', track: 'control', replicate: null, pick: b.why } as never,
      { arm: 'benchmark', role: 'benchmark', label: b.label, lane: 'benchmark', pick: b.why }
    );

  return { members: [...byId.values()], duplicates };
};

export const lanesOfCutoff = (cut: CutoffKey) =>
  Object.fromEntries(armKeys.map((a) => [a, effectiveLanes(cut, a)])) as Record<ArmKey, LaneResult[]>;
export const informedLanesOf = (cut: CutoffKey) =>
  cut === 'C24' ? readSealed<{ lanes: Record<ArmKey, LaneResult[]> }>(informedFile).lanes : null;
export const membersOf = (cut: CutoffKey) => membersFromLanes(lanesOfCutoff(cut), informedLanesOf(cut));

export const runQualify = async (cut: CutoffKey, resume = false) => {
  const file = qualificationFile(cut);
  const g = officialGuards(`qualify ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  requireGateR(cut, `qualify ${cut}`);
  if (!isSealed(extendFile(cut))) throw new Error(`qualify ${cut}: the extension decision is not sealed`);
  if (cut === 'C24' && !isSealed(informedFile)) throw new Error('qualify C24: the informed lanes are not sealed');
  if (fs.existsSync(selectionFile(cut))) throw new Error(`qualify ${cut}: the selection exists`);

  const { members, duplicates } = membersOf(cut);

  if (members.length > membersBound(cut === 'C24'))
    throw new Error(`qualify ${cut}: ${members.length} members > the bound ${membersBound(cut === 'C24')}`);

  const forecast = members.length * perMember();
  const allowance = stageAllowance(`qualify ${cut}`, forecast);
  const spec = cutoffs[cut];
  const t0 = Date.now();

  return withOfficialJob({
    job: `${cut}-qualify`,
    resume,
    identity: definitionOf('qualify', {
      cutoff: cut,
      door: spec.door,
      members: members.map((m) => ({ label: m.label, id: expSpace.cfgId(m.cfg) }))
    }),
    door: spec.door,
    use: 'training',
    doorPurpose: `official qualification ${cut} (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(forecast, allowance.maxFresh),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { evidence, requested } = await qualifyMembers(lab, members, cut);

      if (requested > forecast) throw new Error(`qualify ${cut}: ${requested} requested > the bound ${forecast}`);
      fs.mkdirSync(lotRowsDir, { recursive: true });
      fs.writeFileSync(
        path.join(lotRowsDir, `${cut}.json`),
        JSON.stringify(evidence.map((e) => ({ label: e.label, id: e.id, rows: e.risk.rows })))
      );

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
        byRole: members.reduce<Record<string, number>>((a, m) => {
          for (const o of m.origins) a[`${o.arm} ${o.role}`] = (a[`${o.arm} ${o.role}`] ?? 0) + 1;
          return a;
        }, {}),
        duplicates,
        requested,
        evidence: evidence.map(sealedEvidence),
        compute: computeOf(lab, fresh0, hits0, t0),
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, `qualify ${cut}`);
      log(`qualify ${cut}: ${members.length} members sealed (${requested} requested)`);
      return record;
    }
  });
};

// ----- selection (no evaluation) -----

const riskRowOf = (e: Evidence | undefined): Record<RiskMetric, number> | null =>
  e
    ? {
        centreDd: e.centre.dd,
        confirmP90Dd: e.confirm.p90Dd,
        breachShare: e.envelope.confirmBreach.markedDd35 / Math.max(1, e.envelope.confirmBreach.n),
        principalLossLiq: e.envelope.centre.principalLossLiquidation,
        bankedDdLiq: e.envelope.centre.bankedDdLiquidation
      }
    : null;

// the selection's content (pure: evidence and lane results in, statistics out; PROTOCOL.md §1, §8)
export const selectionOf = (
  cut: string,
  evidence: readonly Evidence[],
  lanes: Record<ArmKey, readonly LaneResult[]>,
  informedLanes: Record<ArmKey, readonly LaneResult[]> | null
) => {
  const q = { evidence };
  const byId = new Map(q.evidence.map((e) => [e.id, e]));
  const lanesOf = (a: ArmKey) =>
    lanes[a].map((l) => ({
      key: l.key,
      cell: l.structure,
      replicate: l.replicate,
      shortlisted: l.shortlist.length
    }));
  const values = Object.fromEntries(armKeys.map((a) => [a, laneValues(q.evidence, a, lanesOf(a))])) as Record<
    ArmKey,
    LaneValue[]
  >;
  const pairs = pairsOf(cut, values.CTRL, values.EXP);
  const primary = primaryOf(cut, pairs);
  const key = (v: LaneValue) => `${v.cell}/R${v.replicate}`;
  const expBy = new Map(values.EXP.map((v) => [key(v), v]));
  const risk = riskOf(
    cut,
    values.CTRL.map((c) => {
      const e = expBy.get(key(c))!;

      return {
        cell: c.cell,
        ctrl: riskRowOf(c.representative ? byId.get(c.representative.id) : undefined),
        exp: riskRowOf(e.representative ? byId.get(e.representative.id) : undefined)
      };
    })
  );
  const mechanism = mechanismOf(
    cut,
    values.EXP.filter((v) => v.representative).map((v) => ({
      lane: v.lane,
      on: v.representative!.stagedPattern !== 'off',
      advantage: v.offProjection ? v.value - v.offProjection.centreNet : null
    }))
  );
  const pooled = Object.fromEntries(armKeys.map((a) => [a, selectArm(q.evidence, a)])) as Record<
    ArmKey,
    ReturnType<typeof selectArm>
  >;

  // the interval subjects (de-duplicated): every lane representative of both arms, the all-OFF projection of every ON EXP
  // representative, both arms' pooled primaries, the benchmarks; at C24 the informed primaries and their all-OFF projections
  type Role = { arm: ArmKey | 'benchmark'; kind: string; lane?: string };
  const subjects = new Map<string, { label: string; id: string; roles: Role[]; evidence: unknown }>();
  const addSubject = (id: string, label: string, role: Role) => {
    const e = byId.get(id)!;
    let s = subjects.get(id);

    if (!s) subjects.set(id, (s = { label, id, roles: [], evidence: sealedEvidence(e) }));
    s.roles.push(role);
  };

  for (const a of armKeys)
    for (const v of values[a]) {
      if (v.representative)
        addSubject(v.representative.id, v.representative.label, { arm: a, kind: 'lane representative', lane: v.lane });
      if (v.offProjection)
        addSubject(v.offProjection.id, v.offProjection.label, {
          arm: a,
          kind: 'representative all-OFF projection',
          lane: v.lane
        });
    }
  for (const a of armKeys)
    if (pooled[a].primary)
      addSubject(pooled[a].primary!.id, pooled[a].primary!.label, { arm: a, kind: 'pooled P0 primary' });
  for (const b of benchmarks()) {
    const e = q.evidence.find((x) => x.origins.some((o) => o.role === 'benchmark' && o.label === b.label))!;

    addSubject(e.id, b.label, { arm: 'benchmark', kind: 'benchmark' });
  }

  let informed: unknown = null;

  if (informedLanes) {
    const inf = { lanes: informedLanes };
    const rows = informedTypes.map((t) => {
      const lanes = (a: ArmKey) =>
        inf.lanes[a]
          .filter((l) => l.key.startsWith(`C24/informed/${t}/`))
          .map((l) => ({ key: l.key, cell: l.structure, replicate: l.replicate, shortlisted: l.shortlist.length }));
      const exp = laneValues(q.evidence, 'EXP', lanes('EXP'), 'informed');
      const centre = informedCentre(t);
      const centreEv = q.evidence.find((x) =>
        x.origins.some((o) => o.role === 'benchmark' && o.label === centre.label)
      )!;
      const ctrl: LaneValue[] = lanes('CTRL').length
        ? laneValues(q.evidence, 'CTRL', lanes('CTRL'), 'informed')
        : exp.map((v) => ({
            ...v,
            lane: `${v.lane} (the incumbent)`,
            arm: 'CTRL',
            value: centreEv.qualified ? centreEv.centre.net : 0,
            representative: centreEv.qualified
              ? { label: centre.label, id: centreEv.id, stagedPattern: 'off', isProjection: false }
              : null,
            offProjection: null,
            members: []
          }));
      const ctrlBy = new Map(ctrl.map((v) => [v.replicate, v]));
      const d = exp.map((v) => ({ cell: t, d: v.value - ctrlBy.get(v.replicate)!.value }));
      const sel = {
        EXP: selectArm(q.evidence, 'EXP', 'informed', `C24/informed/${t}/`),
        CTRL: lanes('CTRL').length ? selectArm(q.evidence, 'CTRL', 'informed', `C24/informed/${t}/`) : null
      };

      for (const a of armKeys) {
        const p = sel[a]?.primary;

        if (p) addSubject(p.id, p.label, { arm: a, kind: `informed ${t} primary` });
      }
      for (const v of exp)
        if (v.offProjection)
          addSubject(v.offProjection.id, v.offProjection.label, {
            arm: 'EXP',
            kind: `informed ${t} representative all-OFF projection`,
            lane: v.lane
          });
      return {
        type: t,
        centre: centre.label,
        values: { CTRL: ctrl, EXP: exp },
        d: intervalNetOf(`informed ${t}`, d),
        pooled: sel,
        label: 'diagnostic: no chronological claim'
      };
    });

    informed = rows;
  }

  return { laneValues: values, pairs, primary, risk, mechanism, pooled, informed, subjects: [...subjects.values()] };
};

export const runSelect = (cut: CutoffKey) => {
  const file = selectionFile(cut);

  requireStandardAdoption(researchDir, { repoRoot });
  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);

  const q = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut));

  assertCommitted(qualificationFile(cut));

  const x = selectionOf(cut, q.evidence, lanesOfCutoff(cut), informedLanesOf(cut));
  const { laneValues: values, pairs, primary, risk, mechanism, pooled, informed, subjects } = x;
  const budget = budgetBoundAfterExtension(cut);

  const record = {
    stage: 'selection',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    cutoff: cut,
    role: cutoffs[cut].role,
    qualification: { file: rel(qualificationFile(cut)), sha256: sha256File(qualificationFile(cut)) },
    search: { file: rel(searchFile(cut)), sha256: sha256File(searchFile(cut)) },
    extension: { file: rel(extendFile(cut)), sha256: sha256File(extendFile(cut)) },
    laneValues: values,
    pairs,
    primary,
    risk,
    mechanism,
    budgetBoundAfterExtension: budget,
    pooled,
    informed,
    subjects,
    finished: new Date().toISOString()
  };

  seal(file, record, `selection ${cut}`);
  log(
    `selection ${cut}: sealed (${pairs.length} pairs, D̄ ${r2(primary.mean)}, L90 ${r2(primary.l90)}; ${subjects.length} interval subjects)`
  );
  return record;
};

// ----- the decomposition (C24, report-only, after the C24 selection; PROTOCOL.md §12) -----

type DecompositionSel = {
  pooled: Record<ArmKey, { primary: { label: string; id: string; staged: StagedConfig | null } | null }>;
  informed:
    | {
        type: string;
        pooled: { EXP: { primary: { label: string; id: string; staged: StagedConfig | null } | null } | null };
      }[]
    | null;
};

export const decompositionRowsOf = (sel: DecompositionSel, evidence: readonly Evidence[]) => {
  const q = { evidence };
  const finalists = [
    { key: 'EXP pooled primary', p: sel.pooled.EXP.primary },
    ...(sel.informed ?? []).map((r) => ({ key: `informed ${r.type} EXP primary`, p: r.pooled.EXP?.primary ?? null }))
  ].filter((f) => f.p && f.p.staged);
  const rows: {
    label: string;
    cfg: PCfg;
    kind: string;
    incumbent: string | null;
    finalist: string | null;
    droppedInvalid: string[];
  }[] = [];

  for (const b of benchmarks())
    rows.push({
      label: `${b.key} (OFF)`,
      cfg: b.cfg,
      kind: 'incumbent',
      incumbent: b.key,
      finalist: null,
      droppedInvalid: []
    });
  for (const f of finalists) {
    const ev = q.evidence.find((e) => e.id === f.p!.id)!;

    rows.push({
      label: `${f.key}: ${f.p!.label}`,
      cfg: ev.cfg,
      kind: 'finalist',
      incumbent: null,
      finalist: f.key,
      droppedInvalid: []
    });
    rows.push({
      label: `${f.key}: ${f.p!.label} [all OFF]`,
      cfg: baseOf(ev.cfg),
      kind: 'finalist all OFF',
      incumbent: null,
      finalist: f.key,
      droppedInvalid: []
    });
    for (const b of benchmarks()) {
      const t1 = tau1OfCfg(b.cfg);
      const books: StagedConfig['books'] = {};
      const dropped: string[] = [];

      for (const bk of stagedBooks) {
        const x = f.p!.staged!.books[bk];

        if (!x) continue;
        if (stagedErrors({ version: 1, books: { [bk]: x } }, t1).length) dropped.push(bk);
        else books[bk] = x;
      }
      rows.push({
        label: `${b.key} + ${f.key}'s staged genes`,
        cfg: withStaged(b.cfg, canonicalStaged({ version: 1, books })),
        kind: 'incumbent + finalist staged',
        incumbent: b.key,
        finalist: f.key,
        droppedInvalid: dropped
      });
    }
  }
  return rows;
};

export const decompositionRows = () =>
  decompositionRowsOf(
    readSealed<DecompositionSel>(selectionFile('C24')),
    readSealed<{ evidence: Evidence[] }>(qualificationFile('C24')).evidence
  );

export const runDecompose = async (resume = false) => {
  const file = decompositionFile;
  const g = officialGuards('decompose');

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists`);
  if (!isSealed(selectionFile('C24')) || !isCommitted(selectionFile('C24')))
    throw new Error('decompose: the C24 selection is not sealed and committed');
  if (fs.existsSync(frozenSelectionFile))
    throw new Error('decompose: the selection is frozen (the decomposition precedes the freeze)');

  const rows = decompositionRows();
  const seen = new Map<string, { label: string; cfg: PCfg; origins: Origin[] }>();

  for (const r of rows) {
    const id = expSpace.cfgId(r.cfg);
    const o: Origin = { arm: 'report', role: 'decomposition', label: r.label, lane: 'decomposition', pick: r.kind };
    const s = seen.get(id);

    if (s) s.origins.push(o);
    else seen.set(id, { label: r.label, cfg: r.cfg, origins: [o] });
  }

  const members = [...seen.values()].map(
    (s) =>
      ({
        label: s.label,
        lane: 'decomposition',
        stage: 'control',
        track: 'control',
        replicate: null,
        pick: 'decomposition',
        cfg: s.cfg,
        origins: s.origins
      }) as unknown as Member & { origins: Origin[] }
  );
  const forecast = members.length * perMember();
  const allowance = stageAllowance('decompose', forecast);
  const t0 = Date.now();

  return withOfficialJob({
    job: 'C24-decomposition',
    resume,
    identity: definitionOf('decompose', { cutoff: 'C24', door: 'D24', rows: rows.map((r) => r.label) }),
    door: 'D24',
    use: 'training',
    doorPurpose: `official decomposition rows on D24, report-only (${PROTOCOL_ID} ${PROTOCOL_VERSION})`,
    maxFresh: Math.min(forecast, allowance.maxFresh),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const { evidence, requested } = await qualifyMembers(lab, members, 'C24');
      const record = {
        stage: 'decomposition',
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        door: 'D24',
        label: 'report-only (after the sealed C24 selection; never selects)',
        job: ctx.job.id,
        attestation: ctx.attestation,
        backend: ctx.backend,
        head: g.head,
        rows: rows.map((r) => ({
          label: r.label,
          kind: r.kind,
          incumbent: r.incumbent,
          finalist: r.finalist,
          droppedInvalid: r.droppedInvalid,
          id: expSpace.cfgId(r.cfg)
        })),
        requested,
        evidence: evidence.map(sealedEvidence),
        compute: computeOf(lab, fresh0, hits0, t0),
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(file, record, 'decompose');
      log(`decompose: ${members.length} rows sealed`);
      return record;
    }
  });
};

// ----- the frozen-selection manifest and the FULL authorization -----

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
  if (!isSealed(decompositionFile)) throw new Error('the decomposition is not sealed');
  assertCommitted(decompositionFile);

  const record = {
    kind: 'Priority 4 frozen selection manifest',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    frozenAt: new Date().toISOString(),
    head: headCommit(),
    codeDigest: codeDigest(),
    selections: cutoffKeys.map((c) => ({
      cutoff: c,
      file: rel(selectionFile(c)),
      sha256: sha256File(selectionFile(c))
    })),
    intervals: (['C19', 'C21'] as const).map((c) => ({
      cutoff: c,
      file: rel(intervalFile(c)),
      sha256: sha256File(intervalFile(c))
    })),
    decomposition: { file: rel(decompositionFile), sha256: sha256File(decompositionFile) },
    validationPlan: {
      door: 'FULL',
      interval: cutoffs.C24.slice,
      boundary: cutoffs.C24.end,
      subjects: 'the C24 interval subjects of selection/C24.json and the decomposition rows',
      evaluations:
        'per subject: the detailed centre and the centre with the 2024-12-31 boundary, the seven stresses, the selection family 2 × 128 regenerated exactly — every one with the risk envelope (PROTOCOL.md §9)',
      once: true,
      label:
        'retrospective, previously inspected history (2025–2026 examined by many studies); never a pristine holdout'
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
    authority:
      'brief §6 (chronological folds; C24 → 2025–2026) and the single-opening door discipline of PROTOCOL.md §9',
    frozenSelection: { file: rel(frozenSelectionFile), sha256: sha256File(frozenSelectionFile) },
    c24Selection: { file: rel(selectionFile('C24')), sha256: sha256File(selectionFile('C24')) },
    once: 'the official validation job opens FULL once; afterwards only report-only CPU diagnostics of the same frozen subjects'
  };

  seal(fullAuthorizationFile, record, 'FULL authorization');
  return record;
};

// ----- the next interval (C19 → D21, C21 → D23) and the validation (C24 → FULL, once) -----

export const intervalSubjectsOf = (cut: CutoffKey) => {
  type Subject = { label: string; id: string; roles: unknown[]; evidence: Evidence };
  const sel = readSealed<{ subjects: Subject[] }>(selectionFile(cut));
  const out = sel.subjects.map((s) => ({
    label: s.label,
    id: s.id,
    roles: s.roles,
    cfg: canonicalP(s.evidence.cfg),
    selectTail: s.evidence.selectTail
  }));

  if (cut === 'C24') {
    const d = readSealed<{ rows: { label: string; kind: string; id: string }[]; evidence: Evidence[] }>(
      decompositionFile
    );

    for (const e of d.evidence) {
      if (out.some((s) => s.id === e.id)) continue;
      out.push({
        label: e.label,
        id: e.id,
        roles: [{ arm: 'report', kind: 'decomposition' }],
        cfg: canonicalP(e.cfg),
        selectTail: e.selectTail
      });
    }
  }
  return out;
};

// the interval's evaluation plan per subject (PROTOCOL.md §9): the detailed centre and the centre with the boundary, the
// seven stresses, the training selection family 2 × 128 regenerated (de-duplicated); every item with the envelope
export type IntervalSubject = {
  label: string;
  id: string;
  roles: unknown[];
  cfg: PCfg;
  selectTail: Evidence['selectTail'];
};
export const intervalPlansOf = (subjects: readonly IntervalSubject[], cut: string, end: string) => {
  const opts = { ...vOptions, boundaries: [end] };
  type It = { cfg: PCfg; options: typeof opts; detail?: boolean; risk: true };
  const plans = subjects.map((s) => {
    const draws = [1, 2].flatMap((rep) =>
      drawsOf(s.cfg, famOf('select', ['select', rep, cut], 'joint', 1, fidelity.n))
    );
    const seen = new Set<string>();
    const unique = draws.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
    const items: It[] = [
      { cfg: s.cfg, options: opts, detail: true, risk: true },
      { cfg: s.cfg, options: opts, risk: true },
      ...Object.values(stresses).map((f) => ({
        cfg: s.cfg,
        options: { ...opts, friction: { ...f } },
        risk: true as const
      })),
      ...unique.map((d) => ({ cfg: d.cfg, options: opts, risk: true as const }))
    ];

    return { s, unique, items };
  });
  return plans;
};

// the interval rows from the plans' records (in plan order)
export const intervalRowsOf = (plans: ReturnType<typeof intervalPlansOf>, recs: readonly SRec[], end: string) => {
  const spec = { end };
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

    if (centre.net !== detail.net || centre.signature !== detail.signature)
      throw new Error(`${p.s.label}: detailed centre differs`);

    const period = centre.periods[0]!;
    const rows0 = detail.risk.rows;
    const after = (d: string) => d > spec.end;
    const nextLots = rows0.filter((x) => after(x.entry));
    const carried = rows0.filter((x) => !after(x.entry) && (x.exit === null || after(x.exit)));
    const maes = nextLots.map((x) => x.mae).sort((a, c) => a - c);
    const env = checkEnvelope((centre as SRec & { envelope?: unknown }).envelope, `${p.s.label} centre`);
    const sliceDds = nb.map((r) => r.periods[0]!.dd).sort((a, c) => a - c);
    const sliceNets = nb.map((r) => r.periods[0]!.after).sort((a, c) => a - c);
    const k = sliceDds.filter((d) => d > 35_000).length;

    return {
      label: p.s.label,
      id: p.s.id,
      roles: p.s.roles,
      cell: p.s.cfg.cell,
      stagedPattern: stagedOf(p.s.cfg)
        ? stagedSlots
            .filter((x) => stagedOf(p.s.cfg)!.books[x.book])
            .map((x) => x.sym)
            .join('+')
        : 'off',
      sliceNet: period.after,
      sliceDd: period.dd,
      boundaryEquity: period.equity,
      wholeNet: centre.net,
      wholeDd: centre.dd,
      wholeEnvelope: env,
      wholeAssessment: assessArm(centre, p0).pass,
      staged: (centre as SRec & { staged?: unknown }).staged ?? null,
      years: centre.years,
      lots: centre.lots,
      openAtBoundary: carried.map((x) => ({
        book: x.book,
        entry: x.entry,
        exit: x.exit,
        reason: x.reason,
        net: x.net,
        mae: x.mae
      })),
      nextInterval: {
        lots: nextLots.length,
        byBook: Object.fromEntries(
          ['D1:GDX', 'D1:VGT', 'G:VGT'].map((bk) => [bk, nextLots.filter((x) => x.book === bk).length])
        ),
        worstLotMae: maes.length ? maes[0]! : null,
        worstRealized: nextLots
          .filter((x) => x.exit !== null)
          .reduce<number | null>((a, x) => (a === null || x.net < a ? x.net : a), null),
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
        above35k: { breaches: k, share: k / Math.max(1, sliceDds.length), wilson95: wilson(k, sliceDds.length) },
        trainingBreachShare: p.s.selectTail.breachShare
      }
    };
  });
  return rows;
};

export const runInterval = async (cut: CutoffKey, resume = false) => {
  const file = intervalFile(cut);
  const spec = cutoffs[cut];
  const g = officialGuards(`${spec.sliceStage} ${cut}`);

  if (fs.existsSync(file)) throw new Error(`${rel(file)} exists: the ${spec.sliceStage} is sealed`);
  assertCommitted(selectionFile(cut));

  const subjects = intervalSubjectsOf(cut);
  const forecast = subjects.length * perSubject();
  const allowance = stageAllowance(`${spec.sliceStage} ${cut}`, forecast);
  const t0 = Date.now();

  return withOfficialJob({
    job: cut === 'C24' ? 'C24-validation' : `${cut}-interval`,
    resume,
    identity: definitionOf(spec.sliceStage, {
      cutoff: cut,
      door: spec.sliceDoor,
      interval: spec.slice,
      boundary: spec.end,
      subjects: subjects.map((s) => s.id)
    }),
    door: spec.sliceDoor,
    use: cut === 'C24' ? 'validation' : 'interval',
    doorPurpose: `official ${spec.sliceStage} ${cut} → ${spec.slice.join('…')} (${PROTOCOL_ID})`,
    maxFresh: Math.min(forecast, allowance.maxFresh),
    body: async (lab, ctx) => {
      const fresh0 = lab.fresh;
      const hits0 = lab.hits;
      const plans = intervalPlansOf(subjects, cut, spec.end);
      const items = plans.flatMap((p) => p.items);

      if (items.length > forecast) throw new Error(`${cut}: ${items.length} requested > the bound ${forecast}`);

      const recs = await lab.evalMany<SRec>(items, `${spec.sliceStage} ${cut}`);
      const rows = intervalRowsOf(plans, recs, spec.end);
      const record = {
        stage: spec.sliceStage,
        protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
        cutoff: cut,
        door: spec.sliceDoor,
        interval: spec.slice,
        boundary: spec.end,
        basis:
          'one continuous run from 2016-01-04 (state, open lots and marks preserved); interval P&L = the change of the marked net from the boundary close; interval DD = the strict tracker restarted at the boundary close; whole-run figures beside it; the envelope is a whole-run statistic',
        label:
          'retrospective, previously inspected history — never a pristine holdout or independent future validation',
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

// ----- the outcome (no evaluation; after the validation) -----

export const outcomeFile = path.join(resultsDir, 'outcome.json');

export const runOutcome = () => {
  if (fs.existsSync(outcomeFile)) throw new Error(`${rel(outcomeFile)} exists`);
  for (const c of cutoffKeys)
    for (const f of [selectionFile(c), intervalFile(c)]) if (!isSealed(f)) throw new Error(`${rel(f)} is not sealed`);

  type Sel = {
    primary: ReturnType<typeof primaryOf>;
    risk: ReturnType<typeof riskOf>;
    mechanism: ReturnType<typeof mechanismOf>;
    budgetBoundAfterExtension: Record<ArmKey, number>;
    pooled: Record<ArmKey, { primary: { id: string; label: string } | null }>;
    laneValues: Record<ArmKey, LaneValue[]>;
  };
  type Int = { rows: { id: string; label: string; sliceNet: number; sliceDd: number }[] };
  const sel = Object.fromEntries(cutoffKeys.map((c) => [c, readSealed<Sel>(selectionFile(c))])) as Record<
    CutoffKey,
    Sel
  >;
  const int = Object.fromEntries(cutoffKeys.map((c) => [c, readSealed<Int>(intervalFile(c))])) as Record<
    CutoffKey,
    Int
  >;
  const rowOf = (c: CutoffKey, id: string | undefined) => (id ? int[c].rows.find((r) => r.id === id) : undefined);
  const chrono = Object.fromEntries(
    armKeys.map((a) => [
      a,
      chronologicalVerdict(
        cutoffKeys.map((c) => {
          const r = rowOf(c, sel[c].pooled[a].primary?.id);

          return {
            cutoff: c,
            primary: !!sel[c].pooled[a].primary,
            intervalNet: r ? r.sliceNet : null,
            intervalDd: r ? r.sliceDd : null
          };
        })
      )
    ])
  ) as Record<ArmKey, ReturnType<typeof chronologicalVerdict>>;
  // the paired interval tests (§9.2)
  const t1 = Object.fromEntries(
    cutoffKeys.map((c) => {
      const e = rowOf(c, sel[c].pooled.EXP.primary?.id);
      const k = rowOf(c, sel[c].pooled.CTRL.primary?.id);

      return [
        c,
        e && k
          ? { expDd: e.sliceDd, ctrlDd: k.sliceDd, pass: e.sliceDd <= k.sliceDd + 5_000 }
          : { pass: null, reason: 'an arm has no pooled primary' }
      ];
    })
  );
  const paired = (c: CutoffKey, f: (r: { sliceNet: number; sliceDd: number }) => number) =>
    sel[c].laneValues.CTRL.flatMap((v) => {
      const e = sel[c].laneValues.EXP.find((x) => x.cell === v.cell && x.replicate === v.replicate)!;
      const a = rowOf(c, v.representative?.id);
      const b = rowOf(c, e.representative?.id);

      return a && b ? [{ cell: v.cell, d: f(b) - f(a) }] : [];
    });
  const t2 = Object.fromEntries(
    cutoffKeys.map((c) => [
      c,
      intervalDdOf(
        c,
        paired(c, (r) => r.sliceDd)
      )
    ])
  );
  const t3 = Object.fromEntries(
    cutoffKeys.map((c) => [
      c,
      intervalNetOf(
        c,
        paired(c, (r) => r.sliceNet)
      )
    ])
  );
  const label = outcomeLabel({
    primary: { C21: sel.C21.primary, C24: sel.C24.primary },
    risk: { C21: sel.C21.risk, C24: sel.C24.risk },
    mechanism: { C21: sel.C21.mechanism, C24: sel.C24.mechanism },
    budgetBound: primaryCutoffs.some((c) => armKeys.some((a) => sel[c].budgetBoundAfterExtension[a] > 0.25)),
    expChronologicallySupported: chrono.EXP.supported
  });
  const record = {
    kind: 'Priority 4 outcome (precommitted rules of PROTOCOL.md §1.4 and §9)',
    protocol: `${PROTOCOL_ID} ${PROTOCOL_VERSION}`,
    label,
    primary: Object.fromEntries(cutoffKeys.map((c) => [c, sel[c].primary])),
    risk: Object.fromEntries(cutoffKeys.map((c) => [c, sel[c].risk])),
    mechanism: Object.fromEntries(cutoffKeys.map((c) => [c, sel[c].mechanism])),
    budgetBoundAfterExtension: Object.fromEntries(cutoffKeys.map((c) => [c, sel[c].budgetBoundAfterExtension])),
    chronological: chrono,
    intervalTests: { T1: t1, T2: t2, T3: t3 },
    ledger: ledger(),
    adoption: 'none: research only; no phenotype is adopted, deployed or merged',
    finished: new Date().toISOString(),
    sources: cutoffKeys.flatMap((c) =>
      [selectionFile(c), intervalFile(c)].map((f) => ({ file: rel(f), sha256: sha256File(f) }))
    )
  };

  seal(outcomeFile, record, 'outcome');
  log(`outcome: ${label.label} — ${label.reason}`);
  return record;
};
