// The study's pure evaluation functions (PROTOCOL.md §6, §10), shared by the main thread and the workers:
//
// - a book's trace (src/portfolio-aware-d1/trace.ts, unchanged) for a symbol and an eight-parameter grid;
// - standalone metrics of one book alone in the fixed $100,000 slot (Stage A): every entered trade, a trade open at
//   the window's end counted at its liquidation value at the last close (exit friction and interest to that session
//   included), capital-occupied calendar days, the minute drawdown of the one-book pool (the frozen replay), and the
//   standalone score J_s;
// - pool metrics of a configuration under an allocation policy (Stage C/D): the derived replay (./replay.ts), the
//   liquidation-equivalent net, concentration, preemption accounting, windowed (validation) figures and J_pool.
// Completed P&L enters only after a chronological replay, never a decision.
import { createHash } from 'node:crypto';
import type { Dataset } from '../four-family/data.ts';
import type { Book, Vector } from '../d1-robust/neighbourhood.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { type BookTrace, type TraceWindow, traceBook, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { type Allocation, fixedLiquidation } from './allocation.ts';
import { type WindowKey, study } from './context.ts';
import { type PReplayResult, type ReplayBook, replayPreemptive } from './replay.ts';

export type { Book, Vector };

export const gridKey = (grid: Vector['grid']) =>
  [
    grid.targetPercentChange,
    grid.trailingBuyPercentage,
    grid.trailingStopPercentage,
    grid.maximumHoldDays,
    grid.tickWindowSize,
    grid.intradayLossBuffer,
    grid.pullback,
    grid.continuationWindow
  ].join('.');

export const traceKeyOf = (symbol: string, grid: Vector['grid'], costBps: number) =>
  `${symbol}|${gridKey(grid)}|${costBps}`;

export const buildTrace = (ds: Dataset, book: Book, costBps: number, window: TraceWindow): BookTrace =>
  traceBook(ds, candidateBook(book.symbol, book.vector.id, book.vector.grid), traceSettings(costBps), window);

// The canonical key of a configuration: its members alphabetically with their full grids.
export const configKeyOf = (books: readonly Book[]) =>
  [...books]
    .sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0))
    .map((book) => `${book.symbol}:${gridKey(book.vector.grid)}`)
    .join('|');

// ----- periods -----

export interface PeriodIndex {
  key: string;
  first: number;
  last: number;
}

export const periodIndices = (
  dates: readonly string[],
  periods: readonly { key: string; start: string; end: string }[],
  firstAllowed = 0,
  lastAllowed = dates.length - 1
): PeriodIndex[] =>
  periods.flatMap((period) => {
    let first = -1;
    let last = -1;

    for (let index = firstAllowed; index <= lastAllowed; index++) {
      if (dates[index]! >= period.start && dates[index]! <= period.end) {
        if (first < 0) {
          first = index;
        }

        last = index;
      }
    }

    return first < 0 ? [] : [{ key: period.key, first, last }];
  });

export const yearPeriodsOf = (dates: readonly string[], armStart: number, lastAllowed = dates.length - 1) => {
  const years = [...new Set(dates.slice(armStart, lastAllowed + 1).map((date) => date.slice(0, 4)))];

  return periodIndices(
    dates,
    years.map((year) => ({ key: year, start: `${year}-01-01`, end: `${year}-12-31` })),
    armStart,
    lastAllowed
  );
};

export const attribute = (marks: Float64Array, periods: readonly PeriodIndex[]) =>
  periods.map(({ first, last }) => marks[last]! - (first > 0 ? marks[first - 1]! : 0));

// ----- Stage A: standalone metrics -----

export interface StandaloneMetrics {
  symbol: string;
  grid: Vector['grid'];
  gridKey: string;
  signature: string; // the trace's trade content hash
  trades: number; // entered trades (closed + open at the end)
  closed: number;
  open: number;
  net: number; // Σ trade nets, an open trade at its liquidation value
  bestTrade: number;
  secondTrade: number;
  thirdTrade: number;
  worstTrade: number;
  meanNet: number; // R1's metric (NaN without a trade)
  medianNet: number;
  wins: number;
  losses: number;
  lossSum: number;
  occupiedDays: number; // Σ max(1, calendar days from the entry session's date to the exit (or end) session's date)
  netPerDay: number; // R2's metric (NaN without a trade)
  interest: number;
  friction: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  yearly: Record<string, number>; // trade nets by the exit (or end) year
  bestYearShare: number; // best year's net ÷ net (NaN unless net > 0)
  intervals: number[]; // per trade: entry session index, exit (or end) session index — flat pairs
  score: number; // J_s
  credible: boolean;
}

