// Neighbourhood statistics, feasibility and the search objectives (PROTOCOL.md §7–§8; NL0 1.0.0 §3.3, §3.5). The
// statistics are Priority 3's (src/vg-d1-growth-joint/fitness.ts nbStats: robust = ½ median + ½ p10 of the neighbours'
// net; p90 DD with linear interpolation between order statistics), reused unchanged.
//
// Feasibility (normalized violation, 0 iff feasible): centre net > 0; centre maximum minute DD ≤ $35,000; the rung's
// neighbourhood p90 DD ≤ $35,000; both families receive capital at the centre (a D1 book and Growth·VGT: NL0's 'mixed'
// need, New L0's structure). Centre-first fidelity: a proposal whose centre is not plausible gets no neighbours; its
// neighbourhood term is the unmeasured penalty 1.
import { bookIds } from '../vg-d1-growth-joint/books.ts';
import type { Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { type Nb, bandedOrder, nbStats, profitOrder, quantile } from '../vg-d1-growth-joint/fitness.ts';
import { economics } from './context.ts';
import type { SRec } from './evaluate.ts';

export type { Nb };
export { bandedOrder, nbStats, profitOrder, quantile };

export const familiesFunded = (r: Rec) => r.mixed;
export const plausible = (r: Rec) => !r.error && r.net > 0 && r.dd <= economics.ceiling && familiesFunded(r);

export const violationOf = (centre: Rec, nb: Nb | null) => {
  const c = economics.ceiling;
  const parts: Record<string, number> = {
    net: centre.error ? 1 : Math.max(0, -centre.net) / economics.budget + (centre.net > 0 ? 0 : 0.01),
    dd: centre.error ? 1 : Math.max(0, centre.dd - c) / c,
    p90: nb && Number.isFinite(nb.p90Dd) ? Math.max(0, nb.p90Dd - c) / c : 1,
    structure: centre.error ? 1 : (centre.fam.D1.lots > 0 ? 0 : 0.5) + (centre.fam.G.lots > 0 ? 0 : 0.5)
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);

  return { violation: Math.round(total * 1e6) / 1e6, parts };
};

export interface Fit {
  id: string;
  rung: string;
  centre: SRec;
  nb: Nb | null; // null: centre-first gating gave it no neighbours
  violation: number;
  parts: Record<string, number>;
  // minimized: [−centre net, −robust net, neighbourhood p90 DD]
  objectives: [number, number, number];
}

export const fitOf = (rung: string, id: string, centre: SRec, nb: Nb | null): Fit => {
  const v = violationOf(centre, nb);

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

// The components a record funded (the extension trigger's "new feasible behaviour" key).
export const fundedOf = (r: Rec) => bookIds.filter((b) => r.books[b].lots > 0);
