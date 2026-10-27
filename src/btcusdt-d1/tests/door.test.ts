import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chronologyOf, dateOf, dayOfDate } from '../calendar.ts';
import { resolveDates } from '../door.ts';
import { at } from './fixtures.ts';

// The data door of `fixed` and `compare` (door.ts) on the study's own chronology, with a sealed door ending the day
// before the holdout: every request that reaches into the holdout is refused and names the latest permitted minute.
const chronology = chronologyOf(at('2018-02-11T00:00'), at('2026-08-25T00:00'), 365);
const door = { latestPermittedDay: chronology.holdout.startDay - 1, reason: 'sealed' };
const resolve = (args: string[]) => resolveDates(args, chronology, door, 74);

test('the default and permitted requests stay before the holdout', () => {
  const plain = resolve([]);

  assert.equal(dateOf(plain.armFrom), '2019-02-11');
  assert.equal(dateOf(plain.end), '2024-06-30');
  assert.equal(dateOf(resolve(['--end', '2022-12-31']).end), '2022-12-31');

  const validation = resolve(['--dataset', 'fold-a-validation']);

  assert.deepEqual(
    [dateOf(validation.armFrom), dateOf(validation.start), dateOf(validation.end)],
    ['2019-02-11', '2021-12-01', '2023-02-28']
  );
  assert.equal(dateOf(resolve(['--dataset', 'fold-a-validation', '--flat']).armFrom), '2021-12-01');
});

test('every request reaching the sealed holdout is refused with the latest permitted minute', () => {
  for (const args of [
    ['--dataset', 'all'],
    ['--dataset', 'holdout'],
    ['--end', '2024-07-01'],
    ['--end', '2026-08-24'],
    ['--start', '2025-01-01', '--end', '2025-02-01']
  ]) {
    assert.throws(() => resolve(args), /Refused by the data door.*2024-06-30T23:59:00Z/, args.join(' '));
  }
});

test('malformed or impossible requests are refused', () => {
  assert.throws(() => resolve(['--end', '2023-02-29']));
  assert.throws(() => resolve(['--dataset', 'everything']));
  assert.throws(() => resolve(['--start', '2018-03-01']), /fewer than L/);
  assert.throws(() => resolve(['--start', '2024-06-30', '--end', '2024-01-01']), /after/);
  assert.equal(dayOfDate('2024-06-30'), door.latestPermittedDay);
});
