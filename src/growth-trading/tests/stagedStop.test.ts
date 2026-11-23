// Growth engine revision 1.5.0: the S1 staged trailing stop on deterministic synthetic sessions
// (research/vg-l0-staged-stop/RULE_SPECIFICATION.md §1). Sessions are consecutive calendar days from 2018-01-01; each
// minute opens at the previous close. A decision at the close of session 2 fills at 100 at the next open; τ₁ = 5 %,
// A = 10 % (activation price 110), τ₂ = 2 %. Checked: the staged exit and its counters on the plain path; the same
// trade when the optional rules' manager runs the hook (initial stop ON, not hit); arming on the entry session (the
// hook inside onFill, before the entry-session evaluation) acting from the next session; retention's partial sale at
// the stage-2 level with the remainder untouched by it (sold by the trend exit); a stage that never arms equals OFF on
// every record (trades, marks, rules); an invalid staged configuration is refused.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { type Dataset, fixtureDataset } from '../../four-family/data.ts';
import type { InitialStopConfig, RetentionConfig } from '../optionalRules.ts';
import {
  type EntryDecision,
  type RiseTradingParams,
  bookSettingsOf,
  defaultTradingParams,
  exitParamsOf,
  simulateTrading
} from '../riseTrading.ts';
import type { StagedBookConfig } from '../../staged-stop/config.ts';

type Bar = readonly [open: number, high: number, low: number, close: number];
const c = (...closes: number[]): Bar[] =>
  closes.map((x, i) => {
    const o = i ? closes[i - 1]! : x;
    return [o, Math.max(o, x), Math.min(o, x), x] as const;
  });
const dateOf = (day: number) => new Date(Date.parse('2018-01-01') + day * 86_400_000).toISOString().slice(0, 10);
const sessionsOf = (specs: Bar[][]): MarketSession[] =>
  specs.map((spec, i) => {
    const date = dateOf(i);
    const time = Date.parse(date) / 1000;
    const openTime = time + (14 * 60 + 30) * 60;
    const bars: Tick[] = spec.map(([open, high, low, close], k) => ({
      time: openTime + k * 60,
      open,
      high,
      low,
      close,
      volume: 1000,
      trades: NaN
    }));
    const last = bars.at(-1)!.close;

    return {
      date,
      time,
      openTime,
      closeTime: time + 21 * 3600,
      isEarlyClose: false,
      bars,
      open: bars[0]!.open,
      high: Math.max(...bars.map((b) => b.high)),
      low: Math.min(...bars.map((b) => b.low)),
      close: last,
      volume: 1000 * bars.length,
      trades: NaN,
      closingPrint: last
    };
  });
const atClose = (ds: Dataset, s: number): EntryDecision => ({
  id: `close${s}`,
  sessionIndex: s,
  time: ds.sCloseTime[s]!,
  price: ds.sClose[s]!,
  trigger: NaN,
  reference: NaN
});

const P: RiseTradingParams = { ...defaultTradingParams, trailingStopPercent: 5, costBpsPerSide: 0 };
const ST: StagedBookConfig = { activationTenths: 100, stage2Tenths: 20 };
const RETAIN: RetentionConfig = { sellPercent: 50, smaSessions: 3, closesBelow: 2 };
const WIDE: InitialStopConfig = { atrSessions: 2, atrMultiple: 5 };

const sim = (
  specs: Bar[][],
  staged: StagedBookConfig | null,
  rules: { initialStop?: InitialStopConfig; retention?: RetentionConfig } | null = null
) => {
  const ds = fixtureDataset(sessionsOf(specs));

  return simulateTrading(ds, [atClose(ds, 2)], {
    symbol: 'TEST',
    firstSession: 0,
    endSession: ds.sessionCount - 1,
    exit: exitParamsOf(P),
    book: bookSettingsOf(P),
    rules: rules ? { initialStop: rules.initialStop ?? null, retention: rules.retention ?? null } : null,
    ...(staged ? { staged, stagedDetail: true } : {})
  });
};

// fill 100 (s3, entry H 105); s4 high 111 ≥ 110: armed, level 111 × 0.98 = 108.78; s5 dips to 108
// (the three sessions before the fill trade a 3-point range, so an ATR initial stop sits well below the fill)
const PRE = [c(100, 97, 100), c(100, 97, 100), c(100, 97, 100)];
const WINNER = [...PRE, c(100, 103, 105), c(105, 108, 111), c(110, 108, 109), c(109, 112), c(112, 106), c(106), c(106)];

