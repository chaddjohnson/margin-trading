// The diversity-preserving D1 pool-discovery study (research/d1-diverse-pool-discovery): a new, preregistered study of
// which nonempty subsets of the 61-symbol eligible universe, each member with its own eight D1 parameters, trade well
// through ONE causal shared fixed-$100,000 pool — searched with guaranteed per-symbol coverage, arm-preserving and
// chaining-free family formation, an obligatory member-pruning pass, and a time-aware score T compared with the
// neighbourhood score J. Every constant of PROTOCOL.md is declared here so that code and protocol can be compared line
// by line. The neighbourhood instrument, genome operators and attribution periods are the October 25 study's,
// imported unchanged (src/d1-robust/context.ts), as PROTOCOL.md §5 and §9.1 state.
import path from 'node:path';
import { study as robust } from '../d1-robust/context.ts';

export {
  formatDollars,
  formatSigned,
  hasFlag,
  jsonReplacer,
  nowIso,
  option,
  pct,
  readJson,
  writeJson,
  writeText
} from '../portfolio-aware-d1/context.ts';
export { bandOf, candidateUniverse, categories, categoryOf, vanguardIssued } from '../d1-robust/context.ts';
export type { Category, Period } from '../d1-robust/context.ts';

export const researchRoot = 'research/d1-diverse-pool-discovery';
export const resultsRoot = path.join(researchRoot, 'results');
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const contextFile = 'src/d1-diverse/context.ts';
export const reportFile = 'src/d1-diverse/report.ts'; // outside the code manifest (tables only)
export const designCommitmentFile = stageDir('design_commitment.json');
export const changesFile = stageDir('changes-since-commitment.jsonl');
export const protocolFreezeFile = stageDir('protocol_freeze.json');
export const amendmentsFile = stageDir('amendments.jsonl');
export const universeFile = stageDir('audit', 'universe.json');
export const tierFile = stageDir('benchmark', 'tier.json');
export const scheduleFile = stageDir('schedule', 'schedule.json');
export const procedureGateFile = stageDir('walkforward', 'PROCEDURE_GATE.json');
export const frozenSelectionFile = path.join(researchRoot, 'FROZEN_SELECTION.json');
export const evaluationsRoot = 'evaluations/diverse-d1';

// §3 the October 25 study's frozen state (verified by `legacy-check`, never rewritten).
export const legacy = {
  commit: '348f100b',
  researchRoot: 'research/d1-robust-pool-discovery',
  codeManifest: 'd8b9b9002d4ed1176774caaaace9a23f520a77fed31a7dfe344d6241425332ed',
  codeFiles: 376,
  protocol: '5a216c531310068767adf45f7cce97f1673a3c001f791b0e43fcba64e6d6438b',
  context: '18a921f683af06dc7c1f9bddcb6630d314dcbb5fe5bc050dbe18496af99e045a',
  universeFile: 'research/d1-robust-pool-discovery/results/audit/universe.json',
  protectedTrees: [
    'research/d1-robust-pool-discovery',
    'research/joint-16-etf-d1',
    'research/portfolio-aware-d1-optimization',
    'research/d1-robust-design-review',
    'config/phenotypes/D1', // the frozen phenotype JSONs (COMPATIBILITY.md is generated and gains this study's row)
    'config/phenotypes/README.md'
  ],
  controlsFile: 'research/joint-16-etf-d1/results/controls/controls.json'
} as const;

export type WindowKey = 'fold-a' | 'fold-b' | 'final';
export type FoldKey = 'fold-a' | 'fold-b';

export interface RoundWindow {
  key: WindowKey;
  searchEnd: string; // the last date the round's optimizer may read (the loader's endDate)
  validationStart?: string;
  validationEnd?: string;
}

// §6 scores and §8 arms.
export type Score = 'J' | 'T' | 'Q';
export type StartLabel = 'unseeded' | 'seeded';
export type ArmKey = 'J-u' | 'T-u' | 'Q-u' | 'J-s' | 'T-s';

export interface ArmSpec {
  key: ArmKey;
  score: Score;
  start: StartLabel;
}

export const armSpecs: Record<ArmKey, ArmSpec> = {
  'J-u': { key: 'J-u', score: 'J', start: 'unseeded' },
  'T-u': { key: 'T-u', score: 'T', start: 'unseeded' },
  'Q-u': { key: 'Q-u', score: 'Q', start: 'unseeded' },
  'J-s': { key: 'J-s', score: 'J', start: 'seeded' },
  'T-s': { key: 'T-s', score: 'T', start: 'seeded' }
};

