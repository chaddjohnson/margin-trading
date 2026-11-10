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

// Filled by the Stage 2 freeze.
export const experimental: Policy[] = [];

export const allPolicies = () => [P0, ...experimental];
