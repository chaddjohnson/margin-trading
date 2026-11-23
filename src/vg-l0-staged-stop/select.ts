// Selection (PROTOCOL.md §8), no evaluation:
//   lane level (the primary statistic §1.1): V(lane) = the best qualified centre net among the lane's selectable members
//     — CTRL: its shortlist; EXP: its shortlist and the OFF projections of its ON members — under P0; the representative is
//     the first of the P0 order on that set (NL0 1.0.0's actual-profit rule: Assignment 2's originalOrder — highest
//     centre net; ties selection robust, lower centre DD, label); V = $0 without a qualified member;
//   pooled level, per (cutoff, arm): the P0 primary over the arm's qualified selectable members; NL0's roles; the Pareto
//     set (report-only).
// The informed lanes (PROTOCOL.md §10) are a separate track: their members never enter the independent populations.
import { originalOrder as a2OriginalOrder } from '../vg-l0-risk-families/select.ts';
import type { Evidence as A2Evidence } from '../vg-l0-risk-families/qualify.ts';
import { rolesOf } from '../vg-l0-full-joint/qualify.ts';
import { paretoOf } from '../vg-l0-risk-envelope-pilot/select.ts';
import type { ArmKey } from './context.ts';
import type { Evidence, Origin } from './qualify.ts';

const asA2 = (ev: readonly Evidence[]) => ev as unknown as readonly A2Evidence[];
const back = (ev: readonly A2Evidence[]) => ev as unknown as Evidence[];

export const p0Order = (pop: readonly Evidence[]): Evidence[] => back(a2OriginalOrder(asA2(pop)));

export type Track = 'independent' | 'informed';
const memberRole = (t: Track) => (t === 'independent' ? 'member' : 'informed');
const projectionRole = (t: Track) => (t === 'independent' ? 'projection' : 'informed-projection');
const selectable = (o: Origin, arm: ArmKey, lane: string | undefined, t: Track) =>
  o.arm === arm &&
  (lane === undefined || o.lane === lane) &&
  (o.role === memberRole(t) || (arm === 'EXP' && o.role === projectionRole(t)));

// an arm's selectable population of a track (optionally one lane's), each row under its own origin label
export const populationOf = (
  evidence: readonly Evidence[],
  arm: ArmKey,
  lane?: string,
  t: Track = 'independent'
): Evidence[] =>
  evidence
    .filter((e) => e.origins.some((o) => selectable(o, arm, lane, t)))
    .map((e) => {
      const own = e.origins.find((o) => selectable(o, arm, lane, t))!;

      return { ...e, label: own.label, lane: own.lane, pick: own.pick };
    });

export interface LaneValue {
  lane: string;
  arm: ArmKey;
  cell: string;
  replicate: number;
  shortlisted: number;
  selectable: number; // shortlist + (EXP) its OFF projections
  qualified: number;
  value: number; // V: the best qualified centre net, $0 without a qualified member
  representative: { label: string; id: string; stagedPattern: string; isProjection: boolean } | null;
  // EXP: the representative's all-OFF projection (the mechanism check §1.3), when the representative has a book ON
  offProjection: { label: string; id: string; centreNet: number; qualified: boolean } | null;
  members: {
    label: string;
    id: string;
    centreNet: number;
    qualified: boolean;
    failed: string[];
    stagedPattern: string;
    role: string;
  }[];
}

export const laneValues = (
  evidence: readonly Evidence[],
  arm: ArmKey,
  lanes: readonly { key: string; cell: string; replicate: number; shortlisted: number }[],
  t: Track = 'independent'
): LaneValue[] =>
  lanes.map((l) => {
    const pop = populationOf(evidence, arm, l.key, t);
    const order = p0Order(pop);
    const best = order[0] ?? null;
    const members = pop.filter((e) =>
      e.origins.some((o) => o.arm === arm && o.lane === l.key && o.role === memberRole(t))
    );

    if (members.length !== l.shortlisted)
      throw new Error(`${arm} ${l.key}: ${members.length} evidence rows for ${l.shortlisted} shortlisted members`);

    let offProjection: LaneValue['offProjection'] = null;

    if (best && arm === 'EXP' && best.staged) {
      // the all-OFF projection of the representative (a member or one of its projections): the projection of the same
      // root member with every book OFF
      const own = best.origins.find(
        (o) => o.lane === l.key && o.arm === 'EXP' && (o.role === memberRole(t) || o.role === projectionRole(t))
      )!;
      const root = own.role === projectionRole(t) ? own.projectionOf! : own.label;
      const off = evidence.find(
        (e) =>
          e.staged === null &&
          e.origins.some(
            (o) => o.arm === 'EXP' && o.lane === l.key && o.role === projectionRole(t) && o.projectionOf === root
          )
      );

      if (!off) throw new Error(`${l.key}: the all-OFF projection of ${root} is missing from the union`);
      offProjection = { label: `${root} [all OFF]`, id: off.id, centreNet: off.centre.net, qualified: off.qualified };
    }

    const inLane = (e: Evidence, role: string) =>
      e.origins.some((o) => o.arm === arm && o.lane === l.key && o.role === role);

    return {
      lane: l.key,
      arm,
      cell: l.cell,
      replicate: l.replicate,
      shortlisted: members.length,
      selectable: pop.length,
      qualified: pop.filter((e) => e.qualified).length,
      value: best ? best.centre.net : 0,
      representative: best
        ? {
            label: best.label,
            id: best.id,
            stagedPattern: best.stagedPattern,
            isProjection: inLane(best, projectionRole(t)) && !inLane(best, memberRole(t))
          }
        : null,
      offProjection,
      members: pop.map((e) => ({
        label: e.label,
        id: e.id,
        centreNet: e.centre.net,
        qualified: e.qualified,
        failed: e.failed,
        stagedPattern: e.stagedPattern,
        role: e.origins.find((o) => o.arm === arm && o.lane === l.key)?.role ?? '?'
      }))
    };
  });

export const summaryOf = (e: Evidence) => ({
  label: e.label,
  id: e.id,
  cell: e.cell,
  stagedPattern: e.stagedPattern,
  staged: e.staged,
  centreNet: e.centre.net,
  centreDd: e.centre.dd,
  principalLossLiquidation: e.envelope.centre.principalLossLiquidation,
  bankedDdLiquidation: e.envelope.centre.bankedDdLiquidation,
  selectRobust: e.select.robust,
  selectP90Dd: e.select.p90Dd,
  confirmP90Dd: e.confirm.p90Dd,
  qualified: e.qualified
});

// the pooled P0 selection of one arm's track (optionally restricted to lanes whose key starts with a prefix)
export const selectArm = (
  evidence: readonly Evidence[],
  arm: ArmKey,
  t: Track = 'independent',
  lanePrefix?: string
) => {
  const pop = populationOf(evidence, arm, undefined, t).filter((e) => !lanePrefix || e.lane.startsWith(lanePrefix));
  const order = p0Order(pop);

  return {
    arm,
    track: t,
    lanePrefix: lanePrefix ?? null,
    policy: 'nl0-control@1.0.0 (P0)',
    selectable: pop.length,
    qualified: order.length,
    primary: order[0] ? summaryOf(order[0]) : null,
    ranking: order.slice(0, 10).map(summaryOf),
    roles: pop.length ? rolesOf(`${arm} ${t}${lanePrefix ? ` ${lanePrefix}` : ''}`, pop as never) : null,
    pareto: paretoOf(pop as never),
    stagedUse: {
      qualifiedOn: order.filter((e) => e.staged).length,
      qualifiedOff: order.filter((e) => !e.staged).length
    }
  };
};
