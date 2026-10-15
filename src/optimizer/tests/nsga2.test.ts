import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AllInParams } from '../../app/allIn-optimizable.ts';
import type { EvalWindow, Metrics } from '../evaluate.ts';
import { defaultFitness } from '../fitness.ts';
import {
  type Scored,
  constrainedDominates,
  crowdingDistances,
  fastNonDominatedSort,
  hypervolume2d,
  paretoRanks2d,
  selectSurvivors
} from '../nsga2.ts';
import { defaultParameterSpace } from '../params.ts';
import type { Evaluator } from '../pool.ts';
import { Rng } from '../rng.ts';
import { CandidateCache, defaultSearch, runSearch } from '../search.ts';

const point = (id: string, f1: number, f2: number, violation = 0): Scored => ({
  id,
  genome: [],
  objectives: [f1, f2],
  violation
});

describe('constrained domination', () => {
  it('prefers feasible, then lower violation, then Pareto dominance', () => {
    assert.ok(constrainedDominates(point('a', 5, 5), point('b', 0, 0, 0.1)));
    assert.ok(!constrainedDominates(point('b', 0, 0, 0.1), point('a', 5, 5)));
    assert.ok(constrainedDominates(point('a', 9, 9, 0.1), point('b', 0, 0, 0.2)));
    assert.ok(constrainedDominates(point('a', 1, 1), point('b', 1, 2)));
    assert.ok(!constrainedDominates(point('a', 1, 1), point('b', 1, 1)));
    assert.ok(!constrainedDominates(point('a', 1, 3), point('b', 2, 2)));
  });
});

describe('non-dominated sorting and crowding', () => {
  const population = [
    point('a', 1, 5),
    point('b', 2, 3),
    point('c', 4, 1),
    point('d', 2, 5),
    point('e', 5, 5),
    point('f', 0, 0, 1),
    point('g', 3, 3)
  ];

  it('builds the expected fronts with infeasible points last', () => {
    const fronts = fastNonDominatedSort(population).map((front) => front.map((member) => member.id));

    assert.deepEqual(fronts, [['a', 'b', 'c'], ['d', 'g'], ['e'], ['f']]);
  });

  it('gives boundary points infinite crowding and interior points the normalized gap', () => {
    const crowding = crowdingDistances([point('a', 1, 5), point('b', 2, 3), point('c', 4, 1)]);

    assert.equal(crowding.get('a'), Infinity);
    assert.equal(crowding.get('c'), Infinity);
    assert.equal(crowding.get('b'), 1 + 1);
  });

  it('keeps whole better fronts (elitism) and breaks crowding ties by ID', () => {
    const survivors = selectSurvivors(population, 4).map((ranked) => ranked.member.id);

    assert.deepEqual(survivors.slice(0, 3).sort(), ['a', 'b', 'c']);
    assert.equal(survivors.length, 4);
    // d and g tie on rank; both boundary points of their front get Infinity, so the ID decides.
    assert.equal(survivors[3], 'd');
  });

  it('is independent of input order', () => {
    const shuffled = [...population].reverse();

    assert.deepEqual(
      selectSurvivors(shuffled, 5).map((ranked) => ranked.member.id),
      selectSurvivors(population, 5).map((ranked) => ranked.member.id)
    );
  });

  it('agrees with the general sort in the fast two-objective ranking', () => {
    const rng = Rng.from('ranks');
    const points = Array.from({ length: 300 }, (_value, index) =>
      point(`p${String(index).padStart(3, '0')}`, Math.round(rng.next() * 20), Math.round(rng.next() * 20))
    );
    const fronts = fastNonDominatedSort(points);
    const fast = paretoRanks2d(points);

    fronts.forEach((front, rank) => {
      for (const member of front) {
        assert.equal(fast.get(member.id), rank, member.id);
      }
    });
  });

  it('computes the two-objective hypervolume exactly', () => {
    const volume = hypervolume2d(
      [point('a', -0.5, 0.1), point('b', -0.2, 0.05), point('c', -0.1, 0.2), point('d', -1, 0.5)],
      [0, 0.3]
    );

    // Staircase: (-0.5..-0.2) x (0.3-0.1) + (-0.2..0) x (0.3-0.05)
    assert.ok(Math.abs(volume - (0.3 * 0.2 + 0.2 * 0.25)) < 1e-12);
  });
});

