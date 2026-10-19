// Synthetic edge cases: the engine against the generated copies of the strategy files on constructed and
// random sessions (early closes, missing minutes, missing closing prints, gaps, overnight orders, the
// maximum-hold threshold, recovery resets, buffered exits against stops, the lookback), plus targeted
// scenarios with their expected outcome asserted.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import { Rng } from '../../optimizer/rng.ts';
import { generateCopies } from '../copies.ts';
import { computeReferenceHighs, fixtureDataset } from '../data.ts';
import { type StrategyParams, simulate } from '../engine.ts';
import { families, familyKeys } from '../families.ts';
import { type ParityCase, compareWithSource, engineRun, sourceOptions } from '../parity.ts';
import { runSource } from '../sourceRun.ts';
import { bar, buildSessions, randomScenario, weekdays } from './fixtures.ts';

before(async () => {
  await generateCopies();
});

const flat = (minutes: number, price: number) =>
  Array.from({ length: minutes }, (_value, minute) => bar(minute, price, price + 0.5, price - 0.5, price));

const params = (overrides: Partial<StrategyParams> = {}): StrategyParams => ({
  targetPercentChange: 0.05,
  trailingBuyPercentage: 0.03,
  trailingStopPercentage: 0.08,
  maximumHoldDays: 15,
  tickWindowSize: 3,
  materialLossThreshold: 0.01,
  lowerPriceReentry: 0.02,
  retraceFraction: 0.38,
  intradayLossBuffer: 0.005,
  ...overrides
});

const caseFor = (familyKey: (typeof familyKeys)[number], endDate: string, overrides: Partial<ParityCase> = {}) => ({
  name: 'synthetic',
  family: families[familyKey],
  copy: true,
  endDate,
  stopFill: 'stop' as const,
  params: params(),
  injectAll: true,
  marginInterestRate: 0.11,
  ...overrides
});

