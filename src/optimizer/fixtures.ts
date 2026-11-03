// Deterministic synthetic daily bars for golden-master edge cases and tests, written in the repository's
// headerless pipe-delimited format. Scenarios are built from explicit close paths so each exercises a
// specific rule (gap through the stop, maximum hold, restricted re-entry, recovery reset, open at the end,
// no trades), plus seeded random walks with occasional gaps and multi-day market closures.
import fs from 'fs-extra';
import path from 'node:path';
import { Rng } from './rng.ts';

export interface FixtureBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const round = (value: number) => Math.round(value * 10000) / 10000;

// Weekdays from a start date, skipping the given extra closures.
export const sessionDates = (start: string, count: number, closures: string[] = []) => {
  const dates: string[] = [];
  const closed = new Set(closures);
  const day = new Date(`${start}T00:00:00Z`);

  while (dates.length < count) {
    const weekday = day.getUTCDay();
    const date = day.toISOString().slice(0, 10);

    if (weekday !== 0 && weekday !== 6 && !closed.has(date)) {
      dates.push(date);
    }

    day.setUTCDate(day.getUTCDate() + 1);
  }

  return dates;
};

// Bars from a close path: each session opens at the previous close times (1 + gap) and ranges around.
export const barsFromCloses = (
  dates: string[],
  closes: number[],
  options: { gaps?: Record<number, number>; spread?: number; lows?: Record<number, number> } = {}
): FixtureBar[] =>
  closes.map((close, index) => {
    const previous = index === 0 ? close : closes[index - 1]!;
    const open = round(previous * (1 + (options.gaps?.[index] ?? 0)));
    const spread = options.spread ?? 0.004;
    const high = round(Math.max(open, close) * (1 + spread));
    const low = round(options.lows?.[index] ?? Math.min(open, close) * (1 - spread));

    return { date: dates[index]!, open, high, low, close: round(close), volume: 1000000 + index };
  });

const path_ = (segments: [number, number][], start: number) => {
  // Linear segments of [sessions, total return].
  const closes: number[] = [start];

  for (const [sessions, change] of segments) {
    const from = closes.at(-1)!;

    for (let step = 1; step <= sessions; step++) {
      closes.push(from * (1 + (change * step) / sessions));
    }
  }

  return closes;
};

export const scenarios = (): Record<string, FixtureBar[]> => {
  const result: Record<string, FixtureBar[]> = {};

  // A 12% dip buys; a rally lifts the stop above the entry; the price then gaps far below the stop.
  {
    const closes = path_(
      [
        [100, 0.2],
        [10, -0.13],
        [30, 0.25],
        [1, -0.15],
        [40, 0.05]
      ],
      100
    );
    const dates = sessionDates('2015-01-05', closes.length);

    result['gap-through-stop'] = barsFromCloses(dates, closes, { gaps: { 141: -0.14 } });
  }

  // Entry, then a slow decline: the maximum-hold rule sells at the open; a week-long closure tests
  // calendar-day counting.
  {
    const closes = path_(
      [
        [100, 0.2],
        [10, -0.12],
        [40, -0.06],
        [40, 0.1]
      ],
      50
    );
    const dates = sessionDates('2016-03-01', closes.length, [
      '2016-08-08',
      '2016-08-09',
      '2016-08-10',
      '2016-08-11',
      '2016-08-12'
    ]);

    result['maximum-hold'] = barsFromCloses(dates, closes);
  }

  // A losing exit restricts re-entry; a further decline below the lower level re-enters; then a second
  // loss and a 38% recovery resets the restriction.
  {
    const closes = path_(
      [
        [100, 0.3],
        [8, -0.12],
        [25, -0.06],
        [10, -0.08],
        [30, 0.12],
        [8, -0.11],
        [25, -0.05],
        [40, 0.15],
        [20, 0.05]
      ],
      80
    );
    const dates = sessionDates('2017-01-03', closes.length);

    result['restriction-reentry-reset'] = barsFromCloses(dates, closes, { spread: 0.01 });
  }

  // A steady rise never dips 10%: no trades at all.
  {
    const closes = path_([[300, 0.5]], 40);

    result['no-trades'] = barsFromCloses(sessionDates('2018-01-02', closes.length), closes);
  }

  // A dip right at the end leaves the position open on the last session.
  {
    const closes = path_(
      [
        [150, 0.3],
        [12, -0.14],
        [3, 0.01]
      ],
      60
    );

    result['open-at-end'] = barsFromCloses(sessionDates('2019-01-02', closes.length), closes);
  }

  // Very short series.
  result['one-session'] = barsFromCloses(['2020-01-02'], [10]);
  result['two-sessions'] = barsFromCloses(['2020-01-02', '2020-01-03'], [10, 8.5]);

  // Seeded random walks with fat tails, gaps and closures.
  for (let seed = 1; seed <= 6; seed++) {
    const rng = Rng.from('fixture-walk', seed);
    const count = 900;
    const dates = sessionDates('2010-01-04', count, ['2011-03-14', '2011-03-15', '2012-10-29', '2012-10-30']);
    const bars: FixtureBar[] = [];
    let close = 50 + seed * 10;

    for (let index = 0; index < count; index++) {
      const volatility = 0.01 + 0.004 * seed;
      const shock = (rng.next() - 0.5) * 2 * volatility * (rng.next() < 0.05 ? 4 : 1);
      const gap = rng.next() < 0.06 ? (rng.next() - 0.6) * 0.08 : 0;
      const open = round(close * (1 + gap));
      const next = Math.max(1, close * (1 + gap + shock));
      const high = round(Math.max(open, next) * (1 + rng.next() * volatility));
      const low = round(Math.min(open, next) * (1 - rng.next() * volatility));

      close = round(next);
      bars.push({ date: dates[index]!, open, high, low, close, volume: Math.round(1e6 * (1 + rng.next())) });
    }

    result[`random-walk-${seed}`] = bars;
  }

  return result;
};

export const writeFixture = async (file: string, bars: FixtureBar[]) => {
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(
    file,
    `${bars.map((bar) => [bar.date, bar.open, bar.high, bar.low, bar.close, bar.volume].join('|')).join('\n')}\n`
  );
};
