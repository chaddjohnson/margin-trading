// The stages (PROTOCOL.md §7–§12): search (per cutoff: the three arms' lanes on one pool) → qualify (and select) →
// fold evaluation (earlier cutoffs) → sequential → at C24: transfers → diagnostics → frozen selection → validation.
// Each stage writes one sealed record; a stage whose record exists refuses to rerun. The pilot runs the identical code
// with pilot budgets, `pilot-` job names and an output directory in the git-ignored cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { evaluationCaps, laneBudgets, proposalPlan } from './budgets.ts';
import { cacheRoot, freezeFile, log, repoRoot, researchDir, resultsDir } from './context.ts';
import { type Control, type Seed, anchorsOf, loadControls, seedsAt } from './controls.ts';
import type { DoorKey, PrefixDoor } from './doors.ts';
import { assertFrozenCode } from './freeze.ts';
import { withLab } from './lab.ts';
import { type Evidence, type Member, type Roles, armAssessment, qualifyMembers, rolesOf, summary } from './qualify.ts';
import { isSealed, readJson, sealRecord, sha256File } from './records.ts';
import { Lane, type LaneResult, type LaneSpec, seedDesigns } from './search.ts';
import { type Arm, arms, build, gId } from './space.ts';

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
export const auditFile = path.join(resultsDir, 'audit', 'archive-audit.json');

// The guards of a substantive study stage: the optimization-standard preflight (every stage, the pilot included), the
// protocol freeze (committed), the sealed engineering gates with 0 failures, the sealed archive audit and the frozen
// evaluation code.
export const studyGuards = (env: Env) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (env.schedule === 'pilot') return;
  if (!isSealed(freezeFile)) throw new Error('the protocol is not frozen (results/protocol-freeze.json)');
  assertCommitted(freezeFile);
  if (!isSealed(parityFile)) throw new Error('the engineering gates are not sealed (results/parity/parity.json)');
  if (readJson<{ failed: number }>(parityFile).failed !== 0)
    throw new Error('an engineering gate failed: every dependent stage is blocked');
  if (!isSealed(auditFile)) throw new Error('the archive audit is not sealed');
  assertFrozenCode();
};

// ----- files -----

export const searchFile = (env: Env, cut: string) => path.join(env.outDir, 'search', cut, 'search.json');
export const selectionFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'selection.json');
export const evaluationFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'evaluation.json');
export const transferFile = (env: Env) => path.join(env.outDir, 'transfers', 'transfers.json');

// ----- seeds -----

// The archive audit's exact-anchor GDX vectors (labelled archive seeds; final cutoff only).
export const auditSeeds = (): Seed[] => {
  if (!isSealed(auditFile)) return [];

  const a = readJson<{ seeds: Seed[] }>(auditFile);

  return a.seeds;
};

export const seedsFor = (env: Env, cut: string): Seed[] =>
  env.schedule === 'pilot' ? seedsAt('C19').slice(0, 8) : seedsAt(cut, cut === 'C24' ? auditSeeds() : []);

// ----- lanes -----

export const lanesFor = (cut: CutoffSpec, env: Env, only?: Arm[]) => {
  const anchors = anchorsOf();
  const seeds = seedsFor(env, cut.key);
  const out: { spec: LaneSpec; budget: ReturnType<typeof laneBudgets>['seeded'] }[] = [];
  const plansOut: Record<string, ReturnType<typeof proposalPlan>> = {};

  for (const arm of only ?? arms) {
    const seededSpec: LaneSpec = {
      key: `${cut.key}/${arm}/seeded`,
      cutoff: cut.key,
      arm,
      anchor: anchors[arm],
      kind: 'seeded',
      seeds
    };
    const p = laneBudgets(env.schedule, arm, 1).seeded;
    const designs = seedDesigns(seededSpec, p.near, p.broad).length;
    const b = laneBudgets(env.schedule, arm, designs);

    plansOut[arm] = proposalPlan(env.schedule, arm, designs);
    out.push({ spec: seededSpec, budget: b.seeded });
    for (const entry of ['rise', 'breakout'] as const)
      out.push({
        spec: {
          key: `${cut.key}/${arm}/broad-${entry}`,
          cutoff: cut.key,
          arm,
          anchor: anchors[arm],
          kind: 'broad',
          entry
        },
        budget: b[entry]
      });
  }

  return { lanes: out, plans: plansOut, seeds };
};

// ----- search -----

