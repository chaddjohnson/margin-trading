import { describe, expect, it } from 'vitest';

import { isMacPlatform, panModifierFor, panWindow, startsPan } from '../src/chart/pan.ts';

const keys = (k: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) => ({
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...k
});

describe('pan modifier detection', () => {
  it('recognises macOS (and iPadOS) from userAgentData or the legacy platform string', () => {
    expect(isMacPlatform({ platform: 'MacIntel' })).toBe(true);
    expect(isMacPlatform({ userAgentData: { platform: 'macOS' }, platform: 'MacIntel' })).toBe(true);
    expect(isMacPlatform({ platform: 'iPad' })).toBe(true);
    expect(isMacPlatform({ platform: 'Win32' })).toBe(false);
    expect(isMacPlatform({ userAgentData: { platform: 'Windows' } })).toBe(false);
    expect(isMacPlatform({ userAgentData: { platform: 'Linux' }, platform: 'Linux x86_64' })).toBe(false);
    expect(isMacPlatform(undefined)).toBe(false);
  });

  it('⌘ pans on macOS and Ctrl elsewhere; Shift and Alt pan everywhere; a plain drag measures', () => {
    const mac = panModifierFor(true);
    const pc = panModifierFor(false);
    expect([mac, pc]).toEqual(['meta', 'ctrl']);
    expect(startsPan(keys({ metaKey: true }), mac)).toBe(true);
    expect(startsPan(keys({ ctrlKey: true }), mac)).toBe(false); // Ctrl-click is a right-click on macOS
    expect(startsPan(keys({ ctrlKey: true }), pc)).toBe(true);
    expect(startsPan(keys({ metaKey: true }), pc)).toBe(false); // the Windows key belongs to the OS
    for (const m of [mac, pc]) {
      expect(startsPan(keys({ shiftKey: true }), m)).toBe(true);
      expect(startsPan(keys({ altKey: true }), m)).toBe(true);
      expect(startsPan(keys(), m)).toBe(false);
    }
  });
});

describe('panWindow', () => {
  const ext = [0, 10_000] as const;
  const start = [2000, 6000] as const;

  it('drag left shows later times, drag right earlier ones, by the dragged fraction of the plot', () => {
    expect(panWindow(start, -100, 1000, ext)).toEqual([2400, 6400]); // 10% of the width = 10% of the span, later
    expect(panWindow(start, 100, 1000, ext)).toEqual([1600, 5600]);
    expect(panWindow(start, 0, 1000, ext)).toEqual([2000, 6000]);
  });

  it('never changes the span (the zoom level), at any distance, including when clamped', () => {
    for (const dx of [-1e6, -731, -1, 0.5, 3, 250, 1e6]) {
      const [a, b] = panWindow(start, dx, 917, ext);
      expect(b - a).toBeCloseTo(4000, 9); // exact up to floating-point rounding of a + span
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(10_000);
    }
  });

  it('clamps at the data’s first and last times', () => {
    expect(panWindow(start, -1e6, 1000, ext)).toEqual([6000, 10_000]); // far left: the latest window
    expect(panWindow(start, 1e6, 1000, ext)).toEqual([0, 4000]); // far right: the earliest window
    expect(panWindow([0, 4000], 50, 1000, ext)).toEqual([0, 4000]); // already at the start
  });

  it('is continuous and depends only on the total travel from the press (no drift from intermediate steps)', () => {
    let prev = panWindow(start, 0, 800, ext)[0];
    for (let dx = 0; dx >= -400; dx -= 7) {
      const [a] = panWindow(start, dx, 800, ext);
      expect(a).toBeGreaterThanOrEqual(prev);
      expect(a - prev).toBeLessThanOrEqual((7 * 4000) / 800 + 1e-9);
      prev = a;
    }
    expect(panWindow(start, -400, 800, ext)).toEqual([4000, 8000]);
  });

  it('does nothing when the whole extent is visible or the input is degenerate', () => {
    expect(panWindow([0, 10_000], -300, 1000, ext)).toEqual([0, 10_000]);
    expect(panWindow(start, Number.NaN, 1000, ext)).toEqual([2000, 6000]);
    expect(panWindow(start, -10, 0, ext)).toEqual([2000, 6000]);
  });
});
