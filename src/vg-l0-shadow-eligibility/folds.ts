// Qualification and selection at a cutoff, the fold evaluation and the sequential policies (PROTOCOL.md §9, §10) —
// reference method NL0's rules (5B's folds.ts, as the trading-session study ported them) for each track and step.
//
// - A selection job per (cutoff, track, step) qualifies that search's shortlists with ONE instrument (identical draws for
//   every member of a cutoff). Step d1 of a sequential track freezes its D1 FINALISTS: the holders of the actual-profit
//   and robust-profit roles of its qualified members; when one member holds both, the second finalist is the next
//   qualified member in the profit order at L∞ ≥ 0.10 from the first (a materially different D1 pair); no qualified
//   member → no finalist (the track has no primary at that cutoff: a procedure failure, reported). The joint step and
//   step g give the TRACK'S PRIMARY: the actual-profit role of its qualified members (both finalists' searches pooled).
// - C24 only: the controls (New L0 under the 8 toggle combinations, C4, C4-refined, C85; IJ1 and D report-only) are
//   qualified with the same instrument; the FINAL SELECTION (no new evaluation) ranks the final selectable set — every
//   track's qualified C24 members + the selectable controls (the qualifying-incumbent fallback) — and its actual-profit
//   role is the study's NOMINEE (New L0 itself is a valid outcome). Every role, track primary and comparison is kept.
// - The fold evaluation (C19, C21, C23): each fresh track's exports on the next slice (one continuous run per
//   phenotype on the evaluation door); the sequential policies chain the fold primaries per procedure (B1, B2).
import fs from 'node:fs';
import path from 'node:path';
import { sequentialDrawdown } from '../vg-d1-growth-joint/post.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { simulationCaps, perMemberCap } from './budgets.ts';
import {
  type Step,
  type Track,
  cacheRoot,
  economics,
  informedTrack,
  log,
  r2,
  repoRoot,
  searchKey,
  sequentialTrack,
  tracks
} from './context.ts';
import { type Cfg, type Sub, cfgDistance, cfgId, optionsOf, subs } from './config.ts';
import { controlOf, loadControls, nl0Key, optionsOfControl } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { type SRec, allSh, recordOf, run } from './evaluate.ts';
import { withLab } from './lab.ts';
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
  type D1Finalist,
  type Env,
  type LaneResult,
  assertCommitted,
  controlsFile,
  cutoffs,
  d1Finalists,
  evaluationFile,
  finalCutoff,
  finalSelectionFile,
  finalStepOf,
  replicatesOf,
  seal,
  searchFile,
  selectionFile,
  studyGuards
} from './stages.ts';

// ----- members -----

export const membersOf = (cutKey: string, track: Track, step: Step, env: Env): Member[] => {
  const search = readJson<{ lanes: LaneResult[] }>(searchFile(env, cutKey, track, step));
  const members: Member[] = [];

  for (const lane of search.lanes)
    lane.shortlist.forEach((f, i) =>
      members.push({
        label: `${lane.key}#${i + 1} ${f.pick}`,
        lane: lane.key,
        kind: lane.kind,
        track,
        step,
        replicate: lane.replicate,
        sub: (lane.cell as Sub | null) ?? null,
        cfg: f.cfg,
        selectable: step !== 'd1'
      })
    );

  return members;
};

export const controlMembers = (): Member[] =>
  loadControls().map((c) => ({
    label: `control: ${c.key}`,
    lane: 'control',
    kind: c.role === 'd1-only' ? 'd1-only' : 'control',
    track: null,
    step: null,
    replicate: null,
    sub: null,
    cfg: c.cfg,
    options: optionsOfControl(c),
    selectable: c.selectable,
    control: c.key
  }));

// ----- roles of one (track, step) selection -----

export const rolesOfStep = (track: Track, step: Step, evidence: readonly Evidence[], env: Env) => {
  const sets: Record<string, Roles> = {};
  const name = searchKey(track, step);

  sets[name] = rolesOf(
    `${name}: every shortlisted member (all replicates${step === 'g' ? ' and finalists' : ''})`,
    evidence
  );
  for (let r = 1; r <= replicatesOf(env, track, step); r++)
    sets[`${name} R${r}`] = rolesOf(
      `${name}: replicate R${r} alone (seed-level; reporting only)`,
      evidence.filter((e) => e.replicate === r)
    );
  if (!informedTrack(track))
    for (const s of subs)
      sets[`${name} ${s}`] = rolesOf(
        `${name}: sub-cell ${s} (reporting only)`,
        evidence.filter((e) => e.sub === s)
      );
  if (step === 'g')
    for (let f = 1; f <= d1Finalists; f++)
      sets[`${name} F${f}`] = rolesOf(
        `${name}: beside D1 finalist F${f} (reporting only)`,
        evidence.filter((e) => e.lane.includes(`/F${f}/`))
      );

  return sets;
};