describe('targeted scenarios', () => {
  // 2017-11-24 closes at 1:00 p.m. A rebound confirmed by its last minute (12:59, known at 13:00) can't take
  // the 13:00 closing print and waits for the next session's opening trade. The position then meets a gap
  // through its stop.
  const dates = [
    '2017-11-17',
    '2017-11-20',
    '2017-11-21',
    '2017-11-22',
    '2017-11-24',
    '2017-11-27',
    '2017-11-28',
    '2017-11-29'
  ];
  const sessions = buildSessions([
    ...dates.slice(0, 4).map((date) => ({ date, bars: flat(390, 100), closingPrint: 100 })),
    {
      date: '2017-11-24',
      closeMinute: 210,
      bars: [
        ...flat(10, 100),
        ...Array.from({ length: 199 }, (_value, index) => bar(10 + index, 90, 90.05, 89.9, 90)),
        bar(209, 90, 93, 90, 93)
      ],
      closingPrint: 93
    },
    {
      date: '2017-11-27',
      bars: [bar(0, 94, 95, 94, 95), ...flat(389, 95).map((b, index) => ({ ...b, minute: index + 1 }))],
      closingPrint: 95
    },
    { date: '2017-11-28', bars: [bar(0, 96, 110, 96, 109)], closingPrint: 109 },
    { date: '2017-11-29', bars: [bar(0, 99, 99, 98, 98)], closingPrint: 98 }
  ]);
  const ds = fixtureDataset(sessions);

  test('the early-close rebound fills at the next opening trade', () => {
    const run = engineRun(ds, caseFor('noReentry', '2017-11-29'));
    const [trade] = run.result.trades;

    assert.equal(sessions[4]!.isEarlyClose, true);
    assert.equal(run.result.counts.overnightOrders, 1);
    assert.equal(trade?.entryIndex, 5);
    assert.equal(trade?.entryBar, 0);
    assert.equal(trade?.entryExecution, 'opening trade');
    assert.equal(trade?.entryPrice, 94);
    assert.equal(trade?.decisionTime, sessions[4]!.closeTime);
  });

  test('a gap through an active stop exits at the opening trade', () => {
    const run = engineRun(ds, caseFor('noReentry', '2017-11-29'));
    const [trade] = run.result.trades;

    assert.equal(trade?.reason, 'trailing stop gap');
    assert.equal(trade?.exitIndex, 7);
    assert.equal(trade?.exitPrice, 99);
    assert.ok(Math.abs(trade!.exitStopPrice - 110 * 0.92) < 1e-9);
  });

  test('the engine equals every family copy on this scenario', async () => {
    for (const familyKey of familyKeys) {
      const parityCase = caseFor(familyKey, '2017-11-29');
      const outcome = compareWithSource(ds, parityCase, await runSource(sourceOptions(parityCase, sessions)));

      assert.deepEqual(outcome.mismatches, [], familyKey);
    }
  });

  // A losing position reaches the 15-day threshold. Unbuffered: sold after the opening trade of the first
  // session at least 15 calendar days after entry. Buffered: still above the buffer at that open, it sells on
  // the last minute's close the same day; with no later trade, at the next opening trade.
  const holdDates = weekdays('2018-06-04', 20);
  const holdSpecs = holdDates.map((date, index) => {
    if (index < 4) {
      return { date, bars: flat(390, 100), closingPrint: 100 };
    }

    if (index === 4) {
      return {
        date,
        bars: [
          ...flat(10, 100),
          bar(10, 100, 100, 90, 90),
          bar(11, 90, 93, 90, 93),
          ...flat(378, 93).map((b, k) => ({ ...b, minute: 12 + k }))
        ],
        closingPrint: 93
      };
    }

    // Slightly below the entry (93) after interest at every open from day 15, and down 1% in the last minute.
    return { date, bars: [...flat(389, 93.4), bar(389, 93.4, 93.4, 92.3, 92.3)], closingPrint: undefined };
  });
  const holdSessions = buildSessions(holdSpecs);
  const holdDs = fixtureDataset(holdSessions);
  const holdEnd = holdDates.at(-1)!;

  test('the maximum hold sells on the first session at least 15 calendar days after entry', () => {
    const run = engineRun(holdDs, caseFor('noReentry', holdEnd));
    const [trade] = run.result.trades;
    const entryTime = Date.parse(holdDates[trade!.entryIndex]!);
    const due = holdDates.findIndex((date) => (Date.parse(date) - entryTime) / 86400000 >= 15);

    assert.equal(trade?.reason, 'maximum hold');
    assert.equal(trade?.exitIndex, due);
    assert.equal(trade?.exitBar, 1);
  });

  // Profitable at every open (so the maximum hold never sells), below the buffer only on the last minute's
  // close, and no closing print: the buffered sale waits for the next session's opening trade.
  const bufferSessions = buildSessions(
    holdSpecs.map((spec, index) =>
      index <= 4 ? spec : { ...spec, bars: [...flat(389, 94), bar(389, 94, 94, 92.3, 92.3)] }
    )
  );
  const bufferDs = fixtureDataset(bufferSessions);

  test('the buffered exit decided on the last minute fills at the next opening trade', async () => {
    const parityCase = caseFor('bufferedLossNoReentry', holdEnd);
    const run = engineRun(bufferDs, parityCase);
    const [trade] = run.result.trades;
    const entryTime = Date.parse(holdDates[trade!.entryIndex]!);
    const due = holdDates.findIndex((date) => (Date.parse(date) - entryTime) / 86400000 >= 15);

    assert.equal(trade?.reason, 'buffered intraday loss');
    assert.equal(trade?.exitIndex, due + 1);
    assert.equal(trade?.exitBar, 0);
    assert.equal(trade?.exitExecution, 'opening trade');
    assert.equal(trade?.exitPrice, 94);
    assert.equal(trade?.bufferSignalTime, bufferSessions[due]!.closeTime);
    assert.equal(engineRun(bufferDs, caseFor('noReentry', holdEnd)).result.trades[0]?.reason, 'open');

    for (const familyKey of familyKeys) {
      const familyCase = caseFor(familyKey, holdEnd);

      assert.deepEqual(
        compareWithSource(bufferDs, familyCase, await runSource(sourceOptions(familyCase, bufferSessions))).mismatches,
        [],
        familyKey
      );
    }
  });
});

