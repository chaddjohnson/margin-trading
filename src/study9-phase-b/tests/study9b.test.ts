// Study 9 Phase B unit tests: synthetic inputs only, no market data.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveSeed } from '../../optimizer/rng.ts';
import type { Grid } from '../../portfolio-aware-d1/phenotypes.ts';
import * as s8Context from '../../study8-expanded-regime-d1/context.ts';
import { familyDesign as s8FamilyDesign } from '../../study8-expanded-regime-d1/designs.ts';
import { qualificationOf as s8QualificationOf } from '../../study8-expanded-regime-d1/evidence.ts';
import { orderedOf as s8OrderedOf } from '../../study8-expanded-regime-d1/evaluate.ts';
import { rankOrder as s8RankOrder } from '../../study8-expanded-regime-d1/search.ts';
import { assignRoles as s8AssignRoles } from '../../study8-expanded-regime-d1/select.ts';
import { lhsBooks as s8LhsBooks, sobolGrids as s8SobolGrids } from '../../study8-expanded-regime-d1/space.ts';
import { testGatesOf as s8TestGatesOf } from '../../study8-expanded-regime-d1/test.ts';
import {
  allSymbols,
  bandOf,
  constantsSnapshot,
  dimensionOf,
  searchJobs,
  studyName,
  trackBooks,
  trackKeys,
  tracks
} from '../context.ts';
import { familyDesign, nearBound } from '../designs.ts';
import { doorSpecOf } from '../door.ts';
import { orderedOf } from '../engine.ts';
import { qualificationOf } from '../evidence.ts';
import { budgetOf, rankOrder } from '../search.ts';
import { assignRoles } from '../select.ts';
import { lhsBooks, seedValue, sobolGrids, withNamespace } from '../space.ts';
import { testGatesOf } from '../test.ts';

const grid = (over: Partial<Grid> = {}): Grid => ({
  targetPercentChange: 150,
  trailingBuyPercentage: 10,
  trailingStopPercentage: 60,
  maximumHoldDays: 12,
  tickWindowSize: 100,
  intradayLossBuffer: 20,
  pullback: 80,
  continuationWindow: 60,
  ...over
});

test('the seven approved memberships, in engine order, with their dimensions', () => {
  assert.deepEqual(trackKeys, ['G4-ILF', 'G4-EWW', 'N3-EDV', 'N2-SMH', 'V3-IWM', 'N2-EDV', 'VG3-IWM']);
  assert.deepEqual(trackBooks('G4-ILF'), ['KRE', 'GDX', 'ILF', 'MTUM']);
  assert.deepEqual(trackBooks('G4-EWW'), ['KRE', 'EWW', 'GDX', 'MTUM']);
  assert.deepEqual(trackBooks('N3-EDV'), ['EDV', 'IWM', 'XLF']);
  assert.deepEqual(trackBooks('N2-SMH'), ['SMH', 'XHB']);
  assert.deepEqual(trackBooks('V3-IWM'), ['VGT', 'IWM', 'XLF']);
  assert.deepEqual(trackBooks('N2-EDV'), ['EDV', 'XHB']);
  assert.deepEqual(trackBooks('VG3-IWM'), ['VGT', 'GDX', 'IWM']);
  assert.deepEqual(trackKeys.map(dimensionOf), [32, 32, 24, 16, 24, 16, 24]);
  assert.match(tracks['VG3-IWM'].origin, /NOT a Phase A nominee/);
  assert.equal(allSymbols.length, 13);
});

test('35 search jobs, longest dimension first', () => {
  assert.equal(searchJobs.length, 35);
  assert.equal(new Set(searchJobs.map((j) => `${j.track}/${j.fold}`)).size, 35);

  const dims = searchJobs.map((j) => dimensionOf(j.track));

  assert.deepEqual(
    dims,
    [...dims].sort((a, b) => b - a)
  );
  assert.equal(searchJobs[0]!.fold, 'F24');
});

