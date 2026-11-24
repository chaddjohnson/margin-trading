// P5-NS unit tests (gate E7): the seed projection, the door guards, the budget bounds, the two-tier extension rule, the
// replicate-round trigger, the sequential statistic (against a brute-force minute tracker on synthetic paths), the
// refinement plan's balanced slot and the successor rule. No market data is read except Assignment 3's sealed
// FROZEN_SELECTION.json (the references) through incumbents.ts.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { budgets, laneWorstCase } from '../../vg-l0-full-joint/budgets.ts';
import { allPairs, cfgId, decode } from '../../vg-l0-full-joint/space.ts';
import type { LaneResult } from '../../vg-l0-risk-envelope-pilot/search.ts';
import { references } from '../incumbents.ts';
import { focusGateStates, projectedSeeds } from '../informed.ts';
import { doorGuard, frozenSelectionFile, fullAuthorizationFile, selectionFile, sequentialFile, sliceFile } from '../doors.ts';
import { freezeFile } from '../context.ts';
import { islandCaps, laneCaps, nl0Caps, perMemberCap, replicates, schedules } from '../budget.ts';
import { extensionDecision, roundTrigger, stopReasons, unionState } from '../lanes.ts';
import { type SliceRow, chain, charge, verdictOf } from '../sequential.ts';
import { criteriaOf, material, outcomeOf, successorPreDetermination } from '../successor.ts';
import { refineCells } from '../select.ts';
import type { Evidence } from '../qualify.ts';

describe('Track N seeds (informed.ts)', () => {
  it('N/original is its own native projection in pair GD.VB, a focus seed in odd replicates', () => {
    const id = references().NORIG.id;

    for (const r of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const s = projectedSeeds('GD.VB', r).filter((x) => cfgId(x.cfg) === id);

      assert.equal(s.length, 1);
      assert.equal(s[0]!.variant, 0);
      assert.equal(s[0]!.gateState, 1);
      assert.equal(s[0]!.focus, r % 2 === 1);
    }
  });
  it('16 seeds per lane, 2 focus seeds (native), genomes decode to their configurations', () => {
    for (const p of allPairs)
      for (const r of [1, 2, 3, 4]) {
        const s = projectedSeeds(p, r);

        assert.equal(s.length, 16);
        assert.equal(s.filter((x) => x.focus).length, 2);
        assert.ok(s.filter((x) => x.focus).every((x) => x.variant === 0 && focusGateStates(r).includes(x.gateState)));
        for (const x of s) assert.equal(cfgId(decode(x.genome!, 'fine')), cfgId(x.cfg));
      }
  });
  it('focus gate states cover every state over four replicates', () => {
    const seen = new Set([1, 2, 3, 4].flatMap((r) => focusGateStates(r)));

    assert.deepEqual([...seen].sort(), [0, 1, 2, 3]);
  });
});

