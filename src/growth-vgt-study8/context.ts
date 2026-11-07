// Growth 1.4.0 on VGT, Study 8–style optimization (research/growth-vgt-study8/PROTOCOL.md): the study's constants.
// Every threshold, budget and gate Study 8 executed is imported from Study 8's own context module, unchanged, so it
// cannot drift; this file adds only what a single-VGT Growth study needs: its name and paths, its data doors and their
// pins, its chronology, the fixed control #4, and the conditional Growth search box (PROTOCOL.md §4).
import path from 'node:path';
import {
  eligibility as s8Eligibility,
  episodeGap as s8EpisodeGap,
  execution as s8Execution,
  schedule as s8Schedule,
  testGates as s8TestGates
} from '../study8-expanded-regime-d1/context.ts';

export const studyName = 'growth-vgt-study8';
export const studyDir = path.join('research', studyName);
export const resultsDir = path.join(studyDir, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsDir, ...parts);
export const codeDir = 'src/growth-vgt-study8';
export const protocolFile = path.join(studyDir, 'PROTOCOL.md');
export const amendmentsFile = path.join(studyDir, 'AMENDMENTS.md');
export const frozenSelectionFile = path.join(studyDir, 'FROZEN_SELECTION.json');
export const doorsLog = resultFile('doors.jsonl');
export const symbol = 'VGT';
export const strategyKey = 'rise-from-recent-low-trading';
export const strategyVersion = '1.4.0';
export const resolution = '1d' as const;

// Every seed: deriveSeed('growth-vgt-study8', ...labels), Study 8's scheme in this study's namespace.
export const seedOf = (...labels: (string | number)[]) => [studyName, ...labels] as (string | number)[];

// §3 data doors. The development door reads ONLY this byte prefix of the canonical file (every row through
// 2024-12-31 New York time) and refuses unless its length, row count, last row and sha256 match; no later byte enters
// the process. The full door (the whole file) opens only after the frozen selection is committed.
export const dataFile = 'data/VGT/data.csv';
export const developmentDoor = {
  end: '2024-12-31',
  prefixBytes: 42469694,
  prefixRows: 743918,
  prefixSha256: 'c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb',
  lastRowTime: '2024-12-31T21:11:00Z',
  sessions: 2264
};
export const fullDoor = {
  fileSha256: '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e',
  fileBytes: 53395054,
  fileRows: 935608,
  lastSession: '2026-10-30',
  sessions: 2723
};

// §3 chronology. The run starts at the file's first session with no earlier warm-up (exactly what Strategy Lab does
// for a 2016-01-04 start); each rule waits inside the window for its own lookback, as in the browser.
export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30',
  developmentYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
  validationYears: [2025, 2026]
};

// §8 expanding historical folds inside the development window (Study 8's F19–F23 geometry), report and Q9 only.
export const folds = [
  { key: 'F19', trainEnd: '2019-12-31', testStart: '2020-01-01', testEnd: '2021-12-31' },
  { key: 'F20', trainEnd: '2020-12-31', testStart: '2021-01-01', testEnd: '2022-12-31' },
  { key: 'F21', trainEnd: '2021-12-31', testStart: '2022-01-01', testEnd: '2023-12-31' },
  { key: 'F23', trainEnd: '2023-12-31', testStart: '2024-01-01', testEnd: '2024-12-31' }
] as const;

// §5 execution: Growth 1.4.0's own fixed settings (riseTrading.ts EXECUTION) and the benchmark's cost.
export const execution = {
  principal: s8Execution.principal, // $100,000 fixed notional, never compounded
  rate: s8Execution.rate, // 11% simple, 365-day year, calendar days
  costBps: s8Execution.costBps, // 5 bps per side
  drawdownCeiling: s8Execution.drawdownCeiling // $35,000 (strict)
};

// Study 8's rulebook, unchanged.
export const eligibility = s8Eligibility;
export const testGates = s8TestGates;
export const episodeGap = s8EpisodeGap;

