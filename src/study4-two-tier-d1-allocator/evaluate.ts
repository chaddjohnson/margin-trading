// Pure evaluation functions of a development window (PROTOCOL.md §5, §7–9): the window context (datasets, B5's run,
// bands, role thresholds, year boundaries), the 4A standalone profile of a shallow vector, and the shared-pool
// evaluation of a genome with its role checks, preservation and selection features. Used identically by the worker
// threads and the in-process runner; no randomness, no clock, no file access.
import type { Dataset } from '../four-family/data.ts';
import {
  type AllocBook,
  type AllocConfig,
  type AllocResult,
  type Policy,
  policyOf,
  runAllocator
} from './allocator.ts';
import {
  type Band,
  type BookSpec,
  type Bounds,
  deepBroadBand,
  gridKey,
  inBounds,
  neighbourhoodBounds,
  shallowBand,
  shallowBounds,
  volatilityOf
} from './books.ts';
import { type Grid, type WindowKey, b5Symbols, xGridMax } from './context.ts';
import { attributionOf, classifyLot, compactOf, preservationOf, slotIntervals } from './metrics.ts';
import { type Genome, genomeKey } from './space.ts';
import { type ExecSettings, type Trace, TraceCache, baseSettings } from './trace.ts';

export interface SymbolInfo {
  symbol: string;
  sigma: number;
  shallow: Band;
  deepBroad: Band;
}

export interface WindowSpec {
  window: WindowKey | 'test';
  endIndex: number;
  armStart: number;
  years: number; // from the arming session to the window end
  yearEnds: number[]; // session indexes: 0, then each calendar year's last session up to endIndex (inclusive)
  symbols: SymbolInfo[];
  b5: BookSpec[];
  rho: number; // min X0/σ over B5's books
  b5Decisions: Record<string, number>; // per B5 symbol, development decisions
  busiestB5PerYear: number;
  b5Run: { net: number; minuteDD: number; dailyDD: number; yearly: number[] };
}

export interface Context {
  spec: WindowSpec;
  datasets: Record<string, Dataset>;
  cache: TraceCache;
  settings: ExecSettings;
  b5Result: AllocResult;
  b5Slots: { from: number; to: number }[];
  info: Map<string, SymbolInfo>;
}

export const allocConfigOf = (
  spec: Pick<WindowSpec, 'endIndex' | 'armStart'>,
  policy: Policy,
  settings: ExecSettings
): AllocConfig => ({
  startIndex: 0,
  endIndex: spec.endIndex,
  armStart: spec.armStart,
  principal: settings.notional,
  rate: settings.rate,
  costBps: settings.costBps,
  stopSlippageBps: settings.stopSlippageBps,
  policy,
  tieMode: 'tier'
});

export const yearEndsOf = (dates: readonly string[], endIndex: number) => {
  const ends = [0];

  for (let s = 1; s <= endIndex; s++) {
    if (s === endIndex || dates[s + 1]!.slice(0, 4) !== dates[s]!.slice(0, 4)) {
      ends.push(s);
    }
  }

  return ends;
};

// The window specification from the door's datasets (σ, bands, B5 role thresholds); B5's run is filled by makeContext.
export const windowSpecOf = (
  window: WindowKey | 'test',
  datasets: Record<string, Dataset>,
  symbols: readonly string[],
  b5: BookSpec[],
  armStart: number
): WindowSpec => {
  const any = datasets[symbols[0]!]!;
  const endIndex = any.sessionCount - 1;
  const years = (any.sTime[endIndex]! - any.sTime[armStart]!) / (365.25 * 86400);
  const sigmaOf = new Map(symbols.map((symbol) => [symbol, volatilityOf(datasets[symbol]!, endIndex)]));
  const rho = Math.min(...b5.map((book) => book.grid.targetPercentChange / 1000 / sigmaOf.get(book.symbol)!));
  const info: SymbolInfo[] = symbols.map((symbol) => {
    const sigma = sigmaOf.get(symbol)!;
    const b5Book = b5.find((book) => book.symbol === symbol);

    return {
      symbol,
      sigma,
      shallow: shallowBand(sigma, b5Book?.grid.targetPercentChange),
      deepBroad: deepBroadBand(sigma, rho)
    };
  });

  return {
    window,
    endIndex,
    armStart,
    years,
    yearEnds: yearEndsOf(any.dates, endIndex),
    symbols: info,
    b5,
    rho,
    b5Decisions: {},
    busiestB5PerYear: 0,
    b5Run: { net: 0, minuteDD: 0, dailyDD: 0, yearly: [] }
  };
};

