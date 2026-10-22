// Each mechanism on hand-built minute scenarios: the latch re-arms after the rolling high has decayed, the
// trough path arms once per trough, the shallow path yields to the deep one, and the continuation window
// opens only after a profitable exit and arms only on the pullback within the window. Prices are chosen so
// that every comparison is clear of floating-point edges (1 - 80 / 100 is 0.19999999999999996).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { type Dataset, ReferenceHighCache, fixtureDataset } from '../../four-family/data.ts';
import { type SessionSpec, bar, buildSessions, weekdays } from '../../four-family/tests/fixtures.ts';
import { type Mechanisms, type Params, noMechanisms, simulate } from '../engine.ts';
import { families, set2Params, toParams } from '../families.ts';

// A session with a steady price at every minute, or a path through the day (one bar every ten minutes).
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

const run = (ds: Dataset, mechanisms: Partial<Mechanisms>, overrides: Partial<Params>, armStart: number) => {
  const family = families.base!;
  const params: Params = {
    ...toParams(family, set2Params(family)),
    tickWindowSize: 5,
    targetPercentChange: 0.2,
    trailingBuyPercentage: 0.01,
    trailingStopPercentage: 0.1,
    maximumHoldDays: 8,
    intradayLossBuffer: 0.05,
    episodeReset: 1,
    episodeExpiry: 1000,
    anchorPolicy: 0,
    resetPolicy: 0,
    latchDepth: NaN,
    troughRecovery: NaN,
    troughRetrace: NaN,
    shallowDepth: NaN,
    shallowRebound: NaN,
    pullback: NaN,
    continuationWindow: NaN,
    ...overrides
  };
  const highs = new ReferenceHighCache(ds).get(params.tickWindowSize);

  return simulate(
    ds,
    highs,
    { ...noMechanisms, ...mechanisms },
    params,
    {
      stopFill: 'stop',
      marginInterestRate: 0.11,
      investment: 100000,
      firstIndex: 0,
      armStart,
      endIndex: ds.sessionCount - 1
    },
    true
  );
};

// Six sessions at 100, six at 92 (an 8% dip, nothing arms), then a crash to 70 on the twelfth session: the
// deep path arms at 70 (23.9% below the rolling high of 92), the trailing low is 69 and the 71 close buys at
// the next bar's open, 72. The episode's anchor is 92.
const prelude = (dates: string[]): SessionSpec[] => [
  ...dates.slice(0, 6).map((date) => flat(date, 100)),
  ...dates.slice(6, 12).map((date) => flat(date, 92)),
  path(dates[12]!, [70, 69, 71, 72, 72])
];

