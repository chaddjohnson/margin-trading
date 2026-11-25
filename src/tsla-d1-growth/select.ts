// The selection rules (PROTOCOL.md §10), frozen before any search, the stage-2 refinement plan (§7.3) and the finalists
// carried to arms S and C (§7.5, §7.4). Every rule reads ONLY a cutoff's training evidence (qualify.ts Evidence: the
// centre and its detailed replay on the cutoff's door, the selection family, the gates); none reads a confirmation family
// for ranking, a later slice or the validation.
//
// THE selector (the reference): NL0 1.0.0 §3.5's original rule — the actual-profit role among the Q1–Q6 qualified members
// (highest centre net; ties: higher selection robust net, lower centre DD, label) — Assignment 2's code, imported
// unchanged (src/vg-l0-risk-families/select.ts via src/vg-l0-full-joint/select.ts), as P0 / Priority 5.
// RA1 (brief §4.8): Assignment 3's experimental risk-aware rule, its thresholds unchanged (screens S1 open-lot multiple
// ≤ 1.50, S2 open-lot share of training net ≤ 25 %, S3 worst per-lot MAE ≥ −$17,500, S4 selection worst-10 % mean DD ≤
// $35,000; then fewest failed screens → the 5 % band of the best conservative training net → the lowest occupancy → ties)
// on the IDENTICAL populations: a separately labelled, report-only experimental selector. It never selects a primary,
// a finalist, a slice subject's role, a frozen D1 or a pair, and is never promoted.
import { selectors as a3Selectors } from '../vg-l0-full-joint/select.ts';
import { actualProfitOrder, rolesOf as a3RolesOf } from '../vg-l0-full-joint/qualify.ts';
import type { Evidence as A3Evidence } from '../vg-l0-full-joint/qualify.ts';
import { screensOf, failedScreens } from '../vg-l0-risk-families/select.ts';
import type { Evidence as A2Evidence } from '../vg-l0-risk-families/qualify.ts';
import type { ArmKey } from './context.ts';
import type { Evidence } from './qualify.ts';
import { cellOf, families, protectedFamily } from './space.ts';
import { maxFrozenD1, maxPairSide, refineQuota } from './budget.ts';

const asA3 = (ev: readonly Evidence[]) => ev as unknown as readonly A3Evidence[];
const back = (ev: readonly A3Evidence[]) => ev as unknown as Evidence[];

export const originalOrder = (ev: readonly Evidence[]): Evidence[] => back(a3Selectors.original(asA3(ev)));
export const ra1Order = (ev: readonly Evidence[]): Evidence[] => back(a3Selectors.RA1(asA3(ev)));
export const rolesOf = (set: string, ev: readonly Evidence[]) => a3RolesOf(set, asA3(ev));
export const ra1Screens = (e: Evidence) => screensOf(e as unknown as A2Evidence);
export const ra1Failed = (e: Evidence) => failedScreens(e as unknown as A2Evidence);

// ----- populations: each arm's own members (the arm's procedure) and report-only sub-populations -----

