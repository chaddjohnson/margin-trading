// staged-stop@1 configuration (RULE_SPECIFICATION.md §2–§3): every validity boundary in exact integer arithmetic (the
// last failing and first passing activation for every stage-1 distance; τ₂ = τ₁ − 5 versus τ₁ − 4; the box edges), the
// exhaustive check that V2 ∧ V3 imply V4 and that V3 has no integral equality case, refusals (unknown keys, Growth·GDX,
// non-integers, version), the canonical form, identities and keys (OFF = the base, byte for byte; ON = "st1-…",
// deterministic and independent of key order), the per-book key suffix, τ₁ conversions and the search repair.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  aMinOf,
  bookErrors,
  bookKeySuffix,
  canonicalStaged,
  repairBook,
  stagedErrors,
  stagedId,
  stagedJson,
  stagedKeySuffix,
  tau1TenthsOfD1,
  tau1TenthsOfFraction,
  tau1TenthsOfGrowth,
  v2ok,
  v3ok,
  v4ok,
  validateStaged
} from '../config.ts';

const ok = (a: number, t2: number, t1: number) =>
  bookErrors('D1:VGT', { activationTenths: a, stage2Tenths: t2 }, t1).length === 0;

describe('validity boundaries (integer arithmetic)', () => {
  it('the D7 minimum activation: last failing and first passing a for every τ₁ in the boxes', () => {
    for (let t1 = 30; t1 <= 150; t1++) {
      const a = aMinOf(t1);
      // the definition: A ≥ τ₁ / (1 − τ₁) + c in exact rationals (a/1000 ≥ t1/(1000 − t1) + 1/2000)
      const exact = (x: number) => 2 * x * (1000 - t1) >= 2000 * t1 + (1000 - t1);

      assert.ok(exact(a), `t1 ${t1}: a ${a} must pass`);
      if (a > 50) assert.ok(!exact(a - 1), `t1 ${t1}: a ${a - 1} must fail`);
      assert.equal(v3ok(a, t1), true);
      if (a > 50) assert.equal(v3ok(a - 1, t1), false);
      assert.ok(ok(a, Math.min(145, t1 - 5), t1));
      if (a > 50) assert.ok(!ok(a - 1, Math.min(145, t1 - 5), t1));
    }
  });

  it('documented examples: τ₁ 7.3 % → 8.0 %, 6.1 % → 6.6 %, 5.7 % → 6.1 %, 15.0 % → 17.7 %, ≤ 4.6 % → the box minimum 5.0 %', () => {
    assert.equal(aMinOf(73), 80);
    assert.equal(aMinOf(61), 66);
    assert.equal(aMinOf(57), 61);
    assert.equal(aMinOf(150), 177);
    assert.equal(aMinOf(46), 50);
    assert.equal(aMinOf(30), 50);
  });

  it('strictly tighter: τ₂ = τ₁ − 0.5 point passes, τ₁ − 0.4 fails', () => {
    for (const t1 of [30, 57, 61, 73, 150]) {
      assert.equal(v2ok(t1 - 5, t1), true);
      assert.equal(v2ok(t1 - 4, t1), false);
      assert.ok(ok(aMinOf(t1), t1 - 5 <= 145 ? t1 - 5 : 145, t1));
      if (t1 - 4 <= 145) assert.ok(!ok(aMinOf(t1), t1 - 4, t1));
    }
  });

  it('box edges: a 50 and 500, t2 15 and 145 pass where the other rules allow; 49, 501, 14, 146 fail', () => {
    assert.ok(ok(50, 15, 30));
    assert.ok(ok(500, 145, 150));
    assert.ok(!ok(49, 15, 30));
    assert.ok(!ok(501, 15, 30));
    assert.ok(!ok(50, 14, 30));
    assert.ok(!ok(500, 146, 150));
  });

  it('exhaustively: V2 ∧ V3 ⇒ V4, and V3 has no integral equality case in the domain', () => {
    let checked = 0;

    for (let t1 = 30; t1 <= 150; t1++)
      for (let a = 50; a <= 500; a++) {
        assert.notEqual((2 * a - 1) * (1000 - t1), 2000 * t1);
        if (!v3ok(a, t1)) continue;
        for (let t2 = 15; t2 <= Math.min(145, t1 - 5); t2++) {
          assert.ok(v4ok(a, t2), `${t1} ${a} ${t2}`);
          checked++;
        }
      }
    assert.ok(checked > 1_000_000);
  });

  it('V4 is checked on its own (strict): equality with 1 + c fails', () => {
    // (1000 + a)(1000 − t2) = 1,000,500 has no integer solution in the box; the predicate is strict
    assert.equal(v4ok(0, 0), false);
    assert.equal(v4ok(1, 0), true);
  });
});

