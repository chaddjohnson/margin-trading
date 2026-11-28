// risk-envelope: tests of the qualification module (GPU Phase 7) — exact limits and denominators, the boundary rule,
// the control policy's identity with the original $35,000 rule (Assignment 2's plausibility and violation term, bit for
// bit), the experimental envelope, scaling to $250,000 / $500,000, the neighbourhood statistics, and every fail-closed
// case. Runnable without a GPU or market data.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { economics } from '../../vg-l0-risk-families/context.ts';
import { violationOf } from '../../vg-l0-risk-families/fitness.ts';
import type { Rec } from '../../vg-d1-growth-joint/evaluate.ts';
import { Rng } from '../../optimizer/rng.ts';
import {
  NL0_CONTROL,
  RE_EXPERIMENTAL,
  assertSupportedOptions,
  assess,
  capitalContext,
  envelopeNbStats,
  limitOf,
  policyById
} from '../policy.ts';

const env = (plM: number, plL: number, bdM: number, bdL: number) => ({
  principalLossMarked: plM,
  principalLossLiquidation: plL,
  bankedDdMarked: bdM,
  bankedDdLiquidation: bdL
});
const up = (x: number) => {
  const b = new Float64Array([x]);
  const i = new BigInt64Array(b.buffer);

  i[0]! += 1n;
  return b[0]!;
};
const down = (x: number) => {
  const b = new Float64Array([x]);
  const i = new BigInt64Array(b.buffer);

  i[0]! -= 1n;
  return b[0]!;
};

test('limits are exact whole-dollar amounts of the named denominator', () => {
  for (const [c0, pct, want] of [
    [100_000, 35, 35_000],
    [100_000, 40, 40_000],
    [100_000, 25, 25_000],
    [250_000, 40, 100_000],
    [250_000, 25, 62_500],
    [500_000, 40, 200_000],
    [500_000, 25, 125_000]
  ] as const)
    assert.equal(limitOf(pct, c0), want);
  assert.throws(() => limitOf(40.5, 100_000), /whole percent/);
  assert.throws(() => limitOf(0, 100_000), /whole percent/);
  assert.throws(() => capitalContext(100_000.5), /whole positive/);
  assert.throws(() => capitalContext(-1), /whole positive/);
});

test('the boundary: equal to the limit passes, one ulp above fails (dollars, unrounded)', () => {
  const at = (dd: number, e = env(0, 0, 0, 0)) => assess({ dd, envelope: e }, RE_EXPERIMENTAL);

  assert.equal(at(40_000).pass, true);
  assert.equal(at(up(40_000)).pass, false);
  assert.equal(at(down(40_000)).pass, true);
  assert.equal(at(1000, env(0, 25_000, 0, 0)).pass, true);
  assert.equal(at(1000, env(0, up(25_000), 0, 0)).pass, false);
  assert.equal(at(1000, env(0, 25_000, 0, 25_000)).pass, true);
  assert.equal(at(1000, env(0, 25_000, 0, up(25_000))).pass, false);
  // the marked twins are reported, never gated, under the liquidation-basis proposal
  const a = at(1000, env(24_000, 24_000, 24_000, 24_000));

  assert.equal(a.checks.filter((c) => c.pass !== null).length, 3);
  assert.deepEqual(
    a.checks.map((c) => [c.metric, c.basis, c.pass]),
    [
      ['markedDd', 'marked', true],
      ['principalLoss', 'marked', null],
      ['bankedDd', 'marked', null],
      ['principalLoss', 'liquidation', true],
      ['bankedDd', 'liquidation', true]
    ]
  );
});

test('the control policy reproduces the original $35,000 rule exactly (plausibility DD term and violation DD term)', () => {
  const rng = new Rng([20261121, 7, 0, 1]);
  const values = [0, 34_999.99, 35_000, up(35_000), down(35_000), 35_000.01, 70_000, 1e9];

  for (let i = 0; i < 20_000; i++) values.push(rng.next() * 80_000);
  for (const dd of values) {
    const a = assess({ dd }, NL0_CONTROL);
    const c = a.checks[0]!;
    const rec = { error: false, net: 1, dd, mixed: true, fam: { D1: { lots: 1 }, G: { lots: 1 } } } as unknown as Rec;

    assert.equal(c.limit, economics.ceiling);
    assert.equal(c.pass, dd <= economics.ceiling);
    assert.equal(a.pass, dd <= economics.ceiling);
    // bit-identical to Assignment 2's normalized DD violation (src/vg-l0-risk-families/fitness.ts violationOf)
    assert.equal(Object.is(c.excess, violationOf(rec, null).parts.dd!), true);
    assert.equal(a.checks.length, 1); // no envelope requested, nothing else reported
  }
});

