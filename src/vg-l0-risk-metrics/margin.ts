// A parameterized, research-only ACCOUNT-LEVEL margin scenario model (PROTOCOL.md §7; METRIC_SPECIFICATION.md §8).
// It is NOT a broker system, NOT the user's account and NOT a prediction of when a broker calls or liquidates. It is
// kept apart from the fixed-slot ledger: the strategy enters only as a position bought with a $100,000 loan and its
// realized net held as cash (or owed when negative).
//
// UNITS: dollars; maintenance rates and shocks are fractions (0.35 = 35%; a shock of 0.2 = a 20% decline).
//   market value MV = Σ q·x;  equity E = MV + cash − debt − accrued interest;  requirement Req = Σ q·x·m_i;
//   excess = E − Req (a deficiency when negative);  equity ratio = E ÷ MV;  headroom (points) = E ÷ MV − Req ÷ MV.
// A position's rate m_i = its own rate, else the account's default; a non-marginable position has m = 1 (no loan value);
// a concentration rule raises m_i to its rate when the position's share of MV exceeds the trigger (both are scenario
// parameters: the broker's trigger is not published).

export interface Position {
  symbol: string;
  quantity: number;
  price: number;
  marginable?: boolean; // default true
  maintenance?: number; // overrides the account default
}

export interface Account {
  positions: Position[];
  cash: number;
  debt: number;
  accruedInterest?: number;
  maintenance: number; // default rate for marginable positions
  concentration?: { trigger: number; maintenance: number } | null; // share of MV above which a position's rate rises
}

export type Shocks = Record<string, number>; // symbol → decline fraction

const rateOf = (a: Account, p: Position, mv: number, total: number) => {
  if (p.marginable === false) return 1;

  let m = p.maintenance ?? a.maintenance;

  if (a.concentration && total > 0 && mv / total > a.concentration.trigger) m = Math.max(m, a.concentration.maintenance);
  return m;
};

export const evaluateAccount = (a: Account, shocks: Shocks = {}) => {
  // aggregate by symbol first (a concentration rule applies to the whole holding of a security)
  const bySym = new Map<string, Position>();

  for (const p of a.positions) {
    const x = p.price * (1 - (shocks[p.symbol] ?? 0));
    const prev = bySym.get(p.symbol);

    if (prev && (prev.marginable !== p.marginable || prev.maintenance !== p.maintenance)) throw new Error(`${p.symbol}: inconsistent margin terms`);
    bySym.set(p.symbol, { ...p, quantity: (prev?.quantity ?? 0) + p.quantity, price: x });
  }

  const rows = [...bySym.values()].map((p) => ({ symbol: p.symbol, value: p.quantity * p.price, p }));
  const mv = rows.reduce((s, r) => s + r.value, 0);
  const byPosition = rows.map((r) => {
    const m = rateOf(a, r.p, r.value, mv);

    return { symbol: r.symbol, value: r.value, share: mv > 0 ? r.value / mv : 0, maintenance: m, requirement: r.value * m };
  });
  const req = byPosition.reduce((s, r) => s + r.requirement, 0);
  const equity = mv + a.cash - a.debt - (a.accruedInterest ?? 0);

  return {
    marketValue: mv,
    equity,
    requirement: req,
    excess: equity - req,
    deficient: equity - req < 0,
    equityRatio: mv > 0 ? equity / mv : null,
    requirementRatio: mv > 0 ? req / mv : null,
    headroomPoints: mv > 0 ? (equity - req) / mv : null,
    byPosition
  };
};

// The smallest common shock s (each symbol's decline = s × its weight; default weight 1 for every symbol) at which the
// modelled excess reaches 0, by bisection (the requirement can jump with a concentration rule, so no closed form is
// assumed). 0 when already deficient; null when no deficiency occurs before a weighted symbol reaches −100%.
export const firstDeficiencyShock = (a: Account, weights: Record<string, number> | null = null) => {
  const syms = [...new Set(a.positions.map((p) => p.symbol))];
  const w = (s: string) => (weights ? (weights[s] ?? 0) : 1);
  const maxW = Math.max(...syms.map(w));

  if (!(maxW > 0)) return null;

  const at = (s: number) => evaluateAccount(a, Object.fromEntries(syms.map((x) => [x, Math.min(1, s * w(x))]))).excess;

  if (at(0) < 0) return 0;

  const hi = 1 / maxW;

  if (at(hi) >= 0) return null;

  let lo = 0;
  let up = hi;

  for (let i = 0; i < 200 && up - lo > 1e-12; i++) {
    const mid = (lo + up) / 2;

    if (at(mid) < 0) up = mid;
    else lo = mid;
  }
  return up;
};

// Closed form for the linear case (one common shock, no concentration rule, every position marginable at rate m):
// E(s) = (1 − s)·MV + cash − debt − I, Req(s) = m(1 − s)·MV  ⇒  s* = 1 − (debt + I − cash) ÷ ((1 − m)·MV).
export const linearDeficiencyShock = (mv: number, cash: number, debt: number, interest: number, m: number) => {
  const net = debt + interest - cash;

  if (net <= 0) return null;
  return 1 - net / ((1 - m) * mv);
};

// The illustrative core-plus-strategy account (PROTOCOL.md §7): a core of `core` dollars, `voogShare` in VOOG and the
// rest in VGT (prices normalized to 1 at the scenario date unless given), the strategy's traded ETF position of market
// value `slotValue` bought with the ledger's loan `slotLoan`, the strategy's realized net as cash, other debt.
export interface Scenario {
  core: number;
  voogShare: number;
  tradedSymbol: 'VGT' | 'GDX' | null; // null: the slot is flat
  slotValue: number;
  slotLoan: number;
  slotInterest: number;
  realized: number; // the strategy's banked net (cash when positive, owed when negative)
  otherDebt: number;
  maintenance: number;
  concentration?: { trigger: number; maintenance: number } | null;
}

export const scenarioAccount = (s: Scenario): Account => ({
  positions: [
    { symbol: 'VOOG', quantity: s.core * s.voogShare, price: 1 },
    { symbol: 'VGT', quantity: s.core * (1 - s.voogShare), price: 1 },
    ...(s.tradedSymbol && s.slotValue > 0 ? [{ symbol: s.tradedSymbol, quantity: s.slotValue, price: 1 }] : [])
  ],
  cash: Math.max(0, s.realized),
  debt: s.otherDebt + (s.tradedSymbol ? s.slotLoan : 0) + Math.max(0, -s.realized),
  accruedInterest: s.tradedSymbol ? s.slotInterest : 0,
  maintenance: s.maintenance,
  concentration: s.concentration ?? null
});
