// The joint 16-ETF D1 study (research/joint-16-etf-d1): which nonempty subset of the 16 ETF datasets, each member with
// its own eight D1 parameters, gives the best robust result as ONE causally simulated shared-margin pool? Membership and
// parameters are optimized jointly; no book is mandatory. Every constant of PROTOCOL.md is declared here, so the code
// and the protocol can be compared line by line.
import path from 'node:path';

export {
  formatCents,
  formatDate,
  formatDollars,
  formatSigned,
  formatTime,
  hasFlag,
  jsonReplacer,
  nowIso,
  option,
  pct,
  readJson,
  writeJson,
  writeText
} from '../portfolio-aware-d1/context.ts';

export const researchRoot = 'research/joint-16-etf-d1';
export const resultsRoot = path.join(researchRoot, 'results');
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const protocolFreezeFile = stageDir('protocol_freeze.json');
export const frozenSelectionFile = path.join(researchRoot, 'FROZEN_SELECTION.json');
export const postStudyDir = 'evaluations/joint-16-etf-d1';

// The universe: all 16 ETF datasets, alphabetically (the genome's bit order).
export const universe = [
  'EWZ',
  'GDX',
  'GLD',
  'IWM',
  'IWN',
  'KRE',
  'TLT',
  'VGT',
  'VOOG',
  'XBI',
  'XLE',
  'XLF',
  'XLU',
  'XLY',
  'XOP',
  'XRT'
] as const;
export type Etf = (typeof universe)[number];
export const isEtf = (value: string): value is Etf => universe.includes(value as Etf);

// The benchmark books (comparison runs only, never mandatory members) and the previous study's manifest.
export const benchmarkMembers = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;
export const previousManifestFile = 'research/portfolio-aware-d1-optimization/FROZEN_SELECTION.json';
export const previousEvaluationFile = 'research/portfolio-aware-d1-optimization/results/evaluation/evaluation.json';
export const eightEtfManifestFile = 'research/multi-etf-d1/FROZEN_CANDIDATES.json';

export interface Period {
  key: string;
  label: string;
  start: string; // inclusive New York dates
  end: string;
}

