// Evaluation of standalone books and shared pools on one door's universe, through the unchanged frozen fast path:
// each book's trace (src/portfolio-aware-d1/trace.ts traceBook) and the causal fixed-pool replay (replay.ts
// replayFixedPool). Parity with the full N-book engine (runNAllocator, the engine of `npm run pools`) is checked by
// parity.ts. Metrics follow PROTOCOL.md §2; period figures are attributions inside the one continuous run.
import type { DrawdownStats } from '../multi-etf-allocator/engine.ts';
import { splitsSha256 } from '../portfolio-aware-d1/data.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { type ReplayResult, replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { type BookTrace, type TraceWindow, traceBook, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { bookOrder, execution, folds, halfYears, periods, regimes, years } from './context.ts';
import { type Door, assertUniverse } from './data.ts';
import { type Grid, gridKey, median } from './grid.ts';

export interface RunSettings {
  costBps: number;
  rate: number;
  stopFill: 'stop' | 'next-open';
  stopSlippageBps: number;
  armDate?: string; // default: the eligibility date (2017-06-15)
  startDate?: string; // isolated run: flat start at this session (accounting from the close before it)
}

export const baseSettings: RunSettings = {
  costBps: execution.costBps,
  rate: execution.rate,
  stopFill: execution.stopFill,
  stopSlippageBps: execution.stopSlippageBps
};

export const settingsWith = (overrides: Partial<RunSettings>): RunSettings => ({ ...baseSettings, ...overrides });

const settingsKey = (settings: RunSettings) =>
  `${settings.costBps}|${settings.rate}|${settings.stopFill}|${settings.stopSlippageBps}|${settings.armDate ?? ''}|${settings.startDate ?? ''}`;

export type Books = Record<string, Grid>;

export const orderedSymbols = (books: Books) => bookOrder.filter((symbol) => symbol in books);

export interface PeriodRange {
  key: string;
  first: number;
  last: number;
}

export interface LotRecord {
  symbol: string;
  entryDate: string;
  exitDate: string; // '' while open
  entryTime: number;
  exitTime: number;
  net: number;
  interest: number;
  costs: number;
  open: boolean;
}

export interface RunMetrics {
  net: number;
  realized: number;
  unrealized: number;
  interest: number;
  costs: number;
  gross: number;
  minuteDrawdown: number;
  minuteDrawdownPeak: string;
  minuteDrawdownTrough: string;
  minuteDrawdownRecovery: string;
  dailyDrawdown: number;
  dailyDrawdownPeak: string;
  dailyDrawdownTrough: string;
  lots: number;
  closed: number;
  open: number;
  wins: number;
  losses: number;
  bestLot: number;
  worstLot: number;
  medianLot: number;
  meanLot: number;
  top1Share: number; // largest positive lot ÷ net
  top3Share: number;
  closedYears: number; // distinct calendar years with a closed lot (exit date)
  bySymbol: Record<
    string,
    { lots: number; net: number; interest: number; costs: number; wins: number; entryYears: number }
  >;
  heldSessions: number;
  heldDays: number;
  exposure: number; // held sessions ÷ eligible sessions in the run
  decisions: number;
  granted: number;
  refused: number;
  refusalsBy: Record<string, number>; // "decider<holder" → count
  periods: Record<string, number>; // attributions
  periodDailyDrawdown: Record<string, number>; // closes-only drawdown inside the period (peak reset at its start)
  maxLosingStreak: number;
}

const iso = (seconds: number) => (seconds > 0 ? new Date(seconds * 1000).toISOString() : '');

export class Evaluator {
  readonly door: Door;
  private readonly cache = new Map<string, BookTrace>();
  private readonly splits = splitsSha256();
  traces = 0;
  replays = 0;

  constructor(door: Door) {
    this.door = door;
  }

  clearCache() {
    this.cache.clear();
  }

  windowOf(settings: RunSettings): TraceWindow {
    const { door } = this;
    const armStart = settings.armDate ? door.indexOf(settings.armDate) : door.eligibilityIndex;
    let startIndex = 0;

    if (settings.startDate) {
      startIndex = door.indexOf(settings.startDate) - 1;

      if (startIndex < door.eligibilityIndex) {
        throw new Error(`an isolated window must start after ${execution.eligibilityDate}`);
      }
    }

    return {
      armStart: Math.max(armStart, startIndex + 1, door.eligibilityIndex),
      startIndex,
      endIndex: door.lastIndex,
      splitsSha256: this.splits
    };
  }

