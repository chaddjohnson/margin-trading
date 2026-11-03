import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BacktestPosition, MarketSession } from '#types';
import { PositionType } from '#types';
import { type StopFill, evaluateSessionExit } from '../../app/allIn.ts';
import { incumbent } from '../constants.ts';
import { evaluateMinuteSessionExit } from '../exits.ts';
import { bar, buildSessions, flatBars, utcOf, withBars } from './helpers.ts';

const date = '2017-03-14';

const positionAt = (entryPrice: number, entryDate = date): BacktestPosition => ({
  isOpen: true,
  symbol: 'VGT',
  type: PositionType.Long,
  shares: 100000 / entryPrice,
  investment: 100000,
  entryTimestamp: Date.parse(entryDate) / 1000,
  entryPrice
});

const sessionOf = (bars = flatBars(100), closingPrint: number | null = 100, day = date) =>
  buildSessions([{ date: day, bars, closingPrint: closingPrint ?? undefined }])[0]!;

const indexAt = (session: MarketSession, at: string) =>
  session.bars.findIndex((item) => item.time === utcOf(session.date, at));

const interestFor = (position: BacktestPosition, session: MarketSession) =>
  position.investment * incumbent.marginInterestRate * ((session.time - position.entryTimestamp) / (365 * 86400));