test('budgets follow Study 8 s(d) = max(1, d/16)', () => {
  const b16 = budgetOf({ key: 'N2-SMH', books: trackBooks('N2-SMH') });
  const b24 = budgetOf({ key: 'N3-EDV', books: trackBooks('N3-EDV') });
  const b32 = budgetOf({ key: 'G4-ILF', books: trackBooks('G4-ILF') });

  assert.deepEqual([b16.combos, b16.lhs, b16.r1Cap, b16.population, b16.newPerIsland], [4096, 1024, 1024, 64, 2048]);
  assert.deepEqual([b24.combos, b24.lhs, b24.r1Cap, b24.population, b24.newPerIsland], [6144, 1536, 1536, 96, 3072]);
  assert.deepEqual([b32.combos, b32.lhs, b32.r1Cap, b32.population, b32.newPerIsland], [8192, 2048, 2048, 128, 4096]);

  for (const b of [b16, b24, b32]) {
    assert.equal(b.screen, 4096);
    assert.equal(b.islands, 4);
    assert.equal(b.islandsMax, 8);
    assert.equal(b.r2Keep, 192);
    assert.equal(b.r3Keep, 48);
    assert.equal(b.refineStarts, 6);
    assert.equal(b.shortlist, 6);
    assert.equal(b.t1, true);
  }
});

test('the seed namespace is study9-phase-b; Study 8 draws are reproduced under its namespace', () => {
  assert.equal(studyName, 'study9-phase-b');
  assert.deepEqual(seedValue(['r1', 'G4-ILF', 'F24']), deriveSeed('study9-phase-b', 'r1', 'G4-ILF', 'F24'));
  assert.notDeepEqual(seedValue(['r1', 'VG', 'F24']), deriveSeed(...s8Context.seedOf('r1', 'VG', 'F24')));
  assert.deepEqual(
    withNamespace(s8Context.seedOf, () => seedValue(['r1', 'VG', 'F24'])),
    deriveSeed(...s8Context.seedOf('r1', 'VG', 'F24'))
  );
  assert.deepEqual(
    withNamespace(s8Context.seedOf, () => sobolGrids(256, ['screen', 'VGT', 'VG', 'F24'])),
    s8SobolGrids(256, ['screen', 'VGT', 'VG', 'F24'])
  );
  assert.deepEqual(
    withNamespace(s8Context.seedOf, () => lhsBooks(64, ['VGT', 'XBI', 'GDX'], ['lhs', 'VXR', 'F21'])),
    s8LhsBooks(64, ['VGT', 'XBI', 'GDX'], ['lhs', 'VXR', 'F21'])
  );

  const books = { VGT: grid(), GDX: grid({ targetPercentChange: 290, trailingStopPercentage: 32 }) };

  for (const family of [
    { n: 128, labels: ['confirm', 'VG', 'F24', 1] },
    { n: 128, labels: ['confirm-inbox', 'VG', 'F24', 1], mode: 'inbox' as const },
    { n: 128, labels: ['confirm-d8', 'VG', 'F24', 2], matchCount: 8 },
    { n: 128, labels: ['confirm-wide', 'VG', 'F24', 1], scale: 1.5 }
  ]) {
    assert.deepEqual(
      withNamespace(s8Context.seedOf, () => familyDesign(books, ['VGT', 'GDX'], family)),
      s8FamilyDesign(books, ['VGT', 'GDX'], family)
    );
  }
});

test('the engine order equals Study 8 order on B5 subsets and keeps every new book', () => {
  for (const set of [
    ['GDX', 'VGT'],
    ['KRE', 'XRT', 'VGT', 'GDX', 'XBI'],
    ['XBI', 'XRT']
  ]) {
    assert.deepEqual(orderedOf(set), s8OrderedOf(set));
  }

  assert.deepEqual(s8OrderedOf(['EDV', 'IWM', 'XLF']), []); // Study 8's would silently drop them
  assert.deepEqual(orderedOf(['XLF', 'EDV', 'IWM']), ['EDV', 'IWM', 'XLF']);

  const books = { EDV: grid(), IWM: grid(), XLF: grid() };
  const points = familyDesign(books, Object.keys(books), { n: 64, labels: ['confirm', 'N3-EDV', 'F24', 1] });
  const moved = new Set<string>();

  for (const point of points)
    for (const [symbol, g] of Object.entries(point.books))
      for (const [key, value] of Object.entries(g))
        if (value !== books[symbol as 'EDV']![key as keyof Grid]) moved.add(`${symbol}.${key}`);

  assert.equal(moved.size, 24); // every one of the 3 × 8 coordinates is perturbed
  assert.deepEqual(nearBound({ EDV: grid({ maximumHoldDays: 3 }) }), ['EDV.maximumHoldDays']);
});

