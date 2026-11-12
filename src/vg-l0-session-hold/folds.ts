// Qualification and selection at a cutoff, the fold evaluation and the sequential policy (PROTOCOL.md §9, §10) —
// reference method NL0's rules (5B's folds.ts) for one searched arm, the session hold unit ('ses').
//
// At C19, C21 and C23 the members are the independent shortlists (6 replicates × 3 V sub-cells); the fold primary is the
// actual-profit role of the qualified members. At C24 the members are the independent and informed shortlists and the
// selectable controls New L0, C4, C4-refined and C85 under the session unit (the qualifying-incumbent fallback: they
// compete under the same gates and rule; New L0 under 'ses' is the brief's configuration B); IJ1 and D (VG #2's D1 books
// only) are report-only rows. The same controls under calendar days ('cal'; New L0 there is the brief's configuration
// A, the historical control) are evaluated with the same instrument, never selectable. The primary is the actual-profit
// role of the final selectable set (the brief's configuration C); every other role and the independent primary are
// kept. Seed-level roles (each replicate alone) expose search variability and never select anything.
import fs from 'node:fs';
import path from 'node:path';
import { sequentialDrawdown } from '../vg-d1-growth-joint/post.ts';
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type Unit, cacheRoot, economics, log, r2, repoRoot, searchUnit, units } from './context.ts';
import { type Cfg, type Sub, cfgId, optionsOf, subs } from './config.ts';
import { controlOf, loadControls, optionsOfControl } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { withLab } from './lab.ts';
import { recordOfRun, runUnit } from './unit.ts';
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
  replicates,
  seal,
  searchFile,
  selectionFile,
  studyGuards
} from './stages.ts';
import { simulationCaps } from './budgets.ts';

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
          unit: lane.unit,
          replicate: lane.replicate,
          sub: (lane.cell as Sub | null) ?? null,
          cfg: f.cfg,
          selectable: true
        })
      );
  };

  add('indep');

  if (finalCutoff(cutKey)) {
    add('informed');

    for (const unit of units)
      for (const c of loadControls())
        members.push({
          label: `${unit}/control: ${c.key}`,
          lane: 'control',
          kind: c.role === 'd1-only' ? 'd1-only' : 'control',
          unit,
          replicate: null,
          sub: null,
          cfg: c.cfg,
          options: c.options,
          selectable: unit === searchUnit && c.selectable,
          control: c.key
        });
  }

  return members;
};

// ----- roles and the primaries, per arm -----

export const rolesAt = (cutKey: string, evidence: readonly Evidence[]) => {
  const sets: Record<string, Roles> = {};
  const primary: Partial<Record<Unit, string | null>> = {};
  const independentPrimary: Partial<Record<Unit, string | null>> = {};
  const comparisons: Record<string, { ref: string; labels: C4Labels[] }[]> = {};
  const unit = searchUnit;
  const ev = evidence.filter((e) => e.unit === unit);
  const indep = ev.filter((e) => e.kind === 'indep');

  sets[`${unit}/independent`] = rolesOf(`${unit}: independent discovery (all replicates and V sub-cells)`, indep);
  for (const r of replicates)
    sets[`${unit}/independent R${r}`] = rolesOf(
      `${unit}: independent replicate R${r} alone (seed-level; reporting only)`,
      indep.filter((e) => e.replicate === r)
    );
  for (const s of subs)
    sets[`${unit}/independent ${s}`] = rolesOf(
      `${unit}: independent, sub-cell ${s} (reporting only)`,
      indep.filter((e) => e.sub === s)
    );
  independentPrimary[unit] = sets[`${unit}/independent`]!.roles['actual-profit'];

  if (!finalCutoff(cutKey)) {
    primary[unit] = independentPrimary[unit]!;
    return { sets, primary, independentPrimary, comparisons };
  }

  const final = ev.filter((e) => e.selectable);
  const informed = ev.filter((e) => e.kind === 'informed');

  sets[`${unit}/final`] = rolesOf(
    `${unit}: the final selectable set (independent; informed; controls New L0, C4, C4-refined, C85 under ${unit})`,
    final
  );
  sets[`${unit}/informed`] = rolesOf(`${unit}: informed (all replicates)`, informed);
  for (const r of replicates)
    sets[`${unit}/informed R${r}`] = rolesOf(
      `${unit}: informed replicate R${r} alone (seed-level; reporting only)`,
      informed.filter((e) => e.replicate === r)
    );
  sets[`${unit}/searched`] = rolesOf(`${unit}: every searched member (independent and informed; no control)`, [
    ...indep,
    ...informed
  ]);
  for (const u of units)
    sets[`${u}/controls`] = rolesOf(
      `${u}: unchanged controls`,
      evidence.filter((e) => e.unit === u && e.kind === 'control')
    );
  primary[unit] = sets[`${unit}/final`]!.roles['actual-profit'];

  // comparisons (reported, never selection inputs): every member against New L0 under 'ses' (B) and 'cal' (A), C4 and
  // C4-refined (under 'ses')
  const ref = (u: Unit, k: string) => evidence.find((e) => e.unit === u && e.control === k);

  comparisons[unit] = [ref('ses', 'NL0'), ref('cal', 'NL0'), ref('ses', 'C4'), ref('ses', 'C4R')]
    .filter((x): x is Evidence => !!x)
    .map((r) => ({ ref: r.label, labels: evidence.map((e) => labelsVs(e, r)) }));

  return { sets, primary, independentPrimary, comparisons };
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

  const members = membersOf(cutKey, env);
  const job = `${env.prefix}qualify-${cutKey}`;

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}qualify ${cutKey}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      maxFresh:
        env.schedule === 'study'
          ? finalCutoff(cutKey)
            ? simulationCaps.qualifyFinal
            : simulationCaps.qualify
          : undefined
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey);
      const { sets, primary, independentPrimary, comparisons } = rolesAt(cutKey, evidence);
      const nearMisses = evidence
        .filter((e) => e.failed.length > 0 && e.failed.every((g) => g === 'Q3' || g === 'Q4' || g === 'Q5'))
        .map((e) => ({
          label: e.label,
          unit: e.unit,
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
      log(
        `qualify ${cutKey}: primary ${primary[searchUnit] ?? 'none'}; independent primary ${independentPrimary[searchUnit] ?? 'none'}`
      );
      return record;
    }
  );
};

