// Display formatting. Dates are session dates from the data; clock times are shown in the exchange time zone.

import type { ParameterValue } from './schema/types.ts';

export const formatPrice = (x: number) => x.toFixed(2);

/** A fraction as a percentage, e.g. 0.0512 → "+5.12%". */
export function formatFraction(x: number | null, digits = 1, signed = true): string {
  if (x === null || !Number.isFinite(x)) return '—';
  const v = (x * 100).toFixed(digits);
  return `${signed && x > 0 ? '+' : ''}${v}%`;
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatParameter(p: ParameterValue): string {
  if (typeof p.value === 'string') return p.value;
  switch (p.unit) {
    case 'percent':
      return `${p.value.toFixed(2)}%`;
    case 'price':
      return p.value.toFixed(2);
    case 'sessions':
      return `${p.value} session${p.value === 1 ? '' : 's'}`;
    default:
      return String(p.value);
  }
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat>();

/** "16:00 EDT"-style clock time with the zone's abbreviation (daylight saving included). */
export function formatClock(ms: number, timeZone: string): string {
  let f = zoneFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short'
    });
    zoneFormatters.set(timeZone, f);
  }
  return f.format(new Date(ms));
}

/** YYYY-MM-DD of a chart x value (UTC calendar; equals the New York session date for daily bars). */
export const xToDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
