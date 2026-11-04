// Growth continuation entries (v1.1.0) on synthetic minute data: the qualifying exit, the window (s0+1 … s0+W), each
// method's arming/trigger/expiry rules with their equality boundaries, causality (a candidate never sees its own high;
// decisions at bar ends; fills at the next eligible trade), base priority at one instant, a base entry cancelling an
// armed setup, pending orders, and the classic_d1 component against D1's own EntryMachine driven directly.
//
// Fixture (src/shared-margin-portfolio/tests/fixtures.ts): one session per calendar day, minute bars from 14:30 UTC
// whose open is the previous minute's close (the first opens at its own close), a closing print = the last close,
// close time 21:00 UTC. Every path starts with a base entry and a profitable stop exit: session 10 buys at 100, rises
// to 120 (stop 114 at 5%), session 11 trades through 114 → exit at the stop price 114, net ≈ +$13,970 > 0.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { barsFromSessions } from '../../entry-signals/bars.ts';
import type { Dataset } from '../../four-family/data.ts';
import { EntryMachine, Levels } from '../../shared-margin-portfolio/strategy.ts';
import { type SessionSpec, buildData, flat } from '../../shared-margin-portfolio/tests/fixtures.ts';
import {
  type ContinuationConfig,
  DEFAULT_CONTINUATION,
  continuationConfigErrors,
  continuationWarmupBars
} from '../continuation.ts';
import {
  type EntryDecision,
  type RiseTradingParams,
  bookSettingsOf,
  defaultTradingParams,
  exitParamsOf,
  originOf,
  simulateTrading,
  summarizeSimulation,
  tradingParamErrors,
  warmupSessionsFor,
  warmupSessionsForParams
} from '../riseTrading.ts';

const rising = Array.from({ length: 10 }, (_, i) => flat(90 + i)); // sessions 0–9 close 90 … 99 (an uptrend)
const entryAndProfitableExit: SessionSpec[] = [...rising, { closes: [100, 110, 120] }, { closes: [118, 113, 113] }];
const S0 = 11; // the exit session

const atClose = (ds: Dataset, s: number, id = `close${s}`): EntryDecision => ({
  id,
  sessionIndex: s,
  time: ds.sCloseTime[s]!,
  price: ds.sClose[s]!,
  trigger: NaN,
  reference: NaN
});
const afterMinute = (ds: Dataset, s: number, k: number, id = `s${s}m${k}`): EntryDecision => ({
  id,
  sessionIndex: s,
  time: ds.bTime[ds.sBarStart[s]! + k]! + 60,
  price: ds.bClose[ds.sBarStart[s]! + k]!,
  trigger: NaN,
  reference: NaN
});

const run = (
  after: SessionSpec[],
  continuation: ContinuationConfig | null,
  extra: (ds: Dataset) => EntryDecision[] = () => [],
  over: Partial<RiseTradingParams> = {}
) => {
  const data = buildData([...entryAndProfitableExit, ...after]);
  const { ds } = data;
  const p: RiseTradingParams = {
    ...defaultTradingParams,
    trailingStopPercent: 5,
    maximumHoldEnabled: false,
    intradayLossBufferEnabled: false,
    costBpsPerSide: 0,
    ...over,
    continuation
  };
  const bars = barsFromSessions(data.vgtSessions, p.resolution);
  const decisions = [atClose(ds, 9, 'base'), ...extra(ds)].sort((a, b) => a.time - b.time);
  const sim = simulateTrading(ds, decisions, {
    symbol: 'TEST',
    firstSession: 0,
    endSession: ds.sessionCount - 1,
    exit: exitParamsOf(p),
    book: bookSettingsOf(p),
    continuation: continuation
      ? { config: continuation, bars: continuation.method === 'classic_d1' ? null : bars }
      : null
  });

  return { ds, sim, bars, trades: sim.trades, c: sim.continuation, summary: summarizeSimulation(sim, ds) };
};
const startOf = (ds: Dataset, s: number, k: number) => ds.bTime[ds.sBarStart[s]! + k]!;
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const classic = (over: Partial<Extract<ContinuationConfig, { method: 'classic_d1' }>> = {}): ContinuationConfig => ({
  ...DEFAULT_CONTINUATION.classic_d1,
  windowSessions: 10,
  pullbackPercent: 5,
  reboundPercent: 0.5,
  ...over
});
const breakout = (over: Partial<Extract<ContinuationConfig, { method: 'breakout' }>> = {}): ContinuationConfig => ({
  ...DEFAULT_CONTINUATION.breakout,
  windowSessions: 10,
  bufferPercent: 1,
  formationBars: 1,
  ...over
});
const shallow = (
  over: Partial<Extract<ContinuationConfig, { method: 'shallow_pullback' }>> = {}
): ContinuationConfig => ({
  ...DEFAULT_CONTINUATION.shallow_pullback,
  windowSessions: 10,
  smaBars: 10,
  slopeBars: 1,
  minimumRisePercent: 0,
  pullbackMinimumPercent: 2,
  pullbackMaximumPercent: 8,
  recoveryPercent: 1,
  ...over
});
const maCross = (over: Partial<Extract<ContinuationConfig, { method: 'ma_cross' }>> = {}): ContinuationConfig => ({
  ...DEFAULT_CONTINUATION.ma_cross,
  windowSessions: 10,
  smaBars: 2,
  risingBars: 1,
  minimumSlopePercent: 0,
  marginPercent: 0,
  ...over
});

