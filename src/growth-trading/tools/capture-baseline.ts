// Captures the before-change baseline of the Growth trading engine (rise-from-recent-low-trading@1.0.0) on real data,
// for the continuation-OFF parity test (tests/offParity.test.ts). It was run ONCE, at commit b590c60, before any
// continuation code existed, and its output is checked in (tests/fixtures/baseline-1.0.0.json). Rerunning it on later
// code is only a diagnostic: the checked-in fixture is the reference.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning \
//     src/growth-trading/tools/capture-baseline.ts src/growth-trading/tests/fixtures/baseline-1.0.0.json
//
// It uses the Strategy Lab runner's own data pipeline (resolveDataset 'all' + loadDatasetSessions with the runner's
// warm-up and access 'manual evaluation'), so each case reads its window plus the scanner's warm-up sessions only.
// Every case lies inside the training partition (2016–2023), already explored; nothing here selects or tunes anything.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolveDataset } from '../../lib/dataset.ts';
import { loadDatasetSessions } from '../../lib/evaluation.ts';
import type { VirtualTrade } from '../../multi-etf-allocator/shadow.ts';
import {
  type RiseTradingParams,
  STRATEGY_KEY,
  STRATEGY_VERSION,
  defaultTradingParams,
  runRiseTrading,
  summarizeSimulation,
  warmupSessionsFor
} from '../riseTrading.ts';

export interface BaselineCase {
  id: string;
  symbol: string;
  from: string;
  to: string;
  params: RiseTradingParams;
}

// Daily and intraday resolutions, every switch combination, several costs. Exploratory configurations, not candidates.
export const BASELINE_CASES: BaselineCase[] = [
  { id: 'vgt-1d-defaults', symbol: 'VGT', from: '2016-01-04', to: '2023-12-29', params: { ...defaultTradingParams } },
  { id: 'gdx-1d-defaults', symbol: 'GDX', from: '2016-01-04', to: '2023-12-29', params: { ...defaultTradingParams } },
  {
    id: 'vgt-1d-n90-hold-off',
    symbol: 'VGT',
    from: '2016-01-04',
    to: '2023-12-29',
    params: {
      ...defaultTradingParams,
      recentLowLookbackBars: 90,
      maximumHoldEnabled: false,
      intradayLossBufferEnabled: false
    }
  },
  {
    id: 'vgt-60m-defaults',
    symbol: 'VGT',
    from: '2018-01-02',
    to: '2020-12-31',
    params: { ...defaultTradingParams, resolution: '60m' }
  },
  {
    id: 'gdx-15m-buffer-off',
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
      costBpsPerSide: 2
    }
  },
  {
    id: 'vgt-1m-short',
    symbol: 'VGT',
    from: '2019-06-03',
    to: '2019-08-30',
    params: { ...defaultTradingParams, resolution: '1m', advanceFromRecentLowPercent: 1, recentLowLookbackBars: 60 }
  }
];

// The VirtualTrade fields an execution is judged by (the Study 8 parity test's list, plus the setup bookkeeping).
export const TRADE_FIELDS: (keyof VirtualTrade)[] = [
  'decisionIndex',
  'decisionBar',
  'decisionTime',
  'decisionPrice',
  'trigger',
  'trailingLow',
  'carriedOvernight',
  'entryIndex',
  'entryBar',
  'entryTime',
  'entryRawPrice',
  'entryPrice',
  'entryExecution',
  'shares',
  'investment',
  'exitIndex',
  'exitBar',
  'exitTime',
  'exitRawPrice',
  'exitPrice',
  'exitReason',
  'exitExecution',
  'exitStopPrice',
  'stopActiveAtExit',
  'maximumHoldDue',
  'bufferSignalTime',
  'bufferSignalPrice',
  'interest',
  'gross',
  'net',
  'stopFirstActiveIndex',
  'stopActiveSessions'
];

