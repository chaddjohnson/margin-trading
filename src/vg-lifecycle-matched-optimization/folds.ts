// Qualification and selection at a cutoff, the fold evaluation and the sequential policies (PROTOCOL.md §9, §10), per
// lifecycle (arm).
//
// At C19, C21 and C23 each arm's members are its independent shortlist (both replicates, all three structures); the
// arm's fold primary is the actual-profit role of its qualified members. At C24 each arm's members are its independent
// and informed shortlists and the selectable controls (C4, C4-refined, C85, E, A, B) evaluated under that arm's
// lifecycle; D (VG #2's D1 books only) is a comparator, never selectable. The arm's primary is the actual-profit role
// of its FINAL selectable set (the qualifying-incumbent fallback: the controls compete under the same gates and rule);
// its independent primary and every other role are kept. Seed-level roles (each replicate alone) expose search
// variability and never select anything.
import fs from 'node:fs';
import path from 'node:path';
import { sequentialDrawdown } from '../vg-d1-growth-joint/post.ts';
import { type EvalOptions, type Rec, recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type Mode, cacheRoot, economics, log, modes, r2, repoRoot } from './context.ts';
import { type Cfg, type Inc, canonicalOf, cfgId, optionsOf, placeholder } from './config.ts';
import { loadControls, vg2D1 } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { withLab } from './lab.ts';
import { runLife } from './life.ts';
import {
  type C4Labels,
  type Evidence,
  type Member,
  type Roles,
  labelsVs,
  qualifyMembers,
  rolesOf,
  summary
} from './qualify.ts';
import { isSealed, logDoor, readJson, sha256File, usd } from './records.ts';
import {
  type Env,
  type LaneResult,
  assertCommitted,
  cutoffs,
  evaluationFile,
  finalCutoff,
  seal,
  searchFile,
  selectionFile,
  studyGuards
} from './stages.ts';
import { simulationCaps } from './budgets.ts';

// D (VG #2's two D1 books, Growth disabled) as a member: the V configuration with the VGT Growth placeholder and every
// Growth book disabled by the options; its neighbourhoods move the D1 books only (scope d1).
export const dMember = (mode: Mode): Member => ({
  label: `${mode}/control: D`,
  lane: 'control',
  kind: 'd1-only',
  mode,
  replicate: null,
  cfg: canonicalOf('V', { d1: vg2D1(), g: { GDX: placeholder, VGT: placeholder }, first: 'D1' }),
  options: { enabled: { 'G:GDX': false, 'G:VGT': false } },
  selectable: false,
  control: 'D'
});

// ----- members -----

export const membersOf = (cutKey: string, env: Env): Member[] => {
  const members: Member[] = [];
  const add = (arm: 'indep' | 'informed') => {
    const search = readJson<{ lanes: LaneResult[] }>(searchFile(env, cutKey, arm));

    for (const lane of search.lanes)
      lane.shortlist.forEach((f, i) =>
        members.push({
          label: `${lane.key}#${i + 1} ${f.pick}`,
          lane: lane.key,
          kind: lane.kind,
          mode: lane.mode,
          replicate: lane.replicate,
          cfg: f.cfg,
          selectable: true
        })
      );
  };

  add('indep');

  if (finalCutoff(cutKey)) {
    add('informed');

    for (const mode of modes) {
      for (const c of loadControls().controls)
        if (c.cfg && (c.role === 'benchmark' || c.role === 'control'))
          members.push({
            label: `${mode}/control: ${c.key}`,
            lane: 'control',
            kind: 'control',
            mode,
            replicate: null,
            cfg: c.cfg,
            selectable: c.selectable,
            control: c.key
          });
      members.push(dMember(mode));
    }
  }

  return members;
};

// ----- roles and the primaries, per arm -----

