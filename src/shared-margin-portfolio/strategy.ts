// The frozen strategies as minute-stepped state machines, ported from the strategy files so that a shared account
// can gate their fills, transfer a position between them and stress their exits without touching the files:
//
//   entry machine   FLAT → ARMED → PENDING_FILL, per completed minute (D1: the X decline from the rolling L-session
//                   high, or the post-exit continuation pullback; swing-low: a close at or below the rolling
//                   K-session low); the rebound from the trailing low confirms at a completed minute's close and the
//                   order fills at the first trade after the decision.
//   exit manager    the trailing stop (level from the post-entry high, updated once a day, never lowered; eligible
//                   under the net-profit rule or the gross-breakeven latch), the maximum-hold loss exit at the open,
//                   and the buffered intraday loss exit, in the files' own order, with the pending-sale carry.
//
// Parity with the files and the D1-refinement engine is checked by parity.ts: every trade's sessions, minutes,
// prices, reasons, interest and profit. The machines read only completed minutes and pre-session state.
import type { Dataset } from '../four-family/data.ts';
import { computeReferenceHighs } from '../four-family/data.ts';
import { computeReferenceLows } from '../d1-refinement/engine.ts';

export const secondsPerMinute = 60;
export const secondsPerDay = 24 * 60 * 60;
export const secondsPerYear = 365 * secondsPerDay;

export type StopFill = 'stop' | 'next-open';
export type StopPolicy = 'net' | 'breakeven';
export type EntryMode = 'deep' | 'swing';
export type SetupKind = 'deep' | 'continuation' | 'swing';

export type ExitReason =
  | 'maximum hold'
  | 'trailing stop'
  | 'trailing stop gap'
  | 'buffered intraday loss'
  | 'displaced'
  | 'forced liquidation'
  | 'open';

export type ExecutionPrice =
  | 'first trade after decision'
  | 'closing print'
  | 'opening trade'
  | 'stop level'
  | 'minute open through stop'
  | 'trigger minute close';

export type StrategyKey = 'd1' | 'd1.breakeven' | 'd1.p86' | 'swing' | 'set2';

export interface StrategyParams {
  key: StrategyKey;
  label: string;
  entryMode: EntryMode;
  postExit: boolean;
  stopPolicy: StopPolicy;
  targetPercentChange: number; // X (deep path)
  tickWindowSize: number; // L (deep path)
  trailingBuyPercentage: number; // Y, the rebound that buys
  trailingStopPercentage: number;
  maximumHoldDays: number;
  intradayLossBuffer: number;
  pullback: number; // continuation
  continuationWindow: number;
  swingLookback: number; // K (swing path)
  swingProximity: number; // Z
}

const d1Base = {
  entryMode: 'deep' as EntryMode,
  postExit: true,
  stopPolicy: 'net' as StopPolicy,
  targetPercentChange: 0.216,
  tickWindowSize: 74,
  trailingBuyPercentage: 0.003,
  trailingStopPercentage: 0.073,
  maximumHoldDays: 8,
  intradayLossBuffer: 0.029,
  pullback: 0.09,
  continuationWindow: 60,
  swingLookback: NaN,
  swingProximity: NaN
};

// The shipped constants of the four files (and Set 2 for regression).
export const strategies: Record<StrategyKey, StrategyParams> = {
  d1: { key: 'd1', label: 'D1', ...d1Base },
  'd1.breakeven': { key: 'd1.breakeven', label: 'D1 gross-breakeven stop (B2)', ...d1Base, stopPolicy: 'breakeven' },
  'd1.p86': { key: 'd1.p86', label: 'D1 with P 8.6% (B3)', ...d1Base, pullback: 0.086 },
  set2: { key: 'set2', label: 'Set 2 (file 4)', ...d1Base, postExit: false },
  swing: {
    key: 'swing',
    label: 'Swing-low C2',
    entryMode: 'swing',
    postExit: false,
    stopPolicy: 'net',
    targetPercentChange: 0.216, // reported only by the file; not an entry condition
    tickWindowSize: 74,
    trailingBuyPercentage: 0.006,
    trailingStopPercentage: 0.04,
    maximumHoldDays: 26,
    intradayLossBuffer: 0.004,
    pullback: NaN,
    continuationWindow: NaN,
    swingLookback: 55,
    swingProximity: 0
  }
};

