// The selection rules (PROTOCOL.md §10), frozen before any search, and the stage-2 refinement plan (§7.3). Every rule
// reads ONLY a cutoff's training evidence (qualify.ts Evidence: the centre and its detailed replay on the cutoff's door,
// the selection family, the gates); none reads a confirmation family for ranking, a later slice, or the validation.
//
// THE SELECTORS ARE ASSIGNMENT 2'S CODE, IMPORTED UNCHANGED (src/vg-l0-risk-families/select.ts; stage V V8 re-derives
// Assignment 2's sealed C19–C24 primaries with it from its sealed evidence):
//   original — NL0 1.0.0 §3.5: the actual-profit role among the Q1–Q6 qualified members (highest centre net; ties:
//              higher selection robust net, lower centre DD, label);
//   RA1      — the experimental risk-aware rule (AD5): screens S1 open-lot multiple ≤ 1.50, S2 open-lot share of the
//              training net ≤ 25%, S3 worst per-lot MAE ≥ −$17,500, S4 selection worst-10% mean DD ≤ $35,000; then fewest
//              failed screens → within that group the 5% band of the best CONSERVATIVE training net → the lowest training
//              occupancy → ties (conservative net, selection robust, centre DD, label). Thresholds unchanged;
//   RA2      — the secondary ablation: the highest conservative training net (ties as RA1).
// Both main selectors see identical populations and identical evidence; neither launches a search.
import {
  failedScreens,
  originalOrder,
  ra1Order,
  ra1Thresholds,
  ra2Order,
  screensOf
} from '../vg-l0-risk-families/select.ts';
import type { Evidence as A2Evidence } from '../vg-l0-risk-families/qualify.ts';
import { symbols } from './context.ts';
import { type Evidence, actualProfitOrder } from './qualify.ts';
import { type Cell, cellOf, families, legacyCellId, protectedFamily } from './space.ts';

export { ra1Thresholds };

// the selectors read only fields both studies' evidence share (label, qualified, centre, select, selectTail, risk)
const asA2 = (ev: readonly Evidence[]) => ev as unknown as readonly A2Evidence[];
const back = (ev: readonly A2Evidence[]) => ev as unknown as Evidence[];

export type SelectorName = 'original' | 'RA1' | 'RA2';
export const selectorNames: SelectorName[] = ['original', 'RA1', 'RA2'];
export const selectors: Record<SelectorName, (ev: readonly Evidence[]) => Evidence[]> = {
  original: (ev) => back(originalOrder(asA2(ev))),
  RA1: (ev) => back(ra1Order(asA2(ev))),
  RA2: (ev) => back(ra2Order(asA2(ev)))
};
export const screensOfEvidence = (e: Evidence) => screensOf(e as unknown as A2Evidence);
export const failedScreensOf = (e: Evidence) => failedScreens(e as unknown as A2Evidence);

// The populations (PROTOCOL.md §10.1). Track I at every cutoff: L the legacy cell GA0.VA0, B the members without an
// entry-day book (RC 1 mechanics), F every member of the 64 cells. Track N at C24: N the informed members and the four
// incumbents (the qualifying-incumbent rule, standard §3.2); U = F ∪ N (NL0's final selectable set: independent and
// informed shortlists and the incumbents).
export type PopulationName = 'L' | 'B' | 'F' | 'N' | 'U';
export const trackIPopulations: PopulationName[] = ['L', 'B', 'F'];
export const c24Populations: PopulationName[] = ['L', 'B', 'F', 'N', 'U'];
const isI = (e: Evidence) => e.track === 'I';
const isN = (e: Evidence) => e.track === 'N';
export const populations: Record<PopulationName, (e: Evidence) => boolean> = {
  L: (e) => isI(e) && e.cell === legacyCellId,
  B: (e) => isI(e) && e.base,
  F: (e) => isI(e),
  N: (e) => isN(e),
  U: (e) => isI(e) || isN(e)
};
export const populationLabel: Record<PopulationName, string> = {
  L: 'Track I, the legacy cell GA0.VA0 (independent)',
  B: 'Track I, no entry-day book (RC 1 mechanics; independent)',
  F: 'Track I, all 64 cells (independent)',
  N: 'Track N, informed lanes and the four incumbents (incumbent-informed; no independent chronological test)',
  U: 'Track I ∪ Track N ∪ incumbents (NL0’s final selectable set; incumbent-informed; no independent chronological test)'
};
export const independentPopulation = (p: PopulationName) => p === 'L' || p === 'B' || p === 'F';

export const selectionSummary = (e: Evidence) => ({
  label: e.label,
  id: e.id,
  track: e.track,
  cell: e.cell,
  activation: e.activation,
  growthStratum: e.growthStratum,
  stage: e.stage,
  centreNet: e.centre.net,
  centreDd: e.centre.dd,
  conservativeNet: e.risk.conservativeNet,
  occupancy: e.risk.occupancy,
  selectRobust: e.select.robust,
  selectP90Dd: e.select.p90Dd,
  screens: screensOfEvidence(e),
  failedScreens: failedScreensOf(e)
});

// ----- the stage-2 refinement plan (PROTOCOL.md §7.3), from the cutoff's BROAD evidence only -----

export interface RefinePlan {
  cells: { cell: string; why: string[]; seeds: string[]; focus: string[] }[];
  eligible: number;
  skipped: { cell: string; why: string }[];
}

