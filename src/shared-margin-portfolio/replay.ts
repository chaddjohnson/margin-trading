// Replays of one position's exit side: under its own rules on a (possibly shocked) price path, or transferred to
// another strategy's rules at a given session and minute (the T1/T2 takeover definitions, PROTOCOL.md §5.4). Used by
// the overlap chronology (the hypothetical exit under the other strategy's rules) and the gap stress tests.
import type { Dataset } from '../four-family/data.ts';
import {
  type ExitDecision,
  type LotState,
  type StrategyParams,
  type StopFill,
  ExitManager,
  firstTradeAfterDecision,
  interestOn,
  priceAt
} from './strategy.ts';

export interface ReplayEntry {
  entryIndex: number;
  entryBar: number;
  entryPrice: number;
  shares: number;
  principal: number;
  entryTimestamp: number;
}

export interface ReplayOutcome {
  exitIndex: number; // -1: still open at endIndex
  exitBar: number;
  exitPrice: number;
  exitTime: number;
  reason: ExitDecision['reason'] | 'open';
  interest: number;
  net: number; // realized, or marked at the end
  stopFirstActiveIndex: number;
  stopAtEnd: number;
  highAtEnd: number;
}

const settingsOf = (rate: number, stopFill: StopFill) => ({ stopFill, marginInterestRate: rate });

const outcomeOf = (
  ds: Dataset,
  lot: LotState,
  manager: ExitManager,
  s: number,
  exit: ExitDecision | undefined,
  endIndex: number,
  rate: number
): ReplayOutcome => {
  if (exit) {
    const interest = interestOn(lot, rate, ds.sTime[s]!);

    return {
      exitIndex: s,
      exitBar: exit.barIndex,
      exitPrice: exit.price,
      exitTime: exit.time,
      reason: exit.reason,
      interest,
      net: lot.shares * exit.price - lot.investment - interest,
      stopFirstActiveIndex: manager.stopFirstActiveIndex,
      stopAtEnd: manager.stopPrice,
      highAtEnd: manager.postEntryHigh
    };
  }

  const interest = interestOn(lot, rate, ds.sTime[endIndex]!);

  return {
    exitIndex: -1,
    exitBar: -1,
    exitPrice: ds.sClose[endIndex]!,
    exitTime: ds.sCloseTime[endIndex]!,
    reason: 'open',
    interest,
    net: lot.shares * ds.sClose[endIndex]! - lot.investment - interest,
    stopFirstActiveIndex: manager.stopFirstActiveIndex,
    stopAtEnd: manager.stopPrice,
    highAtEnd: manager.postEntryHigh
  };
};

// The position from its fill under `params` until it exits or `endIndex`.
export const replayLot = (
  ds: Dataset,
  entry: ReplayEntry,
  params: StrategyParams,
  rate: number,
  stopFill: StopFill,
  endIndex: number,
  referencePrice = entry.entryPrice
): ReplayOutcome => {
  const lot: LotState = {
    entryPrice: entry.entryPrice,
    shares: entry.shares,
    investment: entry.principal,
    entryTimestamp: entry.entryTimestamp,
    holdTimestamp: entry.entryTimestamp
  };
  const manager = new ExitManager(ds, params, settingsOf(rate, stopFill));

  manager.onEntry(lot, entry.entryIndex, entry.entryBar, referencePrice);

  for (let s = entry.entryIndex + 1; s <= endIndex; s++) {
    const exit = manager.evaluate(lot, s);

    if (exit) {
      return outcomeOf(ds, lot, manager, s, exit, endIndex, rate);
    }

    manager.afterSession(lot, s);
  }

  return outcomeOf(ds, lot, manager, endIndex, undefined, endIndex, rate);
};

export interface TransferReplay {
  before: ReplayOutcome | undefined; // the original rules' exit before the transfer, if it came first
  after: ReplayOutcome; // the exit under the new rules from the transfer
  transferPrice: number;
  highBefore: number;
  stopBefore: number;
  stopAfter: number;
  netAtTransfer: number;
}

// The position under `originalParams` from its fill to the transfer decision (session `atIndex`, confirmed at the
// end of minute `atBar`), then under `newParams` with the T1 or T2 state transfer. If the original rules exit the
// position on or before the transfer minute, `before` holds that exit and `after` is undefined.
export const replayTransfer = (
  ds: Dataset,
  entry: ReplayEntry,
  originalParams: StrategyParams,
  newParams: StrategyParams,
  atIndex: number,
  atBar: number,
  transfer: 'T1' | 'T2',
  holdClock: 'original' | 'takeover',
  rate: number,
  stopFill: StopFill,
  endIndex: number
): TransferReplay | { before: ReplayOutcome } => {
  const lot: LotState = {
    entryPrice: entry.entryPrice,
    shares: entry.shares,
    investment: entry.principal,
    entryTimestamp: entry.entryTimestamp,
    holdTimestamp: entry.entryTimestamp
  };
  const original = new ExitManager(ds, originalParams, settingsOf(rate, stopFill));

  original.onEntry(lot, entry.entryIndex, entry.entryBar);

  for (let s = entry.entryIndex + 1; s <= atIndex; s++) {
    const exit = original.evaluate(lot, s);

    if (exit && (s < atIndex || exit.barIndex <= atBar)) {
      return { before: outcomeOf(ds, lot, original, s, exit, endIndex, rate) };
    }

    if (s < atIndex) {
      original.afterSession(lot, s);
    }
  }

  const manager = new ExitManager(ds, newParams, settingsOf(rate, stopFill));
  const decisionTime = ds.bTime[ds.sBarStart[atIndex]! + atBar]! + 60;
  const fillBar = firstTradeAfterDecision(ds, atIndex, decisionTime);
  const transferPrice = fillBar >= 0 ? priceAt(ds, atIndex, fillBar) : ds.sClose[atIndex]!;
  const highBefore = original.postEntryHigh;
  const stopBefore = original.stopPrice;

  if (transfer === 'T1') {
    manager.initFromHigh(lot, highBefore, original.postEntryLow);
    manager.afterSession(lot, atIndex);
  } else {
    manager.onEntry(lot, atIndex, fillBar >= 0 ? fillBar : ds.sBarCount[atIndex]!, transferPrice);
  }

  if (holdClock === 'takeover') {
    lot.holdTimestamp = ds.sTime[atIndex]!;
  }

  const stopAfter = manager.stopPrice;
  const interestAt = interestOn(lot, rate, ds.sTime[atIndex]!);
  const netAtTransfer = lot.shares * ds.bClose[ds.sBarStart[atIndex]! + atBar]! - lot.investment - interestAt;

  for (let s = atIndex + 1; s <= endIndex; s++) {
    const exit = manager.evaluate(lot, s);

    if (exit) {
      return {
        before: undefined,
        after: outcomeOf(ds, lot, manager, s, exit, endIndex, rate),
        transferPrice,
        highBefore,
        stopBefore,
        stopAfter,
        netAtTransfer
      };
    }

    manager.afterSession(lot, s);
  }

  return {
    before: undefined,
    after: outcomeOf(ds, lot, manager, endIndex, undefined, endIndex, rate),
    transferPrice,
    highBefore,
    stopBefore,
    stopAfter,
    netAtTransfer
  };
};
