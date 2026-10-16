// The daily allIn strategy of src/app/allin-original.ts with one change: the entry decision is delegated to
// an EntryPolicy. Everything after the entry (exits, stop, maximum hold, interest, the material-loss
// restriction and its recovery reset, the one-position limit) is the original's code path. With the
// baseline policy, same-close execution, zero costs and the original's settings, the outputs are
// byte-identical to the original's (see goldenMaster.ts).
//
// Execution conventions:
// - 'close' (the research convention): the decision uses session t's close and fills at that close.
// - 'nextOpen' (executable sensitivity): the decision uses session t's close and a market order fills at
//   session t+1's open. No exit is evaluated on the fill session (the stop is never active at entry and
//   the maximum hold needs 15 days); that session's high and low after the fill feed the post-entry high
//   and low. No new decision is taken on the fill session.
// Costs (costBps per side) only reduce P&L: the entry costs c × $100,000 in cash and an exit receives
// shares × price × (1 − c); the open position is marked without an exit cost. Shares are bought at the
// market price and every decision (signals, stop activation, the restriction's price return and levels)
// uses market prices, so cost sensitivities never change which trades happen.

import { type StrategySettings, baselineSettings } from './constants.ts';
import type { DailyBars } from './data.ts';

const secondsPerDay = 24 * 60 * 60;

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap';
export type Execution = 'close' | 'nextOpen';

export interface ReferenceHighs {
  value: Float64Array; // highest high of the `lookback` sessions before each session (-Infinity at 0)
  peakIndex: Int32Array; // the most recent session holding that high (-1 at 0)
}

export const computeReferenceHighs = (high: ArrayLike<number>, lookback: number): ReferenceHighs => {
  const value = new Float64Array(high.length);
  const peakIndex = new Int32Array(high.length);
  const deque = new Int32Array(high.length);
  let head = 0;
  let tail = 0;

  for (let index = 0; index < high.length; index++) {
    while (head < tail && deque[head]! < index - lookback) {
      head++;
    }

    value[index] = head < tail ? high[deque[head]!]! : -Infinity;
    peakIndex[index] = head < tail ? deque[head]! : -1;

    while (head < tail && high[deque[tail - 1]!]! <= high[index]!) {
      tail--;
    }

    deque[tail++] = index;
  }

  return { value, peakIndex };
};

export interface PolicyContext {
  index: number;
  close: number;
  signal: boolean; // the original's 10% signal: 1 − close / refHigh ≥ dip
  drawdown: number; // 1 − close / refHigh
  refHigh: number;
  peakIndex: number;
  restricted: boolean;
  // Whether the material-loss restriction lets a purchase through at this close (always true unrestricted).
  restrictionAllows: boolean;
}

export interface Decision {
  enter: boolean;
  // Why: entered, waiting, rejected, reset, ... Logged for every session the policy reports on.
  reason: string;
  // Whether the session belongs in the decision log (the baseline logs signal sessions only).
  log?: boolean;
}

export interface EntryPolicy {
  id: string;
  decide(context: PolicyContext): Decision;
}

export interface Trade {
  signalIndex: number;
  entryIndex: number;
  exitIndex: number; // -1 while open
  entryTime: number;
  exitTime: number;
  entryPrice: number; // market price of the fill
  entryFill: number; // after costs
  exitPrice: number; // market price; the last close while open
  exitFill: number;
  reason: ExitReason | 'open';
  entryReason: string;
  investment: number;
  shares: number;
  interest: number;
  profit: number;
  referenceHigh: number; // the signal session's reference high
  peakIndex: number;
  lowestLow: number; // lowest low while held, including the exit price (the original's convention)
  worstMark: number; // lowest close-based P&L while held, net of accrued interest
  priceReturn: number; // exit price / entry price − 1 (market prices)
  restrictedAfter: boolean;
}

