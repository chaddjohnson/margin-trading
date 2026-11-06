// "Candles · 1D": daily OHLC candles on the price chart. Pure (no DOM, no Dygraphs) and unit-tested; PriceChart draws
// with it. The data is shared/candles.ts (one candle per NYSE session, from the canonical minute file).
//
// Encoding (never colour alone):
//   up    (close > open)  teal-green #26a69a, HOLLOW body (outline + faint fill)
//   down  (close < open)  red #ef5350, SOLID body
//   doji  (close = open)  grey #a4b1c4, a flat bar across the wick (a cross)
//   wick  the session's low to high, in the candle's colour
// The pair passed the dataviz palette validator on the dark chart surface (logs/task16/candle-palette-validation.log):
// deutan ΔE 11.6, contrast ≥ 3:1. Bodies narrower than 5 px are solid in both directions (colour only); the hollow cue
// returns as soon as there is room for it. When a day is narrower than DENSE_PX_PER_DAY, bodies cannot be drawn honestly: every
// session is then drawn on its own as a thin low–high line in its colour (overlapping, never merged into a multi-day
// candle), and the chart says so.
//
// Event markers (deterministic policy): an event belongs to the session of its America/New_York date (the date every
// time label shows); its marker sits on that session's candle (x) at its recorded price (y). Several events of one
// session are fanned out left → right in their canonical order (time, then kind, then id) — a fixed pixel step, NOT a
// time scale — so none hides another; the exact time is in the tooltip and the event table. An event whose date has no
// candle (none should) keeps its own instant.

import type { CandlesResponse } from '../../shared/candles.ts';
import { compareEvents, type LabEvent } from '../../shared/contract.ts';
import { etParts } from '../format.ts';
import { etTicks } from './etTicker.ts';
import { MARKER_SIZE } from './markers.ts';

const DAY = 86_400_000;

export type CandleDirection = 'up' | 'down' | 'doji';

export const CANDLE_COLOR: Record<CandleDirection, string> = { up: '#26a69a', down: '#ef5350', doji: '#a4b1c4' };
/** The faint fill inside a hollow (up) body, so it still reads as a body on the dark surface. */
export const CANDLE_UP_FILL = 'rgba(38, 166, 154, 0.22)';
export const CANDLE_LABEL: Record<CandleDirection, string> = {
  up: 'up day (close above open)',
  down: 'down day (close below open)',
  doji: 'doji (close equals open)'
};

/** Below this many pixels per calendar day (about 1.5 years in a 1,000 px plot), bodies are not drawn (see the header). */
export const DENSE_PX_PER_DAY = 2;
export const MAX_BODY_PX = 36;
/** The narrowest window the candle chart zooms to with the wheel: one week (about five sessions). */
export const MIN_SPAN_CANDLES = 7 * DAY;

/** Up, down or doji. Equality is exact: both prices of a session carry the same split factor. */
export const candleDirection = (open: number, close: number): CandleDirection =>
  close > open ? 'up' : close < open ? 'down' : 'doji';

export interface CandleWidths {
  body: number; // px: 60% of a day, odd from 3 px on so the wick sits in its middle; 2 px when compact
  bodies: boolean; // false: too dense, each session is a thin low–high line
  hollow: boolean; // up bodies drawn hollow (from 5 px, wide enough for an outline to read; narrower ones are solid)
}

export function candleWidths(pxPerDay: number): CandleWidths {
  if (!(pxPerDay >= DENSE_PX_PER_DAY)) return { body: 1, bodies: false, hollow: false };
  let body = Math.max(2, Math.min(MAX_BODY_PX, Math.round(pxPerDay * 0.6)));
  if (body >= 3 && body % 2 === 0) body -= 1;
  return { body, bodies: true, hollow: body >= 5 };
}

export interface CandleShape {
  dir: CandleDirection;
  /** The wick: a vertical line at x (a pixel centre) from the high's y to the low's y. */
  x: number;
  top: number;
  bottom: number;
  /** The body (open to close), or null in dense mode. A doji's body is a 2 px bar at the open/close. */
  body: { left: number; top: number; width: number; height: number } | null;
  hollow: boolean;
}

