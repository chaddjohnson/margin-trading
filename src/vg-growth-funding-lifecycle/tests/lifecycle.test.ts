// The experimental lifecycles on synthetic minute data (PROTOCOL.md §5, §12; the brief §6): refusal followed by release,
// zero new crossings, a fresh crossing, native eligibility (consumed under L1, retried by the canonical capacity hook),
// breakout decisions, L2 expiry (20 sessions and the earlier native bound), invalidation (predicate, 5% extension),
// repeated refusal without a renewed clock, next-open gaps across a year boundary, no continuation rights from an
// unfunded trade's hypothetical profit, and the pool's tie order between two Growth books. No market data is read.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { simulateTrading } from '../../growth-trading/riseTrading.ts';
import type { RiseTradingParams } from '../../growth-trading/riseTrading.ts';
import { effectiveOf, growthDefaults } from '../../growth140-vgt-s8m/space.ts';
import { d1Placeholder, normalize } from '../../vg-d1-growth-joint/space.ts';
import type { SymDoor } from '../../vg-d1-growth-joint/data.ts';
import { runCoupled } from '../coupled.ts';
import { simulateGrowthLife } from '../growthBook.ts';
import type { Ask, AskKind, LifeSimulation, Mode } from '../lifecycle.ts';
import { doorOf, riseParams } from './fixtures.ts';

// The base path (N = 10, X = 5%): flat at 100, a dip to 95 at s10, a crossing at s11 (101 ≥ 95 × 1.05), then a slow
// rise that keeps the predicate true and never crosses again until the rolling low leaves the dip (s21).
const base = [...Array<number>(10).fill(100), 95, 101, 101.5, 102, 102.5, 103, 103, 103, 103, 103, 103, 103, 103, 103];

const scripted = (answers: boolean[], fallback = true) => {
  const asked: { s: number; t: number; kind: AskKind; a: boolean }[] = [];
  const ask: Ask = (s, t, kind) => {
    const a = answers[asked.length] ?? fallback;

    asked.push({ s, t, kind, a });
    return a;
  };

  return { ask, asked };
};

const sim = (sd: SymDoor, p: RiseTradingParams, mode: Mode, ask: Ask): LifeSimulation =>
  simulateGrowthLife(sd, p, mode, ask).simulation;

const sessionsOf = (r: LifeSimulation) => r.life!.requests.map((q) => `${q.outcome}:${q.kind}@${q.s}`);

describe('L1: a refused request leaves the book flat; no retry', () => {
  const door = doorOf(base);
  const sd = door.sym.VGT;
  const p = riseParams(5, 10);

  test('L0 takes the crossing at s11 (filled at the s12 open)', () => {
    const r = sim(sd, p, 'L0', () => true);

    assert.equal(r.life, null);
    assert.equal(r.trades.length, 1);
    assert.equal(r.trades[0]!.decisionIndex, 11);
    assert.equal(r.trades[0]!.entryIndex, 12);
  });

  test('refused at s11, released at once: no position, and no request until a fresh crossing (none here)', () => {
    const { ask, asked } = scripted([false]);
    const r = sim(sd, p, 'L1', ask);

    assert.deepEqual(sessionsOf(r), ['refused:base@11']);
    assert.equal(asked.length, 1);
    assert.equal(r.trades.length, 0, 'no position from a refused request');
    assert.ok(r.daily.every((d) => !d.heldAtClose));
    assert.equal(r.life!.retained.length, 0, 'L1 keeps nothing');
  });

  test('a fresh crossing after the refusal is a new request (granted, filled at the next open)', () => {
    const path = [...base];

    path[13] = 96; // the predicate turns false (96 < 99.75) …
    path[14] = 101; // … and true again: a fresh crossing
    const r = sim(doorOf(path).sym.VGT, p, 'L1', scripted([false]).ask);

    assert.deepEqual(sessionsOf(r).slice(0, 2), ['refused:base@11', 'granted:base@14']);
    assert.equal(r.trades[0]!.entryIndex, 15);
  });

  test('repeated refusal: each fresh crossing asks once; nothing is queued', () => {
    const path = [...base];

    path[13] = 96;
    path[14] = 101;
    const r = sim(doorOf(path).sym.VGT, p, 'L1', scripted([false, false]).ask);

    assert.deepEqual(sessionsOf(r), ['refused:base@11', 'refused:base@14']);
    assert.equal(r.trades.length, 0);
  });
});

