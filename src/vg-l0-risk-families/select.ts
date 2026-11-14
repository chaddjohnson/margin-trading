// The selection rules (PROTOCOL.md §10), frozen before any search, and the refinement-cell rule (§7.3). Every rule reads
// ONLY a cutoff's training evidence (qualify.ts Evidence: the centre and its detailed replay on the cutoff's door, the
// selection family, the gates); none reads a confirmation family for ranking, a later slice, or the validation.
//
// ORIGINAL (NL0 1.0.0 §3.5, unchanged): the actual-profit role among the Q1–Q6 qualified members — the highest centre
// net; ties: higher selection robust net, lower centre DD, label.
//
// RA1, THE PRIMARY RISK-AWARE RULE (a study-specific, user-authorized use of §5.9-type inputs; PROTOCOL.md AD5):
//   universe: the same qualified members as the original rule;
//   four screens on the training evidence at the cutoff close:
//     S1 exposure       the largest open lot's market value ≤ 1.50 × its original principal (no open lot: pass);
//     S2 open profit    the open lot's mark ≤ 25% of the training net (unrealized ÷ net; no open lot or a negative mark:
//                       pass);
//     S3 adverse lot    the worst per-lot adverse excursion over the funded lots ≥ −$17,500 (½ × the ceiling);
//     S4 tail           the selection family's worst-10% mean DD ≤ $35,000 (the ceiling);
//   order: (1) fewest failed screens; (2) within that group, the members whose CONSERVATIVE TRAINING NET (realized + the
//   open lot's mark only when negative, i.e. open gains are not credited) is within 5% of the group's best (NL0's 5%
//   band) → the lowest training occupancy (sessions with a funded lot at the close ÷ sessions); (3) ties: higher
//   conservative net, higher selection robust net, lower centre DD, label. A member passing every screen always ranks
//   ahead of one that fails any; with no qualified member there is no primary.
// RA2, a SECONDARY ablation (reported, never a verdict of RA1): the highest conservative training net among the
//   qualified (ties as RA1 step 3) — it isolates the valuation part of RA1 from its screens and occupancy band.
import { economics } from './context.ts';
import { type Evidence, actualProfitOrder } from './qualify.ts';
import { symbols } from './context.ts';
import { type Cell, cellOf, families, legacyCellId } from './space.ts';

export const ra1Thresholds = {
  exposureMultiple: 1.5,
  openShare: 0.25,
  worstLotMae: -economics.ceiling / 2,
  worst10MeanDd: economics.ceiling,
  band: 0.05
} as const;

export interface Screens {
  S1: boolean;
  S2: boolean;
  S3: boolean;
  S4: boolean;
  values: { multiple: number | null; openShare: number | null; worstMae: number; worst10Mean: number };
}

export const screensOf = (e: Evidence): Screens => {
  const t = ra1Thresholds;
  const multiple = e.risk.openLot?.multiple ?? null;
  const share = e.risk.openLot ? e.risk.openShare : null;

  return {
    S1: multiple === null || multiple <= t.exposureMultiple,
    S2: share === null || share <= t.openShare,
    S3: e.risk.mae.worst >= t.worstLotMae,
    S4: e.selectTail.worst10Mean <= t.worst10MeanDd,
    values: { multiple, openShare: share, worstMae: e.risk.mae.worst, worst10Mean: e.selectTail.worst10Mean }
  };
};

export const failedScreens = (e: Evidence) => {
  const s = screensOf(e);

  return (['S1', 'S2', 'S3', 'S4'] as const).filter((k) => !s[k]);
};

const byLabel = (a: Evidence, b: Evidence) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
const tieRA = (a: Evidence, b: Evidence) =>
  b.risk.conservativeNet - a.risk.conservativeNet || b.select.robust - a.select.robust || a.centre.dd - b.centre.dd || byLabel(a, b);

// RA1's complete order of the qualified members (the first is the primary).
export const ra1Order = (ev: readonly Evidence[]): Evidence[] => {
  const left = ev.filter((e) => e.qualified);
  const out: Evidence[] = [];

  while (left.length) {
    const fewest = Math.min(...left.map((e) => failedScreens(e).length));
    const group = left.filter((e) => failedScreens(e).length === fewest);
    const best = Math.max(...group.map((e) => e.risk.conservativeNet));
    const floor = best >= 0 ? best * (1 - ra1Thresholds.band) : best * (1 + ra1Thresholds.band);
    const band = group.filter((e) => e.risk.conservativeNet >= floor - 1e-9);

    band.sort((a, b) => a.risk.occupancy - b.risk.occupancy || tieRA(a, b));

    const pick = band[0]!;

    out.push(pick);
    left.splice(left.indexOf(pick), 1);
  }

  return out;
};

export const ra2Order = (ev: readonly Evidence[]) => ev.filter((e) => e.qualified).sort(tieRA);
export const originalOrder = (ev: readonly Evidence[]) => actualProfitOrder(ev.filter((e) => e.qualified));

export type SelectorName = 'original' | 'RA1' | 'RA2';
export const selectors: Record<SelectorName, (ev: readonly Evidence[]) => Evidence[]> = {
  original: originalOrder,
  RA1: ra1Order,
  RA2: ra2Order
};

// The populations of a cutoff (PROTOCOL.md §10.1): L the legacy cell, B the 64 base cells, F all 196 cells.
export type PopulationName = 'L' | 'B' | 'F';
export const populations: Record<PopulationName, (e: Evidence) => boolean> = {
  L: (e) => e.cell === legacyCellId,
  B: (e) => e.base,
  F: () => true
};

export const selectionSummary = (e: Evidence) => ({
  label: e.label,
  id: e.id,
  cell: e.cell,
  stage: e.stage,
  centreNet: e.centre.net,
  centreDd: e.centre.dd,
  conservativeNet: e.risk.conservativeNet,
  occupancy: e.risk.occupancy,
  selectRobust: e.select.robust,
  selectP90Dd: e.select.p90Dd,
  screens: screensOf(e),
  failedScreens: failedScreens(e)
});

// ----- the refinement-cell rule (PROTOCOL.md §7.3), from the cutoff's BROAD evidence only -----

export interface RefinePlan {
  cells: { cell: string; why: string[]; seeds: string[]; focus: string[] }[];
  eligible: number;
  skipped: { cell: string; why: string }[];
}

export const refineQuota = 16; // + the legacy cell

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

  if (legacyBroad.length) add(legacyCellId, 'the legacy reference cell (always refined: the 2 × 2 baseline)', false);

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
    const order = ra1Order(qualified);
    const cells = [...new Set(order.map((e) => e.cell))];

    take(cells, 2, 'risk-aware: best under RA1');
  }

  // coverage: every family on every book that has a qualified member, the gate both ways, both activations
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

  for (const s of symbols) for (const f of families) coverWith((c) => c[s].family === f, `coverage: D1·${s} family ${f}`);
  coverWith((c) => c.GDX.gate || c.VGT.gate, 'coverage: a decline gate ON');
  coverWith((c) => !c.GDX.gate && !c.VGT.gate, 'coverage: no decline gate');
  coverWith((c) => c.GDX.entryDay || c.VGT.entryDay, 'coverage: entry-day activation');
  coverWith((c) => (c.GDX.family !== 'A' && !c.GDX.entryDay) || (c.VGT.family !== 'A' && !c.VGT.entryDay), 'coverage: next-session protective stop');
  coverWith((c) => c.GDX.family !== c.VGT.family || c.GDX.gate !== c.VGT.gate || c.GDX.entryDay !== c.VGT.entryDay, 'coverage: asymmetric books');

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
