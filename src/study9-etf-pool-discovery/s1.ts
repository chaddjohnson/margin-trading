// S1 (PROTOCOL.md §6): the standalone opportunity screen, training door only (2016-01-04 → 2024-12-31, arming
// 2017-06-15, $100k, 11%, 5 bps). For each eligible ETF, the 64 common screening vectors are measured at the centre
// with a 16-point N1 neighbourhood (family s1-nb16); the 8 best by the constrained profit-role order (violation 0
// first by robust profit/yr — Study 8's profit-role order — then violation) get a 64-point neighbourhood from an
// independent seed family (s1-nb64), as does any later vector that reaches first place or a menu slot (≤ 16 in all);
// the final order uses each vector's pooled (unique) 16 + 64 points where re-measured. Per ETF the record keeps every vector's centre, neighbourhood,
// violation and period attributions, the vector menu that S2/S3 use (the best two plausible vectors of each design
// half), and the opportunity summaries. One job per ETF; a finished job's file is never recomputed.
import path from 'node:path';
import fs from 'fs-extra';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { foldEnds, nowIso, resultFile, smoke, trainingYears } from './context.ts';
import {
  type Family,
  type Fit,
  ex2020Stats,
  fitOf,
  foldPairs,
  periodRobust,
  periodStats,
  periodYears,
  screenDesign,
  wilsonLower
} from './design.ts';
import { openDoor } from './door.ts';
import { Lab, type PointRecord, PointCache, S9Evaluator, vectorId } from './engine.ts';
import { spearman } from '../study8-expanded-regime-d1/stats.ts';

export const s1Dir = resultFile('s1');
export const s1File = (symbol: string) => path.join(s1Dir, 'etf', `${symbol}.json`);
export const s1Families = {
  nb16: { name: 's1-nb16', n: smoke ? 4 : 16, labels: ['s1', 'nb16'] } as Family,
  nb64: { name: 's1-nb64', n: smoke ? 8 : 64, labels: ['s1', 'nb64'] } as Family
};
export const s1Rules = { topForNb64: smoke ? 2 : 8, menuPerHalf: 2, maxRemeasured: smoke ? 4 : 16 };

// Study 8's screen plausibility (§7.1): standalone DD < $35k, net > 0, ≥ 2 lots.
export const plausible = (r: PointRecord) => r.dd < 35000 && r.net > 0 && r.lots >= 2;

