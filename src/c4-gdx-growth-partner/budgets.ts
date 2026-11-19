// The frozen search budgets (PROTOCOL.md §7.4). Each arm has a fixed base of NEW GDX centre proposals per cutoff — the
// brief's weighted plan: R (C4-refined) 16,384 (66.7%), O (C4) 4,096 (16.7%), G (VGT #4 alone) 4,096 (16.7%) — split
// over three lanes: the seeded lane (the informed seeds, their designs and its islands) and two broad entry cells
// (rise, breakout: a screen and islands). The screens absorb the remainder so that every arm's base is exact at every
// cutoff whatever the number of seed designs. Development-only extensions add islands up to twice the base. The
// schedule is identical at every cutoff (standard §1.8: the same budget at each cutoff). `pilot` is the engineering
// pilot's scaled-down schedule (never a study result).
import type { Arm } from './space.ts';
import type { Budget, LaneKind } from './search.ts';

const common: Omit<
  Budget,
  | 'screen'
  | 'promote'
  | 'near'
  | 'broad'
  | 'islands'
  | 'islandsMax'
  | 'population'
  | 'newPerIsland'
  | 'r2Keep'
  | 'r3Keep'
  | 'shortlist'
> = {
  generations: 200,
  patience: 8,
  tolerance: 1e-3,
  extNet: 2000,
  extRobust: 2000,
  extHv: 0.01,
  r1: 16,
  r2: 64,
  r2Distinct: 0.02,
  r3: 128,
  r3Distinct: 0.03,
  refinePasses: 2,
  refineN: 16,
  refineMinGain: 2000,
  refineDistinct: 0.05,
  distinct: 0.1
};

export interface ArmPlan {
  base: number; // new distinct GDX centre proposals per cutoff (base)
  cap: number; // with every extension (2 × base)
  near: number; // seeded: designs per seed at scale 1.5
  broad: number; // seeded: designs per seed at scale 3
  seededIslands: [number, number]; // base, max
  broadIslands: [number, number]; // per broad lane: base, max
  newPerIsland: number;
  population: number;
  promote: number;
  r2Keep: number;
  r3Keep: number;
  shortlist: number; // per lane
}

export const plans: Record<'study' | 'pilot', Record<Arm, ArmPlan>> = {
  study: {
    // seeded: designs + 2 × 1,024; broad: screen + 4 × 1,024 each → 16,384; extensions: seeded +4 islands, broad +6
    // each → 16,384 more (cap 32,768)
    R: {
      base: 16384,
      cap: 32768,
      near: 4,
      broad: 4,
      seededIslands: [2, 6],
      broadIslands: [4, 10],
      newPerIsland: 1024,
      population: 64,
      promote: 128,
      r2Keep: 24,
      r3Keep: 8,
      shortlist: 4
    },
    // seeded: designs + 1 × 512; broad: screen + 2 × 512 each → 4,096; extensions: seeded +2 islands, broad +3 each →
    // 4,096 more (cap 8,192)
    O: {
      base: 4096,
      cap: 8192,
      near: 1,
      broad: 1,
      seededIslands: [1, 3],
      broadIslands: [2, 5],
      newPerIsland: 512,
      population: 32,
      promote: 64,
      r2Keep: 12,
      r3Keep: 6,
      shortlist: 3
    },
    G: {
      base: 4096,
      cap: 8192,
      near: 1,
      broad: 1,
      seededIslands: [1, 3],
      broadIslands: [2, 5],
      newPerIsland: 512,
      population: 32,
      promote: 64,
      r2Keep: 12,
      r3Keep: 6,
      shortlist: 3
    }
  },
  pilot: {
    R: {
      base: 256,
      cap: 352,
      near: 1,
      broad: 0,
      seededIslands: [1, 2],
      broadIslands: [1, 2],
      newPerIsland: 32,
      population: 8,
      promote: 8,
      r2Keep: 4,
      r3Keep: 2,
      shortlist: 2
    },
    O: {
      base: 160,
      cap: 192,
      near: 0,
      broad: 0,
      seededIslands: [1, 1],
      broadIslands: [1, 2],
      newPerIsland: 16,
      population: 8,
      promote: 8,
      r2Keep: 3,
      r3Keep: 2,
      shortlist: 2
    },
    G: {
      base: 160,
      cap: 192,
      near: 0,
      broad: 0,
      seededIslands: [1, 1],
      broadIslands: [1, 2],
      newPerIsland: 16,
      population: 8,
      promote: 8,
      r2Keep: 3,
      r3Keep: 2,
      shortlist: 2
    }
  }
};

// The lane budgets of an arm at a cutoff, given the number of distinct seeded designs (seeds included): the two broad
// screens share the remainder of the base (the rise lane takes the odd one).
export const laneBudgets = (
  schedule: 'study' | 'pilot',
  arm: Arm,
  seededDesigns: number
): Record<'seeded' | 'rise' | 'breakout', Budget> => {
  const p = plans[schedule][arm];
  const seededBase = seededDesigns + p.seededIslands[0] * p.newPerIsland;
  const broadIslands = 2 * p.broadIslands[0] * p.newPerIsland;
  const screens = p.base - seededBase - broadIslands;

  if (screens < 2 * p.promote) throw new Error(`${arm}: the base ${p.base} leaves only ${screens} screened proposals`);

  const lane = (kind: LaneKind, screen: number, isl: [number, number]): Budget => ({
    ...common,
    screen,
    promote: kind === 'broad' ? p.promote : 0,
    near: kind === 'seeded' ? p.near : 0,
    broad: kind === 'seeded' ? p.broad : 0,
    islands: isl[0],
    islandsMax: isl[1],
    population: p.population,
    newPerIsland: p.newPerIsland,
    r2Keep: p.r2Keep,
    r3Keep: p.r3Keep,
    shortlist: p.shortlist
  });

  return {
    seeded: lane('seeded', 0, p.seededIslands),
    rise: lane('broad', Math.ceil(screens / 2), p.broadIslands),
    breakout: lane('broad', Math.floor(screens / 2), p.broadIslands)
  };
};

// The proposal accounting of an arm at a cutoff (base and cap), for the freeze and the report.
export const proposalPlan = (schedule: 'study' | 'pilot', arm: Arm, seededDesigns: number) => {
  const p = plans[schedule][arm];
  const b = laneBudgets(schedule, arm, seededDesigns);
  const base =
    seededDesigns +
    b.seeded.islands * p.newPerIsland +
    b.rise.screen +
    b.breakout.screen +
    2 * p.broadIslands[0] * p.newPerIsland;
  const cap =
    base + (p.seededIslands[1] - p.seededIslands[0] + 2 * (p.broadIslands[1] - p.broadIslands[0])) * p.newPerIsland;

  if (base !== p.base || cap !== p.cap) throw new Error(`${arm}: proposal plan ${base}/${cap} ≠ ${p.base}/${p.cap}`);
  return {
    seededDesigns,
    seededIslands: b.seeded.islands * p.newPerIsland,
    screens: [b.rise.screen, b.breakout.screen],
    broadIslands: 2 * p.broadIslands[0] * p.newPerIsland,
    base,
    cap
  };
};

// The frozen evaluation caps (fresh backend evaluations; archive hits counted apart): a job exceeding its cap fails
// (an amendment matter). Set from the bench and the pilot's measured evaluations per proposal (PROTOCOL.md §7.4).
export const evaluationCaps = {
  searchPerCutoff: 1_000_000,
  qualifyPerCutoff: 160_000,
  transfers: 160_000,
  validationNeighbours: 5_000,
  total: 5_000_000
};
