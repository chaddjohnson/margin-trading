import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { simulate, validateParams } from '../engine.ts';
import { IndicatorCache } from '../indicators.ts';
import { windowMetrics } from '../metrics.ts';
import { type Ohlc, barsFrom, flat, run } from './helpers.ts';

const fixedY = (reboundTenths: number, extra = {}) => ({ entryMode: 'fixed' as const, reboundTenths, ...extra });

// Reference high 100 (bar 0), then a decline that arms at 89.9 (10.1% below), troughs at 75 and rebounds.
const illustrative: Ohlc[] = [flat(100), flat(98), flat(95), flat(89.9), flat(80), flat(75), flat(77.2), flat(77.24)];

describe('fixed trailing entry', () => {
  test('arms at X without buying on the arming close; lower closes move the trough; buys at the actual close', () => {
    const bars = barsFrom([...illustrative, flat(78), flat(79)]);
    const result = run(bars, { lookback: 10, ...fixedY(30) });
    const [setup] = result.setups;

    assert.equal(result.setups.length, 1);
    assert.equal(setup!.armIndex, 3);
    assert.equal(setup!.armClose, 89.9);
    assert.equal(setup!.armReferenceHigh, 100);
    assert.equal(setup!.trough, 75);
    assert.equal(setup!.troughIndex, 5);
    assert.equal(setup!.newTroughs, 2);
    // 77.20 and 77.24 are below 75 x 1.03 = 77.25; 78 is the first close at or above it.
    assert.equal(setup!.decisionIndex, 8);
    assert.ok(Math.abs(setup!.trigger - 77.25) < 1e-9);
    assert.equal(result.trades.length, 1);
    assert.equal(result.trades[0]!.entryIndex, 8);
    assert.equal(result.trades[0]!.entryPrice, 78); // the eligible close, not the 77.25 threshold
    assert.equal(setup!.outcome, 'filled');
  });

  test('legacy mode buys on the arming close itself', () => {
    const bars = barsFrom([...illustrative, flat(78)]);
    const result = run(bars, { lookback: 10 });

    assert.equal(result.setups.length, 0);
    assert.equal(result.trades[0]!.entryIndex, 3);
    assert.equal(result.trades[0]!.entryPrice, 89.9);
  });

  test('even a tiny rebound cannot fill on the arming close', () => {
    const bars = barsFrom([flat(100), flat(95), flat(89.9), flat(89.99)]);
    const result = run(bars, { lookback: 10, ...fixedY(1) });

    assert.equal(result.setups[0]!.armIndex, 2);
    assert.equal(result.trades[0]!.entryIndex, 3);
  });

  test('the drawdown need not still be >= X when the rebound fills', () => {
    const bars = barsFrom([flat(100), flat(95), flat(89.9), flat(88), flat(93)]);
    const result = run(bars, { lookback: 10, ...fixedY(50) });

    // 93 is only 7% below the reference high, but at least 5% above the 88 trough.
    assert.equal(result.trades[0]!.entryIndex, 4);
    assert.equal(result.trades[0]!.entryPrice, 93);
  });

  test('an extended decline keeps lowering the trigger; a rebound below the threshold does not fill', () => {
    const rows: Ohlc[] = [flat(100), flat(89.9)];

    for (let close = 88; close >= 60; close -= 2) {
      rows.push(flat(close), flat(close + 1)); // +1 is below the 3% trigger from each new trough
    }

    const result = run(barsFrom(rows), { lookback: 60, ...fixedY(30) });

    assert.equal(result.trades.length, 0);
    assert.equal(result.setups.length, 1);
    assert.equal(result.setups[0]!.trough, 60);
    assert.equal(result.setups[0]!.outcome, 'pending_at_end');
  });

  test('only one setup while armed: deeper declines and new drawdown signals do not re-arm', () => {
    const bars = barsFrom([flat(100), flat(89.9), flat(85), flat(80), flat(86), flat(84), flat(83), flat(90)]);
    const result = run(bars, { lookback: 3, ...fixedY(50) });

    // 86 >= 80 x 1.05 = 84 fills at index 4; before that the setup is the only one.
    assert.equal(result.setups.length, 1);
    assert.equal(result.trades[0]!.entryIndex, 4);
  });

  test('pending setups at the end of data are reported, not filled', () => {
    const result = run(barsFrom([flat(100), flat(89.9), flat(85), flat(86)]), { lookback: 10, ...fixedY(30) });

    assert.equal(result.trades.length, 0);
    assert.equal(result.setups[0]!.outcome, 'pending_at_end');

    const metrics = windowMetrics(barsFrom([flat(100), flat(89.9), flat(85), flat(86)]), result, 0, 3);

    assert.equal(metrics.setupsPendingAtEnd, 1);
    assert.equal(metrics.entries, 0);
  });

  test('next-open execution fills at the next open, through gaps up or down, and not past the data', () => {
    const base = [flat(100), flat(89.9), flat(85), flat(88)];
    const gapUp = run(
      barsFrom([...base, [90, 91, 89, 90]]),
      { lookback: 10, ...fixedY(30) },
      { execution: 'nextOpen' }
    );
    const gapDown = run(
      barsFrom([...base, [86, 87, 85, 86.5]]),
      { lookback: 10, ...fixedY(30) },
      { execution: 'nextOpen' }
    );
    const atEnd = run(barsFrom(base), { lookback: 10, ...fixedY(30) }, { execution: 'nextOpen' });

    assert.equal(gapUp.setups[0]!.decisionIndex, 3);
    assert.equal(gapUp.trades[0]!.entryIndex, 4);
    assert.equal(gapUp.trades[0]!.entryPrice, 90);
    assert.equal(gapDown.trades[0]!.entryPrice, 86);
    assert.equal(atEnd.trades.length, 0);
    assert.equal(atEnd.setups[0]!.outcome, 'order_unfilled_at_end');
  });

  test('next-open fills feed the fill session high into the stop for the next session', () => {
    const bars = barsFrom([flat(100), flat(89.9), flat(85), flat(88), [88, 95, 87, 94], flat(94)]);
    const result = run(bars, { lookback: 10, ...fixedY(30) }, { execution: 'nextOpen' });

    assert.equal(result.trades[0]!.entryPrice, 88);
    assert.equal(result.trades[0]!.lowestLow, 87);
  });

  test('legacy next-open execution buys at the open after the signal close', () => {
    const bars = barsFrom([flat(100), flat(89.9), [87, 88, 86, 87]]);
    const result = run(bars, { lookback: 10 }, { execution: 'nextOpen' });

    assert.equal(result.trades[0]!.decisionIndex, 1);
    assert.equal(result.trades[0]!.entryIndex, 2);
    assert.equal(result.trades[0]!.entryPrice, 87);
  });

  test('optional max-wait expiry cancels a setup and allows a fresh one', () => {
    const rows: Ohlc[] = [flat(100), flat(89.9), flat(89), flat(88.5), flat(88.2), flat(88.1), flat(88), flat(92)];
    const result = run(barsFrom(rows), { lookback: 10, ...fixedY(30) }, { maxWaitSessions: 3 });

    assert.equal(result.setups[0]!.outcome, 'expired');
    assert.equal(result.setups[0]!.endIndex, 4);
    assert.equal(result.setups[1]!.armIndex, 5);
    assert.equal(result.trades[0]!.entryIndex, 7);
  });

  test('missing sessions: interest and the maximum hold use calendar days across a gap', () => {
    // Legacy entry at 89.9 on index 1; a 20-calendar-day gap after index 2; index 3 opens at a loss.
    const bars = barsFrom([flat(100), flat(89.9), flat(89), [88, 89, 87, 88]], { 2: 20 });
    const result = run(bars, { lookback: 10 });
    const days = (bars.time[3]! - bars.time[1]!) / 86400;

    assert.ok(days >= 15);
    assert.equal(result.trades[0]!.reason, 'maximum hold');
    assert.equal(result.trades[0]!.exitPrice, 88);
    assert.ok(Math.abs(result.trades[0]!.interest - (100000 * 0.11 * days) / 365) < 1e-6);
  });

  test('Y = 0 is not a trailing entry; parameters are validated', () => {
    assert.throws(() => validateParams({ ...run(barsFrom([flat(1), flat(1)]), {}).params, ...fixedY(0) }));
    assert.throws(() => run(barsFrom([flat(1), flat(1)]), { reboundTenths: 30 }));
  });
});

