// The six mechanisms on constructed sessions (expected outcomes asserted) and their degenerate settings on
// the real research data (each must then equal its base family exactly).
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import type { MarketSession } from '#types';
import {
  type Dataset,
  ReferenceHighCache,
  computeReferenceHighs,
  defaultDataFile,
  fixtureDataset,
  loadSessions,
  researchDataset
} from '../../four-family/data.ts';
import { type SessionSpec, bar, buildSessions, weekdays } from '../../four-family/tests/fixtures.ts';
import { Rng } from '../../optimizer/rng.ts';
import { replay } from '../accounting.ts';
import { type FamilyFlags, type StrategyParams, type Trade, baseFlags, simulate } from '../engine.ts';
import { type IntParams, families, familySpecs, genomeToParams, gridSize, toStrategyParams } from '../families.ts';

const flat = (minutes: number, price: number, from = 0) =>
  Array.from({ length: minutes }, (_value, minute) => bar(from + minute, price, price + 0.1, price - 0.1, price));

const params = (overrides: Partial<StrategyParams> = {}): StrategyParams => ({
  targetPercentChange: 0.05,
  trailingBuyPercentage: 0.03,
  trailingStopPercentage: 0.08,
  maximumHoldDays: 15,
  tickWindowSize: 3,
  materialLossThreshold: NaN,
  lowerPriceReentry: NaN,
  retraceFraction: NaN,
  intradayLossBuffer: NaN,
  invalidationBuffer: NaN,
  episodeLossBudget: NaN,
  episodeResetRetrace: NaN,
  reboundDepthSlope: NaN,
  initialFraction: NaN,
  addTrigger: NaN,
  progressThreshold: NaN,
  holdExtensionDays: NaN,
  confirmMinutes: NaN,
  ...overrides
});

const flags = (overrides: Partial<FamilyFlags> = {}): FamilyFlags => ({ ...baseFlags(false, false), ...overrides });

const run = (
  sessions: MarketSession[],
  family: FamilyFlags,
  strategy: StrategyParams,
  stopFill: 'stop' | 'next-open' = 'stop'
) => {
  const ds = fixtureDataset(sessions);
  const result = simulate(
    ds,
    computeReferenceHighs(ds, strategy.tickWindowSize),
    family,
    strategy,
    {
      stopFill,
      marginInterestRate: 0.11,
      investment: 100000,
      firstIndex: 0,
      armStart: strategy.tickWindowSize,
      endIndex: ds.sessionCount - 1
    },
    true
  );
  const accounting = replay(ds, result.trades, {
    firstIndex: 0,
    endIndex: ds.sessionCount - 1,
    marginInterestRate: 0.11,
    dailyMarks: true
  });

  return { ds, result, accounting };
};

// Four flat sessions at 100, then a session that dips to 90 at minute 10 and rebounds to 93 at minute 11, so
// that the base enters at minute 12's open (93) on the fifth session (index 4, a Friday).
const dates = weekdays('2018-06-04', 20);
const dipDay = (date: string, afterEntry: ReturnType<typeof bar>[] = flat(378, 93, 12)): SessionSpec => ({
  date,
  bars: [...flat(10, 100), bar(10, 100, 100, 90, 90), bar(11, 90, 93, 90, 93), ...afterEntry],
  closingPrint: afterEntry.at(-1)?.close ?? 93
});
const flatDay = (date: string, price: number): SessionSpec => ({ date, bars: flat(390, price), closingPrint: price });
const prelude = dates.slice(0, 4).map((date) => flatDay(date, 100));

