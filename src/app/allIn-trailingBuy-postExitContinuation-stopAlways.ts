// All in on a trailing buy after a deep dip, with a buffered intraday loss exit, no re-entry restriction,
// post-exit continuation, and always-active trailing stop (B-D)
//
// Generated from allIn-trailingBuy-postExitContinuation.ts (D1) by src/d1-refinement/generate.ts: D1 with its
// trailing stop's eligibility rule replaced by the policy below. Entries, the continuation window, the stop level,
// the fills, the other exits, interest, accounting and reports are D1's. The research engine
// (src/d1-refinement/engine.ts) reproduces this file (parity.ts). Do not edit D1 through this file.
//
// Stop activation B-D, always active: the trailing stop (post-entry high x (1 - trailingStopPercentage) from the
// fill's minute onwards on the entry session, then updated once a day after each session, never lowered) may
// execute from the session after the entry whatever the position's net result. File 4's test that a fill at the
// stop would net a profit after interest is removed; the maximum-hold and buffered-loss exits are unchanged.
//
// Generated from allIn-trailingBuy-bufferedLoss-noReentry.ts (file 4) by src/recovery-eligibility/generate.ts:
// file 4 plus the mechanism below. Entries through the deep path, the rebound, the fills, the exits, interest,
// accounting and reports are file 4's; the mechanism adds a way for a flat strategy to arm without a fresh
// X decline from the rolling reference high. The research engine (src/recovery-eligibility/engine.ts)
// reproduces this file (parity.ts).
//
// Post-exit continuation: a profitable exit opens a continuation WINDOW of continuationWindow sessions. The
// window tracks the post-exit high (the exit price, then the highest session high of the later sessions). While
// the window is open and the strategy is flat with no setup, a completed minute closing at or below the
// post-exit high x (1 - pullback) ARMS a trailing buy; any arming, or the window's last session, closes the
// window (mechanism D of research/vgt-recovery-eligibility). Current constants: pullback 9%, window 60 sessions.
//
// Below: file 4's own description.
//
// A copy of allIn-trailingBuy.ts with both variants' changes: the buffered intraday loss exit of
// allIn-trailingBuy-bufferedLoss.ts (from the 15th calendar day, a net loss of 0.5% of the investment at a
// completed minute's close sells), and the removal of the re-entry restriction of
// allIn-trailingBuy-noReentry.ts (no 1% material loss, 2% lower re-entry level or 38% recovery reset).
// Entries, the other exits, interest, accounting and reports are otherwise the same.
//
// Entry: when no position is open, a completed minute closing at least 10% (X) below the highest high of the
// previous 90 trading sessions ARMS a trailing buy; it doesn't buy. The setup then follows the lowest minute
// low and buys once a completed minute closes at least 3% (Y) above that low. Exit: an 8% trailing stop, or
// the 15-day loss exit.
//
// Entry states:
// - FLAT: no position, no setup, no order.
// - ARMED: a setup with its activation time and price, the reference high frozen at activation, and its
//   trailing low.
// - PENDING_FILL: the rebound was confirmed at a completed minute's close and the buy waits for the next
//   observed trade.
// - LONG: a position is open and managed by the exits.
//
// Execution model on one-minute bars (Alpaca, raw prices, each bar timestamped at the start of its minute):
// - Sessions are America/New_York trading dates. Only regular-session minutes, from 9:30 a.m. to the
//   scheduled close (4:00 p.m., or 1:00 p.m. on early-close days), are used, plus the closing-auction print
//   in the minute that starts at the close. Session-level values (the 90-session reference high, the daily
//   mark to market) come from sessions aggregated from those minutes,
//   so a 90-session window is still 90 trading sessions, and it never includes the current session.
// - Warmup: no setup arms before the first session with tickWindowSize complete previous sessions for the
//   reference high. A partition run (src/lib/evaluation.ts) counts the warm-up sessions read
//   before its window, so after a full warm-up the window's first session can arm. Warm-up sessions are only read
//   for the rolling window: never traded, marked or reported, and the run starts flat, with no setup, stop,
//   restriction, episode or continuation window from them. Window sessions before arming are processed and reported.
// - Entry decisions are made when a minute completes (the minute starting at 10:14 completes at 10:15), so
//   its open, high, low and close are all known then. Arming: a minute's close at or below the 10% level,
//   with no position and no setup. The activating minute never buys,
//   and its trailing low starts at that minute's close, not its low, which may have come before the close.
//   Each later completed minute lowers the trailing low to its own low, and then triggers the buy if its
//   close is at or above the trailing low times 1.03. The setup persists across sessions, never re-arms,
//   and doesn't need the 10% condition to still hold at the rebound.
// - The trigger level is a decision threshold, not a fill price. The marketable buy fills at the first
//   trade at or after the decision: the open of the next regular-session minute with trades, or the
//   closing print if no later minute in the session has trades and the decision came before the close.
//   A decision known only at the close (after the session's last minute completes) can't take the
//   simultaneous closing print and waits for the next session's opening trade, as does any order without
//   a later trade in its session. A minute's open is an observed trade price used as a proxy, not proof
//   that an order would have filled there.
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
// - Buffered intraday loss exit: on sessions where the maximum hold applies (at least 15 calendar days after
//   the entry date), a position that survives the open sells after the first completed minute whose close
//   puts its net profit (after interest through the session's date) at or below -0.5% of its investment.
//   The sale fills like an entry: at the next minute's opening trade, at the closing print only for a
//   decision made before the close, or else at the next session's opening trade. It never weakens the
//   opening check, so any loss at the opening trade still takes the maximum-hold exit. Against an active
//   stop, the earlier execution wins, and on the same opening trade the resting stop takes it. An active stop
//   sits above breakeven, so a close below the buffer has already reached it: within a session the buffer
//   only acts while the stop is inactive. A sale carried overnight can meet a stop that became active after
//   its signal session and gaps through at the open; the stop then takes that opening trade.
// - Exits are only checked on sessions that start with the position open, so there's no exit on the entry
//   session. Entries are only considered on sessions that start without a position, so there's no re-entry
//   on an exit session.
// - Interest accrues per calendar day from the entry date to the exit date, and none on the entry day, as
//   with daily bars. Exact intraday times are deliberately not used for interest or the maximum hold: the
//   position's entry timestamp is its fill session's date, and the fill's minute is in the entry fill.
// - Prices are raw. Dividends aren't modeled, and ex-dividend drops are price moves.
//
// No re-entry restriction: a losing exit, material or not, doesn't restrict the next entry. There's no frozen
// loss-exit price, no 2% lower level, no 38% recovery reset and no reset guard on arming or rebounds. After
// any exit, a fresh setup can arm from the next session on the normal 10% condition; an exit session still
// never arms or buys. The legacy restriction fields in the reports stay empty or zero, states.csv only logs
// entries and exits, and episodes.csv has no rows.

