// The decision engine of the D1-refinement program (research/vgt-d1-refinement): the architecture of
// src/app/allIn-trailingBuy-postExitContinuation.ts (D1: file 4's trailing buy armed by an X decline from the
// rolling L-session reference high, bought on a Y rebound from the trailing low, exited by a trailing stop that is
// active only while a fill at the stop would be profitable after interest, the maximum-hold loss exit and the
// buffered intraday loss exit, plus the post-exit continuation window), generalized along two independent axes:
//
//   stop policy (Track B)   how the trailing stop becomes eligible to execute; the stop level itself is always
//                           postEntryHigh x (1 - trailingStopPercentage), updated once a day, never lowered.
//     net          D1 as shipped: active on a session iff shares x stop - investment - interest(session) > 0,
//                  decided afresh every session (it can switch off again as interest accrues).
//     netLatched   the same test, but once active it stays active for the rest of the trade (B0 diagnostic).
//     gross        B-A: latched once postEntryHigh >= entryPrice x (1 + activationGain), tested at the daily update.
//     breakeven    B-B: latched once the stop level >= entryPrice (gross breakeven), tested at the daily update.
//     twoStage     B-C: EARLY stage with a fixed protective stop at entryPrice x (1 - earlyStop) until the trailing
//                  stop level reaches entryPrice (the breakeven test), then ESTABLISHED: the trailing stop,
//                  latched. Irreversible.
//     always       B-D: the trailing stop is active from the session after the entry, profitable or not.
//   entry mode (Track C)    which paths can arm a trailing buy while flat.
//     deep         D1 / Set 2: the X decline from the rolling high (plus the continuation window when postExit).
//     always       C1: a flat strategy arms on its first completed minute; the trailing low starts at that close
//                  and the buy is an alwaysRebound rebound from the lowest later minute low. No dip test.
//     swing        C2: a flat strategy arms on a completed minute closing at or below the lowest session low of the
//                  previous swingLookback sessions x (1 + swingProximity): a new local low, confirmed by the
//                  swingRebound rebound. No decline-from-high test.
//     deepAlways   C3: D1's deep and continuation paths plus the always path; deepSwing: plus the swing path. The
//                  D1 paths have absolute precedence at arming, and an armed always/swing setup is re-armed as a
//                  deep or continuation setup on the minute D1 would have armed, so D1's arming decisions are
//                  reproduced whenever the strategy is flat. An always/swing arming never closes the continuation
//                  window. The extra path can displace a D1 trade only by holding the position when D1 would arm.
//
// With entryMode 'deep', stopPolicy 'net' and postExit on, the engine is the D1 file statement for statement; with
// postExit off it is file 4 (tests/equivalence.test.ts asserts identical trades to the recovery-eligibility
// engine, itself verified against the files). The engine only decides trades; profit, interest and drawdowns
// come from the trailing-buy-variants accounting (replay).
import type { Dataset } from '../four-family/data.ts';

const secondsPerMinute = 60;
const secondsPerDay = 24 * 60 * 60;
const secondsPerYear = 365 * secondsPerDay;

export type StopFill = 'stop' | 'next-open';

export type ExitReason =
  | 'maximum hold'
  | 'trailing stop'
  | 'trailing stop gap'
  | 'buffered intraday loss'
  | 'protective stop'
  | 'protective stop gap';

export type ExecutionPrice =
  | 'first trade after decision'
  | 'closing print'
  | 'opening trade'
  | 'stop level'
  | 'minute open through stop'
  | 'trigger minute close';

export type SetupKind = 'deep' | 'continuation' | 'always' | 'swing';
export const setupKinds: SetupKind[] = ['deep', 'continuation', 'always', 'swing'];

export type EntryMode = 'deep' | 'always' | 'swing' | 'deepAlways' | 'deepSwing';
export type StopPolicy = 'net' | 'netLatched' | 'gross' | 'breakeven' | 'twoStage' | 'always';
export const stopPolicies: StopPolicy[] = ['net', 'netLatched', 'gross', 'breakeven', 'twoStage', 'always'];

export interface Architecture {
  entryMode: EntryMode;
  postExit: boolean;
  stopPolicy: StopPolicy;
}

export const hasDeepPath = (mode: EntryMode) => mode === 'deep' || mode === 'deepAlways' || mode === 'deepSwing';
export const hasAlwaysPath = (mode: EntryMode) => mode === 'always' || mode === 'deepAlways';
export const hasSwingPath = (mode: EntryMode) => mode === 'swing' || mode === 'deepSwing';

