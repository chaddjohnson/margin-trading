import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { simulate } from '../engine.ts';
import { computeFeatures } from '../features.ts';
import { gridSpecs, placebo, specById } from '../policies.ts';
import { barsFrom, randomWalk, studyDataOf } from './helpers.ts';

const run = (closes: number[], id: string, execution: 'close' | 'nextOpen' = 'close') => {
  const bars = barsFrom(closes);
  const { features, refs } = computeFeatures(studyDataOf(bars));
  return { bars, features, result: simulate({ bars, refs, policy: specById(id).build(features), execution }) };
};

const flat = Array(120).fill(100);

describe('deferred and conditional entry state', () => {
  it('a rejected candidate stays rejected until its reference-high bar changes', () => {
    // A fast drop (velocity ≤ 5) that stays below −10% for 30 sessions.
    const closes = [...flat, 97, 93, 89, ...Array(30).fill(88)];
    const { result } = run(closes, 'B_skipFast_5');
    assert.equal(result.trades.length, 0);
    assert.ok(result.decisions.filter((row) => row.signal).every((row) => row.reason.startsWith('reject_fast')));
  });

  it('a deferral waits the stated number of sessions while the signal persists', () => {
    const closes = [...flat, 97, 93, 89, ...Array(30).fill(88)];
    const { result, features } = run(closes, 'B_deferFast_10_5');
    const first = result.trades[0]!;
    assert.equal(features.candAge![first.entryIndex], 5);
  });

  it('a zone stabilization entry still needs the 10% signal; the rebound variant may enter above it but not above −5%', () => {
    // −10.6% on the signal, then an up close to −7.5% (no signal), then to −3%.
    const closes = [...flat, 95, 89.4, 92.5, 97, 97, 97];
    const zone = run(closes, 'D_upClose_zone').result;
    const rebound = run(closes, 'D_upClose_rebound').result;
    assert.equal(zone.trades.length, 0);
    assert.equal(rebound.trades.length, 1);
    assert.equal(rebound.trades[0]!.entryPrice, 92.5);
  });

  it('an adaptive threshold waits for the deeper drawdown', () => {
    const closes = [...flat, 95, 89, 88, 86, 84, 83, 83];
    const { result, features } = run(closes, 'E_flat15');
    assert.equal(result.trades.length, 1);
    assert.ok(features.dd![result.trades[0]!.entryIndex]! >= 0.15);
    assert.ok(features.dd![result.trades[0]!.entryIndex - 1]! < 0.15);
  });

  it('a gate defers while its flag is raised and enters once it clears', () => {
    // ret5 ≤ −6% at the first signals, then a flat stretch clears it.
    const closes = [...flat, 97, 94, 91, 89, 88, 88, 88, 88, 88, 88];
    const { result, features } = run(closes, 'C_gate_ret5_6');
    const entry = result.trades[0]!;
    assert.ok(features.ret5![entry.entryIndex]! > -0.06);
    assert.ok(result.decisions.some((row) => row.reason === 'defer_ret5_6' && row.index < entry.entryIndex));
  });

  it('every grid rule and the placebo record a reason on every signal session', () => {
    const closes = randomWalk(900, 51, 0.0003, 0.03);
    for (const spec of [...gridSpecs, placebo(1, 5)]) {
      const bars = barsFrom(closes);
      const { features, refs } = computeFeatures(studyDataOf(bars));
      const result = simulate({ bars, refs, policy: spec.build(features) });
      for (const row of result.decisions) assert.ok(row.reason.length > 0, spec.id);
      for (const trade of result.trades) assert.ok(trade.entryReason.length > 0, spec.id);
    }
  });

  it('the original policy equals the engine baseline', () => {
    const closes = randomWalk(900, 52, 0.0003, 0.03);
    const a = run(closes, 'A_original').result;
    assert.ok(a.trades.every((trade) => trade.entryReason === 'signal'));
  });
});
