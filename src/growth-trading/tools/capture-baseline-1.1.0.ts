// Captures the before-change baseline of Growth 1.1.0 (rise-from-recent-low-trading@1.1.0, continuation OFF and each
// continuation method ON) on real data, for the parity test of the later versions with the entry trend filter and the
// persistent entry eligibility OFF (tests/offParity-1.1.0.test.ts). It was run ONCE, at commit 0301c01, before any
// trend-filter or eligibility code existed, and its output is checked in (tests/fixtures/baseline-1.1.0.json). Rerunning
// it on later code is only a diagnostic: the checked-in fixture is the reference.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning \
//     src/growth-trading/tools/capture-baseline-1.1.0.ts src/growth-trading/tests/fixtures/baseline-1.1.0.json
//
// The 1.0.0 capture (capture-baseline.ts) records the base entry only; this one adds the continuation outcomes and
// episodes and the complete chronological decision log, and loads each case with the configuration's own warm-up
// (warmupSessionsForParams: continuation ON may extend it). Every case lies inside the training partition (2016–2023),
// already explored; nothing here selects or tunes anything.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolveDataset } from '../../lib/dataset.ts';
import { loadDatasetSessions } from '../../lib/evaluation.ts';
import type { VirtualTrade } from '../../multi-etf-allocator/shadow.ts';
import { DEFAULT_CONTINUATION } from '../continuation.ts';
import {
  type RiseTradingParams,
  STRATEGY_KEY,
  STRATEGY_VERSION,
  defaultTradingParams,
  runRiseTrading,
  summarizeSimulation,
  warmupSessionsForParams
} from '../riseTrading.ts';
import { TRADE_FIELDS, exactJson, sha256 } from './capture-baseline.ts';

export interface BaselineCase11 {
  id: string;
  symbol: string;
  from: string;
  to: string;
  params: RiseTradingParams;
}

// Several symbols and resolutions, continuation OFF and every method ON. Exploratory configurations, not candidates.
export const BASELINE_CASES_1_1_0: BaselineCase11[] = [
  { id: 'vgt-1d-off', symbol: 'VGT', from: '2016-01-04', to: '2023-12-29', params: { ...defaultTradingParams } },
  {
    id: 'gdx-1d-classic',
    symbol: 'GDX',
    from: '2016-01-04',
    to: '2023-12-29',
    params: { ...defaultTradingParams, continuation: { ...DEFAULT_CONTINUATION.classic_d1 } }
  },
  {
    id: 'vgt-1d-breakout',
    symbol: 'VGT',
    from: '2016-01-04',
    to: '2023-12-29',
    params: { ...defaultTradingParams, continuation: { ...DEFAULT_CONTINUATION.breakout } }
  },
  {
    id: 'xbi-1d-ma-cross',
    symbol: 'XBI',
    from: '2016-01-04',
    to: '2023-12-29',
    params: { ...defaultTradingParams, continuation: { ...DEFAULT_CONTINUATION.ma_cross } }
  },
  {
    id: 'vgt-60m-shallow',
    symbol: 'VGT',
    from: '2018-01-02',
    to: '2020-12-31',
    params: { ...defaultTradingParams, resolution: '60m', continuation: { ...DEFAULT_CONTINUATION.shallow_pullback } }
  },
  {
    id: 'gdx-15m-classic-buffer-off',
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
      continuation: { ...DEFAULT_CONTINUATION.classic_d1, windowSessions: 20 }
    }
  },
  {
    id: 'xbi-1d-off-n60',
    symbol: 'XBI',
    from: '2016-01-04',
    to: '2023-12-29',
    params: { ...defaultTradingParams, recentLowLookbackBars: 60, advanceFromRecentLowPercent: 8 }
  }
];