export type PopulationName = ArmKey | 'G-P' | 'G-U' | 'J-P' | 'J-U' | 'S-P' | 'S-U' | 'D-A';
export const armPopulations: readonly ArmKey[] = ['D', 'G', 'C', 'J', 'S'];
export const subPopulations: readonly PopulationName[] = ['D-A', 'G-P', 'G-U', 'J-P', 'J-U', 'S-P', 'S-U'];
export const populations: Record<PopulationName, (e: Evidence) => boolean> = {
  D: (e) => e.arm === 'D' && e.stage !== 'control',
  G: (e) => e.arm === 'G' && e.stage !== 'control',
  C: (e) => e.arm === 'C' && e.stage !== 'control',
  J: (e) => e.arm === 'J' && e.stage !== 'control',
  S: (e) => e.arm === 'S' && e.stage !== 'control',
  'D-A': (e) => e.arm === 'D' && e.stage !== 'control' && e.d1Structure === 'A0',
  'G-P': (e) => e.arm === 'G' && e.stage !== 'control' && e.unrestrictedGrowth === false,
  'G-U': (e) => e.arm === 'G' && e.stage !== 'control' && e.unrestrictedGrowth === true,
  'J-P': (e) => e.arm === 'J' && e.stage !== 'control' && e.unrestrictedGrowth === false,
  'J-U': (e) => e.arm === 'J' && e.stage !== 'control' && e.unrestrictedGrowth === true,
  'S-P': (e) => e.arm === 'S' && e.stage !== 'control' && e.unrestrictedGrowth === false,
  'S-U': (e) => e.arm === 'S' && e.stage !== 'control' && e.unrestrictedGrowth === true
};
export const populationLabel: Record<PopulationName, string> = {
  D: 'arm D — TSLA D1 standalone (THE D procedure)',
  G: 'arm G — TSLA Growth standalone (THE G procedure)',
  C: 'arm C — fixed pairs of the D and G finalists (no re-optimization; THE C procedure)',
  J: 'arm J — fully joint D1 + Growth (THE J procedure)',
  S: 'arm S — D1-first sequential (frozen D finalists + Growth searched in the shared slot; THE S procedure)',
  'D-A': 'arm D, legacy D1 family A without the decline gate (report-only secondary procedure; never nominates)',
  'G-P': 'arm G, protected Growth (a maximum hold or an initial stop; report-only secondary procedure; never nominates)',
  'G-U': 'arm G, unrestricted Growth (no maximum hold, no initial stop; report-only secondary procedure; never nominates)',
  'J-P': 'arm J, protected Growth (report-only secondary procedure; never nominates)',
  'J-U': 'arm J, unrestricted Growth (report-only secondary procedure; never nominates)',
  'S-P': 'arm S, protected Growth (report-only secondary procedure; never nominates)',
  'S-U': 'arm S, unrestricted Growth (report-only secondary procedure; never nominates)'
};

export const selectionSummary = (e: Evidence) => ({
  label: e.label,
  id: e.id,
  arm: e.arm,
  stage: e.stage,
  cell: e.cell,
  d1Structure: e.d1Structure,
  growthProtection: e.growthProtection,
  unrestrictedGrowth: e.unrestrictedGrowth,
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
  conservativeNet: e.risk.conservativeNet,
  occupancy: e.risk.occupancy,
  ra1Failed: ra1Failed(e),
  signature: e.centre.signature
});

// ----- finalists of an arm (frozen D1 for S; the pair sides of C): the primary, then the robust-profit and balanced
// role holders, distinct funded-lot ledgers, ≤ the cap -----

export const finalistsOfArm = (members: readonly Evidence[], cap: number) => {
  const q = members.filter((e) => e.qualified);
  const order = originalOrder(q);
  const roles = rolesOf('finalists', q).roles;
  const picks: { key: string; why: string; label: string }[] = [];
  const add = (label: string | null | undefined, why: string) => {
    if (!label || picks.length >= cap) return;

    const e = q.find((x) => x.label === label)!;

    if (picks.some((p) => p.label === label || q.find((x) => x.label === p.label)!.centre.signature === e.centre.signature)) return;
    picks.push({ key: `F${picks.length + 1}`, why, label });
  };

  add(order[0]?.qualified ? order[0].label : null, 'primary (actual-profit)');
  add(roles['robust-profit'], 'robust-profit role');
  add(roles.balanced, 'balanced role');
  return picks;
};
export const sequentialFinalists = (d: readonly Evidence[]) => finalistsOfArm(d, maxFrozenD1);
export const pairSides = (d: readonly Evidence[], g: readonly Evidence[]) => ({ d1: finalistsOfArm(d, maxPairSide), g: finalistsOfArm(g, maxPairSide) });

