// The stages (PROTOCOL.md §7–§12; reference method NL0's order): per cutoff C19 → C21 → C23 the fresh tracks' searches
// and selections (B1; B2 step d1 → its finalists → B2 step g), committed before the fold slice opens, the training-door
// cross-test and the fold evaluation; the sequential paths; then C24: B1, B2, A1, A2 (each with its selection), the
// controls' qualification and the final selection; the ablation cross-test and the diagnostics; the frozen selection;
// the validation on FULL once. Each stage writes one sealed record; a stage whose record exists refuses to rerun. The
// pilot runs the identical code with pilot budgets, `pilot-` job names and an output directory in the git-ignored cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { budgetKeyOf, budgets, finishReserve, perLaneCap } from './budgets.ts';
import {
  type Step,
  type Track,
  cacheRoot,
  freezeFile,
  informedTrack,
  log,
  repoRoot,
  researchDir,
  resultsDir,
  searchKey,
  sequentialTrack
} from './context.ts';
import { type Cfg, type CellKey, type Sub, cfgId, subs } from './config.ts';
import { informedD1Seeds, informedGrowthSeeds, informedSeeds } from './controls.ts';
import type { DoorKey, PrefixDoor } from './doors.ts';
import { assertFrozenCode } from './freeze.ts';
import { withLab } from './lab.ts';
import { isSealed, readJson, sealRecord } from './records.ts';
import { Lane, type LaneResult, type LaneSpec } from './search.ts';

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

// The guards of a substantive study stage: the optimization-standard preflight (every stage, the pilot included), the
// protocol freeze, the sealed engineering gates and the frozen evaluation code (the pilot never writes a study record).
export const studyGuards = (env: Env) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (env.schedule === 'pilot') return;
  if (!isSealed(freezeFile)) throw new Error('the protocol is not frozen (results/protocol-freeze.json)');
  assertCommitted(freezeFile);

  const parityFile = path.join(resultsDir, 'parity', 'parity.json');

  if (!isSealed(parityFile)) throw new Error('the engineering gates are not sealed (results/parity/parity.json)');
  if (readJson<{ failed: number }>(parityFile).failed !== 0)
    throw new Error('an engineering gate failed: every dependent stage is blocked');

  const code = assertFrozenCode();

  // an acknowledged evaluation change (AMENDMENTS.md A1) runs only behind its own sealed stage V with 0 failures
  if (code?.ack) {
    const f = path.join(repoRoot, code.ack.parity);

    if (!isSealed(f)) throw new Error(`${code.ack.parity} (the stage V of ${code.ack.amendment}) is not sealed`);
    if (readJson<{ failed: number }>(f).failed !== 0) throw new Error(`${code.ack.parity}: an engineering gate failed`);
  }
};

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

// ----- files -----

export const searchFile = (env: Env, cut: string, track: Track, step: Step) =>
  path.join(env.outDir, 'search', cut, `${searchKey(track, step)}.json`);
// the selection of a track's step at a cutoff: step d1 → its D1 finalists; joint or step g → the track's selection
export const selectionFile = (env: Env, cut: string, track: Track, step: Step) =>
  path.join(env.outDir, 'folds', cut, searchKey(track, step), 'selection.json');
export const finalStepOf = (track: Track): Step => (sequentialTrack(track) ? 'g' : 'joint');
export const controlsFile = (env: Env, cut: string) =>
  path.join(env.outDir, 'folds', cut, 'controls', 'selection.json');
export const finalSelectionFile = (env: Env, cut: string) =>
  path.join(env.outDir, 'folds', cut, 'final', 'selection.json');
export const evaluationFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'evaluation.json');

// ----- replicates per track and step (PROTOCOL.md §8.2): NL0's unchanged lane schedules, scaled by replicates -----
//   B1 32 × (V1, V2, V3); B2 step d1 16 × (V1, V2, V3), step g 8 × (V1, V2, V3) per D1 finalist (2 finalists);
//   A1 28 informed lanes; A2 step d1 14, step g 7 per D1 finalist.
// The pilot: 1 replicate everywhere.
export const studyReplicates: Record<string, number> = {
  B1: 32,
  'B2-d1': 16,
  'B2-g': 8,
  A1: 28,
  'A2-d1': 14,
  'A2-g': 7
};
export const d1Finalists = 2;
export const replicatesOf = (env: Env, track: Track, step: Step) =>
  env.schedule === 'pilot' ? 1 : studyReplicates[searchKey(track, step)]!;

