import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { ChartEvent } from '../chart/PriceChart.tsx';
import type { MarkerSlot } from '../chart/candles.ts';
import type { Placement } from '../chart/link.ts';
import { eventKindLabel, isPartialExit } from '../chart/markers.ts';
import { formatEt, formatPrice } from '../format.ts';
import { pnlText, toneOf, type Trade } from '../trades.ts';
import { PnlBadge } from './Trading.tsx';
import { Glyph } from './Panels.tsx';

type SortKey = 'time' | 'kind' | 'price' | 'run';

/** The table's view (scope, search, sort): owned by the page when given, so it survives a result swap. */
export interface EventTableView {
  scope: 'window' | 'all';
  q: string;
  sort: { key: SortKey; dir: 1 | -1 };
}

/** The events of the CURRENT SYMBOL only (both runs when comparing), honouring the kind filter. */
export function EventTable({
  rows,
  symbol,
  window,
  selectedKey,
  onSelect,
  view,
  onView,
  chartX
}: {
  rows: readonly ChartEvent[];
  symbol: string;
  window: [number, number] | null;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  view?: EventTableView;
  onView?: (v: EventTableView) => void;
  /** Where the chart draws a row's marker (on candles: its session's candle); "Chart window" uses it. Default: its time. */
  chartX?: (r: ChartEvent) => number;
}) {
  const [own, setOwn] = useState<EventTableView>({ scope: 'window', q: '', sort: { key: 'time', dir: 1 } });
  const current = view ?? own;
  const change = onView ?? setOwn;
  const { scope, q, sort } = current;
  const setScope = (v: EventTableView['scope']) => change({ ...current, scope: v });
  const setQ = (v: string) => change({ ...current, q: v });
  const setSort = (fn: (s: EventTableView['sort']) => EventTableView['sort']) => change({ ...current, sort: fn(current.sort) });
  const inWindow = useMemo(() => {
    const x = chartX ?? ((r: ChartEvent) => Date.parse(r.event.t));
    return rows.filter((r) => !window || (x(r) >= window[0] && x(r) <= window[1]));
  }, [rows, window, chartX]);
  const shown = useMemo(() => {
    const base = scope === 'window' ? inWindow : [...rows];
    const query = q.trim().toLowerCase();
    const filtered = query
      ? base.filter((r) =>
          `${r.event.reason ?? ''} ${r.event.t} ${r.runId} ${r.event.tradeId ?? ''}`.toLowerCase().includes(query)
        )
      : base;
    const val = (r: ChartEvent) =>
      sort.key === 'time'
        ? Date.parse(r.event.t)
        : sort.key === 'price'
          ? (r.event.price ?? -1)
          : sort.key === 'kind'
            ? r.event.kind
            : r.role;
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || Date.parse(a.event.t) - Date.parse(b.event.t);
    });
  }, [rows, inWindow, scope, q, sort]);

  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || !selectedKey) return;
    const row = el.querySelector<HTMLElement>(`tr[data-key="${CSS.escape(selectedKey)}"]`);
    if (!row) return;
    const head = el.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const r = row.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (r.top < b.top + head) el.scrollTop -= b.top + head - r.top;
    else if (r.bottom > b.bottom) el.scrollTop += r.bottom - b.bottom;
  }, [selectedKey, shown]);

  const th = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        className="sort"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))}
      >
        {label}
        {sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  return (
    <section className="card events" aria-label={`Events of ${symbol}`} data-testid="event-table">
      <div className="card-head">
        <h3>
          Events · {symbol}{' '}
          <span className="muted" data-testid="event-count">
            ({shown.length} shown · {inWindow.length} in window · {rows.length} total)
          </span>
        </h3>
        <div className="row">
          <div className="segmented small" role="radiogroup" aria-label="Table scope">
            {(['window', 'all'] as const).map((s) => (
              <label key={s} className={scope === s ? 'is-on' : ''}>
                <input type="radio" name="event-scope" checked={scope === s} onChange={() => setScope(s)} />
                {s === 'window' ? 'Chart window' : 'All dates'}
              </label>
            ))}
          </div>
          <input
            type="search"
            placeholder="Filter reason, time, trade…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter events"
          />
        </div>
      </div>
      <div className="table-scroll" ref={box}>
        <table className="event-table">
          <thead>
            <tr>
              {th('run', 'Run')}
              {th('kind', 'Event')}
              {th('time', 'Time (ET)')}
              {th('price', 'Price')}
              <th scope="col">Reason / decision</th>
              <th scope="col">Trade</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.key}
                data-key={r.key}
                data-symbol={r.event.symbol}
                data-kind={r.event.kind}
                tabIndex={0}
                aria-selected={r.key === selectedKey}
                className={r.key === selectedKey ? 'is-selected' : undefined}
                onClick={() => onSelect(r.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(r.key);
                  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    (
                      (e.key === 'ArrowDown'
                        ? e.currentTarget.nextElementSibling
                        : e.currentTarget.previousElementSibling) as HTMLElement | null
                    )?.focus();
                  }
                }}
              >
                <td>
                  <span className={`role-badge role-${r.role}`}>{r.role}</span>{' '}
                  <span className="mono small">{r.runId}</span>
                </td>
                <td className="nowrap">
                  <Glyph kind={r.event.kind} role={r.role} tone={r.tone} partial={isPartialExit(r.event)} /> {eventKindLabel(r.event)}
                </td>
                <td className="mono nowrap">{formatEt(r.event.t, r.event.timePrecision)}</td>
                <td className="mono num">
                  {r.event.price === null ? <span className="unknown">unknown</span> : formatPrice(r.event.price)}
                </td>
                <td className="reason">{r.event.reason}</td>
                <td className="mono small">{r.event.tradeId ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="muted small empty">
            No events {scope === 'window' ? 'in this window' : 'for this symbol'} with the current filters.
          </p>
        )}
      </div>
    </section>
  );
}

