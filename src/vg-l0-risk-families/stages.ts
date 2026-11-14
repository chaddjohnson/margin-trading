// The stages (PROTOCOL.md §7–§11; reference method NL0's order). Per cutoff C19 → C21 → C23 → C24: the broad searches
// (base cells, onset cells in two jobs), the broad qualification (+ the New L0 control), the frozen refinement-cell
// plan, the refinement searches, their qualification, and the selection (the populations × the selectors) — sealed and
// COMMITTED before the fold's next slice opens; then the fold evaluation (folds.ts). Each stage writes one sealed
// record; a stage whose record exists refuses to rerun; an interrupted job resumes from its archive. The pilot runs the
// identical code with pilot budgets, `pilot-` job names, a handful of cells and an output directory in the cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { budgets, finishReserve, perLaneCap, perMemberCap } from './budgets.ts';
import { cacheRoot, freezeFile, log, repoRoot, researchDir, resultsDir } from './context.ts';
import type { DoorKey, PrefixDoor } from './doors.ts';
import { assertFrozenCode } from './freeze.ts';
import { withLab } from './lab.ts';
import { isSealed, readJson, sealRecord } from './records.ts';
import { Lane, type LaneResult, type LaneSpec, type Seed } from './search.ts';
import { type Cell, allCells, baseCells, cellOf, cfgId, legacyCellId, onsetCells } from './space.ts';
import { type Evidence, type Member, qualifyMembers, rolesOf } from './qualify.ts';
import { type PopulationName, type SelectorName, populations, refineCells, selectionSummary, selectors } from './select.ts';
import { newL0 } from './nl0.ts';

export interface CutoffSpec {
  key: string;
  door: PrefixDoor;
  end: string;
  evalDoor: DoorKey;
  slice: [string, string];
}

export const cutoffs: Record<string, CutoffSpec> = {
  C19: { key: 'C19', door: 'D19', end: '2019-12-31', evalDoor: 'D21', slice: ['2020-01-02', '2021-12-31'] },
  C21: { key: 'C21', door: 'D21', end: '2021-12-31', evalDoor: 'D23', slice: ['2022-01-03', '2023-12-29'] },
  C23: { key: 'C23', door: 'D23', end: '2023-12-29', evalDoor: 'D24', slice: ['2024-01-02', '2024-12-31'] },
  C24: { key: 'C24', door: 'D24', end: '2024-12-31', evalDoor: 'FULL', slice: ['2025-01-02', '2026-10-30'] },
  // the pilot's pseudo-fold (engineering only): search on D19, its "slice" 2019 inside D19
  P18: { key: 'P18', door: 'D19', end: '2018-12-31', evalDoor: 'D19', slice: ['2019-01-02', '2019-12-31'] }
};
export const foldCutoffs = ['C19', 'C21', 'C23'] as const;
export const finalCutoff = (cut: string) => cut === 'C24' || cut === 'P18';

export interface Env {
  schedule: 'study' | 'pilot';
  prefix: string; // job-name prefix ('' for the study; 'pilot-<run>-' for the pilot)
  outDir: string;
  workers: number;
  stopAfterFresh?: number;
  killWorkerAfter?: number;
}

export const studyEnv = (workers: number): Env => ({ schedule: 'study', prefix: '', outDir: resultsDir, workers });

export const seal = (env: Env, file: string, value: unknown, stage: string) =>
  sealRecord(env.schedule, file, value, `${env.prefix}${stage}`, path.join(env.outDir, 'seals.jsonl'));

// A sealed record that must also be committed unchanged before the next door opens (the freeze, fold selections, the
// frozen selection): tracked by git and identical to HEAD.
export const assertCommitted = (file: string) => {
  const rel = path.relative(repoRoot, file);

  try {
    execSync(`git ls-files --error-unmatch -- "${rel}"`, { cwd: repoRoot, stdio: 'ignore' });
    execSync(`git diff --quiet HEAD -- "${rel}"`, { cwd: repoRoot, stdio: 'ignore' });
  } catch {
    throw new Error(`${rel} is not committed unchanged (the guard of the next stage)`);
  }
};

