// Display formatting. Instants are stored as UTC; every displayed time is America/New_York with its EST/EDT label
// (Intl, so daylight saving is exact — never a fixed offset). Unknown values (null) are shown as "unknown", never 0.

import type { LabValue, TimePrecision } from '../shared/contract.ts';

const NY_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short'
});

export interface EtParts {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  seconds: string;
  zone: string; // EST / EDT
}

export function etParts(ms: number): EtParts {
  const p = Object.fromEntries(NY_PARTS.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    seconds: p.second ?? '00',
    zone: p.timeZoneName ?? 'ET'
  };
}

/** "2023-05-18 09:32 EDT" — or the date only when the precision is a day. */
export function formatEt(iso: string, precision: TimePrecision = 'minute'): string {
  const p = etParts(Date.parse(iso));
  if (precision === 'day') return `${p.date} (time not recorded)`;
  return `${p.date} ${p.time} ${p.zone}`;
}

export const formatEtDate = (ms: number) => etParts(ms).date;

export function formatUtc(iso: string): string {
  return `${iso.replace('T', ' ').replace(/(\.\d+)?Z$/, '')} UTC`;
}

export const PRECISION_LABEL: Record<TimePrecision, string> = {
  minute: 'minute precision',
  'session-close': 'session close (daily bar)',
  day: 'day only — no intraday time recorded',
  unknown: 'precision unknown'
};

export function formatPrice(x: number | null | undefined): string {
  return x === null || x === undefined || !Number.isFinite(x) ? 'unknown' : x.toFixed(x >= 1000 ? 2 : x >= 1 ? 2 : 4);
}

export function formatPercent(x: number | null | undefined, digits = 2, signed = true): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return 'unknown';
  return `${signed && x > 0 ? '+' : ''}${x.toFixed(digits)}%`;
}

export function formatShare(x: number | null | undefined): string {
  return x === null || x === undefined ? '—' : `${(x * 100).toFixed(1)}%`;
}

export const formatUsd = (x: number | null | undefined) =>
  x === null || x === undefined
    ? 'unknown'
    : x.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function formatValue(v: LabValue): string {
  const x = v.value;
  if (x === null) return 'unknown';
  if (typeof x === 'boolean') return x ? 'yes' : 'no';
  if (typeof x === 'string') {
    if (v.unit === 'datetime') return formatEt(x);
    return x;
  }
  switch (v.unit) {
    case 'percent':
      return `${x}%`;
    case 'price':
      return formatPrice(x);
    case 'usd':
      return formatUsd(x);
    case 'bars':
      return `${x} bar${x === 1 ? '' : 's'}`;
    case 'sessions':
      return `${x} session${x === 1 ? '' : 's'}`;
    case 'minutes':
      return `${x} min`;
    case 'days':
      return `${x} day${x === 1 ? '' : 's'}`;
    case 'bps':
      return `${x} bps`;
    default:
      return Number.isInteger(x) ? String(x) : x.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }
}

export function relativeTime(iso: string | null, now = Date.now()): string {
  if (!iso) return '';
  const s = Math.round((now - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
