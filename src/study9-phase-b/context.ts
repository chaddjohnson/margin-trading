// Study 9 Phase B constants (research/study9-phase-b/PROTOCOL.md; section numbers in the comments). Nothing here reads
// market data. Every numeric rule of the optimizer, the fitness, the neighbourhood instrument, qualification, selection
// and the test gates is Study 8's, imported unchanged from src/study8-expanded-regime-d1/context.ts; parity gate RB
// proves the imported values equal the rulebook sealed in Study 8's FROZEN_SELECTION.json. Only the study namespace
// (seeds, paths), the seven approved ETF memberships, the data doors and the comparators are new.
import path from 'node:path';
import { bookOrderOf } from '../portfolio-aware-d1/nbook/engine.ts';
import {
  bootstrap as s8Bootstrap,
  dimensionScale as s8DimensionScale,
  eligibility as s8Eligibility,
  episodeGap as s8EpisodeGap,
  execution as s8Execution,
  executionSettings as s8ExecutionSettings,
  folds as s8Folds,
  frozenGrids as s8FrozenGrids,
  gdxControls as s8GdxControls,
  halfYears as s8HalfYears,
  insufficientTestLots as s8InsufficientTestLots,
  periodList as s8PeriodList,
  primaryFold as s8PrimaryFold,
  radius as s8Radius,
  schedule as s8Schedule,
  stresses as s8Stresses,
  testGates as s8TestGates,
  windows as s8Windows,
  years as s8Years
} from '../study8-expanded-regime-d1/context.ts';

export const studyName = 'study9-phase-b'; // the RNG namespace: every seed is deriveSeed('study9-phase-b', …labels)
export const studyDir = 'research/study9-phase-b';
export const codeDir = 'src/study9-phase-b';

// Smoke mode (PROTOCOL.md header): a pre-freeze code-path test at toy budgets on training data, written to a scratch
// folder outside the study, never read for any decision and deleted. Every real stage refuses it.
export const smoke = process.env.STUDY9B_SMOKE === '1';
const smokeDir = process.env.STUDY9B_SMOKE_DIR ?? '';

if (smoke && (!smokeDir || path.resolve(smokeDir).startsWith(path.resolve(studyDir)))) {
  throw new Error('STUDY9B_SMOKE needs STUDY9B_SMOKE_DIR outside the study folder');
}

export const resultsDir = smoke ? smokeDir : path.join(studyDir, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsDir, ...parts);
export const protocolFile = path.join(studyDir, 'PROTOCOL.md');
export const amendmentsFile = path.join(studyDir, 'AMENDMENTS.md');
export const briefFile = path.join(studyDir, 'brief', 'ASSIGNMENT.md');
export const reviewFile = path.join(studyDir, 'reviews', 'METHODOLOGY_REVIEW.md');
export const verificationFile = path.join(studyDir, 'reviews', 'METHODOLOGY_REVIEW_VERIFICATION.md');
export const protocolFreezeFile = resultFile('protocol_freeze.json');
export const parityFile = resultFile('parity', 'parity.json');
export const chainFile = resultFile('chain.jsonl');
export const doorsLog = resultFile('doors.jsonl');
export const frozenSelectionFile = smoke
  ? resultFile('FROZEN_SELECTION.json')
  : path.join(studyDir, 'FROZEN_SELECTION.json');
export const auditFile = resultFile('audit', 'pre_test_audit.json');
export const cacheDir = resultFile('cache'); // persistent point caches (git-ignored; retained, never deleted as cleanup)
export const freezeDir = resultFile('freeze');

// §3 data roots. Training, qualification and the F19–F23 test doors read the physically truncated Phase A training
// projection (canonical bytes through the last bar of New York date 2024-12-31). Only the F24 test door (to
// 2026-10-29) and the post-test stages read the canonical files, through an explicit end date.
export const projectionRoot = 'data/vintages/study9-train-2024';
export const projectionManifest = 'research/study9-etf-pool-discovery/results/s0/projection.json';
export const canonicalRoot = 'data';
export const projectionEnd = '2024-12-31';
export const evaluationEnd = '2026-10-29'; // the fixed primary test end (Study 8's W29)
export const sliceDate = '2026-10-30'; // the separate single-session later slice (reported apart, never a gate)
export const firstSession = '2016-01-04';

