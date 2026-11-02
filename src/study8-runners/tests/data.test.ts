// Unit tests of the runner's data module on small fixture files (no canonical market data): the latest COMPLETE session
// of a minute file (partial appends, pre-market-only bars, the closing print, early closes, the calendar's end, reads
// across chunk boundaries) and the end-date rules built on it.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import fs from 'fs-extra';
import { UsageError } from '../aliases.ts';
import { tailStatus, validateEnd } from '../data.ts';

// A New York wall-clock minute in late October 2026 (EDT, UTC−4) or late November / December 2026 (EST, UTC−5).
const utc = (date: string, hhmm: string) => {
  const offset = date >= '2026-11-01' ? 5 : 4;
  const [h, m] = hhmm.split(':').map(Number) as [number, number];

  return new Date(Date.parse(`${date}T00:00:00Z`) + ((h + offset) * 60 + m) * 60000).toISOString().replace('.000', '');
};
const bar = (date: string, hhmm: string, price = 100) => `"${utc(date, hhmm)}",${price},${price},${price},${price},100`;
const session = (date: string, from = '09:30', to = '15:59') => {
  const out: string[] = [];
  const [fh, fm] = from.split(':').map(Number) as [number, number];
  const [th, tm] = to.split(':').map(Number) as [number, number];

  for (let minute = fh * 60 + fm; minute <= th * 60 + tm; minute++)
    out.push(bar(date, `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`));

  return out;
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'study8-runner-data-'));
const write = async (name: string, lines: string[]) => {
  const file = path.join(tmp, name);

  await fs.outputFile(file, `${lines.join('\n')}\n`);

  return file;
};

test.after(() => fs.removeSync(tmp));

test('a session with bars after its 4:00 p.m. close is complete', async () => {
  const file = await write('a.csv', [...session('2026-10-28'), ...session('2026-10-29'), bar('2026-10-29', '19:58')]);
  const status = await tailStatus(file);

  assert.equal(status.latestCompleteSession, '2026-10-29');
  assert.equal(status.incomplete, null);
  assert.equal(status.lastBarNewYork, '2026-10-29 19:58 ET');
});

test('the 4:00 p.m. closing print completes a session; a file ending at 3:59 p.m. does not', async () => {
  const withPrint = await write('b.csv', [
    ...session('2026-10-28'),
    ...session('2026-10-29'),
    bar('2026-10-29', '16:00')
  ]);
  const without = await write('c.csv', [
    ...session('2026-10-28'),
    bar('2026-10-28', '17:00'),
    ...session('2026-10-29')
  ]);

  assert.equal((await tailStatus(withPrint)).latestCompleteSession, '2026-10-29');

  const status = await tailStatus(without);

  assert.equal(status.latestCompleteSession, '2026-10-28');
  assert.deepEqual(status.incomplete, { date: '2026-10-29', lastBarNewYork: '2026-10-29 15:59 ET' });
});

test('a partly appended day and a pre-market-only day never count as complete', async () => {
  const partial = await write('d.csv', [
    ...session('2026-10-29'),
    bar('2026-10-29', '19:58'),
    bar('2026-10-30', '04:00'),
    ...session('2026-10-30', '09:30', '11:00')
  ]);
  const premarket = await write('e.csv', [
    ...session('2026-10-29'),
    bar('2026-10-29', '19:58'),
    bar('2026-10-30', '08:00')
  ]);
  const p = await tailStatus(partial);
  const q = await tailStatus(premarket);

  assert.equal(p.latestCompleteSession, '2026-10-29');
  assert.deepEqual(p.incomplete, { date: '2026-10-30', lastBarNewYork: '2026-10-30 11:00 ET' });
  assert.equal(p.lastBarDate, '2026-10-30');
  assert.equal(q.latestCompleteSession, '2026-10-29');
  assert.equal(q.incomplete, null);
  assert.equal(q.lastBarDate, '2026-10-30');
});

test('an early-close day (1:00 p.m.) is complete from its 1:00 p.m. bar', async () => {
  const done = await write('f.csv', [
    ...session('2026-11-25'),
    ...session('2026-11-27', '09:30', '12:59'),
    bar('2026-11-27', '13:00')
  ]);
  const open = await write('g.csv', [
    ...session('2026-11-25'),
    bar('2026-11-25', '16:30'),
    ...session('2026-11-27', '09:30', '12:30')
  ]);

  assert.equal((await tailStatus(done)).latestCompleteSession, '2026-11-27');
  assert.equal((await tailStatus(open)).latestCompleteSession, '2026-11-25');
});

test('bars after the shared NYSE calendar (2026-12-31) are ignored and flagged', async () => {
  const file = await write('h.csv', [...session('2026-12-31'), bar('2026-12-31', '17:00'), bar('2027-01-04', '10:00')]);
  const status = await tailStatus(file);

  assert.equal(status.latestCompleteSession, '2026-12-31');
  assert.equal(status.beyondCalendar, true);
});

test('the tail is read correctly across chunk boundaries', async () => {
  // the 17 weekdays of 2026-10-01 → 2026-10-23, 390 bars each (≈ 0.3 MB, more than one 256 KiB chunk), then a
  // partial session; the partial day alone is far smaller than a chunk, so the scan crosses chunk boundaries
  const days = Array.from({ length: 23 }, (_v, i) => `2026-10-${String(i + 1).padStart(2, '0')}`).filter(
    (day) => ![0, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay())
  );
  const lines = days.flatMap((day) => session(day));

  lines.push(...session('2026-10-26', '09:30', '15:00'));

  const file = await write('i.csv', lines);

  assert.equal(days.length, 17);
  assert.ok((await fs.stat(file)).size > 1 << 18);
  assert.equal((await tailStatus(file)).latestCompleteSession, '2026-10-23');
});

test('the default end is the latest COMMON complete session; later or incomplete ends are refused', async () => {
  const root = path.join(tmp, 'data');
  const complete = [...session('2026-10-28'), ...session('2026-10-29'), bar('2026-10-29', '19:58')];

  await fs.outputFile(
    path.join(root, 'VGT', 'data.csv'),
    `${[...complete, ...session('2026-10-30'), bar('2026-10-30', '17:00')].join('\n')}\n`
  );
  await fs.outputFile(
    path.join(root, 'GDX', 'data.csv'),
    `${[...complete, ...session('2026-10-30', '09:30', '11:00')].join('\n')}\n`
  );

  assert.equal(await validateEnd(undefined, ['VGT'], root), '2026-10-30');
  assert.equal(await validateEnd(undefined, ['VGT', 'GDX'], root), '2026-10-29');
  assert.equal(await validateEnd('2026-10-29', ['VGT', 'GDX'], root), '2026-10-29');
  await assert.rejects(validateEnd('2026-10-30', ['VGT', 'GDX'], root), (error: Error) => {
    assert.ok(error instanceof UsageError);
    assert.match(error.message, /latest common complete session \(2026-10-29\)/);
    assert.match(error.message, /GDX holds 2026-10-30 only up to 2026-10-30 11:00 ET/);

    return true;
  });
  await assert.rejects(validateEnd('2026-13-01', ['VGT'], root), UsageError);
  await assert.rejects(validateEnd('2026-02-30', ['VGT'], root), UsageError);
  await assert.rejects(validateEnd('2026-10-1', ['VGT'], root), UsageError);
  await assert.rejects(validateEnd('2017-06-15', ['VGT'], root), UsageError);
  await assert.rejects(validateEnd(undefined, ['XBI'], root), /missing canonical data for XBI/);
});
