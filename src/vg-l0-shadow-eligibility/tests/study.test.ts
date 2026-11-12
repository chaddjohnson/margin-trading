// This study's own logic (PROTOCOL.md §4–§11): the toggle genome and identities (all-OFF configurations keep 5B's
// identities), the screen strata (every combination of a lane's free toggles equally often), the pinned toggles and
// inclusions of each track's steps, the refinement's toggle switches, the lanes and replicate counts of every track,
// the D1-finalist rule, the frozen comparison labels, the toggle × phenotype decomposition and the 2³ factorial, the
// budgets against NL0's per-lane contract, and the evaluation keys.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { budgets as p5bBudgets } from '../../vg-lifecycle-matched-optimization/budgets.ts';
import { budgets, perLaneCap } from '../budgets.ts';
import {
  type Cfg,
  canonicalOf,
  cells,
  cfgId,
  decode,
  encode,
  freeShOf,
  movesOf,
  pinCell,
  pinStratum,
  screenGenomes,
  strataOf,
  withSh
} from '../config.ts';
import { controlOf, informedD1Seeds, informedGrowthSeeds, informedSeeds, loadControls, nl0Key } from '../controls.ts';
import { allSh, offSh, togglesOf, shOf } from '../evaluate.ts';
import { chronSign, comparisonLabel, decompose, devSign, factorial, labelOf, replicationNeeded } from '../labels.ts';
import { finalistsFrom } from '../folds.ts';
import { cutoffs, lanesFor, studyEnv, studyReplicates } from '../stages.ts';
import type { Evidence, Roles } from '../qualify.ts';

const pe = (net: number, o: Partial<{ dd: number; p10: number; p90: number }> = {}) => ({
  net,
  dd: o.dd ?? 20000,
  confirmP10: o.p10 ?? 200000,
  confirmP90Dd: o.p90 ?? 28000
});
const sup = (net: number) => ({ verdict: 'supported' as const, net, dd: 20000 });
const uns = (net: number) => ({ verdict: 'unsupported' as const, net, dd: 60000 });

describe('the toggles in the configuration space', () => {
  test('all-OFF configurations keep their 5B identities; toggles create new ones', () => {
    const nl0 = controlOf('NL0').cfg;

    assert.equal(nl0.sh, '000');
    assert.equal(cfgId(nl0), '67cfdd9b62d1e16f');
    assert.equal(new Set(allSh.map((sh) => cfgId(withSh(nl0, sh)))).size, 8);
    for (const sh of allSh) assert.equal(controlOf(nl0Key(sh)).cfg.sh, sh);
  });

  test('the genome round-trips the toggles; a disabled Growth book’s toggle is inert in D', () => {
    const nl0 = controlOf('NL0').cfg;

    for (const sh of allSh) assert.equal(decode(encode(withSh(nl0, sh), 'fine'), 'fine').sh, sh);

    const d = canonicalOf('D', nl0.quad, '111');

    assert.equal(d.sh, '110');
    assert.equal(cfgId(canonicalOf('D', nl0.quad, '110')), cfgId(d));
    assert.equal(shOf(togglesOf('101')), '101');
  });

  test('the screen strata give every combination of a lane’s free toggles the same share', () => {
    const lanes = {
      joint: { inc: 'V' as const, sub: 'V1' as const },
      d1: { inc: 'D' as const, sub: 'V1' as const, shFree: [true, true, false] as const, shFixed: '000' },
      g: { inc: 'V' as const, sub: 'V1' as const, shFree: [false, false, true] as const, shFixed: '100' }
    };

    for (const [name, cell] of Object.entries(lanes)) {
      const n = 512;
      const counts = new Map<string, number>();

      for (const [i, g] of screenGenomes(n, 'coarse', 'test', name).entries()) {
        const c = decode(pinStratum(g, cell, i), 'coarse');

        counts.set(c.sh, (counts.get(c.sh) ?? 0) + 1);
      }

      const want = name === 'joint' ? 8 : name === 'd1' ? 4 : 2;

      assert.equal(counts.size, want, `${name}: ${[...counts.keys()]}`);
      for (const v of counts.values()) assert.equal(v, n / want, `${name} balanced`);
      if (name === 'g') for (const sh of counts.keys()) assert.equal(sh.slice(0, 2), '10', 'the fixed D1 toggles');
      assert.equal(strataOf(cell).shCount, want);
    }
  });

  test('pinCell keeps the fixed toggles and the inclusion', () => {
    const cell = { inc: 'V' as const, shFree: [false, false, true] as const, shFixed: '010' };
    const g = screenGenomes(1, 'coarse', 'test', 'pin')[0]!;

    assert.equal(decode(pinCell(g, cell), 'coarse').sh.slice(0, 2), '01');
    assert.deepEqual(freeShOf({ inc: 'D' }), [true, true, false]);
  });

  test('refinement switches each free toggle once (both directions) and never another', () => {
    const nl0 = controlOf('NL0').cfg;
    const moves = movesOf(withSh(nl0, '100'), { d1: false, g: false, inc: false, sh: [true, true, true] });

    assert.deepEqual(moves.map((m) => m.sh).sort(), ['000', '101', '110']);
    assert.deepEqual(
      movesOf(nl0, { d1: false, g: false, inc: false, sh: [false, false, true] }).map((m) => m.sh),
      ['001']
    );
  });
});

