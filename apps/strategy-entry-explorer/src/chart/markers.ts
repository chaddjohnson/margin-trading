// Entry markers. Dygraphs keys annotations by (series, x), so two events on one bar would silently overwrite each
// other. Instead, every bar with drawn events gets ONE annotation whose icon stacks one glyph per event (A before B,
// signal before executed), placed just below the price line; the tooltip and detail panel list every event of the bar.
//
// Encoding (never colour alone): variation A = triangle, B = diamond; signal = hollow outline, executed = filled.

import type { dygraphs } from 'dygraphs';

import type { Role } from '../state/explorer.ts';
import type { Cluster, DisplayEvent } from '../state/selectors.ts';

export const PRICE_COLOR = '#3987e5';
export const ROLE_COLOR: Record<Role, string> = { A: '#199e70', B: '#d95926' };
export const ROLE_SHAPE: Record<Role, string> = { A: 'triangle', B: 'diamond' };
const SURFACE = '#0b1220';

export const GLYPH = 12;
const GAP = 2;
export const MARKER_WIDTH = GLYPH + 4;
const OFFSET_BELOW_LINE = 3;

export type ClusterAnnotation = dygraphs.Annotation & { clusterX: number };

function glyph(role: Role, filled: boolean, y: number): string {
  const c = ROLE_COLOR[role];
  const fill = filled ? c : SURFACE;
  const stroke = filled ? SURFACE : c;
  const sw = filled ? 1 : 1.8;
  const x0 = 2;
  const pts =
    role === 'A'
      ? `${x0 + 6},${y + 0.8} ${x0 + 11.4},${y + 11.2} ${x0 + 0.6},${y + 11.2}`
      : `${x0 + 6},${y + 0.6} ${x0 + 11.4},${y + 6} ${x0 + 6},${y + 11.4} ${x0 + 0.6},${y + 6}`;
  return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

export function markerHeight(n: number): number {
  return n * GLYPH + (n - 1) * GAP;
}

/** SVG data URI with one glyph per event, top to bottom. */
export function markerIcon(items: readonly DisplayEvent[]): string {
  const h = markerHeight(items.length);
  const shapes = items.map((d, i) => glyph(d.role, d.event.type === 'executed', i * (GLYPH + GAP))).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_WIDTH}" height="${h}" viewBox="0 0 ${MARKER_WIDTH} ${h}">${shapes}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** A legend / table swatch for one role and event type. */
export function swatchIcon(role: Role, filled: boolean): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_WIDTH}" height="${GLYPH}" viewBox="0 0 ${MARKER_WIDTH} ${GLYPH}">${glyph(role, filled, 0)}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function clusterClass(x: number): string {
  return `see-x-${x}`;
}

export function toAnnotations(
  clusters: readonly Cluster[],
  series: string,
  selectedEventId: string | null
): ClusterAnnotation[] {
  return clusters.map((c) => {
    const height = markerHeight(c.items.length);
    const selected = selectedEventId !== null && c.items.some((d) => d.event.id === selectedEventId);
    return {
      series,
      xval: c.x,
      icon: markerIcon(c.items),
      width: MARKER_WIDTH,
      height,
      // Negative tick height places the icon below the point; the (invisible) tick runs through the icon.
      tickHeight: -(height + OFFSET_BELOW_LINE),
      tickColor: 'rgba(0,0,0,0)',
      text: '',
      cssClass: `see-marker ${clusterClass(c.x)}${selected ? ' is-selected' : ''}${c.items.length > 1 ? ' is-stacked' : ''}`,
      clusterX: c.x
    };
  });
}
