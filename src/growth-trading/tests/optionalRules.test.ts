// Growth 1.3.0 optional rules on deterministic synthetic sessions (optionalRules.ts, riseTrading.ts): the ATR
// convention and its completed-data timing, warm-up blocking, the initial risk stop (unprofitable and before the hold
// age, gaps, the entry session, the fill minute, the higher stop governing, precedence with the hold), the trend-
// breakout signal (strict conditions, the prior-high window without the signal session, no replay, a fresh post-exit
// signal without cooldown, insufficient history), trend retention (one partial sale, the trailing stop consumed, the
// remainder's trend counter and its reset, simultaneous triggers, no duplicate sale, financing gates on the remaining
// principal, continuation judged on the whole position), the debt-funded accounting of several fills (proportional
// principal, calendar-day interest across a weekend, per-fill costs, realized + unrealized = marked, the shared fixed
// ledger), logical trade counts and net win/loss classification, and valid OFF states.
//
// Sessions: explicit minute bars [open, high, low, close] from 09:30 (14:30 UTC), a closing print = the last close, dates
// consecutive from Monday 2018-01-01 unless given (so a session index = calendar days unless a date says otherwise).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { barsFromSessions } from '../../entry-signals/bars.ts';
import { type Dataset, fixtureDataset } from '../../four-family/data.ts';
import { DEFAULT_CONTINUATION } from '../continuation.ts';
import {
  type InitialStopConfig,
  type RetentionConfig,
  atrBefore,
  breakoutWarmupSessions,
  scanTrendBreakout,
  sessionSma
} from '../optionalRules.ts';
import {
  type EntryDecision,
  type RiseTradingParams,
  bookSettingsOf,
  defaultTradingParams,
  exitParamsOf,
  ledgerOf,
  reconcileWithFixedLedger,
  runRiseTrading,
  simulateTrading,
  summarizeSimulation,
  tradingParamErrors,
  warmupSessionsForParams
} from '../riseTrading.ts';

type Bar = readonly [open: number, high: number, low: number, close: number];
interface Spec {
  bars: Bar[];
  date?: string;
  closingPrint?: boolean; // default true (= the last close)
}

// Minute closes as bars: each opens at the previous close (the first at its own close), high/low = max/min of the two.
const c = (...closes: number[]): Spec => ({
  bars: closes.map((x, i) => {
    const o = i ? closes[i - 1]! : x;
    return [o, Math.max(o, x), Math.min(o, x), x] as const;
  })
});
const withDate = (spec: Spec, date: string): Spec => ({ ...spec, date });
const dateOf = (day: number) => new Date(Date.parse('2018-01-01') + day * 86_400_000).toISOString().slice(0, 10);

