import { type FormEvent, type Ref, type RefObject, useState } from 'react';

import { type ChartHandle, type ChartView, PriceChart } from '../chart/PriceChart.tsx';
import type { ExplorerModel } from '../data/model.ts';
import { formatCount, xToDate } from '../format.ts';
import { sessionDateToUtcMidnight } from '../schema/time.ts';
import type { EntryEventType } from '../schema/types.ts';
import type { Action, ExplorerState, Role, TypeFilter } from '../state/explorer.ts';
import { type Cluster, type RoleCounts, activeVariations } from '../state/selectors.ts';
import { Swatch, TYPE_LABEL } from './Swatch.tsx';

const DAY = 86_400_000;
const PRESETS: { label: string; days: number }[] = [
  { label: '1M', days: 31 },
  { label: '3M', days: 92 },
  { label: '6M', days: 183 },
  { label: '1Y', days: 366 },
  { label: '3Y', days: 1096 },
  { label: '5Y', days: 1827 }
];

const FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'signals', label: 'Raw signals' },
  { value: 'executed', label: 'Executed' },
  { value: 'both', label: 'Both' }
];

export function filterTypes(filter: TypeFilter): EntryEventType[] {
  return filter === 'both' ? ['signal', 'executed'] : filter === 'signals' ? ['signal'] : ['executed'];
}

interface Props {
  model: ExplorerModel;
  state: ExplorerState;
  dispatch: (a: Action) => void;
  view: ChartView | null;
  counts: Partial<Record<Role, RoleCounts>>;
  clusters: readonly Cluster[];
  drawnInView: number;
  chartRef: RefObject<ChartHandle | null>;
  describeCluster: (c: Cluster) => string;
  onViewChange: (v: ChartView) => void;
  onActivateCluster: (xs: number[]) => void;
  onHoverCluster: (xs: number[] | null, anchor: DOMRect | null) => void;
}

