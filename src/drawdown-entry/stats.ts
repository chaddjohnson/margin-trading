// Small, dependency-free statistics. All randomness is seeded.

export const mulberry32 = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

// Wilson score interval for a binomial proportion.
export const wilson = (successes: number, trials: number, z = 1.96): [number, number] => {
  if (trials === 0) {
    return [NaN, NaN];
  }

  const p = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const centre = p + (z * z) / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials));

  return [(centre - margin) / denominator, (centre + margin) / denominator];
};

export const quantile = (sorted: number[], q: number) => {
  if (sorted.length === 0) {
    return NaN;
  }

  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
};

// Percentile bootstrap over clusters: each cluster is resampled whole, and `statistic` receives the
// resampled list of clusters.
export const clusterBootstrap = <T>(
  clusters: T[],
  statistic: (sample: T[]) => number,
  replicates = 2000,
  seed = 20261016
) => {
  const random = mulberry32(seed);
  const values: number[] = [];

  for (let r = 0; r < replicates; r++) {
    const sample: T[] = [];

    for (let i = 0; i < clusters.length; i++) {
      sample.push(clusters[Math.floor(random() * clusters.length)]!);
    }

    const value = statistic(sample);

    if (!Number.isNaN(value)) {
      values.push(value);
    }
  }

  values.sort((a, b) => a - b);

  return { low: quantile(values, 0.025), high: quantile(values, 0.975), replicates: values.length };
};

const ranks = (values: number[]) => {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length);

  for (let i = 0; i < order.length;) {
    let j = i;

    while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) {
      j++;
    }

    for (let k = i; k <= j; k++) {
      result[order[k]!.index] = (i + j) / 2 + 1;
    }

    i = j + 1;
  }

  return result;
};

export const spearman = (x: number[], y: number[]) => {
  const pairs = x
    .map((value, index) => [value, y[index]!] as const)
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));

  if (pairs.length < 3) {
    return NaN;
  }

  const rx = ranks(pairs.map(([a]) => a));
  const ry = ranks(pairs.map(([, b]) => b));
  const mean = (rx.length + 1) / 2;
  let numerator = 0;
  let sx = 0;
  let sy = 0;

  for (let i = 0; i < rx.length; i++) {
    numerator += (rx[i]! - mean) * (ry[i]! - mean);
    sx += (rx[i]! - mean) ** 2;
    sy += (ry[i]! - mean) ** 2;
  }

  return numerator / Math.sqrt(sx * sy);
};

// Area under the ROC curve (probability a random positive scores above a random negative; ties count half).
export const auc = (scores: number[], labels: boolean[]) => {
  let positives = 0;
  let negatives = 0;
  let wins = 0;

  for (let i = 0; i < scores.length; i++) {
    if (!labels[i] || !Number.isFinite(scores[i]!)) continue;
    positives++;

    for (let j = 0; j < scores.length; j++) {
      if (labels[j] || !Number.isFinite(scores[j]!)) continue;
      wins += scores[i]! > scores[j]! ? 1 : scores[i]! === scores[j]! ? 0.5 : 0;
    }
  }

  for (let j = 0; j < scores.length; j++) {
    if (!labels[j] && Number.isFinite(scores[j]!)) negatives++;
  }

  return positives && negatives ? wins / (positives * negatives) : NaN;
};
