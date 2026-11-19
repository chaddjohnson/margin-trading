// A synthetic minute door (no market data): a seeded trending random walk over weekday NYSE sessions, grouped by the
// repository's own session code. Used by the unit tests and the mechanics checks of the pilot (stop/resume, eviction),
// never for a study figure.
import type { Tick } from '#types';
import { nyseHolidays } from '../lib/calendar.ts';
import { groupMarketSessions, newYorkOffset } from '../lib/session.ts';
import { Rng } from '../optimizer/rng.ts';
import type { DoorData } from './engine.ts';

export const fixtureDoor = (sessions = 320, seed = 7): DoorData => {
  const rng = new Rng([seed, 11, 13, 17]);
  const ticks: Tick[] = [];
  const day = new Date('2016-01-04T12:00:00Z');
  let price = 100;
  let made = 0;

  while (made < sessions) {
    const date = day.toISOString().slice(0, 10);
    const wd = day.getUTCDay();

    day.setUTCDate(day.getUTCDate() + 1);
    if (wd === 0 || wd === 6 || nyseHolidays.has(date)) continue;

    const noon = Date.parse(`${date}T12:00:00Z`) / 1000;
    const open = Date.parse(`${date}T09:30:00Z`) / 1000 - newYorkOffset(noon);
    const drift = Math.sin(made / 25) * 0.00012;

    for (let m = 0; m <= 390; m++) {
      const o = price;

      price = Math.max(1, price * (1 + drift + (rng.next() - 0.5) * 0.003));
      const hi = Math.max(o, price) * (1 + rng.next() * 0.0005);
      const lo = Math.min(o, price) * (1 - rng.next() * 0.0005);

      ticks.push({ time: open + m * 60, open: o, high: hi, low: lo, close: price, volume: 100 } as Tick);
    }

    made++;
  }

  const history = groupMarketSessions(ticks);

  return {
    name: 'fixture',
    history,
    warmup: 0,
    dataSha256: `fixture-${sessions}-${seed}`,
    from: history[0]!.date,
    to: history.at(-1)!.date
  };
};