export const standaloneOf = (
  ds: Dataset,
  trace: BookTrace,
  grid: Vector['grid'],
  minTrades: number,
  rate: number = study.rate
): StandaloneMetrics => {
  const { endIndex } = trace;
  const costBps = trace.settings.costBps;
  const nets: number[] = [];
  const yearly: Record<string, number> = {};
  const intervals: number[] = [];
  let occupiedDays = 0;
  let interest = 0;
  let friction = 0;
  let closed = 0;
  let open = 0;

  for (const trade of trace.trades) {
    if (trade.entryIndex < 0) {
      continue; // committed, never filled before the end: no capital
    }

    const isClosed = trade.exitIndex >= 0;
    const lastIndex = isClosed ? trade.exitIndex : endIndex;
    const entryFriction = trade.shares * (trade.entryPrice - trade.entryRawPrice);
    let net: number;

    if (isClosed) {
      net = trade.net;
      interest += trade.interest;
      friction += entryFriction + trade.shares * (trade.exitRawPrice - trade.exitPrice);
      closed++;
    } else {
      const liquidation = fixedLiquidation(
        { shares: trade.shares, principal: trade.investment, entryTimestamp: ds.sTime[trade.entryIndex]! },
        ds.sClose[endIndex]!,
        ds.sTime[endIndex]!,
        rate,
        costBps
      );

      net = liquidation.net;
      interest += liquidation.interest;
      friction += entryFriction + trade.shares * (ds.sClose[endIndex]! - liquidation.price);
      open++;
    }

    nets.push(net);
    intervals.push(trade.entryIndex, lastIndex);
    occupiedDays += Math.max(1, (ds.sTime[lastIndex]! - ds.sTime[trade.entryIndex]!) / 86400);

    const year = ds.dates[lastIndex]!.slice(0, 4);

    yearly[year] = (yearly[year] ?? 0) + net;
  }

  const sorted = [...nets].sort((a, b) => b - a);
  const total = nets.reduce((sum, value) => sum + value, 0);
  const median =
    sorted.length === 0
      ? NaN
      : sorted.length % 2 === 1
        ? sorted[(sorted.length - 1) / 2]!
        : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
  const single = replayFixedPool([{ symbol: trace.symbol, ds, trace }], {
    symbols: [trace.symbol],
    startIndex: trace.startIndex,
    endIndex,
    principal: study.principal,
    rate,
    costBps,
    stopSlippageBps: 0,
    detail: false
  });
  const minuteDrawdown = single.minuteDrawdown.maximum;
  const best = sorted[0] ?? 0;
  const bestYear = Math.max(0, ...Object.values(yearly));
  const score = total - Math.max(0, best) - Math.max(0, minuteDrawdown - study.standalone.ddPenaltyFrom);

  return {
    symbol: trace.symbol,
    grid,
    gridKey: gridKey(grid),
    signature: trace.signature,
    trades: nets.length,
    closed,
    open,
    net: total,
    bestTrade: sorted[0] ?? NaN,
    secondTrade: sorted[1] ?? NaN,
    thirdTrade: sorted[2] ?? NaN,
    worstTrade: sorted.at(-1) ?? NaN,
    meanNet: nets.length > 0 ? total / nets.length : NaN,
    medianNet: median,
    wins: nets.filter((value) => value > 0).length,
    losses: nets.filter((value) => value <= 0).length,
    lossSum: nets.filter((value) => value < 0).reduce((sum, value) => sum + value, 0),
    occupiedDays,
    netPerDay: occupiedDays > 0 ? total / occupiedDays : NaN,
    interest,
    friction,
    minuteDrawdown,
    dailyDrawdown: single.dailyDrawdown.maximum,
    yearly,
    bestYearShare: total > 0 ? bestYear / total : NaN,
    intervals,
    score,
    credible: nets.length >= minTrades && minuteDrawdown <= study.standalone.ddCeiling && total > 0
  };
};

// ----- Stage C/D: pool metrics -----

