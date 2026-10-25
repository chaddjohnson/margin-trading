// Fitness evaluation on training, from the cached traces and the causal replay (parity.ts proves both exact against the
// N-book engine). For one candidate vector at one cost:
//
//   standalone   the book alone in a fixed $100,000 pool (Track S's objective);
//   pool         the frozen All-lowDd books plus the book (Track P's objective), and its difference from S0 on the
//                same dates and costs, decomposed exactly into the book's funded net, the baseline lots it gains and
//                the S0 lots it displaces.
//
// Completed training P&L enters only here, after the fact; it never reaches a decision inside the replay.
import type { IntParams } from '../d1-refinement/families.ts';
import { idOf } from '../multi-etf-d1/space.ts';
import { type Period, baselineBooks, study } from './context.ts';
import type { BookPhenotype } from './nbook/engine.ts';
import type { LoadedUniverse } from './nbook/universe.ts';
import { type Grid, candidateBook, s0Books } from './phenotypes.ts';
import { type ReplayBook, type ReplayLotSummary, type ReplayResult, replayFixedPool } from './replay.ts';
import { type BookTrace, TraceCache, traceBook, traceSettings } from './trace.ts';
import { traceWindowOf } from './data.ts';

export interface PeriodIndex {
  key: string;
  first: number; // first session index of the period
  last: number; // last session index
}

export const periodIndices = (dates: string[], periods: readonly Period[]): PeriodIndex[] =>
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

const attribute = (marks: Float64Array, periods: PeriodIndex[]) =>
  periods.map(({ first, last }) => marks[last]! - (first > 0 ? marks[first - 1]! : 0));

export interface Episodes {
  count: number;
  profitable: number;
}

// A new episode starts when a decision comes ≥ gap sessions after the previous lot's exit (an open lot never ends one).
export const episodesOf = (
  lots: readonly ReplayLotSummary[],
  gap: number,
  decisionIndexOf: (lot: ReplayLotSummary) => number
): Episodes => {
  const sorted = [...lots].sort((a, b) => a.decisionTime - b.decisionTime);
  const sums: number[] = [];
  let lastExit = -Infinity;

  for (const lot of sorted) {
    const decision = decisionIndexOf(lot);

    if (sums.length === 0 || decision - lastExit >= gap) {
      sums.push(0);
    }

    sums[sums.length - 1]! += lot.net;
    lastExit = lot.open ? Infinity : lot.exitIndex;
  }

  return { count: sums.length, profitable: sums.filter((sum) => sum > 0).length };
};

export interface StandaloneMetrics {
  net: number;
  realized: number;
  unrealized: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  trades: number; // closed
  openAtEnd: number;
  wins: number;
  bestTrade: number;
  worstTrade: number;
  maxLosingStreak: number;
  interest: number;
  costs: number;
  years: number; // distinct calendar years with a closed trade
  heldDays: number;
  episodes: Episodes;
  folds: number[];
  regimes: number[];
  yearly: number[];
}

export interface PoolMetrics {
  net: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  netPerDrawdown: number;
  delta: number;
  lots: number; // the new book's funded lots
  lotsNet: number;
  lotYears: number;
  lotCosts: number;
  displacedLots: number;
  displacedNet: number;
  gainedLots: number;
  gainedNet: number;
  displacedBySymbol: Record<string, number>;
  gainedBySymbol: Record<string, number>;
  decompositionResidual: number;
  heldDays: number;
  utilization: number;
  episodes: Episodes;
  conflicts: Record<string, { refusedBy: number; displaced: number }>; // per frozen book
  folds: number[];
  regimes: number[];
  yearly: number[];
}

export interface VectorResult {
  symbol: string;
  id: string;
  grid: Grid;
  costBps: number;
  traceKey: string;
  traceSignature: string;
  virtualTrades: number;
  standalone: StandaloneMetrics;
  pool: PoolMetrics;
}

const lotKey = (lot: ReplayLotSummary) => `${lot.symbol}#${lot.tradeId}`;

export class StudyEvaluator {
  readonly window: ReturnType<typeof traceWindowOf>;
  readonly folds: PeriodIndex[];
  readonly regimes: PeriodIndex[];
  readonly years: PeriodIndex[];
  readonly eligibleDays: number;
  private frozen = new Map<number, ReplayBook[]>();
  private s0 = new Map<number, ReplayResult>();
  private s0Funded = new Map<number, Map<string, ReplayLotSummary>>();
  readonly frozenCache = new TraceCache();
  traces = 0;
  replays = 0;

