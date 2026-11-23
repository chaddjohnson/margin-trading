// Priority 4's study wiring (no evaluation): the budget (the CTRL lane bound IS Assignment 3's / Stage B's; EXP's adds its
// move bound), the precommitted statistics and the outcome label's order, the union's OFF projections, the ablation grid
// (invalid points named, never repaired), the informed lanes' free genes, the lane keys (CTRL R3–R18 = Stage B's), and
// the door guards on a synthetic record state.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { laneWorstCase, perLaneCap } from '../../vg-l0-full-joint/budgets.ts';
import { benchmarks } from '../../vg-l0-risk-envelope-pilot/stages.ts';
import { researchSpecs as stageBSpecs } from '../../vg-l0-risk-envelope-stage-b/stages.ts';
import { freezeFile } from '../context.ts';
import {
  HARD_CEILING,
  broadSchedule,
  consistency,
  extendedSchedule,
  laneCaps,
  laneWorst,
  perMember,
  perSubject,
  stresses
} from '../budget.ts';
import {
  chronologicalVerdict,
  margins,
  mechanismOf,
  outcomeLabel,
  pairsOf,
  primaryOf,
  riskOf,
  summarize
} from '../stats.ts';
import {
  ablationFile,
  type DoorState,
  doorGuard,
  frozenSelectionFile,
  fullAuthorizationFile,
  intervalFile,
  searchFile,
  selectionFile
} from '../doors.ts';
import {
  ablationPoints,
  informedFree,
  informedPlan,
  informedSpecOf,
  projectionsOf,
  researchSpecs,
  searchPlan
} from '../stages.ts';
import { EXP_GENES, actGeneOf, ctrlSpace, expSpace, stagedOf, switchGene, t2GeneOf, withStaged } from '../space.ts';

describe('budget', () => {
  it('the CTRL lane bound is Assignment 3’s worst case and Stage B’s 41,000 cap; EXP adds only its move bound', () => {
    assert.deepEqual(consistency(), { ctrlWorstIsA3: true, ctrlCapIsStageB: true });
    assert.equal(laneCaps.broad.CTRL, perLaneCap.broad);
    assert.equal(laneWorst(broadSchedule, 0, 0, ctrlSpace.maxMoves), laneWorstCase(broadSchedule, 0, 0));
    assert.equal(expSpace.maxMoves - ctrlSpace.maxMoves, 27);
    assert.ok(laneCaps.broad.EXP > laneCaps.broad.CTRL);
    assert.equal(extendedSchedule.islandsMax, 9);
    assert.ok(laneCaps.extended.EXP > laneCaps.broad.EXP);
    assert.equal(HARD_CEILING, 25_000_000);
  });
  it('qualification and interval instruments: Assignment 3’s plus the report-only stop slippage +10 bps stress', () => {
    assert.equal(Object.keys(stresses).length, 7);
    assert.deepEqual(stresses['stop slippage +10 bps'], { stopSlippageBps: 10 });
    assert.equal(perMember(), 654);
    assert.equal(perSubject(), 265);
  });
});

