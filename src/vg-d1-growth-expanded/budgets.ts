// The frozen search budgets (PROTOCOL.md §7). The independent schedule is identical at every cutoff (the matched-budget
// rule): 8 cells (V: VGT rise | breakout; G: GDX rise | breakout; B: the four entry pairs), each with the same screen,
// promotion, base islands, extension cap, rungs and refinement. `pilot` is the engineering pilot's scaled-down
// schedule (never a study result).
import type { Budget } from './search.ts';

const base: Omit<Budget, 'screen' | 'promote' | 'islands' | 'islandsMax' | 'population' | 'newPerIsland' | 'shortlist'> = {
  r1: 16,
  generations: 200,
  patience: 8,
  tolerance: 1e-3,
  extension: 0.05,
  r2Keep: 24,
  r2: 64,
  r2Distinct: 0.02,
  r3Keep: 8,
  r3: 128,
  r3Distinct: 0.03,
  refinePasses: 2,
  focusPasses: 4,
  refineN: 16,
  refineMinGain: 2000,
  refineDistinct: 0.05,
  distinct: 0.1,
  near: 0,
  broad: 0,
  focusSmall: 0,
  focusMid: 0
};

export type Arm = 'indep' | 'informed-fixed' | 'informed-joint';

export const budgets: Record<'study' | 'pilot', Record<Arm, Budget>> = {
  study: {
    // per cell (8 cells), every cutoff: 8,192 screened + 4 × 2,048 base island proposals = 16,384 distinct base
    // proposals per cell, 131,072 per cutoff; extensions up to 8 islands per cell (196,608 per cutoff)
    indep: {
      ...base,
      screen: 8192,
      promote: 128,
      islands: 4,
      islandsMax: 8,
      population: 64,
      newPerIsland: 2048,
      shortlist: 5
    },
    // one lane each (C24): the seeds' designs + 4 × 4,096 base island proposals; extensions up to 8 islands
    'informed-fixed': {
      ...base,
      screen: 0,
      promote: 0,
      islands: 4,
      islandsMax: 8,
      population: 64,
      newPerIsland: 4096,
      r2Keep: 32,
      r3Keep: 10,
      shortlist: 8,
      near: 24,
      broad: 24,
      focusSmall: 256,
      focusMid: 256
    },
    'informed-joint': {
      ...base,
      screen: 0,
      promote: 0,
      islands: 4,
      islandsMax: 8,
      population: 64,
      newPerIsland: 4096,
      r2Keep: 32,
      r3Keep: 10,
      shortlist: 8,
      near: 24,
      broad: 24,
      focusSmall: 256,
      focusMid: 256
    }
  },
  pilot: {
    indep: {
      ...base,
      screen: 96,
      promote: 8,
      islands: 4,
      islandsMax: 5,
      population: 8,
      newPerIsland: 16,
      r2Keep: 4,
      r3Keep: 2,
      refinePasses: 1,
      shortlist: 3
    },
    'informed-fixed': {
      ...base,
      screen: 0,
      promote: 0,
      islands: 4,
      islandsMax: 5,
      population: 8,
      newPerIsland: 16,
      r2Keep: 4,
      r3Keep: 2,
      refinePasses: 1,
      focusPasses: 1,
      shortlist: 4,
      near: 1,
      broad: 1,
      focusSmall: 4,
      focusMid: 4
    },
    'informed-joint': {
      ...base,
      screen: 0,
      promote: 0,
      islands: 4,
      islandsMax: 5,
      population: 8,
      newPerIsland: 16,
      r2Keep: 4,
      r3Keep: 2,
      refinePasses: 1,
      focusPasses: 1,
      shortlist: 4,
      near: 1,
      broad: 1,
      focusSmall: 4,
      focusMid: 4
    }
  }
};
