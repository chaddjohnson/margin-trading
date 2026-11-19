// Mouse-wheel / trackpad zoom of the time axis, centred on the cursor: the time under the cursor keeps its screen
// position while the visible span shrinks or grows by a gentle factor per unit of scroll, clamped to the data extremes
// and to a minimum span. Returns null when nothing would change, so the caller lets the page scroll.
//
// Direction (the ONE place it is decided; see wheelZoomOutPx):
// - A two-finger swipe UP zooms IN, a swipe DOWN zooms OUT. With the default natural scrolling of macOS and of Windows
//   precision touchpads, a swipe up scrolls the content down, which every browser reports as deltaY > 0. So a positive
//   deltaY zooms in and a negative one zooms out. A mouse wheel follows the same OS-delivered sign: browsers cannot
//   tell a mouse from a trackpad, nor whether natural scrolling is on, so no browser- or device-specific branch exists.
// - Pinch gestures (and Ctrl + wheel) arrive as wheel events with ctrlKey set and the browser page-zoom convention:
//   deltaY < 0 = zoom in. Their sign is kept, so pinching out still zooms in.

export const ZOOM_PER_PIXEL = 0.0015; // a 100-px wheel notch ≈ ×0.86 (in) or ×1.16 (out)
const MIN_STEP = 0.7;
const MAX_STEP = 1.4;

/** Wheel delta in pixels for every deltaMode (0 pixels, 1 lines, 2 pages). */
export function normalizeWheelDelta(e: { deltaY: number; deltaMode: number }, pageHeight = 800): number {
  if (e.deltaMode === 1) return e.deltaY * 16;
  if (e.deltaMode === 2) return e.deltaY * pageHeight;
  return e.deltaY;
}

/**
 * The zoom amount of a wheel event in pixels: positive widens the window (zoom out), negative narrows it (zoom in).
 * Swipe up (deltaY > 0) → zoom in; swipe down → zoom out; pinch / Ctrl + wheel keep the page-zoom sign.
 */
export function wheelZoomOutPx(
  e: { deltaY: number; deltaMode: number; ctrlKey?: boolean },
  pageHeight = 800
): number {
  const px = normalizeWheelDelta(e, pageHeight);
  return e.ctrlKey ? px : -px;
}

/** The next visible window for a zoom of `zoomOutPx` (positive = out) around `cursorX`, or null if unchanged. */
export function wheelZoomWindow(
  range: readonly [number, number],
  cursorX: number,
  zoomOutPx: number,
  extremes: readonly [number, number],
  minSpan: number
): [number, number] | null {
  const [a, b] = range;
  const [lo, hi] = extremes;
  const span = b - a;
  const full = hi - lo;
  if (!(span > 0) || !(full > 0) || zoomOutPx === 0 || !Number.isFinite(zoomOutPx)) return null;
  const step = Math.min(MAX_STEP, Math.max(MIN_STEP, Math.exp(zoomOutPx * ZOOM_PER_PIXEL)));
  const nextSpan = Math.min(full, Math.max(Math.min(minSpan, full), span * step));
  if (Math.abs(nextSpan - span) < 1e-6 * full) return null;
  const x = Math.min(b, Math.max(a, cursorX));
  const f = (x - a) / span; // the cursor's fraction of the window stays the same
  let start = x - f * nextSpan;
  start = Math.max(lo, Math.min(start, hi - nextSpan));
  return [start, start + nextSpan];
}