// The D1 finalists of a sequential track's first step (sealed in its selection record): the frozen inputs of step g.
export interface D1Finalist {
  index: number; // 1-based
  label: string;
  role: string;
  id: string;
  cfg: Cfg;
}

export const finalistsOf = (env: Env, cut: string, track: Track): D1Finalist[] => {
  const f = selectionFile(env, cut, track, 'd1');

  if (!isSealed(f)) throw new Error(`the ${track} step-d1 selection of ${cut} is not sealed: step g cannot start`);
  return readJson<{ finalists: D1Finalist[] }>(f).finalists;
};

// ----- lanes -----

const indepCell = (inc: 'V' | 'D', sub: Sub, extra: Partial<CellKey> = {}): CellKey => ({ inc, sub, ...extra });

export const lanesFor = (cut: CutoffSpec, track: Track, step: Step, env: Env): LaneSpec[] => {
  const out: LaneSpec[] = [];
  const informed = informedTrack(track);

  if (informed && !finalCutoff(cut.key)) throw new Error('the informed tracks run at the final cutoff only');
  if (step === 'joint' && sequentialTrack(track)) throw new Error(`${track} is sequential`);
  if (step !== 'joint' && !sequentialTrack(track)) throw new Error(`${track} is joint`);

  const R = replicatesOf(env, track, step);
  const finalists: (D1Finalist | null)[] = step === 'g' ? finalistsOf(env, cut.key, track) : [null];

  if (step === 'g' && finalists.length === 0) return out; // no D1 finalist: step g has nothing to search (reported)

  for (const fin of finalists) {
    const cell = (sub?: Sub): CellKey => {
      const base: CellKey =
        step === 'd1'
          ? { inc: 'D', shFree: [true, true, false], shFixed: '000' }
          : step === 'g'
            ? { inc: 'V', shFree: [false, false, true], shFixed: `${fin!.cfg.sh.slice(0, 2)}0` }
            : { inc: 'V' };

      return sub ? indepCell(base.inc as 'V' | 'D', sub, base) : base;
    };
    const fk = fin ? `/F${fin.index}` : '';

    for (let r = 1; r <= R; r++) {
      const common = {
        track,
        step,
        finalist: fin?.index ?? null,
        replicate: r,
        cutoff: cut.key,
        ...(fin ? { d1Fixed: fin.cfg.quad.d1 } : {})
      };

      if (!informed)
        for (const sub of subs) {
          const key = `${cut.key}/${searchKey(track, step)}${fk}/R${r}/${sub}`;

          out.push({ ...common, key, seedKey: key, position: key, kind: 'indep', cell: cell(sub), res: 'coarse' });
        }
      else {
        const key = `${cut.key}/${searchKey(track, step)}${fk}/R${r}`;

        out.push({
          ...common,
          key,
          seedKey: key,
          position: key,
          kind: 'informed',
          cell: cell(),
          res: 'fine',
          seeds: step === 'joint' ? informedSeeds() : step === 'd1' ? informedD1Seeds() : informedGrowthSeeds(fin!.cfg)
        });
      }
    }
  }

  return out;
};

export const budgetOfSpec = (env: Env, spec: LaneSpec) => budgets[env.schedule][budgetKeyOf(spec.kind, spec.cell.sub)];

// ----- search (PROTOCOL.md §7): every lane of a (cutoff, track, step) in ONE job; extension rounds at barriers, one lane
// per position; the job's cap = its lanes × NL0's per-lane share (budgets.ts) -----

