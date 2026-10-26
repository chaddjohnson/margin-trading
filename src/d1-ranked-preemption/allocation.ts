// The study's allocation policies (research/d1-ranked-preemption/PROTOCOL.md §5) and the one liquidation formula the
// derived engine (./engine.ts) and the derived replay (./replay.ts) share, so the preemption test and the ledger that
// books the exit compute the same double.
//
//   P0   the frozen shadow policy, unchanged: one lot or reservation; same-minute decisions in alphabetical order.
//   P0R  P0, except that same-minute decisions are answered in the frozen priority order (no preemption).
//   P1   P0R plus net-breakeven preemption: a fresh signal of a strictly higher-priority book, while exactly one funded
//        lot (and no reservation and no pending preemption) holds the pool, starts a preemption if the lot's
//        liquidation net at the last price — after both per-side frictions and the interest through the session
//        date — is at least the threshold (P1: $0). The lot is sold at its own first trade at or after the decision
//        only if the net at that fill is still at least the threshold; the replacement is funded at its own virtual
//        fill only if the lot was sold (or exited on its own rule) before that fill — at the same print only in
//        continuous trading, never at an auction print (closing print, or a later session's opening trade). Otherwise
//        the switch aborts and nothing else changes.
//   P1-B250, P1-B500  P1 with a $250 / $500 threshold: frozen secondary sensitivities, never selected or fitted.
import { secondsPerYear } from '../shared-margin-portfolio/strategy.ts';

export type PolicyKey = 'P0' | 'P0R' | 'P1' | 'P1-B250' | 'P1-B500';

export const policyKeys: readonly PolicyKey[] = ['P0', 'P0R', 'P1', 'P1-B250', 'P1-B500'];

export interface PolicySpec {
  key: PolicyKey;
  rankedTies: boolean; // same-minute decisions answered in the priority order
  preemption: boolean;
  thresholdDollars: number; // the minimum liquidation net (fixed pool dollars; the portfolio uses the same rule)
}

export const policies: Record<PolicyKey, PolicySpec> = {
  P0: { key: 'P0', rankedTies: false, preemption: false, thresholdDollars: 0 },
  P0R: { key: 'P0R', rankedTies: true, preemption: false, thresholdDollars: 0 },
  P1: { key: 'P1', rankedTies: true, preemption: true, thresholdDollars: 0 },
  'P1-B250': { key: 'P1-B250', rankedTies: true, preemption: true, thresholdDollars: 250 },
  'P1-B500': { key: 'P1-B500', rankedTies: true, preemption: true, thresholdDollars: 500 }
};

export const preemptionReason = 'priority_preemption';

// A frozen priority ranking resolved for one run: `order` holds every book, highest priority first. A global ranking
// (./ranking.ts) is resolved to a pool by keeping its members in the global order.
export interface Priority {
  rankingId: string; // e.g. "final/R1#<body hash>"
  order: readonly string[];
  scores?: Readonly<Record<string, number | null>>; // the ranking's scores (recorded in preemption records only)
}

export interface Allocation {
  policy: PolicySpec;
  priority?: Priority; // required unless the policy is P0
}

export const p0Allocation: Allocation = { policy: policies.P0 };

export const allocationOf = (key: PolicyKey, priority?: Priority): Allocation => {
  const policy = policies[key];

  if (!policy) {
    throw new Error(`Unknown allocation policy ${key}`);
  }

  if (key !== 'P0' && !priority) {
    throw new Error(`${key} needs a frozen priority ranking`);
  }

  return priority ? { policy, priority } : { policy };
};

// Position of each book in the priority order (0 = highest). Every book must be ranked exactly once.
export const priorityPositions = (symbols: readonly string[], priority: Priority): Map<string, number> => {
  const positions = new Map<string, number>();

  priority.order.forEach((symbol, index) => {
    if (positions.has(symbol)) {
      throw new Error(`${priority.rankingId}: ${symbol} is ranked twice`);
    }

    positions.set(symbol, index);
  });

  for (const symbol of symbols) {
    if (!positions.has(symbol)) {
      throw new Error(`${priority.rankingId}: the book ${symbol} has no frozen rank`);
    }
  }

  return positions;
};

// A pool's members in a global ranking's order (the pool inherits the relative order of its members).
export const resolvePriority = (
  rankingId: string,
  globalOrder: readonly string[],
  members: readonly string[],
  scores?: Readonly<Record<string, number | null>>
): Priority => {
  const order = globalOrder.filter((symbol) => members.includes(symbol));

  if (order.length !== new Set(members).size) {
    const missing = members.filter((symbol) => !globalOrder.includes(symbol));

    throw new Error(`${rankingId} does not rank ${missing.join(', ')}`);
  }

  return scores
    ? { rankingId, order, scores: Object.fromEntries(order.map((symbol) => [symbol, scores[symbol] ?? null])) }
    : { rankingId, order };
};

// The fixed ledger's liquidation net of a lot at a raw fill price, exactly as FixedLedger.closeLot computes it (same
// operations in the same order): sell price after the per-side friction, proceeds, simple interest from the entry
// session's date to the exit session's date on the principal, net = proceeds − principal − interest. The entry
// friction is already inside the lot's shares (principal ÷ the cost-adjusted entry price).
export interface FixedLotLike {
  shares: number;
  principal: number;
  entryTimestamp: number;
}

export const fixedLiquidation = (
  lot: FixedLotLike,
  rawPrice: number,
  sessionTime: number,
  rate: number,
  costBps: number,
  extraSlippage = 0
) => {
  const price = rawPrice * (1 - costBps / 10000) * (1 - extraSlippage);
  const proceeds = lot.shares * price;
  const interest = lot.principal * rate * ((sessionTime - lot.entryTimestamp) / secondsPerYear);

  return { price, proceeds, interest, net: proceeds - lot.principal - interest };
};

// The portfolio ledger's liquidation net (NPortfolioLedger.closeLot without the cash movements): interest accrued
// since the accrual start plus any accrued before it; net against the original principal.
export interface PortfolioLotLike {
  shares: number;
  principal: number;
  originalPrincipal: number;
  accruedBefore: number;
  accrualStart: number;
  repaidByCore: number;
}

export const portfolioLiquidation = (
  lot: PortfolioLotLike,
  rawPrice: number,
  sessionTime: number,
  rate: number,
  costBps: number
) => {
  const price = rawPrice * (1 - costBps / 10000) * (1 - 0);
  const proceeds = lot.shares * price;
  const interest = lot.accruedBefore + lot.principal * rate * ((sessionTime - lot.accrualStart) / secondsPerYear);
  const owed = lot.principal + interest;
  const net = lot.repaidByCore > 0 ? proceeds - lot.originalPrincipal - interest : proceeds - owed;

  return { price, proceeds, interest, net };
};
