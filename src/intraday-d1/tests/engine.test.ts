// Intraday D1 engine tests: the period clock and its time units, targeted state-machine scenarios on hand-built
// minutes, the differential property test against Study 8's verified D1 machines on synthetic data (P2/P3 shape),
// determinism, and the adapted record definitions. None of these reads market data.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MarketSession, Tick } from '#types';
import { Rng } from '../../optimizer/rng.ts';
import { type EngineParams, type ExecutionSettings, simulate } from '../engine.ts';
import { compareWithStudy8Trace } from '../parity.ts';
import { buildMarket, minuteClock, sessionClock } from '../periods.ts';
import { periodsFor } from '../space.ts';
import { syntheticSessions } from './fixtures.ts';

const noCost: ExecutionSettings = { principal: 100000, rate: 0.11, costBps: 0, stopFill: 'stop', stopSlippageBps: 0 };

// A hand-built session on an EST date: bars [minute, open, high, low, close].
const hand = (date: string, bars: [number, number, number, number, number][], closingPrint?: number): MarketSession => {
  const openTime = Date.parse(`${date}T14:30:00Z`) / 1000;
  const ticks: Tick[] = bars.map(([m, o, h, l, c]) => ({
    time: openTime + m * 60,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: 1,
    trades: NaN
  }));
  const highs = ticks.map((t) => t.high).concat(closingPrint === undefined ? [] : [closingPrint]);
  const lows = ticks.map((t) => t.low).concat(closingPrint === undefined ? [] : [closingPrint]);

  return {
    ...ticks[0]!,
    date,
    time: Date.parse(date) / 1000,
    openTime,
    closeTime: openTime + 390 * 60,
    isEarlyClose: false,
    bars: ticks,
    ...(closingPrint === undefined ? {} : { closingPrint }),
    open: ticks[0]!.open,
    high: Math.max(...highs),
    low: Math.min(...lows),
    close: closingPrint ?? ticks.at(-1)!.close,
    volume: ticks.length
  };
};
const flat = (from: number, to: number, price: number): [number, number, number, number, number][] =>
  Array.from({ length: to - from + 1 }, (_v, i) => [from + i, price, price, price, price]);

const params = (overrides: Partial<EngineParams> = {}): EngineParams => ({
  targetPercentChange: 0.01,
  trailingBuyPercentage: 0.005,
  trailingStopPercentage: 0.01,
  holdSeconds: 1e9,
  lookbackPeriods: 2,
  intradayLossBuffer: 0.5,
  pullback: 0.5,
  continuationPeriods: 1,
  ...overrides
});

describe('period clock', () => {
  it('cuts sessions into clock-aligned B-minute periods; the last runs to the close and holds the closing print', () => {
    const s = hand(
      '2020-01-06',
      [
        [0, 100, 100, 100, 100],
        [4, 100, 101, 99, 100],
        [5, 100, 100, 100, 100],
        [22, 100, 100, 100, 100]
      ],
      102
    );
    const market = buildMarket([s]);
    const clock = minuteClock(market, [s], 5);

    assert.equal(clock.count, 3); // blocks 0 (2 bars), 1 (1 bar), 4 (1 bar)
    assert.deepEqual(
      [...clock.barEnd].map((e, i) => e - clock.barStart[i]!),
      [2, 1, 1]
    );
    assert.deepEqual([...clock.t], [0, 300, 1200]);
    assert.equal(clock.closeTime[0], s.openTime + 300);
    assert.equal(clock.closeTime[2], s.closeTime);
    assert.ok(Number.isNaN(clock.closingPrint[0]!) && Number.isNaN(clock.closingPrint[1]!));
    assert.equal(clock.closingPrint[2], 102);
    assert.equal(clock.close[2], 102);
    assert.equal(clock.high[2], 102);
    assert.equal(clock.high[0], 101);
  });

  it('counts scheduled trading minutes across DST, weekends, a holiday and an early close; sessions match D1', () => {
    const sessions = syntheticSessions('clock');
    const market = buildMarket(sessions);
    const clock = minuteClock(market, sessions, 30);
    const early = sessions.findIndex((s) => s.date === '2020-11-27');

    assert.equal(sessions[early]!.closeTime - sessions[early]!.openTime, 210 * 60);

    for (let s = 1; s < sessions.length; s++) {
      const first = clock.firstOfSession[s]!;
      const before = clock.firstOfSession[s - 1]!;
      const scheduled = (sessions[s - 1]!.closeTime - sessions[s - 1]!.openTime) / 60;
      const block = (market.bars.time[clock.barStart[before]!]! - sessions[s - 1]!.openTime) / 1800;

      // t at a session's first period = t at the previous one − its block offset + the previous scheduled length
      assert.equal(clock.t[first]! - (clock.t[before]! - Math.floor(block) * 1800), scheduled * 60);
    }

    const session = sessionClock(market, sessions);

    sessions.forEach((s, p) => {
      assert.equal(session.close[p], s.close);
      assert.equal(session.t[p], s.time);
    });
  });

  it('converts minute durations to at least one period, rounding', () => {
    assert.equal(periodsFor(10, 30), 1);
    assert.equal(periodsFor(44, 30), 1);
    assert.equal(periodsFor(46, 30), 2);
    assert.equal(periodsFor(4052.65, 5), 811);
  });
});

