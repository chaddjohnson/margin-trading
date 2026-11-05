import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  basisDateOf,
  EVENT_KIND_LABEL,
  EVENT_KINDS,
  type EventKind,
  type LabEvent,
  type RunDetail,
  type LabRunRequest,
  type RunSummary
} from '../../shared/contract.ts';
import type { PreviewDetail } from '../../shared/preview.ts';
import { api, type DeleteRunResult, displayId, type EventsResponse, type PricesResponse } from '../api.ts';
import type { Role } from '../chart/markers.ts';
import { isMacPlatform, PAN_MODIFIER_LABEL, panModifierFor } from '../chart/pan.ts';
import { type ChartEvent, type ChartHandle, PriceChart } from '../chart/PriceChart.tsx';
import { formatEt, formatEtDate, relativeTime } from '../format.ts';
import { remember, useFetched, useScoped } from '../hooks.ts';
import { matchSelection } from '../preview/model.ts';
import { usePreview } from '../preview/usePreview.ts';
import { EventTable, MarkerTooltip } from './Events.tsx';
import { NotesList } from './Notes.tsx';
import { AnalysisPanel, EventDetail, Glyph, ParametersPanel } from './Panels.tsx';
import { TradeDetail, TradeTable } from './Trading.tsx';
import type { ChartLink, Placement } from '../chart/link.ts';
import { buildTrades, toneOf, type Trade } from '../trades.ts';
import { legendToneOf, markerToneOf, TONE_COLOR, TONE_LABEL } from '../chart/markers.ts';
import { currentVersionOf, RISE_FROM_RECENT_LOW, RISE_FROM_RECENT_LOW_TRADING, STUDY8_POOL } from '../../shared/strategies.ts';
import { ComparisonPanel } from './Comparison.tsx';
import { DeleteRunDialog } from './DeleteRunDialog.tsx';
import { PreviewBanner } from './PreviewBanner.tsx';
import { PreviewPanel } from './PreviewPanel.tsx';
import type { EventTableView } from './Events.tsx';

type Detail = RunDetail & { request: LabRunRequest | null };

interface Props {
  runId: string;
  compareId: string | null;
  symbol: string | null;
  /** The Interactive Preview the page displays instead of the saved result (PV-…), or null. */
  previewId: string | null;
  onRoute: (r: { run?: string; symbol?: string | null; compare?: string | null; preview?: string | null }) => void;
  onClone: (req: Partial<LabRunRequest>) => void;
  onChanged: () => void;
  /** After a completed deletion of this run (the parent updates the list, the route and the feedback). */
  onDeleted: (result: DeleteRunResult) => void;
  /** After Save as run created a new run from the displayed preview (the parent refreshes the list). */
  onSaved: (runId: string, sourceRun: string) => void;
  refreshKey: number;
}

const DAY = 86_400_000;
const PAN_KEY = PAN_MODIFIER_LABEL[panModifierFor(isMacPlatform(navigator))];
const active = (s: RunDetail['status']) => s === 'queued' || s === 'running';

function useRun(id: string | null, refreshKey: number, onFinished: () => void) {
  const [state, setState] = useState<{ id: string; run: Detail | null; error: string | null } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wasActive = false;
    const load = () =>
      api
        .run(id)
        .then((r) => {
          if (!live) return;
          setState({ id, run: r, error: null });
          if (active(r.status)) {
            wasActive = true;
            timer = setTimeout(load, 1500);
          } else if (wasActive) onFinished();
        })
        .catch((e: Error) => live && setState({ id, run: null, error: e.message }));
    void load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
    // onFinished only refreshes lists
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshKey]);
  const mine = state && id && state.id === id ? state : null;
  return { run: mine?.run ?? null, error: mine?.error ?? null };
}

