import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { chronologyOf, dateOf, dayIndexOf, dayOf, dayOfDate, isoOf } from '../calendar.ts';
import type { StopFill } from '../costs.ts';
import { compareRuns, reconcileLedger } from '../parity.ts';
import { type BarSpec, at, baseParams, flat, makeSeries, runBoth, settingsOf } from './fixtures.ts';

const fee = 0.001;

// Deep entry on 2024-01-03 at 91 (decision 00:04, the 00:04 minute missing), post-entry high 105, stop 99.75.
const entryBars = (): BarSpec[] => [
  flat('2024-01-01', 100),
  flat('2024-01-02', 100),
  ['2024-01-03T00:00', 100, 100, 99, 99],
  ['2024-01-03T00:01', 99, 99, 89, 89], // arms: 1 - 89/100 >= 10%; trailing low 89 (the close)
  ['2024-01-03T00:02', 89, 89, 88, 88.5], // trailing low 88, trigger 89.76
  ['2024-01-03T00:03', 88.5, 90, 88.5, 90], // close 90 >= 89.76: decision at 00:04
  ['2024-01-03T00:05', 91, 92, 90.5, 92], // fills at this open (no 00:04 bar)
  ['2024-01-03T00:06', 92, 105, 92, 104]
];

const stopDay = (): BarSpec[] => [
  ['2024-01-04T00:00', 104, 104, 101, 101],
  ['2024-01-04T00:01', 101, 101, 99, 99.5], // low 99 <= 99.75 triggers the active stop
  ['2024-01-04T00:02', 99.5, 100, 99, 100]
];

const checkParity = (bars: BarSpec[], armDate = '2024-01-03', params = baseParams) => {
  for (const stopFill of ['adverse', 'stop', 'low'] as StopFill[]) {
    for (const [feeBps, impactBps] of [
      [0, 0],
      [10, 5],
      [30, 20]
    ] as const) {
      const run = runBoth(makeSeries(bars), armDate, params, settingsOf(feeBps, impactBps, stopFill));
      const parity = compareRuns(run.reference, run.fast);

      assert.deepEqual(parity.differences, [], `${stopFill} ${feeBps}/${impactBps}`);
      assert.deepEqual(reconcileLedger(run.reference, 100000), [], `ledger ${stopFill} ${feeBps}/${impactBps}`);
    }
  }
};

describe('UTC clock', () => {
  test('minutes before and after midnight fall on different UTC days; hours within a day do not', () => {
    const series = makeSeries([
      ['2024-01-01T00:59', 1, 1, 1, 1],
      ['2024-01-01T01:00', 1, 1, 1, 1],
      ['2024-01-01T23:59', 1, 1, 1, 1],
      ['2024-01-02T00:00', 2, 2, 2, 2]
    ]);
    const index = dayIndexOf(series);

    assert.equal(index.days, 2);
    assert.deepEqual([index.barStart[0], index.barEnd[0], index.barStart[1], index.barEnd[1]], [0, 3, 3, 4]);
    assert.equal(index.close[0], 1);
    assert.equal(index.open[1], 2);
    assert.equal(dateOf(dayOf(at('2024-01-01T23:59'))), '2024-01-01');
    assert.equal(isoOf(at('2024-01-01T23:59') + 60), '2024-01-02T00:00:00Z');
  });

  test('leap days count as calendar days', () => {
    assert.equal(dayOfDate('2024-03-01') - dayOfDate('2024-02-27'), 3);
    assert.equal(dayOfDate('2023-03-01') - dayOfDate('2023-02-27'), 2);
    assert.equal(dateOf(dayOfDate('2024-02-29')), '2024-02-29');
    assert.throws(() => dayOfDate('2023-02-29'));
  });

  test('the chronology rule uses only the first and last days', () => {
    const chronology = chronologyOf(at('2018-02-11T00:00'), at('2026-08-25T00:00'), 365);

    assert.equal(dateOf(chronology.holdout.startDay), '2024-07-01');
    assert.equal(dateOf(chronology.folds[0]!.validation.startDay), '2021-12-01');
    assert.equal(dateOf(chronology.folds[1]!.validation.startDay), '2023-03-01');
    assert.equal(dateOf(chronology.armStartDay), '2019-02-11');
    assert.equal(chronology.folds[1]!.validation.endDay, chronology.holdout.startDay);
  });
});

