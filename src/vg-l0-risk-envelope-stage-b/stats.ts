// The precommitted statistics of PROTOCOL.md §1 and §9 — pure functions, frozen with the protocol (tests/stats.test.ts).
//   pairs        per (cutoff, cell, replicate): D = V(EXP30 lane) − V(CTRL lane) (V = $0 without a qualified member)
//   mean         the plain mean of the cutoff's D values (32 with the full design)
//   bootstrap    B = 100,000 resamples, STRATIFIED by cell (each resample draws each cell's replicates with replacement,
//                independently), the mean of the resampled values; the bound is the q-quantile of the B means with the
//                repository's linear interpolation (src/vg-d1-growth-joint/fitness.ts quantile) — percentile method;
//                random numbers Rng.from('vg-l0-risk-envelope-stage-b', 'bootstrap', <statistic>, <cutoff>)
//   NI           L90 > −$5,000;   superiority  mean > +$2,500 and L90 > 0   (each at C21 AND C24 for the label)
// Report-only sensitivities: the unstratified paired bootstrap, the one-sided 90 % t bound, per-cell means, sign counts,
// and the statistics without the pairs that contain a V = $0 lane.
import { Rng } from '../optimizer/rng.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { STUDY, margins } from './context.ts';

export interface Pair {
  cutoff: string;
  cell: string;
  replicate: number;
  ctrl: number;
  exp: number;
  d: number;
  zeroLane: boolean; // either lane has V = $0 (no qualified member)
}

export const pairsOf = (
  cutoff: string,
  ctrl: readonly { cell: string; replicate: number; value: number; qualified: number }[],
  exp: readonly { cell: string; replicate: number; value: number; qualified: number }[]
): Pair[] => {
  const key = (x: { cell: string; replicate: number }) => `${x.cell}/R${x.replicate}`;
  const e = new Map(exp.map((x) => [key(x), x]));

  if (ctrl.length !== exp.length || ctrl.some((c) => !e.has(key(c)))) throw new Error(`${cutoff}: the two arms' lanes are not paired`);
  return ctrl
    .map((c) => {
      const x = e.get(key(c))!;

      return { cutoff, cell: c.cell, replicate: c.replicate, ctrl: c.value, exp: x.value, d: x.value - c.value, zeroLane: c.qualified === 0 || x.qualified === 0 };
    })
    .sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : a.replicate - b.replicate));
};

export const mean = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;

// the B bootstrap means, sorted (groups: one array per stratum, in a fixed order)
export const bootstrapMeans = (groups: readonly (readonly number[])[], b: number, labels: readonly (string | number)[]) => {
  const rng = Rng.from(STUDY, 'bootstrap', ...labels);
  const n = groups.reduce((a, g) => a + g.length, 0);
  const out = new Float64Array(b);

  for (let i = 0; i < b; i++) {
    let s = 0;

    for (const g of groups) for (let j = 0; j < g.length; j++) s += g[rng.int(g.length)]!;
    out[i] = s / n;
  }
  out.sort();
  return out;
};

const byCell = (ps: readonly Pair[], f: (p: Pair) => number) => {
  const cells = [...new Set(ps.map((p) => p.cell))].sort();

  return cells.map((c) => ps.filter((p) => p.cell === c).map(f));
};

// one-sided t quantile (Cornish-Fisher, report-only)
const tQuantile = (p: number, nu: number) => {
  // z from Acklam's rational approximation is overkill here; the 0.9 / 0.1 quantiles are the only ones used
  const z = p === 0.9 ? 1.2815515655446004 : p === 0.1 ? -1.2815515655446004 : NaN;

  return z + (z ** 3 + z) / (4 * nu) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * nu ** 2) + (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * nu ** 3);
};

export interface Summary {
  n: number;
  mean: number;
  bound: number; // the precommitted one-sided bound (lower: q = 0.1; upper: q = 0.9)
  q: number;
  ci80: [number, number]; // the 0.1 and 0.9 quantiles of the stratified bootstrap means
  perCell: Record<string, { n: number; mean: number }>;
  signs: { positive: number; zero: number; negative: number };
  sensitivity: {
    unstratifiedBound: number;
    tBound: number;
    withoutZeroLanePairs: { n: number; mean: number | null; bound: number | null };
  };
}

