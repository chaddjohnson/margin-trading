import { describe, expect, it } from 'vitest';

import { baselineSummary, outcomeAt, quantile, summarize } from '../src/analysis/forward.ts';
import { markerHeight, toAnnotations } from '../src/chart/markers.ts';
import type { PlacedEvent } from '../src/data/model.ts';
import type { Cluster } from '../src/state/selectors.ts';

const cfg = { horizon: 3, targets: [0.05, 0.1] };

describe('forward statistics', () => {
  const closes = [100, 103, 106, 99, 111, 112, 90];

  it('computes time to target, MFE and MAE close to close', () => {
    // Bar 0 at 100: the next three closes are 103, 106, 99.
    const first = outcomeAt(closes, 0, 100, cfg)!;
    expect(first.sessionsToTarget).toEqual([2, null]);
    expect(first.mfe).toBeCloseTo(0.06, 12);
    expect(first.mae).toBeCloseTo(-0.01, 12);
    // Bar 2 at 106: 99, 111, 112 — +5% needs 111.30, first reached by 112 on the third session.
    const o = outcomeAt(closes, 2, 106, cfg)!;
    expect(o.sessionsToTarget).toEqual([3, null]);
    expect(o.mae).toBeCloseTo(99 / 106 - 1, 12);
  });

  it('censors events without a full horizon instead of counting them as misses', () => {
    expect(outcomeAt(closes, 4, 111, cfg)).toBeNull();
    const s = summarize(
      [
        { barIndex: 0, price: 100 }, // 106 within 3 sessions: +5% only
        { barIndex: 3, price: 99 }, // 111 the next session: +5% and +10%
        { barIndex: 4, price: 111 } // only two later sessions: censored
      ],
      closes,
      cfg
    );
    expect(s).toMatchObject({ n: 3, complete: 2, censored: 1, hits: [2, 1] });
    expect(s.hitRate).toEqual([1, 0.5]);
  });

  it('counts non-overlapping events at least one horizon apart', () => {
    const s = summarize(
      [0, 1, 3].map((i) => ({ barIndex: i, price: closes[i]! })),
      closes,
      cfg
    );
    expect(s.complete).toBe(3);
    expect(s.nonOverlapping).toBe(2);
  });

  it('builds the every-session baseline over a bar span', () => {
    expect(baselineSummary(closes, 0, 6, cfg)).toMatchObject({ n: 7, complete: 4, censored: 3 });
  });

  it('uses linear-interpolation quantiles', () => {
    expect(quantile([4, 1, 3, 2], 0.5)).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 0.1)).toBe(2);
    expect(quantile([], 0.5)).toBeNull();
  });
});

describe('markers', () => {
  const ev = (id: string, type: 'signal' | 'executed', x: number): PlacedEvent => ({
    id,
    variationId: 'v',
    type,
    t: new Date(x).toISOString(),
    d: '2020-01-01',
    price: 1,
    priceBasis: 'bar-close',
    trigger: { summary: '', values: [] },
    x,
    barIndex: 0
  });
  const clusters: Cluster[] = [
    { x: 1000, barIndex: 0, items: [{ role: 'A', event: ev('a1', 'signal', 1000) }] },
    {
      x: 2000,
      barIndex: 1,
      items: [
        { role: 'A', event: ev('a2', 'executed', 2000) },
        { role: 'B', event: ev('b2', 'signal', 2000) }
      ]
    }
  ];

  it('creates exactly one annotation per bar, sized to its stack, below the line', () => {
    const anns = toAnnotations(clusters, 'Close', 'b2');
    expect(anns.map((a) => a.xval)).toEqual([1000, 2000]);
    expect(anns[1]!.height).toBe(markerHeight(2));
    expect(anns[1]!.tickHeight).toBeLessThan(-anns[1]!.height!);
    expect(anns[1]!.cssClass).toContain('is-selected');
    expect(anns[1]!.cssClass).toContain('is-stacked');
    expect(anns[0]!.cssClass).not.toContain('is-selected');
    expect(decodeURIComponent(anns[1]!.icon!).match(/<polygon/g)).toHaveLength(2);
  });
});