describe('entries', () => {
  test('arming minute never buys; the rebound fills at the next traded minute, not the decision close', () => {
    const { reference } = runBoth(makeSeries([...entryBars(), ...stopDay()]), '2024-01-03');
    const [trade] = reference.trades;

    assert.equal(reference.trades.length, 1);
    assert.equal(trade!.activationPrice, 89);
    assert.equal(trade!.trailingLow, 88);
    assert.equal(trade!.decisionTime, at('2024-01-03T00:04'));
    assert.equal(trade!.decisionPrice, 90);
    assert.equal(trade!.entryTime, at('2024-01-03T00:05'));
    assert.equal(trade!.entryPrice, 91);
    assert.equal(trade!.entryExecution, 'next minute open');
  });

  test('cash sizing: min(100,000, cash / (1 + fee)), the fee paid in USDT, cash never negative', () => {
    const { reference } = runBoth(makeSeries([...entryBars(), ...stopDay()]), '2024-01-03');
    const trade = reference.trades[0]!;

    assert.equal(trade.notional, 100000 / (1 + fee));
    assert.equal(trade.entryFee, trade.notional * fee);
    assert.equal(trade.quantity, trade.notional / 91);
    assert.ok(trade.notional + trade.entryFee <= 100000 + 1e-9);
  });

  test('the reference high uses only completed earlier days (a same-day high of 200 does not count)', () => {
    const bars = entryBars();

    bars[2] = ['2024-01-03T00:00', 100, 200, 99, 99];

    const { reference } = runBoth(makeSeries([...bars, ...stopDay()]), '2024-01-03');

    assert.equal(reference.trades[0]!.anchorHigh, 100);
    assert.equal(reference.trades[0]!.activationPrice, 89);
  });

  test('a decision on the last minute of a UTC day fills at the next day’s first trade; that day is the entry day', () => {
    const bars: BarSpec[] = [
      flat('2024-01-01', 100),
      flat('2024-01-02', 100),
      ['2024-01-03T23:57', 100, 100, 89, 89],
      ['2024-01-03T23:58', 89, 89, 88, 88],
      ['2024-01-03T23:59', 88, 90, 88, 90],
      ['2024-01-04T00:00', 90.5, 91, 90, 91],
      ['2024-01-04T00:01', 91, 91, 70, 71], // a crash on the entry day: no exit on the entry day
      ['2024-01-05T00:00', 71, 72, 70, 72]
    ];
    const { reference } = runBoth(makeSeries(bars), '2024-01-03');
    const trade = reference.trades[0]!;

    assert.equal(trade.entryTime, at('2024-01-04T00:00'));
    assert.equal(trade.entryDay, dayOfDate('2024-01-04'));
    assert.equal(trade.entryExecution, 'carried to next day opening trade');
    assert.equal(trade.status, 'open');
    checkParity(bars);
  });

  test('a missing-minute gap after the decision fills at the next observed minute, never a synthetic bar', () => {
    const bars = entryBars();
    const { reference } = runBoth(makeSeries([...bars, ...stopDay()]), '2024-01-03');

    assert.equal(reference.trades[0]!.entryTime - reference.trades[0]!.decisionTime, 60);
    assert.equal(reference.trades[0]!.entryTime, at('2024-01-03T00:05'));
  });

  test('nothing arms before the arming eligibility day', () => {
    const { reference } = runBoth(makeSeries([...entryBars(), ...stopDay()]), '2024-01-04');

    assert.equal(reference.trades.length, 0);
  });

  test('an order below the floor is refused and its setup cancelled', () => {
    const settings = { ...settingsOf(), minOrderNotional: 1e9 };
    const run = runBoth(makeSeries([...entryBars(), ...stopDay()]), '2024-01-03', baseParams, settings);

    assert.equal(run.reference.trades.length, 0);
    assert.equal(run.reference.setups.cancelled, 1);
    assert.deepEqual(compareRuns(run.reference, run.fast).differences, []);
  });
});