// A restricted episode: the first trade (fixed Y = 3%) loses at the 15-day open exit, then the path offers
// a rebound above the frozen lower level (variant A fills, B waits) and a later one below it (B fills).
const restrictedPath = (): Ohlc[] => {
  const rows: Ohlc[] = [flat(100), flat(98), flat(95), flat(89.9), flat(85), flat(87.6)]; // buy 87.6 at index 5

  for (let index = 0; index < 10; index++) {
    rows.push(flat(86.5 - index * 0.1)); // 85.6 .. 86.5: no stop (inactive), no exit before 15 days
  }

  rows.push([84, 85, 83.5, 84]); // index 16: 15+ calendar days, the open at 84 loses: maximum-hold exit
  rows.push(flat(83)); // 17: signal, but 83 > 84 x 0.98 = 82.32: arming blocked
  rows.push(flat(82)); // 18: <= 82.32: arms (restricted)
  rows.push(flat(80)); // 19: new trough
  rows.push(flat(82.5)); // 20: >= 80 x 1.03 = 82.4; above 82.32 (A fills here; B waits)
  rows.push(flat(81)); // 21
  rows.push(flat(78)); // 22: new trough
  rows.push(flat(80.4)); // 23: >= 78 x 1.03 = 80.34 and <= 82.32 (B fills here)
  rows.push(flat(80.5));

  return rows;
};

