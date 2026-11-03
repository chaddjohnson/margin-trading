// One run of this study: a specification on a loaded universe through the frozen N-book engine, called through the
// completed B4/B5 audit's pure runner (src/b4-b5-robustness/run.ts runSpec/metricsOf, configured exactly as
// src/pools/run.ts runPoolOn), plus what this study adds on top of the engine's own accounting:
//
//   - the liquidation-equivalent view of the source study's Stage A (an open lot at the last close counted at its
//     liquidation value: exit friction and interest to that session included), so stored and new figures compare;
//   - per lot: the arming (activation) session and price, the setup path (deep or continuation), the minute-bar
//     adverse/favourable excursion (the prior audit's excursionOf) and the capital-occupied days;
//   - for fold runs: the incremental liquidation-equivalent mark over the validation window.
//
// Pure: no file, no clock, no randomness, so a worker thread and the main thread give identical results.
import { excursionOf } from '../b4-b5-robustness/analysis.ts';
import { type LotRecord, lotRecordsOf, metricsOf, runSpec } from '../b4-b5-robustness/run.ts';
import type { RunSpec as PriorSpec } from '../b4-b5-robustness/specs.ts';
import type { NRunResult, NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import type { Grid } from './inventory.ts';

export type Mode = 'fixed' | 'portfolio';
export type Family = 'parity' | 'base' | 'oat' | 'joint' | 'cost' | 'incumbent' | 'fold' | 'causality';

export interface Book {
  symbol: string;
  phenotype: string;
  grid: Grid;
}

export interface Spec {
  key: string;
  family: Family;
  subject: string; // a phenotype id (e.g. GDX:representative), VGT-primary, B4, B5 or C0
  window: 'final' | 'fold-a' | 'fold-b' | 'all';
  mode: Mode;
  books: Book[];
  scenario: string; // a cost scenario id (src/b4-b5-robustness/context.ts)
  rate: number;
  costBps: number;
  stopSlippageBps: number;
  stopFill: 'stop' | 'next-open';
  boundaryDate?: string; // fold runs: the last session of the search window
  keepDaily: boolean;
  meta: Record<string, string | number | boolean>;
}

export const asPriorSpec = (spec: Spec): PriorSpec => ({
  key: spec.key,
  family: 'base',
  pool: 'C0',
  mode: spec.mode,
  books: spec.books.map((book) => ({ symbol: book.symbol, phenotype: book.phenotype, grid: { ...book.grid } })),
  rate: spec.rate,
  costBps: spec.costBps,
  stopSlippageBps: spec.stopSlippageBps,
  stopFill: spec.stopFill,
  dividends: 'frozen',
  diagnostic: true,
  detail: false,
  meta: spec.meta
});

const secondsPerYear = 365 * 86400;

// The source study's fixed liquidation (src/d1-ranked-preemption/allocation.ts fixedLiquidation), restated for one
// lot: proceeds at the raw price less the per-side cost, interest from the entry session's midnight.
export const liquidationOf = (
  lot: Pick<LotRecord, 'shares' | 'principal'> & { entryTimestamp: number },
  rawPrice: number,
  sessionTime: number,
  rate: number,
  costBps: number
) => {
  const price = rawPrice * (1 - costBps / 10000);
  const proceeds = lot.shares * price;
  const interest = lot.principal * rate * ((sessionTime - lot.entryTimestamp) / secondsPerYear);

  return { price, proceeds, interest, net: proceeds - lot.principal - interest };
};

export interface CompactLot {
  id: number;
  symbol: string;
  setup: string;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  trailingLow: number;
  decisionIndex: number;
  decisionTime: number;
  entryIndex: number;
  entryTime: number;
  entryRawPrice: number;
  entryPrice: number;
  shares: number;
  principal: number;
  exitIndex: number; // -1: open at the end
  exitTime: number;
  exitRawPrice: number; // the last close for an open lot
  exitReason: string;
  interest: number; // to the exit (or the last session)
  friction: number; // entry and exit (an open lot: the liquidation's exit friction)
  gross: number; // before every cost: shares × (raw exit − raw entry)
  net: number; // liquidation-equivalent
  engineNet: number; // the engine's own (an open lot marked at the close, no exit friction)
  occupiedDays: number; // max(1, calendar days entry → exit/end) — the source study's Stage A definition
  heldDays: number; // calendar days entry → exit/end without the floor (the source study's pool heldDays)
  entryDate: string;
  exitDate: string; // the last session for an open lot
  maePercent: number;
  maeDollars: number;
  mfePercent: number;
  maeTime: number;
  worstMark: number;
}

export interface StandaloneView {
  trades: number;
  closed: number;
  open: number;
  net: number;
  gross: number;
  interest: number;
  friction: number;
  bestTrade: number;
  secondTrade: number;
  thirdTrade: number;
  worstTrade: number;
  meanNet: number;
  medianNet: number;
  wins: number;
  losses: number;
  lossSum: number;
  occupiedDays: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  yearly: Record<string, number>; // lot nets by exit (or end) year
}

const medianOf = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  return sorted.length % 2 === 1
    ? sorted[(sorted.length - 1) / 2]!
    : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
};