describe('statistics (PROTOCOL.md §1)', () => {
  const cells = ['GA0.VA0', 'GB0.VD1'];
  const lanes = (f: (c: string, r: number) => number) =>
    cells.flatMap((c) => Array.from({ length: 32 }, (_v, i) => ({ cell: c, replicate: i + 3, value: f(c, i + 3) })));

  it('pairs by (cell, replicate) and refuses unpaired lanes', () => {
    const ctrl = lanes(() => 100_000);
    const exp = lanes((_c, r) => 100_000 + r * 1000);
    const ps = pairsOf('C21', ctrl, exp);

    assert.equal(ps.length, 64);
    assert.equal(ps[0]!.d, 3000);
    assert.throws(() => pairsOf('C21', ctrl, exp.slice(1)), /not paired/);
  });
  it('material improvement needs mean ≥ $10,000 and L90 > 0; harmful needs U90 < 0', () => {
    const big = pairsOf(
      'C21',
      lanes(() => 0),
      lanes(() => 12_000)
    );
    const small = pairsOf(
      'C21',
      lanes(() => 0),
      lanes(() => 9_999)
    );
    const neg = pairsOf(
      'C21',
      lanes(() => 10_000),
      lanes(() => 0)
    );

    assert.equal(primaryOf('C21', big).material, true);
    assert.equal(primaryOf('C21', small).material, false);
    assert.equal(primaryOf('C21', neg).harmful, true);
    assert.equal(primaryOf('C21', big).harmful, false);
  });
  it('the bootstrap is deterministic and stratified', () => {
    const rows = cells.flatMap((c) =>
      Array.from({ length: 32 }, (_v, i) => ({ cell: c, d: (c === cells[0] ? 1 : -1) * (i * 1000) }))
    );
    const a = summarize(rows, ['test'], 2000);
    const b = summarize(rows, ['test'], 2000);

    assert.deepEqual(a, b);
    assert.ok(a.l90 <= a.mean && a.mean <= a.u90);
    assert.equal(a.perCell[cells[0]!]!.n, 32);
  });
  it('risk non-inferiority uses U90 < margin; clearly worse uses L90 > margin', () => {
    const r = (dd: number) => ({ centreDd: dd, confirmP90Dd: dd, breachShare: 0, principalLossLiq: 0, bankedDdLiq: 0 });
    const same = riskOf(
      'C21',
      cells.flatMap((c) => Array.from({ length: 32 }, () => ({ cell: c, ctrl: r(20_000), exp: r(20_000) })))
    );
    const worse = riskOf(
      'C21',
      cells.flatMap((c) => Array.from({ length: 32 }, () => ({ cell: c, ctrl: r(20_000), exp: r(24_000) })))
    );

    assert.equal(same.nonInferior, true);
    assert.equal(same.clearlyWorse, false);
    assert.equal(worse.nonInferior, false);
    assert.equal(worse.clearlyWorse, true);
    assert.equal(margins.riskDollar, 2500);
    assert.equal(margins.riskBreachShare, 0.02);
  });
  it('mechanism: ≥ 50 % ON and a positive advantage over the all-OFF projections', () => {
    const on = mechanismOf(
      'C21',
      Array.from({ length: 10 }, (_v, i) => ({ lane: `l${i}`, on: i < 6, advantage: i < 6 ? 5_000 + i : null }))
    );
    const few = mechanismOf(
      'C21',
      Array.from({ length: 10 }, (_v, i) => ({ lane: `l${i}`, on: i < 4, advantage: i < 4 ? 5_000 : null }))
    );

    assert.equal(on.confirmed, true);
    assert.equal(few.usesS1, false);
    assert.equal(few.confirmed, false);
  });
  it('the outcome label follows the precommitted order', () => {
    const P = (material: boolean, harmful = false) => ({ material, harmful }) as never;
    const K = (nonInferior: boolean, clearlyWorse = false) => ({ nonInferior, clearlyWorse }) as never;
    const M = (confirmed: boolean) => ({ confirmed }) as never;
    const base = { budgetBound: false, expChronologicallySupported: true };

    assert.equal(
      outcomeLabel({
        ...base,
        primary: { C21: P(true), C24: P(true, true) },
        risk: { C21: K(true), C24: K(true) },
        mechanism: { C21: M(true), C24: M(true) }
      }).label,
      'harmful'
    );
    assert.equal(
      outcomeLabel({
        ...base,
        primary: { C21: P(true), C24: P(true) },
        risk: { C21: K(true), C24: K(false, true) },
        mechanism: { C21: M(true), C24: M(true) }
      }).label,
      'harmful'
    );
    assert.equal(
      outcomeLabel({
        ...base,
        budgetBound: true,
        primary: { C21: P(true), C24: P(true) },
        risk: { C21: K(true), C24: K(true) },
        mechanism: { C21: M(true), C24: M(true) }
      }).label,
      'inconclusive'
    );
    assert.equal(
      outcomeLabel({
        ...base,
        primary: { C21: P(true), C24: P(true) },
        risk: { C21: K(true), C24: K(true) },
        mechanism: { C21: M(true), C24: M(false) }
      }).label,
      'search-path effect'
    );
    assert.equal(
      outcomeLabel({
        ...base,
        primary: { C21: P(true), C24: P(true) },
        risk: { C21: K(true), C24: K(true) },
        mechanism: { C21: M(true), C24: M(true) }
      }).label,
      'beneficial'
    );
    assert.equal(
      outcomeLabel({
        ...base,
        expChronologicallySupported: false,
        primary: { C21: P(true), C24: P(true) },
        risk: { C21: K(true), C24: K(true) },
        mechanism: { C21: M(true), C24: M(true) }
      }).label,
      'trade-off'
    );
    assert.equal(
      outcomeLabel({
        ...base,
        primary: { C21: P(true), C24: P(true) },
        risk: { C21: K(false), C24: K(true) },
        mechanism: { C21: M(true), C24: M(true) }
      }).label,
      'trade-off'
    );
    assert.equal(
      outcomeLabel({
        ...base,
        primary: { C21: P(true), C24: P(false) },
        risk: { C21: K(true), C24: K(true) },
        mechanism: { C21: M(true), C24: M(true) }
      }).label,
      'inconclusive'
    );
    assert.equal(
      outcomeLabel({
        ...base,
        primary: { C21: P(false), C24: P(false) },
        risk: { C21: K(true), C24: K(true) },
        mechanism: { C21: M(false), C24: M(false) }
      }).label,
      'no material difference'
    );
  });
  it('the chronological verdict needs three primaries, a positive sequential net and every interval DD ≤ $35,000', () => {
    const f = (net: number, dd: number) =>
      ['C19', 'C21', 'C24'].map((c) => ({ cutoff: c, primary: true, intervalNet: net, intervalDd: dd }));

    assert.equal(chronologicalVerdict(f(1, 35_000)).supported, true);
    assert.equal(chronologicalVerdict(f(1, 35_000.01)).supported, false);
    assert.equal(chronologicalVerdict(f(-1, 10_000)).supported, false);
    assert.equal(
      chronologicalVerdict([
        { cutoff: 'C19', primary: false, intervalNet: null, intervalDd: null },
        ...f(1, 1).slice(1)
      ]).supported,
      false
    );
  });
});

