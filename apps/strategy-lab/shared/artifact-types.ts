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

export interface DecisionsFile {
  perSymbol?: Record<string, { episodes: EpisodeRecord[]; log: LogRecord[] }>;
}

export interface LedgerRecord {
  trade: string;
  status: string;
  net: number;
  [field: string]: unknown;
}
