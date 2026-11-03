// The selection policy: gates, neighbourhood merit, deterministic ranks, behavioural duplicates, diversity
// and short lists.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AllInParams } from '../../app/allIn-optimizable.ts';
import type { EvalWindow, Metrics } from '../evaluate.ts';
import { defaultFitness } from '../fitness.ts';
import { type Genome, defaultParameterSpace, genomeToParams, originalGenome } from '../params.ts';
import type { Evaluator } from '../pool.ts';
import { CandidateCache } from '../search.ts';
import { defaultSelection, selectShortlist } from '../selection.ts';

const space = defaultParameterSpace;

// Net P&L rises with the dip until 15%; drawdown rises with the stop; trades fall to zero above a 30% dip;
// the trade list depends only on dip and stop, so other parameters create behavioural duplicates.
const metricsFor = (params: AllInParams): Metrics => {
  const net = 50000 + Math.min(params.dipTenths, 150) * 500 - Math.max(0, params.dipTenths - 150) * 800;
  const drawdown = 10000 + params.trailingStopTenths * 100;
  const entries = params.dipTenths > 300 ? 0 : 25;

  return {
    sessions: 2500,
    netProfit: entries ? net : 0,
    grossProfit: net,
    interest: 0,
    realizedProfit: net,
    unrealizedProfit: 0,
    maximumDrawdown: entries ? drawdown : 0,
    entries,
    closedTrades: entries,
    openAtEnd: false,
    wins: 10,
    winRate: entries ? 0.4 : NaN,
    profitFactor: 2,
    medianTrade: 0,
    worstTrade: 0,
    bestTrade: 0,
    medianHoldDays: 5,
    exposure: 0.4,
    restrictions: 0,
    lowerPriceReentries: 0,
    recoveryResets: 0,
    years: Array.from({ length: 10 }, (_value, index) => ({
      year: 2014 + index,
      netProfit: entries ? net / 10 : 0,
      maximumDrawdown: 0,
      entries: 2
    })),
    signature: `${params.dipTenths}:${params.trailingStopTenths}`
  };
};

class ModelEvaluator implements Evaluator {
  readonly description = 'model';
  calls = 0;

  register() {}

  release() {}

  async evaluate(_datasetId: string, _window: EvalWindow, params: AllInParams[]) {
    this.calls++;

    return params.map(metricsFor);
  }

  async close() {}
}

const genomeWith = (changes: Partial<Record<keyof AllInParams, number>>): Genome => {
  const genome = originalGenome(space);

  space.specs.forEach((spec, dimension) => {
    const value = changes[spec.key];

    if (value !== undefined) {
      genome[dimension] = (value - spec.min) / spec.step;
    }
  });

  return genome;
};

const fill = async (cache: CandidateCache, genomes: Genome[]) =>
  cache.evaluate(
    genomes,
    genomes.map((_genome, index) => ({ stage: 'sobol', index }))
  );

