// The D1 ranked-preemption study (research/d1-ranked-preemption): standalone D1 discovery and screening for every
// eligible ETF, two frozen standalone-derived priority rankings (R1 mean net per trade, R2 net per capital-occupied
// day), a causal net-breakeven preemption allocator (P1), and joint pool optimization with the frozen rankings active.
// Every constant of PROTOCOL.md is declared here, so the code and the protocol can be compared line by line; the file
// is bound by the protocol freeze.
import path from 'node:path';

export {
  formatDollars,
  hasFlag,
  jsonReplacer,
  nowIso,
  option,
  readJson,
  writeJson,
  writeText
} from '../portfolio-aware-d1/context.ts';

// RANKED_PREEMPTION_ROOT and RANKED_PREEMPTION_DATA redirect every path to a scratch tree for the synthetic
// end-to-end test (tests/pipeline.test.ts) only; study runs never set them.
const testRoot = process.env.RANKED_PREEMPTION_ROOT;

export const dataRoot = process.env.RANKED_PREEMPTION_DATA ?? 'data';
export const researchRoot = testRoot ? path.join(testRoot, 'research') : 'research/d1-ranked-preemption';
export const resultsRoot = path.join(researchRoot, 'results');
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const briefFile = path.join(researchRoot, 'brief', 'BRIEF.md');
export const contextFile = 'src/d1-ranked-preemption/context.ts';
export const protocolFreezeFile = path.join(researchRoot, 'PROTOCOL_FREEZE.json');
export const codeFreezeFile = stageDir('code_freeze.json');
export const amendmentsFile = stageDir('amendments.jsonl');
export const universeFile = stageDir('audit', 'universe.json');
export const tierFile = stageDir('benchmark', 'tier.json');
export const frozenSelectionFile = path.join(researchRoot, 'FROZEN_SELECTION.json');
export const rankingsRoot = path.join(researchRoot, 'rankings');
export const standaloneRoot = path.join(researchRoot, 'standalone');
export const researchPoolsRoot = testRoot ? path.join(testRoot, 'pools') : 'config/research-pools/d1-ranked-preemption';
export const evaluationsRoot = testRoot ? path.join(testRoot, 'evaluations') : 'evaluations/ranked-preemption';
export const legacyUniverseFile = 'research/d1-robust-pool-discovery/results/audit/universe.json';
export const prospectiveFreezeFile = 'research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json';

export const log = (line: string) => console.info(`[ranked-preemption] ${line}`);

export type WindowKey = 'fold-a' | 'fold-b' | 'final';
export type FoldKey = 'fold-a' | 'fold-b';
export type RankingKey = 'R1' | 'R2';
export type ArmKey = 'S' | 'I' | 'B'; // standalone-seeded, independent, incumbent-seeded (final only, exploratory)

export const windowKeys: readonly WindowKey[] = ['fold-a', 'fold-b', 'final'];
export const foldKeys: readonly FoldKey[] = ['fold-a', 'fold-b'];
export const rankingKeys: readonly RankingKey[] = ['R1', 'R2'];

export interface RoundWindow {
  key: WindowKey;
  searchEnd: string; // the last date any optimizer, screen or ranking of the window may read
  validationStart?: string;
  validationEnd?: string;
  arms: readonly ArmKey[];
}

export interface Period {
  key: string;
  label: string;
  start: string;
  end: string;
}

