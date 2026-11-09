// The stages (PROTOCOL.md §7–§12): search (per cutoff and arm) → qualify (and select) → fold evaluation → sequential
// → diagnostics → frozen selection → validation. Each stage writes one sealed record; a stage whose record exists
// refuses to rerun. The pilot runs the identical code with pilot budgets, `pilot-` job names and an output directory
// in the git-ignored cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { budgets } from './budgets.ts';
import { cacheRoot, freezeFile, log, repoRoot, researchDir, resultsDir } from './context.ts';
import { type CellKey, cellName, cells, cfgId } from './config.ts';
import { informedSeeds, partners, vg2D1 } from './controls.ts';
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

// ----- lanes -----

export const lanesFor = (cut: CutoffSpec, arm: SearchArm): LaneSpec[] => {
  if (arm === 'indep')
    return cells.map((cell: CellKey) => ({
      key: `${cut.key}/indep/${cellName(cell)}`,
      cutoff: cut.key,
      kind: 'indep',
      cell,
      res: 'coarse'
    }));

  if (!finalCutoff(cut.key)) throw new Error('the informed lanes run at the final cutoff only');

  return [
    {
      key: `${cut.key}/informed-fixed`,
      cutoff: cut.key,
      kind: 'informed-fixed',
      res: 'fine',
      d1Fixed: vg2D1(),
      seeds: informedSeeds('fixed'),
      partners: partners()
    },
    {
      key: `${cut.key}/informed-joint`,
      cutoff: cut.key,
      kind: 'informed-joint',
      res: 'fine',
      seeds: informedSeeds('joint'),
      partners: partners()
    }
  ];
};

// ----- search -----

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

  const lanes = lanesFor(cut, arm);
  const job = `${env.prefix}search-${cutKey}-${arm}`;
  const laneFile = (k: string) => path.join(cacheRoot, 'jobs', job, 'lanes', `${k.replaceAll('/', '_')}.json`);
  const t0 = Date.now();

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}search ${cutKey} ${arm}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      stopAfterFresh: env.stopAfterFresh,
      killWorkerAfter: env.killWorkerAfter
    },
    async (lab) => {
      lab.stage = `search ${cutKey} ${arm}: ${lanes.length} lane(s) concurrently`;

      // the lanes run concurrently on the one worker pool; each is a deterministic function of its own seeds and
      // evaluations. A finished lane's result is kept in the job directory; on a resume it is replayed anyway (every
      // evaluation read back from the archive) and must reproduce the kept result exactly.
      const results = await Promise.all(
        lanes.map(async (spec) => {
          const b = budgets[env.schedule][spec.kind];
          const result = await new Lane(lab, spec, b).run();
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
        arm,
        door: cut.door,
        schedule: env.schedule,
        budgets: Object.fromEntries(lanes.map((l) => [l.kind, budgets[env.schedule][l.kind]])),
        seeds: Object.fromEntries(
          lanes
            .filter((l) => l.seeds)
            .map((l) => [l.key, l.seeds!.map((s) => ({ label: s.label, id: cfgId(s.cfg), inc: s.cfg.inc, focus: !!s.focus, cfg: s.cfg }))])
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
