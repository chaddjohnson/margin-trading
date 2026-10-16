import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { runGoldenCase, verifyOriginalUnchanged } from '../goldenMaster.ts';
import { barsFrom, randomWalk, toCsv } from './helpers.ts';

describe('baseline reproduction against src/app/allin-original.ts', () => {
  it('leaves the original file byte-for-byte unchanged', async () => {
    const check = await verifyOriginalUnchanged();
    assert.ok(check.unchanged, `sha256 ${check.actual}`);
  });

  it('reproduces every output file on the repository default VGT run', async () => {
    const result = await runGoldenCase({ name: 'default', symbol: 'VGT', dataFile: 'data/VGT/VGT-2016-2026.csv' });
    assert.ok(result.identical, JSON.stringify(result.files));
  });

  it('reproduces every output file on a date-filtered run', async () => {
    const result = await runGoldenCase({
      name: 'filtered',
      symbol: 'VGT',
      dataFile: 'data/VGT/VGT-2005-2026.csv',
      startDate: '2014-01-02',
      endDate: '2022-12-30'
    });
    assert.ok(result.identical, JSON.stringify(result.files));
  });

  for (const seed of [11, 12, 13, 14]) {
    it(`reproduces every output file on a volatile synthetic walk (seed ${seed})`, async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'drawdown-golden-test-'));
      const file = path.join(dir, 'walk.csv');

      // Gaps at the open exercise the stop-gap and maximum-hold paths.
      const closes = randomWalk(900, seed, 0.0004, 0.03);
      const opens = closes.map((close, index) =>
        index > 0 && index % 37 === 0 ? closes[index - 1]! * 0.94 : undefined
      );
      await fs.writeFile(file, toCsv(barsFrom(closes, { opens })));

      const result = await runGoldenCase({ name: `walk-${seed}`, symbol: 'TEST', dataFile: file });
      assert.ok(result.identical, JSON.stringify(result.files));
      assert.ok(result.closedTrades > 5);
      await fs.remove(dir);
    });
  }
});
