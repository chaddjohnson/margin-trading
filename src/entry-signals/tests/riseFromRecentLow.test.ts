// Rise from recent low: the rolling-window maths, edge triggering and rearming, threshold equality, warm-up, gaps and
// missing bars, tie-breaking, and a randomised no-lookahead property; then bar construction and forward outcomes.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { type SignalBar, barsFromSessions } from '../bars.ts';
import { forwardOutcome, summarizeOutcomes } from '../outcomes.ts';
import { scanRiseFromRecentLow } from '../riseFromRecentLow.ts';

// Bars one minute apart (or with explicit gaps) from [low, close] pairs; open and high are irrelevant to the rule.
const bars = (pairs: [number, number][], gapsAfter: Record<number, number> = {}): SignalBar[] => {
  let t = 1_700_000_000;
  return pairs.map(([low, close], i) => {
    t += 60 + (gapsAfter[i - 1] ?? 0);
    return {
      start: t - 60,
      end: t,
      open: close,
      high: Math.max(low, close),
      low,
      close,
      sessionIndex: 0,
      date: '2024-01-02'
    };
  });
};

const signalIndexes = (b: SignalBar[], x: number, n: number, first = 0) =>
  scanRiseFromRecentLow(b, { advanceFromRecentLowPercent: x, recentLowLookbackBars: n }, first).signals.map(
    (s) => s.index
  );

describe('rise from recent low: rolling window and threshold', () => {
  test('fires on the first bar at or above X% over the rolling low of the last N bars (current bar included)', () => {
    const b = bars([
      [100, 100],
      [100, 101],
      [100, 103],
      [100, 105.5], // 5.5% above 100
      [100, 106]
    ]);
    const scan = scanRiseFromRecentLow(b, { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 3 });
    assert.deepEqual(
      scan.signals.map((s) => s.index),
      [3]
    );
    const s = scan.signals[0]!;
    assert.equal(s.recentLow, 100);
    assert.equal(s.time, b[3]!.end, 'stamped when the bar is complete');
    assert.equal(s.close, 105.5);
    assert.ok(Math.abs(s.advancePercent - 5.5) < 1e-9);
    assert.ok(s.previousAdvancePercent < 5);
  });

  test('threshold equality counts as reached, including values with binary rounding (107 vs 100 × 1.07)', () => {
    assert.deepEqual(
      signalIndexes(
        bars([
          [100, 100],
          [100, 100],
          [100, 105]
        ]),
        5,
        2
      ),
      [2]
    );
    assert.deepEqual(
      signalIndexes(
        bars([
          [100, 100],
          [100, 100],
          [100, 107]
        ]),
        7,
        2
      ),
      [2]
    );
    assert.deepEqual(
      signalIndexes(
        bars([
          [100, 100],
          [100, 100],
          [100, 104.99]
        ]),
        5,
        2
      ),
      []
    );
  });

  test('the low of the current bar is part of the window', () => {
    // Bar 3 makes the window's low (90) and closes 6% above it: the advance is measured from that low.
    assert.deepEqual(
      signalIndexes(
        bars([
          [100, 100],
          [100, 100],
          [99, 99],
          [90, 95.4]
        ]),
        5,
        3
      ),
      [3]
    );
  });

  test('equal lows: the earliest bar is reported as the recent low', () => {
    const scan = scanRiseFromRecentLow(
      bars([
        [101, 101],
        [100, 101],
        [100, 100],
        [100, 100],
        [101, 106]
      ]),
      {
        advanceFromRecentLowPercent: 5,
        recentLowLookbackBars: 4
      }
    );
    assert.equal(scan.signals[0]!.index, 4);
    assert.equal(scan.signals[0]!.recentLowIndex, 1);
  });
});

