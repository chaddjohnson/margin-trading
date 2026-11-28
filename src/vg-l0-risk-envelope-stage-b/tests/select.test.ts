// E4 selection: the lane value V (the best qualified centre net among the lane's own shortlisted members under the lane's
// arm; V = $0 without a qualified member; the P0 order breaks ties), the arm populations, the adapted RA1 is EXP30-only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Evidence } from '../qualify.ts';
import { laneValues, orderOf, populationOf, selectorsOf } from '../select.ts';

const ev = (id: string, net: number, by: { arm: 'CTRL' | 'EXP30'; lane: string }[], q: { CTRL: boolean; EXP30: boolean }, robust = 100_000, dd = 20_000) =>
  ({
    id,
    label: `${by[0]!.arm} ${by[0]!.lane}#${id}`,
    cell: 'GA0.VA0',
    centre: { net, dd },
    select: { robust, p90Dd: 25_000, p10: 50_000 },
    selectTail: { worst10Mean: 30_000 },
    risk: { conservativeNet: net, occupancy: 0.5, openLot: null, openShare: 0, mae: { worst: -1_000 } },
    gates: {},
    qualified: q.CTRL,
    failed: [],
    severity: {},
    arms: { CTRL: { gates: {}, qualified: q.CTRL, failed: q.CTRL ? [] : ['Q3'], severity: {}, reasons: [] }, EXP30: { gates: {}, qualified: q.EXP30, failed: q.EXP30 ? [] : ['Q2'], severity: {}, reasons: [] } },
    shortlistedBy: by.map((b, i) => ({ arm: b.arm, lane: b.lane, label: `${b.arm} ${b.lane}#${i + 1} profit`, pick: 'profit' }))
  }) as unknown as Evidence;

const L = 'C21/broad/GA0.VA0/R3';
const evidence = [
  ev('a', 200_000, [{ arm: 'CTRL', lane: L }], { CTRL: false, EXP30: true }), // CTRL's best by net but not CTRL-qualified
  ev('b', 180_000, [{ arm: 'CTRL', lane: L }], { CTRL: true, EXP30: true }),
  ev('c', 190_000, [{ arm: 'EXP30', lane: L }], { CTRL: true, EXP30: false }),
  ev('d', 150_000, [{ arm: 'EXP30', lane: L }, { arm: 'CTRL', lane: L }], { CTRL: true, EXP30: true }) // shortlisted by both arms
];
const lanes = [{ key: L, cell: 'GA0.VA0', replicate: 3, shortlisted: 3 }];

test('V = the best centre net among the lane’s OWN members qualified under the lane’s OWN arm', () => {
  const c = laneValues(evidence, 'CTRL', lanes)[0]!;
  const e = laneValues(evidence, 'EXP30', [{ ...lanes[0]!, shortlisted: 2 }])[0]!;

  assert.equal(c.value, 180_000); // a (200k) is not CTRL-qualified
  assert.equal(c.qualified, 2);
  assert.equal(e.value, 150_000); // c (190k) is not EXP30-qualified; a is not EXP30's member
  assert.equal(e.representative!.id, 'd');
});

test('a lane with no qualified member has V = $0 and no representative; a count mismatch fails closed', () => {
  const none = [ev('x', 300_000, [{ arm: 'EXP30', lane: L }], { CTRL: true, EXP30: false })];
  const v = laneValues(none, 'EXP30', [{ ...lanes[0]!, shortlisted: 1 }])[0]!;

  assert.equal(v.value, 0);
  assert.equal(v.representative, null);
  const empty = laneValues([], 'CTRL', [{ ...lanes[0]!, shortlisted: 0 }])[0]!;

  assert.equal(empty.value, 0);
  assert.throws(() => laneValues(none, 'EXP30', [{ ...lanes[0]!, shortlisted: 3 }]));
});

test('ties in V follow the P0 order (selection robust, then lower centre DD, then label)', () => {
  const tie = [ev('p', 100_000, [{ arm: 'CTRL', lane: L }], { CTRL: true, EXP30: true }, 90_000), ev('q', 100_000, [{ arm: 'CTRL', lane: L }], { CTRL: true, EXP30: true }, 95_000)];

  assert.equal(laneValues(tie, 'CTRL', [{ ...lanes[0]!, shortlisted: 2 }])[0]!.representative!.id, 'q');
});

test('populations: an arm sees only its own members, with its own verdicts; the adapted RA1 is EXP30-only', () => {
  assert.deepEqual(populationOf(evidence, 'CTRL').map((e) => e.id).sort(), ['a', 'b', 'd']);
  assert.deepEqual(populationOf(evidence, 'EXP30').map((e) => [e.id, e.qualified]), [['c', false], ['d', true]]);
  assert.deepEqual(selectorsOf('CTRL'), ['P0', 'RA1-original']);
  assert.deepEqual(selectorsOf('EXP30'), ['P0', 'RA1-original', 'RA1-adapted']);
  assert.throws(() => orderOf('RA1-adapted', [], 'CTRL'));
});
