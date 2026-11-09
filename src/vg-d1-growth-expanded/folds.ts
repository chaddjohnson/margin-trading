// Qualification and selection at a cutoff, the fold evaluation and the sequential policy (PROTOCOL.md §9, §10).
//
// At C19, C21 and C23 the members are the independent shortlist only; the fold primary is the actual-profit role of
// its qualified members. At C24 the members are the independent shortlist, both informed shortlists, the selectable
// controls (C4, E, A, B, C85) and the historical comparisons (Priority 3's informed, independent and staged primaries;
// never selectable). The formal primary is the actual-profit role of the FINAL selectable set (controls + independent
// + informed); C4 is a member under the same gates and rule and remains the user's preferred fallback (§9.4).
import fs from 'node:fs';
import path from 'node:path';
import { sequentialDrawdown } from '../vg-d1-growth-joint/post.ts';
import { type EvalOptions, type Rec, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { cacheRoot, economics, log, r2, repoRoot } from './context.ts';
import { type Cfg, type Inc, cfgId, optionsOf } from './config.ts';
import { loadControls } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { withLab } from './lab.ts';
import {
  type C4Labels,
  type Evidence,
  type Member,
  type Roles,
  c4LabelsOf,
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
          cfg: f.cfg,
          selectable: true
        })
      );
  };

  add('indep');

  if (finalCutoff(cutKey)) {
    add('informed');

    for (const c of loadControls().controls)
      if (c.cfg && (c.role === 'benchmark' || c.role === 'control' || c.role === 'historical'))
        members.push({
          label: `control: ${c.key}`,
          lane: 'control',
          kind: c.role === 'historical' ? 'historical' : 'control',
          cfg: c.cfg,
          selectable: c.selectable,
          control: c.key
        });
  }

  return members;
};

// ----- roles, the primary, the C4 comparison and the replacement candidate -----

export const rolesAt = (cutKey: string, evidence: readonly Evidence[]) => {
  const sets: Record<string, Roles> = {
    independent: rolesOf(
      'independent discovery (all three inclusion choices)',
      evidence.filter((e) => e.kind === 'indep')
    )
  };

  if (!finalCutoff(cutKey)) return { sets, primary: sets.independent!.roles['actual-profit'], c4: null };

  const final = evidence.filter((e) => e.selectable);

  sets.final = rolesOf('the final selectable set (C4, E, A, B, C85; independent; informed fixed-D1; informed joint)', final);
  sets['informed-fixed'] = rolesOf(
    'informed, VG #2 D1 vectors fixed',
    evidence.filter((e) => e.kind === 'informed-fixed')
  );
  sets['informed-joint'] = rolesOf(
    'informed, D1 and Growth vectors joint',
    evidence.filter((e) => e.kind === 'informed-joint')
  );
  sets.controls = rolesOf(
    'unchanged controls (C4, E, A, B, C85)',
    evidence.filter((e) => e.kind === 'control')
  );
  for (const inc of ['V', 'G', 'B'] as Inc[])
    sets[`inclusion ${inc}`] = rolesOf(
      `final set, inclusion ${inc}`,
      final.filter((e) => e.inc === inc)
    );

  const c4 = evidence.find((e) => e.control === 'C4');
  const labels: C4Labels[] = c4 ? evidence.map((e) => c4LabelsOf(e, c4)) : [];
  const dominating = c4
    ? final
        .filter((e) => e.qualified && e.control !== 'C4' && labels.find((l) => l.label === e.label)!.dominates)
        .sort((a, b) => b.centre.net - a.centre.net || (a.label < b.label ? -1 : 1))
    : [];

  return {
    sets,
    primary: sets.final!.roles['actual-profit'],
    c4: {
      evidence: c4 ? summary(c4) : null,
      qualified: c4?.qualified ?? false,
      labels,
      replacementCandidate: dominating[0]?.label ?? null,
      dominating: dominating.map((e) => e.label)
    }
  };
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

  return withLab(
    {
      job: `${env.prefix}qualify-${cutKey}`,
      door: cut.door,
      purpose: `${env.prefix}qualify ${cutKey}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${env.prefix}qualify-${cutKey}.jsonl`) } : {})
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey);
      const { sets, primary, c4 } = rolesAt(cutKey, evidence);
      const nearMisses = evidence
        .filter((e) => e.failed.length > 0 && e.failed.every((g) => g === 'Q3' || g === 'Q4' || g === 'Q5'))
        .map((e) => ({ label: e.label, failed: e.failed, severity: e.severity, net: e.centre.net, dd: e.centre.dd }));
      const record = {
        stage: 'qualify',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        primary,
        roles: sets,
        c4,
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
      log(`qualify ${cutKey}: primary ${primary ?? 'none'} — ${sets.final?.reason ?? sets.independent!.reason}`);
      return record;
    }
  );
};

// ----- the fold evaluation (one continuous run per configuration on the evaluation door) -----

export const sliceMarks = (door: Door, cfg: Cfg, o: EvalOptions, boundary: string) => {
  const x = run(door, cfg.quad, o, true, true);
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
    openAtBoundary: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
    openAtEnd: lots.filter((l) => l.open).map((l) => l.book)
  };
};

