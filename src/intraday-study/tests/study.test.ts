import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createHash } from 'node:crypto';
import { gitFileAt } from '#lib';
import { postStudyChanges, verifyProtected } from '../cli.ts';
import { dataFile } from '../constants.ts';
import { loadStudyData } from '../data.ts';
import { runGoldenCase } from '../goldenMaster.ts';

const hasData = fs.existsSync(dataFile);

describe('protected files', () => {
  // The incumbent (read from its frozen revision) and the minute data (from the legacy archive) must still be the
  // bytes the study started with; every other change since is recorded in postStudyChanges, with the revision that
  // still holds the starting bytes, and nothing else may change.
  it('match the hashes recorded when the study started, except the recorded post-study changes', async () => {
    for (const row of await verifyProtected()) {
      const change = postStudyChanges[row.file];

      if (!change) {
        assert.ok(row.unchanged, `${row.file} changed: ${row.start} -> ${row.now} (read from ${row.readFrom})`);
        continue;
      }

      assert.ok(!row.unchanged, `${row.file} is unchanged again: remove it from postStudyChanges`);

      if (change.revision) {
        const atStart = createHash('sha256').update(gitFileAt(change.revision, row.file)).digest('hex');

        assert.equal(atStart, row.start, `${row.file} at ${change.revision} is not the study's starting bytes`);
      }
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