describe('material-loss restriction with trailing entries', () => {
  test('the lower level gives permission to arm; variant A fills above it, variant B only below it', () => {
    const bars = barsFrom(restrictedPath());
    const a = run(bars, { lookback: 30, ...fixedY(30) }, { restrictedFill: 'A' });
    const b = run(bars, { lookback: 30, ...fixedY(30) }, { restrictedFill: 'B' });

    for (const result of [a, b]) {
      assert.equal(result.trades[0]!.entryIndex, 5);
      assert.equal(result.trades[0]!.exitIndex, 16);
      assert.equal(result.trades[0]!.reason, 'maximum hold');
      assert.equal(result.restrictions, 1);
      assert.equal(result.setups[1]!.armIndex, 18); // not 17, where the close was above the lower level
      assert.equal(result.setups[1]!.restrictedAtArm, true);
      assert.ok(Math.abs(result.setups[1]!.lowerLevelAtArm - 82.32) < 1e-9);
    }

    assert.equal(a.trades[1]!.entryIndex, 20);
    assert.equal(a.trades[1]!.entryPrice, 82.5); // above the frozen lower level: the semantic change of A
    assert.equal(a.trades[1]!.restrictedEntry, true);
    assert.equal(b.setups[1]!.blockedTriggers, 1);
    assert.equal(b.trades[1]!.entryIndex, 23);
    assert.equal(b.trades[1]!.entryPrice, 80.4);
    assert.equal(a.lowerPriceReentries, 1);
    assert.equal(b.lowerPriceReentries, 1);

    const states = a.stateLog.map((row) => `${row.index}:${row.reason}`);

    assert.ok(states.includes('17:entry_blocked'));
    assert.ok(states.includes('18:armed'));
    assert.ok(states.includes('20:lower_price_reentry'));
  });

  test('a recovery reset cancels the pending setup; nothing is bought that session; normal arming resumes next', () => {
    const rows = restrictedPath().slice(0, 20); // armed at 18, trough 80 at 19

    // Reset level = 80 + 0.38 x (100 - 80) = 87.6. 88 also clears the 82.4 trigger, but the reset wins.
    rows.push(flat(88), flat(88.5), flat(87), flat(85), flat(88));

    const bars = barsFrom(rows);
    const result = run(bars, { lookback: 30, ...fixedY(30) });

    assert.equal(result.setups[1]!.outcome, 'cancelled_reset');
    assert.equal(result.setups[1]!.endIndex, 20);
    assert.equal(result.recoveryResets, 1);
    assert.equal(result.cancelledSetups, 1);
    assert.equal(result.episodes[0]!.resolution, 'recovery_reset');
    assert.equal(result.episodes[0]!.cancelledSetup, true);
    assert.ok(result.trades.every((trade) => trade.entryIndex !== 20));
    // Next session: unrestricted, 88.5 is 11.5% below 100, so a new setup arms (no purchase).
    assert.equal(result.setups[2]!.armIndex, 21);
    assert.equal(result.setups[2]!.restrictedAtArm, false);
    assert.ok(result.trades.every((trade) => trade.entryIndex !== 21));
    // 88 >= 85 x 1.03 = 87.55 fills at index 24.
    assert.equal(result.trades[1]!.entryIndex, 24);
  });

  test('the activation reference high is frozen for a later restriction (alternative: the fill session high)', () => {
    // Lookback 5: at arming (index 3) the reference high is 100; at the fill the rolling high has fallen.
    const rows: Ohlc[] = [flat(100), flat(98), flat(95), flat(89.9), flat(85), flat(84), flat(83), flat(86)];

    // 84.5 is a 1.7% price loss: the 15-day open exit restricts.
    for (let index = 0; index < 12; index++) {
      rows.push(flat(84.5));
    }

    const bars = barsFrom(rows);
    const activation = run(bars, { lookback: 5, ...fixedY(30) });
    const fill = run(bars, { lookback: 5, ...fixedY(30) }, { frozenHigh: 'fill' });

    assert.equal(activation.trades[0]!.entryIndex, 7);
    assert.equal(activation.trades[0]!.referenceHigh, 100);
    assert.equal(fill.trades[0]!.referenceHigh, 95); // highs of indices 2..6
    assert.equal(activation.episodes[0]!.referenceHigh, 100);
    assert.equal(fill.episodes[0]!.referenceHigh, 95);
  });
});

