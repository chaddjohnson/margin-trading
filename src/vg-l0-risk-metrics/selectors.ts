// The experimental selectors of PROTOCOL.md §9 (FROZEN before any of their results): P2 (capital-and-stop-aware,
// MDD-hard; = P2a), P2b (alternative constraint: relaxed conventional DD with principal-loss and banked-capital gates)
// and the report-only ablations P2−tier, P2−stop, P2@25k. EXPERIMENTAL AND NOT ADOPTED. The controls P0 (NL0 original)
// and P1 (RA1) are Assignment 3's code, imported unchanged by the stage runner.
//
// Every input is a member's training evidence at its cutoff: Assignment 3's archived gates and statistics, and this
// study's replay of the same centre on the same cutoff door (members-<C>.json `p2`).

export interface MemberView {
  label: string;
  qualified: boolean;
  failed: string[]; // Assignment 3's failed gates (Q1–Q6)
  centre: { net: number; dd: number };
  select: { robust: number; p90Dd: number };
  confirm: { p90Dd: number; p10: number };
  stress10: { net: number; dd: number } | null;
  ra1: { conservativeNet: number };
  p2: { principalLossMax: number; bankedDd: number; cnStar: number; bounded: boolean };
}

export interface P2Spec {
  name: string;
  principalLossCap: number; // G1
  bankedDdCap: number; // G2
  relaxedDd: number | null; // P2b: centre, 10 bps and confirmation p90 DD caps replacing Q2/Q3/Q5's DD part
  tier: boolean; // bounded-loss-exit tier first
  value: 'cnStar' | 'ra1'; // the band's valuation
  band: number;
}

export const p2Specs: Record<string, P2Spec> = {
  P2: { name: 'P2 (= P2a, capital-and-stop-aware, MDD-hard)', principalLossCap: 35_000, bankedDdCap: 35_000, relaxedDd: null, tier: true, value: 'cnStar', band: 0.05 },
  P2b: { name: 'P2b (alternative constraint: relaxed conventional DD $50,000 with G1/G2)', principalLossCap: 35_000, bankedDdCap: 35_000, relaxedDd: 50_000, tier: true, value: 'cnStar', band: 0.05 },
  'P2-tier': { name: 'P2−tier (report-only ablation: no bounded-loss-exit tier)', principalLossCap: 35_000, bankedDdCap: 35_000, relaxedDd: null, tier: false, value: 'cnStar', band: 0.05 },
  'P2-stop': { name: 'P2−stop (report-only ablation: RA1’s conservative net, no stop credit)', principalLossCap: 35_000, bankedDdCap: 35_000, relaxedDd: null, tier: true, value: 'ra1', band: 0.05 },
  'P2@25k': { name: 'P2@25k (report-only: G1 and G2 at $25,000)', principalLossCap: 25_000, bankedDdCap: 25_000, relaxedDd: null, tier: true, value: 'cnStar', band: 0.05 }
};

export const eligibleP2 = (m: MemberView, s: P2Spec) => {
  const gates = m.p2.principalLossMax <= s.principalLossCap && m.p2.bankedDd <= s.bankedDdCap;

  if (s.relaxedDd === null) return m.qualified && gates;

  const cap = s.relaxedDd;
  const ok =
    !m.failed.includes('Q1') &&
    !m.failed.includes('Q4') &&
    !m.failed.includes('Q6') &&
    m.centre.net > 0 &&
    m.centre.dd <= cap &&
    m.confirm.p90Dd <= cap &&
    m.stress10 !== null &&
    m.stress10.net > 0 &&
    m.stress10.dd <= cap;

  return ok && gates;
};

const byLabel = (a: MemberView, b: MemberView) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0);

// The complete order (the first is the primary); an empty list = no eligible member (no primary).
export const p2Order = (members: readonly MemberView[], s: P2Spec): MemberView[] => {
  const value = (m: MemberView) => (s.value === 'cnStar' ? m.p2.cnStar : m.ra1.conservativeNet);
  const left = members.filter((m) => eligibleP2(m, s));
  const out: MemberView[] = [];

  while (left.length) {
    const group = s.tier && left.some((m) => m.p2.bounded) ? left.filter((m) => m.p2.bounded) : left;
    const best = Math.max(...group.map(value));
    const floor = best >= 0 ? best * (1 - s.band) : best * (1 + s.band);
    const band = group.filter((m) => value(m) >= floor - 1e-9);

    band.sort(
      (a, b) =>
        a.p2.bankedDd - b.p2.bankedDd ||
        a.p2.principalLossMax - b.p2.principalLossMax ||
        value(b) - value(a) ||
        b.select.robust - a.select.robust ||
        a.centre.dd - b.centre.dd ||
        byLabel(a, b)
    );

    const pick = band[0]!;

    out.push(pick);
    left.splice(left.indexOf(pick), 1);
  }
  return out;
};