export const rolesAt = (cutKey: string, evidence: readonly Evidence[]) => {
  const sets: Record<string, Roles> = {};
  const primary: Record<string, string | null> = {};
  const independentPrimary: Record<string, string | null> = {};
  const comparisons: Record<string, { ref: string; labels: C4Labels[] }[]> = {};

  for (const mode of modes) {
    const ev = evidence.filter((e) => e.mode === mode);
    const indep = ev.filter((e) => e.kind === 'indep');

    sets[`${mode}/independent`] = rolesOf(`${mode}: independent discovery (both replicates, all structures)`, indep);
    for (const r of [1, 2])
      sets[`${mode}/independent R${r}`] = rolesOf(
        `${mode}: independent replicate R${r} alone (seed-level; reporting only)`,
        indep.filter((e) => e.replicate === r)
      );
    for (const inc of ['V', 'G', 'B'] as Inc[])
      sets[`${mode}/independent ${inc}`] = rolesOf(`${mode}: independent, structure ${inc}`, indep.filter((e) => e.inc === inc));
    independentPrimary[mode] = sets[`${mode}/independent`]!.roles['actual-profit'];

    if (!finalCutoff(cutKey)) {
      primary[mode] = independentPrimary[mode]!;
      continue;
    }

    const final = ev.filter((e) => e.selectable);
    const informed = ev.filter((e) => e.kind === 'informed');

    sets[`${mode}/final`] = rolesOf(
      `${mode}: the final selectable set (independent; informed; controls C4, C4-refined, C85, E, A, B)`,
      final
    );
    sets[`${mode}/informed`] = rolesOf(`${mode}: informed (both replicates)`, informed);
    for (const r of [1, 2])
      sets[`${mode}/informed R${r}`] = rolesOf(
        `${mode}: informed replicate R${r} alone (seed-level; reporting only)`,
        informed.filter((e) => e.replicate === r)
      );
    sets[`${mode}/controls`] = rolesOf(`${mode}: unchanged controls`, ev.filter((e) => e.kind === 'control'));
    for (const inc of ['V', 'G', 'B'] as Inc[])
      sets[`${mode}/final ${inc}`] = rolesOf(`${mode}: final set, inclusion ${inc}`, final.filter((e) => e.inc === inc));
    primary[mode] = sets[`${mode}/final`]!.roles['actual-profit'];
    comparisons[mode] = ['C4', 'C4R']
      .map((k) => ev.find((e) => e.control === k))
      .filter((x): x is Evidence => !!x)
      .map((ref) => ({ ref: ref.label, labels: ev.map((e) => labelsVs(e, ref)) }));
  }

  return { sets, primary, independentPrimary, comparisons };
};