describe('the qualifying exit and the window', () => {
  test('the base path: one base trade, a stop exit at 114, net > 0 after interest; OFF opens nothing', () => {
    const { trades, c, sim, summary } = run([flat(113)], null);
    assert.equal(trades.length, 1);
    assert.equal(trades[0]!.exitIndex, S0);
    assert.equal(trades[0]!.exitRawPrice, 114);
    assert.ok(trades[0]!.net > 0);
    assert.equal(c, null);
    assert.deepEqual(summary.metrics.continuation, { enabled: false, qualifyingExits: 1 });
    assert.deepEqual(originOf(trades[0]!), { origin: 'base_growth', method: null });
    assert.deepEqual(
      sim.log.entries.map((e) => e.event),
      ['base_signal', 'fill', 'exit']
    );
  });

  test('a profitable exit opens one episode anchored at the exit session: eligible s0+1 … s0+W', () => {
    const { c, ds } = run([flat(113), flat(113), flat(113)], breakout({ windowSessions: 2 }));
    const e = c!.episodes[0]!;
    assert.equal(c!.episodes.length, 1);
    assert.equal(e.anchorSession, S0);
    assert.equal(e.firstEligibleSession, S0 + 1);
    assert.equal(e.lastEligibleSession, S0 + 2);
    assert.equal(e.exitPrice, 114);
    assert.equal(e.end, 'window_expired');
    assert.equal(e.endSession, S0 + 2); // expires at the end of the W-th session
    assert.equal(e.endTime, ds.sCloseTime[S0 + 2]);
    assert.equal(e.eligibleSessionsObserved, 2);
  });

  test('a losing exit never opens a window', () => {
    // Enters at 100 (session 10), falls; the maximum hold sells at a loss on session 13.
    const data = buildData([...rising, { closes: [100, 99, 98] }, flat(95), flat(95), flat(94), flat(150), flat(160)]);
    const p: RiseTradingParams = {
      ...defaultTradingParams,
      trailingStopPercent: 5,
      maximumHoldDays: 3,
      intradayLossBufferEnabled: false,
      costBpsPerSide: 0,
      continuation: breakout()
    };
    const sim = simulateTrading(data.ds, [atClose(data.ds, 9)], {
      symbol: 'TEST',
      firstSession: 0,
      endSession: data.ds.sessionCount - 1,
      exit: exitParamsOf(p),
      book: bookSettingsOf(p),
      continuation: { config: p.continuation!, bars: barsFromSessions(data.vgtSessions, '1d') }
    });
    assert.equal(sim.trades[0]!.exitReason, 'maximum hold');
    assert.ok(sim.trades[0]!.net < 0);
    assert.equal(sim.continuation!.episodes.length, 0);
    assert.equal(sim.trades.length, 1); // the later rally is not bought by continuation
  });
});

