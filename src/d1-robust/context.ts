// The robust D1 pool-discovery study (research/d1-robust-pool-discovery): which nonempty subsets of an expanded,
// integrity-gated ETF universe, each member with its own eight D1 parameters, give stable net profit through ONE causal
// shared fixed-$100,000 pool — ranked by a risk-aware neighbourhood score, not by a peak — and does that selection
// procedure persist forward inside training? Every constant of PROTOCOL.md is declared here, so the code and the
// protocol can be compared line by line.
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

export const researchRoot = 'research/d1-robust-pool-discovery';
export const resultsRoot = path.join(researchRoot, 'results');
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const contextFile = 'src/d1-robust/context.ts';
export const draftCommitmentFile = stageDir('protocol_draft_commitment.json');
export const protocolFreezeFile = stageDir('protocol_freeze.json');
export const amendmentsFile = stageDir('amendments.jsonl');
export const universeFile = stageDir('audit', 'universe.json');
export const tierFile = stageDir('benchmark', 'tier.json');
export const frozenSelectionFile = path.join(researchRoot, 'FROZEN_SELECTION.json');
export const evaluationsRoot = 'evaluations/robust-d1';
export const retrospectiveRoot = path.join(evaluationsRoot, 'retrospective');

// §3.2 the candidate universe, planned before ingestion. Categories are a coverage and stratification tool only.
export const categories = ['sector-industry', 'factor-size', 'non-us', 'rates-credit', 'real-assets'] as const;
export type Category = (typeof categories)[number];

