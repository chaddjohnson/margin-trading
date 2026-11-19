// "Candles · 1D" on the chart (Task 16), the pure parts: up / down / doji colours and shapes (body = open→close, wick =
// low→high), widths per zoom and the dense mode, the read-out (a session date and O/H/L/C, never a minute), ticks under
// trading sessions only, and the deterministic marker placement — the session of each event across DST, its rank in the
// session's fan — without changing any event's recorded instant or price.

import { describe, expect, it } from 'vitest';

import type { LabEvent } from '../shared/contract.ts';
import {
  CANDLE_COLOR,
  CANDLE_UP_FILL,
  type CandleContext,
  candleDirection,
  candleReadout,
  candleShape,
  candleTicks,
  candleWidths,
  DENSE_PX_PER_DAY,
  drawCandle,
  fanOffset,
  formatCandleReadout,
  markerSlots,
  sessionIndex
} from '../src/chart/candles.ts';
import { MARKER_SIZE } from '../src/chart/markers.ts';

// A price → y map like the chart's: 400 px tall for prices 90–110 (higher price, smaller y).
const y = (p: number) => ((110 - p) / 20) * 400;
const wide = candleWidths(40);

describe('direction and colour', () => {
  it('green-teal up (close > open), red down, grey doji (close = open exactly)', () => {
    expect(candleDirection(100, 101)).toBe('up');
    expect(candleDirection(101, 100)).toBe('down');
    expect(candleDirection(100, 100)).toBe('doji');
    expect(CANDLE_COLOR).toEqual({ up: '#26a69a', down: '#ef5350', doji: '#a4b1c4' });
  });
});

describe('shapes: body = open → close, wick = low → high', () => {
  it('up: a hollow body from the close (top) to the open (bottom), wick from the high to the low', () => {
    const s = candleShape(200.2, 100, 105, 95, 103, y, wide);
    expect(s.dir).toBe('up');
    expect([s.top, s.bottom]).toEqual([y(105), y(95)]);
    expect(s.body).toEqual({ left: Math.round(200.2 - wide.body / 2), top: y(103), width: wide.body, height: y(100) - y(103) });
    expect(s.hollow).toBe(true);
    expect(s.x).toBe(200.5); // a crisp 1 px wick on the candle's pixel
  });

  it('down: a solid body from the open (top) to the close (bottom)', () => {
    const s = candleShape(200, 103, 105, 95, 100, y, wide);
    expect(s.dir).toBe('down');
    expect(s.body).toMatchObject({ top: y(103), height: y(100) - y(103) });
    expect(s.hollow).toBe(false);
  });

  it('doji: a 2 px bar across the wick at the open/close, identifiable without colour', () => {
    const s = candleShape(200, 100, 102, 98, 100, y, wide);
    expect(s.dir).toBe('doji');
    expect(s.body).toMatchObject({ height: 2, width: wide.body, top: Math.round(y(100)) - 1 });
  });

  it('a nearly flat body is still at least 1 px tall', () => {
    expect(candleShape(200, 100, 101, 99, 100.0001, y, wide).body!.height).toBe(1);
  });

  it('draws with the direction’s colour: hollow up (faint fill + outline), solid down, grey doji', () => {
    const calls: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (t, k) => (k in t ? t[k as string] : (...a: unknown[]) => calls.push(`${String(k)}(${a.join(',')})`)),
      set: (t, k, v) => {
        calls.push(`${String(k)}=${v}`);
        t[k as string] = v;
        return true;
      }
    }) as unknown as CandleContext;
    drawCandle(ctx, candleShape(200, 100, 105, 95, 103, y, wide));
    expect(calls).toContain(`strokeStyle=${CANDLE_COLOR.up}`);
    expect(calls).toContain(`fillStyle=${CANDLE_UP_FILL}`);
    expect(calls.some((c) => c.startsWith('strokeRect('))).toBe(true);
    calls.length = 0;
    drawCandle(ctx, candleShape(200, 103, 105, 95, 100, y, wide));
    expect(calls).toContain(`fillStyle=${CANDLE_COLOR.down}`);
    expect(calls.some((c) => c.startsWith('strokeRect('))).toBe(false);
    calls.length = 0;
    drawCandle(ctx, candleShape(200, 100, 102, 98, 100, y, wide));
    expect(calls).toContain(`fillStyle=${CANDLE_COLOR.doji}`);
  });
});

