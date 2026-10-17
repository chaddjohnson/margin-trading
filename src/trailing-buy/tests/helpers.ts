import fs from 'fs-extra';
import { Rng } from '../../optimizer/rng.ts';
import { derivedDir } from '../constants.ts';
import type { Bars, RunOptions, StrategyParams } from '../engine.ts';
import { baselineParams, simulate } from '../engine.ts';
import { IndicatorCache } from '../indicators.ts';

// Consecutive weekdays from 2020-01-06 (a Monday); `gapAfter` skips extra calendar days after an index.
export const weekdayDates = (count: number, gapAfter: Record<number, number> = {}) => {
  const dates: string[] = [];
  let time = Date.UTC(2020, 0, 6);

  while (dates.length < count) {
    const day = new Date(time).getUTCDay();

    if (day !== 0 && day !== 6) {
      dates.push(new Date(time).toISOString().slice(0, 10));
      time += (gapAfter[dates.length - 1] ?? 0) * 86400000;
    }

    time += 86400000;
  }

  return dates;
};

export type Ohlc = [number, number, number, number];

export const barsFrom = (rows: Ohlc[], gapAfter: Record<number, number> = {}): Bars => {
  const date = weekdayDates(rows.length, gapAfter);

  return {
    date,
    time: date.map((value) => new Date(value).getTime() / 1000),
    open: rows.map((row) => row[0]),
    high: rows.map((row) => row[1]),
    low: rows.map((row) => row[2]),
    close: rows.map((row) => row[3])
  };
};

// A bar whose open, high, low and close are all the close (no intraday range), or with a given high.
export const flat = (close: number, high = close): Ohlc => [close, Math.max(high, close), close, close];

export const run = (bars: Bars, params: Partial<StrategyParams>, options: Partial<RunOptions> = {}, start = 0) =>
  simulate(bars, new IndicatorCache(bars), { ...baselineParams, ...params }, start, bars.date.length - 1, options);

export const indexOfDate = (bars: Bars, date: string) => bars.date.indexOf(date);

// Volatile random walks with occasional forced gaps, to exercise every exit path and the restriction.
export const volatileWalk = (seed: string, sessions = 700, start = 50): Ohlc[] => {
  const rng = Rng.from('trailing-buy-test', seed);
  const rows: Ohlc[] = [];
  let close = start;

  for (let index = 0; index < sessions; index++) {
    const shock = (rng.next() - 0.5) * 0.06 + (rng.next() < 0.03 ? -0.08 : 0) + (rng.next() < 0.02 ? 0.07 : 0);
    const gap = rng.next() < 0.06 ? (rng.next() - 0.6) * 0.16 : 0;
    const open = close * (1 + gap);
    const next = Math.max(1, open * (1 + shock));
    const high = Math.max(open, next) * (1 + rng.next() * 0.02);
    const low = Math.min(open, next) * (1 - rng.next() * 0.02);

    rows.push([open, high, low, next].map((value) => Number(value.toFixed(4))) as Ohlc);
    close = next;
  }

  return rows;
};

export const writeFixture = async (name: string, rows: Ohlc[]) => {
  const dates = weekdayDates(rows.length);
  const file = `${derivedDir}/fixtures/${name}.csv`;

  await fs.ensureDir(`${derivedDir}/fixtures`);
  await fs.writeFile(file, `${rows.map((row, index) => [dates[index], ...row, 1000].join('|')).join('\n')}\n`);

  return file;
};
