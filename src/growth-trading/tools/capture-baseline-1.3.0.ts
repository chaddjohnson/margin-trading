// Captures the before-change baseline of Growth 1.3.0 (rise-from-recent-low-trading@1.3.0: the trend-breakout entry,
// the initial risk stop and trend retention, alone and combined with the entry gates and continuation) on real data,
// for the parity test of the later version with the Drawdown Recovery Gate OFF (tests/offParity-1.3.0.test.ts). It was
// run ONCE, at commit d13148a, before any drawdown-gate code existed, and its output is checked in
// (tests/fixtures/baseline-1.3.0.json). Rerunning it on later code is only a diagnostic: the fixture is the reference.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning \
//     src/growth-trading/tools/capture-baseline-1.3.0.ts src/growth-trading/tests/fixtures/baseline-1.3.0.json
//
// Each case is recorded as tools/capture-baseline-1.1.0.ts records one (signals and dispositions, every trade field,
// excursions, every daily mark, the ledger, continuation outcomes and episodes, the complete decision log, the minute
// mark change points and the full metrics), plus what 1.2.0/1.3.0 keep outside the decision log: the entry-gate records
// (gated decisions, opportunities, renewal watches, block counts), the optional-rules records (every position's stop,
// fills and stage; the blocked decisions) and the breakout scan. The 1.2.0 fixture (baseline-1.2.0.json) already holds
// the configurations with the three 1.3.0 options OFF; these cases switch each 1.3.0 option ON at least once, on daily,
// 60- and 15-minute bars, inside the training partition (2016–2023, already explored) except Candidate A + the stop.
// Nothing here selects or tunes anything.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import type { VirtualTrade } from '../../multi-etf-allocator/shadow.ts';
import { DEFAULT_CONTINUATION } from '../continuation.ts';
import { DEFAULT_ELIGIBILITY, DEFAULT_TREND } from '../entryGates.ts';
import { DEFAULT_BREAKOUT, DEFAULT_INITIAL_STOP, DEFAULT_RETENTION } from '../optionalRules.ts';
import {
  STRATEGY_KEY,
  STRATEGY_VERSION,
  defaultTradingParams,
  runRiseTrading,
  warmupSessionsForParams
} from '../riseTrading.ts';
import { resolveDataset } from '../../lib/dataset.ts';
import { loadDatasetSessions } from '../../lib/evaluation.ts';
import { exactJson, sha256 } from './capture-baseline.ts';
import { type BaselineCase11, recordCase11 } from './capture-baseline-1.1.0.ts';
import { CANDIDATE_A_PARAMS } from './capture-baseline-1.2.0.ts';

export const BASELINE_CASES_1_3_0: BaselineCase11[] = [
  {
    id: 'vgt-1d-breakout',
    symbol: 'VGT',
    from: '2016-01-04',
    to: '2023-12-29',
    params: { ...defaultTradingParams, entryMethod: 'trend_breakout', breakout: { ...DEFAULT_BREAKOUT } }
  },
  {
    id: 'vgt-1d-initial-stop-retention',
    symbol: 'VGT',
    from: '2016-01-04',
    to: '2023-12-29',
    params: {
      ...defaultTradingParams,
      initialStop: { ...DEFAULT_INITIAL_STOP },
      retention: { ...DEFAULT_RETENTION }
    }
  },
  {
    id: 'candidate-a-initial-stop',
    symbol: 'VGT',
    from: '2016-01-04',
    to: '2026-10-30',
    params: { ...CANDIDATE_A_PARAMS, initialStop: { ...DEFAULT_INITIAL_STOP } }
  },
  {
    id: 'gdx-1d-breakout-trend-a-continuation-breakout-retention',
    symbol: 'GDX',
    from: '2016-01-04',
    to: '2023-12-29',
    params: {
      ...defaultTradingParams,
      entryMethod: 'trend_breakout',
      breakout: { ...DEFAULT_BREAKOUT },
      trendFilter: { ...DEFAULT_TREND.price_change },
      continuation: { ...DEFAULT_CONTINUATION.breakout },
      retention: { ...DEFAULT_RETENTION }
    }
  },
  {
    id: 'vgt-60m-stop-time-limited-momentum-classic',
    symbol: 'VGT',
    from: '2018-01-02',
    to: '2020-12-31',
    params: {
      ...defaultTradingParams,
      resolution: '60m',
      initialStop: { ...DEFAULT_INITIAL_STOP },
      trendFilter: { ...DEFAULT_TREND.momentum },
      eligibility: { ...DEFAULT_ELIGIBILITY.time_limited },
      continuation: { ...DEFAULT_CONTINUATION.classic_d1 }
    }
  },
  {
    id: 'xbi-1d-retention-hold-off-deterioration-ma-cross',
    symbol: 'XBI',
    from: '2016-01-04',
    to: '2023-12-29',
    params: {
      ...defaultTradingParams,
      maximumHoldEnabled: false,
      intradayLossBufferEnabled: false,
      retention: { ...DEFAULT_RETENTION, sellPercent: 30, closesBelow: 3 },
      eligibility: { ...DEFAULT_ELIGIBILITY.deterioration },
      trendFilter: { ...DEFAULT_TREND.rising_sma },
      continuation: { ...DEFAULT_CONTINUATION.ma_cross }
    }
  },
  {
    id: 'gdx-15m-stop-reset-renew-shallow',
    symbol: 'GDX',
    from: '2021-01-04',
    to: '2021-12-31',
    params: {
      ...defaultTradingParams,
      resolution: '15m',
      advanceFromRecentLowPercent: 2,
      recentLowLookbackBars: 40,
      trailingStopPercent: 5,
      costBpsPerSide: 2,
      initialStop: { atrSessions: 14, atrMultiple: 2 },
      trendFilter: { ...DEFAULT_TREND.regression_slope },
      eligibility: { ...DEFAULT_ELIGIBILITY.reset_renew },
      continuation: { ...DEFAULT_CONTINUATION.shallow_pullback }
    }
  }
];

