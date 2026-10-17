// Point-in-time series used by the engine. Every value at index i uses bars 0..i only; the engine reads
// the lagged ATR (index i - 1) at session i, so a decision never depends on the session's own range.

// Highest high of the `lookback` sessions before each session, today excluded: the original's
// `Math.max(...ticks.slice(max(0, i - lookback), i).map(high))`. -Infinity at index 0 (empty window).
export const referenceHighs = (high: ArrayLike<number>, lookback: number): Float64Array => {
  const value = new Float64Array(high.length);
  const deque = new Int32Array(high.length);
  let head = 0;
  let tail = 0;

  for (let index = 0; index < high.length; index++) {
    while (head < tail && deque[head]! < index - lookback) {
      head++;
    }

    value[index] = head < tail ? high[deque[head]!]! : -Infinity;

    while (head < tail && high[deque[tail - 1]!]! <= high[index]!) {
      tail--;
    }

    deque[tail++] = index;
  }

  return value;
};

// True range: high - low on the first bar of the series; afterwards the largest of high - low,
// |high - previous close| and |low - previous close|, so overnight gaps count.
export const trueRange = (high: ArrayLike<number>, low: ArrayLike<number>, close: ArrayLike<number>) => {
  const range = new Float64Array(high.length);

  for (let index = 0; index < high.length; index++) {
    const spread = high[index]! - low[index]!;

    if (index === 0) {
      range[index] = spread;
      continue;
    }

    const previousClose = close[index - 1]!;

    range[index] = Math.max(spread, Math.abs(high[index]! - previousClose), Math.abs(low[index]! - previousClose));
  }

  return range;
};

// Wilder's average true range over `period` sessions, including the current session: NaN before the
// first full window; at index period - 1 the simple mean of the first `period` true ranges; afterwards
// (previous ATR x (period - 1) + true range) / period.
export const wilderAtr = (
  high: ArrayLike<number>,
  low: ArrayLike<number>,
  close: ArrayLike<number>,
  period: number
): Float64Array => {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`ATR period must be a positive integer, got ${period}`);
  }

  const range = trueRange(high, low, close);
  const atr = new Float64Array(high.length).fill(NaN);
  let sum = 0;

  for (let index = 0; index < range.length; index++) {
    if (index < period) {
      sum += range[index]!;

      if (index === period - 1) {
        atr[index] = sum / period;
      }

      continue;
    }

    atr[index] = (atr[index - 1]! * (period - 1) + range[index]!) / period;
  }

  return atr;
};

// Per-dataset caches, so each lookback and ATR period is computed once per worker.
export class IndicatorCache {
  private readonly highs = new Map<number, Float64Array>();
  private readonly atrs = new Map<number, Float64Array>();

  constructor(private readonly bars: { high: ArrayLike<number>; low: ArrayLike<number>; close: ArrayLike<number> }) {}

  referenceHighs(lookback: number) {
    let value = this.highs.get(lookback);

    if (!value) {
      value = referenceHighs(this.bars.high, lookback);
      this.highs.set(lookback, value);
    }

    return value;
  }

  atr(period: number) {
    let value = this.atrs.get(period);

    if (!value) {
      value = wilderAtr(this.bars.high, this.bars.low, this.bars.close, period);
      this.atrs.set(period, value);
    }

    return value;
  }
}
