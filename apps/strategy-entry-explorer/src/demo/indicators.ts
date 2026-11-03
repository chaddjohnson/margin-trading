// Small indicator helpers for the demo rules. Index-aligned with the closes; undefined until enough history exists.

export type Series = (number | undefined)[];

export function sma(values: readonly number[], n: number): Series {
  const out: Series = new Array(values.length).fill(undefined);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] as number;
    if (i >= n) sum -= values[i - n] as number;
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

/** Index of the lowest (or highest) value in the window [i - n + 1, i]; the earliest index on ties. */
export function argExtreme(values: readonly number[], i: number, n: number, kind: 'min' | 'max'): number | undefined {
  if (i - n + 1 < 0) return undefined;
  let best = i - n + 1;
  for (let k = best + 1; k <= i; k++) {
    const v = values[k] as number;
    const b = values[best] as number;
    if (kind === 'min' ? v < b : v > b) best = k;
  }
  return best;
}

/** Wilder's RSI over closes. */
export function rsi(closes: readonly number[], n: number): Series {
  const out: Series = new Array(closes.length).fill(undefined);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const ch = (closes[i] as number) - (closes[i - 1] as number);
    const g = Math.max(ch, 0);
    const l = Math.max(-ch, 0);
    if (i <= n) {
      gain += g / n;
      loss += l / n;
    } else {
      gain = (gain * (n - 1) + g) / n;
      loss = (loss * (n - 1) + l) / n;
    }
    if (i >= n) out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

/** Population standard deviation of daily log returns over the last n sessions. */
export function realizedVol(closes: readonly number[], n: number): Series {
  const out: Series = new Array(closes.length).fill(undefined);
  for (let i = n; i < closes.length; i++) {
    let s = 0;
    let s2 = 0;
    for (let k = i - n + 1; k <= i; k++) {
      const r = Math.log((closes[k] as number) / (closes[k - 1] as number));
      s += r;
      s2 += r * r;
    }
    const mean = s / n;
    out[i] = Math.sqrt(Math.max(s2 / n - mean * mean, 0));
  }
  return out;
}

/** Population standard deviation of the closes over the last n sessions. */
export function rollingStd(values: readonly number[], n: number): Series {
  const out: Series = new Array(values.length).fill(undefined);
  for (let i = n - 1; i < values.length; i++) {
    let s = 0;
    let s2 = 0;
    for (let k = i - n + 1; k <= i; k++) {
      s += values[k] as number;
      s2 += (values[k] as number) ** 2;
    }
    const mean = s / n;
    out[i] = Math.sqrt(Math.max(s2 / n - mean * mean, 0));
  }
  return out;
}
