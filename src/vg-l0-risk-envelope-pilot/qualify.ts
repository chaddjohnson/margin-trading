// Qualification (PROTOCOL.md §9): Assignment 3's instrument, unchanged in every evaluation it requests — the detailed
// centre, the centre, the six frozen stresses, the five causal removals, SELECTION 2 × 128 (ranking only) and fresh
// CONFIRMATION 3 × 128 (qualification only), common random numbers across every member of a cutoff (labels
// ('select' | 'confirm', rep, cutoff): never the arm, the cell or the lane) — with the risk envelope requested on EVERY
// evaluation. Because the draws never depend on the arm, a member shortlisted by both arms is evaluated once; the
// evidence is then assessed under each arm's gates (decision D-4, D-10):
//
//   gate  CTRL (nl0-control = Assignment 3, exactly)              EXP (re-40-25-25)
//   Q1    centre net > 0                                           the same
//   Q2    centre marked DD ≤ 35 % of C0                            assess(centre, EXP).pass (DD ≤ 40 %, PL ≤ 25 %, BD ≤ 25 %)
//   Q3    confirmation p90 DD (Priority 3's, cents) ≤ 35 % of C0   unrounded confirmation p90 of each of the three metrics ≤ its limit
//   Q4    confirmation p10 net (cents) > 0                         unrounded confirmation p10 net > 0
//   Q5    10 bps: net > 0 ∧ marked DD ≤ 35 % of C0                 10 bps: net > 0 ∧ assess(10 bps record, EXP).pass (the full envelope)
//   Q6    a D1 book and Growth·VGT both funded at the centre       the same
//
// The CTRL fields `gates / qualified / failed / severity` are Assignment 3's own (they reproduce its sealed evidence:
// engineering gate E2); `arms.CTRL` repeats them and `arms.EXP` holds the experimental verdict. Every limit comes from
// src/risk-envelope/policy.ts (limitOf on C0); no literal ceiling appears here.
import type { EvalOptions, Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { compact, enabledOf, fidelity, participationOf, pooledStats, removalsOf } from '../vg-l0-risk-families/qualify.ts';
import type { CompactRec } from '../vg-l0-risk-families/qualify.ts';
import { type Evidence as A3Evidence, type Member, describeEvidence, drawsOf, famOf, stresses } from '../vg-l0-full-joint/qualify.ts';
import type { DRec, SRec } from '../vg-l0-full-joint/evaluate.ts';
import type { Cfg } from '../vg-l0-full-joint/space.ts';
import { familiesFunded, nbStats } from '../vg-l0-full-joint/fitness.ts';
import { vOptions } from '../vg-l0-full-joint/nl0.ts';
import type { EvalLab } from '../gpu-backend/lab.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import type { Envelope } from '../gpu-backend/batch.ts';
import { type Arm, type ArmKey, C0, armKeys, arms, r2 } from './context.ts';
import { type EnvNb, assessArm, envNbStats, gatedMetrics, statOfMetric } from './fitness.ts';

export type { Member };
export type GateName = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6';
export const gateNames: readonly GateName[] = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'];

export interface ArmVerdict {
  gates: Record<GateName, boolean>;
  qualified: boolean;
  failed: GateName[];
  severity: Record<string, number>; // dollars beyond each failed limit (per metric for the envelope gates)
  reasons: string[]; // e.g. 'Q2 PL > limit', 'Q3 p90 BD > limit'
}

export interface EnvelopeEvidence {
  centre: Envelope;
  select: EnvNb;
  confirm: EnvNb;
  confirmFailShare: Record<ArmKey, number>; // share of the unique confirmation draws failing each arm's centre policy
  confirmBreach: { markedDd35: number; markedDd40: number; pl25: number; bd25: number; n: number }; // counts
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
const expLimit = (metric: 'principalLoss' | 'bankedDd') => gatedMetrics(arms.EXP).find((g) => g.metric === metric)!.limit;

// the verdict of one arm on a member's evidence
export const verdictOf = (
  arm: Arm,
  centre: SRec,
  confirm: { nb: ReturnType<typeof nbStats>; recs: Rec[] },
  s10: SRec,
  confirmP10Unrounded: number
): ArmVerdict => {
  const gated = gatedMetrics(arm);
  const nl0 = arm.nbInstrument === 'nl0';
  const label = { markedDd: 'DD', principalLoss: 'PL', bankedDd: 'BD' } as const;
  const centreA = assessArm(centre, arm, 'qualification centre');
  const s10A = assessArm(s10, arm, 'qualification 10 bps');
  // Q3: CTRL compares Priority 3's p90 DD (cents; Assignment 3 exactly); EXP the unrounded p90 of each gated metric
  const q3Over: { metric: string; excess: number }[] = [];

  if (nl0) {
    if (!(confirm.nb.p90Dd <= gated[0]!.limit)) q3Over.push({ metric: 'DD', excess: confirm.nb.p90Dd - gated[0]!.limit });
  } else {
    const e = envNbStats(confirm.recs);

    for (const g of gated) {
      const v = statOfMetric(e, g.metric, g.basis).p90;

      if (!(v <= g.limit)) q3Over.push({ metric: label[g.metric], excess: v - g.limit });
    }
  }

  const p10 = nl0 ? confirm.nb.p10 : confirmP10Unrounded;
  const gates: Record<GateName, boolean> = {
    Q1: centre.net > 0,
    Q2: centreA.pass,
    Q3: q3Over.length === 0,
    Q4: p10 > 0,
    Q5: s10.net > 0 && s10A.pass,
    Q6: familiesFunded(centre)
  };
  // severity in gate order (CTRL: Assignment 3's keys and expressions exactly)
  const severity: Record<string, number> = {};
  const reasons: string[] = [];

  if (!gates.Q1) {
    severity.Q1 = r2(-centre.net);
    reasons.push('Q1 net ≤ 0');
  }
  for (const c of centreA.checks)
    if (c.pass === false) {
      severity[nl0 ? 'Q2' : `Q2 ${label[c.metric]}`] = r2(c.value - c.limit!);
      reasons.push(`Q2 ${label[c.metric]} > limit`);
    }
  for (const x of q3Over) {
    severity[nl0 ? 'Q3' : `Q3 ${x.metric}`] = r2(x.excess);
    reasons.push(`Q3 p90 ${x.metric} > limit`);
  }
  if (!gates.Q4) {
    severity.Q4 = r2(-p10);
    reasons.push('Q4 p10 ≤ 0');
  }
  if (!gates.Q5) {
    const over = s10A.checks.filter((c) => c.pass === false);

    if (nl0) severity.Q5 = r2(Math.max(-s10.net, s10.dd - gated[0]!.limit));
    else {
      if (s10.net <= 0) severity['Q5 net'] = r2(-s10.net);
      for (const c of over) severity[`Q5 ${label[c.metric]}`] = r2(c.value - c.limit!);
    }
    if (s10.net <= 0) reasons.push('Q5 10 bps net ≤ 0');
    for (const c of over) reasons.push(`Q5 10 bps ${label[c.metric]} > limit`);
  }
  if (!gates.Q6) reasons.push('Q6 a family unfunded');

  const failed = gateNames.filter((k) => !gates[k]);

  return { gates, qualified: failed.length === 0, failed, severity, reasons };
};

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
      armKeys.map((k) => [k, verdictOf(arms[k], centre, { nb: confirm.nb, recs: confirm.recs }, s10, p10)])
    ) as Record<ArmKey, ArmVerdict>;
    const ctrl = verdicts.CTRL;
    const confirmBreach = {
      n: confirm.recs.length,
      markedDd35: confirm.recs.filter((r) => r.error || r.dd > arms.CTRL.markedDdLimit).length,
      markedDd40: confirm.recs.filter((r) => r.error || r.dd > arms.EXP.markedDdLimit).length,
      pl25: confirm.recs.filter((r) => r.error || envOf(r, 'confirm').principalLossLiquidation > expLimit('principalLoss')).length,
      bd25: confirm.recs.filter((r) => r.error || envOf(r, 'confirm').bankedDdLiquidation > expLimit('bankedDd')).length
    };
    const failShare = (k: ArmKey) =>
      confirm.recs.length ? confirm.recs.filter((r) => r.error || !assessArm(r, arms[k], 'confirm').pass).length / confirm.recs.length : 0;

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
        confirmFailShare: { CTRL: failShare('CTRL'), EXP: failShare('EXP') },
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
