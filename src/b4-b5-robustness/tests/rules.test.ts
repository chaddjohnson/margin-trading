// The pre-registered rules (research/b4-b5-robustness-audit/PROTOCOL.md §3, §6, §9) as code: the distance rules on
// every frozen value of B4/B5, infeasible and boundary OAT points, the Latin hypercube's determinism and bounds, the
// immutability of the frozen pools while variants are generated, the run list, the cost layers, and the pure
// statistics helpers (drawdown episodes, the running-peak percentage, break-even interpolation, re-costing, the
// stationary bootstrap).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { Rng } from '../../optimizer/rng.ts';
import { breakEven, episodesOf, percentileRank, quantile, recostLot, stationaryBootstrap } from '../analysis.ts';
import { costScenarios, distancesOf, legal, scenarioById } from '../context.ts';
import { dollarDrawdown, type LotRecord, runningPeakDrawdown } from '../run.ts';
import { allSpecs, applySample, dimensionsOf, latinHypercube, loadFrozenPools, oatPoints } from '../specs.ts';
import { parseCsv, toCsv } from '../store.ts';

const sha256 = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

describe('distance rules (PROTOCOL.md §3)', () => {
  test('percentages ≥ 2.0% use ±0.5/±1.0 pp', () => {
    assert.deepEqual(
      [distancesOf('targetPercentChange', 216).small, distancesOf('targetPercentChange', 216).moderate],
      [5, 10]
    );
    assert.deepEqual(
      [distancesOf('trailingStopPercentage', 31).small, distancesOf('trailingStopPercentage', 31).moderate],
      [5, 10]
    );
    assert.deepEqual(
      [distancesOf('intradayLossBuffer', 20).small, distancesOf('intradayLossBuffer', 20).moderate],
      [5, 10]
    );
  });

  test('percentages < 2.0% use the relative rule, half-up to the 0.1-pp grid', () => {
    const pairs = (v: number, key: Parameters<typeof distancesOf>[0] = 'trailingBuyPercentage') => {
      const { small, moderate } = distancesOf(key, v);

      return [small, moderate];
    };

    assert.deepEqual(pairs(3), [1, 2]); // VGT Y 0.3%
    assert.deepEqual(pairs(12), [3, 6]); // XBI Y 1.2%
    assert.deepEqual(pairs(4), [1, 2]); // GDX Y 0.4%
    assert.deepEqual(pairs(1, 'intradayLossBuffer'), [1, 2]); // XBI buffer 0.1%
    assert.deepEqual(pairs(19), [5, 10]); // 1.9%: 0.25 × 19 = 4.75 → 5; 9.5 → 10
  });

  test('integers use ±max(1, 10%) and ±max(s + 1, 20%)', () => {
    const pairs = (key: Parameters<typeof distancesOf>[0], v: number) => {
      const { small, moderate } = distancesOf(key, v);

      return [small, moderate];
    };

    assert.deepEqual(pairs('maximumHoldDays', 4), [1, 2]);
    assert.deepEqual(pairs('maximumHoldDays', 5), [1, 2]);
    assert.deepEqual(pairs('maximumHoldDays', 8), [1, 2]);
    assert.deepEqual(pairs('maximumHoldDays', 17), [2, 3]);
    assert.deepEqual(pairs('maximumHoldDays', 18), [2, 4]);
    assert.deepEqual(pairs('tickWindowSize', 74), [7, 15]);
    assert.deepEqual(pairs('tickWindowSize', 230), [23, 46]);
    assert.deepEqual(pairs('continuationWindow', 54), [5, 11]);
    assert.deepEqual(pairs('continuationWindow', 81), [8, 16]);
  });

  test('the legal grid is the engine grid', () => {
    assert.deepEqual(legal('targetPercentChange'), { min: 30, max: 300 });
    assert.deepEqual(legal('trailingBuyPercentage'), { min: 1, max: 150 });
    assert.deepEqual(legal('trailingStopPercentage'), { min: 20, max: 150 });
    assert.deepEqual(legal('maximumHoldDays'), { min: 2, max: 60 });
    assert.deepEqual(legal('tickWindowSize'), { min: 20, max: 365 });
    assert.deepEqual(legal('intradayLossBuffer'), { min: 0, max: 60 });
    assert.deepEqual(legal('pullback'), { min: 10, max: 200 });
    assert.deepEqual(legal('continuationWindow'), { min: 5, max: 250 });
  });
});

