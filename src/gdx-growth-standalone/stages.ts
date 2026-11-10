// The stages (PROTOCOL.md §7–§12): independent search per cutoff → (C24 only) informed search → qualify (and select) →
// fold evaluation (earlier cutoffs) → sequential → at C24: diagnostics → frozen selection → validation. Each stage writes
// one sealed record; a stage whose record exists refuses to rerun. The pilot runs the identical code with pilot budgets,
// `pilot-` job names and an output directory in the git-ignored cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { evaluationCaps, independentBudget, informedBudget, proposalPlan } from './budgets.ts';
import { cacheRoot, controlManifestFile, freezeFile, log, repoRoot, researchDir, resultsDir } from './context.ts';
import { type Seed, appendixA, appendixAId, informedSeeds, loadControls } from './controls.ts';
import type { DoorKey, PrefixDoor } from './doors.ts';
import { assertFrozenCode } from './freeze.ts';
import { withLab } from './lab.ts';
import { type Evidence, type Member, type Roles, labelsOf, qualifyMembers, rolesOf, summary } from './qualify.ts';
import { isSealed, readJson, sealRecord, sha256File } from './records.ts';
import { Lane, type LaneResult, type LaneSpec, seedDesigns } from './search.ts';
import { anchorS, gId } from './space.ts';

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

export const finalCutoff = (cut: string) => cut === 'C24' || cut === 'P18';

export type LaneName = 'independent' | 'informed';

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

// A sealed record that must also be committed unchanged before the next door opens.
export const assertCommitted = (file: string) => {
  const rel = path.relative(repoRoot, file);

  try {
    execSync(`git ls-files --error-unmatch -- "${rel}"`, { cwd: repoRoot, stdio: 'ignore' });
    execSync(`git diff --quiet HEAD -- "${rel}"`, { cwd: repoRoot, stdio: 'ignore' });
  } catch {
    throw new Error(`${rel} is not committed unchanged (the guard of the next stage)`);
  }
};

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');

// The guards of a substantive study stage: the optimization-standard preflight (every stage, the pilot included), the
// protocol freeze (committed), the sealed engineering gates with 0 failures, the sealed control manifest and the frozen
// evaluation code.
export const studyGuards = (env: Env) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (env.schedule === 'pilot') return;
  if (!isSealed(freezeFile)) throw new Error('the protocol is not frozen (results/protocol-freeze.json)');
  assertCommitted(freezeFile);
  if (!isSealed(parityFile)) throw new Error('the engineering gates are not sealed (results/parity/parity.json)');
  if (readJson<{ failed: number }>(parityFile).failed !== 0)
    throw new Error('an engineering gate failed: every dependent stage is blocked');
  if (!isSealed(controlManifestFile)) throw new Error('the control manifest is not sealed');
  assertFrozenCode();
};

// ----- files -----

export const searchFile = (env: Env, cut: string, lane: LaneName) =>
  path.join(env.outDir, 'search', cut, `${lane}.json`);
export const selectionFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'selection.json');
export const evaluationFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'evaluation.json');

// ----- lanes -----

export const seedsFor = (env: Env): Seed[] =>
  env.schedule === 'pilot' ? informedSeeds().slice(0, 4) : informedSeeds();

export const lanesFor = (cut: CutoffSpec, env: Env, lane: LaneName) => {
  const out: { spec: LaneSpec; budget: ReturnType<typeof independentBudget> }[] = [];

  if (lane === 'independent') {
    for (const entry of ['rise', 'breakout'] as const)
      out.push({
        spec: { key: `${cut.key}/indep-${entry}`, cutoff: cut.key, arm: 'S', anchor: anchorS, kind: 'broad', entry },
        budget: independentBudget(env.schedule)
      });
    return { lanes: out, plan: proposalPlan(env.schedule, null), seeds: [] as Seed[] };
  }

  if (!finalCutoff(cut.key)) throw new Error('the informed lane runs at C24 only');

  const seeds = seedsFor(env);
  const spec: LaneSpec = {
    key: `${cut.key}/informed`,
    cutoff: cut.key,
    arm: 'S',
    anchor: anchorS,
    kind: 'seeded',
    seeds,
    refineFrom: [appendixA().gdx]
  };
  const p = informedBudget(env.schedule, 1);
  const designs = seedDesigns(spec, p.fine, p.near, p.broad).length;

  out.push({ spec, budget: informedBudget(env.schedule, designs) });
  return { lanes: out, plan: proposalPlan(env.schedule, designs), seeds };
};