  trace(symbol: string, grid: Grid, settings: RunSettings): BookTrace {
    const key = `${symbol}|${gridKey(grid)}|${settingsKey(settings)}`;
    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    const instrument = this.door.loaded.universe.instruments[symbol];

    if (!instrument) {
      throw new Error(`${symbol} is not in the ${this.door.key} door's universe`);
    }

    const trace = traceBook(
      instrument.ds,
      candidateBook(symbol, `s5-${gridKey(grid)}`, grid),
      traceSettings(settings.costBps, {
        rate: settings.rate,
        stopFill: settings.stopFill,
        stopSlippageBps: settings.stopSlippageBps
      }),
      this.windowOf(settings)
    );

    this.traces++;

    if (this.cache.size > 200000) {
      this.cache.clear();
    }

    this.cache.set(key, trace);

    return trace;
  }

  replay(books: Books, settings: RunSettings = baseSettings, detail = false): ReplayResult {
    const symbols = orderedSymbols(books);

    assertUniverse(symbols, symbols.includes('XBI') || symbols.includes('XRT'));

    const window = this.windowOf(settings);

    this.replays++;

    return replayFixedPool(
      symbols.map((symbol) => ({
        symbol,
        ds: this.door.loaded.universe.instruments[symbol]!.ds,
        trace: this.trace(symbol, books[symbol]!, settings)
      })),
      {
        symbols,
        startIndex: window.startIndex,
        endIndex: window.endIndex,
        principal: execution.principal,
        rate: settings.rate,
        costBps: settings.costBps,
        stopSlippageBps: settings.stopSlippageBps,
        detail
      }
    );
  }

  // Period index ranges clipped to the run's window.
  rangesOf(list: readonly { key: string; start: string; end: string }[], settings: RunSettings = baseSettings) {
    const window = this.windowOf(settings);
    const { dates } = this.door;
    const ranges: PeriodRange[] = [];

    for (const period of list) {
      let first = -1;
      let last = -1;

      for (let index = window.armStart; index <= window.endIndex; index++) {
        if (dates[index]! >= period.start && dates[index]! <= period.end) {
          if (first < 0) {
            first = index;
          }

          last = index;
        }
      }

      if (first >= 0) {
        ranges.push({ key: period.key, first, last });
      }
    }

    return ranges;
  }

  standardRanges(settings: RunSettings = baseSettings) {
    return this.rangesOf(
      [
        ...Object.values(periods),
        ...folds,
        ...regimes,
        ...years.map((year) => ({
          key: String(year),
          start: year === 2017 ? execution.eligibilityDate : `${year}-01-01`,
          end: `${year}-12-31`
        })),
        ...halfYears()
      ],
      settings
    );
  }

  lotsOf(result: ReplayResult): LotRecord[] {
    const { dates } = this.door;

    return result.lots.map((lot) => ({
      symbol: lot.symbol,
      entryDate: dates[lot.entryIndex] ?? '',
      exitDate: lot.exitIndex >= 0 ? dates[lot.exitIndex]! : '',
      entryTime: lot.entryTime,
      exitTime: lot.exitTime,
      net: lot.net,
      interest: lot.interest,
      costs: lot.costs,
      open: lot.open
    }));
  }