describe('OAT points and neighbourhoods on the frozen pools', async () => {
  const pools = await loadFrozenPools();

  test('infeasible points are recorded, not replaced; XBI/KRE X upward points are boundary probes', () => {
    const points = oatPoints(pools.B5);
    const find = (symbol: string, key: string, offset: string) =>
      points.find((point) => point.symbol === symbol && point.key === key && point.offset === offset)!;

    assert.equal(points.length, 5 * 8 * 4);
    assert.equal(find('XBI', 'intradayLossBuffer', '-m').feasible, false);
    assert.equal(find('XBI', 'intradayLossBuffer', '-m').value, -1);
    assert.equal(find('XBI', 'intradayLossBuffer', '-s').value, 0);
    assert.equal(find('XBI', 'intradayLossBuffer', '-s').feasible, true);
    assert.equal(find('XBI', 'targetPercentChange', '+s').boundary, true);
    assert.equal(find('XBI', 'targetPercentChange', '+m').value, 310);
    assert.equal(find('KRE', 'targetPercentChange', '+s').boundary, true);
    assert.equal(find('KRE', 'targetPercentChange', '+s').value, 304);
    assert.equal(find('GDX', 'pullback', '+m').feasible, false);
    assert.equal(find('GDX', 'pullback', '+m').boundary, false);
    assert.equal(find('GDX', 'pullback', '+s').value, 196);
    assert.equal(find('KRE', 'maximumHoldDays', '-m').value, 2);
    assert.equal(find('KRE', 'maximumHoldDays', '-m').feasible, true);
    assert.equal(find('KRE', 'tickWindowSize', '+m').value, 276);
    assert.ok(points.every((point) => point.feasible || point.reason.length > 0));
  });

  test('the Latin hypercube is deterministic, inside each legal range and spread over it', () => {
    const dimensions = dimensionsOf(pools.B5.books);
    const first = latinHypercube(dimensions, 64, 'joint', 'B5', 1);
    const again = latinHypercube(dimensions, 64, 'joint', 'B5', 1);
    const other = latinHypercube(dimensions, 64, 'joint', 'B5', 2);

    assert.deepEqual(first, again);
    assert.notDeepEqual(first, other);
    assert.equal(dimensions.length, 40);

    dimensions.forEach((dimension, d) => {
      const column = first.map((sample) => sample[d]!);
      const { min, max } = legal(dimension.key);

      assert.ok(column.every((value) => dimension.values.includes(value) && value >= min && value <= max));
      // Every stratum is used once, so both ends of a range of ≤ 64 values are reached.
      if (dimension.values.length <= 64) {
        assert.ok(column.includes(dimension.values[0]!), `${dimension.symbol} ${dimension.key} low end`);
        assert.ok(column.includes(dimension.values.at(-1)!), `${dimension.symbol} ${dimension.key} high end`);
      }
    });

    const xbiX = dimensions.find((dimension) => dimension.symbol === 'XBI' && dimension.key === 'targetPercentChange')!;

    assert.deepEqual([xbiX.values[0], xbiX.values.at(-1)], [290, 300]); // truncated at the grid ceiling
  });

  test('variants never change the frozen pools or their files', async () => {
    const before = await Promise.all(['config/pools/B4.json', 'config/pools/B5.json'].map(sha256));
    const frozen = JSON.stringify(pools);
    const dimensions = dimensionsOf(pools.B4.books);
    const [sample] = latinHypercube(dimensions, 4, 'joint', 'B4', 1);
    const varied = applySample(pools.B4.books, dimensions, sample!);
    const { specs } = allSpecs(pools);

    assert.equal(JSON.stringify(pools), frozen);
    assert.ok(varied.some((book) => book.phenotype.endsWith('~diag')));
    assert.deepEqual(await Promise.all(['config/pools/B4.json', 'config/pools/B5.json'].map(sha256)), before);
    assert.ok(
      specs
        .filter((spec) => spec.family !== 'base' && spec.family !== 'control' && spec.family !== 'dividends')
        .every((spec) => spec.diagnostic)
    );
  });

  test('the run list: unique keys and the protocol counts', () => {
    const { specs, samples } = allSpecs(pools);
    const count = (family: string) => specs.filter((spec) => spec.family === family).length;

    assert.equal(new Set(specs.map((spec) => spec.key)).size, specs.length);
    assert.equal(count('base'), 4);
    assert.equal(count('control'), 1);
    assert.equal(count('dividends'), 2);
    assert.equal(count('cost'), 2 * 18 * 2);
    assert.equal(count('ablation'), (4 + 5) * 2);
    assert.equal(count('boundary'), 2 * 2 * 2 * 2); // XBI and KRE, two upward points, two pools, two modes
    assert.equal(count('joint'), 2 * 2 * 64 * 2);
    assert.equal(count('book'), (4 + 5) * 32 * 2);
    assert.equal(samples.filter((sample) => sample.design.startsWith('joint')).length, 256);
  });
});

