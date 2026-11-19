// The frozen search budgets (PROTOCOL.md §8): reference method NL0 1.0.0's per-lane schedules, UNCHANGED, scaled by
// lanes (standard §4.8: more replicates of the unchanged per-lane schedules, never one stage enlarged alone):
//   broad lane (Track I)        = 5B's V-cell schedule (screen 512 → promote 64; 2 base islands × 256 new proposals,
//                                 extensions up to 6 islands; rung 2 12 × 64; rung 3 6 × 128; one refinement pass from the
//                                 robust and profit starts; shortlist 3);
//   refinement lane (Track I)   = 5B's informed schedule (each seed + 12 near (1.5) + 12 broad (3) designs; each focus
//   informed lane (Track N)       seed + 64 (0.5) + 64 (1.0); 4 base islands × 384, extensions up to 8; rung 2 16 × 64;
//                                 rung 3 8 × 128; one pass from the robust, profit and profit-2 starts, two passes from
//                                 the focus starts; shortlist 6).
// THE RESOURCE GUARD (adaptation AD7, brief §3.3): Assignment 2's lanes were stopped by NL0's per-lane share of 5B's job
// cap (415,000 / 18 lanes) in 117–155 lanes per cutoff from C21 on — budget-bound, not converged. Here a job's cap is the
// sum of its lanes' WORST CASE under the unchanged schedule (every proposal plausible, every island to the cap, the
// largest move set), so the guard (kept in code, with NL0's finishing reserves) cannot stop an extending lane before
// NL0's own island cap; the lanes stop on "triggers not met" or "extension cap reached".
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

export type BudgetKey = 'broad' | 'refine' | 'informed';

const informedSchedule: Budget = {
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
};

const pilotSeeded: Budget = {
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
};

export const budgets: Record<'study' | 'pilot', Record<BudgetKey, Budget>> = {
  study: {
    broad: { ...common, screen: 512, promote: 64, islands: 2, islandsMax: 6, population: 32, newPerIsland: 256, r2Keep: 12, r3Keep: 6, shortlist: 3 },
    refine: informedSchedule,
    informed: informedSchedule
  },
  pilot: {
    // engineering only: tiny neighbourhoods so that every stage path and the interruption tests stay cheap
    broad: { ...common, r1: 4, r2: 8, r3: 16, refineN: 4, screen: 48, promote: 8, islands: 2, islandsMax: 3, population: 4, newPerIsland: 8, r2Keep: 3, r3Keep: 2, shortlist: 2 },
    refine: pilotSeeded,
    informed: pilotSeeded
  }
};

// The largest refinement move set of one configuration (space.ts movesOf): 16 D1 genes × 4 + 2 books × (5 control genes
// × 4 + K × 2) + 2 activations + 2 gate switches + 27 active Growth inputs (the most any Growth structure activates) × 4
// + 7 Growth rules switched off = 227 ≤ 230.
export const maxMoves = 230;

// A lane's worst-case requested evaluations under its schedule (every centre plausible, so every fit measures its
// neighbours; every island to the cap with a full filler population; every refinement pass to the end).
export const laneWorstCase = (b: Budget, designs: number, focusSeeds: number) => {
  const fit = (n: number) => 1 + n;
  const screen = b.screen + b.promote * fit(b.r1);
  const seeded = designs * fit(b.r1);
  const islands = b.islandsMax * (b.newPerIsland + b.population) * fit(b.r1);
  const rungs = b.r2Keep * fit(b.r2) + b.r3Keep * fit(b.r3);
  const startsOnePass = designs > 0 ? 3 : 2;
  const refine = startsOnePass * (fit(b.refineN) + b.refinePasses * maxMoves * fit(b.refineN)) + 2 * focusSeeds * (fit(b.refineN) + b.focusPasses * maxMoves * fit(b.refineN));
  const endpoints = (startsOnePass + 2 * focusSeeds) * fit(b.r3);

  return screen + seeded + islands + rungs + refine + endpoints;
};

// The frozen per-lane caps (worst case, rounded up to the next 1,000): broad (no designs), refinement (≤ 6 seeds of a
// cell + 2 focus seeds: ≤ 406 designs), informed (16 projected seeds + 2 focus seeds: ≤ 656 designs).
const up = (x: number) => Math.ceil(x / 1000) * 1000;
export const perLaneCap = {
  broad: up(laneWorstCase(budgets.study.broad, 0, 0)),
  refine: up(laneWorstCase(budgets.study.refine, 6 * 25 + 2 * 128, 2)),
  informed: up(laneWorstCase(budgets.study.informed, 16 * 25 + 2 * 128, 2))
} as const;
// NL0's finishing reserves (kept; the guard cannot bind before the island cap with the caps above)
export const finishReserve = { broad: 8_000, refine: 30_000, informed: 30_000 } as const;

// Qualification ≈ 1 detailed centre + 1 centre + 2 × 128 selection + 3 × 128 confirmation + 6 stresses + 5 removals per
// member (≤ 653 evaluations), with a margin.
export const perMemberCap = 700;
export const simulationCaps = {
  engineering: 400_000, // stage V, the bench and the pilot together
  fold: 60_000, // per fold evaluation (the training neighbourhoods on the next slice)
  validation: 60_000
};
