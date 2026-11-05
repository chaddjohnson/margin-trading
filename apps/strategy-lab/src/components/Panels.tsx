// Run-level panels: Parameters (inputs, assumptions, provenance), the selected event, and the analysis.

import type { LabEvent, LabValue, RunDetail } from '../../shared/contract.ts';
import { EVENT_KIND_LABEL } from '../../shared/contract.ts';
import type { ParamSpec, Predicate } from '../../shared/contract.ts';
import { findStrategy, RISE_FROM_RECENT_LOW, RISE_FROM_RECENT_LOW_TRADING, STUDY8_POOL } from '../../shared/strategies.ts';
import { glyphUri, type MarkerTone, type Role } from '../chart/markers.ts';
import {
  formatEt,
  formatPercent,
  formatPrice,
  formatShare,
  formatUsd,
  formatUtc,
  formatValue,
  PRECISION_LABEL
} from '../format.ts';
import { type TradingSymbolMetrics, TradingMetrics } from './Trading.tsx';

/** What kind of result a run is: a trading backtest, signal-only research, or another source. */
export function resultKindOf(run: Pick<RunDetail, 'strategy' | 'kind'>): string {
  if (run.strategy.key === RISE_FROM_RECENT_LOW_TRADING.key) return 'trading backtest — standalone per symbol';
  if (run.strategy.key === RISE_FROM_RECENT_LOW.key) return 'signal-only (no positions, exits or P&L)';
  if (run.strategy.key === STUDY8_POOL.key)
    return run.kind === 'import' ? 'imported shared-slot pool replay' : 'shared-slot pool rerun (one allocator replay)';
  return run.kind === 'import' ? 'imported result' : run.kind;
}

