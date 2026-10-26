// The design tests of PROTOCOL.md §18 / DESIGN_DIFF.md: each structural failure of the October 25 study is impossible
// by construction in this pipeline — (1) unmet coverage floors, (2) one arm's candidates suppressed by another's in a
// pooled top-N, (3) single-linkage chaining, (4) the refinement-δ versus member-gate contradiction, (5) a tie window
// letting the key override a material score gap — plus the mechanics of the scores and the schedule. Synthetic
// stores only (no market data, no P&L of any real configuration).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { type Evaluation, keyOf as keyOfBooks } from '../../d1-robust/evaluate.ts';
import { GenomeSpace, Library } from '../../d1-robust/genome.ts';
import { type Book, gridKeyOf } from '../../d1-robust/neighbourhood.ts';
import { Rng } from '../../optimizer/rng.ts';
import { ArmArchive, type Entry } from '../archive.ts';
import type { Assessment } from '../assess.ts';
import { type ArmClass, study } from '../context.ts';
import { coverageOf, requireCoverage } from '../coverage.ts';
import { type FamilyFeatures, closenessOf, leaderClusters, reference } from '../families.ts';
import { type Ranked, nearReferenceLabel, pick, rankRows } from '../gates.ts';
import { armLibrary, sobolLibrary } from '../library.ts';
import { promoteArm } from '../promote.ts';
import { nearReferences } from '../references.ts';
import { type MemberMarginal, type RefineState, pruneWith } from '../refine.ts';
import { buildSchedule } from '../schedule.ts';
import { blockPnl, blockSpecOf, pairedScoreDifference, temporalNet } from '../scores.ts';
import { runArmSearch } from '../search.ts';
import { SyntheticStore, real61, references, universe16, universe75 } from './fixtures.ts';

const library = sobolLibrary().vectors;

const itemsOf = (archive: ArmArchive) =>
  [...archive.entries.values()].map((entry) => ({
    members: entry.c.members,
    vectorBySymbol: Object.fromEntries(entry.config.map((book) => [book.symbol, gridKeyOf(book.grid)]))
  }));

const runSynthetic = async (
  universe: string[],
  options: { armClass: ArmClass; stageB: number; stageC: number; strength?: (symbol: string) => number }
) => {
  const store = new SyntheticStore({ strength: options.strength });
  const archive = new ArmArchive(store, { arm: 'J-u', armClass: options.armClass, window: 'fold-a', references });
  const space = new GenomeSpace(universe, new Library(library));
  const schedule = buildSchedule(universe, library);
  const summary = await runArmSearch(
    {
      space,
      archive,
      window: 'fold-a',
      start: 'unseeded',
      armClass: options.armClass,
      stageB: options.stageB,
      stageC: options.stageC
    },
    schedule
  );

  return { archive, summary, report: coverageOf(itemsOf(archive), universe, options.armClass) };
};

describe('(1) coverage contracts hold by construction', () => {
  const dominant = (symbol: string) => (symbol === 'GDX' ? 60 : symbol.startsWith('ZZ') ? 0.05 : 1);

  for (const [label, universe] of [
    ['16 symbols', universe16],
    ['61 symbols', real61],
    ['75 symbols', universe75]
  ] as const) {
    test(`${label}, skewed profitability, forced convergence on GDX, fold budgets`, async () => {
      const { report, summary } = await runSynthetic([...universe], {
        armClass: 'fold',
        stageB: study.coverage.configurations.fold - 395, // the smallest stage-B budget that the contract allows
        stageC: 120,
        strength: dominant
      });

      assert.deepEqual(report.failures, []);
      assert.ok(summary.stageB!.islands.every((island) => island.fresh === study.coverage.configurations.fold - 395));
    });
  }

  test('61 symbols, an exhausted stage-C budget, final-arm contract', async () => {
    const { report, summary } = await runSynthetic([...real61], {
      armClass: 'final',
      stageB: 210, // tier R's final stage B
      stageC: 0,
      strength: dominant
    });

    assert.deepEqual(report.failures, []);
    assert.equal(summary.stageC!.islands.length, 0);
  });

  test('a failed contract blocks nominations', () => {
    const failing = coverageOf([{ members: ['GDX'], vectorBySymbol: { GDX: 'x' } }], ['GDX', 'KRE'], 'final');

    assert.equal(failing.pass, false);
    assert.throws(() => requireCoverage([{ label: 'final J-u', report: failing }]), /Coverage contracts failed/);
  });
});

