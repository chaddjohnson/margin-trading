// Growth 1.2.0 entry gates on REAL data (skipped without the git-ignored data/ files). Training-partition windows only
// (2016–2023, already explored); nothing here selects or tunes a configuration.
// - Session sampling across a holiday and an early close (2019-07-03 closes at 13:00, 2019-07-04 is no session).
// - Every trend method's decision at every base crossing equals an INDEPENDENT recomputation from the loaded session
//   closes/highs/lows of earlier sessions and the decision price (no other data: causality on real data).
// - Intraday (60-minute) decisions: the current session's high/low is exactly the minutes completed by the decision.
// - Every eligibility policy (with the trend filter A): ages bounded by W, signal < decision < fill, one record per raw
//   crossing, decisions only at completed bar ends while flat, consumed = trades from opportunities, accounting closed.
// - Determinism, and a 1-minute run with both gates stays tractable.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { resolveDataset } from '../../lib/dataset.ts';
import { loadDatasetSessions } from '../../lib/evaluation.ts';
import {
  DEFAULT_ELIGIBILITY,
  DEFAULT_TREND,
  ELIGIBILITY_POLICIES,
  TREND_METHODS,
  type TrendFilterConfig,
  TrendGate
} from '../entryGates.ts';
import {
  type RiseTradingParams,
  defaultTradingParams,
  entrySourceOf,
  runRiseTrading,
  summarizeSimulation,
  warmupSessionsForParams
} from '../riseTrading.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const hasData = ['VGT', 'GDX'].every((s) => existsSync(`${root}data/${s}/data.csv`));

const load = async (symbol: string, from: string, to: string, warmupSessions: number) =>
  loadDatasetSessions({
    dataset: resolveDataset(symbol, 'all'),
    startDate: from,
    endDate: to,
    warmupSessions,
    access: 'manual evaluation'
  });
const run = async (symbol: string, from: string, to: string, p: RiseTradingParams) => {
  const loaded = await load(symbol, from, to, warmupSessionsForParams(p));
  const r = runRiseTrading(symbol, loaded.history, loaded.warmup, p, loaded.report!.dataSha256!);

  return { ...r, summary: summarizeSimulation(r.simulation, r.ds) };
};