test('the gates, ranking and roles are Study 8 functions, imported unchanged', () => {
  assert.equal(qualificationOf, s8QualificationOf);
  assert.equal(testGatesOf, s8TestGatesOf);
  assert.equal(assignRoles, s8AssignRoles);
  assert.equal(rankOrder, s8RankOrder);
});

test('the rulebook embeds Study 8 values verbatim', () => {
  const ours = constantsSnapshot() as Record<string, unknown>;
  const theirs = s8Context.constantsSnapshot() as Record<string, unknown>;

  for (const key of [
    'execution',
    'eligibility',
    'testGates',
    'schedule',
    'stresses',
    'executionSettings',
    'bootstrap',
    'folds',
    'windows',
    'episodeGap',
    'radius',
    'insufficientTestLots'
  ]) {
    assert.deepEqual(ours[key], theirs[key], key);
  }
});

test('user-preference bands (report-only)', () => {
  assert.equal(bandOf(0.96), 'preferred (≥ 95%)');
  assert.equal(bandOf(0.95), 'preferred (≥ 95%)');
  assert.equal(bandOf(0.94), 'conditional (93–95%)');
  assert.equal(bandOf(0.93), 'conditional (93–95%)');
  assert.equal(bandOf(0.92), 'diagnostic (90–93%)');
  assert.equal(bandOf(0.9), 'diagnostic (90–93%)');
  assert.equal(bandOf(0.899), 'below 90% (fails C2/Q2/T2)');
  assert.equal(bandOf(NaN), 'below 90% (fails C2/Q2/T2)');
});

test('door specs: training doors on the projection, F24 and later on canonical files, refusals', () => {
  assert.deepEqual(doorSpecOf('search-F24'), {
    root: 'data/vintages/study9-train-2024',
    end: '2024-12-31',
    exact: false
  });
  assert.deepEqual(doorSpecOf('search-F19'), {
    root: 'data/vintages/study9-train-2024',
    end: '2019-12-31',
    exact: false
  });
  assert.deepEqual(doorSpecOf('test-F23'), {
    root: 'data/vintages/study9-train-2024',
    end: '2024-12-31',
    exact: false
  });
  assert.deepEqual(doorSpecOf('test-F21'), {
    root: 'data/vintages/study9-train-2024',
    end: '2023-12-29',
    exact: false
  });
  assert.deepEqual(doorSpecOf('test-F24'), { root: 'data', end: '2026-10-29', exact: true });
  assert.deepEqual(doorSpecOf('slice'), { root: 'data', end: '2026-10-30', exact: true });
  assert.deepEqual(doorSpecOf('post'), { root: 'data', end: '2026-10-29', exact: true });
  assert.throws(() => doorSpecOf('parity', '2025-01-02'));
  assert.throws(() => doorSpecOf('search-F25'));
  assert.throws(() => doorSpecOf('unknown'));
});