// The step-d1 finalists (frozen rule, PROTOCOL.md §7.3).
export const finalistsFrom = (roles: Roles, evidence: readonly Evidence[]): D1Finalist[] => {
  const byLabel = (l: string | null) => (l ? (evidence.find((e) => e.label === l) ?? null) : null);
  const first = byLabel(roles.roles['actual-profit']);

  if (!first) return [];

  const out: D1Finalist[] = [{ index: 1, label: first.label, role: 'actual-profit', id: first.id, cfg: first.cfg }];
  const robust = byLabel(roles.roles['robust-profit']);

  if (robust && robust.id !== first.id && cfgDistance(robust.cfg, first.cfg) >= 0.1)
    out.push({ index: 2, label: robust.label, role: 'robust-profit', id: robust.id, cfg: robust.cfg });
  else {
    const next = roles.ranked
      .map((x) => byLabel(x.label)!)
      .find((e) => e.id !== first.id && cfgDistance(e.cfg, first.cfg) >= 0.1);

    if (next)
      out.push({
        index: 2,
        label: next.label,
        role: robust && robust.id !== first.id ? 'profit order (robust holder within L∞ 0.10)' : 'profit order',
        id: next.id,
        cfg: next.cfg
      });
  }

  return out.slice(0, d1Finalists);
};

const nearMissesOf = (evidence: readonly Evidence[]) =>
  evidence
    .filter((e) => e.failed.length > 0 && e.failed.every((g) => g === 'Q3' || g === 'Q4' || g === 'Q5'))
    .map((e) => ({ label: e.label, failed: e.failed, severity: e.severity, net: e.centre.net, dd: e.centre.dd }));

