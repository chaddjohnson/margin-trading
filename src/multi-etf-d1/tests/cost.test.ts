// The optional per-side cost of the engine: off (undefined or 0) it is bit-identical to the files' behaviour; on,
// a buy fills at the observed price x (1 + c), a sale at x (1 - c), the shares follow the effective entry, and the
// stop eligibility counts the sale's cost (a stop that is barely profitable without costs is inactive with them).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { fixtureDataset } from '../../four-family/data.ts';
import { ReferenceHighCache } from '../../four-family/data.ts';
import { type SessionSpec, bar, buildSessions, weekdays } from '../../four-family/tests/fixtures.ts';
import { randomScenario } from '../../four-family/tests/fixtures.ts';
import { type Params, type RunSettings, simulate } from '../../d1-refinement/engine.ts';
import { replay } from '../../trailing-buy-variants/accounting.ts';
import { Rng } from '../../optimizer/rng.ts';

const architecture = { entryMode: 'deep' as const, postExit: true, stopPolicy: 'net' as const };

const params = (overrides: Partial<Params> = {}): Params => ({
  targetPercentChange: 0.2,
  trailingBuyPercentage: 0.01,
  trailingStopPercentage: 0.1,
  maximumHoldDays: 8,
  tickWindowSize: 5,
  intradayLossBuffer: 0.05,
  pullback: 0.05,
  continuationWindow: 10,
  activationGain: NaN,
  earlyStop: NaN,
  alwaysRebound: NaN,
  swingLookback: NaN,
  swingRebound: NaN,
  swingProximity: NaN,
  ...overrides
});

const settings = (ds: { sessionCount: number }, costPerSide?: number): RunSettings => ({
  stopFill: 'stop',
  marginInterestRate: 0.11,
  investment: 100000,
  firstIndex: 0,
  armStart: 6,
  endIndex: ds.sessionCount - 1,
  costPerSide
});