describe('L2: one retained base opportunity', () => {
  const p = riseParams(5, 10);

  test('released at the next bar: reassessed at the s12 close, filled at the s13 open (its own price)', () => {
    const door = doorOf(base);
    const r = sim(door.sym.VGT, p, 'L2', scripted([false]).ask);

    assert.deepEqual(sessionsOf(r), ['refused:base@11', 'granted:retained@12']);
    assert.equal(r.trades.length, 1);
    assert.equal(r.trades[0]!.decisionIndex, 12);
    assert.equal(r.trades[0]!.decisionPrice, 101.5, 'the decision price is the s12 close, not the refused 101');
    assert.equal(r.trades[0]!.entryIndex, 13);
    assert.equal(r.trades[0]!.entryRawPrice, 101.5, 'filled at the next eligible trade');
    assert.equal(r.life!.retained[0]!.end, 'entered');
  });

  test('waiting while the slot is occupied, then entering (the clock is not renewed)', () => {
    const r = sim(doorOf(base).sym.VGT, p, 'L2', scripted([false, false, false]).ask);

    assert.deepEqual(sessionsOf(r), [
      'refused:base@11',
      'waiting:retained@12',
      'waiting:retained@13',
      'granted:retained@14'
    ]);
    assert.equal(r.life!.retained[0]!.waits, 2);
    assert.equal(r.trades[0]!.entryIndex, 15);
  });

  test('invalidated by the 5% extension guard (above 1.05 × the refused 101)', () => {
    const path = [...base];

    path[12] = 106.5;
    const r = sim(doorOf(path).sym.VGT, p, 'L2', scripted([false]).ask);
    const x = r.life!.retained[0]!;

    assert.equal(x.end, 'invalidated');
    assert.match(x.endReason, /extension_exceeded/);
    assert.equal(x.endSession, 12);
    assert.deepEqual(sessionsOf(r), ['refused:base@11']);
  });

  test('repeated waiting until the predicate fails (s21): invalidated, never re-armed', () => {
    const r = sim(doorOf(base).sym.VGT, p, 'L2', scripted([], false).ask);
    const x = r.life!.retained[0]!;

    assert.equal(x.end, 'invalidated');
    assert.match(x.endReason, /predicate_false/);
    assert.equal(x.endSession, 21);
    assert.equal(x.waits, 9, 's12 … s20');
    assert.equal(r.life!.retained.length, 1);
  });

  test('expiry after 20 sessions from the refused decision (waiting all along)', () => {
    const path = [...Array<number>(30).fill(100), 95, 101, ...Array<number>(30).fill(102)];
    const r = sim(doorOf(path).sym.VGT, riseParams(5, 30), 'L2', scripted([], false).ask);
    const x = r.life!.retained[0]!;

    assert.equal(x.refusedSession, 31);
    assert.equal(x.end, 'expired');
    assert.equal(x.endSession, 51);
    assert.equal(x.waits, 20, 's32 … s51');
  });

  test('a next-open gap across a year boundary: the order fills at the gapped opening trade', () => {
    // 2019-12-12 … (25 December and 1 January skipped): s11 = 2019-12-30, s12 = 2019-12-31, s13 = 2020-01-02 (opens at 103.7, a gap)
    const door = doorOf(base, base, '2019-12-12', { 13: 103.7 });

    assert.equal(door.dates[12], '2019-12-31');
    assert.equal(door.dates[13], '2020-01-02');

    const r = sim(door.sym.VGT, p, 'L2', scripted([false]).ask);

    assert.equal(r.trades[0]!.decisionIndex, 12);
    assert.equal(r.trades[0]!.entryIndex, 13);
    assert.equal(r.trades[0]!.entryRawPrice, 103.7);
  });

  test('a fresh canonical decision has precedence and consumes the retained one', () => {
    const path = [...base];

    path[13] = 96;
    path[14] = 101;
    // refused at s11; waiting at s12 (no s13 reassessment: the predicate is false → invalidated)
    const r = sim(doorOf(path).sym.VGT, p, 'L2', scripted([false, false]).ask);

    assert.equal(r.life!.retained[0]!.end, 'invalidated');
    assert.equal(r.life!.retained[0]!.endSession, 13);
    assert.deepEqual(sessionsOf(r).slice(0, 3), ['refused:base@11', 'waiting:retained@12', 'granted:base@14']);
  });
});