test('the experimental envelope: three gates, the right denominators, the violation', () => {
  const a = assess({ dd: 45_000, envelope: env(26_000, 27_000, 10_000, 30_000) }, RE_EXPERIMENTAL);
  const by = (m: string, b: string) => a.checks.find((c) => c.metric === m && c.basis === b)!;

  assert.equal(a.pass, false);
  assert.equal(by('markedDd', 'marked').limit, 40_000);
  assert.equal(by('markedDd', 'marked').denominatorName, 'initial allocation C0');
  assert.equal(by('principalLoss', 'liquidation').limit, 25_000);
  assert.equal(by('principalLoss', 'liquidation').denominatorName, 'funded entry principal');
  assert.equal(by('principalLoss', 'liquidation').ratio, 0.27);
  assert.equal(by('bankedDd', 'liquidation').denominatorName, 'initial allocation C0');
  assert.equal(a.violation, 5_000 / 40_000 + 2_000 / 25_000 + 5_000 / 25_000);
  assert.equal(policyById('re-40-25-25'), RE_EXPERIMENTAL);
  assert.throws(() => policyById('p2'), /unknown risk-envelope policy/);
});

test('fail closed: a gate without an envelope, invalid envelopes, an invalid DD, whole shares', () => {
  assert.throws(() => assess({ dd: 1 }, RE_EXPERIMENTAL), /carries none/);
  const bad: unknown[] = [
    null,
    [],
    { ...env(0, 0, 0, 0), extra: 1 },
    { principalLossMarked: 0, principalLossLiquidation: 0, bankedDdMarked: 0 },
    env(NaN, 0, 0, 0),
    env(0, Infinity, 0, 0),
    env(0, -1, 0, 0),
    env(10, 9, 0, 0), // liquidation principal loss below the marked one
    env(0, 0, 10, 9), // liquidation banked DD below the marked one
    { ...env(0, 0, 0, 0), bankedDdMarked: '0' }
  ];

  for (const e of bad) {
    assert.throws(() => assess({ dd: 1, envelope: e as never }, RE_EXPERIMENTAL));
    // an envelope that is present is validated under the control policy too
    if (e !== null) assert.throws(() => assess({ dd: 1, envelope: e as never }, NL0_CONTROL));
  }
  for (const dd of [NaN, -1, Infinity, '1' as never]) assert.throws(() => assess({ dd }, NL0_CONTROL), /finite number/);
  assert.throws(() => assertSupportedOptions({ wholeShares: true }), /whole shares/);
  assert.doesNotThrow(() => assertSupportedOptions({ enabled: { 'G:GDX': false } }));
  assert.throws(
    () => assess({ dd: 1 }, NL0_CONTROL, { initialAllocation: 1, fundedPrincipal: 'compounding' as never }),
    /unsupported/
  );
});

test('scaling: the same path at $250,000 and $500,000 gives the same decisions and ratios (limits scale exactly)', () => {
  const rng = new Rng([20261121, 7, 0, 2]);

  for (let i = 0; i < 5_000; i++) {
    const base = { dd: rng.next() * 60_000, e: [rng.next() * 30_000, 0, rng.next() * 30_000, 0] };

    base.e[1] = base.e[0]! + rng.next() * 100;
    base.e[3] = base.e[2]! + rng.next() * 100;
    const at = (k: number) =>
      assess(
        { dd: base.dd * k, envelope: env(base.e[0]! * k, base.e[1]! * k, base.e[2]! * k, base.e[3]! * k) },
        RE_EXPERIMENTAL,
        capitalContext(100_000 * k)
      );
    const a = at(1);

    for (const k of [2, 4, 5]) {
      // powers of two scale exactly; ×5 can round in the last place of a value, never across a limit by more than that
      const b = at(k);

      a.checks.forEach((c, j) => {
        const d = b.checks[j]!;

        assert.equal(d.limit, c.limit === null ? null : c.limit * k);
        assert.ok(Math.abs(d.ratio - c.ratio) <= 4 * Number.EPSILON * Math.max(1, c.ratio));
        if (k !== 5 || Math.abs(c.value - (c.limit ?? -1)) > 1e-6) assert.equal(d.pass, c.pass);
      });
    }
    // $250,000 = 2.5 × $100,000 (the brief's middle size)
    const b = at(2.5);

    assert.equal(b.checks[0]!.limit, 100_000);
  }
});

test('neighbourhood statistics of the envelope (the neighbourhood DD quantile)', () => {
  const nbs = Array.from({ length: 10 }, (_, i) => ({
    dd: 1000 * (i + 1),
    envelope: env(100 * i, 100 * i + 5, 50 * i, 50 * i + 5)
  }));
  const s = envelopeNbStats(nbs, RE_EXPERIMENTAL);

  assert.equal(s.n, 10);
  assert.equal(s.failShare, 0);
  assert.equal(s.markedDd!.p90, 9100); // (n − 1) × 0.9 = 8.1 → 9000 + 0.1 × 1000
  assert.equal(s.markedDd!.worst, 10_000);
  assert.equal(s.markedDd!.worst10Mean, 10_000); // ⌈0.1 × 10⌉ = 1
  assert.equal(s.principalLoss.liquidation!.worst, 905);
  assert.throws(() => envelopeNbStats([], RE_EXPERIMENTAL), /at least one/);
  assert.throws(() => envelopeNbStats([{ dd: 1 }], RE_EXPERIMENTAL), /carries none/);
});
