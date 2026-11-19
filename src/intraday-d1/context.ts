// Intraday D1 on VGT 1-minute bars (research/intraday-d1-vgt/PROTOCOL.md): the study's constants. Every threshold,
// budget, stress and gate that Study 8 executed is imported from Study 8's own context module, unchanged, so it cannot
// drift; this file adds only what a single-VGT intraday study needs: its name and paths, its data doors and their
// pins, its chronology, and the intraday parameter grid (PROTOCOL.md §4).
import path from 'node:path';
import {
  bootstrap as s8Bootstrap,
  eligibility as s8Eligibility,
  episodeGap as s8EpisodeGap,
  execution as s8Execution,
  executionSettings as s8ExecutionSettings,
  schedule as s8Schedule,
  stresses as s8Stresses,
  testGates as s8TestGates
} from '../study8-expanded-regime-d1/context.ts';

export const studyName = 'intraday-d1-vgt';
export const studyDir = path.join('research', studyName);
export const resultsDir = path.join(studyDir, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsDir, ...parts);
export const codeDir = 'src/intraday-d1';
export const protocolFile = path.join(studyDir, 'PROTOCOL.md');
export const frozenSelectionFile = path.join(studyDir, 'FROZEN_SELECTION.json');
export const doorsLog = resultFile('doors.jsonl');
export const symbol = 'VGT';

// Every seed: deriveSeed('intraday-d1-vgt', ...labels), Study 8's scheme in this study's namespace.
export const seedOf = (...labels: (string | number)[]) => [studyName, ...labels] as (string | number)[];

// §3 data doors. The development door reads ONLY this byte prefix of the canonical file (every row through
// 2024-12-31 New York time) and refuses unless its length and sha256 match; no later byte enters the process.
export const dataFile = 'data/VGT/data.csv';
export const developmentDoor = {
  end: '2024-12-31',
  prefixBytes: 42469694,
  prefixRows: 743918,
  prefixSha256: 'c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb',
  lastRowTime: '2024-12-31T21:11:00Z'
};
// The validation door (opened once, after the freeze): the whole canonical file as verified on 2026-11-02.
export const validationDoor = {
  start: '2025-01-01',
  fileSha256: '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e',
  fileRows: 935608,
  lastCompleteSession: '2026-10-30'
};

// §3 chronology: accounting from the close of the first session (2016-01-04), as in Study 8; one common arming date
// for every candidate (Study 8 used one common date, 2017-06-15, for its multi-ETF eligibility; here the earliest
// date with ≥ 10 sessions of history, covering the largest lookback of the grid).
export const chronology = {
  firstSession: '2016-01-04',
  armFrom: '2016-02-01',
  developmentEnd: '2024-12-31',
  developmentYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  validationYears: [2025, 2026]
};

// §5 execution: Study 8's conventions, unchanged ($100,000 notional per entry, 11% simple interest on a 365-day year by
// calendar days between session dates, 5 bps per side, stops at the stop level, no stop slippage).
export const execution = {
  principal: s8Execution.principal,
  rate: s8Execution.rate,
  costBps: s8Execution.costBps,
  stopFill: s8Execution.stopFill,
  stopSlippageBps: s8Execution.stopSlippageBps,
  drawdownCeiling: s8Execution.drawdownCeiling
};

export const eligibility = s8Eligibility;
export const testGates = s8TestGates;
export const schedule = s8Schedule;
export const stresses = s8Stresses;
export const executionSettings = s8ExecutionSettings;
export const bootstrap = s8Bootstrap;
export const studyEightEpisodeGap = s8EpisodeGap;
export const shortlistSize = s8Schedule.shortlist['V']!;

// §4 the intraday grid. A genome is one integer index per key; values come from these tables only.
export type Key =
  | 'periodMinutes'
  | 'targetPercentChange'
  | 'trailingBuyPercentage'
  | 'trailingStopPercentage'
  | 'maximumHoldMinutes'
  | 'lookbackMinutes'
  | 'intradayLossBuffer'
  | 'pullback'
  | 'continuationMinutes';

export const keys: readonly Key[] = [
  'periodMinutes',
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldMinutes',
  'lookbackMinutes',
  'intradayLossBuffer',
  'pullback',
  'continuationMinutes'
];

export interface AxisSpec {
  key: Key;
  short: string;
  unit: string;
  size: number; // grid points: indexes 0 .. size − 1
  radius: number; // neighbourhood radius in grid steps (Study 8's r)
  probes: number[]; // refinement probe offsets (Study 8: ±r/2, ±r)
  value: (index: number) => number;
  rationale: string;
}