// One case's complete record: everything 1.0.0's capture records, plus the continuation outcomes, the episodes, the
// decision log and the full metrics.
export const recordCase11 = async (c: BaselineCase11) => {
  const dataset = resolveDataset(c.symbol, 'all');
  const warmupSessions = warmupSessionsForParams(c.params);
  const loaded = await loadDatasetSessions({
    dataset,
    startDate: c.from,
    endDate: c.to,
    warmupSessions,
    access: 'manual evaluation'
  });
  const dataSha256 = loaded.report!.dataSha256!;
  const run = runRiseTrading(c.symbol, loaded.history, loaded.warmup, c.params, dataSha256, {
    recordMinuteMarks: true
  });
  const { simulation: sim, ds } = run;
  const { rows, metrics } = summarizeSimulation(sim, ds);
  const tradeNumber = new Map(sim.trades.map((t, i) => [t, i + 1]));
  const ref = (t: VirtualTrade | null) => (t ? (tradeNumber.get(t) ?? `order@${t.decisionTime}`) : null);
  const signals = sim.outcomes.map((o) => ({
    time: o.decision.time,
    price: o.decision.price,
    trigger: o.decision.trigger,
    reference: o.decision.reference,
    status: o.status,
    reason: o.reason,
    trade: ref(o.trade)
  }));
  const trades = sim.trades.map((t) => ({
    ...Object.fromEntries(TRADE_FIELDS.map((f) => [f, t[f]])),
    setupKind: t.setupKind
  }));
  const excursions = sim.trades.map((t) => sim.excursions.get(t)!);
  const daily = sim.daily;
  const ledger = rows.map((row) => ({ ...row, trade: tradeNumber.get(row.trade) }));
  const continuationOutcomes = (sim.continuation?.outcomes ?? []).map((o) => ({
    episode: o.episode.id,
    time: o.time,
    session: o.session,
    price: o.price,
    status: o.status,
    reason: o.reason,
    trade: ref(o.trade),
    values: o.values
  }));
  const episodes = (sim.continuation?.episodes ?? []).map((e) => ({
    ...e,
    sourceTrade: ref(e.sourceTrade),
    trade: ref(e.trade)
  }));
  const log = sim.log.entries.map((x) => ({ ...x, trade: ref(x.trade) }));
  const markChanges = sim.markChanges!;

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
      minuteMarks: sim.minuteMarks,
      continuationOutcomes: continuationOutcomes.length,
      episodes: episodes.length,
      log: log.length,
      markChanges: markChanges.t.length
    },
    realized: sim.realized,
    minuteDrawdown: sim.minuteDrawdown,
    dailyDrawdown: sim.dailyDrawdown,
    hashes: {
      signals: sha256(exactJson(signals)),
      trades: sha256(exactJson(trades)),
      excursions: sha256(exactJson(excursions)),
      daily: sha256(exactJson(daily)),
      ledger: sha256(exactJson(ledger)),
      continuationOutcomes: sha256(exactJson(continuationOutcomes)),
      episodes: sha256(exactJson(episodes)),
      log: sha256(exactJson(log)),
      markChanges: sha256(exactJson(markChanges)),
      metrics: sha256(exactJson(metrics))
    },
    signals,
    trades,
    excursions,
    continuationOutcomes,
    episodes,
    lastDaily: daily.at(-1),
    metrics
  };
};

const main = async () => {
  const out = process.argv[2];

  if (!out) throw new Error('usage: capture-baseline-1.1.0.ts <output.json>');

  const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const cases = [];

  for (const c of BASELINE_CASES_1_1_0) {
    const started = Date.now();

    cases.push(await recordCase11(c));
    console.error(
      `${c.id}: ${cases.at(-1)!.counts.trades} trades, ${cases.at(-1)!.counts.episodes} episodes, ${((Date.now() - started) / 1000).toFixed(1)} s`
    );
  }

  const engineFiles = ['src/growth-trading/riseTrading.ts', 'src/growth-trading/continuation.ts'];
  const record = {
    kind: 'growth-trading 1.1.0 parity baseline (continuation OFF and ON)',
    strategy: { key: STRATEGY_KEY, version: STRATEGY_VERSION },
    capturedAt: new Date().toISOString(),
    commit: git(['rev-parse', 'HEAD']),
    engineDirty: git([
      'status',
      '--porcelain',
      '--',
      'src/growth-trading/riseTrading.ts',
      'src/growth-trading/continuation.ts',
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
