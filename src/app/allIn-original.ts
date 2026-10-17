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
//
// Re-entry after a losing trade (validated trade for trade against the research implementation in
// research/risk-management/adaptive-reentry, configuration A2_material_05 + 3% + C6_retrace_38):
// - A trade whose ETF price return (exit price / entry price - 1, interest excluded) is at most -0.5%
//   makes the strategy RESTRICTED_AFTER_LOSS. A smaller price loss, or a loss caused only by interest,
//   leaves normal entry eligibility in place.
// - The restriction freezes the losing exit's actual execution price and the 90-session reference high
//   used by the losing trade's entry signal, and tracks the lowest close since the exit session.
// - While restricted, a new entry needs the original 10% signal AND a close at or below 97% of the
//   frozen loss-exit price. The restriction clears when a new position opens, or when a close recovers
//   38% of the decline from the frozen reference high to the episode low (recovery reset, evaluated at
//   every close while restricted and flat, including the exit session itself). A reset never buys by
//   itself: on a session whose close qualifies as a reset, the reset takes priority and entries resume
//   from the next session.

import type { BacktestPosition, Tick } from '#types';
import { PositionType } from '#types';
import { loadCsvBacktestData } from '#lib';
import fs from 'fs-extra';

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

// The re-entry restriction, frozen when a materially losing trade exits. Only the episode low moves.
interface Restriction {
  lossExitPrice: number;
  referenceHigh: number;
  lowerLevel: number; // lossExitPrice * (1 - lowerPriceReentry)
  episodeLow: number; // lowest close since the exit session, inclusive
}

type State = 'NORMAL' | 'RESTRICTED';

interface StateLogRow {
  index: number;
  date: string;
  prevState: State;
  newState: State;
  reason: string;
  exitReason: string;
  tradeProfit: number | '';
  priceReturn: number | '';
  lossExitPrice: number | '';
  refHigh: number | '';
  lowerLevel: number | '';
  episodeLow: number | '';
  resetLevel: number | '';
  close: number;
  signal: boolean;
  entryExecuted: boolean;
}

interface Episode {
  exitIndex: number;
  exitDate: string;
  exitReason: ExitReason;
  loss: number;
  priceReturn: number;
  lossExitPrice: number;
  losingEntryPrice: number;
  referenceHigh: number;
  episodeLow: number;
  resolution: 'lower_price_reentry' | 'recovery_reset' | 'unresolved_at_end' | '';
  resolutionDate: string;
}

