// Study 9 unit tests on synthetic inputs only (no market data is read):
//   node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study9-etf-pool-discovery/tests/study9.test.ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { box } from '../../multi-etf-d1/space.ts';
import { d1Keys } from '../../portfolio-aware-d1/phenotypes.ts';
import { familyOf, periodList, radius, trainEnd } from '../context.ts';
import { jointNeighbourhood, neighbourhood, restrict, screenDesign, uniquePoints, wilsonLower } from '../design.ts';
import { openDoor } from '../door.ts';
import { booksKey, orderedOf } from '../engine.ts';
import { prefixLengthThrough } from '../s0.ts';
import { constrainedCompare } from '../s1.ts';
import { assignmentKeys } from '../s2.ts';
import { band, poolId, subsetsOf } from '../s3.ts';

const inBox = (grid: Record<string, number>) =>
  d1Keys.every((key, d) => grid[key]! >= box[d]!.min && grid[key]! <= box[d]!.max && Number.isInteger(grid[key]));

describe('study9 designs', () => {
  it('the screening design has 64 unique in-box vectors in two halves of 32, deterministically', () => {
    const a = screenDesign();
    const b = screenDesign();

    assert.equal(a.length, 64);
    assert.equal(a.filter((v) => v.half === 'A').length, 32);
    assert.equal(new Set(a.map((v) => d1Keys.map((k) => v.grid[k]).join('/'))).size, 64);
    assert.ok(a.every((v) => inBox(v.grid)));
    assert.deepEqual(a, b);
  });

  it('neighbourhoods use per-book common random numbers and stay inside the radius and the box', () => {
    const design = screenDesign();
    const pair = { VGT: design[3]!.grid, XLE: design[10]!.grid };
    const triple = { ...pair, EWZ: design[20]!.grid };
    const family = { name: 't', n: 16, labels: ['test', 'nb'] };
    const p2 = neighbourhood(pair, family);
    const p3 = neighbourhood(triple, family);

    assert.equal(p2.length, 16);

    for (let i = 0; i < 16; i++) {
      assert.deepEqual(p2[i]!.books.VGT, p3[i]!.books.VGT); // same book, same centre → same perturbation in any pool
      assert.deepEqual(p2[i]!.books.XLE, p3[i]!.books.XLE);

      for (const symbol of ['VGT', 'XLE'] as const) {
        assert.ok(inBox(p2[i]!.books[symbol]!));
        d1Keys.forEach((key) => assert.ok(Math.abs(p2[i]!.books[symbol]![key] - pair[symbol][key]) <= radius[key]));
      }
    }

    // Latin stratification: on an unclipped dimension the 16 offsets fall in 16 distinct strata
    const centre = {
      XLE: Object.fromEntries(d1Keys.map((k, d) => [k, Math.round((box[d]!.min + box[d]!.max) / 2)])) as never
    };
    const points = neighbourhood(centre, { name: 's', n: 16, labels: ['test', 'strata'] });
    const w = points.map(
      (p) =>
        (p.books.XLE as Record<string, number>)!.continuationWindow! -
        (centre.XLE as Record<string, number>).continuationWindow!
    );

    assert.ok(new Set(w).size >= 12);
    assert.ok(uniquePoints(points, centre).length <= 16);
  });

  it('the decisive design is one joint Latin hypercube per pool: deterministic, distinct between pools, in the radius', () => {
    const design = screenDesign();
    const pool = { VGT: design[3]!.grid, XLE: design[10]!.grid };
    const family = { name: 'hi', n: 32, labels: ['test', 'hi', 1] };
    const a = jointNeighbourhood(pool, family, 'VGT+XLE');
    const b = jointNeighbourhood(pool, family, 'VGT+XLE');
    const other = jointNeighbourhood(pool, family, 'VGT+XLE+EWZ');

    assert.deepEqual(a, b);
    assert.notDeepEqual(
      a.map((p) => p.books.VGT),
      other.map((p) => p.books.VGT)
    );

    for (const p of a) {
      for (const symbol of ['VGT', 'XLE'] as const) {
        assert.ok(inBox(p.books[symbol]!));
        d1Keys.forEach((key) => assert.ok(Math.abs(p.books[symbol]![key] - pool[symbol][key]) <= radius[key]));
      }
    }

    const sub = restrict(a[0]!, ['XLE']);

    assert.deepEqual(Object.keys(sub.books), ['XLE']);
    assert.deepEqual(sub.books.XLE, a[0]!.books.XLE);
  });

  it('nine pool-independent assignments, three of them not standalone-selected', () => {
    assert.deepEqual(assignmentKeys, [
      'alpha',
      'beta',
      'gamma1',
      'gamma2',
      'gamma3',
      'gamma4',
      'delta1',
      'delta2',
      'epsilon'
    ]);
  });

  it('pool identity and book order follow the engine (VGT, XBI, XRT, KRE, then alphabetical)', () => {
    assert.deepEqual(orderedOf(['GDX', 'XLE', 'VGT', 'AGG']), ['VGT', 'AGG', 'GDX', 'XLE']);
    assert.equal(poolId(['GDX', 'VGT']), 'VGT+GDX');
    assert.equal(booksKey({ GDX: screenDesign()[0]!.grid, VGT: screenDesign()[1]!.grid }).startsWith('VGT:'), true);
  });

  it('families are defined by VGT and GDX membership', () => {
    assert.equal(familyOf(['VGT', 'XLF']), 'V');
    assert.equal(familyOf(['GDX', 'XLF']), 'G');
    assert.equal(familyOf(['VGT', 'GDX', 'XLF']), 'VG');
    assert.equal(familyOf(['XLK', 'XLF']), 'N');
  });

  it('every period lies inside the training window', () => {
    assert.ok(periodList.every((p) => p.end <= trainEnd && p.start >= '2017-06-15'));
  });
});