import type { BacktestPosition, MarketSession } from '#types';
import { PositionType } from '#types';
import {
  formatNewYorkTime,
  groupMarketSessions,
  loadCsvMinuteBacktestData,
  resolveDataset,
  selectDataset,
  strategyRunSessions
} from '#lib';
import fs from 'fs-extra';

const secondsPerMinute = 60;
const secondsPerDay = 24 * 60 * 60;

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap' | 'buffered intraday loss';

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
  // The level the stop executes at this session (the trailing stop, or the policy's protective stop).
  stopPrice: number;
  // Whether the stop may execute this session, decided before the open by the stop policy in `runAllIn`.
  isStopActive: boolean;
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

// The first trade an entry decided at `decisionTime` can fill at in this session. Like `firstTradeFrom`,
// except that the closing print is only eligible for a decision made before the close: a decision known
// only once the session's last minute completes, at the close itself, can't take the simultaneous
// closing-auction print. Without an eligible trade the order waits for a later session.
export const firstTradeAfterDecision = (session: MarketSession, decisionTime: number): Fill | undefined => {
  const fill = firstTradeFrom(session, decisionTime);

  return fill?.execution === 'closing print' && decisionTime >= session.closeTime ? undefined : fill;
};

// Decides whether an open position exits during one session, walking its minutes in chronological order.
export const evaluateSessionExit = ({
  position,
  session,
  stopPrice,
  interest,
  maximumHoldDays,
  stopFill,
  isStopActive
}: SessionExitOptions): SessionExit | undefined => {
  const profitAt = (price: number) => position.shares * price - position.investment - interest;

  // Before the open: whether the stop may execute this session comes from the stop policy (isStopActive),
  // decided in `runAllIn` from the previous session's level and the position's state; nothing from the
  // session's own prices is used.
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

// Kept for the states.csv schema. Without a re-entry restriction the state is always NORMAL.
type State = 'NORMAL' | 'RESTRICTED';

// The entry state at a session's close.
export type EntryState = 'FLAT' | 'ARMED' | 'PENDING_FILL' | 'LONG';

// A buffered-loss sale decided at a completed minute's close, waiting for the next eligible trade.
export interface BufferedLossSignal {
  date: string; // the signal session's New York date
  decisionTime: number; // the end of the minute whose close reached the buffer
  decisionPrice: number; // that close
  decisionProfit: number; // net profit at that close, after interest through the session's date
  threshold: number; // -investment * intradayLossBuffer
}

export interface BufferedSessionExit extends SessionExit {
  bufferedLossSignal?: BufferedLossSignal; // for a buffered-loss exit only
}

export interface BufferedSessionExitOptions extends SessionExitOptions {
  intradayLossBuffer: number;
  // A sale signalled in an earlier session that had no eligible trade left.
  pendingSignal?: BufferedLossSignal;
}

export interface BufferedSessionOutcome {
  exit?: BufferedSessionExit;
  // A sale signalled in this session with no eligible trade left in it.
  pendingSignal?: BufferedLossSignal;
}

// `evaluateSessionExit` plus the buffered intraday loss exit, keeping whichever exit executes first.
export const evaluateBufferedSessionExit = (options: BufferedSessionExitOptions): BufferedSessionOutcome => {
  const { position, session, stopPrice, isStopActive, interest, maximumHoldDays, intradayLossBuffer, pendingSignal } =
    options;
  const exit = evaluateSessionExit(options);
  const profitAt = (price: number) => position.shares * price - position.investment - interest;
  const daysHeld = (session.time - position.entryTimestamp) / secondsPerDay;
  const isMaximumHoldDue = daysHeld >= maximumHoldDays && profitAt(session.open) < 0;
  const threshold = -position.investment * intradayLossBuffer;
  const buffered = (fill: Fill, signal: BufferedLossSignal): BufferedSessionExit => ({
    ...fill,
    reason: 'buffered intraday loss',
    isStopTriggered: false,
    isMaximumHoldDue,
    bufferedLossSignal: signal
  });

  // At the open: a resting stop gapped through takes the opening trade, even from a pending sale.
  if (exit?.reason === 'trailing stop gap') {
    return { exit };
  }

  // A sale left pending by an earlier session fills at this session's opening trade, ahead of the maximum
  // hold, which is only decided on that trade.
  if (pendingSignal) {
    const fill = firstTradeAfterDecision(session, pendingSignal.decisionTime);

    if (fill) {
      return { exit: buffered({ ...fill, execution: 'opening trade' }, pendingSignal) };
    }
  }

  // Before the maximum hold applies the buffer has no say, nor when the maximum hold sells at the open.
  if (daysHeld < maximumHoldDays || isMaximumHoldDue) {
    return { exit };
  }

  // After the open: the first completed minute whose close reaches the buffer.
  const signalIndex = session.bars.findIndex((bar) => profitAt(bar.close) <= threshold);
  const signalBar = session.bars[signalIndex];

  if (!signalBar) {
    return { exit };
  }

  // The stop triggers in the first minute that opens or trades at or below it, as in `evaluateSessionExit`.
  // It wins if that minute is the signal's or earlier (the signal is only known at the minute's end), and
  // at the same opening trade: the minute after the signal opening through the stop.
  const stopIndex = isStopActive ? session.bars.findIndex((bar) => bar.open <= stopPrice || bar.low <= stopPrice) : -1;

  if (
    exit &&
    stopIndex >= 0 &&
    (stopIndex <= signalIndex || (stopIndex === signalIndex + 1 && session.bars[stopIndex]!.open <= stopPrice))
  ) {
    return { exit };
  }

  const signal: BufferedLossSignal = {
    date: session.date,
    decisionTime: signalBar.time + secondsPerMinute,
    decisionPrice: signalBar.close,
    decisionProfit: profitAt(signalBar.close),
    threshold
  };
  const fill = firstTradeAfterDecision(session, signal.decisionTime);

  return fill ? { exit: buffered(fill, signal) } : { pendingSignal: signal };
};

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

// The completed minute whose close confirmed the rebound, and the order it sent.
export interface ReboundSignal {
  index: number; // session index
  date: string;
  barTime: number; // start of the confirming minute
  time: number; // its end, when the decision is known
  price: number; // its close
  trigger: number; // the trailing low times 1 + Y at that minute
  trailingLow: number;
  investment: number; // decided at the signal, before the fill is known
  carriedOvernight: boolean; // no eligible trade after the signal in its own session
}

export type SetupStatus = 'armed' | 'pending' | 'filled' | 'cancelled';

// Which path armed a setup.
export type SetupKind = 'deep' | 'continuation';

// One trailing-buy setup, from its activation to its fill, cancellation, or the end of the data.
export interface TrailingBuySetup {
  id: number;
  status: SetupStatus;
  // 'filled', 'armed_at_end' or 'pending_at_end'. Nothing cancels a setup without the restriction.
  statusReason: string;
  activationIndex: number;
  activationDate: string;
  activationBarTime: number; // start of the activating minute
  activationTime: number; // its end, when the activation is known
  activationPrice: number; // its close
  referenceHigh: number; // the 90-session reference high, frozen at activation
  xLevel: number; // referenceHigh * (1 - X)
  kind: SetupKind; // which path armed the setup
  anchorHigh: number; // the level the activation was measured from (the reference high for the deep path)
  restrictedAtActivation: boolean; // always false: kept for the setups.csv schema
  lowerLevelAtActivation: number | ''; // always empty
  trailingLow: number; // the activation close, then the lowest later minute low
  trailingLowTime: number; // start of the minute that set the trailing low
  reboundTrigger: number; // trailingLow * (1 + Y)
  suppressedSignals: number; // always 0: there's no recovery-reset guard
  signal?: ReboundSignal;
  fill?: Fill & { index: number; date: string };
  endIndex?: number;
  endDate?: string;
}

export interface EntryFill extends Fill {
  decisionTime: number; // the end of the minute that confirmed the rebound
  decisionPrice: number; // that minute's close
  sessionClose: number;
  setupId: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number; // frozen at activation
  setupKind: SetupKind;
  anchorHigh: number;
  trailingLow: number;
  trailingLowTime: number;
  reboundTrigger: number;
  signalIndex: number; // session index of the rebound signal
  waitMinutes: number; // wall-clock minutes from the decision to the fill, including any overnight wait
  waitSessions: number; // sessions from the signal's session to the fill's
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

// What a position-size callback sees at an entry decision: only what is known when the rebound minute
// completes. It never sees the fill or later prices. An order still pending at the end of the data has
// been sized but opens no position.
export interface PositionSizingContext {
  date: string; // the signal session's New York date
  decisionTime: number;
  decisionPrice: number; // the close of the minute that confirmed the rebound
  positions: readonly BacktestPosition[]; // every earlier position, closed ones with their exits
  referenceHigh?: number; // frozen at the setup's activation
  trailingLow?: number;
  reboundTrigger?: number;
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
  // X and Y, defaulting to the settings in `runAllIn`.
  targetPercentChange?: number;
  trailingBuyPercentage?: number;
  // The buffered intraday loss exit's net loss, as a fraction of the investment (default 0.005).
  intradayLossBuffer?: number;
}

export interface AllInResult {
  sessions: MarketSession[];
  positions: BacktestPosition[];
  entryFills: Map<BacktestPosition, EntryFill>;
  exitFills: Map<BacktestPosition, BufferedSessionExit & { stopPrice: number }>;
  stateLog: StateLogRow[];
  episodes: Episode[];
  setups: TrailingBuySetup[];
}

// The strategy itself, for the command line below and for callers that size positions themselves.
export const runAllIn = async ({
  symbol = 'VGT',
  startDate,
  endDate,
  dataFile,
  outDir,
  stopFill: stopFillArgument,
  sizePosition,
  targetPercentChange: targetPercentChangeOption,
  trailingBuyPercentage: trailingBuyPercentageOption,
  intradayLossBuffer: intradayLossBufferOption
}: AllInOptions = {}): Promise<AllInResult> => {
  const optional = (value?: string) => (value === '-' || value === '' ? undefined : value);
  const startTimestamp = optional(startDate) ? Date.parse(startDate!) / 1000 : -Infinity;
  const endTimestamp = optional(endDate) ? Date.parse(endDate!) / 1000 : Infinity;
  const stopFill = (optional(stopFillArgument) ?? 'stop') as StopFill;
  // Unlike allIn.ts, '-' also leaves the output directory unset, so later arguments can follow it.
  const outputDir = optional(outDir);

  if (Number.isNaN(startTimestamp) || Number.isNaN(endTimestamp)) {
    throw new Error('Start and end dates must be YYYY-MM-DD');
  }

  if (stopFill !== 'stop' && stopFill !== 'next-open') {
    throw new Error("The stop fill must be 'stop' or 'next-open'");
  }

  const targetPercentChange = targetPercentChangeOption ?? 0.216; // X: arm after a >=21.6% decline
  const trailingBuyPercentage = trailingBuyPercentageOption ?? 0.003; // Y: buy after a >=0.3% recovery from the armed low
  const intradayLossBuffer = intradayLossBufferOption ?? 0.029; // 2.9% of the investment: $2,900 on $100,000
  const pullback = 0.09; // decline from the post-exit high that arms within the continuation window
  const continuationWindow: number = 60; // sessions after a profitable exit during which the pullback can arm

  if (!(targetPercentChange > 0 && targetPercentChange < 1)) {
    throw new Error(`The target percent change ${targetPercentChange} must be between 0 and 1`);
  }

  if (!(trailingBuyPercentage > 0) || !Number.isFinite(trailingBuyPercentage)) {
    throw new Error(`The trailing buy percentage ${trailingBuyPercentage} must be a positive number`);
  }

  if (!Number.isFinite(intradayLossBuffer) || intradayLossBuffer < 0 || intradayLossBuffer >= 1) {
    throw new Error(`The intraday loss buffer ${intradayLossBuffer} must be at least 0 and below 1`);
  }

  if (!Number.isFinite(pullback) || pullback < 0 || pullback >= 1) {
    throw new Error(`The pullback ${pullback} must be at least 0 and below 1`);
  }

  if (!Number.isInteger(continuationWindow) || continuationWindow < 1 || continuationWindow > 100000) {
    throw new Error(`The continuationWindow ${continuationWindow} must be a whole number from 1 to 100000`);
  }
  const percentName = (fraction: number) => Number((fraction * 100).toFixed(4));
  const strategyName = `trailing-buy${percentName(targetPercentChange)}-rebound${percentName(trailingBuyPercentage)}-buffered-loss${percentName(intradayLossBuffer)}-no-reentry-restriction-pullback${percentName(pullback)}-window${continuationWindow}-stop-always`;
  const dataset = resolveDataset(symbol, dataFile);
  const file = dataset.file;
  const allSessions = groupMarketSessions(await loadCsvMinuteBacktestData(symbol, file));
  const tickWindowSize = 74;
  // The evaluation window and, for a partition, the warm-up sessions before it (src/lib/evaluation.ts): `sessions`
  // is the window, `history` the warm-up followed by the window, so history[warmup + index] is sessions[index].
  const {
    sessions,
    history,
    warmup,
    report: datasetReport
  } = strategyRunSessions(allSessions, { dataset, startDate, endDate, warmupSessions: tickWindowSize });
  const positions: BacktestPosition[] = [];
  const investmentAmount = 100000; // Margin borrowed for every position, regardless of past results
  const trailingStopPercentage = 0.073; //  drop from the post-entry high
  const maximumHoldDays = 8; // days before a losing position is sold
  const marginInterestRate = 0.11; // annual interest charged by Vanguard on margin
  let postEntryHigh = 0;
  let postEntryLow = 0;
  let stopPrice = 0;
  let realizedProfit = 0;
  let entriesWithoutTrade = 0;
  // A buffered-loss sale signalled with no eligible trade left in its session.
  let pendingBufferedExit: BufferedLossSignal | undefined;
  const dailyDrawdown = createDrawdownTracker(sessions[0]?.time ?? 0);
  const minuteDrawdown = createDrawdownTracker(sessions[0]?.bars[0]?.time ?? 0);

  // The current trailing-buy setup, armed or pending; there's at most one, and only while flat.
  let setup: TrailingBuySetup | undefined;
  const setups: TrailingBuySetup[] = [];
  // Setups armed by each path.
  const activationsByKind: Record<SetupKind, number> = { deep: 0, continuation: 0 };
  // The continuation window after a profitable exit: the post-exit high and the exit session.
  let continuationActive = false;
  let continuationHigh = 0;
  let continuationStart = -1;
  let continuationWindows = 0;
  let continuationExpiries = 0;
  const episodes: Episode[] = []; // stays empty: no restriction episodes
  const stateLog: StateLogRow[] = [];
  const entryIndexes = new Map<BacktestPosition, number>();
  const exitIndexes = new Map<BacktestPosition, number>();
  const exitReasons = new Map<BacktestPosition, ExitReason>();
  const entryFills = new Map<BacktestPosition, EntryFill>();
  const exitFills = new Map<BacktestPosition, BufferedSessionExit & { stopPrice: number }>();
  const dailyRows: {
    index: number;
    date: string;
    close: number;
    borrowed: number;
    mtmProfit: number;
    recentHigh: number;
    decisionPrice: number;
    signal: boolean;
    xLevel: number;
    entryState: EntryState;
    restricted: boolean;
    setupId: number | '';
    trailingLow: number | '';
    reboundTrigger: number | '';
    setupKind: SetupKind | '';
    anchorHigh: number | '';
    episodeActive: boolean;
    episodeHigh: number | '';
    episodeLow: number | '';
    continuationActive: boolean;
    continuationHigh: number | '';
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
    'trailing stop gap': 'trailing stop, filled at the opening trade after a gap down',
    'buffered intraday loss': `net loss of at least ${formatPercent(intradayLossBuffer)} of the investment at a completed minute's close from day ${maximumHoldDays}, sold at the next trade`
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
      // No restriction, so the legacy restriction columns stay empty.
      lossExitPrice: '',
      refHigh: '',
      lowerLevel: '',
      episodeLow: '',
      resetLevel: '',
      close: session.close,
      decisionPrice,
      signal,
      entryExecuted
    });
  };

  const entryStateOf = (openPosition: BacktestPosition | undefined): EntryState => {
    if (openPosition) {
      return 'LONG';
    }

    if (!setup) {
      return 'FLAT';
    }

    return setup.status === 'pending' ? 'PENDING_FILL' : 'ARMED';
  };

  sessions.forEach((session, index) => {
    const sessionWindow: MarketSession[] = history.slice(Math.max(0, warmup + index - tickWindowSize), warmup + index);
    const recentHigh = Math.max(...sessionWindow.map((windowSession) => windowSession.high));
    const xLevel = recentHigh * (1 - targetPercentChange);

    // Skip the first session.
    if (warmup + index === 0) {
      dailyRows.push({
        index,
        date: session.date,
        close: session.close,
        borrowed: 0,
        mtmProfit: 0,
        recentHigh,
        decisionPrice: NaN,
        signal: false,
        xLevel,
        entryState: 'FLAT',
        restricted: false,
        setupId: '',
        trailingLow: '',
        reboundTrigger: '',
        setupKind: '',
        anchorHigh: '',
        episodeActive: false,
        episodeHigh: '',
        episodeLow: '',
        continuationActive: false,
        continuationHigh: ''
      });
      return;
    }

    // The 10% condition at a completed minute's close, written as allIn.ts writes its signal.
    const isDip = (price: number) => 1 - price / recentHigh >= targetPercentChange;
    // Whether any completed minute this session closed at or below the 10% level, position or not.
    const signal = session.bars.some((bar) => isDip(bar.close));
    const openPositions = positions.filter((position) => position.isOpen);
    const realizedAtStart = realizedProfit;
    // The close of this session's last entry decision minute: an activation or a rebound signal.
    let decisionPrice = NaN;
    let enteredPosition: BacktestPosition | undefined;
    let fill: Fill | undefined;

    // Entries: only on sessions that start flat, so an exit session never re-arms or re-enters.
    if (openPositions.length === 0) {
      if (setup?.status === 'pending') {
        // An order left pending by an earlier session fills at this session's opening trade.
        const opening = firstTradeAfterDecision(session, setup.signal!.time);

        fill = opening && { ...opening, execution: opening.barIndex === 0 ? 'opening trade' : opening.execution };
      } else {
        for (const [barIndex, bar] of session.bars.entries()) {
          const decisionTime = bar.time + secondsPerMinute;

          if (!setup) {
            // Warmup: nothing arms until the previous L sessions are all available.
            if (warmup + index < tickWindowSize) {
              continue;
            }

            // The deep path first, then the mechanism.
            let kind: SetupKind | undefined;
            let anchorHigh = recentHigh;

            if (isDip(bar.close)) {
              kind = 'deep';
            } else if (
              continuationActive &&
              index > continuationStart &&
              index - continuationStart <= continuationWindow &&
              bar.close <= continuationHigh * (1 - pullback)
            ) {
              kind = 'continuation';
              anchorHigh = continuationHigh;
            }

            if (!kind) {
              continue;
            }

            // Arm on the minute's close; its low may have come earlier and isn't used. No buy this minute.
            setup = {
              id: setups.length + 1,
              status: 'armed',
              statusReason: '',
              activationIndex: index,
              activationDate: session.date,
              activationBarTime: bar.time,
              activationTime: decisionTime,
              activationPrice: bar.close,
              referenceHigh: recentHigh,
              xLevel,
              kind,
              anchorHigh,
              restrictedAtActivation: false,
              lowerLevelAtActivation: '',
              trailingLow: bar.close,
              trailingLowTime: bar.time,
              reboundTrigger: bar.close * (1 + trailingBuyPercentage),
              suppressedSignals: 0
            };
            setups.push(setup);
            decisionPrice = bar.close;
            activationsByKind[kind]++;

            // Any arming ends the continuation window.
            continuationActive = false;
            console.info(
              `Trailing buy ${setup.id} (${kind}) armed at ${formatNewYorkTime(decisionTime)} on the ${formatNewYorkTime(bar.time)} minute's close of ${formatPrice(bar.close)}, ${formatPercent(Math.abs(1 - bar.close / anchorHigh))} ${bar.close <= anchorHigh ? 'below' : 'above'} the ${kind === 'deep' ? 'reference high' : 'anchor'} of ${formatPrice(anchorHigh)}; it buys on a close at or above ${formatPrice(setup.reboundTrigger)}`
            );
            continue;
          }

          // Armed: the completed minute lowers the trailing low, then its close is tested against the
          // rebound trigger from that low.
          if (bar.low < setup.trailingLow) {
            setup.trailingLow = bar.low;
            setup.trailingLowTime = bar.time;
          }

          setup.reboundTrigger = setup.trailingLow * (1 + trailingBuyPercentage);

          if (bar.close < setup.reboundTrigger) {
            continue;
          }

          // The size is decided at the decision, before the fill is known. Vanguard allows partial shares.
          const investment = sizePosition
            ? sizePosition({
                date: session.date,
                decisionTime,
                decisionPrice: bar.close,
                positions,
                referenceHigh: setup.referenceHigh,
                trailingLow: setup.trailingLow,
                reboundTrigger: setup.reboundTrigger
              })
            : investmentAmount;

          if (!(investment > 0) || !Number.isFinite(investment)) {
            throw new Error(`Position size ${investment} on ${session.date} must be a positive number of dollars`);
          }

          setup.status = 'pending';
          setup.signal = {
            index,
            date: session.date,
            barTime: bar.time,
            time: decisionTime,
            price: bar.close,
            trigger: setup.reboundTrigger,
            trailingLow: setup.trailingLow,
            investment,
            carriedOvernight: false
          };
          decisionPrice = bar.close;
          fill = firstTradeAfterDecision(session, decisionTime);
          console.info(
            `Trailing buy ${setup.id} triggered at ${formatNewYorkTime(decisionTime)}: the ${formatNewYorkTime(bar.time)} minute closed at ${formatPrice(bar.close)}, at or above ${formatPrice(setup.reboundTrigger)} (${formatPercent(trailingBuyPercentage)} above the trailing low of ${formatPrice(setup.trailingLow)} from ${formatNewYorkTime(setup.trailingLowTime)})`
          );

          if (barIndex < session.bars.length - 1 && !fill) {
            throw new Error(`No fill for a decision at ${formatNewYorkTime(decisionTime)} despite later minutes`);
          }

          break;
        }
      }

      if (fill && setup?.signal) {
        const { signal: rebound } = setup;
        const shares = rebound.investment / fill.price;
        const position: BacktestPosition = {
          isOpen: true,
          symbol,
          type: PositionType.Long,
          shares,
          investment: rebound.investment,
          // The session's date, not the fill's minute, so that interest and the maximum hold keep counting
          // calendar days.
          entryTimestamp: session.time,
          entryPrice: fill.price
        };

        positions.push(position);
        enteredPosition = position;
        entryIndexes.set(position, index);
        entryFills.set(position, {
          ...fill,
          decisionTime: rebound.time,
          decisionPrice: rebound.price,
          sessionClose: session.close,
          setupId: setup.id,
          activationTime: setup.activationTime,
          activationPrice: setup.activationPrice,
          referenceHigh: setup.referenceHigh,
          setupKind: setup.kind,
          anchorHigh: setup.anchorHigh,
          trailingLow: rebound.trailingLow,
          trailingLowTime: setup.trailingLowTime,
          reboundTrigger: rebound.trigger,
          signalIndex: rebound.index,
          waitMinutes: (fill.time - rebound.time) / secondsPerMinute,
          waitSessions: index - rebound.index
        });
        setup.status = 'filled';
        setup.statusReason = 'filled';
        setup.fill = { ...fill, index, date: session.date };
        setup.endIndex = index;
        setup.endDate = session.date;

        // After the entry session, the high and the stop for the next session, from the fill onwards only.
        const laterBars = session.bars.slice(fill.barIndex);

        postEntryHigh = Math.max(fill.price, session.close, ...laterBars.map((bar) => bar.high));
        postEntryLow = Math.min(fill.price, session.close, ...laterBars.map((bar) => bar.low));
        stopPrice = postEntryHigh * (1 - trailingStopPercentage);

        console.info(
          `Entered on trailing buy ${setup.id} at ${formatTime(fill.time)} (${formatNewYorkTime(fill.time)}) at ${formatPrice(fill.price)}, armed at ${formatNewYorkTime(setup.activationTime)} at ${formatPrice(setup.activationPrice)} from the reference high of ${formatPrice(setup.referenceHigh)}`
        );
        console.info(
          `Entry decision at ${formatNewYorkTime(rebound.time)} on the ${formatNewYorkTime(rebound.barTime)} minute's close of ${formatPrice(rebound.price)}; filled at ${executionDescriptions[fill.execution]}; the session closed at ${formatPrice(session.close)}`
        );

        setup = undefined;
      } else if (setup?.status === 'pending' && setup.signal && !setup.signal.carriedOvernight) {
        // No eligible trade after the signal in its session, including a decision known only at the close.
        setup.signal.carriedOvernight = true;
        console.info(
          `Trailing buy ${setup.id}: no eligible trade after the decision at ${formatNewYorkTime(setup.signal.time)} on ${session.date}, so the order waits for the next session's opening trade\n`
        );
      }
    }

    const [position] = openPositions;
    let exit: BufferedSessionExit | undefined;

    // Only apply the exits when exactly one position is open. The `position` check also
    // narrows its type, since destructuring an array yields `BacktestPosition | undefined`.
    if (position && openPositions.length === 1) {
      const interest = calculateInterest(position, session.time);

      // Stop policy B-D: always eligible; the level is the trailing stop itself.
      const isStopActive = true;
      const effectiveStop = stopPrice;

      const outcome = evaluateBufferedSessionExit({
        position,
        session,
        stopPrice: effectiveStop,
        isStopActive,
        interest,
        maximumHoldDays,
        stopFill,
        intradayLossBuffer,
        pendingSignal: pendingBufferedExit
      });

      if (pendingBufferedExit && outcome.exit?.reason !== 'buffered intraday loss') {
        console.info(
          `The buffered sale pending since ${formatNewYorkTime(pendingBufferedExit.decisionTime)} gave way to the ${outcome.exit?.reason ?? 'missing'} exit at the opening trade`
        );
      }

      if (outcome.pendingSignal) {
        console.info(
          `Buffered loss signal at ${formatNewYorkTime(outcome.pendingSignal.decisionTime)} (net ${formatDollars(outcome.pendingSignal.decisionProfit)} at ${formatPrice(outcome.pendingSignal.decisionPrice)}) with no eligible trade left on ${session.date}, so it sells at the next session's opening trade\n`
        );
      }

      exit = outcome.exit;
      pendingBufferedExit = outcome.pendingSignal;

      if (exit) {
        position.isOpen = false;
        position.exitTimestamp = session.time;
        position.exitPrice = exit.price;
        position.interest = interest;
        position.profit = position.shares * exit.price - position.investment - interest;
        realizedProfit += position.profit;

        // A profitable exit opens the continuation window from the exit price.
        if (position.profit > 0) {
          continuationActive = true;
          continuationHigh = exit.price;
          continuationStart = index;
          continuationWindows++;
        }
        exitIndexes.set(position, index);
        exitReasons.set(position, exit.reason);
        exitFills.set(position, { ...exit, stopPrice });

        const monthsHeld = (session.time - position.entryTimestamp) / ((365 / 12) * secondsPerDay);
        const alsoDue =
          exit.reason === 'trailing stop gap' && exit.isMaximumHoldDue
            ? ' (the maximum hold was also due at the open)'
            : '';

        console.info(
          `Exited at ${formatTime(exit.time)} (${formatNewYorkTime(exit.time)}) from ${formatPrice(position.entryPrice)} to ${formatPrice(exit.price)} for a profit of ${formatDollars(position.profit)} after ${formatDollars(interest)} in interest`
        );
        console.info(`Exit reason: ${exitReasonDescriptions[exit.reason]}${alsoDue}`);
        console.info(`Exit price: ${executionDescriptions[exit.execution]}, stop at ${formatPrice(stopPrice)}`);

        if (exit.bufferedLossSignal) {
          console.info(
            `Buffered loss decision at ${formatNewYorkTime(exit.bufferedLossSignal.decisionTime)}: net ${formatDollars(exit.bufferedLossSignal.decisionProfit)} at ${formatPrice(exit.bufferedLossSignal.decisionPrice)}, at or below ${formatDollars(exit.bufferedLossSignal.threshold)}`
          );
        }
        // The lowest price seen while the position was open, including the exit itself and the exit
        // session's minutes before the exit's minute. That minute's own low may have come after the
        // fill, so it's left out.
        const lowestLow = Math.min(
          postEntryLow,
          exit.price,
          ...session.bars.slice(0, exit.barIndex).map((bar) => bar.low)
        );
        const dropToLowestLow = 1 - lowestLow / position.entryPrice;

        console.info(`Held for ${formatMonths(monthsHeld)} months`);
        console.info(`Lowest low: ${formatPrice(lowestLow)} (${formatPercent(dropToLowestLow)} below entry)\n`);

        // Without a re-entry restriction, a loss of any size is only logged: the next session can arm
        // normally. The price return (interest excluded) is reported but gates nothing.
        const priceReturn = exit.price / position.entryPrice - 1;

        logState(
          index,
          session,
          decisionPrice,
          'NORMAL',
          'NORMAL',
          position.profit < 0 ? 'losing_exit' : 'profitable_exit',
          signal,
          false,
          exit.reason,
          position.profit,
          priceReturn
        );
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
    const heldFrom = position ? 0 : enteredPosition ? fill!.barIndex : Infinity;
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

    // Daily mark-to-market profit: realized profit plus any open position at the close, net of interest.
    const openPosition = positions.find((position) => position.isOpen);
    const markedProfit = realizedProfit + (openPosition ? calculateUnrealizedProfit(openPosition, session) : 0);

    dailyDrawdown.update(markedProfit, session.time);

    // End of the session: the continuation window's high and expiry.
    if (continuationActive) {
      if (index > continuationStart) {
        continuationHigh = Math.max(continuationHigh, session.high);
      }

      if (index - continuationStart >= continuationWindow) {
        continuationActive = false;
        continuationExpiries++;
      }
    }

    if (openPosition && entryIndexes.get(openPosition) === index) {
      logState(index, session, decisionPrice, 'NORMAL', 'NORMAL', 'normal_entry', signal, true);
    }

    dailyRows.push({
      index,
      date: session.date,
      close: session.close,
      borrowed: openPosition ? openPosition.investment : 0,
      mtmProfit: markedProfit,
      recentHigh,
      decisionPrice,
      signal,
      xLevel,
      entryState: entryStateOf(openPosition),
      restricted: false,
      setupId: setup?.id ?? '',
      trailingLow: setup?.trailingLow ?? '',
      reboundTrigger: setup?.reboundTrigger ?? '',
      setupKind: setup?.kind ?? '',
      anchorHigh: setup?.anchorHigh ?? '',
      episodeActive: false,
      episodeHigh: '',
      episodeLow: '',
      continuationActive: continuationActive,
      continuationHigh: continuationActive ? continuationHigh : ''
    });
  });

  const closedPositions = positions.filter((position) => !position.isOpen);
  const openPosition = positions.find((position) => position.isOpen);
  const lastSession = sessions.at(-1);
  const closedInterest = closedPositions.reduce((total, position) => total + (position.interest ?? 0), 0);
  const accruedInterest = openPosition && lastSession ? calculateInterest(openPosition, lastSession.time) : 0;
  const unrealizedProfit = openPosition && lastSession ? calculateUnrealizedProfit(openPosition, lastSession) : 0;

  // A setup still armed or pending at the end of the data is left unfilled, with no invented fill.
  if (setup) {
    setup.statusReason = setup.status === 'pending' ? 'pending_at_end' : 'armed_at_end';

    if (setup.status === 'pending') {
      entriesWithoutTrade++;
    }

    console.info(
      `Trailing buy ${setup.id} still ${setup.status === 'pending' ? `pending since the decision at ${formatNewYorkTime(setup.signal!.time)}` : 'armed'} at the end of the data: armed at ${formatNewYorkTime(setup.activationTime)} at ${formatPrice(setup.activationPrice)}, trailing low ${formatPrice(setup.trailingLow)}, rebound trigger ${formatPrice(setup.reboundTrigger)}\n`
    );
  }

  // A buffered sale still waiting for a trade at the end of the data leaves the position open, unfilled.
  if (pendingBufferedExit && openPosition) {
    console.info(
      `Buffered loss sale pending since ${formatNewYorkTime(pendingBufferedExit.decisionTime)} at the end of the data, unfilled\n`
    );
  }

  if (openPosition && lastSession) {
    console.info(
      `Still open on ${lastSession.date}: entered at ${formatPrice(openPosition.entryPrice)} and marked at the close of ${formatPrice(lastSession.close)} for an unrealized profit of ${formatDollars(unrealizedProfit)} after ${formatDollars(accruedInterest)} in accrued interest\n`
    );
  }

  const bufferedLossExits = [...exitFills.values()].filter((row) => row.reason === 'buffered intraday loss').length;
  const setupCounts = {
    setupActivations: setups.length,
    setupFills: setups.filter((row) => row.status === 'filled').length,
    setupCancellations: setups.filter((row) => row.status === 'cancelled').length,
    armedAtEnd: setup?.status === 'armed' ? 1 : 0,
    pendingAtEnd: setup?.status === 'pending' ? 1 : 0,
    reboundSignals: setups.filter((row) => row.signal).length,
    overnightOrders: setups.filter((row) => row.signal?.carriedOvernight).length,
    suppressedReboundSignals: setups.reduce((total, row) => total + row.suppressedSignals, 0)
  };

  const firstSession = sessions[0];

  if (firstSession && lastSession) {
    console.info(`Symbol: ${symbol}, from ${firstSession.date} to ${lastSession.date}`);
  }

  console.info(`Strategy: ${strategyName}, data file: ${file}`);
  console.info(
    `Execution: one-minute bars; trailing buys armed and triggered on completed minutes' closes and filled at the next eligible trade; intraday stops filled at ${stopFill === 'stop' ? 'the stop price' : 'the next minute’s opening trade'}`
  );
  console.info(`Closed trades: ${closedPositions.length}${openPosition ? ', plus 1 still open' : ''}`);
  console.info(`Realized profit: ${formatDollars(realizedProfit)}`);
  console.info(`Unrealized profit on the open position: ${formatDollars(unrealizedProfit)}`);
  console.info(`Total net profit: ${formatDollars(realizedProfit + unrealizedProfit)}`);
  console.info(
    `Margin interest: ${formatDollars(closedInterest + accruedInterest)} (${formatDollars(closedInterest)} on closed trades, ${formatDollars(accruedInterest)} accrued on the open position)`
  );
  console.info(
    `Maximum drawdown (daily): ${formatDollars(dailyDrawdown.maximumDrawdown)} (${formatPercent(dailyDrawdown.maximumDrawdown / investmentAmount)} of ${formatDollars(investmentAmount)} allocation), from ${formatDate(dailyDrawdown.drawdownPeakTimestamp)} to ${formatDate(dailyDrawdown.drawdownTroughTimestamp)}`
  );
  console.info(
    `Maximum drawdown (minute): ${formatDollars(minuteDrawdown.maximumDrawdown)} (${formatPercent(minuteDrawdown.maximumDrawdown / investmentAmount)} of ${formatDollars(investmentAmount)} allocation), from ${formatNewYorkTime(minuteDrawdown.drawdownPeakTimestamp)} to ${formatNewYorkTime(minuteDrawdown.drawdownTroughTimestamp)}`
  );
  console.info(
    `Drawdowns: the largest falls of the daily and minute-sampled mark-to-market P&L; the percentages are of the fixed ${formatDollars(investmentAmount)} trading allocation, a capital-allocation reference, not a peak-to-trough drawdown of invested equity or of the overall portfolio`
  );
  console.info(`Target percent change: ${formatPercent(targetPercentChange)}`);
  console.info(`Trailing buy percentage: ${formatPercent(trailingBuyPercentage)}`);
  console.info(`Trailing stop percentage: ${formatPercent(trailingStopPercentage)}`);
  console.info('Stop activation: always active from the session after the entry; no net-profit test');
  console.info(`Maximum hold: ${maximumHoldDays} days`);
  console.info(
    `Intraday loss buffer: ${formatPercent(intradayLossBuffer)} of the investment, from day ${maximumHoldDays}; ${bufferedLossExits} buffered-loss exits${pendingBufferedExit ? ', 1 pending at the end' : ''}`
  );
  console.info(
    'Reentry restriction: none (no material-loss restriction, lower re-entry level or recovery reset; no re-entry on an exit session)'
  );
  console.info(
    `Post-exit continuation: ${formatPercent(pullback)} pullback from the post-exit high within ${continuationWindow} sessions of a profitable exit; ${continuationWindows} windows, ${continuationExpiries} expired, ${activationsByKind.continuation} continuation armings`
  );
  console.info(
    `Trailing buys: ${setupCounts.setupActivations} armed, ${setupCounts.setupFills} filled, ${setupCounts.armedAtEnd} still armed and ${setupCounts.pendingAtEnd} pending at the end; ${setupCounts.overnightOrders} orders waited for a later session`
  );

  if (entriesWithoutTrade > 0) {
    console.info(`Buy signals that never filled: ${entriesWithoutTrade}`);
  }

  if (outputDir && lastSession) {
    await fs.ensureDir(outputDir);

    const tradeLines = [
      'entry_index,exit_index,entry_date,exit_date,entry_price,exit_price,reason,investment,shares,interest,profit,entry_time,entry_execution,decision_time,decision_price,entry_session_close,exit_time,exit_execution,exit_stop_price,maximum_hold_due,setup_id,activation_time,activation_price,setup_ref_high,trailing_low,trailing_low_time,rebound_trigger,signal_index,wait_minutes,wait_sessions,buffer_signal_time,buffer_signal_price,buffer_signal_net_profit,buffer_threshold,buffer_exit_pending,setup_kind,anchor_high'
    ];

    for (const position of positions) {
      const isOpen = position.isOpen;
      const interest = isOpen ? accruedInterest : (position.interest ?? 0);
      const profit = isOpen ? unrealizedProfit : (position.profit ?? 0);
      const exitPrice = isOpen ? lastSession.close : (position.exitPrice ?? 0);
      const entryFill = entryFills.get(position);
      const exitFill = exitFills.get(position);
      const bufferSignal = exitFill?.bufferedLossSignal ?? (isOpen ? pendingBufferedExit : undefined);

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
          exitFill?.isMaximumHoldDue ?? '',
          entryFill?.setupId ?? '',
          entryFill ? formatTime(entryFill.activationTime) : '',
          entryFill?.activationPrice ?? '',
          entryFill?.referenceHigh ?? '',
          entryFill?.trailingLow ?? '',
          entryFill ? formatTime(entryFill.trailingLowTime) : '',
          entryFill?.reboundTrigger ?? '',
          entryFill?.signalIndex ?? '',
          entryFill?.waitMinutes ?? '',
          entryFill?.waitSessions ?? '',
          bufferSignal ? formatTime(bufferSignal.decisionTime) : '',
          bufferSignal?.decisionPrice ?? '',
          bufferSignal?.decisionProfit ?? '',
          bufferSignal?.threshold ?? '',
          isOpen && Boolean(pendingBufferedExit),
          entryFill?.setupKind ?? '',
          entryFill?.anchorHigh ?? ''
        ].join(',')
      );
    }

    const dailyLines = [
      'index,date,close,borrowed,mtm_pnl,recent_high,decision_price,signal,x_level,entry_state,restricted,setup_id,trailing_low,rebound_trigger,setup_kind,anchor_high,episode_active,episode_high,episode_low,continuation_active,continuation_high'
    ];

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
          row.signal,
          row.xLevel,
          row.entryState,
          row.restricted,
          row.setupId,
          row.trailingLow,
          row.reboundTrigger,
          row.setupKind,
          row.anchorHigh,
          row.episodeActive,
          row.episodeHigh,
          row.episodeLow,
          row.continuationActive,
          row.continuationHigh
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

    // Times are ISO UTC like the other files; the `_ny` columns repeat them in New York time. A minute
    // column is the start of the decision minute and a time column the decision itself, at its end.
    const setupLines = [
      'setup_id,status,status_reason,activation_index,activation_date,activation_minute_ny,activation_time,activation_price,ref_high,x_level,restricted_at_activation,lower_level_at_activation,trailing_low,trailing_low_time,trailing_buy_percentage,rebound_trigger,suppressed_signals,signal_index,signal_date,signal_minute_ny,signal_time,signal_price,signal_trigger,signal_trailing_low,carried_overnight,fill_index,fill_date,fill_time,fill_time_ny,fill_price,fill_execution,wait_minutes,wait_sessions,end_index,end_date,kind,anchor_high'
    ];

    for (const row of setups) {
      const rebound = row.signal;
      const rowFill = row.fill;

      setupLines.push(
        [
          row.id,
          row.status,
          row.statusReason,
          row.activationIndex,
          row.activationDate,
          formatNewYorkTime(row.activationBarTime),
          formatTime(row.activationTime),
          row.activationPrice,
          row.referenceHigh,
          row.xLevel,
          row.restrictedAtActivation,
          row.lowerLevelAtActivation,
          row.trailingLow,
          formatTime(row.trailingLowTime),
          trailingBuyPercentage,
          row.reboundTrigger,
          row.suppressedSignals,
          rebound?.index ?? '',
          rebound?.date ?? '',
          rebound ? formatNewYorkTime(rebound.barTime) : '',
          rebound ? formatTime(rebound.time) : '',
          rebound?.price ?? '',
          rebound?.trigger ?? '',
          rebound?.trailingLow ?? '',
          rebound?.carriedOvernight ?? '',
          rowFill?.index ?? '',
          rowFill?.date ?? '',
          rowFill ? formatTime(rowFill.time) : '',
          rowFill ? formatNewYorkTime(rowFill.time) : '',
          rowFill?.price ?? '',
          rowFill?.execution ?? '',
          rowFill && rebound ? (rowFill.time - rebound.time) / secondsPerMinute : '',
          rowFill && rebound ? rowFill.index - rebound.index : '',
          row.endIndex ?? '',
          row.endDate ?? '',
          row.kind,
          row.anchorHigh
        ].join(',')
      );
    }

    const summary = {
      symbol,
      dataFile: file,
      dataset: datasetReport,
      strategy: strategyName,
      stopFill,
      targetPercentChange,
      trailingBuyPercentage,
      intradayLossBuffer,
      // No re-entry restriction: its settings are null and its counts zero.
      reentryRestriction: false,
      materialLossThreshold: null,
      lowerPriceReentry: null,
      retraceFraction: null,
      firstDate: firstSession?.date ?? '',
      lastDate: lastSession.date,
      sessions: sessions.length,
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
      restrictions: 0,
      lowerPriceReentries: 0,
      recoveryResets: 0,
      lossesNotRestricted: 0,
      losingExits: stateLog.filter((row) => row.reason === 'losing_exit').length,
      ...setupCounts,
      setupAtEnd: setup ? { id: setup.id, status: setup.status, statusReason: setup.statusReason } : null,
      bufferedLossExits,
      mechanisms: ['postExit'],
      activationsByKind,
      pullback,
      continuationWindow,
      continuationWindows,
      continuationExpiries,
      pendingBufferedExitAtEnd: pendingBufferedExit
        ? { ...pendingBufferedExit, decisionTime: formatTime(pendingBufferedExit.decisionTime) }
        : null
    };

    await fs.writeFile(`${outputDir}/trades.csv`, `${tradeLines.join('\n')}\n`);
    await fs.writeFile(`${outputDir}/daily.csv`, `${dailyLines.join('\n')}\n`);
    await fs.writeFile(`${outputDir}/states.csv`, `${stateLines.join('\n')}\n`);
    await fs.writeFile(`${outputDir}/episodes.csv`, `${episodeLines.join('\n')}\n`);
    await fs.writeFile(`${outputDir}/setups.csv`, `${setupLines.join('\n')}\n`);
    await fs.writeFile(`${outputDir}/summary.json`, `${JSON.stringify(summary, null, 1)}\n`);
    console.info(`Wrote trades.csv, daily.csv, states.csv, episodes.csv, setups.csv and summary.json to ${outputDir}`);
  }

  return { sessions, positions, entryFills, exitFills, stateLog, episodes, setups };
};

