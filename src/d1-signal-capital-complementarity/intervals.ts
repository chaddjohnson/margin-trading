// Interval arithmetic on half-open coordinate intervals [a, b) (PROTOCOL.md §6.1–6.3). Lists are normalized (sorted,
// merged, empty intervals dropped) before any measure.
export type Interval = [number, number];

export const normalize = (intervals: readonly Interval[]): Interval[] => {
  const sorted = intervals.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const result: Interval[] = [];

  for (const [a, b] of sorted) {
    const last = result.at(-1);

    if (last && a <= last[1]) {
      last[1] = Math.max(last[1], b);
    } else {
      result.push([a, b]);
    }
  }

  return result;
};

export const clip = (intervals: readonly Interval[], [lo, hi]: Interval): Interval[] =>
  normalize(intervals.map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)] as Interval));

export const lengthOf = (intervals: readonly Interval[]) => intervals.reduce((total, [a, b]) => total + (b - a), 0);

// |X ∩ Y| for normalized lists.
export const intersectionLength = (x: readonly Interval[], y: readonly Interval[]) => {
  let i = 0;
  let j = 0;
  let total = 0;

  while (i < x.length && j < y.length) {
    const lo = Math.max(x[i]![0], y[j]![0]);
    const hi = Math.min(x[i]![1], y[j]![1]);

    if (hi > lo) {
      total += hi - lo;
    }

    if (x[i]![1] < y[j]![1]) {
      i++;
    } else {
      j++;
    }
  }

  return total;
};

export const overlaps = (a: Interval, y: readonly Interval[]) =>
  y.some(([lo, hi]) => Math.min(a[1], hi) > Math.max(a[0], lo));

// The complement of a normalized list inside [lo, hi).
export const complementOf = (intervals: readonly Interval[], [lo, hi]: Interval): Interval[] => {
  const result: Interval[] = [];
  let cursor = lo;

  for (const [a, b] of clip(intervals, [lo, hi])) {
    if (a > cursor) {
      result.push([cursor, a]);
    }

    cursor = Math.max(cursor, b);
  }

  if (hi > cursor) {
    result.push([cursor, hi]);
  }

  return result;
};
