// The frozen search budgets (PROTOCOL.md §11.5), identical at every cutoff for the independent four-component lanes
// (the matched-budget rule). `pilot` is the engineering pilot's scaled-down schedule (never a study result).
import type { Budget } from './search.ts';

const base: Omit<Budget, 'screen' | 'promote' | 'islands' | 'islandsMax' | 'population' | 'newPerIsland'> = {
  r1: 16,
  generations: 60,
  patience: 8,
  tolerance: 1e-3,
  extension: 0.05,
  r2Keep: 16,
  r2: 64,
  r2Distinct: 0.02,
  r3Keep: 6,
  r3: 128,
  r3Distinct: 0.03,
  refineStarts: ['robust', 'profit'],
  refinePasses: 2,
  refineN: 16,
  refineMinGain: 2000,
  refineDistinct: 0.05,
  shortlist: 4,
  distinct: 0.1,
  local: 0,
  broad: 0
};

export type Arm = 'indep' | 'gpair' | 'informed';

export const budgets: Record<'study' | 'pilot', Record<Arm, Budget>> = {
  study: {
    // arm D, per cell (4 cells: Growth·GDX entry × Growth·VGT entry), every cutoff
    indep: { ...base, screen: 4096, promote: 64, islands: 3, islandsMax: 4, population: 64, newPerIsland: 1024 },
    // arm B, per cell (4 cells), C24 only
    gpair: {
      ...base,
      screen: 2048,
      promote: 48,
      islands: 2,
      islandsMax: 3,
      population: 48,
      newPerIsland: 576,
      shortlist: 3
    },
    // arm C, one lane (C24 only): the seeds × (1 + near + broad designs), islands with every gene free
    informed: {
      ...base,
      screen: 0,
      promote: 0,
      islands: 3,
      islandsMax: 4,
      population: 64,
      newPerIsland: 1024,
      r2Keep: 24,
      r3Keep: 8,
      shortlist: 4,
      local: 48,
      broad: 48
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
    gpair: {
      ...base,
      screen: 64,
      promote: 8,
      islands: 1,
      islandsMax: 2,
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
      islands: 1,
      islandsMax: 2,
      population: 8,
      newPerIsland: 16,
      r2Keep: 4,
      r3Keep: 2,
      refinePasses: 1,
      shortlist: 2,
      local: 4,
      broad: 4
    }
  }
};