describe('classic_d1 (D1 pullback + trailing rebound, minute-native)', () => {
  const path = [{ closes: [112, 110, 108, 108.6, 109, 109] }, flat(109)];

  test('arms on the completed minute closing ≤ H(1−P), buys on the Y rebound at the next minute open', () => {
    const { trades, c, ds } = run(path, classic());
    const e = c!.episodes[0]!;
    assert.equal(e.referenceHigh, 114); // the raw exit fill; the exit session's own high is not used
    assert.equal(e.armedTime, startOf(ds, S0 + 1, 2) + 60); // minute 2 (close 108 ≤ 114 × 0.95 = 108.3)
    assert.equal(e.armedPrice, 108);
    assert.equal(e.triggerTime, startOf(ds, S0 + 1, 3) + 60); // 108.6 ≥ 108 × 1.005 = 108.54
    assert.equal(e.triggerPrice, 108.6);
    const t = trades[1]!;
    assert.deepEqual(originOf(t), { origin: 'continuation', method: 'classic_d1' });
    assert.equal(t.entryIndex, S0 + 1);
    assert.equal(t.entryBar, 4); // the next minute's open
    assert.equal(t.entryRawPrice, 108.6);
    assert.equal(t.entryExecution, 'first trade after decision');
    assert.equal(e.status, 'filled');
    assert.equal(e.trade, t);
    // The arming closes the window (D1), logged as such.
    const events = c!.log.entries.filter((x) => x.episode === e.id).map((x) => x.event);
    assert.deepEqual(events, [
      'episode_opened',
      'setup_armed',
      'window_closed',
      'continuation_signal',
      'episode_closed'
    ]);
  });

  test('equality boundaries: a close exactly at H(1−P) arms; a close exactly at trailingLow(1+Y) fires', () => {
    // H = 114, P = 5% → 108.3 exactly arms; Y = 0.5% → 108.3 × 1.005 = 108.8415 exactly fires.
    const { c } = run([{ closes: [110, 108.3, 108.8415, 109] }, flat(109)], classic());
    const e = c!.episodes[0]!;
    assert.equal(e.armedPrice, 108.3);
    assert.equal(e.triggerPrice, 108.8415);
  });

  test('the same states as D1’s own EntryMachine driven directly (onExit, processBar per minute, afterSession)', () => {
    const { ds, c, trades } = run(path, classic());
    const p = exitParamsOf({ ...defaultTradingParams, trailingStopPercent: 5, continuation: classic() });
    const m = new EntryMachine(ds, p, new Levels(ds), 0);
    m.onExit(S0, 114, trades[0]!.net);
    m.afterSession(S0);
    let signal;
    for (let k = 0; k < ds.sBarCount[S0 + 1]! && !signal; k++) signal = m.processBar(S0 + 1, k);
    const e = c!.episodes[0]!;
    const setup = m.setupLog[0]!;
    assert.equal(setup.kind, 'continuation');
    assert.equal(setup.activationTime, e.armedTime);
    assert.equal(setup.activationPrice, e.armedPrice);
    assert.equal(setup.anchorHigh, e.referenceHigh);
    assert.equal(signal!.decisionTime, e.triggerTime);
    assert.equal(signal!.decisionPrice, e.triggerPrice);
    assert.equal(signal!.trailingLow, trades[1]!.trailingLow);
    near(signal!.trigger, trades[1]!.trigger);
  });

  test('the window expires after session s0+W; a pullback on s0+W+1 does not arm', () => {
    const late = [flat(113), flat(113), { closes: [112, 108, 108.6, 109] }, flat(109)];
    assert.equal(run(late, classic({ windowSessions: 2 })).c!.episodes[0]!.end, 'window_expired');
    assert.equal(run(late, classic({ windowSessions: 2 })).trades.length, 1);
    assert.equal(run(late, classic({ windowSessions: 3 })).trades.length, 2); // s0+3 is eligible with W = 3
  });

  test('H rises with later session highs (not the exit session), never with the current session', () => {
    // Session s0+1 makes a high of 125 → H = 125 for s0+2; a close of 113 is then a 9.6% pullback (arms at 5%).
    const { c } = run([{ closes: [120, 125, 124] }, { closes: [119, 113, 113.6, 114] }, flat(114)], classic());
    const e = c!.episodes[0]!;
    assert.equal(e.referenceHigh, 125);
    assert.equal(e.armedPrice, 113); // 113 ≤ 125 × 0.95 = 118.75 (119 is above it)
  });

  test('base priority: a base entry at the arming instant takes the entry and closes the window', () => {
    const { c, trades, ds } = run(path, classic(), (d) => [afterMinute(d, S0 + 1, 2, 'base2')]);
    const e = c!.episodes[0]!;
    assert.equal(e.end, 'base_entry');
    assert.ok(Number.isNaN(e.armedTime)); // never armed: the base decision came first
    assert.deepEqual(originOf(trades[1]!), { origin: 'base_growth', method: null });
    assert.equal(trades[1]!.decisionTime, startOf(ds, S0 + 1, 2) + 60);
    const closed = c!.log.entries.find((x) => x.event === 'episode_closed')!;
    assert.equal(closed.values.sameInstant, 'would_arm'); // noted on the episode …
    assert.equal(c!.outcomes.length, 0); // … but arming is not an entry signal: nothing is recorded as suppressed
  });

  test('a base entry while a setup is armed cancels the setup (Growth adaptation) and is the only entry', () => {
    const noRebound = [{ closes: [112, 110, 108, 107.9, 107.8] }, flat(107.8), flat(110)];
    const { c, trades } = run(noRebound, classic(), (d) => [atClose(d, S0 + 1, 'base2')]);
    const e = c!.episodes[0]!;
    assert.ok(Number.isFinite(e.armedTime));
    assert.equal(e.end, 'base_entry');
    assert.equal(trades.length, 2);
    assert.deepEqual(originOf(trades[1]!), { origin: 'base_growth', method: null });
    assert.ok(c!.log.entries.some((x) => x.event === 'setup_cancelled'));
  });

  test('an armed setup persists past the window (D1) and fires on a later session', () => {
    const { c, trades } = run(
      [{ closes: [112, 108, 107.5] }, flat(107.5), flat(107.5), { closes: [107.5, 108.2, 108.3] }, flat(108.3)],
      classic({ windowSessions: 1 })
    );
    const e = c!.episodes[0]!;
    assert.equal(e.armedPrice, 108);
    assert.equal(trades.length, 2);
    assert.equal(trades[1]!.entryIndex, S0 + 4); // 108.2 ≥ 107.5 × 1.005 = 108.0375, beyond W = 1
  });
});

