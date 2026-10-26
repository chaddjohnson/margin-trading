// The study's evaluator on one loaded window: a central trace cache keyed by (symbol, grid, cost) — the window is the
// evaluator's — trace builds, standalone metrics and preemptive pool replays run on the pool (./pool.ts) in parallel,
// results returned in request order. Traces never depend on the allocator (shadow semantics), so one trace serves
// every configuration, ranking and policy that holds that book.
import { sha256FileSync } from '#lib';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import type { BookTrace, TraceWindow } from '../portfolio-aware-d1/trace.ts';
import type { Allocation } from './allocation.ts';
import type { Book, PoolMetrics, StandaloneMetrics } from './evaluate.ts';
import { configKeyOf, traceKeyOf } from './evaluate.ts';
import { LocalRunner, type Runner, WorkerRunner } from './pool.ts';
import type { PoolItem, StandaloneItem } from './worker.ts';

export interface PoolEvalRequest {
  books: Book[];
  costBps: number;
  allocation: Allocation;
  minLots: number;
  windowStarts?: number[];
}

export const traceWindowOf = (loaded: LoadedUniverse): TraceWindow => ({
  armStart: loaded.universe.eligibilityIndex,
  startIndex: loaded.warmup,
  endIndex: loaded.universe.sessionCount - 1,
  splitsSha256: sha256FileSync('config/market-events/splits.json')
});

const sortBooks = (books: readonly Book[]) =>
  [...books].sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));

const chunks = <T>(items: readonly T[], size: number) => {
  const out: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }

  return out;
};

export class Evaluator {
  readonly window: TraceWindow;
  readonly dates: readonly string[];
  private readonly cache = new Map<string, BookTrace>();
  traceBuilds = 0;
  traceHits = 0;
  standaloneEvals = 0;
  poolEvals = 0;
  standaloneChunk = 16;
  traceChunk = 8;
  poolChunk = 24;

  private constructor(
    readonly loaded: LoadedUniverse,
    readonly runner: Runner,
    readonly capacity: number
  ) {
    this.window = traceWindowOf(loaded);
    this.dates = loaded.universe.dates;
  }

  // workers = 0: in-process; otherwise a worker pool of that size.
  static async create(loaded: LoadedUniverse, workers: number, capacity = 200000) {
    const context = { universe: loaded.universe, window: traceWindowOf(loaded) };
    const runner: Runner = workers > 0 ? new WorkerRunner(context, workers) : new LocalRunner(context);

    if (runner instanceof WorkerRunner) {
      await runner.ready;
    }

    return new Evaluator(loaded, runner, capacity);
  }

  async close() {
    await this.runner.close();
  }

  get cacheSize() {
    return this.cache.size;
  }

  async standalone(items: StandaloneItem[]): Promise<StandaloneMetrics[]> {
    const parts = await Promise.all(
      chunks(items, this.standaloneChunk).map((chunk) => this.runner.run({ type: 'standalone', items: chunk }))
    );

    this.standaloneEvals += items.length;

    return parts.flat() as StandaloneMetrics[];
  }

  // Every trace the books need, built once (in parallel) and cached.
  async ensureTraces(books: readonly { book: Book; costBps: number }[]) {
    const missing = new Map<string, { book: Book; costBps: number }>();
    const needed = new Set<string>();

    for (const item of books) {
      const key = traceKeyOf(item.book.symbol, item.book.vector.grid, item.costBps);

      needed.add(key);

      if (this.cache.has(key)) {
        this.traceHits++;
      } else if (!missing.has(key)) {
        missing.set(key, item);
      }
    }

    if (missing.size === 0) {
      return;
    }

    const entries = [...missing];
    const parts = await Promise.all(
      chunks(entries, this.traceChunk).map((chunk) =>
        this.runner.run({ type: 'traces', items: chunk.map(([, item]) => item) })
      )
    );
    const built = parts.flat() as BookTrace[];

    if (this.cache.size + built.length > this.capacity) {
      const excess = this.cache.size + built.length - this.capacity;
      let removed = 0;

      // the oldest entries first, never one this batch needs
      for (const key of [...this.cache.keys()]) {
        if (removed >= excess) {
          break;
        }

        if (!needed.has(key)) {
          this.cache.delete(key);
          removed++;
        }
      }
    }

    entries.forEach(([key], index) => this.cache.set(key, built[index]!));
    this.traceBuilds += built.length;
  }

  trace(book: Book, costBps: number) {
    const found = this.cache.get(traceKeyOf(book.symbol, book.vector.grid, costBps));

    if (!found) {
      throw new Error(`${book.symbol}: no cached trace`);
    }

    return found;
  }

  async pools(requests: PoolEvalRequest[]): Promise<PoolMetrics[]> {
    const canonical = requests.map((request) => ({ ...request, books: sortBooks(request.books) }));

    for (const request of canonical) {
      if (new Set(request.books.map((book) => book.symbol)).size !== request.books.length) {
        throw new Error(`A configuration holds a symbol twice: ${configKeyOf(request.books)}`);
      }
    }

    await this.ensureTraces(
      canonical.flatMap((request) => request.books.map((book) => ({ book, costBps: request.costBps })))
    );

    const parts = await Promise.all(
      chunks(canonical, this.poolChunk).map((chunk) => {
        const traces: BookTrace[] = [];
        const index = new Map<string, number>();
        const items: PoolItem[] = chunk.map((request) => ({
          books: request.books,
          traces: request.books.map((book) => {
            const key = traceKeyOf(book.symbol, book.vector.grid, request.costBps);
            let position = index.get(key);

            if (position === undefined) {
              position = traces.length;
              traces.push(this.trace(book, request.costBps));
              index.set(key, position);
            }

            return position;
          }),
          costBps: request.costBps,
          allocation: request.allocation,
          ...(request.windowStarts ? { windowStarts: request.windowStarts } : {}),
          minLots: request.minLots
        }));

        return this.runner.run({ type: 'pools', traces, items });
      })
    );

    this.poolEvals += requests.length;

    return parts.flat() as PoolMetrics[];
  }
}
