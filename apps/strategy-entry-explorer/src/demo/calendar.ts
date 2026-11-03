// The synthetic session calendar: every Monday–Friday between two dates. Exchange holidays and early closes are not
// modelled (the fixture says so in priceSeries.calendar). Each daily bar is stamped at its session close, 16:00
// America/New_York, converted to UTC with the zone's daylight-saving rules (20:00Z in summer, 21:00Z in winter).

import { sessionDateToUtcMidnight, utcMidnightToDate, zonedWallTimeToUtc } from '../schema/time.ts';

export const SESSION_CLOSE = { hour: 16, minute: 0 };

export interface Session {
  d: string;
  /** UTC instant of the session close, ISO 8601 with Z. */
  t: string;
}

export function weekdaySessions(first: string, last: string, timeZone: string): Session[] {
  const out: Session[] = [];
  const end = sessionDateToUtcMidnight(last);
  for (let ms = sessionDateToUtcMidnight(first); ms <= end; ms += 86_400_000) {
    const dow = new Date(ms).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const d = utcMidnightToDate(ms);
    const close = zonedWallTimeToUtc(d, SESSION_CLOSE.hour, SESSION_CLOSE.minute, timeZone);
    out.push({ d, t: new Date(close).toISOString().replace('.000Z', 'Z') });
  }
  return out;
}