export const isD1Family = (key: StrategyKey) => key !== 'swing';

// ----- fills -----

// Bar index k of the first regular-session minute with trades at or after `time`, the bar count for the closing
// print, or -1 without either.
export const firstTradeFrom = (ds: Dataset, s: number, time: number) => {
  const start = ds.sBarStart[s]!;
  const count = ds.sBarCount[s]!;

  for (let k = 0; k < count; k++) {
    if (ds.bTime[start + k]! >= time) {
      return k;
    }
  }

  return Number.isNaN(ds.sClosingPrint[s]!) ? -1 : count;
};

// Like `firstTradeFrom`, except that the closing print is eligible only for a decision made before the close.
export const firstTradeAfterDecision = (ds: Dataset, s: number, decisionTime: number) => {
  const k = firstTradeFrom(ds, s, decisionTime);

  return k === ds.sBarCount[s]! && decisionTime >= ds.sCloseTime[s]! ? -1 : k;
};

export const priceAt = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bOpen[ds.sBarStart[s]! + k]! : ds.sClosingPrint[s]!;

export const timeAt = (ds: Dataset, s: number, k: number) =>
  k < ds.sBarCount[s]! ? ds.bTime[ds.sBarStart[s]! + k]! : ds.sCloseTime[s]!;

export const tradeExecution = (ds: Dataset, s: number, k: number): ExecutionPrice =>
  k < ds.sBarCount[s]! ? 'first trade after decision' : 'closing print';

// ----- the position the exit manager manages -----

export interface LotState {
  entryPrice: number;
  shares: number;
  investment: number; // borrowed principal
  entryTimestamp: number; // the entry session's midnight UTC: interest accrues from here
  holdTimestamp: number; // the session the maximum hold counts from (the entry session, or T2b's takeover session)
}

export const interestOn = (lot: LotState, rate: number, sessionTime: number) =>
  lot.investment * rate * ((sessionTime - lot.entryTimestamp) / secondsPerYear);

export interface ExitDecision {
  reason: ExitReason;
  barIndex: number; // 0..count; count = the closing print
  price: number;
  time: number;
  execution: ExecutionPrice;
  isMaximumHoldDue: boolean;
  signalTime: number; // buffered-loss exits: the decision minute's end
  signalPrice: number;
  stopPrice: number;
  stopActive: boolean;
}

export interface ExitSettings {
  stopFill: StopFill;
  marginInterestRate: number;
}

// The exit side of one position under D1's (or swing-low's) rules. `evaluate(s)` decides the exit, if any, of a
// position open at the start of session s from the pre-session state and the session's bars.
export class ExitManager {
  postEntryHigh = 0;
  postEntryLow = Infinity;
  stopPrice = 0;
  latched = false;
  pendingSignalTime = NaN;
  pendingSignalPrice = NaN;
  stopActiveSessions = 0;
  stopFirstActiveIndex = -1;

  constructor(
    readonly ds: Dataset,
    readonly params: StrategyParams,
    readonly settings: ExitSettings
  ) {}

  private updateLatch(entryPrice: number) {
    if (!this.latched && this.params.stopPolicy === 'breakeven' && this.stopPrice >= entryPrice) {
      this.latched = true;
    }
  }

  // The files' entry-session rule: the high from the fill's minute onwards, with the fill and the close.
  onEntry(lot: LotState, s: number, fillBar: number, referencePrice = lot.entryPrice) {
    const { ds } = this;
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    let high = Math.max(referencePrice, ds.sClose[s]!);
    let low = Math.min(referencePrice, ds.sClose[s]!);

    for (let k = fillBar; k < count; k++) {
      high = Math.max(high, ds.bHigh[start + k]!);
      low = Math.min(low, ds.bLow[start + k]!);
    }

    this.postEntryHigh = high;
    this.postEntryLow = low;
    this.stopPrice = high * (1 - this.params.trailingStopPercentage);
    this.latched = false;
    this.pendingSignalTime = NaN;
    this.pendingSignalPrice = NaN;
    this.updateLatch(lot.entryPrice);
  }

