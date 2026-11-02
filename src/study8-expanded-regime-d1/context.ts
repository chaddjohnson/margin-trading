// Study 8 constants, mirrored from research/study8-expanded-regime-d1/PROTOCOL.md (section numbers in the comments).
// Nothing here reads data. Frozen books and GDX controls are Study 7's (verified there against the registry, B5.json and
// Study 5's sealed records, and re-verified by Study 8's parity stage); radii, box and grids are Study 7's.
import path from 'node:path';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import {
  radius,
  frozenGrids as s7Frozen,
  gdxControls as s7Gdx,
  frozenPhenotypes as s7Phenotypes
} from '../study7-stability-first-d1/context.ts';

export const studyName = 'study8-expanded-regime-d1';
export const studyDir = 'research/study8-expanded-regime-d1';
export const resultsDir = path.join(studyDir, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsDir, ...parts);
export const protocolFile = path.join(studyDir, 'PROTOCOL.md');
export const protocolFreezeFile = resultFile('protocol_freeze.json');
export const parityFile = resultFile('parity', 'parity.json');
export const chainFile = resultFile('chain.jsonl');
export const frozenSelectionFile = path.join(studyDir, 'FROZEN_SELECTION.json');
export const auditFile = resultFile('audit', 'pre_test_audit.json');
export const doorsLog = resultFile('doors.jsonl');
export const codeDir = 'src/study8-expanded-regime-d1';
export const cacheDir = resultFile('cache'); // persistent point caches (git-ignored, regenerable)

// §4 execution (the frozen conventions, unchanged)
export const execution = {
  principal: 100000,
  rate: 0.11,
  costBps: 5,
  stopFill: 'stop' as const,
  stopSlippageBps: 0,
  eligibilityDate: '2017-06-15',
  drawdownCeiling: 35000
};

export const bookOrder = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;
export type Sym = (typeof bookOrder)[number];

export const frozenGrids: Record<Sym, Grid> = s7Frozen;
export const frozenPhenotypes = s7Phenotypes;
export const gdxControls = s7Gdx;
export { radius };

// §1 the six searched tracks (all full optimizations; every book of a pool searched jointly)
export const tracks = {
  G: { books: ['GDX'], role: 'GDX standalone' },
  V: { books: ['VGT'], role: 'VGT standalone (new challengers; frozen B1 stays the control)' },
  VG: { books: ['VGT', 'GDX'], role: 'VGT+GDX joint pool' },
  VXR: { books: ['VGT', 'XBI', 'XRT'], role: 'VGT+XBI+XRT joint pool' },
  VXRG: { books: ['VGT', 'XBI', 'XRT', 'GDX'], role: 'four-book joint pool (no KRE)' },
  VXRKG: { books: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'], role: 'five-book joint pool (B5 architecture reoptimized)' }
} as const satisfies Record<string, { books: readonly Sym[]; role: string }>;
export type TrackKey = keyof typeof tracks;
export const trackKeys = Object.keys(tracks) as TrackKey[];

// §1 immutable comparators
export const frozenPools = {
  B1: ['VGT'],
  VG: ['VGT', 'GDX'],
  VXR: ['VGT', 'XBI', 'XRT'],
  VXRG: ['VGT', 'XBI', 'XRT', 'GDX'],
  B5: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']
} as const satisfies Record<string, readonly Sym[]>;

// §3 windows and folds. Every run is continuous from the close of 2016-01-04 (accounting) with arming on 2017-06-15;
// positions, setups, highs, stops, reservations, interest and drawdown peaks carry across every boundary.
export const windows = {
  W19: '2019-12-31',
  W20: '2020-12-31',
  W21: '2021-12-31',
  W22: '2022-12-30',
  W23: '2023-12-29',
  W24: '2024-12-31',
  W13: '2026-10-13',
  W29: '2026-10-29'
} as const;
export type WindowKey = keyof typeof windows;

export const folds = {
  F19: {
    trainEnd: '2019-12-31',
    testStart: '2020-01-01',
    testEnd: '2021-12-31',
    role: 'procedure diagnostic (Study 7 F19 analogue)'
  },
  F20: {
    trainEnd: '2020-12-31',
    testStart: '2021-01-01',
    testEnd: '2022-12-30',
    role: 'procedure diagnostic (Study 7 F20 analogue)'
  },
  F21: {
    trainEnd: '2021-12-31',
    testStart: '2022-01-01',
    testEnd: '2023-12-29',
    role: 'procedure diagnostic (Study 7 M analogue; essential stress test)'
  },
  F23: {
    trainEnd: '2023-12-29',
    testStart: '2024-01-01',
    testEnd: '2024-12-31',
    role: 'procedure diagnostic (new intermediate fold)'
  },
  F24: {
    trainEnd: '2024-12-31',
    testStart: '2025-01-01',
    testEnd: '2026-10-29',
    role: 'PRIMARY (one-time 2025–2026 evaluation)'
  }
} as const;
export type FoldKey = keyof typeof folds;
export const foldKeys = Object.keys(folds) as FoldKey[];
export const primaryFold: FoldKey = 'F24';

export const periodList = [
  { key: 'FULL', start: '2017-06-15', end: '2026-10-29' },
  ...Object.entries(folds).flatMap(([fold, spec]) => [
    { key: `TRAIN-${fold}`, start: '2017-06-15', end: spec.trainEnd },
    { key: `TEST-${fold}`, start: spec.testStart, end: spec.testEnd }
  ]),
  { key: 'Y2025', start: '2025-01-01', end: '2025-12-31' },
  { key: 'Y2026YTD', start: '2026-01-01', end: '2026-10-29' },
  { key: 'M2020', start: '2020-02-15', end: '2020-04-30' },
  { key: 'R2223', start: '2022-01-01', end: '2023-12-31' },
  { key: 'T2025Q2', start: '2025-03-01', end: '2025-06-30' }, // the 2025 tariff episode (diagnostic)
  { key: 'G2026', start: '2026-03-01', end: '2026-07-31' } // the 2026 GDX drawdowns (diagnostic)
];

export const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] as const;

