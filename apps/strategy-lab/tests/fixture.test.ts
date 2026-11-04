import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { buildModel } from '../shared/demo-schema/model.ts';
import { argExtreme } from '../shared/demo/indicators.ts';
import { DEMO_SEED, generateDemoDataset } from '../shared/demo/generate.ts';
import { OCCUPANCY_SESSIONS } from '../shared/demo/execution.ts';
import { stableStringify } from '../shared/demo/serialize.ts';
import type { ParameterValue } from '../shared/demo-schema/types.ts';
import { readFixture, readFixtureText } from './helpers.ts';

const value = (values: ParameterValue[], key: string) => values.find((v) => v.key === key)?.value;

describe('demo fixture', () => {
  it('is reproducible: two generations are identical and equal the checked-in file byte for byte', () => {
    const a = stableStringify(generateDemoDataset());
    const b = stableStringify(generateDemoDataset(DEMO_SEED));
    expect(a).toBe(b);
    const sha = (s: string) => createHash('sha256').update(s).digest('hex');
    expect(sha(readFixtureText())).toBe(sha(a));
  });

  it('changes with the seed (the seed really drives the series)', () => {
    expect(generateDemoDataset(DEMO_SEED + 1).priceSeries.bars[100]!.c).not.toBe(
      readFixture().priceSeries.bars[100]!.c
    );
  });

  it('is labelled synthetic everywhere it matters', () => {
    const d = readFixture();
    expect(d.provenance.kind).toBe('synthetic');
    expect(d.instrument.isSynthetic).toBe(true);
    expect(d.instrument.label).toMatch(/synthetic/);
    expect(d.provenance.disclosures.join(' ')).toMatch(/not actual VGT prices/);
    expect(d.executionModel?.isIllustrative).toBe(true);
  });

  it('has at least 10 variations with enough raw signals and a smaller executed subset', () => {
    const d = readFixture();
    expect(d.variations.length).toBeGreaterThanOrEqual(10);
    const withBoth = d.variations.filter((v) => {
      const s = v.events.filter((e) => e.type === 'signal').length;
      const x = v.events.filter((e) => e.type === 'executed').length;
      return s >= 20 && x > 0 && x < s;
    });
    expect(withBoth.length).toBeGreaterThanOrEqual(8);
  });

  it('aligns every event exactly to a bar, at that bar’s close', () => {
    const d = readFixture();
    const m = buildModel(d, 'exact');
    expect(m.alignment.unaligned).toEqual([]);
    for (const vm of m.variations)
      for (const e of vm.events) {
        const bar = d.priceSeries.bars[e.barIndex]!;
        expect(bar.t).toBe(e.t);
        expect(bar.d).toBe(e.d);
        expect(bar.c).toBe(e.price);
      }
  });

  it('executes a signal at the next session, never inside the occupancy placeholder', () => {
    const d = readFixture();
    const m = buildModel(d);
    for (const vm of m.variations) {
      let lastFill = -Infinity;
      for (const e of vm.events) {
        if (e.type !== 'executed') continue;
        const sig = m.eventById.get(e.linkedEventId!)!;
        expect(e.barIndex - sig.barIndex).toBe(1);
        expect(e.barIndex - lastFill).toBeGreaterThanOrEqual(OCCUPANCY_SESSIONS);
        lastFill = e.barIndex;
      }
      for (const e of vm.events)
        if (e.type === 'signal' && e.execution?.status === 'not-executed') expect(e.execution.reason).toBeTruthy();
    }
  });

  it('states trigger values that are true of the series (rebound rule check)', () => {
    const d = readFixture();
    const closes = d.priceSeries.bars.map((b) => b.c);
    const dates = d.priceSeries.bars.map((b) => b.d);
    const v1 = d.variations.find((v) => v.id === 'demo-rebound-5-from-20-low')!;
    const m = buildModel(d);
    for (const e of v1.events.filter((x) => x.type === 'signal')) {
      const i = m.eventById.get(e.id)!.barIndex;
      const li = argExtreme(closes, i, 20, 'min')!;
      expect(value(e.trigger.values, 'low')).toBe(closes[li]);
      expect(value(e.trigger.values, 'lowDate')).toBe(dates[li]);
      const rise = Math.round((closes[i]! / closes[li]! - 1) * 10000) / 100;
      expect(value(e.trigger.values, 'rise')).toBe(rise);
      expect(rise).toBeGreaterThanOrEqual(5);
      expect(e.trigger.summary).toContain(closes[i]!.toFixed(2));
    }
  });
});
