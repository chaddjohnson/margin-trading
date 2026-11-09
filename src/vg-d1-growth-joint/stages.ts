// The stages of one cutoff (PROTOCOL.md §11–§14): search (per arm) → qualify (and select) → fold evaluation. Each stage
// writes one sealed record; a stage whose record exists refuses to rerun. The pilot runs the identical code with pilot
// budgets, pilot job names and an output directory in the git-ignored cache.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { type Arm, budgets } from './budgets.ts';
import { type Controls, controlSpecs, resolveControls } from './controls.ts';
import {
  type DoorName,
  type PrefixDoor,
  cacheRoot,
  chronology,
  log,
  repoRoot,
  researchDir,
  resultsDir
} from './context.ts';
import { type Door, logDoor, openDoor, sha256File } from './data.ts';
import { type EvalOptions, type Rec, recordOf, run } from './evaluate.ts';
import { assertFrozenCode, freezeFile } from './freeze.ts';
import { withLab } from './lab.ts';
import { type Evidence, type Member, type Roles, qualifyMembers, rolesOf, summary } from './qualify.ts';
import { isSealed, readJson, sealJson } from './records.ts';
import { Lane, type LaneResult, type LaneSpec } from './search.ts';
import { type Quad, cellName, cells, d1Placeholder, normalize, quadId } from './space.ts';

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
  // the pilot's pseudo-fold inside development (engineering only): search on D19, its slice 2019 on D19
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

// The guards of a substantive study stage: the optimization-standard preflight, the sealed parity, the protocol freeze
// and the frozen evaluation code (the pilot skips the freeze and parity seals; it never writes a study record).
export const studyGuards = (env: Env) => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (env.schedule === 'pilot') return;
  if (!isSealed(freezeFile)) throw new Error('the protocol is not frozen (results/protocol-freeze.json)');
  if (!isSealed(path.join(resultsDir, 'parity', 'parity.json'))) throw new Error('parity is not sealed');

  const parity = readJson<{ failed: number }>(path.join(resultsDir, 'parity', 'parity.json'));

  if (parity.failed !== 0) throw new Error('parity failed: every dependent stage is blocked');
  assertFrozenCode();
};

// A sealed record that must also be committed unchanged before the next door opens (fold selections, the frozen
// selection): it is tracked by git and identical to HEAD.
export const assertCommitted = (file: string) => {
  const rel = path.relative(repoRoot, file);

  try {
    execSync(`git ls-files --error-unmatch -- "${rel}"`, { cwd: repoRoot, stdio: 'ignore' });
    execSync(`git diff --quiet HEAD -- "${rel}"`, { cwd: repoRoot, stdio: 'ignore' });
  } catch {
    throw new Error(`${rel} is not committed unchanged (the guard of the next door)`);
  }
};

// ----- files -----

export const searchFile = (env: Env, cut: string, arm: Arm) => path.join(env.outDir, 'search', cut, `${arm}.json`);
export const gpairFile = (env: Env, cut: string) => path.join(env.outDir, 'gpair', cut, 'selection.json');
export const selectionFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'selection.json');
export const evaluationFile = (env: Env, cut: string) => path.join(env.outDir, 'folds', cut, 'evaluation.json');

// ----- lanes -----

const gpairOptions: EvalOptions = { enabled: { 'D1:GDX': false, 'D1:VGT': false } };

// The staged combinations (arm B → the shared pool): each selected Growth pair, unchanged, with VG #2's unchanged D1
// pair, D1-first (the frozen default tie order).
export const stagedOf = (c: Controls, gsel: { shortlist: { label: string; quad: Quad }[] }) =>
  gsel.shortlist.map((m) => ({
    label: `staged: VG #2 + ${m.label}`,
    quad: normalize({ d1: c.d1.vg2, g: m.quad.g, first: 'D1' })
  }));

export const informedSeeds = (c: Controls, env: Env, cut: string) => {
  const gsel = readJson<{ shortlist: { label: string; quad: Quad }[] }>(gpairFile(env, cut));
  const unchanged = controlSpecs(c)
    .filter((x) => x.selectable)
    .map((x) => ({ label: `control: ${x.label}`, quad: x.quad }));

  return [...unchanged, ...stagedOf(c, gsel)];
};

