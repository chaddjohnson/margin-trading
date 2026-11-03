// Fitness of a configuration (any nonempty subset of the 16 ETFs, each member with its own D1 vector) on training,
// from the cached book traces and the causal fixed-pool replay of the previous study (src/portfolio-aware-d1/trace.ts
// and replay.ts, unchanged; their exactness against the N-book engine is re-proved for this study's configurations by
// parity.ts). The objective is the allocator's total net after interest and costs; completed training P&L enters
// only here, after the chronological replay, never a decision inside it.
import { createHash } from 'node:crypto';
import { type BookPhenotype, bookOrderOf } from '../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { type ReplayBook, type ReplayResult, replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { type BookTrace, type TraceWindow, traceBook, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { sha256FileSync } from '#lib';
import { type Period, study } from './context.ts';
import type { Vector } from './space.ts';

export interface Book {
  symbol: string;
  vector: Vector;
}

// The canonical key of a configuration: its members alphabetically with their vector IDs.
export const keyOf = (books: readonly Book[]) =>
  [...books]
    .sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0))
    .map((book) => `${book.symbol}:${book.vector.id}`)
    .join('|');

// The canonical order in which both engines receive a configuration's books (VGT, XBI, XRT, KRE, then the others).
export const canonicalBooks = (books: readonly Book[]) => {
  const bySymbol = new Map(books.map((book) => [book.symbol, book]));

  if (bySymbol.size !== books.length) {
    throw new Error(`A configuration holds a symbol twice: ${keyOf(books)}`);
  }

  return bookOrderOf([...bySymbol.keys()]).map((symbol) => bySymbol.get(symbol)!);
};

export interface PeriodIndex {
  key: string;
  first: number;
  last: number;
}

export const periodIndices = (dates: readonly string[], periods: readonly Period[]): PeriodIndex[] =>
  periods.map((period) => {
    const first = dates.findIndex((date) => date >= period.start);
    let last = -1;

    for (let index = 0; index < dates.length; index++) {
      if (dates[index]! <= period.end) {
        last = index;
      }
    }

    if (first < 0 || last < first) {
      throw new Error(`Period ${period.key} ${period.start} → ${period.end} has no session`);
    }

    return { key: period.key, first, last };
  });

export const yearPeriods = (): Period[] =>
  study.years.map((year) => ({
    key: String(year),
    label: String(year),
    start: year === 2017 ? study.eligibilityDate : `${year}-01-01`,
    end: `${year}-12-31`
  }));

export const attribute = (marks: Float64Array | readonly number[], periods: readonly PeriodIndex[]) =>
  periods.map(({ first, last }) => marks[last]! - (first > 0 ? marks[first - 1]! : 0));

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
  virtualTrades: number;
  inertBooks: number; // members without a training virtual trade
  refused: number;
  contested: number; // same-minute grants that refused another same-minute decision (tie order decided them)
  refusals: Record<string, Record<string, number>>; // decider → holder → count
  heldDays: number;
  utilization: number;
  interest: number;
  costs: number;
  top1: number; // the largest lot's net
  top2: number; // the two largest lots' net
  worstLot: number;
  folds: number[];
  regimes: number[];
  years: number[];
  positiveRegimes: number;
  behaviourKey: string; // sha256 prefix of the members' trace signatures
}

// Aliases that make the replay's alphabetical tie order equal to `priority` (first wins) and change nothing else:
// book order only orders exits and fills, which cannot change a funding decision with one lot or reservation.
export const tieAliases = (priority: readonly string[]) =>
  new Map(
    priority.map((symbol, index) => [
      symbol,
      `${String.fromCharCode(97 + Math.floor(index / 26))}${String.fromCharCode(97 + (index % 26))}_${symbol}`
    ])
  );

export class JointEvaluator {
  readonly window: TraceWindow;
  readonly folds: PeriodIndex[];
  readonly regimes: PeriodIndex[];
  readonly years: PeriodIndex[];
  readonly eligibleDays: number;
  private readonly pinned = new Map<string, BookTrace>();
  private readonly dynamic = new Map<string, BookTrace>();
  private readonly phenotypes = new Map<string, BookPhenotype>();
  traceBuilds = 0;
  traceHits = 0;
  replays = 0;

  constructor(
    readonly loaded: LoadedUniverse,
    readonly dynamicCapacity = 60000,
    periods: { folds: readonly Period[]; regimes: readonly Period[]; years: readonly Period[] } = {
      folds: study.folds,
      regimes: study.regimes,
      years: yearPeriods()
    }
  ) {
    const dates = loaded.universe.dates;

    this.window = {
      armStart: loaded.universe.eligibilityIndex,
      startIndex: loaded.warmup,
      endIndex: loaded.universe.sessionCount - 1,
      splitsSha256: sha256FileSync('config/market-events/splits.json')
    };
    this.folds = periodIndices(dates, periods.folds);
    this.regimes = periodIndices(dates, periods.regimes);
    this.years = periodIndices(dates, periods.years);

    const { sTime } = Object.values(loaded.universe.instruments)[0]!.ds;

    this.eligibleDays = (sTime[this.window.endIndex]! - sTime[this.window.armStart]!) / 86400;
  }

  ds(symbol: string) {
    const instrument = this.loaded.universe.instruments[symbol];

    if (!instrument) {
      throw new Error(`${symbol} is not loaded`);
    }

    return instrument.ds;
  }