// The guards of a substantive stage: the optimization-standard preflight (every stage, the pilot included), the
// protocol freeze (sealed and committed), the sealed engineering gates (0 failures) and the frozen evaluation code.
export const studyGuards = (env: Env) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (env.schedule === 'pilot') return;
  if (!isSealed(freezeFile)) throw new Error('the protocol is not frozen (results/protocol-freeze.json)');
  assertCommitted(freezeFile);

  const parityFile = path.join(resultsDir, 'parity', 'parity.json');

  if (!isSealed(parityFile)) throw new Error('the engineering gates are not sealed (results/parity/parity.json)');
  if (readJson<{ failed: number }>(parityFile).failed !== 0) throw new Error('an engineering gate failed: every dependent stage is blocked');
  assertFrozenCode();
};

// ----- files -----

export type Part = 'base' | 'onset1' | 'onset2' | 'refine' | 'pilot';
export const broadParts: Part[] = ['base', 'onset1', 'onset2'];
export const searchFile = (env: Env, cut: string, part: Part) => path.join(env.outDir, 'search', cut, `${part}.json`);
export const qualificationFile = (env: Env, cut: string, stage: 'broad' | 'refine') =>
  path.join(env.outDir, 'folds', cut, `${stage}-qualification.json`);
export const refinePlanFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'refine-plan.json');
export const selectionFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'selection.json');
export const evaluationFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'evaluation.json');
export const lotRowsDir = (env: Env, cut: string) => path.join(cacheRoot, 'lot-rows', env.prefix || 'study', cut);

// ----- cells and replicates (PROTOCOL.md §8): two replicates per cell (broad) and per refined cell -----

export const pilotCells = ['GA0.VA0', 'GB1.VD0e', 'GC0e.VB0', 'GD1.VC1e'];
export const replicates = (env: Env) => (env.schedule === 'pilot' ? { broad: 1, refine: 1 } : { broad: 2, refine: 2 });
export const cellsOfPart = (part: Part): readonly Cell[] =>
  part === 'base'
    ? baseCells
    : part === 'onset1'
      ? onsetCells.slice(0, 66)
      : part === 'onset2'
        ? onsetCells.slice(66)
        : part === 'pilot'
          ? pilotCells.map(cellOf)
          : [];
export const partsOf = (env: Env): Part[] => (env.schedule === 'pilot' ? ['pilot'] : broadParts);

if (cellsOfPart('base').length + cellsOfPart('onset1').length + cellsOfPart('onset2').length !== allCells.length)
  throw new Error('the broad parts do not partition the 196 cells');

// ----- lanes -----

const broadLanes = (cut: CutoffSpec, part: Part, env: Env): LaneSpec[] =>
  cellsOfPart(part).flatMap((cell) =>
    Array.from({ length: replicates(env).broad }, (_v, i) => {
      const key = `${cut.key}/broad/${cell.id}/R${i + 1}`;

      return { key, seedKey: key, position: key, stage: 'broad' as const, replicate: i + 1, cutoff: cut.key, kind: 'indep' as const, cell };
    })
  );

const refineLanes = (cut: CutoffSpec, env: Env): LaneSpec[] => {
  const planFile = refinePlanFile(env, cut.key);

  if (!isSealed(planFile)) throw new Error(`the refinement plan of ${cut.key} is not sealed`);

  const plan = readJson<{ cells: { cell: string; seeds: string[]; focus: string[] }[] }>(planFile);
  const broad = readJson<{ evidence: Evidence[] }>(qualificationFile(env, cut.key, 'broad')).evidence;
  const byLabel = new Map(broad.map((e) => [e.label, e]));

  return plan.cells.flatMap((p) =>
    Array.from({ length: replicates(env).refine }, (_v, i) => {
      const key = `${cut.key}/refine/${p.cell}/R${i + 1}`;
      const seeds: Seed[] = p.seeds.map((label) => ({ label, cfg: byLabel.get(label)!.cfg, focus: p.focus.includes(label) }));

      return { key, seedKey: key, position: key, stage: 'refine' as const, replicate: i + 1, cutoff: cut.key, kind: 'refine' as const, cell: cellOf(p.cell), seeds };
    })
  );
};

