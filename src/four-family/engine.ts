// The fast decision engine for the four trailing-buy strategies:
//   allIn-trailingBuy.ts                        restricted, not buffered
//   allIn-trailingBuy-bufferedLoss.ts           restricted, buffered
//   allIn-trailingBuy-noReentry.ts              not restricted, not buffered
//   allIn-trailingBuy-bufferedLoss-noReentry.ts not restricted, buffered
// It transcribes their decision rules statement by statement over the typed-array dataset (data.ts) instead
// of MarketSession objects, with the constants the files hard-code (the trailing stop, the maximum hold, the
// lookback, the margin rate and the restriction's three settings) taken from a parameter object. It only
// decides trades; every profit, interest and drawdown figure comes from accounting.ts. parity.ts checks it
// against the unmodified files at their defaults and against parameter-injectable copies of them.
//
// Speed comes only from skipping work that can't change a decision: a flat session without a setup is only
// scanned when its lowest minute close meets the X condition (the condition is monotone in the price), and no
// mark-to-market or logging happens here. Every comparison is the source's own expression.
import type { Dataset } from './data.ts';

const secondsPerMinute = 60;
const secondsPerDay = 24 * 60 * 60;

export type StopFill = 'stop' | 'next-open';

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap' | 'buffered intraday loss';

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
}

// Fractions and whole numbers, as the strategy files use them.
export interface StrategyParams {
  targetPercentChange: number; // X
  trailingBuyPercentage: number; // Y
  trailingStopPercentage: number;
  maximumHoldDays: number;
  tickWindowSize: number; // L, completed sessions
  materialLossThreshold: number; // restricted families only
  lowerPriceReentry: number; // restricted families only
  retraceFraction: number; // restricted families only
  intradayLossBuffer: number; // buffered families only
}

export interface RunSettings {
  stopFill: StopFill;
  marginInterestRate: number;
  investment: number;
  // The session list starts at firstIndex (the source's index 0, which is skipped), arming is allowed from
  // armStart, and the run ends after endIndex. The source's own warmup is armStart = firstIndex + L.
  firstIndex: number;
  armStart: number;
  endIndex: number;
}

