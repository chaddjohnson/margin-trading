// Captures the before-change baseline of Growth 1.2.0 (rise-from-recent-low-trading@1.2.0: the entry trend filter,
// persistent eligibility and continuation OFF and ON) on real data, for the parity test of the later version with the
// initial risk stop, the trend-breakout entry and trend retention OFF (tests/offParity-1.2.0.test.ts). It was run ONCE,
// at commit 8d2800e, before any of that code existed, and its output is checked in (tests/fixtures/baseline-1.2.0.json).
// Rerunning it on later code is only a diagnostic: the checked-in fixture is the reference.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning \
//     src/growth-trading/tools/capture-baseline-1.2.0.ts src/growth-trading/tests/fixtures/baseline-1.2.0.json
//
// Each case is recorded exactly as tools/capture-baseline-1.1.0.ts records one (signals and dispositions, every trade
// field, excursions, every daily mark, the ledger, continuation outcomes and episodes, the complete decision log — which
// holds every entry-gate entry —, the minute-mark change points and the full metrics, entry-gate metrics included).
// `candidate-a` is the configuration the user explored most in Interactive Preview on 2026-11-05 (VGT 2016-01-04 →
// 2026-10-30, X 8% N 60, stop 4%, losing hold 15 days, buffer 2.9%, trend filter C 50/40); the others are exploratory
// configurations chosen to switch every gate, policy and method on at least once. Nothing here selects or tunes anything.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_CONTINUATION } from '../continuation.ts';
import { DEFAULT_ELIGIBILITY, DEFAULT_TREND } from '../entryGates.ts';
import { STRATEGY_KEY, STRATEGY_VERSION, defaultTradingParams } from '../riseTrading.ts';
import { exactJson } from './capture-baseline.ts';
import { type BaselineCase11, recordCase11 } from './capture-baseline-1.1.0.ts';

// The research control of the optional-rules brief (2026-11-05), as Growth 1.2.0 parameters.
export const CANDIDATE_A_PARAMS = {
  ...defaultTradingParams,
  advanceFromRecentLowPercent: 8,
  recentLowLookbackBars: 60,
  trailingStopPercent: 4,
  maximumHoldDays: 15,
  trendFilter: { method: 'rising_sma' as const, movingAverageSessions: 50, slopeComparisonSessions: 40 }
};

export const BASELINE_CASES_1_2_0: BaselineCase11[] = [
  { id: 'vgt-1d-off', symbol: 'VGT', from: '2016-01-04', to: '2023-12-29', params: { ...defaultTradingParams } },
  { id: 'candidate-a', symbol: 'VGT', from: '2016-01-04', to: '2026-10-30', params: { ...CANDIDATE_A_PARAMS } },
  {
    id: 'vgt-1d-price-change-time-limited-breakout',
    symbol: 'VGT',
    from: '2016-01-04',
    to: '2023-12-29',
    params: {
      ...defaultTradingParams,
      trendFilter: { ...DEFAULT_TREND.price_change },
      eligibility: { ...DEFAULT_ELIGIBILITY.time_limited },
      continuation: { ...DEFAULT_CONTINUATION.breakout }
    }
  },
  {
    id: 'gdx-1d-momentum-classic',
    symbol: 'GDX',
    from: '2016-01-04',
    to: '2023-12-29',
    params: {
      ...defaultTradingParams,
      trendFilter: { ...DEFAULT_TREND.momentum },
      continuation: { ...DEFAULT_CONTINUATION.classic_d1 }
    }
  },
  {
    id: 'vgt-60m-regression-reset-renew',
    symbol: 'VGT',
    from: '2018-01-02',
    to: '2020-12-31',
    params: {
      ...defaultTradingParams,
      resolution: '60m',
      trendFilter: { ...DEFAULT_TREND.regression_slope },
      eligibility: { ...DEFAULT_ELIGIBILITY.reset_renew }
    }
  },
  {
    id: 'xbi-1d-structure-extension-ma-cross',
    symbol: 'XBI',
    from: '2016-01-04',
    to: '2023-12-29',
    params: {
      ...defaultTradingParams,
      trendFilter: { ...DEFAULT_TREND.higher_highs_lows },
      eligibility: { ...DEFAULT_ELIGIBILITY.maximum_extension },
      continuation: { ...DEFAULT_CONTINUATION.ma_cross }
    }
  },
  {
    id: 'gdx-15m-buffer-off-sma-deterioration',
    symbol: 'GDX',
    from: '2021-01-04',
    to: '2021-12-31',
    params: {
      ...defaultTradingParams,
      resolution: '15m',
      advanceFromRecentLowPercent: 2,
      recentLowLookbackBars: 40,
      trailingStopPercent: 5,
      intradayLossBufferEnabled: false,
      costBpsPerSide: 2,
      trendFilter: { ...DEFAULT_TREND.rising_sma },
      eligibility: { ...DEFAULT_ELIGIBILITY.deterioration }
    }
  },
  {
    id: 'vgt-1d-hold-off',
    symbol: 'VGT',
    from: '2016-01-04',
    to: '2023-12-29',
    params: { ...defaultTradingParams, maximumHoldEnabled: false, intradayLossBufferEnabled: false }
  },
  {
    id: 'xbi-1d-minimum-strength-shallow',
    symbol: 'XBI',
    from: '2016-01-04',
    to: '2023-12-29',
    params: {
      ...defaultTradingParams,
      eligibility: { ...DEFAULT_ELIGIBILITY.minimum_strength },
      continuation: { ...DEFAULT_CONTINUATION.shallow_pullback }
    }
  }
];

const main = async () => {
  const out = process.argv[2];

  if (!out) throw new Error('usage: capture-baseline-1.2.0.ts <output.json>');

  const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const cases = [];

  for (const c of BASELINE_CASES_1_2_0) {
    const started = Date.now();

    cases.push(await recordCase11(c));
    console.error(
      `${c.id}: ${cases.at(-1)!.counts.trades} trades, ${cases.at(-1)!.counts.log} log entries, ${((Date.now() - started) / 1000).toFixed(1)} s`
    );
  }

  const engineFiles = [
    'src/growth-trading/riseTrading.ts',
    'src/growth-trading/continuation.ts',
    'src/growth-trading/entryGates.ts'
  ];
  const record = {
    kind: 'growth-trading 1.2.0 parity baseline (entry gates and continuation OFF and ON)',
    strategy: { key: STRATEGY_KEY, version: STRATEGY_VERSION },
    capturedAt: new Date().toISOString(),
    commit: git(['rev-parse', 'HEAD']),
    engineDirty: git([
      'status',
      '--porcelain',
      '--',
      ...engineFiles,
      'src/multi-etf-allocator',
      'src/shared-margin-portfolio',
      'src/entry-signals'
    ]),
    engineSha256: Object.fromEntries(
      engineFiles.map((f) => [f, createHash('sha256').update(readFileSync(f)).digest('hex')])
    ),
    node: process.version,
    numberEncoding: 'JSON numbers are exact doubles; NaN and ±Infinity are the strings "NaN", "Infinity", "-Infinity"',
    cases
  };

  writeFileSync(out, `${exactJson(record)}\n`);
  console.error(`wrote ${out}`);
};

if (import.meta.url === `file://${process.argv[1]}`) await main();