export const existingSymbols = [
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

export const tier1Symbols = [
  'XLV',
  'XLP',
  'XLI',
  'XLB',
  'XLRE',
  'XLK',
  'SMH',
  'XHB',
  'XME',
  'KBE',
  'IWD',
  'IWF',
  'VIG',
  'USMV',
  'MTUM',
  'IJR',
  'RSP',
  'EFA',
  'VGK',
  'EEM',
  'FXI',
  'EWJ',
  'IEF',
  'EDV',
  'LQD',
  'HYG',
  'SLV',
  'DBC'
] as const;

export const tier2Symbols = [
  'VPU',
  'IBB',
  'OIH',
  'IGV',
  'IYT',
  'KIE',
  'QUAL',
  'SPLV',
  'IJH',
  'IEMG',
  'EWY',
  'INDA',
  'EWW',
  'ILF',
  'SHY',
  'TIP',
  'EMB',
  'AGG',
  'IAU',
  'GDXJ'
] as const;

export const categoryOf: Record<string, Category> = {
  ...Object.fromEntries(
    [
      'XLV',
      'XLP',
      'XLI',
      'XLB',
      'XLRE',
      'XLK',
      'SMH',
      'XHB',
      'XME',
      'KBE',
      'VGT',
      'XBI',
      'XRT',
      'KRE',
      'XLE',
      'XLF',
      'XLU',
      'XLY',
      'XOP',
      'VPU',
      'IBB',
      'OIH',
      'IGV',
      'IYT',
      'KIE'
    ].map((symbol) => [symbol, 'sector-industry'])
  ),
  ...Object.fromEntries(
    ['IWD', 'IWF', 'VIG', 'USMV', 'MTUM', 'IJR', 'RSP', 'IWM', 'IWN', 'VOOG', 'QUAL', 'SPLV', 'IJH'].map((symbol) => [
      symbol,
      'factor-size'
    ])
  ),
  ...Object.fromEntries(
    ['EFA', 'VGK', 'EEM', 'FXI', 'EWJ', 'EWZ', 'IEMG', 'EWY', 'INDA', 'EWW', 'ILF'].map((symbol) => [symbol, 'non-us'])
  ),
  ...Object.fromEntries(
    ['IEF', 'EDV', 'LQD', 'HYG', 'TLT', 'SHY', 'TIP', 'EMB', 'AGG'].map((symbol) => [symbol, 'rates-credit'])
  ),
  ...Object.fromEntries(['SLV', 'DBC', 'GLD', 'GDX', 'GDXJ', 'IAU'].map((symbol) => [symbol, 'real-assets']))
} as Record<string, Category>;

// The full candidate universe, alphabetically: the CRN step patterns are drawn over all of it (§4.2), so a symbol's
// pattern never depends on which symbols turned out eligible.
export const candidateUniverse = [...existingSymbols, ...tier1Symbols, ...tier2Symbols].sort();

// §17 Vanguard-issued books: the brokerage-constraint label.
export const vanguardIssued = ['VOOG', 'VGT', 'VIG', 'VGK', 'EDV', 'VPU'] as const;

export interface Period {
  key: string;
  label: string;
  start: string; // inclusive New York dates
  end: string;
}

export type WindowKey = 'fold-a' | 'fold-b' | 'final';
export type FoldKey = 'fold-a' | 'fold-b';

export interface RoundWindow {
  key: WindowKey;
  searchEnd: string; // the last date the round's optimizer may read (the loader's endDate)
  validationStart?: string;
  validationEnd?: string;
}

export const study = {
  version: 'robust-d1-v1',
  seedLabel: 'robust-d1',
  firstSession: '2016-01-04',
  eligibilityDate: '2017-06-15',
  trainingEnd: '2023-12-31',
  trainingLastSession: '2023-12-29',
  lastCommonSession: '2026-10-13',
  holdoutEnd: '2025-10-16',
  rate: 0.11,
  principal: 100000,
  fraction: 0.2,
  costsBps: [0, 2, 5, 10] as const,
  principalCostBps: 5,
  initialCore: { voog: 180000, vgt: 120000 },

  // §3.5
  windows: {
    'fold-a': { key: 'fold-a', searchEnd: '2020-06-30', validationStart: '2020-07-01', validationEnd: '2021-12-31' },
    'fold-b': { key: 'fold-b', searchEnd: '2021-12-31', validationStart: '2022-01-01', validationEnd: '2023-12-29' },
    final: { key: 'final', searchEnd: '2023-12-31' }
  } as Record<WindowKey, RoundWindow>,
  foldA0: 'not run (decided before any search)',

  // §3.5 attribution periods (clipped to each search window)
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

  // §3.3 ingestion
  ingestion: {
    start: '2016-01-04',
    end: '2026-10-13',
    maxAttempts: 4,
    retryWaitsSeconds: [30, 60, 120],
    credentialNames: ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY'] as const
  },

  // §3.4 eligibility
  eligibility: {
    expectedFirstDate: '2016-01-04',
    expectedLastDate: '2026-10-13',
    minimumMedianDollarVolume: 10_000_000,
    minimumMedianCoverage: 0.25,
    auditGapThreshold: 0.15 // overnight moves beyond ±15% listed in the audit (the verifier's split rule is 30%)
  },

  // §4 the neighbourhood instrument (grid units of the existing D1 box)
  stepUnits: {
    targetPercentChange: 5,
    trailingBuyPercentage: 1,
    trailingStopPercentage: 5,
    maximumHoldDays: 1,
    tickWindowSize: 5,
    intradayLossBuffer: 5,
    pullback: 5,
    continuationWindow: 10
  } as Record<string, number>,
  amplitudeA2: 2,
  fixedMassCoordinates: 3, // N2
  stageLabels: [
    'pilot',
    'pilot-A2',
    'pilot-N2',
    'pilot-N3',
    'disc',
    'promo',
    'refine',
    'confirm-A',
    'confirm-A-A2',
    'confirm-A-N2',
    'confirm-A-N3',
    'confirm-B',
    'validation'
  ] as const,
  bootstrapResamples: 10000,
  intervalLevel: 0.9,

  // §6 objective and risk
  drawdownCeiling: 35000, // F1, centre, 5 and 10 bps (hard)
  portfolioDailyCeiling: 0.35, // F-P (hard)
  portfolioDailyIdeal: 0.3,
  complexityPenalty: 5000, // λ per book
  riskPenalty: {
    alphaMedian: 1.0,
    alphaTail: 0.5,
    floorMedian: 35000,
    floorTail: 45000,
    capMedian: 55000,
    capTail: 75000,
    quantile: 0.75,
    minimumControls: 10,
    eligibleControlMinimumLots: 4
  },
  strata: [1, 2, 3, 4, 5, 6, 8, 12, 16] as const,

  // §7 pilot
  pilot: {
    draws: { A1: 64, A2: 64, N2: 32, N3PerMember: 8 },
    subsamples: 10000,
    persistenceSplit: '2021-12-31',
    persistenceMargin: 0.1,
    shareAboveTolerance: 0.05,
    boundaryMoveTolerance: 0.05,
    parityNeighboursPerStratum: 8
  },

  // §8 library
  library: { sobolSamples: 1024 },

  // §9 discovery
  islands: {
    count: 8,
    populationSize: 48,
    migrationInterval: 8,
    migrants: 4,
    migrantPool: 12,
    attemptFactor: 20,
    stallGenerations: 3,
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
      { key: 'I5', label: 'broad 9–16', minBooks: 9, maxBooks: 16 },
      { key: 'I6', label: 'category-stratified 2–5', minBooks: 2, maxBooks: 5 },
      { key: 'I7', label: 'singletons (48 distinct symbols)', minBooks: 1, maxBooks: 1 },
      {
        key: 'I8',
        label: 'arm-specific (unseeded: uniform 2–6; seeded: B1/B4/B5 and mutants)',
        minBooks: 2,
        maxBooks: 6
      }
    ],
    seededMutants: 29
  },
  budgetBase: 16000, // configurations per final-round arm at |U| ≤ 40
  budgetUniverseScale: 40,
  coverage: { configurations: 400, vectors: 150, topUpShare: 0.15, topUpMax: 1000, topUpMin: 100, topUpPopulation: 32 },

  // §10 promotion
  promotion: {
    maxFamilies: 8,
    jaccardDistance: 0.5,
    fundedOverlap: 0.5,
    regimeCorrelation: 0.7,
    compactBooks: 3,
    farFromB5: 0.75,
    tieMargin: 12500
  },

  // §11 refinement
  refinement: {
    acceptance: 5000, // δ
    swapTargets: 4,
    pairMoves: 32,
    jointMoves: 16,
    maxCycles: 3
  },

  // §12–§14 assessment and gates
  assessment: {
    a2Draws: 128,
    n2Draws: 64,
    n3PerMember: 8,
    portfolioNeighbours: 16,
    tiePermutations: 2,
    ladderFractions: [0.1, 0.15, 0.2, 0.25, 0.3] as const,
    pboTop: 1000,
    pboBlocks: [8, 16] as const,
    validationDraws: 64
  },
  gates: {
    finalPoolLots: 12,
    finalPoolYears: 3,
    foldPoolLots: 8,
    foldPoolYears: 2,
    memberStandardTrades: 3,
    memberStandardLots: 2,
    memberStandardRegimes: 2,
    costRetention: 0.8,
    materiality: 25000,
    conditionalMateriality: 50000,
    boundaryShare: 0.25,
    validationDrawdown: 45000,
    upperControlQuantile: 0.75,
    lowerControlQuantile: 0.25,
    nominationJaccard: 0.5,
    compactNominee: 3
  },

  // §15 locked confirmation
  confirmation: { reverseVersusB4: -2500 },

  // §17 capacity
  capacity: { participation: 0.1, delayedShare: 0.1, delayMinutes: 2, windowMinutes: 5 },

  // §18 parity
  parity: {
    subsetSizes: [2, 4, 8, 12, 16, 24] as const,
    subsetsPerSize: 3
  },

  // §19 compute tiers and the selection rule
  tierRule: { maxWallHours: 20, maxResidentGb: 13 },
  node: 'v24.21.0'
} as const;

