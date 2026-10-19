// Parity between the fast engine (+ accounting) and the strategy files:
// 1. the unmodified originals at their exact defaults (and at the matched Y), several date ranges, both stop
//    fills, all four families;
// 2. the generated injectable copies with nothing injected, against the originals;
// 3. the copies at random lattice vectors (golden master), random margin rates and both stop fills, with the
//    source's own warmup and with the common eligibility start.
// Every trade field is compared exactly (prices, times, minute indices, execution labels, reasons, the setup
// fields); profits, interest, net profit, both drawdowns and every daily mark to 1e-6 dollars.
import type { MarketSession } from '#types';
import { replay } from './accounting.ts';
import type { SourceKey } from './copies.ts';
import { type Dataset, computeReferenceHighs, firstIndexOnOrAfter, lastIndexOnOrBefore } from './data.ts';
import { type RunSettings, type StopFill, type StrategyParams, type Trade, simulate } from './engine.ts';
import { type Family, families, familyKeys } from './families.ts';
import { type SourceRunOptions, type SourceRunResult, runSource } from './sourceRun.ts';

export const tolerance = 1e-6;

export interface ParityCase {
  name: string;
  family: Family;
  copy: boolean;
  startDate?: string;
  endDate: string;
  stopFill: StopFill;
  params: StrategyParams; // what the engine uses; the source gets the same through options and injection
  injectAll: boolean; // copies only: inject every constant (otherwise only what the original accepts)
  armStart?: number; // copies only: the common eligibility start, as a relative session index
  marginInterestRate: number;
  omitOverrides?: boolean; // run the source with no X, Y or buffer option at all (its own defaults)
}

export interface ParityOutcome {
  name: string;
  family: string;
  ok: boolean;
  trades: number;
  sourceNet: number;
  engineNet: number;
  sourceMinuteDrawdown: number;
  engineMinuteDrawdown: number;
  sourceDailyDrawdown: number;
  engineDailyDrawdown: number;
  maxProfitDifference: number;
  maxMarkDifference: number;
  mismatches: string[];
}

const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

const same = (a: unknown, b: unknown) =>
  (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) || a === b;

export const engineRun = (ds: Dataset, parityCase: ParityCase) => {
  const firstIndex = parityCase.startDate ? firstIndexOnOrAfter(ds, parityCase.startDate) : 0;
  const endIndex = lastIndexOnOrBefore(ds, parityCase.endDate);
  const { params } = parityCase;
  const settings: RunSettings = {
    stopFill: parityCase.stopFill,
    marginInterestRate: parityCase.marginInterestRate,
    investment: 100000,
    firstIndex,
    armStart: firstIndex + Math.max(params.tickWindowSize, parityCase.armStart ?? 0),
    endIndex
  };
  const highs = computeReferenceHighs(ds, params.tickWindowSize, firstIndex);
  const result = simulate(ds, highs, parityCase.family.flags, params, settings, true);
  const accounting = replay(ds, result.trades, {
    firstIndex,
    endIndex,
    marginInterestRate: settings.marginInterestRate,
    dailyMarks: true
  });

  return { result, accounting, firstIndex, endIndex };
};

export const sourceOptions = (parityCase: ParityCase, sessions?: MarketSession[]): SourceRunOptions => {
  const { params, family } = parityCase;
  const options: SourceRunOptions = {
    key: family.source,
    copy: parityCase.copy,
    startDate: parityCase.startDate,
    endDate: parityCase.endDate,
    stopFill: parityCase.stopFill,
    targetPercentChange: parityCase.omitOverrides ? undefined : params.targetPercentChange,
    trailingBuyPercentage: parityCase.omitOverrides ? undefined : params.trailingBuyPercentage,
    intradayLossBuffer: family.flags.buffered && !parityCase.omitOverrides ? params.intradayLossBuffer : undefined
  };

  if (parityCase.copy) {
    options.injected = { sessions };

    if (parityCase.injectAll) {
      Object.assign(options.injected, {
        tickWindowSize: params.tickWindowSize,
        trailingStopPercentage: params.trailingStopPercentage,
        maximumHoldDays: params.maximumHoldDays,
        marginInterestRate: parityCase.marginInterestRate,
        armStart: parityCase.armStart
      });

      if (family.flags.restricted) {
        Object.assign(options.injected, {
          materialLossThreshold: params.materialLossThreshold,
          lowerPriceReentry: params.lowerPriceReentry,
          retraceFraction: params.retraceFraction
        });
      }
    }
  }

  return options;
};

