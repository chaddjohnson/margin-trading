import { describe, expect, it } from 'vitest';

import { baselineSummary, outcomeAt, quantile, summarize } from '../shared/forward.ts';

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
