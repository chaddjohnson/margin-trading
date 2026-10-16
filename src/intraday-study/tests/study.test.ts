import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { verifyProtected } from '../cli.ts';
import { dataFile } from '../constants.ts';
import { loadStudyData } from '../data.ts';
import { runGoldenCase } from '../goldenMaster.ts';

const hasData = fs.existsSync(dataFile);

describe('protected files', () => {
  it('are byte-identical to the hashes recorded when the study started', async () => {
    for (const row of await verifyProtected()) {
      assert.ok(row.unchanged, `${row.file} changed: ${row.start} -> ${row.now}`);
    }
  });
});

describe('golden master on the real minute file', { skip: !hasData && 'minute data not present' }, () => {
  it('reproduces allIn.ts on 2016-10-07 → 2025-10-13 file for file (stop fill)', async () => {
    const { sessions } = await loadStudyData(dataFile);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'intraday-golden-'));
    const result = await runGoldenCase(
      sessions,
      dataFile,
      { label: 'legacy', startDate: '2016-10-07', endDate: '2025-10-13', stopFill: 'stop' },
      dir
    );

    assert.ok(result.identical, JSON.stringify(result.files));
    assert.equal(result.summary.closedTrades, 170);
    assert.equal(result.summary.openAtEnd, true);
    assert.equal(Math.round((result.summary.netProfit as number) * 100), 20340521);
    assert.equal(Math.round((result.summary.minuteMaximumDrawdown as number) * 100), 2552648);
    await fs.remove(dir);
  });
});