describe('door guards (doors.ts)', () => {
  const state = (sealed: string[], committed = sealed, exists = sealed) => ({
    exists: (f: string) => exists.includes(f),
    sealed: (f: string) => sealed.includes(f),
    committed: (f: string) => committed.includes(f)
  });

  it('training doors follow the folds; D24 needs the sequential record', () => {
    assert.doesNotThrow(() => doorGuard('D19', 'training', 'x', state([])));
    assert.throws(() => doorGuard('D21', 'training', 'x', state([])));
    assert.doesNotThrow(() => doorGuard('D21', 'training', 'x', state([sliceFile('C19')])));
    assert.throws(() => doorGuard('D24', 'training', 'x', state([sliceFile('C23')])));
    assert.doesNotThrow(() => doorGuard('D24', 'training', 'x', state([sliceFile('C23'), sequentialFile])));
    assert.throws(() => doorGuard('FULL', 'training', 'x', state([])));
  });
  it('a slice door opens after the committed selection, once', () => {
    assert.throws(() => doorGuard('D21', 'slice', 'x', state([])));
    assert.throws(() => doorGuard('D21', 'slice', 'x', state([selectionFile('C19')], [])));
    assert.doesNotThrow(() => doorGuard('D21', 'slice', 'x', state([selectionFile('C19')])));
    assert.throws(() => doorGuard('D21', 'slice', 'x', state([selectionFile('C19'), sliceFile('C19')])));
  });
  it('FULL: validation after the frozen selection and the authorization, once; engineering only for the references before the freeze', () => {
    const pre = [selectionFile('C24'), frozenSelectionFile, fullAuthorizationFile];

    assert.throws(() => doorGuard('FULL', 'validation', 'x', state(pre.slice(0, 2))));
    assert.doesNotThrow(() => doorGuard('FULL', 'validation', 'x', state(pre)));
    assert.throws(() => doorGuard('FULL', 'validation', 'x', state([...pre, sliceFile('C24')])));
    assert.doesNotThrow(() => doorGuard('FULL', 'engineering', 'known-target reproduction of New L0 and N/original', state([])));
    assert.throws(() => doorGuard('FULL', 'engineering', 'a search', state([])));
    assert.throws(() => doorGuard('D24', 'engineering', 'x', state([freezeFile])));
    assert.doesNotThrow(() => doorGuard('D19', 'engineering', 'x', state([freezeFile])));
  });
});

describe('budgets (budget.ts)', () => {
  it('the schedules are NL0 / Assignment 3 with only the island cap raised', () => {
    for (const k of ['broad', 'refine', 'informed'] as const) {
      assert.deepEqual({ ...schedules[k], islandsMax: 0 }, { ...budgets.study[k], islandsMax: 0 });
      assert.equal(schedules[k].islandsMax, islandCaps[k]);
      assert.equal(nl0Caps[k], budgets.study[k].islandsMax);
    }
    assert.deepEqual(islandCaps, { broad: 16, refine: 16, informed: 16 });
    assert.deepEqual(nl0Caps, { broad: 6, refine: 8, informed: 8 });
  });
  it('the lane caps are the deterministic worst cases rounded up', () => {
    assert.equal(laneCaps.broad, Math.ceil(laneWorstCase(schedules.broad, 0, 0) / 1000) * 1000);
    assert.equal(laneCaps.informed, Math.ceil(laneWorstCase(schedules.informed, 656, 2) / 1000) * 1000);
    assert.deepEqual(laneCaps, { broad: 90_000, refine: 174_000, informed: 171_000 });
    assert.equal(perMemberCap(), 655);
    assert.equal(replicates.broadBase, 4);
    assert.equal(replicates.refine, 4);
  });
});

describe('the two-tier extension rule (lanes.ts)', () => {
  const perf = { fired: true, perf: true };
  const cls = { fired: true, perf: false };
  const none = { fired: false, perf: false };

  it('NL0 exactly up to its cap', () => {
    assert.equal(extensionDecision(none, 2, 6, 16), stopReasons.converged);
    assert.equal(extensionDecision(cls, 5, 6, 16), null);
    assert.equal(extensionDecision(perf, 5, 6, 16), null);
  });
  it('beyond NL0’s cap only a performance component extends', () => {
    assert.equal(extensionDecision(cls, 6, 6, 16), stopReasons.classOnly);
    assert.equal(extensionDecision(perf, 6, 6, 16), null);
    assert.equal(extensionDecision(perf, 15, 6, 16), null);
    assert.equal(extensionDecision(none, 9, 6, 16), stopReasons.converged);
  });
  it('at 16 islands: budget-bound iff a performance component still fires', () => {
    assert.equal(extensionDecision(perf, 16, 6, 16), stopReasons.capped);
    assert.equal(extensionDecision(cls, 16, 8, 16), stopReasons.classOnly);
  });
});

