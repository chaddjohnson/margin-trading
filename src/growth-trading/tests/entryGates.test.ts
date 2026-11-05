// Growth 1.2.0 entry gates on synthetic data: the five trend-filter methods (exact thresholds, warm-up, invalid data, the
// partial current session, odd N, no look-ahead), the original predicate used by eligibility (its edges = the scanner's
// crossings), the five persistent-eligibility policies (arming, blocking, admission at the then-current price, the
// expiry boundary, invalidation, drift, extension, deterioration, the reset-and-renew watch and its non-equivalence with
// policy 1), the harness capital hook, continuation clashes and priority, and the orthogonality of the switches.
//
// Fixture (src/shared-margin-portfolio/tests/fixtures.ts): one session per calendar day, minute bars from 14:30 UTC whose
// open is the previous minute's close (the first opens at its own close), a closing print = the last close, close time
// 21:00 UTC. A flat(p) session trades at p all day, so its daily bar has open = high = low = close = p, and a daily
// decision at its close fills at the next session's opening trade.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { barsFromSessions } from '../../entry-signals/bars.ts';
import { scanRiseFromRecentLow } from '../../entry-signals/riseFromRecentLow.ts';
import type { Dataset } from '../../four-family/data.ts';
import { type SessionSpec, buildData, flat } from '../../shared-margin-portfolio/tests/fixtures.ts';
import { type ContinuationConfig, DEFAULT_CONTINUATION } from '../continuation.ts';
import {
  DEFAULT_ELIGIBILITY,
  DEFAULT_TREND,
  ELIGIBILITY_POLICIES,
  type EligibilityConfig,
  TREND_METHODS,
  type TrendFilterConfig,
  TrendGate,
  eligibilityConfigErrors,
  risePredicateStates,
  trendConfigErrors,
  trendWarmupSessions
} from '../entryGates.ts';
import {
  type EntryDecision,
  type RiseTradingParams,
  bookSettingsOf,
  decisionsFromSignals,
  defaultTradingParams,
  entrySourceOf,
  exitParamsOf,
  simulateTrading,
  summarizeSimulation,
  tradingParamErrors,
  warmupSessionsFor,
  warmupSessionsForParams
} from '../riseTrading.ts';

// ----- helpers -----

const closesOf = (closes: number[]) => closes.map((c) => flat(c, 3));
const dsOf = (specs: SessionSpec[]) => buildData(specs).ds;
const evalAtClose = (ds: Dataset, c: TrendFilterConfig, s: number) =>
  new TrendGate(ds, c).evaluate(s, ds.sCloseTime[s]!, ds.sClose[s]!);

const BASE: RiseTradingParams = {
  ...defaultTradingParams,
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 10,
  resolution: '1d',
  trailingStopPercent: 30, // no exits unless a test asks for one
  maximumHoldEnabled: false,
  intradayLossBufferEnabled: false,
  costBpsPerSide: 0
};

// The whole strategy on synthetic sessions, as runRiseTrading does it (warm-up 0), plus the harness capital hook.
const simulate = (
  specs: SessionSpec[],
  over: Partial<RiseTradingParams> = {},
  capacity: ((s: number, t: number) => boolean) | null = null,
  extra: (ds: Dataset) => EntryDecision[] = () => []
) => {
  const data = buildData(specs);
  const { ds } = data;
  const p: RiseTradingParams = { ...BASE, ...over };
  const bars = barsFromSessions(data.vgtSessions, p.resolution);
  const entry = {
    advanceFromRecentLowPercent: p.advanceFromRecentLowPercent,
    recentLowLookbackBars: p.recentLowLookbackBars
  };
  const scan = scanRiseFromRecentLow(bars, entry, 0);
  const decisions = [...decisionsFromSignals(bars, scan.signals), ...extra(ds)].sort((a, b) => a.time - b.time);
  const c = p.continuation ?? null;
  const sim = simulateTrading(ds, decisions, {
    symbol: 'TEST',
    firstSession: 0,
    endSession: ds.sessionCount - 1,
    exit: exitParamsOf(p),
    book: bookSettingsOf(p),
    continuation: c ? { config: c, bars: c.method === 'classic_d1' ? null : bars } : null,
    gates:
      p.trendFilter || p.eligibility || capacity
        ? { trend: p.trendFilter ?? null, eligibility: p.eligibility ?? null, bars, entry, capacity }
        : null
  });
  const summary = summarizeSimulation(sim, ds);

  return { ds, bars, scan, sim, summary, trades: sim.trades, g: sim.gates, ops: sim.gates?.opportunities ?? [] };
};
const freeFrom = (session: number) => (s: number) => s >= session;
const accountingCloses = (summary: ReturnType<typeof summarizeSimulation>) => {
  const c = summary.metrics.checks;

  assert.ok(c.fixedLedgerMaxDifferenceUsd <= 1e-6, JSON.stringify(c));
  assert.ok(c.identityMaxResidualUsd <= 1e-6, JSON.stringify(c));
  assert.ok(c.markedEqualsLedger <= 1e-6, JSON.stringify(c));
};

// P1: a decline to a 96 low (session 10), then the one raw crossing at session 11 (101.5 ≥ 96 × 1.05 = 100.8 after
// 96 < 100.8). With N = 10 the 96 low stays in the rolling window through session 19.
const DOWN = [130, 128, 126, 124, 122, 120, 118, 116, 110, 100, 96];
const P1 = (after: number[]) => closesOf([...DOWN, 101.5, ...after]);
const CROSS = 11;
// P5: a deep 80 low and a gap-up crossing at session 11 (92.4, far above the 84 threshold), so the price can fall 3%
// below the signal price while the original predicate still holds (needed for a renewal distinct from a crossing).
const P5 = (after: number[]) => closesOf([100, 99, 98, 97, 96, 95, 90, 85, 82, 80, 83, 92.4, ...after]);

