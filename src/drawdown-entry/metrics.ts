// Strategy-level metrics over a window [from, to] of a continuous run. The equity basis is the original's:
// daily mark-to-market P&L of a $100,000 margin-financed position (realized P&L plus the open position at
// the close, net of accrued interest), with no compounding and no account equity. Drawdown is measured
// from the window's starting mark.

import type { DailyBars } from './data.ts';
import type { SimulationResult, Trade } from './engine.ts';
import { type Episode, reachLabel } from './events.ts';

export interface WindowMetrics {
  policyId: string;
  execution: string;
  from: string;
  to: string;
  netProfit: number;
  interest: number;
  maxDrawdown: number;
  objective: number; // net − max drawdown, the pre-specified selection objective
  entries: number;
  closedTrades: number;
  winners: number;
  losers: number;
  winRate: number;
  exposureSessions: number;
  meanHoldSessions: number;
  worstTrade: number;
  worstTradeMae: number; // lowest low while held / entry − 1, worst across entries
  worstOpenMark: number; // worst close-based open P&L of a single trade
  severeEntries20: number; // entries whose reference high suffers ≥20% within 40 sessions of the signal
  severeEntries25: number;
  severeEntries30: number;
  labelledEntries: number; // entries with an uncensored 20%/40 label
  severeEntryRate20: number;
  severeEntryRate25: number;
  severeEntryRate30: number;
  deepFurtherDrop: number; // entries followed by a close ≥10% below the entry price within 40 sessions
  deepFurtherDropRate: number;
}

export const markBefore = (result: SimulationResult, from: number) =>
  from - 1 >= result.startIndex ? result.mtm[from - 1]! : 0;

export const tradesIn = (result: SimulationResult, from: number, to: number) =>
  result.trades.filter((trade) => trade.entryIndex >= from && trade.entryIndex <= to);

export const windowMetrics = (
  result: SimulationResult,
  bars: DailyBars,
  from: number,
  to: number,
  outcomeEnd: number
): WindowMetrics => {
  const start = markBefore(result, from);
  const interestStart = from - 1 >= result.startIndex ? result.interestCharged[from - 1]! : 0;
  let peak = start;
  let maxDrawdown = 0;
  let exposure = 0;

  for (let i = from; i <= to; i++) {
    peak = Math.max(peak, result.mtm[i]!);
    maxDrawdown = Math.max(maxDrawdown, peak - result.mtm[i]!);
    exposure += result.inPosition[i]!;
  }

  const trades = tradesIn(result, from, to);
  const closed = trades.filter((trade) => trade.reason !== 'open');
  let severe20 = 0;
  let severe25 = 0;
  let severe30 = 0;
  let labelled = 0;
  let deep = 0;
  let deepLabelled = 0;

  for (const trade of trades) {
    const label20 = reachLabel(bars.close, trade.signalIndex, trade.referenceHigh, 0.2, 40, outcomeEnd);

    if (label20 !== null) {
      labelled++;
      severe20 += label20 ? 1 : 0;
      severe25 += reachLabel(bars.close, trade.signalIndex, trade.referenceHigh, 0.25, 40, outcomeEnd) ? 1 : 0;
      severe30 += reachLabel(bars.close, trade.signalIndex, trade.referenceHigh, 0.3, 40, outcomeEnd) ? 1 : 0;
    }

    if (trade.entryIndex + 40 <= outcomeEnd) {
      deepLabelled++;
      let lowest = Infinity;

      for (let i = trade.entryIndex + 1; i <= trade.entryIndex + 40; i++) {
        lowest = Math.min(lowest, bars.close[i]!);
      }

      deep += lowest <= trade.entryPrice * 0.9 ? 1 : 0;
    }
  }

  const netProfit = result.mtm[to]! - start;
  const winners = trades.filter((trade) => trade.profit > 0).length;

  return {
    policyId: result.policyId,
    execution: result.execution,
    from: bars.date[from]!,
    to: bars.date[to]!,
    netProfit,
    interest: result.interestCharged[to]! - interestStart,
    maxDrawdown,
    objective: netProfit - maxDrawdown,
    entries: trades.length,
    closedTrades: closed.length,
    winners,
    losers: trades.length - winners,
    winRate: trades.length ? winners / trades.length : NaN,
    exposureSessions: exposure,
    meanHoldSessions: closed.length
      ? closed.reduce((sum, trade) => sum + trade.exitIndex - trade.entryIndex, 0) / closed.length
      : NaN,
    worstTrade: trades.reduce((worst, trade) => Math.min(worst, trade.profit), 0),
    worstTradeMae: trades.reduce((worst, trade) => Math.min(worst, trade.lowestLow / trade.entryPrice - 1), 0),
    worstOpenMark: trades.reduce((worst, trade) => Math.min(worst, trade.worstMark), 0),
    severeEntries20: severe20,
    severeEntries25: severe25,
    severeEntries30: severe30,
    labelledEntries: labelled,
    severeEntryRate20: labelled ? severe20 / labelled : NaN,
    severeEntryRate25: labelled ? severe25 / labelled : NaN,
    severeEntryRate30: labelled ? severe30 / labelled : NaN,
    deepFurtherDrop: deep,
    deepFurtherDropRate: deepLabelled ? deep / deepLabelled : NaN
  };
};

