// The stages of one cutoff (PROTOCOL.md §6–§8): search → qualify (and select) → fold freeze → fold evaluation. Each
// stage writes one sealed record; a stage whose record exists refuses to rerun. The pilot runs the identical code
// with pilot budgets, pilot job names and an output directory in the git-ignored cache.
import fs from 'node:fs';
import path from 'node:path';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { growthDefaults } from '../growth140-vgt-s8m/space.ts';
import type { Allocation } from './allocator.ts';
import { budgets } from './budgets.ts';
import { type ControlSpec, type Controls, controlSpecs, resolveControls } from './controls.ts';
import {
  type DoorName,
  type PrefixDoor,
  cacheRoot,
  chronology,
  doorSpecs,
  log,
  repoRoot,
  resultsDir
} from './context.ts';
import { type Door, logDoor, openDoor, sha256File } from './data.ts';
import { type EvalOptions, type Rec, recordOf, run } from './evaluate.ts';
import { withLab } from './lab.ts';
import { type Evidence, type Member, qualifyMembers, rankQualified, selectRoles, summary } from './qualify.ts';
import { isSealed, readJson, sealJson } from './records.ts';
import { Lane, type LaneResult, type LaneSpec } from './search.ts';
import { type CellKey, type Joint, cellName, cells, jointId, normalize } from './space.ts';

export interface CutoffSpec {
  key: string;
  door: PrefixDoor;
  end: string;
  evalDoor: DoorName;
  slice: [string, string];
}

export const cutoffs: Record<string, CutoffSpec> = {
  C19: { key: 'C19', door: 'D19', end: '2019-12-31', evalDoor: 'D21', slice: ['2020-01-02', '2021-12-31'] },
  C21: { key: 'C21', door: 'D21', end: '2021-12-31', evalDoor: 'D23', slice: ['2022-01-03', '2023-12-29'] },
  C23: { key: 'C23', door: 'D23', end: '2023-12-29', evalDoor: 'D24', slice: ['2024-01-02', '2024-12-31'] },
  C24: {
    key: 'C24',
    door: 'D24',
    end: '2024-12-31',
    evalDoor: 'FULL',
    slice: ['2025-01-02', chronology.validationEnd]
  },
  // the pilot's pseudo-fold inside development (engineering only)
  P18: { key: 'P18', door: 'D19', end: '2018-12-31', evalDoor: 'D19', slice: ['2019-01-02', '2019-12-31'] }
};

export interface Env {
  schedule: 'study' | 'pilot';
  prefix: string; // job-name prefix ('' for the study; 'pilot-<run>-' for the pilot)
  outDir: string; // results root
  workers: number;
  stopAfterFresh?: number;
  killWorkerAfter?: number;
  lanes?: 'all' | 'indep'; // the pilot may run only the independent lanes
}

export const studyEnv = (workers: number): Env => ({ schedule: 'study', prefix: '', outDir: resultsDir, workers });

const A_D1: Allocation = { arch: 'A', d1Target: 1, gTarget: 1, first: 'D1' };

// ----- lanes -----

export const growthSeeds = (c: Controls) => {
  const frozen = readJson<{
    finalists: { id: string; config: Joint['g'] }[];
    rankOrder: { id: string; rank: number }[];
  }>(path.join(repoRoot, 'research/growth140-vgt-stable/FROZEN_SELECTION.json'));
  const top = frozen.rankOrder
    .filter((r) => r.rank <= 3)
    .map((r) => ({ label: `stable rank ${r.rank} ${r.id}`, g: frozen.finalists.find((f) => f.id === r.id)!.config }));

  return [{ label: '08500a60ec56cfae', g: c.g.g085 }, { label: '#4 420cd989e4fa7749', g: c.g.g4 }, ...top];
};

