// Pooled portfolio candidates (Priority 6, docs/strategy-lab/POOLED_CANDIDATES.md): pick a frozen candidate and inspect
// its ACTUAL funded trades — D1 and Growth together, on VGT and GDX — from ONE replay of the research engine (one shared
// $100,000 pool, continuous) over ONE evaluation window: its research window (the archived benchmark, the default), all
// available data (to the latest common complete session of VGT and GDX) or a custom window (continuous history with a
// reporting window, or an isolated cold start). Dates after the research validation end are a MANUAL POST-VALIDATION
// EVALUATION, labelled as such; they never extend formal validation.
//
// Read-only frozen presets: nothing here edits a candidate, saves a run or reruns anything with a component removed.
// Visibility toggles, symbol tabs, filters and period buttons change only what is shown; every aggregate figure comes
// from the replay's own metrics (src/portfolio.ts portfolioTotals). Shadow (virtual) trades are never shown; refused
// executable signals appear only when switched on, as purple ⊘ markers that are never fills or P&L.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CandlesResponse } from '../../shared/candles.ts';
import type { LabEvent } from '../../shared/contract.ts';
import {
  type CandidateEntry,
  type Component,
  eventComponent,
  PORTFOLIO_BENCHMARK,
  type PortfolioCoverage,
  type PortfolioPeriod,
  type PortfolioPosition,
  type PortfolioReplayDetail,
  type PortfolioWindowRequest,
  type PositionFill,
  RESEARCH_WINDOW,
  normalizeWindowRequest,
  windowRequestText
} from '../../shared/portfolio.ts';
import { api, type EventsResponse, type PortfolioCatalogView, type PortfolioTicket, type PricesResponse } from '../api.ts';
import { markerSlots, sessionIndex } from '../chart/candles.ts';
import { EquityChart } from '../chart/EquityChart.tsx';
import type { ChartLink, Placement } from '../chart/link.ts';
import { isPartialExit, markerToneOf, TONE_COLOR, TONE_LABEL } from '../chart/markers.ts';
import { type ChartData, type ChartEvent, type ChartHandle, PriceChart } from '../chart/PriceChart.tsx';
import { formatEt, formatEtDate, formatPrice } from '../format.ts';
import { useFetched } from '../hooks.ts';
import {
  bookedSubtotal,
  boundsOf,
  carriedAcross,
  carriedIn,
  DEFAULT_LEDGER_FILTER,
  DEFAULT_VISIBILITY,
  eventClassOf,
  filterPositions,
  FRAME_OF,
  isFiltered,
  type LedgerFilter,
  type LedgerPeriod,
  PERIOD_KEY,
  periodWindow,
  portfolioTotals,
  type Visibility,
  visibleEvents
} from '../portfolio.ts';
import { buildTrades, toneOf, type Trade } from '../trades.ts';
import { MarkerTooltip } from './Events.tsx';
import { InfoPopover } from './InfoPopover.tsx';
import { Glyph } from './Panels.tsx';