export interface DecisionRow {
  index: number;
  date: string;
  close: number;
  drawdown: number;
  refHigh: number;
  peakIndex: number;
  signal: boolean;
  restricted: boolean;
  restrictionAllows: boolean;
  enter: boolean;
  executed: boolean;
  reason: string;
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

export interface RestrictionEpisode {
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

export interface SimulationResult {
  policyId: string;
  execution: Execution;
  settings: StrategySettings;
  startIndex: number;
  endIndex: number;
  trades: Trade[]; // in entry order; an open trade is marked at the last close
  decisions: DecisionRow[];
  // Per session (indexed like the bars; zero before startIndex):
  mtm: Float64Array; // realized + open P&L at the close, net of accrued interest and costs paid
  interestCharged: Float64Array; // cumulative interest charged or accrued through the close
  inPosition: Uint8Array; // a position is open at the close
  realizedProfit: number;
  unrealizedProfit: number;
  netProfit: number;
  closedInterest: number;
  accruedInterest: number;
  maximumDrawdown: number;
  drawdownPeakIndex: number;
  drawdownTroughIndex: number;
  restrictions: number;
  lowerPriceReentries: number;
  recoveryResets: number;
  lossesNotRestricted: number;
  pendingAtEnd: boolean;
  stateLog: StateLogRow[];
  episodes: RestrictionEpisode[];
}

export interface SimulateOptions {
  bars: DailyBars;
  policy: EntryPolicy;
  settings?: StrategySettings;
  execution?: Execution;
  startIndex?: number; // earlier bars are history for the reference high and indicators only
  endIndex?: number;
  refs?: ReferenceHighs;
}

const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

export const simulate = (options: SimulateOptions): SimulationResult => {
  const { bars, policy } = options;
  const settings = options.settings ?? baselineSettings;
  const execution = options.execution ?? 'close';
  const { time, open, high, low, close } = bars;
  const startIndex = options.startIndex ?? 0;
  const endIndex = options.endIndex ?? time.length - 1;
  const refs = options.refs ?? computeReferenceHighs(high, settings.lookback);
  const cost = settings.costBps / 10000;
  const buyFill = (price: number) => (cost === 0 ? price : price * (1 + cost));
  const sellFill = (price: number) => (cost === 0 ? price : price * (1 - cost));
  // Costs are cash: the shares come from the market price, so every decision is cost-free.
  const entryCost = cost === 0 ? 0 : settings.investment * cost;
  const exitValue = (trade: Trade, price: number) =>
    cost === 0 ? trade.shares * price : trade.shares * price * (1 - cost);
  const { investment, marginRate, dip, trailingStop, maximumHoldDays, materialLoss, lowerReentry, retrace } = settings;

  const length = time.length;
  const mtm = new Float64Array(length);
  const interestCharged = new Float64Array(length);
  const inPosition = new Uint8Array(length);
  const trades: Trade[] = [];
  const decisions: DecisionRow[] = [];
  const stateLog: StateLogRow[] = [];
  const episodes: RestrictionEpisode[] = [];

  let position: Trade | undefined;
  let pending: { signalIndex: number; refHigh: number; peakIndex: number; reason: string } | undefined;
  let postEntryHigh = 0;
  let postEntryLow = 0;
  let stopPrice = 0;
  let realizedProfit = 0;
  let closedInterest = 0;
  let peakProfit = 0;
  let peakIndex = startIndex;
  let maximumDrawdown = 0;
  let drawdownPeakIndex = startIndex;
  let drawdownTroughIndex = startIndex;
  let restrictions = 0;
  let lowerPriceReentries = 0;
  let recoveryResets = 0;
  let lossesNotRestricted = 0;
  let restriction: Restriction | undefined;
  let episode: RestrictionEpisode | undefined;

  const calculateInterest = (current: Trade, timestamp: number) => {
    const yearsHeld = (timestamp - current.entryTime) / (365 * secondsPerDay);

    return current.investment * marginRate * yearsHeld;
  };

  const resetLevelOf = (current: Restriction) =>
    current.episodeLow + retrace * (current.referenceHigh - current.episodeLow);

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

  const openPosition = (
    index: number,
    price: number,
    signalIndex: number,
    referenceHigh: number,
    peak: number,
    reason: string
  ) => {
    const fill = buyFill(price);
    const trade: Trade = {
      signalIndex,
      entryIndex: index,
      exitIndex: -1,
      entryTime: time[index]!,
      exitTime: time[index]!,
      entryPrice: price,
      entryFill: fill,
      exitPrice: price,
      exitFill: price,
      reason: 'open',
      entryReason: reason,
      investment,
      // Vanguard allows partial shares.
      shares: investment / price,
      interest: 0,
      profit: 0,
      referenceHigh,
      peakIndex: peak,
      lowestLow: price,
      worstMark: Infinity,
      priceReturn: 0,
      restrictedAfter: false
    };

    trades.push(trade);
    postEntryHigh = price;
    postEntryLow = price;
    stopPrice = postEntryHigh * (1 - trailingStop);

    return trade;
  };

  for (let index = startIndex; index <= endIndex; index++) {
    const tickTime = time[index]!;
    const tickOpen = open[index]!;
    const tickLow = low[index]!;
    const tickClose = close[index]!;
    const recentHigh = refs.value[index]!;
    const percentChange = 1 - tickClose / recentHigh;

    if (index === 0) {
      mtm[index] = 0;
      continue;
    }

    const heldPosition = position;
    const signal = percentChange >= dip;
    let enteredToday = false;
    let filledAtOpen = false;
    let entryBlocked = false;

    // A next-open order placed at the previous close fills at this session's open.
    if (pending && !heldPosition) {
      position = openPosition(index, tickOpen, pending.signalIndex, pending.refHigh, pending.peakIndex, pending.reason);
      decisions.push({
        index,
        date: formatDate(tickTime),
        close: tickClose,
        drawdown: percentChange,
        refHigh: recentHigh,
        peakIndex: refs.peakIndex[index]!,
        signal,
        restricted: Boolean(restriction),
        restrictionAllows: true,
        enter: true,
        executed: true,
        reason: `filled_next_open:${pending.reason}`
      });
      pending = undefined;
      enteredToday = true;
      filledAtOpen = true;
    } else if (!heldPosition) {
      // Flat before the session and no exit today: the entry decision at the close. While restricted,
      // today's close first extends the episode low, so the reset level includes it.
      if (restriction) {
        restriction.episodeLow = Math.min(restriction.episodeLow, tickClose);
      }

      const restrictionAllows =
        !restriction || (tickClose < resetLevelOf(restriction) && tickClose <= restriction.lowerLevel);
      const context: PolicyContext = {
        index,
        close: tickClose,
        signal,
        drawdown: percentChange,
        refHigh: recentHigh,
        peakIndex: refs.peakIndex[index]!,
        restricted: Boolean(restriction),
        restrictionAllows
      };
      const decision = policy.decide(context);
      const buy = decision.enter && restrictionAllows;

      // The original's log label: a signal it would have bought but the restriction blocked.
      entryBlocked = signal && Boolean(restriction) && !restrictionAllows;

      if (decision.log ?? (signal || decision.enter)) {
        decisions.push({
          index,
          date: formatDate(tickTime),
          close: tickClose,
          drawdown: percentChange,
          refHigh: recentHigh,
          peakIndex: context.peakIndex,
          signal,
          restricted: context.restricted,
          restrictionAllows,
          enter: decision.enter,
          executed: buy && execution === 'close',
          reason: decision.enter && !restrictionAllows ? `${decision.reason}|blocked_by_restriction` : decision.reason
        });
      }

      if (buy) {
        if (execution === 'close') {
          position = openPosition(index, tickClose, index, recentHigh, context.peakIndex, decision.reason);
          enteredToday = true;
        } else if (index < endIndex) {
          pending = { signalIndex: index, refHigh: recentHigh, peakIndex: context.peakIndex, reason: decision.reason };
        }
      }
    }

    if (heldPosition) {
      const interest = calculateInterest(heldPosition, tickTime);
      const profitAt = (price: number) => heldPosition.shares * price - heldPosition.investment - interest;
      let exit: { reason: ExitReason; price: number } | undefined;

      // Before the open: the stop is active only if a fill at the stop price is profitable after interest.
      const isStopActive = profitAt(stopPrice) > 0;
      const isStopTriggeredAtOpen = isStopActive && tickOpen <= stopPrice;
      const daysHeld = (tickTime - heldPosition.entryTime) / secondsPerDay;

      if (daysHeld >= maximumHoldDays && profitAt(tickOpen) < 0) {
        exit = { reason: 'maximum hold', price: tickOpen };
      } else if (isStopTriggeredAtOpen) {
        exit = { reason: 'trailing stop gap', price: tickOpen };
      } else if (isStopActive && tickLow <= stopPrice) {
        exit = { reason: 'trailing stop', price: stopPrice };
      }

      if (exit) {
        const exitFill = sellFill(exit.price);

        heldPosition.exitIndex = index;
        heldPosition.exitTime = tickTime;
        heldPosition.exitPrice = exit.price;
        heldPosition.exitFill = exitFill;
        heldPosition.reason = exit.reason;
        heldPosition.interest = interest;
        heldPosition.profit = exitValue(heldPosition, exit.price) - heldPosition.investment - entryCost - interest;
        heldPosition.lowestLow = Math.min(postEntryLow, exit.price);
        realizedProfit += heldPosition.profit;
        closedInterest += interest;
        position = undefined;

        const priceReturn = exit.price / heldPosition.entryPrice - 1;

        heldPosition.priceReturn = priceReturn;

        if (priceReturn <= -materialLoss) {
          restriction = {
            lossExitPrice: exit.price,
            referenceHigh: heldPosition.referenceHigh,
            lowerLevel: exit.price * (1 - lowerReentry),
            episodeLow: tickClose
          };
          heldPosition.restrictedAfter = true;
          restrictions++;
          episode = {
            exitIndex: index,
            exitDate: formatDate(tickTime),
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
          episodes.push(episode);
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
        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStop));
        postEntryLow = Math.min(postEntryLow, tickLow);
      }
    } else if (filledAtOpen && position) {
      // The rest of the fill session is post-entry.
      postEntryHigh = Math.max(postEntryHigh, high[index]!);
      stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStop));
      postEntryLow = Math.min(postEntryLow, tickLow);
    }

