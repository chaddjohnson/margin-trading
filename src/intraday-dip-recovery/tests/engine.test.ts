// Synthetic expected-output tests of the changed mechanisms (PROTOCOL.md §12.2). Every market here is scripted minute by
// minute; nothing reads market data. Expected values are computed by hand from the rules.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adjustSessionsForSplits, groupMarketSessions } from '#lib';
import type { MarketSession, Tick } from '#types';
import { buildMarket, minuteClock } from '../../intraday-d1/periods.ts';
import { type Rules, families, ladder } from '../context.ts';
import { type Params, type Settings, simulate } from '../engine.ts';
import { referenceSimulate } from '../reference.ts';

type Row = [minute: number, o: number, h: number, l: number, c: number];

// New York offsets: EST (UTC−5) unless the date is in DST (UTC−4).
const offsetOf = (date: string) => (date >= '2020-03-08' && date < '2020-11-01') || (date >= '2026-03-08' && date < '2026-11-01') ? 4 : 5;
const openOf = (date: string) => Date.parse(`${date}T09:30:00Z`) / 1000 + offsetOf(date) * 3600;

const ticksOf = (date: string, rows: Row[], print?: number, early = false): Tick[] => {
  const open = openOf(date);
  const out: Tick[] = rows.map(([m, o, h, l, c]) => ({ time: open + m * 60, open: o, high: h, low: l, close: c, volume: 1000, trades: NaN }));

  if (print !== undefined) {
    const close = open + (early ? 210 : 390) * 60;

    out.push({ time: close, open: print, high: print, low: print, close: print, volume: 5000, trades: NaN });
  }

  return out;
};

const flat = (from: number, to: number, price: number): Row[] =>
  Array.from({ length: to - from + 1 }, (_v, k) => [from + k, price, price, price, price] as Row);

const market = (sessions: MarketSession[]) => buildMarket(sessions);

const settings0: Settings = { principal: 100_000, rate: 0.11, costBps: 0, stopFill: 'stop', stopSlippageBps: 0 };

const params = (o: Partial<Params>): Params => ({
  X: 0.01,
  Y: 0.005,
  S: 0.01,
  holdSeconds: 1e12,
  lookbackPeriods: 1,
  buffer: 0.5,
  pullback: 0.01,
  continuationPeriods: 1000,
  ...o
});

const runOn = (sessions: MarketSession[], B: number, rules: Rules, p: Partial<Params>, s: Partial<Settings> = {}, extra: { segmentEnds?: number[]; blackout?: [number, number] } = {}) => {
  const m = market(sessions);
  const clock = minuteClock(m, sessions, B);

  return simulate(m, clock, rules, params(p), { ...settings0, ...s }, { armFromSession: 0, endSession: sessions.length - 1, ...extra });
};

// A first session that only sets history (D1 skips the run's first period).
const warm = (date: string, price = 100) => ticksOf(date, flat(0, 389, price), price);

// Scenario A: a dip armed on a completed minute, a trailing buy, the fill at the next trade, then a fill-minute stop
// at a LOSS (the unconditional stop) whose own high never raises it.
const scenarioA = () =>
  groupMarketSessions([
    ...warm('2020-01-06'),
    ...ticksOf('2020-01-07', [
      [0, 100, 100, 100, 100],
      [1, 100, 100, 98, 98], // 2% below the previous minute's high (B = 1, Lp = 1) → arms at its close (98)
      [2, 98, 98.2, 97, 97.5], // trailing low 97; 97.5 ≥ 97 × 1.005 = 97.485 → decision at the close
      [3, 97.6, 98, 96.5, 97], // fill at 97.6; stop 97.6 × 0.99 = 96.624; the low 96.5 triggers it in the fill minute
      ...flat(4, 389, 97)
    ], 97)
  ]);

