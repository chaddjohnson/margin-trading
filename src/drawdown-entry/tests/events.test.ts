import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeReferenceHighs } from '../engine.ts';
import { buildEvents, maeFromEntry, reachLabel } from '../events.ts';
import { computeFeatures } from '../features.ts';
import { barsFrom, studyDataOf } from './helpers.ts';

describe('event labels and censoring', () => {
  const close = [100, 95, 90, 85, 79, 82, 84];

  it('labels a threshold reached inside the window', () => {
    assert.equal(reachLabel(close, 2, 100, 0.2, 3, 6), true);
  });

  it('labels a complete window without the threshold as false', () => {
    assert.equal(reachLabel(close, 2, 100, 0.25, 4, 6), false);
  });

  it('censors an incomplete window instead of calling it safe', () => {
    assert.equal(reachLabel(close, 2, 100, 0.25, 10, 6), null);
    // ...but a hit before the data ends is still a hit.
    assert.equal(reachLabel(close, 2, 100, 0.2, 10, 6), true);
  });

  it('censors MAE windows that pass the outcome end', () => {
    const bars = barsFrom(close);
    assert.equal(maeFromEntry(bars, 4, 5, 6), null);
    assert.ok((maeFromEntry(bars, 1, 3, 6) as number) < -0.1);
  });
});

describe('episode segmentation', () => {
  // Rise, a 15% correction that fully recovers, a new high, then a 25% decline that never recovers.
  const path: number[] = [];
  for (let i = 0; i < 100; i++) path.push(100 + i * 0.1);
  for (let i = 1; i <= 15; i++) path.push(path[99]! * (1 - 0.01 * i));
  for (let i = 1; i <= 40; i++) path.push(path[114]! * (1 + 0.006 * i));
  for (let i = 0; i < 30; i++) path.push(path.at(-1)! * 1.001);
  const top = path.length - 1;
  for (let i = 1; i <= 25; i++) path.push(path[top]! * (1 - 0.01 * i));
  for (let i = 0; i < 10; i++) path.push(path.at(-1)! * 1.002);

  const bars = barsFrom(path);
  const { features, refs } = computeFeatures(studyDataOf(bars));
  const end = path.length - 1;
  const events = buildEvents(bars, refs, features, 1, end, end);

  it('finds two non-overlapping episodes with a recovery between them', () => {
    assert.equal(events.episodes.length, 2);
    const [first, second] = events.episodes;
    assert.ok(first!.recovered && first!.recoveryIndex < second!.signalIndex);
    assert.ok(Math.abs(first!.maxDrawdownClose - 0.15) < 0.01);
  });

  it('right-censors the unrecovered final episode and its long labels', () => {
    const second = events.episodes[1]!;
    assert.equal(second.recovered, false);
    assert.equal(second.censored, true);
    assert.equal(second.labels.dd20_h10, true);
    assert.equal(second.labels.dd30_h60, null);
  });

  it('measures velocity from the strategy reference-high bar', () => {
    const second = events.episodes[1]!;
    assert.equal(second.peakHigh, computeReferenceHighs(bars.high, 90).value[second.signalIndex]);
    assert.equal(second.velocitySessions, second.signalIndex - second.peakIndex);
  });

  it('assigns every signal session to an episode', () => {
    assert.ok(events.signals.every((signal) => signal.episodeId >= 0));
  });
});