describe('widths per zoom', () => {
  it('bodies are 60% of a day (odd from 3 px, at most 36), hollow from 5 px, compact 2 px, dense below 2 px per day', () => {
    expect(candleWidths(40)).toEqual({ body: 23, bodies: true, hollow: true }); // 24 → odd
    expect(candleWidths(200).body).toBe(35); // capped (36 → odd 35)
    expect(candleWidths(9)).toEqual({ body: 5, bodies: true, hollow: true });
    expect(candleWidths(3)).toEqual({ body: 2, bodies: true, hollow: false });
    expect(DENSE_PX_PER_DAY).toBe(2);
    expect(candleWidths(1.5)).toEqual({ body: 1, bodies: false, hollow: false });
    expect(candleShape(200, 100, 105, 95, 103, y, candleWidths(1)).body).toBeNull(); // a thin low–high line only
  });
});

describe('the read-out: the session and its O/H/L/C, never a minute time', () => {
  const r = {
    d: ['2024-03-08', '2024-11-29'],
    o: [100, 50],
    h: [102.4, 50.5],
    l: [98.7, 49.2],
    c: [101.3, 49.5],
    print: [1, 0] as (0 | 1)[],
    minutes: [390, 120],
    scheduled: [390, 210]
  };
  it('formats date, weekday, O/H/L/C and the signed change close vs open', () => {
    const a = candleReadout(r, 0);
    expect(a).toMatchObject({ date: '2024-03-08', dir: 'up', notes: [] });
    expect(a.percent).toBeCloseTo(1.3, 9);
    const text = formatCandleReadout(a);
    expect(text).toBe('2024-03-08 Fri · daily OHLC · O $100.00 H $102.40 L $98.70 C $101.30 · +$1.30 (+1.30%) close vs open');
    expect(text).not.toMatch(/\d{2}:\d{2}/);
  });
  it('a down day is signed minus; early close, missing print and untraded minutes are named', () => {
    const b = candleReadout(r, 1);
    expect(formatCandleReadout(b)).toMatch(/· −\$0\.50 \(−1\.00%\) close vs open$/);
    expect(b.notes).toEqual(['early close 13:00 ET', 'no closing print: close = last regular minute', '120 of 210 minutes traded']);
  });
});

describe('ticks under trading sessions only', () => {
  // 2024-03-04 (Mon) … 2024-04-05 with Good Friday 2024-03-29 closed; x = 12:45 ET as the server sends it.
  const dates: string[] = [];
  for (let t = Date.parse('2024-03-04T12:00:00Z'); t <= Date.parse('2024-04-05T12:00:00Z'); t += 86_400_000) {
    const d = new Date(t).toISOString().slice(0, 10);
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6 && d !== '2024-03-29') dates.push(d);
  }
  const xs = dates.map((d) => Date.parse(`${d}T16:45:00Z`));
  it('every tick is a session’s candle x (never a weekend or the holiday), the first labelled with its year', () => {
    const ticks = candleTicks(xs[0]! - 3600_000, xs.at(-1)! + 3600_000, 1600, xs, dates);
    expect(ticks.length).toBeGreaterThan(5);
    for (const t of ticks) expect(xs).toContain(t.v);
    expect(ticks.map((t) => t.label)).not.toContain('03-29');
    expect(ticks[0]!.label).toBe('2024-03-04');
    expect(ticks[1]!.label).toMatch(/^\d{2}-\d{2}$/);
  });
  it('weekly ticks fall on the first session of each week; wide windows fall back to month ticks', () => {
    const weekly = candleTicks(xs[0]! - 3600_000, xs.at(-1)! + 3600_000, 400, xs, dates);
    expect(weekly.map((t) => t.label)).toEqual(['2024-03-04', '03-11', '03-18', '03-25', '04-01']);
    const monthly = candleTicks(xs[0]!, xs.at(-1)!, 60, xs, dates);
    for (const t of monthly) expect(xs).not.toContain(t.v);
  });
});