describe('exits', () => {
  test('an intraday stop fills at min(stop, next open) (adverse), the stop (stop) or the trigger low (low)', () => {
    const series = makeSeries([...entryBars(), ...stopDay()]);
    const prices = (['adverse', 'stop', 'low'] as StopFill[]).map(
      (stopFill) => runBoth(series, '2024-01-03', baseParams, settingsOf(10, 0, stopFill)).reference.trades[0]!
    );

    assert.deepEqual(
      prices.map((trade) => trade.exitPrice),
      [99.5, 105 * 0.95, 99]
    );
    // The stop convention executes in the trigger minute; adverse and worst ("low") where their price is observed.
    assert.deepEqual(
      prices.map((trade) => isoOf(trade.exitTime)),
      ['2024-01-04T00:02:00Z', '2024-01-04T00:01:00Z', '2024-01-04T00:02:00Z']
    );
    assert.ok(prices.every((trade) => trade.exitReason === 'trailing stop'));
    assert.equal(prices[0]!.exitExecution, 'adverse: next minute open below stop');
    checkParity([...entryBars(), ...stopDay()]);
  });

  test('a day opening through an active stop sells at that opening trade', () => {
    const bars: BarSpec[] = [...entryBars(), ['2024-01-04T00:00', 99, 100, 98, 99.5]];
    const { reference } = runBoth(makeSeries(bars), '2024-01-03');

    assert.equal(reference.trades[0]!.exitReason, 'trailing stop gap');
    assert.equal(reference.trades[0]!.exitPrice, 99);
    checkParity(bars);
  });

  test('a minute opening through the stop after missing minutes sells at its open', () => {
    const bars: BarSpec[] = [
      ...entryBars(),
      ['2024-01-04T00:00', 104, 104, 101, 101],
      ['2024-01-04T00:10', 98, 99.5, 97, 99]
    ];
    const { reference } = runBoth(makeSeries(bars), '2024-01-03');

    assert.equal(reference.trades[0]!.exitExecution, 'minute open through stop');
    assert.equal(reference.trades[0]!.exitPrice, 98);
    checkParity(bars);
  });

  test('the stop is inactive while a sale at it would lose money after both fees', () => {
    const bars: BarSpec[] = [
      ...entryBars().slice(0, 7),
      ['2024-01-03T00:06', 92, 95, 92, 94], // high 95: stop 90.25 < entry 91, inactive
      ['2024-01-04T00:00', 94, 94, 90, 90.5],
      ['2024-01-04T00:01', 90.5, 91, 90, 91]
    ];
    const { reference } = runBoth(makeSeries(bars), '2024-01-03');

    assert.equal(reference.trades[0]!.status, 'open');
    checkParity(bars);
  });

  const holdBars = (year: number): BarSpec[] => [
    flat(`${year}-02-25`, 100),
    flat(`${year}-02-26`, 100),
    [`${year}-02-27T00:00`, 100, 100, 89, 89],
    [`${year}-02-27T00:01`, 89, 89, 88, 88],
    [`${year}-02-27T00:02`, 88, 90, 88, 90],
    [`${year}-02-27T00:03`, 90, 90, 90, 90], // fill at 90; stop 85.5, inactive
    flat(`${year}-02-28`, 89.5),
    ...(year === 2024 ? [flat('2024-02-29', 89.5)] : []),
    [`${year}-03-01T00:00`, 89, 89, 89, 89],
    [`${year}-03-01T00:01`, 89.2, 89.2, 89.2, 89.2],
    [`${year}-03-02T00:00`, 88, 88, 88, 88],
    [`${year}-03-02T00:01`, 88.1, 88.1, 88.1, 88.1]
  ];

  test('the maximum hold counts UTC calendar days (leap day included) and sells after the opening trade', () => {
    const leap = runBoth(makeSeries(holdBars(2024)), '2024-02-27').reference.trades[0]!;
    const common = runBoth(makeSeries(holdBars(2023)), '2023-02-27').reference.trades[0]!;

    assert.equal(leap.exitReason, 'maximum hold');
    assert.equal(leap.exitTime, at('2024-03-01T00:01'));
    assert.equal(leap.exitPrice, 89.2);
    assert.equal(leap.elapsedDays, 3);
    assert.equal(common.exitTime, at('2023-03-02T00:01'));
    assert.equal(common.elapsedDays, 3);
    checkParity(holdBars(2024), '2024-02-27');
    checkParity(holdBars(2023), '2023-02-27');
  });

  test('the maximum hold does not sell a position that is profitable at the opening trade', () => {
    const bars = holdBars(2024).map((bar): BarSpec => (bar[0] >= '2024-02-28' ? [bar[0], 95, 95, 95, 95] : bar));
    const { reference } = runBoth(makeSeries(bars), '2024-02-27');

    assert.equal(reference.trades[0]!.status, 'open');
    checkParity(bars, '2024-02-27');
  });

  const bufferBars = (lastMinute: boolean): BarSpec[] => [
    ...holdBars(2024).slice(0, 6), // entry 2024-02-27 at 90
    flat('2024-02-28', 91),
    flat('2024-02-29', 91),
    ['2024-03-01T00:00', 91, 91, 91, 91], // the hold day: profitable at the open, so the maximum hold is not due
    ...(lastMinute
      ? ([['2024-03-01T23:59', 91, 91, 88, 88.5]] as BarSpec[]) // the signal on the day's last minute
      : ([
          ['2024-03-01T00:01', 91, 91, 88, 88.5], // net at 88.5 <= -1% of the notional: signal
          ['2024-03-01T00:02', 88.4, 88.4, 88.4, 88.4]
        ] as BarSpec[])),
    ['2024-03-02T00:00', 88.3, 88.3, 88.3, 88.3]
  ];

  test('the buffered loss sells at the next minute from the hold day, or at the next day’s first trade', () => {
    const intraday = runBoth(makeSeries(bufferBars(false)), '2024-02-27').reference.trades[0]!;
    const carried = runBoth(makeSeries(bufferBars(true)), '2024-02-27').reference.trades[0]!;

    assert.equal(intraday.exitReason, 'buffered intraday loss');
    assert.equal(intraday.exitTime, at('2024-03-01T00:02'));
    assert.equal(intraday.exitPrice, 88.4);
    assert.equal(carried.exitReason, 'buffered intraday loss');
    assert.equal(carried.exitTime, at('2024-03-02T00:00'));
    assert.equal(carried.exitExecution, 'carried to next day opening trade');
    checkParity(bufferBars(false), '2024-02-27');
    checkParity(bufferBars(true), '2024-02-27');
  });

  test('an open position at the end is marked at its liquidation value and the ledger reconciles', () => {
    const run = runBoth(makeSeries(entryBars()), '2024-01-03', baseParams, settingsOf(10, 5));
    const trade = run.reference.trades[0]!;
    const sell = (1 - 0.0005) * (1 - fee);

    assert.equal(trade.status, 'open');
    assert.equal(run.reference.equity, run.reference.cash + trade.quantity * 104 * sell);
    assert.equal(run.reference.unrealized, trade.quantity * 104 * sell - trade.notional - trade.entryFee);
    assert.deepEqual(reconcileLedger(run.reference, 100000), []);
    checkParity(entryBars());
  });
});

