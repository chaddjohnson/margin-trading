// Hand-built minute sessions for the intraday study's tests. Bars are given in New York wall-clock time and
// grouped with the repository's own groupMarketSessions, so DST, early closes and the closing print behave
// as in the real data.
import { groupMarketSessions, newYorkOffset } from '#lib';
import type { MarketSession, Tick } from '#types';
import { computeRecentHighs } from '../data.ts';

export const utcOf = (date: string, at: string) => {
  const [hours, minutes] = at.split(':').map(Number) as [number, number];
  const midnight = Date.parse(date) / 1000;
  const local = midnight + (hours * 60 + minutes) * 60;

  return local - newYorkOffset(local - newYorkOffset(midnight + 12 * 3600));
};

export const minuteLabel = (minuteOfDay: number) =>
  `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;

export interface BarSpec {
  at: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SessionSpec {
  date: string;
  bars: BarSpec[];
  closingPrint?: number;
  closeAt?: string;
}

// A flat session at one price: every minute from 09:30 to the minute before the close, and a closing print.
export const flatBars = (price: number, closeAt = '16:00', skip: string[] = []): BarSpec[] => {
  const [hours, minutes] = closeAt.split(':').map(Number) as [number, number];
  const bars: BarSpec[] = [];

  for (let minute = 9 * 60 + 30; minute < hours * 60 + minutes; minute++) {
    const at = minuteLabel(minute);

    if (!skip.includes(at)) {
      bars.push({ at, open: price, high: price, low: price, close: price });
    }
  }

  return bars;
};

// Replaces bars at given times (adding them if missing), keeping time order.
export const withBars = (bars: BarSpec[], changes: BarSpec[]) => {
  const byTime = new Map(bars.map((bar) => [bar.at, bar]));

  for (const change of changes) {
    byTime.set(change.at, change);
  }

  return [...byTime.values()].sort((a, b) => a.at.localeCompare(b.at));
};

export const bar = (at: string, open: number, high: number, low: number, close: number): BarSpec => ({
  at,
  open,
  high,
  low,
  close
});

export const buildSessions = (specs: SessionSpec[]): MarketSession[] => {
  const ticks: Tick[] = [];

  for (const spec of specs) {
    for (const item of spec.bars) {
      ticks.push({ ...item, time: utcOf(spec.date, item.at), volume: 1000, trades: NaN });
    }

    if (spec.closingPrint !== undefined) {
      const price = spec.closingPrint;

      ticks.push({
        time: utcOf(spec.date, spec.closeAt ?? '16:00'),
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 5000,
        trades: NaN
      });
    }
  }

  ticks.sort((a, b) => a.time - b.time);

  return groupMarketSessions(ticks);
};

// Weekdays from a date, skipping the given holidays.
export const weekdays = (start: string, count: number) => {
  const dates: string[] = [];
  let time = Date.parse(start);

  while (dates.length < count) {
    const day = new Date(time).getUTCDay();

    if (day !== 0 && day !== 6) {
      dates.push(new Date(time).toISOString().slice(0, 10));
    }

    time += 86400000;
  }

  return dates;
};

// `history` flat sessions at 100 (the reference high is 100), then the test sessions.
export const withHistory = (tests: (dates: string[]) => SessionSpec[], history = 5, start = '2017-03-01') => {
  const dates = weekdays(start, history + 40);
  const specs: SessionSpec[] = dates
    .slice(0, history)
    .map((date) => ({ date, bars: flatBars(100), closingPrint: 100 }));
  const sessions = buildSessions([...specs, ...tests(dates.slice(history))]);

  return { sessions, recentHighs: computeRecentHighs(sessions), tradeStart: history };
};
