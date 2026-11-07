// growth140-vgt-stable unit tests: synthetic data only (the fixture door; no market data is read).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fixtureDoor } from '../../growth140-vgt-s8m/fixture.ts';
import { Checkpointer } from '../checkpoint.ts';
import { rules } from '../context.ts';
import { evaluate } from '../engine.ts';
import { bandedOrder, centreView, nbView, violationOf } from '../fitness.ts';
import { sequentialOf } from '../folds.ts';
import { gatesOf } from '../qualify.ts';
import {
  configId,
  configOfFine,
  configOfGenome,
  control4,
  effectiveOf,
  fineGenomeOf,
  fineStepOf,
  movesOf,
  neighbourhood,
  numericGenes,
  radiusValue,
  screenGenomes,
  structureKey,
  structureOf
} from '../space.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'g140s-'));

test('family-pinned screens decode to their family; the fine genome round-trips the identity', () => {
  for (const fam of ['rise', 'breakout'] as const)
    for (const g of screenGenomes(128, fam, 'unit')) {
      const c = configOfGenome(g);

      assert.equal(c.entryMethod, fam === 'rise' ? 'rise_from_recent_low' : 'trend_breakout');
      assert.equal(configId(configOfFine(fineGenomeOf(c))), configId(c));
    }

  assert.equal(configId(configOfFine(fineGenomeOf(control4))), configId(control4));
  assert.equal(control4.recoveryRetracementPercent, 45);
  assert.equal(control4.intradayLossBufferPercent, 2.9);
});

test('the neighbourhood perturbs by the same absolute radius, at the schema step, keeping the structure', () => {
  const nb = neighbourhood(control4, { name: 't', n: 128, labels: ['unit'] });
  const ids = new Set(nb.map((p) => p.id));

  assert.equal(ids.size, nb.length);
  assert.ok(!ids.has(configId(control4)));

  for (const p of nb) {
    assert.equal(structureKey(structureOf(p.config)), structureKey(structureOf(control4)));
    for (const gene of numericGenes.filter((g) => typeof control4[g.key] === 'number')) {
      const v = p.config[gene.key] as number;
      const step = fineStepOf(gene);

      assert.ok(Math.abs(v - (control4[gene.key] as number)) <= radiusValue(gene) + step / 2 + 1e-9, gene.key);
      assert.ok(Math.abs(v / step - Math.round(v / step)) < 1e-6, `${gene.key} ${v} on its schema step`);
    }
  }

  // a subset family moves only its inputs
  const only = neighbourhood(control4, { name: 's', n: 32, labels: ['unit-s'], genes: ['recoveryRetracementPercent'] });

  for (const p of only)
    for (const k of Object.keys(control4))
      if (k !== 'recoveryRetracementPercent') assert.equal(p.config[k], control4[k], k);
});

test('moves are distinct, valid and exclude the centre', () => {
  const m = movesOf(control4);

  assert.ok(m.length > 40);
  assert.equal(new Set(m.map(configId)).size, m.length);
  assert.ok(!m.some((c) => configId(c) === configId(control4)));
});

test('feasibility keeps only the four hard rules; the gates are inclusive at $35,000', () => {
  const rec = (net: number, dd: number): any => ({ net, dd, signature: 'x', trades: 1, netExTopMove: net });
  const c = centreView(
    {
      ...rec(1000, 35000),
      realized: 0,
      unrealized: 0,
      ddDaily: 0,
      wins: 0,
      losses: 0,
      moves: 1,
      winningMoves: 1,
      lossSum: 0,
      topMove: 1000,
      topMoveShare: 1,
      netHaircutTopMove: 500,
      top1Share: 1,
      exposure: 1,
      bestYear: 0,
      bestYearKey: ''
    } as never,
    1
  );
  const good = nbView(Array.from({ length: 10 }, (_v, i) => rec(100 + i, 30000)));
  const bad = nbView(Array.from({ length: 10 }, (_v, i) => rec(i < 2 ? -5 : 100, 36000)));

  assert.equal(violationOf(c, good).violation, 0); // one trade, 100% concentration: still feasible
  assert.ok(violationOf(c, bad).violation > 0);
  assert.equal(bad.breaches, 10);
  assert.equal(
    gatesOf(
      { net: 1, dd: rules.ceiling } as never,
      { p90Dd: rules.ceiling, p10Net: 0.01 } as never,
      { net: 1, dd: 1 } as never
    ).qualified,
    true
  );
});

test('the banded order prefers the lower p90 within 5% of the best robust net', () => {
  const o = bandedOrder([
    { id: 'a', robust: 100, p90: 30000 },
    { id: 'b', robust: 96, p90: 20000 },
    { id: 'c', robust: 90, p90: 10000 }
  ]);

  assert.deepEqual(
    o.map((x) => x.id),
    ['b', 'a', 'c']
  );
});

test('episode statistics are consistent on the fixture door (arithmetic removal, dollar losses)', () => {
  const door = fixtureDoor(400);
  const r = evaluate(
    door,
    effectiveOf({
      ...control4,
      trendFilterEnabled: false,
      drawdownRecoveryGateEnabled: false,
      eligibilityEnabled: false
    })
  );

  assert.equal(Math.round((r.net - r.topMove) * 100) / 100, r.netExTopMove);
  assert.ok(r.lossSum <= 0);
  assert.ok(r.moves <= r.trades);
});

test('sequential policies concatenate slice marks and charge switches', () => {
  const mk = (base: number, vals: number[]) => ({
    boundaryEquity: 0,
    boundaryClose: base,
    t: vals.map((_v, i) => base + i + 1),
    v: vals,
    sliceDrawdown: 0,
    finalEquity: 0
  });
  const s = sequentialOf([
    { cutoff: 'A', id: 'x', sliceNet: 1000, marks: mk(0, [500, -200, 1000]), openAtEnd: true, carriedIn: false },
    { cutoff: 'B', id: 'y', sliceNet: -500, marks: mk(100, [-800, -500]), openAtEnd: false, carriedIn: true },
    { cutoff: 'C', id: null, sliceNet: 0, marks: null, openAtEnd: false, carriedIn: false }
  ]);

  assert.equal(s.switches, 2);
  assert.equal(s.switchCost, 100);
  assert.equal(s.net, 400);
  assert.equal(s.drawdown, 900); // peak 1000 → switch charge 100 → trough 1000 − 100 − 800 = 100
});

test('checkpoints are atomic and refuse other pins', () => {
  const dir = tmp();
  const a = new Checkpointer<{ x: number }>(path.join(dir, 'c.json'), 'j', { p: '1' });

  a.write({ x: 1 });
  a.write({ x: 2 });
  assert.equal(new Checkpointer<{ x: number }>(path.join(dir, 'c.json'), 'j', { p: '1' }).read()!.body.x, 2);
  assert.throws(() => new Checkpointer(path.join(dir, 'c.json'), 'j', { p: '2' }).read());
  fs.writeFileSync(path.join(dir, 'c.json'), '{torn');
  assert.equal(new Checkpointer<{ x: number }>(path.join(dir, 'c.json'), 'j', { p: '1' }).read()!.body.x, 1);
});
