// Parameterized working copy of the one-minute allIn strategy in src/app/allIn.ts, for the VGT minute
// optimizer (research/vgt-minute-optimizer). The original is read-only and must never be edited. This copy
// has to reproduce it exactly at the original's parameters, which src/minute-optimizer/goldenMaster.ts
// checks file for file and console line for console line. It is also the slow, literal reference that the
// fast evaluator (src/minute-optimizer/engine.ts) is checked against.
//
// The trading rules and the execution model are the original's, unchanged. What differs is structural:
// - The seven numerical decision constants come from a typed parameter object (`MinuteParams`).
//   Percentages are integer tenths of a percentage point (25 = 2.5%) and are converted once, at this
//   interface, by dividing by 1000, which gives exactly the same double as the original's decimal literal
//   (25 / 1000 === 0.025). The $100,000 per position and the 11% margin rate stay fixed constants.
// - Already grouped sessions can be passed in (`allSessions`), so a caller loads the CSV only once.
// - Warmup (`warmup: true`): sessions before the start date stay in the array as history for the reference
//   high only. Nothing is traded, marked or logged before the start date, and the first traded session
//   has a reference high, so it isn't skipped. Without warmup the behaviour is the original's: the start
//   date cuts the history, and the first session only seeds the window.
// - Extra execution costs (`costBps`, per side, on the notional of each fill) are a separate accounting
//   layer: every decision still uses the cost-free prices and profits exactly as the original does, and
//   the cost-adjusted profit and drawdowns are reported next to the original's figures.
// - Log lines go through `log` (console.info by default), and the run returns its summary and the
//   per-year marks as well as writing the original's output files.
//
// The original's header follows. Its prose still describes the 10%/8%/90-session values that the
// original's constants have since moved from; the semantics it describes are unchanged.
//
// All in on a 10% dip, with re-entry restricted after a material loss (1% loss, 2% lower re-entry, 38% reset)
//
// Entry: the whole margin allocation is bought when the price is at least 10% below the highest high of
// the previous 90 trading sessions and no position is open. Exit: an 8% trailing stop, or the 15-day loss
// exit.
//
// Execution model on one-minute bars (Alpaca, raw prices, each bar timestamped at the start of its minute):
// - Sessions are America/New_York trading dates. Only regular-session minutes, from 9:30 a.m. to the
//   scheduled close (4:00 p.m., or 1:00 p.m. on early-close days), are used, plus the closing-auction print
//   in the minute that starts at the close. Session-level values (the 90-session reference high, closes for
//   the re-entry restriction, the daily mark to market) come from sessions aggregated from those minutes,
//   so a 90-session window is still 90 trading sessions.
// - Entries are decided one minute before the close (3:59 p.m. on a normal day) once the minute ending then
//   has completed, using the last completed minute's close in place of the session's close. Nothing later
//   is seen. The marketable buy then fills at the first trade at or after the decision: the open of the
//   3:59 p.m. minute, or the closing print if that minute has no trades. Without any trade after the
//   decision, there's no entry. A minute's open is an observed trade price used as a proxy, not proof that
//   an order would have filled there.
// - The trailing stop is updated once a day, after each session. Its level comes from the highest price
//   since the entry through the previous session, counting only the entry's minute onwards on the entry
//   session, so a session's own prices never move that session's stop.
// - An active stop fills at the opening trade when the session opens at or below it. Otherwise the first
//   minute whose low reaches it triggers it, and it fills at the stop price when that minute opened above
//   the stop, or at the minute's open when it opened at or below the stop. Filling at the stop price is an
//   assumption: the bars show that trading crossed it, not the price a stop-market order got, which can be
//   lower in fast markets. The `next-open` stop fill instead uses the next minute's opening trade as a
//   bound on that uncertainty. The bid-ask spread isn't modeled.
// - The maximum-hold loss exit is decided on the opening trade, so it sells at the next observed trade:
//   the open of the next minute with trades.
// - Interest accrues per calendar day from the entry date to the exit date, and none on the entry day, as
//   with daily bars. Exact intraday times are deliberately not used for interest.
// - Prices are raw. Dividends aren't modeled, and ex-dividend drops are price moves.
//
// Re-entry after a losing trade. The mechanism was validated trade for trade against the research
// implementation in research/risk-management/adaptive-reentry on daily bars with an earlier configuration
// (0.5% material loss, 3% lower re-entry); the current parameters are checked by
// research/risk-management/allin-minute-conversion/scripts/validate.ts.
// - A trade whose ETF price return (exit price / entry price - 1, interest excluded) is at most -1%
//   makes the strategy RESTRICTED_AFTER_LOSS. A smaller price loss, or a loss caused only by interest,
//   leaves normal entry eligibility in place.
// - The restriction freezes the losing exit's actual execution price and the 90-session reference high
//   used by the losing trade's entry signal, and tracks the lowest close since the exit session.
// - While restricted, a new entry needs the original 10% signal AND a decision price at or below 98% of the
//   frozen loss-exit price (2% below it). The restriction clears when a new position opens, or when a close recovers 38%
//   of the decline from the frozen reference high to the episode low (recovery reset, evaluated at every
//   close while restricted and flat, including the exit session itself). A reset never buys by itself: when
//   the decision price would qualify as a reset (counting it towards the episode low, but without storing
//   it there), the reset takes priority and there's no entry. The reset itself still waits for the close,
//   so entries resume from the next session only if the close also qualifies.

