// Study 5 constants, mirrored from research/study5-gdx-d1-b5-three-etf-2026-10/PROTOCOL.md (section numbers in the
// comments). Nothing here reads data.
import path from 'node:path';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';

export const studyName = 'study5-gdx-b5-3etf';
export const studyDir = 'research/study5-gdx-d1-b5-three-etf-2026-10';
export const resultsDir = path.join(studyDir, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsDir, ...parts);
export const protocolFile = path.join(studyDir, 'PROTOCOL.md');
export const protocolFreezeFile = resultFile('protocol_freeze.json');
export const frozenSelectionFile = path.join(studyDir, 'FROZEN_SELECTION.json');
export const doorsLog = resultFile('doors.jsonl');
export const codeDir = 'src/study5-gdx-b5-three-etf';

// §1 / §2 execution (unchanged frozen B5 conventions)
export const execution = {
  principal: 100000,
  rate: 0.11,
  costBps: 5,
  stopFill: 'stop' as const,
  stopSlippageBps: 0,
  eligibilityDate: '2017-06-15',
  drawdownCeiling: 35000
};

// §3.2 periods (New York dates, inclusive)
export const periods = {
  dev: { key: 'DEV', start: '2017-06-15', end: '2021-12-31' },
  val: { key: 'VAL', start: '2022-01-01', end: '2023-12-31' },
  fx: { key: 'FX', start: '2024-01-01', end: '2026-10-13' },
  recent: { key: 'RECENT', start: '2026-10-14', end: '2026-10-29' },
  full: { key: 'FULL', start: '2017-06-15', end: '2026-10-29' },
  // WF20 (procedure replication): search through 2019-12-31, test 2020-01-02 → 2021-12-31
  wfSearch: { key: 'WF20-SEARCH', start: '2017-06-15', end: '2019-12-31' },
  wfTest: { key: 'WF20-TEST', start: '2020-01-01', end: '2021-12-31' }
} as const;

export type PeriodKey = keyof typeof periods;

// Development folds (Track 1 R2/T3 and reporting) and the original regimes R1–R9 inside DEV (§6.2,
// METHOD_RECONSTRUCTION.md §3), plus VAL's own regimes for reporting.
export const folds = [
  { key: 'D1', start: '2017-06-15', end: '2018-12-31' },
  { key: 'D2', start: '2019-01-01', end: '2020-06-30' },
  { key: 'D3', start: '2020-07-01', end: '2021-12-31' }
] as const;

export const wfFolds = [
  { key: 'W1', start: '2017-06-15', end: '2018-03-31' },
  { key: 'W2', start: '2018-04-01', end: '2019-01-15' },
  { key: 'W3', start: '2019-01-16', end: '2019-12-31' }
] as const;

export const regimes = [
  { key: 'R1', start: '2017-06-15', end: '2018-01-25' },
  { key: 'R2', start: '2018-01-26', end: '2018-04-30' },
  { key: 'R3', start: '2018-05-01', end: '2018-09-30' },
  { key: 'R4', start: '2018-10-01', end: '2018-12-31' },
  { key: 'R5', start: '2019-01-01', end: '2019-12-31' },
  { key: 'R6', start: '2020-01-01', end: '2020-02-18' },
  { key: 'R7', start: '2020-02-19', end: '2020-04-30' },
  { key: 'R8', start: '2020-05-01', end: '2020-12-31' },
  { key: 'R9', start: '2021-01-01', end: '2021-12-31' },
  { key: 'R10', start: '2022-01-01', end: '2022-10-31' },
  { key: 'R11', start: '2022-11-01', end: '2023-02-28' },
  { key: 'R12', start: '2023-03-01', end: '2023-05-31' },
  { key: 'R13', start: '2023-06-01', end: '2023-12-31' }
] as const;

export const devRegimeKeys = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9'];
export const wfRegimeKeys = ['R1', 'R2', 'R3', 'R4', 'R5'];

export const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

export const halfYears = () =>
  years.flatMap((year) => [
    { key: `${year}H1`, start: year === 2017 ? '2017-06-15' : `${year}-01-01`, end: `${year}-06-30` },
    { key: `${year}H2`, start: `${year}-07-01`, end: `${year}-12-31` }
  ]);

// §3.3 doors: the last New York date whose sessions may enter a strategy result
export const doors = {
  'search-wf20': { end: '2019-12-31', partition: 'training' as const },
  search: { end: '2021-12-31', partition: 'training' as const },
  validation: { end: '2023-12-29', partition: 'training' as const },
  control: { end: '2026-10-13', partition: 'all' as const },
  final: { end: undefined, partition: 'all' as const }
};

export type DoorKey = keyof typeof doors;

export const restrictedUniverse = ['VGT', 'KRE', 'GDX'] as const;
export const fiveEtfUniverse = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;
// Book order used by every replay (the pools runner's B5.json order, XBI/XRT removed).
export const bookOrder = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'];

const g = (
  X: number,
  Y: number,
  stop: number,
  hold: number,
  L: number,
  buffer: number,
  P: number,
  W: number
): Grid => ({
  targetPercentChange: X,
  trailingBuyPercentage: Y,
  trailingStopPercentage: stop,
  maximumHoldDays: hold,
  tickWindowSize: L,
  intradayLossBuffer: buffer,
  pullback: P,
  continuationWindow: W
});