// §7 schedule: Study 8's V-track schedule with the joint-proposal budgets scaled by s(d) = max(1, d / 16) for the
// d = 58 genes of the Growth genome (8 structural + 50 numeric): s = 3.625 (PROTOCOL.md §7.1).
export const genomeDimension = 58;
export const dimensionScale = Math.max(1, genomeDimension / 16);
export const schedule = {
  screen: 32768, // ≥ 8,192 × s(d) = 29,696, rounded up to a power of two for the Sobol stream
  r1Cap: Math.round(s8Schedule.r1Cap * dimensionScale), // 3,712
  r1: s8Schedule.r1, // 16
  islands: s8Schedule.islands, // 4
  islandsMax: s8Schedule.islandsMax, // 8
  population: Math.round(s8Schedule.population * dimensionScale), // 232
  generations: s8Schedule.generations, // 40
  newPerIsland: Math.round(s8Schedule.newPerIsland * dimensionScale), // 7,424
  patience: s8Schedule.patience,
  tolerance: s8Schedule.tolerance,
  r2Keep: s8Schedule.r2Keep, // 192
  r2: s8Schedule.r2, // 64
  r3Keep: s8Schedule.r3Keep, // 48
  r3: s8Schedule.r3, // 128
  refineStarts: s8Schedule.refineStarts, // 6
  refinePasses: s8Schedule.refinePasses, // 2
  refineN: s8Schedule.refineN, // 64
  refineMinGain: s8Schedule.refineMinGain, // $1,000/yr
  shortlist: s8Schedule.shortlist['V']!, // 6
  distinct: s8Schedule.distinct, // 0.10
  refineDistinct: s8Schedule.refineDistinct, // 0.05
  r2Distinct: s8Schedule.r2Distinct, // 0.02
  r3Distinct: s8Schedule.r3Distinct, // 0.03
  select: s8Schedule.select, // 2 × 128
  confirm: s8Schedule.confirm, // 3 × 128 (+ in-box pair, half, wide)
  test: s8Schedule.test, // 3 × 128 on validation
  ga: s8Schedule.ga, // SBX η 15 p 0.9, PM η 20
  structuralMutation: 1 / 8 // per structural gene (PROTOCOL.md §7.2)
};

// §6 stresses (the engine's native cost input only): Q7/T4 gate at 10 bps; 20 bps report-only.
export const stresses = [{ key: 'cost10', costBps: 10 }];
export const diagnosticCosts = [10, 20];

// The browser trial #4 ("retracement 45"), exact settings (brief), as Growth 1.4.0 registry values. A FIXED CONTROL:
// it never seeds the screen, an island or a refinement, never shapes a range, and is never a shortlist member.
export const control4 = {
  entryMethod: 'rise_from_recent_low',
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 90,
  trendFilterEnabled: true,
  trendMethod: 'price_change',
  trendChangeLookbackSessions: 30,
  trendChangeMinimumReturnPercent: -2,
  eligibilityEnabled: true,
  eligibilityPolicy: 'time_limited',
  eligibilityMaxAgeSessions: 20,
  drawdownRecoveryGateEnabled: true,
  dipLookbackSessions: 60,
  dipThresholdPercent: 10,
  recoveryRetracementPercent: 45,
  recoveryConfirmationSessions: 2,
  trailingStopPercent: 6,
  maximumHoldEnabled: true,
  maximumHoldDays: 21,
  intradayLossBufferEnabled: true,
  intradayLossBufferPercent: 2.9,
  initialStopEnabled: true,
  initialStopAtrSessions: 20,
  initialStopAtrMultiple: 1.5,
  retentionEnabled: false,
  continuationEnabled: true,
  continuationMethod: 'shallow_pullback',
  continuationWindowSessions: 60,
  uptrendSmaBars: 50,
  uptrendSlopeBars: 10,
  uptrendMinimumRisePercent: 0,
  pullbackMinimumPercent: 1.5,
  pullbackMaximumPercent: 8,
  recoveryPercent: 1,
  costBpsPerSide: 5
} as const;

// The browser's full-window reference figures for #4 (brief; parity only, 2016-01-04 → 2026-10-30).
export const control4BrowserReference = {
  window: { from: '2016-01-04', to: '2026-10-30' },
  totalMarkedNetUsd: 145468.46,
  realizedNetUsd: 145468.46,
  minuteDrawdownUsd: 14578.1,
  minuteDrawdownPercent: 14.58,
  wins: 10,
  losses: 3,
  breakeven: 0,
  closedTrades: 13,
  exposurePercent: 37.0,
  flatAtEnd: true
};

// ----- §4 the conditional search box -----

export type StructKey =
  'entry' | 'trend' | 'eligibility' | 'gate' | 'hold' | 'initialStop' | 'retention' | 'continuation';