// ----- configuration -----

describe('configuration: defaults, bounds and warm-up', () => {
  test('every default configuration is valid; out-of-range values are refused', () => {
    for (const m of TREND_METHODS) assert.deepEqual(trendConfigErrors(DEFAULT_TREND[m]), []);
    for (const p of ELIGIBILITY_POLICIES) assert.deepEqual(eligibilityConfigErrors(DEFAULT_ELIGIBILITY[p]), []);
    assert.match(
      trendConfigErrors({ ...DEFAULT_TREND.momentum, shortLookbackSessions: 60 }).join(),
      /below longLookbackSessions/
    );
    assert.match(
      trendConfigErrors({ ...DEFAULT_TREND.regression_slope, lookbackSessions: 1 }).join(),
      /lookbackSessions/
    );
    assert.match(trendConfigErrors({ ...DEFAULT_TREND.price_change, lookbackSessions: 2.5 }).join(), /integer/);
    assert.match(eligibilityConfigErrors({ policy: 'time_limited', maxAgeSessions: 0 }).join(), /bounded age/);
    assert.match(
      eligibilityConfigErrors({ ...DEFAULT_ELIGIBILITY.maximum_extension, maximumExtensionPercent: 0 }).join(),
      /maximumExtensionPercent/
    );
    assert.match(
      tradingParamErrors({ ...BASE, trendFilter: { method: 'nope' } as never }).join(),
      /trend filter: unknown/
    );
    assert.match(
      tradingParamErrors({ ...BASE, eligibility: { policy: 'forever', maxAgeSessions: 1 } as never }).join(),
      /eligibility: unknown/
    );
  });

  test('warm-up: the trend filter adds its session lookback; eligibility and OFF add nothing', () => {
    assert.equal(trendWarmupSessions(DEFAULT_TREND.price_change), 20);
    assert.equal(trendWarmupSessions(DEFAULT_TREND.rising_sma), 54); // K + N − 1 = 5 + 50 − 1
    assert.equal(trendWarmupSessions(DEFAULT_TREND.higher_highs_lows), 19);
    assert.equal(trendWarmupSessions(DEFAULT_TREND.momentum), 60);
    const scanner = warmupSessionsFor(BASE.resolution, BASE.recentLowLookbackBars);
    assert.equal(warmupSessionsForParams(BASE), scanner);
    assert.equal(warmupSessionsForParams({ ...BASE, eligibility: DEFAULT_ELIGIBILITY.reset_renew }), scanner);
    assert.equal(warmupSessionsForParams({ ...BASE, trendFilter: DEFAULT_TREND.momentum }), 60);
  });
});

// ----- the trend filter -----

describe('trend A — N-session price change', () => {
  const c = (lookbackSessions: number, minimumReturnPercent: number): TrendFilterConfig => ({
    method: 'price_change',
    lookbackSessions,
    minimumReturnPercent
  });

  test('compares the decision price with the close N sessions back; ≥ passes, exact equality included', () => {
    const ds = dsOf(closesOf([100, 90, 95, 110]));
    const r = evalAtClose(ds, c(3, 10), 3);
    assert.equal(r.pass, true); // 110 = 100 × 1.10 exactly
    assert.equal(r.values.referenceClose, 100);
    assert.equal(r.values.referenceSession, ds.dates[0]);
    assert.equal(new TrendGate(ds, c(3, 10)).evaluate(3, ds.sCloseTime[3]!, 109.99).pass, false);
    assert.equal(new TrendGate(dsOf(closesOf([100, 101.1])), c(1, 1.1)).evaluate(1, 0, 101.1).pass, true); // binary rounding absorbed
    assert.equal(evalAtClose(ds, c(1, 0), 1).pass, false); // a decline
    assert.equal(evalAtClose(dsOf(closesOf([100, 100])), c(1, 0), 1).pass, true); // flat at a zero minimum
    assert.equal(evalAtClose(dsOf(closesOf([100, 98])), c(1, -3), 1).pass, true); // a negative tolerance
  });

  test('insufficient history and invalid data fail closed', () => {
    const ds = dsOf(closesOf([100, 101, 102]));
    const r = evalAtClose(ds, c(3, 0), 2);
    assert.equal(r.decision, 'insufficient_history');
    assert.equal(r.pass, false);
    ds.sClose[0] = 0;
    assert.equal(evalAtClose(ds, c(2, 0), 2).decision, 'invalid_data');
  });

  test('the latest observation is the intraday decision price; the older ones are completed session closes', () => {
    const ds = dsOf([flat(100), flat(100), { closes: [100, 104, 99] }]);
    const t = ds.bTime[ds.sBarStart[2]! + 1]! + 60; // after minute 1 (close 104)
    assert.equal(new TrendGate(ds, c(1, 3)).evaluate(2, t, 104).pass, true); // 104 vs the previous close 100
    assert.equal(new TrendGate(ds, c(1, 3)).evaluate(2, ds.sCloseTime[2]!, 99).pass, false); // at the close: 99
  });
});

