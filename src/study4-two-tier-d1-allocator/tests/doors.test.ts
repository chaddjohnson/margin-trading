// The Study 4 door (PROTOCOL.md §3): a synthetic canonical file under the OS temp directory whose rows after the read
// bound are unparseable garbage must load (they are never tokenised), mutating them must change nothing, and every
// refusal fires before a byte is read. Synthetic bars only: no bar file under data/ is opened (the calendar metadata
// data/partitions.json is copied into the synthetic root). The record-dependent refusals (evaluation and H doors before
// their records are sealed) are exercised against an empty results tree in doors.refusals.test.ts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { foldKeys } from '../context.ts';
import { authorise, evaluationRecordFile, openDoor, readBounded, selectionFile } from '../doors.ts';
import { verifySealed } from '../records.ts';

const tradingDays = () => {
  const days: string[] = [];
  const holidays = new Set(['2019-11-28', '2019-12-25']);

  for (let t = Date.parse('2019-11-01T00:00:00Z'); t <= Date.parse('2019-12-31T00:00:00Z'); t += 86400000) {
    const date = new Date(t);
    const iso = date.toISOString().slice(0, 10);

    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6 && !holidays.has(iso)) {
      days.push(iso);
    }
  }

  return days;
};

const writeRoot = (garbage: string) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'study4-door-'));
  const lines: string[] = [];
  let price = 100;

  for (const day of tradingDays()) {
    for (let minute = 0; minute < 20; minute++) {
      const time = new Date(Date.parse(`${day}T14:30:00Z`) + minute * 60000).toISOString().replace('.000Z', 'Z');
      const next = price * (1 + 0.001 * Math.sin(minute + day.length));

      lines.push(
        `"${time}",${price.toFixed(2)},${Math.max(price, next).toFixed(2)},${Math.min(price, next).toFixed(2)},${next.toFixed(2)},1000`
      );
      price = next;
    }
  }

  for (const symbol of ['VGT', 'XBI']) {
    fs.mkdirSync(path.join(root, symbol), { recursive: true });
    fs.writeFileSync(path.join(root, symbol, 'data.csv'), `${lines.join('\n')}\n${garbage}`);
  }

  fs.copyFileSync('data/partitions.json', path.join(root, 'partitions.json'));
  return root;
};

describe('Study 4 door', () => {
  test('rows after the bound are never parsed; mutating them changes nothing', async () => {
    const a = writeRoot('"2020-01-02T14:30:00Z",not,a,number,at,all\nTOTAL GARBAGE\n');
    const b = writeRoot('"2020-01-02T14:30:00Z",1,2,3,4,5\n"2020-01-03T14:30:00Z",9,9,9,9,9\n');
    const doorA = await openDoor({ purpose: 'test', window: 'F20', symbols: ['VGT', 'XBI'], root: a });
    const doorB = await openDoor({ purpose: 'test', window: 'F20', symbols: ['VGT', 'XBI'], root: b });

    assert.equal(doorA.end, '2019-12-31');
    assert.equal(doorA.records.VGT!.lastDate, '2019-12-31');
    assert.match(doorA.records.VGT!.stop, /not parsed/);
    assert.equal(doorA.records.VGT!.loadedBarsSha256, doorB.records.VGT!.loadedBarsSha256);
    assert.equal(doorA.records.VGT!.prefixSha256, doorB.records.VGT!.prefixSha256);
    assert.equal(doorA.records.VGT!.prefixBytes, doorB.records.VGT!.prefixBytes);
  });

  test('the reader stops at the first line at or after the bound', () => {
    const root = writeRoot('"2020-01-01T05:59:00Z",1,1,1,1,1\n"2020-01-01T06:00:00Z",broken\n');
    const read = readBounded(path.join(root, 'VGT', 'data.csv'), '2020-01-01T06:00:00Z');

    assert.equal(read.ticks.at(-1)!.time, Date.parse('2020-01-01T05:59:00Z') / 1000);
    assert.match(read.stop, /2020-01-01T06:00:00Z/);
  });

  test('refusals fire before any read', () => {
    const root = writeRoot('');
    // authorise reads no file: any root outside the OS temp directory stands for the data checkout (a checkout that
    // itself lives under the temp directory, such as a data-less test worktree, must not make 'data' look synthetic)
    const data = path.join(path.parse(process.cwd()).root, 'study4-door-test-not-a-temp-root');
    // the evaluation and H doors depend on the study's own sealed records: refused before them, authorised after
    const foldsSealed = foldKeys.every((fold) => verifySealed(selectionFile(fold)));
    const evaluationSealed = verifySealed(evaluationRecordFile());

    assert.throws(() => authorise('development', 'F20', ['VGT'], root), /never reads from the temp directory/);
    assert.throws(() => authorise('test', 'F20', ['VGT'], data), /synthetic files/);
    assert.throws(() => authorise('development', 'F20', ['NOT_A_SYMBOL'], data), /not in the Study 4 universe/);
    assert.throws(() => authorise('development', null, ['VGT'], data), /needs a window/);

    if (foldsSealed) {
      assert.equal(authorise('evaluation', null, ['VGT'], data), '2023-12-29');
    } else {
      assert.throws(() => authorise('evaluation', null, ['VGT'], data), /every sealed fold selection/);
    }

    if (evaluationSealed) {
      assert.equal(authorise('development', 'H', ['VGT'], data), '2023-12-29');
    } else {
      assert.throws(() => authorise('development', 'H', ['VGT'], data), /after the sealed fold evaluation/);
    }

    assert.throws(() => authorise('parity', null, ['XLE'], data), /B5 members only/);
  });
});
