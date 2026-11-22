// E4: P3's feasibility through the pilot's UNCHANGED arm fitness (plausibility, screen violation and reason, the rung fit's
// violation parts): flips in both directions against P0 and against the pilot's 40/25/25, exact boundaries at BD $30,000,
// PL $25,000 and DD $40,000 (a value equal to its limit passes, one ulp above fails), the denominators (C0 and the funded
// principal, which equals C0 in the one slot), the marked twins never gating, and invalid states failing closed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nbStats } from '../../vg-l0-full-joint/fitness.ts';
import { arms as pilotArms } from '../../vg-l0-risk-envelope-pilot/context.ts';
import { assessArm, plausibleArm, screenReason, screenViolation, violationArm } from '../../vg-l0-risk-envelope-pilot/fitness.ts';
import { nextDown, nextUp, rec } from '../../vg-l0-risk-envelope-pilot/tests/helpers.ts';
import { C0, arms, asPilotArm } from '../context.ts';

const CTRL = asPilotArm(arms.CTRL);
const EXP30 = asPilotArm(arms.EXP30);
const P2 = pilotArms.EXP;

test('the limits come from the policies on named denominators: CTRL 35 % of C0; EXP30 40 % / 25 % / 30 %', () => {
  assert.equal(C0, 100_000);
  assert.equal(arms.CTRL.markedDdLimit, (C0 * 35) / 100);
  assert.equal(arms.EXP30.markedDdLimit, (C0 * 40) / 100);
  assert.deepEqual(arms.EXP30.policy.principalLoss, { pct: 25, basis: 'liquidation' });
  assert.deepEqual(arms.EXP30.policy.bankedDd, { pct: 30, basis: 'liquidation' });
  assert.equal(arms.CTRL.policy.principalLoss, null);
  assert.equal(arms.CTRL.policy.bankedDd, null);
  assert.equal(arms.CTRL.nbInstrument, 'nl0');
  assert.equal(arms.EXP30.nbInstrument, 'unrounded');
  assert.deepEqual(arms.CTRL.ra1S4, { original: 35_000, adapted: null });
  assert.deepEqual(arms.EXP30.ra1S4, { original: 35_000, adapted: 40_000 });
});

test('plausibility flips: DD $38k with PL/BD inside — CTRL fails, EXP30 passes', () => {
  const r = rec({ dd: 38_000, pl: 10_000, bd: 10_000 });

  assert.equal(plausibleArm(r, CTRL), false);
  assert.equal(plausibleArm(r, EXP30), true);
  assert.equal(screenReason(r, CTRL), 'DD > ceiling');
  assert.equal(screenReason(r, EXP30), 'plausible');
});

test('BD in ($25k, $30k]: fails the pilot 40/25/25, passes P3; BD > $30k fails P3; PL > $25k fails P3', () => {
  const r = rec({ dd: 30_000, pl: 10_000, bd: 28_000 });

  assert.equal(plausibleArm(r, P2), false);
  assert.equal(plausibleArm(r, EXP30), true);
  assert.equal(plausibleArm(r, CTRL), true);
  for (const [pl, bd, why] of [
    [10_000, 31_000, 'BD > limit'],
    [26_000, 10_000, 'PL > limit'],
    [26_000, 31_000, 'PL > limit & BD > limit']
  ] as const) {
    const x = rec({ dd: 30_000, pl, bd });

    assert.equal(plausibleArm(x, CTRL), true);
    assert.equal(plausibleArm(x, EXP30), false);
    assert.equal(screenReason(x, EXP30), why);
    assert.ok(screenViolation(x, EXP30) > 0);
  }
});

test('exact boundaries: equal to the limit passes, one ulp above fails (unrounded)', () => {
  assert.equal(plausibleArm(rec({ dd: 35_000 }), CTRL), true);
  assert.equal(plausibleArm(rec({ dd: nextUp(35_000) }), CTRL), false);
  assert.equal(plausibleArm(rec({ dd: 40_000 }), EXP30), true);
  assert.equal(plausibleArm(rec({ dd: nextUp(40_000) }), EXP30), false);
  assert.equal(plausibleArm(rec({ pl: 25_000 }), EXP30), true);
  assert.equal(plausibleArm(rec({ pl: nextUp(25_000) }), EXP30), false);
  assert.equal(plausibleArm(rec({ bd: 30_000 }), EXP30), true);
  assert.equal(plausibleArm(rec({ bd: nextUp(30_000) }), EXP30), false);
  assert.equal(plausibleArm(rec({ dd: nextDown(40_000), pl: nextDown(25_000), bd: nextDown(30_000) }), EXP30), true);
  // the dollar limits are (denominator × pct) / 100 of C0 (DD, BD) and of the funded principal (= C0, PL)
  const a = assessArm(rec({ dd: 1, pl: 1, bd: 1 }), EXP30);

  assert.deepEqual(
    a.checks.filter((c) => c.limit !== null).map((c) => [c.metric, c.basis, c.limit]),
    [
      ['markedDd', 'marked', 40_000],
      ['principalLoss', 'liquidation', 25_000],
      ['bankedDd', 'liquidation', 30_000]
    ]
  );
});

