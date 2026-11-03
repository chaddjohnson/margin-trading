// The pure evaluation functions shared by the main thread and the worker threads: a configuration's trace-based
// fixed-pool replay (src/portfolio-aware-d1/replay.ts, unchanged; proved equal to the N-book engine by parity.ts) and
// its metrics; the compact record of a neighbour; and full-engine summaries (src/portfolio-aware-d1/nbook/engine.ts,
// unchanged) for the portfolio checks. Completed P&L enters only after the chronological replay, never a decision.
import { createHash } from 'node:crypto';
import type { Dataset } from '../four-family/data.ts';
import { summaryOf } from '../joint-16-etf-d1/figures.ts';
import {
  type BookPhenotype,
  type NRunResult,
  type NUniverse,
  baseNRunConfig,
  bookOrderOf,
  runNAllocator
} from '../portfolio-aware-d1/nbook/engine.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { type ReplayBook, type ReplayResult, replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { type BookTrace, type TraceWindow, traceBook, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { type Period, study } from './context.ts';
import { type Book, gridKeyOf } from './neighbourhood.ts';
import type { NeighbourRecord } from './stats.ts';

export interface PeriodIndex {
  key: string;
  first: number;
  last: number;
}

export interface EvalPeriods {
  regimes: PeriodIndex[];
  years: PeriodIndex[];
  quarters: PeriodIndex[];
}

// Periods clipped to the window [eligibility, last date]; empty periods dropped.
export const periodIndices = (dates: readonly string[], periods: readonly Period[], firstAllowed = 0): PeriodIndex[] =>
  periods.flatMap((period) => {
    let first = -1;
    let last = -1;

    for (let index = firstAllowed; index < dates.length; index++) {
      if (dates[index]! >= period.start && dates[index]! <= period.end) {
        if (first < 0) {
          first = index;
        }

        last = index;
      }
    }

    return first < 0 ? [] : [{ key: period.key, first, last }];
  });

export const yearPeriods = (): Period[] =>
  study.years.map((year) => ({
    key: String(year),
    label: String(year),
    start: year === 2017 ? study.eligibilityDate : `${year}-01-01`,
    end: `${year}-12-31`
  }));

export const quarterPeriods = (): Period[] =>
  study.years.flatMap((year) =>
    [1, 2, 3, 4].map((quarter) => ({
      key: `${year}Q${quarter}`,
      label: `${year} Q${quarter}`,
      start:
        year === 2017 && quarter <= 2
          ? study.eligibilityDate
          : `${year}-${String(3 * quarter - 2).padStart(2, '0')}-01`,
      end: `${year}-${String(3 * quarter).padStart(2, '0')}-${quarter === 1 || quarter === 4 ? '31' : '30'}`
    }))
  );

export const periodsOf = (dates: readonly string[], armStart: number): EvalPeriods => ({
  regimes: periodIndices(dates, study.regimes, armStart),
  years: periodIndices(dates, yearPeriods(), armStart),
  quarters: periodIndices(dates, quarterPeriods(), armStart)
});

export const attribute = (marks: Float64Array, periods: readonly PeriodIndex[]) =>
  periods.map(({ first, last }) => marks[last]! - (first > 0 ? marks[first - 1]! : 0));

// The canonical key of a configuration: its members alphabetically with their full grids (collision-free).
export const keyOf = (books: readonly Book[]) =>
  [...books]
    .sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0))
    .map((book) => `${book.symbol}:${gridKeyOf(book.vector.grid)}`)
    .join('|');

// The configuration's label with D1 candidate IDs (reports only; not unique).
export const labelOf = (books: readonly Book[]) =>
  [...books]
    .sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0))
    .map((book) => `${book.symbol}:${book.vector.id}`)
    .join('|');

// The order in which both engines receive a configuration's books (VGT, XBI, XRT, KRE, then the others).
export const canonicalBooks = (books: readonly Book[]) => {
  const bySymbol = new Map(books.map((book) => [book.symbol, book]));

  if (bySymbol.size !== books.length) {
    throw new Error(`A configuration holds a symbol twice: ${keyOf(books)}`);
  }

  return bookOrderOf([...bySymbol.keys()]).map((symbol) => bySymbol.get(symbol)!);
};

export const phenotypeOf = (book: Book): BookPhenotype => candidateBook(book.symbol, book.vector.id, book.vector.grid);

export const buildTrace = (ds: Dataset, book: Book, costBps: number, window: TraceWindow): BookTrace =>
  traceBook(ds, phenotypeOf(book), traceSettings(costBps), window);

// Aliases that make the replay's alphabetical tie order equal to `priority` (first wins) and change nothing else.
export const tieAliases = (priority: readonly string[]) =>
  new Map(
    priority.map((symbol, index) => [
      symbol,
      `${String.fromCharCode(97 + Math.floor(index / 26))}${String.fromCharCode(97 + (index % 26))}_${symbol}`
    ])
  );