export const makeContext = (
  spec: WindowSpec,
  datasets: Record<string, Dataset>,
  settings: ExecSettings = baseSettings()
): Context => {
  const cache = new TraceCache(5000, datasets, spec.armStart, spec.endIndex);
  const books = spec.b5.map((book) => allocBookOf(datasets, cache, settings, book));
  const b5Result = runAllocator(books, allocConfigOf(spec, policyOf('P0'), settings));
  const yearly = spec.yearEnds
    .slice(1)
    .map((end, index) => b5Result.liquidation[end]! - b5Result.liquidation[spec.yearEnds[index]!]!);

  for (const book of books) {
    spec.b5Decisions[book.symbol] = book.trace.trades.length;
  }

  spec.busiestB5PerYear = Math.max(...Object.values(spec.b5Decisions)) / spec.years;
  spec.b5Run = {
    net: b5Result.net,
    minuteDD: b5Result.minuteDrawdown.maximum,
    dailyDD: b5Result.dailyDrawdown.maximum,
    yearly
  };

  return {
    spec,
    datasets,
    cache,
    settings,
    b5Result,
    b5Slots: slotIntervals(b5Result),
    info: new Map(spec.symbols.map((entry) => [entry.symbol, entry]))
  };
};

export const allocBookOf = (
  datasets: Record<string, Dataset>,
  cache: TraceCache,
  settings: ExecSettings,
  book: BookSpec,
  shallowRank?: number
): AllocBook => ({
  id: book.id,
  symbol: book.symbol,
  tier: book.tier,
  ds: datasets[book.symbol]!,
  trace: cache.get(book, settings),
  shallowRank
});

// ----- role checks (PROTOCOL.md §5) -----

export const referenceGrid = (grid: Grid, sigma: number): Grid => ({
  ...grid,
  targetPercentChange: Math.min(xGridMax, Math.max(30, Math.round(850 * sigma)))
});

export const shallowRoleFailure = (ctx: Context, book: BookSpec, trace: Trace): string => {
  const info = ctx.info.get(book.symbol);

  if (!info || info.shallow.empty) {
    return `no shallow band for ${book.symbol}`;
  }

  if (!inBounds(book.grid, shallowBounds(info.shallow))) {
    return `${book.symbol} ${gridKey(book.grid)} outside its shallow band`;
  }

  const reference = ctx.cache.get({ symbol: book.symbol, grid: referenceGrid(book.grid, info.sigma) }, ctx.settings);
  const need = Math.max(2 * ctx.spec.years, 1.5 * reference.trades.length);

  return trace.trades.length >= need ? '' : `${book.symbol}: ${trace.trades.length} decisions < ${need.toFixed(1)}`;
};

export const deepRoleFailure = (
  ctx: Context,
  book: BookSpec,
  trace: Trace,
  mode: 'neighbourhood' | 'broad'
): string => {
  const info = ctx.info.get(book.symbol)!;
  const x = book.grid.targetPercentChange;
  const floor = Math.max(80, Math.ceil(1000 * ctx.spec.rho * info.sigma - 1e-9));
  const incumbent = ctx.spec.b5.find((b5) => b5.symbol === book.symbol);

  if (mode === 'neighbourhood') {
    if (!incumbent || !inBounds(book.grid, neighbourhoodBounds(incumbent.grid, info.sigma, ctx.spec.rho))) {
      return `${book.symbol}: outside the incumbent's neighbourhood`;
    }
  } else if (info.deepBroad.empty || x < floor || x > xGridMax) {
    return `${book.symbol}: X ${x} outside the deep band`;
  }

  if (!info.shallow.empty && x <= info.shallow.hi) {
    return `${book.symbol}: X inside the shallow band`;
  }

  if (incumbent) {
    const cap = 1.5 * ctx.spec.b5Decisions[book.symbol]! + 2;

    return trace.trades.length <= cap ? '' : `${book.symbol}: ${trace.trades.length} decisions > ${cap}`;
  }

  const perYear = trace.trades.length / ctx.spec.years;

  return perYear <= ctx.spec.busiestB5PerYear ? '' : `${book.symbol}: ${perYear.toFixed(2)} decisions/yr > busiest B5`;
};

// ----- 4A: the standalone profile of a shallow vector -----

export interface Standalone {
  symbol: string;
  grid: string;
  roleFailure: string;
  decisions: number;
  referenceDecisions: number;
  trades: number;
  wins: number;
  net: number;
  worst: number;
  minuteDD: number;
  dailyDD: number;
  heldDays: number;
  meanHold: number;
  deepArmings: number;
  continuationArmings: number;
  idleCleanTrades: number;
  idleCleanNet: number;
  idleCleanHeldDays: number;
  conflictTrades: number;
  conflictNet: number;
  yearly: number[];
  fallingKnifeLosses: number;
}