export const refineQuota = 16; // + the legacy cell

const byLabel = (a: Evidence, b: Evidence) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

export const refineCells = (broad: readonly Evidence[]): RefinePlan => {
  const qualified = broad.filter((e) => e.qualified);
  const byCell = new Map<string, Evidence[]>();

  for (const e of qualified) byCell.set(e.cell, [...(byCell.get(e.cell) ?? []), e]);

  const eligible = [...byCell.keys()].sort();
  const bestOf = (cell: string, score: (e: Evidence) => number) => Math.max(...byCell.get(cell)!.map(score));
  const chosen = new Map<string, string[]>();
  const add = (cell: string | undefined, why: string, quota = true) => {
    if (!cell) return;
    if (chosen.has(cell)) chosen.get(cell)!.push(why);
    else if (!quota || [...chosen.keys()].filter((c) => c !== legacyCellId).length < refineQuota) chosen.set(cell, [why]);
  };
  const ranked = (score: (e: Evidence) => number, filter: (c: string) => boolean = () => true) =>
    eligible.filter(filter).sort((a, b) => bestOf(b, score) - bestOf(a, score) || (a < b ? -1 : 1));
  const take = (list: string[], n: number, why: string) => {
    let k = 0;

    for (const c of list) {
      if (k >= n) break;
      if (chosen.has(c)) continue;
      add(c, why);
      k++;
    }
  };
  const legacyBroad = broad.filter((e) => e.cell === legacyCellId);

  if (legacyBroad.length) add(legacyCellId, 'the legacy reference cell (always refined: the L baseline)', false);

  const topRobust = Math.max(-Infinity, ...qualified.map((e) => e.select.robust));

  take(ranked((e) => e.centre.net), 4, 'profit: best qualified centre net');
  take(ranked((e) => e.select.robust), 4, 'robust: best qualified selection robust net');
  take(
    ranked(
      (e) => (e.select.robust >= 0.5 * topRobust ? -e.select.p90Dd : -Infinity),
      (c) => byCell.get(c)!.some((e) => e.select.robust >= 0.5 * topRobust)
    ),
    2,
    'lower drawdown: lowest selection p90 DD with robust ≥ 50% of the best'
  );
  {
    const order = selectors.RA1(qualified);
    const cells = [...new Set(order.map((e) => e.cell))];

    take(cells, 2, 'risk-aware: best under RA1');
  }

  // coverage (structural and Growth-family safeguards): every family on every book, the gate both ways, asymmetric
  // books, and among the chosen cells' qualified members both Growth entry methods and both Growth gate states
  const covered = (pred: (cell: Cell) => boolean) => [...chosen.keys()].some((c) => pred(cellOf(c)));
  const coverWith = (pred: (cell: Cell) => boolean, why: string) => {
    if (covered(pred)) return;
    take(
      ranked(
        (e) => e.centre.net,
        (c) => pred(cellOf(c))
      ),
      1,
      why
    );
  };
  const memberCovered = (pred: (e: Evidence) => boolean) => [...chosen.keys()].some((c) => (byCell.get(c) ?? []).some(pred));
  const coverMembers = (pred: (e: Evidence) => boolean, why: string) => {
    if (memberCovered(pred)) return;
    take(
      ranked(
        (e) => (pred(e) ? e.centre.net : -Infinity),
        (c) => byCell.get(c)!.some(pred)
      ),
      1,
      why
    );
  };

  for (const s of symbols) for (const f of families) coverWith((c) => c[s].family === f, `coverage: D1·${s} family ${f}`);
  coverWith((c) => c.GDX.gate || c.VGT.gate, 'coverage: a decline gate ON');
  coverWith((c) => !c.GDX.gate && !c.VGT.gate, 'coverage: no decline gate');
  coverWith((c) => c.GDX.family !== c.VGT.family || c.GDX.gate !== c.VGT.gate, 'coverage: asymmetric books');
  coverWith((c) => protectedFamily(c.GDX.family) || protectedFamily(c.VGT.family), 'coverage: a protective stop');
  coverMembers((e) => e.growthEntry === 'rise', 'coverage: Growth·VGT Rise entry');
  coverMembers((e) => e.growthEntry === 'breakout', 'coverage: Growth·VGT breakout entry');
  coverMembers((e) => e.cfg.g.drawdownRecoveryGateEnabled === true, 'coverage: Growth·VGT recovery gate ON');
  coverMembers((e) => e.cfg.g.drawdownRecoveryGateEnabled !== true, 'coverage: Growth·VGT recovery gate OFF');

  const cells = [...chosen.entries()].map(([cell, why]) => {
    const own = byCell.get(cell) ?? [];
    const seeds = (own.length ? own : legacyBroad).map((e) => e.label);
    const order = own.length ? actualProfitOrder(own) : [...legacyBroad].sort((a, b) => b.centre.net - a.centre.net || byLabel(a, b));
    const robust = own.length ? [...own].sort((a, b) => b.select.robust - a.select.robust || byLabel(a, b))[0] : undefined;
    const focus = [...new Set([order[0]?.label, robust?.label].filter((x): x is string => Boolean(x)))];

    return { cell, why, seeds, focus };
  });

  return {
    cells,
    eligible: eligible.length,
    skipped: legacyBroad.length ? [] : [{ cell: legacyCellId, why: 'no shortlisted broad member: nothing to seed' }]
  };
};