export interface StructAxis {
  key: StructKey;
  levels: readonly string[];
  rationale: string;
}

export const structAxes: readonly StructAxis[] = [
  { key: 'entry', levels: ['rise_from_recent_low', 'trend_breakout'], rationale: 'the 1.4.0 entry-method selector' },
  {
    key: 'trend',
    levels: ['off', 'price_change', 'regression_slope', 'rising_sma', 'higher_highs_lows', 'momentum'],
    rationale: 'entry trend filter OFF or one of its five methods'
  },
  {
    key: 'eligibility',
    levels: ['off', 'time_limited', 'minimum_strength', 'maximum_extension', 'deterioration', 'reset_renew'],
    rationale: 'persistent eligibility OFF or one of its five policies (Rise entry only; latent with the breakout)'
  },
  { key: 'gate', levels: ['off', 'on'], rationale: 'the Drawdown Recovery Gate' },
  {
    key: 'hold',
    levels: ['off', 'hold', 'hold+buffer'],
    rationale: 'maximum losing hold OFF, ON, or ON with the buffered intraday loss (the buffer needs the hold)'
  },
  { key: 'initialStop', levels: ['off', 'on'], rationale: 'the initial risk stop' },
  { key: 'retention', levels: ['off', 'on'], rationale: 'retain part of a profitable trend' },
  {
    key: 'continuation',
    levels: ['off', 'classic_d1', 'breakout', 'shallow_pullback', 'ma_cross'],
    rationale: 'continuation entries OFF or one of the four methods'
  }
];

export type NumKey =
  | 'advanceFromRecentLowPercent'
  | 'recentLowLookbackBars'
  | 'breakoutSmaSessions'
  | 'breakoutSlopeComparisonSessions'
  | 'breakoutPriorHighSessions'
  | 'trendChangeLookbackSessions'
  | 'trendChangeMinimumReturnPercent'
  | 'trendSlopeLookbackSessions'
  | 'trendSlopeMinimumPercent'
  | 'trendSmaSessions'
  | 'trendSmaComparisonSessions'
  | 'trendStructureLookbackSessions'
  | 'trendStructureMinimumIncreasePercent'
  | 'trendMomentumShortSessions'
  | 'trendMomentumLongSessions'
  | 'trendMomentumMinimumShortReturnPercent'
  | 'trendMomentumMinimumLongReturnPercent'
  | 'eligibilityMaxAgeSessions'
  | 'eligibilityMinimumAdvancePercent'
  | 'eligibilityMaximumExtensionPercent'
  | 'eligibilityDeteriorationDropPercent'
  | 'eligibilityResetDropPercent'
  | 'eligibilityRenewalReboundPercent'
  | 'dipLookbackSessions'
  | 'dipThresholdPercent'
  | 'recoveryRetracementPercent'
  | 'recoveryConfirmationSessions'
  | 'trailingStopPercent'
  | 'maximumHoldDays'
  | 'intradayLossBufferPercent'
  | 'initialStopAtrSessions'
  | 'initialStopAtrMultiple'
  | 'retentionSellPercent'
  | 'retentionSmaSessions'
  | 'retentionClosesBelow'
  | 'continuationWindowSessions'
  | 'classicPullbackPercent'
  | 'classicReboundPercent'
  | 'breakoutBufferPercent'
  | 'breakoutFormationBars'
  | 'uptrendSmaBars'
  | 'uptrendSlopeBars'
  | 'uptrendMinimumRisePercent'
  | 'pullbackMinimumPercent'
  | 'pullbackBandPercent' // the genome's width; pullbackMaximumPercent = minimum + band (always valid)
  | 'recoveryPercent'
  | 'crossSmaBars'
  | 'crossRisingBars'
  | 'crossMinimumSlopePercent'
  | 'crossMarginPercent';

export type Source = 'registry' | 'registry*' | 'study8' | 'protocol';

export interface NumAxis {
  key: NumKey;
  min: number;
  max: number;
  step: number;
  radius: number; // neighbourhood radius in grid steps (Study 8's r)
  integer: boolean;
  source: Source; // registry = the 1.4.0 schema's own `search` domain; study8 = Study 8's D1 box; protocol = defined here
  rationale: string;
}