// Fractions and whole numbers, as the strategy files use them. A parameter the architecture doesn't read is NaN
// and never read.
export interface Params {
  targetPercentChange: number; // X
  trailingBuyPercentage: number; // Y (deep and continuation setups)
  trailingStopPercentage: number;
  maximumHoldDays: number;
  tickWindowSize: number; // L
  intradayLossBuffer: number;
  pullback: number; // postExit: decline from the post-exit high that arms
  continuationWindow: number; // postExit: sessions after a profitable exit during which the pullback can arm
  activationGain: number; // gross: appreciation of the post-entry high over the entry that activates the stop
  earlyStop: number; // twoStage: protective stop below the entry while the trailing stop is below breakeven
  alwaysRebound: number; // always path: rebound from the trailing low that buys
  swingLookback: number; // swing path: sessions in the rolling low
  swingRebound: number; // swing path: rebound from the trailing low that buys
  swingProximity: number; // swing path: a close within this fraction above the rolling low arms (0: at or below)
}

export interface RunSettings {
  stopFill: StopFill;
  marginInterestRate: number;
  investment: number;
  firstIndex: number;
  armStart: number;
  endIndex: number;
}

export interface Trade {
  setupId: number;
  kind: SetupKind;
  entryIndex: number;
  entryBar: number;
  entryTime: number;
  entryPrice: number;
  entryExecution: ExecutionPrice;
  entryTimestamp: number; // the fill session's midnight UTC
  decisionTime: number;
  decisionPrice: number;
  signalIndex: number;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number; // the rolling reference high at activation (NaN without a deep path)
  anchorHigh: number; // the level the activation was measured from (post-exit high, rolling low, the arming close)
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
  exitStopPrice: number; // the trailing stop level at the exit (or the end)
  maximumHoldDue: boolean;
  bufferSignalTime: number; // NaN unless a buffered-loss exit (the decision minute's end)
  bufferSignalPrice: number;
  // Stop-eligibility diagnostics: the first session on which the stop was active (-1: never), the sessions on
  // which it was active, and the sessions on which it was inactive after having been active earlier (only the
  // 'net' policy can switch off).
  stopFirstActiveIndex: number;
  stopActiveSessions: number;
  stopSwitchOffSessions: number;
  stopLatchIndex: number; // the session at whose daily update the latch (gross, breakeven, twoStage) was set
}

export interface SetupRecord {
  id: number;
  kind: SetupKind;
  status: 'armed' | 'pending' | 'filled';
  statusReason: string;
  activationIndex: number;
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  anchorHigh: number;
  trailingLow: number;
  signalIndex: number;
  signalTime: number;
  signalPrice: number;
  carriedOvernight: boolean;
  fillIndex: number;
  fillTime: number;
  fillPrice: number;
  endIndex: number;
  upgradedFrom: SetupKind | '';
}

// The state at a session's close, for the diagnostic traces.
export interface SessionTrace {
  index: number;
  recentHigh: number;
  xLevel: number;
  rollingLow: number;
  close: number;
  low: number;
  minClose: number;
  entryState: 'FLAT' | 'ARMED' | 'PENDING_FILL' | 'LONG';
  setupKind: SetupKind | '';
  trailingLow: number;
  reboundTrigger: number;
  continuationActive: boolean;
  continuationHigh: number;
  continuationStart: number;
}

// The stop state before each session that starts with a position open, for the Track B diagnostics.
export interface StopTraceRow {
  index: number;
  tradeIndex: number; // position in the trade list
  postEntryHigh: number;
  stopPrice: number; // the trailing stop level
  effectiveStop: number; // the level the exits used this session (the protective stop in the EARLY stage)
  interest: number; // accrued through the session's date
  breakeven: number; // the price at which a sale would net zero after that interest
  profitAtStop: number; // shares x stop - investment - interest
  active: boolean;
  latched: boolean;
  stage: 1 | 2; // twoStage only; 2 otherwise
  open: number;
  low: number;
  exitReason: ExitReason | '';
}

export interface EngineCounts {
  setupActivations: number;
  setupFills: number;
  armedAtEnd: number;
  pendingAtEnd: number;
  reboundSignals: number;
  overnightOrders: number;
  entriesWithoutTrade: number;
  losingExits: number;
  bufferedLossExits: number;
  protectiveStopExits: number;
  pendingBufferedExitAtEnd: boolean;
  activationsByKind: Record<SetupKind, number>;
  fillsByKind: Record<SetupKind, number>;
  upgrades: number; // always/swing setups re-armed as deep or continuation
  continuationWindows: number;
  continuationExpiries: number;
  stopNeverActiveTrades: number; // closed trades whose stop was never active
  stopSwitchOffSessions: number; // sessions on which an earlier-active stop was inactive (net policy)
}

