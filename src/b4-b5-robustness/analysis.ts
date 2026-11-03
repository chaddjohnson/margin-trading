// Every workstream's figures from the stored runs (PROTOCOL.md §3–§10): parameter neighbourhoods (A), years, regimes,
// leave-one-year-out attribution and the bootstrap (B), leave-one-book-out and the B5 − B4 bridge (C), cost and
// execution stresses with the same-trade re-costing that separates cost from path (D), the trade ledger with MAE/MFE
// and concentration (E), the dynamic portfolio against the no-margin control (F), and the pre-registered gates. It
// reads the stored records and the canonical bars (for MAE/MFE) and writes results/analysis.json plus the CSV tables.
// It runs no strategy.
import fs from 'fs-extra';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { auditMembers, families, loadAuditUniverse } from './cli.ts';
import {
  type PoolId,
  base,
  bootstrap,
  costScenarios,
  gates,
  nowIso,
  poolIds,
  regimeWindows,
  resultDir,
  schedules,
  scenarioById,
  shortNames,
  studyLabel,
  writeJson,
  writeText
} from './context.ts';
import { type DailyRecord, type LotRecord, type RunMetrics, runningPeakDrawdown } from './run.ts';
import { type OatPoint, allSpecs, loadFrozenPools } from './specs.ts';
import { readAll, readDetail, toCsv } from './store.ts';

// ----- small numeric helpers -----

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

export const quantile = (values: readonly number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);

  return sorted[low]! + (sorted[high]! - sorted[low]!) * (position - low);
};

export const median = (values: readonly number[]) => quantile(values, 0.5);

// The baseline's percentile among its neighbours: the share below it, ties counted half.
export const percentileRank = (values: readonly number[], baseline: number) =>
  values.length === 0
    ? NaN
    : (values.filter((value) => value < baseline).length + 0.5 * values.filter((value) => value === baseline).length) /
      values.length;

const share = (values: readonly boolean[]) => (values.length ? values.filter(Boolean).length / values.length : NaN);

const yearOf = (date: string) => date.slice(0, 4);

const stopReasons = new Set(['trailing stop', 'trailing stop gap']);

// ----- keys of the stored runs -----

export const keys = {
  base: (pool: PoolId, mode: 'fixed' | 'portfolio') => `cost:${pool}:base:${mode}`,
  scenario: (pool: PoolId, id: string, mode: 'fixed' | 'portfolio') => `cost:${pool}:${id}:${mode}`,
  control: 'control:C0:portfolio',
  symmetric: (pool: PoolId) => `dividends:${pool}:symmetric:portfolio`,
  ablation: (pool: PoolId, symbol: string, mode: 'fixed' | 'portfolio') => `ablation:${pool}:-${symbol}:${mode}`
};

// ----- Workstream E helpers: MAE/MFE from legally observable bars -----

export interface Excursion {
  maePercent: number;
  mfePercent: number;
  maeDollars: number;
  mfeDollars: number;
  maeTime: number;
  mfeTime: number;
  bars: number;
}

// Bars from the entry bar (its open is the fill; its range follows the fill) through the bar before the exit bar,
// then the exit price itself (the exit bar's range beyond the fill is not counted: the order inside a minute is
// unknown). An open lot runs to the last bar of the data. Excursions are relative to the raw entry fill; dollars are
// shares × (extreme − cost-adjusted entry price), before interest.
export const excursionOf = (universe: NUniverse, lot: LotRecord): Excursion => {
  const ds = universe.instruments[lot.symbol]!.ds;
  const startBar = ds.sBarStart[lot.entryIndex]! + lot.entryBar;
  const open = lot.exitIndex < 0;
  const lastSession = open ? ds.sessionCount - 1 : lot.exitIndex;
  const endBar = open
    ? ds.sBarStart[lastSession]! + ds.sBarCount[lastSession]! // exclusive
    : ds.sBarStart[lot.exitIndex]! + Math.min(lot.exitBar, ds.sBarCount[lot.exitIndex]!);
  let low = Infinity;
  let high = -Infinity;
  let lowTime = NaN;
  let highTime = NaN;
  let bars = 0;

  for (let b = startBar; b < endBar; b++) {
    bars++;

    if (ds.bLow[b]! < low) {
      low = ds.bLow[b]!;
      lowTime = ds.bTime[b]!;
    }

    if (ds.bHigh[b]! > high) {
      high = ds.bHigh[b]!;
      highTime = ds.bTime[b]!;
    }
  }

  if (!open) {
    if (lot.exitRawPrice < low) {
      low = lot.exitRawPrice;
      lowTime = lot.exitTime;
    }

    if (lot.exitRawPrice > high) {
      high = lot.exitRawPrice;
      highTime = lot.exitTime;
    }
  }

  return {
    maePercent: low / lot.entryRawPrice - 1,
    mfePercent: high / lot.entryRawPrice - 1,
    maeDollars: lot.shares * (low - lot.entryPrice),
    mfeDollars: lot.shares * (high - lot.entryPrice),
    maeTime: lowTime,
    mfeTime: highTime,
    bars
  };
};

// ----- drawdown episodes of a daily value series -----

export interface Episode {
  peakDate: string;
  troughDate: string;
  recoveryDate: string; // '' if not recovered by the end
  depthPercent: number;
  depthDollars: number;
  peakValue: number;
  sessionsToTrough: number;
  sessionsUnderwater: number; // peak to recovery (or to the end)
}

// Non-overlapping episodes: each runs from a running peak to the next close at or above it.
export const episodesOf = (dates: readonly string[], values: readonly number[], start: number, startDate: string) => {
  const episodes: Episode[] = [];
  let peak = start;
  let peakIndex = -1;
  let trough = Infinity;
  let troughIndex = -1;
  const close = (recoveryIndex: number) => {
    if (troughIndex >= 0 && trough < peak) {
      episodes.push({
        peakDate: peakIndex >= 0 ? dates[peakIndex]! : startDate,
        troughDate: dates[troughIndex]!,
        recoveryDate: recoveryIndex >= 0 ? dates[recoveryIndex]! : '',
        depthPercent: peak > 0 ? (peak - trough) / peak : NaN,
        depthDollars: peak - trough,
        peakValue: peak,
        sessionsToTrough: troughIndex - peakIndex,
        sessionsUnderwater: (recoveryIndex >= 0 ? recoveryIndex : dates.length - 1) - peakIndex
      });
    }
  };

  values.forEach((value, index) => {
    if (value >= peak) {
      close(index);
      peak = value;
      peakIndex = index;
      trough = Infinity;
      troughIndex = -1;
      return;
    }

    if (value < trough) {
      trough = value;
      troughIndex = index;
    }
  });

  close(-1);

  return episodes;
};

// ----- the stationary bootstrap (Politis–Romano), paired across series -----

export const stationaryBootstrap = (
  series: readonly (readonly number[])[],
  blockLength: number,
  resamples: number,
  rng: Rng
) => {
  const n = series[0]!.length;
  const totals = series.map(() => new Float64Array(resamples));
  const p = 1 / blockLength;

  for (let r = 0; r < resamples; r++) {
    let index = rng.int(n);
    const acc = series.map(() => 0);

    for (let t = 0; t < n; t++) {
      if (t > 0) {
        index = rng.next() < p ? rng.int(n) : (index + 1) % n;
      }

      for (let k = 0; k < series.length; k++) {
        acc[k]! += series[k]![index]!;
      }
    }

    acc.forEach((value, k) => {
      totals[k]![r] = value;
    });
  }

  return totals.map((values) => [...values]);
};

// ----- linear interpolation of a sign change between tested points (never extrapolated) -----

export const breakEven = (points: { x: number; y: number }[]) => {
  const sorted = [...points].sort((a, b) => a.x - b.x);

  for (let index = 1; index < sorted.length; index++) {
    const a = sorted[index - 1]!;
    const b = sorted[index]!;

    if ((a.y > 0 && b.y <= 0) || (a.y <= 0 && b.y > 0)) {
      return { x: a.x + ((0 - a.y) * (b.x - a.x)) / (b.y - a.y), between: [a.x, b.x] as [number, number] };
    }
  }

  return undefined;
};

