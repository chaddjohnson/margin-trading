// gpu-phase4 (a copy of src/gpu-phase3/fixtures.ts with this study's namespace) adversarial set S: seeded synthetic two-symbol doors long enough for Growth's lookbacks (up to 250 bars,
// 200-session averages) and built to hit edge paths: weekdays with random holidays (calendar gaps for hold ages and
// interest), 1–30 minute bars per session on a coarse 0.25 price grid (exact ties at stops, thresholds and averages),
// opening gaps up to ±12% (gaps through stops), missing minutes (reopening observations of the drawdown gate), early
// closes (one calendar for both symbols), sessions without a closing print, single-bar sessions, both symbols printing
// at the same instants (same-instant decisions: the pool's tie order), regime phases (crash, bear, trend, quiet) so
// that dips, recoveries, trend filters and continuations all trigger. No market data is read.
import type { MarketSession } from '#types';
import { Rng } from '../optimizer/rng.ts';
import { type Door, fixtureDoorOf } from '../vg-d1-growth-joint/data.ts';
import { sessionOf, weekdays } from '../d1-risk-controls/tests/fixtures.ts';
import { seedOf } from './context.ts';

const tick = (x: number) => Math.max(0.25, Math.round(x * 4) / 4);

export const fixtureDoor = (d: number, sessions = 420): Door => {
  const rng = new Rng(seedOf('fixture-door', d));
  const all = weekdays(Math.round(sessions * 1.3), '2017-01-02');
  const dates = all.filter(() => rng.next() > 0.12).slice(0, sessions);
  const early = dates.map(() => rng.next() < 0.04);
  // regime drift per session: alternating phases of 30–90 sessions
  const drift: number[] = [];
  while (drift.length < dates.length) {
    const len = 30 + rng.int(61);
    const mu = [-0.012, -0.004, 0.0, 0.003, 0.008][rng.int(5)]!;
    for (let i = 0; i < len; i++) drift.push(mu);
  }
  const make = (p0: number) => {
    let p = p0;

    return dates.map((date, s): MarketSession => {
      const gap = rng.next() < 0.12 ? (rng.next() - 0.6) * 0.24 : drift[s]! + (rng.next() - 0.5) * 0.02;

      p = tick(p * (1 + gap));

      const nBars = rng.next() < 0.08 ? 1 : 2 + rng.int(29);
      const bars = [];
      let slot = 0;
      let last = p;

      for (let k = 0; k < nBars; k++) {
        if (rng.next() < 0.12) slot += 1 + rng.int(4); // missing minutes
        const o = k === 0 ? p : rng.next() < 0.1 ? tick(last * (1 + (rng.next() - 0.6) * 0.06)) : last;
        const c = tick(o * (1 + (rng.next() - 0.5 + drift[s]! * 4) * 0.04));
        const l = tick(Math.min(o, c) * (1 - rng.next() * 0.03));
        const h = tick(Math.max(o, c) * (1 + rng.next() * 0.02));

        bars.push({ o, c, h: Math.max(h, o, c), l: Math.min(l, o, c), slot });
        slot++;
        last = c;
      }
      p = last;

      const noClosingPrint = s > 0 && rng.next() < 0.05;

      return sessionOf(date, bars, { early: early[s], ...(noClosingPrint ? { closingPrint: null } : {}) });
    });
  };

  return fixtureDoorOf(`gpup2-adversarial-${d}`, { GDX: make(40), VGT: make(100) });
};
