// The stages (PROTOCOL.md §7–§12): search (per cutoff and lane type, all three lifecycles in one job) → qualify (and
// select, per lifecycle) → fold evaluation (+ the fold cross-tests) → sequential (per lifecycle) → C24 cross-test
// matrix → diagnostics → frozen selection → validation. Each stage writes one sealed record; a stage whose record exists
// refuses to rerun. The pilot runs the identical code with pilot budgets, `pilot-` job names and an output directory
// in the git-ignored cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { budgetKeyOf, budgets, finishReserve, simulationCaps } from './budgets.ts';
import { type Mode, cacheRoot, freezeFile, log, modes, repoRoot, researchDir, resultsDir } from './context.ts';
import { cellName, cells, cfgId } from './config.ts';
import { informedSeeds, partners } from './controls.ts';
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
  assertFrozenCode();
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

export type SearchArm = 'indep' | 'informed';
export const searchFile = (env: Env, cut: string, arm: SearchArm) => path.join(env.outDir, 'search', cut, `${arm}.json`);
export const selectionFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'selection.json');
export const evaluationFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'evaluation.json');

// ----- lanes: every arm (lifecycle) × replicate × structure cell (indep) or replicate (informed) -----

export const replicates = [1, 2] as const;

export const lanesFor = (cut: CutoffSpec, arm: SearchArm): LaneSpec[] => {
  const out: LaneSpec[] = [];

  if (arm === 'informed' && !finalCutoff(cut.key)) throw new Error('the informed lane runs at the final cutoff only');

  for (const mode of modes)
    for (const r of replicates) {
      if (arm === 'indep')
        for (const cell of cells) {
          const seedKey = `${cut.key}/indep/R${r}/${cellName(cell)}`;

          out.push({
            key: `${cut.key}/${mode}/indep/R${r}/${cellName(cell)}`,
            seedKey,
            position: seedKey,
            mode,
            replicate: r,
            cutoff: cut.key,
            kind: 'indep',
            cell,
            res: 'coarse'
          });
        }
      else {
        const seedKey = `${cut.key}/informed/R${r}`;

        out.push({
          key: `${cut.key}/${mode}/informed/R${r}`,
          seedKey,
          position: seedKey,
          mode,
          replicate: r,
          cutoff: cut.key,
          kind: 'informed',
          res: 'fine',
          seeds: informedSeeds(),
          partners: partners()
        });
      }
    }

  return out;
};

export const budgetOfSpec = (env: Env, spec: LaneSpec) =>
  budgets[env.schedule][budgetKeyOf(spec.kind, spec.cell?.inc)];

// ----- search (PROTOCOL.md §7): every arm of a cutoff and lane type in ONE job, so that the three lifecycles' lanes at a
// position extend together (synchronized extension rounds) -----

