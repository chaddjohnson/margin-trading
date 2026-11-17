// Drag-to-measure: the price change between two plotted points, always computed chronologically (earlier → later),
// whichever way the user dragged. Endpoints are actual plotted data points (time and the point's own price), never
// interpolated screen positions.

export interface MeasurePoint {
  t: number; // ms (the plotted point's x value)
  price: number; // the plotted point's y value
}

export interface Measurement {
  start: MeasurePoint;
  end: MeasurePoint;
  change: number; // end − start, in price units (USD for market data)
  percent: number; // (end − start) / start × 100
  direction: 'up' | 'down' | 'flat';
}

export function measure(a: MeasurePoint, b: MeasurePoint): Measurement {
  const [start, end] = a.t <= b.t ? [a, b] : [b, a];
  const change = end.price - start.price;
  const percent = start.price !== 0 ? (change / start.price) * 100 : NaN;
  return { start, end, change, percent, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
}

/**
 * The row a measurement snaps to for the instant `t` under the pointer: the row nearest in time among the rows INSIDE
 * the visible window [lo, hi] that have a price (rows sorted by x; `xAt(i)` is row i's instant). An instant outside
 * the window stops at the window's first or last row. Dygraphs' own findClosestRow also considers the off-window
 * neighbour it keeps for line continuity, so an endpoint could fall on a session the chart does not show. −1 when the
 * window has no row with a price.
 */
export function nearestRow(
  n: number,
  xAt: (i: number) => number,
  hasPrice: (i: number) => boolean,
  t: number,
  lo: number,
  hi: number
): number {
  const target = Math.min(hi, Math.max(lo, t));
  let a = 0;
  let b = n;
  while (a < b) {
    const m = (a + b) >>> 1;
    if (xAt(m) < target) a = m + 1;
    else b = m;
  }
  let right = -1;
  for (let i = a; i < n && xAt(i) <= hi; i++)
    if (hasPrice(i)) {
      right = i;
      break;
    }
  let left = -1;
  for (let i = a - 1; i >= 0 && xAt(i) >= lo; i--)
    if (hasPrice(i)) {
      left = i;
      break;
    }
  if (left < 0 || right < 0) return left < 0 ? right : left;
  return target - xAt(left) <= xAt(right) - target ? left : right;
}

// Signed amounts with two decimals; a non-zero change too small for two decimals keeps four (so a tiny rise never
// reads "+$0.00"), and one below that reads "<0.0001". Zero has no sign; a non-finite value is "—".
const signed = (x: number, unit: string, suffix: string) => {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return `${unit}0.00${suffix}`;
  const sign = x > 0 ? '+' : '−';
  const a = Math.abs(x);
  if (a >= 0.005) return `${sign}${unit}${a.toFixed(2)}${suffix}`;
  return a >= 0.00005 ? `${sign}${unit}${a.toFixed(4)}${suffix}` : `${sign}<${unit}0.0001${suffix}`;
};

export const formatChange = (x: number) => signed(x, '$', '');

export const formatPercentChange = (x: number) => signed(x, '', '%');
