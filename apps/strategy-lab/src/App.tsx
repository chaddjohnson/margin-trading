import { useCallback, useEffect, useState } from 'react';

import type { LabRunRequest } from '../shared/contract.ts';
import { api, type DeleteRunResult, type Meta, onTokenRequired, type PhenotypeView, setToken } from './api.ts';
import { Phenotypes } from './components/Phenotypes.tsx';
import { RunTestDialog, TokenDialog } from './components/RunTestDialog.tsx';
import { RunView } from './components/RunView.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { useFetched } from './hooks.ts';

interface Route {
  run: string | null;
  symbol: string | null;
  compare: string | null;
  /** The phenotype catalogue view (#/phenotypes, #/phenotype/PH-0001). */
  phenotypes?: boolean;
  phenotype?: string | null;
}

// #/run/R-000042?symbol=VGT&compare=R-000013 — survives a refresh and can be bookmarked in the browser.
function parseHash(): Route {
  const ph = /^#\/phenotype(?:s|\/(PH-\d{4,12}))$/.exec(window.location.hash);
  if (ph) return { run: null, symbol: null, compare: null, phenotypes: true, phenotype: ph[1] ?? null };
  const m = /^#\/run\/(R-\d{6,12})(?:\?(.*))?$/.exec(window.location.hash);
  if (!m) return { run: null, symbol: null, compare: null };
  const p = new URLSearchParams(m[2] ?? '');
  const sym = p.get('symbol');
  const cmp = p.get('compare');
  return {
    run: m[1]!,
    symbol: sym && /^[A-Z0-9][A-Z0-9.-]{0,9}$/.test(sym) ? sym : null,
    compare: cmp && /^R-\d{6,12}$/.test(cmp) ? cmp : null
  };
}

function toHash(r: Route): string {
  if (r.phenotypes) return r.phenotype ? `#/phenotype/${r.phenotype}` : '#/phenotypes';
  if (!r.run) return '#/';
  const p = new URLSearchParams();
  if (r.symbol) p.set('symbol', r.symbol);
  if (r.compare) p.set('compare', r.compare);
  const q = p.toString();
  return `#/run/${r.run}${q ? `?${q}` : ''}`;
}

