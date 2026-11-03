// The raw-row audit counts the faults the strategy loader would refuse or silently accept.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { auditRows } from '../audit.ts';

describe('raw-row audit', () => {
  test('counts non-UTC, unsorted, duplicate, bad-OHLC, non-positive and extended-hours rows', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'multi-etf-d1-audit-'));
    const file = path.join(dir, 'rows.csv');
    const rows = [
      '"2018-01-02T14:30:00Z",100,101,99,100.5,1000', // regular
      '"2018-01-02T14:31:00Z",100.5,100.4,99,100,1000', // bad OHLC: high below open
      '"2018-01-02T14:31:00Z",100,101,99,100,1000', // duplicate
      '"2018-01-02T14:29:00Z",100,101,99,100,1000', // unsorted
      '"2018-01-02T14:32:00",100,101,99,100,1000', // non-UTC
      '"2018-01-02T14:33:00Z",0,101,99,100,1000', // non-positive price
      '"2018-01-02T21:00:00Z",100,101,99,100,0', // closing print, zero volume
      '"2018-01-02T22:00:00Z",100,101,99,100,1000', // extended hours
      '"2018-01-02T22:01:00Z",abc,101,99,100,1000' // unparsable
    ];

    await fs.writeFile(file, `${rows.join('\n')}\n`);

    const { raw, ticks } = await auditRows(file);

    assert.equal(raw.rows, 9);
    assert.equal(raw.nanRows, 2, 'the non-UTC row and the unparsable row');
    assert.equal(raw.nonUtcRows, 1);
    assert.equal(raw.duplicateRows, 1);
    assert.equal(raw.unsortedRows, 2);
    assert.equal(raw.badOhlcRows, 2, 'the high-below-open row and the zero-open row (its low is above the zero open)');
    assert.equal(raw.nonPositivePriceRows, 1);
    assert.equal(raw.zeroVolumeRows, 1);
    assert.equal(raw.regularWallClockRows, 4, '14:29 UTC is 9:29 New York time, before the open');
    assert.equal(raw.closingWallClockRows, 1);
    assert.equal(raw.extendedHoursRows, 2);
    assert.equal(ticks.length, 7);
    await fs.remove(dir);
  });
});