  metricsOf(result: ReplayResult, settings: RunSettings = baseSettings): RunMetrics {
    const lots = this.lotsOf(result);
    const closed = lots.filter((lot) => !lot.open);
    const nets = lots.map((lot) => lot.net);
    const positive = nets.filter((net) => net > 0).sort((a, b) => b - a);
    const costs = lots.reduce((total, lot) => total + lot.costs, 0);
    const bySymbol: RunMetrics['bySymbol'] = {};

    for (const lot of lots) {
      const entry = (bySymbol[lot.symbol] ??= { lots: 0, net: 0, interest: 0, costs: 0, wins: 0, entryYears: 0 });

      entry.lots++;
      entry.net += lot.net;
      entry.interest += lot.interest;
      entry.costs += lot.costs;
      entry.wins += !lot.open && lot.net > 0 ? 1 : 0;
    }

    for (const symbol of Object.keys(bySymbol)) {
      bySymbol[symbol]!.entryYears = new Set(
        lots.filter((lot) => lot.symbol === symbol).map((lot) => lot.entryDate.slice(0, 4))
      ).size;
    }

    let streak = 0;
    let maxLosingStreak = 0;

    for (const lot of closed) {
      streak = lot.net <= 0 ? streak + 1 : 0;
      maxLosingStreak = Math.max(maxLosingStreak, streak);
    }

    const window = this.windowOf(settings);
    const ranges = this.standardRanges(settings);
    const periodsOut: Record<string, number> = {};
    const periodDailyDrawdown: Record<string, number> = {};
    const { marks } = result;

    for (const range of ranges) {
      const before = range.first > 0 ? marks[range.first - 1]! : 0;

      periodsOut[range.key] = marks[range.last]! - before;

      let peak = before;
      let worst = 0;

      for (let index = range.first; index <= range.last; index++) {
        peak = Math.max(peak, marks[index]!);
        worst = Math.max(worst, peak - marks[index]!);
      }

      periodDailyDrawdown[range.key] = worst;
    }

    const eligible = window.endIndex - window.armStart + 1;
    const refusalsBy: Record<string, number> = {};

    for (const refusal of result.refusals) {
      const key = `${refusal.decider}<${refusal.holder}`;

      refusalsBy[key] = (refusalsBy[key] ?? 0) + 1;
    }

    const dd = (stats: DrawdownStats) => ({
      maximum: stats.maximum,
      peak: iso(stats.peakTime),
      trough: iso(stats.troughTime),
      recovery: iso(stats.recoveryTime)
    });
    const minute = dd(result.minuteDrawdown);
    const daily = dd(result.dailyDrawdown);

    return {
      net: result.net,
      realized: result.realized,
      unrealized: result.unrealized,
      interest: result.interest,
      costs,
      gross: result.net + result.interest + costs,
      minuteDrawdown: minute.maximum,
      minuteDrawdownPeak: minute.peak,
      minuteDrawdownTrough: minute.trough,
      minuteDrawdownRecovery: minute.recovery,
      dailyDrawdown: daily.maximum,
      dailyDrawdownPeak: daily.peak,
      dailyDrawdownTrough: daily.trough,
      lots: lots.length,
      closed: closed.length,
      open: lots.length - closed.length,
      wins: closed.filter((lot) => lot.net > 0).length,
      losses: closed.filter((lot) => lot.net <= 0).length,
      bestLot: nets.length ? Math.max(...nets) : 0,
      worstLot: nets.length ? Math.min(...nets) : 0,
      medianLot: nets.length ? median(nets) : 0,
      meanLot: nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : 0,
      top1Share: result.net > 0 && positive.length ? positive[0]! / result.net : NaN,
      top3Share: result.net > 0 && positive.length ? positive.slice(0, 3).reduce((a, b) => a + b, 0) / result.net : NaN,
      closedYears: new Set(closed.map((lot) => lot.exitDate.slice(0, 4))).size,
      bySymbol,
      heldSessions: result.heldSessions,
      heldDays: result.heldDays,
      exposure: eligible > 0 ? result.heldSessions / eligible : 0,
      decisions: result.decisions,
      granted: result.granted,
      refused: result.refused,
      refusalsBy,
      periods: periodsOut,
      periodDailyDrawdown,
      maxLosingStreak
    };
  }

  metrics(books: Books, settings: RunSettings = baseSettings) {
    return this.metricsOf(this.replay(books, settings), settings);
  }

  // Attribution of a mark-difference series (Track P's Δ) to periods.
  deltaPeriods(pool: ReplayResult, base: ReplayResult, list: readonly { key: string; start: string; end: string }[]) {
    const out: Record<string, number> = {};

    for (const range of this.rangesOf(list)) {
      const before = range.first > 0 ? pool.marks[range.first - 1]! - base.marks[range.first - 1]! : 0;

      out[range.key] = pool.marks[range.last]! - base.marks[range.last]! - before;
    }

    return out;
  }

  get yearsOf() {
    const ranges = this.rangesOf([
      periods.dev,
      periods.val,
      periods.wfSearch,
      periods.wfTest,
      periods.fx,
      periods.full
    ]);

    return Object.fromEntries(ranges.map((range) => [range.key, (range.last - range.first + 1) / 252]));
  }
}

export const round = (value: number, digits = 2) =>
  Number.isFinite(value) ? Math.round(value * 10 ** digits) / 10 ** digits : value;

// A compact record of a metrics object for logs and tables.
export const compact = (metrics: RunMetrics, keys: readonly string[] = ['DEV', 'VAL']) => ({
  net: round(metrics.net),
  dd: round(metrics.minuteDrawdown),
  ddDaily: round(metrics.dailyDrawdown),
  lots: metrics.lots,
  closed: metrics.closed,
  wins: metrics.wins,
  years: metrics.closedYears,
  ...Object.fromEntries(keys.map((key) => [key, round(metrics.periods[key] ?? NaN)]))
});
