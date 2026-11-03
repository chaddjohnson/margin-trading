// One audit run: a RunSpec on the loaded canonical universe through the frozen N-book engine, configured exactly as
// src/pools/run.ts (runPoolOn) configures a pool run, and the compact figures every report reads. Pure: no file, no
// clock, no randomness, so a worker thread and the main thread give identical results.
import { lotDays } from '../joint-16-etf-d1/figures.ts';
import { paramsOf } from '../multi-etf-allocator/phenotypes.ts';
import {
  type BookPhenotype,
  type NRunResult,
  type NUniverse,
  baseNRunConfig,
  runNAllocator
} from '../portfolio-aware-d1/nbook/engine.ts';
import { shortLabel } from '../multi-etf-allocator/phenotypes.ts';
import { base, schedules } from './context.ts';
import { type RunSpec, specHash } from './specs.ts';

export const membersOf = (spec: RunSpec) => {
  const symbols = spec.books.map((book) => book.symbol);

  return spec.mode === 'portfolio' ? [...new Set(['VOOG', 'VGT', ...symbols])] : symbols;
};

export const phenotypesOf = (spec: RunSpec): Record<string, BookPhenotype> =>
  Object.fromEntries(
    spec.books.map((book) => [
      book.symbol,
      {
        symbol: book.symbol,
        name: book.phenotype,
        params: paramsOf(book.symbol, book.phenotype, book.grid),
        short: shortLabel(book.grid)
      }
    ])
  );

export const runSpec = (universe: NUniverse, spec: RunSpec): NRunResult => {
  const members = membersOf(spec);

  return runNAllocator(
    {
      ...universe,
      instruments: Object.fromEntries(members.map((symbol) => [symbol, universe.instruments[symbol]!]))
    },
    baseNRunConfig({
      key: spec.key,
      label: spec.key,
      mode: spec.mode,
      symbols: spec.books.map((book) => book.symbol),
      phenotypes: phenotypesOf(spec),
      costBps: spec.costBps,
      fraction: base.borrowedFraction,
      fixedPrincipal: base.notional,
      rate: spec.rate,
      stopFill: spec.stopFill,
      stopSlippageBps: spec.stopSlippageBps,
      lotDividends: spec.dividends === 'frozen',
      initial: { voog: base.initialEquity * 0.6, vgt: base.initialEquity * 0.4 },
      eligibilityIndex: universe.eligibilityIndex,
      accountingStartIndex: 0
    })
  );
};

const yearOf = (date: string) => date.slice(0, 4);

// The compact per-lot record every analysis reads (fixed and portfolio lots alike).
// `gross` is before every cost (shares × (raw exit − raw entry), the pools ledger's definition); the engine's own lot
// gross is after friction, so gross − friction − interest = net is an identity the tests check.
export const lotRecordsOf = (result: NRunResult) =>
  result.lots.map((lot) => {
    const friction =
      lot.shares * (lot.entryPrice - lot.entryRawPrice) +
      (lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0);

    return {
      id: lot.id,
      symbol: lot.symbol,
      setup: lot.trade.setupKind,
      decisionTime: lot.decisionTime,
      decisionIndex: lot.decisionIndex,
      entryIndex: lot.entryIndex,
      entryBar: lot.entryBar,
      entryTime: lot.entryTime,
      entryRawPrice: lot.entryRawPrice,
      entryPrice: lot.entryPrice,
      shares: lot.shares,
      principal: lot.originalPrincipal,
      exitIndex: lot.exitIndex,
      exitBar: lot.exitBar,
      exitTime: lot.exitIndex >= 0 ? lot.exitTime : NaN,
      exitRawPrice: lot.exitIndex >= 0 ? lot.exitRawPrice : NaN,
      exitPrice: lot.exitIndex >= 0 ? lot.exitPrice : NaN,
      exitReason: lot.exitIndex >= 0 ? lot.exitReason : 'open',
      exitExecution: lot.exitIndex >= 0 ? lot.exitExecution : '',
      interest: lot.interest,
      friction,
      engineGross: lot.gross,
      gross: lot.gross + friction,
      net: lot.net,
      dividends: lot.dividends,
      worstMark: lot.worstMark,
      worstMarkTime: lot.worstMarkTime,
      lotDays: lotDays(result, lot),
      entryDate: result.universe.dates[lot.entryIndex]!,
      exitDate: lot.exitIndex >= 0 ? result.universe.dates[lot.exitIndex]! : ''
    };
  });

export type LotRecord = ReturnType<typeof lotRecordsOf>[number];

export const dailyRecordsOf = (result: NRunResult) =>
  result.daily.map((row) => ({
    index: row.index,
    date: row.date,
    strategyMark: row.strategyMark,
    realized: row.realized,
    unrealized: row.unrealized,
    cumulativeInterest: row.cumulativeInterest,
    openLots: row.openLots,
    owners: row.owners,
    equity: row.equity,
    principal: row.principal,
    debtToEquity: row.debtToEquity,
    equityToLmv: row.equityToLmv,
    cumulativeDividends: row.cumulativeDividends
  }));

