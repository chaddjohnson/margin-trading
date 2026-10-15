// Parameterized working copy of the daily-OHLCV allIn strategy in src/app/allin-original.ts, for the
// multi-asset optimizer (research/multi-asset-optimizer). The original is a read-only baseline and must
// never be edited; this copy has to reproduce it exactly at the default parameters, which
// src/optimizer/goldenMaster.ts checks file for file and log line for log line.
//
// The trading rules are the original's, unchanged. What differs is structural only:
// - The seven numerical decision constants come from a typed parameter object (`AllInParams`) whose
//   defaults are the original values. Percentages are integer tenths of a percentage point (100 = 10.0%)
//   and are converted once, at this interface, by dividing by 1000, which gives exactly the same double
//   as the original's decimal literal (for example 100 / 1000 === 0.1).
// - The simulation is a pure function over arrays of bars (`simulateAllIn`), with a fast mode that skips
//   logging and row building but runs the identical decision code.
// - The 90-session reference high is computed with a sliding-window maximum instead of slicing the
//   window on every session. The maximum of the same values is the same number.
// - An optional `startIndex` lets earlier bars serve only as history for the reference high (warmup):
//   nothing is traded, marked or logged before it. With `startIndex` 0, as in the original, the first
//   session only seeds the window.
//
// Execution model, and the limits of daily OHLC bars (unchanged from the original):
// - Exits are processed in a fixed order: the open first, then the rest of the session as one span in
//   which the low may reach the stop.
// - Entries fill at the signal day's close.
// - The trailing stop is updated once a day from the highest high through the previous session.
// - A triggered stop fills at exactly the stop price, or at the open when the session opens at or below it.
// - Interest accrues per calendar day from the entry date to the exit date, and none on the entry day.
// - Prices are used as given in the CSV. Dividends aren't modeled beyond any adjustment in the data.
// - The maximum hold counts calendar days (timestamps), not sessions, and sells at the open only when a
//   sale there would lose money after interest. The stop is active only when a fill at the stop price
//   would be profitable after interest.
// - Re-entry after a materially losing trade: see the original's header comment. The material-loss
//   threshold, the lower-price re-entry decline and the retracement fraction are parameters here.

import type { BacktestPosition, Tick } from '#types';
import { PositionType } from '#types';
import { loadCsvBacktestData } from '#lib';
import fs from 'fs-extra';

const secondsPerDay = 24 * 60 * 60;

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap';

// The tunable decision constants. Percentages are in integer tenths of a percentage point.
export interface AllInParams {
  dipTenths: number; // entry: close at least this far below the reference high (original 10%)
  trailingStopTenths: number; // stop distance below the post-entry high (original 8%)
  maximumHoldDays: number; // calendar days before a losing position is sold at the open (original 15)
  lookbackSessions: number; // sessions in the reference-high window (original 90)
  materialLossTenths: number; // price loss that restricts re-entry (original 0.5%)
  lowerReentryTenths: number; // extra decline below the loss exit required to re-enter (original 3%)
  retraceTenths: number; // recovery of the reference-high-to-episode-low decline that resets (original 38%)
}

// Fixed operational assumptions, not tuned.
export interface AllInSettings {
  investmentAmount: number; // margin borrowed for every position
  marginInterestRate: number; // annual simple interest on the borrowed amount
}

export const originalParams: Readonly<AllInParams> = Object.freeze({
  dipTenths: 100,
  trailingStopTenths: 80,
  maximumHoldDays: 15,
  lookbackSessions: 90,
  materialLossTenths: 5,
  lowerReentryTenths: 30,
  retraceTenths: 380
});

export const originalSettings: Readonly<AllInSettings> = Object.freeze({
  investmentAmount: 100000,
  marginInterestRate: 0.11
});

export const tenthsToFraction = (tenths: number) => tenths / 1000;

export interface Bars {
  time: ArrayLike<number>; // Unix seconds at midnight UTC of the session date
  open: ArrayLike<number>;
  high: ArrayLike<number>;
  low: ArrayLike<number>;
  close: ArrayLike<number>;
}

// The highest high of the `lookback` sessions before each session, or of all earlier sessions when fewer
// exist. -Infinity for the first session, as Math.max() of an empty window.
export const computeReferenceHighs = (high: ArrayLike<number>, lookback: number): Float64Array => {
  const result = new Float64Array(high.length);
  const deque = new Int32Array(high.length);
  let head = 0;
  let tail = 0;

  for (let index = 0; index < high.length; index++) {
    while (head < tail && deque[head]! < index - lookback) {
      head++;
    }

    result[index] = head < tail ? high[deque[head]!]! : -Infinity;

    while (head < tail && high[deque[tail - 1]!]! <= high[index]!) {
      tail--;
    }

    deque[tail++] = index;
  }

  return result;
};