// ----- search -----

export const runSearch = async (cutKey: string, env: Env, lane: LaneName) => {
  const cut = cutoffs[cutKey]!;
  const file = searchFile(env, cutKey, lane);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists: that search is complete`);
  if (lane === 'informed' && !finalCutoff(cutKey)) throw new Error('the informed lane runs at C24 only');

  // order (PROTOCOL.md §10): an earlier cutoff never runs after a later one's selection exists in this study
  if (env.schedule === 'study')
    for (const later of Object.values(cutoffs).filter((c) => c.key > cutKey && c.key.startsWith('C')))
      if (fs.existsSync(selectionFile(env, later.key)))
        throw new Error(`the ${later.key} selection exists: ${cutKey}'s search would follow a later selection`);
  if (fs.existsSync(selectionFile(env, cutKey))) throw new Error(`the ${cutKey} selection exists`);

  const { lanes, plan, seeds } = lanesFor(cut, env, lane);
  const job = `${env.prefix}search-${cutKey}-${lane}`;
  const laneFile = (k: string) => path.join(cacheRoot, 'jobs', job, 'lanes', `${k.replaceAll('/', '_')}.json`);
  const t0 = Date.now();

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}search ${cutKey} ${lane}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      stopAfterFresh: env.stopAfterFresh,
      killWorkerAfter: env.killWorkerAfter,
      ...(env.schedule === 'study'
        ? {
            maxFresh: lane === 'independent' ? evaluationCaps.searchIndependentPerCutoff : evaluationCaps.searchInformed
          }
        : {})
    },
    async (lab) => {
      lab.stage = `search ${cutKey} ${lane}: ${lanes.length} lane(s) concurrently`;

      // the lanes run concurrently on the one worker pool; each is a deterministic function of its own seeds and
      // evaluations. A finished lane's result is kept in the job directory; on a resume it is replayed (every evaluation
      // read back from the archive) and must reproduce the kept result exactly.
      const results = await Promise.all(
        lanes.map(async ({ spec, budget }) => {
          const result = await new Lane(lab, spec, budget).run();
          const f = laneFile(spec.key);
          const text = JSON.stringify(result);

          if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') !== text)
            throw new Error(`${spec.key}: the replay differs from the kept lane result`);
          fs.mkdirSync(path.dirname(f), { recursive: true });
          fs.writeFileSync(f, text);
          lab.writeProgress();
          return result;
        })
      );
      const record = {
        stage: 'search',
        cutoff: cutKey,
        lane,
        door: cut.door,
        schedule: env.schedule,
        budgets: Object.fromEntries(lanes.map((l) => [l.spec.key, l.budget])),
        proposalPlan: plan,
        seeds: seeds.map((s) => ({ label: s.label, id: gId(s.gdx), source: s.source, provenance: s.cutoff })),
        lanes: results,
        compute: lab.compute,
        codeDigest: lab.digest,
        minutes: Math.round((Date.now() - t0) / 600) / 100,
        peaks: lab.peaks,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `search ${cutKey} ${lane}`);
      log(`search ${cutKey} ${lane}: sealed ${path.relative(repoRoot, file)}`);
      return record;
    }
  );
};

// ----- members -----

export const membersOf = (cutKey: string, env: Env): Member[] => {
  const members: Member[] = [];
  const fin = finalCutoff(cutKey);
  const lanes: LaneName[] = fin ? ['independent', 'informed'] : ['independent'];

  for (const lane of lanes) {
    const search = readJson<{ lanes: LaneResult[] }>(searchFile(env, cutKey, lane));

    for (const l of search.lanes)
      l.shortlist.forEach((f, i) =>
        members.push({
          label: `${l.key}#${i + 1} ${f.pick}`,
          kind: lane,
          lane: l.key,
          origin: f.origin,
          gdx: f.gdx,
          selectable: true
        })
      );
  }

  for (const c of loadControls()) {
    // the earlier cutoffs keep only Appendix A (descriptive: browser-chosen with later data) and cash
    if (!fin && c.key !== 'A' && c.key !== 'CASH') continue;
    members.push({
      label: c.label,
      kind: c.key === 'CASH' ? 'reference' : 'control',
      lane: 'control',
      origin: c.key === 'CASH' ? 'reference' : 'control',
      gdx: c.gdx,
      selectable: fin && c.selectable,
      control: c.key
    });
  }

  return members;
};