describe('failed-recovery invalidation exit', () => {
  const sessions = buildSessions([
    ...prelude,
    dipDay(dates[4]!),
    // Below the trough minus 2% (88.2) on minute 10's close; the sale fills at minute 11's open.
    { date: dates[5]!, bars: [...flat(10, 92), bar(10, 92, 92, 88, 88), ...flat(379, 88.5, 11)], closingPrint: 88.5 },
    flatDay(dates[6]!, 89)
  ]);

  test('sells at the next trade after the first close at or below the level; the base stays in', () => {
    const base = run(sessions, flags(), params());
    const variant = run(sessions, flags({ invalidation: true }), params({ invalidationBuffer: 0.02 }));
    const [trade] = variant.result.trades;

    assert.equal(base.result.trades[0]?.reason, 'open');
    assert.equal(trade?.entryIndex, 4);
    assert.equal(trade?.entryBar, 12);
    assert.equal(trade?.entryPrice, 93);
    assert.equal(trade?.trailingLow, 90);
    assert.ok(Math.abs(trade!.invalidationLevel - 90 * 0.98) < 1e-9);
    assert.equal(trade?.reason, 'failed recovery');
    assert.equal(trade?.exitIndex, 5);
    assert.equal(trade?.exitBar, 11);
    assert.equal(trade?.exitPrice, 88.5);
    assert.equal(trade?.exitExecution, 'first trade after decision');
    assert.equal(trade?.bufferSignalTime, sessions[5]!.bars[10]!.time + 60);
    assert.equal(trade?.bufferSignalPrice, 88);
    assert.equal(variant.result.counts.invalidationExits, 1);
    assert.equal(variant.result.counts.losingExits, 1);
  });

  test('a signal on the last minute without a closing print fills at the next opening trade', () => {
    const late = buildSessions([
      ...prelude,
      dipDay(dates[4]!),
      { date: dates[5]!, bars: [...flat(389, 92), bar(389, 92, 92, 88, 88)], closingPrint: undefined },
      flatDay(dates[6]!, 89)
    ]);
    const variant = run(late, flags({ invalidation: true }), params({ invalidationBuffer: 0.02 }));
    const [trade] = variant.result.trades;

    assert.equal(trade?.reason, 'failed recovery');
    assert.equal(trade?.exitIndex, 6);
    assert.equal(trade?.exitBar, 0);
    assert.equal(trade?.exitExecution, 'opening trade');
    assert.equal(trade?.exitPrice, 89);
    assert.equal(trade?.bufferSignalTime, late[5]!.closeTime);
  });

  test('a gap through an active stop at the open takes precedence over a pending invalidation', () => {
    // Monday flat at 100 (stop 92, inactive). Tuesday spikes to 112 (the stop for Wednesday becomes 103.04,
    // active) and closes its last minute at 88 with no closing print: a pending invalidation. Wednesday gaps
    // open at 95, below the stop: the resting stop takes the opening trade.
    const gap = buildSessions([
      ...prelude,
      dipDay(dates[4]!),
      flatDay(dates[5]!, 100),
      {
        date: dates[6]!,
        bars: [...flat(100, 100), bar(100, 100, 112, 100, 110), ...flat(288, 105, 101), bar(389, 105, 105, 88, 88)],
        closingPrint: undefined
      },
      flatDay(dates[7]!, 95)
    ]);
    const variant = run(gap, flags({ invalidation: true }), params({ invalidationBuffer: 0.02 }));
    const [trade] = variant.result.trades;

    assert.equal(trade?.reason, 'trailing stop gap');
    assert.equal(trade?.exitIndex, 7);
    assert.equal(trade?.exitBar, 0);
    assert.equal(trade?.exitPrice, 95);
    assert.ok(Math.abs(trade!.exitStopPrice - 112 * 0.92) < 1e-9);
  });
});

describe('correction-episode loss budget', () => {
  // Entry at 93 on Friday; Monday opens at 90 and the 3-day maximum hold sells at a loss of about $3,300,
  // more than the 2% ($2,000) budget. Tuesday dips again (89 against the 100 reference high) but can't arm;
  // Wednesday closes at 97, above the reset level 89 + 50% x (100 - 89) = 94.5, so the episode ends.
  // Thursday dips to 90 against the new reference high (97) and rebounds to 93: a new episode and entry.
  const sessions = buildSessions([
    ...prelude,
    dipDay(dates[4]!),
    flatDay(dates[5]!, 90),
    flatDay(dates[6]!, 89),
    flatDay(dates[7]!, 97),
    {
      date: dates[8]!,
      bars: [...flat(10, 96), bar(10, 96, 96, 90, 90), bar(11, 90, 93, 90, 93), ...flat(378, 93, 12)],
      closingPrint: 93
    },
    flatDay(dates[9]!, 93)
  ]);
  const strategy = params({ maximumHoldDays: 3, episodeLossBudget: 0.02, episodeResetRetrace: 0.5 });

  test('an exhausted episode blocks arming until the reset; the base re-enters at once', () => {
    const base = run(sessions, flags(), strategy);
    const variant = run(sessions, flags({ episodeBudget: true }), strategy);

    // The base arms on Tuesday's dip and buys at Wednesday's second minute (97); that trade is still open.
    assert.equal(base.result.trades.length, 2);
    assert.equal(base.result.trades[1]?.entryIndex, 7);
    assert.equal(base.result.trades[1]?.entryPrice, 97);
    assert.equal(variant.result.trades.length, 2);
    assert.equal(variant.result.trades[0]?.reason, 'maximum hold');
    assert.ok(variant.accounting.outcomes[0]!.profit < -2000);
    assert.equal(variant.result.trades[1]?.entryIndex, 8);
    assert.equal(variant.result.counts.episodesStarted, 2);
    assert.equal(variant.result.counts.episodesExhausted, 1);
    assert.equal(variant.result.counts.episodeResets, 1);
    assert.equal(variant.result.counts.sessionsBlockedByBudget, 1);
  });

  test('a budget the loss does not reach changes nothing', () => {
    const base = run(sessions, flags(), strategy);
    const variant = run(sessions, flags({ episodeBudget: true }), params({ ...strategy, episodeLossBudget: 0.05 }));

    assert.deepEqual(
      variant.result.trades.map((trade) => [trade.entryIndex, trade.entryBar, trade.exitIndex]),
      base.result.trades.map((trade) => [trade.entryIndex, trade.entryBar, trade.exitIndex])
    );
    assert.equal(variant.result.counts.episodesExhausted, 0);
  });
});

