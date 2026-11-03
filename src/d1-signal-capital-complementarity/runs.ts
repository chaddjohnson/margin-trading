// The study's run units: one standalone book (the frozen engine's one-book run, its observer twin checked equal, the
// trade ledger and its window figures) and one baseline pool run (funded lots, every decision, daily occupancy).
import type { BookPhenotype, NRunResult, NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { study } from './context.ts';
import { runBooks } from './engine.ts';
import { type TradeRecord, signalRecordsOf, tradeRecordsOf } from './ledger.ts';
import { fixedMinuteDrawdowns, windowIncrementOf } from './marks.ts';
import { type ContinuationWindow, type SetupRecord, observeBook, tradeDifferences } from './observer.ts';
import { gateCheck } from './replay.ts';

export interface StandaloneRecord {
  symbol: string;
  book: { name: string; short: string };
  trades: TradeRecord[];
  setups: SetupRecord[];
  continuation: ContinuationWindow[];
  summary: {
    trades: number;
    closed: number;
    open: number;
    net: number; // whole-run liquidation mark at the data end
    minuteDrawdown: number; // engine, whole run
    dailyDrawdown: number; // engine, whole run
    window?: { boundary: string; increment: number; minuteDrawdown: number; dailyDrawdownFromRows: number };
  };
  parity: { observerDifferences: number };
}

export const standaloneRun = (
  universe: NUniverse,
  book: BookPhenotype,
  boundary?: string,
  costBps: number = study.costBps
): StandaloneRecord => {
  const result = runBooks(
    universe,
    { [book.symbol]: book },
    { key: `${book.symbol}:${book.name}`, mode: 'fixed', costBps }
  );
  const observation = observeBook(universe, book, { costBps });
  const differences = tradeDifferences(observation.trades, result);

  if (differences.length > 0) {
    throw new Error(`observer ≠ engine for ${book.symbol} ${book.name}: ${differences.slice(0, 3).join('; ')}`);
  }

  const trades = tradeRecordsOf(universe, result, costBps);
  const whole = windowIncrementOf(result, costBps);
  const minute = fixedMinuteDrawdowns(result, boundary);
  let window: StandaloneRecord['summary']['window'];

  if (boundary) {
    const b = universe.dates.indexOf(boundary);
    const rows = result.daily.filter((row) => row.index >= b);
    let peak = rows[0]!.strategyMark;
    let dd = 0;

    for (const row of rows) {
      peak = Math.max(peak, row.strategyMark);
      dd = Math.max(dd, peak - row.strategyMark);
    }

    window = {
      boundary,
      increment: windowIncrementOf(result, costBps, boundary).increment,
      minuteDrawdown: minute.windowed.maximum,
      dailyDrawdownFromRows: dd
    };
  }

  return {
    symbol: book.symbol,
    book: { name: book.name, short: book.short },
    trades,
    setups: observation.setups,
    continuation: observation.continuation,
    summary: {
      trades: trades.length,
      closed: trades.filter((trade) => !trade.open).length,
      open: trades.filter((trade) => trade.open).length,
      net: whole.increment,
      minuteDrawdown: result.minuteDrawdown.maximum,
      dailyDrawdown: result.dailyDrawdown.maximum,
      window
    },
    parity: { observerDifferences: 0 }
  };
};

export interface BaselineRecord {
  baseline: string;
  dataEnd: string;
  records: TradeRecord[]; // every virtual trade of every book (fundedLot > 0 for funded)
  signals: ReturnType<typeof signalRecordsOf>;
  daily: { index: number; date: string; strategyMark: number; openLots: number; owners: string }[];
  summary: {
    lots: number;
    virtualTrades: number;
    refused: number;
    net: number;
    minuteDrawdown: number;
    dailyDrawdown: number;
    window?: { boundary: string; increment: number; minuteDrawdown: number };
  };
}

export const baselineRun = (
  universe: NUniverse,
  id: string,
  phenotypes: Record<string, BookPhenotype>,
  boundary?: string,
  costBps: number = study.costBps
): { record: BaselineRecord; result: NRunResult } => {
  const result = runBooks(universe, phenotypes, { key: `${id}@${universe.end}`, mode: 'fixed', costBps });
  const { records } = gateCheck(universe, result, costBps);
  const minute = fixedMinuteDrawdowns(result, boundary);

  return {
    result,
    record: {
      baseline: id,
      dataEnd: universe.end,
      records,
      signals: signalRecordsOf(result),
      daily: result.daily.map((row) => ({
        index: row.index,
        date: row.date,
        strategyMark: row.strategyMark,
        openLots: row.openLots,
        owners: row.owners
      })),
      summary: {
        lots: result.lots.length,
        virtualTrades: result.trades.length,
        refused: result.signals.filter((signal) => signal.outcome === 'refused').length,
        net: windowIncrementOf(result, costBps).increment,
        minuteDrawdown: result.minuteDrawdown.maximum,
        dailyDrawdown: result.dailyDrawdown.maximum,
        window: boundary
          ? {
              boundary,
              increment: windowIncrementOf(result, costBps, boundary).increment,
              minuteDrawdown: minute.windowed.maximum
            }
          : undefined
      }
    }
  };
};
