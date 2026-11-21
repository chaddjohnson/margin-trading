// risk-envelope: THE ONE INTERPRETATION of risk-envelope qualification (GPU Phase 7, research/gpu-phase7/
// RISK_METRIC_INTEGRATION_SPEC.md). A record (CPU or GPU — the two are bit-identical by the parity campaign) is assessed
// against a declared policy by this module only, so the CPU references, the GPU search and every report read the same
// thresholds, denominators, bases, boundary rule and violation formula.
//
//   inputs   record.dd             the conventional maximum minute drawdown of the marked net (the strict tracker), $
//            record.envelope       (only when requested: EvalLab item `risk: true`) the device's risk-envelope inputs,
//                                  $ (definitions: research/vg-l0-risk-metrics/METRIC_SPECIFICATION.md §4–§5):
//              principalLossMarked / principalLossLiquidation   max over funded lots of max(0, −min π_i) / (−min λ_i)
//                                  over every mark of the lot's life and its exit (the marked / liquidation basis)
//              bankedDdMarked / bankedDdLiquidation             max_t [H(t) − M(t)] / [H(t) − M^L(t)],
//                                  H(t) = max(0, max_{u ≤ t} R(u)) — the best banked (realized) level
//   limits   expressed in WHOLE PERCENT of a named denominator and computed as (denominator × pct) / 100 — exact in
//            binary64 for integer percents and whole-dollar denominators (e.g. 40 % of $100,000 = $40,000 exactly):
//              marked DD        ÷ the INITIAL TRADING ALLOCATION C0 (never ÷ peak equity: standard §0.3)
//              principal loss   ÷ the lot's FUNDED ENTRY PRINCIPAL (one fixed slot: every funded lot's principal is C0)
//              banked DD        ÷ the INITIAL TRADING ALLOCATION C0
//   boundary a value EQUAL to its limit passes (value ≤ limit, as the $35,000 rule "DD ≤ $35,000"); the comparison is
//            made in dollars on the unrounded record values — ratios are reported, never compared
//   failure  a missing or invalid envelope where a gate needs it, an envelope that fails the Lab's validity check, a
//            non-finite or negative DD, an unsupported option (whole shares), or an unknown policy throws: nothing is
//            approximated, defaulted or skipped.
//
// This module contains no trading logic and no evaluation; it is not in the GPU evaluation manifest. The policies here
// are PROPOSALS for the risk-envelope pilot's review (research/vg-l0-risk-envelope-pilot/PROTOCOL_PROPOSED.md): nothing
// in it changes the optimization standard, a frozen study or any optimizer default.
import { checkEnvelope } from '../gpu-backend/lab.ts';
import type { Envelope } from '../gpu-backend/batch.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';

export const RISK_ENVELOPE_SPEC = { id: 'risk-envelope', version: '1.0.0' } as const;

export type Basis = 'marked' | 'liquidation';

export interface RiskEnvelopePolicy {
  id: string;
  version: string;
  description: string;
  markedDd: { pct: number }; // ≤ pct % of C0 (the conventional marked maximum minute DD) — always gated
  principalLoss: { pct: number; basis: Basis } | null; // ≤ pct % of each funded lot's entry principal; null = report-only
  bankedDd: { pct: number; basis: Basis } | null; // ≤ pct % of C0; null = report-only
}

// The original research convention (NL0 1.0.0 §3.5, standard §2.1): centre marked DD ≤ 35 % of the fixed $100,000
// principal; no trade principal-loss and no banked-capital gate (both reported only).
export const NL0_CONTROL: RiskEnvelopePolicy = {
  id: 'nl0-control',
  version: '1.0.0',
  description: 'original NL0 convention: marked DD ≤ 35% of C0; principal loss and banked DD report-only',
  markedDd: { pct: 35 },
  principalLoss: null,
  bankedDd: null
};