// §4 execution, eligibility (C1–C7, Q, E), the T gates, the schedule, the radius and the stresses: Study 8's, unchanged.
export const execution = s8Execution; // $100,000 fixed slot, 11% simple (365 d), 5 bps per side, stop fill, arming 2017-06-15
export const eligibility = s8Eligibility;
export const testGates = s8TestGates;
export const insufficientTestLots = s8InsufficientTestLots;
export const schedule = s8Schedule;
export const dimensionScale = s8DimensionScale; // s(d) = max(1, d/16), d = 8 × books
export const radius = s8Radius;
export const stresses = s8Stresses; // Q7/T4 gating: 10 bps, 14%, next-open stops, +25 bps stop slippage
export const executionSettings = s8ExecutionSettings; // diagnostic sensitivities
export const bootstrap = s8Bootstrap; // stationary block bootstrap, block 21, 5,000 resamples
export const episodeGap = s8EpisodeGap;
export const folds = s8Folds; // F19 F20 F21 F23 F24 with Study 8's exact training ends and test ends
export const windows = s8Windows;
export const periodList = s8PeriodList;
export const years = s8Years;
export const halfYears = s8HalfYears;
export const primaryFold = s8PrimaryFold;
export type FoldKey = keyof typeof s8Folds;
export const foldKeys = Object.keys(s8Folds) as FoldKey[];
export const testOrder = ['F19', 'F20', 'F21', 'F23', 'F24'] as const; // Study 8's documented door order
export const activeFolds = (): FoldKey[] =>
  smoke && process.env.STUDY9B_SMOKE_FOLDS ? (process.env.STUDY9B_SMOKE_FOLDS.split(',') as FoldKey[]) : foldKeys;

// §1 the seven approved ETF memberships (frozen; the entire search universe). Books are listed in the engine's own
// order (bookOrderOf: VGT, XBI, XRT, KRE first, then alphabetical), asserted below.
export const tracks = {
  'G4-ILF': {
    books: ['KRE', 'GDX', 'ILF', 'MTUM'],
    family: 'G',
    origin: 'Phase A nomination (G4 profit-1; batches A and B)',
    phaseA: 'generic robust $25.9k/yr, 90.9% share; ILF thin'
  },
  'G4-EWW': {
    books: ['KRE', 'EWW', 'GDX', 'MTUM'],
    family: 'G',
    origin: 'Phase A option-D G-family reserve (queue #1), user-approved',
    phaseA: 'generic robust $27.2k/yr, 90.4% share; MTUM failed the Phase A ≥ $1k/yr marginal-book gate'
  },
  'N3-EDV': {
    books: ['EDV', 'IWM', 'XLF'],
    family: 'N',
    origin: 'Phase A nomination (N3 profit-1; batch A)',
    phaseA: 'generic robust $10.0k/yr, 97.1% share; EDV sparse'
  },
  'N2-SMH': {
    books: ['SMH', 'XHB'],
    family: 'N',
    origin: 'Phase A nomination (N2 profit-1; batch A)',
    phaseA: 'generic robust $10.0k/yr, 96.1% share'
  },
  'V3-IWM': {
    books: ['VGT', 'IWM', 'XLF'],
    family: 'V',
    origin: 'Phase A nomination (V3 profit-1; batch B)',
    phaseA: 'generic robust $9.3k/yr, 97.9% share'
  },
  'N2-EDV': {
    books: ['EDV', 'XHB'],
    family: 'N',
    origin: 'Phase A nomination (N2 profit-2; batch B)',
    phaseA: 'generic robust $9.8k/yr, 92.2% share; EDV sparse'
  },
  'VG3-IWM': {
    books: ['VGT', 'GDX', 'IWM'],
    family: 'VG',
    origin:
      'user-approved EXPLORATORY VG-family test; NOT a Phase A nominee (prespecified deviation from the Phase A batch)',
    phaseA: 'generic robust $12.7k/yr, 89.3% share; infeasible on generic vectors (C2, C7)'
  }
} as const satisfies Record<string, { books: readonly string[]; family: string; origin: string; phaseA: string }>;
export type TrackKey = keyof typeof tracks;
export const trackKeys = Object.keys(tracks) as TrackKey[];

