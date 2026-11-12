// The NYSE session counter of the experimental "sessions" maximum-hold unit (src/lib/tradingSessions.ts).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nyseCalendarCoverage, nyseHolidays } from '../calendar.ts';
import { isNyseSessionDate, nyseSessionOrdinal, nyseSessionsHeld } from '../tradingSessions.ts';

const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 1000;
const held = (from: string, to: string) => nyseSessionsHeld(t(from), t(to));
const calendarDays = (from: string, to: string) => (t(to) - t(from)) / 86_400;

// An independent reference: walk the dates one by one (no ordinal table).
const reference = (from: string, to: string) => {
  let n = 0;

  for (let d = t(from) + 86_400; d <= t(to); d += 86_400) {
    const date = new Date(d * 1000);
    const iso = date.toISOString().slice(0, 10);

    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6 && !nyseHolidays.has(iso)) n++;
  }
  return n;
};

describe('NYSE trading-session counting (sessions hold unit)', () => {
  it('counts the hold session as age 0 and each later trading session once', () => {
    assert.equal(held('2024-06-03', '2024-06-03'), 0);
    assert.equal(held('2024-06-03', '2024-06-04'), 1); // Monday → Tuesday
    assert.equal(held('2024-06-03', '2024-06-07'), 4); // → Friday
  });

  it('skips weekends', () => {
    assert.equal(held('2024-06-07', '2024-06-10'), 1); // Friday → Monday: 1 session, 3 calendar days
    assert.equal(calendarDays('2024-06-07', '2024-06-10'), 3);
    assert.equal(held('2024-06-06', '2024-06-11'), 3); // Thursday → next Tuesday: Fri, Mon, Tue
  });

  it('skips exchange holidays, including national days of mourning', () => {
    assert.equal(held('2024-07-03', '2024-07-05'), 1); // Independence Day (07-03 an early close, still a session)
    assert.equal(held('2024-11-27', '2024-11-29'), 1); // Thanksgiving
    assert.equal(held('2024-03-28', '2024-04-01'), 1); // Good Friday + weekend: 4 calendar days, 1 session
    assert.equal(held('2025-01-08', '2025-01-10'), 1); // the 2025-01-09 day of mourning
    assert.equal(held('2018-12-04', '2018-12-06'), 1); // the 2018-12-05 day of mourning
    assert.equal(held('2022-06-17', '2022-06-21'), 1); // Juneteenth observed on Monday 2022-06-20
    assert.equal(held('2021-12-23', '2021-12-27'), 1); // Christmas observed on Friday 2021-12-24
  });

  it('handles entries just before a holiday weekend: 15 sessions span 22 calendar days', () => {
    // 2024-11-27 (before Thanksgiving): the 15th session after it
    let d = '2024-11-27';
    const sessions: string[] = [];

    for (let x = t(d) + 86_400; sessions.length < 15; x += 86_400) {
      d = new Date(x * 1000).toISOString().slice(0, 10);
      if (isNyseSessionDate(d)) sessions.push(d);
    }
    assert.equal(sessions.at(-1), '2024-12-19');
    assert.equal(held('2024-11-27', '2024-12-19'), 15);
    assert.equal(held('2024-11-27', '2024-12-18'), 14);
    assert.equal(calendarDays('2024-11-27', '2024-12-19'), 22); // the calendar rule would apply from 2024-12-12
  });

  it('agrees with an independent day-by-day count over the whole coverage', () => {
    const sessions: string[] = [];

    for (let x = t(nyseCalendarCoverage.first); x <= t(nyseCalendarCoverage.last); x += 86_400) {
      const iso = new Date(x * 1000).toISOString().slice(0, 10);

      if (isNyseSessionDate(iso)) sessions.push(iso);
    }
    // 2016–2026: 252 ± 2 sessions a year
    assert.equal(sessions.filter((s) => s.startsWith('2016')).length, 252);
    assert.equal(sessions.filter((s) => s.startsWith('2025')).length, 250);

    let seed = 7;
    const rnd = (n: number) => {
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
      return seed % n;
    };

    for (let i = 0; i < 2000; i++) {
      const a = rnd(sessions.length);
      const b = a + rnd(Math.min(80, sessions.length - a));

      assert.equal(held(sessions[a]!, sessions[b]!), reference(sessions[a]!, sessions[b]!));
      assert.equal(held(sessions[a]!, sessions[b]!), b - a);
    }
  });

  it('counts a genuine trading session even when a data file lacks it (the calendar, not the rows)', () => {
    // a file that misses Tuesday 2024-06-04 still ages a Monday position by 2 on Wednesday
    assert.equal(held('2024-06-03', '2024-06-05'), 2);
  });

  it('fails closed on a non-session date, a non-midnight time or a date outside the coverage', () => {
    assert.throws(() => nyseSessionOrdinal(t('2024-07-04')), /not an NYSE trading session/);
    assert.throws(() => nyseSessionOrdinal(t('2024-06-08')), /not an NYSE trading session/); // Saturday
    assert.throws(() => nyseSessionOrdinal(t('2024-06-03') + 3600), /not midnight UTC/);
    assert.throws(() => nyseSessionOrdinal(t('2027-01-04')), /outside the NYSE calendar/);
    assert.throws(() => nyseSessionOrdinal(t('2015-12-31')), /outside the NYSE calendar/);
  });
});
