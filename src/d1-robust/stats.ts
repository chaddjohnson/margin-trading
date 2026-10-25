// Neighbourhood statistics and their Monte Carlo uncertainty (PROTOCOL.md §4.3–§4.4, §6.2–§6.3): type-7 quantiles,
// the neighbourhood summary, the risk-aware score S and the unpenalized J0, percentile-bootstrap intervals of a
// statistic, the paired bootstrap of a difference on identical CRN draw indices, Spearman correlation, and the pilot's
// calibration of the risk references. Pure functions; the bootstrap is seeded.
import { Rng } from '../optimizer/rng.ts';
import { bandOf, study } from './context.ts';

// Type-7 (linear interpolation between order statistics) quantile of an ascending array.
export const quantileSorted = (sorted: ArrayLike<number>, p: number) => {
  const n = sorted.length;

  if (n === 0) {
    return NaN;
  }

  const h = (n - 1) * p;
  const lower = Math.floor(h);
  const upper = Math.min(n - 1, lower + 1);

  return sorted[lower]! + (h - lower) * (sorted[upper]! - sorted[lower]!);
};

export const ascending = (values: ArrayLike<number>) => Float64Array.from(values).sort();

export const quantile = (values: ArrayLike<number>, p: number) => quantileSorted(ascending(values), p);

export const median = (values: ArrayLike<number>) => quantile(values, 0.5);

export interface NeighbourRecord {
  net: number;
  drawdown: number; // minute-sampled maximum drawdown
  lots: number;
  top2Share: number; // the two largest lots' net ÷ total net (NaN when net ≤ 0)
  moved: number;
  markAt?: number[]; // strategy marks at requested session indices
}

export interface NeighbourhoodStats {
  n: number;
  base: number;
  p50: number;
  q25: number;
  p10: number;
  q75: number;
  mad: number;
  shareAbove: number;
  shareTied: number; // neighbours whose net equals the base exactly (a perturbation that changed no funded trade)
  ddMedian: number;
  dd90: number;
  feasShare: number;
  moved: number;
  lotsMedian: number;
  top2ShareMedian: number;
  retention: number; // P50 ÷ base, only when base ≥ $50,000 (descriptive)
}

export const summarize = (base: number, records: readonly NeighbourRecord[]): NeighbourhoodStats => {
  const nets = ascending(records.map((record) => record.net));
  const dds = ascending(records.map((record) => record.drawdown));
  const p50 = quantileSorted(nets, 0.5);
  const deviations = ascending(records.map((record) => Math.abs(record.net - p50)));
  const finiteShares = records.map((record) => record.top2Share).filter(Number.isFinite);

  return {
    n: records.length,
    base,
    p50,
    q25: quantileSorted(nets, 0.25),
    p10: quantileSorted(nets, 0.1),
    q75: quantileSorted(nets, 0.75),
    mad: quantileSorted(deviations, 0.5),
    shareAbove: records.filter((record) => record.net > base).length / Math.max(1, records.length),
    shareTied: records.filter((record) => record.net === base).length / Math.max(1, records.length),
    ddMedian: quantileSorted(dds, 0.5),
    dd90: quantileSorted(dds, 0.9),
    feasShare:
      records.filter((record) => record.drawdown <= study.drawdownCeiling).length / Math.max(1, records.length),
    moved: records.reduce((total, record) => total + record.moved, 0) / Math.max(1, records.length),
    lotsMedian: median(records.map((record) => record.lots)),
    top2ShareMedian: finiteShares.length > 0 ? median(finiteShares) : NaN,
    retention: base >= 50000 ? p50 / base : NaN
  };
};

// ----- the risk references and the score -----

export interface RiskReference {
  stratum: number;
  median: number; // R_m
  tail: number; // R_t
  flagMedian: 'floor' | 'calibrated' | 'extreme' | 'uncalibrated';
  flagTail: 'floor' | 'calibrated' | 'extreme' | 'uncalibrated';
  controls: number; // eligible controls used (after pooling)
  pooledStrata: number[];
  q75Median: number;
  q75Tail: number;
}

export type RiskReferences = Record<number, RiskReference>;