for (const [key, spec] of Object.entries(tracks)) {
  const ordered = bookOrderOf(spec.books);

  if (ordered.join(',') !== spec.books.join(',')) throw new Error(`track ${key}: books are not in the engine's order`);
}

export const trackBooks = (track: TrackKey) => [...tracks[track].books] as string[];
// Smoke mode only: a subset of tracks and folds (STUDY9B_SMOKE_TRACKS / _FOLDS, comma-separated); real stages use all.
export const activeTracks = (): TrackKey[] =>
  smoke && process.env.STUDY9B_SMOKE_TRACKS ? (process.env.STUDY9B_SMOKE_TRACKS.split(',') as TrackKey[]) : trackKeys;
export const dimensionOf = (track: TrackKey) => 8 * tracks[track].books.length;

// §5 the 35 search jobs, longest first (32-D, then 24-D, then 16-D; F24, F23, F21, F20, F19 within a dimension)
export const searchJobs = [...trackKeys]
  .sort((a, b) => dimensionOf(b) - dimensionOf(a) || trackKeys.indexOf(a) - trackKeys.indexOf(b))
  .flatMap((track) => [...foldKeys].reverse().map((fold) => ({ track, fold })));

// §9 immutable comparators (never seeds). Frozen B1/B5 and the frozen subsets are Study 7's frozen grids (via Study 8's
// context); the Study 8 F24 role holders are read by rank from Study 8's sealed FROZEN_SELECTION.json (body hash
// verified, controls.ts). VG #2 balanced (rank 2, S8-VG-F24-3) is the primary economic comparator.
export const frozenGrids = s8FrozenGrids;
export const gdxControls = s8GdxControls;
export const study8SelectionFile = 'research/study8-expanded-regime-d1/FROZEN_SELECTION.json';
export const study8Holders = {
  'S8-VG2-balanced': {
    rank: 2,
    track: 'VG',
    role: 'balanced',
    id: 'VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d',
    config: 'S8-VG-F24-3',
    alias: 's8-vg-balanced',
    note: 'PRIMARY economic comparator'
  },
  'S8-VG1-profit': {
    rank: 1,
    track: 'VG',
    role: 'profit',
    id: 'VGT:d1-f41ebcd961+GDX:d1-016d8e4257',
    config: 'S8-VG-F24-1',
    alias: 's8-vg-profit',
    note: 'Study 8 primary nominee'
  },
  'S8-VXRG3-profit': {
    rank: 3,
    track: 'VXRG',
    role: 'profit',
    id: 'VGT:d1-61be86f1a1+XBI:d1-1a086c125a+XRT:d1-0245c8dddf+GDX:d1-ca3c80373a',
    config: 'S8-VXRG-F24-1',
    alias: 's8-vxrg-profit',
    note: 'context (F24 only)'
  },
  'S8-VXRKG8-profit': {
    rank: 8,
    track: 'VXRKG',
    role: 'profit',
    id: 'VGT:d1-28ce3e131c+XBI:d1-2c4343e62d+XRT:d1-1a4d950d56+KRE:d1-ce53998991+GDX:d1-9c73f00f55',
    config: 'S8-VXRKG-F24-1',
    alias: 's8-vxrkg-profit',
    note: 'context (F24 only)'
  },
  'S8-G12-profit': {
    rank: 12,
    track: 'G',
    role: 'profit',
    id: 'GDX:d1-42338b0a9e',
    config: 'S8-G-F24-6',
    alias: 's8-g-best',
    note: 'context (F24 only)'
  },
  'S8-VXR15-profit': {
    rank: 15,
    track: 'VXR',
    role: 'profit',
    id: 'VGT:d1-05f07225ab+XBI:d1-0f9162498a+XRT:d1-8424f14c77',
    config: 'S8-VXR-F24-1',
    alias: 's8-vxr-profit',
    note: 'context (F24 only)'
  },
  'S8-V25-robust': {
    rank: 25,
    track: 'V',
    role: 'robust',
    id: 'VGT:d1-787044ebd5',
    config: 'S8-V-F24-2',
    alias: 's8-v-best',
    note: 'context (F24 only)'
  }
} as const;
export const frozenPools = {
  B1: ['VGT'],
  B5: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'],
  'VG-frozen': ['VGT', 'GDX'],
  'VXR-frozen': ['VGT', 'XBI', 'XRT'],
  'VXRG-frozen': ['VGT', 'XBI', 'XRT', 'GDX']
} as const satisfies Record<string, readonly string[]>;
// qualification (every track × fold, training door, the track's confirmation labels): B1 (the tier and E3 reference),
// B5 and the two Study 8 VG holders (like-for-like economic context; report-only)
export const qualifyControlKeys = ['B1', 'B5', 'S8-VG2-balanced', 'S8-VG1-profit'] as const;
// test doors: every fold carries these; F24 adds the rest (non-decisional context)
export const testControlKeys = ['B1', 'B5', 'VG-frozen', 'S8-VG2-balanced', 'S8-VG1-profit'] as const;
export const testControlKeysF24 = [
  ...testControlKeys,
  'VXR-frozen',
  'VXRG-frozen',
  'G-PA',
  'S8-VXRG3-profit',
  'S8-VXRKG8-profit',
  'S8-G12-profit',
  'S8-VXR15-profit',
  'S8-V25-robust'
] as const;
// every holder is bootstrapped against these on identical periods (PROTOCOL.md §9)
export const bootstrapComparators = ['S8-VG2-balanced', 'S8-VG1-profit', 'B1', 'B5'] as const;

