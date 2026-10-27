import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { subperiodsOf } from '../evaluate.ts';
import { parseRawFile } from '../raw.ts';
import { assertValidSeries, defineSnapshot } from '../snapshot.ts';
import { makeSeries } from './fixtures.ts';

// Raw-file and snapshot rules on synthetic files (the reviewer's appendix A cases, with the corrected behaviour).
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'btc-d1-data-'));
const line = (t: number, price = '10') => `${t}|${price}|${price}|${price}|${price}|1.5|100.25|0.5|150.75|5`;
const day = 86400;
const t0 = 19700 * day;
const write = (name: string, rows: string[]) => {
  const file = path.join(dir, name);

  fs.writeFileSync(file, `${rows.join('\n')}\n`);
  return file;
};

describe('raw parser and snapshot rules', () => {
  test('an empty field or a foreign byte makes the line malformed', () => {
    const raw = parseRawFile(
      write('empty.csv', [line(t0), `${t0 + 60}|1||1|1|1|1|1|1|1`, `${t0 + 120}|1| 1|1|1|1|1|1|1|1`])
    );

    assert.deepEqual(
      raw.malformed.map((entry) => entry.line),
      [2, 3]
    );
  });

  test('decimals convert exactly (the same doubles as Number())', () => {
    const raw = parseRawFile(
      write('decimals.csv', [
        `${t0}|0.1|126199.63|0.30000000000000004|4261.48|1.775183|320.390851|0.075183|7564.906851|3`
      ])
    );

    assert.equal(raw.columns.open[0], 0.1);
    assert.equal(raw.columns.high[0], 126199.63);
    assert.equal(raw.columns.close[0], 4261.48);
    assert.equal(raw.columns.quoteVolume[0], 7564.906851);
  });

  test('a row after the snapshot end never moves the history start; a 23:59 last row keeps its day', () => {
    const rows: string[] = [];

    for (let d = 0; d < 5; d++) {
      for (let m = 0; m < 3; m++) {
        rows.push(line(t0 + d * day + m * 60));
      }
    }

    rows.push(line(t0 + 5 * day + 30)); // an irregular row in the partial last day
    const partial = defineSnapshot(parseRawFile(write('partial.csv', rows))).definition;

    assert.equal((partial.snapshotEnd - t0) / day, 5);
    assert.equal(partial.lastIrregularRowTime, -Infinity);
    assert.equal(partial.historyStart, -Infinity);

    const full: string[] = [];

    for (let d = 0; d < 2; d++) {
      for (let m = 0; m < 1440; m++) {
        full.push(line(t0 + d * day + m * 60));
      }
    }

    assert.equal((defineSnapshot(parseRawFile(write('full.csv', full))).definition.snapshotEnd - t0) / day, 2);
  });

  test('an invalid canonical bar fails closed', () => {
    assert.throws(() => assertValidSeries(makeSeries([['2024-01-01T00:00', 10, 11, 10.5, 10.6]])));
    assert.doesNotThrow(() => assertValidSeries(makeSeries([['2024-01-01T00:00', 10, 11, 9, 10.6]])));
  });

  test('a window splits into three consecutive whole-day subperiods covering it exactly', () => {
    const thirds = subperiodsOf({ label: 'w', startDay: 100, endDay: 1124 });

    assert.deepEqual(
      thirds.map((third) => [third.startDay, third.endDay]),
      [
        [100, 441],
        [441, 782],
        [782, 1124]
      ]
    );
  });
});
