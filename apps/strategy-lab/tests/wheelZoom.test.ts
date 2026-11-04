import { describe, expect, it } from 'vitest';

import { normalizeWheelDelta, wheelZoomWindow } from '../src/chart/wheelZoom.ts';

const ext = [0, 10_000] as const;

describe('mouse-wheel zoom', () => {
  it('zooms in on wheel up and out on wheel down, gradually', () => {
    const inn = wheelZoomWindow([2000, 6000], 3000, -100, ext, 10)!;
    const out = wheelZoomWindow([2000, 6000], 3000, 100, ext, 10)!;
    expect(inn[1] - inn[0]).toBeLessThan(4000);
    expect(inn[1] - inn[0]).toBeGreaterThan(3000); // one notch is a small step
    expect(out[1] - out[0]).toBeGreaterThan(4000);
    expect(out[1] - out[0]).toBeLessThan(5000);
  });

  it('keeps the time under the cursor at the same position in the window', () => {
    for (const [cursor, delta] of [
      [3000, -100],
      [5500, 100],
      [2100, -7]
    ] as const) {
      const r = wheelZoomWindow([2000, 6000], cursor, delta, ext, 10)!;
      expect((cursor - r[0]) / (r[1] - r[0])).toBeCloseTo((cursor - 2000) / 4000, 10);
    }
  });

  it('stops at the data extremes and at the minimum span; null when nothing changes', () => {
    expect(wheelZoomWindow([0, 10_000], 5000, 500, ext, 10)).toBeNull(); // fully zoomed out: let the page scroll
    const edge = wheelZoomWindow([500, 9500], 9000, 400, ext, 10)!;
    expect(edge[0]).toBeGreaterThanOrEqual(0);
    expect(edge[1]).toBeLessThanOrEqual(10_000);
    let w: [number, number] = [2000, 6000];
    for (let i = 0; i < 200; i++) w = wheelZoomWindow(w, 4000, -100, ext, 50) ?? w;
    expect(w[1] - w[0]).toBeCloseTo(50, 6);
    expect(wheelZoomWindow(w, 4000, -100, ext, 50)).toBeNull();
    expect(wheelZoomWindow([2000, 6000], 3000, 0, ext, 10)).toBeNull(); // horizontal-only trackpad scroll
  });

  it('caps a single huge delta and normalises pixel, line and page delta modes', () => {
    const big = wheelZoomWindow([2000, 6000], 4000, -100_000, ext, 10)!;
    expect(big[1] - big[0]).toBeCloseTo(4000 * 0.7, 6);
    expect(normalizeWheelDelta({ deltaY: 3, deltaMode: 0 })).toBe(3);
    expect(normalizeWheelDelta({ deltaY: 3, deltaMode: 1 })).toBe(48);
    expect(normalizeWheelDelta({ deltaY: 1, deltaMode: 2 }, 900)).toBe(900);
  });
});
