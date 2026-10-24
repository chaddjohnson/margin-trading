// The complementary-ETF D1 study (research/complementary-etf-d1): can one or two further ETFs, each with its own
// defensibly optimized D1 phenotype, add executable shared-pool value to the frozen All-lowDd shadow allocator?
// Every constant of PROTOCOL.md is declared here, so the code and the protocol can be compared line by line.
//
// Three stages, each reading only what it may:
//   A  a descriptive, daily-proxy opportunity screen of seven candidates on the training partition only, against the
//      exact pool occupancy of the All-lowDd training run; selects at most two;
//   B  the eight-ETF D1 search (src/multi-etf-d1: Sobol + chronological NSGA-II + plateau rule, unchanged budget) on
//      the canonical training partition of each selected ETF, plus a predeclared cost gate; frozen before anything
//      later is read;
//   C  the frozen All-lowDd allocator with the frozen candidates added as further books, one continuous `all` run per
//      predeclared scenario in both accounting modes and four cost levels, attributed to the partitions.
import path from 'node:path';
import fs from 'fs-extra';

export const researchRoot = 'research/complementary-etf-d1';
export const resultsRoot = path.join(researchRoot, 'results');
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const protocolFile = path.join(researchRoot, 'PROTOCOL.md');
export const protocolFreezeFile = stageDir('protocol_freeze.json');
export const frozenCandidatesFile = path.join(researchRoot, 'FROZEN_CANDIDATES.json');

// The 16 canonical symbols the corporate-action and data audit covers (data/<SYMBOL>/data.csv).
export const auditSymbols = [
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

// The screened candidates: four high-priority, three lower-priority (PROTOCOL.md §3). Nothing else is screened.
export const highPriority = ['GDX', 'XOP', 'EWZ', 'TLT'] as const;
export const lowerPriority = ['XLE', 'XLU', 'GLD'] as const;
export const candidates = [...highPriority, ...lowerPriority] as const;
export type Candidate = (typeof candidates)[number];

// The frozen allocator's books and core, read for overlap and correlation only.
export const baselineBooks = ['VGT', 'XBI', 'XRT', 'KRE'] as const;
export const coreSymbols = ['VOOG', 'VGT'] as const;

export const isCandidate = (value: string): value is Candidate => candidates.includes(value as Candidate);

export const study = {
  version: 'complementary-etf-d1-v1',
  eligibilityDate: '2017-06-15', // the D1 convention of every earlier program (session 365 of each canonical file)
  trainingEnd: '2023-12-31', // data/partitions.json training end; the last training session is 2023-12-29
  rate: 0.11,
  principal: 100000,
  drawdownCeiling: 35000,
  costsBps: [0, 2, 5, 10],

  // ----- Stage A: the daily-proxy screen (PROTOCOL.md §3) -----
  screen: {
    lookback: 74, // sessions of reference high (D1's own L)
    lookbackSensitivity: 230, // the All-lowDd books' long lookback, reported only
    bands: [
      { label: '10–15%', min: 0.1, max: 0.15 },
      { label: '15–20%', min: 0.15, max: 0.2 },
      { label: '20–30%', min: 0.2, max: 0.3 },
      { label: '30%+', min: 0.3, max: Infinity }
    ],
    episodeStart: 0.1, // an episode opens when a session's low is 10% below the frozen reference high
    episodeRecovery: 0.05, // and closes at the first close within 5% of that reference high
    episodeMaxSessions: 250,
    // The proxy trade: arm when a session's low is ≥ armDepth below the L-session reference high; track the lowest
    // close since arming; buy at the close of the first session that closes ≥ rebound above it; sell at the close of
    // the session that closes ≤ stop below the entry close, or of the holdSessions-th session after entry. One
    // proxy at a time; after an exit, a new arming needs a session whose low is again ≥ armDepth below the then
    // reference high. Daily closes only: a proxy, not a D1 fill.
    proxies: [
      { key: 'p15', armDepth: 0.15, rebound: 0.02, stop: 0.1, holdSessions: 20, primary: true },
      { key: 'p20', armDepth: 0.2, rebound: 0.02, stop: 0.1, holdSessions: 20, primary: false }
    ],
    reboundHorizons: [5, 10, 20], // sessions after arming, retrospective diagnostics only
    costBps: 5, // per side, for the screen's economics
    // Gates (all must pass; data reliability is the audit's pass/fail) and the rubric's weights on rank scores.
    gates: {
      minProxyTrades: 5,
      minProxyYears: 3,
      minCleanProxies: 3,
      minMedianDollarVolume: 50e6
    },
    weights: { timing: 0.4, breadth: 0.3, economics: 0.3 },
    lowerPriorityMargin: 0.1, // a lower-priority ETF takes a slot only with a composite this much above
    redundancyCorrelation: 0.8, // two selections may not correlate above this (daily returns, training)
    maxSelections: 2
  },

  // ----- Stage B: the search and the freeze (PROTOCOL.md §4) -----
  costGate: {
    beatsControlAtBps: [2, 5], // nomination net above the frozen-D1 control's at the same cost
    positiveAtBps: 10,
    positiveWithoutBestTrade: true // the training net without its single best trade stays positive (0 bps)
  },

  // ----- Stage C: the incremental allocator tests (PROTOCOL.md §5–§6) -----
  acceptance: {
    fixedMateriality: 15000, // Δ fixed-pool net over the whole run at 0, 2 and 5 bps
    portfolioMateriality: 0.02, // Δ ending equity ÷ baseline ending equity at 5 bps
    minAddedLots: 5,
    minAddedYears: 3,
    netPerDrawdownShare: 0.95, // fixed net ÷ minute DD at least this share of the baseline's
    percentDrawdownIdeal: 0.3,
    percentDrawdownCeiling: 0.35,
    percentDrawdownTolerance: 0.01 // a 30–35% result may exceed the baseline's daily max % DD by at most 1 point
  },
  riskOnlyFractions: [0.1, 0.15, 0.2, 0.25] // the baseline ladder for the matched borrowing-dollar-days comparison
} as const;

// ----- helpers -----

export const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

export const hasFlag = (args: string[], name: string) => args.includes(`--${name}`);

export const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T;

export const writeJson = async (file: string, value: unknown) =>
  fs.outputFile(file, `${JSON.stringify(value, null, 1)}\n`);

export const writeText = async (file: string, text: string) =>
  fs.outputFile(file, text.endsWith('\n') ? text : `${text}\n`);

export const formatDollars = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const formatSigned = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : '+'}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const pct = (fraction: number, digits = 1) =>
  Number.isFinite(fraction) ? `${(fraction * 100).toFixed(digits)}%` : 'n/a';

export const log = (line: string) => console.info(`[complementary-etf-d1] ${line}`);

export const nowIso = () => new Date().toISOString();
