// Unit tests of Study 8's machinery (PROTOCOL.md §9): constants equal the protocol tables (Study 7's rulebook
// literally), folds and door ends, the dimension-scaled budgets, design determinism and the seed namespace, the
// qualification gates, the test gates T1–T7 (strict ceiling, NaN, partial 2026), role assignment, the door-gate order and
// integrity pins, and the local hash chain's tamper detection. No market data is read (the door-gate test runs in a
// temporary copy with placeholder data files).
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import fs from 'fs-extra';
import { selectSurvivors } from '../../optimizer/nsga2.ts';
import { Rng, deriveSeed } from '../../optimizer/rng.ts';
import {
  eligibility as s7Eligibility,
  radius as s7Radius,
  schedule as s7Schedule
} from '../../study7-stability-first-d1/context.ts';
import {
  dimensionScale,
  eligibility,
  folds,
  primaryFold,
  radius,
  schedule,
  testGates,
  trackKeys,
  tracks
} from '../context.ts';
import { doorSpecOf } from '../data.ts';
import { design, seedValue } from '../designs.ts';
import { type Evidence, qualificationOf, wilsonLower } from '../evidence.ts';
import { floorsOf } from '../fitness.ts';
import { budgetOf, rankOrder } from '../search.ts';
import { assignRoles, jaccard } from '../select.ts';
import { testFloorsOf, testGatesOf } from '../test.ts';

test('Study 7 rulebook, radii and fidelity ladder are retained literally', () => {
  assert.deepEqual(eligibility, { ...s7Eligibility });
  assert.deepEqual(radius, s7Radius);
  assert.equal(schedule.r1, s7Schedule.r1);
  assert.equal(schedule.r2, s7Schedule.r2);
  assert.equal(schedule.r3, s7Schedule.r3);
  assert.equal(schedule.distinct, s7Schedule.distinct);
  assert.deepEqual(testGates, {
    centrePerTestYear: 10000,
    medianPerTestYear: 5000,
    testLotsPerYear: 1.5,
    testEpisodesPerYear: 0.5,
    marginalShare: 0.93,
    marginalCentreDd: 33000
  });
});

test('six full tracks; joint-proposal budgets scale with s(d) = max(1, d/16)', () => {
  assert.deepEqual(trackKeys, ['G', 'V', 'VG', 'VXR', 'VXRG', 'VXRKG']);
  assert.deepEqual([...tracks.VXRKG.books], ['VGT', 'XBI', 'XRT', 'KRE', 'GDX']);
  assert.deepEqual(
    trackKeys.map((t) => dimensionScale(tracks[t].books.length)),
    [1, 1, 1, 1.5, 2, 2.5]
  );

  const expected: Record<string, [number, number, number, number, number]> = {
    // newPerIsland, population, combos, lhs, r1Cap
    G: [2048, 64, 4096, 1024, 1024],
    V: [2048, 64, 4096, 1024, 1024],
    VG: [2048, 64, 4096, 1024, 1024],
    VXR: [3072, 96, 6144, 1536, 1536],
    VXRG: [4096, 128, 8192, 2048, 2048],
    VXRKG: [5120, 160, 10240, 2560, 2560]
  };

  for (const track of trackKeys) {
    const b = budgetOf(track);

    assert.deepEqual([b.newPerIsland, b.population, b.combos, b.lhs, b.r1Cap], expected[track]);
    assert.equal(b.islands, 4);
    assert.equal(b.islandsMax, 8);
    assert.equal(b.r2Keep, 192);
    assert.equal(b.r3Keep, 48);
    assert.equal(b.refineStarts, 6);
    assert.equal(b.shortlist, 6);
    assert.equal(b.t1, true);
    assert.equal(b.screen, tracks[track].books.length === 1 ? 8192 : 4096);
    // the GA can spend the island budget within its generation cap
    assert.ok(b.population * schedule.generations >= b.newPerIsland);
  }

  // G, V and VG keep Study 7's budgets exactly
  assert.equal(budgetOf('VG').newPerIsland, s7Schedule.newPerIsland);
  assert.equal(budgetOf('VG').combos, s7Schedule.poolCombos);
});