export const compareWithSource = (ds: Dataset, parityCase: ParityCase, source: SourceRunResult): ParityOutcome => {
  const { result, accounting, firstIndex, endIndex } = engineRun(ds, parityCase);
  const mismatches: string[] = [];
  const check = (label: string, engineValue: unknown, sourceValue: unknown) => {
    if (!same(engineValue, sourceValue)) {
      mismatches.push(`${label}: engine ${String(engineValue)} vs source ${String(sourceValue)}`);
    }
  };
  let maxProfitDifference = 0;
  const near = (label: string, engineValue: number, sourceValue: number) => {
    const difference = Math.abs(engineValue - sourceValue);

    maxProfitDifference = Math.max(maxProfitDifference, difference);

    if (!(difference <= tolerance)) {
      mismatches.push(`${label}: engine ${engineValue} vs source ${sourceValue}`);
    }
  };

  check('trade count', result.trades.length, source.trades.length);

  result.trades.forEach((trade: Trade, index) => {
    const other = source.trades[index];

    if (!other) {
      return;
    }

    const outcome = accounting.outcomes[index]!;
    const label = `trade ${index + 1}`;

    check(`${label} entry date`, ds.dates[trade.entryIndex], other.entryDate);
    check(`${label} entry timestamp`, trade.entryTimestamp, other.entryTimestamp);
    check(`${label} entry price`, trade.entryPrice, other.entryPrice);
    check(`${label} entry time`, trade.entryTime, other.entryTime);
    check(`${label} entry minute`, trade.entryBar, other.entryBar);
    check(`${label} entry execution`, trade.entryExecution, other.entryExecution);
    check(`${label} decision time`, trade.decisionTime, other.decisionTime);
    check(`${label} decision price`, trade.decisionPrice, other.decisionPrice);
    check(`${label} setup`, trade.setupId, other.setupId);
    check(`${label} activation time`, trade.activationTime, other.activationTime);
    check(`${label} activation price`, trade.activationPrice, other.activationPrice);
    check(`${label} reference high`, trade.referenceHigh, other.referenceHigh);
    check(`${label} trailing low`, trade.trailingLow, other.trailingLow);
    check(`${label} rebound trigger`, trade.reboundTrigger, other.reboundTrigger);
    check(`${label} shares`, trade.shares, other.shares);
    check(`${label} investment`, trade.investment, other.investment);
    check(`${label} open`, trade.exitIndex < 0, other.isOpen);
    check(`${label} reason`, trade.reason, other.reason);

    if (trade.exitIndex >= 0 && !other.isOpen) {
      check(`${label} exit date`, ds.dates[trade.exitIndex], formatDate(other.exitTimestamp!));
      check(`${label} exit price`, trade.exitPrice, other.exitPrice);
      check(`${label} exit time`, trade.exitTime, other.exitTime);
      check(`${label} exit minute`, trade.exitBar, other.exitBar);
      check(`${label} exit execution`, trade.exitExecution, other.exitExecution);
      check(`${label} exit stop`, trade.exitStopPrice, other.exitStopPrice);
      check(`${label} maximum hold due`, trade.maximumHoldDue, other.maximumHoldDue);
      check(
        `${label} buffer signal time`,
        Number.isNaN(trade.bufferSignalTime) ? undefined : trade.bufferSignalTime,
        other.bufferSignalTime
      );
      near(`${label} interest`, outcome.interest, other.interest!);
      near(`${label} profit`, outcome.profit, other.profit!);
    }
  });

  const summary = source.summary as Record<string, number | boolean | null | object>;

  near('net profit', accounting.netProfit, summary.netProfit as number);
  near('realized profit', accounting.realizedProfit, summary.realizedProfit as number);
  near('unrealized profit', accounting.unrealizedProfit, summary.unrealizedProfit as number);
  near('margin interest', accounting.closedInterest + accounting.accruedInterest, summary.marginInterest as number);
  near('daily drawdown', accounting.dailyDrawdown.maximum, summary.maximumDrawdown as number);
  near('minute drawdown', accounting.minuteDrawdown.maximum, summary.minuteMaximumDrawdown as number);
  check('daily drawdown peak', formatDate(accounting.dailyDrawdown.peakTime), summary.drawdownPeakDate);
  check('daily drawdown trough', formatDate(accounting.dailyDrawdown.troughTime), summary.drawdownTroughDate);
  check(
    'minute drawdown peak',
    new Date(accounting.minuteDrawdown.peakTime * 1000).toISOString(),
    summary.minuteDrawdownPeakTime
  );
  check(
    'minute drawdown trough',
    new Date(accounting.minuteDrawdown.troughTime * 1000).toISOString(),
    summary.minuteDrawdownTroughTime
  );
  check('sessions', endIndex - firstIndex + 1, summary.sessions);
  check('closed trades', result.trades.filter((trade) => trade.exitIndex >= 0).length, summary.closedTrades);
  check(
    'open at end',
    result.trades.some((trade) => trade.exitIndex < 0),
    summary.openAtEnd
  );

  const { counts } = result;

  check('entries without trade', counts.entriesWithoutTrade, summary.entriesWithoutTrade);
  check('setup activations', counts.setupActivations, summary.setupActivations);
  check('setup fills', counts.setupFills, summary.setupFills);
  check('setup cancellations', counts.setupCancellations, summary.setupCancellations);
  check('armed at end', counts.armedAtEnd, summary.armedAtEnd);
  check('pending at end', counts.pendingAtEnd, summary.pendingAtEnd);
  check('rebound signals', counts.reboundSignals, summary.reboundSignals);
  check('overnight orders', counts.overnightOrders, summary.overnightOrders);
  check('suppressed rebound signals', counts.suppressedReboundSignals, summary.suppressedReboundSignals);

  if (parityCase.family.flags.restricted) {
    check('restrictions', counts.restrictions, summary.restrictions);
    check('lower-price re-entries', counts.lowerPriceReentries, summary.lowerPriceReentries);
    check('recovery resets', counts.recoveryResets, summary.recoveryResets);
    check('losses not restricted', counts.lossesNotRestricted, summary.lossesNotRestricted);
  } else {
    check('losing exits', counts.losingExits, summary.losingExits);
    check('restrictions', 0, summary.restrictions);
  }

  if (parityCase.family.flags.buffered) {
    check('buffered loss exits', counts.bufferedLossExits, summary.bufferedLossExits);
    check('pending buffered exit at end', counts.pendingBufferedExitAtEnd, summary.pendingBufferedExitAtEnd !== null);
  }

  // The setups' final statuses.
  const engineSetups = result.setups ?? [];

  check('setup records', engineSetups.length, source.setups?.length);
  engineSetups.forEach((setup, index) => {
    const other = source.setups?.[index];

    check(`setup ${setup.id} status`, setup.status, other?.status);
    check(`setup ${setup.id} status reason`, setup.statusReason, other?.statusReason);
  });

  // Every daily mark.
  let maxMarkDifference = 0;

  for (let s = firstIndex; s <= endIndex; s++) {
    const sourceMark = source.dailyMarks.get(ds.dates[s]!);
    const engineMark = accounting.dailyMarks![s]!;
    const difference = Math.abs(engineMark - (sourceMark ?? NaN));

    maxMarkDifference = Math.max(maxMarkDifference, Number.isNaN(difference) ? Infinity : difference);

    if (!(difference <= tolerance)) {
      mismatches.push(`daily mark ${ds.dates[s]}: engine ${engineMark} vs source ${sourceMark}`);
    }
  }

  check('daily rows', endIndex - firstIndex + 1, source.dailyMarks.size);

  return {
    name: parityCase.name,
    family: parityCase.family.key,
    ok: mismatches.length === 0,
    trades: result.trades.length,
    sourceNet: summary.netProfit as number,
    engineNet: accounting.netProfit,
    sourceMinuteDrawdown: summary.minuteMaximumDrawdown as number,
    engineMinuteDrawdown: accounting.minuteDrawdown.maximum,
    sourceDailyDrawdown: summary.maximumDrawdown as number,
    engineDailyDrawdown: accounting.dailyDrawdown.maximum,
    maxProfitDifference,
    maxMarkDifference,
    mismatches: mismatches.slice(0, 20)
  };
};

