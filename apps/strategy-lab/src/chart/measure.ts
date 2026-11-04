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

export const formatChange = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}$${Math.abs(x).toFixed(2)}`;

export const formatPercentChange = (x: number) =>
  Number.isFinite(x) ? `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(2)}%` : '—';
