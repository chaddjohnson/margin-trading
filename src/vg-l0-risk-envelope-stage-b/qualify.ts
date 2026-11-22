// Qualification (PROTOCOL.md §7): Assignment 3's instrument, unchanged in every evaluation it requests — the detailed
// centre, the centre, the six frozen stresses, the five causal removals, SELECTION 2 × 128 (ranking only) and fresh
// CONFIRMATION 3 × 128 (qualification only), common random numbers across every member of a cutoff (labels
// ('select' | 'confirm', rep, cutoff): never the arm, the cell or the lane) — with the risk envelope requested on EVERY
// evaluation. The union of both arms' shortlists + the two benchmarks is evaluated once and assessed under BOTH arms by
// the pilot's verdict code (src/vg-l0-risk-envelope-pilot/qualify.ts verdictOf, generic in the arm):
//
//   gate  CTRL (nl0-control = Assignment 3, exactly)              EXP30 (sens-p3-40-25-30)
//   Q1    centre net > 0                                           the same
//   Q2    centre marked DD ≤ 35 % of C0                            assess(centre, P3).pass (DD ≤ 40 %, PL ≤ 25 %, BD ≤ 30 %)
//   Q3    confirmation p90 DD (Priority 3's, cents) ≤ 35 % of C0   unrounded confirmation p90 of each of the three metrics ≤ its limit
//   Q4    confirmation p10 net (cents) > 0                         unrounded confirmation p10 net > 0
//   Q5    10 bps: net > 0 ∧ marked DD ≤ 35 % of C0                 10 bps: net > 0 ∧ assess(10 bps record, P3).pass
//   Q6    a D1 book and Growth·VGT both funded at the centre       the same
//
// The top-level `gates / qualified / failed / severity` are CTRL's (Assignment 3's own fields); `arms` holds both verdicts.
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { compact, enabledOf, fidelity, participationOf, pooledStats, removalsOf } from '../vg-l0-risk-families/qualify.ts';
import type { CompactRec } from '../vg-l0-risk-families/qualify.ts';
import { type Evidence as A3Evidence, type Member, describeEvidence, drawsOf, famOf, stresses } from '../vg-l0-full-joint/qualify.ts';
import type { DRec, SRec } from '../vg-l0-full-joint/evaluate.ts';
import type { Cfg } from '../vg-l0-full-joint/space.ts';
import { nbStats } from '../vg-l0-full-joint/fitness.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import type { EvalLab } from '../gpu-backend/lab.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import type { Envelope } from '../gpu-backend/batch.ts';
import { limitOf } from '../risk-envelope/policy.ts';
import { type ArmVerdict, type GateName, gateNames, verdictOf } from '../vg-l0-risk-envelope-pilot/qualify.ts';
import { type EnvNb, assessArm, envNbStats } from '../vg-l0-risk-envelope-pilot/fitness.ts';
import { type ArmKey, C0, armKeys, arms, asPilotArm } from './context.ts';

export type { ArmVerdict, GateName, Member };
export { gateNames };

export interface EnvelopeEvidence {
  centre: Envelope;
  select: EnvNb;
  confirm: EnvNb;
  confirmFailShare: Record<ArmKey, number>; // share of the unique confirmation draws failing each arm's centre policy
  // breach counts among the confirmation draws (a failed draw counts as a breach): DD vs 35 % / 40 % of C0, PL vs 25 %,
  // BD vs 25 % / 30 % (liquidation basis)
  confirmBreach: { n: number; markedDd35: number; markedDd40: number; pl25: number; bd25: number; bd30: number };
  stress: Record<string, { net: number; dd: number; envelope: Envelope }>;
  removal: Record<string, Envelope>;
  confirmP10Unrounded: number;
}

export interface Evidence extends A3Evidence {
  envelope: EnvelopeEvidence;
  arms: Record<ArmKey, ArmVerdict>;
  shortlistedBy: { arm: ArmKey | 'benchmark'; label: string; lane: string; pick: string }[];
}

