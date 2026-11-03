// Point evaluation (PROTOCOL.md §3, §5): each book's virtual-trade trace (src/portfolio-aware-d1/trace.ts traceBook,
// unchanged) and the causal fixed-pool replay (replay.ts replayFixedPool, unchanged), proven equal to the full N-book
// engine (runNAllocator, the engine of `npm run pools`) by parity.ts. A trace is computed with the run's own costs,
// interest, stop fill and slippage, so friction and financing enter the path-dependent exits exactly as in the engine;
// nothing is subtracted afterwards. Period figures are attributions inside the one continuous run.
//
// Two caches, both keyed by every behaviour-relevant input:
//   - traces (in memory, bounded): symbol | grid | settings, inside one door (the door fixes data, window, partition);
//   - point records (persistent JSONL per job, results/cache/): settings | ordered books, under a header binding the
//     door identity (members, partition, first/last date, data sha256) and the engine code hash. A header mismatch
//     refuses the file (invalidation), so a cached record is only ever reused for the identical computation.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { splitsSha256 } from '../portfolio-aware-d1/data.ts';
import { type Grid, candidateBook, d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { type ReplayResult, replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import {
  type BookTrace,
  type TraceWindow,
  traceBook,
  traceCodeHashes,
  traceSettings
} from '../portfolio-aware-d1/trace.ts';
import { bookOrder, episodeGap, execution, halfYears, periodList, years } from './context.ts';
import { type Door, assertFive, sha256 } from './data.ts';

export type Books = Record<string, Grid>;

export interface RunSettings {
  costBps: number;
  rate: number;
  stopFill: 'stop' | 'next-open';
  stopSlippageBps: number;
  armDate?: string; // default: the eligibility date (2017-06-15)
}

export const baseSettings: RunSettings = {
  costBps: execution.costBps,
  rate: execution.rate,
  stopFill: execution.stopFill,
  stopSlippageBps: execution.stopSlippageBps
};

export const settingsWith = (overrides: Partial<RunSettings>): RunSettings => ({ ...baseSettings, ...overrides });

export const settingsKey = (s: RunSettings) =>
  `${s.costBps}|${s.rate}|${s.stopFill}|${s.stopSlippageBps}|${s.armDate ?? ''}`;

export const orderedOf = (symbols: readonly string[]) =>
  (bookOrder as readonly string[]).filter((symbol) => symbols.includes(symbol));

export const gridKey = (grid: Grid) => d1Keys.map((key) => grid[key]).join('/');

export const booksKey = (books: Books) =>
  orderedOf(Object.keys(books))
    .map((symbol) => `${symbol}:${gridKey(books[symbol]!)}`)
    .join('|');

// The files whose code decides a point record (trace + replay + ledger + this evaluator).
export const engineFiles = [
  ...Object.keys(traceCodeHashes()),
  'src/portfolio-aware-d1/replay.ts',
  'src/portfolio-aware-d1/phenotypes.ts',
  'src/portfolio-aware-d1/nbook/engine.ts',
  'src/portfolio-aware-d1/nbook/ledger.ts',
  'src/portfolio-aware-d1/nbook/margin.ts',
  'src/portfolio-aware-d1/nbook/universe.ts',
  'src/multi-etf-allocator/engine.ts',
  'src/multi-etf-allocator/ledger.ts',
  'src/multi-etf-allocator/data.ts',
  'src/multi-etf-allocator/dataset.ts',
  'src/lib/evaluation.ts',
  'src/lib/dataset.ts',
  'src/lib/partitions.ts',
  'src/lib/corporateActions.ts',
  'src/study8-expanded-regime-d1/evaluate.ts',
  'src/study8-expanded-regime-d1/context.ts'
];

let engineHashCache: string | undefined;

export const engineHash = () => {
  if (!engineHashCache) {
    const files = Object.fromEntries(
      engineFiles.map((file) => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])
    );

    engineHashCache = sha256(JSON.stringify(files)).slice(0, 24);
  }

  return engineHashCache;
};

const r2 = (value: number) => (Number.isFinite(value) ? Math.round(value * 100) / 100 : value);
const iso = (seconds: number) => (seconds > 0 ? new Date(seconds * 1000).toISOString() : '');

export interface PointRecord {
  net: number;
  realized: number;
  unrealized: number;
  interest: number;
  costs: number;
  gross: number;
  dd: number; // maximum minute drawdown of the strategy mark (frozen strict tracker), $, unrounded
  ddDaily: number;
  ddPeak: string;
  ddTrough: string;
  lots: number;
  open: number;
  wins: number;
  bestLot: number;
  worstLot: number;
  top1Share: number; // largest positive lot ÷ net (NaN when net ≤ 0)
  lotYears: number; // distinct calendar years with a closed lot (exit year)
  episodes: number; // §5 clusters of funded lots
  heldDays: number; // calendar days of borrowing (capital-days ÷ $100k)
  heldSessions: number;
  occupancy: number; // held sessions ÷ eligible sessions
  perCapitalYear: number; // net ÷ (heldDays ÷ 365)
  decisions: number;
  granted: number;
  refused: number;
  books: Record<string, { lots: number; net: number; wins: number; heldDays: number }>;
  refusalsBy: Record<string, number>; // "decider<holder" → count
  periods: Record<string, number>; // attribution (mark at the period's last close − mark at the close before it)
  bestYear: number; // largest positive calendar-year attribution
  bestYearKey: string;
  signature: string; // sha256(16) of the funded ledger
}

export const ledgerSignature = (result: ReplayResult) =>
  sha256(
    JSON.stringify(result.lots.map((lot) => [lot.symbol, lot.entryTime, lot.exitTime, Math.round(lot.net * 1e6)]))
  ).slice(0, 16);

export interface Range {
  key: string;
  first: number;
  last: number;
}

export class Evaluator {
  readonly door: Door;
  private readonly traces = new Map<string, BookTrace>();
  private readonly splits = splitsSha256();
  readonly maxTraces: number;
  traceBuilds = 0;
  traceHits = 0;
  replays = 0;
  private rangeCache = new Map<string, Range[]>();

  constructor(door: Door, maxTraces = 30000) {
    this.door = door;
    this.maxTraces = maxTraces;
  }

  windowOf(settings: RunSettings): TraceWindow {
    const { door } = this;
    const armStart = settings.armDate ? door.indexOf(settings.armDate) : door.eligibilityIndex;

    return {
      armStart: Math.max(armStart, door.eligibilityIndex),
      startIndex: 0,
      endIndex: door.lastIndex,
      splitsSha256: this.splits
    };
  }

  trace(symbol: string, grid: Grid, settings: RunSettings): BookTrace {
    const key = `${symbol}|${gridKey(grid)}|${settingsKey(settings)}`;
    const cached = this.traces.get(key);

    if (cached) {
      this.traceHits++;
      return cached;
    }

    const instrument = this.door.loaded.universe.instruments[symbol];

    if (!instrument) {
      throw new Error(`${symbol} is not in the ${this.door.key} door's universe`);
    }

    const trace = traceBook(
      instrument.ds,
      candidateBook(symbol, `s7-${gridKey(grid)}`, grid),
      traceSettings(settings.costBps, {
        rate: settings.rate,
        stopFill: settings.stopFill,
        stopSlippageBps: settings.stopSlippageBps
      }),
      this.windowOf(settings)
    );

    this.traceBuilds++;

    if (this.traces.size >= this.maxTraces) {
      this.traces.clear();
    }

    this.traces.set(key, trace);

    return trace;
  }

  replay(books: Books, settings: RunSettings = baseSettings, detail = false, withhold?: WithholdRule): ReplayResult {
    const symbols = orderedOf(Object.keys(books));

    assertFive(symbols);

    if (symbols.length !== Object.keys(books).length) {
      throw new Error(`books ${Object.keys(books).join(' ')} include a symbol outside the B5 order`);
    }

    const window = this.windowOf(settings);

    this.replays++;

    return replayFixedPool(
      symbols.map((symbol) => {
        const trace = this.trace(symbol, books[symbol]!, settings);

        return {
          symbol,
          ds: this.door.loaded.universe.instruments[symbol]!.ds,
          trace: withhold ? { ...trace, trades: trace.trades.filter((trade) => !withhold(symbol, trade)) } : trace
        };
      }),
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

  // Period index ranges clipped to the run (from the arming session to the door's last session).
  ranges(settings: RunSettings = baseSettings): Range[] {
    const window = this.windowOf(settings);
    const cacheKey = `${window.armStart}|${window.endIndex}`;
    const cached = this.rangeCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const { dates } = this.door;
    const list = [
      ...periodList,
      ...years.map((year) => ({
        key: String(year),
        start: year === 2017 ? execution.eligibilityDate : `${year}-01-01`,
        end: `${year}-12-31`
      })),
      ...halfYears()
    ];
    const out: Range[] = [];

    for (const period of list) {
      let first = -1;
      let last = -1;

      for (let index = window.armStart; index <= window.endIndex; index++) {
        if (dates[index]! >= period.start && dates[index]! <= period.end) {
          if (first < 0) first = index;
          last = index;
        }
      }

      // A period the run does not cover to its end (more than 3 calendar days of it lie after the run's last session,
      // i.e. not just a weekend or holiday) is reported under `<key>~partial`.
      if (first >= 0) {
        const lastDate = dates[window.endIndex]!;
        const gapDays = (Date.parse(period.end) - Date.parse(lastDate)) / 86400000;

        out.push({ key: gapDays > 3 ? `${period.key}~partial` : period.key, first, last });
      }
    }

    this.rangeCache.set(cacheKey, out);

    return out;
  }

  // Sessions from arming to the run's end ÷ 252.
  yearsOfRun(settings: RunSettings = baseSettings) {
    const window = this.windowOf(settings);

    return (window.endIndex - window.armStart + 1) / 252;
  }

  recordOf(result: ReplayResult, settings: RunSettings = baseSettings): PointRecord {
    const { dates } = this.door;
    const lots = result.lots;
    const nets = lots.map((lot) => lot.net);
    const positive = nets.filter((net) => net > 0).sort((a, b) => b - a);
    const costs = lots.reduce((total, lot) => total + lot.costs, 0);
    const books: PointRecord['books'] = {};

    for (const lot of lots) {
      const entry = (books[lot.symbol] ??= { lots: 0, net: 0, wins: 0, heldDays: 0 });
      const end =
        lot.exitTime > 0
          ? lot.exitTime
          : (this.door.loaded.universe.instruments[lot.symbol]!.ds.sCloseTime[this.door.lastIndex] ?? lot.entryTime);

      entry.lots++;
      entry.net += lot.net;
      entry.wins += !lot.open && lot.net > 0 ? 1 : 0;
      entry.heldDays += Math.max(0, end - lot.entryTime) / 86400;
    }

    for (const value of Object.values(books)) {
      value.net = r2(value.net);
      value.heldDays = Math.round(value.heldDays * 1000) / 1000;
    }

    let episodes = 0;
    let previousExit = -Infinity;

    for (const lot of [...lots].sort((a, b) => a.entryIndex - b.entryIndex)) {
      if (lot.entryIndex - previousExit > episodeGap) {
        episodes++;
      }

      previousExit = lot.exitIndex >= 0 ? lot.exitIndex : Infinity;
    }

    const periods: Record<string, number> = {};
    const { marks } = result;

    for (const range of this.ranges(settings)) {
      const before = range.first > 0 ? marks[range.first - 1]! : 0;

      periods[range.key] = r2(marks[range.last]! - before);
    }

    let bestYear = 0;
    let bestYearKey = '';

    // 2026 (or any year the run ends inside) counts under its `~partial` key (PROTOCOL.md §3.1)
    for (const year of years) {
      const key = periods[String(year)] !== undefined ? String(year) : `${year}~partial`;
      const value = periods[key];

      if (value !== undefined && value > bestYear) {
        bestYear = value;
        bestYearKey = key;
      }
    }

    const refusalsBy: Record<string, number> = {};

    for (const refusal of result.refusals) {
      const key = `${refusal.decider}<${refusal.holder}`;

      refusalsBy[key] = (refusalsBy[key] ?? 0) + 1;
    }

    const window = this.windowOf(settings);
    const eligible = window.endIndex - window.armStart + 1;
    const closed = lots.filter((lot) => !lot.open);

    return {
      net: r2(result.net),
      realized: r2(result.realized),
      unrealized: r2(result.unrealized),
      interest: r2(result.interest),
      costs: r2(costs),
      gross: r2(result.net + result.interest + costs),
      dd: result.minuteDrawdown.maximum, // unrounded: the strict < $35,000 test reads the exact value
      ddDaily: result.dailyDrawdown.maximum,
      ddPeak: iso(result.minuteDrawdown.peakTime),
      ddTrough: iso(result.minuteDrawdown.troughTime),
      lots: lots.length,
      open: lots.length - closed.length,
      wins: closed.filter((lot) => lot.net > 0).length,
      bestLot: r2(nets.length ? Math.max(...nets) : 0),
      worstLot: r2(nets.length ? Math.min(...nets) : 0),
      top1Share: result.net > 0 && positive.length ? Math.round((positive[0]! / result.net) * 1e4) / 1e4 : NaN,
      lotYears: new Set(closed.map((lot) => dates[lot.exitIndex]!.slice(0, 4))).size,
      episodes,
      heldDays: Math.round(result.heldDays * 1000) / 1000,
      heldSessions: result.heldSessions,
      occupancy: eligible > 0 ? Math.round((result.heldSessions / eligible) * 1e6) / 1e6 : 0,
      perCapitalYear: result.heldDays > 0 ? r2(result.net / (result.heldDays / 365)) : 0,
      decisions: result.decisions,
      granted: result.granted,
      refused: result.refused,
      books,
      refusalsBy,
      periods,
      bestYear: r2(bestYear),
      bestYearKey,
      signature: ledgerSignature(result)
    };
  }

  point(books: Books, settings: RunSettings = baseSettings): PointRecord {
    return this.recordOf(this.replay(books, settings), settings);
  }
}

export type WithholdRule = (symbol: string, trade: { decisionIndex: number; entryIndex: number }) => boolean;

// ----- the persistent point cache -----

export interface CacheHeader {
  kind: 'study8-point-cache';
  doorId: string;
  doorKey: string;
  engine: string;
  members: string[];
  lastDate: string;
}

export class PointCache {
  private readonly map = new Map<string, PointRecord>();
  private pending: string[] = [];
  readonly file?: string;
  readonly header: CacheHeader;
  hits = 0;
  misses = 0;
  loaded = 0;

  private constructor(header: CacheHeader, file?: string) {
    this.header = header;
    this.file = file;
  }

  // Opens (or creates) a job's cache file. A file written under another door identity or engine hash is refused.
  static async open(door: Door, file?: string) {
    const header: CacheHeader = {
      kind: 'study8-point-cache',
      doorId: door.id,
      doorKey: door.key,
      engine: engineHash(),
      members: door.members,
      lastDate: door.dates[door.lastIndex]!
    };
    const cache = new PointCache(header, file);

    if (file && (await fs.pathExists(file))) {
      const lines = (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean);
      const first = JSON.parse(lines[0] ?? '{}') as CacheHeader;

      if (first.kind !== header.kind || first.doorId !== header.doorId || first.engine !== header.engine) {
        throw new Error(
          `${file}: cache header ${JSON.stringify(first)} does not match ${JSON.stringify(header)} (invalidated; delete it to recompute)`
        );
      }

      for (const line of lines.slice(1)) {
        try {
          const row = JSON.parse(line) as { k: string; r: PointRecord };

          // top1Share is the record's only field that can be NaN (net ≤ 0); the cache line stores it as null
          if ((row.r.top1Share as number | null) === null) row.r.top1Share = NaN;

          cache.map.set(row.k, row.r);
          cache.loaded++;
        } catch {
          // a torn last line after an interruption: ignored (the point is recomputed)
        }
      }
    } else if (file) {
      await fs.outputFile(file, `${JSON.stringify(header)}\n`);
    }

    return cache;
  }

  static memory(door: Door) {
    return new PointCache({
      kind: 'study8-point-cache',
      doorId: door.id,
      doorKey: door.key,
      engine: engineHash(),
      members: door.members,
      lastDate: door.dates[door.lastIndex]!
    });
  }

  get(key: string) {
    const value = this.map.get(key);

    if (value) this.hits++;
    else this.misses++;

    return value;
  }

  set(key: string, record: PointRecord) {
    this.map.set(key, record);

    if (this.file) {
      this.pending.push(
        JSON.stringify({ k: key, r: record }, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? null : v))
      );

      if (this.pending.length >= 2000) {
        this.flushSync();
      }
    }
  }

  flushSync() {
    if (this.file && this.pending.length) {
      fs.appendFileSync(this.file, `${this.pending.join('\n')}\n`);
      this.pending = [];
    }
  }

  get size() {
    return this.map.size;
  }
}

// An evaluator with the persistent cache in front of it.
export class Lab {
  readonly ev: Evaluator;
  readonly cache: PointCache;
  computed = 0;

  constructor(ev: Evaluator, cache: PointCache) {
    this.ev = ev;
    this.cache = cache;

    if (cache.header.doorId !== ev.door.id) {
      throw new Error('the point cache belongs to another door');
    }
  }

  get door() {
    return this.ev.door;
  }

  point(books: Books, settings: RunSettings = baseSettings): PointRecord {
    const key = `${settingsKey(settings)}#${booksKey(books)}`;
    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    const record = this.ev.point(books, settings);

    this.computed++;
    this.cache.set(key, record);

    return record;
  }

  stats() {
    return {
      points: this.computed,
      cacheHits: this.cache.hits,
      cacheMisses: this.cache.misses,
      cacheLoaded: this.cache.loaded,
      traceBuilds: this.ev.traceBuilds,
      traceHits: this.ev.traceHits,
      replays: this.ev.replays
    };
  }
}

export const cacheFileOf = (dir: string, job: string) => path.join(dir, `${job}.jsonl`);