/** The pixels of one candle; `y` maps a price to the canvas (higher price → smaller y). */
export function candleShape(
  x: number,
  o: number,
  h: number,
  l: number,
  c: number,
  y: (price: number) => number,
  w: CandleWidths
): CandleShape {
  const dir = candleDirection(o, c);
  const cx = Math.round(x) + 0.5; // a crisp 1 px wick
  const shape: CandleShape = { dir, x: cx, top: y(h), bottom: y(l), body: null, hollow: false };
  if (!w.bodies) return shape;
  const left = Math.round(x - w.body / 2);
  if (dir === 'doji') {
    shape.body = { left, top: Math.round(y(o)) - 1, width: w.body, height: 2 };
    return shape;
  }
  const yTop = y(Math.max(o, c));
  const yBottom = y(Math.min(o, c));
  shape.body = { left, top: yTop, width: w.body, height: Math.max(1, yBottom - yTop) };
  shape.hollow = dir === 'up' && w.hollow;
  return shape;
}

/** The part of a 2D canvas context the candles use (the Dygraphs plotter's context satisfies it). */
export interface CandleContext {
  strokeStyle: unknown;
  fillStyle: unknown;
  lineWidth: number;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
}

/** Draws one candle on a 2D canvas context (the Dygraphs plotter's context). */
export function drawCandle(ctx: CandleContext, s: CandleShape) {
  const colour = CANDLE_COLOR[s.dir];
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s.x, s.top);
  ctx.lineTo(s.x, s.bottom);
  ctx.stroke();
  const b = s.body;
  if (!b) return;
  if (s.hollow) {
    // Hollow up body: a faint fill, then a 1.5 px outline inside the body's box (the wick does not show through).
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(b.left, b.top, b.width, b.height);
    ctx.fillStyle = CANDLE_UP_FILL;
    ctx.fillRect(b.left, b.top, b.width, b.height);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.left + 0.75, b.top + 0.75, Math.max(0, b.width - 1.5), Math.max(0, b.height - 1.5));
    return;
  }
  ctx.fillStyle = colour;
  ctx.fillRect(b.left, b.top, b.width, b.height);
}

// ----- the hover read-out -----

export interface CandleReadout {
  date: string;
  o: number;
  h: number;
  l: number;
  c: number;
  change: number; // close − open
  percent: number; // (close − open) / open × 100
  dir: CandleDirection;
  notes: string[]; // early close, missing closing print, minutes with trades
}

/** The read-out of candle i: its New York session date and O/H/L/C, never a minute time. */
export function candleReadout(
  r: Pick<CandlesResponse, 'd' | 'o' | 'h' | 'l' | 'c' | 'print' | 'minutes' | 'scheduled'>,
  i: number
): CandleReadout {
  const o = r.o[i]!;
  const c = r.c[i]!;
  const notes: string[] = [];
  if (r.scheduled[i] === 210) notes.push('early close 13:00 ET');
  if (!r.print[i]) notes.push('no closing print: close = last regular minute');
  if (r.minutes[i]! < r.scheduled[i]!) notes.push(`${r.minutes[i]} of ${r.scheduled[i]} minutes traded`);
  return { date: r.d[i]!, o, h: r.h[i]!, l: r.l[i]!, c, change: c - o, percent: ((c - o) / o) * 100, dir: candleDirection(o, c), notes };
}

const money = (x: number) => `$${x.toFixed(2)}`;
const signed = (x: number, digits: number, unit: string) =>
  `${x > 0 ? '+' : x < 0 ? '−' : '±'}${unit === '$' ? '$' : ''}${Math.abs(x).toFixed(digits)}${unit === '%' ? '%' : ''}`;

