// The time measure of PROTOCOL.md §6.1: regular-session minutes. Session s spans [open_s, close_s) with close_s the
// dataset's session close (16:00, or 13:00 New York on an early close) and open_s = 09:30 New York of the same date
// (no daylight-saving change happens inside a session, so open_s = close_s − (close's New York minutes − 570) × 60).
// Every symbol of the universe shares one calendar, so one grid serves all of them. A time maps to the number of
// regular-session minutes before it; interval lengths and intersections are computed in that coordinate.
import type { Dataset } from '../four-family/data.ts';

const newYorkMinutes = (seconds: number) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(seconds * 1000));
  const hour = Number(parts.find((part) => part.type === 'hour')!.value) % 24;
  const minute = Number(parts.find((part) => part.type === 'minute')!.value);

  return hour * 60 + minute;
};

export class MinuteGrid {
  readonly opens: Float64Array;
  readonly closes: Float64Array;
  readonly before: Float64Array; // regular-session minutes before each session's open
  readonly dates: readonly string[];
  readonly total: number;

  constructor(ds: Pick<Dataset, 'sCloseTime' | 'sessionCount' | 'dates'>) {
    const n = ds.sessionCount;

    this.opens = new Float64Array(n);
    this.closes = new Float64Array(n);
    this.before = new Float64Array(n + 1);
    this.dates = ds.dates;

    for (let s = 0; s < n; s++) {
      const close = ds.sCloseTime[s]!;
      const length = newYorkMinutes(close) - 570;

      if (!(length > 0 && length <= 390)) {
        throw new Error(`session ${ds.dates[s]}: a close at ${length + 570} New York minutes is not a regular close`);
      }

      this.closes[s] = close;
      this.opens[s] = close - length * 60;
      this.before[s + 1] = this.before[s]! + length;
    }

    this.total = this.before[n]!;
  }

  get sessionCount() {
    return this.opens.length;
  }

  // The last session whose open is at or before t (−1 before the first open).
  sessionAt(t: number) {
    let lo = 0;
    let hi = this.opens.length - 1;

    if (!(t >= this.opens[0]!)) {
      return -1;
    }

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;

      if (this.opens[mid]! <= t) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    return lo;
  }

  // Regular-session minutes before time t (+Infinity maps to the end of the grid).
  coordinate(t: number) {
    if (t === Infinity) {
      return this.total;
    }

    const s = this.sessionAt(t);

    if (s < 0) {
      return 0;
    }

    if (t >= this.closes[s]!) {
      return this.before[s + 1]!;
    }

    return this.before[s]! + (t - this.opens[s]!) / 60;
  }

  // The coordinates of a window's sessions [first, last] (inclusive), from first's open to last's close.
  span(first: number, last: number): [number, number] {
    return [this.before[first]!, this.before[last + 1]!];
  }
}
