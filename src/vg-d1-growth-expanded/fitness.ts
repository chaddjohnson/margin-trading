// Neighbourhood statistics, feasibility and the search objectives (PROTOCOL.md §7, §8). The statistics are Priority
// 3's (src/vg-d1-growth-joint/fitness.ts nbStats: robust = ½ median + ½ p10 of the neighbours' net; p90 DD with linear
// interpolation between order statistics), reused unchanged.
//
// Feasibility (normalized violation, 0 iff feasible): centre net > 0; centre maximum minute DD ≤ $35,000; the rung's
// neighbourhood p90 DD ≤ $35,000; and the structure the island asks for:
//   'mixed' — both families receive capital at the centre (standard §2.7; every combined lane);
//   'all'   — a B configuration funding D1 and BOTH Growth books (the protected both-Growth stratum, standard §4.7).
// Centre-first fidelity: a proposal whose centre is not plausible (net ≤ 0, DD > $35,000 or a family unfunded) is not
// given neighbours; its neighbourhood term is the unmeasured penalty 1, so it ranks behind every measured proposal with
// p90 < $70,000 and is never feasible.
import { type BookId, bookIds } from '../vg-d1-growth-joint/books.ts';
import type { Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Nb, bandedOrder, nbStats, profitOrder, quantile } from '../vg-d1-growth-joint/fitness.ts';
import { economics } from './context.ts';
import { type Inc, enabledOf } from './config.ts';

export type { Nb };
export { bandedOrder, nbStats, profitOrder, quantile };

export type Need = 'mixed' | 'all';

export const growthBooks = (inc: Inc): BookId[] => enabledOf(inc).filter((b) => b.startsWith('G:'));
export const bothGrowthFunded = (r: Rec) => r.books['G:GDX'].lots > 0 && r.books['G:VGT'].lots > 0;

export const plausible = (r: Rec) => !r.error && r.net > 0 && r.dd <= economics.ceiling && r.mixed;

// 'mixed': both families funded. 'all' (the protected both-Growth stratum): a B configuration whose centre funds D1 and
// BOTH Growth books; a V or G configuration is never feasible under 'all'.
export const violationOf = (centre: Rec, nb: Nb | null, need: Need, inc: Inc) => {
  const c = economics.ceiling;
  const structure = () => {
    if (centre.error) return 1;

    const d1 = centre.fam.D1.lots > 0 ? 0 : 0.5;

    if (need === 'mixed') return d1 + (centre.fam.G.lots > 0 ? 0 : 0.5);
    if (inc !== 'B') return d1 + 0.5 + (centre.fam.G.lots > 0 ? 0 : 0.25);
    return d1 + 0.25 * growthBooks(inc).filter((b) => centre.books[b].lots === 0).length;
  };
  const parts: Record<string, number> = {
    net: centre.error ? 1 : Math.max(0, -centre.net) / economics.budget + (centre.net > 0 ? 0 : 0.01),
    dd: centre.error ? 1 : Math.max(0, centre.dd - c) / c,
    p90: nb && Number.isFinite(nb.p90Dd) ? Math.max(0, nb.p90Dd - c) / c : 1,
    structure: structure()
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);

  return { violation: Math.round(total * 1e6) / 1e6, parts };
};

export interface Fit {
  id: string;
  rung: string;
  centre: Rec;
  nb: Nb | null; // null: centre-first gating gave it no neighbours
  violation: number; // under the lane's 'mixed' need
  violationAll: number; // under the protected stratum's 'all' need
  parts: Record<string, number>;
  // minimized: [−centre net, −robust net, neighbourhood p90 DD]
  objectives: [number, number, number];
}

export const fitOf = (rung: string, id: string, inc: Inc, centre: Rec, nb: Nb | null): Fit => {
  const v = violationOf(centre, nb, 'mixed', inc);
  const va = violationOf(centre, nb, 'all', inc);

  return {
    id,
    rung,
    centre,
    nb,
    violation: v.violation,
    violationAll: va.violation,
    parts: v.parts,
    objectives: [
      -centre.net,
      nb && Number.isFinite(nb.robust) ? -nb.robust : economics.budget,
      nb && Number.isFinite(nb.p90Dd) ? nb.p90Dd : 1e9
    ]
  };
};

export const robustOf = (f: Fit) => f.nb?.robust ?? -Infinity;
export const p90Of = (f: Fit) => f.nb?.p90Dd ?? Infinity;

// The components a record funded (for the trigger key and participation).
export const fundedOf = (r: Rec) => bookIds.filter((b) => r.books[b].lots > 0);
