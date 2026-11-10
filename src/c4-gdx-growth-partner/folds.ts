// The fold evaluations and the sequential policies of the fixed-anchor repeats (PROTOCOL.md §10). DESCRIPTIVE: every
// anchor was chosen with later data in view, so no fixed-anchor repeat is chronological evidence of an independent
// procedure (standard §1.9; brief "Funding, dates and economics"). Each fold's selection is sealed and committed before
// its slice opens; every member runs one continuous run on the evaluation door (nothing reset at the boundary).
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
import { type Arm, arms, optionsOfEnabled } from './space.ts';

export const sliceMarks = (door: Door, quad: Evidence['quad'], o: EvalOptions, boundary: string) => {
  const x = run(door, quad, o, true, true);
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
    rec: recordOf(door, quad, x, o) as Rec,
    openAtBoundary: lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b)).map((l) => l.book),
    openAtEnd: lots.filter((l) => l.open).map((l) => l.book)
  };
};

interface Selection {
  primaries: Record<Arm, string | null>;
  roles: Record<string, Roles>;
  evidence: Evidence[];
}

// The fold's frozen members per arm: the baseline, the holders of the arm's four roles and the arm's Appendix A control.
export const foldMembers = (sel: Selection) => {
  const out: { label: string; arm: Arm; ev: Evidence; roles: string[] }[] = [];

  for (const arm of arms) {
    const add = (label: string, role: string) => {
      const x = out.find((o) => o.label === label && o.arm === arm);

      if (x) x.roles.push(role);
      else out.push({ label, arm, ev: sel.evidence.find((e) => e.label === label && e.arm === arm)!, roles: [role] });
    };

    for (const [r, label] of Object.entries(sel.roles[arm]!.roles)) if (label) add(label, r);
    for (const e of sel.evidence.filter((x) => x.arm === arm && (x.kind === 'baseline' || x.kind === 'control')))
      add(e.label, e.kind === 'baseline' ? 'baseline' : 'control');
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

  const sel = readJson<Selection>(selFile);
  const guardSha = sha256File(selFile);
  const door = await openStudyDoor(
    cut.evalDoor,
    `${env.prefix}fold evaluation ${cutKey} (guard ${guardSha.slice(0, 12)})`
  );

  logDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey}: guard verified`, { guard: guardSha });

  const rows = foldMembers(sel).map((m) => {
    const o: EvalOptions = { ...optionsOfEnabled(m.ev.enabled), boundaries: [cut.end] };
    const x = sliceMarks(door, m.ev.quad, o, cut.end);

    return {
      label: m.label,
      arm: m.arm,
      roles: m.roles.join(','),
      id: m.ev.id,
      gdx: m.ev.gdxId,
      sliceNet: x.rec.periods[0]!.after,
      sliceDd: x.rec.periods[0]!.dd,
      boundaryEquity: x.rec.periods[0]!.equity,
      wholeNet: x.rec.net,
      wholeDd: x.rec.dd,
      gdxLotsInSlice: x.rec.books['G:GDX'].lots,
      openAtBoundary: x.openAtBoundary,
      openAtEnd: x.openAtEnd,
      record: x.rec,
      closes: { t: x.t, v: x.v }
    };
  });
  const record = {
    stage: 'fold evaluation (descriptive fixed-anchor repeat)',
    cutoff: cutKey,
    door: cut.evalDoor,
    slice: cut.slice,
    boundary: cut.end,
    guardSha256: guardSha,
    primaries: sel.primaries,
    rows: rows.map(({ closes: _c, ...r }) => r),
    finished: new Date().toISOString()
  };

  fs.mkdirSync(path.join(cacheRoot, 'folds', env.prefix || 'study'), { recursive: true });
  fs.writeFileSync(
    path.join(cacheRoot, 'folds', env.prefix || 'study', `${cutKey}-closes.json`),
    JSON.stringify(rows.map((r) => ({ label: r.label, arm: r.arm, ...r.closes })))
  );
  seal(env, file, record, `fold evaluation ${cutKey}`);
  log(`fold evaluation ${cutKey}: ${rows.length} rows; primaries ${JSON.stringify(sel.primaries)}`);
  return record;
};

const dateOf = (t: number) =>
  Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : '—';

export const runSequential = async (env: Env, folds = ['C19', 'C21', 'C23']) => {
  const file = path.join(env.outDir, 'folds', 'sequential.json');

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  type Row = {
    label: string;
    arm: Arm;
    roles: string;
    id: string;
    sliceNet: number;
    sliceDd: number;
    openAtBoundary: string[];
    openAtEnd: string[];
  };
  const evals = folds.map((c) => {
    if (!isSealed(evaluationFile(env, c))) throw new Error(`the fold evaluation of ${c} is not sealed`);
    return readJson<{ rows: Row[]; primaries: Record<Arm, string | null>; slice: [string, string] }>(
      evaluationFile(env, c)
    );
  });
  const closes = folds.map((c) =>
    readJson<{ label: string; arm: Arm; t: number[]; v: number[] }[]>(
      path.join(cacheRoot, 'folds', env.prefix || 'study', `${c}-closes.json`)
    )
  );
  const charge = (economics.costBps / 10000) * economics.budget; // 5 bps of $100,000 per lot closed or adopted
  const policy = (arm: Arm, name: string, pick: (i: number) => string | null) => {
    const slices: { t: number[]; v: number[]; charge: number }[] = [];
    const parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number; charge: number }[] = [];
    let prev: { id: string; openAtEnd: number } | null = null;
    let charges = 0;

    folds.forEach((c, i) => {
      const label = pick(i);
      const row = label ? evals[i]!.rows.find((r) => r.label === label && r.arm === arm) : undefined;
      const m = label ? closes[i]!.find((x) => x.label === label && x.arm === arm) : undefined;
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
      arm,
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
  const perArm = Object.fromEntries(
    arms.map((arm) => {
      const baseLabel = evals[0]!.rows.find((r) => r.arm === arm && r.roles.split(',').includes('baseline'))!.label;
      const policies = [
        policy(arm, 'fixed-anchor procedure (each fold primary of the arm)', (i) => evals[i]!.primaries[arm]),
        policy(arm, 'baseline (GDX OFF) in every slice', () => baseLabel)
      ];

      for (const role of ['robust-profit', 'balanced', 'lower-drawdown'])
        policies.push(
          policy(
            arm,
            `role ${role}`,
            (i) => evals[i]!.rows.find((r) => r.arm === arm && r.roles.split(',').includes(role))?.label ?? null
          )
        );

      const ctl = evals[0]!.rows.find((r) => r.arm === arm && r.roles.split(',').includes('control'));

      if (ctl) policies.push(policy(arm, `fixed ${ctl.label} in every slice`, () => ctl.label));

      const proc = policies[0]!;
      const base = policies[1]!;
      const standard = proc.parts.some((p) => p.label === null)
        ? 'incomplete (a fold had no qualified member)'
        : proc.net > 0 && proc.withinCeiling
          ? 'supported by the standard rule (every fold produced a primary; sequential net > 0; sequential minute DD ≤ $35,000)'
          : 'unsupported by the standard rule';
      const incremental =
        proc.net > base.net && proc.withinCeiling
          ? `the fold primaries earned ${usd(r2(proc.net - base.net))} more than the baseline over the slices`
          : `the fold primaries did not beat the baseline over the slices (Δ ${usd(r2(proc.net - base.net))}${proc.withinCeiling ? '' : '; sequential DD above $35,000'})`;

      return [
        arm,
        {
          primaries: folds.map((c, i) => ({
            fold: c,
            primary: evals[i]!.primaries[arm],
            isBaseline: evals[i]!.primaries[arm] === baseLabel
          })),
          policies,
          verdict: { standard: `descriptive — ${standard}`, incremental: `descriptive — ${incremental}` }
        }
      ];
    })
  );
  const record = {
    stage: 'sequential (descriptive fixed-anchor repeats)',
    folds: folds.map((c, i) => ({ fold: c, slice: evals[i]!.slice, primaries: evals[i]!.primaries })),
    switchCharge: `${economics.costBps} bps on $${economics.budget} per open lot closed or adopted at a boundary`,
    arms: perArm,
    scope:
      'descriptive only: the anchors (VG #2, VGT Growth #4, C4-refined) were chosen with later data in view; a fixed-anchor repeat cannot erase that provenance and is never chronological evidence of an independent procedure (standard §1.9)'
  };

  seal(env, file, record, 'sequential');
  log(`sequential: ${JSON.stringify(Object.fromEntries(arms.map((a) => [a, perArm[a]!.verdict.incremental])))}`);
  return record;
};
