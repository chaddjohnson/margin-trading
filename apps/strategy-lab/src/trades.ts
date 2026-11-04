// Executed trades of ONE symbol of one run, from its (hash-verified) events: each entry paired with its exit strictly
// through the recorded `tradeId` and the mutual `linkedEventId` (never by proximity or date), and the trade's net P&L
// taken only from what the run recorded. A figure the run does not contain is `null` with a reason — never invented.
//
// Sources of net P&L (after transaction costs and margin interest):
// - a closed trade: its exit event's `net` value (trading backtests and the Study 8 import both record it);
//   the percentage is the exit's `netReturn` when recorded, else net ÷ the entry's recorded `principal`;
// - an open position (entry with `meta.open`): UNREALIZED, from the run's recorded mark —
//   trading backtests: `metrics.perSymbol[symbol].pnl.unrealized` (marked at the last close, net of accrued interest);
//   the Study 8 import: `metrics.trades.unrealized`, but only when the pool has exactly one open lot (that lot's mark);
//   otherwise unavailable.

import type { LabEvent } from '../shared/contract.ts';
import type { Role } from './chart/markers.ts';

export interface TradePnl {
  netUsd: number;
  percent: number | null; // of the principal, percentage points
  unrealized: boolean;
  basis: string; // where the figure comes from
  markDate: string | null; // open positions: the session the mark is from, when recorded
}

export interface Trade {
  key: string; // `${role}:${symbol}:${tradeId}`
  role: Role;
  runId: string;
  symbol: string;
  tradeId: string;
  entry: LabEvent | null;
  exit: LabEvent | null;
  status: 'closed' | 'open' | 'unlinked';
  problem: string | null; // why the entry and exit are not linked (inconsistent records)
  pnl: TradePnl | null;
  pnlUnavailable: string | null; // the reason when pnl is null
  exitReason: string | null;
  heldDays: number | null; // calendar days from the entry fill to the exit fill (closed trades only)
}

export type Tone = 'profit' | 'loss' | 'flat' | 'open' | 'unknown';

/**
 * A trade's outcome tone (marker colours, connector, P&L text): the sign of the RECORDED net P&L after costs and
 * interest of a closed trade; `open` for a position still open, whatever its unrealized P&L; `unknown` without one.
 */
export const toneOf = (t: Pick<Trade, 'status' | 'pnl'> | null): Tone => {
  if (!t) return 'unknown';
  if (t.status === 'open') return 'open';
  if (t.status !== 'closed' || !t.pnl || t.pnl.unrealized) return 'unknown';
  return t.pnl.netUsd > 0 ? 'profit' : t.pnl.netUsd < 0 ? 'loss' : 'flat';
};

const num = (e: LabEvent | null | undefined, key: string): number | null => {
  const v = e?.values.find((x) => x.key === key)?.value;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
};
const text = (e: LabEvent | null | undefined, key: string): string | null => {
  const v = e?.values.find((x) => x.key === key)?.value;
  return typeof v === 'string' && v ? v : null;
};

type Metrics = Record<string, unknown> | null | undefined;

function openPnl(
  metrics: Metrics,
  symbol: string,
  principal: number | null
): { pnl: TradePnl | null; reason: string | null } {
  const pct = (net: number) => (principal && principal > 0 ? (net / principal) * 100 : null);
  if (metrics?.kind === 'trading backtest') {
    const per = (metrics.perSymbol as Record<string, { pnl?: { unrealized?: unknown } }> | undefined)?.[symbol];
    const u = per?.pnl?.unrealized as { netUsd?: unknown; markDate?: unknown } | null | undefined;
    if (u && typeof u.netUsd === 'number')
      return {
        pnl: {
          netUsd: u.netUsd,
          percent: pct(u.netUsd),
          unrealized: true,
          basis: 'marked at the last close of the run, net of accrued interest; exit cost not charged',
          markDate: typeof u.markDate === 'string' ? u.markDate : null
        },
        reason: null
      };
    return { pnl: null, reason: 'the run recorded no mark for this open position' };
  }
  if (metrics?.kind === 'imported trades') {
    const t = metrics.trades as { unrealized?: unknown; openLots?: unknown } | undefined;
    if (t?.openLots === 1 && typeof t.unrealized === 'number')
      return {
        pnl: {
          netUsd: t.unrealized,
          percent: pct(t.unrealized),
          unrealized: true,
          basis: 'the imported run’s recorded mark of its only open lot (net of interest)',
          markDate: null
        },
        reason: null
      };
    return { pnl: null, reason: 'the import records unrealized P&L only for the whole pool, not per open lot' };
  }
  return { pnl: null, reason: 'this run records no mark-to-market for open positions' };
}