describe('stages wiring', () => {
  const nl0 = benchmarks()[0]!.cfg;
  const on = (books: string[]) =>
    withStaged(nl0, {
      version: 1,
      books: Object.fromEntries(books.map((b) => [b, { activationTenths: 300, stage2Tenths: 30 }]))
    } as never);

  it('OFF projections: one book → all OFF; two → each alone + all OFF; three → 3 + all OFF', () => {
    assert.equal(projectionsOf(nl0).length, 0);
    assert.deepEqual(
      projectionsOf(on(['D1:GDX'])).map((p) => [p.tag, stagedOf(p.cfg)]),
      [['all OFF', null]]
    );
    assert.equal(projectionsOf(on(['D1:GDX', 'G:VGT'])).length, 3);

    const three = projectionsOf(on(['D1:GDX', 'D1:VGT', 'G:VGT']));

    assert.equal(three.length, 4);
    assert.equal(three.filter((p) => stagedOf(p.cfg) === null).length, 1);
    assert.equal(expSpace.cfgId(three.at(-1)!.cfg), expSpace.cfgId(nl0));
  });
  it('the ablation grid: 160 points; invalid points are named (A 7.5 % on D1·VGT is below the no-early-lock minimum), never repaired', () => {
    const pts = ablationPoints();

    assert.equal(pts.length, 160);

    const invalid = pts.filter((p) => p.errors.length);

    assert.equal(invalid.length, 16);
    assert.ok(invalid.every((p) => p.activationTenths === 75 && p.books.includes('D1:VGT')));
    assert.ok(invalid.every((p) => p.staged === null));
    assert.equal(pts.filter((p) => p.duplicateOf).length, 0);
  });
  it('lanes: 128 per cutoff, CTRL and EXP share their seed keys; R3–R18 are Stage B’s lane keys', () => {
    for (const cut of ['C19', 'C21', 'C24'] as const) {
      const plan = searchPlan(cut);

      assert.equal(plan.length, 128);
      assert.equal(new Set(plan.map((p) => p.spec.seedKey)).size, 64);

      const sb = new Set(stageBSpecs(cut).map((s) => JSON.stringify(s)));

      assert.equal(researchSpecs(cut).filter((s) => sb.has(JSON.stringify(s))).length, 32);
    }
  });
  it('informed lanes: I1/I2 free only the 9 staged genes (CTRL is the incumbent); I3/I4 add the exit (and RC) genes in both arms', () => {
    const staged = [0, 1, 2].flatMap((j) => [switchGene(j), actGeneOf(j), t2GeneOf(j)]).sort((a, b) => a - b);

    assert.deepEqual(informedFree('I1', 'EXP'), staged);
    assert.equal(informedFree('I1', 'CTRL'), null);
    assert.equal(informedFree('I2', 'CTRL'), null);
    assert.equal(informedFree('I3', 'CTRL')!.length, 10);
    assert.equal(informedFree('I3', 'EXP')!.length, 19);
    assert.equal(informedFree('I4', 'CTRL')!.length, 22);
    assert.equal(informedFree('I4', 'EXP')!.length, 31);
    assert.ok(informedFree('I4', 'EXP')!.every((i) => i >= 0 && i < EXP_GENES));
    assert.equal(informedPlan().length, 6 * 8);
    assert.equal(informedSpecOf('I2', 3).seeds![0]!.label, 'benchmark: N/original');
    assert.equal(informedSpecOf('I2', 3).key, 'C24/informed/I2/R3');
  });
});

