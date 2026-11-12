// One pooled evaluation under a maximum-hold unit (PROTOCOL.md §5): the single evaluation path of the study. It is
// Priority 3's evaluation (src/vg-d1-growth-joint/evaluate.ts `run` / `recordOf`: the canonical virtual books, the
// unchanged pooled replay, the compact record) — exactly Priority 5B's L0 path, which produced New L0 — with the hold
// unit passed as `EvalOptions.holdUnit`:
//   'cal' → no holdUnit (calendar days between session dates: the frozen behaviour, byte-identical records and keys);
//   'ses' → holdUnit 'sessions' (NYSE trading sessions after the entry session, src/lib/tradingSessions.ts), for every
//           enabled book's maximum hold — D1 (its maximumHoldDays) and Growth (its maximumHoldDays when the hold is ON).
// Lifecycle L0 only (5B's L1/L2 are not part of this study). The archive key is the unit + Priority 3's key.
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type EvalOptions, type Rec, evaluate, recordOf, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import type { Unit } from './context.ts';

export type { Unit };

export const withUnit = (o: EvalOptions, unit: Unit): EvalOptions => {
  if (o.holdUnit !== undefined) throw new Error('an evaluation carries its hold unit separately (unit.ts)');
  return unit === 'ses' ? { ...o, holdUnit: 'sessions' } : o;
};

export const evaluateUnit = (door: Door, q: Quad, o: EvalOptions, unit: Unit): Rec =>
  evaluate(door, q, withUnit(o, unit));

// The detailed run (books with their virtual trades, the pool's lots, funding records and optional minute marks).
export const runUnit = (door: Door, q: Quad, o: EvalOptions, unit: Unit, recordMarks = false) =>
  run(door, q, withUnit(o, unit), true, recordMarks);

export const recordOfRun = (door: Door, q: Quad, x: ReturnType<typeof run>, o: EvalOptions, unit: Unit) =>
  recordOf(door, q, x, withUnit(o, unit));

export const unitKey = (unit: Unit, key: string) => `${unit}|${key}`;