export const lanesFor = (cut: CutoffSpec, arm: Arm, c: Controls, env: Env): LaneSpec[] => {
  if (arm === 'indep')
    return cells.map((cell) => ({
      key: `${cut.key}/indep/${cellName(cell)}`,
      cutoff: cut.key,
      kind: 'indep',
      cell,
      need: 'mixed',
      options: {},
      res: 'coarse'
    }));

  if (!finalCutoff(cut.key)) throw new Error(`arm ${arm} runs at the final cutoff only`);

  if (arm === 'gpair')
    return cells.map((cell) => ({
      key: `${cut.key}/gpair/${cellName(cell)}`,
      cutoff: cut.key,
      kind: 'gpair',
      cell,
      need: 'G',
      options: gpairOptions,
      res: 'coarse'
    }));

  return [
    {
      key: `${cut.key}/informed`,
      cutoff: cut.key,
      kind: 'informed',
      need: 'mixed',
      options: {},
      res: 'fine',
      seeds: informedSeeds(c, env, cut.key)
    }
  ];
};

// ----- search -----

export const runSearch = async (cutKey: string, arm: Arm, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = searchFile(env, cutKey, arm);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists: that search is complete`);
  if (arm === 'informed' && !isSealed(gpairFile(env, cutKey)))
    throw new Error(
      'the informed lane is seeded with the staged combinations: the Growth-pair selection is not sealed'
    );

  const controls = await resolveControls();
  const lanes = lanesFor(cut, arm, controls, env);
  const job = `${env.prefix}search-${cutKey}-${arm}`;
  const laneFile = (k: string) => path.join(cacheRoot, 'jobs', job, 'lanes', `${k.replaceAll('/', '_')}.json`);
  const t0 = Date.now();

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}search ${cutKey} ${arm}`,
      workers: env.workers,
      stopAfterFresh: env.stopAfterFresh,
      killWorkerAfter: env.killWorkerAfter
    },
    async (lab) => {
      const results: LaneResult[] = [];

      for (const spec of lanes) {
        const f = laneFile(spec.key);
        // a finished lane's result is kept in the job directory; on a resume it is replayed anyway (every evaluation
        // from the archive) and must reproduce the kept result exactly
        const result = await new Lane(
          lab,
          spec,
          budgets[env.schedule][arm],
          arm === 'gpair' ? { GDX: d1Placeholder, VGT: d1Placeholder } : null
        ).run();
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
        arm,
        door: cut.door,
        schedule: env.schedule,
        budget: budgets[env.schedule][arm],
        seeds: lanes[0]?.seeds?.map((s) => ({ label: s.label, id: quadId(s.quad), quad: s.quad })) ?? [],
        lanes: results,
        evaluations: { fresh: lab.fresh, archiveHits: lab.hits },
        codeDigest: lab.digest,
        minutes: Math.round((Date.now() - t0) / 600) / 100,
        peaks: lab.peaks,
        finished: new Date().toISOString()
      };

      sealJson(file, record, `search ${cutKey} ${arm}`);
      log(`search ${cutKey} ${arm}: sealed ${path.relative(repoRoot, file)}`);
      return record;
    }
  );
};

// ----- the Growth-pair qualification and its bounded shortlist (arm B) -----

const shortlistOfRoles = (roles: Roles, ev: readonly Evidence[], cap = 4) => {
  const out: Evidence[] = [];

  for (const r of ['actual-profit', 'robust-profit', 'balanced', 'lower-drawdown'] as const) {
    const label = roles.roles[r];
    const e = label ? ev.find((x) => x.label === label) : undefined;

    if (e && !out.includes(e) && out.length < cap) out.push(e);
  }

  return out;
};

