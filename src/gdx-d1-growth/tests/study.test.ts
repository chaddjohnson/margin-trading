// P8-GDX unit tests (gate E7): the derived lane equals a fresh derivation; the GDX space's arm invariants (cells,
// pins, round trips, the frozen D1 of arm S, neighbourhoods and moves stay in their cell); the arm fitness equals the
// pilot's for a both-families arm; the door guards; the budget bounds; the selection's finalists and refinement plan;
// the outcome's materiality rule and its fail-closed (population, id) identity join; the informed populations; the GDX
// incumbents (exact sources, cells, fine-grid round trips). No market data is read (the incumbents come from Assignment
// 3's and 4A's sealed FROZEN_SELECTION.json files).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import { deriveSearchFromDisk, derivedSearchFile } from '../derive.ts';
import * as S from '../space.ts';
import { armPolicy, freezeFile } from '../context.ts';
import { armFunded, fitOfArm, plausibleArm, screenViolation, violationArm } from '../fitness.ts';
import { plausibleArm as pilotPlausible, screenViolation as pilotScreen, violationArm as pilotViolation } from '../../vg-l0-risk-envelope-pilot/fitness.ts';
import { doorGuard, frozenSelectionFile, fullAuthorizationFile, selectionFile, sequentialFile, sliceFile } from '../doors.ts';
import { islandCaps, laneCaps, nl0Caps, schedules, sequentialReplicates } from '../budget.ts';
import { finalistsOfArm, populations, refineCells } from '../select.ts';
import { type GovernedFinalist, type ValidationRow, materialType, outcomeOf } from '../outcome.ts';
import { IdentityJoinError } from '../../research-outcome/identityJoin.ts';
import { controlMembers, d1Incumbent, gIncumbent, informedSeedsOf } from '../controls.ts';
import { verdictOfArm } from '../qualify.ts';
import type { Evidence } from '../qualify.ts';
import type { Rec } from '../../vg-d1-growth-joint/evaluate.ts';
import { Rng } from '../../optimizer/rng.ts';

describe('the derived lane (derive.ts)', () => {
  it('search.ts equals a fresh derivation from the lane Priority 5 ran', () => {
    assert.equal(fs.readFileSync(derivedSearchFile, 'utf8'), deriveSearchFromDisk());
  });
});

