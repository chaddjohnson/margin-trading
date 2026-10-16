import type { AlignedSeries, DailyBars, StudyData } from '../data.ts';
import { mulberry32 } from '../stats.ts';

const day = 86400;

// Weekday dates from 2015-01-05.
export const dates = (count: number) => {
  const result: string[] = [];
  let time = Date.parse('2015-01-05') / 1000;

  while (result.length < count) {
    const weekday = new Date(time * 1000).getUTCDay();

    if (weekday !== 0 && weekday !== 6) {
      result.push(new Date(time * 1000).toISOString().slice(0, 10));
    }

    time += day;
  }

  return result;
};

// Bars from closes: open = previous close (or overrides), high/low bracket open and close by 0.1%.
export const barsFrom = (
  closes: number[],
  options: { opens?: (number | undefined)[]; lows?: (number | undefined)[]; symbol?: string } = {}
): DailyBars => {
  const date = dates(closes.length);
  const open = closes.map((close, index) => options.opens?.[index] ?? (index === 0 ? close : closes[index - 1]!));
  const high = closes.map((close, index) => Math.max(open[index]!, close) * 1.001);
  const low = closes.map((close, index) => options.lows?.[index] ?? Math.min(open[index]!, close) * 0.999);

  return {
    symbol: options.symbol ?? 'TEST',
    file: 'synthetic',
    date,
    time: date.map((value) => Date.parse(value) / 1000),
    open,
    high,
    low,
    close: [...closes],
    volume: closes.map((_, index) => 1000000 + (index % 7) * 50000)
  };
};

export const randomWalk = (count: number, seed: number, drift = 0.0003, volatility = 0.015) => {
  const random = mulberry32(seed);
  const closes = [100];

  for (let i = 1; i < count; i++) {
    const shock = (random() + random() + random() - 1.5) * 2 * volatility;
    closes.push(closes[i - 1]! * Math.exp(drift + shock));
  }

  return closes;
};

export const toCsv = (bars: DailyBars) =>
  `${bars.date.map((date, i) => [date, bars.open[i], bars.high[i], bars.low[i], bars.close[i], bars.volume[i]].join('|')).join('\n')}\n`;

export const studyDataOf = (bars: DailyBars, proxies: DailyBars[] = [], vix?: Map<string, number>): StudyData => ({
  vgt: bars,
  proxies: proxies.map((own): AlignedSeries => {
    const byDate = new Map(own.date.map((date, index) => [date, index]));
    const ownIndex = bars.date.map((date) => byDate.get(date) ?? -1);
    return {
      symbol: own.symbol,
      own,
      ownIndex,
      close: ownIndex.map((i) => (i === -1 ? NaN : own.close[i]!)),
      high: ownIndex.map((i) => (i === -1 ? NaN : own.high[i]!))
    };
  }),
  vix
});