export const study = {
  version: 'd1-ranked-preemption-v1',
  seedLabel: 'd1-ranked-preemption',
  firstSession: '2016-01-04',
  eligibilityDate: '2017-06-15', // books arm here; accounting starts at the 2016-01-04 close
  trainingLastSession: '2023-12-29',
  lastCommonSession: '2026-10-13',
  historicalCheck: { start: '2024-01-02', end: '2026-10-13' },
  rate: 0.11,
  principal: 100000,
  fraction: 0.2,
  initialCore: { voog: 180000, vgt: 120000 },
  costsBps: [0, 2, 5, 10] as const,
  principalCostBps: 5,

  // §4 windows (the existing verified partitions; folds re-run the whole procedure)
  windows: {
    'fold-a': {
      key: 'fold-a',
      searchEnd: '2020-06-30',
      validationStart: '2020-07-01',
      validationEnd: '2021-12-31',
      arms: ['S', 'I']
    },
    'fold-b': {
      key: 'fold-b',
      searchEnd: '2021-12-31',
      validationStart: '2022-01-01',
      validationEnd: '2023-12-29',
      arms: ['S', 'I']
    },
    final: { key: 'final', searchEnd: '2023-12-29', arms: ['S', 'I', 'B'] }
  } as Record<WindowKey, RoundWindow>,

  // attribution periods (the October 25 study's regimes, keyed G1–G13 here to avoid the ranking keys), clipped to each window
  regimes: [
    { key: 'G1', label: 'late-2017 calm bull', start: '2017-06-15', end: '2018-01-25' },
    { key: 'G2', label: 'Feb 2018 volatility shock', start: '2018-01-26', end: '2018-04-30' },
    { key: 'G3', label: 'mid-2018', start: '2018-05-01', end: '2018-09-30' },
    { key: 'G4', label: 'Q4 2018 sell-off', start: '2018-10-01', end: '2018-12-31' },
    { key: 'G5', label: '2019 trade-war dips', start: '2019-01-01', end: '2019-12-31' },
    { key: 'G6', label: 'early 2020', start: '2020-01-01', end: '2020-02-18' },
    { key: 'G7', label: 'COVID crash and first rebound', start: '2020-02-19', end: '2020-04-30' },
    { key: 'G8', label: '2020 recovery', start: '2020-05-01', end: '2020-12-31' },
    { key: 'G9', label: '2021', start: '2021-01-01', end: '2021-12-31' },
    { key: 'G10', label: '2022 bear market', start: '2022-01-01', end: '2022-10-31' },
    { key: 'G11', label: 'late-2022 rebound', start: '2022-11-01', end: '2023-02-28' },
    { key: 'G12', label: '2023 regional-bank stress', start: '2023-03-01', end: '2023-05-31' },
    { key: 'G13', label: '2023 H2 (rate sell-off)', start: '2023-06-01', end: '2023-12-31' }
  ] as Period[],

  // §6 Stage A: standalone discovery (identical in every window; budgets from the frozen tier)
  standalone: {
    ddCeiling: 35000, // credible: minute DD ≤ this
    ddPenaltyFrom: 20000, // J_s: dollar-for-dollar penalty above this
    tradesPerYear: 1.0, // credible: trades ≥ max(floor, ceil(rate × eligible years))
    tradesFloor: 4,
    adequateTrades: 10, // sample label: ≥ adequate; sparse below; very sparse < 5
    verySparseTrades: 5,
    localStarts: 4,
    localMovesPerRound: 12,
    localSingleMoves: 8, // of the 12: single-coordinate moves of ±1..3 step units; the other 4 joint ±1-unit moves
    localStallRounds: 2,
    neighbourhoodTop: 8,
    libraryMax: 4,
    libraryPool: 32,
    libraryJaccard: 0.5 // a library alternative's entry sessions: Jaccard distance ≥ this from every earlier pick
  },

  // §7 screening and the exploration reserve
  screening: {
    reserveMax: 6,
    reserveMinIdleShare: 0.5 // share of the candidate's held sessions on which no survivor representative holds
  },

  // §9 the preflight opportunity diagnostic and its frozen material-opportunity criterion (one decision per window)
  diagnostic: {
    materialFold: 3, // actionable opportunities in B4, B5 or C_Rk under either ranking, in a fold window
    materialFinal: 5, // … in the final window
    downscale: 0.25 // an immaterial window: Stage D runs at this share of its budget for both rankings
  },

  // §10 Stage C assembly
  assembly: { topK: 5 },

  // §11 Stage D joint search
  joint: {
    population: 48,
    tournament: 2,
    initialBooks: [2, 8] as const,
    minBooks: 1,
    maxBooks: 12,
    operators: { paramOne: 0.3, paramMulti: 0.15, add: 0.15, remove: 0.12, swap: 0.1, crossover: 0.18 },
    paramOneMaxUnits: 3,
    attemptFactor: 20, // duplicate-avoiding attempts per offspring
    lambda: 2500, // J_pool complexity penalty per book beyond the first
    infeasibleOffset: 1e9, // J_pool of an infeasible configuration: its raw score minus this
    ddPenaltyFrom: 25000,
    ddCeiling: 35000,
    minLots: { 'fold-a': 6, 'fold-b': 8, final: 12 } as Record<WindowKey, number>,
    incumbentMutants: 46, // the B arm: B4 and B5 exact, then 23 mutants of each
    promotionTop: 12,
    promotionSameMembership: 2, // at most this many promoted candidates with one membership set
    promotionKeep: 3,
    refinementMoves: 8, // single-coordinate moves of ±1..3 step units per member
    refinementDelta: 2500,
    refinementCycles: 1
  },

  // §13–§14 gates
  gates: {
    fold: { ddCeiling: 35000, minLots: 3, margin: 5000 }, // F2: V(X) − V(A) ≥ margin at 5 bps and ≥ 0 at 10 bps
    final: {
      materiality: 25000,
      ddCeiling: 35000,
      neighbourhoodShare: 0.75,
      portfolioDailyCeiling: 0.35,
      borrowingProductivity: 0.1, // N4: productivity ≥ A's − 0.1 × |A's|
      minLots: 12,
      minYears: 4,
      costRetention: 0.8,
      top2Share: 0.5
    },
    historical: { tolerance: 10000, ddCeiling: 35000 },
    nominationDraws: 64 // N3: fresh N1 draws (stage `nomination:final:<ranking>`) for B and D
  },

  // §5.1 the parity gate (random pools on fold-a's training data) and §16 the benchmark's projection
  parity: { minRuns: 40, maxRuns: 200, preemptionCoverage: 20, portfolioRuns: 20, windowRuns: 20 },
  benchmark: { safety: 1.5, foldShareMargin: 0.25 },

  sensitivities: ['P1-B250', 'P1-B500'] as const,
  tierRule: { maxWallHours: 8, maxResidentGb: 12 },
  node: 'v24.21.0'
} as const;