// The independent reference: each method from the session arrays and the decision price (P0) only.
const independent = (
  c: TrendFilterConfig,
  close: (k: number) => number,
  high: (k: number) => number,
  low: (k: number) => number,
  avail: number
) => {
  const tol = (x: number) => x * (1 - 1e-12);
  const f = (pct: number) => Number(`${pct}e-2`);
  const need =
    c.method === 'price_change' || c.method === 'regression_slope'
      ? c.lookbackSessions
      : c.method === 'rising_sma'
        ? c.slopeComparisonSessions + c.movingAverageSessions - 1
        : c.method === 'higher_highs_lows'
          ? c.lookbackSessions - 1
          : c.longLookbackSessions;

  if (avail < need) return 'insufficient';
  if (c.method === 'price_change') return close(0) >= tol(close(c.lookbackSessions) * (1 + f(c.minimumReturnPercent)));
  if (c.method === 'regression_slope') {
    const n = c.lookbackSessions;
    const xs = Array.from({ length: n + 1 }, (_, j) => j);
    const ys = xs.map((j) => Math.log(close(n - j)));
    const mx = xs.reduce((a, b) => a + b) / xs.length;
    const my = ys.reduce((a, b) => a + b) / ys.length;
    const b = xs.reduce((a, x, j) => a + (x - mx) * (ys[j]! - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const pct = (Math.exp(b * n) - 1) * 100;
    // independent arithmetic may differ from the engine's (centred) sums in the last bits: undecidable near equality
    if (Math.abs(pct - c.minimumSlopePercent) < 1e-9) return 'boundary';
    return pct >= c.minimumSlopePercent;
  }
  if (c.method === 'rising_sma') {
    const avg = (from: number) =>
      Array.from({ length: c.movingAverageSessions }, (_, i) => close(from + i)).reduce((a, b) => a + b) /
      c.movingAverageSessions;
    return close(0) > avg(0) && avg(0) > avg(c.slopeComparisonSessions);
  }
  if (c.method === 'higher_highs_lows') {
    const h = Math.floor(c.lookbackSessions / 2);
    const m = f(c.minimumStructureIncreasePercent);
    const newer = Array.from({ length: h }, (_, k) => k);
    const older = Array.from({ length: h }, (_, k) => c.lookbackSessions - h + k);
    return (
      Math.max(...newer.map(high)) > Math.max(...older.map(high)) * (1 + m) &&
      Math.min(...newer.map(low)) > Math.min(...older.map(low)) * (1 + m)
    );
  }
  return (
    close(0) >= tol(close(c.shortLookbackSessions) * (1 + f(c.minimumShortReturnPercent))) &&
    close(0) >= tol(close(c.longLookbackSessions) * (1 + f(c.minimumLongReturnPercent)))
  );
};

describe('entry gates on real data', { skip: !hasData && 'no local data' }, () => {
  test('sessions, not calendar days: the lookback skips the 2019-07-04 holiday and reads the 13:00 early close', async () => {
    const loaded = await load('VGT', '2019-07-01', '2019-07-10', 0);
    const ds = runRiseTrading('VGT', loaded.history, 0, { ...defaultTradingParams, recentLowLookbackBars: 2 }).ds;
    const s = ds.dates.indexOf('2019-07-05');
    assert.equal(ds.dates[s - 1], '2019-07-03'); // the holiday is not a session
    assert.equal(new Date(ds.sCloseTime[s - 1]! * 1000).toISOString(), '2019-07-03T17:00:00.000Z'); // 13:00 EDT
    const r = new TrendGate(ds, { method: 'price_change', lookbackSessions: 1, minimumReturnPercent: 0 }).evaluate(
      s,
      ds.sCloseTime[s]!,
      ds.sClose[s]!
    );
    assert.equal(r.values.referenceSession, '2019-07-03');
    assert.equal(r.values.referenceClose, ds.sClose[s - 1]);
  });

  for (const method of TREND_METHODS)
    test(`trend ${method}: every base decision equals an independent recomputation from earlier sessions`, async () => {
      const c = DEFAULT_TREND[method];
      const r = await run('VGT', '2016-01-04', '2023-12-29', { ...defaultTradingParams, trendFilter: c });
      const ds = r.ds;
      let checked = 0;
      for (const o of r.simulation.outcomes) {
        if (o.status === 'rejected') continue; // invested/pending: no gate evaluation
        const s = o.decision.sessionIndex;
        const want = independent(
          c,
          (k) => (k === 0 ? o.decision.price : ds.sClose[s - k]!),
          (k) => ds.sHigh[s - k]!,
          (k) => ds.sLow[s - k]!,
          s
        );
        const g = o.gate!.gate!;
        if (want === 'boundary') continue;
        if (want === 'insufficient') assert.equal(g.reason, 'insufficient_history');
        else assert.equal(g.pass, want, `${ds.dates[s]}: ${g.text}`);
        assert.equal(o.status === 'vetoed', !g.pass);
        checked++;
      }
      assert.ok(checked > 30, `${checked} decisions checked`);
      assert.ok(r.simulation.outcomes.some((o) => o.status === 'vetoed'));
      assert.ok(r.simulation.outcomes.some((o) => o.status === 'filled'));
      // every taken entry is one of the raw crossings (eligibility OFF: nothing is manufactured later)
      const crossings = new Set(r.scan.signals.map((x) => x.time));
      for (const t of r.simulation.trades) assert.ok(crossings.has(t.decisionTime));
    });

  test('60-minute decisions: the current session’s high/low is exactly its minutes completed by the decision', async () => {
    const c: TrendFilterConfig = {
      method: 'higher_highs_lows',
      lookbackSessions: 6,
      minimumStructureIncreasePercent: 0
    };
    const r = await run('VGT', '2018-01-02', '2020-12-31', {
      ...defaultTradingParams,
      resolution: '60m',
      trendFilter: c
    });
    const ds = r.ds;
    let intraday = 0;
    for (const o of r.simulation.outcomes) {
      if (o.status === 'rejected') continue;
      const s = o.decision.sessionIndex;
      const t = o.decision.time;
      if (t >= ds.sCloseTime[s]!) continue;
      const start = ds.sBarStart[s]!;
      let hi = -Infinity;
      let lo = Infinity;
      for (let k = 0; k < ds.sBarCount[s]!; k++)
        if (ds.bTime[start + k]! + 60 <= t) {
          hi = Math.max(hi, ds.bHigh[start + k]!);
          lo = Math.min(lo, ds.bLow[start + k]!);
        }
      const v = o.gate!.gate!.trend!.values;
      assert.equal(v.newerHigh, Math.max(hi, ...[1, 2].map((k) => ds.sHigh[s - k]!)));
      assert.equal(v.newerLow, Math.min(lo, ...[1, 2].map((k) => ds.sLow[s - k]!)));
      assert.ok(hi <= ds.sHigh[s]! && lo >= ds.sLow[s]!);
      intraday++;
    }
    assert.ok(intraday > 10, `${intraday} intraday decisions`);
  });

  for (const policy of ELIGIBILITY_POLICIES)
    for (const symbol of ['VGT', 'GDX'])
      test(`eligibility ${policy} + trend A, ${symbol} 1d: bounded ages, distinct times, one record per crossing, accounting`, async () => {
        const e = DEFAULT_ELIGIBILITY[policy];
        const r = await run(symbol, '2016-01-04', '2023-12-29', {
          ...defaultTradingParams,
          trendFilter: DEFAULT_TREND.price_change,
          eligibility: e
        });
        const sim = r.simulation;
        const g = sim.gates!;
        const c = r.summary.metrics.checks;
        assert.ok(
          c.fixedLedgerMaxDifferenceUsd <= 1e-6 && c.identityMaxResidualUsd <= 1e-6 && c.markedEqualsLedger <= 1e-6
        );
        assert.equal(sim.outcomes.length, r.scan.signals.length); // every raw crossing exactly once
        const barEnds = new Set(r.bars.map((b) => b.end));
        for (const o of g.opportunities) {
          if (Number.isFinite(o.decisionTime)) {
            assert.ok(o.ageSessionsAtDecision >= 0 && o.ageSessionsAtDecision <= e.maxAgeSessions, o.id);
            assert.ok(barEnds.has(o.decisionTime), `${o.id}: a decision at a completed bar end`);
            assert.ok(o.decisionTime >= o.signalTime);
          }
          if (o.endState === 'expired') assert.equal(o.endSession, o.lastEligibleSession);
          assert.ok(o.endState !== null, `${o.id} ended`);
        }
        const fromOps = g.opportunities.filter((o) => o.endState === 'consumed').map((o) => o.trade);
        for (const t of sim.trades) {
          assert.ok(t.entryTime > t.decisionTime);
          const src = entrySourceOf(sim, t);
          if (src !== 'rise_from_recent_low' && !src.startsWith('continuation')) assert.ok(fromOps.includes(t));
        }
        assert.equal(new Set(sim.trades.map((t) => t.entryTime)).size, sim.trades.length);
        sim.trades.forEach((t, i) => i > 0 && assert.ok(t.entryTime >= sim.trades[i - 1]!.exitTime));
        if (policy === 'reset_renew') assert.ok(g.watches.length > 0);
      });

  test('deterministic, and a 1-minute run with both gates stays tractable', async () => {
    const p: RiseTradingParams = {
      ...defaultTradingParams,
      resolution: '1m',
      advanceFromRecentLowPercent: 1,
      recentLowLookbackBars: 60,
      trendFilter: DEFAULT_TREND.momentum,
      eligibility: DEFAULT_ELIGIBILITY.reset_renew
    };
    const started = Date.now();
    const a = await run('VGT', '2019-06-03', '2019-08-30', p);
    const seconds = (Date.now() - started) / 1000;
    const b = await run('VGT', '2019-06-03', '2019-08-30', p);
    const strip = (x: typeof a) =>
      JSON.stringify([
        x.simulation.trades.map((t) => [t.entryTime, t.net]),
        x.simulation.log.entries.length,
        x.summary.metrics.entryGates
      ]);
    assert.equal(strip(a), strip(b));
    assert.ok(a.simulation.gates!.opportunities.length > 0);
    assert.ok(seconds < 60, `${seconds} s`);
  });
});