const PLACEMENT_TEXT: Record<Placement, string | null> = {
  visible: null,
  before: 'is earlier than the current view (the chart was not zoomed)',
  after: 'is later than the current view (the chart was not zoomed)',
  open: null,
  none: null
};

/** The hovered trade: entry and exit date/price, holding period and net P&L; where the counterpart is. */
function TradeSummary({ trade, item, placement }: { trade: Trade; item: ChartEvent; placement: Placement }) {
  const counterpart = item.event.kind === 'executed_entry' ? 'The exit' : 'The entry';
  const end = (e: Trade['entry']) => (e ? `${formatEt(e.t, e.timePrecision)} at ${formatPrice(e.price)}` : '—');
  return (
    <div className={`tt-link tone-${toneOf(trade)}`} data-testid="tt-link" data-placement={placement}>
      <div>
        <b>{trade.tradeId}</b> · entry {end(trade.entry)}
      </div>
      <div>
        {trade.status === 'open'
          ? 'Exit: none — the position is still open'
          : `exit ${end(trade.exit)} · held ${trade.heldDays === null ? '—' : `${trade.heldDays.toFixed(1)} days`}`}
      </div>
      <div>
        net {pnlText(trade) ?? `unavailable (${trade.pnlUnavailable})`}
        {trade.pnl?.unrealized ? ' unrealized' : trade.pnl ? ' realized' : ''}
      </div>
      {PLACEMENT_TEXT[placement] && (
        <div className="tt-offscreen" data-testid="tt-offscreen">
          {counterpart} {PLACEMENT_TEXT[placement]}.
        </div>
      )}
    </div>
  );
}

/** The trade-level net P&L of an executed entry or exit: the same figure on both markers of a trade. */
function TradePnl({ item, trade }: { item: ChartEvent; trade: Trade | null }) {
  if (!trade)
    return (
      <div className="tt-pnl na" data-testid="tt-pnl" data-tone="unknown">
        Trade P&amp;L: not recorded{item.event.tradeId ? '' : ' (this event belongs to no recorded trade)'}
      </div>
    );
  return (
    <div className="tt-pnl" data-testid="tt-pnl" data-trade={trade.tradeId}>
      Trade {trade.tradeId} net: <PnlBadge trade={trade} />
      {trade.pnl && <span className="muted small"> · after costs and margin interest</span>}
    </div>
  );
}

