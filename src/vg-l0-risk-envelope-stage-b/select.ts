// Selection (PROTOCOL.md §8), no evaluation:
//   lane level (the primary statistic, §1): V(lane) = the best qualified centre net among the lane's own shortlisted
//     members qualified under the lane's arm; the representative is the first of the P0 order on that set (highest centre
//     net; ties selection robust, lower centre DD, label); V = $0 when the lane has no qualified member;
//   pooled level, per (cutoff, arm), on the arm's population (every member its 32 lanes shortlisted, under its verdicts):
//     P0            NL0 1.0.0's original rule (src/vg-l0-risk-families/select.ts originalOrder), unchanged;
//     RA1-original  Assignment 2's ra1Order (S4 = 35 % of C0), unchanged;
//     RA1-adapted   (EXP30 only; a SEPARATE DESCRIPTIVE selector, never in a primary statistic) the pilot's
//                   ra1OrderWith(·, 40 % of C0).
import {
  failedScreens as a2FailedScreens,
  originalOrder as a2OriginalOrder,
  ra1Order as a2Ra1Order,
  screensOf as a2ScreensOf
} from '../vg-l0-risk-families/select.ts';
import type { Evidence as A2Evidence } from '../vg-l0-risk-families/qualify.ts';
import { rolesOf } from '../vg-l0-full-joint/qualify.ts';
import { failedScreensWith, paretoOf, ra1OrderWith, screensWith } from '../vg-l0-risk-envelope-pilot/select.ts';
import { type ArmKey, arms } from './context.ts';
import { type Evidence, viewOf } from './qualify.ts';

const asA2 = (ev: readonly Evidence[]) => ev as unknown as readonly A2Evidence[];
const back = (ev: readonly A2Evidence[]) => ev as unknown as Evidence[];

export type SelectorName = 'P0' | 'RA1-original' | 'RA1-adapted';
export const selectorsOf = (arm: ArmKey): SelectorName[] => (arm === 'EXP30' ? ['P0', 'RA1-original', 'RA1-adapted'] : ['P0', 'RA1-original']);

export const orderOf = (s: SelectorName, pop: readonly Evidence[], arm: ArmKey): Evidence[] => {
  if (s === 'P0') return back(a2OriginalOrder(asA2(pop)));
  if (s === 'RA1-original') return back(a2Ra1Order(asA2(pop)));

  const s4 = arms[arm].ra1S4.adapted;

  if (s4 === null) throw new Error(`the adapted RA1 is an EXP30 selector (arm ${arm})`);
  return back(ra1OrderWith(asA2(pop), s4));
};

const screensOfSelector = (s: SelectorName, e: Evidence, arm: ArmKey) =>
  s === 'RA1-adapted' ? screensWith(e as unknown as A2Evidence, arms[arm].ra1S4.adapted!) : a2ScreensOf(e as unknown as A2Evidence);
const failedScreensOfSelector = (s: SelectorName, e: Evidence, arm: ArmKey) =>
  s === 'RA1-adapted' ? failedScreensWith(e as unknown as A2Evidence, arms[arm].ra1S4.adapted!) : a2FailedScreens(e as unknown as A2Evidence);

// an arm's population (optionally one lane's): the rows its lanes shortlisted, under the arm's own label and verdict
export const populationOf = (evidence: readonly Evidence[], arm: ArmKey, lane?: string): Evidence[] =>
  evidence
    .filter((e) => e.shortlistedBy.some((s) => s.arm === arm && (lane === undefined || s.lane === lane)))
    .map((e) => {
      const own = e.shortlistedBy.find((s) => s.arm === arm && (lane === undefined || s.lane === lane))!;

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

export interface LaneValue {
  lane: string;
  arm: ArmKey;
  cell: string;
  replicate: number;
  shortlisted: number;
  qualified: number;
  value: number; // V: the best qualified centre net, $0 without a qualified member
  representative: { label: string; id: string } | null;
  ra1Representative: { label: string; id: string } | null; // report-only: Assignment 2's RA1 order on the lane's members
  members: { label: string; id: string; centreNet: number; qualified: boolean; failed: string[] }[];
}

// the lane-level values of one arm (every lane of the arm in `lanes`, including lanes with an empty shortlist)
export const laneValues = (evidence: readonly Evidence[], arm: ArmKey, lanes: readonly { key: string; cell: string; replicate: number; shortlisted: number }[]): LaneValue[] =>
  lanes.map((l) => {
    const pop = populationOf(evidence, arm, l.key);
    const p0 = orderOf('P0', pop, arm);
    const ra1 = orderOf('RA1-original', pop, arm);
    const best = p0[0] ?? null;

    if (pop.length !== l.shortlisted) throw new Error(`${arm} ${l.key}: ${pop.length} evidence rows for ${l.shortlisted} shortlisted members`);
    return {
      lane: l.key,
      arm,
      cell: l.cell,
      replicate: l.replicate,
      shortlisted: pop.length,
      qualified: pop.filter((e) => e.qualified).length,
      value: best ? best.centre.net : 0,
      representative: best ? { label: best.label, id: best.id } : null,
      ra1Representative: ra1[0] ? { label: ra1[0].label, id: ra1[0].id } : null,
      members: pop.map((e) => ({ label: e.label, id: e.id, centreNet: e.centre.net, qualified: e.qualified, failed: e.failed }))
    };
  });

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
    pareto: paretoOf(pop as never),
    ra1OriginalEqualsAdapted: arm === 'EXP30' ? primaries['RA1-original'] === primaries['RA1-adapted'] : null,
    labels: pop.map((e) => ({ label: e.label, id: e.id, qualified: e.qualified, failed: e.failed }))
  };
};
