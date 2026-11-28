// Feasibility and constrained violation UNDER AN ARM'S RISK POLICY (PROTOCOL.md §6) — the only place where the arm
// changes a search decision. Everything else of NL0's / Assignment 3's fitness is reused unchanged: Priority 3's
// neighbourhood statistics (nbStats: robust = ½ median + ½ p10; p90 DD), the objectives (−centre net, −robust net, p90
// marked DD; decision D-6), the net and structure terms, the unmeasured penalty 1 of centre-first fidelity and the
// violation's 1e-6 rounding.
//
// The arm's policy is interpreted ONLY through src/risk-envelope/policy.ts `assess` (the one interpretation: limits =
// (denominator × pct) / 100 on named denominators; a value equal to its limit passes; dollars, unrounded record values).
//   plausibility (screen, centre-first fitting)   !error ∧ net > 0 ∧ assess(centre, policy).pass ∧ both families funded
//   violation parts                               net | one part per GATED centre check (dd, pl, bd) | one part per
//                                                 gated neighbourhood p90 (p90, p90pl, p90bd) | structure
// Under the CONTROL policy (nl0-control: only the marked DD is gated) the parts are exactly Assignment 2's
// {net, dd, p90, structure} with the same expressions and the same summation order, and the neighbourhood p90 DD is
// Priority 3's nbStats value (rounded to cents, the frozen NL0 instrument) — so CTRL reproduces Assignment 3 bit for bit
// (tests/fitness.test.ts; engineering gate E2). Under the EXPERIMENTAL policy every gated neighbourhood term uses the
// UNROUNDED p90 of the metric over the rung's neighbours (brief §2: decisions on unrounded quantities; decision D-4:
// p90 of each of the three metrics), with a failed neighbour counted as +∞ (nbStats's own treatment of a failed DD).
import type { Rec } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import { type Fit, type Nb, familiesFunded } from '../vg-l0-full-joint/fitness.ts';
import { economics } from '../vg-l0-full-joint/context.ts';
import type { SRec } from '../vg-l0-full-joint/evaluate.ts';
import { checkEnvelope } from '../gpu-backend/lab.ts';
import { type Assessment, type Check, assess, limitOf } from '../risk-envelope/policy.ts';
import { type Arm, capital } from './context.ts';

export type { Fit, Nb };

type Metric = Check['metric'];
const centrePart: Record<Metric, string> = { markedDd: 'dd', principalLoss: 'pl', bankedDd: 'bd' };
const nbPart: Record<Metric, string> = { markedDd: 'p90', principalLoss: 'p90pl', bankedDd: 'p90bd' };
const reasonOfMetric: Record<Metric, string> = { markedDd: 'DD > ceiling', principalLoss: 'PL > limit', bankedDd: 'BD > limit' };

// The gated metrics of a policy, in policy.ts's check order (marked DD, then principal loss, then banked DD).
export const gatedMetrics = (arm: Arm) => {
  const p = arm.policy;
  const out: { metric: Metric; basis: 'marked' | 'liquidation'; pct: number; limit: number }[] = [
    { metric: 'markedDd', basis: 'marked', pct: p.markedDd.pct, limit: limitOf(p.markedDd.pct, capital.initialAllocation) }
  ];

  if (p.principalLoss)
    out.push({ metric: 'principalLoss', basis: p.principalLoss.basis, pct: p.principalLoss.pct, limit: limitOf(p.principalLoss.pct, capital.initialAllocation) });
  if (p.bankedDd)
    out.push({ metric: 'bankedDd', basis: p.bankedDd.basis, pct: p.bankedDd.pct, limit: limitOf(p.bankedDd.pct, capital.initialAllocation) });
  return out;
};

export const assessArm = (r: Rec, arm: Arm, where = 'record'): Assessment => assess(r as never, arm.policy, capital, where);

// plausibility (NL0's: centre net > 0, the arm's centre envelope, both families funded; an evaluation error is never
// plausible) — the order of the conjunction is the original's
export const plausibleArm = (r: Rec, arm: Arm) =>
  !r.error && r.net > 0 && assessArm(r, arm, 'plausibility').pass && familiesFunded(r);

// the failing gated centre metrics (report and screen-reason use)
export const failingMetrics = (r: Rec, arm: Arm): Metric[] =>
  assessArm(r, arm)
    .checks.filter((c) => c.pass === false)
    .map((c) => c.metric);

// why a screened centre was implausible (the original chain; the arm's failing metrics replace "DD > ceiling")
export const screenReason = (r: Rec, arm: Arm) => {
  if (r.error) return 'error';
  if (r.lots === 0) return 'no funded lot';
  if (!r.mixed) return 'a family unfunded';
  if (r.net <= 0) return 'net ≤ 0';

  const failing = failingMetrics(r, arm);

  return failing.length ? failing.map((m) => reasonOfMetric[m]).join(' & ') : 'plausible';
};

