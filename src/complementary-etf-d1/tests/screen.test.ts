// Stage A's mechanics on synthetic sessions: the causal reference high, episode boundaries, the proxy trade (arming,
// rebound, stop, hold, re-arming), its timing against funded intervals, and the rank scores.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession } from '#types';
import { findEpisodes, proxyTrades, rankScores, referenceHighs, timingOf } from '../screen.ts';

const day = 86400;
const start = Date.parse('2020-01-06T00:00:00Z') / 1000;

// One session per calendar day (weekends included: the mechanics count sessions), high = max(open, close) + 0.5.
const sessions = (closes: number[], lows?: number[]): MarketSession[] =>
  closes.map((close, index) => {
    const time = start + index * day;
    const open = index === 0 ? close : closes[index - 1]!;

    return {
      date: new Date(time * 1000).toISOString().slice(0, 10),
      time,
      openTime: time + 52200,
      closeTime: time + 75600,
      isEarlyClose: false,
      bars: [],
      open,
      high: Math.max(open, close) + 0.5,
      low: lows?.[index] ?? Math.min(open, close) - 0.5,
      close,
      volume: 1000,
      trades: NaN
    };
  });

const p15 = { key: 'p15', armDepth: 0.15, rebound: 0.02, stop: 0.1, holdSessions: 20, primary: true } as const;

describe('the reference high', () => {
  test('is the highest high of the previous sessions only', () => {
    const highs = referenceHighs(sessions([10, 12, 11, 9]), 2);

    assert.equal(highs[0], -Infinity);
    assert.equal(highs[1], 10.5);
    assert.equal(highs[2], 12.5);
    assert.equal(highs[3], 12.5, 'sessions 1 and 2; never the session itself');
  });
});

describe('episodes', () => {
  test('open at a 10% low, freeze the reference, close within 5% of it', () => {
    // A 100 plateau (high 100.5), a fall to 80, a recovery to 96 (≥ 95% of 100.5 = 95.475).
    const closes = [100, 100, 100, 100, 88, 80, 85, 90, 96, 97];
    const list = sessions(closes);
    const episodes = findEpisodes(list, referenceHighs(list, 3), 3);

    assert.equal(episodes.length, 1);
    assert.equal(episodes[0]!.startDate, list[4]!.date, 'the 87.5 low is ≥ 10% below 100.5');
    assert.equal(episodes[0]!.reference, 100.5);
    assert.equal(episodes[0]!.troughDate, list[5]!.date);
    assert.ok(Math.abs(episodes[0]!.depth - (1 - 79.5 / 100.5)) < 1e-12);
    assert.equal(episodes[0]!.band, '20–30%');
    assert.equal(episodes[0]!.endDate, list[8]!.date);
    assert.equal(episodes[0]!.end, 'recovered');
  });
});

describe('the proxy trade', () => {
  test('arms at 15%, buys a 2% rebound from the lowest close, sells on the hold or the stop, re-arms after', () => {
    // Plateau at 100 (reference 100.5 with L = 3), fall to 84 (low 83.5 arms), lowest close 80, rebound to 82 (≥ 81.6)
    // = entry; hold 20 sessions at 82 → exit on the 20th session after entry.
    const closes = [100, 100, 100, 100, 84, 80, 82, ...new Array(25).fill(82)];
    const list = sessions(closes);
    const trades = proxyTrades(list, referenceHighs(list, 3), 3, p15);

    assert.equal(trades.length, 1);
    assert.equal(trades[0]!.armDate, list[4]!.date);
    assert.equal(trades[0]!.entryDate, list[6]!.date);
    assert.equal(trades[0]!.exitDate, list[26]!.date);
    assert.equal(trades[0]!.exitReason, 'hold');
    assert.ok(Math.abs(trades[0]!.net0 + 100000 * 0.11 * (20 / 365)) < 1e-6, 'a flat trade costs its interest');
    assert.ok(trades[0]!.net5 < trades[0]!.net0, 'costs on both sides');

    // The stop: a 10% fall from the entry close.
    const stopped = sessions([100, 100, 100, 100, 84, 80, 82, 80, 73.8, 70, 70]);
    const stoppedTrades = proxyTrades(stopped, referenceHighs(stopped, 3), 3, p15);

    assert.equal(stoppedTrades[0]!.exitDate, stopped[8]!.date, '73.8 ≤ 82 × 0.9');
    assert.equal(stoppedTrades[0]!.exitReason, 'stop');
    // Re-arming starts the session after the exit: 70 is still ≥ 15% below the reference, so a second proxy arms.
    assert.equal(stoppedTrades.length, 1, 'no rebound after re-arming, so no second entry');
  });

  test('a proxy open at the window end is marked at the last close', () => {
    const list = sessions([100, 100, 100, 100, 84, 80, 82, 83, 84]);
    const trades = proxyTrades(list, referenceHighs(list, 3), 3, p15);

    assert.equal(trades[0]!.exitReason, 'open at window end');
    assert.equal(trades[0]!.exitDate, list[8]!.date);
  });
});

describe('timing against the baseline pool', () => {
  test('idle at entry, blocking a later decision, and clean', () => {
    const list = sessions([100, 100, 100, 100, 84, 80, 82, ...new Array(25).fill(82)]);
    const [trade] = proxyTrades(list, referenceHighs(list, 3), 3, p15);
    const entry = list[6]!.closeTime;
    const exit = list[26]!.closeTime;

    const idle = timingOf(trade!, list, [{ symbol: 'VGT', start: exit + 60, end: exit + 600, net: 1 }], []);

    assert.deepEqual([idle.idleAtEntry, idle.blocked.length, idle.clean], [true, 0, true]);

    const blocking = timingOf(trade!, list, [{ symbol: 'VGT', start: entry + 60, end: exit + 600, net: 5000 }], []);

    assert.deepEqual([blocking.idleAtEntry, blocking.blocked.length, blocking.clean], [true, 1, false]);
    assert.equal(blocking.blocked[0]!.net, 5000);
    assert.equal(blocking.overlapsFunded.VGT, true);

    const busy = timingOf(trade!, list, [{ symbol: 'KRE', start: entry - 60, end: entry + 60, net: 0 }], []);

    assert.deepEqual([busy.idleAtEntry, busy.clean], [false, false]);
  });
});

describe('rank scores', () => {
  test('best 1, worst 0, linear, ties averaged', () => {
    assert.deepEqual(rankScores([3, 1, 2]), [1, 0, 0.5]);
    assert.deepEqual(rankScores([5, 5, 1]), [0.75, 0.75, 0]);
  });
});
