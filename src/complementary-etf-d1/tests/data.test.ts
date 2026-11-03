// The study's data access on the real canonical files (skipped without them): the training view is the training
// partition only, split-adjusted exactly once (XOP's 1:4 reverse split of 2020-03-30), arming from 2017-06-15;
// every other partition is refused before a byte is read; and the screen's data gate follows the audit's facts.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { loadDatasetSessions, optimizationDataset, resolveDataset } from '#lib';
import { loadTraining, trainingTickerData } from '../data.ts';
import { dataGate } from '../screen.ts';

const missing = !fs.existsSync('data/XOP/data.csv') ? 'the canonical XOP file is not present' : false;

describe('the training view', { skip: missing }, () => {
  test('XOP: the training partition only, the reverse split adjusted once, eligibility at session 365', async () => {
    const data = await trainingTickerData('XOP');
    const { report, sessions } = await loadTraining('XOP');

    assert.equal(data.ds.firstDate, '2016-01-04');
    assert.equal(data.ds.lastDate, '2023-12-29');
    assert.equal(data.eligibility, 365);
    assert.equal(data.ds.dates[data.eligibility], '2017-06-15');
    assert.equal(report.access, 'optimization');
    assert.deepEqual(report.splitAdjustments, [{ symbol: 'XOP', effectiveDate: '2020-03-30', ratio: 0.25 }]);

    // The raw file prints 8.03 → 31.10 across the split; adjusted once, the move is a few percent.
    const index = sessions.findIndex((session) => session.date === '2020-03-30');
    const move = sessions[index]!.open / sessions[index - 1]!.close - 1;

    assert.ok(Math.abs(move) < 0.05, `adjusted overnight move ${move}`);

    const raw = await loadDatasetSessions({ dataset: resolveDataset('XOP', 'training'), splits: [] });

    assert.ok(Math.abs(sessions[index]!.close / raw.sessions[index]!.close - 0.25) < 1e-12, 'once, not twice');
    assert.equal(sessions[index - 1]!.close, raw.sessions[index - 1]!.close, 'earlier sessions untouched');
  });

  test('every other partition is refused before reading', async () => {
    for (const partition of ['holdout', 'final', 'all']) {
      assert.throws(() => optimizationDataset('XOP', partition), /Optimization reads the training partition only/);
      await assert.rejects(
        loadDatasetSessions({ dataset: resolveDataset('XOP', partition), access: 'optimization' }),
        /Optimization reads the training partition only/
      );
    }
  });
});

describe('the data gate', () => {
  const file = {
    symbol: 'SYN',
    status: 'verified',
    hashMatchesLoaded: true,
    everyRowOncePartitioned: true,
    malformed: 0,
    outOfOrder: 0,
    duplicates: 0,
    missingSessions: [] as string[]
  };
  const split = { symbol: 'SYN', adjustedOvernight: -0.03, adjustmentFactor: 0.25, expectedFactor: 0.25 };

  test('passes a verified file whose splits leave a small adjusted move at the registry factor', () => {
    assert.equal(dataGate({ coverage: [file], splits: [split] }, 'SYN'), true);
    assert.equal(dataGate({ coverage: [file], splits: [] }, 'SYN'), true);
  });

  test('fails a missing file, an integrity fault, or a split left unadjusted', () => {
    assert.equal(dataGate({ coverage: [], splits: [] }, 'SYN'), false);
    assert.equal(dataGate({ coverage: [{ ...file, duplicates: 1 }], splits: [] }, 'SYN'), false);
    assert.equal(dataGate({ coverage: [{ ...file, missingSessions: ['2020-03-30'] }], splits: [] }, 'SYN'), false);
    assert.equal(dataGate({ coverage: [file], splits: [{ ...split, adjustedOvernight: 2.87 }] }, 'SYN'), false);
    assert.equal(dataGate({ coverage: [file], splits: [{ ...split, adjustmentFactor: 0.0625 }] }, 'SYN'), false);
  });
});
