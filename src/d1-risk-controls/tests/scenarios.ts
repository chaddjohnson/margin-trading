// Synthetic D1 scenarios for the book and pool tests: a small D1 grid that arms on a 10% dip below the 3-session high
// and buys a 1% rebound, and price paths written session by session (minute closes; each minute opens at the previous
// close unless the session's open is given).
import type { MarketSession } from '#types';
import type { D1Grid } from '../../vg-d1-growth-joint/books.ts';
import { type Bar, sessionOf, weekdays } from './fixtures.ts';

// X 10%, Y 1%, stop 5%, hold 5 calendar days, L 3 sessions, buffer 2%, P 5%, W 5 sessions (grid units).
export const grid = (o: Partial<D1Grid> = {}): D1Grid => ({
  targetPercentChange: 100,
  trailingBuyPercentage: 10,
  trailingStopPercentage: 50,
  maximumHoldDays: 5,
  tickWindowSize: 3,
  intradayLossBuffer: 20,
  pullback: 50,
  continuationWindow: 5,
  ...o
});

export type Day = number[] | { open: number; closes: number[]; closingPrint?: number | null };

export const pathOf = (days: Day[], start = '2021-03-01'): MarketSession[] => {
  const dates = weekdays(days.length, start);

  return days.map((d, i) => {
    const spec = Array.isArray(d) ? { open: d[0]!, closes: d } : d;
    const bars: Bar[] = spec.closes.map((c, k) => ({ o: k === 0 ? spec.open : spec.closes[k - 1]!, c }));

    return sessionOf(dates[i]!, bars, spec.closingPrint === undefined ? {} : { closingPrint: spec.closingPrint });
  });
};

const flat = (p: number, n = 3) => Array.from({ length: n }, () => p);

// A dip-buy at 90 on day 4 (Fri 2021-03-05), a slide, a gap to 80 on day 6 and a long decline with re-entries.
export const crash: Day[] = [
  flat(100),
  flat(100),
  flat(100),
  flat(100),
  { open: 95, closes: [95, 89.5, 89, 90, 90.5] },
  { open: 88, closes: [88, 86, 85] },
  { open: 80, closes: [80, 79, 78] },
  { open: 77, closes: [77, 76] },
  { open: 76.5, closes: [77, 78] },
  { open: 70, closes: [70, 69] },
  flat(69),
  { open: 68, closes: [68, 62, 61, 62] },
  flat(61.5),
  { open: 60, closes: [60, 55, 54, 55] },
  flat(55),
  flat(55),
  flat(56),
  flat(57),
  flat(58),
  flat(58)
];

// The same dip-buy, then a recovery: the bought dip pays and the continuation window re-enters on a pullback.
export const recovery: Day[] = [
  flat(100),
  flat(100),
  flat(100),
  flat(100),
  { open: 95, closes: [95, 89.5, 89, 90, 90.5] },
  { open: 91, closes: [91, 93, 95] },
  { open: 96, closes: [96, 98, 100] },
  { open: 101, closes: [101, 103, 104] },
  { open: 104, closes: [104, 105, 106] },
  { open: 106, closes: [106, 101, 99, 98] },
  // 95.5 is ≤ H × 0.95 (H = the exit price 100.7: the continuation pullback) but above 0.9 × 106 (no deep arming)
  { open: 97, closes: [97, 96, 95.5] },
  { open: 95.5, closes: [95.5, 96.5, 97] },
  flat(98),
  flat(99),
  flat(100)
];

// A failed dip-buy (maximum hold at a loss), a re-entry that pays (trailing stop in profit), then a continuation
// re-entry on a pullback of 5% from the exit price that is not a 10% dip below the 3-session high.
export const whipsaw: Day[] = [
  flat(100),
  flat(100),
  flat(100),
  flat(100),
  { open: 95, closes: [95, 89.5, 89, 90, 90.5] },
  { open: 88, closes: [88, 86, 85] },
  { open: 80, closes: [80, 79, 78] },
  { open: 77, closes: [77, 76] },
  { open: 76.5, closes: [77, 78] },
  { open: 80, closes: [80, 84, 86] },
  { open: 88, closes: [88, 90, 92] },
  { open: 93, closes: [93, 95] },
  { open: 95, closes: [95, 90, 88] },
  { open: 87, closes: [87, 85.6] },
  { open: 85.6, closes: [86.5, 87] },
  flat(88),
  flat(89)
];