export const armsOf = (window: WindowKey): ArmKey[] =>
  window === 'final' ? ['J-u', 'T-u', 'J-s', 'T-s'] : ['J-u', 'T-u', 'Q-u'];

// The kind of arm whose budgets, contracts and shortlist apply.
export type ArmClass = 'final' | 'fold' | 'foldQ';

export const armClassOf = (window: WindowKey, arm: ArmKey): ArmClass =>
  window === 'final' ? 'final' : arm === 'Q-u' ? 'foldQ' : 'fold';

export const study = {
  version: 'diverse-d1-v1',
  seedLabel: 'diverse-d1',
  neighbourWindowLabel: (window: WindowKey) => `diverse-d1:${window}`, // §5: Rng.from('robust-d1', <this>, …)
  firstSession: '2016-01-04',
  eligibilityDate: '2017-06-15',
  trainingLastSession: '2023-12-29',
  lastCommonSession: '2026-10-13',
  rate: 0.11,
  principal: 100000,
  fraction: 0.2,
  costsBps: [0, 2, 5, 10] as const,
  principalCostBps: 5,
  initialCore: { voog: 180000, vgt: 120000 },

  // §4.3
  windows: {
    'fold-a': { key: 'fold-a', searchEnd: '2020-06-30', validationStart: '2020-07-01', validationEnd: '2021-12-31' },
    'fold-b': { key: 'fold-b', searchEnd: '2021-12-31', validationStart: '2022-01-01', validationEnd: '2023-12-29' },
    final: { key: 'final', searchEnd: '2023-12-29' }
  } as Record<WindowKey, RoundWindow>,

  // §4.2 the candidate symbols re-audited (the October 25 study's 64) and the expected outcome
  expectedEligible: 61,
  expectedLateCohort: ['GDXJ', 'OIH'],
  expectedExcluded: ['XLRE'],

  // §5 the instrument (imported unchanged) and the draw batches of this study
  stepUnits: robust.stepUnits,
  amplitudeA2: robust.amplitudeA2,
  fixedMassCoordinates: robust.fixedMassCoordinates,
  // tier-independent draw counts (disc, promo, refine, prune, confirm-A and confirm-B are tier constants, below)
  draws: {
    calib: 64,
    confirmA2: 128,
    confirmN2: 64,
    confirmN3PerMember: 8,
    validation: 64
  },
  stageLabels: [
    'calib',
    'disc',
    'promo',
    'refine',
    'prune',
    'confirm-A',
    'confirm-A-A2',
    'confirm-A-N2',
    'confirm-A-N3',
    'confirm-B',
    'validation'
  ] as const,
  bootstrapResamples: 10000,
  intervalLevel: 0.9,

  // §6 objectives, feasibility and the temporal blocks
  drawdownCeiling: 35000, // F1 (hard), centre, 5 and 10 bps
  portfolioDailyCeiling: 0.35, // F-P (hard)
  portfolioDailyIdeal: 0.3,
  complexityPenalty: 5000, // λ per book
  riskPenalty: robust.riskPenalty, // α_m 1.0, α_t 0.5, floors $35k/$45k, caps $55k/$75k, Q75, ≥ 10 controls, ≥ 4 lots
  strata: robust.strata, // [1, 2, 3, 4, 5, 6, 8, 12, 16]
  blocks: { sessionsPerBlock: 252, minimum: 3 }, // K = max(3, floor(eligible sessions ÷ 252)); ties: equal to the cent

  // §7 reference controls
  controls: {
    strata: [1, 2, 3, 4, 5, 6, 8, 12, 16] as const,
    perStratum: 64,
    eligibleMaxDrawdown: 35000,
    eligibleMinLots: 4,
    parityNeighboursPerStratum: 8,
    shareAboveTolerance: 0.05,
    boundaryMoveTolerance: 0.05,
    activeMinLots: 4
  },

  // §8 library
  library: { sobolSamples: 1024 },

  // §9.1 genome operators and variation constants (the October 25 study's, imported unchanged; genome.ts reads them)
  genome: robust.islands,

  // §9.2 stage A: the quota schedule
  schedule: {
    bands: [
      { key: 'A1', minBooks: 1, maxBooks: 1, passes: 8 },
      { key: 'A2', minBooks: 2, maxBooks: 3, passes: 150 },
      { key: 'A3', minBooks: 4, maxBooks: 6, passes: 150 },
      { key: 'A4', minBooks: 7, maxBooks: 11, passes: 60 },
      { key: 'A5', minBooks: 12, maxBooks: 16, passes: 20 },
      { key: 'A6', minBooks: 17, maxBooks: 24, passes: 8 }
    ]
  },

  // §9.3 stage B: anchored islands
  stageB: { population: 24, fromArchive: 12, randomOthersMax: 5, attemptFactor: 20 },

  // §9.4 stage C: free islands
  stageC: {
    islands: 8,
    population: 48,
    migrationInterval: 8,
    migrants: 4,
    migrantPool: 12,
    attemptFactor: 20,
    stallGenerations: 3,
    randomMaxBooks: 8,
    seededIsland: 8,
    seededMutants: 29
  },

  // §9.5 coverage contracts
  coverage: {
    configurations: { final: 600, fold: 450, foldQ: 440 } as Record<ArmClass, number>,
    vectors: { final: 225, fold: 200, foldQ: 200 } as Record<ArmClass, number>,
    bandMinimum: { A1: 8, A2: 150, A3: 150, A4: 60, A5: 20, A6: 8 } as Record<string, number>,
    coMembers: 55,
    categoryCoOccurrence: 30,
    protectedExamples: { b5Free: 500, withVgt: 100, withoutVgt: 500, withGdx: 100, withoutGdx: 500 }
  },
  b5Members: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const,

  // §10 credible set and leader clustering
  credible: {
    lots: { final: 12, fold: 8, foldQ: 8 } as Record<ArmClass, number>,
    years: { final: 3, fold: 2, foldQ: 2 } as Record<ArmClass, number>
  },
  closeness: { jaccardDistance: 0.5, fundedOverlap: 0.5, regimeCorrelation: 0.7 },
  searchFamiliesMinimum: 3, // §14.4 category (a)

  // §11 promotion
  shortlist: {
    final: ['Q1', 'Q2', 'Q3', 'compact', 'medium', 'broad', 'incumbent-free', 'far'],
    fold: ['Q1', 'Q2', 'compact', 'incumbent-free', 'far', 'Q3'],
    foldQ: ['Q1', 'Q2', 'compact', 'far']
  } as Record<ArmClass, readonly string[]>,
  slotRules: { compactMax: 3, mediumMin: 4, mediumMax: 6, broadMin: 7, farJaccard: 0.75 },
  promotion: { membersPerFamily: 3, attemptsPerSlot: 3 },

  // §12 refinement, pruning, re-refinement
  refinement: { acceptance: 5000, swapTargets: 4, pairMoves: 32, jointMoves: 16, maxCycles: 3 },
  prune: { lowerQuantile: 0.05 }, // the paired-bootstrap interval used by pruning is 1 − 2 × 0.05 = 90%

  // §13 assessment
  assessment: {
    portfolioNeighbours: 16,
    tiePermutations: 2,
    ladderFractions: [0.1, 0.15, 0.2, 0.25, 0.3] as const,
    pboTop: 1000,
    pboBlocks: [8, 16] as const
  },

  // §14–§15 gates
  gates: {
    finalPoolLots: 12,
    finalPoolYears: 3,
    foldPoolLots: 8,
    foldPoolYears: 2,
    memberStandardTrades: 3,
    memberStandardLots: 2,
    memberStandardRegimes: 2,
    costRetention: 0.8,
    tieOrderChange: 25000,
    materiality: 25000,
    conditionalMateriality: 50000,
    boundaryShare: 0.25,
    nominationJaccard: 0.5,
    compactNominee: 3
  },
  procedureGate: {
    medianQuantile: 0.5,
    upperQuantile: 0.75,
    validationDrawdown: 45000,
    minimumControls: 20,
    nullPassProbability: 0.1875
  },

  // §16 blocking-only historical check
  confirmation: { reverseVersusB4: -2500 },

  // §17 capacity and dividend bounds
  capacity: robust.capacity, // participation 0.10, delayed share 0.10, delay 2 minutes, window 5 minutes
  dividendBoundYields: [0.01, 0.03, 0.06] as const,

  // §18 parity
  parity: { subsetSizes: [2, 4, 8, 12, 16, 24, 32] as const, subsetsPerSize: 3, lookaheadPools: 12 },
  determinism: { stageBEvaluations: 2000 },

  // §19 tier rule and resources
  tierRule: { maxWallHours: 20, maxResidentGb: 13 },
  memoryAbortGb: 14,
  node: 'v24.21.0'
} as const;

