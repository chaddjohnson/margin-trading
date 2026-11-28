// E4 qualification: Q2 / Q3 / Q5 flip in both directions, Q3 gates the p90 of EACH of the three metrics under EXP
// (D-4), Q5 requires the FULL EXP envelope at 10 bps (D-10), exact boundaries, CTRL = Assignment 3's gate expressions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nbStats } from '../../vg-l0-full-joint/fitness.ts';
import { arms } from '../context.ts';
import { verdictOf } from '../qualify.ts';
import { nextUp, rec } from './helpers.ts';

const { CTRL, EXP } = arms;
const nbs = (n: number, f: (i: number) => Parameters<typeof rec>[0]) => Array.from({ length: n }, (_v, i) => rec({ net: 80_000, ...f(i), signature: `n${i}` }));
const verdicts = (o: { centre?: Parameters<typeof rec>[0]; confirm?: ReturnType<typeof nbs>; s10?: Parameters<typeof rec>[0] }) => {
  const centre = rec({ net: 100_000, dd: 20_000, pl: 5_000, bd: 5_000, ...o.centre, signature: 'c' });
  const recs = o.confirm ?? nbs(40, () => ({ dd: 20_000, pl: 5_000, bd: 5_000 }));
  const confirm = { nb: nbStats(centre, recs, []), recs };
  const s10 = rec({ net: 90_000, dd: 21_000, pl: 5_100, bd: 5_100, ...o.s10, signature: 's10' });
  const p10 = 80_000;

  return { CTRL: verdictOf(CTRL, centre, confirm, s10, p10), EXP: verdictOf(EXP, centre, confirm, s10, p10) };
};

test('a baseline member qualifies under both arms', () => {
  const v = verdicts({});

  assert.equal(v.CTRL.qualified, true);
  assert.equal(v.EXP.qualified, true);
});

test('Q2 flips: centre DD $38k (PL/BD $10k) → CTRL fails, EXP passes; centre PL or BD $26k → CTRL passes, EXP fails', () => {
  let v = verdicts({ centre: { dd: 38_000, pl: 10_000, bd: 10_000 } });

  assert.deepEqual([v.CTRL.gates.Q2, v.EXP.gates.Q2], [false, true]);
  assert.ok(v.CTRL.reasons.includes('Q2 DD > limit'));
  v = verdicts({ centre: { dd: 30_000, pl: 26_000 } });
  assert.deepEqual([v.CTRL.gates.Q2, v.EXP.gates.Q2], [true, false]);
  assert.ok(v.EXP.reasons.includes('Q2 PL > limit'));
  v = verdicts({ centre: { dd: 30_000, bd: 26_000 } });
  assert.deepEqual([v.CTRL.gates.Q2, v.EXP.gates.Q2], [true, false]);
  assert.ok(v.EXP.reasons.includes('Q2 BD > limit'));
});

test('Q3 gates the confirmation p90 of each of the three metrics under EXP; the marked p90 DD only under CTRL', () => {
  const cases = [
    { name: 'p90 DD 38k', recs: nbs(40, (i) => ({ dd: i < 30 ? 20_000 : 38_000 })), ctrl: false, exp: true },
    { name: 'p90 PL 26k', recs: nbs(40, (i) => ({ pl: i < 30 ? 5_000 : 26_000 })), ctrl: true, exp: false },
    { name: 'p90 BD 26k', recs: nbs(40, (i) => ({ bd: i < 30 ? 5_000 : 26_000 })), ctrl: true, exp: false },
    { name: 'p90 DD 41k', recs: nbs(40, (i) => ({ dd: i < 30 ? 20_000 : 41_000 })), ctrl: false, exp: false }
  ];

  for (const c of cases) {
    const v = verdicts({ confirm: c.recs });

    assert.equal(v.CTRL.gates.Q3, c.ctrl, `${c.name} CTRL`);
    assert.equal(v.EXP.gates.Q3, c.exp, `${c.name} EXP`);
  }
});

test('Q5 at 10 bps: CTRL net > 0 ∧ DD ≤ 35 % of C0; EXP net > 0 ∧ the FULL envelope (D-10)', () => {
  let v = verdicts({ s10: { dd: 38_000, pl: 10_000, bd: 10_000 } });

  assert.deepEqual([v.CTRL.gates.Q5, v.EXP.gates.Q5], [false, true]);
  v = verdicts({ s10: { bd: 26_000 } });
  assert.deepEqual([v.CTRL.gates.Q5, v.EXP.gates.Q5], [true, false]);
  assert.ok(v.EXP.reasons.includes('Q5 10 bps BD > limit'));
  v = verdicts({ s10: { pl: 26_000 } });
  assert.deepEqual([v.CTRL.gates.Q5, v.EXP.gates.Q5], [true, false]);
  v = verdicts({ s10: { net: -1 } });
  assert.deepEqual([v.CTRL.gates.Q5, v.EXP.gates.Q5], [false, false]);
});

test('exact boundaries in qualification: equal to the limit passes, one ulp above fails', () => {
  assert.equal(verdicts({ centre: { dd: 35_000 } }).CTRL.gates.Q2, true);
  assert.equal(verdicts({ centre: { dd: nextUp(35_000) } }).CTRL.gates.Q2, false);
  assert.equal(verdicts({ centre: { dd: 40_000 } }).EXP.gates.Q2, true);
  assert.equal(verdicts({ centre: { dd: nextUp(40_000) } }).EXP.gates.Q2, false);
  assert.equal(verdicts({ centre: { pl: 25_000 } }).EXP.gates.Q2, true);
  assert.equal(verdicts({ centre: { pl: nextUp(25_000) } }).EXP.gates.Q2, false);
  assert.equal(verdicts({ s10: { bd: 25_000 } }).EXP.gates.Q5, true);
  assert.equal(verdicts({ s10: { bd: nextUp(25_000) } }).EXP.gates.Q5, false);
  // a confirmation p90 exactly at the limit (every neighbour at 25,000) passes; one ulp above fails
  assert.equal(verdicts({ confirm: nbs(40, () => ({ pl: 25_000 })) }).EXP.gates.Q3, true);
  assert.equal(verdicts({ confirm: nbs(40, () => ({ pl: nextUp(25_000) })) }).EXP.gates.Q3, false);
});

test('CTRL severities use Assignment 3’s keys and order', () => {
  const v = verdicts({ centre: { net: -5, dd: 36_000 }, confirm: nbs(40, () => ({ dd: 36_000 })), s10: { net: -10, dd: 36_500 } });

  assert.deepEqual(Object.keys(v.CTRL.severity), ['Q1', 'Q2', 'Q3', 'Q5']);
  assert.equal(v.CTRL.severity.Q2, 1_000);
  assert.equal(v.CTRL.severity.Q5, 1_500);
});
