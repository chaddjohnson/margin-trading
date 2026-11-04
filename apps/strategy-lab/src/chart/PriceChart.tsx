// The price chart. Lifecycle: one Dygraph per dataset — created when the model arrives, destroyed on unmount. Every
// later change (variation, comparison, filters, selection) only replaces the annotations with setAnnotations(), which
// leaves the zoom/pan window alone. The window changes only through the user's own zoom gestures, the range selector
// or an explicit command from the imperative handle.

import Dygraph, { type dygraphs } from 'dygraphs';
import 'dygraphs/dist/dygraph.css';
import { type KeyboardEvent, type Ref, useEffect, useImperativeHandle, useRef } from 'react';

import type { ExplorerModel } from '../data/model.ts';
import { formatPrice, xToDate } from '../format.ts';
import type { Cluster } from '../state/selectors.ts';
import { type ClusterAnnotation, PRICE_COLOR, toAnnotations } from './markers.ts';

export interface ChartHandle {
  /** Shows [from, to] (clamped to the data); null shows everything. */
  setWindow(range: readonly [number, number] | null): void;
  /** Pans so that x is centred, keeping the current span. */
  centerOn(x: number): void;
  /** Shows a window of `span` ms centred on x. */
  zoomAround(x: number, span: number): void;
  getWindow(): [number, number] | null;
  getExtremes(): [number, number] | null;
}

export interface ChartView {
  range: [number, number];
  isFull: boolean;
}

interface Props {
  model: ExplorerModel;
  clusters: readonly Cluster[];
  selectedEventId: string | null;
  /** Accessible label per cluster x (used for the focusable markers). */
  describeCluster: (c: Cluster) => string;
  onViewChange: (view: ChartView) => void;
  /** `xs`: the clicked marker's bar first, then every other marker whose box overlaps it on screen. */
  onActivateCluster: (xs: number[]) => void;
  onHoverCluster: (xs: number[] | null, anchor: DOMRect | null) => void;
  ref?: Ref<ChartHandle>;
}

const SERIES = 'Close';
let instanceCounter = 0;

function clampWindow(g: Dygraph, from: number, to: number): [number, number] {
  const [lo, hi] = g.xAxisExtremes();
  const span = Math.min(to - from, hi - lo);
  const start = Math.max(lo, Math.min(from, hi - span));
  return [start, start + span];
}

/**
 * The bars of every marker drawn under (overlapping) the given marker, the marker's own bar first. Neighbouring
 * sessions' markers overlap when zoomed out; each stays on its own bar, and this list makes all of them reachable.
 */
function overlapping(marker: HTMLElement): number[] {
  const own = Number(marker.dataset.x);
  const r = marker.getBoundingClientRect();
  const host = marker.parentElement;
  const xs = [own];
  host?.querySelectorAll<HTMLElement>('.see-marker').forEach((m) => {
    if (m === marker || !m.dataset.x) return;
    const o = m.getBoundingClientRect();
    if (o.left < r.right && o.right > r.left && o.top < r.bottom && o.bottom > r.top) xs.push(Number(m.dataset.x));
  });
  return [own, ...xs.slice(1).sort((a, b) => a - b)];
}

function markerX(el: Element | null): number | null {
  const m = el instanceof HTMLElement ? el.closest<HTMLElement>('.see-marker') : null;
  return m?.dataset.x ? Number(m.dataset.x) : null;
}