export function ValueTable({ values, caption }: { values: LabValue[]; caption?: string }) {
  if (values.length === 0) return null;
  return (
    <table className="kv-table">
      {caption && <caption>{caption}</caption>}
      <tbody>
        {values.map((v) => (
          <tr key={v.key}>
            <th scope="row">{v.label}</th>
            <td className={v.value === null ? 'unknown' : ''}>{formatValue(v)}</td>
            <td className="unit">{v.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const predicateText = (p: Predicate): string =>
  'all' in p
    ? p.all.map(predicateText).join(' and ')
    : 'any' in p
      ? p.any.map(predicateText).join(' or ')
      : 'not' in p
        ? `not (${predicateText(p.not)})`
        : 'in' in p
          ? `${p.param} ∈ {${p.in.join(', ')}}`
          : `${p.param} = ${String(p.equals)}`;

const definition = (p: ParamSpec) =>
  p.type === 'enum'
    ? `choice: ${p.options.map((o) => o.value).join(' | ')}, default ${p.default}`
    : p.type === 'boolean'
      ? `switch, default ${p.default ? 'ON' : 'OFF'}`
      : `${p.type}, ${p.unit}, ${p.min}–${p.max}, default ${p.default}`;

export function ParametersPanel({ run, onClone }: { run: RunDetail; onClone: (() => void) | null }) {
  const spec = findStrategy(run.strategy.key, run.strategy.version);
  const phenotypeOrigin = (run.provenance as { phenotype?: { exposure?: string | null } }).phenotype;
  const prov = run.provenance as Record<string, unknown>;
  const runner = prov.runner as
    | {
        symbols?: Record<
          string,
          { dataSha256?: string; dataFile?: string; warmup?: { note?: string }; splitAdjustments?: unknown[] }
        >;
      }
    | undefined;
  const code = run.codeRevision as { commit?: string; dirty?: string[]; branch?: string } | null;
  return (
    <section className="card" aria-label="Parameters" data-testid="parameters">
      <div className="card-head">
        <h3>Parameters · {run.variation.id}</h3>
        {onClone ? (
          <button type="button" className="btn-chip" onClick={onClone} data-testid="clone-run">
            Clone into new test…
          </button>
        ) : (
          <span className="muted small">
            {run.kind === 'import'
              ? 'Imported result: not executable here'
              : run.phenotype
                ? `Rerun of ${run.phenotype.id}: rerun it from the phenotype catalogue`
                : 'Synthetic demo: not executable'}
          </span>
        )}
      </div>
      {spec?.legacy && (
        <p className="muted small" data-testid="legacy-version">
          Version {run.strategy.version} (superseded by {spec.legacy.supersededBy}). It is kept as recorded; {spec.legacy.replay}.
        </p>
      )}
      {run.phenotype && (
        <p className="small phenotype-provenance" data-testid="run-phenotype">
          Run of phenotype <a href={`#/phenotype/${run.phenotype.id}`}>{run.phenotype.id}</a>{' '}
          <span className="mono">{run.phenotype.key}</span> from study <span className="mono">{run.phenotype.study}</span>
          {run.phenotype.edited ? (
            <b> — edited: a derived variation, not the frozen phenotype</b>
          ) : (
            ' — its frozen configuration, unedited'
          )}
          .{phenotypeOrigin?.exposure ? <span className="muted"> Data exposure: {phenotypeOrigin.exposure}</span> : null}
        </p>
      )}
      <ValueTable values={run.params} caption="Inputs (immutable snapshot)" />
      {run.paramSchema && run.paramSchema.params.length > 0 && (
        <details className="small">
          <summary>Parameter definitions (schema v{run.paramSchema.schemaVersion})</summary>
          <ul>
            {run.paramSchema.params.map((p) => (
              <li key={p.key}>
                <b>{p.label}</b> (<span className="mono">{p.key}</span>, {definition(p)}
                {p.activeWhen ? `; applies when ${predicateText(p.activeWhen)}` : ''}): {p.description}
              </li>
            ))}
            {run.paramSchema.constraints.map((c) => (
              <li key={c.id}>
                Rule <span className="mono">{c.id}</span>: {c.message}
              </li>
            ))}
            <li>
              Variation identity: {run.paramSchema.identity === 'effective' ? 'the effective (applied) values' : 'every stored value'}{' '}
              plus the resolution.
            </li>
          </ul>
        </details>
      )}
      <ValueTable
        values={[
          { key: 'symbols', label: 'Symbols', value: run.symbols.join(', '), unit: 'text' },
          {
            key: 'window',
            label: 'Window (NY session dates)',
            value: `${run.window.from} → ${run.window.to}`,
            unit: 'text'
          },
          { key: 'partition', label: 'Partitions touched', value: run.window.partition, unit: 'text' },
          { key: 'resolution', label: 'Resolution', value: run.window.resolution, unit: 'text' },
          {
            key: 'strategy',
            label: 'Strategy',
            value: `${run.strategy.title}${run.strategyFormerTitle ? ` (formerly “${run.strategyFormerTitle}”)` : ''} — ${run.strategy.key}@${run.strategy.version}, ${run.strategy.id}`,
            unit: 'text'
          },
          { key: 'origin', label: 'Data origin', value: run.dataOrigin, unit: 'text' },
          { key: 'resultKind', label: 'Result kind', value: resultKindOf(run), unit: 'text' }
        ]}
        caption="Run"
      />
      <ValueTable values={run.assumptions} caption="Assumptions" />
      <details className="small provenance">
        <summary>Provenance and reproducibility</summary>
        <ul>
          {code && (
            <li>
              Code: <span className="mono">{code.commit ?? 'unknown'}</span> on {code.branch ?? '?'}
              {code.dirty && code.dirty.length > 0 ? ` (uncommitted: ${code.dirty.join(', ')})` : ' (clean)'}
            </li>
          )}
          {runner?.symbols &&
            Object.entries(runner.symbols).map(([s, r]) => (
              <li key={s}>
                {s}: {r.dataFile} sha256 <span className="mono">{String(r.dataSha256 ?? '').slice(0, 16)}…</span>;
                warm-up: {r.warmup?.note}
                {Array.isArray(r.splitAdjustments) && r.splitAdjustments.length
                  ? `; splits forward-adjusted: ${JSON.stringify(r.splitAdjustments)}`
                  : ''}
              </li>
            ))}
          {Array.isArray(prov.checks) && (prov.checks as string[]).map((c) => <li key={c}>{c}</li>)}
          {typeof prov.importedFrom === 'string' && <li>Imported from {prov.importedFrom}</li>}
          {run.artifact.sha256 && (
            <li>
              Events file sha256 <span className="mono">{run.artifact.sha256}</span>
            </li>
          )}
          <li>
            Created {formatEt(run.createdAt)}
            {run.startedAt ? `, started ${formatEt(run.startedAt)}` : ''}
            {run.completedAt ? `, finished ${formatEt(run.completedAt)}` : ''}
          </li>
        </ul>
      </details>
    </section>
  );
}

export function Glyph({ kind, role, tone }: { kind: LabEvent['kind']; role: Role; tone: MarkerTone }) {
  return <img className="glyph" src={glyphUri(kind, role, tone, 13)} alt="" width={13} height={13} data-tone={tone} />;
}

export function EventDetail({
  event,
  role,
  runId,
  tone,
  markerPrice,
  onSelect,
  onZoom
}: {
  event: LabEvent | null;
  role: Role | null;
  runId: string | null;
  tone: MarkerTone | null;
  markerPrice: number | null;
  onSelect: (id: string) => void;
  onZoom: () => void;
}) {
  if (!event || !role) {
    return (
      <section className="card detail" aria-label="Selected event" data-testid="event-detail">
        <h3>Selected event</h3>
        <p className="muted small">Hover a marker for a summary; click it (or a table row) to pin its details here.</p>
      </section>
    );
  }
  return (
    <section className="card detail" aria-label="Selected event" data-testid="event-detail" data-event-id={event.id}>
      <div className="card-head">
        <h3>
          <Glyph kind={event.kind} role={role} tone={tone ?? 'unknown'} /> {EVENT_KIND_LABEL[event.kind]} ·{' '}
          {event.symbol}
        </h3>
        <button type="button" className="btn-chip" onClick={onZoom}>
          Zoom here
        </button>
      </div>
      <dl className="detail-grid">
        <dt>Run</dt>
        <dd>
          <span className={`role-badge role-${role}`}>{role}</span> <span className="mono">{runId}</span>
        </dd>
        <dt>Time (ET)</dt>
        <dd data-testid="detail-time">{formatEt(event.t, event.timePrecision)}</dd>
        <dt>UTC instant</dt>
        <dd className="mono small">{formatUtc(event.t)}</dd>
        <dt>Precision</dt>
        <dd className="small">
          {PRECISION_LABEL[event.timePrecision]} — {event.timeMeaning}
        </dd>
        <dt>Price</dt>
        <dd data-testid="detail-price">
          {event.price === null ? (
            <>
              <b>not recorded</b>
              {markerPrice !== null && (
                <span className="muted"> (marker drawn at the market price {formatPrice(markerPrice)})</span>
              )}
            </>
          ) : (
            <>
              {formatPrice(event.price)} <span className="muted">({event.priceBasis})</span>
            </>
          )}
        </dd>
        <dt>Reason</dt>
        <dd>{event.reason ?? 'not recorded'}</dd>
        {event.tradeId && (
          <>
            <dt>Trade</dt>
            <dd>
              {event.tradeId}
              {event.linkedEventId && (
                <>
                  {' · '}
                  <button type="button" className="link" onClick={() => onSelect(event.linkedEventId!)}>
                    {event.kind === 'executed_entry' ? 'go to exit' : 'go to entry'}
                  </button>
                </>
              )}
              {event.meta.open === true && <span className="muted"> · open at the end of the run (no exit)</span>}
            </dd>
          </>
        )}
        <dt>Event ID</dt>
        <dd className="mono small">{event.id}</dd>
      </dl>
      <ValueTable values={event.values} caption="Values" />
      {event.kind === 'entry_signal' && (
        <p className="muted small">An entry signal is not a trade: no position, exit or P&amp;L is implied.</p>
      )}
    </section>
  );
}

type Summary = {
  count: number;
  nonOverlapping: number;
  returns: { sessions: number; complete: number; medianPercent: number | null; positiveShare: number | null }[];
  excursion: { complete: number; medianMfePercent: number | null; medianMaePercent: number | null };
  targets: { percent: number; known: number; reached: number; share: number | null; medianSessions: number | null }[];
};

export function AnalysisPanel({ runs, symbol }: { runs: { role: Role; run: RunDetail }[]; symbol: string }) {
  const sections = runs.filter((r) => r.run.metrics);
  return (
    <section className="card analysis" aria-label="Analysis" data-testid="analysis">
      <div className="card-head">
        <h3>Analysis · {symbol}</h3>
      </div>
      {sections.length === 0 && <p className="muted small">No metrics for this run yet.</p>}
      {sections.map(({ role, run }) => {
        const m = run.metrics as Record<string, unknown>;
        const per = (m.perSymbol as Record<string, Record<string, unknown>> | undefined)?.[symbol];
        if (m.kind === 'trading backtest') {
          return (
            <div key={role} className="analysis-block" data-testid={`analysis-trading-${role}`}>
              <h4>
                <span className={`role-badge role-${role}`}>{role}</span> {run.id} · trading backtest · {symbol}
              </h4>
              <p className="muted small">{String(m.disclaimer)}</p>
              {per ? (
                <TradingMetrics m={per as unknown as TradingSymbolMetrics} symbol={symbol} />
              ) : (
                <p className="muted small">
                  {run.id} has no results for {symbol}.
                </p>
              )}
            </div>
          );
        }
        if (m.kind === 'imported trades' || m.kind === 'pool rerun') {
          const t = m.trades as Record<string, number>;
          const ps = per as { entries?: number; exits?: number; rejected?: number } | undefined;
          const rec = m.reconciliation as { applicable?: boolean; pass?: boolean; reason?: string } | undefined;
          return (
            <div key={role} className="analysis-block" data-testid={`analysis-pool-${role}`}>
              <h4>
                <span className={`role-badge role-${role}`}>{role}</span> {run.id} ·{' '}
                {m.kind === 'pool rerun' ? 'shared-slot pool rerun (one allocator replay)' : 'imported trades'}
              </h4>
              {m.kind === 'pool rerun' && (
                <p className="muted small" data-testid="pool-reconciliation">
                  {String(m.semantics)} Sealed-record reconciliation:{' '}
                  {rec?.applicable ? (rec.pass ? 'PASS (totals and trade by trade)' : 'FAILED') : `not applicable — ${rec?.reason ?? ''}`}
                  .
                </p>
              )}
              <p className="muted small">
                {String(m.source)}. {String(m.disclaimer)}
              </p>
              <table className="metrics-table">
                <tbody>
                  <tr>
                    <th>Net (realised + marked unrealised), whole pool</th>
                    <td>{formatUsd(t.net)}</td>
                  </tr>
                  <tr>
                    <th>Realised / unrealised</th>
                    <td>
                      {formatUsd(t.realized)} / {formatUsd(t.unrealized)}
                    </td>
                  </tr>
                  <tr>
                    <th>Interest · friction</th>
                    <td>
                      {formatUsd(t.interest)} · {formatUsd(t.friction)}
                    </td>
                  </tr>
                  <tr>
                    <th>Lots (open) · refused signals, all symbols</th>
                    <td>
                      {t.lots} ({t.openLots}) · {t.refusedSignals}
                    </td>
                  </tr>
                  <tr>
                    <th>{symbol}: entries · exits · rejected</th>
                    <td data-testid="analysis-symbol-counts">
                      {ps ? `${ps.entries} · ${ps.exits} · ${ps.rejected}` : 'none'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        }
        if (m.kind !== 'entry-signal outcomes')
          return (
            <p key={role} className="muted small">
              {run.id}: no analysis view for metrics of kind “{String(m.kind)}” (see Parameters and the export bundle).
            </p>
          );
        if (!per)
          return (
            <p key={role} className="muted small">
              {run.id} has no results for {symbol}.
            </p>
          );
        const o = per.outcomes as Summary;
        const b = per.baseline as Summary;
        const row = (label: string, a: string, c: string) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{a}</td>
            <td className="baseline">{c}</td>
          </tr>
        );
        return (
          <div key={role} className="analysis-block">
            <h4>
              <span className={`role-badge role-${role}`}>{role}</span> {run.id} · entry signals vs every session
            </h4>
            <p className="muted small">
              {String(m.disclaimer)} Censored values (window too short) are excluded, never counted as zero.
            </p>
            <table className="metrics-table" data-testid={`metrics-${role}`}>
              <thead>
                <tr>
                  <th />
                  <th>Signals</th>
                  <th className="baseline">Baseline</th>
                </tr>
              </thead>
              <tbody>
                {row(
                  'Count (non-overlapping 63s)',
                  `${o.count} (${o.nonOverlapping})`,
                  `${b.count} (${b.nonOverlapping})`
                )}
                {o.returns.map((r, j) =>
                  row(
                    `Median return after ${r.sessions} sessions (n)`,
                    `${formatPercent(r.medianPercent)} (${r.complete})`,
                    `${formatPercent(b.returns[j]?.medianPercent)} (${b.returns[j]?.complete})`
                  )
                )}
                {o.returns.map((r, j) =>
                  row(
                    `Positive after ${r.sessions} sessions`,
                    formatShare(r.positiveShare),
                    formatShare(b.returns[j]?.positiveShare)
                  )
                )}
                {row(
                  'Median MFE / MAE over 63 sessions',
                  `${formatPercent(o.excursion.medianMfePercent)} / ${formatPercent(o.excursion.medianMaePercent)}`,
                  `${formatPercent(b.excursion.medianMfePercent)} / ${formatPercent(b.excursion.medianMaePercent)}`
                )}
                {o.targets.map((t, j) =>
                  row(
                    `Reached +${t.percent}% within 63 (median sessions)`,
                    `${formatShare(t.share)} of ${t.known}${t.medianSessions !== null ? ` (${t.medianSessions})` : ''}`,
                    `${formatShare(b.targets[j]?.share)} of ${b.targets[j]?.known}`
                  )
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </section>
  );
}
