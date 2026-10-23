import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ReferenceLowCache, simulate } from '../../d1-refinement/engine.ts';
import { ReferenceHighCache } from '../../four-family/data.ts';
import { auditLedger } from '../audit.ts';
import { type ScenarioConfig, defaultConfig, runScenario } from '../engine.ts';
import { buildData, flat, takeoverPath, testParams } from './fixtures.ts';

const base = (
  overrides: Partial<ScenarioConfig> & Pick<ScenarioConfig, 'key' | 'strategies' | 'policy'>
): ScenarioConfig => defaultConfig({ label: overrides.key, eligibilityIndex: 12, params: testParams, ...overrides });

describe('shared-margin engine on synthetic sessions', () => {
  it('swing-low enters first and D1 signals while it holds; first-signal-wins declines D1 and keeps its setup armed', () => {
    const data = buildData(takeoverPath());
    const result = runScenario(data, base({ key: 'p2', strategies: ['d1', 'swing'], policy: 'firstWins' }));
    const swingLot = result.lots[0]!;

    assert.equal(swingLot.owner, 'swing');
    assert.equal(swingLot.entryIndex, 20);
    assert.equal(swingLot.entryBar, 5);
    assert.equal(swingLot.entryPrice, 98.5);

    const declined = result.signals.filter((signal) => signal.strategy === 'd1' && signal.outcome === 'declined');

    assert.ok(declined.length >= 1, 'D1 was declined at least once');
    assert.equal(declined[0]!.index, 21);
    assert.equal(declined[0]!.barIndex, 5);
    assert.equal(declined[0]!.otherLotOwner, 'swing');
    assert.ok(declined[0]!.otherLotProfit < 0, 'the swing lot was in loss at the decision');

    // The swing lot exits on its maximum hold (10 days, session 30) at a loss; D1's setup is still armed and fills at
    // the first qualifying minute afterwards.
    assert.equal(swingLot.exitReason, 'maximum hold');
    assert.equal(swingLot.exitIndex, 30);
    assert.ok(swingLot.netProfit < 0);

    const d1Lot = result.lots.find((lot) => lot.owner === 'd1');

    assert.ok(d1Lot, 'D1 entered once capital was free');
    assert.equal(d1Lot!.entryIndex, 30); // the same session: swing's maximum hold sells at bar 1, D1 fills at bar 2
    assert.ok(d1Lot!.entryBar > swingLot.exitBar);
    assert.ok(result.machines[0]!.setupLog[0]!.declinedSignals > 1, 'the held setup was re-tested on later minutes');
    assert.equal(auditLedger(data, result).failures.length, 0);
  });

  it('cancel semantics drop the refused setup instead of holding it', () => {
    const data = buildData(takeoverPath());
    const result = runScenario(
      data,
      base({ key: 'p2c', strategies: ['d1', 'swing'], policy: 'firstWins', semantics: 'cancel' })
    );
    const setups = result.machines[0]!.setupLog;

    assert.equal(setups[0]!.status, 'cancelled');
    assert.equal(
      result.signals.filter((signal) => signal.strategy === 'd1' && signal.outcome === 'declined').length,
      1
    );
    // No fresh 10% dip from the rolling high occurs later on the flat path, so D1 never trades.
    assert.equal(result.lots.filter((lot) => lot.owner === 'd1').length, 0);
  });

  it('T1 takeover transfers the swing lot to D1 without new principal and keeps the observed high and hold clock', () => {
    const data = buildData(takeoverPath());
    const result = runScenario(
      data,
      base({ key: 't1', strategies: ['d1', 'swing'], policy: 'takeover', transfer: 'T1', holdClock: 'original' })
    );

    assert.equal(result.lots.length, 1);

    const lot = result.lots[0]!;

    assert.equal(lot.originalOwner, 'swing');
    assert.equal(lot.owner, 'd1');
    assert.ok(lot.takeover);
    assert.equal(lot.takeover!.index, 21);
    assert.equal(lot.takeover!.barIndex, 5);
    assert.equal(lot.takeover!.transfer, 'T1');
    assert.equal(lot.takeover!.highBefore, 99); // swing's observed high: session 20's later bars and close
    assert.equal(lot.principal, 0.2 * lot.equityAtDecision);
    assert.equal(result.events.filter((event) => event.kind === 'entry').length, 1);
    assert.equal(result.events.filter((event) => event.kind === 'takeover').length, 1);
    // D1's maximum hold (3 calendar days from the swing entry on day 20) is due on session 23: the open (92) is below
    // the 98.5 cost, so the lot sells at the next trade.
    assert.equal(lot.exitReason, 'maximum hold');
    assert.equal(lot.exitIndex, 23);
    assert.equal(lot.exitPrice, 92);
    // The swing machine is flat afterwards and could re-arm; D1's setup was consumed by the takeover.
    assert.equal(result.machines[0]!.setupLog[0]!.status, 'taken over');
    assert.equal(auditLedger(data, result).failures.length, 0);
  });

  it('T2 resets the exit reference at the transfer trade; T2b also restarts the hold clock', () => {
    const data = buildData(takeoverPath());
    const t2a = runScenario(
      data,
      base({ key: 't2a', strategies: ['d1', 'swing'], policy: 'takeover', transfer: 'T2', holdClock: 'original' })
    );
    const t2b = runScenario(
      data,
      base({ key: 't2b', strategies: ['d1', 'swing'], policy: 'takeover', transfer: 'T2', holdClock: 'takeover' })
    );
    const a = t2a.lots[0]!;
    const b = t2b.lots[0]!;

    // The reference high resets to the transfer trade (bar 6 open 89.5) and the session close 90.5: stop 90.5 × 0.95.
    assert.ok(Math.abs(a.takeover!.stopAfter - 90.5 * 0.95) < 1e-9);
    assert.equal(a.takeover!.highBefore, 99);
    assert.equal(a.exitIndex, 23); // hold clock from the swing entry (day 20)
    assert.equal(b.exitIndex, 24); // hold clock restarted at the takeover (day 21)
    assert.equal(b.entryTimestamp, a.entryTimestamp); // the loan age is unchanged
    assert.ok(Math.abs(a.interest - b.interest) < 1e-9 || b.interest > a.interest); // one more day of interest for b
  });

  it('a same-bar tie goes to D1 (slot order) and the swing signal is declined', () => {
    const data = buildData([
      ...Array.from({ length: 20 }, () => flat(100)),
      { closes: [89, 88, 88.5, 88.6] },
      flat(89),
      flat(89)
    ]);
    const result = runScenario(data, base({ key: 'tie', strategies: ['d1', 'swing'], policy: 'firstWins' }));

    assert.equal(result.lots.length, 1);
    assert.equal(result.lots[0]!.owner, 'd1');
    assert.equal(result.lots[0]!.entryBar, 3);

    const swingSignal = result.signals.find((signal) => signal.strategy === 'swing');

    assert.ok(swingSignal);
    assert.equal(swingSignal!.outcome, 'declined');
    assert.equal(swingSignal!.barIndex, 2);
    assert.equal(result.signals.find((signal) => signal.strategy === 'd1')!.barIndex, 2);
  });

  it('a session that opens below an active stop sells at the opening trade, not at the stop level', () => {
    const data = buildData([
      ...Array.from({ length: 20 }, () => flat(100)),
      { closes: [89, 88, 88.5, 88.6] },
      flat(95),
      flat(100),
      flat(105),
      flat(95),
      flat(95)
    ]);
    const result = runScenario(data, base({ key: 'gap', strategies: ['d1'], policy: 'single' }));
    const lot = result.lots[0]!;

    assert.equal(lot.entryPrice, 88.5);
    assert.equal(lot.exitReason, 'trailing stop gap');
    assert.equal(lot.exitIndex, 24);
    assert.equal(lot.exitPrice, 95);
    assert.equal(lot.exitExecution, 'opening trade');
    assert.ok(lot.exitStopPrice > 95);
    // The profit was reinvested 60/40 at the next trades.
    const reinvest = result.events.filter((event) => event.kind === 'reinvest');

    assert.equal(reinvest.length, 2);
    assert.ok(Math.abs(reinvest.find((event) => event.etf === 'VOOG')!.cashDelta + 0.6 * lot.netProfit) < 1e-6);
    assert.ok(Math.abs(reinvest.find((event) => event.etf === 'VGT')!.cashDelta + 0.4 * lot.netProfit) < 1e-6);
    assert.ok(Math.abs(result.daily.at(-1)!.cash) < 1e-6);
    assert.equal(auditLedger(data, result).failures.length, 0);
  });

  it('a loss is funded by proportional core sales and cash never goes negative', () => {
    const data = buildData([
      ...Array.from({ length: 20 }, () => flat(100)),
      { closes: [89, 88, 88.5, 88.6] },
      flat(84),
      flat(83),
      flat(82),
      flat(82),
      flat(82)
    ]);
    const result = runScenario(data, base({ key: 'loss', strategies: ['d1'], policy: 'single' }));
    const lot = result.lots[0]!;

    assert.equal(lot.exitReason, 'maximum hold');
    assert.ok(lot.netProfit < 0);

    const funding = result.events.filter((event) => event.kind === 'fund loss');

    assert.equal(funding.length, 2);
    assert.ok(funding.every((event) => event.shares < 0));

    const sold = funding.reduce((total, event) => total - event.shares * event.price, 0);

    assert.ok(Math.abs(sold + lot.netProfit) < 1e-6, 'the sales cover the shortfall exactly');
    assert.equal(result.daily.at(-1)!.fundingPayable, 0);
    assert.ok(result.events.every((event) => event.cash >= -1e-9));
    assert.ok(result.daily.at(-1)!.coreTurnover > 0);
    assert.equal(auditLedger(data, result).failures.length, 0);
  });

  it('a maintenance breach forces a sale at the next open: the lot first, then core, and the strategy is flat', () => {
    const data = buildData([
      ...Array.from({ length: 20 }, () => flat(100)),
      { closes: [89, 88, 88.5, 88.6] },
      flat(89),
      flat(89),
      flat(89)
    ]);
    const result = runScenario(data, base({ key: 'maint', strategies: ['d1'], policy: 'single', maintenance: 0.95 }));
    const lot = result.lots[0]!;

    assert.equal(lot.exitReason, 'forced liquidation');
    assert.equal(lot.exitIndex, 21);
    assert.equal(lot.exitBar, 0);
    assert.equal(result.forcedSales.length, 1);
    assert.equal(result.forcedSales[0]!.lotsSold, 1);
    assert.ok(result.forcedSales[0]!.equityToLmvBefore < 0.95);
    assert.ok(result.daily[21]!.equityToLmv >= 0.95);
    assert.equal(result.machines[0]!.continuationWindows, 0); // a forced exit opens no continuation window
    assert.equal(auditLedger(data, result).failures.length, 0);
  });

  it('ex-date entitlements are booked on the shares held at the previous close and paid into core at the pay date', () => {
    const data = buildData(
      Array.from({ length: 12 }, () => flat(100)),
      [
        {
          etf: 'VGT',
          exDate: '2018-01-06',
          payDate: '2018-01-08',
          amount: 0.5,
          amountMethod: 'test',
          exDateMethod: 'test',
          payDateMethod: 'test',
          closeBefore: 100
        }
      ]
    );
    const result = runScenario(data, base({ key: 'div', strategies: [], policy: 'single' }));
    const exDate = result.events.find((event) => event.kind === 'ex-date')!;
    const paid = result.events.find((event) => event.kind === 'dividend paid')!;
    const before = result.events[result.events.indexOf(exDate) - 1]!;

    assert.equal(exDate.date, '2018-01-06');
    assert.ok(Math.abs(exDate.receivables - 0.5 * result.daily[4]!.vgtCoreShares) < 1e-9);
    assert.ok(
      Math.abs(exDate.equity - before.equity - exDate.receivables) < 1e-6,
      'the receivable is new equity (the price is raw)'
    );
    assert.equal(paid.date, '2018-01-08');
    assert.ok(paid.shares > 0);
    assert.equal(paid.receivables, 0);
    assert.ok(Math.abs(result.daily.at(-1)!.cumulativeDividends - exDate.receivables) < 1e-9);
    assert.equal(auditLedger(data, result).failures.length, 0);
  });

  it('a decision on the last minute fills at the closing print when there is one', () => {
    const data = buildData([
      ...Array.from({ length: 20 }, () => flat(100)),
      { closes: [89, 88, 88.5] },
      flat(91),
      flat(91)
    ]);
    const result = runScenario(data, base({ key: 'print', strategies: ['d1'], policy: 'single' }));
    const lot = result.lots[0]!;

    assert.equal(lot.entryIndex, 20);
    assert.equal(lot.entryBar, 3); // the bar count: the closing print
    assert.equal(lot.entryExecution, 'closing print');
    assert.equal(lot.entryPrice, 88.5);
  });

  it('a decision on the last minute is carried to the next opening trade without a closing print; an open lot at the end is marked, not realized', () => {
    const data = buildData([
      ...Array.from({ length: 20 }, () => flat(100)),
      { closes: [89, 88, 88.5], closingPrint: false },
      flat(91),
      flat(91)
    ]);
    const result = runScenario(data, base({ key: 'carry', strategies: ['d1'], policy: 'single' }));
    const lot = result.lots[0]!;

    assert.equal(lot.entryIndex, 21);
    assert.equal(lot.entryBar, 0);
    assert.equal(lot.entryExecution, 'opening trade');
    assert.equal(lot.entryPrice, 91);
    assert.equal(lot.exitIndex, -1);
    assert.equal(lot.exitReason, 'open');
    assert.ok(Math.abs(lot.netProfit - (lot.shares * 91 - lot.principal - lot.interest)) < 1e-9);
    assert.equal(result.events.filter((event) => event.kind === 'reinvest').length, 0);
    assert.equal(result.daily.at(-1)!.realizedStrategyProfit, 0);
    assert.equal(result.daily.at(-1)!.openLots, 1);
  });

  it('an entry that would breach Reg T initial margin is declined', () => {
    const data = buildData([
      ...Array.from({ length: 20 }, () => flat(100)),
      { closes: [89, 88, 88.5, 88.6] },
      flat(89)
    ]);
    const result = runScenario(data, base({ key: 'regt', strategies: ['d1'], policy: 'single', allocation: 1.5 }));

    assert.equal(result.lots.length, 0);
    assert.equal(result.regTBreaches >= 1, true);
    assert.equal(result.signals[0]!.outcome, 'reg-t');
  });

  it('dedicated split and dynamic sharing size the lots as declared and never exceed the cap', () => {
    const data = buildData(takeoverPath());
    const split = runScenario(data, base({ key: 'split', strategies: ['d1', 'swing'], policy: 'split' }));
    const dynamic = runScenario(data, base({ key: 'dyn', strategies: ['d1', 'swing'], policy: 'dynamic' }));

    assert.equal(split.lots.length, 2);
    assert.ok(split.lots.every((lot) => Math.abs(lot.fraction - 0.1) < 1e-9));
    assert.ok(split.daily.some((row) => row.openLots === 2));
    assert.equal(dynamic.lots[0]!.owner, 'swing');
    assert.ok(Math.abs(dynamic.lots[0]!.fraction - 0.2) < 1e-9, 'the first entrant takes the whole allowance');
    assert.equal(
      dynamic.signals.filter((signal) => signal.strategy === 'd1' && signal.outcome === 'declined').length > 0,
      true
    );
    assert.equal(auditLedger(data, split).failures.length, 0);
  });

  it('standalone runs reproduce the D1-refinement engine on synthetic data', () => {
    const data = buildData(takeoverPath());
    const { ds } = data;

    for (const key of ['d1', 'swing'] as const) {
      const result = runScenario(
        data,
        base({ key, strategies: [key], policy: 'single', fixedPrincipal: 100000, corePolicy: 'none' })
      );
      const p = testParams[key];
      const params = {
        targetPercentChange: p.targetPercentChange,
        trailingBuyPercentage: p.trailingBuyPercentage,
        trailingStopPercentage: p.trailingStopPercentage,
        maximumHoldDays: p.maximumHoldDays,
        tickWindowSize: p.tickWindowSize,
        intradayLossBuffer: p.intradayLossBuffer,
        pullback: p.pullback,
        continuationWindow: p.continuationWindow,
        activationGain: NaN,
        earlyStop: NaN,
        alwaysRebound: NaN,
        swingLookback: p.swingLookback,
        swingRebound: p.trailingBuyPercentage,
        swingProximity: p.swingProximity
      };
      const engine = simulate(
        ds,
        new ReferenceHighCache(ds).get(p.tickWindowSize),
        key === 'swing' ? new ReferenceLowCache(ds).get(p.swingLookback) : undefined,
        { entryMode: key === 'swing' ? 'swing' : 'deep', postExit: key !== 'swing', stopPolicy: 'net' },
        params,
        {
          stopFill: 'stop',
          marginInterestRate: 0.11,
          investment: 100000,
          firstIndex: 0,
          armStart: 12,
          endIndex: ds.sessionCount - 1
        }
      );

      assert.equal(result.lots.length, engine.trades.length, `${key}: trade count`);

      result.lots.forEach((lot, index) => {
        const trade = engine.trades[index]!;

        assert.equal(lot.entryIndex, trade.entryIndex);
        assert.equal(lot.entryBar, trade.entryBar);
        assert.equal(lot.entryPrice, trade.entryPrice);
        assert.equal(lot.exitIndex, trade.exitIndex);

        if (lot.exitIndex >= 0) {
          assert.equal(lot.exitBar, trade.exitBar);
          assert.equal(lot.exitPrice, trade.exitPrice);
          assert.equal(lot.exitReason, trade.reason);
        }
      });
    }
  });
});
