// Hand-written minute scenarios for the execution rules, each checked three ways: the original allIn.ts
// (through a variant with a 3-session lookback), the literal working copy, and the fast engine.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import type { MinuteParams } from '../../app/allIn-minute-optimizable.ts';
import { executionLabels } from '../data.ts';
import type { StopFill } from '../engine.ts';
import { comparableFromEngine, comparableFromReference, compareComparables } from '../reference.ts';
import { type HandSession, flatSession, runAll, runOriginalQuietly, tempDir, writeHandCsv } from './helpers.ts';

const params: MinuteParams = {
  dipTenths: 25,
  trailingStopTenths: 21,
  maximumHoldDays: 8,
  lookbackSessions: 3,
  materialLossTenths: 22,
  lowerReentryTenths: 40,
  retraceTenths: 367
};

// Three flat sessions at 100, an entry on the fourth (decision price 97, 3% below the 100 high), then a
// rally to 105 that sets a stop of 105 x 0.979 = 102.795 for the sixth session.
const setup = (dates: string[]): HandSession[] => [
  flatSession(dates[0]!, 100),
  flatSession(dates[1]!, 100),
  flatSession(dates[2]!, 100),
  {
    date: dates[3]!,
    bars: [
      { at: '09:30', open: 100, high: 100, low: 99, close: 99 },
      { at: '12:00', open: 98, high: 98, low: 97.5, close: 97.6 },
      { at: '15:58', open: 97.2, high: 97.2, low: 96.9, close: 97 },
      { at: '15:59', open: 97, high: 97.2, low: 96.9, close: 97.1 }
    ],
    closingPrint: 97.1
  },
  {
    date: dates[4]!,
    bars: [
      { at: '09:30', open: 98, high: 99, low: 98, close: 99 },
      { at: '12:00', open: 103, high: 105, low: 103, close: 104 },
      { at: '15:58', open: 104, high: 104, low: 104, close: 104 },
      { at: '15:59', open: 104, high: 104, low: 104, close: 104 }
    ],
    closingPrint: 104
  }
];

const februaryDates = ['2017-02-06', '2017-02-07', '2017-02-08', '2017-02-09', '2017-02-10', '2017-02-13'];
const stop = 105 * (1 - 21 / 1000);

let dir: string;

before(async () => {
  dir = await tempDir('scenarios');
});

after(async () => {
  await fs.remove(dir);
});

const check = async (name: string, sessions: HandSession[], stopFill: StopFill = 'stop', testParams = params) => {
  const file = await writeHandCsv(dir, name, sessions);
  const original = await runOriginalQuietly(file, testParams, stopFill);
  const { reference, result, dataset } = await runAll(file, testParams, stopFill);
  const differences = compareComparables(
    comparableFromReference(reference, [5, 10, 20]),
    comparableFromEngine(result, dataset.dates, 0)
  );

  assert.deepEqual(differences, [], `${name}: engine vs working copy`);
  assert.equal(original.positions.length, reference.positions.length, `${name}: original vs working copy trades`);
  original.positions.forEach((position, index) => {
    const copy = reference.positions[index]!;

    assert.equal(position.entryPrice, copy.entryPrice);
    assert.equal(position.exitPrice, copy.exitPrice);
    assert.equal(position.profit, copy.profit);
  });

  return { original, reference, result, dataset };
};

