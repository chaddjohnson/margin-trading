import { describe, expect, it } from 'vitest';

import { alignEvents } from '../src/schema/align.ts';
import type { EntryEvent, PriceBar } from '../src/schema/types.ts';

const bars: PriceBar[] = [
  { t: '2024-03-08T21:00:00Z', d: '2024-03-08', o: 1, h: 1, l: 1, c: 1 },
  { t: '2024-03-11T20:00:00Z', d: '2024-03-11', o: 1, h: 1, l: 1, c: 1 }
];

const ev = (id: string, t: string, d: string): EntryEvent => ({
  id,
  variationId: 'v',
  type: 'signal',
  t,
  d,
  price: 1,
  priceBasis: 'bar-close',
  trigger: { summary: 's', values: [] }
});

describe('alignEvents', () => {
  it('exact: places only events whose instant equals a bar timestamp', () => {
    const r = alignEvents(
      bars,
      '1d',
      [
        ev('a', '2024-03-11T20:00:00Z', '2024-03-11'),
        ev('b', '2024-03-11T14:31:00Z', '2024-03-11'),
        ev('c', '2024-03-12T20:00:00Z', '2024-03-12')
      ],
      'exact'
    );
    expect([...r.barIndexByEventId]).toEqual([['a', 1]]);
    expect(r.unaligned.map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('session-date: places an intraday event on its own session’s daily bar, never a neighbour', () => {
    const r = alignEvents(
      bars,
      '1d',
      [ev('b', '2024-03-11T14:31:00Z', '2024-03-11'), ev('c', '2024-03-09T15:00:00Z', '2024-03-09')],
      'session-date'
    );
    expect([...r.barIndexByEventId]).toEqual([['b', 1]]);
    expect(r.unaligned.map((e) => e.id)).toEqual(['c']);
  });

  it('refuses session-date alignment on minute bars', () => {
    expect(() => alignEvents(bars, '1m', [], 'session-date')).toThrow(/daily bars/);
  });
});
