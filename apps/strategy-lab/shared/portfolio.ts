// Pooled portfolio candidates (Priority 6, docs/strategy-lab/POOLED_CANDIDATES.md): the catalog of frozen candidates and
// the shape of one candidate's replay as the server serves it. Shared by the runner, the server and the browser, so it
// imports nothing from Node.

import type { LabEvent } from './contract.ts';

export const CATALOG_SCHEMA = 'strategy-lab.pooled-candidate-catalog';
export const CATALOG_VERSION = 1;
/** Bumped whenever a replay's artifacts change incompatibly: older cache entries then never match. */
export const PORTFOLIO_REPLAY_FORMAT = 1;

/**
 * The archived benchmark every candidate is replayed on: ONE continuous run over the canonical data, one fixed
 * $100,000 principal pool without compounding; 2025-01-02 → 2026-10-30 is the validation period (examined history),
 * measured as the marked-net change from the 2024-12-31 close with every position and state carried across.
 */
export const PORTFOLIO_BENCHMARK = {
  from: '2016-01-04',
  to: '2026-10-30',
  boundary: '2024-12-31',
  validationFrom: '2025-01-02',
  principal: 100_000,
  compounding: false,
  costBpsPerSide: 5,
  interestRateAnnual: 0.11
} as const;

export type BookId = 'D1:GDX' | 'D1:VGT' | 'G:GDX' | 'G:VGT';
export type Component = 'D1' | 'Growth';
export const componentOfBook = (b: BookId): Component => (b.startsWith('D1') ? 'D1' : 'Growth');
export const symbolOfBook = (b: BookId) => b.slice(b.indexOf(':') + 1);
export const COMPONENT_LABEL: Record<Component, string> = { D1: 'D1', Growth: 'Growth' };

// ----- the catalog -----

export interface CatalogComponent {
  book: BookId;
  family: Component;
  symbol: string;
  enabled: boolean;
  /** D1: the book's candidate id or grid text; Growth: its configuration identity; null when OFF. */
  identity: string | null;
  /** D1: the registry's integer grid and its units. */
  grid?: Record<string, number>;
  gridUnits?: Record<string, string>;
  /** Growth: the effective Strategy Lab parameters (inactive values omitted). */
  effective?: Record<string, number | boolean | string>;
  /** The engine's own parameter form (display only; an inactive engine value is null and listed in `inactive`). */
  engineParams?: Record<string, unknown>;
  inactive?: string[];
  note?: string;
}

export interface CandidateSource {
  role: string;
  path: string;
  pointer: string;
  sha256: string;
}

export interface LedgerRef {
  scope: string;
  engine: string;
  files: { lots: { path: string; sha256: string }; funding?: { path: string; sha256: string }; daily?: { path: string; sha256: string } };
}

export interface CandidateTargets {
  fullNet: number;
  fullMinuteDd: number;
  validationNet: number;
  validationResetDd: number;
  developmentNet: number;
  developmentMinuteDd: number;
  developmentLots: number;
  fullRealized: number;
  fullUnrealized: number;
  lots: number;
  signature: string;
  /** The engine's archived compact record of the FULL run (Priority 3 `recordOf`). */
  record: Record<string, unknown>;
  recordFormat: string;
}

export interface CandidateEntry {
  id: string;
  order: number;
  name: string;
  summary: string;
  distinctions: string[];
  /** Symbol tabs, in display order. */
  symbols: string[];
  lifecycle: 'L0';
  engine: { path: string; door: string; options: { enabled: Record<BookId, boolean>; boundaries: string[] } };
  components: CatalogComponent[];
  enabled: Record<BookId, boolean>;
  /** The engine's executable input (Priority 3 quad; a disabled book carries a placeholder vector, never run). */
  quad: {
    d1: Record<'GDX' | 'VGT', Record<string, number>>;
    g: Record<'GDX' | 'VGT', Record<string, number | boolean | string>>;
    first: 'D1' | 'G';
  };
  identities: Record<string, string>;
  conventions: Record<string, unknown>;
  targets: CandidateTargets;
  sources: CandidateSource[];
  ledgers: LedgerRef[];
  /** sha256 of the canonical JSON of every other field of the entry. */
  entrySha256: string;
}

export interface CandidateCatalog {
  schema: typeof CATALOG_SCHEMA;
  version: typeof CATALOG_VERSION;
  note: string;
  builtBy: string;
  benchmark: typeof PORTFOLIO_BENCHMARK;
  candidates: CandidateEntry[];
}

// ----- one replay -----

export type FillKind = 'entry' | 'partial' | 'final';

/** One execution of a funded position: its entry, a partial sale or the final exit. */
export interface PositionFill {
  kind: FillKind;
  /** The contract event of this execution (chart marker). */
  eventId: string;
  t: string;
  timePrecision: 'minute' | 'session-close';
  /** The market fill price (before the per-side cost), in the chart's split-adjusted units. */
  price: number;
  /** The fill price after the per-side cost (what the accounting uses). */
  priceAfterCost: number;
  shares: number;
  /** Entry: the principal paid; exit: the proceeds (shares × price after cost). */
  amount: number;
  /** Exit: the principal repaid by this fill. */
  principalRepaid: number | null;
  /** Exit: the interest charged on the repaid principal. */
  interest: number | null;
  /** Exit: this fill's realized P&L (proceeds − repaid principal − interest); null for the entry. */
  fillNet: number | null;
  sharesAfter: number;
  principalAfter: number;
  reason: string;
}

