import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { genomeToParams, spaces } from '../params.ts';
import { type Evaluator, LocalEvaluator, WorkerPool } from '../pool.ts';
import { CandidateCache, runSearch, searchConfig } from '../search.ts';
import { selectFromArchive } from '../selection.ts';
import { barsFrom, volatileWalk } from './helpers.ts';

const bars = barsFrom(volatileWalk('determinism', 900));
const dataset = { id: 'walk', ...bars };

const search = async (evaluator: Evaluator, family: 'fixed' | 'atr') => {
  evaluator.register(dataset);

  const cache = new CandidateCache(evaluator, spaces[family], {
    datasetId: 'walk',
    foldId: 'test',
    startIndex: 200,
    endIndex: 899,
    years: 2
  });
  const output = await runSearch(
    spaces[family],
    cache,
    { ...searchConfig, samples: 96, populationSize: 16, generations: 4 },
    ['determinism', family],
    []
  );
  const archive = [...cache.entries.values()];
  const selection = await selectFromArchive(spaces[family], cache, archive, { net: 0, dd: 50000 }, 8, 16);

  await evaluator.close();

  return JSON.stringify({
    output,
    archive: archive.map((candidate) => [candidate.id, candidate.metrics, candidate.origin]),
    picks: selection.picks
  });
};

describe('reproducibility', () => {
  test('a search gives identical results in-process and on 1 or 3 worker threads', async () => {
    for (const family of ['fixed', 'atr'] as const) {
      const local = await search(new LocalEvaluator(), family);
      const one = await search(new WorkerPool(1, 7), family);
      const three = await search(new WorkerPool(3, 5), family);

      assert.equal(one, local);
      assert.equal(three, local);
    }
  });

  test('a different seed label gives a different Sobol scramble, the same label the same one', async () => {
    const run = async (label: string) => {
      const evaluator = new LocalEvaluator();

      evaluator.register(dataset);

      const cache = new CandidateCache(evaluator, spaces.fixed, {
        datasetId: 'walk',
        foldId: 'x',
        startIndex: 200,
        endIndex: 899,
        years: 2
      });

      await runSearch(
        spaces.fixed,
        cache,
        { ...searchConfig, samples: 32, populationSize: 8, generations: 1 },
        [label],
        []
      );

      return [...cache.entries.values()]
        .slice(0, 32)
        .map((candidate) => candidate.id)
        .join(',');
    };

    assert.equal(await run('a'), await run('a'));
    assert.notEqual(await run('a'), await run('b'));
  });

  test('every evaluated candidate is exactly on the grid', async () => {
    const evaluator = new LocalEvaluator();

    evaluator.register(dataset);

    const cache = new CandidateCache(evaluator, spaces.atr, {
      datasetId: 'walk',
      foldId: 'g',
      startIndex: 200,
      endIndex: 899,
      years: 2
    });

    await runSearch(
      spaces.atr,
      cache,
      { ...searchConfig, samples: 64, populationSize: 16, generations: 3 },
      ['grid'],
      []
    );

    for (const candidate of cache.entries.values()) {
      assert.deepEqual(genomeToParams(spaces.atr, candidate.genome), candidate.params);

      for (const spec of spaces.atr.specs) {
        const value = candidate.params[spec.key];

        assert.ok(Number.isInteger(value) && value >= spec.min && value <= spec.max, `${spec.key}=${value}`);
      }
    }
  });
});