describe('random synthetic scenarios against the copies', () => {
  const coverage: Record<string, number> = {};
  const note = (key: string, count = 1) => {
    coverage[key] = (coverage[key] ?? 0) + count;
  };

  test('engine = copy on 240 random scenarios x 4 families', async () => {
    const rng = Rng.from('four-family-synthetic-params');

    for (let scenario = 0; scenario < 240; scenario++) {
      const sessions = randomScenario(`s${scenario}`, 50 + rng.int(40));
      const ds = fixtureDataset(sessions);
      const lookback = 2 + rng.int(12);
      const randomParams = params({
        targetPercentChange: 0.01 + rng.next() * 0.07,
        trailingBuyPercentage: 0.002 + rng.next() * 0.025,
        trailingStopPercentage: 0.005 + rng.next() * 0.05,
        maximumHoldDays: 1 + rng.int(8),
        tickWindowSize: lookback,
        materialLossThreshold: rng.next() * 0.02,
        lowerPriceReentry: rng.next() * 0.03,
        retraceFraction: rng.next() < 0.5 ? 0.01 + rng.next() * 0.15 : 0.05 + rng.next() * 0.7,
        intradayLossBuffer: rng.next() < 0.2 ? 0 : rng.next() * 0.01
      });
      const familyKey = familyKeys[scenario % 4]!;
      const parityCase = caseFor(familyKey, sessions.at(-1)!.date, {
        name: `scenario ${scenario}`,
        params: randomParams,
        stopFill: rng.next() < 0.5 ? 'stop' : 'next-open',
        marginInterestRate: [0.08, 0.11, 0.14][rng.int(3)]!,
        armStart: rng.next() < 0.5 ? lookback + rng.int(10) : undefined
      });
      const outcome = compareWithSource(ds, parityCase, await runSource(sourceOptions(parityCase, sessions)));

      assert.deepEqual(outcome.mismatches, [], `${parityCase.name} ${familyKey}`);

      const { result } = engineRun(ds, parityCase);

      note('trades', result.trades.length);
      note('overnight orders', result.counts.overnightOrders);
      note('recovery resets', result.counts.recoveryResets);
      note('suppressed rebounds', result.counts.suppressedReboundSignals);
      note('restrictions', result.counts.restrictions);
      note('buffered exits', result.counts.bufferedLossExits);
      note('early-close sessions', sessions.filter((session) => session.isEarlyClose).length);
      note('sessions without closing print', sessions.filter((session) => session.closingPrint === undefined).length);

      for (const trade of result.trades) {
        note(`entry ${trade.entryExecution}`);
        note(`exit ${trade.reason}${trade.exitExecution ? ` / ${trade.exitExecution}` : ''}`);

        if (trade.reason === 'buffered intraday loss' && trade.exitExecution === 'opening trade') {
          note('buffered exit carried overnight');
        }
      }
    }

    console.log(JSON.stringify(coverage, null, 1));

    for (const key of [
      'overnight orders',
      'recovery resets',
      'suppressed rebounds',
      'restrictions',
      'buffered exits',
      'early-close sessions',
      'sessions without closing print',
      'entry opening trade',
      'entry first trade after decision',
      'exit trailing stop / stop level',
      'exit trailing stop gap / opening trade',
      'exit maximum hold / first trade after decision'
    ]) {
      assert.ok((coverage[key] ?? 0) > 0, `no ${key} in the random scenarios`);
    }
  });
});

describe('reference highs', () => {
  test('the sliding maximum equals the previous L sessions, excluding the current one', () => {
    const sessions = randomScenario('lookback', 80);
    const ds = fixtureDataset(sessions);

    for (const lookback of [1, 2, 5, 17]) {
      for (const firstIndex of [0, 7]) {
        const highs = computeReferenceHighs(ds, lookback, firstIndex);

        for (let s = firstIndex; s < ds.sessionCount; s++) {
          const window = sessions.slice(Math.max(firstIndex, s - lookback), s).map((session) => session.high);

          assert.equal(highs[s], Math.max(...window));
        }
      }
    }
  });

  test('the engine never arms before armStart', () => {
    const sessions = randomScenario('arm-start', 80);
    const ds = fixtureDataset(sessions);
    const strategy = params({ targetPercentChange: 0.01, tickWindowSize: 3 });
    const result = simulate(
      ds,
      computeReferenceHighs(ds, 3),
      families.noReentry.flags,
      strategy,
      {
        stopFill: 'stop',
        marginInterestRate: 0.11,
        investment: 100000,
        firstIndex: 0,
        armStart: 40,
        endIndex: ds.sessionCount - 1
      },
      true
    );

    assert.ok(result.setups!.length > 0);
    assert.ok(result.setups!.every((setup) => setup.activationIndex >= 40));
  });
});