describe('trend B — regression slope (log prices, OLS, percent over the lookback)', () => {
  const c = (lookbackSessions: number, minimumSlopePercent: number): TrendFilterConfig => ({
    method: 'regression_slope',
    lookbackSessions,
    minimumSlopePercent
  });

  test('a geometric rise of 1% per session fits 1.01^N − 1; a decline is negative; noisy rise is positive', () => {
    const rise = closesOf(Array.from({ length: 11 }, (_, i) => 100 * 1.01 ** i));
    const r = evalAtClose(dsOf(rise), c(10, 0), 10);
    assert.ok(Math.abs((r.values.slopePercentOverLookback as number) - (1.01 ** 10 - 1) * 100) < 1e-6);
    assert.equal(r.pass, true);
    assert.ok(Math.abs((r.values.rSquared as number) - 1) < 1e-9);
    assert.equal(
      evalAtClose(dsOf(closesOf(Array.from({ length: 11 }, (_, i) => 100 * 0.99 ** i))), c(10, 0), 10).pass,
      false
    );
    const noisy = closesOf([100, 103, 101, 104, 102, 106, 104, 108, 105, 109, 107]);
    assert.equal(evalAtClose(dsOf(noisy), c(10, 0), 10).pass, true);
    // the endpoints alone would say "up" (107 > 100); the fitted slope of a peaked reversal says "down"
    const reversal = closesOf([100, 110, 120, 130, 125, 115, 108, 104, 103, 102, 101]);
    assert.ok((evalAtClose(dsOf(reversal), c(10, 0), 10).values.slopePercentOverLookback as number) < 0);
  });

  test('a flat series has a slope of exactly 0: it passes a 0 minimum and fails any positive one', () => {
    const ds = dsOf(closesOf(Array.from({ length: 6 }, () => 101.37)));
    const r = evalAtClose(ds, c(5, 0), 5);
    assert.equal(r.values.slopePercentOverLookback, 0);
    assert.equal(r.values.rSquared, null);
    assert.equal(r.pass, true);
    assert.equal(evalAtClose(ds, c(5, 0.001), 5).pass, false);
    assert.equal(evalAtClose(ds, c(6, 0), 5).decision, 'insufficient_history');
  });
});

describe('trend C — rising moving average', () => {
  const c: TrendFilterConfig = { method: 'rising_sma', movingAverageSessions: 3, slopeComparisonSessions: 2 };

  test('price strictly above the SMA and the SMA strictly above its value K sessions earlier', () => {
    const ds = dsOf(closesOf([100, 101, 102, 103, 104, 106]));
    const r = evalAtClose(ds, c, 5);
    const r6 = (x: number) => Math.round(x * 1e6) / 1e6; // logged values are rounded to 6 decimals
    assert.equal(r.values.sma, r6((106 + 104 + 103) / 3));
    assert.equal(r.values.smaEarlier, r6((103 + 102 + 101) / 3));
    assert.equal(r.pass, true);
    assert.equal(evalAtClose(dsOf(closesOf([100, 100, 100, 100, 100, 100])), c, 5).pass, false); // flat: not rising
    const below = evalAtClose(dsOf(closesOf([100, 102, 104, 110, 112, 105])), c, 5); // SMA rising, price below it
    assert.equal(below.values.smaRising, true);
    assert.equal(below.values.priceAboveSma, false);
    assert.equal(below.pass, false);
    assert.equal(evalAtClose(ds, c, 3).decision, 'insufficient_history'); // needs K + N − 1 = 4 sessions
  });
});

describe('trend D — higher highs and higher lows (two-window structural proxy)', () => {
  const c = (n: number, m = 0): TrendFilterConfig => ({
    method: 'higher_highs_lows',
    lookbackSessions: n,
    minimumStructureIncreasePercent: m
  });

  test('newer half vs older half; strict; the tolerance raises both requirements', () => {
    const up = dsOf(closesOf([100, 101, 102, 103]));
    assert.equal(evalAtClose(up, c(4), 3).pass, true); // newer {103, 102} vs older {101, 100}
    assert.equal(evalAtClose(dsOf(closesOf([100, 100, 100, 100])), c(4), 3).pass, false); // equal is not higher
    assert.equal(evalAtClose(dsOf(closesOf([100, 105, 101, 103])), c(4), 3).pass, false); // a lower high
    assert.equal(evalAtClose(up, c(4, 2), 3).pass, false); // 103 > 101 × 1.02 but 102 ≤ 100 × 1.02
  });

  test('odd N: the middle observation belongs to neither half', () => {
    const ds = dsOf(closesOf([100, 120, 110])); // k2 = 100 (older), k1 = 120 (middle, excluded), k0 = 110 (newer)
    const r = evalAtClose(ds, c(3), 2);
    assert.equal(r.values.middleExcluded, true);
    assert.equal(r.values.olderHigh, 100);
    assert.equal(r.pass, true); // including the 120 middle in the older half would block it
  });

  test('the current session counts only its completed minutes: no future high or low (no look-ahead)', () => {
    const today = { closes: [100, 105, 95, 110] };
    const a = dsOf([flat(98), today]);
    const b = dsOf([flat(98), { closes: [100, 105, 80, 140] }]); // identical through minute 1, different afterwards
    const t = a.bTime[a.sBarStart[1]! + 1]! + 60; // after minute 1
    const ra = new TrendGate(a, c(2)).evaluate(1, t, 105);
    assert.equal(ra.values.newerHigh, 105);
    assert.equal(ra.values.newerLow, 100);
    assert.equal(ra.values.currentSessionMinutes, 2);
    assert.deepEqual(ra, new TrendGate(b, c(2)).evaluate(1, t, 105));
    const close = new TrendGate(a, c(2)).evaluate(1, a.sCloseTime[1]!, 110); // at the close: the whole session
    assert.equal(close.values.newerHigh, 110);
    assert.equal(close.values.newerLow, 95);
  });
});