export const runSearch = async (cutKey: string, arm: SearchArm, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = searchFile(env, cutKey, arm);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists: that search is complete`);

  // independence (PROTOCOL.md §7.1): an earlier cutoff never runs after a later one's selection exists in this study
  if (arm === 'indep' && env.schedule === 'study')
    for (const later of Object.values(cutoffs).filter((c) => c.key > cutKey && c.key.startsWith('C')))
      if (fs.existsSync(selectionFile(env, later.key)))
        throw new Error(`the ${later.key} selection exists: ${cutKey}'s independent search would follow a later selection`);

  const specs = lanesFor(cut, arm);
  const job = `${env.prefix}search-${cutKey}-${arm}`;
  const laneFile = (k: string) => path.join(cacheRoot, 'jobs', job, 'lanes', `${k.replaceAll('/', '_')}.json`);
  const cap = env.schedule === 'study' ? (arm === 'indep' ? simulationCaps.searchIndep : simulationCaps.searchInformed) : undefined;
  const t0 = Date.now();

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}search ${cutKey} ${arm}`,
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
        positions: { position: string; fired: Partial<Record<Mode, boolean>>; extended: boolean; atCap: boolean }[];
        requestedBefore: number;
        worstCase: number;
        decision: string;
      }[] = [];

      // phase 1: every lane's base budget, concurrently on the one worker pool
      lab.stage = `search ${cutKey} ${arm}: base (${lanes.length} lanes)`;
      await Promise.all(lanes.map((l) => l.base()));

      // phase 2: synchronized extension rounds. A position extends (every lifecycle's lane there runs one more island)
      // iff ANY of its three lanes fired its development trigger on its last island and the position is below the
      // common cap. The resource guard (study cap) is checked before a round with the round's worst case and a finishing
      // reserve per lane; the decision is taken at a barrier (all lanes idle), so it is deterministic.
      const byPosition = new Map<string, Lane[]>();

      for (const l of lanes) byPosition.set(l.spec.position, [...(byPosition.get(l.spec.position) ?? []), l]);

      const stops = new Map<string, string>();

      for (let round = 1; ; round++) {
        const positions = [...byPosition.entries()].filter(([p]) => !stops.has(p));

        if (!positions.length) break;

        const row = { round, positions: [] as (typeof rounds)[number]['positions'], requestedBefore: requested(), worstCase: 0, decision: '' };
        const go: Lane[] = [];

        for (const [p, ls] of positions) {
          const fired = Object.fromEntries(ls.map((l) => [l.spec.mode, l.lastTrigger?.fired ?? false])) as Partial<Record<Mode, boolean>>;
          const any = Object.values(fired).some(Boolean);
          const atCap = ls.some((l) => l.atCap);

          row.positions.push({ position: p, fired, extended: any && !atCap, atCap });
          if (!any) stops.set(p, 'triggers not met');
          else if (atCap) stops.set(p, 'extension cap reached (a trigger still fired: budget-bound, not converged)');
          else go.push(...ls);
        }

        row.worstCase = go.reduce((a, l) => a + l.islandWorstCase, 0);

        if (go.length && cap !== undefined && requested() + row.worstCase + finishReserve[arm] * lanes.length > cap) {
          for (const l of go) stops.set(l.spec.position, 'resource guard (the study cap on fresh simulations)');
          row.decision = `resource guard: ${requested()} requested + worst case ${row.worstCase} + finishing reserve ${finishReserve[arm] * lanes.length} > cap ${cap}`;
          rounds.push(row);
          break;
        }

        row.decision = go.length ? `extend ${go.length / modes.length} position(s) × ${modes.length} lifecycles` : 'no position extends';
        rounds.push(row);
        if (!go.length) break;
        lab.stage = `search ${cutKey} ${arm}: extension round ${round} (${go.length} lanes)`;
        lab.checkpoint({ extensionRound: round, extending: go.map((l) => l.spec.key) });
        await Promise.all(go.map((l) => l.extend()));
      }

      // phase 3: rungs 2 and 3, refinement and the shortlist of every lane
      lab.stage = `search ${cutKey} ${arm}: finishing`;

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
        arm,
        door: cut.door,
        schedule: env.schedule,
        modes,
        replicates,
        budgets: Object.fromEntries(specs.map((l) => [budgetKeyOf(l.kind, l.cell?.inc), budgetOfSpec(env, l)])),
        cap: cap ?? null,
        extensionRounds: rounds,
        seeds: Object.fromEntries(
          specs
            .filter((l) => l.seeds && l.mode === 'L0')
            .map((l) => [l.seedKey, l.seeds!.map((s) => ({ label: s.label, id: cfgId(s.cfg), inc: s.cfg.inc, focus: !!s.focus, cfg: s.cfg }))])
        ),
        lanes: results,
        compute: lab.compute,
        codeDigest: lab.digest,
        minutes: Math.round((Date.now() - t0) / 600) / 100,
        peaks: lab.peaks,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `search ${cutKey} ${arm}`);
      log(`search ${cutKey} ${arm}: sealed ${path.relative(repoRoot, file)}`);
      return record;
    }
  );
};

export type { LaneResult };
