// Where a hovered trade marker's counterpart lies relative to the visible window. Pure, unit-tested; the chart draws the
// connector, and the tooltip says when the counterpart is outside the view (the chart never zooms to it).

import type { Tone } from '../trades.ts';

/** The counterpart of a hovered executed entry/exit, as the run view resolves it from tradeId + linkedEventId. */
export interface ChartLink {
  partnerKey: string | null; // its chart key (`${role}:${eventId}`), or null when it has no marker (kind hidden)
  partner: { t: number; y: number | null; kind: 'executed_entry' | 'executed_exit' } | null; // null: open position
  tone: Tone;
}

/** visible | before (earlier than the window) | after (later) | open (no exit yet) | none (not a linked trade). */
export type Placement = 'visible' | 'before' | 'after' | 'open' | 'none';

export function placementOf(link: ChartLink | null, xRange: readonly [number, number]): Placement {
  if (!link) return 'none';
  if (!link.partner) return 'open';
  const { t } = link.partner;
  return t < xRange[0] ? 'before' : t > xRange[1] ? 'after' : 'visible';
}
