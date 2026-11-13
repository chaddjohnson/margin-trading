// One pooled evaluation with D1 risk controls (SPECIFICATION.md §7–§9): the two D1 books from runD1BookWithControls,
// every Growth book from Priority 3's booksOf (its canonical runGrowthBook and cache, unchanged), Priority 3's pooled
// replay (runPool: one exclusive funded slot, the frozen same-instant order, its accounting, marks and drawdowns,
// unchanged) and Priority 3's compact record (recordOf, unchanged). No shadow-entry eligibility exists on this path.
//
// With every control at its default (legacy) the books, the replay and the record equal Priority 3's `run` /
// `evaluate` exactly, and the record keeps Priority 3's identity and evaluation key.
import { type BookId, type Friction, type VBook, baseFriction, bookIds, symbolOf } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { indexOnOrAfter } from '../vg-d1-growth-joint/data.ts';
import {
  type EvalOptions,
  type Rec,
  booksOf as p3BooksOf,
  datasetsOf,
  isEnabled,
  poolOptionsOf,
  recordOf
} from '../vg-d1-growth-joint/evaluate.ts';
import { type PoolResult, runPool } from '../vg-d1-growth-joint/pool.ts';
import { type Quad, quadId } from '../vg-d1-growth-joint/space.ts';
import {
  type D1Book,
  type RiskConfig,
  canonicalConfig,
  d1Books,
  isLegacy,
  riskEvalKey,
  riskId,
  validateAgainstGrids
} from './config.ts';
import { type RcLog, type RiskVBook, runD1BookWithControls } from './book.ts';

const frictionOf = (o: EvalOptions): Friction => ({ ...baseFriction, ...(o.friction ?? {}) });

// A bounded per-process cache of controlled D1 books (keyed like Priority 3's D1 cache, plus the canonical controls).
class Cache {
  private readonly map = new Map<string, RiskVBook>();

  constructor(readonly capacity: number) {}

  get(key: string, make: () => RiskVBook) {
    const v = this.map.get(key);

    if (v) {
      this.map.delete(key);
      this.map.set(key, v);
      return v;
    }

    const made = make();

    this.map.set(key, made);
    while (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value!);
    return made;
  }

  clear() {
    this.map.clear();
  }
}

export const d1Cache = new Cache(64);

export interface RunOptions {
  cache?: boolean; // default true; tests on fixture doors pass false (fixture door names are not data identities)
}

// The books of one evaluation in Priority 3's book order: controlled D1 books, canonical Growth books.
export const booksWithControls = (
  door: Door,
  q: Quad,
  cfg: RiskConfig | null | undefined,
  o: EvalOptions = {},
  ro: RunOptions = {}
): VBook[] => {
  validateAgainstGrids(cfg ?? null, q.d1);

  const c = canonicalConfig(cfg);
  const fr = frictionOf(o);
  const growth = p3BooksOf(door, q, { ...o, enabled: { ...o.enabled, 'D1:GDX': false, 'D1:VGT': false } });
  const byBook = new Map<BookId, VBook>(growth.map((b) => [b.book, b]));

  for (const b of d1Books) {
    if (!isEnabled(o, b)) continue;

    const s = symbolOf(b) as 'GDX' | 'VGT';
    const sd = door.sym[s];
    const end = sd.ds.sessionCount - 1;
    const armStart = o.d1Arm === 'native' ? indexOnOrAfter(door, '2017-06-15') : 0;
    const controls = c?.books[b as D1Book];
    const make = () =>
      runD1BookWithControls(sd.ds, s, q.d1[s], controls, { armStart, accountingStart: 0, endIndex: end, friction: fr });
    const key = `${door.name}|${fr.costBps}|${fr.rate}|${fr.stopFill}|${fr.stopSlippageBps}|${armStart}|${b}|${JSON.stringify(q.d1[s])}|${JSON.stringify(controls ?? null)}`;

    byBook.set(b, ro.cache === false ? make() : d1Cache.get(key, make));
  }

  return bookIds.filter((b) => byBook.has(b)).map((b) => byBook.get(b)!);
};

export const runWithControls = (
  door: Door,
  q: Quad,
  cfg: RiskConfig | null | undefined,
  o: EvalOptions = {},
  detail = false,
  recordMarks = false,
  ro: RunOptions = {}
): { books: VBook[]; result: PoolResult } => {
  const books = booksWithControls(door, q, cfg, o, ro);
  const result = runPool(datasetsOf(door), books, q.first, {
    ...poolOptionsOf(door, o, detail),
    recordMarks,
    endIndex: door.sessions - 1
  });

  return { books, result };
};

export interface RiskRecord {
  id: string; // riskId: Priority 3's quadId when legacy, else "rc1-…"
  baseId: string; // Priority 3's quadId of the configuration's quad
  key: string; // the evaluation key (Priority 3's when legacy)
  legacy: boolean;
  config: RiskConfig | null; // canonical
  books: Partial<Record<D1Book, RcLog>>;
}

// Priority 3's record (its id replaced by the risk identity when non-legacy) and the controls' logs.
export const evaluateWithControls = (
  door: Door,
  q: Quad,
  cfg: RiskConfig | null | undefined,
  o: EvalOptions = {},
  ro: RunOptions = {}
): { rec: Rec; risk: RiskRecord } => {
  const x = runWithControls(door, q, cfg, o, false, false, ro);
  const legacy = isLegacy(cfg);
  const rec = recordOf(door, q, x, o);
  const id = riskId(q, cfg);
  const books: RiskRecord['books'] = {};

  for (const b of x.books) if ((b as RiskVBook).rc) books[b.book as D1Book] = (b as RiskVBook).rc;

  return {
    rec: legacy ? rec : { ...rec, id },
    risk: { id, baseId: quadId(q), key: riskEvalKey(door.name, q, o, cfg), legacy, config: canonicalConfig(cfg), books }
  };
};
