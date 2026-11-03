// Candidate evaluation: one fast-engine backtest over a window, reduced to the metrics the search, the
// selection and the reports use. Used identically by the worker threads and by in-process evaluation.
import { createHash } from 'node:crypto';
import type { MinuteParams } from '../app/allIn-minute-optimizable.ts';
import type { MinuteDataset } from './data.ts';
import { type EngineResult, type EngineSettings, type EvalWindow, ReferenceHighCache, simulate } from './engine.ts';

export interface LevelMetrics {
  bps: number; // extra cost per side
  costs: number;
  netProfit: number;
  dailyDrawdown: number;
  minuteDrawdown: number;
  bestTrade: number; // the most profitable trade net of its own costs at this level
}

export interface YearMetrics {
  year: number;
  entries: number;
  net: number[]; // per level, in the order of `levels`
}

export interface MinuteMetrics {
  sessions: number;
  entries: number; // trades opened in the window, including one still open
  closedTrades: number;
  openAtEnd: boolean;
  entriesWithoutTrade: number; // entry decisions with no trade after them
  netProfit: number; // cost-free: realized plus the open position marked at the last close, net of interest
  grossProfit: number; // cost-free, before margin interest
  interest: number;
  realizedProfit: number;
  unrealizedProfit: number;
  dailyDrawdown: number; // cost-free, daily mark to market
  minuteDrawdown: number; // cost-free, minute-sampled mark to market
  levels: LevelMetrics[]; // level 0 = cost-free, then each extra cost
  turnover: number; // notional bought and sold, including selling an open position at the last close
  exits: { maximumHold: number; trailingStop: number; trailingStopGap: number };
  wins: number;
  winRate: number;
  profitFactor: number;
  medianTrade: number;
  worstTrade: number;
  bestTrade: number;
  medianHoldDays: number; // calendar days
  exposure: number; // share of sessions closing with a position open
  restrictions: number;
  lowerPriceReentries: number;
  recoveryResets: number;
  lossesNotRestricted: number;
  years: YearMetrics[];
  signature: string; // hash of the trade list (entry and exit sessions and reasons): behavioural identity
}

const median = (values: number[]) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

export const summarize = (result: EngineResult): MinuteMetrics => {
  const profits = result.trades.map((trade) => trade.profit);
  const wins = profits.filter((profit) => profit > 0);
  const grossWins = wins.reduce((total, profit) => total + profit, 0);
  const grossLosses = -profits.filter((profit) => profit <= 0).reduce((total, profit) => total + profit, 0);
  const interest = result.closedInterest + result.accruedInterest;
  const signature = createHash('sha1')
    .update(result.trades.map((trade) => `${trade.entryIndex}:${trade.exitIndex}:${trade.reason}`).join(';'))
    .digest('hex')
    .slice(0, 16);
  const count = (reason: string) => result.trades.filter((trade) => trade.reason === reason).length;

  return {
    sessions: result.sessions,
    entries: result.trades.length,
    closedTrades: result.trades.filter((trade) => trade.reason !== 'open').length,
    openAtEnd: result.trades.some((trade) => trade.reason === 'open'),
    entriesWithoutTrade: result.entriesWithoutTrade,
    netProfit: result.netProfit,
    grossProfit: result.netProfit + interest,
    interest,
    realizedProfit: result.realizedProfit,
    unrealizedProfit: result.unrealizedProfit,
    dailyDrawdown: result.maximumDrawdown,
    minuteDrawdown: result.minuteMaximumDrawdown,
    levels: result.levels.map((level) => {
      const rate = level.bps / 10000;
      const tradeNets = result.trades.map(
        (trade) => trade.profit - rate * 100000 - rate * trade.shares * trade.exitPrice
      );

      return {
        bps: level.bps,
        costs: level.costs,
        netProfit: level.netProfit,
        dailyDrawdown: level.maximumDrawdown,
        minuteDrawdown: level.minuteMaximumDrawdown,
        bestTrade: tradeNets.length ? Math.max(...tradeNets) : 0
      };
    }),
    turnover: result.turnover,
    exits: {
      maximumHold: count('maximum hold'),
      trailingStop: count('trailing stop'),
      trailingStopGap: count('trailing stop gap')
    },
    wins: wins.length,
    winRate: profits.length ? wins.length / profits.length : NaN,
    profitFactor: profits.length === 0 ? NaN : grossLosses === 0 ? Infinity : grossWins / grossLosses,
    medianTrade: median(profits),
    worstTrade: profits.length ? Math.min(...profits) : NaN,
    bestTrade: profits.length ? Math.max(...profits) : NaN,
    medianHoldDays: median(result.trades.map((trade) => trade.holdDays)),
    exposure: result.sessions ? result.exposureSessions / result.sessions : 0,
    restrictions: result.restrictions,
    lowerPriceReentries: result.lowerPriceReentries,
    recoveryResets: result.recoveryResets,
    lossesNotRestricted: result.lossesNotRestricted,
    years: result.years.map((year) => ({ year: year.year, entries: year.entries, net: [...year.net] })),
    signature
  };
};

export const levelOf = (metrics: MinuteMetrics, bps: number) => {
  const level = metrics.levels.find((entry) => entry.bps === bps);

  if (!level) {
    throw new Error(`No ${bps} bp cost level in the metrics`);
  }

  return level;
};

export const levelIndexOf = (metrics: MinuteMetrics, bps: number) => {
  const index = metrics.levels.findIndex((entry) => entry.bps === bps);

  if (index < 0) {
    throw new Error(`No ${bps} bp cost level in the metrics`);
  }

  return index;
};

export const evaluateCandidate = (
  dataset: MinuteDataset,
  highs: ReferenceHighCache,
  params: MinuteParams,
  window: EvalWindow,
  settings: EngineSettings
): MinuteMetrics =>
  summarize(simulate(dataset, highs.get(params.lookbackSessions, window.historyStart), params, window, settings));