export const summarize = (ps: readonly Pair[], f: (p: Pair) => number, q: number, labels: readonly (string | number)[], b = margins.bootstrap): Summary => {
  const xs = ps.map(f);
  const groups = byCell(ps, f);
  const means = bootstrapMeans(groups, b, labels);
  const flat = bootstrapMeans([xs], b, [...labels, 'unstratified']);
  const m = mean(xs);
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
  const keep = ps.filter((p) => !p.zeroLane);
  const keepGroups = byCell(keep, f);
  const perCell: Summary['perCell'] = {};

  for (const c of [...new Set(ps.map((p) => p.cell))].sort()) {
    const ys = ps.filter((p) => p.cell === c).map(f);

    perCell[c] = { n: ys.length, mean: mean(ys) };
  }
  return {
    n: xs.length,
    mean: m,
    bound: quantile(Array.from(means), q),
    q,
    ci80: [quantile(Array.from(means), 0.1), quantile(Array.from(means), 0.9)],
    perCell,
    signs: { positive: xs.filter((x) => x > 0).length, zero: xs.filter((x) => x === 0).length, negative: xs.filter((x) => x < 0).length },
    sensitivity: {
      unstratifiedBound: quantile(Array.from(flat), q),
      tBound: m + tQuantile(q, xs.length - 1) * (sd / Math.sqrt(xs.length)),
      withoutZeroLanePairs: {
        n: keep.length,
        mean: keep.length ? mean(keep.map(f)) : null,
        bound: keep.length ? quantile(Array.from(bootstrapMeans(keepGroups, b, [...labels, 'without-zero'])), q) : null
      }
    }
  };
};

// the primary statistic of one cutoff
export const primaryOf = (cutoff: string, ps: readonly Pair[]) => {
  const s = summarize(ps, (p) => p.d, margins.lowerQuantile, ['D', cutoff]);

  return {
    cutoff,
    ...s,
    l90: s.bound,
    zeroLanes: { pairs: ps.filter((p) => p.zeroLane).length, ctrl: ps.filter((p) => p.ctrl === 0).length, exp: ps.filter((p) => p.exp === 0).length },
    nonInferior: s.bound > margins.nonInferiority,
    superior: s.mean > margins.superiority && s.bound > 0
  };
};

export type Primary = ReturnType<typeof primaryOf>;

// the precommitted outcome label (PROTOCOL.md §1); null = the cutoff was not computed
export const outcomeLabel = (r: { C21: Primary | null; C24: Primary | null }) => {
  if (!r.C21 || !r.C24) return { label: 'incomplete', detail: `primary cutoff(s) not computed: ${[!r.C21 && 'C21', !r.C24 && 'C24'].filter(Boolean).join(', ')}` };

  const ni = r.C21.nonInferior && r.C24.nonInferior;
  const sup = r.C21.superior && r.C24.superior;

  if (!ni)
    return {
      label: 'P3 non-inferiority not shown',
      detail: `L90 ≤ −$5,000 at ${[!r.C21.nonInferior && 'C21', !r.C24.nonInferior && 'C24'].filter(Boolean).join(' and ')}`
    };
  return sup ? { label: 'P3 non-inferior and superior', detail: 'non-inferiority and superiority at C21 and C24' } : { label: 'P3 non-inferior (superiority not shown)', detail: `superiority at C21 ${r.C21.superior}, C24 ${r.C24.superior}` };
};

// the pooled-shortlist statistic (the pilot's Δ with its $2,500 margin)
export const pooledLabel = (delta: number | null) =>
  delta === null ? 'undefined (an arm has no qualified member)' : delta > margins.pooled ? 'better' : delta < -margins.pooled ? 'worse' : 'equivalent';

// T2: the paired interval DD (EXP30 − CTRL); upper one-sided 90 % bound < +$5,000 → non-inferior
export const intervalDdOf = (cutoff: string, ps: readonly Pair[]) => {
  const s = summarize(ps, (p) => p.d, 0.9, ['interval DD', cutoff]);

  return { cutoff, ...s, u90: s.bound, nonInferior: s.bound < margins.intervalDd };
};
export const intervalNetOf = (cutoff: string, ps: readonly Pair[]) => ({ cutoff, ...summarize(ps, (p) => p.d, 0.1, ['interval net', cutoff]) });
