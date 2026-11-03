// Study 7 constants, mirrored from research/study7-stability-first-d1/PROTOCOL.md (section numbers in the comments).
// Nothing here reads data. The frozen B5 books are imported from the Study 6 constants (checked there against the
// registry and config/pools/B5.json, and re-checked by this study's parity stage).
import path from 'node:path';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { frozenGrids as b5Grids, frozenPhenotypes as b5Phenotypes, radius } from '../study6-b5-kre-robustness/context.ts';

export const studyName = 'study7-stability-first-d1';
export const studyDir = 'research/study7-stability-first-d1';
export const resultsDir = path.join(studyDir, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsDir, ...parts);
export const protocolFile = path.join(studyDir, 'PROTOCOL.md');
export const protocolFreezeFile = resultFile('protocol_freeze.json');
export const parityFile = resultFile('parity', 'parity.json');
export const baselineManifestFile = resultFile('phaseA', 'baseline_manifest.json');
export const frozenSelectionFile = path.join(studyDir, 'FROZEN_SELECTION.json');
export const doorsLog = resultFile('doors.jsonl');
export const codeDir = 'src/study7-stability-first-d1';
export const cacheDir = resultFile('cache'); // persistent point caches (git-ignored, regenerable)

// §3 execution (the frozen B5 conventions, unchanged)
export const execution = {
  principal: 100000,
  rate: 0.11,
  costBps: 5,
  stopFill: 'stop' as const,
  stopSlippageBps: 0,
  eligibilityDate: '2017-06-15',
  drawdownCeiling: 35000
};

// §2 the B5 book order (the replay's book order; same-minute ties are alphabetical inside the engine)
export const bookOrder = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;
export type Sym = (typeof bookOrder)[number];

export const g = (X: number, Y: number, stop: number, hold: number, L: number, buffer: number, P: number, W: number) =>
  ({
    targetPercentChange: X,
    trailingBuyPercentage: Y,
    trailingStopPercentage: stop,
    maximumHoldDays: hold,
    tickWindowSize: L,
    intradayLossBuffer: buffer,
    pullback: P,
    continuationWindow: W
  }) satisfies Grid;

export const frozenGrids: Record<Sym, Grid> = b5Grids;
export const frozenPhenotypes = b5Phenotypes;
export { radius };

// §2.2 the five frozen configurations (Phase A) and the four searched tracks (Phase B)
export const frozenPools = {
  B1: ['VGT'],
  VG: ['VGT', 'GDX'],
  VXR: ['VGT', 'XBI', 'XRT'],
  VXRG: ['VGT', 'XBI', 'XRT', 'GDX'],
  B5: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']
} as const satisfies Record<string, readonly Sym[]>;
export type FrozenPoolKey = keyof typeof frozenPools;

export const tracks = {
  G: { books: ['GDX'], role: 'GDX standalone (mandatory, full effort)' },
  VG: { books: ['VGT', 'GDX'], role: 'VGT+GDX joint pool (primary emphasis)' },
  VXR: { books: ['VGT', 'XBI', 'XRT'], role: 'VGT+XBI+XRT joint pool (primary emphasis)' },
  VXRG: { books: ['VGT', 'XBI', 'XRT', 'GDX'], role: 'four-book no-KRE pool (predeclared secondary)' },
  V: { books: ['VGT'], role: 'VGT standalone opportunity-gap diagnostic (folds M and L)' },
  VC: { books: ['VGT'], role: 'VGT standalone challenger (runs only if the §9.5 trigger fires)' }
} as const satisfies Record<string, { books: readonly Sym[]; role: string }>;
export type TrackKey = keyof typeof tracks;