  // T1: the high observed by the previous owner, carried over; the stop level follows this strategy's percentage.
  initFromHigh(lot: LotState, high: number, low: number) {
    this.postEntryHigh = high;
    this.postEntryLow = low;
    this.stopPrice = high * (1 - this.params.trailingStopPercentage);
    this.latched = false;
    this.pendingSignalTime = NaN;
    this.pendingSignalPrice = NaN;
    this.updateLatch(lot.entryPrice);
  }

  afterSession(lot: LotState, s: number) {
    this.postEntryHigh = Math.max(this.postEntryHigh, this.ds.sHigh[s]!);
    this.postEntryLow = Math.min(this.postEntryLow, this.ds.sLow[s]!);
    this.stopPrice = Math.max(this.stopPrice, this.postEntryHigh * (1 - this.params.trailingStopPercentage));
    this.updateLatch(lot.entryPrice);
  }

  get hasPendingSignal() {
    return !Number.isNaN(this.pendingSignalTime);
  }

  isStopActive(lot: LotState, s: number) {
    const interest = interestOn(lot, this.settings.marginInterestRate, this.ds.sTime[s]!);

    return this.params.stopPolicy === 'net'
      ? lot.shares * this.stopPrice - lot.investment - interest > 0
      : this.latched;
  }

  evaluate(lot: LotState, s: number): ExitDecision | undefined {
    const { ds, params, settings } = this;
    const { maximumHoldDays, intradayLossBuffer } = params;
    const interest = interestOn(lot, settings.marginInterestRate, ds.sTime[s]!);
    const start = ds.sBarStart[s]!;
    const count = ds.sBarCount[s]!;
    const stopPrice = this.stopPrice;
    const profitAt = (price: number) => lot.shares * price - lot.investment - interest;
    const active = this.isStopActive(lot, s);

    if (active) {
      if (this.stopFirstActiveIndex < 0) {
        this.stopFirstActiveIndex = s;
      }

      this.stopActiveSessions++;
    }

    const daysHeld = (ds.sTime[s]! - lot.holdTimestamp) / secondsPerDay;
    const isMaximumHoldDue = daysHeld >= maximumHoldDays && profitAt(ds.sOpen[s]!) < 0;
    const pendingTime = this.pendingSignalTime;
    const pendingPrice = this.pendingSignalPrice;
    const decision = (
      reason: ExitReason,
      k: number,
      execution: ExecutionPrice,
      price = priceAt(ds, s, k)
    ): ExitDecision => ({
      reason,
      barIndex: k,
      price,
      time: timeAt(ds, s, k),
      execution,
      isMaximumHoldDue,
      signalTime: NaN,
      signalPrice: NaN,
      stopPrice,
      stopActive: active
    });

    this.pendingSignalTime = NaN;
    this.pendingSignalPrice = NaN;

    // At the open: a resting stop gapped through takes the opening trade, even from a pending sale.
    if (active && ds.sOpen[s]! <= stopPrice) {
      return decision('trailing stop gap', 0, 'opening trade', ds.sOpen[s]!);
    }

    // A sale left pending by an earlier session fills at this session's opening trade.
    if (!Number.isNaN(pendingTime)) {
      const k = firstTradeAfterDecision(ds, s, pendingTime);

      if (k >= 0) {
        return {
          ...decision('buffered intraday loss', k, 'opening trade'),
          signalTime: pendingTime,
          signalPrice: pendingPrice
        };
      }
    }

    // Just after the open: the maximum hold sells at the next observed trade.
    if (isMaximumHoldDue) {
      const k = firstTradeFrom(ds, s, ds.bTime[start]! + secondsPerMinute);

      return k < 0 ? undefined : decision('maximum hold', k, tradeExecution(ds, s, k));
    }

    // During the session: the first minute that reaches an active stop.
    let stopExit: ExitDecision | undefined;
    let stopIndex = -1;

    if (active) {
      for (let k = 0; k < count; k++) {
        if (ds.bOpen[start + k]! <= stopPrice) {
          stopIndex = k;
          stopExit = decision('trailing stop', k, 'minute open through stop', ds.bOpen[start + k]!);
          break;
        }

        if (ds.bLow[start + k]! <= stopPrice) {
          stopIndex = k;

          if (settings.stopFill === 'stop') {
            stopExit = decision('trailing stop', k, 'stop level', stopPrice);
          } else {
            const next = firstTradeFrom(ds, s, ds.bTime[start + k]! + secondsPerMinute);

            stopExit =
              next >= 0
                ? decision('trailing stop', next, tradeExecution(ds, s, next))
                : {
                    ...decision('trailing stop', k, 'trigger minute close', ds.bClose[start + k]!),
                    time: ds.bTime[start + k]!
                  };
          }

          break;
        }
      }
    }

    if (daysHeld < maximumHoldDays) {
      return stopExit;
    }

    // The buffered loss once the maximum hold applies: the first completed minute whose close reaches it.
    const threshold = -lot.investment * intradayLossBuffer;
    let signalBar = -1;

    for (let k = 0; k < count; k++) {
      if (profitAt(ds.bClose[start + k]!) <= threshold) {
        signalBar = k;
        break;
      }
    }

    if (signalBar < 0) {
      return stopExit;
    }

    if (
      stopExit &&
      stopIndex >= 0 &&
      (stopIndex <= signalBar || (stopIndex === signalBar + 1 && ds.bOpen[start + stopIndex]! <= stopPrice))
    ) {
      return stopExit;
    }

    const decisionTime = ds.bTime[start + signalBar]! + secondsPerMinute;
    const k = firstTradeAfterDecision(ds, s, decisionTime);

    if (k < 0) {
      this.pendingSignalTime = decisionTime;
      this.pendingSignalPrice = ds.bClose[start + signalBar]!;

      return undefined;
    }

    return {
      ...decision('buffered intraday loss', k, tradeExecution(ds, s, k)),
      signalTime: decisionTime,
      signalPrice: ds.bClose[start + signalBar]!
    };
  }
}