describe('trend E — short-/long-term momentum', () => {
  const c = (s: number, l: number, ms: number, ml: number): TrendFilterConfig => ({
    method: 'momentum',
    shortLookbackSessions: s,
    longLookbackSessions: l,
    minimumShortReturnPercent: ms,
    minimumLongReturnPercent: ml
  });

  test('both returns must reach their thresholds; a negative long tolerance admits a recovery', () => {
    const recovery = dsOf(closesOf([110, 100, 95, 100, 104])); // short (2): 104/95 up; long (4): 104/110 down
    assert.equal(evalAtClose(recovery, c(2, 4, 0, 0), 4).pass, false);
    assert.equal(evalAtClose(recovery, c(2, 4, 0, -6), 4).pass, true); // −5.45% ≥ −6%
    assert.equal(evalAtClose(recovery, c(2, 4, 10, -6), 4).pass, false); // short +9.47% < 10%
    assert.equal(evalAtClose(dsOf(closesOf([100, 100, 100])), c(1, 2, 0, 0), 2).pass, true); // equality passes
    assert.equal(evalAtClose(recovery, c(2, 5, 0, -6), 4).decision, 'insufficient_history');
  });
});

describe('every trend method reads nothing after the decision (look-ahead guard)', () => {
  test('two datasets identical up to the decision give identical evaluations', () => {
    const history = Array.from({ length: 70 }, (_, i) => 100 + Math.sin(i / 3) * 5 + i * 0.2);
    const a = dsOf([...closesOf(history), { closes: [110, 111, 112, 90, 130] }, flat(150)]);
    const b = dsOf([...closesOf(history), { closes: [110, 111, 112, 200, 60] }, flat(20)]);
    const s = 70;
    const t = a.bTime[a.sBarStart[s]! + 2]! + 60; // after minute 2 (close 112)
    for (const m of TREND_METHODS)
      assert.deepEqual(
        new TrendGate(a, DEFAULT_TREND[m]).evaluate(s, t, 112),
        new TrendGate(b, DEFAULT_TREND[m]).evaluate(s, t, 112),
        m
      );
  });
});

// ----- the original predicate -----

describe('the eligibility qualification is the scanner’s predicate', () => {
  test('its false→true edges are exactly the Rise scanner’s crossings (synthetic noisy path, 1d and 60m)', () => {
    const closes = Array.from({ length: 120 }, (_, i) => 100 + 12 * Math.sin(i / 5) + 4 * Math.cos(i * 1.7));
    const data = buildData(closes.map((c, i) => ({ closes: [c, c * (1 + 0.01 * Math.sin(i)), c * 0.995, c] })));
    for (const res of ['1d', '60m'] as const) {
      const bars = barsFromSessions(data.vgtSessions, res);
      const scan = scanRiseFromRecentLow(bars, { advanceFromRecentLowPercent: 4, recentLowLookbackBars: 7 }, 0);
      const p = risePredicateStates(bars, 4, 7);
      const edges = bars.map((_, i) => i).filter((i) => i >= 7 && p.holds[i] === 1 && p.holds[i - 1] === 0);
      assert.deepEqual(
        edges,
        scan.signals.map((s) => s.index),
        res
      );
      assert.ok(scan.signals.length > 3);
    }
  });
});

// ----- the trend filter in the strategy (eligibility OFF) -----

const trendA3: TrendFilterConfig = { method: 'price_change', lookbackSessions: 3, minimumReturnPercent: 0 };

describe('the trend filter on the base entry, eligibility OFF', () => {
  test('a blocked crossing is a recorded veto with the observed values; no later entry is manufactured', () => {
    // crossing at 11: 101.5 < close of session 8 (110) → veto; session 12: 102 ≥ close of 9 (100) — but no new crossing
    const { sim, trades, summary, scan } = simulate(P1([102, 103, 104, 104]), { trendFilter: trendA3 });
    assert.equal(scan.signals.length, 1);
    assert.equal(trades.length, 0);
    const o = sim.outcomes[0]!;
    assert.equal(o.status, 'vetoed');
    assert.equal(o.reason, 'trend_veto');
    assert.equal(o.gate!.gate!.trend!.values.referenceClose, 110);
    const log = sim.log.entries.find((e) => e.event === 'base_signal')!;
    assert.equal(log.disposition, 'vetoed');
    assert.equal(log.values['trend.returnPercent'], Math.round((101.5 / 110 - 1) * 100 * 1e6) / 1e6);
    assert.match(log.reason!, /^trend_veto/);
    assert.equal(summary.metrics.signals.vetoed, 1);
    assert.deepEqual(summary.metrics.signals.rejectedByReason, { position_open: 0, order_pending: 0 });
  });

  test('a passing crossing enters exactly as without the filter (same decision, fill and price)', () => {
    const on = simulate(P1([102, 103, 104]), { trendFilter: { ...trendA3, lookbackSessions: 1 } }); // 101.5 ≥ 96
    const off = simulate(P1([102, 103, 104]));
    assert.equal(on.trades.length, 1);
    const pick = (t: (typeof on.trades)[number]) => [
      t.decisionTime,
      t.decisionPrice,
      t.entryTime,
      t.entryRawPrice,
      t.net
    ];
    assert.deepEqual(pick(on.trades[0]!), pick(off.trades[0]!));
    assert.equal(on.sim.outcomes[0]!.status, 'filled');
  });

  test('a placed order fills even if the trend turns before the fill (order semantics preserved)', () => {
    // passes at the close of 11 (N = 1: 101.5 ≥ 96), then session 12 gaps down to 97: the order still fills at 97
    const { trades } = simulate(P1([97, 97]), { trendFilter: { ...trendA3, lookbackSessions: 1 } });
    assert.equal(trades.length, 1);
    assert.equal(trades[0]!.entryRawPrice, 97);
    assert.equal(trades[0]!.entryExecution, 'opening trade');
  });
});

// ----- persistent eligibility -----

const W = (policy: EligibilityConfig['policy'], over: Partial<EligibilityConfig> = {}) =>
  ({ ...DEFAULT_ELIGIBILITY[policy], ...over }) as EligibilityConfig;

