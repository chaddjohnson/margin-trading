// Synthetic minute data for edge-case tests. Bars are built as ticks and grouped by the repository's own
// groupMarketSessions, so early closes, closing prints and dropped minutes behave exactly as with real data.
import { groupMarketSessions, newYorkOffset } from '#lib';
import type { MarketSession, Tick } from '#types';
import { Rng } from '../../optimizer/rng.ts';

export interface BarSpec {
  minute: number; // minutes after 9:30 New York time
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SessionSpec {
  date: string;
  bars: BarSpec[];
  closingPrint?: number; // omitted: no closing print
  closeMinute?: number; // 390, or 210 on early-close days
}

const openUtc = (date: string) => {
  const guess = Date.parse(`${date}T14:30:00Z`) / 1000;

  return Date.parse(`${date}T09:30:00Z`) / 1000 - newYorkOffset(guess);
};

export const buildSessions = (specs: SessionSpec[]): MarketSession[] => {
  const ticks: Tick[] = [];

  for (const spec of specs) {
    const open = openUtc(spec.date);

    for (const bar of spec.bars) {
      ticks.push({ time: open + bar.minute * 60, ...bar, volume: 100, trades: NaN });
    }

    if (spec.closingPrint !== undefined) {
      const price = spec.closingPrint;

      ticks.push({
        time: open + (spec.closeMinute ?? 390) * 60,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 100,
        trades: NaN
      });
    }
  }

  return groupMarketSessions(ticks.sort((a, b) => a.time - b.time));
};

// A bar from a list of minute prices: open at the first, close at the last, high and low spanning them.
export const bar = (minute: number, ...prices: number[]): BarSpec => ({
  minute,
  open: prices[0]!,
  high: Math.max(...prices),
  low: Math.min(...prices),
  close: prices.at(-1)!
});

// Weekdays from a date, skipping a few market holidays that fall in the generated ranges.
export const weekdays = (start: string, count: number) => {
  const holidays = new Set(['2017-11-23', '2017-12-25', '2018-01-01', '2018-01-15', '2018-02-19', '2018-03-30']);
  const dates: string[] = [];

  for (let time = Date.parse(start); dates.length < count; time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const day = new Date(time).getUTCDay();

    if (day !== 0 && day !== 6 && !holidays.has(date)) {
      dates.push(date);
    }
  }

  return dates;
};

const earlyCloses = new Set(['2017-11-24', '2018-07-03', '2018-11-23', '2018-12-24']);

// A random path with drawdown and rebound phases, gaps, missing minutes, few-bar sessions, sessions without
// a closing print and early closes, sized for small lookbacks.
export const randomScenario = (seed: string, sessionCount = 60) => {
  const rng = Rng.from('four-family-fixture', seed);
  const startDates = ['2017-10-02', '2017-11-06', '2018-06-04', '2018-10-29', '2018-11-26'];
  const dates = weekdays(startDates[rng.int(startDates.length)]!, sessionCount);
  let price = 100;
  let drift = 0;
  const specs: SessionSpec[] = dates.map((date, index) => {
    if (index % 7 === 0) {
      drift = (rng.next() - 0.55) * 0.004;
    }

    const closeMinute = earlyCloses.has(date) ? 210 : 390;
    const gap = rng.next() < 0.1 ? (rng.next() - 0.6) * 0.08 : 0;
    const sparse = rng.next() < 0.08;
    const bars: BarSpec[] = [];

    price *= 1 + gap;

    for (let minute = 0; minute < closeMinute; minute++) {
      const open = price;
      const path = [open];

      for (let step = 0; step < 3; step++) {
        price *= 1 + drift / 30 + (rng.next() - 0.5) * 0.004;
        path.push(price);
      }

      const keep = sparse ? rng.next() < 0.01 : rng.next() < 0.75;

      if (keep || minute === 0) {
        bars.push(bar(minute, ...path));
      }
    }

    const hasClosingPrint = rng.next() > 0.08;

    return {
      date,
      bars,
      closeMinute,
      closingPrint: hasClosingPrint ? price * (1 + (rng.next() - 0.5) * 0.002) : undefined
    };
  });

  return buildSessions(specs);
};
