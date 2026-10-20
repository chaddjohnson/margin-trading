// The decision engine for the trailing-buy strategy variants: the four-family engine (src/four-family/engine.ts,
// which reproduces the four allIn-trailingBuy*.ts files exactly) plus six optional mechanisms, each behind a
// family flag with its own parameters (research/trailing-buy-variants/PROTOCOL.md section 1.2):
//   invalidation   failed-recovery invalidation exit below the pre-entry trough
//   episodeBudget  correction-episode cumulative-loss budget that blocks arming until a causal reset
//   depthRebound   rebound threshold that grows with the correction depth beyond X
//   staged         a first leg at the rebound and one add after further progress, never above $100,000
//   progressHold   a longer maximum hold once the trade has made a given progress
//   persistence    a rebound confirmed only by several consecutive closes above the trigger
// With every flag off the engine is the four-family engine statement for statement (tests/equivalence.test.ts
// asserts identical trades and accounting on the real data and on synthetic scenarios). It only decides
// trades; profit, interest and drawdowns come from accounting.ts.
import type { Dataset } from '../four-family/data.ts';

const secondsPerMinute = 60;
const secondsPerDay = 24 * 60 * 60;
const secondsPerYear = 365 * secondsPerDay;

export type StopFill = 'stop' | 'next-open';

export type ExitReason =
  'maximum hold' | 'trailing stop' | 'trailing stop gap' | 'buffered intraday loss' | 'failed recovery';

export type ExecutionPrice =
  | 'first trade after decision'
  | 'closing print'
  | 'opening trade'
  | 'stop level'
  | 'minute open through stop'
  | 'trigger minute close';

export interface FamilyFlags {
  restricted: boolean; // the material-loss re-entry restriction and recovery reset
  buffered: boolean; // the buffered intraday loss exit
  invalidation: boolean;
  episodeBudget: boolean;
  depthRebound: boolean;
  staged: boolean;
  progressHold: boolean;
  persistence: boolean;
}

export const baseFlags = (restricted: boolean, buffered: boolean): FamilyFlags => ({
  restricted,
  buffered,
  invalidation: false,
  episodeBudget: false,
  depthRebound: false,
  staged: false,
  progressHold: false,
  persistence: false
});

// Fractions and whole numbers, as the strategy files use them. A parameter of a mechanism that is off is NaN
// and never read.
export interface StrategyParams {
  targetPercentChange: number; // X
  trailingBuyPercentage: number; // Y
  trailingStopPercentage: number;
  maximumHoldDays: number;
  tickWindowSize: number; // L, completed sessions
  materialLossThreshold: number; // restricted families only
  lowerPriceReentry: number;
  retraceFraction: number;
  intradayLossBuffer: number; // buffered families only
  invalidationBuffer: number; // invalidation: exit at or below trailingLow * (1 - buffer)
  episodeLossBudget: number; // episodeBudget: fraction of the investment
  episodeResetRetrace: number; // episodeBudget: recovery of the decline from the episode high that resets
  reboundDepthSlope: number; // depthRebound: extra rebound per unit of depth beyond X
  initialFraction: number; // staged: first leg as a fraction of the investment
  addTrigger: number; // staged: progress above the first leg's price that adds the rest
  progressThreshold: number; // progressHold: progress above entry that extends the hold
  holdExtensionDays: number; // progressHold: extra calendar days
  confirmMinutes: number; // persistence: consecutive closes at or above the trigger
}

export interface RunSettings {
  stopFill: StopFill;
  marginInterestRate: number;
  investment: number;
  firstIndex: number;
  armStart: number;
  endIndex: number;
}

// One purchase: the entry at the rebound, or the staged add.
export interface Leg {
  entryIndex: number;
  entryBar: number;
  entryTime: number;
  entryPrice: number;
  entryTimestamp: number; // the fill session's midnight UTC
  entryExecution: ExecutionPrice;
  decisionTime: number;
  decisionPrice: number;
  investment: number;
  shares: number;
}

