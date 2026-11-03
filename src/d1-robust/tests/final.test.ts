// A smoke run of the final round on the synthetic universe with small budgets (PROTOCOL.md §8–§14): the unseeded and
// benchmark-seeded J arms keep separate archives and logs, the seeded arm's initial population holds B1, B4 and B5,
// promotion is pooled across both arms, every finalist carries the final-round gates G1–G8 (G6 and G7 included), and
// the nominations follow §14 (a primary is never capacity-limited or box-constrained). Mechanics only.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { nearBenchmark } from '../assess.ts';
import { canonicalBooks, keyOf } from '../evaluate.ts';
import { RobustEvaluator } from '../evaluator.ts';
import { runRound } from '../round.ts';
import { floorReferences } from '../stats.ts';
import { benchmarks, libraryOf, noCapacity, smokeTier, symbols, synthetic } from './synthetic.ts';

let dir = '';

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'robust-d1-final-'));
});

after(async () => {
  await fs.remove(dir);
});

describe('the final round on a synthetic universe', () => {
  test('two J arms, the seeded population, pooled promotion, the final gates and §14 nominations', async () => {
    const loaded = synthetic();
    const bench = benchmarks(libraryOf());
    const evaluator = await RobustEvaluator.create(loaded, 'final', 2);

    try {
      const outcome = await runRound(
        evaluator,
        loaded,
        {
          round: 'final',
          tier: smokeTier,
          universe: symbols,
          benchmarks: bench,
          outDir: dir,
          smoke: { budget: 160, islandCap: 12, promotionTop: 12, refineCap: 12, families: 2 },
          capacity: noCapacity
        },
        { window: 'final', references: floorReferences(), discoveryDraws: 4, bodyHash: 'smoke' }
      );

      assert.deepEqual(Object.keys(outcome.archives).sort(), ['seeded', 'unseeded']);
      assert.deepEqual(Object.keys(outcome.results), ['pooled']);
      assert.notEqual(outcome.archives.unseeded, outcome.archives.seeded, 'the arms never share an archive');

      for (const arm of ['unseeded', 'seeded']) {
        assert.ok(await fs.pathExists(path.join(dir, arm, 'discovery.jsonl')), `${arm} logs its evaluations`);
      }

      for (const key of ['B1', 'B4', 'B5'] as const) {
        const benchmarkKey = keyOf(canonicalBooks(bench[key]));

        assert.ok(outcome.archives.seeded!.entries.has(benchmarkKey), `the seeded arm evaluates ${key}`);
      }

      const assessment = await fs.readJson(path.join(dir, 'pooled', 'assessment.json'));

      assert.ok(assessment.finalists.length > 0);

      for (const finalist of assessment.finalists) {
        assert.deepEqual(
          finalist.gates.map((gate: { gate: string }) => gate.gate),
          ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8']
        );
        assert.ok(['unseeded', 'seeded'].includes(finalist.provenance));
        assert.ok(
          Number.isFinite(finalist.c0.drawdownOnCandidateDates),
          'C0 is measured on the finalist drawdown dates'
        );
      }

      const { order, nominees } = outcome.results.pooled!;
      const primary = nominees.find((nominee) => nominee.role === 'primary');

      for (const nominee of nominees) {
        assert.ok(
          order.some((row) => row.assessment.key === nominee.key),
          'every nominee passed G1–G8'
        );
      }

      if (primary) {
        const row = order.find((item) => item.assessment.key === primary.key)!;

        assert.ok(!row.assessment.labels.includes('capacity-limited'));
        assert.ok(!row.assessment.labels.includes('box-constrained'));
      }
    } finally {
      await evaluator.close();
    }
  });

  test('a configuration within two step units of a benchmark on half its membership is its neighbour', () => {
    const bench = benchmarks(libraryOf());
    const b5 = bench.B5;
    const moved = b5.map((book, i) =>
      i === 0
        ? {
            ...book,
            vector: {
              ...book.vector,
              grid: { ...book.vector.grid, targetPercentChange: book.vector.grid.targetPercentChange + 10 }
            }
          }
        : book
    );
    const far = b5.map((book, i) =>
      i === 0
        ? {
            ...book,
            vector: {
              ...book.vector,
              grid: { ...book.vector.grid, targetPercentChange: book.vector.grid.targetPercentChange + 15 }
            }
          }
        : book
    );

    assert.ok(nearBenchmark(moved, b5), 'two step units on one coordinate');
    assert.ok(!nearBenchmark(far, b5), 'three step units on one coordinate');
    assert.ok(!nearBenchmark(b5.slice(0, 2), b5), 'two of five members: Jaccard distance 0.6');
    assert.ok(nearBenchmark(b5.slice(0, 3), b5), 'three of five members: Jaccard distance 0.4');
  });
});