export const compactLotsOf = (universe: NUniverse, result: NRunResult, spec: Spec): CompactLot[] => {
  const records = lotRecordsOf(result);
  const endIndex = result.endIndex;

  return result.lots.map((lot, index) => {
    const record = records[index]!;
    const ds = universe.instruments[lot.symbol]!.ds;
    const open = lot.exitIndex < 0;
    const lastIndex = open ? endIndex : lot.exitIndex;
    const entryTimestamp = (lot as unknown as { entryTimestamp: number }).entryTimestamp;
    const liquidation = open
      ? liquidationOf(
          { shares: lot.shares, principal: lot.originalPrincipal, entryTimestamp },
          ds.sClose[endIndex]!,
          ds.sTime[endIndex]!,
          spec.rate,
          spec.costBps
        )
      : undefined;
    const excursion = excursionOf(universe, record);
    const trade = lot.trade;

    return {
      id: lot.id,
      symbol: lot.symbol,
      setup: trade.setupKind,
      activationIndex: trade.activationIndex,
      activationTime: trade.activationTime,
      activationPrice: trade.activationPrice,
      referenceHigh: trade.referenceHigh,
      trailingLow: trade.trailingLow,
      decisionIndex: lot.decisionIndex,
      decisionTime: lot.decisionTime,
      entryIndex: lot.entryIndex,
      entryTime: lot.entryTime,
      entryRawPrice: lot.entryRawPrice,
      entryPrice: lot.entryPrice,
      shares: lot.shares,
      principal: lot.originalPrincipal,
      exitIndex: lot.exitIndex,
      exitTime: open ? ds.sCloseTime[endIndex]! : lot.exitTime,
      exitRawPrice: open ? ds.sClose[endIndex]! : lot.exitRawPrice,
      exitReason: open ? 'open' : lot.exitReason,
      interest: open ? liquidation!.interest : lot.interest,
      friction: open
        ? lot.shares * (lot.entryPrice - lot.entryRawPrice) + lot.shares * (ds.sClose[endIndex]! - liquidation!.price)
        : record.friction,
      gross: open ? lot.shares * (ds.sClose[endIndex]! - lot.entryRawPrice) : record.gross,
      net: open ? liquidation!.net : lot.net,
      engineNet: lot.net,
      occupiedDays: Math.max(1, (ds.sTime[lastIndex]! - ds.sTime[lot.entryIndex]!) / 86400),
      heldDays: (ds.sTime[lastIndex]! - ds.sTime[lot.entryIndex]!) / 86400,
      entryDate: universe.dates[lot.entryIndex]!,
      exitDate: universe.dates[lastIndex]!,
      maePercent: excursion.maePercent,
      maeDollars: excursion.maeDollars,
      mfePercent: excursion.mfePercent,
      maeTime: excursion.maeTime,
      worstMark: lot.worstMark
    };
  });
};

export const standaloneViewOf = (result: NRunResult, lots: readonly CompactLot[]): StandaloneView => {
  const nets = lots.map((lot) => lot.net);
  const sorted = [...nets].sort((a, b) => b - a);
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
  const yearly: Record<string, number> = {};

  for (const lot of lots) {
    const year = lot.exitDate.slice(0, 4);

    yearly[year] = (yearly[year] ?? 0) + lot.net;
  }

  return {
    trades: lots.length,
    closed: lots.filter((lot) => lot.exitIndex >= 0).length,
    open: lots.filter((lot) => lot.exitIndex < 0).length,
    net: sum(nets),
    gross: sum(lots.map((lot) => lot.gross)),
    interest: sum(lots.map((lot) => lot.interest)),
    friction: sum(lots.map((lot) => lot.friction)),
    bestTrade: sorted[0] ?? NaN,
    secondTrade: sorted[1] ?? NaN,
    thirdTrade: sorted[2] ?? NaN,
    worstTrade: sorted.at(-1) ?? NaN,
    meanNet: nets.length > 0 ? sum(nets) / nets.length : NaN,
    medianNet: medianOf(nets),
    wins: nets.filter((value) => value > 0).length,
    losses: nets.filter((value) => value <= 0).length,
    lossSum: sum(nets.filter((value) => value < 0)),
    occupiedDays: sum(lots.map((lot) => lot.occupiedDays)),
    minuteDrawdown: result.minuteDrawdown.maximum,
    dailyDrawdown: result.dailyDrawdown.maximum,
    yearly
  };
};