export const entrySessionsOf = (metrics: Pick<StandaloneMetrics, 'intervals'>) =>
  metrics.intervals.filter((_, index) => index % 2 === 0);

// Every session index on which the book holds a trade (entry through exit, inclusive).
export const heldSessionsOf = (metrics: Pick<StandaloneMetrics, 'intervals'>) => {
  const held: number[] = [];

  for (let index = 0; index < metrics.intervals.length; index += 2) {
    for (let s = metrics.intervals[index]!; s <= metrics.intervals[index + 1]!; s++) {
      held.push(s);
    }
  }

  return held;
};

export interface PoolMetrics {
  key: string;
  members: string[];
  books: number;
  costBps: number;
  policy: string;
  rankingId: string;
  net: number; // liquidation-equivalent: an open lot sold at the last close after the exit friction
  engineNet: number; // the replay's net (open lot marked without exit friction, the engine's convention)
  realized: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  lots: number;
  openLots: number;
  lotsBySymbol: Record<string, number>;
  netBySymbol: Record<string, number>;
  bestLot: number;
  top2: number;
  worstLot: number;
  lotYears: number;
  yearly: Record<string, number>;
  interest: number;
  costs: number;
  heldDays: number;
  refused: number;
  decisions: number;
  preemptions: { executed: number; superseded: number; aborted: number; declined: number };
  preemptedNet: number; // Σ realized nets of lots sold by a preemption
  replacementNet: number; // Σ nets of the lots bought by an executed or superseded preemption
  hindsightContinuation: number; // Σ (the preempted lot's own-rule net − its realized net); descriptive only
  fundedKey: string;
  windowed: { startIndex: number; net: number; minuteDrawdown: number; dailyDrawdown: number; lots: number }[];
  score: number; // J_pool
  feasible: boolean;
}

export interface PoolScoring {
  window: WindowKey;
  minLots?: number;
}

export const poolScore = (
  metrics: Pick<PoolMetrics, 'net' | 'bestLot' | 'books' | 'minuteDrawdown' | 'lots'>,
  minLots: number
) => {
  const { lambda, ddPenaltyFrom, ddCeiling } = study.joint;
  const feasible = metrics.minuteDrawdown <= ddCeiling && metrics.lots >= minLots;
  const raw =
    metrics.net -
    Math.max(0, metrics.bestLot) -
    lambda * (metrics.books - 1) -
    Math.max(0, metrics.minuteDrawdown - ddPenaltyFrom);

  return { score: feasible ? raw : raw - study.joint.infeasibleOffset, feasible };
};