describe('the stage-A schedule', () => {
  test('is deterministic, unique and balanced', () => {
    const a = buildSchedule(real61, library);
    const b = buildSchedule(real61, library);

    assert.equal(a.sha256, b.sha256);
    assert.equal(
      new Set(
        a.configs.map((config) => config.books.map((book) => `${book.symbol}=${gridKeyOf(book.vector.grid)}`).join('|'))
      ).size,
      a.configs.length
    );

    const passes = study.schedule.bands.reduce((total, band) => total + band.passes, 0);

    for (const symbol of real61) {
      assert.ok(a.appearances[symbol]! >= passes);

      const vectors = a.configs.flatMap((config) =>
        config.books.filter((book) => book.symbol === symbol).map((book) => gridKeyOf(book.vector.grid))
      );

      assert.equal(new Set(vectors).size, vectors.length, `${symbol}'s appearances use distinct vectors`);
    }
  });
});

// ----- (3) chaining -----

const features = (
  key: string,
  members: string[],
  funded = ['T@1', 'T@2', 'T@3'],
  regimes = [1, 2, 3, 4, 5]
): FamilyFeatures => ({
  key,
  members,
  funded,
  regimes
});

describe('(3) families cannot chain', () => {
  const A = features('A', ['X1', 'X2', 'X3', 'X4']);
  const B = features('B', ['X2', 'X3', 'X4', 'X5']);
  const C = features('C', ['X3', 'X4', 'X5', 'X6']);

  test('A~B, B~C, A≁C never share a family, in any ranking order', () => {
    assert.ok(closenessOf(A, B).close);
    assert.ok(closenessOf(B, C).close);
    assert.ok(!closenessOf(A, C).close);

    for (const order of [
      [A, B, C],
      [B, A, C],
      [B, C, A],
      [C, B, A],
      [A, C, B],
      [C, A, B]
    ]) {
      const families = leaderClusters(order);
      const home = (item: FamilyFeatures) => families.find((family) => family.members.includes(item))!.index;

      assert.notEqual(home(A), home(C), order.map((item) => item.key).join(''));
    }
  });

  test('a long chain splits into many families, and every family is pairwise close', () => {
    const chain = Array.from({ length: 12 }, (_, i) =>
      features(`L${i}`, [`S${i}`, `S${i + 1}`, `S${i + 2}`, `S${i + 3}`])
    );
    const families = leaderClusters(chain);

    assert.ok(families.length >= 6, `${families.length} families`);

    for (const family of families) {
      for (const a of family.members) {
        for (const b of family.members) {
          assert.ok(a === b || closenessOf(a, b).close);
        }
      }
    }
  });

  test('a converged archive of near-duplicates plus distinct configurations yields several families', () => {
    const duplicates = Array.from({ length: 200 }, (_, i) =>
      features(`D${i}`, ['GDX', 'XRT', 'SLV'], ['GDX@1', 'XRT@2', 'SLV@3', `GDX@${100 + (i % 2)}`])
    );
    const distinct = [
      features('U1', ['FXI', 'XLI', 'XLK']),
      features('U2', ['EDV', 'TLT'], ['EDV@9'], [5, 4, 3, 2, 1]),
      features('U3', ['GDX', 'XRT', 'SLV'], ['GDX@77', 'XRT@78'], [1, 2, 3, 4, 5]) // same membership, different trades
    ];
    const families = leaderClusters([...duplicates, ...distinct]);

    assert.equal(families.find((family) => family.leader.key === 'D0')!.members.length, 200);
    assert.ok(families.length >= 4);
    assert.ok(
      families.some((family) => family.leader.key === 'U3'),
      'the same membership with different execution forms its own family'
    );
  });

  test('the cached closeness equals the reference definitions', () => {
    const rng = Rng.from('test', 'closeness');
    const items = Array.from({ length: 40 }, (_, i) =>
      features(
        `R${i}`,
        real61.filter(() => rng.next() < 0.08).concat(['GDX']),
        Array.from({ length: 6 }, () => `T@${rng.int(10)}`),
        Array.from({ length: 13 }, () => Math.round(rng.next() * 5))
      )
    );

    for (const a of items) {
      for (const b of items) {
        const closeness = closenessOf(a, b);
        const jaccard = reference.jaccardDistance(a.members, b.members);
        const correlation = reference.spearman(a.regimes, b.regimes);
        const overlap = reference.fundedOverlap(a.funded, b.funded);
        const expected =
          jaccard < study.closeness.jaccardDistance &&
          Number.isFinite(correlation) &&
          correlation >= study.closeness.regimeCorrelation &&
          overlap >= study.closeness.fundedOverlap;

        assert.equal(closeness.close, expected);
        assert.ok(Math.abs(closeness.jaccard - jaccard) < 1e-12);
      }
    }
  });
});

