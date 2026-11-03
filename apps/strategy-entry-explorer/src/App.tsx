import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { ChartHandle, ChartView } from './chart/PriceChart.tsx';
import { AnalysisPanel } from './components/AnalysisPanel.tsx';
import { ChartPanel } from './components/ChartPanel.tsx';
import { EntriesTable } from './components/EntriesTable.tsx';
import { EventDetail } from './components/EventDetail.tsx';
import { DemoBanner, Header } from './components/Header.tsx';
import { MarkerTooltip } from './components/MarkerTooltip.tsx';
import { StatusBar } from './components/StatusBar.tsx';
import { TYPE_LABEL } from './components/Swatch.tsx';
import { VariationSidebar } from './components/VariationSidebar.tsx';
import type { ExplorerModel } from './data/model.ts';
import { type LoadResult, demoSource, loadDataset } from './data/source.ts';
import { createReducer, initialState, roleOf, typeIncluded } from './state/explorer.ts';
import {
  type Cluster,
  type XRange,
  barSpan,
  clusterEvents,
  displayEvents,
  inRange,
  roleCounts
} from './state/selectors.ts';

const DAY = 86_400_000;

export function App() {
  const [load, setLoad] = useState<LoadResult | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    loadDataset(demoSource, ac.signal).then((r) => {
      if (!ac.signal.aborted) setLoad(r);
    });
    return () => ac.abort();
  }, []);

  if (!load)
    return (
      <div className="splash" role="status">
        Loading the demo dataset…
      </div>
    );
  if (!load.ok)
    return (
      <div className="splash splash-error" role="alert">
        <h1>The dataset could not be displayed</h1>
        <p>It failed validation or could not be loaded. Nothing is shown rather than partial data.</p>
        <ul>
          {load.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  return <Explorer model={load.model} />;
}

function Explorer({ model }: { model: ExplorerModel }) {
  const reducer = useMemo(() => createReducer(model), [model]);
  const [state, dispatch] = useReducer(reducer, model, initialState);
  const [view, setView] = useState<ChartView | null>(null);
  const [hover, setHover] = useState<{ xs: number[]; anchor: DOMRect } | null>(null);
  const chartRef = useRef<ChartHandle>(null);

  const { primaryId, compareId, visible, typeFilter } = state;
  const spec = useMemo(
    () => ({ primaryId, compareId, visible, typeFilter }),
    [primaryId, compareId, visible, typeFilter]
  );
  const drawn = useMemo(() => displayEvents(model, spec), [model, spec]);
  const clusters = useMemo(() => clusterEvents(drawn), [drawn]);
  const clusterByX = useMemo(() => new Map(clusters.map((c) => [c.x, c])), [clusters]);
  const range: XRange = view && !view.isFull ? view.range : null;
  const counts = useMemo(() => roleCounts(model, spec, range), [model, spec, range]);
  const span = useMemo(() => barSpan(model, range), [model, range]);
  const drawnInView = useMemo(() => drawn.filter((d) => inRange(d.event.x, range)).length, [drawn, range]);

  const selected = state.selectedEventId ? (model.eventById.get(state.selectedEventId) ?? null) : null;
  const selectedRole = selected ? roleOf(state, selected) : null;
  const selectedCluster = selected ? (clusterByX.get(selected.x) ?? null) : null;
  const selectedIndex = selected ? drawn.findIndex((d) => d.event.id === selected.id) : -1;

  /** Selects an event; with `locate`, pans the chart (same span) when the event is outside the window. */
  const selectEvent = useCallback(
    (id: string, locate: boolean) => {
      const e = model.eventById.get(id);
      if (!e) return;
      // A linked event may be filtered out or hidden: reveal it explicitly rather than selecting something invisible.
      if (!typeIncluded(state.typeFilter, e.type)) dispatch({ type: 'setTypeFilter', filter: 'both' });
      const role = e.variationId === state.primaryId ? 'A' : e.variationId === state.compareId ? 'B' : null;
      if (role && !state.visible[role]) dispatch({ type: 'toggleVisible', role });
      dispatch({ type: 'selectEvent', id });
      if (!locate) return;
      const w = chartRef.current?.getWindow();
      if (w && (e.x < w[0] || e.x > w[1])) chartRef.current?.centerOn(e.x);
    },
    [model, state.typeFilter, state.primaryId, state.compareId, state.visible]
  );

  /**
   * A click selects the first event of the clicked marker; further clicks at the same spot step through every event
   * under the pointer — those stacked on that bar, then those of overlapping neighbouring markers.
   */
  const onActivateCluster = (xs: number[]) => {
    const items = xs.flatMap((x) => clusterByX.get(x)?.items ?? []);
    const i = items.findIndex((d) => d.event.id === state.selectedEventId);
    const next = items[(i + 1) % items.length];
    if (next) selectEvent(next.event.id, false);
  };

  const describeCluster = useCallback(
    (c: Cluster) => {
      const parts = c.items.map(
        (d) =>
          `${d.role} ${model.variationById.get(d.event.variationId)?.variation.code} ${TYPE_LABEL[d.event.type].toLowerCase()}`
      );
      const date = c.items[0]?.event.d ?? '';
      return `${c.items.length} entry event${c.items.length > 1 ? 's' : ''} on ${date}: ${parts.join(', ')}`;
    },
    [model]
  );

  const onHoverCluster = useCallback((xs: number[] | null, anchor: DOMRect | null) => {
    setHover(xs && xs.length > 0 && anchor ? { xs, anchor } : null);
  }, []);

  const hovered = hover ? hover.xs.flatMap((x) => clusterByX.get(x) ?? []) : [];

  return (
    <div className="app">
      <Header dataset={model.dataset} />
      <DemoBanner dataset={model.dataset} />
      <div className="layout">
        <VariationSidebar model={model} state={state} dispatch={dispatch} />
        <main className="main">
          <ChartPanel
            model={model}
            state={state}
            dispatch={dispatch}
            view={view}
            counts={counts}
            clusters={clusters}
            drawnInView={drawnInView}
            chartRef={chartRef}
            describeCluster={describeCluster}
            onViewChange={setView}
            onActivateCluster={onActivateCluster}
            onHoverCluster={onHoverCluster}
          />
          <EventDetail
            model={model}
            event={selected}
            role={selectedRole}
            cluster={selectedCluster}
            position={selectedIndex >= 0 ? { index: selectedIndex, total: drawn.length } : null}
            onSelect={selectEvent}
            onStep={(delta) => {
              const next = drawn[selectedIndex + delta];
              if (next) selectEvent(next.event.id, true);
            }}
            onCenter={() => selected && chartRef.current?.centerOn(selected.x)}
            onZoom={() => selected && chartRef.current?.zoomAround(selected.x, 183 * DAY)}
          />
          <div className="lower">
            <AnalysisPanel model={model} state={state} dispatch={dispatch} span={span} />
            <EntriesTable
              model={model}
              state={state}
              dispatch={dispatch}
              drawn={drawn}
              range={range}
              onSelect={selectEvent}
            />
          </div>
          <StatusBar model={model} />
        </main>
      </div>
      {hover && hovered.length > 0 && <MarkerTooltip model={model} clusters={hovered} anchor={hover.anchor} />}
    </div>
  );
}