test('the lean constrained ranking equals selectSurvivors exactly (mixed feasibility, ties, infinite violations)', () => {
  for (const [seed, n] of [
    [1, 40],
    [2, 300],
    [3, 900]
  ] as const) {
    const rng = new Rng(deriveSeed('rank-test', seed));
    const violations = [0, 0, 0, 0.01, 0.5, 0.5, 2, Infinity];
    const items = Array.from({ length: n }, (_v, i) => ({
      id: `c${String(i).padStart(4, '0')}`,
      genome: [],
      violation: violations[rng.int(violations.length)]!,
      objectives: [rng.int(12), rng.int(12), rng.int(12), rng.int(6)]
    }));
    const expected = selectSurvivors(items, items.length).map((r) => r.member.id);

    assert.deepEqual(
      rankOrder(items).map((item) => item.id),
      expected
    );
  }
});

test('folds and door ends: no search door reads past its cutoff', () => {
  assert.equal(primaryFold, 'F24');
  assert.deepEqual(
    Object.fromEntries(Object.entries(folds).map(([k, f]) => [k, [f.trainEnd, f.testStart, f.testEnd]])),
    {
      F19: ['2019-12-31', '2020-01-01', '2021-12-31'],
      F20: ['2020-12-31', '2021-01-01', '2022-12-30'],
      F21: ['2021-12-31', '2022-01-01', '2023-12-29'],
      F23: ['2023-12-29', '2024-01-01', '2024-12-31'],
      F24: ['2024-12-31', '2025-01-01', '2026-10-29']
    }
  );

  for (const [fold, spec] of Object.entries(folds)) {
    assert.equal(doorSpecOf(`search-${fold}` as never).end, spec.trainEnd);
  }

  assert.equal(doorSpecOf('test-F23').end, '2024-12-31');
  assert.equal(doorSpecOf('test-F24').end, undefined); // the final door: full history
  assert.equal(doorSpecOf('pilot-F24').end, '2024-12-31');
  assert.throws(() => doorSpecOf('search-X' as never));
});

test('floors scale with the window (Study 7 per-year rule); test-window floors use yTest to 0.01', () => {
  assert.deepEqual(floorsOf(7.55, 2017, 2024), { y: 7.55, lots: 12, episodes: 4, lotYears: 3, bookLots: 4 });
  assert.deepEqual(floorsOf(2.54, 2017, 2019), { y: 2.54, lots: 4, episodes: 2, lotYears: 2, bookLots: 2 });
  assert.deepEqual(testFloorsOf(505 / 252), { lots: 3, episodes: 1 }); // a 253-session year adds nothing
  assert.deepEqual(testFloorsOf(252 / 252), { lots: 2, episodes: 1 });
  assert.deepEqual(testFloorsOf(458 / 252), { lots: 3, episodes: 1 });
});

test('designs are deterministic across the 40-D pool and seeded in the Study 8 namespace', () => {
  const centre = Object.fromEntries(
    ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'].map((s) => [
      s,
      {
        targetPercentChange: 250,
        trailingBuyPercentage: 10,
        trailingStopPercentage: 60,
        maximumHoldDays: 10,
        tickWindowSize: 100,
        intradayLossBuffer: 20,
        pullback: 100,
        continuationWindow: 100
      }
    ])
  );
  const a = design({ centre, perturb: Object.keys(centre), n: 16, labels: ['t', 1], mode: 'clip', scale: 1 });
  const b = design({ centre, perturb: Object.keys(centre), n: 16, labels: ['t', 1], mode: 'clip', scale: 1 });

  assert.deepEqual(a, b);
  assert.ok(a.every((p) => p.distance <= 1 + 1e-9));
  assert.deepEqual(
    seedValue(['test', 'sets', 'F24', 1]),
    deriveSeed('study8-expanded-regime-d1', 'test', 'sets', 'F24', 1)
  );
  assert.notDeepEqual(
    seedValue(['test', 'sets', 'F24', 1]),
    deriveSeed('study7-stability-first-d1', 'test', 'sets', 'F24', 1)
  );
});

test('Wilson lower bound', () => {
  assert.ok(Math.abs(wilsonLower(0.9, 384) - 0.8717) < 0.002);
});

// ----- gate fixtures -----

const nb = (over: Record<string, number> = {}) => ({
  n: 384,
  share: 0.97,
  p90Dd: 25000,
  medianPerYear: 20000,
  p10Net: 50000,
  robustPerYear: 15000,
  ...over
});

