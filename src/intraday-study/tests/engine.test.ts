import assert from 'node:assert/strict';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { writeMinuteFixture } from '../../minute-optimizer/fixtures.ts';
import { type StopMode, policies, policyById, stopModes } from '../constants.ts';
import { computeRecentHighs, loadStudyData } from '../data.ts';
import { type RunInput, simulate } from '../engine.ts';
import { runGoldenCase } from '../goldenMaster.ts';
import { bar, flatBars, utcOf, withBars, withHistory } from './helpers.ts';

const run = (
  scenario: ReturnType<typeof withHistory>,
  policy: string,
  stopMode: StopMode = 'STOP_DAILY',
  extra: Partial<RunInput> = {}
) =>
  simulate({
    sessions: scenario.sessions,
    recentHighs: scenario.recentHighs,
    tradeStart: scenario.tradeStart,
    endIndex: scenario.sessions.length - 1,
    policy: policyById(policy),
    stopMode,
    stopFill: 'stop',
    ...extra
  });

describe('equivalence with src/app/allIn.ts on synthetic minute files', () => {
  for (const seed of [1, 2, 3]) {
    it(`reproduces every allIn.ts output file (seed ${seed}, both stop fills)`, async () => {
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'intraday-fixture-'));
      const fixture = await writeMinuteFixture(dir, { seed, start: '2017-01-03', sessions: 260 });
      const data = await loadStudyData(fixture.file);

      for (const stopFill of ['stop', 'next-open'] as const) {
        const result = await runGoldenCase(
          data.sessions,
          fixture.file,
          { label: `seed-${seed}-${stopFill}`, stopFill },
          dir
        );

        assert.ok(result.identical, JSON.stringify(result.files));
        assert.ok((result.summary.closedTrades as number) > 5);
      }

      await fs.remove(dir);
    });
  }

  it('obeys the session rules for every policy and stop model', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'intraday-fixture-'));
    const fixture = await writeMinuteFixture(dir, { seed: 4, start: '2018-01-02', sessions: 300 });
    const { sessions } = await loadStudyData(fixture.file);
    const recentHighs = computeRecentHighs(sessions);

    for (const policy of policies) {
      for (const stopMode of stopModes) {
        const result = simulate({
          sessions,
          recentHighs,
          tradeStart: 80,
          endIndex: sessions.length - 1,
          policy,
          stopMode,
          stopFill: 'stop'
        });
        const entrySessions = new Set<number>();
        const exitSessions = new Set(result.trades.map((trade) => trade.exitIndex));

        for (const trade of result.trades) {
          assert.ok(!entrySessions.has(trade.entryIndex), 'one entry per session');
          entrySessions.add(trade.entryIndex);
          assert.ok(trade.entryIndex >= 80);
          assert.ok(trade.entryTime >= trade.decisionTime, 'fills at or after the decision');
          assert.ok(trade.entryBarIndex > trade.decisionBarIndex, 'never fills inside the deciding minute');

          if (exitSessions.has(trade.entryIndex)) {
            assert.equal(
              result.trades.find((other) => other.exitIndex === trade.entryIndex),
              trade,
              'no re-entry after an exit'
            );
          }

          if (trade.isSameSession) {
            assert.equal(stopMode, 'STOP_MINUTE_CAUSAL');
            assert.equal(trade.interest, 0);
            assert.ok(trade.exitTime > trade.entryTime);
          }
        }
      }
    }

    await fs.remove(dir);
  });
});

