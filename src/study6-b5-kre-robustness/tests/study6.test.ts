// Study 6 unit tests on synthetic inputs only (no market data): design determinism, the clip and inbox mappings, box
// bounds, the paired variants, duplicate accounting, probes, lines, distances, quantiles and the gate summary.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { d1Keys } from '../../portfolio-aware-d1/phenotypes.ts';
import { bookOrder, frozenGrids, radius } from '../context.ts';
import { assertFive } from '../data.ts';
import {
  atBound,
  booksKey,
  coordinate,
  design,
  lineOf,
  normalizedDistance,
  onlyBook,
  probesOf,
  resetBook,
  resetCoordinate,
  specOf,
  uniqueMask
} from '../designs.ts';
import { type PointRecord, summarize } from '../evaluate.ts';
import { bookSets, frozenB5, jointSets, kreSets } from '../sets.ts';

test('designs are deterministic and stay in the box', () => {
  const centre = frozenB5();
  const a = design({ centre, perturb: [...bookOrder], n: 32, labels: ['test', 'joint'], mode: 'clip', scale: 1 });
  const b = design({ centre, perturb: [...bookOrder], n: 32, labels: ['test', 'joint'], mode: 'clip', scale: 1 });

  assert.deepEqual(
    a.map((point) => booksKey(point.books)),
    b.map((point) => booksKey(point.books))
  );

  for (const point of a) {
    for (const symbol of bookOrder) {
      for (const key of d1Keys) {
        const spec = specOf(key);
        const value = point.books[symbol]![key];

        assert.ok(Number.isInteger(value) && value >= spec.min && value <= spec.max, `${symbol}.${key}=${value}`);
        assert.ok(Math.abs(value - centre[symbol]![key]) <= radius[key]);
      }
    }

    assert.ok(point.distance <= 1 + 1e-9);
  }
});

test('clip puts mass on the bound; inbox does not exceed the in-box interval', () => {
  // KRE X = 299 (max 300): any positive offset ≥ 0.05 clips to 300 in the clip design.
  assert.deepEqual(coordinate(299, 0.5, 'targetPercentChange', 'clip', 1, 10), { value: 300, clipped: 'max' });
  assert.deepEqual(coordinate(299, -1, 'targetPercentChange', 'clip', 1, 10), { value: 289, clipped: undefined });
  // inbox maps [−1, 1] onto [289, 300].
  assert.equal(coordinate(299, -1, 'targetPercentChange', 'inbox', 1, 10).value, 289);
  assert.equal(coordinate(299, 1, 'targetPercentChange', 'inbox', 1, 10).value, 300);
  assert.equal(coordinate(299, 0, 'targetPercentChange', 'inbox', 1, 10).value, 295);
  // KRE hold 4 (min 3): offset −1 clips to 3.
  assert.deepEqual(coordinate(4, -1, 'maximumHoldDays', 'clip', 1, 2), { value: 3, clipped: 'min' });
});

test('paired variants change only what they name', () => {
  const centre = frozenB5();
  const [point] = design({ centre, perturb: [...bookOrder], n: 4, labels: ['test', 'pair'], mode: 'clip', scale: 1 });
  const reset = resetBook(point!, centre, 'KRE');
  const only = onlyBook(point!, centre, 'KRE');
  const frozenX = resetCoordinate(point!, centre, 'KRE', 'targetPercentChange');

  assert.deepEqual(reset.books.KRE, centre.KRE);
  assert.deepEqual(reset.books.GDX, point!.books.GDX);
  assert.deepEqual(only.books.KRE, point!.books.KRE);
  assert.deepEqual(only.books.GDX, centre.GDX);
  assert.equal(frozenX.books.KRE!.targetPercentChange, centre.KRE!.targetPercentChange);
  assert.equal(frozenX.books.KRE!.trailingBuyPercentage, point!.books.KRE!.trailingBuyPercentage);
});

test('the KRE freeze designs pair with the KRE N1 clip points', () => {
  const sets = kreSets();
  const clip = bookSets(frozenB5(), ['book-clip'], ['KRE']).find((set) => set.rep === 1)!;

  for (const key of d1Keys) {
    const frozen = sets.find((set) => set.id === `kre-freeze-${key}-r1`)!;

    assert.equal(frozen.points.length, 64);
    frozen.points.forEach((point, index) => {
      assert.deepEqual(point.books.KRE, { ...clip.points[index]!.books.KRE!, [key]: frozenGrids.KRE[key] });
      assert.deepEqual(point.books.GDX, frozenGrids.GDX);
    });
  }
});

test('duplicates: the centre and repeated vectors are not unique', () => {
  const centre = frozenB5();
  const [point] = jointSets(centre, ['joint-clip'])[0]!.points;
  const points = [point!, { ...point!, books: centre }, point!];

  assert.deepEqual(uniqueMask(points, centre), [true, false, false]);
});

test('probes, lines, bounds and distances', () => {
  const { probes, dropped } = probesOf(frozenGrids.KRE);

  assert.ok(dropped.some((probe) => probe.key === 'targetPercentChange' && probe.offset === 5));
  assert.ok(dropped.some((probe) => probe.key === 'maximumHoldDays' && probe.offset === -2));
  assert.equal(probes.length + dropped.length, 32);

  const xLine = lineOf(frozenGrids.KRE, 'targetPercentChange', 2, 269);

  assert.equal(xLine[0]!.value, 269);
  assert.equal(xLine[xLine.length - 1]!.value, 300);
  assert.deepEqual(atBound(frozenGrids.XBI).sort(), ['targetPercentChange']);
  assert.equal(normalizedDistance(frozenB5(), frozenB5(), bookOrder), 0);
  assert.throws(() => assertFive(['VGT', 'SPY']));
});

test('summary: unique share, linear p90 and the gate conjunction', () => {
  const record = (dd: number, net: number) =>
    ({ dd, net, signature: `${dd}`, interest: 0, gross: 0, costs: 0 }) as PointRecord;
  const centre = record(26000, 100);
  const records = Array.from({ length: 10 }, (_value, index) => record(30000 + index * 1000, 50 + index));
  const summary = summarize(records, Array(10).fill(true) as boolean[], centre);

  // DD 30,000 … 39,000: five below 35,000.
  assert.equal(summary.share, 0.5);
  assert.equal(summary.breaches, 5);
  assert.equal(summary.ddP90, 38100);
  assert.equal(summary.gate.pass, false);
  assert.equal(summary.gate.centre, true);
});
