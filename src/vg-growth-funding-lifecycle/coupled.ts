// The pooled replay under a funding lifecycle (PROTOCOL.md §6): Priority 3's UNCHANGED pool (src/vg-d1-growth-joint/
// pool.ts runPool — one $100,000 principal ledger, one exclusive funded slot, the frozen tie order, reservations,
// costs, interest, marks) fed by the canonical D1 shadow books (unchanged in every arm) and the Growth books of the
// lifecycle (growthBook.ts), whose trajectories depend on the allocator's answers.
//
// THE COUPLING. A Growth book under L1/L2 asks the allocator at every request (an order, or an L2 reassessment). The
// allocator's answer at (book, t) depends only on what happened before t (and on the earlier same-instant decisions in
// the tie order). The books are run with an ORACLE of answers and the pool is replayed with their request records:
//   1. every answer known exactly (a consistent prefix) is used as is; any later question is answered by a guess (the
//      latest pool's occupancy at that instant and tie position; "available" before any pool exists);
//   2. the pool decides every request record; the first record (in the pool's processing order) whose pool answer
//      differs from the answer the book used is the earliest inconsistency;
//   3. every record up to and including it becomes exact (the pool's answers), later ones are dropped, and 1–2 repeat.
// The consistent prefix grows strictly every round, so the iteration ends; and a fully consistent run is the online
// simulation itself (by induction over the pool's processing order: each answer is the pool's own answer given an
// identical past). A book whose questions all keep their answers is not re-simulated (deterministic).
//
// L0 is Priority 3's evaluate.ts `run` itself (the virtual-book lifecycle; refusals never feed back).
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { runPool, tieOrderOf } from '../vg-d1-growth-joint/pool.ts';
import { type BookId, type VBook, symbolOf } from '../vg-d1-growth-joint/books.ts';
import {
  type EvalOptions,
  booksOf,
  datasetsOf,
  isEnabled,
  poolOptionsOf,
  run
} from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { type LifeBook, isPhantom, lifeBookOf } from './growthBook.ts';
import type { Ask, LifeOutcome, Mode } from './lifecycle.ts';

export const MAX_ROUNDS = 5000;

export interface Coupled {
  mode: Mode;
  books: VBook[];
  result: PoolResult;
  rounds: number; // pool replays (L0: 1)
  growthSims: number; // Growth book simulations (L0: the canonical cached books, 0 here)
  life: Partial<Record<BookId, LifeOutcome>>;
}

const growthIds: readonly BookId[] = ['G:GDX', 'G:VGT'];

// The guess: the slot as the pool `r` occupied it. A granted record occupies the slot for every later decision (and
// for a same-instant decision later in the tie order) through its final exit instant inclusive (the pool decides
// before the exits of an instant); a granted order never filled, or a lot still open, occupies it to the end.
export const occupancyOf = (r: PoolResult, first: Quad['first']) => {
  const pos = new Map(tieOrderOf(first).map((b, i) => [b, i]));
  const lots = new Map(r.lots.map((l) => [`${l.book}#${l.trade.id}`, l]));
  const spans: { book: BookId; from: number; to: number }[] = [];

  for (const f of r.funding) {
    if (f.outcome !== 'granted') continue;

    const lot = lots.get(`${f.book}#${f.trade}`);
    const to = !lot || lot.open ? Infinity : lot.fills.at(-1)!.t;

    spans.push({ book: f.book, from: f.t, to });
  }

  return (b: BookId, t: number) =>
    spans.some((x) => (t > x.from || (t === x.from && pos.get(b)! > pos.get(x.book)!)) && t <= x.to);
};

// `noGuess` (verification only): unknown answers default to "available" instead of the latest pool's occupancy; the
// fixed point must be the same (the guess only speeds the iteration).
export const runCoupled = (
  door: Door,
  q: Quad,
  o: EvalOptions,
  mode: Mode,
  opts: { noGuess?: boolean } = {}
): Coupled => {
  if (mode === 'L0') {
    const x = run(door, q, o, true);

    return { mode, books: x.books, result: x.result, rounds: 1, growthSims: 0, life: {} };
  }

  if (o.friction || o.wholeShares || o.blackouts?.length || o.tieOrder || o.fundFrom || o.d1Arm === 'native')
    throw new Error('L1/L2 runs use the study conventions only (no stresses, toggles or native arming)');

  const d1 = booksOf(door, q, { ...o, enabled: { ...(o.enabled ?? {}), 'G:GDX': false, 'G:VGT': false } });
  const gIds = growthIds.filter((b) => isEnabled(o, b));
  const exact = new Map<BookId, Map<number, boolean>>(gIds.map((b) => [b, new Map()]));
  const cache = new Map<BookId, { asked: Map<number, boolean>; book: LifeBook }>();
  let guess: ((b: BookId, t: number) => boolean) | null = null;
  let growthSims = 0;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const g = guess;
    const answer = (b: BookId, t: number) => exact.get(b)!.get(t) ?? (g ? !g(b, t) : true);
    const gBooks = gIds.map((b) => {
      const prev = cache.get(b);

      if (prev && [...prev.asked].every(([t, a]) => answer(b, t) === a)) return prev.book;

      const asked = new Map<number, boolean>();
      const ask: Ask = (_s, t) => {
        if (asked.has(t)) throw new Error(`${b}: asked twice at one instant`);

        const a = answer(b, t);

        asked.set(t, a);
        return a;
      };
      const s = symbolOf(b);
      const book = lifeBookOf(door.sym[s], door, q.g[s], mode, ask);

      growthSims++;
      cache.set(b, { asked, book });
      return book;
    });
    const result = runPool(datasetsOf(door), [...d1, ...gBooks], q.first, {
      ...poolOptionsOf(door, o, true),
      endIndex: door.sessions - 1
    });
    let mismatch = -1;
    let records = 0;

    for (let i = 0; i < result.funding.length; i++) {
      const f = result.funding[i]!;

      if (!gIds.includes(f.book)) continue;
      records++;

      const used = cache.get(f.book)!.asked.get(f.t);

      if (used === undefined) throw new Error(`${f.book}: a pool record at ${f.t} without a request`);
      if (used !== (f.outcome === 'granted')) {
        mismatch = i;
        break;
      }
    }

    if (mismatch < 0) {
      const asked = gIds.reduce((a, b) => a + cache.get(b)!.asked.size, 0);

      if (records !== asked) throw new Error(`${asked} requests but ${records} pool records`);
      if (result.lots.some((l) => isPhantom(l.trade))) throw new Error('a phantom record became a lot');

      return {
        mode,
        books: [...d1, ...gBooks],
        result,
        rounds: round,
        growthSims,
        life: Object.fromEntries(gBooks.map((b) => [b.book, b.life!]))
      };
    }

    for (const b of gIds) exact.get(b)!.clear();
    for (let i = 0; i <= mismatch; i++) {
      const f = result.funding[i]!;

      if (gIds.includes(f.book)) exact.get(f.book)!.set(f.t, f.outcome === 'granted');
    }
    if (!opts.noGuess) guess = occupancyOf(result, q.first);
  }

  throw new Error(`no consistent run after ${MAX_ROUNDS} rounds`);
};