describe('re-entry and continuation', () => {
  test('no entry on an exit day; the next day can arm', () => {
    const bars: BarSpec[] = [
      ...entryBars(),
      ...stopDay(),
      ['2024-01-04T00:03', 100, 100, 85, 85], // a deep close on the exit day: ignored
      ['2024-01-05T00:00', 85, 85, 84, 84], // arms (reference high 105)
      ['2024-01-05T00:01', 84, 86, 84, 86], // rebound: decision
      ['2024-01-05T00:02', 86, 86, 86, 86]
    ];
    const { reference } = runBoth(makeSeries(bars), '2024-01-03');

    assert.equal(reference.trades.length, 2);
    assert.equal(reference.trades[1]!.activationTime, at('2024-01-05T00:01'));
    assert.equal(reference.trades[1]!.setupKind, 'deep');
    checkParity(bars);
  });

  test('a pullback within W days of a profitable exit arms a continuation setup; after W days it does not', () => {
    const continuation = (pullbackDate: string): BarSpec[] => [
      ...entryBars(),
      ...stopDay(), // profitable exit at 99.5 on 2024-01-04
      ['2024-01-05T00:00', 99.5, 100, 99, 99.8], // the window's high becomes 100 after this day
      ...['2024-01-06', '2024-01-07', '2024-01-08']
        .filter((date) => date < pullbackDate)
        .map((date) => flat(date, 99.8)),
      [`${pullbackDate}T00:00`, 99.8, 99.8, 94.8, 94.8], // <= 100 x 0.95, not a 10% fall from the reference high
      [`${pullbackDate}T00:01`, 94.8, 97, 94.8, 97],
      [`${pullbackDate}T00:02`, 97, 97, 97, 97]
    ];
    const inside = runBoth(makeSeries(continuation('2024-01-06')), '2024-01-03').reference;
    const outside = runBoth(makeSeries(continuation('2024-01-08')), '2024-01-03').reference;

    assert.equal(inside.setups.continuation, 1);
    assert.equal(inside.trades[1]!.setupKind, 'continuation');
    assert.equal(inside.trades[1]!.anchorHigh, 100);
    assert.equal(outside.setups.continuation, 0);
    checkParity(continuation('2024-01-06'));
    checkParity(continuation('2024-01-08'));
  });
});