export const runQualifyGpair = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = gpairFile(env, cutKey);

  studyGuards(env);
  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: the Growth-pair selection is sealed`);
  if (!isSealed(searchFile(env, cutKey, 'gpair'))) throw new Error(`the Growth-pair search of ${cutKey} is not sealed`);

  const search = readJson<{ lanes: LaneResult[] }>(searchFile(env, cutKey, 'gpair'));
  const controls = await resolveControls();
  const members: Member[] = [];

  for (const lane of search.lanes)
    lane.shortlist.forEach((f, i) =>
      members.push({
        label: `${lane.key}#${i + 1} ${f.pick}`,
        lane: lane.key,
        kind: 'gpair',
        need: 'G',
        quad: f.quad,
        options: gpairOptions,
        selectable: false
      })
    );
  for (const cs of controlSpecs(controls).filter((x) => x.group === 'Growth-only' && x.key !== 'appA'))
    members.push({
      label: `control: ${cs.label}`,
      lane: 'control',
      kind: 'control',
      need: 'G',
      quad: cs.quad,
      options: { enabled: cs.enabled },
      selectable: false,
      group: cs.group
    });

  return withLab(
    {
      job: `${env.prefix}qualify-gpair-${cutKey}`,
      door: cut.door,
      purpose: `${env.prefix}qualify gpair ${cutKey}`,
      workers: env.workers
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey);
      const roles = rolesOf(
        'Growth pair (arm B)',
        evidence.filter((e) => e.kind === 'gpair')
      );
      const list = shortlistOfRoles(roles, evidence);
      const record = {
        stage: 'qualify gpair',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        roles,
        shortlist: list.map((e) => ({
          label: e.label,
          id: e.id,
          quad: e.quad,
          roles: Object.entries(roles.roles)
            .filter(([, l]) => l === e.label)
            .map(([r]) => r)
        })),
        summary: evidence.map(summary),
        evidence,
        evaluations: { fresh: lab.fresh, archiveHits: lab.hits },
        codeDigest: lab.digest,
        searchSha256: sha256File(searchFile(env, cutKey, 'gpair')),
        finished: new Date().toISOString()
      };

      sealJson(file, record, `qualify gpair ${cutKey}`);
      log(`qualify gpair ${cutKey}: ${list.length} Growth pair(s) for the staged combinations — ${roles.reason}`);
      return record;
    }
  );
};

// ----- qualification and selection -----

export const membersOf = (cutKey: string, env: Env, controls: Controls) => {
  const members: Member[] = [];
  const add = (arm: Arm) => {
    const search = readJson<{ lanes: LaneResult[] }>(searchFile(env, cutKey, arm));

    for (const lane of search.lanes)
      lane.shortlist.forEach((f, i) =>
        members.push({
          label: `${lane.key}#${i + 1} ${f.pick}`,
          lane: lane.key,
          kind: lane.kind,
          need: 'mixed',
          quad: f.quad,
          options: {},
          selectable: true
        })
      );
  };

  add('indep');

  if (finalCutoff(cutKey)) {
    add('informed');

    const gsel = readJson<{ shortlist: { label: string; quad: Quad }[] }>(gpairFile(env, cutKey));

    for (const s of stagedOf(controls, gsel))
      members.push({
        label: s.label,
        lane: 'staged',
        kind: 'staged',
        need: 'mixed',
        quad: s.quad,
        options: {},
        selectable: true
      });

    for (const cs of controlSpecs(controls).filter((x) => x.group !== 'Growth-only'))
      members.push({
        label: `control: ${cs.label}`,
        lane: 'control',
        kind: 'control',
        need: 'mixed', // a D1-only or VGT-only benchmark fails Q6 or stays a smaller-universe comparator by design
        quad: cs.quad,
        options: { enabled: cs.enabled },
        selectable: cs.selectable,
        group: cs.group
      });
  }

  return members;
};

export const rolesAt = (cutKey: string, evidence: readonly Evidence[]) => {
  const four = (e: Evidence) => e.enabled.length === 4;
  const sets: Record<string, Roles> = {
    independent: rolesOf(
      'independent four-component discovery (arm D)',
      evidence.filter((e) => e.kind === 'indep')
    )
  };

  if (finalCutoff(cutKey)) {
    sets.final = rolesOf(
      'the informed selectable set (unchanged combined controls, staged, refined, independent)',
      evidence.filter((e) => e.selectable && four(e))
    );
    sets.staged = rolesOf(
      'staged as-is combinations (arm B + VG #2)',
      evidence.filter((e) => e.kind === 'staged')
    );
    sets.refined = rolesOf(
      'informed joint refinement (arm C)',
      evidence.filter((e) => e.kind === 'informed')
    );
    sets.unchanged = rolesOf(
      'unchanged four-component controls',
      evidence.filter((e) => e.kind === 'control' && e.selectable && four(e))
    );
  }

  const primarySet = finalCutoff(cutKey) ? sets.final! : sets.independent!;

  return { sets, primary: primarySet.roles['actual-profit'] };
};

