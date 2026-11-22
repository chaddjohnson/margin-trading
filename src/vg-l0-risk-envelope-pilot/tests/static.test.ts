// E4 static checks: no pilot module hard-codes a ceiling or reads Assignment 3's economics.ceiling; every evaluation the
// pilot requests carries the risk envelope; the derived lane equals a fresh derivation from Assignment 3's frozen lane;
// the hash-selected cell, the budget bound and the door guards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { allCells, legacyCellId } from '../../vg-l0-full-joint/space.ts';
import { cellSelectionPrefix, cells, codeDir, hashedCell } from '../context.ts';
import { deriveSearchFromDisk, derivedSearchFile, substitutions } from '../derive.ts';
import { bound } from '../budget.ts';
import { doorGuard, fullAuthorizationFile, frozenSelectionFile, selectionFile, validationFile } from '../doors.ts';
import { assertCommitted, isSealed } from '../records.ts';

const sources = fs
  .readdirSync(codeDir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => ({ f, text: fs.readFileSync(path.join(codeDir, f), 'utf8') }));
const code = (t: string) =>
  t
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

test('no hidden ceiling: no pilot module reads economics.ceiling or a literal 35k / 40k / 25k limit', () => {
  // derive.ts holds Assignment 3's frozen text as DATA (the `find` side of its substitutions); its `replace` side is
  // checked below, and the generated search.ts is checked in full
  for (const x of substitutions) {
    assert.doesNotMatch(x.replace, /economics/);
    assert.doesNotMatch(x.replace, /\b(35|40|25)[_,]?000\b/);
  }
  for (const { f, text } of sources.filter((x) => x.f !== 'derive.ts')) {
    const c = code(text);

    assert.doesNotMatch(c, /economics\.ceiling/, f);
    assert.doesNotMatch(c, /\b(35|40|25)[_,]?000\b/, f);
    assert.doesNotMatch(c, /\bceiling\s*:/, f);
  }
});

test('the derived lane imports no frozen plausibility or fit and reads the arm everywhere', () => {
  const s = fs.readFileSync(derivedSearchFile, 'utf8');

  assert.doesNotMatch(s, /\bplausible\(/);
  assert.doesNotMatch(s, /\bfitOf\(/);
  assert.doesNotMatch(s, /economics/);
  assert.equal((s.match(/this\.arm\.markedDdLimit/g) ?? []).length, 3);
  assert.equal((s.match(/plausibleArm\(/g) ?? []).length, 2);
});

test('every evaluation the pilot requests carries the risk envelope', () => {
  const s = fs.readFileSync(derivedSearchFile, 'utf8');

  // the derived lane: each of its three evalMany item builders sets risk: true
  assert.equal((s.match(/options: vOptions, risk: true/g) ?? []).length, 3);
  assert.equal((s.match(/options: vOptions \}/g) ?? []).length, 0);
  // every item builder of qualify.ts and stages.ts (a line with both `cfg:` and `options:`) sets risk: true
  for (const f of ['qualify.ts', 'stages.ts']) {
    const lines = code(fs.readFileSync(path.join(codeDir, f), 'utf8'))
      .split('\n')
      .filter((l) => /\bcfg: /.test(l) && /\boptions: /.test(l) && !/type |=> \(\{ label/.test(l));

    assert.ok(lines.length > 0, f);
    for (const l of lines) assert.match(l, /risk: true/, `${f}: ${l.trim()}`);
  }
});

test('the pilot lane = a fresh derivation from Assignment 3’s frozen search.ts (the declared substitutions only)', () => {
  assert.equal(fs.readFileSync(derivedSearchFile, 'utf8'), deriveSearchFromDisk());
});

test('the hash-selected cell is GB0.VD1 (outcome-independent; both cells in Assignment 3’s broad1 part)', () => {
  const others = allCells.map((c) => c.id).filter((id) => id !== legacyCellId);
  const best = others.map((id) => [createHash('sha256').update(cellSelectionPrefix + id).digest('hex'), id] as const).sort()[0]![1];

  assert.equal(best, hashedCell);
  assert.deepEqual([...cells], [legacyCellId, hashedCell]);
  for (const id of cells) assert.ok(allCells.slice(0, 32).some((c) => c.id === id));
});

test('the deterministic budget bound ≤ 700,000 requested evaluations', () => {
  const b = bound();

  assert.equal(b.perLane.worstCase, 40_642);
  assert.equal(b.perLane.cap, 41_000);
  assert.equal(b.perMember, 653);
  assert.equal(b.perSubject, 264);
  assert.equal(b.total, 656_000 + 33_956 + 3_696);
  assert.ok(b.fits);
});

// (amendment D2: the first version of this test assumed the pre-selection state and failed in the final `npm test`,
// after the C21 selection had been sealed and committed — the guard was right, the expectation stale)
test('the door guards follow the stage state: D23 behind the committed C21 selection; FULL behind the committed C24 selection, manifest and authorization, once for the validation, for diagnostics only after it', () => {
  const committed = (f: string) => {
    try {
      assertCommitted(f);
      return isSealed(f);
    } catch {
      return false;
    }
  };
  const c21 = committed(selectionFile('C21'));
  const fullReady = committed(selectionFile('C24')) && committed(frozenSelectionFile) && committed(fullAuthorizationFile);
  const validated = isSealed(validationFile);
  const opens = (f: () => void) => {
    try {
      f();
      return true;
    } catch {
      return false;
    }
  };

  assert.equal(opens(() => doorGuard('D23', 'test')), c21);
  assert.equal(opens(() => doorGuard('FULL', 'test', { validation: true })), fullReady && !validated);
  assert.equal(opens(() => doorGuard('FULL', 'test')), fullReady && validated);
  assert.doesNotThrow(() => doorGuard('D21', 'test'));
  assert.doesNotThrow(() => doorGuard('D24', 'test'));
});

test('amendment A1: the sealed form of an evidence row is idempotent (a row read back from a sealed record keeps rowsKept)', async () => {
  const { sealedEvidence } = await import('../stages.ts');
  const e = { label: 'x', risk: { net: 1, rows: [{ book: 'D1:VGT' }, { book: 'G:VGT' }] } } as never;
  const once = JSON.parse(JSON.stringify(sealedEvidence(e)));
  const twice = JSON.parse(JSON.stringify(sealedEvidence(once)));

  assert.deepEqual(twice, once);
  assert.equal(once.risk.rowsKept, 2);
  assert.equal('rows' in once.risk, false);
});
