// Unit tests of the 3C configuration path, anchors, seeds, budgets, neighbourhood pairing and the baseline comparison
// (no market data is read: the anchors come from the committed sealed records).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { laneBudgets, plans, proposalPlan } from '../budgets.ts';
import { anchorsOf, c4Refined, loadControls, seedsAt } from '../controls.ts';
import { type Evidence, type FamilyRows, baselineLabelsOf, pairedOf, removalsOf } from '../qualify.ts';
import {
  arms,
  build,
  decodeGdx,
  encodeGdx,
  gId,
  gdxMoves,
  gdxToggles,
  onFineGrid,
  pinEntry,
  pinStratum,
  rowsOf,
  screenGenomes,
  strataCount,
  structureOf
} from '../space.ts';

test('the anchors and controls hash to their published identities', () => {
  const { controls, anchors } = loadControls();
  const id = (k: string) => controls.find((c) => c.key === k)!.p3Id;

  assert.equal(id('O0'), 'f324035d15f69610'); // C4
  assert.equal(id('R0'), c4Refined.p3Id); // C4-refined = 3B informed-fixed#1 profit
  assert.equal(id('OA'), 'd4cde31356e2306a'); // A
  assert.equal(id('G0'), '90f84e00063dcc76'); // VGT #4 alone
  assert.equal(id('GA'), '0f17bddbd7f63a56'); // GP4
  assert.equal(id('E'), 'c45f4efa028203e9');
  assert.equal(gId(anchors.O.vgt), '420cd989e4fa7749');
  assert.equal(gId(anchors.G.vgt), '420cd989e4fa7749');
  // C4-refined's VGT book: trend filter OFF, 5.7% trailing stop, and its other differences from #4 (initial stop OFF)
  assert.equal(anchors.R.vgt.trendFilterEnabled, false);
  assert.equal(anchors.R.vgt.trailingStopPercent, 5.7);
  assert.equal(anchors.R.vgt.initialStopEnabled, false);
  assert.equal(anchors.O.vgt.initialStopEnabled, true);
  assert.deepEqual(anchors.R.d1, anchors.O.d1);
  assert.deepEqual(anchors.G.books, ['G:VGT']);
});

test('a partner carries its arm anchors exactly; inactive GDX genes never change the identity', () => {
  const a = anchorsOf();
  const appA = loadControls().appA;

  for (const arm of arms) {
    const b = build(a[arm], appA);
    const base = build(a[arm], null);

    assert.deepEqual(b.quad.d1, base.quad.d1);
    assert.equal(gId(b.quad.g.VGT), gId(a[arm].vgt));
    assert.ok(b.enabled.includes('G:GDX'));
    assert.ok(!base.enabled.includes('G:GDX'));
    assert.notEqual(b.id, base.id);
    // Appendix A: retention OFF and maximum hold OFF, so these inputs are inactive
    assert.equal(build(a[arm], { ...appA, retentionSellPercent: 40, maximumHoldDays: 12 } as never).id, b.id);
    assert.equal(base.options.enabled?.['G:GDX'], false);
  }
  assert.equal(build(a.G, null).options.enabled?.['D1:GDX'], false);
});

test('seeds are on the fine grid; earlier cutoffs never see Appendix A or C24 sources', () => {
  const appA = gId(loadControls().appA);

  for (const c of ['C19', 'C21', 'C23', 'C24']) {
    const s = seedsAt(c);

    assert.ok(s.length > 20);
    assert.ok(s.every((x) => onFineGrid(x.gdx)));
    assert.equal(new Set(s.map((x) => gId(x.gdx))).size, s.length);
    if (c !== 'C24') {
      assert.ok(!s.some((x) => gId(x.gdx) === appA));
      assert.ok(s.every((x) => x.source.includes(c)));
    } else assert.equal(gId(s[0]!.gdx), appA);
  }
});

test('the budgets are exact at base and cap for any number of seeded designs', () => {
  for (const schedule of ['study', 'pilot'] as const)
    for (const arm of arms)
      for (const designs of schedule === 'study' ? [1, 132, 396, 600] : [8, 16]) {
        const p = proposalPlan(schedule, arm, designs);

        assert.equal(p.base, plans[schedule][arm].base);
        assert.equal(p.cap, plans[schedule][arm].cap);
        assert.ok(
          laneBudgets(schedule, arm, designs).rise.screen >= laneBudgets(schedule, arm, designs).breakout.screen
        );
      }
  assert.equal(plans.study.R.base, 16384);
  assert.equal(plans.study.O.base, 4096);
  assert.equal(plans.study.G.base, 4096);
  assert.equal(plans.study.R.cap, 32768);
});