export interface Trade {
  setupId: number;
  entryIndex: number;
  entryBar: number; // the fill's minute in the session, or the bar count for the closing print
  entryTime: number;
  entryPrice: number;
  entryExecution: ExecutionPrice;
  entryTimestamp: number; // the fill session's midnight UTC, as the source's position.entryTimestamp
  decisionTime: number;
  decisionPrice: number;
  signalIndex: number;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  trailingLow: number;
  reboundTrigger: number;
  investment: number;
  shares: number;
  exitIndex: number; // -1 while open
  exitBar: number;
  exitTime: number;
  exitPrice: number;
  exitExecution: ExecutionPrice | '';
  reason: ExitReason | 'open';
  exitStopPrice: number;
  maximumHoldDue: boolean;
  bufferSignalTime: number; // NaN unless a buffered-loss exit
  bufferSignalPrice: number;
  restrictedAtActivation: boolean;
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
  bufferSignalTime: number;
  bufferSignalPrice: number;
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
    intradayLossBuffer
  } = params;
  const { restricted: hasRestriction, buffered } = family;
  const { sTime, sCloseTime, sOpen, sHigh, sLow, sClose, sClosingPrint, sBarStart, sBarCount, sMinClose } = ds;
  const { bTime, bOpen, bHigh, bLow, bClose } = ds;

  if (firstIndex < 0 || endIndex >= ds.sessionCount || endIndex < firstIndex) {
    throw new Error(`Run ${firstIndex}..${endIndex} is outside the dataset`);
  }

  // The first trade at or after `time` in session s: a minute index, the bar count for the closing print,
  // or -1 for none (firstTradeFrom).
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

  // firstTradeAfterDecision: the closing print only for a decision made before the close.
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
    pendingBufferedExitAtEnd: false
  };

  // The open position.
  let position: Trade | undefined;
  let postEntryHigh = 0;
  let stopPrice = 0;
  let entryReferenceHigh = 0;

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
  let episodeLow = 0;

  // A buffered-loss sale waiting for the next session's opening trade.
  let pendingBufferTime = NaN;
  let pendingBufferPrice = NaN;

  const resetLevel = (low: number) => low + retraceFraction * (restrictionReferenceHigh - low);
  const provisionalResetLevel = (decisionPrice: number) => resetLevel(Math.min(episodeLow, decisionPrice));

  const endSetup = (status: SetupRecord['status'], reason: string, index: number) => {
    if (setupRecord) {
      setupRecord.status = status;
      setupRecord.statusReason = reason;
      setupRecord.endIndex = index;
    }

    setupStatus = 0;
    setupRecord = undefined;
  };

  // evaluateSessionExit, for the position open at the start of session s.
  const evaluateSessionExit = (s: number, interest: number, open: Trade): ExitDecision | undefined => {
    const shares = open.shares;
    const invested = open.investment;
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    const profitAt = (price: number) => shares * price - invested - interest;
    const isStopActive = profitAt(stopPrice) > 0;
    const daysHeld = (sTime[s]! - open.entryTimestamp) / secondsPerDay;
    const isMaximumHoldDue = daysHeld >= maximumHoldDays && profitAt(sOpen[s]!) < 0;
    const decision = (reason: ExitReason, k: number, execution: ExecutionPrice, price = priceAt(s, k)) => ({
      reason,
      price,
      time: timeAt(s, k),
      barIndex: k,
      execution,
      isMaximumHoldDue,
      bufferSignalTime: NaN,
      bufferSignalPrice: NaN
    });

    if (isStopActive && sOpen[s]! <= stopPrice) {
      return decision('trailing stop gap', 0, 'opening trade', sOpen[s]!);
    }

    if (isMaximumHoldDue) {
      const k = firstTradeFrom(s, bTime[start]! + secondsPerMinute);

      return k < 0 ? undefined : decision('maximum hold', k, tradeExecution(s, k));
    }

    if (!isStopActive) {
      return undefined;
    }

    for (let k = 0; k < count; k++) {
      if (bOpen[start + k]! <= stopPrice) {
        return decision('trailing stop', k, 'minute open through stop', bOpen[start + k]!);
      }

      if (bLow[start + k]! <= stopPrice) {
        if (stopFill === 'stop') {
          return decision('trailing stop', k, 'stop level', stopPrice);
        }

        const next = firstTradeFrom(s, bTime[start + k]! + secondsPerMinute);

        if (next >= 0) {
          return { ...decision('trailing stop', next, tradeExecution(s, next)) };
        }

        return {
          ...decision('trailing stop', k, 'trigger minute close', bClose[start + k]!),
          time: bTime[start + k]!
        };
      }
    }

    return undefined;
  };

  // evaluateBufferedSessionExit. Returns the exit, or a pending signal through the outer variables.
  const evaluateBufferedSessionExit = (s: number, interest: number, open: Trade): ExitDecision | undefined => {
    const exit = evaluateSessionExit(s, interest, open);
    const shares = open.shares;
    const invested = open.investment;
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    const profitAt = (price: number) => shares * price - invested - interest;
    const isStopActive = profitAt(stopPrice) > 0;
    const daysHeld = (sTime[s]! - open.entryTimestamp) / secondsPerDay;
    const isMaximumHoldDue = daysHeld >= maximumHoldDays && profitAt(sOpen[s]!) < 0;
    const threshold = -invested * intradayLossBuffer;
    const pendingTime = pendingBufferTime;
    const pendingPrice = pendingBufferPrice;

    pendingBufferTime = NaN;
    pendingBufferPrice = NaN;

    if (exit?.reason === 'trailing stop gap') {
      return exit;
    }

    if (!Number.isNaN(pendingTime)) {
      const k = firstTradeAfterDecision(s, pendingTime);

      if (k >= 0) {
        return {
          reason: 'buffered intraday loss',
          price: priceAt(s, k),
          time: timeAt(s, k),
          barIndex: k,
          execution: 'opening trade',
          isMaximumHoldDue,
          bufferSignalTime: pendingTime,
          bufferSignalPrice: pendingPrice
        };
      }
    }

    if (daysHeld < maximumHoldDays || isMaximumHoldDue) {
      return exit;
    }

    let signalBar = -1;

    for (let k = 0; k < count; k++) {
      if (profitAt(bClose[start + k]!) <= threshold) {
        signalBar = k;
        break;
      }
    }

    if (signalBar < 0) {
      return exit;
    }

    let stopIndex = -1;

    if (isStopActive) {
      for (let k = 0; k < count; k++) {
        if (bOpen[start + k]! <= stopPrice || bLow[start + k]! <= stopPrice) {
          stopIndex = k;
          break;
        }
      }
    }

    if (
      exit &&
      stopIndex >= 0 &&
      (stopIndex <= signalBar || (stopIndex === signalBar + 1 && bOpen[start + stopIndex]! <= stopPrice))
    ) {
      return exit;
    }

    const decisionTime = bTime[start + signalBar]! + secondsPerMinute;
    const k = firstTradeAfterDecision(s, decisionTime);

    if (k < 0) {
      pendingBufferTime = decisionTime;
      pendingBufferPrice = bClose[start + signalBar]!;

      return undefined;
    }

    return {
      reason: 'buffered intraday loss',
      price: priceAt(s, k),
      time: timeAt(s, k),
      barIndex: k,
      execution: tradeExecution(s, k),
      isMaximumHoldDue,
      bufferSignalTime: decisionTime,
      bufferSignalPrice: bClose[start + signalBar]!
    };
  };

  for (let s = firstIndex; s <= endIndex; s++) {
    // The source skips its first session.
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

            setupStatus = 1;
            setupId++;
            setupActivationIndex = s;
            setupActivationTime = decisionTime;
            setupActivationPrice = close;
            setupReferenceHigh = recentHigh;
            setupTrailingLow = close;
            setupTrigger = close * (1 + trailingBuyPercentage);
            setupSuppressed = 0;
            setupRestrictedAtActivation = hasRestriction && isRestricted;
            signalCarried = false;
            counts.setupActivations++;

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

          setupTrigger = setupTrailingLow * (1 + trailingBuyPercentage);

          if (close < setupTrigger) {
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
        const trade: Trade = {
          setupId,
          entryIndex: s,
          entryBar: fillBar,
          entryTime: timeAt(s, fillBar),
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
          investment,
          shares: investment / price,
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
          restrictedAtActivation: setupRestrictedAtActivation
        };

        trades.push(trade);
        position = trade;
        entryReferenceHigh = setupReferenceHigh;
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
      const interest =
        openAtStart.investment *
        marginInterestRate *
        ((sTime[s]! - openAtStart.entryTimestamp) / (365 * secondsPerDay));
      const exit = buffered
        ? evaluateBufferedSessionExit(s, interest, openAtStart)
        : evaluateSessionExit(s, interest, openAtStart);

      if (exit) {
        openAtStart.exitIndex = s;
        openAtStart.exitBar = exit.barIndex;
        openAtStart.exitTime = exit.time;
        openAtStart.exitPrice = exit.price;
        openAtStart.exitExecution = exit.execution;
        openAtStart.reason = exit.reason;
        openAtStart.exitStopPrice = stopPrice;
        openAtStart.maximumHoldDue = exit.isMaximumHoldDue;
        openAtStart.bufferSignalTime = exit.bufferSignalTime;
        openAtStart.bufferSignalPrice = exit.bufferSignalPrice;
        position = undefined;

        if (exit.reason === 'buffered intraday loss') {
          counts.bufferedLossExits++;
        }

        const profit = openAtStart.shares * exit.price - openAtStart.investment - interest;
        const priceReturn = exit.price / openAtStart.entryPrice - 1;

        if (hasRestriction) {
          if (priceReturn <= -materialLossThreshold) {
            isRestricted = true;
            restrictionReferenceHigh = entryReferenceHigh;
            lowerLevel = exit.price * (1 - lowerPriceReentry);
            episodeLow = sClose[s]!;
            counts.restrictions++;
          } else if (profit < 0) {
            counts.lossesNotRestricted++;
          }
        } else if (profit < 0) {
          counts.losingExits++;
        }
      } else {
        postEntryHigh = Math.max(postEntryHigh, sHigh[s]!);
        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
      }
    }

    // End of the session: resolve the restriction.
    if (hasRestriction && isRestricted) {
      episodeLow = Math.min(episodeLow, sClose[s]!);

      if (position && position.entryIndex === s) {
        isRestricted = false;
        counts.lowerPriceReentries++;
      } else if (!position && sClose[s]! >= resetLevel(episodeLow)) {
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

  counts.pendingBufferedExitAtEnd = buffered && Boolean(position) && !Number.isNaN(pendingBufferTime);

  // Unused in decisions; kept so the low isn't silently dropped from the transcription.
  void sLow;

  return { trades, counts, setups };
};