export const runAllInTrailingBuyPostExitContinuation = runAllIn;

// Run with `npm run app allIn-trailingBuy-postExitContinuation [symbol] [start date] [end date] [data file]
// [output dir] [stop fill] [trailing buy percentage] [intraday loss buffer]`, for example `npm run app
// allIn-trailingBuy-postExitContinuation VGT 2016-10-07 2025-10-13 - - stop 0.003 0.029`. The arguments are
// those of allIn-trailingBuy-bufferedLoss.ts. Pass '-' to leave an
// earlier argument at its default. When an output directory is given, the run also writes trades.csv,
// daily.csv, states.csv, episodes.csv, setups.csv and summary.json there at full precision.
export default async (
  symbol = 'VGT',
  startDate?: string,
  endDate?: string,
  dataFile?: string,
  outDir?: string,
  stopFillArgument?: string,
  trailingBuyPercentageArgument?: string,
  intradayLossBufferArgument?: string
) => {
  const trailingBuy =
    trailingBuyPercentageArgument === undefined || trailingBuyPercentageArgument === '-'
      ? undefined
      : Number(trailingBuyPercentageArgument);
  const buffer =
    intradayLossBufferArgument === undefined || intradayLossBufferArgument === '-'
      ? undefined
      : Number(intradayLossBufferArgument);

  await runAllIn({
    symbol,
    startDate,
    endDate,
    dataFile: selectDataset(symbol, dataFile),
    outDir,
    stopFill: stopFillArgument,
    trailingBuyPercentage: trailingBuy,
    intradayLossBuffer: buffer
  });
};
