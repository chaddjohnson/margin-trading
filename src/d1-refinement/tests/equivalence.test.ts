// With the deep entry mode and the net stop policy the engine is the recovery-eligibility engine (itself verified
// against file 4 and the generated D1 file): identical trades, counts and accounting on Set 2, D1, random vectors on
// the real data and random synthetic scenarios.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { type Dataset, ReferenceHighCache, fixtureDataset } from '../../four-family/data.ts';
import { randomScenario } from '../../four-family/tests/fixtures.ts';
import { Rng } from '../../optimizer/rng.ts';
import { replay } from '../../trailing-buy-variants/accounting.ts';
import { simulate as referenceSimulate } from '../../recovery-eligibility/engine.ts';
import {
  families as referenceFamilies,
  toParams as referenceToParams,
  set2Params
} from '../../recovery-eligibility/families.ts';
import { loadData, protocol } from '../context.ts';
import { type Params, simulate } from '../engine.ts';
import { type IntParams, d1Params, familyOf, toParams } from '../families.ts';
import { makeCaches } from '../pool.ts';

let realData: Dataset | undefined;

const compare = (
  ds: Dataset,
  params: IntParams,
  postExit: boolean,
  armStart: number,
  rate = 0.11,
  stopFill: 'stop' | 'next-open' = 'stop'
) => {
  const family = familyOf(postExit ? 'd1' : 'base');
  const referenceFamily = referenceFamilies[postExit ? 'postExit' : 'base']!;
  const caches = makeCaches(ds);
  const highs = new ReferenceHighCache(ds);
  const settings = {
    stopFill,
    marginInterestRate: rate,
    investment: 100000,
    firstIndex: 0,
    armStart,
    endIndex: ds.sessionCount - 1
  };
  // Synthetic scenarios use lookbacks below the families' grid, so the fractions are built directly.
  const ourParams: Params = {
    targetPercentChange: params.targetPercentChange! / 1000,
    trailingBuyPercentage: params.trailingBuyPercentage! / 1000,
    trailingStopPercentage: params.trailingStopPercentage! / 1000,
    maximumHoldDays: params.maximumHoldDays!,
    tickWindowSize: params.tickWindowSize!,
    intradayLossBuffer: params.intradayLossBuffer! / 1000,
    pullback: postExit ? params.pullback! / 1000 : NaN,
    continuationWindow: postExit ? params.continuationWindow! : NaN,
    activationGain: NaN,
    earlyStop: NaN,
    alwaysRebound: NaN,
    swingLookback: NaN,
    swingRebound: NaN,
    swingProximity: NaN
  };

  assert.deepEqual(
    ds === realData ? toParams(family, params) : ourParams,
    ourParams,
    'toParams agrees with the direct construction'
  );

  const ours = simulate(
    ds,
    caches.highs.get(params.tickWindowSize!),
    undefined,
    family.architecture,
    ourParams,
    settings,
    true
  );
  const referenceParams = referenceToParams(referenceFamily, set2Params(referenceFamily, params));
  const theirs = referenceSimulate(
    ds,
    highs.get(params.tickWindowSize!),
    referenceFamily.flags,
    referenceParams,
    settings,
    true
  );
  const fields = [
    'kind',
    'entryIndex',
    'entryBar',
    'entryPrice',
    'entryExecution',
    'decisionTime',
    'activationIndex',
    'activationPrice',
    'referenceHigh',
    'anchorHigh',
    'trailingLow',
    'exitIndex',
    'exitBar',
    'exitPrice',
    'exitExecution',
    'reason',
    'exitStopPrice',
    'maximumHoldDue',
    'bufferSignalTime'
  ] as const;

  assert.equal(ours.trades.length, theirs.trades.length, 'trade count');

  ours.trades.forEach((trade, index) => {
    const other = theirs.trades[index]!;

    for (const field of fields) {
      const a = trade[field];
      const b = other[field];

      if (typeof a === 'number' && Number.isNaN(a) && typeof b === 'number' && Number.isNaN(b)) {
        continue;
      }

      // The reference leaves the open trade's stop as NaN; this engine records the current level.
      if (field === 'exitStopPrice' && trade.exitIndex < 0) {
        continue;
      }

      assert.deepEqual(a, b, `trade ${index + 1} ${field}`);
    }
  });

  assert.equal(ours.counts.setupActivations, theirs.counts.setupActivations);
  assert.equal(ours.counts.reboundSignals, theirs.counts.reboundSignals);
  assert.equal(ours.counts.overnightOrders, theirs.counts.overnightOrders);
  assert.equal(ours.counts.bufferedLossExits, theirs.counts.bufferedLossExits);
  assert.equal(ours.counts.continuationWindows, theirs.counts.continuationWindows);
  assert.equal(ours.counts.continuationExpiries, theirs.counts.continuationExpiries);

  const options = { firstIndex: 0, endIndex: ds.sessionCount - 1, marginInterestRate: rate };
  const a = replay(ds, ours.trades, options);
  const b = replay(ds, theirs.trades, options);

  assert.equal(a.netProfit, b.netProfit);
  assert.equal(a.minuteDrawdown.maximum, b.minuteDrawdown.maximum);
  assert.equal(a.dailyDrawdown.maximum, b.dailyDrawdown.maximum);

  return { ours, a };
};

