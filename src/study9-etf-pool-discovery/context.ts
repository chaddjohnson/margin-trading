// Study 9, Phase A constants (research/study9-etf-pool-discovery/PROTOCOL.md; section numbers in the comments).
// Nothing here reads market data. Execution, eligibility, radius, box and the fitness are Study 8's, imported
// unchanged; only the study namespace, the data door, the discovery budgets and the seed labels are new.
import path from 'node:path';
import { clusters as repositoryClusters } from '../d1-standalone-opportunity-audit/context.ts';
import {
  eligibility as s8Eligibility,
  execution as s8Execution,
  radius as s8Radius,
  stresses as s8Stresses
} from '../study8-expanded-regime-d1/context.ts';

export const studyName = 'study9-etf-pool-discovery';
export const studyDir = 'research/study9-etf-pool-discovery';
export const codeDir = 'src/study9-etf-pool-discovery';
// Smoke mode (PROTOCOL.md header): a pre-freeze code-path test at toy budgets, writing only to a scratch folder
// outside the study; its outputs are never read for any decision and are deleted. Real stages refuse it.
export const smoke = process.env.STUDY9_SMOKE === '1';
const smokeDir = process.env.STUDY9_SMOKE_DIR ?? '';

if (smoke && (!smokeDir || path.resolve(smokeDir).startsWith(path.resolve(studyDir)))) {
  throw new Error('STUDY9_SMOKE needs STUDY9_SMOKE_DIR outside the study folder');
}

export const resultsDir = smoke ? smokeDir : path.join(studyDir, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsDir, ...parts);
export const protocolFile = path.join(studyDir, 'PROTOCOL.md');
export const amendmentsFile = path.join(studyDir, 'AMENDMENTS.md');
export const chainFile = resultFile('chain.jsonl');
export const doorsLog = resultFile('doors.jsonl');
export const cacheDir = resultFile('cache'); // git-ignored; retention policy in PROTOCOL.md §9

// §3 data. The canonical files stay in data/<SYMBOL>/data.csv; every Phase A computation reads the physically
// truncated training projection (bytes through the last bar of New York date 2024-12-31), never data/.
export const canonicalRoot = 'data';
export const priorVintageRoot = 'data/vintages/pre-study9-2026-11-02';
export const refreshRoot = 'data/vintages/study9-refresh-2026-11-02';
export const projectionRoot = 'data/vintages/study9-train-2024';
export const universeRegistry = 'research/d1-robust-pool-discovery/results/audit/universe.json';
export const latestCompleteSession = '2026-10-30'; // S0: the latest complete US session of the refresh (Friday)

// §4 chronology (Study 8 conventions): accounting from the close of the first session, arming 2017-06-15.
export const firstSession = '2016-01-04';
export const trainEnd = '2024-12-31'; // the only door Phase A opens
export const exposedSlice = { first: '2025-01-02', last: '2026-10-29' }; // retrospective only, never opened here
export const laterSlice = { first: '2026-10-30', last: latestCompleteSession }; // separate later slice, never opened

export const execution = s8Execution; // $100,000 fixed slot, 11% simple (365 d), 5 bps per side, stop fill
export const eligibility = s8Eligibility; // C1–C7 thresholds, unchanged
export const radius = s8Radius; // N1 radius (grid units): X ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10, P ±10, W ±20
export const stresses = s8Stresses; // Q7 gating stresses: 10 bps, 14%, next-open stops, +25 bps stop slippage

// §5 S0 eligibility (the d1-robust D1–D5 rules, re-dated to this refresh)
export const s0Rules = {
  expectedFirstDate: firstSession,
  expectedLastDate: latestCompleteSession,
  minimumMedianDollarVolume: 10_000_000, // D5, on the training window
  minimumMedianCoverage: 0.25, // D5
  splitSizedMove: 0.3, // D3
  auditMove: 0.15, // listed (training window only)
  sparseCoverage: 0.5 // a session with < 50% of its scheduled regular minutes is "sparse"
};

// The repository's economic-exposure clusters (src/d1-standalone-opportunity-audit/context.ts), unchanged.
export const clusters = repositoryClusters;
export const clusterOf = (symbol: string) =>
  Object.entries(clusters).find(([, members]) => members.includes(symbol))?.[0] ?? 'none';

// §6 the four VGT/GDX families
export const anchorV = 'VGT';
export const anchorG = 'GDX';
export type Family = 'V' | 'G' | 'VG' | 'N';
export const families: readonly Family[] = ['V', 'G', 'VG', 'N'];
export const familyOf = (symbols: readonly string[]): Family => {
  const v = symbols.includes(anchorV);
  const g = symbols.includes(anchorG);

  return v && g ? 'VG' : v ? 'V' : g ? 'G' : 'N';
};
export const poolSizes = [2, 3, 4, 5] as const;

// Seeds: every random stream is deriveSeed(studyName, …labels); the labels are listed in PROTOCOL.md §7.
export const seedOf = (...labels: (string | number)[]) => [studyName, ...labels] as (string | number)[];

// Periods inside one continuous training run (attributions: mark at the period's last close − mark before it).
export const trainingYears = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024] as const;
export const foldEnds = {
  F19: '2019-12-31',
  F20: '2020-12-31',
  F21: '2021-12-31',
  F22: '2022-12-30',
  F23: '2023-12-29',
  F24: '2024-12-31'
} as const;
export const periodList: { key: string; start: string; end: string }[] = [
  { key: 'TRAIN', start: s8Execution.eligibilityDate, end: trainEnd },
  { key: 'EARLY', start: s8Execution.eligibilityDate, end: '2020-12-31' }, // time-split diagnostic TD1, first half
  { key: 'LATE', start: '2021-01-01', end: trainEnd }, // TD1 second half
  ...Object.entries(foldEnds).map(([key, end]) => ({ key: `TO-${key}`, start: s8Execution.eligibilityDate, end })),
  ...trainingYears.map((year) => ({
    key: String(year),
    start: year === 2017 ? s8Execution.eligibilityDate : `${year}-01-01`,
    end: `${year}-12-31`
  })),
  ...trainingYears.flatMap((year) => [
    { key: `${year}H1`, start: year === 2017 ? s8Execution.eligibilityDate : `${year}-01-01`, end: `${year}-06-30` },
    { key: `${year}H2`, start: `${year}-07-01`, end: `${year}-12-31` }
  ]),
  { key: 'M2020', start: '2020-02-15', end: '2020-04-30' }, // the COVID crash (concentration diagnostic)
  { key: 'R2022', start: '2022-01-01', end: '2022-12-31' } // the 2022 bear market (concentration diagnostic)
];

export const nowIso = () => new Date().toISOString();
