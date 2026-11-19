import { type KeyboardEvent, useEffect, useState } from 'react';

import type { RunSummary, VariationSummary } from '../../shared/contract.ts';
import { api, type Meta } from '../api.ts';
import { formatEt, relativeTime } from '../format.ts';

export type SidebarTab = 'variations' | 'runs' | 'bookmarks';

interface Props {
  meta: Meta | null;
  selectedRunId: string | null;
  refreshKey: number;
  onSelectRun: (id: string) => void;
  onNewTest: () => void;
  onChanged: () => void;
}

const PAGE = 60;

const paramSummary = (v: VariationSummary) =>
  v.params
    .filter((p) => p.unit !== 'text' || p.key === 'resolution')
    .slice(0, 4)
    .map(
      (p) =>
        `${p.key === 'advanceFromRecentLowPercent' ? 'X' : p.key === 'recentLowLookbackBars' ? 'N' : p.key === 'resolution' ? '' : `${p.key} `}${p.value}${p.unit === 'percent' ? '%' : ''}`
    )
    .join(' · ');

function Star({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`star${on ? ' is-on' : ''}`}
      aria-pressed={on}
      aria-label={on ? `Remove bookmark: ${label}` : `Bookmark ${label}`}
      title={on ? 'Bookmarked — click to remove' : 'Bookmark'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 1.8l2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />
      </svg>
    </button>
  );
}

function StatusChip({ status }: { status: RunSummary['status'] }) {
  return <span className={`status status-${status}`}>{status}</span>;
}

