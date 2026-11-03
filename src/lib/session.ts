import { nyseCalendarCoverage as earlyCloseCoverage, nyseEarlyCloses as earlyCloses } from './calendar.ts';
import type { MarketSession, Tick } from '#types';

const secondsPerMinute = 60;
const secondsPerHour = 60 * secondsPerMinute;
const secondsPerDay = 24 * secondsPerHour;
const openMinute = 9 * 60 + 30;
const closeMinute = 16 * 60;
const earlyCloseMinute = 13 * 60;

// NYSE sessions that closed at 1:00 p.m. New York time come from the calendar (src/lib/calendar.ts).
// Full-day closures need no list, since they have no bars. Sessions outside the calendar's span are
// refused rather than assumed to close at 4:00 p.m.

const newYorkFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});
const offsetsByHour = new Map<number, number>();

// Seconds to add to a Unix timestamp to get New York wall-clock time. Daylight-saving changes happen on a
// UTC hour, so the offset is looked up once per hour.
export const newYorkOffset = (timestamp: number) => {
  const hour = Math.floor(timestamp / secondsPerHour);
  let offset = offsetsByHour.get(hour);

  if (offset === undefined) {
    const parts = Object.fromEntries(
      newYorkFormat.formatToParts(new Date(hour * secondsPerHour * 1000)).map(({ type, value }) => [type, value])
    );

    offset =
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute)
      ) /
        1000 -
      hour * secondsPerHour;
    offsetsByHour.set(hour, offset);
  }

  return offset;
};

// For example `2020-03-16 15:59 ET`.
export const formatNewYorkTime = (timestamp: number) =>
  `${new Date((timestamp + newYorkOffset(timestamp)) * 1000).toISOString().slice(0, 16).replace('T', ' ')} ET`;

// Groups minute bars into regular trading sessions, keeping only the regular-session minutes and the
// closing print. Extended-hours bars are dropped. The bars must be in ascending time order.
export const groupMarketSessions = (minuteTicks: Tick[]): MarketSession[] => {
  const sessions: MarketSession[] = [];
  let session: MarketSession | undefined;

  for (const tick of minuteTicks) {
    const offset = newYorkOffset(tick.time);
    const localTime = tick.time + offset;
    const date = new Date(localTime * 1000).toISOString().slice(0, 10);
    const minute = (localTime % secondsPerDay) / secondsPerMinute;
    const isEarlyClose = earlyCloses.has(date);
    const sessionCloseMinute = isEarlyClose ? earlyCloseMinute : closeMinute;

    if (minute < openMinute || minute > sessionCloseMinute) {
      continue;
    }

    if (date < earlyCloseCoverage.first || date > earlyCloseCoverage.last) {
      throw new Error(`No early-close calendar for ${date}; extend the calendar in src/lib/calendar.ts`);
    }

    if (session?.date !== date) {
      // A closing print without any regular-session trade doesn't make a session.
      if (minute === sessionCloseMinute) {
        continue;
      }

      const time = Date.parse(date) / 1000;

      session = {
        date,
        time,
        openTime: time + openMinute * secondsPerMinute - offset,
        closeTime: time + sessionCloseMinute * secondsPerMinute - offset,
        isEarlyClose,
        bars: [],
        open: tick.open,
        high: -Infinity,
        low: Infinity,
        close: NaN,
        volume: 0,
        trades: NaN
      };
      sessions.push(session);
    }

    if (minute === sessionCloseMinute) {
      session.closingPrint = tick.open;
    } else {
      session.bars.push(tick);
      session.high = Math.max(session.high, tick.high);
      session.low = Math.min(session.low, tick.low);
      session.volume += tick.volume;
    }
  }

  // The closing-auction print is the official close and is part of the session's range. Every session
  // has at least one regular-session bar, so the fallback always exists.
  for (const current of sessions) {
    current.close = current.closingPrint ?? current.bars.at(-1)!.close;
    current.high = Math.max(current.high, current.close);
    current.low = Math.min(current.low, current.close);
  }

  return sessions;
};
