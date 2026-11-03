// Level D and screen definitions (PROTOCOL.md §6, §7.1, §10.1): one-to-one matching shared by both directions,
// asymmetric shares by denominator, NA for zero denominators and zero-signal partners, the computed diagonal, anchor
// clusters that are inclusive and never chain, family non-duplication, interval measures, average ranks, the screen's
// gates and roles (SRC skips S1; NC takes only ex-ante uneconomic candidates).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { anchorClusters, independentCount } from '../events.ts';
import { clip, complementOf, intersectionLength, lengthOf, normalize } from '../intervals.ts';
import { type SymbolTimeline, matchDecisions, pairMatrix, pairRow } from '../pairs.ts';
import { type ScreenFeatures, descendingRanks, runScreen } from '../screen.ts';

const timeline = (
  symbol: string,
  sessions: number[],
  armed: [number, number][] = [],
  holding: [number, number][] = []
): SymbolTimeline => ({
  symbol,
  member: true,
  decisions: sessions.map((session) => ({ time: session * 1000 + 60, session })),
  armed: normalize(armed),
  armEpisodes: armed,
  holding: normalize(holding),
  returns: Float64Array.from([0.01, -0.02, 0.03, 0.0, -0.01])
});

describe('pair metrics', () => {
  test('one-to-one matching: no decision is used twice, and (i, j) and (j, i) share one count', () => {
    const a = timeline('AAA', [10, 11, 12]);
    const b = timeline('BBB', [11]);
    const ab = pairRow(a, b);
    const ba = pairRow(b, a);

    assert.equal(ab.matched.s5, 1);
    assert.equal(ba.matched.s5, 1);
    assert.equal(ab.matchShare.s5, 1 / 3, "share of a's three decisions");
    assert.equal(ba.matchShare.s5, 1, "share of b's one decision");
    assert.equal(matchDecisions(a.decisions, b.decisions, { sessions: 0, exactMinute: false }).length, 1);
    assert.equal(ab.matched.minute, 1, 'equal decision times');
  });

  test('NA for zero denominators and zero-signal partners; the diagonal is computed', () => {
    const a = timeline('AAA', [10], [[0, 100]], [[0, 50]]);
    const silent = timeline('ZZZ', []);
    const row = pairRow(a, silent);

    assert.equal(row.matchShare.s5, null);
    assert.equal(row.armedShare, null);
    assert.equal(row.holdShare, null);
    assert.equal(row.holdJaccard, null);
    assert.equal(pairRow(silent, a).matchShare.s5, null);

    const diagonal = pairRow(a, a);

    assert.equal(diagonal.matchShare.s5, 1);
    assert.equal(diagonal.armedShare, 1);
    assert.equal(diagonal.holdJaccard, 1);
    assert.ok(Math.abs(diagonal.returnCorrelation! - 1) < 1e-12);

    const constant = { ...a, returns: Float64Array.from([0, 0, 0, 0, 0]) };

    assert.equal(pairRow(constant, a).returnCorrelation, null);
    assert.equal(pairMatrix([a, silent]).length, 4);
  });

  test('asymmetric shares by denominator', () => {
    const a = timeline('AAA', [1], [[0, 100]], [[0, 100]]);
    const b = timeline('BBB', [2], [[50, 60]], [[90, 110]]);

    assert.equal(pairRow(a, b).armedShare, 10 / 100);
    assert.equal(pairRow(b, a).armedShare, 10 / 10);
    assert.equal(pairRow(a, b).holdShare, 10 / 100);
    assert.equal(pairRow(b, a).holdShare, 10 / 20);
    assert.equal(pairRow(a, b).holdJaccard, 10 / 110);
  });
});

describe('clusters and intervals', () => {
  test('anchor windows are inclusive, never chain, and count a family once', () => {
    const items = [0, 10, 11, 21, 22, 40].map((session, index) => ({
      symbol: index % 2 ? 'B' : 'A',
      time: session,
      session
    }));
    const clusters = anchorClusters(items, 10, 'F');

    assert.deepEqual(
      clusters.map((cluster) => cluster.items.map((item) => item.session)),
      [[0, 10], [11, 21], [22], [40]]
    );
    assert.equal(
      clusters.reduce((total, cluster) => total + cluster.items.length, 0),
      items.length
    );
    assert.deepEqual(clusters[0]!.symbols, ['A', 'B']);
    assert.equal(independentCount([0, 100, 300, 600], 252), 3);
  });

  test('interval measures', () => {
    const x = normalize([
      [0, 10],
      [5, 20],
      [30, 40]
    ]);

    assert.deepEqual(x, [
      [0, 20],
      [30, 40]
    ]);
    assert.equal(lengthOf(x), 30);
    assert.equal(intersectionLength(x, [[15, 35]]), 10);
    assert.deepEqual(complementOf(x, [0, 50]), [
      [20, 30],
      [40, 50]
    ]);
    assert.deepEqual(clip(x, [10, 35]), [
      [10, 20],
      [30, 35]
    ]);
  });
});

describe('the screen', () => {
  const row = (symbol: string, over: Partial<ScreenFeatures> = {}): ScreenFeatures => ({
    symbol,
    n_dec: 6,
    years: 3,
    n_idle: 4,
    n_clean: 3,
    idle_net: 5000,
    fo_net: 2000,
    sa_net: 8000,
    sa_dd: 10000,
    fam_idle: 3,
    indep_pos: 1,
    ...over
  });

  test('average ranks for ties', () => {
    assert.deepEqual(descendingRanks([5, 7, 7, 1]), [3, 1.5, 1.5, 4]);
  });

  test('gates, score, roles: members and VOOG excluded, SRC skips S1, NC only ex-ante uneconomic', () => {
    const features = [
      row('AAA', { n_clean: 5, fo_net: 9000 }),
      row('BBB', { n_clean: 4 }),
      row('CCC', { sa_dd: 40000 }), // fails the drawdown gate
      row('DDD', { fo_net: -3000, n_clean: 6 }), // passes every gate (fo_net is not a gate): the H2 profile
      row('EEE', { idle_net: -100, n_clean: 2 }), // ex-ante uneconomic: an NC candidate
      row('VGT'), // a member
      row('VOOG') // never a candidate
    ];
    const u = runScreen('B4', 'U', 'A', features, []);

    assert.equal(
      u.rows.some((item) => item.symbol === 'VGT' || item.symbol === 'VOOG'),
      false
    );
    assert.equal(u.rows.find((item) => item.symbol === 'CCC')!.passes, false);
    assert.equal(u.rows.find((item) => item.symbol === 'DDD')!.passes, true);
    assert.equal(u.roles.find((item) => item.role === 'S1')!.symbol, 'AAA');
    assert.equal(u.roles.find((item) => item.role === 'NC')!.symbol, 'EEE', 'not DDD, which fails only fo_net');

    const p = runScreen('B5', 'P', 'B', features, ['AAA', 'BBB']);

    assert.equal(p.roles.find((item) => item.role === 'SRC')!.symbol, 'BBB', 'the next source symbol after S1');
  });
});
