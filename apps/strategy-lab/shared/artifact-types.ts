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
  optionalRules?: OptionalRulesCounts; // Growth 1.3.0, only with the breakout entry, the initial stop or retention ON
  drawdownGate?: DrawdownGateCounts; // Growth 1.4.0, only with the Drawdown Recovery Gate ON
  signals?: { raw?: number; filled?: number; rejected?: number; vetoed?: number; deferred?: number; vetoedByReason?: Record<string, number> };
}

// Growth 1.4.0 (runner/trading-run.ts drawdownSummary): descriptive counts of the Drawdown Recovery Gate.
export interface DrawdownGateCounts {
  config: { lookbackSessions: number; dipThresholdPercent: number; recoveryRetracementPercent: number; confirmationSessions: number };
  episodes: {
    total: number;
    detectedBeforeWindow: number;
    detectedWhileWindowIncomplete: number;
    resolved: number;
    resolvedBeforeConfirmation: number;
    unresolvedAtEnd: Record<string, number>;
    maxDipPercent: { n: number; mean: number | null; median: number | null; min: number | null; max: number | null };
    sessionsDetectionToResolution: { n: number; mean: number | null; median: number | null; min: number | null; max: number | null };
  };
  confirmations: {
    recoveryStarts: number;
    confirmed: number;
    resetsBeforeConfirmation: number;
    confirmationsLost: number;
    resetsByCause: Record<string, number>;
  };
  releases: { total: number; byCause: Record<string, number> };
  blockedDecisions: { total: number; byKind: Record<string, number> };
  blockedCrossings: number;
  blockedCrossingsByDisposition: Record<string, number>;
  blockedContinuations: number;
  opportunitiesBlocked: number;
  deferredEligibleEntries: number;
  releaseDecisions: { total: number; taken: number };
  tradesAfterAGateBlock: { trades: number; closed: number; wins: number; realizedNetUsd: number };
  windowSessionsAtClose: Record<string, number>;
  stateAtEnd: string;
  note: string;
}

// Growth 1.4.0 (decisions.json perSymbol.drawdownGate, only with the gate ON): one episode, one transition.
export interface DrawdownEpisodeRecord {
  id: string;
  epoch: number;
  state: string;
  peak: StampedTime & { session: string | null; price: number; observation: string };
  detected: StampedTime & { session: string | null; price: number; dipPercent: number };
  trough: StampedTime & { session: string | null; price: number };
  maxDipPercent: number;
  retracementPercent: number;
  threshold: number;
  troughUpdates: number;
  recoveryStarts: number;
  confirmations: number;
  confirmationResets: number;
  confirmationLosses: number;
  resetsByCause: Record<string, number>;
  firstConfirmed: StampedTime | null;
  resolved: (StampedTime & { session: string | null; price: number; beforeConfirmation: boolean }) | null;
  windowCompleteAtDetection: boolean;
  detectedBeforeWindow: boolean;
  blockedDecisions: Record<string, number>;
  streakAtEnd: Record<string, unknown> | null;
}

export interface DrawdownTransitionRecord extends StampedTime {
  seq: number;
  session: string | null;
  event: string;
  episode: string | null;
  observation: string;
  price: number;
  state: string;
  reason: string;
  values: Record<string, unknown>;
}

export interface DrawdownGateRecords {
  config: DrawdownGateCounts['config'];
  detector: Record<string, unknown>;
  episodes: DrawdownEpisodeRecord[];
  transitions: DrawdownTransitionRecord[];
  releases: (StampedTime & { session: string | null; price: number; observation: string; episode: string | null; cause: string })[];
  summary: DrawdownGateCounts | null;
}

// Growth 1.3.0 (riseTrading.ts optionalRulesMetricsOf): descriptive counts of the optional rules.
export interface OptionalRulesCounts {
  entryMethod: string;
  breakout?: { signals: number; taken: number; rejectedWhileInvested: number; vetoed: number };
  initialStop: {
    enabled: boolean;
    config?: { atrSessions: number; atrMultiple: number } | null;
    atrConvention?: string;
    protectedPositions?: number;
    blockedChecks?: number;
    blockedBySource?: Record<string, number>;
    blockedByReason?: Record<string, number>;
    exitsByInitialStop?: number;
    exitsByInitialStopGap?: number;
    exitsByInitialStopAssumedFill?: number;
    exitsOnEntrySession?: number;
  };
  retention: {
    enabled: boolean;
    config?: { sellPercent: number; smaSessions: number; closesBelow: number } | null;
    positionsWithPartialSale?: number;
    partialFills?: number;
    partialFillsByReason?: Record<string, number>;
    partialFillsNetUsd?: number;
    partialFillsAtALoss?: number;
    remainderExitsByReason?: Record<string, number>;
    trendExitDecisions?: number;
    pendingTrendExitAtEnd?: number;
    openRemainderAtEnd?: number;
    closedPositionsWithPartial?: { count: number; wins: number; losses: number; netUsd: number };
    classification?: string;
  };
  note: string;
}

// Growth 1.3.0 (trades.json `exitFills`): one exit fill of a position under the optional rules.
export interface ExitFillRecord {
  fill: number;
  partial: boolean;
  rule: string;
  reason: string;
  utc: string;
  newYork: string;
  session: string;
  execution: string;
  rawPrice: number;
  priceAfterCost: number;
  shares: number;
  principalRepaid: number;
  interestPaid: number;
  interestDays: number;
  proceeds: number;
  grossBeforeCosts: number;
  entryCostShare: number;
  exitCost: number;
  net: number;
  sharesAfter: number;
  principalAfter: number;
  decidedUtc: string;
  level: number | null;
  sameTrade: string[];
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
  gate: {
    decision: string | null;
    text: string | null;
    capital: boolean | null;
    trend: Record<string, unknown> | null;
    drawdown?: Record<string, unknown>; // Growth 1.4.0, only with the Drawdown Recovery Gate ON
    blockedBy?: string[];
  } | null;
  policy: Record<string, unknown> | null;
  opportunity: string | null;
  episode?: string;
  via?: string; // Growth 1.4.0: 'drawdown_release' for a latched decision taken at the gate's release
  values?: Record<string, unknown>;
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
      drawdownGate?: DrawdownGateRecords; // Growth 1.4.0, only with the Drawdown Recovery Gate ON
    }
  >;
}

export interface LedgerRecord {
  trade: string;
  status: string;
  net: number;
  [field: string]: unknown;
}
