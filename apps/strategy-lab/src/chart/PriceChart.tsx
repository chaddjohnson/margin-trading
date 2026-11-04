// The price chart (Dygraphs 2.2.2). One Dygraph per (run, symbol): created on mount, destroyed on unmount. Markers are
// an overlay of focusable buttons placed at each event's exact instant and price with Dygraphs' own coordinate
// transform (toDomCoords), so decimation or a change of data resolution never moves or drops a marker. A vertical
// crosshair follows the highlighted (nearest) data point, with Dygraphs' highlight dot on the line.
//
// Data: the run window's overview (decimated) is loaded first; when the user zooms in, the visible window is fetched
// at finer resolution and merged in, keeping the overview outside it so the range selector still shows everything.

import Dygraph, { type dygraphs } from 'dygraphs';
import 'dygraphs/dist/dygraph.css';
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react';

import type { LabEvent } from '../../shared/contract.ts';
import { EVENT_KIND_LABEL } from '../../shared/contract.ts';
import { etParts, formatEt, formatPrice } from '../format.ts';
import { etTicks } from './etTicker.ts';
import { MARKER_SIZE, PRICE_COLOR, type Role, glyphUri, markerOffset } from './markers.ts';

export interface ChartEvent {
  key: string; // `${role}:${event.id}`
  role: Role;
  runId: string;
  event: LabEvent;
  y: number | null; // plotted price: the event's price, or the market price at that instant when not recorded
}

export interface ChartHandle {
  setWindow(range: readonly [number, number] | null): void;
  centerOn(x: number): void;
  zoomAround(x: number, span: number): void;
  getWindow(): [number, number] | null;
}

interface Props {
  overview: [number, number][];
  overviewDecimated: boolean;
  synthetic: boolean;
  fetchDetail: (from: number, to: number, signal: AbortSignal) => Promise<[number, number][]>;
  events: readonly ChartEvent[];
  selectedKey: string | null;
  /** The window to open with, read once when the graph is created (null: everything). */
  initialWindow: () => [number, number] | null;
  onWindowChange: (w: [number, number], full: boolean) => void;
  onActivate: (keys: string[]) => void;
  onHover: (keys: string[] | null, anchor: DOMRect | null) => void;
  ref?: Ref<ChartHandle>;
}

const toRows = (pts: readonly [number, number][]) => pts.map(([t, v]) => [new Date(t), v]);

function clamp(g: Dygraph, a: number, b: number): [number, number] {
  const [lo, hi] = g.xAxisExtremes();
  const span = Math.min(b - a, hi - lo);
  const start = Math.max(lo, Math.min(a, hi - span));
  return [start, start + span];
}