export interface PortfolioPosition {
  /** Stable position id, unique across components and symbols: P-<funded lot number>. */
  id: string;
  lot: number;
  book: BookId;
  component: Component;
  symbol: string;
  /** The book's setup (D1: deep | continuation; Growth: rise | trend_breakout | a continuation method). */
  setup: string;
  decisionT: string;
  decisionPrice: number;
  principal: number;
  shares: number;
  fills: PositionFill[];
  status: 'open' | 'closed';
  partialExits: number;
  /** Σ fill nets (after costs and interest). */
  realized: number;
  /** Open positions: the remainder marked at the last close (accrued interest, no exit cost); 0 when closed. */
  unrealized: number;
  /** The whole position's net after costs and interest (closed: = realized; open: realized + unrealized). */
  net: number;
  interest: number;
  costs: number;
  exitReason: string | null;
  calendarDays: number;
  /** The lowest mark of the position (realized fills + remainder) and its time. */
  mae: number;
  maeT: string | null;
}

export interface RefusedSignalSummary {
  book: BookId;
  count: number;
}

/** A granted order still waiting for its fill at the endpoint: reserved capital, NOT an executed entry. */
export interface PendingOrder {
  book: BookId;
  component: Component;
  symbol: string;
  decisionT: string;
  decisionPrice: number;
  setup: string;
}

export interface DrawdownFigure {
  usd: number;
  /** DD ÷ the fixed $100,000 principal (never ÷ peak equity). */
  pctOfPrincipal: number;
  peakT: string | null;
  troughT: string | null;
  recoveryT: string | null;
}

export interface ParityCheck {
  field: string;
  target: number | string;
  got: number | string;
  pass: boolean;
}

export interface Attribution {
  book: BookId;
  component: Component;
  symbol: string;
  positions: number;
  open: number;
  partialExits: number;
  /** Booked P&L: Σ net of this book's funded positions (attribution, NOT causal contribution). */
  booked: number;
  realized: number;
  unrealized: number;
  wins: number;
  losses: number;
  decisions: number;
  granted: number;
  refused: number;
}

export interface PortfolioMetrics {
  kind: 'pooled candidate replay';
  window: { from: string; to: string; boundary: string; validationFrom: string; sessions: number };
  principal: number;
  full: {
    net: number;
    realized: number;
    unrealized: number;
    minuteDd: DrawdownFigure;
    dailyDd: DrawdownFigure;
    interest: number;
    costs: number;
    positions: number;
    closedPositions: number;
    openPositions: number;
    exitFills: number;
    partialExits: number;
    wins: number;
    losses: number;
    sessionsHeld: number;
    exposurePct: number;
    peakPrincipal: number;
  };
  development: { net: number; minuteDd: DrawdownFigure; positionsEntered: number };
  validation: {
    net: number;
    resetDd: DrawdownFigure;
    realizedChange: number;
    unrealizedChange: number;
    positionsEntered: number;
    /** Positions open at the 2024-12-31 close (carried into the validation period). */
    carriedIn: string[];
  };
  attribution: Attribution[];
  refusals: { slotOccupied: number; byBook: Partial<Record<BookId, number>> };
  pending: PendingOrder[];
  parity: { status: 'verified' | 'mismatch'; checks: ParityCheck[] };
  /** The engine's own compact record (Priority 3 recordOf) of this replay. */
  record: Record<string, unknown>;
}

/** Per NYSE session: the marked net at the close and the deepest minute drawdown inside the session. */
export interface PortfolioEquity {
  dates: string[];
  /** Unix ms of each session's scheduled close. */
  closeMs: number[];
  marked: number[];
  realized: number[];
  /** The deepest (running minute peak − minute mark) within the session; its maximum is the run's minute DD. */
  drawdown: number[];
  /** The marked net's minute low inside the session. */
  low: number[];
}

export interface PortfolioReplaySummary {
  /** PR- + the sha256 of the replay's identity. */
  id: string;
  candidateId: string;
  catalogEntrySha256: string;
  window: { from: string; to: string };
  executedAt: string;
  executionMs: number;
  cacheHit: boolean;
}

export interface PortfolioReplayDetail extends PortfolioReplaySummary {
  name: string;
  symbols: string[];
  metrics: PortfolioMetrics;
  positions: PortfolioPosition[];
  priceSource: { kind: 'market'; basisDate: string; basisBySymbol: Record<string, string> };
  implementationSha256: string;
  dataSha256: Record<string, string>;
}

export const REPLAY_ID_RE = /^PR-[0-9a-f]{64}$/;
export const CANDIDATE_ID_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** Event helpers (the replay's contract events carry these meta fields). */
export const eventComponent = (e: Pick<LabEvent, 'meta'>): Component | null => {
  const c = e.meta?.component;
  return c === 'D1' || c === 'Growth' ? c : null;
};
export const eventPosition = (e: Pick<LabEvent, 'meta'>): string | null =>
  typeof e.meta?.position === 'string' ? e.meta.position : null;
export const isRefusedEvent = (e: Pick<LabEvent, 'kind' | 'meta'>) => e.kind === 'rejected_signal' && e.meta?.refused === true;
