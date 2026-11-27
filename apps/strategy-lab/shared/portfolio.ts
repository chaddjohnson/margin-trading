// Pooled portfolio candidates (Priority 6, docs/strategy-lab/POOLED_CANDIDATES.md): the catalog of frozen candidates and
// the shape of one candidate's replay as the server serves it. Shared by the runner, the server and the browser, so it
// imports nothing from Node.

import type { LabEvent } from './contract.ts';

export const CATALOG_SCHEMA = 'strategy-lab.pooled-candidate-catalog';
export const CATALOG_VERSION = 1;
/**
 * Bumped whenever a replay's artifacts change incompatibly: older cache entries then never match. Format 2 (2026-11-27):
 * evaluation windows (research | all | custom), the effective dates and the period attribution in the metrics.
 */
export const PORTFOLIO_REPLAY_FORMAT = 2;

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

// ----- evaluation windows (docs/strategy-lab/POOLED_CANDIDATES.md §3a) -----

/**
 * research  the candidate's historical research window (its archived benchmark: the window its targets were sealed on);
 * all       2016-01-04 → the latest COMMON COMPLETE session of every symbol file the door reads (VGT and GDX);
 * custom    explicit [from, to] (New York session dates, inclusive), with an execution mode:
 *             continuous  ONE run from 2016-01-04 to `to`; [from, to] is the reporting window (state carried in);
 *             isolated    the run itself starts flat at `from` (a cold start; no state from earlier sessions).
 * A window that ends after the research validation end (config/research/date-ranges.json) is a MANUAL POST-VALIDATION
 * EVALUATION: never optimization, selection, qualification or validation evidence.
 */
export type PortfolioWindowMode = 'research' | 'all' | 'custom';
export type PortfolioExecution = 'continuous' | 'isolated';
export const PORTFOLIO_WINDOW_MODES: readonly PortfolioWindowMode[] = ['research', 'all', 'custom'];
export const PORTFOLIO_EXECUTIONS: readonly PortfolioExecution[] = ['continuous', 'isolated'];
/** A custom window's default: the continuous history with the requested window applied to its results. */
export const DEFAULT_CUSTOM_EXECUTION: PortfolioExecution = 'continuous';

export type PortfolioWindowRequest =
  | { mode: 'research' }
  | { mode: 'all' }
  | { mode: 'custom'; from: string; to: string; execution: PortfolioExecution };

export const RESEARCH_WINDOW: PortfolioWindowRequest = { mode: 'research' };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (x: unknown): x is string => typeof x === 'string' && DATE_RE.test(x) && !Number.isNaN(Date.parse(`${x}T12:00:00Z`));

/**
 * The canonical form of a window request (absent = research, so an older link or request keeps the archived benchmark).
 * Throws on anything else: an unknown mode, a malformed or reversed date, a custom window without both dates, or dates
 * or an execution mode on a research or all window.
 */
export function normalizeWindowRequest(x: unknown): PortfolioWindowRequest {
  if (x === undefined || x === null) return RESEARCH_WINDOW;
  if (typeof x !== 'object' || Array.isArray(x)) throw new Error('the window must be an object');
  const o = x as Record<string, unknown>;
  const extra = Object.keys(o).filter((k) => !['mode', 'from', 'to', 'execution'].includes(k));
  if (extra.length) throw new Error(`unknown window field(s): ${extra.join(', ')}`);
  if (o.mode === 'research' || o.mode === 'all') {
    if (o.from !== undefined || o.to !== undefined || o.execution !== undefined)
      throw new Error(`a ${o.mode} window takes no dates or execution mode (choose custom)`);
    return { mode: o.mode };
  }
  if (o.mode !== 'custom') throw new Error(`unknown window mode ${JSON.stringify(o.mode)} (${PORTFOLIO_WINDOW_MODES.join(', ')})`);
  if (!isDate(o.from) || !isDate(o.to)) throw new Error('a custom window needs from and to as YYYY-MM-DD New York session dates');
  if (o.from > o.to) throw new Error(`the custom window starts ${o.from}, after its end ${o.to}`);
  const execution = o.execution ?? DEFAULT_CUSTOM_EXECUTION;
  if (!PORTFOLIO_EXECUTIONS.includes(execution as PortfolioExecution))
    throw new Error(`unknown execution ${JSON.stringify(o.execution)} (${PORTFOLIO_EXECUTIONS.join(', ')})`);
  return { mode: 'custom', from: o.from, to: o.to, execution: execution as PortfolioExecution };
}