// §19 the compute tiers.
// §5 every random stream of the study, as Rng.from(<prefix>, …labels). Neighbour patterns use the October 25 study's
// generator with this study's window label; per-configuration resampling streams (bootstraps, tie orders) are keyed by
// the configuration they resample, never by an outcome.
export const seedLabels = {
  neighbourPatterns: "Rng.from('robust-d1', 'diverse-d1:<window>', stage, class, draw)",
  library: "deriveSeed('diverse-d1', 'library', 'sobol-scramble')",
  schedule:
    "('diverse-d1', 'schedule', band, pass) and ('diverse-d1', 'schedule', band, pass, 'fill'); vectors ('diverse-d1', 'schedule', 'vectors', symbol)",
  controls:
    "('diverse-d1', 'control-config', stratum, index); machinery parity ('diverse-d1', window, 'controls-parity')",
  stageB:
    "('diverse-d1', window, 'stageB', start, symbol); seeds ('diverse-d1', window, 'stageB-seeds', start, symbol)",
  stageC:
    "('diverse-d1', window, 'stageC', start, island); seeds ('diverse-d1', window, 'stageC-seeds', start, island)",
  migration: "('diverse-d1', window, 'migration', start, generation)",
  refinement: "('diverse-d1', window, 'refine', arm, family, cycle | 're-refine')",
  pruneBootstrap: "('diverse-d1', window, 'prune-bootstrap', configuration key, member)",
  assessmentBootstraps:
    "('diverse-d1', window, 'bootstrap', 'confirm-A' | 'paired' | 'runner-up' | 'confirm-B', …keys)",
  tieOrders: "('diverse-d1', window, 'ties', configuration key, index)",
  benchmark: "('diverse-d1', 'benchmark', label); parity ('diverse-d1', 'parity', …)"
} as const;

