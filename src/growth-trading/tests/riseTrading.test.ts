// rise-from-recent-low-trading: signal-to-fill chronology, fresh-signal re-entry, the profit-conditional trailing stop
// (activation, ratchet, gaps), the maximum losing hold, the buffered intraday loss (net after interest, exact boundary,
// next eligible fill, overnight carry), the switches and their dependency, cent-level accounting against the shared
// fixed ledger, minute versus daily drawdowns, determinism, and the ABSENCE of any post-loss restriction.
//
// Fixtures: src/shared-margin-portfolio/tests/fixtures.ts — sessions on consecutive calendar dates (so session index =
// calendar days), minute bars from 9:30 whose open is the previous minute's close, and a closing print = the last close.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { barsFromSessions } from '../../entry-signals/bars.ts';
import { scanRiseFromRecentLow } from '../../entry-signals/riseFromRecentLow.ts';
import type { Dataset } from '../../four-family/data.ts';
import { continuationOf } from '../../../apps/strategy-lab/runner/growth-params.ts';
import type { ParamValue } from '../../../apps/strategy-lab/shared/contract.ts';
import {
  RISE_FROM_RECENT_LOW_TRADING,
  RISE_FROM_RECENT_LOW_TRADING_1_0_0
} from '../../../apps/strategy-lab/shared/strategies.ts';
import { CONTINUATION_METHODS, DEFAULT_CONTINUATION } from '../continuation.ts';
import { type SessionSpec, buildData, flat } from '../../shared-margin-portfolio/tests/fixtures.ts';
import {
  type EntryDecision,
  type RiseTradingParams,
  bookSettingsOf,
  defaultTradingParams,
  exitParamsOf,
  ledgerOf,
  percentToFraction,
  reconcileWithFixedLedger,
  runRiseTrading,
  simulateTrading,
  summarizeSimulation,
  tradingParamErrors,
  warmupSessionsFor
} from '../riseTrading.ts';

const day = (days: number) => (100_000 * 0.11 * days) / 365; // interest on the notional
const atClose = (ds: Dataset, s: number, id = `close${s}`): EntryDecision => ({
  id,
  sessionIndex: s,
  time: ds.sCloseTime[s]!,
  price: ds.sClose[s]!,
  trigger: NaN,
  reference: NaN
});
// Known when minute k of session s completes.
const afterMinute = (ds: Dataset, s: number, k: number, id = `s${s}m${k}`): EntryDecision => ({
  id,
  sessionIndex: s,
  time: ds.bTime[ds.sBarStart[s]! + k]! + 60,
  price: ds.bClose[ds.sBarStart[s]! + k]!,
  trigger: NaN,
  reference: NaN
});
const at = (ds: Dataset, s: number, time: number, id: string): EntryDecision => ({
  id,
  sessionIndex: s,
  time,
  price: 100,
  trigger: NaN,
  reference: NaN
});
const run = (
  specs: SessionSpec[],
  decisions: (ds: Dataset) => EntryDecision[],
  over: Partial<RiseTradingParams> = {},
  rate = 0.11
) => {
  const { ds } = buildData(specs);
  const p: RiseTradingParams = { ...defaultTradingParams, trailingStopPercent: 5, costBpsPerSide: 0, ...over };
  const sim = simulateTrading(ds, decisions(ds), {
    symbol: 'TEST',
    firstSession: 0,
    endSession: ds.sessionCount - 1,
    exit: exitParamsOf(p),
    book: { ...bookSettingsOf(p), rate }
  });
  return { ds, sim, trades: sim.trades, summary: summarizeSimulation(sim, ds) };
};
const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const startOf = (ds: Dataset, s: number, k: number) => ds.bTime[ds.sBarStart[s]! + k]!;

