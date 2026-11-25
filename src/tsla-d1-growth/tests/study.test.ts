// P6-TSLA unit tests (gate E7): the derived lane equals a fresh derivation; the TSLA space's arm invariants (cells,
// pins, round trips, the frozen D1 of arm S, neighbourhoods and moves stay in their cell); the arm fitness equals the
// pilot's for a both-families arm; the door guards; the budget bounds; the selection's finalists and refinement plan;
// the outcome's materiality rule. No market data is read (the external-control references come from Assignment 3's
// sealed FROZEN_SELECTION.json).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import { deriveSearchFromDisk, derivedSearchFile } from '../derive.ts';
import * as S from '../space.ts';
import { armPolicy, freezeFile } from '../context.ts';
import { armFunded, fitOfArm, plausibleArm, screenViolation, violationArm } from '../fitness.ts';
import { plausibleArm as pilotPlausible, screenViolation as pilotScreen, violationArm as pilotViolation } from '../../vg-l0-risk-envelope-pilot/fitness.ts';
import { doorGuard, frozenSelectionFile, fullAuthorizationFile, selectionFile, sequentialFile, sliceFile } from '../doors.ts';
import { islandCaps, laneCaps, nl0Caps, replicates, schedules } from '../budget.ts';
import { finalistsOfArm, refineCells } from '../select.ts';
import { materialType } from '../outcome.ts';
import { controlMembers, projectReference } from '../controls.ts';
import { verdictOfArm } from '../qualify.ts';
import type { Evidence } from '../qualify.ts';
import type { Rec } from '../../vg-d1-growth-joint/evaluate.ts';
import { Rng } from '../../optimizer/rng.ts';

describe('the derived lane (derive.ts)', () => {
  it('search.ts equals a fresh derivation from the lane Priority 5 ran', () => {
    assert.equal(fs.readFileSync(derivedSearchFile, 'utf8'), deriveSearchFromDisk());
  });
});

