// With every mechanism off, the recovery-eligibility engine equals the trailing-buy-variants engine on file 4's
// family (which that program verified against src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts): identical
// trades, counts and accounting on random lattice vectors on the real data and on synthetic scenarios.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import type { MarketSession } from '#types';
import {
  type Dataset,
  ReferenceHighCache,
  defaultDataFile,
  fixtureDataset,
  loadSessions
} from '../../four-family/data.ts';
import { randomScenario } from '../../four-family/tests/fixtures.ts';
import { Rng } from '../../optimizer/rng.ts';
import { replay } from '../../trailing-buy-variants/accounting.ts';
import { simulate as simulateVariants } from '../../trailing-buy-variants/engine.ts';
import { families as variantFamilies, toStrategyParams } from '../../trailing-buy-variants/families.ts';
import { simulate } from '../engine.ts';
import { type IntParams, families, familySpecs, genomeToParams, gridSize, toParams } from '../families.ts';

let ds: Dataset;

before(async () => {
  const sessions: MarketSession[] = await loadSessions(defaultDataFile);

  ds = fixtureDataset(sessions);
});

const base = families.base!;
const variantBase = variantFamilies.bufferedLossNoReentry!;

const randomParams = (rng: Rng): IntParams =>
  genomeToParams(
    base,
    familySpecs(base).map((spec) => rng.int(gridSize(spec)))
  );

const compare = (
  dataset: Dataset,
  intParams: IntParams,
  settings: { stopFill: 'stop' | 'next-open'; marginInterestRate: number; armStart: number; endIndex: number }
) => {
  const params = toParams(base, intParams);
  const theirParams = toStrategyParams(variantBase, {
    targetPercentChange: intParams.targetPercentChange,
    trailingBuyPercentage: intParams.trailingBuyPercentage,
    trailingStopPercentage: intParams.trailingStopPercentage,
    maximumHoldDays: intParams.maximumHoldDays,
    tickWindowSize: intParams.tickWindowSize,
    intradayLossBuffer: intParams.intradayLossBuffer
  });
  const highs = new ReferenceHighCache(dataset).get(params.tickWindowSize);
  const run = { ...settings, investment: 100000, firstIndex: 0 };
  const ours = simulate(dataset, highs, base.flags, params, run, true);
  const theirs = simulateVariants(dataset, highs, variantBase.flags, theirParams, run, true);

  assert.equal(ours.trades.length, theirs.trades.length, 'trade count');

  ours.trades.forEach((trade, index) => {
    const other = theirs.trades[index]!;

    for (const field of Object.keys(trade) as (keyof typeof trade)[]) {
      if (field === 'kind' || field === 'anchorHigh') {
        continue;
      }

      const a = trade[field];
      const b = other[field as keyof typeof other];

      assert.ok(
        (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) || a === b,
        `trade ${index + 1} ${field}: ${String(a)} vs ${String(b)}`
      );
    }

    assert.equal(trade.kind, 'deep');
    assert.equal(trade.anchorHigh, trade.referenceHigh);
  });

  for (const field of [
    'setupActivations',
    'setupFills',
    'armedAtEnd',
    'pendingAtEnd',
    'reboundSignals',
    'overnightOrders',
    'entriesWithoutTrade',
    'losingExits',
    'bufferedLossExits',
    'pendingBufferedExitAtEnd'
  ] as const) {
    assert.equal(ours.counts[field], theirs.counts[field], `count ${field}`);
  }

  const options = { firstIndex: 0, endIndex: settings.endIndex, marginInterestRate: settings.marginInterestRate };
  const ourAccounting = replay(dataset, ours.trades, options);
  const theirAccounting = replay(dataset, theirs.trades, options);

  assert.equal(ourAccounting.netProfit, theirAccounting.netProfit);
  assert.equal(ourAccounting.minuteDrawdown.maximum, theirAccounting.minuteDrawdown.maximum);
  assert.equal(ourAccounting.dailyDrawdown.maximum, theirAccounting.dailyDrawdown.maximum);

  return ours.trades.length;
};

describe('equivalence with the trailing-buy-variants engine (every mechanism off)', () => {
  test('Set 2 and 24 random lattice vectors on the real data', () => {
    const rng = Rng.from('recovery-eligibility', 'equivalence', 'real');
    const set2: IntParams = {
      targetPercentChange: 216,
      trailingBuyPercentage: 3,
      trailingStopPercentage: 73,
      maximumHoldDays: 8,
      tickWindowSize: 74,
      intradayLossBuffer: 29
    };
    let trades = compare(ds, set2, {
      stopFill: 'stop',
      marginInterestRate: 0.11,
      armStart: 74,
      endIndex: ds.sessionCount - 1
    });

    assert.equal(trades, 14);

    for (let index = 0; index < 24; index++) {
      trades += compare(ds, randomParams(rng), {
        stopFill: rng.next() < 0.5 ? 'stop' : 'next-open',
        marginInterestRate: [0.08, 0.11, 0.14][rng.int(3)]!,
        armStart: rng.next() < 0.5 ? 365 : 180,
        endIndex: ds.sessionCount - 1 - rng.int(400)
      });
    }

    assert.ok(trades > 24, `only ${trades} trades across the vectors`);
  });

  test('120 random synthetic scenarios', () => {
    const rng = Rng.from('recovery-eligibility', 'equivalence', 'synthetic');
    let trades = 0;

    for (let index = 0; index < 120; index++) {
      const scenario = fixtureDataset(randomScenario(`recovery-equivalence-${index}`, 40 + rng.int(60)));
      const params = randomParams(rng);

      params.tickWindowSize = 5 + rng.int(20);
      trades += compare(scenario, params, {
        stopFill: rng.next() < 0.5 ? 'stop' : 'next-open',
        marginInterestRate: 0.11,
        armStart: params.tickWindowSize + rng.int(5),
        endIndex: scenario.sessionCount - 1
      });
    }

    assert.ok(trades > 50, `only ${trades} trades across the scenarios`);
  });
});