describe('breakout above the post-exit high (run-resolution bars)', () => {
  test('formation first; then a close strictly above H(1+b); fills at the next session’s opening trade', () => {
    const { c, trades, ds } = run([flat(113), { closes: [114, 116, 116] }, flat(116)], breakout());
    const e = c!.episodes[0]!;
    assert.equal(e.triggerTime, ds.sCloseTime[S0 + 2]);
    assert.equal(e.triggerPrice, 116); // 116 > 114 × 1.01 = 115.14
    assert.equal(e.triggerValues.threshold, 115.14);
    assert.equal(trades[1]!.entryIndex, S0 + 3);
    assert.equal(trades[1]!.entryExecution, 'opening trade');
    assert.equal(trades[1]!.carriedOvernight, true);
    assert.deepEqual(originOf(trades[1]!), { origin: 'continuation', method: 'breakout' });
  });

  test('the first eligible bar is formation only, even when it closes above the threshold', () => {
    const { c } = run([{ closes: [120, 120] }, { closes: [121, 122] }, flat(122)], breakout());
    const e = c!.episodes[0]!;
    assert.equal(e.triggerTime, c!.ds.sCloseTime[S0 + 2]); // not S0 + 1
    assert.equal(e.triggerValues.referenceHigh, 120); // raised by the formation bar's high
  });

  test('renewed highs only: a later higher high raises the reference, a recovery below it does not trigger', () => {
    const { c, trades } = run([{ closes: [113, 130, 113] }, { closes: [113, 116] }, flat(116)], breakout());
    assert.equal(trades.length, 1);
    assert.equal(c!.episodes[0]!.referenceHigh, 130);
    assert.equal(c!.episodes[0]!.end, 'end_of_data'); // still watching when the data ends
  });

  test('a candidate never sees its own high; equality (close = H(1+b)) does not trigger', () => {
    // b = 0: threshold = H = 114. Session s0+2 closes exactly at 114 → no trigger; s0+3 closes 114.01 → trigger.
    const { c } = run(
      [flat(110), { closes: [113, 114] }, { closes: [114, 114.01] }, flat(114.01)],
      breakout({ bufferPercent: 0 })
    );
    const e = c!.episodes[0]!;
    assert.equal(e.triggerTime, c!.ds.sCloseTime[S0 + 3]);
    assert.equal(e.triggerValues.referenceHigh, 114);
  });

  test('a pending continuation order blocks a base decision before its fill (order_pending)', () => {
    const { sim, trades } = run([flat(113), { closes: [114, 116, 116] }, flat(116)], breakout(), (d) => [
      { ...afterMinute(d, S0 + 3, 0, 'base3'), time: startOf(d, S0 + 3, 0) } // at the fill instant, before the fill
    ]);
    const rejected = sim.outcomes.find((o) => o.decision.id === 'base3')!;
    assert.equal(rejected.status, 'rejected');
    assert.equal(rejected.reason, 'order_pending');
    assert.deepEqual(originOf(rejected.trade!), { origin: 'continuation', method: 'breakout' });
    assert.equal(trades.length, 2);
  });
});

