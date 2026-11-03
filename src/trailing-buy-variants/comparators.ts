// The immediate-entry allIn.ts comparator on matched dates: allIn.ts's own code through its four-family
// injectable copy (session list, margin rate and arming start injected; its constants unchanged), attributed
// with this program's accounting. The Trades2 comparator needs nothing special: it is family 4 at the file's
// constants through the engine.
import type { MarketSession } from '#types';
import { generateCopy } from '../four-family/copies.ts';
import type { Dataset } from '../four-family/data.ts';
import { runSource } from '../four-family/sourceRun.ts';
import { replay } from './accounting.ts';
import type { Trade } from './engine.ts';
import { type EvalSpec, type Metrics, investmentAmount, summarize } from './evaluate.ts';

let copied = false;

export const runAllInComparator = async (ds: Dataset, sessions: MarketSession[], spec: EvalSpec) => {
  if (!copied) {
    await generateCopy('allIn');
    copied = true;
  }

  const indexByDate = new Map(ds.dates.map((date, index) => [date, index]));
  const source = await runSource({
    key: 'allIn',
    copy: true,
    endDate: ds.dates[spec.endIndex]!,
    stopFill: spec.stopFill,
    injected: {
      sessions: sessions.slice(0, spec.endIndex + 1),
      marginInterestRate: spec.marginInterestRate,
      armStart: spec.armStart
    }
  });
  const trades: Trade[] = source.trades.map((trade) => {
    const entryIndex = indexByDate.get(trade.entryDate)!;
    const exitDate =
      trade.exitTimestamp === undefined ? '' : new Date(trade.exitTimestamp * 1000).toISOString().slice(0, 10);
    const exitIndex = trade.isOpen ? -1 : indexByDate.get(exitDate)!;

    if (trade.investment !== investmentAmount) {
      throw new Error(`Unexpected allIn investment ${trade.investment}`);
    }

    return {
      setupId: 0,
      entryIndex,
      entryBar: trade.entryBar,
      entryTime: trade.entryTime,
      entryPrice: trade.entryPrice,
      entryExecution: trade.entryExecution as Trade['entryExecution'],
      entryTimestamp: trade.entryTimestamp,
      decisionTime: trade.decisionTime,
      decisionPrice: trade.decisionPrice,
      signalIndex: entryIndex,
      activationIndex: entryIndex,
      activationTime: NaN,
      activationPrice: NaN,
      referenceHigh: trade.referenceHigh ?? NaN,
      trailingLow: NaN,
      reboundTrigger: NaN,
      investment: trade.investment,
      shares: trade.shares,
      legs: [
        {
          entryIndex,
          entryBar: trade.entryBar,
          entryTime: trade.entryTime,
          entryPrice: trade.entryPrice,
          entryTimestamp: trade.entryTimestamp,
          entryExecution: trade.entryExecution as Trade['entryExecution'],
          decisionTime: trade.decisionTime,
          decisionPrice: trade.decisionPrice,
          investment: trade.investment,
          shares: trade.shares
        }
      ],
      exitIndex,
      exitBar: trade.exitBar ?? -1,
      exitTime: trade.exitTime ?? NaN,
      exitPrice: trade.exitPrice ?? NaN,
      exitExecution: (trade.exitExecution ?? '') as Trade['exitExecution'],
      reason: trade.reason as Trade['reason'],
      exitStopPrice: trade.exitStopPrice ?? NaN,
      maximumHoldDue: trade.maximumHoldDue ?? false,
      bufferSignalTime: NaN,
      bufferSignalPrice: NaN,
      restrictedAtActivation: false,
      invalidationLevel: NaN,
      effectiveHoldAtExit: NaN,
      addPendingAtEnd: false
    };
  });
  const accounting = replay(ds, trades, {
    firstIndex: 0,
    endIndex: spec.endIndex,
    marginInterestRate: spec.marginInterestRate,
    segments: spec.segments,
    dailyMarks: true
  });
  const summary = source.summary as Record<string, number>;

  for (const [label, ours, theirs] of [
    ['net profit', accounting.netProfit, summary.netProfit],
    ['daily drawdown', accounting.dailyDrawdown.maximum, summary.maximumDrawdown],
    ['minute drawdown', accounting.minuteDrawdown.maximum, summary.minuteMaximumDrawdown]
  ] as const) {
    if (!(Math.abs(ours - theirs!) <= 1e-6)) {
      throw new Error(`allIn comparator accounting mismatch on ${label}: ${ours} vs ${theirs}`);
    }
  }

  const counts = {
    setupActivations: 0,
    setupFills: trades.length,
    setupCancellations: 0,
    armedAtEnd: 0,
    pendingAtEnd: 0,
    reboundSignals: 0,
    overnightOrders: 0,
    suppressedReboundSignals: 0,
    entriesWithoutTrade: 0,
    restrictions: 0,
    lowerPriceReentries: 0,
    recoveryResets: 0,
    lossesNotRestricted: 0,
    losingExits: 0,
    bufferedLossExits: 0,
    pendingBufferedExitAtEnd: false,
    invalidationExits: 0,
    episodesStarted: 0,
    episodesExhausted: 0,
    episodeResets: 0,
    sessionsBlockedByBudget: 0,
    adds: 0,
    addsCancelled: 0,
    pendingAddAtEnd: false,
    extendedHoldSessions: 0,
    persistenceResets: 0
  };
  const metrics: Metrics = summarize(ds, trades, accounting, counts);

  return { metrics, trades, accounting };
};
