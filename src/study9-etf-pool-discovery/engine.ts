// Point evaluation for any set of eligible ETFs (PROTOCOL.md §4). The Study 8 evaluator
// (src/study8-expanded-regime-d1/evaluate.ts) is reused unchanged — its traces (portfolio-aware-d1 traceBook), its
// record (recordOf: net, realized/unrealized, interest, costs, minute and daily DD, lots, episodes, lot years,
// occupancy, capital efficiency, refusals, per-book lots/net, attributions, best year, ledger signature) — and only two
// things are overridden:
//   - replay: any member of the door's universe, in the N-book engine's own book order (bookOrderOf: VGT, XBI, XRT,
//     KRE first, then alphabetical; same-minute decisions are alphabetical inside replayFixedPool, as in the engine);
//     Study 8's guard restricted this to its five B5 symbols, and parity gate P1 proves the replay equal to the
//     authoritative runNAllocator for new symbols and pools;
//   - ranges: this study's training periods (context.ts periodList) instead of Study 8's 2016–2026 list.
// The persistent point cache is keyed like Study 8's: a header binding the door id and this engine's code hash, and
// one key per (settings, ordered books).
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { type Grid, d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { bookOrderOf } from '../portfolio-aware-d1/nbook/engine.ts';
import { type ReplayResult, replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { idOf } from '../multi-etf-d1/space.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import type { Door } from '../study8-expanded-regime-d1/data.ts';
import {
  type PointRecord,
  type Range,
  type RunSettings,
  type WithholdRule,
  Evaluator,
  baseSettings,
  engineFiles as s8EngineFiles,
  settingsKey
} from '../study8-expanded-regime-d1/evaluate.ts';
import { execution, periodList } from './context.ts';
import type { S9Door } from './door.ts';

export { baseSettings, settingsKey };
export type { PointRecord, RunSettings };
export type Books = Record<string, Grid>;

export const orderedOf = (symbols: readonly string[]) => bookOrderOf(symbols);
export const gridKey = (grid: Grid) => d1Keys.map((key) => grid[key]).join('/');
export const booksKey = (books: Books) =>
  orderedOf(Object.keys(books))
    .map((symbol) => `${symbol}:${gridKey(books[symbol]!)}`)
    .join('|');
export const vectorId = (grid: Grid) => idOf(grid as unknown as IntParams);
export const configId = (books: Books) =>
  orderedOf(Object.keys(books))
    .map((symbol) => `${symbol}:${vectorId(books[symbol]!)}`)
    .join('+');

export const engineFiles = [
  ...s8EngineFiles,
  'src/study9-etf-pool-discovery/engine.ts',
  'src/study9-etf-pool-discovery/door.ts',
  'src/study9-etf-pool-discovery/context.ts'
];

let engineHashCache: string | undefined;

export const engineHash = () => {
  engineHashCache ??= createHash('sha256')
    .update(
      JSON.stringify(
        Object.fromEntries(
          engineFiles.map((file) => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])
        )
      )
    )
    .digest('hex')
    .slice(0, 24);

  return engineHashCache;
};

export class S9Evaluator extends Evaluator {
  readonly s9door: S9Door;
  private readonly s9ranges = new Map<string, Range[]>();

  constructor(door: S9Door, maxTraces = 40000) {
    super(door as unknown as Door, maxTraces);
    this.s9door = door;
  }

  override replay(
    books: Books,
    settings: RunSettings = baseSettings,
    detail = false,
    withhold?: WithholdRule
  ): ReplayResult {
    const symbols = orderedOf(Object.keys(books));
    const instruments = this.s9door.loaded.universe.instruments;

    if (symbols.length === 0 || symbols.some((symbol) => !instruments[symbol])) {
      throw new Error(`books ${Object.keys(books).join(' ')} are not all in the door's universe`);
    }

    const window = this.windowOf(settings);

    this.replays++;

    return replayFixedPool(
      symbols.map((symbol) => {
        const trace = this.trace(symbol, books[symbol]!, settings);

        return {
          symbol,
          ds: instruments[symbol]!.ds,
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

  // The training periods, clipped to the run (arming session → the door's last session); a period the run does not
  // cover to its end (more than 3 calendar days after the run's last session) is reported as `<key>~partial`.
  override ranges(settings: RunSettings = baseSettings): Range[] {
    const window = this.windowOf(settings);
    const cacheKey = `${window.armStart}|${window.endIndex}`;
    const cached = this.s9ranges.get(cacheKey);

    if (cached) return cached;

    const { dates } = this.s9door;
    const out: Range[] = [];

    for (const period of periodList) {
      let first = -1;
      let last = -1;

      for (let index = window.armStart; index <= window.endIndex; index++) {
        if (dates[index]! >= period.start && dates[index]! <= period.end) {
          if (first < 0) first = index;
          last = index;
        }
      }

      if (first >= 0) {
        const gapDays = (Date.parse(period.end) - Date.parse(dates[window.endIndex]!)) / 86400000;

        out.push({ key: gapDays > 3 ? `${period.key}~partial` : period.key, first, last });
      }
    }

    this.s9ranges.set(cacheKey, out);

    return out;
  }
}

// ----- the persistent point cache (one JSONL file per job; header = door id + engine hash) -----

export interface CacheHeader {
  kind: 'study9-point-cache';
  doorId: string;
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

  static headerOf(door: S9Door): CacheHeader {
    return {
      kind: 'study9-point-cache',
      doorId: door.id,
      engine: engineHash(),
      members: door.members,
      lastDate: door.dates[door.lastIndex]!
    };
  }

  static async open(door: S9Door, file?: string) {
    const header = PointCache.headerOf(door);
    const cache = new PointCache(header, file);

    if (file && (await fs.pathExists(file))) {
      const lines = (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean);
      const first = JSON.parse(lines[0] ?? '{}') as CacheHeader;

      if (first.kind !== header.kind || first.doorId !== header.doorId || first.engine !== header.engine) {
        throw new Error(
          `${file}: cache header does not match this door/engine (invalidated; move it away to recompute)`
        );
      }

      for (const line of lines.slice(1)) {
        try {
          const row = JSON.parse(line) as { k: string; r: PointRecord };

          if ((row.r.top1Share as number | null) === null) row.r.top1Share = NaN;

          cache.map.set(row.k, row.r);
          cache.loaded++;
        } catch {
          // a torn last line after an interruption: recomputed
        }
      }
    } else if (file) {
      await fs.outputFile(file, `${JSON.stringify(header)}\n`);
    }

    return cache;
  }

  static memory(door: S9Door) {
    return new PointCache(PointCache.headerOf(door));
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

      if (this.pending.length >= 2000) this.flushSync();
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

export class Lab {
  readonly ev: S9Evaluator;
  readonly cache: PointCache;
  computed = 0;

  constructor(ev: S9Evaluator, cache: PointCache) {
    this.ev = ev;
    this.cache = cache;

    if (cache.header.doorId !== ev.s9door.id) throw new Error('the point cache belongs to another door');
  }

  get door() {
    return this.ev.s9door;
  }

  point(books: Books, settings: RunSettings = baseSettings): PointRecord {
    const key = `${settingsKey(settings)}#${booksKey(books)}`;
    const cached = this.cache.get(key);

    if (cached) return cached;

    const record = this.ev.point(books, settings);

    this.computed++;
    this.cache.set(key, record);

    return record;
  }
}
