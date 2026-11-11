// This study's own logic (PROTOCOL.md §6–§11): the frozen evidence labels and the decomposition, the structure cells and
// their strata, refinement moves that keep the protected structure, paired seeds and symmetric budgets across the
// three lifecycles, and the controls' identities (read from the sealed sources).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { budgetKeyOf, budgets, simulationCaps } from '../budgets.ts';
import { cells, entryPatternOf, entryPatternsOf, movesOf, pinCell, pinStratum, screenGenomes, strataOf, decode, cfgId } from '../config.ts';
import { controlOf, informedSeeds } from '../controls.ts';
import { modes, simulationCeiling } from '../context.ts';
import { type ArmEvidence, chronSign, decompose, devSign, evidenceLabel, labelOf, riskSign } from '../labels.ts';
import { cutoffs, lanesFor } from '../stages.ts';

const arm = (net: number, reps: [number | null, number | null], seq: ArmEvidence['sequential'], o: Partial<{ dd: number; p10: number; p90: number }> = {}): ArmEvidence => ({
  finalPrimary: { net, dd: o.dd ?? 20000, confirmP10: o.p10 ?? 200000, confirmP90Dd: o.p90 ?? 25000 },
  replicateBest: reps,
  sequential: seq
});
const sup = (net: number) => ({ verdict: 'supported' as const, net, dd: 20000 });
const uns = (net: number) => ({ verdict: 'unsupported' as const, net, dd: 60000 });

describe('the frozen evidence labels', () => {
  test('repeatable improvement needs development, matched replicates and chronology', () => {
    const l0 = arm(300000, [280000, 290000], sup(10000));

    assert.equal(evidenceLabel(arm(310000, [285000, 295000], sup(20000)), l0).label, 'repeatable improvement');
    // one replicate disagrees → development 'mixed' → inconclusive
    assert.equal(devSign(arm(310000, [285000, 280000], sup(20000)), l0), 'mixed');
    assert.equal(evidenceLabel(arm(310000, [285000, 280000], sup(20000)), l0).label, 'inconclusive');
  });

  test('a failed chronological path is never positive evidence', () => {
    const l0 = arm(300000, [280000, 290000], uns(10000));

    assert.equal(chronSign(arm(310000, [285000, 295000], uns(90000)), l0), '0');
    assert.equal(evidenceLabel(arm(310000, [285000, 295000], uns(90000)), l0).label, 'conditional profit/risk trade-off');
  });

  test('harmful, no material difference, tail risk', () => {
    const l0 = arm(300000, [280000, 290000], sup(10000));

    assert.equal(evidenceLabel(arm(290000, [270000, 280000], sup(9000)), l0).label, 'harmful');
    assert.equal(evidenceLabel(arm(301000, [281000, 288000], sup(11000)), l0).label, 'no material difference');
    assert.equal(riskSign(arm(301000, [0, 0], sup(0), { p90: 28000 }), l0), 'worse');
    assert.equal(evidenceLabel(arm(301000, [281000, 288000], sup(11000), { p90: 28000 }), l0).label, 'harmful');
    assert.equal(evidenceLabel(arm(301000, [281000, 288000], sup(11000), { p90: 22000 }), l0).label, 'conditional profit/risk trade-off');
    // L0 supported, X not: chronology '−'
    assert.equal(chronSign(arm(301000, [0, 0], uns(50000)), l0), '−');
  });

  test('the label table is exhaustive', () => {
    const signs = ['+', '−', '0', 'mixed'] as const;

    for (const d of signs) for (const c of ['+', '−', '0'] as const) for (const r of ['better', 'worse', 'same'] as const) assert.ok(labelOf(d, c, r));
  });

  test('the 2 × 2 decomposition adds up', () => {
    const x = decompose({ p0L0: 100, p0X: 4100, pXL0: 1100, pXX: 9100 });

    assert.equal(x.total, 9000);
    assert.equal(x.lifecycle, 4000);
    assert.equal(x.phenotype, 1000);
    assert.equal(x.interaction, 4000);
    assert.equal(x.lifecycle + x.phenotype + x.interaction, x.total);
    assert.equal(decompose({ p0L0: 100, p0X: 100, pXL0: 100, pXX: 2000 }).driver, 'no material total effect');
  });
});

