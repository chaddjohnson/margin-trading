// The independent real position (position.ts) on a synthetic two-symbol door with dips and rebounds (PROTOCOL.md §5.3,
// §12.1): re-simulated from each virtual trade's own decision instant it reproduces every virtual trade of both
// families exactly (D1, and Growth with and without the initial risk stop and trend retention); from a later instant
// it is a NEW position — entered at the first trade at or after that instant at its own price, with its own trailing
// stop, holding clock and interest — whatever the hypothetical trade does. No market data is read.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { runD1Book, runGrowthBook, type D1Grid } from '../../vg-d1-growth-joint/books.ts';
import { fixtureDoorOf } from '../../vg-d1-growth-joint/data.ts';
import type { GConfig, Quad } from '../../vg-d1-growth-joint/space.ts';
import { effectiveOf } from '../../vg-d1-growth-joint/space.ts';
import { realSpecsOf } from '../evaluate.ts';
import { realPathOf } from '../position.ts';

const spm = 60;
const bars = 30;

// a base price path with two deep dips and rebounds, intraday wiggles
const basePrice = (s: number) => {
  if (s < 30) return 100 + 0.1 * s;
  if (s < 36) return 103 - 5 * (s - 29); // to 73
  if (s < 60) return 73 + 1.1 * (s - 35);
  if (s < 66) return 99.4 - 4.5 * (s - 59);
  if (s < 90) return 72.4 + 0.9 * (s - 65);
  return 94 - 0.3 * (s - 89);
};

const session = (date: string, s: number, scale: number): MarketSession => {
  const time = Date.parse(date) / 1000;
  const openTime = time + (14 * 60 + 30) * spm;
  const closeTime = openTime + bars * spm;
  const closes = Array.from(
    { length: bars },
    (_v, k) => scale * basePrice(s + k / bars) * (1 + 0.004 * Math.sin(k * 1.7 + s))
  );
  const ticks: Tick[] = closes.map((close, k) => {
    const open = k === 0 ? scale * basePrice(s) : closes[k - 1]!;

    return {
      time: openTime + k * spm,
      open,
      high: Math.max(open, close) * 1.001,
      low: Math.min(open, close) * 0.999,
      close,
      volume: 1000,
      trades: NaN
    };
  });

  return {
    date,
    time,
    openTime,
    closeTime,
    isEarlyClose: false,
    bars: ticks,
    open: ticks[0]!.open,
    high: Math.max(...ticks.map((b) => b.high)),
    low: Math.min(...ticks.map((b) => b.low)),
    close: closes.at(-1)!,
    volume: 1000 * bars,
    trades: NaN,
    closingPrint: closes.at(-1)!
  };
};

const n = 120;
const dates: string[] = [];

for (let d = Date.parse('2019-01-02'); dates.length < n; d += 86400 * 1000) {
  const wd = new Date(d).getUTCDay();

  if (wd !== 0 && wd !== 6) dates.push(new Date(d).toISOString().slice(0, 10));
}

const door = fixtureDoorOf('dips', {
  GDX: dates.map((date, s) => session(date, s, 0.3)),
  VGT: dates.map((date, s) => session(date, s, 2))
});
const end = n - 1;

const d1: D1Grid = {
  targetPercentChange: 200,
  trailingBuyPercentage: 10,
  trailingStopPercentage: 50,
  maximumHoldDays: 6,
  tickWindowSize: 20,
  intradayLossBuffer: 20,
  pullback: 100,
  continuationWindow: 20
};
const growthBase: GConfig = effectiveOf({
  entryMethod: 'rise_from_recent_low',
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 20,
  trendFilterEnabled: false,
  eligibilityEnabled: false,
  drawdownRecoveryGateEnabled: false,
  trailingStopPercent: 4,
  maximumHoldEnabled: true,
  maximumHoldDays: 9,
  intradayLossBufferEnabled: true,
  intradayLossBufferPercent: 2,
  initialStopEnabled: false,
  retentionEnabled: false,
  continuationEnabled: false,
  costBpsPerSide: 5
} as GConfig);
const growthRules: GConfig = effectiveOf({
  ...growthBase,
  initialStopEnabled: true,
  initialStopAtrSessions: 5,
  initialStopAtrMultiple: 1.5,
  retentionEnabled: true,
  retentionSellPercent: 50,
  retentionSmaSessions: 10,
  retentionClosesBelow: 2
} as GConfig);

