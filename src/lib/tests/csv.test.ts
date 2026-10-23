// The canonical minute format: comma-delimited, headerless, OHLCV in source order, quoted fields parsed as CSV,
// and anything else (a header, pipes, a wrong field count, non-numbers, disorder) refused with its line.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { loadCsvBacktestData, loadCsvMinuteBacktestData, ohlcvCsvColumns, parseMinuteBar } from '../csv.ts';

let directory = '';

const write = async (name: string, text: string) => {
  const file = path.join(directory, name);

  await fs.writeFile(file, text);
  return file;
};

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'csv-test-'));
});

after(async () => {
  await fs.remove(directory);
});

describe('minute CSV', () => {
  test('headerless comma-delimited rows map to time, open, high, low, close, volume', async () => {
    const file = await write(
      'ok.csv',
      [
        '"2016-01-04T14:30:00Z",106.31,106.31,105.77,105.77,21114',
        '2016-01-04T14:31:00Z,105.77,105.85,105.715,105.84,42520',
        '"2025-10-17T13:30:00Z","199.4689",199.47,199.4,199.41,450'
      ].join('\n') + '\n'
    );
    const ticks = await loadCsvMinuteBacktestData('VGT', file);

    assert.deepEqual(ohlcvCsvColumns, ['time', 'open', 'high', 'low', 'close', 'volume']);
    assert.equal(ticks.length, 3, 'the first row is data, not a header');
    assert.deepEqual(
      { ...ticks[0], trades: 0 },
      {
        time: Date.UTC(2016, 0, 4, 14, 30) / 1000,
        open: 106.31,
        high: 106.31,
        low: 105.77,
        close: 105.77,
        volume: 21114,
        trades: 0
      }
    );
    assert.equal(ticks[1]!.low, 105.715);
    assert.equal(ticks[2]!.open, 199.4689, 'a quoted number is read like an unquoted one');
    assert.ok(Number.isNaN(ticks[0]!.trades));
  });

  test('a file without a final newline reads the same', async () => {
    const file = await write('no-newline.csv', '2016-01-04T14:30:00Z,1,2,0.5,1.5,10');

    assert.equal((await loadCsvMinuteBacktestData('X', file)).length, 1);
  });

  test('a header row is refused, not skipped', async () => {
    const file = await write('header.csv', 'time,open,high,low,close,volume\n2016-01-04T14:30:00Z,1,2,0.5,1.5,10\n');

    await assert.rejects(
      loadCsvMinuteBacktestData('X', file),
      /header.csv:1: timestamp "time" is not an ISO 8601 UTC time/
    );
  });

  test('pipe-delimited rows are refused as such', async () => {
    const file = await write('pipe.csv', '2016-01-04T14:30:00Z|1|2|0.5|1.5|10\n');

    await assert.rejects(
      loadCsvMinuteBacktestData('X', file),
      /found 1.*looks pipe-delimited, but minute data is comma-delimited/
    );
  });

  test('wrong field counts, non-numbers, local times and disorder are refused with the line', async () => {
    const cases: [string, RegExp][] = [
      ['2016-01-04T14:30:00Z,1,2,0.5,1.5\n', /:1: expected 6 fields .* found 5/],
      ['2016-01-04T14:30:00Z,1,2,0.5,1.5,10,7\n', /found 7/],
      ['2016-01-04T14:30:00Z,1,2,abc,1.5,10\n', /low "abc" is not a number/],
      ['2016-01-04T14:30:00Z,1,2,0.5,1.5,\n', /volume "" is not a number/],
      ['2016-01-04T09:30:00,1,2,0.5,1.5,10\n', /is not an ISO 8601 UTC time/],
      ['2016-01-04T14:31:00Z,1,2,0.5,1.5,10\n2016-01-04T14:30:00Z,1,2,0.5,1.5,10\n', /:2: timestamp .* is not after/],
      ['2016-01-04T14:30:00Z,1,2,0.5,1.5,10\n2016-01-04T14:30:00Z,1,2,0.5,1.5,10\n', /:2: timestamp .* is not after/]
    ];

    for (const [index, [text, pattern]] of cases.entries()) {
      await assert.rejects(loadCsvMinuteBacktestData('X', await write(`bad-${index}.csv`, text)), pattern);
    }
  });

  test('a quoted comma stays inside its field', () => {
    assert.throws(
      () => parseMinuteBar(['2016-01-04T14:30:00Z', '1,5', '2', '1', '1', '1'], 'row'),
      /open "1,5" is not a number/
    );
  });
});

describe('legacy daily CSV', () => {
  test('the pipe-delimited daily format of the Stooq cache still reads', async () => {
    const file = await write('daily.csv', '2005-02-25|4.81978|4.84669|4.81978|4.84669|6438.53\n');
    const [tick] = await loadCsvBacktestData('VGT', file);

    assert.equal(tick!.time, Date.UTC(2005, 1, 25) / 1000);
    assert.equal(tick!.close, 4.84669);
    assert.equal(tick!.volume, 6438.53);
  });
});
