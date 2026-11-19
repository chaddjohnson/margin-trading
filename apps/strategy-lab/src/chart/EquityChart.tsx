// The portfolio-level view of a pooled candidate (Priority 6): the ONE shared pool's marked net at each NYSE session
// close, and below it the drawdown from the running MINUTE peak (each session's deepest minute mark), so the deepest
// point of the lower panel is the replay's maximum minute drawdown even though the panel has one point per session.
// The validation period (after the 2024-12-31 close) is shaded; the run is continuous across it. Read-only: the
// viewport follows the page's period buttons and the price chart, it never changes the account.

import Dygraph, { type dygraphs } from 'dygraphs';
import 'dygraphs/dist/dygraph.css';
import { useEffect, useRef } from 'react';

import type { PortfolioEquity } from '../../shared/portfolio.ts';
import { etParts, formatUsd } from '../format.ts';
import { etTicks } from './etTicker.ts';

const MARKED = '#3987e5';
const DD = '#f07070';

export function EquityChart({
  equity,
  window,
  boundaryMs
}: {
  equity: PortfolioEquity;
  /** The viewport (ms) or null for the whole run. */
  window: readonly [number, number] | null;
  boundaryMs: number | null;
}) {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const graphs = useRef<Dygraph[]>([]);
  const windowRef = useRef(window);
  useEffect(() => {
    windowRef.current = window;
  });

  useEffect(() => {
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!top || !bottom) return;
    const marked = equity.closeMs.map((x, i) => [new Date(x), equity.marked[i]!] as [Date, number]);
    const dd = equity.closeMs.map((x, i) => [new Date(x), -equity.drawdown[i]!] as [Date, number]);
    const shade = (canvas: CanvasRenderingContext2D, area: { x: number; y: number; w: number; h: number }, g: Dygraph) => {
      if (boundaryMs === null) return;
      const [x0] = g.toDomCoords(boundaryMs, 0);
      const right = area.x + area.w;
      if (x0 < right) {
        canvas.fillStyle = 'rgba(148, 163, 184, 0.10)';
        canvas.fillRect(Math.max(area.x, x0), area.y, right - Math.max(area.x, x0), area.h);
      }
      if (x0 >= area.x && x0 <= right) {
        canvas.strokeStyle = 'rgba(226, 232, 240, 0.55)';
        canvas.setLineDash([4, 3]);
        canvas.beginPath();
        canvas.moveTo(x0 + 0.5, area.y);
        canvas.lineTo(x0 + 0.5, area.y + area.h);
        canvas.stroke();
        canvas.setLineDash([]);
      }
    };
    const readout = (x: number) => {
      const i = equity.closeMs.findIndex((t) => t >= x);
      const k = i < 0 ? equity.closeMs.length - 1 : i;
      if (readoutRef.current)
        readoutRef.current.textContent = `${equity.dates[k]} close · marked net ${formatUsd(equity.marked[k])} · realized ${formatUsd(equity.realized[k])} · deepest minute drawdown that session ${formatUsd(equity.drawdown[k])}`;
    };
    const common = {
      axes: {
        x: {
          axisLabelFormatter: (d: number | Date) => etParts(+d).date,
          ticker: (min: number, max: number, pixels: number) => etTicks(min, max, pixels),
          axisLabelWidth: 70
        },
        y: { axisLabelWidth: 64, valueFormatter: (v: number) => formatUsd(v) }
      },
      legend: 'never' as const,
      interactionModel: {},
      highlightCallback: (_e: MouseEvent, x: number) => readout(x),
      unhighlightCallback: () => {
        if (readoutRef.current) readoutRef.current.textContent = '';
      },
      underlayCallback: shade,
      dateWindow: windowRef.current ? [windowRef.current[0], windowRef.current[1]] : undefined
    };
    const g1 = new Dygraph(top, marked, {
      ...common,
      labels: ['Date', 'Marked net'],
      axes: { ...common.axes, y: { ...common.axes.y, axisLabelFormatter: (v: number | Date) => `$${Math.round(Number(v) / 1000)}k` } },
      colors: [MARKED],
      fillGraph: true,
      fillAlpha: 0.12,
      strokeWidth: 1.4,
      height: 150
    } as unknown as dygraphs.Options);
    const g2 = new Dygraph(bottom, dd, {
      ...common,
      labels: ['Date', 'Drawdown'],
      colors: [DD],
      fillGraph: true,
      fillAlpha: 0.3,
      strokeWidth: 1,
      height: 90,
      axes: { ...common.axes, y: { ...common.axes.y, valueFormatter: (v: number) => formatUsd(-v), axisLabelFormatter: (v: number | Date) => formatUsd(-Number(v)) } }
    } as unknown as dygraphs.Options);
    graphs.current = [g1, g2];
    const ro = new ResizeObserver(() => {
      g1.resize();
      g2.resize();
    });
    ro.observe(top);
    return () => {
      ro.disconnect();
      g1.destroy();
      g2.destroy();
      graphs.current = [];
    };
  }, [equity, boundaryMs]);

  useEffect(() => {
    const first = equity.closeMs[0];
    const last = equity.closeMs.at(-1);
    if (first === undefined || last === undefined) return;
    for (const g of graphs.current) g.updateOptions({ dateWindow: window ? [window[0], window[1]] : [first - 86_400_000, last] });
  }, [window, equity]);

  return (
    <div className="equity-chart" data-testid="equity-chart">
      <div className="equity-panel-label small muted">Marked net of the ONE shared $100,000 pool (USD, at each session close)</div>
      <div ref={topRef} className="equity-graph" data-testid="equity-graph" />
      <div className="equity-panel-label small muted">
        Drawdown from the running minute peak (USD; each session’s deepest minute mark — its lowest point is the maximum
        minute drawdown)
      </div>
      <div ref={bottomRef} className="equity-graph dd" data-testid="drawdown-graph" />
      <div className="small muted equity-readout">
        <span ref={readoutRef} data-testid="equity-readout" />
      </div>
    </div>
  );
}
