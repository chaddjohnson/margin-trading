// The study's clock (BTC_CLOCK_AND_EXECUTION.md §2) and its chronology (PROTOCOL.md §4). A "day" is a UTC calendar
// day, 00:00:00 to 24:00:00; BTCUSDT trades every day, so there are no sessions, closes or weekends to skip. Day
// numbers are UNIX days (floor(seconds / 86400)). Every D1 count (the rolling high's L, the maximum hold, the
// continuation window W) counts these calendar days.
//
// The chronology is a deterministic rule on the history's first and last days only (no prices or outcomes):
// - holdout: from the first day of the UTC month containing day index floor(0.75 N) of the N history days, to the
//   snapshot's last day;
// - development: the history before the holdout; two expanding walk-forward folds validate the development days
//   from the month starts at or before 60% and 80% of the development length, each fold ending where the next
//   begins (the last at the holdout start);
// - arming eligibility: no candidate arms before history start + the largest searchable L, so every candidate's
//   rolling high is complete on its first eligible day and all candidates trade the same days.
import { secondsPerDay } from './context.ts';
import type { Series } from './snapshot.ts';

export const dayOf = (seconds: number) => Math.floor(seconds / secondsPerDay);
export const dayStart = (day: number) => day * secondsPerDay;
export const dateOf = (day: number) => new Date(day * secondsPerDay * 1000).toISOString().slice(0, 10);
export const isoOf = (seconds: number) => new Date(seconds * 1000).toISOString().replace('.000Z', 'Z');

export const dayOfDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`'${date}' is not a YYYY-MM-DD date`);
  }

  const ms = Date.parse(`${date}T00:00:00Z`);

  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) {
    throw new Error(`'${date}' is not a valid date`);
  }

  return ms / 1000 / secondsPerDay;
};

const monthFloor = (day: number) => {
  const date = new Date(day * secondsPerDay * 1000);

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1000 / secondsPerDay;
};

export interface Window {
  label: string;
  startDay: number; // inclusive
  endDay: number; // exclusive
}

export interface Chronology {
  historyStartDay: number;
  lastDay: number; // the snapshot's last complete day
  historyDays: number;
  armStartDay: number;
  development: Window;
  holdout: Window;
  folds: { label: string; selection: Window; validation: Window }[];
  final: { selection: Window; holdout: Window };
}

export const chronologyOf = (historyStart: number, snapshotEnd: number, maxLookbackDays: number): Chronology => {
  const historyStartDay = dayOf(historyStart);
  const endDay = dayOf(snapshotEnd);
  const historyDays = endDay - historyStartDay;
  const holdoutStart = monthFloor(historyStartDay + Math.floor(0.75 * historyDays));
  const developmentDays = holdoutStart - historyStartDay;
  const foldA = monthFloor(historyStartDay + Math.floor(0.6 * developmentDays));
  const foldB = monthFloor(historyStartDay + Math.floor(0.8 * developmentDays));
  const armStartDay = historyStartDay + maxLookbackDays;
  const window = (label: string, startDay: number, end: number): Window => ({ label, startDay, endDay: end });

  return {
    historyStartDay,
    lastDay: endDay - 1,
    historyDays,
    armStartDay,
    development: window('development', armStartDay, holdoutStart),
    holdout: window('holdout', holdoutStart, endDay),
    folds: [
      {
        label: 'fold-a',
        selection: window('fold-a selection', armStartDay, foldA),
        validation: window('fold-a validation', foldA, foldB)
      },
      {
        label: 'fold-b',
        selection: window('fold-b selection', armStartDay, foldB),
        validation: window('fold-b validation', foldB, holdoutStart)
      }
    ],
    final: {
      selection: window('final selection', armStartDay, holdoutStart),
      holdout: window('holdout', holdoutStart, endDay)
    }
  };
};

// The series' bars grouped by UTC day: day d's bars are [barStart[d - firstDay], barEnd[d - firstDay]). A day with no
// bar has barStart === barEnd (none in this snapshot, but the engines handle it).
export interface DayIndex {
  firstDay: number;
  days: number;
  barStart: Int32Array;
  barEnd: Int32Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  minClose: Float64Array;
}

export const dayIndexOf = (series: Series, endBar = series.rows): DayIndex => {
  const firstDay = dayOf(series.time[0]!);
  const lastDay = dayOf(series.time[endBar - 1]!);
  const days = lastDay - firstDay + 1;
  const barStart = new Int32Array(days);
  const barEnd = new Int32Array(days);
  const open = new Float64Array(days).fill(NaN);
  const high = new Float64Array(days).fill(NaN);
  const low = new Float64Array(days).fill(NaN);
  const close = new Float64Array(days).fill(NaN);
  const minClose = new Float64Array(days).fill(NaN);
  let bar = 0;

  for (let d = 0; d < days; d++) {
    const limit = dayStart(firstDay + d + 1);

    barStart[d] = bar;

    let h = -Infinity;
    let l = Infinity;
    let m = Infinity;

    while (bar < endBar && series.time[bar]! < limit) {
      h = Math.max(h, series.high[bar]!);
      l = Math.min(l, series.low[bar]!);
      m = Math.min(m, series.close[bar]!);
      bar++;
    }

    barEnd[d] = bar;

    if (bar > barStart[d]!) {
      open[d] = series.open[barStart[d]!]!;
      close[d] = series.close[bar - 1]!;
      high[d] = h;
      low[d] = l;
      minClose[d] = m;
    }
  }

  return { firstDay, days, barStart, barEnd, open, high, low, close, minClose };
};

// The number of bars before a day's start (the truncation point for data available before that day).
export const barsBefore = (series: Series, day: number) => {
  const limit = dayStart(day);
  let lo = 0;
  let hi = series.rows;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;

    if (series.time[mid]! < limit) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
};