describe('rise from recent low: edge trigger and rearming', () => {
  test('staying above the threshold with repeated new highs signals once', () => {
    const pairs: [number, number][] = [
      [100, 100],
      [100, 100],
      [100, 100],
      [100, 106]
    ];
    for (let i = 0; i < 10; i++) pairs.push([100, 107 + i]); // every bar's low is 100, so L stays 100
    assert.deepEqual(signalIndexes(bars(pairs), 5, 3), [3]);
  });

  test('rearms only after the advance falls back below X, then fires again on the next crossing', () => {
    const b = bars([
      [100, 100],
      [100, 100],
      [100, 106], // signal
      [100, 107], // still above: nothing
      [100, 102], // below 105: rearmed
      [100, 106] // crosses again: signal
    ]);
    assert.deepEqual(signalIndexes(b, 5, 2), [2, 5]);
  });

  test('a rising rolling low (flat price after a rally) rearms the rule', () => {
    // Rally from 100 to 110, then flat at 110: once the 100 lows leave the 3-bar window, the advance falls to 0%.
    const b = bars([
      [100, 100],
      [100, 100],
      [100, 100], // first evaluable bar: below
      [100, 110], // signal: 10% over 100
      [110, 110],
      [110, 110], // the 100 low is still in the window (bar 3): above, no signal
      [110, 110], // window lows now all 110: advance 0 → rearmed
      [110, 116] // 5.45% over 110: signal
    ]);
    assert.deepEqual(signalIndexes(b, 5, 3), [3, 7]);
  });

  test('the first evaluable bar only sets the state: no crossing is observed there', () => {
    assert.deepEqual(
      signalIndexes(
        bars([
          [100, 100],
          [100, 110],
          [100, 111]
        ]),
        5,
        2
      ),
      []
    );
  });
});

describe('rise from recent low: warm-up, gaps, missing bars, validation', () => {
  test('warm-up bars provide the low and the previous state, but never signals', () => {
    const b = bars([
      [100, 100],
      [100, 100],
      [100, 106], // would signal, but it is warm-up
      [100, 102],
      [100, 106] // signal inside the window
    ]);
    assert.deepEqual(signalIndexes(b, 5, 2, 3), [4]);
    // The state carried from warm-up: a window starting at bar 3 while still above → no signal at bar 3.
    assert.deepEqual(
      signalIndexes(
        bars([
          [100, 100],
          [100, 100],
          [100, 106],
          [100, 107]
        ]),
        5,
        2,
        3
      ),
      []
    );
  });

  test('the lookback counts bars present in the data: a time gap neither resets nor stretches it', () => {
    const pairs: [number, number][] = [
      [100, 100],
      [100, 100],
      [100, 103],
      [100, 106]
    ];
    assert.deepEqual(signalIndexes(bars(pairs, { 1: 86_400 }), 5, 3), signalIndexes(bars(pairs), 5, 3));
    // A missing bar shifts the window: with bar 1 (the 100 low) absent, the 3-bar window at the last bar starts later.
    const missing = bars([
      [100, 100],
      [103, 103],
      [104, 104],
      [104, 106]
    ]);
    assert.deepEqual(signalIndexes(missing, 5, 3), []);
  });

  test('refuses invalid parameters and unordered bars', () => {
    const b = bars([
      [1, 1],
      [1, 1]
    ]);
    assert.throws(() => scanRiseFromRecentLow(b, { advanceFromRecentLowPercent: 0, recentLowLookbackBars: 5 }));
    assert.throws(() => scanRiseFromRecentLow(b, { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 1 }));
    assert.throws(() => scanRiseFromRecentLow(b, { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 2.5 }));
    assert.throws(() =>
      scanRiseFromRecentLow([b[1]!, b[0]!], { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 2 })
    );
  });

  test('no lookahead: the signals of every prefix equal the full run’s signals up to that bar', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    let price = 100;
    const pairs: [number, number][] = [];
    for (let i = 0; i < 400; i++) {
      price *= 1 + (rand() - 0.48) * 0.04;
      pairs.push([price * (1 - rand() * 0.01), price]);
    }
    const b = bars(pairs);
    const full = signalIndexes(b, 4, 15);
    assert.ok(full.length > 3, 'the random walk produces signals');
    for (const k of [20, 57, 133, 250, 399]) {
      assert.deepEqual(
        signalIndexes(b.slice(0, k + 1), 4, 15),
        full.filter((i) => i <= k)
      );
    }
  });
});

// ---------- bars and outcomes ----------

