// Neighbourhood statistics, feasibility and the search objectives (PROTOCOL.md §8, §10). The statistics are Priority
// 2's instrument (src/vgt-d1-growth-joint/fitness.ts) on this study's record; the objectives add the actual-profit
// objective to Priority 2's robust pair (standard §2.2, §2.4: net profit stays central; promotion keeps a profit share).
import { economics, r2 } from './context.ts';
import type { Rec } from './evaluate.ts';

export interface Nb {
  n: number; // neighbours evaluated (unique, excluding the centre)
  failed: number;
  median: number;
  p10: number;
  p90Net: number;
  mean: number;
  robust: number; // ½ median + ½ p10 of the neighbours' net
  medianDd: number;
  p90Dd: number;
  worstDd: number;
  breaches: number; // neighbours with a drawdown above the ceiling
  breachShare: number;
  meanExcess: number; // mean excess of the breaching neighbours over the ceiling
  mixedShare: number; // neighbours whose pool funded both families
  allFourShare: number; // neighbours whose pool funded all four components
  distinct: number; // distinct funded-lot ledgers among the neighbours
  sameAsCentre: number; // neighbours with the centre's ledger
  clipped: number; // neighbours with at least one clipped coordinate
}

export const quantile = (sorted: readonly number[], q: number) => {
  if (sorted.length === 0) return NaN;

  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);

  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
};

export const nbStats = (centre: Rec, neighbours: readonly (Rec | null)[], clipped: readonly number[] = []): Nb => {
  const ok = neighbours.filter((r): r is Rec => Boolean(r && !r.error));
  // a failed evaluation counts as a loss of the whole budget with a drawdown above any ceiling (infeasible)
  const failed = neighbours.length - ok.length;
  const nets = [...ok.map((r) => r.net), ...Array.from({ length: failed }, () => -economics.budget)].sort(
    (a, b) => a - b
  );
  const dds = [...ok.map((r) => r.dd), ...Array.from({ length: failed }, () => Infinity)].sort((a, b) => a - b);
  const breaching = dds.filter((d) => d > economics.ceiling);
  const median = quantile(nets, 0.5);
  const p10 = quantile(nets, 0.1);
  const share = (k: number) => (ok.length ? Math.round((k / ok.length) * 1e4) / 1e4 : 0);

  return {
    n: neighbours.length,
    failed,
    median: r2(median),
    p10: r2(p10),
    p90Net: r2(quantile(nets, 0.9)),
    mean: r2(nets.reduce((a, b) => a + b, 0) / Math.max(1, nets.length)),
    robust: r2(0.5 * median + 0.5 * p10),
    medianDd: r2(quantile(dds, 0.5)),
    p90Dd: r2(quantile(dds, 0.9)),
    worstDd: r2(dds.at(-1) ?? NaN),
    breaches: breaching.length,
    breachShare: dds.length ? Math.round((breaching.length / dds.length) * 1e4) / 1e4 : 0,
    meanExcess: breaching.length
      ? r2(
          breaching.reduce((a, d) => a + (Number.isFinite(d) ? d - economics.ceiling : economics.budget), 0) /
            breaching.length
        )
      : 0,
    mixedShare: share(ok.filter((r) => r.mixed).length),
    allFourShare: share(ok.filter((r) => r.funded.length === 4).length),
    distinct: new Set(ok.map((r) => r.signature)).size,
    sameAsCentre: ok.filter((r) => r.signature === centre.signature).length,
    clipped: clipped.filter((c) => c > 0).length
  };
};

// 'mixed': a combined (four-component) lane — both families must receive capital at the centre (standard §2.7);
// 'G': the Growth-pair lane — Growth receives capital.
export type Need = 'mixed' | 'G';

export const structureOk = (r: Rec, need: Need) => (need === 'mixed' ? r.mixed : r.fam.G.lots > 0);

// The search's feasibility (PROTOCOL.md §11.2): centre net > 0; centre maximum minute drawdown ≤ $35,000; rung
// neighbourhood p90 drawdown ≤ $35,000; the structure the lane asks for. Normalized violation, 0 iff feasible.
export const violationOf = (centre: Rec, nb: Nb, need: Need) => {
  const c = economics.ceiling;
  const parts: Record<string, number> = {
    net: centre.error ? 1 : Math.max(0, -centre.net) / economics.budget + (centre.net > 0 ? 0 : 0.01),
    dd: centre.error ? 1 : Math.max(0, centre.dd - c) / c,
    p90: Number.isFinite(nb.p90Dd) ? Math.max(0, nb.p90Dd - c) / c : 1,
    structure:
      need === 'mixed'
        ? (centre.fam.D1.lots > 0 ? 0 : 0.5) + (centre.fam.G.lots > 0 ? 0 : 0.5)
        : centre.fam.G.lots > 0
          ? 0
          : 1
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);

  return { violation: Math.round(total * 1e6) / 1e6, parts };
};

export interface Fit {
  id: string;
  rung: string;
  centre: Rec;
  nb: Nb;
  violation: number;
  parts: Record<string, number>;
  // minimized: [−centre net, −robust net, neighbourhood p90 drawdown]
  objectives: [number, number, number];
}

export const fitOf = (rung: string, centre: Rec, nb: Nb, need: Need): Fit => {
  const v = violationOf(centre, nb, need);

  return {
    id: centre.id,
    rung,
    centre,
    nb,
    violation: v.violation,
    parts: v.parts,
    objectives: [-centre.net, -nb.robust, Number.isFinite(nb.p90Dd) ? nb.p90Dd : 1e9]
  };
};

// Priority 2's drawdown-preferring banded order (used for the robust refinement start and as a report): repeatedly,
// among the remaining members whose robust net is within 5% of the best remaining, the lowest p90 drawdown.
export const bandedOrder = <T extends { id: string; robust: number; p90: number }>(
  items: readonly T[],
  band = 0.05
) => {
  const left = [...items];
  const out: T[] = [];

  while (left.length) {
    const best = Math.max(...left.map((x) => x.robust));
    const floor = best >= 0 ? best * (1 - band) : best * (1 + band);
    const pool = left.filter((x) => x.robust >= floor - 1e-9);

    pool.sort((a, b) => a.p90 - b.p90 || b.robust - a.robust || (a.id < b.id ? -1 : 1));
    out.push(pool[0]!);
    left.splice(left.indexOf(pool[0]!), 1);
  }

  return out;
};

// The actual-profit order (the primary rule, PROTOCOL.md §12.3): centre net descending; ties by the higher selection
// robust net, then the lower centre drawdown, then the label.
export const profitOrder = <T extends { label: string; net: number; robust: number; dd: number }>(
  items: readonly T[]
) =>
  [...items].sort(
    (a, b) =>
      b.net - a.net || b.robust - a.robust || a.dd - b.dd || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0)
  );