export const standaloneOf = (ctx: Context, symbol: string, grid: Grid): Standalone => {
  const book: BookSpec = { id: `S:${symbol}`, symbol, tier: 'shallow', grid, origin: '4A' };
  const trace = ctx.cache.get(book, ctx.settings);
  const info = ctx.info.get(symbol)!;
  const reference = ctx.cache.get({ symbol, grid: referenceGrid(grid, info.sigma) }, ctx.settings);
  const roleFailure = shallowRoleFailure(ctx, book, trace);
  const result = runAllocator(
    [{ id: book.id, symbol, tier: 'shallow', ds: ctx.datasets[symbol]!, trace }],
    allocConfigOf(ctx.spec, policyOf('P0'), ctx.settings)
  );
  let idleCleanTrades = 0;
  let idleCleanNet = 0;
  let idleCleanHeldDays = 0;
  let conflictTrades = 0;
  let conflictNet = 0;
  let wins = 0;
  let worst = 0;
  let fallingKnifeLosses = 0;
  const ds = ctx.datasets[symbol]!;

  for (const lot of result.lots) {
    const days =
      ((lot.exitIndex >= 0 ? ds.sTime[lot.exitIndex]! : ds.sTime[ctx.spec.endIndex]!) - ds.sTime[lot.entryIndex]!) /
      86400;

    if (lot.net > 0) {
      wins++;
    }

    worst = Math.min(worst, lot.net);

    if (classifyLot(lot, ctx.b5Slots) === 'idle-clean') {
      idleCleanTrades++;
      idleCleanNet += lot.net;
      idleCleanHeldDays += days;
    } else {
      conflictTrades++;
      conflictNet += lot.net;
    }

    // a falling knife: a losing trade entered ≥ 5 sessions before the lowest close of the next 60 sessions
    if (lot.net < 0) {
      let low = Infinity;
      let lowIndex = lot.entryIndex;

      for (let s = lot.entryIndex; s <= Math.min(ctx.spec.endIndex, lot.entryIndex + 60); s++) {
        if (ds.sClose[s]! < low) {
          low = ds.sClose[s]!;
          lowIndex = s;
        }
      }

      if (lowIndex - lot.entryIndex >= 5) {
        fallingKnifeLosses += lot.net;
      }
    }
  }

  return {
    symbol,
    grid: gridKey(grid),
    roleFailure,
    decisions: trace.trades.length,
    referenceDecisions: reference.trades.length,
    trades: result.lots.length,
    wins,
    net: result.net,
    worst,
    minuteDD: result.minuteDrawdown.maximum,
    dailyDD: result.dailyDrawdown.maximum,
    heldDays: result.heldDays,
    meanHold: result.lots.length ? result.heldDays / result.lots.length : 0,
    deepArmings: trace.deepArmings,
    continuationArmings: trace.continuationArmings,
    idleCleanTrades,
    idleCleanNet,
    idleCleanHeldDays,
    conflictTrades,
    conflictNet,
    yearly: ctx.spec.yearEnds
      .slice(1)
      .map((end, index) => result.liquidation[end]! - result.liquidation[ctx.spec.yearEnds[index]!]!),
    fallingKnifeLosses
  };
};

// ----- the shared-pool evaluation of a genome -----

export type ExperimentClass = 'frozenB5' | 'reoptimized';

export interface Evaluation {
  key: string;
  roleFailure: string;
  feasible: boolean;
  violation: number; // total constraint violation (0 when feasible)
  net: number;
  delta: number;
  minuteDD: number;
  dailyDD: number;
  pnlWeighted: number;
  countWeighted: number;
  retention: number;
  topMissed: number;
  yearlyDelta: number[];
  maxYearShare: number;
  loyo: boolean;
  lots: number;
  shallowLots: number;
  shallowNet: number;
  idleCleanNet: number;
  mirrorLots: number;
  switchesExecuted: number;
  forcedLossNet: number;
  interest: number;
  heldDays: number;
  worstLot: number;
}

export const booksOfGenome = (genome: Genome): BookSpec[] => [...genome.deep, ...genome.shallow];

export const runGenome = (
  ctx: Context,
  genome: Genome,
  settings = ctx.settings,
  config: Partial<AllocConfig> = {}
): { result: AllocResult; books: AllocBook[]; roleFailure: string } => {
  const books: AllocBook[] = [];
  const failures: string[] = [];

  for (const book of genome.deep) {
    const allocBook = allocBookOf(ctx.datasets, ctx.cache, settings, book);

    if (book.origin !== 'B5') {
      const failure = deepRoleFailure(ctx, book, ctx.cache.get(book, ctx.settings), book.deepMode ?? 'broad');

      if (failure) {
        failures.push(failure);
      }
    }

    books.push(allocBook);
  }

  genome.shallow.forEach((book, rank) => {
    const allocBook = allocBookOf(ctx.datasets, ctx.cache, settings, book, rank);
    const failure = shallowRoleFailure(ctx, book, ctx.cache.get(book, ctx.settings));

    if (failure) {
      failures.push(failure);
    }

    books.push(allocBook);
  });

  const result = runAllocator(books, { ...allocConfigOf(ctx.spec, genome.policy, settings), ...config });

  return { result, books, roleFailure: failures.join('; ') };
};

