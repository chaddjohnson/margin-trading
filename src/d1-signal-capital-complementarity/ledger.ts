// Machine-readable ledgers (PROTOCOL.md §5.3) built from the frozen engine's own results: the per-trade record of a
// one-book (standalone) run, the funded lots and every decision of a pool run, and their gate form. Figures are the
// engine's, through the completed standalone audit's compaction (src/d1-standalone-opportunity-audit/run.ts
// compactLotsOf: liquidation-equivalent net for a lot open at the end, MAE/MFE from the minute bars, occupied days).
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import { type Spec, compactLotsOf } from '../d1-standalone-opportunity-audit/run.ts';
import type { NRunResult, NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { newYork } from '../pools/run.ts';
import { study } from './context.ts';
import { type GateTrade, keyOf } from './gate.ts';

export { newYork };

export interface TradeRecord {
  symbol: string;
  trade: number; // the book's 1-based trade id
  setupId: number;
  setupKind: string;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  trailingLow: number;
  decisionIndex: number;
  decisionTime: number;
  decisionNewYork: string;
  decisionPrice: number;
  carriedOvernight: boolean;
  entryIndex: number; // -1: decided but not filled by the data end
  entryTime: number;
  entryNewYork: string;
  entryRawPrice: number;
  entryPrice: number;
  entryExecution: string;
  exitIndex: number; // -1: open (or pending) at the data end
  exitTime: number; // the last close for an open lot, NaN for a pending order
  exitNewYork: string;
  exitRawPrice: number;
  exitReason: string;
  exitExecution: string;
  stopActiveAtExit: boolean;
  maximumHoldDue: boolean;
  gross: number;
  interest: number;
  friction: number;
  net: number; // liquidation-equivalent
  engineNet: number;
  occupiedDays: number;
  heldDays: number;
  entryDate: string;
  exitDate: string;
  maePercent: number;
  maeDollars: number;
  mfePercent: number;
  worstMark: number;
  open: boolean;
  fundedLot: number; // pool runs: the funded lot id, 0 if refused
}

const asSpec = (costBps: number) => ({ rate: study.rate, costBps }) as unknown as Spec;

// Every virtual trade of every book of a run, with its lot's compact figures where it was funded (a one-book run
// funds every trade; a pending order at the end has no lot).
export const tradeRecordsOf = (universe: NUniverse, result: NRunResult, costBps: number): TradeRecord[] => {
  const compact = compactLotsOf(universe, result, asSpec(costBps));
  const byLot = new Map(result.lots.map((lot, index) => [lot.id, compact[index]!]));

  return result.trades.map((trade: VirtualTrade) => {
    const lot = trade.fundedLotId > 0 ? byLot.get(trade.fundedLotId) : undefined;
    const filled = trade.entryIndex >= 0;
    const open = trade.exitIndex < 0;
    const base = {
      symbol: trade.symbol as string,
      trade: trade.id,
      setupId: trade.setupId,
      setupKind: trade.setupKind,
      activationIndex: trade.activationIndex,
      activationTime: trade.activationTime,
      activationPrice: trade.activationPrice,
      referenceHigh: trade.referenceHigh,
      trailingLow: trade.trailingLow,
      decisionIndex: trade.decisionIndex,
      decisionTime: trade.decisionTime,
      decisionNewYork: newYork(trade.decisionTime),
      decisionPrice: trade.decisionPrice,
      carriedOvernight: trade.carriedOvernight,
      entryIndex: trade.entryIndex,
      entryTime: filled ? trade.entryTime : NaN,
      entryNewYork: filled ? newYork(trade.entryTime) : '',
      entryRawPrice: trade.entryRawPrice,
      entryPrice: trade.entryPrice,
      entryExecution: trade.entryExecution,
      stopActiveAtExit: trade.stopActiveAtExit,
      maximumHoldDue: trade.maximumHoldDue,
      fundedLot: trade.fundedLotId > 0 ? trade.fundedLotId : 0
    };

    if (lot) {
      return {
        ...base,
        exitIndex: lot.exitIndex,
        exitTime: lot.exitTime,
        exitNewYork: newYork(lot.exitTime),
        exitRawPrice: lot.exitRawPrice,
        exitReason: lot.exitReason,
        exitExecution: open ? '' : trade.exitExecution,
        gross: lot.gross,
        interest: lot.interest,
        friction: lot.friction,
        net: lot.net,
        engineNet: lot.engineNet,
        occupiedDays: lot.occupiedDays,
        heldDays: lot.heldDays,
        entryDate: lot.entryDate,
        exitDate: lot.exitDate,
        maePercent: lot.maePercent,
        maeDollars: lot.maeDollars,
        mfePercent: lot.mfePercent,
        worstMark: lot.worstMark,
        open
      };
    }

    // An unfunded virtual trade (refused in a pool, or pending at the end): the book's own figures.
    return {
      ...base,
      exitIndex: trade.exitIndex,
      exitTime: open ? NaN : trade.exitTime,
      exitNewYork: open ? '' : newYork(trade.exitTime),
      exitRawPrice: trade.exitRawPrice,
      exitReason: trade.exitReason,
      exitExecution: trade.exitExecution,
      gross: NaN,
      interest: trade.interest,
      friction: NaN,
      net: trade.net,
      engineNet: trade.net,
      occupiedDays: NaN,
      heldDays: NaN,
      entryDate: filled ? universe.dates[trade.entryIndex]! : '',
      exitDate: open ? '' : universe.dates[trade.exitIndex]!,
      maePercent: NaN,
      maeDollars: NaN,
      mfePercent: NaN,
      worstMark: NaN,
      open
    };
  });
};

export const gateTradeOf = (record: TradeRecord): GateTrade => ({
  key: keyOf(record.symbol, record.decisionTime),
  symbol: record.symbol,
  decisionTime: record.decisionTime,
  fillTime: record.entryIndex >= 0 ? record.entryTime : NaN,
  exitTime: record.open ? Infinity : record.exitTime,
  net: record.net
});

// The funded lots of a pool run in gate form, keyed by (symbol, decision time).
export const fundedGateTrades = (records: readonly TradeRecord[]) =>
  records.filter((record) => record.fundedLot > 0).map(gateTradeOf);

export const signalRecordsOf = (result: NRunResult) =>
  result.signals.map((signal) => ({
    symbol: signal.symbol,
    decisionTime: signal.decisionTime,
    decisionNewYork: newYork(signal.decisionTime),
    date: signal.date,
    outcome: signal.outcome,
    reason: signal.reason,
    occupiedBy: signal.occupiedBy,
    sameMinuteCandidates: signal.sameMinuteCandidates,
    setupKind: signal.setupKind
  }));

export type SignalRecord = ReturnType<typeof signalRecordsOf>[number];
