// Growth's maximum hold under the two hold units: the plain exit path (the D1 ExitManager through exitParamsOf) and the
// optional-rules evaluator (an initial risk stop ON, src/growth-trading/optionalRules.ts). The experimental 'sessions'
// unit reaches both through the exit parameters' `holdUnit`; absent, the calendar-day behaviour is unchanged.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { type Dataset, fixtureDataset } from '../../four-family/data.ts';
import type { HoldUnit } from '../../shared-margin-portfolio/strategy.ts';
import {
  type EntryDecision,
  type RiseTradingParams,
  bookSettingsOf,
  defaultTradingParams,
  exitParamsOf,
  simulateTrading
} from '../riseTrading.ts';

const session = (date: string, open: number, closes: number[]): MarketSession => {
  const time = Date.parse(`${date}T00:00:00Z`) / 1000;
  const openTime = time + (14 * 60 + 30) * 60;
  const bars: Tick[] = closes.map((close, k) => {
    const o = k === 0 ? open : closes[k - 1]!;

    return {
      time: openTime + k * 60,
      open: o,
      high: Math.max(o, close),
      low: Math.min(o, close),
      close,
      volume: 1,
      trades: NaN
    };
  });

  return {
    date,
    time,
    openTime,
    closeTime: time + 21 * 3600,
    isEarlyClose: false,
    bars,
    open,
    high: Math.max(...bars.map((b) => b.high)),
    low: Math.min(...bars.map((b) => b.low)),
    close: closes.at(-1)!,
    volume: bars.length,
    trades: NaN,
    closingPrint: closes.at(-1)!
  };
};

// Late June / early July 2024 around Independence Day. The decision is at the close of 07-02; the entry fills at the
// opening trade of 07-03 (the hold session); every later session opens at 99.5 (a loss at the open).
const dates = [
  '2024-06-26',
  '2024-06-27',
  '2024-06-28',
  '2024-07-01',
  '2024-07-02',
  '2024-07-03',
  '2024-07-05',
  '2024-07-08',
  '2024-07-09',
  '2024-07-10',
  '2024-07-11'
];
const ds: Dataset = fixtureDataset(
  // true ranges of 2 before the entry, so that the (wide) initial stop has an ATR and sits far below every price
  dates.map((d) =>
    d < '2024-07-03'
      ? session(d, 100, [101, 99, 100])
      : d === '2024-07-03'
        ? session(d, 100, [100, 100, 100])
        : session(d, 99.5, [99.5, 99.5, 99.5])
  )
);
const decisionAt = (date: string): EntryDecision => {
  const s = ds.dates.indexOf(date);

  return {
    id: `close${s}`,
    sessionIndex: s,
    time: ds.sCloseTime[s]!,
    price: ds.sClose[s]!,
    trigger: NaN,
    reference: NaN
  };
};

const run = (hold: number, unit: HoldUnit | undefined, initialStop: boolean) => {
  const p: RiseTradingParams = {
    ...defaultTradingParams,
    trailingStopPercent: 5,
    costBpsPerSide: 0,
    maximumHoldEnabled: true,
    maximumHoldDays: hold,
    intradayLossBufferEnabled: false
  };
  const exit = unit ? { ...exitParamsOf(p), holdUnit: unit } : exitParamsOf(p);
  const sim = simulateTrading(ds, [decisionAt('2024-07-02')], {
    symbol: 'TEST',
    firstSession: 0,
    endSession: ds.sessionCount - 1,
    exit,
    book: bookSettingsOf(p),
    // a wide initial stop (never reached) only routes the exits through the optional-rules evaluator
    rules: initialStop ? { initialStop: { atrSessions: 2, atrMultiple: 50 }, retention: null } : null
  });
  const t = sim.trades[0]!;

  return {
    entry: ds.dates[t.entryIndex],
    exit: t.exitIndex >= 0 ? ds.dates[t.exitIndex] : null,
    reason: String(t.exitReason)
  };
};

describe('Growth maximum hold: calendar days (default) versus trading sessions', () => {
  for (const initialStop of [false, true])
    it(`${initialStop ? 'optional-rules evaluator (initial stop ON)' : 'plain exit path'}: the hold counts calendar days or sessions from the entry session`, () => {
      // entry 07-03; calendar 3 days → 07-08 (5 days; 07-05 is 2); sessions 3 → 07-09 (07-05 = 1, 07-08 = 2)
      const cal = run(3, undefined, initialStop);
      const ses = run(3, 'sessions', initialStop);

      assert.equal(cal.entry, '2024-07-03');
      assert.equal(cal.exit, '2024-07-08');
      assert.equal(ses.exit, '2024-07-09');
      assert.match(cal.reason, /maximum.hold/);
      assert.match(ses.reason, /maximum.hold/);
      // the boundary: 2 sessions → 07-08; 1 session → 07-05 (the holiday never counts)
      assert.equal(run(2, 'sessions', initialStop).exit, '2024-07-08');
      assert.equal(run(1, 'sessions', initialStop).exit, '2024-07-05');
      assert.equal(run(2, undefined, initialStop).exit, '2024-07-05');
      // the default equals an explicit calendar-days unit
      for (const hold of [1, 2, 3, 4, 5, 6])
        assert.deepEqual(run(hold, undefined, initialStop), run(hold, 'calendar-days', initialStop));
    });
});
