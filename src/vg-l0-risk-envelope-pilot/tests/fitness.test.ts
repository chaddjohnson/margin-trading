// E4: the arm's feasibility — flips in both directions, exact boundaries, p90 on all three metrics, and CTRL bit-identical
// to Assignment 2 / 3's frozen fitness (violationOf, fitOf, plausible, the screen's expression and reason).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../../optimizer/rng.ts';
import { fitOf, nbStats, plausible, violationOf } from '../../vg-l0-full-joint/fitness.ts';
import { arms } from '../context.ts';
import { fitOfArm, neighbourhoodP90s, plausibleArm, screenReason, screenViolation, violationArm } from '../fitness.ts';
import { nextDown, nextUp, rec } from './helpers.ts';

const { CTRL, EXP } = arms;

test('the limits come from the policies: CTRL marked DD 35 % of C0; EXP 40 % / 25 % / 25 %', () => {
  assert.equal(CTRL.markedDdLimit, (100_000 * 35) / 100);
  assert.equal(EXP.markedDdLimit, (100_000 * 40) / 100);
  assert.equal(EXP.policy.principalLoss?.pct, 25);
  assert.equal(EXP.policy.principalLoss?.basis, 'liquidation');
  assert.equal(EXP.policy.bankedDd?.pct, 25);
  assert.equal(EXP.policy.bankedDd?.basis, 'liquidation');
  assert.equal(CTRL.policy.principalLoss, null);
  assert.equal(CTRL.policy.bankedDd, null);
  assert.equal(CTRL.nbInstrument, 'nl0');
  assert.equal(EXP.nbInstrument, 'unrounded');
});

test('plausibility flips: DD $38k with PL/BD ≤ $25k — CTRL fails, EXP passes', () => {
  const r = rec({ dd: 38_000, pl: 10_000, bd: 10_000 });

  assert.equal(plausibleArm(r, CTRL), false);
  assert.equal(plausibleArm(r, EXP), true);
  assert.equal(screenReason(r, CTRL), 'DD > ceiling');
  assert.equal(screenReason(r, EXP), 'plausible');
});

test('plausibility flips: PL $26k or BD $26k with DD ≤ $35k — CTRL passes, EXP fails', () => {
  for (const [pl, bd, why] of [
    [26_000, 10_000, 'PL > limit'],
    [10_000, 26_000, 'BD > limit'],
    [26_000, 26_000, 'PL > limit & BD > limit']
  ] as const) {
    const r = rec({ dd: 30_000, pl, bd });

    assert.equal(plausibleArm(r, CTRL), true);
    assert.equal(plausibleArm(r, EXP), false);
    assert.equal(screenReason(r, EXP), why);
    assert.ok(screenViolation(r, EXP) > 0);
  }
});

test('exact boundaries: a value equal to its limit passes, one ulp above fails (unrounded)', () => {
  assert.equal(plausibleArm(rec({ dd: 35_000 }), CTRL), true);
  assert.equal(plausibleArm(rec({ dd: nextUp(35_000) }), CTRL), false);
  assert.equal(plausibleArm(rec({ dd: 40_000 }), EXP), true);
  assert.equal(plausibleArm(rec({ dd: nextUp(40_000) }), EXP), false);
  assert.equal(plausibleArm(rec({ pl: 25_000 }), EXP), true);
  assert.equal(plausibleArm(rec({ pl: nextUp(25_000) }), EXP), false);
  assert.equal(plausibleArm(rec({ bd: 25_000 }), EXP), true);
  assert.equal(plausibleArm(rec({ bd: nextUp(25_000) }), EXP), false);
  assert.equal(plausibleArm(rec({ dd: nextDown(40_000), pl: nextDown(25_000), bd: nextDown(25_000) }), EXP), true);
  // the marked twins never gate: a marked PL above the limit with a liquidation PL at the limit still passes
  const r = rec({ envelope: { principalLossMarked: 25_000, principalLossLiquidation: 25_000, bankedDdMarked: 24_000, bankedDdLiquidation: 25_000 } });

  assert.equal(plausibleArm(r, EXP), true);
});

test('the neighbourhood p90 of EACH of the three metrics gates EXP (decision D-4); CTRL reads the marked p90 DD only', () => {
  const centre = rec({ dd: 20_000, pl: 5_000, bd: 5_000, signature: 'c' });
  const mk = (n: number, f: (i: number) => Parameters<typeof rec>[0]) => Array.from({ length: n }, (_v, i) => rec({ ...f(i), signature: `n${i}` }));
  const cases = [
    { name: 'p90 PL 26k', nbs: mk(16, (i) => ({ dd: 20_000, pl: i < 13 ? 10_000 : 26_000, bd: 5_000 })), ctrl: 0, exp: 'p90pl' },
    { name: 'p90 BD 26k', nbs: mk(16, (i) => ({ dd: 20_000, pl: 5_000, bd: i < 13 ? 10_000 : 26_000 })), ctrl: 0, exp: 'p90bd' },
    { name: 'p90 DD 38k', nbs: mk(16, (i) => ({ dd: i < 13 ? 20_000 : 38_000, pl: 5_000, bd: 5_000 })), ctrl: 'p90', exp: 0 }
  ];

  for (const c of cases) {
    const nb = nbStats(centre, c.nbs, []);
    const vc = violationArm(centre, nb, c.nbs, CTRL);
    const ve = violationArm(centre, nb, c.nbs, EXP);

    assert.equal(vc.violation > 0, c.ctrl !== 0, `${c.name} CTRL`);
    assert.equal(ve.violation > 0, c.exp !== 0, `${c.name} EXP`);
    if (c.exp) assert.ok(ve.parts[c.exp]! > 0, `${c.name} EXP part ${c.exp}`);
    if (c.ctrl) assert.ok(vc.parts[c.ctrl]! > 0, `${c.name} CTRL part ${c.ctrl}`);
  }
  // the unmeasured penalty is 1 in both arms (centre-first fidelity: no neighbours)
  assert.equal(violationArm(centre, null, null, CTRL).parts.p90, 1);
  assert.equal(violationArm(centre, null, null, EXP).parts.p90, 1);
  assert.equal(violationArm(centre, null, null, EXP).parts.p90pl, 0);
  assert.equal(violationArm(centre, null, null, EXP).parts.p90bd, 0);
  assert.deepEqual(Object.keys(violationArm(centre, null, null, CTRL).parts), ['net', 'dd', 'p90', 'structure']);
  assert.deepEqual(Object.keys(violationArm(centre, null, null, EXP).parts), ['net', 'dd', 'pl', 'bd', 'p90', 'p90pl', 'p90bd', 'structure']);
});

