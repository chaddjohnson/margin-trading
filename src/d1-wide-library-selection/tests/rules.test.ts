// Pure rules: trade-path distance and bounded-diameter families (no single-linkage chaining), medoids, the paired
// comparison with A0r, the verdict rules over folds and K, the study-level outcome, and the small statistics.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  type Comparison,
  compare,
  nestedCellVerdict,
  nestedStudyVerdict,
  studyOutcome,
  verdictOf
} from '../analysis.ts';
import { libraryKs } from '../context.ts';
import { clusterFamilies, diameterOf, entryDice, heldJaccard, medoidOf, pathDistance, pathOf } from '../families.ts';
import { quantile, spearman } from '../stats.ts';

const path = (...lots: [number, number][]) => pathOf(lots.flat(), 400);

describe('trade-path distance', () => {
  test('identical paths are at distance 0; disjoint paths at 1', () => {
    assert.equal(pathDistance(path([10, 20], [50, 60]), path([10, 20], [50, 60])), 0);
    assert.equal(pathDistance(path([10, 20]), path([100, 120])), 1);
  });

  test('entries match within ±3 sessions only', () => {
    assert.equal(entryDice(path([10, 20]), path([13, 20])), 1);
    assert.equal(entryDice(path([10, 20]), path([14, 20])), 0);
  });

  test('the distance is the larger of the held-session and entry distances', () => {
    // one long shared hold, but many extra short trades on one side: held sessions overlap a lot, entries do not
    const a = path([0, 99]);
    const b = path([0, 99], [150, 151], [200, 201], [250, 251], [300, 301]);

    assert.ok(heldJaccard(a, b) > 0.9);
    assert.ok(entryDice(a, b) < 0.4);
    assert.ok(pathDistance(a, b) > 0.6);
  });
});

describe('bounded-diameter families', () => {
  test('a chain A–B–C with d(A,C) above the diameter is never one family (no single-linkage chaining)', () => {
    // A holds 0..9, B holds 0..9 and 10..14 (d(A,B) = 1/3), C holds 10..14 and 15..19 … tuned so d(A,B), d(B,C) ≤ 0.5 < d(A,C)
    const A = path([0, 9], [40, 49]);
    const B = path([0, 9], [40, 49], [80, 89]);
    const C = path([40, 49], [80, 89], [120, 129]);

    assert.ok(pathDistance(A, B) <= 0.5);
    assert.ok(pathDistance(B, C) <= 0.5);
    assert.ok(pathDistance(A, C) > 0.5);

    const members = [
      { key: 'a', net: 3, path: A },
      { key: 'b', net: 2, path: B },
      { key: 'c', net: 1, path: C }
    ];
    const { families, familyOf } = clusterFamilies(members);

    assert.notEqual(familyOf[0], familyOf[2]);
    for (const family of families) {
      assert.ok(diameterOf(members, family) <= 0.5);
    }
  });

  test('the partition is visited by net (desc) then key, independent of input order', () => {
    const members = [
      { key: 'x', net: 1, path: path([0, 9]) },
      { key: 'y', net: 5, path: path([0, 9]) },
      { key: 'z', net: 3, path: path([100, 109]) }
    ];
    const one = clusterFamilies(members);
    const two = clusterFamilies([members[2]!, members[0]!, members[1]!]);
    const seeds = (r: ReturnType<typeof clusterFamilies>, list: typeof members) =>
      r.families.map((f) => list[f.members[0]!]!.key).sort();

    assert.deepEqual(seeds(one, members), seeds(two, [members[2]!, members[0]!, members[1]!]));
    assert.equal(one.families.length, 2);
  });

  test('the medoid minimizes the summed distance (ties: higher net)', () => {
    const members = [
      { key: 'a', net: 1, path: path([0, 9]) },
      { key: 'b', net: 2, path: path([0, 10]) },
      { key: 'c', net: 3, path: path([0, 12]) }
    ];
    const { families } = clusterFamilies(members);

    assert.equal(families.length, 1);
    assert.equal(members[medoidOf(members, families[0]!)]!.key, 'b');
  });
});

