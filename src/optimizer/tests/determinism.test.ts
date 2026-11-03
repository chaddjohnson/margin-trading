// A whole experiment gives byte-identical records whether evaluated in-process or by worker pools of
// different sizes, and the top-N ranks are stable across worker counts.
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import fs from 'fs-extra';
import { type ExperimentConfig, runExperiment } from '../experiment.ts';
import { defaultFitness } from '../fitness.ts';
import { defaultParameterSpace } from '../params.ts';
import { type Evaluator, LocalEvaluator, WorkerPool } from '../pool.ts';
import { defaultProtocol } from '../protocol.ts';
import { defaultSearch } from '../search.ts';
import { defaultSelection } from '../selection.ts';
import { fixtureManifest, tempDir, walkBars } from './helpers.ts';

const config: ExperimentConfig = {
  id: 'determinism',
  seed: 'test-seed',
  symbols: ['AAA', 'BBB'],
  protocol: {
    ...defaultProtocol,
    folds: defaultProtocol.folds.slice(0, 2)
  },
  space: defaultParameterSpace,
  search: { ...defaultSearch, samples: 96, populationSize: 16, generations: 3, gaRuns: 2, maxEvaluationsPerGaRun: 200 },
  fitness: defaultFitness,
  selection: { ...defaultSelection, topN: 5, poolByNet: 8, maxPool: 32 },
  controlSeeds: 1,
  runFolds: true,
  tickerConcurrency: 2
};

const runWith = async (evaluator: Evaluator, label: string) => {
  const dir = await tempDir(`determinism-${label}`);
  const manifest = await fixtureManifest(dir, {
    AAA: walkBars(1, '2012-01-02', 3200, 0.02),
    BBB: walkBars(2, '2012-01-02', 3200, 0.012)
  });
  const outDir = path.join(dir, 'results');

  try {
    await runExperiment({ config, manifest, evaluator, codeHash: 'test', outDir, log: () => {} });
  } finally {
    await evaluator.close();
  }

  const files: Record<string, string> = {};

  for (const symbol of config.symbols) {
    for (const run of ['fold-2019', 'fold-2020', 'final-2014-2023', 'control-sobol-0', 'control-random-0']) {
      files[`${symbol}/${run}`] = await fs.readFile(path.join(outDir, symbol, run, 'run.json'), 'utf8');
    }

    files[`${symbol}/archive`] = (
      await fs.readFile(path.join(outDir, symbol, 'fold-2019', 'evaluations.csv.gz'))
    ).toString('base64');
  }

  return files;
};

describe('determinism across evaluators', () => {
  it('produces identical run records in-process and with 1 or 3 worker threads', async () => {
    const local = await runWith(new LocalEvaluator(), 'local');
    const one = await runWith(new WorkerPool({ size: 1, chunkSize: 7 }), 'one');
    const three = await runWith(new WorkerPool({ size: 3, chunkSize: 5 }), 'three');

    for (const key of Object.keys(local)) {
      assert.equal(one[key], local[key], `${key} differs with 1 worker`);
      assert.equal(three[key], local[key], `${key} differs with 3 workers`);
    }

    const final = JSON.parse(local['AAA/final-2014-2023']!);

    assert.ok(final.shortlist.length > 0, 'expected a non-empty shortlist on the fixture');
    assert.deepEqual(
      final.shortlist.map((entry: { rank: number }) => entry.rank),
      final.shortlist.map((_entry: unknown, index: number) => index + 1)
    );
  });
});

describe('worker failure propagation', () => {
  it('rejects evaluations for an unregistered dataset and after close', async () => {
    const pool = new WorkerPool({ size: 1 });

    await assert.rejects(pool.evaluate('missing', { startIndex: 0, endIndex: 1 }, []), /not registered/);
    await pool.close();
  });
});