// The constrained profit-role order (Study 8's profit-role scalar inside its feasibility; its search itself ranks by
// constrained Pareto dominance): feasible (violation 0) first by robust profit/yr, ties lower p90 DD then id; infeasible by
// violation, then robust profit/yr.
export const constrainedCompare = (
  a: { violation: number; robust: number; p90Dd: number; id: string },
  b: { violation: number; robust: number; p90Dd: number; id: string }
) => {
  const fa = a.violation === 0;
  const fb = b.violation === 0;

  if (fa !== fb) return fa ? -1 : 1;
  if (!fa && a.violation !== b.violation) return a.violation - b.violation;
  if (a.robust !== b.robust) return b.robust - a.robust;
  if (a.p90Dd !== b.p90Dd) return a.p90Dd - b.p90Dd;

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

const compactCentre = (r: PointRecord, y: number) => ({
  net: r.net,
  perYear: r.net / y,
  realized: r.realized,
  unrealized: r.unrealized,
  interest: r.interest,
  costs: r.costs,
  dd: r.dd,
  ddDaily: r.ddDaily,
  lots: r.lots,
  open: r.open,
  wins: r.wins,
  episodes: r.episodes,
  lotYears: r.lotYears,
  heldDays: r.heldDays,
  occupancy: r.occupancy,
  perCapitalYear: r.perCapitalYear,
  top1Share: Number.isFinite(r.top1Share) ? r.top1Share : null,
  bestYear: r.bestYear,
  bestYearKey: r.bestYearKey,
  periods: r.periods,
  signature: r.signature
});

const fitRow = (
  fit: Fit & { centreRecord: PointRecord; records: PointRecord[] },
  y: number,
  years: { early: number; late: number; ex2020: number }
) => ({
  family: fit.family,
  n: fit.nb.n,
  share: fit.nb.share,
  wilsonLower: wilsonLower(fit.nb.share, fit.nb.n),
  medianPerYear: fit.nb.medianPerYear,
  p10PerYear: fit.nb.p10PerYear,
  robustPerYear: fit.nb.robustPerYear,
  p90Dd: fit.nb.p90Dd,
  medianDd: fit.nb.medianDd,
  worstDd: fit.nb.worstDd,
  profitable: fit.nb.profitable,
  medianLots: fit.nb.medianLots,
  violation: fit.violation,
  parts: Object.fromEntries(Object.entries(fit.parts).filter(([, v]) => v > 0)),
  clippedPoints: fit.clippedPoints,
  early: periodStats(fit.records, 'EARLY'),
  late: periodStats(fit.records, 'LATE'),
  earlyRobustPerYear: periodStats(fit.records, 'EARLY').robust / years.early,
  lateRobustPerYear: periodStats(fit.records, 'LATE').robust / years.late,
  nbPeriods: periodRobust(fit.records),
  ex2020: ex2020Stats(fit.records),
  ex2020RobustPerYear: ex2020Stats(fit.records).robust / years.ex2020,
  plausibleShare: fit.records.filter(plausible).length / Math.max(1, fit.records.length),
  y
});

export type FitRow = ReturnType<typeof fitRow>;

export interface VectorRow {
  index: number;
  half: 'A' | 'B';
  id: string;
  grid: Grid;
  centre: ReturnType<typeof compactCentre>;
  plausible: boolean;
  nb16: FitRow;
  nb64?: FitRow;
  pooled80?: FitRow;
  final: FitRow; // pooled80 for the top 8, nb16 otherwise
  rank: number; // 1-based final constrained order over the 64
}

export const runS1Symbol = async (symbol: string) => {
  const file = s1File(symbol);

  if (await fs.pathExists(file)) {
    console.info(`${symbol}: S1 already complete (${file}); not recomputed`);
    return;
  }

  const started = Date.now();
  const door = await openDoor([symbol], `S1 standalone screen ${symbol}`, { key: 's1' });
  const ev = new S9Evaluator(door);
  const lab = new Lab(ev, await PointCache.open(door, resultFile('cache', 's1', `${symbol}.jsonl`)));
  const y = ev.yearsOfRun();
  const years = {
    early: periodYears(lab, 'EARLY'),
    late: periodYears(lab, 'LATE'),
    ex2020: ev.yearsOfRun() - periodYears(lab, '2020')
  };
  const design = smoke ? screenDesign().filter((v) => v.index % 32 < 4) : screenDesign();
  const rows: VectorRow[] = design.map((vector) => {
    const books = { [symbol]: vector.grid };
    const fit = fitOf(lab, books, [s1Families.nb16]);
    const row = fitRow(fit, y, years);

    return {
      index: vector.index,
      half: vector.half,
      id: vectorId(vector.grid),
      grid: vector.grid,
      centre: compactCentre(fit.centreRecord, y),
      plausible: plausible(fit.centreRecord),
      nb16: row,
      final: row,
      rank: 0
    };
  });
  const keyOf = (row: VectorRow, fit: FitRow) => ({
    violation: fit.violation,
    robust: fit.robustPerYear,
    p90Dd: fit.p90Dd,
    id: row.id
  });
  const by16 = [...rows].sort((a, b) => constrainedCompare(keyOf(a, a.nb16), keyOf(b, b.nb16)));

  const measured = new Set<VectorRow>();
  const remeasure = (row: VectorRow) => {
    const books = { [symbol]: row.grid };

    row.nb64 = fitRow(fitOf(lab, books, [s1Families.nb64]), y, years);
    row.pooled80 = fitRow(fitOf(lab, books, [s1Families.nb16, s1Families.nb64]), y, years);
    row.final = row.pooled80;
    measured.add(row);
  };

  for (const row of by16.slice(0, s1Rules.topForNb64)) remeasure(row);

  // final order: one constrained order over all 64 at each vector's final precision (review m1). A vector still on
  // 16 points that reaches first place or a menu slot is re-measured too, up to 16 in all, so the best vector and the
  // menus rest on ≥ 80 points (review verification N2).
  const sortFinal = () => [...rows].sort((a, b) => constrainedCompare(keyOf(a, a.final), keyOf(b, b.final)));
  const menuPicks = (order: VectorRow[]) =>
    (['A', 'B'] as const).flatMap((half) => {
      const inHalf = order.filter((row) => row.half === half);

      return [...inHalf.filter((row) => row.plausible), ...inHalf.filter((row) => !row.plausible)].slice(
        0,
        s1Rules.menuPerHalf
      );
    });
  let ordered = sortFinal();

  for (let round = 0; round < 64 && measured.size < s1Rules.maxRemeasured; round++) {
    const need = [...new Set([ordered[0]!, ...menuPicks(ordered)])].filter((row) => !measured.has(row));

    if (!need.length) break;

    for (const row of need) if (measured.size < s1Rules.maxRemeasured) remeasure(row);

    ordered = sortFinal();
  }

  lab.cache.flushSync();

  const top = [...measured];

  ordered.forEach((row, i) => (row.rank = i + 1));

  // the menu: the best two plausible vectors of each half (in the final order); a half without plausible vectors
  // contributes its best vectors, labelled
  const menuOf = (half: 'A' | 'B') => {
    const inHalf = ordered.filter((row) => row.half === half);
    const good = inHalf.filter((row) => row.plausible);
    const picked = [...good, ...inHalf.filter((row) => !row.plausible)].slice(0, s1Rules.menuPerHalf);

    return picked.map((row) => ({ index: row.index, half, id: row.id, rank: row.rank, plausible: row.plausible }));
  };
  const menu = { A: menuOf('A'), B: menuOf('B') };

  // summaries (the opportunity source measures; none selects anything by itself)
  const centreNets = rows.map((r) => r.centre.perYear).sort((a, b) => a - b);
  const best = ordered[0]!;
  const feasible16 = rows.filter((r) => r.nb16.violation === 0).length;
  const early = rows.map((r) => r.centre.periods.EARLY ?? 0);
  const late = rows.map((r) => r.centre.periods.LATE ?? 0);
  const earlyPick = [...rows]
    .filter((r) => r.plausible)
    .sort((a, b) => b.nb16.early.robust - a.nb16.early.robust || (a.id < b.id ? -1 : 1))[0];
  const uncertainty = top.map((r) => ({
    id: r.id,
    robust16: r.nb16.robustPerYear,
    robust64: r.nb64!.robustPerYear,
    share16: r.nb16.share,
    share64: r.nb64!.share
  }));
  const summary = {
    vectors: rows.length,
    plausible: rows.filter((r) => r.plausible).length,
    feasible16,
    feasibleFinal: ordered.filter((r) => r.final.violation === 0).length,
    breadth: rows.filter((r) => r.centre.net > 0 && r.centre.dd < 35000).length / rows.length,
    medianCentrePerYear: centreNets[Math.floor(centreNets.length / 2)]!,
    best: {
      id: best.id,
      index: best.index,
      half: best.half,
      final: best.final,
      centre: best.centre
    },
    bestRobustPerYear: best.final.robustPerYear,
    bestFeasible: best.final.violation === 0,
    earlyLateSpearman: spearman(early, late),
    earlyPick: earlyPick
      ? { id: earlyPick.id, earlyRobust: earlyPick.nb16.early.robust, lateRobust: earlyPick.nb16.late.robust }
      : null,
    uncertainty,
    // TD3 (review M6): an expanding-fold walk-forward over the 64 vectors. For each fold end F, the vectors ranked by
    // their 16-point neighbourhood robust attribution to F against the next calendar year's; and the vector best to
    // F (no later information), with that next year's attribution and its percentile among the 64.
    walkForward: foldPairs.map(([fold, next]) => {
      const a = rows.map((r) => r.nb16.nbPeriods[fold] ?? NaN);
      const b = rows.map((r) => r.nb16.nbPeriods[next] ?? NaN);
      const pick = [...rows].sort(
        (x, z) =>
          (z.nb16.nbPeriods[fold] ?? -Infinity) - (x.nb16.nbPeriods[fold] ?? -Infinity) || (x.id < z.id ? -1 : 1)
      )[0]!;
      const pickNext = pick.nb16.nbPeriods[next] ?? NaN;

      return {
        fold,
        next,
        spearman: spearman(a, b),
        pick: pick.id,
        pickNext,
        pickNextPercentile: b.filter((v) => v < pickNext).length / Math.max(1, b.length),
        medianNext: [...b].sort((x, z) => x - z)[Math.floor(b.length / 2)]
      };
    }),
    foldAttribution: Object.fromEntries(Object.keys(foldEnds).map((k) => [k, best.centre.periods[`TO-${k}`] ?? null])),
    years: Object.fromEntries(trainingYears.map((year) => [year, best.centre.periods[String(year)] ?? null]))
  };
  const record = {
    stage: 's1',
    symbol,
    at: nowIso(),
    door: {
      id: door.id,
      end: door.end,
      first: door.dates[0],
      last: door.dates[door.lastIndex],
      sessions: door.dates.length
    },
    y,
    families: s1Families,
    rules: s1Rules,
    vectors: ordered,
    menu,
    summary,
    compute: { seconds: (Date.now() - started) / 1000, points: lab.computed, traces: ev.traceBuilds }
  };

  await fs.outputJson(`${file}.tmp`, record);
  await fs.rename(`${file}.tmp`, file);
  console.info(`${symbol}: S1 complete in ${record.compute.seconds.toFixed(1)} s (${lab.computed} points)`);
};