describe('replicate rounds (lanes.ts unionState / roundTrigger)', () => {
  const lane = (structure: string, replicate: number, fits: [number, number, number][]): LaneResult =>
    ({
      structure,
      replicate,
      r3: fits.map(([net, robust, p90], i) => ({ id: `${structure}-${replicate}-${i}`, feasible: true, net, robust, p90 })),
      shortlist: []
    }) as unknown as LaneResult;

  it('fires on a > 2 % union gain or a new feasible structure, not otherwise', () => {
    const base = [lane('GA0.VA0', 101, [[200_000, 150_000, 30_000]]), lane('GB0.VB0', 101, [[180_000, 140_000, 25_000]])];
    const same = [...base, lane('GA0.VA0', 102, [[200_500, 150_100, 30_000]])];
    const better = [...base, lane('GA0.VA0', 102, [[220_000, 160_000, 28_000]])];
    const newCell = [...base, lane('GC0.VC0', 102, [[100_000, 80_000, 34_000]])];

    assert.equal(roundTrigger(unionState(base, 'F'), unionState(same, 'F'), 0.02).fired, false);
    assert.equal(roundTrigger(unionState(base, 'F'), unionState(better, 'F'), 0.02).fired, true);
    assert.deepEqual(roundTrigger(unionState(base, 'F'), unionState(newCell, 'F'), 0.02).newStructures, ['GC0.VC0']);
  });
});

describe('the sequential statistic (sequential.ts)', () => {
  // a synthetic minute path per slice → a SliceRow (closes at every 10th point, one lot per segment) and the brute force
  const rowOf = (id: string, v: number[], boundaryEquity: number, lots: SliceRow['lots'] = []): SliceRow => ({
    label: id,
    id,
    boundary: '2019-12-31',
    boundaryEquity,
    sliceNet: v.at(-1)!,
    sliceDd: (() => {
      let peak = 0;
      let dd = 0;

      for (const x of v) {
        peak = Math.max(peak, x);
        dd = Math.max(dd, peak - x);
      }
      return dd;
    })(),
    closes: v.map((x, i) => ({ date: `2020-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`, equity: boundaryEquity + x })).filter((_c, i) => i % 10 === 9 || i === v.length - 1),
    lots
  });
  const brute = (paths: number[][], charges: number[]) => {
    let peak = 0;
    let dd = 0;
    let off = 0;

    paths.forEach((p, k) => {
      off -= charges[k]!;
      for (const x of p) {
        peak = Math.max(peak, off + x);
        dd = Math.max(dd, peak - (off + x));
      }
      off += p.at(-1)!;
    });
    return { dd, net: off };
  };

  it('equals the brute-force tracker when every extreme is a session close; charges at switches', () => {
    const p1 = Array.from({ length: 50 }, (_v, i) => (i < 30 ? i * 1000 : 30_000 - (i - 30) * 500));
    const p2 = Array.from({ length: 50 }, (_v, i) => -(i % 10 === 9 ? 1 : 0) * 0 - Math.min(i, 30) * 600 + Math.max(0, i - 30) * 900);
    const p3 = Array.from({ length: 30 }, (_v, i) => i * 100);
    // make every extreme fall on a close (index ≡ 9 mod 10 or the last)
    const snap = (p: number[]) => p.map((_x, i) => p[Math.min(p.length - 1, Math.floor(i / 10) * 10 + 9)]!);
    const [a, b, c] = [snap(p1), snap(p2), snap(p3)];
    const rows = [rowOf('A', a, 100_000), rowOf('B', b, 50_000), rowOf('C', c, 70_000)];
    const g = chain(['C19', 'C21', 'C23'], rows);
    const ch = [0, 0, 0]; // no lots open: no switch charge
    const x = brute([a, b, c], ch);

    assert.ok(Math.abs(g.drawdown - x.dd) < 1e-9);
    assert.ok(Math.abs(g.net - x.net) < 1e-9);
  });
  it('is a lower bound when a minute trough is hidden between closes, exact when a lot minimum shows it', () => {
    // slice 1 peaks at 30,000 on a close (index 9) and ends at 19,000: the earlier peak sits above the boundary
    const a = Array.from({ length: 20 }, (_v, i) => (i <= 9 ? Math.round((30_000 * (i + 1)) / 10) : 30_000 - (i - 9) * 1_100));
    const b = Array.from({ length: 20 }, (_v, i) => (i === 4 ? -25_000 : -1_000)); // a hidden minute trough at i = 4
    const rowsHidden = [rowOf('A', a, 0), rowOf('B', b, 0)];
    const hidden = chain(['C19', 'C21'], rowsHidden);
    const exact = brute([a, b], [0, 0]);

    assert.ok(hidden.drawdown <= exact.dd + 1e-9);
    assert.ok(hidden.drawdown < exact.dd);
    // the lot that lives inside slice 2 carries the minute minimum as its MAE (realized base 0 → −25,000)
    const lot = { book: 'D1:VGT', entry: '2020-01-02', exit: '2020-01-20', net: -1_000, mae: -25_000, maeAt: '2020-01-05' };
    const shown = chain(['C19', 'C21'], [rowsHidden[0]!, { ...rowsHidden[1]!, boundaryEquity: 0, lots: [lot] }]);

    assert.ok(Math.abs(shown.drawdown - exact.dd) < 1e-9);
  });
  it('switch charges, flat folds and the verdict strings', () => {
    const open = (id: string) => ({ book: 'G:VGT', entry: '2019-06-01', exit: null, net: 0, mae: 0, maeAt: null });
    const r1 = { ...rowOf('A', [1000, 2000], 0), lots: [open('A')] };
    const r2 = { ...rowOf('B', [500, 900], 0), lots: [] };
    const c = chain(['C19', 'C21', 'C23'], [r1, r2, null]);

    assert.equal(c.parts[1]!.charge, charge * 1); // A's open lot closed, B adopts none
    assert.equal(c.parts[2]!.charge, 0); // B has no open lot at its end
    assert.match(verdictOf(['C19', 'C21', 'C23'], ['A', 'B', null], c), /incomplete/);
    assert.match(verdictOf(['C19', 'C21'], ['A', 'B'], chain(['C19', 'C21'], [r1, r2])), /^supported/);
  });
});