const evidenceFixture = (over: { dd?: number; d8Median?: number; share?: number; perRepShare?: number } = {}) =>
  ({
    books: { VGT: {}, GDX: {} },
    centre: {
      record: {
        dd: over.dd ?? 20000,
        net: 200000,
        lots: 40,
        episodes: 20,
        lotYears: 8,
        books: { VGT: { lots: 20 }, GDX: { lots: 20 } },
        periods: { 'TRAIN-F24': 180000, 'TEST-F24': 30000, '2020': 60000, '2025': 20000, '2026~partial': 10000 },
        top1Share: 0.1,
        perCapitalYear: 30000
      },
      bestYearShare: 0.3,
      exBestPerYear: 15000,
      top1Share: 0.1,
      perCapitalYear: 30000
    },
    decisive: {
      nb: nb({ share: over.share ?? 0.97 }),
      wilsonLower: 0.95,
      train: { median: 150000 },
      test: { median: 20000 }
    },
    perRep: [1, 2, 3].map(() => ({ nb: nb({ share: over.perRepShare ?? 0.97 }) })),
    alternates: { inbox: { nb: nb() }, d8: { nb: nb({ medianPerYear: over.d8Median ?? 20000 }) } },
    stress: {
      cost10: { net: 1, dd: 1 },
      rate14: { net: 1, dd: 1 },
      nextOpen: { net: 1, dd: 1 },
      slip25: { net: 1, dd: 1 }
    },
    nearBound: []
  }) as unknown as Evidence;

const b1 = evidenceFixture({ d8Median: 10000 });
const floors = { y: 9.3, lots: 14, episodes: 5, lotYears: 3, bookLots: 4 };

test('qualification gates: strict $35,000 ceiling, finite E3', () => {
  const ok = qualificationOf(evidenceFixture(), floors, { fold: 'F24', trainKey: 'TRAIN-F24', b1, pooled: true });

  assert.deepEqual(ok.failed, []);
  assert.equal(ok.qualified, true);
  assert.deepEqual(
    qualificationOf(evidenceFixture({ dd: 35000 }), floors, { fold: 'F24', trainKey: 'TRAIN-F24', b1, pooled: true })
      .failed,
    ['Q1']
  );
  assert.ok(
    qualificationOf(evidenceFixture({ dd: 34999.99 }), floors, { fold: 'F24', trainKey: 'TRAIN-F24', b1, pooled: true })
      .qualified
  );
  assert.deepEqual(
    qualificationOf(evidenceFixture({ d8Median: NaN }), floors, {
      fold: 'F24',
      trainKey: 'TRAIN-F24',
      b1,
      pooled: true
    }).failed,
    ['E3']
  );
  assert.ok(
    qualificationOf(evidenceFixture({ share: 0.92 }), floors, { fold: 'F24', trainKey: 'TRAIN-F24', b1, pooled: true })
      .marginal
  );
});

const deepFixture = (over: { newLots?: number; testNet?: number } = {}) => ({
  test: { net: over.testNet ?? 30000, newLots: over.newLots ?? 6, newEpisodes: 3 },
  sensitivities: {
    cost10: { test: 1, dd: 1 },
    rate14: { test: 1, dd: 1 },
    nextOpen: { test: 1, dd: 1 },
    slip25: { test: 1, dd: 1 }
  }
});
const ctx = { y: 9.3, yTest: 1.82, floors, symbols: ['VGT', 'GDX'] };
const gatesOf = (ev: Evidence, d = deepFixture()) => testGatesOf(ev, ev.centre.record, d, ctx);

test('test gates T1–T7: strict ceiling, activity, partial 2026, ambiguity', () => {
  assert.equal(gatesOf(evidenceFixture()).status, 'pass');
  assert.deepEqual(gatesOf(evidenceFixture({ dd: 35000 })).failed, ['T1']);
  assert.equal(gatesOf(evidenceFixture({ dd: 33000 })).status, 'ambiguous');
  assert.equal(gatesOf(evidenceFixture({ share: 0.93 })).status, 'ambiguous');
  assert.equal(gatesOf(evidenceFixture({ perRepShare: 0.85 })).status, 'ambiguous');
  assert.deepEqual(gatesOf(evidenceFixture(), deepFixture({ newLots: 2 })).failed, ['T6']); // ⌈1.5 × 1.82⌉ = 3
  assert.deepEqual(gatesOf(evidenceFixture(), deepFixture({ testNet: 18199 })).failed, ['T3']); // < $10k × 1.82

  // a partial 2026 holding 80% of net fails T5 (2026 counts as a year)
  const heavy = evidenceFixture();

  (heavy.centre.record.periods as Record<string, number>)['2026~partial'] = 160000;
  assert.ok(gatesOf(heavy).failed.includes('T5'));

  // a NaN test median never passes T3
  const nanMedian = evidenceFixture();

  (nanMedian.decisive as { test: { median: number } }).test.median = NaN;
  assert.ok(gatesOf(nanMedian).failed.includes('T3'));
});