describe('cost layers (PROTOCOL.md §6)', () => {
  test('costBps = fee + slippage, never double-counted; combined scenarios as declared', () => {
    for (const scenario of costScenarios) {
      assert.equal(scenario.costBps, scenario.feeBps + scenario.slippageBps, scenario.id);
    }

    assert.deepEqual(
      ['C1', 'C2', 'C3'].map((id) => {
        const s = scenarioById(id);

        return [s.rate, s.costBps, s.stopSlippageBps];
      }),
      [
        [0.14, 20, 0],
        [0.18, 45, 0],
        [0.18, 45, 50]
      ]
    );
    assert.equal(scenarioById('base').costBps, 5);
    assert.equal(scenarioById('base').rate, 0.11);
  });

  const lot = (exitReason: string): LotRecord => {
    const entryRawPrice = 50;
    const costBps = 5;
    const entryPrice = entryRawPrice * (1 + costBps / 10000);
    const shares = 100000 / entryPrice;
    const exitRawPrice = 55;
    const exitPrice = exitRawPrice * (1 - costBps / 10000);
    const interest = 100000 * 0.11 * (10 / 365);

    return {
      principal: 100000,
      entryRawPrice,
      entryPrice,
      shares,
      exitRawPrice,
      exitPrice,
      exitReason,
      interest,
      net: shares * exitPrice - 100000 - interest
    } as LotRecord;
  };

  test('re-costing the same trade at the base reproduces its net; costs and rates scale with the right sign', () => {
    const stop = lot('trailing stop');
    const hold = lot('maximum hold');

    assert.ok(Math.abs(recostLot(stop, { rate: 0.11, costBps: 5, stopSlippageBps: 0 }) - stop.net) < 1e-9);
    assert.ok(recostLot(stop, { rate: 0.18, costBps: 5, stopSlippageBps: 0 }) < stop.net);
    assert.ok(recostLot(stop, { rate: 0.08, costBps: 5, stopSlippageBps: 0 }) > stop.net);
    assert.ok(recostLot(stop, { rate: 0.11, costBps: 20, stopSlippageBps: 0 }) < stop.net);
    // Interest scales linearly with the rate.
    const at22 = recostLot(stop, { rate: 0.22, costBps: 5, stopSlippageBps: 0 });

    assert.ok(Math.abs(stop.net - at22 - stop.interest) < 1e-9);
    // Stop overshoot touches stop exits only.
    assert.ok(recostLot(stop, { rate: 0.11, costBps: 5, stopSlippageBps: 50 }) < stop.net);
    assert.ok(Math.abs(recostLot(hold, { rate: 0.11, costBps: 5, stopSlippageBps: 50 }) - hold.net) < 1e-9);
  });
});

