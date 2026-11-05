// The shapes of the stored Growth trading artifacts (runner/trading-run.ts) as the exporter and the comparison read them.
// Every field is optional: older runs (Growth 1.0.0, imports, pool reruns) lack some, and a reader must say what is
// missing instead of assuming it.

export interface OriginAttribution {
  entries: number;
  closed: number;
  open: number;
  wins: number;
  losses: number;
  breakeven: number;
  realizedNetUsd: number;
  realizedGrossBeforeCostsUsd: number;
  realizedCostsUsd: number;
  realizedInterestUsd: number;
  unrealizedNetUsd: number;
}

export interface ContinuationCounts {
  enabled: boolean;
  method?: string;
  qualifyingExits?: number;
  episodes?: number;
  endedBy?: Record<string, number>;
  armed?: number;
  filled?: number;
  suppressedBasePriority?: number;
  expiredWithLaterHigherHigh?: number;
}

export interface SymbolMetrics {
  pnl?: {
    totalMarkedNetUsd?: number;
    realizedNetUsd?: number;
    unrealized?: { netUsd?: number } | null;
    realizedGrossBeforeCostsUsd?: number;
    totalCostsUsd?: number;
    totalInterestUsd?: number;
  };
  trades?: {
    filled?: number;
    closed?: number;
    wins?: number;
    losses?: number;
    winRatePercent?: number | null;
    worstNetUsd?: number | null;
  };
  holding?: { meanCalendarDays?: number | null };
  occupancy?: { sessionsInvestedPercent?: number | null; sessionsInvested?: number };
  drawdown?: { minute?: { maximumUsd?: number }; daily?: { maximumUsd?: number } };
  attribution?: { note: string; byOrigin: Record<string, OriginAttribution> };
  continuation?: ContinuationCounts;
  entryGates?: EntryGateCounts; // Growth 1.2.0, only with the trend filter or eligibility ON
  signals?: { raw?: number; filled?: number; rejected?: number; vetoed?: number; deferred?: number; vetoedByReason?: Record<string, number> };
}

export interface SourceStats {
  entries: number;
  closed: number;
  open: number;
  wins: number;
  losses: number;
  breakeven: number;
  realizedNetUsd: number;
  unrealizedNetUsd: number;
  interestUsd: number;
}

export interface EntryGateCounts {
  trendFilter: { enabled: boolean; method?: string; evaluations?: number; blockedByDecisionKind?: Record<string, Record<string, number>> };
  eligibility: {
    enabled: boolean;
    policy?: string;
    config?: Record<string, unknown>;
    opportunities?: number;
    bySource?: Record<string, number>;
    endedBy?: Record<string, number>;
    invalidatedByReason?: Record<string, number>;
    takenAtArming?: number;
    takenLater?: number;
    everBlocked?: number;
    blockedEvaluations?: Record<string, number>;
    ageSessionsAtDecision?: { mean: number | null; median: number | null; max: number | null; histogram: Record<string, number> };
    renewals?: { watches: number; resets: number; endedBy: Record<string, number> };
    tradesFromOpportunities?: SourceStats;
  };
  bySource: Record<string, SourceStats>;
  note: string;
}

export interface StampedTime {
  utc: string;
  newYork: string;
}

export interface EpisodeRecord {
  id: string;
  method: string;
  openedBy: string | null;
  exitTime?: StampedTime;
  exitPrice: number;
  exitNet: number;
  firstEligibleSession: string | null;
  lastEligibleSession: string;
  referenceHigh: number;
  maxHighInWindow: number | null;
  armed: (StampedTime & { price: number }) | null;
  trigger: (StampedTime & { price: number }) | null;
  end: string | null;
  endTime: StampedTime | null;
  status: string;
  trade: string | null;
}

export interface LogRecord extends StampedTime {
  seq: number;
  session: string;
  event: string;
  origin: string | null;
  method: string | null;
  episode: string | null;
  trade: string | null;
  disposition: string | null;
  reason: string | null;
  values: Record<string, unknown>;
}

// Growth 1.2.0 (only with an entry gate ON): one opportunity, one entry decision.
export interface OpportunityRecord {
  id: string;
  source: string;
  renewedFrom: string | null;
  policy: string;
  signal: StampedTime & { session: string; price: number; recentLow: number; threshold: number; advancePercent: number };
  lastEligibleSession: string;
  evaluations: number;
  blockedEvaluations: Record<string, number>;
  firstBlocked: StampedTime | null;
  decision: (StampedTime & { price: number; ageSessions: number; values: Record<string, unknown> }) | null;
  end: { state: string | null; reason: string | null; utc: string | null; newYork: string | null; session: string | null; values: Record<string, unknown> };
  renewal: Record<string, unknown> | null;
  transitions: (StampedTime & { session: string; state: string; reason: string })[];
  trade: string | null;
  status: string | null;
  netUsd: number | null;
  netKind: string | null;
  fill: (StampedTime & { price: number }) | null;
}

export interface EntryDecisionRecord {
  id: string;
  kind: 'crossing' | 'latched' | 'renewal' | 'continuation';
  source: string;
  time: StampedTime;
  session: string | null;
  price: number;
  crossing: { threshold: number; recentLow: number; advancePercent: number } | null;
  disposition: string;
  reason: string | null;
  gate: { decision: string | null; text: string | null; capital: boolean | null; trend: Record<string, unknown> | null } | null;
  policy: Record<string, unknown> | null;
  opportunity: string | null;
  episode?: string;
  trade: string | null;
  status: string | null;
  netUsd: number | null;
  netKind: string | null;
  fill: (StampedTime & { price: number }) | null;
}

export interface DecisionsFile {
  perSymbol?: Record<
    string,
    {
      episodes: EpisodeRecord[];
      log: LogRecord[];
      opportunities?: OpportunityRecord[];
      renewalWatches?: Record<string, unknown>[];
      entryDecisions?: EntryDecisionRecord[];
    }
  >;
}

export interface LedgerRecord {
  trade: string;
  status: string;
  net: number;
  [field: string]: unknown;
}
