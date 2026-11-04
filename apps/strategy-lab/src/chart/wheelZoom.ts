// Mouse-wheel zoom of the time axis, centred on the cursor: the time under the cursor keeps its screen position while
// the visible span shrinks (wheel up) or grows (wheel down), by a gentle factor per unit of scroll, clamped to the data
// extremes and to a minimum span. Returns null when nothing would change, so the caller lets the page scroll.

export const ZOOM_PER_PIXEL = 0.0015; // a 100-px wheel notch ≈ ×1.16 (out) or ×0.86 (in)
const MIN_STEP = 0.7;
const MAX_STEP = 1.4;

/** Wheel delta in pixels for every deltaMode (0 pixels, 1 lines, 2 pages). */
export function normalizeWheelDelta(e: { deltaY: number; deltaMode: number }, pageHeight = 800): number {
  if (e.deltaMode === 1) return e.deltaY * 16;
  if (e.deltaMode === 2) return e.deltaY * pageHeight;
  return e.deltaY;
}

export function wheelZoomWindow(
  range: readonly [number, number],
  cursorX: number,
  deltaPx: number,
  extremes: readonly [number, number],
  minSpan: number
): [number, number] | null {
  const [a, b] = range;
  const [lo, hi] = extremes;
  const span = b - a;
  const full = hi - lo;
  if (!(span > 0) || !(full > 0) || deltaPx === 0 || !Number.isFinite(deltaPx)) return null;
  const step = Math.min(MAX_STEP, Math.max(MIN_STEP, Math.exp(deltaPx * ZOOM_PER_PIXEL)));
  const nextSpan = Math.min(full, Math.max(Math.min(minSpan, full), span * step));
  if (Math.abs(nextSpan - span) < 1e-6 * full) return null;
  const x = Math.min(b, Math.max(a, cursorX));
  const f = (x - a) / span; // the cursor's fraction of the window stays the same
  let start = x - f * nextSpan;
  start = Math.max(lo, Math.min(start, hi - nextSpan));
  return [start, start + nextSpan];
}