// The liquidation-equivalent strategy mark at the close of session s (fixed mode): the engine's daily mark less the
// exit friction of every lot open at that close.
export const liquidationMarkAt = (result: NRunResult, lots: readonly CompactLot[], s: number, costBps: number) => {
  const row = result.daily.find((item) => item.index === s);

  if (!row) {
    throw new Error(`no daily row at session ${s}`);
  }

  let friction = 0;

  for (const lot of lots) {
    if (lot.entryIndex <= s && (lot.exitIndex < 0 || lot.exitIndex > s)) {
      const ds = result.universe.instruments[lot.symbol]!.ds;

      friction += lot.shares * ds.sClose[s]! * (costBps / 10000);
    }
  }

  return row.strategyMark - friction;
};

// The windowed figures of a fold run (the source study's §13.2 definitions for one book): the incremental
// liquidation-equivalent mark over (boundary close, end close], the lots entered after the boundary, and the windowed
// daily drawdown of the mark restarted at the boundary.
export const windowedOf = (result: NRunResult, lots: readonly CompactLot[], spec: Spec) => {
  if (!spec.boundaryDate) {
    return undefined;
  }

  const boundary = result.universe.dates.indexOf(spec.boundaryDate);

  if (boundary < 0) {
    throw new Error(`${spec.key}: the boundary ${spec.boundaryDate} is not a session`);
  }

  const atBoundary = liquidationMarkAt(result, lots, boundary, spec.costBps);
  const atEnd = liquidationMarkAt(result, lots, result.endIndex, spec.costBps);
  let peak = atBoundary;
  let drawdown = 0;

  for (const row of result.daily) {
    if (row.index <= boundary) {
      continue;
    }

    const mark = liquidationMarkAt(result, lots, row.index, spec.costBps);

    peak = Math.max(peak, mark);
    drawdown = Math.max(drawdown, peak - mark);
  }

  const after = lots.filter((lot) => lot.entryIndex > boundary);

  return {
    boundary: spec.boundaryDate,
    markAtBoundary: atBoundary,
    markAtEnd: atEnd,
    increment: atEnd - atBoundary,
    trainingNet: atBoundary,
    lotsEntered: after.length,
    lotsEnteredNet: after.reduce((total, lot) => total + lot.net, 0),
    openAtBoundary: lots.filter((lot) => lot.entryIndex <= boundary && (lot.exitIndex < 0 || lot.exitIndex > boundary))
      .length,
    dailyDrawdown: drawdown
  };
};

export const executeSpec = (universe: NUniverse, spec: Spec) => {
  const prior = asPriorSpec(spec);
  const result = runSpec(universe, prior);
  const metrics = metricsOf(result, prior);
  const lots = compactLotsOf(universe, result, spec);
  const view = standaloneViewOf(result, lots);

  metrics.lotsBrief = [];

  return {
    key: spec.key,
    family: spec.family,
    subject: spec.subject,
    window: spec.window,
    mode: spec.mode,
    scenario: spec.scenario,
    meta: spec.meta,
    books: spec.books.map((book) => ({ symbol: book.symbol, grid: book.grid })),
    endDate: universe.end,
    metrics,
    view,
    windowed: spec.mode === 'fixed' ? windowedOf(result, lots, spec) : undefined,
    lots,
    daily: spec.keepDaily
      ? result.daily.map((row) => ({
          index: row.index,
          date: row.date,
          strategyMark: row.strategyMark,
          equity: row.equity,
          cumulativeInterest: row.cumulativeInterest,
          openLots: row.openLots,
          principal: row.principal
        }))
      : undefined
  };
};

export type RunRecord = ReturnType<typeof executeSpec>;