test('F1: the protective stop acts at a loss in the fill minute, at the stop level, and the fill minute high does not raise it', () => {
  const r = runOn(scenarioA(), 1, families.F1, {});
  const lot = r.lots[0]!;

  assert.equal(lot.entryRaw, 97.6);
  assert.equal(lot.exitRaw, 97.6 * (1 - 0.01));
  assert.equal(lot.exitBar, lot.entryBar);
  assert.equal(lot.exitReason, 'trailing stop');
  assert.equal(lot.exitExecution, 'stop level');
  assert.ok(Math.abs(lot.net - -1000) < 1e-6);
  assert.equal(lot.interest, 0);
});

test('L0: the same trade is held while losing (profit-conditioned stop, no exit in the entry period)', () => {
  const r = runOn(scenarioA(), 1, ladder.L0, {});

  assert.equal(r.lots.length, 1);
  assert.equal(r.lots[0]!.open, true);
});

test('next-open and minute-low stop fills, slippage only on stops', () => {
  const next = runOn(scenarioA(), 1, families.F1, {}, { stopFill: 'next-open' }).lots[0]!;
  const lowFill = runOn(scenarioA(), 1, families.F1, {}, { stopFill: 'minute-low' }).lots[0]!;
  const slipped = runOn(scenarioA(), 1, families.F1, {}, { stopSlippageBps: 25, costBps: 5 }).lots[0]!;

  assert.equal(next.exitRaw, 97); // the next minute's open (B = 1: the next period's opening trade, carried under L2+)
  assert.equal(next.exitExecution, 'opening trade');
  // L1 (period ratchet): the stop is raised from the entry period's high (98 × 0.99 = 97.02) at its end; the next
  // period opens through it.
  const l1 = runOn(scenarioA(), 1, ladder.L1, { S: 0.01 }, { stopFill: 'next-open' }).lots[0]!;

  assert.equal(l1.exitReason, 'trailing stop gap');
  assert.equal(l1.exitRaw, 97);
  assert.equal(lowFill.exitRaw, 96.5);
  assert.equal(slipped.exitPrice, 97.6 * 0.99 * (1 - 5 / 10000) * (1 - 25 / 10000));
  assert.equal(slipped.entryPrice, 97.6 * (1 + 5 / 10000));
});

// Scenario B: B = 5; a fill at minute 7 of period 1 (minutes 5–9). The minute ratchet raises the stop from minute 7's
// high from minute 8 on; the period ratchet keeps the entry stop until the period ends.
const scenarioB = () =>
  groupMarketSessions([
    ...warm('2020-01-06'),
    ...ticksOf('2020-01-07', [
      ...flat(0, 4, 100), // period 0: high 100
      [5, 100, 100, 98, 98], // arms (2% below 100)
      [6, 98, 98.5, 97.8, 98.4], // low 97.8; 98.4 ≥ 98.289 → decision
      [7, 98.4, 99.5, 98.3, 99.4], // fill 98.4; minute ratchet: stop → 99.5 × 0.99 = 98.505 from minute 8
      [8, 99.4, 99.6, 98.9, 99], // 98.9 > 98.505 → held; stop → 98.604
      [9, 99, 99, 98.5, 98.6], // minute ratchet: 98.5 ≤ 98.604 → exit at 98.604
      ...flat(10, 14, 98.6),
      ...flat(15, 389, 98.6)
    ], 98.6)
  ]);

test('F1 minute ratchet versus the period ratchet (L4)', () => {
  const minute = runOn(scenarioB(), 5, families.F1, {}).lots[0]!;

  assert.equal(minute.entryRaw, 98.4);
  assert.equal(minute.exitRaw, 99.6 * 0.99);
  assert.equal(minute.exitTime, openOf('2020-01-07') + 9 * 60);

  const period = runOn(scenarioB(), 5, ladder.L4, {}).lots[0]!;

  // During period 1 the stop is 98.4 × 0.99 = 97.416 (no exit); at its end it is raised to 99.6 × 0.99 = 98.604, and
  // period 2's first minute (open 98.6) opens through it.
  assert.equal(period.exitTime, openOf('2020-01-07') + 10 * 60);
  assert.equal(period.exitReason, 'trailing stop gap');
  assert.equal(period.exitRaw, 98.6);
});