// ----- same-trade re-costing (fixed mode): the base lots under a scenario's costs, no path change -----

export const recostLot = (
  lot: LotRecord,
  scenario: { rate: number; costBps: number; stopSlippageBps: number },
  baseRate = base.rate
) => {
  const cost = scenario.costBps / 10000;
  const shares = lot.principal / (lot.entryRawPrice * (1 + cost));
  const slip = stopReasons.has(lot.exitReason) ? scenario.stopSlippageBps / 10000 : 0;
  const exit = lot.exitRawPrice * (1 - cost) * (1 - slip);

  return shares * exit - lot.principal - lot.interest * (scenario.rate / baseRate);
};

// ----- the analysis -----

type Metrics = RunMetrics;

const fixedSummary = (m: Metrics) => ({
  net: m.net,
  gross: m.gross,
  interest: m.interest,
  friction: m.friction,
  lots: m.lots,
  wins: m.wins,
  losses: m.losses,
  realizedLosses: m.realizedLosses,
  worstLot: m.worstLot,
  profitFactor: m.profitFactor,
  lotDays: m.lotDays,
  exposure: m.sessionsHeld / m.sessionsEligible,
  minuteDD: m.minuteDD,
  dailyDD: m.dailyDD,
  netPerMinuteDD: m.minuteDD > 0 ? m.net / m.minuteDD : NaN,
  netPerMillionDollarDays: m.borrowingDollarDays > 0 ? (m.net / m.borrowingDollarDays) * 1e6 : NaN
});

const portfolioSummary = (m: Metrics, c0: Metrics) => ({
  endEquity: m.endEquity,
  totalReturn: m.totalReturn,
  cagr: m.cagr,
  incremental: m.endEquity - c0.endEquity,
  dailyPercent: m.dailyPercent,
  minutePercent: m.minutePercent,
  dailyDollarDD: m.dailyDD,
  minuteDollarDD: m.minuteDD,
  strategyNet: m.net,
  interest: m.interest,
  lots: m.lots,
  maxPrincipal: m.maxPrincipal,
  maxDebtToEquity: m.maxDebtToEquity,
  cagrPerDailyDD: m.dailyPercent > 0 ? m.cagr / m.dailyPercent : NaN
});

const distribution = (values: number[]) => ({
  n: values.length,
  median: median(values),
  p10: quantile(values, 0.1),
  p90: quantile(values, 0.9),
  min: Math.min(...values),
  max: Math.max(...values),
  mean: values.length ? sum(values) / values.length : NaN
});