export const runSearch = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = searchFile(env, cutKey);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists: that search is complete`);

  // order (PROTOCOL.md §10): an earlier cutoff never runs after a later one's selection exists in this study
  if (env.schedule === 'study')
    for (const later of Object.values(cutoffs).filter((c) => c.key > cutKey && c.key.startsWith('C')))
      if (fs.existsSync(selectionFile(env, later.key)))
        throw new Error(`the ${later.key} selection exists: ${cutKey}'s search would follow a later selection`);

  const { lanes, plans, seeds } = lanesFor(cut, env);
  const job = `${env.prefix}search-${cutKey}`;
  const laneFile = (k: string) => path.join(cacheRoot, 'jobs', job, 'lanes', `${k.replaceAll('/', '_')}.json`);
  const t0 = Date.now();

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}search ${cutKey}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      stopAfterFresh: env.stopAfterFresh,
      killWorkerAfter: env.killWorkerAfter,
      ...(env.schedule === 'study' ? { maxFresh: evaluationCaps.searchPerCutoff } : {})
    },
    async (lab) => {
      lab.stage = `search ${cutKey}: ${lanes.length} lane(s) concurrently`;

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
        door: cut.door,
        schedule: env.schedule,
        budgets: Object.fromEntries(lanes.map((l) => [l.spec.key, l.budget])),
        proposalPlans: plans,
        seeds: seeds.map((s) => ({ label: s.label, id: gId(s.gdx), source: s.source, provenance: s.cutoff })),
        lanes: results,
        compute: lab.compute,
        codeDigest: lab.digest,
        minutes: Math.round((Date.now() - t0) / 600) / 100,
        peaks: lab.peaks,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `search ${cutKey}`);
      log(`search ${cutKey}: sealed ${path.relative(repoRoot, file)}`);
      return record;
    }
  );
};

// ----- members -----

const controlMember = (c: Control): Member => ({
  label: `control: ${c.key}`,
  arm: c.arm,
  kind: c.role === 'baseline' ? 'baseline' : c.role === 'control' ? 'control' : 'context',
  lane: 'control',
  origin: 'control',
  quad: c.quad,
  enabled: c.enabled,
  options: c.options,
  gdx: c.enabled.includes('G:GDX') && c.built ? c.built.cfg.gdx : c.enabled.includes('G:GDX') ? c.quad.g.GDX : null,
  selectable: c.selectable,
  control: c.key
});

export const membersOf = (cutKey: string, env: Env): Member[] => {
  const members: Member[] = [];
  const { controls, anchors } = loadControls();
  const search = readJson<{ lanes: LaneResult[] }>(searchFile(env, cutKey));

  for (const arm of arms) {
    for (const c of controls.filter((x) => x.arm === arm)) members.push(controlMember(c));
    for (const lane of search.lanes.filter((l) => l.arm === arm))
      lane.shortlist.forEach((f, i) => {
        const b = build(anchors[arm], f.gdx);

        members.push({
          label: `${lane.key}#${i + 1} ${f.pick}`,
          arm,
          kind: 'partner',
          lane: lane.key,
          origin: f.origin,
          quad: b.quad,
          enabled: b.enabled,
          options: b.options,
          gdx: b.cfg.gdx,
          selectable: true
        });
      });
  }

  if (finalCutoff(cutKey)) for (const c of controls.filter((x) => x.role === 'context')) members.push(controlMember(c));
  return members;
};

// ----- roles, the primaries and the arm assessments -----

export const selectionOf = (evidence: readonly Evidence[]) => {
  const sets: Record<string, Roles> = {};
  const assessments: Record<string, ReturnType<typeof armAssessment>> = {};
  const primaries: Record<string, string | null> = {};

  for (const arm of arms) {
    const ev = evidence.filter((e) => e.arm === arm && e.selectable);

    sets[arm] = rolesOf(
      `arm ${arm}: the baseline (GDX OFF), the arm's Appendix A control and its searched partners`,
      ev
    );
    sets[`${arm} partners`] = rolesOf(
      `arm ${arm}: GDX-enabled members only (report)`,
      ev.filter((e) => e.enabled.includes('G:GDX'))
    );
    primaries[arm] = sets[arm]!.roles['actual-profit'];
    assessments[arm] = armAssessment(arm, evidence);
  }

  return { sets, primaries, assessments };
};

export const runQualify = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = selectionFile(env, cutKey);

  studyGuards(env);
  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: the selection of ${cutKey} is sealed`);
  if (!isSealed(searchFile(env, cutKey))) throw new Error(`the search of ${cutKey} is not sealed`);

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
      const evidence = await qualifyMembers(lab, members, cutKey, finalCutoff(cutKey));
      const { sets, primaries, assessments } = selectionOf(evidence);
      const nearMisses = evidence
        .filter(
          (e) => e.failed.length > 0 && e.failed.every((g) => g === 'Q3' || g === 'Q4' || g === 'Q5' || g === 'Q7')
        )
        .map((e) => ({
          label: e.label,
          arm: e.arm,
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
        primaries,
        roles: sets,
        assessments,
        nearMisses,
        summary: evidence.map(summary),
        evidence,
        compute: lab.compute,
        codeDigest: lab.digest,
        search: sha256File(searchFile(env, cutKey)),
        finished: new Date().toISOString()
      };

      seal(env, file, record, `qualify ${cutKey}`);
      log(`qualify ${cutKey}: primaries ${JSON.stringify(primaries)}`);
      return record;
    }
  );
};

export type { LaneResult };