test('the marked twins are reported, never gated; the envelope validation keeps liquidation ≥ marked (fail closed)', () => {
  const a = assessArm(rec({ envelope: { principalLossMarked: 25_000, principalLossLiquidation: 25_000, bankedDdMarked: 30_000, bankedDdLiquidation: 30_000 } }), EXP30);

  assert.equal(a.pass, true);
  assert.ok(a.checks.filter((c) => c.basis === 'marked' && c.metric !== 'markedDd').every((c) => c.limit === null));
  assert.throws(() => plausibleArm(rec({ envelope: { principalLossMarked: 1, principalLossLiquidation: 1, bankedDdMarked: 30_500, bankedDdLiquidation: 30_000 } }), EXP30), /liquidation banked DD/);
});

test('the rung violation under EXP30: one part per gated centre metric and per gated neighbourhood p90 (unrounded)', () => {
  const centre = rec({ dd: 20_000, pl: 5_000, bd: 5_000, signature: 'c' });
  const mk = (f: (i: number) => Parameters<typeof rec>[0]) => Array.from({ length: 16 }, (_v, i) => rec({ ...f(i), signature: `n${i}` }));
  const cases = [
    { name: 'p90 BD 31k', nbs: mk((i) => ({ dd: 20_000, pl: 5_000, bd: i < 13 ? 10_000 : 31_000 })), ctrl: 0, exp: 'p90bd' },
    { name: 'p90 BD 28k (passes P3, fails P2)', nbs: mk((i) => ({ dd: 20_000, pl: 5_000, bd: i < 13 ? 10_000 : 28_000 })), ctrl: 0, exp: 0 },
    { name: 'p90 PL 26k', nbs: mk((i) => ({ dd: 20_000, pl: i < 13 ? 10_000 : 26_000, bd: 5_000 })), ctrl: 0, exp: 'p90pl' },
    { name: 'p90 DD 38k', nbs: mk((i) => ({ dd: i < 13 ? 20_000 : 38_000, pl: 5_000, bd: 5_000 })), ctrl: 'p90', exp: 0 }
  ];

  for (const c of cases) {
    const nb = nbStats(centre, c.nbs, []);
    const vc = violationArm(centre, nb, c.nbs, CTRL);
    const ve = violationArm(centre, nb, c.nbs, EXP30);

    assert.equal(vc.violation > 0, c.ctrl !== 0, `${c.name} CTRL`);
    assert.equal(ve.violation > 0, c.exp !== 0, `${c.name} EXP30`);
    if (c.exp) assert.ok(ve.parts[c.exp]! > 0, `${c.name} EXP30 part ${c.exp}`);
    assert.deepEqual(Object.keys(ve.parts), ['net', 'dd', 'pl', 'bd', 'p90', 'p90pl', 'p90bd', 'structure']);
    assert.deepEqual(Object.keys(vc.parts), ['net', 'dd', 'p90', 'structure']);
  }
  // P2 rejects the BD-28k neighbourhood that P3 admits
  const nbs = mk((i) => ({ dd: 20_000, pl: 5_000, bd: i < 13 ? 10_000 : 28_000 }));

  assert.ok(violationArm(centre, nbStats(centre, nbs, []), nbs, P2).violation > 0);
});

test('invalid states fail closed: an error record is never plausible; a missing or invalid envelope throws under EXP30', () => {
  assert.equal(plausibleArm(rec({ error: 'boom' }), EXP30), false);
  assert.equal(plausibleArm(rec({ error: 'boom' }), CTRL), false);
  assert.equal(plausibleArm(rec({ net: 0 }), EXP30), false);
  assert.equal(plausibleArm(rec({ d1Lots: 0 }), EXP30), false);
  assert.throws(() => plausibleArm(rec({ envelope: null }), EXP30));
  assert.throws(() => plausibleArm(rec({ envelope: { principalLossMarked: 1, principalLossLiquidation: Number.NaN, bankedDdMarked: 1, bankedDdLiquidation: 1 } }), EXP30));
  assert.throws(() => plausibleArm(rec({ envelope: { principalLossMarked: 1, principalLossLiquidation: -1, bankedDdMarked: 1, bankedDdLiquidation: 1 } }), EXP30));
});
