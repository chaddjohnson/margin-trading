import { type ReactNode, useMemo } from 'react';

import { DEFAULT_FORWARD, type ForwardSummary, baselineSummary, summarize } from '../analysis/forward.ts';
import type { ExplorerModel } from '../data/model.ts';
import { formatCount, formatFraction } from '../format.ts';
import type { EntryEventType } from '../schema/types.ts';
import type { Action, ExplorerState, Role } from '../state/explorer.ts';
import { activeVariations } from '../state/selectors.ts';
import { filterTypes } from './ChartPanel.tsx';
import { Swatch, TYPE_LABEL } from './Swatch.tsx';

interface Column {
  key: string;
  role: Role | null;
  type: EntryEventType | null;
  label: string;
  summary: ForwardSummary;
  first: string | null;
  last: string | null;
}

interface Props {
  model: ExplorerModel;
  state: ExplorerState;
  dispatch: (a: Action) => void;
  /** Bar index span of the chart's current window, or null when it holds no bar. */
  span: [number, number] | null;
}

const H = DEFAULT_FORWARD.horizon;

export function AnalysisPanel({ model, state, dispatch, span }: Props) {
  const { primaryId, compareId, visible, typeFilter, metricsScope } = state;
  const scopeSpan: [number, number] | null = metricsScope === 'all' ? [0, model.closes.length - 1] : span;
  const spanFrom = scopeSpan?.[0];
  const spanTo = scopeSpan?.[1];

  const columns = useMemo((): Column[] => {
    if (spanFrom === undefined || spanTo === undefined) return [];
    const [a, b] = [spanFrom, spanTo];
    const out: Column[] = [];
    for (const { role, vm } of activeVariations(model, { primaryId, compareId })) {
      if (!visible[role]) continue;
      for (const type of filterTypes(typeFilter)) {
        const evs = vm.events.filter((e) => e.type === type && e.barIndex >= a && e.barIndex <= b);
        out.push({
          key: `${role}-${type}`,
          role,
          type,
          label: `${role} · ${vm.variation.code} ${TYPE_LABEL[type].toLowerCase()}`,
          summary: summarize(evs, model.closes),
          first: evs[0]?.d ?? null,
          last: evs[evs.length - 1]?.d ?? null
        });
      }
    }
    const bars = model.dataset.priceSeries.bars;
    out.push({
      key: 'baseline',
      role: null,
      type: null,
      label: 'Baseline: every session',
      summary: baselineSummary(model.closes, a, b),
      first: bars[a]?.d ?? null,
      last: bars[b]?.d ?? null
    });
    return out;
  }, [model, primaryId, compareId, visible, typeFilter, spanFrom, spanTo]);

  const rows: { label: string; hint?: string; cell: (c: Column) => ReactNode }[] = [
    { label: 'Events in scope', cell: (c) => formatCount(c.summary.n) },
    { label: 'First event', cell: (c) => c.first ?? '—' },
    { label: 'Last event', cell: (c) => c.last ?? '—' },
    {
      label: `Full ${H}-session horizon`,
      hint: `Events without ${H} later sessions are censored: excluded from every rate below, never counted as misses.`,
      cell: (c) => (
        <>
          {formatCount(c.summary.complete)}
          {c.summary.censored ? <span className="sub">{c.summary.censored} censored</span> : null}
        </>
      )
    },
    {
      label: 'Non-overlapping',
      hint: `Counted greedily, at least ${H} sessions apart: overlapping windows share the same moves, so n overstates the evidence.`,
      cell: (c) => formatCount(c.summary.nonOverlapping)
    },
    ...DEFAULT_FORWARD.targets.map((t, j) => ({
      label: `Reached +${t * 100}% within ${H}`,
      hint: `Share of complete events with a close at least ${t * 100}% above the entry price within ${H} sessions.`,
      cell: (c: Column) => {
        const rate = c.summary.hitRate[j];
        if (rate === null || rate === undefined) return '—';
        return (
          <>
            {formatFraction(rate, 1, false)}
            <span className="sub">
              {c.summary.hits[j]}/{c.summary.complete}
            </span>
          </>
        );
      }
    })),
    ...DEFAULT_FORWARD.targets.map((t, j) => ({
      label: `Median sessions to +${t * 100}%`,
      hint: 'Among the events that reached the target.',
      cell: (c: Column) => {
        const m = c.summary.medianSessionsToTarget[j];
        return m === null || m === undefined ? '—' : m.toFixed(m % 1 ? 1 : 0);
      }
    })),
    { label: `Median MFE (${H})`, cell: (c) => formatFraction(c.summary.medianMfe) },
    { label: `Median MAE (${H})`, cell: (c) => formatFraction(c.summary.medianMae) },
    {
      label: 'MAE, worst 10%',
      hint: '10th percentile of MAE: a tenth of the events dipped at least this far.',
      cell: (c) => formatFraction(c.summary.p10Mae)
    }
  ];

  return (
    <section className="card analysis-card" aria-label="Entry analysis" data-testid="analysis">
      <div className="card-head">
        <h2>
          Entry analysis <span className="demo-tag">DEMO</span>
        </h2>
        <div className="segmented small" role="radiogroup" aria-label="Analysis scope">
          {(['in-view', 'all'] as const).map((s) => (
            <label key={s} className={state.metricsScope === s ? 'is-on' : ''}>
              <input
                type="radio"
                name="metrics-scope"
                checked={state.metricsScope === s}
                onChange={() => dispatch({ type: 'setMetricsScope', scope: s })}
              />
              {s === 'in-view' ? 'Chart window' : 'All dates'}
            </label>
          ))}
        </div>
      </div>
      <p className="muted small analysis-note">
        Illustrative statistics computed in the browser from the <b>synthetic</b> closes — not VGT history and not
        strategy performance. Horizon {H} sessions after the event’s bar, close to close (intrabar highs and lows
        ignored); scope = events whose bar is in the {state.metricsScope === 'all' ? 'whole series' : 'chart window'}{' '}
        (later sessions may lie outside it).
      </p>
      <details className="definitions small">
        <summary>Definitions</summary>
        <ul>
          {rows
            .filter((r) => r.hint)
            .map((r) => (
              <li key={r.label}>
                <b>{r.label}:</b> {r.hint}
              </li>
            ))}
          <li>
            <b>MFE / MAE:</b> highest / lowest close within the horizon relative to the entry price.
          </li>
          <li>
            <b>Baseline:</b> the same statistics for an entry at the close of every session in scope (no timing rule).
          </li>
        </ul>
      </details>
      {columns.length <= 1 && (
        <p className="muted empty-state">No visible variation: the table shows only the baseline.</p>
      )}
      {scopeSpan ? (
        <div className="table-scroll">
          <table className="metrics-table" data-testid="metrics-table">
            <thead>
              <tr>
                <th scope="col">Statistic</th>
                {columns.map((c) => (
                  <th key={c.key} scope="col" data-column={c.key}>
                    {c.role && c.type ? <Swatch role={c.role} type={c.type} /> : null} {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row" title={r.hint}>
                    {r.label}
                    {r.hint && (
                      <span className="hint-dot" aria-hidden="true">
                        {' '}
                        ⓘ
                      </span>
                    )}
                  </th>
                  {columns.map((c) => (
                    <td key={c.key} data-column={c.key}>
                      {r.cell(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted empty-state">The chart window holds no bars.</p>
      )}
    </section>
  );
}
