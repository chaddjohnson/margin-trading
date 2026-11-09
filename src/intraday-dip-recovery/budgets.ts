// The frozen budgets (PROTOCOL.md §11.5): distinct candidate proposals and backend evaluations per family, lane, cutoff
// and stage. The independent lane's schedule is IDENTICAL at C19, C21, C23 and C24 (standard §1.8). Set from the pilot
// bench before the freeze (results/pilot/PILOT.md); any later change is an amendment.
import type { Budget } from './search.ts';

export const budgets: Record<'indep' | 'informed' | 'explore2' | 'pilot', Budget> = {
  // per family: 6 cells × 1,024 screened; 256 promoted to rung 1; 4 base islands × 64 × 1,024 new proposals; ≤ 2
  // extension islands; rung 2 keeps 48 (64 draws), rung 3 keeps 16 (128 draws); refinement ≤ 2 passes; shortlist ≤ 6.
  indep: {
    screenPerCell: 1024,
    r1Cap: 256,
    islands: 4,
    islandsMax: 6,
    population: 64,
    newPerIsland: 1024,
    generations: 60,
    patience: 10,
    r2Keep: 48,
    r3Keep: 16,
    refinePasses: 2,
    shortlist: 6,
    informedNear: 0,
    informedBroad: 0
  },
  // C24 only, per family: the 11 seeds (4 incumbents, 7 informed diagnostics, projected to the family) with 48 near
  // (1.5 × radius) and 48 broad (3 × radius) designs each; then the same islands, rungs and refinement.
  informed: {
    screenPerCell: 0,
    r1Cap: 256,
    islands: 4,
    islandsMax: 6,
    population: 64,
    newPerIsland: 1024,
    generations: 60,
    patience: 10,
    r2Keep: 48,
    r3Keep: 16,
    refinePasses: 2,
    shortlist: 6,
    informedNear: 48,
    informedBroad: 48
  },
  // C24 only, per family, at 2 bps per side (exploratory, never selectable): half the independent schedule.
  explore2: {
    screenPerCell: 512,
    r1Cap: 128,
    islands: 2,
    islandsMax: 3,
    population: 64,
    newPerIsland: 1024,
    generations: 60,
    patience: 10,
    r2Keep: 24,
    r3Keep: 8,
    refinePasses: 2,
    shortlist: 3,
    informedNear: 0,
    informedBroad: 0
  },
  // The pilot (engineering only; never a study record).
  pilot: {
    screenPerCell: 96,
    r1Cap: 48,
    islands: 2,
    islandsMax: 3,
    population: 24,
    newPerIsland: 192,
    generations: 12,
    patience: 4,
    r2Keep: 8,
    r3Keep: 4,
    refinePasses: 1,
    shortlist: 4,
    informedNear: 6,
    informedBroad: 6
  }
};
