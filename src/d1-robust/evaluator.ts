// The study's evaluator on one loaded window: a central trace cache (pinned library traces and an LRU of the rest,
// keyed by symbol, vector ID and cost — the window is the evaluator's), trace builds and trace-based replays run on
// the pool (./pool.ts) in parallel, results returned in request order. Because neighbour step patterns are common
// random numbers (./neighbourhood.ts), a (symbol, vector) shared by two configurations shares its neighbours' traces,
// which the central cache reuses whichever configuration asked first.
import { sha256FileSync } from '#lib';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import type { ReplayBook, ReplayResult } from '../portfolio-aware-d1/replay.ts';
import type { BookTrace, TraceWindow } from '../portfolio-aware-d1/trace.ts';
import {
  type EngineSpec,
  type EngineSummary,
  type EvalPeriods,
  type Evaluation,
  buildTrace,
  canonicalBooks,
  keyOf,
  periodsOf,
  phenotypeOf,
  replayOf
} from './evaluate.ts';
import { type Book, type NeighbourClass, gridKeyOf, movedCoordinates, neighbourOf } from './neighbourhood.ts';
import { LocalRunner, type Runner, WorkerRunner } from './pool.ts';
import type { NeighbourRecord } from './stats.ts';
import type { ReplayItem, TraceItem } from './worker.ts';

export interface EvalRequest {
  mode: 'centre' | 'neighbour';
  books: Book[];
  costBps: number;
  moved?: number;
  markIndices?: number[];
  priority?: string[];
  withFunded?: boolean;
}

const traceKeyOf = (symbol: string, grid: Book['vector']['grid'], costBps: number) =>
  `${symbol}|${gridKeyOf(grid)}|${costBps}`;

export const traceWindowOf = (loaded: LoadedUniverse): TraceWindow => ({
  armStart: loaded.universe.eligibilityIndex,
  startIndex: loaded.warmup,
  endIndex: loaded.universe.sessionCount - 1,
  splitsSha256: sha256FileSync('config/market-events/splits.json')
});

export class RobustEvaluator {
  readonly window: TraceWindow;
  readonly periods: EvalPeriods;
  readonly eligibleDays: number;
  readonly dates: readonly string[];
  private readonly pinned = new Map<string, BookTrace>();
  private readonly dynamic = new Map<string, BookTrace>();
  traceBuilds = 0;
  traceHits = 0;
  replays = 0;
  engineRuns = 0;
  replayChunk = 32;
  traceChunk = 8;

  private constructor(
    readonly loaded: LoadedUniverse,
    readonly label: string,
    readonly runner: Runner,
    readonly dynamicCapacity: number
  ) {
    this.window = traceWindowOf(loaded);
    this.dates = loaded.universe.dates;
    this.periods = periodsOf(this.dates, this.window.armStart);

    const { sTime } = Object.values(loaded.universe.instruments)[0]!.ds;

    this.eligibleDays = (sTime[this.window.endIndex]! - sTime[this.window.armStart]!) / 86400;
  }

  // workers = 0: in-process; otherwise a worker pool of that size.
  static async create(loaded: LoadedUniverse, label: string, workers: number, dynamicCapacity = 150000) {
    const window = traceWindowOf(loaded);
    const periods = periodsOf(loaded.universe.dates, window.armStart);
    const { sTime } = Object.values(loaded.universe.instruments)[0]!.ds;
    const context = {
      universe: loaded.universe,
      window,
      periods,
      eligibleDays: (sTime[window.endIndex]! - sTime[window.armStart]!) / 86400
    };
    const runner: Runner = workers > 0 ? new WorkerRunner(context, workers) : new LocalRunner(context);

    if (runner instanceof WorkerRunner) {
      await runner.ready;
    }

    return new RobustEvaluator(loaded, label, runner, dynamicCapacity);
  }

  async close() {
    await this.runner.close();
  }

  ds(symbol: string) {
    const instrument = this.loaded.universe.instruments[symbol];

    if (!instrument) {
      throw new Error(`${symbol} is not loaded`);
    }

    return instrument.ds;
  }

  private cached(key: string) {
    const found = this.pinned.get(key) ?? this.dynamic.get(key);

    if (found && this.dynamic.has(key)) {
      this.dynamic.delete(key);
      this.dynamic.set(key, found);
    }

    return found;
  }

  private store(key: string, trace: BookTrace, pin: boolean) {
    if (pin) {
      this.pinned.set(key, trace);
      this.dynamic.delete(key);
      return;
    }

    if (this.pinned.has(key)) {
      return;
    }

    this.dynamic.set(key, trace);

    while (this.dynamic.size > this.dynamicCapacity) {
      this.dynamic.delete(this.dynamic.keys().next().value!);
    }
  }