import type { BacktestPosition, MarketSession } from '#types';
import { PositionType } from '#types';
import { formatNewYorkTime, groupMarketSessions, loadCsvMinuteBacktestData, resolveDataset, selectDataset } from '#lib';
import fs from 'fs-extra';

const secondsPerMinute = 60;
const secondsPerDay = 24 * 60 * 60;

// The tunable decision constants. Percentages are in integer tenths of a percentage point. The keys are
// the same as the daily optimizer's AllInParams, so its grid utilities apply unchanged.
export interface MinuteParams {
  dipTenths: number; // entry: decision price at least this far below the reference high
  trailingStopTenths: number; // stop distance below the post-entry high
  maximumHoldDays: number; // calendar days before a losing position is sold after the opening trade
  lookbackSessions: number; // trading sessions in the reference-high window, excluding the signal session
  materialLossTenths: number; // ETF price loss (interest excluded) that restricts re-entry
  lowerReentryTenths: number; // extra decline below the frozen loss-exit price required to re-enter
  retraceTenths: number; // recovery of the reference-high-to-episode-low decline that clears the restriction
}

// The constants in src/app/allIn.ts at the time of this study (sha256 71c5c327…).
export const incumbentParams: Readonly<MinuteParams> = Object.freeze({
  dipTenths: 25,
  trailingStopTenths: 21,
  maximumHoldDays: 8,
  lookbackSessions: 78,
  materialLossTenths: 22,
  lowerReentryTenths: 40,
  retraceTenths: 367
});

export const tenthsToFraction = (tenths: number) => tenths / 1000;

// Fixed comparability assumptions, not tuned.
export const investmentAmount = 100000;
export const marginInterestRate = 0.11;

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap';

// Where an execution price comes from in the minute bars.
export type ExecutionPrice =
  | 'first trade after decision' // the open of the first minute with trades at or after the decision
  | 'closing print' // when no regular-session minute after the decision has trades
  | 'opening trade' // the session's first regular-session trade
  | 'stop level' // the stop price, when a minute that opened above it traded through it
  | 'minute open through stop' // the open of a minute that opened at or below the stop
  | 'trigger minute close'; // `next-open` stop fills only, when no trade follows the triggering minute

// How an intraday stop trigger fills: at the stop price, or at the next observed trade after the minute.
export type StopFill = 'stop' | 'next-open';

export interface Fill {
  price: number;
  // Start of the minute holding the price, or the close for the closing print.
  time: number;
  // That minute's index in the session's bars, or the number of bars for the closing print.
  barIndex: number;
  execution: ExecutionPrice;
}

export interface SessionExit extends Fill {
  reason: ExitReason;
  isStopTriggered: boolean;
  // Whether the maximum hold was also due at the open, which only matters when the stop gaps.
  isMaximumHoldDue: boolean;
}

export interface SessionExitOptions {
  position: BacktestPosition;
  session: MarketSession;
  // Set before the session from the post-entry high through the previous session.
  stopPrice: number;
  // Accrued through this session's date, which is known before the session opens.
  interest: number;
  maximumHoldDays: number;
  stopFill: StopFill;
}

// The first observed trade at or after a time: the open of the first regular-session minute with trades,
// or else the closing print.
export const firstTradeFrom = (session: MarketSession, time: number): Fill | undefined => {
  const barIndex = session.bars.findIndex((bar) => bar.time >= time);
  const bar = session.bars[barIndex];

  if (bar) {
    return { price: bar.open, time: bar.time, barIndex, execution: 'first trade after decision' };
  }

  if (session.closingPrint !== undefined) {
    return {
      price: session.closingPrint,
      time: session.closeTime,
      barIndex: session.bars.length,
      execution: 'closing print'
    };
  }

  return undefined;
};