// §6.1 GDX standalone controls (unchanged vectors; provenance verified by the parity stage against the sealed records)
export const gdxControls: Record<string, { grid: Grid; id: string; source: string; status: string }> = {
  'G-PA': {
    grid: b5Grids.GDX,
    id: 'd1-51ea8d4bd6',
    source: 'config/phenotypes/D1/GDX.json portfolioAware (B5 GDX book; research/portfolio-aware-d1-optimization)',
    status: 'registered; selected on 2017-2023 (in-sample on every window ≤ 2023)'
  },
  'G-TS': {
    grid: g(258, 10, 54, 8, 172, 14, 176, 199),
    id: 'd1-68ebf55a55',
    source: 'portfolio-aware-d1 Track S vector (Study 5 control A-C2)',
    status: 'research; selected on 2017-2023'
  },
  'G-SR': {
    grid: g(278, 11, 76, 3, 231, 22, 70, 127),
    id: 'd1-4f034dc898',
    source: 'd1-standalone-opportunity-audit representative (Study 5 control A-C3)',
    status: 'research; selected on 2016-2023'
  },
  'G-NM1': {
    grid: g(260, 6, 62, 5, 215, 54, 76, 12),
    id: 'd1-ac0aaa704c',
    source: 'Study 5 Study A near-miss 1 (failed only G2)',
    status: 'research, not nominated; selected on DEV 2017-06-15 → 2021-12-31'
  },
  'G-NM2': {
    grid: g(258, 6, 62, 5, 228, 5, 76, 14),
    id: 'd1-a8e252df46',
    source: 'Study 5 Study A near-miss 2 (failed only G2)',
    status: 'research, not nominated; selected on DEV'
  },
  'G-NM3': {
    grid: g(261, 3, 61, 5, 215, 34, 76, 12),
    id: 'd1-143e245fb1',
    source: 'Study 5 Study A near-miss 3 (failed only G2)',
    status: 'research, not nominated; selected on DEV'
  },
  'G-T1P': {
    grid: g(258, 9, 72, 11, 210, 34, 147, 170),
    id: 'd1-18da4e7426',
    source: 'Study 5 Study B Track 1 (B5 method on VGT/KRE/GDX) Track P GDX vector (s5Track1P)',
    status: 'research, not nominated (failed PG2; FULL DD $39,623); pool-selected on DEV'
  },
  'G-T1S': {
    grid: g(268, 4, 66, 8, 214, 40, 73, 15),
    id: 'd1-0168b7184b',
    source: 'Study 5 Study B Track 1 Track S GDX vector (s5Track1S)',
    status: 'research, not nominated (failed PG2); selected on DEV'
  },
  'G-T2C': {
    grid: g(273, 12, 54, 14, 243, 43, 170, 68),
    id: 'T2-s3-coord',
    source: 'Study 5 Study B Track 2a best configuration T2-s3-coord, its GDX book',
    status: 'research, not nominated (failed 4 gates); pool-selected on DEV'
  },
  'G-T2P': {
    grid: g(242, 3, 47, 4, 214, 35, 195, 84),
    id: 'T2-s2-joint',
    source: 'Study 5 Study B Track 2a T2-s2-joint / DEV-Pareto archive, its GDX book',
    status: 'research, not nominated; pool-selected on DEV'
  }
};

// §4 windows and outer folds. Every run is one continuous run from the close of 2016-01-04 (accounting) with arming
// on 2017-06-15; positions, setups, highs, stops, interest and drawdown peaks carry across every boundary.
export const windows = {
  W19: '2019-12-31',
  W20: '2020-12-31',
  WDEV: '2021-12-31',
  W22: '2022-12-30',
  W13: '2026-10-13',
  W23: '2023-12-29',
  W29: '2026-10-29'
} as const;
export type WindowKey = keyof typeof windows;

export const folds = {
  F19: { trainEnd: '2019-12-31', testStart: '2020-01-01', testEnd: '2021-12-31', role: 'procedure evidence' },
  F20: { trainEnd: '2020-12-31', testStart: '2021-01-01', testEnd: '2022-12-30', role: 'procedure evidence' },
  M: { trainEnd: '2021-12-31', testStart: '2022-01-01', testEnd: '2023-12-29', role: 'main (Class M path)' },
  L: { trainEnd: '2023-12-29', testStart: '2024-01-01', testEnd: '2026-10-29', role: 'late (Class L path)' }
} as const;
export type FoldKey = keyof typeof folds;

export const periodList = [
  { key: 'DEV', start: '2017-06-15', end: '2021-12-31' },
  { key: 'VAL', start: '2022-01-01', end: '2023-12-31' },
  { key: 'FX', start: '2024-01-01', end: '2026-10-29' },
  { key: 'FX13', start: '2024-01-01', end: '2026-10-13' },
  { key: 'RECENT', start: '2026-10-14', end: '2026-10-29' },
  { key: 'FULL', start: '2017-06-15', end: '2026-10-29' },
  { key: 'TRAIN-F19', start: '2017-06-15', end: '2019-12-31' },
  { key: 'TEST-F19', start: '2020-01-01', end: '2021-12-31' },
  { key: 'TRAIN-F20', start: '2017-06-15', end: '2020-12-31' },
  { key: 'TEST-F20', start: '2021-01-01', end: '2022-12-30' },
  { key: 'TRAIN-L', start: '2017-06-15', end: '2023-12-29' },
  { key: 'M2020', start: '2020-02-15', end: '2020-04-30' }, // the March 2020 episode (diagnostic)
  { key: 'R2223', start: '2022-01-01', end: '2023-12-31' } // the 2022-2023 re-entry window (diagnostic)
] as const;

export const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

