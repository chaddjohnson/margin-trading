// E4 static checks: P3 is Stage A's P3 and P0 is NL0_CONTROL; the pilot modules Stage B imports are byte-identical to
// the pilot's sealed code (its freeze and amendment A1); no Stage B module hard-codes a dollar limit or reads
// Assignment 3's economics.ceiling; every evaluation Stage B requests carries the envelope; the cells, the 16 NEW
// replicates (never used before for any cell at any cutoff) and the seed/budget matrix file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { allCells, legacyCellId } from '../../vg-l0-full-joint/space.ts';
import { NL0_CONTROL } from '../../risk-envelope/policy.ts';
import { policies as stageA } from '../../../tools/vg-l0-risk-envelope-sensitivity/policies.ts';
import { cellSelectionPrefix } from '../../vg-l0-risk-envelope-pilot/context.ts';
import { P3, arms, cells, codeDir, hashedCell, replicates, repoRoot, reproReplicates } from '../context.ts';
import { matrix } from '../stages.ts';

const sha = (f: string) => createHash('sha256').update(fs.readFileSync(path.join(repoRoot, f))).digest('hex');
const sources = fs
  .readdirSync(codeDir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ f, text: fs.readFileSync(path.join(codeDir, f), 'utf8') }));
const code = (t: string) =>
  t
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

test('P3 deep-equals Stage A’s predeclared P3; P0 is NL0_CONTROL itself', () => {
  assert.ok(isDeepStrictEqual(P3, stageA.P3));
  assert.equal(arms.EXP30.policy, P3);
  assert.equal(arms.CTRL.policy, NL0_CONTROL);
  assert.equal(`${P3.id}@${P3.version}`, 'sens-p3-40-25-30@1.0.0');
});

test('the pilot modules Stage B reuses are byte-identical to the pilot’s sealed code', () => {
  const fz = JSON.parse(fs.readFileSync(path.join(repoRoot, 'research/vg-l0-risk-envelope-pilot/results/protocol-freeze.json'), 'utf8')) as { codeFiles: { file: string; sha256: string }[] };
  const a1 = JSON.parse(fs.readFileSync(path.join(repoRoot, 'research/vg-l0-risk-envelope-pilot/results/amendments/A1.json'), 'utf8')) as { changed: { file: string; sha256: string }[] };
  const sealed = new Map(fz.codeFiles.map((f) => [f.file, f.sha256]));

  for (const c of a1.changed) sealed.set(c.file, c.sha256);
  for (const f of ['search.ts', 'fitness.ts', 'qualify.ts', 'select.ts', 'stages.ts', 'context.ts', 'doors.ts', 'records.ts', 'budget.ts']) {
    const file = `src/vg-l0-risk-envelope-pilot/${f}`;

    assert.equal(sha(file), sealed.get(file), file);
  }
});

test('no hidden limit: no Stage B module hard-codes a dollar limit or reads economics.ceiling', () => {
  for (const { f, text } of sources) {
    const c = code(text);

    assert.doesNotMatch(c, /economics\.ceiling/, f);
    assert.doesNotMatch(c, /\b(25|30|35|40)[_,]?000\b/, f);
    assert.doesNotMatch(c, /\bceiling\s*:/, f);
  }
});

test('every evaluation Stage B requests carries the risk envelope', () => {
  for (const f of ['qualify.ts', 'stages.ts']) {
    const lines = code(fs.readFileSync(path.join(codeDir, f), 'utf8'))
      .split('\n')
      .filter((l) => /\bcfg:/.test(l) && /\boptions:/.test(l));

    assert.ok(lines.length > 0, f);
    for (const l of lines) assert.match(l, /risk: true/, `${f}: ${l.trim()}`);
  }
});

test('the cells: the legacy cell and the pilot’s hash-selected cell', () => {
  const others = allCells.map((c) => c.id).filter((id) => id !== legacyCellId);
  const h = (id: string) => createHash('sha256').update(cellSelectionPrefix + id).digest('hex');
  const min = [...others].sort((a, b) => (h(a) < h(b) ? -1 : 1))[0];

  assert.deepEqual([...cells], [legacyCellId, min]);
  assert.equal(hashedCell, 'GB0.VD1');
});

test('16 new replicates R3–R18; R1/R2 only as reproduction lanes; never used by any earlier sealed search', () => {
  assert.deepEqual([...replicates], Array.from({ length: 16 }, (_v, i) => i + 3));
  assert.deepEqual([...reproReplicates], [1, 2]);

  const research = new Set(matrix().research.map((x) => x.laneKey));
  const roots = ['research/vg-l0-full-joint/results/search', 'research/vg-l0-risk-envelope-pilot/results/search'];
  const used: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(path.join(repoRoot, d), { withFileTypes: true })) {
      const p = path.join(d, e.name);

      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.json')) {
        const r = JSON.parse(fs.readFileSync(path.join(repoRoot, p), 'utf8')) as { lanes?: { key?: string; seedKey?: string }[] };

        for (const l of r.lanes ?? []) for (const k of [l.key, l.seedKey]) if (k && research.has(k)) used.push(`${p}: ${k}`);
      }
    }
  };

  for (const r of roots) walk(r);
  assert.deepEqual(used, []);
  assert.equal(research.size, 96); // 3 cutoffs × 2 cells × 16 replicates; both arms share each key
});

test('SEED_BUDGET_MATRIX.json equals the code’s matrix', () => {
  const m = JSON.parse(fs.readFileSync(path.join(repoRoot, 'research/vg-l0-risk-envelope-stage-b/SEED_BUDGET_MATRIX.json'), 'utf8')) as {
    researchLanes: { cutoff: string; cell: string; replicate: number; arm: string; laneKey: string; seedKey: string }[];
    reproductionLanes: { cutoff: string; cell: string; replicate: number; arm: string; laneKey: string; seedKey: string }[];
    bounds: { total: number };
  };
  const pick = (x: { cutoff: string; cell: string; replicate: number; arm: string; laneKey: string; seedKey: string }) => [x.cutoff, x.cell, x.replicate, x.arm, x.laneKey, x.seedKey];
  const mine = matrix();

  assert.deepEqual(m.researchLanes.map(pick), mine.research.map(pick));
  assert.deepEqual(m.reproductionLanes.map(pick), mine.reproduction.map(pick));
  assert.equal(m.bounds.total, 8_800_278);
  for (const x of mine.research) assert.equal(x.laneKey, x.seedKey);
});