describe('the TSLA space (space.ts)', () => {
  it('has 8 D, 6 G and 48 J cells and a 75-gene genome', () => {
    assert.equal(S.cellsOfArm('D').length, 8);
    assert.equal(S.cellsOfArm('G').length, 6);
    assert.equal(S.cellsOfArm('J').length, 48);
    assert.equal(S.levelsOf('coarse').length, 75);
    assert.equal(S.levelsOf('fine').length, 75);
  });

  it('decodes into the lane cell, round-trips, keeps the disabled slot inert and the absent book off', () => {
    for (const arm of ['D', 'G', 'J'] as const)
      for (const cell of S.cellsOfArm(arm))
        for (const res of ['coarse', 'fine'] as const) {
          const gs = S.screenGenomes(6, res, 'test', cell.id).map((g, i) => S.pinStratum(g, cell, i, 6));

          for (const g of gs) {
            const c = S.decode(g, res, cell);

            assert.equal(c.cell, cell.id);
            assert.deepEqual(c.d1.GDX, S.inertD1);
            if (arm === 'D') assert.equal(S.gId(c.g), S.gId(S.growthOff));
            if (arm === 'G') assert.deepEqual(c.d1.VGT, S.inertD1);
            if (!(res === 'coarse' && c.g.trendMethod === 'momentum'))
              assert.equal(S.cfgId(S.decode(S.pinCell(S.encode(c, res), cell), res, cell)), S.cfgId(c));
            assert.equal(S.cfgId(S.canonicalCfg(JSON.parse(JSON.stringify(c)))), S.cfgId(c));
            for (const p of S.neighbourhood(c, { name: 't', n: 4, labels: ['t'] })) assert.equal(p.cfg.cell, cell.id);
            for (const m of S.movesOf(c)) assert.equal(m.cell, cell.id);
          }
        }
  });

  it('a mutated genome stays in its cell (free genes only)', () => {
    const rng = Rng.from('mutation-test');

    for (const cell of [...S.cellsOfArm('D'), ...S.cellsOfArm('G'), ...S.cellsOfArm('J').slice(0, 12)]) {
      const pinned = S.pinnedOfCell(cell);
      const lv = S.levelsOf('coarse');
      const g = S.pinStratum(S.screenGenomes(1, 'coarse', 'mut', cell.id)[0]!, cell, 0, 1);

      for (let i = 0; i < g.length; i++) if (!pinned.has(i)) g[i] = rng.int(lv[i]!);
      assert.equal(S.decode(S.pinCell(g, cell), 'coarse', cell).cell, cell.id);
    }
  });

  it('arm S: the frozen D1 never moves in designs or moves; the measurement neighbourhood perturbs it', () => {
    const d = S.cellOf('D.D1');
    const dc = S.decode(S.pinStratum(S.screenGenomes(1, 'coarse', 'frozen-test')[0]!, d, 0, 1), 'coarse', d);
    const f = S.frozenFrom('T9F1', 'test', dc);

    S.registerFrozen(f);
    for (const cell of S.sequentialCells('T9F1')) {
      const c = S.decode(S.pinStratum(S.screenGenomes(1, 'coarse', 'seq', cell.id)[0]!, cell, 0, 1), 'coarse', cell);

      assert.deepEqual(S.partsOf(c).d1, f.d1);
      assert.deepEqual(c.controls, dc.controls);
      for (const p of S.designNeighbourhood(c, { name: 'near', n: 8, labels: ['near'], scale: 1.5 })) assert.deepEqual(S.partsOf(p.cfg).d1, f.d1);
      for (const m of S.movesOf(c)) assert.deepEqual(S.partsOf(m).d1, f.d1);
      assert.ok(S.neighbourhood(c, { name: 'm', n: 16, labels: ['m'] }).some((p) => JSON.stringify(S.partsOf(p.cfg).d1) !== JSON.stringify(f.d1)));
    }
    assert.throws(() => S.registerFrozen({ ...f, d1: { ...f.d1, targetPercentChange: f.d1.targetPercentChange + 1 } }));
  });

  it('a pair (arm C) carries the D1 of one configuration and the Growth of another', () => {
    const d = S.decode(S.pinStratum(S.screenGenomes(1, 'coarse', 'pd')[0]!, S.cellOf('D.B1'), 0, 1), 'coarse', S.cellOf('D.B1'));
    const gc = S.cellOf('G.h1.s0');
    const g = S.decode(S.pinStratum(S.screenGenomes(1, 'coarse', 'pg')[0]!, gc, 0, 1), 'coarse', gc);
    const p = S.pairCfg(d, g);

    assert.equal(p.cell, 'C.B1.h1.s0');
    assert.deepEqual(S.partsOf(p).d1, S.partsOf(d).d1);
    assert.deepEqual(p.controls, d.controls);
    assert.equal(S.gId(p.g), S.gId(g.g));
  });

  it('the external controls are New L0’s and N/original’s TSLA-slot books, never seeds', () => {
    for (const arm of ['D', 'G', 'J'] as const) {
      const ms = controlMembers(arm);

      assert.equal(ms.length, 2);
      for (const m of ms) {
        assert.equal(m.stage, 'control');
        assert.equal(S.armOfCell(m.cfg.cell), arm);
      }
    }
    assert.equal(projectReference('NL0', 'J').cell, 'J.A0.h1.s1');
  });
});

// a synthetic record with given funded families (the fitness reads net, dd, error, lots, fam, mixed)
const rec = (net: number, dd: number, d1: number, g: number): Rec =>
  ({ net, dd, error: undefined, lots: d1 + g, mixed: d1 > 0 && g > 0, fam: { D1: { lots: d1 }, G: { lots: g } }, books: {} }) as unknown as Rec;