export const halfYears = () =>
  years.flatMap((year) => [
    { key: `${year}H1`, start: year === 2017 ? '2017-06-15' : `${year}-01-01`, end: `${year}-06-30` },
    { key: `${year}H2`, start: `${year}-07-01`, end: `${year}-12-31` }
  ]);

// §5 episodes: funded lots whose entry is within `episodeGap` sessions of the previous lot's exit form one episode
export const episodeGap = 10;

// §7 eligibility constraints and floors (search side; y = sessions from arming to the window end ÷ 252)
export const eligibility = {
  ceiling: 35000,
  share: 0.9,
  lotsPerYear: 1.5,
  episodesPerYear: 0.5,
  minLotYears: 3, // closed lots in at least min(3, calendar years spanned − 1) distinct years
  medianPerYear: 10000, // neighbourhood median net per year (≈ one year of 11% interest on the notional)
  p10Floor: 0, // neighbourhood p10 net > 0
  perCapitalYear: 11000, // centre net per occupied $100k-year ≥ the 11% financing cost again
  topLotShare: 0.25,
  topYearShare: 0.75, // one cap for search and gates, every window (PROTOCOL.md §7.1, §11)
  exBestPerYear: 5000, // ex-best-year economy floor
  plateau: 0.6
};

// §8 the multi-fidelity schedule (frozen after the pilot, PROTOCOL.md §8.1)
export const schedule = {
  bookScreen: 4096, // per-book scrambled Sobol (centre only), proposal generation for pools
  gScreen: 8192, // Track G / V Sobol screen (centre only)
  poolCombos: 4096, // pool centres from per-book plausible vectors
  poolSobol: 1024, // pool centres from a joint Sobol (unbiased coverage)
  r1Cap: 1024, // screen centres promoted to rung 1
  r1: 16,
  islands: 4,
  islandsMax: 8,
  population: 64,
  generations: 40,
  newPerIsland: 2048,
  patience: 10,
  tolerance: 1e-3,
  r2Keep: 192,
  r2: 64,
  r3Keep: 48,
  r3: 128,
  refineStarts: 6,
  refinePasses: 2,
  refineN: 64,
  refineMinGain: 1000,
  shortlist: { G: 6, VG: 6, VXR: 6, VXRG: 4, V: 4, VC: 6 } as Record<TrackKey, number>,
  distinct: 0.1, // shortlist and roles (≈ 1–2.5 r per coordinate)
  refineDistinct: 0.05,
  r2Distinct: 0.02,
  r3Distinct: 0.03,
  select: { n: 128, reps: 2 },
  confirm: { n: 128, reps: 3, bookN: 64, alt: 128 },
  final: { n: 128, reps: 3, bookN: 64, alt: 128 },
  ga: { crossoverProbability: 0.9, crossoverEta: 15, mutationEta: 20 },
  // per-track overrides of the base budget (PROTOCOL.md §8.3)
  overrides: {
    VXRG: { islands: 2, islandsMax: 4, newPerIsland: 1536, refineStarts: 4 },
    V: { r1Cap: 512, islands: 1, islandsMax: 1, r2Keep: 96, r3Keep: 24, refineStarts: 3, t1: false }
  } as Record<string, Record<string, number | boolean>>
};

// The Phase B job list (PROTOCOL.md §8.3, §9.5): every job must be sealed before any test door opens.
export const baseJobs = (['G', 'VG', 'VXR', 'VXRG'] as const).flatMap((track) =>
  (['F19', 'F20', 'M', 'L'] as const).map((fold) => ({ track, fold, mode: 'base' as const }))
);
export const vDiagnosticJobs = (['M', 'L'] as const).map((fold) => ({ track: 'V' as const, fold, mode: 'diagnostic' as const }));
export const vChallengerJobs = (['F19', 'F20', 'M', 'L'] as const).map((fold) => ({ track: 'VC' as const, fold, mode: 'base' as const }));

export const searchFile = (track: TrackKey, fold: FoldKey, mode = 'base') =>
  resultFile('phaseB', track, fold, mode === 'base' || mode === 'diagnostic' ? 'search.json' : `search-${mode}.json`);
export const validationFile = (track: TrackKey, fold: FoldKey) => resultFile('phaseD', track, fold, 'validation.json');

// §6.8 / §10 execution settings (one at a time)
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

export const stresses = [
  { key: 'cost10', costBps: 10 },
  { key: 'rate14', rate: 0.14 },
  { key: 'nextOpen', stopFill: 'next-open' as const },
  { key: 'slip25', stopSlippageBps: 25 }
];

export const bootstrap = { blockLength: 21, resamples: 5000 };

export const seedOf = (...labels: (string | number)[]) => [studyName, ...labels] as (string | number)[];