describe('policy 1 — time-limited opportunity', () => {
  test('blocked by the trend at the crossing, admitted when it clears, at the then-current fill price', () => {
    const { sim, trades, ops, summary, ds } = simulate(P1([102, 103, 104, 104]), {
      trendFilter: trendA3,
      eligibility: W('time_limited')
    });
    assert.equal(sim.outcomes[0]!.status, 'deferred');
    assert.equal(ops.length, 1);
    const o = ops[0]!;
    assert.equal(o.source, 'rise_from_recent_low');
    assert.equal(o.signalPrice, 101.5);
    assert.equal(o.recentLow, 96);
    assert.equal(o.blockedEvaluations.trend_veto, 1);
    assert.equal(o.ageSessionsAtDecision, 1); // decided at the close of session 12 (day 1)
    assert.equal(o.endState, 'consumed');
    assert.equal(trades.length, 1);
    const t = trades[0]!;
    assert.equal(t.decisionTime, ds.sCloseTime[12]);
    assert.equal(t.decisionPrice, 102);
    assert.equal(t.entryRawPrice, 103); // session 13's opening trade — not 101.5 (the signal) nor 100.8 (the threshold)
    assert.ok(o.signalTime < t.decisionTime && t.decisionTime < t.entryTime);
    assert.equal(entrySourceOf(sim, t), 'latched:rise_from_recent_low');
    assert.equal(
      summary.metrics.entryGates!.eligibility.enabled && summary.metrics.entryGates!.eligibility.takenLater,
      1
    );
    assert.deepEqual(
      sim.log.entries.filter((e) => e.opportunity === 'O-1').map((e) => e.event),
      ['base_signal', 'opportunity_armed', 'opportunity_blocked', 'opportunity_decision', 'opportunity_consumed']
    );
    accountingCloses(summary);
  });

  test('expiry boundary: eligible through origin + W inclusive, expired after that close', () => {
    const path = P1([102, 102, 102, 102, 102]);
    const at = simulate(path, { eligibility: W('time_limited', { maxAgeSessions: 3 }) }, freeFrom(CROSS + 3));
    assert.equal(at.trades.length, 1);
    assert.equal(at.ops[0]!.ageSessionsAtDecision, 3);
    assert.equal(at.trades[0]!.decisionTime, at.ds.sCloseTime[CROSS + 3]);
    const after = simulate(path, { eligibility: W('time_limited', { maxAgeSessions: 3 }) }, freeFrom(CROSS + 4));
    assert.equal(after.trades.length, 0);
    assert.equal(after.ops[0]!.endState, 'expired');
    assert.equal(after.ops[0]!.endSession, CROSS + 3);
    assert.equal(after.ops[0]!.blockedEvaluations.capital_unavailable, 4); // sessions 11, 12, 13, 14
  });

  test('the predicate failing invalidates; the recovery is a NEW crossing with its own opportunity', () => {
    const { ops, trades, scan, sim } = simulate(
      P1([102, 100, 103, 104, 105]),
      { eligibility: W('time_limited') },
      freeFrom(CROSS + 4)
    );
    assert.equal(scan.signals.length, 2); // 11, and 14 (after 100 < 100.8 on 13)
    assert.equal(ops[0]!.endState, 'invalidated');
    assert.match(ops[0]!.endReason!, /^predicate_false/);
    assert.equal(ops[0]!.endSession, CROSS + 2);
    assert.equal(ops[1]!.source, 'rise_from_recent_low');
    assert.equal(ops[1]!.signalSession, CROSS + 3);
    assert.equal(trades.length, 1);
    assert.equal(trades[0]!.decisionTime, sim.gates!.ds.sCloseTime[CROSS + 4]);
  });

  test('true→true never re-arms; a consumed opportunity never reopens, also after the exit', () => {
    // free capital: consumed at the crossing; the predicate stays true; a 5% stop exit later; no re-entry without a crossing
    const { ops, trades } = simulate(P1([104, 112, 120, 113, 113, 113]), {
      eligibility: W('time_limited'),
      trailingStopPercent: 5
    });
    assert.equal(ops.length, 1);
    assert.equal(ops[0]!.endState, 'consumed');
    assert.equal(ops[0]!.ageSessionsAtDecision, 0);
    assert.equal(trades.length, 1);
    assert.ok(trades[0]!.exitIndex > 0); // exited at the stop, then stayed flat
  });

  test('a crossing while invested is ignored and arms nothing (signals while invested stay ignored)', () => {
    const { ops, sim, scan } = simulate(P1([104, 100, 103, 104]), { eligibility: W('time_limited') });
    assert.equal(scan.signals.length, 2);
    assert.equal(sim.outcomes[1]!.status, 'rejected');
    assert.equal(sim.outcomes[1]!.reason, 'position_open');
    assert.equal(ops.length, 1);
  });
});

describe('policy 2 — minimum strength over the FIXED signal-time low', () => {
  test('stays valid when the rolling low drifts up (where policy 1 is invalidated)', () => {
    // the 96 low leaves the 10-bar window at session 20: the rolling threshold becomes 101.5 × 1.05 = 106.575
    const path = P1([102, 102, 102, 102, 102, 102, 102, 102, 104, 104, 104]);
    const strength = simulate(
      path,
      { eligibility: W('minimum_strength', { maxAgeSessions: 15, minimumAdvancePercent: 5 }) },
      freeFrom(21)
    );
    const latch = simulate(path, { eligibility: W('time_limited', { maxAgeSessions: 15 }) }, freeFrom(21));
    assert.equal(latch.ops[0]!.endState, 'invalidated');
    assert.equal(latch.ops[0]!.endSession, 20);
    assert.equal(latch.trades.length, 0);
    assert.equal(strength.ops[0]!.endState, 'consumed');
    assert.equal(strength.trades[0]!.decisionTime, strength.ds.sCloseTime[21]);
  });

  test('a minimum above the crossing’s advance invalidates at arming (a vetoed crossing); a fall below it later too', () => {
    const high = simulate(P1([104, 104]), { eligibility: W('minimum_strength', { minimumAdvancePercent: 8 }) });
    assert.equal(high.sim.outcomes[0]!.status, 'vetoed');
    assert.equal(high.sim.outcomes[0]!.reason, 'policy_invalidated');
    assert.equal(high.trades.length, 0);
    const fall = simulate(
      P1([101, 100.7, 104]),
      { eligibility: W('minimum_strength', { minimumAdvancePercent: 5 }) },
      freeFrom(14)
    );
    assert.equal(fall.ops[0]!.endState, 'invalidated'); // 100.7 < 96 × 1.05 = 100.8 on session 13
    assert.match(fall.ops[0]!.endReason!, /^strength_below_minimum/);
  });
});