describe('door guards (synthetic state)', () => {
  const state = (sealed: string[], uncommitted: string[] = []): DoorState => ({
    exists: (f) => sealed.includes(f),
    sealed: (f) => sealed.includes(f),
    committed: (f) => sealed.includes(f) && !uncommitted.includes(f)
  });
  const ok = (f: () => void) => assert.doesNotThrow(f);
  const no = (f: () => void, re: RegExp = /./) => assert.throws(f, re);

  it('engineering only before the freeze, on D19 / D21 / D24', () => {
    ok(() => doorGuard('D24', 'engineering', 'p', state([])));
    no(() => doorGuard('D23', 'engineering', 'p', state([])));
    no(() => doorGuard('D19', 'engineering', 'p', state([freezeFile])), /before the freeze/);
  });
  it('the ablations read D24 after the committed freeze and before any search', () => {
    no(() => doorGuard('D24', 'ablation', 'p', state([])), /not sealed/);
    ok(() => doorGuard('D24', 'ablation', 'p', state([freezeFile])));
    no(() => doorGuard('D21', 'ablation', 'p', state([freezeFile])));
    no(() => doorGuard('D24', 'ablation', 'p', state([freezeFile, searchFile('C19')])), /search has started/);
    assert.ok(ablationFile.endsWith('ablation/ablation.json'));
  });
  it('training doors follow the fold order behind the freeze', () => {
    no(() => doorGuard('D19', 'training', 'p', state([])), /not sealed/);
    ok(() => doorGuard('D19', 'training', 'p', state([freezeFile])));
    no(() => doorGuard('D21', 'training', 'p', state([freezeFile])), /C19/);
    ok(() => doorGuard('D21', 'training', 'p', state([freezeFile, intervalFile('C19')])));
    no(() => doorGuard('D24', 'training', 'p', state([freezeFile, intervalFile('C19')])), /C21/);
    no(
      () => doorGuard('D24', 'training', 'p', state([freezeFile, intervalFile('C21')], [intervalFile('C21')])),
      /not committed/
    );
  });
  it('intervals behind their sealed, committed selection; FULL once behind the frozen selection and the authorization', () => {
    no(() => doorGuard('D21', 'interval', 'p', state([])), /C19/);
    ok(() => doorGuard('D21', 'interval', 'p', state([selectionFile('C19')])));
    ok(() => doorGuard('D23', 'interval', 'p', state([selectionFile('C21')])));
    const all = [selectionFile('C24'), frozenSelectionFile, fullAuthorizationFile];

    no(() => doorGuard('FULL', 'validation', 'p', state([selectionFile('C24')])));
    ok(() => doorGuard('FULL', 'validation', 'p', state(all)));
    no(() => doorGuard('FULL', 'validation', 'p', state([...all, intervalFile('C24')])), /once/);
    no(() => doorGuard('FULL', 'diagnostic', 'p', state(all)));
    ok(() => doorGuard('FULL', 'diagnostic', 'p', state([...all, intervalFile('C24')])));
  });
});

describe('the derived lane', () => {
  it('search.ts is exactly the declared mechanical derivation of Stage B’s (the pilot’s) lane, after the repository formatter', async () => {
    const fs = await import('node:fs');
    const prettier = await import('prettier');
    const { deriveSearchFromDisk, derivedSearchFile } = await import('../derive.ts');
    const cfg = await prettier.resolveConfig(derivedSearchFile);
    const formatted = await prettier.format(deriveSearchFromDisk(), { ...cfg, filepath: derivedSearchFile });

    assert.equal(fs.readFileSync(derivedSearchFile, 'utf8'), formatted);
  });
});
