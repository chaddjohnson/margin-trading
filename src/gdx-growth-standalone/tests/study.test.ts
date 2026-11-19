// Unit tests of the 4A configuration path, controls, strata, budgets, the prior-set rule, roles and the descriptive
// labels (no market data is read: the controls come from the committed sealed records).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Rec } from '../../vg-d1-growth-joint/evaluate.ts';
import { independentBudget, informedBudget, plans, proposalPlan } from '../budgets.ts';
import { appendixAId, informedSeeds, loadControls, priorSet } from '../controls.ts';
import { type Evidence, labelsOf, rolesOf } from '../qualify.ts';
import {
  buildS,
  coarseClassOf,
  decodeGdx,
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

test('a standalone configuration enables Growth·GDX only; cash enables nothing', () => {
  const a = loadControls().find((c) => c.key === 'A')!;
  const b = buildS(a.gdx);
  const cash = buildS(null);

  assert.deepEqual(b.enabled, ['G:GDX']);
  assert.deepEqual(cash.enabled, []);
  assert.equal(b.options.enabled?.['D1:GDX'], false);
  assert.equal(b.options.enabled?.['D1:VGT'], false);
  assert.equal(b.options.enabled?.['G:VGT'], false);
  assert.equal(gId(b.cfg.gdx!), appendixAId);
  assert.notEqual(b.id, cash.id);
  // retention and the maximum hold are OFF in Appendix A: those inputs are inactive and never change the identity
  assert.equal(buildS({ ...a.gdx!, retentionSellPercent: 40, maximumHoldDays: 12 } as never).id, b.id);
});

test('the controls: Appendix A, the predeclared prior set by its rule, cash; all exactly representable', () => {
  const cs = loadControls();
  const priors = priorSet();

  assert.equal(cs[0]!.key, 'A');
  assert.equal(cs.at(-1)!.key, 'CASH');
  assert.equal(cs.at(-1)!.selectable, false);
  assert.equal(priors.length, 13);
  assert.equal(new Set(priors.map((p) => p.id)).size, 13);
  assert.ok(!priors.some((p) => p.id === appendixAId));
  // 3C's nine role-holder books (all Rise) and 3B's four funded G/B role holders (three breakouts)
  assert.equal(priors.filter((p) => p.from.startsWith('3C')).length, 9);
  assert.equal(priors.filter((p) => p.from.startsWith('3B')).length, 4);
  assert.equal(priors.filter((p) => p.gdx.entryMethod === 'trend_breakout').length, 3);
  for (const c of cs) if (c.gdx) assert.ok(onFineGrid(c.gdx), c.label);
  assert.equal(informedSeeds().length, 14);
});

test('the protected strata: 64 Rise and 32 breakout cells, round-robin pinning', () => {
  assert.equal(strataCount('rise'), 64);
  assert.equal(strataCount('breakout'), 32);

  const seen = { rise: new Set<string>(), breakout: new Set<string>() };

  for (const entry of ['rise', 'breakout'] as const)
    screenGenomes(512, 'test', entry).forEach((g, i) => {
      try {
        seen[entry].add(coarseClassOf(decodeGdx(pinStratum(pinEntry(g, entry), entry, i))));
      } catch {
        // an invalid draw
      }
    });
  assert.equal(seen.rise.size, 64);
  assert.equal(seen.breakout.size, 32);
});

test('budgets: independent 16,384 / 32,768 per cutoff; informed 8,192 / 16,384', () => {
  const ind = independentBudget('study');

  assert.equal(2 * (ind.screen + ind.islands * ind.newPerIsland), 16384);
  assert.equal(2 * (ind.screen + ind.islandsMax * ind.extPerIsland), 32768);

  const p = proposalPlan('study', 574);

  assert.equal(p.independent.base, 16384);
  assert.equal(p.informed!.base, 8192);
  assert.equal(p.informed!.cap, 16384);

  const inf = informedBudget('study', 574);

  assert.equal(574 + inf.firstIsland + (inf.islands - 1) * inf.newPerIsland, 8192);
  assert.equal(plans.study.independent.islands[1], 12);
});

test('neighbourhood rows move only active GDX inputs and keep the other books disabled', () => {
  const a = loadControls().find((c) => c.key === 'A')!;
  const b = buildS(a.gdx);
  const rows = rowsOf(b, { name: 't', n: 32, labels: ['test', 1], scope: 'joint' });

  for (const r of rows) {
    assert.deepEqual(r.quad.d1, b.quad.d1);
    assert.equal(gId(r.quad.g.VGT), gId(b.quad.g.VGT));
    assert.deepEqual(structureOf(r.quad.g.GDX), structureOf(b.quad.g.GDX));
  }
  assert.ok(rows.some((r) => r.id !== b.id));
  assert.ok(gdxMoves(a.gdx!).length > 20);
  assert.ok(Object.keys(gdxToggles(a.gdx!)).includes('G·GDX recovery gate OFF'));
});

const ev = (label: string, net: number, dd: number, robust: number, p90: number, p10: number, q = true) =>
  ({
    label,
    qualified: q,
    centre: { net, dd } as Rec,
    select: { robust, p90Dd: p90, p10 },
    confirm: { p10, p90Dd: p90, median: robust, robust },
    confirmTail: { p90Interval: [p90 - 500, p90 + 500] }
  }) as unknown as Evidence;

test('roles: actual-profit by centre net; robust, balanced and lower-drawdown on the selection families', () => {
  const r = rolesOf('t', [
    ev('a', 100, 20, 50, 30, 40),
    ev('b', 90, 10, 80, 20, 70),
    ev('c', 120, 30, 30, 34, 20, false),
    ev('d', 60, 5, 45, 10, 35)
  ]);

  assert.equal(r.roles['actual-profit'], 'a');
  assert.equal(r.roles['robust-profit'], 'b');
  assert.equal(r.roles.balanced, 'd');
  assert.equal(r.roles['lower-drawdown'], 'd');
  assert.equal(r.qualified, 3);
  assert.deepEqual(rolesOf('none', [ev('x', 1, 1, 1, 1, 1, false)]).roles['actual-profit'], null);
});

test('labels against a reference are descriptive: dominance, trade-off, stability, finite-draw overlap', () => {
  const ref = ev('A', 50, 20, 10, 40, -5);
  const l = labelsOf(ev('m', 60, 15, 20, 30, 5), ref);

  assert.ok(l.dominates && !l.dominatedBy && l.strongerLocalStability && !l.higherProfitTradeOff);

  const t = labelsOf(ev('t', 70, 25, 20, 40.2, 5), ref);

  assert.ok(!t.dominates && t.higherProfitTradeOff && t.p90WithinFiniteDrawUncertainty);
});
