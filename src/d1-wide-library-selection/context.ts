// Study d1-wide-library-chronological-selection-v1 (research/d1-wide-library-chronological-selection): broad,
// behaviourally diverse standalone D1 libraries and chronology-aware selection procedures, compared fold by fold on
// the canonical engine. Every constant of PROTOCOL.md is declared here so the code and the protocol can be compared
// line by line; the file is bound by the protocol freeze.
import os from 'node:os';
import path from 'node:path';

export { formatDollars, jsonReplacer, nowIso, readJson, writeJson, writeText } from '../portfolio-aware-d1/context.ts';

// D1_LIBRARY_STUDY_ROOT and D1_LIBRARY_STUDY_DATA redirect the study's files and the canonical data to a scratch tree
// for the tests only; they are honoured only inside the operating system's temporary directory, and every stage
// refuses them outright (freeze.ts refuseOverrides, called by requireFrozen/requireCodeFrozen); there is no other mode.
const inTemp = (value: string | undefined) =>
  value && path.resolve(value).startsWith(path.resolve(os.tmpdir())) ? value : undefined;

export const testRoot = inTemp(process.env.D1_LIBRARY_STUDY_ROOT);
export const testData = inTemp(process.env.D1_LIBRARY_STUDY_DATA);
export const dataRoot = testData ?? 'data';
export const researchRoot = testRoot
  ? path.join(testRoot, 'research')
  : 'research/d1-wide-library-chronological-selection';
