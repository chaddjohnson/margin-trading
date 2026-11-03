// Small deterministic statistics (no randomness, no p-values).
export const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

export const mean = (values: readonly number[]) => (values.length === 0 ? NaN : sum(values) / values.length);

// Linear-interpolation quantile (type 7) of a numeric sample; NaN for an empty one.
export const quantile = (values: readonly number[], p: number) => {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);

  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (h - lo);
};

export const median = (values: readonly number[]) => quantile(values, 0.5);

export const share = <T>(values: readonly T[], predicate: (value: T) => boolean) =>
  values.length === 0 ? NaN : values.filter(predicate).length / values.length;

// Spearman rank correlation with average ranks for ties (descriptive only).
export const spearman = (x: readonly number[], y: readonly number[]) => {
  if (x.length !== y.length || x.length < 3) {
    return NaN;
  }

  const ranks = (values: readonly number[]) => {
    const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
    const out = new Array<number>(values.length);
    let i = 0;

    while (i < order.length) {
      let j = i;

      while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) {
        j++;
      }

      for (let k = i; k <= j; k++) {
        out[order[k]!.index] = (i + j) / 2 + 1;
      }

      i = j + 1;
    }

    return out;
  };
  const rx = ranks(x);
  const ry = ranks(y);
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;

  for (let k = 0; k < x.length; k++) {
    num += (rx[k]! - mx) * (ry[k]! - my);
    dx += (rx[k]! - mx) ** 2;
    dy += (ry[k]! - my) ** 2;
  }

  return dx === 0 || dy === 0 ? NaN : num / Math.sqrt(dx * dy);
};
