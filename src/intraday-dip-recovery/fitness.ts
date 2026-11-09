// Neighbourhood statistics, feasibility, search objectives, the frozen primary rule, the roles and the qualified Pareto
// set (PROTOCOL.md §8–§9, §12). Quantiles interpolate linearly between order statistics (the standard's §0.3
// convention, `quantile` of src/vgt-d1-growth-joint/fitness.ts, imported unchanged).
import { quantile } from '../vgt-d1-growth-joint/fitness.ts';
import { execution } from './context.ts';
import type { Rec } from './evaluate.ts';

export { quantile };

const ceiling = execution.ceiling;

export interface Nb {
  n: number;
  median: number;
  p10: number;
  p90Net: number;
  robust: number; // ½ median + ½ p10 of the neighbours' net
  medianDd: number;
  p90Dd: number;
  p95Dd: number;
  worstDd: number;
  worst10MeanDd: number; // the mean of the ⌈0.1 n⌉ largest drawdowns
  breaches: number;
  breachShare: number;
  breachLo: number; // Wilson 95% interval of the breach share
  breachHi: number;
  meanExcess: number; // mean (DD − ceiling) over the breaching neighbours
  worstExcess: number;
  profitable: number; // share of neighbours with net > 0
  distinct: number; // distinct funded-lot ledgers
  breachLedgers: number; // distinct ledgers behind the breaches
  sameAsCentre: number;
  clipped: number; // coordinates clipped in total
  duplicates: number; // draws dropped as equal to the centre or an earlier draw
}

export const wilson = (k: number, n: number, z = 1.96) => {
  if (n === 0) return { lo: NaN, hi: NaN };

  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));

  return { lo: (c - m) / d, hi: (c + m) / d };
};

export const nbStats = (centre: Rec, neighbours: readonly Rec[], clipped = 0, duplicates = 0): Nb => {
  const nets = neighbours.map((r) => r.net).sort((a, b) => a - b);
  const dds = neighbours.map((r) => r.dd).sort((a, b) => a - b);
  const n = neighbours.length;
  const breaching = neighbours.filter((r) => r.dd > ceiling);
  const k = Math.ceil(0.1 * n);
  const tail = dds.slice(n - k);
  const w = wilson(breaching.length, n);
  const median = quantile(nets, 0.5);
  const p10 = quantile(nets, 0.1);

  return {
    n,
    median,
    p10,
    p90Net: quantile(nets, 0.9),
    robust: 0.5 * median + 0.5 * p10,
    medianDd: quantile(dds, 0.5),
    p90Dd: quantile(dds, 0.9),
    p95Dd: quantile(dds, 0.95),
    worstDd: n ? dds[n - 1]! : NaN,
    worst10MeanDd: k ? tail.reduce((t, v) => t + v, 0) / k : NaN,
    breaches: breaching.length,
    breachShare: n ? breaching.length / n : NaN,
    breachLo: w.lo,
    breachHi: w.hi,
    meanExcess: breaching.length ? breaching.reduce((t, r) => t + r.dd - ceiling, 0) / breaching.length : 0,
    worstExcess: breaching.length ? Math.max(...breaching.map((r) => r.dd - ceiling)) : 0,
    profitable: n ? neighbours.filter((r) => r.net > 0).length / n : NaN,
    distinct: new Set(neighbours.map((r) => r.sig)).size,
    breachLedgers: new Set(breaching.map((r) => r.sig)).size,
    sameAsCentre: neighbours.filter((r) => r.sig === centre.sig).length,
    clipped,
    duplicates
  };
};

// Feasibility (search and shortlist): centre net > 0, centre DD ≤ ceiling, neighbourhood p90 DD ≤ ceiling. The
// normalized violation is 0 iff feasible. No activity, profit-rate, concentration or breach-rate floor.
export const violationOf = (centre: Rec, nb: Nb | null) => {
  const parts = {
    net: centre.net > 0 ? 0 : 1e-6 + -centre.net / 100_000,
    dd: centre.dd <= ceiling ? 0 : (centre.dd - ceiling) / ceiling,
    p90: !nb || nb.p90Dd <= ceiling ? 0 : (nb.p90Dd - ceiling) / ceiling
  };

  return { violation: parts.net + parts.dd + parts.p90, parts };
};

// The search objectives (minimized): −centre net, centre DD, −robust net, neighbourhood p90 DD.
export const objectivesOf = (centre: Rec, nb: Nb) => [-centre.net, centre.dd, -nb.robust, nb.p90Dd];

// The frozen primary rule's order (actual profit): the higher centre net, then the lower centre DD, then the
// canonical candidate ID.
export const profitOrder = <T extends { id: string; net: number; dd: number }>(a: T, b: T) =>
  b.net - a.net || a.dd - b.dd || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export interface RoleInput {
  id: string;
  net: number; // centre
  dd: number; // centre
  robust: number; // selection
  p90: number; // selection
  p10: number; // selection
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Roles among QUALIFIED members, ranked on the selection families (PROTOCOL.md §12.2).
export const rolesOf = (members: readonly RoleInput[]) => {
  if (members.length === 0)
    return { actualProfit: null, robustProfit: null, balanced: null, lowerDrawdown: null, lowerDrawdownNote: 'no qualified member' };

  const actual = [...members].sort(profitOrder)[0]!;
  const robust = [...members].sort((a, b) => b.robust - a.robust || a.p90 - b.p90 || byId(a, b))[0]!;
  const ratio = (m: RoleInput) => m.robust / Math.max(m.p90, 1);
  const balanced = [...members].sort((a, b) => ratio(b) - ratio(a) || a.p90 - b.p90 || byId(a, b))[0]!;
  let lower: RoleInput | null = null;
  let note = '';

  if (actual.robust > 0) {
    const eligible = members.filter((m) => m.robust >= 0.5 * actual.robust);

    lower = [...eligible].sort((a, b) => a.p90 - b.p90 || b.robust - a.robust || byId(a, b))[0] ?? null;
  } else note = `vacant: the actual-profit holder's selection robust net ($${actual.robust.toFixed(2)}) is not positive`;

  return { actualProfit: actual.id, robustProfit: robust.id, balanced: balanced.id, lowerDrawdown: lower?.id ?? null, lowerDrawdownNote: note };
};

// The qualified four-objective Pareto set: max centre net, min centre DD, max selection p10 net, min selection p90 DD.
export const paretoOf = <T extends RoleInput>(members: readonly T[]) =>
  members.filter(
    (a) =>
      !members.some(
        (b) =>
          b !== a &&
          b.net >= a.net &&
          b.dd <= a.dd &&
          b.p10 >= a.p10 &&
          b.p90 <= a.p90 &&
          (b.net > a.net || b.dd < a.dd || b.p10 > a.p10 || b.p90 < a.p90)
      )
  );
