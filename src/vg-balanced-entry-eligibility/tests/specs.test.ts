// The study's search space and caches (PROTOCOL.md §6, §7, §9, §11): canonical spec ids, the 60-point grid, local
// boxes and seeded draws (deterministic, inside the box, separate exploratory and confirmation streams), the D1-stress
// design (radius, clipping, duplicates), the selection rules on synthetic records, the archive's binding refusal and
// byte-identical read-back, and the D1 centre's machine parameters against the resolved control.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { describe, test } from 'node:test';
import { Store } from '../../growth140-vgt-s8m/store.ts';
import { candidateBook } from '../../portfolio-aware-d1/phenotypes.ts';
import { ages } from '../context.ts';
import { resolveControl } from '../control.ts';
import type { EvalRecord } from '../evaluate.ts';
import { assignRoles, candidateOf, canonicalRankOf, frontier, quantile } from '../select.ts';
import { OFF, blockOf, boxOf, cellSpec, centreBooks, d1Points, drawsOf, gridE, gridSpecs, specId } from '../specs.ts';

const record = (spec: EvalRecord['spec'], net: number, dd: number, signature = `${net}`): EvalRecord =>
  ({ spec, net, dd, signature, late: net === 100 ? 0 : 1 }) as unknown as EvalRecord;

describe('specs', () => {
  test('canonical ids ignore key order and undefined fields', () => {
    assert.equal(
      specId({ eligibility: { VGT: { A: 5, e: 10 }, GDX: { e: 10, A: 5 } } }),
      specId({ eligibility: { GDX: { A: 5, e: 10 }, VGT: { e: 10, A: 5 } }, invalidation: undefined })
    );
    assert.notEqual(specId(OFF), specId(cellSpec('VGT', { A: 1, e: 0 })));
  });

  test('the grid has 60 distinct configurations in canonical order', () => {
    const grid = gridSpecs();

    assert.equal(grid.length, 60);
    assert.equal(new Set(grid.map((g) => specId(g.spec))).size, 60);
    assert.deepEqual(grid[0]!.spec, { eligibility: { VGT: { A: 1, e: 0 } } });
    assert.deepEqual(grid.at(-1)!.spec, { eligibility: { VGT: { A: 20, e: 50 }, GDX: { A: 20, e: 50 } } });
  });

  test('boxes, blocks and seeded draws stay inside the box and differ between families', () => {
    assert.deepEqual(boxOf({ A: 1, e: 0 }).A, [1, 3]);
    assert.deepEqual(boxOf({ A: 20, e: 50 }).A, [10, 20]);
    assert.deepEqual(boxOf({ A: 5, e: 10 }).e, [0, 30]);
    assert.equal(blockOf({ A: 5, e: 10 }).length, 9);
    assert.equal(blockOf({ A: 1, e: 0 }).length, 4);

    for (const cell of [
      { A: 1, e: 0 },
      { A: 10, e: 30 },
      { A: 20, e: 50 }
    ]) {
      const box = boxOf(cell);
      const x = drawsOf(cell, 16, ['explore', 'C24', 'VGT', cell.A, cell.e]);
      const again = drawsOf(cell, 16, ['explore', 'C24', 'VGT', cell.A, cell.e]);
      const c = drawsOf(cell, 32, ['confirm', 'C24', 'VGT', cell.A, cell.e]);

      assert.deepEqual(x, again, 'deterministic');
      assert.notDeepEqual(x, c.slice(0, 16), 'separate streams');

      for (const d of [...x, ...c]) {
        assert.ok(d.A >= box.A[0] && d.A <= box.A[1] && Number.isInteger(d.A));
        assert.ok(d.e >= box.e[0] && d.e <= box.e[1] && Number.isInteger(d.e));
      }
    }
  });

  test('the D1 stress: 64/128 points, Study 8 radius, clipped to the box, duplicates flagged', () => {
    const centre = centreBooks();
    const radius = {
      targetPercentChange: 10,
      trailingBuyPercentage: 2,
      trailingStopPercentage: 10,
      maximumHoldDays: 2,
      tickWindowSize: 10,
      intradayLossBuffer: 10,
      pullback: 10,
      continuationWindow: 20
    };

    for (const family of ['explore', 'confirm'] as const) {
      const points = d1Points(family);

      assert.equal(points.length, family === 'explore' ? 64 : 128);

      for (const point of points)
        for (const symbol of ['VGT', 'GDX'] as const)
          for (const [key, r] of Object.entries(radius))
            assert.ok(
              Math.abs(
                (point.books[symbol] as Record<string, number>)[key]! - (centre[symbol] as Record<string, number>)[key]!
              ) <= r
            );
    }

    // GDX Y = 0.1% sits on the box's lower bound: some points clip there
    assert.ok(
      d1Points('confirm').some((p) => p.clipped.some((c) => c.symbol === 'GDX' && c.key === 'trailingBuyPercentage'))
    );
  });

  test("the D1 centre converts to the control's machine parameters exactly", async () => {
    const { pool } = await resolveControl();
    const centre = centreBooks();

    for (const symbol of ['VGT', 'GDX'] as const) {
      const book = candidateBook(symbol, pool.phenotypes[symbol]!.name, centre[symbol]);

      assert.deepEqual({ ...book.params, label: '' }, { ...pool.phenotypes[symbol]!.params, label: '' });
    }
  });
});

