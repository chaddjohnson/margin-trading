// The daily allIn strategy of src/app/allin-original.ts, parameterized, with a two-stage trailing-buy
// entry. In 'legacy' entry mode, same-close execution and the original's settings, the five output files
// are byte-identical to the original's (goldenMaster.ts). Everything after the entry decision (exits,
// stop activation and gap fills, the maximum hold, interest, the material-loss restriction and its recovery
// reset, the one-position limit) is the original's code path, expression for expression, so floating-point
// results agree bit for bit. STATE_MACHINE.md in the study folder is the prose specification.
//
// Trailing entry ('fixed', 'atrSnapshot', 'atrRolling'), evaluated only on sessions that start flat:
// 1. Arm: while no setup is pending, a close with 1 - close / referenceHigh >= X arms a setup (and, while
//    restricted, only if that close is also at or below the frozen lower level). Nothing is bought on the
//    arming close. The setup freezes the arming close, its reference high and the trough (= that close).
// 2. Trail: on each later flat session, a close below the trough lowers the trough (and, in 'atrSnapshot',
//    re-snapshots the lagged ATR). Otherwise the close is tested against the trigger:
//      fixed       trough x (1 + Y)
//      atrSnapshot trough + K x ATR(N) of the session before the latest trough was set
//      atrRolling  trough + K x ATR(N) of the session before today
// 3. Buy: a close at or above the trigger is the buy decision. The drawdown need not still be >= X.
//    'close' execution fills at that close; 'nextOpen' fills at the next session's open.
// While restricted, a recovery reset (close >= reset level) takes precedence: it cancels a pending setup
// and nothing is armed or bought that session. Variant 'B' additionally requires the decision close to be
// at or below the lower level while still restricted; variant 'A' (primary) checks the lower level only
// when arming.

const secondsPerDay = 24 * 60 * 60;

export type EntryMode = 'legacy' | 'fixed' | 'atrSnapshot' | 'atrRolling';
export type Execution = 'close' | 'nextOpen' | 'preClose';
export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap';

// Every strategy-controlled number, as an integer: percentages in tenths of a percentage point
// (100 = 10.0%), the ATR multiplier in tenths (25 = 2.5), durations in sessions or calendar days.
export interface StrategyParams {
  entryMode: EntryMode;
  lookback: number;
  armTenths: number; // X
  reboundTenths: number; // Y ('fixed' only, else 0)
  atrMultTenths: number; // K x 10 (ATR modes only, else 0)
  atrPeriod: number; // N (ATR modes only, else 0)
  stopTenths: number;
  holdDays: number;
  materialLossTenths: number;
  lowerReentryTenths: number;
  retraceTenths: number;
}

export interface RunOptions {
  execution: Execution;
  restrictedFill: 'A' | 'B';
  frozenHigh: 'activation' | 'fill';
  maxWaitSessions: number; // 0 = a setup never expires
  marginRate: number;
  investment: number;
  record: boolean; // keep the state log and restriction episodes (off in the optimizer)
  // 'preClose' only: the decision price of each session on the bars' adjusted scale (NaN = none).
  preClosePrice?: ArrayLike<number>;
}

export const defaultRunOptions: RunOptions = {
  execution: 'close',
  restrictedFill: 'A',
  frozenHigh: 'activation',
  maxWaitSessions: 0,
  marginRate: 0.11,
  investment: 100000,
  record: true
};

// The brief's baseline (1.0% / 2.0% / 38%) and the checked-in file's own settings (0.5% / 3.0% / 38%).
export const baselineParams: StrategyParams = {
  entryMode: 'legacy',
  lookback: 90,
  armTenths: 100,
  reboundTenths: 0,
  atrMultTenths: 0,
  atrPeriod: 0,
  stopTenths: 80,
  holdDays: 15,
  materialLossTenths: 10,
  lowerReentryTenths: 20,
  retraceTenths: 380
};

export const checkedInParams: StrategyParams = { ...baselineParams, materialLossTenths: 5, lowerReentryTenths: 30 };

export interface Bars {
  date: string[];
  time: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
}

export interface Indicators {
  referenceHighs(lookback: number): Float64Array;
  atr(period: number): Float64Array;
}