describe('equivalence with the recovery-eligibility engine', { timeout: 600000 }, async () => {
  const { ds } = await loadData();

  realData = ds;

  test('Set 2 and D1 on the real data reproduce the shipped figures', () => {
    const base = compare(ds, d1Params(familyOf('base')), false, protocol.eligibilityIndex);

    assert.equal(Math.round(base.a.netProfit), 150630);
    assert.equal(Math.round(base.a.minuteDrawdown.maximum), 21183);
    assert.equal(base.ours.trades.length, 14);

    const d1 = compare(ds, d1Params(familyOf('d1')), true, protocol.eligibilityIndex);

    assert.equal(Math.round(d1.a.netProfit), 183044);
    assert.equal(Math.round(d1.a.minuteDrawdown.maximum), 19331);
    assert.equal(d1.ours.trades.length, 20);
    assert.equal(d1.ours.trades.filter((trade) => trade.kind === 'continuation').length, 6);
  });

  test('arming from session 74 (as the files do) gives the same D1 trades as the common eligibility session', () => {
    const d1 = compare(ds, d1Params(familyOf('d1')), true, 74);

    assert.equal(Math.round(d1.a.netProfit), 183044);
  });

  test('24 random vectors on the real data, both fills and three rates', () => {
    const rng = Rng.from('d1-refinement-equivalence', 'real');

    for (let index = 0; index < 24; index++) {
      const params: IntParams = {
        targetPercentChange: 100 + rng.int(160),
        trailingBuyPercentage: 1 + rng.int(30),
        trailingStopPercentage: 40 + rng.int(80),
        maximumHoldDays: 4 + rng.int(20),
        tickWindowSize: 45 + rng.int(160),
        intradayLossBuffer: rng.int(40),
        pullback: 20 + rng.int(150),
        continuationWindow: 10 + rng.int(200)
      };

      compare(
        ds,
        params,
        index % 2 === 0,
        protocol.eligibilityIndex,
        [0.08, 0.11, 0.14][index % 3]!,
        index % 4 === 1 ? 'next-open' : 'stop'
      );
    }
  });

  test('120 random synthetic scenarios', () => {
    const rng = Rng.from('d1-refinement-equivalence', 'synthetic');

    for (let index = 0; index < 120; index++) {
      const scenario = fixtureDataset(randomScenario(`eq-${index}`, 40 + rng.int(40)));
      const params: IntParams = {
        targetPercentChange: 30 + rng.int(150),
        trailingBuyPercentage: 1 + rng.int(40),
        trailingStopPercentage: 20 + rng.int(100),
        maximumHoldDays: 2 + rng.int(20),
        tickWindowSize: 2 + rng.int(10),
        intradayLossBuffer: rng.int(60),
        pullback: 10 + rng.int(100),
        continuationWindow: 5 + rng.int(40)
      };

      compare(
        scenario,
        params,
        index % 2 === 0,
        2 + rng.int(8),
        [0.08, 0.11, 0.14][index % 3]!,
        index % 3 === 2 ? 'next-open' : 'stop'
      );
    }
  });
});
