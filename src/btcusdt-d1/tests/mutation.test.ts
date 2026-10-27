import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { dayOf } from '../calendar.ts';
import { fastRunner, lookaheadViolations, referenceRunner } from '../mutation.ts';
import { compareRuns } from '../parity.ts';
import { type BarSpec, at, baseParams, flat, makeSeries, runBoth, settingsOf } from './fixtures.ts';

// Two trades with every exit path the engine has: an intraday stop, then a loss sold by the maximum hold, then a
// third entry still open at the end; minutes are missing in places.
const bars: BarSpec[] = [
  flat('2024-01-01', 100),
  flat('2024-01-02', 100),
  ['2024-01-03T00:00', 100, 100, 99, 99],
  ['2024-01-03T00:01', 99, 99, 89, 89],
  ['2024-01-03T00:02', 89, 89, 88, 88.5],
  ['2024-01-03T00:03', 88.5, 90, 88.5, 90],
  ['2024-01-03T00:05', 91, 92, 90.5, 92],
  ['2024-01-03T00:06', 92, 105, 92, 104],
  ['2024-01-04T00:00', 104, 104, 101, 101],
  ['2024-01-04T00:01', 101, 101, 99, 99.5],
  ['2024-01-04T00:02', 99.5, 100, 99, 100],
  ['2024-01-05T00:00', 100, 100, 92, 92],
  ['2024-01-05T00:01', 92, 95, 92, 95],
  ['2024-01-05T00:02', 95, 95, 94, 94],
  flat('2024-01-06', 93),
  flat('2024-01-07', 93),
  ['2024-01-08T00:00', 90, 90, 90, 90],
  ['2024-01-08T00:01', 90, 90, 90, 90],
  ['2024-01-09T00:00', 80, 80, 80, 80],
  ['2024-01-09T00:07', 80, 83, 80, 83],
  ['2024-01-09T00:08', 83, 84, 83, 84],
  ['2024-01-10T00:00', 84, 86, 83, 85]
];

describe('lookahead mutation', () => {
  const series = makeSeries(bars);
  const armStartDay = dayOf(at('2024-01-03T00:00'));
  const windowEnds = [dayOf(at('2024-01-05T00:00')), dayOf(at('2024-01-08T00:00'))];

  test('the fixture exercises entries, stops, the maximum hold and an open end', () => {
    const { reference, fast } = runBoth(series, '2024-01-03');

    assert.ok(reference.trades.length >= 3);
    assert.deepEqual(compareRuns(reference, fast).differences, []);
  });

  for (const stopFill of ['adverse', 'stop', 'low'] as const) {
    test(`mutating every bar from any cutoff changes nothing recorded before it (${stopFill})`, () => {
      const settings = settingsOf(10, 5, stopFill);

      for (let cutoff = 1; cutoff < series.rows; cutoff++) {
        for (const runner of [
          fastRunner(baseParams, settings, armStartDay, windowEnds),
          referenceRunner(baseParams, settings, armStartDay, windowEnds)
        ]) {
          assert.deepEqual(lookaheadViolations(runner, series, cutoff), [], `cutoff ${cutoff}`);
        }
      }
    });
  }

  for (const cheatKind of ['next-minute-low', 'same-day-high'] as const) {
    test(`a runner with a deliberate lookahead (${cheatKind}) is caught`, () => {
      const cheat = fastRunner(baseParams, settingsOf(10, 5), armStartDay, windowEnds, cheatKind);
      const caught = Array.from({ length: series.rows - 1 }, (_value, index) => index + 1).filter(
        (cutoff) => lookaheadViolations(cheat, series, cutoff).length > 0
      );

      assert.ok(caught.length > 0, 'the deliberate lookahead must change something before some cutoff');
    });
  }

  test('deleting every bar from any cutoff (truncation) changes nothing recorded before it', () => {
    for (const stopFill of ['adverse', 'stop', 'low'] as const) {
      const settings = settingsOf(10, 5, stopFill);

      for (let cutoff = 1; cutoff < series.rows; cutoff++) {
        for (const runner of [
          fastRunner(baseParams, settings, armStartDay, windowEnds),
          referenceRunner(baseParams, settings, armStartDay, windowEnds)
        ]) {
          assert.deepEqual(
            lookaheadViolations(runner, series, cutoff, 'a', runner(series), 'truncate'),
            [],
            `${stopFill} cutoff ${cutoff}`
          );
        }
      }
    }
  });
});

describe('stop and buffered-loss precedence', () => {
  // Entry 2024-02-27 at 90; post-entry high 100 on 02-28 makes the stop 95 (active); hold 3, buffer 1%.
  const base = (day: BarSpec[]): BarSpec[] => [
    flat('2024-02-25', 100),
    flat('2024-02-26', 100),
    ['2024-02-27T00:00', 100, 100, 89, 89],
    ['2024-02-27T00:01', 89, 89, 88, 88],
    ['2024-02-27T00:02', 88, 90, 88, 90],
    ['2024-02-27T00:03', 90, 90, 90, 90],
    ['2024-02-28T00:00', 90, 100, 90, 99],
    flat('2024-02-29', 99),
    ...day
  ];
  const params = { ...baseParams, intradayLossBuffer: 0.01 };
  const run = (day: BarSpec[]) => runBoth(makeSeries(base(day)), '2024-02-27', params, settingsOf(10, 0, 'stop'));

  test('the stop wins at the buffered signal’s minute or earlier', () => {
    // 03-01 is the hold day; the 00:01 close 88 triggers both the buffer and (its low) the stop.
    const result = run([
      ['2024-03-01T00:00', 99, 99, 98, 98],
      ['2024-03-01T00:01', 98, 98, 87, 88],
      ['2024-03-01T00:02', 88, 88, 88, 88]
    ]);

    assert.equal(result.reference.trades[0]!.exitReason, 'trailing stop');
    assert.equal(result.reference.trades[0]!.exitPrice, 95);
    assert.deepEqual(compareRuns(result.reference, result.fast).differences, []);
  });

  test('while the stop is active the buffer never acts first: a buffer close is already below the stop', () => {
    // An active stop is above breakeven, so a close at -1% net has traded through it in the same minute (D1's own
    // note); D1's "minute after the signal" precedence can therefore only matter with an inactive stop.
    const result = run([
      ['2024-03-01T00:00', 99, 99, 96, 96],
      ['2024-03-01T00:01', 96, 96, 95.5, 95.5], // neither: 95.5 is above the stop and net positive
      ['2024-03-01T00:05', 94, 94, 88, 88] // opens through the stop after missing minutes
    ]);

    assert.equal(result.reference.trades[0]!.exitReason, 'trailing stop');
    assert.equal(result.reference.trades[0]!.exitExecution, 'minute open through stop');
    assert.equal(result.reference.trades[0]!.exitPrice, 94);
    assert.deepEqual(compareRuns(result.reference, result.fast).differences, []);
  });
});