describe('the arm fitness (fitness.ts)', () => {
  it('equals the pilot’s under P0 for a both-families arm', () => {
    const a = armPolicy('J');

    for (const [net, dd, d1, g] of [
      [1000, 10000, 1, 1],
      [1000, 10000, 0, 1],
      [1000, 10000, 1, 0],
      [-5, 40000, 0, 0],
      [5000, 36000, 2, 3]
    ] as const) {
      const r = rec(net, dd, d1, g);

      assert.equal(plausibleArm(r, a), pilotPlausible(r, a));
      assert.equal(screenViolation(r, a), pilotScreen(r, a));
      assert.deepEqual(violationArm(r, null, null, a), pilotViolation(r, null, null, a));
    }
  });

  it('requires only the arm’s own family in the standalone arms', () => {
    assert.ok(plausibleArm(rec(1000, 1000, 1, 0), armPolicy('D')));
    assert.ok(!plausibleArm(rec(1000, 1000, 0, 1), armPolicy('D')));
    assert.ok(plausibleArm(rec(1000, 1000, 0, 1), armPolicy('G')));
    assert.ok(!plausibleArm(rec(1000, 1000, 1, 1), armPolicy('J')) === false);
    assert.equal(armFunded(rec(1, 1, 1, 0), armPolicy('J')), false);
    assert.equal(violationArm(rec(1000, 1000, 0, 0), null, null, armPolicy('D')).parts.structure, 0.5);
    assert.equal(violationArm(rec(1000, 1000, 0, 0), null, null, armPolicy('J')).parts.structure, 1);
    assert.equal(fitOfArm('r1', 'x', rec(1000, 1000, 1, 0) as never, null, null, armPolicy('D')).objectives[0], -1000);
  });
});

describe('the door guards (doors.ts)', () => {
  const st = (sealed: string[], committed = sealed, exists = sealed) => ({
    exists: (f: string) => exists.includes(f),
    sealed: (f: string) => sealed.includes(f),
    committed: (f: string) => committed.includes(f)
  });

  it('opens training doors only after the previous fold’s slice, D24 also after the sequential record', () => {
    assert.doesNotThrow(() => doorGuard('D19', 'training', 'x', st([])));
    assert.throws(() => doorGuard('D21', 'training', 'x', st([])));
    assert.doesNotThrow(() => doorGuard('D21', 'training', 'x', st([sliceFile('C19')])));
    assert.throws(() => doorGuard('D24', 'training', 'x', st([sliceFile('C23')])));
    assert.doesNotThrow(() => doorGuard('D24', 'training', 'x', st([sliceFile('C23'), sequentialFile])));
    assert.throws(() => doorGuard('FULL', 'training', 'x', st([])));
  });

  it('opens a slice door only after the committed selection, once', () => {
    assert.throws(() => doorGuard('D21', 'slice', 'x', st([])));
    assert.throws(() => doorGuard('D21', 'slice', 'x', st([selectionFile('C19')], [])));
    assert.doesNotThrow(() => doorGuard('D21', 'slice', 'x', st([selectionFile('C19')])));
    assert.throws(() => doorGuard('D21', 'slice', 'x', st([selectionFile('C19'), sliceFile('C19')])));
  });

  it('opens FULL for the validation only after the frozen selection and the authorization, once', () => {
    assert.throws(() => doorGuard('FULL', 'validation', 'x', st([selectionFile('C24'), frozenSelectionFile])));
    assert.doesNotThrow(() => doorGuard('FULL', 'validation', 'x', st([selectionFile('C24'), frozenSelectionFile, fullAuthorizationFile])));
    assert.throws(() => doorGuard('FULL', 'validation', 'x', st([selectionFile('C24'), frozenSelectionFile, fullAuthorizationFile, sliceFile('C24')])));
  });

  it('engineering reads FULL only for data integrity before the freeze; D21+ never after the freeze', () => {
    assert.doesNotThrow(() => doorGuard('FULL', 'engineering', 'data integrity: equality', st([])));
    assert.throws(() => doorGuard('FULL', 'engineering', 'pilot', st([])));
    assert.throws(() => doorGuard('D21', 'engineering', 'x', st([freezeFile], [freezeFile], [freezeFile])));
  });
});