export function RunView({ runId, compareId, symbol: routeSymbol, previewId, onRoute, onClone, onChanged, onDeleted, onSaved, refreshKey }: Props) {
  const { run, error } = useRun(runId, refreshKey, onChanged);
  // Interactive Preview: the displayed result is the saved run, or a temporary preview that replaces EVERY result view
  // at once (chart, events, trades, analysis, parameters). The saved run itself is never modified.
  const symbolNow = run ? (routeSymbol && run.symbols.includes(routeSymbol) ? routeSymbol : run.symbols[0]!) : null;
  // Loads a completed preview's chart data for the current symbol BEFORE it is displayed (no blank chart, no mixing).
  const prefetch = async (d: PreviewDetail) => {
    const sym = symbolNow && d.symbols.includes(symbolNow) ? symbolNow : d.symbols[0]!;
    const b = basisDateOf(d.priceSource, sym);
    const [ev, px] = await Promise.all([api.events(d.id, sym, b), api.prices(d.id, sym, { points: 3000 })]);
    remember(`events|${d.id}|${sym}|${b}`, ev);
    remember(`prices|${d.id}|${sym}`, px);
  };
  const pv = usePreview({
    run,
    routePreview: previewId,
    setRoutePreview: (id) => onRoute({ preview: id }),
    prefetch,
    onSaved: (id) => onSaved(id, runId)
  });
  const previewing = Boolean(pv.displayed);
  const shown: Detail | null = pv.displayed ? pv.displayed.detail : run;
  const { run: runB0, error: errorB } = useRun(compareId, refreshKey, () => {});
  // A comparison is between saved runs: while a preview is displayed, run B is set aside (not mixed in).
  const runB = previewing ? null : runB0;
  // The comparison run no longer exists (deleted elsewhere): drop it instead of showing a stale selection.
  useEffect(() => {
    if (compareId && errorB && /no run|already deleted|not found/i.test(errorB)) onRoute({ compare: null });
  }, [compareId, errorB, onRoute]);
  const symbol = shown ? (routeSymbol && shown.symbols.includes(routeSymbol) ? routeSymbol : shown.symbols[0]!) : null;
  // Presentation preferences belong to the page, not to a result: they survive every preview swap.
  const [kinds, setKinds] = useState<Set<EventKind>>(() => new Set(EVENT_KINDS));
  const [tableView, setTableView] = useState<EventTableView>({ scope: 'window', q: '', sort: { key: 'time', dir: 1 } });
  const [lossesOnly, setLossesOnly] = useState<{ A: boolean; B: boolean }>({ A: false, B: false });
  // Hover belongs to one displayed result/symbol/comparison; selection too, except that a swap to another result of the
  // same page keeps the selected event when the new result has the SAME one (same kind, instant, price; for a fill the
  // same trade legs) — never by its ordinal id.
  const base = `${runId}|${symbol}|${compareId}`;
  const scope = `${base}|${shown?.id}`;
  const [sel, setSel] = useState<{ base: string; shownId: string; key: string; event: LabEvent; from: LabEvent[] } | null>(null);
  const [hover, setHover] = useScoped<{ keys: string[]; anchor: DOMRect; placement: Placement } | null>(scope, null);
  const [view, setView] = useState<{ range: [number, number]; full: boolean } | null>(null);
  const lastWindow = useRef<[number, number] | null>(null);
  const chartRef = useRef<ChartHandle>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [withMinuteMarks, setWithMinuteMarks] = useState(false);
  const [exporting, setExporting] = useState<{ busy: boolean; message: string | null }>({ busy: false, message: null });
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', close, true);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', close, true);
    };
  }, [menuOpen]);
  const basis = shown && symbol ? basisDateOf(shown.priceSource, symbol) : null;

  const pricesQ = useFetched<PricesResponse>(shown && symbol ? `prices|${shown.id}|${symbol}` : null, (signal) =>
    api.prices(shown!.id, symbol!, { points: 3000 }, signal)
  );
  const prices = pricesQ.data;
  const priceError = pricesQ.error;
  const eventsA = useFetched<EventsResponse>(
    shown && symbol && shown.status === 'completed' ? `events|${shown.id}|${symbol}|${basis}` : null,
    (signal) => api.events(shown!.id, symbol!, basis, signal)
  ).data;

  const compareProblem =
    runB && run && symbol
      ? runB.dataOrigin !== run.dataOrigin
        ? 'B mixes synthetic and real data: not compared.'
        : !runB.symbols.includes(symbol)
          ? `${runB.id} has no ${symbol} events.`
          : runB.status !== 'completed'
            ? `${runB.id} is ${runB.status}.`
            : null
      : null;

  const eventsBQ = useFetched<EventsResponse>(
    runB && symbol && !compareProblem ? `${runB.id}|${symbol}|${basis}|${runB.status}` : null,
    (signal) => api.events(runB!.id, symbol!, basis, signal)
  );
  const eventsB = eventsBQ.data;

  const candidates = (
    useFetched<RunSummary[]>(run && symbol ? `${symbol}|${refreshKey}` : null, () =>
      api.runs({ q: symbol!, limit: 50 })
    ).data ?? []
  ).filter(
    (r) =>
      run &&
      symbol &&
      r.id !== run.id &&
      r.status === 'completed' &&
      r.dataOrigin === run.dataOrigin &&
      r.symbols.includes(symbol)
  );

  // Trades per run, from ALL of this symbol's events (pairing never depends on which kinds the legend shows): an entry
  // and its exit are linked only through their recorded tradeId and mutual linkedEventId, never by time or price.
  const tradesA = useMemo(
    () => buildTrades(eventsA?.events ?? [], symbol ?? '', 'A', eventsA?.runId ?? '', shown?.metrics),
    [eventsA, symbol, shown?.metrics]
  );
  const tradesB = useMemo(
    () =>
      eventsB && runB && !compareProblem
        ? buildTrades(eventsB.events, symbol ?? '', 'B', eventsB.runId, runB.metrics)
        : new Map<string, Trade>(),
    [eventsB, runB, symbol, compareProblem]
  );
  // Chart events: ONLY the current symbol (the server filters too; this is the second guard), honouring the kinds.
  const chartEvents = useMemo((): ChartEvent[] => {
    // Each marker's tone: its trade's outcome from the recorded net P&L (executed entries/exits), or its kind's colour.
    const make = (role: Role, r: EventsResponse | null) =>
      (r?.events ?? [])
        .filter((e) => e.symbol === symbol && kinds.has(e.kind))
        .map((event) => ({
          key: `${role}:${event.id}`,
          role,
          runId: r!.runId,
          event,
          y: r!.display[event.id] ?? event.price,
          tone: markerToneOf(
            event.kind,
            event.tradeId ? ((role === 'A' ? tradesA : tradesB).get(event.tradeId) ?? null) : null
          )
        }));
    return [...make('A', eventsA), ...make('B', compareProblem ? null : eventsB)];
  }, [eventsA, eventsB, symbol, kinds, compareProblem, tradesA, tradesB]);

  const byKey = useMemo(() => new Map(chartEvents.map((c) => [c.key, c])), [chartEvents]);
  // The selection: kept within one displayed result; carried to another result of the same page only by stable identity.
  const rawSelectedKey = useMemo(() => {
    if (!sel || sel.base !== base || !shown) return null;
    if (sel.shownId === shown.id) return sel.key;
    if (!sel.key.startsWith('A:') || !eventsA || eventsA.runId !== shown.id) return null;
    const match = matchSelection(sel.event, sel.from, eventsA.events);
    return match ? `A:${match.id}` : null;
  }, [sel, base, shown, eventsA]);
  // A selection whose event is filtered out or gone reads as no selection.
  const selected = rawSelectedKey ? (byKey.get(rawSelectedKey) ?? null) : null;
  const selectedKey = selected ? rawSelectedKey : null;

  const select = useCallback(
    (key: string, locate: boolean) => {
      const c = byKey.get(key);
      if (!c || !shown) return;
      const from = (c.role === 'A' ? eventsA : eventsB)?.events ?? [];
      setSel({ base, shownId: shown.id, key, event: c.event, from });
      if (locate) {
        const t = Date.parse(c.event.t);
        const w = chartRef.current?.getWindow();
        if (w && (t < w[0] || t > w[1])) chartRef.current?.centerOn(t);
      }
    },
    [byKey, base, shown, eventsA, eventsB]
  );

  const tradeOf = useCallback(
    (c: ChartEvent): Trade | null =>
      c.event.tradeId && c.event.symbol === symbol
        ? ((c.role === 'A' ? tradesA : tradesB).get(c.event.tradeId) ?? null)
        : null,
    [tradesA, tradesB, symbol]
  );
  // The counterpart of a hovered executed entry/exit (for the chart's connector), or null.
  const linkOf = useCallback(
    (key: string): ChartLink | null => {
      const c = byKey.get(key);
      if (!c || (c.event.kind !== 'executed_entry' && c.event.kind !== 'executed_exit')) return null;
      const t = tradeOf(c);
      if (!t || t.status === 'unlinked') return null;
      if (t.status === 'open')
        return c.event.kind === 'executed_entry' ? { partnerKey: null, partner: null, tone: toneOf(t) } : null;
      const partner = c.event.kind === 'executed_entry' ? t.exit : t.entry;
      if (!partner || partner.symbol !== c.event.symbol) return null;
      const response = c.role === 'A' ? eventsA : eventsB;
      const partnerKey = `${c.role}:${partner.id}`;
      return {
        partnerKey: byKey.has(partnerKey) ? partnerKey : null,
        partner: {
          t: Date.parse(partner.t),
          y: response?.display[partner.id] ?? partner.price,
          kind: partner.kind as 'executed_entry' | 'executed_exit'
        },
        tone: toneOf(t)
      };
    },
    [byKey, tradeOf, eventsA, eventsB]
  );

  const onActivate = (keys: string[]) => {
    const i = keys.indexOf(selectedKey ?? '');
    const next = keys[(i + 1) % keys.length];
    if (next) select(next, false);
  };

  if (error) return <div className="main-empty form-error">{error}</div>;
  if (!run || !shown || !symbol) return <div className="main-empty">Loading run…</div>;
  const exportBundle = async () => {
    setExporting({ busy: true, message: null });
    try {
      const r = await api.downloadBundle(shown.id, withMinuteMarks);
      setExporting({ busy: false, message: `Downloaded ${r.filename} (${Math.round(r.bytes / 1024).toLocaleString('en-US')} KB)` });
    } catch (e) {
      setExporting({ busy: false, message: `Export failed: ${(e as Error).message}` });
    }
  };
  const clonable =
    (shown.kind === 'manual' || shown.kind === 'preview') &&
    shown.request &&
    currentVersionOf(shown.strategy.key) &&
    shown.strategy.key !== STUDY8_POOL.key;
  const trading = shown.strategy.key === RISE_FROM_RECENT_LOW_TRADING.key;
  // The trade of the selected event (entry or exit alike): selecting the other marker of the same trade keeps it.
  const selectedTrade = selected ? tradeOf(selected) : null;
  const selectTrade = (t: Trade) => {
    const key = [t.entry, t.exit].map((e) => (e ? `${t.role}:${e.id}` : '')).find((k) => byKey.has(k));
    if (key) select(key, true);
  };

  const counts = (role: Role) => {
    const src = role === 'A' ? eventsA : eventsB;
    const out: Partial<Record<EventKind, number>> = {};
    for (const e of src?.events ?? []) if (e.symbol === symbol) out[e.kind] = (out[e.kind] ?? 0) + 1;
    return out;
  };
  const countsA = counts('A');
  const countsB = counts('B');
  const kindsPresent = EVENT_KINDS.filter((k) => (countsA[k] ?? 0) + (countsB[k] ?? 0) > 0);
  const hovered = hover ? hover.keys.map((k) => byKey.get(k)).filter((x): x is ChartEvent => Boolean(x)) : [];

  const saveTitle = async () => {
    if (editingTitle === null) return;
    const t = editingTitle.trim();
    setEditingTitle(null);
    if (t && t !== run.title) {
      await api.setRunTitle(run.id, t);
      onChanged();
    }
  };

  return (
    <div className="run-view" data-run-id={run.id} data-symbol={symbol}>
      <section className={`card run-header${previewing ? ' is-previewing' : ''}`} aria-label="Run" data-testid="run-header">
        {pv.displayed && (
          <PreviewBanner
            preview={pv.displayed.detail}
            cacheHit={pv.displayed.cacheHit}
            restored={pv.displayed.restored}
            source={run}
            onReturn={pv.returnToSaved}
            onSave={pv.save}
            onOpenRun={(id) => onRoute({ run: id })}
          />
        )}
        {pv.loading && (
          <div className="preview-banner is-loading" role="status" data-testid="preview-loading">
            Loading the temporary preview {displayId(pv.loading)}… (the saved result is shown meanwhile)
          </div>
        )}
        {pv.notice && (
          <div className="app-notice tone-warn" role="status" data-testid="preview-notice">
            <span>{pv.notice}</span>
            <button type="button" className="btn-ghost" onClick={pv.dismissNotice} aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}
        <div className={`run-title-row${previewing ? ' is-source' : ''}`}>
          {previewing && <span className="source-label small">Source (saved, unchanged):</span>}
          <span className="mono run-id" data-testid="run-id">
            {run.id}
          </span>
          {editingTitle === null ? (
            <h2 className="run-title">
              {run.title}{' '}
              <button
                type="button"
                className="link small"
                onClick={() => setEditingTitle(run.title)}
                aria-label="Edit run title"
              >
                ✎ rename
              </button>
            </h2>
          ) : (
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault();
                void saveTitle();
              }}
            >
              <input
                autoFocus
                maxLength={160}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                aria-label="Run title"
              />
              <button type="submit" className="btn-chip">
                Save
              </button>
              <button type="button" className="btn-ghost" onClick={() => setEditingTitle(null)}>
                Cancel
              </button>
            </form>
          )}
          <span className={`status status-${run.status}`} data-testid="run-status">
            {run.status}
          </span>
          <span className={`badge ${run.dataOrigin === 'real' ? 'badge-real' : 'badge-synthetic'}`}>
            {run.dataOrigin === 'real' ? 'REAL MARKET DATA' : 'SYNTHETIC DEMO DATA'}
          </span>
          <span className="badge badge-muted">{run.kind}</span>
          {run.strategy.key === RISE_FROM_RECENT_LOW_TRADING.key && (
            <span className="badge badge-trading" data-testid="result-kind">
              TRADING BACKTEST · STANDALONE PER SYMBOL
            </span>
          )}
          {run.strategy.key === RISE_FROM_RECENT_LOW.key && (
            <span className="badge badge-muted" data-testid="result-kind">
              SIGNAL-ONLY
            </span>
          )}
          {run.strategy.key === STUDY8_POOL.key && (
            <span className="badge badge-trading" data-testid="result-kind">
              SHARED-SLOT POOL · ONE ALLOCATOR REPLAY
            </span>
          )}
          {run.strategy.key === RISE_FROM_RECENT_LOW_TRADING.key && (
            <span className="badge badge-muted mono" data-testid="strategy-version" title={run.strategyFormerTitle ? `formerly “${run.strategyFormerTitle}”` : undefined}>
              Growth v{run.strategy.version}
            </span>
          )}
          {run.phenotype && (
            <a className="badge badge-phenotype" href={`#/phenotype/${run.phenotype.id}`} data-testid="phenotype-badge">
              PHENOTYPE {run.phenotype.id}
              {run.phenotype.edited ? ' · EDITED' : ''}
            </a>
          )}
          <button
            type="button"
            className={`star big${run.bookmarked ? ' is-on' : ''}`}
            aria-pressed={run.bookmarked}
            aria-label={run.bookmarked ? 'Remove bookmark' : 'Bookmark this run'}
            onClick={async () => {
              await api.bookmark('run', run.id, !run.bookmarked);
              onChanged();
            }}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 1.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />
            </svg>
          </button>
          <div className="run-actions" ref={menuRef}>
            <button
              type="button"
              className="btn-ghost run-actions-button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="run-actions-menu"
              aria-label={`Actions for ${run.id}`}
              onClick={() => setMenuOpen((o) => !o)}
              data-testid="run-actions"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="run-actions-menu" role="menu" id="run-actions-menu" aria-label={`Actions for ${run.id}`}>
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item is-danger"
                  disabled={run.status === 'queued' || run.status === 'running'}
                  title={run.status === 'queued' || run.status === 'running' ? 'Cancel the run and wait for it to stop first' : undefined}
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmDelete(true);
                  }}
                  data-testid="run-action-delete"
                  ref={(el) => el?.focus()}
                >
                  Delete result…
                </button>
              </div>
            )}
          </div>
        </div>
        {confirmDelete && (
          <DeleteRunDialog
            run={run}
            onCancel={() => setConfirmDelete(false)}
            onDeleted={(result) => {
              setConfirmDelete(false);
              onDeleted(result);
            }}
          />
        )}
        {!previewing && (
          <p className="run-meta small">
            {run.strategy.title} · variation <span className="mono">{run.variation.id}</span> ({run.variation.title}) ·{' '}
            {run.window.from} → {run.window.to}
            {run.window.resolution ? ` · ${run.window.resolution}` : ''} · created {formatEt(run.createdAt)}
            {run.completedAt ? ` · finished ${relativeTime(run.completedAt)}` : ''}
          </p>
        )}
        {active(run.status) && (
          <div className="progress" role="status" data-testid="run-progress">
            <span>{run.progress?.message ?? (run.status === 'queued' ? 'Queued' : 'Running')}…</span>
            {run.progress?.fraction !== null && run.progress?.fraction !== undefined && (
              <progress max={1} value={run.progress.fraction} />
            )}
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                await api.cancelRun(run.id);
                onChanged();
              }}
            >
              Cancel
            </button>
          </div>
        )}
        {run.status === 'failed' && (
          <div className="form-error" role="alert" data-testid="run-error">
            Failed: {run.error}
          </div>
        )}
        {run.status === 'cancelled' && <div className="muted">Cancelled: {run.error}</div>}
        <div className="compare row">
          <label className="small">
            Compare with (B){' '}
            <select
              value={compareId ?? ''}
              onChange={(e) => onRoute({ compare: e.target.value || null })}
              disabled={previewing}
              title={previewing ? 'Comparisons are between saved runs: return to the saved result (or save the preview) to compare' : undefined}
              data-testid="compare-select"
              aria-label="Compare with another run"
            >
              <option value="">— none —</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} · {c.title}
                </option>
              ))}
              {compareId && !candidates.some((c) => c.id === compareId) && (
                <option value={compareId}>{compareId}</option>
              )}
            </select>
          </label>
          {compareProblem && <span className="muted small">{compareProblem}</span>}
          {previewing && compareId && <span className="muted small">Run B is set aside while a preview is shown.</span>}
          {shown.status === 'completed' && (
            <span className="export-control">
              <button
                type="button"
                className="btn-chip"
                onClick={() => void exportBundle()}
                disabled={exporting.busy}
                data-testid="export-bundle"
                title={
                  previewing
                    ? 'A ZIP of the displayed TEMPORARY PREVIEW (labelled as such): artifacts, CSVs, parameters, README and checksums'
                    : 'A ZIP with the unmodified artifacts, trade/event/decision CSVs, parameters, attribution, README and checksums'
                }
              >
                {exporting.busy ? 'Exporting…' : previewing ? 'Export preview bundle' : 'Export research bundle'}
              </button>
              <label className="small">
                <input
                  type="checkbox"
                  checked={withMinuteMarks}
                  onChange={(e) => setWithMinuteMarks(e.target.checked)}
                  data-testid="export-minute-marks"
                />{' '}
                include minute marks
              </label>
              {exporting.message && (
                <span className="muted small" role="status" data-testid="export-status">
                  {exporting.message}
                </span>
              )}
            </span>
          )}
        </div>
      </section>

      <section className={`card chart-card${pv.open ? ' has-preview-panel' : ''}`} aria-label={`${symbol} price and events`}>
        <div className="chart-toolbar">
        <div className="symbol-tabs" role="tablist" aria-label="Symbol" data-testid="symbol-tabs">
          {shown.symbols.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === symbol}
              className={s === symbol ? 'is-on' : ''}
              onClick={() => onRoute({ symbol: s })}
              data-testid={`symbol-tab-${s}`}
            >
              {s}
            </button>
          ))}
          <span className="muted small symbol-note">
            Only {symbol}’s price and {symbol}’s events are shown
            {shown.symbols.length > 1 ? '; other symbols are on their own tabs' : ''}.
          </span>
        </div>
          <button
            type="button"
            className={`btn-chip preview-toggle${pv.open ? ' is-on' : ''}${previewing ? ' is-previewing' : ''}`}
            aria-pressed={pv.open}
            aria-expanded={pv.open}
            aria-controls="preview-panel"
            onClick={() => pv.setOpen(!pv.open)}
            ref={toggleRef}
            data-testid="preview-toggle"
            title="Edit this strategy's parameters and run ONE configuration at a time, without saving a run"
          >
            Interactive Preview{previewing ? ' · showing a preview' : ''}
          </button>
        </div>
        <div className="chart-split">
        <div className="chart-main">
        <div className="legend" data-testid="legend">
          <span className="legend-price">
            <span className="line-key" /> {symbol}{' '}
            {shown.dataOrigin === 'synthetic' ? '(synthetic)' : prices ? `(${prices.units})` : ''}
          </span>
          {kindsPresent.map((k) => (
            <label key={k} className={`legend-kind${kinds.has(k) ? '' : ' is-off'}`}>
              <input
                type="checkbox"
                checked={kinds.has(k)}
                onChange={(e) =>
                  setKinds((s) => {
                    const n = new Set(s);
                    if (e.target.checked) n.add(k);
                    else n.delete(k);
                    return n;
                  })
                }
                data-testid={`kind-${k}`}
              />
              <Glyph kind={k} role="A" tone={legendToneOf(k)} /> {EVENT_KIND_LABEL[k]}{' '}
              <b data-testid={`count-A-${k}`}>{countsA[k] ?? 0}</b>
              {runB && !compareProblem && (
                <>
                  {' '}
                  · <Glyph kind={k} role="B" tone={legendToneOf(k)} />{' '}
                  <b data-testid={`count-B-${k}`}>{countsB[k] ?? 0}</b>
                </>
              )}
            </label>
          ))}
          {shown.status === 'completed' && kindsPresent.length === 0 && (
            <span className="muted small">No events for {symbol}.</span>
          )}
          {(countsA.executed_entry ?? 0) + (countsB.executed_entry ?? 0) > 0 && (
            <span className="legend-tones small" data-testid="legend-tones">
              Trade colours (net P&amp;L after costs and interest, both markers alike):
              {(['profit', 'loss', 'flat', 'open', 'unknown'] as const)
                .filter((t) => t !== 'unknown' || chartEvents.some((c) => c.tone === 'unknown'))
                .map((t) => (
                  <span key={t} className="legend-tone" data-tone={t}>
                    <span className="tone-swatch" style={{ background: TONE_COLOR[t] }} aria-hidden="true" />{' '}
                    {TONE_LABEL[t]}
                  </span>
                ))}
              {runB && !compareProblem && (
                <span className="legend-tone">
                  <span className="tone-swatch tone-swatch-b" aria-hidden="true" /> run B (orange halo)
                </span>
              )}
            </span>
          )}
          {trading && (
            <span className="muted small legend-note" data-testid="legend-trading-note">
              Entry signal = a raw Rise signal taken (order placed) · Rejected signal = a raw signal ignored (invested
              or order pending) · Executed entry / exit = the fills.
            </span>
          )}
        </div>
        <div className="chart-body">
          {priceError ? (
            <div className="chart-missing" role="alert">
              Price data unavailable for {symbol}: {priceError}. No substitute chart is shown.
            </div>
          ) : prices ? (
            prices.points.length === 0 ? (
              <div className="chart-missing" role="alert">
                No {symbol} price data in {shown.window.from} → {shown.window.to}. No substitute chart is shown.
              </div>
            ) : (
              <PriceChart
                key={`${shown.id}:${symbol}`}
                ref={chartRef}
                overview={prices.points}
                overviewDecimated={prices.decimated}
                synthetic={shown.dataOrigin === 'synthetic'}
                fetchDetail={(from, to, signal) =>
                  api
                    .prices(shown.id, symbol, { from: Math.floor(from), to: Math.ceil(to), points: 3000 }, signal)
                    .then((p) => p.points)
                }
                events={chartEvents}
                selectedKey={selectedKey}
                initialWindow={() => lastWindow.current}
                onWindowChange={(range, full) => {
                  setView({ range, full });
                  lastWindow.current = full ? null : range;
                }}
                onActivate={onActivate}
                onHover={(keys, anchor, placement) =>
                  setHover(keys && anchor ? { keys, anchor, placement: placement ?? 'none' } : null)
                }
                linkOf={linkOf}
              />
            )
          ) : (
            <div className="chart-missing">Loading {symbol} prices…</div>
          )}
        </div>
        <div className="chart-tools">
          <div className="row" role="group" aria-label="Zoom">
            {[
              ['1W', 7],
              ['1M', 31],
              ['3M', 92],
              ['1Y', 366],
              ['3Y', 1096]
            ].map(([label, days]) => (
              <button
                key={label}
                type="button"
                className="btn-chip"
                onClick={() => {
                  const w = chartRef.current?.getWindow();
                  if (w) chartRef.current?.zoomAround((w[0] + w[1]) / 2, Number(days) * DAY);
                }}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className={`btn-chip${view?.full ? ' is-on' : ''}`}
              onClick={() => chartRef.current?.setWindow(null)}
              data-testid="zoom-all"
            >
              All
            </button>
          </div>
          <span className="muted small">
            {view ? `${formatEtDate(view.range[0])} → ${formatEtDate(view.range[1])}` : ''}
            {prices?.decimated ? ' · overview decimated (min/max per bucket); zoom in for minute detail' : ''}
          </span>
          <span className="muted small chart-hint">
            Drag to measure · swipe up / scroll to zoom in, down to zoom out · {PAN_KEY}-drag (or Shift-drag) to pan ·
            double-click resets
          </span>
        </div>
        </div>
        {pv.open && (
          <PreviewPanel
            c={pv}
            sourceRunId={run.id}
            onClose={() => {
              pv.setOpen(false);
              toggleRef.current?.focus();
            }}
          />
        )}
        </div>
      </section>

      <div className="lower">
        {runB && !compareProblem && run.status === 'completed' && !previewing && (
          <ComparisonPanel a={run.id} b={runB.id} symbol={symbol} />
        )}
        {(tradesA.size > 0 || tradesB.size > 0) && (
          <section className="card trades" aria-label={`Trades of ${symbol}`} data-testid="trades-card">
            <div className="card-head">
              <h3>Trades · {symbol}</h3>
              <span className="muted small">
                {symbol}’s executed trades only; click a trade, or either of its markers, to select it
              </span>
            </div>
            {(
              [
                ['A', shown.id, tradesA],
                ['B', runB?.id ?? '', tradesB]
              ] as const
            )
              .filter(([, , trades]) => trades.size > 0)
              .map(([role, id, trades]) => (
                <div key={role}>
                  <h4 className="small">
                    <span className={`role-badge role-${role}`}>{role}</span> {displayId(id)}
                    {role === 'A' && previewing ? <span className="badge badge-preview">temporary preview</span> : null}
                  </h4>
                  <TradeTable
                    trades={trades}
                    role={role}
                    selectedTradeKey={selectedTrade?.key ?? null}
                    onSelect={selectTrade}
                    lossesOnly={lossesOnly[role]}
                    onLossesOnly={(on) => setLossesOnly((x) => ({ ...x, [role]: on }))}
                  />
                </div>
              ))}
            <TradeDetail trade={selectedTrade} />
          </section>
        )}
        <EventDetail
          event={selected?.event ?? null}
          role={selected?.role ?? null}
          runId={selected?.runId ?? null}
          tone={selected?.tone ?? null}
          markerPrice={selected && selected.event.price === null ? selected.y : null}
          onSelect={(id) => {
            const key = `${selected?.role ?? 'A'}:${id}`;
            select(key, true);
          }}
          onZoom={() => selected && chartRef.current?.zoomAround(Date.parse(selected.event.t), 30 * DAY)}
        />
        <EventTable
          rows={chartEvents}
          symbol={symbol}
          window={view && !view.full ? view.range : null}
          selectedKey={selectedKey}
          onSelect={(k) => select(k, true)}
          view={tableView}
          onView={setTableView}
        />
        <AnalysisPanel
          runs={[{ role: 'A' as Role, run: shown }, ...(runB && !compareProblem ? [{ role: 'B' as Role, run: runB }] : [])]}
          symbol={symbol}
        />
        <ParametersPanel
          run={shown}
          onClone={
            clonable
              ? () => {
                  // A clone is an ordinary manual test of the CURRENT version (a 1.0.0 Growth run → 1.1.0, continuation
                  // OFF: its request has no continuation fields); a phenotype rerun's clone is no longer a phenotype run.
                  // A preview's clone starts New Test from the preview's configuration (derived from the saved run).
                  const req = Object.fromEntries(Object.entries(shown.request!).filter(([k]) => k !== 'phenotypeId'));
                  onClone({ ...(req as Partial<LabRunRequest>), parentVariation: run.variation.id });
                }
              : null
          }
        />
        <section className="card" aria-label="Notes">
          <div className="card-head">
            <h3>Notes</h3>
          </div>
          {previewing && (
            <p className="muted small" data-testid="notes-preview-note">
              Notes belong to saved runs. These are the notes of the source run {run.id}; save the preview as a run to annotate
              it.
            </p>
          )}
          <h4 className="small">Run {run.id}</h4>
          <NotesList targetType="run" targetId={run.id} onChanged={onChanged} />
          <h4 className="small">Variation {run.variation.id}</h4>
          <NotesList targetType="variation" targetId={run.variation.id} onChanged={onChanged} />
        </section>
      </div>
      {hover && hovered.length > 0 && (
        <MarkerTooltip items={hovered} anchor={hover.anchor} tradeOf={tradeOf} placement={hover.placement} />
      )}
    </div>
  );
}
