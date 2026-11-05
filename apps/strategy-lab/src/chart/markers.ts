// Event marker glyphs. Encoding (never colour alone):
//   shape   ▲ entry (signal or executed) · ▼ executed exit (half-filled: a partial exit, Growth 1.3.0) · ⊘ rejected signal
//   fill    hollow = a raw entry signal · filled = executed (or the rejected signal's ring)
//   colour  the marker TONE: an executed entry and its exit share their trade's outcome — green net profit, red net
//           loss, grey exactly breakeven, blue still open (never judged on unrealized P&L), amber no recorded P&L;
//           rejected signals are purple whatever the reason; raw entry signals are a hollow light outline
//   halo    the run role when comparing: run A has a dark rim, run B an orange halo
// Entries sit just below the price, exits just above it, rejected signals on it.

import { EVENT_KIND_LABEL, type EventKind } from '../../shared/contract.ts';
import { type Trade, toneOf } from '../trades.ts';

export type Role = 'A' | 'B';

export const PRICE_COLOR = '#3987e5';
export const ROLE_COLOR: Record<Role, string> = { A: '#199e70', B: '#d95926' };
const SURFACE = '#0b1220';
export const MARKER_SIZE = 14;

/** What a marker's colour says. `shape` is the legend's neutral rendering of an executed glyph (shape only). */
export type MarkerTone = 'profit' | 'loss' | 'flat' | 'open' | 'unknown' | 'rejected' | 'signal' | 'shape';

export const TONE_COLOR: Record<MarkerTone, string> = {
  profit: '#4cc38a', // green: the trade's recorded net P&L after costs and interest is positive
  loss: '#f07070', // red: negative
  flat: '#94a3b8', // grey: exactly zero
  open: '#38bdf8', // sky blue: the position is still open (lighter than the #3987e5 price line)
  unknown: '#e9b44c', // amber: an executed event whose trade P&L the run did not record
  rejected: '#a78bfa', // purple: every rejected signal
  signal: '#e2e8f0', // light outline: a raw entry signal (hollow)
  shape: '#cbd5e1' // legend only: the executed shapes, without an outcome
};

export const TONE_LABEL: Record<Exclude<MarkerTone, 'shape' | 'signal' | 'rejected'>, string> = {
  profit: 'net profit',
  loss: 'net loss',
  flat: 'breakeven (net $0)',
  open: 'open position',
  unknown: 'P&L not recorded'
};

/**
 * The tone of an event's marker. An executed entry or exit takes its TRADE's outcome from the recorded net P&L (after
 * costs and margin interest; never from the price difference): both markers of a trade therefore match. An open
 * position is `open` whatever its unrealized P&L.
 */
export function markerToneOf(kind: EventKind, trade: Pick<Trade, 'status' | 'pnl'> | null): MarkerTone {
  if (kind === 'entry_signal') return 'signal';
  if (kind === 'rejected_signal') return 'rejected';
  return toneOf(trade);
}

/** A Growth 1.3.0 partial exit: an executed exit of a position that stays open (retention). */
export const isPartialExit = (e: { kind: EventKind; meta?: Record<string, unknown> | null }) =>
  e.kind === 'executed_exit' && e.meta?.partial === true;

/** The label of an event's kind, a partial exit named as such. */
export const eventKindLabel = (e: { kind: EventKind; meta?: Record<string, unknown> | null }) =>
  isPartialExit(e) ? 'Executed exit (partial)' : EVENT_KIND_LABEL[e.kind];

export function glyphSvg(kind: EventKind, role: Role, tone: MarkerTone, size = MARKER_SIZE, partial = false): string {
  const c = TONE_COLOR[tone];
  const s = size;
  // The role halo: the same outline, wider, under the glyph (run B orange, run A the dark surface).
  const halo = role === 'B' ? ROLE_COLOR.B : SURFACE;
  let shape: string;
  let rim: string;
  switch (kind) {
    case 'entry_signal': {
      const pts = `${s / 2},1.5 ${s - 1.5},${s - 1.5} 1.5,${s - 1.5}`;
      rim = `<polygon points="${pts}" fill="none" stroke="${halo}" stroke-width="3.6" stroke-linejoin="round"/>`;
      shape = `<polygon points="${pts}" fill="${SURFACE}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
      break;
    }
    case 'executed_entry': {
      const pts = `${s / 2},1 ${s - 1},${s - 1.5} 1,${s - 1.5}`;
      rim = `<polygon points="${pts}" fill="none" stroke="${halo}" stroke-width="3" stroke-linejoin="round"/>`;
      shape = `<polygon points="${pts}" fill="${c}" stroke="${SURFACE}" stroke-width="1.2" stroke-linejoin="round"/>`;
      break;
    }
    case 'executed_exit': {
      const pts = `1,1.5 ${s - 1},1.5 ${s / 2},${s - 1}`;
      rim = `<polygon points="${pts}" fill="none" stroke="${halo}" stroke-width="3" stroke-linejoin="round"/>`;
      // a partial exit: the same ▼, only its left half filled (the position is still partly held)
      shape = partial
        ? `<polygon points="${pts}" fill="${SURFACE}" stroke="${c}" stroke-width="1.6" stroke-linejoin="round"/><polygon points="1.8,2.2 ${s / 2},2.2 ${s / 2},${s - 2}" fill="${c}"/>`
        : `<polygon points="${pts}" fill="${c}" stroke="#f1f5f9" stroke-width="1.3" stroke-linejoin="round"/>`;
      break;
    }
    case 'rejected_signal': {
      const r = s / 2 - 1.8;
      rim = `<circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="${halo}" stroke-width="3.4"/>`;
      shape = `<circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="${SURFACE}" stroke="${c}" stroke-width="1.8"/><line x1="3.5" y1="${s - 3.5}" x2="${s - 3.5}" y2="3.5" stroke="${c}" stroke-width="1.6"/>`;
      break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" data-tone="${tone}"${partial ? ' data-partial="true"' : ''}>${role === 'B' ? rim : ''}${shape}</svg>`;
}

export const glyphUri = (kind: EventKind, role: Role, tone: MarkerTone, size = MARKER_SIZE, partial = false) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(glyphSvg(kind, role, tone, size, partial))}`;

/** The legend's tone for an event kind: executed kinds show their shape only (the outcome colours have their own key). */
export const legendToneOf = (kind: EventKind): MarkerTone =>
  kind === 'entry_signal' ? 'signal' : kind === 'rejected_signal' ? 'rejected' : 'shape';

/** Vertical placement of a marker relative to its price point: offset of the icon's top edge in px. */
export function markerOffset(kind: EventKind, stackIndex: number): number {
  const step = MARKER_SIZE + 2;
  if (kind === 'executed_exit') return -(MARKER_SIZE + 2) - stackIndex * step;
  if (kind === 'rejected_signal') return -MARKER_SIZE / 2 + stackIndex * step;
  return 2 + stackIndex * step;
}
