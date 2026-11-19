// The frozen search budgets (PROTOCOL.md §7.4; brief "Search design and compute budget"). Two separately accounted
// lanes, budgets in NEW DISTINCT CENTRE PROPOSALS:
//   - INDEPENDENT, at each of C19, C21, C23 and C24: base 16,384, cap 32,768 with development-only extensions. Two
//     protected entry cells (rise, breakout), each a screen of 4,096 plus 4 islands × 1,024 (base 8,192 per cell) and up
//     to 12 islands with extensions (cap 16,384 per cell). The same schedule at every cutoff (standard §1.8).
//   - INFORMED, at C24 only: base 8,192, cap 16,384. The informed seeds unchanged, their fine (0.5), near (1.5) and
//     broad (3) designs, then islands whose budget is the remainder of the base (the first island takes the odd part),
//     and extension islands of 1,024 up to the cap.
// The informed lane never consumes the independent allocation. `pilot` is the engineering pilot's scaled-down
// schedule (never a study result).
import type { Budget, LaneKind } from './search.ts';

const common: Omit<
  Budget,
  | 'screen'
  | 'promote'
  | 'fine'
  | 'near'
  | 'broad'
  | 'islands'
  | 'islandsMax'
  | 'population'
  | 'newPerIsland'
  | 'firstIsland'
  | 'extPerIsland'
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
  extNewClassShare: 0.5,
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

export interface LanePlan {
  base: number; // new distinct centre proposals of the lane at a cutoff (base)
  cap: number; // with every extension
  screen: number; // independent cells: screened proposals per cell
  promote: number; // independent cells: promoted from the screen to rung 1
  fine: number; // informed: designs per seed at scale 0.5
  near: number; // informed: designs per seed at scale 1.5
  broad: number; // informed: designs per seed at scale 3
  islands: [number, number]; // per cell (independent) or for the lane (informed): base, max
  newPerIsland: number;
  population: number;
  r2Keep: number;
  r3Keep: number;
  shortlist: number; // per cell / lane
}

export const plans: Record<'study' | 'pilot', Record<'independent' | 'informed', LanePlan>> = {
  study: {
    // per cell: screen 4,096 + 4 × 1,024 = 8,192; two cells = 16,384; extensions +8 islands per cell → cap 32,768
    independent: {
      base: 16384,
      cap: 32768,
      screen: 4096,
      promote: 256,
      fine: 0,
      near: 0,
      broad: 0,
      islands: [4, 12],
      newPerIsland: 1024,
      population: 64,
      r2Keep: 24,
      r3Keep: 8,
      shortlist: 5
    },
    // seeds + designs (8 fine, 16 near, 16 broad per seed) + islands absorbing the remainder of 8,192 (base 4 islands);
    // extensions of 1,024 up to the cap 16,384
    informed: {
      base: 8192,
      cap: 16384,
      screen: 0,
      promote: 0,
      fine: 8,
      near: 16,
      broad: 16,
      islands: [4, 12],
      newPerIsland: 1024,
      population: 64,
      r2Keep: 24,
      r3Keep: 8,
      shortlist: 6
    }
  },
  pilot: {
    independent: {
      base: 512,
      cap: 768,
      screen: 128,
      promote: 16,
      fine: 0,
      near: 0,
      broad: 0,
      islands: [2, 4],
      newPerIsland: 64,
      population: 16,
      r2Keep: 4,
      r3Keep: 2,
      shortlist: 2
    },
    informed: {
      base: 384,
      cap: 512,
      screen: 0,
      promote: 0,
      fine: 1,
      near: 2,
      broad: 2,
      islands: [2, 4],
      newPerIsland: 64,
      population: 16,
      r2Keep: 4,
      r3Keep: 2,
      shortlist: 2
    }
  }
};

const laneOf = (kind: LaneKind, p: LanePlan, firstIsland: number): Budget => ({
  ...common,
  screen: kind === 'broad' ? p.screen : 0,
  promote: kind === 'broad' ? p.promote : 0,
  fine: kind === 'seeded' ? p.fine : 0,
  near: kind === 'seeded' ? p.near : 0,
  broad: kind === 'seeded' ? p.broad : 0,
  islands: p.islands[0],
  islandsMax: p.islands[1],
  population: p.population,
  newPerIsland: p.newPerIsland,
  firstIsland,
  extPerIsland: p.newPerIsland,
  r2Keep: p.r2Keep,
  r3Keep: p.r3Keep,
  shortlist: p.shortlist
});

// The independent cells' budgets (identical at every cutoff).
export const independentBudget = (schedule: 'study' | 'pilot'): Budget => {
  const p = plans[schedule].independent;

  if (2 * (p.screen + p.islands[0] * p.newPerIsland) !== p.base) throw new Error('independent base mismatch');
  if (2 * (p.screen + p.islands[1] * p.newPerIsland) !== p.cap) throw new Error('independent cap mismatch');
  return laneOf('broad', p, p.newPerIsland);
};

// The informed lane's budget given its number of distinct designs (seeds included): the base islands share the
// remainder of the base; the first takes the odd part.
export const informedBudget = (schedule: 'study' | 'pilot', designs: number): Budget => {
  const p = plans[schedule].informed;
  const left = p.base - designs;

  if (left < p.islands[0] * p.population)
    throw new Error(`informed: ${designs} designs leave ${left} island proposals`);

  const per = Math.floor(left / p.islands[0]);
  const first = left - per * (p.islands[0] - 1);

  return { ...laneOf('seeded', p, first), newPerIsland: per };
};

// The proposal accounting of a cutoff (base and cap), for the freeze and the report.
export const proposalPlan = (schedule: 'study' | 'pilot', informedDesigns: number | null) => {
  const pi = plans[schedule].independent;
  const independent = {
    cells: {
      rise: { screen: pi.screen, islands: pi.islands[0] * pi.newPerIsland },
      breakout: { screen: pi.screen, islands: pi.islands[0] * pi.newPerIsland }
    },
    base: pi.base,
    cap: pi.cap
  };

  if (informedDesigns === null) return { independent, informed: null };

  const pf = plans[schedule].informed;
  const b = informedBudget(schedule, informedDesigns);
  const base = informedDesigns + b.firstIsland + (pf.islands[0] - 1) * b.newPerIsland;
  const cap = base + (pf.islands[1] - pf.islands[0]) * pf.newPerIsland;

  if (base !== pf.base || cap !== pf.cap)
    throw new Error(`informed proposal plan ${base}/${cap} ≠ ${pf.base}/${pf.cap}`);
  return {
    independent,
    informed: {
      designs: informedDesigns,
      islands: [b.firstIsland, ...Array(pf.islands[0] - 1).fill(b.newPerIsland)],
      base,
      cap
    }
  };
};

// The frozen evaluation caps (fresh backend evaluations; archive hits counted apart): a job exceeding its cap fails
// (an amendment matter). Set from the bench and the pilot's measured evaluations per proposal (PROTOCOL.md §7.4).
export const evaluationCaps = {
  searchIndependentPerCutoff: 750_000,
  searchInformed: 400_000,
  qualifyPerCutoff: 120_000,
  validationNeighbours: 10_000,
  total: 4_000_000
};
