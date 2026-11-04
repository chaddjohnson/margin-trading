// Horizontal panning of the time axis by dragging: which modifier selects it, and the next visible window. Pure, so the
// direction, span preservation and boundary clamping are unit-tested; PriceChart applies the window with Dygraphs'
// updateOptions({ dateWindow }) (no re-initialisation), which also keeps the range selector (overview) in step.

/** The platform's pan modifier: ⌘ Command on macOS (Ctrl-click is a right-click there), Ctrl elsewhere. */
export type PanModifier = 'meta' | 'ctrl';

/** macOS (and iPadOS with a pointer) from the browser's platform strings. */
export function isMacPlatform(nav: { platform?: string; userAgentData?: { platform?: string } } | undefined): boolean {
  const p = nav?.userAgentData?.platform || nav?.platform || '';
  return /mac|iphone|ipad|ipod/i.test(p);
}

export const panModifierFor = (mac: boolean): PanModifier => (mac ? 'meta' : 'ctrl');

export const PAN_MODIFIER_LABEL: Record<PanModifier, string> = { meta: '⌘', ctrl: 'Ctrl' };

/**
 * Whether a mouse-down starts a pan rather than a measurement: the platform's modifier (⌘ on macOS, Ctrl elsewhere),
 * or Shift / Alt (the earlier pan modifiers, kept). Read ONCE at the mouse-down: the mode is locked until release.
 */
export function startsPan(
  e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean },
  modifier: PanModifier
): boolean {
  return (modifier === 'meta' ? e.metaKey : e.ctrlKey) || e.shiftKey || e.altKey;
}

/**
 * The window after dragging the plot by `dxPx` pixels from `start` (the window at the mouse-down): the content follows
 * the pointer, so dragging LEFT (dxPx < 0) shows LATER times and dragging right shows earlier ones. The span never
 * changes, and the window is clamped inside `extremes` (the data's extent).
 */
export function panWindow(
  start: readonly [number, number],
  dxPx: number,
  plotWidthPx: number,
  extremes: readonly [number, number]
): [number, number] {
  const [a, b] = start;
  const [lo, hi] = extremes;
  const span = b - a;
  if (!(span > 0) || !(plotWidthPx > 0) || !Number.isFinite(dxPx)) return [a, b];
  if (span >= hi - lo) return [a, b]; // nothing to pan: the whole extent is visible
  const shift = (-dxPx * span) / plotWidthPx;
  const from = Math.min(Math.max(a + shift, lo), hi - span);
  return [from, from + span];
}