export interface SessionExit {
  reason: ExitReason;
  price: number;
  isStopTriggered: boolean;
}

export interface TradeRecord {
  entryIndex: number;
  exitIndex: number; // -1 while open
  entryTime: number;
  exitTime: number; // the window's last session while open
  entryPrice: number;
  exitPrice: number; // the last close while open
  reason: ExitReason | 'open';
  investment: number;
  shares: number;
  interest: number;
  profit: number;
  referenceHigh: number;
}

interface Restriction {
  lossExitPrice: number;
  referenceHigh: number;
  lowerLevel: number;
  episodeLow: number;
}

type State = 'NORMAL' | 'RESTRICTED';

export interface StateLogRow {
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

export interface Episode {
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

export interface DailyRow {
  index: number;
  date: string;
  close: number;
  borrowed: number;
  mtmProfit: number;
}

export interface YearResult {
  year: number;
  netProfit: number; // change in the daily mark to market over the year's sessions in the window
  maximumDrawdown: number; // within the year, from the year's starting mark
  entries: number;
}

export interface SimulationResult {
  startIndex: number;
  endIndex: number;
  sessions: number;
  trades: TradeRecord[]; // closed trades, then the open one marked at the last close
  realizedProfit: number;
  unrealizedProfit: number;
  netProfit: number;
  closedInterest: number;
  accruedInterest: number;
  maximumDrawdown: number;
  drawdownPeakIndex: number;
  drawdownTroughIndex: number;
  exposureSessions: number; // sessions closing with a position open
  restrictions: number;
  lowerPriceReentries: number;
  recoveryResets: number;
  lossesNotRestricted: number;
  years: YearResult[];
  // Detail mode only.
  dailyRows: DailyRow[];
  stateLog: StateLogRow[];
  episodes: Episode[];
}

export interface SimulationOptions {
  symbol: string;
  bars: Bars;
  params: AllInParams;
  settings?: AllInSettings;
  // Reference highs for params.lookbackSessions; computed when omitted.
  referenceHighs?: ArrayLike<number>;
  startIndex?: number; // first traded session; earlier bars are history for the reference high only
  endIndex?: number; // last session, inclusive
  detail?: boolean; // build rows and log lines
  log?: (line: string) => void;
  years?: ArrayLike<number>; // calendar year of each bar, for the per-year breakdown
}

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

// Runs the strategy over bars[startIndex..endIndex]. The decision code is shared by the fast and detail
// modes; detail mode only adds rows and log lines.
export const simulateAllIn = (options: SimulationOptions): SimulationResult => {
  const { bars, params } = options;
  const settings = options.settings ?? originalSettings;
  const detail = options.detail ?? false;
  const log = options.log ?? (() => {});
  const { time, open, high, low, close } = bars;
  const startIndex = options.startIndex ?? 0;
  const endIndex = options.endIndex ?? time.length - 1;
  const referenceHighs = options.referenceHighs ?? computeReferenceHighs(high, params.lookbackSessions);
  const yearOf = options.years;

  const investmentAmount = settings.investmentAmount;
  const marginInterestRate = settings.marginInterestRate;
  const targetPercentChange = tenthsToFraction(params.dipTenths);
  const trailingStopPercentage = tenthsToFraction(params.trailingStopTenths);
  const maximumHoldDays = params.maximumHoldDays;
  const materialLossThreshold = tenthsToFraction(params.materialLossTenths);
  const lowerPriceReentry = tenthsToFraction(params.lowerReentryTenths);
  const retraceFraction = tenthsToFraction(params.retraceTenths);

  const exitReasonDescriptions: Record<ExitReason, string> = {
    'maximum hold': `${maximumHoldDays}-day loss exit at the open`,
    'trailing stop': 'trailing stop',
    'trailing stop gap': 'trailing stop, filled at the open after a gap down'
  };

  const trades: TradeRecord[] = [];
  const dailyRows: DailyRow[] = [];
  const stateLog: StateLogRow[] = [];
  const episodes: Episode[] = [];
  const years: YearResult[] = [];

  let position: TradeRecord | undefined;
  let postEntryHigh = 0;
  let postEntryLow = 0;
  let stopPrice = 0;
  let realizedProfit = 0;
  let peakProfit = 0;
  let maximumDrawdown = 0;
  let drawdownPeakIndex = startIndex;
  let drawdownTroughIndex = startIndex;
  let peakIndex = startIndex;
  let exposureSessions = 0;
  let restrictions = 0;
  let lowerPriceReentries = 0;
  let recoveryResets = 0;
  let lossesNotRestricted = 0;

  let restriction: Restriction | undefined;
  let episode: Episode | undefined;
  let year: YearResult | undefined;
  let yearStartMark = 0;
  let yearPeak = 0;

  // Simple interest on the borrowed amount, accrued for the time the position has been held.
  const calculateInterest = (current: TradeRecord, timestamp: number) => {
    const yearsHeld = (timestamp - current.entryTime) / (365 * secondsPerDay);

    return current.investment * marginInterestRate * yearsHeld;
  };

  const resetLevelOf = (current: Restriction) =>
    current.episodeLow + retraceFraction * (current.referenceHigh - current.episodeLow);

  const logState = (
    index: number,
    prevState: State,
    newState: State,
    reason: string,
    signal: boolean,
    entryExecuted: boolean,
    exitReason = '',
    tradeProfit: number | '' = '',
    priceReturn: number | '' = ''
  ) => {
    if (!detail) {
      return;
    }

    stateLog.push({
      index,
      date: formatDate(time[index]!),
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
      close: close[index]!,
      signal,
      entryExecuted
    });
  };

  // The per-year breakdown follows the daily mark to market, so it includes unrealized profit and
  // accrued interest at each year end.
  const trackYear = (index: number, markedProfit: number) => {
    if (!yearOf) {
      return;
    }

    const currentYear = yearOf[index]!;

    if (year?.year !== currentYear) {
      yearStartMark = year ? yearStartMark + year.netProfit : 0;
      year = { year: currentYear, netProfit: 0, maximumDrawdown: 0, entries: 0 };
      yearPeak = yearStartMark;
      years.push(year);
    }

    year.netProfit = markedProfit - yearStartMark;
    yearPeak = Math.max(yearPeak, markedProfit);
    year.maximumDrawdown = Math.max(year.maximumDrawdown, yearPeak - markedProfit);
  };

  for (let index = startIndex; index <= endIndex; index++) {
    const tickTime = time[index]!;
    const tickOpen = open[index]!;
    const tickLow = low[index]!;
    const tickClose = close[index]!;
    const recentHigh = referenceHighs[index]!;
    const percentChange = 1 - tickClose / recentHigh;

    // Skip the first tick, which has no earlier sessions for the reference high.
    if (index === 0) {
      if (detail) {
        dailyRows.push({ index, date: formatDate(tickTime), close: tickClose, borrowed: 0, mtmProfit: 0 });
      }

      trackYear(index, 0);
      continue;
    }

    // The position open before this session; one bought at this session's close isn't checked for exits.
    const heldPosition = position;
    const signal = percentChange >= targetPercentChange;
    let buy = heldPosition === undefined && signal;
    let entryBlocked = false;
    let enteredToday = false;

    if (buy && restriction) {
      restriction.episodeLow = Math.min(restriction.episodeLow, tickClose);

      if (tickClose >= resetLevelOf(restriction) || tickClose > restriction.lowerLevel) {
        buy = false;
        entryBlocked = true;
      }
    }

    if (buy) {
      // Vanguard allows partial shares.
      const shares = investmentAmount / tickClose;

      position = {
        entryIndex: index,
        exitIndex: -1,
        entryTime: tickTime,
        exitTime: tickTime,
        entryPrice: tickClose,
        exitPrice: tickClose,
        reason: 'open',
        investment: investmentAmount,
        shares,
        interest: 0,
        profit: 0,
        referenceHigh: recentHigh
      };
      trades.push(position);
      enteredToday = true;

      if (year) {
        year.entries++;
      }

      postEntryHigh = tickClose;
      postEntryLow = tickClose;
      stopPrice = postEntryHigh * (1 - trailingStopPercentage);

      if (detail) {
        log(
          `Entered at ${targetPercentChange * 100}% change on ${new Date(tickTime * 1000).toISOString()} from ${formatPrice(recentHigh)} to ${formatPrice(tickClose)}`
        );

        if (restriction) {
          log(
            `Lower-price reentry: close ${formatPrice(tickClose)} is at least ${formatPercent(lowerPriceReentry)} below the loss exit at ${formatPrice(restriction.lossExitPrice)}`
          );
        }
      }
    }

    if (heldPosition) {
      const interest = calculateInterest(heldPosition, tickTime);
      const profitAt = (price: number) => heldPosition.shares * price - heldPosition.investment - interest;
      let exit: SessionExit | undefined;

      // Before the open: the stop is active only if a fill at the stop price is profitable after interest.
      const isStopActive = profitAt(stopPrice) > 0;
      const isStopTriggeredAtOpen = isStopActive && tickOpen <= stopPrice;
      const daysHeld = (tickTime - heldPosition.entryTime) / secondsPerDay;

      if (daysHeld >= maximumHoldDays && profitAt(tickOpen) < 0) {
        exit = { reason: 'maximum hold', price: tickOpen, isStopTriggered: isStopTriggeredAtOpen };
      } else if (isStopTriggeredAtOpen) {
        exit = { reason: 'trailing stop gap', price: tickOpen, isStopTriggered: true };
      } else if (isStopActive && tickLow <= stopPrice) {
        exit = { reason: 'trailing stop', price: stopPrice, isStopTriggered: true };
      }

      if (exit) {
        heldPosition.exitIndex = index;
        heldPosition.exitTime = tickTime;
        heldPosition.exitPrice = exit.price;
        heldPosition.reason = exit.reason;
        heldPosition.interest = interest;
        heldPosition.profit = heldPosition.shares * exit.price - heldPosition.investment - interest;
        realizedProfit += heldPosition.profit;
        position = undefined;

        if (detail) {
          const monthsHeld = (tickTime - heldPosition.entryTime) / ((365 / 12) * secondsPerDay);
          const alsoTriggered =
            exit.reason === 'maximum hold' && exit.isStopTriggered
              ? ' (the trailing stop also triggered at the open)'
              : '';

          log(
            `Exited at ${new Date(tickTime * 1000).toISOString()} from ${formatPrice(heldPosition.entryPrice)} to ${formatPrice(exit.price)} for a profit of ${formatDollars(heldPosition.profit)} after ${formatDollars(interest)} in interest`
          );
          log(`Exit reason: ${exitReasonDescriptions[exit.reason]}${alsoTriggered}`);
          const lowestLow = Math.min(postEntryLow, exit.price);
          const dropToLowestLow = 1 - lowestLow / heldPosition.entryPrice;

          log(`Held for ${formatMonths(monthsHeld)} months`);
          log(`Lowest low: ${formatPrice(lowestLow)} (${formatPercent(dropToLowestLow)} below entry)\n`);
        }

        const priceReturn = exit.price / heldPosition.entryPrice - 1;

        if (priceReturn <= -materialLossThreshold) {
          restriction = {
            lossExitPrice: exit.price,
            referenceHigh: heldPosition.referenceHigh,
            lowerLevel: exit.price * (1 - lowerPriceReentry),
            episodeLow: tickClose
          };
          restrictions++;
          episode = {
            exitIndex: index,
            exitDate: detail ? formatDate(tickTime) : '',
            exitReason: exit.reason,
            loss: heldPosition.profit,
            priceReturn,
            lossExitPrice: exit.price,
            losingEntryPrice: heldPosition.entryPrice,
            referenceHigh: heldPosition.referenceHigh,
            episodeLow: tickClose,
            resolution: '',
            resolutionDate: ''
          };

          if (detail) {
            episodes.push(episode);
          }

          logState(
            index,
            'NORMAL',
            'RESTRICTED',
            'losing_exit',
            signal,
            false,
            exit.reason,
            heldPosition.profit,
            priceReturn
          );

          if (detail) {
            log(
              `Restricted after a ${formatPercent(-priceReturn)} price loss: reentry needs a close at or below ${formatPrice(restriction.lowerLevel)}; a close at or above ${formatPrice(resetLevelOf(restriction))} (${formatPercent(retraceFraction)} of the way back from the episode low to ${formatPrice(heldPosition.referenceHigh)}) resets\n`
            );
          }
        } else if (heldPosition.profit < 0) {
          lossesNotRestricted++;
          logState(
            index,
            'NORMAL',
            'NORMAL',
            'loss_not_restricted',
            signal,
            false,
            exit.reason,
            heldPosition.profit,
            priceReturn
          );

          if (detail) {
            log(
              `Not restricted: the ${formatPercent(priceReturn)} price change is above the ${formatPercent(-materialLossThreshold)} material-loss threshold\n`
            );
          }
        } else {
          logState(
            index,
            'NORMAL',
            'NORMAL',
            'profitable_exit',
            signal,
            false,
            exit.reason,
            heldPosition.profit,
            priceReturn
          );
        }
      } else {
        // After the session, raise the high and the stop for the next session. The stop never moves down.
        postEntryHigh = Math.max(postEntryHigh, high[index]!);
        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
        postEntryLow = Math.min(postEntryLow, tickLow);
      }
    }

    // Daily mark-to-market profit: realized profit plus any open position at the close, net of interest.
    const markedProfit =
      realizedProfit +
      (position ? position.shares * tickClose - position.investment - calculateInterest(position, tickTime) : 0);

    if (position) {
      exposureSessions++;
    }

    if (detail) {
      dailyRows.push({
        index,
        date: formatDate(tickTime),
        close: tickClose,
        borrowed: position ? position.investment : 0,
        mtmProfit: markedProfit
      });
    }

    trackYear(index, markedProfit);

    if (markedProfit > peakProfit) {
      peakProfit = markedProfit;
      peakIndex = index;
    }

    if (peakProfit - markedProfit > maximumDrawdown) {
      maximumDrawdown = peakProfit - markedProfit;
      drawdownPeakIndex = peakIndex;
      drawdownTroughIndex = index;
    }

    // End of the session: resolve the restriction.
    if (restriction && episode) {
      restriction.episodeLow = Math.min(restriction.episodeLow, tickClose);
      episode.episodeLow = restriction.episodeLow;

      if (position && enteredToday) {
        logState(index, 'RESTRICTED', 'NORMAL', 'lower_price_reentry', signal, true);
        lowerPriceReentries++;
        episode.resolution = 'lower_price_reentry';
        episode.resolutionDate = detail ? formatDate(tickTime) : '';
        restriction = undefined;
        episode = undefined;
      } else if (!position && tickClose >= resetLevelOf(restriction)) {
        logState(index, 'RESTRICTED', 'NORMAL', 'recovery_reset', signal, false);

        if (detail) {
          log(
            `Recovery reset on ${formatDate(tickTime)}: close ${formatPrice(tickClose)} recovered ${formatPercent(retraceFraction)} of the decline from ${formatPrice(restriction.referenceHigh)} to the episode low ${formatPrice(restriction.episodeLow)}\n`
          );
        }

        recoveryResets++;
        episode.resolution = 'recovery_reset';
        episode.resolutionDate = detail ? formatDate(tickTime) : '';
        restriction = undefined;
        episode = undefined;
      } else {
        logState(index, 'RESTRICTED', 'RESTRICTED', entryBlocked ? 'entry_blocked' : 'restricted', signal, false);

        if (index === endIndex) {
          episode.resolution = 'unresolved_at_end';
          episode.resolutionDate = detail ? formatDate(tickTime) : '';
        }
      }
    } else if (position && enteredToday) {
      logState(index, 'NORMAL', 'NORMAL', 'normal_entry', signal, true);
    }
  }

  const lastTime = time[endIndex];
  let accruedInterest = 0;
  let unrealizedProfit = 0;

  if (position && lastTime !== undefined) {
    accruedInterest = calculateInterest(position, lastTime);
    unrealizedProfit = position.shares * close[endIndex]! - position.investment - calculateInterest(position, lastTime);
    position.exitTime = lastTime;
    position.exitPrice = close[endIndex]!;
    position.interest = accruedInterest;
    position.profit = unrealizedProfit;
  }

  const closedInterest = trades.reduce((total, trade) => total + (trade.reason === 'open' ? 0 : trade.interest), 0);

  return {
    startIndex,
    endIndex,
    sessions: Math.max(0, endIndex - startIndex + 1),
    trades,
    realizedProfit,
    unrealizedProfit,
    netProfit: realizedProfit + unrealizedProfit,
    closedInterest,
    accruedInterest,
    maximumDrawdown,
    drawdownPeakIndex,
    drawdownTroughIndex,
    exposureSessions,
    restrictions,
    lowerPriceReentries,
    recoveryResets,
    lossesNotRestricted,
    years,
    dailyRows,
    stateLog,
    episodes
  };
};

export const ticksToBars = (ticks: Tick[]): Bars => ({
  time: ticks.map((tick) => tick.time),
  open: ticks.map((tick) => tick.open),
  high: ticks.map((tick) => tick.high),
  low: ticks.map((tick) => tick.low),
  close: ticks.map((tick) => tick.close)
});

// Parses the optional parameter argument: a JSON object of `AllInParams` fields, or '-' for the defaults.
export const parseParamsArgument = (value?: string): AllInParams => {
  if (value === undefined || value === '-' || value === '') {
    return { ...originalParams };
  }

  const parsed = JSON.parse(value) as Partial<AllInParams>;
  const params = { ...originalParams, ...parsed };

  for (const [key, entry] of Object.entries(params)) {
    if (!Number.isInteger(entry)) {
      throw new Error(`Parameter ${key} must be an integer (percentages in tenths of a percentage point)`);
    }
  }

  return params;
};

// Run with `npm run app allIn-optimizable [symbol] [start date] [end date] [data file] [output dir]
// [params JSON]`, the same arguments as the original plus an optional JSON object of `AllInParams`, for
// example '{"dipTenths":120,"trailingStopTenths":70}'. Output files and console lines match the
// original's at the default parameters.
export default async (
  symbol = 'VGT',
  startDate?: string,
  endDate?: string,
  dataFile?: string,
  outDir?: string,
  paramsJson?: string
) => {
  const optional = (value?: string) => (value === '-' || value === '' ? undefined : value);
  const startTimestamp = optional(startDate) ? Date.parse(startDate!) / 1000 : -Infinity;
  const endTimestamp = optional(endDate) ? Date.parse(endDate!) / 1000 : Infinity;

  if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) {
    throw new Error('Start and end dates must be YYYY-MM-DD');
  }