const sessionsOf = (specs: Spec[]): MarketSession[] =>
  specs.map((spec, i) => {
    const date = spec.date ?? dateOf(i);
    const time = Date.parse(date) / 1000;
    const openTime = time + (14 * 60 + 30) * 60;
    const bars: Tick[] = spec.bars.map(([open, high, low, close], k) => ({
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
      closingPrint: spec.closingPrint === false ? undefined : last
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
const afterMinute = (ds: Dataset, s: number, k: number): EntryDecision => ({
  id: `s${s}m${k}`,
  sessionIndex: s,
  time: ds.bTime[ds.sBarStart[s]! + k]! + 60,
  price: ds.bClose[ds.sBarStart[s]! + k]!,
  trigger: NaN,
  reference: NaN
});

const P: RiseTradingParams = { ...defaultTradingParams, trailingStopPercent: 5, costBpsPerSide: 0 };
const STOP: InitialStopConfig = { atrSessions: 3, atrMultiple: 2 };
const RETAIN: RetentionConfig = { sellPercent: 50, smaSessions: 3, closesBelow: 2 };

const sim = (
  specs: Spec[],
  decisions: (ds: Dataset) => EntryDecision[],
  over: Partial<RiseTradingParams> = {},
  rules: { initialStop?: InitialStopConfig | null; retention?: RetentionConfig | null } | null = null,
  extra: Partial<Parameters<typeof simulateTrading>[2]> = {}
) => {
  const ds = fixtureDataset(sessionsOf(specs));
  const p = { ...P, ...over };
  const s = simulateTrading(ds, decisions(ds), {
    symbol: 'TEST',
    firstSession: 0,
    endSession: ds.sessionCount - 1,
    exit: exitParamsOf(p),
    book: bookSettingsOf(p),
    rules: rules ? { initialStop: rules.initialStop ?? null, retention: rules.retention ?? null } : null,
    ...extra
  });
  return { ds, sim: s, trades: s.trades, summary: summarizeSimulation(s, ds) };
};
const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const interest = (principal: number, days: number) => (principal * 0.11 * days) / 365;
const start = (ds: Dataset, s: number, k: number) => ds.bTime[ds.sBarStart[s]! + k]!;

// Four sessions whose true ranges are 6, 3 and 9 (the last a gap up): ATR(3) before session 4 = 6.
const ATR_PATH: Spec[] = [
  c(100), // s0: the previous close of the first true range
  { bars: [[100, 100, 100, 100], [100, 104, 100, 104], [104, 104, 98, 98], [98, 101, 98, 101]] }, // s1: H 104 L 98 C 101 → TR 6
  { bars: [[101, 101, 101, 101], [101, 103, 101, 103], [103, 103, 100, 100], [100, 102, 100, 102]] }, // s2: H 103 L 100 C 102 → TR 3
  { bars: [[110, 110, 110, 110], [110, 111, 110, 111], [111, 111, 109, 109], [109, 110, 109, 110]] } // s3: H 111 L 109 C 110, prev 102 → TR 9
];

describe('rule 1 — the ATR convention and completed-data timing', () => {
  test('simple mean of Wilder true ranges of the L sessions completed before the fill session', () => {
    const ds = fixtureDataset(sessionsOf([...ATR_PATH, c(112)]));
    const a = atrBefore(ds, 4, 3);
    assert.ok(a.ok);
    assert.equal(a.record.atr, 6); // (6 + 3 + 9) / 3: the gap's true range uses the previous close
    assert.deepEqual([a.record.fromSession, a.record.toSession, a.record.fillSession], [1, 3, 4]);
    const short = atrBefore(ds, 3, 3); // needs L + 1 = 4 completed sessions before the fill
    assert.equal(short.ok, false);
    assert.equal(!short.ok && short.reason, 'insufficient_history');
    ds.sHigh[2] = NaN; // a broken price fails closed
    const bad = atrBefore(ds, 4, 3);
    assert.equal(!bad.ok && bad.reason, 'invalid_data');
  });

  test('stop = actual fill − m × ATR; the fill session’s own high, low and close are never used', () => {
    const levels = [c(112, 112, 111, 112), c(112, 150, 50, 112)].map((fillSession) => {
      const r = sim([...ATR_PATH, fillSession, c(112)], (d) => [atClose(d, 3)], {}, { initialStop: STOP });
      return r.sim.rules!.positionOf(r.trades[0]!)!.stop!;
    });
    assert.deepEqual(levels.map((x) => [x.level, x.atr, x.fillPrice]), [[100, 6, 112], [100, 6, 112]]);
    assert.equal(levels[0]!.atrToSession, 3);
  });

  test('an intraday decision filling in its own session uses the sessions before it (not the open session)', () => {
    const r = sim([c(100), ...ATR_PATH, c(110, 112, 113, 113), c(113)], (d) => [afterMinute(d, 4, 0)], {}, { initialStop: STOP });
    const pos = r.sim.rules!.positionOf(r.trades[0]!)!;
    assert.equal(r.trades[0]!.entryIndex, 4);
    assert.deepEqual([pos.stop!.atrFromSession, pos.stop!.atrToSession], [1, 3]); // sessions 1..3, never session 4
  });

  test('without enough history the protected entry is BLOCKED and recorded; a later decision is taken', () => {
    const r = sim([...ATR_PATH, c(112), c(112), c(112)], (d) => [atClose(d, 1), atClose(d, 3)], {}, { initialStop: STOP });
    assert.deepEqual(r.sim.outcomes.map((o) => [o.status, o.reason]), [
      ['vetoed', 'insufficient_history'],
      ['filled', null]
    ]);
    assert.match(r.sim.outcomes[0]!.protection!.text, /initial risk stop unavailable.*never entered without the requested protection/);
    assert.equal(r.sim.rules!.blocked.length, 1);
    assert.equal(r.trades.length, 1);
    const entry = r.sim.log.entries.find((e) => e.event === 'base_signal' && e.disposition === 'vetoed')!;
    assert.equal(entry.values.gate, 'insufficient_history');
    assert.equal(r.summary.metrics.signals.vetoed, 1);
  });

  test('the configuration warm-up loads the ATR history (L + 1), the retention SMA (L − 1) and the breakout windows', () => {
    const base = warmupSessionsForParams(P); // the Rise scanner's N + 1 = 21
    assert.equal(warmupSessionsForParams({ ...P, initialStop: { atrSessions: 30, atrMultiple: 3 } }), 31);
    assert.equal(warmupSessionsForParams({ ...P, retention: { ...RETAIN, smaSessions: 60 } }), 59);
    assert.equal(warmupSessionsForParams({ ...P, retention: RETAIN }), base);
    const breakout = { smaSessions: 50, slopeComparisonSessions: 40, priorHighSessions: 20 };
    assert.equal(breakoutWarmupSessions(breakout), 89);
    assert.equal(warmupSessionsForParams({ ...P, entryMethod: 'trend_breakout', breakout }), 89);
  });
});

describe('rule 1 — the initial risk stop executes', () => {
  const entry = (s4: Spec, s5: Spec, over: Partial<RiseTradingParams> = {}, retention: RetentionConfig | null = null) =>
    sim([...ATR_PATH, s4, s5, c(100), c(100)], (d) => [atClose(d, 3)], over, { initialStop: STOP, retention });

  test('while the position is unprofitable and before the maximum-hold age (the trailing stop inactive)', () => {
    const r = entry(c(112, 112, 111, 112), c(108, 104, 99, 98));
    const t = r.trades[0]!;
    assert.equal(t.exitIndex, 5); // age 1 day < the 8-day hold
    assert.equal(t.exitReason as string, 'initial stop');
    assert.equal(t.exitBar, 2); // the first minute whose low reaches 100
    assert.equal(t.exitExecution, 'stop level'); // crossed within the minute: an ASSUMED fill at the level
    assert.equal(t.exitRawPrice, 100);
    assert.equal(t.stopActiveAtExit, false); // 892.86 × 106.40 < $100,000: the profit trailing stop was not eligible
    near(t.net, (100_000 / 112) * 100 - 100_000 - interest(100_000, 1));
    assert.ok(t.net < 0);
    const fill = r.sim.rules!.positionOf(t)!.fills[0]!;
    assert.deepEqual([fill.rule, fill.instruction.level, fill.instruction.phase], ['initial_stop', 100, 1]);
  });

  test('a gap through the stop fills at the first observed trade, not at the inaccessible stop level', () => {
    const t = entry(c(112, 112, 111, 112), c(95, 96)).trades[0]!;
    assert.deepEqual([t.exitReason as string, t.exitExecution, t.exitRawPrice, t.exitBar], ['initial stop gap', 'opening trade', 95, 0]);
  });

  test('active from the fill: it can exit on the entry session, and in the fill minute itself', () => {
    const a = entry(c(112, 110, 105, 99, 101), c(101));
    assert.deepEqual([a.trades[0]!.entryIndex, a.trades[0]!.exitIndex, a.trades[0]!.exitBar], [4, 4, 3]);
    assert.equal(a.summary.metrics.optionalRules!.initialStop.exitsOnEntrySession, 1);
    // an intraday decision fills at minute 1's open (112); that minute trades down to 95: the stop, after the fill
    const b = sim([...ATR_PATH, c(112, 95, 96), c(96)], (d) => [afterMinute(d, 4, 0)], {}, { initialStop: STOP });
    const t = b.trades[0]!;
    assert.deepEqual([t.entryBar, t.exitIndex, t.exitBar, t.exitRawPrice], [1, 4, 1, 100]);
  });

  test('the higher active stop governs; the initial stop stays active while the trailing stop is ineligible', () => {
    // a rally to 130 on the entry session: trailing stop 123.5 (active: in profit) above the initial stop 100
    const t = entry(c(112, 120, 130, 130), c(128, 122, 99)).trades[0]!;
    assert.deepEqual([t.exitReason, t.exitRawPrice, t.exitBar], ['trailing stop', 123.5, 1]);
    // the level is fixed: still 100 after the rally (recorded on the position)
    const r = entry(c(112, 120, 130, 130), c(128, 122, 99));
    assert.equal(r.sim.rules!.positionOf(r.trades[0]!)!.stop!.level, 100);
  });

  test('one trade breaching both stops: the higher (trailing) governs without retention; recorded as also due', () => {
    const r = entry(c(112, 120, 130, 130), c(97, 98));
    const t = r.trades[0]!;
    assert.deepEqual([t.exitReason, t.exitRawPrice], ['trailing stop gap', 97]);
    assert.deepEqual(r.sim.rules!.positionOf(t)!.fills[0]!.instruction.sameTrade, ['initial_stop']);
  });

  test('precedence with the maximum hold: the stop reached inside minute 0 sells before the hold’s 09:31 trade', () => {
    // the hold (1 day) is due at session 5's losing open 105; minute 0 trades down to 99 (through the stop at 100)
    const hit = entry(c(112, 112, 111, 112), { bars: [[105, 105, 99, 104], [104, 104, 104, 104], [104, 104, 104, 104]] }, { maximumHoldDays: 1 });
    assert.deepEqual([hit.trades[0]!.exitReason as string, hit.trades[0]!.exitBar, hit.trades[0]!.exitRawPrice], ['initial stop', 0, 100]);
    // not reached before minute 1: the hold sells at minute 1's opening trade
    const hold = entry(c(112, 112, 111, 112), { bars: [[105, 105, 104, 104], [104, 104, 99, 99], [99, 99, 99, 99]] }, { maximumHoldDays: 1 });
    assert.deepEqual([hold.trades[0]!.exitReason, hold.trades[0]!.exitBar, hold.trades[0]!.exitRawPrice], ['maximum hold', 1, 104]);
  });

  test('a stop never reached (100 × ATR) reproduces the exits of the version without it exactly', () => {
    const path = [...ATR_PATH, c(112, 120, 130, 130), c(128, 122, 99), c(100, 101), c(101, 90, 95), c(95), c(96), c(97)];
    const decisions = (d: Dataset) => [atClose(d, 3), atClose(d, 6), atClose(d, 8)];
    const off = sim(path, decisions, { maximumHoldDays: 2, intradayLossBufferPercent: 2 });
    const inert = sim(path, decisions, { maximumHoldDays: 2, intradayLossBufferPercent: 2 }, { initialStop: { atrSessions: 3, atrMultiple: 100 } });
    const fields = (ts: typeof off.trades) =>
      ts.map((t) => [
        t.entryIndex, t.entryBar, t.entryRawPrice, t.exitIndex, t.exitBar, t.exitRawPrice, t.exitReason, t.exitExecution,
        t.exitStopPrice, t.stopActiveAtExit, t.maximumHoldDue, t.bufferSignalTime, t.net, t.interest, t.stopActiveSessions
      ]);
    assert.ok(off.trades.length >= 2);
    assert.deepEqual(fields(inert.trades), fields(off.trades));
    assert.deepEqual(inert.sim.daily.map((x) => x.marked), off.sim.daily.map((x) => x.marked));
    assert.deepEqual(inert.sim.minuteDrawdown, off.sim.minuteDrawdown);
  });
});

describe('rule 2 — the trend-breakout entry', () => {
  // Rising +1 a session, each high 0.5 above its close (so the signal session's own high is ABOVE its close).
  const rising = (from: number, n: number, first = 0): Spec[] =>
    Array.from({ length: n }, (_, i) => {
      const x = from + i + first;
      return { bars: [[x - 0.2, x + 0.5, x - 0.5, x]] as Bar[] };
    });
  const BO = { smaSessions: 3, slopeComparisonSessions: 2, priorHighSessions: 3 };
  const history = (specs: Spec[]) => sessionsOf(specs);

  test('close > SMA, SMA rising over K, close > the highest high of the N PRECEDING sessions (own high excluded)', () => {
    const ds = fixtureDataset(history(rising(100, 8)));
    const scan = scanTrendBreakout(ds, 0, 7, BO);
    // sessions 0..3 lack history (needs max(3 + 2 − 1, 3) = 4 earlier sessions): recorded, never a signal
    assert.deepEqual(scan.unavailable.map((u) => [u.session, u.reason]), [0, 1, 2, 3].map((s) => [s, 'insufficient_history']));
    assert.deepEqual(scan.signals.map((x) => x.session), [4, 5, 6, 7]);
    const s4 = scan.signals[0]!;
    assert.equal(s4.close, 104);
    assert.equal(s4.priorHigh, 103.5); // max of sessions 1..3 — the signal session's own high 104.5 is excluded
    assert.equal(s4.priorHighSession, 3);
    near(s4.sma, 103);
    near(s4.smaThen, 101);
    assert.equal(s4.time, ds.sCloseTime[4]); // decided at the completed close
  });

  test('every condition is strict: equal to the prior high, to the SMA or to the earlier SMA is no signal', () => {
    const equalHigh = [...rising(100, 6), { bars: [[105, 105.5, 105, 105.5]] as Bar[] }]; // close = session 5's high
    assert.ok(!scanTrendBreakout(fixtureDataset(history(equalHigh)), 6, 6, BO).signals.length);
    const flatSma = Array.from({ length: 7 }, () => ({ bars: [[100, 100, 100, 100]] as Bar[] }));
    const s = scanTrendBreakout(fixtureDataset(history(flatSma)), 4, 6, { ...BO, priorHighSessions: 1 });
    assert.equal(s.signals.length, 0);
    assert.equal(s.conditions.aboveSma, 0);
    assert.equal(s.conditions.smaRising, 0);
  });

  test('one position: signals while invested are rejected and never replayed; a fresh post-exit close enters at once', () => {
    // signal at s4 (fill s5 open 104.8); s6, s7 rejected while invested; s8 opens at a loss → the 2-day hold sells at
    // 09:31; s8 then closes at 108.5 above the highs of s5..s7: a NEW signal, taken after the exit (no cooldown)
    const specs: Spec[] = [
      ...rising(100, 5),
      { bars: [[104.8, 105.5, 104.5, 105]] },
      { bars: [[105.8, 106.5, 105.5, 106]] },
      { bars: [[106.8, 107.5, 106.5, 107]] },
      { bars: [[104, 104, 103.9, 104], [104, 104, 104, 104], [104, 108.5, 104, 108.5]] },
      { bars: [[108.6, 109, 108.6, 109]] },
      { bars: [[109.1, 109.5, 109.1, 109.5]] }
    ];
    const params: RiseTradingParams = { ...P, entryMethod: 'trend_breakout', breakout: BO, maximumHoldDays: 2 };
    const r = runRiseTrading('TEST', history(specs), 0, params);
    const s = r.simulation;
    assert.equal(s.entryMethod, 'trend_breakout');
    assert.deepEqual(
      s.outcomes.map((o) => [o.decision.sessionIndex, o.status, o.reason]),
      [
        [4, 'filled', null],
        [5, 'rejected', 'position_open'],
        [6, 'rejected', 'position_open'],
        [7, 'rejected', 'position_open'],
        [8, 'filled', null],
        [9, 'rejected', 'position_open'],
        [10, 'rejected', 'position_open']
      ]
    );
    const [a, b] = s.trades;
    assert.deepEqual([a!.entryIndex, a!.entryExecution, a!.exitIndex, a!.exitReason], [5, 'opening trade', 8, 'maximum hold']);
    assert.equal(b!.decisionTime, r.ds.sCloseTime[8]); // the post-exit signal itself, never an earlier rejected one
    assert.equal(b!.entryIndex, 9);
    const s8 = r.breakout!.signals.find((x) => x.session === 8)!;
    assert.deepEqual([s8.priorHigh, s8.priorHighSession], [107.5, 7]); // the preceding sessions' high, not the exit fill
    assert.equal((a!.setupKind as string), 'trend_breakout');
    assert.equal(summarizeSimulation(s, r.ds).metrics.optionalRules!.breakout!.rejectedWhileInvested, 5);
    // the decision log keeps the breakout's own values
    const logged = s.log.entries.find((e) => e.event === 'base_signal')!;
    assert.deepEqual([logged.values.entryMethod, logged.values.priorHigh], ['trend_breakout', 103.5]);
  });

  test('the Rise inputs are not read and persistent eligibility is refused for the breakout (not applicable)', () => {
    const params = { ...P, entryMethod: 'trend_breakout' as const, breakout: BO, advanceFromRecentLowPercent: NaN, recentLowLookbackBars: NaN };
    assert.deepEqual(tradingParamErrors(params), []);
    assert.match(tradingParamErrors({ ...params, eligibility: { policy: 'time_limited', maxAgeSessions: 5 } }).join(), /applies only to the Rise entry/);
    assert.match(tradingParamErrors({ ...P, entryMethod: 'trend_breakout' }).join(), /needs its inputs/);
    assert.match(tradingParamErrors({ ...P, breakout: BO }).join(), /the entry method is the Rise entry/);
  });
});

// Entry at session 4's open (112, ATR path); a rally to 130 arms the profit trailing stop at 123.5.
const RALLY = c(112, 120, 130, 130);

describe('rule 3 — trend retention: one partial sale, the remainder, its trend exit', () => {
  test('the first trailing-stop event sells f of the shares once; the trailing stop is then consumed', () => {
    // s5: the stop 123.5 is crossed → sell half; later sessions fall far below 123.5 without another sale
    const r = sim([...ATR_PATH, RALLY, c(128, 122, 125), c(124, 121, 123), c(124), c(125), c(126)], (d) => [atClose(d, 3)], {}, { retention: RETAIN });
    const pos = r.sim.rules!.positionOf(r.trades[0]!)!;
    const partial = pos.fills.filter((f) => f.partial);
    assert.equal(partial.length, 1);
    const f = partial[0]!;
    const Q = 100_000 / 112;
    assert.deepEqual([f.session, f.bar, f.rawPrice, f.reason, f.execution], [5, 1, 123.5, 'trailing stop', 'stop level']);
    near(f.shares, Q / 2);
    near(f.principal, 50_000);
    near(f.interest, interest(50_000, 1));
    near(f.net, (Q / 2) * 123.5 - 50_000 - interest(50_000, 1));
    assert.equal(pos.stage, 'remainder');
    assert.equal(pos.remainderFromSession, 5);
    assert.equal(r.trades[0]!.exitIndex, -1); // still invested: the remainder is open at the end
  });

  test('the trend counter: the partial-sale session’s close counts first; a close not below resets; K below exit', () => {
    // SMA(3) of closes; after the partial at s5 (close 119 < SMA 119.67): count 1; s6 close 127 ≥ SMA 125.33 → reset;
    // s7 118 < SMA 121.33 → 1; s8 115 < 120 → 2 = K: decided at s8's close, sold at s9's opening trade
    const r = sim(
      [...ATR_PATH, RALLY, c(128, 122, 119), c(126, 127), c(118), c(115), c(114, 113), c(113)],
      (d) => [atClose(d, 3)],
      {},
      { retention: RETAIN }
    );
    const t = r.trades[0]!;
    const counts = r.sim.log.entries.filter((e) => e.event === 'trend_count').map((e) => [e.session, e.values.count]);
    assert.deepEqual(counts, [[5, 1], [6, 0], [7, 1], [8, 2]]);
    assert.ok(r.sim.log.entries.some((e) => e.event === 'trend_exit_decision' && e.session === 8));
    assert.deepEqual([t.exitIndex, t.exitBar, t.exitReason as string, t.exitExecution, t.exitRawPrice], [9, 0, 'trend exit', 'opening trade', 114]);
    near(sessionSma(r.ds, 8, 3).ok ? (sessionSma(r.ds, 8, 3) as { value: number }).value : NaN, (127 + 118 + 115) / 3);
    const fills = r.sim.rules!.positionOf(t)!.fills;
    assert.deepEqual(fills.map((f) => [f.partial, f.rule]), [[true, 'trailing_stop'], [false, 'trend_exit']]);
    // ONE closed trade; its net is the sum of both fills; the shares sold add up to the position, never more
    assert.equal(r.summary.metrics.trades.closed, 1);
    near(t.net, fills[0]!.net + fills[1]!.net);
    near(fills[0]!.shares + fills[1]!.shares, t.shares);
  });

  test('simultaneous triggers: a full risk exit due at the same trade takes precedence over the partial sale', () => {
    // a gap to 97 breaches the trailing stop (123.5) AND the initial stop (100): one full initial-stop exit
    const r = sim([...ATR_PATH, RALLY, c(97, 98), c(98)], (d) => [atClose(d, 3)], {}, { initialStop: STOP, retention: RETAIN });
    const pos = r.sim.rules!.positionOf(r.trades[0]!)!;
    assert.deepEqual(pos.fills.map((f) => [f.partial, f.reason, f.rawPrice]), [[false, 'initial stop gap', 97]]);
    assert.deepEqual(pos.fills[0]!.instruction.sameTrade, ['trailing_stop']);
    // a later lower stop in the same minute after the partial: the remainder is sold at it — two fills, no share twice
    const two = sim([...ATR_PATH, RALLY, c(128, 122, 99), c(99)], (d) => [atClose(d, 3)], {}, { initialStop: STOP, retention: RETAIN });
    const fills = two.sim.rules!.positionOf(two.trades[0]!)!.fills;
    assert.deepEqual(fills.map((f) => [f.partial, f.reason, f.session, f.bar, f.rawPrice]), [
      [true, 'trailing stop', 5, 1, 123.5],
      [false, 'initial stop', 5, 2, 100]
    ]);
    near(fills[0]!.shares + fills[1]!.shares, two.trades[0]!.shares);
    // partial profitable, total a loss: ONE closed trade classified as a loss by its whole net
    assert.ok(fills[0]!.net > 0 && fills[1]!.net < 0 && two.trades[0]!.net < 0);
    assert.deepEqual([two.summary.metrics.trades.closed, two.summary.metrics.trades.wins, two.summary.metrics.trades.losses], [1, 0, 1]);
    assert.equal(two.summary.metrics.optionalRules!.retention.closedPositionsWithPartial!.losses, 1);
  });

  test('a buffered loss pending at the same trade as the trailing-stop gap: the full buffer exit wins over the partial', () => {
    // hold 1 day, buffer 2%: session 5 opens in profit (113), spikes to 140 (the stop, inactive, is raised to 133 after
    // the close) and its last minute closes at 109 — a −2.7% net loss decided after the last trade (no closing print):
    // carried to session 6, which opens at 108, through the now ACTIVE trailing stop: two exits due at one trade
    const s5: Spec = { bars: [[113, 113, 113, 113], [113, 140, 113, 140], [140, 140, 109, 109]], closingPrint: false };
    const path = [...ATR_PATH, c(112, 112, 111, 112), s5, c(108, 109), c(109)];
    const over = { maximumHoldDays: 1, intradayLossBufferPercent: 2 };
    const r = sim(path, (d) => [atClose(d, 3)], over, { retention: RETAIN });
    const fills = r.sim.rules!.positionOf(r.trades[0]!)!.fills;
    assert.deepEqual(fills.map((f) => [f.partial, f.reason, f.session, f.rawPrice]), [[false, 'buffered intraday loss', 6, 108]]);
    assert.deepEqual(fills[0]!.instruction.sameTrade, ['trailing_stop']);
    // without retention both are full exits: the resting stop takes the opening trade, as in the version before
    for (const t of [sim(path, (d) => [atClose(d, 3)], over).trades[0]!, sim(path, (d) => [atClose(d, 3)], over, { initialStop: { atrSessions: 3, atrMultiple: 100 } }).trades[0]!])
      assert.deepEqual([t.exitReason, t.exitIndex, t.exitRawPrice], ['trailing stop gap', 6, 108]);
  });

  test('financing gates use the REMAINING principal: the buffer at f × the dollar threshold, not the original one', () => {
    // after the half sale (s5), session 7 opens in profit (no hold exit) and closes a minute at 108.5: the remainder's
    // net ≈ −1,562 is below −2% × $50,000 = −$1,000 but above the original −$2,000 → the buffer sells the remainder
    const r = sim(
      [...ATR_PATH, RALLY, c(128, 122, 125), c(116, 117), c(113, 112, 108.5, 109), c(109)],
      (d) => [atClose(d, 3)],
      { maximumHoldDays: 2, intradayLossBufferPercent: 2 },
      { retention: { ...RETAIN, closesBelow: 5 } }
    );
    const t = r.trades[0]!;
    const fills = r.sim.rules!.positionOf(t)!.fills;
    assert.deepEqual([fills.length, t.exitIndex, t.exitReason, t.exitBar, t.exitRawPrice], [2, 7, 'buffered intraday loss', 3, 108.5]);
    const remainderNetAtSignal = fills[1]!.shares * 108.5 - 50_000 - interest(50_000, 3);
    assert.ok(remainderNetAtSignal <= -1_000 && remainderNetAtSignal > -2_000, String(remainderNetAtSignal));
    near(fills[1]!.principal, 50_000);
  });

  test('the maximum losing hold applies to the remainder (on its own principal and interest)', () => {
    const r = sim(
      [...ATR_PATH, RALLY, c(128, 122, 125), c(111, 110), c(110)],
      (d) => [atClose(d, 3)],
      { maximumHoldDays: 2 },
      { retention: { ...RETAIN, closesBelow: 5 } }
    );
    const t = r.trades[0]!;
    assert.deepEqual([t.exitIndex, t.exitReason, t.exitBar, t.exitRawPrice], [6, 'maximum hold', 1, 111]);
  });
});

describe('the accounting of a position sold in several fills (debt-funded, as before)', () => {
  // Thursday entry, Friday partial sale, Monday remainder sale: interest per calendar day, weekends included.
  const DATED: Spec[] = [
    withDate(ATR_PATH[0]!, '2018-01-01'),
    withDate(ATR_PATH[1]!, '2018-01-02'),
    withDate(ATR_PATH[2]!, '2018-01-03'),
    withDate(ATR_PATH[3]!, '2018-01-04'), // Thursday: the decision at the close
    withDate(RALLY, '2018-01-05'), // Friday: the fill at 112
    withDate(c(128, 122, 125), '2018-01-08'), // Monday: the partial sale at 123.5
    withDate(c(124, 123, 124), '2018-01-09'), // close 124 < SMA 126.33: 1
    withDate(c(119, 118), '2018-01-12'), // close 118 < SMA 122.33: 2 → the trend exit is decided
    withDate(c(117, 116), '2018-01-15'), // Monday: the remainder sold at the opening trade 117
    withDate(c(116), '2018-01-16')
  ];
  const dated = (costBps: number) => sim(DATED, (d) => [atClose(d, 3)], { costBpsPerSide: costBps }, { retention: RETAIN });

  test('proportional principal, interest per calendar day of each part, per-fill costs; the identities close', () => {
    const r = dated(5);
    const t = r.trades[0]!;
    const fills = r.sim.rules!.positionOf(t)!.fills;
    const entryPrice = 112 * 1.0005;
    const Q = 100_000 / entryPrice;
    assert.equal(t.entryIndex, 4); // Friday 2018-01-05
    // the partial (Monday 01-08: 3 calendar days) and the remainder (trend exit, Monday 01-15: 10 days)
    assert.deepEqual(fills.map((f) => [f.partial, r.ds.dates[f.session], f.reason]), [
      [true, '2018-01-08', 'trailing stop'],
      [false, '2018-01-15', 'trend exit']
    ]);
    near(fills[0]!.shares, Q / 2);
    near(fills[0]!.price, 123.5 * 0.9995);
    near(fills[0]!.interest, interest(50_000, 3)); // Friday → Monday: the weekend is charged
    near(fills[1]!.interest, interest(50_000, 10));
    near(fills[1]!.rawPrice, 117);
    near(t.interest, interest(50_000, 3) + interest(50_000, 10));
    near(fills[0]!.exitCost, (Q / 2) * 123.5 * 0.0005);
    near(fills[0]!.entryCost + fills[1]!.entryCost, Q * (entryPrice - 112));
    near(t.net, fills.reduce((a, f) => a + f.proceeds - f.principal - f.interest, 0));
    const row = ledgerOf(r.sim, r.ds)[0]!;
    assert.equal(row.exitFills!.length, 2);
    near(row.identityResidual, 0, 1e-6);
    near(row.grossBeforeCosts - row.entryFriction - row.exitFriction - row.interest, row.net);
    const rec = reconcileWithFixedLedger(r.sim, r.ds);
    assert.ok(rec.maxDifference < 1e-6, String(rec.maxDifference));
    const m = r.summary.metrics;
    assert.ok(m.checks.fixedLedgerMaxDifferenceUsd < 1e-6 && m.checks.identityMaxResidualUsd < 1e-6 && m.checks.markedEqualsLedger < 1e-6);
  });

  test('marks: the partial net is realized at the fill, the remainder marked — no double counting; drawdown from the marks', () => {
    const r = sim([...ATR_PATH, RALLY, c(128, 122, 125), c(124), c(124)], (d) => [atClose(d, 3)], {}, { retention: RETAIN });
    const t = r.trades[0]!;
    const pos = r.sim.rules!.positionOf(t)!;
    const f = pos.fills[0]!;
    const Q = 100_000 / 112;
    const d5 = r.sim.daily[5]!;
    near(d5.realized, f.net); // realized cash at the partial sale
    near(d5.unrealized, (Q - f.shares) * 125 - 50_000 - interest(50_000, 1)); // the remainder alone
    near(d5.marked, d5.realized + d5.unrealized);
    // the same as one undivided position marked at 125 except the sold half's price difference (123.5 vs 125)
    near(d5.marked, Q * 125 - 100_000 - interest(100_000, 1) - f.shares * (125 - 123.5));
    // an open remainder at the end: partial fills realized, remainder unrealized, the position's total = both
    const m = r.summary.metrics;
    near(m.pnl.realizedNetUsd, f.net);
    near(m.pnl.unrealized!.netUsd, pos.remainder!.net);
    near((m.pnl.unrealized as { positionNetUsd: number }).positionNetUsd, t.net);
    near(m.pnl.totalMarkedNetUsd, r.sim.daily.at(-1)!.marked);
    assert.equal(m.trades.closed, 0); // not a closed trade until its last share is sold
    assert.equal(m.trades.open, 1);
  });

  test('continuation is judged on the whole position: its aggregate net opens (or not) the window', () => {
    const cont = (specs: Spec[]) => {
      const sessions = sessionsOf(specs);
      const ds = fixtureDataset(sessions);
      const p = { ...P, continuation: { ...DEFAULT_CONTINUATION.breakout, windowSessions: 3 } };
      return simulateTrading(ds, [atClose(ds, 3)], {
        symbol: 'TEST',
        firstSession: 0,
        endSession: ds.sessionCount - 1,
        exit: exitParamsOf(p),
        book: bookSettingsOf(p),
        continuation: { config: p.continuation, bars: barsFromSessions(sessions, '1d') },
        rules: { initialStop: STOP, retention: RETAIN }
      });
    };
    // partial +$5,120, remainder at the initial stop −$5,372: the position lost → no continuation window
    const loss = cont([...ATR_PATH, RALLY, c(128, 122, 99), c(99), c(99)]);
    assert.ok(loss.trades[0]!.net < 0);
    assert.equal(loss.continuation!.episodes.length, 0);
    // partial ≈ +$5,119, remainder sold by the trend exit at 114 (≈ +$833 on its half): the position gained → one
    // window, its exit net = the whole position's
    const gain = cont([...ATR_PATH, RALLY, c(128, 122, 120), c(118), c(115), c(114, 113), c(113), c(113), c(113)]);
    assert.ok(gain.trades[0]!.net > 0);
    assert.equal(gain.continuation!.episodes.length, 1);
    assert.equal(gain.continuation!.episodes[0]!.exitNet, gain.trades[0]!.net);
  });

  test('classic_d1 continuation with retention: the D1 window follows the whole position’s net, not the remainder’s', () => {
    // partial ≈ +$5,119; the remainder sold by the trend exit at 111 (≈ −$507): the position gained, its remainder lost
    const specs = [...ATR_PATH, RALLY, c(128, 122, 125), c(118), c(115), c(111, 110), c(110), c(110)];
    const sessions = sessionsOf(specs);
    const ds = fixtureDataset(sessions);
    const p = { ...P, continuation: { ...DEFAULT_CONTINUATION.classic_d1, windowSessions: 2 } };
    const s = simulateTrading(ds, [atClose(ds, 3)], {
      symbol: 'TEST',
      firstSession: 0,
      endSession: ds.sessionCount - 1,
      exit: exitParamsOf(p),
      book: bookSettingsOf(p),
      continuation: { config: p.continuation, bars: null },
      rules: { initialStop: null, retention: RETAIN }
    });
    const fills = s.rules!.positionOf(s.trades[0]!)!.fills;
    assert.ok(fills[1]!.net < 0 && s.trades[0]!.net > 0, `${fills[1]!.net} ${s.trades[0]!.net}`); // remainder lost, position gained
    assert.equal(s.continuation!.episodes.length, 1);
    assert.equal(s.continuation!.book.machine.continuationWindows, 1);
  });
});

describe('valid OFF states and invalid configurations', () => {
  test('switched-off values may be absent (effective values only): the hold age, the buffer switch and percent', () => {
    assert.deepEqual(tradingParamErrors({ ...P, maximumHoldEnabled: false, maximumHoldDays: NaN, intradayLossBufferEnabled: undefined as never, intradayLossBufferPercent: NaN }), []);
    assert.deepEqual(tradingParamErrors({ ...P, intradayLossBufferEnabled: false, intradayLossBufferPercent: NaN }), []);
    assert.match(tradingParamErrors({ ...P, maximumHoldDays: NaN }).join(), /maximumHoldDays/);
    assert.match(tradingParamErrors({ ...P, intradayLossBufferPercent: NaN }).join(), /intradayLossBufferPercent/);
    assert.match(tradingParamErrors({ ...P, maximumHoldEnabled: false, intradayLossBufferEnabled: true }).join(), /applies only from the maximum losing-hold age/);
  });

  test('the options’ own bounds', () => {
    assert.match(tradingParamErrors({ ...P, retention: { ...RETAIN, sellPercent: 100 } }).join(), /sellPercent/);
    assert.match(tradingParamErrors({ ...P, retention: { ...RETAIN, sellPercent: 0 } }).join(), /sellPercent/);
    assert.match(tradingParamErrors({ ...P, initialStop: { atrSessions: 0, atrMultiple: 2 } }).join(), /atrSessions/);
    assert.match(tradingParamErrors({ ...P, initialStop: { atrSessions: 5, atrMultiple: 0 } }).join(), /atrMultiple/);
    assert.deepEqual(tradingParamErrors({ ...P, initialStop: STOP, retention: RETAIN }), []);
  });

  test('every combination of the three runs and reconciles on one path (no unsupported combination)', () => {
    const specs = [...ATR_PATH, RALLY, c(128, 122, 120), c(118), c(115), c(114, 99), c(100), c(101), c(102), c(103), c(104), c(105)];
    const sessions = sessionsOf(specs);
    for (const breakout of [false, true])
      for (const stop of [false, true])
        for (const retain of [false, true]) {
          const params: RiseTradingParams = {
            ...P,
            advanceFromRecentLowPercent: 1,
            recentLowLookbackBars: 3,
            maximumHoldDays: 3,
            ...(breakout ? { entryMethod: 'trend_breakout' as const, breakout: { smaSessions: 2, slopeComparisonSessions: 1, priorHighSessions: 2 } } : {}),
            ...(stop ? { initialStop: STOP } : {}),
            ...(retain ? { retention: RETAIN } : {})
          };
          const r = runRiseTrading('TEST', sessions, 0, params);
          const m = summarizeSimulation(r.simulation, r.ds).metrics;
          const tag = `${breakout}/${stop}/${retain}`;
          assert.ok(m.checks.fixedLedgerMaxDifferenceUsd < 1e-6, tag);
          assert.ok(m.checks.identityMaxResidualUsd < 1e-6, tag);
          assert.ok(m.checks.markedEqualsLedger < 1e-6, tag);
          assert.equal(Boolean(r.simulation.rules), stop || retain, tag);
          assert.ok(r.simulation.trades.length >= 1, tag);
        }
  });
});