// independence: an earlier cutoff never runs after a later cutoff's selection exists in this study
const chronologyGuard = (env: Env, cutKey: string) => {
  if (env.schedule !== 'study') return;
  for (const later of Object.keys(cutoffs).filter((c) => c > cutKey && c.startsWith('C')))
    if (fs.existsSync(selectionFile(env, later))) throw new Error(`the ${later} selection exists: ${cutKey} would follow a later selection`);
};

// ----- search: every lane of (cutoff, part) in ONE job; extension rounds at barriers, one lane per position -----

export const runSearch = async (cutKey: string, part: Part, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = searchFile(env, cutKey, part);
  const kind = part === 'refine' ? 'refine' : 'broad';

  studyGuards(env);
  chronologyGuard(env, cutKey);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists: that search is complete`);
  if (part === 'pilot' && env.schedule !== 'pilot') throw new Error('the pilot part is for the pilot');

  const specs = part === 'refine' ? refineLanes(cut, env) : broadLanes(cut, part, env);
  // the cost calibration pilot (engineering only) may run the study's per-lane schedule on its pilot cells
  const budget = budgets[env.schedule === 'pilot' && process.env.VGL0RF_PILOT_BUDGET === 'study' ? 'study' : env.schedule][kind];
  const job = `${env.prefix}search-${cutKey}-${part}`;
  const laneFile = (k: string) => path.join(cacheRoot, 'jobs', job, 'lanes', `${k.replaceAll('/', '_')}.json`);
  const cap = env.schedule === 'study' ? specs.length * perLaneCap[kind] : undefined;
  const t0 = Date.now();

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}search ${cutKey} ${part}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      stopAfterFresh: env.stopAfterFresh,
      killWorkerAfter: env.killWorkerAfter,
      maxFresh: cap
    },
    async (lab) => {
      const lanes = specs.map((spec) => new Lane(lab, spec, budget));
      const requested = () => lanes.reduce((a, l) => a + l.requested, 0);
      const rounds: { round: number; positions: { position: string; fired: boolean; extended: boolean; atCap: boolean }[]; requestedBefore: number; worstCase: number; decision: string }[] = [];

      lab.stage = `search ${cutKey} ${part}: base (${lanes.length} lanes)`;
      await Promise.all(lanes.map((l) => l.base()));

      // extension rounds (5B's rule with one lane per position): a lane runs one more island iff its trigger fired on its
      // last island and it is below its cap; the resource guard (the job cap, the round's worst case and a finishing
      // reserve per lane) is checked at a barrier, so the decision is deterministic
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

        if (go.length && cap !== undefined && requested() + row.worstCase + finishReserve[kind] * lanes.length > cap) {
          for (const l of go) stops.set(l.spec.position, 'resource guard (the job cap on fresh simulations)');
          row.decision = `resource guard: ${requested()} requested + worst case ${row.worstCase} + finishing reserve ${finishReserve[kind] * lanes.length} > cap ${cap}`;
          rounds.push(row);
          break;
        }

        row.decision = go.length ? `extend ${go.length} lane(s)` : 'no lane extends';
        rounds.push(row);
        if (!go.length) break;
        lab.stage = `search ${cutKey} ${part}: extension round ${round} (${go.length} lanes)`;
        lab.checkpoint({ extensionRound: round, extending: go.map((l) => l.spec.key) });
        await Promise.all(go.map((l) => l.extend()));
      }

      lab.stage = `search ${cutKey} ${part}: finishing`;

      const results = await Promise.all(
        lanes.map(async (lane) => {
          const result = await lane.finish(stops.get(lane.spec.position) ?? 'triggers not met');
          const f = laneFile(lane.spec.key);
          const text = JSON.stringify(result);

          if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') !== text) throw new Error(`${lane.spec.key}: the replay differs from the kept lane result`);
          fs.mkdirSync(path.dirname(f), { recursive: true });
          fs.writeFileSync(f, text);
          lab.writeProgress();
          return result;
        })
      );
      const record = {
        stage: 'search',
        cutoff: cutKey,
        part,
        kind,
        door: cut.door,
        schedule: env.schedule,
        replicates: replicates(env)[kind],
        cells: [...new Set(specs.map((s) => s.cell.id))],
        lanesCount: specs.length,
        budget,
        cap: cap ?? null,
        extensionRounds: rounds,
        seeds: part === 'refine' ? Object.fromEntries(specs.filter((s) => s.replicate === 1).map((s) => [s.cell.id, s.seeds!.map((x) => ({ label: x.label, focus: !!x.focus }))])) : null,
        lanes: results,
        compute: lab.compute,
        codeDigest: lab.digest,
        minutes: Math.round((Date.now() - t0) / 600) / 100,
        peaks: lab.peaks,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `search ${cutKey} ${part}`);
      log(`search ${cutKey} ${part}: sealed ${path.relative(repoRoot, file)}`);
      return record;
    }
  );
};

// ----- qualification of a stage's shortlists (and, at the broad stage, the New L0 control) -----

const membersOfSearch = (env: Env, cutKey: string, part: Part): Member[] => {
  const f = searchFile(env, cutKey, part);

  if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);

  return readJson<{ lanes: LaneResult[] }>(f).lanes.flatMap((l) =>
    l.shortlist.map((p, i) => ({
      label: `${l.key}#${i + 1} ${p.pick}`,
      lane: l.key,
      stage: l.stage,
      replicate: l.replicate,
      cfg: p.cfg,
      pick: p.pick
    }))
  );
};