export const informedSeeds = (c: Controls) => {
  const allocs: [string, Allocation][] = [
    ['A', A_D1],
    ['B 100/100', { arch: 'B', d1Target: 1, gTarget: 1, first: 'D1' }],
    ['B 50/50', { arch: 'B', d1Target: 0.5, gTarget: 0.5, first: 'D1' }]
  ];
  const out: { label: string; joint: Joint }[] = [];

  for (const [dn, d] of [
    ['D1 primary', c.d1.primary],
    ['D1 VG#2-VGT', c.d1.vg2]
  ] as const)
    for (const gs of growthSeeds(c))
      for (const [an, a] of allocs)
        out.push({ label: `${dn} + ${gs.label} · ${an}`, joint: normalize({ d1: d, g: gs.g, a }) });

  return out;
};

export const lanesFor = (cut: CutoffSpec, c: Controls, env: Env): LaneSpec[] => {
  const indep: LaneSpec[] = cells.map((cell) => ({
    key: `${cut.key}/indep/${cellName(cell)}`,
    cutoff: cut.key,
    kind: 'indep',
    cell,
    need: 'mixed',
    options: {},
    res: 'coarse'
  }));

  if (cut.key !== 'C24' || env.lanes === 'indep') return indep;

  const fixedG = growthDefaults as Joint['g'];
  const gCells: CellKey[] = (['rise', 'breakout'] as const).flatMap((entry) =>
    (['off', 'on'] as const).map((gate) => ({ arch: 'A' as const, entry, gate }))
  );

  return [
    ...indep,
    {
      key: `${cut.key}/informed`,
      cutoff: cut.key,
      kind: 'informed',
      need: 'mixed',
      options: {},
      res: 'fine',
      seeds: informedSeeds(c),
      islandArchs: ['A', 'B']
    },
    {
      key: `${cut.key}/d1only`,
      cutoff: cut.key,
      kind: 'd1only',
      cell: { arch: 'A', entry: 'rise', gate: 'off' },
      need: 'D1',
      options: { enabled: { D1: true, G: false } },
      res: 'coarse',
      fixed: { g: fixedG, a: A_D1 }
    },
    ...gCells.map((cell): LaneSpec => ({
      key: `${cut.key}/gonly/${cell.entry}/${cell.gate}`,
      cutoff: cut.key,
      kind: 'gonly',
      cell,
      need: 'G',
      options: { enabled: { D1: false, G: true } },
      res: 'coarse',
      fixed: { d1: c.d1.primary, a: A_D1 }
    }))
  ];
};

const budgetOf = (env: Env, kind: LaneSpec['kind']) => budgets[env.schedule][kind];

export const searchFile = (env: Env, cut: string) => path.join(env.outDir, 'search', cut, 'search.json');
export const selectionFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'selection.json');
export const evaluationFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'evaluation.json');

// ----- search -----

export const runSearch = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = searchFile(env, cutKey);

  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: the search of ${cutKey} is complete`);

  const controls = await resolveControls();
  const lanes = lanesFor(cut, controls, env);
  const job = `${env.prefix}search-${cutKey}`;
  const laneFile = (k: string) => path.join(cacheRoot, 'jobs', job, 'lanes', `${k.replaceAll('/', '_')}.json`);
  const t0 = Date.now();

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}search ${cutKey}`,
      workers: env.workers,
      stopAfterFresh: env.stopAfterFresh,
      killWorkerAfter: env.killWorkerAfter
    },
    async (lab) => {
      const results: LaneResult[] = [];

      for (const spec of lanes) {
        const f = laneFile(spec.key);
        const budget = budgetOf(env, spec.kind);
        // A finished lane's result is kept in the job directory; on a resume it is replayed anyway (every
        // evaluation from the archive) and must reproduce the kept result exactly.
        const result = await new Lane(lab, spec, budget).run();
        const text = JSON.stringify(result);

        if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') !== text)
          throw new Error(`${spec.key}: the replay differs from the kept lane result`);
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, text);
        results.push(result);
        lab.writeProgress();
      }

      const record = {
        stage: 'search',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        budgets: budgets[env.schedule],
        lanes: results,
        evaluations: { fresh: lab.fresh, archiveHits: lab.hits },
        codeDigest: lab.digest,
        minutes: Math.round((Date.now() - t0) / 600) / 100,
        peaks: lab.peaks,
        finished: new Date().toISOString()
      };

      sealJson(file, record, `search ${cutKey}`);
      log(`search ${cutKey}: sealed ${path.relative(repoRoot, file)}`);
      return record;
    }
  );
};