describe('paired comparison and verdicts', () => {
  const symbols = Array.from(
    { length: 20 },
    (_, i) =>
      [
        'VGT',
        'XLK',
        'GDX',
        'SLV',
        'XBI',
        'IBB',
        'KRE',
        'XLF',
        'EWZ',
        'FXI',
        'TLT',
        'EDV',
        'XLE',
        'XOP',
        'IWM',
        'IJH',
        'XHB',
        'XRT',
        'EFA',
        'VGK'
      ][i]!
  );
  const noms = (prefix: string) => symbols.map((symbol) => ({ symbol, key: `${prefix}-${symbol}`, score: 1 }));
  const valueFrom =
    (table: Record<string, number>, dd: Record<string, number> = {}) =>
    (n: { key: string | null }, cost: number) => ({
      v: n.key ? (table[n.key] ?? 0) * (cost === 10 ? 0.9 : 1) : 0,
      minuteDd: n.key ? (dd[n.key] ?? 10000) : 0
    });

  test('favourable needs mean ΔV > 0 at 5 and 10 bps, more ETF wins than losses and more cluster wins than losses', () => {
    const table: Record<string, number> = {};

    symbols.forEach((s, i) => {
      table[`arm-${s}`] = 1000 + i;
      table[`base-${s}`] = 500;
    });

    const cmp = compare(noms('arm'), noms('base'), valueFrom(table));

    assert.ok(cmp.evaluable && cmp.favourable && !cmp.unfavourable);
    assert.equal(cmp.wins, 20);
  });

  test('one flagship winner and many small losses is not favourable', () => {
    const table: Record<string, number> = {};

    symbols.forEach((s, i) => {
      table[`arm-${s}`] = i === 0 ? 1e6 : 400;
      table[`base-${s}`] = 500;
    });

    const cmp = compare(noms('arm'), noms('base'), valueFrom(table));

    assert.ok(cmp.meanD5 > 0);
    assert.ok(!cmp.favourable);
  });

  test('breaches: +3 over the baseline is risk-incompatible; +2 blocks favourable', () => {
    const table: Record<string, number> = {};
    const dd: Record<string, number> = {};

    symbols.forEach((s, i) => {
      table[`arm-${s}`] = 1000;
      table[`base-${s}`] = 500;
      dd[`arm-${s}`] = i < 3 ? 40000 : 1000;
    });

    assert.ok(compare(noms('arm'), noms('base'), valueFrom(table, dd)).riskIncompatible);
    dd[`arm-${symbols[2]}`] = 1000;

    const two = compare(noms('arm'), noms('base'), valueFrom(table, dd));

    assert.ok(!two.riskIncompatible && !two.favourable);
  });

  test('fewer than 10 differing ETFs is insufficient however large the mean (the tie problem)', () => {
    const table: Record<string, number> = {};

    symbols.forEach((s, i) => {
      table[`base-${s}`] = 500;
      table[`arm-${s}`] = i < 3 ? 100000 : 500;
    });

    const cmp = compare(noms('arm'), noms('base'), valueFrom(table));

    assert.ok(cmp.meanD5 > 0 && cmp.wins === 3 && !cmp.evaluable && !cmp.favourable);
    assert.equal(cmp.split.bothDiffer.n, 20);
  });

  test('fewer than 10 active ETFs is insufficient evidence, never favourable or unfavourable', () => {
    const table: Record<string, number> = {};

    symbols.slice(0, 9).forEach((s) => {
      table[`arm-${s}`] = 1000;
    });

    const cmp = compare(noms('arm'), noms('base'), valueFrom(table));

    assert.ok(!cmp.evaluable && !cmp.favourable && !cmp.unfavourable);
  });

  const flag = (favourable: boolean, unfavourable = false, riskIncompatible = false, evaluable = true) =>
    ({ favourable, unfavourable, riskIncompatible, evaluable }) as Comparison;
  const grid = (fn: (w: string, k: number) => Comparison) =>
    Object.fromEntries(['A', 'B'].map((w) => [w, Object.fromEntries(libraryKs.map((k) => [String(k), fn(w, k)]))]));

  test('improves needs both folds at K = 8 and K = 16 and at K = 32 or 64', () => {
    assert.equal(
      verdictOf(
        grid(() => flag(true)),
        ['A', 'B']
      ),
      'improves generalization'
    );
    assert.equal(
      verdictOf(
        grid((_, k) => flag(k !== 64)),
        ['A', 'B']
      ),
      'improves generalization'
    );
    assert.equal(
      verdictOf(
        grid((_, k) => flag(k !== 8)),
        ['A', 'B']
      ),
      'mixed / inconclusive'
    );
    assert.equal(
      verdictOf(
        grid((_, k) => flag(k <= 16)),
        ['A', 'B']
      ),
      'mixed / inconclusive'
    );
    assert.equal(
      verdictOf(
        grid((w) => flag(w === 'A')),
        ['A', 'B']
      ),
      'mixed / inconclusive'
    );
    assert.equal(
      verdictOf(
        grid((_, k) => flag(k !== 16)),
        ['A', 'B']
      ),
      'no evidence of improvement'
    );
  });

  test('an insufficient K = 16 cell in either fold is insufficient evidence, not "no evidence"', () => {
    assert.equal(
      verdictOf(
        grid((w, k) => flag(false, false, false, !(w === 'A' && k === 16))),
        ['A', 'B']
      ),
      'insufficient evidence'
    );
  });

  test('worse: unfavourable in both folds at 8, 16 and 32 or 64, or risk-incompatible at 16', () => {
    assert.equal(
      verdictOf(
        grid(() => flag(false, true)),
        ['A', 'B']
      ),
      'demonstrably worse or risk-incompatible'
    );
    assert.equal(
      verdictOf(
        grid((w, k) => flag(false, false, w === 'B' && k === 16)),
        ['A', 'B']
      ),
      'demonstrably worse or risk-incompatible'
    );
    assert.equal(
      verdictOf(
        grid(() => flag(false)),
        ['A', 'B']
      ),
      'no evidence of improvement'
    );
  });

  test('K = 32 in one fold and K = 64 in the other is not the 32-or-64 condition', () => {
    const mixed = grid((w, k) => flag(k === 8 || k === 16 || (w === 'A' && k === 32) || (w === 'B' && k === 64)));

    assert.equal(verdictOf(mixed, ['A', 'B']), 'mixed / inconclusive');
  });

  test('precedence: risk-incompatible at K = 16 makes "worse" even beside an insufficient K = 16 cell', () => {
    const cells = grid((w, k) => flag(false, false, w === 'A' && k === 16, !(w === 'B' && k === 16)));

    assert.equal(verdictOf(cells, ['A', 'B']), 'demonstrably worse or risk-incompatible');
  });

  test('nested cell and nested verdict: T1/NEW decides; T1/NEW-S worse blocks an advantage', () => {
    const all = (fn: (k: number) => Comparison) => Object.fromEntries(libraryKs.map((k) => [String(k), fn(k)]));

    assert.equal(
      nestedCellVerdict(
        all(() => flag(true)),
        all(() => flag(true))
      ),
      'favourable'
    );
    assert.equal(
      nestedCellVerdict(
        all(() => flag(true)),
        all((k) => flag(k !== 8))
      ),
      'mixed / inconclusive'
    );
    assert.equal(
      nestedCellVerdict(
        all(() => flag(false, true)),
        all(() => flag(false, true))
      ),
      'worse'
    );
    assert.equal(
      nestedCellVerdict(
        all((k) => flag(false, false, false, k !== 16)),
        all(() => flag(false))
      ),
      'insufficient evidence'
    );
    assert.equal(
      nestedCellVerdict(
        all(() => flag(false)),
        all(() => flag(false))
      ),
      'no evidence of an advantage'
    );
    assert.equal(nestedStudyVerdict('favourable', 'mixed / inconclusive'), 'validation selection retains an advantage');
    assert.equal(nestedStudyVerdict('favourable', 'worse'), 'mixed / inconclusive');
    assert.equal(nestedStudyVerdict('worse', 'favourable'), 'validation selection is worse');
  });

  test('"worse" on NEW (or ALL) blocks outcome 1 even when ARCH improves', () => {
    const rolling = { S18: { A2: 'favourable' }, S19: { A2: 'favourable' }, S20: { A2: 'favourable' } };
    const verdicts = {
      ARCH: { A1: 'no evidence of improvement', A2: 'improves generalization', A3: 'no evidence of improvement' },
      NEW: { A2: 'demonstrably worse or risk-incompatible' },
      ALL: {}
    } as never;

    assert.notEqual(
      studyOutcome(verdicts, rolling, () => true).outcome,
      'evidence for an improved selection procedure'
    );
  });

  test('the study outcome is exactly one of four', () => {
    const none = {
      ARCH: { A1: 'no evidence of improvement', A2: 'no evidence of improvement', A3: 'no evidence of improvement' }
    } as never;
    const rolling = { S18: { A2: 'favourable' }, S19: { A2: 'favourable' }, S20: { A2: 'favourable' } };

    assert.equal(studyOutcome(none, rolling, () => false).outcome, 'no demonstrated improvement');
    assert.equal(studyOutcome(none, rolling, () => true).outcome, 'mixed / inconclusive');
    assert.equal(
      studyOutcome(
        {
          ARCH: { A1: 'no evidence of improvement', A2: 'improves generalization', A3: 'mixed / inconclusive' },
          NEW: {},
          ALL: {}
        } as never,
        rolling,
        () => true
      ).outcome,
      'evidence for an improved selection procedure'
    );
    assert.equal(
      studyOutcome(
        {
          ARCH: { A1: 'no evidence of improvement', A2: 'improves generalization', A3: 'mixed / inconclusive' },
          NEW: {},
          ALL: {}
        } as never,
        {},
        () => true
      ).outcome,
      'mixed / inconclusive'
    );
    const worse = 'demonstrably worse or risk-incompatible';

    assert.equal(
      studyOutcome({ ARCH: { A1: worse, A2: worse, A3: worse } } as never, {}, () => false).outcome,
      'new procedure is materially worse'
    );
    assert.equal(
      studyOutcome(
        {
          ARCH: { A1: 'insufficient evidence', A2: 'no evidence of improvement', A3: 'no evidence of improvement' }
        } as never,
        {},
        () => false
      ).outcome,
      'mixed / inconclusive'
    );
  });
});

describe('statistics', () => {
  test('type-7 quantiles and Spearman with ties', () => {
    assert.equal(quantile([1, 2, 3, 4], 0.25), 1.75);
    assert.equal(quantile([5], 0.25), 5);
    assert.ok(Number.isNaN(quantile([], 0.5)));
    assert.equal(spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
    assert.equal(spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  });
});