export interface EngineResult {
  trades: Trade[];
  counts: EngineCounts;
  setups?: SetupRecord[];
  trace?: SessionTrace[];
  stopTrace?: StopTraceRow[];
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

const kindCounts = (): Record<SetupKind, number> => ({ deep: 0, continuation: 0, always: 0, swing: 0 });

// The lowest session low of the previous `lookback` sessions (never the session itself): the swing path's
// rolling low, computed like the strategy files' reference high. Infinity for the first session.
export const computeReferenceLows = (ds: Dataset, lookback: number) => {
  const lows = new Float64Array(ds.sessionCount).fill(NaN);
  const deque = new Int32Array(ds.sessionCount);
  let head = 0;
  let tail = 0;

  for (let s = 0; s < ds.sessionCount; s++) {
    while (head < tail && deque[head]! < s - lookback) {
      head++;
    }

    lows[s] = head < tail ? ds.sLow[deque[head]!]! : Infinity;

    while (head < tail && ds.sLow[deque[tail - 1]!]! >= ds.sLow[s]!) {
      tail--;
    }

    deque[tail++] = s;
  }

  return lows;
};

export class ReferenceLowCache {
  private readonly cache = new Map<number, Float64Array>();

  constructor(private readonly dataset: Dataset) {}

  get(lookback: number) {
    let lows = this.cache.get(lookback);

    if (!lows) {
      lows = computeReferenceLows(this.dataset, lookback);
      this.cache.set(lookback, lows);
    }

    return lows;
  }
}

// The exit side of one position: the daily stop level, the policy's eligibility state and the three exits, as
// file 4's evaluateBufferedSessionExit with the stop-eligibility test generalized. One evaluator serves one run;
// `onEntry` starts a position, `evaluate` decides the session's exit and `afterSession` raises the level.
export const createExitEvaluator = (
  ds: Dataset,
  params: Params,
  settings: Pick<RunSettings, 'stopFill' | 'marginInterestRate'>,
  policy: StopPolicy,
  stopTrace?: StopTraceRow[]
) => {
  const { trailingStopPercentage, maximumHoldDays, intradayLossBuffer, activationGain, earlyStop } = params;
  const { stopFill, marginInterestRate } = settings;
  const { sTime, sCloseTime, sOpen, sClosingPrint, sBarStart, sBarCount, bTime, bOpen, bLow, bClose, sHigh, sLow } = ds;

  if (policy === 'gross' && !(activationGain >= 0)) {
    throw new Error(`The gross policy needs an activation gain, got ${activationGain}`);
  }

  if (policy === 'twoStage' && !(earlyStop > 0 && earlyStop < 1)) {
    throw new Error(`The two-stage policy needs an early stop between 0 and 1, got ${earlyStop}`);
  }

  let open: Trade | undefined;
  let openIndex = -1;
  let postEntryHigh = 0;
  let stopPrice = 0;
  let latched = false;
  let wasActive = false;
  let pendingSignalTime = NaN;
  let pendingSignalPrice = NaN;

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

  // The daily update of the policy's latch, after the level has been raised. Monotone conditions, so the latch
  // is irreversible by construction; the 'netLatched' latch is set in `evaluate`, where the net test lives.
  const updateLatch = (s: number) => {
    if (!open || latched) {
      return;
    }

    if (
      (policy === 'gross' && postEntryHigh >= open.entryPrice * (1 + activationGain)) ||
      ((policy === 'breakeven' || policy === 'twoStage') && stopPrice >= open.entryPrice)
    ) {
      latched = true;
      open.stopLatchIndex = s;
    }
  };

  const onEntry = (trade: Trade, s: number, tradeIndex: number) => {
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    let high = Math.max(trade.entryPrice, ds.sClose[s]!);

    for (let k = trade.entryBar; k < count; k++) {
      high = Math.max(high, ds.bHigh[start + k]!);
    }

    open = trade;
    openIndex = tradeIndex;
    postEntryHigh = high;
    stopPrice = postEntryHigh * (1 - trailingStopPercentage);
    latched = false;
    wasActive = false;
    pendingSignalTime = NaN;
    pendingSignalPrice = NaN;
    updateLatch(s);
  };

  const afterSession = (s: number) => {
    if (!open) {
      return;
    }

    postEntryHigh = Math.max(postEntryHigh, sHigh[s]!);
    stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
    updateLatch(s);
  };

  const close = () => {
    open = undefined;
    openIndex = -1;
  };

  // The exit, if any, of the position open at the start of session s.
  const evaluate = (s: number): ExitDecision | undefined => {
    if (!open) {
      throw new Error('No position to evaluate');
    }

    const trade = open;
    const interest = trade.investment * marginInterestRate * ((sTime[s]! - trade.entryTimestamp) / secondsPerYear);
    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    const profitAt = (price: number) => trade.shares * price - trade.investment - interest;
    const profitAtStop = profitAt(stopPrice);
    let active: boolean;
    let effectiveStop = stopPrice;
    let stage: 1 | 2 = 2;

    switch (policy) {
      case 'net':
        active = profitAtStop > 0;
        break;
      case 'netLatched':
        active = latched || profitAtStop > 0;

        if (active && !latched) {
          latched = true;
          trade.stopLatchIndex = s;
        }

        break;
      case 'gross':
      case 'breakeven':
        active = latched;
        break;
      case 'twoStage':
        if (latched) {
          active = true;
        } else {
          stage = 1;
          active = true;
          effectiveStop = trade.entryPrice * (1 - earlyStop);
        }

        break;
      case 'always':
        active = true;
        break;
    }

    // The trailing stop's own activity (the protective stop of the EARLY stage doesn't count as the trailing stop).
    const trailingActive = active && stage === 2;

    if (trailingActive) {
      if (trade.stopFirstActiveIndex < 0) {
        trade.stopFirstActiveIndex = s;
      }

      trade.stopActiveSessions++;
      wasActive = true;
    } else if (wasActive) {
      trade.stopSwitchOffSessions++;
    }

    const stopReason: ExitReason = stage === 1 ? 'protective stop' : 'trailing stop';
    const gapReason: ExitReason = stage === 1 ? 'protective stop gap' : 'trailing stop gap';
    const daysHeld = (sTime[s]! - trade.entryTimestamp) / secondsPerDay;
    const isMaximumHoldDue = daysHeld >= maximumHoldDays && profitAt(sOpen[s]!) < 0;
    const pendingTime = pendingSignalTime;
    const pendingPrice = pendingSignalPrice;
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
    const traceRow: StopTraceRow | undefined = stopTrace
      ? {
          index: s,
          tradeIndex: openIndex,
          postEntryHigh,
          stopPrice,
          effectiveStop,
          interest,
          breakeven: (trade.investment + interest) / trade.shares,
          profitAtStop,
          active,
          latched,
          stage,
          open: sOpen[s]!,
          low: sLow[s]!,
          exitReason: ''
        }
      : undefined;
    const record = (exit: ExitDecision | undefined) => {
      if (traceRow) {
        traceRow.exitReason = exit?.reason ?? '';
        stopTrace!.push(traceRow);
      }

      return exit;
    };

    pendingSignalTime = NaN;
    pendingSignalPrice = NaN;

    // At the open: a resting stop gapped through takes the opening trade, even from a pending sale.
    if (active && sOpen[s]! <= effectiveStop) {
      return record(decision(gapReason, 0, 'opening trade', sOpen[s]!));
    }

    // A sale left pending by an earlier session fills at this session's opening trade, ahead of the maximum
    // hold, which is only decided on that trade.
    if (!Number.isNaN(pendingTime)) {
      const k = firstTradeAfterDecision(s, pendingTime);

      if (k >= 0) {
        return record({
          ...decision('buffered intraday loss', k, 'opening trade'),
          signalTime: pendingTime,
          signalPrice: pendingPrice
        });
      }
    }

    // Just after the open: the maximum hold sells at the next observed trade.
    if (isMaximumHoldDue) {
      const k = firstTradeFrom(s, bTime[start]! + secondsPerMinute);

      return record(k < 0 ? undefined : decision('maximum hold', k, tradeExecution(s, k)));
    }

    // During the session: the first minute that reaches an active stop.
    let stopExit: ExitDecision | undefined;
    let stopIndex = -1;

    if (active) {
      for (let k = 0; k < count; k++) {
        if (bOpen[start + k]! <= effectiveStop) {
          stopIndex = k;
          stopExit = decision(stopReason, k, 'minute open through stop', bOpen[start + k]!);
          break;
        }

        if (bLow[start + k]! <= effectiveStop) {
          stopIndex = k;

          if (stopFill === 'stop') {
            stopExit = decision(stopReason, k, 'stop level', effectiveStop);
          } else {
            const next = firstTradeFrom(s, bTime[start + k]! + secondsPerMinute);

            stopExit =
              next >= 0
                ? decision(stopReason, next, tradeExecution(s, next))
                : { ...decision(stopReason, k, 'trigger minute close', bClose[start + k]!), time: bTime[start + k]! };
          }

          break;
        }
      }
    }

    // The buffered loss once the maximum hold applies: the first completed minute whose close reaches it.
    if (daysHeld < maximumHoldDays) {
      return record(stopExit);
    }

    const threshold = -trade.investment * intradayLossBuffer;
    let signalBar = -1;

    for (let k = 0; k < count; k++) {
      if (profitAt(bClose[start + k]!) <= threshold) {
        signalBar = k;
        break;
      }
    }

    if (signalBar < 0) {
      return record(stopExit);
    }

    // The stop wins if it triggers in the signal minute or earlier, or at the same opening trade.
    if (
      stopExit &&
      stopIndex >= 0 &&
      (stopIndex <= signalBar || (stopIndex === signalBar + 1 && bOpen[start + stopIndex]! <= effectiveStop))
    ) {
      return record(stopExit);
    }

    const decisionTime = bTime[start + signalBar]! + secondsPerMinute;
    const k = firstTradeAfterDecision(s, decisionTime);

    if (k < 0) {
      pendingSignalTime = decisionTime;
      pendingSignalPrice = bClose[start + signalBar]!;

      return record(undefined);
    }

    return record({
      ...decision('buffered intraday loss', k, tradeExecution(s, k)),
      signalTime: decisionTime,
      signalPrice: bClose[start + signalBar]!
    });
  };

  return {
    onEntry,
    evaluate,
    afterSession,
    close,
    get stopPrice() {
      return stopPrice;
    },
    get hasPendingSignal() {
      return !Number.isNaN(pendingSignalTime);
    },
    firstTradeAfterDecision,
    priceAt,
    timeAt,
    tradeExecution
  };
};

export const newTrade = (
  fields: Partial<Trade> & Pick<Trade, 'entryIndex' | 'entryBar' | 'entryPrice' | 'investment'>
): Trade => ({
  setupId: 0,
  kind: 'deep',
  entryTime: NaN,
  entryExecution: 'first trade after decision',
  entryTimestamp: NaN,
  decisionTime: NaN,
  decisionPrice: NaN,
  signalIndex: -1,
  activationIndex: -1,
  activationTime: NaN,
  activationPrice: NaN,
  referenceHigh: NaN,
  anchorHigh: NaN,
  trailingLow: NaN,
  reboundTrigger: NaN,
  shares: fields.investment / fields.entryPrice,
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
  stopFirstActiveIndex: -1,
  stopActiveSessions: 0,
  stopSwitchOffSessions: 0,
  stopLatchIndex: -1,
  ...fields
});

const closeTrade = (trade: Trade, s: number, exit: ExitDecision, stopPrice: number) => {
  trade.exitIndex = s;
  trade.exitBar = exit.barIndex;
  trade.exitTime = exit.time;
  trade.exitPrice = exit.price;
  trade.exitExecution = exit.execution;
  trade.reason = exit.reason;
  trade.exitStopPrice = stopPrice;
  trade.maximumHoldDue = exit.isMaximumHoldDue;
  trade.bufferSignalTime = exit.signalTime;
  trade.bufferSignalPrice = exit.signalPrice;
};

// One position replayed from a given fill under a stop policy, with its stop trace: the Track B diagnostic of
// the exit side alone, independent of any entry mechanism.
export const replayPosition = (
  ds: Dataset,
  entry: { entryIndex: number; entryBar: number; entryPrice: number },
  params: Params,
  settings: Pick<RunSettings, 'stopFill' | 'marginInterestRate' | 'investment'> & { endIndex: number },
  policy: StopPolicy
) => {
  const stopTrace: StopTraceRow[] = [];
  const exits = createExitEvaluator(ds, params, settings, policy, stopTrace);
  const trade = newTrade({
    entryIndex: entry.entryIndex,
    entryBar: entry.entryBar,
    entryPrice: entry.entryPrice,
    entryTime: ds.bTime[ds.sBarStart[entry.entryIndex]! + entry.entryBar] ?? ds.sCloseTime[entry.entryIndex]!,
    entryTimestamp: ds.sTime[entry.entryIndex]!,
    investment: settings.investment
  });

  exits.onEntry(trade, entry.entryIndex, 0);

  for (let s = entry.entryIndex + 1; s <= settings.endIndex; s++) {
    const exit = exits.evaluate(s);

    if (exit) {
      closeTrade(trade, s, exit, exits.stopPrice);
      break;
    }

    exits.afterSession(s);
  }

  if (trade.exitIndex < 0) {
    trade.exitStopPrice = exits.stopPrice;
  }

  return { trade, stopTrace };
};

export const simulate = (
  ds: Dataset,
  referenceHighs: Float64Array,
  referenceLows: Float64Array | undefined,
  architecture: Architecture,
  params: Params,
  settings: RunSettings,
  detail = false
): EngineResult => {
  const { firstIndex, armStart, endIndex, investment } = settings;
  const {
    targetPercentChange,
    trailingBuyPercentage,
    pullback,
    continuationWindow,
    alwaysRebound,
    swingRebound,
    swingProximity
  } = params;
  const { entryMode, postExit, stopPolicy } = architecture;
  const deep = hasDeepPath(entryMode);
  const always = hasAlwaysPath(entryMode);
  const swing = hasSwingPath(entryMode);
  const { sTime, sClose, sLow, sHigh, sBarStart, sBarCount, sMinClose } = ds;
  const { bTime, bLow, bClose } = ds;

  if (firstIndex < 0 || endIndex >= ds.sessionCount || endIndex < firstIndex) {
    throw new Error(`Run ${firstIndex}..${endIndex} is outside the dataset`);
  }

  if (swing && !referenceLows) {
    throw new Error('The swing path needs the rolling lows');
  }

  if (postExit && !deep) {
    throw new Error('The continuation window needs the deep path');
  }

  const trades: Trade[] = [];
  const setups: SetupRecord[] | undefined = detail ? [] : undefined;
  const trace: SessionTrace[] | undefined = detail ? [] : undefined;
  const stopTrace: StopTraceRow[] | undefined = detail ? [] : undefined;
  const counts: EngineCounts = {
    setupActivations: 0,
    setupFills: 0,
    armedAtEnd: 0,
    pendingAtEnd: 0,
    reboundSignals: 0,
    overnightOrders: 0,
    entriesWithoutTrade: 0,
    losingExits: 0,
    bufferedLossExits: 0,
    protectiveStopExits: 0,
    pendingBufferedExitAtEnd: false,
    activationsByKind: kindCounts(),
    fillsByKind: kindCounts(),
    upgrades: 0,
    continuationWindows: 0,
    continuationExpiries: 0,
    stopNeverActiveTrades: 0,
    stopSwitchOffSessions: 0
  };
  const exits = createExitEvaluator(ds, params, settings, stopPolicy, stopTrace);

  // The open position.
  let position: Trade | undefined;

  // The setup: 0 none, 1 armed, 2 pending.
  let setupStatus = 0;
  let setupId = 0;
  let setupKind: SetupKind = 'deep';
  let setupActivationIndex = 0;
  let setupActivationTime = 0;
  let setupActivationPrice = 0;
  let setupReferenceHigh = 0;
  let setupAnchorHigh = 0;
  let setupTrailingLow = 0;
  let setupTrigger = 0;
  let signalIndex = 0;
  let signalTime = 0;
  let signalPrice = 0;
  let signalTrigger = 0;
  let signalTrailingLow = 0;
  let signalCarried = false;
  let setupRecord: SetupRecord | undefined;

  // The post-exit continuation window (postExit).
  let continuationActive = false;
  let continuationHigh = 0; // the exit price, then the highest session high after the exit session
  let continuationStart = -1;

  const reboundOf = (kind: SetupKind) =>
    kind === 'always' ? alwaysRebound : kind === 'swing' ? swingRebound : trailingBuyPercentage;

  const endSetup = (status: SetupRecord['status'], reason: string, index: number) => {
    if (setupRecord) {
      setupRecord.status = status;
      setupRecord.statusReason = reason;
      setupRecord.endIndex = index;
    }

    setupStatus = 0;
    setupRecord = undefined;
  };

  const setSetup = (
    kind: SetupKind,
    s: number,
    decisionTime: number,
    close: number,
    recentHigh: number,
    anchorHigh: number
  ) => {
    setupKind = kind;
    setupActivationIndex = s;
    setupActivationTime = decisionTime;
    setupActivationPrice = close;
    setupReferenceHigh = recentHigh;
    setupAnchorHigh = anchorHigh;
    setupTrailingLow = close;
    setupTrigger = close * (1 + reboundOf(kind));
    counts.activationsByKind[kind]++;

    // A D1 arming (deep or continuation) ends the continuation window: the window is for a flat strategy with
    // nothing in motion. An always/swing arming leaves it open, so D1's decisions are unchanged (C3).
    if (continuationActive && (kind === 'deep' || kind === 'continuation')) {
      continuationActive = false;
    }
  };

  const arm = (
    kind: SetupKind,
    s: number,
    decisionTime: number,
    close: number,
    recentHigh: number,
    anchorHigh: number
  ) => {
    setupStatus = 1;
    setupId++;
    signalCarried = false;
    counts.setupActivations++;
    setSetup(kind, s, decisionTime, close, recentHigh, anchorHigh);

    if (setups) {
      setupRecord = {
        id: setupId,
        kind,
        status: 'armed',
        statusReason: '',
        activationIndex: s,
        activationTime: decisionTime,
        activationPrice: close,
        referenceHigh: recentHigh,
        anchorHigh,
        trailingLow: close,
        signalIndex: -1,
        signalTime: NaN,
        signalPrice: NaN,
        carriedOvernight: false,
        fillIndex: -1,
        fillTime: NaN,
        fillPrice: NaN,
        endIndex: -1,
        upgradedFrom: ''
      };
      setups.push(setupRecord);
    }
  };

  // An armed always/swing setup is re-armed as a D1 setup at this close, as D1 alone would have armed.
  const upgrade = (
    kind: SetupKind,
    s: number,
    decisionTime: number,
    close: number,
    recentHigh: number,
    anchorHigh: number
  ) => {
    const from = setupKind;

    counts.upgrades++;
    setSetup(kind, s, decisionTime, close, recentHigh, anchorHigh);

    if (setupRecord) {
      setupRecord.kind = kind;
      setupRecord.statusReason = 'upgraded';
      setupRecord.upgradedFrom = from;
      setupRecord.activationIndex = s;
      setupRecord.activationTime = decisionTime;
      setupRecord.activationPrice = close;
      setupRecord.referenceHigh = recentHigh;
      setupRecord.anchorHigh = anchorHigh;
    }
  };

  const continuationOpen = (s: number) =>
    postExit && continuationActive && s > continuationStart && s - continuationStart <= continuationWindow;

  for (let s = firstIndex; s <= endIndex; s++) {
    const recentHigh = deep ? referenceHighs[s]! : NaN;
    const xLevel = deep ? recentHigh * (1 - targetPercentChange) : NaN;
    const rollingLow = swing ? referenceLows![s]! : NaN;
    const swingLevel = swing ? rollingLow * (1 + swingProximity) : NaN;

    if (s === firstIndex) {
      trace?.push({
        index: s,
        recentHigh,
        xLevel,
        rollingLow,
        close: sClose[s]!,
        low: sLow[s]!,
        minClose: sMinClose[s]!,
        entryState: 'FLAT',
        setupKind: '',
        trailingLow: NaN,
        reboundTrigger: NaN,
        continuationActive: false,
        continuationHigh: NaN,
        continuationStart: -1
      });
      continue;
    }

    const start = sBarStart[s]!;
    const count = sBarCount[s]!;
    const isDip = (price: number) => deep && 1 - price / recentHigh >= targetPercentChange;
    const continuationArms = (price: number) => continuationOpen(s) && price <= continuationHigh * (1 - pullback);
    const swingArms = (price: number) => swing && price <= swingLevel;
    const openAtStart = position;
    let fillBar = -1;
    let fillExecution: ExecutionPrice = 'first trade after decision';

    // Entries: only on sessions that start flat.
    if (!openAtStart) {
      if (setupStatus === 2) {
        const k = exits.firstTradeAfterDecision(s, signalTime);

        if (k >= 0) {
          fillBar = k;
          fillExecution = k === 0 ? 'opening trade' : exits.tradeExecution(s, k);
        }
      } else {
        // Whether any minute of this session could arm, from the session's lowest close, so that sessions with no
        // setup and nothing to arm are skipped.
        const eligible = s >= armStart;
        const couldArm =
          eligible && (always || isDip(sMinClose[s]!) || continuationArms(sMinClose[s]!) || swingArms(sMinClose[s]!));

        if (setupStatus === 1 || couldArm) {
          for (let k = 0; k < count; k++) {
            const close = bClose[start + k]!;
            const decisionTime = bTime[start + k]! + secondsPerMinute;

            if (setupStatus === 0) {
              if (!eligible) {
                continue;
              }

              // D1's paths first (deep, then continuation), then the extra path.
              if (isDip(close)) {
                arm('deep', s, decisionTime, close, recentHigh, recentHigh);
              } else if (continuationArms(close)) {
                arm('continuation', s, decisionTime, close, recentHigh, continuationHigh);
              } else if (always) {
                arm('always', s, decisionTime, close, recentHigh, close);
              } else if (swingArms(close)) {
                arm('swing', s, decisionTime, close, recentHigh, rollingLow);
              }

              // The arming minute never buys.
              continue;
            }

            // An armed always/swing setup yields to D1's paths on the minute they would arm.
            if ((setupKind as SetupKind) === 'always' || (setupKind as SetupKind) === 'swing') {
              if (isDip(close)) {
                upgrade('deep', s, decisionTime, close, recentHigh, recentHigh);
                continue;
              }

              if (continuationArms(close)) {
                upgrade('continuation', s, decisionTime, close, recentHigh, continuationHigh);
                continue;
              }
            }

            // Armed: the completed minute lowers the trailing low, then its close is tested against the rebound
            // trigger from that low.
            const low = bLow[start + k]!;

            if (low < setupTrailingLow) {
              setupTrailingLow = low;
            }

            setupTrigger = setupTrailingLow * (1 + reboundOf(setupKind));

            if (close < setupTrigger) {
              continue;
            }

            setupStatus = 2;
            signalIndex = s;
            signalTime = decisionTime;
            signalPrice = close;
            signalTrigger = setupTrigger;
            signalTrailingLow = setupTrailingLow;
            counts.reboundSignals++;

            const fill = exits.firstTradeAfterDecision(s, decisionTime);

            if (fill >= 0) {
              fillBar = fill;
              fillExecution = exits.tradeExecution(s, fill);
            }

            break;
          }
        }
      }

      if (setupRecord) {
        setupRecord.trailingLow = setupTrailingLow;

        if (setupStatus === 2) {
          setupRecord.status = 'pending';
          setupRecord.signalIndex = signalIndex;
          setupRecord.signalTime = signalTime;
          setupRecord.signalPrice = signalPrice;
        }
      }

      if (fillBar >= 0 && setupStatus === 2) {
        const price = exits.priceAt(s, fillBar);
        const trade = newTrade({
          setupId,
          kind: setupKind,
          entryIndex: s,
          entryBar: fillBar,
          entryTime: exits.timeAt(s, fillBar),
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
          anchorHigh: setupAnchorHigh,
          trailingLow: signalTrailingLow,
          reboundTrigger: signalTrigger,
          investment,
          shares: investment / price
        });

        trades.push(trade);
        position = trade;
        counts.setupFills++;
        counts.fillsByKind[setupKind]++;

        if (setupRecord) {
          setupRecord.fillIndex = s;
          setupRecord.fillTime = trade.entryTime;
          setupRecord.fillPrice = price;
          setupRecord.carriedOvernight = signalCarried;
        }

        endSetup('filled', 'filled', s);
        exits.onEntry(trade, s, trades.length - 1);
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
      const exit = exits.evaluate(s);

      if (exit) {
        const interest =
          openAtStart.investment *
          settings.marginInterestRate *
          ((sTime[s]! - openAtStart.entryTimestamp) / secondsPerYear);
        const profit = openAtStart.shares * exit.price - openAtStart.investment - interest;

        closeTrade(openAtStart, s, exit, exits.stopPrice);
        exits.close();
        position = undefined;

        if (exit.reason === 'buffered intraday loss') {
          counts.bufferedLossExits++;
        }

        if (exit.reason === 'protective stop' || exit.reason === 'protective stop gap') {
          counts.protectiveStopExits++;
        }

        if (profit < 0) {
          counts.losingExits++;
        }

        if (openAtStart.stopFirstActiveIndex < 0) {
          counts.stopNeverActiveTrades++;
        }

        counts.stopSwitchOffSessions += openAtStart.stopSwitchOffSessions;

        // A profitable exit opens the continuation window from the exit price.
        if (postExit && profit > 0) {
          continuationActive = true;
          continuationHigh = exit.price;
          continuationStart = s;
          counts.continuationWindows++;
        }
      } else {
        exits.afterSession(s);
      }
    }

    // End of the session: the continuation window's high and expiry.
    if (continuationActive) {
      if (s > continuationStart) {
        continuationHigh = Math.max(continuationHigh, sHigh[s]!);
      }

      if (s - continuationStart >= continuationWindow) {
        continuationActive = false;
        counts.continuationExpiries++;
      }
    }

    trace?.push({
      index: s,
      recentHigh,
      xLevel,
      rollingLow,
      close: sClose[s]!,
      low: sLow[s]!,
      minClose: sMinClose[s]!,
      entryState: position ? 'LONG' : setupStatus === 0 ? 'FLAT' : setupStatus === 2 ? 'PENDING_FILL' : 'ARMED',
      setupKind: setupStatus === 0 ? '' : setupKind,
      trailingLow: setupStatus === 0 ? NaN : setupTrailingLow,
      reboundTrigger: setupStatus === 0 ? NaN : setupTrigger,
      continuationActive,
      continuationHigh: continuationActive ? continuationHigh : NaN,
      continuationStart: continuationActive ? continuationStart : -1
    });
  }

  if (position) {
    position.exitStopPrice = exits.stopPrice;
    counts.stopSwitchOffSessions += position.stopSwitchOffSessions;
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

  counts.pendingBufferedExitAtEnd = Boolean(position) && exits.hasPendingSignal;

  return { trades, counts, setups, trace, stopTrace };
};