describe('mechanisms on synthetic scenarios', () => {
  test('the latch re-arms after the rolling high has decayed below the arming level', () => {
    const dates = weekdays('2024-01-01', 30);
    const sessions = buildSessions([
      ...prelude(dates),
      ...dates.slice(13, 16).map((date) => flat(date, 90)), // the stop rises to 81
      flat(dates[16]!, 78), // a profitable gap exit at 78
      // 73 is 18.9% below the rolling high of 90 (no deep arming) but 20.7% below the anchor of 92.
      path(dates[17]!, [73, 72, 73, 74, 74]),
      ...dates.slice(18).map((date) => flat(date, 74))
    ]);
    const ds = fixtureDataset(sessions);
    const base = run(ds, {}, {}, 5);
    const latched = run(ds, { latch: true }, { latchDepth: 0.2 }, 5);

    assert.equal(base.trades.length, 1, 'the base trades once');
    assert.equal(base.trades[0]!.reason, 'trailing stop gap');
    assert.equal(latched.trades.length, 2, 'the latch adds one trade');
    assert.equal(latched.trades[1]!.kind, 'latch');
    assert.equal(latched.trades[1]!.anchorHigh, 92);
    assert.equal(ds.dates[latched.trades[1]!.activationIndex], dates[17]);
    assert.equal(latched.trades[1]!.activationPrice, 73);
    assert.equal(latched.trades[1]!.trailingLow, 72);
    assert.equal(latched.trades[1]!.entryPrice, 74);
    assert.equal(latched.counts.episodesStarted, 1);
  });

  test('the trough path arms once per trough and only after the required rise', () => {
    const dates = weekdays('2024-01-01', 40);
    const scenario = (secondLow: number) =>
      buildSessions([
        ...prelude(dates),
        ...dates.slice(13, 16).map((date) => flat(date, 85)), // the stop rises to 76.5
        flat(dates[16]!, 60), // a gap exit at 60: the trough is 60
        // 69 is 18.8% below the rolling high of 85 (no deep arming) and under a 20% rise from 60 (72).
        ...dates.slice(17, 22).map((date) => flat(date, 69)),
        path(dates[22]!, [73, 72, 73, 74, 74]), // 73 is 21.7% above 60: the trough path arms, buys at 74
        ...dates.slice(23, 26).map((date) => flat(date, 80)), // the stop rises to 72
        flat(dates[26]!, secondLow), // a gap exit; a lower trough only if secondLow < 60
        ...dates.slice(27, 32).map((date) => flat(date, 66)), // 17.5% below 80: no deep arming
        path(dates[32]!, [70, 69, 70, 71, 71]), // 70 is 20.7% above 58, or 16.7% above 60
        ...dates.slice(33).map((date) => flat(date, 71))
      ]);
    const lower = fixtureDataset(scenario(58));
    const higher = fixtureDataset(scenario(61));
    const withLowerTrough = run(lower, { trough: true }, { troughRecovery: 0.2, troughRetrace: 0 }, 5);
    const withoutLowerTrough = run(higher, { trough: true }, { troughRecovery: 0.2, troughRetrace: 0 }, 5);

    assert.deepEqual(
      withLowerTrough.trades.map((trade) => trade.kind),
      ['deep', 'trough', 'trough']
    );
    assert.equal(withLowerTrough.trades[1]!.anchorHigh, 60);
    assert.equal(lower.dates[withLowerTrough.trades[1]!.activationIndex], dates[22]);
    assert.equal(withLowerTrough.trades[1]!.entryPrice, 74);
    assert.equal(withLowerTrough.trades[2]!.anchorHigh, 58);
    assert.equal(lower.dates[withLowerTrough.trades[2]!.activationIndex], dates[32]);
    // Without a lower trough the second rise is blocked: one trough arming per trough.
    assert.deepEqual(
      withoutLowerTrough.trades.map((trade) => trade.kind),
      ['deep', 'trough']
    );
    assert.equal(withoutLowerTrough.counts.activationsByKind.trough, 1);
  });

  test('a shallow setup yields to the deep path and is re-armed as deep at the deep level', () => {
    const dates = weekdays('2024-01-01', 20);
    const sessions = buildSessions([
      ...dates.slice(0, 6).map((date) => flat(date, 100)),
      // The shallow path arms at 88 (12% below 100); 79 reaches the deep level (21%), so the setup is
      // re-armed as deep at 79 with a fresh trailing low; 78 lowers it; 80 buys at the next open, 81.
      path(dates[6]!, [88, 86, 84, 82, 79, 78, 80, 81, 81]),
      ...dates.slice(7).map((date) => flat(date, 83))
    ]);
    const ds = fixtureDataset(sessions);
    const result = run(ds, { dual: true }, { shallowDepth: 0.1, shallowRebound: 0.05 }, 5);

    assert.equal(result.counts.activationsByKind.shallow, 1);
    assert.equal(result.counts.shallowUpgrades, 1);
    assert.equal(result.trades.length, 1);
    assert.equal(result.trades[0]!.kind, 'deep');
    assert.equal(result.trades[0]!.activationPrice, 79);
    assert.equal(result.trades[0]!.trailingLow, 78);
    assert.equal(result.trades[0]!.entryPrice, 81);
  });

  test('the continuation window opens after a profitable exit only and arms on the pullback within it', () => {
    const dates = weekdays('2024-01-01', 40);
    const profitable = buildSessions([
      ...prelude(dates),
      ...dates.slice(13, 16).map((date) => flat(date, 90)), // the stop rises to 81
      flat(dates[16]!, 78), // a profitable gap exit at 78: a window opens at 78
      flat(dates[17]!, 84), // the post-exit high becomes 84
      flat(dates[18]!, 77), // 8.3% below 84: not yet a 10% pullback
      path(dates[19]!, [75, 74, 75, 76, 76]), // 75 is 10.7% below 84: arms (16.7% below the rolling high of 90)
      ...dates.slice(20).map((date) => flat(date, 76))
    ]);
    const losing = buildSessions([
      ...prelude(dates),
      ...dates.slice(13, 16).map((date) => flat(date, 85)), // the stop rises to 76.5
      flat(dates[16]!, 60), // a losing gap exit: no window
      flat(dates[17]!, 70),
      path(dates[18]!, [62, 61, 62, 63, 63]), // 11.4% below 70; 27% below the rolling high of 85: deep arms
      ...dates.slice(19).map((date) => flat(date, 63))
    ]);
    const withWindow = run(
      fixtureDataset(profitable),
      { postExit: true },
      { pullback: 0.1, continuationWindow: 20 },
      5
    );
    const noWindow = run(fixtureDataset(losing), { postExit: true }, { pullback: 0.1, continuationWindow: 20 }, 5);
    const expired = run(fixtureDataset(profitable), { postExit: true }, { pullback: 0.1, continuationWindow: 2 }, 5);

    assert.equal(withWindow.counts.continuationWindows, 1);
    assert.deepEqual(
      withWindow.trades.map((trade) => trade.kind),
      ['deep', 'continuation']
    );
    assert.equal(withWindow.trades[1]!.anchorHigh, 84);
    assert.equal(fixtureDataset(profitable).dates[withWindow.trades[1]!.activationIndex], dates[19]);
    assert.equal(withWindow.trades[1]!.entryPrice, 76);
    assert.equal(noWindow.counts.continuationWindows, 0);
    assert.deepEqual(
      noWindow.trades.map((trade) => trade.kind),
      ['deep', 'deep']
    );
    assert.equal(expired.counts.continuationExpiries, 1);
    assert.equal(expired.trades.length, 1, 'the window expires before the pullback');
  });
});