export function PriceChart(props: Props) {
  const { overview, events, selectedKey, ref } = props;
  const frameRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Dygraph | null>(null);
  const propsRef = useRef(props);
  const eventsRef = useRef(events);
  const selectedRef = useRef(selectedKey);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    propsRef.current = props;
  });

  // Places (and creates/removes) the marker buttons for the current graph state; reuses buttons so focus survives.
  const placeMarkers = () => {
    const g = graphRef.current;
    const layer = layerRef.current;
    if (!g || !layer) return;
    const area = g.getArea();
    const [x0, x1] = g.xAxisRange();
    const [y0, y1] = g.yAxisRange();
    const seen = new Set<string>();
    const stack = new Map<string, number>();
    let visible = 0;
    for (const ce of eventsRef.current) {
      const t = Date.parse(ce.event.t);
      if (ce.y === null || t < x0 || t > x1 || ce.y < y0 || ce.y > y1) continue;
      const [px, py] = g.toDomCoords(t, ce.y);
      const stackKey = `${t}:${ce.event.kind === 'executed_exit' ? 'up' : 'down'}`;
      const idx = stack.get(stackKey) ?? 0;
      stack.set(stackKey, idx + 1);
      let b = buttons.current.get(ce.key);
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'marker';
        b.dataset.key = ce.key;
        b.dataset.eventId = ce.event.id;
        b.dataset.symbol = ce.event.symbol;
        b.dataset.kind = ce.event.kind;
        b.dataset.role = ce.role;
        b.dataset.runId = ce.runId;
        const img = document.createElement('img');
        img.src = glyphUri(ce.event.kind, ce.role);
        img.alt = '';
        img.width = MARKER_SIZE;
        img.height = MARKER_SIZE;
        b.appendChild(img);
        b.setAttribute(
          'aria-label',
          `${ce.role} ${ce.runId} ${EVENT_KIND_LABEL[ce.event.kind]} ${ce.event.symbol} ${formatEt(ce.event.t, ce.event.timePrecision)} at ${formatPrice(ce.event.price)}`
        );
        layer.appendChild(b);
        buttons.current.set(ce.key, b);
      }
      b.style.left = `${Math.round(px - MARKER_SIZE / 2)}px`;
      b.style.top = `${Math.round(py + markerOffset(ce.event.kind, idx))}px`;
      b.classList.toggle('is-selected', ce.key === selectedRef.current);
      b.hidden = px < area.x - 1 || px > area.x + area.w + 1;
      seen.add(ce.key);
      visible++;
    }
    for (const [key, b] of buttons.current)
      if (!seen.has(key)) {
        if (document.activeElement === b) b.blur();
        b.remove();
        buttons.current.delete(key);
      }
    layer.dataset.markerCount = String(visible);
  };

  const overlapping = (b: HTMLElement): string[] => {
    const r = b.getBoundingClientRect();
    const keys = [b.dataset.key!];
    for (const o of buttons.current.values()) {
      if (o === b || o.hidden) continue;
      const q = o.getBoundingClientRect();
      if (q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top) keys.push(o.dataset.key!);
    }
    return keys;
  };

  // Create the graph once per mount (the parent keys this component by run and symbol).
  useEffect(() => {
    const host = hostRef.current;
    const frame = frameRef.current;
    if (!host || !frame) return;
    let frameReq = 0;
    let resizeReq = 0;
    let detailTimer: ReturnType<typeof setTimeout> | undefined;
    let detailAbort: AbortController | null = null;
    let detailKey = '';
    let lastKey = '';
    const overviewSpan = overview.length ? overview.at(-1)![0] - overview[0]![0] : 0;

    const maybeFetchDetail = (g: Dygraph, a: number, b: number) => {
      if (!propsRef.current.overviewDecimated) return;
      clearTimeout(detailTimer);
      const key = `${Math.round(a)}|${Math.round(b)}`;
      if (key === detailKey) return;
      detailTimer = setTimeout(() => {
        detailKey = key;
        detailAbort?.abort();
        if (b - a > overviewSpan * 0.6) {
          g.updateOptions({ file: toRows(overview) });
          return;
        }
        const ac = new AbortController();
        detailAbort = ac;
        propsRef.current
          .fetchDetail(a, b, ac.signal)
          .then((detail) => {
            if (ac.signal.aborted || graphRef.current !== g || detail.length === 0) return;
            const lo = detail[0]![0];
            const hi = detail.at(-1)![0];
            const merged = [...overview.filter(([t]) => t < lo), ...detail, ...overview.filter(([t]) => t > hi)];
            const w = g.xAxisRange();
            g.updateOptions({ file: toRows(merged), dateWindow: [w[0], w[1]] });
          })
          .catch(() => {});
      }, 250);
    };

    const opts: dygraphs.Options = {
      labels: ['Time', 'Price'],
      colors: [PRICE_COLOR],
      strokeWidth: 1.4,
      labelsUTC: false,
      legend: 'never',
      showRangeSelector: true,
      rangeSelectorHeight: 44,
      rangeSelectorPlotStrokeColor: PRICE_COLOR,
      rangeSelectorPlotFillColor: 'rgba(57, 135, 229, 0.28)',
      rangeSelectorPlotFillGradientColor: 'rgba(57, 135, 229, 0.04)',
      rangeSelectorBackgroundStrokeColor: '#2b3a55',
      rangeSelectorForegroundStrokeColor: '#8da2c0',
      rangeSelectorAlpha: 0.55,
      gridLineColor: 'rgba(148, 163, 184, 0.12)',
      axisLineColor: '#2b3a55',
      axisLabelFontSize: 12,
      xRangePad: 8,
      yRangePad: 18,
      highlightCircleSize: 4.5,
      rightGap: 14,
      connectSeparatedPoints: true,
      axes: {
        x: {
          valueFormatter: (ms: number) => formatEt(new Date(ms).toISOString()),
          ticker: (min: number, max: number, pixels: number) => etTicks(min, max, pixels),
          axisLabelWidth: 70
        },
        y: { axisLabelWidth: 58, valueFormatter: (v: number) => formatPrice(v) }
      },
      highlightCallback: (_e, x, points) => {
        const g = graphRef.current;
        const p = points[0] as (dygraphs.Point & { canvasx?: number }) | undefined;
        if (!g || !p || p.canvasx === undefined || !crossRef.current || !readoutRef.current) return;
        const area = g.getArea();
        const line = crossRef.current;
        line.style.left = `${Math.round(p.canvasx)}px`;
        line.style.top = `${area.y}px`;
        line.style.height = `${area.h}px`;
        line.hidden = false;
        const when = propsRef.current.synthetic
          ? `${etParts(x).date} (synthetic close)`
          : formatEt(new Date(x).toISOString());
        readoutRef.current.textContent = `${when} · ${formatPrice(p.yval)}`;
      },
      unhighlightCallback: () => {
        if (crossRef.current) crossRef.current.hidden = true;
        if (readoutRef.current) readoutRef.current.textContent = '';
      },
      drawCallback: (g) => {
        placeMarkers();
        const [a, b] = g.xAxisRange();
        frame.dataset.viewFrom = new Date(a).toISOString();
        frame.dataset.viewTo = new Date(b).toISOString();
        cancelAnimationFrame(frameReq);
        frameReq = requestAnimationFrame(() => {
          const key = `${a}|${b}`;
          if (key === lastKey) return;
          lastKey = key;
          propsRef.current.onWindowChange([a, b], !g.isZoomed('x'));
          maybeFetchDetail(g, a, b);
        });
      }
    };

    const g = new Dygraph(host, toRows(overview), opts);
    graphRef.current = g;
    frame.dataset.points = String(overview.length);
    const init = propsRef.current.initialWindow();
    if (init) {
      const [lo, hi] = g.xAxisExtremes();
      if (init[1] > lo && init[0] < hi)
        g.updateOptions({ dateWindow: clamp(g, Math.max(init[0], lo), Math.min(init[1], hi)) });
    }

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeReq);
      resizeReq = requestAnimationFrame(() => g.resize());
    });
    ro.observe(host);
    const markerMap = buttons.current;
    return () => {
      cancelAnimationFrame(frameReq);
      cancelAnimationFrame(resizeReq);
      clearTimeout(detailTimer);
      detailAbort?.abort();
      ro.disconnect();
      g.destroy();
      graphRef.current = null;
      for (const b of markerMap.values()) b.remove();
      markerMap.clear();
    };
    // The graph is created once per mount (the parent keys this component by run and symbol, so the overview of a
    // mount never changes); later data and window updates go through updateOptions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Events or selection changed: re-place markers without touching the window.
  useEffect(() => {
    eventsRef.current = events;
    selectedRef.current = selectedKey;
    placeMarkers();
  }, [events, selectedKey]);

  useImperativeHandle(
    ref,
    (): ChartHandle => ({
      setWindow(range) {
        const g = graphRef.current;
        if (!g) return;
        if (range === null) g.resetZoom();
        else g.updateOptions({ dateWindow: clamp(g, range[0], range[1]) });
      },
      centerOn(x) {
        const g = graphRef.current;
        if (!g) return;
        const [a, b] = g.xAxisRange();
        g.updateOptions({ dateWindow: clamp(g, x - (b - a) / 2, x + (b - a) / 2) });
      },
      zoomAround(x, span) {
        const g = graphRef.current;
        if (g) g.updateOptions({ dateWindow: clamp(g, x - span / 2, x + span / 2) });
      },
      getWindow() {
        const g = graphRef.current;
        return g ? (g.xAxisRange() as [number, number]) : null;
      }
    }),
    []
  );

  const target = (e: { target: EventTarget | null }) =>
    e.target instanceof HTMLElement ? e.target.closest<HTMLButtonElement>('button.marker') : null;

  return (
    <div className="chart-frame" ref={frameRef} data-testid="price-chart">
      <div ref={hostRef} className="chart-host" />
      <div
        ref={layerRef}
        className="marker-layer"
        data-testid="marker-layer"
        onClick={(e) => {
          const b = target(e);
          if (b) propsRef.current.onActivate(overlapping(b));
        }}
        onMouseOver={(e) => {
          const b = target(e);
          if (b) propsRef.current.onHover(overlapping(b), b.getBoundingClientRect());
        }}
        onMouseOut={(e) => {
          if (target(e)) propsRef.current.onHover(null, null);
        }}
        onFocus={(e) => {
          const b = target(e);
          if (b) propsRef.current.onHover([b.dataset.key!], b.getBoundingClientRect());
        }}
        onBlur={(e) => {
          if (target(e)) propsRef.current.onHover(null, null);
        }}
      >
        <div ref={crossRef} className="crosshair" data-testid="crosshair" hidden />
      </div>
      <div ref={readoutRef} className="chart-readout" data-testid="chart-readout" aria-live="off" />
    </div>
  );
}