export type TierKey = 'T1' | 'T2' | 'T3';

export interface Tier {
  key: TierKey;
  label: string;
  sobol: number; // standalone Sobol vectors per symbol and window
  localRounds: number; // per local start
  standaloneDraws: number; // neighbourhood draws per standalone top candidate
  jointBudget: Record<WindowKey, number>; // configurations per (window, ranking, arm)
  promotionDraws: number; // independent neighbourhood draws A
  assessmentDraws: number; // independent draws B (N1)
  assessmentA2Draws: number; // N1 at double amplitude
}

export const tiers: Record<TierKey, Tier> = {
  T1: {
    key: 'T1',
    label: 'full',
    sobol: 2048,
    localRounds: 10,
    standaloneDraws: 16,
    jointBudget: { 'fold-a': 10000, 'fold-b': 10000, final: 16000 },
    promotionDraws: 32,
    assessmentDraws: 64,
    assessmentA2Draws: 32
  },
  T2: {
    key: 'T2',
    label: 'reduced',
    sobol: 1024,
    localRounds: 8,
    standaloneDraws: 16,
    jointBudget: { 'fold-a': 6000, 'fold-b': 6000, final: 10000 },
    promotionDraws: 32,
    assessmentDraws: 48,
    assessmentA2Draws: 24
  },
  T3: {
    key: 'T3',
    label: 'fallback',
    sobol: 512,
    localRounds: 6,
    standaloneDraws: 12,
    jointBudget: { 'fold-a': 3000, 'fold-b': 3000, final: 5000 },
    promotionDraws: 24,
    assessmentDraws: 32,
    assessmentA2Draws: 16
  }
};

export const tierOrder: TierKey[] = ['T1', 'T2', 'T3'];

// Credible-trade floor of a window: max(floor, ceil(rate × years from the eligibility date to the search end)).
export const minimumTrades = (eligibleYears: number) =>
  Math.max(study.standalone.tradesFloor, Math.ceil(study.standalone.tradesPerYear * eligibleYears - 1e-9));

export const sampleLabel = (trades: number) =>
  trades >= study.standalone.adequateTrades
    ? 'adequate'
    : trades >= study.standalone.verySparseTrades
      ? 'sparse'
      : 'very sparse';
