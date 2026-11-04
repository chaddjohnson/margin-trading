// America/New_York formatting across DST, the ET axis ticker, and min/max decimation (spikes are never dropped).

import { describe, expect, it } from 'vitest';

import { etTicks } from '../src/chart/etTicker.ts';
import { etParts, formatEt } from '../src/format.ts';
import { priceAtOrBefore, type Series, windowPoints } from '../server/prices.ts';

describe('Eastern time', () => {
  it('labels EST and EDT from the instant (DST-aware, never a fixed offset)', () => {
    expect(formatEt('2024-03-08T14:32:00Z')).toBe('2024-03-08 09:32 EST');
    expect(formatEt('2024-03-11T13:32:00Z')).toBe('2024-03-11 09:32 EDT'); // after the 2024-03-10 switch
    expect(formatEt('2024-11-01T13:32:00Z')).toBe('2024-11-01 09:32 EDT');
    expect(formatEt('2024-11-04T14:32:00Z')).toBe('2024-11-04 09:32 EST'); // after the 2024-11-03 switch
    expect(formatEt('2024-03-10T06:59:00Z')).toBe('2024-03-10 01:59 EST');
    expect(formatEt('2024-03-10T07:00:00Z')).toBe('2024-03-10 03:00 EDT'); // 02:00 does not exist
    expect(formatEt('2024-11-03T05:30:00Z')).toBe('2024-11-03 01:30 EDT');
    expect(formatEt('2024-11-03T06:30:00Z')).toBe('2024-11-03 01:30 EST'); // the repeated hour
  });

  it('shows day-precision instants without inventing a time', () => {
    expect(formatEt('2024-03-08T00:00:00Z', 'day')).toMatch(/time not recorded/);
  });

  it('places daily ticks on New York midnights, whatever the viewer’s zone', () => {
    const from = Date.parse('2024-03-04T00:00:00Z');
    const to = Date.parse('2024-03-20T00:00:00Z');
    const ticks = etTicks(from, to, 1600);
    expect(ticks.length).toBeGreaterThan(3);
    for (const t of ticks) expect(etParts(t.v).time).toBe('00:00');
    expect(ticks.map((t) => t.label)).toContain('03-11');
  });

  it('places intraday ticks on whole New York minutes/hours with ET labels', () => {
    const from = Date.parse('2024-03-11T13:30:00Z');
    const ticks = etTicks(from, from + 6.5 * 3600_000, 800);
    expect(ticks[0]!.label).toMatch(/^03-11 \d\d:\d\d$/);
    expect(ticks.every((t) => t.v % 60_000 === 0)).toBe(true);
  });
});

describe('price decimation', () => {
  const n = 100_000;
  const t = Float64Array.from({ length: n }, (_, i) => 1_700_000_000 + i * 60);
  const v = Float64Array.from({ length: n }, (_, i) => 100 + Math.sin(i / 500));
  v[54_321] = 250; // a one-minute spike
  v[77_777] = 10; // a one-minute crash
  const sessions = Int32Array.from({ length: n }, (_, i) => Math.floor(i / 390));
  const days = Math.ceil(n / 390);
  const series: Series = {
    key: 'T',
    t,
    v,
    sessionOf: sessions,
    sessionDates: Array.from({ length: days }, (_, d) => new Date(Date.UTC(2023, 0, 1 + d)).toISOString().slice(0, 10)),
    sessionFirst: Int32Array.from({ length: days }, (_, d) => d * 390),
    sessionLast: Int32Array.from({ length: days }, (_, d) => Math.min(n - 1, d * 390 + 389)),
    stamp: 'test'
  };

  it('keeps every extreme and stays within the point budget', () => {
    const p = windowPoints(series, () => 1, '2000-01-01', '2100-01-01', null, null, 2000);
    expect(p.decimated).toBe(true);
    expect(p.points.length).toBeLessThanOrEqual(2000);
    const values = p.points.map(([, y]) => y);
    expect(Math.max(...values)).toBe(250);
    expect(Math.min(...values)).toBe(10);
    expect(p.points.every(([x], i) => i === 0 || x > p.points[i - 1]![0])).toBe(true);
  });

  it('returns raw points for a narrow window and applies the split factor per session', () => {
    const from = t[1200]! * 1000; // point 1200 is in session 3, where the test factor is 8
    const p = windowPoints(series, (s) => (s >= 3 ? 8 : 1), '2000-01-01', '2100-01-01', from, from + 59 * 60_000, 2000);
    expect(p.decimated).toBe(false);
    expect(p.points).toHaveLength(60);
    expect(p.points[0]![1]).toBeCloseTo(v[1200]! * 8);
    expect(priceAtOrBefore(series, () => 1, t[54_321]! * 1000 + 30_000)).toBe(250);
  });
});
