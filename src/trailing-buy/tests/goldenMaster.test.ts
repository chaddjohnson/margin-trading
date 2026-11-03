import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import {
  derivedDir,
  originalFile,
  originalSha256,
  repoDefaultFile,
  researchStart,
  vgtCombinedFile
} from '../constants.ts';
import { loadDaily, loadVgt, sha256Of } from '../data.ts';
import { baselineParams, checkedInParams, simulate } from '../engine.ts';
import { fileNames, runEngineLikeOriginal, runOriginalModule, writeVariant } from '../goldenMaster.ts';
import { IndicatorCache } from '../indicators.ts';
import { volatileWalk, writeFixture } from './helpers.ts';

const work = `${derivedDir}/test-golden`;

const compare = async (
  modulePath: string,
  params: typeof baselineParams,
  dataFile: string,
  id: string,
  start?: string,
  end?: string
) => {
  const original = await runOriginalModule(modulePath, 'VGT', dataFile, `${work}/${id}`, start ?? '-', end ?? '-');
  const engine = runEngineLikeOriginal(await loadDaily('VGT', dataFile), params, 'VGT', dataFile, start, end);

  for (const name of fileNames) {
    assert.equal(sha256Of(engine.files[name]!), sha256Of(original[name]!), `${id}: ${name} differs`);
  }

  return engine.result;
};

describe('legacy mode reproduces the immutable original byte for byte', () => {
  test('the original is untouched', async () => {
    assert.equal(sha256Of(await fs.readFile(originalFile, 'utf8')), originalSha256);
  });

  test('checked-in settings (0.5% / 3%) on the repository default file', async () => {
    const result = await compare(originalFile, checkedInParams, repoDefaultFile, 'default-checked');

    assert.equal(result.trades.filter((trade) => trade.reason !== 'open').length, 38);
  });

  test('brief settings (1% / 2%) on the research file, whole and from 2014', async () => {
    const variant = (await writeVariant()).file;

    await loadVgt();
    await compare(variant, baselineParams, vgtCombinedFile, 'full-1-2');
    await compare(variant, baselineParams, vgtCombinedFile, 'r2014-1-2', researchStart);
    await compare(variant, baselineParams, vgtCombinedFile, 'dev-1-2', researchStart, '2022-12-30');
  });

  test('volatile synthetic walks with gaps exercise every exit path, restrictions and resets', async () => {
    const variant = (await writeVariant()).file;
    const reasons = new Set<string>();
    let restrictions = 0;
    let resets = 0;
    let reentries = 0;
    let unrestrictedLosses = 0;

    for (const seed of ['a', 'b', 'c', 'd']) {
      const file = await writeFixture(`walk-${seed}`, volatileWalk(seed));
      const checked = await compare(originalFile, checkedInParams, file, `walk-${seed}-checked`);
      const brief = await compare(variant, baselineParams, file, `walk-${seed}-1-2`);

      for (const result of [checked, brief]) {
        result.trades.forEach((trade) => reasons.add(trade.reason));
        restrictions += result.restrictions;
        resets += result.recoveryResets;
        reentries += result.lowerPriceReentries;
        unrestrictedLosses += result.lossesNotRestricted;
      }
    }

    // Together the walks cover every exit path and every restriction transition.
    for (const reason of ['maximum hold', 'trailing stop', 'trailing stop gap', 'open']) {
      assert.ok(reasons.has(reason), `no ${reason} exit in the walks`);
    }

    assert.ok(restrictions > 0 && resets > 0 && reentries > 0 && unrestrictedLosses > 0);
  });

  test('warm start from 2014 (history before it available) trades exactly as the cold start', async () => {
    const bars = await loadVgt();
    const start = bars.date.indexOf(researchStart);
    const end = bars.date.indexOf('2022-12-30');
    const warm = simulate(bars, new IndicatorCache(bars), baselineParams, start, end);
    const cold = runEngineLikeOriginal(bars, baselineParams, 'VGT', vgtCombinedFile, researchStart, '2022-12-30');
    const key = (trades: typeof warm.trades, offset: number) =>
      trades.map((trade) =>
        [
          trade.entryIndex - offset,
          trade.exitIndex === -1 ? -1 : trade.exitIndex - offset,
          trade.entryPrice,
          trade.exitPrice
        ].join(':')
      );

    assert.deepEqual(key(warm.trades, start), key(cold.result.trades, 0));
    assert.equal(warm.netProfit, cold.result.netProfit);
    assert.equal(warm.maximumDrawdown, cold.result.maximumDrawdown);
  });
});