export function MarkerTooltip({
  items,
  anchor,
  tradeOf,
  placement = 'none',
  slotOf
}: {
  items: ChartEvent[];
  anchor: DOMRect;
  tradeOf?: (c: ChartEvent) => Trade | null;
  placement?: Placement;
  /** Candles · 1D: the session slot of a marker (its candle and its place in that session's fan). */
  slotOf?: (c: ChartEvent) => MarkerSlot | null;
}) {
  // The hovered trade's counterpart lies later (to the right) for an entry: the tooltip then opens to the left.
  const first = items[0];
  const firstTrade = first && tradeOf ? tradeOf(first) : null;
  const side: 'left' | 'right' =
    firstTrade?.status === 'closed' && first?.event.kind === 'executed_entry' && placement !== 'before'
      ? 'left'
      : 'right';
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    // Beside the marker, on the side AWAY from the hovered trade's counterpart, so the connector stays visible.
    const right = anchor.right + 12;
    const left0 = anchor.left - 12 - width;
    let left = side === 'left' ? left0 : right;
    if (left + width > window.innerWidth - 8) left = left0;
    if (left < 8) left = right;
    left = Math.max(8, Math.min(left, window.innerWidth - 8 - width));
    const top = Math.max(8, Math.min(anchor.top - 8, window.innerHeight - 8 - height));
    setPos({ left, top });
  }, [anchor, items, side]);
  const shown = items.slice(0, 6);
  return (
    <div
      ref={ref}
      className="marker-tooltip"
      role="tooltip"
      data-testid="marker-tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0, visibility: 'hidden' }}
    >
      {items.length > 1 && (
        <div className="tt-overlap">
          {items.length} overlapping events here — zoom in to separate them; click again for the next.
        </div>
      )}
      {shown.map((c, i) => (
        <div key={c.key} className="tt-item" data-symbol={c.event.symbol} data-key={c.key}>
          <div className="tt-head">
            <Glyph kind={c.event.kind} role={c.role} tone={c.tone} partial={isPartialExit(c.event)} /> <b>{eventKindLabel(c.event)}</b>
            <span className="muted">
              {c.event.symbol} · {c.role} {c.runId}
            </span>
          </div>
          <div className="tt-values">
            <span className="tt-strong">
              {c.event.price === null ? 'price not recorded' : formatPrice(c.event.price)}
            </span>
            <span>{formatEt(c.event.t, c.event.timePrecision)}</span>
          </div>
          {slotOf?.(c) && <SessionNote slot={slotOf(c)!} />}
          {c.event.reason && <div className="tt-reason">{c.event.reason}</div>}
          {(c.event.kind === 'executed_entry' || c.event.kind === 'executed_exit') && (
            <TradePnl item={c} trade={tradeOf?.(c) ?? null} />
          )}
          {i === 0 && tradeOf?.(c) && placement !== 'none' && (
            <TradeSummary trade={tradeOf(c)!} item={c} placement={placement} />
          )}
        </div>
      ))}
      {items.length > shown.length && <div className="muted small">+ {items.length - shown.length} more</div>}
    </div>
  );
}

/** Candles · 1D: where the marker sits, and that its time (above) is the exact one, not the candle's position. */
function SessionNote({ slot }: { slot: MarkerSlot }) {
  return (
    <div className="tt-session" data-testid="tt-session">
      {slot.session === null
        ? `No ${slot.date} candle: the marker sits at its own instant.`
        : `Shown on the ${slot.date} daily candle${slot.count > 1 ? ` (${slot.rank + 1} of ${slot.count} events that session, fanned left → right in time order)` : ''}; the time above is the exact event time.`}
    </div>
  );
}
