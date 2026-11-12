// The frozen search budgets (PROTOCOL.md §8): reference method NL0 1.0.0's per-lane schedules (5B's budgets.ts, as the
// trading-session study ported them), UNCHANGED, scaled by REPLICATES per track and step (standard 2.1.0 §4.8: more
// replicates of the unchanged per-lane schedules, never one stage enlarged alone):
//   independent lane = 5B's V / G / B cell schedules as three sub-cells V1 / V2 / V3 (screen 512 / 512 / 1,024; 2 / 2 / 4
//                      base islands × 256, extensions up to 6 / 6 / 12; rungs 2–3 12 / 12 / 16 and 6 / 6 / 8 promoted;
//                      one refinement pass; shortlist 3 / 3 / 4);
//   informed lane    = 5B's informed schedule (the seed designs + near 12 / broad 12 per seed + 64 / 64 per focus seed;
//                      4 base islands × 384, extensions up to 8; rungs 16 × 64, 8 × 128; refinement one pass, two at the
//                      focus starts; shortlist 6).
// The replicate counts (stages.ts `replicatesOf`) and the per-job caps below give each track the same planned effort per
// cutoff as its comparable tracks (PROTOCOL.md §8.2).
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

const pilotIndep = (screen: number, promote: number, islands: number, r2Keep: number, shortlist: number): Budget => ({
  ...common,
  r1: 4,
  r2: 8,
  r3: 16,
  refineN: 4,
  screen,
  promote,
  islands,
  islandsMax: islands + 1,
  population: 4,
  newPerIsland: 8,
  r2Keep,
  r3Keep: 2,
  refinePasses: 1,
  shortlist
});

export const budgets: Record<'study' | 'pilot', Record<BudgetKey, Budget>> = {
  study: {
    // 5B's V, G and B cell schedules, unchanged, as the three sub-cells
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
    'indep-V1': pilotIndep(48, 8, 2, 3, 2),
    'indep-V2': pilotIndep(48, 8, 2, 3, 2),
    'indep-V3': pilotIndep(96, 16, 4, 4, 3),
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

// NL0's per-lane resource contract (5B / the trading-session study: an 18-lane independent job capped at 415,000 unique
// fresh simulations, a 6-lane informed job at 370,000), scaled by lanes: a job's cap = its lanes × the per-lane share.
// The resource guard (stages.ts) keeps `finishReserve` per lane for the finishing phase when it decides an extension.
export const perLaneCap = { indep: Math.ceil(415_000 / 18), informed: Math.ceil(370_000 / 6) } as const;
export const finishReserve = { indep: 8_000, informed: 30_000 } as const;

// Qualification and the other jobs: ≈ 651 evaluations per qualified member (centre, 2 × 128 selection, 3 × 128
// confirmation, 5 stresses, the removal reruns) with a margin; the planning caps of the remaining jobs.
export const perMemberCap = 700;
export const simulationCaps = {
  engineering: 400_000, // stage V, the bench, the pilot and the fixed-parameter dry run together
  phase2: 60_000, // the fixed-parameter comparison (8 toggle combinations of New L0 + controls, D24)
  folds: 40_000, // per earlier cutoff: the training-door cross-test of the fold primaries
  ablation: 120_000, // the C24 ablation cross-test (phenotype × toggles)
  diagnostics: 40_000,
  final: 30_000 // the validation neighbourhoods (the FULL rows run in-process, counted apart)
};
