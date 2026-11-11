// One pooled evaluation under a Growth funding lifecycle (PROTOCOL.md §5): the single evaluation path of every arm.
//
// - L0 is Priority 3's evaluation itself (src/vg-d1-growth-joint/evaluate.ts `run` / `recordOf`: the canonical virtual
//   books, the unchanged pooled replay, the compact record) — exactly the path Priority 3B searched with.
// - L1 and L2 are Priority 5A's coupled fixed point (src/vg-growth-funding-lifecycle/coupled.ts `runCoupled`, verified
//   in 5A's stage V), reproduced here line for line with three additions that 5A's diagnostic did not need and refused:
//   (1) cost / interest / stop stresses (`friction`) reach the lifecycle Growth books exactly as Priority 3's `booksOf`
//       passes them to the canonical books (`lifeBookOf` already accepts them: the same `{ friction, costBps }` and the
//       same next-open fallback for books with an initial stop or retention); with no stress the books are built
//       exactly as 5A built them;
//   (2) `blackouts` (the causal episode reruns): the pool refuses a decision in a blacked-out session, and under L1/L2
//       that refusal reaches the book like any other refusal (the fixed point treats it as one);
//   (3) `recordMarks` (the minute marks a fold evaluation needs for the sequential drawdown).
//   Options 5A never verified for L1/L2 stay refused: whole shares, a funding start, an explicit tie order and the
//   native D1 arming (the native bridge is an L0 reproduction only).
// Stage V (parity.ts) verifies that with no stress this path equals 5A's `runCoupled` record for record, that an
// always-granting allocator under L1/L2 gives the canonical books under every stress, that the fixed point is the same
// from three different starting guesses, and that the converged run is consistent with Priority 3's independent
// reference pool.
//
// A non-convergent or inconsistent run throws: the evaluation fails, and the job fails with it (never a fitness).
import { type BookId, type Friction, type VBook, baseFriction, symbolOf } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import {
  type EvalOptions,
  type Rec,
  booksOf,
  datasetsOf,
  evaluate as p3Evaluate,
  growthNextOpenSupported,
  isEnabled,
  poolOptionsOf,
  recordOf,
  run
} from '../vg-d1-growth-joint/evaluate.ts';
import { type PoolResult, runPool } from '../vg-d1-growth-joint/pool.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { MAX_ROUNDS, occupancyOf } from '../vg-growth-funding-lifecycle/coupled.ts';
import { type LifeBook, isPhantom, lifeBookOf } from '../vg-growth-funding-lifecycle/growthBook.ts';
import type { Ask, LifeOutcome, Mode } from '../vg-growth-funding-lifecycle/lifecycle.ts';

export interface LifeRun {
  mode: Mode;
  books: VBook[];
  result: PoolResult;
  rounds: number; // pool replays (L0: 1)
  growthSims: number; // lifecycle Growth book simulations (L0: 0, the canonical cached books)
  life: Partial<Record<BookId, LifeOutcome>>;
}

const growthIds: readonly BookId[] = ['G:GDX', 'G:VGT'];
const frictionOf = (o: EvalOptions): Friction => ({ ...baseFriction, ...(o.friction ?? {}) });
const stressed = (o: EvalOptions) => Object.keys(o.friction ?? {}).length > 0;

// The starting guess for unknown answers (verification varies it; the fixed point must not depend on it):
// 'occupancy' — 5A's: the latest pool's occupancy ("available" before any pool exists);
// 'available' — 5A's `noGuess`: every unknown answer is "available";
// 'refused' — every unknown answer is "refused".
export type Start = 'occupancy' | 'available' | 'refused';

export const runLife = (
  door: Door,
  q: Quad,
  o: EvalOptions,
  mode: Mode,
  opts: { start?: Start; recordMarks?: boolean; maxRounds?: number; flip?: { book: BookId; nth: number } } = {}
): LifeRun => {
  if (mode === 'L0') {
    const x = run(door, q, o, true, opts.recordMarks ?? false);

    return { mode, books: x.books, result: x.result, rounds: 1, growthSims: 0, life: {} };
  }

  if (o.wholeShares || o.tieOrder || o.fundFrom || o.d1Arm === 'native')
    throw new Error('L1/L2 runs support stresses and blackouts only (no whole shares, funding start, tie order or native arming)');

  const start = opts.start ?? 'occupancy';
  const maxRounds = opts.maxRounds ?? MAX_ROUNDS;
  const fr = frictionOf(o);
  const d1 = booksOf(door, q, { ...o, enabled: { ...(o.enabled ?? {}), 'G:GDX': false, 'G:VGT': false } });
  const gIds = growthIds.filter((b) => isEnabled(o, b));
  const exact = new Map<BookId, Map<number, boolean>>(gIds.map((b) => [b, new Map()]));
  const cache = new Map<BookId, { asked: Map<number, boolean>; book: LifeBook }>();
  let guess: ((b: BookId, t: number) => boolean) | null = null;
  let growthSims = 0;

  for (let round = 1; round <= maxRounds; round++) {
    const g = guess;
    const answer = (b: BookId, t: number) =>
      exact.get(b)!.get(t) ?? (start === 'refused' ? false : g ? !g(b, t) : true);
    const gBooks = gIds.map((b) => {
      const prev = cache.get(b);

      if (prev && [...prev.asked].every(([t, a]) => answer(b, t) === a)) return prev.book;

      const asked = new Map<number, boolean>();
      let n = 0;
      const ask: Ask = (_s, t) => {
        if (asked.has(t)) throw new Error(`${b}: asked twice at one instant`);

        // verification only (failure detection): the nth question of `flip.book` gets the wrong answer every round
        const flipped = opts.flip?.book === b && opts.flip.nth === n++;
        const a = flipped ? !answer(b, t) : answer(b, t);

        asked.set(t, a);
        return a;
      };
      const s = symbolOf(b);
      const gc = q.g[s];
      const gfr: Friction = fr.stopFill === 'next-open' && !growthNextOpenSupported(gc) ? { ...fr, stopFill: 'stop' } : fr;
      const book = stressed(o)
        ? lifeBookOf(door.sym[s], door, gc, mode, ask, { friction: gfr, costBps: gfr.costBps })
        : lifeBookOf(door.sym[s], door, gc, mode, ask); // exactly 5A's call

      growthSims++;
      cache.set(b, { asked, book });
      return book;
    });
    const result = runPool(datasetsOf(door), [...d1, ...gBooks], q.first, {
      ...poolOptionsOf(door, o, true),
      recordMarks: opts.recordMarks ?? false,
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
    if (start === 'occupancy') guess = occupancyOf(result, q.first);
  }

  throw new Error(`no consistent run after ${maxRounds} rounds (lifecycle ${mode})`);
};

// The compact record of one evaluation (Priority 3's `recordOf`, unchanged) — the fitness every arm is ranked on. L0
// is Priority 3's `evaluate` (cached canonical books, detail off: the exact 3B evaluation); stage V checks that it
// equals `recordOf(runLife(…, 'L0'))` field for field.
export type { Mode };
export const evaluateMode = (door: Door, q: Quad, o: EvalOptions, mode: Mode): Rec =>
  mode === 'L0' ? p3Evaluate(door, q, o) : recordOf(door, q, runLife(door, q, o, mode), o);

export const lifeKey = (mode: Mode, key: string) => `${mode}|${key}`;