export const replayOf = (
  books: readonly ReplayBook[],
  costBps: number,
  window: TraceWindow,
  detail = false,
  priority?: readonly string[]
): ReplayResult => {
  const aliases = priority ? tieAliases(priority) : undefined;
  const name = (symbol: string) => aliases?.get(symbol) ?? symbol;

  if (aliases && books.some((book) => !aliases.has(book.symbol))) {
    throw new Error('A tie priority must name every member');
  }

  const result = replayFixedPool(
    books.map((book) => ({ ...book, symbol: name(book.symbol) })),
    {
      symbols: books.map((book) => name(book.symbol)),
      startIndex: window.startIndex,
      endIndex: window.endIndex,
      principal: study.principal,
      rate: study.rate,
      costBps,
      stopSlippageBps: 0,
      detail
    }
  );

  if (aliases) {
    const original = new Map([...aliases].map(([symbol, alias]) => [alias, symbol]));

    for (const lot of result.lots) {
      lot.symbol = original.get(lot.symbol)!;
    }

    for (const refusal of result.refusals) {
      refusal.decider = original.get(refusal.decider)!;
      refusal.holder = original.get(refusal.holder)!;
    }
  }

  return result;
};

export interface Evaluation {
  key: string;
  costBps: number;
  books: number;
  members: string[];
  net: number;
  realized: number;
  unrealized: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  lots: number;
  lotsBySymbol: Record<string, number>;
  netBySymbol: Record<string, number>;
  virtualBySymbol: Record<string, number>;
  regimesBySymbol: Record<string, number>; // distinct regimes with a funded lot (entry), per member
  virtualTrades: number;
  inertBooks: number;
  refused: number;
  contested: number;
  refusals: Record<string, Record<string, number>>;
  heldDays: number;
  utilization: number;
  interest: number;
  costs: number;
  top1: number;
  top2: number;
  worstLot: number;
  lotYears: number; // distinct calendar years of funded-lot entries
  regimes: number[];
  years: number[];
  quarters: number[];
  positiveRegimes: number;
  behaviourKey: string;
  markAt?: number[];
  funded?: string[]; // `${symbol}@${decisionTime}` of every funded lot (on request)
}

const regimeOfIndex = (periods: EvalPeriods, index: number) =>
  periods.regimes.find((period) => index >= period.first && index <= period.last)?.key ?? '';

export const evaluationOf = (
  key: string,
  books: readonly ReplayBook[],
  costBps: number,
  result: ReplayResult,
  periods: EvalPeriods,
  eligibleDays: number,
  dates: readonly string[],
  markIndices?: readonly number[],
  withFunded = false
): Evaluation => {
  const traces = new Map(books.map((book) => [book.symbol, book.trace]));
  const lotsBySymbol: Record<string, number> = {};
  const netBySymbol: Record<string, number> = {};
  const virtualBySymbol: Record<string, number> = {};
  const regimeSets = new Map<string, Set<string>>();
  const fundedDecisions = new Map<string, Set<number>>();

  for (const book of books) {
    lotsBySymbol[book.symbol] = 0;
    netBySymbol[book.symbol] = 0;
    virtualBySymbol[book.symbol] = book.trace.trades.length;
    regimeSets.set(book.symbol, new Set());
    fundedDecisions.set(book.symbol, new Set());
  }

  const years = new Set<string>();

  for (const lot of result.lots) {
    lotsBySymbol[lot.symbol]!++;
    netBySymbol[lot.symbol]! += lot.net;
    fundedDecisions.get(lot.symbol)!.add(lot.decisionTime);
    years.add(dates[lot.entryIndex]!.slice(0, 4));

    const regime = regimeOfIndex(periods, lot.entryIndex);

    if (regime) {
      regimeSets.get(lot.symbol)!.add(regime);
    }
  }

  const refusals: Evaluation['refusals'] = {};
  let contested = 0;

  for (const refusal of result.refusals) {
    refusals[refusal.decider] ??= {};
    refusals[refusal.decider]![refusal.holder] = (refusals[refusal.decider]![refusal.holder] ?? 0) + 1;

    const trade = traces.get(refusal.decider)!.trades[refusal.tradeId - 1]!;

    if (fundedDecisions.get(refusal.holder)!.has(trade.decisionTime)) {
      contested++;
    }
  }

  const nets = result.lots.map((lot) => lot.net).sort((a, b) => b - a);
  const regimes = attribute(result.marks, periods.regimes);

  return {
    key,
    costBps,
    books: books.length,
    members: books.map((book) => book.symbol),
    net: result.net,
    realized: result.realized,
    unrealized: result.unrealized,
    minuteDrawdown: result.minuteDrawdown.maximum,
    dailyDrawdown: result.dailyDrawdown.maximum,
    lots: result.lots.length,
    lotsBySymbol,
    netBySymbol,
    virtualBySymbol,
    regimesBySymbol: Object.fromEntries([...regimeSets].map(([symbol, set]) => [symbol, set.size])),
    virtualTrades: books.reduce((total, book) => total + book.trace.trades.length, 0),
    inertBooks: books.filter((book) => book.trace.trades.length === 0).length,
    refused: result.refused,
    contested,
    refusals,
    heldDays: result.heldDays,
    utilization: result.heldDays / eligibleDays,
    interest: result.interest,
    costs: result.lots.reduce((total, lot) => total + lot.costs, 0),
    top1: nets[0] ?? 0,
    top2: (nets[0] ?? 0) + (nets[1] ?? 0),
    worstLot: Math.min(0, ...nets),
    lotYears: years.size,
    regimes,
    years: attribute(result.marks, periods.years),
    quarters: attribute(result.marks, periods.quarters),
    positiveRegimes: regimes.filter((value) => value > 0).length,
    behaviourKey: createHash('sha256')
      .update(
        [...books]
          .sort((a, b) => (a.symbol < b.symbol ? -1 : 1))
          .map((book) => `${book.symbol}:${book.trace.signature}`)
          .join('|')
      )
      .digest('hex')
      .slice(0, 16),
    ...(markIndices ? { markAt: markIndices.map((index) => result.marks[index]!) } : {}),
    ...(withFunded ? { funded: result.lots.map((lot) => `${lot.symbol}@${lot.decisionTime}`) } : {})
  };
};