describe('the GDX space (space.ts)', () => {
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

  it('the GDX incumbents: 3 D1, 5 Growth and 5 joint controls in their exact cells, on the fine grid', () => {
    const n = { D: 3, G: 5, J: 5 } as const;

    for (const arm of ['D', 'G', 'J'] as const) {
      const ms = controlMembers(arm);

      assert.equal(ms.length, n[arm]);
      assert.equal(new Set(ms.map((m) => S.cfgId(m.cfg))).size, n[arm]);
      for (const m of ms) {
        assert.equal(m.stage, 'control');
        assert.equal(S.armOfCell(m.cfg.cell), arm);
        // an informed seed must be exactly representable on the fine grid (standard §4.4)
        assert.equal(S.cfgId(S.decode(S.pinCell(S.encode(m.cfg, 'fine'), S.cellOf(m.cfg.cell)), 'fine', S.cellOf(m.cfg.cell))), S.cfgId(m.cfg), `${m.label} is off the fine grid`);
        assert.equal(S.cfgId(S.canonicalCfg(JSON.parse(JSON.stringify(m.cfg)))), S.cfgId(m.cfg));
      }
    }
    assert.equal(d1Incumbent('NORIG').cell, 'D.D1');
    assert.equal(d1Incumbent('NL0').cell, 'D.A0');
    assert.equal(d1Incumbent('VG2').cell, 'D.A0');
    assert.deepEqual(
      (['G4A1', 'G4A2', 'P08', 'P09', 'APXA'] as const).map((k) => gIncumbent(k).cell),
      ['G.h1.s1', 'G.h2.s1', 'G.h2.s1', 'G.h1.s1', 'G.h0.s1']
    );
    assert.deepEqual(
      informedSeedsOf('D').map((c) => [c.cell, c.seeds.length]),
      [
        ['D.A0', 2],
        ['D.D1', 1]
      ]
    );
    assert.deepEqual(
      informedSeedsOf('G').map((c) => [c.cell, c.seeds.length]),
      [
        ['G.h0.s1', 1],
        ['G.h1.s1', 2],
        ['G.h2.s1', 2]
      ]
    );
    // N/original's GDX D1 book is carried unchanged: vector, RC 2 controls, the inert second slot, Growth off
    const no = d1Incumbent('NORIG');

    assert.deepEqual(no.d1.VGT, { targetPercentChange: 277, trailingBuyPercentage: 2, trailingStopPercentage: 61, maximumHoldDays: 13, tickWindowSize: 232, intradayLossBuffer: 24, pullback: 152, continuationWindow: 10 });
    assert.deepEqual(no.d1.GDX, S.inertD1);
    assert.equal(S.gId(no.g), S.gId(S.growthOff));
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
    assert.deepEqual([0, 1, 2, 3].map(sequentialReplicates), [0, 40, 20, 14]);
    assert.ok(laneCaps.refine >= 179000 - 50000);
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

describe('the informed populations (select.ts)', () => {
  it('D, G, C hold only the independent stages; D+, G+ add the informed lanes and the incumbents; C+ both pair sets', () => {
    const e = (arm: string, stage: string) => ev('x', 1, 1, 1, 1, 's', { arm, stage } as never);

    assert.ok(populations.D(e('D', 'broad')) && populations.D(e('D', 'refine')));
    assert.ok(!populations.D(e('D', 'informed')) && !populations.D(e('D', 'control')));
    assert.ok(populations['D+'](e('D', 'informed')) && populations['D+'](e('D', 'control')) && populations['D+'](e('D', 'broad')));
    assert.ok(!populations['D+'](e('G', 'informed')));
    assert.ok(populations.G(e('G', 'refine')) && !populations.G(e('G', 'informed')));
    assert.ok(populations['G+'](e('G', 'control')));
    assert.ok(populations.C(e('C', 'fixed')) && !populations.C(e('C', 'fixed-informed')));
    assert.ok(populations['C+'](e('C', 'fixed')) && populations['C+'](e('C', 'fixed-informed')));
    assert.ok(!populations['D-A'](ev('x', 1, 1, 1, 1, 's', { arm: 'D', stage: 'informed', d1Structure: 'A0' } as never)));
  });
});

// the outcome's identity join (brief Phase 0 item 4, Phase 7): stable (population, id), fail closed
const fin = (arm: string, id: string, extra: Partial<GovernedFinalist> = {}): GovernedFinalist =>
  ({
    label: `${arm}-member-${id}`,
    candidateLabel: `${arm}-member-${id}`,
    governanceLabel: 'development-qualified',
    id,
    arm,
    recordArm: arm.replace('+', ''),
    roles: [`primary ${arm}`],
    qualified: true,
    failed: [],
    centreNet: 1,
    centreDd: 1,
    confirmRobust: 1,
    confirmP90Dd: 1,
    selectRobust: 1,
    signature: 's',
    armName: arm,
    informed: arm.endsWith('+'),
    primary: true,
    chronology: 'x',
    chronologicallySupported: !arm.endsWith('+'),
    a: true,
    b: !arm.endsWith('+'),
    ...extra
  }) as GovernedFinalist;
const row = (arm: string, id: string, pops: string[], v = { V1: true, V2: true, V3: true }, extra: Partial<ValidationRow> = {}): ValidationRow =>
  ({ label: `${pops[0] ?? arm}-member-${id}`, id, arm, populations: pops, kind: 'selected', validation: v, ...extra }) as ValidationRow;

describe('the outcome identity join (outcome.ts)', () => {
  const pre = { finalists: [fin('D', 'a'), fin('D+', 'a'), fin('G', 'b')], comparisons: {} };
  const rows = [row('D', 'a', ['D', 'D+']), row('G', 'b', ['G'], { V1: false, V2: true, V3: true }), row('J', 'c', ['J-P'])];

  it('joins every finalist to its (population, id) row, whatever the labels and the order', () => {
    const o = outcomeOf(pre, rows);

    assert.deepEqual(
      o.finalists.map((f) => [f.arm, f.id, f.c]),
      [
        ['D', 'a', true],
        ['D+', 'a', true],
        ['G', 'b', false]
      ]
    );
    assert.deepEqual(o.candidates, [{ arm: 'D', label: 'D-member-a', id: 'a' }]);
    assert.deepEqual(o.informedDevelopmentOnly, [{ arm: 'D+', label: 'D+-member-a', id: 'a' }]);
    // reordered rows and changed display labels give the same determination (stable-ID replay)
    const relabelled = [...rows].reverse().map((r) => ({ ...r, label: `renamed ${r.label}` }));
    const o2 = outcomeOf(pre, relabelled);

    assert.deepEqual(
      o2.finalists.map((f) => [f.arm, f.id, f.c, f.candidate]),
      o.finalists.map((f) => [f.arm, f.id, f.c, f.candidate])
    );
    assert.equal(o2.outcome.replaceAll('renamed ', ''), o.outcome.replace(/D-member-a/g, 'D-member-a'));
  });

  it('fails closed on a missing, duplicate, cross-population, malformed or conflicting record', () => {
    assert.throws(() => outcomeOf(pre, [rows[0]!]), IdentityJoinError); // G's row missing
    assert.throws(() => outcomeOf(pre, [...rows, row('D', 'a', ['D'])]), IdentityJoinError); // duplicate (D, a)
    assert.throws(() => outcomeOf(pre, [row('D', 'a', ['D']), rows[1]!]), IdentityJoinError); // D+ only under D: cross-population
    assert.throws(() => outcomeOf(pre, [rows[0]!, row('G', 'b', ['G'], { V1: true } as never)]), IdentityJoinError); // malformed V1–V3
    assert.throws(() => outcomeOf(pre, [rows[0]!, row('C', 'b', ['G'])]), IdentityJoinError); // record arm conflict
    assert.throws(() => outcomeOf(pre, [rows[0]!, { ...rows[1]!, populations: [] }]), IdentityJoinError); // a selected row without a population
    assert.throws(() => outcomeOf(pre, [rows[0]!, { ...rows[1]!, label: '' }]), IdentityJoinError); // no candidate label
    // a control row never matches a finalist, even with the same id
    assert.throws(() => outcomeOf(pre, [rows[0]!, { ...rows[1]!, kind: 'control' }]), IdentityJoinError);
  });

  it('there is no validation: null path', () => {
    for (const f of outcomeOf(pre, rows).finalists) assert.notEqual(f.validation, null);
  });
});


describe('the informed stages (stages.ts)', async () => {
  const st = await import('../stages.ts');

  it('informed lanes: C24 only, arms D and G, every incumbent cell × 6 replicates of the refinement schedule, every seed a focus seed', () => {
    const d = st.partSpecs('C24', 'D', 'informed');
    const g = st.partSpecs('C24', 'G', 'informed');

    assert.equal(d.kind, 'refine');
    assert.equal(d.specs.length, 12);
    assert.equal(g.specs.length, 18);
    assert.deepEqual([...new Set(d.specs.map((x) => x.cell!.id))], ['D.A0', 'D.D1']);
    assert.deepEqual([...new Set(g.specs.map((x) => x.cell!.id))], ['G.h0.s1', 'G.h1.s1', 'G.h2.s1']);
    for (const x of [...d.specs, ...g.specs]) {
      assert.equal(x.stage, 'informed');
      assert.equal(x.kind, 'refine');
      assert.equal(x.res, 'fine');
      assert.match(x.key, /^C24\/[DG]\/informed\/[DG]\.[^/]+\/R10[1-6]$/);
      assert.ok(x.seeds!.length >= 1 && x.seeds!.length <= 2 && x.seeds!.every((s) => s.focus && s.cfg.cell === x.cell!.id));
    }
    assert.deepEqual(d.specs.filter((x) => x.cell!.id === 'D.D1')[0]!.seeds!.map((s) => s.label), ['control: N/original GDX D1 (ablation)']);
    assert.throws(() => st.partSpecs('C21', 'D', 'informed'));
    assert.throws(() => st.partSpecs('C24', 'J', 'informed'));
    assert.throws(() => st.partSpecs('C24', 'S', 'informed'));
  });

  it('the qualification stages and populations of an arm: informed only at C24 (D, G: informed lanes; C: informed pairs)', () => {
    assert.deepEqual(st.qStagesOfArm('D', 'C24'), ['broad', 'refine', 'informed']);
    assert.deepEqual(st.qStagesOfArm('G', 'C24'), ['broad', 'refine', 'informed']);
    assert.deepEqual(st.qStagesOfArm('C', 'C24'), ['fixed', 'fixed-informed']);
    assert.deepEqual(st.qStagesOfArm('J', 'C24'), ['broad', 'refine']);
    assert.deepEqual(st.qStagesOfArm('D', 'C21'), ['broad', 'refine']);
    assert.deepEqual(st.qStagesOfArm('C', 'C19'), ['fixed']);
    assert.deepEqual(st.populationsOfArm('C24', 'D'), ['D', 'D-A', 'D+']);
    assert.deepEqual(st.populationsOfArm('C24', 'G'), ['G', 'G-P', 'G-U', 'G+']);
    assert.deepEqual(st.populationsOfArm('C24', 'C'), ['C', 'C+']);
    assert.deepEqual(st.populationsOfArm('C24', 'J'), ['J', 'J-P', 'J-U']);
    assert.deepEqual(st.populationsOfArm('C23', 'D'), ['D', 'D-A']);
  });
});