describe('policy 3 — maximum price extension above the original signal price', () => {
  test('beyond the cap invalidates (no later reactivation); at the cap is allowed', () => {
    const cap = 101.5 * 1.03;
    const over = simulate(P1([103, 105, 104, 104]), { eligibility: W('maximum_extension') }, freeFrom(CROSS + 3));
    assert.equal(over.ops[0]!.endState, 'invalidated');
    assert.match(over.ops[0]!.endReason!, /^extension_exceeded/);
    assert.equal(over.trades.length, 0); // 104 on session 14 is back under the cap: not revived
    const at = simulate(P1([cap, 104]), { eligibility: W('maximum_extension') }, freeFrom(CROSS + 1));
    assert.equal(at.trades.length, 1);
    assert.equal(at.trades[0]!.decisionPrice, cap);
  });
});

describe('policy 4 — trend-deterioration invalidation', () => {
  test('a close the drop below the highest close since arming cancels it; policy 1 keeps the same opportunity', () => {
    const path = P1([104, 106, 102.5, 106, 106, 106]); // 102.5 ≤ 106 × 0.97 = 102.82, while 102.5 ≥ 100.8 (predicate true)
    const det = simulate(path, { eligibility: W('deterioration') }, freeFrom(CROSS + 5));
    assert.equal(det.ops[0]!.endState, 'invalidated');
    assert.match(det.ops[0]!.endReason!, /^deteriorated/);
    assert.equal(det.ops[0]!.endValues.highestCloseSinceArming, 106);
    assert.equal(det.trades.length, 0); // the recovery to 106 does not revive it
    const latch = simulate(path, { eligibility: W('time_limited') }, freeFrom(CROSS + 5));
    assert.equal(latch.trades.length, 1);
  });
});

describe('policy 5 — reset and renew after a fresh recovery', () => {
  const p5 = (over: Partial<EligibilityConfig> = {}) => W('reset_renew', { maxAgeSessions: 2, ...over });

  test('after an unconsumed expiry: reset (≤ ref × (1 − D)), rebound (≥ trough × (1 + R)) with the predicate → renewal', () => {
    const path = P5([93, 93, 89, 91, 92, 92]); // expires after session 13; reset 89 ≤ 89.628 on 14; 91 ≥ 90.78 on 15
    const r = simulate(path, { eligibility: p5() }, freeFrom(14));
    assert.equal(r.scan.signals.length, 1); // one raw crossing only
    assert.equal(r.ops.length, 2);
    assert.equal(r.ops[0]!.endState, 'expired');
    const renewed = r.ops[1]!;
    assert.equal(renewed.source, 'eligibility_renewal');
    assert.equal(renewed.renewedFrom, 'O-1');
    assert.equal(renewed.signalSession, 15);
    assert.deepEqual(
      [renewed.renewal!.reference, renewed.renewal!.resetPrice, renewed.renewal!.trough],
      [92.4, 89, 89]
    );
    assert.equal(r.trades.length, 1);
    assert.equal(entrySourceOf(r.sim, r.trades[0]!), 'eligibility_renewal');
    assert.equal(r.trades[0]!.entryRawPrice, 92); // the then-current fill, never the expired 92.4 signal price
    assert.equal(r.g!.watches[0]!.end, 'renewed');
    assert.ok(r.sim.log.entries.some((e) => e.event === 'renewal_signal'));
    // the same path under policy 1: the opportunity expires and nothing else happens (non-equivalence)
    const latch = simulate(path, { eligibility: W('time_limited', { maxAgeSessions: 2 }) }, freeFrom(14));
    assert.equal(latch.trades.length, 0);
    assert.equal(latch.ops.length, 1);
  });

  test('no renewal when the price merely stays above the old levels (no reset): the watch lapses after W sessions', () => {
    const r = simulate(P5([93, 93, 93, 93, 93, 93]), { eligibility: p5() }, freeFrom(14));
    assert.equal(r.trades.length, 0);
    assert.equal(r.g!.watches[0]!.end, 'lapsed');
  });

  test('the predicate false at the rebound ends the watch without renewal; a later true crossing is a genuine one', () => {
    // 82 resets (and the predicate is false); 83.7 ≥ 82 × 1.02 = 83.64 rebounds, but 83.7 < 84; 84.5 is a raw crossing
    const r = simulate(P5([93, 93, 82, 83.7, 84.5, 85]), { eligibility: p5() }, freeFrom(14));
    assert.equal(r.g!.watches[0]!.end, 'predicate_false_at_rebound');
    assert.equal(r.ops.length, 2);
    assert.equal(r.ops[1]!.source, 'rise_from_recent_low');
    assert.equal(r.scan.signals.length, 2);
  });

  test('a genuine crossing during the watch takes precedence (no duplicate order)', () => {
    // 83 resets with the predicate false; 85 is BOTH a rebound and a raw crossing: the crossing wins
    const r = simulate(P5([93, 93, 83, 85, 86]), { eligibility: p5() }, freeFrom(14));
    assert.equal(r.g!.watches[0]!.end, 'superseded_by_crossing');
    assert.equal(r.ops[1]!.source, 'rise_from_recent_low');
    assert.equal(r.trades.length, 1);
    assert.equal(entrySourceOf(r.sim, r.trades[0]!), 'rise_from_recent_low');
  });

  test('a consumed opportunity never opens a watch', () => {
    const r = simulate(P5([93, 89, 91, 92]), { eligibility: p5() });
    assert.equal(r.ops[0]!.endState, 'consumed');
    assert.equal(r.g!.watches.length, 0);
    assert.equal(r.trades.length, 1);
  });
});