export const neighbourRecordOf = (
  result: ReplayResult,
  moved: number,
  markIndices?: readonly number[]
): NeighbourRecord => {
  const nets = result.lots.map((lot) => lot.net).sort((a, b) => b - a);
  const top2 = (nets[0] ?? 0) + (nets[1] ?? 0);

  return {
    net: result.net,
    drawdown: result.minuteDrawdown.maximum,
    lots: result.lots.length,
    top2Share: result.net > 0 ? top2 / result.net : NaN,
    moved,
    ...(markIndices ? { markAt: markIndices.map((index) => result.marks[index]!) } : {})
  };
};

// ----- the full engine -----

export interface EngineSpec {
  label: string;
  mode: 'fixed' | 'portfolio';
  books: { symbol: string; phenotype: BookPhenotype }[];
  costBps: number;
  fraction: number;
  lotDividends: boolean;
  eligibilityIndex: number;
  accountingStartIndex: number;
  endIndex?: number;
}

export const runEngine = (universe: NUniverse, spec: EngineSpec): NRunResult => {
  const symbols = bookOrderOf(spec.books.map((book) => book.symbol));
  const phenotypes = Object.fromEntries(spec.books.map((book) => [book.symbol, book.phenotype]));
  const members = [...new Set(spec.mode === 'portfolio' ? ['VOOG', 'VGT', ...symbols] : symbols)];

  return runNAllocator(
    {
      ...universe,
      instruments: Object.fromEntries(
        members.map((symbol) => {
          const instrument = universe.instruments[symbol];

          if (!instrument) {
            throw new Error(`${spec.label}: ${symbol} is not loaded`);
          }

          return [symbol, instrument];
        })
      )
    },
    baseNRunConfig({
      key: `${spec.label}-${spec.mode}-${spec.costBps}bps-f${spec.fraction}-div${spec.lotDividends ? 'frozen' : 'symmetric'}`,
      label: `${spec.label}, ${spec.mode}, ${spec.costBps} bps`,
      mode: spec.mode,
      symbols,
      phenotypes,
      costBps: spec.costBps,
      fraction: spec.fraction,
      lotDividends: spec.lotDividends,
      eligibilityIndex: spec.eligibilityIndex,
      accountingStartIndex: spec.accountingStartIndex,
      ...(spec.endIndex !== undefined ? { endIndex: spec.endIndex } : {})
    })
  );
};

export interface EngineSummary {
  label: string;
  mode: 'fixed' | 'portfolio';
  costBps: number;
  fraction: number;
  lotDividends: boolean;
  net: number;
  lots: number;
  interest: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  endEquity: number;
  dailyPercent: number;
  minutePercent: number;
  borrowingDollarDays: number;
  lotDividendCash: number;
  coreDividendCash: number;
}

export const engineSummaryOf = (spec: EngineSpec, result: NRunResult): EngineSummary => {
  const summary = summaryOf(result);

  return {
    label: spec.label,
    mode: spec.mode,
    costBps: spec.costBps,
    fraction: spec.fraction,
    lotDividends: spec.lotDividends,
    net: summary.net,
    lots: summary.lots,
    interest: summary.interest,
    minuteDrawdown: summary.minuteDrawdown,
    dailyDrawdown: summary.dailyDrawdown,
    endEquity: summary.endEquity,
    dailyPercent: summary.dailyPercent,
    minutePercent: summary.minutePercent,
    borrowingDollarDays: summary.borrowingDollarDays,
    lotDividendCash: result.dividends
      .filter((row) => row.source === 'lot')
      .reduce((total, row) => total + row.value, 0),
    coreDividendCash: result.dividends
      .filter((row) => row.source === 'core')
      .reduce((total, row) => total + row.value, 0)
  };
};