describe('native eligibility: L1 consumes a refused opportunity; the canonical capacity hook retries it', () => {
  // the crossing at s11 is deferred by the trend filter (101 vs 100 five sessions earlier: +1% < 3%) and arms a
  // time-limited opportunity (W = 5); at s12 (104 vs 100: +4%) the latched decision asks for capital
  const path = [...Array<number>(10).fill(100), 95, 101, 104, 104.5, 105, 105, 105, 105, 105, 105];
  const p = riseParams(5, 10, {
    trendFilter: { method: 'price_change', lookbackSessions: 5, minimumReturnPercent: 3 },
    eligibility: { policy: 'time_limited', maxAgeSessions: 5 }
  });
  const door = doorOf(path);
  const sd = door.sym.VGT;

  test('L0 decides the latched opportunity at s12', () => {
    const r = sim(sd, p, 'L0', () => true);

    assert.equal(r.trades[0]!.decisionIndex, 12);
  });

  test('L1: refused at s12, the opportunity is consumed (no request at s13 although every condition holds)', () => {
    const r = sim(sd, p, 'L1', scripted([false]).ask);

    assert.deepEqual(sessionsOf(r), ['refused:base@12']);
    assert.equal(r.trades.length, 0);
  });

  test('the canonical capacity hook (audit): blocked at s12, the opportunity stays armed and decides at s13', () => {
    const t12 = sd.ds.sCloseTime[12]!;
    const canonical = simulateTrading(
      sd.ds,
      sim(sd, p, 'L0', () => true).outcomes.map((o) => o.decision),
      {
        symbol: 'VGT',
        firstSession: 0,
        endSession: sd.ds.sessionCount - 1,
        exit: sim(sd, p, 'L0', () => true).exit,
        book: sim(sd, p, 'L0', () => true).book,
        gates: {
          trend: p.trendFilter!,
          eligibility: p.eligibility!,
          bars: sd.bars,
          entry: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 10 },
          capacity: (_s, t) => t !== t12
        }
      }
    );

    assert.equal(canonical.trades[0]!.decisionIndex, 13, 'an automatic funding retry: not L1');
  });

  test('L2: retained with the earlier native bound (s11 + 5 = s16 < s12 + 20) and entered at s13', () => {
    const r = sim(sd, p, 'L2', scripted([false]).ask);
    const x = r.life!.retained[0]!;

    assert.equal(x.origin, 'opportunity:latched:time_limited');
    assert.equal(x.bound, 16);
    assert.equal(x.end, 'entered');
    assert.equal(r.trades[0]!.decisionIndex, 13);
  });

  test('L2 waiting all along expires after the native bound s16', () => {
    const r = sim(sd, p, 'L2', scripted([], false).ask);
    const x = r.life!.retained[0]!;

    assert.equal(x.end, 'expired');
    assert.equal(x.endSession, 16);
    assert.equal(x.waits, 4, 's13 … s16');
  });
});

