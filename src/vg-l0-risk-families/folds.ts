// The chronological procedure test (PROTOCOL.md §11): for C19, C21 and C23 — after the cutoff's selection is sealed AND
// COMMITTED — the fold evaluation opens the next door and replays each fold row as ONE continuous run from 2016-01-04 with
// the cutoff close as the period boundary (state, open lots and marks preserved); then the sequential path of each
// (population × selector) procedure chains its fold primaries over 2020–2021, 2022–2023 and 2024 (5 bps of $100,000 per
// open lot closed or adopted at a switch) and takes its frozen verdict. Report-only beside it (standard §5.9, labelled
// next slice): the carried lot's give-back, the next slice's per-lot excursions, and each fold primary's training
// selection neighbourhood (2 × 128, regenerated exactly) replayed on the next slice.
import fs from 'node:fs';
import path from 'node:path';
import { recordOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { sequentialDrawdown } from '../vg-d1-growth-joint/post.ts';
import { runWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import { wilson } from '../vg-d1-growth-diagnostic/risk.ts';
import { cacheRoot, economics, log, r2, repoRoot } from './context.ts';
import { simulationCaps } from './budgets.ts';
import { openStudyDoor } from './doors.ts';
import type { SRec } from './evaluate.ts';
import { withLab } from './lab.ts';
import { vOptions } from './nl0.ts';
import { type Evidence, drawsOf, famOf, fidelity } from './qualify.ts';
import { isSealed, logDoor, readJson, sha256File } from './records.ts';
import { type Cfg, quadOf } from './space.ts';
import type { PopulationName, SelectorName } from './select.ts';
import {
  type Env,
  assertCommitted,
  cutoffs,
  evaluationFile,
  foldCutoffs,
  populationNames,
  seal,
  selectionFile,
  selectorNames,
  studyGuards
} from './stages.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { quantile } from './fitness.ts';

const isoDate = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString().slice(0, 10) : null);

interface Selection {
  primaries: Record<PopulationName, Record<SelectorName, string | null>>;
  roles: Record<PopulationName, { roles: Record<string, string | null> }>;
  subjects: Record<string, Evidence>;
  control: Evidence | null;
}

// One continuous run with the cutoff as the boundary: the slice's marks (relative to the boundary equity), the slice
// net and reset DD, and the §5.9 next-slice items.
export const foldRun = (door: Door, cfg: Cfg, boundary: string) => {
  const o: EvalOptions = { ...vOptions, boundaries: [boundary] };
  const x = runWithControls2(door, quadOf(cfg), cfg.controls, o, true, true);
  const rec = recordOf(door, quadOf(cfg), x, o);
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
  const exitS = (l: (typeof lots)[number]) => (l.open ? Infinity : l.fills.at(-1)!.s);
  const carried = lots.find((l) => l.entryS <= b && exitS(l) > b) ?? null;
  let giveBack: Record<string, unknown> | null = null;

  if (carried) {
    // the portfolio's mark moves only with the carried lot until its exit (one funded slot): its mark path after the
    // cutoff = the portfolio mark − the realized net at the cutoff
    const realizedAtCutoff = lots.filter((l) => exitS(l) <= b).reduce((a, l) => a + l.net, 0);
    const end = carried.open ? Infinity : carried.fills.at(-1)!.t;
    let hi = { v: -Infinity, t: NaN };
    let lo = { v: Infinity, t: NaN };

    for (let i = 0; i < m.t.length; i++)
      if (m.t[i]! > after && m.t[i]! < end) {
        const lv = m.v[i]! - realizedAtCutoff;

        if (lv > hi.v) hi = { v: lv, t: m.t[i]! };
        if (lv < lo.v) lo = { v: lv, t: m.t[i]! };
      }

    const markAtCutoff = equity - realizedAtCutoff;
    const ds = door.sym[carried.symbol].ds;

    giveBack = {
      book: carried.book,
      entry: door.dates[carried.entryS],
      entryRaw: carried.entryRaw,
      markAtCutoff: r2(markAtCutoff),
      multipleAtCutoff: r2((carried.shares0 * ds.sClose[b]!) / carried.principal0),
      highestLater: Number.isFinite(hi.v) ? { mark: r2(hi.v), date: isoDate(hi.t) } : null,
      lowestLater: Number.isFinite(lo.v) ? { mark: r2(lo.v), date: isoDate(lo.t) } : null,
      exit: carried.open ? null : { date: door.dates[carried.fills.at(-1)!.s], reason: carried.fills.at(-1)!.reason, raw: carried.fills.at(-1)!.raw },
      final: r2(carried.net),
      changeFromCutoff: r2(carried.net - markAtCutoff)
    };
  }

  const nextLots = lots.filter((l) => l.entryS > b);
  const maes = nextLots.map((l) => Math.min(l.worst, l.net)).sort((p, q) => p - q);
  const closedNext = nextLots.filter((l) => !l.open);
  const losing = closedNext.filter((l) => l.net < 0);

  return {
    t,
    v,
    rec: rec as SRec,
    sliceNet: rec.periods[0]!.after,
    sliceDd: rec.periods[0]!.dd,
    boundaryEquity: rec.periods[0]!.equity,
    openAtBoundary: lots.filter((l) => l.entryS <= b && exitS(l) > b).map((l) => l.book),
    openAtEnd: lots.filter((l) => l.open).map((l) => l.book),
    giveBack,
    nextSlice: {
      lots: nextLots.length,
      byBook: Object.fromEntries(['D1:GDX', 'D1:VGT', 'G:VGT'].map((bk) => [bk, nextLots.filter((l) => l.book === bk).length])),
      maeMedian: maes.length ? r2(quantile(maes, 0.5)) : null,
      maeP90: maes.length ? r2(quantile(maes, 0.1)) : null,
      maeWorst: maes.length ? r2(maes[0]!) : null,
      worstRealized: closedNext.length ? r2(Math.min(...closedNext.map((l) => l.net))) : null,
      meanLosing: losing.length ? r2(losing.reduce((a, l) => a + l.net, 0) / losing.length) : null,
      losing: losing.length,
      exitReasons: closedNext.reduce<Record<string, number>>((a, l) => {
        const r = l.fills.at(-1)!.reason;

        a[r] = (a[r] ?? 0) + 1;
        return a;
      }, {})
    }
  };
};

const closesFile = (env: Env, cut: string) => path.join(cacheRoot, 'folds', env.prefix || 'study', `${cut}-closes.json`);

export const runFoldEval = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = evaluationFile(env, cutKey);

  if (cutKey === 'C24') throw new Error('C24 is evaluated once by the validation stage');
  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const selFile = selectionFile(env, cutKey);

  if (!isSealed(selFile)) throw new Error(`the ${cutKey} selection is not sealed (the guard)`);
  if (env.schedule === 'study') assertCommitted(selFile);

  const guard = sha256File(selFile);
  const sel = readJson<Selection>(selFile);
  const subjects = new Map<string, { label: string; cfg: Cfg; roles: string[] }>();
  const addSubject = (label: string | null, role: string, cfg?: Cfg) => {
    if (!label) return;

    const e = subjects.get(label);

    if (e) e.roles.push(role);
    else subjects.set(label, { label, cfg: cfg ?? sel.subjects[label]!.cfg, roles: [role] });
  };

  for (const p of populationNames) {
    for (const s of selectorNames) addSubject(sel.primaries[p][s], `primary ${p}/${s}`);
    for (const [r, l] of Object.entries(sel.roles[p].roles)) addSubject(l, `role ${p}/${r}`);
  }
  if (sel.control) addSubject(sel.control.label, 'control (descriptive: chosen with later data)', sel.control.cfg);

  const door = await openStudyDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey} (selection ${guard.slice(0, 12)})`);

  logDoor(cut.evalDoor, `${env.prefix}fold evaluation ${cutKey}: selection guard verified`, { guard });

  const rows = [...subjects.values()].map((s) => {
    const x = foldRun(door, s.cfg, cut.end);

    return {
      label: s.label,
      roles: s.roles,
      cell: s.cfg.cell,
      id: x.rec.id,
      cfg: s.cfg,
      sliceNet: x.sliceNet,
      sliceDd: x.sliceDd,
      boundaryEquity: x.boundaryEquity,
      wholeNet: x.rec.net,
      wholeDd: x.rec.dd,
      openAtBoundary: x.openAtBoundary,
      openAtEnd: x.openAtEnd,
      giveBack: x.giveBack,
      nextSlice: x.nextSlice,
      years: x.rec.years,
      closes: { t: x.t, v: x.v }
    };
  });

  // §5.9 (report-only): each distinct fold primary's training selection neighbourhood replayed on the next slice
  const primaries = [...new Set(populationNames.flatMap((p) => selectorNames.map((s) => sel.primaries[p][s])).filter((l): l is string => Boolean(l)))];
  const neighbourhoods = await withLab(
    {
      job: `${env.prefix}fold-${cutKey}-neighbourhoods`,
      door: cut.evalDoor,
      purpose: `${env.prefix}fold ${cutKey}: training neighbourhoods on the next slice (report-only)`,
      workers: env.workers,
      maxFresh: env.schedule === 'study' ? simulationCaps.fold : undefined
    },
    async (lab) => {
      const out: Record<string, unknown> = {};

      for (const label of primaries) {
        const cfg = sel.subjects[label]!.cfg;
        const draws = [1, 2].flatMap((rep) => drawsOf(cfg, famOf('select', ['select', rep, cutKey], 'joint', 1, fidelity.n)));
        const seen = new Set<string>();
        const unique = draws.filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
        const recs = await lab.evalMany(
          unique.map((d) => ({ cfg: d.cfg, options: { ...vOptions, boundaries: [cut.end] } })),
          'next-slice neighbourhood'
        );
        const dds = recs.map((r) => r.periods[0]!.dd).sort((a, b) => a - b);
        const k = dds.filter((d) => d > economics.ceiling).length;

        out[label] = {
          draws: unique.length,
          breaches: k,
          breachShare: r2(k / Math.max(1, unique.length)),
          wilson95: wilson(k, unique.length).map((x) => r2(x)),
          medianSliceDd: r2(quantile(dds, 0.5)),
          worstSliceDd: r2(dds.at(-1) ?? 0),
          trainingBreachShare: sel.subjects[label]!.selectTail.breachShare
        };
      }
      return { rows: out, compute: lab.compute };
    }
  );
  const record = {
    stage: 'fold evaluation',
    cutoff: cutKey,
    door: cut.evalDoor,
    slice: cut.slice,
    boundary: cut.end,
    selectionGuard: guard,
    primaries: sel.primaries,
    rows: rows.map(({ closes: _c, ...r }) => r),
    nextSliceNeighbourhoods: neighbourhoods,
    finished: new Date().toISOString()
  };

  fs.mkdirSync(path.dirname(closesFile(env, cutKey)), { recursive: true });
  fs.writeFileSync(closesFile(env, cutKey), JSON.stringify(rows.map((r) => ({ label: r.label, ...r.closes }))));
  seal(env, file, record, `fold evaluation ${cutKey}`);
  log(`fold evaluation ${cutKey}: ${rows.length} rows; primaries ${JSON.stringify(sel.primaries)}`);
  return record;
};

// ----- the sequential paths and their frozen verdicts -----

const stamp = (t: number) => (Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : '—');

export const sequentialFile = (env: Env) => path.join(env.outDir, 'folds', 'sequential.json');

export const runSequential = async (env: Env, folds: readonly string[] = foldCutoffs) => {
  const file = sequentialFile(env);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  type Row = { label: string; id: string; roles: string[]; sliceNet: number; sliceDd: number; openAtBoundary: string[]; openAtEnd: string[] };
  const evals = folds.map((c) => {
    if (!isSealed(evaluationFile(env, c))) throw new Error(`the fold evaluation of ${c} is not sealed`);
    return readJson<{ rows: Row[]; primaries: Record<PopulationName, Record<SelectorName, string | null>>; slice: [string, string] }>(evaluationFile(env, c));
  });
  const closes = folds.map((c) => readJson<{ label: string; t: number[]; v: number[] }[]>(closesFile(env, c)));
  const charge = (economics.costBps / 10000) * economics.budget;
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
      ddPeak: stamp(dd.peakTime),
      ddTrough: stamp(dd.troughTime),
      withinCeiling: dd.maximum <= economics.ceiling
    };
  };
  const verdictOf = (p: ReturnType<typeof policy>) =>
    p.parts.some((x) => x.label === null)
      ? `chronologically incomplete: ${p.parts
          .filter((x) => x.label === null)
          .map((x) => x.fold)
          .join(', ')} had no qualified candidate (flat)`
      : p.net > 0 && p.withinCeiling
        ? 'supported (every fold produced a primary; sequential net > 0 and sequential minute drawdown ≤ $35,000)'
        : 'unsupported (sequential net ≤ 0 or sequential minute drawdown > $35,000)';
  const procedures = populationNames.flatMap((p) =>
    selectorNames.map((s) => {
      const path0 = policy(`${p}/${s}`, (i) => evals[i]!.primaries[p][s]);

      return { population: p, selector: s, verdict: verdictOf(path0), supported: verdictOf(path0).startsWith('supported'), path: path0 };
    })
  );
  const roleLabel = (i: number, role: string) => evals[i]!.rows.find((r) => r.roles.includes(role))?.label ?? null;
  const descriptive = [
    ...populationNames.flatMap((p) => ['robust-profit', 'balanced', 'lower-drawdown'].map((r) => policy(`${p}: role ${r} (descriptive)`, (i) => roleLabel(i, `role ${p}/${r}`)))),
    policy('New L0, fixed (descriptive: chosen with later data)', (i) => roleLabel(i, 'control (descriptive: chosen with later data)'))
  ];
  const record = {
    stage: 'sequential',
    folds: folds.map((c, i) => ({ fold: c, slice: evals[i]!.slice, primaries: evals[i]!.primaries })),
    switchCharge: `${economics.costBps} bps on $${economics.budget} per open lot closed or adopted at a switch`,
    twoByTwo: {
      'legacy mechanics × original selection': procedures.find((x) => x.population === 'L' && x.selector === 'original')!.verdict,
      'legacy mechanics × risk-aware selection (RA1)': procedures.find((x) => x.population === 'L' && x.selector === 'RA1')!.verdict,
      'all mechanics × original selection': procedures.find((x) => x.population === 'F' && x.selector === 'original')!.verdict,
      'all mechanics × risk-aware selection (RA1)': procedures.find((x) => x.population === 'F' && x.selector === 'RA1')!.verdict
    },
    procedures,
    descriptive,
    scope:
      'each population × selector procedure is a frozen chronological test of the D1 search-and-selection procedure WITH New L0’s Growth·VGT fixed (a later-selected component: PROTOCOL.md AD4); the RA2 and base-population rows are secondary; roles and New L0 are descriptive'
  };

  seal(env, file, record, 'sequential');
  for (const p of procedures) log(`sequential ${p.population}/${p.selector}: ${p.verdict}; net ${p.path.net}, DD ${p.path.sequentialDd}`);
  return record;
};