export interface Trade {
  setupId: number;
  entryIndex: number;
  entryBar: number;
  entryTime: number;
  entryPrice: number; // the first leg's price
  entryExecution: ExecutionPrice;
  entryTimestamp: number;
  decisionTime: number;
  decisionPrice: number;
  signalIndex: number;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  trailingLow: number;
  reboundTrigger: number;
  investment: number; // total over the legs
  shares: number; // total over the legs
  legs: Leg[];
  exitIndex: number; // -1 while open
  exitBar: number;
  exitTime: number;
  exitPrice: number;
  exitExecution: ExecutionPrice | '';
  reason: ExitReason | 'open';
  exitStopPrice: number;
  maximumHoldDue: boolean;
  bufferSignalTime: number; // NaN unless a buffered-loss or failed-recovery exit (the decision minute's end)
  bufferSignalPrice: number;
  restrictedAtActivation: boolean;
  invalidationLevel: number; // NaN unless invalidation
  effectiveHoldAtExit: number; // the maximum hold that applied on the exit session (progressHold)
  addPendingAtEnd: boolean;
}

export interface SetupRecord {
  id: number;
  status: 'armed' | 'pending' | 'filled' | 'cancelled';
  statusReason: string;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  trailingLow: number;
  suppressedSignals: number;
  signalIndex: number;
  signalTime: number;
  signalPrice: number;
  carriedOvernight: boolean;
  fillIndex: number;
  fillTime: number;
  fillPrice: number;
  endIndex: number;
}

export interface EngineCounts {
  setupActivations: number;
  setupFills: number;
  setupCancellations: number;
  armedAtEnd: number;
  pendingAtEnd: number;
  reboundSignals: number;
  overnightOrders: number;
  suppressedReboundSignals: number;
  entriesWithoutTrade: number;
  restrictions: number;
  lowerPriceReentries: number;
  recoveryResets: number;
  lossesNotRestricted: number;
  losingExits: number;
  bufferedLossExits: number;
  pendingBufferedExitAtEnd: boolean;
  invalidationExits: number;
  episodesStarted: number;
  episodesExhausted: number;
  episodeResets: number;
  sessionsBlockedByBudget: number;
  adds: number;
  addsCancelled: number;
  pendingAddAtEnd: boolean;
  extendedHoldSessions: number;
  persistenceResets: number;
}

export interface EngineResult {
  trades: Trade[];
  counts: EngineCounts;
  setups?: SetupRecord[];
}

interface ExitDecision {
  reason: ExitReason;
  price: number;
  time: number;
  barIndex: number;
  execution: ExecutionPrice;
  isMaximumHoldDue: boolean;
  signalTime: number;
  signalPrice: number;
}