export const halfYears = () =>
  years.flatMap((year) => [
    { key: `${year}H1`, start: year === 2017 ? '2017-06-15' : `${year}-01-01`, end: `${year}-06-30` },
    { key: `${year}H2`, start: `${year}-07-01`, end: `${year}-12-31` }
  ]);

// §5 episodes (Study 7): a lot starts a new episode when its entry is > 10 sessions after the previous lot's exit
export const episodeGap = 10;

// §6 eligibility (Study 7's rulebook, literally; count floors per year of the window)
export const eligibility = {
  ceiling: 35000,
  share: 0.9,
  lotsPerYear: 1.5,
  episodesPerYear: 0.5,
  minLotYears: 3,
  medianPerYear: 10000,
  p10Floor: 0,
  perCapitalYear: 11000,
  topLotShare: 0.25,
  topYearShare: 0.75,
  exBestPerYear: 5000,
  plateau: 0.6
};

// §8.4 test-period gates (fixed before any search). yTest = sessions from the first test session to the test end ÷ 252.
export const testGates = {
  centrePerTestYear: 10000, // T3a: centre test-window net ≥ $10,000 per test year
  medianPerTestYear: 5000, // T3b: pooled test-set median test-window net ≥ $5,000 per test year (and > 0)
  testLotsPerYear: 1.5, // T6b: new funded lots in the test window ≥ ⌈1.5 · yTest⌉
  testEpisodesPerYear: 0.5, // T6b: new episodes in the test window ≥ ⌈0.5 · yTest⌉
  marginalShare: 0.93, // ambiguous if the pooled share is ≤ 0.93 or at least one test set fails T2
  marginalCentreDd: 33000 // ambiguous if the centre DD is ≥ $33,000 (within $2,000 of the ceiling)
};

// §8.5 fold-level evidence rule (Study 7 §9.1): a fold whose role holders took fewer than 3 new funded test lots in
// total, or that has no role holder, is "insufficient evidence".
export const insufficientTestLots = 3;

// §7.1 dimension scaling: s(d) = max(1, d / 16), d = 8 × books (G, V, VG 1; VXR 1.5; VXRG 2; VXRKG 2.5). It multiplies
// the joint-proposal budgets (pool combinations, joint LHS, rung-1 cap, GA population and new configurations per
// island); G, V and VG keep Study 7's budgets exactly.
export const dimensionScale = (books: number) => Math.max(1, (8 * books) / 16);

// §7 the multi-fidelity schedule (Study 7's, with every track a full track)
export const schedule = {
  bookScreen: 4096,
  gScreen: 8192,
  poolCombos: 4096,
  poolSobol: 1024,
  r1Cap: 1024,
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
  shortlist: { G: 6, V: 6, VG: 6, VXR: 6, VXRG: 6, VXRKG: 6 } as Record<string, number>,
  distinct: 0.1,
  refineDistinct: 0.05,
  r2Distinct: 0.02,
  r3Distinct: 0.03,
  select: { n: 128, reps: 2 },
  confirm: { n: 128, reps: 3, bookN: 64, alt: 128 },
  test: { n: 128, reps: 3, bookN: 64, alt: 128 },
  ga: { crossoverProbability: 0.9, crossoverEta: 15, mutationEta: 20 },
  overrides: {} as Record<string, Record<string, number | boolean>>
};

export const searchJobs = trackKeys.flatMap((track) =>
  foldKeys.map((fold) => ({ track, fold, mode: 'base' as const }))
);

export const searchFile = (track: TrackKey, fold: FoldKey, mode = 'base') =>
  resultFile('search', track, fold, mode === 'base' ? 'search.json' : `search-${mode}.json`);
export const qualificationFile = (track: TrackKey, fold: FoldKey) =>
  resultFile('qualify', track, fold, 'qualification.json');
export const testFile = (fold: FoldKey) => resultFile('test', fold, 'test.json');
export const testConfirmFile = (fold: FoldKey) => resultFile('test', fold, 'confirm.json');

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

// §4 gating stresses (Q7 on the training run; T4 on the run to the test end); the rest are diagnostic
export const stresses = [
  { key: 'cost10', costBps: 10 },
  { key: 'rate14', rate: 0.14 },
  { key: 'nextOpen', stopFill: 'next-open' as const },
  { key: 'slip25', stopSlippageBps: 25 }
];

export const bootstrap = { blockLength: 21, resamples: 5000 };

// §2.3 the numeric rulebook sealed at the freeze and in FROZEN_SELECTION.json; the test stage refuses to open a door
// unless the live values equal the sealed ones.
export const constantsSnapshot = () => ({
  execution,
  eligibility,
  testGates,
  insufficientTestLots,
  schedule,
  dimensionScale: Object.fromEntries(
    Object.entries(tracks).map(([key, spec]) => [key, dimensionScale(spec.books.length)])
  ),
  stresses,
  executionSettings,
  bootstrap,
  folds,
  windows,
  episodeGap,
  radius
});

export const seedOf = (...labels: (string | number)[]) => [studyName, ...labels] as (string | number)[];