// ----- synthetic evidence for the refinement plan and the successor rule -----

const ev = (o: Partial<Evidence> & { label: string; net: number; dd?: number; robust?: number; p90?: number; cp10?: number; cmed?: number; cp90?: number; cell?: string; track?: Evidence['track']; replicate?: number | null; lane?: string }): Evidence =>
  ({
    label: o.label,
    id: o.label,
    track: o.track ?? 'F',
    stage: 'broad',
    lane: o.lane ?? o.label,
    replicate: o.replicate ?? 101,
    cell: o.cell ?? 'GA0.VA0',
    pair: 'GA.VA',
    base: true,
    growthEntry: 'rise',
    cfg: { g: { drawdownRecoveryGateEnabled: true } },
    qualified: o.qualified ?? true,
    failed: [],
    centre: { net: o.net, dd: o.dd ?? 20_000, signature: o.label },
    select: { robust: o.robust ?? o.net / 2, p90Dd: o.p90 ?? 30_000, p10: 0, median: 0 },
    selectTail: { breachShare: 0 },
    confirm: { p10: o.cp10 ?? 150_000, median: o.cmed ?? 220_000, p90Dd: o.cp90 ?? 28_000 },
    risk: { conservativeNet: o.net, occupancy: 0.5 }
  }) as unknown as Evidence;

