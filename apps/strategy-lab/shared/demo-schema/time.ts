// Time handling shared by the generator, the validator and the UI. Instants are UTC; session dates and clock times
// are always derived in the instrument's exchange time zone with Intl (daylight saving included), never from the
// viewer's local time zone.

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const SESSION_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
const timeFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dateFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    dateFormatters.set(timeZone, f);
  }
  return f;
}

function timeFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = timeFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    timeFormatters.set(timeZone, f);
  }
  return f;
}

/** True for an ISO 8601 UTC instant with a `Z` suffix (seconds required, milliseconds optional). */
export function isIsoUtc(s: unknown): s is string {
  return typeof s === 'string' && ISO_UTC.test(s) && Number.isFinite(Date.parse(s));
}

/** True for a real calendar date written YYYY-MM-DD. */
export function isSessionDate(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = SESSION_DATE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d;
}

/** The calendar date (YYYY-MM-DD) of an instant in the given time zone. */
export function sessionDateOf(ms: number, timeZone: string): string {
  const parts = dateFormatter(timeZone).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The wall-clock time (HH:MM, 24-hour) of an instant in the given time zone. */
export function clockTimeOf(ms: number, timeZone: string): string {
  return timeFormatter(timeZone).format(new Date(ms));
}

/**
 * The UTC instant of a wall-clock time on a calendar date in a time zone (e.g. 16:00 America/New_York on 2016-07-01
 * → 20:00Z). Exact for times that exist exactly once on that date, which includes every regular-session time.
 */
export function zonedWallTimeToUtc(date: string, hour: number, minute: number, timeZone: string): number {
  const m = SESSION_DATE.exec(date);
  if (!m) throw new Error(`invalid date ${date}`);
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour, minute);
  // Offsets are within ±14 h; correct the guess by the zone's offset at the guess, then once more across a transition.
  let ms = guess;
  for (let i = 0; i < 2; i++) ms = guess - zoneOffsetMs(ms, timeZone);
  return ms;
}

/** The zone's offset from UTC at an instant, in milliseconds (negative west of Greenwich). */
export function zoneOffsetMs(ms: number, timeZone: string): number {
  const date = sessionDateOf(ms, timeZone);
  const [h, mi] = clockTimeOf(ms, timeZone).split(':').map(Number) as [number, number];
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  const seconds = new Date(ms).getUTCSeconds();
  const msPart = new Date(ms).getUTCMilliseconds();
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, seconds, msPart);
  return asUtc - ms;
}

/** Midnight UTC of a session date, used for calendar arithmetic only (never as an event time). */
export function sessionDateToUtcMidnight(date: string): number {
  const m = SESSION_DATE.exec(date);
  if (!m) throw new Error(`invalid date ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** YYYY-MM-DD of a UTC-midnight millisecond value. */
export function utcMidnightToDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
