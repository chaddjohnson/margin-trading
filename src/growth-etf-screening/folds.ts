// The fold evaluations and the sequential policies (PROTOCOL.md §10; standard §1.8–§1.10). Each cutoff's selection is
// sealed and committed before its slice opens; every member runs one continuous run from 2016-01-04 on the evaluation
// door (nothing reset or liquidated at the boundary). Slice P&L = the marked net at the slice end − the marked net at the
// boundary close; the slice (reset) DD restarts at the boundary close.
//
// FOLD MEMBERS: every ETF's qualified role holders at that cutoff (its actual-profit holder is the ETF's fold primary).
// Together they are the post-fold cohort (every development-selected, frozen member of every ETF on the slice; report).
//
// SEQUENTIAL POLICIES (frozen; 4A's verified method, with the ETF part of the configuration): the fold primaries trade
// their slices in turn; each slice contributes its member's own continuous marks after the boundary close; a switch
// between DIFFERENT configurations (ETF or vector) at a boundary is charged 5 bps on $100,000 per open lot the outgoing
// member holds at its slice end and per open lot the incoming member holds at the boundary (closing the one, adopting
// the other); no fold primary → cash for that slice (an outgoing open lot is closed and charged). The sequential DD is
// the strict minute tracker over the concatenated marks (charges included). Policies: the UNIVERSE procedure (each
// cutoff's selection primary: ETF and phenotype), the NEW-ETF procedure (controls excluded; report-only), and EVERY ETF's
// own procedure (its fold primaries: ETF-specific chronological evidence). The verdict (frozen, per policy): SUPPORTED
// iff every fold produced a primary, the sequential net > 0 and the sequential minute DD ≤ $35,000.
import fs from 'node:fs';
import path from 'node:path';
import { sequentialDrawdown } from '../vg-d1-growth-joint/post.ts';
import { type EvalOptions, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import { cutoffs, economics, foldCutoffs, log, r2, repoRoot } from './context.ts';
import { type EtfDoor, openEtfDoor } from './doors.ts';
import { addToLedger } from './ledger.ts';
import { isSealed, logDoor, readJson, sha256File, usd } from './records.ts';
import { type GConfig, build } from './space.ts';
import { type Env, assertCommitted, evaluationFile, seal, selectionFile, studyGuards, symbolsOf } from './stages.ts';
import type { PerEtf } from './stages.ts';

const iso = (t: number) =>
  Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : null;

interface Selection {
  cutoff: string;
  primary: string | null;
  primarySym: string | null;
  primaryNew: string | null;
  primaryNewSym: string | null;
  perEtf: PerEtf[];
  configs: Record<string, { sym: string; id: string; g: GConfig }>;
}

// One continuous run with marks; the slice's marks relative to the boundary equity, cut at the slice end.
export const sliceRun = (d: EtfDoor, g: GConfig, boundary: string, sliceEnd: string) => {
  const door = d.door;
  const b = build(g);
  const o: EvalOptions = { ...b.options, boundaries: [boundary] };
  const x = run(door, b.quad, o, true, true);
  const bi = door.dates.indexOf(boundary);
  const ei = door.dates.indexOf(sliceEnd);

  if (bi < 0 || ei < 0) throw new Error(`${boundary} / ${sliceEnd} not on ${d.sym}:${d.key}`);

  const ds = door.sym.GDX.ds;
  const after = ds.sCloseTime[bi]!;
  const until = ds.sCloseTime[ei]!;
  const equity = x.result.daily[bi]!;
  const m = x.result.markChanges!;
  const t: number[] = [];
  const v: number[] = [];

  for (let i = 0; i < m.t.length; i++)
    if (m.t[i]! > after && m.t[i]! <= until) {
      t.push(m.t[i]!);
      v.push(m.v[i]! - equity);
    }

  const lots = x.result.lots;
  const exitS = (l: (typeof lots)[number]) => (l.open ? Infinity : l.fills.at(-1)!.s);
  const rec = recordOf(door, b.quad, x, o);

  return {
    t,
    v,
    rec,
    sliceNet: r2(x.result.daily[ei]! - equity),
    openAtBoundary: lots.filter((l) => l.entryS <= bi && exitS(l) > bi).length,
    openAtSliceEnd: lots.filter((l) => l.entryS <= ei && exitS(l) > ei).length,
    sliceLots: lots
      .filter((l) => exitS(l) > bi && l.entryS <= ei)
      .map((l) => ({
        entry: door.dates[l.entryS]!,
        entryT: l.entryT,
        exit: exitS(l) <= ei ? door.dates[exitS(l)]! : null,
        exitT: exitS(l) <= ei ? l.fills.at(-1)!.t : null,
        net: r2(l.net),
        carriedIn: l.entryS <= bi
      }))
  };
};

export const runFoldEval = async (cutKey: string, env: Env) => {
  const cut = cutoffs[cutKey]!;
  const file = evaluationFile(env, cutKey);

  if (cutKey === 'C24') throw new Error('C24 is evaluated once by the validation stage');
  studyGuards(env);
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const selFile = selectionFile(env, cutKey);

  if (!isSealed(selFile)) throw new Error(`the ${cutKey} selection is not sealed (the evaluation door's guard)`);
  if (env.schedule === 'study') assertCommitted(selFile);

  const sel = readJson<Selection>(selFile);
  const guard = sha256File(selFile);
  const rows: Record<string, unknown>[] = [];
  let sims = 0;

  for (const pe of sel.perEtf) {
    const labels = [...new Set(Object.values(pe.roles).filter((x): x is string => x !== null))];

    if (!labels.length) continue;

    const d = await openEtfDoor(
      pe.sym,
      cut.evalDoor,
      `${env.prefix}fold evaluation ${cutKey} (guard ${guard.slice(0, 12)})`
    );

    for (const label of labels) {
      const c = sel.configs[label]!;
      const x = sliceRun(d, c.g, cut.end, cut.slice[1]);

      sims++;
      rows.push({
        sym: pe.sym,
        label,
        roles: Object.entries(pe.roles)
          .filter(([, v]) => v === label)
          .map(([k]) => k)
          .join(','),
        id: c.id,
        foldPrimary: pe.roles['actual-profit'] === label,
        universePrimary: sel.primary === label,
        newPrimary: sel.primaryNew === label,
        sliceNet: x.rec.periods[0]!.after,
        sliceDd: x.rec.periods[0]!.dd,
        boundaryEquity: x.rec.periods[0]!.equity,
        wholeNet: x.rec.net,
        wholeDd: x.rec.dd,
        wholeDdPeak: iso(x.rec.ddPeakT),
        wholeDdTrough: iso(x.rec.ddTroughT),
        sliceLots: x.sliceLots,
        openAtBoundary: x.openAtBoundary,
        openAtSliceEnd: x.openAtSliceEnd
      });
    }
  }

  logDoor(`${cut.evalDoor} (per ETF)`, `${env.prefix}fold evaluation ${cutKey}: guard verified`, { guard });
  addToLedger({
    job: `${env.prefix}fold-eval-${cutKey}`,
    door: cut.evalDoor,
    fresh: sims,
    hits: 0,
    kind: 'in-process'
  });

  const record = {
    stage: 'fold evaluation',
    cutoff: cutKey,
    door: cut.evalDoor,
    slice: cut.slice,
    boundary: cut.end,
    guardSha256: guard,
    primary: sel.primary,
    primaryNew: sel.primaryNew,
    rows,
    finished: new Date().toISOString()
  };

  seal(env, file, record, `fold evaluation ${cutKey}`);
  log(`fold evaluation ${cutKey}: ${rows.length} rows; primary ${sel.primary}`);
  return record;
};

export interface SliceRow {
  key: string; // sym|id
  sym: string;
  label: string;
  sliceNet: number;
  sliceDd: number;
  t: number[];
  v: number[];
  openAtBoundary: number;
  openAtSliceEnd: number;
  sliceLots: ReturnType<typeof sliceRun>['sliceLots'];
}

// One policy over the folds: the chosen member per fold (or null: cash).
export const policyOf = (name: string, folds: readonly string[], picks: (SliceRow | null)[]) => {
  const charge = (economics.costBps / 10000) * economics.budget;
  const slices: { t: number[]; v: number[]; charge: number }[] = [];
  const parts: {
    fold: string;
    label: string | null;
    sym: string | null;
    sliceNet: number;
    sliceDd: number;
    charge: number;
  }[] = [];
  let prev: SliceRow | null = null;
  let charges = 0;

  picks.forEach((row, i) => {
    let ch = 0;

    if (row && prev && prev.key !== row.key) ch = charge * (prev.openAtSliceEnd + row.openAtBoundary);
    if (row && !prev && i > 0) ch = charge * row.openAtBoundary;
    if (!row && prev) ch = charge * prev.openAtSliceEnd;
    charges += ch;
    slices.push({ t: row?.t ?? [], v: row?.v ?? [], charge: ch });
    parts.push({
      fold: folds[i]!,
      label: row?.label ?? null,
      sym: row?.sym ?? null,
      sliceNet: row?.sliceNet ?? 0,
      sliceDd: row?.sliceDd ?? 0,
      charge: r2(ch)
    });
    prev = row;
  });

  const dd = sequentialDrawdown(slices, 0);
  const responsible = picks.flatMap((row, i) =>
    (row?.sliceLots ?? [])
      .filter((l) => l.entryT <= dd.troughTime && (l.exitT === null || l.exitT >= dd.peakTime))
      .map((l) => ({ fold: folds[i], sym: row!.sym, member: row!.label, ...l }))
  );
  const net = r2(parts.reduce((a, p) => a + p.sliceNet, 0) - charges);
  const withinCeiling = dd.maximum <= economics.ceiling;
  const verdict = parts.some((p) => p.label === null)
    ? 'UNSUPPORTED: a fold produced no primary'
    : net > 0 && withinCeiling
      ? 'SUPPORTED'
      : `UNSUPPORTED (${[net > 0 ? null : 'sequential net ≤ 0', withinCeiling ? null : `sequential minute DD ${usd(dd.maximum)} > $35,000`].filter(Boolean).join('; ')})`;

  return {
    name,
    parts,
    netBeforeCharges: r2(parts.reduce((a, p) => a + p.sliceNet, 0)),
    charges: r2(charges),
    net,
    sequentialDd: r2(dd.maximum),
    ddPeak: iso(dd.peakTime),
    ddTrough: iso(dd.troughTime),
    ddRecovery: iso(dd.recoveryTime),
    recovered: Number.isFinite(dd.recoveryTime),
    withinCeiling,
    verdict,
    supported: verdict === 'SUPPORTED',
    positionsResponsible: dd.maximum > 0 ? responsible.slice(0, 20) : []
  };
};

export const sequentialFile = (env: Env) => path.join(env.outDir, 'folds', 'sequential.json');

export const runSequential = async (env: Env, folds: readonly string[] = foldCutoffs) => {
  const file = sequentialFile(env);

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  const sels = folds.map((c) => {
    if (!isSealed(evaluationFile(env, c))) throw new Error(`the fold evaluation of ${c} is not sealed`);
    return readJson<Selection>(selectionFile(env, c));
  });
  const evals = folds.map((c) =>
    readJson<{ rows: { sym: string; label: string; sliceNet: number }[] }>(evaluationFile(env, c))
  );
  const keep = new Map<string, SliceRow>(); // the universe and new-ETF procedures' slices
  const wanted = new Set(sels.flatMap((s) => [s.primary, s.primaryNew].filter((x): x is string => x !== null)));
  const perEtf: ReturnType<typeof policyOf>[] = [];
  const mismatches: string[] = [];
  let sims = 0;

  for (const sym of symbolsOf(env)) {
    const picks = sels.map((s) => {
      const label = s.perEtf.find((p) => p.sym === sym)?.roles['actual-profit'] ?? null;

      return label ? { label, c: s.configs[label]! } : null;
    });
    const needs = new Set(
      sels.flatMap((s, i) =>
        [picks[i]?.label, ...[s.primary, s.primaryNew].filter((l) => l && s.configs[l]?.sym === sym)].filter(
          (x): x is string => !!x
        )
      )
    );

    if (!needs.size) {
      perEtf.push({
        ...policyOf(
          `${sym} own procedure`,
          folds,
          folds.map(() => null)
        ),
        name: `${sym} own procedure`
      });
      continue;
    }

    const d = await openEtfDoor(sym, 'D24', `${env.prefix}sequential ${sym}`);
    const rowsBy = new Map<string, SliceRow>();

    folds.forEach((f, i) => {
      const cut = cutoffs[f]!;

      for (const label of needs) {
        const c = sels[i]!.configs[label];

        if (!c || rowsBy.has(`${f}|${label}`)) continue;

        const x = sliceRun(d, c.g, cut.end, cut.slice[1]);
        const sealed = evals[i]!.rows.find((r) => r.sym === sym && r.label === label);

        sims++;
        if (sealed && Math.abs(sealed.sliceNet - x.sliceNet) > 0.011)
          mismatches.push(`${f} ${label}: ${sealed.sliceNet} vs ${x.sliceNet}`);
        rowsBy.set(`${f}|${label}`, {
          key: `${sym}|${c.id}`,
          sym,
          label,
          sliceNet: x.sliceNet,
          sliceDd: x.rec.periods[0]!.dd,
          t: x.t,
          v: x.v,
          openAtBoundary: x.openAtBoundary,
          openAtSliceEnd: x.openAtSliceEnd,
          sliceLots: x.sliceLots
        });
      }
    });

    perEtf.push(
      policyOf(
        `${sym} own procedure`,
        folds,
        folds.map((f, i) => (picks[i] ? rowsBy.get(`${f}|${picks[i]!.label}`)! : null))
      )
    );
    for (const [k, row] of rowsBy) if (wanted.has(row.label)) keep.set(k, row);
  }

  if (mismatches.length)
    throw new Error(`sequential replays differ from the sealed fold evaluations: ${mismatches.join('; ')}`);
  addToLedger({ job: `${env.prefix}sequential`, door: 'D24 (per ETF)', fresh: sims, hits: 0, kind: 'in-process' });

  const pick = (which: 'primary' | 'primaryNew') =>
    folds.map((f, i) => (sels[i]![which] ? (keep.get(`${f}|${sels[i]![which]}`) ?? null) : null));
  const universe = policyOf(
    'the universe procedure (each cutoff’s primary: ETF and phenotype)',
    folds,
    pick('primary')
  );
  const fresh = policyOf('the new-ETF procedure (controls excluded; report-only)', folds, pick('primaryNew'));
  const record = {
    stage: 'sequential',
    folds: folds.map((c, i) => ({
      fold: c,
      slice: cutoffs[c]!.slice,
      primary: sels[i]!.primary,
      primarySym: sels[i]!.primarySym,
      primaryNew: sels[i]!.primaryNew,
      primaryNewSym: sels[i]!.primaryNewSym
    })),
    switchCharge: `${economics.costBps} bps on $${economics.budget} per open lot closed or adopted at a boundary`,
    universe,
    new: fresh,
    perEtf: perEtf.map((p) => ({ ...p, sym: p.name.split(' ')[0] })),
    supportedEtfs: perEtf.filter((p) => p.supported).map((p) => p.name.split(' ')[0]),
    cash: policyOf(
      'cash in every slice (reference)',
      folds,
      folds.map(() => null)
    ),
    scope:
      'chronological evidence of the INDEPENDENT procedure only (standard §1.9): its seeds, ranges and promotions use no configuration selected with data after the cutoff',
    finished: new Date().toISOString()
  };

  seal(env, file, record, 'sequential');
  log(
    `sequential: universe ${universe.verdict} (net ${usd(universe.net)}, DD ${usd(universe.sequentialDd)}); ETFs supported: ${record.supportedEtfs.join(', ') || 'none'}`
  );
  return record;
};