// Frozen B5 books (config/pools/B5.json, grid units) — checked against the registry by the parity stage.
export const frozenGrids = {
  VGT: g(216, 3, 73, 8, 74, 29, 90, 60), // primary d1-ebc9f639b3
  XBI: g(300, 12, 31, 5, 49, 1, 82, 54), // lowDd d1-0aabdaab89
  XRT: g(244, 47, 80, 17, 48, 36, 62, 120), // lowDd d1-15c387627c
  KRE: g(299, 27, 31, 4, 230, 23, 94, 60), // lowDd d1-a389037400
  GDX: g(274, 4, 71, 18, 100, 36, 191, 81) // portfolioAware d1-51ea8d4bd6
} as const;

// §5.1 Study A controls (never seeds, shortlist members or neighbourhood centres of a search)
export const studyAControls: { id: string; grid: Grid; status: string }[] = [
  { id: 'A-C1-portfolioAware', grid: frozenGrids.GDX, status: 'in-sample on DEV and VAL (selected on 2017–2023)' },
  {
    id: 'A-C2-trackS',
    grid: g(258, 10, 54, 8, 172, 14, 176, 199),
    status: 'in-sample on DEV and VAL (portfolio-aware S-vector d1-68ebf55a55)'
  },
  {
    id: 'A-C3-standaloneRep',
    grid: g(278, 11, 76, 3, 231, 22, 70, 127),
    status: 'in-sample on DEV and VAL (d1-standalone-opportunity-audit representative)'
  },
  { id: 'A-C4-d1Constants', grid: frozenGrids.VGT, status: 'D1 shipped constants; not fitted to GDX' }
];

// §4.2 neighbourhoods: the ±2 increments per dimension in grid units (X Y stop hold L buffer P W)
export const radius: Grid = g(10, 2, 10, 2, 10, 10, 10, 20);
export const neighbourhood = { n1: 128, n2: 64, perBook: 64, joint: 128 };

// §5 Study A budgets and rules
export const studyA = {
  sobolSamples: 4096,
  replicates: 3,
  ga: {
    populationSize: 96,
    crossoverProbability: 0.9,
    crossoverEta: 15,
    mutationEta: 20,
    maxGenerations: 40,
    maxNewVectors: 2000,
    patience: 10,
    tolerance: 1e-4,
    seedDiversity: 0.02
  },
  feasibility: { main: { minTrades: 8, minYears: 3 }, wf20: { minTrades: 5, minYears: 2 } },
  shortlist: { distance: 0.1, net: 16, ratio: 8, lowDd: 8, lowDdCeiling: 25000, lowDdNetShare: 0.5, ratioFloor: 10000 },
  gates: {
    neighbourP90Ceiling: 35000,
    neighbourFeasibleShare: 0.9,
    plateauMedianShare: 0.6,
    probeFeasibleShare: 0.75,
    probeMedianShare: 0.7,
    minTrades: 8,
    minYears: 4,
    wfMinTrades: 5,
    wfMinYears: 3
  },
  roles: { distance: 0.1, defensiveScoreShare: 0.6 }
};

// §6 Study B
export const studyB = {
  track2: {
    runs: [
      { key: 's1', start: 'C3' },
      { key: 's2', start: 'C3' },
      { key: 's3', start: 'C3' },
      { key: 's4', start: 'T1-P' }
    ] as const,
    rounds: 2,
    step: {
      populationSize: 48,
      maxNewVectors: 600,
      maxGenerations: 30,
      patience: 8,
      sobol: 256,
      minGain: 5000,
      maxChecks: 20
    },
    joint: { populationSize: 64, maxNewVectors: 1500, maxGenerations: 40, patience: 8 },
    variation: { crossoverProbability: 0.9, crossoverEta: 15, mutationEta: 20 },
    tolerance: 1e-4,
    seedDiversity: 0.02,
    probeFeasibleShare: 0.75
  },
  candidates: { paretoExtra: 8, paretoDistance: 0.05 },
  gates: {
    neighbourP90Ceiling: 35000,
    neighbourFeasibleShare: 0.9,
    jointMedianShare: 0.6,
    perBookMedianShare: 0.75,
    largestLotShare: 0.25
  },
  roles: { defensiveScoreShare: 0.8 }
};

// Stress settings (§5.5, §6.4) and the final sensitivities (§7)
export const stresses = [
  { key: 'cost10', costBps: 10 },
  { key: 'rate14', rate: 0.14 },
  { key: 'nextOpen', stopFill: 'next-open' as const },
  { key: 'slip25', stopSlippageBps: 25 }
];

export const finalSensitivities = [
  { key: 'cost0', costBps: 0 },
  { key: 'cost2', costBps: 2 },
  { key: 'cost10', costBps: 10 },
  { key: 'cost20', costBps: 20 },
  { key: 'rate8', rate: 0.08 },
  { key: 'rate14', rate: 0.14 },
  { key: 'nextOpen', stopFill: 'next-open' as const },
  { key: 'slip10', stopSlippageBps: 10 },
  { key: 'slip25', stopSlippageBps: 25 },
  { key: 'arm2017-12-15', armDate: '2017-12-15' },
  { key: 'arm2018-06-15', armDate: '2018-06-15' }
];

export const seedOf = (...labels: (string | number)[]) => [studyName, ...labels] as (string | number)[];