test('role assignment: training order, qualification veto, distinctness and ledger-distinct extras', () => {
  const grid = (x: number) => ({
    targetPercentChange: x,
    trailingBuyPercentage: 10,
    trailingStopPercentage: 60,
    maximumHoldDays: 10,
    tickWindowSize: 100,
    intradayLossBuffer: 20,
    pullback: 100,
    continuationWindow: 100
  });
  const c = (id: string, x: number, robust: number, share: number, qualified: boolean, ledger: string[]) => ({
    id,
    books: { GDX: grid(x) },
    trainingSelection: { robustPerYear: robust, medianPerYear: robust, p90Dd: 20000, share, n: 256 },
    qualification: { qualified, failed: qualified ? [] : ['Q2'], marginal: false },
    ledger
  });
  const list = [
    c('a', 80, 30000, 0.9, false, ['1', '2']), // best profit but unqualified: vetoed
    c('b', 150, 25000, 0.95, true, ['1', '2', '3']),
    c('c', 152, 24000, 0.99, true, ['4']), // too close to b (L∞ < 0.10)
    c('d', 250, 20000, 0.98, true, ['5', '6']),
    c('e', 300, 5000, 1, true, ['7']), // median below 50% of the profit holder's: never robust
    c('f', 200, 13000, 0.9, true, ['1', '2', '3']), // ledger identical to b: not an extra
    c('g', 100, 14000, 0.9, true, ['8'])
  ];
  const roles = assignRoles(list, ['GDX']).map((r) => `${r.role}:${r.holder?.id ?? '-'}`);

  assert.deepEqual(roles, ['profit:b', 'robust:d', 'balanced:g', 'extra:e']);
  assert.equal(jaccard(['1', '2'], ['2', '3']), 1 / 3);
});

// ----- the local hash chain and the door gates (in a temporary copy) -----

const inTemp = async (body: (dir: string) => Promise<void>) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 's8-'));
  const cwd = process.cwd();

  try {
    await fs.copy(path.join(cwd, 'src'), path.join(dir, 'src'));
    await fs.outputFile(path.join(dir, 'package.json'), '{}');
    await fs.ensureDir(path.join(dir, 'research/study8-expanded-regime-d1/scripts'));

    for (const s of ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'])
      await fs.outputFile(path.join(dir, `data/${s}/data.csv`), `placeholder ${s}\n`);
    for (const f of [
      'data/partitions.json',
      'config/market-events/splits.json',
      'config/market-events/distributions.csv',
      'config/market-events/distributions.manifest.json'
    ]) {
      await fs.outputFile(path.join(dir, f), `placeholder ${f}\n`);
    }

    process.chdir(dir);
    await body(dir);
  } finally {
    process.chdir(cwd);
    await fs.remove(dir);
  }
};