describe('breakout decisions', () => {
  const path = Array.from({ length: 20 }, (_v, s) => 100 + s);
  const p: RiseTradingParams = {
    ...riseParams(5, 10),
    entryMethod: 'trend_breakout',
    breakout: { smaSessions: 3, slopeComparisonSessions: 1, priorHighSessions: 2 }
  };
  const sd = doorOf(path).sym.VGT;

  test('L1: a refused breakout; the next qualifying session is a fresh decision', () => {
    const r = sim(sd, p, 'L1', scripted([false]).ask);

    assert.deepEqual(sessionsOf(r).slice(0, 2), ['refused:base@3', 'granted:base@4']);
  });

  test('L2: the fresh breakout at s4 consumes the retained one', () => {
    const r = sim(sd, p, 'L2', scripted([false]).ask);

    assert.equal(r.life!.retained[0]!.end, 'consumed_by_entry');
    assert.deepEqual(sessionsOf(r).slice(0, 2), ['refused:base@3', 'granted:base@4']);
  });
});

describe('no continuation rights from an unfunded trade', () => {
  // crossing at s11; up to 115; a drop to 108 stops the position out with a profit at s15; a continuation breakout
  // above the post-exit high at s18
  const path = [...Array<number>(10).fill(100), 95, 101, 105, 110, 115, 108, 106, 107, 112, 112, 112];
  const p = riseParams(5, 10, {
    continuation: { method: 'breakout', windowSessions: 10, bufferPercent: 0, formationBars: 1 }
  });
  const sd = doorOf(path).sym.VGT;

  test('L0: the virtual trade exits with a profit and a continuation trade follows', () => {
    const r = sim(sd, p, 'L0', () => true);

    assert.ok(r.trades[0]!.net > 0);
    assert.equal(r.trades[1]?.setupKind, 'breakout');
  });

  test('L1: refused at s11 → no position, no exit, no continuation window, no continuation request', () => {
    const r = sim(sd, p, 'L1', scripted([false]).ask);

    assert.deepEqual(sessionsOf(r), ['refused:base@11']);
    assert.equal(r.continuation!.episodes.length, 0);
  });
});

describe('the pool: two Growth books deciding at one instant (tie order D1-first: G·GDX before G·VGT)', () => {
  const door = doorOf(base, base);
  const g = effectiveOf({
    ...growthDefaults,
    recentLowLookbackBars: 10,
    maximumHoldEnabled: false,
    trailingStopPercent: 5
  });
  const q = normalize({ d1: { GDX: d1Placeholder, VGT: d1Placeholder }, g: { GDX: g, VGT: g }, first: 'D1' });
  const o = { enabled: { 'D1:GDX': false, 'D1:VGT': false } };

  test('L0: G·GDX is funded; G·VGT is refused but keeps its virtual trade', () => {
    const c = runCoupled(door, q, o, 'L0');

    assert.deepEqual(
      c.result.funding.map((f) => `${f.book}:${f.outcome}`),
      ['G:GDX:granted', 'G:VGT:refused']
    );
    assert.equal(c.books.find((b) => b.book === 'G:VGT')!.trades.length, 1);
  });

  for (const mode of ['L1', 'L2'] as const)
    test(`${mode}: G·VGT is refused at its decision and stays flat; the run is consistent`, () => {
      const c = runCoupled(door, q, o, mode);
      const vgt = c.life['G:VGT']!;

      assert.equal(c.result.lots.length, 1);
      assert.equal(c.result.lots[0]!.book, 'G:GDX');
      assert.equal(vgt.requests[0]!.outcome, 'refused');
      assert.equal(vgt.requests[0]!.s, 11);
      if (mode === 'L2') {
        // the slot stays occupied by G·GDX's open position: the retained opportunity waits, then the predicate fails
        assert.equal(vgt.retained[0]!.end, 'invalidated');
        assert.ok(vgt.requests.slice(1).every((x) => x.outcome === 'waiting'));
      } else assert.equal(vgt.requests.length, 1);
    });
});
