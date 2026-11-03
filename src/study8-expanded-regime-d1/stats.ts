// Neighbourhood summaries (PROTOCOL.md §5.4): type-7 quantiles, shares below the ceiling, binomial standard errors,
// per-period medians, and the robust-economics quantities every rung, gate and report uses.
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { eligibility } from './context.ts';
import type { PointRecord } from './evaluate.ts';

export { quantile };

export const median = (values: readonly number[]) => quantile(values, 0.5);

export const num = (value: number | null | undefined) => (typeof value === 'number' ? value : NaN);

export interface Summary {
  n: number;
  share: number; // share of points with minute DD < $35,000 (strict)
  shareSe: number;
  breaches: number;
  medianNet: number;
  p10Net: number;
  p90Net: number;
  meanNet: number;
  medianDd: number;
  p90Dd: number;
  worstDd: number;
  profitable: number; // share with net > 0
  medianLots: number;
  medianEpisodes: number;
  medianPerCapitalYear: number;
  periods: Record<string, { median: number; p10: number }>;
}

export const summarize = (records: readonly PointRecord[], periodKeys: readonly string[] = []): Summary => {
  const nets = records.map((r) => r.net);
  const dds = records.map((r) => r.dd);
  const n = records.length;
  const below = dds.filter((dd) => dd < eligibility.ceiling).length;
  const share = n ? below / n : NaN;
  const periods: Summary['periods'] = {};

  for (const key of periodKeys) {
    const values = records.map((r) => r.periods[key]).filter((v): v is number => typeof v === 'number');

    periods[key] = { median: quantile(values, 0.5), p10: quantile(values, 0.1) };
  }

  return {
    n,
    share,
    shareSe: n ? Math.sqrt((share * (1 - share)) / n) : NaN,
    breaches: n - below,
    medianNet: quantile(nets, 0.5),
    p10Net: quantile(nets, 0.1),
    p90Net: quantile(nets, 0.9),
    meanNet: n ? nets.reduce((a, b) => a + b, 0) / n : NaN,
    medianDd: quantile(dds, 0.5),
    p90Dd: quantile(dds, 0.9),
    worstDd: n ? Math.max(...dds) : NaN,
    profitable: n ? nets.filter((v) => v > 0).length / n : NaN,
    medianLots: quantile(
      records.map((r) => r.lots),
      0.5
    ),
    medianEpisodes: quantile(
      records.map((r) => r.episodes),
      0.5
    ),
    medianPerCapitalYear: quantile(
      records.map((r) => r.perCapitalYear),
      0.5
    ),
    periods
  };
};

// The robust profit (½ median + ½ p10 of neighbourhood net) — a reporting and role quantity, never a sole objective.
export const robustProfit = (s: Pick<Summary, 'medianNet' | 'p10Net'>) => 0.5 * s.medianNet + 0.5 * s.p10Net;

// Spearman rank correlation (average ranks for ties).
export const spearman = (a: readonly number[], b: readonly number[]) => {
  const rank = (values: readonly number[]) => {
    const order = values.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]);
    const ranks = new Array<number>(values.length);
    let i = 0;

    while (i < order.length) {
      let j = i;

      while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;

      for (let k = i; k <= j; k++) ranks[order[k]![1]] = (i + j) / 2;

      i = j + 1;
    }

    return ranks;
  };
  const ra = rank(a);
  const rb = rank(b);
  const mean = (v: number[]) => v.reduce((x, y) => x + y, 0) / v.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let num_ = 0;
  let da = 0;
  let db = 0;

  for (let k = 0; k < ra.length; k++) {
    num_ += (ra[k]! - ma) * (rb[k]! - mb);
    da += (ra[k]! - ma) ** 2;
    db += (rb[k]! - mb) ** 2;
  }

  return num_ / Math.sqrt(da * db);
};