test('the local hash chain detects tampering, broken links, door-log edits and truncation', async () => {
  await inTemp(async () => {
    const records = await import('../records.ts');

    await fs.outputFile('research/study8-expanded-regime-d1/a.json', '{"x":1}');
    await fs.outputFile(
      'research/study8-expanded-regime-d1/results/doors.jsonl',
      '{"door":"pilot-F24","purpose":"p"}\n'
    );
    await records.appendPhase('one', ['research/study8-expanded-regime-d1/a.json']);
    assert.equal((await records.verifyChain()).length, 1);
    await assert.rejects(records.appendPhase('one', ['research/study8-expanded-regime-d1/a.json']));

    await fs.outputFile('research/study8-expanded-regime-d1/a.json', '{"x":2}');
    await assert.rejects(records.verifyChain(), /changed/);
    await fs.outputFile('research/study8-expanded-regime-d1/a.json', '{"x":1}');

    // appending door-log lines is fine; editing a sealed line is not
    await fs.appendFile(
      'research/study8-expanded-regime-d1/results/doors.jsonl',
      '{"door":"search-F19","purpose":"q"}\n'
    );
    assert.equal((await records.verifyChain()).length, 1);
    await fs.outputFile(
      'research/study8-expanded-regime-d1/results/doors.jsonl',
      '{"door":"pilot-F24","purpose":"EDITED"}\n{"door":"search-F19","purpose":"q"}\n'
    );
    await assert.rejects(records.verifyChain(), /door log/);
    await fs.outputFile(
      'research/study8-expanded-regime-d1/results/doors.jsonl',
      '{"door":"pilot-F24","purpose":"p"}\n{"door":"search-F19","purpose":"q"}\n'
    );

    // a door opening that saw a chain head the chain no longer holds (truncation)
    await fs.appendFile(
      'research/study8-expanded-regime-d1/results/doors.jsonl',
      '{"door":"search-F19","purpose":"r","chainHead":{"seq":2,"entryHash":"zz"}}\n'
    );
    await assert.rejects(records.verifyChain(), /truncated/);
    await fs.outputFile(
      'research/study8-expanded-regime-d1/results/doors.jsonl',
      '{"door":"pilot-F24","purpose":"p"}\n{"door":"search-F19","purpose":"q"}\n'
    );

    await fs.appendFile(
      'research/study8-expanded-regime-d1/results/chain.jsonl',
      '{"seq":2,"phase":"forged","at":"","files":[],"doors":{"lines":0,"sha256":""},"prev":"x","entryHash":"y"}\n'
    );
    await assert.rejects(records.verifyChain(), /broken/);
  });
});

test('door gates: phase order, training doors close, integrity pins fail closed', async () => {
  await inTemp(async () => {
    const records = await import('../records.ts');
    const { doorGate } = await import('../gates.ts');
    const { snapshot } = await import('../integrity.ts');
    const r = 'research/study8-expanded-regime-d1';
    const seal = async (phase: string, file: string, body: Record<string, unknown>) => {
      await records.writeSealed(file, body);
      await records.appendPhase(phase, [file]);
    };

    await doorGate('pilot-F24'); // before the freeze
    await assert.rejects(doorGate('search-F24'), /not frozen/);

    await seal('protocol', `${r}/results/protocol_freeze.json`, {
      stage: 'PROTOCOL_FREEZE',
      integrity: await snapshot()
    });
    await assert.rejects(doorGate('pilot-F24'), /pre-freeze/);
    await assert.rejects(doorGate('search-F24'), /parity/);
    await doorGate('parity');

    await seal('parity', `${r}/results/parity/parity.json`, { stage: 'PARITY', passed: true });
    await assert.rejects(doorGate('parity'), /only inside the parity stage/);
    await doorGate('search-F24');
    await assert.rejects(doorGate('test-F19'), /selection/);

    // integrity: a changed data file, a changed code file
    await fs.appendFile('data/GDX/data.csv', 'revised bar\n');
    await assert.rejects(doorGate('search-F24'), /data\/GDX\/data.csv changed/);
    await fs.outputFile('data/GDX/data.csv', 'placeholder GDX\n');

    const gatesFile = 'src/study8-expanded-regime-d1/gates.ts';
    const original = await fs.readFile(gatesFile, 'utf8');

    await fs.appendFile(gatesFile, '\n// edit\n');
    await assert.rejects(doorGate('search-F24'), /code digest/);
    await fs.outputFile(gatesFile, original);
    await doorGate('search-F24');

    await seal('search', `${r}/results/search.json`, { stage: 'x' });
    await seal('qualify', `${r}/results/qualify.json`, { stage: 'x' });
    await fs.outputFile(`${r}/FROZEN_SELECTION.json`, '{}');
    await assert.rejects(doorGate('search-F24'), /FROZEN_SELECTION/); // the file alone closes the training doors
    await fs.remove(`${r}/FROZEN_SELECTION.json`);
    await seal('selection', `${r}/FROZEN_SELECTION.json`, { stage: 'FROZEN_SELECTION' });
    await assert.rejects(doorGate('search-F24'), /selection is sealed/);
    await assert.rejects(doorGate('test-F19'), /audit/);

    await seal('audit', `${r}/results/audit/pre_test_audit.json`, { stage: 'PRE_TEST_AUDIT' });
    await assert.rejects(doorGate('test-F20'), /test-F19 first/);
    await doorGate('test-F19');
    await seal('test-F19', `${r}/results/test/F19/test.json`, { stage: 'TEST' });
    await doorGate('test-F20');
    await assert.rejects(doorGate('test-F24'), /test-F20 first/);
  });
});