// Decides whether an open position exits during one session, walking its minutes in chronological order.
export const evaluateSessionExit = ({
  position,
  session,
  stopPrice,
  interest,
  maximumHoldDays,
  stopFill
}: SessionExitOptions): SessionExit | undefined => {
  const profitAt = (price: number) => position.shares * price - position.investment - interest;

  // Before the open: the stop is active for this session only if filling at the stop price would be
  // profitable after interest through the session. Nothing from the session's own prices is used, and
  // the decision is made afresh each session, so growing interest can leave the stop inactive.
  const isStopActive = profitAt(stopPrice) > 0;
  const daysHeld = (session.time - position.entryTimestamp) / secondsPerDay;
  const isMaximumHoldDue = daysHeld >= maximumHoldDays && profitAt(session.open) < 0;

  // At the open: a resting stop-market order fills at the opening trade when the session gaps through it,
  // even if that loses money, before any order placed in reaction to the open. A due maximum hold with an
  // active stop always means such a gap, since the open is then below breakeven and the stop above it.
  if (isStopActive && session.open <= stopPrice) {
    return {
      reason: 'trailing stop gap',
      price: session.open,
      time: session.bars[0]!.time,
      barIndex: 0,
      execution: 'opening trade',
      isStopTriggered: true,
      isMaximumHoldDue
    };
  }

  // Just after the open: the maximum hold sells if a sale at the opening trade would lose money. The order
  // can only go in once that trade is known, so it fills at the next observed trade.
  if (isMaximumHoldDue) {
    const fill = firstTradeFrom(session, session.bars[0]!.time + secondsPerMinute);

    return fill && { ...fill, reason: 'maximum hold', isStopTriggered: false, isMaximumHoldDue };
  }

  if (!isStopActive) {
    return undefined;
  }

  // During the session: the first minute that reaches an active stop triggers it.
  for (const [barIndex, bar] of session.bars.entries()) {
    const trigger = {
      reason: 'trailing stop' as const,
      time: bar.time,
      barIndex,
      isStopTriggered: true,
      isMaximumHoldDue
    };

    // The minute opened through the stop, so its opening trade is the first one at or below it.
    if (bar.open <= stopPrice) {
      return { ...trigger, price: bar.open, execution: 'minute open through stop' };
    }

    if (bar.low <= stopPrice) {
      if (stopFill === 'stop') {
        return { ...trigger, price: stopPrice, execution: 'stop level' };
      }

      const fill = firstTradeFrom(session, bar.time + secondsPerMinute);

      return fill ? { ...trigger, ...fill } : { ...trigger, price: bar.close, execution: 'trigger minute close' };
    }
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
  decisionPrice: number;
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

export interface EntryFill extends Fill {
  decisionTime: number;
  decisionPrice: number; // the close of the last minute completed by the decision
  sessionClose: number;
}

// Tracks the largest fall in marked profit from an earlier peak.
const createDrawdownTracker = (startTimestamp: number) => {
  const tracker = {
    peakProfit: 0,
    peakTimestamp: startTimestamp,
    maximumDrawdown: 0,
    drawdownPeakTimestamp: startTimestamp,
    drawdownTroughTimestamp: startTimestamp,
    update: (markedProfit: number, timestamp: number) => {
      if (markedProfit > tracker.peakProfit) {
        tracker.peakProfit = markedProfit;
        tracker.peakTimestamp = timestamp;
      }

      if (tracker.peakProfit - markedProfit > tracker.maximumDrawdown) {
        tracker.maximumDrawdown = tracker.peakProfit - markedProfit;
        tracker.drawdownPeakTimestamp = tracker.peakTimestamp;
        tracker.drawdownTroughTimestamp = timestamp;
      }
    }
  };

  return tracker;
};

// What a position-size callback sees at an entry decision: only what is known one minute before the close.
// It never sees the fill or the session's later prices.
export interface PositionSizingContext {
  date: string; // the session's New York date
  decisionTime: number;
  decisionPrice: number; // the close of the last minute completed by the decision
  positions: readonly BacktestPosition[]; // every earlier position, closed ones with their exits
}

export interface AllInOptions {
  symbol?: string;
  startDate?: string;
  endDate?: string;
  dataFile?: string;
  outDir?: string;
  stopFill?: string;
  // The dollars to buy at each entry. Without it every entry buys a fixed $100,000. The signals and exits
  // don't depend on the size: interest scales with the investment, so every profit test keeps its sign.
  sizePosition?: (context: PositionSizingContext) => number;
  // Working-copy additions; see the header.
  params?: MinuteParams;
  allSessions?: MarketSession[];
  warmup?: boolean;
  costBps?: number[];
  log?: (line: string) => void;
}

// Cost-adjusted figures for one extra cost per side, in basis points of each fill's notional.
export interface CostResult {
  bps: number;
  costs: number; // executed entry and exit costs, plus the exit cost of an open position at the last close
  netProfit: number;
  maximumDrawdown: number; // daily mark to market
  minuteMaximumDrawdown: number;
}

// The daily mark to market at the last session of each calendar year in the run (cost-free, then one per
// cost level), so a year's P&L is the difference between consecutive year-end marks.
export interface YearMark {
  year: number;
  lastDate: string;
  mark: number;
  costMarks: number[];
}

export interface AllInResult {
  sessions: MarketSession[];
  positions: BacktestPosition[];
  entryFills: Map<BacktestPosition, EntryFill>;
  exitFills: Map<BacktestPosition, SessionExit & { stopPrice: number }>;
  stateLog: StateLogRow[];
  episodes: Episode[];
  // Working-copy additions.
  startIndex: number;
  entryIndexes: Map<BacktestPosition, number>;
  exitIndexes: Map<BacktestPosition, number>;
  summary: Record<string, unknown>;
  costResults: CostResult[];
  yearMarks: YearMark[];
  exposureSessions: number;
}

// The strategy itself, for the command line above and for callers that size positions themselves.
export const runAllInMinute = async ({
  symbol = 'VGT',
  startDate,
  endDate,
  dataFile,
  outDir,
  stopFill: stopFillArgument,
  sizePosition,
  params = incumbentParams,
  allSessions: preloadedSessions,
  warmup = false,
  costBps = [],
  log = console.info
}: AllInOptions = {}): Promise<AllInResult> => {
  const optional = (value?: string) => (value === '-' || value === '' ? undefined : value);
  const startTimestamp = optional(startDate) ? Date.parse(startDate!) / 1000 : -Infinity;
  const endTimestamp = optional(endDate) ? Date.parse(endDate!) / 1000 : Infinity;
  const stopFill = (optional(stopFillArgument) ?? 'stop') as StopFill;

  if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) {
    throw new Error('Start and end dates must be YYYY-MM-DD');
  }

  if (stopFill !== 'stop' && stopFill !== 'next-open') {
    throw new Error("The stop fill must be 'stop' or 'next-open'");
  }

  const strategyName = 'material1-lower2-retrace38';
  const file = resolveDataset(symbol, dataFile).file;
  const allSessions = preloadedSessions ?? groupMarketSessions(await loadCsvMinuteBacktestData(symbol, file));
  // With warmup, earlier sessions are kept as reference-high history; trading starts at startIndex.
  const sessions = allSessions.filter(
    (session) => (warmup || session.time >= startTimestamp) && session.time <= endTimestamp
  );
  const firstTraded = sessions.findIndex((session) => session.time >= startTimestamp);
  const startIndex = firstTraded < 0 ? sessions.length : firstTraded;
  const tickWindowSize = params.lookbackSessions;
  const positions: BacktestPosition[] = [];
  const targetPercentChange = tenthsToFraction(params.dipTenths); // target change
  const trailingStopPercentage = tenthsToFraction(params.trailingStopTenths); //  drop from the post-entry high
  const maximumHoldDays = params.maximumHoldDays; // days before a losing position is sold
  const materialLossThreshold = tenthsToFraction(params.materialLossTenths); // price loss that makes the next entry wait for a lower price
  const lowerPriceReentry = tenthsToFraction(params.lowerReentryTenths); // extra decline below the frozen loss-exit price required to re-enter
  const retraceFraction = tenthsToFraction(params.retraceTenths); // recovery of the reference-high-to-episode-low decline that clears it
  let postEntryHigh = 0;
  let postEntryLow = 0;
  let stopPrice = 0;
  let realizedProfit = 0;
  let entriesWithoutTrade = 0;
  const dailyDrawdown = createDrawdownTracker(sessions[startIndex]?.time ?? 0);
  const minuteDrawdown = createDrawdownTracker(sessions[startIndex]?.bars[0]?.time ?? 0);
  let exposureSessions = 0;

  // The cost layer: executed costs so far, per level, and one drawdown pair per level. Decisions never
  // see it.
  const costRates = costBps.map((bps) => bps / 10000);
  const costPaid = costRates.map(() => 0);
  const costDailyDrawdown = costRates.map(() => createDrawdownTracker(sessions[startIndex]?.time ?? 0));
  const costMinuteDrawdown = costRates.map(() => createDrawdownTracker(sessions[startIndex]?.bars[0]?.time ?? 0));
  const yearMarks: YearMark[] = [];

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
  const entryFills = new Map<BacktestPosition, EntryFill>();
  const exitFills = new Map<BacktestPosition, SessionExit & { stopPrice: number }>();
  const dailyRows: {
    index: number;
    date: string;
    close: number;
    borrowed: number;
    mtmProfit: number;
    recentHigh: number;
    decisionPrice: number;
    signal: boolean;
  }[] = [];

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
  const formatTime = (timestamp: number) => new Date(timestamp * 1000).toISOString();

  const exitReasonDescriptions: Record<ExitReason, string> = {
    'maximum hold': `${maximumHoldDays}-day loss exit, sold after the opening trade`,
    'trailing stop': 'trailing stop',
    'trailing stop gap': 'trailing stop, filled at the opening trade after a gap down'
  };

  const executionDescriptions: Record<ExecutionPrice, string> = {
    'first trade after decision': 'the opening trade of the first minute after the decision (observed proxy)',
    'closing print': 'the closing print, the first trade after the decision (observed proxy)',
    'opening trade': "the session's opening trade (observed proxy)",
    'stop level': 'the stop price, crossed within the minute (assumed; the actual fill may be lower)',
    'minute open through stop': 'the opening trade of a minute that opened through the stop (observed proxy)',
    'trigger minute close': "the triggering minute's last trade (observed proxy)"
  };

  // Simple interest on the borrowed amount, accrued for the time the position has been held.
  const calculateInterest = (position: BacktestPosition, timestamp: number) => {
    const yearsHeld = (timestamp - position.entryTimestamp) / (365 * secondsPerDay);

    return position.investment * marginInterestRate * yearsHeld;
  };

  // An open position marked to a price, net of the interest accrued through the session's date.
  const calculateUnrealizedProfit = (position: BacktestPosition, session: MarketSession, price = session.close) =>
    position.shares * price - position.investment - calculateInterest(position, session.time);

  // The close that clears the restriction: 38% of the way back from the episode low to the frozen
  // reference high. It falls as the episode low falls and is never computed from future prices.
  const resetLevelOf = (current: Restriction) =>
    current.episodeLow + retraceFraction * (current.referenceHigh - current.episodeLow);

  const logState = (
    index: number,
    session: MarketSession,
    decisionPrice: number,
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
      date: session.date,
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
      close: session.close,
      decisionPrice,
      signal,
      entryExecuted
    });
  };

  // Keeps the latest mark of each calendar year; the last one written for a year is its year-end mark.
  const recordYearMark = (session: MarketSession, mark: number, costMarks: number[]) => {
    const year = Number(session.date.slice(0, 4));
    const last = yearMarks.at(-1);

    if (last?.year === year) {
      last.lastDate = session.date;
      last.mark = mark;
      last.costMarks = costMarks;
    } else {
      yearMarks.push({ year, lastDate: session.date, mark, costMarks });
    }
  };

  sessions.forEach((session, index) => {
    if (index < startIndex) {
      return;
    }

    const sessionWindow: MarketSession[] = sessions.slice(Math.max(0, index - tickWindowSize), index);
    const recentHigh = Math.max(...sessionWindow.map((windowSession) => windowSession.high));

    // One minute before the close, only minutes that have completed by then are known. The last one's
    // close stands in for the session's close, which comes later.
    const decisionTime = session.closeTime - secondsPerMinute;
    const decisionBar = session.bars.findLast((bar) => bar.time + secondsPerMinute <= decisionTime);
    const decisionPrice = decisionBar?.close ?? NaN;
    const percentChange = 1 - decisionPrice / recentHigh;

    // Skip the first session.
    if (index === 0) {
      dailyRows.push({
        index,
        date: session.date,
        close: session.close,
        borrowed: 0,
        mtmProfit: 0,
        recentHigh,
        decisionPrice,
        signal: false
      });
      recordYearMark(
        session,
        0,
        costPaid.map(() => 0)
      );
      return;
    }

    const openPositions = positions.filter((position) => position.isOpen);
    const signal = percentChange >= targetPercentChange;
    const realizedAtStart = realizedProfit;
    const costAtStart = [...costPaid];
    let buy = openPositions.length === 0 && signal;
    let entryBlocked = false;

    // While restricted, the decision price counts towards the episode low for this decision only (the
    // episode low itself only takes closes), then: a decision price at or above the reset level takes
    // the recovery-reset path (never a purchase); otherwise an entry additionally needs a decision price
    // at or below the frozen lower level.
    if (buy && restriction) {
      const provisional = { ...restriction, episodeLow: Math.min(restriction.episodeLow, decisionPrice) };

      if (decisionPrice >= resetLevelOf(provisional) || decisionPrice > restriction.lowerLevel) {
        buy = false;
        entryBlocked = true;
      }
    }

    const fill = buy ? firstTradeFrom(session, decisionTime) : undefined;

    if (buy && !fill) {
      entriesWithoutTrade++;
      log(`No trade after the entry decision at ${formatNewYorkTime(decisionTime)} on ${session.date}, so no entry\n`);
    }

    let enteredPosition: BacktestPosition | undefined;

    if (fill && decisionBar) {
      // The size is decided at the decision, before the fill is known. Vanguard allows partial shares.
      const investment = sizePosition
        ? sizePosition({ date: session.date, decisionTime, decisionPrice, positions })
        : investmentAmount;

      if (!(investment > 0) || !Number.isFinite(investment)) {
        throw new Error(`Position size ${investment} on ${session.date} must be a positive number of dollars`);
      }

      const shares = investment / fill.price;
      const position: BacktestPosition = {
        isOpen: true,
        symbol,
        type: PositionType.Long,
        shares,
        investment,
        // The session's date, not the fill's minute, so that interest and the maximum hold keep counting
        // calendar days.
        entryTimestamp: session.time,
        entryPrice: fill.price
      };

      positions.push(position);
      enteredPosition = position;
      entryIndexes.set(position, index);
      entryFills.set(position, { ...fill, decisionTime, decisionPrice, sessionClose: session.close });
      entryReferenceHigh = recentHigh;

      // After the entry session, the high and the stop for the next session, from the fill onwards only.
      const laterBars = session.bars.slice(fill.barIndex);

      postEntryHigh = Math.max(fill.price, session.close, ...laterBars.map((bar) => bar.high));
      postEntryLow = Math.min(fill.price, session.close, ...laterBars.map((bar) => bar.low));
      stopPrice = postEntryHigh * (1 - trailingStopPercentage);

      log(
        `Entered at ${targetPercentChange * 100}% change on ${formatTime(fill.time)} (${formatNewYorkTime(fill.time)}) from ${formatPrice(recentHigh)} to ${formatPrice(fill.price)}`
      );
      log(
        `Entry decision at ${formatNewYorkTime(decisionTime)} on the ${formatNewYorkTime(decisionBar.time)} minute's close of ${formatPrice(decisionPrice)}; filled at ${executionDescriptions[fill.execution]}; the session closed at ${formatPrice(session.close)}`
      );

      if (restriction) {
        log(
          `Lower-price reentry: decision price ${formatPrice(decisionPrice)} is at least ${formatPercent(lowerPriceReentry)} below the loss exit at ${formatPrice(restriction.lossExitPrice)}`
        );
      }
    }

    const [position] = openPositions;
    let exit: SessionExit | undefined;

    // Only apply the exits when exactly one position is open. The `position` check also
    // narrows its type, since destructuring an array yields `BacktestPosition | undefined`.
    if (position && openPositions.length === 1) {
      const interest = calculateInterest(position, session.time);

      exit = evaluateSessionExit({ position, session, stopPrice, interest, maximumHoldDays, stopFill });

      if (exit) {
        position.isOpen = false;
        position.exitTimestamp = session.time;
        position.exitPrice = exit.price;
        position.interest = interest;
        position.profit = position.shares * exit.price - position.investment - interest;
        realizedProfit += position.profit;
        exitIndexes.set(position, index);
        exitReasons.set(position, exit.reason);
        exitFills.set(position, { ...exit, stopPrice });

        const monthsHeld = (session.time - position.entryTimestamp) / ((365 / 12) * secondsPerDay);
        const alsoDue =
          exit.reason === 'trailing stop gap' && exit.isMaximumHoldDue
            ? ' (the maximum hold was also due at the open)'
            : '';

        log(
          `Exited at ${formatTime(exit.time)} (${formatNewYorkTime(exit.time)}) from ${formatPrice(position.entryPrice)} to ${formatPrice(exit.price)} for a profit of ${formatDollars(position.profit)} after ${formatDollars(interest)} in interest`
        );
        log(`Exit reason: ${exitReasonDescriptions[exit.reason]}${alsoDue}`);
        log(`Exit price: ${executionDescriptions[exit.execution]}, stop at ${formatPrice(stopPrice)}`);
        // The lowest price seen while the position was open, including the exit itself and the exit
        // session's minutes before the exit's minute. That minute's own low may have come after the
        // fill, so it's left out.
        const lowestLow = Math.min(
          postEntryLow,
          exit.price,
          ...session.bars.slice(0, exit.barIndex).map((bar) => bar.low)
        );
        const dropToLowestLow = 1 - lowestLow / position.entryPrice;

        log(`Held for ${formatMonths(monthsHeld)} months`);
        log(`Lowest low: ${formatPrice(lowestLow)} (${formatPercent(dropToLowestLow)} below entry)\n`);

        // A material price loss (interest excluded) freezes the restriction. A smaller loss, including
        // one caused only by interest, and any profit leave the strategy unrestricted. The frozen
        // reference high is the entry signal's, not today's; the episode low starts at today's close.
        const priceReturn = exit.price / position.entryPrice - 1;

        if (priceReturn <= -materialLossThreshold) {
          restriction = {
            lossExitPrice: exit.price,
            referenceHigh: entryReferenceHigh,
            lowerLevel: exit.price * (1 - lowerPriceReentry),
            episodeLow: session.close
          };
          episode = {
            exitIndex: index,
            exitDate: session.date,
            exitReason: exit.reason,
            loss: position.profit,
            priceReturn,
            lossExitPrice: exit.price,
            losingEntryPrice: position.entryPrice,
            referenceHigh: entryReferenceHigh,
            episodeLow: session.close,
            resolution: '',
            resolutionDate: ''
          };
          episodes.push(episode);
          logState(
            index,
            session,
            decisionPrice,
            'NORMAL',
            'RESTRICTED',
            'losing_exit',
            signal,
            false,
            exit.reason,
            position.profit,
            priceReturn
          );
          log(
            `Restricted after a ${formatPercent(-priceReturn)} price loss: reentry needs a decision price at or below ${formatPrice(restriction.lowerLevel)}; a close at or above ${formatPrice(resetLevelOf(restriction))} (${formatPercent(retraceFraction)} of the way back from the episode low to ${formatPrice(entryReferenceHigh)}) resets\n`
          );
        } else if (position.profit < 0) {
          logState(
            index,
            session,
            decisionPrice,
            'NORMAL',
            'NORMAL',
            'loss_not_restricted',
            signal,
            false,
            exit.reason,
            position.profit,
            priceReturn
          );
          log(
            `Not restricted: the ${formatPercent(priceReturn)} price change is above the ${formatPercent(-materialLossThreshold)} material-loss threshold\n`
          );
        } else {
          logState(
            index,
            session,
            decisionPrice,
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
        postEntryHigh = Math.max(postEntryHigh, session.high);
        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
        postEntryLow = Math.min(postEntryLow, session.low);
      }
    }

    // Minute-sampled mark-to-market profit: at each regular-session minute's close, then at the official
    // close. The position held during the session counts from its fill's minute until its exit's minute.
    const sessionPosition = position ?? enteredPosition;
    const heldFrom = position ? 0 : (fill?.barIndex ?? Infinity);
    const heldUntil = exit?.barIndex ?? Infinity;
    const marks = [
      ...session.bars.map((bar) => ({ time: bar.time, price: bar.close })),
      { time: session.closeTime, price: session.close }
    ];

    marks.forEach(({ time, price }, barIndex) => {
      const isHeld = sessionPosition && barIndex >= heldFrom && barIndex < heldUntil;
      const realized = barIndex >= heldUntil ? realizedProfit : realizedAtStart;

      minuteDrawdown.update(realized + (isHeld ? calculateUnrealizedProfit(sessionPosition, session, price) : 0), time);
    });

    // The cost layer: an entry's cost is paid at its fill's minute and an exit's at its exit's minute, and
    // an open position is marked net of the cost of selling it at the mark (liquidation value).
    const entryCosts = costRates.map((rate) => (enteredPosition ? rate * enteredPosition.investment : 0));
    const exitCosts = costRates.map((rate) => (exit && position ? rate * position.shares * exit.price : 0));

    costRates.forEach((rate, level) => {
      marks.forEach(({ time, price }, barIndex) => {
        const isHeld = sessionPosition && barIndex >= heldFrom && barIndex < heldUntil;
        const realized = barIndex >= heldUntil ? realizedProfit : realizedAtStart;
        const paid =
          costAtStart[level]! +
          (barIndex >= heldFrom ? entryCosts[level]! : 0) +
          (barIndex >= heldUntil ? exitCosts[level]! : 0);
        const unrealized = isHeld
          ? calculateUnrealizedProfit(sessionPosition, session, price) - rate * sessionPosition.shares * price
          : 0;

        costMinuteDrawdown[level]!.update(realized - paid + unrealized, time);
      });
      costPaid[level] = costAtStart[level]! + entryCosts[level]! + exitCosts[level]!;
    });

    // Daily mark-to-market profit: realized profit plus any open position at the close, net of interest.
    const openPosition = positions.find((position) => position.isOpen);
    const markedProfit = realizedProfit + (openPosition ? calculateUnrealizedProfit(openPosition, session) : 0);
    const costMarks = costRates.map(
      (rate, level) => markedProfit - costPaid[level]! - (openPosition ? rate * openPosition.shares * session.close : 0)
    );

    costMarks.forEach((mark, level) => costDailyDrawdown[level]!.update(mark, session.time));
    recordYearMark(session, markedProfit, costMarks);
    exposureSessions += openPosition ? 1 : 0;

    dailyRows.push({
      index,
      date: session.date,
      close: session.close,
      borrowed: openPosition ? openPosition.investment : 0,
      mtmProfit: markedProfit,
      recentHigh,
      decisionPrice,
      signal
    });
    dailyDrawdown.update(markedProfit, session.time);

    // End of the session: resolve the restriction. A position opened at this session's decision clears
    // it; otherwise today's close extends the episode low and a close at or above the reset level clears
    // it (recovery reset, never a purchase). The log mirrors the research implementation: one row per
    // restricted session.
    if (restriction && episode) {
      restriction.episodeLow = Math.min(restriction.episodeLow, session.close);
      episode.episodeLow = restriction.episodeLow;

      if (openPosition && entryIndexes.get(openPosition) === index) {
        logState(index, session, decisionPrice, 'RESTRICTED', 'NORMAL', 'lower_price_reentry', signal, true);
        episode.resolution = 'lower_price_reentry';
        episode.resolutionDate = session.date;
        restriction = undefined;
        episode = undefined;
      } else if (!openPosition && session.close >= resetLevelOf(restriction)) {
        logState(index, session, decisionPrice, 'RESTRICTED', 'NORMAL', 'recovery_reset', signal, false);
        log(
          `Recovery reset on ${session.date}: close ${formatPrice(session.close)} recovered ${formatPercent(retraceFraction)} of the decline from ${formatPrice(restriction.referenceHigh)} to the episode low ${formatPrice(restriction.episodeLow)}\n`
        );
        episode.resolution = 'recovery_reset';
        episode.resolutionDate = session.date;
        restriction = undefined;
        episode = undefined;
      } else {
        logState(
          index,
          session,
          decisionPrice,
          'RESTRICTED',
          'RESTRICTED',
          entryBlocked ? 'entry_blocked' : 'restricted',
          signal,
          false
        );

        if (index === sessions.length - 1) {
          episode.resolution = 'unresolved_at_end';
          episode.resolutionDate = session.date;
        }
      }
    } else if (openPosition && entryIndexes.get(openPosition) === index) {
      logState(index, session, decisionPrice, 'NORMAL', 'NORMAL', 'normal_entry', signal, true);
    }
  });

  const closedPositions = positions.filter((position) => !position.isOpen);
  const openPosition = positions.find((position) => position.isOpen);
  const lastSession = sessions.at(-1);
  const closedInterest = closedPositions.reduce((total, position) => total + (position.interest ?? 0), 0);
  const accruedInterest = openPosition && lastSession ? calculateInterest(openPosition, lastSession.time) : 0;
  const unrealizedProfit = openPosition && lastSession ? calculateUnrealizedProfit(openPosition, lastSession) : 0;

  if (openPosition && lastSession) {
    log(
      `Still open on ${lastSession.date}: entered at ${formatPrice(openPosition.entryPrice)} and marked at the close of ${formatPrice(lastSession.close)} for an unrealized profit of ${formatDollars(unrealizedProfit)} after ${formatDollars(accruedInterest)} in accrued interest\n`
    );
  }

  const firstSession = sessions[startIndex];

  if (firstSession && lastSession) {
    log(`Symbol: ${symbol}, from ${firstSession.date} to ${lastSession.date}`);
  }

  log(`Strategy: ${strategyName}, data file: ${file}`);
  log(
    `Execution: one-minute bars; entries decided one minute before the close and filled at the next trade; intraday stops filled at ${stopFill === 'stop' ? 'the stop price' : 'the next minute’s opening trade'}`
  );
  log(`Closed trades: ${closedPositions.length}${openPosition ? ', plus 1 still open' : ''}`);
  log(`Realized profit: ${formatDollars(realizedProfit)}`);
  log(`Unrealized profit on the open position: ${formatDollars(unrealizedProfit)}`);
  log(`Total net profit: ${formatDollars(realizedProfit + unrealizedProfit)}`);
  log(
    `Margin interest: ${formatDollars(closedInterest + accruedInterest)} (${formatDollars(closedInterest)} on closed trades, ${formatDollars(accruedInterest)} accrued on the open position)`
  );
  log(
    `Maximum drawdown (daily mark-to-market): ${formatDollars(dailyDrawdown.maximumDrawdown)}, from ${formatDate(dailyDrawdown.drawdownPeakTimestamp)} to ${formatDate(dailyDrawdown.drawdownTroughTimestamp)}`
  );
  log(
    `Maximum drawdown (minute-sampled mark-to-market): ${formatDollars(minuteDrawdown.maximumDrawdown)}, from ${formatNewYorkTime(minuteDrawdown.drawdownPeakTimestamp)} to ${formatNewYorkTime(minuteDrawdown.drawdownTroughTimestamp)}`
  );
  log(
    `Maximum drawdown as a capital-allocation reference: ${formatPercent(dailyDrawdown.maximumDrawdown / investmentAmount)} of the ${formatDollars(investmentAmount)} trading allocation (not a drawdown of invested equity or of the overall portfolio)`
  );
  log(`Target percent change: ${formatPercent(targetPercentChange)}`);
  log(`Trailing stop percentage: ${formatPercent(trailingStopPercentage)}`);
  log(`Maximum hold: ${maximumHoldDays} days`);
  log(
    `Reentry after a material loss (price loss of at least ${formatPercent(materialLossThreshold)}): ${formatPercent(lowerPriceReentry)} below the loss exit, reset after a ${formatPercent(retraceFraction)} retracement`
  );

  if (entriesWithoutTrade > 0) {
    log(`Entry signals without any trade after the decision: ${entriesWithoutTrade}`);
  }

  const summary = {
    symbol,
    dataFile: file,
    strategy: strategyName,
    stopFill,
    materialLossThreshold,
    lowerPriceReentry,
    retraceFraction,
    firstDate: firstSession?.date ?? '',
    lastDate: lastSession?.date ?? '',
    sessions: sessions.length - startIndex,
    closedTrades: closedPositions.length,
    openAtEnd: Boolean(openPosition),
    realizedProfit,
    unrealizedProfit,
    netProfit: realizedProfit + unrealizedProfit,
    marginInterest: closedInterest + accruedInterest,
    maximumDrawdown: dailyDrawdown.maximumDrawdown,
    drawdownPeakDate: formatDate(dailyDrawdown.drawdownPeakTimestamp),
    drawdownTroughDate: formatDate(dailyDrawdown.drawdownTroughTimestamp),
    minuteMaximumDrawdown: minuteDrawdown.maximumDrawdown,
    minuteDrawdownPeakTime: formatTime(minuteDrawdown.drawdownPeakTimestamp),
    minuteDrawdownTroughTime: formatTime(minuteDrawdown.drawdownTroughTimestamp),
    entriesWithoutTrade,
    restrictions: episodes.length,
    lowerPriceReentries: episodes.filter((row) => row.resolution === 'lower_price_reentry').length,
    recoveryResets: episodes.filter((row) => row.resolution === 'recovery_reset').length,
    lossesNotRestricted: stateLog.filter((row) => row.reason === 'loss_not_restricted').length
  };

  if (outDir && lastSession) {
    await fs.ensureDir(outDir);

    const tradeLines = [
      'entry_index,exit_index,entry_date,exit_date,entry_price,exit_price,reason,investment,shares,interest,profit,entry_time,entry_execution,decision_time,decision_price,entry_session_close,exit_time,exit_execution,exit_stop_price,maximum_hold_due'
    ];

    for (const position of positions) {
      const isOpen = position.isOpen;
      const interest = isOpen ? accruedInterest : (position.interest ?? 0);
      const profit = isOpen ? unrealizedProfit : (position.profit ?? 0);
      const exitPrice = isOpen ? lastSession.close : (position.exitPrice ?? 0);
      const entryFill = entryFills.get(position);
      const exitFill = exitFills.get(position);

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
          profit,
          entryFill ? formatTime(entryFill.time) : '',
          entryFill?.execution ?? '',
          entryFill ? formatTime(entryFill.decisionTime) : '',
          entryFill?.decisionPrice ?? '',
          entryFill?.sessionClose ?? '',
          exitFill ? formatTime(exitFill.time) : '',
          exitFill?.execution ?? '',
          exitFill?.stopPrice ?? '',
          exitFill?.isMaximumHoldDue ?? ''
        ].join(',')
      );
    }

    const dailyLines = ['index,date,close,borrowed,mtm_pnl,recent_high,decision_price,signal'];

    for (const row of dailyRows) {
      dailyLines.push(
        [
          row.index,
          row.date,
          row.close,
          row.borrowed,
          row.mtmProfit,
          row.recentHigh,
          row.decisionPrice,
          row.signal
        ].join(',')
      );
    }

    const stateLines = [
      'index,date,prev_state,new_state,reason,exit_reason,trade_profit,price_return,loss_exit_price,ref_high,lower_level,episode_low,reset_level,close,signal,entry_executed,decision_price'
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
          row.entryExecuted,
          row.decisionPrice
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

    await fs.writeFile(`${outDir}/trades.csv`, `${tradeLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/daily.csv`, `${dailyLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/states.csv`, `${stateLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/episodes.csv`, `${episodeLines.join('\n')}\n`);
    await fs.writeFile(`${outDir}/summary.json`, `${JSON.stringify(summary, null, 1)}\n`);
    log(`Wrote trades.csv, daily.csv, states.csv, episodes.csv and summary.json to ${outDir}`);
  }

  const costResults: CostResult[] = costBps.map((bps, level) => {
    const openCost = openPosition && lastSession ? costRates[level]! * openPosition.shares * lastSession.close : 0;

    return {
      bps,
      costs: costPaid[level]! + openCost,
      netProfit: realizedProfit + unrealizedProfit - costPaid[level]! - openCost,
      maximumDrawdown: costDailyDrawdown[level]!.maximumDrawdown,
      minuteMaximumDrawdown: costMinuteDrawdown[level]!.maximumDrawdown
    };
  });

  return {
    sessions,
    positions,
    entryFills,
    exitFills,
    stateLog,
    episodes,
    startIndex,
    entryIndexes,
    exitIndexes,
    summary,
    costResults,
    yearMarks,
    exposureSessions
  };
};

// Run with `npm run app -- allIn-minute-optimizable [symbol] [partition] [start date] [end date] [data file] [output dir] [stop
// fill]`, for example `npm run app -- allIn-minute-optimizable VGT holdout` or `npm run app -- allIn-minute-optimizable VGT 2016-10-07 2023-12-29`.
// The symbol defaults to VGT and the inclusive YYYY-MM-DD New York session dates to the whole data file. The
// dataset is the partition (training, holdout, final or all; src/lib/dataset.ts), which src/app.ts moves into
// the data-file slot, or an explicit data file; without either it is data/<symbol>/training/data.csv. Pass '-'
// to leave an earlier argument at its default. When an output directory is given, the run also writes
// trades.csv, daily.csv, states.csv, episodes.csv and summary.json there at full precision. The stop fill is
// `stop` (default) or `next-open`.
export default async (
  symbol = 'VGT',
  startDate?: string,
  endDate?: string,
  dataFile?: string,
  outDir?: string,
  stopFillArgument?: string
) => {
  await runAllInMinute({
    symbol,
    startDate,
    endDate,
    dataFile: selectDataset(symbol, dataFile),
    outDir,
    stopFill: stopFillArgument
  });
};