export function Sidebar({ meta, selectedRunId, refreshKey, onSelectRun, onNewTest, onChanged }: Props) {
  const [tab, setTab] = useState<SidebarTab>('runs');
  const [experiment, setExperiment] = useState('');
  const [q, setQ] = useState('');
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [variations, setVariations] = useState<VariationSummary[]>([]);
  const [limit, setLimit] = useState(PAGE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const bookmarked = tab === 'bookmarks';
    const query = { experiment: experiment || undefined, q: q.trim() || undefined, limit, bookmarked };
    Promise.all([
      tab !== 'variations' ? api.runs(query) : Promise.resolve([]),
      tab !== 'runs' ? api.variations(query) : Promise.resolve([])
    ])
      .then(([r, v]) => {
        if (!live) return;
        setRuns(r);
        setVariations(v);
        setError(null);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [tab, experiment, q, limit, refreshKey]);

  const toggle = async (type: 'run' | 'variation', id: string, on: boolean) => {
    await api.bookmark(type, id, on);
    onChanged();
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.item-main')];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    e.preventDefault();
    items[Math.max(0, Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
  };

  const runItem = (r: RunSummary) => (
    <li
      key={`r-${r.id}`}
      className={`item${r.id === selectedRunId ? ' is-selected' : ''}${r.bookmarked ? ' is-bookmarked' : ''}`}
      data-run-id={r.id}
    >
      <button
        type="button"
        className="item-main"
        onClick={() => onSelectRun(r.id)}
        aria-current={r.id === selectedRunId}
      >
        <span className="item-top">
          <span className="mono id">{r.id}</span>
          <StatusChip status={r.status} />
          {r.dataOrigin === 'synthetic' && <span className="badge badge-synthetic">synthetic</span>}
          {r.kind === 'import' && <span className="badge">import</span>}
        </span>
        <span className="item-title">{r.title}</span>
        <span className="item-sub">
          <span>{r.symbols.join(' · ')}</span>
          <span className="mono">{r.variation.id}</span>
          <span title={formatEt(r.completedAt ?? r.createdAt)}>{relativeTime(r.completedAt ?? r.createdAt)}</span>
        </span>
        {r.noteCount > 0 && (
          <span className="item-note">
            <span aria-hidden="true">✎</span> {r.noteExcerpt}
            {r.noteCount > 1 ? ` (+${r.noteCount - 1})` : ''}
          </span>
        )}
      </button>
      <Star on={r.bookmarked} label={`${r.id} ${r.title}`} onToggle={() => void toggle('run', r.id, !r.bookmarked)} />
    </li>
  );

  const variationItem = (v: VariationSummary) => (
    <li
      key={`v-${v.id}`}
      className={`item${v.latestRun?.id === selectedRunId ? ' is-selected' : ''}${v.bookmarked ? ' is-bookmarked' : ''}`}
      data-variation-id={v.id}
    >
      <button
        type="button"
        className="item-main"
        disabled={!v.latestRun}
        onClick={() => v.latestRun && onSelectRun(v.latestRun.id)}
        title={v.latestRun ? `Open its latest run ${v.latestRun.id}` : 'No run yet'}
      >
        <span className="item-top">
          <span className="mono id">{v.id}</span>
          {v.origin === 'demo' && <span className="badge badge-synthetic">synthetic</span>}
          {v.origin === 'import' && <span className="badge">import</span>}
          {!v.strategy.runnable && <span className="badge badge-muted">read-only</span>}
        </span>
        <span className="item-title">{v.title}</span>
        <span className="item-sub">
          <span>{v.strategy.title}</span>
        </span>
        <span className="item-sub">
          {v.latestRun ? (
            <>
              <span className="mono">{v.latestRun.id}</span>
              <StatusChip status={v.latestRun.status} />
              <span>{v.latestResultAt ? `result ${relativeTime(v.latestResultAt)}` : 'no result yet'}</span>
              <span>
                {v.runCount} run{v.runCount === 1 ? '' : 's'}
              </span>
            </>
          ) : (
            <span>never run</span>
          )}
        </span>
        {paramSummary(v) && <span className="item-params mono">{paramSummary(v)}</span>}
        {v.noteCount > 0 && (
          <span className="item-note">
            <span aria-hidden="true">✎</span> {v.noteExcerpt}
          </span>
        )}
      </button>
      <Star
        on={v.bookmarked}
        label={`${v.id} ${v.title}`}
        onToggle={() => void toggle('variation', v.id, !v.bookmarked)}
      />
    </li>
  );

  const caption =
    tab === 'variations'
      ? 'Newest result first: by the completion time of each variation’s latest completed run. Variations without a completed run come last, newest first.'
      : tab === 'runs'
        ? 'Newest first: by completion time (or creation time while queued or running).'
        : 'Bookmarked runs and variations, newest result first.';

  const shown =
    tab === 'bookmarks'
      ? [...runs.map(runItem), ...variations.map(variationItem)]
      : tab === 'runs'
        ? runs.map(runItem)
        : variations.map(variationItem);
  const count =
    tab === 'runs' ? runs.length : tab === 'variations' ? variations.length : runs.length + variations.length;

  return (
    <aside className="sidebar" aria-label="Runs and variations" data-testid="sidebar">
      <div className="sidebar-head">
        <h2>Research</h2>
        <button type="button" className="btn-primary" onClick={onNewTest} data-testid="new-test">
          + New test
        </button>
      </div>
      <div className="tabs" role="tablist" aria-label="List">
        {(['variations', 'runs', 'bookmarks'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'is-on' : ''}
            onClick={() => {
              setTab(t);
              setLimit(PAGE);
            }}
            data-testid={`tab-${t}`}
          >
            {t === 'variations' ? 'Variations' : t === 'runs' ? 'Recent runs' : '★ Bookmarks'}
          </button>
        ))}
      </div>
      <div className="sidebar-filters">
        <select value={experiment} onChange={(e) => setExperiment(e.target.value)} aria-label="Experiment">
          <option value="">All experiments</option>
          {meta?.experiments.map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search id, title, symbol…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search"
          data-testid="sidebar-search"
        />
      </div>
      <p className="sidebar-caption">{caption}</p>
      {error && <p className="form-error">{error}</p>}
      <ul className="item-list" onKeyDown={onListKey} data-testid="item-list">
        {shown}
        {count === 0 && (
          <li className="empty">
            {q
              ? `Nothing matches “${q}”.`
              : tab === 'bookmarks'
                ? 'No bookmarks yet: use the ☆ on any run or variation.'
                : 'Nothing yet — start a new test.'}
          </li>
        )}
      </ul>
      {count >= limit && (
        <button type="button" className="btn-ghost load-more" onClick={() => setLimit((l) => l + PAGE)}>
          Show older…
        </button>
      )}
    </aside>
  );
}