// ----- (2) per-arm protection -----

const entryOf = (arm: 'J-u' | 'J-s', key: string, members: string[], value: number, salt: string): Entry =>
  ({
    seq: 0,
    key,
    arm,
    meta: { stage: 'C', source: 'C:C1', generation: 1, operator: 'test' },
    config: members.map((symbol) => ({ symbol, id: symbol, grid: library[0]!.grid, origin: 'test' })),
    c: {
      net: value,
      netT: value,
      minuteDrawdown: 20000,
      dailyDrawdown: 15000,
      lots: 30,
      lotYears: 4,
      books: members.length,
      members,
      lotsBySymbol: {},
      netBySymbol: {},
      virtualBySymbol: {},
      inertBooks: 0,
      utilization: 0.3,
      top1: 0,
      top2: 0,
      positiveRegimes: 5,
      regimes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      years: [],
      quarters: [],
      markAt: [0, 1, 2, 3],
      funded: members.map((symbol) => `${symbol}@${salt}`),
      behaviourKey: key
    },
    q: value,
    feasible: true,
    violation: 0,
    value,
    tie: 0,
    books: members.length
  }) as Entry;

describe('(2) an arm cannot be suppressed by another arm', () => {
  test('the seeded arm owns the global top 300, yet every distinct unseeded family is promoted from its own archive', async () => {
    const store = new SyntheticStore();
    const seeded = new ArmArchive(store, { arm: 'J-s', armClass: 'fold', window: 'fold-a', references });
    const unseeded = new ArmArchive(store, { arm: 'J-u', armClass: 'fold', window: 'fold-a', references });

    for (let i = 0; i < 300; i++) {
      const entry = entryOf('J-s', `S${i}`, ['GDX', 'KRE', 'XBI', 'VGT'], 300000 - i, 'b5');

      seeded.entries.set(entry.key, entry);
    }

    const unseededFamilies = [
      ['FXI', 'SLV', 'XLI', 'XLK'],
      ['EDV', 'TLT'],
      ['EWJ', 'EWY', 'INDA'],
      ['XLP', 'XLU', 'VPU', 'USMV', 'SPLV', 'QUAL', 'IWD'],
      ['DBC'],
      ['IBB', 'XHB', 'XME', 'KBE', 'IGV']
    ];

    unseededFamilies.forEach((members, f) => {
      for (let i = 0; i < 5; i++) {
        const entry = entryOf('J-u', `U${f}-${i}`, members, 150000 - 1000 * f - i, `f${f}`);

        unseeded.entries.set(entry.key, entry);
      }
    });

    // The October 25 rule (pooled top 300) would have kept none of them:
    const pooled = [...seeded.entries.values(), ...unseeded.entries.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, 300);

    assert.equal(pooled.filter((entry) => entry.arm === 'J-u').length, 0);

    const feasibleReeval = async (entries: Entry[]) =>
      entries.map((entry) => ({
        key: entry.key,
        books: entry.config.map((book) => ({
          symbol: book.symbol,
          vector: { id: book.id, grid: book.grid, origin: book.origin }
        })),
        members: entry.c.members,
        centre: {
          5: { minuteDrawdown: 20000 } as Evaluation,
          0: {} as Evaluation,
          2: {} as Evaluation,
          10: {} as Evaluation
        },
        set: { nbJ: { q25: 0 }, nbT: { q25: 0 } } as never,
        q: entry.value,
        value: entry.value,
        portfolio: { dailyPercent: 0.25, minutePercent: 0.26, endEquity: 1, borrowingDollarDays: 1 },
        feasible: true,
        failures: []
      }));
    const spec = {
      arm: 'J-u' as const,
      armClass: 'fold' as const,
      draws: 8,
      membersPerFamily: 3,
      references,
      blocks: blockSpecOf(400, 1155)
    };
    const record = await promoteArm(unseeded, spec, feasibleReeval);

    assert.equal(record.promoted.length, study.shortlist.fold.length);
    assert.equal(new Set(record.promoted.map((item) => item.family)).size, record.promoted.length);
    assert.ok(record.promoted.some((item) => item.slot === 'compact' && item.representative.members.length <= 3));
    assert.ok(record.promoted.some((item) => item.slot === 'incumbent-free'));
  });
});

