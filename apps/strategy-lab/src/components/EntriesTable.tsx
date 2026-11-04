import { type KeyboardEvent, useEffect, useMemo, useRef } from 'react';

import type { ExplorerModel } from '../data/model.ts';
import { formatClock, formatCount, formatPrice } from '../format.ts';
import type { Action, ExplorerState, SortKey } from '../state/explorer.ts';
import { type DisplayEvent, type XRange, inRange } from '../state/selectors.ts';
import { Swatch, TYPE_LABEL } from './Swatch.tsx';

interface Props {
  model: ExplorerModel;
  state: ExplorerState;
  dispatch: (a: Action) => void;
  /** Every drawn event (all dates), already honouring variation, visibility and type filters. */
  drawn: readonly DisplayEvent[];
  range: XRange;
  onSelect: (id: string, locate: boolean) => void;
}

const COLUMNS: { key: SortKey | null; label: string; className?: string }[] = [
  { key: 'variation', label: 'Var.' },
  { key: 'type', label: 'Type' },
  { key: 'date', label: 'Session date' },
  { key: 'price', label: 'Price', className: 'num' },
  { key: null, label: 'Trigger' },
  { key: null, label: 'Execution' }
];

export function EntriesTable({ model, state, dispatch, drawn, range, onSelect }: Props) {
  const inView = useMemo(() => drawn.filter((d) => inRange(d.event.x, range)), [drawn, range]);
  const scoped = state.tableScope === 'in-view' ? inView : drawn;

  const rows = useMemo(() => {
    const q = state.tableQuery.trim().toLowerCase();
    const filtered = q
      ? scoped.filter((d) =>
          `${d.event.d} ${d.event.trigger.summary} ${d.event.type} ${d.event.execution?.reason ?? ''}`
            .toLowerCase()
            .includes(q)
        )
      : [...scoped];
    const { key, dir } = state.sort;
    const sign = dir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      let c = 0;
      if (key === 'price') c = a.event.price - b.event.price;
      else if (key === 'type') c = a.event.type.localeCompare(b.event.type);
      else if (key === 'variation') c = a.role.localeCompare(b.role);
      return sign * c || sign * (a.event.x - b.event.x) || a.role.localeCompare(b.role);
    });
    return filtered;
  }, [scoped, state.tableQuery, state.sort]);

  // Keep the selected row in sight when the selection comes from the chart — scrolling only the table's own
  // container, never the page (scrollIntoView would also scroll every ancestor).
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = scrollRef.current;
    if (!state.selectedEventId || !box) return;
    const row = box.querySelector<HTMLElement>(`tr[data-event-id="${CSS.escape(state.selectedEventId)}"]`);
    if (!row) return;
    const head = box.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const r = row.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (r.top < b.top + head) box.scrollTop -= b.top + head - r.top;
    else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom;
  }, [state.selectedEventId, rows]);

  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(id, true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (
        e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling
      ) as HTMLElement | null;
      next?.focus();
    }
  };

  const selectedHidden = state.selectedEventId !== null && !rows.some((d) => d.event.id === state.selectedEventId);

  return (
    <section className="card entries-card" aria-label="Entries" data-testid="entries">
      <div className="card-head">
        <h2>
          Entries{' '}
          <span className="muted" data-testid="entries-count">
            ({formatCount(rows.length)} shown · {formatCount(inView.length)} in window · {formatCount(drawn.length)}{' '}
            total)
          </span>
        </h2>
        <div className="entries-controls">
          <div className="segmented small" role="radiogroup" aria-label="Table scope">
            {(['in-view', 'all'] as const).map((s) => (
              <label key={s} className={state.tableScope === s ? 'is-on' : ''}>
                <input
                  type="radio"
                  name="table-scope"
                  checked={state.tableScope === s}
                  onChange={() => dispatch({ type: 'setTableScope', scope: s })}
                />
                {s === 'in-view' ? 'Chart window' : 'All dates'}
              </label>
            ))}
          </div>
          <label className="search small">
            <span className="visually-hidden">Filter entries</span>
            <input
              type="search"
              placeholder="Filter date, trigger…"
              value={state.tableQuery}
              onChange={(e) => dispatch({ type: 'setTableQuery', query: e.target.value })}
              data-testid="entries-filter"
            />
          </label>
        </div>
      </div>
      {selectedHidden && (
        <p className="muted small">The selected event is outside the current table filter or window.</p>
      )}
      <div className="table-scroll entries-scroll" ref={scrollRef}>
        <table className="entries-table" data-testid="entries-table">
          <thead>
            <tr>
              {COLUMNS.map((c) => {
                const active = c.key !== null && state.sort.key === c.key;
                return (
                  <th
                    key={c.label}
                    scope="col"
                    className={c.className}
                    aria-sort={active ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    {c.key ? (
                      <button
                        type="button"
                        className="sort"
                        onClick={() => dispatch({ type: 'sortBy', key: c.key as SortKey })}
                      >
                        {c.label}
                        <span aria-hidden="true">{active ? (state.sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const e = d.event;
              const selected = e.id === state.selectedEventId;
              const v = model.variationById.get(e.variationId)?.variation;
              return (
                <tr
                  key={e.id}
                  data-event-id={e.id}
                  tabIndex={0}
                  aria-selected={selected}
                  className={selected ? 'is-selected' : undefined}
                  onClick={() => onSelect(e.id, true)}
                  onKeyDown={(k) => onRowKey(k, e.id)}
                >
                  <td>
                    <span className={`role-badge role-badge-${d.role.toLowerCase()}`}>{d.role}</span>{' '}
                    <span className="muted">{v?.code}</span>
                  </td>
                  <td>
                    <Swatch role={d.role} type={e.type} /> {TYPE_LABEL[e.type]}
                  </td>
                  <td className="mono">
                    {e.d}
                    <span className="sub">{formatClock(Date.parse(e.t), model.timeZone)}</span>
                  </td>
                  <td className="num mono">{formatPrice(e.price)}</td>
                  <td className="trigger-cell">{e.trigger.summary}</td>
                  <td className="muted exec-cell" title={e.execution?.reason}>
                    {e.type === 'executed' ? 'fill' : e.execution?.status === 'executed' ? 'executed' : 'not executed'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="muted empty-state" data-testid="entries-empty">
            {drawn.length === 0
              ? 'No drawn events: choose a variation, show it, or change the type filter.'
              : state.tableQuery
                ? 'No entry matches the filter.'
                : 'No drawn events in the chart window. Switch to “All dates” or zoom out.'}
          </p>
        )}
      </div>
    </section>
  );
}