describe('STOP_MINUTE_CAUSAL', () => {
  it("never uses a minute's high to stop that same minute; the next minute can trigger", () => {
    const session = sessionOf(
      withBars(flatBars(100), [
        bar('10:05', 101, 103, 100.5, 102),
        bar('10:06', 101, 101.2, 100.8, 101),
        bar('10:07', 101, 101, 101, 101)
      ])
    );
    const position = positionAt(100);
    const result = evaluateMinuteSessionExit({
      position,
      session,
      stopPrice: 100 * 0.979,
      highSinceEntry: 100,
      interest: 0,
      stopFill: 'stop',
      entryBarIndex: indexAt(session, '10:00')
    });

    assert.equal(result.exit?.time, utcOf(date, '10:06'));
    assert.equal(result.exit?.price, 103 * (1 - incumbent.trailingStopPercentage));
    assert.equal(result.exit?.execution, 'stop level');
    assert.equal(result.isIntrasessionStop, true);
  });

  it("can't trigger in the fill's own minute; a later minute opening through the stop fills at its open", () => {
    const session = sessionOf(
      withBars(flatBars(100), [bar('10:00', 100, 103, 99, 102), bar('10:01', 100.5, 101, 100.2, 100.6)])
    );
    const result = evaluateMinuteSessionExit({
      position: positionAt(100),
      session,
      stopPrice: 100 * 0.979,
      highSinceEntry: 100,
      interest: 0,
      stopFill: 'stop',
      entryBarIndex: indexAt(session, '10:00')
    });

    assert.equal(result.exit?.time, utcOf(date, '10:01'));
    assert.equal(result.exit?.price, 100.5);
    assert.equal(result.exit?.execution, 'minute open through stop');
  });

  it('keeps the profit-conditional activation: inactive while a stop fill would lose after interest, active once raised', () => {
    const day = '2017-03-20';
    const position = positionAt(100, '2017-03-15');
    const session = sessionOf(
      withBars(flatBars(100.2), [bar('10:00', 100.2, 102.5, 100.2, 102), bar('10:01', 101, 101, 100.3, 100.5)]),
      100.4,
      day
    );
    const interest = interestFor(position, session);

    assert.ok(position.shares * 100.1 - 100000 - interest < 0);

    const daily = evaluateSessionExit({
      position,
      session,
      stopPrice: 100.1,
      interest,
      maximumHoldDays: 8,
      stopFill: 'stop'
    });
    const minute = evaluateMinuteSessionExit({
      position,
      session,
      stopPrice: 100.1,
      highSinceEntry: 102.2,
      interest,
      stopFill: 'stop'
    });

    assert.equal(daily, undefined);
    assert.equal(minute.exit?.time, utcOf(day, '10:01'));
    assert.equal(minute.exit?.price, 102.5 * 0.979);
  });

  it('fills a gap through an active stop at the opening trade and lets a due maximum hold take precedence', () => {
    const position = positionAt(100, '2017-03-01');
    const gap = sessionOf(flatBars(101), 101, '2017-03-06');
    const result = evaluateMinuteSessionExit({
      position,
      session: gap,
      stopPrice: 101.5,
      highSinceEntry: 103.7,
      interest: interestFor(position, gap),
      stopFill: 'stop'
    });

    assert.equal(result.exit?.reason, 'trailing stop gap');
    assert.equal(result.exit?.execution, 'opening trade');

    const due = sessionOf(
      withBars(flatBars(99), [bar('09:30', 99, 105, 99, 104), bar('09:31', 98, 98, 90, 95)]),
      95,
      '2017-03-09'
    );
    const held = evaluateMinuteSessionExit({
      position,
      session: due,
      stopPrice: 90,
      highSinceEntry: 92,
      interest: interestFor(position, due),
      stopFill: 'stop'
    });

    assert.equal(held.exit?.reason, 'maximum hold');
    assert.equal(held.exit?.time, utcOf('2017-03-09', '09:31'));
    assert.equal(held.exit?.price, 98);
  });

  it('fills a next-open trigger at the next observed trade, else at the trigger minute close', () => {
    const position = positionAt(100);
    const base = withBars(flatBars(101, '16:00', ['15:59']), [
      bar('10:00', 101, 103, 101, 102),
      bar('15:58', 101, 101, 100, 100.4)
    ]);
    const options = {
      position,
      stopPrice: 100 * 0.979,
      highSinceEntry: 100,
      interest: 0,
      stopFill: 'next-open' as StopFill
    };
    const withPrint = sessionOf(base, 100.3);
    const withoutPrint = sessionOf(base, null);
    const printed = evaluateMinuteSessionExit({
      ...options,
      session: withPrint,
      entryBarIndex: indexAt(withPrint, '09:59')
    });
    const unprinted = evaluateMinuteSessionExit({
      ...options,
      session: withoutPrint,
      entryBarIndex: indexAt(withoutPrint, '09:59')
    });

    assert.equal(printed.exit?.execution, 'closing print');
    assert.equal(printed.exit?.price, 100.3);
    assert.equal(unprinted.exit?.execution, 'trigger minute close');
    assert.equal(unprinted.exit?.price, 100.4);
  });

  it('agrees with the incumbent daily evaluator whenever no intrasession raise is involved (random sessions)', () => {
    let seed = 11;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let compared = 0;

    for (let trial = 0; trial < 400; trial++) {
      const entryDate = '2017-03-01';
      const day = ['2017-03-06', '2017-03-08', '2017-03-10', '2017-03-13'][trial % 4]!;
      let price = 100 + (random() - 0.5) * 8;
      const bars = flatBars(100)
        .filter(() => random() > 0.05)
        .map((item) => {
          const open = price;

          price += (random() - 0.5) * 0.5;

          return bar(
            item.at,
            open,
            Math.max(open, price) + random() * 0.2,
            Math.min(open, price) - random() * 0.2,
            price
          );
        });
      const session = sessionOf(bars, random() < 0.8 ? price : null, day);
      const position = positionAt(100, entryDate);
      const interest = interestFor(position, session);
      const highSinceEntry = 100 + random() * 6;
      const stopPrice = highSinceEntry * 0.979;

      for (const stopFill of ['stop', 'next-open'] as StopFill[]) {
        const daily = evaluateSessionExit({ position, session, stopPrice, interest, maximumHoldDays: 8, stopFill });
        const minute = evaluateMinuteSessionExit({ position, session, stopPrice, highSinceEntry, interest, stopFill });

        if (minute.exit && !minute.isIntrasessionStop) {
          assert.deepEqual(minute.exit, daily);
          compared++;
        }

        if (daily) {
          assert.ok(minute.exit && minute.exit.time <= daily.time);
        } else if (!minute.exit) {
          assert.equal(minute.stopPrice, Math.max(stopPrice, Math.max(highSinceEntry, session.high) * 0.979));
        }
      }
    }

    assert.ok(compared > 50);
  });
});