// ----- (4) pruning is coherent with the member gate -----

const state = (members: string[], value: number): RefineState => ({
  key: members.join('|'),
  books: members.map((symbol) => ({ symbol, vector: library[0]! })) as Book[],
  centre5: { funded: members.map((symbol) => `${symbol}@1`) } as Evaluation,
  centre10: {} as Evaluation,
  q: value,
  value,
  feasible: true
});

const marginal = (symbol: string, estimate: number, lower: number, feasibleWithout = true): MemberMarginal => ({
  symbol,
  marginal: estimate,
  interval: { estimate, lower, upper: estimate + Math.abs(estimate) + 1, se: 1, n: 128, resamples: 10000 },
  feasibleWithout
});

describe('(4) the pruning pass removes what G3 would reject, before assessment', () => {
  // A generic stand-in for the October 25 failure mode (a small negative member below δ); no historical symbol,
  // vector or result is used as a fixture or target.
  test('a member with a small negative marginal (below δ = $5,000) is pruned', async () => {
    const table: Record<string, MemberMarginal[]> = {
      'S1|S2|S3|S4': [
        marginal('S1', 90000, 60000),
        marginal('S2', 12000, 3000),
        marginal('S3', 9000, 1000),
        marginal('S4', -1500, -8000)
      ],
      'S1|S2|S3': [marginal('S1', 95000, 65000), marginal('S2', 13000, 4000), marginal('S3', 9500, 1500)]
    };
    const result = await pruneWith(
      {
        score: 'J',
        marginalsOf: async (books) =>
          table[
            books
              .map((book) => book.symbol)
              .sort()
              .join('|')
          ]!,
        evaluate: async (books) => state(books.map((book) => book.symbol).sort(), 1)
      },
      state(['S1', 'S2', 'S3', 'S4'], 1),
      'prune'
    );

    assert.equal(result.state!.key, 'S1|S2|S3');
    assert.equal(result.steps[0]!.removed, 'S4');
    assert.equal(result.blocked, false);
  });

  test('an uncertain small positive contribution (lower bound ≤ 0) is pruned; a clearly positive one is kept', async () => {
    const result = await pruneWith(
      {
        score: 'T',
        marginalsOf: async (books) =>
          books.length === 2 ? [marginal('A', 30000, 10000), marginal('B', 2000, -500)] : [marginal('A', 31000, 11000)],
        evaluate: async (books) =>
          state(
            books.map((book) => book.symbol),
            1
          )
      },
      state(['A', 'B'], 1),
      'prune'
    );

    assert.equal(result.state!.key, 'A');
  });

  test('cascading removals, and a one-book pool pruned to empty', async () => {
    const result = await pruneWith(
      {
        score: 'J',
        marginalsOf: async (books) =>
          books.length === 3
            ? [marginal('A', 5000, 1000), marginal('B', 4000, 500), marginal('C', -3000, -8000)]
            : books.length === 2
              ? [marginal('A', -1000, -6000), marginal('B', 3000, 200)]
              : [marginal(books[0]!.symbol, -2000, -7000)],
        evaluate: async (books) =>
          state(
            books.map((book) => book.symbol),
            1
          )
      },
      state(['A', 'B', 'C'], 1),
      'prune'
    );

    assert.deepEqual(
      result.steps.map((step) => step.removed),
      ['C', 'A', 'B']
    );
    assert.equal(result.state, undefined);
  });

  test('a removal that would breach F1 is not made', async () => {
    const result = await pruneWith(
      {
        score: 'J',
        marginalsOf: async () => [marginal('A', 40000, 9000), marginal('B', -1000, -4000, false)],
        evaluate: async (books) =>
          state(
            books.map((book) => book.symbol),
            1
          )
      },
      state(['A', 'B'], 1),
      'prune'
    );

    assert.equal(result.blocked, true);
    assert.equal(result.state!.key, 'A|B');
  });
});