export const runSearch = async (cutKey: string, track: Track, step: Step, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = searchFile(env, cutKey, track, step);
  const kind = informedTrack(track) ? 'informed' : 'indep';

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists: that search is complete`);

  // independence (PROTOCOL.md §10.1): an earlier cutoff never runs after a later one's selection exists in this study
  if (!informedTrack(track) && env.schedule === 'study')
    for (const later of Object.values(cutoffs).filter((c) => c.key > cutKey && c.key.startsWith('C')))
      for (const t of ['B1', 'B2'] as const)
        for (const st of t === 'B1' ? (['joint'] as const) : (['d1', 'g'] as const))
          if (fs.existsSync(selectionFile(env, later.key, t, st)))
            throw new Error(
              `the ${later.key} ${t} selection exists: ${cutKey}'s search would follow a later selection`
            );

  const specs = lanesFor(cut, track, step, env);
  const job = `${env.prefix}search-${cutKey}-${searchKey(track, step)}`;
  const laneFile = (k: string) => path.join(cacheRoot, 'jobs', job, 'lanes', `${k.replaceAll('/', '_')}.json`);
  const cap = env.schedule === 'study' ? specs.length * perLaneCap[kind] : undefined;
  const t0 = Date.now();

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}search ${cutKey} ${searchKey(track, step)}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      stopAfterFresh: env.stopAfterFresh,
      killWorkerAfter: env.killWorkerAfter,
      maxFresh: cap
    },
    async (lab) => {
      const lanes = specs.map((spec) => new Lane(lab, spec, budgetOfSpec(env, spec)));
      const requested = () => lanes.reduce((a, l) => a + l.requested, 0);
      const rounds: {
        round: number;
        positions: { position: string; fired: boolean; extended: boolean; atCap: boolean }[];
        requestedBefore: number;
        worstCase: number;
        decision: string;
      }[] = [];

      // phase 1: every lane's base budget, concurrently on the one worker pool
      lab.stage = `search ${cutKey} ${searchKey(track, step)}: base (${lanes.length} lanes)`;
      await Promise.all(lanes.map((l) => l.base()));

      // phase 2: extension rounds (5B's rule with one lane per position). A lane runs one more island iff its development
      // trigger fired on its last island and it is below its cap. The resource guard (the job cap) is checked before a
      // round with the round's worst case and a finishing reserve per lane (5B's 8,000 / 30,000); the decision is taken
      // at a barrier (all lanes idle), so it is deterministic.
      const stops = new Map<string, string>();

      for (let round = 1; ; round++) {
        const live = lanes.filter((l) => !stops.has(l.spec.position));

        if (!live.length) break;

        const row = {
          round,
          positions: [] as (typeof rounds)[number]['positions'],
          requestedBefore: requested(),
          worstCase: 0,
          decision: ''
        };
        const go: Lane[] = [];

        for (const l of live) {
          const fired = l.lastTrigger?.fired ?? false;
          const atCap = l.atCap;

          row.positions.push({ position: l.spec.position, fired, extended: fired && !atCap, atCap });
          if (!fired) stops.set(l.spec.position, 'triggers not met');
          else if (atCap)
            stops.set(l.spec.position, 'extension cap reached (a trigger still fired: budget-bound, not converged)');
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
        lab.stage = `search ${cutKey} ${searchKey(track, step)}: extension round ${round} (${go.length} lanes)`;
        lab.checkpoint({ extensionRound: round, extending: go.map((l) => l.spec.key) });
        await Promise.all(go.map((l) => l.extend()));
      }

      // phase 3: rungs 2 and 3, refinement and the shortlist of every lane
      lab.stage = `search ${cutKey} ${searchKey(track, step)}: finishing`;

      const results = await Promise.all(
        lanes.map(async (lane) => {
          const result = await lane.finish(stops.get(lane.spec.position) ?? 'triggers not met');
          const f = laneFile(lane.spec.key);
          const text = JSON.stringify(result);

          if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') !== text)
            throw new Error(`${lane.spec.key}: the replay differs from the kept lane result`);
          fs.mkdirSync(path.dirname(f), { recursive: true });
          fs.writeFileSync(f, text);
          lab.writeProgress();
          return result;
        })
      );
      const record = {
        stage: 'search',
        cutoff: cutKey,
        track,
        step,
        kind,
        door: cut.door,
        schedule: env.schedule,
        replicates: replicatesOf(env, track, step),
        finalists:
          step === 'g'
            ? finalistsOf(env, cutKey, track).map((f) => ({ index: f.index, label: f.label, id: f.id }))
            : [],
        lanesCount: specs.length,
        budgets: Object.fromEntries(specs.map((l) => [budgetKeyOf(l.kind, l.cell.sub), budgetOfSpec(env, l)])),
        cap: cap ?? null,
        extensionRounds: rounds,
        seeds: Object.fromEntries(
          specs
            .filter((l) => l.seeds)
            .slice(0, 1)
            .map((l) => [
              'every replicate (identical seeds; designs drawn per replicate)',
              l.seeds!.map((s) => ({ label: s.label, id: cfgId(s.cfg), inc: s.cfg.inc, focus: !!s.focus, cfg: s.cfg }))
            ])
        ),
        lanes: results,
        compute: lab.compute,
        codeDigest: lab.digest,
        minutes: Math.round((Date.now() - t0) / 600) / 100,
        peaks: lab.peaks,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `search ${cutKey} ${searchKey(track, step)}`);
      log(`search ${cutKey} ${searchKey(track, step)}: sealed ${path.relative(repoRoot, file)}`);
      return record;
    }
  );
};

export type { LaneResult };