export const windowRequestText = (w: PortfolioWindowRequest) =>
  w.mode === 'custom' ? `custom ${w.from} → ${w.to} (${w.execution})` : w.mode === 'all' ? 'all available data' : 'research window';

/** The local data coverage the window controls show (GET /api/portfolios). */
export interface PortfolioCoverage {
  /** The latest common complete session of the symbol files (null when it cannot be established). */
  endpoint: string | null;
  limitedBy: string[];
  firstSession: string;
  files: { symbol: string; latestCompleteSession: string | null; lastRowUtc: string | null; bytes: number }[];
  research: { id: string; developmentEnd: string; validationEnd: string; file: string };
  error: string | null;
}

/** The effective window of a replay (metrics.window). */
export interface PortfolioWindowInfo {
  from: string;
  to: string;
  boundary: string;
  validationFrom: string;
  sessions: number;
  requested: PortfolioWindowRequest;
  execution: PortfolioExecution;
  /** The sessions the engine simulated. */
  simulation: { from: string; to: string; sessions: number };
  /** The sessions the primary figures describe (= simulation unless a continuous custom window starts later). */
  reporting: { from: string; to: string; sessions: number };
  /** The candidate's research window (the archived benchmark its targets were sealed on). */
  research: { from: string; to: string; boundary: string; validationEnd: string; source: string };
  /** The local data the window was resolved against. */
  coverage: { endpoint: string; limitedBy: string[]; files: { symbol: string; latestCompleteSession: string | null; lastRowUtc: string }[] };
  /** Ends after the research validation end: a manual post-validation evaluation. */
  postValidation: boolean;
  label: string;
}

/** One period of the continuous run (src/manual-eval/report.ts periodMetrics: the CLI's period table, unchanged). */
export interface PortfolioPeriod {
  key: string;
  label: string;
  after: string | null;
  through: string;
  markedNetAtStart: number;
  markedNetAtEnd: number;
  net: number;
  grossTradingPnl: number;
  interest: number;
  costs: number;
  realizedPnl: number;
  unrealizedAtStart: number;
  unrealizedAtEnd: number;
  drawdownReset: { max: number; peak: string | null; trough: string | null; basis: string };
  drawdownFromContinuousPeak: { max: number; peak: string | null; trough: string | null; peakValue: number | null; basis: string };
  bankedCapitalDrawdown: { max: number; high: string | null; trough: string | null; basis: string };
  maxTradePrincipalLoss: { lot: number; book: string; entry: string | null; loss: number; date: string | null; basis: string } | null;
  lots: { active: number; entered: number; closed: number; carriedIn: number; openAtEnd: number; winners: number; losers: number; winRate: number | null };
  openPositions: { lot: number; book: string; kind: string; entry: string | null; entryRaw: number; shares: number; principal: number; markPrice: number; markedPnl: number; interestAccrued: number; liquidationPnl: number }[];
}