// ----- (5) no tie window -----

const ranked = (key: string, value: number, q25: number, books: number): Ranked =>
  ({
    assessment: {
      key,
      members: Array.from({ length: books }, (_, i) => `S${i}`),
      centre: { 5: { minuteDrawdown: 1 } },
      confirmA: { nbJ: { q25 }, nbT: { q25 } }
    } as unknown as Assessment,
    arm: 'J-u',
    gates: [],
    pass: true,
    value
  }) as Ranked;

describe('(5) the score decides; ties are exact', () => {
  test('a $6,493 score gap is not overridden by the key', () => {
    const order = rankRows([ranked('EDV GDX KRE', 160746, 1, 3), ranked('EDV GDX XRT', 167239, 1, 3)], 'J');

    assert.equal(order[0]!.assessment.key, 'EDV GDX XRT');
  });

  test('equal to the cent: Q25, then fewer books, then the key', () => {
    assert.equal(rankRows([ranked('a', 100.004, 5, 3), ranked('b', 100.001, 9, 3)], 'J')[0]!.assessment.key, 'b');
    assert.equal(rankRows([ranked('a', 100, 5, 4), ranked('b', 100, 5, 3)], 'J')[0]!.assessment.key, 'b');
    assert.equal(rankRows([ranked('b', 100, 5, 3), ranked('a', 100, 5, 3)], 'J')[0]!.assessment.key, 'a');
  });
});

describe('the temporal score', () => {
  test('block boundaries: K = max(3, floor(sessions ÷ 252))', () => {
    assert.equal(blockSpecOf(365, 365 + 765 - 1).count, 3);
    assert.equal(blockSpecOf(365, 365 + 1146 - 1).count, 4);
    assert.equal(blockSpecOf(365, 365 + 1650 - 1).count, 6);
    assert.equal(blockSpecOf(365, 365 + 300 - 1).count, 3);

    const spec = blockSpecOf(365, 1130);

    assert.equal(spec.markIndices[0], 364);
    assert.equal(spec.markIndices.at(-1), 1130);
  });

  test('net_T replaces the best block by the median block', () => {
    assert.equal(temporalNet(300000, [0, 0, 0, 300000]), 0);
    assert.equal(temporalNet(300, [0, 100, 200, 300]), 300);
    assert.equal(temporalNet(300, [0, -50, 50, 300]), 150);
    assert.deepEqual(blockPnl([10, 20, 15, 40]), [10, -5, 25]);
    assert.equal(temporalNet(100, [0, 10, 30, 60, 100]), 100 - (40 - 25)); // K = 4: median of (10, 20, 30, 40) = 25
  });

  test('the paired difference of identical draws is exactly zero', () => {
    const draws = { net: Float64Array.from([1, 5, 3, 9, 7]), drawdown: Float64Array.from([10, 20, 30, 40, 50]) };
    const interval = pairedScoreDifference({ draws, books: 2 }, { draws, books: 2 }, references, Rng.from('t'), 500);

    assert.equal(interval.estimate, 0);
    assert.equal(interval.lower, 0);
    assert.equal(interval.upper, 0);
  });
});