describe('study9 ranking and statistics', () => {
  it('the constrained order puts feasible first by robust profit, then infeasible by violation', () => {
    const rows = [
      { id: 'a', violation: 0.2, robust: 50, p90Dd: 1 },
      { id: 'b', violation: 0, robust: 10, p90Dd: 1 },
      { id: 'c', violation: 0, robust: 20, p90Dd: 9 },
      { id: 'd', violation: 0.1, robust: 5, p90Dd: 1 },
      { id: 'e', violation: 0, robust: 20, p90Dd: 3 }
    ];

    assert.deepEqual(
      rows.sort(constrainedCompare).map((r) => r.id),
      ['e', 'c', 'b', 'd', 'a']
    );
  });

  it('robustness bands follow the brief (95 / 93 / 90)', () => {
    assert.match(band(0.96), /preferred/);
    assert.match(band(0.94), /conditional/);
    assert.match(band(0.91), /diagnostic/);
    assert.match(band(0.89), /fails/);
  });

  it('the Wilson lower bound is below the share and tightens with n', () => {
    assert.ok(wilsonLower(15 / 16, 16) < 15 / 16);
    assert.ok(wilsonLower(0.95, 384) > wilsonLower(0.95, 64));
  });

  it('Shapley contributions over exact subsets add up to the full pool (efficiency)', () => {
    const value: Record<string, number> = {
      VGT: 30,
      XLE: 10,
      EWZ: 5,
      'VGT+XLE': 33,
      'VGT+EWZ': 34,
      'EWZ+XLE': 14,
      'VGT+EWZ+XLE': 36
    };
    const lab = {
      ev: { yearsOfRun: () => 1 },
      point: (books: Record<string, unknown>) => {
        const key = orderedOf(Object.keys(books)).join('+');

        return { net: value[key]!, dd: 1, lots: 1, books: {} };
      }
    };
    const out = subsetsOf(lab as never, { VGT: {} as never, XLE: {} as never, EWZ: {} as never });
    const total = Object.values(out.shapley).reduce((a, b) => a + b, 0);

    assert.ok(Math.abs(total - 36) < 1e-9);
    assert.ok(Math.abs(out.leaveOneOut.VGT!.deltaPerYear - (36 - 14)) < 1e-9);
  });
});

describe('study9 data door', () => {
  it('refuses an end after 2024-12-31 and any root but the projection before reading a byte', async () => {
    await assert.rejects(
      openDoor(['VGT'], 'test', { end: '2025-01-02', root: '/nonexistent' }),
      /after the Phase A training end/
    );
    await assert.rejects(openDoor(['VGT'], 'test', { root: 'data' }), /neither the training projection/);
  });

  it('cuts a file at the last row of a New York date (evening bars belong to the previous date)', () => {
    const rows = [
      '"2024-12-31T20:59:00Z",1,1,1,1,1',
      '"2025-01-01T00:30:00Z",1,1,1,1,1', // 19:30 New York on 2024-12-31
      '"2025-01-02T14:30:00Z",2,2,2,2,2'
    ];
    const bytes = Buffer.from(`${rows.join('\n')}\n`);
    const cut = prefixLengthThrough(bytes, '2024-12-31');

    assert.equal(bytes.subarray(0, cut.bytes).toString(), `${rows[0]}\n${rows[1]}\n`);
    assert.equal(cut.nextDate, '2025-01-02');
  });
});

