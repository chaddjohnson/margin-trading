// E4 budget: the deterministic bound derived from the frozen schedules equals the preregistered 8,800,278.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bound, laneCap, laneWorst } from '../budget.ts';

test('the bound from the frozen schedules = the preregistered bound (PROTOCOL.md §6)', () => {
  const b = bound();

  assert.equal(laneCap, 41_000);
  assert.equal(laneWorst, 40_642);
  assert.equal(b.perMember, 653);
  assert.equal(b.perSubject, 264);
  assert.equal(b.membersPerCutoff, 194);
  assert.equal(b.subjectsPerCutoff, 71);
  assert.equal(b.search, 7_872_000);
  assert.equal(b.reproduction, 492_000);
  assert.equal(b.qualification, 380_046);
  assert.equal(b.intervals, 56_232);
  assert.equal(b.total, 8_800_278);
  assert.equal(b.fits, true);
});
