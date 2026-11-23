// Captures the before-change baseline of Growth 1.4.0 (rise-from-recent-low-trading@1.4.0, the current engine: the
// Drawdown Recovery Gate ON and OFF, with the trend-breakout entry, the initial risk stop, trend retention, the entry
// gates and continuation) on real data, for the OFF-parity test of Growth engine revision 1.5.0, which adds the
// optional staged trailing stop (research/vg-l0-staged-stop/RULE_SPECIFICATION.md) as an engine-level option that is
// absent here (tests/offParity-1.4.0.test.ts). It is run ONCE, on the unedited 1.4.0 engine, before any staged-stop
// code exists, and its output is checked in (tests/fixtures/baseline-1.4.0.json). Rerunning it on later code is only a
// diagnostic: the fixture is the reference.
//
//   node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
//     src/growth-trading/tools/capture-baseline-1.4.0.ts src/growth-trading/tests/fixtures/baseline-1.4.0.json
//
// Each case is recorded exactly as tools/capture-baseline-1.3.0.ts records one (recordCase13: signals and
// dispositions, every trade field, excursions, every daily mark, the ledger, continuation outcomes and episodes, the
// complete decision log, the minute-mark change points, the full metrics, the entry-gate records, the optional-rules
// records and the breakout scan). Every case lies inside the development window (2016-01-04 → 2024-12-31). The cases
// include the Growth·VGT books of New L0 and N/original (Priority 3's Strategy Lab request mapping) and the Drawdown
// Recovery Gate with every exit rule. Nothing here selects or tunes anything.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_CONTINUATION } from '../continuation.ts';
import { DEFAULT_ELIGIBILITY, DEFAULT_TREND } from '../entryGates.ts';
import { DEFAULT_BREAKOUT, DEFAULT_INITIAL_STOP, DEFAULT_RETENTION } from '../optionalRules.ts';
import { DEFAULT_DRAWDOWN_GATE } from '../drawdownGate.ts';
import { STRATEGY_KEY, STRATEGY_VERSION, defaultTradingParams, type RiseTradingParams } from '../riseTrading.ts';
import { growthParamsOf } from '../../vg-d1-growth-joint/books.ts';
import { exactJson } from './capture-baseline.ts';
import type { BaselineCase11 } from './capture-baseline-1.1.0.ts';
import { recordCase13 } from './capture-baseline-1.3.0.ts';

const dev = { from: '2016-01-04', to: '2024-12-31' };

// New L0's Growth·VGT (research/vg-l0-full-joint/FROZEN_SELECTION.json newL0.cfg.g) and N/original's (finalist
// C24/informed/GD.VB/R2#1 profit, rc1-f1a8b57cb02455c3): the Strategy Lab flat parameters, mapped by Priority 3's code.
const newL0G = {
  entryMethod: 'rise_from_recent_low',
  advanceFromRecentLowPercent: 5.6,
  recentLowLookbackBars: 84,
  trendFilterEnabled: false,
  eligibilityEnabled: true,
  eligibilityPolicy: 'time_limited',
  eligibilityMaxAgeSessions: 20,
  drawdownRecoveryGateEnabled: true,
  dipLookbackSessions: 64,
  dipThresholdPercent: 11.9,
  recoveryRetracementPercent: 46.2,
  recoveryConfirmationSessions: 5,
  trailingStopPercent: 5.7,
  maximumHoldEnabled: true,
  maximumHoldDays: 22,
  intradayLossBufferEnabled: false,
  initialStopEnabled: true,
  initialStopAtrSessions: 16,
  initialStopAtrMultiple: 1.2,
  retentionEnabled: false,
  continuationEnabled: true,
  continuationMethod: 'classic_d1',
  continuationWindowSessions: 67,
  classicPullbackPercent: 11.5,
  classicReboundPercent: 3.01,
  costBpsPerSide: 5
};
const nOriginalG = { ...newL0G, recoveryRetracementPercent: 44.9 };

const lab = (c: Record<string, number | boolean | string>, s: 'VGT' | 'GDX') =>
  growthParamsOf(c, s, dev) as unknown as RiseTradingParams;

export const BASELINE_CASES_1_4_0: BaselineCase11[] = [
  { id: 'new-l0-growth-vgt', symbol: 'VGT', ...dev, params: lab(newL0G, 'VGT') },
  { id: 'n-original-growth-vgt', symbol: 'VGT', ...dev, params: lab(nOriginalG, 'VGT') },
  { id: 'new-l0-growth-on-gdx', symbol: 'GDX', ...dev, params: lab(newL0G, 'GDX') },
  {
    id: 'vgt-1d-gate-retention-stop',
    symbol: 'VGT',
    ...dev,
    params: {
      ...defaultTradingParams,
      drawdownGate: { ...DEFAULT_DRAWDOWN_GATE },
      initialStop: { ...DEFAULT_INITIAL_STOP },
      retention: { ...DEFAULT_RETENTION }
    }
  },
  {
    id: 'vgt-1d-gate-breakout-retention-hold-off',
    symbol: 'VGT',
    ...dev,
    params: {
      ...defaultTradingParams,
      entryMethod: 'trend_breakout',
      breakout: { ...DEFAULT_BREAKOUT },
      maximumHoldEnabled: false,
      intradayLossBufferEnabled: false,
      drawdownGate: { ...DEFAULT_DRAWDOWN_GATE },
      retention: { ...DEFAULT_RETENTION, sellPercent: 40, closesBelow: 2 }
    }
  },
  {
    id: 'gdx-1d-gate-buffer-classic',
    symbol: 'GDX',
    ...dev,
    params: {
      ...defaultTradingParams,
      intradayLossBufferEnabled: true,
      drawdownGate: { ...DEFAULT_DRAWDOWN_GATE },
      continuation: { ...DEFAULT_CONTINUATION.classic_d1 }
    }
  },
  {
    id: 'gdx-1d-gate-eligibility-trend-shallow',
    symbol: 'GDX',
    ...dev,
    params: {
      ...defaultTradingParams,
      drawdownGate: { ...DEFAULT_DRAWDOWN_GATE },
      trendFilter: { ...DEFAULT_TREND.momentum },
      eligibility: { ...DEFAULT_ELIGIBILITY.reset_renew },
      continuation: { ...DEFAULT_CONTINUATION.shallow_pullback }
    }
  },
  { id: 'vgt-1d-defaults', symbol: 'VGT', ...dev, params: { ...defaultTradingParams } }
];

const main = async () => {
  const out = process.argv[2];

  if (!out) throw new Error('usage: capture-baseline-1.4.0.ts <output.json>');

  const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const cases = [];

  for (const c of BASELINE_CASES_1_4_0) {
    const started = Date.now();

    cases.push(await recordCase13(c));
    console.error(
      `${c.id}: ${cases.at(-1)!.counts.trades} trades, ${cases.at(-1)!.counts.log} log entries, ${((Date.now() - started) / 1000).toFixed(1)} s`
    );
  }

  const engineFiles = [
    'src/growth-trading/riseTrading.ts',
    'src/growth-trading/continuation.ts',
    'src/growth-trading/entryGates.ts',
    'src/growth-trading/optionalRules.ts',
    'src/growth-trading/drawdownGate.ts'
  ];
  const record = {
    kind: 'growth-trading 1.4.0 parity baseline (the engine before revision 1.5.0, the staged trailing stop absent)',
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
