// Ladder on the way up: enter once a 15%+ decline has stabilized, then add a 5% rung for each 5% rise

import type { BacktestPosition } from '#types';
import { PositionType } from '#types';
import { loadCsvBacktestData } from '#lib';

export default async () => {
  const ticks = await loadCsvBacktestData('VOOG', 'data/VOOG/VOOG-2016-2026.csv');
  const tickWindowSize = 90;
  const positions: BacktestPosition[] = [];
  const marginBalance = 100000; // Fixed balance every ladder is sized from, regardless of past results
  const investmentPercentage = 0.05; // 5% of the margin balance per rung
  const minimumDeclinePercentage = 0.12; // Decline from the recent high required before the ladder can start
  const stabilizationTicks = 10; // Ticks without a new low before the decline is considered stabilized
  const ladderPercentChanges = [0, 0.05, 0.1, 0.15]; // Rise from the first entry price for each rung
  const trailingStopPercentage = 0.04; // 8% drop from the post-entry high
  const marginInterestRate = 0.11; // 11% annual interest charged by Vanguard on margin
  let postEntryHigh = 0;
  let nextRungIndex = 0;
  let firstEntryPrice = 0;
  let lastExitIndex = 0;

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
    // Skip the first tick.
    if (index === 0) {
      return;
    }

    const openPositions = positions.filter((position) => position.isOpen);
    let sell = false;

    // Start a ladder once the price has declined at least 15% from the recent high and has not made a new
    // low for a while. Only ticks since the last exit are considered so a finished ladder's decline can't
    // immediately start another one.
    if (nextRungIndex === 0) {
      const windowStartIndex = Math.max(0, index - tickWindowSize, lastExitIndex);
      let highIndex = windowStartIndex;
      let lowIndex = windowStartIndex;

      for (let windowIndex = windowStartIndex; windowIndex <= index; windowIndex++) {
        if (ticks[windowIndex]!.close >= ticks[highIndex]!.close) {
          highIndex = windowIndex;
          lowIndex = windowIndex;
        } else if (ticks[windowIndex]!.close <= ticks[lowIndex]!.close) {
          lowIndex = windowIndex;
        }
      }

      const recentHigh = ticks[highIndex]!.close;
      const low = ticks[lowIndex]!.close;
      const decline = 1 - low / recentHigh;
      const stabilized = index - lowIndex >= stabilizationTicks;

      if (decline >= minimumDeclinePercentage && stabilized) {
        firstEntryPrice = tick.close;

        console.info(
          `Decline of ${(decline * 100).toFixed(1)}% from ${recentHigh} to ${low} stabilized on ${new Date(tick.time * 1000).toISOString()}`
        );
      }
    }

    // Enter one position per rung reached. A large rise can cross several rungs on a single tick.
    while (
      firstEntryPrice > 0 &&
      nextRungIndex < ladderPercentChanges.length &&
      tick.close >= firstEntryPrice * (1 + ladderPercentChanges[nextRungIndex]!)
    ) {
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

      postEntryHigh = Math.max(postEntryHigh, tick.close);

      console.info(
        `Entered ${formatDollars(investment)} at ${ladderPercentChanges[nextRungIndex]! * 100}% rise on ${new Date(tick.time * 1000).toISOString()} from ${firstEntryPrice} to ${tick.close}`
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
      firstEntryPrice = 0;
      postEntryHigh = 0;
      lastExitIndex = index;
    }
  });

  const totalProfit = positions.reduce((total, position) => total + (position.profit ?? 0), 0);

  console.info(`Total profit: ${formatDollars(totalProfit)}`);
  console.info(`Rung size: ${formatDollars(marginBalance * investmentPercentage)}`);
  console.info(
    `Ladder percent changes: ${ladderPercentChanges.map((percentChange) => formatPercent(percentChange)).join(', ')}`
  );
  console.info(`Minimum decline percentage: ${formatPercent(minimumDeclinePercentage)}`);
  console.info(`Stabilization ticks: ${stabilizationTicks}`);
  console.info(`Trailing stop percentage: ${formatPercent(trailingStopPercentage)}`);
};