describe('exit rules (unchanged from the original)', () => {
  const entryThen = (after: Ohlc[]) => barsFrom([flat(100), flat(89.9), ...after]); // legacy entry at 89.9 (index 1)

  test('the stop activates only when a fill at the stop is profitable after interest', () => {
    // Highs up to 100: stop 92, above the 89.9 entry plus interest, so active; the next low reaches it.
    const bars = entryThen([
      [92, 100, 91.5, 99],
      [98, 98.5, 91, 92]
    ]);
    const result = run(bars, { lookback: 10 });

    assert.equal(result.trades[0]!.reason, 'trailing stop');
    assert.equal(result.trades[0]!.exitPrice, 92);
  });

  test('an inactive stop never fires, even when the low falls through it', () => {
    const bars = entryThen([[90, 91, 80, 84], flat(85)]);
    const result = run(bars, { lookback: 10 });

    assert.equal(result.trades[0]!.reason, 'open');
  });

  test('a gap through an active stop fills at the open, even at a loss to the stop price', () => {
    const bars = entryThen([
      [92, 100, 91.5, 99],
      [90, 91, 89, 90.5]
    ]);
    const result = run(bars, { lookback: 10 });

    assert.equal(result.trades[0]!.reason, 'trailing stop gap');
    assert.equal(result.trades[0]!.exitPrice, 90);
  });

  test('a session high never moves that session stop', () => {
    // Session 2 spikes to 100 and falls to 91: the stop for session 2 still comes from the entry close.
    const bars = entryThen([
      [90, 100, 91, 95],
      [95, 96, 91.5, 93]
    ]);
    const result = run(bars, { lookback: 10 });

    assert.equal(result.trades[0]!.exitIndex, 3);
    assert.equal(result.trades[0]!.exitPrice, 92);
  });

  test('the maximum hold sells at the open after 15 calendar days only if that sale loses money', () => {
    const rows: Ohlc[] = [];

    for (let index = 0; index < 10; index++) {
      rows.push(flat(89));
    }

    rows.push([88.5, 90, 88, 89.5], flat(89));

    const result = run(entryThen(rows), { lookback: 30 });
    const trade = result.trades[0]!;

    assert.equal(trade.reason, 'maximum hold');
    assert.equal(trade.exitPrice, 88.5);
    assert.ok((trade.exitTime - trade.entryTime) / 86400 >= 15);
  });

  test('no same-session re-entry after an exit; the next session can buy', () => {
    // The gap exit at 91 is a profit (no restriction); the exit session's close is a 20% signal.
    const bars = entryThen([[92, 100, 91.5, 99], [91, 91.5, 79, 80], flat(80)]);
    const result = run(bars, { lookback: 10 });

    assert.equal(result.trades[0]!.exitIndex, 3);
    assert.equal(result.trades[0]!.reason, 'trailing stop gap');
    assert.equal(result.trades[1]!.entryIndex, 4);
  });
});