describe('minute execution scenarios', () => {
  test('entry one minute before the close, filled at the 15:59 open; the stop is inactive below breakeven', async () => {
    const { result } = await check('entry', [...setup(februaryDates), flatSession(februaryDates[5]!, 104)]);
    const [trade] = result.trades;

    assert.equal(trade?.decisionPrice, 97);
    assert.equal(trade?.entryPrice, 97);
    assert.equal(executionLabels[trade!.entryExecution], 'first trade after decision');
    // The fifth session dipped to 98 with an inactive stop (97.2 x 0.979 is below breakeven): no exit.
    assert.equal(trade?.reason, 'open');
  });

  test('a gap through an active stop fills at the opening trade', async () => {
    const day6: HandSession = {
      date: februaryDates[5]!,
      bars: [
        { at: '09:30', open: 101, high: 101.5, low: 100.5, close: 101 },
        { at: '15:59', open: 101, high: 101, low: 101, close: 101 }
      ],
      closingPrint: 101
    };
    const { result } = await check('gap', [...setup(februaryDates), day6]);
    const [trade] = result.trades;

    assert.equal(trade?.reason, 'trailing stop gap');
    assert.equal(trade?.exitPrice, 101);
    assert.equal(executionLabels[trade!.exitExecution], 'opening trade');
    assert.equal(trade?.exitStopPrice, stop);
  });

  const intraday: HandSession = {
    date: februaryDates[5]!,
    bars: [
      { at: '09:30', open: 104, high: 104, low: 104, close: 104 },
      // A new high today must not raise today's stop (it would be 107.69).
      { at: '10:00', open: 104, high: 110, low: 104, close: 109 },
      { at: '11:00', open: 106, high: 106, low: 103.5, close: 104 },
      // Opens above the 102.795 stop and trades through it.
      { at: '14:00', open: 104, high: 104, low: 102, close: 102.5 },
      { at: '15:58', open: 102.6, high: 102.7, low: 102.4, close: 102.5 },
      { at: '15:59', open: 102.5, high: 102.5, low: 102.5, close: 102.5 }
    ],
    closingPrint: 102.5
  };

  test('the stop is set once a day: a same-session high does not raise it; a minute trading through it fills at the stop', async () => {
    const { result } = await check('intraday-stop', [...setup(februaryDates), intraday]);
    const [trade] = result.trades;

    assert.equal(trade?.reason, 'trailing stop');
    assert.equal(trade?.exitPrice, stop);
    assert.equal(trade?.exitBar, 3);
    assert.equal(executionLabels[trade!.exitExecution], 'stop level');
  });

  test('next-open stop fill uses the next observed trade after the triggering minute', async () => {
    const { result } = await check('intraday-next-open', [...setup(februaryDates), intraday], 'next-open');
    const [trade] = result.trades;

    assert.equal(trade?.reason, 'trailing stop');
    assert.equal(trade?.exitPrice, 102.6);
    assert.equal(trade?.exitBar, 4);
    assert.equal(executionLabels[trade!.exitExecution], 'first trade after decision');
  });

  test('a minute that opens through the stop fills at its open', async () => {
    const day6: HandSession = {
      date: februaryDates[5]!,
      bars: [
        { at: '09:30', open: 104, high: 104, low: 103.9, close: 104 },
        { at: '13:00', open: 102.5, high: 102.6, low: 102, close: 102.3 },
        { at: '15:59', open: 102.3, high: 102.3, low: 102.3, close: 102.3 }
      ],
      closingPrint: 102.3
    };
    const { result } = await check('minute-open', [...setup(februaryDates), day6]);

    assert.equal(result.trades[0]?.exitPrice, 102.5);
    assert.equal(executionLabels[result.trades[0]!.exitExecution], 'minute open through stop');
  });

  test('next-open with no later trade at all fills at the triggering minute close', async () => {
    const day6: HandSession = {
      date: februaryDates[5]!,
      bars: [
        { at: '09:30', open: 104, high: 104, low: 104, close: 104 },
        { at: '15:58', open: 104, high: 104, low: 102, close: 102.2 }
      ]
    };
    const nextOpen = await check('trigger-close', [...setup(februaryDates), day6], 'next-open');

    assert.equal(nextOpen.result.trades[0]?.exitPrice, 102.2);
    assert.equal(executionLabels[nextOpen.result.trades[0]!.exitExecution], 'trigger minute close');

    const atStop = await check('trigger-close-stop', [...setup(februaryDates), day6], 'stop');

    assert.equal(atStop.result.trades[0]?.exitPrice, stop);
  });

  // An entry at 97 on Thursday 2017-02-09, then flat at 96: losing, so the stop never activates.
  const losing = (lastDay: HandSession) => [
    ...setup(februaryDates).slice(0, 4),
    ...['2017-02-10', '2017-02-13', '2017-02-14', '2017-02-15', '2017-02-16'].map((date) => flatSession(date, 96)),
    lastDay,
    flatSession('2017-02-21', 96)
  ];

  test('the maximum hold counts calendar days and sells at the next observed trade after the opening trade', async () => {
    const { result } = await check('max-hold', losing(flatSession('2017-02-17', 96)));
    const [trade] = result.trades;

    // 2017-02-09 + 8 calendar days = 2017-02-17 (a Friday, six sessions later).
    assert.equal(trade?.reason, 'maximum hold');
    assert.equal(result.trades[0]?.exitIndex, 9);
    assert.equal(trade?.exitBar, 1);
    assert.equal(trade?.holdDays, 8);
  });

  test('a maximum-hold exit falls back to the closing print, and waits a session without any later trade', async () => {
    const withPrint = await check(
      'max-hold-print',
      losing({
        date: '2017-02-17',
        bars: [{ at: '09:30', open: 96, high: 96, low: 96, close: 96 }],
        closingPrint: 96.5
      })
    );

    assert.equal(withPrint.result.trades[0]?.exitPrice, 96.5);
    assert.equal(executionLabels[withPrint.result.trades[0]!.exitExecution], 'closing print');

    const withoutTrade = await check(
      'max-hold-none',
      losing({ date: '2017-02-17', bars: [{ at: '09:30', open: 96, high: 96, low: 96, close: 96 }] })
    );

    assert.equal(withoutTrade.result.trades[0]?.exitIndex, 10);
  });

  test('no trade after the entry decision means no entry, and it is counted', async () => {
    const sessions = setup(februaryDates).slice(0, 4);

    sessions[3] = { ...sessions[3]!, bars: sessions[3]!.bars.slice(0, 3), closingPrint: undefined };

    const { result, reference } = await check('no-fill', [...sessions, flatSession('2017-02-10', 99)]);

    assert.equal(result.entriesWithoutTrade, 1);
    assert.equal(reference.summary.entriesWithoutTrade, 1);
    assert.equal(result.trades.length, 0);
  });

  test('early close: the decision is at 12:59 on the 12:58 minute, and minutes after 13:00 are ignored', async () => {
    const sessions: HandSession[] = [
      flatSession('2017-11-20', 100),
      flatSession('2017-11-21', 100),
      flatSession('2017-11-22', 100),
      {
        date: '2017-11-24',
        bars: [
          { at: '09:30', open: 100, high: 100, low: 99, close: 99 },
          { at: '12:58', open: 97.1, high: 97.1, low: 96.9, close: 97 },
          { at: '12:59', open: 97.05, high: 97.1, low: 97, close: 97.1 },
          // After the early close: must be dropped.
          { at: '15:58', open: 90, high: 90, low: 90, close: 90 }
        ],
        closingPrint: 97.1,
        closeAt: '13:00'
      },
      flatSession('2017-11-27', 97.1)
    ];
    const { result, dataset } = await check('early-close', sessions);

    assert.equal(dataset.sEarlyClose[3], 1);
    assert.equal(result.trades[0]?.decisionPrice, 97);
    assert.equal(result.trades[0]?.entryPrice, 97.05);
  });

  test('daylight-saving change: the first session after the switch decides at 15:59 New York time', async () => {
    const dates = ['2017-03-08', '2017-03-09', '2017-03-10', '2017-03-13', '2017-03-14', '2017-03-15'];
    const { result, dataset } = await check('dst', [...setup(dates), flatSession(dates[5]!, 104)]);

    // 2017-03-13 is EDT (UTC-4): 15:59 New York is 19:59 UTC; 2017-03-10 was EST (UTC-5): 20:59 UTC.
    assert.equal(new Date(dataset.sCloseTime[3]! * 1000).toISOString(), '2017-03-13T20:00:00.000Z');
    assert.equal(new Date(dataset.sCloseTime[2]! * 1000).toISOString(), '2017-03-10T21:00:00.000Z');
    assert.equal(result.trades[0]?.entryPrice, 97);
  });

  test('a material loss restricts re-entry until a lower price; a smaller loss does not restrict', async () => {
    const sessions = losing(flatSession('2017-02-17', 96));

    // After the losing exit at 96 (-1.0%, below the 2.2% threshold), nothing is restricted.
    const mild = await check('restriction-mild', sessions);

    assert.equal(mild.result.restrictions, 0);

    // With a 0.5% threshold the same exit restricts; re-entry then needs <= 96 x 0.96 = 92.16.
    const strict = await check(
      'restriction-strict',
      [
        ...sessions.slice(0, -1),
        flatSession('2017-02-21', 93),
        flatSession('2017-02-22', 92),
        flatSession('2017-02-23', 92)
      ],
      'stop',
      { ...params, materialLossTenths: 5 }
    );

    assert.equal(strict.result.restrictions, 1);
    assert.equal(strict.result.trades.length, 2);
    assert.equal(strict.result.lowerPriceReentries, 1);
  });
});