export const resultsRoot = path.join(researchRoot, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const evaluationsRoot = testRoot ? path.join(testRoot, 'evaluations') : 'evaluations/d1-wide-library-selection';
export const codeRoot = 'src/d1-wide-library-selection';
export const contextFile = path.join(codeRoot, 'context.ts');
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const rulesFile = path.join(researchRoot, 'LIBRARY_SELECTION_RULES.md');
export const matrixFile = path.join(researchRoot, 'EXPERIMENT_MATRIX.json');
export const protocolFreezeFile = path.join(researchRoot, 'PROTOCOL_FREEZE.json');
export const briefFile = path.join(researchRoot, 'brief', 'BRIEF.md');

export const log = (line: string) => console.info(`[d1-library-study] ${line}`);

// ----- the source study (read-only) -----

export const source = {
  root: 'research/d1-ranked-preemption',
  standaloneRoot: 'research/d1-ranked-preemption/standalone',
  universeFile: 'research/d1-ranked-preemption/results/audit/universe.json',
  stageA: (window: SourceWindow) => `research/d1-ranked-preemption/results/standalone/${window}/STAGE_A.json`,
  archive: (window: SourceWindow) => `research/d1-ranked-preemption/results/standalone/${window}/archive.jsonl.gz`,
  controls: (window: SourceWindow) => `research/d1-ranked-preemption/results/controls/${window}/CONTROLS.json`,
  validation: (fold: 'fold-a' | 'fold-b') =>
    `research/d1-ranked-preemption/results/walkforward/${fold}/VALIDATION.json`,
  seedLabel: 'd1-ranked-preemption', // the source's neighbourhood stream (its J_nb draws)
  // the latest date a source vector of each window may be evaluated on (its own door, PROTOCOL.md §4.4 there)
  evaluationCap: { 'fold-a': '2021-12-31', 'fold-b': '2023-12-29', final: '2023-12-29' } as Record<SourceWindow, string>
};

export type SourceWindow = 'fold-a' | 'fold-b' | 'final';
export const sourceWindows: readonly SourceWindow[] = ['fold-a', 'fold-b', 'final'];

// ----- the study -----

export const study = {
  id: 'd1-wide-library-chronological-selection-v1',
  seedLabel: 'd1-wide-library-v1',
  firstSession: '2016-01-04',
  armingDate: '2017-06-15', // books arm here; accounting from the 2016-01-04 close (the source's convention)
  researchCap: '2023-12-29', // no bar after this session is read for any candidate of this study
  fullHistoryEnd: '2026-10-13', // the unchanged incumbents' anchors only
  principal: 100000,
  rate: 0.11,
  costBps: 5, // baseline modelled friction per side (not a commission)
  costGrid: [0, 2, 5, 10] as const, // every reported nominee is re-simulated at each
  ddCeiling: 35000, // primary fixed minute-drawdown ceiling per $100,000 lot
  ddPenaltyFrom: 20000, // J_s and T: dollar-for-dollar drawdown penalty above this
  worstLossFrom: 10000, // T: dollar-for-dollar penalty on the worst lot's loss beyond this
  tradesFloor: 4, // credible: trades ≥ max(floor, ⌈eligible years⌉) (the source's rule)
  node: 'v24.21.0'
} as const;

// ----- folds (PROTOCOL.md §3) -----

export type FoldKey = 'A' | 'B' | 'S18' | 'S19' | 'S20' | 'S22';
// ARCH-S is a descriptive budget-matched ablation (the first 1,024 archived Sobol rows); it enters no verdict.
export type PoolKey = 'ARCH' | 'ARCH-S' | 'NEW' | 'NEW-S' | 'ALL';
export const verdictPools: readonly PoolKey[] = ['ARCH', 'NEW', 'NEW-S', 'ALL'];

export interface Fold {
  key: FoldKey;
  label: string;
  primary: boolean;
  cutoff: string; // the last session any search, library or training-only selection of the fold may read
  evaluationEnd: string; // the last session of the fold's chronological evaluation window
  sourceWindow?: SourceWindow; // the source window whose archive is this fold's ARCHIVE pool
  pools: readonly PoolKey[];
  drawStage: string; // the neighbourhood stream's stage label
  selectionEnd?: string; // T2 only: the end of the intermediate selection window inside the evaluation window
}

export const folds: Record<FoldKey, Fold> = {
  A: {
    key: 'A',
    label: 'Fold A',
    primary: true,
    cutoff: '2020-06-30',
    evaluationEnd: '2021-12-31',
    sourceWindow: 'fold-a',
    pools: ['ARCH', 'ARCH-S', 'NEW', 'NEW-S', 'ALL'],
    drawStage: 'standalone:fold-a'
  },
  B: {
    key: 'B',
    label: 'Fold B',
    primary: true,
    cutoff: '2021-12-31',
    evaluationEnd: '2023-12-29',
    sourceWindow: 'fold-b',
    pools: ['ARCH', 'ARCH-S', 'NEW', 'NEW-S', 'ALL'],
    drawStage: 'standalone:fold-b',
    selectionEnd: '2022-12-30'
  },
  S18: {
    key: 'S18',
    label: 'Supplementary 2019',
    primary: false,
    cutoff: '2018-12-31',
    evaluationEnd: '2019-12-31',
    pools: ['NEW'],
    drawStage: 'd1-wide-library:S18'
  },
  S19: {
    key: 'S19',
    label: 'Supplementary 2020',
    primary: false,
    cutoff: '2019-12-31',
    evaluationEnd: '2020-12-31',
    pools: ['NEW'],
    drawStage: 'd1-wide-library:S19'
  },
  S20: {
    key: 'S20',
    label: 'Supplementary 2021',
    primary: false,
    cutoff: '2020-12-31',
    evaluationEnd: '2021-12-31',
    pools: ['NEW'],
    drawStage: 'd1-wide-library:S20'
  },
  S22: {
    key: 'S22',
    label: 'Supplementary 2023',
    primary: false,
    cutoff: '2022-12-30',
    evaluationEnd: '2023-12-29',
    pools: ['NEW'],
    drawStage: 'd1-wide-library:S22'
  }
};

export const foldKeys: readonly FoldKey[] = ['A', 'B', 'S18', 'S19', 'S20', 'S22'];
export const primaryFolds: readonly FoldKey[] = ['A', 'B'];
export const supplementaryFolds: readonly FoldKey[] = ['S18', 'S19', 'S20', 'S22'];

// The rolling one-year track (supplementary, NEW pool): S18 → 2019, S19 → 2020, S20 → 2021, B's 2022 selection
// window (S21, derived from fold B's NEW pool, no extra search), S22 → 2023.
export const rollingTrack = ['S18', 'S19', 'S20', 'S21', 'S22'] as const;

// ----- nested triples (PROTOCOL.md §6) -----

export type TripleKey = 'T1' | 'T2';

export interface Triple {
  key: TripleKey;
  fold: FoldKey;
  selectionEnd: string; // the intermediate selection window is (cutoff, selectionEnd]
  laterEnd: string; // the later assessment window is (selectionEnd, laterEnd]
  pools: readonly PoolKey[];
  primary: boolean;
}

export const triples: Record<TripleKey, Triple> = {
  // T1's later window (2022–2023) is past the source's fold-a door (2021-12-31): only this study's new candidates
  T1: {
    key: 'T1',
    fold: 'A',
    selectionEnd: '2021-12-31',
    laterEnd: '2023-12-29',
    pools: ['NEW', 'NEW-S'],
    primary: true
  },
  T2: {
    key: 'T2',
    fold: 'B',
    selectionEnd: '2022-12-30',
    laterEnd: '2023-12-29',
    pools: ['ARCH', 'NEW', 'NEW-S', 'ALL'],
    primary: false
  }
};

export const tripleKeys: readonly TripleKey[] = ['T1', 'T2'];

// ----- arms, library sizes, the NEW-SEARCH budget (PROTOCOL.md §5–§7) -----

export type ArmKey = 'A0' | 'A0r' | 'A1' | 'A1n' | 'A2' | 'A3' | 'A4';
// A1n: the descriptive "more trials without diversity" ablation (top-K credible by J_s, distinct signatures, no family
// deduplication, A1's nominee rule); it enters no verdict.
export const trainingArms = ['A0r', 'A1', 'A2', 'A3'] as const;
export type TrainingArm = (typeof trainingArms)[number];
export const broadArms = ['A1', 'A2', 'A3'] as const;
export type BroadArm = (typeof broadArms)[number];
export const libraryArms = ['A1', 'A1n', 'A2', 'A3'] as const;
export type LibraryArm = (typeof libraryArms)[number];

export const libraryKs = [8, 16, 32, 64] as const;
export type LibraryK = (typeof libraryKs)[number];
export const primaryK: LibraryK = 16;

export const rules = {
  // families: bounded-diameter (complete-linkage) clustering of credible trade paths
  familyDiameter: 0.5, // every pair inside a family has path distance ≤ this
  entryTolerance: 3, // sessions: two entries match if they are at most this far apart
  // A0 / A0r (the source's narrow rule, PROTOCOL.md §6.2–§6.3 there)
  narrowChecked: 8, // top credible vectors by J_s with distinct trade signatures, neighbourhood-checked
  narrowLibraryMax: 4,
  narrowLibraryPool: 32,
  narrowJaccard: 0.5,
  // draws (the source instrument: N1 = every coordinate −u/0/+u, N1A2 = double amplitude)
  draws: 16, // A0r, A1, A2: N1 draws 0..15
  a3Draws: 32, // A3: N1 draws 0..31
  a3DrawsA2: 16, // A3: N1A2 draws 0..15
  // A2 eligibility: entries in at least this many distinct calendar years of the training window
  a2MinEntryYears: 2,
  // A3 neighbourhood-risk filters
  a3ProfitableShare: 0.75,
  a3DdShare: 0.75,
  a3WorstLot: -15000,
  a3MinFamilies: 2, // entries attributed to at least this many distinct eligible training catalog families
  a3Quantile: 0.25,
  // support (order-independent): credible Sobol vectors of the pool within the family diameter of the medoid
  supportRadius: 0.5,
  // A4 (nested): the A2(K) library; pick the largest selection-window V with these filters
  a4MinLots: 1,
  a4DdCeiling: 35000,
  // across-ETF nominees advanced per procedure (standalone slots, each its own $100,000 lot)
  acrossN: 5,
  archSobolRows: 1024 // ARCH-S: the archived Sobol rows with origin index 0..1023
} as const;

export const newSearch = {
  sobol: 1024, // new space-filling candidates per ETF and fold (one paired design per ETF across folds)
  refinements: 128, // training-only refinement evaluations per ETF and fold, at most
  starts: { score: 4, support: 2, downside: 2 }, // family quotas for the refinement starts
  movesPerRound: 8, // of which 6 single-coordinate moves of ±1..3 step units and 2 joint ±1-unit moves
  singleMoves: 6,
  rounds: 2,
  attempts: 20 // duplicate-avoiding attempts per move
} as const;

// ----- the NEW-SEARCH feasibility triggers (training-only; PROTOCOL.md §5) -----

export const triggers = {
  minFamilies: 12, // T-a: fewer than this many credible families …
  shareOfEtfs: 0.2, // … for more than this share of ETFs
  dominanceTop: 32, // T-b: among the top 32 credible vectors by J_s …
  dominanceShare: 0.5 // … one family holds at least half, in more than shareOfEtfs of ETFs
} as const;

// ----- the predeclared decision rules (PROTOCOL.md §9) -----

export const decision = {
  breachTolerance: 1, // favourable: the arm's evaluation-window DD breaches ≤ the baseline's + this
  riskIncompatible: 3, // risk-incompatible: breaches ≥ the baseline's + this
  requiredKs: [8, 16] as const, // improves/worse: both folds at K = 8 and K = 16 …
  oneOfKs: [32, 64] as const, // … and at one of K = 32, 64 (32 and 64 are often saturated)
  rollingMajority: 3, // of the five rolling years
  // insufficient evidence (the cell is neither favourable nor unfavourable)
  minDiffering: 10, // W + L
  minClusterDiffering: 5, // CW + CL
  minActive: 10, // ETFs with V ≠ 0, for the arm and (separately) for the baseline
  minWindowFamilies: 10 // eligible catalog families with a trough inside the window, all 61 ETFs together
} as const;

// ----- the episode catalog (the standalone audit's, unchanged) -----

export { episodes } from '../d1-standalone-opportunity-audit/context.ts';

// Exposure clusters (the standalone audit's predeclared list, unchanged): the unit for cross-ETF consistency.
export { clusterOf, clusters } from '../d1-standalone-opportunity-audit/context.ts';

// ----- references on matching windows (unchanged; context only) -----

export const vgtPrimary = {
  symbol: 'VGT',
  id: 'VGT-primary',
  file: 'config/phenotypes/D1/VGT.json',
  grid: {
    targetPercentChange: 216,
    trailingBuyPercentage: 3,
    trailingStopPercentage: 73,
    maximumHoldDays: 8,
    tickWindowSize: 74,
    intradayLossBuffer: 29,
    pullback: 90,
    continuationWindow: 60
  }
} as const;

export const fullHistoryAnchors = { S: 176260.47, B4: 284244.74, B5: 486207.77 } as const;

// Credible-trade floor of a training window (the source's rule).
export const minimumTrades = (eligibleYears: number) => Math.max(study.tradesFloor, Math.ceil(eligibleYears - 1e-9));