export function formatCandleReadout(x: CandleReadout): string {
  const weekday = new Date(`${x.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return (
    `${x.date} ${weekday} · daily OHLC · O ${money(x.o)} H ${money(x.h)} L ${money(x.l)} C ${money(x.c)} · ` +
    `${signed(x.change, 2, '$')} (${signed(x.percent, 2, '%')}) close vs open`
  );
}

// ----- the time axis -----

const SESSION_STEPS = [1, 2, 5, 10];
const LABEL_SPACING_PX = 80;

const lowerBound = (a: readonly number[], v: number) => {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >>> 1;
    if (a[m]! < v) lo = m + 1;
    else hi = m;
  }
  return lo;
};

/** Monday of a date's week (UTC calendar arithmetic on a YYYY-MM-DD date). */
const weekOf = (date: string) => {
  const t = Date.parse(`${date}T12:00:00Z`);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * DAY).toISOString().slice(0, 10);
};

/**
 * X-axis ticks of the candle chart: under trading sessions only (never a weekend or a holiday), every 1, 2 or 10 sessions
 * (chosen on the session's global index, so ticks do not jump while panning) or on the first session of each week;
 * wider windows fall back to month/year ticks on New York midnights (etTicks).
 */
export function candleTicks(
  min: number,
  max: number,
  pixels: number,
  xs: readonly number[],
  dates: readonly string[]
): { v: number; label: string }[] {
  const lo = lowerBound(xs, min);
  const hi = lowerBound(xs, max + 1e-6) - 1;
  const n = hi - lo + 1;
  if (n <= 0 || !(pixels > 0)) return etTicks(min, max, pixels);
  const perSession = pixels / n;
  const every = SESSION_STEPS.find((k) => k * perSession >= LABEL_SPACING_PX);
  if (every === undefined) return etTicks(min, max, pixels);
  const out: { v: number; label: string }[] = [];
  let lastYear = '';
  for (let i = lo; i <= hi; i++) {
    const d = dates[i]!;
    const take = every === 5 ? i === 0 || weekOf(dates[i - 1]!) !== weekOf(d) : i % every === 0;
    if (!take) continue;
    const year = d.slice(0, 4);
    out.push({ v: xs[i]!, label: year !== lastYear ? d : d.slice(5) });
    lastYear = year;
  }
  return out;
}

// ----- markers on sessions -----

export interface MarkerSlot {
  /** Index of the candle the marker sits on, or null (no candle on its New York date: placed at its own instant). */
  session: number | null;
  date: string; // the event's America/New_York date
  rank: number; // its position in its session's fan (0-based, canonical order)
  count: number; // events of that session on the chart
}

/** Index of each candle by its New York date. */
export const sessionIndex = (dates: readonly string[]) => new Map(dates.map((d, i) => [d, i]));

/**
 * The session slot of every chart event: its New York date's candle, and its rank in that session's fan (canonical event
 * order, run A before run B at the same instant). The events themselves — instants, prices — are never changed.
 */
export function markerSlots(
  events: readonly { key: string; role: 'A' | 'B'; event: LabEvent }[],
  byDate: ReadonlyMap<string, number>
): Map<string, MarkerSlot> {
  const out = new Map<string, MarkerSlot>();
  const groups = new Map<number, { key: string; role: string; event: LabEvent }[]>();
  for (const ce of events) {
    const date = etParts(Date.parse(ce.event.t)).date;
    const session = byDate.get(date) ?? null;
    out.set(ce.key, { session, date, rank: 0, count: 1 });
    if (session === null) continue;
    const g = groups.get(session);
    if (g) g.push(ce);
    else groups.set(session, [ce]);
  }
  for (const g of groups.values()) {
    g.sort((a, b) => Date.parse(a.event.t) - Date.parse(b.event.t) || a.role.localeCompare(b.role) || compareEvents(a.event, b.event));
    g.forEach((ce, rank) => Object.assign(out.get(ce.key)!, { rank, count: g.length }));
  }
  return out;
}

/** The marker's horizontal offset from its candle (px): a fan centred on the candle, a fixed step not a time scale. */
export function fanOffset(rank: number, count: number, pxPerDay: number): number {
  if (count <= 1) return 0;
  const step = Math.max(3, Math.min(MARKER_SIZE + 2, (pxPerDay * 0.9) / count));
  return (rank - (count - 1) / 2) * step;
}