describe('depth-adjusted rebound', () => {
  // Depth at the trough 90 against the reference high 100 is 10%; with X 5% and a slope of 50% the rebound
  // is 3% + 50% x 5% = 5.5%, a trigger of 94.95: minute 11's 93 doesn't buy, minute 12's 95 does.
  const sessions = buildSessions([
    ...prelude,
    dipDay(dates[4]!, [bar(12, 93, 95, 93, 95), ...flat(377, 95, 13)]),
    flatDay(dates[5]!, 95)
  ]);

  test('the trigger grows with the depth beyond X', () => {
    const base = run(sessions, flags(), params());
    const variant = run(sessions, flags({ depthRebound: true }), params({ reboundDepthSlope: 0.5 }));

    assert.equal(base.result.trades[0]?.entryBar, 12);
    assert.equal(variant.result.trades[0]?.entryBar, 13);
    assert.equal(variant.result.trades[0]?.entryPrice, 95);
    const high = variant.result.trades[0]!.referenceHigh;

    assert.ok(Math.abs(high - 100.1) < 1e-9);
    assert.ok(
      Math.abs(variant.result.trades[0]!.reboundTrigger - 90 * (1 + 0.03 + 0.5 * (1 - 90 / high - 0.05))) < 1e-9
    );
  });
});

