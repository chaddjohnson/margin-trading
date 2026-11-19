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

export interface LedgerFilter {
  symbol: string | 'all';
  component: Component | 'all';
  status: 'all' | 'open' | 'closed';
  /** Positions active in a period of the ONE continuous run (a viewport, never a restarted account). */
  period: 'all' | 'development' | 'validation';
}

export const DEFAULT_LEDGER_FILTER: LedgerFilter = { symbol: 'all', component: 'all', status: 'all', period: 'all' };

const BOUNDARY_MS = Date.parse(`${PORTFOLIO_BENCHMARK.boundary}T23:59:59Z`);
const entryMs = (p: PortfolioPosition) => Date.parse(p.fills[0]!.t);
const lastMs = (p: PortfolioPosition) => (p.status === 'open' ? Infinity : Date.parse(p.fills.at(-1)!.t));

/** Validation period membership: entered after the 2024-12-31 close, or carried across it (still held). */
export const activeInValidation = (p: PortfolioPosition) => entryMs(p) > BOUNDARY_MS || lastMs(p) > BOUNDARY_MS;
export const activeInDevelopment = (p: PortfolioPosition) => entryMs(p) <= BOUNDARY_MS;
export const carriedIn = (p: PortfolioPosition) => entryMs(p) <= BOUNDARY_MS && lastMs(p) > BOUNDARY_MS;

export function filterPositions(positions: readonly PortfolioPosition[], f: LedgerFilter): PortfolioPosition[] {
  return positions.filter(
    (p) =>
      (f.symbol === 'all' || p.symbol === f.symbol) &&
      (f.component === 'all' || p.component === f.component) &&
      (f.status === 'all' || p.status === f.status) &&
      (f.period === 'all' || (f.period === 'validation' ? activeInValidation(p) : activeInDevelopment(p)))
  );
}

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
    validationNet: m.validation.net,
    validationDd: m.validation.resetDd,
    developmentNet: m.development.net,
    developmentDd: m.development.minuteDd,
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

/** The chart viewport of a period (ms): a viewport over the continuous run, never a new simulation window. */
export function periodWindow(period: 'all' | 'development' | 'validation', equityCloseMs: readonly number[], dates: readonly string[]): [number, number] | null {
  if (period === 'all' || !dates.length) return null;
  const b = dates.indexOf(PORTFOLIO_BENCHMARK.boundary);
  if (b < 0) return null;
  const first = Date.parse(`${dates[0]}T13:00:00Z`);
  if (period === 'development') return [first, equityCloseMs[b]!];
  return [equityCloseMs[b]! + 1, equityCloseMs.at(-1)!];
}