// Baseline trades with a profit that the strategy never overlapped: no strategy trade was open at any
// session of the baseline trade's holding span.
export const missedWinners = (strategy: SimulationResult, baseline: SimulationResult, from: number, to: number) => {
  const missed: Trade[] = [];

  for (const trade of tradesIn(baseline, from, to)) {
    if (trade.profit <= 0) {
      continue;
    }

    const end = trade.exitIndex === -1 ? baseline.endIndex : trade.exitIndex;
    let overlapped = false;

    for (let i = trade.entryIndex; i <= end && !overlapped; i++) {
      overlapped = strategy.inPosition[i] === 1 || strategy.trades.some((other) => other.exitIndex === i);
    }

    if (!overlapped) {
      missed.push(trade);
    }
  }

  return missed;
};

// Severe episodes: an episode is avoided when the baseline entered before its trough and the strategy did
// not. Also counts pre-trough entries.
export const episodeAvoidance = (
  strategy: SimulationResult,
  baseline: SimulationResult,
  episodes: Episode[],
  severe: (episode: Episode) => boolean
) => {
  let severeEpisodes = 0;
  let avoided = 0;
  let strategyPreTrough = 0;
  let baselinePreTrough = 0;

  for (const episode of episodes) {
    if (!severe(episode)) {
      continue;
    }

    severeEpisodes++;
    const inSpan = (trade: Trade) => trade.entryIndex >= episode.signalIndex && trade.entryIndex <= episode.troughIndex;
    const baselineCount = baseline.trades.filter(inSpan).length;
    const strategyCount = strategy.trades.filter(inSpan).length;

    baselinePreTrough += baselineCount;
    strategyPreTrough += strategyCount;
    avoided += baselineCount > 0 && strategyCount === 0 ? 1 : 0;
  }

  return { severeEpisodes, avoided, strategyPreTrough, baselinePreTrough };
};

// Profit attributed to an episode: the change in the mark over [signalIndex, endIndex] (clipped).
export const episodePnl = (result: SimulationResult, episode: Episode, clipTo: number) => {
  const end = Math.min(episode.endIndex, clipTo);

  if (end < episode.signalIndex) {
    return 0;
  }

  return result.mtm[end]! - markBefore(result, episode.signalIndex);
};

export const episodeWorstMark = (result: SimulationResult, episode: Episode, clipTo: number) => {
  const before = markBefore(result, episode.signalIndex);
  let worst = 0;

  for (let i = episode.signalIndex; i <= Math.min(episode.endIndex, clipTo); i++) {
    worst = Math.min(worst, result.mtm[i]! - before);
  }

  return worst;
};

// Candidate-level decision summary from a policy's decision log: per reference-high bar with at least one
// logged decision in the window.
export const candidateOutcomes = (result: SimulationResult, from: number, to: number) => {
  const byPeak = new Map<number, { entered: boolean; deferred: boolean; rejected: boolean }>();
  const get = (peak: number) => {
    const entry = byPeak.get(peak) ?? { entered: false, deferred: false, rejected: false };
    byPeak.set(peak, entry);
    return entry;
  };

  // Every logged decision (signal sessions, and rebound-zone sessions for family D's rebound variants).
  for (const row of result.decisions) {
    if (row.index < from || row.index > to || row.reason.startsWith('filled_next_open')) {
      continue;
    }

    const entry = get(row.peakIndex);

    entry.rejected ||= row.reason.startsWith('reject');
    entry.deferred ||= !row.enter && !row.reason.startsWith('reject') && row.reason !== 'no_signal';
  }

  // A candidate is entered when a trade's signal session belongs to its reference-high bar.
  for (const trade of result.trades) {
    if (trade.signalIndex >= from && trade.signalIndex <= to) {
      get(trade.peakIndex).entered = true;
    }
  }

  const values = [...byPeak.values()];

  return {
    candidates: values.length,
    entered: values.filter((value) => value.entered).length,
    rejected: values.filter((value) => value.rejected && !value.entered).length,
    deferredThenEntered: values.filter((value) => value.deferred && value.entered).length,
    neverEntered: values.filter((value) => !value.entered).length
  };
};