// ----- the stage-2 refinement plan (PROTOCOL.md §7.3), from an arm's BROAD evidence only -----
// Priority 5's refineCells with the arm's quota: profit 4, robust 4, lower drawdown 2, balanced 2, then the arm's coverage
// safeguards (D, J: every D1 family, a gate both ways, a protective stop; G, J, S: both Growth protection classes
// (unrestricted and protected), both Growth entries; S: every frozen D1 finalist), then — while the quota allows — every
// remaining qualified cell by best centre net.

export interface RefinePlan {
  cells: { cell: string; why: string[]; seeds: string[]; focus: string[] }[];
  eligible: number;
  quota: number;
}

const byLabel = (a: Evidence, b: Evidence) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);
const balancedOf = (e: Evidence) => e.select.robust / Math.max(1, e.select.p90Dd);

export const refineCells = (arm: Exclude<ArmKey, 'C'>, broad: readonly Evidence[]): RefinePlan => {
  const quota = refineQuota[arm];
  const qualified = broad.filter((e) => e.qualified && e.arm === arm);
  const byCell = new Map<string, Evidence[]>();

  for (const e of qualified) byCell.set(e.cell, [...(byCell.get(e.cell) ?? []), e]);

  const eligible = [...byCell.keys()].sort();
  const bestOf = (cell: string, score: (e: Evidence) => number) => Math.max(...byCell.get(cell)!.map(score));
  const chosen = new Map<string, string[]>();
  const add = (cell: string, why: string) => {
    if (chosen.has(cell)) chosen.get(cell)!.push(why);
    else if (chosen.size < quota) chosen.set(cell, [why]);
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
  take(ranked(balancedOf), 2, 'balanced: best qualified selection robust ÷ selection p90 DD');

  const coverWith = (pred: (cell: string) => boolean, why: string) => {
    if ([...chosen.keys()].some(pred)) return;
    take(ranked((e) => e.centre.net, pred), 1, why);
  };
  const d1Of = (c: string) => cellOf(c).d1;
  const unrestricted = (c: string) => cellOf(c).exits === 0 && cellOf(c).istop === 0;

  if (arm === 'D' || arm === 'J') {
    for (const f of families) coverWith((c) => d1Of(c)!.family === f, `coverage: D1 family ${f}`);
    coverWith((c) => d1Of(c)!.gate, 'coverage: decline gate ON');
    coverWith((c) => !d1Of(c)!.gate, 'coverage: decline gate OFF');
    coverWith((c) => protectedFamily(d1Of(c)!.family), 'coverage: a protective stop');
  }
  if (arm !== 'D') {
    coverWith(unrestricted, 'coverage: unrestricted Growth (no maximum hold, no initial stop)');
    coverWith((c) => !unrestricted(c), 'coverage: protected Growth');
    for (const entry of ['rise', 'breakout'])
      if (![...chosen.keys()].some((c) => (byCell.get(c) ?? []).some((e) => e.growthEntry === entry)))
        take(ranked((e) => (e.growthEntry === entry ? e.centre.net : -Infinity), (c) => byCell.get(c)!.some((e) => e.growthEntry === entry)), 1, `coverage: Growth ${entry} entry`);
  }
  if (arm === 'S') for (const k of [...new Set(eligible.map((c) => cellOf(c).frozen!.key))].sort()) coverWith((c) => cellOf(c).frozen!.key === k, `coverage: frozen D1 ${k}`);
  take(ranked((e) => e.centre.net), quota, 'quota: remaining qualified cells by best centre net');

  const cells = [...chosen.entries()].map(([cell, why]) => {
    const own = byCell.get(cell)!;
    const order = actualProfitOrder(own as never) as unknown as Evidence[];
    const robust = [...own].sort((a, b) => b.select.robust - a.select.robust || byLabel(a, b))[0];
    const focus = [...new Set([order[0]?.label, robust?.label].filter((x): x is string => Boolean(x)))];

    return { cell, why, seeds: own.map((e) => e.label), focus };
  });

  return { cells, eligible: eligible.length, quota };
};