// JSON with exact numbers: NaN and ±Infinity become strings, every finite double round-trips (JSON numbers are exact).
export const exactJson = (value: unknown) =>
  JSON.stringify(value, (_key, v: unknown) =>
    typeof v === 'number' && !Number.isFinite(v) ? (Number.isNaN(v) ? 'NaN' : v > 0 ? 'Infinity' : '-Infinity') : v
  );

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

// One case's complete record: signals and their dispositions, every trade, excursions, drawdowns, daily marks, metrics.
export const recordCase = async (c: BaselineCase) => {
  const dataset = resolveDataset(c.symbol, 'all');
  const warmupSessions = warmupSessionsFor(c.params.resolution, c.params.recentLowLookbackBars);
  const loaded = await loadDatasetSessions({
    dataset,
    startDate: c.from,
    endDate: c.to,
    warmupSessions,
    access: 'manual evaluation'
  });
  const dataSha256 = loaded.report!.dataSha256!;
  const run = runRiseTrading(c.symbol, loaded.history, loaded.warmup, c.params, dataSha256);
  const { simulation: sim, ds } = run;
  const { rows, metrics } = summarizeSimulation(sim, ds);
  const tradeNumber = new Map(sim.trades.map((t, i) => [t, i + 1]));
  const signals = sim.outcomes.map((o) => ({
    time: o.decision.time,
    price: o.decision.price,
    trigger: o.decision.trigger,
    reference: o.decision.reference,
    status: o.status,
    reason: o.reason,
    trade: o.trade ? (tradeNumber.get(o.trade) ?? null) : null
  }));
  const trades = sim.trades.map((t) => Object.fromEntries(TRADE_FIELDS.map((f) => [f, t[f]])));
  const excursions = sim.trades.map((t) => sim.excursions.get(t)!);
  const daily = sim.daily;
  const ledger = rows.map((row) => ({ ...row, trade: tradeNumber.get(row.trade) }));

  return {
    id: c.id,
    symbol: c.symbol,
    from: c.from,
    to: c.to,
    params: c.params,
    dataSha256,
    warmupSessions,
    loadedSessions: loaded.history.length,
    warmup: loaded.warmup,
    firstSignalBar: run.firstSignalBar,
    bars: run.bars.length,
    counts: {
      signals: signals.length,
      trades: trades.length,
      dailyMarks: daily.length,
      minuteMarks: sim.minuteMarks
    },
    realized: sim.realized,
    minuteDrawdown: sim.minuteDrawdown,
    dailyDrawdown: sim.dailyDrawdown,
    hashes: {
      signals: sha256(exactJson(signals)),
      trades: sha256(exactJson(trades)),
      excursions: sha256(exactJson(excursions)),
      daily: sha256(exactJson(daily)),
      ledger: sha256(exactJson(ledger))
    },
    signals,
    trades,
    excursions,
    lastDaily: daily.at(-1),
    metrics
  };
};

const main = async () => {
  const out = process.argv[2];

  if (!out) throw new Error('usage: capture-baseline.ts <output.json>');

  const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const cases = [];

  for (const c of BASELINE_CASES) {
    const started = Date.now();

    cases.push(await recordCase(c));
    console.error(`${c.id}: ${cases.at(-1)!.counts.trades} trades, ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }

  const record = {
    kind: 'growth-trading OFF-parity baseline',
    strategy: { key: STRATEGY_KEY, version: STRATEGY_VERSION },
    capturedAt: new Date().toISOString(),
    commit: git(['rev-parse', 'HEAD']),
    engineDirty: git([
      'status',
      '--porcelain',
      '--',
      'src/growth-trading/riseTrading.ts',
      'src/multi-etf-allocator',
      'src/shared-margin-portfolio',
      'src/entry-signals'
    ]),
    engineSha256: createHash('sha256').update(readFileSync('src/growth-trading/riseTrading.ts')).digest('hex'),
    node: process.version,
    numberEncoding: 'JSON numbers are exact doubles; NaN and ±Infinity are the strings "NaN", "Infinity", "-Infinity"',
    cases
  };

  writeFileSync(out, `${exactJson(record)}\n`);
  console.error(`wrote ${out}`);
};

if (import.meta.url === `file://${process.argv[1]}`) await main();
