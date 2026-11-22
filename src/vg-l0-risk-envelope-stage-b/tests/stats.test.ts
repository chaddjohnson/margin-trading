// E4 statistics (PROTOCOL.md §1, §9): pairing, the stratified paired bootstrap (deterministic, per-cell sizes kept), the
// non-inferiority and superiority rules at their margins, V = $0 pairs, the outcome label and the pooled label.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapMeans, intervalDdOf, outcomeLabel, pairsOf, pooledLabel, primaryOf } from '../stats.ts';

const lanes = (vals: number[], cell = 'GA0.VA0', q = 1) => vals.map((v, i) => ({ cell, replicate: i + 3, value: v, qualified: v === 0 ? 0 : q }));
const both = (ctrl: number[], exp: number[]) => [
  ...pairsOf('C21', [...lanes(ctrl), ...lanes(ctrl, 'GB0.VD1')], [...lanes(exp), ...lanes(exp, 'GB0.VD1')])
];

test('pairs match by (cell, replicate); D = EXP30 − CTRL; an unpaired design fails closed', () => {
  const ps = both([100, 200], [150, 100]);

  assert.deepEqual(
    ps.map((p) => [p.cell, p.replicate, p.d]),
    [
      ['GA0.VA0', 3, 50],
      ['GA0.VA0', 4, -100],
      ['GB0.VD1', 3, 50],
      ['GB0.VD1', 4, -100]
    ]
  );
  assert.throws(() => pairsOf('C21', lanes([1, 2]), lanes([1])));
  assert.throws(() => pairsOf('C21', lanes([1, 2]), lanes([1, 2], 'GB0.VD1')));
});

test('the bootstrap is deterministic, labelled and stratified (a constant per cell keeps the mean exactly)', () => {
  const a = bootstrapMeans([[1, 2, 3], [10, 20]], 1000, ['x']);
  const b = bootstrapMeans([[1, 2, 3], [10, 20]], 1000, ['x']);
  const c = bootstrapMeans([[1, 2, 3], [10, 20]], 1000, ['y']);

  assert.deepEqual(Array.from(a), Array.from(b));
  assert.notDeepEqual(Array.from(a), Array.from(c));
  // stratified: each cell keeps its own size, so cells with constant values give the exact pooled mean every time
  const s = bootstrapMeans([[5, 5, 5], [-1, -1]], 500, ['z']);

  assert.ok(Array.from(s).every((m) => Math.abs(m - (15 - 2) / 5) < 1e-12));
});

test('non-inferiority: L90 > −$5,000; superiority: mean > +$2,500 and L90 > 0', () => {
  const r16 = (x: number) => Array.from({ length: 16 }, () => x);
  let p = primaryOf('C21', both(r16(200_000), r16(200_000)));

  assert.equal(p.mean, 0);
  assert.equal(p.l90, 0);
  assert.equal(p.nonInferior, true);
  assert.equal(p.superior, false);
  assert.equal(p.n, 32);
  p = primaryOf('C21', both(r16(200_000), r16(196_000)));
  assert.equal(p.nonInferior, true); // −4,000 > −5,000
  p = primaryOf('C21', both(r16(200_000), r16(195_000)));
  assert.equal(p.nonInferior, false); // −5,000 is not > −5,000
  p = primaryOf('C21', both(r16(200_000), r16(203_000)));
  assert.equal(p.superior, true);
  p = primaryOf('C21', both(r16(200_000), r16(202_500)));
  assert.equal(p.superior, false); // +2,500 is not > +2,500
  // spread lowers the bound below the mean
  const spread = Array.from({ length: 16 }, (_v, i) => 200_000 + (i - 7.5) * 4_000);

  p = primaryOf('C21', both(r16(200_000), spread));
  assert.ok(p.l90 < p.mean);
  assert.ok(Math.abs(p.mean) < 1e-9);
});

test('V = $0 lanes stay in the statistic and are counted; the sensitivity drops their pairs', () => {
  const ctrl = Array.from({ length: 16 }, () => 200_000);
  const exp = [0, ...Array.from({ length: 15 }, () => 200_000)];
  const p = primaryOf('C21', both(ctrl, exp));

  assert.equal(p.zeroLanes.pairs, 2);
  assert.equal(p.zeroLanes.exp, 2);
  assert.equal(p.mean, -200_000 / 16);
  assert.equal(p.sensitivity.withoutZeroLanePairs.n, 30);
  assert.equal(p.sensitivity.withoutZeroLanePairs.mean, 0);
});

test('the outcome label', () => {
  const ok = { nonInferior: true, superior: false } as never;
  const sup = { nonInferior: true, superior: true } as never;
  const bad = { nonInferior: false, superior: false } as never;

  assert.equal(outcomeLabel({ C21: ok, C24: ok }).label, 'P3 non-inferior (superiority not shown)');
  assert.equal(outcomeLabel({ C21: sup, C24: sup }).label, 'P3 non-inferior and superior');
  assert.equal(outcomeLabel({ C21: sup, C24: ok }).label, 'P3 non-inferior (superiority not shown)');
  assert.equal(outcomeLabel({ C21: ok, C24: bad }).label, 'P3 non-inferiority not shown');
  assert.match(outcomeLabel({ C21: ok, C24: bad }).detail, /C24/);
  assert.equal(outcomeLabel({ C21: ok, C24: null }).label, 'incomplete');
  assert.equal(pooledLabel(3_000), 'better');
  assert.equal(pooledLabel(-2_600), 'worse');
  assert.equal(pooledLabel(2_500), 'equivalent');
  assert.equal(pooledLabel(null), 'undefined (an arm has no qualified member)');
});

test('T2: the paired interval DD uses the UPPER one-sided 90 % bound against +$5,000', () => {
  const r16 = (x: number) => Array.from({ length: 16 }, () => x);

  assert.equal(intervalDdOf('C21', both(r16(30_000), r16(34_000))).nonInferior, true);
  assert.equal(intervalDdOf('C21', both(r16(30_000), r16(35_000))).nonInferior, false);
  assert.equal(intervalDdOf('C21', both(r16(30_000), r16(34_000))).q, 0.9);
});