export const runQualify = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = selectionFile(env, cutKey);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists: the selection of ${cutKey} is sealed`);
  if (!isSealed(searchFile(env, cutKey, 'indep'))) throw new Error(`the independent search of ${cutKey} is not sealed`);
  if (finalCutoff(cutKey) && !isSealed(searchFile(env, cutKey, 'informed')))
    throw new Error(`the informed search of ${cutKey} is not sealed`);

  const members = membersOf(cutKey, env);
  const job = `${env.prefix}qualify-${cutKey}`;

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}qualify ${cutKey}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      maxFresh: env.schedule === 'study' ? (finalCutoff(cutKey) ? simulationCaps.qualifyFinal : simulationCaps.qualify) : undefined
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey);
      const { sets, primary, independentPrimary, comparisons } = rolesAt(cutKey, evidence);
      const nearMisses = evidence
        .filter((e) => e.failed.length > 0 && e.failed.every((g) => g === 'Q3' || g === 'Q4' || g === 'Q5'))
        .map((e) => ({ label: e.label, mode: e.mode, failed: e.failed, severity: e.severity, net: e.centre.net, dd: e.centre.dd }));
      const record = {
        stage: 'qualify',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        primary,
        independentPrimary,
        roles: sets,
        comparisons,
        nearMisses,
        summary: evidence.map(summary),
        evidence,
        compute: lab.compute,
        codeDigest: lab.digest,
        searches: Object.fromEntries(
          (finalCutoff(cutKey) ? (['indep', 'informed'] as const) : (['indep'] as const)).map((a) => [
            a,
            sha256File(searchFile(env, cutKey, a))
          ])
        ),
        finished: new Date().toISOString()
      };

      seal(env, file, record, `qualify ${cutKey}`);
      for (const mode of modes) log(`qualify ${cutKey} ${mode}: primary ${primary[mode] ?? 'none'}`);
      return record;
    }
  );
};

// ----- the fold evaluation: one continuous run per (phenotype, lifecycle) on the evaluation door -----

export const sliceMarks = (door: Door, cfg: Cfg, o: EvalOptions, mode: Mode, boundary: string) => {
  const x = runLife(door, cfg.quad, o, mode, { recordMarks: true });
  const b = door.dates.indexOf(boundary);

  if (b < 0) throw new Error(`${boundary} is not a session of ${door.name}`);

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
    t,
    v,
    rec: recordOf(door, cfg.quad, x, o) as Rec,
    lots: lots.filter((l) => l.open || l.fills.at(-1)!.s > b),
    openAtBoundary: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
    openAtEnd: lots.filter((l) => l.open).map((l) => l.book),
    rounds: x.rounds
  };
};

// The fold's frozen export set (PROTOCOL.md §10–§11): per arm, the holders of its independent set's four roles and of
// each replicate's actual-profit role (deduplicated, in role order). Every exported phenotype is evaluated on the slice
// under ALL three lifecycles (the cross-test rows; report-only beside the own-lifecycle rows, which feed the sequential
// policy).
export const foldExports = (sel: { roles: Record<string, Roles>; evidence: Evidence[] }) => {
  const out: { label: string; mode: Mode; id: string; cfg: Cfg; roles: string[] }[] = [];

  for (const mode of modes)
    for (const [setName, tag] of [
      [`${mode}/independent`, ''],
      [`${mode}/independent R1`, 'R1 '],
      [`${mode}/independent R2`, 'R2 ']
    ] as const)
      for (const [r, label] of Object.entries(sel.roles[setName]!.roles)) {
        if (!label || (tag && r !== 'actual-profit')) continue;

        const x = out.find((o) => o.label === label);

        if (x) x.roles.push(`${tag}${r}`);
        else {
          const e = sel.evidence.find((y) => y.label === label)!;

          out.push({ label, mode, id: e.id, cfg: e.cfg, roles: [`${tag}${r}`] });
        }
      }

  return out;
};

export const runFoldEval = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = evaluationFile(env, cutKey);

  if (cutKey === 'C24') throw new Error('C24 is evaluated once by the validation stage');
  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const selFile = selectionFile(env, cutKey);

  if (!isSealed(selFile)) throw new Error(`the fold selection of ${cutKey} is not sealed (the evaluation door's guard)`);
  if (env.schedule === 'study') assertCommitted(selFile);

  const sel = readJson<{
    primary: Record<Mode, string | null>;
    independentPrimary: Record<Mode, string | null>;
    roles: Record<string, Roles>;
    evidence: Evidence[];
  }>(selFile);
  const guardSha = sha256File(selFile);
  const exports = foldExports(sel);
  const subjects: { label: string; ownMode: Mode | null; id: string; cfg: Cfg; options: EvalOptions; role: string }[] = [
    ...exports.map((x) => ({ label: x.label, ownMode: x.mode, id: x.id, cfg: x.cfg, options: optionsOf(x.cfg), role: x.roles.join(',') }))
  ];

  // the controls, descriptively (chosen with later data)
  for (const k of ['C4', 'C4R']) {
    const c = loadControls().controls.find((x) => x.key === k)!;

    subjects.push({ label: `control: ${k}`, ownMode: null, id: cfgId(c.cfg!), cfg: c.cfg!, options: optionsOf(c.cfg!), role: 'control' });
  }

  const d = dMember('L0');

  subjects.push({ label: 'control: D', ownMode: null, id: cfgId(d.cfg), cfg: d.cfg, options: d.options!, role: 'control (d1-only)' });

  const door = await openStudyDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey} (guard ${guardSha.slice(0, 12)})`);

  logDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey}: guard verified`, { guard: guardSha });

  const rows = subjects.flatMap((m) =>
    modes.map((mode) => {
      const o: EvalOptions = { ...m.options, boundaries: [cut.end] };
      const x = sliceMarks(door, m.cfg, o, mode, cut.end);

      return {
        label: m.label,
        mode,
        own: m.ownMode === mode,
        exportedBy: m.ownMode,
        role: m.role,
        id: m.id,
        cfg: m.cfg,
        sliceNet: x.rec.periods[0]!.after,
        sliceDd: x.rec.periods[0]!.dd,
        boundaryEquity: x.rec.periods[0]!.equity,
        wholeNet: x.rec.net,
        wholeDd: x.rec.dd,
        openAtBoundary: x.openAtBoundary,
        openAtEnd: x.openAtEnd,
        rounds: x.rounds,
        record: x.rec,
        closes: { t: x.t, v: x.v }
      };
    })
  );
  const record = {
    stage: 'fold evaluation',
    cutoff: cutKey,
    door: cut.evalDoor,
    slice: cut.slice,
    boundary: cut.end,
    guardSha256: guardSha,
    primary: sel.independentPrimary, // the fold primary: the independent actual-profit role of each arm
    exports: exports.map(({ cfg: _c, ...x }) => x),
    rows: rows.map(({ closes: _c, ...r }) => r),
    finished: new Date().toISOString()
  };

  fs.mkdirSync(path.join(cacheRoot, 'folds', env.prefix || 'study'), { recursive: true });
  fs.writeFileSync(
    path.join(cacheRoot, 'folds', env.prefix || 'study', `${cutKey}-closes.json`),
    JSON.stringify(rows.map((r) => ({ label: r.label, mode: r.mode, ...r.closes })))
  );
  seal(env, file, record, `fold evaluation ${cutKey}`);
  log(`fold evaluation ${cutKey}: ${rows.length} rows; fold primaries ${JSON.stringify(sel.independentPrimary)}`);
  return record;
};

// ----- the sequential policies and their frozen verdicts, one per arm (PROTOCOL.md §10) -----

const dateOf = (t: number) => (Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : '—');