  constructor(
    readonly loaded: LoadedUniverse,
    readonly books: Record<string, BookPhenotype>
  ) {
    const dates = loaded.universe.dates;

    this.window = traceWindowOf(loaded);
    this.folds = periodIndices(dates, study.folds);
    this.regimes = periodIndices(dates, study.regimes);
    this.years = periodIndices(dates, yearPeriods());

    const { sTime } = loaded.universe.instruments.VGT!.ds;

    this.eligibleDays = (sTime[this.window.endIndex]! - sTime[this.window.armStart]!) / 86400;
  }

  static async create(loaded: LoadedUniverse) {
    return new StudyEvaluator(loaded, await s0Books());
  }

  ds(symbol: string) {
    const instrument = this.loaded.universe.instruments[symbol];

    if (!instrument) {
      throw new Error(`${symbol} is not loaded`);
    }

    return instrument.ds;
  }

  trace(phenotype: BookPhenotype, costBps: number): BookTrace {
    this.traces++;

    return traceBook(this.ds(phenotype.symbol), phenotype, traceSettings(costBps), this.window);
  }

  frozenBooks(costBps: number): ReplayBook[] {
    let books = this.frozen.get(costBps);

    if (!books) {
      books = baselineBooks.map((symbol) => ({
        symbol,
        ds: this.ds(symbol),
        trace: this.frozenCache.get(this.ds(symbol), this.books[symbol]!, traceSettings(costBps), this.window)
      }));
      this.frozen.set(costBps, books);
    }

    return books;
  }

  replay(books: ReplayBook[], symbols: string[], costBps: number, detail = false) {
    this.replays++;

    return replayFixedPool(books, {
      symbols,
      startIndex: this.window.startIndex,
      endIndex: this.window.endIndex,
      principal: study.principal,
      rate: study.rate,
      costBps,
      stopSlippageBps: 0,
      detail
    });
  }

  s0Result(costBps: number) {
    let result = this.s0.get(costBps);

    if (!result) {
      result = this.replay(this.frozenBooks(costBps), [...baselineBooks], costBps);
      this.s0.set(costBps, result);
      this.s0Funded.set(costBps, new Map(result.lots.map((lot) => [lotKey(lot), lot])));
    }

    return result;
  }

  decisionIndexOf = (lot: ReplayLotSummary) => {
    // The lot's decision session: the session whose bars contain its decision time.
    const { sTime } = this.ds('VGT');
    let lo = 0;
    let hi = this.window.endIndex;
    const day = lot.decisionTime - 60;

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;

      if (sTime[mid]! <= day) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    return lo;
  };

  standaloneMetrics(result: ReplayResult): StandaloneMetrics {
    const closed = result.lots.filter((lot) => !lot.open);
    const dates = this.loaded.universe.dates;
    let streak = 0;
    let maxStreak = 0;

    for (const lot of closed) {
      streak = lot.net <= 0 ? streak + 1 : 0;
      maxStreak = Math.max(maxStreak, streak);
    }

    return {
      net: result.net,
      realized: result.realized,
      unrealized: result.unrealized,
      minuteDrawdown: result.minuteDrawdown.maximum,
      dailyDrawdown: result.dailyDrawdown.maximum,
      trades: closed.length,
      openAtEnd: result.lots.length - closed.length,
      wins: closed.filter((lot) => lot.net > 0).length,
      bestTrade: Math.max(0, ...result.lots.map((lot) => lot.net)),
      worstTrade: Math.min(0, ...result.lots.map((lot) => lot.net)),
      maxLosingStreak: maxStreak,
      interest: result.interest,
      costs: result.lots.reduce((total, lot) => total + lot.costs, 0),
      years: new Set(closed.map((lot) => dates[lot.exitIndex]!.slice(0, 4))).size,
      heldDays: result.heldDays,
      episodes: episodesOf(result.lots, study.episodeGapSessions, this.decisionIndexOf),
      folds: attribute(result.marks, this.folds),
      regimes: attribute(result.marks, this.regimes),
      yearly: attribute(result.marks, this.years)
    };
  }