test('the door-gate state machine (review m8)', async () => {
  const { gateDecision } = await import('../gates.ts');
  const state = (sealed: string[], extra: Partial<Parameters<typeof gateDecision>[1]> = {}) => ({
    smoke: false,
    frozen: true,
    sealed: new Set(sealed),
    parityPassed: sealed.includes('parity'),
    ...extra
  });
  const chainTo = (phase: string) => {
    const order = [
      'protocol',
      'parity',
      'search',
      'qualify',
      'selection',
      'audit',
      'test-F19',
      'test-F20',
      'test-F21',
      'test-F23',
      'test-F24',
      'test-F24-confirm'
    ];

    return order.slice(0, order.indexOf(phase) + 1);
  };

  assert.equal(gateDecision('pilot', state([], { frozen: false })), null);
  assert.match(gateDecision('pilot', state(['protocol']))!, /pre-freeze/);
  assert.equal(gateDecision('parity', state(['protocol'])), null);
  assert.match(gateDecision('parity', state(chainTo('parity')))!, /only inside the parity stage/);
  assert.match(gateDecision('search-F24', state(['protocol']))!, /parity is not sealed/);
  assert.match(
    gateDecision('search-F24', state(['protocol', 'parity'], { parityPassed: false }))!,
    /parity is not sealed and passed/
  );
  assert.equal(gateDecision('search-F24', state(chainTo('qualify'))), null);
  assert.match(gateDecision('search-F24', state(chainTo('selection')))!, /selection is sealed/);
  assert.match(gateDecision('search-F19', state(chainTo('qualify'), { testTrace: 'x exists' }))!, /closed: x exists/);
  assert.match(gateDecision('test-F19', state(chainTo('selection')))!, /selection and audit/);
  assert.equal(gateDecision('test-F19', state(chainTo('audit'))), null);
  assert.match(gateDecision('test-F20', state(chainTo('audit')))!, /requires test-F19 first/);
  assert.match(gateDecision('test-F24', state(chainTo('test-F21')))!, /requires test-F23 first/);
  assert.equal(gateDecision('test-F24', state(chainTo('test-F23'))), null);
  assert.match(gateDecision('slice', state(chainTo('test-F24')))!, /test-F24-confirm/);
  assert.equal(gateDecision('slice', state(chainTo('test-F24-confirm'))), null);
  assert.equal(gateDecision('post', state(chainTo('test-F24-confirm'))), null);
  assert.match(gateDecision('smoke-x', state(['protocol']))!, /only in smoke mode/);
  assert.match(gateDecision('search-F24', state([], { smoke: true }))!, /only smoke doors/);
  assert.equal(gateDecision('smoke-search-F24', state([], { smoke: true })), null);
  assert.match(gateDecision('nonsense', state(chainTo('audit')))!, /unknown door/);
});

test('the audit result rule (review M2)', async () => {
  const { auditCleared } = await import('../gates.ts');

  assert.equal(auditCleared('# Audit\n\nfindings…\n\nResult: CLEARED\n'), true);
  assert.equal(auditCleared('Result: NOT CLEARED\n'), false);
  assert.equal(auditCleared('Result: CLEARED\nResult: CLEARED\n'), false);
  assert.equal(auditCleared('The audit is CLEARED.\n'), false);
  assert.equal(auditCleared('Result: CLEARED\n\nbut the reviewer says it is NOT CLEARED\n'), false);
  assert.equal(auditCleared('Result: BLOCKED\n'), false);
});

test('the engine hash and the pins cover the loader through #lib (review M1)', async () => {
  const { engineFiles } = await import('../engine.ts');
  const { importClosure } = await import('../integrity.ts');
  const engine = engineFiles();
  const closure = await importClosure();

  for (const file of [
    'src/lib/evaluation.ts',
    'src/lib/session.ts',
    'src/lib/dataset.ts',
    'src/portfolio-aware-d1/nbook/universe.ts'
  ])
    assert.ok(engine.includes(file) && closure.includes(file), file);

  assert.ok(engine.includes('package-lock.json'));
  assert.ok(engine.includes('src/study8-expanded-regime-d1/evaluate.ts'));
});

test('the family-wise max-T test (review M5)', async () => {
  const { maxT } = await import('../preference.ts');
  // two holders: one with a large positive observed total, one near zero; common resamples centred on the observation
  const totals = [
    Array.from({ length: 1000 }, (_v, b) => 100 + 10 * Math.sin(b)),
    Array.from({ length: 1000 }, (_v, b) => 1 + 10 * Math.cos(b))
  ];
  const rows = maxT([100, 1], totals);

  assert.ok(rows[0]!.adjustedP < 0.05);
  assert.ok(rows[1]!.adjustedP > 0.05);
  assert.ok(rows[0]!.se > 0);
});

test('the namespace switch accepts synchronous callbacks only (review m6)', async () => {
  const { withNamespace, assertStudyNamespace } = await import('../space.ts');

  assert.throws(() => withNamespace(s8Context.seedOf, () => Promise.resolve(1)));
  assert.doesNotThrow(() => assertStudyNamespace('test'));
});