describe('the harness capital hook (a future allocator’s occupied slot)', () => {
  test('eligibility ON: blocked by capital, admitted after the release; OFF: a capital veto, never replayed', () => {
    const path = P1([102, 102, 102, 102]);
    const on = simulate(path, { eligibility: W('time_limited') }, freeFrom(CROSS + 2));
    assert.equal(on.ops[0]!.blockedEvaluations.capital_unavailable, 2);
    assert.equal(on.trades.length, 1);
    assert.equal(on.trades[0]!.decisionTime, on.ds.sCloseTime[CROSS + 2]);
    const off = simulate(path, {}, freeFrom(CROSS + 2));
    assert.equal(off.sim.outcomes[0]!.status, 'vetoed');
    assert.equal(off.sim.outcomes[0]!.reason, 'capital_unavailable');
    assert.equal(off.trades.length, 0);
  });
});

// ----- continuation clashes and priority -----

// The continuation fixture: a base entry at the close of session 9 (rising history 90 … 99), 100 → 120, a 5% stop exit at
// 114 in session 11 with net > 0, which opens a continuation episode.
const rising = Array.from({ length: 10 }, (_, i) => flat(90 + i));
const entryAndProfitableExit: SessionSpec[] = [...rising, { closes: [100, 110, 120] }, { closes: [118, 113, 113] }];
const S0 = 11;
const decisionAt = (ds: Dataset, s: number, id: string, reference = NaN): EntryDecision => ({
  id,
  sessionIndex: s,
  time: ds.sCloseTime[s]!,
  price: ds.sClose[s]!,
  trigger: NaN,
  reference
});
const contRun = (
  after: SessionSpec[],
  continuation: ContinuationConfig,
  over: Partial<RiseTradingParams>,
  capacity: ((ds: Dataset) => (s: number, t: number) => boolean) | null = null,
  extra: (ds: Dataset) => EntryDecision[] = () => []
) => {
  const data = buildData([...entryAndProfitableExit, ...after]);
  const { ds } = data;
  const p: RiseTradingParams = { ...BASE, trailingStopPercent: 5, ...over, continuation };
  const bars = barsFromSessions(data.vgtSessions, '1d');
  const decisions = [decisionAt(ds, 9, 'base', 90), ...extra(ds)].sort((a, b) => a.time - b.time);
  const sim = simulateTrading(ds, decisions, {
    symbol: 'TEST',
    firstSession: 0,
    endSession: ds.sessionCount - 1,
    exit: exitParamsOf(p),
    book: bookSettingsOf(p),
    continuation: { config: continuation, bars: continuation.method === 'classic_d1' ? null : bars },
    gates: {
      trend: p.trendFilter ?? null,
      eligibility: p.eligibility ?? null,
      bars,
      entry: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 5 },
      capacity: capacity ? capacity(ds) : null
    }
  });

  return { ds, sim, c: sim.continuation!, trades: sim.trades, g: sim.gates!, summary: summarizeSimulation(sim, ds) };
};
const breakout: ContinuationConfig = {
  ...DEFAULT_CONTINUATION.breakout,
  windowSessions: 10,
  bufferPercent: 1,
  formationBars: 1
};

describe('continuation entries under the gates', () => {
  test('the trend filter blocks a continuation trigger: the episode ends (trend_veto), nothing is replayed', () => {
    // base at 9 passes (99 ≥ 96); the breakout at S0+2 (116) is below the close of session 10 (120): blocked
    const path = [flat(113), { closes: [114, 116, 116] }, flat(116), flat(117)];
    const r = contRun(path, breakout, { trendFilter: trendA3 });
    assert.equal(r.trades.length, 1);
    const e = r.c.episodes[0]!;
    assert.equal(e.end, 'trend_veto');
    assert.equal(e.triggerPrice, 116);
    const vetoed = r.c.outcomes.find((o) => o.status === 'vetoed')!;
    assert.equal(vetoed.reason, 'trend_veto');
    assert.equal(r.summary.metrics.continuation.enabled && r.summary.metrics.continuation.vetoedByEntryGate, 1);
    // control: without the filter the same trigger trades
    assert.equal(contRun(path, breakout, {}).trades.length, 2);
  });

  test('priority at one instant: a live opportunity’s decision goes before the continuation trigger (suppressed)', () => {
    // a crossing decision at the close of S0 (after the exit) is blocked by capital at the closes of S0 and S0+1, then
    // decided at the close of S0+2 — the instant the breakout triggers: the latched decision wins, the trigger is
    // suppressed (base priority) and the episode closes `base_entry`.
    const path = [flat(113), { closes: [114, 116, 116] }, flat(116)];
    const r = contRun(
      path,
      breakout,
      { eligibility: W('minimum_strength', { minimumAdvancePercent: 0 }) },
      () => (s) => s < S0 || s >= S0 + 2,
      (ds) => [decisionAt(ds, S0, 'cross', 100)]
    );
    assert.equal(r.trades.length, 2);
    assert.equal(entrySourceOf(r.sim, r.trades[1]!), 'latched:rise_from_recent_low');
    assert.equal(r.c.episodes[0]!.end, 'base_entry');
    assert.equal(r.c.outcomes[0]!.status, 'suppressed');
  });

  test('a continuation entry taken while an opportunity waits supersedes it (one position, one record)', () => {
    // classic_d1 triggers mid-session at S0+1; the opportunity is blocked only at session closes (capital hook)
    const classic: ContinuationConfig = {
      ...DEFAULT_CONTINUATION.classic_d1,
      windowSessions: 10,
      pullbackPercent: 5,
      reboundPercent: 0.5
    };
    const r = contRun(
      [{ closes: [112, 110, 108, 108.6, 109, 109] }, flat(109)],
      classic,
      { eligibility: W('minimum_strength', { minimumAdvancePercent: 0 }) },
      (ds) => (s, t) => !(s >= S0 && t === ds.sCloseTime[s]), // blocked at every close from S0 on
      (ds) => [decisionAt(ds, S0, 'cross', 100)]
    );
    assert.equal(r.trades.length, 2);
    assert.equal(entrySourceOf(r.sim, r.trades[1]!), 'continuation:classic_d1');
    assert.equal(r.g.opportunities[0]!.endState, 'consumed'); // the base entry at session 9
    const o = r.g.opportunities.find((x) => x.signalSession === S0)!;
    assert.equal(o.endState, 'superseded');
    assert.match(o.endReason!, /continuation/);
    accountingCloses(r.summary);
  });
});

