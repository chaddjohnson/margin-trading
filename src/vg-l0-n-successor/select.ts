// The selection rules (PROTOCOL.md §10), frozen before any search, and the stage-2 refinement plan (§7.2). Every rule
// reads ONLY a cutoff's training evidence (qualify.ts Evidence: the centre and its detailed replay on the cutoff's door,
// the selection family, the gates); none reads a confirmation family for ranking, a later slice or the validation.
//
// ONE selector: NL0 1.0.0 §3.5's original rule — the actual-profit role among the Q1–Q6 qualified members (highest
// centre net; ties: higher selection robust net, lower centre DD, label) — Assignment 2's code, imported unchanged
// (src/vg-l0-risk-families/select.ts originalOrder via Assignment 3's select.ts). Assignment 3's experimental RA1/RA2
// selectors are NOT used: they read §5.9 quantities as ranking inputs, which needed Assignment 3's user-agreed departure
// AD5; this brief grants none (adaptation AD6).
//
// Populations: F (Track F, all 64 cells: THE independent procedure), L (Track F's legacy cell GA0.VA0) and B (Track F
// without an entry-day book) — report-only secondary procedures, never nominating; at C24 N (Track N's members and the two
// incumbents N/original and New L0: the qualifying-incumbent rule, standard §3.2) and U = F ∪ N (NL0's final selectable
// set). NL0's roles per population (Assignment 2's rolesOf, unchanged).
import { selectors as a3Selectors } from '../vg-l0-full-joint/select.ts';
import { actualProfitOrder, rolesOf as a3RolesOf } from '../vg-l0-full-joint/qualify.ts';
import type { Evidence as A3Evidence } from '../vg-l0-full-joint/qualify.ts';
import { symbols } from '../vg-l0-full-joint/context.ts';
import { type Cell, cellOf, families, legacyCellId, protectedFamily } from '../vg-l0-full-joint/space.ts';
import type { Evidence } from './qualify.ts';

const asA3 = (ev: readonly Evidence[]) => ev as unknown as readonly A3Evidence[];
const back = (ev: readonly A3Evidence[]) => ev as unknown as Evidence[];

export const originalOrder = (ev: readonly Evidence[]): Evidence[] => back(a3Selectors.original(asA3(ev)));
export const rolesOf = (set: string, ev: readonly Evidence[]) => a3RolesOf(set, asA3(ev));

export type PopulationName = 'F' | 'L' | 'B' | 'N' | 'U';
export const foldPopulations: PopulationName[] = ['F', 'L', 'B'];
export const finalPopulations: PopulationName[] = ['F', 'L', 'B', 'N', 'U'];
const isF = (e: Evidence) => e.track === 'F';
const isN = (e: Evidence) => e.track === 'N';
export const populations: Record<PopulationName, (e: Evidence) => boolean> = {
  F: (e) => isF(e),
  L: (e) => isF(e) && e.cell === legacyCellId,
  B: (e) => isF(e) && e.base,
  N: (e) => isN(e),
  U: (e) => isF(e) || isN(e)
};
export const populationLabel: Record<PopulationName, string> = {
  F: 'Track F, all 64 cells (independent; THE procedure)',
  L: 'Track F, the legacy cell GA0.VA0 (independent; report-only secondary procedure, never nominates)',
  B: 'Track F, no entry-day book (RC 1 mechanics; independent; report-only secondary procedure, never nominates)',
  N: 'Track N, N/original-informed lanes and the incumbents N/original and New L0 (incumbent-informed; no independent chronological test)',
  U: 'Track F ∪ Track N ∪ incumbents (NL0’s final selectable set; incumbent-informed; no independent chronological test)'
};
export const independentPopulation = (p: PopulationName) => p === 'F' || p === 'L' || p === 'B';
export const nominatingPopulations: PopulationName[] = ['F', 'N', 'U'];

export const selectionSummary = (e: Evidence) => ({
  label: e.label,
  id: e.id,
  track: e.track,
  stage: e.stage,
  cell: e.cell,
  activation: e.activation,
  growthStratum: e.growthStratum,
  qualified: e.qualified,
  failed: e.failed,
  centreNet: e.centre.net,
  centreDd: e.centre.dd,
  selectRobust: e.select.robust,
  selectP90Dd: e.select.p90Dd,
  confirmP10: e.confirm.p10,
  confirmP90Dd: e.confirm.p90Dd,
  signature: e.centre.signature
});

// ----- the stage-2 refinement plan (PROTOCOL.md §7.2), from the cutoff's BROAD evidence only -----

export interface RefinePlan {
  cells: { cell: string; why: string[]; seeds: string[]; focus: string[] }[];
  eligible: number;
  skipped: { cell: string; why: string }[];
}

export const refineQuota = 16; // + the legacy cell

const byLabel = (a: Evidence, b: Evidence) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
const balancedOf = (e: Evidence) => e.select.robust / Math.max(1, e.select.p90Dd);

// Assignment 3's refineCells (src/vg-l0-full-joint/select.ts) with ONE change (adaptation AD6): its step (5) "the 2 best
// cells under RA1" is replaced by "the 2 best cells by NL0's balanced statistic (selection robust ÷ selection p90 DD)".
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
  take(ranked(balancedOf), 2, 'balanced: best qualified selection robust ÷ selection p90 DD (replaces Assignment 3’s RA1 slot)');

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
    const order = own.length ? (actualProfitOrder(own as never) as unknown as Evidence[]) : [...legacyBroad].sort((a, b) => b.centre.net - a.centre.net || byLabel(a, b));
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