export type DailyRecord = ReturnType<typeof dailyRecordsOf>[number];

// The running-peak percentage drawdown of a value series (the largest fall relative to its own running peak).
export const runningPeakDrawdown = (values: readonly number[], start: number) => {
  let peak = start;
  let peakIndex = -1;
  let worst = { percent: 0, dollars: 0, peakIndex: -1, troughIndex: -1 };

  values.forEach((value, index) => {
    if (value >= peak) {
      peak = value;
      peakIndex = index;
    }

    const percent = peak > 0 ? (peak - value) / peak : 0;

    if (percent > worst.percent) {
      worst = { percent, dollars: peak - value, peakIndex, troughIndex: index };
    }
  });

  return worst;
};

// The largest dollar drawdown of a value series (strictly new peaks, as the fixed-pool tracker).
export const dollarDrawdown = (values: readonly number[], start: number) => {
  let peak = start;
  let worst = 0;

  for (const value of values) {
    peak = Math.max(peak, value);
    worst = Math.max(worst, peak - value);
  }

  return worst;
};

export const lotKey = (lot: { symbol: string; decisionTime: number }) => `${lot.symbol}@${lot.decisionTime}`;

// A small deterministic string hash (FNV-1a, 32-bit) for lot-set identity; collisions only affect a convenience label,
// never a figure (every comparison uses the lot lists themselves).
const simpleHash = (text: string) => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
};

export const metricsOf = (result: NRunResult, spec: RunSpec) => {
  const lots = lotRecordsOf(result);
  const daily = result.daily;
  const isPortfolio = spec.mode === 'portfolio';
  const startValue = isPortfolio ? base.initialEquity : 0;
  const eligibility = result.universe.eligibilityIndex;
  const closed = lots.filter((lot) => lot.exitIndex >= 0);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const net = sum(lots.map((lot) => lot.net));
  const winsNet = sum(lots.filter((lot) => lot.net > 0).map((lot) => lot.net));
  const lossesNet = sum(lots.filter((lot) => lot.net < 0).map((lot) => lot.net));
  const values = daily.map((row) => (isPortfolio ? row.equity : row.strategyMark));
  const yearly: Record<string, { change: number; interest: number; entered: number; exited: number; net: number }> = {};
  let previousValue = startValue;
  let previousInterest = 0;

  daily.forEach((row, index) => {
    const year = yearOf(row.date);
    const isLast = index === daily.length - 1 || yearOf(daily[index + 1]!.date) !== year;

    yearly[year] ??= { change: 0, interest: 0, entered: 0, exited: 0, net: 0 };

    if (isLast) {
      const value = values[index]!;

      yearly[year].change = value - previousValue;
      yearly[year].interest = row.cumulativeInterest - previousInterest;
      previousValue = value;
      previousInterest = row.cumulativeInterest;
    }
  });

  for (const lot of lots) {
    yearly[yearOf(lot.entryDate)]!.entered++;

    if (lot.exitIndex >= 0) {
      yearly[yearOf(lot.exitDate)]!.exited++;
      yearly[yearOf(lot.exitDate)]!.net += lot.net;
    }
  }

  const bySymbol: Record<string, { lots: number; net: number; wins: number; lotDays: number }> = {};

  for (const lot of lots) {
    bySymbol[lot.symbol] ??= { lots: 0, net: 0, wins: 0, lotDays: 0 };
    bySymbol[lot.symbol]!.lots++;
    bySymbol[lot.symbol]!.net += lot.net;
    bySymbol[lot.symbol]!.wins += lot.net > 0 ? 1 : 0;
    bySymbol[lot.symbol]!.lotDays += lot.lotDays;
  }

  const eligibleRows = daily.filter((row) => row.index >= eligibility);
  const minuteDD = result.minuteDrawdown.maximum;
  const dailyDD = result.dailyDrawdown.maximum;
  const recomputed = runningPeakDrawdown(values, startValue);
  const last = daily.at(-1)!;
  const firstTime = Date.parse(`${result.universe.dates[0]}T00:00:00Z`);
  const lastTime = Date.parse(`${last.date}T00:00:00Z`);
  const years = (lastTime - firstTime) / 86400000 / 365.25;
  const minimum = Object.fromEntries(
    schedules.map((schedule) => {
      const entry = result.minimum[schedule];

      return [schedule, entry ? { ratio: entry.ratio, dailyRatio: entry.dailyRatio, time: entry.time } : null];
    })
  );
  const lotKeys = lots.map((lot) => `${lotKey(lot)}>${lot.exitIndex >= 0 ? lot.exitTime : 'open'}:${lot.exitReason}`);

  return {
    key: spec.key,
    family: spec.family,
    pool: spec.pool,
    mode: spec.mode,
    specHash: specHash(spec),
    meta: spec.meta,
    endDate: last.date,
    lots: lots.length,
    virtualTrades: result.trades.length,
    signals: result.signals.length,
    refused: result.signals.filter((signal) => signal.outcome === 'refused').length,
    openAtEnd: lots.length - closed.length,
    net,
    gross: sum(lots.map((lot) => lot.gross)),
    interest: sum(lots.map((lot) => lot.interest)),
    friction: sum(lots.map((lot) => lot.friction)),
    wins: lots.filter((lot) => lot.net > 0).length,
    losses: lots.filter((lot) => lot.net <= 0).length,
    realizedLosses: sum(closed.filter((lot) => lot.net < 0).map((lot) => lot.net)),
    worstLot: Math.min(0, ...lots.map((lot) => lot.net)),
    bestLot: Math.max(0, ...lots.map((lot) => lot.net)),
    profitFactor: lossesNet < 0 ? winsNet / -lossesNet : null, // null: no losing lot (∞)
    lotDays: sum(lots.map((lot) => lot.lotDays)),
    borrowingDollarDays: sum(lots.map((lot) => lot.principal * lot.lotDays)),
    sessionsHeld: eligibleRows.filter((row) => row.openLots > 0).length,
    sessionsEligible: eligibleRows.length,
    minuteDD,
    minuteDDPeak: result.minuteDrawdown.peakTime,
    minuteDDTrough: result.minuteDrawdown.troughTime,
    dailyDD,
    strategyMinuteDD: result.strategyMinuteDrawdown.maximum,
    strategyDailyDD: result.strategyDailyDrawdown.maximum,
    endEquity: isPortfolio ? last.equity : NaN,
    totalReturn: isPortfolio ? last.equity / startValue - 1 : NaN,
    cagr: isPortfolio ? (last.equity / startValue) ** (1 / years) - 1 : NaN,
    dailyPercent: result.dailyPercentDrawdown?.maximumPercent ?? NaN,
    dailyPercentDollars: result.dailyPercentDrawdown?.dollars ?? NaN,
    dailyPercentPeak: result.dailyPercentDrawdown?.peakTime ?? NaN,
    dailyPercentTrough: result.dailyPercentDrawdown?.troughTime ?? NaN,
    dailyPercentRecovery: result.dailyPercentDrawdown?.recoveryTime ?? NaN,
    minutePercent: result.minutePercentDrawdown?.maximumPercent ?? NaN,
    minutePercentDollars: result.minutePercentDrawdown?.dollars ?? NaN,
    minutePercentPeak: result.minutePercentDrawdown?.peakTime ?? NaN,
    minutePercentTrough: result.minutePercentDrawdown?.troughTime ?? NaN,
    recomputedDailyPercent: isPortfolio ? recomputed.percent : NaN,
    recomputedDailyDollarDD: dollarDrawdown(values, startValue),
    maxPrincipal: Math.max(0, ...daily.map((row) => row.principal)),
    maxDebtToEquity: isPortfolio ? Math.max(0, ...daily.map((row) => row.debtToEquity).filter(Number.isFinite)) : NaN,
    minimum,
    lotDividends: result.dividends.filter((row) => row.source === 'lot').reduce((total, row) => total + row.value, 0),
    coreDividends: result.dividends.filter((row) => row.source === 'core').reduce((total, row) => total + row.value, 0),
    finalStrategyMark: last.strategyMark,
    finalCumulativeInterest: last.cumulativeInterest,
    yearly,
    bySymbol,
    lotSetHash: lotKeys.length ? lotKeys.join('|').length + ':' + simpleHash(lotKeys.join('|')) : 'empty',
    lotsBrief: lots.map((lot) => ({
      symbol: lot.symbol,
      decisionTime: lot.decisionTime,
      entryDate: lot.entryDate,
      exitDate: lot.exitDate,
      exitTime: lot.exitTime,
      exitReason: lot.exitReason,
      net: lot.net,
      interest: lot.interest,
      friction: lot.friction,
      lotDays: lot.lotDays
    }))
  };
};