describe('selection policy', () => {
  it('excludes zero-trade and over-limit candidates and ranks by neighbourhood merit', async () => {
    const cache = new CandidateCache(
      new ModelEvaluator(),
      'm',
      { startIndex: 0, endIndex: 1 },
      space,
      defaultFitness,
      10
    );
    const genomes = [
      genomeWith({ dipTenths: 350 }), // no trades
      genomeWith({ dipTenths: 150, trailingStopTenths: 300 }), // drawdown 40,000 > 30,000
      ...[60, 90, 120, 150, 180].map((dip) => genomeWith({ dipTenths: dip, trailingStopTenths: 50 }))
    ];

    await fill(cache, genomes);

    const result = await selectShortlist(cache, space, defaultFitness, 10, { ...defaultSelection, topN: 5 });
    const ids = result.shortlist.map((entry) => entry.id);
    const params = result.shortlist.map((entry) => genomeToParams(space, cache.entries.get(entry.id)!.genome));

    assert.ok(!params.some((entry) => entry.dipTenths === 350));
    assert.ok(!params.some((entry) => entry.trailingStopTenths === 300));
    assert.equal(params[0]!.dipTenths, 150, 'the plateau top should rank first');
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(
      result.shortlist.map((entry) => entry.rank),
      result.shortlist.map((_entry, index) => index + 1)
    );
    assert.ok(result.rejectionCounts.trades! >= 1 && result.rejectionCounts.drawdown! >= 1);
  });

  it('drops behavioural duplicates and uses the relaxed pass only when needed', async () => {
    const cache = new CandidateCache(
      new ModelEvaluator(),
      'm',
      { startIndex: 0, endIndex: 1 },
      space,
      defaultFitness,
      10
    );
    const genomes = [
      // Five vectors with the same trades (only the retrace differs): one may be shortlisted.
      ...[100, 200, 300, 400, 500].map((retrace) =>
        genomeWith({ dipTenths: 150, trailingStopTenths: 50, retraceTenths: retrace })
      ),
      // Close neighbours that trade differently.
      genomeWith({ dipTenths: 149, trailingStopTenths: 50 }),
      genomeWith({ dipTenths: 148, trailingStopTenths: 50 }),
      genomeWith({ dipTenths: 100, trailingStopTenths: 80 })
    ];

    await fill(cache, genomes);

    const result = await selectShortlist(cache, space, defaultFitness, 10, { ...defaultSelection, topN: 4 });
    const signatures = result.shortlist.map((entry) => cache.entries.get(entry.id)!.metrics.signature);

    assert.equal(new Set(signatures).size, signatures.length, 'no two shortlisted candidates may trade identically');
    assert.ok(result.shortlist.some((entry) => entry.inclusion === 'diversity relaxed'));
    assert.ok(result.shortlist[0]!.behaviouralDuplicates >= 1);
    assert.equal(result.shortlist.length, 4);
  });

  it('returns fewer than N, with a note, when few candidates qualify', async () => {
    const cache = new CandidateCache(
      new ModelEvaluator(),
      'm',
      { startIndex: 0, endIndex: 1 },
      space,
      defaultFitness,
      10
    );

    await fill(cache, [genomeWith({ dipTenths: 120, trailingStopTenths: 50 }), genomeWith({ dipTenths: 350 })]);

    const result = await selectShortlist(cache, space, defaultFitness, 10, { ...defaultSelection, topN: 10 });

    assert.equal(result.shortlist.length, 1);
    assert.match(result.notes[0]!, /Only 1 distinct candidates/);
  });

  it('returns an empty shortlist when nothing qualifies', async () => {
    const cache = new CandidateCache(
      new ModelEvaluator(),
      'm',
      { startIndex: 0, endIndex: 1 },
      space,
      defaultFitness,
      10
    );

    await fill(cache, [genomeWith({ dipTenths: 350 }), genomeWith({ dipTenths: 360 })]);

    const result = await selectShortlist(cache, space, defaultFitness, 10, defaultSelection);

    assert.equal(result.shortlist.length, 0);
  });

  it('is deterministic regardless of insertion order', async () => {
    const genomes = [60, 90, 120, 150, 180, 210, 240].flatMap((dip) =>
      [30, 50, 70].map((stop) => genomeWith({ dipTenths: dip, trailingStopTenths: stop }))
    );
    const run = async (order: Genome[]) => {
      const cache = new CandidateCache(
        new ModelEvaluator(),
        'm',
        { startIndex: 0, endIndex: 1 },
        space,
        defaultFitness,
        10
      );

      await fill(cache, order);

      return (await selectShortlist(cache, space, defaultFitness, 10, { ...defaultSelection, topN: 6 })).shortlist;
    };
    const forward = await run(genomes);
    const backward = await run([...genomes].reverse());

    assert.deepEqual(
      forward.map((entry) => [entry.rank, entry.id]),
      backward.map((entry) => [entry.rank, entry.id])
    );
  });
});
