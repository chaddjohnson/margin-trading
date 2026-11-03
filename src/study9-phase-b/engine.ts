// Point evaluation (PROTOCOL.md §4). Study 8's evaluator (src/study8-expanded-regime-d1/evaluate.ts) is reused
// unchanged — its per-book traces (portfolio-aware-d1 traceBook with the run's own costs, interest, stop fill and
// slippage), its record (recordOf: net, realized/unrealized, interest, costs, minute and daily DD, lots, episodes, lot
// years, occupancy, capital efficiency, refusals, per-book lots/net, Study 8's period attributions, best year, ledger
// signature) and its period ranges (Study 8's periodList, years and half-years). One method is overridden:
//   - replay: any book of the door's universe, in the N-book engine's own order (bookOrderOf: VGT, XBI, XRT, KRE first,
//     then alphabetical); same-minute decisions are alphabetical inside replayFixedPool, as in the engine. Study 8's
//     version refused symbols outside its five; on B5-subset books both orders coincide. Parity gate P1 proves the
//     replay equal to the authoritative runNAllocator for the seven memberships, and P2 the evaluator equal to
//     Study 8's on B5-subset configurations.
// The persistent point cache: one JSONL file per job, a header binding the namespace, the job, the door id (members,
// first/last session, each member's data-prefix sha256, splits, partitions, ledger) and the engine hash (the sha256 of
// every file in this module's transitive import closure); one key per (settings: costs, interest, stop fill, slippage,
// arming date | the ordered books with every book's full vector). A header mismatch refuses the file.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import type { IntParams } from '../d1-refinement/families.ts';
import { idOf } from '../multi-etf-d1/space.ts';
import { bookOrderOf } from '../portfolio-aware-d1/nbook/engine.ts';
import { type Grid, d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { type ReplayResult, replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { traceCodeFiles } from '../portfolio-aware-d1/trace.ts';
import type { Door } from '../study8-expanded-regime-d1/data.ts';
import {
  type PointRecord,
  type Range,
  type RunSettings,
  type WithholdRule,
  Evaluator,
  baseSettings,
  engineFiles as s8EngineFiles,
  settingsKey,
  settingsWith
} from '../study8-expanded-regime-d1/evaluate.ts';
import { sourceClosure } from './closure.ts';
import { execution, studyName } from './context.ts';
import type { P9Door } from './door.ts';

export { baseSettings, settingsKey, settingsWith };
export type { PointRecord, Range, RunSettings };
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

let engineHashCache: string | undefined;

// The engine identity of every point record (review M1): this module's transitive source closure (trace, replay, ledger,
// the loader in src/lib through `#lib`, Study 8's evaluator and context, this study's context and door), unioned with
// Study 8's own engine-file list and the trace code files, plus package-lock.json (the CSV parser is a loader dependency).
export const engineFiles = () =>
  [
    ...new Set([
      ...sourceClosure(['src/study9-phase-b/engine.ts']),
      ...s8EngineFiles,
      ...traceCodeFiles,
      'package-lock.json'
    ])
  ].sort();
export const engineHash = () => {
  engineHashCache ??= createHash('sha256')
    .update(
      JSON.stringify(
        Object.fromEntries(
          engineFiles().map((file) => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])
        )
      )
    )
    .digest('hex')
    .slice(0, 24);

  return engineHashCache;
};

export class P9Evaluator extends Evaluator {
  readonly p9door: P9Door;

  constructor(door: P9Door, maxTraces = 30000) {
    super(door as unknown as Door, maxTraces);
    this.p9door = door;
  }

  override replay(
    books: Books,
    settings: RunSettings = baseSettings,
    detail = false,
    withhold?: WithholdRule
  ): ReplayResult {
    const symbols = orderedOf(Object.keys(books));
    const instruments = this.p9door.loaded.universe.instruments;

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
}

export interface CacheHeader {
  kind: 'study9b-point-cache';
  namespace: string;
  job: string;
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

  static headerOf(door: P9Door, job: string): CacheHeader {
    return {
      kind: 'study9b-point-cache',
      namespace: studyName,
      job,
      doorId: door.id,
      doorKey: door.key,
      engine: engineHash(),
      members: door.members,
      lastDate: door.dates[door.lastIndex]!
    };
  }

  static async open(door: P9Door, job: string, file?: string) {
    const header = PointCache.headerOf(door, job);
    const cache = new PointCache(header, file);

    if (file && (await fs.pathExists(file))) {
      const lines = (await fs.readFile(file, 'utf8')).split('\n').filter(Boolean);
      const first = JSON.parse(lines[0] ?? '{}') as CacheHeader;

      if (JSON.stringify(first) !== JSON.stringify(header)) {
        throw new Error(
          `${file}: cache header ${JSON.stringify(first)} does not match ${JSON.stringify(header)} (invalidated; move it away to recompute)`
        );
      }

      for (const line of lines.slice(1)) {
        try {
          const row = JSON.parse(line) as { k: string; r: PointRecord };

          // top1Share is the record's only possibly non-finite field (net ≤ 0); the cache line stores it as null
          if ((row.r.top1Share as number | null) === null) row.r.top1Share = NaN;

          cache.map.set(row.k, row.r);
          cache.loaded++;
        } catch {
          // a torn last line after an interruption: the point is recomputed
        }
      }
    } else if (file) {
      await fs.outputFile(file, `${JSON.stringify(header)}\n`);
    }

    return cache;
  }

  static memory(door: P9Door, job = 'memory') {
    return new PointCache(PointCache.headerOf(door, job));
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

// An evaluator with the persistent cache in front of it.
export class Lab {
  readonly ev: P9Evaluator;
  readonly cache: PointCache;
  computed = 0;

  constructor(ev: P9Evaluator, cache: PointCache) {
    this.ev = ev;
    this.cache = cache;

    if (cache.header.doorId !== ev.p9door.id) throw new Error('the point cache belongs to another door');
  }

  get door() {
    return this.ev.p9door;
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
