// Feasibility and constrained violation of an ARM (PROTOCOL.md §8): the pilot's fitness under P0 (Stage B's CTRL policy:
// nl0-control@1.0.0 — the marked DD ≤ $35,000, NL0's neighbourhood instrument; src/vg-l0-risk-envelope-pilot/fitness.ts,
// imported for every term) with ONE change: NL0's structure need "both families funded" (a D1 book and Growth·VGT;
// `r.mixed`) becomes "every family of the arm funded":
//   arm D  D1·MSFT funded;  arm G  Growth·MSFT funded;  arms C, J, S  both MSFT books funded (NL0's need, unchanged).
// The structure term of the violation is 0.5 per unfunded required family (NL0's per-family weight); everything else —
// the objectives (−centre net, −robust net, p90 DD), the net term, the centre DD term, the neighbourhood p90 term with
// Priority 3's cent-rounded statistic, centre-first fidelity's unmeasured penalty 1, the 1e-6 rounding — is the pilot's
// under P0 exactly (tests/fitness.test.ts: for a both-families arm every function equals the pilot's under CTRL).
import type { Rec } from '../vg-d1-growth-joint/evaluate.ts';
import type { SRec } from '../vg-l0-full-joint/evaluate.ts';
import { type Fit, type Nb } from '../vg-l0-full-joint/fitness.ts';
import {
  assessArm,
  failingMetrics,
  violationArm as pilotViolationArm
} from '../vg-l0-risk-envelope-pilot/fitness.ts';
import { economics } from '../vg-l0-full-joint/context.ts';
import type { Family, MsftArm } from './context.ts';

export type { Fit, Nb };

const famLots = (r: Rec, f: Family) => (f === 'D1' ? r.fam.D1.lots : r.fam.G.lots);

// every family the arm requires received capital at the centre
export const armFunded = (r: Rec, arm: Pick<MsftArm, 'families'>) => arm.families.every((f) => famLots(r, f) > 0);
const structurePart = (r: Rec, arm: Pick<MsftArm, 'families'>) => arm.families.reduce((a, f) => a + (famLots(r, f) > 0 ? 0 : 0.5), 0);

// plausibility: the pilot's conjunction, with the arm's families
export const plausibleArm = (r: Rec, arm: MsftArm) => !r.error && r.net > 0 && assessArm(r, arm, 'plausibility').pass && armFunded(r, arm);

const reasonOfMetric: Record<string, string> = { markedDd: 'DD > ceiling', principalLoss: 'PL > limit', bankedDd: 'BD > limit' };

export const screenReason = (r: Rec, arm: MsftArm) => {
  if (r.error) return 'error';
  if (r.lots === 0) return 'no funded lot';
  if (!armFunded(r, arm)) return 'a family unfunded';
  if (r.net <= 0) return 'net ≤ 0';

  const failing = failingMetrics(r, arm);

  return failing.length ? failing.map((m) => reasonOfMetric[m]).join(' & ') : 'plausible';
};

// the screen's normalized violation of an implausible centre (the pilot's expression: a flat 0.5 when the structure need
// fails — NL0's `r.mixed ? 0 : 0.5` — with the arm's families; an error record keeps the pilot's 0.5)
export const screenViolation = (r: Rec, arm: MsftArm) => {
  const net = r.error ? 1 : Math.max(0, -r.net) / economics.budget + (r.net > 0 ? 0 : 0.01);
  const m = arm.markedDdLimit;
  const env = r.error ? Math.max(0, r.dd - m) / m : assessArm(r, arm, 'screen').violation;

  return net + env + (r.error ? 0.5 : armFunded(r, arm) ? 0 : 0.5);
};

// the rung fit's violation: the pilot's parts under P0 with the arm's structure term
export const violationArm = (centre: Rec, nb: Nb | null, nbRecs: readonly Rec[] | null, arm: MsftArm) => {
  const v = pilotViolationArm(centre, nb, nbRecs, arm);
  const parts = { ...v.parts, structure: centre.error ? 1 : structurePart(centre, arm) };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);

  return { violation: Math.round(total * 1e6) / 1e6, parts };
};

// NL0's fit (objectives unchanged) with the arm's violation
export const fitOfArm = (rung: string, id: string, centre: SRec, nb: Nb | null, nbRecs: readonly Rec[] | null, arm: MsftArm): Fit => {
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
