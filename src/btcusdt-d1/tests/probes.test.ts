// Parity probes from the independent pre-freeze review (reviews/PRE_FREEZE_REVIEW.md, appendix B), on paths the
// other tests did not cover; the two stop-fill probes are restated for the conventions fixed after that review.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayIndexOf, dayOf } from '../calendar.ts';
import { buildDays, runReference } from '../engine.ts';
import { runFast } from '../fast.ts';
import { compareRuns, reconcileLedger } from '../parity.ts';
import { at, baseParams, flat, makeSeries, settingsOf } from './fixtures.ts';

const both = (bars: any[], armDate: string, params = baseParams, settings = settingsOf(10, 5), windows?: any[]) => {
  const series = makeSeries(bars);
  const armStartDay = dayOf(at(`${armDate}T00:00`));
  const w = windows ?? [{ label: 'all', startDay: armStartDay, endDay: dayOf(series.time[series.rows - 1]!) + 1 }];
  const reference = runReference({ days: buildDays(series), params, settings, armStartDay, windows: w, events: true });
  const fast = runFast({ series, index: dayIndexOf(series), params, settings, armStartDay, windows: w });
  return { reference, fast, parity: compareRuns(reference, fast), ledger: reconcileLedger(reference, 100000) };
};

const entry = (): any[] => [
  flat('2024-01-01', 100),
  flat('2024-01-02', 100),
  ['2024-01-03T00:00', 100, 100, 99, 99],
  ['2024-01-03T00:01', 99, 99, 89, 89],
  ['2024-01-03T00:02', 89, 89, 88, 88.5],
  ['2024-01-03T00:03', 88.5, 90, 88.5, 90],
  ['2024-01-03T00:05', 91, 92, 90.5, 92],
  ['2024-01-03T00:06', 92, 105, 92, 104]
];

test('whole missing UTC days while long, armed, pending, and inside a continuation window', () => {
  for (const s of ['adverse', 'stop', 'low'] as const) {
    // long across missing 01-04..01-05, stop gap after the gap, then missing days inside the continuation window
    const bars = [
      ...entry(),
      // 2024-01-04 and 01-05 missing entirely
      ['2024-01-06T00:00', 101, 101, 100, 100.5], // stop 99.75 active; no gap
      ['2024-01-06T00:01', 100.5, 100.6, 99, 99.2],
      ['2024-01-06T00:02', 99.2, 99.4, 99.1, 99.3],
      // 01-07 missing; continuation window W=3 days after exit day 01-06
      ['2024-01-08T00:00', 99.3, 99.3, 94, 94.5], // pullback 5% from 100.6? (window high = 99.2 exit, then day highs)
      ['2024-01-08T00:01', 94.5, 97, 94.5, 97],
      ['2024-01-08T23:59', 97, 98, 96, 98], // decision on the day's last bar? (only if armed and rebound)
      // 01-09 missing: a pending order carried over a missing day
      ['2024-01-10T00:00', 98, 99, 97, 98.5],
      ['2024-01-10T00:01', 98.5, 99, 98, 99]
    ];
    const r = both(bars, '2024-01-03', { ...baseParams, continuationWindow: 3 }, settingsOf(10, 5, s));
    assert.deepEqual(r.parity.differences, [], s);
    assert.deepEqual(r.ledger, [], s);
  }
});

test('a buy decided on a day whose remaining minutes are missing fills on the next existing day (after a missing day)', () => {
  const bars = [
    flat('2024-01-01', 100),
    flat('2024-01-02', 100),
    ['2024-01-03T00:00', 100, 100, 89, 89],
    ['2024-01-03T00:01', 89, 89, 88, 88],
    ['2024-01-03T00:02', 88, 90, 88, 90], // decision at 00:03, no later bar on 01-03
    // 01-04 missing
    ['2024-01-05T00:00', 95, 96, 94, 95],
    ['2024-01-05T00:01', 95, 96, 94, 95],
    ['2024-01-06T00:00', 95, 96, 94, 95]
  ];
  const r = both(bars, '2024-01-03');
  assert.deepEqual(r.parity.differences, []);
  assert.equal(r.reference.trades[0]!.entryDay, dayOf(at('2024-01-05T00:00')));
  assert.equal(r.reference.trades[0]!.entryExecution, 'carried to next day opening trade');
});

test('reporting windows opening and closing while long (validation-style incremental windows)', () => {
  const bars = [
    ...entry(),
    ['2024-01-04T00:00', 104, 110, 103, 109],
    ['2024-01-04T12:00', 109, 111, 108, 110],
    ['2024-01-05T00:00', 110, 112, 109, 111],
    ['2024-01-05T13:00', 111, 111, 100, 101], // stop (max(105,111,112)*0.95=106.4?) trades through
    ['2024-01-05T13:01', 101, 102, 100, 101.5],
    ['2024-01-06T00:00', 101, 101, 101, 101]
  ];
  const d = (s: string) => dayOf(at(`${s}T00:00`));
  const windows = [
    { label: 'sel', startDay: d('2024-01-03'), endDay: d('2024-01-04') },
    { label: 'val', startDay: d('2024-01-04'), endDay: d('2024-01-06') },
    { label: 'late', startDay: d('2024-01-05'), endDay: d('2024-01-07') },
    { label: 'gapstart', startDay: d('2023-12-31'), endDay: d('2024-01-02') }
  ];
  for (const s of ['adverse', 'stop', 'low'] as const) {
    const r = both(bars, '2024-01-03', baseParams, settingsOf(10, 5, s), windows);
    assert.deepEqual(r.parity.differences, [], s);
  }
});