describe('per-side cost', () => {
  test('undefined and 0 give identical trades and accounting on random scenarios', () => {
    const rng = Rng.from('multi-etf-d1', 'cost-test');

    for (let index = 0; index < 20; index++) {
      const ds = fixtureDataset(randomScenario(`multi-etf-d1-cost-${index}`, 80 + rng.int(60)));
      const highs = new ReferenceHighCache(ds).get(5);
      const p = params({
        targetPercentChange: 0.05 + rng.next() * 0.1,
        trailingStopPercentage: 0.03 + rng.next() * 0.1
      });
      const a = simulate(ds, highs, undefined, architecture, p, settings(ds));
      const b = simulate(ds, highs, undefined, architecture, p, { ...settings(ds), costPerSide: 0 });

      assert.deepEqual(JSON.stringify(a.trades), JSON.stringify(b.trades));
      assert.deepEqual(a.counts, b.counts);

      const ra = replay(ds, a.trades, { firstIndex: 0, endIndex: ds.sessionCount - 1, marginInterestRate: 0.11 });
      const rb = replay(ds, b.trades, { firstIndex: 0, endIndex: ds.sessionCount - 1, marginInterestRate: 0.11 });

      assert.equal(ra.netProfit, rb.netProfit);
      assert.equal(ra.minuteDrawdown.maximum, rb.minuteDrawdown.maximum);

      for (const trade of a.trades) {
        assert.equal(trade.entryPrice, trade.entryPriceObserved);

        if (trade.exitIndex >= 0) {
          assert.equal(trade.exitPrice, trade.exitPriceObserved);
        }
      }
    }
  });

  // A hand-built path: a 25% fall, a rebound, a rise that makes the stop marginally profitable, then a fall through it.
  const flat = (date: string, price: number): SessionSpec => ({
    date,
    bars: [0, 60, 120, 180, 240, 300, 389].map((minute) => bar(minute, price)),
    closingPrint: price
  });
  const dates = weekdays('2018-01-02', 30);
  const scenario = () => {
    const specs: SessionSpec[] = [];
    let index = 0;

    for (; index < 6; index++) {
      specs.push(flat(dates[index]!, 100));
    }

    // Session 6: falls to 75 (arms: 25% below the 100 high), closes at 75.
    specs.push({
      date: dates[index++]!,
      bars: [bar(0, 100, 75), bar(60, 75), bar(120, 75), bar(389, 75)],
      closingPrint: 75
    });
    // Session 7: rebounds 1% at the second minute (buy decision), fills at the next minute's open of 76.
    specs.push({
      date: dates[index++]!,
      bars: [bar(0, 75), bar(1, 75, 75.8), bar(2, 76), bar(60, 76), bar(389, 76)],
      closingPrint: 76
    });
    // Sessions 8-12: rises to 86 and stays: the stop (10% below 86 = 77.4) nets about +$1,800 without costs.
    for (const price of [80, 84, 86, 86, 86]) {
      specs.push(flat(dates[index++]!, price));
    }
    // Session 13: opens at 86, trades down through 77.4 within the session, closes at 77.
    specs.push({
      date: dates[index++]!,
      bars: [bar(0, 86), bar(60, 86, 77), bar(120, 77), bar(389, 77)],
      closingPrint: 77
    });

    for (; index < dates.length; index++) {
      specs.push(flat(dates[index]!, 77));
    }

    return fixtureDataset(buildSessions(specs));
  };

  test('with a cost the fills are worse, the shares fewer and the sale cost counted in the stop test', () => {
    const ds = scenario();
    const highs = new ReferenceHighCache(ds).get(5);
    const p = params();
    const free = simulate(ds, highs, undefined, architecture, p, settings(ds));
    const cost = 0.001;
    const costly = simulate(ds, highs, undefined, architecture, p, settings(ds, cost));

    assert.equal(free.trades.length, 1);
    assert.equal(costly.trades.length, 1);

    const a = free.trades[0]!;
    const b = costly.trades[0]!;

    assert.equal(a.entryPriceObserved, 76);
    assert.equal(b.entryPriceObserved, 76);
    assert.equal(b.entryPrice, 76 * (1 + cost));
    assert.equal(b.shares, 100000 / (76 * (1 + cost)));
    assert.ok(b.shares < a.shares);
    assert.equal(a.reason, 'trailing stop');
    assert.equal(a.exitPrice, a.exitPriceObserved);

    if (b.exitIndex >= 0) {
      assert.equal(b.exitPrice, b.exitPriceObserved * (1 - cost));
    }

    // The stop at 77.4 nets +$1,800 without costs; with 10 bps per side the sale nets about +$1,500: still active,
    // so both exit at the stop and the costly trade earns less.
    const freeOutcome = replay(ds, free.trades, {
      firstIndex: 0,
      endIndex: ds.sessionCount - 1,
      marginInterestRate: 0.11
    });
    const costlyOutcome = replay(ds, costly.trades, {
      firstIndex: 0,
      endIndex: ds.sessionCount - 1,
      marginInterestRate: 0.11
    });

    assert.ok(costlyOutcome.netProfit < freeOutcome.netProfit);
    assert.ok(
      Math.abs(
        freeOutcome.netProfit - costlyOutcome.netProfit - 100000 * cost - (100000 / (76 * (1 + cost))) * 77.4 * cost
      ) < 50,
      'the difference is about two sides of cost'
    );
  });

  test('a cost large enough makes a barely profitable stop inactive', () => {
    const ds = scenario();
    const highs = new ReferenceHighCache(ds).get(5);
    const p = params();
    const free = simulate(ds, highs, undefined, architecture, p, settings(ds));
    // 1% per side: the sale at 77.4 would net 100000/76.76 x 77.4 x 0.99 - 100000 - interest < 0 -> inactive.
    const costly = simulate(ds, highs, undefined, architecture, p, settings(ds, 0.01));

    assert.equal(free.trades[0]!.reason, 'trailing stop');
    assert.notEqual(costly.trades[0]!.reason, 'trailing stop');
  });
});
