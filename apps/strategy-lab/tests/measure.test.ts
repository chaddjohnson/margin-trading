import { describe, expect, it } from 'vitest';

import { formatChange, formatPercentChange, measure, nearestRow } from '../src/chart/measure.ts';

describe('drag-to-measure calculation', () => {
  const early = { t: Date.parse('2021-03-01T14:30:00Z'), price: 100 };
  const late = { t: Date.parse('2021-03-05T20:59:00Z'), price: 112.5 };

  it('computes the change from the earlier to the later point', () => {
    const m = measure(early, late);
    expect(m.start).toBe(early);
    expect(m.end).toBe(late);
    expect(m.change).toBeCloseTo(12.5, 10);
    expect(m.percent).toBeCloseTo(12.5, 10);
    expect(m.direction).toBe('up');
  });

  it('gives the same result when dragged right to left', () => {
    expect(measure(late, early)).toEqual(measure(early, late));
  });

  it('reports falls as negative, with the percentage relative to the earlier price', () => {
    const m = measure({ t: 2, price: 80 }, { t: 1, price: 100 });
    expect(m.change).toBe(-20);
    expect(m.percent).toBe(-20);
    expect(m.direction).toBe('down');
    expect(measure({ t: 1, price: 50 }, { t: 2, price: 50 }).direction).toBe('flat');
  });

  it('formats signed dollar and percent changes', () => {
    expect(formatChange(12.5)).toBe('+$12.50');
    expect(formatChange(-3.456)).toBe('−$3.46');
    expect(formatPercentChange(-20)).toBe('−20.00%');
    expect(formatPercentChange(NaN)).toBe('—');
  });
});

// Task 18 (2026-11-18): the regression fix — daily close → close on known VGT closes, every sign, tiny changes, and the
// snapping that keeps both endpoints on plotted rows inside the visible window.
describe('daily close → close on two known VGT closes (Candles · 1D, split-adjusted as served)', () => {
  // VGT daily closes served by /api/runs/:id/candles for the Study 8 import: 2020-09-30 and 2021-12-13.
  const sep30 = { t: Date.parse('2020-09-30T20:00:00Z'), price: 311.45 };
  const dec13 = { t: Date.parse('2021-12-13T21:00:00Z'), price: 453.29 };

  it('gives +$141.84 and +45.54 % (later − earlier, over the earlier close)', () => {
    const m = measure(sep30, dec13);
    expect(m.change).toBeCloseTo(141.84, 10);
    expect(m.percent).toBeCloseTo((141.84 / 311.45) * 100, 10);
    expect(m.percent).toBeCloseTo(45.5418, 4);
    expect(formatChange(m.change)).toBe('+$141.84');
    expect(formatPercentChange(m.percent)).toBe('+45.54%');
    expect(m.direction).toBe('up');
  });

  it('is identical when dragged right to left: the denominator stays the EARLIER close, the sign does not flip', () => {
    const rev = measure(dec13, sep30);
    expect(rev).toEqual(measure(sep30, dec13));
    expect(rev.start).toBe(sep30);
    // the wrong formula (over the later price, or start − end) would read −31.29 % or −$141.84
    expect(formatPercentChange(rev.percent)).toBe('+45.54%');
    expect(formatChange(rev.change)).toBe('+$141.84');
  });

  it('a fall reads negative, relative to the earlier close', () => {
    const m = measure({ t: 2, price: 300.0 }, { t: 1, price: 467.33 });
    expect(m.change).toBeCloseTo(-167.33, 10);
    expect(formatChange(m.change)).toBe('−$167.33');
    expect(formatPercentChange(m.percent)).toBe('−35.81%');
    expect(m.direction).toBe('down');
  });

  it('zero change has no sign and is flat', () => {
    const m = measure({ t: 1, price: 453.29 }, { t: 2, price: 453.29 });
    expect(m.change).toBe(0);
    expect(m.percent).toBe(0);
    expect(m.direction).toBe('flat');
    expect(formatChange(m.change)).toBe('$0.00');
    expect(formatPercentChange(m.percent)).toBe('0.00%');
  });

  it('a very small change keeps its sign and digits instead of reading "+$0.00"', () => {
    const up = measure({ t: 1, price: 100 }, { t: 2, price: 100.004 });
    expect(up.direction).toBe('up');
    expect(formatChange(up.change)).toBe('+$0.0040');
    expect(formatPercentChange(up.percent)).toBe('+0.0040%');
    const down = measure({ t: 1, price: 453.29 }, { t: 2, price: 453.28 });
    expect(formatChange(down.change)).toBe('−$0.01');
    expect(formatPercentChange(down.percent)).toBe('−0.0022%');
    expect(formatChange(1e-9)).toBe('+<$0.0001');
    expect(formatPercentChange(-1e-9)).toBe('−<0.0001%');
    expect(formatChange(0.005)).toBe('+$0.01'); // at the two-decimal threshold
    expect(formatChange(-0)).toBe('$0.00');
  });

  it('never prints NaN or Infinity', () => {
    const m = measure({ t: 1, price: 0 }, { t: 2, price: 10 });
    expect(Number.isNaN(m.percent)).toBe(true);
    expect(formatPercentChange(m.percent)).toBe('—');
    for (const x of [Infinity, -Infinity, NaN]) {
      expect(formatChange(x)).toBe('—');
      expect(formatPercentChange(x)).toBe('—');
    }
  });
});