  const params = parseParamsArgument(paramsJson);
  const settings = originalSettings;
  const strategyName = 'lower3';
  const file = optional(dataFile) ?? `data/${symbol}/${symbol}-2016-2026.csv`;
  const allTicks = await loadCsvBacktestData(symbol, file);
  const ticks = allTicks.filter((tick) => tick.time >= startTimestamp && tick.time <= endTimestamp);
  const bars = ticksToBars(ticks);
  const investmentAmount = settings.investmentAmount;
  const targetPercentChange = tenthsToFraction(params.dipTenths);
  const trailingStopPercentage = tenthsToFraction(params.trailingStopTenths);
  const maximumHoldDays = params.maximumHoldDays;
  const materialLossThreshold = tenthsToFraction(params.materialLossTenths);
  const lowerPriceReentry = tenthsToFraction(params.lowerReentryTenths);
  const retraceFraction = tenthsToFraction(params.retraceTenths);

  const result = simulateAllIn({
    symbol,
    bars,
    params,
    settings,
    detail: true,
    log: (line) => console.info(line),
    endIndex: ticks.length - 1
  });

  const { trades, dailyRows, stateLog, episodes, realizedProfit, maximumDrawdown } = result;
  const closedPositions = trades.filter((trade) => trade.reason !== 'open');
  const openPosition = trades.find((trade) => trade.reason === 'open');
  const lastTick = ticks.at(-1);
  const closedInterest = result.closedInterest;
  const accruedInterest = result.accruedInterest;
  const unrealizedProfit = result.unrealizedProfit;
  const drawdownPeakTimestamp = ticks[result.drawdownPeakIndex]?.time ?? 0;
  const drawdownTroughTimestamp = ticks[result.drawdownTroughIndex]?.time ?? 0;

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

    for (const trade of trades) {
      const isOpen = trade.reason === 'open';

      tradeLines.push(
        [
          trade.entryIndex,
          isOpen ? '' : trade.exitIndex,
          formatDate(trade.entryTime),
          isOpen ? '' : formatDate(trade.exitTime),
          trade.entryPrice,
          isOpen ? lastTick.close : trade.exitPrice,
          trade.reason,
          trade.investment,
          trade.shares,
          isOpen ? accruedInterest : trade.interest,
          isOpen ? unrealizedProfit : trade.profit
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
      restrictions: result.restrictions,
      lowerPriceReentries: result.lowerPriceReentries,
      recoveryResets: result.recoveryResets,
      lossesNotRestricted: result.lossesNotRestricted
    };

    await fs.writeFile(`${outDir}/trades.csv`, `${tradeLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/daily.csv`, `${dailyLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/states.csv`, `${stateLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/episodes.csv`, `${episodeLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/summary.json`, `${JSON.stringify(summary, null, 1)}\n`);
    console.info(`Wrote trades.csv, daily.csv, states.csv, episodes.csv and summary.json to ${outDir}`);
  }
};

// Re-exported so callers that build positions in the original's shape can do so.
export type { BacktestPosition };
export { PositionType };