export const poolMetricsOf = (
  key: string,
  books: readonly ReplayBook[],
  result: PReplayResult,
  costBps: number,
  allocation: Allocation,
  dates: readonly string[],
  armStart: number,
  minLots: number
): PoolMetrics => {
  const traces = new Map(books.map((book) => [book.symbol, book]));
  const lotsBySymbol: Record<string, number> = {};
  const netBySymbol: Record<string, number> = {};

  for (const book of books) {
    lotsBySymbol[book.symbol] = 0;
    netBySymbol[book.symbol] = 0;
  }

  const years = new Set<string>();
  const nets: number[] = [];
  let net = 0;

  for (const lot of result.lots) {
    lotsBySymbol[lot.symbol] = (lotsBySymbol[lot.symbol] ?? 0) + 1;
    netBySymbol[lot.symbol] = (netBySymbol[lot.symbol] ?? 0) + lot.liquidationNet;
    years.add(dates[lot.entryIndex]!.slice(0, 4));
    nets.push(lot.liquidationNet);
    net += lot.liquidationNet;
  }

  nets.sort((a, b) => b - a);

  const replacementIds = new Set(
    result.preemptions.filter((record) => record.outcome !== 'aborted').map((record) => record.replacementLotId)
  );
  let hindsight = 0;

  for (const record of result.preemptions) {
    if (record.outcome !== 'executed') {
      continue;
    }

    const book = traces.get(record.sourceSymbol)!;
    const trade = book.trace.trades[record.sourceTradeId - 1]!;
    const lot = result.lots.find((candidate) => candidate.id === record.sourceLotId)!;
    const shares = study.principal / (trade.entryRawPrice * (1 + costBps / 10000));
    const own =
      trade.exitIndex >= 0
        ? fixedLiquidation(
            { shares, principal: study.principal, entryTimestamp: book.ds.sTime[trade.entryIndex]! },
            trade.exitRawPrice,
            book.ds.sTime[trade.exitIndex]!,
            study.rate,
            costBps
          ).net
        : NaN;

    hindsight += own - lot.net;
  }

  const yearly = Object.fromEntries(
    yearPeriodsOf(dates, armStart, result.marks.length - 1)
      .filter((period) => Number.isFinite(result.marks[period.last]!))
      .map((period) => [period.key, attribute(result.marks, [period])[0]!])
  );
  const books_ = books.length;
  const base = {
    net,
    bestLot: nets[0] ?? 0,
    books: books_,
    minuteDrawdown: result.minuteDrawdown.maximum,
    lots: result.lots.length
  };
  const { score, feasible } = poolScore(base, minLots);
  const lastIndex = result.marks.length - 1;
  const openExitFriction = result.lots
    .filter((lot) => lot.open)
    .reduce((total, lot) => total + (lot.net - lot.liquidationNet), 0);

  return {
    key,
    members: books.map((book) => book.symbol).sort(),
    books: books_,
    costBps,
    policy: allocation.policy.key,
    rankingId: allocation.priority?.rankingId ?? 'none',
    net,
    engineNet: result.net,
    realized: result.realized,
    minuteDrawdown: result.minuteDrawdown.maximum,
    dailyDrawdown: result.dailyDrawdown.maximum,
    lots: result.lots.length,
    openLots: result.lots.filter((lot) => lot.open).length,
    lotsBySymbol,
    netBySymbol,
    bestLot: nets[0] ?? 0,
    top2: (nets[0] ?? 0) + (nets[1] ?? 0),
    worstLot: Math.min(0, ...nets),
    lotYears: years.size,
    yearly,
    interest: result.interest,
    costs: result.lots.reduce((total, lot) => total + lot.costs, 0),
    heldDays: result.heldDays,
    refused: result.refused,
    decisions: result.decisions,
    preemptions: {
      executed: result.preemptions.filter((record) => record.outcome === 'executed').length,
      superseded: result.preemptions.filter((record) => record.outcome === 'superseded').length,
      aborted: result.preemptions.filter((record) => record.outcome === 'aborted').length,
      declined: result.declines.length
    },
    preemptedNet: result.lots.filter((lot) => lot.preemptionId > 0).reduce((total, lot) => total + lot.net, 0),
    replacementNet: result.lots
      .filter((lot) => replacementIds.has(lot.id))
      .reduce((total, lot) => total + lot.liquidationNet, 0),
    hindsightContinuation: hindsight,
    fundedKey: createHash('sha256')
      .update(result.lots.map((lot) => `${lot.symbol}@${lot.entryTime}`).join('|'))
      .digest('hex')
      .slice(0, 16),
    windowed: result.windowed.map((window) => ({
      startIndex: window.startIndex,
      // the liquidation convention at both ends: an open lot's exit friction at the end and at the start
      net: result.marks[lastIndex]! - openExitFriction - (result.marks[window.startIndex]! - window.startExitFriction),
      minuteDrawdown: window.minuteDrawdown.maximum,
      dailyDrawdown: window.dailyDrawdown.maximum,
      lots: result.lots.filter((lot) => lot.entryIndex > window.startIndex).length
    })),
    score,
    feasible
  };
};

export interface PoolRequest {
  books: Book[];
  costBps: number;
  allocation: Allocation;
  windowStarts?: number[];
}

export const replayRequest = (
  request: PoolRequest,
  replayBooks: ReplayBook[],
  window: TraceWindow,
  dates: readonly string[],
  minLots: number
) => {
  const result = replayPreemptive(replayBooks, {
    symbols: replayBooks.map((book) => book.symbol),
    startIndex: window.startIndex,
    endIndex: window.endIndex,
    principal: study.principal,
    rate: study.rate,
    costBps: request.costBps,
    stopSlippageBps: 0,
    detail: false,
    allocation: request.allocation,
    ...(request.windowStarts ? { windowStarts: request.windowStarts } : {})
  });

  return {
    result,
    metrics: poolMetricsOf(
      configKeyOf(request.books),
      replayBooks,
      result,
      request.costBps,
      request.allocation,
      dates,
      window.armStart,
      minLots
    )
  };
};