// Scenario C: B = 30; an exit and a fresh setup and entry inside the same period (L2), impossible under L1.
const scenarioC = () =>
  groupMarketSessions([
    ...warm('2020-01-06'),
    ...ticksOf('2020-01-07', [
      ...flat(0, 29, 100), // period 0: high 100
      [30, 100, 100, 98, 98], // arms
      [31, 98, 98.6, 98, 98.6], // 98.6 ≥ 98 × 1.005 → decision
      [32, 98.6, 98.6, 97.5, 97.6], // fill 98.6, stop 97.614: low 97.5 → exit at 97.614 (L2)
      [33, 97.6, 97.6, 97.4, 97.4], // re-arm on 97.4 (2.6% below the reference high 100)
      [34, 97.4, 98, 97.3, 98], // low 97.3; 98 ≥ 97.7865 → decision
      [35, 98, 98.2, 97.9, 98.1], // second fill at 98
      ...flat(36, 389, 98.1)
    ], 98.1)
  ]);

test('L2 exits in the entry period and re-enters after a fresh setup in the same period; L1 cannot', () => {
  const l2 = runOn(scenarioC(), 30, ladder.L2, {});

  assert.equal(l2.lots.length, 2);
  assert.equal(l2.lots[0]!.exitRaw, 98.6 * 0.99);
  assert.equal(l2.lots[1]!.entryRaw, 98);
  assert.equal(l2.lots[0]!.entryPeriod, l2.lots[1]!.entryPeriod);

  const l1 = runOn(scenarioC(), 30, ladder.L1, {});

  assert.equal(l1.lots.length, 1);
  assert.notEqual(l1.lots[0]!.exitPeriod, l1.lots[0]!.entryPeriod);
});

// Scenario D: an overnight hold and a gap through the stop at the next session's opening trade; interest by calendar
// days (a weekend counts three).
const scenarioD = () =>
  groupMarketSessions([
    ...warm('2020-01-09'),
    ...ticksOf('2020-01-10', [
      [0, 100, 100, 100, 100],
      [1, 100, 100, 98, 98],
      [2, 98, 98.6, 98, 98.6],
      [3, 98.6, 99, 98.5, 99],
      ...flat(4, 389, 99)
    ], 99), // Friday
    ...ticksOf('2020-01-13', [[0, 95, 95, 94, 94.5], ...flat(1, 389, 94.5)], 94.5) // Monday opens below the stop
  ]);

test('a weekend gap through the stop sells at the opening trade; three days of interest', () => {
  const r = runOn(scenarioD(), 1, families.F1, {});
  const lot = r.lots[0]!;

  assert.equal(lot.exitReason, 'trailing stop gap');
  assert.equal(lot.exitRaw, 95);
  assert.ok(Math.abs(lot.interest - (100_000 * 0.11 * 3) / 365) < 1e-9);

  const free = runOn(scenarioD(), 1, families.F1, {}, { rate: 0 }).lots[0]!;
  const negative = runOn(scenarioD(), 1, families.F1, {}, { rate: -0.01 }).lots[0]!;

  assert.equal(free.interest, 0);
  assert.ok(negative.interest < 0 && negative.net > free.net);
});

// Scenario E: a decision before the close fills at the closing print; a decision on the last minute carries to the next
// session's opening trade.
const scenarioE = (decisionMinute: number) =>
  groupMarketSessions([
    ...warm('2020-01-06'),
    ...ticksOf('2020-01-07', [
      ...flat(0, decisionMinute - 3, 100),
      [decisionMinute - 2, 100, 100, 98, 98],
      [decisionMinute - 1, 98, 98, 97.9, 97.9],
      [decisionMinute, 97.9, 98.5, 97.9, 98.5] // 98.5 ≥ 97.9 × 1.005 = 98.3895 → decision
    ], 98.4),
    ...ticksOf('2020-01-08', [[0, 98.7, 99, 98.6, 98.9], ...flat(1, 389, 98.9)], 98.9)
  ]);

