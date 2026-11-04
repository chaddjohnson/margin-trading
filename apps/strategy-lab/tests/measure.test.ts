import { describe, expect, it } from 'vitest';

import { formatChange, formatPercentChange, measure } from '../src/chart/measure.ts';

describe('drag-to-measure calculation', () => {
  const early = { t: Date.parse('2021-03-01T14:30:00Z'), price: 100 };
  const late = { t: Date.parse('2021-03-05T20:59:00Z'), price: 112.5 };

  it('computes the change from the earlier to the later point', () => {
    const m = measure(early, late);
    expect(m.start).toBe(early);
    expect(m.end).toBe(late);
    expect(m.change).toBeCloseTo(12.5, 10);
    expect(m.percent).toBeCloseTo(12.5, 10);
    expect(m.direction).toBe('up');
  });

  it('gives the same result when dragged right to left', () => {
    expect(measure(late, early)).toEqual(measure(early, late));
  });

  it('reports falls as negative, with the percentage relative to the earlier price', () => {
    const m = measure({ t: 2, price: 80 }, { t: 1, price: 100 });
    expect(m.change).toBe(-20);
    expect(m.percent).toBe(-20);
    expect(m.direction).toBe('down');
    expect(measure({ t: 1, price: 50 }, { t: 2, price: 50 }).direction).toBe('flat');
  });

  it('formats signed dollar and percent changes', () => {
    expect(formatChange(12.5)).toBe('+$12.50');
    expect(formatChange(-3.456)).toBe('−$3.46');
    expect(formatPercentChange(-20)).toBe('−20.00%');
    expect(formatPercentChange(NaN)).toBe('—');
  });
});
