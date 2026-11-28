// E4 qualification under P3 (the pilot's verdictOf, generic in the arm): Q2 / Q3 / Q5 flip in both directions, Q3 gates
// the confirmation p90 of each of the three metrics, Q5 the full envelope at 10 bps, exact boundaries at the P3 limits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nbStats } from '../../vg-l0-full-joint/fitness.ts';
import { verdictOf } from '../../vg-l0-risk-envelope-pilot/qualify.ts';
import { nextUp, rec } from '../../vg-l0-risk-envelope-pilot/tests/helpers.ts';
import { arms, asPilotArm } from '../context.ts';

const nbs = (n: number, f: (i: number) => Parameters<typeof rec>[0]) => Array.from({ length: n }, (_v, i) => rec({ net: 80_000, ...f(i), signature: `n${i}` }));
const verdicts = (o: { centre?: Parameters<typeof rec>[0]; confirm?: ReturnType<typeof nbs>; s10?: Parameters<typeof rec>[0] }) => {
  const centre = rec({ net: 100_000, dd: 20_000, pl: 5_000, bd: 5_000, ...o.centre, signature: 'c' });
  const recs = o.confirm ?? nbs(40, () => ({ dd: 20_000, pl: 5_000, bd: 5_000 }));
  const confirm = { nb: nbStats(centre, recs, []), recs };
  const s10 = rec({ net: 90_000, dd: 21_000, pl: 5_100, bd: 5_100, ...o.s10, signature: 's10' });

  return { CTRL: verdictOf(asPilotArm(arms.CTRL), centre, confirm, s10, 80_000), EXP30: verdictOf(asPilotArm(arms.EXP30), centre, confirm, s10, 80_000) };
};

test('a baseline member qualifies under both arms', () => {
  const v = verdicts({});

  assert.equal(v.CTRL.qualified, true);
  assert.equal(v.EXP30.qualified, true);
});

test('Q2: DD $38k → CTRL fails, EXP30 passes; BD $28k → both pass; BD $31k or PL $26k → CTRL passes, EXP30 fails', () => {
  let v = verdicts({ centre: { dd: 38_000, pl: 10_000, bd: 10_000 } });

  assert.deepEqual([v.CTRL.gates.Q2, v.EXP30.gates.Q2], [false, true]);
  v = verdicts({ centre: { dd: 30_000, bd: 28_000 } });
  assert.deepEqual([v.CTRL.gates.Q2, v.EXP30.gates.Q2], [true, true]);
  v = verdicts({ centre: { dd: 30_000, bd: 31_000 } });
  assert.deepEqual([v.CTRL.gates.Q2, v.EXP30.gates.Q2], [true, false]);
  assert.ok(v.EXP30.reasons.includes('Q2 BD > limit'));
  v = verdicts({ centre: { dd: 30_000, pl: 26_000 } });
  assert.deepEqual([v.CTRL.gates.Q2, v.EXP30.gates.Q2], [true, false]);
  assert.ok(v.EXP30.reasons.includes('Q2 PL > limit'));
});

test('Q3 gates the confirmation p90 of each metric under EXP30; the marked p90 DD only under CTRL', () => {
  const cases = [
    { name: 'p90 DD 38k', recs: nbs(40, (i) => ({ dd: i < 30 ? 20_000 : 38_000 })), ctrl: false, exp: true },
    { name: 'p90 PL 26k', recs: nbs(40, (i) => ({ pl: i < 30 ? 5_000 : 26_000 })), ctrl: true, exp: false },
    { name: 'p90 BD 28k', recs: nbs(40, (i) => ({ bd: i < 30 ? 5_000 : 28_000 })), ctrl: true, exp: true },
    { name: 'p90 BD 31k', recs: nbs(40, (i) => ({ bd: i < 30 ? 5_000 : 31_000 })), ctrl: true, exp: false },
    { name: 'p90 DD 41k', recs: nbs(40, (i) => ({ dd: i < 30 ? 20_000 : 41_000 })), ctrl: false, exp: false }
  ];

  for (const c of cases) {
    const v = verdicts({ confirm: c.recs });

    assert.equal(v.CTRL.gates.Q3, c.ctrl, `${c.name} CTRL`);
    assert.equal(v.EXP30.gates.Q3, c.exp, `${c.name} EXP30`);
  }
});

test('Q5 at 10 bps: EXP30 needs net > 0 and the full P3 envelope', () => {
  let v = verdicts({ s10: { dd: 38_000, pl: 10_000, bd: 10_000 } });

  assert.deepEqual([v.CTRL.gates.Q5, v.EXP30.gates.Q5], [false, true]);
  v = verdicts({ s10: { bd: 31_000 } });
  assert.deepEqual([v.CTRL.gates.Q5, v.EXP30.gates.Q5], [true, false]);
  assert.ok(v.EXP30.reasons.includes('Q5 10 bps BD > limit'));
  v = verdicts({ s10: { pl: 26_000 } });
  assert.deepEqual([v.CTRL.gates.Q5, v.EXP30.gates.Q5], [true, false]);
  v = verdicts({ s10: { net: -1 } });
  assert.deepEqual([v.CTRL.gates.Q5, v.EXP30.gates.Q5], [false, false]);
});

test('exact boundaries in qualification at the P3 limits', () => {
  assert.equal(verdicts({ centre: { bd: 30_000 } }).EXP30.gates.Q2, true);
  assert.equal(verdicts({ centre: { bd: nextUp(30_000) } }).EXP30.gates.Q2, false);
  assert.equal(verdicts({ centre: { pl: 25_000 } }).EXP30.gates.Q2, true);
  assert.equal(verdicts({ centre: { pl: nextUp(25_000) } }).EXP30.gates.Q2, false);
  assert.equal(verdicts({ centre: { dd: 40_000 } }).EXP30.gates.Q2, true);
  assert.equal(verdicts({ centre: { dd: nextUp(40_000) } }).EXP30.gates.Q2, false);
  assert.equal(verdicts({ s10: { bd: 30_000 } }).EXP30.gates.Q5, true);
  assert.equal(verdicts({ s10: { bd: nextUp(30_000) } }).EXP30.gates.Q5, false);
  assert.equal(verdicts({ confirm: nbs(40, () => ({ bd: 30_000 })) }).EXP30.gates.Q3, true);
  assert.equal(verdicts({ confirm: nbs(40, () => ({ bd: nextUp(30_000) })) }).EXP30.gates.Q3, false);
  assert.equal(verdicts({ confirm: nbs(40, () => ({ pl: 25_000 })) }).EXP30.gates.Q3, true);
  assert.equal(verdicts({ confirm: nbs(40, () => ({ pl: nextUp(25_000) })) }).EXP30.gates.Q3, false);
});

test('Q4: the unrounded confirmation p10 under EXP30; a failed draw counts as −C0 (fail closed)', () => {
  const centre = rec({ net: 100_000, signature: 'c' });
  const recs = nbs(40, (i) => (i < 6 ? { error: 'x' } : {}));
  const confirm = { nb: nbStats(centre, recs, []), recs };
  const s10 = rec({ net: 90_000, signature: 's10' });

  assert.equal(verdictOf(asPilotArm(arms.EXP30), centre, confirm, s10, -1).gates.Q4, false);
  assert.equal(verdictOf(asPilotArm(arms.EXP30), centre, confirm, s10, 1).gates.Q4, true);
});
