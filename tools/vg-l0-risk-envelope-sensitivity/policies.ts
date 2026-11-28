// RES-A 1.0.0 (research/vg-l0-risk-envelope-sensitivity/POLICY_MATRIX.md): the nine predeclared risk-envelope policies of
// the Stage A sensitivity audit, as RiskEnvelopePolicy values for the UNCHANGED src/risk-envelope/policy.ts `assess` (the
// one interpretation: limits = (denominator × pct) / 100 on named denominators, a value equal to its limit passes,
// dollars on unrounded record values). policy.ts is not edited; P0 and P2 are its own NL0_CONTROL and RE_EXPERIMENTAL
// objects (asserted below). P3–P8 are retrospective, report-only counterfactuals — never an approved constraint.
//
// Each policy also gets an "arm" in the pilot's shape (src/vg-l0-risk-envelope-pilot/context.ts Arm), so the pilot's own
// feasibility code (fitness.ts plausibleArm / violationArm) and qualification verdict (qualify.ts verdictOf) can be
// reused verbatim with the policy substituted:
//   P0      neighbourhood instrument 'nl0' (Priority 3's nbStats p90 DD, rounded to cents — CTRL's frozen instrument)
//   P1–P8   neighbourhood instrument 'unrounded' (the unrounded p90 of every gated metric — EXP's instrument)
// `armOf(p, instrument)` builds the same policy under the other instrument for the instrument cross-check.
import { isDeepStrictEqual } from 'node:util';
import { NL0_CONTROL, RE_EXPERIMENTAL, type RiskEnvelopePolicy, limitOf } from '../../src/risk-envelope/policy.ts';
import { type Arm, C0 } from '../../src/vg-l0-risk-envelope-pilot/context.ts';

const liq = 'liquidation' as const;
const mk = (id: string, description: string, dd: number, pl: number | null, bd: number | null): RiskEnvelopePolicy => ({
  id,
  version: '1.0.0',
  description,
  markedDd: { pct: dd },
  principalLoss: pl === null ? null : { pct: pl, basis: liq },
  bankedDd: bd === null ? null : { pct: bd, basis: liq }
});

export type PolicyKey = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8';
export const policyKeys: readonly PolicyKey[] = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
export const primaryKeys: readonly PolicyKey[] = ['P0', 'P1', 'P2', 'P3', 'P4'];
export const ablationKeys: readonly PolicyKey[] = ['P5', 'P6', 'P7', 'P8'];

export const policies: Record<PolicyKey, RiskEnvelopePolicy> = {
  P0: NL0_CONTROL,
  P1: mk('sens-p1-dd40', 'marked DD ≤ 40% of C0 only', 40, null, null),
  P2: RE_EXPERIMENTAL,
  P3: mk('sens-p3-40-25-30', 'marked DD ≤ 40% of C0; trade PL ≤ 25% of funded principal; banked DD ≤ 30% of C0 (liquidation)', 40, 25, 30),
  P4: mk('sens-p4-40-25-35', 'marked DD ≤ 40% of C0; trade PL ≤ 25% of funded principal; banked DD ≤ 35% of C0 (liquidation)', 40, 25, 35),
  P5: mk('sens-p5-40-pl25', 'marked DD ≤ 40% of C0; trade PL ≤ 25% of funded principal (liquidation)', 40, 25, null),
  P6: mk('sens-p6-40-bd25', 'marked DD ≤ 40% of C0; banked DD ≤ 25% of C0 (liquidation)', 40, null, 25),
  P7: mk('sens-p7-40-bd30', 'marked DD ≤ 40% of C0; banked DD ≤ 30% of C0 (liquidation)', 40, null, 30),
  P8: mk('sens-p8-40-bd35', 'marked DD ≤ 40% of C0; banked DD ≤ 35% of C0 (liquidation)', 40, null, 35)
};

// the predeclared matrix, checked at import (a typo here would silently change the study)
const expected: Record<PolicyKey, [number, number | null, number | null]> = {
  P0: [35, null, null],
  P1: [40, null, null],
  P2: [40, 25, 25],
  P3: [40, 25, 30],
  P4: [40, 25, 35],
  P5: [40, 25, null],
  P6: [40, null, 25],
  P7: [40, null, 30],
  P8: [40, null, 35]
};

for (const k of policyKeys) {
  const p = policies[k];
  const [dd, pl, bd] = expected[k];

  if (p.markedDd.pct !== dd || (p.principalLoss?.pct ?? null) !== pl || (p.bankedDd?.pct ?? null) !== bd)
    throw new Error(`policy ${k} differs from POLICY_MATRIX.md`);
  if ((p.principalLoss && p.principalLoss.basis !== liq) || (p.bankedDd && p.bankedDd.basis !== liq))
    throw new Error(`policy ${k}: the gated PL / BD must be on the liquidation basis`);
  if (p.bankedDd && p.bankedDd.pct > 35) throw new Error(`policy ${k}: no banked ceiling above 35 % (brief §2)`);
}
if (!isDeepStrictEqual(policies.P0, NL0_CONTROL) || policies.P0 !== NL0_CONTROL) throw new Error('P0 must be NL0_CONTROL');
if (!isDeepStrictEqual(policies.P2, RE_EXPERIMENTAL) || policies.P2 !== RE_EXPERIMENTAL) throw new Error('P2 must be RE_EXPERIMENTAL');

export type Instrument = Arm['nbInstrument'];
export const instrumentOf = (k: PolicyKey): Instrument => (k === 'P0' ? 'nl0' : 'unrounded');

// an Arm in the pilot's shape for the policy (the key only labels errors; ra1S4 is not used by any audit computation)
export const armOf = (k: PolicyKey, instrument: Instrument = instrumentOf(k)): Arm => {
  const p = policies[k];

  if (instrument === 'nl0' && (p.principalLoss || p.bankedDd))
    throw new Error(`${k}: the NL0 cents instrument gates only the marked DD`);
  return {
    key: k as never,
    policy: p,
    markedDdLimit: limitOf(p.markedDd.pct, C0),
    ra1S4: { original: limitOf(NL0_CONTROL.markedDd.pct, C0), adapted: null },
    nbInstrument: instrument
  };
};

export const arms = Object.fromEntries(policyKeys.map((k) => [k, armOf(k)])) as Record<PolicyKey, Arm>;

// the other instrument, where it is defined (P1, the only DD-only relaxed policy, and P0 can be read under both; an
// envelope policy cannot be read under the cents DD-only instrument)
export const otherInstrumentArm = (k: PolicyKey): Arm | null => {
  const p = policies[k];

  if (k === 'P0') return armOf(k, 'unrounded');
  if (!p.principalLoss && !p.bankedDd) return armOf(k, 'nl0');
  return null;
};

export const limits = (k: PolicyKey) => {
  const p = policies[k];

  return {
    dd: limitOf(p.markedDd.pct, C0),
    pl: p.principalLoss ? limitOf(p.principalLoss.pct, C0) : null,
    bd: p.bankedDd ? limitOf(p.bankedDd.pct, C0) : null
  };
};

export const policyTable = () =>
  policyKeys.map((k) => ({
    key: k,
    id: `${policies[k].id}@${policies[k].version}`,
    description: policies[k].description,
    instrument: instrumentOf(k),
    pct: { dd: policies[k].markedDd.pct, pl: policies[k].principalLoss?.pct ?? null, bd: policies[k].bankedDd?.pct ?? null },
    limits: limits(k),
    role: primaryKeys.includes(k) ? 'primary' : 'diagnostic ablation'
  }));