export interface Trade {
  id: number;
  setupId: number; // -1 in legacy mode
  decisionIndex: number;
  entryIndex: number;
  exitIndex: number; // -1 while open
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number; // the last close while open
  reason: ExitReason | 'open';
  restrictedEntry: boolean;
  investment: number;
  shares: number;
  interest: number;
  profit: number;
  referenceHigh: number; // frozen for a later restriction
  lowestLow: number; // the original's convention: lows of fully held sessions and the exit price
  worstMark: number; // lowest close-based P&L while open, net of accrued interest
  priceReturn: number;
  restrictedAfter: boolean;
}

export type SetupOutcome =
  'filled' | 'cancelled_reset' | 'expired' | 'pending_at_end' | 'order_unfilled_at_end' | 'order_invalid_open';

export interface Setup {
  id: number;
  armIndex: number;
  armClose: number;
  armReferenceHigh: number;
  armDrawdown: number;
  restrictedAtArm: boolean;
  lowerLevelAtArm: number; // NaN when not restricted
  trough: number;
  troughIndex: number;
  newTroughs: number;
  atrSnapshot: number; // NaN outside 'atrSnapshot'
  blockedTriggers: number; // variant B: triggers suppressed by the lower level
  decisionIndex: number; // -1 until the trigger fires
  trigger: number; // the trigger price at the decision (NaN before)
  fillIndex: number;
  fillPrice: number;
  endIndex: number; // decision, cancellation, expiry or end of data
  outcome: SetupOutcome | '';
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
  cancelledSetup: boolean; // a pending setup was cancelled by the recovery reset
}

interface Restriction {
  lossExitPrice: number;
  referenceHigh: number;
  lowerLevel: number;
  episodeLow: number;
}

export interface SimulationResult {
  params: StrategyParams;
  options: RunOptions;
  startIndex: number;
  endIndex: number;
  trades: Trade[];
  setups: Setup[];
  // Per session, indexed like the bars (0 outside the run):
  mtm: Float64Array; // realized + open P&L at the close, net of accrued interest
  interestCum: Float64Array; // interest charged on closed trades plus accrued on the open one
  inPosition: Uint8Array; // a position is open at the close
  openMark: Float64Array; // P&L of the open position at the close, net of accrued interest (0 when flat)
  adverse: Float64Array; // drop below the entry price of a held session's low (or of the exit fill)
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
  cancelledSetups: number;
  stateLog: StateLogRow[];
  episodes: RestrictionEpisode[];
}