  // The traces of every (book, cost), built in parallel where missing; returns them by key (held, so an eviction
  // during a large batch cannot lose one before it is used).
  async ensureTraces(items: { book: Book; costBps: number }[], pin = false): Promise<Map<string, BookTrace>> {
    const held = new Map<string, BookTrace>();
    const missing = new Map<string, TraceItem>();

    for (const { book, costBps } of items) {
      const key = traceKeyOf(book.symbol, book.vector.grid, costBps);

      if (held.has(key) || missing.has(key)) {
        continue;
      }

      const found = this.cached(key);

      if (found) {
        this.traceHits++;
        held.set(key, found);

        if (pin) {
          this.store(key, found, true);
        }
      } else {
        missing.set(key, { symbol: book.symbol, book: { symbol: book.symbol, vector: book.vector }, costBps });
      }
    }

    const list = [...missing.entries()];
    const chunks: [string, TraceItem][][] = [];

    for (let index = 0; index < list.length; index += this.traceChunk) {
      chunks.push(list.slice(index, index + this.traceChunk));
    }

    const built = await Promise.all(
      chunks.map((chunk) => this.runner.run({ type: 'traces', items: chunk.map(([, item]) => item) }))
    );

    chunks.forEach((chunk, c) => {
      chunk.forEach(([key], i) => {
        const trace = built[c]![i] as BookTrace;

        this.traceBuilds++;
        this.store(key, trace, pin);
        held.set(key, trace);
      });
    });

    return held;
  }

  // Replays in request order (centre metrics or neighbour records), traces built first where missing.
  async run(requests: EvalRequest[]): Promise<(Evaluation | NeighbourRecord)[]> {
    const traces = await this.ensureTraces(
      requests.flatMap((request) => request.books.map((book) => ({ book, costBps: request.costBps })))
    );
    const tasks: { traces: BookTrace[]; items: ReplayItem[] }[] = [];

    for (let index = 0; index < requests.length; index += this.replayChunk) {
      const slice = requests.slice(index, index + this.replayChunk);
      const list: BookTrace[] = [];
      const position = new Map<string, number>();
      const items = slice.map((request): ReplayItem => {
        const canonical = canonicalBooks(request.books);

        return {
          mode: request.mode,
          key: keyOf(request.books),
          symbols: canonical.map((book) => book.symbol),
          traces: canonical.map((book) => {
            const key = traceKeyOf(book.symbol, book.vector.grid, request.costBps);
            let at = position.get(key);

            if (at === undefined) {
              at = list.length;
              position.set(key, at);
              list.push(traces.get(key)!);
            }

            return at;
          }),
          costBps: request.costBps,
          ...(request.priority ? { priority: request.priority } : {}),
          ...(request.moved !== undefined ? { moved: request.moved } : {}),
          ...(request.markIndices ? { markIndices: request.markIndices } : {}),
          ...(request.withFunded ? { withFunded: true } : {})
        };
      });

      tasks.push({ traces: list, items });
    }

    const results = await Promise.all(tasks.map((task) => this.runner.run({ type: 'replays', ...task })));

    this.replays += requests.length;

    return results.flat() as (Evaluation | NeighbourRecord)[];
  }

  async centres(
    configs: Book[][],
    costBps: number,
    options: { markIndices?: number[]; withFunded?: boolean; priority?: string[] } = {}
  ): Promise<Evaluation[]> {
    return (await this.run(configs.map((books) => ({ mode: 'centre', books, costBps, ...options })))) as Evaluation[];
  }

  // N neighbours of each configuration under one class and stage (N3: member given per configuration).
  async neighbourRecords(
    configs: Book[][],
    spec: { stage: string; cls: NeighbourClass; n: number; costBps: number; markIndices?: number[]; member?: string[] }
  ): Promise<NeighbourRecord[][]> {
    const requests: EvalRequest[] = [];

    configs.forEach((books, c) => {
      for (let draw = 0; draw < spec.n; draw++) {
        const neighbour = neighbourOf(books, this.label, spec.stage, spec.cls, draw, spec.member?.[c]);

        requests.push({
          mode: 'neighbour',
          books: neighbour,
          costBps: spec.costBps,
          moved: movedCoordinates(books, neighbour),
          ...(spec.markIndices ? { markIndices: spec.markIndices } : {})
        });
      }
    });

    const records = (await this.run(requests)) as NeighbourRecord[];

    return configs.map((_, c) => records.slice(c * spec.n, (c + 1) * spec.n));
  }

  async engines(specs: EngineSpec[]): Promise<EngineSummary[]> {
    const chunks: EngineSpec[][] = specs.map((spec) => [spec]);
    const results = await Promise.all(chunks.map((items) => this.runner.run({ type: 'engine', items })));

    this.engineRuns += specs.length;

    return results.flat() as EngineSummary[];
  }

  // A detailed replay on the main thread (parity, reports).
  replayDetail(books: readonly Book[], costBps: number, priority?: string[]): ReplayResult & { books: ReplayBook[] } {
    const canonical = canonicalBooks(books);
    const replayBooks = canonical.map((book) => ({
      symbol: book.symbol,
      ds: this.ds(book.symbol),
      trace: buildTrace(this.ds(book.symbol), book, costBps, this.window)
    }));

    return { ...replayOf(replayBooks, costBps, this.window, true, priority), books: replayBooks };
  }

  phenotypes(books: readonly Book[]) {
    return Object.fromEntries(books.map((book) => [book.symbol, phenotypeOf(book)]));
  }

  cacheStats() {
    return {
      pinned: this.pinned.size,
      dynamic: this.dynamic.size,
      traceBuilds: this.traceBuilds,
      traceHits: this.traceHits,
      hitRate: this.traceHits / Math.max(1, this.traceHits + this.traceBuilds),
      replays: this.replays,
      engineRuns: this.engineRuns
    };
  }
}