const geometric = (base: number, ratio: number, digits: number) => (index: number) =>
  Number((base * ratio ** index).toFixed(digits));

const probesFor = (r: number) => [-r, -Math.ceil(r / 2), Math.ceil(r / 2), r];

const axis = (spec: Omit<AxisSpec, 'probes'>): AxisSpec => ({ ...spec, probes: probesFor(spec.radius) });

export const periodLevels = [5, 10, 15, 30, 65, 130] as const;

export const axes: Record<Key, AxisSpec> = {
  periodMinutes: axis({
    key: 'periodMinutes',
    short: 'B',
    unit: 'regular-session minutes per period (ordinal level)',
    size: periodLevels.length,
    radius: 1,
    value: (index) => periodLevels[index]!,
    rationale:
      'the clock that replaces the session: ≥ 5 so a period nearly always holds several minutes with trades (the maximum hold sells at the next trade after a period’s first minute); ≤ 130 (three periods a day) so the strategy stays intraday'
  }),
  targetPercentChange: axis({
    key: 'targetPercentChange',
    short: 'X',
    unit: 'fraction below the reference high',
    size: 68,
    radius: 3,
    value: geometric(0.001, 1.06, 7),
    rationale:
      '0.10% (≈ the 2016–2024 median 30-minute drawdown in calm years) to 4.95% (beyond the median session range of every development year); 6% steps'
  }),
  trailingBuyPercentage: axis({
    key: 'trailingBuyPercentage',
    short: 'Y',
    unit: 'fraction above the trailing low',
    size: 68,
    radius: 3,
    value: geometric(0.0002, 1.06, 7),
    rationale: '0.02% (≈ one median 1-minute range, the bid-ask scale) to 0.99%; 6% steps'
  }),
  trailingStopPercentage: axis({
    key: 'trailingStopPercentage',
    short: 'S',
    unit: 'fraction below the post-entry high',
    size: 68,
    radius: 3,
    value: geometric(0.0005, 1.06, 7),
    rationale: '0.05% (≈ twice the 1–3 bp minute range) to 2.48% (the lower end of D1’s own 3–15% box); 6% steps'
  }),
  maximumHoldMinutes: axis({
    key: 'maximumHoldMinutes',
    short: 'H',
    unit: 'regular-session trading minutes between period starts',
    size: 71,
    radius: 2,
    value: geometric(5, 1.1, 2),
    rationale: '5 trading minutes to 3,946 (≈ 10 sessions); 10% steps'
  }),
  lookbackMinutes: axis({
    key: 'lookbackMinutes',
    short: 'L',
    unit: 'regular-session trading minutes (→ previous round(L/B) ≥ 1 periods)',
    size: 64,
    radius: 2,
    value: geometric(10, 1.1, 2),
    rationale: '10 trading minutes to 4,047 (≈ 10 sessions); 10% steps'
  }),
  intradayLossBuffer: axis({
    key: 'intradayLossBuffer',
    short: 'U',
    unit: 'fraction of the investment (net loss after the hold)',
    size: 151,
    radius: 5,
    value: (index) => Number((index / 10000).toFixed(4)),
    rationale: '0 to 1.50% in 1 bp steps (D1’s own box is 0–6%; 0 is part of the rule’s domain)'
  }),
  pullback: axis({
    key: 'pullback',
    short: 'P',
    unit: 'fraction below the post-exit high',
    size: 68,
    radius: 3,
    value: geometric(0.0005, 1.06, 7),
    rationale: '0.05% to 2.48%; 6% steps'
  }),
  continuationMinutes: axis({
    key: 'continuationMinutes',
    short: 'W',
    unit: 'regular-session trading minutes (→ round(W/B) ≥ 1 periods)',
    size: 64,
    radius: 2,
    value: geometric(10, 1.1, 2),
    rationale: '10 trading minutes to 4,047 (≈ 10 sessions); 10% steps'
  })
};

export type Grid = Record<Key, number>;

// The canonical daily D1 phenotype (config/phenotypes/D1/VGT.json `primary`), the B1 comparator.
export const dailyPrimary = {
  targetPercentChange: 0.216,
  trailingBuyPercentage: 0.003,
  trailingStopPercentage: 0.073,
  maximumHoldDays: 8,
  tickWindowSize: 74,
  intradayLossBuffer: 0.029,
  pullback: 0.09,
  continuationWindow: 60
};