export const runParityCase = async (ds: Dataset, sessions: MarketSession[], parityCase: ParityCase) => {
  const source = await runSource(sourceOptions(parityCase, sessions));

  return compareWithSource(ds, parityCase, source);
};

// Byte-level comparison of two source runs (an original and its copy with nothing injected).
export const compareSourceRuns = (a: SourceRunResult, b: SourceRunResult) => {
  const mismatches: string[] = [];

  if (JSON.stringify(a.trades) !== JSON.stringify(b.trades)) {
    mismatches.push('trades differ');
  }

  if (JSON.stringify(a.summary) !== JSON.stringify(b.summary)) {
    mismatches.push('summary differs');
  }

  if (JSON.stringify([...a.dailyMarks]) !== JSON.stringify([...b.dailyMarks])) {
    mismatches.push('daily marks differ');
  }

  return mismatches;
};

export const fileDefaults = (family: Family, y = family.fileY): StrategyParams => ({
  targetPercentChange: 0.1,
  trailingBuyPercentage: y / 1000,
  trailingStopPercentage: 0.08,
  maximumHoldDays: 15,
  tickWindowSize: 90,
  materialLossThreshold: family.flags.restricted ? 0.01 : NaN,
  lowerPriceReentry: family.flags.restricted ? 0.02 : NaN,
  retraceFraction: family.flags.restricted ? 0.38 : NaN,
  intradayLossBuffer: family.flags.buffered ? 0.005 : NaN
});

export const allFamilies = familyKeys.map((key) => families[key]);

export type { SourceKey };