/** The trades of `symbol` in `events` (other symbols' events are ignored), keyed by tradeId. */
export function buildTrades(
  events: readonly LabEvent[],
  symbol: string,
  role: Role,
  runId: string,
  metrics: Metrics
): Map<string, Trade> {
  const groups = new Map<string, { entries: LabEvent[]; exits: LabEvent[] }>();
  for (const e of events) {
    if (e.symbol !== symbol || !e.tradeId || (e.kind !== 'executed_entry' && e.kind !== 'executed_exit')) continue;
    const g = groups.get(e.tradeId) ?? { entries: [], exits: [] };
    (e.kind === 'executed_entry' ? g.entries : g.exits).push(e);
    groups.set(e.tradeId, g);
  }
  const out = new Map<string, Trade>();
  for (const [tradeId, g] of groups) {
    const entry = g.entries.length === 1 ? g.entries[0]! : null;
    const exit = g.exits.length === 1 ? g.exits[0]! : null;
    let problem: string | null = null;
    if (g.entries.length !== 1) problem = `${g.entries.length} entries recorded for ${tradeId}`;
    else if (g.exits.length > 1) problem = `${g.exits.length} exits recorded for ${tradeId}`;
    else if (exit && (entry!.linkedEventId !== exit.id || exit.linkedEventId !== entry!.id))
      problem = `the entry and exit of ${tradeId} do not link to each other`;
    else if (!exit && entry!.meta.open !== true && entry!.linkedEventId)
      problem = `the exit ${entry!.linkedEventId} of ${tradeId} is missing`;
    const linked = !problem;
    const status: Trade['status'] = !linked
      ? 'unlinked'
      : exit
        ? 'closed'
        : entry!.meta.open === true
          ? 'open'
          : 'unlinked';
    const principal = num(entry, 'principal');
    let pnl: TradePnl | null = null;
    let pnlUnavailable: string | null = null;
    if (status === 'closed') {
      const net = num(exit, 'net');
      if (net === null) pnlUnavailable = 'the exit records no net P&L';
      else {
        const recorded = num(exit, 'netReturn');
        pnl = {
          netUsd: net,
          percent: recorded ?? (principal && principal > 0 ? (net / principal) * 100 : null),
          unrealized: false,
          basis: 'realized: after transaction costs and margin interest',
          markDate: null
        };
      }
    } else if (status === 'open') {
      const o = openPnl(metrics, symbol, principal);
      pnl = o.pnl;
      pnlUnavailable = o.reason;
    } else pnlUnavailable = problem ?? (entry ? 'no exit is linked to this entry' : 'no entry is linked to this exit');
    const exitReason =
      text(exit, 'exitReason') ??
      (typeof exit?.meta.exitReason === 'string' ? exit.meta.exitReason : null) ??
      (exit?.reason ? exit.reason.split(/[.;:]/)[0]!.trim() : null);
    out.set(tradeId, {
      key: `${role}:${symbol}:${tradeId}`,
      role,
      runId,
      symbol,
      tradeId,
      entry: linked || g.entries.length === 1 ? entry : null,
      exit: linked ? exit : null,
      status,
      problem,
      pnl,
      pnlUnavailable,
      exitReason: linked ? exitReason : null,
      heldDays: linked && entry && exit ? (Date.parse(exit.t) - Date.parse(entry.t)) / 86_400_000 : null
    });
  }
  return out;
}

/** Entry trades first, in time order (a trade without an entry last). */
export const tradeList = (trades: ReadonlyMap<string, Trade>) =>
  [...trades.values()].sort(
    (a, b) =>
      (a.entry ? Date.parse(a.entry.t) : Infinity) - (b.entry ? Date.parse(b.entry.t) : Infinity) ||
      (a.tradeId < b.tradeId ? -1 : 1)
  );

export const formatMoney = (x: number) =>
  `${x > 0 ? '+' : x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

export const formatPct = (x: number | null) =>
  x === null ? '' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(2)}%`;

/** "+$1,234.56 (+1.23%)", the P&L text of a trade (or null when unavailable). */
export const pnlText = (t: Trade) =>
  t.pnl ? `${formatMoney(t.pnl.netUsd)}${t.pnl.percent === null ? '' : ` (${formatPct(t.pnl.percent)})`}` : null;
