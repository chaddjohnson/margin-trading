// Synthetic VGT-like minute data (no market data): NYSE sessions from 2016-01-04 with 5-minute bars and a closing print,
// a seeded random walk with alternating up-trends, sharp declines and recoveries so every Growth rule can act.
import { groupMarketSessions, newYorkOffset } from '#lib';
import type { MarketSession, Tick } from '#types';
import { nyseHolidays } from '../../lib/calendar.ts';
import { Rng } from '../../optimizer/rng.ts';

export const syntheticSessions = (sessions = 520, seed = 'growth-vgt-study8-fixture'): MarketSession[] => {
  const rng = Rng.from(seed);
  const ticks: Tick[] = [];
  let price = 100;
  let day = Date.parse('2016-01-04T00:00:00Z') / 1000;
  let count = 0;

  while (count < sessions) {
    const date = new Date(day * 1000).toISOString().slice(0, 10);
    const weekday = new Date(day * 1000).getUTCDay();

    day += 86400;

    if (weekday === 0 || weekday === 6 || nyseHolidays.has(date)) continue;

    // regime: 120-session cycles of rise, a 12-session decline, and a recovery
    const phase = count % 120;
    const drift = phase < 80 ? 0.0009 : phase < 92 ? -0.006 : 0.002;

    for (let k = 0; k <= 78; k++) {
      const local = Date.parse(`${date}T09:30:00Z`) / 1000 + k * 300;
      const time = local - newYorkOffset(local);

      if (k === 78) {
        ticks.push({ time, open: price, high: price, low: price, close: price, volume: 1000 } as Tick);
        break;
      }

      const step = drift / 78 + (rng.next() - 0.5) * 0.004;
      const open = price;
      const close = Math.max(1, open * (1 + step));
      const high = Math.max(open, close) * (1 + rng.next() * 0.0008);
      const low = Math.min(open, close) * (1 - rng.next() * 0.0008);

      ticks.push({ time, open, high, low, close, volume: 100 + Math.floor(rng.next() * 900) } as Tick);
      price = close;
    }

    count++;
  }

  return groupMarketSessions(ticks);
};