test('EXP compares UNROUNDED neighbourhood p90s; CTRL the frozen instrument (Priority 3’s p90 DD in cents)', () => {
  const centre = rec({ dd: 1_000, signature: 'c' });
  // 11 neighbours: the 0.9 quantile is the 10th order statistic = 40,000.004; Priority 3's nbStats rounds it to 40,000.00
  const nbs = Array.from({ length: 11 }, (_v, i) => rec({ dd: i < 9 ? 39_000 : 40_000.004, signature: `n${i}` }));
  const nb = nbStats(centre, nbs, []);

  assert.equal(nb.p90Dd, 40_000);
  assert.deepEqual(neighbourhoodP90s(nb, nbs, EXP)!.slice(0, 1), [40_000.004]);
  assert.deepEqual(neighbourhoodP90s(nb, nbs, CTRL), [40_000]);
  // EXP: unrounded 40,000.004 > 40 % of C0 → infeasible (the cent rounding would have passed it)
  assert.ok(violationArm(centre, nb, nbs, EXP).parts.p90! > 0);
});

// random and edge records for the bit-identity of CTRL with the frozen fitness
const randomCase = (rng: Rng) => {
  const pick = <T>(xs: readonly T[]) => xs[rng.int(xs.length)]!;
  const edge = [0, 35_000, nextUp(35_000), nextDown(35_000), 34_999.995, 35_000.005, 40_000, nextUp(40_000), 70_000, 1e-9];
  const dd = rng.next() < 0.4 ? pick(edge) : rng.next() * 80_000;
  const net = rng.next() < 0.1 ? pick([0, -1, 1e-9, -1e-9]) : (rng.next() - 0.2) * 400_000;
  const error = rng.next() < 0.03 ? 'boom' : undefined;
  const d1Lots = rng.next() < 0.1 ? 0 : 1 + rng.int(4);
  const gLots = rng.next() < 0.1 ? 0 : 1 + rng.int(4);
  const centre = rec({ dd, net, error, d1Lots, gLots, pl: rng.next() * 40_000, bd: rng.next() * 40_000 });
  const nbKind = rng.int(4);
  const p90 = nbKind === 0 ? Infinity : rng.next() < 0.4 ? pick(edge) : rng.next() * 80_000;
  const nb =
    nbKind === 3
      ? null
      : ({ n: 16, failed: 0, median: 1, p10: 1, p90Net: 1, mean: 1, robust: rng.next() < 0.1 ? NaN : (rng.next() - 0.3) * 300_000, medianDd: 1, p90Dd: p90, worstDd: p90, breaches: 0, breachShare: 0, meanExcess: 0, mixedShare: 1, allFourShare: 0, distinct: 1, sameAsCentre: 0, clipped: 0 } as never);

  return { centre, nb };
};

test('CTRL = Assignment 2/3’s frozen fitness bit for bit (20,000 random and edge records)', () => {
  const rng = Rng.from('vg-l0-risk-envelope-pilot', 'tests', 'fitness');

  for (let i = 0; i < 20_000; i++) {
    const { centre, nb } = randomCase(rng);
    const a = violationOf(centre, nb);
    const b = violationArm(centre, nb, null, CTRL);

    assert.ok(Object.is(a.violation, b.violation), `violation ${i}: ${a.violation} vs ${b.violation}`);
    assert.deepEqual(Object.keys(b.parts), Object.keys(a.parts));
    for (const k of Object.keys(a.parts)) assert.ok(Object.is(a.parts[k], b.parts[k]), `part ${k} ${i}`);

    const fa = fitOf('r1', 'x', centre, nb);
    const fb = fitOfArm('r1', 'x', centre, nb, null, CTRL);

    assert.deepEqual(fb, fa);
    if (!centre.error) assert.equal(plausibleArm(centre, CTRL), plausible(centre));

    // the screen's expression and reason (Assignment 3 search.ts, inline)
    const r = centre;
    const ok = plausible(r);
    const original = ok ? 0 : (r.error ? 1 : Math.max(0, -r.net) / 100_000 + (r.net > 0 ? 0 : 0.01)) + Math.max(0, r.dd - CTRL.markedDdLimit) / CTRL.markedDdLimit + (r.mixed ? 0 : 0.5);
    const mine = plausibleArm(r, CTRL) ? 0 : screenViolation(r, CTRL);

    assert.ok(Object.is(original, mine), `screen violation ${i}`);

    const reasonOriginal = r.error ? 'error' : r.lots === 0 ? 'no funded lot' : !r.mixed ? 'a family unfunded' : r.net <= 0 ? 'net ≤ 0' : r.dd > CTRL.markedDdLimit ? 'DD > ceiling' : 'plausible';

    assert.equal(screenReason(r, CTRL), reasonOriginal);
  }
});
