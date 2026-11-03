// With every mechanism off, the variants engine and accounting equal the four-family engine and accounting
// (which the previous program verified against the strategy files): identical trades, counts, outcomes and
// drawdowns on random lattice vectors of all four base families on the real research data, and on synthetic
// scenarios.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import type { MarketSession } from '#types';
import { replay as replayFour } from '../../four-family/accounting.ts';
import {
  type Dataset,
  ReferenceHighCache,
  defaultDataFile,
  loadSessions,
  researchDataset
} from '../../four-family/data.ts';
import { simulate as simulateFour } from '../../four-family/engine.ts';
import { families as fourFamilies } from '../../four-family/families.ts';
import { randomScenario } from '../../four-family/tests/fixtures.ts';
import { fixtureDataset } from '../../four-family/data.ts';
import { Rng } from '../../optimizer/rng.ts';
import { replay } from '../accounting.ts';
import { simulate } from '../engine.ts';
import { type IntParams, families, familySpecs, genomeToParams, gridSize, toStrategyParams } from '../families.ts';

let sessions: MarketSession[];
let ds: Dataset;

before(async () => {
  sessions = (await loadSessions(defaultDataFile)).filter((session) => session.date <= '2023-12-29');
  ds = researchDataset(sessions, 'test', '2023-12-29');
});

const baseKeys = ['trailingBuy', 'bufferedLoss', 'noReentry', 'bufferedLossNoReentry'] as const;

const randomParams = (rng: Rng, key: string): IntParams => {
  const family = families[key]!;

  return genomeToParams(
    family,
    familySpecs(family).map((spec) => rng.int(gridSize(spec)))
  );
};

const compare = (
  dataset: Dataset,
  key: (typeof baseKeys)[number],
  intParams: IntParams,
  settings: {
    stopFill: 'stop' | 'next-open';
    marginInterestRate: number;
    armStart: number;
    endIndex: number;
  }
) => {
  const family = families[key]!;
  const params = toStrategyParams(family, intParams);
  const highs = new ReferenceHighCache(dataset).get(params.tickWindowSize);
  const run = { ...settings, investment: 100000, firstIndex: 0 };
  const ours = simulate(dataset, highs, family.flags, params, run, true);
  const theirs = simulateFour(dataset, highs, fourFamilies[key].flags, params, run, true);

  assert.equal(ours.trades.length, theirs.trades.length);

  ours.trades.forEach((trade, index) => {
    const other = theirs.trades[index]!;

    for (const field of Object.keys(other) as (keyof typeof other)[]) {
      const a = trade[field as keyof typeof trade];
      const b = other[field];

      assert.ok(
        (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) || a === b,
        `${key} trade ${index + 1} ${field}: ${String(a)} vs ${String(b)}`
      );
    }

    assert.equal(trade.legs.length, 1);
  });

  for (const field of Object.keys(theirs.counts) as (keyof typeof theirs.counts)[]) {
    assert.equal(ours.counts[field], theirs.counts[field], `${key} count ${field}`);
  }

  assert.deepEqual(ours.setups, theirs.setups);

  const segments = [{ label: 'main', start: settings.armStart, end: settings.endIndex }];
  const a = replay(dataset, ours.trades, {
    firstIndex: 0,
    endIndex: settings.endIndex,
    marginInterestRate: settings.marginInterestRate,
    segments,
    dailyMarks: true
  });
  const b = replayFour(dataset, theirs.trades, {
    firstIndex: 0,
    endIndex: settings.endIndex,
    marginInterestRate: settings.marginInterestRate,
    segments,
    dailyMarks: true
  });

  assert.equal(a.netProfit, b.netProfit);
  assert.equal(a.realizedProfit, b.realizedProfit);
  assert.equal(a.closedInterest, b.closedInterest);
  assert.equal(a.accruedInterest, b.accruedInterest);
  assert.deepEqual(a.minuteDrawdown, b.minuteDrawdown);
  assert.deepEqual(a.dailyDrawdown, b.dailyDrawdown);
  assert.deepEqual([...a.dailyMarks!], [...b.dailyMarks!]);
  a.outcomes.forEach((outcome, index) => {
    const other = b.outcomes[index]!;

    assert.equal(outcome.profit, other.profit);
    assert.equal(outcome.interest, other.interest);
    assert.equal(outcome.holdDays, other.holdDays);
    assert.equal(outcome.isOpen, other.isOpen);
  });
  a.segments.forEach((segment, index) => {
    const other = b.segments[index]!;

    assert.equal(segment.net, other.net);
    assert.equal(segment.interest, other.interest);
    assert.deepEqual(segment.minuteDrawdown, other.minuteDrawdown);
    assert.deepEqual(segment.dailyDrawdown, other.dailyDrawdown);
    assert.equal(segment.heldAtCloseSessions, other.heldAtCloseSessions);
  });

  return ours.trades.length;
};

describe('mechanisms off: the variants engine is the four-family engine', () => {
  test('real data, 40 random lattice vectors per base family', () => {
    const rng = Rng.from('trailing-buy-variants-equivalence');
    let trades = 0;

    for (const key of baseKeys) {
      for (let index = 0; index < 40; index++) {
        trades += compare(ds, key, randomParams(rng, key), {
          stopFill: rng.next() < 0.5 ? 'stop' : 'next-open',
          marginInterestRate: [0.08, 0.11, 0.14][rng.int(3)]!,
          armStart: 180,
          endIndex: rng.next() < 0.5 ? ds.sessionCount - 1 : 900 + rng.int(1000)
        });
      }
    }

    assert.ok(trades > 500, `only ${trades} trades compared`);
  });

  test('the Trades2 phenotype on the research data', () => {
    compare(
      ds,
      'bufferedLossNoReentry',
      {
        targetPercentChange: 200,
        trailingBuyPercentage: 5,
        trailingStopPercentage: 78,
        maximumHoldDays: 11,
        tickWindowSize: 104,
        intradayLossBuffer: 2
      },
      { stopFill: 'stop', marginInterestRate: 0.11, armStart: 180, endIndex: ds.sessionCount - 1 }
    );
  });

  test('synthetic scenarios, 120 random paths', () => {
    const rng = Rng.from('trailing-buy-variants-synthetic');

    for (let scenario = 0; scenario < 120; scenario++) {
      const fixture = fixtureDataset(randomScenario(`v${scenario}`, 70 + rng.int(40)));
      const key = baseKeys[scenario % 4]!;
      const family = families[key]!;
      const params = genomeToParams(
        family,
        familySpecs(family).map((spec) => rng.int(gridSize(spec)))
      );

      // Small lookbacks and shallow dips so that the short synthetic paths trade.
      params.tickWindowSize = 45;
      params.targetPercentChange = 50 + rng.int(40);
      params.trailingBuyPercentage = 1 + rng.int(20);
      params.maximumHoldDays = 3 + rng.int(8);

      compare(fixture, key, params, {
        stopFill: rng.next() < 0.5 ? 'stop' : 'next-open',
        marginInterestRate: 0.11,
        armStart: Math.min(46 + rng.int(5), fixture.sessionCount - 10),
        endIndex: fixture.sessionCount - 1
      });
    }
  });
});
