// E4 selection: the envelope-adapted RA1 differs from Assignment 2's RA1 ONLY in S4's ceiling (D-8): ra1OrderWith(·, 35 %
// of C0) re-derives Assignment 2's ra1Order exactly on every sealed Assignment 3 qualification population (read-only
// sealed records; no market data), and an S4 value between 35 % and 40 % of C0 fails the original and passes the adapted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ra1Order, ra1Thresholds } from '../../vg-l0-risk-families/select.ts';
import type { Evidence as A2Evidence } from '../../vg-l0-risk-families/qualify.ts';
import { arms, repoRoot } from '../context.ts';
import { failedScreensWith, ra1OrderWith, screensWith } from '../select.ts';

test('the RA1 thresholds: original S4 = 35 % of C0 in both arms; adapted S4 = 40 % of C0 (EXP only); S1–S3 unchanged', () => {
  assert.equal(arms.CTRL.ra1S4.original, ra1Thresholds.worst10MeanDd);
  assert.equal(arms.EXP.ra1S4.original, ra1Thresholds.worst10MeanDd);
  assert.equal(arms.EXP.ra1S4.adapted, (100_000 * 40) / 100);
  assert.equal(arms.CTRL.ra1S4.adapted, null);
});

test('ra1OrderWith(·, 35 % of C0) = Assignment 2’s ra1Order on every sealed Assignment 3 population', () => {
  const dir = path.join(repoRoot, 'research/vg-l0-full-joint/results/folds');
  let populations = 0;

  for (const cut of ['C19', 'C21', 'C23', 'C24'])
    for (const stage of ['broad', 'refine', ...(cut === 'C24' ? ['informed'] : [])]) {
      const ev = (JSON.parse(fs.readFileSync(path.join(dir, cut, `${stage}-qualification.json`), 'utf8')) as { evidence: A2Evidence[] }).evidence.filter(
        (e) => e.stage !== 'control'
      );
      const cells = [...new Set(ev.map((e) => e.cell))];

      for (const pop of [ev, ...cells.slice(0, 12).map((c) => ev.filter((e) => e.cell === c))]) {
        const a = ra1Order(pop).map((e) => e.label);
        const b = ra1OrderWith(pop, arms.CTRL.ra1S4.original).map((e) => e.label);

        assert.deepEqual(b, a, `${cut} ${stage}`);
        populations++;
      }
    }
  assert.ok(populations >= 40);
});

test('S4 flips between the original and the adapted RA1 for a worst-10 % mean DD in (35 %, 40 %] of C0', () => {
  const e = { risk: { openLot: null, openShare: null, mae: { worst: -1_000 } }, selectTail: { worst10Mean: 38_000 } } as unknown as A2Evidence;

  assert.equal(screensWith(e, arms.EXP.ra1S4.original).S4, false);
  assert.equal(screensWith(e, arms.EXP.ra1S4.adapted!).S4, true);
  assert.deepEqual(failedScreensWith(e, arms.EXP.ra1S4.original), ['S4']);
  assert.deepEqual(failedScreensWith(e, arms.EXP.ra1S4.adapted!), []);
  const edge = { ...e, selectTail: { worst10Mean: 40_000 } } as unknown as A2Evidence;

  assert.equal(screensWith(edge, arms.EXP.ra1S4.adapted!).S4, true);
});