// ----- roles, the primaries and the descriptive comparison with Appendix A -----

export const selectionOf = (evidence: readonly Evidence[], fin: boolean) => {
  const sets: Record<string, Roles> = {};
  const indep = evidence.filter((e) => e.kind === 'independent');

  sets.independent = rolesOf('the independent lane (its cells’ shortlists)', indep);
  if (fin) {
    sets.final = rolesOf(
      'the selectable set: the independent and informed shortlists, Appendix A and the predeclared prior controls',
      evidence.filter((e) => e.selectable)
    );
    sets.informed = rolesOf(
      'the informed comparison without the independent lane: the informed shortlist, Appendix A and the prior controls (report)',
      evidence.filter((e) => e.selectable && (e.kind === 'informed' || e.kind === 'control'))
    );
    sets.controls = rolesOf(
      'the controls alone: Appendix A and the prior controls (report)',
      evidence.filter((e) => e.kind === 'control')
    );
  }

  const primary = fin ? sets.final!.roles['actual-profit'] : sets.independent.roles['actual-profit'];
  const independentPrimary = sets.independent.roles['actual-profit'];
  const pe = evidence.find((e) => e.label === primary);
  const fallback = !primary
    ? 'no qualified member: no supported standalone candidate'
    : pe?.kind === 'control'
      ? `the qualifying-incumbent fallback: ${primary} has the highest development centre net among qualified members`
      : `a searched ${pe?.kind} member: ${primary}`;
  const ref = evidence.find((e) => e.gdxId === appendixAId);
  const versusAppendixA = ref ? evidence.filter((e) => e !== ref && e.gdx).map((e) => labelsOf(e, ref)) : [];

  return { sets, primary, independentPrimary, fallback, versusAppendixA };
};

export const runQualify = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = selectionFile(env, cutKey);
  const fin = finalCutoff(cutKey);

  studyGuards(env);
  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: the selection of ${cutKey} is sealed`);
  for (const lane of fin ? (['independent', 'informed'] as const) : (['independent'] as const))
    if (!isSealed(searchFile(env, cutKey, lane))) throw new Error(`the ${lane} search of ${cutKey} is not sealed`);

  const members = membersOf(cutKey, env);

  return withLab(
    {
      job: `${env.prefix}qualify-${cutKey}`,
      door: cut.door,
      purpose: `${env.prefix}qualify ${cutKey}`,
      workers: env.workers,
      ...(env.schedule === 'pilot'
        ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${env.prefix}qualify-${cutKey}.jsonl`) }
        : { maxFresh: evaluationCaps.qualifyPerCutoff })
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey, fin);
      const sel = selectionOf(evidence, fin);
      const nearMisses = evidence
        .filter((e) => e.gdx && e.failed.length > 0 && e.failed.every((g) => g === 'Q3' || g === 'Q4' || g === 'Q5'))
        .map((e) => ({
          label: e.label,
          kind: e.kind,
          failed: e.failed,
          severity: e.severity,
          net: e.centre.net,
          dd: e.centre.dd
        }));
      const record = {
        stage: 'qualify',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        primary: sel.primary,
        independentPrimary: sel.independentPrimary,
        fallback: sel.fallback,
        roles: sel.sets,
        versusAppendixA: sel.versusAppendixA,
        nearMisses,
        summary: evidence.map(summary),
        evidence,
        compute: lab.compute,
        codeDigest: lab.digest,
        searches: Object.fromEntries(
          (fin ? (['independent', 'informed'] as const) : (['independent'] as const)).map((l) => [
            l,
            sha256File(searchFile(env, cutKey, l))
          ])
        ),
        finished: new Date().toISOString()
      };

      seal(env, file, record, `qualify ${cutKey}`);
      log(`qualify ${cutKey}: primary ${sel.primary}; independent primary ${sel.independentPrimary}`);
      return record;
    }
  );
};

export type { LaneResult };
