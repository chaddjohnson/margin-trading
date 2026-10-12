// All in at 15%
//
// Execution model, and the limits of daily OHLC bars:
// - A bar gives a session's open, high, low and close, but not the order they happened in or any
//   intraday times. Exits are processed in a fixed order: the open first, then the rest of the session
//   as one span in which the low may reach the stop.
// - Entries fill at the signal day's close. This is a deliberate approximation that assumes the order
//   goes in just before the close at about the closing price, even though the signal uses that close.
// - The trailing stop is updated once a day. Its level comes from the highest high through the previous
//   session, so a session's own high never moves that session's stop, whichever came first.
// - A triggered stop fills at exactly the stop price, or at the open when the session opens at or below
//   it. Real stop-market orders can fill lower in fast markets, and the bid-ask spread isn't modeled.
// - Interest accrues per calendar day from the entry date to the exit date, and none on the entry day.
//   Without intraday times, a sale at the open, at a stop during the session or at the close all accrue
//   interest through that day, which slightly overstates interest for sales early in the session.
// - Prices are used as given in the CSV. Dividends aren't modeled beyond any adjustment in the data.

import type { Tick, BacktestPosition } from '#types';
import { PositionType } from '#types';
import { loadCsvBacktestData } from '#lib';

const secondsPerDay = 24 * 60 * 60;

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap';

export interface SessionExit {
  reason: ExitReason;
  price: number;
  // Whether the trailing stop also triggered, which is only in doubt when the maximum hold takes the exit.
  isStopTriggered: boolean;
}

export interface SessionExitOptions {
  position: BacktestPosition;
  tick: Tick;
  // Set before the session from the post-entry high through the previous session.
  stopPrice: number;
  // Accrued through this session's date, which is known before the session opens.
  interest: number;
  maximumHoldDays: number;
}

// Decides whether an open position exits during one session, in chronological order.
export const evaluateSessionExit = ({
  position,
  tick,
  stopPrice,
  interest,
  maximumHoldDays
}: SessionExitOptions): SessionExit | undefined => {
  const profitAt = (price: number) => position.shares * price - position.investment - interest;

  // Before the open: the stop is active for this session only if filling at the stop price would be
  // profitable after interest through the session. Nothing from the session's own prices is used, and
  // the decision is made afresh each session, so growing interest can leave the stop inactive.
  const isStopActive = profitAt(stopPrice) > 0;
  const isStopTriggeredAtOpen = isStopActive && tick.open <= stopPrice;

  // At the open: the maximum hold sells if a sale at the open would lose money. When the open also gaps
  // through an active stop, both rules sell at the open, so there's a single fill credited to the maximum
  // hold.
  const daysHeld = (tick.time - position.entryTimestamp) / secondsPerDay;

  if (daysHeld >= maximumHoldDays && profitAt(tick.open) < 0) {
    return { reason: 'maximum hold', price: tick.open, isStopTriggered: isStopTriggeredAtOpen };
  }

  // A stop-market order fills at the open when the session gaps through it, even if that loses money.
  if (isStopTriggeredAtOpen) {
    return { reason: 'trailing stop gap', price: tick.open, isStopTriggered: true };
  }

  // During the session: an active stop fills at its price once the low reaches it.
  if (isStopActive && tick.low <= stopPrice) {
    return { reason: 'trailing stop', price: stopPrice, isStopTriggered: true };
  }

  return undefined;
};

