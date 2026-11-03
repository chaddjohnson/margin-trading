// Study 6 constants, mirrored from research/study6-b5-kre-robustness-2026-10/PROTOCOL.md (section numbers in the
// comments). Nothing here reads data.
import path from 'node:path';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';

export const studyName = 'study6-b5-kre-robustness';
export const studyDir = 'research/study6-b5-kre-robustness-2026-10';
export const resultsDir = path.join(studyDir, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsDir, ...parts);
export const protocolFile = path.join(studyDir, 'PROTOCOL.md');
export const protocolFreezeFile = resultFile('protocol_freeze.json');
export const parityFile = resultFile('parity', 'parity.json');
export const diagnosticManifestFile = resultFile('diagnostic_manifest.json');
export const frozenSelectionFile = path.join(studyDir, 'FROZEN_SELECTION.json');
export const doorsLog = resultFile('doors.jsonl');
export const codeDir = 'src/study6-b5-kre-robustness';

// §2 / §3 execution (the frozen B5 conventions)
export const execution = {
  principal: 100000,
  rate: 0.11,
  costBps: 5,
  stopFill: 'stop' as const,
  stopSlippageBps: 0,
  eligibilityDate: '2017-06-15',
  drawdownCeiling: 35000
};

// §2 the five books, in B5.json order (the replay's book order; ties are alphabetical inside the engine)
export const bookOrder = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;
export type Sym5 = (typeof bookOrder)[number];

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

// Frozen B5 books (config/pools/B5.json, grid units) — checked against the registry and B5.json by the parity stage.
export const frozenGrids: Record<Sym5, Grid> = {
  VGT: g(216, 3, 73, 8, 74, 29, 90, 60), // primary d1-ebc9f639b3
  XBI: g(300, 12, 31, 5, 49, 1, 82, 54), // lowDd d1-0aabdaab89
  XRT: g(244, 47, 80, 17, 48, 36, 62, 120), // lowDd d1-15c387627c
  KRE: g(299, 27, 31, 4, 230, 23, 94, 60), // lowDd d1-a389037400
  GDX: g(274, 4, 71, 18, 100, 36, 191, 81) // portfolioAware d1-51ea8d4bd6
};

export const frozenPhenotypes: Record<Sym5, { name: string; candidateId: string }> = {
  VGT: { name: 'primary', candidateId: 'd1-ebc9f639b3' },
  XBI: { name: 'lowDd', candidateId: 'd1-0aabdaab89' },
  XRT: { name: 'lowDd', candidateId: 'd1-15c387627c' },
  KRE: { name: 'lowDd', candidateId: 'd1-a389037400' },
  GDX: { name: 'portfolioAware', candidateId: 'd1-51ea8d4bd6' }
};

// §5.1 the increment r (the "±2 step") in grid units
export const radius: Grid = g(10, 2, 10, 2, 10, 10, 10, 20);

// §4 windows: the last New York date of each truncated continuous run
export const windows = {
  WDEV: '2021-12-31',
  W23: '2023-12-29',
  W13: '2026-10-13',
  W29: '2026-10-29'
} as const;
export type WindowKey = keyof typeof windows;

// §4 period labels inside one continuous run
export const periods = [
  { key: 'DEV', start: '2017-06-15', end: '2021-12-31' },
  { key: 'VAL', start: '2022-01-01', end: '2023-12-31' },
  { key: 'FX', start: '2024-01-01', end: '2026-10-13' },
  { key: 'RECENT', start: '2026-10-14', end: '2026-10-29' },
  { key: 'FULL', start: '2017-06-15', end: '2026-10-29' },
  { key: 'WF19-SEARCH', start: '2017-06-15', end: '2019-12-31' },
  { key: 'WF19-TEST', start: '2020-01-01', end: '2020-12-31' },
  { key: 'WF20-SEARCH', start: '2017-06-15', end: '2020-12-31' },
  { key: 'WF20-TEST', start: '2021-01-01', end: '2021-12-31' }
] as const;

export const devFolds = [
  { key: 'D1', start: '2017-06-15', end: '2018-12-31' },
  { key: 'D2', start: '2019-01-01', end: '2020-06-30' },
  { key: 'D3', start: '2020-07-01', end: '2021-12-31' }
] as const;

export const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

// §5.4 design sizes and replicate counts
export const sets = {
  jointN1: { n: 128, reps: 5 },
  jointN2: { n: 64, reps: 3 },
  bookN1: { n: 64, reps: 5 },
  bookN2: { n: 64, reps: 3 },
  kreVariant: { n: 64, reps: 5 },
  pair: { n: 64, reps: 3 },
  b1: { n: 128, reps: 5 },
  parity: { joint: 8, kre: 4 }
};

export const pairPartners = ['GDX', 'VGT', 'XBI', 'XRT'] as const;

// §6.8 execution settings (one at a time)
export const executionSettings = [
  { key: 'cost0', costBps: 0 },
  { key: 'cost2', costBps: 2 },
  { key: 'cost10', costBps: 10 },
  { key: 'cost20', costBps: 20 },
  { key: 'rate8', rate: 0.08 },
  { key: 'rate14', rate: 0.14 },
  { key: 'nextOpen', stopFill: 'next-open' as const },
  { key: 'slip10', stopSlippageBps: 10 },
  { key: 'slip25', stopSlippageBps: 25 }
];

// §10 Part B
export const partB = {
  search: {
    sobolLocal: 2048,
    sobolWide: 2048,
    rungs: [
      { keep: 256, n: 16, seed: 1, survivors: 64 },
      { keep: 64, n: 64, seed: 2, survivors: 16 },
      { keep: 16, n: 128, seed: 3, survivors: 8 }
    ],
    refine: { starts: 4, passes: 2, n: 64, seed: 2, minGain: 2000 },
    shortlistK: 6,
    shortlistJ: 4,
    sobolJ: 4096,
    distinct: 0.05,
    penalty: { ddLevel: 30000, perDollar: 4, boundShare: 0.05 },
    filters: { lotsShare: 0.75, occupancyShare: 0.6, minKreLots: 1, largestLotShare: 0.25 }
  },
  selection: { n: 128, reps: 3, bookN: 64 },
  confirmation: { n: 128, reps: 3, bookN: 64, n2: 64 },
  gates: {
    share: 0.9,
    ceiling: 35000,
    lotsShare: 0.75,
    occupancyShare: 0.6,
    largestLotShare: 0.25,
    largestYearShare: 0.5,
    jointMedianShare: 0.6,
    bookMedianShare: 0.75,
    e1: 0.9,
    e2: 0.75,
    marginalShare: 0.93,
    partialSharePoints: 0.2,
    partialP90: 5000
  },
  stresses: [
    { key: 'cost10', costBps: 10 },
    { key: 'rate14', rate: 0.14 },
    { key: 'nextOpen', stopFill: 'next-open' as const },
    { key: 'slip25', stopSlippageBps: 25 }
  ],
  finalSensitivities: [
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
  ],
  bootstrap: { blockLength: 21, resamples: 5000 }
};

export const seedOf = (...labels: (string | number)[]) => [studyName, ...labels] as (string | number)[];
