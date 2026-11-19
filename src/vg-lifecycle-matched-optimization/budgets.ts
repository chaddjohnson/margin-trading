// The frozen search budgets (PROTOCOL.md §7). Identical in every arm (L0, L1, L2) and, for the independent lanes, at
// every cutoff (C19, C21, C23, C24). Per arm and cutoff the independent search runs two replicates (search seeds R1,
// R2), each with three protected structure cells:
//   V 1,024 (screen 512 + 2 islands × 256) · G 1,024 (the same) · B 2,048 (screen 1,024 + 4 islands × 256)
//   = 4,096 distinct base proposals per replicate, 8,192 per arm and cutoff (the brief's planning base);
//   extensions up to 6 islands (V, G) and 12 islands (B) = 2,048 / 2,048 / 4,096 = 8,192 per replicate, 16,384 per arm
//   and cutoff (the brief's maximum).
// The informed lane (C24 only) runs two replicates per arm, each ≤ 2,048 base proposals: the seed designs (≤ 481) + 4
// islands × 384 (base ≤ 2,017; ≤ 4,034 per arm); extensions up to 8 islands (≤ 3,553 per replicate, ≤ 7,106 per arm).
// Refinement: one pass per start (two for the informed focus starts at C4 and C4-refined); its moves are counted apart, as
// in Priority 3B. `pilot` is the engineering pilot's scaled-down schedule (never
// a study result).
import type { Budget } from './search.ts';

const common: Omit<
  Budget,
  'screen' | 'promote' | 'islands' | 'islandsMax' | 'population' | 'newPerIsland' | 'shortlist' | 'r2Keep' | 'r3Keep'
> = {
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

export type BudgetKey = 'indep-V' | 'indep-G' | 'indep-B' | 'informed';

export const budgets: Record<'study' | 'pilot', Record<BudgetKey, Budget>> = {
  study: {
    'indep-V': { ...common, screen: 512, promote: 64, islands: 2, islandsMax: 6, population: 32, newPerIsland: 256, r2Keep: 12, r3Keep: 6, shortlist: 3 },
    'indep-G': { ...common, screen: 512, promote: 64, islands: 2, islandsMax: 6, population: 32, newPerIsland: 256, r2Keep: 12, r3Keep: 6, shortlist: 3 },
    'indep-B': { ...common, screen: 1024, promote: 128, islands: 4, islandsMax: 12, population: 32, newPerIsland: 256, r2Keep: 16, r3Keep: 8, shortlist: 4 },
    informed: {
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
    // engineering only: tiny neighbourhoods (r1 4, r2 8, r3 16, refinement 4) so that the interruption tests stay cheap
    'indep-V': { ...common, r1: 4, r2: 8, r3: 16, refineN: 4, screen: 48, promote: 8, islands: 2, islandsMax: 3, population: 4, newPerIsland: 8, r2Keep: 3, r3Keep: 2, refinePasses: 1, shortlist: 2 },
    'indep-G': { ...common, r1: 4, r2: 8, r3: 16, refineN: 4, screen: 48, promote: 8, islands: 2, islandsMax: 3, population: 4, newPerIsland: 8, r2Keep: 3, r3Keep: 2, refinePasses: 1, shortlist: 2 },
    'indep-B': { ...common, r1: 4, r2: 8, r3: 16, refineN: 4, screen: 96, promote: 16, islands: 4, islandsMax: 5, population: 4, newPerIsland: 8, r2Keep: 4, r3Keep: 2, refinePasses: 1, shortlist: 3 },
    informed: {
      ...common,
      r1: 4,
      r2: 8,
      r3: 16,
      refineN: 4,
      screen: 0,
      promote: 0,
      islands: 4,
      islandsMax: 5,
      population: 4,
      newPerIsland: 8,
      r2Keep: 4,
      r3Keep: 2,
      refinePasses: 1,
      focusPasses: 1,
      shortlist: 3,
      near: 1,
      broad: 1,
      focusSmall: 2,
      focusMid: 2
    }
  }
};

export const budgetKeyOf = (kind: 'indep' | 'informed', inc?: 'V' | 'G' | 'B'): BudgetKey =>
  kind === 'informed' ? 'informed' : (`indep-${inc!}` as BudgetKey);

// The frozen caps on unique fresh simulations per job (PROTOCOL.md §7.4), all three arms together; their sum stays below
// the brief's 3,000,000 ceiling (context.ts). A search job also keeps `finishReserve` evaluations per lane for its
// finishing phase (rungs 2–3, refinement) when it decides an extension round (the resource guard).
export const simulationCaps = {
  engineering: 320_000, // stage V, the bench and the pilot together (counted from their records and logs)
  searchIndep: 415_000, // per cutoff (C19, C21, C23, C24), all three arms
  searchInformed: 370_000, // C24, all three arms
  qualify: 75_000, // per cutoff (C19, C21, C23)
  qualifyFinal: 110_000, // C24
  folds: 25_000, // per earlier cutoff: its training-door cross-test (fold slices run in-process, counted apart)
  crossTest: 60_000, // the C24 cross-test matrix
  diagnostics: 30_000,
  final: 15_000 // the validation neighbourhoods (the FULL rows run in-process, counted apart)
};

// per lane kind: rungs 2–3, refinement and endpoint refits (measured on the pilot: ≈ 11 evaluations per refinement move)
export const finishReserve = { indep: 8_000, informed: 30_000 } as const;