describe('the staged stop on the plain Growth path (no optional rules)', () => {
  test('arms at the close reaching 110; exits at 108.78 the next session (stage 1 alone: 106.4 two sessions later)', () => {
    const on = sim(WINNER, ST);
    const off = sim(WINNER, null);

    assert.equal(on.trades.length, 1);
    assert.equal(on.trades[0]!.exitIndex, 5);
    assert.equal(on.trades[0]!.exitReason, 'trailing stop');
    assert.equal(on.trades[0]!.exitRawPrice, 111 * (1 - 20 / 1000));
    assert.deepEqual(on.staged!.lite(), { arms: 1, stagedExits: 1, placementExits: 0 });
    assert.equal(off.trades[0]!.exitIndex, 7);
    assert.equal(off.trades[0]!.exitRawPrice, 112 * 0.95);
    assert.equal(off.staged, undefined);
  });

  test('a stage that never arms equals OFF on every record', () => {
    const on = sim(WINNER, { activationTenths: 500, stage2Tenths: 20 });
    const off = sim(WINNER, null);
    const { staged, ...rest } = on;

    assert.equal(staged!.arms, 0);
    assert.deepEqual(rest, off);
  });

  test('an invalid configuration is refused (A below the no-early-lock minimum for τ₁ 5 %)', () => {
    assert.throws(() => sim(WINNER, { activationTenths: 53, stage2Tenths: 20 }), /early-lock/);
    assert.throws(() => sim(WINNER, { activationTenths: 100, stage2Tenths: 46 }), /tighter/);
  });
});

describe('the staged stop with the optional rules (the hook inside onFill)', () => {
  test('initial stop ON and never hit: the same staged trade as the plain path', () => {
    const rules = sim(WINNER, ST, { initialStop: WIDE });
    const plain = sim(WINNER, ST);

    assert.equal(rules.trades[0]!.exitIndex, plain.trades[0]!.exitIndex);
    assert.equal(rules.trades[0]!.exitRawPrice, plain.trades[0]!.exitRawPrice);
    assert.equal(rules.trades[0]!.net, plain.trades[0]!.net);
    assert.deepEqual(rules.staged!.lite(), plain.staged!.lite());
  });

  test('arming on the entry session (from the fill minute) acts from the next session, on both paths', () => {
    // s3 trades from 100 to a high of 111 and closes at 107: armed at the fill (level 108.78 > 107, placed); s4 opens 107
    const specs = [
      ...PRE,
      [
        [100, 100, 100, 100],
        [100, 111, 100, 109],
        [109, 109, 107, 107]
      ] as Bar[],
      c(107, 108),
      c(108)
    ];

    for (const rules of [null, { initialStop: WIDE }]) {
      const s = sim(specs, ST, rules);
      const t = s.trades[0]!;

      assert.equal(t.entryIndex, 3);
      assert.equal(t.exitIndex, 4);
      assert.equal(t.exitReason, 'trailing stop gap');
      assert.equal(t.exitRawPrice, 107);
      assert.deepEqual(s.staged!.lite(), { arms: 1, stagedExits: 1, placementExits: 1 });
      assert.equal(s.staged!.rows![0]!.armedS, 3);
    }
  });

  test('retention: the partial sale happens at the stage-2 level; the remainder is never sold by it (trend exit)', () => {
    // after the partial sale at 108.78 (s5) the remainder trades at 108.5 → 107 → 106 (below 108.78) without a trailing
    // exit, then two closes below the 3-session SMA sell it
    const specs = [
      ...WINNER.slice(0, 6),
      c(109, 108.5),
      c(108.5, 107),
      c(107, 106),
      c(106, 104),
      c(104, 102),
      c(102),
      c(102)
    ];
    const s = sim(specs, ST, { retention: RETAIN });
    const pos = s.rules!.positionOf(s.trades[0]!)!;

    assert.equal(pos.fills.length, 2);
    assert.equal(pos.fills[0]!.partial, true);
    assert.equal(pos.fills[0]!.rawPrice, 111 * (1 - 20 / 1000));
    assert.equal(String(pos.fills[0]!.reason), 'trailing stop');
    assert.equal(String(pos.fills[1]!.reason), 'trend exit');
    assert.deepEqual(s.staged!.lite(), { arms: 1, stagedExits: 1, placementExits: 0 });
  });

  test('a stage that never arms equals OFF with the rules too', () => {
    for (const rules of [{ initialStop: WIDE }, { retention: RETAIN }, { initialStop: WIDE, retention: RETAIN }]) {
      const on = sim(WINNER, { activationTenths: 500, stage2Tenths: 20 }, rules);
      const off = sim(WINNER, null, rules);
      const { staged, rules: r1, ...rest } = on;
      const { rules: r0, ...restOff } = off;

      assert.equal(staged!.arms, 0);
      assert.deepEqual(rest, restOff);
      assert.deepEqual(
        [...r1!.positions.values()].map((p) => p.fills),
        [...r0!.positions.values()].map((p) => p.fills)
      );
    }
  });
});