describe('shallow pullback + recovery in an uptrend', () => {
  // After the exit (H = 114): 112 (1.75%, too shallow), 111 (2.63%, uptrend → arms), 110 (trough), 111.2 (≥ 110 × 1.01).
  const path = [{ closes: [113, 112] }, { closes: [111] }, { closes: [110] }, { closes: [111.2] }, flat(111.2)];

  test('arms inside [pmin, pmax] in an uptrend, triggers on the recovery from the trough', () => {
    const { c, trades, ds } = run(path, shallow());
    const e = c!.episodes[0]!;
    assert.equal(e.armedTime, ds.sCloseTime[S0 + 2]);
    assert.equal(e.armedPrice, 111);
    assert.equal(e.referenceHigh, 114); // frozen at arming
    assert.equal(e.triggerTime, ds.sCloseTime[S0 + 4]);
    assert.equal(e.triggerValues.trough, 110);
    assert.equal(e.triggerValues.uptrend, true);
    assert.equal(trades[1]!.entryIndex, S0 + 5);
    assert.deepEqual(originOf(trades[1]!), { origin: 'continuation', method: 'shallow_pullback' });
  });

  test('the uptrend filter is necessary: the same path after a falling history never arms', () => {
    const falling = Array.from({ length: 10 }, (_, i) => flat(130 - 3 * i)); // 130 … 103
    const data = buildData([...falling, { closes: [100, 110, 120] }, { closes: [118, 113, 113] }, ...path]);
    const p: RiseTradingParams = {
      ...defaultTradingParams,
      trailingStopPercent: 5,
      maximumHoldEnabled: false,
      intradayLossBufferEnabled: false,
      costBpsPerSide: 0,
      continuation: shallow()
    };
    const sim = simulateTrading(data.ds, [atClose(data.ds, 9)], {
      symbol: 'TEST',
      firstSession: 0,
      endSession: data.ds.sessionCount - 1,
      exit: exitParamsOf(p),
      book: bookSettingsOf(p),
      continuation: { config: p.continuation!, bars: barsFromSessions(data.vgtSessions, '1d') }
    });
    assert.equal(sim.continuation!.episodes[0]!.armedTime, NaN);
    assert.equal(sim.trades.length, 1);
  });

  test('a pullback deeper than pmax ends the episode (pullback_too_deep); no later re-arming', () => {
    const deep = [
      { closes: [113, 112] },
      { closes: [111] },
      { closes: [104] },
      { closes: [111] },
      { closes: [113] },
      flat(113)
    ];
    const { c, trades } = run(deep, shallow());
    assert.equal(c!.episodes[0]!.end, 'pullback_too_deep');
    assert.equal(trades.length, 1);
  });

  test('equality: a pullback exactly pmin arms; a close exactly trough(1+R) triggers', () => {
    // H = 114: 114 × 0.98 = 111.72 (exactly 2%); trough 111.72 → 111.72 × 1.01 = 112.8372.
    const { c } = run([{ closes: [113] }, { closes: [111.72] }, { closes: [112.8372] }, flat(113)], shallow());
    const e = c!.episodes[0]!;
    assert.equal(e.armedPrice, 111.72);
    assert.equal(e.triggerPrice, 112.8372);
  });

  test('an armed setup expires with the window', () => {
    const { c, trades } = run(
      [{ closes: [113] }, { closes: [111] }, { closes: [110] }, { closes: [111.2] }, flat(111.2)],
      shallow({ windowSessions: 3 })
    );
    assert.equal(c!.episodes[0]!.end, 'window_expired');
    assert.equal(trades.length, 1);
  });
});