export type RunMetrics = ReturnType<typeof metricsOf>;

export interface RunOutput {
  metrics: RunMetrics;
  lots?: LotRecord[];
  daily?: DailyRecord[];
  refusals?: { symbol: string; holder: string; count: number }[];
}

export const executeSpec = (universe: NUniverse, spec: RunSpec, precomputed?: NRunResult): RunOutput => {
  const result = precomputed ?? runSpec(universe, spec);
  const metrics = metricsOf(result, spec);

  // The bulk neighbourhood families keep the lot-set identity only (the files stay small); the others keep each lot.
  if (['oat', 'boundary', 'joint', 'book'].includes(spec.family)) {
    metrics.lotsBrief = [];
  }

  if (!spec.detail) {
    return { metrics };
  }

  const refusals = new Map<string, number>();

  for (const signal of result.signals) {
    if (signal.outcome === 'refused') {
      const holder = signal.occupiedBy.split('+')[0]!.split(' ')[0]!;
      const key = `${signal.symbol}|${holder}`;

      refusals.set(key, (refusals.get(key) ?? 0) + 1);
    }
  }

  return {
    metrics,
    lots: lotRecordsOf(result),
    daily: dailyRecordsOf(result),
    refusals: [...refusals.entries()].map(([key, count]) => {
      const [symbol, holder] = key.split('|');

      return { symbol: symbol!, holder: holder!, count };
    })
  };
};