const envOf = (r: Rec, where: string) => checkEnvelope((r as SRec & { envelope?: unknown }).envelope, where);
const lim = (pct: number) => limitOf(pct, C0);

export const qualifyMembers = async (
  lab: EvalLab,
  members: readonly (Member & { shortlistedBy: Evidence['shortlistedBy'] })[],
  cutoff: string
): Promise<{ evidence: Evidence[]; requested: number }> => {
  type Draw = { cfg: Cfg; clipped: number; id: string };
  type Plan = { m: (typeof members)[number]; fams: Record<string, Draw[]>; singles: Record<string, EvalOptions> };

  const plans: Plan[] = members.map((m) => {
    const fams: Plan['fams'] = {};

    for (let rep = 1; rep <= fidelity.selectReps; rep++) fams[`select${rep}`] = drawsOf(m.cfg, famOf('select', ['select', rep, cutoff]));
    for (let rep = 1; rep <= fidelity.confirmReps; rep++) fams[`confirm${rep}`] = drawsOf(m.cfg, famOf('confirm', ['confirm', rep, cutoff]));

    const singles: Plan['singles'] = { centre: vOptions };

    for (const [name, f] of Object.entries(stresses)) singles[`stress:${name}`] = { ...vOptions, friction: { ...f } };
    for (const [name, drop] of Object.entries(removalsOf(enabledOf(vOptions))))
      singles[`removal:${name}`] = { ...vOptions, enabled: { ...vOptions.enabled, ...Object.fromEntries(drop.map((b) => [b, false])) } };
    return { m, fams, singles };
  });
  const items: { cfg: Cfg; options: EvalOptions; detail?: boolean; risk: true }[] = [];

  for (const p of plans) {
    items.push({ cfg: p.m.cfg, options: vOptions, detail: true, risk: true });
    for (const o of Object.values(p.singles)) items.push({ cfg: p.m.cfg, options: o, risk: true });
    for (const f of Object.values(p.fams)) for (const x of f) items.push({ cfg: x.cfg, options: vOptions, risk: true });
  }

  lab.stage = `qualify ${cutoff}: ${members.length} members, ${items.length} evaluations`;

  const recs = await lab.evalMany<SRec>(items, `qualify ${cutoff}`);
  let at = 0;
  const out: Evidence[] = [];

  for (const p of plans) {
    const detail = recs[at++]! as DRec;
    const singles: Record<string, SRec> = {};

    for (const k of Object.keys(p.singles)) singles[k] = recs[at++]!;

    const famRecs: Record<string, SRec[]> = {};

    for (const [k, f] of Object.entries(p.fams)) famRecs[k] = f.map(() => recs[at++]!);

    const centre = singles.centre!;

    if (centre.net !== detail.net || centre.signature !== detail.signature) throw new Error(`${p.m.label}: detailed centre differs`);

    const pooled = (prefix: string) =>
      pooledStats(
        centre,
        Object.keys(p.fams)
          .filter((k) => k.startsWith(prefix))
          .map((k) => ({ draws: p.fams[k]!, recs: famRecs[k]! }))
      );
    const one = (k: string) =>
      nbStats(
        centre,
        famRecs[k]!,
        p.fams[k]!.map((x) => x.clipped)
      );
    const select = pooled('select');
    const confirm = pooled('confirm');
    const stress: Record<string, CompactRec> = {};
    const removal: Record<string, CompactRec> = {};
    const stressEnv: EnvelopeEvidence['stress'] = {};
    const removalEnv: EnvelopeEvidence['removal'] = {};

    for (const [k, r] of Object.entries(singles)) {
      if (k.startsWith('stress:')) {
        stress[k.slice(7)] = compact(r);
        stressEnv[k.slice(7)] = { net: r.net, dd: r.dd, envelope: envOf(r, `${p.m.label} ${k}`) };
      }
      if (k.startsWith('removal:')) {
        removal[k.slice(8)] = compact(r);
        removalEnv[k.slice(8)] = envOf(r, `${p.m.label} ${k}`);
      }
    }

    const s10 = singles['stress:cost 10 bps']!;
    // the unrounded confirmation p10 net (a failed draw counts as a loss of the whole allocation, as in nbStats)
    const p10 = quantile(
      confirm.recs.map((r) => (r.error ? -C0 : r.net)).sort((a, b) => a - b),
      0.1
    );
    const verdicts = Object.fromEntries(
      armKeys.map((k) => [k, verdictOf(asPilotArm(arms[k]), centre, { nb: confirm.nb, recs: confirm.recs }, s10, p10)])
    ) as Record<ArmKey, ArmVerdict>;
    const ctrl = verdicts.CTRL;
    const over = (r: Rec, f: (e: Envelope) => number, limit: number) => r.error || f(envOf(r, 'confirm')) > limit;
    const confirmBreach = {
      n: confirm.recs.length,
      markedDd35: confirm.recs.filter((r) => r.error || r.dd > lim(35)).length,
      markedDd40: confirm.recs.filter((r) => r.error || r.dd > lim(40)).length,
      pl25: confirm.recs.filter((r) => over(r, (e) => e.principalLossLiquidation, lim(25))).length,
      bd25: confirm.recs.filter((r) => over(r, (e) => e.bankedDdLiquidation, lim(25))).length,
      bd30: confirm.recs.filter((r) => over(r, (e) => e.bankedDdLiquidation, lim(30))).length
    };
    const failShare = (k: ArmKey) =>
      confirm.recs.length ? confirm.recs.filter((r) => r.error || !assessArm(r, asPilotArm(arms[k]), 'confirm').pass).length / confirm.recs.length : 0;

    out.push({
      ...describeEvidence(p.m, p.m.cfg),
      lane: p.m.lane,
      stage: p.m.stage,
      track: p.m.track,
      pick: p.m.pick,
      replicate: p.m.replicate,
      cfg: p.m.cfg,
      centre,
      risk: detail.risk,
      select: select.nb,
      selectTail: select.tail,
      confirm: confirm.nb,
      confirmTail: confirm.tail,
      confirmReps: Array.from({ length: fidelity.confirmReps }, (_v, i) => one(`confirm${i + 1}`)),
      confirmDraws: { drawn: confirm.drawn, unique: confirm.unique },
      selectDraws: { drawn: select.drawn, unique: select.unique },
      stress,
      removal,
      gates: ctrl.gates,
      qualified: ctrl.qualified,
      failed: ctrl.failed,
      severity: ctrl.severity,
      participation: participationOf(centre, enabledOf(vOptions)),
      envelope: {
        centre: envOf(centre, `${p.m.label} centre`),
        select: envNbStats(select.recs),
        confirm: envNbStats(confirm.recs),
        confirmFailShare: { CTRL: failShare('CTRL'), EXP30: failShare('EXP30') },
        confirmBreach,
        stress: stressEnv,
        removal: removalEnv,
        confirmP10Unrounded: p10
      },
      arms: verdicts,
      shortlistedBy: p.m.shortlistedBy
    });
  }

  return { evidence: out, requested: items.length };
};

// the per-arm view of an evidence row that the frozen selectors read (`qualified` and `gates` are the arm's)
export const viewOf = (e: Evidence, arm: ArmKey): Evidence => ({
  ...e,
  gates: e.arms[arm].gates,
  qualified: e.arms[arm].qualified,
  failed: e.arms[arm].failed,
  severity: e.arms[arm].severity
});

// the sealed form of an evidence row: the per-lot rows stay in the cache (idempotent)
export const sealedEvidence = (e: Evidence) => {
  const risk = e.risk as Evidence['risk'] & { rowsKept?: number };

  return { ...e, risk: { ...risk, rows: undefined, rowsKept: risk.rows ? risk.rows.length : risk.rowsKept } };
};