describe('the refinement plan (select.ts refineCells)', () => {
  it('fills the balanced slot instead of Assignment 3’s RA1 slot', () => {
    const cells = ['GA0.VA0', 'GB0.VB0', 'GC0.VC0', 'GD0.VD0', 'GA1.VB1', 'GB1.VC1', 'GC1.VD1', 'GD1.VA1', 'GA0.VD1', 'GB1.VA0', 'GC0.VB1', 'GD1.VC0', 'GA1.VA1', 'GB0.VD0', 'GC1.VA0'];
    const broad = cells.map((c, i) => ev({ label: c, cell: c, net: 300_000 - i * 10_000, robust: 100_000 + (i % 5) * 20_000, p90: 20_000 + i * 1_000 }));
    const plan = refineCells(broad);

    assert.ok(plan.cells.some((c) => c.why.some((w) => w.startsWith('balanced'))));
    assert.ok(!plan.cells.some((c) => c.why.some((w) => w.includes('RA1') && !w.includes('replaces'))));
    assert.equal(plan.cells[0]!.cell, 'GA0.VA0');
  });
});

describe('the successor rule (successor.ts)', () => {
  const n = ev({ label: 'control: N/original', track: 'control', net: 388_000, dd: 19_460, cp10: 160_000, cmed: 225_000, cp90: 28_000 });

  it('profit type needs +$10,000 centre, +$5,000 robust and risk within $2,500', () => {
    assert.deepEqual(criteriaOf(ev({ label: 'x', net: 399_000, dd: 19_460, cp10: 166_000, cmed: 230_000, cp90: 28_500 }), n).types, ['P']);
    assert.deepEqual(criteriaOf(ev({ label: 'x', net: 399_000, dd: 19_460, cp10: 162_000, cmed: 226_000, cp90: 28_500 }), n).types, []);
    assert.deepEqual(criteriaOf(ev({ label: 'x', net: 399_000, dd: 23_000, cp10: 170_000, cmed: 235_000, cp90: 28_000 }), n).types, []);
  });
  it('risk type needs −$2,500 confirmation p90 DD at non-inferior profit', () => {
    assert.deepEqual(criteriaOf(ev({ label: 'x', net: 386_000, dd: 19_000, cp10: 159_000, cmed: 224_000, cp90: 25_000 }), n).types, ['R']);
    assert.deepEqual(criteriaOf(ev({ label: 'x', net: 380_000, dd: 19_000, cp10: 159_000, cmed: 224_000, cp90: 25_000 }), n).types, []);
  });
  it('replication across two replicates, then V1–V3', () => {
    const x1 = ev({ label: 'x1', net: 400_000, dd: 19_000, cp10: 170_000, cmed: 232_000, cp90: 27_000, replicate: 101, lane: 'L1' });
    const x2 = ev({ label: 'x2', net: 399_000, dd: 19_000, cp10: 170_000, cmed: 232_000, cp90: 27_000, replicate: 102, lane: 'L2' });
    const fin = [x1].map((e) => ({ label: e.label, id: e.id, track: 'F', stage: 'broad', lane: e.lane, replicate: e.replicate, cell: e.cell, pair: e.pair, signature: e.label, why: ['test'], ledgerEquivalent: [] }));
    const seq = { procedures: [{ population: 'F', verdict: 'unsupported (…)', supported: false }] };
    const lone = successorPreDetermination(fin, [x1], [n], seq);
    const pair = successorPreDetermination(fin, [x1, x2], [n], seq);

    assert.equal(lone.rows[0]!.preValidation, false);
    assert.equal(pair.rows[0]!.preValidation, true);
    assert.match(pair.rows[0]!.support, /no chronological support/);
    assert.match(outcomeOf(pair, [{ label: 'x1', id: 'x1', validation: { V1: true, V2: true, V3: true } }]).label, /^SUCCESSOR WORTHY/);
    assert.match(outcomeOf(pair, [{ label: 'x1', id: 'x1', validation: { V1: true, V2: false, V3: true } }]).label, /^NO MATERIAL IMPROVEMENT/);
    assert.equal(material.profitNet, 10_000);
  });
});
