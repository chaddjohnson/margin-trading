// The portfolio-aware D1 optimization study (research/portfolio-aware-d1-optimization): can a D1 book on a further
// ETF, with its eight parameters chosen standalone-first (Track S) or for its incremental executable effect on the
// shared pool (Track P), improve the frozen All-lowDd shadow allocator? Every constant of PROTOCOL.md is declared
// here, so the code and the protocol can be compared line by line.
import path from 'node:path';
import fs from 'fs-extra';

export const researchRoot = 'research/portfolio-aware-d1-optimization';
export const resultsRoot = path.join(researchRoot, 'results');
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const protocolFreezeFile = stageDir('protocol_freeze.json');
export const frozenSelectionFile = path.join(researchRoot, 'FROZEN_SELECTION.json');

export const primaryCandidates = ['GDX', 'XOP', 'EWZ', 'TLT'] as const;
export const secondaryCandidates = ['XLE', 'XLU', 'GLD'] as const;
export const candidates = [...primaryCandidates, ...secondaryCandidates] as const;
export type Candidate = (typeof candidates)[number];
export const isCandidate = (value: string): value is Candidate => candidates.includes(value as Candidate);

export const baselineBooks = ['VGT', 'XBI', 'XRT', 'KRE'] as const;
export const removableBooks = ['XBI', 'XRT', 'KRE'] as const;

export type Track = 'S' | 'P';

export interface Period {
  key: string;
  label: string;
  start: string; // inclusive New York dates
  end: string;
}

export const study = {
  version: 'portfolio-aware-d1-v1',
  eligibilityDate: '2017-06-15',
  trainingEnd: '2023-12-31',
  expectedLastCommonSession: '2026-10-13',
  rate: 0.11,
  principal: 100000,
  costsBps: [0, 2, 5, 10] as const,
  principalCostBps: 5,
  drawdownCeiling: 35000,

  // §4.2 the common pool
  pool: {
    sobolSamples: 512,
    seedLabels: ['portfolio-aware-d1', 'common-pool', 'sobol-scramble'] as const
  },

  // §4.4 periods
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
  episodeGapSessions: 20, // a new episode of a book's funded lots starts ≥ 20 sessions after the previous exit

  // §4.6 feasibility (5 bps)
  feasibility: {
    S: { minTrades: 8, minYears: 3 },
    P: { minLots: 5, minYears: 3 }
  },

  // §4.7 choosing the ETFs for the deeper search
  finalists: {
    minPositiveFeasible: 3,
    topN: 10,
    weights: { potential: 0.4, breadth: 0.2, cost: 0.2, standalone: 0.2 },
    tieMargin: 0.05,
    priorityOrder: ['GDX', 'XOP', 'EWZ', 'TLT'] as const,
    maxFinalists: 3
  },

  // §5.2 the search
  search: {
    populationSize: 48,
    crossoverProbability: 0.9,
    crossoverEta: 15,
    mutationEta: 20,
    maxNewVectors: 1000,
    maxGenerations: 40,
    earlyStopPatience: 8,
    earlyStopTolerance: 1e-4,
    seedDiversity: 0.02
  },

  // §5.3 robust selection
  selection: {
    shortlist: 20,
    extendedShortlist: 40,
    minFoldsPositive: 2,
    plateauFeasibleShare: 0.75,
    plateauMedianShare: 0.5,
    riskEfficiencyShare: 0.95
  },
  probeOffsets: {
    targetPercentChange: [-10, -5, 5, 10],
    trailingBuyPercentage: [-2, -1, 1, 2],
    trailingStopPercentage: [-10, -5, 5, 10],
    maximumHoldDays: [-2, -1, 1, 2],
    tickWindowSize: [-10, -5, 5, 10],
    intradayLossBuffer: [-10, -5, 5, 10],
    pullback: [-10, -5, 5, 10],
    continuationWindow: [-20, -10, 10, 20]
  } as Record<string, number[]>,

  // §6 Stage C
  stageC: {
    maxConfigurations: 8,
    maxAdditions: 4,
    maxSubstitutions: 2,
    substitutionMinConflicts: 3,
    substitutionMargin: 5000,
    combinationMaxOverlap: 0.25,
    combinationMargin: 5000,
    coRefinementMaxVectors: 300,
    ladderFractions: [0.1, 0.15, 0.2, 0.25] as const,
    fraction: 0.2
  },

  // §6.1 training advancement gates
  gates: {
    fixedMateriality: 15000,
    netPerDrawdownShare: 0.95,
    minLots: 5,
    minYears: 3,
    minFoldsPositive: 2,
    portfolioMateriality: 0.02,
    percentDrawdownCeiling: 0.35,
    dailyPercentTolerance: 0.01,
    minutePercentTolerance: 0.02
  },

  // §7 post-freeze acceptance
  acceptance: {
    persistThreshold: 2500,
    reverseThreshold: -2500
  },

  // §3 E3 parity set: per candidate, the controls plus these pool-derived vectors.
  parity: { extremes: 6, firstPool: 6 }
} as const;

// ----- helpers -----

export const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

export const hasFlag = (args: string[], name: string) => args.includes(`--${name}`);

export const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T;

export const jsonReplacer = (_key: string, value: unknown) =>
  typeof value === 'number' && !Number.isFinite(value) ? (Number.isNaN(value) ? null : String(value)) : value;

export const writeJson = async (file: string, value: unknown) =>
  fs.outputFile(file, `${JSON.stringify(value, jsonReplacer, 1)}\n`);

export const writeText = async (file: string, text: string) =>
  fs.outputFile(file, text.endsWith('\n') ? text : `${text}\n`);

export const formatDollars = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const formatSigned = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : '+'}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const formatCents = (value: number) =>
  Number.isFinite(value)
    ? `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'n/a';

export const pct = (fraction: number, digits = 1) =>
  Number.isFinite(fraction) ? `${(fraction * 100).toFixed(digits)}%` : 'n/a';

export const formatDate = (timestamp: number) =>
  Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString().slice(0, 10) : '';

export const formatTime = (timestamp: number) =>
  Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z' : '';

export const log = (line: string) => console.info(`[portfolio-aware-d1] ${line}`);

export const nowIso = () => new Date().toISOString();