const DAY = 86_400_000;
const usd = (x: number | null | undefined, signed = false) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : `${signed && x > 0 ? '+' : ''}${x.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shares = (x: number) => x.toLocaleString('en-US', { maximumFractionDigits: 4 });
const pct = (x: number) => `${x.toFixed(2)}%`;
const toneClass = (x: number) => (x > 0 ? 'pos' : x < 0 ? 'neg' : '');
const ACTION_LABEL = { entry: 'Entry', partial: 'Partial exit', final: 'Final exit' } as const;

type Period = LedgerPeriod;
const windowKey = (w: PortfolioWindowRequest) => JSON.stringify(w);

// ----- the replay of the selected candidate: a cache hit, or one replay polled to completion -----

interface ReplayState {
  cid: string;
  /** The window this state belongs to (a newer window selection never shows an older window's figures). */
  wk: string;
  state: PortfolioTicket['state'] | 'submitting';
  progress: PortfolioTicket['progress'];
  cacheHit: boolean;
  error: string | null;
  detail: PortfolioReplayDetail | null;
}

function usePortfolioReplay(cid: string | null, window: PortfolioWindowRequest, attempt: number, onCompleted: (cid: string) => void) {
  const [st, setSt] = useState<ReplayState | null>(null);
  const wk = windowKey(window);
  useEffect(() => {
    if (!cid) return;
    let alive = true;
    let ticket: string | null = null;
    let done = false;
    const ctl = new AbortController();
    const set = (s: Omit<ReplayState, 'cid' | 'wk'>) => alive && setSt({ cid, wk, ...s });
    (async () => {
      try {
        let t = await api.replayPortfolio(cid, window);
        ticket = t.ticket;
        while (alive && (t.state === 'queued' || t.state === 'running')) {
          set({ state: t.state, progress: t.progress, cacheHit: false, error: null, detail: null });
          await new Promise((r) => setTimeout(r, 400));
          if (!alive) return;
          t = await api.portfolioTicket(t.ticket, ctl.signal);
        }
        if (!alive) return;
        done = true;
        if (t.state !== 'completed') {
          set({ state: 'failed', progress: null, cacheHit: false, error: t.error ?? `the replay was ${t.state}`, detail: null });
          return;
        }
        const d = await api.portfolioReplay(t.replayId, ctl.signal);
        // Never show one candidate's figures under another's label.
        if (d.candidateId !== cid || d.id !== t.replayId) throw new Error('the server answered for another candidate');
        set({ state: 'completed', progress: null, cacheHit: t.cacheHit, error: null, detail: d });
        if (alive && window.mode === 'research') onCompleted(cid);
      } catch (e) {
        if (alive && !ctl.signal.aborted)
          set({ state: 'failed', progress: null, cacheHit: false, error: (e as Error).message, detail: null });
      }
    })();
    return () => {
      alive = false;
      ctl.abort();
      // A newer selection releases this one: a queued replay nobody waits for is dropped by the server.
      if (ticket && !done) api.releasePortfolioTicket(ticket).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onCompleted is a stable notification, not an input; the window is keyed by wk
  }, [cid, wk, attempt]);
  return st && st.cid === cid && st.wk === wk ? st : null;
}

// ----- the page -----

export function PortfolioView({
  candidateId,
  symbol: routeSymbol,
  window = RESEARCH_WINDOW,
  onRoute
}: {
  candidateId: string | null;
  symbol: string | null;
  /** The evaluation window (from the address; absent = the research window, as every earlier link). */
  window?: PortfolioWindowRequest;
  onRoute: (r: { candidate?: string | null; symbol?: string | null; window?: PortfolioWindowRequest }) => void;
}) {
  const catalogQ = useFetched<PortfolioCatalogView>('portfolios', (signal) => api.portfolios(signal));
  const catalog = catalogQ.data;
  const entry = catalog?.candidates.find((c) => c.id === candidateId) ?? null;
  const [attempt, setAttempt] = useState(0);
  // Candidates replayed in this tab (the catalog's own "cached" marks were taken when it loaded).
  const [replayed, setReplayed] = useState<ReadonlySet<string>>(() => new Set());
  const onCompleted = useCallback((cid: string) => setReplayed((s) => (s.has(cid) ? s : new Set([...s, cid]))), []);
  const replay = usePortfolioReplay(entry ? entry.id : null, window, attempt, onCompleted);
  const detail = replay?.detail && replay.detail.candidateId === entry?.id ? replay.detail : null;

  // Presentation preferences of the page (survive candidate and symbol changes; never alter a figure).
  const [visibility, setVisibility] = useState<Visibility>(DEFAULT_VISIBILITY);
  const [filter, setFilter] = useState<LedgerFilter>(DEFAULT_LEDGER_FILTER);
  const [chartType, setChartType] = useState<'candles' | 'line'>('candles');
  const [period, setPeriod] = useState<Period>('all');

  if (catalogQ.error) return <div className="main-empty form-error">Cannot load the portfolio candidates: {catalogQ.error}</div>;
  if (!catalog) return <div className="main-empty">Loading the portfolio candidates…</div>;
  return (
    <div className="portfolio-view" data-testid="portfolio-view" data-candidate={entry?.id ?? ''}>
      <CandidateSelector
        catalog={catalog}
        replayed={replayed}
        selected={entry?.id ?? null}
        onSelect={(id) => onRoute({ candidate: id, symbol: null })}
      />
      {!entry ? (
        <div className="main-empty" data-testid="portfolio-empty">
          {candidateId ? `Unknown candidate ${candidateId}.` : 'Select a portfolio candidate to replay and inspect it.'}
        </div>
      ) : (
        <>
          <WindowControls key={windowKey(window)} coverage={catalog.coverage} window={window} onChange={(w) => onRoute({ window: w })} />
          <CandidateHeader entry={entry} window={window} replay={replay} detail={detail} onRetry={() => setAttempt((a) => a + 1)} />
          {detail && (
            <ReplayBody
              key={detail.id}
              entry={entry}
              detail={detail}
              routeSymbol={routeSymbol}
              onSymbol={(s) => onRoute({ symbol: s })}
              visibility={visibility}
              setVisibility={setVisibility}
              filter={filter}
              setFilter={setFilter}
              chartType={chartType}
              setChartType={setChartType}
              period={period}
              setPeriod={setPeriod}
            />
          )}
        </>
      )}
    </div>
  );
}

function CandidateSelector({
  catalog,
  replayed,
  selected,
  onSelect
}: {
  catalog: PortfolioCatalogView;
  replayed: ReadonlySet<string>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="card candidate-selector" aria-label="Portfolio candidates" data-testid="candidate-selector">
      <div className="candidate-selector-head">
        <h2>Portfolio candidates</h2>
        <span className="muted small">
          Frozen, read-only presets replayed with one shared $100,000 pool — on their research window ({PORTFOLIO_BENCHMARK.from} →{' '}
          {PORTFOLIO_BENCHMARK.to}) by default, or on all available data or a custom window. Listed in catalog order — not a safety
          ranking, not a recommendation; inclusion is permission to inspect, not a trading instruction.
        </span>
      </div>
      <div className="candidate-list" role="radiogroup" aria-label="Portfolio candidate">
        {catalog.candidates.map((c) => {
          const on = c.id === selected;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              className={`candidate-card${on ? ' is-on' : ''}`}
              onClick={() => onSelect(c.id)}
              data-testid={`candidate-${c.id}`}
              data-candidate={c.id}
            >
              <span className="candidate-name">
                <span className="candidate-order">{c.order}</span> {c.name}
              </span>
              <span className="candidate-chips">
                {c.components.map((k) => (
                  <ComponentChip key={k.book} c={k} />
                ))}
              </span>
              <span className="muted small candidate-state" data-testid={`candidate-cached-${c.id}`}>
                {c.cached || replayed.has(c.id) ? 'research window replayed · cached' : 'not replayed yet (≈ 6 s)'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ----- the evaluation window (research | all | custom): the same New York session-date fields and preset chips as the
// Run Test dialog; a change replays ONE window (Research and All at once, Custom with its button) -----

function WindowControls({
  coverage,
  window,
  onChange
}: {
  coverage: PortfolioCoverage;
  window: PortfolioWindowRequest;
  onChange: (w: PortfolioWindowRequest) => void;
}) {
  const endpoint = coverage.endpoint;
  const validationEnd = coverage.research.validationEnd;
  const [mode, setMode] = useState<PortfolioWindowRequest['mode']>(window.mode);
  const [from, setFrom] = useState(window.mode === 'custom' ? window.from : '2025-01-02');
  const [to, setTo] = useState(window.mode === 'custom' ? window.to : (endpoint ?? validationEnd));
  const [execution, setExecution] = useState(window.mode === 'custom' ? window.execution : 'continuous');
  const custom = (() => {
    try {
      const w = normalizeWindowRequest({ mode: 'custom', from, to, execution });
      if (w.mode !== 'custom') return { w: null, error: 'invalid' };
      if (w.from < coverage.firstSession) return { w: null, error: `starts before the first common session ${coverage.firstSession}` };
      if (endpoint && w.to > endpoint) return { w: null, error: `ends after the latest common complete session ${endpoint}` };
      return { w, error: null };
    } catch (e) {
      return { w: null, error: (e as Error).message };
    }
  })();
  const pick = (m: PortfolioWindowRequest['mode']) => {
    setMode(m);
    if (m !== 'custom') onChange({ mode: m });
  };
  const pending = mode === 'custom' && custom.w !== null && windowKey(custom.w) !== windowKey(window);
  return (
    <section className="card window-controls" aria-label="Evaluation window" data-testid="window-controls" data-window={window.mode}>
      <div className="row window-row">
        <b className="small">Evaluation window</b>
        <div className="segmented small" role="radiogroup" aria-label="Evaluation window" data-testid="window-mode">
          {(
            [
              ['research', 'Research', `The candidate's research window: the archived benchmark its targets were sealed on (${PORTFOLIO_BENCHMARK.from} → ${PORTFOLIO_BENCHMARK.to})`],
              ['all', 'All', `All available data: ${coverage.firstSession} → the latest common complete session of GDX and VGT${endpoint ? ` (${endpoint})` : ''}`],
              ['custom', 'Custom', 'Explicit New York session dates (inclusive), continuous history or an isolated window']
            ] as const
          ).map(([m, label, title]) => (
            <label key={m} className={mode === m ? 'is-on' : ''} title={title}>
              <input type="radio" name="portfolio-window" checked={mode === m} onChange={() => pick(m)} disabled={m !== 'research' && !endpoint} data-testid={`window-mode-${m}`} />
              {label}
            </label>
          ))}
        </div>
        <span className="muted small" data-testid="coverage">
          {endpoint
            ? `Local data: GDX and VGT complete through ${endpoint} (the latest common complete session). Research range ${coverage.research.id}: development to ${coverage.research.developmentEnd}, validation to ${validationEnd}.`
            : `Local data coverage unavailable: ${coverage.error ?? 'unknown'}`}
        </span>
      </div>
      {mode === 'custom' && (
        <div className="row window-custom" data-testid="window-custom">
          <label className="field inline">
            <span className="field-label">From</span>
            <input type="date" value={from} min={coverage.firstSession} max={endpoint ?? undefined} onChange={(e) => setFrom(e.target.value)} data-testid="window-from" />
          </label>
          <label className="field inline">
            <span className="field-label">To</span>
            <input type="date" value={to} min={coverage.firstSession} max={endpoint ?? undefined} onChange={(e) => setTo(e.target.value)} data-testid="window-to" />
          </label>
          <div className="row presets">
            <button type="button" className="btn-chip" onClick={() => { setFrom(coverage.firstSession); setTo(coverage.research.developmentEnd); }}>
              Development
            </button>
            <button type="button" className="btn-chip" onClick={() => { setFrom('2025-01-02'); setTo(validationEnd); }}>
              Validation
            </button>
            {endpoint && endpoint > validationEnd && (
              <button type="button" className="btn-chip" onClick={() => { setFrom(nextDay(validationEnd)); setTo(endpoint); }} data-testid="window-preset-post">
                After {validationEnd}
              </button>
            )}
          </div>
          <div className="segmented small" role="radiogroup" aria-label="Execution" data-testid="window-execution">
            {(
              [
                ['continuous', 'Continuous history', `ONE run from ${coverage.firstSession}; the figures are those of [From, To] with every position, book state, stop and accrued interest carried in`],
                ['isolated', 'Isolated window', 'The run itself starts flat at From: a cold start with no state from earlier sessions']
              ] as const
            ).map(([x, label, title]) => (
              <label key={x} className={execution === x ? 'is-on' : ''} title={title}>
                <input type="radio" name="portfolio-execution" checked={execution === x} onChange={() => setExecution(x)} data-testid={`window-execution-${x}`} />
                {label}
              </label>
            ))}
          </div>
          <button type="button" className="btn-primary small" disabled={!custom.w || !pending} onClick={() => custom.w && onChange(custom.w)} data-testid="window-apply">
            Replay this window
          </button>
          {custom.error && <span className="form-error small" data-testid="window-error">{custom.error}</span>}
        </div>
      )}
      {(window.mode === 'all' || (window.mode === 'custom' && window.to > validationEnd)) && (
        <p className="warn small" role="note" data-testid="window-post-note">
          Dates after {validationEnd} are a <b>manual post-validation evaluation</b>: never optimization, selection, qualification or
          validation evidence, and not an extension of the formal validation window.
        </p>
      )}
    </section>
  );
}

const nextDay = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

function ComponentChip({ c }: { c: CandidateEntry['components'][number] }) {
  return (
    <span
      className={`component-chip comp-${c.family}${c.enabled ? '' : ' is-off'}`}
      title={c.enabled ? `${c.family} · ${c.symbol}: ${c.identity}` : c.note}
    >
      {c.family} · {c.symbol}
      {c.enabled ? '' : ' OFF'}
    </span>
  );
}

