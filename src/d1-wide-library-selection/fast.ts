// The fast path (the source study's own evaluator, unchanged and imported read-only): a book's trace from the frozen
// ShadowBook and the frozen fixed-pool replay, on a loaded universe, in the source's worker pool. Used for every
// training-side measurement (archive reconstruction, the new search, fingerprints, neighbourhood draws) and for the
// windowed (incremental) figures of the evaluation windows; the reported nominees are re-run on the full N-book
// engine (./engine.ts) and must agree (parity, fail closed).
import { p0Allocation } from '../d1-ranked-preemption/allocation.ts';
import type { PoolMetrics, StandaloneMetrics } from '../d1-ranked-preemption/evaluate.ts';
import { Evaluator } from '../d1-ranked-preemption/evaluator.ts';
import { defaultWorkerCount } from '../d1-ranked-preemption/pool.ts';
import { neighbour, vectorOf } from '../d1-ranked-preemption/space.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { minimumTrades, study } from './context.ts';

export type { Grid, PoolMetrics, StandaloneMetrics };

export const paramOrder = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize',
  'intradayLossBuffer',
  'pullback',
  'continuationWindow'
] as const;

export const gridKeyOf = (grid: Grid) => paramOrder.map((key) => grid[key]).join('.');

export const gridOfKey = (key: string): Grid => {
  const values = key.split('.').map(Number);

  if (values.length !== 8 || values.some((value) => !Number.isInteger(value))) {
    throw new Error(`not a grid key: ${key}`);
  }

  return Object.fromEntries(paramOrder.map((name, index) => [name, values[index]!])) as unknown as Grid;
};

export const workers = (requested?: number) => requested ?? Math.min(14, defaultWorkerCount());

export const eligibleYearsOf = (loaded: LoadedUniverse) => {
  const ds = Object.values(loaded.universe.instruments)[0]!.ds;
  const last = loaded.universe.sessionCount - 1;

  return (ds.sTime[last]! - ds.sTime[loaded.universe.eligibilityIndex]!) / (365.25 * 86400);
};

export const minTradesOf = (loaded: LoadedUniverse) => minimumTrades(eligibleYearsOf(loaded));

// J_s (the source's standalone score) and T (this study's tail-compatible score: no best-trade deduction, a worst-lot
// loss guard), both from a vector's training metrics.
export const jsOf = (m: Pick<StandaloneMetrics, 'net' | 'bestTrade' | 'minuteDrawdown'>) =>
  m.net -
  Math.max(0, Number.isFinite(m.bestTrade) ? m.bestTrade : 0) -
  Math.max(0, m.minuteDrawdown - study.ddPenaltyFrom);

export const tOf = (m: Pick<StandaloneMetrics, 'net' | 'worstTrade' | 'minuteDrawdown'>) =>
  m.net -
  Math.max(0, m.minuteDrawdown - study.ddPenaltyFrom) -
  Math.max(0, -(Number.isFinite(m.worstTrade) ? m.worstTrade : 0) - study.worstLossFrom);

export interface Draw {
  index: number;
  cls: 'N1' | 'N1A2';
  gridKey: string;
  net: number;
  trades: number;
  dd: number;
  worst: number;
  js: number;
  t: number;
  credible: boolean;
}

export class Fast {
  private constructor(
    readonly loaded: LoadedUniverse,
    readonly evaluator: Evaluator,
    readonly minTrades: number
  ) {}

  static async create(loaded: LoadedUniverse, workerCount?: number) {
    const evaluator = await Evaluator.create(loaded, workers(workerCount));

    return new Fast(loaded, evaluator, minTradesOf(loaded));
  }

  get evaluations() {
    return this.evaluator.standaloneEvals;
  }

  async close() {
    await this.evaluator.close();
  }

  // Training metrics of every (symbol, grid) at a cost (5 bps unless stated), in request order.
  async standalone(items: readonly { symbol: string; grid: Grid; origin?: string }[], costBps: number = study.costBps) {
    return this.evaluator.standalone(
      items.map((item) => ({
        book: { symbol: item.symbol, vector: vectorOf(item.grid, item.origin ?? 'd1-wide-library') },
        costBps,
        minTrades: this.minTrades
      }))
    );
  }

  // Neighbourhood draws (the source instrument: common random numbers per (stage, class, draw), never a vector key).
  drawGrids(symbol: string, grid: Grid, stage: string, cls: 'N1' | 'N1A2', indices: readonly number[]) {
    return indices.map((index) => {
      const moved = neighbour([{ symbol, vector: vectorOf(grid, 'centre') }], stage, cls, index)[0]!;

      return { index, cls, grid: moved.vector.grid };
    });
  }

  // A fixed pool (several books, the frozen P0 allocator) with windowed figures: the incumbents' anchors only.
  async pool(books: readonly { symbol: string; grid: Grid }[], windowStarts: readonly number[], costBps: number) {
    const [metrics] = await this.evaluator.pools([
      {
        books: books.map((book) => ({ symbol: book.symbol, vector: vectorOf(book.grid, 'anchor') })),
        costBps,
        allocation: p0Allocation,
        minLots: 0,
        windowStarts: [...windowStarts]
      }
    ]);

    return metrics!;
  }

  // Windowed single-book replays (P0, fixed $100,000 slot): the liquidation-equivalent increments, windowed minute and
  // daily drawdowns and lots after each window start, from one continuous run over the loaded universe.
  async windowed(
    items: readonly { symbol: string; grid: Grid }[],
    windowStarts: readonly number[],
    costBps: number = study.costBps
  ): Promise<PoolMetrics[]> {
    return this.evaluator.pools(
      items.map((item) => ({
        books: [{ symbol: item.symbol, vector: vectorOf(item.grid, 'evaluation') }],
        costBps,
        allocation: p0Allocation,
        minLots: 0,
        windowStarts: [...windowStarts]
      }))
    );
  }
}
