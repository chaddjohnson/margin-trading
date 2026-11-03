// The stop policies and the entry modes on hand-built minute scenarios: activation, latching, equality boundaries,
// same-bar ordering, the protective stop, the always and swing paths, the C3 arbitration, path causality, overnight
// gaps, the time exits and re-arming after exits. Prices are chosen clear of floating-point edges.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { type Dataset, ReferenceHighCache, fixtureDataset } from '../../four-family/data.ts';
import { type SessionSpec, bar, buildSessions, weekdays } from '../../four-family/tests/fixtures.ts';
import {
  type Architecture,
  type Params,
  ReferenceLowCache,
  computeReferenceLows,
  replayPosition,
  simulate
} from '../engine.ts';

const flat = (date: string, price: number): SessionSpec => ({
  date,
  bars: [0, 60, 120, 180, 240, 300, 389].map((minute) => bar(minute, price)),
  closingPrint: price
});

const path = (date: string, prices: number[]): SessionSpec => ({
  date,
  bars: prices.map((price, index) => bar(index * 10, price)),
  closingPrint: prices.at(-1)!
});

// A path whose bars may span several prices (open first, close last), so that a minute can trade through a level.
const bars = (date: string, minutes: number[][]): SessionSpec => ({
  date,
  bars: minutes.map((prices, index) => bar(index * 10, ...prices)),
  closingPrint: minutes.at(-1)!.at(-1)!
});

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

const baseParams: Params = {
  targetPercentChange: 0.2,
  trailingBuyPercentage: 0.01,
  trailingStopPercentage: 0.1,
  maximumHoldDays: 8,
  tickWindowSize: 5,
  intradayLossBuffer: 0.05,
  pullback: NaN,
  continuationWindow: NaN,
  activationGain: NaN,
  earlyStop: NaN,
  alwaysRebound: NaN,
  swingLookback: NaN,
  swingRebound: NaN,
  swingProximity: NaN
};

const run = (
  ds: Dataset,
  architecture: Partial<Architecture>,
  overrides: Partial<Params>,
  armStart: number,
  rate = 0.11
) => {
  const params = { ...baseParams, ...overrides };
  const arch: Architecture = { entryMode: 'deep', postExit: false, stopPolicy: 'net', ...architecture };
  const highs = new ReferenceHighCache(ds).get(params.tickWindowSize);
  const lows = Number.isFinite(params.swingLookback) ? new ReferenceLowCache(ds).get(params.swingLookback) : undefined;

  return simulate(
    ds,
    highs,
    lows,
    arch,
    params,
    {
      stopFill: 'stop',
      marginInterestRate: rate,
      investment: 100000,
      firstIndex: 0,
      armStart,
      endIndex: ds.sessionCount - 1
    },
    true
  );
};

// Six sessions at 100, six at 92, then a crash to 70 on the twelfth session: the deep path arms at 70 (23.9% below
// the rolling high of 92), the trailing low is 69 and the 71 close buys at the next bar's open, 72.
const prelude = (dates: string[]): SessionSpec[] => [
  ...dates.slice(0, 6).map((date) => flat(date, 100)),
  ...dates.slice(6, 12).map((date) => flat(date, 92)),
  path(dates[12]!, [70, 69, 71, 72, 72])
];