// §2.10 the inspected, non-advancing references (never seeds, candidates or nominees; a near-copy is barred, §15.3).
export const inspectedReferences = {
  r1r4: 'research/joint-16-etf-d1/results/robust/robust.json (verified against its FROZEN_SELECTION.json)',
  october25Finalist: 'research/d1-robust-pool-discovery/results/final/pooled/assessment.json'
} as const;

export type TierKey = 'E' | 'F' | 'R';

export interface Tier {
  key: TierKey;
  label: string;
  stageB: Record<ArmClass, number>; // fresh configurations per anchored island
  stageC: Record<ArmClass, number>; // fresh configurations per free island
  discDraws: number;
  promoDraws: number;
  promoMembers: number;
  refineDraws: number;
  refineCap: Record<ArmClass, number>;
  pruneDraws: number;
  confirmDraws: number;
}

export const tiers: Record<TierKey, Tier> = {
  E: {
    key: 'E',
    label: 'extended',
    stageB: { final: 400, fold: 200, foldQ: 60 },
    stageC: { final: 2000, fold: 1000, foldQ: 300 },
    discDraws: 16,
    promoDraws: 96,
    promoMembers: 3,
    refineDraws: 48,
    refineCap: { final: 800, fold: 500, foldQ: 300 },
    pruneDraws: 128,
    confirmDraws: 256
  },
  F: {
    key: 'F',
    label: 'reduced',
    stageB: { final: 300, fold: 150, foldQ: 60 },
    stageC: { final: 1200, fold: 600, foldQ: 200 },
    discDraws: 16,
    promoDraws: 96,
    promoMembers: 3,
    refineDraws: 48,
    refineCap: { final: 600, fold: 400, foldQ: 300 },
    pruneDraws: 128,
    confirmDraws: 256
  },
  R: {
    key: 'R',
    label: 'fallback',
    stageB: { final: 210, fold: 80, foldQ: 50 },
    stageC: { final: 600, fold: 300, foldQ: 150 },
    discDraws: 12,
    promoDraws: 64,
    promoMembers: 2,
    refineDraws: 32,
    refineCap: { final: 400, fold: 300, foldQ: 200 },
    pruneDraws: 96,
    confirmDraws: 192
  }
};

export const tierOrder: TierKey[] = ['E', 'F', 'R'];

export const log = (line: string) => console.info(`[diverse-d1] ${line}`);
