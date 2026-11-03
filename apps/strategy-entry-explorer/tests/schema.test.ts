import { describe, expect, it } from 'vitest';

import { isIsoUtc, isSessionDate, sessionDateOf, zonedWallTimeToUtc } from '../src/schema/time.ts';
import type { Dataset } from '../src/schema/types.ts';
import { validateDataset } from '../src/schema/validate.ts';
import { clone, readFixture } from './helpers.ts';

const fixture = readFixture();

function errorsOf(mutate: (d: Dataset) => void): string[] {
  const d = clone(fixture);
  mutate(d);
  const r = validateDataset(d);
  return r.ok ? [] : r.errors;
}

const firstVariation = (d: Dataset) => d.variations[0]!;
const firstEvent = (d: Dataset) => firstVariation(d).events[0]!;

describe('time helpers', () => {
  it('converts New York session closes to UTC across daylight saving', () => {
    expect(new Date(zonedWallTimeToUtc('2016-01-04', 16, 0, 'America/New_York')).toISOString()).toBe(
      '2016-01-04T21:00:00.000Z'
    );
    expect(new Date(zonedWallTimeToUtc('2016-07-01', 16, 0, 'America/New_York')).toISOString()).toBe(
      '2016-07-01T20:00:00.000Z'
    );
    // The Monday after the March 2016 switch (13 March) and the Friday before the November switch (6 November).
    expect(new Date(zonedWallTimeToUtc('2016-03-14', 16, 0, 'America/New_York')).toISOString()).toBe(
      '2016-03-14T20:00:00.000Z'
    );
    expect(new Date(zonedWallTimeToUtc('2016-11-04', 16, 0, 'America/New_York')).toISOString()).toBe(
      '2016-11-04T20:00:00.000Z'
    );
    expect(new Date(zonedWallTimeToUtc('2016-11-07', 16, 0, 'America/New_York')).toISOString()).toBe(
      '2016-11-07T21:00:00.000Z'
    );
  });

  it('derives session dates in the exchange zone, not UTC', () => {
    // 00:30Z on 5 Jan is 19:30 on 4 Jan in New York.
    expect(sessionDateOf(Date.parse('2016-01-05T00:30:00Z'), 'America/New_York')).toBe('2016-01-04');
    expect(sessionDateOf(Date.parse('2016-01-05T00:30:00Z'), 'UTC')).toBe('2016-01-05');
  });

  it('recognises ISO UTC instants and real dates only', () => {
    expect(isIsoUtc('2016-01-04T21:00:00Z')).toBe(true);
    expect(isIsoUtc('2016-01-04T21:00:00+00:00')).toBe(false);
    expect(isIsoUtc('2016-01-04')).toBe(false);
    expect(isSessionDate('2016-02-29')).toBe(true);
    expect(isSessionDate('2017-02-29')).toBe(false);
  });
});

describe('validateDataset', () => {
  it('accepts the checked-in demo fixture', () => {
    const r = validateDataset(fixture);
    expect(r.ok ? [] : r.errors).toEqual([]);
  });

  it('rejects a wrong schema id or version', () => {
    expect(errorsOf((d) => ((d as { schemaVersion: number }).schemaVersion = 2))).toEqual([
      'schemaVersion: expected 1, got 2'
    ]);
    expect(errorsOf((d) => ((d as { schema: string }).schema = 'other'))[0]).toMatch(/^schema:/);
  });

  it('rejects duplicate and descending bar timestamps', () => {
    expect(errorsOf((d) => (d.priceSeries.bars[5]!.t = d.priceSeries.bars[4]!.t)).join('\n')).toMatch(
      /duplicate timestamp/
    );
    expect(
      errorsOf((d) => {
        const b = d.priceSeries.bars;
        [b[5], b[6]] = [b[6]!, b[5]!];
      }).join('\n')
    ).toMatch(/strictly ascending/);
  });

  it('rejects timestamps without Z and session dates that do not match the exchange zone', () => {
    expect(errorsOf((d) => (d.priceSeries.bars[0]!.t = '2016-01-04T21:00:00')).join('\n')).toMatch(/UTC instant/);
    expect(errorsOf((d) => (d.priceSeries.bars[0]!.d = '2016-01-05')).join('\n')).toMatch(
      /is not the America\/New_York date/
    );
    expect(errorsOf((d) => (firstEvent(d).d = '2001-01-01')).join('\n')).toMatch(/is not the America\/New_York date/);
  });

  it('rejects inconsistent OHLC', () => {
    expect(errorsOf((d) => (d.priceSeries.bars[3]!.h = d.priceSeries.bars[3]!.l - 1)).join('\n')).toMatch(
      /inconsistent OHLC/
    );
  });

  it('rejects duplicate ids, foreign variation ids and unknown event types', () => {
    expect(errorsOf((d) => (d.variations[1]!.id = d.variations[0]!.id)).join('\n')).toMatch(/duplicate variation id/);
    expect(errorsOf((d) => (firstVariation(d).events[1]!.id = firstEvent(d).id)).join('\n')).toMatch(
      /duplicate event id/
    );
    expect(errorsOf((d) => (firstEvent(d).variationId = 'someone-else')).join('\n')).toMatch(/containing variation/);
    expect(errorsOf((d) => ((firstEvent(d) as { type: string }).type = 'exit')).join('\n')).toMatch(
      /signal or executed/
    );
  });

  it('requires reciprocal signal ↔ executed links within one variation', () => {
    const executed = (d: Dataset) => firstVariation(d).events.find((e) => e.type === 'executed')!;
    expect(errorsOf((d) => delete executed(d).linkedEventId).join('\n')).toMatch(/must link to the signal/);
    expect(errorsOf((d) => (executed(d).linkedEventId = 'missing')).join('\n')).toMatch(/does not exist/);
    expect(
      errorsOf((d) => {
        const sig = firstVariation(d).events.find((e) => e.type === 'signal' && e.execution?.status === 'executed')!;
        sig.execution = { status: 'not-executed' };
      }).join('\n')
    ).toMatch(/execution.status "executed"/);
  });

  it('requires explicit units and an execution model when executed events exist', () => {
    expect(
      errorsOf((d) => ((firstEvent(d).trigger.values[0] as { unit: string }).unit = 'dollars')).join('\n')
    ).toMatch(/unit/);
    expect(errorsOf((d) => delete d.executionModel).join('\n')).toMatch(/executionModel: required/);
  });

  it('requires synthetic data to say so', () => {
    expect(errorsOf((d) => (d.instrument.label = 'VGT')).join('\n')).toMatch(/must say "synthetic"/);
    expect(errorsOf((d) => (d.instrument.isSynthetic = false)).join('\n')).toMatch(/isSynthetic must be true/);
  });

  it('caps the error list instead of flooding', () => {
    const r = validateDataset({
      ...clone(fixture),
      priceSeries: { ...fixture.priceSeries, bars: fixture.priceSeries.bars.map((b) => ({ ...b, d: 'x' })) }
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(50);
  });
});
