// Selection (PROTOCOL.md §10): per (cutoff, arm), on the arm's own qualified population (the members its four lanes
// shortlisted, qualified under the arm's gates), the frozen selectors of Assignment 2 / 3, imported unchanged:
//   P0            NL0 1.0.0's original rule: the actual-profit role (highest centre net; ties selection robust, lower
//                 centre DD, label) — src/vg-l0-risk-families/select.ts originalOrder;
//   RA1-original  Assignment 2's RA1, unchanged (S1 open-lot multiple ≤ 1.50, S2 open-lot share ≤ 25 %, S3 worst lot MAE
//                 ≥ −17,500, S4 selection worst-10 % mean DD ≤ 35 % of C0) — src/vg-l0-risk-families/select.ts ra1Order;
//   RA1-adapted   (EXP only; decision D-8) the same rule with ONLY S4's ceiling replaced by the EXP marked-DD limit
//                 (40 % of C0): ra1OrderWith below, a copy of ra1Order parameterized by S4 alone (tests/select.test.ts:
//                 ra1OrderWith(·, 35 % of C0) re-derives ra1Order on every sealed Assignment 3 population).
// Original and adapted RA1 rank the SAME already-generated EXP population; no selector launches an evaluation.
import {
  type Screens,
  failedScreens as a2FailedScreens,
  originalOrder as a2OriginalOrder,
  ra1Order as a2Ra1Order,
  ra1Thresholds,
  screensOf as a2ScreensOf
} from '../vg-l0-risk-families/select.ts';
import type { Evidence as A2Evidence } from '../vg-l0-risk-families/qualify.ts';
import { rolesOf } from '../vg-l0-full-joint/qualify.ts';
import { type ArmKey, arms } from './context.ts';
import { type Evidence, viewOf } from './qualify.ts';

const asA2 = (ev: readonly Evidence[]) => ev as unknown as readonly A2Evidence[];
const back = (ev: readonly A2Evidence[]) => ev as unknown as Evidence[];
const byLabel = (a: { label: string }, b: { label: string }) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

// RA1's screens with S4's ceiling as a parameter (every other threshold is Assignment 2's ra1Thresholds, unchanged)
export const screensWith = (e: A2Evidence, s4: number): Screens => {
  const t = ra1Thresholds;
  const multiple = e.risk.openLot?.multiple ?? null;
  const share = e.risk.openLot ? e.risk.openShare : null;

  return {
    S1: multiple === null || multiple <= t.exposureMultiple,
    S2: share === null || share <= t.openShare,
    S3: e.risk.mae.worst >= t.worstLotMae,
    S4: e.selectTail.worst10Mean <= s4,
    values: { multiple, openShare: share, worstMae: e.risk.mae.worst, worst10Mean: e.selectTail.worst10Mean }
  };
};
export const failedScreensWith = (e: A2Evidence, s4: number) => {
  const s = screensWith(e, s4);

  return (['S1', 'S2', 'S3', 'S4'] as const).filter((k) => !s[k]);
};
const tieRA = (a: A2Evidence, b: A2Evidence) =>
  b.risk.conservativeNet - a.risk.conservativeNet || b.select.robust - a.select.robust || a.centre.dd - b.centre.dd || byLabel(a, b);

