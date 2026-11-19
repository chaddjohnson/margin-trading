// Selection policies (PROTOCOL.md §7.1, §7.2): pure, deterministic functions of the §6 feature menu of E(s, c). P0 is
// the unchanged original rule; the experimental policies are added by the Stage 2 freeze (POLICIES.md) and never
// changed afterwards.
import type { Features } from './mechanism.ts';

export type PolicyKey = 'P0' | 'P1' | 'P2' | 'P3';

export interface Choice {
  label: string | null; // null: no selection (flat)
  reason: string;
  scores: { label: string; score: number | null; admissible: boolean }[];
}

export interface Policy {
  key: PolicyKey;
  family: string;
  name: string;
  formula: string;
  choose: (e: readonly Features[]) => Choice;
}

const byLabel = (a: Features, b: Features) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

// The subjects' profitOrder: centre net ↓, selection robust net ↓, centre DD ↑, label ↑.
export const profitOrder = (a: Features, b: Features) =>
  b.centre.net - a.centre.net || b.select.robust - a.select.robust || a.centre.dd - b.centre.dd || byLabel(a, b);

export const P0: Policy = {
  key: 'P0',
  family: 'reference (unchanged original rule)',
  name: 'actual profit',
  formula: 'the highest centre net among E(s, c); ties by the higher selection robust net, the lower centre DD, then the label',
  choose: (e) => {
    const ranked = [...e].sort(profitOrder);

    return {
      label: ranked[0]?.label ?? null,
      reason: ranked.length ? 'highest centre net' : 'E(s, c) empty: no selection',
      scores: ranked.map((f) => ({ label: f.label, score: f.centre.net, admissible: true }))
    };
  }
};

const ceiling = 35_000; // the fixed drawdown budget (PROTOCOL.md §3)

// Ranks by a score (higher is better), ties by the profit order; admissible members only.
const rankBy = (e: readonly Features[], score: (f: Features) => number, admissible: (f: Features) => boolean = () => true) => {
  const rows = e.map((f) => ({ f, score: score(f), ok: admissible(f) && Number.isFinite(score(f)) }));
  const ranked = rows.filter((r) => r.ok).sort((a, b) => b.score - a.score || profitOrder(a.f, b.f));

  return {
    label: ranked[0]?.f.label ?? null,
    scores: [...ranked, ...rows.filter((r) => !r.ok).sort((a, b) => profitOrder(a.f, b.f))].map((r) => ({ label: r.f.label, score: Number.isFinite(r.score) ? r.score : null, admissible: r.ok }))
  };
};

// Frozen by the Stage 2 freeze (POLICIES.md); never changed afterwards.
export const P1: Policy = {
  key: 'P1',
  family: 'severity-aware',
  name: 'tail-mean-constrained actual profit',
  formula:
    'admissible iff the selection family’s worst-10% mean DD (mean of the ⌈0.1 n⌉ largest of the pooled, de-duplicated 2 × 128 selection draws’ maximum minute DDs) ≤ $35,000; the admissible member with the highest centre net (profit order); none admissible → no selection',
  choose: (e) => {
    const r = rankBy(e, (f) => f.centre.net, (f) => f.select.worst10Mean <= ceiling);

    return { ...r, reason: r.label ? 'highest centre net with worst-10% mean DD ≤ $35,000' : e.length ? 'no member admissible: no selection' : 'E(s, c) empty: no selection' };
  }
};

export const P2: Policy = {
  key: 'P2',
  family: 'subperiod consistency',
  name: 'best-year-excluded neighbourhood profit',
  formula: 'the highest median over the pooled selection draws of (draw net − the draw’s best calendar-year marked P&L); ties by profit order',
  choose: (e) => {
    const r = rankBy(e, (f) => f.select.exBestYearMedian ?? NaN);

    return { ...r, reason: r.label ? 'highest best-year-excluded neighbourhood median' : 'E(s, c) empty: no selection' };
  }
};

export const P3: Policy = {
  key: 'P3',
  family: 'episode sensitivity',
  name: 'profit without new funding in the leading episode',
  formula:
    'the highest causal centre net from a rerun refusing every new decision inside the largest winning pool-level episode (first decision session → last exit; no winning episode → the centre net); ties by profit order',
  choose: (e) => {
    const r = rankBy(e, (f) => f.causal.netWithout);

    return { ...r, reason: r.label ? 'highest causal net without the leading episode' : 'E(s, c) empty: no selection' };
  }
};

export const experimental: Policy[] = [P1, P2, P3];

export const allPolicies = () => [P0, ...experimental];