describe('signal-to-fill chronology', () => {
  test('a decision at the close (daily signal) fills at the next session’s opening trade, never the closing print', () => {
    const { ds, trades, sim } = run([flat(100), { closes: [101, 102, 103] }, flat(103)], (d) => [atClose(d, 0)]);
    assert.equal(trades.length, 1);
    assert.equal(trades[0]!.entryIndex, 1);
    assert.equal(trades[0]!.entryBar, 0);
    assert.equal(trades[0]!.entryExecution, 'opening trade');
    assert.equal(trades[0]!.entryRawPrice, 101);
    assert.equal(trades[0]!.entryTime, startOf(ds, 1, 0));
    assert.equal(trades[0]!.carriedOvernight, true);
    assert.equal(sim.outcomes[0]!.status, 'filled');
  });

  test('an intraday decision fills at the next minute’s open; one after the last minute at the closing print', () => {
    const a = run([flat(100), { closes: [100, 101, 102, 103, 104] }, flat(104)], (d) => [afterMinute(d, 1, 2)]);
    assert.equal(a.trades[0]!.entryIndex, 1);
    assert.equal(a.trades[0]!.entryBar, 3);
    assert.equal(a.trades[0]!.entryRawPrice, 102); // minute 3 opens at minute 2's close
    assert.equal(a.trades[0]!.entryExecution, 'first trade after decision');
    assert.ok(a.trades[0]!.entryTime >= a.trades[0]!.decisionTime); // no fill before the decision is known
    const b = run([flat(100), { closes: [100, 101, 102] }, flat(104)], (d) => [afterMinute(d, 1, 2)]);
    assert.equal(b.trades[0]!.entryBar, 3); // the bar count = the closing print
    assert.equal(b.trades[0]!.entryExecution, 'closing print');
    const c = run([flat(100), { closes: [100, 101, 102], closingPrint: false }, { closes: [99, 99] }], (d) => [
      afterMinute(d, 1, 2)
    ]);
    assert.equal(c.trades[0]!.entryIndex, 2); // no trade left: the next session's opening trade
    assert.equal(c.trades[0]!.entryExecution, 'opening trade');
    assert.equal(c.trades[0]!.entryRawPrice, 99);
  });

  test('an order still pending at the end of the window is unfilled (no invented fill)', () => {
    const { sim, summary } = run([flat(100), flat(100)], (d) => [atClose(d, 1)]);
    assert.equal(sim.trades.length, 0);
    assert.equal(sim.outcomes[0]!.status, 'unfilled_at_end');
    assert.equal(summary.metrics.signals.unfilledAtEnd, 1);
  });
});