export const runSequential = async (env: Env, folds = ['C19', 'C21', 'C23']) => {
  const file = path.join(env.outDir, 'folds', 'sequential.json');

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  type Row = {
    label: string;
    mode: Mode;
    own: boolean;
    role: string;
    id: string;
    sliceNet: number;
    sliceDd: number;
    openAtBoundary: string[];
    openAtEnd: string[];
  };
  const evals = folds.map((c) => {
    if (!isSealed(evaluationFile(env, c))) throw new Error(`the fold evaluation of ${c} is not sealed`);
    return readJson<{ rows: Row[]; primary: Record<Mode, string | null>; slice: [string, string] }>(evaluationFile(env, c));
  });
  const closes = folds.map((c) =>
    readJson<{ label: string; mode: Mode; t: number[]; v: number[] }[]>(
      path.join(cacheRoot, 'folds', env.prefix || 'study', `${c}-closes.json`)
    )
  );
  const charge = (economics.costBps / 10000) * economics.budget; // 5 bps of $100,000 per lot closed or adopted
  const policy = (name: string, mode: Mode, pick: (i: number) => string | null) => {
    const slices: { t: number[]; v: number[]; charge: number }[] = [];
    const parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number; charge: number }[] = [];
    let prev: { id: string; openAtEnd: number } | null = null;
    let charges = 0;

    folds.forEach((c, i) => {
      const label = pick(i);
      const row = label ? evals[i]!.rows.find((r) => r.label === label && r.mode === mode) : undefined;
      const m = label ? closes[i]!.find((x) => x.label === label && x.mode === mode) : undefined;
      let ch = 0;

      if (row && prev && prev.id !== row.id) ch = charge * (prev.openAtEnd + row.openAtBoundary.length);
      if (!row && prev) ch = charge * prev.openAtEnd;
      charges += ch;
      slices.push({ t: m?.t ?? [], v: m?.v ?? [], charge: ch });
      parts.push({ fold: c, label, sliceNet: row?.sliceNet ?? 0, sliceDd: row?.sliceDd ?? 0, charge: ch });
      prev = row ? { id: row.id, openAtEnd: row.openAtEnd.length } : null;
    });

    const dd = sequentialDrawdown(slices, 0);

    return {
      name,
      mode,
      parts,
      netBeforeCharges: r2(parts.reduce((a, p) => a + p.sliceNet, 0)),
      charges: r2(charges),
      net: r2(parts.reduce((a, p) => a + p.sliceNet, 0) - charges),
      sequentialDd: r2(dd.maximum),
      ddPeak: dateOf(dd.peakTime),
      ddTrough: dateOf(dd.troughTime),
      withinCeiling: dd.maximum <= economics.ceiling
    };
  };
  const verdictOf = (p: ReturnType<typeof policy>) =>
    p.parts.some((x) => x.label === null)
      ? `chronologically incomplete: ${p.parts
          .filter((x) => x.label === null)
          .map((x) => x.fold)
          .join(', ')} had no qualified combined candidate (flat fallback)`
      : p.net > 0 && p.withinCeiling
        ? 'chronologically supported (every fold produced a primary; sequential net > 0 and sequential minute drawdown ≤ $35,000)'
        : 'chronologically unsupported (sequential net ≤ 0 or sequential minute drawdown > $35,000)';
  const arms = modes.map((mode) => {
    const roleLabel = (i: number, role: string) =>
      evals[i]!.rows.find((r) => r.mode === mode && r.own && r.role.split(',').includes(role))?.label ?? null;
    const procedure = policy(`${mode}: independent procedure (each fold primary; flat without one)`, mode, (i) => evals[i]!.primary[mode]);
    const policies = [procedure];

    for (const role of ['robust-profit', 'balanced', 'lower-drawdown'])
      policies.push(policy(`${mode}: role ${role}`, mode, (i) => roleLabel(i, role)));
    for (const r of ['R1', 'R2'])
      policies.push(policy(`${mode}: replicate ${r} alone (seed-level actual-profit; reporting only)`, mode, (i) => roleLabel(i, `${r} actual-profit`)));
    for (const l of ['control: C4', 'control: C4R', 'control: D'])
      policies.push(policy(`${mode}: fixed ${l} (descriptive: chosen with later data)`, mode, () => l));

    return { mode, verdict: verdictOf(procedure), procedure, policies };
  });
  const record = {
    stage: 'sequential',
    folds: folds.map((c, i) => ({ fold: c, slice: evals[i]!.slice, primary: evals[i]!.primary })),
    switchCharge: `${economics.costBps} bps on $${economics.budget} per open lot closed or adopted at a boundary`,
    arms,
    scope:
      'the independent procedure of each lifecycle only, each a separate continuous path; no lifecycle is chosen per slice; the informed lane and the controls inherit later-selected settings and have no chronological test'
  };

  seal(env, file, record, 'sequential');
  for (const a of arms) log(`sequential ${a.mode}: ${a.verdict}; ${usd(a.procedure.net)}, DD ${usd(a.procedure.sequentialDd)}`);
  return record;
};