export type TierKey = 'E' | 'F' | 'R';

export interface Tier {
  key: TierKey;
  label: string;
  finalBudget: (universeSize: number) => number;
  foldBudget: (universeSize: number) => number;
  seededArmInFinal: boolean;
  nDiscoveryCandidates: readonly number[];
  seTarget: number;
  promotionTop: number;
  promotionDraws: number;
  refineFamilies: { final: number; fold: number };
  refineDraws: number;
  refineCap: { final: number; fold: number };
  confirmDraws: number;
  pilotPerStratum: number;
}

const roundThousand = (value: number) => Math.round(value / 1000) * 1000;

export const scaledBudget = (universeSize: number) =>
  roundThousand(study.budgetBase * Math.max(1, universeSize / study.budgetUniverseScale));

export const tiers: Record<TierKey, Tier> = {
  E: {
    key: 'E',
    label: 'extended (larger independent draws)',
    finalBudget: scaledBudget,
    foldBudget: (n) => roundThousand(scaledBudget(n) / 2),
    seededArmInFinal: true,
    nDiscoveryCandidates: [12, 16, 24],
    seTarget: 12500,
    promotionTop: 300,
    promotionDraws: 96,
    refineFamilies: { final: 6, fold: 4 },
    refineDraws: 48,
    refineCap: { final: 800, fold: 500 },
    confirmDraws: 256,
    pilotPerStratum: 40
  },
  F: {
    key: 'F',
    label: 'Fable full',
    finalBudget: scaledBudget,
    foldBudget: (n) => roundThousand(scaledBudget(n) / 2),
    seededArmInFinal: true,
    nDiscoveryCandidates: [8, 12, 16],
    seTarget: 15000,
    promotionTop: 300,
    promotionDraws: 64,
    refineFamilies: { final: 6, fold: 4 },
    refineDraws: 32,
    refineCap: { final: 800, fold: 500 },
    confirmDraws: 128,
    pilotPerStratum: 40
  },
  R: {
    key: 'R',
    label: 'fallback',
    finalBudget: () => 10000,
    foldBudget: () => 5000,
    seededArmInFinal: false,
    nDiscoveryCandidates: [8, 12, 16],
    seTarget: 15000,
    promotionTop: 150,
    promotionDraws: 64,
    refineFamilies: { final: 4, fold: 3 },
    refineDraws: 32,
    refineCap: { final: 500, fold: 300 },
    confirmDraws: 128,
    pilotPerStratum: 20
  }
};

export const tierOrder: TierKey[] = ['E', 'F', 'R'];

// §6.2 the cardinality band of a configuration (the pilot stratum whose calibration it uses).
export const bandOf = (books: number) => {
  if (books < 1 || !Number.isInteger(books)) {
    throw new Error(`A configuration has ${books} books`);
  }

  let band: number = study.strata[0];

  for (const stratum of study.strata) {
    if (books >= stratum) {
      band = stratum;
    }
  }

  return band;
};

export const log = (line: string) => console.info(`[robust-d1] ${line}`);
