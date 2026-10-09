// 5% ladder from 15% down to 30%

import type { Tick, BacktestPosition } from '#types';
import { PositionType } from '#types';
import { loadCsvBacktestData } from '#lib';

export default async () => {
  const ticks = await loadCsvBacktestData('VOOG', 'data/VOOG/VOOG-2016-2026.csv');
  const tickWindowSize = 90;
  const positions: BacktestPosition[] = [];
  const marginBalance = 100000; // Fixed balance every ladder is sized from, regardless of past results
  const investmentPercentage = 0.05; // 5% of the margin balance per rung
  const ladderPercentChanges = [0.15, 0.2, 0.25, 0.3]; // 15%, 20%, 25%, and 30% change
  const trailingStopPercentage = 0.04; // 8% drop from the post-entry high
  const marginInterestRate = 0.11; // 11% annual interest charged by Vanguard on margin
  let postEntryHigh = 0;
  let nextRungIndex = 0;

  const formatDollars = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
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
    const recentHigh = Math.max(...tickWindow.map((windowTick) => windowTick.close));
    const percentChange = 1 - tick.close / recentHigh;

    // Skip the first tick.
    if (index === 0) {
      return;
    }

    const openPositions = positions.filter((position) => position.isOpen);
    let sell = false;

    // Enter one position per rung reached. A large drop can cross several rungs on a single tick.
    while (nextRungIndex < ladderPercentChanges.length && percentChange >= ladderPercentChanges[nextRungIndex]!) {
      // Vanguard allows partial shares.
      const investment = marginBalance * investmentPercentage;
      const shares = investment / tick.close;

      positions.push({
        isOpen: true,
        symbol: 'VOOG',
        type: PositionType.Long,
        shares,
        investment,
        entryTimestamp: tick.time,
        entryPrice: tick.close
      });

      postEntryHigh = tick.close;

      console.info(
        `Entered ${formatDollars(investment)} at ${ladderPercentChanges[nextRungIndex]! * 100}% change on ${new Date(tick.time * 1000).toISOString()} from ${recentHigh} to ${tick.close}`
      );

      nextRungIndex++;
    }

    // Trailing stop: exit all positions once the price has risen above the average entry price
    // and then dropped by at least 8% from the post-entry high, but only if the exit is profitable.
    if (openPositions.length > 0) {
      postEntryHigh = Math.max(postEntryHigh, tick.close);

      const totalShares = openPositions.reduce((sum, position) => sum + position.shares, 0);
      const totalInvestment = openPositions.reduce((sum, position) => sum + position.investment, 0);
      const totalInterest = openPositions.reduce((sum, position) => sum + calculateInterest(position, tick.time), 0);
      const averageEntryPrice = totalInvestment / totalShares;
      const dropFromHigh = 1 - tick.close / postEntryHigh;
      const proceeds = totalShares * tick.close;

      sell =
        postEntryHigh > averageEntryPrice &&
        dropFromHigh >= trailingStopPercentage &&
        proceeds - totalInterest > totalInvestment;
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

        console.info(
          `Exited at ${new Date(tick.time * 1000).toISOString()} from ${position.entryPrice} to ${tick.close} for a profit of ${formatDollars(position.profit)} after ${formatDollars(interest)} in interest`
        );
      });

      const totalInvestment = openPositions.reduce((sum, position) => sum + position.investment, 0);
      const totalInterest = openPositions.reduce((sum, position) => sum + (position.interest ?? 0), 0);
      const totalProfit = openPositions.reduce((sum, position) => sum + (position.profit ?? 0), 0);

      console.info(
        `Total profit of ${formatDollars(totalProfit)} after ${formatDollars(totalInterest)} in interest on ${formatDollars(totalInvestment)} invested\n`
      );

      // Start a new ladder once all positions are closed.
      nextRungIndex = 0;
    }
  });

  const totalProfit = positions.reduce((total, position) => total + (position.profit ?? 0), 0);

  console.info(`Total profit: ${formatDollars(totalProfit)}`);
  console.info(`Rung size: ${formatDollars(marginBalance * investmentPercentage)}`);
  console.info(
    `Ladder percent changes: ${ladderPercentChanges.map((percentChange) => formatPercent(percentChange)).join(', ')}`
  );
  console.info(`Trailing stop percentage: ${formatPercent(trailingStopPercentage)}`);
};