describe('ATR trailing entry', () => {
  // Constant 2-point ranges with no gaps: ATR = 2 once warm. Then a decline and a rebound.
  const atrRows = (): Ohlc[] => {
    const rows: Ohlc[] = [];

    for (let index = 0; index < 20; index++) {
      rows.push([100, 101, 99, 100]);
    }

    rows.push([95, 96, 94, 89.9], [88, 89, 87, 88], [89, 91, 88, 91.9], [92, 95, 91, 94.5]);

    return rows;
  };

  test('snapshot: trigger = trough + K x ATR of the session before the trough, held until a lower trough', () => {
    const bars = barsFrom(atrRows());
    const cache = new IndicatorCache(bars);
    const atr = cache.atr(5);
    const result = simulate(
      bars,
      cache,
      { ...run(bars, {}).params, lookback: 25, entryMode: 'atrSnapshot', atrMultTenths: 20, atrPeriod: 5 },
      0,
      bars.date.length - 1
    );
    const [setup] = result.setups;

    assert.equal(setup!.armIndex, 20);
    assert.equal(setup!.troughIndex, 21);
    assert.equal(setup!.atrSnapshot, atr[20]); // re-snapshotted at the new trough, from the session before
    // atr[20] includes the 20th bar's 10.1-point true range (100 -> 89.9 close, range 94..96 vs 100).
    const trigger = 88 + 2 * atr[20]!;

    assert.ok(91.9 < trigger && trigger <= 94.5);
    assert.equal(result.trades[0]!.entryIndex, 23);
    assert.equal(setup!.trigger, trigger);
  });

  test('rolling: the multiple of the prior session ATR is re-read every session', () => {
    const bars = barsFrom(atrRows());
    const cache = new IndicatorCache(bars);
    const atr = cache.atr(5);
    const result = simulate(
      bars,
      cache,
      { ...run(bars, {}).params, lookback: 25, entryMode: 'atrRolling', atrMultTenths: 20, atrPeriod: 5 },
      0,
      bars.date.length - 1
    );
    const triggerAt22 = 88 + 2 * atr[21]!;
    const triggerAt23 = 88 + 2 * atr[22]!;
    const firstFill = 91.9 >= triggerAt22 ? 22 : 94.5 >= triggerAt23 ? 23 : -1;

    assert.equal(result.trades[0]!.entryIndex, firstFill);
    assert.equal(result.setups[0]!.trigger, firstFill === 22 ? triggerAt22 : triggerAt23);
  });
});