// Run with `npm run app allIn [symbol] [start date] [end date] [data file] [output dir]`, for example
// `npm run app allIn VGT 2016-10-07 2025-12-31 data/VGT/VGT-2016-2026.csv`. The symbol defaults to VGT,
// the inclusive YYYY-MM-DD dates default to the whole data file, and the data file defaults to the
// symbol's 2016-2026 file. Pass '-' to leave an earlier argument at its default. When an output directory
// is given, the run also writes trades.csv, daily.csv, states.csv, episodes.csv and summary.json there at
// full precision.
export default async (symbol = 'VGT', startDate?: string, endDate?: string, dataFile?: string, outDir?: string) => {
  const optional = (value?: string) => (value === '-' || value === '' ? undefined : value);
  const startTimestamp = optional(startDate) ? Date.parse(startDate!) / 1000 : -Infinity;
  const endTimestamp = optional(endDate) ? Date.parse(endDate!) / 1000 : Infinity;

  if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) {
    throw new Error('Start and end dates must be YYYY-MM-DD');
  }

  const strategyName = 'lower3';
  const file = optional(dataFile) ?? `data/${symbol}/${symbol}-2016-2026.csv`;
  const allTicks = await loadCsvBacktestData(symbol, file);
  const ticks = allTicks.filter((tick) => tick.time >= startTimestamp && tick.time <= endTimestamp);
  const tickWindowSize = 90;
  const positions: BacktestPosition[] = [];
  const investmentAmount = 100000; // Margin borrowed for every position, regardless of past results
  const targetPercentChange = 0.1; // target change
  const trailingStopPercentage = 0.08; //  drop from the post-entry high
  const maximumHoldDays = 15; // days before a losing position is sold
  const marginInterestRate = 0.11; // annual interest charged by Vanguard on margin
  const materialLossThreshold = 0.005; // price loss that makes the next entry wait for a lower price
  const lowerPriceReentry = 0.03; // extra decline below the frozen loss-exit price required to re-enter
  const retraceFraction = 0.38; // recovery of the reference-high-to-episode-low decline that clears it
  let postEntryHigh = 0;
  let postEntryLow = 0;
  let stopPrice = 0;
  let realizedProfit = 0;
  let peakProfit = 0;
  let peakTimestamp = ticks[0]?.time ?? 0;
  let maximumDrawdown = 0;
  let drawdownPeakTimestamp = peakTimestamp;
  let drawdownTroughTimestamp = peakTimestamp;

  // Re-entry state. The reference high of the open position's entry signal is kept so that a losing
  // exit can freeze it; it is exactly the `recentHigh` of the entry session.
  let restriction: Restriction | undefined;
  let episode: Episode | undefined;
  let entryReferenceHigh = 0;
  const episodes: Episode[] = [];
  const stateLog: StateLogRow[] = [];
  const entryIndexes = new Map<BacktestPosition, number>();
  const exitIndexes = new Map<BacktestPosition, number>();
  const exitReasons = new Map<BacktestPosition, ExitReason>();
  const dailyRows: { index: number; date: string; close: number; borrowed: number; mtmProfit: number }[] = [];

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

  // The close that clears the restriction: 38% of the way back from the episode low to the frozen
  // reference high. It falls as the episode low falls and is never computed from future prices.
  const resetLevelOf = (current: Restriction) =>
    current.episodeLow + retraceFraction * (current.referenceHigh - current.episodeLow);

  const logState = (
    index: number,
    tick: Tick,
    prevState: State,
    newState: State,
    reason: string,
    signal: boolean,
    entryExecuted: boolean,
    exitReason = '',
    tradeProfit: number | '' = '',
    priceReturn: number | '' = ''
  ) => {
    stateLog.push({
      index,
      date: formatDate(tick.time),
      prevState,
      newState,
      reason,
      exitReason,
      tradeProfit,
      priceReturn,
      lossExitPrice: restriction?.lossExitPrice ?? '',
      refHigh: restriction?.referenceHigh ?? '',
      lowerLevel: restriction?.lowerLevel ?? '',
      episodeLow: restriction?.episodeLow ?? '',
      resetLevel: restriction ? resetLevelOf(restriction) : '',
      close: tick.close,
      signal,
      entryExecuted
    });
  };

  ticks.forEach((tick, index) => {
    const tickWindow: Tick[] = ticks.slice(Math.max(0, index - tickWindowSize), index);
    const recentHigh = Math.max(...tickWindow.map((windowTick) => windowTick.high));
    const percentChange = 1 - tick.close / recentHigh;

    // Skip the first tick.
    if (index === 0) {
      dailyRows.push({ index, date: formatDate(tick.time), close: tick.close, borrowed: 0, mtmProfit: 0 });
      return;
    }

    const openPositions = positions.filter((position) => position.isOpen);
    const signal = percentChange >= targetPercentChange;
    let buy = openPositions.length === 0 && signal;
    let entryBlocked = false;

    // While restricted, today's close first extends the episode low, then: a close at or above the reset
    // level takes the recovery-reset path (applied at the end of the session, never a purchase);
    // otherwise an entry additionally needs a close at or below the frozen lower level.
    if (buy && restriction) {
      restriction.episodeLow = Math.min(restriction.episodeLow, tick.close);

      if (tick.close >= resetLevelOf(restriction) || tick.close > restriction.lowerLevel) {
        buy = false;
        entryBlocked = true;
      }
    }

    if (buy) {
      // Vanguard allows partial shares.
      const shares = investmentAmount / tick.close;
      const position: BacktestPosition = {
        isOpen: true,
        symbol,
        type: PositionType.Long,
        shares,
        investment: investmentAmount,
        entryTimestamp: tick.time,
        entryPrice: tick.close
      };

      positions.push(position);
      entryIndexes.set(position, index);
      entryReferenceHigh = recentHigh;
      postEntryHigh = tick.close;
      postEntryLow = tick.close;
      stopPrice = postEntryHigh * (1 - trailingStopPercentage);

      console.info(
        `Entered at ${targetPercentChange * 100}% change on ${new Date(tick.time * 1000).toISOString()} from ${formatPrice(recentHigh)} to ${formatPrice(tick.close)}`
      );

      if (restriction) {
        console.info(
          `Lower-price reentry: close ${formatPrice(tick.close)} is at least ${formatPercent(lowerPriceReentry)} below the loss exit at ${formatPrice(restriction.lossExitPrice)}`
        );
      }
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
        exitIndexes.set(position, index);
        exitReasons.set(position, exit.reason);

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

        // A material price loss (interest excluded) freezes the restriction. A smaller loss, including
        // one caused only by interest, and any profit leave the strategy unrestricted. The frozen
        // reference high is the entry signal's, not today's; the episode low starts at today's close.
        const priceReturn = exit.price / position.entryPrice - 1;

        if (priceReturn <= -materialLossThreshold) {
          restriction = {
            lossExitPrice: exit.price,
            referenceHigh: entryReferenceHigh,
            lowerLevel: exit.price * (1 - lowerPriceReentry),
            episodeLow: tick.close
          };
          episode = {
            exitIndex: index,
            exitDate: formatDate(tick.time),
            exitReason: exit.reason,
            loss: position.profit,
            priceReturn,
            lossExitPrice: exit.price,
            losingEntryPrice: position.entryPrice,
            referenceHigh: entryReferenceHigh,
            episodeLow: tick.close,
            resolution: '',
            resolutionDate: ''
          };
          episodes.push(episode);
          logState(
            index,
            tick,
            'NORMAL',
            'RESTRICTED',
            'losing_exit',
            signal,
            false,
            exit.reason,
            position.profit,
            priceReturn
          );
          console.info(
            `Restricted after a ${formatPercent(-priceReturn)} price loss: reentry needs a close at or below ${formatPrice(restriction.lowerLevel)}; a close at or above ${formatPrice(resetLevelOf(restriction))} (38% of the way back from the episode low to ${formatPrice(entryReferenceHigh)}) resets\n`
          );
        } else if (position.profit < 0) {
          logState(
            index,
            tick,
            'NORMAL',
            'NORMAL',
            'loss_not_restricted',
            signal,
            false,
            exit.reason,
            position.profit,
            priceReturn
          );
          console.info(
            `Not restricted: the ${formatPercent(priceReturn)} price change is above the ${formatPercent(-materialLossThreshold)} material-loss threshold\n`
          );
        } else {
          logState(
            index,
            tick,
            'NORMAL',
            'NORMAL',
            'profitable_exit',
            signal,
            false,
            exit.reason,
            position.profit,
            priceReturn
          );
        }
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

    dailyRows.push({
      index,
      date: formatDate(tick.time),
      close: tick.close,
      borrowed: openPosition ? openPosition.investment : 0,
      mtmProfit: markedProfit
    });

    if (markedProfit > peakProfit) {
      peakProfit = markedProfit;
      peakTimestamp = tick.time;
    }

    if (peakProfit - markedProfit > maximumDrawdown) {
      maximumDrawdown = peakProfit - markedProfit;
      drawdownPeakTimestamp = peakTimestamp;
      drawdownTroughTimestamp = tick.time;
    }

    // End of the session: resolve the restriction. A position opened at this close clears it; otherwise
    // today's close extends the episode low and a close at or above the reset level clears it (recovery
    // reset, never a purchase). The log mirrors the research implementation: one row per restricted
    // session.
    if (restriction && episode) {
      restriction.episodeLow = Math.min(restriction.episodeLow, tick.close);
      episode.episodeLow = restriction.episodeLow;

      if (openPosition && entryIndexes.get(openPosition) === index) {
        logState(index, tick, 'RESTRICTED', 'NORMAL', 'lower_price_reentry', signal, true);
        episode.resolution = 'lower_price_reentry';
        episode.resolutionDate = formatDate(tick.time);
        restriction = undefined;
        episode = undefined;
      } else if (!openPosition && tick.close >= resetLevelOf(restriction)) {
        logState(index, tick, 'RESTRICTED', 'NORMAL', 'recovery_reset', signal, false);
        console.info(
          `Recovery reset on ${formatDate(tick.time)}: close ${formatPrice(tick.close)} recovered ${formatPercent(retraceFraction)} of the decline from ${formatPrice(restriction.referenceHigh)} to the episode low ${formatPrice(restriction.episodeLow)}\n`
        );
        episode.resolution = 'recovery_reset';
        episode.resolutionDate = formatDate(tick.time);
        restriction = undefined;
        episode = undefined;
      } else {
        logState(index, tick, 'RESTRICTED', 'RESTRICTED', entryBlocked ? 'entry_blocked' : 'restricted', signal, false);

        if (index === ticks.length - 1) {
          episode.resolution = 'unresolved_at_end';
          episode.resolutionDate = formatDate(tick.time);
        }
      }
    } else if (openPosition && entryIndexes.get(openPosition) === index) {
      logState(index, tick, 'NORMAL', 'NORMAL', 'normal_entry', signal, true);
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

  console.info(`Strategy: ${strategyName}, data file: ${file}`);
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
  console.info(
    `Reentry after a material loss (price loss of at least ${formatPercent(materialLossThreshold)}): ${formatPercent(lowerPriceReentry)} below the loss exit, reset after a ${formatPercent(retraceFraction)} retracement`
  );

  if (outDir && lastTick) {
    await fs.ensureDir(outDir);

    const tradeLines = [
      'entry_index,exit_index,entry_date,exit_date,entry_price,exit_price,reason,investment,shares,interest,profit'
    ];

    for (const position of positions) {
      const isOpen = position.isOpen;
      const interest = isOpen ? accruedInterest : (position.interest ?? 0);
      const profit = isOpen ? unrealizedProfit : (position.profit ?? 0);
      const exitPrice = isOpen ? lastTick.close : (position.exitPrice ?? 0);

      tradeLines.push(
        [
          entryIndexes.get(position),
          isOpen ? '' : exitIndexes.get(position),
          formatDate(position.entryTimestamp),
          isOpen ? '' : formatDate(position.exitTimestamp ?? 0),
          position.entryPrice,
          exitPrice,
          isOpen ? 'open' : (exitReasons.get(position) ?? ''),
          position.investment,
          position.shares,
          interest,
          profit
        ].join(',')
      );
    }

    const dailyLines = ['index,date,close,borrowed,mtm_pnl'];

    for (const row of dailyRows) {
      dailyLines.push([row.index, row.date, row.close, row.borrowed, row.mtmProfit].join(','));
    }

    const stateLines = [
      'index,date,prev_state,new_state,reason,exit_reason,trade_profit,price_return,loss_exit_price,ref_high,lower_level,episode_low,reset_level,close,signal,entry_executed'
    ];

    for (const row of stateLog) {
      stateLines.push(
        [
          row.index,
          row.date,
          row.prevState,
          row.newState,
          row.reason,
          row.exitReason,
          row.tradeProfit,
          row.priceReturn,
          row.lossExitPrice,
          row.refHigh,
          row.lowerLevel,
          row.episodeLow,
          row.resetLevel,
          row.close,
          row.signal,
          row.entryExecuted
        ].join(',')
      );
    }

    const episodeLines = [
      'exit_index,exit_date,exit_reason,loss,price_return,loss_exit_price,losing_entry_price,ref_high,episode_low,resolution,resolution_date'
    ];

    for (const row of episodes) {
      episodeLines.push(
        [
          row.exitIndex,
          row.exitDate,
          row.exitReason,
          row.loss,
          row.priceReturn,
          row.lossExitPrice,
          row.losingEntryPrice,
          row.referenceHigh,
          row.episodeLow,
          row.resolution,
          row.resolutionDate
        ].join(',')
      );
    }

    const summary = {
      symbol,
      dataFile: file,
      strategy: strategyName,
      materialLossThreshold,
      lowerPriceReentry,
      retraceFraction,
      firstDate: firstTick ? formatDate(firstTick.time) : '',
      lastDate: formatDate(lastTick.time),
      sessions: ticks.length,
      closedTrades: closedPositions.length,
      openAtEnd: Boolean(openPosition),
      realizedProfit,
      unrealizedProfit,
      netProfit: realizedProfit + unrealizedProfit,
      marginInterest: closedInterest + accruedInterest,
      maximumDrawdown,
      drawdownPeakDate: formatDate(drawdownPeakTimestamp),
      drawdownTroughDate: formatDate(drawdownTroughTimestamp),
      restrictions: episodes.length,
      lowerPriceReentries: episodes.filter((row) => row.resolution === 'lower_price_reentry').length,
      recoveryResets: episodes.filter((row) => row.resolution === 'recovery_reset').length,
      lossesNotRestricted: stateLog.filter((row) => row.reason === 'loss_not_restricted').length
    };

    await fs.writeFile(`${outDir}/trades.csv`, `${tradeLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/daily.csv`, `${dailyLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/states.csv`, `${stateLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/episodes.csv`, `${episodeLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/summary.json`, `${JSON.stringify(summary, null, 1)}\n`);
    console.info(`Wrote trades.csv, daily.csv, states.csv, episodes.csv and summary.json to ${outDir}`);
  }
};
