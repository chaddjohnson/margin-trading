// The final evaluation (PROTOCOL.md §10), opened once after the frozen selection is committed: #4's browser-parity
// replay first, then the predeclared battery for every frozen member and #4 on ONE continuous run 2016-01-04 →
// 2026-10-30 (positions, orders, indicator history and accrued interest carry across 2024-12-31), with validation
// measured from the 2024 close: net = marked equity at 2026-10-30 − at 2024-12-31; minute drawdown with its peak
// initialized at the boundary equity; carried-in positions split at the boundary.
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { chronology, eligibility, episodeGap } from './context.ts';
import type { PointRecord, TradeRow } from './engine.ts';
import type { Lab } from './pool.ts';
import { type Config, type Family, configId, withCost } from './space.ts';
import { matchWinners } from './trades.ts';
import { familyConfigs } from './fitness.ts';

// The browser's full-window reference for #4 (the brief): parity tolerances are the displayed precision.
export const browserReference4 = {
  totalMarkedNetUsd: 145468.46,
  realizedNetUsd: 145468.46,
  maximumMinuteDrawdownUsd: 14578.1,
  maximumMinuteDrawdownPercent: 14.58,
  wins: 10,
  losses: 3,
  breakeven: 0,
  closed: 13,
  exposurePercent: 37.0,
  flatAtEnd: true
};

const cents = (x: number) => Math.round(x * 100) / 100;

export const parityOf4 = (d: {
  metrics: Record<string, any>;
  minuteDrawdown: { maximumUsd: number; percentOfNotional: number };
}) => {
  const m = d.metrics;
  const observed = {
    totalMarkedNetUsd: cents(m.totalMarkedNetUsd),
    realizedNetUsd: cents(m.realizedNetUsd),
    maximumMinuteDrawdownUsd: cents(d.minuteDrawdown.maximumUsd),
    maximumMinuteDrawdownPercent: Math.round(d.minuteDrawdown.percentOfNotional * 100) / 100,
    wins: m.trades.wins,
    losses: m.trades.losses,
    breakeven: m.trades.breakeven,
    closed: m.trades.closed,
    exposurePercent: Math.round(m.occupancy.sessionsInvestedPercent * 10) / 10,
    exposureCalendarPercent: Math.round(m.occupancy.calendarTimeInvestedPercent * 10) / 10,
    flatAtEnd: m.trades.open === 0
  };
  const checks = Object.fromEntries(
    Object.entries(browserReference4).map(([k, v]) => [k, (observed as Record<string, unknown>)[k] === v])
  );

  return { expected: browserReference4, observed, checks, passed: Object.values(checks).every(Boolean) };
};

const halvesSum = (r: Pick<PointRecord, 'halves'>, fromYear: number, toYear = 9999) =>
  Object.entries(r.halves)
    .filter(([k]) => Number(k.slice(0, 4)) >= fromYear && Number(k.slice(0, 4)) <= toYear)
    .reduce((a, [, v]) => a + v, 0);

export const validationNetOf = (r: Pick<PointRecord, 'halves'>, fromYear = 2025) => halvesSum(r, fromYear);

const episodesOf = (trades: readonly TradeRow[]) => {
  let n = 0;
  let last = -Infinity;

  for (const t of trades) {
    if (t.entryIndex - last > episodeGap) n++;
    last = t.status === 'open' ? Infinity : t.exitIndex;
  }

  return n;
};

export interface Battery {
  T1: boolean;
  T2: boolean;
  T3: boolean;
  T4: boolean;
  T5: boolean;
  T6: boolean;
  T7: boolean;
}