export const study = {
  version: 'joint-16-etf-d1-v1',
  seedLabel: 'joint-16-etf-d1',
  eligibilityDate: '2017-06-15',
  trainingEnd: '2023-12-31',
  expectedLastCommonSession: '2026-10-13',
  rate: 0.11,
  principal: 100000,
  costsBps: [0, 2, 5, 10] as const,
  principalCostBps: 5,
  drawdownCeiling: 35000,
  fraction: 0.2,

  // §5 the per-ETF vector library (the same vectors for all 16 ETFs)
  library: {
    sobolSamples: 1024
  },

  // §4 periods (training only; attribution = mark at the period's last close − mark at the close before it)
  folds: [
    { key: 'F1', label: '2017-06-15 → 2019-12-31', start: '2017-06-15', end: '2019-12-31' },
    { key: 'F2', label: '2020 → 2021', start: '2020-01-01', end: '2021-12-31' },
    { key: 'F3', label: '2022 → 2023', start: '2022-01-01', end: '2023-12-31' }
  ] as Period[],
  regimes: [
    { key: 'R1', label: 'late-2017 calm bull', start: '2017-06-15', end: '2018-01-25' },
    { key: 'R2', label: 'Feb 2018 volatility shock', start: '2018-01-26', end: '2018-04-30' },
    { key: 'R3', label: 'mid-2018', start: '2018-05-01', end: '2018-09-30' },
    { key: 'R4', label: 'Q4 2018 sell-off', start: '2018-10-01', end: '2018-12-31' },
    { key: 'R5', label: '2019 trade-war dips', start: '2019-01-01', end: '2019-12-31' },
    { key: 'R6', label: 'early 2020', start: '2020-01-01', end: '2020-02-18' },
    { key: 'R7', label: 'COVID crash and first rebound', start: '2020-02-19', end: '2020-04-30' },
    { key: 'R8', label: '2020 recovery', start: '2020-05-01', end: '2020-12-31' },
    { key: 'R9', label: '2021', start: '2021-01-01', end: '2021-12-31' },
    { key: 'R10', label: '2022 bear market', start: '2022-01-01', end: '2022-10-31' },
    { key: 'R11', label: 'late-2022 rebound', start: '2022-11-01', end: '2023-02-28' },
    { key: 'R12', label: '2023 regional-bank stress', start: '2023-03-01', end: '2023-05-31' },
    { key: 'R13', label: '2023 H2 (rate sell-off)', start: '2023-06-01', end: '2023-12-31' }
  ] as Period[],
  years: [2017, 2018, 2019, 2020, 2021, 2022, 2023] as const,

  // §6 discovery
  complexityPenalty: 5000, // λ: dollars of training net per book in every scalar score
  greedy: {
    startVectors: 8, // K0 library vectors tried for the starting singleton
    stepVectors: 3, // K library vectors tried for each inactive ETF at each step
    minGain: 5000 // a step is accepted only if net rises by at least λ
  },
  islands: {
    count: 8,
    populationSize: 64,
    evaluationsPerIsland: 3072, // unique new evaluations, initial population included
    migrationInterval: 8, // generations
    migrants: 4,
    attemptFactor: 20, // at most 20 × population child attempts per generation
    stallGenerations: 3, // an island stops after this many generations without a new unique child
    crossoverProbability: 0.9,
    crossoverEta: 15,
    mutationEta: 20,
    sbxOnSharedProbability: 0.5,
    addLatentProbability: 0.5,
    operators: {
      add: 0.15,
      remove: 0.15,
      swap: 0.1,
      paramOne: 0.25,
      paramMulti: 0.15,
      reset: 0.1,
      crossoverOnly: 0.1
    },
    kinds: [
      { key: 'I1', label: 'uniform cardinality 1–16 (a)', minBooks: 1, maxBooks: 16 },
      { key: 'I2', label: 'uniform cardinality 1–16 (b)', minBooks: 1, maxBooks: 16 },
      { key: 'I3', label: 'sparse 1–3', minBooks: 1, maxBooks: 3 },
      { key: 'I4', label: 'medium 4–8', minBooks: 4, maxBooks: 8 },
      { key: 'I5', label: 'broad 10–16', minBooks: 10, maxBooks: 16 },
      { key: 'I6', label: 'singletons (16 ETFs × 4 vectors)', minBooks: 1, maxBooks: 1 },
      { key: 'I7', label: 'greedy-path seeded', minBooks: 1, maxBooks: 16 },
      {
        key: 'I8',
        label: 'benchmark seeded (B1, B4, B5 and one-move mutants; half uniform)',
        minBooks: 1,
        maxBooks: 16
      }
    ]
  },

  // §7 joint refinement
  refinement: {
    contenders: 6,
    evaluationsPerContender: 2500,
    jaccardDistance: 0.5,
    compactBooks: 4,
    broadBooks: 9,
    addVectors: 3, // uniform library vectors per inactive ETF in the membership pass
    swapVectors: 1,
    jointMoves: 32,
    improvement: 100
  },

  // §8 robustness battery and shortlist
  robustness: {
    shortlist: 20,
    extraArchive: 8,
    jointPerturbations: 48,
    jointMagnitudes: {
      targetPercentChange: 5,
      trailingBuyPercentage: 1,
      trailingStopPercentage: 5,
      maximumHoldDays: 1,
      tickWindowSize: 5,
      intradayLossBuffer: 5,
      pullback: 5,
      continuationWindow: 10
    } as Record<string, number>,
    tiePermutations: 2, // seeded random tie orders, besides reverse alphabetical
    ladderFractions: [0.1, 0.15, 0.2, 0.25, 0.3] as const
  },

  // §9 training gates
  gates: {
    costRetention: 0.85, // net@10 ≥ 0.85 × net@5
    minFoldsPositive: 2,
    plateauFeasibleShare: 0.75,
    probeMedianShare: 0.85,
    jointMedianShare: 0.75,
    benchmarkMargin: 25000,
    conditionalBenchmarkMargin: 50000, // when the training portfolio daily % DD is in (30%, 35%]
    netPerDrawdownShare: 0.9,
    percentDrawdownIdeal: 0.3,
    percentDrawdownCeiling: 0.35
  },

  // §9 selection score
  score: {
    regimeBonus: 1500 // dollars per training regime with positive attributed net
  },

  // §10 post-freeze acceptance (fixed, against B5 unless stated)
  acceptance: {
    postTrainingMargin: 15000,
    conditionalPostTrainingMargin: 25000, // when the full-`all` portfolio daily % DD is in (30%, 35%]
    reverseThreshold: -2500,
    persistThreshold: 2500
  },

  // §11 parity
  parity: {
    subsetSizes: [2, 4, 8, 12, 16] as const,
    subsetsPerSize: 4
  }
} as const;

export const log = (line: string) => console.info(`[joint-16-etf-d1] ${line}`);