test('closing print for a decision before the close; the last minute carries to the next opening trade', () => {
  const before = runOn(scenarioE(388), 1, families.F1, { S: 0.03 }).lots[0]!;

  assert.equal(before.entryExecution, 'closing print');
  assert.equal(before.entryRaw, 98.4);

  const last = runOn(scenarioE(389), 1, families.F1, { S: 0.03 }).lots[0]!;

  assert.equal(last.entryExecution, 'opening trade');
  assert.equal(last.entryRaw, 98.7);
  assert.equal(last.carried, true);
});

// Scenario F: continuation (F2). A net-profitable exit opens a window; a close P below its high arms a continuation
// setup; a losing exit opens none.
const scenarioF = (profitable: boolean) =>
  groupMarketSessions([
    ...warm('2020-01-06'),
    ...ticksOf('2020-01-07', [
      [0, 100, 100, 100, 100],
      [1, 100, 100, 98, 98], // deep arm
      [2, 98, 98.6, 98, 98.6], // decision
      [3, 98.6, profitable ? 101 : 98.7, 98.6, profitable ? 101 : 98.7], // fill 98.6
      [4, profitable ? 101 : 98.7, profitable ? 101 : 98.7, profitable ? 99.9 : 97.5, profitable ? 100 : 97.6], // stop: 101 × 0.99 = 99.99 (profit) / 98.6 × 0.99 = 97.614 (loss)
      [5, 100, 100, 99.5, 99.6], // continuation: 99.6 ≤ 99.99 × 0.995 = 99.49? no; next
      [6, 99.6, 99.6, 99.3, 99.4], // 99.4 ≤ 99.48 → continuation arms (the deep test: 1 − 99.4/100 < 1%)
      [7, 99.4, 99.95, 99.4, 99.95], // 99.95 ≥ 99.3 × 1.005 → decision
      ...flat(8, 389, 100)
    ], 100)
  ]);

test('F2 continuation after a profitable exit only; F1 never re-enters there', () => {
  const win = runOn(scenarioF(true), 1, families.F2, { pullback: 0.005, X: 0.02 });

  assert.equal(win.lots.length, 2);
  assert.ok(win.lots[0]!.net > 0);
  assert.equal(win.lots[1]!.setupKind, 'continuation');
  assert.equal(win.lots[1]!.anchorHigh, 100); // the exit price 99.99, raised by the next period's high

  const loss = runOn(scenarioF(false), 1, families.F2, { pullback: 0.005, X: 0.02 });

  assert.ok(loss.lots[0]!.net < 0);
  assert.equal(loss.lots.filter((l) => l.setupKind === 'continuation').length, 0);

  const core = runOn(scenarioF(true), 1, families.F1, { pullback: 0.005, X: 0.02 });

  assert.equal(core.lots.filter((l) => l.setupKind === 'continuation').length, 0);
});

// Scenario G: H/U (F3). The maximum hold sells at the next trade after a period's first minute when held ≥ H and losing
// at the open, and suspends that position's intraday stop for the period; the buffered loss sells after the hold.
const scenarioG = () =>
  groupMarketSessions([
    ...warm('2020-01-06'),
    ...ticksOf('2020-01-07', [
      [0, 100, 100, 100, 100],
      [1, 100, 100, 98, 98],
      [2, 98, 98.6, 98, 98.6],
      [3, 98.6, 98.6, 98.4, 98.5], // fill 98.6 (B = 5: period 0 = minutes 0–4)
      [4, 98.5, 98.5, 98.4, 98.4],
      [5, 98.2, 98.3, 97, 97.5], // period 1 opens losing; held 5 minutes ≥ H = 5 → the hold is due: the stop (97.614) is suspended
      [6, 97.4, 97.5, 97.3, 97.4], // sold at this minute's open (the next trade after the first minute)
      ...flat(7, 389, 97.4)
    ], 97.4)
  ]);