describe('cross above a rising moving average', () => {
  // SMA2: rising ⇔ close(c) > close(c−2); from below ⇔ close(c−1) ≤ close(c−2); above ⇔ close(c) > close(c−1).
  test('a genuine cross from below while the SMA rises triggers; fills next session', () => {
    const { c, trades, ds } = run([{ closes: [110] }, { closes: [109] }, { closes: [112] }, flat(112)], maCross());
    const e = c!.episodes[0]!;
    assert.equal(e.triggerTime, ds.sCloseTime[S0 + 3]);
    assert.equal(e.triggerValues.sma, 110.5);
    assert.equal(e.triggerValues.priorClose, 109);
    assert.equal(trades[1]!.entryIndex, S0 + 4);
    assert.deepEqual(originOf(trades[1]!), { origin: 'continuation', method: 'ma_cross' });
  });

  test('no trigger while the SMA is not rising, nor from a bar already above it (continuously above)', () => {
    const notRising = run(
      [{ closes: [110] }, { closes: [109] }, { closes: [109.5] }, { closes: [111] }, flat(111)],
      maCross()
    );
    assert.equal(notRising.trades.length, 1); // 109.5 crosses but SMA falls; 111 comes from above (109.5 > 109.25)
  });

  test('equality: a prior close equal to its SMA counts as below; a close equal to its SMA does not cross', () => {
    const eqBelow = run([{ closes: [110] }, { closes: [110] }, { closes: [112] }, flat(112)], maCross());
    assert.equal(eqBelow.trades.length, 2); // prior 110 = SMA(110,110)
    const eqClose = run([{ closes: [110] }, { closes: [109] }, { closes: [109] }, flat(109)], maCross());
    assert.equal(eqClose.trades.length, 1); // 109 = SMA(109,109): not strictly above
  });

  test('base priority at the same instant: the base entry is taken, the continuation trigger is suppressed', () => {
    const { c, trades, sim } = run(
      [{ closes: [110] }, { closes: [109] }, { closes: [112] }, flat(112)],
      maCross(),
      (d) => [atClose(d, S0 + 3, 'base-same')]
    );
    assert.deepEqual(originOf(trades[1]!), { origin: 'base_growth', method: null });
    assert.equal(c!.episodes[0]!.end, 'base_entry');
    const suppressed = c!.outcomes.find((o) => o.status === 'suppressed')!;
    assert.equal(suppressed.reason, 'base_priority');
    assert.equal(suppressed.time, c!.ds.sCloseTime[S0 + 3]);
    assert.equal(summarizeSimulation(sim, c!.ds).metrics.continuation.suppressedBasePriority, 1);
  });

  test('warm-up: no SMA without enough completed bars; the warm-up extends only when continuation is ON', () => {
    assert.equal(continuationWarmupBars(maCross({ smaBars: 20, risingBars: 5 })), 26);
    assert.equal(continuationWarmupBars(null), 0);
    const off = { ...defaultTradingParams };
    assert.equal(warmupSessionsForParams(off), warmupSessionsFor('1d', 20));
    assert.equal(warmupSessionsForParams({ ...off, continuation: maCross({ smaBars: 50, risingBars: 10 }) }), 62);
    assert.equal(warmupSessionsForParams({ ...off, continuation: classic() }), warmupSessionsFor('1d', 20));
  });
});

describe('intraday resolution, attribution and validation', () => {
  test('5-minute bars: decisions at bar ends, fills strictly after the decision', () => {
    const minutes = (from: number, to: number, n: number) =>
      Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
    const { trades, c } = run(
      [{ closes: [...minutes(113, 113, 5), ...minutes(113, 118, 5), 118] }, flat(118)],
      breakout(),
      () => [],
      { resolution: '5m' }
    );
    const e = c!.episodes[0]!;
    assert.ok(Number.isFinite(e.triggerTime));
    assert.ok(trades[1]!.entryTime >= e.triggerTime);
    assert.equal((e.triggerTime - c!.ds.bTime[c!.ds.sBarStart[S0 + 1]!]!) % 300, 0); // a 5-minute bucket end
  });

  test('attribution by origin is descriptive and sums to the run totals', () => {
    const { summary } = run([{ closes: [112, 110, 108, 108.6, 109, 109] }, flat(109)], classic());
    const a = summary.metrics.attribution;
    assert.match(a.note, /NOT the incremental/);
    assert.deepEqual(Object.keys(a.byOrigin).sort(), ['base_growth', 'continuation:classic_d1']);
    near(
      a.byOrigin.base_growth!.realizedNetUsd + a.byOrigin['continuation:classic_d1']!.unrealizedNetUsd,
      summary.metrics.pnl.totalMarkedNetUsd
    );
  });

  test('configuration errors are reported by the engine', () => {
    assert.deepEqual(continuationConfigErrors(shallow({ pullbackMinimumPercent: 8, pullbackMaximumPercent: 8 })), [
      'pullbackMinimumPercent must be below pullbackMaximumPercent'
    ]);
    assert.ok(
      tradingParamErrors({ ...defaultTradingParams, continuation: breakout({ formationBars: 0 }) }).some((x) =>
        x.includes('formationBars')
      )
    );
    assert.deepEqual(tradingParamErrors({ ...defaultTradingParams, continuation: DEFAULT_CONTINUATION.ma_cross }), []);
  });
});