// ----- (6) inspected non-advancing references are never nominated -----

describe('(6) a near-copy of R1, R4 or the October 25 finalist is barred from nomination', () => {
  const grid = library[3]!.grid;
  const reference = {
    label: 'R1',
    books: ['GDX', 'KRE', 'XBI', 'XRT'].map((symbol) => ({ symbol, vector: { id: symbol, grid, origin: 'ref' } }))
  };

  test('exact and near copies are detected; a distant pool is not', () => {
    const near = reference.books.map((book, i) =>
      i === 0
        ? {
            symbol: book.symbol,
            vector: {
              ...book.vector,
              grid: { ...grid, maximumHoldDays: grid.maximumHoldDays === 3 ? 4 : grid.maximumHoldDays - 1 }
            }
          }
        : book
    );
    const far = ['EDV', 'TLT'].map((symbol) => ({ symbol, vector: library[9]! }));

    assert.deepEqual(nearReferences(reference.books, [reference]), ['R1']);
    assert.deepEqual(nearReferences(near, [reference]), ['R1']);
    assert.deepEqual(nearReferences(far, [reference]), []);
  });

  test('the final nominations skip a labelled finalist; a fold pick does not', () => {
    const labelled = { ...ranked('near R1', 300000, 1, 4), arm: 'J-u' as const };

    labelled.assessment = { ...labelled.assessment, labels: [nearReferenceLabel] } as Assessment;

    const other = { ...ranked('other', 200000, 1, 2), arm: 'J-u' as const };

    other.assessment = { ...other.assessment, members: ['EDV', 'TLT'], labels: [] } as unknown as Assessment;
    labelled.assessment = { ...labelled.assessment, members: ['GDX', 'KRE', 'XBI', 'XRT'] } as unknown as Assessment;

    const order = [labelled, other];

    assert.equal(pick(order, 'final')[0]!.row.assessment.key, 'other');
    assert.equal(pick(order, 'fold')[0]!.row.assessment.key, 'near R1');
  });
});

// ----- seeded arms (exercised synthetically; the final round runs them on real data) -----

describe('seeded arms', () => {
  test('benchmarks seed stage B and island 8, coverage still holds, and only seeded libraries hold control vectors', async () => {
    const store = new SyntheticStore();
    const archive = new ArmArchive(store, { arm: 'J-s', armClass: 'final', window: 'final', references });
    const space = new GenomeSpace(real61, new Library(library));
    const benchmarks = {
      B1: [{ symbol: 'VGT', vector: library[0]! }],
      B4: ['KRE', 'VGT', 'XBI', 'XRT'].map((symbol, i) => ({ symbol, vector: library[i + 1]! })),
      B5: ['GDX', 'KRE', 'VGT', 'XBI', 'XRT'].map((symbol, i) => ({ symbol, vector: library[i + 1]! }))
    };
    const summary = await runArmSearch(
      { space, archive, window: 'final', start: 'seeded', armClass: 'final', stageB: 210, stageC: 40, benchmarks },
      buildSchedule(real61, library)
    );
    const keys = new Set(archive.entries.keys());

    for (const books of Object.values(benchmarks)) {
      assert.ok(keys.has(keyOfBooks(books)), 'every benchmark configuration was evaluated by the seeded arm');
    }

    assert.deepEqual(coverageOf(itemsOf(archive), real61, 'final').failures, []);
    assert.ok(summary.stageC!.islands.length === study.stageC.islands);

    const seeded = await armLibrary('seeded');
    const unseeded = await armLibrary('unseeded');

    assert.ok(seeded.vectors.some((vector) => vector.origin.startsWith('control:')));
    assert.ok(!unseeded.vectors.some((vector) => vector.origin.startsWith('control:')));
  });
});