describe('progressive deployment', () => {
  test('the add fills at the next trade after a close 2% above the first leg, and the accounting sums the legs', () => {
    const sessions = buildSessions([
      ...prelude,
      dipDay(dates[4]!),
      { date: dates[5]!, bars: [...flat(5, 94), bar(5, 94, 95, 94, 95), ...flat(384, 95.2, 6)], closingPrint: 95.2 },
      flatDay(dates[6]!, 96)
    ]);
    const variant = run(sessions, flags({ staged: true }), params({ initialFraction: 0.5, addTrigger: 0.02 }));
    const [trade] = variant.result.trades as [Trade];

    assert.equal(trade.legs.length, 2);
    assert.equal(trade.legs[0]!.investment, 50000);
    assert.equal(trade.legs[0]!.entryPrice, 93);
    assert.equal(trade.legs[1]!.entryIndex, 5);
    assert.equal(trade.legs[1]!.entryBar, 6);
    assert.equal(trade.legs[1]!.entryPrice, 95.2);
    assert.equal(trade.legs[1]!.investment, 50000);
    assert.equal(trade.legs[1]!.decisionTime, sessions[5]!.bars[5]!.time + 60);
    assert.equal(trade.investment, 100000);
    assert.ok(Math.abs(trade.shares - (50000 / 93 + 50000 / 95.2)) < 1e-9);
    assert.equal(variant.result.counts.adds, 1);

    // Marked at the last close (96): leg 1 has 2 calendar days of interest at the end (Fri → Mon → Tue is 4
    // days), leg 2 has 1.
    const { ds, accounting } = variant;
    const days = (from: number) => (ds.sTime[6]! - from) / 86400;
    const expected =
      (50000 / 93) * 96 -
      50000 -
      50000 * 0.11 * (days(ds.sTime[4]!) / 365) +
      ((50000 / 95.2) * 96 - 50000 - 50000 * 0.11 * (days(ds.sTime[5]!) / 365));

    assert.ok(Math.abs(accounting.outcomes[0]!.profit - expected) < 1e-6);
    assert.ok(Math.abs(accounting.netProfit - expected) < 1e-6);

    // Before the add's minute on its session, the mark counts only the first leg.
    const firstLegOnly = (50000 / 93) * 94 - 50000 - (50000 * 0.11 * (days(ds.sTime[4]!) - 1)) / 365;

    assert.ok(accounting.dailyMarks![5]! > firstLegOnly);
  });

  test('an add whose fill would come at or after the exit is cancelled', () => {
    // Monday: the 1-day maximum hold is due at the open (92 < 93), selling at minute 1; minute 0 closes at 96,
    // an add decision whose fill (minute 1) coincides with the sale.
    const sessions = buildSessions([
      ...prelude,
      dipDay(dates[4]!),
      { date: dates[5]!, bars: [bar(0, 92, 96, 92, 96), ...flat(389, 96, 1)], closingPrint: 96 },
      flatDay(dates[6]!, 96)
    ]);
    const variant = run(
      sessions,
      flags({ staged: true }),
      params({ maximumHoldDays: 1, initialFraction: 0.5, addTrigger: 0.02 })
    );
    const [trade] = variant.result.trades;

    assert.equal(trade?.reason, 'maximum hold');
    assert.equal(trade?.exitBar, 1);
    assert.equal(trade?.legs.length, 1);
    assert.equal(trade?.investment, 50000);
    assert.equal(variant.result.counts.addsCancelled, 1);
    assert.equal(variant.result.counts.adds, 0);
  });

  test('with the add never triggered the staged run is the base scaled by the first fraction', () => {
    const sessions = buildSessions([...prelude, dipDay(dates[4]!), flatDay(dates[5]!, 93.5), flatDay(dates[6]!, 92)]);
    const base = run(sessions, flags(), params());
    const variant = run(sessions, flags({ staged: true }), params({ initialFraction: 0.4, addTrigger: 0.5 }));

    assert.equal(variant.result.counts.adds, 0);
    assert.ok(Math.abs(variant.accounting.netProfit - 0.4 * base.accounting.netProfit) < 1e-6);
    assert.ok(
      Math.abs(variant.accounting.minuteDrawdown.maximum - 0.4 * base.accounting.minuteDrawdown.maximum) < 1e-6
    );
  });
});

describe('progress-based hold extension', () => {
  // Entry 93 on Friday; Monday at 96.5 (3.8% progress); from Tuesday the price sits at 92. The base's 3-day hold
  // sells on Tuesday; with a 3% progress threshold the hold becomes 13 days.
  const sessions = buildSessions([
    ...prelude,
    dipDay(dates[4]!),
    flatDay(dates[5]!, 96.5),
    ...dates.slice(6, 18).map((date) => flatDay(date, 92))
  ]);
  const strategy = params({ maximumHoldDays: 3, progressThreshold: 0.03, holdExtensionDays: 10 });

  test('the loss exit waits for the extended hold once progress was made', () => {
    const base = run(sessions, flags(), strategy);
    const variant = run(sessions, flags({ progressHold: true }), strategy);
    const entryTime = Date.parse(dates[4]!);
    // The first session at least `days` after the entry whose open is below the entry (Monday opens at 96.5).
    const due = (days: number) =>
      dates.findIndex((date, index) => index > 5 && (Date.parse(date) - entryTime) / 86400000 >= days);

    assert.equal(base.result.trades[0]?.reason, 'maximum hold');
    assert.equal(base.result.trades[0]?.exitIndex, due(3));
    assert.equal(base.result.trades[0]?.exitIndex, 6);
    assert.equal(variant.result.trades[0]?.reason, 'maximum hold');
    assert.equal(variant.result.trades[0]?.exitIndex, due(13));
    assert.equal(variant.result.trades[0]?.effectiveHoldAtExit, 13);
    assert.ok(variant.result.counts.extendedHoldSessions > 0);
  });

  test('without progress the hold is unchanged', () => {
    const noProgress = buildSessions([
      ...prelude,
      dipDay(dates[4]!),
      ...dates.slice(5, 12).map((date) => flatDay(date, 92))
    ]);
    const base = run(noProgress, flags(), strategy);
    const variant = run(noProgress, flags({ progressHold: true }), strategy);

    assert.equal(variant.result.trades[0]?.exitIndex, base.result.trades[0]?.exitIndex);
    assert.equal(variant.result.trades[0]?.effectiveHoldAtExit, 3);
  });
});

