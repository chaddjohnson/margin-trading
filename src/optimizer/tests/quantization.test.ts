// Every candidate the optimizer can produce, store or evaluate is exactly on the grid: percentages in whole
// tenths of a percentage point, durations in whole days or sessions.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AllInParams } from '../../app/allIn-optimizable.ts';
import { originalParams, tenthsToFraction } from '../../app/allIn-optimizable.ts';
import type { EvalWindow, Metrics } from '../evaluate.ts';
import { defaultFitness } from '../fitness.ts';
import { polynomialMutation, sbx } from '../nsga2.ts';
import {
  type ParameterSpace,
  assertOnGrid,
  candidateId,
  canonicalKey,
  defaultParameterSpace,
  genomeToParams,
  gridSize,
  neighbourGenomes,
  originalGenome,
  paramsToGenome,
  repairGenome
} from '../params.ts';
import type { Evaluator } from '../pool.ts';
import { Rng } from '../rng.ts';
import { CandidateCache, defaultSearch, explorationGenomes } from '../search.ts';

const space = defaultParameterSpace;

const assertQuantized = (params: AllInParams) => {
  for (const spec of space.specs) {
    const value = params[spec.key];

    assert.ok(Number.isInteger(value), `${spec.key}=${value} is not an integer`);
    assert.ok(value >= spec.min && value <= spec.max, `${spec.key}=${value} outside ${spec.min}..${spec.max}`);
  }
};

// Records exactly what reaches the simulator.
class RecordingEvaluator implements Evaluator {
  readonly description = 'recording';
  readonly seen: AllInParams[] = [];

  register() {}

  release() {}

  async evaluate(_datasetId: string, _window: EvalWindow, params: AllInParams[]) {
    this.seen.push(...params.map((entry) => ({ ...entry })));

    return params.map((entry): Metrics => ({
      sessions: 100,
      netProfit: entry.dipTenths,
      grossProfit: entry.dipTenths,
      interest: 0,
      realizedProfit: 0,
      unrealizedProfit: 0,
      maximumDrawdown: entry.trailingStopTenths,
      entries: 10,
      closedTrades: 10,
      openAtEnd: false,
      wins: 5,
      winRate: 0.5,
      profitFactor: 1,
      medianTrade: 0,
      worstTrade: 0,
      bestTrade: 0,
      medianHoldDays: 1,
      exposure: 0.5,
      restrictions: 0,
      lowerPriceReentries: 0,
      recoveryResets: 0,
      years: [],
      signature: canonicalKey(space, entry)
    }));
  }

  async close() {}
}

