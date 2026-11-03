import { useLayoutEffect, useRef, useState } from 'react';

import type { ExplorerModel } from '../data/model.ts';
import { formatClock, formatPrice } from '../format.ts';
import type { Cluster } from '../state/selectors.ts';
import { Swatch, TYPE_LABEL } from './Swatch.tsx';

const MARGIN = 8;

const MAX_ITEMS = 6;

/**
 * Hover/focus card for a marker: every event of the hovered bar, then those of overlapping neighbouring markers.
 * Fixed-positioned and flipped/clamped so it never leaves the viewport.
 */
export function MarkerTooltip({
  model,
  clusters,
  anchor
}: {
  model: ExplorerModel;
  clusters: Cluster[];
  anchor: DOMRect;
}) {
  const items = clusters.flatMap((c) => c.items);
  const shown = items.slice(0, MAX_ITEMS);
  const bars = clusters.length;
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchor.right + 12;
    if (left + width > vw - MARGIN) left = anchor.left - 12 - width;
    left = Math.max(MARGIN, Math.min(left, vw - MARGIN - width));
    let top = anchor.top - 8;
    if (top + height > vh - MARGIN) top = vh - MARGIN - height;
    top = Math.max(MARGIN, top);
    setPos({ left, top });
  }, [anchor, clusters]);

  return (
    <div
      ref={ref}
      className="marker-tooltip"
      role="tooltip"
      data-testid="marker-tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0, visibility: 'hidden' }}
    >
      {bars > 1 && (
        <div className="tt-overlap">
          {items.length} events on {bars} neighbouring sessions overlap here — zoom in to separate them.
        </div>
      )}
      {shown.map((d) => {
        const e = d.event;
        const v = model.variationById.get(e.variationId)?.variation;
        return (
          <div key={e.id} className="tt-item">
            <div className="tt-head">
              <Swatch role={d.role} type={e.type} />
              <b>{TYPE_LABEL[e.type]}</b>
              <span className="muted">
                {d.role} · {v?.code} {v?.name}
              </span>
            </div>
            <div className="tt-values">
              <span className="tt-strong">{formatPrice(e.price)}</span>
              <span>
                {e.d} · {formatClock(Date.parse(e.t), model.timeZone)}
              </span>
            </div>
            <div className="tt-trigger">{e.trigger.summary}</div>
            {e.type === 'signal' && (
              <div className="tt-exec muted">
                {e.execution?.status === 'executed'
                  ? 'Executed (next-session fill)'
                  : `Not executed${e.execution?.reason ? `: ${e.execution.reason}` : ''}`}
              </div>
            )}
          </div>
        );
      })}
      {items.length > shown.length && <div className="tt-more muted">+ {items.length - shown.length} more</div>}
      <div className="tt-foot muted">
        Synthetic demo data · click for details{items.length > 1 ? '; click again for the next event' : ''}
      </div>
    </div>
  );
}
