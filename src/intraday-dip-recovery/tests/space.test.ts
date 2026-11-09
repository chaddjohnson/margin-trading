// The space, identity and doors (PROTOCOL.md §6, §3). No market data is read except the pinned door refusals' sizes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { axes, intradayD1Shortlist, keys, periodLevels } from '../context.ts';
import { openFullDoor } from '../data.ts';
import { candidateOf, cellOf, designOf, fromIntradayD1, idOf, incumbentGrids, paramsOf, parseId, periodsFor, screenOf, zeroGrid } from '../space.ts';

test('inactive genes are canonical zero and never part of identity', () => {
  const g = { ...zeroGrid(), B: 2, X: 40, Y: 10, S: 30, L: 20, H: 33, U: 77, P: 12, W: 40 };
  const f1 = candidateOf('F1', g);

  assert.equal(f1.grid.H, 0);
  assert.equal(f1.grid.U, 0);
  assert.equal(f1.grid.P, 0);
  assert.equal(f1.grid.W, 0);
  assert.equal(idOf(candidateOf('F1', { ...g, H: 5, U: 3 })), idOf(f1));
  assert.notEqual(idOf(candidateOf('F3', { ...g, H: 5 })), idOf(candidateOf('F3', g)));
  assert.deepEqual(parseId(idOf(f1)), f1);
});

test('lookbacks with the same period count are one candidate; the representative keeps the count', () => {
  for (let b = 0; b < periodLevels.length; b++)
    for (let l = 0; l < axes.L.size; l++) {
      const c = candidateOf('F2', { ...zeroGrid(), B: b, L: l, W: l });
      const B = periodLevels[b]!;

      assert.equal(periodsFor(axes.L.value(c.grid.L), B), periodsFor(axes.L.value(l), B));
      assert.equal(paramsOf(c).continuationPeriods, periodsFor(axes.W.value(l), B));
    }
});

test('every intraday-D1 vector is exactly representable (same values at the same indexes)', () => {
  for (const v of intradayD1Shortlist) {
    const g = incumbentGrids.find((x) => x.id === v.id)!.grid;

    assert.equal(axes.B.value(g.B), [5, 10, 15, 30, 65, 130][v.b]);
    assert.equal(axes.X.value(g.X), Number((0.001 * 1.06 ** v.x).toFixed(7)));
    assert.equal(axes.S.value(g.S), Number((0.0005 * 1.06 ** v.s).toFixed(7)));
    assert.equal(axes.H.value(g.H), Number((5 * 1.1 ** v.h).toFixed(2)));
    assert.deepEqual(fromIntradayD1(v.id), g);
  }
});

test('the stratified screen respects its cells and is deterministic; designs keep the family fixed', () => {
  const a = screenOf('F3', 8, ['test']);
  const b = screenOf('F3', 8, ['test']);

  assert.deepEqual(a, b);
  assert.equal(a.points.length, 48);
  for (const p of a.points) assert.equal(cellOf(p.candidate.grid), p.cell);

  const centre = a.points[0]!.candidate;
  const d = designOf(centre, { name: 't', n: 64, labels: ['t'] });

  for (const draw of d.draws) {
    assert.equal(draw.candidate.family, 'F3');
    for (const k of keys) assert.ok(Math.abs(draw.candidate.grid[k] - centre.grid[k]) <= axes[k].radius * 2 + 40);
  }
});

test('the FULL door refuses without the committed frozen selection guard', () => {
  assert.throws(() => openFullDoor({ frozenSha256: '', committed: true }, 'test'), /refused/);
  assert.throws(() => openFullDoor({ frozenSha256: 'x', committed: true }, 'test'), /refused/);
});