export const validateParams = (params: StrategyParams) => {
  const integers: (keyof StrategyParams)[] = [
    'lookback',
    'armTenths',
    'reboundTenths',
    'atrMultTenths',
    'atrPeriod',
    'stopTenths',
    'holdDays',
    'materialLossTenths',
    'lowerReentryTenths',
    'retraceTenths'
  ];

  for (const key of integers) {
    const value = params[key] as number;

    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${key} must be a non-negative integer, got ${value}`);
    }
  }

  if (params.lookback < 1 || params.armTenths < 1 || params.stopTenths < 1 || params.stopTenths >= 1000) {
    throw new Error('lookback, armTenths and stopTenths must be positive (stop below 100%)');
  }

  const isAtr = params.entryMode === 'atrSnapshot' || params.entryMode === 'atrRolling';

  if (params.entryMode === 'legacy' && (params.reboundTenths || params.atrMultTenths || params.atrPeriod)) {
    throw new Error('legacy entry takes no rebound or ATR parameters');
  }

  // Y = 0 is not a delayed trailing buy: the immediate entry is the explicit 'legacy' mode.
  if (params.entryMode === 'fixed' && (params.reboundTenths < 1 || params.atrMultTenths || params.atrPeriod)) {
    throw new Error('fixed entry needs reboundTenths >= 1 and no ATR parameters');
  }

  if (isAtr && (params.atrMultTenths < 1 || params.atrPeriod < 1 || params.reboundTenths)) {
    throw new Error('ATR entry needs atrMultTenths >= 1, atrPeriod >= 1 and no fixed rebound');
  }
};

const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

export const simulate = (
  bars: Bars,
  indicators: Indicators,
  params: StrategyParams,
  startIndex: number,
  endIndex: number,
  runOptions: Partial<RunOptions> = {}
): SimulationResult => {
  validateParams(params);

  const options: RunOptions = { ...defaultRunOptions, ...runOptions };
  const { time, open, high, low, close } = bars;
  const { investment, marginRate, execution, record, preClosePrice } = options;

  if (execution === 'preClose' && (!preClosePrice || preClosePrice.length !== time.length)) {
    throw new Error('preClose execution needs one pre-close price per bar');
  }

  const isLegacy = params.entryMode === 'legacy';
  // Decimal settings, computed as integer / 1000 so they equal the original's literals exactly.
  const targetPercentChange = params.armTenths / 1000;
  const trailingStopPercentage = params.stopTenths / 1000;
  const maximumHoldDays = params.holdDays;
  const materialLossThreshold = params.materialLossTenths / 1000;
  const lowerPriceReentry = params.lowerReentryTenths / 1000;
  const retraceFraction = params.retraceTenths / 1000;
  const rebound = params.reboundTenths / 1000;
  const atrMultiplier = params.atrMultTenths / 10;
  const refs = indicators.referenceHighs(params.lookback);
  const atr = params.atrPeriod > 0 ? indicators.atr(params.atrPeriod) : undefined;

  if (startIndex < 0 || endIndex >= time.length || startIndex > endIndex) {
    throw new Error(`Run range ${startIndex}..${endIndex} is outside the ${time.length} bars`);
  }

  const length = time.length;
  const mtm = new Float64Array(length);
  const interestCum = new Float64Array(length);
  const inPosition = new Uint8Array(length);
  const openMark = new Float64Array(length);
  const adverse = new Float64Array(length);
  const trades: Trade[] = [];
  const setups: Setup[] = [];
  const stateLog: StateLogRow[] = [];
  const episodes: RestrictionEpisode[] = [];

  let position: Trade | undefined;
  let setup: Setup | undefined;
  let order: { decisionIndex: number; referenceHigh: number; setup?: Setup } | undefined;
  let restriction: Restriction | undefined;
  let episode: RestrictionEpisode | undefined;
  let postEntryHigh = 0;
  let postEntryLow = 0;
  let stopPrice = 0;
  let realizedProfit = 0;
  let closedInterestRunning = 0;
  let peakProfit = 0;
  let peakIndex = startIndex;
  let maximumDrawdown = 0;
  let drawdownPeakIndex = startIndex;
  let drawdownTroughIndex = startIndex;
  let restrictions = 0;
  let lowerPriceReentries = 0;
  let recoveryResets = 0;
  let lossesNotRestricted = 0;
  let cancelledSetups = 0;

  // Simple interest on the borrowed amount for the calendar time held (the original's expression).
  const calculateInterest = (current: Trade, timestamp: number) => {
    const yearsHeld = (timestamp - current.entryTime) / (365 * secondsPerDay);

    return current.investment * marginRate * yearsHeld;
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
    if (!record) {
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

  const openPosition = (index: number, price: number, decisionIndex: number, referenceHigh: number, from?: Setup) => {
    const trade: Trade = {
      id: trades.length,
      setupId: from ? from.id : -1,
      decisionIndex,
      entryIndex: index,
      exitIndex: -1,
      entryTime: time[index]!,
      exitTime: time[index]!,
      entryPrice: price,
      exitPrice: price,
      reason: 'open',
      restrictedEntry: Boolean(restriction),
      investment,
      // Vanguard allows partial shares.
      shares: investment / price,
      interest: 0,
      profit: 0,
      referenceHigh,
      lowestLow: price,
      worstMark: Infinity,
      priceReturn: 0,
      restrictedAfter: false
    };

    trades.push(trade);
    postEntryHigh = price;
    postEntryLow = price;
    stopPrice = postEntryHigh * (1 - trailingStopPercentage);

    if (from) {
      from.fillIndex = index;
      from.fillPrice = price;
      from.outcome = 'filled';
    }

    return trade;
  };

  // The trigger price of a pending setup at session `index` (NaN while the ATR has no value yet).
  const triggerOf = (current: Setup, index: number) => {
    if (params.entryMode === 'fixed') {
      return current.trough * (1 + rebound);
    }

    if (params.entryMode === 'atrSnapshot') {
      return current.trough + atrMultiplier * current.atrSnapshot;
    }

    return current.trough + atrMultiplier * (index > 0 ? atr![index - 1]! : NaN);
  };

  type Decision = { referenceHigh: number; from?: Setup };

  // Session flags shared with the end-of-session log (reset at the top of every session).
  let entryBlocked = false;
  let restrictedReason = '';

  // A pending setup's trigger test at `price`. Fills in the setup and returns the decision, or counts a
  // trigger that variant B's lower level suppresses.
  const testTrigger = (index: number, price: number, lowerAllows: boolean, recentHigh: number) => {
    const current = setup!;
    const trigger = triggerOf(current, index);

    if (!(price >= trigger)) {
      return undefined;
    }

    if (options.restrictedFill === 'B' && !lowerAllows) {
      current.blockedTriggers++;
      restrictedReason = 'fill_blocked';

      return undefined;
    }

    current.decisionIndex = index;
    current.trigger = trigger;
    current.endIndex = index;
    setup = undefined;

    return {
      referenceHigh: options.frozenHigh === 'activation' ? current.armReferenceHigh : recentHigh,
      from: current
    } satisfies Decision;
  };

  // The flat session's state update at the official close: the episode low, the recovery reset (which
  // takes precedence and cancels a pending setup), then arming, trailing the trough and, when `canBuy`,
  // the buy decision of the legacy or trailing entry.
  const closeUpdate = (
    index: number,
    tickClose: number,
    recentHigh: number,
    percentChange: number,
    signal: boolean,
    canBuy: boolean
  ): Decision | undefined => {
    if (restriction) {
      restriction.episodeLow = Math.min(restriction.episodeLow, tickClose);
    }

    const isReset = restriction ? tickClose >= resetLevelOf(restriction) : false;
    const lowerAllows = !restriction || tickClose <= restriction.lowerLevel;
    let decision: Decision | undefined;

    if (isReset) {
      entryBlocked = signal;

      if (setup) {
        setup.outcome = 'cancelled_reset';
        setup.endIndex = index;
        setup = undefined;
        cancelledSetups++;

        if (episode) {
          episode.cancelledSetup = true;
        }
      }
    } else if (isLegacy) {
      if (signal && lowerAllows && canBuy) {
        decision = { referenceHigh: recentHigh };
      } else if (signal && !lowerAllows) {
        entryBlocked = true;
      }
    } else if (setup) {
      restrictedReason = 'waiting';

      if (tickClose < setup.trough) {
        setup.trough = tickClose;
        setup.troughIndex = index;
        setup.newTroughs++;

        if (params.entryMode === 'atrSnapshot') {
          setup.atrSnapshot = atr![index - 1]!;
        }
      } else if (canBuy) {
        decision = testTrigger(index, tickClose, lowerAllows, recentHigh);
      }

      if (setup && options.maxWaitSessions > 0 && index - setup.armIndex >= options.maxWaitSessions) {
        setup.outcome = 'expired';
        setup.endIndex = index;
        setup = undefined;
      }
    } else if (signal && lowerAllows) {
      setup = {
        id: setups.length,
        armIndex: index,
        armClose: tickClose,
        armReferenceHigh: recentHigh,
        armDrawdown: percentChange,
        restrictedAtArm: Boolean(restriction),
        lowerLevelAtArm: restriction ? restriction.lowerLevel : NaN,
        trough: tickClose,
        troughIndex: index,
        newTroughs: 0,
        atrSnapshot: params.entryMode === 'atrSnapshot' ? atr![index - 1]! : NaN,
        blockedTriggers: 0,
        decisionIndex: -1,
        trigger: NaN,
        fillIndex: -1,
        fillPrice: NaN,
        endIndex: -1,
        outcome: ''
      };
      setups.push(setup);
      restrictedReason = 'armed';
    } else if (signal) {
      entryBlocked = true;
    }

    return decision;
  };

  const lastIndex = endIndex;

  for (let index = startIndex; index <= lastIndex; index++) {
    const tickTime = time[index]!;
    const tickOpen = open[index]!;
    const tickLow = low[index]!;
    const tickClose = close[index]!;
    const recentHigh = refs[index]!;
    const percentChange = 1 - tickClose / recentHigh;

    // The original skips the first bar of its data entirely.
    if (index === 0) {
      continue;
    }

    const heldPosition = position;
    const signal = percentChange >= targetPercentChange;
    let enteredToday = false;
    let filledAtOpen = false;

    entryBlocked = false;
    restrictedReason = '';

    if (order && !heldPosition) {
      // A next-open order from the previous close fills at this session's open. No new decision today.
      const placed = order;

      order = undefined;

      if (tickOpen > 0 && Number.isFinite(tickOpen)) {
        position = openPosition(index, tickOpen, placed.decisionIndex, placed.referenceHigh, placed.setup);
        enteredToday = true;
        filledAtOpen = true;
      } else if (placed.setup) {
        placed.setup.outcome = 'order_invalid_open';
        placed.setup.endIndex = index;
      }
    } else if (!heldPosition && execution === 'preClose') {
      // Pre-close model: the buy decision and fill use the price just before 15:55 New York time (already
      // scaled to the adjusted daily series), against the state as of the previous close. The official
      // close then updates the state exactly as in the close model, except that it never buys.
      const price = preClosePrice![index]!;
      let decision: Decision | undefined;

      if (Number.isFinite(price) && price > 0 && !(restriction && price >= resetLevelOf(restriction))) {
        const lowerAllowsAt = !restriction || price <= restriction.lowerLevel;

        if (isLegacy) {
          if (1 - price / recentHigh >= targetPercentChange && lowerAllowsAt) {
            decision = { referenceHigh: recentHigh };
          }
        } else if (setup) {
          decision = testTrigger(index, price, lowerAllowsAt, recentHigh);
        }
      }

      if (decision) {
        position = openPosition(index, price, index, decision.referenceHigh, decision.from);
        enteredToday = true;
      } else {
        closeUpdate(index, tickClose, recentHigh, percentChange, signal, false);
      }
    } else if (!heldPosition) {
      // Flat before the session (and so no exit today): the entry decision at the close.
      const decision = closeUpdate(index, tickClose, recentHigh, percentChange, signal, true);

      if (decision) {
        if (execution === 'close') {
          position = openPosition(index, tickClose, index, decision.referenceHigh, decision.from);
          enteredToday = true;
        } else {
          order = { decisionIndex: index, referenceHigh: decision.referenceHigh, setup: decision.from };
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
        heldPosition.exitIndex = index;
        heldPosition.exitTime = tickTime;
        heldPosition.exitPrice = exit.price;
        heldPosition.reason = exit.reason;
        heldPosition.interest = interest;
        heldPosition.profit = heldPosition.shares * exit.price - heldPosition.investment - interest;
        heldPosition.lowestLow = Math.min(postEntryLow, exit.price);
        adverse[index] = 1 - exit.price / heldPosition.entryPrice;
        realizedProfit += heldPosition.profit;
        closedInterestRunning += interest;
        position = undefined;

        const priceReturn = exit.price / heldPosition.entryPrice - 1;

        heldPosition.priceReturn = priceReturn;

        if (priceReturn <= -materialLossThreshold) {
          restriction = {
            lossExitPrice: exit.price,
            referenceHigh: heldPosition.referenceHigh,
            lowerLevel: exit.price * (1 - lowerPriceReentry),
            episodeLow: tickClose
          };
          heldPosition.restrictedAfter = true;
          restrictions++;
          episode = {
            exitIndex: index,
            exitDate: record ? formatDate(tickTime) : '',
            exitReason: exit.reason,
            loss: heldPosition.profit,
            priceReturn,
            lossExitPrice: exit.price,
            losingEntryPrice: heldPosition.entryPrice,
            referenceHigh: heldPosition.referenceHigh,
            episodeLow: tickClose,
            resolution: '',
            resolutionDate: '',
            cancelledSetup: false
          };

          if (record) {
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
        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
        postEntryLow = Math.min(postEntryLow, tickLow);
        adverse[index] = 1 - tickLow / heldPosition.entryPrice;
      }
    } else if (filledAtOpen && position) {
      // Filled at the open: the rest of this session is post-entry.
      postEntryHigh = Math.max(postEntryHigh, high[index]!);
      stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
      postEntryLow = Math.min(postEntryLow, tickLow);
      adverse[index] = 1 - tickLow / position.entryPrice;
    }

    // Daily mark-to-market profit: realized profit plus any open position at the close, net of interest.
    let accrued = 0;
    let markedProfit = realizedProfit;

    if (position) {
      accrued = calculateInterest(position, tickTime);

      const unrealized = position.shares * tickClose - position.investment - accrued;

      markedProfit = realizedProfit + unrealized;
      position.worstMark = Math.min(position.worstMark, unrealized);
      openMark[index] = unrealized;
      inPosition[index] = 1;
    }

    mtm[index] = markedProfit;
    interestCum[index] = closedInterestRunning + accrued;

    if (markedProfit > peakProfit) {
      peakProfit = markedProfit;
      peakIndex = index;
    }

    if (peakProfit - markedProfit > maximumDrawdown) {
      maximumDrawdown = peakProfit - markedProfit;
      drawdownPeakIndex = peakIndex;
      drawdownTroughIndex = index;
    }

    // End of the session: resolve the restriction exactly as the original. A position opened in this
    // session clears it; otherwise a flat close at or above the reset level clears it.
    if (restriction && episode) {
      restriction.episodeLow = Math.min(restriction.episodeLow, tickClose);
      episode.episodeLow = restriction.episodeLow;

      if (position && enteredToday) {
        logState(index, 'RESTRICTED', 'NORMAL', 'lower_price_reentry', signal, true);
        lowerPriceReentries++;
        episode.resolution = 'lower_price_reentry';
        episode.resolutionDate = record ? formatDate(tickTime) : '';
        restriction = undefined;
        episode = undefined;
      } else if (!position && !order && tickClose >= resetLevelOf(restriction)) {
        logState(index, 'RESTRICTED', 'NORMAL', 'recovery_reset', signal, false);
        recoveryResets++;
        episode.resolution = 'recovery_reset';
        episode.resolutionDate = record ? formatDate(tickTime) : '';
        restriction = undefined;
        episode = undefined;
      } else {
        const reason = entryBlocked ? 'entry_blocked' : isLegacy || !restrictedReason ? 'restricted' : restrictedReason;

        logState(index, 'RESTRICTED', 'RESTRICTED', reason, signal, false);

        if (index === lastIndex) {
          episode.resolution = 'unresolved_at_end';
          episode.resolutionDate = record ? formatDate(tickTime) : '';
        }
      }
    } else if (position && enteredToday) {
      logState(index, 'NORMAL', 'NORMAL', 'normal_entry', signal, true);
    }
  }

  let accruedInterest = 0;
  let unrealizedProfit = 0;

  if (position) {
    const lastTime = time[lastIndex]!;

    accruedInterest = calculateInterest(position, lastTime);
    unrealizedProfit =
      position.shares * close[lastIndex]! - position.investment - calculateInterest(position, lastTime);
    position.exitTime = lastTime;
    position.exitPrice = close[lastIndex]!;
    position.interest = accruedInterest;
    position.profit = unrealizedProfit;
    position.lowestLow = postEntryLow;
    position.priceReturn = close[lastIndex]! / position.entryPrice - 1;
  }

  if (setup) {
    setup.outcome = 'pending_at_end';
    setup.endIndex = lastIndex;
  }

  if (order?.setup) {
    order.setup.outcome = 'order_unfilled_at_end';
  }

  // The original sums closed interest in entry order at the end; recompute it that way for identical bits.
  const closedInterest = trades.reduce((total, trade) => total + (trade.reason === 'open' ? 0 : trade.interest), 0);

  return {
    params,
    options,
    startIndex,
    endIndex: lastIndex,
    trades,
    setups,
    mtm,
    interestCum,
    inPosition,
    openMark,
    adverse,
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
    cancelledSetups,
    stateLog,
    episodes
  };
};
