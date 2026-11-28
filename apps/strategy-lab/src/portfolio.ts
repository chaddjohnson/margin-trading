// The browser's model of a pooled portfolio candidate's replay (Priority 6, docs/strategy-lab/POOLED_CANDIDATES.md).
// Pure functions only (unit-tested in tests/portfolio-model.test.ts).
//
// Everything here is PRESENTATION: which markers are visible and which ledger rows are listed. Nothing recomputes,
// re-allocates or re-runs the portfolio — the aggregate figures always come from the server's replay metrics, which
// these functions never take as input, so a visibility change cannot alter them.

import type { LabEvent } from '../shared/contract.ts';
import {
  type Component,
  eventComponent,
  isRefusedEvent,
  PORTFOLIO_BENCHMARK,
  type PortfolioMetrics,
  type PortfolioPosition
} from '../shared/portfolio.ts';
import type { Frame } from './chart/markers.ts';

export type EventClass = 'entry' | 'partial' | 'final' | 'refused';

export interface Visibility {
  components: Record<Component, boolean>;
  entry: boolean;
  partial: boolean;
  final: boolean;
  /** Refused executable signals (insufficient pool availability): OFF by default; never fills. */
  refused: boolean;
}

export const DEFAULT_VISIBILITY: Visibility = {
  components: { D1: true, Growth: true },
  entry: true,
  partial: true,
  final: true,
  refused: false
};

export const FRAME_OF: Record<Component, Frame> = { D1: 'square', Growth: 'round' };

/** The class of a replay event: an executed entry, a partial exit, a final exit, or a refused (unexecuted) signal. */
export function eventClassOf(e: Pick<LabEvent, 'kind' | 'meta'>): EventClass | null {
  if (e.kind === 'executed_entry') return 'entry';
  if (e.kind === 'executed_exit') return e.meta?.partial === true ? 'partial' : 'final';
  if (isRefusedEvent(e)) return 'refused';
  return null;
}

/** The events to draw: a pure visibility filter (component and event class); nothing else changes. */
export function visibleEvents(events: readonly LabEvent[], v: Visibility): LabEvent[] {
  return events.filter((e) => {
    const cls = eventClassOf(e);
    const comp = eventComponent(e);
    if (!cls || !comp) return false;
    return v.components[comp] && v[cls];
  });
}

/**
 * A period of the ONE continuous run (a viewport, never a restarted account): development (to the 2024-12-31 close),
 * validation (the formal validation window, to the research validation end), post (after the validation end: manual
 * post-validation evaluation) and reporting (a continuous custom window's reporting dates).
 */
export type LedgerPeriod = 'all' | 'development' | 'validation' | 'post' | 'reporting';

export interface LedgerFilter {
  symbol: string | 'all';
  component: Component | 'all';
  status: 'all' | 'open' | 'closed';
  /** Positions active in a period of the ONE continuous run. */
  period: LedgerPeriod;
}

export const DEFAULT_LEDGER_FILTER: LedgerFilter = { symbol: 'all', component: 'all', status: 'all', period: 'all' };

/** The period bounds of a replay (ms; a session date's end, after its close): from its metrics' window. */
export interface PeriodBounds {
  boundary: number;
  /** The research validation end; Infinity when the run ends on or before it. */
  validationEnd: number;
  /** The reporting window of a continuous custom run (null when it is the whole run). */
  reporting: { from: number; to: number } | null;
}

const endOfDate = (d: string) => Date.parse(`${d}T23:59:59Z`);
export const BENCHMARK_BOUNDS: PeriodBounds = { boundary: endOfDate(PORTFOLIO_BENCHMARK.boundary), validationEnd: Infinity, reporting: null };

export function boundsOf(m: Pick<PortfolioMetrics, 'window'>): PeriodBounds {
  const w = m.window;
  const reporting =
    w.reporting && w.simulation && w.reporting.from !== w.simulation.from
      ? { from: Date.parse(`${w.reporting.from}T00:00:00Z`), to: endOfDate(w.reporting.to) }
      : null;
  return {
    boundary: endOfDate(w.boundary ?? PORTFOLIO_BENCHMARK.boundary),
    validationEnd: w.postValidation && w.research ? endOfDate(w.research.validationEnd) : Infinity,
    reporting
  };
}

const entryMs = (p: PortfolioPosition) => Date.parse(p.fills[0]!.t);
const lastMs = (p: PortfolioPosition) => (p.status === 'open' ? Infinity : Date.parse(p.fills.at(-1)!.t));

/** Validation period membership: entered after the 2024-12-31 close (by the validation end), or carried across it. */
export const activeInValidation = (p: PortfolioPosition, b: PeriodBounds = BENCHMARK_BOUNDS) =>
  entryMs(p) <= b.validationEnd && lastMs(p) > b.boundary;
export const activeInDevelopment = (p: PortfolioPosition, b: PeriodBounds = BENCHMARK_BOUNDS) => entryMs(p) <= b.boundary;
/** After the research validation end (manual post-validation evaluation): entered after it, or carried across it. */
export const activeAfterValidation = (p: PortfolioPosition, b: PeriodBounds) => lastMs(p) > b.validationEnd;
export const activeInReporting = (p: PortfolioPosition, b: PeriodBounds) =>
  b.reporting !== null && entryMs(p) <= b.reporting.to && lastMs(p) >= b.reporting.from;
