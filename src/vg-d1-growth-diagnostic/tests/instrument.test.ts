// The reconstruction of Priority 3's perturbation instrument and the probe moves, on the sealed configurations (read
// from Priority 3's sealed records; no market data): the row-level reconstruction equals space.ts `neighbourhood` for
// every confirmation, small, wide and scope family of the named subjects, and a probe changes exactly one input (two
// for the crossed grid) by u × the instrument's radius, rounded and clipped as the instrument does.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fineStepOf, neighbourhood, numericGenes, quadId } from '../../vg-d1-growth-joint/space.ts';
import { familiesOf, inputsOf, moveInput, radiusOf, rowsOf } from '../risk.ts';
import { loadSubjects } from '../subjects.ts';

const subjects = loadSubjects();

describe('the instrument reconstruction', () => {
  test('the frozen subject list: 12 Growth-pair finalists, 16 independent finalists, the named subjects', () => {
    assert.equal(subjects.filter((s) => /^G\d\d$/.test(s.key)).length, 12);
    assert.equal(subjects.filter((s) => /^I\d\d$/.test(s.key)).length, 16);
    for (const k of ['A', 'B', 'C', 'D', 'GP4', 'GP085', 'IP', 'XP', 'SP'])
      assert.ok(
        subjects.some((s) => s.key === k),
        k
      );
    assert.equal(subjects.find((s) => s.key === 'A')!.id, 'd4cde31356e2306a');
    assert.equal(subjects.find((s) => s.key === 'B')!.id, '676731bfd4ec280f');
    assert.equal(subjects.find((s) => s.key === 'C')!.id, 'f324035d15f69610');
    assert.equal(subjects.find((s) => s.key === 'D')!.id, '7a377d49c2b9aa55');
  });

  test('rowsOf equals space.ts neighbourhood for every family of A, B, C, D and the informed primary', () => {
    for (const k of ['A', 'B', 'C', 'D', 'IP']) {
      const s = subjects.find((x) => x.key === k)!;

      for (const fams of Object.values(familiesOf(s)))
        for (const f of fams) {
          const rows = rowsOf(s.quad, f); // throws on any difference
          const ref = neighbourhood(s.quad, f);

          assert.deepEqual(
            rows.map((r) => r.id),
            ref.map((p) => p.id)
          );
        }
    }
  });

  test('a probe moves exactly one input by u × the radius (rounded to the fine grid and clipped like the instrument)', () => {
    const a = subjects.find((x) => x.key === 'A')!;

    for (const x of inputsOf(a.quad, 'joint', a.enabled).filter(
      (i) => i.active && (i.book === 'G:GDX' || i.book === 'D1:GDX')
    )) {
      const m = moveInput(a.quad, x.book, x.key, 1);
      const fam = x.book.startsWith('D1') ? 'd1' : 'g';
      const before = a.quad[fam].GDX as unknown as Record<string, number>;
      const after = m.quad[fam].GDX as unknown as Record<string, number>;
      const changed = Object.keys(before).filter((k) => before[k] !== after[k]);

      assert.ok(changed.length <= 1, `${x.key}: ${changed.join(',')}`);
      if (changed.length) {
        assert.equal(changed[0], x.key);
        // rounding to the fine grid may add up to half a step (the instrument's own rounding)
        const half = x.book.startsWith('D1') ? 0 : fineStepOf(numericGenes.find((g) => g.key === x.key)!) / 2;

        assert.ok(Math.abs(after[x.key]! - before[x.key]!) <= radiusOf(x.book, x.key) + half + 1e-9, x.key);
      } else assert.equal(quadId(m.quad), a.id);
      // the other books are untouched
      assert.deepEqual(m.quad.d1.VGT, a.quad.d1.VGT);
      assert.deepEqual(m.quad.g.VGT, a.quad.g.VGT);
    }
  });
});
