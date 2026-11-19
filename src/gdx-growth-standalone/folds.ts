// The fold evaluations and the sequential policies of the INDEPENDENT procedure (PROTOCOL.md §10; standard §1.8–§1.10).
// Each fold's selection is sealed and committed before its slice opens; every member runs one continuous run from
// 2016-01-04 on the evaluation door (nothing reset or liquidated at the boundary: positions, orders, indicators,
// eligibility and continuation state carry across it). Slice P&L = the marked net at the slice end − the marked net at
// the boundary close.
//
// The sequential policy (frozen; Priorities 3, 3B and 3C's verified method): the fold primaries trade their slices in
// turn; each slice contributes its member's own continuous marks after the boundary close (so a position carried into a
// slice is the incoming configuration's real exposure, never a reset); a switch between DIFFERENT configurations at a
// boundary is charged 5 bps on $100,000 per open lot the outgoing configuration closes and per open lot the incoming
// configuration adopts. The sequential drawdown is the strict minute tracker over the concatenated marks (charges
// included), with its peak, trough and recovery times and the positions open between peak and trough.
// The verdict (frozen): SUPPORTED iff every fold produced a primary, the sequential net > 0 and the sequential minute DD
// ≤ $35,000. Appendix A (browser-chosen with later data) and cash are descriptive comparators only.
import fs from 'node:fs';
import path from 'node:path';
import { sequentialDrawdown } from '../vg-d1-growth-joint/post.ts';
import { type EvalOptions, type Rec, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { cacheRoot, economics, log, r2, repoRoot } from './context.ts';
import { openStudyDoor } from './doors.ts';
import type { Evidence, Roles } from './qualify.ts';
import { isSealed, logDoor, readJson, sha256File, usd } from './records.ts';
import { type Env, assertCommitted, cutoffs, evaluationFile, seal, selectionFile, studyGuards } from './stages.ts';
import { optionsOfEnabled } from './space.ts';

const iso = (t: number) =>
  Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : null;

export const sliceMarks = (door: Door, quad: Evidence['quad'], o: EvalOptions, boundary: string) => {
  const x = run(door, quad, o, true, true);
  const b = door.dates.indexOf(boundary);

  if (b < 0) throw new Error(`${boundary} is not a session of ${door.name}`);

  const equity = x.result.daily[b]!;
  const after = door.sym.GDX.ds.sCloseTime[b]!;
  const m = x.result.markChanges!;
  const t: number[] = [];
  const v: number[] = [];

  for (let i = 0; i < m.t.length; i++)
    if (m.t[i]! > after) {
      t.push(m.t[i]!);
      v.push(m.v[i]! - equity);
    }

  const lots = x.result.lots;
  const lotRows = lots
    .filter((l) => l.open || l.fills.at(-1)!.s > b)
    .map((l) => ({
      id: l.id,
      entry: door.dates[l.entryS]!,
      entryT: l.entryT,
      exit: l.open ? null : door.dates[l.fills.at(-1)!.s]!,
      exitT: l.open ? null : l.fills.at(-1)!.t,
      partials: l.fills.filter((f) => f.partial).length,
      net: r2(l.net),
      carriedIn: l.entryS <= b
    }));

  return {
    t,
    v,
    rec: recordOf(door, quad, x, o) as Rec,
    openAtBoundary: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
    openAtEnd: lots.filter((l) => l.open).map((l) => l.book),
    lots: lotRows,
    boundaryT: after
  };
};

interface Selection {
  primary: string | null;
  independentPrimary: string | null;
  roles: Record<string, Roles>;
  evidence: Evidence[];
}

// The fold's frozen members: the holders of the independent lane's four roles, Appendix A (descriptive) and cash.
export const foldMembers = (sel: Selection) => {
  const out: { label: string; ev: Evidence; roles: string[] }[] = [];
  const add = (label: string, role: string) => {
    const x = out.find((o) => o.label === label);

    if (x) x.roles.push(role);
    else out.push({ label, ev: sel.evidence.find((e) => e.label === label)!, roles: [role] });
  };

  for (const [r, label] of Object.entries(sel.roles.independent!.roles)) if (label) add(label, r);
  for (const e of sel.evidence.filter((x) => x.kind === 'control' || x.kind === 'reference'))
    add(
      e.label,
      e.kind === 'reference' ? 'cash' : e.control === 'A' ? 'Appendix A (descriptive)' : 'control (descriptive)'
    );
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

  const sel = readJson<Selection>(selFile);
  const guardSha = sha256File(selFile);
  const door = await openStudyDoor(
    cut.evalDoor,
    `${env.prefix}fold evaluation ${cutKey} (guard ${guardSha.slice(0, 12)})`
  );

  logDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey}: guard verified`, { guard: guardSha });

  const rows = foldMembers(sel).map((m) => {
    const o: EvalOptions = { ...optionsOfEnabled(m.ev.enabled as never), boundaries: [cut.end] };
    const x = sliceMarks(door, m.ev.quad, o, cut.end);

    return {
      label: m.label,
      roles: m.roles.join(','),
      id: m.ev.id,
      gdx: m.ev.gdxId,
      trainingNet: m.ev.centre.net,
      trainingDd: m.ev.centre.dd,
      sliceNet: x.rec.periods[0]!.after,
      sliceDd: x.rec.periods[0]!.dd,
      boundaryEquity: x.rec.periods[0]!.equity,
      wholeNet: x.rec.net,
      wholeDd: x.rec.dd,
      wholeDdPeak: iso(x.rec.ddPeakT),
      wholeDdTrough: iso(x.rec.ddTroughT),
      wholeDdRecovery: iso(x.rec.ddRecoveryT),
      sliceLots: x.lots,
      openAtBoundary: x.openAtBoundary,
      openAtEnd: x.openAtEnd,
      record: x.rec,
      closes: { t: x.t, v: x.v }
    };
  });
  const record = {
    stage: 'fold evaluation (independent procedure)',
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
  log(`fold evaluation ${cutKey}: ${rows.length} rows; primary ${sel.primary}`);
  return record;
};

export const runSequential = async (env: Env, folds = ['C19', 'C21', 'C23']) => {
  const file = path.join(env.outDir, 'folds', 'sequential.json');

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  type Lot = {
    entry: string;
    entryT: number;
    exit: string | null;
    exitT: number | null;
    net: number;
    carriedIn: boolean;
  };
  type Row = {
    label: string;
    roles: string;
    id: string;
    sliceNet: number;
    sliceDd: number;
    openAtBoundary: string[];
    openAtEnd: string[];
    sliceLots: Lot[];
  };
  const evals = folds.map((c) => {
    if (!isSealed(evaluationFile(env, c))) throw new Error(`the fold evaluation of ${c} is not sealed`);
    return readJson<{ rows: Row[]; primary: string | null; slice: [string, string] }>(evaluationFile(env, c));
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
    const rowsUsed: (Row | undefined)[] = [];

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
      rowsUsed.push(row);
      prev = row ? { id: row.id, openAtEnd: row.openAtEnd.length } : null;
    });

    const dd = sequentialDrawdown(slices, 0);
    const responsible = rowsUsed.flatMap((row, i) =>
      (row?.sliceLots ?? [])
        .filter((l) => l.entryT <= dd.troughTime && (l.exitT === null || l.exitT >= dd.peakTime))
        .map((l) => ({ fold: folds[i], member: row!.label, ...l }))
    );

    return {
      name,
      parts,
      netBeforeCharges: r2(parts.reduce((a, p) => a + p.sliceNet, 0)),
      charges: r2(charges),
      net: r2(parts.reduce((a, p) => a + p.sliceNet, 0) - charges),
      sequentialDd: r2(dd.maximum),
      ddPeak: iso(dd.peakTime),
      ddTrough: iso(dd.troughTime),
      ddRecovery: iso(dd.recoveryTime),
      recovered: Number.isFinite(dd.recoveryTime),
      positionsResponsible: dd.maximum > 0 ? responsible : [],
      withinCeiling: dd.maximum <= economics.ceiling
    };
  };
  const roleHolder = (i: number, role: string) =>
    evals[i]!.rows.find((r) => r.roles.split(',').includes(role))?.label ?? null;
  const appA = evals[0]!.rows.find((r) => r.roles.includes('Appendix A'))?.label ?? null;
  const policies = [
    policy(
      'independent procedure (each fold primary = the independent actual-profit holder)',
      (i) => evals[i]!.primary
    ),
    ...['robust-profit', 'balanced', 'lower-drawdown'].map((role) =>
      policy(`independent role ${role}`, (i) => roleHolder(i, role))
    ),
    policy('Appendix A fixed in every slice (descriptive: chosen with later data)', () => appA),
    policy('cash in every slice (reference)', () => null)
  ];
  const proc = policies[0]!;
  const verdict = proc.parts.some((p) => p.label === null)
    ? 'unsupported: a fold produced no primary (no qualified independent member)'
    : proc.net > 0 && proc.withinCeiling
      ? 'SUPPORTED by the frozen rule (every fold produced a primary; sequential net > 0; sequential minute DD ≤ $35,000)'
      : `UNSUPPORTED by the frozen rule (${proc.net > 0 ? '' : 'sequential net ≤ 0'}${proc.net > 0 || proc.withinCeiling ? '' : '; '}${proc.withinCeiling ? '' : `sequential minute DD ${usd(proc.sequentialDd)} > $35,000`})`;
  const record = {
    stage: 'sequential (independent procedure)',
    folds: folds.map((c, i) => ({ fold: c, slice: evals[i]!.slice, primary: evals[i]!.primary })),
    switchCharge: `${economics.costBps} bps on $${economics.budget} per open lot closed or adopted at a boundary`,
    policies,
    verdict,
    versusAppendixA: `the procedure's sequential net ${usd(proc.net)} against Appendix A fixed ${usd(policies.at(-2)!.net)} (descriptive)`,
    scope:
      'chronological evidence of the INDEPENDENT procedure only (standard §1.9): its seeds, ranges and promotions use no configuration selected with data after the cutoff; Appendix A is shown descriptively'
  };

  seal(env, file, record, 'sequential');
  log(`sequential: ${verdict}; net ${usd(proc.net)}, DD ${usd(proc.sequentialDd)}`);
  return record;
};