describe('accounting', () => {
  test('fees and impact: gross - both fees - both impacts = net, with the exact fill prices', () => {
    const run = runBoth(makeSeries([...entryBars(), ...stopDay()]), '2024-01-03', baseParams, settingsOf(20, 10));
    const trade = run.reference.trades[0]!;

    assert.equal(trade.entryFillPrice, 91 * 1.001);
    assert.equal(trade.exitFillPrice, 99.5 * 0.999);
    assert.equal(trade.notional, 100000 / 1.002);
    assert.equal(trade.exitFee, trade.quantity * trade.exitFillPrice * 0.002);
    assert.deepEqual(reconcileLedger(run.reference, 100000), []);
  });

  test('cash mode sizes a later entry from the cash left after a loss; fixed mode records the top-up', () => {
    const bars: BarSpec[] = [
      ...holdBars2(),
      ['2024-03-02T00:00', 80, 80, 79, 79], // re-arms: 1 - 79/90 >= 10%
      ['2024-03-02T00:01', 79, 81, 79, 81],
      ['2024-03-02T00:02', 81, 81, 81, 81]
    ];
    const cash = runBoth(makeSeries(bars), '2024-02-27').reference;
    const fixed = runBoth(makeSeries(bars), '2024-02-27', baseParams, settingsOf(), 'fixed').reference;

    assert.equal(cash.trades.length, 2);
    assert.ok(cash.trades[0]!.netPnl < 0);
    assert.equal(cash.trades[1]!.notional, cash.trades[1]!.availableQuote / (1 + fee));
    assert.ok(cash.trades[1]!.notional < 100000);
    assert.equal(fixed.trades[1]!.notional, 100000);
    assert.ok(fixed.trades[1]!.topUp > 0);
    assert.equal(fixed.contributions, fixed.trades[0]!.topUp + fixed.trades[1]!.topUp);
    assert.deepEqual(reconcileLedger(cash, 100000), []);
    assert.deepEqual(reconcileLedger(fixed, 100000), []);
    checkParity(bars, '2024-02-27');
  });

  function holdBars2(): BarSpec[] {
    return [
      flat('2024-02-25', 100),
      flat('2024-02-26', 100),
      ['2024-02-27T00:00', 100, 100, 89, 89],
      ['2024-02-27T00:01', 89, 89, 88, 88],
      ['2024-02-27T00:02', 88, 90, 88, 90],
      ['2024-02-27T00:03', 90, 90, 90, 90],
      flat('2024-02-28', 89.5),
      flat('2024-02-29', 89.5),
      ['2024-03-01T00:00', 85, 85, 85, 85],
      ['2024-03-01T00:01', 85, 85, 85, 85] // the maximum hold sells at 85: a loss
    ];
  }
});
