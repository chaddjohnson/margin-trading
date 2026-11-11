// Lifecycle cases the brief names that Priority 5A's synthetic tests did not cover (PROTOCOL.md §12), on 5A's synthetic
// minute fixtures (no market data): minimum-strength eligibility with a > X under L0, L1 and L2 (an ordinary crossing
// never asks for capital; a refused violent crossing is consumed under L1 and retained under L2), and L2 supersession
// (a newer refused base request replaces the retained one; its clock starts at its own refusal).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { RiseTradingParams } from '../../growth-trading/riseTrading.ts';
import type { SymDoor } from '../../vg-d1-growth-joint/data.ts';
import { simulateGrowthLife } from '../../vg-growth-funding-lifecycle/growthBook.ts';
import type { Ask, LifeSimulation, Mode } from '../../vg-growth-funding-lifecycle/lifecycle.ts';
import { doorOf, riseParams } from '../../vg-growth-funding-lifecycle/tests/fixtures.ts';
import { lifeBookOf as p5aLifeBookOf } from '../../vg-growth-funding-lifecycle/growthBook.ts';
import { lifeBookOf } from '../lifeBook.ts';
import { placeholder } from '../config.ts';

const scripted = (answers: boolean[], fallback = true) => {
  const asked: number[] = [];
  const ask: Ask = (s) => {
    const a = answers[asked.length] ?? fallback;

    asked.push(s);
    return a;
  };

  return { ask, asked };
};
const sim = (sd: SymDoor, p: RiseTradingParams, mode: Mode, ask: Ask): LifeSimulation => simulateGrowthLife(sd, p, mode, ask).simulation;
const requests = (r: LifeSimulation) => r.life!.requests.map((q) => `${q.outcome}:${q.kind}@${q.s}`);

describe('minimum-strength eligibility with a > X (X 5%, a 8%), no trend filter', () => {
  const p = riseParams(5, 10, { eligibility: { policy: 'minimum_strength', maxAgeSessions: 10, minimumAdvancePercent: 8 } });

  test('an ordinary crossing (101 over a 95 low: 6.3% < 8%) is invalidated at arming in every lifecycle: no request at all', () => {
    const sd = doorOf([...Array<number>(10).fill(100), 95, 101, 101.5, 102, 102, 102, 102]).sym.VGT;

    for (const mode of ['L0', 'L1', 'L2'] as const) {
      const { ask, asked } = scripted([], true);
      const r = sim(sd, p, mode, ask);

      assert.equal(r.trades.length, 0, mode);
      assert.equal(asked.length, 0, `${mode}: a vetoed crossing never asks the allocator`);
      assert.equal(r.outcomes[0]!.status, 'vetoed');
    }
  });

  test('a violent crossing (103.5 ≥ 95 × 1.08) refused under L1 is consumed although the strength still holds next session', () => {
    const sd = doorOf([...Array<number>(10).fill(100), 95, 103.5, 104, 104.5, 105, 105, 105, 105]).sym.VGT;
    const l0 = sim(sd, p, 'L0', () => true);

    assert.equal(l0.trades[0]!.decisionIndex, 11);

    const l1 = sim(sd, p, 'L1', scripted([false]).ask);

    assert.deepEqual(requests(l1), ['refused:base@11']);
    assert.equal(l1.trades.length, 0);

    const l2 = sim(sd, p, 'L2', scripted([false]).ask);

    assert.equal(l2.life!.retained[0]!.end, 'entered');
    assert.equal(l2.trades[0]!.decisionIndex, 12, 'L2: retained, re-assessed at the next close (strength holds) and entered at the then-current price');
  });
});

describe('L2 supersession', () => {
  // a breakout signals on every qualifying session close: with every request refused, the fresh breakout at s4 is a
  // newer refused base request and supersedes the opportunity retained at s3
  const path = Array.from({ length: 20 }, (_v, s) => 100 + s);
  const p: RiseTradingParams = {
    ...riseParams(5, 10),
    entryMethod: 'trend_breakout',
    breakout: { smaSessions: 3, slopeComparisonSessions: 1, priorHighSessions: 2 }
  };
  const sd = doorOf(path).sym.VGT;

  test('a newer refused base request supersedes the retained one (its own clock)', () => {
    const r = sim(sd, p, 'L2', scripted([], false).ask);
    const [first, second] = r.life!.retained;

    assert.equal(first!.end, 'superseded');
    assert.equal(first!.refusedSession, 3);
    assert.equal(second!.refusedSession, 4);
    assert.equal(second!.bound, 4 + 20, 'the newer one counts from its own refusal');
    assert.equal(r.trades.length, 0);
  });
});

describe('A1: an L2 retained order granted at the door’s last session', () => {
  // Rise 5% / 20 bars: the crossing at s21 (101 over a 95 low) is refused and retained; at s22 the slot is still
  // occupied (waiting); at s23 — the door's last session — the reassessment is granted: the order is never filled
  const door = doorOf([...Array<number>(20).fill(100), 95, 101, 101.5, 102]);
  const g = { ...placeholder, maximumHoldEnabled: false } as typeof placeholder;

  test('5A’s book omits it; this study’s book records it (granted, unfilled, reserving the slot to the end)', () => {
    const s5a = scripted([false, false, true]);
    const p5a = p5aLifeBookOf(door.sym.VGT, door, g, 'L2', s5a.ask);
    const mine = scripted([false, false, true]);
    const b = lifeBookOf(door.sym.VGT, door, g, 'L2', mine.ask);

    assert.deepEqual(s5a.asked, [21, 22, 23]);
    assert.equal(p5a.life!.requests.at(-1)!.outcome, 'granted');
    assert.equal(p5a.trades.filter((t) => t.dS === 23).length, 0, '5A: no record for the granted request at s23');

    const last = b.trades.filter((t) => t.dS === 23);

    assert.equal(last.length, 1);
    assert.equal(last[0]!.eS, -1);
    assert.equal(b.trades.length, p5a.trades.length + 1);
  });

  test('without the end-of-door case the book is 5A’s, record for record', () => {
    const b = lifeBookOf(door.sym.VGT, door, g, 'L2', scripted([false, true]).ask);
    const p = p5aLifeBookOf(door.sym.VGT, door, g, 'L2', scripted([false, true]).ask);

    assert.deepEqual(b.trades, p.trades);
  });
});