export const simulate = (
  ds: Dataset,
  referenceHighs: Float64Array,
  family: FamilyFlags,
  params: StrategyParams,
  settings: RunSettings,
  detail = false
): EngineResult => {
  const { firstIndex, armStart, endIndex, stopFill, marginInterestRate, investment } = settings;
  const {
    targetPercentChange,
    trailingBuyPercentage,
    trailingStopPercentage,
    maximumHoldDays,
    materialLossThreshold,
    lowerPriceReentry,
    retraceFraction,
    intradayLossBuffer,
    invalidationBuffer,
    episodeLossBudget,
    episodeResetRetrace,
    reboundDepthSlope,
    initialFraction,
    addTrigger,
    progressThreshold,
    holdExtensionDays,
    confirmMinutes
  } = params;
  const {
    restricted: hasRestriction,
    buffered,
    invalidation,
    episodeBudget,
    depthRebound,
    staged,
    progressHold,
    persistence
  } = family;
  const { sTime, sCloseTime, sOpen, sHigh, sClose, sClosingPrint, sBarStart, sBarCount, sMinClose } = ds;
  const { bTime, bOpen, bHigh, bLow, bClose } = ds;

  if (firstIndex < 0 || endIndex >= ds.sessionCount || endIndex < firstIndex) {
    throw new Error(`Run ${firstIndex}..${endIndex} is outside the dataset`);
  }

  const firstTradeFrom = (s: number, time: number) => {
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;

    for (let k = 0; k < count; k++) {
      if (bTime[start + k]! >= time) {
        return k;
      }
    }

    return Number.isNaN(sClosingPrint[s]!) ? -1 : count;
  };

  const firstTradeAfterDecision = (s: number, decisionTime: number) => {
    const k = firstTradeFrom(s, decisionTime);

    return k === sBarCount[s]! && decisionTime >= sCloseTime[s]! ? -1 : k;
  };

  const priceAt = (s: number, k: number) => (k < sBarCount[s]! ? bOpen[sBarStart[s]! + k]! : sClosingPrint[s]!);
  const timeAt = (s: number, k: number) => (k < sBarCount[s]! ? bTime[sBarStart[s]! + k]! : sCloseTime[s]!);
  const tradeExecution = (s: number, k: number): ExecutionPrice =>
    k < sBarCount[s]! ? 'first trade after decision' : 'closing print';

  const trades: Trade[] = [];
  const setups: SetupRecord[] | undefined = detail ? [] : undefined;
  const counts: EngineCounts = {
    setupActivations: 0,
    setupFills: 0,
    setupCancellations: 0,
    armedAtEnd: 0,
    pendingAtEnd: 0,
    reboundSignals: 0,
    overnightOrders: 0,
    suppressedReboundSignals: 0,
    entriesWithoutTrade: 0,
    restrictions: 0,
    lowerPriceReentries: 0,
    recoveryResets: 0,
    lossesNotRestricted: 0,
    losingExits: 0,
    bufferedLossExits: 0,
    pendingBufferedExitAtEnd: false,
    invalidationExits: 0,
    episodesStarted: 0,
    episodesExhausted: 0,
    episodeResets: 0,
    sessionsBlockedByBudget: 0,
    adds: 0,
    addsCancelled: 0,
    pendingAddAtEnd: false,
    extendedHoldSessions: 0,
    persistenceResets: 0
  };

  // The open position.
  let position: Trade | undefined;
  let postEntryHigh = 0;
  let stopPrice = 0;
  let entryReferenceHigh = 0;
  let invalidationLevel = NaN;
  // The staged add: its level, whether it is still possible, and an order waiting for a later session.
  let addLevel = NaN;
  let addOpen = false;
  let pendingAddTime = NaN;
  let pendingAddPrice = NaN;

  // The setup: 0 none, 1 armed, 2 pending.
  let setupStatus = 0;
  let setupId = 0;
  let setupActivationIndex = 0;
  let setupActivationTime = 0;
  let setupActivationPrice = 0;
  let setupReferenceHigh = 0;
  let setupTrailingLow = 0;
  let setupTrigger = 0;
  let setupSuppressed = 0;
  let setupRestrictedAtActivation = false;
  let confirmCount = 0;
  let signalIndex = 0;
  let signalTime = 0;
  let signalPrice = 0;
  let signalTrigger = 0;
  let signalTrailingLow = 0;
  let signalCarried = false;
  let setupRecord: SetupRecord | undefined;

  // The restriction.
  let isRestricted = false;
  let restrictionReferenceHigh = 0;
  let lowerLevel = 0;
  let episodeLowRestriction = 0;

  // A close-signalled sale (buffered loss or failed recovery) waiting for the next session's opening trade.
  let pendingSignalTime = NaN;
  let pendingSignalPrice = NaN;
  let pendingSignalReason: ExitReason = 'buffered intraday loss';

  // The correction episode (episodeBudget).
  let episodeActive = false;
  let episodeHigh = 0;
  let episodeLow = Infinity;
  let episodeNet = 0;
  let episodeExhausted = false;

  const resetLevel = (low: number) => low + retraceFraction * (restrictionReferenceHigh - low);
  const provisionalResetLevel = (decisionPrice: number) => resetLevel(Math.min(episodeLowRestriction, decisionPrice));

  const endSetup = (status: SetupRecord['status'], reason: string, index: number) => {
    if (setupRecord) {
      setupRecord.status = status;
      setupRecord.statusReason = reason;
      setupRecord.endIndex = index;
    }

    setupStatus = 0;
    setupRecord = undefined;
  };

  const reboundThreshold = () =>
    depthRebound
      ? trailingBuyPercentage +
        reboundDepthSlope * Math.max(0, 1 - setupTrailingLow / setupReferenceHigh - targetPercentChange)
      : trailingBuyPercentage;

  // The legs held at the start of session s (entered before it), with their interest through its date.
  const legsAtStart = (open: Trade, s: number) => {
    let shares = 0;
    let invested = 0;
    let interest = 0;

    for (const leg of open.legs) {
      if (leg.entryIndex < s) {
        shares += leg.shares;
        invested += leg.investment;
        interest += leg.investment * marginInterestRate * ((sTime[s]! - leg.entryTimestamp) / secondsPerYear);
      }
    }

    return { shares, invested, interest };
  };

  // The net profit of every leg entered by session s, sold at `price` on it.
  const profitOfPositionAt = (open: Trade, s: number, price: number) => {
    let profit = 0;

    for (const leg of open.legs) {
      if (leg.entryIndex <= s) {
        profit +=
          leg.shares * price -
          leg.investment -
          leg.investment * marginInterestRate * ((sTime[s]! - leg.entryTimestamp) / secondsPerYear);
      }
    }

    return profit;
  };

  // The exits for the position open at the start of session s. A close-signalled sale without an eligible
  // trade is left pending through the outer variables.
  const evaluateExit = (s: number, open: Trade): { exit?: ExitDecision; effectiveHold: number } => {
    const { shares, invested, interest } = legsAtStart(open, s);
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    const profitAt = (price: number) => shares * price - invested - interest;
    const isStopActive = profitAt(stopPrice) > 0;
    const daysHeld = (sTime[s]! - open.entryTimestamp) / secondsPerDay;
    const extended = progressHold && postEntryHigh >= open.entryPrice * (1 + progressThreshold);
    const effectiveHold = extended ? maximumHoldDays + holdExtensionDays : maximumHoldDays;
    const isMaximumHoldDue = daysHeld >= effectiveHold && profitAt(sOpen[s]!) < 0;
    const pendingTime = pendingSignalTime;
    const pendingPrice = pendingSignalPrice;
    const pendingReason = pendingSignalReason;
    const decision = (
      reason: ExitReason,
      k: number,
      execution: ExecutionPrice,
      price = priceAt(s, k)
    ): ExitDecision => ({
      reason,
      price,
      time: timeAt(s, k),
      barIndex: k,
      execution,
      isMaximumHoldDue,
      signalTime: NaN,
      signalPrice: NaN
    });

    if (extended) {
      counts.extendedHoldSessions++;
    }

    pendingSignalTime = NaN;
    pendingSignalPrice = NaN;

    // At the open: a resting stop gapped through takes the opening trade, even from a pending sale.
    if (isStopActive && sOpen[s]! <= stopPrice) {
      return { exit: decision('trailing stop gap', 0, 'opening trade', sOpen[s]!), effectiveHold };
    }

    // A sale left pending by an earlier session fills at this session's opening trade, ahead of the maximum
    // hold, which is only decided on that trade.
    if (!Number.isNaN(pendingTime)) {
      const k = firstTradeAfterDecision(s, pendingTime);

      if (k >= 0) {
        return {
          exit: { ...decision(pendingReason, k, 'opening trade'), signalTime: pendingTime, signalPrice: pendingPrice },
          effectiveHold
        };
      }
    }

    // Just after the open: the maximum hold sells at the next observed trade.
    if (isMaximumHoldDue) {
      const k = firstTradeFrom(s, bTime[start]! + secondsPerMinute);

      return { exit: k < 0 ? undefined : decision('maximum hold', k, tradeExecution(s, k)), effectiveHold };
    }

    // During the session: the first minute that reaches an active stop.
    let stopExit: ExitDecision | undefined;
    let stopIndex = -1;

    if (isStopActive) {
      for (let k = 0; k < count; k++) {
        if (bOpen[start + k]! <= stopPrice) {
          stopIndex = k;
          stopExit = decision('trailing stop', k, 'minute open through stop', bOpen[start + k]!);
          break;
        }

        if (bLow[start + k]! <= stopPrice) {
          stopIndex = k;

          if (stopFill === 'stop') {
            stopExit = decision('trailing stop', k, 'stop level', stopPrice);
          } else {
            const next = firstTradeFrom(s, bTime[start + k]! + secondsPerMinute);

            stopExit =
              next >= 0
                ? decision('trailing stop', next, tradeExecution(s, next))
                : {
                    ...decision('trailing stop', k, 'trigger minute close', bClose[start + k]!),
                    time: bTime[start + k]!
                  };
          }

          break;
        }
      }
    }

    // Close-signalled sales: the failed-recovery invalidation on any session, the buffered loss once the
    // (effective) maximum hold applies. The earlier minute decides; on the same minute the invalidation does.
    let signalBar = -1;
    let signalReason: ExitReason = 'buffered intraday loss';

    if (invalidation) {
      for (let k = 0; k < count; k++) {
        if (bClose[start + k]! <= invalidationLevel) {
          signalBar = k;
          signalReason = 'failed recovery';
          break;
        }
      }
    }

    if (buffered && daysHeld >= effectiveHold) {
      const threshold = -invested * intradayLossBuffer;
      const limit = signalBar < 0 ? count : signalBar;

      for (let k = 0; k < limit; k++) {
        if (profitAt(bClose[start + k]!) <= threshold) {
          signalBar = k;
          signalReason = 'buffered intraday loss';
          break;
        }
      }
    }

    if (signalBar < 0) {
      return { exit: stopExit, effectiveHold };
    }

    // The stop wins if it triggers in the signal minute or earlier, or at the same opening trade.
    if (
      stopExit &&
      stopIndex >= 0 &&
      (stopIndex <= signalBar || (stopIndex === signalBar + 1 && bOpen[start + stopIndex]! <= stopPrice))
    ) {
      return { exit: stopExit, effectiveHold };
    }

    const decisionTime = bTime[start + signalBar]! + secondsPerMinute;
    const k = firstTradeAfterDecision(s, decisionTime);

    if (k < 0) {
      pendingSignalTime = decisionTime;
      pendingSignalPrice = bClose[start + signalBar]!;
      pendingSignalReason = signalReason;

      return { exit: undefined, effectiveHold };
    }

    return {
      exit: {
        ...decision(signalReason, k, tradeExecution(s, k)),
        signalTime: decisionTime,
        signalPrice: bClose[start + signalBar]!
      },
      effectiveHold
    };
  };

  // The staged add on session s for the open position: from bar `fromBar`, the first completed minute closing
  // at or above the add level buys the rest at the next eligible trade, unless the exit (at `exitBar`, or
  // Infinity) comes first.
  const evaluateAdd = (s: number, open: Trade, fromBar: number, exitBar: number) => {
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    let fillBar = -1;
    let decisionTime = NaN;
    let decisionPrice = NaN;
    let execution: ExecutionPrice = 'first trade after decision';

    if (!Number.isNaN(pendingAddTime)) {
      const k = firstTradeAfterDecision(s, pendingAddTime);

      decisionTime = pendingAddTime;
      decisionPrice = pendingAddPrice;
      pendingAddTime = NaN;
      pendingAddPrice = NaN;

      if (k >= 0) {
        fillBar = k;
        execution = 'opening trade';
      }
    } else {
      for (let k = fromBar; k < count && k < exitBar; k++) {
        if (bClose[start + k]! >= addLevel) {
          decisionTime = bTime[start + k]! + secondsPerMinute;
          decisionPrice = bClose[start + k]!;

          const fill = firstTradeAfterDecision(s, decisionTime);

          if (fill >= 0) {
            fillBar = fill;
            execution = tradeExecution(s, fill);
          }

          break;
        }
      }
    }

    if (Number.isNaN(decisionTime)) {
      return;
    }

    if (fillBar < 0) {
      if (exitBar < Infinity) {
        addOpen = false;
        counts.addsCancelled++;
      } else {
        pendingAddTime = decisionTime;
        pendingAddPrice = decisionPrice;
      }

      return;
    }

    addOpen = false;

    if (fillBar >= exitBar) {
      counts.addsCancelled++;

      return;
    }

    const price = priceAt(s, fillBar);
    const remaining = investment - open.investment;
    const leg: Leg = {
      entryIndex: s,
      entryBar: fillBar,
      entryTime: timeAt(s, fillBar),
      entryPrice: price,
      entryTimestamp: sTime[s]!,
      entryExecution: execution,
      decisionTime,
      decisionPrice,
      investment: remaining,
      shares: remaining / price
    };

    open.legs.push(leg);
    open.investment += remaining;
    open.shares += leg.shares;
    counts.adds++;
  };

  for (let s = firstIndex; s <= endIndex; s++) {
    if (s === firstIndex) {
      continue;
    }

    const recentHigh = referenceHighs[s]!;
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    const isDip = (price: number) => 1 - price / recentHigh >= targetPercentChange;
    const openAtStart = position;
    let fillBar = -1;
    let fillExecution: ExecutionPrice = 'first trade after decision';

    // Entries: only on sessions that start flat.
    if (!openAtStart) {
      if (setupStatus === 2) {
        const k = firstTradeAfterDecision(s, signalTime);

        if (k >= 0) {
          fillBar = k;
          fillExecution = k === 0 ? 'opening trade' : tradeExecution(s, k);
        }
      } else if (setupStatus === 1 || (s >= armStart && isDip(sMinClose[s]!))) {
        for (let k = 0; k < count; k++) {
          const close = bClose[start + k]!;
          const decisionTime = bTime[start + k]! + secondsPerMinute;

          if (setupStatus === 0) {
            if (s < armStart || !isDip(close)) {
              continue;
            }

            if (hasRestriction && isRestricted && (close >= provisionalResetLevel(close) || close > lowerLevel)) {
              continue;
            }

            // An exhausted episode blocks arming for the rest of the session.
            if (episodeBudget && episodeExhausted) {
              counts.sessionsBlockedByBudget++;
              break;
            }

            setupStatus = 1;
            setupId++;
            setupActivationIndex = s;
            setupActivationTime = decisionTime;
            setupActivationPrice = close;
            setupReferenceHigh = recentHigh;
            setupTrailingLow = close;
            setupTrigger = close * (1 + reboundThreshold());
            setupSuppressed = 0;
            setupRestrictedAtActivation = hasRestriction && isRestricted;
            confirmCount = 0;
            signalCarried = false;
            counts.setupActivations++;

            if (episodeBudget && !episodeActive) {
              episodeActive = true;
              episodeHigh = recentHigh;
              episodeLow = Infinity;
              episodeNet = 0;
              episodeExhausted = false;
              counts.episodesStarted++;
            }

            if (setups) {
              setupRecord = {
                id: setupId,
                status: 'armed',
                statusReason: '',
                activationIndex: s,
                activationTime: decisionTime,
                activationPrice: close,
                referenceHigh: recentHigh,
                trailingLow: close,
                suppressedSignals: 0,
                signalIndex: -1,
                signalTime: NaN,
                signalPrice: NaN,
                carriedOvernight: false,
                fillIndex: -1,
                fillTime: NaN,
                fillPrice: NaN,
                endIndex: -1
              };
              setups.push(setupRecord);
            }

            continue;
          }

          const low = bLow[start + k]!;

          if (low < setupTrailingLow) {
            setupTrailingLow = low;
          }

          setupTrigger = setupTrailingLow * (1 + reboundThreshold());

          if (close < setupTrigger) {
            if (persistence && confirmCount > 0) {
              counts.persistenceResets++;
            }

            confirmCount = 0;
            continue;
          }

          confirmCount++;

          if (persistence && confirmCount < confirmMinutes) {
            continue;
          }

          if (hasRestriction && isRestricted && close >= provisionalResetLevel(close)) {
            setupSuppressed++;
            counts.suppressedReboundSignals++;
            continue;
          }

          setupStatus = 2;
          signalIndex = s;
          signalTime = decisionTime;
          signalPrice = close;
          signalTrigger = setupTrigger;
          signalTrailingLow = setupTrailingLow;
          counts.reboundSignals++;

          const fill = firstTradeAfterDecision(s, decisionTime);

          if (fill >= 0) {
            fillBar = fill;
            fillExecution = tradeExecution(s, fill);
          }

          break;
        }
      }

      if (setupRecord) {
        setupRecord.trailingLow = setupTrailingLow;
        setupRecord.suppressedSignals = setupSuppressed;

        if (setupStatus === 2) {
          setupRecord.status = 'pending';
          setupRecord.signalIndex = signalIndex;
          setupRecord.signalTime = signalTime;
          setupRecord.signalPrice = signalPrice;
        }
      }

      if (fillBar >= 0 && setupStatus === 2) {
        const price = priceAt(s, fillBar);
        const firstInvestment = staged ? investment * initialFraction : investment;
        const leg: Leg = {
          entryIndex: s,
          entryBar: fillBar,
          entryTime: timeAt(s, fillBar),
          entryPrice: price,
          entryTimestamp: sTime[s]!,
          entryExecution: fillExecution,
          decisionTime: signalTime,
          decisionPrice: signalPrice,
          investment: firstInvestment,
          shares: firstInvestment / price
        };
        const trade: Trade = {
          setupId,
          entryIndex: s,
          entryBar: fillBar,
          entryTime: leg.entryTime,
          entryPrice: price,
          entryExecution: fillExecution,
          entryTimestamp: sTime[s]!,
          decisionTime: signalTime,
          decisionPrice: signalPrice,
          signalIndex,
          activationIndex: setupActivationIndex,
          activationTime: setupActivationTime,
          activationPrice: setupActivationPrice,
          referenceHigh: setupReferenceHigh,
          trailingLow: signalTrailingLow,
          reboundTrigger: signalTrigger,
          investment: firstInvestment,
          shares: leg.shares,
          legs: [leg],
          exitIndex: -1,
          exitBar: -1,
          exitTime: NaN,
          exitPrice: NaN,
          exitExecution: '',
          reason: 'open',
          exitStopPrice: NaN,
          maximumHoldDue: false,
          bufferSignalTime: NaN,
          bufferSignalPrice: NaN,
          restrictedAtActivation: setupRestrictedAtActivation,
          invalidationLevel: invalidation ? signalTrailingLow * (1 - invalidationBuffer) : NaN,
          effectiveHoldAtExit: NaN,
          addPendingAtEnd: false
        };

        trades.push(trade);
        position = trade;
        entryReferenceHigh = setupReferenceHigh;
        invalidationLevel = trade.invalidationLevel;
        addLevel = staged ? price * (1 + addTrigger) : NaN;
        addOpen = staged;
        pendingAddTime = NaN;
        pendingAddPrice = NaN;
        counts.setupFills++;

        if (setupRecord) {
          setupRecord.fillIndex = s;
          setupRecord.fillTime = trade.entryTime;
          setupRecord.fillPrice = price;
          setupRecord.carriedOvernight = signalCarried;
        }

        endSetup('filled', 'filled', s);

        // The high and the stop for the next session, from the fill onwards only.
        let high = Math.max(price, sClose[s]!);

        for (let k = fillBar; k < count; k++) {
          high = Math.max(high, bHigh[start + k]!);
        }

        postEntryHigh = high;
        stopPrice = postEntryHigh * (1 - trailingStopPercentage);

        // The staged add can already be decided on the fill's minute's close.
        if (staged && addOpen && fillBar < count) {
          evaluateAdd(s, trade, fillBar, Infinity);
        }
      } else if (setupStatus === 2 && !signalCarried) {
        signalCarried = true;
        counts.overnightOrders++;

        if (setupRecord) {
          setupRecord.carriedOvernight = true;
        }
      }
    }

    // Exits: only for a position open at the start of the session.
    if (openAtStart) {
      const { exit, effectiveHold } = evaluateExit(s, openAtStart);

      if (staged && addOpen) {
        evaluateAdd(s, openAtStart, 0, exit ? exit.barIndex : Infinity);
      }

      if (exit) {
        const profit = profitOfPositionAt(openAtStart, s, exit.price);

        openAtStart.exitIndex = s;
        openAtStart.exitBar = exit.barIndex;
        openAtStart.exitTime = exit.time;
        openAtStart.exitPrice = exit.price;
        openAtStart.exitExecution = exit.execution;
        openAtStart.reason = exit.reason;
        openAtStart.exitStopPrice = stopPrice;
        openAtStart.maximumHoldDue = exit.isMaximumHoldDue;
        openAtStart.bufferSignalTime = exit.signalTime;
        openAtStart.bufferSignalPrice = exit.signalPrice;
        openAtStart.effectiveHoldAtExit = effectiveHold;
        position = undefined;
        addOpen = false;
        pendingAddTime = NaN;
        pendingAddPrice = NaN;

        if (exit.reason === 'buffered intraday loss') {
          counts.bufferedLossExits++;
        } else if (exit.reason === 'failed recovery') {
          counts.invalidationExits++;
        }

        const priceReturn = exit.price / openAtStart.entryPrice - 1;

        if (hasRestriction) {
          if (priceReturn <= -materialLossThreshold) {
            isRestricted = true;
            restrictionReferenceHigh = entryReferenceHigh;
            lowerLevel = exit.price * (1 - lowerPriceReentry);
            episodeLowRestriction = sClose[s]!;
            counts.restrictions++;
          } else if (profit < 0) {
            counts.lossesNotRestricted++;
          }
        } else if (profit < 0) {
          counts.losingExits++;
        }

        if (episodeBudget && episodeActive) {
          episodeNet += profit;

          if (!episodeExhausted && episodeNet <= -episodeLossBudget * investment) {
            episodeExhausted = true;
            counts.episodesExhausted++;
          }
        }
      } else {
        postEntryHigh = Math.max(postEntryHigh, sHigh[s]!);
        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
      }
    }

    // End of the session: resolve the restriction.
    if (hasRestriction && isRestricted) {
      episodeLowRestriction = Math.min(episodeLowRestriction, sClose[s]!);

      if (position && position.entryIndex === s) {
        isRestricted = false;
        counts.lowerPriceReentries++;
      } else if (!position && sClose[s]! >= resetLevel(episodeLowRestriction)) {
        if (setupStatus !== 0) {
          if (setupStatus === 2) {
            counts.entriesWithoutTrade++;
          }

          counts.setupCancellations++;
          endSetup('cancelled', 'recovery_reset', s);
        }

        isRestricted = false;
        counts.recoveryResets++;
      }
    }

    // End of the session: the correction episode's low and reset.
    if (episodeBudget && episodeActive) {
      episodeLow = Math.min(episodeLow, sClose[s]!);

      if (!position && sClose[s]! >= episodeLow + episodeResetRetrace * (episodeHigh - episodeLow)) {
        episodeActive = false;
        episodeExhausted = false;
        counts.episodeResets++;
      }
    }
  }

  if (setupStatus !== 0) {
    if (setupStatus === 2) {
      counts.entriesWithoutTrade++;
      counts.pendingAtEnd = 1;
    } else {
      counts.armedAtEnd = 1;
    }

    if (setupRecord) {
      setupRecord.statusReason = setupStatus === 2 ? 'pending_at_end' : 'armed_at_end';
    }
  }

  counts.pendingBufferedExitAtEnd = Boolean(position) && !Number.isNaN(pendingSignalTime);
  counts.pendingAddAtEnd = Boolean(position) && !Number.isNaN(pendingAddTime);

  if (position) {
    position.addPendingAtEnd = counts.pendingAddAtEnd;
  }

  return { trades, counts, setups };
};