const ax = (
  key: NumKey,
  min: number,
  max: number,
  step: number,
  radius: number,
  source: Source,
  rationale: string,
  integer = Number.isInteger(min) && Number.isInteger(step)
): NumAxis => ({ key, min, max, step, radius, integer, source, rationale });

export const numAxes: readonly NumAxis[] = [
  // Rise entry
  ax(
    'advanceFromRecentLowPercent',
    1,
    20,
    0.5,
    2,
    'protocol',
    'X: from about one daily VGT move (≈ 1%) to a large rebound (20%); ±1.0 pt radius as Study 8’s X',
    false
  ),
  ax(
    'recentLowLookbackBars',
    5,
    250,
    5,
    2,
    'protocol',
    'N daily bars: one week to one year; ±10 bars as Study 8’s L radius'
  ),
  // trend-breakout entry (registry search domains)
  ax('breakoutSmaSessions', 10, 200, 10, 1, 'registry', 'breakout SMA sessions (registry search domain)'),
  ax('breakoutSlopeComparisonSessions', 5, 120, 5, 2, 'registry', 'breakout SMA comparison K (registry search domain)'),
  ax('breakoutPriorHighSessions', 5, 120, 5, 2, 'registry', 'breakout prior-high window (registry search domain)'),
  // entry trend filter (registry search domains)
  ax('trendChangeLookbackSessions', 5, 120, 5, 2, 'registry', 'price change lookback'),
  ax('trendChangeMinimumReturnPercent', -5, 10, 0.5, 2, 'registry', 'price change minimum return', false),
  ax('trendSlopeLookbackSessions', 5, 120, 5, 2, 'registry', 'regression slope lookback'),
  ax('trendSlopeMinimumPercent', -5, 10, 0.5, 2, 'registry', 'regression slope minimum', false),
  ax('trendSmaSessions', 10, 200, 10, 1, 'registry', 'rising SMA length'),
  ax('trendSmaComparisonSessions', 1, 30, 1, 2, 'registry', 'rising SMA comparison'),
  ax('trendStructureLookbackSessions', 4, 120, 2, 3, 'registry', 'higher highs/lows lookback'),
  ax('trendStructureMinimumIncreasePercent', 0, 5, 0.25, 2, 'registry', 'higher highs/lows minimum increase', false),
  ax('trendMomentumShortSessions', 2, 30, 1, 2, 'registry', 'momentum short lookback S'),
  ax(
    'trendMomentumLongSessions',
    40,
    250,
    10,
    1,
    'registry*',
    'momentum long lookback L: registry 20–250 narrowed to 40–250 so S < L always holds (S ≤ 30)'
  ),
  ax('trendMomentumMinimumShortReturnPercent', -2, 10, 0.5, 2, 'registry', 'momentum minimum short return', false),
  ax('trendMomentumMinimumLongReturnPercent', -15, 10, 0.5, 2, 'registry', 'momentum minimum long return', false),
  // persistent eligibility (registry search domains)
  ax('eligibilityMaxAgeSessions', 1, 30, 1, 2, 'registry', 'maximum opportunity age'),
  ax('eligibilityMinimumAdvancePercent', 0, 10, 0.5, 2, 'registry', 'minimum strength', false),
  ax('eligibilityMaximumExtensionPercent', 0.5, 10, 0.5, 2, 'registry', 'maximum extension', false),
  ax('eligibilityDeteriorationDropPercent', 0.5, 10, 0.5, 2, 'registry', 'deterioration drop', false),
  ax('eligibilityResetDropPercent', 1, 10, 0.5, 2, 'registry', 'reset drop', false),
  ax('eligibilityRenewalReboundPercent', 0.5, 10, 0.5, 2, 'registry', 'renewal rebound', false),
  // Drawdown Recovery Gate (registry search domains)
  ax('dipLookbackSessions', 10, 120, 10, 1, 'registry', 'dip discovery lookback N'),
  ax('dipThresholdPercent', 2, 15, 0.5, 2, 'registry', 'significant decline d', false),
  ax('recoveryRetracementPercent', 30, 100, 10, 1, 'registry', 'required retracement r of the whole decline'),
  ax('recoveryConfirmationSessions', 0, 10, 1, 1, 'registry', 'confirmation sessions Y'),
  // exits (Study 8's D1 box)
  ax('trailingStopPercent', 3, 15, 0.5, 2, 'study8', 'trailing stop: Study 8’s box 3–15%, ±1.0 pt', false),
  ax('maximumHoldDays', 3, 30, 1, 2, 'study8', 'maximum losing hold, calendar days: Study 8’s box 3–30, ±2'),
  ax(
    'intradayLossBufferPercent',
    0,
    6,
    0.25,
    4,
    'study8',
    'buffered intraday loss: Study 8’s box 0–6%, ±1.0 pt',
    false
  ),
  // initial risk stop, retention (registry search domains)
  ax('initialStopAtrSessions', 5, 60, 5, 1, 'registry', 'ATR lookback'),
  ax('initialStopAtrMultiple', 1, 5, 0.5, 1, 'registry', 'ATR multiple m', false),
  ax('retentionSellPercent', 10, 90, 10, 1, 'registry', 'share sold at the first profit stop'),
  ax('retentionSmaSessions', 10, 200, 10, 1, 'registry', 'retention SMA'),
  ax('retentionClosesBelow', 1, 5, 1, 1, 'registry', 'closes below the SMA'),
  // continuation (no registry search domain: Study 8’s W/P/Y box, the rest defined here)
  ax('continuationWindowSessions', 10, 200, 5, 4, 'study8', 'continuation window W: Study 8’s box 10–200, ±20'),
  ax('classicPullbackPercent', 3, 20, 0.5, 2, 'study8', 'Classic D1 pullback P: Study 8’s box 3–20%, ±1.0 pt', false),
  ax('classicReboundPercent', 0.1, 5, 0.1, 2, 'study8', 'Classic D1 rebound Y: Study 8’s box 0.1–5%, ±0.2 pt', false),
  ax('breakoutBufferPercent', 0, 5, 0.25, 2, 'protocol', 'continuation breakout buffer b: 0–5%', false),
  ax('breakoutFormationBars', 1, 30, 1, 2, 'protocol', 'continuation breakout formation F: 1–30 bars'),
  ax('uptrendSmaBars', 10, 200, 10, 1, 'protocol', 'shallow pullback uptrend SMA (as the registry’s SMA domains)'),
  ax('uptrendSlopeBars', 1, 30, 1, 2, 'protocol', 'shallow pullback slope period (as the SMA comparison domain)'),
  ax('uptrendMinimumRisePercent', 0, 5, 0.25, 2, 'protocol', 'shallow pullback minimum SMA rise', false),
  ax('pullbackMinimumPercent', 0.5, 10, 0.5, 2, 'protocol', 'shallow pullback minimum depth pmin', false),
  ax(
    'pullbackBandPercent',
    0.5,
    15,
    0.5,
    2,
    'protocol',
    'band pmax − pmin (pmax = pmin + band ≤ 25%), so pmin < pmax always',
    false
  ),
  ax('recoveryPercent', 0.25, 5, 0.25, 2, 'protocol', 'shallow pullback recovery R', false),
  ax('crossSmaBars', 10, 200, 10, 1, 'protocol', 'MA cross SMA (as the registry’s SMA domains)'),
  ax('crossRisingBars', 1, 30, 1, 2, 'protocol', 'MA cross rising M'),
  ax('crossMinimumSlopePercent', 0, 5, 0.25, 2, 'protocol', 'MA cross minimum slope', false),
  ax('crossMarginPercent', 0, 3, 0.25, 2, 'protocol', 'MA cross margin', false)
];

export const numKeys = numAxes.map((a) => a.key);
export const structKeys = structAxes.map((a) => a.key);
export const axisOf = Object.fromEntries(numAxes.map((a) => [a.key, a])) as Record<NumKey, NumAxis>;
export const levelsOf = (a: Pick<NumAxis, 'min' | 'max' | 'step'>) => Math.round((a.max - a.min) / a.step) + 1;

// §4 the screen's 16-D scrambled Sobol stream (the repository's implementation holds 16 dimensions): the 8 structural
// genes and these 8 numeric genes (those active in most structures); the other 42 numeric genes come from a joint
// Latin hypercube of the same size (Study 8's joint-LHS tool for its high-dimensional pools).
export const sobolNumeric: readonly NumKey[] = [
  'advanceFromRecentLowPercent',
  'recentLowLookbackBars',
  'trailingStopPercent',
  'maximumHoldDays',
  'intradayLossBufferPercent',
  'continuationWindowSessions',
  'eligibilityMaxAgeSessions',
  'dipThresholdPercent'
];