test('F3 maximum hold: the sale after the first minute, the stop suspended for that period', () => {
  const r = runOn(scenarioG(), 5, families.F3, { holdSeconds: 5 * 60 });
  const lot = r.lots[0]!;

  assert.equal(lot.exitReason, 'maximum hold');
  assert.equal(lot.exitRaw, 97.4);
  assert.equal(lot.maximumHoldDue, true);

  const core = runOn(scenarioG(), 5, families.F1, {}).lots[0]!; // no H/U: the stop sells in minute 5

  assert.equal(core.exitReason, 'trailing stop');
  assert.equal(core.exitRaw, 98.6 * 0.99);
});

test('F3 buffered loss after the hold, at the next trade, with the stop winning when it triggers first', () => {
  const sessions = groupMarketSessions([
    ...warm('2020-01-06'),
    ...ticksOf('2020-01-07', [
      [0, 100, 100, 100, 100],
      [1, 100, 100, 98, 98],
      [2, 98, 98.6, 98, 98.6],
      [3, 98.6, 99, 98.6, 99], // fill 98.6
      [4, 99, 99, 99, 99],
      [5, 99.1, 99.1, 98.9, 98.9], // period 1 opens in profit (no maximum hold); held 5 ≥ H
      [6, 98.9, 98.9, 98.2, 98.3], // 98.3 is 0.30% below 98.6: loss −$304 ≤ −0.25% × N → the buffered signal
      [7, 98.3, 98.3, 98.2, 98.2], // sold at this open
      ...flat(8, 389, 98.2)
    ], 98.2)
  ]);
  const r = runOn(sessions, 5, families.F3, { holdSeconds: 5 * 60, buffer: 0.0025, S: 0.02 });

  assert.equal(r.lots[0]!.exitReason, 'buffered intraday loss');
  assert.equal(r.lots[0]!.exitRaw, 98.3);
  assert.equal(r.lots[0]!.bufferSignalTime, openOf('2020-01-07') + 7 * 60);
});

// DST, early closes and the clock: a session in EST, one in EDT and the 2020-11-27 early close.
test('periods across DST and an early close; the closing print belongs to the last period', () => {
  const sessions = groupMarketSessions([
    ...ticksOf('2020-03-06', flat(0, 389, 100), 100),
    ...ticksOf('2020-03-09', flat(0, 389, 100), 100),
    ...ticksOf('2020-11-27', flat(0, 209, 100), 100, true)
  ]);
  const m = market(sessions);
  const clock = minuteClock(m, sessions, 65);

  assert.equal(sessions[0]!.openTime, Date.parse('2020-03-06T14:30:00Z') / 1000);
  assert.equal(sessions[1]!.openTime, Date.parse('2020-03-09T13:30:00Z') / 1000);
  assert.equal(sessions[2]!.closeTime, Date.parse('2020-11-27T18:00:00Z') / 1000);
  assert.equal(clock.count, 6 + 6 + 4); // 390/65, 390/65, ⌈210/65⌉
  assert.equal(clock.closeTime[clock.count - 1], sessions[2]!.closeTime);
  assert.equal(clock.isLast[clock.count - 1], 1);
});

// Sparse minutes: the next observed trade, several minutes later.
test('sparse minutes: a decision fills at the next observed trade', () => {
  const sessions = groupMarketSessions([
    ...warm('2020-01-06'),
    ...ticksOf('2020-01-07', [
      [0, 100, 100, 100, 100],
      [1, 100, 100, 98, 98],
      [2, 98, 98.6, 98, 98.6], // decision at 09:33
      [9, 98.8, 99, 98.7, 99], // no trade from 09:33 to 09:38: fill at 09:39
      ...flat(10, 389, 99)
    ], 99)
  ]);
  const lot = runOn(sessions, 1, families.F1, { S: 0.03 }).lots[0]!;

  assert.equal(lot.entryTime, openOf('2020-01-07') + 9 * 60);
  assert.equal(lot.entryRaw, 98.8);
});

