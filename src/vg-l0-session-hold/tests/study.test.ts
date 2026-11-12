// This study's own logic (PROTOCOL.md §4–§11): the frozen comparison labels and the A/B/C decomposition, the V
// sub-cells and their strata (5B's V/G/B schedules), the inclusion pinned to V in every lane, the budgets against the
// original 5B L0 arm, the informed seeds and the controls' identities (read from the sealed sources), and the hold-unit
// evaluation keys.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { budgets as p5bBudgets } from '../../vg-lifecycle-matched-optimization/budgets.ts';
import { budgetKeyOf, budgets, simulationCaps } from '../budgets.ts';
import {
  cells,
  cfgId,
  decode,
  entryPatternOf,
  movesOf,
  pinCell,
  pinStratum,
  screenGenomes,
  strataOf
} from '../config.ts';
import { controlOf, informedSeeds, omittedSeeds } from '../controls.ts';
import { searchUnit, simulationCeiling } from '../context.ts';
import {
  chronSign,
  comparisonLabel,
  decompose,
  devSign,
  labelOf,
  riskSign,
  withinSearchVariability
} from '../labels.ts';
import { cutoffs, lanesFor, replicates } from '../stages.ts';
import { unitKey, withUnit } from '../unit.ts';
import { refinementStarts } from '../search.ts';
import type { Fit } from '../fitness.ts';

const pe = (net: number, o: Partial<{ dd: number; p10: number; p90: number }> = {}) => ({
  net,
  dd: o.dd ?? 20000,
  confirmP10: o.p10 ?? 200000,
  confirmP90Dd: o.p90 ?? 28000
});
const sup = (net: number) => ({ verdict: 'supported' as const, net, dd: 20000 });
const uns = (net: number) => ({ verdict: 'unsupported' as const, net, dd: 60000 });

describe('the frozen comparison labels', () => {
  test('C vs A: a repeatable improvement needs development, replicate agreement (≥ 4 of 6) and chronology', () => {
    const reps = [390000, 392000, 391000, 389000, 380000, 384000];

    assert.equal(
      comparisonLabel(pe(395000), pe(382721.46), { replicateBests: reps, chron: { x: sup(10000), y: uns(-29358.01) } })
        .label,
      'repeatable improvement'
    );
    // only 3 of 6 replicates beat A by more than the band → development 'mixed' → inconclusive
    assert.equal(devSign(pe(395000), pe(382721.46), [390000, 392000, 391000, 380000, 380000, 380000]), 'mixed');
  });

  test('a failed chronological path is never positive evidence', () => {
    assert.equal(chronSign(uns(90000), uns(-29358.01)), '0');
    assert.equal(chronSign(uns(-90000), uns(-29358.01)), '−');
    assert.equal(chronSign(sup(1), uns(-29358.01)), '+');
  });

  test('B vs A and C vs B have no chronological test: a development improvement is qualified as such', () => {
    const x = comparisonLabel(pe(400000), pe(382721.46));

    assert.equal(x.label, 'conditional profit/risk trade-off');
    assert.equal(x.qualifier, 'development improvement (no chronological test applies)');
    assert.equal(comparisonLabel(pe(383000), pe(382721.46)).label, 'no material difference');
    assert.equal(comparisonLabel(pe(370000), pe(382721.46)).label, 'harmful');
    assert.equal(riskSign(pe(383000, { p90: 31000 }), pe(382721.46, { p90: 28000 })), 'worse');
    assert.equal(comparisonLabel(pe(383000, { p90: 31000 }), pe(382721.46, { p90: 28000 })).label, 'harmful');
  });

  test('the label table is exhaustive', () => {
    for (const d of ['+', '−', '0', 'mixed'] as const)
      for (const c of ['+', '−', '0'] as const)
        for (const r of ['better', 'worse', 'same'] as const) assert.ok(labelOf(d, c, r));
  });

  test('the A/B/C decomposition adds up', () => {
    const x = decompose({ pAcal: 100, pAses: 4100, pCcal: 1100, pCses: 9100 });

    assert.equal(x.total, 9000);
    assert.equal(x.unit, 4000);
    assert.equal(x.phenotype, 1000);
    assert.equal(x.interaction, 4000);
    assert.equal(x.reoptimization, 5000);
    assert.equal(withinSearchVariability(500, [1, 600]), true);
  });
});