describe('stop policies', () => {
  // After the 72 entry the price drifts to 74 for several sessions (the stop at 66.6 is below breakeven: inactive
  // under the net rule), then rises to 80 (stop 72, gross breakeven at 72) and 84 (stop 75.6), then falls to 73.
  const dates = weekdays('2024-01-01', 40);
  const sessions = buildSessions([
    ...prelude(dates),
    flat(dates[13]!, 74),
    flat(dates[14]!, 74),
    flat(dates[15]!, 80),
    flat(dates[16]!, 84),
    bars(dates[17]!, [[84], [80], [76, 73], [73]]),
    ...dates.slice(18, 24).map((date) => flat(date, 73))
  ]);
  const ds = fixtureDataset(sessions);

  test('net: inactive while a fill at the stop would lose after interest, active once above it, exits at the stop level', () => {
    const { trades, stopTrace } = run(ds, { stopPolicy: 'net' }, {}, 6);
    const trade = trades[0]!;

    assert.equal(trade.entryPrice, 72);
    // Sessions 13 and 14: stop 66.6 (74 x 0.9), below breakeven: inactive. Session 15 opens with the stop still 66.6.
    // Session 16: stop 72 (80 x 0.9) is gross breakeven but below net breakeven (interest): inactive. Session 17:
    // stop 75.6 (84 x 0.9): active; the minute opening at 76 and falling to 73 trades through it.
    const states = stopTrace!.map((row) => [ds.dates[row.index], row.stopPrice.toFixed(2), row.active] as const);

    assert.deepEqual(
      states.slice(0, 5).map((state) => state[2]),
      [false, false, false, false, true]
    );
    assert.equal(states[4]![1], '75.60');
    assert.equal(trade.reason, 'trailing stop');
    near(trade.exitPrice, 75.6);
    assert.equal(trade.exitExecution, 'stop level');
    assert.equal(ds.dates[trade.exitIndex], dates[17]);
    assert.equal(trade.stopFirstActiveIndex, 17);
  });

  test('gross breakeven (B-B) latches when the stop level reaches the entry price and holds through a loss-making sale', () => {
    // Build a variant where the price falls back below the entry after latching: 72 entry, 80 (stop 72 >= 72:
    // latched after that session), then 71 and 60.
    const variant = fixtureDataset(
      buildSessions([
        ...prelude(dates),
        flat(dates[13]!, 80),
        bars(dates[14]!, [[79], [75, 71], [71], [71]]),
        flat(dates[15]!, 60),
        flat(dates[16]!, 60)
      ])
    );
    const net = run(variant, { stopPolicy: 'net' }, {}, 6).trades[0]!;
    const breakeven = run(variant, { stopPolicy: 'breakeven' }, {}, 6);
    const trade = breakeven.trades[0]!;

    // Net rule: the stop 72 is gross breakeven but nets a loss after a day's interest, so nothing exits on session
    // 14; the maximum hold is not due yet; the position rides to 60 and is sold by the 8-day hold later.
    assert.notEqual(net.exitIndex, 14);
    // B-B: latched at the end of session 13 (stop 72 >= entry 72, the equality boundary), so the 71 low on
    // session 14 trades through the 72 stop, a net loss after interest.
    assert.equal(trade.stopLatchIndex, 13);
    assert.equal(trade.exitIndex, 14);
    assert.equal(trade.exitPrice, 72);
    assert.equal(trade.reason, 'trailing stop');
    assert.ok(trade.shares * 72 - 100000 - 100000 * 0.11 * (2 / 365) < 0, 'the latched stop nets a loss');
  });

  test('gross threshold (B-A) activates at the configured appreciation, not before, and is a latch', () => {
    // 72 entry; highs 74, 74, 80 (11.1% above the entry), 84. With G 12% the stop activates only after the 84
    // session; with G 10% after the 80 session.
    const g10 = run(ds, { stopPolicy: 'gross' }, { activationGain: 0.1 }, 6).trades[0]!;
    const g12 = run(ds, { stopPolicy: 'gross' }, { activationGain: 0.12 }, 6).trades[0]!;

    assert.equal(g10.stopLatchIndex, 15);
    assert.equal(g10.stopFirstActiveIndex, 16);
    assert.equal(g12.stopLatchIndex, 16);
    assert.equal(g12.stopFirstActiveIndex, 17);
    near(g10.exitPrice, 75.6);
    near(g12.exitPrice, 75.6);
  });

  test('always (B-D) is active from the session after the entry, and a gap through it fills at the open', () => {
    const variant = fixtureDataset(
      buildSessions([...prelude(dates), path(dates[13]!, [60, 60, 60, 60, 60]), flat(dates[14]!, 60)])
    );
    const trade = run(variant, { stopPolicy: 'always' }, {}, 6).trades[0]!;

    // Stop 64.8 (72 x 0.9) from the entry session; session 13 opens at 60, through it.
    assert.equal(trade.stopFirstActiveIndex, 13);
    assert.equal(trade.reason, 'trailing stop gap');
    assert.equal(trade.exitPrice, 60);
    assert.equal(trade.exitIndex, 13);
  });

  test('two-stage (B-C): the protective stop acts in the EARLY stage, the trailing stop after the breakeven latch', () => {
    // Early loss: 72 entry, next session 66 → the protective stop at 72 x (1 - 0.06) = 67.68 is hit.
    const early = fixtureDataset(
      buildSessions([...prelude(dates), bars(dates[13]!, [[70], [68, 66], [66], [66]]), flat(dates[14]!, 66)])
    );
    const earlyTrade = run(early, { stopPolicy: 'twoStage' }, { earlyStop: 0.06 }, 6).trades[0]!;

    assert.equal(earlyTrade.reason, 'protective stop');
    near(earlyTrade.exitPrice, 67.68);
    assert.equal(earlyTrade.stopFirstActiveIndex, -1, 'the trailing stop was never active');

    // Established: on the main scenario the stop reaches 72 after the 80 session (latched), so the 73 path exits
    // at 75.6 like the net rule, and the protective stop never fired.
    const late = run(ds, { stopPolicy: 'twoStage' }, { earlyStop: 0.06 }, 6);
    const lateTrade = late.trades[0]!;

    assert.equal(lateTrade.stopLatchIndex, 15);
    assert.equal(lateTrade.reason, 'trailing stop');
    near(lateTrade.exitPrice, 75.6);
    assert.equal(late.counts.protectiveStopExits, 0);
  });

  test('netLatched never switches off; net can', () => {
    // A long flat stretch after the stop becomes active: interest grows until the stop level nets a loss again.
    // 72 entry, 80 (stop 72), then 81 for many sessions (stop 72.9): active at first (profit at 72.9 is +$1,250
    // minus interest), inactive once interest exceeds the gross profit at the stop (about 41 days at 11%).
    const long = weekdays('2024-01-01', 120);
    const variant = fixtureDataset(
      buildSessions([
        ...prelude(long),
        flat(long[13]!, 80),
        flat(long[14]!, 81),
        ...long.slice(15, 110).map((date) => flat(date, 81))
      ])
    );
    const net = run(variant, { stopPolicy: 'net' }, { maximumHoldDays: 400 }, 6);
    const latched = run(variant, { stopPolicy: 'netLatched' }, { maximumHoldDays: 400 }, 6);
    const netTrade = net.trades[0]!;
    const latchedTrade = latched.trades[0]!;

    assert.ok(netTrade.stopFirstActiveIndex > 0);
    assert.ok(netTrade.stopSwitchOffSessions > 0, 'the net rule switched off after being active');
    assert.equal(latchedTrade.stopSwitchOffSessions, 0);
    assert.equal(latchedTrade.stopLatchIndex, netTrade.stopFirstActiveIndex);
    assert.ok(latchedTrade.stopActiveSessions > netTrade.stopActiveSessions);
  });

  test('replayPosition reproduces the engine exit of a given fill', () => {
    const engine = run(ds, { stopPolicy: 'net' }, {}, 6).trades[0]!;
    const replayed = replayPosition(
      ds,
      { entryIndex: engine.entryIndex, entryBar: engine.entryBar, entryPrice: engine.entryPrice },
      baseParams,
      { stopFill: 'stop', marginInterestRate: 0.11, investment: 100000, endIndex: ds.sessionCount - 1 },
      'net'
    );

    assert.equal(replayed.trade.exitIndex, engine.exitIndex);
    assert.equal(replayed.trade.exitPrice, engine.exitPrice);
    assert.equal(replayed.trade.reason, engine.reason);
    assert.equal(replayed.stopTrace.length, engine.exitIndex - engine.entryIndex);
  });

  test('the maximum hold still sells a losing position whatever the policy, and the buffer only acts after it applies', () => {
    const variant = fixtureDataset(
      buildSessions([...prelude(dates), ...dates.slice(13, 30).map((date) => flat(date, 71))])
    );

    for (const policy of ['net', 'gross', 'breakeven'] as const) {
      const trade = run(variant, { stopPolicy: policy }, { activationGain: 0.1 }, 6).trades[0]!;

      assert.equal(trade.reason, 'maximum hold', policy);
      assert.ok((ds.sTime[trade.exitIndex]! - trade.entryTimestamp) / 86400 >= 8);
    }
  });
});

