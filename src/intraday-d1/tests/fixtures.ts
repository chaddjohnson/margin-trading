// Synthetic minute data for the Intraday D1 tests: a seeded random walk on real New York dates (a DST change, a
// weekend, a holiday and an early close), sparse minutes (no trade → no bar), extended-hours bars and closing prints,
// grouped by the repository's own groupMarketSessions. Nothing here reads market data.
import { groupMarketSessions } from '#lib';
import type { MarketSession, Tick } from '#types';
import { Rng } from '../../optimizer/rng.ts';

const nyOffsetHours = (date: string) => {
  // US DST 2020: 2020-03-08 → 2020-11-01
  return date >= '2020-03-08' && date < '2020-11-01' ? 4 : 5;
};

export const fixtureDates = [
  '2020-03-02',
  '2020-03-03',
  '2020-03-04',
  '2020-03-05',
  '2020-03-06', // EST
  '2020-03-09',
  '2020-03-10',
  '2020-03-11',
  '2020-03-12',
  '2020-03-13', // EDT after the weekend change
  '2020-11-23',
  '2020-11-24',
  '2020-11-25',
  '2020-11-27', // 11-26 holiday, 11-27 early close (13:00)
  '2020-11-30',
  '2020-12-01',
  '2020-12-02',
  '2020-12-03',
  '2020-12-04'
];

export const syntheticTicks = (seed: string, options: { presence?: number; volatility?: number } = {}): Tick[] => {
  const rng = Rng.from('intraday-d1-tests', seed);
  const presence = options.presence ?? 0.8;
  const vol = options.volatility ?? 0.0012;
  const ticks: Tick[] = [];
  let price = 100;

  for (const date of fixtureDates) {
    const offset = nyOffsetHours(date);
    const open = Date.parse(`${date}T09:30:00Z`) / 1000 + offset * 3600;
    const minutes = date === '2020-11-27' ? 210 : 390;
    // a pre-market bar (dropped by the grouping) and an overnight gap
    ticks.push({ time: open - 3600, open: price, high: price, low: price, close: price, volume: 10, trades: NaN });
    price *= 1 + (rng.next() - 0.5) * 0.02;

    for (let m = 0; m < minutes; m++) {
      const drift = (rng.next() - 0.5) * 2 * vol + (rng.next() < 0.01 ? (rng.next() - 0.6) * 0.02 : 0);
      const o = price;
      const c = price * (1 + drift);
      const h = Math.max(o, c) * (1 + rng.next() * vol * 0.5);
      const l = Math.min(o, c) * (1 - rng.next() * vol * 0.5);

      price = c;

      if (m > 0 && rng.next() > presence) continue;

      ticks.push({ time: open + m * 60, open: o, high: h, low: l, close: c, volume: 100, trades: NaN });
    }

    // the closing print (the bar starting at the close), most days
    if (rng.next() < 0.9) {
      ticks.push({
        time: open + minutes * 60,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 1000,
        trades: NaN
      });
    }
  }

  return ticks;
};

export const syntheticSessions = (
  seed: string,
  options?: { presence?: number; volatility?: number }
): MarketSession[] => groupMarketSessions(syntheticTicks(seed, options));