export const analyze = async () => {
  const started = Date.now();
  const stored = await readAll(families);
  const pools = await loadFrozenPools();
  const { specs, oat, samples } = allSpecs(pools);
  const missing = specs.filter((spec) => !stored.has(spec.key));

  if (missing.length > 0) {
    throw new Error(`${missing.length} runs are not stored yet (first: ${missing[0]!.key}); run \`run\` first`);
  }

  const get = (key: string) => {
    const metrics = stored.get(key);

    if (!metrics) {
      throw new Error(`no stored run ${key}`);
    }

    return metrics;
  };
  const c0 = get(keys.control);
  const detail = {
    B4: {
      fixed: await readDetail(keys.base('B4', 'fixed')),
      portfolio: await readDetail(keys.base('B4', 'portfolio'))
    },
    B5: {
      fixed: await readDetail(keys.base('B5', 'fixed')),
      portfolio: await readDetail(keys.base('B5', 'portfolio'))
    },
    C0: await readDetail(keys.control)
  };
  const universe = await loadAuditUniverse();
  const dates = universe.dates;
  const out: Record<string, unknown> = { schema: 'b4-b5-robustness-analysis-v1', generatedAt: nowIso(), studyLabel };

  // Every detail ledger's rows must be sessions 1 … end in calendar order.
  for (const daily of [
    detail.B4.fixed.daily,
    detail.B4.portfolio.daily,
    detail.B5.fixed.daily,
    detail.B5.portfolio.daily,
    detail.C0.daily
  ]) {
    if (daily.length !== dates.length - 1 || daily.some((row) => dates[row.index] !== row.date)) {
      throw new Error('a detail daily ledger is not aligned with the session calendar');
    }
  }

  // =============== A: parameter fragility ===============

  const A: Record<string, unknown> = {};
  const oatRows: Record<string, unknown>[] = [];
  const jointRows: Record<string, unknown>[] = [];

  for (const pool of poolIds) {
    const baseFixed = get(keys.base(pool, 'fixed'));
    const basePortfolio = get(keys.base(pool, 'portfolio'));
    const tornado: Record<string, unknown>[] = [];

    for (const book of pools[pool].books) {
      for (const key of d1Keys) {
        const points = oat.filter(
          (point: OatPoint) => point.pool === pool && point.symbol === book.symbol && point.key === key
        );
        const fixedNets: number[] = [];
        const ends: number[] = [];

        for (const point of points) {
          const family = point.boundary ? 'boundary' : 'oat';
          const runKey = (mode: string) => `${family}:${pool}:${point.symbol}:${point.key}:${point.offset}:${mode}`;
          const fixed = point.feasible || point.boundary ? get(runKey('fixed')) : undefined;
          const portfolio = point.feasible || point.boundary ? get(runKey('portfolio')) : undefined;

          if (fixed && point.feasible) {
            fixedNets.push(fixed.net);
            ends.push(portfolio!.endEquity);
          }

          oatRows.push({
            pool,
            symbol: point.symbol,
            parameter: key,
            short: shortNames[key],
            offset: point.offset,
            frozen: point.frozen,
            value: point.value,
            distance: point.distance,
            rule: point.rule,
            status: point.feasible ? 'run' : point.boundary ? 'boundary probe (outside grid)' : 'infeasible',
            reason: point.reason,
            fixedNet: fixed?.net ?? NaN,
            fixedNetChange: fixed ? fixed.net - baseFixed.net : NaN,
            fixedMinuteDD: fixed?.minuteDD ?? NaN,
            fixedLots: fixed?.lots ?? NaN,
            lotSetChanged: fixed ? fixed.lotSetHash !== baseFixed.lotSetHash : '',
            portfolioEnd: portfolio?.endEquity ?? NaN,
            portfolioEndChange: portfolio ? portfolio.endEquity - basePortfolio.endEquity : NaN,
            portfolioDailyPercent: portfolio?.dailyPercent ?? NaN,
            portfolioMinutePercent: portfolio?.minutePercent ?? NaN
          });
        }

        tornado.push({
          symbol: book.symbol,
          parameter: key,
          short: shortNames[key],
          frozen: book.grid[key],
          feasiblePoints: fixedNets.length,
          minNet: fixedNets.length ? Math.min(...fixedNets) : NaN,
          maxNet: fixedNets.length ? Math.max(...fixedNets) : NaN,
          swing: fixedNets.length ? Math.max(...fixedNets) - Math.min(...fixedNets) : NaN,
          worstChange: fixedNets.length ? Math.min(...fixedNets) - baseFixed.net : NaN,
          bestChange: fixedNets.length ? Math.max(...fixedNets) - baseFixed.net : NaN,
          minEnd: ends.length ? Math.min(...ends) : NaN,
          maxEnd: ends.length ? Math.max(...ends) : NaN
        });
      }
    }

    tornado.sort((a, b) => (b.swing as number) - (a.swing as number));

    const oatFeasible = oatRows.filter((row) => row.pool === pool && row.status === 'run');
    const designs: Record<string, unknown> = {};
    const designNames = [...new Set(samples.filter((sample) => sample.pool === pool).map((sample) => sample.design))];

    for (const design of designNames) {
      const prefix = design.startsWith('joint')
        ? `joint:${pool}:s${design.slice('joint-s'.length)}`
        : `book:${pool}:${design.slice('book-'.length)}`;
      const count = samples.filter((sample) => sample.pool === pool && sample.design === design).length;
      const fixed = Array.from({ length: count }, (_, index) =>
        get(`${prefix}:${String(index).padStart(2, '0')}:fixed`)
      );
      const portfolio = Array.from({ length: count }, (_, index) =>
        get(`${prefix}:${String(index).padStart(2, '0')}:portfolio`)
      );
      const nets = fixed.map((m) => m.net);
      const ends = portfolio.map((m) => m.endEquity);
      const dailyPercents = portfolio.map((m) => m.dailyPercent);
      const minutePercents = portfolio.map((m) => m.minutePercent);

      designs[design] = {
        n: count,
        fixedNet: distribution(nets),
        fixedMinuteDD: distribution(fixed.map((m) => m.minuteDD)),
        fixedLots: distribution(fixed.map((m) => m.lots)),
        fixedNetPerMinuteDD: distribution(fixed.map((m) => m.net / m.minuteDD)),
        fixedExposure: distribution(fixed.map((m) => m.sessionsHeld / m.sessionsEligible)),
        fixedRealizedLosses: distribution(fixed.map((m) => m.realizedLosses)),
        portfolioEnd: distribution(ends),
        portfolioIncremental: distribution(ends.map((end) => end - c0.endEquity)),
        portfolioDailyPercent: distribution(dailyPercents),
        portfolioMinutePercent: distribution(minutePercents),
        shareProfitable: share(nets.map((net) => net > 0)),
        shareIncrementalPositive: share(ends.map((end) => end > c0.endEquity)),
        shareDaily30: share(dailyPercents.map((value) => value > gates.riskPreferred)),
        shareDaily35: share(dailyPercents.map((value) => value > gates.riskTolerance)),
        shareMinute30: share(minutePercents.map((value) => value > gates.riskPreferred)),
        shareMinute35: share(minutePercents.map((value) => value > gates.riskTolerance)),
        medianNetRatio: median(nets) / baseFixed.net,
        baselineNetPercentile: percentileRank(nets, baseFixed.net),
        baselineEndPercentile: percentileRank(ends, basePortfolio.endEquity),
        baselineNetPerDDPercentile: percentileRank(
          fixed.map((m) => m.net / m.minuteDD),
          baseFixed.net / baseFixed.minuteDD
        ),
        shareAtLeastHalfBaseline: share(nets.map((net) => net >= 0.5 * baseFixed.net)),
        shareAboveBaseline: share(nets.map((net) => net > baseFixed.net)),
        lotSetUnchanged: share(fixed.map((m) => m.lotSetHash === baseFixed.lotSetHash)),
        // The two crash years, and where each neighbour's worst portfolio drawdown starts.
        fixed2020: distribution(fixed.map((m) => m.yearly['2020']?.change ?? 0)),
        fixed2022: distribution(fixed.map((m) => m.yearly['2022']?.change ?? 0)),
        share2022Positive: share(fixed.map((m) => (m.yearly['2022']?.change ?? 0) > 0)),
        frozen2020: baseFixed.yearly['2020']?.change ?? 0,
        frozen2022: baseFixed.yearly['2022']?.change ?? 0,
        worstDrawdownPeakYears: Object.fromEntries(
          [...new Set(portfolio.map((m) => new Date(m.dailyPercentPeak * 1000).toISOString().slice(0, 7)))]
            .sort()
            .map((month) => [
              month,
              portfolio.filter((m) => new Date(m.dailyPercentPeak * 1000).toISOString().slice(0, 7) === month).length
            ])
        )
      };

      if (design.startsWith('joint')) {
        fixed.forEach((m, index) => {
          const sample = samples.find((item) => item.pool === pool && item.design === design && item.index === index)!;

          jointRows.push({
            pool,
            design,
            sample: index,
            fixedNet: m.net,
            fixedMinuteDD: m.minuteDD,
            fixedDailyDD: m.dailyDD,
            fixedLots: m.lots,
            fixedWins: m.wins,
            fixedRealizedLosses: m.realizedLosses,
            fixedExposure: m.sessionsHeld / m.sessionsEligible,
            portfolioEnd: portfolio[index]!.endEquity,
            portfolioIncremental: portfolio[index]!.endEquity - c0.endEquity,
            portfolioDailyPercent: portfolio[index]!.dailyPercent,
            portfolioMinutePercent: portfolio[index]!.minutePercent,
            ...Object.fromEntries(
              sample.dimensions.map((dimension, d) => [
                `${dimension.symbol}.${shortNames[dimension.key]}`,
                sample.values[d]
              ])
            )
          });
        });
      }
    }

    A[pool] = {
      baseline: { fixed: fixedSummary(baseFixed), portfolio: portfolioSummary(basePortfolio, c0) },
      tornado,
      oat: {
        points: oatRows.filter((row) => row.pool === pool).length,
        feasible: oatFeasible.length,
        infeasible: oatRows.filter((row) => row.pool === pool && row.status === 'infeasible').length,
        boundary: oatRows.filter((row) => row.pool === pool && String(row.status).startsWith('boundary')).length,
        shareProfitable: share(oatFeasible.map((row) => (row.fixedNet as number) > 0)),
        fixedNet: distribution(oatFeasible.map((row) => row.fixedNet as number)),
        shareLotSetChanged: share(oatFeasible.map((row) => row.lotSetChanged === true))
      },
      designs
    };
  }

  out.A = A;

  // =============== B: years and regimes ===============

  const B: Record<string, unknown> = {};
  const yearlyRows: Record<string, unknown>[] = [];
  const regimeRows: Record<string, unknown>[] = [];
  const indexOfDate = (date: string) => {
    const index = dates.indexOf(date);

    if (index < 0) {
      throw new Error(`${date} is not a session of the data`);
    }

    return index;
  };
  // Daily rows start at session 1; the value at session 0's close is the start value.
  const valueAt = (
    daily: DailyRecord[],
    index: number,
    field: 'strategyMark' | 'equity' | 'cumulativeInterest',
    start: number
  ) => (index === 0 ? start : daily[index - 1]![field]);
  const years = [...new Set(dates.map(yearOf))];
  const lastIndexOfYear = (year: string) =>
    dates.reduce((last, date, index) => (yearOf(date) === year ? index : last), -1);

  const yearTable: Record<string, Record<string, unknown>[]> = {};

  for (const pool of poolIds) {
    const fixedDaily = detail[pool].fixed.daily;
    const portfolioDaily = detail[pool].portfolio.daily;
    const lots = detail[pool].fixed.lots;
    const fixedValues = fixedDaily.map((row) => row.strategyMark);
    const fixedPeak = (() => {
      // Global running peak (from 0) per session, for the depth reached within each year.
      const peaks: number[] = [];
      let peak = 0;

      for (const value of fixedValues) {
        peak = Math.max(peak, value);
        peaks.push(peak);
      }

      return peaks;
    })();
    const portfolioValues = portfolioDaily.map((row) => row.equity);
    const portfolioPeaks: number[] = [];
    let portfolioPeak = base.initialEquity;

    for (const value of portfolioValues) {
      portfolioPeak = Math.max(portfolioPeak, value);
      portfolioPeaks.push(portfolioPeak);
    }

    const c0Values = detail.C0.daily.map((row) => row.equity);
    const rows: Record<string, unknown>[] = [];
    let previousLast = 0; // the session whose close each year's attribution starts from (2016: the start value)

    for (const year of years) {
      const last = lastIndexOfYear(year);
      const from = previousLast;
      const fixedChange = valueAt(fixedDaily, last, 'strategyMark', 0) - valueAt(fixedDaily, from, 'strategyMark', 0);
      const interest =
        valueAt(fixedDaily, last, 'cumulativeInterest', 0) - valueAt(fixedDaily, from, 'cumulativeInterest', 0);
      const rowsInYear = fixedDaily.filter((row) => yearOf(row.date) === year);
      const depth = Math.max(
        0,
        ...fixedDaily.map((row, i) => (yearOf(row.date) === year ? fixedPeak[i]! - fixedValues[i]! : 0))
      );
      const portfolioDepth = Math.max(
        0,
        ...portfolioDaily.map((row, i) =>
          yearOf(row.date) === year ? (portfolioPeaks[i]! - portfolioValues[i]!) / portfolioPeaks[i]! : 0
        )
      );
      const startEquity = valueAt(portfolioDaily, from, 'equity', base.initialEquity);
      const endEquity = valueAt(portfolioDaily, last, 'equity', base.initialEquity);
      const c0Start = from === 0 ? base.initialEquity : c0Values[from - 1]!;
      const c0End = c0Values[last - 1]!;
      const row = {
        pool,
        year,
        label:
          year === '2016'
            ? 'no trading (arming from 2017-06-15)'
            : year === '2017'
              ? 'partial eligibility (from 2017-06-15)'
              : year === yearOf(base.end)
                ? `partial (to ${base.end})`
                : 'full',
        fixedChange,
        interest,
        lotsEntered: lots.filter((lot) => yearOf(lot.entryDate) === year).length,
        lotsExited: lots.filter((lot) => lot.exitDate && yearOf(lot.exitDate) === year).length,
        realizedByExitYear: sum(
          lots.filter((lot) => lot.exitDate && yearOf(lot.exitDate) === year).map((lot) => lot.net)
        ),
        openAtYearEnd: rowsInYear.at(-1)?.openLots ?? 0,
        openOwnerAtYearEnd: rowsInYear.at(-1)?.owners ?? '',
        deepestFixedDailyDD: depth,
        portfolioStart: startEquity,
        portfolioEnd: endEquity,
        portfolioReturn: endEquity / startEquity - 1,
        c0Return: c0End / c0Start - 1,
        incrementalChange: endEquity - c0End - (startEquity - c0Start),
        deepestPortfolioDailyPercent: portfolioDepth
      };

      rows.push(row);
      yearlyRows.push(row);
      previousLast = last;
    }

    // Leave-one-year-out (attribution only) and concentration by year.
    const total = sum(rows.map((row) => row.fixedChange as number));
    const sortedYears = [...rows].sort((a, b) => (b.fixedChange as number) - (a.fixedChange as number));
    const top1 = sortedYears[0]!;
    const top2 = sortedYears.slice(0, 2);

    yearTable[pool] = rows;
    B[pool] = {
      totalFixed: total,
      top1Year: top1.year,
      top1Share: (top1.fixedChange as number) / total,
      top2Years: top2.map((row) => row.year),
      top2Share: sum(top2.map((row) => row.fixedChange as number)) / total,
      worstYear: sortedYears.at(-1)!.year,
      worstYearChange: sortedYears.at(-1)!.fixedChange,
      negativeYears: rows.filter((row) => (row.fixedChange as number) < 0).map((row) => row.year),
      loyo: rows.map((row) => ({
        year: row.year,
        withoutYear: total - (row.fixedChange as number),
        withoutYearRatio: (total - (row.fixedChange as number)) / total
      }))
    };
  }

  // B5 − B4 by year.
  const diffByYear = years.map((year) => {
    const b4 = yearTable.B4!.find((row) => row.year === year)!;
    const b5 = yearTable.B5!.find((row) => row.year === year)!;

    return {
      year,
      fixedDifference: (b5.fixedChange as number) - (b4.fixedChange as number),
      portfolioDifference:
        (b5.portfolioEnd as number) -
        (b4.portfolioEnd as number) -
        ((b5.portfolioStart as number) - (b4.portfolioStart as number))
    };
  });
  const totalDiff = sum(diffByYear.map((row) => row.fixedDifference));

  B.difference = {
    byYear: diffByYear,
    total: totalDiff,
    largestYear: [...diffByYear].sort((a, b) => b.fixedDifference - a.fixedDifference)[0],
    largestYearShare: Math.max(...diffByYear.map((row) => row.fixedDifference)) / totalDiff
  };

  // Regimes.
  const lotsInWindow = (lots: LotRecord[], from: number, to: number) =>
    lots.filter((lot) => lot.entryIndex > from && lot.entryIndex <= to);
  const lotDaysInWindow = (lots: LotRecord[], fromDate: string, toDate: string) =>
    sum(
      lots.map((lot) => {
        const start = Math.max(Date.parse(lot.entryDate), Date.parse(fromDate));
        const end = Math.min(Date.parse(lot.exitDate || base.end), Date.parse(toDate));

        return end > start ? (end - start) / 86400000 : 0;
      })
    );
  const maeByLot: Record<PoolId, Map<number, Excursion>> = { B4: new Map(), B5: new Map() };

  for (const pool of poolIds) {
    for (const lot of detail[pool].fixed.lots) {
      maeByLot[pool].set(lot.id, excursionOf(universe, lot));
    }
  }

  for (const window of regimeWindows) {
    const from = indexOfDate(window.from);
    const to = indexOfDate(window.to);
    const row: Record<string, unknown> = {
      id: window.id,
      label: window.label,
      kind: window.kind,
      from: window.from,
      to: window.to
    };

    for (const pool of poolIds) {
      const fixedDaily = detail[pool].fixed.daily;
      const portfolioDaily = detail[pool].portfolio.daily;
      const lots = detail[pool].fixed.lots;
      const entered = lotsInWindow(lots, from, to);

      row[`${pool}.fixedChange`] =
        valueAt(fixedDaily, to, 'strategyMark', 0) - valueAt(fixedDaily, from, 'strategyMark', 0);
      row[`${pool}.interest`] =
        valueAt(fixedDaily, to, 'cumulativeInterest', 0) - valueAt(fixedDaily, from, 'cumulativeInterest', 0);
      row[`${pool}.lotsEntered`] = entered.length;
      row[`${pool}.lotDays`] = lotDaysInWindow(lots, window.from, window.to);
      row[`${pool}.worstMaePercent`] = entered.length
        ? Math.min(...entered.map((lot) => maeByLot[pool].get(lot.id)!.maePercent))
        : NaN;
      row[`${pool}.portfolioReturn`] =
        valueAt(portfolioDaily, to, 'equity', base.initialEquity) /
          valueAt(portfolioDaily, from, 'equity', base.initialEquity) -
        1;
    }

    row['C0.portfolioReturn'] =
      valueAt(detail.C0.daily, to, 'equity', base.initialEquity) /
        valueAt(detail.C0.daily, from, 'equity', base.initialEquity) -
      1;
    row['B5-B4.fixedChange'] = (row['B5.fixedChange'] as number) - (row['B4.fixedChange'] as number);
    regimeRows.push(row);
  }

  B.regimes = regimeRows;

  // The B5 − B4 difference by regime (stress + rebound of one R together).
  const regimeIds = [...new Set(regimeWindows.filter((window) => window.regime).map((window) => window.regime!))];
  const differenceByRegime = regimeIds.map((regime) => ({
    regime,
    fixedDifference: sum(
      regimeRows
        .filter((row) => regimeWindows.find((w) => w.id === row.id)?.regime === regime)
        .map((row) => row['B5-B4.fixedChange'] as number)
    )
  }));

  (B.difference as Record<string, unknown>).byRegime = differenceByRegime;
  (B.difference as Record<string, unknown>).largestRegimeShare =
    Math.max(...differenceByRegime.map((row) => row.fixedDifference)) / totalDiff;

  // Bootstrap (in-sample diagnostic only).
  const eligibility = universe.eligibilityIndex;
  // Daily changes of the marked strategy value from the first eligible session (earlier changes are all zero).
  const changes = (daily: DailyRecord[]) =>
    daily
      .map((row, i) => ({ index: row.index, change: row.strategyMark - (i === 0 ? 0 : daily[i - 1]!.strategyMark) }))
      .filter((row) => row.index >= eligibility)
      .map((row) => row.change);
  const b4Changes = changes(detail.B4.fixed.daily);
  const b5Changes = changes(detail.B5.fixed.daily);
  const diffChanges = b5Changes.map((value, index) => value - b4Changes[index]!);

  if (b4Changes.length !== dates.length - eligibility || b5Changes.length !== b4Changes.length) {
    throw new Error(`the bootstrap series hold ${b4Changes.length} sessions, not ${dates.length - eligibility}`);
  }

  const [b4Boot, b5Boot, diffBoot] = stationaryBootstrap(
    [b4Changes, b5Changes, diffChanges],
    bootstrap.blockLength,
    bootstrap.resamples,
    new Rng(deriveSeed(studyLabel, 'bootstrap'))
  );
  const bootSummary = (values: number[], actual: number) => ({
    actual,
    median: median(values),
    p05: quantile(values, 0.05),
    p25: quantile(values, 0.25),
    p75: quantile(values, 0.75),
    p95: quantile(values, 0.95),
    shareNonPositive: share(values.map((value) => value <= 0))
  });

  B.bootstrap = {
    sessions: b4Changes.length,
    blockLength: bootstrap.blockLength,
    resamples: bootstrap.resamples,
    B4: bootSummary(b4Boot!, sum(b4Changes)),
    B5: bootSummary(b5Boot!, sum(b5Changes)),
    difference: bootSummary(diffBoot!, sum(diffChanges))
  };
  out.B = B;

  // =============== C: books ===============

  const C: Record<string, unknown> = {};
  const ablationRows: Record<string, unknown>[] = [];

  for (const pool of poolIds) {
    const parentFixed = get(keys.base(pool, 'fixed'));
    const parentPortfolio = get(keys.base(pool, 'portfolio'));

    for (const book of pools[pool].books) {
      const fixed = get(keys.ablation(pool, book.symbol, 'fixed'));
      const portfolio = get(keys.ablation(pool, book.symbol, 'portfolio'));
      const parentLots = new Map(parentFixed.lotsBrief.map((lot) => [`${lot.symbol}@${lot.decisionTime}`, lot]));
      const ablatedLots = new Map(fixed.lotsBrief.map((lot) => [`${lot.symbol}@${lot.decisionTime}`, lot]));
      const removedBookLots = parentFixed.lotsBrief.filter((lot) => lot.symbol === book.symbol);
      const gained = fixed.lotsBrief.filter((lot) => !parentLots.has(`${lot.symbol}@${lot.decisionTime}`));
      const lost = parentFixed.lotsBrief.filter(
        (lot) => lot.symbol !== book.symbol && !ablatedLots.has(`${lot.symbol}@${lot.decisionTime}`)
      );

      ablationRows.push({
        pool,
        removed: book.symbol,
        fixedNet: fixed.net,
        bookIncrementalFixed: parentFixed.net - fixed.net,
        removedBookOwnNet: sum(removedBookLots.map((lot) => lot.net)),
        removedBookLots: removedBookLots.length,
        othersGainedLots: gained.length,
        othersGainedNet: sum(gained.map((lot) => lot.net)),
        othersLostLots: lost.length,
        othersLostNet: sum(lost.map((lot) => lot.net)),
        fixedLots: fixed.lots,
        fixedMinuteDD: fixed.minuteDD,
        bookMinuteDDImpact: parentFixed.minuteDD - fixed.minuteDD,
        fixedDailyDD: fixed.dailyDD,
        fixedExposure: fixed.sessionsHeld / fixed.sessionsEligible,
        fixedInterest: fixed.interest,
        fixedFriction: fixed.friction,
        fixedNetPerMinuteDD: fixed.net / fixed.minuteDD,
        portfolioEnd: portfolio.endEquity,
        bookIncrementalPortfolio: parentPortfolio.endEquity - portfolio.endEquity,
        portfolioCagr: portfolio.cagr,
        portfolioDailyPercent: portfolio.dailyPercent,
        bookDailyPercentImpact: parentPortfolio.dailyPercent - portfolio.dailyPercent,
        portfolioMinutePercent: portfolio.minutePercent,
        bookMinutePercentImpact: parentPortfolio.minutePercent - portfolio.minutePercent,
        portfolioDailyDollarDD: portfolio.dailyDD,
        portfolioIncrementalOverC0: portfolio.endEquity - c0.endEquity
      });
    }
  }

  C.ablations = ablationRows;

  // B5 − GDX against B4.
  const b5MinusGdxFixed = get(keys.ablation('B5', 'GDX', 'fixed'));
  const b5MinusGdxPortfolio = get(keys.ablation('B5', 'GDX', 'portfolio'));
  const b4Fixed = get(keys.base('B4', 'fixed'));
  const b4Portfolio = get(keys.base('B4', 'portfolio'));
  const strip = (m: Metrics) => JSON.stringify({ ...m, key: '', family: '', pool: '', meta: {}, specHash: '' });

  C.b5MinusGdxEqualsB4 = {
    fixed: strip(b5MinusGdxFixed) === strip(b4Fixed),
    portfolio: strip(b5MinusGdxPortfolio) === strip(b4Portfolio),
    fixedNet: [b5MinusGdxFixed.net, b4Fixed.net],
    portfolioEnd: [b5MinusGdxPortfolio.endEquity, b4Portfolio.endEquity]
  };

  // The B5 − B4 bridge (fixed): lots only B5 funded, only B4 funded, both.
  const lotKeyOf = (lot: LotRecord) => `${lot.symbol}@${lot.decisionTime}`;
  const b4Lots = new Map(detail.B4.fixed.lots.map((lot) => [lotKeyOf(lot), lot]));
  const b5Lots = new Map(detail.B5.fixed.lots.map((lot) => [lotKeyOf(lot), lot]));
  const regimeOf = (index: number) =>
    regimeWindows.find((window) => window.regime && index > indexOfDate(window.from) && index <= indexOfDate(window.to))
      ?.regime ?? 'outside R1–R4';
  const bridgeRows = [
    ...detail.B5.fixed.lots
      .filter((lot) => !b4Lots.has(lotKeyOf(lot)))
      .map((lot) => ({ kind: 'only B5', lot, contribution: lot.net })),
    ...detail.B4.fixed.lots
      .filter((lot) => !b5Lots.has(lotKeyOf(lot)))
      .map((lot) => ({ kind: 'only B4', lot, contribution: -lot.net })),
    ...detail.B5.fixed.lots
      .filter((lot) => b4Lots.has(lotKeyOf(lot)))
      .map((lot) => ({ kind: 'both', lot, contribution: lot.net - b4Lots.get(lotKeyOf(lot))!.net }))
  ]
    .map((row) => ({
      kind: row.kind,
      symbol: row.lot.symbol,
      entryDate: row.lot.entryDate,
      exitDate: row.lot.exitDate,
      exitYear: yearOf(row.lot.exitDate || base.end),
      regime: regimeOf(row.lot.entryIndex),
      exitReason: row.lot.exitReason,
      net: row.lot.net,
      contribution: row.contribution
    }))
    .sort((a, b) => b.contribution - a.contribution);
  const bridgeTotal = sum(bridgeRows.map((row) => row.contribution));
  const gdxOnly = bridgeRows.filter((row) => row.kind === 'only B5' && row.symbol === 'GDX');
  const displacedOnlyB5 = bridgeRows.filter((row) => row.kind === 'only B5' && row.symbol !== 'GDX');
  const onlyB4 = bridgeRows.filter((row) => row.kind === 'only B4');
  const bridgeByYear = [...new Set(bridgeRows.map((row) => row.exitYear))].sort().map((year) => ({
    year,
    gdx: sum(gdxOnly.filter((row) => row.exitYear === year).map((row) => row.contribution)),
    otherOnlyB5: sum(displacedOnlyB5.filter((row) => row.exitYear === year).map((row) => row.contribution)),
    onlyB4: sum(onlyB4.filter((row) => row.exitYear === year).map((row) => row.contribution)),
    total: sum(bridgeRows.filter((row) => row.exitYear === year).map((row) => row.contribution))
  }));
  const gdxSorted = [...gdxOnly].sort((a, b) => b.contribution - a.contribution);
  const gdxTotal = sum(gdxOnly.map((row) => row.contribution));

  C.bridge = {
    total: bridgeTotal,
    residual: bridgeTotal - (get(keys.base('B5', 'fixed')).net - b4Fixed.net),
    gdxLots: gdxOnly.length,
    gdxNet: gdxTotal,
    gdxWins: gdxOnly.filter((row) => row.net > 0).length,
    otherOnlyB5Lots: displacedOnlyB5.length,
    otherOnlyB5Net: sum(displacedOnlyB5.map((row) => row.contribution)),
    onlyB4Lots: onlyB4.length,
    onlyB4Net: sum(onlyB4.map((row) => row.contribution)),
    bothLots: bridgeRows.filter((row) => row.kind === 'both').length,
    bothNet: sum(bridgeRows.filter((row) => row.kind === 'both').map((row) => row.contribution)),
    gdxTop1Share: gdxSorted.length ? gdxSorted[0]!.contribution / bridgeTotal : NaN,
    gdxTop3Share: sum(gdxSorted.slice(0, 3).map((row) => row.contribution)) / bridgeTotal,
    gdxTop5Share: sum(gdxSorted.slice(0, 5).map((row) => row.contribution)) / bridgeTotal,
    byYear: bridgeByYear,
    byRegime: [...new Set(bridgeRows.map((row) => row.regime))].map((regime) => ({
      regime,
      total: sum(bridgeRows.filter((row) => row.regime === regime).map((row) => row.contribution)),
      gdx: sum(gdxOnly.filter((row) => row.regime === regime).map((row) => row.contribution))
    })),
    rows: bridgeRows
  };
  C.refusals = { B4: detail.B4.fixed.refusals, B5: detail.B5.fixed.refusals };
  out.C = C;

  // =============== D: costs and execution ===============

  const D: Record<string, unknown> = {};
  const costRows: Record<string, unknown>[] = [];

  for (const pool of poolIds) {
    const baseFixed = get(keys.base(pool, 'fixed'));
    const basePortfolio = get(keys.base(pool, 'portfolio'));
    const baseLots = detail[pool].fixed.lots;
    const baseKeys = new Map(baseFixed.lotsBrief.map((lot) => [`${lot.symbol}@${lot.decisionTime}`, lot]));

    for (const scenario of costScenarios) {
      const fixed = get(keys.scenario(pool, scenario.id, 'fixed'));
      const portfolio = get(keys.scenario(pool, scenario.id, 'portfolio'));
      const scenarioKeys = new Map(fixed.lotsBrief.map((lot) => [`${lot.symbol}@${lot.decisionTime}`, lot]));
      const added = fixed.lotsBrief.filter((lot) => !baseKeys.has(`${lot.symbol}@${lot.decisionTime}`));
      const removed = baseFixed.lotsBrief.filter((lot) => !scenarioKeys.has(`${lot.symbol}@${lot.decisionTime}`));
      const exitChanged = fixed.lotsBrief.filter((lot) => {
        const other = baseKeys.get(`${lot.symbol}@${lot.decisionTime}`);

        return other !== undefined && (other.exitTime !== lot.exitTime || other.exitReason !== lot.exitReason);
      });
      const recosted = scenario.stopFill === 'stop' ? sum(baseLots.map((lot) => recostLot(lot, scenario))) : NaN;

      costRows.push({
        pool,
        scenario: scenario.id,
        label: scenario.label,
        group: scenario.group,
        rate: scenario.rate,
        costBps: scenario.costBps,
        feeBps: scenario.feeBps,
        slippageBps: scenario.slippageBps,
        stopSlippageBps: scenario.stopSlippageBps,
        stopFill: scenario.stopFill,
        fixedNet: fixed.net,
        fixedNetChange: fixed.net - baseFixed.net,
        fixedNetChangeShare: (fixed.net - baseFixed.net) / baseFixed.net,
        sameTradesNet: recosted,
        costEffect: recosted - baseFixed.net,
        pathEffect: fixed.net - recosted,
        fixedInterest: fixed.interest,
        fixedFriction: fixed.friction,
        fixedLots: fixed.lots,
        lotsAdded: added.length,
        lotsRemoved: removed.length,
        exitsChanged: exitChanged.length,
        fixedMinuteDD: fixed.minuteDD,
        fixedDailyDD: fixed.dailyDD,
        fixedNetPerMinuteDD: fixed.net / fixed.minuteDD,
        netPerDDChangeShare: fixed.net / fixed.minuteDD / (baseFixed.net / baseFixed.minuteDD) - 1,
        portfolioEnd: portfolio.endEquity,
        portfolioEndChange: portfolio.endEquity - basePortfolio.endEquity,
        portfolioIncrementalOverC0: portfolio.endEquity - c0.endEquity,
        portfolioCagr: portfolio.cagr,
        portfolioDailyPercent: portfolio.dailyPercent,
        portfolioMinutePercent: portfolio.minutePercent,
        portfolioLots: portfolio.lots
      });
    }
  }

  // B5 − B4 by scenario.
  const differenceRows = costScenarios.map((scenario) => {
    const b4 = costRows.find((row) => row.pool === 'B4' && row.scenario === scenario.id)!;
    const b5 = costRows.find((row) => row.pool === 'B5' && row.scenario === scenario.id)!;

    return {
      scenario: scenario.id,
      label: scenario.label,
      fixedDifference: (b5.fixedNet as number) - (b4.fixedNet as number),
      portfolioDifference: (b5.portfolioEnd as number) - (b4.portfolioEnd as number),
      dailyPercentDifference: (b5.portfolioDailyPercent as number) - (b4.portfolioDailyPercent as number)
    };
  });
  const curve = (pool: PoolId, ids: string[], x: (id: string) => number, y: string) =>
    ids.map((id) => ({ x: x(id), y: costRows.find((row) => row.pool === pool && row.scenario === id)![y] as number }));
  const rateIds = ['r08', 'base', 'r14', 'r18'];
  const frictionIds = ['f00', 'f02', 'base', 'f10', 'f15', 'f20', 'f30', 'f45'];
  const breakEvens: Record<string, unknown> = {};

  for (const pool of poolIds) {
    for (const [name, ids, x] of [
      ['rate', rateIds, (id: string) => scenarioById(id).rate],
      ['friction', frictionIds, (id: string) => scenarioById(id).costBps]
    ] as const) {
      for (const measure of ['fixedNet', 'portfolioIncrementalOverC0']) {
        breakEvens[`${pool}.${name}.${measure}`] =
          breakEven(curve(pool, [...ids], x, measure)) ?? 'no sign change in the tested range';
      }
    }
  }

  for (const [name, ids, x] of [
    ['rate', rateIds, (id: string) => scenarioById(id).rate],
    ['friction', frictionIds, (id: string) => scenarioById(id).costBps]
  ] as const) {
    for (const measure of ['fixedDifference', 'portfolioDifference'] as const) {
      breakEvens[`B5-B4.${name}.${measure}`] =
        breakEven(ids.map((id) => ({ x: x(id), y: differenceRows.find((row) => row.scenario === id)![measure] }))) ??
        'no sign change in the tested range';
    }
  }

  D.rows = costRows;
  D.differences = differenceRows;
  D.breakEvens = breakEvens;
  out.D = D;

  // =============== E: trades ===============

  const E: Record<string, unknown> = {};
  const tradeRows: Record<string, unknown>[] = [];

  for (const pool of poolIds) {
    const lots = detail[pool].fixed.lots;
    const total = sum(lots.map((lot) => lot.net));
    const winners = lots.filter((lot) => lot.net > 0).sort((a, b) => b.net - a.net);
    const losers = lots.filter((lot) => lot.net < 0).sort((a, b) => a.net - b.net);
    const topShare = (n: number) => sum(winners.slice(0, n).map((lot) => lot.net)) / total;
    const statsOf = (subset: LotRecord[]) => {
      const nets = subset.map((lot) => lot.net);
      const winsNet = sum(nets.filter((net) => net > 0));
      const lossNet = sum(nets.filter((net) => net < 0));
      const excursions = subset.map((lot) => maeByLot[pool].get(lot.id)!);

      return {
        lots: subset.length,
        wins: nets.filter((net) => net > 0).length,
        losses: nets.filter((net) => net <= 0).length,
        winRate: subset.length ? nets.filter((net) => net > 0).length / subset.length : NaN,
        gross: sum(subset.map((lot) => lot.gross)),
        interest: sum(subset.map((lot) => lot.interest)),
        friction: sum(subset.map((lot) => lot.friction)),
        net: sum(nets),
        profitFactor: lossNet < 0 ? winsNet / -lossNet : null,
        medianNet: median(nets),
        meanNet: subset.length ? sum(nets) / subset.length : NaN,
        medianDays: median(subset.map((lot) => lot.lotDays)),
        meanDays: subset.length ? sum(subset.map((lot) => lot.lotDays)) / subset.length : NaN,
        lotDays: sum(subset.map((lot) => lot.lotDays)),
        medianMaePercent: median(excursions.map((x) => x.maePercent)),
        worstMaePercent: Math.min(...excursions.map((x) => x.maePercent)),
        p10MaePercent: quantile(
          excursions.map((x) => x.maePercent),
          0.1
        ),
        medianMfePercent: median(excursions.map((x) => x.mfePercent)),
        p90MfePercent: quantile(
          excursions.map((x) => x.mfePercent),
          0.9
        ),
        worstMaeDollars: Math.min(...excursions.map((x) => x.maeDollars))
      };
    };
    const books = pools[pool].books.map((book) => book.symbol);

    for (const lot of lots) {
      const x = maeByLot[pool].get(lot.id)!;

      tradeRows.push({
        pool,
        lot: lot.id,
        symbol: lot.symbol,
        setup: lot.setup,
        entryNewYork: new Date(lot.entryTime * 1000).toISOString(),
        exitNewYork: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open',
        entryDate: lot.entryDate,
        exitDate: lot.exitDate,
        exitReason: lot.exitReason,
        entryRawPrice: lot.entryRawPrice,
        exitRawPrice: lot.exitRawPrice,
        lotDays: lot.lotDays,
        gross: lot.gross,
        interest: lot.interest,
        friction: lot.friction,
        net: lot.net,
        maePercent: x.maePercent,
        maeDollars: x.maeDollars,
        maeTime: new Date(x.maeTime * 1000).toISOString(),
        mfePercent: x.mfePercent,
        mfeDollars: x.mfeDollars,
        engineWorstMark: lot.worstMark,
        bars: x.bars,
        regime: regimeOf(lot.entryIndex)
      });
    }

    // Lots held during the five deepest portfolio daily drawdown episodes (portfolio lots and dates).
    const portfolioDaily = detail[pool].portfolio.daily;
    const episodes = episodesOf(
      portfolioDaily.map((row) => row.date),
      portfolioDaily.map((row) => row.equity),
      base.initialEquity,
      dates[0]!
    )
      .sort((a, b) => b.depthPercent - a.depthPercent)
      .slice(0, 5);
    const portfolioLots = detail[pool].portfolio.lots;

    E[pool] = {
      total: statsOf(lots),
      byBook: Object.fromEntries(books.map((symbol) => [symbol, statsOf(lots.filter((lot) => lot.symbol === symbol))])),
      bySetup: Object.fromEntries(
        [...new Set(lots.map((lot) => lot.setup))].map((setup) => [
          setup,
          statsOf(lots.filter((lot) => lot.setup === setup))
        ])
      ),
      byExitReason: Object.fromEntries(
        [...new Set(lots.map((lot) => lot.exitReason))].map((reason) => [
          reason,
          {
            lots: lots.filter((lot) => lot.exitReason === reason).length,
            net: sum(lots.filter((lot) => lot.exitReason === reason).map((lot) => lot.net))
          }
        ])
      ),
      concentration: {
        total,
        top1: topShare(1),
        top3: topShare(3),
        top5: topShare(5),
        top10: topShare(10),
        withoutTop1: total - sum(winners.slice(0, 1).map((lot) => lot.net)),
        withoutTop3: total - sum(winners.slice(0, 3).map((lot) => lot.net)),
        withoutTop5: total - sum(winners.slice(0, 5).map((lot) => lot.net)),
        withoutTop10: total - sum(winners.slice(0, 10).map((lot) => lot.net)),
        largestLoss: losers[0]?.net ?? 0,
        worst5Losses: sum(losers.slice(0, 5).map((lot) => lot.net)),
        allLosses: sum(losers.map((lot) => lot.net)),
        topWinners: winners
          .slice(0, 10)
          .map((lot) => ({ symbol: lot.symbol, entryDate: lot.entryDate, exitDate: lot.exitDate, net: lot.net })),
        topLosers: losers.slice(0, 10).map((lot) => ({
          symbol: lot.symbol,
          entryDate: lot.entryDate,
          exitDate: lot.exitDate,
          exitReason: lot.exitReason,
          net: lot.net,
          maePercent: maeByLot[pool].get(lot.id)!.maePercent
        })),
        byBookShare: Object.fromEntries(
          books.map((symbol) => [
            symbol,
            sum(lots.filter((lot) => lot.symbol === symbol).map((lot) => lot.net)) / total
          ])
        ),
        openAtEnd: lots.filter((lot) => lot.exitIndex < 0).length
      },
      lossesByRegime: Object.fromEntries(
        [...new Set(lots.map((lot) => regimeOf(lot.entryIndex)))].map((regime) => [
          regime,
          {
            losingLots: lots.filter((lot) => regimeOf(lot.entryIndex) === regime && lot.net < 0).length,
            losses: sum(lots.filter((lot) => regimeOf(lot.entryIndex) === regime && lot.net < 0).map((lot) => lot.net)),
            net: sum(lots.filter((lot) => regimeOf(lot.entryIndex) === regime).map((lot) => lot.net))
          }
        ])
      ),
      worstMae: [...lots]
        .sort((a, b) => maeByLot[pool].get(a.id)!.maePercent - maeByLot[pool].get(b.id)!.maePercent)
        .slice(0, 10)
        .map((lot) => ({
          symbol: lot.symbol,
          entryDate: lot.entryDate,
          exitDate: lot.exitDate,
          exitReason: lot.exitReason,
          maePercent: maeByLot[pool].get(lot.id)!.maePercent,
          maeDollars: maeByLot[pool].get(lot.id)!.maeDollars,
          net: lot.net
        })),
      drawdownEpisodeLots: episodes.map((episode) => ({
        ...episode,
        lots: portfolioLots
          .filter(
            (lot) => lot.entryDate <= episode.troughDate && (lot.exitDate === '' || lot.exitDate >= episode.peakDate)
          )
          .map((lot) => ({ symbol: lot.symbol, entryDate: lot.entryDate, exitDate: lot.exitDate, net: lot.net }))
      }))
    };
  }

  out.E = E;

  // =============== F: dynamic portfolio ===============

  const F: Record<string, unknown> = {};
  const portfolioRows: Record<string, unknown>[] = [];
  const episodeRows: Record<string, unknown>[] = [];
  const subjects: { id: string; metrics: Metrics; daily?: DailyRecord[] }[] = [
    { id: 'C0', metrics: c0, daily: detail.C0.daily },
    { id: 'B4', metrics: get(keys.base('B4', 'portfolio')), daily: detail.B4.portfolio.daily },
    { id: 'B5', metrics: get(keys.base('B5', 'portfolio')), daily: detail.B5.portfolio.daily },
    { id: 'B4 symmetric dividends', metrics: get(keys.symmetric('B4')) },
    { id: 'B5 symmetric dividends', metrics: get(keys.symmetric('B5')) },
    ...poolIds.flatMap((pool) =>
      ['C1', 'C2', 'C3'].map((id) => ({ id: `${pool} ${id}`, metrics: get(keys.scenario(pool, id, 'portfolio')) }))
    )
  ];

  for (const subject of subjects) {
    const m = subject.metrics;
    const row: Record<string, unknown> = {
      id: subject.id,
      initial: base.initialEquity,
      endEquity: m.endEquity,
      totalReturn: m.totalReturn,
      cagr: m.cagr,
      incrementalOverC0: m.endEquity - c0.endEquity,
      dailyPercent: m.dailyPercent,
      dailyPercentDollars: m.dailyPercentDollars,
      dailyPercentPeak: new Date(m.dailyPercentPeak * 1000).toISOString().slice(0, 10),
      dailyPercentTrough: new Date(m.dailyPercentTrough * 1000).toISOString().slice(0, 10),
      dailyPercentRecovery: Number.isFinite(m.dailyPercentRecovery)
        ? new Date(m.dailyPercentRecovery * 1000).toISOString().slice(0, 10)
        : 'not recovered',
      minutePercent: m.minutePercent,
      minutePercentDollars: m.minutePercentDollars,
      minutePercentPeak: new Date(m.minutePercentPeak * 1000).toISOString(),
      minutePercentTrough: new Date(m.minutePercentTrough * 1000).toISOString(),
      largestDailyDollarDD: m.dailyDD,
      largestMinuteDollarDD: m.minuteDD,
      incrementalDailyPercent: m.dailyPercent - c0.dailyPercent,
      incrementalMinutePercent: m.minutePercent - c0.minutePercent,
      strategyNet: m.net,
      interest: m.interest,
      lots: m.lots,
      timeWithLot: m.sessionsEligible ? m.sessionsHeld / m.sessionsEligible : 0,
      maxPrincipal: m.maxPrincipal,
      maxDebtToEquity: m.maxDebtToEquity,
      cagrPerDailyDD: m.cagr / m.dailyPercent,
      over30: m.dailyPercent > gates.riskPreferred || m.minutePercent > gates.riskPreferred,
      over35: m.dailyPercent > gates.riskTolerance || m.minutePercent > gates.riskTolerance,
      ...Object.fromEntries(
        schedules.flatMap((schedule) => {
          const entry = m.minimum[schedule] as { ratio: number; dailyRatio: number; time: number } | null;

          return [
            [`min.${schedule}`, entry?.ratio ?? NaN],
            [
              `minDate.${schedule}`,
              entry && Number.isFinite(entry.time) ? new Date(entry.time * 1000).toISOString().slice(0, 10) : ''
            ]
          ];
        })
      )
    };

    portfolioRows.push(row);

    if (subject.daily) {
      const daily = subject.daily;
      const episodes = episodesOf(
        daily.map((r) => r.date),
        daily.map((r) => r.equity),
        base.initialEquity,
        dates[0]!
      );
      const top = [...episodes].sort((a, b) => b.depthPercent - a.depthPercent).slice(0, 5);

      top.forEach((episode, rank) => episodeRows.push({ id: subject.id, rank: rank + 1, ...episode }));
      row.longestUnderwaterSessions = Math.max(...episodes.map((episode) => episode.sessionsUnderwater));
      row.recheckDailyPercent = runningPeakDrawdown(
        daily.map((r) => r.equity),
        base.initialEquity
      ).percent;
    }
  }

  // The worst single portfolio lot as a share of the equity at its decision (principal = 20% of that equity).
  F.worstLotShareOfEquity = Object.fromEntries(
    poolIds.map((pool) => {
      const worst = [...detail[pool].portfolio.lots].sort(
        (a, b) => a.net / (a.principal / base.borrowedFraction) - b.net / (b.principal / base.borrowedFraction)
      )[0]!;

      return [
        pool,
        {
          share: worst.net / (worst.principal / base.borrowedFraction),
          symbol: worst.symbol,
          entryDate: worst.entryDate,
          net: worst.net
        }
      ];
    })
  );
  F.rows = portfolioRows;
  F.episodes = episodeRows;
  out.F = F;

  // =============== Gates (PROTOCOL.md §10) ===============

  const gateResults: Record<string, unknown> = {};

  for (const pool of poolIds) {
    const designs = (A[pool] as { designs: Record<string, { shareProfitable: number; medianNetRatio: number }> })
      .designs;
    const primary = designs['joint-s1']!;
    const yearShare = (B[pool] as { top1Share: number }).top1Share;
    const top3 = (E[pool] as { concentration: { top3: number } }).concentration.top3;
    const totalFixed = get(keys.base(pool, 'fixed')).net;
    const riskSubjects = gates.riskScenarios.map((id) =>
      id === 'base' ? get(keys.base(pool, 'portfolio')) : get(keys.scenario(pool, id, 'portfolio'))
    );
    const maxDaily = Math.max(...riskSubjects.map((m) => m.dailyPercent));
    const maxMinute = Math.max(...riskSubjects.map((m) => m.minutePercent));
    const basePortfolio = get(keys.base(pool, 'portfolio'));
    const moderate = gates.moderateCostScenarios.map((id) =>
      costRows.find((row) => row.pool === pool && row.scenario === id)!
    );
    const c1 = costRows.find((row) => row.pool === pool && row.scenario === 'C1')!;
    const gate: Record<string, unknown> = {
      A: {
        shareProfitable: primary.shareProfitable,
        medianNetRatio: primary.medianNetRatio,
        flag:
          primary.shareProfitable < gates.stabilityProfitableShare ||
          primary.medianNetRatio < gates.stabilityMedianRatio
      },
      B: {
        top1YearShare: yearShare,
        top3LotsShare: top3,
        flag: totalFixed <= 0 || yearShare > gates.concentrationShare || top3 > gates.concentrationShare
      },
      D: {
        maxDailyPercent: maxDaily,
        maxMinutePercent: maxMinute,
        D35: maxDaily > gates.riskTolerance || maxMinute > gates.riskTolerance,
        D30: maxDaily > gates.riskPreferred || maxMinute > gates.riskPreferred,
        Dplus: basePortfolio.dailyPercent > c0.dailyPercent || basePortfolio.minutePercent > c0.minutePercent,
        baseDailyVsC0: basePortfolio.dailyPercent - c0.dailyPercent,
        baseMinuteVsC0: basePortfolio.minutePercent - c0.minutePercent
      },
      E: {
        moderate: moderate.map((row) => ({
          scenario: row.scenario,
          fixedNet: row.fixedNet,
          incremental: row.portfolioIncrementalOverC0
        })),
        c1NetFall: -(c1.fixedNetChangeShare as number),
        c1NetPerDDFall: -(c1.netPerDDChangeShare as number),
        flag:
          moderate.some((row) => (row.fixedNet as number) <= 0 || (row.portfolioIncrementalOverC0 as number) <= 0) ||
          -(c1.fixedNetChangeShare as number) > gates.costFallShare ||
          -(c1.netPerDDChangeShare as number) > gates.costFallShare
      }
    };

    gateResults[pool] = gate;
  }

  const small = gates.gdxSmallCostScenarios.map((id) => differenceRows.find((row) => row.scenario === id)!);
  const difference = B.difference as { largestYearShare: number; largestRegimeShare: number };

  (gateResults.B5 as Record<string, unknown>).C = {
    smallCost: small,
    largestYearShare: difference.largestYearShare,
    largestRegimeShare: difference.largestRegimeShare,
    flag:
      small.some((row) => row.fixedDifference <= 0 || row.portfolioDifference <= 0) ||
      difference.largestYearShare > gates.gdxSingleShare ||
      difference.largestRegimeShare > gates.gdxSingleShare
  };

  const baselineRecord = JSON.parse(await fs.readFile(resultDir('baseline', 'baseline.json'), 'utf8')) as {
    passed: boolean;
    checks: { pass: boolean }[];
  };

  gateResults.F = {
    baselinePassed: baselineRecord.passed,
    baselineChecks: baselineRecord.checks.length,
    recomputedPercentMatches: portfolioRows
      .filter((row) => row.recheckDailyPercent !== undefined)
      .every((row) => Math.abs((row.recheckDailyPercent as number) - (row.dailyPercent as number)) <= 1e-9),
    minuteAtLeastDaily: [...stored.values()].every((m) => m.minuteDD >= m.dailyDD - 1e-9),
    b5MinusGdxEqualsB4: C.b5MinusGdxEqualsB4,
    bridgeResidual: (C.bridge as { residual: number }).residual,
    flag: !baselineRecord.passed
  };
  out.gates = gateResults;
  out.runs = { stored: stored.size, specifications: specs.length, members: auditMembers };

  await writeJson(resultDir('analysis.json'), out);
  await writeText(resultDir('A_oat.csv'), toCsv(oatRows));
  await writeText(resultDir('A_joint_samples.csv'), toCsv(jointRows));
  await writeText(resultDir('B_yearly.csv'), toCsv(yearlyRows));
  await writeText(resultDir('B_regimes.csv'), toCsv(regimeRows));
  await writeText(resultDir('C_ablation.csv'), toCsv(ablationRows));
  await writeText(resultDir('C_bridge_B5_vs_B4.csv'), toCsv(bridgeRows));
  await writeText(resultDir('D_costs.csv'), toCsv(costRows));
  await writeText(resultDir('D_B5_minus_B4.csv'), toCsv(differenceRows));
  await writeText(resultDir('E_trades.csv'), toCsv(tradeRows));
  await writeText(resultDir('F_portfolio.csv'), toCsv(portfolioRows));
  await writeText(resultDir('F_drawdown_episodes.csv'), toCsv(episodeRows));
  console.log(
    `[analyze] ${stored.size} stored runs analysed in ${Math.round((Date.now() - started) / 1000)} s → ${resultDir('analysis.json')}`
  );
};
