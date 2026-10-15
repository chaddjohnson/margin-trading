// The holdout lock: no holdout without a verified freeze, no re-ranking after the freeze, rank 1 only,
// and no second run without a recorded reason.
import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import fs from 'fs-extra';
import { type ExperimentConfig, runExperiment } from '../experiment.ts';
import { defaultFitness } from '../fitness.ts';
import { freeze, runHoldout, verifyFreeze } from '../holdout.ts';
import { defaultParameterSpace } from '../params.ts';
import { LocalEvaluator } from '../pool.ts';
import { defaultProtocol } from '../protocol.ts';
import { defaultSearch } from '../search.ts';
import { defaultSelection } from '../selection.ts';
import { HoldoutLockedError } from '../series.ts';
import { fixtureManifest, tempDir, walkBars } from './helpers.ts';

const setup = async () => {
  const dir = await tempDir('holdout');
  const researchDir = path.join(dir, 'research');
  const outDir = path.join(researchDir, 'results', 'test');
  // Data through 2025, so there are holdout sessions after the research end.
  const manifest = await fixtureManifest(dir, { AAA: walkBars(11, '2012-01-02', 3500, 0.018) });
  const config: ExperimentConfig = {
    id: 'test',
    seed: 'holdout-test',
    symbols: ['AAA'],
    protocol: { ...defaultProtocol, folds: [] },
    space: defaultParameterSpace,
    search: {
      ...defaultSearch,
      samples: 64,
      populationSize: 8,
      generations: 2,
      gaRuns: 1,
      maxEvaluationsPerGaRun: 100
    },
    // Loose gates, so the small fixture search always yields a rank 1 to test the lock with.
    fitness: { ...defaultFitness, drawdownLimit: 1, minTradesPerYear: 0.2 },
    selection: { ...defaultSelection, topN: 5, poolByNet: 8, maxPool: 16, minPositiveYearShare: 0 },
    controlSeeds: 0,
    runFolds: false,
    tickerConcurrency: 1
  };

  await fs.ensureDir(outDir);
  await fs.writeFile(path.join(outDir, 'experiment.json'), JSON.stringify(config));
  await runExperiment({ config, manifest, evaluator: new LocalEvaluator(), codeHash: 'test', outDir, log: () => {} });

  return { researchDir, outDir, manifest };
};

describe('holdout lock', () => {
  it('refuses the holdout before a freeze', async () => {
    const { researchDir, outDir, manifest } = await setup();

    await assert.rejects(runHoldout(researchDir, outDir, manifest), HoldoutLockedError);
  });

  it('runs rank 1 once after the freeze, then refuses a second run without a reason', async () => {
    const { researchDir, outDir, manifest } = await setup();
    const record = await freeze(researchDir, outDir, manifest);
    const result = await runHoldout(researchDir, outDir, manifest);
    const symbol = result.symbols.AAA!;

    assert.ok(record.symbols.AAA!.rank1, 'the fixture must produce a rank 1');
    assert.equal(symbol.window.start >= '2024-01-01', true);
    assert.equal(symbol.rank1?.id, record.symbols.AAA!.rank1?.id);
    assert.ok(await fs.pathExists(path.join(researchDir, 'FINAL_HOLDOUT_RESULTS.md')));
    // Only rank 1 and the original baseline were simulated.
    assert.deepEqual((await fs.readdir(path.join(outDir, 'holdout', 'AAA'))).sort(), [
      'original-equity.csv',
      'original-trades.csv',
      'rank1-equity.csv',
      'rank1-trades.csv'
    ]);

    await assert.rejects(runHoldout(researchDir, outDir, manifest), HoldoutLockedError);

    const second = await runHoldout(researchDir, outDir, manifest, { rerunReason: 'test: implementation bug fix' });

    assert.equal(second.attempt, 2);
    assert.match(
      await fs.readFile(path.join(researchDir, 'FINAL_HOLDOUT_RESULTS.md'), 'utf8'),
      /re-run because: test: implementation bug fix/
    );
    await assert.rejects(freeze(researchDir, outDir, manifest, { replaceReason: 'x' }), HoldoutLockedError);
  });

  it('detects re-ranking, report edits, data changes and a tampered freeze record', async () => {
    const { researchDir, outDir, manifest } = await setup();

    await freeze(researchDir, outDir, manifest);
    await verifyFreeze(researchDir, outDir, manifest);

    // Re-ranking: swap the first two shortlist entries in the final run record.
    const runFile = path.join(outDir, 'AAA', 'final-2014-2023', 'run.json');
    const original = await fs.readFile(runFile, 'utf8');
    const run = JSON.parse(original);

    if (run.shortlist.length >= 2) {
      [run.shortlist[0], run.shortlist[1]] = [run.shortlist[1], run.shortlist[0]];
      await fs.writeFile(runFile, JSON.stringify(run));
      await assert.rejects(verifyFreeze(researchDir, outDir, manifest), /differs from the frozen one/);
      await fs.writeFile(runFile, original);
    }

    const report = path.join(researchDir, 'TOP_CANDIDATES.md');
    const text = await fs.readFile(report, 'utf8');

    await fs.writeFile(report, `${text}\nedited`);
    await assert.rejects(verifyFreeze(researchDir, outDir, manifest), /changed after the freeze/);
    await fs.writeFile(report, text);

    const changedData = structuredClone(manifest);

    changedData.entries.AAA!.processed!.sha256 = 'different';
    await assert.rejects(verifyFreeze(researchDir, outDir, changedData), /data changed/);

    const freezeFile = path.join(outDir, 'freeze', 'freeze.json');

    await fs.appendFile(freezeFile, ' ');
    await assert.rejects(verifyFreeze(researchDir, outDir, manifest), /does not match/);
  });
});