// The approved experimental envelope (brief §5.2): marked DD ≤ 40 % of C0, every funded lot's principal loss ≤ 25 % of
// its funded principal, banked-capital DD ≤ 25 % of C0. The BASIS of the two new gates is a pilot decision (decision
// register D-3); this proposal uses the liquidation basis (the conservative one: it charges the open shares' exit cost,
// METRIC_SPECIFICATION §4: `principalLossLiq`, §5: BD^L) — the marked variants are reported beside it.
export const RE_EXPERIMENTAL: RiskEnvelopePolicy = {
  id: 're-40-25-25',
  version: '1.0.0',
  description:
    'experimental envelope: marked DD ≤ 40% of C0; trade principal loss ≤ 25% of funded principal; banked DD ≤ 25% of C0 (liquidation basis)',
  markedDd: { pct: 40 },
  principalLoss: { pct: 25, basis: 'liquidation' },
  bankedDd: { pct: 25, basis: 'liquidation' }
};

export const POLICIES: Record<string, RiskEnvelopePolicy> = {
  [NL0_CONTROL.id]: NL0_CONTROL,
  [RE_EXPERIMENTAL.id]: RE_EXPERIMENTAL
};

export const policyById = (id: string) => {
  const p = POLICIES[id];

  if (!p) throw new Error(`unknown risk-envelope policy ${id}`);
  return p;
};

// The capital context of an assessment. One fixed slot: C0 is the pool's budget; every funded lot's entry principal
// equals C0 (fractional shares; no compounding, no downsizing). Whole shares break that identity (principal = shares ×
// fill < C0) and are refused rather than approximated.
export interface CapitalContext {
  initialAllocation: number; // C0, dollars
  fundedPrincipal: 'fixed-budget';
}

export const RESEARCH_CAPITAL: CapitalContext = { initialAllocation: 100_000, fundedPrincipal: 'fixed-budget' };

export const capitalContext = (c0: number): CapitalContext => {
  if (!(Number.isFinite(c0) && c0 > 0 && Number.isInteger(c0)))
    throw new Error(`initial allocation ${c0}: a whole positive dollar amount is required`);
  return { initialAllocation: c0, fundedPrincipal: 'fixed-budget' };
};

export const assertSupportedOptions = (o: EvalOptions) => {
  if (o.wholeShares)
    throw new Error(
      'risk-envelope qualification: whole shares make a lot’s funded principal differ from C0 — unsupported (fail closed)'
    );
};

// pct % of a denominator, exactly: (denominator × pct) / 100
export const limitOf = (pct: number, denominator: number) => {
  if (!(Number.isInteger(pct) && pct > 0 && pct <= 100))
    throw new Error(`threshold ${pct}%: a whole percent in 1–100 is required`);
  return (denominator * pct) / 100;
};

export interface Check {
  metric: 'markedDd' | 'principalLoss' | 'bankedDd';
  basis: Basis;
  value: number; // dollars, the unrounded record value
  denominator: number; // dollars (C0 or the funded principal)
  denominatorName: 'initial allocation C0' | 'funded entry principal';
  ratio: number; // value ÷ denominator (reported, never compared)
  pct: number | null; // the threshold in whole percent; null = report-only
  limit: number | null; // dollars
  pass: boolean | null; // null = report-only
  excess: number; // max(0, value − limit) ÷ limit (0 when report-only)
}

export interface Assessment {
  policy: string; // id@version
  spec: string;
  capital: CapitalContext;
  checks: Check[];
  pass: boolean; // every gated check passes
  violation: number; // Σ of the gated excesses (0 iff pass) — the envelope's normalized violation
}

export interface Assessable {
  dd: number;
  envelope?: Envelope;
}

const finiteNonNegative = (x: unknown, what: string) => {
  if (typeof x !== 'number' || !Number.isFinite(x) || x < 0)
    throw new Error(`${what} = ${String(x)} is not a finite number ≥ 0`);
  return x;
};

const check = (
  metric: Check['metric'],
  basis: Basis,
  value: number,
  denominator: number,
  gate: { pct: number } | null
): Check => {
  const name = metric === 'principalLoss' ? 'funded entry principal' : 'initial allocation C0';

  if (!gate)
    return {
      metric,
      basis,
      value,
      denominator,
      denominatorName: name,
      ratio: value / denominator,
      pct: null,
      limit: null,
      pass: null,
      excess: 0
    };

  const limit = limitOf(gate.pct, denominator);

  return {
    metric,
    basis,
    value,
    denominator,
    denominatorName: name,
    ratio: value / denominator,
    pct: gate.pct,
    limit,
    pass: value <= limit,
    excess: Math.max(0, value - limit) / limit
  };
};