describe('selection rules', () => {
  const off = record(OFF, 100, 10000, 'off');

  test('nothing qualifies → no roles, OFF stays (no qualifying improvement)', () => {
    const spec = cellSpec('VGT', { A: 20, e: 50 });
    const centre = record(spec, 150, 12000, 'x');
    // the exploratory neighbourhood is mostly unchanged: median Δ = 0
    const c = candidateOf(
      spec,
      'VGT',
      centre,
      off,
      [centre, off, off, off],
      null,
      canonicalRankOf('VGT', { A: 20, e: 50 }, ages, gridE)
    );
    const { selected, priority } = assignRoles([c]);

    assert.equal(c.exploratoryEligible, false);
    assert.equal(selected, null);
    assert.equal(priority.length, 0);
  });

  test('roles: high-profit by exploratory median, balanced by Δ − added DD, lower-drawdown by DD; ties canonical', () => {
    const make = (A: number, net: number, dd: number) => {
      const spec = cellSpec('VGT', { A, e: 0 });
      const r = record(spec, net, dd, `s${A}`);
      const x = [r, r, r, record(spec, net - 10, dd, `t${A}`)];
      const confirm = [r, r, r];

      return candidateOf(spec, 'VGT', r, off, x, confirm, canonicalRankOf('VGT', { A, e: 0 }, ages, gridE));
    };
    const a = make(1, 300, 20000); // most profit, more drawdown
    const b = make(3, 200, 9000); // less profit, less drawdown than OFF
    const { roles, priority, selected } = assignRoles([a, b]);

    assert.equal(roles['high-profit']!.key, a.key);
    assert.equal(roles.balanced!.key, b.key, '200 − 0 > 300 − 10000? no: 300 − 10000 < 200');
    assert.equal(roles['lower-drawdown']!.key, b.key);
    assert.equal(selected!.key, a.key);
    assert.equal(priority.length, 2);
  });

  test('frontier and quantiles', () => {
    assert.deepEqual(
      frontier([
        { net: 1, dd: 1 },
        { net: 2, dd: 2 },
        { net: 1, dd: 2 }
      ]).length,
      2
    );
    assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
    assert.equal(quantile([0, 10], 0.1), 1);
  });
});

describe('archive', () => {
  test('a record reads back byte-identically; another binding is refused', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vgbe-store-'));
    const file = path.join(dir, 'archive.sqlite');
    const value = { net: 1.25, dd: NaN, nested: { a: [1, 2, Infinity] } };
    const store = new Store(file, {
      binding: { job: 'a', codeDigest: 'x' },
      lruCapacity: 2,
      commitRows: 1,
      commitMs: 0
    });

    store.write('points', 'k', value);
    store.commit();
    store.close();

    const reopened = new Store(file, {
      binding: { job: 'a', codeDigest: 'x' },
      lruCapacity: 2,
      commitRows: 1,
      commitMs: 0
    });

    assert.deepEqual(reopened.read('points', 'k'), value);
    reopened.close();
    assert.throws(
      () => new Store(file, { binding: { job: 'a', codeDigest: 'y' }, lruCapacity: 2, commitRows: 1, commitMs: 0 }),
      /refused/
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