export const runQualify = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = selectionFile(env, cutKey);

  studyGuards(env);
  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: the selection of ${cutKey} is sealed`);
  if (!isSealed(searchFile(env, cutKey, 'indep'))) throw new Error(`the independent search of ${cutKey} is not sealed`);
  if (finalCutoff(cutKey) && !isSealed(searchFile(env, cutKey, 'informed')))
    throw new Error(`the informed search of ${cutKey} is not sealed`);

  const controls = await resolveControls();
  const members = membersOf(cutKey, env, controls);

  return withLab(
    {
      job: `${env.prefix}qualify-${cutKey}`,
      door: cut.door,
      purpose: `${env.prefix}qualify ${cutKey}`,
      workers: env.workers
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey);
      const { sets, primary } = rolesAt(cutKey, evidence);
      const record = {
        stage: 'qualify',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        primary,
        roles: sets,
        summary: evidence.map(summary),
        evidence,
        evaluations: { fresh: lab.fresh, archiveHits: lab.hits },
        codeDigest: lab.digest,
        searches: Object.fromEntries(
          (finalCutoff(cutKey) ? (['indep', 'informed', 'gpair'] as const) : (['indep'] as const)).map((a) => [
            a,
            sha256File(searchFile(env, cutKey, a))
          ])
        ),
        finished: new Date().toISOString()
      };

      sealJson(file, record, `qualify ${cutKey}`);
      log(`qualify ${cutKey}: primary ${primary ?? 'none'}`);
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

export const sliceMarks = (door: Door, q: Quad, o: EvalOptions, boundary: string, label: string) => {
  const x = run(door, q, o, true, true);
  const b = door.dates.indexOf(boundary);
  const equity = x.result.daily[b]!;
  const after = door.sym.VGT.ds.sCloseTime[b]!;
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
    rec: recordOf(door, q, x, o) as Rec,
    openAtBoundary: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
    openAtEnd: lots.filter((l) => l.open).map((l) => l.book)
  };
};

// The fold's frozen members: the holders of the independent set's four roles (deduplicated, in role order).
export const foldMembers = (sel: { roles: Record<string, Roles>; evidence: Evidence[] }) => {
  const out: { label: string; quad: Quad; roles: string[] }[] = [];
  const roles = sel.roles.independent!.roles;

  for (const [r, label] of Object.entries(roles)) {
    if (!label) continue;

    const x = out.find((o) => o.label === label);

    if (x) x.roles.push(r);
    else out.push({ label, quad: sel.evidence.find((e) => e.label === label)!.quad, roles: [r] });
  }

  return out;
};

export const runFoldEval = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = evaluationFile(env, cutKey);

  if (cutKey === 'C24') throw new Error('C24 is evaluated once by the validation stage (validate)');
  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const selFile = selectionFile(env, cutKey);

  if (!isSealed(selFile))
    throw new Error(`the fold selection of ${cutKey} is not sealed (the evaluation door's guard)`);
  if (env.schedule === 'study') assertCommitted(selFile);

  const sel = readJson<{ primary: string | null; roles: Record<string, Roles>; evidence: Evidence[] }>(selFile);
  const guardSha = sha256File(selFile);
  const controls = await resolveControls();
  const evaluated: { label: string; quad: Quad; options: EvalOptions; role: string }[] = foldMembers(sel).map((m) => ({
    label: m.label,
    quad: m.quad,
    options: {},
    role: m.roles.join(',')
  }));

  for (const cs of controlSpecs(controls))
    evaluated.push({
      label: `control: ${cs.label}`,
      quad: cs.quad,
      options: { enabled: cs.enabled },
      role: `control (${cs.group})`
    });

  const door = await openDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey} (guard ${guardSha.slice(0, 12)})`);

  logDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey}: guard verified`, { guard: guardSha });

  const rows = evaluated.map((m) => {
    const o: EvalOptions = { ...m.options, boundaries: [cut.end] };
    const x = sliceMarks(door, m.quad, o, cut.end, m.label);

    return {
      label: m.label,
      role: m.role,
      id: quadId(m.quad),
      quad: m.quad,
      enabled: Object.fromEntries(Object.entries(m.options.enabled ?? {})),
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
    primary: sel.primary,
    rows: rows.map(({ closes: _c, ...r }) => r),
    finished: new Date().toISOString()
  };

  fs.mkdirSync(path.join(cacheRoot, 'folds', env.prefix || 'study'), { recursive: true });
  fs.writeFileSync(
    path.join(cacheRoot, 'folds', env.prefix || 'study', `${cutKey}-closes.json`),
    JSON.stringify(rows.map((r) => ({ label: r.label, ...r.closes })))
  );
  sealJson(file, record, `fold evaluation ${cutKey}`);
  log(`fold evaluation ${cutKey}: ${rows.length} rows; primary ${sel.primary ?? 'none'}`);
  return record;
};

export { researchDir };