// The floors only (before the pilot, and for an uncalibrated stratum).
export const floorReferences = (): RiskReferences =>
  Object.fromEntries(
    study.strata.map((stratum) => [
      stratum,
      {
        stratum,
        median: study.riskPenalty.floorMedian,
        tail: study.riskPenalty.floorTail,
        flagMedian: 'uncalibrated',
        flagTail: 'uncalibrated',
        controls: 0,
        pooledStrata: [],
        q75Median: NaN,
        q75Tail: NaN
      }
    ])
  );

export interface ScoreParts {
  s: number; // the risk-aware score
  j0: number; // P50 − λk
  penaltyMedian: number;
  penaltyTail: number;
  referenceMedian: number;
  referenceTail: number;
}

export const scoreOf = (
  stats: Pick<NeighbourhoodStats, 'p50' | 'ddMedian' | 'dd90'>,
  books: number,
  references: RiskReferences
): ScoreParts => {
  const reference = references[bandOf(books)]!;
  const { alphaMedian, alphaTail } = study.riskPenalty;
  const penaltyMedian = alphaMedian * Math.max(0, stats.ddMedian - reference.median);
  const penaltyTail = alphaTail * Math.max(0, stats.dd90 - reference.tail);
  const j0 = stats.p50 - study.complexityPenalty * books;

  return {
    s: j0 - penaltyMedian - penaltyTail,
    j0,
    penaltyMedian,
    penaltyTail,
    referenceMedian: reference.median,
    referenceTail: reference.tail
  };
};