  poolMetrics(result: ReplayResult, newSymbols: readonly string[], costBps: number): PoolMetrics {
    const s0 = this.s0Result(costBps);
    const s0Funded = this.s0Funded.get(costBps)!;
    const dates = this.loaded.universe.dates;
    const isNew = (lot: ReplayLotSummary) => newSymbols.includes(lot.symbol);
    const newLots = result.lots.filter(isNew);
    const baseLots = result.lots.filter((lot) => !isNew(lot));
    const baseKeys = new Set(baseLots.map(lotKey));
    const displaced = [...s0Funded.values()].filter((lot) => !baseKeys.has(lotKey(lot)));
    const gained = baseLots.filter((lot) => !s0Funded.has(lotKey(lot)));
    const sum = (lots: readonly ReplayLotSummary[]) => lots.reduce((total, lot) => total + lot.net, 0);
    const delta = result.net - s0.net;
    const count = (lots: readonly ReplayLotSummary[]) => {
      const counts: Record<string, number> = {};

      for (const lot of lots) {
        counts[lot.symbol] = (counts[lot.symbol] ?? 0) + 1;
      }

      return counts;
    };
    const conflicts: PoolMetrics['conflicts'] = {};

    for (const symbol of baselineBooks) {
      conflicts[symbol] = {
        refusedBy: result.refusals.filter(
          (refusal) => newSymbols.includes(refusal.decider) && refusal.holder === symbol
        ).length,
        displaced: displaced.filter(
          (lot) =>
            lot.symbol === symbol &&
            newLots.some(
              (holder) =>
                holder.decisionTime <= lot.decisionTime && (holder.open || holder.exitTime > lot.decisionTime - 60)
            )
        ).length
      };
    }

    const deltaMarks = new Float64Array(result.marks.length);

    for (let index = 0; index < deltaMarks.length; index++) {
      deltaMarks[index] = result.marks[index]! - s0.marks[index]!;
    }

    return {
      net: result.net,
      minuteDrawdown: result.minuteDrawdown.maximum,
      dailyDrawdown: result.dailyDrawdown.maximum,
      netPerDrawdown: result.minuteDrawdown.maximum > 0 ? result.net / result.minuteDrawdown.maximum : Infinity,
      delta,
      lots: newLots.length,
      lotsNet: sum(newLots),
      lotYears: new Set(newLots.map((lot) => dates[lot.entryIndex]!.slice(0, 4))).size,
      lotCosts: newLots.reduce((total, lot) => total + lot.costs, 0),
      displacedLots: displaced.length,
      displacedNet: sum(displaced),
      gainedLots: gained.length,
      gainedNet: sum(gained),
      displacedBySymbol: count(displaced),
      gainedBySymbol: count(gained),
      decompositionResidual: delta - (sum(newLots) + sum(gained) - sum(displaced)),
      heldDays: result.heldDays,
      utilization: result.heldDays / this.eligibleDays,
      episodes: episodesOf(newLots, study.episodeGapSessions, this.decisionIndexOf),
      conflicts,
      folds: attribute(deltaMarks, this.folds),
      regimes: attribute(deltaMarks, this.regimes),
      yearly: attribute(deltaMarks, this.years)
    };
  }

  // One candidate vector on one ETF at one cost: both tracks' metrics from one trace.
  evaluateVector(symbol: string, grid: Grid, costBps: number): VectorResult {
    const id = idOf(grid as IntParams);
    const phenotype = candidateBook(symbol, id, grid);
    const trace = this.trace(phenotype, costBps);
    const candidate: ReplayBook = { symbol, ds: this.ds(symbol), trace };
    const alone = this.replay([candidate], [symbol], costBps);
    const pool = this.replay([...this.frozenBooks(costBps), candidate], [...baselineBooks, symbol], costBps);

    return {
      symbol,
      id,
      grid,
      costBps,
      traceKey: trace.key,
      traceSignature: trace.signature,
      virtualTrades: trace.trades.length,
      standalone: this.standaloneMetrics(alone),
      pool: this.poolMetrics(pool, [symbol], costBps)
    };
  }

  // Any configuration of frozen and candidate books (substitutions, combinations), its pool metrics against S0.
  evaluateConfiguration(
    books: { symbol: string; phenotype: BookPhenotype }[],
    costBps: number
  ): { result: ReplayResult; pool: PoolMetrics } {
    const replayBooks: ReplayBook[] = books.map(({ symbol, phenotype }) => {
      const frozen = (baselineBooks as readonly string[]).includes(symbol) && phenotype === this.books[symbol];

      return {
        symbol,
        ds: this.ds(symbol),
        trace: frozen
          ? this.frozenCache.get(this.ds(symbol), phenotype, traceSettings(costBps), this.window)
          : this.trace(phenotype, costBps)
      };
    });
    const symbols = books.map((book) => book.symbol);
    const result = this.replay(replayBooks, symbols, costBps);
    const newSymbols = symbols.filter((symbol) => !(baselineBooks as readonly string[]).includes(symbol));

    return { result, pool: this.poolMetrics(result, newSymbols, costBps) };
  }
}
