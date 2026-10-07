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

  ticks.forEach((tick, index) => {
    const tickWindow: Tick[] = ticks.slice(Math.max(0, index - tickWindowSize), index);
    const recentHigh = Math.max(...tickWindow.map((windowTick) => windowTick.close));
    const percentChange = 1 - tick.close / recentHigh;

    // Skip the first tick.
    if (index === 0) {
      return;
    }

    const openPositions = positions.filter((position) => position.isOpen);
    const buy = positions.length === 0 && percentChange >= 0.15;
    const sell = false;

    if (buy) {
      console.info(`15% change on ${new Date(tick.time * 1000).toISOString()} from ${recentHigh} to ${tick.close}`);

      // Vanguard allows partial shares.
      const shares = marginBalance / tick.close;
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
    }

    // TODO: Implement a trailing stop of 8%.

    if (sell) {
      openPositions.forEach((position) => {
        const proceeds = position.shares * tick.close;
        const commission = position.commission ?? 0;

        position.isOpen = false;
        position.exitTimestamp = tick.time;
        position.exitPrice = tick.close;
        position.profit = proceeds - position.investment;
        position.netProfit = position.profit - commission;

        marginBalance += proceeds - commission;
      }
    }
  });
};
