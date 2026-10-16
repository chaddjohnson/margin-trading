import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeFeatures, featureSpecs } from '../features.ts';
import { mulberry32 } from '../stats.ts';
import { barsFrom, randomWalk, studyDataOf } from './helpers.ts';

const same = (a: number, b: number) => (Number.isNaN(a) && Number.isNaN(b)) || a === b;

describe('point-in-time features', () => {
  const closes = randomWalk(700, 3, 0.0002, 0.025);
  const proxyA = barsFrom(randomWalk(700, 4), { symbol: 'SPY' });
  const proxyB = barsFrom(randomWalk(700, 5), { symbol: 'QQQ' });
  const proxyC = barsFrom(randomWalk(700, 6), { symbol: 'IGV' });
  const vix = new Map(proxyA.date.map((date, index) => [date, 15 + (index % 20)]));
  const base = computeFeatures(studyDataOf(barsFrom(closes), [proxyA, proxyB, proxyC], vix)).features;

  for (const cut of [250, 400, 555]) {
    it(`does not change any feature at or before session ${cut} when every later price changes`, () => {
      const random = mulberry32(cut);
      const scramble = (values: number[]) =>
        values.map((value, index) => (index > cut ? value * (0.7 + random() * 0.6) : value));
      const scrambledBars = (bars: ReturnType<typeof barsFrom>) => ({
        ...bars,
        open: scramble(bars.open),
        high: scramble(bars.high).map((value, index) => (index > cut ? value * 2 : value)),
        low: scramble(bars.low).map((value, index) => (index > cut ? value / 2 : value)),
        close: scramble(bars.close),
        volume: scramble(bars.volume)
      });
      const scrambledVix = new Map([...vix].map(([date, value], index) => [date, index >= cut ? value * 3 : value]));
      const changed = computeFeatures(
        studyDataOf(
          scrambledBars(barsFrom(closes)),
          [scrambledBars(proxyA), scrambledBars(proxyB), scrambledBars(proxyC)],
          scrambledVix
        )
      ).features;

      for (const spec of featureSpecs) {
        for (let t = 0; t <= cut; t++) {
          assert.ok(same(base[spec.name]![t]!, changed[spec.name]![t]!), `${spec.name} at ${t}`);
        }
      }
    });
  }

  it('uses the previous session’s VIX close', () => {
    const t = 300;
    const date = barsFrom(closes).date;
    assert.equal(base.vixPrev![t], vix.get(date[t - 1]!));
  });

  it('never forward-fills a missing proxy session', () => {
    const gappy = {
      ...proxyB,
      date: proxyB.date.filter((_, index) => index !== 320),
      close: proxyB.close.filter((_, index) => index !== 320)
    };
    gappy.open = proxyB.open.filter((_, index) => index !== 320);
    gappy.high = proxyB.high.filter((_, index) => index !== 320);
    gappy.low = proxyB.low.filter((_, index) => index !== 320);
    gappy.volume = proxyB.volume.filter((_, index) => index !== 320);
    const features = computeFeatures(studyDataOf(barsFrom(closes), [proxyA, gappy, proxyC])).features;
    // Two of three proxies remain at session 320: fewer than the three required, so no breadth value.
    assert.ok(Number.isNaN(features.xDdFrac10![320]!));
    assert.ok(!Number.isNaN(features.xDdFrac10![321]!));
  });

  it('measures candidate velocity from the reference-high bar to the first 10% signal', () => {
    // Flat at 100 for 120 sessions, then 2% a day down.
    const path = [...Array(120).fill(100), ...Array.from({ length: 10 }, (_, i) => 100 * 0.98 ** (i + 1))];
    const features = computeFeatures(studyDataOf(barsFrom(path))).features;
    const first = path.findIndex((close, index) => index > 0 && features.candAge![index] === 0);
    assert.ok(first > 120);
    assert.equal(features.candVelocity![first], features.peakAge![first]);
    assert.ok(features.dd![first]! >= 0.1 && features.dd![first - 1]! < 0.1);
  });
});