const minute = (time: number, low: number, close: number): Tick => ({
  time,
  open: close,
  high: Math.max(close, low),
  low,
  close,
  volume: 100,
  trades: NaN
});

const session = (date: string, closes: number[], early = false): MarketSession => {
  const midnight = Date.parse(date) / 1000;
  const openTime = midnight + 14.5 * 3600; // 09:30 EST = 14:30Z (winter dates in these tests)
  const closeTime = openTime + (early ? 3.5 : 6.5) * 3600;
  const ticks = closes.map((c, i) =>
    minute(openTime + i * 60 * (early ? 210 / closes.length : 390 / closes.length), c - 1, c)
  );
  return {
    date,
    time: midnight,
    openTime,
    closeTime,
    isEarlyClose: early,
    bars: ticks,
    open: closes[0]!,
    high: Math.max(...closes),
    low: Math.min(...closes) - 1,
    close: closes.at(-1)!,
    volume: 100 * closes.length,
    trades: NaN,
    closingPrint: closes.at(-1)!
  };
};

describe('bars from sessions', () => {
  test('daily bars end at the scheduled close; intraday buckets start at the open and the last one is short', () => {
    const s = session('2024-01-02', [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
    const [d] = barsFromSessions([s], '1d');
    assert.equal(d!.end, s.closeTime);
    assert.equal(d!.close, 22);

    const hourly = barsFromSessions([s], '60m');
    assert.equal(hourly.length, 7, '09:30, 10:30, …, 15:30');
    assert.equal(hourly[0]!.start, s.openTime);
    assert.equal(hourly[0]!.end, s.openTime + 3600);
    assert.equal(hourly.at(-1)!.end, s.closeTime, 'the 15:30 bucket ends at 16:00');
    assert.equal(hourly.at(-1)!.end - hourly.at(-1)!.start, 1800);
  });

  test('early-close sessions end at 13:00 and missing minutes produce no bar', () => {
    const s = session('2024-11-29', [10, 11, 12], true);
    const [d] = barsFromSessions([s], '1d');
    assert.equal(d!.end - s.openTime, 3.5 * 3600);
    const gappy: MarketSession = { ...s, bars: [s.bars[0]!, s.bars[2]!] };
    const fiveMinute = barsFromSessions([gappy], '5m');
    assert.equal(fiveMinute.length, 2, 'no bar is imputed for the empty bucket');
    const oneMinute = barsFromSessions([gappy], '1m');
    assert.deepEqual(
      oneMinute.map((b) => b.end - b.start),
      [60, 60]
    );
  });
});

describe('forward outcomes', () => {
  const sessions = ['2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-08'].map((d, i) =>
    session(d, [100 + i * 3])
  );
  const config = { horizons: [1, 3, 9], excursionSessions: 3, targetsPercent: [5, 50] };

  test('measures later sessions only, censors horizons past the window, and keeps unknown targets null', () => {
    const o = forwardOutcome(sessions, 0, 100, config);
    assert.ok(Math.abs(o.returns[0]!.returnPercent! - 3) < 1e-9);
    assert.equal(o.returns[2]!.returnPercent, null, 'session 9 is outside the window: censored, not zero');
    assert.equal(o.excursion.complete, true);
    assert.equal(o.targets[0]!.reached, true);
    assert.equal(o.targets[0]!.sessions, 2, 'high 106 ≥ 105 on the second later session');
    assert.equal(o.targets[1]!.reached, false, 'complete window, never reached');

    const late = forwardOutcome(sessions, 3, 109, config);
    assert.equal(late.excursion.complete, false);
    assert.equal(late.excursion.mfePercent, null);
    assert.equal(late.targets[1]!.reached, null, 'censored and not reached: unknown');
  });

  test('summaries count hit rates over complete windows only', () => {
    const items = [0, 1, 3].map((i) => ({
      sessionIndex: i,
      outcome: forwardOutcome(sessions, i, sessions[i]!.close, config)
    }));
    const sum = summarizeOutcomes(items, config);
    assert.equal(sum.count, 3);
    assert.equal(sum.targets[0]!.known, 2);
    assert.equal(sum.nonOverlapping, 2);
  });
});