// ----- the entry machine -----

export type EntryState = 'FLAT' | 'ARMED' | 'PENDING_FILL' | 'LONG';

export interface Setup {
  id: number;
  kind: SetupKind;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  anchorHigh: number;
  trailingLow: number;
  trailingLowTime: number;
  reboundTrigger: number;
  declinedSignals: number; // rebound minutes refused capital (hold semantics)
  status: 'armed' | 'pending' | 'filled' | 'cancelled' | 'taken over' | 'armed at end' | 'pending at end';
  endIndex: number;
}

export interface ReboundSignal {
  setup: Setup;
  index: number;
  barIndex: number; // the confirming minute
  decisionTime: number;
  decisionPrice: number;
  trigger: number;
  trailingLow: number;
}

// Rolling reference levels for one dataset, computed once per lookback.
export class Levels {
  private readonly highs = new Map<number, Float64Array>();
  private readonly lows = new Map<number, Float64Array>();

  constructor(readonly ds: Dataset) {}

  high(lookback: number) {
    let highs = this.highs.get(lookback);

    if (!highs) {
      highs = computeReferenceHighs(this.ds, lookback);
      this.highs.set(lookback, highs);
    }

    return highs;
  }

  low(lookback: number) {
    let lows = this.lows.get(lookback);

    if (!lows) {
      lows = computeReferenceLows(this.ds, lookback);
      this.lows.set(lookback, lows);
    }

    return lows;
  }
}

export class EntryMachine {
  setup: Setup | undefined;
  pending: ReboundSignal | undefined; // a confirmed rebound waiting for its fill
  setups = 0;
  readonly setupLog: Setup[] = [];
  continuationActive = false;
  continuationHigh = 0;
  continuationStart = -1;
  continuationWindows = 0;
  continuationExpiries = 0;
  activationsByKind: Record<SetupKind, number> = { deep: 0, continuation: 0, swing: 0 };
  private readonly highs: Float64Array;
  private readonly lows: Float64Array | undefined;

  constructor(
    readonly ds: Dataset,
    readonly params: StrategyParams,
    levels: Levels,
    readonly armStart: number
  ) {
    this.highs = levels.high(params.tickWindowSize);
    this.lows = params.entryMode === 'swing' ? levels.low(params.swingLookback) : undefined;
  }

  get state(): EntryState {
    return this.pending ? 'PENDING_FILL' : this.setup ? 'ARMED' : 'FLAT';
  }

  referenceHigh(s: number) {
    return this.highs[s]!;
  }

  rollingLow(s: number) {
    return this.lows?.[s] ?? NaN;
  }

  private continuationOpen(s: number) {
    return (
      this.params.postExit &&
      this.continuationActive &&
      s > this.continuationStart &&
      s - this.continuationStart <= this.params.continuationWindow
    );
  }