test('maximum hold due on a day with a single minute: neither engine exits that day', () => {
  const bars = [
    flat('2024-02-25', 100),
    flat('2024-02-26', 100),
    ['2024-02-27T00:00', 100, 100, 89, 89],
    ['2024-02-27T00:01', 89, 89, 88, 88],
    ['2024-02-27T00:02', 88, 90, 88, 90],
    ['2024-02-27T00:03', 90, 90, 90, 90],
    flat('2024-02-28', 89.5),
    flat('2024-02-29', 89.5),
    ['2024-03-01T00:00', 85, 85, 85, 85], // hold due, only bar of the day
    ['2024-03-02T00:00', 84, 84, 84, 84],
    ['2024-03-02T00:01', 84.5, 84.5, 84.5, 84.5]
  ];
  const r = both(bars, '2024-02-27');
  assert.deepEqual(r.parity.differences, []);
  assert.equal(r.reference.trades[0]!.exitTime, at('2024-03-02T00:01'));
});

test('a buffered sale carried overnight meets a stop that became active from the signal day high and gaps', () => {
  const bars = [
    flat('2024-02-25', 100),
    flat('2024-02-26', 100),
    ['2024-02-27T00:00', 100, 100, 89, 89],
    ['2024-02-27T00:01', 89, 89, 88, 88],
    ['2024-02-27T00:02', 88, 90, 88, 90],
    ['2024-02-27T00:03', 90, 90, 90, 90], // entry 90, stop 85.5 (inactive)
    flat('2024-02-28', 90),
    flat('2024-02-29', 90),
    ['2024-03-01T00:00', 90.5, 90.5, 90.5, 90.5], // hold day, profitable at open
    ['2024-03-01T00:01', 90.5, 120, 90.5, 119], // spike: day high 120 -> stop 114 for 03-02 (active)
    ['2024-03-01T23:59', 119, 119, 88, 88.5], // last minute: buffer signal (net <= -1%), carried
    ['2024-03-02T00:00', 87, 87, 86, 86.5], // opens below the stop: gap exit takes the open
    ['2024-03-02T00:01', 86.5, 86.5, 86.5, 86.5]
  ];
  for (const s of ['adverse', 'stop', 'low'] as const) {
    const r = both(bars, '2024-02-27', baseParams, settingsOf(10, 5, s));
    assert.deepEqual(r.parity.differences, [], s);
    assert.equal(r.reference.trades[0]!.exitReason, 'trailing stop gap');
  }
});

test('a stop triggered on the day’s last minute sells at the next day’s first trade, at most the stop (adverse, worst)', () => {
  const bars = [
    ...entry(),
    ['2024-01-04T00:00', 104, 104, 101, 101],
    ['2024-01-04T23:59', 101, 101, 99, 99.6], // trades through 99.75, last minute
    ['2024-01-05T00:00', 90, 90, 90, 90], // next trade 10% lower
    ['2024-01-05T00:01', 90, 90, 90, 90]
  ];

  for (const stopFill of ['adverse', 'low'] as const) {
    const r = both(bars, '2024-01-03', baseParams, settingsOf(10, 5, stopFill));

    assert.deepEqual(r.parity.differences, []);
    assert.equal(r.reference.trades[0]!.exitPrice, 90);
    assert.equal(r.reference.trades[0]!.exitTime, at('2024-01-05T00:00'));
    assert.equal(r.reference.trades[0]!.exitExecution, 'carried to next day opening trade');
  }
});

test('the worst-case convention never fills above the principal adverse one', () => {
  const cases: [number, number][] = [
    [99, 95], // the next minute opens below the trigger low: both 95
    [98, 99.5] // a V-shaped trigger minute: adverse 99.5, worst 98
  ];

  for (const [triggerLow, nextOpen] of cases) {
    const bars = [
      ...entry(),
      ['2024-01-04T00:00', 104, 104, 101, 101],
      ['2024-01-04T00:01', 101, 101, triggerLow, 99.8],
      ['2024-01-04T00:02', nextOpen, Math.max(nextOpen, 96), Math.min(nextOpen, 94), nextOpen]
    ];
    const adverse = both(bars, '2024-01-03', baseParams, settingsOf(10, 5, 'adverse'));
    const low = both(bars, '2024-01-03', baseParams, settingsOf(10, 5, 'low'));

    assert.deepEqual(adverse.parity.differences, []);
    assert.deepEqual(low.parity.differences, []);
    assert.equal(adverse.reference.trades[0]!.exitPrice, Math.min(99.75, nextOpen));
    assert.equal(low.reference.trades[0]!.exitPrice, Math.min(99.75, triggerLow, nextOpen));
    assert.ok(low.reference.trades[0]!.netPnl <= adverse.reference.trades[0]!.netPnl);
  }
});

test('cancel path and an exhausted account stay in parity', () => {
  const r = both(
    [...entry(), ['2024-01-04T00:00', 1, 1, 1, 1], ['2024-01-05T00:00', 1, 1, 1, 1]],
    '2024-01-03',
    baseParams,
    { ...settingsOf(10, 5), minOrderNotional: 10 }
  );
  assert.deepEqual(r.parity.differences, []);
});