// the screen's normalized violation of an implausible centre (Assignment 3's screen() expression with the arm's centre
// envelope in place of the marked-DD term; an error record keeps the original marked-DD expression)
export const screenViolation = (r: Rec, arm: Arm) => {
  const net = r.error ? 1 : Math.max(0, -r.net) / economics.budget + (r.net > 0 ? 0 : 0.01);
  const m = arm.markedDdLimit;
  const env = r.error ? Math.max(0, r.dd - m) / m : assessArm(r, arm, 'screen').violation;

  return net + env + (r.mixed ? 0 : 0.5);
};

// ----- the neighbourhood envelope statistics (unrounded; a failed neighbour = +∞ in every metric) -----

export interface Stat {
  median: number;
  p90: number;
  p95: number;
  worst: number;
  worst10Mean: number;
}
export interface EnvNb {
  n: number;
  failed: number;
  markedDd: Stat;
  principalLoss: { marked: Stat; liquidation: Stat };
  bankedDd: { marked: Stat; liquidation: Stat };
}

const statOf = (xs: number[]): Stat => {
  const s = [...xs].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.1 * s.length));

  return {
    median: quantile(s, 0.5),
    p90: quantile(s, 0.9),
    p95: quantile(s, 0.95),
    worst: s.length ? s.at(-1)! : NaN,
    worst10Mean: s.length ? s.slice(s.length - k).reduce((a, x) => a + x, 0) / k : NaN
  };
};

export const envNbStats = (nbs: readonly Rec[]): EnvNb => {
  const col = (f: (r: Rec) => number) => nbs.map((r) => (r.error ? Infinity : f(r)));
  const env = (r: Rec) => checkEnvelope((r as SRec & { envelope?: unknown }).envelope, 'neighbour');

  return {
    n: nbs.length,
    failed: nbs.filter((r) => r.error).length,
    markedDd: statOf(col((r) => r.dd)),
    principalLoss: {
      marked: statOf(col((r) => env(r).principalLossMarked)),
      liquidation: statOf(col((r) => env(r).principalLossLiquidation))
    },
    bankedDd: {
      marked: statOf(col((r) => env(r).bankedDdMarked)),
      liquidation: statOf(col((r) => env(r).bankedDdLiquidation))
    }
  };
};

export const statOfMetric = (e: EnvNb, metric: Metric, basis: 'marked' | 'liquidation') =>
  metric === 'markedDd' ? e.markedDd : metric === 'principalLoss' ? e.principalLoss[basis] : e.bankedDd[basis];

// The neighbourhood p90 values the arm's gates compare (CTRL: Priority 3's rounded p90 DD — the frozen instrument; EXP:
// unrounded p90 of each gated metric). null = unmeasured (no neighbours, or a non-finite p90).
export const neighbourhoodP90s = (nb: Nb | null, nbRecs: readonly Rec[] | null, arm: Arm): number[] | null => {
  const gated = gatedMetrics(arm);

  if (!nb) return null;
  if (arm.nbInstrument === 'nl0') {
    if (gated.length !== 1 || gated[0]!.metric !== 'markedDd')
      throw new Error(`arm ${arm.key}: the NL0 neighbourhood instrument gates only the marked DD`);
    return Number.isFinite(nb.p90Dd) ? [nb.p90Dd] : null;
  }
  if (!nbRecs || nbRecs.length === 0) return null;

  const e = envNbStats(nbRecs);
  const vs = gated.map((g) => statOfMetric(e, g.metric, g.basis).p90);

  return vs.every((v) => Number.isFinite(v)) ? vs : null;
};

export const violationArm = (centre: Rec, nb: Nb | null, nbRecs: readonly Rec[] | null, arm: Arm) => {
  const gated = gatedMetrics(arm);
  const parts: Record<string, number> = {
    net: centre.error ? 1 : Math.max(0, -centre.net) / economics.budget + (centre.net > 0 ? 0 : 0.01)
  };

  if (centre.error) gated.forEach((g, i) => (parts[centrePart[g.metric]] = i === 0 ? 1 : 0));
  else {
    const a = assessArm(centre, arm, 'centre');

    for (const g of gated) parts[centrePart[g.metric]] = a.checks.find((c) => c.metric === g.metric && c.basis === g.basis)!.excess;
  }

  const p90s = neighbourhoodP90s(nb, nbRecs, arm);

  gated.forEach((g, i) => {
    parts[nbPart[g.metric]] = p90s ? Math.max(0, p90s[i]! - g.limit) / g.limit : i === 0 ? 1 : 0;
  });
  parts.structure = centre.error ? 1 : (centre.fam.D1.lots > 0 ? 0 : 0.5) + (centre.fam.G.lots > 0 ? 0 : 0.5);

  const total = Object.values(parts).reduce((a, b) => a + b, 0);

  return { violation: Math.round(total * 1e6) / 1e6, parts };
};

// Assignment 3's fitOf with the arm's violation; the objectives are NL0's, unchanged (D-6)
export const fitOfArm = (rung: string, id: string, centre: SRec, nb: Nb | null, nbRecs: readonly Rec[] | null, arm: Arm): Fit => {
  const v = violationArm(centre, nb, nbRecs, arm);

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