export const thresholds = {
  minuteDD: 35000,
  minuteOverB5: 5000,
  dailyDD: 30000,
  deltaMin: 10000,
  maxYearShare: 0.7,
  frozen: { pnl: 0.9, count: 0.85 },
  reoptimized: { retention: 0.75 },
  topWinners: 5
} as const;

export const evaluateGenome = (ctx: Context, genome: Genome, cls: ExperimentClass): Evaluation => {
  const { result, roleFailure } = runGenome(ctx, genome);
  const b5 = ctx.b5Result;
  const preservation = preservationOf(result, b5, { top: thresholds.topWinners });
  const attribution = attributionOf(result, b5);
  const compact = compactOf(result);
  const spec = ctx.spec;
  const yearly = spec.yearEnds
    .slice(1)
    .map((end, index) => result.liquidation[end]! - result.liquidation[spec.yearEnds[index]!]!);
  const yearlyDelta = yearly.map((value, index) => value - spec.b5Run.yearly[index]!);
  const delta = result.net - b5.net;
  const maxYear = Math.max(...yearlyDelta);
  const maxYearShare = delta > 0 ? maxYear / delta : Infinity;
  const loyo = delta > 0 && yearlyDelta.every((value) => delta - value > 0);
  const ddCap = Math.min(thresholds.minuteDD, spec.b5Run.minuteDD + thresholds.minuteOverB5);
  const violations = [
    roleFailure ? 1e6 : 0,
    Math.max(0, result.minuteDrawdown.maximum - ddCap),
    Math.max(0, result.dailyDrawdown.maximum - thresholds.dailyDD),
    Math.max(0, thresholds.deltaMin - delta),
    delta > 0 ? Math.max(0, maxYear - thresholds.maxYearShare * delta) : 0,
    loyo ? 0 : 1000,
    cls === 'frozenB5'
      ? 10000 * Math.max(0, thresholds.frozen.pnl - preservation.pnlWeighted) +
        10000 * Math.max(0, thresholds.frozen.count - preservation.countWeighted)
      : 10000 * Math.max(0, thresholds.reoptimized.retention - preservation.retention),
    10000 * preservation.topMissed
  ];
  const violation = violations.reduce((total, value) => total + value, 0);

  return {
    key: genomeKey(genome),
    roleFailure,
    feasible: violation === 0,
    violation,
    net: result.net,
    delta,
    minuteDD: result.minuteDrawdown.maximum,
    dailyDD: result.dailyDrawdown.maximum,
    pnlWeighted: preservation.pnlWeighted,
    countWeighted: preservation.countWeighted,
    retention: preservation.retention,
    topMissed: preservation.topMissed,
    yearlyDelta,
    maxYearShare,
    loyo,
    lots: compact.lots,
    shallowLots: compact.shallowLots,
    shallowNet: compact.shallowNet,
    idleCleanNet: attribution.idleClean.net,
    mirrorLots: compact.mirrorLots,
    switchesExecuted: compact.switchesExecuted,
    forcedLossNet: compact.forcedLossNet,
    interest: compact.interest,
    heldDays: compact.heldDays,
    worstLot: compact.worstLot
  };
};

export const b5Genome = (spec: Pick<WindowSpec, 'b5'>, policy: Policy = policyOf('P0')): Genome => ({
  deep: spec.b5.map((book) => ({ ...book })),
  shallow: [],
  policy
});

export const shallowBoundsOf = (ctx: Context, symbol: string): Bounds | undefined => {
  const info = ctx.info.get(symbol);

  return info && !info.shallow.empty ? shallowBounds(info.shallow) : undefined;
};

export const neighbourhoodOf = (ctx: Context, symbol: string): Bounds => {
  const incumbent = ctx.spec.b5.find((book) => book.symbol === symbol)!;

  return neighbourhoodBounds(incumbent.grid, ctx.info.get(symbol)!.sigma, ctx.spec.rho);
};

export const deepBroadBoundsOf = (ctx: Context, symbol: string): Bounds | undefined => {
  const info = ctx.info.get(symbol);

  return info && !info.deepBroad.empty ? shallowBounds(info.deepBroad) : undefined;
};

export { b5Symbols };