describe('profit-conditional trailing stop (mandatory, D1 net-profit rule)', () => {
  test('no exit on the entry session; next session an active stop gapped through fills at the open, even at a loss', () => {
    const { trades } = run(
      [flat(100), { closes: [100, 110, 120, 100, 95, 90] }, { closes: [90, 91] }, flat(91)],
      (d) => [atClose(d, 0)]
    );
    const t = trades[0]!;
    assert.equal(t.entryIndex, 1);
    assert.equal(t.exitIndex, 2); // the fall to 90 on the entry session itself does not exit
    assert.equal(t.exitStopPrice, 114); // 120 × 0.95, from the fill onwards
    assert.equal(t.stopActiveAtExit, true); // 1000 × 114 − 100,000 − interest > 0
    assert.equal(t.exitReason, 'trailing stop gap');
    assert.equal(t.exitExecution, 'opening trade');
    assert.equal(t.exitRawPrice, 90);
    near(t.net, -10_000 - day(1));
  });

  test('a losing trade has no active stop: with the maximum hold off it stays open, marked, not closed', () => {
    const specs = [flat(100), { closes: [100, 102, 101] }, ...Array.from({ length: 10 }, () => flat(80))];
    const { trades, summary, ds } = run(specs, (d) => [atClose(d, 0)], {
      maximumHoldEnabled: false,
      intradayLossBufferEnabled: false
    });
    const t = trades[0]!;
    assert.equal(t.exitIndex, -1);
    assert.equal(t.exitReason, 'open');
    assert.equal(t.stopFirstActiveIndex, -1); // 96.9 stop: never profitable to fill at, so never active
    assert.equal(t.exitRawPrice, 80); // marked at the last close
    near(t.net, -20_000 - day(ds.sessionCount - 1 - 1));
    assert.equal(summary.metrics.trades.closed, 0);
    assert.equal(summary.metrics.trades.winRatePercent, null);
    assert.equal(summary.metrics.unavailable.winRate, 'no closed trades');
    near(summary.metrics.pnl.unrealized!.netUsd, t.net);
    assert.equal(summary.metrics.pnl.realizedNetUsd, 0);
    // The same path with the maximum hold on exits by it (8 calendar days).
    const held = run(specs, (d) => [atClose(d, 0)]);
    assert.equal(held.trades[0]!.exitReason, 'maximum hold');
    assert.equal(held.trades[0]!.exitIndex, 9);
  });

  test('ratchet: the stop rises after each session from the post-entry high, never during it, never down', () => {
    const up = run(
      [flat(100), { closes: [100, 110] }, { closes: [111, 120, 106] }, { closes: [113, 114] }, flat(114)],
      (d) => [atClose(d, 0)]
    );
    // Session 2 trades at 106, below 120 × 0.95 = 114, but its own high does not move its stop (104.5).
    assert.equal(up.trades[0]!.exitIndex, 3);
    assert.equal(up.trades[0]!.exitStopPrice, 114);
    assert.equal(up.trades[0]!.exitReason, 'trailing stop gap');
    near(up.trades[0]!.net, 13_000 - day(2));
    const lower = run(
      [flat(100), { closes: [100, 110] }, { closes: [108, 107] }, { closes: [106, 104] }, flat(104)],
      (d) => [atClose(d, 0)]
    );
    // A lower high (108) leaves the stop at 104.5; minute 1 opens at 106 and trades down to 104 → fills AT the stop.
    const t = lower.trades[0]!;
    assert.equal(t.exitStopPrice, 104.5);
    assert.equal(t.exitReason, 'trailing stop');
    assert.equal(t.exitExecution, 'stop level');
    assert.equal(t.exitRawPrice, 104.5);
    assert.equal(t.exitBar, 1);
    near(t.net, 4_500 - day(2));
  });
});

describe('maximum losing hold (calendar days, decided at the opening trade)', () => {
  const losing = [flat(100), flat(100), flat(99), flat(98), { closes: [97.5, 97, 96] }, flat(96)];

  test('exits at the trade after the opening trade on the first session at the age with a losing open', () => {
    const { trades } = run(losing, (d) => [atClose(d, 0)], { maximumHoldDays: 3 });
    const t = trades[0]!;
    assert.equal(t.exitIndex, 4); // days 1 and 2 opened losing too, but were younger than 3 days
    assert.equal(t.exitReason, 'maximum hold');
    assert.equal(t.exitBar, 1);
    assert.equal(t.exitExecution, 'first trade after decision');
    assert.equal(t.exitRawPrice, 97.5);
    assert.equal(t.maximumHoldDue, true);
    near(t.net, -2_500 - day(3));
  });

  test('a profitable open at the age continues; it exits on a later losing open (no fixed-duration sale)', () => {
    const specs = [flat(100), flat(100), flat(99), flat(98), { closes: [101, 99] }, { closes: [99.5, 99] }, flat(99)];
    const { trades } = run(specs, (d) => [atClose(d, 0)], { maximumHoldDays: 3 });
    assert.equal(trades[0]!.exitIndex, 5); // day 3 opened at +$909.59 net: kept
    assert.equal(trades[0]!.exitReason, 'maximum hold');
    assert.equal(trades[0]!.exitRawPrice, 99.5);
  });
});