export function ChartPanel(props: Props) {
  const { model, state, dispatch, view, counts, clusters, chartRef } = props;
  const roles = activeVariations(model, state);
  const types = filterTypes(state.typeFilter);
  const isFull = view?.isFull ?? true;
  const bars = model.dataset.priceSeries.bars;
  const firstDate = bars[0]?.d ?? '';
  const lastDate = bars[bars.length - 1]?.d ?? '';
  const totalDrawn = clusters.reduce((n, c) => n + c.items.length, 0);

  const viewFrom = view ? xToDate(Math.max(view.range[0], model.barTimes[0] ?? view.range[0])) : firstDate;
  const viewTo = view
    ? xToDate(Math.min(view.range[1], model.barTimes[model.barTimes.length - 1] ?? view.range[1]))
    : lastDate;
  const [draft, setDraft] = useState<{ from: string; to: string } | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const from = draft?.from ?? viewFrom;
  const to = draft?.to ?? viewTo;

  const applyRange = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from >= to) {
      setRangeError('Enter a start date before the end date.');
      return;
    }
    setRangeError(null);
    setDraft(null);
    chartRef.current?.setWindow([sessionDateToUtcMidnight(from), sessionDateToUtcMidnight(to) + DAY - 1]);
  };

  const zoomPreset = (days: number) => {
    const w = chartRef.current?.getWindow();
    if (!w) return;
    setDraft(null);
    chartRef.current?.zoomAround((w[0] + w[1]) / 2, days * DAY);
  };

  let empty: string | null = null;
  if (roles.every(({ role }) => !state.visible[role]))
    empty = 'All selected variations are hidden. Use “Show” in the legend.';
  else if (totalDrawn === 0) empty = 'The selected variation has no events of this type.';
  else if (props.drawnInView === 0)
    empty = `No markers in this window (${formatCount(totalDrawn)} drawn events lie outside it). Zoom out or move the window.`;

  return (
    <section className="card chart-card" aria-label="Price chart with entry events">
      <div className="chart-head">
        <div className="chart-title">
          <h2>Synthetic price with entry events</h2>
          <p className="muted small">
            Close of each synthetic session ({model.dataset.instrument.symbol} is an illustrative label). Markers sit on
            the close of the bar their event is aligned to.
          </p>
        </div>
        <fieldset className="segmented" data-testid="type-filter">
          <legend className="visually-hidden">Event types shown</legend>
          {FILTERS.map((f) => (
            <label key={f.value} className={state.typeFilter === f.value ? 'is-on' : ''}>
              <input
                type="radio"
                name="type-filter"
                value={f.value}
                checked={state.typeFilter === f.value}
                onChange={() => dispatch({ type: 'setTypeFilter', filter: f.value })}
              />
              {f.label}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="legend" data-testid="legend">
        <span className="legend-price">
          <span className="line-key" aria-hidden="true" /> Close (synthetic)
        </span>
        {roles.map(({ role, vm }) => {
          const c = counts[role];
          const visible = state.visible[role];
          return (
            <div key={role} className={`legend-group role-${role}${visible ? '' : ' is-hidden'}`} data-role={role}>
              <span className={`role-badge role-badge-${role.toLowerCase()}`}>{role}</span>
              <span className="legend-name">
                {vm.variation.code} · {vm.variation.name}
              </span>
              {types.map((t) => (
                <span key={t} className="legend-count" data-type={t}>
                  <Swatch role={role} type={t} />
                  {TYPE_LABEL[t]} <b data-testid={`count-${role}-${t}`}>{formatCount(c?.inView[t] ?? 0)}</b>
                  {!isFull && <span className="muted"> in view / {formatCount(c?.total[t] ?? 0)}</span>}
                </span>
              ))}
              <button
                type="button"
                className="btn-ghost"
                aria-pressed={!visible}
                onClick={() => dispatch({ type: 'toggleVisible', role })}
              >
                {visible ? 'Hide' : 'Show'}
              </button>
              {role === 'B' && (
                <>
                  <button type="button" className="btn-ghost" onClick={() => dispatch({ type: 'swap' })}>
                    Swap A/B
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => dispatch({ type: 'clearCompare' })}>
                    Remove B
                  </button>
                </>
              )}
            </div>
          );
        })}
        {!state.compareId && <span className="muted small legend-tip">Compare a second variation from the list.</span>}
      </div>

      <div className="chart-body">
        <PriceChart
          ref={chartRef as Ref<ChartHandle>}
          model={model}
          clusters={clusters}
          selectedEventId={state.selectedEventId}
          describeCluster={props.describeCluster}
          onViewChange={props.onViewChange}
          onActivateCluster={props.onActivateCluster}
          onHoverCluster={props.onHoverCluster}
        />
        {empty && (
          <div className="chart-empty" role="status" data-testid="chart-empty">
            {empty}
          </div>
        )}
      </div>

      <div className="chart-tools">
        <div className="zoom-presets" role="group" aria-label="Zoom (centred on the current view)">
          <span className="muted small">Zoom</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="btn-chip"
              onClick={() => zoomPreset(p.days)}
              title={`Show ${p.label} centred on the current view`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className={`btn-chip${isFull ? ' is-on' : ''}`}
            onClick={() => {
              setDraft(null);
              chartRef.current?.setWindow(null);
            }}
            data-testid="zoom-all"
          >
            All
          </button>
        </div>
        <form className="range-form" onSubmit={applyRange} data-testid="range-form">
          <label>
            <span className="muted small">From</span>
            <input
              type="date"
              min={firstDate}
              max={lastDate}
              value={from}
              onChange={(e) => setDraft({ from: e.target.value, to })}
              data-testid="range-from"
            />
          </label>
          <label>
            <span className="muted small">To</span>
            <input
              type="date"
              min={firstDate}
              max={lastDate}
              value={to}
              onChange={(e) => setDraft({ from, to: e.target.value })}
              data-testid="range-to"
            />
          </label>
          <button type="submit" className="btn-chip">
            Apply
          </button>
          {rangeError && (
            <span className="form-error" role="alert">
              {rangeError}
            </span>
          )}
        </form>
        <p className="muted small chart-hint">
          Drag to zoom · Shift-drag to pan · drag the overview handles · double-click resets
        </p>
      </div>
    </section>
  );
}