// Assignment 2's ra1Order, statement for statement, with S4's ceiling a parameter
export const ra1OrderWith = (ev: readonly A2Evidence[], s4: number): A2Evidence[] => {
  const left = ev.filter((e) => e.qualified);
  const out: A2Evidence[] = [];

  while (left.length) {
    const fewest = Math.min(...left.map((e) => failedScreensWith(e, s4).length));
    const group = left.filter((e) => failedScreensWith(e, s4).length === fewest);
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

export type SelectorName = 'P0' | 'RA1-original' | 'RA1-adapted';
export const selectorsOf = (arm: ArmKey): SelectorName[] => (arm === 'EXP' ? ['P0', 'RA1-original', 'RA1-adapted'] : ['P0', 'RA1-original']);

export const orderOf = (s: SelectorName, pop: readonly Evidence[], arm: ArmKey): Evidence[] => {
  if (s === 'P0') return back(a2OriginalOrder(asA2(pop)));
  if (s === 'RA1-original') return back(a2Ra1Order(asA2(pop)));

  const s4 = arms[arm].ra1S4.adapted;

  if (s4 === null) throw new Error(`the adapted RA1 is an EXP selector (arm ${arm})`);
  return back(ra1OrderWith(asA2(pop), s4));
};

export const screensOfSelector = (s: SelectorName, e: Evidence, arm: ArmKey) =>
  s === 'RA1-adapted' ? screensWith(e as unknown as A2Evidence, arms[arm].ra1S4.adapted!) : a2ScreensOf(e as unknown as A2Evidence);
export const failedScreensOfSelector = (s: SelectorName, e: Evidence, arm: ArmKey) =>
  s === 'RA1-adapted' ? failedScreensWith(e as unknown as A2Evidence, arms[arm].ra1S4.adapted!) : a2FailedScreens(e as unknown as A2Evidence);

// The arm's population: the evidence rows its own lanes shortlisted, under the arm's label and verdict.
export const populationOf = (evidence: readonly Evidence[], arm: ArmKey): Evidence[] =>
  evidence
    .filter((e) => e.shortlistedBy.some((s) => s.arm === arm))
    .map((e) => {
      const own = e.shortlistedBy.find((s) => s.arm === arm)!;

      return { ...viewOf(e, arm), label: own.label, lane: own.lane, pick: own.pick };
    });

export const summaryOf = (e: Evidence, s: SelectorName, arm: ArmKey) => ({
  label: e.label,
  id: e.id,
  cell: e.cell,
  growthStratum: e.growthStratum,
  centreNet: e.centre.net,
  centreDd: e.centre.dd,
  principalLossLiquidation: e.envelope.centre.principalLossLiquidation,
  bankedDdLiquidation: e.envelope.centre.bankedDdLiquidation,
  conservativeNet: e.risk.conservativeNet,
  occupancy: e.risk.occupancy,
  selectRobust: e.select.robust,
  selectP90Dd: e.select.p90Dd,
  selectWorst10MeanDd: e.selectTail.worst10Mean,
  qualified: e.qualified,
  screens: s === 'P0' ? null : screensOfSelector(s, e, arm),
  failedScreens: s === 'P0' ? null : failedScreensOfSelector(s, e, arm)
});

// the non-dominated qualified members on (centre net ↑, centre DD ↓, selection p10 ↑, selection p90 DD ↓) — reported
export const paretoOf = (pop: readonly Evidence[]) => {
  const q = pop.filter((e) => e.qualified);
  const obj = (e: Evidence) => [-e.centre.net, e.centre.dd, -e.select.p10, e.select.p90Dd];
  const dominated = (a: Evidence) =>
    q.some((b) => b !== a && obj(b).every((v, i) => v <= obj(a)[i]!) && obj(b).some((v, i) => v < obj(a)[i]!));

  return q.filter((e) => !dominated(e)).map((e) => e.label).sort();
};

export const selectArm = (evidence: readonly Evidence[], arm: ArmKey) => {
  const pop = populationOf(evidence, arm);
  const primaries: Partial<Record<SelectorName, string | null>> = {};
  const rankings: Partial<Record<SelectorName, ReturnType<typeof summaryOf>[]>> = {};

  for (const s of selectorsOf(arm)) {
    const order = orderOf(s, pop, arm);

    primaries[s] = order[0]?.label ?? null;
    rankings[s] = order.slice(0, 10).map((e) => summaryOf(e, s, arm));
  }

  const byCell: Record<string, { members: number; qualified: number }> = {};

  for (const e of pop) {
    const c = (byCell[e.cell] ??= { members: 0, qualified: 0 });

    c.members++;
    if (e.qualified) c.qualified++;
  }

  return {
    arm,
    policy: `${arms[arm].policy.id}@${arms[arm].policy.version}`,
    members: pop.length,
    qualified: pop.filter((e) => e.qualified).length,
    byCell,
    primaries,
    rankings,
    roles: rolesOf(`${arm} population`, pop as never),
    pareto: paretoOf(pop),
    ra1OriginalEqualsAdapted:
      arm === 'EXP' ? primaries['RA1-original'] === primaries['RA1-adapted'] : null,
    labels: pop.map((e) => ({ label: e.label, id: e.id, qualified: e.qualified, failed: e.failed }))
  };
};