/** What one position contributed to a period that starts after the run's start (carried-in positions included). */
export interface PositionInPeriod {
  period: string;
  carriedIn: boolean;
  valueAtStart: number;
  valueAtEnd: number;
  /** The change of the position's marked value over the period: NOT its lifetime net. */
  pnl: number;
  interest: number;
  costs: number;
}

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
  /** D1: the book's RC 2 risk controls (protective stop, hold policy, decline gate), when the candidate has any. */
  controls?: Record<string, unknown>;
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
  /** The archived window these targets were sealed on (absent: the catalog benchmark). */
  window?: { from: string; to: string; boundary: string };
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
  engine: {
    /**
     * Absent: Priority 3's pool through 5B's runLife(…, 'L0'). 'rc2-replay': the risk-metrics replay of a configuration
     * with RC 2 D1 risk controls (src/vg-l0-risk-metrics/engine.ts replay = RC 2 runWithControls2 on Priority 3's books
     * and pool), the path of `npm run manual-eval`.
     */
    kind?: 'rc2-replay';
    /** rc2-replay: the subject key of src/vg-l0-risk-metrics/subjects.ts the runner re-checks the entry against. */
    subject?: string;
    path: string;
    door: string;
    options: { enabled: Record<BookId, boolean>; boundaries: string[] };
  };
  components: CatalogComponent[];
  enabled: Record<BookId, boolean>;
  /** The engine's executable input (Priority 3 quad; a disabled book carries a placeholder vector, never run). */
  quad: {
    d1: Record<'GDX' | 'VGT', Record<string, number>>;
    g: Record<'GDX' | 'VGT', Record<string, number | boolean | string>>;
    first: 'D1' | 'G';
  };
  /** rc2-replay: the executable RC 2 risk-control configuration (src/d1-risk-controls-rc2/config.ts). */
  controls?: Record<string, unknown> | null;
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
  /** Per period of the run that starts after its first session (A2 validation, B post-validation, R reporting). */
  inPeriod?: Record<string, PositionInPeriod>;
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
  window: PortfolioWindowInfo;
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
  /** Through the 2024-12-31 close (null when the run does not span it from its first session). */
  development: { net: number; minuteDd: DrawdownFigure; positionsEntered: number } | null;
  /** The formal validation window: the 2024-12-31 close → the validation end, or the run's end if earlier (null when the run does not span the boundary). */
  validation: {
    /** The last session of the validation figures (the research validation end, or the run's end). */
    through: string;
    net: number;
    resetDd: DrawdownFigure;
    realizedChange: number;
    unrealizedChange: number;
    positionsEntered: number;
    /** Positions open at the 2024-12-31 close (carried into the validation period). */
    carriedIn: string[];
  } | null;
  /** After the research validation end (only when the run reaches past it): MANUAL POST-VALIDATION EVALUATION. */
  postValidation: {
    after: string;
    through: string;
    net: number;
    resetDd: DrawdownFigure;
    realizedChange: number;
    unrealizedChange: number;
    positionsEntered: number;
    carriedIn: string[];
    interest: number;
    costs: number;
  } | null;
  /** The period table of the run (src/manual-eval/report.ts periodMetrics; the CLI's figures). */
  periods: PortfolioPeriod[];
  /** The engine-independent ledger reconciliation (src/vg-l0-risk-metrics/engine.ts reconcile). */
  reconciliation: { marksChecked: number; engineChangesNotRebuilt: number; points: number; ddMax: number; lots: number };
  /** For a continuous run that is not the research window: the decision-for-decision comparison with the research-window run. */
  trajectory: { identical: boolean; comparedThrough: string; differences: string[]; researchParity: 'verified' | 'mismatch' } | null;
  attribution: Attribution[];
  refusals: { slotOccupied: number; byBook: Partial<Record<BookId, number>> };
  pending: PendingOrder[];
  /**
   * Against the archived targets: 'verified' / 'mismatch' for a research-window replay; 'not applicable' for any other
   * window (no archived target exists; its continuous runs are verified through `trajectory` instead).
   */
  parity: { status: 'verified' | 'mismatch' | 'not applicable'; checks: ParityCheck[] };
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
  /** The requested window and the effective (simulated / reported) dates. */
  window: { from: string; to: string; requested: PortfolioWindowRequest; reporting: { from: string; to: string }; simulation: { from: string; to: string } };
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
