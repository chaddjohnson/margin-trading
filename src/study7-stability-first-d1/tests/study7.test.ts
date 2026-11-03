// Unit tests of Study 7's pure machinery (PROTOCOL.md §12): constants equal the protocol tables, design determinism and
// shape (clip, in-box, count-matched, norm-matched), the violation and floors, the Wilson bound, budgets, doors.
// No market data is read.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eligibility, frozenGrids, gdxControls, radius, schedule, tracks } from '../context.ts';
import { design, uniqueMask } from '../designs.ts';
import { wilsonLower } from '../evidence.ts';
import { type CentreView, type NbView, floorsOf, violationOf } from '../fitness.ts';
import { doorGate } from '../gates.ts';
import { budgetOf } from '../search.ts';
import { vectorId } from '../space.ts';

test('eligibility constants equal PROTOCOL.md §7.1', () => {
  assert.deepEqual(
    { ...eligibility },
    {
      ceiling: 35000,
      share: 0.9,
      lotsPerYear: 1.5,
      episodesPerYear: 0.5,
      minLotYears: 3,
      medianPerYear: 10000,
      p10Floor: 0,
      perCapitalYear: 11000,
      topLotShare: 0.25,
      topYearShare: 0.75,
      exBestPerYear: 5000,
      plateau: 0.6
    }
  );
  assert.deepEqual(radius, { targetPercentChange: 10, trailingBuyPercentage: 2, trailingStopPercentage: 10, maximumHoldDays: 2, tickWindowSize: 10, intradayLossBuffer: 10, pullback: 10, continuationWindow: 20 });
  assert.equal(schedule.r1, 16);
  assert.equal(schedule.r2, 64);
  assert.equal(schedule.r3, 128);
  assert.equal(schedule.distinct, 0.1);
});

test('floors scale with the window and B1 is feasible on DEV', () => {
  const dev = floorsOf(4.548, 2017, 2021);

  assert.deepEqual(dev, { y: 4.548, lots: 7, episodes: 3, lotYears: 3, bookLots: 2 });
  assert.deepEqual(floorsOf(2.55, 2017, 2019), { y: 2.55, lots: 4, episodes: 2, lotYears: 2, bookLots: 2 });
  // B1 on DEV (pilot): 8 lots, 3 episodes, 3 lot years
  assert.ok(8 >= dev.lots && 3 >= dev.episodes && 3 >= dev.lotYears);
});

test('designs are deterministic, centre-independent offsets and clipped to the box', () => {
  const centre = { VGT: { ...frozenGrids.VGT }, GDX: { ...frozenGrids.GDX } };
  const a = design({ centre, perturb: ['VGT', 'GDX'], n: 32, labels: ['test', 1], mode: 'clip', scale: 1 });
  const b = design({ centre, perturb: ['VGT', 'GDX'], n: 32, labels: ['test', 1], mode: 'clip', scale: 1 });

  assert.deepEqual(a, b);
  assert.ok(a.every((p) => p.distance <= 1 + 1e-9));
  assert.equal(uniqueMask(a, centre).filter(Boolean).length <= 32, true);

  const inbox = design({ centre, perturb: ['VGT', 'GDX'], n: 32, labels: ['test', 1], mode: 'inbox', scale: 1 });

  assert.ok(inbox.every((p) => p.clipped.length === 0));

  const d8 = design({ centre, perturb: ['VGT', 'GDX'], n: 32, labels: ['test', 2], mode: 'clip', scale: 1, matchCount: 8 });

  for (const point of d8) {
    let moved = 0;

    for (const symbol of ['VGT', 'GDX']) {
      for (const key of Object.keys(centre.VGT) as (keyof typeof centre.VGT)[]) {
        if (point.books[symbol]![key] !== centre[symbol as 'VGT' | 'GDX'][key]) moved++;
      }
    }

    assert.ok(moved <= 8, `count-matched point moved ${moved} coordinates`);
  }

  const norm = design({ centre, perturb: ['VGT', 'GDX'], n: 32, labels: ['test', 3], mode: 'clip', scale: Math.sqrt(8 / 16) });

  assert.ok(norm.every((p) => p.distance <= Math.sqrt(0.5) + 0.06));
});

test('violation is zero only when every constraint holds; strict DD ceiling', () => {
  const floors = floorsOf(4.548, 2017, 2021);
  const c: CentreView = {
    net: 120000, perYear: 120000 / 4.548, realized: 120000, unrealized: 0, dd: 20000, ddDaily: 18000, lots: 10, episodes: 4, lotYears: 4,
    bookLots: { VGT: 6, GDX: 4 }, bookNet: {}, heldDays: 300, perCapitalYear: 146000, top1Share: 0.2, bestYear: 60000, bestYearKey: '2020',
    bestYearShare: 0.5, exBestPerYear: 60000 / 3.548, refused: 0, signature: 'x'
  };
  const nb: NbView = {
    n: 128, share: 0.95, shareSe: 0.02, breaches: 6, p90Dd: 30000, medianDd: 22000, worstDd: 40000, medianNet: 90000, p10Net: 40000, p90Net: 130000,
    medianPerYear: 90000 / 4.548, p10PerYear: 40000 / 4.548, robustPerYear: 65000 / 4.548, profitable: 1, medianLots: 10
  };

  assert.equal(violationOf(c, nb, floors, ['VGT', 'GDX']).violation, 0);
  assert.ok(violationOf({ ...c, dd: 35000 }, nb, floors, ['VGT', 'GDX']).violation > 0, 'DD = $35,000 must violate (strict)');
  assert.ok(violationOf(c, { ...nb, p90Dd: 35000 }, floors, ['VGT', 'GDX']).violation > 0);
  assert.ok(violationOf(c, { ...nb, share: 0.89 }, floors, ['VGT', 'GDX']).violation > 0);
  assert.ok(violationOf({ ...c, bookLots: { VGT: 10, GDX: 0 } }, nb, floors, ['VGT', 'GDX']).violation > 0, 'inert member');
  assert.ok(violationOf({ ...c, bestYearShare: 0.8 }, nb, floors, ['VGT', 'GDX']).violation > 0);
  assert.ok(violationOf(c, { ...nb, p10Net: 0 }, floors, ['VGT', 'GDX']).violation > 0);
});

test('Wilson lower bound', () => {
  assert.ok(Math.abs(wilsonLower(0.9, 384) - 0.8717) < 0.002);
  assert.ok(wilsonLower(1, 128) < 1);
});

test('budgets follow §8.3', () => {
  assert.equal(budgetOf('VXRG').islands, 2);
  assert.equal(budgetOf('VXRG').newPerIsland, 1536);
  assert.equal(budgetOf('V', 'diagnostic').islands, 1);
  assert.equal(budgetOf('G').screen, 8192);
  assert.equal(budgetOf('VG').screen, 4096);
  assert.equal(budgetOf('VC').shortlist, 6);
  assert.deepEqual([...tracks.VC.books], ['VGT']);
});

test('GDX control IDs equal the recorded IDs', () => {
  for (const control of Object.values(gdxControls)) {
    if (control.id.startsWith('d1-')) assert.equal(vectorId(control.grid), control.id);
  }
});

test('unknown doors are refused', async () => {
  await assert.rejects(doorGate('nonsense'));
});