describe('state machine on hand-built minutes (B = 5)', () => {
  // period 0 (min 0–4) and 1 (5–9) at 100; period 2 arms at minute 10 (98.9, 1.1% below 100), the trailing low falls
  // to 98.5 at minute 11, minute 12 closes at 99 ≥ 98.5 × 1.005 → buy at minute 13's open (99.05). Minute 13 trades at
  // 97 inside the entry period: no exit there. Period 3 rallies (the stop, 99.2 × 0.99 = 98.208, was inactive: below
  // breakeven); period 4 hits the raised active stop (101 × 0.99 = 99.99) at the stop level.
  const day = hand('2020-01-06', [
    ...flat(0, 9, 100),
    [10, 100, 100, 98.9, 98.9],
    [11, 98.9, 98.9, 98.5, 98.6],
    [12, 98.6, 99, 98.6, 99],
    [13, 99.05, 99.1, 97, 99],
    [14, 99, 99.2, 99, 99.1],
    [15, 99.1, 101, 97.5, 101],
    [20, 100.5, 100.6, 99.5, 99.8],
    ...flat(25, 40, 99.8)
  ]);
  const market = buildMarket([day]);
  const clock = minuteClock(market, [day], 5);
  const result = simulate(market, clock, params(), noCost, { armFromSession: 0, endSession: 0 });
  const [lot] = result.lots;

  it('arms on a completed close, trails the low, buys at the next minute’s open, never in the arming minute', () => {
    assert.equal(lot!.setupKind, 'deep');
    assert.equal(lot!.activationPrice, 98.9);
    assert.equal(lot!.trailingLow, 98.5);
    assert.equal(lot!.decisionTime, day.openTime + 13 * 60);
    assert.equal(lot!.entryTime, day.openTime + 13 * 60);
    assert.equal(lot!.entryRaw, 99.05);
    assert.equal(lot!.entryExecution, 'first trade after decision');
  });

  it('never exits in the entry period; an inactive (unprofitable) stop never fires; an active one fills at its level', () => {
    assert.equal(lot!.entryPeriod, 2);
    assert.equal(lot!.exitPeriod, 4);
    assert.equal(lot!.exitReason, 'trailing stop');
    assert.equal(lot!.exitExecution, 'stop level');
    assert.equal(lot!.exitRaw, 101 * 0.99);
    assert.equal(lot!.stopFirstActivePeriod, 4);
  });

  it('charges no interest on a same-day round trip and opens the continuation window on a profitable exit', () => {
    assert.equal(lot!.interest, 0);
    assert.ok(lot!.net > 0);
    assert.equal(result.lots.length, 1);
  });

  it('a decision on a period’s last minute is carried to the next period’s opening trade', () => {
    const carry = hand('2020-01-06', [
      ...flat(0, 9, 100),
      [10, 100, 100, 98.9, 98.9],
      [14, 98.9, 99.6, 98.9, 99.5], // the period's last bar triggers (99.5 ≥ 98.9 × 1.005)
      [17, 99.7, 99.8, 99.6, 99.7],
      ...flat(20, 30, 99.7)
    ]);
    const m = buildMarket([carry]);
    const r = simulate(m, minuteClock(m, [carry], 5), params(), noCost, { armFromSession: 0, endSession: 0 });

    assert.equal(r.lots[0]!.carried, true);
    assert.equal(r.lots[0]!.entryPeriod, 3);
    assert.equal(r.lots[0]!.entryRaw, 99.7);
    assert.equal(r.lots[0]!.entryExecution, 'opening trade');
  });

  it('measures the hold in trading minutes (overnight does not count) and charges calendar nights of interest', () => {
    const friday = hand(
      '2020-01-10',
      [...flat(0, 360, 100), [365, 100, 100, 98.9, 98.9], [370, 98.9, 99.6, 98.9, 99.5], [380, 99.4, 99.4, 99.3, 99.3]],
      99.3
    );
    // Monday: losing at every period open; hold 60 trading minutes from the entry period (15:50 ET, block 74)
    const monday = hand('2020-01-13', [...flat(0, 60, 99)], 99);
    const m = buildMarket([friday, monday]);
    const r = simulate(m, minuteClock(m, [friday, monday], 5), params({ holdSeconds: 60 * 60 }), noCost, {
      armFromSession: 0,
      endSession: 1
    });
    const l = r.lots[0]!;

    // the decision at minute 370's close fills at the next bar (minute 380), so the entry period is block 76
    // (minute 380); 390 − 380 = 10 trading minutes on Friday, so the 60-minute hold is due at Monday's block starting
    // at minute 50 (overnight and the weekend do not count) and sells at the next trade after its first minute
    assert.equal(l.entryTime, friday.openTime + 380 * 60);
    assert.equal(l.exitReason, 'maximum hold');
    assert.equal(l.exitTime, monday.openTime + 51 * 60);
    assert.equal(l.interest, 100000 * 0.11 * ((3 * 86400) / (365 * 86400))); // three calendar nights, D1 formula
  });

  it('places no restriction after a losing exit (D1 has none): the next dip may re-enter at a higher price', () => {
    const d = hand('2020-01-06', [
      ...flat(0, 9, 100),
      [10, 100, 100, 98.9, 98.9],
      [12, 98.9, 99.5, 98.9, 99.5],
      [13, 99.5, 99.5, 99.5, 99.5],
      [15, 99.5, 99.5, 99.5, 99.5]
    ]);
    const next = hand(
      '2020-01-07',
      [...flat(0, 30, 97), [35, 97, 97, 95, 95], [36, 95, 96, 95, 96], ...flat(40, 60, 96)],
      96
    );
    const m = buildMarket([d, next]);
    const r = simulate(m, minuteClock(m, [d, next], 5), params({ holdSeconds: 300 }), noCost, {
      armFromSession: 0,
      endSession: 1
    });

    assert.ok(r.lots.length >= 2);
    assert.ok(r.lots[0]!.net < 0);
    assert.equal(r.lots[1]!.setupKind, 'deep');
  });
});