    // Daily mark-to-market profit: realized profit plus any open position at the close, net of interest.
    let accrued = 0;

    if (position) {
      accrued = calculateInterest(position, tickTime);
      position.worstMark = Math.min(
        position.worstMark,
        position.shares * tickClose - position.investment - entryCost - accrued
      );
      inPosition[index] = 1;
    }

    const markedProfit =
      realizedProfit + (position ? position.shares * tickClose - position.investment - entryCost - accrued : 0);

    mtm[index] = markedProfit;
    interestCharged[index] = closedInterest + accrued;

    if (markedProfit > peakProfit) {
      peakProfit = markedProfit;
      peakIndex = index;
    }

    if (peakProfit - markedProfit > maximumDrawdown) {
      maximumDrawdown = peakProfit - markedProfit;
      drawdownPeakIndex = peakIndex;
      drawdownTroughIndex = index;
    }

    // End of the session: resolve the restriction, exactly as the original.
    if (restriction && episode) {
      restriction.episodeLow = Math.min(restriction.episodeLow, tickClose);
      episode.episodeLow = restriction.episodeLow;

      if (position && enteredToday) {
        logState(index, 'RESTRICTED', 'NORMAL', 'lower_price_reentry', signal, true);
        lowerPriceReentries++;
        episode.resolution = 'lower_price_reentry';
        episode.resolutionDate = formatDate(tickTime);
        restriction = undefined;
        episode = undefined;
      } else if (!position && !pending && tickClose >= resetLevelOf(restriction)) {
        logState(index, 'RESTRICTED', 'NORMAL', 'recovery_reset', signal, false);
        recoveryResets++;
        episode.resolution = 'recovery_reset';
        episode.resolutionDate = formatDate(tickTime);
        restriction = undefined;
        episode = undefined;
      } else {
        logState(index, 'RESTRICTED', 'RESTRICTED', entryBlocked ? 'entry_blocked' : 'restricted', signal, false);

        if (index === endIndex) {
          episode.resolution = 'unresolved_at_end';
          episode.resolutionDate = formatDate(tickTime);
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
    unrealizedProfit =
      position.shares * close[endIndex]! - position.investment - entryCost - calculateInterest(position, lastTime);
    position.exitTime = lastTime;
    position.exitPrice = close[endIndex]!;
    position.exitFill = close[endIndex]!;
    position.interest = accruedInterest;
    position.profit = unrealizedProfit;
    position.lowestLow = postEntryLow;
    position.priceReturn = close[endIndex]! / position.entryPrice - 1;
  }

  // The original sums closed interest in entry order at the end; recompute it that way for identical bits.
  closedInterest = trades.reduce((total, trade) => total + (trade.reason === 'open' ? 0 : trade.interest), 0);

  return {
    policyId: policy.id,
    execution,
    settings,
    startIndex,
    endIndex,
    trades,
    decisions,
    mtm,
    interestCharged,
    inPosition,
    realizedProfit,
    unrealizedProfit,
    netProfit: realizedProfit + unrealizedProfit,
    closedInterest,
    accruedInterest,
    maximumDrawdown,
    drawdownPeakIndex,
    drawdownTroughIndex,
    restrictions,
    lowerPriceReentries,
    recoveryResets,
    lossesNotRestricted,
    pendingAtEnd: Boolean(pending),
    stateLog,
    episodes
  };
};

// The original's entry rule: buy on the 10% signal whenever flat and the restriction allows it.
export const baselinePolicy = (): EntryPolicy => ({
  id: 'A_original',
  decide: (context) => ({ enter: context.signal, reason: context.signal ? 'signal' : 'no_signal' })
});