// A controlled problem: net P&L peaks at dip 15.0% and stop 10.0%; drawdown grows with the stop.
class SyntheticEvaluator implements Evaluator {
  readonly description = 'synthetic objective';

  register() {}

  release() {}

  async evaluate(_datasetId: string, _window: EvalWindow, params: AllInParams[]) {
    return params.map((entry): Metrics => {
      const net =
        100000 -
        ((entry.dipTenths - 150) ** 2 + (entry.trailingStopTenths - 100) ** 2) * 2 -
        Math.abs(entry.lookbackSessions - 120) * 50;
      const drawdown = 5000 + entry.trailingStopTenths * 60;

      return {
        sessions: 1000,
        netProfit: net,
        grossProfit: net,
        interest: 0,
        realizedProfit: net,
        unrealizedProfit: 0,
        maximumDrawdown: drawdown,
        entries: 20,
        closedTrades: 20,
        openAtEnd: false,
        wins: 10,
        winRate: 0.5,
        profitFactor: 2,
        medianTrade: 0,
        worstTrade: 0,
        bestTrade: 0,
        medianHoldDays: 5,
        exposure: 0.5,
        restrictions: 0,
        lowerPriceReentries: 0,
        recoveryResets: 0,
        years: [{ year: 2014, netProfit: net, maximumDrawdown: drawdown, entries: 20 }],
        signature: JSON.stringify(entry)
      };
    });
  }

  async close() {}
}

describe('NSGA-II on a controlled problem', () => {
  it('improves the hypervolume of the seeded population and finds the optimum region', async () => {
    const cache = new CandidateCache(
      new SyntheticEvaluator(),
      'synthetic',
      { startIndex: 0, endIndex: 1 },
      defaultParameterSpace,
      defaultFitness,
      1
    );
    const result = await runSearch({
      space: defaultParameterSpace,
      search: {
        ...defaultSearch,
        samples: 256,
        populationSize: 32,
        generations: 30,
        gaRuns: 1,
        maxEvaluationsPerGaRun: 5000,
        earlyStopPatience: 1000
      },
      fitness: defaultFitness,
      cache,
      seedLabels: ['synthetic'],
      hypervolumeReference: [0, 0.3]
    });
    const hypervolume = result.gaRuns[0]!.hypervolume;
    const seeded = [...cache.entries.values()].filter((candidate) => result.seeded.includes(candidate.id));
    const best = [...cache.entries.values()].sort((a, b) => b.metrics.netProfit - a.metrics.netProfit)[0]!;

    assert.ok(hypervolume.at(-1)! > hypervolume2d(seeded, [0, 0.3]), 'hypervolume did not improve');
    assert.ok(
      Math.abs(best.params.dipTenths - 150) <= 5 && Math.abs(best.params.trailingStopTenths - 100) <= 5,
      JSON.stringify(best.params)
    );
  });

  it('is reproducible for a seed', async () => {
    const run = async () => {
      const cache = new CandidateCache(
        new SyntheticEvaluator(),
        'synthetic',
        { startIndex: 0, endIndex: 1 },
        defaultParameterSpace,
        defaultFitness,
        1
      );
      const result = await runSearch({
        space: defaultParameterSpace,
        search: { ...defaultSearch, samples: 128, populationSize: 16, generations: 10, gaRuns: 2 },
        fitness: defaultFitness,
        cache,
        seedLabels: ['repro'],
        hypervolumeReference: [0, 0.3]
      });

      return { result, ids: [...cache.entries.keys()] };
    };
    const a = await run();
    const b = await run();

    assert.deepEqual(a.ids, b.ids);
    assert.deepEqual(a.result, b.result);
  });
});