// Assess one record. The envelope is required when the policy gates on it; when present it is always validated and
// its four values reported (both bases), whatever the policy.
export const assess = (
  r: Assessable,
  policy: RiskEnvelopePolicy,
  ctx: CapitalContext = RESEARCH_CAPITAL,
  where = 'record'
): Assessment => {
  if (ctx.fundedPrincipal !== 'fixed-budget')
    throw new Error(`unsupported funded-principal model ${String(ctx.fundedPrincipal)}`);

  const c0 = ctx.initialAllocation;
  const dd = finiteNonNegative(r.dd, `${where}: dd`);
  const needs = policy.principalLoss !== null || policy.bankedDd !== null;
  const env = r.envelope === undefined ? null : checkEnvelope(r.envelope, where);

  if (needs && !env)
    throw new Error(
      `${where}: policy ${policy.id} gates on the risk envelope but the record carries none (request it with risk: true)`
    );

  const checks: Check[] = [check('markedDd', 'marked', dd, c0, policy.markedDd)];

  if (env) {
    const pl = policy.principalLoss;
    const bd = policy.bankedDd;

    for (const basis of ['marked', 'liquidation'] as const) {
      checks.push(
        check(
          'principalLoss',
          basis,
          basis === 'marked' ? env.principalLossMarked : env.principalLossLiquidation,
          c0,
          pl && pl.basis === basis ? pl : null
        ),
        check(
          'bankedDd',
          basis,
          basis === 'marked' ? env.bankedDdMarked : env.bankedDdLiquidation,
          c0,
          bd && bd.basis === basis ? bd : null
        )
      );
    }
  }

  const gated = checks.filter((c) => c.pass !== null);

  return {
    policy: `${policy.id}@${policy.version}`,
    spec: `${RISK_ENVELOPE_SPEC.id}@${RISK_ENVELOPE_SPEC.version}`,
    capital: ctx,
    checks,
    pass: gated.every((c) => c.pass === true),
    violation: gated.reduce((a, c) => a + c.excess, 0)
  };
};

// Neighbourhood statistics of the envelope (the same quantile — linear interpolation between order statistics — as the
// neighbourhood DD, src/vg-d1-growth-joint/fitness.ts): p90, p95, worst and the worst-10 % mean of each input, and the
// share of neighbours that fail the policy. Every neighbour must carry a valid envelope.
export const envelopeNbStats = (
  nbs: readonly Assessable[],
  policy: RiskEnvelopePolicy,
  ctx: CapitalContext = RESEARCH_CAPITAL
) => {
  if (!nbs.length) throw new Error('envelope neighbourhood statistics need at least one neighbour');

  const a = nbs.map((r, i) => assess(r, policy, ctx, `neighbour ${i}`));
  const col = (metric: Check['metric'], basis: Basis) =>
    a.map((x) => x.checks.find((c) => c.metric === metric && c.basis === basis)?.value ?? NaN).sort((p, q) => p - q);
  const stat = (xs: number[]) => {
    if (xs.some((x) => !Number.isFinite(x))) return null;

    const k = Math.ceil(0.1 * xs.length);

    return {
      p90: quantile(xs, 0.9),
      p95: quantile(xs, 0.95),
      worst: xs[xs.length - 1]!,
      worst10Mean: xs.slice(xs.length - k).reduce((s, x) => s + x, 0) / k
    };
  };

  return {
    n: nbs.length,
    failShare: a.filter((x) => !x.pass).length / a.length,
    markedDd: stat(col('markedDd', 'marked')),
    principalLoss: {
      marked: stat(col('principalLoss', 'marked')),
      liquidation: stat(col('principalLoss', 'liquidation'))
    },
    bankedDd: { marked: stat(col('bankedDd', 'marked')), liquidation: stat(col('bankedDd', 'liquidation')) }
  };
};