function CandidateHeader({
  entry,
  window,
  replay,
  detail,
  onRetry
}: {
  entry: CandidateEntry;
  window: PortfolioWindowRequest;
  replay: ReturnType<typeof usePortfolioReplay>;
  detail: PortfolioReplayDetail | null;
  onRetry: () => void;
}) {
  const state = replay?.state ?? 'submitting';
  const parity = detail?.metrics.parity;
  const w = detail?.metrics.window;
  const trajectory = detail?.metrics.trajectory;
  return (
    <section className="card candidate-header" aria-label="Selected candidate" data-testid="candidate-header">
      <div className="candidate-title-row">
        <h2 data-testid="candidate-title">{entry.name}</h2>
        <span className="badge badge-muted" title="The catalog's frozen configuration: it cannot be edited here">
          FROZEN PRESET · READ-ONLY
        </span>
        <span className="badge badge-real">L0 lifecycle · one $100,000 pool · no compounding</span>
        {w?.postValidation && (
          <span className="badge badge-warn" data-testid="post-validation-badge" title="Dates after the research validation end: never optimization, selection, qualification or validation evidence">
            MANUAL POST-VALIDATION EVALUATION
          </span>
        )}
        {parity && parity.status === 'not applicable' && (
          <span
            className={`badge ${trajectory ? (trajectory.identical && trajectory.researchParity === 'verified' ? 'badge-ok' : 'badge-danger') : 'badge-muted'}`}
            data-testid="parity-badge"
            data-parity={trajectory ? (trajectory.identical && trajectory.researchParity === 'verified' ? 'trajectory-verified' : 'mismatch') : 'not-applicable'}
            title={
              trajectory
                ? 'This continuous run was replayed beside the research window: identical decision for decision over their common span, and the research-window replay matches the archived records'
                : 'An isolated window has no archived target; its figures are reconciled with the engine-independent ledger only'
            }
          >
            {trajectory
              ? trajectory.identical && trajectory.researchParity === 'verified'
                ? `Research window reproduced: identical through ${trajectory.comparedThrough.slice(0, 10)} · archived parity verified`
                : 'NOT VERIFIED against the research window'
              : 'No archived target (isolated window): ledger-reconciled only'}
          </span>
        )}
        {parity && parity.status !== 'not applicable' && (
          <span
            className={`badge ${parity.status === 'verified' ? 'badge-ok' : 'badge-danger'}`}
            data-testid="parity-badge"
            data-parity={parity.status}
            title="This replay's figures against the archived research records (headline targets, the engine's compact record, the funded-lot ledger signature)"
          >
            {parity.status === 'verified'
              ? `Parity verified: ${parity.checks.length}/${parity.checks.length} archived checks`
              : `NOT VERIFIED: ${parity.checks.filter((c) => !c.pass).length} archived checks differ`}
          </span>
        )}
      </div>
      {w && (
        <p className="window-effective" data-testid="window-effective" data-from={w.reporting.from} data-to={w.reporting.to}>
          <b>
            {w.reporting.from} → {w.reporting.to}
          </b>{' '}
          <span className="muted small">
            ({w.reporting.sessions} sessions ·{' '}
            {w.requested.mode === 'research'
              ? 'research window, the archived benchmark'
              : w.requested.mode === 'all'
                ? `all available data, ending at the latest common complete session of ${w.coverage.limitedBy.join(' and ') || 'GDX and VGT'}`
                : w.execution === 'continuous'
                  ? `custom reporting window of ONE continuous run simulated ${w.simulation.from} → ${w.simulation.to}`
                  : 'custom isolated window: the run starts flat at its first session'}
            )
          </span>
          <InfoPopover label="Requested and effective dates">
            <table className="param-table small" data-testid="window-details">
              <tbody>
                <tr><th scope="row">Requested</th><td>{windowRequestText(w.requested)}</td></tr>
                <tr><th scope="row">Simulated (engine)</th><td>{w.simulation.from} → {w.simulation.to} ({w.simulation.sessions} sessions)</td></tr>
                <tr><th scope="row">Reported (these figures)</th><td>{w.reporting.from} → {w.reporting.to} ({w.reporting.sessions} sessions)</td></tr>
                <tr><th scope="row">Research window</th><td>{w.research.from} → {w.research.to} ({w.research.source})</td></tr>
                <tr><th scope="row">Local data</th><td>{w.coverage.files.map((f) => `${f.symbol} complete through ${f.latestCompleteSession ?? '—'} (last row ${f.lastRowUtc})`).join('; ')}; common complete endpoint {w.coverage.endpoint}</td></tr>
                <tr><th scope="row">Label</th><td>{w.label}</td></tr>
              </tbody>
            </table>
          </InfoPopover>
        </p>
      )}
      <p className="candidate-summary">{entry.summary}</p>
      <ul className="candidate-distinctions small muted">
        {entry.distinctions.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <div className="replay-status small" role="status" data-testid="replay-status" data-state={detail ? 'completed' : state}>
        {detail ? (
          <>
            Replay <code title={detail.id}>{detail.id.slice(0, 15)}…</code> ·{' '}
            {replay?.cacheHit ? 'from the replay cache (validated)' : `computed in ${(detail.executionMs / 1000).toFixed(1)} s`} ·
            research engine ({entry.engine.kind === 'rc2-replay' ? 'RC 2 risk-metrics replay on the Priority 3 pool, as npm run manual-eval' : 'Priority 3 pool via 5B L0'}) · no saved run created
          </>
        ) : state === 'failed' ? (
          <span className="form-error">
            Replay failed: {replay?.error}. No figure is shown.{' '}
            <button type="button" className="btn-chip" onClick={onRetry}>
              Try again
            </button>
          </span>
        ) : (
          <>
            {state === 'queued' ? 'Queued' : 'Replaying'} {entry.name} ({windowRequestText(window)}) with the research engine
            {replay?.progress ? `: ${replay.progress.message}` : '…'} (previous results are not shown while this runs)
          </>
        )}
      </div>
      <CandidateDetails entry={entry} detail={detail} />
    </section>
  );
}

function ParamTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="param-table small">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const flat = (o: Record<string, unknown>, prefix = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flat(v as Record<string, unknown>, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v === null ? 'inactive (OFF)' : Array.isArray(v) ? v.join(', ') : String(v)] as [string, string]]
  );