// ----- the fold evaluation: one continuous run per (phenotype, hold unit) on the evaluation door -----

export const sliceMarks = (door: Door, cfg: Cfg, o: EvalOptions, unit: Unit, boundary: string) => {
  const x = runUnit(door, cfg.quad, o, unit, true);
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
    rec: recordOfRun(door, cfg.quad, x, o, unit) as Rec,
    lots: lots.filter((l) => l.open || l.fills.at(-1)!.s > b),
    openAtBoundary: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
    openAtEnd: lots.filter((l) => l.open).map((l) => l.book)
  };
};

// The fold's frozen export set (PROTOCOL.md §10–§11): the holders of the independent set's four roles and of each
// replicate's actual-profit role (deduplicated, in role order). Every exported phenotype is evaluated on the slice
// under BOTH hold units (the 'cal' rows are report-only cross rows beside the own 'ses' rows, which feed the sequential
// policy).
export const foldExports = (sel: { roles: Record<string, Roles>; evidence: Evidence[] }) => {
  const out: { label: string; unit: Unit; id: string; cfg: Cfg; roles: string[] }[] = [];
  const unit = searchUnit;

  for (const [setName, tag] of [
    [`${unit}/independent`, ''],
    ...replicates.map((r) => [`${unit}/independent R${r}`, `R${r} `] as const)
  ] as const)
    for (const [r, label] of Object.entries(sel.roles[setName]!.roles)) {
      if (!label || (tag && r !== 'actual-profit')) continue;

      const x = out.find((o) => o.label === label);

      if (x) x.roles.push(`${tag}${r}`);
      else {
        const e = sel.evidence.find((y) => y.label === label)!;

        out.push({ label, unit, id: e.id, cfg: e.cfg, roles: [`${tag}${r}`] });
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

  if (!isSealed(selFile))
    throw new Error(`the fold selection of ${cutKey} is not sealed (the evaluation door's guard)`);
  if (env.schedule === 'study') assertCommitted(selFile);

  const sel = readJson<{
    primary: Partial<Record<Unit, string | null>>;
    independentPrimary: Partial<Record<Unit, string | null>>;
    roles: Record<string, Roles>;
    evidence: Evidence[];
  }>(selFile);
  const guardSha = sha256File(selFile);
  const exports = foldExports(sel);
  const subjects: { label: string; ownUnit: Unit | null; id: string; cfg: Cfg; options: EvalOptions; role: string }[] =
    [
      ...exports.map((x) => ({
        label: x.label,
        ownUnit: x.unit,
        id: x.id,
        cfg: x.cfg,
        options: optionsOf(x.cfg),
        role: x.roles.join(',')
      }))
    ];

  // the controls, descriptively (chosen with later data): New L0 (A under 'cal', B under 'ses'), C4, C4-refined, D
  for (const k of ['NL0', 'C4', 'C4R', 'D']) {
    const c = controlOf(k);

    subjects.push({
      label: `control: ${k}`,
      ownUnit: null,
      id: cfgId(c.cfg),
      cfg: c.cfg,
      options: optionsOfControl(c),
      role: k === 'D' ? 'control (d1-only)' : 'control'
    });
  }

  const door = await openStudyDoor(
    cut.evalDoor,
    `${env.prefix}fold evaluation ${cutKey} (guard ${guardSha.slice(0, 12)})`
  );

  logDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey}: guard verified`, { guard: guardSha });

  const rows = subjects.flatMap((m) =>
    units.map((unit) => {
      const o: EvalOptions = { ...m.options, boundaries: [cut.end] };
      const x = sliceMarks(door, m.cfg, o, unit, cut.end);

      return {
        label: m.label,
        unit,
        own: m.ownUnit === unit,
        exportedBy: m.ownUnit,
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
    primary: sel.independentPrimary, // the fold primary: the independent actual-profit role
    exports: exports.map(({ cfg: _c, ...x }) => x),
    rows: rows.map(({ closes: _c, ...r }) => r),
    finished: new Date().toISOString()
  };

  fs.mkdirSync(path.join(cacheRoot, 'folds', env.prefix || 'study'), { recursive: true });
  fs.writeFileSync(
    path.join(cacheRoot, 'folds', env.prefix || 'study', `${cutKey}-closes.json`),
    JSON.stringify(rows.map((r) => ({ label: r.label, unit: r.unit, ...r.closes })))
  );
  seal(env, file, record, `fold evaluation ${cutKey}`);
  log(`fold evaluation ${cutKey}: ${rows.length} rows; fold primary ${JSON.stringify(sel.independentPrimary)}`);
  return record;
};

// ----- the sequential policy and its frozen verdict (PROTOCOL.md §10): the session arm's independent procedure; the
// same fold primaries under calendar days and the fixed controls are descriptive rows -----

const dateOf = (t: number) =>
  Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : '—';

export const runSequential = async (env: Env, folds = ['C19', 'C21', 'C23']) => {
  const file = path.join(env.outDir, 'folds', 'sequential.json');

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  type Row = {
    label: string;
    unit: Unit;
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
    return readJson<{ rows: Row[]; primary: Partial<Record<Unit, string | null>>; slice: [string, string] }>(
      evaluationFile(env, c)
    );
  });
  const closes = folds.map((c) =>
    readJson<{ label: string; unit: Unit; t: number[]; v: number[] }[]>(
      path.join(cacheRoot, 'folds', env.prefix || 'study', `${c}-closes.json`)
    )
  );
  const charge = (economics.costBps / 10000) * economics.budget; // 5 bps of $100,000 per lot closed or adopted
  const policy = (name: string, unit: Unit, pick: (i: number) => string | null) => {
    const slices: { t: number[]; v: number[]; charge: number }[] = [];
    const parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number; charge: number }[] = [];
    let prev: { id: string; openAtEnd: number } | null = null;
    let charges = 0;

    folds.forEach((c, i) => {
      const label = pick(i);
      const row = label ? evals[i]!.rows.find((r) => r.label === label && r.unit === unit) : undefined;
      const m = label ? closes[i]!.find((x) => x.label === label && x.unit === unit) : undefined;
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
      unit,
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
  const procedureOf = (unit: Unit) => {
    const own = searchUnit;
    const roleLabel = (i: number, role: string) =>
      evals[i]!.rows.find((r) => r.unit === own && r.own && r.role.split(',').includes(role))?.label ?? null;
    const tag = unit === own ? `${unit}` : `${unit} (descriptive cross row: the ${own} selections under ${unit})`;
    const procedure = policy(
      `${tag}: independent procedure (each fold primary; flat without one)`,
      unit,
      (i) => evals[i]!.primary[own] ?? null
    );
    const policies = [procedure];

    for (const role of ['robust-profit', 'balanced', 'lower-drawdown'])
      policies.push(policy(`${tag}: role ${role}`, unit, (i) => roleLabel(i, role)));
    for (const r of replicates)
      policies.push(
        policy(`${tag}: replicate R${r} alone (seed-level actual-profit; reporting only)`, unit, (i) =>
          roleLabel(i, `R${r} actual-profit`)
        )
      );
    for (const l of ['control: NL0', 'control: C4', 'control: C4R', 'control: D'])
      policies.push(policy(`${unit}: fixed ${l} (descriptive: chosen with later data)`, unit, () => l));

    return { unit, verdict: verdictOf(procedure), procedure, policies };
  };
  const arms = [procedureOf(searchUnit), ...units.filter((u) => u !== searchUnit).map(procedureOf)];
  const record = {
    stage: 'sequential',
    folds: folds.map((c, i) => ({ fold: c, slice: evals[i]!.slice, primary: evals[i]!.primary })),
    verdict: arms[0]!.verdict,
    switchCharge: `${economics.costBps} bps on $${economics.budget} per open lot closed or adopted at a boundary`,
    arms,
    scope:
      "the session arm's independent procedure is the frozen chronological test (its verdict); the same fold primaries under calendar days and the fixed controls are descriptive; the informed lane and the controls inherit later-selected settings and have no chronological test"
  };

  seal(env, file, record, 'sequential');
  for (const a of arms)
    log(`sequential ${a.unit}: ${a.verdict}; ${usd(a.procedure.net)}, DD ${usd(a.procedure.sequentialDd)}`);
  return record;
};