describe('structure cells and strata', () => {
  test('three cells; 6 strata per enabled Growth book', () => {
    assert.deepEqual(cells.map((c) => c.inc), ['V', 'G', 'B']);
    assert.deepEqual(cells.map((c) => strataOf(c).count), [6, 6, 36]);
    assert.deepEqual(entryPatternsOf('B'), ['GDX-rise/VGT-rise', 'GDX-rise/VGT-breakout', 'GDX-breakout/VGT-rise', 'GDX-breakout/VGT-breakout']);
  });

  test('the screen strata cover every entry pattern equally', () => {
    const cell = cells[2]!;
    const counts = new Map<string, number>();

    for (const [i, g] of screenGenomes(72, 'coarse', 'test-strata').entries()) {
      try {
        const c = decode(pinStratum(pinCell(g, cell), cell, i), 'coarse');

        counts.set(entryPatternOf(c), (counts.get(entryPatternOf(c)) ?? 0) + 1);
      } catch {
        // invalid
      }
    }
    assert.equal(counts.size, 4);
  });

  test('independent refinement moves keep the inclusion; informed moves may switch it', () => {
    const c4 = controlOf('C4').cfg!;
    const a = controlOf('A').cfg!;

    assert.ok(movesOf(a, { d1: true, g: true, inc: false }).every((m) => m.inc === 'B'));
    assert.ok(movesOf(a, { d1: true, g: true, inc: true }).some((m) => m.inc !== 'B'));
    assert.ok(movesOf(c4, { d1: true, g: true, inc: false }).every((m) => m.inc === 'V'));
  });
});

describe('paired seeds and symmetric budgets across the three lifecycles', () => {
  test('every position has one lane per lifecycle with the same seed key and budget', () => {
    for (const cut of ['C19', 'C24'] as const) {
      const lanes = lanesFor(cutoffs[cut]!, 'indep');

      assert.equal(lanes.length, 3 * 2 * 3);

      const byPos = new Map<string, typeof lanes>();

      for (const l of lanes) byPos.set(l.position, [...(byPos.get(l.position) ?? []), l]);
      for (const ls of byPos.values()) {
        assert.deepEqual(ls.map((l) => l.mode).sort(), [...modes]);
        assert.equal(new Set(ls.map((l) => l.seedKey)).size, 1);
        assert.ok(!/L[012]/.test(ls[0]!.seedKey), 'a seed label never contains the lifecycle');
      }
    }
  });

  test('base 8,192 and maximum 16,384 independent proposals per arm and cutoff; informed ≤ 4,096 / 8,192', () => {
    const b = budgets.study;
    const perRep = (['V', 'G', 'B'] as const).reduce((a, inc) => a + b[budgetKeyOf('indep', inc)].screen + b[budgetKeyOf('indep', inc)].islands * b[budgetKeyOf('indep', inc)].newPerIsland, 0);
    const perRepMax = (['V', 'G', 'B'] as const).reduce((a, inc) => a + b[budgetKeyOf('indep', inc)].screen + b[budgetKeyOf('indep', inc)].islandsMax * b[budgetKeyOf('indep', inc)].newPerIsland, 0);

    assert.equal(2 * perRep, 8192);
    assert.equal(2 * perRepMax, 16384);

    const inf = b.informed;
    const designs = informedSeeds().length * (1 + inf.near + inf.broad) + 2 * (inf.focusSmall + inf.focusMid);

    assert.ok(2 * (designs + inf.islands * inf.newPerIsland) <= 4096);
    assert.ok(2 * (designs + inf.islandsMax * inf.newPerIsland) <= 8192);
  });

  test('the job caps fit the brief’s 3,000,000 ceiling', () => {
    const c = simulationCaps;
    const total = c.engineering + 4 * c.searchIndep + c.searchInformed + 3 * c.qualify + c.qualifyFinal + 3 * c.folds + c.crossTest + c.diagnostics + c.final;

    assert.ok(total <= simulationCeiling, `${total}`);
  });
});

describe('controls (sealed sources)', () => {
  test('C4, C4-refined and the informed seeds keep their published identities', () => {
    assert.equal(cfgId(controlOf('C4').cfg!), '2f49a1cc226b4ece');
    assert.equal(cfgId(controlOf('C4R').cfg!), '0f017f0ab9b26f24');
    assert.deepEqual(informedSeeds().filter((s) => s.focus).map((s) => s.label), ['C4', 'C4R']);
  });
});