describe('scenarios', () => {
  it('lets the minute stop exit on the entry session but never re-enters that session', () => {
    const scenario = withHistory(([day, next]) => [
      {
        date: day!,
        bars: withBars(flatBars(99), [
          bar('10:05', 99, 99, 97, 97),
          bar('10:06', 97, 97.2, 97, 97.1),
          bar('10:30', 99, 99.5, 99, 99.2),
          bar('11:00', 98, 98, 97, 97.3),
          bar('12:00', 96, 96, 96, 96)
        ]),
        closingPrint: 99
      },
      { date: next!, bars: flatBars(99), closingPrint: 99 }
    ]);
    const minute = run(scenario, 'FIRST_1000', 'STOP_MINUTE_CAUSAL');
    const [trade] = minute.trades;

    assert.equal(minute.trades.length, 1);
    assert.equal(trade?.isSameSession, true);
    assert.equal(trade?.exitTime, utcOf(trade!.entryDate, '11:00'));
    assert.equal(trade?.exitPrice, 99.5 * 0.979);
    assert.equal(trade?.interest, 0);
    assert.equal(trade?.profit, trade!.shares * trade!.exitPrice - 100000);
    // 5 bp per side on the entry notional and on the exit proceeds.
    assert.equal(trade?.net[1], trade!.profit - 0.0005 * 100000 - 0.0005 * trade!.shares * trade!.exitPrice);

    const daily = run(scenario, 'FIRST_1000', 'STOP_DAILY');

    assert.equal(daily.trades[0]?.isSameSession, false);
    assert.equal(daily.trades[0]?.exitReason, 'open');
  });

  it("sets an intraday entry's daily stop from post-fill prices only", () => {
    const scenario = withHistory(([day]) => [
      {
        date: day!,
        bars: withBars(flatBars(98), [
          bar('09:40', 98, 100, 98, 98),
          bar('10:05', 98, 98, 97, 97),
          bar('10:06', 97, 97.1, 96.9, 97),
          bar('11:00', 98, 98.5, 98, 98)
        ]),
        closingPrint: 98.2
      }
    ]);
    const result = run(scenario, 'FIRST_1000');

    assert.equal(result.trades[0]?.entryPrice, 97);
    assert.equal(result.daily.at(-1)?.signature, `${scenario.tradeStart}:97:${98.5 * 0.979}|-`);
  });

  it('exits a losing position at the maximum hold after exactly 8 calendar days', () => {
    const scenario = withHistory((dates) =>
      dates.slice(0, 8).map((date) => ({ date, bars: flatBars(97), closingPrint: 97 }))
    );
    const result = run(scenario, 'CLOSE_1M');
    const [first] = result.trades;

    assert.equal(first?.entryDate, '2017-03-08');
    assert.equal(first?.exitDate, '2017-03-16');
    assert.equal(first?.exitReason, 'maximum hold');
    assert.equal(first?.exitTime, utcOf('2017-03-16', '09:31'));
    assert.equal(first?.interest, 100000 * 0.11 * ((8 * 86400) / (365 * 86400)));
  });

  it('restricts after a material loss and re-enters only 4% below the loss exit', () => {
    const prices = [97, 96, 95, 95, 94, 94, 94, 92, 90];
    const scenario = withHistory((dates) =>
      prices.map((price, k) => ({ date: dates[k]!, bars: flatBars(price), closingPrint: price }))
    );
    const result = run(scenario, 'CLOSE_1M');

    assert.equal(result.trades[0]?.exitDate, '2017-03-16');
    assert.equal(result.trades[0]?.createdRestriction, true);
    assert.equal(result.episodes[0]?.lossExitPrice, 94);
    assert.ok(result.stateLog.some((row) => row.date === '2017-03-17' && row.reason === 'entry_blocked'));
    assert.equal(result.trades[1]?.entryDate, '2017-03-20');
    assert.equal(result.trades[1]?.isLowerPriceReentry, true);
    assert.equal(result.episodes[0]?.resolution, 'lower_price_reentry');
  });

  it('treats fees as accounting only: paths are identical at every cost level, and 0 bp equals the incumbent mark', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'intraday-fixture-'));
    const fixture = await writeMinuteFixture(dir, { seed: 5, start: '2019-01-02', sessions: 260 });
    const { sessions } = await loadStudyData(fixture.file);
    const recentHighs = computeRecentHighs(sessions);
    const base = { sessions, recentHighs, tradeStart: 80, endIndex: sessions.length - 1, stopFill: 'stop' as const };

    for (const id of ['FIRST_0935', 'STABLE_15', 'BAND_STABILIZE']) {
      const policy = policyById(id);
      const zero = simulate({ ...base, policy, stopMode: 'STOP_MINUTE_CAUSAL', costsBps: [0] });
      const all = simulate({ ...base, policy, stopMode: 'STOP_MINUTE_CAUSAL' });
      const again = simulate({ ...base, policy, stopMode: 'STOP_MINUTE_CAUSAL' });

      assert.deepEqual(
        zero.trades.map((trade) => [trade.entryTime, trade.exitTime, trade.exitPrice]),
        all.trades.map((trade) => [trade.entryTime, trade.exitTime, trade.exitPrice])
      );
      assert.deepEqual(
        all.daily.map((row) => row.equity[0]),
        all.daily.map((row) => row.mtmProfit)
      );
      assert.equal(JSON.stringify(all.trades), JSON.stringify(again.trades), 'deterministic');
      assert.equal(JSON.stringify(all.daily), JSON.stringify(again.daily), 'deterministic');

      for (const trade of all.trades) {
        const proceeds = trade.shares * trade.exitPrice;

        assert.ok(Math.abs(trade.net[3]! - (trade.profit - 0.002 * 100000 - 0.002 * proceeds)) < 1e-9);
      }
    }

    await fs.remove(dir);
  });
});