describe('budgets (budget.ts)', () => {
  it('keeps NL0’s schedules with Priority 5’s island caps', () => {
    assert.equal(schedules.broad.islandsMax, islandCaps.broad);
    assert.equal(nl0Caps.broad, 6);
    assert.equal(nl0Caps.refine, 8);
    assert.equal(schedules.broad.screen, 512);
    assert.equal(schedules.refine.newPerIsland, 384);
    assert.ok(laneCaps.broad > 0 && laneCaps.refine > laneCaps.broad);
    assert.equal(replicates.base.S, replicates.sequentialBase);
  });
});

// synthetic evidence for the selection rules
const ev = (label: string, net: number, robust: number, p90: number, dd: number, sig: string, extra: Partial<Evidence> = {}): Evidence =>
  ({
    label,
    arm: 'D',
    stage: 'broad',
    cell: 'D.A0',
    qualified: true,
    replicate: 101,
    centre: { net, dd, signature: sig },
    select: { robust, p90Dd: p90 },
    confirm: { robust, p90Dd: p90 },
    risk: { conservativeNet: net, occupancy: 0.5 },
    ...extra
  }) as unknown as Evidence;

describe('selection (select.ts)', () => {
  it('finalists: primary, robust and balanced role holders with distinct ledgers', () => {
    // the balanced holder d (60 / 4,000) shares a's ledger: it is not carried (no fallback to the next balanced member)
    const f = finalistsOfArm([ev('a', 100, 50, 30000, 20000, 's1'), ev('b', 90, 80, 30000, 20000, 's2'), ev('c', 80, 70, 5000, 5000, 's3'), ev('d', 70, 60, 4000, 4000, 's1')], 3);

    assert.deepEqual(
      f.map((x) => x.label),
      ['a', 'b']
    );

    const g = finalistsOfArm([ev('a', 100, 50, 30000, 20000, 's1'), ev('b', 90, 80, 30000, 20000, 's2'), ev('c', 80, 70, 5000, 5000, 's3')], 3);

    assert.deepEqual(
      g.map((x) => x.label),
      ['a', 'b', 'c']
    );
  });

  it('the refinement plan takes every qualified cell when the quota allows', () => {
    const p = refineCells('D', [ev('a', 100, 50, 30000, 20000, 's1', { cell: 'D.A0' }), ev('b', 90, 80, 30000, 20000, 's2', { cell: 'D.B1' }), ev('c', 80, 70, 5000, 5000, 's3', { cell: 'D.C0', qualified: false })]);

    assert.deepEqual(p.cells.map((c) => c.cell).sort(), ['D.A0', 'D.B1']);
  });
});

describe('outcome (outcome.ts)', () => {
  it('material improvement types P and R with the bands', () => {
    const b = ev('b', 100_000, 50_000, 20_000, 15_000, 'x');

    assert.equal(materialType(ev('p', 110_000, 55_000, 22_500, 17_500, 'y'), b), 'P');
    assert.equal(materialType(ev('p2', 109_999, 55_000, 22_500, 17_500, 'y'), b), null);
    assert.equal(materialType(ev('r', 97_500, 47_500, 17_500, 17_500, 'y'), b), 'R');
    assert.equal(materialType(ev('u', 200_000, 100_000, 30_000, 15_000, 'y', { qualified: false }), b), null);
  });

  it('the arm Q6 replaces "both families funded" by the arm’s families', () => {
    const nb = { p90Dd: 1000, p10: 10, robust: 10, median: 10 } as never;
    const centre = rec(1000, 1000, 1, 0) as never;
    const s10 = rec(900, 1000, 1, 0) as never;

    assert.equal(verdictOfArm('D', centre, { nb, recs: [] }, s10, 10).gates.Q6, true);
    assert.equal(verdictOfArm('J', centre, { nb, recs: [] }, s10, 10).gates.Q6, false);
  });
});