describe('markers on sessions (deterministic, exact events unchanged)', () => {
  const ev = (id: string, t: string, kind: LabEvent['kind'], price: number | null = 100): LabEvent => ({
    id,
    runId: 'R-000001',
    symbol: 'VGT',
    kind,
    t,
    timePrecision: 'minute',
    timeMeaning: '',
    price,
    priceBasis: 'fill',
    reason: null,
    values: [],
    tradeId: null,
    linkedEventId: null,
    meta: {}
  });
  const candles = ['2024-03-08', '2024-03-11', '2024-11-01', '2024-11-04'];
  const byDate = sessionIndex(candles);
  const events = [
    // 2024-03-08 is EST: 09:31 EST = 14:31Z; the 16:00 closing print = 21:00Z
    { key: 'A:3', role: 'A' as const, event: ev('3', '2024-03-08T21:00:00Z', 'executed_exit') },
    { key: 'A:1', role: 'A' as const, event: ev('1', '2024-03-08T14:31:00Z', 'executed_entry') },
    { key: 'B:1', role: 'B' as const, event: ev('1', '2024-03-08T14:31:00Z', 'executed_entry') },
    { key: 'A:2', role: 'A' as const, event: ev('2', '2024-03-08T19:45:00Z', 'rejected_signal', null) },
    // 2024-03-11 is EDT (after the 03-10 switch): 09:30 EDT = 13:30Z; 2024-11-04 EST again: 15:59 EST = 20:59Z
    { key: 'A:4', role: 'A' as const, event: ev('4', '2024-03-11T13:30:00Z', 'executed_entry') },
    { key: 'A:5', role: 'A' as const, event: ev('5', '2024-11-04T20:59:00Z', 'executed_exit') },
    // 2024-11-01 20:30 EDT: after hours, still that New York date; 2024-03-09 (Saturday) has no candle
    { key: 'A:6', role: 'A' as const, event: ev('6', '2024-11-02T00:30:00Z', 'rejected_signal') },
    { key: 'A:7', role: 'A' as const, event: ev('7', '2024-03-09T15:00:00Z', 'rejected_signal') }
  ];
  const frozen = JSON.stringify(events);
  const slots = markerSlots(events, byDate);

  it('each event belongs to the session of its America/New_York date, in EST and in EDT', () => {
    expect(slots.get('A:1')).toMatchObject({ date: '2024-03-08', session: 0 });
    expect(slots.get('A:3')).toMatchObject({ date: '2024-03-08', session: 0 }); // the closing print, 16:00 EST
    expect(slots.get('A:4')).toMatchObject({ date: '2024-03-11', session: 1 }); // 09:30 EDT
    expect(slots.get('A:5')).toMatchObject({ date: '2024-11-04', session: 3 }); // 15:59 EST
    expect(slots.get('A:6')).toMatchObject({ date: '2024-11-01', session: 2 }); // 00:30Z is still 11-01 in New York
    expect(slots.get('A:7')).toMatchObject({ date: '2024-03-09', session: null }); // no candle: its own instant
  });

  it('a session’s events fan out in canonical order: time, run A before B, then kind and id', () => {
    const order = [...slots.entries()].filter(([, s]) => s.session === 0).sort((a, b) => a[1].rank - b[1].rank).map(([k]) => k);
    expect(order).toEqual(['A:1', 'B:1', 'A:2', 'A:3']);
    expect(slots.get('A:3')).toMatchObject({ rank: 3, count: 4 });
    expect(slots.get('A:4')).toMatchObject({ rank: 0, count: 1 });
  });

  it('never changes the events: instants and prices (including an unrecorded price) stay as recorded', () => {
    expect(JSON.stringify(events)).toBe(frozen);
    expect(events.find((e) => e.key === 'A:2')!.event.price).toBeNull();
  });

  it('fan offsets are centred on the candle, a marker apart when there is room, never closer than 3 px', () => {
    expect(fanOffset(0, 1, 100)).toBe(0);
    expect([0, 1, 2].map((r) => fanOffset(r, 3, 200))).toEqual([-(MARKER_SIZE + 2), 0, MARKER_SIZE + 2]);
    expect(fanOffset(1, 2, 20) - fanOffset(0, 2, 20)).toBe(9); // squeezed into 90% of a 20 px day
    expect(fanOffset(1, 10, 5) - fanOffset(0, 10, 5)).toBe(3);
  });
});
