import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { EVENT_KIND_LABEL } from '../../shared/contract.ts';
import type { ChartEvent } from '../chart/PriceChart.tsx';
import { formatEt, formatPrice } from '../format.ts';
import { Glyph } from './Panels.tsx';

type SortKey = 'time' | 'kind' | 'price' | 'run';

/** The events of the CURRENT SYMBOL only (both runs when comparing), honouring the kind filter. */
export function EventTable({
  rows,
  symbol,
  window,
  selectedKey,
  onSelect
}: {
  rows: readonly ChartEvent[];
  symbol: string;
  window: [number, number] | null;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const [scope, setScope] = useState<'window' | 'all'>('window');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'time', dir: 1 });
  const inWindow = useMemo(
    () => rows.filter((r) => !window || (Date.parse(r.event.t) >= window[0] && Date.parse(r.event.t) <= window[1])),
    [rows, window]
  );
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
                  <Glyph kind={r.event.kind} role={r.role} /> {EVENT_KIND_LABEL[r.event.kind]}
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

export function MarkerTooltip({ items, anchor }: { items: ChartEvent[]; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    let left = anchor.right + 12;
    if (left + width > window.innerWidth - 8) left = anchor.left - 12 - width;
    left = Math.max(8, Math.min(left, window.innerWidth - 8 - width));
    const top = Math.max(8, Math.min(anchor.top - 8, window.innerHeight - 8 - height));
    setPos({ left, top });
  }, [anchor, items]);
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
      {shown.map((c) => (
        <div key={c.key} className="tt-item" data-symbol={c.event.symbol}>
          <div className="tt-head">
            <Glyph kind={c.event.kind} role={c.role} /> <b>{EVENT_KIND_LABEL[c.event.kind]}</b>
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
          {c.event.reason && <div className="tt-reason">{c.event.reason}</div>}
        </div>
      ))}
      {items.length > shown.length && <div className="muted small">+ {items.length - shown.length} more</div>}
    </div>
  );
}