describe('differential: the engine equals Study 8’s verified D1 machines (synthetic data)', () => {
  const B = [5, 10, 15, 30, 65, 130];

  for (const seed of ['a', 'b', 'c']) {
    it(`seed ${seed}: 24 random intraday vectors (interest 0) and the session clock with costs and interest`, () => {
      const sessions = syntheticSessions(seed, { presence: seed === 'c' ? 0.4 : 0.8 });
      const market = buildMarket(sessions);
      const rng = Rng.from('intraday-d1-tests', 'differential', seed);
      let lots = 0;

      for (let n = 0; n < 24; n++) {
        const minutes = B[n % B.length]!;
        const p: EngineParams = {
          targetPercentChange: 0.001 * 1.06 ** rng.int(50),
          trailingBuyPercentage: 0.0002 * 1.06 ** rng.int(50),
          trailingStopPercentage: 0.0005 * 1.06 ** rng.int(55),
          holdSeconds: 60 * 5 * 1.1 ** rng.int(60),
          lookbackPeriods: periodsFor(10 * 1.1 ** rng.int(50), minutes),
          intradayLossBuffer: rng.int(151) / 10000,
          pullback: 0.0005 * 1.06 ** rng.int(50),
          continuationPeriods: periodsFor(10 * 1.1 ** rng.int(50), minutes)
        };
        const settings: ExecutionSettings = {
          principal: 100000,
          rate: 0,
          costBps: [0, 5, 10][n % 3]!,
          stopFill: n % 4 === 0 ? 'next-open' : 'stop',
          stopSlippageBps: n % 5 === 0 ? 25 : 0
        };
        const r = compareWithStudy8Trace(market, sessions, minuteClock(market, sessions, minutes), p, settings, 1);

        assert.deepEqual(r.problems, [], `vector ${n}`);
        lots += r.lots;
      }

      const session = compareWithStudy8Trace(
        market,
        sessions,
        sessionClock(market, sessions),
        { ...params(), lookbackPeriods: 3, holdSeconds: 2 * 86400, continuationPeriods: 4 },
        { ...noCost, costBps: 5 },
        1
      );

      assert.deepEqual(session.problems, []);
      assert.ok(lots > 50, `only ${lots} lots exercised`);
    });
  }
});

describe('determinism', () => {
  it('reruns are identical', () => {
    const sessions = syntheticSessions('determinism');
    const market = buildMarket(sessions);
    const p = params({
      targetPercentChange: 0.003,
      trailingBuyPercentage: 0.001,
      trailingStopPercentage: 0.002,
      holdSeconds: 3600
    });
    const a = simulate(market, minuteClock(market, sessions, 10), p, noCost, {
      armFromSession: 1,
      endSession: sessions.length - 1
    });
    const b = simulate(market, minuteClock(market, sessions, 10), p, noCost, {
      armFromSession: 1,
      endSession: sessions.length - 1
    });

    assert.ok(a.lots.length > 0);
    assert.deepEqual(JSON.stringify(a), JSON.stringify(b));
  });
});