export const controlMembers = (): Member[] => [
  {
    label: 'control: New L0',
    lane: 'control',
    stage: 'control',
    replicate: null,
    cfg: { cell: legacyCellId, d1: newL0().quad.d1, controls: null },
    pick: 'New L0 (frozen; informed: chosen with later data; never selectable)'
  }
];

// the sealed form of an evidence row: the per-lot rows stay in the cache (lotRowsDir), the summaries are sealed
const sealedEvidence = (e: Evidence) => ({ ...e, risk: { ...e.risk, rows: undefined, rowsKept: e.risk.rows.length } });

export const runQualify = async (cutKey: string, stage: 'broad' | 'refine', env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = qualificationFile(env, cutKey, stage);

  studyGuards(env);
  chronologyGuard(env, cutKey);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  let members = stage === 'broad' ? [...partsOf(env).flatMap((p) => membersOfSearch(env, cutKey, p)), ...controlMembers()] : membersOfSearch(env, cutKey, 'refine');
  const duplicates: { label: string; sameAs: string }[] = [];

  if (stage === 'refine') {
    // a refined configuration identical to a broad member keeps the broad evidence (same cutoff, same draws)
    const broad = readJson<{ evidence: Evidence[] }>(qualificationFile(env, cutKey, 'broad')).evidence;
    const byId = new Map(broad.map((e) => [e.id, e.label]));

    members = members.filter((m) => {
      const same = byId.get(cfgId(m.cfg));

      if (same) duplicates.push({ label: m.label, sameAs: same });
      return !same;
    });
  }

  // one member per configuration within the stage (lanes can shortlist the same configuration)
  {
    const seen = new Map<string, string>();

    members = members.filter((m) => {
      const id = cfgId(m.cfg);
      const same = seen.get(id);

      if (same) duplicates.push({ label: m.label, sameAs: same });
      else seen.set(id, m.label);
      return !same;
    });
  }

  const job = `${env.prefix}qualify-${cutKey}-${stage}`;

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}qualify ${cutKey} ${stage}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      stopAfterFresh: env.stopAfterFresh,
      killWorkerAfter: env.killWorkerAfter,
      maxFresh: env.schedule === 'study' ? members.length * perMemberCap : undefined
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey);
      const rowsDir = lotRowsDir(env, cutKey);

      fs.mkdirSync(rowsDir, { recursive: true });
      fs.writeFileSync(path.join(rowsDir, `${stage}.json`), JSON.stringify(evidence.map((e) => ({ label: e.label, rows: e.risk.rows }))));

      const byCell: Record<string, { members: number; qualified: number; failed: Record<string, number> }> = {};

      for (const e of evidence.filter((x) => x.stage !== 'control')) {
        const c = (byCell[e.cell] ??= { members: 0, qualified: 0, failed: {} });

        c.members++;
        if (e.qualified) c.qualified++;
        for (const g of e.failed) c.failed[g] = (c.failed[g] ?? 0) + 1;
      }

      const record = {
        stage: 'qualification',
        cutoff: cutKey,
        qualificationStage: stage,
        door: cut.door,
        members: members.length,
        qualified: evidence.filter((e) => e.qualified && e.stage !== 'control').length,
        duplicates,
        byCell,
        evidence: evidence.map(sealedEvidence),
        compute: lab.compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `qualify ${cutKey} ${stage}`);
      log(`qualify ${cutKey} ${stage}: ${record.qualified} of ${members.length} qualified; sealed`);
      return record;
    }
  );
};

