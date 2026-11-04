import { describe, expect, it } from 'vitest';

import { normalizeWheelDelta, wheelZoomOutPx, wheelZoomWindow } from '../src/chart/wheelZoom.ts';

const ext = [0, 10_000] as const;
// A wheel event as the browser delivers it: deltaY > 0 = content scrolls down = a two-finger swipe UP with natural
// scrolling (the macOS and Windows precision-touchpad default).
const swipe = (deltaY: number, extra: { deltaMode?: number; ctrlKey?: boolean } = {}) =>
  wheelZoomOutPx({ deltaY, deltaMode: extra.deltaMode ?? 0, ctrlKey: extra.ctrlKey ?? false });
const span = (r: [number, number] | null) => (r ? r[1] - r[0] : NaN);

describe('wheel / trackpad zoom direction', () => {
  it('two-finger swipe up (deltaY > 0) zooms in; swipe down (deltaY < 0) zooms out, gradually', () => {
    const inn = wheelZoomWindow([2000, 6000], 3000, swipe(100), ext, 10)!;
    const out = wheelZoomWindow([2000, 6000], 3000, swipe(-100), ext, 10)!;
    expect(span(inn)).toBeLessThan(4000);
    expect(span(inn)).toBeGreaterThan(3000); // one notch is a small step
    expect(span(out)).toBeGreaterThan(4000);
    expect(span(out)).toBeLessThan(5000);
  });

  it('decides the sign in one place: line and page delta modes keep it, pinch / Ctrl + wheel keeps page-zoom sign', () => {
    expect(swipe(3)).toBe(-3);
    expect(swipe(-3)).toBe(3);
    expect(swipe(3, { deltaMode: 1 })).toBe(-48); // Firefox line mode: same direction as pixels
    expect(swipe(-1, { deltaMode: 2 })).toBe(800);
    // Pinch-out arrives as ctrlKey + deltaY < 0 in Chrome, Edge and Firefox: it must still zoom IN (not double-inverted).
    const pinchOut = wheelZoomWindow([2000, 6000], 4000, swipe(-50, { ctrlKey: true }), ext, 10)!;
    const pinchIn = wheelZoomWindow([2000, 6000], 4000, swipe(50, { ctrlKey: true }), ext, 10)!;
    expect(span(pinchOut)).toBeLessThan(4000);
    expect(span(pinchIn)).toBeGreaterThan(4000);
    expect(wheelZoomWindow([2000, 6000], 3000, swipe(0), ext, 10)).toBeNull(); // horizontal-only trackpad scroll
  });

  it('keeps the time under the cursor at the same position in the window, in both directions', () => {
    for (const [cursor, delta] of [
      [3000, 100],
      [5500, -100],
      [2100, 7],
      [5999, -7]
    ] as const) {
      const r = wheelZoomWindow([2000, 6000], cursor, swipe(delta), ext, 10)!;
      expect((cursor - r[0]) / (r[1] - r[0])).toBeCloseTo((cursor - 2000) / 4000, 10);
    }
  });

  it('stops at the data extremes and at the minimum span; null when nothing changes', () => {
    expect(wheelZoomWindow([0, 10_000], 5000, swipe(-500), ext, 10)).toBeNull(); // fully out: let the page scroll
    const edge = wheelZoomWindow([500, 9500], 9000, swipe(-400), ext, 10)!;
    expect(edge[0]).toBeGreaterThanOrEqual(0);
    expect(edge[1]).toBeLessThanOrEqual(10_000);
    let w: [number, number] = [2000, 6000];
    for (let i = 0; i < 200; i++) w = wheelZoomWindow(w, 4000, swipe(100), ext, 50) ?? w;
    expect(span(w)).toBeCloseTo(50, 6);
    expect(wheelZoomWindow(w, 4000, swipe(100), ext, 50)).toBeNull(); // fully in: let the page scroll
  });

  it('caps a single huge delta and normalises pixel, line and page delta modes', () => {
    const big = wheelZoomWindow([2000, 6000], 4000, swipe(100_000), ext, 10)!;
    expect(span(big)).toBeCloseTo(4000 * 0.7, 6);
    expect(normalizeWheelDelta({ deltaY: 3, deltaMode: 0 })).toBe(3);
    expect(normalizeWheelDelta({ deltaY: 3, deltaMode: 1 })).toBe(48);
    expect(normalizeWheelDelta({ deltaY: 1, deltaMode: 2 }, 900)).toBe(900);
  });
});
