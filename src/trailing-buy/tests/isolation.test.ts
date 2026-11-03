import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { developmentEnd, finalFold, walkForwardFolds } from '../constants.ts';
import { baselineParams } from '../engine.ts';
import { foldIndexes, openDevelopment, testJob, trainingJob } from '../study.ts';
import { holdoutScores, scenarios } from '../validation.ts';
import { barsFrom, flat, run } from './helpers.ts';

describe('holdout isolation', () => {
  test('development studies hold no bar after the development end, and cannot score the holdout', async () => {
    const study = await openDevelopment(0);

    try {
      assert.equal(study.bars.date.at(-1), developmentEnd);
      assert.equal(foldIndexes(study, finalFold).testStart, -1);
      await assert.rejects(() => holdoutScores(study, [], scenarios[0]!));

      for (const fold of walkForwardFolds) {
        const indexes = foldIndexes(study, fold);

        // Training runs stop at the training end; validation runs at the test end, both inside development.
        assert.ok(trainingJob(indexes, baselineParams).endIndex === indexes.trainEnd);
        assert.ok(study.bars.date[indexes.trainEnd]! <= fold.trainEnd);
        assert.ok(testJob(indexes, baselineParams).endIndex <= study.bars.date.length - 1);
        assert.ok(indexes.testStart > indexes.trainEnd);
      }
    } finally {
      await study.close();
    }
  });
});

describe('pre-close execution model', () => {
  test('buys at the pre-close price when it clears the trigger; the close only trails the trough', () => {
    const bars = barsFrom([flat(100), flat(89.9), flat(85), flat(86), flat(88), flat(90)]);
    // 85 x 1.03 = 87.55. Session 3: pre-close 87.6 clears it although the close (86) would not.
    const preClosePrice = [NaN, 89.5, 85.5, 87.6, 87.9, 90];
    const result = run(
      bars,
      { lookback: 10, entryMode: 'fixed', reboundTenths: 30 },
      { execution: 'preClose', preClosePrice }
    );

    assert.equal(result.setups[0]!.armIndex, 1); // armed at the official close, never at a pre-close price
    assert.equal(result.trades[0]!.entryIndex, 3);
    assert.equal(result.trades[0]!.entryPrice, 87.6);
  });

  test('a new trough is set only by official closes; no decision on a session without a pre-close price', () => {
    const bars = barsFrom([flat(100), flat(89.9), flat(85), flat(84), flat(88)]);
    // Session 3's pre-close 83 is below the trough but does not move it; its close 84 does.
    const preClosePrice = [NaN, NaN, NaN, 83, NaN];
    const result = run(
      bars,
      { lookback: 10, entryMode: 'fixed', reboundTenths: 30 },
      { execution: 'preClose', preClosePrice }
    );

    assert.equal(result.setups[0]!.trough, 84);
    assert.equal(result.trades.length, 0);
  });

  test('legacy pre-close buys on the pre-close drawdown signal', () => {
    const bars = barsFrom([flat(100), flat(91), flat(92)]);
    const result = run(bars, { lookback: 10 }, { execution: 'preClose', preClosePrice: [NaN, 89.9, 92] });

    assert.equal(result.trades[0]!.entryIndex, 1);
    assert.equal(result.trades[0]!.entryPrice, 89.9);
  });
});