// ----- the refinement plan (frozen rule select.ts refineCells; no evaluation) -----

export const runRefineSelect = async (cutKey: string, env: Env) => {
  const file = refinePlanFile(env, cutKey);

  studyGuards(env);
  chronologyGuard(env, cutKey);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const q = qualificationFile(env, cutKey, 'broad');

  if (!isSealed(q)) throw new Error('the broad qualification is not sealed');

  const evidence = readJson<{ evidence: Evidence[] }>(q).evidence.filter((e) => e.stage === 'broad');
  const plan = refineCells(evidence);

  seal(env, file, { stage: 'refinement plan', cutoff: cutKey, rule: 'select.ts refineCells (PROTOCOL.md §7.3)', ...plan, finished: new Date().toISOString() }, `refine plan ${cutKey}`);
  log(`refinement plan ${cutKey}: ${plan.cells.length} cells (${plan.eligible} eligible)`);
  return plan;
};

// ----- the selection: every population × selector, NL0's roles per population (sealed; committed before the slice) -----

export const evidenceOf = (env: Env, cutKey: string): Evidence[] => {
  const out: Evidence[] = [];
  const seen = new Set<string>();

  for (const stage of ['broad', 'refine'] as const) {
    const f = qualificationFile(env, cutKey, stage);

    if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);
    for (const e of readJson<{ evidence: Evidence[] }>(f).evidence)
      if (!seen.has(e.id)) {
        seen.add(e.id);
        out.push(e);
      }
  }
  return out;
};

export const populationNames: PopulationName[] = ['L', 'B', 'F'];
export const selectorNames: SelectorName[] = ['original', 'RA1', 'RA2'];

export const runSelect = async (cutKey: string, env: Env) => {
  const file = selectionFile(env, cutKey);

  studyGuards(env);
  chronologyGuard(env, cutKey);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const all = evidenceOf(env, cutKey);
  const candidates = all.filter((e) => e.stage !== 'control');
  const primaries: Record<string, Record<string, string | null>> = {};
  const rankings: Record<string, Record<string, ReturnType<typeof selectionSummary>[]>> = {};
  const roles: Record<string, ReturnType<typeof rolesOf>> = {};

  for (const p of populationNames) {
    const pop = candidates.filter(populations[p]);

    primaries[p] = {};
    rankings[p] = {};
    roles[p] = rolesOf(`population ${p}`, pop);
    for (const s of selectorNames) {
      const order = selectors[s](pop);

      primaries[p]![s] = order[0]?.label ?? null;
      rankings[p]![s] = order.slice(0, 10).map(selectionSummary);
    }
  }

  const record = {
    stage: 'selection',
    cutoff: cutKey,
    populations: { L: 'the legacy cell GA0.VA0', B: 'the 64 base cells (RC 1 mechanics)', F: 'all 196 cells (base + entry-day onset)' },
    counts: Object.fromEntries(populationNames.map((p) => [p, { members: candidates.filter(populations[p]).length, qualified: candidates.filter(populations[p]).filter((e) => e.qualified).length }])),
    primaries,
    rankings,
    roles,
    subjects: Object.fromEntries(
      [...new Set(Object.values(primaries).flatMap((x) => Object.values(x)).concat(Object.values(roles).flatMap((r) => Object.values(r.roles))))]
        .filter((l): l is string => Boolean(l))
        .map((l) => [l, candidates.find((e) => e.label === l)!])
    ),
    control: all.find((e) => e.stage === 'control') ?? null,
    finished: new Date().toISOString()
  };

  seal(env, file, record, `selection ${cutKey}`);
  log(`selection ${cutKey}: ${JSON.stringify(primaries)}`);
  return record;
};