// ----- qualification and selection -----

export const membersOf = (cutKey: string, env: Env, controls: Controls) => {
  const search = readJson<{ lanes: LaneResult[] }>(searchFile(env, cutKey));
  const members: Member[] = [];
  const optionsOf = (kind: LaneResult['kind']): EvalOptions =>
    kind === 'd1only'
      ? { enabled: { D1: true, G: false } }
      : kind === 'gonly'
        ? { enabled: { D1: false, G: true } }
        : {};

  for (const lane of search.lanes)
    lane.shortlist.forEach((f, i) =>
      members.push({
        label: `${lane.key}#${i + 1} ${f.pick}`,
        lane: lane.key,
        kind: lane.kind,
        need: lane.kind === 'd1only' ? 'D1' : lane.kind === 'gonly' ? 'G' : 'mixed',
        joint: f.joint,
        options: optionsOf(lane.kind)
      })
    );

  for (const cs of controlSpecs(controls))
    members.push({
      label: `control: ${cs.label}`,
      lane: 'control',
      kind: 'control',
      need: cs.enabled ? (cs.enabled.D1 ? 'D1' : 'G') : 'mixed',
      joint: cs.joint,
      options: cs.enabled ? { enabled: cs.enabled } : {}
    });

  return { members, search };
};

export const runQualify = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = selectionFile(env, cutKey);

  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: the selection of ${cutKey} is sealed`);
  if (!isSealed(searchFile(env, cutKey))) throw new Error(`the search of ${cutKey} is not sealed`);

  const controls = await resolveControls();
  const { members } = membersOf(cutKey, env, controls);

  return withLab(
    {
      job: `${env.prefix}qualify-${cutKey}`,
      door: cut.door,
      purpose: `${env.prefix}qualify ${cutKey}`,
      workers: env.workers,
      stopAfterFresh: env.stopAfterFresh
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey);
      const selection = selectRoles(cutKey, evidence);
      const single = (kind: Evidence['kind']) => {
        const r = rankQualified(evidence.filter((e) => e.kind === kind));

        return {
          ranked: r.map((x) => ({ rank: x.rank, label: x.e.label, id: x.e.id })),
          primary: r[0]?.e.label ?? null
        };
      };
      const record = {
        stage: 'qualify',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        selection,
        singleFamily: { d1only: single('d1only'), gonly: single('gonly') },
        summary: evidence.map(summary),
        evidence,
        evaluations: { fresh: lab.fresh, archiveHits: lab.hits },
        codeDigest: lab.digest,
        searchSha256: sha256File(searchFile(env, cutKey)),
        finished: new Date().toISOString()
      };

      sealJson(file, record, `qualify ${cutKey}`);
      log(`qualify ${cutKey}: primary ${selection.primary ?? 'none'} — ${selection.reason}`);
      return record;
    }
  );
};

// ----- the fold evaluation (one continuous run per configuration on the evaluation door) -----

export interface SliceMarks {
  label: string;
  t: number[];
  v: number[]; // marked net minus the boundary close's marked net
}

// One continuous run on the evaluation door with its minute marks after the boundary close, relative to the marked net
// at that close (the slice's own P&L path).
export const sliceMarks = (
  door: Door,
  j: Joint,
  o: EvalOptions,
  boundary: string,
  label: string
): SliceMarks & { rec: Rec; openAtBoundary: number; openAtEnd: number } => {
  const x = run(door, j, o, true, true);
  const b = door.ds.dates.indexOf(boundary);
  const equity = x.result.daily[b]!;
  const after = door.ds.sCloseTime[b]!;
  const m = x.result.markChanges!;
  const t: number[] = [];
  const v: number[] = [];

  for (let i = 0; i < m.t.length; i++)
    if (m.t[i]! > after) {
      t.push(m.t[i]!);
      v.push(m.v[i]! - equity);
    }

  const lots = x.result.lots;

  return {
    label,
    t,
    v,
    rec: recordOf(door, j, x, o),
    openAtBoundary: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).length,
    openAtEnd: lots.filter((l) => l.open).length
  };
};

// The strict minute drawdown of a concatenation of slices (each slice's path added to the running total).
export const sequentialDrawdown = (
  slices: readonly { t: number[]; v: number[]; charge?: number }[],
  startTime: number
) => {
  const tracker = new Tracker(0, startTime);
  let offset = 0;

  for (const s of slices) {
    offset -= s.charge ?? 0;
    for (let i = 0; i < s.t.length; i++) tracker.updateStrict(offset + s.v[i]!, s.t[i]!);
    offset += s.v.at(-1) ?? 0;
  }

  return { ...tracker.stats(), total: offset };
};

export const runFoldEval = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = evaluationFile(env, cutKey);

  if (cutKey === 'C24') throw new Error('C24 is evaluated once by the validation stage (validate)');
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const selFile = selectionFile(env, cutKey);

  if (!isSealed(selFile))
    throw new Error(`the fold selection of ${cutKey} is not sealed (the evaluation door's guard)`);

  const sel = readJson<{
    selection: { frozen: string[]; primary: string | null; roles: Record<string, string | null> };
    evidence: Evidence[];
  }>(selFile);
  const guardSha = sha256File(selFile);
  const controls = await resolveControls();
  const evaluated: { label: string; joint: Joint; options: EvalOptions; role: string }[] = [];

  for (const label of sel.selection.frozen) {
    const e = sel.evidence.find((x) => x.label === label)!;
    const roles = Object.entries(sel.selection.roles)
      .filter(([, l]) => l === label)
      .map(([r]) => r);

    evaluated.push({ label, joint: e.joint, options: {}, role: roles.join(',') });
  }

  for (const cs of controlSpecs(controls))
    evaluated.push({
      label: `control: ${cs.label}`,
      joint: cs.joint,
      options: cs.enabled ? { enabled: cs.enabled } : {},
      role: 'control'
    });

  const door = await openDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey} (guard ${guardSha.slice(0, 12)})`);

  logDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey}: guard verified`, { guard: guardSha });

  const rows = evaluated.map((m) => {
    const o: EvalOptions = { ...m.options, boundaries: [cut.end] };
    const x = sliceMarks(door, m.joint, o, cut.end, m.label);

    return {
      label: m.label,
      role: m.role,
      id: jointId(m.joint),
      joint: m.joint,
      sliceNet: x.rec.periods[0]!.after,
      sliceDd: x.rec.periods[0]!.dd,
      boundaryEquity: x.rec.periods[0]!.equity,
      wholeNet: x.rec.net,
      wholeDd: x.rec.dd,
      openAtBoundary: x.openAtBoundary,
      openAtEnd: x.openAtEnd,
      record: x.rec,
      closes: { t: x.t, v: x.v }
    };
  });
  const record = {
    stage: 'fold evaluation',
    cutoff: cutKey,
    door: cut.evalDoor,
    slice: cut.slice,
    boundary: cut.end,
    guardSha256: guardSha,
    primary: sel.selection.primary,
    rows: rows.map(({ closes: _c, ...r }) => r),
    finished: new Date().toISOString()
  };

  fs.mkdirSync(path.join(cacheRoot, 'folds', env.prefix || 'study'), { recursive: true });
  fs.writeFileSync(
    path.join(cacheRoot, 'folds', env.prefix || 'study', `${cutKey}-closes.json`),
    JSON.stringify(rows.map((r) => ({ label: r.label, ...r.closes })))
  );
  sealJson(file, record, `fold evaluation ${cutKey}`);
  log(`fold evaluation ${cutKey}: ${rows.length} rows; primary ${sel.selection.primary ?? 'none'}`);
  return record;
};

export { doorSpecs, type ControlSpec };