  // Which path, if any, arms on a completed minute closing at `close` in session s.
  armingKind(s: number, close: number): SetupKind | undefined {
    const { params } = this;

    if (s < this.armStart) {
      return undefined;
    }

    if (params.entryMode === 'deep') {
      const recentHigh = this.highs[s]!;

      if (s >= params.tickWindowSize && 1 - close / recentHigh >= params.targetPercentChange) {
        return 'deep';
      }

      if (this.continuationOpen(s) && close <= this.continuationHigh * (1 - params.pullback)) {
        return 'continuation';
      }

      return undefined;
    }

    return s >= params.swingLookback && close <= this.lows![s]! * (1 + params.swingProximity) ? 'swing' : undefined;
  }

  // Processes completed minute k of session s while the strategy is flat (no position at the session's start, no
  // pending order). Returns a rebound signal when the minute confirms one; the caller decides whether it fills.
  processBar(s: number, k: number): ReboundSignal | undefined {
    const { ds, params } = this;
    const b = ds.sBarStart[s]! + k;
    const close = ds.bClose[b]!;
    const decisionTime = ds.bTime[b]! + secondsPerMinute;

    if (!this.setup) {
      const kind = this.armingKind(s, close);

      if (!kind) {
        return undefined;
      }

      const recentHigh = this.highs[s]!;
      const anchorHigh =
        kind === 'deep' ? recentHigh : kind === 'continuation' ? this.continuationHigh : this.lows![s]!;

      this.setups++;
      this.activationsByKind[kind]++;
      this.setup = {
        id: this.setups,
        kind,
        activationIndex: s,
        activationTime: decisionTime,
        activationPrice: close,
        referenceHigh: recentHigh,
        anchorHigh,
        trailingLow: close,
        trailingLowTime: ds.bTime[b]!,
        reboundTrigger: close * (1 + params.trailingBuyPercentage),
        declinedSignals: 0,
        status: 'armed',
        endIndex: -1
      };
      this.setupLog.push(this.setup);

      // Any arming ends the continuation window (D1); the arming minute never buys.
      this.continuationActive = false;

      return undefined;
    }

    const { setup } = this;
    const low = ds.bLow[b]!;

    if (low < setup.trailingLow) {
      setup.trailingLow = low;
      setup.trailingLowTime = ds.bTime[b]!;
    }

    setup.reboundTrigger = setup.trailingLow * (1 + params.trailingBuyPercentage);

    if (close < setup.reboundTrigger) {
      return undefined;
    }

    return {
      setup,
      index: s,
      barIndex: k,
      decisionTime,
      decisionPrice: close,
      trigger: setup.reboundTrigger,
      trailingLow: setup.trailingLow
    };
  }

  // The signal was granted capital: the setup is pending until its fill.
  commit(signal: ReboundSignal) {
    this.pending = signal;
    signal.setup.status = 'pending';
  }

  // The order filled (or the setup was consumed by a takeover): the setup is finished.
  clearSetup(status: Setup['status'] = 'filled', endIndex = -1) {
    if (this.setup) {
      this.setup.status = status;
      this.setup.endIndex = endIndex;
    }

    this.setup = undefined;
    this.pending = undefined;
  }

  // The signal was refused capital under the cancel semantics.
  cancelSetup(endIndex = -1) {
    this.clearSetup('cancelled', endIndex);
  }

  // The end of the data.
  finish(endIndex: number) {
    if (this.setup) {
      this.setup.status = this.pending ? 'pending at end' : 'armed at end';
      this.setup.endIndex = endIndex;
    }
  }

  // A profitable exit of this strategy's position opens the continuation window from the exit price.
  onExit(s: number, exitPrice: number, netProfit: number) {
    if (this.params.postExit && netProfit > 0) {
      this.continuationActive = true;
      this.continuationHigh = exitPrice;
      this.continuationStart = s;
      this.continuationWindows++;
    }
  }

  // End of the session: the continuation window's high and expiry.
  afterSession(s: number) {
    if (this.continuationActive) {
      if (s > this.continuationStart) {
        this.continuationHigh = Math.max(this.continuationHigh, this.ds.sHigh[s]!);
      }

      if (s - this.continuationStart >= this.params.continuationWindow) {
        this.continuationActive = false;
        this.continuationExpiries++;
      }
    }
  }
}
