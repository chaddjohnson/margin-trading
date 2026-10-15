// Candidate evaluation: one daily backtest of the working-copy strategy over a window, reduced to metrics.
// Used identically by the worker threads and by in-process evaluation.
import { createHash } from 'node:crypto';
import {
  type AllInParams,
  type AllInSettings,
  type SimulationResult,
  computeReferenceHighs,
  originalSettings,
  simulateAllIn
} from '../app/allIn-optimizable.ts';

export interface DatasetArrays {
  id: string; // symbol plus data hash and visible end
  symbol: string;
  time: Float64Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  years: Int16Array;
}

// Inclusive session indices. Sessions before startIndex are history for the reference high only.
export interface EvalWindow {
  startIndex: number;
  endIndex: number;
}

export interface YearMetrics {
  year: number;
  netProfit: number;
  maximumDrawdown: number;
  entries: number;
}

export interface Metrics {
  sessions: number;
  netProfit: number; // realized plus open position marked at the last close, net of interest
  grossProfit: number; // before margin interest
  interest: number; // closed trades plus accrued on the open position
  realizedProfit: number;
  unrealizedProfit: number;
  maximumDrawdown: number; // dollars, daily mark to market (unrealized and accrued interest included), from the start
  entries: number; // trades opened in the window, including one still open
  closedTrades: number;
  openAtEnd: boolean;
  wins: number; // trades (open one marked to market) with profit > 0
  winRate: number; // NaN without trades
  profitFactor: number; // gross wins / gross losses; Infinity without losses, NaN without trades
  medianTrade: number;
  worstTrade: number;
  bestTrade: number;
  medianHoldDays: number; // calendar days, open trade to the window end
  exposure: number; // share of sessions closing with a position open
  restrictions: number;
  lowerPriceReentries: number;
  recoveryResets: number;
  years: YearMetrics[];
  signature: string; // hash of the trade list (entry/exit sessions and reasons), for behavioural duplicates
}

const median = (values: number[]) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

export const summarize = (result: SimulationResult): Metrics => {
  const profits = result.trades.map((trade) => trade.profit);
  const wins = profits.filter((profit) => profit > 0);
  const losses = profits.filter((profit) => profit <= 0);
  const grossWins = wins.reduce((total, profit) => total + profit, 0);
  const grossLosses = -losses.reduce((total, profit) => total + profit, 0);
  const interest = result.closedInterest + result.accruedInterest;
  const signature = createHash('sha1')
    .update(result.trades.map((trade) => `${trade.entryIndex}:${trade.exitIndex}:${trade.reason}`).join(';'))
    .digest('hex')
    .slice(0, 16);

  return {
    sessions: result.sessions,
    netProfit: result.netProfit,
    grossProfit: result.netProfit + interest,
    interest,
    realizedProfit: result.realizedProfit,
    unrealizedProfit: result.unrealizedProfit,
    maximumDrawdown: result.maximumDrawdown,
    entries: result.trades.length,
    closedTrades: result.trades.filter((trade) => trade.reason !== 'open').length,
    openAtEnd: result.trades.some((trade) => trade.reason === 'open'),
    wins: wins.length,
    winRate: profits.length ? wins.length / profits.length : NaN,
    profitFactor: profits.length === 0 ? NaN : grossLosses === 0 ? Infinity : grossWins / grossLosses,
    medianTrade: median(profits),
    worstTrade: profits.length ? Math.min(...profits) : NaN,
    bestTrade: profits.length ? Math.max(...profits) : NaN,
    medianHoldDays: median(result.trades.map((trade) => (trade.exitTime - trade.entryTime) / 86400)),
    exposure: result.sessions ? result.exposureSessions / result.sessions : 0,
    restrictions: result.restrictions,
    lowerPriceReentries: result.lowerPriceReentries,
    recoveryResets: result.recoveryResets,
    years: result.years.map((year) => ({ ...year })),
    signature
  };
};

// Reference highs depend only on the series and the lookback, so recent lookbacks are kept (least
// recently used evicted first) to bound memory per worker.
export class ReferenceHighCache {
  private readonly cache = new Map<number, Float64Array>();

  constructor(
    private readonly high: Float64Array,
    private readonly capacity = 64
  ) {}

  get(lookback: number) {
    let highs = this.cache.get(lookback);

    if (highs) {
      this.cache.delete(lookback);
    } else {
      highs = computeReferenceHighs(this.high, lookback);

      if (this.cache.size >= this.capacity) {
        this.cache.delete(this.cache.keys().next().value!);
      }
    }

    this.cache.set(lookback, highs);

    return highs;
  }
}

export const simulateWindow = (
  dataset: DatasetArrays,
  highs: ReferenceHighCache,
  params: AllInParams,
  window: EvalWindow,
  options: { detail?: boolean; settings?: AllInSettings } = {}
) =>
  simulateAllIn({
    symbol: dataset.symbol,
    bars: dataset,
    params,
    settings: options.settings ?? originalSettings,
    referenceHighs: highs.get(params.lookbackSessions),
    startIndex: window.startIndex,
    endIndex: window.endIndex,
    years: dataset.years,
    detail: options.detail
  });

export const evaluateCandidate = (
  dataset: DatasetArrays,
  highs: ReferenceHighCache,
  params: AllInParams,
  window: EvalWindow
): Metrics => summarize(simulateWindow(dataset, highs, params, window));