export function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [route, setRouteState] = useState<Route>(parseHash);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState<{
    initial: Partial<LabRunRequest> | null;
    phenotype?: PhenotypeView | null;
  } | null>(null);
  const [needToken, setNeedToken] = useState(false);
  // Feedback of an action that changed the saved runs (a completed deletion); only ever set from a server response.
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    onTokenRequired(() => setNeedToken(true));
    const onHash = () => setRouteState(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    api
      .meta()
      .then((m) => {
        setMeta(m);
        setMetaError(null);
      })
      .catch((e: Error) => setMetaError(e.message));
  }, [refreshKey]);

  // No run in the URL: open the most recent one.
  useEffect(() => {
    if (route.run || route.phenotypes) return;
    api
      .runs({ limit: 1 })
      .then((rs) => {
        if (rs[0]) window.location.replace(toHash({ run: rs[0].id, symbol: null, compare: null }));
      })
      .catch(() => {});
  }, [route.run, route.phenotypes, refreshKey]);

  const syntheticSelected =
    useFetched(route.run, (signal) => api.run(route.run!, signal)).data?.dataOrigin === 'synthetic';

  // After a completed deletion: the lists refresh; if the deleted run was open, the most recent remaining run opens (or
  // the empty view); if it was the comparison run, the comparison is dropped.
  const onDeleted = (r: DeleteRunResult) => {
    const what = `${r.deleted} (${r.strategy.title}, ${r.symbols.join(', ')})`;
    const extra = [r.notesDeleted ? `${r.notesDeleted} note${r.notesDeleted === 1 ? '' : 's'}` : '', r.bookmarkRemoved ? 'its bookmark' : '']
      .filter(Boolean)
      .join(' and ');
    setNotice(
      r.artifacts.warning
        ? { tone: 'warn', text: `Deleted ${what}${extra ? ` with ${extra}` : ''}. Note: ${r.artifacts.warning}.` }
        : { tone: 'ok', text: `Deleted ${what}${extra ? ` with ${extra}` : ''}. Variation ${r.variation.id} is kept.` }
    );
    // The route changes in the same render as the refresh, so nothing refetches the deleted run.
    const next: Route =
      route.run === r.deleted
        ? { ...route, run: null, symbol: null, compare: null }
        : route.compare === r.deleted
          ? { ...route, compare: null }
          : route;
    setRouteState(next);
    if (next !== route) window.location.hash = next.run ? toHash(next) : '#/';
    refresh();
  };

  const navigate = (r: Partial<Route>) => {
    const next: Route = { ...route, phenotypes: false, phenotype: null, ...r };
    if (r.run && r.run !== route.run) {
      next.compare = r.compare ?? null;
      next.symbol = r.symbol ?? route.symbol;
    }
    window.location.hash = toHash(next);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 2h6v2h-1v5.2l5.6 9.4A2.2 2.2 0 0 1 17.7 22H6.3a2.2 2.2 0 0 1-1.9-3.4L10 9.2V4H9z" />
          </svg>
          <div>
            <h1>Strategy Lab</h1>
            <p className="brand-sub">Research workbench · entries, exits and saved runs</p>
          </div>
        </div>
        <nav className="view-tabs" aria-label="Views">
          <a
            className={`view-tab${route.phenotypes ? '' : ' is-active'}`}
            aria-current={route.phenotypes ? undefined : 'page'}
            href={route.run ? toHash({ ...route, phenotypes: false }) : '#/'}
            data-testid="view-runs"
          >
            Runs
          </a>
          <a
            className={`view-tab${route.phenotypes ? ' is-active' : ''}`}
            aria-current={route.phenotypes ? 'page' : undefined}
            href="#/phenotypes"
            data-testid="view-phenotypes"
          >
            Phenotypes
          </a>
          <span
            className="view-tab is-disabled"
            aria-disabled="true"
            title="Optimisation is run by Claude/CLI research workflows; their finished batches will be importable here (read-only)."
          >
            Optimisation imports <span className="planned">read-only, none yet</span>
          </span>
        </nav>
        <div className="header-context muted small">
          {meta
            ? `${meta.symbols.length} symbols with local minute data · event contract v${meta.contractVersion}`
            : ''}
        </div>
      </header>
      {syntheticSelected && (
        <div className="demo-banner" role="note" data-testid="demo-banner">
          <strong>Synthetic demo data.</strong> This run uses fictional prices from a seeded random walk and toy rules —
          not market data, not VGT, not research results.
        </div>
      )}
      {metaError && (
        <div className="error-banner" role="alert">
          Cannot reach the Strategy Lab API: {metaError}
        </div>
      )}
      {notice && (
        <div className={`app-notice tone-${notice.tone}`} role="status" data-testid="app-notice">
          <span>{notice.text}</span>
          <button type="button" className="btn-ghost" onClick={() => setNotice(null)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
      <div className="layout">
        <Sidebar
          meta={meta}
          selectedRunId={route.run}
          refreshKey={refreshKey}
          onSelectRun={(id) => navigate({ run: id })}
          onNewTest={() => setDialog({ initial: null })}
          onChanged={refresh}
        />
        <main className="main" data-testid="main">
          {route.phenotypes ? (
            <Phenotypes
              selectedId={route.phenotype ?? null}
              refreshKey={refreshKey}
              onSelect={(id) => (window.location.hash = toHash({ ...route, phenotypes: true, phenotype: id }))}
              onRun={(phenotype) => setDialog({ initial: null, phenotype })}
              onOpenRun={(id) => navigate({ run: id, compare: null })}
            />
          ) : route.run ? (
            <RunView
              runId={route.run}
              compareId={route.compare}
              symbol={route.symbol}
              onRoute={(r) => navigate(r)}
              onClone={(initial) => setDialog({ initial })}
              onChanged={refresh}
              onDeleted={onDeleted}
              refreshKey={refreshKey}
            />
          ) : (
            <div className="main-empty">Select a run, or start a new test.</div>
          )}
        </main>
      </div>
      {dialog && meta && (
        <RunTestDialog
          meta={meta}
          initial={dialog.initial}
          phenotype={dialog.phenotype ?? null}
          onClose={() => setDialog(null)}
          onCreated={(id) => {
            setDialog(null);
            refresh();
            navigate({ run: id, compare: null });
          }}
        />
      )}
      {needToken && (
        <TokenDialog
          onSave={(t) => {
            setToken(t);
            setNeedToken(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