describe('snapping to a plotted row inside the visible window (nearestRow)', () => {
  const DAY = 86_400_000;
  // NYSE-like sessions: weekdays only, 2016-01-04 onward, 2,722 of them (the full-history VGT view's density).
  const sessions: number[] = [];
  for (let t = Date.parse('2016-01-04T21:00:00Z'); sessions.length < 2722; t += DAY) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) sessions.push(t);
  }
  const xAt = (i: number) => sessions[i]!;
  const all = () => true;
  const snap = (t: number, lo = sessions[0]!, hi = sessions.at(-1)!, has: (i: number) => boolean = all) =>
    nearestRow(sessions.length, xAt, has, t, lo, hi);

  it('returns the nearest session to the instant under the pointer (full history)', () => {
    for (const i of [0, 1, 700, 1361, 2000, 2720, 2721]) {
      expect(snap(sessions[i]!)).toBe(i);
      expect(snap(sessions[i]! + 0.4 * DAY)).toBe(i);
    }
    expect(snap(sessions[1361]! - 0.4 * DAY)).toBe(1361);
  });

  it('never invents a weekend or holiday: a Saturday snaps to Friday or Monday', () => {
    const fri = sessions.findIndex((t) => new Date(t).getUTCDay() === 5 && t > Date.parse('2020-10-01'));
    expect(snap(sessions[fri]! + 0.9 * DAY)).toBe(fri); // Saturday morning: Friday is nearer
    expect(snap(sessions[fri]! + 2.2 * DAY)).toBe(fri + 1); // Sunday night: Monday is nearer
    expect(new Date(sessions[fri + 1]!).getUTCDay()).toBe(1);
  });

  it('a tie goes to the earlier row', () => {
    expect(nearestRow(3, (i) => [0, 10, 20][i]!, all, 5, 0, 20)).toBe(0);
    expect(nearestRow(3, (i) => [0, 10, 20][i]!, all, 15, 0, 20)).toBe(1);
  });

  it('only rows inside the window: never the off-window neighbour Dygraphs keeps for line continuity', () => {
    const xs = [0, 10, 20, 30];
    const at = (i: number) => xs[i]!;
    expect(nearestRow(4, at, all, 12, 12, 28)).toBe(2); // 10 is nearer in time but outside [12, 28]
    expect(nearestRow(4, at, all, 28, 12, 28)).toBe(2); // 30 is nearer but outside
  });

  it('an instant past either edge stops at the first or last row in view (pointer beyond the plot)', () => {
    const lo = sessions[500]! - 0.3 * DAY;
    const hi = sessions[760]! + 0.3 * DAY;
    expect(snap(sessions[100]!, lo, hi)).toBe(500);
    expect(snap(sessions[2000]!, lo, hi)).toBe(760);
    expect(snap(-Infinity, lo, hi)).toBe(500);
    expect(snap(Infinity, lo, hi)).toBe(760);
  });

  it('under zoom and pan the same instant maps into whatever window is shown', () => {
    const t = sessions[1300]! + 0.2 * DAY;
    for (const [a, b] of [
      [0, 2721], // All
      [1050, 1556], // 2Y around it
      [1295, 1300], // one week (the narrowest candle window)
      [1301, 1310], // panned past it: the window's first session
      [1200, 1299] // panned before it: the window's last session
    ] as const) {
      const r = snap(t, sessions[a]!, sessions[b]!);
      expect(r).toBeGreaterThanOrEqual(a);
      expect(r).toBeLessThanOrEqual(b);
      expect(r).toBe(Math.min(b, Math.max(a, 1300)));
    }
  });

  it('skips rows without a price and returns −1 when the window has none', () => {
    const xs = [0, 10, 20, 30, 40, 50];
    const at = (i: number) => xs[i]!;
    const has = (i: number) => i !== 2 && i !== 3;
    expect(nearestRow(6, at, has, 20, 0, 50)).toBe(1); // row 2 has no price: 10 (Δ10) beats 40 (Δ20)
    expect(nearestRow(6, at, has, 31, 0, 50)).toBe(4); // 40 (Δ9) beats 10 (Δ21)
    expect(nearestRow(6, at, has, 25, 20, 30)).toBe(-1); // only priceless rows in view
    expect(nearestRow(0, xAt, all, 5, 0, 10)).toBe(-1);
    expect(snap(sessions[10]!, sessions[10]! + 1, sessions[11]! - 1)).toBe(-1); // a window between two sessions
  });
});
