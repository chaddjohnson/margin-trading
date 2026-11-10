// Neighbourhood statistics, feasibility and the search objectives (PROTOCOL.md §7, §8). The statistics are Priority 3's
// (src/vg-d1-growth-joint/fitness.ts nbStats: robust = ½ median + ½ p10 of the neighbours' net; p90 DD with linear
// interpolation between order statistics), reused unchanged.
//
// Feasibility (normalized violation, 0 iff feasible): centre net > 0; centre maximum minute DD ≤ $35,000; the rung's
// neighbourhood p90 DD ≤ $35,000; and the GDX book receives capital at the centre (a book that never trades is cash).
// Centre-first fidelity: a proposal whose centre is not plausible (net ≤ 0, DD > $35,000 or no GDX lot) is not given
// neighbours; its neighbourhood term is the unmeasured penalty 1 and it is never feasible. (The anchor terms of 3C's
// code are inert here: the standalone arm has no anchor books.)
import type { Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Nb, bandedOrder, nbStats, profitOrder, quantile } from '../vg-d1-growth-joint/fitness.ts';
import { economics } from './context.ts';
import type { Anchor } from './space.ts';

export type { Nb };
export { bandedOrder, nbStats, profitOrder, quantile };

export const hasD1 = (a: Pick<Anchor, 'books'>) => a.books.some((b) => b.startsWith('D1:'));

// the anchors' families funded at the centre (the standard's §2.7 for a combined arm; Growth for the Growth-only arm)
export const anchorsFunded = (a: Pick<Anchor, 'books'>, r: Rec) =>
  !r.error && (hasD1(a) ? r.fam.D1.lots > 0 : true) && r.books['G:VGT'].lots + r.books['G:GDX'].lots > 0;
export const gdxFunded = (r: Rec) => !r.error && r.books['G:GDX'].lots > 0;

export const plausible = (a: Pick<Anchor, 'books'>, r: Rec) =>
  !r.error && r.net > 0 && r.dd <= economics.ceiling && anchorsFunded(a, r) && gdxFunded(r);

export const violationOf = (a: Pick<Anchor, 'books'>, centre: Rec, nb: Nb | null) => {
  const c = economics.ceiling;
  const parts: Record<string, number> = {
    net: centre.error ? 1 : Math.max(0, -centre.net) / economics.budget + (centre.net > 0 ? 0 : 0.01),
    dd: centre.error ? 1 : Math.max(0, centre.dd - c) / c,
    p90: nb && Number.isFinite(nb.p90Dd) ? Math.max(0, nb.p90Dd - c) / c : 1,
    structure: centre.error ? 1 : (anchorsFunded(a, centre) ? 0 : 0.5) + (gdxFunded(centre) ? 0 : 0.5)
  };
  const total = Object.values(parts).reduce((x, y) => x + y, 0);

  return { violation: Math.round(total * 1e6) / 1e6, parts };
};

export interface Fit {
  id: string;
  rung: string;
  centre: Rec;
  nb: Nb | null; // null: centre-first gating gave it no neighbours
  violation: number;
  parts: Record<string, number>;
  // minimized: [−centre net, −robust net, neighbourhood p90 DD] (whole-portfolio scope)
  objectives: [number, number, number];
}

export const fitOf = (a: Pick<Anchor, 'books'>, rung: string, id: string, centre: Rec, nb: Nb | null): Fit => {
  const v = violationOf(a, centre, nb);

  return {
    id,
    rung,
    centre,
    nb,
    violation: v.violation,
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
