// All in at 15%

import type { Tick, BacktestPosition } from '#types';
import { PositionType } from '#types';
import { loadCsvBacktestData } from '#lib';

export default async () => {
  const ticks = await loadCsvBacktestData('VGT', 'data/VGT/VGT-2016-2026.csv');
  const tickWindowSize = 90;
  const positions: BacktestPosition[] = [];
  let marginBalance = 100000;
  const investmentPercentage = 1.0; // 100% of margin balance
  const targetPercentChange = 0.12; // 12% change
  const trailingStopPercentage = 0.04; // 4% drop from the post-entry high
  const marginInterestRate = 0.11; // 11% annual interest charged by Vanguard on margin
  let postEntryHigh = 0;

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

  // Simple interest on the borrowed amount, accrued for the time the position has been held.
  const calculateInterest = (position: BacktestPosition, timestamp: number) => {
    const yearsHeld = (timestamp - position.entryTimestamp) / (365 * 24 * 60 * 60);

    return position.investment * marginInterestRate * yearsHeld;
  };

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
    let sell = false;
    let exitPrice = 0;

    if (buy) {
      // Vanguard allows partial shares.
      const shares = (marginBalance * investmentPercentage) / tick.close;
      const investment = shares * tick.close;

      positions.push({
        isOpen: true,
        symbol: 'VGT',
        type: PositionType.Long,
        shares,
        investment,
        entryTimestamp: tick.time,
        entryPrice: tick.close
      });

      marginBalance -= investment;
      postEntryHigh = tick.close;

      console.info(
        `Entered at ${targetPercentChange * 100}% change on ${new Date(tick.time * 1000).toISOString()} from ${formatPrice(recentHigh)} to ${formatPrice(tick.close)}`
      );
    }

    // Trailing stop: exit once the price has risen above the entry price and then the intraday
    // low drops to the stop price below the post-entry high, but only if the exit is profitable.
    const [position] = openPositions;

    // Only apply the trailing stop when exactly one position is open. The `position` check also
    // narrows its type, since destructuring an array yields `BacktestPosition | undefined`.
    if (position && openPositions.length === 1) {
      // Test against the previous post-entry high before raising it with today's high, since daily
      // bars don't say whether the high or the low came first.
      const stopPrice = postEntryHigh * (1 - trailingStopPercentage);

      // A stop order fills at the stop price, or at the open if the price gapped down past it.
      exitPrice = Math.min(stopPrice, tick.open);

      const proceeds = position.shares * exitPrice;
      const interest = calculateInterest(position, tick.time);

      sell = postEntryHigh > position.entryPrice && tick.low <= stopPrice && proceeds - interest > position.investment;

      postEntryHigh = Math.max(postEntryHigh, tick.high);
    }

    if (sell) {
      openPositions.forEach((position) => {
        const proceeds = position.shares * exitPrice;
        const interest = calculateInterest(position, tick.time);

        position.isOpen = false;
        position.exitTimestamp = tick.time;
        position.exitPrice = exitPrice;
        position.interest = interest;
        position.profit = proceeds - position.investment - interest;

        marginBalance += proceeds - interest;

        const monthsHeld = (tick.time - position.entryTimestamp) / ((365 / 12) * 24 * 60 * 60);

        console.info(
          `Exited at ${new Date(tick.time * 1000).toISOString()} from ${formatPrice(position.entryPrice)} to ${formatPrice(exitPrice)} for a profit of ${formatDollars(position.profit)} after ${formatDollars(interest)} in interest`
        );
        console.info(`Held for ${formatMonths(monthsHeld)} months\n`);
      });
    }
  });

  const totalProfit = positions.reduce((total, position) => total + (position.profit ?? 0), 0);

  console.info(`Total profit: ${formatDollars(totalProfit)}`);
  console.info(`Target percent change: ${formatPercent(targetPercentChange)}`);
  console.info(`Trailing stop percentage: ${formatPercent(trailingStopPercentage)}`);
};