export const runQualify = async (cutKey: string, track: Track, step: Step, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = selectionFile(env, cutKey, track, step);

  studyGuards(env);
  if (fs.existsSync(file))
    throw new Error(`${path.relative(repoRoot, file)} exists: the ${searchKey(track, step)} selection is sealed`);
  if (!isSealed(searchFile(env, cutKey, track, step)))
    throw new Error(`the ${searchKey(track, step)} search of ${cutKey} is not sealed`);

  const members = membersOf(cutKey, track, step, env);
  const job = `${env.prefix}qualify-${cutKey}-${searchKey(track, step)}`;

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}qualify ${cutKey} ${searchKey(track, step)}`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      maxFresh: env.schedule === 'study' ? Math.max(1, members.length) * perMemberCap : undefined
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey);
      const roles = rolesOfStep(track, step, evidence, env);
      const main = roles[searchKey(track, step)]!;
      const finalists = step === 'd1' ? finalistsFrom(main, evidence) : [];
      const primary = step === 'd1' ? null : main.roles['actual-profit'];
      const record = {
        stage: 'qualify',
        cutoff: cutKey,
        track,
        step,
        door: cut.door,
        schedule: env.schedule,
        primary, // the track's primary at this cutoff (joint / step g); null for step d1 or without a qualified member
        finalists, // step d1: the frozen D1 finalists of step g
        roles,
        nearMisses: nearMissesOf(evidence),
        summary: evidence.map(summary),
        evidence,
        compute: lab.compute,
        codeDigest: lab.digest,
        search: sha256File(searchFile(env, cutKey, track, step)),
        finished: new Date().toISOString()
      };

      seal(env, file, record, `qualify ${cutKey} ${searchKey(track, step)}`);
      log(
        `qualify ${cutKey} ${searchKey(track, step)}: ${main.qualified}/${main.members} qualified; ${
          step === 'd1'
            ? `finalists ${finalists.map((f) => f.label).join(' | ') || 'none'}`
            : `primary ${primary ?? 'none'}`
        }`
      );
      return record;
    }
  );
};

// ----- C24: the controls and the final selection -----

export const runQualifyControls = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = controlsFile(env, cutKey);

  if (!finalCutoff(cutKey)) throw new Error('the controls are qualified at the final cutoff only');
  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const members = controlMembers();
  const job = `${env.prefix}qualify-${cutKey}-controls`;

  return withLab(
    {
      job,
      door: cut.door,
      purpose: `${env.prefix}qualify ${cutKey} controls`,
      workers: env.workers,
      ...(env.schedule === 'pilot' ? { memoryLog: path.join(cacheRoot, 'pilot', 'memory', `${job}.jsonl`) } : {}),
      maxFresh: env.schedule === 'study' ? members.length * perMemberCap : undefined
    },
    async (lab) => {
      const evidence = await qualifyMembers(lab, members, cutKey);
      const record = {
        stage: 'qualify controls',
        cutoff: cutKey,
        door: cut.door,
        schedule: env.schedule,
        roles: {
          controls: rolesOf(
            'the selectable controls (New L0 × 8 toggle combinations, C4, C4-refined, C85)',
            evidence.filter((e) => e.selectable)
          ),
          fixed: rolesOf(
            'New L0 under the 8 toggle combinations (the fixed-parameter set)',
            evidence.filter((e) => e.control?.startsWith('NL0'))
          )
        },
        summary: evidence.map(summary),
        evidence,
        compute: lab.compute,
        codeDigest: lab.digest,
        finished: new Date().toISOString()
      };

      seal(env, file, record, `qualify ${cutKey} controls`);
      log(`qualify ${cutKey} controls: ${evidence.filter((e) => e.qualified).length}/${evidence.length} qualified`);
      return record;
    }
  );
};

interface Selection {
  primary: string | null;
  finalists?: D1Finalist[];
  roles: Record<string, Roles>;
  evidence: Evidence[];
}

export const readSelection = (env: Env, cutKey: string, track: Track, step: Step) => {
  const f = selectionFile(env, cutKey, track, step);

  if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);
  return readJson<Selection>(f);
};

// The final selection at C24 (no new evaluation: sealed evidence of one instrument).
export const runFinalSelect = async (cutKey: string, env: Env) => {
  const file = finalSelectionFile(env, cutKey);

  if (!finalCutoff(cutKey)) throw new Error('the final selection is made at the final cutoff only');
  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const per = Object.fromEntries(tracks.map((t) => [t, readSelection(env, cutKey, t, finalStepOf(t))])) as Record<
    Track,
    Selection
  >;
  const controls = readJson<{ evidence: Evidence[] }>(controlsFile(env, cutKey));
  const searched = tracks.flatMap((t) => per[t].evidence);
  const selectable = [...searched.filter((e) => e.selectable), ...controls.evidence.filter((e) => e.selectable)];
  const sets: Record<string, Roles> = {
    final: rolesOf(
      'the final selectable set: every track’s qualified C24 members + New L0 × 8, C4, C4-refined, C85',
      selectable
    ),
    searched: rolesOf('every track’s C24 members (no control)', searched),
    informed: rolesOf(
      'A1 + A2',
      searched.filter((e) => e.track === 'A1' || e.track === 'A2')
    ),
    fresh: rolesOf(
      'B1 + B2',
      searched.filter((e) => e.track === 'B1' || e.track === 'B2')
    ),
    joint: rolesOf(
      'A1 + B1',
      searched.filter((e) => e.track === 'A1' || e.track === 'B1')
    ),
    sequential: rolesOf(
      'A2 + B2',
      searched.filter((e) => e.track === 'A2' || e.track === 'B2')
    )
  };
  const all = [...searched, ...controls.evidence];
  const ref = (k: string) => controls.evidence.find((e) => e.control === k)!;
  const comparisons: { ref: string; labels: C4Labels[] }[] = ['NL0', 'C4', 'C4R'].map((k) => ({
    ref: ref(k).label,
    labels: all.map((e) => labelsVs(e, ref(k)))
  }));
  const record = {
    stage: 'final selection',
    cutoff: cutKey,
    schedule: env.schedule,
    nominee: sets.final!.roles['actual-profit'], // the study's primary (PROTOCOL.md §9.3)
    trackPrimaries: Object.fromEntries(tracks.map((t) => [t, per[t].primary])),
    roles: sets,
    comparisons,
    sources: {
      ...Object.fromEntries(tracks.map((t) => [t, sha256File(selectionFile(env, cutKey, t, finalStepOf(t)))])),
      controls: sha256File(controlsFile(env, cutKey))
    },
    finished: new Date().toISOString()
  };

  seal(env, file, record, `final selection ${cutKey}`);
  log(
    `final selection ${cutKey}: nominee ${record.nominee ?? 'none'}; track primaries ${JSON.stringify(record.trackPrimaries)}`
  );
  return record;
};

// ----- the fold evaluation: one continuous run per phenotype on the evaluation door -----

export const sliceMarks = (door: Door, cfg: Cfg, o: EvalOptions, boundary: string) => {
  const x = run(door, cfg.quad, o, cfg.sh, true, true);
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
    rec: recordOf(door, cfg.quad, x, o, cfg.sh) as SRec,
    lots: lots.filter((l) => l.open || l.fills.at(-1)!.s > b),
    openAtBoundary: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
    openAtEnd: lots.filter((l) => l.open).map((l) => l.book)
  };
};

// A fresh track's frozen fold export set (PROTOCOL.md §10): the holders of its four roles and of each replicate's
// actual-profit role (deduplicated, in role order); a sequential track's D1 finalists are recorded beside them.
export const foldExports = (track: Track, sel: Selection, env: Env) => {
  const name = searchKey(track, finalStepOf(track));
  const out: { label: string; track: Track; id: string; cfg: Cfg; roles: string[] }[] = [];
  const R = replicatesOf(env, track, finalStepOf(track));

  for (const [setName, tag] of [
    [name, ''],
    ...Array.from({ length: R }, (_v, i) => [`${name} R${i + 1}`, `R${i + 1} `] as const)
  ] as const)
    for (const [r, label] of Object.entries(sel.roles[setName]?.roles ?? {})) {
      if (!label || (tag && r !== 'actual-profit')) continue;

      const x = out.find((o) => o.label === label);

      if (x) x.roles.push(`${tag}${r}`);
      else {
        const e = sel.evidence.find((y) => y.label === label)!;

        out.push({ label, track, id: e.id, cfg: e.cfg, roles: [`${tag}${r}`] });
      }
    }

  return out;
};

export const foldTracks: Track[] = ['B1', 'B2'];

export const runFoldEval = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = evaluationFile(env, cutKey);

  if (finalCutoff(cutKey) && cutKey === 'C24') throw new Error('C24 is evaluated once by the validation stage');
  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const guards: Record<string, string> = {};
  const sels = {} as Record<Track, Selection>;

  for (const t of foldTracks) {
    for (const step of sequentialTrack(t) ? (['d1', 'g'] as const) : (['joint'] as const)) {
      const f = selectionFile(env, cutKey, t, step);

      if (!isSealed(f)) throw new Error(`the ${searchKey(t, step)} selection of ${cutKey} is not sealed (the guard)`);
      if (env.schedule === 'study') assertCommitted(f);
      guards[searchKey(t, step)] = sha256File(f);
    }
    sels[t] = readSelection(env, cutKey, t, finalStepOf(t));
  }

  const exports = foldTracks.flatMap((t) => foldExports(t, sels[t], env));
  const subjects: { label: string; track: Track | null; id: string; cfg: Cfg; options: EvalOptions; role: string }[] = [
    ...exports.map((x) => ({
      label: x.label,
      track: x.track,
      id: x.id,
      cfg: x.cfg,
      options: optionsOf(x.cfg),
      role: x.roles.join(',')
    }))
  ];

  // the controls, descriptively (chosen with later data): New L0 under each toggle combination, C4, C4-refined, D
  for (const k of [...allSh.map(nl0Key), 'C4', 'C4R', 'D']) {
    const c = controlOf(k);

    subjects.push({
      label: `control: ${k}`,
      track: null,
      id: cfgId(c.cfg),
      cfg: c.cfg,
      options: optionsOfControl(c),
      role: k === 'D' ? 'control (d1-only)' : 'control'
    });
  }

  const guardText = Object.entries(guards)
    .map(([k, v]) => `${k} ${v.slice(0, 12)}`)
    .join(', ');
  const door = await openStudyDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey} (guards ${guardText})`);

  logDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey}: guards verified`, { guards });

  const rows = subjects.map((m) => {
    const o: EvalOptions = { ...m.options, boundaries: [cut.end] };
    const x = sliceMarks(door, m.cfg, o, cut.end);

    return {
      label: m.label,
      track: m.track,
      role: m.role,
      id: m.id,
      sh: m.cfg.sh,
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
    guardSha256: guards,
    primary: Object.fromEntries(foldTracks.map((t) => [t, sels[t].primary])), // each procedure's fold primary
    exports: exports.map(({ cfg: _c, ...x }) => x),
    rows: rows.map(({ closes: _c, ...r }) => r),
    finished: new Date().toISOString()
  };

  fs.mkdirSync(path.join(cacheRoot, 'folds', env.prefix || 'study'), { recursive: true });
  fs.writeFileSync(
    path.join(cacheRoot, 'folds', env.prefix || 'study', `${cutKey}-closes.json`),
    JSON.stringify(rows.map((r) => ({ label: r.label, ...r.closes })))
  );
  seal(env, file, record, `fold evaluation ${cutKey}`);
  log(`fold evaluation ${cutKey}: ${rows.length} rows; fold primaries ${JSON.stringify(record.primary)}`);
  return record;
};

// ----- the sequential policies and their frozen verdicts (PROTOCOL.md §10): each fresh procedure (B1, B2) chains its
// fold primaries; roles, replicates and the fixed controls are descriptive rows -----

const dateOf = (t: number) =>
  Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : '—';

export const runSequential = async (env: Env, folds = ['C19', 'C21', 'C23']) => {
  const file = path.join(env.outDir, 'folds', 'sequential.json');

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  type Row = {
    label: string;
    track: Track | null;
    role: string;
    id: string;
    sliceNet: number;
    sliceDd: number;
    openAtBoundary: string[];
    openAtEnd: string[];
  };
  const evals = folds.map((c) => {
    if (!isSealed(evaluationFile(env, c))) throw new Error(`the fold evaluation of ${c} is not sealed`);
    return readJson<{ rows: Row[]; primary: Partial<Record<Track, string | null>>; slice: [string, string] }>(
      evaluationFile(env, c)
    );
  });
  const closes = folds.map((c) =>
    readJson<{ label: string; t: number[]; v: number[] }[]>(
      path.join(cacheRoot, 'folds', env.prefix || 'study', `${c}-closes.json`)
    )
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
  const verdictOf = (p: ReturnType<typeof policy>) =>
    p.parts.some((x) => x.label === null)
      ? `chronologically incomplete: ${p.parts
          .filter((x) => x.label === null)
          .map((x) => x.fold)
          .join(', ')} had no qualified combined candidate (flat fallback)`
      : p.net > 0 && p.withinCeiling
        ? 'chronologically supported (every fold produced a primary; sequential net > 0 and sequential minute drawdown ≤ $35,000)'
        : 'chronologically unsupported (sequential net ≤ 0 or sequential minute drawdown > $35,000)';
  const procedureOf = (track: Track) => {
    const roleLabel = (i: number, role: string) =>
      evals[i]!.rows.find((r) => r.track === track && r.role.split(',').includes(role))?.label ?? null;
    const procedure = policy(
      `${track}: the procedure (each fold primary; flat without one)`,
      (i) => evals[i]!.primary[track] ?? null
    );
    const policies = [procedure];

    for (const role of ['robust-profit', 'balanced', 'lower-drawdown'])
      policies.push(policy(`${track}: role ${role}`, (i) => roleLabel(i, role)));
    for (let r = 1; r <= replicatesOf(env, track, finalStepOf(track)); r++)
      policies.push(
        policy(`${track}: replicate R${r} alone (seed-level actual-profit; reporting only)`, (i) =>
          roleLabel(i, `R${r} actual-profit`)
        )
      );

    return { track, verdict: verdictOf(procedure), procedure, policies };
  };
  const procedures = foldTracks.map(procedureOf);
  const fixed = [...allSh.map(nl0Key), 'C4', 'C4R', 'D'].map((k) =>
    policy(`fixed control: ${k} (descriptive: chosen with later data)`, () => `control: ${k}`)
  );
  const record = {
    stage: 'sequential',
    folds: folds.map((c, i) => ({ fold: c, slice: evals[i]!.slice, primary: evals[i]!.primary })),
    verdicts: Object.fromEntries(procedures.map((p) => [p.track, p.verdict])),
    switchCharge: `${economics.costBps} bps on $${economics.budget} per open lot closed or adopted at a boundary`,
    procedures,
    fixed,
    scope:
      'each fresh procedure (B1 joint, B2 sequential) is a frozen chronological test (its verdict); roles, replicates and the fixed controls are descriptive; the informed tracks (A1, A2) and the controls inherit later-selected settings and have no chronological test'
  };

  seal(env, file, record, 'sequential');
  for (const p of procedures)
    log(`sequential ${p.track}: ${p.verdict}; ${usd(p.procedure.net)}, DD ${usd(p.procedure.sequentialDd)}`);
  return record;
};

export { simulationCaps };