// The split: the FULL door forward-adjusts post-split sessions, so a held position sees no artificial drop.
test('the 8:1 split of 2026-04-21 is forward-adjusted: no artificial gap for a held position', () => {
  const raw = groupMarketSessions([
    ...warm('2026-04-16', 800),
    ...ticksOf('2026-04-17', [[0, 800, 800, 800, 800], [1, 800, 800, 784, 784], [2, 784, 790, 784, 790], ...flat(3, 389, 790)], 790),
    ...ticksOf('2026-04-20', flat(0, 389, 792), 792),
    ...ticksOf('2026-04-21', flat(0, 389, 99.25), 99.25) // 794 ÷ 8
  ]);
  const { sessions, applied } = adjustSessionsForSplits(raw, 'VGT', [{ symbol: 'VGT', effectiveDate: '2026-04-21', ratio: 8 }] as never);

  assert.equal(applied.length, 1);
  assert.equal(sessions[3]!.close, 794);

  const r = runOn(sessions, 1, families.F1, { S: 0.03 });

  assert.equal(r.lots.length, 1);
  assert.equal(r.lots[0]!.open, true);
  assert.ok(r.unrealized > 0);
});

// Reset drawdowns, annual attribution, the endpoint mark and the blackout.
test('segments restart at boundary closes; marks attribute exactly; an open endpoint is marked net of interest', () => {
  const sessions = scenarioD();
  const r = runOn(sessions, 1, families.F1, { S: 0.2 }, {}, { segmentEnds: [1] });

  assert.equal(r.segments.length, 2);
  assert.equal(r.segments[0]!.endMark, r.dailyMarks[1]);
  assert.equal(r.segments[1]!.startMark, r.dailyMarks[1]);
  assert.ok(Math.abs(r.segments[1]!.endMark - r.segments[1]!.startMark - (r.net - r.dailyMarks[1]!)) < 1e-9);
  assert.equal(r.lots[0]!.open, true);
  assert.ok(Math.abs(r.unrealized - (r.lots[0]!.shares * 94.5 - 100_000 - (100_000 * 0.11 * 3) / 365)) < 1e-9);
  assert.ok(r.segments[1]!.drawdown.maximum > 0);
});

test('the blackout refuses new funding inside its sessions and nothing else', () => {
  const r = runOn(scenarioA(), 1, families.F1, {}, {}, { blackout: [1, 1] });

  assert.equal(r.lots.length, 0);
  assert.equal(r.refused, 1);
});

test('determinism and the reference agree on every scenario', () => {
  for (const [name, sessions, B] of [
    ['A', scenarioA(), 1],
    ['B', scenarioB(), 5],
    ['C', scenarioC(), 30],
    ['D', scenarioD(), 1],
    ['F', scenarioF(true), 1],
    ['G', scenarioG(), 5]
  ] as const) {
    for (const rules of [ladder.L0, ladder.L1, ladder.L2, ladder.L3, ladder.L4, families.F1, families.F2, families.F3, families.F4]) {
      const p = params({ holdSeconds: 5 * 60, buffer: 0.0025, pullback: 0.005 });
      const m = market(sessions as MarketSession[]);
      const clock = minuteClock(m, sessions as MarketSession[], B);
      const a = simulate(m, clock, rules, p, settings0, { armFromSession: 0, endSession: sessions.length - 1 });
      const b = simulate(m, clock, rules, p, settings0, { armFromSession: 0, endSession: sessions.length - 1 });
      const ref = referenceSimulate(m, clock, rules, p, settings0, 0, sessions.length - 1);

      assert.deepEqual(a.lots, b.lots, `${name} determinism`);
      assert.equal(a.lots.length, ref.lots.length, `${name} lots vs reference`);
      a.lots.forEach((l, i) => assert.equal(l.exitBar, ref.lots[i]!.exitBar < 0 ? -1 : ref.lots[i]!.exitBar, `${name} lot ${i}`));
      assert.ok(Math.abs(a.net - ref.net) < 1e-6, `${name} net`);
      assert.ok(Math.abs(a.minuteDrawdown.maximum - ref.minuteDd) < 1e-6, `${name} drawdown`);
    }
  }
});
