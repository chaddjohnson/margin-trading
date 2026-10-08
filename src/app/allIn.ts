// All in at 15%, 20%, 25%, and 30%

import type { Tick, BacktestPosition } from '#types';
import { PositionType } from '#types';
import { loadCsvBacktestData } from '#lib';

export default async () => {
  const ticks = await loadCsvBacktestData('VOOG', 'data/VOOG/VOOG-2016-2026.csv');
  const tickWindowSize = 90;
  const positions: BacktestPosition[] = [];
  let marginBalance = 100000;
  const investmentPercentage = 1.0; // 100% of margin balance
  const targetPercentChange = 0.15; // 15% change
  const trailingStopPercentage = 0.08; // 8% drop from the post-entry high
  const marginInterestRate = 0.11; // 11% annual interest charged by Vanguard on margin
  let postEntryHigh = 0;

  const formatDollars = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format;

  // Simple interest on the borrowed amount, accrued for the time the position has been held.
  const calculateInterest = (position: BacktestPosition, timestamp: number) => {
    const yearsHeld = (timestamp - position.entryTimestamp) / (365 * 24 * 60 * 60);

    return position.investment * marginInterestRate * yearsHeld;
  };

  ticks.forEach((tick, index) => {
    const tickWindow: Tick[] = ticks.slice(Math.max(0, index - tickWindowSize), index);
    const recentHigh = Math.max(...tickWindow.map((windowTick) => windowTick.close));
    const percentChange = 1 - tick.close / recentHigh;

    // Skip the first tick.
    if (index === 0) {
      return;
    }

    const openPositions = positions.filter((position) => position.isOpen);
    const buy = openPositions.length === 0 && percentChange >= targetPercentChange;
    let sell = false;

    if (buy) {
      // Vanguard allows partial shares.
      const shares = (marginBalance * investmentPercentage) / tick.close;
      const investment = shares * tick.close;

      positions.push({
        isOpen: true,
        symbol: 'VOOG',
        type: PositionType.Long,
        shares,
        investment,
        entryTimestamp: tick.time,
        entryPrice: tick.close
      });

      marginBalance -= investment;
      postEntryHigh = tick.close;

      console.info(
        `Entered at ${targetPercentChange * 100}% change on ${new Date(tick.time * 1000).toISOString()} from ${recentHigh} to ${tick.close}`
      );
    }

    // Trailing stop: exit once the price has risen above the entry price and then dropped
    // by at least 8% from the post-entry high, but only if the exit is profitable.
    const [position] = openPositions;

    // Only apply the trailing stop when exactly one position is open. The `position` check also
    // narrows its type, since destructuring an array yields `BacktestPosition | undefined`.
    if (position && openPositions.length === 1) {
      postEntryHigh = Math.max(postEntryHigh, tick.close);

      const dropFromHigh = 1 - tick.close / postEntryHigh;
      const proceeds = position.shares * tick.close;
      const interest = calculateInterest(position, tick.time);

      sell =
        postEntryHigh > position.entryPrice &&
        dropFromHigh >= trailingStopPercentage &&
        proceeds - interest > position.investment;
    }

    if (sell) {
      openPositions.forEach((position) => {
        const proceeds = position.shares * tick.close;
        const interest = calculateInterest(position, tick.time);

        position.isOpen = false;
        position.exitTimestamp = tick.time;
        position.exitPrice = tick.close;
        position.interest = interest;
        position.profit = proceeds - position.investment - interest;

        marginBalance += proceeds - interest;

        console.info(
          `Exited at ${new Date(tick.time * 1000).toISOString()} from ${position.entryPrice} to ${tick.close} for a profit of ${formatDollars(position.profit)} after ${formatDollars(interest)} in interest\n`
        );
      });
    }
  });
};