describe('rebound persistence confirmation', () => {
  // Minute 11 closes above the trigger (1), minute 12 below (reset), minutes 13-15 above (1, 2, 3): the buy is
  // decided at minute 15's end and fills at minute 16's open.
  const sessions = buildSessions([
    ...prelude,
    dipDay(dates[4]!, [
      bar(12, 93, 93, 92, 92),
      bar(13, 92, 93, 92, 93),
      bar(14, 93, 93.2, 93, 93.1),
      bar(15, 93, 93.2, 93, 93.1),
      ...flat(374, 93.4, 16)
    ]),
    flatDay(dates[5]!, 93.4)
  ]);

  test('three consecutive closes at or above the trigger are needed', () => {
    const base = run(sessions, flags(), params());
    const variant = run(sessions, flags({ persistence: true }), params({ confirmMinutes: 3 }));

    assert.equal(base.result.trades[0]?.entryBar, 12);
    assert.equal(variant.result.trades[0]?.entryBar, 16);
    assert.equal(variant.result.trades[0]?.entryPrice, 93.4);
    assert.equal(variant.result.trades[0]?.decisionTime, sessions[4]!.bars[15]!.time + 60);
    assert.equal(variant.result.counts.persistenceResets, 1);
  });
});

describe('degenerate mechanism settings equal the base on the real research data', () => {
  let ds: Dataset;

  before(async () => {
    const sessions = (await loadSessions(defaultDataFile)).filter((session) => session.date <= '2023-12-29');

    ds = researchDataset(sessions, 'test', '2023-12-29');
  });

  const sameTrades = (a: Trade[], b: Trade[]) => {
    assert.equal(a.length, b.length);
    a.forEach((trade, index) => {
      const other = b[index]!;

      for (const field of [
        'entryIndex',
        'entryBar',
        'entryPrice',
        'exitIndex',
        'exitBar',
        'exitPrice',
        'reason',
        'investment',
        'shares'
      ] as const) {
        assert.ok(
          (typeof trade[field] === 'number' &&
            Number.isNaN(trade[field] as number) &&
            Number.isNaN(other[field] as number)) ||
            trade[field] === other[field],
          `${field}: ${String(trade[field])} vs ${String(other[field])}`
        );
      }
    });
  };

  test('12 random base-4 vectors x 6 degenerate mechanisms', () => {
    const rng = Rng.from('trailing-buy-variants-degenerate');
    const family = families.bufferedLossNoReentry!;
    const highs = new ReferenceHighCache(ds);

    for (let index = 0; index < 12; index++) {
      const intParams: IntParams = genomeToParams(
        family,
        familySpecs(family).map((spec) => rng.int(gridSize(spec)))
      );
      const strategy = toStrategyParams(family, intParams);
      const settings = {
        stopFill: 'stop' as const,
        marginInterestRate: 0.11,
        investment: 100000,
        firstIndex: 0,
        armStart: 180,
        endIndex: ds.sessionCount - 1
      };
      const refs = highs.get(strategy.tickWindowSize);
      const base = simulate(ds, refs, family.flags, strategy, settings);
      const degenerate: [Partial<FamilyFlags>, Partial<StrategyParams>][] = [
        [{ invalidation: true }, { invalidationBuffer: 1 }],
        [{ episodeBudget: true }, { episodeLossBudget: 1e9, episodeResetRetrace: 0.5 }],
        [{ depthRebound: true }, { reboundDepthSlope: 0 }],
        [{ staged: true }, { initialFraction: 1, addTrigger: 1e9 }],
        [{ progressHold: true }, { progressThreshold: 1e9, holdExtensionDays: 10 }],
        [{ persistence: true }, { confirmMinutes: 1 }]
      ];

      for (const [flagOverrides, paramOverrides] of degenerate) {
        const variant = simulate(
          ds,
          refs,
          { ...family.flags, ...flagOverrides },
          { ...strategy, ...paramOverrides },
          settings
        );

        sameTrades(variant.trades, base.trades);
      }
    }
  });
});