// recordCase11 plus the records 1.2.0/1.3.0 keep outside the decision log.
export const recordCase13 = async (c: BaselineCase11) => {
  const base = await recordCase11(c);
  const loaded = await loadDatasetSessions({
    dataset: resolveDataset(c.symbol, 'all'),
    startDate: c.from,
    endDate: c.to,
    warmupSessions: warmupSessionsForParams(c.params),
    access: 'manual evaluation'
  });
  const run = runRiseTrading(c.symbol, loaded.history, loaded.warmup, c.params, loaded.report!.dataSha256!, {
    recordMinuteMarks: true
  });
  const sim = run.simulation;
  const tradeNumber = new Map(sim.trades.map((t, i) => [t, i + 1]));
  const ref = (t: VirtualTrade | null | undefined) => (t ? (tradeNumber.get(t) ?? `order@${t.decisionTime}`) : null);
  const g = sim.gates;
  const gateRecords = g
    ? {
        decisions: g.decisions.map((d) => ({ ...d, opportunity: d.opportunity?.id ?? null, trade: ref(d.trade) })),
        opportunities: g.opportunities.map((o) => ({ ...o, trade: ref(o.trade) })),
        watches: g.watches.map((w) => ({ ...w, from: w.from.id })),
        gateBlocks: g.gateBlocks
      }
    : null;
  const rules = sim.rules;
  const ruleRecords = rules
    ? {
        positions: [...rules.positions.values()].map((p) => ({
          ...p,
          trade: ref(p.trade),
          fills: p.fills.map((f) => ({ ...f, instruction: { ...f.instruction } }))
        })),
        blocked: rules.blocked
      }
    : null;

  return {
    ...base,
    extraCounts: {
      gatedDecisions: gateRecords?.decisions.length ?? 0,
      opportunities: gateRecords?.opportunities.length ?? 0,
      positions: ruleRecords?.positions.length ?? 0,
      breakoutSignals: run.breakout?.signals.length ?? 0
    },
    extraHashes: {
      gates: sha256(exactJson(gateRecords)),
      rules: sha256(exactJson(ruleRecords)),
      breakout: sha256(exactJson(run.breakout))
    }
  };
};

const main = async () => {
  const out = process.argv[2];

  if (!out) throw new Error('usage: capture-baseline-1.3.0.ts <output.json>');

  const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const cases = [];

  for (const c of BASELINE_CASES_1_3_0) {
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
    'src/growth-trading/optionalRules.ts'
  ];
  const record = {
    kind: 'growth-trading 1.3.0 parity baseline (breakout entry, initial risk stop, trend retention; gates and continuation OFF and ON)',
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