const quadOf = (g: GConfig): Quad => ({ d1: { GDX: d1, VGT: d1 }, g: { GDX: g, VGT: g }, first: 'D1' });

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

describe('the independent real position', () => {
  for (const [label, g] of [
    ['plain Growth exits', growthBase],
    ['Growth with the initial risk stop and retention', growthRules]
  ] as const) {
    test(`re-simulated from each virtual trade's decision it equals the virtual trade (D1; ${label})`, () => {
      const q = quadOf(g);
      const specs = realSpecsOf(door, q, {});
      let checked = 0;

      for (const s of ['GDX', 'VGT'] as const) {
        const vb = [
          runD1Book(door.sym[s].ds, s, d1, { armStart: 0, accountingStart: 0, endIndex: end }),
          runGrowthBook(door.sym[s], door, g)
        ];

        for (const b of vb) {
          assert.ok(b.trades.length > 0, `${b.book} trades on the synthetic dips`);
          for (const v of b.trades) {
            const p = realPathOf(specs[b.book]!, v.dS, v.dT, end);

            assert.equal(p.eS, v.eS, `${b.book} #${v.id} entry session`);
            assert.equal(p.eK, v.eK);
            if (v.eS >= 0) {
              assert.equal(p.eT, v.eT);
              assert.equal(p.ePrice, v.ePrice);
            }
            assert.ok(same(p.fills, v.fills), `${b.book} #${v.id} fills`);
            assert.equal(p.open, v.open);
            checked++;
          }
        }
      }

      assert.ok(checked >= 6, `${checked} trades checked`);
    });
  }

  test('from a later instant: a new position with its own entry, price, trailing stop and holding clock', () => {
    const q = quadOf(growthBase);
    const specs = realSpecsOf(door, q, {});
    const ds = door.sym.VGT.ds;
    const vb = runD1Book(ds, 'VGT', d1, { armStart: 0, accountingStart: 0, endIndex: end });
    // the hypothetical trade that rides the second rebound to its top and exits on the slow decline after it
    const v = vb.trades.findLast((t) => t.eS >= 0 && t.fills.length > 0 && t.fills[0]!.s - t.eS >= 20)!;

    assert.ok(v, 'a virtual D1 trade lasting ≥ 20 sessions');

    // a delayed entry near the top: its own post-entry high, stop and holding clock (a loss at the open after the
    // maximum hold sells it, long before the hypothetical trade's own trailing stop)
    const s1 = v.fills[0]!.s - 7;
    const D = ds.bTime[ds.sBarStart[s1]! + 10]! + 60;
    const p = realPathOf(specs['D1:VGT']!, s1, D, end);

    assert.equal(p.eS, s1);
    assert.equal(p.eT, D, 'the first trade at or after D (a bar starts every minute)');
    assert.equal(p.eRaw, ds.bOpen[ds.sBarStart[s1]! + 11]!);
    assert.equal(p.ePrice, p.eRaw * (1 + 5 / 10000), 'its own cost basis');
    assert.notEqual(p.ePrice, v.ePrice, 'nothing inherited from the hypothetical entry');
    assert.ok(p.fills.length > 0 && p.fills[0]!.s > s1, 'D1 never exits on its entry session');
    if (p.fills.at(-1)!.reason === 'maximum hold')
      assert.ok(
        (ds.sTime[p.fills.at(-1)!.s]! - ds.sTime[s1]!) / 86400 >= d1.maximumHoldDays,
        'the holding clock starts at the delayed entry'
      );
    assert.ok(!same(p.fills, v.fills), 'its exits are its own');
    assert.ok(p.fills[0]!.s < v.fills[0]!.s, 'it exits before the hypothetical trade');
  });

  test('a decision at the close fills at the next session’s first trade; a decision outside its session is refused', () => {
    const q = quadOf(growthBase);
    const specs = realSpecsOf(door, q, {});
    const ds = door.sym.GDX.ds;
    const p = realPathOf(specs['D1:GDX']!, 40, ds.sCloseTime[40]!, end);

    assert.equal(p.eS, 41);
    assert.equal(p.eK, 0);
    assert.throws(() => realPathOf(specs['D1:GDX']!, 40, ds.sCloseTime[40]! + 1, end), /not inside its session/);
  });
});
