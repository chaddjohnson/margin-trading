// Window metrics from one continuous run. A window's P&L is the change in the daily mark-to-market P&L
// over the window (realized + open position at the close, net of interest), so trades crossing a window
// boundary are attributed by what they earned inside it and nothing is closed artificially. The window's
// drawdown is measured from a running peak that starts at the window's opening value.
import type { Bars, SimulationResult } from './engine.ts';

export interface YearPnl {
  year: number;
  pnl: number;
}

export interface WindowMetrics {
  firstIndex: number;
  lastIndex: number;
  firstDate: string;
  lastDate: string;
  sessions: number;
  years: number; // calendar years spanned, (last time - first time) / 365.25 days
  netProfit: number; // mark-to-market change, net of interest
  realizedInWindow: number; // profit of trades that exited inside the window (whole trade)
  openAtEnd: boolean;
  openMarkAtEnd: number; // P&L of the position open at the window's last close, if any
  interest: number;
  maximumDrawdown: number;
  drawdownPeakDate: string;
  drawdownTroughDate: string;
  entries: number;
  closedTrades: number;
  wins: number;
  winRate: number;
  timeInMarket: number;
  worstTradeMark: number; // lowest close-based mark of an open trade at a window close (dollars, <= 0 or 0)
  worstTradeLowDrop: number; // largest drop of a held session's low (or exit fill) below entry, in the window
  setupsArmed: number;
  setupsFilled: number;
  setupsCancelled: number;
  setupsExpired: number;
  setupsPendingAtEnd: number;
  meanWaitSessions: number; // arm -> decision, setups decided in the window
  medianWaitSessions: number;
  restrictedEntries: number;
  annual: YearPnl[];
}

const median = (values: number[]) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

export const windowMetrics = (
  bars: Bars,
  result: SimulationResult,
  firstIndex: number,
  lastIndex: number
): WindowMetrics => {
  if (firstIndex < result.startIndex || lastIndex > result.endIndex || firstIndex > lastIndex) {
    throw new Error(`Window ${firstIndex}..${lastIndex} is outside the run ${result.startIndex}..${result.endIndex}`);
  }

  const { mtm, interestCum, inPosition } = result;
  const base = firstIndex > result.startIndex ? mtm[firstIndex - 1]! : 0;
  const interestBase = firstIndex > result.startIndex ? interestCum[firstIndex - 1]! : 0;
  let peak = base;
  let peakIndex = firstIndex;
  let maximumDrawdown = 0;
  let drawdownPeakIndex = firstIndex;
  let drawdownTroughIndex = firstIndex;
  let held = 0;
  let worstTradeMark = 0;
  let worstTradeLowDrop = 0;

  for (let index = firstIndex; index <= lastIndex; index++) {
    const value = mtm[index]!;

    if (inPosition[index]) {
      worstTradeMark = Math.min(worstTradeMark, result.openMark[index]!);
    }

    worstTradeLowDrop = Math.max(worstTradeLowDrop, result.adverse[index]!);

    if (value > peak) {
      peak = value;
      peakIndex = index;
    }

    if (peak - value > maximumDrawdown) {
      maximumDrawdown = peak - value;
      drawdownPeakIndex = peakIndex;
      drawdownTroughIndex = index;
    }

    held += inPosition[index]!;
  }

  const inWindow = (index: number) => index >= firstIndex && index <= lastIndex;
  const entered = result.trades.filter((trade) => inWindow(trade.entryIndex));
  const closed = result.trades.filter((trade) => trade.exitIndex !== -1 && inWindow(trade.exitIndex));
  const armed = result.setups.filter((setup) => inWindow(setup.armIndex));
  const decided = result.setups.filter((setup) => setup.decisionIndex !== -1 && inWindow(setup.decisionIndex));
  const waits = decided.map((setup) => setup.decisionIndex - setup.armIndex);
  const wins = closed.filter((trade) => trade.profit > 0).length;
  const annual: YearPnl[] = [];
  let yearStartValue = base;

  for (let index = firstIndex; index <= lastIndex; index++) {
    const year = Number(bars.date[index]!.slice(0, 4));
    const isYearEnd = index === lastIndex || Number(bars.date[index + 1]!.slice(0, 4)) !== year;

    if (isYearEnd) {
      annual.push({ year, pnl: mtm[index]! - yearStartValue });
      yearStartValue = mtm[index]!;
    }
  }

  return {
    firstIndex,
    lastIndex,
    firstDate: bars.date[firstIndex]!,
    lastDate: bars.date[lastIndex]!,
    sessions: lastIndex - firstIndex + 1,
    years: (bars.time[lastIndex]! - bars.time[firstIndex]!) / (365.25 * 86400),
    netProfit: mtm[lastIndex]! - base,
    realizedInWindow: closed.reduce((total, trade) => total + trade.profit, 0),
    openAtEnd: inPosition[lastIndex] === 1,
    openMarkAtEnd: result.openMark[lastIndex]!,
    interest: interestCum[lastIndex]! - interestBase,
    maximumDrawdown,
    drawdownPeakDate: bars.date[drawdownPeakIndex]!,
    drawdownTroughDate: bars.date[drawdownTroughIndex]!,
    entries: entered.length,
    closedTrades: closed.length,
    wins,
    winRate: closed.length ? wins / closed.length : NaN,
    timeInMarket: held / (lastIndex - firstIndex + 1),
    worstTradeMark,
    worstTradeLowDrop,
    setupsArmed: armed.length,
    setupsFilled: armed.filter((setup) => setup.outcome === 'filled').length,
    setupsCancelled: armed.filter((setup) => setup.outcome === 'cancelled_reset').length,
    setupsExpired: armed.filter((setup) => setup.outcome === 'expired').length,
    // Still waiting after the window's last close: armed by then and not decided, cancelled or expired by then.
    setupsPendingAtEnd: result.setups.filter(
      (setup) => setup.armIndex <= lastIndex && (setup.outcome === 'pending_at_end' || setup.endIndex > lastIndex)
    ).length,
    meanWaitSessions: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : NaN,
    medianWaitSessions: median(waits),
    restrictedEntries: entered.filter((trade) => trade.restrictedEntry).length,
    annual
  };
};
