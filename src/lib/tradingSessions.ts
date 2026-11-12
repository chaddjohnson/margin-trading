// NYSE trading-session counting for the EXPERIMENTAL maximum-hold unit "sessions" (research/vg-l0-session-hold). The
// default unit is unchanged: calendar days between session dates (src/shared-margin-portfolio/strategy.ts `holdAge`).
//
// The age of a position at session s, in sessions, is the number of NYSE trading sessions strictly after its hold
// session (the session the maximum hold counts from: the entry fill's session) up to and including s, on the NYSE
// calendar of src/lib/calendar.ts. The hold session itself is age 0, the next trading session age 1; weekends and
// exchange holidays (national days of mourning included) never count. A genuine trading session that is missing from
// a data file still counts: the age follows the exchange calendar, not the rows a file happens to hold.
//
// Fail closed: a time that is not midnight UTC of an NYSE session date, or outside the calendar's coverage, throws
// (a data row on a non-session date means the data or the calendar is wrong; extend the calendar before data go past it).
import { nyseCalendarCoverage, nyseHolidays } from './calendar.ts';

const secondsPerDay = 86_400;
const epochDayOf = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 1000 / secondsPerDay;
const isoOf = (day: number) => new Date(day * secondsPerDay * 1000).toISOString().slice(0, 10);

const firstDay = epochDayOf(nyseCalendarCoverage.first);
const lastDay = epochDayOf(nyseCalendarCoverage.last);
const span = lastDay - firstDay + 1;
const ordinals = new Int32Array(span); // the number of NYSE sessions on or before the day
const sessionDay = new Uint8Array(span);

{
  let n = 0;

  for (let d = firstDay; d <= lastDay; d++) {
    const weekday = new Date(d * secondsPerDay * 1000).getUTCDay();

    if (weekday !== 0 && weekday !== 6 && !nyseHolidays.has(isoOf(d))) {
      n++;
      sessionDay[d - firstDay] = 1;
    }
    ordinals[d - firstDay] = n;
  }
}

export const isNyseSessionDate = (iso: string) => {
  const d = epochDayOf(iso);

  if (!Number.isInteger(d) || d < firstDay || d > lastDay)
    throw new Error(
      `${iso} is outside the NYSE calendar's coverage ${nyseCalendarCoverage.first} → ${nyseCalendarCoverage.last}`
    );
  return sessionDay[d - firstDay] === 1;
};

// The session ordinal of a session time (midnight UTC of the New York date, as Dataset.sTime).
export const nyseSessionOrdinal = (sessionTime: number) => {
  const d = sessionTime / secondsPerDay;

  if (!Number.isInteger(d)) throw new Error(`${sessionTime} is not midnight UTC of a date`);
  if (d < firstDay || d > lastDay)
    throw new Error(
      `${isoOf(d)} is outside the NYSE calendar's coverage ${nyseCalendarCoverage.first} → ${nyseCalendarCoverage.last}`
    );
  if (sessionDay[d - firstDay] !== 1) throw new Error(`${isoOf(d)} is not an NYSE trading session`);
  return ordinals[d - firstDay]!;
};

// The number of NYSE trading sessions after the hold session up to and including the session at `sessionTime`.
export const nyseSessionsHeld = (holdTime: number, sessionTime: number) =>
  nyseSessionOrdinal(sessionTime) - nyseSessionOrdinal(holdTime);
