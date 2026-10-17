// One evaluation job: a continuous run over [startIndex, endIndex] and compact metrics for each requested
// window. Used identically in-process and inside worker threads, with no randomness and no clock, so the
// same job always returns the same numbers whatever thread or core count runs it.
import { createHash } from 'node:crypto';
import { type Bars, type RunOptions, type StrategyParams, simulate } from './engine.ts';
import { IndicatorCache } from './indicators.ts';
import { windowMetrics } from './metrics.ts';

export interface Job {
  params: StrategyParams;
  startIndex: number;
  endIndex: number;
  windows: [number, number][];
  options?: Partial<RunOptions>;
}

export interface CompactMetrics {
  netProfit: number;
  maximumDrawdown: number;
  interest: number;
  entries: number;
  closedTrades: number;
  wins: number;
  timeInMarket: number;
  worstTradeMark: number;
  setupsArmed: number;
  setupsCancelled: number;
  setupsPendingAtEnd: number;
  meanWaitSessions: number;
  openAtEnd: boolean;
  positiveYears: number;
  years: number;
}

export interface JobResult {
  windows: CompactMetrics[];
  // Hash of the run's trade list (entry/exit sessions and prices): identical trading = identical hash.
  signature: string;
}

export const tradeSignature = (
  trades: { entryIndex: number; exitIndex: number; entryPrice: number; exitPrice: number }[]
) =>
  createHash('sha256')
    .update(
      trades.map((trade) => `${trade.entryIndex}:${trade.exitIndex}:${trade.entryPrice}:${trade.exitPrice}`).join('|')
    )
    .digest('hex')
    .slice(0, 16);

export const runJob = (bars: Bars, cache: IndicatorCache, job: Job): JobResult => {
  const result = simulate(bars, cache, job.params, job.startIndex, job.endIndex, { ...job.options, record: false });

  return {
    windows: job.windows.map(([first, last]) => {
      const metrics = windowMetrics(bars, result, first, last);

      return {
        netProfit: metrics.netProfit,
        maximumDrawdown: metrics.maximumDrawdown,
        interest: metrics.interest,
        entries: metrics.entries,
        closedTrades: metrics.closedTrades,
        wins: metrics.wins,
        timeInMarket: metrics.timeInMarket,
        worstTradeMark: metrics.worstTradeMark,
        setupsArmed: metrics.setupsArmed,
        setupsCancelled: metrics.setupsCancelled,
        setupsPendingAtEnd: metrics.setupsPendingAtEnd,
        meanWaitSessions: metrics.meanWaitSessions,
        openAtEnd: metrics.openAtEnd,
        positiveYears: metrics.annual.filter((year) => year.pnl >= 0).length,
        years: metrics.annual.length
      };
    }),
    signature: tradeSignature(result.trades)
  };
};

export interface DatasetMessage {
  id: string;
  date: string[];
  time: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
}