describe('parameter grid', () => {
  it('has the original defaults on the grid, converted exactly', () => {
    assert.deepEqual(genomeToParams(space, originalGenome(space)), originalParams);
    assert.equal(tenthsToFraction(100), 0.1);
    assert.equal(tenthsToFraction(80), 0.08);
    assert.equal(tenthsToFraction(5), 0.005);
    assert.equal(tenthsToFraction(30), 0.03);
    assert.equal(tenthsToFraction(380), 0.38);
    assert.equal(tenthsToFraction(105), 0.105);
  });

  it('accepts 10.5% and rejects 10.59%', () => {
    assert.doesNotThrow(() => assertOnGrid(space, { ...originalParams, dipTenths: 105 }));
    assert.throws(() => assertOnGrid(space, { ...originalParams, dipTenths: 105.9 }));
    assert.throws(() => assertOnGrid(space, { ...originalParams, maximumHoldDays: 14.5 }));
    assert.throws(() => assertOnGrid(space, { ...originalParams, dipTenths: 10 }));
  });

  it('round-trips every boundary value and rejects off-grid genomes', () => {
    for (const spec of space.specs) {
      const params = { ...originalParams, [spec.key]: spec.max };

      assert.deepEqual(genomeToParams(space, paramsToGenome(space, params)), params);
    }

    assert.throws(() =>
      genomeToParams(
        space,
        originalGenome(space).map((gene, index) => (index === 0 ? gene + 0.5 : gene))
      )
    );
    assert.throws(() =>
      genomeToParams(
        space,
        originalGenome(space).map((gene, index) => (index === 0 ? -1 : gene))
      )
    );
  });

  it('gives identical vectors identical IDs and different vectors different IDs', () => {
    const a = candidateId(space, { ...originalParams });
    const b = candidateId(space, { ...originalParams });
    const c = candidateId(space, { ...originalParams, retraceTenths: 381 });

    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it('repairs out-of-range genes by clamping and counts the repairs', () => {
    const { genome, repairs } = repairGenome(space, [-3, 10_000, 5.4, 0, 0, 0, 0]);

    assert.equal(repairs, 2);
    assert.deepEqual(genome.slice(0, 3), [0, gridSize(space.specs[1]!) - 1, 5]);
  });

  it('keeps neighbours on the grid', () => {
    for (const neighbour of neighbourGenomes(space, originalGenome(space))) {
      assertQuantized(genomeToParams(space, neighbour));
    }

    assert.equal(neighbourGenomes(space, originalGenome(space)).length, 14);
    assert.ok(
      neighbourGenomes(
        space,
        space.specs.map(() => 0)
      ).length < 14
    );
  });
});

describe('quantization through sampling and variation', () => {
  it('maps every Sobol and random sample onto the grid, uniquely', () => {
    for (const sampler of ['sobol', 'random'] as const) {
      const { genomes, summary } = explorationGenomes(space, { ...defaultSearch, sampler, samples: 1024 }, [
        'quantization',
        sampler
      ]);

      assert.equal(genomes.length, 1024);
      assert.equal(new Set(genomes.map((genome) => genome.join(','))).size, 1024);
      assert.equal(summary.unique, 1024);

      for (const genome of genomes) {
        assertQuantized(genomeToParams(space, genome));
      }
    }
  });

  it('keeps crossover and mutation children on the grid', () => {
    const rng = Rng.from('variation');
    let parentA = originalGenome(space);
    let parentB = space.specs.map((spec) => gridSize(spec) - 1);

    for (let index = 0; index < 2000; index++) {
      const { children } = sbx(space, parentA, parentB, rng, { ...defaultSearch, crossoverProbability: 1 });

      for (const child of children) {
        const mutated = polynomialMutation(space, child, rng, { ...defaultSearch, mutationProbability: 0.5 });

        assertQuantized(genomeToParams(space, mutated.genome));
        assert.ok(mutated.genome.every(Number.isInteger));
      }

      [parentA, parentB] = children as [number[], number[]];
    }
  });

  it('exhausts a small space instead of claiming more unique samples than exist', () => {
    const tiny: ParameterSpace = {
      name: 'tiny',
      specs: space.specs.map((spec) => ({
        ...spec,
        min: spec.min,
        max: spec.min + spec.step * (spec.key === 'dipTenths' ? 2 : 0)
      }))
    };
    const { genomes, summary } = explorationGenomes(tiny, { ...defaultSearch, samples: 4096 }, ['tiny']);

    assert.equal(genomes.length, 3);
    assert.equal(summary.exhausted, true);
    assert.equal(summary.spaceSize, 3);
  });
});

describe('evaluation cache', () => {
  it('passes exactly the quantized vector to the simulator and simulates each candidate once', async () => {
    const evaluator = new RecordingEvaluator();
    const cache = new CandidateCache(evaluator, 'x', { startIndex: 0, endIndex: 10 }, space, defaultFitness, 1);
    const genome = originalGenome(space);
    const first = await cache.evaluate(
      [genome, genome, [...genome]],
      [{ stage: 'baseline' }, { stage: 'baseline' }, { stage: 'baseline' }]
    );

    assert.equal(cache.simulations, 1);
    assert.equal(evaluator.seen.length, 1);
    assert.deepEqual(evaluator.seen[0], originalParams);
    assert.equal(first[0], first[1]);

    await cache.evaluate([genome], [{ stage: 'baseline' }]);
    assert.equal(cache.simulations, 1);
  });
});