test('the screen strata cover every gate × trend × eligibility × hold combination round-robin', () => {
  for (const entry of ['rise', 'breakout'] as const) {
    const n = strataCount(entry);
    const seen = new Set<string>();

    screenGenomes(n, 'test', entry).forEach((g, i) => {
      const c = decodeGdx(pinStratum(pinEntry(g, entry), entry, i));
      const s = structureOf(c);

      assert.equal(s.entry === 'trend_breakout' ? 'breakout' : 'rise', entry);
      seen.add(`${s.gate}|${s.trend !== 'off'}|${s.elig !== 'off'}|${s.exits !== 'hold_off'}`);
    });
    assert.equal(seen.size, n);
  }
});

test('the GDX genome round-trips on the fine grid; moves and toggles change Growth·GDX only', () => {
  const appA = loadControls().appA;

  assert.equal(gId(decodeGdx(encodeGdx(appA))), gId(appA));
  for (const m of gdxMoves(appA)) assert.notEqual(gId(m), gId(appA));
  assert.ok(Object.keys(gdxToggles(appA)).length >= 1);
});

test('paired draws: identical anchor moves; the GDX-only scope keeps the anchors; a baseline has no GDX-only draws', () => {
  const a = anchorsOf();
  const appA = loadControls().appA;

  for (const arm of arms) {
    const p = build(a[arm], appA);
    const b = build(a[arm], null);
    const fam = { name: 'confirm', n: 32, labels: ['test', arm], scope: 'joint' as const };
    const pr = rowsOf(p, fam);
    const br = rowsOf(b, fam);
    const gr = rowsOf(p, { ...fam, scope: 'gdx' });
    const bg = rowsOf(b, { ...fam, scope: 'gdx' });

    assert.equal(pr.length, 32);
    pr.forEach((r, i) => {
      assert.deepEqual(r.quad.d1, br[i]!.quad.d1);
      assert.equal(gId(r.quad.g.VGT), gId(br[i]!.quad.g.VGT));
      assert.equal(gId(r.quad.g.GDX), gId(gr[i]!.quad.g.GDX));
      assert.deepEqual(gr[i]!.quad.d1, p.quad.d1);
      assert.equal(gId(gr[i]!.quad.g.VGT), gId(p.quad.g.VGT));
    });
    assert.ok(bg.every((r) => r.dup));
  }
});

test('removing Growth·GDX is one of the causal reruns of a partner', () => {
  assert.ok(Object.values(removalsOf(['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'])).some((d) => d.join() === 'G:GDX'));
  assert.ok(Object.values(removalsOf(['G:GDX', 'G:VGT'])).some((d) => d.join() === 'G:GDX'));
});

test('paired increments and the baseline labels', () => {
  const rows = (net: number[], dd: number[]): FamilyRows => ({ net, dd, dup: net.map(() => false) });
  const p = pairedOf(rows([10, 20, 30, 40], [5, 50000, 7, 8]), rows([5, 25, 30, 30], [6, 6, 40000, 8]));

  assert.equal(p.rows, 4);
  assert.equal(p.positiveShare, 0.5);
  assert.equal(p.memberOnlyBreach, 1);
  assert.equal(p.baselineOnlyBreach, 1);
  assert.equal(pairedOf(rows([1, 2], [1, 1]), { net: 1, dd: 0 }).medianDeltaNet, 0.5);

  const ev = (net: number, dd: number, p10: number, p90: number, label: string) =>
    ({
      label,
      centre: { net, dd },
      confirm: { median: 0, p10, p90Dd: p90 },
      confirmTail: { p90Interval: [p90 - 100, p90 + 100] },
      select: { robust: 0 },
      stress: { 'cost 10 bps': { net }, 'cost 20 bps': { net } },
      rows: { confirm: rows([net], [dd]), confirmGdx: rows([net], [dd]) },
      enabled: ['G:GDX']
    }) as unknown as Evidence;
  const base = ev(100, 10, 50, 20, 'base');

  assert.equal(baselineLabelsOf(ev(110, 10, 50, 20, 'x'), base).dominates, true);
  assert.equal(baselineLabelsOf(ev(110, 11, 50, 20, 'x'), base).higherProfitTradeOff, true);
  assert.equal(baselineLabelsOf(ev(90, 9, 60, 19, 'x'), base).strongerLocalStability, true);
  assert.equal(baselineLabelsOf(ev(90, 9, 60, 150, 'x'), base).p90WithinFiniteDrawUncertainty, true);
  assert.equal(baselineLabelsOf(ev(90, 9, 60, 1000, 'x'), base).p90WithinFiniteDrawUncertainty, false);
});
