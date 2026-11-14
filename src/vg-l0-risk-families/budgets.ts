// The frozen search budgets (PROTOCOL.md §8): reference method NL0 1.0.0's per-lane schedules, UNCHANGED, scaled by
// lanes (one per cell and replicate; standard §4.8: more replicates of the unchanged per-lane schedules, never one stage
// enlarged alone):
//   broad lane      = 5B's V-cell schedule (screen 512 → promote 64; 2 base islands × 256 new proposals, extensions up to
//                     6 islands; rung 2 12 × 64; rung 3 6 × 128; one refinement pass from the robust and profit starts;
//                     shortlist 3);
//   refinement lane = 5B's informed schedule (each seed + 12 near (1.5) + 12 broad (3) designs; each focus seed + 64 (0.5) +
//                     64 (1.0); 4 base islands × 384, extensions up to 8; rung 2 16 × 64; rung 3 8 × 128; one pass from the
//                     robust, profit and profit-2 starts, two passes from the focus starts; shortlist 6).
import type { Budget } from './search.ts';

const common: Omit<Budget, 'screen' | 'promote' | 'islands' | 'islandsMax' | 'population' | 'newPerIsland' | 'shortlist' | 'r2Keep' | 'r3Keep'> = {
  r1: 16,
  generations: 200,
  patience: 8,
  tolerance: 1e-3,
  extension: 0.05,
  r2: 64,
  r2Distinct: 0.02,
  r3: 128,
  r3Distinct: 0.03,
  refinePasses: 1,
  focusPasses: 2,
  refineN: 16,
  refineMinGain: 2000,
  refineDistinct: 0.05,
  distinct: 0.1,
  near: 0,
  broad: 0,
  focusSmall: 0,
  focusMid: 0
};

export type BudgetKey = 'broad' | 'refine';

export const budgets: Record<'study' | 'pilot', Record<BudgetKey, Budget>> = {
  study: {
    broad: { ...common, screen: 512, promote: 64, islands: 2, islandsMax: 6, population: 32, newPerIsland: 256, r2Keep: 12, r3Keep: 6, shortlist: 3 },
    refine: {
      ...common,
      screen: 0,
      promote: 0,
      islands: 4,
      islandsMax: 8,
      population: 32,
      newPerIsland: 384,
      r2Keep: 16,
      r3Keep: 8,
      shortlist: 6,
      near: 12,
      broad: 12,
      focusSmall: 64,
      focusMid: 64
    }
  },
  pilot: {
    // engineering only: tiny neighbourhoods so that every stage path and the interruption tests stay cheap
    broad: { ...common, r1: 4, r2: 8, r3: 16, refineN: 4, screen: 48, promote: 8, islands: 2, islandsMax: 3, population: 4, newPerIsland: 8, r2Keep: 3, r3Keep: 2, shortlist: 2 },
    refine: {
      ...common,
      r1: 4,
      r2: 8,
      r3: 16,
      refineN: 4,
      screen: 0,
      promote: 0,
      islands: 2,
      islandsMax: 3,
      population: 4,
      newPerIsland: 8,
      r2Keep: 3,
      r3Keep: 2,
      focusPasses: 1,
      shortlist: 3,
      near: 1,
      broad: 1,
      focusSmall: 2,
      focusMid: 2
    }
  }
};

// NL0's per-lane resource contract (5B: an 18-lane independent job capped at 415,000 unique fresh simulations, a 6-lane
// informed job at 370,000), scaled by lanes: a job's cap = its lanes × the per-lane share. The resource guard keeps
// `finishReserve` per lane for the finishing phase when it decides an extension round.
export const perLaneCap = { broad: Math.ceil(415_000 / 18), refine: Math.ceil(370_000 / 6) } as const;
export const finishReserve = { broad: 8_000, refine: 30_000 } as const;

// Qualification ≈ 1 detailed centre + 1 centre + 2 × 128 selection + 3 × 128 confirmation + 5 stresses + 3 removals per
// member (≤ 650 evaluations), with a margin.
export const perMemberCap = 700;
export const simulationCaps = {
  engineering: 200_000, // stage V, the bench and the pilot together
  fold: 60_000, // per fold evaluation (the fold rows on the next door)
  controls: 20_000, // New L0 and the fixed controls' qualification per cutoff
  validation: 30_000
};