describe('buffered intraday loss (net after interest, % of the notional, from the hold age)', () => {
  const path = (s4: SessionSpec): SessionSpec[] => [flat(100), flat(100), flat(100.5), flat(100.5), s4, flat(97)];
  const opts = { maximumHoldDays: 3, intradayLossBufferPercent: 2 };

  test('exact boundary: a completed minute closing at net −$2,000 sells at the next minute’s open', () => {
    const { trades, ds } = run(path({ closes: [100.5, 99, 98.01, 98, 97] }), (d) => [atClose(d, 0)], opts, 0);
    const t = trades[0]!;
    assert.equal(t.exitReason, 'buffered intraday loss');
    assert.equal(t.bufferSignalPrice, 98); // net = 1000 × 98 − 100,000 = −2,000 ≤ −2,000
    assert.equal(t.bufferSignalTime, startOf(ds, 4, 3) + 60);
    assert.equal(t.exitBar, 4);
    assert.equal(t.exitExecution, 'first trade after decision');
    assert.equal(t.exitRawPrice, 98);
    const above = run(path({ closes: [100.5, 99, 98.01, 98.001, 97] }), (d) => [atClose(d, 0)], opts, 0);
    assert.equal(above.trades[0]!.bufferSignalPrice, 97); // −1,999 does not reach it; the last minute does
    assert.equal(above.trades[0]!.exitExecution, 'closing print'); // decided before the close
  });

  test('the threshold is on NET P&L after accrued interest, not on the price move', () => {
    const s4 = { closes: [100.5, 98.05, 97.5] }; // price loss $1,950; with 3 days of 11% interest −$2,040.41
    const withInterest = run(path(s4), (d) => [atClose(d, 0)], opts, 0.11);
    assert.equal(withInterest.trades[0]!.bufferSignalPrice, 98.05);
    const noInterest = run(path(s4), (d) => [atClose(d, 0)], opts, 0);
    assert.equal(noInterest.trades[0]!.bufferSignalPrice, 97.5);
  });

  test('a sale with no trade left in its session is carried to the next session’s opening trade', () => {
    const specs = [
      flat(100),
      flat(100),
      flat(100.5),
      flat(100.5),
      { closes: [100.5, 97], closingPrint: false },
      flat(96)
    ];
    const { trades, ds } = run(specs, (d) => [atClose(d, 0)], opts, 0);
    const t = trades[0]!;
    assert.equal(t.exitIndex, 5);
    assert.equal(t.exitReason, 'buffered intraday loss');
    assert.equal(t.exitExecution, 'opening trade');
    assert.equal(t.exitRawPrice, 96);
    assert.equal(t.bufferSignalTime, startOf(ds, 4, 1) + 60);
  });

  test('no buffer exit before the hold age; at the age a losing open takes the maximum hold first', () => {
    const early = run(
      [flat(100), flat(100), { closes: [100, 90, 100] }, flat(100), flat(100)],
      (d) => [atClose(d, 0)],
      {
        ...opts,
        maximumHoldDays: 8
      }
    );
    assert.equal(early.trades[0]!.exitIndex, -1); // −10% intraday on day 1: no exit
    const due = run(
      [flat(100), flat(100), flat(99), flat(99), { closes: [97, 96] }, flat(96)],
      (d) => [atClose(d, 0)],
      opts
    );
    assert.equal(due.trades[0]!.exitReason, 'maximum hold');
  });
});

