// The frozen search budgets (PROTOCOL.md §6.4), identical at every cutoff for the independent joint lanes (the
// matched-budget rule). `pilot` is the engineering pilot's scaled-down schedule (never a study result).
import type { Budget } from './search.ts';

const base: Omit<Budget, 'screen' | 'promote' | 'islands' | 'islandsMax' | 'population' | 'newPerIsland'> = {
  r1: 16,
  generations: 40,
  patience: 8,
  tolerance: 1e-3,
  saturation: 0.05,
  r2Keep: 16,
  r2: 64,
  r2Distinct: 0.02,
  r3Keep: 6,
  r3: 128,
  r3Distinct: 0.03,
  refineStarts: 1,
  refinePasses: 2,
  refineN: 16,
  refineMinGain: 2000,
  refineDistinct: 0.05,
  shortlist: 3,
  distinct: 0.1,
  local: 0
};

export const budgets: Record<'study' | 'pilot', Record<'indep' | 'informed' | 'd1only' | 'gonly', Budget>> = {
  study: {
    // per cell (8 cells: architecture × entry × gate)
    indep: { ...base, screen: 2048, promote: 64, islands: 2, islandsMax: 3, population: 64, newPerIsland: 768 },
    // one lane: 30 seeds × (1 + 32 local designs), one island per architecture
    informed: {
      ...base,
      screen: 0,
      promote: 0,
      islands: 2,
      islandsMax: 2,
      population: 64,
      newPerIsland: 768,
      r2Keep: 24,
      r3Keep: 8,
      refineStarts: 2,
      shortlist: 4,
      local: 32
    },
    // the single-family controls (C24): D1 alone, one cell; Growth alone, four cells (entry × gate)
    d1only: { ...base, screen: 2048, promote: 64, islands: 2, islandsMax: 3, population: 64, newPerIsland: 768 },
    gonly: {
      ...base,
      screen: 1024,
      promote: 32,
      islands: 2,
      islandsMax: 3,
      population: 48,
      newPerIsland: 384,
      shortlist: 2
    }
  },
  pilot: {
    indep: {
      ...base,
      screen: 96,
      promote: 8,
      islands: 2,
      islandsMax: 3,
      population: 8,
      newPerIsland: 16,
      r2Keep: 4,
      r3Keep: 2,
      refinePasses: 1,
      shortlist: 2
    },
    informed: {
      ...base,
      screen: 0,
      promote: 0,
      islands: 2,
      islandsMax: 2,
      population: 8,
      newPerIsland: 16,
      r2Keep: 4,
      r3Keep: 2,
      refineStarts: 1,
      refinePasses: 1,
      shortlist: 2,
      local: 4
    },
    d1only: {
      ...base,
      screen: 64,
      promote: 8,
      islands: 2,
      islandsMax: 2,
      population: 8,
      newPerIsland: 16,
      r2Keep: 4,
      r3Keep: 2,
      refinePasses: 1,
      shortlist: 2
    },
    gonly: {
      ...base,
      screen: 64,
      promote: 8,
      islands: 2,
      islandsMax: 2,
      population: 8,
      newPerIsland: 16,
      r2Keep: 4,
      r3Keep: 2,
      refinePasses: 1,
      shortlist: 1
    }
  }
};