describe('refusals', () => {
  it('non-integers, unknown keys, wrong types', () => {
    assert.match(bookErrors('D1:VGT', { activationTenths: 80.5, stage2Tenths: 30 }, 73).join(), /integer/);
    assert.match(bookErrors('D1:VGT', { activationTenths: 80, stage2Tenths: '30' }, 73).join(), /integer/);
    assert.match(bookErrors('D1:VGT', { activationTenths: 80, stage2Tenths: 30, ratio: 1 }, 73).join(), /unknown key/);
    assert.match(bookErrors('D1:VGT', null, 73).join(), /object/);
  });

  it('whole configurations: version, unknown keys, Growth·GDX, an unknown book, a disabled book', () => {
    const t = { 'D1:GDX': 61, 'D1:VGT': 73, 'G:VGT': 57 };

    assert.deepEqual(stagedErrors(null, t), []);
    assert.deepEqual(stagedErrors(undefined, t), []);
    assert.match(stagedErrors({ version: 2, books: {} }, t).join(), /version/);
    assert.match(stagedErrors({ version: 1, books: {}, extra: 1 }, t).join(), /unknown key/);
    assert.match(
      stagedErrors({ version: 1, books: { 'G:GDX': { activationTenths: 100, stage2Tenths: 30 } } }, t).join(),
      /out of scope/
    );
    assert.match(
      stagedErrors({ version: 1, books: { 'D1:XLK': { activationTenths: 100, stage2Tenths: 30 } } }, t).join(),
      /only/
    );
    assert.match(
      stagedErrors(
        { version: 1, books: { 'G:VGT': { activationTenths: 100, stage2Tenths: 30 } } },
        { 'D1:GDX': 61 }
      ).join(),
      /unknown/
    );
    assert.throws(
      () => validateStaged({ version: 1, books: { 'D1:VGT': { activationTenths: 79, stage2Tenths: 30 } } }, t),
      /early-lock/
    );
  });
});

describe('canonical form, identity and keys', () => {
  const A = {
    version: 1 as const,
    books: {
      'G:VGT': { stage2Tenths: 30, activationTenths: 150 },
      'D1:GDX': { activationTenths: 100, stage2Tenths: 40 }
    }
  };
  const B = {
    version: 1 as const,
    books: {
      'D1:GDX': { activationTenths: 100, stage2Tenths: 40 },
      'G:VGT': { activationTenths: 150, stage2Tenths: 30 }
    }
  };

  it('OFF is null and leaves the base identity and key unchanged', () => {
    assert.equal(canonicalStaged(null), null);
    assert.equal(canonicalStaged({ version: 1, books: {} }), null);
    assert.equal(stagedId('a2e385640ca61012', null), 'a2e385640ca61012');
    assert.equal(stagedId('rc1-f1a8b57cb02455c3', { version: 1, books: {} }), 'rc1-f1a8b57cb02455c3');
    assert.equal(stagedKeySuffix(null), '');
    assert.equal(stagedKeySuffix({ version: 1, books: {} }), '');
    assert.equal(bookKeySuffix(null), '');
  });

  it('ON: the canonical order, an "st1-" identity independent of key order, the key suffix', () => {
    assert.equal(stagedJson(A), stagedJson(B));
    assert.equal(
      stagedJson(A),
      '{"version":1,"books":{"D1:GDX":{"activationTenths":100,"stage2Tenths":40},"G:VGT":{"activationTenths":150,"stage2Tenths":30}}}'
    );
    assert.match(stagedId('a2e385640ca61012', A), /^st1-[0-9a-f]{16}$/);
    assert.equal(stagedId('a2e385640ca61012', A), stagedId('a2e385640ca61012', B));
    assert.notEqual(stagedId('a2e385640ca61012', A), stagedId('rc1-f1a8b57cb02455c3', A));
    assert.equal(stagedKeySuffix(A), `|st1:${stagedJson(A)}`);
    assert.equal(
      bookKeySuffix({ stage2Tenths: 30, activationTenths: 150 }),
      '|st1:{"activationTenths":150,"stage2Tenths":30}'
    );
  });
});

describe('τ₁ conversions', () => {
  it('D1 integer tenths; Growth exact tenths of a percent; engine fractions', () => {
    assert.equal(tau1TenthsOfD1(73), 73);
    assert.throws(() => tau1TenthsOfD1(7.3));
    assert.equal(tau1TenthsOfGrowth(5.7), 57);
    assert.equal(tau1TenthsOfGrowth(15), 150);
    assert.equal(tau1TenthsOfGrowth(3), 30);
    assert.throws(() => tau1TenthsOfGrowth(5.75));
    assert.equal(tau1TenthsOfFraction(0.057), 57);
    assert.equal(tau1TenthsOfFraction(73 / 1000), 73);
    assert.throws(() => tau1TenthsOfFraction(0.0575));
  });
});

describe('search repair (the space constructor only)', () => {
  it('τ₂ first (≤ τ₁ − 5), then A (≥ aMin); valid, idempotent, counted', () => {
    for (let t1 = 30; t1 <= 150; t1 += 7)
      for (const a of [50, 77, 200, 500])
        for (const t2 of [15, 60, 145]) {
          const r = repairBook({ activationTenths: a, stage2Tenths: t2 }, t1);

          assert.deepEqual(bookErrors('x', r.value, t1), []);
          assert.equal(r.value.stage2Tenths, Math.min(t2, t1 - 5));
          assert.equal(r.value.activationTenths, Math.max(a, aMinOf(t1)));
          assert.equal(r.repaired, r.value.stage2Tenths !== t2 || r.value.activationTenths !== a);
          assert.deepEqual(repairBook(r.value, t1), { value: r.value, repaired: false });
        }
  });
});