describe('switches, dependency and validation', () => {
  test('defaults are the registered VGT D1 baseline exits; OFF is an infinite threshold in the unchanged ExitManager', () => {
    const d = exitParamsOf(defaultTradingParams);
    assert.equal(d.trailingStopPercentage, 0.073);
    assert.equal(d.maximumHoldDays, 8);
    assert.equal(d.intradayLossBuffer, 0.029);
    assert.equal(d.stopPolicy, 'net');
    assert.equal(d.postExit, false);
    const off = exitParamsOf({ ...defaultTradingParams, maximumHoldEnabled: false, intradayLossBufferEnabled: false });
    assert.equal(off.maximumHoldDays, Infinity);
    assert.equal(off.intradayLossBuffer, Infinity);
    for (const [percent, fraction] of [
      [2.9, 0.029],
      [7.3, 0.073],
      [4.4, 0.044],
      [5.7, 0.057],
      [0, 0],
      [2.95, 0.0295]
    ] as const)
      assert.equal(percentToFraction(percent), fraction);
    const noBuffer = exitParamsOf({ ...defaultTradingParams, intradayLossBufferEnabled: false });
    assert.equal(noBuffer.maximumHoldDays, 8);
    assert.equal(noBuffer.intradayLossBuffer, Infinity);
  });

  test('Strategy Lab’s registry offers exactly these defaults and parameter keys', () => {
    const defaults = (spec: typeof RISE_FROM_RECENT_LOW_TRADING) =>
      Object.fromEntries(spec.params.map((p) => [p.key, p.default])) as Record<string, ParamValue>;
    const { resolution, ...rest } = defaultTradingParams;
    // the legacy 1.0.0 schema: exactly the engine's base parameters
    assert.deepEqual(defaults(RISE_FROM_RECENT_LOW_TRADING_1_0_0), rest);
    // 1.1.0: the same base defaults, plus the continuation dimensions whose defaults are the engine's own
    const current = defaults(RISE_FROM_RECENT_LOW_TRADING);
    assert.deepEqual(Object.fromEntries(Object.keys(rest).map((k) => [k, current[k]])), rest);
    assert.equal(current.continuationEnabled, false);
    assert.equal(continuationOf({ strategyVersion: '1.1.0', params: current } as never), null);
    for (const method of CONTINUATION_METHODS)
      assert.deepEqual(
        continuationOf({
          strategyVersion: '1.1.0',
          params: { ...current, continuationEnabled: true, continuationMethod: method }
        } as never),
        DEFAULT_CONTINUATION[method]
      );
    assert.equal(RISE_FROM_RECENT_LOW_TRADING.defaultResolution, resolution);
  });

  test('the buffer requires the maximum hold; invalid values are refused', () => {
    assert.deepEqual(tradingParamErrors(defaultTradingParams), []);
    const dep = tradingParamErrors({ ...defaultTradingParams, maximumHoldEnabled: false });
    assert.equal(dep.length, 1);
    assert.match(dep[0]!, /applies only from the maximum losing-hold age/);
    assert.deepEqual(
      tradingParamErrors({ ...defaultTradingParams, maximumHoldEnabled: false, intradayLossBufferEnabled: false }),
      []
    );
    for (const bad of [
      { trailingStopPercent: 0 },
      { trailingStopPercent: 100 },
      { maximumHoldDays: 2.5 },
      { maximumHoldDays: 0 },
      { intradayLossBufferPercent: -1 },
      { costBpsPerSide: -1 },
      { recentLowLookbackBars: 1 },
      { advanceFromRecentLowPercent: 0 }
    ])
      assert.ok(tradingParamErrors({ ...defaultTradingParams, ...bad }).length > 0, JSON.stringify(bad));
    assert.throws(() => exitParamsOf({ ...defaultTradingParams, maximumHoldEnabled: false }), /losing-hold age/);
  });

  test('buffer OFF with the hold ON: no buffer sale; the next losing open exits by the maximum hold', () => {
    const specs = [flat(100), flat(100), flat(100.5), flat(100.5), { closes: [100.5, 99, 98, 97] }, flat(97), flat(97)];
    const { trades } = run(specs, (d) => [atClose(d, 0)], {
      maximumHoldDays: 3,
      intradayLossBufferPercent: 2,
      intradayLossBufferEnabled: false
    });
    assert.equal(trades[0]!.exitIndex, 5);
    assert.equal(trades[0]!.exitReason, 'maximum hold');
  });
});

