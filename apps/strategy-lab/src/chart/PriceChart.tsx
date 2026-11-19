// The price chart (Dygraphs 2.2.2). One Dygraph per (run, symbol): created on mount, destroyed on unmount. Markers are
// an overlay of focusable buttons placed at each event's exact instant and price with Dygraphs' own coordinate
// transform (toDomCoords), so decimation or a change of data resolution never moves or drops a marker. A vertical
// crosshair follows the highlighted (nearest) data point, with Dygraphs' highlight dot on the line.
//
// Two chart types share this component, the interaction model and one real-time x axis (so a window carries over):
// - 'line' ("Line · intraday"): the run window's overview (decimated) is loaded first; when the user zooms in, the
//   visible window is fetched at finer resolution and merged in, keeping the overview outside it so the range selector
//   still shows everything.
// - 'candles' ("Candles · 1D"): one daily OHLC candle per NYSE session (shared/candles.ts, src/chart/candles.ts), all
//   loaded at once (a decade is ~2,700 rows). Four series (open, high, low, close) so Dygraphs' autoscaling covers the
//   highs and lows; one custom plotter draws every candle; the range selector shows the closes. Markers sit on their
//   session's candle at their recorded price (see candles.ts for the policy); drag-to-measure uses daily CLOSES.

import Dygraph, { type dygraphs } from 'dygraphs';
import 'dygraphs/dist/dygraph.css';
import { type Ref, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';

import type { CandlesResponse } from '../../shared/candles.ts';
import type { LabEvent } from '../../shared/contract.ts';
import { etParts, formatEt, formatPrice } from '../format.ts';
import {
  type MarkerSlot,
  MIN_SPAN_CANDLES,
  candleReadout,
  candleShape,
  candleTicks,
  candleWidths,
  drawCandle,
  fanOffset,
  formatCandleReadout,
  markerSlots,
  sessionIndex
} from './candles.ts';
import { etTicks } from './etTicker.ts';
import { type ChartLink, type Placement, placementOf } from './link.ts';
import { FRAMED_SIZE, type Frame, MARKER_SIZE, type MarkerTone, PRICE_COLOR, type Role, eventKindLabel, glyphUri, isPartialExit, markerOffset } from './markers.ts';
import { type MeasurePoint, type Measurement, formatChange, formatPercentChange, measure } from './measure.ts';
import { isMacPlatform, panModifierFor, panWindow, startsPan } from './pan.ts';
import { wheelZoomOutPx, wheelZoomWindow } from './wheelZoom.ts';

// Dygraphs' pan helpers and default touch handlers, reused by the custom interaction model.
interface DragContext {
  initializeMouseDown: (e: MouseEvent, g: Dygraph, c: DragContext) => void;
  isPanning: boolean;
  destroy: () => void;
}
const D = Dygraph as unknown as {
  defaultInteractionModel: Record<string, unknown>;
};
// The pan modifier of this platform: ⌘ on macOS, Ctrl elsewhere (Shift and Alt pan everywhere too).
const PAN_MODIFIER = panModifierFor(typeof navigator === 'undefined' ? false : isMacPlatform(navigator));
const DRAG_THRESHOLD_PX = 3;
// Wheel zoom stops at a window this narrow: 30 minutes of minute data, 20 sessions of the synthetic daily demo.
const MIN_SPAN_MINUTE_DATA = 30 * 60_000;
const MIN_SPAN_DAILY_DATA = 20 * 86_400_000;
const DAY = 86_400_000;

/** What the chart draws: the intraday line (minute closes + closing prints) or the daily OHLC candles. */
export type ChartData =
  | {
      mode: 'line';
      overview: [number, number][];
      overviewDecimated: boolean;
      fetchDetail: (from: number, to: number, signal: AbortSignal) => Promise<[number, number][]>;
    }
  | { mode: 'candles'; candles: CandlesResponse };

/** The part of a Dygraphs plotter call the candle plotter reads (the typings declare `plotter` as any). */
interface PlotterEvent {
  points: (dygraphs.Point & { canvasx: number })[];
  seriesIndex: number;
  drawingContext: CanvasRenderingContext2D;
  dygraph: Dygraph;
  plotArea: { x: number; y: number; w: number; h: number };
}

export interface ChartEvent {
  key: string; // `${role}:${event.id}`
  role: Role;
  runId: string;
  event: LabEvent;
  y: number | null; // plotted price: the event's price, or the market price at that instant when not recorded
  tone: MarkerTone; // the marker colour (trade outcome for executed entries/exits; see markers.ts)
  /** Pooled portfolios: the component frame (D1 square, Growth round) and the label's prefix instead of role and id. */
  frame?: Frame;
  labelPrefix?: string;
}

export interface ChartHandle {
  setWindow(range: readonly [number, number] | null): void;
  centerOn(x: number): void;
  zoomAround(x: number, span: number): void;
  getWindow(): [number, number] | null;
  /** Where an instant is drawn: itself on the line; on candles its New York session's candle (to locate a marker). */
  chartX(t: number): number;
}

interface Props {
  /** The data of this mount; the parent keys the component by run, symbol AND chart type, so it never changes. */
  data: ChartData;
  synthetic: boolean;
  events: readonly ChartEvent[];
  selectedKey: string | null;
  /** The window to open with, read once when the graph is created (null: everything). */
  initialWindow: () => [number, number] | null;
  onWindowChange: (w: [number, number], full: boolean) => void;
  onActivate: (keys: string[]) => void;
  /** Hovered (or focused) markers, the anchor for the tooltip, and where the hovered trade's counterpart lies. */
  onHover: (keys: string[] | null, anchor: DOMRect | null, placement?: Placement) => void;
  /** The counterpart of an executed entry/exit marker (tradeId + linkedEventId, resolved by the run view), or null. */
  linkOf?: (key: string) => ChartLink | null;
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
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { data, events, selectedKey, ref } = props;
  const candles = data.mode === 'candles' ? data.candles : null;
  // The same candles for the overlay helpers below, which read refs only (constant within a mount).
  const candlesRef = useRef(candles);
  // Candle mode: each candle's index by its New York date, and the session slot of each marker (per events list).
  const byDateRef = useRef<ReadonlyMap<string, number> | null>(null);
  const slotsRef = useRef<{ events: readonly ChartEvent[]; slots: Map<string, MarkerSlot> } | null>(null);
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
  // The hovered trade's connector: the hovered marker's key and its link, while the pointer (or focus) is on it.
  const linkRef = useRef<{ key: string; link: ChartLink } | null>(null);
  const linkSvgRef = useRef<SVGSVGElement>(null);
  const linkClipRef = useRef<SVGRectElement>(null);
  const linkLineRef = useRef<SVGLineElement>(null);
  const gestureRef = useRef(false); // a measure or pan drag is in progress: no hover linking
  // Drag-to-measure: the two snapped endpoints (in drag order) and the overlay elements.
  const measureRef = useRef<{ a: MeasurePoint; b: MeasurePoint } | null>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const lineARef = useRef<HTMLDivElement>(null);
  const lineBRef = useRef<HTMLDivElement>(null);
  const dotARef = useRef<HTMLDivElement>(null);
  const dotBRef = useRef<HTMLDivElement>(null);
  const densityRef = useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = useState<Measurement | null>(null);

  useEffect(() => {
    propsRef.current = props;
  });

  // The chart x of an instant: itself on the line; in candle mode the x of its New York session's candle (or itself
  // when that date has no candle). Used for trade connectors and "is the counterpart in view".
  const chartX = (t: number) => {
    const cd = candlesRef.current;
    if (!cd) return t;
    byDateRef.current ??= sessionIndex(cd.d);
    const i = byDateRef.current.get(etParts(t).date);
    return i === undefined ? t : cd.x[i]!;
  };
  const chartLink = (link: ChartLink | null): ChartLink | null =>
    link?.partner ? { ...link, partner: { ...link.partner, t: chartX(link.partner.t) } } : link;

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
    // Candle mode: each marker's session slot (candles.ts markerSlots), recomputed only when the events list changes;
    // the candle index by New York date is built once per mount (the candles never change in a mount).
    const cd = candlesRef.current;
    let slotOf: Map<string, MarkerSlot> | null = null;
    if (cd) {
      byDateRef.current ??= sessionIndex(cd.d);
      const evs = eventsRef.current;
      if (slotsRef.current?.events !== evs) slotsRef.current = { events: evs, slots: markerSlots(evs, byDateRef.current) };
      slotOf = slotsRef.current.slots;
    }
    const pxPerDay = (area.w * DAY) / (x1 - x0);
    let visible = 0;
    for (const ce of eventsRef.current) {
      const t = Date.parse(ce.event.t);
      // Candle mode: on its session's candle, fanned with the session's other markers; line mode: its exact instant.
      const slot = slotOf?.get(ce.key);
      const x = slot && slot.session !== null ? cd!.x[slot.session]! : t;
      if (ce.y === null || x < x0 || x > x1 || ce.y < y0 || ce.y > y1) continue;
      const [cx, py] = g.toDomCoords(x, ce.y);
      let idx = 0;
      let px = cx;
      if (slot && slot.session !== null) px += fanOffset(slot.rank, slot.count, pxPerDay);
      else {
        const stackKey = `${t}:${ce.event.kind === 'executed_exit' ? 'up' : 'down'}`;
        idx = stack.get(stackKey) ?? 0;
        stack.set(stackKey, idx + 1);
      }
      const size = ce.frame ? FRAMED_SIZE : MARKER_SIZE;
      let b = buttons.current.get(ce.key);
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'marker';
        b.dataset.key = ce.key;
        b.dataset.eventId = ce.event.id;
        b.dataset.symbol = ce.event.symbol;
        b.dataset.kind = ce.event.kind;
        b.dataset.t = ce.event.t; // the event's exact recorded instant (UTC), in both chart types
        if (isPartialExit(ce.event)) b.dataset.partial = 'true';
        b.dataset.role = ce.role;
        b.dataset.runId = ce.runId;
        if (ce.frame) b.dataset.frame = ce.frame;
        if (ce.frame) b.classList.add('is-framed');
        const img = document.createElement('img');
        img.alt = '';
        img.width = size;
        img.height = size;
        b.appendChild(img);
        b.setAttribute(
          'aria-label',
          `${ce.labelPrefix ?? `${ce.role} ${ce.runId}`} ${eventKindLabel(ce.event)} ${ce.event.symbol} ${formatEt(ce.event.t, ce.event.timePrecision)} at ${formatPrice(ce.event.price)}${slot && slot.session !== null ? ` (shown on the ${slot.date} daily candle)` : ''}`
        );
        layer.appendChild(b);
        buttons.current.set(ce.key, b);
      }
      if (slot) {
        b.dataset.session = slot.date;
        b.dataset.cluster = `${slot.rank + 1}/${slot.count}`;
        if (slot.session === null) b.dataset.offSession = 'true';
      }
      if (b.dataset.tone !== ce.tone) {
        b.dataset.tone = ce.tone;
        b.querySelector('img')!.src = glyphUri(ce.event.kind, ce.role, ce.tone, size, isPartialExit(ce.event), ce.frame ?? null);
      }
      b.style.left = `${Math.round(px - size / 2)}px`;
      b.style.top = `${Math.round(py + markerOffset(ce.event.kind, idx, size))}px`;
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

  // The centre of a marker button in layer pixels, or null when it is not placed or hidden.
  const centreOf = (key: string | null) => {
    const b = key ? buttons.current.get(key) : undefined;
    if (!b || b.hidden || !b.isConnected) return null;
    return [parseFloat(b.style.left) + MARKER_SIZE / 2, parseFloat(b.style.top) + MARKER_SIZE / 2] as const;
  };

  // Removes the connector and the temporary highlights (pointer left the marker, a drag started, data changed).
  const clearLink = () => {
    linkRef.current = null;
    for (const b of buttons.current.values()) b.classList.remove('is-linked');
    if (linkSvgRef.current) linkSvgRef.current.style.display = 'none';
    delete frameRef.current?.dataset.link;
  };

  // Draws the hovered trade's connector between the two markers as they sit now (after a zoom, a pan or a redraw):
  // clipped to the plot area, so a counterpart outside the view shows as a line running off the plot's edge.
  const placeLink = () => {
    const g = graphRef.current;
    const cur = linkRef.current;
    const svg = linkSvgRef.current;
    if (!g || !cur || !svg || !linkLineRef.current || !linkClipRef.current) return;
    const from = centreOf(cur.key);
    if (!from) return clearLink();
    buttons.current.get(cur.key)!.classList.add('is-linked');
    const { partner, partnerKey, tone } = cur.link;
    const frame = frameRef.current!;
    frame.dataset.link = `${tone}:${placementOf(chartLink(cur.link), g.xAxisRange() as [number, number])}`;
    if (!partner) {
      svg.style.display = 'none'; // an open position: only the entry is highlighted
      return;
    }
    const partnerButton = partnerKey ? buttons.current.get(partnerKey) : undefined;
    let to = centreOf(partnerKey);
    if (to) partnerButton!.classList.add('is-linked');
    else {
      const [px, py] = g.toDomCoords(chartX(partner.t), partner.y ?? g.toDataYCoord(from[1]));
      to = [px, py + markerOffset(partner.kind, 0) + MARKER_SIZE / 2];
    }
    const area = g.getArea();
    const clip = linkClipRef.current;
    clip.setAttribute('x', String(area.x));
    clip.setAttribute('y', String(area.y));
    clip.setAttribute('width', String(area.w));
    clip.setAttribute('height', String(area.h));
    const line = linkLineRef.current;
    line.setAttribute('x1', String(from[0]));
    line.setAttribute('y1', String(from[1]));
    line.setAttribute('x2', String(to[0]));
    line.setAttribute('y2', String(to[1]));
    svg.setAttribute('class', `trade-link tone-${tone}`);
    svg.style.display = '';
  };

  // Positions the measurement overlay for the current graph state (after a drag step, a zoom, a pan or a resize).
  const placeMeasure = () => {
    const g = graphRef.current;
    const m = measureRef.current;
    const els = [shadeRef.current, lineARef.current, lineBRef.current, dotARef.current, dotBRef.current];
    if (!g || !m || els.some((e) => !e)) {
      for (const e of els) if (e) e.hidden = true;
      return;
    }
    const [shade, lineA, lineB, dotA, dotB] = els as [
      HTMLDivElement,
      HTMLDivElement,
      HTMLDivElement,
      HTMLDivElement,
      HTMLDivElement
    ];
    const area = g.getArea();
    const dir = measure(m.a, m.b).direction;
    const [xa, ya] = g.toDomCoords(m.a.t, m.a.price);
    const [xb, yb] = g.toDomCoords(m.b.t, m.b.price);
    const inside = (x: number) => x >= area.x - 0.5 && x <= area.x + area.w + 0.5;
    const left = Math.max(area.x, Math.min(xa, xb));
    const right = Math.min(area.x + area.w, Math.max(xa, xb));
    Object.assign(shade.style, {
      left: `${left}px`,
      top: `${area.y}px`,
      width: `${Math.max(0, right - left)}px`,
      height: `${area.h}px`
    });
    shade.className = `measure-shade dir-${dir}`;
    shade.hidden = right <= left;
    for (const [line, x] of [
      [lineA, xa],
      [lineB, xb]
    ] as const) {
      Object.assign(line.style, { left: `${Math.round(x)}px`, top: `${area.y}px`, height: `${area.h}px` });
      line.hidden = !inside(x);
    }
    for (const [dot, x, y] of [
      [dotA, xa, ya],
      [dotB, xb, yb]
    ] as const) {
      Object.assign(dot.style, { left: `${x}px`, top: `${y}px` });
      dot.className = `measure-dot dir-${dir}`;
      dot.hidden = !inside(x);
    }
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

  // Create the graph once per mount (the parent keys this component by run, symbol and chart type).
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
    const line = data.mode === 'line' ? data : null;
    const overview = line?.overview ?? [];
    const overviewSpan = overview.length ? overview.at(-1)![0] - overview[0]![0] : 0;
    // Candle rows: [x, open, high, low, close] — four series, so the y axis autoscales to the highs and lows in view.
    const rows = candles
      ? candles.x.map((x, i) => [new Date(x), candles.o[i]!, candles.h[i]!, candles.l[i]!, candles.c[i]!])
      : toRows(overview);
    // The narrowest wheel-zoom window: 30 minutes of minute data, 20 sessions of the synthetic demo, a week of candles.
    const minSpan = candles ? MIN_SPAN_CANDLES : propsRef.current.synthetic ? MIN_SPAN_DAILY_DATA : MIN_SPAN_MINUTE_DATA;

    // Measurement updates: the overlay immediately, the read-out once per animation frame while dragging. Clearing
    // is synchronous for both (and drops a pending frame), so nothing of a measurement outlives the release.
    let measureFrame = 0;
    const setMeasure = (m: { a: MeasurePoint; b: MeasurePoint } | null) => {
      measureRef.current = m;
      placeMeasure();
      cancelAnimationFrame(measureFrame);
      if (m) measureFrame = requestAnimationFrame(() => setMeasurement(measure(m.a, m.b)));
      else setMeasurement(null);
    };
    // The gesture in progress (measure or pan): ending it removes its listeners and runs its end handler once.
    let endGesture: (() => void) | null = null;
    // Snap to the closest PLOTTED point: its time and its own price (never an interpolated screen position). On candles
    // that is the closest session and its daily CLOSE (column 4), so a measurement is close → close.
    const snap = (e: MouseEvent, g: Dygraph): MeasurePoint | null => {
      const [x] = g.eventToDomCoords(e);
      // findClosestRow is part of the Dygraphs API but missing from @types/dygraphs.
      const row = (g as Dygraph & { findClosestRow(domX: number): number }).findClosestRow(x);
      if (row === null || row === undefined || row < 0) return null;
      const t = g.getValue(row, 0);
      const price = g.getValue(row, candles ? 4 : 1);
      return t === null || price === null ? null : { t, price };
    };
    // Primary-button drag measures (no zoom, no pan) and the measurement exists ONLY while the button is held: the
    // release — on the chart or anywhere else — clears it, and so does every cancellation (Escape, the window losing
    // focus, a context menu, a move that reports the button no longer held because the release was missed, or the
    // chart unmounting). ⌘-drag (macOS) or Ctrl-drag (elsewhere), and Shift/Alt-drag, pan the time axis instead; the mode
    // is read at the mouse-down and locked until the release. Double-click resets the zoom; touch keeps the Dygraphs
    // defaults. Zoom is otherwise available through the wheel, the zoom buttons and the range selector.
    const interactionModel = {
      mousedown: (event: MouseEvent, g: Dygraph, context: DragContext) => {
        if (event.button !== 0) return;
        endGesture?.(); // a gesture whose release was never seen ends before a new one starts
        context.initializeMouseDown(event, g, context);
        const listen = (move: (e: MouseEvent) => void, up: (e: MouseEvent) => void) => {
          let last = event;
          const finish = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('contextmenu', finish);
            window.removeEventListener('blur', finish);
            endGesture = null;
            gestureRef.current = false;
            up(last);
            context.destroy();
          };
          const onMove = (e: MouseEvent) => {
            last = e;
            if ((e.buttons & 1) === 0) finish();
            else move(e);
          };
          const onUp = (e: MouseEvent) => {
            last = e;
            finish();
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
          document.addEventListener('contextmenu', finish);
          window.addEventListener('blur', finish);
          endGesture = finish;
          gestureRef.current = true;
          clearLink();
          propsRef.current.onHover(null, null);
        };
        if (startsPan(event, PAN_MODIFIER)) {
          // Pan: the window at the mouse-down moved by the pointer's horizontal travel (the content follows the
          // pointer), span unchanged, clamped to the data's extent; applied at most once per animation frame with
          // updateOptions, which redraws without re-initialising and keeps the range selector in step. No
          // measurement is drawn. Text selection is off for the whole drag (initializeMouseDown already prevented
          // the mouse-down's default; the class covers the pointer leaving the chart).
          const startWindow = g.xAxisRange() as [number, number];
          const x0 = event.clientX;
          const width = g.getArea().w;
          let x = x0;
          let panFrame = 0;
          const apply = () => {
            panFrame = 0;
            const next = panWindow(startWindow, x - x0, width, g.xAxisExtremes());
            const [a, b] = g.xAxisRange();
            if (next[0] !== a || next[1] !== b) g.updateOptions({ dateWindow: next });
          };
          document.documentElement.classList.add('chart-panning');
          frame.dataset.panning = 'true';
          listen(
            (e) => {
              x = e.clientX;
              if (!panFrame) panFrame = requestAnimationFrame(apply);
            },
            (e) => {
              cancelAnimationFrame(panFrame);
              x = e.clientX; // the last pointer position seen (release, last move, or the press itself)
              apply();
              document.documentElement.classList.remove('chart-panning');
              delete frame.dataset.panning;
            }
          );
          return;
        }
        const start = snap(event, g);
        const x0 = event.clientX;
        let moved = false;
        listen(
          (e) => {
            if (!start || (!moved && Math.abs(e.clientX - x0) < DRAG_THRESHOLD_PX)) return;
            moved = true;
            const end = snap(e, g);
            if (end) setMeasure({ a: start, b: end });
          },
          () => setMeasure(null) // released or cancelled: the whole measurement goes
        );
      },
      willDestroyContextMyself: true,
      dblclick: (_event: MouseEvent, g: Dygraph) => g.resetZoom(),
      // Wheel: zoom the time axis around the cursor (the y axis keeps its auto-scaling); swipe up zooms in, swipe down
      // out (the sign is decided once, in wheelZoomOutPx). The event is consumed only when the window actually
      // changes, so the page still scrolls at a zoom limit or over the axes.
      wheel: (event: WheelEvent, g: Dygraph) => {
        // From clientX, not eventToDomCoords: that uses offsetX, which is relative to a marker button when the event
        // comes from the marker layer. The graph's canvas sits at the host's top-left corner.
        const domX = event.clientX - host.getBoundingClientRect().left;
        const area = g.getArea();
        if (domX < area.x || domX > area.x + area.w) return;
        const next = wheelZoomWindow(
          g.xAxisRange() as [number, number],
          g.toDataXCoord(domX),
          wheelZoomOutPx(event, window.innerHeight),
          g.xAxisExtremes(),
          minSpan
        );
        if (!next) return;
        event.preventDefault();
        g.updateOptions({ dateWindow: next });
      },
      touchstart: D.defaultInteractionModel.touchstart,
      touchmove: D.defaultInteractionModel.touchmove,
      touchend: D.defaultInteractionModel.touchend
    };
    // Escape cancels a drag in progress (later moves of the same press no longer measure).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endGesture?.();
    };
    window.addEventListener('keydown', onKey);
    // Markers sit above the canvas: a wheel over one zooms like a wheel over the chart.
    const layer = layerRef.current;
    const onLayerWheel = (e: WheelEvent) => {
      const g = graphRef.current;
      if (g && e.target instanceof HTMLElement && e.target.closest('button.marker')) interactionModel.wheel(e, g);
    };
    layer?.addEventListener('wheel', onLayerWheel, { passive: false });

    // Line only: candles are all loaded at once, never fetched per window.
    const maybeFetchDetail = (g: Dygraph, a: number, b: number) => {
      const current = propsRef.current.data;
      if (current.mode !== 'line' || !current.overviewDecimated) return;
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
        current
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

    // Candles: Dygraphs calls the plotter once per series; the first (Open) draws every candle in view from the candle
    // data by row index, the other three draw nothing. Widths follow the zoom; too dense → thin low–high lines.
    const candlePlotter = (e: PlotterEvent) => {
      if (!candles || e.seriesIndex !== 0) return;
      const g = e.dygraph;
      const [x0, x1] = g.xAxisRange();
      const w = candleWidths((e.plotArea.w * DAY) / (x1 - x0));
      const y = (v: number) => g.toDomYCoord(v);
      let inView = 0;
      for (const p of e.points) {
        const i = p.idx;
        drawCandle(e.drawingContext, candleShape(p.canvasx, candles.o[i]!, candles.h[i]!, candles.l[i]!, candles.c[i]!, y, w));
        if ((p.xval ?? NaN) >= x0 && (p.xval ?? NaN) <= x1) inView++;
      }
      frame.dataset.candlesInView = String(inView);
      frame.dataset.candleBody = w.bodies ? String(w.body) : '0';
      frame.dataset.candleDensity = w.bodies ? 'bodies' : 'dense';
      const note = densityRef.current;
      if (note) {
        note.hidden = w.bodies;
        note.textContent = w.bodies
          ? ''
          : `${inView.toLocaleString('en-US')} sessions in view — too dense for candle bodies: each session is a thin low–high line in its colour (never merged with its neighbours). Zoom in to see the bodies.`;
      }
    };

    const opts: dygraphs.Options = {
      labels: candles ? ['Time', 'Open', 'High', 'Low', 'Close'] : ['Time', 'Price'],
      colors: candles ? [PRICE_COLOR, PRICE_COLOR, PRICE_COLOR, PRICE_COLOR] : [PRICE_COLOR],
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
      xRangePad: candles ? 24 : 8,
      yRangePad: 18,
      highlightCircleSize: 4.5,
      rightGap: 14,
      connectSeparatedPoints: true,
      interactionModel,
      ...(candles
        ? {
            plotter: candlePlotter,
            // the range selector (overview) shows the daily closes; no highlight dots on the candles
            series: { Close: { showInRangeSelector: true } },
            drawHighlightPointCallback: () => {}
          }
        : {}),
      axes: {
        x: {
          valueFormatter: (ms: number) => (candles ? etParts(ms).date : formatEt(new Date(ms).toISOString())),
          ticker: (min: number, max: number, pixels: number) =>
            candles ? candleTicks(min, max, pixels, candles.x, candles.d) : etTicks(min, max, pixels),
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
        if (candles) {
          // A candle: its New York session date and O/H/L/C, never a minute time.
          const c = candleReadout(candles, p.idx);
          const out = readoutRef.current;
          out.textContent = formatCandleReadout(c) + (c.notes.length ? ` · ${c.notes.join(' · ')}` : '');
          Object.assign(out.dataset, { date: c.date, dir: c.dir, o: c.o, h: c.h, l: c.l, c: c.c });
          return;
        }
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
        if (linkRef.current) placeLink(); // the connector follows a zoom, pan or resize while hovering
        placeMeasure();
        const [a, b] = g.xAxisRange();
        frame.dataset.viewFrom = new Date(a).toISOString();
        frame.dataset.viewTo = new Date(b).toISOString();
        // The y range and plot area as drawn (tests check that the axis covers the highs and lows in view).
        const [y0, y1] = g.yAxisRange();
        const area = g.getArea();
        frame.dataset.yMin = String(y0);
        frame.dataset.yMax = String(y1);
        frame.dataset.area = `${area.x},${area.y},${area.w},${area.h}`;
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

    const g = new Dygraph(host, rows, opts);
    graphRef.current = g;
    frame.dataset.points = String(rows.length);
    // The window to open with (the previous chart's, e.g. after a chart-type switch: both types share one time axis):
    // its overlap with the data, widened around its centre to this chart's minimum span (a week for candles).
    const init = propsRef.current.initialWindow();
    if (init) {
      const [lo, hi] = g.xAxisExtremes();
      if (init[1] > lo && init[0] < hi) {
        let a = Math.max(init[0], lo);
        let b = Math.min(init[1], hi);
        if (b - a < minSpan) {
          const mid = (a + b) / 2;
          a = mid - minSpan / 2;
          b = mid + minSpan / 2;
        }
        g.updateOptions({ dateWindow: clamp(g, a, b) });
      }
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
      endGesture?.();
      cancelAnimationFrame(measureFrame);
      window.removeEventListener('keydown', onKey);
      layer?.removeEventListener('wheel', onLayerWheel);
      g.destroy();
      graphRef.current = null;
      linkRef.current = null;
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
      },
      chartX(t) {
        return chartX(t);
      }
    }),
    []
  );

  // A measured point: a minute instant on the line; on candles a session's daily close (never a minute time).
  const when = (ms: number) =>
    candles
      ? `${etParts(ms).date} close`
      : props.synthetic
        ? `${etParts(ms).date} (synthetic)`
        : formatEt(new Date(ms).toISOString());

  const target = (e: { target: EventTarget | null }) =>
    e.target instanceof HTMLElement ? e.target.closest<HTMLButtonElement>('button.marker') : null;
  // Hovering a marker: the tooltip, and for an executed entry/exit its trade's connector and highlights (drawn on the
  // layer directly: no React state of the chart, no Dygraphs redraw).
  const hover = (b: HTMLButtonElement, keys: string[]) => {
    clearLink();
    const key = b.dataset.key!;
    const link = propsRef.current.linkOf?.(key) ?? null;
    const g = graphRef.current;
    if (link) {
      linkRef.current = { key, link };
      placeLink();
    }
    propsRef.current.onHover(
      keys,
      b.getBoundingClientRect(),
      g ? placementOf(chartLink(link), g.xAxisRange() as [number, number]) : 'none'
    );
  };
  const unhover = () => {
    clearLink();
    propsRef.current.onHover(null, null);
  };

  return (
    <div className="chart-frame" ref={frameRef} data-testid="price-chart" data-chart-mode={data.mode}>
      <div
        className={`measure-bar${measurement ? ` dir-${measurement.direction}` : ''}`}
        data-testid="measure-bar"
        aria-live="polite"
        data-basis={candles ? 'daily-close' : props.synthetic ? 'synthetic-close' : 'minute'}
        data-start-ms={measurement?.start.t}
        data-end-ms={measurement?.end.t}
        data-start-price={measurement?.start.price}
        data-end-price={measurement?.end.price}
      >
        {measurement ? (
          <>
            {candles && (
              <span className="measure-kind" data-testid="measure-kind">
                Daily close → daily close
              </span>
            )}
            <span className="measure-range" data-testid="measure-range">
              {when(measurement.start.t)} → {when(measurement.end.t)}
            </span>
            <span className="measure-prices">
              {formatPrice(measurement.start.price)} → {formatPrice(measurement.end.price)}
            </span>
            <b className="measure-change" data-testid="measure-change">
              {formatChange(measurement.change)}
            </b>
            <b className="measure-percent" data-testid="measure-percent">
              {formatPercentChange(measurement.percent)}
            </b>
            <span className="muted small">release to clear · Esc cancels</span>
          </>
        ) : (
          <span className="muted small">
            {candles
              ? 'Hold the mouse button and drag across the candles to measure the change from one session’s daily CLOSE to another’s (earlier → later); it clears when you release.'
              : 'Hold the mouse button and drag across the chart to measure a price change (earlier → later point); it clears when you release.'}{' '}
            {PAN_MODIFIER === 'meta' ? '⌘' : 'Ctrl'}-drag pans.
          </span>
        )}
      </div>
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
          if (b && !gestureRef.current) hover(b, overlapping(b));
        }}
        onMouseOut={(e) => {
          if (target(e)) unhover();
        }}
        onFocus={(e) => {
          const b = target(e);
          if (b) hover(b, [b.dataset.key!]);
        }}
        onBlur={(e) => {
          if (target(e)) unhover();
        }}
      >
        <div ref={crossRef} className="crosshair" data-testid="crosshair" hidden />
        <div ref={shadeRef} className="measure-shade" data-testid="measure-shade" hidden />
        <div ref={lineARef} className="measure-line" data-testid="measure-line" hidden />
        <div ref={lineBRef} className="measure-line" data-testid="measure-line" hidden />
        <div ref={dotARef} className="measure-dot" data-testid="measure-dot" hidden />
        <div ref={dotBRef} className="measure-dot" data-testid="measure-dot" hidden />
        <svg
          ref={linkSvgRef}
          className="trade-link"
          data-testid="trade-link"
          style={{ display: 'none' }}
          aria-hidden="true"
        >
          <defs>
            <clipPath id={clipId}>
              <rect ref={linkClipRef} />
            </clipPath>
          </defs>
          <line ref={linkLineRef} clipPath={`url(#${clipId})`} />
        </svg>
      </div>
      <div ref={readoutRef} className="chart-readout" data-testid="chart-readout" aria-live="off" />
      {candles && <div ref={densityRef} className="candle-density" data-testid="candle-density" role="note" hidden />}
    </div>
  );
}