// The fold's frozen members: the holders of the independent set's four roles (deduplicated, in role order).
export const foldMembers = (sel: { roles: Record<string, Roles>; evidence: Evidence[] }) => {
  const out: { label: string; cfg: Cfg; roles: string[] }[] = [];

  for (const [r, label] of Object.entries(sel.roles.independent!.roles)) {
    if (!label) continue;

    const x = out.find((o) => o.label === label);

    if (x) x.roles.push(r);
    else out.push({ label, cfg: sel.evidence.find((e) => e.label === label)!.cfg, roles: [r] });
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

  const sel = readJson<{ primary: string | null; roles: Record<string, Roles>; evidence: Evidence[] }>(selFile);
  const guardSha = sha256File(selFile);
  const evaluated: { label: string; cfg: Cfg; options: EvalOptions; role: string }[] = foldMembers(sel).map((m) => ({
    label: m.label,
    cfg: m.cfg,
    options: optionsOf(m.cfg),
    role: m.roles.join(',')
  }));

  // the controls, descriptively (chosen with later data)
  for (const c of loadControls().controls)
    if (c.cfg && c.role !== 'historical')
      evaluated.push({ label: `control: ${c.key}`, cfg: c.cfg, options: optionsOf(c.cfg), role: `control (${c.role})` });

  const d = loadControls().controls.find((c) => c.key === 'D')!;
  const door = await openStudyDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey} (guard ${guardSha.slice(0, 12)})`);

  logDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey}: guard verified`, { guard: guardSha });

  const rows = [
    ...evaluated,
    { label: 'control: D', cfg: { inc: 'V', quad: d.subject.quad } as Cfg, options: d.subject.options, role: 'control (d1-only)' }
  ].map((m) => {
    const o: EvalOptions = { ...m.options, boundaries: [cut.end] };
    const x = sliceMarks(door, m.cfg, o, cut.end);

    return {
      label: m.label,
      role: m.role,
      id: m.label === 'control: D' ? d.p3Id : cfgId(m.cfg),
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
  seal(env, file, record, `fold evaluation ${cutKey}`);
  log(`fold evaluation ${cutKey}: ${rows.length} rows; primary ${sel.primary ?? 'none'}`);
  return record;
};

// ----- the sequential policy and its frozen verdict (PROTOCOL.md §10) -----

const dateOf = (t: number) => (Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : '—');

export const runSequential = async (env: Env, folds = ['C19', 'C21', 'C23']) => {
  const file = path.join(env.outDir, 'folds', 'sequential.json');

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  type Row = { label: string; role: string; id: string; sliceNet: number; sliceDd: number; openAtBoundary: string[]; openAtEnd: string[] };
  const evals = folds.map((c) => {
    if (!isSealed(evaluationFile(env, c))) throw new Error(`the fold evaluation of ${c} is not sealed`);
    return readJson<{ rows: Row[]; primary: string | null; slice: [string, string] }>(evaluationFile(env, c));
  });
  const closes = folds.map((c) =>
    readJson<{ label: string; t: number[]; v: number[] }[]>(path.join(cacheRoot, 'folds', env.prefix || 'study', `${c}-closes.json`))
  );
  const charge = (economics.costBps / 10000) * economics.budget; // 5 bps of $100,000 per lot closed or adopted
  const policy = (name: string, pick: (i: number) => string | null) => {
    const slices: { t: number[]; v: number[]; charge: number }[] = [];
    const parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number; charge: number }[] = [];
    let prev: { id: string; openAtEnd: number } | null = null;
    let charges = 0;

    folds.forEach((c, i) => {
      const label = pick(i);
      const row = label ? evals[i]!.rows.find((r) => r.label === label) : undefined;
      const m = label ? closes[i]!.find((x) => x.label === label) : undefined;
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
  const policies = [policy('independent procedure (each fold primary; flat without one)', (i) => evals[i]!.primary)];

  for (const role of ['robust-profit', 'balanced', 'lower-drawdown'])
    policies.push(policy(`role ${role}`, (i) => evals[i]!.rows.find((r) => r.role.split(',').includes(role))?.label ?? null));
  for (const l of evals[0]!.rows.filter((r) => r.role.startsWith('control')).map((r) => r.label))
    policies.push(policy(`fixed ${l} (descriptive: chosen with later data)`, () => l));

  const proc = policies[0]!;
  const record = {
    stage: 'sequential',
    folds: folds.map((c, i) => ({ fold: c, slice: evals[i]!.slice, primary: evals[i]!.primary })),
    switchCharge: `${economics.costBps} bps on $${economics.budget} per open lot closed or adopted at a boundary`,
    policies,
    verdict: proc.parts.some((p) => p.label === null)
      ? `chronologically incomplete: ${proc.parts
          .filter((p) => p.label === null)
          .map((p) => p.fold)
          .join(', ')} had no qualified combined candidate (flat fallback)`
      : proc.net > 0 && proc.withinCeiling
        ? 'chronologically supported (every fold produced a primary; sequential net > 0 and sequential minute drawdown ≤ $35,000)'
        : 'chronologically unsupported (sequential net ≤ 0 or sequential minute drawdown > $35,000)',
    scope:
      'the independent procedure only; the informed lanes and the controls inherit later-selected settings and have no chronological test'
  };

  seal(env, file, record, 'sequential');
  log(`sequential: ${record.verdict}; procedure ${usd(proc.net)}, DD ${usd(proc.sequentialDd)}`);
  return record;
};