  phenotype(book: Book): BookPhenotype {
    const key = `${book.symbol}|${book.vector.id}`;
    let phenotype = this.phenotypes.get(key);

    if (!phenotype) {
      phenotype = candidateBook(book.symbol, book.vector.id, book.vector.grid);
      this.phenotypes.set(key, phenotype);
    } else if (phenotype.short !== candidateBook(book.symbol, book.vector.id, book.vector.grid).short) {
      throw new Error(`${key}: two different vectors share one ID`);
    }

    return phenotype;
  }

  // The book's trace at a cost: from the cache, or built (pinned traces are never evicted).
  trace(book: Book, costBps: number, pin = false): BookTrace {
    const key = `${book.symbol}|${book.vector.id}|${costBps}`;
    const found = this.pinned.get(key) ?? this.dynamic.get(key);

    if (found) {
      this.traceHits++;

      if (this.dynamic.has(key)) {
        this.dynamic.delete(key);
        this.dynamic.set(key, found);
      }

      return found;
    }

    this.traceBuilds++;

    const trace = traceBook(this.ds(book.symbol), this.phenotype(book), traceSettings(costBps), this.window);

    if (pin) {
      this.pinned.set(key, trace);
    } else {
      this.dynamic.set(key, trace);

      while (this.dynamic.size > this.dynamicCapacity) {
        this.dynamic.delete(this.dynamic.keys().next().value!);
      }
    }

    return trace;
  }

  replayBooks(books: readonly Book[], costBps: number): ReplayBook[] {
    return canonicalBooks(books).map((book) => ({
      symbol: book.symbol,
      ds: this.ds(book.symbol),
      trace: this.trace(book, costBps)
    }));
  }

  replay(books: readonly Book[], costBps: number, detail = false, priority?: readonly string[]): ReplayResult {
    const replayBooks = this.replayBooks(books, costBps);
    const aliases = priority ? tieAliases(priority) : undefined;
    const name = (symbol: string) => aliases?.get(symbol) ?? symbol;

    if (aliases && replayBooks.some((book) => !aliases.has(book.symbol))) {
      throw new Error('A tie priority must name every member');
    }

    this.replays++;

    const result = replayFixedPool(
      replayBooks.map((book) => ({ ...book, symbol: name(book.symbol) })),
      {
        symbols: replayBooks.map((book) => name(book.symbol)),
        startIndex: this.window.startIndex,
        endIndex: this.window.endIndex,
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

    return { ...result, books: replayBooks } as ReplayResult & { books: ReplayBook[] };
  }

  evaluate(books: readonly Book[], costBps: number = study.principalCostBps, priority?: readonly string[]) {
    const result = this.replay(books, costBps, false, priority) as ReplayResult & { books: ReplayBook[] };

    return { evaluation: this.metrics(books, costBps, result), result };
  }

  metrics(books: readonly Book[], costBps: number, result: ReplayResult & { books: ReplayBook[] }): Evaluation {
    const traces = new Map(result.books.map((book) => [book.symbol, book.trace]));
    const lotsBySymbol: Record<string, number> = {};
    const netBySymbol: Record<string, number> = {};
    const fundedDecisions = new Map<string, Set<number>>();

    for (const book of result.books) {
      lotsBySymbol[book.symbol] = 0;
      netBySymbol[book.symbol] = 0;
      fundedDecisions.set(book.symbol, new Set());
    }

    for (const lot of result.lots) {
      lotsBySymbol[lot.symbol]!++;
      netBySymbol[lot.symbol]! += lot.net;
      fundedDecisions.get(lot.symbol)!.add(lot.decisionTime);
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
    const regimes = attribute(result.marks, this.regimes);

    return {
      key: keyOf(books),
      costBps,
      books: books.length,
      members: result.books.map((book) => book.symbol),
      net: result.net,
      realized: result.realized,
      unrealized: result.unrealized,
      minuteDrawdown: result.minuteDrawdown.maximum,
      dailyDrawdown: result.dailyDrawdown.maximum,
      lots: result.lots.length,
      lotsBySymbol,
      netBySymbol,
      virtualTrades: result.books.reduce((total, book) => total + book.trace.trades.length, 0),
      inertBooks: result.books.filter((book) => book.trace.trades.length === 0).length,
      refused: result.refused,
      contested,
      refusals,
      heldDays: result.heldDays,
      utilization: result.heldDays / this.eligibleDays,
      interest: result.interest,
      costs: result.lots.reduce((total, lot) => total + lot.costs, 0),
      top1: nets[0] ?? 0,
      top2: (nets[0] ?? 0) + (nets[1] ?? 0),
      worstLot: Math.min(0, ...nets),
      folds: attribute(result.marks, this.folds),
      regimes,
      years: attribute(result.marks, this.years),
      positiveRegimes: regimes.filter((value) => value > 0).length,
      behaviourKey: createHash('sha256')
        .update(
          [...result.books]
            .sort((a, b) => (a.symbol < b.symbol ? -1 : 1))
            .map((book) => `${book.symbol}:${book.trace.signature}`)
            .join('|')
        )
        .digest('hex')
        .slice(0, 16)
    };
  }

  cacheStats() {
    return {
      pinned: this.pinned.size,
      dynamic: this.dynamic.size,
      traceBuilds: this.traceBuilds,
      traceHits: this.traceHits,
      replays: this.replays
    };
  }
}