describe('the tracks and their lanes', () => {
  const env = studyEnv(14);

  test('B1: 32 replicates × 3 sub-cells, V, every toggle free; A1: 28 informed lanes with the toggle-expanded seeds', () => {
    const b1 = lanesFor(cutoffs.C19!, 'B1', 'joint', env);

    assert.equal(b1.length, 32 * 3);
    assert.ok(b1.every((l) => l.cell.inc === 'V' && !l.cell.shFree && l.kind === 'indep' && l.res === 'coarse'));
    assert.equal(new Set(b1.map((l) => l.seedKey)).size, b1.length);

    const a1 = lanesFor(cutoffs.C24!, 'A1', 'joint', env);

    assert.equal(a1.length, 28);
    assert.ok(a1.every((l) => l.kind === 'informed' && l.res === 'fine' && l.seeds!.length === 7));
    assert.throws(() => lanesFor(cutoffs.C19!, 'A1', 'joint', env), /final cutoff/);
  });

  test('sequential first steps search the D1 pair alone with the two D1 toggles', () => {
    const b2 = lanesFor(cutoffs.C21!, 'B2', 'd1', env);
    const a2 = lanesFor(cutoffs.C24!, 'A2', 'd1', env);

    assert.equal(b2.length, 16 * 3);
    assert.equal(a2.length, 14);
    for (const l of [...b2, ...a2]) {
      assert.equal(l.cell.inc, 'D');
      assert.deepEqual(l.cell.shFree, [true, true, false]);
    }
    assert.equal(informedD1Seeds().length, 5);
    assert.ok(informedD1Seeds().every((s) => s.cfg.inc === 'D'));
  });

  test('the informed Growth seeds sit on a frozen D1 finalist with its D1 toggles', () => {
    const fin = withSh(canonicalOf('D', controlOf('C4').cfg.quad), '110');
    const seeds = informedGrowthSeeds(fin);

    assert.equal(seeds.length, 7);
    for (const s of seeds) {
      assert.equal(s.cfg.inc, 'V');
      assert.equal(s.cfg.sh, '110');
      assert.deepEqual(s.cfg.quad.d1, fin.quad.d1);
    }
    assert.equal(informedSeeds().length, 7);
  });

  test('replicates: the sequential steps split their track’s lanes; comparable tracks get comparable caps', () => {
    assert.equal(studyReplicates['B2-d1']! + 2 * studyReplicates['B2-g']!, studyReplicates.B1);
    assert.equal(studyReplicates['A2-d1']! + 2 * studyReplicates['A2-g']!, studyReplicates.A1);
    // NL0's per-lane contract: 415,000 per 18 independent lanes, 370,000 per 6 informed lanes
    assert.equal(perLaneCap.indep, 23056);
    assert.equal(perLaneCap.informed, 61667);
    // the schedules are NL0's (5B's V, G, B and informed schedules)
    for (const [mine, theirs] of [
      ['indep-V1', 'indep-V'],
      ['indep-V2', 'indep-G'],
      ['indep-V3', 'indep-B'],
      ['informed', 'informed']
    ] as const) {
      const { ...a } = budgets.study[mine];
      const { ...b } = p5bBudgets.study[theirs];

      assert.deepEqual(a, b, `${mine} = 5B's ${theirs}`);
    }
  });
});