describe('result tables', () => {
  test('CSV round trip keeps fields with commas, quotes and newlines intact', () => {
    const rows = [
      { a: 'plain', b: '±max(1, 10%·v) / ±max(s+1, 20%·v)', c: 1.5 },
      { a: 'say "hi"', b: 'two\nlines', c: -2 }
    ];
    const parsed = parseCsv(toCsv(rows));

    assert.deepEqual(parsed, [
      { a: 'plain', b: '±max(1, 10%·v) / ±max(s+1, 20%·v)', c: '1.5' },
      { a: 'say "hi"', b: 'two\nlines', c: '-2' }
    ]);
    assert.throws(() => parseCsv('a,b\n1,2,3\n'), /3 fields/);
  });
});

describe('statistics helpers', () => {
  test('running-peak percentage and dollar drawdowns', () => {
    const values = [110, 90, 120, 60, 130];

    assert.deepEqual(runningPeakDrawdown(values, 100), { percent: 0.5, dollars: 60, peakIndex: 2, troughIndex: 3 });
    assert.equal(dollarDrawdown(values, 100), 60);
    // The largest percentage is not always the largest dollar fall.
    const growing = [100, 50, 1000, 600];

    assert.equal(runningPeakDrawdown(growing, 100).percent, 0.5);
    assert.equal(dollarDrawdown(growing, 100), 400);
  });

  test('drawdown episodes: peak, trough, recovery and an unrecovered tail', () => {
    const dates = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
    const episodes = episodesOf(dates, [100, 80, 90, 101, 95, 96], 100, 'd0');

    assert.equal(episodes.length, 2);
    assert.deepEqual(
      [episodes[0]!.peakDate, episodes[0]!.troughDate, episodes[0]!.recoveryDate, episodes[0]!.depthPercent],
      ['d1', 'd2', 'd4', 0.2]
    );
    assert.equal(episodes[1]!.recoveryDate, '');
    assert.ok(Math.abs(episodes[1]!.depthPercent - 6 / 101) < 1e-12);
  });

  test('break-even interpolates a sign change between tested points and never extrapolates', () => {
    assert.deepEqual(
      breakEven([
        { x: 0, y: 10 },
        { x: 10, y: 5 },
        { x: 20, y: -5 }
      ]),
      { x: 15, between: [10, 20] }
    );
    assert.equal(
      breakEven([
        { x: 0, y: 10 },
        { x: 20, y: 1 }
      ]),
      undefined
    );
  });

  test('quantiles and percentile ranks', () => {
    assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
    assert.equal(percentileRank([1, 2, 3, 4], 3), 0.625);
    assert.equal(percentileRank([1, 2, 3, 4], 10), 1);
  });

  test('the stationary bootstrap is deterministic, paired, and preserves a constant series', () => {
    const a = Array.from({ length: 50 }, (_, index) => Math.sin(index));
    const b = a.map((value) => 2 * value);
    const [ta, tb] = stationaryBootstrap([a, b], 5, 200, new Rng([1, 2, 3, 4]));
    const [again] = stationaryBootstrap([a, b], 5, 200, new Rng([1, 2, 3, 4]));

    assert.deepEqual(ta, again);
    ta!.forEach((value, index) => assert.ok(Math.abs(tb![index]! - 2 * value) < 1e-9));

    const [constant] = stationaryBootstrap([Array.from({ length: 30 }, () => 3)], 7, 50, new Rng([5, 6, 7, 8]));

    assert.ok(constant!.every((value) => Math.abs(value - 90) < 1e-9));
  });
});
