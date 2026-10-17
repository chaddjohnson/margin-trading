import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { baselineParams } from '../engine.ts';
import { referenceHighs, trueRange, wilderAtr } from '../indicators.ts';
import {
  canonicalParams,
  genomeToParams,
  gridSize,
  neighbourGenomes,
  paramsId,
  paramsToGenome,
  spaces
} from '../params.ts';

describe('indicators', () => {
  test('reference high = highest high of the previous L sessions, today excluded', () => {
    const high = [5, 1, 4, 2, 3, 9, 1];
    const refs = referenceHighs(high, 3);

    assert.equal(refs[0], -Infinity);
    assert.deepEqual([...refs.slice(1)], [5, 5, 5, 4, 4, 9]);

    for (let index = 1; index < high.length; index++) {
      assert.equal(refs[index], Math.max(...high.slice(Math.max(0, index - 3), index)));
    }
  });

  test('true range includes gaps against the previous close', () => {
    // Bar 1 gaps up (low 12 > previous close 10); bar 2 gaps down (high 8 < previous close 13).
    const range = trueRange([11, 14, 8], [9, 12, 6], [10, 13, 7]);

    assert.deepEqual([...range], [2, 4, 7]);
  });

  test('Wilder ATR: NaN warm-up, simple mean seed, then recursive smoothing', () => {
    // True ranges 2, 3, 4, 5, 8 (no gaps).
    const high = [12, 13, 14, 15, 18];
    const low = [10, 10, 10, 10, 10];
    const close = [11, 11, 11, 11, 11];
    const atr = wilderAtr(high, low, close, 3);

    assert.ok(Number.isNaN(atr[0]!) && Number.isNaN(atr[1]!));
    assert.equal(atr[2], 3);
    assert.equal(atr[3], (3 * 2 + 5) / 3);
    assert.equal(atr[4], (atr[3]! * 2 + 8) / 3);
  });
});

describe('quantization', () => {
  test('integer settings divided by 1000 equal the original decimal literals exactly', () => {
    assert.equal(100 / 1000, 0.1);
    assert.equal(80 / 1000, 0.08);
    assert.equal(5 / 1000, 0.005);
    assert.equal(10 / 1000, 0.01);
    assert.equal(20 / 1000, 0.02);
    assert.equal(30 / 1000, 0.03);
    assert.equal(380 / 1000, 0.38);
  });

  test('every family represents the baseline exits and the 0.5% / 3% control exactly', () => {
    for (const space of Object.values(spaces)) {
      const params = { ...baselineParams, ...space.fixed, entryMode: space.entryMode };

      if (space.family === 'fixed') {
        params.reboundTenths = 30;
      }

      if (space.family === 'atr') {
        params.atrMultTenths = 20;
        params.atrPeriod = 14;
      }

      const genome = paramsToGenome(space, params);

      assert.deepEqual(genomeToParams(space, genome), params);
      assert.deepEqual(
        genomeToParams(space, paramsToGenome(space, { ...params, materialLossTenths: 5, lowerReentryTenths: 30 })),
        {
          ...params,
          materialLossTenths: 5,
          lowerReentryTenths: 30
        }
      );
    }
  });

  test('grids are 0.1 pp for percentages, 0.1 for K and whole days / sessions', () => {
    for (const space of Object.values(spaces)) {
      for (const spec of space.specs) {
        assert.equal(spec.step, 1);
        assert.ok(Number.isInteger(spec.min) && Number.isInteger(spec.max));
      }
    }

    const fixed = spaces.fixed;

    assert.equal(gridSize(fixed.specs.find((spec) => spec.key === 'armTenths')!), 131); // 7.0% .. 20.0%
    assert.equal(gridSize(fixed.specs.find((spec) => spec.key === 'reboundTenths')!), 76); // 0.5% .. 8.0%
    assert.throws(() => paramsToGenome(fixed, { ...baselineParams, entryMode: 'fixed', reboundTenths: 30.5 }));
  });

  test('ids depend on every parameter; neighbours stay on the grid', () => {
    const a = { ...baselineParams };
    const b = { ...baselineParams, retraceTenths: 381 };

    assert.notEqual(paramsId(a), paramsId(b));
    assert.equal(paramsId(a), paramsId({ ...a }));
    assert.match(canonicalParams(a), /^entryMode=legacy,lookback=90,armTenths=100,/);

    const space = spaces.fixed;
    const genome = space.specs.map(() => 0);

    for (const neighbour of neighbourGenomes(space, genome)) {
      genomeToParams(space, neighbour);
    }
  });
});