// the union of symbols any Phase B door may need
export const allSymbols = bookOrderOf([
  ...new Set([...Object.values(tracks).flatMap((t) => t.books), ...frozenPools.B5])
]);

// §3.3 the user's robustness preference: a post-fitness reporting filter on the decisive 3 × 128 instruments, never a
// change to the optimizer, the constraints or the mechanical ranking
export const preferenceBands = {
  preferred: 0.95,
  conditional: 0.93, // 93% ≤ share < 95%: only with the compelling case below
  diagnostic: 0.9 // 90% ≤ share < 93%: qualifies mechanically, never the preferred selection
};
// The predeclared "compelling case" for the conditional band (report-only; PROTOCOL.md §9.2): every item must hold.
export const compellingCase = {
  robustAdvantageAbsolute: 3000, // training confirmation robust/yr ≥ VG #2's + max($3,000, 10%)
  robustAdvantageRelative: 0.1,
  maxRunDd: 33000, // whole-run centre minute DD and test-family p90 DD below $33,000
  requireEveryFamily: true, // every confirmation and every test family passes on its own
  requireInBox: true,
  requireStresses: true,
  requireTestNotWorse: true // F24 test-window centre net and test-family median ≥ VG #2's
};

// PROTOCOL.md §9.3 (review V4): the predeclared contribution and fill criteria of "economically compelling",
// read from the post-test diagnostics record (report-only)
export const economicCriteria = {
  everyBookPositiveLeaveOneOut: true, // each book's whole-run leave-one-out net contribution > 0 (conditional)
  maxFillsBelowNotionalShare: 0.1, // ≤ 10% of fills on a bar whose dollar volume is below the $100k notional
  missingFillBars: 0 // every fill bar present in the raw minute file
};

export const bandOf = (share: number) =>
  !(share >= preferenceBands.diagnostic)
    ? 'below 90% (fails C2/Q2/T2)'
    : share >= preferenceBands.preferred
      ? 'preferred (≥ 95%)'
      : share >= preferenceBands.conditional
        ? 'conditional (93–95%)'
        : 'diagnostic (90–93%)';

// §2.3 the numeric rulebook sealed at the freeze and in FROZEN_SELECTION.json; every door re-checks it.
export const constantsSnapshot = () => ({
  studyName,
  execution,
  eligibility,
  testGates,
  insufficientTestLots,
  schedule,
  dimensionScale: Object.fromEntries(trackKeys.map((key) => [key, dimensionScale(tracks[key].books.length)])),
  stresses,
  executionSettings,
  bootstrap,
  folds,
  windows,
  episodeGap,
  radius,
  tracks,
  searchJobs,
  frozenPools,
  study8Holders,
  qualifyControlKeys,
  testControlKeys,
  testControlKeysF24,
  bootstrapComparators,
  preferenceBands,
  compellingCase,
  economicCriteria,
  doors: { projectionRoot, projectionEnd, canonicalRoot, evaluationEnd, sliceDate, testOrder }
});

export const seedOf = (...labels: (string | number)[]) => [studyName, ...labels] as (string | number)[];
export const nowIso = () => new Date().toISOString();