describe('fresh-signal re-entry, occupancy and no restriction', () => {
  const specs = [
    flat(100),
    flat(100),
    flat(99),
    flat(98),
    { closes: [97, 97, 99, 103, 104, 104] },
    flat(104),
    flat(104)
  ];
  const decisions = (ds: Dataset) => [
    atClose(ds, 0, 'first'),
    afterMinute(ds, 2, 2, 'while-invested'),
    at(ds, 4, startOf(ds, 4, 1), 'at-exit-instant'),
    afterMinute(ds, 4, 3, 'fresh')
  ];

  test('a signal while invested is rejected and never replayed; a fresh signal re-enters at a HIGHER price', () => {
    const { sim, trades } = run(specs, decisions, { maximumHoldDays: 3 });
    assert.deepEqual(
      sim.outcomes.map((o) => [o.decision.id, o.status, o.reason]),
      [
        ['first', 'filled', null],
        ['while-invested', 'rejected', 'position_open'],
        ['at-exit-instant', 'rejected', 'position_open'], // judged before the exit at the same instant
        ['fresh', 'filled', null]
      ]
    );
    assert.equal(trades.length, 2);
    assert.equal(trades[0]!.exitReason, 'maximum hold');
    assert.equal(trades[0]!.exitRawPrice, 97); // a 3% price loss …
    assert.equal(trades[1]!.entryIndex, 4); // … and a same-session re-entry …
    assert.equal(trades[1]!.entryRawPrice, 103); // … 6.2% ABOVE the loss exit: no lower-price requirement
    assert.ok(trades[1]!.entryTime > trades[0]!.exitTime); // never overlapping
    assert.equal(trades[1]!.exitIndex, -1); // no exit on its entry session; flat later prices keep it open
    assert.ok(trades.every((t) => t.setupKind === ('rise' as string))); // no D1 dip or continuation entry
  });

  test('an order not yet filled rejects further decisions as order_pending', () => {
    const { sim, trades } = run(
      [{ closes: [100, 100], closingPrint: false }, flat(101), flat(101)],
      (d) => [afterMinute(d, 0, 1, 'carried'), at(d, 1, startOf(d, 1, 0), 'pending')],
      {}
    );
    assert.deepEqual(
      sim.outcomes.map((o) => [o.status, o.reason]),
      [
        ['filled', null],
        ['rejected', 'order_pending']
      ]
    );
    assert.equal(trades.length, 1);
  });

  test('no post-loss restriction state or guard exists in the strategy (code and behaviour)', () => {
    // v1.1.0 adds continuation EPISODES, which only a net-PROFITABLE exit opens (tests/continuation.test.ts); the
    // cancelled post-loss restriction, lower re-entry, recovery reset and cooldowns stay absent from both files.
    for (const file of ['../riseTrading.ts', '../continuation.ts']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      assert.doesNotMatch(source, /materialLoss|lowerPrice[A-Z]|lowerLevel|retrace|recoveryReset|lossExitPrice/);
    }
    const continuation = readFileSync(new URL('../continuation.ts', import.meta.url), 'utf8');
    assert.match(continuation, /const qualifies = trade\.net > 0;/);
    const { sim } = run(specs, decisions, { maximumHoldDays: 3 });
    assert.equal(sim.continuation, null); // OFF by default
    assert.deepEqual(Object.keys(sim).sort(), [
      'book',
      'continuation',
      'daily',
      'dailyDrawdown',
      'endSession',
      'excursions',
      'exit',
      'firstSession',
      'log',
      'markChanges',
      'minuteDrawdown',
      'minuteMarks',
      'outcomes',
      'realized',
      'symbol',
      'trades'
    ]);
    const exit = exitParamsOf(defaultTradingParams) as unknown as Record<string, unknown>;
    for (const key of ['materialLossThreshold', 'lowerPriceReentry', 'retraceFraction'])
      assert.equal(key in exit, false);
  });

  test('deterministic: the same inputs give identical trades, outcomes and marks', () => {
    const a = run(specs, decisions, { maximumHoldDays: 3 });
    const b = run(specs, decisions, { maximumHoldDays: 3 });
    const strip = (r: typeof a) =>
      JSON.stringify({ t: r.trades, o: r.sim.outcomes.map((o) => [o.decision.id, o.status]), d: r.sim.daily });
    assert.equal(strip(a), strip(b));
  });
});

