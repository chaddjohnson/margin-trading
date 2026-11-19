// Unit tests of the audit's pure logic: the cohort quotas and rank picks, the decision and futility rules. (The
// policies' tests are in policies.test.ts, written with the Stage 2 freeze.)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cellQuotas, quotasOf, rankPicks } from '../cohort.ts';
import { classify, consistentInValidation, futile, subjectVerdict } from '../decision.ts';

describe('cohort rule (PROTOCOL.md §7.4)', () => {
  it('splits 96 − |S| into U 8 and four equal strata, odd units first', () => {
    const big = { S: 40, R3: 100, R2: 100, F: 100, P: 100, U: 100 };

    assert.deepEqual(quotasOf(40, big).taken, { S: 40, R3: 12, R2: 12, F: 12, P: 12, U: 8 });
    assert.deepEqual(quotasOf(10, { ...big, S: 10 }).planned, { S: 10, R3: 20, R2: 20, F: 19, P: 19, U: 8 });
  });

  it('passes a shortfall to the next stratum in order R3 → R2 → F → P → U', () => {
    const q = quotasOf(10, { S: 10, R3: 5, R2: 100, F: 3, P: 100, U: 2 });

    assert.deepEqual(q.taken, { S: 10, R3: 5, R2: 35, F: 3, P: 35, U: 2 });
    assert.equal(q.unused, 6);
    assert.equal(10 + 5 + 35 + 3 + 35 + 2 + 6, 96);
  });

  it('picks evenly spaced profit ranks with the top always included', () => {
    assert.deepEqual(rankPicks(10, 3), [0, 3, 6]);
    assert.deepEqual(rankPicks(2, 5), [0, 1]);
    assert.deepEqual(rankPicks(7, 1), [0]);
  });

  it('spreads a quota over cells round-robin, a short cell passing its share on', () => {
    assert.deepEqual(cellQuotas([{ cell: 'a', n: 1 }, { cell: 'b', n: 10 }, { cell: 'c', n: 10 }], 7), { a: 1, b: 3, c: 3 });
    assert.deepEqual(cellQuotas([{ cell: 'a', n: 1 }, { cell: 'b', n: 1 }], 5), { a: 1, b: 1 });
  });
});

const path = (nets: number[], dds: number[], labels: (string | null)[], net: number, dd: number) => ({
  slices: nets.map((n, i) => ({ fold: `F${i}`, label: labels[i]!, sliceNet: n, sliceDd: dds[i]! })),
  net,
  sequentialDd: dd
});

describe('decision rule (PROTOCOL.md §7.5)', () => {
  const p0 = path([10, -20, 5], [60_000, 40_000, 10_000], ['a', 'b', 'c'], -5, 60_000);

  it('accepts repeated improvement within the budget', () => {
    const v = subjectVerdict(path([12, -5, 5], [30_000, 20_000, 9_000], ['x', 'y', 'c'], 12, 30_000), p0);

    assert.equal(v.all, true);
  });

  it('refuses abstention as improvement (M2 needs net > max(P0, 0); M4 needs ≥ 2 invested slices)', () => {
    const flat = subjectVerdict(path([0, 0, 0], [0, 0, 0], [null, null, null], 0, 0), p0);

    assert.equal(flat.M2, false);
    assert.equal(flat.M4, false);

    const one = subjectVerdict(path([0, 0, 6], [0, 0, 9_000], [null, null, 'c'], 6, 9_000), p0);

    assert.equal(one.M4, false);
    assert.equal(one.all, false);
  });

  it('refuses a new slice breach and a single-slice gain', () => {
    const breach = subjectVerdict(path([12, -5, 6], [30_000, 20_000, 36_000], ['x', 'y', 'z'], 13, 34_000), p0);

    assert.deepEqual(breach.newBreaches, ['F2']);
    assert.equal(breach.M3, false);

    const single = subjectVerdict(path([100, -30, 1], [30_000, 20_000, 9_000], ['x', 'y', 'z'], 71, 30_000), p0);

    assert.equal(single.slicesNotWorse, 1);
    assert.equal(single.M3, false);
  });

  it('classifies across the two subjects and applies futility', () => {
    const yes = { M1: true, M2: true, M3: true, M4: true, all: true, slicesNotWorse: 3, newBreaches: [], invested: 3, identicalToP0: false };
    const riskOnly = { ...yes, M2: false, all: false };
    const no = { ...yes, M1: false, M2: false, all: false };

    assert.equal(classify({ '3B': yes, '4A': yes }), 'merits further confirmation');
    assert.equal(classify({ '3B': yes, '4A': no }), 'one-subject signal');
    assert.equal(classify({ '3B': riskOnly, '4A': riskOnly }), 'risk-only change');
    assert.equal(classify({ '3B': no, '4A': no }), 'no demonstrated improvement');
    assert.equal(futile(['one-subject signal', 'risk-only change']), true);
    assert.equal(futile(['merits further confirmation']), false);
  });

  it('judges validation consistency (§8)', () => {
    const ok = { p: { pnl: 10, resetDd: 1, wholeDd: 1 }, p0: { pnl: 20 } };

    assert.equal(consistentInValidation({ '3B': ok, '4A': { p: { pnl: 5, resetDd: 1, wholeDd: 1 }, p0: { pnl: 0 } } }), true);
    assert.equal(consistentInValidation({ '3B': ok, '4A': { p: null, p0: { pnl: 0 } } }), false);
    assert.equal(consistentInValidation({ '3B': ok, '4A': ok }), false);
  });
});