describe('study9 grouping and nomination logic (synthetic records)', () => {
  it('complete linkage never chains, respects the cluster and the size cap', async () => {
    const { completeLinkage } = await import('../s2.ts');
    const cluster: Record<string, string> = { A: 'x', B: 'x', C: 'x', D: 'y', E: 'z', F: 'w', G: 'w', H: 'w', I: 'w' };
    const e = (a: string, b: string, c: number) => ({ a, b, strength: [c, 0] });
    const out = completeLinkage(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
      [
        e('A', 'B', 0.99),
        e('B', 'C', 0.98),
        e('D', 'E', 0.97),
        e('F', 'G', 0.99),
        e('F', 'H', 0.99),
        e('G', 'H', 0.99),
        e('F', 'I', 0.96),
        e('G', 'I', 0.96),
        e('H', 'I', 0.96)
      ],
      (s) => cluster[s]!,
      3
    );
    const groupOfSym = (s: string) => out.groups.find((g) => g.includes(s))!;

    assert.deepEqual(groupOfSym('A'), ['A', 'B']); // B–C would chain: refused (A–C is no edge)
    assert.deepEqual(groupOfSym('C'), ['C']);
    assert.deepEqual(groupOfSym('D'), ['D']); // cross-cluster
    assert.deepEqual(groupOfSym('F'), ['F', 'G', 'H']); // I refused by the size cap
    assert.deepEqual(
      new Set(out.rejectedMerges.map((r) => r.reason)),
      new Set(['not complete', 'cross-cluster', 'size'])
    );
  });

  it('a kept redundant proxy may sit beside its anchor, at most one per group', async () => {
    const { dupOk } = await import('../s3.ts');
    const groupOf = { VGT: 'S1', XLK: 'S1', VOOG: 'S1', XLF: 'S2' };

    assert.equal(dupOk(['VGT', 'XLK', 'XLF'], groupOf), false);
    assert.equal(dupOk(['VGT', 'XLK', 'XLF'], groupOf, new Set(['XLK'])), true);
    assert.equal(dupOk(['VGT', 'XLK', 'VOOG'], groupOf, new Set(['XLK', 'VOOG'])), false);
  });

  it('nominates only qualified pools, fills slot 3 by diversity, keeps track sets as controls, declares negatives', async () => {
    const { nominate } = await import('../s3.ts');
    const high = (
      pool: string,
      family: string,
      size: number,
      stream: string,
      robust: number,
      ok = true,
      extra = {}
    ) => ({
      kind: 'proposal',
      pool,
      family,
      size,
      stream,
      assignment: 'alpha',
      members: pool.split('+'),
      decisive: {
        robustPerYear: robust,
        violation: ok ? 0 : 0.1,
        share: 0.96,
        wilsonLower: 0.94,
        p90Dd: 25000,
        parts: ok ? {} : { C2share: 0.1 },
        medianPerYear: robust * 1.2,
        p10PerYear: robust * 0.8
      },
      centre: { dd: 20000, perYear: robust * 1.3 },
      q7: true,
      complementarity: { pass: ok, i1Pass: ok, i2Pass: ok, i1: { x: { marginPerYear: 2000 } }, i2: {} },
      objectives: [robust * 1.3, robust * 1.2, robust * 0.8, 25000],
      band: 'preferred (≥ 95%)',
      bandUncertain: false,
      ...extra
    });
    const highs = [
      high('VGT+XLE+XLF', 'V', 3, 'beam', 30000),
      high('VGT+XLF+XOP', 'V', 3, 'beam', 28000),
      high('VGT+XLF+XLK', 'V', 3, 'beam', 25000),
      high('VGT+GLD+TLT', 'V', 3, 'explore-uniform', 20000),
      high('VGT+EWZ+XLB', 'V', 3, 'beam', 35000, false),
      high('VGT+XBI+XRT', 'V', 3, 'exhaustive-C', 40000),
      high('GDX+TLT', 'G', 2, 'exhaustive', 15000)
    ];
    const stratum = (family: string, size: number) => ({
      family,
      size,
      plan: 'exhaustive',
      proposals: [],
      nullPools: [
        { id: 'n', source: 'null', bestRobustPerYear: 1, independent64: 10000, feasibleAssignments: 1, violation: 0 }
      ],
      compute: { points: 0, replays: 0, seconds: 0 }
    });
    const mids = highs.map((h) => ({
      id: h.pool,
      best: 'alpha',
      assignments: [{ assignment: 'alpha', nb64: { robustPerYear: h.decisive.robustPerYear } }]
    }));
    const out = nominate([stratum('V', 3), stratum('G', 2)] as never, highs as never, mids as never);
    const v3 = out.nominations.filter((n) => n.family === 'V');

    assert.deepEqual(
      v3.map((n) => [n.pool, n.slot]),
      [
        ['VGT+XLE+XLF', 'profit-1'],
        ['VGT+XLF+XOP', 'profit-2'],
        ['VGT+GLD+TLT', 'exploration']
      ]
    );
    assert.deepEqual(
      out.nominations.filter((n) => n.family === 'G').map((n) => n.pool),
      ['GDX+TLT']
    );
    assert.ok(out.trackSetControls.some((t) => t.pool === 'VGT+XBI+XRT'));
    assert.ok(!out.nominations.some((n) => n.pool === 'VGT+XBI+XRT' || n.pool === 'VGT+EWZ+XLB'));
    assert.deepEqual(out.negativeFamilies, ['VG', 'N']);
    assert.deepEqual(
      out.batchA.map((b) => b.pool),
      ['VGT+XLE+XLF', 'GDX+TLT', 'VGT+GLD+TLT']
    ); // XOP pool differs by 1
    assert.match(out.batchBNote, /differs from A by only 0/);
    assert.ok(out.queue.some((q) => q.pool === 'VGT+EWZ+XLB'));
    assert.equal(out.nullStanding.find((x) => x.pool === 'VGT+XLE+XLF')!.percentile, 1);
  });
});