export const carriedIn = (p: PortfolioPosition, b: PeriodBounds = BENCHMARK_BOUNDS) => entryMs(p) <= b.boundary && lastMs(p) > b.boundary;
/** Held across an instant (ms): entered by it and exited after it (or still open). */
export const carriedAcross = (p: PortfolioPosition, t: number) => entryMs(p) <= t && lastMs(p) > t;

const inPeriod: Record<Exclude<LedgerPeriod, 'all'>, (p: PortfolioPosition, b: PeriodBounds) => boolean> = {
  development: activeInDevelopment,
  validation: activeInValidation,
  post: activeAfterValidation,
  reporting: activeInReporting
};

export function filterPositions(positions: readonly PortfolioPosition[], f: LedgerFilter, b: PeriodBounds = BENCHMARK_BOUNDS): PortfolioPosition[] {
  return positions.filter(
    (p) =>
      (f.symbol === 'all' || p.symbol === f.symbol) &&
      (f.component === 'all' || p.component === f.component) &&
      (f.status === 'all' || p.status === f.status) &&
      (f.period === 'all' || inPeriod[f.period](p, b))
  );
}

/** The period table key of a ledger period whose positions carry a period contribution (inPeriod). */
export const PERIOD_KEY: Partial<Record<LedgerPeriod, string>> = { validation: 'A2', post: 'B', reporting: 'R' };

export const isFiltered = (f: LedgerFilter) =>
  f.symbol !== 'all' || f.component !== 'all' || f.status !== 'all' || f.period !== 'all';

/**
 * The booked subtotal of listed positions (Σ whole-position net after costs and interest). It is ATTRIBUTION of the
 * listed rows, never the portfolio's result and never a causal contribution: removing a component would change which
 * trades the shared slot funds.
 */
export function bookedSubtotal(positions: readonly PortfolioPosition[]) {
  return {
    positions: positions.length,
    open: positions.filter((p) => p.status === 'open').length,
    partialExits: positions.reduce((a, p) => a + p.partialExits, 0),
    net: positions.reduce((a, p) => a + p.net, 0),
    realized: positions.reduce((a, p) => a + p.realized, 0),
    unrealized: positions.reduce((a, p) => a + p.unrealized, 0)
  };
}

/**
 * The portfolio summary's figures: ONLY from the replay's metrics (the one pooled run), whatever is visible or
 * filtered. Positions count a partially exited position once.
 */
export function portfolioTotals(m: PortfolioMetrics) {
  return {
    net: m.full.net,
    realized: m.full.realized,
    unrealized: m.full.unrealized,
    minuteDd: m.full.minuteDd,
    dailyDd: m.full.dailyDd,
    validationNet: m.validation?.net ?? null,
    validationDd: m.validation?.resetDd ?? null,
    developmentNet: m.development?.net ?? null,
    developmentDd: m.development?.minuteDd ?? null,
    postValidationNet: m.postValidation?.net ?? null,
    postValidationDd: m.postValidation?.resetDd ?? null,
    positions: m.full.positions,
    open: m.full.openPositions,
    closed: m.full.closedPositions,
    partialExits: m.full.partialExits,
    wins: m.full.wins,
    losses: m.full.losses,
    exposurePct: m.full.exposurePct,
    interest: m.full.interest,
    costs: m.full.costs,
    refused: m.refusals.slotOccupied,
    pending: m.pending.length
  };
}

/**
 * The chart viewport of a period (ms): a viewport over the continuous run, never a new simulation window. `validationEnd`
 * (the research validation end) bounds the validation viewport when the run reaches past it; `reportingFrom` is the
 * first reported session of a continuous custom window.
 */
export function periodWindow(
  period: LedgerPeriod,
  equityCloseMs: readonly number[],
  dates: readonly string[],
  o: { validationEnd?: string | null; reportingFrom?: string | null } = {}
): [number, number] | null {
  if (period === 'all' || !dates.length) return null;
  const first = Date.parse(`${dates[0]}T13:00:00Z`);
  const last = equityCloseMs.at(-1)!;
  const v = o.validationEnd ? dates.indexOf(o.validationEnd) : -1;
  const vEnd = v >= 0 && v < dates.length - 1 ? v : -1;
  if (period === 'post') return vEnd >= 0 ? [equityCloseMs[vEnd]! + 1, last] : null;
  if (period === 'reporting') {
    const r = o.reportingFrom ? dates.indexOf(o.reportingFrom) : -1;
    return r > 0 ? [equityCloseMs[r - 1]! + 1, last] : null;
  }
  const b = dates.indexOf(PORTFOLIO_BENCHMARK.boundary);
  if (b < 0 || b === dates.length - 1) return null;
  if (period === 'development') return [first, equityCloseMs[b]!];
  return [equityCloseMs[b]! + 1, vEnd >= 0 ? equityCloseMs[vEnd]! : last];
}