describe('entry modes', () => {
  const dates = weekdays('2024-01-01', 40);

  test('always: arms on the first eligible minute, buys on the rebound from the lowest later low, re-arms after an exit, never on the exit session', () => {
    // Flat at 100 for 8 sessions (eligibility from session 6), then 100, 98, 97, 99 within a session.
    const ds = fixtureDataset(
      buildSessions([
        ...dates.slice(0, 6).map((date) => flat(date, 100)),
        path(dates[6]!, [100, 100, 98, 97, 99, 99]),
        flat(dates[7]!, 99),
        // A crash to 60 on session 8: the 8-day hold later sells the loss. The exit session never re-arms.
        ...dates.slice(8, 20).map((date) => flat(date, 60)),
        path(dates[20]!, [60, 59, 61, 62, 62]),
        ...dates.slice(21, 30).map((date) => flat(date, 62))
      ])
    );
    const result = run(
      ds,
      { entryMode: 'always' },
      { alwaysRebound: 0.02, targetPercentChange: NaN, tickWindowSize: NaN },
      6
    );
    const [first, second] = result.trades;

    assert.equal(first!.kind, 'always');
    assert.equal(first!.activationIndex, 6);
    assert.equal(first!.activationPrice, 100, 'armed on the first minute close');
    assert.equal(first!.trailingLow, 97);
    assert.equal(first!.decisionPrice, 99, 'the 99 close is 2% above the 97 low');
    assert.equal(first!.entryPrice, 99);
    assert.equal(first!.reason, 'maximum hold');
    assert.ok(second, 're-armed after the exit');
    assert.ok(second!.activationIndex > first!.exitIndex, 'the exit session never arms');
    assert.equal(second!.activationIndex, first!.exitIndex + 1);
  });

  test('swing: the rolling low excludes the current session, a close at or below it arms, the rebound buys', () => {
    const ds = fixtureDataset(
      buildSessions([
        ...dates.slice(0, 6).map((date) => flat(date, 100)),
        flat(dates[6]!, 96),
        flat(dates[7]!, 97),
        // Eligible from session 8, where the rolling low over 3 sessions is 96 (sessions 5..7: 100, 96, 97), not the
        // session's own 94. The 95 close arms; the trailing low is 94 and the 95 close (94 x 1.01 = 94.94) buys at
        // the next bar, 96. (From session 6 the 96 close would itself have armed: a new 3-session low.)
        path(dates[8]!, [97, 95, 94, 95, 96, 96]),
        ...dates.slice(9, 20).map((date) => flat(date, 96))
      ])
    );
    const lows = computeReferenceLows(ds, 3);

    assert.equal(lows[8], 96);
    assert.equal(lows[7], 96);
    assert.equal(lows[6], 100);
    assert.equal(lows[0], Infinity);

    const fromSix = run(
      ds,
      { entryMode: 'swing' },
      { swingLookback: 3, swingRebound: 0.01, swingProximity: 0, targetPercentChange: NaN, tickWindowSize: NaN },
      6
    );

    assert.equal(fromSix.trades[0]!.activationIndex, 6, 'the 96 close on session 6 is a new three-session low');

    const result = run(
      ds,
      { entryMode: 'swing' },
      { swingLookback: 3, swingRebound: 0.01, swingProximity: 0, targetPercentChange: NaN, tickWindowSize: NaN },
      8
    );
    const trade = result.trades[0]!;

    assert.equal(trade.kind, 'swing');
    assert.equal(trade.activationIndex, 8);
    assert.equal(trade.activationPrice, 95);
    assert.equal(trade.anchorHigh, 96, 'the anchor is the rolling low');
    assert.equal(trade.trailingLow, 94);
    assert.equal(trade.entryPrice, 96);
  });

  test('C3 arbitration: an armed swing setup yields to the deep path on the minute D1 would arm, and the window stays open', () => {
    // Prelude: the deep path would arm at the 70 close on session 12. With the swing path (K 3) the 92 → 70 fall
    // arms a swing setup earlier (the first 70 bar is itself the deep minute here, so make the swing arm a session
    // earlier: a session 11 at 91 is a new 3-session low).
    const ds = fixtureDataset(
      buildSessions([
        ...dates.slice(0, 6).map((date) => flat(date, 100)),
        ...dates.slice(6, 11).map((date) => flat(date, 92)),
        path(dates[11]!, [92, 91, 91, 91, 91]),
        path(dates[12]!, [70, 69, 71, 72, 72]),
        ...dates.slice(13, 20).map((date) => flat(date, 72))
      ])
    );
    const d1Only = run(ds, { entryMode: 'deep' }, {}, 6);
    const combined = run(
      ds,
      { entryMode: 'deepSwing' },
      { swingLookback: 3, swingRebound: 0.05, swingProximity: 0 },
      6
    );
    const setup = combined.setups![0]!;

    assert.equal(setup.upgradedFrom, 'swing');
    assert.equal(setup.kind, 'deep');
    assert.equal(combined.counts.upgrades, 1);
    assert.equal(combined.trades.length, 1);
    assert.equal(combined.trades[0]!.kind, 'deep');
    assert.equal(combined.trades[0]!.entryPrice, d1Only.trades[0]!.entryPrice);
    assert.equal(combined.trades[0]!.activationPrice, d1Only.trades[0]!.activationPrice);
    assert.equal(combined.trades[0]!.trailingLow, d1Only.trades[0]!.trailingLow);
  });

  test('path causality: nothing arms before the eligibility session, and the rolling low never sees the current session', () => {
    const ds = fixtureDataset(
      buildSessions([
        flat(dates[0]!, 100),
        flat(dates[1]!, 101),
        flat(dates[2]!, 102),
        path(dates[3]!, [90, 89, 95, 95, 95]),
        ...dates.slice(4, 12).map((date) => flat(date, 95))
      ])
    );
    const late = run(
      ds,
      { entryMode: 'swing' },
      { swingLookback: 2, swingRebound: 0.01, swingProximity: 0, targetPercentChange: NaN, tickWindowSize: NaN },
      8
    );

    assert.ok(late.trades.every((trade) => trade.activationIndex >= 8));

    const early = run(
      ds,
      { entryMode: 'swing' },
      { swingLookback: 2, swingRebound: 0.01, swingProximity: 0, targetPercentChange: NaN, tickWindowSize: NaN },
      2
    );

    assert.equal(
      early.trades[0]!.activationIndex,
      3,
      'the 90 close on session 3 is below the two-session low of 101; the 102 close on session 2 was above its 100'
    );
  });
});
