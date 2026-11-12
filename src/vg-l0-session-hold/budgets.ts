// The frozen search budgets (PROTOCOL.md §7): reference method NL0 1.0.0 (5B's budgets.ts) with the omitted structure
// cells REASSIGNED to the retained structure V through their own schedules (standard 2.1.0 §4.8):
//   per replicate and cutoff, three V sub-cells — V1 = 5B's V schedule (screen 512 + 2 islands × 256), V2 = 5B's G
//   schedule (identical numbers), V3 = 5B's B schedule (screen 1,024 + 4 islands × 256) — 4,096 distinct base
//   proposals per replicate, exactly 5B's per-replicate total; extensions up to 6 / 6 / 12 islands (8,192 per replicate);
//   the informed lane (C24) per replicate: the seed designs + 4 islands × 384 (extensions up to 8 islands).
// Effort is scaled by REPLICATES (6 instead of 5B's 2 per arm): 6 = 5B's 3 arms × 2 replicates, so the study's base
// equals 5B's whole-study base schedule and ≥ 3× the L0 arm (the effective budget that produced New L0). Refinement:
// one pass per start (two at the informed focus starts), as 5B after its amendment R1.
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

export type BudgetKey = 'indep-V1' | 'indep-V2' | 'indep-V3' | 'informed';

export const budgets: Record<'study' | 'pilot', Record<BudgetKey, Budget>> = {
  study: {
    // 5B's V, G and B cell schedules, unchanged, as the three V sub-cells
    'indep-V1': {
      ...common,
      screen: 512,
      promote: 64,
      islands: 2,
      islandsMax: 6,
      population: 32,
      newPerIsland: 256,
      r2Keep: 12,
      r3Keep: 6,
      shortlist: 3
    },
    'indep-V2': {
      ...common,
      screen: 512,
      promote: 64,
      islands: 2,
      islandsMax: 6,
      population: 32,
      newPerIsland: 256,
      r2Keep: 12,
      r3Keep: 6,
      shortlist: 3
    },
    'indep-V3': {
      ...common,
      screen: 1024,
      promote: 128,
      islands: 4,
      islandsMax: 12,
      population: 32,
      newPerIsland: 256,
      r2Keep: 16,
      r3Keep: 8,
      shortlist: 4
    },
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
    'indep-V1': {
      ...common,
      r1: 4,
      r2: 8,
      r3: 16,
      refineN: 4,
      screen: 48,
      promote: 8,
      islands: 2,
      islandsMax: 3,
      population: 4,
      newPerIsland: 8,
      r2Keep: 3,
      r3Keep: 2,
      refinePasses: 1,
      shortlist: 2
    },
    'indep-V2': {
      ...common,
      r1: 4,
      r2: 8,
      r3: 16,
      refineN: 4,
      screen: 48,
      promote: 8,
      islands: 2,
      islandsMax: 3,
      population: 4,
      newPerIsland: 8,
      r2Keep: 3,
      r3Keep: 2,
      refinePasses: 1,
      shortlist: 2
    },
    'indep-V3': {
      ...common,
      r1: 4,
      r2: 8,
      r3: 16,
      refineN: 4,
      screen: 96,
      promote: 16,
      islands: 4,
      islandsMax: 5,
      population: 4,
      newPerIsland: 8,
      r2Keep: 4,
      r3Keep: 2,
      refinePasses: 1,
      shortlist: 3
    },
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

export const budgetKeyOf = (kind: 'indep' | 'informed', sub?: 'V1' | 'V2' | 'V3'): BudgetKey =>
  kind === 'informed' ? 'informed' : (`indep-${sub!}` as BudgetKey);

// The frozen caps on unique fresh simulations per job (PROTOCOL.md §7.4): 5B's per-job caps, kept (a job has the same
// lane count as 5B's: 18 independent lanes = 6 replicates × 3 sub-cells, 6 informed lanes = 6 replicates); their sum
// stays below the 3,000,000 ceiling (context.ts). A search job also keeps `finishReserve` evaluations per lane for its
// finishing phase (rungs 2–3, refinement) when it decides an extension round (the resource guard, 5B's).
export const simulationCaps = {
  engineering: 320_000, // stage V, the bench and the pilot together (counted from their records and logs)
  searchIndep: 415_000, // per cutoff (C19, C21, C23, C24): 18 lanes
  searchInformed: 370_000, // C24: 6 lanes
  qualify: 75_000, // per cutoff (C19, C21, C23)
  qualifyFinal: 110_000, // C24
  folds: 25_000, // per earlier cutoff: its training-door cross-test (fold slices run in-process, counted apart)
  crossTest: 60_000, // the C24 unit cross-test (phenotype × hold unit)
  diagnostics: 30_000,
  final: 15_000 // the validation neighbourhoods (the FULL rows run in-process, counted apart)
};

// per lane kind: rungs 2–3, refinement and endpoint refits (measured on the pilot: ≈ 11 evaluations per refinement move)
export const finishReserve = { indep: 8_000, informed: 30_000 } as const;
