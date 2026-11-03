// Study d1-all61-signal-capital-complementarity-v1 (research/d1-all61-signal-capital-complementarity): when do the
// existing, fixed D1 mechanisms of the 61 audited ETFs offer opportunities, how do they overlap in time with each
// other and with the B4/B5 shared slot, and does any of them help under one shared $100,000 slot. Every constant of
// PROTOCOL.md is declared here so the code and the protocol can be compared line by line; the file is bound by the
// code freeze.
import os from 'node:os';
import path from 'node:path';

export { jsonReplacer, nowIso, readJson, writeJson, writeText } from '../portfolio-aware-d1/context.ts';

// D1_COMPLEMENTARITY_ROOT redirects the study's files to a scratch tree for the tests only; it is honoured only inside
// the operating system's temporary directory and every write-once stage refuses it.
const inTemp = (value: string | undefined) =>
  value && path.resolve(value).startsWith(path.resolve(os.tmpdir())) ? value : undefined;

export const testRoot = inTemp(process.env.D1_COMPLEMENTARITY_ROOT);
export const dataRoot = 'data';
export const researchRoot = testRoot
  ? path.join(testRoot, 'research')
  : 'research/d1-all61-signal-capital-complementarity';
export const resultsRoot = path.join(researchRoot, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const evaluationsRoot = testRoot ? path.join(testRoot, 'evaluations') : 'evaluations/d1-signal-complementarity';
export const codeRoot = 'src/d1-signal-capital-complementarity';
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const protocolFreezeFile = path.join(researchRoot, 'PROTOCOL_FREEZE.json');
export const codeFreezeFile = resultFile('code_freeze.json');
export const amendmentsFile = resultFile('amendments.jsonl');
export const briefFile = path.join(researchRoot, 'brief', 'STUDY_2_BRIEF.md');
export const scriptName = 'd1-signal-complementarity';

export const log = (line: string) => console.info(`[${scriptName}] ${line}`);

export const study = {
  id: 'd1-all61-signal-capital-complementarity-v1',
  node: 'v24.21.0',
  firstSession: '2016-01-04',
  armingDate: '2017-06-15', // every book arms here; accounting from the 2016-01-04 close (the source convention)
  researchCap: '2023-12-29', // no Study 2 run reads a bar after this session
  principal: 100000,
  rate: 0.11,
  costBps: 5, // baseline modelled friction per side
  costGrid: [0, 2, 5, 10] as const, // Level C: every cost fully re-simulated
  stress: { id: 's25', costBps: 5, stopSlippageBps: 25 }, // the existing adverse stop-overshoot scenario
  ddReference: 35000, // historical research reference for the fixed slot's minute drawdown (not a stop)
  portfolio: { initial: { voog: 180000, vgt: 120000 }, fraction: 0.2, preferred: 0.3, conditional: 0.35 },
  // §3.1: the standalone audit's F7 liquidity/coverage flag (coverage < 0.75 or median dollar volume < $50M)
  f7: ['DBC', 'EDV', 'ILF', 'IYT', 'KIE', 'VOOG', 'VPU'] as readonly string[]
} as const;

// ----- the source records this study reads (read-only) -----

export const source = {
  universeFile: 'research/d1-ranked-preemption/results/audit/universe.json',
  standalone: (fold: SourceFold, symbol: string) => `research/d1-ranked-preemption/standalone/${fold}/${symbol}.json`,
  studyOneSelection: (fold: 'A' | 'B') =>
    `research/d1-wide-library-chronological-selection/results/libraries/${fold}/SELECTION.json`,
  ranking: (fold: SourceFold, metric: 'R1' | 'R2') => `research/d1-ranked-preemption/rankings/${fold}/${metric}.json`,
  validation: (fold: 'fold-a' | 'fold-b') =>
    `research/d1-ranked-preemption/results/walkforward/${fold}/VALIDATION.json`,
  standaloneFoldRuns: 'research/d1-standalone-etf-opportunity-audit/results/runs/fold.jsonl',
  pools: { B4: 'config/pools/B4.json', B5: 'config/pools/B5.json' },
  vgtPhenotype: 'config/phenotypes/D1/VGT.json',
  prospectiveFreeze: 'research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json'
};

export type SourceFold = 'fold-a' | 'fold-b' | 'final';

// ----- windows (PROTOCOL.md §3.2) -----

export type WindowKey = 'T' | 'A' | 'B' | 'preA' | 'preB';

export interface WindowSpec {
  key: WindowKey;
  label: string;
  firstDecision: string; // first session whose decisions belong to the window
  dataEnd: string; // the loader stops here; the window's last session
  boundary?: string; // the session whose close starts the window's marks (none: the whole run)
}

export const windows: Record<WindowKey, WindowSpec> = {
  T: { key: 'T', label: 'training era 2017-06-15 → 2023-12-29', firstDecision: '2017-06-15', dataEnd: '2023-12-29' },
  A: {
    key: 'A',
    label: 'fold A 2020-07-01 → 2021-12-31',
    firstDecision: '2020-07-01',
    dataEnd: '2021-12-31',
    boundary: '2020-06-30'
  },
  B: {
    key: 'B',
    label: 'fold B 2022-01-03 → 2023-12-29',
    firstDecision: '2022-01-03',
    dataEnd: '2023-12-29',
    boundary: '2021-12-31'
  },
  preA: { key: 'preA', label: 'fold A screen → 2020-06-30', firstDecision: '2017-06-15', dataEnd: '2020-06-30' },
  preB: { key: 'preB', label: 'fold B screen → 2021-12-31', firstDecision: '2017-06-15', dataEnd: '2021-12-31' }
};

export const dataEnds = ['2020-06-30', '2021-12-31', '2023-12-29'] as const;
export type DataEnd = (typeof dataEnds)[number];

// ----- views (PROTOCOL.md §4) -----

export type ViewKey = 'U' | 'P-A' | 'P-B' | 'P-F';

// The registered VGT primary vector (config/phenotypes/D1/VGT.json, candidate d1-ebc9f639b3), in grid units.
export const vgtPrimaryGrid = {
  targetPercentChange: 216,
  trailingBuyPercentage: 3,
  trailingStopPercentage: 73,
  maximumHoldDays: 8,
  tickWindowSize: 74,
  intradayLossBuffer: 29,
  pullback: 90,
  continuationWindow: 60
} as const;

// The data end each provenance may read (PROTOCOL.md §3.3).
export const caps: Record<ViewKey | 'I', string> = {
  U: '2023-12-29',
  'P-A': '2021-12-31',
  'P-B': '2023-12-29',
  'P-F': '2023-12-29',
  I: '2023-12-29'
};

// Which (view, window) pairs are computed from the runs of each data end.
export const viewWindows: { view: ViewKey; window: WindowKey; dataEnd: DataEnd }[] = [
  { view: 'U', window: 'preA', dataEnd: '2020-06-30' },
  { view: 'P-A', window: 'preA', dataEnd: '2020-06-30' },
  { view: 'U', window: 'A', dataEnd: '2021-12-31' },
  { view: 'U', window: 'preB', dataEnd: '2021-12-31' },
  { view: 'P-A', window: 'A', dataEnd: '2021-12-31' },
  { view: 'P-B', window: 'preB', dataEnd: '2021-12-31' },
  { view: 'U', window: 'T', dataEnd: '2023-12-29' },
  { view: 'U', window: 'B', dataEnd: '2023-12-29' },
  { view: 'P-B', window: 'B', dataEnd: '2023-12-29' },
  { view: 'P-F', window: 'T', dataEnd: '2023-12-29' }
];

// The view-windows that get 61×61 matrices (PROTOCOL.md §6.3).
export const matrixViews: { view: ViewKey; window: WindowKey }[] = [
  { view: 'U', window: 'T' },
  { view: 'U', window: 'A' },
  { view: 'U', window: 'B' },
  { view: 'P-A', window: 'A' },
  { view: 'P-B', window: 'B' },
  { view: 'P-F', window: 'T' }
];

export const viewLabel = (view: ViewKey) =>
  view === 'U'
    ? 'View U (VGT primary on every ETF)'
    : view === 'P-A'
      ? 'View P fold-a A0 nominees'
      : view === 'P-B'
        ? 'View P fold-b A0 nominees'
        : 'View P final-window survivors (in-sample context)';

// ----- incumbents -----

export type BaselineKey = 'B4' | 'B5';
export const baselines: readonly BaselineKey[] = ['B4', 'B5'];
export const members: Record<BaselineKey, readonly string[]> = {
  B4: ['VGT', 'XBI', 'XRT', 'KRE'],
  B5: ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']
};
// VOOG is never a Level C candidate (PROTOCOL.md §4).
export const levelCExcluded = ['VOOG'];

// ----- Level D definitions (PROTOCOL.md §6) -----

export const levelD = {
  tolerances: [
    { key: 'minute', label: 'exact minute', sessions: 0, exactMinute: true },
    { key: 'session', label: 'same session', sessions: 0, exactMinute: false },
    { key: 's5', label: '±5 sessions', sessions: 5, exactMinute: false },
    { key: 's20', label: '±20 sessions', sessions: 20, exactMinute: false }
  ] as const,
  lagTolerance: 's20',
  familyWindow: 10, // cross-ETF families: anchor window in sessions (primary)
  familyWindowSensitivity: [5, 20] as const,
  episodeWindow: 20, // within-ETF signal episodes: anchor window in sessions
  independentGap: 252, // independent events: family anchors at least this many sessions apart
  marketWide: 10, // a family with at least this many distinct ETFs
  shockRegimes: ['G2', 'G4', 'G7', 'G10', 'G12'] as readonly string[]
};

// ----- Level C screen (PROTOCOL.md §7.1) -----

export const screen = {
  minDecisions: 4,
  minYears: 2,
  minClean: 2,
  ddCeiling: 35000,
  ncMinClean: 1,
  folds: { A: { cutoff: '2020-06-30', window: 'A' as const }, B: { cutoff: '2021-12-31', window: 'B' as const } }
};

export type FoldKey = 'A' | 'B';
export const foldKeys: readonly FoldKey[] = ['A', 'B'];
export const preWindowOf = (fold: FoldKey): WindowKey => (fold === 'A' ? 'preA' : 'preB');
export const pViewOf = (fold: FoldKey): ViewKey => (fold === 'A' ? 'P-A' : 'P-B');
export const sourceFoldOf = (fold: FoldKey): SourceFold => (fold === 'A' ? 'fold-a' : 'fold-b');

// ----- rubric (PROTOCOL.md §9) -----

export const rubric = {
  minClean: 2,
  minIndependent: 2,
  minDecisionsU: 4,
  minDecisionsP: 2,
  competingShare: 0.5,
  complementShare: 0.5,
  ddReference: 35000,
  portfolioConditional: 0.35,
  portfolioPreferred: 0.3,
  coreLimitedSlack: 0.01
};