describe('the whole strategy: unchanged scanner decisions, edge-triggered re-arming', () => {
  const sessions = (): SessionSpec[] => [
    flat(100),
    flat(100),
    flat(100),
    flat(100),
    { closes: [100, 106] }, // 6% over the 3-bar low of 100 after a bar below: signal at the close
    { closes: [106, 108] }, // still ≥ 5% over the rolling low: no new signal, no repeated buy
    { closes: [108, 110] },
    { closes: [110, 112] },
    { closes: [112, 104] }, // stop 106.4 (112 × 0.95) hit; the bar is below its threshold: the rule re-arms
    { closes: [104, 110] }, // a FRESH signal (110 ≥ 104 × 1.05 after a bar below)
    flat(110)
  ];

  test('decisions are exactly the scanner’s signals; one buy per signal; re-entry only on a fresh signal', () => {
    const { vgtSessions } = buildData(sessions());
    const p: RiseTradingParams = {
      ...defaultTradingParams,
      advanceFromRecentLowPercent: 5,
      recentLowLookbackBars: 3,
      trailingStopPercent: 5,
      costBpsPerSide: 0
    };
    const r = runRiseTrading('TEST', vgtSessions, 0, p);
    const reference = scanRiseFromRecentLow(barsFromSessions(vgtSessions, '1d'), {
      advanceFromRecentLowPercent: 5,
      recentLowLookbackBars: 3
    }).signals;
    assert.deepEqual(
      r.decisions.map((d) => [d.time, d.price]),
      reference.map((s) => [s.time, s.close])
    );
    assert.equal(r.decisions.length, 2);
    const [t1, t2] = r.simulation.trades;
    assert.equal(t1!.entryIndex, 5);
    assert.equal(t1!.exitIndex, 8);
    assert.equal(t1!.exitReason, 'trailing stop');
    assert.equal(t2!.entryIndex, 10); // the fresh signal of session 9, filled at the next opening trade
    assert.equal(r.simulation.outcomes.filter((o) => o.status === 'rejected').length, 0);
  });

  test('warm-up is the signal-only runner’s formula', () => {
    assert.equal(warmupSessionsFor('1d', 20), 21);
    assert.equal(warmupSessionsFor('60m', 20), 4); // ceil(21 / 7) + 1
    assert.equal(warmupSessionsFor('1m', 20), 2);
  });
});

describe('accounting and drawdowns', () => {
  test('cent-level P&L with 5 bps per side reconciles with the shared fixed ledger and the gross/friction identity', () => {
    const { trades, sim, ds } = run(
      [flat(100), { closes: [100, 110] }, { closes: [108, 107] }, { closes: [106, 104] }, flat(104)],
      (d) => [atClose(d, 0)],
      { costBpsPerSide: 5 }
    );
    const t = trades[0]!;
    const shares = 100_000 / (100 * 1.0005);
    const expected = shares * 104.5 * (1 - 0.0005) - 100_000 - day(2);
    assert.equal(t.exitReason, 'trailing stop');
    assert.equal(t.net.toFixed(2), expected.toFixed(2));
    near(t.net, expected, 1e-6);
    const [row] = ledgerOf(sim, ds);
    near(row!.grossBeforeCosts, shares * 4.5, 1e-6);
    near(row!.entryFriction, shares * 0.05, 1e-6);
    near(row!.exitFriction, shares * 104.5 * 0.0005, 1e-6);
    near(row!.interest, day(2), 1e-9);
    assert.ok(Math.abs(row!.identityResidual) < 1e-6);
    assert.equal(row!.interestDays, 2);
    assert.equal(reconcileWithFixedLedger(sim, ds).maxDifference, 0);
  });

  test('minute drawdown sees an intraday dip the daily marks never see; percentages are of the $100,000 notional', () => {
    const { summary } = run(
      [flat(100), flat(100), { closes: [100, 90, 100] }, flat(100)],
      (d) => [atClose(d, 0)],
      { maximumHoldEnabled: false, intradayLossBufferEnabled: false },
      0
    );
    const { minute, daily } = summary.metrics.drawdown;
    near(minute.maximumUsd, 10_000);
    near(minute.percentOfNotional, 10);
    assert.equal(daily.maximumUsd, 0);
    assert.equal(daily.peakTime, null); // no drawdown: no fabricated peak or trough
    assert.equal(summary.metrics.checks.markedEqualsLedger, 0);
  });
});