// Run with `npm run app allIn [symbol] [start date] [end date]`, for example
// `npm run app allIn QQQ 2016-10-07 2026-10-06`. The symbol defaults to VGT, and the inclusive YYYY-MM-DD
// dates default to the whole data file.
export default async (symbol = 'VGT', startDate?: string, endDate?: string, dataFile?: string) => {
  const startTimestamp = startDate ? Date.parse(startDate) / 1000 : -Infinity;
  const endTimestamp = endDate ? Date.parse(endDate) / 1000 : Infinity;

  if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) {
    throw new Error('Start and end dates must be YYYY-MM-DD');
  }

  // REFERENCE COPY: the only change from src/app/allIn.ts is that the data file is passed in.
  const allTicks = await loadCsvBacktestData(symbol, dataFile ?? `data/${symbol}/${symbol}-1999-2015.csv`);
  const ticks = allTicks.filter((tick) => tick.time >= startTimestamp && tick.time <= endTimestamp);
  const tickWindowSize = 90;
  const positions: BacktestPosition[] = [];
  const investmentAmount = 100000; // Margin borrowed for every position, regardless of past results
  const targetPercentChange = 0.1; // target change
  const trailingStopPercentage = 0.08; //  drop from the post-entry high
  const maximumHoldDays = 15; // days before a losing position is sold
  const marginInterestRate = 0.11; // annual interest charged by Vanguard on margin
  let postEntryHigh = 0;
  let postEntryLow = 0;
  let stopPrice = 0;
  let realizedProfit = 0;
  let peakProfit = 0;
  let peakTimestamp = ticks[0]?.time ?? 0;
  let maximumDrawdown = 0;
  let drawdownPeakTimestamp = peakTimestamp;
  let drawdownTroughTimestamp = peakTimestamp;

  const formatDollars = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format;

  const formatMonths = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1
  }).format;

  const formatPrice = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format;

  const formatPercent = new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 2
  }).format;

  const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

  const exitReasonDescriptions: Record<ExitReason, string> = {
    'maximum hold': `${maximumHoldDays}-day loss exit at the open`,
    'trailing stop': 'trailing stop',
    'trailing stop gap': 'trailing stop, filled at the open after a gap down'
  };

  // Simple interest on the borrowed amount, accrued for the time the position has been held.
  const calculateInterest = (position: BacktestPosition, timestamp: number) => {
    const yearsHeld = (timestamp - position.entryTimestamp) / (365 * secondsPerDay);

    return position.investment * marginInterestRate * yearsHeld;
  };

  // An open position marked to the close, net of the interest accrued through that day.
  const calculateUnrealizedProfit = (position: BacktestPosition, tick: Tick) =>
    position.shares * tick.close - position.investment - calculateInterest(position, tick.time);

  ticks.forEach((tick, index) => {
    const tickWindow: Tick[] = ticks.slice(Math.max(0, index - tickWindowSize), index);
    const recentHigh = Math.max(...tickWindow.map((windowTick) => windowTick.high));
    const percentChange = 1 - tick.close / recentHigh;

    // Skip the first tick.
    if (index === 0) {
      return;
    }

    const openPositions = positions.filter((position) => position.isOpen);
    const buy = openPositions.length === 0 && percentChange >= targetPercentChange;

    if (buy) {
      // Vanguard allows partial shares.
      const shares = investmentAmount / tick.close;

      positions.push({
        isOpen: true,
        symbol,
        type: PositionType.Long,
        shares,
        investment: investmentAmount,
        entryTimestamp: tick.time,
        entryPrice: tick.close
      });

      postEntryHigh = tick.close;
      postEntryLow = tick.close;
      stopPrice = postEntryHigh * (1 - trailingStopPercentage);

      console.info(
        `Entered at ${targetPercentChange * 100}% change on ${new Date(tick.time * 1000).toISOString()} from ${formatPrice(recentHigh)} to ${formatPrice(tick.close)}`
      );
    }

    const [position] = openPositions;

    // Only apply the exits when exactly one position is open. The `position` check also
    // narrows its type, since destructuring an array yields `BacktestPosition | undefined`.
    if (position && openPositions.length === 1) {
      const interest = calculateInterest(position, tick.time);
      const exit = evaluateSessionExit({ position, tick, stopPrice, interest, maximumHoldDays });

      if (exit) {
        position.isOpen = false;
        position.exitTimestamp = tick.time;
        position.exitPrice = exit.price;
        position.interest = interest;
        position.profit = position.shares * exit.price - position.investment - interest;
        realizedProfit += position.profit;

        const monthsHeld = (tick.time - position.entryTimestamp) / ((365 / 12) * secondsPerDay);
        const alsoTriggered =
          exit.reason === 'maximum hold' && exit.isStopTriggered
            ? ' (the trailing stop also triggered at the open)'
            : '';

        console.info(
          `Exited at ${new Date(tick.time * 1000).toISOString()} from ${formatPrice(position.entryPrice)} to ${formatPrice(exit.price)} for a profit of ${formatDollars(position.profit)} after ${formatDollars(interest)} in interest`
        );
        console.info(`Exit reason: ${exitReasonDescriptions[exit.reason]}${alsoTriggered}`);
        // The lowest price seen while the position was open, including the exit itself. The exit
        // day's low may have come after the fill, so it's left out.
        const lowestLow = Math.min(postEntryLow, exit.price);
        const dropToLowestLow = 1 - lowestLow / position.entryPrice;

        console.info(`Held for ${formatMonths(monthsHeld)} months`);
        console.info(`Lowest low: ${formatPrice(lowestLow)} (${formatPercent(dropToLowestLow)} below entry)\n`);
      } else {
        // After the session, raise the high and the stop for the next session. The stop never moves down.
        postEntryHigh = Math.max(postEntryHigh, tick.high);
        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
        postEntryLow = Math.min(postEntryLow, tick.low);
      }
    }

    // Daily mark-to-market profit: realized profit plus any open position at the close, net of interest.
    const openPosition = positions.find((position) => position.isOpen);
    const markedProfit = realizedProfit + (openPosition ? calculateUnrealizedProfit(openPosition, tick) : 0);

    if (markedProfit > peakProfit) {
      peakProfit = markedProfit;
      peakTimestamp = tick.time;
    }

    if (peakProfit - markedProfit > maximumDrawdown) {
      maximumDrawdown = peakProfit - markedProfit;
      drawdownPeakTimestamp = peakTimestamp;
      drawdownTroughTimestamp = tick.time;
    }
  });

  const closedPositions = positions.filter((position) => !position.isOpen);
  const openPosition = positions.find((position) => position.isOpen);
  const lastTick = ticks.at(-1);
  const closedInterest = closedPositions.reduce((total, position) => total + (position.interest ?? 0), 0);
  const accruedInterest = openPosition && lastTick ? calculateInterest(openPosition, lastTick.time) : 0;
  const unrealizedProfit = openPosition && lastTick ? calculateUnrealizedProfit(openPosition, lastTick) : 0;

  if (openPosition && lastTick) {
    console.info(
      `Still open on ${new Date(lastTick.time * 1000).toISOString()}: entered at ${formatPrice(openPosition.entryPrice)} and marked at the close of ${formatPrice(lastTick.close)} for an unrealized profit of ${formatDollars(unrealizedProfit)} after ${formatDollars(accruedInterest)} in accrued interest\n`
    );
  }

  const firstTick = ticks[0];

  if (firstTick && lastTick) {
    console.info(`Symbol: ${symbol}, from ${formatDate(firstTick.time)} to ${formatDate(lastTick.time)}`);
  }

  console.info(`Closed trades: ${closedPositions.length}${openPosition ? ', plus 1 still open' : ''}`);
  console.info(`Realized profit: ${formatDollars(realizedProfit)}`);
  console.info(`Unrealized profit on the open position: ${formatDollars(unrealizedProfit)}`);
  console.info(`Total net profit: ${formatDollars(realizedProfit + unrealizedProfit)}`);
  console.info(
    `Margin interest: ${formatDollars(closedInterest + accruedInterest)} (${formatDollars(closedInterest)} on closed trades, ${formatDollars(accruedInterest)} accrued on the open position)`
  );
  console.info(
    `Maximum drawdown (daily mark-to-market): ${formatDollars(maximumDrawdown)}, from ${formatDate(drawdownPeakTimestamp)} to ${formatDate(drawdownTroughTimestamp)}`
  );
  console.info(
    `Maximum drawdown as a capital-allocation reference: ${formatPercent(maximumDrawdown / investmentAmount)} of the ${formatDollars(investmentAmount)} trading allocation (not a drawdown of invested equity or of the overall portfolio)`
  );
  console.info(`Target percent change: ${formatPercent(targetPercentChange)}`);
  console.info(`Trailing stop percentage: ${formatPercent(trailingStopPercentage)}`);
  console.info(`Maximum hold: ${maximumHoldDays} days`);
};
