// The original daily strategy must stay byte-for-byte unchanged, and the working copy must reproduce it.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import fs from 'fs-extra';
import { originalParams, simulateAllIn, ticksToBars } from '../../app/allIn-optimizable.ts';
import { loadCsvBacktestData, legacyResearchFile } from '#lib';
import { scenarios, writeFixture } from '../fixtures.ts';
import { originalFile, originalGitBlob, runGoldenCase, verifyOriginalUnchanged } from '../goldenMaster.ts';
import { defaultParameterSpace, genomeToParams, gridSize } from '../params.ts';
import { Rng } from '../rng.ts';
import { tempDir } from './helpers.ts';

// Golden-master cases import generated variants, so they live inside the repository (gitignored tmp).
const scratch = path.join('research/multi-asset-optimizer/tmp', `test-golden-${process.pid}`);

after(async () => {
  await fs.remove(scratch);
});

describe('original file preservation', () => {
  it('matches the committed bytes (sha256 and git blob)', async () => {
    await verifyOriginalUnchanged();
    assert.equal(execFileSync('git', ['hash-object', originalFile], { encoding: 'utf8' }).trim(), originalGitBlob);
  });

  it('has no uncommitted changes', () => {
    assert.equal(execFileSync('git', ['status', '--porcelain', '--', originalFile], { encoding: 'utf8' }).trim(), '');
  });
});

describe('golden master: original versus working copy', () => {
  const fixtureDir = path.join(scratch, 'fixtures');

  it('is identical on the repository VGT file through 2023 at the defaults', async () => {
    const result = await runGoldenCase(
      {
        name: 'test-vgt',
        symbol: 'VGT',
        dataFile: legacyResearchFile('data/VGT/VGT-2016-2026.csv'),
        endDate: '2023-12-31'
      },
      scratch
    );

    assert.deepEqual(result.differences, []);
    assert.ok((result.summary.closedTrades as number) > 10);
  });

  it('is identical on every synthetic edge case', async () => {
    for (const [name, bars] of Object.entries(scenarios())) {
      const file = path.join(fixtureDir, `${name}.csv`);

      await writeFixture(file, bars);

      const result = await runGoldenCase({ name: `test-${name}`, symbol: 'SYN', dataFile: file }, scratch);

      assert.deepEqual(result.differences, [], name);
    }
  });

  it('is identical for random parameter vectors (variants of the original)', async () => {
    const rng = Rng.from('golden-test');
    const file = path.join(fixtureDir, 'random-walk-5.csv');

    await writeFixture(file, scenarios()['random-walk-5']!);

    for (let index = 0; index < 4; index++) {
      const params = genomeToParams(
        defaultParameterSpace,
        defaultParameterSpace.specs.map((spec) => rng.int(gridSize(spec)))
      );
      const result = await runGoldenCase(
        { name: `test-variant-${index}`, symbol: 'SYN', dataFile: file, params },
        scratch
      );

      assert.equal(result.usedVariant, true);
      assert.deepEqual(result.differences, [], JSON.stringify(params));
    }
  });
});

describe('fast mode equals detail mode', () => {
  it('produces the same totals and trades with and without detail', async () => {
    const dir = await tempDir('fast');
    const file = path.join(dir, 'walk.csv');

    await writeFixture(file, scenarios()['random-walk-2']!);

    const bars = ticksToBars(await loadCsvBacktestData('SYN', file));

    for (const params of [
      originalParams,
      { ...originalParams, dipTenths: 60, trailingStopTenths: 30, retraceTenths: 0 }
    ]) {
      const fast = simulateAllIn({ symbol: 'SYN', bars, params });
      const detail = simulateAllIn({ symbol: 'SYN', bars, params, detail: true });

      assert.equal(fast.netProfit, detail.netProfit);
      assert.equal(fast.maximumDrawdown, detail.maximumDrawdown);
      assert.deepEqual(fast.trades, detail.trades);
      assert.equal(detail.dailyRows.at(-1)!.mtmProfit, detail.netProfit);
    }
  });
});