// ----- orthogonality -----

describe('orthogonality of the switches', () => {
  // a path with several crossings, rises and stop exits
  const wave = Array.from({ length: 160 }, (_, i) => 100 + 9 * Math.sin(i / 3.2) + 0.15 * i + 3 * Math.sin(i * 1.3));
  const specs = wave.map((c, i) => ({ closes: [c, c * (1 + 0.004 * Math.sin(i)), c * 0.997, c] }));
  const over = { trailingStopPercent: 4, advanceFromRecentLowPercent: 4, recentLowLookbackBars: 6 };

  test('every combination: the same raw crossings, one position at a time, fills after decisions, closed accounting', () => {
    const trends = [
      null,
      { method: 'price_change', lookbackSessions: 5, minimumReturnPercent: 0 } as TrendFilterConfig
    ];
    const eligs = [null, W('time_limited', { maxAgeSessions: 5 }), W('reset_renew', { maxAgeSessions: 5 })];
    const conts = [
      null,
      breakout,
      { ...DEFAULT_CONTINUATION.ma_cross, windowSessions: 10, smaBars: 3, risingBars: 1 } as ContinuationConfig
    ];
    let raw = -1;
    for (const trendFilter of trends)
      for (const eligibility of eligs)
        for (const continuation of conts) {
          const label = JSON.stringify([trendFilter?.method, eligibility?.policy, continuation?.method]);
          const r = simulate(specs, { ...over, trendFilter, eligibility, continuation });
          if (raw < 0) raw = r.scan.signals.length;
          assert.equal(r.sim.outcomes.length, raw, label);
          r.trades.forEach((t, i) => {
            assert.ok(t.entryTime > t.decisionTime, label);
            if (i > 0) assert.ok(t.entryTime >= r.trades[i - 1]!.exitTime, `${label}: overlapping positions`);
          });
          assert.equal(new Set(r.trades.map((t) => t.entryTime)).size, r.trades.length, label);
          accountingCloses(r.summary);
          // deterministic
          const again = simulate(specs, { ...over, trendFilter, eligibility, continuation });
          assert.deepEqual(
            again.trades.map((t) => [t.entryTime, t.net]),
            r.trades.map((t) => [t.entryTime, t.net]),
            label
          );
        }
    assert.ok(raw > 4);
  });

  test('eligibility ON with nothing blocking (no trend filter, standalone capital) = OFF, trade for trade', () => {
    for (const continuation of [null, breakout]) {
      const off = simulate(specs, { ...over, continuation });
      for (const p of ELIGIBILITY_POLICIES) {
        const on = simulate(specs, { ...over, continuation, eligibility: DEFAULT_ELIGIBILITY[p] });
        const pick = (r: typeof on) =>
          r.trades.map((t) => [t.decisionTime, t.entryTime, t.entryRawPrice, t.exitTime, t.net]);
        assert.deepEqual(pick(on), pick(off), p);
        assert.ok(
          on.ops.every((o) => ['consumed', 'unfilled_at_end'].includes(o.endState!) && o.ageSessionsAtDecision === 0),
          p
        );
      }
    }
  });

  test('trend ON, eligibility OFF: every trade is one the OFF run could have taken from the same raw crossings', () => {
    const off = simulate(specs, over);
    const on = simulate(specs, {
      ...over,
      trendFilter: {
        method: 'momentum',
        shortLookbackSessions: 2,
        longLookbackSessions: 8,
        minimumShortReturnPercent: 0,
        minimumLongReturnPercent: -2
      }
    });
    const crossings = new Set(off.scan.signals.map((s) => s.time));
    for (const t of on.trades) assert.ok(crossings.has(t.decisionTime)); // no manufactured decision time
    assert.ok(on.sim.outcomes.some((o) => o.status === 'vetoed'));
  });
});

describe('scope guards', () => {
  test('no post-loss restriction, lower re-entry or cooldown in the gate module either', () => {
    const source = readFileSync(new URL('../entryGates.ts', import.meta.url), 'utf8');
    assert.doesNotMatch(
      source,
      /materialLoss|lowerPrice[A-Z]|lowerLevel|retrace|recoveryReset|lossExitPrice|cooldown/i
    );
    // the renewal watch opens only after an UNCONSUMED opportunity ended, never after a trade's loss
    assert.doesNotMatch(source, /trade\.net\s*[<>]/);
  });
});
