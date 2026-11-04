// Event marker glyphs. Encoding (never colour alone):
//   shape  ▲ entry (signal or executed) · ▼ executed exit · ⊘ rejected signal
//   fill   hollow = signal / not executed · filled = executed
//   colour run role: A aqua, B orange (validated for colour-vision deficiency against the chart surface)
// Entries sit just below the price, exits just above it, rejected signals on it.

import type { EventKind } from '../../shared/contract.ts';

export type Role = 'A' | 'B';

export const PRICE_COLOR = '#3987e5';
export const ROLE_COLOR: Record<Role, string> = { A: '#199e70', B: '#d95926' };
const SURFACE = '#0b1220';
export const MARKER_SIZE = 14;

export function glyphSvg(kind: EventKind, role: Role, size = MARKER_SIZE): string {
  const c = ROLE_COLOR[role];
  const s = size;
  let shape: string;
  switch (kind) {
    case 'entry_signal':
      shape = `<polygon points="${s / 2},1.5 ${s - 1.5},${s - 1.5} 1.5,${s - 1.5}" fill="${SURFACE}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
      break;
    case 'executed_entry':
      shape = `<polygon points="${s / 2},1 ${s - 1},${s - 1.5} 1,${s - 1.5}" fill="${c}" stroke="${SURFACE}" stroke-width="1.2" stroke-linejoin="round"/>`;
      break;
    case 'executed_exit':
      shape = `<polygon points="1,1.5 ${s - 1},1.5 ${s / 2},${s - 1}" fill="${c}" stroke="#f1f5f9" stroke-width="1.3" stroke-linejoin="round"/>`;
      break;
    case 'rejected_signal':
      shape = `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 1.8}" fill="${SURFACE}" stroke="${c}" stroke-width="1.8" opacity="0.9"/><line x1="3.5" y1="${s - 3.5}" x2="${s - 3.5}" y2="3.5" stroke="${c}" stroke-width="1.6"/>`;
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${shape}</svg>`;
}

export const glyphUri = (kind: EventKind, role: Role, size = MARKER_SIZE) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(glyphSvg(kind, role, size))}`;

/** Vertical placement of a marker relative to its price point: offset of the icon's top edge in px. */
export function markerOffset(kind: EventKind, stackIndex: number): number {
  const step = MARKER_SIZE + 2;
  if (kind === 'executed_exit') return -(MARKER_SIZE + 2) - stackIndex * step;
  if (kind === 'rejected_signal') return -MARKER_SIZE / 2 + stackIndex * step;
  return 2 + stackIndex * step;
}