// The predeclared battery (PROTOCOL.md §10.3). `run` = the full-history centre record, `detail` its trades and
// boundary split, `test` = the pooled test-family records (full door), `stress10` the 10 bps centre record.
export const batteryOf = (
  run: PointRecord,
  boundary: { validationNet: number; newEntries: number[] },
  trades: readonly TradeRow[],
  test: readonly PointRecord[],
  stress10: PointRecord,
  stress10ValidationNet: number,
  sessions: { run: number; validation: number },
  fromYear = 2025
) => {
  const { ceiling } = eligibility;
  const y = sessions.run / 252;
  const yVal = Math.round((sessions.validation / 252) * 100) / 100;
  const share = test.filter((r) => r.dd < ceiling).length / test.length;
  const p90 = quantile(
    test.map((r) => r.dd),
    0.9
  );
  const testVal = test.map((r) => validationNetOf(r, fromYear));
  const medianVal = quantile(testVal, 0.5);
  const years: Record<string, number> = {};

  for (const [k, v] of Object.entries(run.halves)) years[k.slice(0, 4)] = (years[k.slice(0, 4)] ?? 0) + v;

  const best = Math.max(0, ...Object.values(years));
  const newTrades = trades.filter((t) => boundary.newEntries.includes(t.n));
  const t: Battery = {
    T1: run.dd < ceiling,
    T2: share >= eligibility.share && p90 < ceiling,
    T3: boundary.validationNet >= 10000 * yVal && medianVal > 0 && medianVal >= 5000 * yVal,
    T4: stress10ValidationNet > 0 && stress10.dd < ceiling,
    T5:
      run.net > 0 &&
      best <= eligibility.topYearShare * run.net &&
      (run.net - best) / Math.max(1, y - 1) >= eligibility.exBestPerYear &&
      Number.isFinite(run.top1Share) &&
      run.top1Share <= eligibility.topLotShare,
    T6:
      run.trades >= Math.ceil(eligibility.lotsPerYear * y) &&
      run.episodes >= Math.ceil(eligibility.episodesPerYear * y) &&
      run.lotYears >= eligibility.minLotYears &&
      newTrades.length >= Math.ceil(eligibility.lotsPerYear * yVal) &&
      episodesOf(newTrades) >= Math.ceil(eligibility.episodesPerYear * yVal),
    T7: run.perCapitalYear >= eligibility.perCapitalYear
  };
  const failed = Object.entries(t)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ambiguous =
    failed.length === 0 && (share <= eligibility.marginalShare || run.dd >= eligibility.marginalCentreDd);

  return {
    gates: t,
    failed,
    status: failed.length ? 'fail' : ambiguous ? 'ambiguous' : 'pass',
    figures: {
      y,
      yVal,
      testShare: share,
      testP90Dd: p90,
      testN: test.length,
      testLedgers: new Set(test.map((r) => r.signature)).size,
      testValidationMedian: medianVal,
      testValidationP10: quantile(testVal, 0.1),
      bestYear: best,
      newValidationTrades: newTrades.length,
      newValidationEpisodes: episodesOf(newTrades),
      stress10ValidationNet,
      stress10RunDd: stress10.dd
    }
  };
};

export const testFamilies = (n: number, reps: number): Family[] =>
  Array.from({ length: reps }, (_v, i) => ({ name: `test${i + 1}`, n, labels: ['test', 'sets', 'F24', i + 1] }));

// The pooled test-family records of one centre on the full door.
export const testRecords = async (lab: Lab, c: Config, fams: Family[]) => {
  const points = familyConfigs(c, fams);

  return lab.points(points.map((p) => p.config));
};

export const stressValidation = async (lab: Lab, c: Config, fromYear = 2025) => {
  const r = await lab.point(withCost(c, 10));

  return { record: r, validationNet: validationNetOf(r, fromYear) };
};

// The same-dates comparison with #4 (report-only): validation net and drawdown, winners retained/added, losses.
export const compareWith4 = (
  candidate: { boundary: any; trades: TradeRow[] },
  control: { boundary: any; trades: TradeRow[] },
  boundaryIndex: number
) => {
  const after = (ts: TradeRow[]) => ts.filter((t) => t.entryIndex > boundaryIndex);
  const m = matchWinners(after(candidate.trades), after(control.trades));

  return {
    validationNetDelta: cents(candidate.boundary.validationNet - control.boundary.validationNet),
    validationDrawdownDelta: cents(
      candidate.boundary.validationDrawdown.maximumUsd - control.boundary.validationDrawdown.maximumUsd
    ),
    higherNetWithEqualOrLowerDrawdown:
      candidate.boundary.validationNet > control.boundary.validationNet &&
      candidate.boundary.validationDrawdown.maximumUsd <= control.boundary.validationDrawdown.maximumUsd,
    winners: m,
    lossesIncreased: m.candidateLosses > m.controlLosses
  };
};

export const boundaryDate = chronology.developmentEnd;
export const idOf = configId;
