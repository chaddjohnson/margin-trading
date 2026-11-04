// X-axis ticks on America/New_York boundaries (midnights, month and year starts, whole minutes/hours), labelled in New
// York time — so a label never shows the previous day because the viewer's browser is in another time zone.

import { zonedWallTimeToUtc } from '../../shared/demo-schema/time.ts';
import { etParts } from '../format.ts';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const TZ = 'America/New_York';

interface Tick {
  v: number;
  label: string;
}

const intraday = [1, 5, 15, 30, 60, 120, 240].map((m) => m * MIN);
const dayCounts = [1, 2, 7, 14];
const monthCounts = [1, 3, 6, 12, 24, 60];

const etMidnight = (date: string) => zonedWallTimeToUtc(date, 0, 0, TZ);

export function etTicks(min: number, max: number, pixels: number): Tick[] {
  const span = max - min;
  if (!(span > 0) || pixels <= 0) return [];
  const wanted = Math.max(2, Math.floor(pixels / 95));
  const target = span / wanted;
  const ticks: Tick[] = [];

  const step = intraday.find((s) => s >= target);
  if (step !== undefined && step < DAY) {
    for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
      const p = etParts(v);
      ticks.push({ v, label: p.time === '00:00' || ticks.length === 0 ? `${p.date.slice(5)} ${p.time}` : p.time });
    }
    return ticks;
  }

  const days = dayCounts.find((d) => d * DAY >= target);
  if (days !== undefined) {
    let date = etParts(min).date;
    for (let guard = 0; guard < 2000; guard++) {
      const v = etMidnight(date);
      if (v > max) break;
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
      if (v >= min && (days < 7 || dow === 1)) ticks.push({ v, label: date.slice(5) });
      const next = new Date(Date.parse(`${date}T12:00:00Z`) + (days < 7 ? days : 1) * DAY);
      date = next.toISOString().slice(0, 10);
    }
    return ticks;
  }

  const months = monthCounts.find((m) => m * 30.4 * DAY >= target) ?? 120;
  const start = etParts(min).date;
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7)) - 1;
  m = Math.ceil(m / months) * months;
  for (let guard = 0; guard < 500; guard++) {
    y += Math.floor(m / 12);
    m = m % 12;
    const date = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const v = etMidnight(date);
    if (v > max) break;
    if (v >= min) ticks.push({ v, label: months >= 12 ? String(y) : date.slice(0, 7) });
    m += months;
  }
  return ticks;
}