describe('the D1-finalist rule', () => {
  const nl0 = controlOf('NL0').cfg;
  const ev = (label: string, cfg: Cfg) => ({ label, id: cfgId(cfg), cfg }) as unknown as Evidence;
  const roles = (a: string, r: string, ranked: string[]): Roles => ({
    set: 't',
    members: 3,
    qualified: 3,
    ranked: ranked.map((label, i) => ({ rank: i + 1, label, id: '', inc: 'D', sh: '000', net: 0, robust: 0, p90: 0 })),
    roles: { 'actual-profit': a, 'robust-profit': r, balanced: null, 'lower-drawdown': null },
    pareto: [],
    reason: ''
  });

  test('actual-profit and robust-profit holders; the next distinct member when one member holds both', () => {
    const x = canonicalOf('D', nl0.quad, '000');
    const y = canonicalOf('D', nl0.quad, '100'); // other toggles: L∞ 1
    // a D1 pair far from New L0's (VG #2's own pair lies within L∞ 0.10 of it)
    const q = controlOf('C4').cfg.quad;
    const z = canonicalOf('D', { ...q, d1: { ...q.d1, VGT: { ...q.d1.VGT, continuationWindow: 190 } } }, '000');
    const e = [ev('x', x), ev('y', y), ev('z', z)];

    assert.deepEqual(
      finalistsFrom(roles('x', 'z', ['x', 'y', 'z']), e).map((f) => [f.label, f.role]),
      [
        ['x', 'actual-profit'],
        ['z', 'robust-profit']
      ]
    );
    assert.deepEqual(
      finalistsFrom(roles('x', 'x', ['x', 'y', 'z']), e).map((f) => f.label),
      ['x', 'y']
    );
    assert.deepEqual(
      finalistsFrom(
        {
          ...roles('x', 'x', []),
          roles: { 'actual-profit': null, 'robust-profit': null, balanced: null, 'lower-drawdown': null }
        },
        e
      ),
      []
    );
  });
});

describe('the frozen comparison labels and decompositions', () => {
  test('replication needs two thirds of the track’s replicates', () => {
    assert.equal(replicationNeeded(6), 4);
    assert.equal(replicationNeeded(32), 22);
    assert.equal(replicationNeeded(28), 19);

    const reps = Array.from({ length: 28 }, (_v, i) => (i < 19 ? 390000 : 380000));

    assert.equal(devSign(pe(395000), pe(382721.46), reps), '+');
    assert.equal(
      devSign(
        pe(395000),
        pe(382721.46),
        reps.map((v, i) => (i === 0 ? 380000 : v))
      ),
      'mixed'
    );
  });

  test('chronology: a failed path is never positive evidence', () => {
    assert.equal(chronSign(uns(90000), uns(-29358.01)), '0');
    assert.equal(chronSign(sup(10000), uns(-29358.01)), '+');
    assert.equal(labelOf('+', '+', 'same'), 'repeatable improvement');
    assert.equal(
      comparisonLabel(pe(395000), pe(382721.46)).qualifier,
      'development improvement (no chronological test applies)'
    );
  });

  test('the toggle × phenotype decomposition adds up', () => {
    const d = decompose({ pAoff: 382721.46, pAt: 330000, pXoff: 360000, pXt: 400000 });

    assert.equal(d.total, 17278.54);
    assert.equal(d.toggles, -52721.46);
    assert.equal(d.parameters, -22721.46);
    assert.equal(d.interaction, r(d.total - d.toggles - d.parameters));
    assert.equal(d.eligibilityWithinX, 40000);
  });

  test('the 2³ factorial: alone, main effects and interactions', () => {
    // v = 100 + 10·a + 20·b + 5·c + 3·a·b
    const v = Object.fromEntries(
      allSh.map((sh) => {
        const [a, b, c] = [...sh].map(Number) as [number, number, number];

        return [sh, 100 + 10 * a + 20 * b + 5 * c + 3 * a * b];
      })
    );
    const f = factorial(v);

    assert.deepEqual(f.alone, { 'D1·GDX': 10, 'D1·VGT': 20, 'Growth·VGT': 5 });
    assert.equal(f.main['D1·GDX'], 11.5);
    assert.equal(f.main['Growth·VGT'], 5);
    assert.equal(f.interactions['D1·GDX × D1·VGT'], 1.5);
    assert.equal(f.interactions['all three'], 0);
  });
});

describe('the controls', () => {
  test('New L0 × 8 toggle combinations, C4, C4-refined, C85 selectable; IJ1 and D report-only', () => {
    const cs = loadControls();

    assert.equal(cs.filter((c) => c.key.startsWith('NL0')).length, 8);
    assert.deepEqual(
      cs
        .filter((c) => c.selectable)
        .map((c) => c.key)
        .filter((k) => !k.startsWith('NL0')),
      ['C4', 'C4R', 'C85']
    );
    assert.equal(controlOf('D').cfg.inc, 'D');
    assert.equal(offSh, '000');
  });
});

const r = (x: number) => Math.round(x * 100) / 100;