// §6.3: the references from the eligible pilot controls of one window. `controls` carries each control's stratum and
// N1-A1 DDmed/DD90; eligibility (centre DD ≤ $35k, ≥ 4 funded lots) is applied by the caller.
export const calibrateReferences = (controls: readonly { stratum: number; ddMedian: number; dd90: number }[]) => {
  const { floorMedian, floorTail, capMedian, capTail, quantile: q, minimumControls } = study.riskPenalty;
  const strata = [...study.strata];
  const references: RiskReferences = {};
  const flag = (value: number, floor: number, cap: number) =>
    !(value > floor) ? 'floor' : value > cap ? 'extreme' : 'calibrated';

  for (const [position, stratum] of strata.entries()) {
    // Strata ordered by distance in the list, nearest first, the lower one first on ties.
    const order = strata
      .map((other, index) => ({ other, distance: Math.abs(index - position), index }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index)
      .map((item) => item.other);
    const pooled: number[] = [];
    let members: { ddMedian: number; dd90: number }[] = [];

    for (const other of order) {
      if (members.length >= minimumControls) {
        break;
      }

      pooled.push(other);
      members = controls.filter((control) => pooled.includes(control.stratum));
    }

    if (members.length < minimumControls) {
      references[stratum] = { ...floorReferences()[stratum]!, controls: members.length, pooledStrata: pooled };
      continue;
    }

    const q75Median = quantile(
      members.map((member) => member.ddMedian),
      q
    );
    const q75Tail = quantile(
      members.map((member) => member.dd90),
      q
    );

    references[stratum] = {
      stratum,
      median: Math.min(capMedian, Math.max(floorMedian, q75Median)),
      tail: Math.min(capTail, Math.max(floorTail, q75Tail)),
      flagMedian: flag(q75Median, floorMedian, capMedian),
      flagTail: flag(q75Tail, floorTail, capTail),
      controls: members.length,
      pooledStrata: pooled,
      q75Median,
      q75Tail
    };
  }

  return references;
};

// §7.5 (2): the discovery sample size from the subsampled standard error of P50 (finite-population corrected).
export const subsampledSe = (nets: readonly number[], n: number, rng: Rng, subsamples: number) => {
  const pool = [...nets];
  const values = new Float64Array(subsamples);
  const draw = new Float64Array(n);

  for (let s = 0; s < subsamples; s++) {
    // a partial Fisher–Yates shuffle of the first n positions
    for (let i = 0; i < n; i++) {
      const j = i + rng.int(pool.length - i);

      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
      draw[i] = pool[i]!;
    }

    values[s] = quantileSorted(draw.slice().sort(), 0.5);
  }

  const mean = values.reduce((total, value) => total + value, 0) / subsamples;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / (subsamples - 1);
  const fpc = Math.sqrt((pool.length - n) / (pool.length - 1));

  return Math.sqrt(variance) / fpc;
};

export const chooseDiscoveryDraws = (
  medianSeByN: Record<number, number>,
  candidates: readonly number[],
  target: number
) => {
  for (const n of candidates) {
    if (medianSeByN[n]! <= target) {
      return n;
    }
  }

  return candidates.at(-1)!;
};

// ----- rank correlation -----

const ranks = (values: readonly number[]) => {
  const order = values.map((value, index) => ({ value, index })).sort((x, y) => x.value - y.value);
  const result = new Array<number>(values.length);
  let i = 0;

  while (i < order.length) {
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

export const spearman = (x: readonly number[], y: readonly number[]) => {
  if (x.length !== y.length || x.length < 2) {
    return NaN;
  }

  const rx = ranks(x);
  const ry = ranks(y);
  const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;

  for (let i = 0; i < rx.length; i++) {
    num += (rx[i]! - mx) * (ry[i]! - my);
    dx += (rx[i]! - mx) ** 2;
    dy += (ry[i]! - my) ** 2;
  }

  return dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : NaN;
};

// ----- bootstrap -----

export interface Interval {
  estimate: number;
  lower: number;
  upper: number;
  se: number;
}

const percentileInterval = (estimate: number, values: Float64Array, level: number): Interval => {
  values.sort();

  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / Math.max(1, values.length - 1);

  return {
    estimate,
    lower: quantileSorted(values, (1 - level) / 2),
    upper: quantileSorted(values, 1 - (1 - level) / 2),
    se: Math.sqrt(variance)
  };
};

export const bootstrapInterval = (
  values: readonly number[],
  statistic: (sample: Float64Array) => number,
  rng: Rng,
  resamples: number = study.bootstrapResamples,
  level: number = study.intervalLevel
): Interval => {
  const n = values.length;
  const sample = new Float64Array(n);
  const estimates = new Float64Array(resamples);

  for (let r = 0; r < resamples; r++) {
    for (let i = 0; i < n; i++) {
      sample[i] = values[rng.int(n)]!;
    }

    estimates[r] = statistic(sample);
  }

  return percentileInterval(statistic(Float64Array.from(values)), estimates, level);
};

export const medianOf = (sample: Float64Array) => quantileSorted(sample.slice().sort(), 0.5);
export const q25Of = (sample: Float64Array) => quantileSorted(sample.slice().sort(), 0.25);

export interface PairedInterval extends Interval {
  n: number;
  spearman: number;
  unpairedSe: number;
  varianceReduction: number; // unpaired ÷ paired bootstrap variance
  medianOfDifferences: number;
}

// The paired bootstrap of statistic(a) − statistic(b): draw indices resampled jointly (identical CRN indices).
export const pairedBootstrap = (
  a: readonly number[],
  b: readonly number[],
  statistic: (sample: Float64Array) => number,
  rng: Rng,
  resamples: number = study.bootstrapResamples,
  level: number = study.intervalLevel
): PairedInterval => {
  if (a.length !== b.length || a.length === 0) {
    throw new Error(`A paired bootstrap needs equal, nonempty draw sets (${a.length} vs ${b.length})`);
  }

  const n = a.length;
  const sa = new Float64Array(n);
  const sb = new Float64Array(n);
  const paired = new Float64Array(resamples);
  const unpaired = new Float64Array(resamples);

  for (let r = 0; r < resamples; r++) {
    for (let i = 0; i < n; i++) {
      const index = rng.int(n);

      sa[i] = a[index]!;
      sb[i] = b[index]!;
    }

    paired[r] = statistic(sa) - statistic(sb);

    // an independent resample of b, for the unpaired variance
    for (let i = 0; i < n; i++) {
      sb[i] = b[rng.int(n)]!;
    }

    unpaired[r] = statistic(sa) - statistic(sb);
  }

  const estimate = statistic(Float64Array.from(a)) - statistic(Float64Array.from(b));
  const interval = percentileInterval(estimate, paired, level);
  const unpairedInterval = percentileInterval(estimate, unpaired, level);

  return {
    ...interval,
    n,
    spearman: spearman(a, b),
    unpairedSe: unpairedInterval.se,
    varianceReduction: interval.se > 0 ? (unpairedInterval.se / interval.se) ** 2 : Infinity,
    medianOfDifferences: median(a.map((value, index) => value - b[index]!))
  };
};

export const seededRng = (...labels: (string | number)[]) => Rng.from(study.seedLabel, ...labels);