function CandidateDetails({ entry, detail }: { entry: CandidateEntry; detail: PortfolioReplayDetail | null }) {
  return (
    <details className="candidate-details" data-testid="candidate-details">
      <summary>Settings, conventions, provenance and parity</summary>
      <div className="details-grid">
        {entry.components.map((c) => (
          <div key={c.book} className="details-block" data-testid={`settings-${c.book}`}>
            <h4>
              {c.family} · {c.symbol} {c.enabled ? <code>{c.identity}</code> : <span className="muted">OFF</span>}
            </h4>
            {!c.enabled ? (
              <p className="small muted">{c.note}</p>
            ) : (
              <>
                {c.grid && (
                  <ParamTable
                    rows={Object.entries(c.grid).map(([k, v]) => [`${k} (grid: ${c.gridUnits?.[k] ?? ''})`, String(v)])}
                  />
                )}
                {c.effective && <ParamTable rows={Object.entries(c.effective).map(([k, v]) => [k, String(v)])} />}
                <details>
                  <summary className="small">Engine parameters (as executed){c.inactive?.length ? ` · inactive: ${c.inactive.join(', ')}` : ''}</summary>
                  <ParamTable rows={flat(c.engineParams ?? {})} />
                </details>
              </>
            )}
          </div>
        ))}
        <div className="details-block">
          <h4>Portfolio conventions</h4>
          <ParamTable rows={flat(entry.conventions)} />
        </div>
        <div className="details-block">
          <h4>Identities</h4>
          <ParamTable rows={Object.entries(entry.identities)} />
          <h4>Sources (sha256)</h4>
          <ul className="small source-list">
            {entry.sources.map((s) => (
              <li key={`${s.path}|${s.pointer}`}>
                <code>{s.path}</code> {s.pointer} — {s.role} · <code title={s.sha256}>{s.sha256.slice(0, 12)}…</code>
              </li>
            ))}
          </ul>
          <p className="small muted">Catalog entry sha256 <code>{entry.entrySha256.slice(0, 16)}…</code></p>
        </div>
        {detail && (
          <div className="details-block details-wide" data-testid="parity-table">
            <h4>Parity with the archived records ({detail.metrics.parity.status})</h4>
            <table className="param-table small">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Archived</th>
                  <th>This replay</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {detail.metrics.parity.checks.slice(0, 10).map((c) => (
                  <tr key={c.field} data-pass={c.pass}>
                    <th scope="row">{c.field}</th>
                    <td>{String(c.target)}</td>
                    <td>{String(c.got)}</td>
                    <td>{c.pass ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">
              + {detail.metrics.parity.checks.length - 10} fields of the engine’s archived compact record
              ({detail.metrics.parity.checks.slice(10).filter((c) => c.pass).length} equal). Replay{' '}
              <code>{detail.id}</code>; implementation <code>{detail.implementationSha256.slice(0, 16)}…</code>; data VGT{' '}
              <code>{detail.dataSha256.VGT?.slice(0, 12)}…</code>
              {detail.dataSha256.GDX ? (
                <>
                  {' '}
                  GDX <code>{detail.dataSha256.GDX.slice(0, 12)}…</code>
                </>
              ) : null}
              .
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

// ----- the replay: summary, chart, ledger -----

interface BodyProps {
  entry: CandidateEntry;
  detail: PortfolioReplayDetail;
  routeSymbol: string | null;
  onSymbol: (s: string) => void;
  visibility: Visibility;
  setVisibility: (f: (v: Visibility) => Visibility) => void;
  filter: LedgerFilter;
  setFilter: (f: LedgerFilter) => void;
  chartType: 'candles' | 'line';
  setChartType: (t: 'candles' | 'line') => void;
  period: Period;
  setPeriod: (p: Period) => void;
}

function ReplayBody(p: BodyProps) {
  const { entry, detail, visibility, setVisibility, filter, setFilter, chartType, period, setPeriod } = p;
  const symbol = p.routeSymbol && detail.symbols.includes(p.routeSymbol) ? p.routeSymbol : detail.symbols[0]!;
  const basis = detail.priceSource.basisBySymbol[symbol] ?? detail.priceSource.basisDate;
  const chartRef = useRef<ChartHandle>(null);
  const lastWindow = useRef<[number, number] | null>(null);
  const [view, setView] = useState<{ range: [number, number]; full: boolean } | null>(null);
  const [hover, setHover] = useState<{ keys: string[]; anchor: DOMRect; placement: Placement } | null>(null);
  const [selKey, setSelKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  // A ledger jump selects its event at once; the chart is centred on it as soon as that symbol's chart shows it.
  const locateOnShow = useRef<string | null>(null);

  const eventsQ = useFetched<EventsResponse>(`pr-events|${detail.id}|${symbol}`, (signal) => api.events(detail.id, symbol, basis, signal));
  const events = eventsQ.data && eventsQ.data.runId === detail.id && eventsQ.data.symbol === symbol ? eventsQ.data : null;
  const candlesQ = useFetched<CandlesResponse>(chartType === 'candles' ? `pr-candles|${detail.id}|${symbol}` : null, (signal) =>
    api.candles(detail.id, symbol, signal)
  );
  const pricesQ = useFetched<PricesResponse>(chartType === 'line' ? `pr-prices|${detail.id}|${symbol}` : null, (signal) =>
    api.prices(detail.id, symbol, { points: 3000 }, signal)
  );
  const equityQ = useFetched(`pr-equity|${detail.id}`, (signal) => api.portfolioEquity(detail.id, signal));

  const trades = useMemo(
    () => buildTrades(events?.events ?? [], symbol, 'A', detail.id, detail.metrics as unknown as Record<string, unknown>),
    [events, symbol, detail]
  );
  const fillOf = useMemo(() => {
    const m = new Map<string, { position: PortfolioPosition; fill: PositionFill; n: number }>();
    for (const pos of detail.positions) {
      let k = 0;
      for (const f of pos.fills) m.set(f.eventId, { position: pos, fill: f, n: f.kind === 'partial' ? ++k : 0 });
    }
    return m;
  }, [detail]);

  // Chart events: ONLY this symbol, ONLY the visible components and event classes (a pure filter).
  const chartEvents = useMemo((): ChartEvent[] => {
    if (!events) return [];
    return visibleEvents(events.events.filter((e) => e.symbol === symbol), visibility).map((event) => {
      const comp = eventComponent(event)!;
      return {
        key: `A:${event.id}`,
        role: 'A' as const,
        runId: detail.id,
        event,
        y: events.display[event.id] ?? event.price,
        tone: markerToneOf(event.kind, event.tradeId ? (trades.get(event.tradeId) ?? null) : null),
        frame: FRAME_OF[comp],
        labelPrefix: `${comp} · ${typeof event.meta?.position === 'string' ? event.meta.position : 'refused signal'}`
      };
    });
  }, [events, symbol, visibility, trades, detail.id]);
  const byKey = useMemo(() => new Map(chartEvents.map((c) => [c.key, c])), [chartEvents]);
  const selected = selKey ? (byKey.get(selKey) ?? null) : null;
  const selectedPosition = selected ? (fillOf.get(selected.event.id)?.position ?? null) : null;

  const tradeOf = useCallback(
    (c: ChartEvent): Trade | null => (c.event.tradeId ? (trades.get(c.event.tradeId) ?? null) : null),
    [trades]
  );
  const linkOf = useCallback(
    (key: string): ChartLink | null => {
      const c = byKey.get(key);
      if (!c || (c.event.kind !== 'executed_entry' && c.event.kind !== 'executed_exit')) return null;
      const t = tradeOf(c);
      if (!t || t.status === 'unlinked') return null;
      if (t.status === 'open') return c.event.kind === 'executed_entry' ? { partnerKey: null, partner: null, tone: toneOf(t) } : null;
      const partner = c.event.kind === 'executed_entry' ? t.exit : t.entry;
      if (!partner) return null;
      const partnerKey = `A:${partner.id}`;
      return {
        partnerKey: byKey.has(partnerKey) ? partnerKey : null,
        partner: { t: Date.parse(partner.t), y: events?.display[partner.id] ?? partner.price, kind: partner.kind as 'executed_entry' | 'executed_exit' },
        tone: toneOf(t)
      };
    },
    [byKey, tradeOf, events]
  );
  const candles = candlesQ.data;
  const slots = useMemo(
    () => (chartType === 'candles' && candles ? markerSlots(chartEvents, sessionIndex(candles.d)) : null),
    [chartType, candles, chartEvents]
  );

  // A ledger jump: centre the event and, from a wide view (more than a year), zoom to about three months around it so
  // the selected marker stands out from its neighbours. A viewport change only.
  const locate = useCallback((key: string) => {
    const c = byKey.get(key);
    if (!c) return;
    const t = Date.parse(c.event.t);
    const x = chartRef.current?.chartX(t) ?? t;
    const w = chartRef.current?.getWindow();
    if (!w) return;
    if (w[1] - w[0] > 366 * DAY) chartRef.current?.zoomAround(x, 92 * DAY);
    else if (x < w[0] || x > w[1]) chartRef.current?.centerOn(x);
  }, [byKey]);

  // Centre the chart on a jumped-to event once its symbol's chart is drawn (the chart is an external system).
  useEffect(() => {
    const key = locateOnShow.current;
    if (!key || !byKey.has(key) || !chartRef.current) return;
    locateOnShow.current = null;
    requestAnimationFrame(() => locate(key));
  });

  const showOnChart = (pos: PortfolioPosition, fill: PositionFill = pos.fills[0]!) => {
    // Make the event visible (its component and class) without changing anything else, then select and centre it.
    const cls = fill.kind;
    setVisibility((v) => ({ ...v, components: { ...v.components, [pos.component]: true }, [cls]: true }));
    if (pos.symbol !== symbol) p.onSymbol(pos.symbol);
    const key = `A:${fill.eventId}`;
    setSelKey(key);
    locateOnShow.current = key;
  };

  const totals = portfolioTotals(detail.metrics);
  const m = detail.metrics;
  const periods = periodOptionsOf(detail);
  const shownPeriod: Period = periods.some(([k]) => k === period) ? period : 'all';
  const viewOpts = {
    validationEnd: m.window.postValidation ? m.window.research.validationEnd : null,
    reportingFrom: m.window.reporting.from !== m.window.simulation.from ? m.window.reporting.from : null
  };
  const equity = equityQ.data && equityQ.data.replayId === detail.id ? equityQ.data : null;
  const closeAt = (d: string | null) => (equity && d ? (equity.closeMs[equity.dates.indexOf(d)] ?? null) : null);
  const boundaryMs = m.development ? closeAt(PORTFOLIO_BENCHMARK.boundary) : null;
  const postBoundaryMs = m.postValidation ? closeAt(m.postValidation.after) : null;
  const periodRange = equity ? periodWindow(shownPeriod, equity.closeMs, equity.dates, viewOpts) : null;
  const choosePeriod = (pp: Period) => {
    setPeriod(pp);
    const w = equity ? periodWindow(pp, equity.closeMs, equity.dates, viewOpts) : null;
    chartRef.current?.setWindow(w);
  };

  const chartData: ChartData | null =
    chartType === 'candles'
      ? candles
        ? { mode: 'candles', candles }
        : null
      : pricesQ.data
        ? {
            mode: 'line',
            overview: pricesQ.data.points,
            overviewDecimated: pricesQ.data.decimated,
            fetchDetail: (from, to, signal) =>
              api.prices(detail.id, symbol, { from: Math.floor(from), to: Math.ceil(to), points: 3000 }, signal).then((r) => r.points)
          }
        : null;
  const priceError = chartType === 'candles' ? candlesQ.error : pricesQ.error;

  // counts of THIS symbol per component and class (all events, regardless of visibility)
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of events?.events ?? []) {
      if (e.symbol !== symbol) continue;
      const k = `${eventComponent(e)}|${eventClassOf(e)}`;
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [events, symbol]);
  const componentsHere = (['D1', 'Growth'] as Component[]).filter((comp) =>
    entry.components.some((x) => x.enabled && x.family === comp && x.symbol === symbol)
  );
  const count = (comp: Component | null, cls: string) =>
    (comp ? [comp] : componentsHere).reduce((a, k) => a + (counts[`${k}|${cls}`] ?? 0), 0);
  const hovered = hover ? hover.keys.map((k) => byKey.get(k)).filter((x): x is ChartEvent => Boolean(x)) : [];

  return (
    <>
      <PortfolioSummary detail={detail} totals={totals} />
      <section className="card" aria-label="Portfolio equity and drawdown" data-testid="equity-card">
        <div className="equity-head">
          <h3>Portfolio equity and minute drawdown</h3>
          <PeriodButtons options={periods} period={shownPeriod} onChange={choosePeriod} />
        </div>
        {equity ? (
          <EquityChart equity={equity} window={periodRange} boundaryMs={boundaryMs} postBoundaryMs={postBoundaryMs} />
        ) : equityQ.error ? (
          <div className="chart-missing" role="alert">
            Equity unavailable: {equityQ.error}
          </div>
        ) : (
          <div className="chart-missing">Loading the portfolio equity…</div>
        )}
      </section>

      <section className="card chart-card" aria-label={`${symbol} price and pooled events`} data-testid="portfolio-chart-card">
        <div className="chart-toolbar">
          <div className="symbol-tabs" role="tablist" aria-label="Symbol" data-testid="symbol-tabs">
            {detail.symbols.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={s === symbol}
                className={s === symbol ? 'is-on' : ''}
                onClick={() => p.onSymbol(s)}
                data-testid={`symbol-tab-${s}`}
              >
                {s}
              </button>
            ))}
            <span className="muted small symbol-note">
              {symbol} tab: {symbol}’s price and every component trading {symbol} ({componentsHere.join(' and ')}). Switching
              tabs changes the view only — the pool and its accounting are the one replay above.
            </span>
          </div>
        </div>
        <div className="chart-type-row">
          <div className="segmented small chart-type" role="radiogroup" aria-label="Chart type" data-testid="chart-type">
            {(
              [
                ['candles', 'Candles · 1D'],
                ['line', 'Line · intraday']
              ] as const
            ).map(([t, label]) => (
              <label key={t} className={chartType === t ? 'is-on' : ''}>
                <input type="radio" name="portfolio-chart-type" value={t} checked={chartType === t} onChange={() => p.setChartType(t)} data-testid={`chart-type-${t}`} />
                {label}
              </label>
            ))}
          </div>
          <PeriodButtons options={periods} period={shownPeriod} onChange={choosePeriod} testid="chart-period" />
          <span className="muted small">
            Periods are viewports of the one continuous run (each keeps the positions carried in).
            {m.postValidation ? ` After ${m.postValidation.after}: manual post-validation evaluation.` : ''}
          </span>
        </div>
        <div className="legend portfolio-legend" data-testid="legend">
          <span className="legend-group" aria-label="Components">
            <b className="small">Show:</b>
            {componentsHere.map((comp) => (
              <label key={comp} className={`legend-kind${visibility.components[comp] ? '' : ' is-off'}`}>
                <input
                  type="checkbox"
                  checked={visibility.components[comp]}
                  onChange={(e) => setVisibility((v) => ({ ...v, components: { ...v.components, [comp]: e.target.checked } }))}
                  data-testid={`show-${comp}`}
                />
                <Glyph kind="executed_entry" role="A" tone="shape" frame={FRAME_OF[comp]} /> {comp}{' '}
                <span className="muted small">({comp === 'D1' ? 'square frame' : 'round frame'})</span>
              </label>
            ))}
          </span>
          <span className="legend-group" aria-label="Executed events">
            {(
              [
                ['entry', 'executed_entry', false, 'Entries'],
                ['partial', 'executed_exit', true, 'Partial exits (half-filled ▼)'],
                ['final', 'executed_exit', false, 'Final exits']
              ] as const
            ).map(([cls, kind, partial, label]) => (
              <label key={cls} className={`legend-kind${visibility[cls] ? '' : ' is-off'}`}>
                <input
                  type="checkbox"
                  checked={visibility[cls]}
                  onChange={(e) => setVisibility((v) => ({ ...v, [cls]: e.target.checked }))}
                  data-testid={`show-${cls}`}
                />
                <Glyph kind={kind} role="A" tone="shape" partial={partial} /> {label} <b data-testid={`count-${cls}`}>{count(null, cls)}</b>
              </label>
            ))}
            <label className={`legend-kind${visibility.refused ? '' : ' is-off'}`} title="Executable signals the pool refused because its one $100,000 slot was held. Never fills, positions or P&L.">
              <input
                type="checkbox"
                checked={visibility.refused}
                onChange={(e) => setVisibility((v) => ({ ...v, refused: e.target.checked }))}
                data-testid="show-refused"
              />
              <Glyph kind="rejected_signal" role="A" tone="rejected" /> Refused signals (not executed) <b data-testid="count-refused">{count(null, 'refused')}</b>
            </label>
          </span>
          <span className="legend-tones small" data-testid="legend-tones">
            Colour = the POSITION’s net after costs and interest (entry, partial and final exits alike):
            {(['profit', 'loss', 'flat', 'open'] as const).map((t) => (
              <span key={t} className="legend-tone" data-tone={t}>
                <span className="tone-swatch" style={{ background: TONE_COLOR[t] }} aria-hidden="true" /> {TONE_LABEL[t]}
              </span>
            ))}
            <span className="legend-tone">
              <span className="tone-swatch" style={{ background: TONE_COLOR.rejected }} aria-hidden="true" /> refused (purple ⊘)
            </span>
          </span>
          <span className="muted small legend-note" data-testid="legend-note">
            Only funded executions are drawn; the books’ shadow (virtual) trades are never shown. Toggles change what is
            visible, never the portfolio or its figures.
          </span>
        </div>
        <div className="chart-body">
          {priceError ? (
            <div className="chart-missing" role="alert">
              {chartType === 'candles' ? 'Daily candles' : 'Price data'} unavailable for {symbol}: {priceError}.
            </div>
          ) : chartData && events ? (
            <PriceChart
              key={`${detail.id}:${symbol}:${chartType}`}
              ref={chartRef}
              data={chartData}
              synthetic={false}
              events={chartEvents}
              selectedKey={selected ? selKey : null}
              initialWindow={() => lastWindow.current}
              onWindowChange={(range, full) => {
                setView({ range, full });
                lastWindow.current = full ? null : range;
              }}
              onActivate={(keys) => {
                const i = keys.indexOf(selKey ?? '');
                const next = keys[(i + 1) % keys.length];
                if (next) setSelKey(next);
              }}
              onHover={(keys, anchor, placement) => setHover(keys && anchor ? { keys, anchor, placement: placement ?? 'none' } : null)}
              linkOf={linkOf}
            />
          ) : (
            <div className="chart-missing">Loading {symbol} {chartType === 'candles' ? 'daily candles' : 'prices'} and events…</div>
          )}
        </div>
        <div className="chart-tools">
          <div className="row" role="group" aria-label="Zoom">
            {(
              [
                ['1W', 7],
                ['1M', 31],
                ['3M', 92],
                ['1Y', 366],
                ['3Y', 1096]
              ] as const
            ).map(([label, days]) => (
              <button
                key={label}
                type="button"
                className="btn-chip"
                onClick={() => {
                  const w = chartRef.current?.getWindow();
                  if (w) chartRef.current?.zoomAround((w[0] + w[1]) / 2, days * DAY);
                }}
              >
                {label}
              </button>
            ))}
            <button type="button" className={`btn-chip${view?.full ? ' is-on' : ''}`} onClick={() => chartRef.current?.setWindow(null)} data-testid="zoom-all">
              All
            </button>
          </div>
          <span className="muted small">{view ? `${formatEtDate(view.range[0])} → ${formatEtDate(view.range[1])}` : ''}</span>
          <span className="muted small chart-hint">Drag to measure · scroll to zoom · Ctrl/⌘- or Shift-drag to pan · double-click resets</span>
        </div>
        {selected && (
          <SelectedEvent c={selected} info={fillOf.get(selected.event.id) ?? null} trade={tradeOf(selected)} />
        )}
      </section>

      <PositionLedger
        detail={detail}
        filter={filter}
        setFilter={setFilter}
        expanded={expanded}
        setExpanded={setExpanded}
        selectedPosition={selectedPosition?.id ?? null}
        onShow={showOnChart}
      />

      {hover && hovered.length > 0 && (
        <MarkerTooltip
          items={hovered}
          anchor={hover.anchor}
          tradeOf={tradeOf}
          placement={hover.placement}
          slotOf={slots ? (c) => slots.get(c.key) ?? null : undefined}
          itemBody={(c) => <EventBody c={c} info={fillOf.get(c.event.id) ?? null} trade={tradeOf(c)} />}
        />
      )}
    </>
  );
}

/** The period viewports a replay offers (only those its run spans), with their labels. */
function periodOptionsOf(detail: PortfolioReplayDetail): [Period, string][] {
  const m = detail.metrics;
  const w = m.window;
  const y = (d: string) => d.slice(0, 4);
  const out: [Period, string][] = [['all', `Full run ${y(w.simulation.from)}–${y(w.simulation.to)}`]];
  if (m.development) out.push(['development', `${y(w.simulation.from)}–2024`]);
  if (m.validation) out.push(['validation', m.postValidation ? `2025 → ${m.validation.through} (validation)` : '2025–2026 (validation)']);
  if (m.postValidation) out.push(['post', `After ${m.postValidation.after} (post-validation)`]);
  if (w.reporting.from !== w.simulation.from) out.push(['reporting', `Reporting ${w.reporting.from} → ${w.reporting.to}`]);
  return out;
}

function PeriodButtons({
  options,
  period,
  onChange,
  testid = 'period'
}: {
  options: [Period, string][];
  period: Period;
  onChange: (p: Period) => void;
  testid?: string;
}) {
  return (
    <div className="segmented small" role="radiogroup" aria-label="Period (viewport)" data-testid={testid}>
      {options.map(([k, label]) => (
        <label key={k} className={period === k ? 'is-on' : ''}>
          <input type="radio" name={`${testid}-period`} checked={period === k} onChange={() => onChange(k)} data-testid={`${testid}-${k}`} />
          {label}
        </label>
      ))}
    </div>
  );
}

// ----- the portfolio summary: the ONE pool's figures, then booked attribution -----

function PortfolioSummary({ detail, totals }: { detail: PortfolioReplayDetail; totals: ReturnType<typeof portfolioTotals> }) {
  const m = detail.metrics;
  const w = m.window;
  const R = m.periods.find((p) => p.key === 'R') ?? null;
  const dd = (x: typeof totals.minuteDd) => (
    <>
      {usd(x.usd)} <span className="muted small">({pct(x.pctOfPrincipal)} of the $100,000 principal)</span>
      {x.peakT && x.troughT ? (
        <span className="muted small dd-dates">
          {' '}
          peak {formatEt(x.peakT)} → trough {formatEt(x.troughT)}
        </span>
      ) : null}
    </>
  );
  return (
    <section className="card portfolio-summary" aria-label="Portfolio summary" data-testid="portfolio-summary">
      <h3>
        Portfolio totals{' '}
        <span className="muted small">
          — the ONE shared $100,000 pool, {w.simulation.from} → {w.simulation.to},{' '}
          {w.execution === 'isolated' && w.requested.mode === 'custom' ? 'isolated (starts flat)' : 'continuous'}
        </span>
      </h3>
      {R && (
        <div className="summary-block summary-reporting" data-testid="summary-reporting">
          <h4>
            Reporting window {w.reporting.from} → {w.reporting.to}{' '}
            <span className="muted small">(of the continuous run from {w.simulation.from}; positions and state carried in)</span>
          </h4>
          <dl>
            <dt>Marked net change</dt>
            <dd className={`big ${toneClass(R.net)}`} data-testid="summary-reporting-net" data-value={R.net}>
              {usd(R.net, true)}
            </dd>
            <dt>Realized in the window / unrealized at its start → end</dt>
            <dd>
              {usd(R.realizedPnl, true)} / {usd(R.unrealizedAtStart, true)} → {usd(R.unrealizedAtEnd, true)}
            </dd>
            <dt>Reset minute drawdown · from the continuous peak</dt>
            <dd>
              {usd(R.drawdownReset.max)} · {usd(R.drawdownFromContinuousPeak.max)}
            </dd>
            <dt>Lots active · entered · carried in</dt>
            <dd>
              {R.lots.active} · {R.lots.entered} · {R.lots.carriedIn}
            </dd>
            <dt>Interest · transaction costs</dt>
            <dd>
              {usd(R.interest)} · {usd(R.costs)}
            </dd>
          </dl>
        </div>
      )}
      <div className="summary-grid">
        <div className="summary-block" data-testid="summary-full">
          <h4>
            Full run{' '}
            <span className="muted small">
              {w.simulation.from} → {w.simulation.to}
            </span>
          </h4>
          <dl>
            <dt>Marked net P&amp;L</dt>
            <dd className={`big ${toneClass(totals.net)}`} data-testid="summary-net" data-value={totals.net}>
              {usd(totals.net, true)}
            </dd>
            <dt>Realized</dt>
            <dd data-testid="summary-realized">{usd(totals.realized, true)}</dd>
            <dt>Open (unrealized, marked at the last close)</dt>
            <dd data-testid="summary-unrealized">{usd(totals.unrealized, true)}</dd>
            <dt>Maximum minute drawdown</dt>
            <dd data-testid="summary-dd" data-value={totals.minuteDd.usd}>
              {dd(totals.minuteDd)}
            </dd>
            <dt>Daily-close drawdown</dt>
            <dd>{dd(totals.dailyDd)}</dd>
          </dl>
        </div>
        <div className="summary-block" data-testid="summary-validation">
          {m.postValidation && totals.postValidationDd && (
            <div className="summary-post" data-testid="summary-post">
              <h4>
                After {m.postValidation.after} → {m.postValidation.through}{' '}
                <span className="badge badge-warn small">manual post-validation evaluation</span>
              </h4>
              <dl>
                <dt>Marked net change from the {m.postValidation.after} close</dt>
                <dd className={`big ${toneClass(m.postValidation.net)}`} data-testid="summary-post-net" data-value={m.postValidation.net}>
                  {usd(m.postValidation.net, true)}
                </dd>
                <dt>Realized / unrealized change</dt>
                <dd>
                  {usd(m.postValidation.realizedChange, true)} / {usd(m.postValidation.unrealizedChange, true)}
                </dd>
                <dt>Reset minute drawdown (peak = the {m.postValidation.after} close)</dt>
                <dd data-testid="summary-post-dd" data-value={m.postValidation.resetDd.usd}>
                  {dd(totals.postValidationDd)}
                </dd>
                <dt>Positions entered · carried in</dt>
                <dd>
                  {m.postValidation.positionsEntered} · {m.postValidation.carriedIn.length ? m.postValidation.carriedIn.join(', ') : 'none'}
                </dd>
                <dt>Interest · transaction costs</dt>
                <dd>
                  {usd(m.postValidation.interest)} · {usd(m.postValidation.costs)}
                </dd>
              </dl>
            </div>
          )}
          {m.validation && totals.validationDd && (
            <>
              <h4>2025-01-02 → {m.validation.through} (validation, examined history)</h4>
              <dl>
                <dt>Marked net change from the 2024-12-31 close</dt>
                <dd className={`big ${toneClass(m.validation.net)}`} data-testid="summary-validation-net" data-value={m.validation.net}>
                  {usd(m.validation.net, true)}
                </dd>
                <dt>Realized / unrealized change</dt>
                <dd>
                  {usd(m.validation.realizedChange, true)} / {usd(m.validation.unrealizedChange, true)}
                </dd>
                <dt>Reset minute drawdown (peak = the 2024-12-31 close)</dt>
                <dd>{dd(totals.validationDd)}</dd>
                <dt>Positions entered · carried in</dt>
                <dd>
                  {m.validation.positionsEntered} · {m.validation.carriedIn.length ? m.validation.carriedIn.join(', ') : 'none'}
                </dd>
              </dl>
            </>
          )}
          {m.development && totals.developmentDd && (
            <>
              <h4>{w.simulation.from} → 2024-12-31 (development)</h4>
              <dl>
                <dt>Marked net at the 2024-12-31 close</dt>
                <dd data-testid="summary-development-net">{usd(m.development.net, true)}</dd>
                <dt>Minute drawdown (to that close)</dt>
                <dd>{dd(totals.developmentDd)}</dd>
              </dl>
            </>
          )}
          {!m.validation && !m.development && <p className="muted small">The window does not span the 2024-12-31 boundary.</p>}
        </div>
        <div className="summary-block" data-testid="summary-positions">
          <h4>Positions and exposure</h4>
          <dl>
            <dt>Funded positions (a partially exited position counts once)</dt>
            <dd data-testid="summary-positions-count">
              {totals.positions} · {totals.closed} closed, {totals.open} open
            </dd>
            <dt>Partial exits</dt>
            <dd data-testid="summary-partials">{totals.partialExits}</dd>
            <dt>Closed: winners / losers (whole-position net)</dt>
            <dd>
              {totals.wins} / {totals.losses}
            </dd>
            <dt>Sessions with a funded position</dt>
            <dd>
              {m.full.sessionsHeld} of {m.window.sessions} ({pct(totals.exposurePct)})
            </dd>
            <dt>Interest · transaction costs</dt>
            <dd>
              {usd(totals.interest)} · {usd(totals.costs)}
            </dd>
            <dt>Refused executable signals (slot occupied)</dt>
            <dd data-testid="summary-refused">{totals.refused} — never fills or P&amp;L</dd>
            <dt>Granted orders unfilled at the endpoint</dt>
            <dd data-testid="summary-pending">
              {m.pending.length
                ? m.pending.map((o) => `${o.component} · ${o.symbol} ${o.setup} decided ${formatEt(o.decisionT)} (reserved, not an entry)`).join('; ')
                : 'none'}
            </dd>
          </dl>
        </div>
      </div>
      <table className="attribution small" data-testid="attribution">
        <caption>
          Booked P&amp;L by component — <b>attribution, not causal contribution</b>: Σ net of each component’s funded positions in this one
          pool. Removing a component would change which trades the shared slot funds. Rows sum to the portfolio net.
        </caption>
        <thead>
          <tr>
            <th>Component</th>
            <th>Positions</th>
            <th>Open</th>
            <th>Partial exits</th>
            <th>Win / loss</th>
            <th>Decisions · granted · refused</th>
            <th>Realized</th>
            <th>Unrealized</th>
            <th>Booked net</th>
          </tr>
        </thead>
        <tbody>
          {m.attribution.map((a) => (
            <tr key={a.book} data-book={a.book}>
              <th scope="row">
                <Glyph kind="executed_entry" role="A" tone="shape" frame={FRAME_OF[a.component]} /> {a.component} · {a.symbol}
              </th>
              <td>{a.positions}</td>
              <td>{a.open}</td>
              <td>{a.partialExits}</td>
              <td>
                {a.wins} / {a.losses}
              </td>
              <td>
                {a.decisions} · {a.granted} · {a.refused}
              </td>
              <td>{usd(a.realized, true)}</td>
              <td>{usd(a.unrealized, true)}</td>
              <td className={toneClass(a.booked)}>{usd(a.booked, true)}</td>
            </tr>
          ))}
          <tr className="total">
            <th scope="row">Portfolio (one pool)</th>
            <td>{totals.positions}</td>
            <td>{totals.open}</td>
            <td>{totals.partialExits}</td>
            <td>
              {totals.wins} / {totals.losses}
            </td>
            <td />
            <td>{usd(totals.realized, true)}</td>
            <td>{usd(totals.unrealized, true)}</td>
            <td className={toneClass(totals.net)}>{usd(totals.net, true)}</td>
          </tr>
        </tbody>
      </table>
      {m.periods.length > 0 && <PeriodTable periods={m.periods} />}
    </section>
  );
}

/** The period table of the run: src/manual-eval/report.ts periodMetrics, the same figures as `npm run manual-eval`. */
function PeriodTable({ periods }: { periods: PortfolioPeriod[] }) {
  const rows: [string, (p: PortfolioPeriod) => string][] = [
    ['After the close of → through', (p) => `${p.after ?? 'start'} → ${p.through}`],
    ['Net P&L (Δ marked net)', (p) => usd(p.net, true)],
    ['Gross trading P&L', (p) => usd(p.grossTradingPnl, true)],
    ['Margin interest', (p) => usd(p.interest)],
    ['Transaction costs', (p) => usd(p.costs)],
    ['Realized in the period', (p) => usd(p.realizedPnl, true)],
    ['Unrealized at start / end', (p) => `${usd(p.unrealizedAtStart, true)} / ${usd(p.unrealizedAtEnd, true)}`],
    ['Max marked DD, reset at the start', (p) => usd(p.drawdownReset.max)],
    ['Max marked DD from the continuous peak', (p) => usd(p.drawdownFromContinuousPeak.max)],
    ['Max banked-capital DD', (p) => usd(p.bankedCapitalDrawdown.max)],
    ['Max trade-principal loss', (p) => (p.maxTradePrincipalLoss ? `${usd(p.maxTradePrincipalLoss.loss)} (P-${p.maxTradePrincipalLoss.lot})` : '—')],
    ['Lots active / entered / closed / carried in', (p) => `${p.lots.active} / ${p.lots.entered} / ${p.lots.closed} / ${p.lots.carriedIn}`],
    ['Win rate (closed lots)', (p) => (p.lots.winRate === null ? '—' : `${p.lots.winRate}% (${p.lots.winners} of ${p.lots.closed})`)],
    ['Open at the end', (p) => (p.openPositions.length ? p.openPositions.map((o) => `P-${o.lot} ${usd(o.markedPnl, true)}`).join('; ') : 'none')]
  ];
  return (
    <details className="period-details" open data-testid="period-table">
      <summary className="small">
        <b>Periods of the continuous run</b> — the figures of <code>npm run manual-eval</code> (a period’s P&amp;L is the change of the
        marked net; a position spanning a boundary is attributed by its marks)
      </summary>
      <div className="table-scroll">
        <table className="period-table small">
          <thead>
            <tr>
              <th>Item</th>
              {periods.map((p) => (
                <th key={p.key} className={p.key === 'B' ? 'period-post' : ''} title={p.label} data-period={p.key}>
                  {p.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, f]) => (
              <tr key={name}>
                <td>{name}</td>
                {periods.map((p) => (
                  <td key={p.key} className={p.key === 'B' ? 'period-post' : ''} data-period={p.key}>
                    {f(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="small muted">
        {periods.map((p) => (
          <li key={p.key}>
            <b>{p.key}</b> — {p.label}
          </li>
        ))}
      </ul>
    </details>
  );
}


// ----- events: tooltip body and the selected event -----

function EventBody({ c, info, trade }: { c: ChartEvent; info: { position: PortfolioPosition; fill: PositionFill; n: number } | null; trade: Trade | null }) {
  const e: LabEvent = c.event;
  const comp = eventComponent(e);
  if (e.kind === 'rejected_signal') {
    const occupant = e.values.find((v) => v.key === 'occupant')?.value;
    return (
      <div data-testid="tt-refused">
        <div className="tt-head">
          <Glyph kind="rejected_signal" role="A" tone="rejected" frame={comp ? FRAME_OF[comp] : null} /> <b>Refused signal — NOT executed</b>
          <span className="muted">
            {comp} · {e.symbol}
          </span>
        </div>
        <div className="tt-values">
          <span className="tt-strong">decision price {formatPrice(e.price)}</span>
          <span>{formatEt(e.t, e.timePrecision)}</span>
        </div>
        <div className="tt-reason">Insufficient pool availability: the $100,000 slot was held by {String(occupant)}. Not a fill, position or P&amp;L.</div>
      </div>
    );
  }
  if (!info) return <div className="tt-reason">{e.reason}</div>;
  const { position: pos, fill: f, n } = info;
  const action = f.kind === 'partial' ? `${ACTION_LABEL.partial} ${n}` : ACTION_LABEL[f.kind];
  return (
    <div data-testid="tt-fill" data-position={pos.id} data-action={f.kind}>
      <div className="tt-head">
        <Glyph kind={e.kind} role="A" tone={c.tone} partial={isPartialExit(e)} frame={comp ? FRAME_OF[comp] : null} /> <b>{action}</b>
        <span className="muted">
          {pos.component} · {pos.symbol} · position <b>{pos.id}</b>
        </span>
      </div>
      <div className="tt-values">
        <span className="tt-strong">{formatPrice(f.price)}</span>
        <span>{formatEt(f.t, f.timePrecision)}</span>
      </div>
      <div className="tt-grid small">
        <span>Quantity</span>
        <span>{shares(f.shares)} sh</span>
        <span>{f.kind === 'entry' ? 'Principal' : 'Proceeds'}</span>
        <span>{usd(f.amount)}</span>
        <span>After cost</span>
        <span>{formatPrice(f.priceAfterCost)}</span>
        <span>Remaining</span>
        <span>
          {shares(f.sharesAfter)} sh · {usd(f.principalAfter)} principal
        </span>
        {f.kind !== 'entry' && (
          <>
            <span>Exit reason</span>
            <span>{f.reason}</span>
            <span>This fill (realized)</span>
            <span className={toneClass(f.fillNet ?? 0)}>{usd(f.fillNet, true)} after costs and interest</span>
          </>
        )}
      </div>
      <div className="tt-pnl">
        Whole position {pos.id} net:{' '}
        <b className={toneClass(pos.net)}>{usd(pos.net, true)}</b>{' '}
        <span className="muted small">
          {pos.status === 'open' ? 'open — marked at the last close (unrealized remainder)' : 'closed — after costs and interest'}
          {trade?.pnl?.percent !== null && trade?.pnl?.percent !== undefined ? ` · ${trade.pnl.percent.toFixed(2)}% of $100,000` : ''}
        </span>
      </div>
    </div>
  );
}

function SelectedEvent({ c, info, trade }: { c: ChartEvent; info: { position: PortfolioPosition; fill: PositionFill; n: number } | null; trade: Trade | null }) {
  return (
    <div className="selected-event card-inset" data-testid="selected-event" data-event-id={c.event.id}>
      <EventBody c={c} info={info} trade={trade} />
    </div>
  );
}

// ----- the ledger: real pooled positions, expandable executions -----

function PositionLedger({
  detail,
  filter,
  setFilter,
  expanded,
  setExpanded,
  selectedPosition,
  onShow
}: {
  detail: PortfolioReplayDetail;
  filter: LedgerFilter;
  setFilter: (f: LedgerFilter) => void;
  expanded: Set<string>;
  setExpanded: (f: (s: Set<string>) => Set<string>) => void;
  selectedPosition: string | null;
  onShow: (p: PortfolioPosition, f?: PositionFill) => void;
}) {
  const bounds = boundsOf(detail.metrics);
  const options = periodOptionsOf(detail);
  const period = options.some(([k]) => k === filter.period) ? filter.period : 'all';
  const rows = filterPositions(detail.positions, { ...filter, period }, bounds);
  // a period that starts after the run's start: each listed position's contribution to it (NOT its lifetime net)
  const pk = PERIOD_KEY[period] ?? null;
  const periodLabel = options.find(([k]) => k === period)?.[1] ?? '';
  const sub = bookedSubtotal(rows);
  const all = bookedSubtotal(detail.positions);
  const selectedRow = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    selectedRow.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedPosition]);
  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const sel = (key: keyof LedgerFilter, options: [string, string][]) => (
    <label className="small">
      {key === 'symbol' ? 'Symbol' : key === 'component' ? 'Component' : key === 'status' ? 'Status' : 'Period'}{' '}
      <select value={filter[key]} onChange={(e) => setFilter({ ...filter, [key]: e.target.value } as LedgerFilter)} data-testid={`ledger-${key}`}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="card ledger" aria-label="Pooled positions" data-testid="ledger">
      <div className="ledger-head">
        <h3>Positions (funded, pooled)</h3>
        <div className="row ledger-filters">
          {sel('symbol', [['all', 'All'], ...detail.symbols.map((s) => [s, s] as [string, string])])}
          {sel('component', [
            ['all', 'All'],
            ['D1', 'D1'],
            ['Growth', 'Growth']
          ])}
          {sel('status', [
            ['all', 'All'],
            ['open', 'Open'],
            ['closed', 'Closed']
          ])}
          {sel(
            'period',
            options.map(([k, label]) => [
              k,
              k === 'all' ? 'Whole run' : k === 'development' ? `Entered ${label}` : `Active ${label.replace(/^After/, 'after')} (incl. carried in)`
            ])
          )}
          {isFiltered(filter) && (
            <button type="button" className="btn-chip" onClick={() => setFilter(DEFAULT_LEDGER_FILTER)} data-testid="ledger-reset">
              Show all
            </button>
          )}
        </div>
      </div>
      <p className="small muted" data-testid="ledger-count">
        {rows.length} of {detail.positions.length} positions
        {isFiltered(filter) ? (
          <>
            {' '}
            · <b data-testid="ledger-subtotal">filtered subtotal (booked net of the listed positions, not the portfolio’s result): {usd(sub.net, true)}</b>
          </>
        ) : (
          <> · Σ booked net {usd(all.net, true)} = the portfolio’s marked net</>
        )}
        {pk ? (
          <span data-testid="ledger-period-sum">
            {' '}
            · Σ P&amp;L in {periodLabel} of the listed positions: {usd(rows.reduce((a, x) => a + (x.inPeriod?.[pk]?.pnl ?? 0), 0), true)} (the change of their
            marks inside the period, not their lifetime net)
          </span>
        ) : null}
      </p>
      <div className="table-scroll">
        <table className="ledger-table small">
          <thead>
            <tr>
              <th />
              <th>Position</th>
              <th>Component</th>
              <th>Setup</th>
              <th>Entry (ET)</th>
              <th>Entry fill</th>
              <th>Shares</th>
              <th>Exits</th>
              <th>Final exit (ET)</th>
              <th>Exit reason</th>
              <th>Days</th>
              <th>Net (whole position, lifetime)</th>
              {pk && (
                <th title="The change of the position's marked value inside the selected period (for a position carried in: from its mark at the period's opening close). Not its lifetime net." data-testid="ledger-period-col">
                  P&amp;L in this period ({pk})
                </th>
              )}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const open = expanded.has(p.id);
              const last = p.fills.at(-1)!;
              const final = p.status === 'closed' ? last : null;
              return (
                <Fragment key={p.id}>
                  <tr
                    ref={p.id === selectedPosition ? selectedRow : undefined}
                    className={`${p.id === selectedPosition ? 'is-selected' : ''} tone-${p.status === 'open' ? 'open' : p.net > 0 ? 'profit' : p.net < 0 ? 'loss' : 'flat'}`}
                    data-position={p.id}
                    data-symbol={p.symbol}
                    data-component={p.component}
                    data-status={p.status}
                  >
                    <td>
                      <button type="button" className="btn-ghost expand" aria-expanded={open} onClick={() => toggle(p.id)} data-testid={`expand-${p.id}`} aria-label={`${open ? 'Collapse' : 'Expand'} ${p.id} executions`}>
                        {open ? '▾' : '▸'}
                      </button>
                    </td>
                    <td>
                      <b>{p.id}</b>
                    </td>
                    <td>
                      <Glyph kind="executed_entry" role="A" tone="shape" frame={FRAME_OF[p.component]} /> {p.component} · {p.symbol}
                    </td>
                    <td>{p.setup}</td>
                    <td>{formatEt(p.fills[0]!.t, p.fills[0]!.timePrecision)}</td>
                    <td>{formatPrice(p.fills[0]!.price)}</td>
                    <td>{shares(p.shares)}</td>
                    <td data-testid={`exits-${p.id}`}>
                      {p.partialExits ? `${p.partialExits} partial` : ''}
                      {p.partialExits && final ? ' + ' : ''}
                      {final ? 'final' : p.partialExits ? ' · remainder open' : 'open'}
                    </td>
                    <td>{final ? formatEt(final.t, final.timePrecision) : '—'}</td>
                    <td>{p.exitReason ?? (p.status === 'open' ? 'open at the endpoint' : '—')}</td>
                    <td>{p.calendarDays.toFixed(0)}</td>
                    <td className={toneClass(p.net)}>
                      {usd(p.net, true)}
                      {p.status === 'open' ? <span className="muted"> (marked)</span> : null}
                    </td>
                    {pk && (
                      <td className={`in-period ${toneClass(p.inPeriod?.[pk]?.pnl ?? 0)}`} data-testid={`in-period-${p.id}`} data-value={p.inPeriod?.[pk]?.pnl ?? ''}>
                        {p.inPeriod?.[pk] ? (
                          <>
                            {usd(p.inPeriod[pk]!.pnl, true)}
                            {p.inPeriod[pk]!.carriedIn ? (
                              <span className="muted" title={`Carried in: marked at ${usd(p.inPeriod[pk]!.valueAtStart, true)} at the period's opening close`}>
                                {' '}
                                (carried in from {usd(p.inPeriod[pk]!.valueAtStart, true)})
                              </span>
                            ) : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    )}
                    <td>
                      <button
                        type="button"
                        className="btn-chip"
                        onClick={() => onShow(p)}
                        data-testid={`show-${p.id}`}
                        aria-label={`Show ${p.id} on the chart`}
                        title="Show this position's entry on the chart (switches the symbol tab if needed)"
                      >
                        Chart
                      </button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="ledger-fills" data-testid={`fills-${p.id}`}>
                      <td />
                      <td colSpan={pk ? 13 : 12}>
                        <table className="fills-table">
                          <thead>
                            <tr>
                              <th>Execution</th>
                              <th>Time (ET)</th>
                              <th>Price</th>
                              <th>After cost</th>
                              <th>Shares</th>
                              <th>Amount</th>
                              <th>Principal repaid</th>
                              <th>Interest</th>
                              <th>Fill P&amp;L (realized)</th>
                              <th>Remaining</th>
                              <th>Reason</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {p.fills.map((f, i) => (
                              <tr key={f.eventId} data-fill={f.kind} data-event-id={f.eventId}>
                                <td>{f.kind === 'partial' ? `Partial exit ${p.fills.slice(1, i + 1).filter((x) => x.kind === 'partial').length}` : ACTION_LABEL[f.kind]}</td>
                                <td>{formatEt(f.t, f.timePrecision)}</td>
                                <td>{formatPrice(f.price)}</td>
                                <td>{formatPrice(f.priceAfterCost)}</td>
                                <td>{shares(f.shares)}</td>
                                <td>{usd(f.amount)}</td>
                                <td>{f.principalRepaid === null ? '—' : usd(f.principalRepaid)}</td>
                                <td>{f.interest === null ? '—' : usd(f.interest)}</td>
                                <td className={toneClass(f.fillNet ?? 0)}>{f.fillNet === null ? '—' : usd(f.fillNet, true)}</td>
                                <td>
                                  {shares(f.sharesAfter)} sh · {usd(f.principalAfter)}
                                </td>
                                <td>{f.reason}</td>
                                <td>
                                  <button type="button" className="btn-ghost" onClick={() => onShow(p, f)} data-testid={`show-fill-${f.eventId}`}>
                                    Show
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {p.status === 'open' && (
                              <tr className="muted" data-fill="open-remainder">
                                <td colSpan={8}>Open at the endpoint — no closing fill is invented; the remainder is marked at the last close.</td>
                                <td className={toneClass(p.unrealized)}>{usd(p.unrealized, true)} unrealized</td>
                                <td colSpan={3} />
                              </tr>
                            )}
                          </tbody>
                        </table>
                        <p className="small muted">
                          Position totals: realized {usd(p.realized, true)} · unrealized {usd(p.unrealized, true)} · interest{' '}
                          {usd(p.interest)} · transaction costs {usd(p.costs)} · net {usd(p.net, true)}. Decision{' '}
                          {formatEt(p.decisionT)} at {formatPrice(p.decisionPrice)}; worst mark {usd(p.mae, true)}
                          {carriedIn(p, bounds) ? ' · carried across the 2024-12-31 boundary' : ''}
                          {bounds.validationEnd !== Infinity && carriedAcross(p, bounds.validationEnd)
                            ? ` · carried across the ${detail.metrics.window.research.validationEnd} validation end (its post-validation P&L is ${usd(p.inPeriod?.B?.pnl, true)}; its lifetime net is ${usd(p.net, true)})`
                            : ''}
                          .
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