export function PriceChart(props: Props) {
  const { model, clusters, selectedEventId, ref } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Dygraph | null>(null);
  const propsRef = useRef(props);
  const labelsRef = useRef(new Map<number, { label: string; ids: string }>());
  const selectedXRef = useRef<number | null>(null);
  const restoreFocusRef = useRef<number | null>(null);

  useEffect(() => {
    propsRef.current = props;
  });

  // Create the graph once per dataset.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const bars = model.dataset.priceSeries.bars;
    const data = model.barTimes.map((t, i) => [new Date(t), model.closes[i] as number]);
    let frame = 0;
    let resizeFrame = 0;
    let lastKey = '';

    const decorate = () => {
      host.querySelectorAll<HTMLElement>('.see-marker').forEach((div) => {
        const m = /see-x-(\d+)/.exec(div.className);
        if (!m) return;
        const x = Number(m[1]);
        const info = labelsRef.current.get(x);
        div.dataset.x = String(x);
        div.dataset.eventIds = info?.ids ?? '';
        div.setAttribute('role', 'button');
        div.setAttribute('aria-label', info?.label ?? 'Entry events');
        div.removeAttribute('title');
        div.tabIndex = 0;
        const img = div.querySelector('img');
        if (img) {
          img.alt = '';
          img.draggable = false;
        }
        if (restoreFocusRef.current === x) {
          restoreFocusRef.current = null;
          div.focus({ preventScroll: true });
        }
      });
      host.dataset.markerCount = String(host.querySelectorAll('.see-marker').length);
    };

    const options: dygraphs.Options = {
      labels: ['Session', SERIES],
      colors: [PRICE_COLOR],
      strokeWidth: 1.6,
      labelsUTC: true,
      legend: 'never',
      showRangeSelector: true,
      rangeSelectorHeight: 46,
      rangeSelectorPlotStrokeColor: PRICE_COLOR,
      rangeSelectorPlotFillColor: 'rgba(57, 135, 229, 0.28)',
      rangeSelectorPlotFillGradientColor: 'rgba(57, 135, 229, 0.04)',
      rangeSelectorBackgroundStrokeColor: '#2b3a55',
      rangeSelectorForegroundStrokeColor: '#8da2c0',
      rangeSelectorAlpha: 0.55,
      gridLineColor: 'rgba(148, 163, 184, 0.12)',
      axisLineColor: '#2b3a55',
      axisLabelFontSize: 12,
      xRangePad: 10,
      yRangePad: 14,
      highlightCircleSize: 4,
      rightGap: 12,
      axes: {
        x: { valueFormatter: (ms: number) => xToDate(ms), axisLabelWidth: 64 },
        y: {
          axisLabelWidth: 54,
          valueFormatter: (v: number) => formatPrice(v),
          axisLabelFormatter: (v: number | Date) => (typeof v === 'number' ? v.toFixed(0) : String(v))
        }
      },
      highlightCallback: (_e, _x, _points, row) => {
        const bar = bars[row];
        if (readoutRef.current && bar)
          readoutRef.current.textContent = `${bar.d} · close ${formatPrice(bar.c)} (synthetic)`;
      },
      unhighlightCallback: () => {
        if (readoutRef.current) readoutRef.current.textContent = '';
      },
      underlayCallback: (ctx, area, g) => {
        const x = selectedXRef.current;
        if (x === null) return;
        const px = Math.round(g.toDomXCoord(x)) + 0.5;
        if (px < area.x || px > area.x + area.w) return;
        ctx.save();
        ctx.fillStyle = 'rgba(226, 232, 240, 0.07)';
        ctx.fillRect(px - 4, area.y, 8, area.h);
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(px, area.y);
        ctx.lineTo(px, area.y + area.h);
        ctx.stroke();
        ctx.restore();
      },
      drawCallback: (g) => {
        decorate();
        const [from, to] = g.xAxisRange();
        host.dataset.viewFrom = xToDate(from);
        host.dataset.viewTo = xToDate(to);
        // Report the window after Dygraphs has finished drawing (never set React state mid-draw).
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const key = `${from}|${to}`;
          if (key === lastKey) return;
          lastKey = key;
          propsRef.current.onViewChange({ range: [from, to], isFull: !g.isZoomed('x') });
        });
      }
    };

    const g = new Dygraph(host, data, options);
    graphRef.current = g;
    host.dataset.instance = String(++instanceCounter);
    host.dataset.pricePoints = String(data.length);

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => g.resize());
    });
    ro.observe(host);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      ro.disconnect();
      g.destroy();
      graphRef.current = null;
    };
  }, [model]);

  // Replace the markers whenever what is drawn (or selected) changes. The window is untouched.
  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    selectedXRef.current = selectedEventId ? (model.eventById.get(selectedEventId)?.x ?? null) : null;
    const labels = new Map<number, { label: string; ids: string }>();
    for (const c of clusters)
      labels.set(c.x, { label: propsRef.current.describeCluster(c), ids: c.items.map((d) => d.event.id).join(' ') });
    labelsRef.current = labels;

    const annotations = toAnnotations(clusters, SERIES, selectedEventId).map((a): ClusterAnnotation => ({
      ...a,
      clickHandler: (ann, _p, _g, e) => {
        const el = e.target instanceof HTMLElement ? e.target.closest<HTMLElement>('.see-marker') : null;
        propsRef.current.onActivateCluster(el ? overlapping(el) : [(ann as ClusterAnnotation).clusterX]);
      },
      mouseOverHandler: (ann, _p, _g, e) => {
        const el = e.target instanceof HTMLElement ? e.target.closest<HTMLElement>('.see-marker') : null;
        propsRef.current.onHoverCluster(
          el ? overlapping(el) : [(ann as ClusterAnnotation).clusterX],
          el?.getBoundingClientRect() ?? null
        );
      },
      mouseOutHandler: () => propsRef.current.onHoverCluster(null, null)
    }));
    g.ready(() => g.setAnnotations(annotations));
  }, [clusters, selectedEventId, model]);

  useImperativeHandle(
    ref,
    (): ChartHandle => ({
      setWindow(range) {
        const g = graphRef.current;
        if (!g) return;
        if (range === null) g.resetZoom();
        else g.updateOptions({ dateWindow: clampWindow(g, range[0], range[1]) });
      },
      centerOn(x) {
        const g = graphRef.current;
        if (!g) return;
        const [a, b] = g.xAxisRange();
        g.updateOptions({ dateWindow: clampWindow(g, x - (b - a) / 2, x + (b - a) / 2) });
      },
      zoomAround(x, span) {
        const g = graphRef.current;
        if (!g) return;
        g.updateOptions({ dateWindow: clampWindow(g, x - span / 2, x + span / 2) });
      },
      getWindow() {
        const g = graphRef.current;
        return g ? (g.xAxisRange() as [number, number]) : null;
      },
      getExtremes() {
        const g = graphRef.current;
        return g ? g.xAxisExtremes() : null;
      }
    }),
    []
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const x = markerX(e.target as Element);
    if (x === null) return;
    e.preventDefault();
    restoreFocusRef.current = x;
    props.onActivateCluster([x]);
  };

  return (
    <div className="chart-frame">
      <div
        ref={hostRef}
        className="chart-host"
        data-testid="price-chart"
        onKeyDown={onKeyDown}
        onFocus={(e) => {
          const x = markerX(e.target);
          if (x !== null) props.onHoverCluster([x], (e.target as HTMLElement).getBoundingClientRect());
        }}
        onBlur={(e) => {
          if (markerX(e.target) !== null) props.onHoverCluster(null, null);
        }}
      />
      <div ref={readoutRef} className="chart-readout" aria-live="off" />
    </div>
  );
}
