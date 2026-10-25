// The probability of backtest overfitting by combinatorially symmetric cross-validation (PROTOCOL.md §12; descriptive
// only, never a gate): the configurations × quarterly-attribution matrix is cut into S contiguous blocks; for every
// choice of S/2 blocks as in-sample, the in-sample best configuration's relative rank out of sample is recorded;
// PBO is the share of splits in which that rank falls below the median.
export const blocksOf = (periods: number, s: number) => {
  const blocks: number[][] = [];
  const count = Math.min(s, periods);

  for (let b = 0; b < count; b++) {
    const start = Math.floor((b * periods) / count);
    const end = Math.floor(((b + 1) * periods) / count);

    blocks.push(Array.from({ length: end - start }, (_, i) => start + i));
  }

  return blocks;
};

const combinations = (n: number, k: number): number[][] => {
  const out: number[][] = [];
  const pick: number[] = [];
  const walk = (start: number) => {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }

    for (let i = start; i <= n - (k - pick.length); i++) {
      pick.push(i);
      walk(i + 1);
      pick.pop();
    }
  };

  walk(0);

  return out;
};

export const pboOf = (matrix: readonly (readonly number[])[], s: number) => {
  const configs = matrix.length;

  if (configs < 2) {
    return { pbo: NaN, splits: 0, configs, medianLogit: NaN };
  }

  const periods = matrix[0]!.length;
  const blocks = blocksOf(periods, s);
  const blockSums = matrix.map((row) => blocks.map((block) => block.reduce((total, t) => total + row[t]!, 0)));
  const splits = combinations(blocks.length, blocks.length / 2 >= 1 ? Math.floor(blocks.length / 2) : 1);
  const logits: number[] = [];
  let below = 0;

  for (const inSample of splits) {
    const isSet = new Set(inSample);
    let best = 0;
    let bestValue = -Infinity;
    const oos = new Float64Array(configs);

    for (let c = 0; c < configs; c++) {
      let is = 0;
      let out = 0;

      blockSums[c]!.forEach((value, b) => {
        if (isSet.has(b)) {
          is += value;
        } else {
          out += value;
        }
      });

      oos[c] = out;

      if (is > bestValue) {
        bestValue = is;
        best = c;
      }
    }

    let rank = 1;

    for (let c = 0; c < configs; c++) {
      if (oos[c]! < oos[best]!) {
        rank++;
      }
    }

    const omega = rank / (configs + 1);

    logits.push(Math.log(omega / (1 - omega)));

    if (omega < 0.5) {
      below++;
    }
  }

  const sorted = [...logits].sort((a, b) => a - b);

  return { pbo: below / splits.length, splits: splits.length, configs, medianLogit: sorted[sorted.length >> 1]! };
};