describe('V sub-cells, strata and the pinned inclusion', () => {
  test("three V sub-cells carrying 5B's V, G and B schedules; 6 strata each", () => {
    assert.deepEqual(
      cells.map((c) => `${c.inc}:${c.sub}`),
      ['V:V1', 'V:V2', 'V:V3']
    );
    for (const c of cells) assert.equal(strataOf(c).count, 6);

    const k = (x: string) => JSON.stringify((p5bBudgets.study as Record<string, unknown>)[x]);

    assert.equal(JSON.stringify(budgets.study['indep-V1']), k('indep-V'));
    assert.equal(JSON.stringify(budgets.study['indep-V2']), k('indep-G'));
    assert.equal(JSON.stringify(budgets.study['indep-V3']), k('indep-B'));
    assert.equal(JSON.stringify(budgets.study.informed), k('informed'));
  });

  test('the screen strata cover both VGT entry patterns in every sub-cell', () => {
    for (const cell of cells) {
      const pats = new Set(
        screenGenomes(60, 'coarse', 'test', cell.sub!)
          .map((g, i) => {
            try {
              return entryPatternOf(decode(pinStratum(pinCell(g, cell), cell, i), 'coarse'));
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      );

      assert.deepEqual([...pats].sort(), ['VGT-breakout', 'VGT-rise']);
    }
  });

  test('refinement moves keep the inclusion (V) when the inclusion is not movable', () => {
    const c = controlOf('NL0').cfg;

    for (const m of movesOf(c, { d1: true, g: true, inc: false })) assert.equal(m.inc, 'V');
  });
});

describe('lanes, replicates and budgets against the original L0 arm', () => {
  test('18 independent lanes per cutoff (6 replicates × 3 sub-cells) and 6 informed lanes, all under the session unit', () => {
    const ind = lanesFor(cutoffs.C19!, 'indep');
    const inf = lanesFor(cutoffs.C24!, 'informed');

    assert.equal(replicates.length, 6);
    assert.equal(ind.length, 18);
    assert.equal(inf.length, 6);
    for (const l of [...ind, ...inf]) assert.equal(l.unit, searchUnit);
    assert.equal(new Set(ind.map((l) => l.seedKey)).size, 18);
    assert.throws(() => lanesFor(cutoffs.C19!, 'informed'));
  });

  test("the base schedule is ≥ the original L0 arm's EXECUTED proposals at every lane, and = 5B's whole-study base", () => {
    const per = (k: 'indep-V1' | 'indep-V2' | 'indep-V3') =>
      budgets.study[k].screen + budgets.study[k].islands * budgets.study[k].newPerIsland;
    const indepBase = replicates.length * (per('indep-V1') + per('indep-V2') + per('indep-V3'));
    const executedL0 = { C19: 9472, C21: 9728, C23: 12288, C24: 13824 }; // 5B L0 arm (recovery/original-recovery.json)

    assert.equal(indepBase, 24576); // = 3 arms × 8,192
    for (const v of Object.values(executedL0)) assert.ok(indepBase >= v);

    const designs = informedSeeds().length * (1 + 12 + 12) + informedSeeds().filter((s) => s.focus).length * 128;

    assert.ok(replicates.length * (designs + 4 * 384) >= 3 * 4034); // ≥ 5B's whole-study informed base (12,102)
    assert.equal(budgetKeyOf('indep', 'V3'), 'indep-V3');
  });

  test("the job caps are 5B's and fit the 3,000,000 ceiling", () => {
    const c = simulationCaps;
    const sum =
      c.engineering +
      4 * c.searchIndep +
      c.searchInformed +
      3 * c.qualify +
      c.qualifyFinal +
      3 * c.folds +
      c.crossTest +
      c.diagnostics +
      c.final;

    assert.equal(c.searchIndep, 415000);
    assert.equal(c.searchInformed, 370000);
    assert.ok(sum <= simulationCeiling);
  });
});

describe('controls and seeds (sealed sources)', () => {
  test('New L0, C4, C4-refined, IJ1 and D keep their published identities', () => {
    assert.equal(cfgId(controlOf('NL0').cfg), '67cfdd9b62d1e16f');
    assert.equal(cfgId(controlOf('IJ1').cfg), '940fdaf770eedc9d');
    assert.equal(cfgId(controlOf('C4R').cfg), '0f017f0ab9b26f24');
    assert.equal(cfgId(controlOf('C4').cfg), '2f49a1cc226b4ece');
    assert.deepEqual(controlOf('D').options, { enabled: { 'G:GDX': false, 'G:VGT': false } });
  });

  test("the informed seeds: 5B's V seeds, its B seeds projected to V, New L0 as a third focus seed", () => {
    const s = informedSeeds();

    assert.deepEqual(
      s.map((x) => x.label),
      ['C4', 'C4R', 'C85', 'IJ1', 'IJ3:V', 'IP:V', 'NL0']
    );
    assert.deepEqual(
      s.filter((x) => x.focus).map((x) => x.label),
      ['C4', 'C4R', 'NL0']
    );
    for (const x of s) assert.equal(x.cfg.inc, 'V');
    assert.deepEqual(
      omittedSeeds.map((x) => x.key),
      ['A', 'E', 'GB1']
    );
  });
});

describe('refinement starts (5B rule; profit-2 reassigned from the both-Growth start)', () => {
  // fits on a line: id → position; distance = |Δposition|; violation 0 = feasible
  const fit = (id: string, net: number, robust: number, p90: number, violation = 0) =>
    ({ id, centre: { net }, nb: { robust, p90Dd: p90 }, violation }) as unknown as Fit;
  const pos: Record<string, number> = { a: 0, b: 0.01, c: 0.2, d: 0.4, e: 0.6, x: 0.8 };
  const dist = (p: Fit, q: Fit) => Math.abs(pos[p.id]! - pos[q.id]!);

  test('robust, profit and profit-2 are distinct; profit-2 is the next feasible fit by centre net', () => {
    const fits = [
      fit('a', 300, 200, 20000),
      fit('b', 290, 150, 21000),
      fit('c', 280, 100, 22000),
      fit('d', 270, 90, 23000),
      fit('x', 999, 0, 1e9, 0.5)
    ];
    const s = refinementStarts(fits, ['robust', 'profit', 'profit-2'], dist, 0.05);

    // robust = a (best robust); profit skips a (same) and b (L∞ 0.01 < 0.05 from a) → c; profit-2 → d
    assert.deepEqual(
      s.map((x) => `${x.kind}:${x.fit.id}`),
      ['robust:a', 'profit:c', 'profit-2:d']
    );
  });

  test('profit-2 never falls back to an infeasible fit; robust and profit do', () => {
    const fits = [fit('a', 300, 200, 20000), fit('x', 999, 0, 1e9, 0.5)];

    assert.deepEqual(
      refinementStarts(fits, ['robust', 'profit', 'profit-2'], dist, 0.05).map((x) => `${x.kind}:${x.fit.id}`),
      ['robust:a', 'profit:x']
    );
    assert.deepEqual(
      refinementStarts([fit('x', 1, 0, 1e9, 0.5)], ['robust', 'profit'], dist, 0.05).map(
        (x) => `${x.kind}:${x.fit.id}`
      ),
      ['robust:x']
    );
  });

  test('two-start lanes (V1, V2) are 5B V/G cells exactly', () => {
    const fits = [fit('a', 300, 200, 20000), fit('c', 280, 250, 22000), fit('e', 310, 100, 24000)];

    assert.deepEqual(
      refinementStarts(fits, ['robust', 'profit'], dist, 0.05).map((x) => `${x.kind}:${x.fit.id}`),
      ['robust:c', 'profit:e']
    );
  });
});

describe('hold-unit evaluation keys', () => {
  test('the unit prefixes the archive key; options never carry the unit themselves', () => {
    assert.notEqual(unitKey('cal', 'k'), unitKey('ses', 'k'));
    assert.deepEqual(withUnit({}, 'cal'), {});
    assert.deepEqual(withUnit({}, 'ses'), { holdUnit: 'sessions' });
    assert.throws(() => withUnit({ holdUnit: 'sessions' }, 'ses'));
  });
});
