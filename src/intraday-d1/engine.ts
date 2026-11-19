// The Intraday D1 engine (research/intraday-d1-vgt/audit/RULE_PARITY_DESIGN.md): the canonical D1 file
// (src/app/allIn-trailingBuy-postExitContinuation.ts) statement for statement, with its session replaced by a period
// of the clock (src/intraday-d1/periods.ts), and Study 8's execution convention (src/multi-etf-allocator/shadow.ts:
// cost per side in the entry price, so `shares` and every D1 net test see it; exit cost and stop slippage on the sale;
// continuation opened by a trade whose net after interest and costs is positive). With the `session` clock, costs 0
// and no arming date, it is D1 (parity test P1).
//
// Per period i (D1 lines in brackets):
//   reference high = max high of the previous Lp periods, fixed for the period              [743-746]
//   ENTRY PASS only if flat at the period's start                                           [788]
//     a pending order fills at the period's first trade                                     [789-793]
//     else each completed minute: arm (deep first, then continuation) on its close; the arming minute never buys;
//     then the trailing low takes the minute's low and its close is tested against low × (1 + Y)   [795-909]
//     fill at the next observed trade; the closing print only in the session's last period and only for a decision
//     before the close; else carried to the next period                                     [900, 970-976]
//   EXIT PASS only if long at the period's start                                            [984]
//     stop active iff shares × stop − investment − interest > 0, decided before the period  [199]
//     gap through an active stop → the period's opening trade; then the maximum hold (held ≥ H and losing at the
//     open) at the next trade after the first minute; then the intraday stop; after the hold, the buffered loss
//     with its stop precedence and carry                                                     [206-358]
//     no exit: raise the post-entry high and the stop (never lowered)                       [1080-1084]
//   marks at every minute's close (and the official close in the session's last period)    [1087-1108]
//   continuation window: high and expiry at the period's end                               [1110-1120]
import type { Clock, Market } from './periods.ts';

const secondsPerMinute = 60;
const secondsPerYear = 365 * 24 * 60 * 60;

export type StopFill = 'stop' | 'next-open' | 'minute-low'; // 'minute-low' is a report-only worst-case bound

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap' | 'buffered intraday loss';

export type Execution =
  | 'first trade after decision'
  | 'closing print'
  | 'opening trade'
  | 'stop level'
  | 'minute open through stop'
  | 'trigger minute close'
  | 'trigger minute low';

export interface EngineParams {
  targetPercentChange: number; // X
  trailingBuyPercentage: number; // Y
  trailingStopPercentage: number;
  holdSeconds: number; // on the clock's t (calendar seconds for the session clock, trading seconds otherwise)
  lookbackPeriods: number; // Lp
  intradayLossBuffer: number;
  pullback: number; // P
  continuationPeriods: number; // Wp
}

export interface ExecutionSettings {
  principal: number;
  rate: number;
  costBps: number;
  stopFill: StopFill;
  stopSlippageBps: number;
}

export interface RunWindow {
  armFromSession: number; // no arming before this session (Study 8's common arming date); 0 for D1 parity
  endSession: number; // the last session of the run (inclusive)
}

export interface Lot {
  id: number;
  setupKind: 'deep' | 'continuation';
  activationTime: number; // end of the arming minute
  activationPrice: number;
  referenceHigh: number;
  anchorHigh: number;
  decisionTime: number;
  decisionPrice: number;
  trigger: number;
  trailingLow: number;
  trailingLowTime: number;
  carried: boolean;
  signalPeriod: number;
  entryPeriod: number;
  entrySession: number;
  entryTime: number; // the fill's minute (or the close for the closing print)
  entryRaw: number;
  entryPrice: number; // after cost
  entryExecution: Execution;
  shares: number;
  investment: number;
  open: boolean;
  exitPeriod: number;
  exitSession: number;
  exitTime: number;
  exitRaw: number;
  exitPrice: number; // after cost and stop slippage
  exitReason: ExitReason | '';
  exitExecution: Execution | '';
  stopAtExit: number;
  stopActiveAtExit: boolean;
  maximumHoldDue: boolean;
  bufferSignalTime: number;
  interest: number;
  gross: number; // after costs, before interest
  net: number; // after costs and interest
  costs: number; // entry and exit cost (incl. stop slippage)
  slippage: number; // stop slippage part
  mae: number; // lowest price while held ÷ raw entry − 1
  mfe: number; // highest price while held ÷ raw entry − 1
  stopFirstActivePeriod: number;
  stopActivePeriods: number;
  heldPeriods: number;
}

export interface Drawdown {
  maximum: number;
  peakTime: number;
  troughTime: number;
}

export interface RunResult {
  lots: Lot[];
  realized: number;
  unrealized: number;
  net: number;
  interest: number;
  costs: number;
  minuteDrawdown: Drawdown;
  dailyDrawdown: Drawdown;
  dailyMarks: Float64Array; // marked profit at each session's close (NaN outside the run)
  setups: number;
  setupsAtEnd: '' | 'armed' | 'pending';
  pendingBufferedAtEnd: boolean;
  lastPeriod: number;
  marks?: { time: Float64Array; value: Float64Array; count: number }; // with `trace.marks`: every minute mark
}

export interface TraceOptions {
  marks?: boolean; // keep every minute-sampled mark (reports only; never used by the search)
}

interface Fill {
  price: number;
  time: number;
  bar: number; // global bar index, or the period's barEnd for the closing print
  execution: Execution;
}

interface ExitDecision extends Fill {
  reason: ExitReason;
  isMaximumHoldDue: boolean;
  stopActive: boolean;
  signalTime: number;
}

interface BufferedSignal {
  decisionTime: number;
}

interface Setup {
  kind: 'deep' | 'continuation';
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  anchorHigh: number;
  trailingLow: number;
  trailingLowTime: number;
  trigger: number;
  pending: boolean;
  carried: boolean;
  decisionTime: number;
  decisionPrice: number;
  signalPeriod: number;
}

interface Position {
  lot: Lot;
  entrySessionTime: number;
  entryT: number;
  postEntryHigh: number;
  postEntryLow: number;
  stopPrice: number;
}

const tracker = (start: number) => {
  const state = { peak: 0, peakTime: start, maximum: 0, ddPeak: start, ddTrough: start };

  return {
    state,
    update(value: number, time: number) {
      if (value > state.peak) {
        state.peak = value;
        state.peakTime = time;
      }

      if (state.peak - value > state.maximum) {
        state.maximum = state.peak - value;
        state.ddPeak = state.peakTime;
        state.ddTrough = time;
      }
    },
    result(): Drawdown {
      return { maximum: state.maximum, peakTime: state.ddPeak, troughTime: state.ddTrough };
    }
  };
};

// Per-period lowest minute close and lowest minute low (closing print excluded): monotone fast paths only.
const extremes = new WeakMap<Clock, { minClose: Float64Array; minBarLow: Float64Array }>();

const extremesOf = (market: Market, clock: Clock) => {
  let cached = extremes.get(clock);

  if (!cached) {
    const minClose = new Float64Array(clock.count);
    const minBarLow = new Float64Array(clock.count);

    for (let p = 0; p < clock.count; p++) {
      let c = Infinity;
      let l = Infinity;

      for (let b = clock.barStart[p]!; b < clock.barEnd[p]!; b++) {
        if (market.bars.close[b]! < c) c = market.bars.close[b]!;
        // min(open, low): the stop loop triggers on either, so this stays exact even for an inconsistent bar
        l = Math.min(l, market.bars.low[b]!, market.bars.open[b]!);
      }

      minClose[p] = c;
      minBarLow[p] = l;
    }

    cached = { minClose, minBarLow };
    extremes.set(clock, cached);
  }

  return cached;
};

export const lastPeriodOf = (clock: Clock, endSession: number) => {
  let lo = 0;
  let hi = clock.count - 1;

  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;

    if (clock.session[mid]! <= endSession) lo = mid;
    else hi = mid - 1;
  }

  return lo;
};

export const simulate = (
  market: Market,
  clock: Clock,
  params: EngineParams,
  settings: ExecutionSettings,
  window: RunWindow,
  trace: TraceOptions = {}
): RunResult => {
  const { bars, sessions } = market;
  const { time, open, high, low, close } = bars;
  const X = params.targetPercentChange;
  const Y = params.trailingBuyPercentage;
  const stopPct = params.trailingStopPercentage;
  const hold = params.holdSeconds;
  const Lp = params.lookbackPeriods;
  const buffer = params.intradayLossBuffer;
  const P = params.pullback;
  const Wp = params.continuationPeriods;
  const N = settings.principal;
  const costIn = 1 + settings.costBps / 10000;
  const costOut = 1 - settings.costBps / 10000;
  const slip = 1 - settings.stopSlippageBps / 10000;
  const { minClose, minBarLow } = extremesOf(market, clock);

  if (!(Lp >= 1) || !(Wp >= 1) || !Number.isInteger(Lp) || !Number.isInteger(Wp)) {
    throw new Error(`lookback ${Lp} and continuation ${Wp} must be whole numbers of periods ≥ 1`);
  }

  const lastPeriod = lastPeriodOf(clock, window.endSession);
  const dailyMarks = new Float64Array(sessions.count).fill(NaN);
  const minuteDd = tracker(sessions.time[0] ?? 0);
  const markTimes = trace.marks ? new Float64Array(bars.count + sessions.count + clock.count) : undefined;
  const markValues = trace.marks ? new Float64Array(bars.count + sessions.count + clock.count) : undefined;
  let markCount = 0;
  const mark = (value: number, t: number) => {
    minuteDd.update(value, t);

    if (markTimes) {
      markTimes[markCount] = t;
      markValues![markCount++] = value;
    }
  };
  const dailyDd = tracker(sessions.time[0] ?? 0);
  const lots: Lot[] = [];
  const deque = new Int32Array(clock.count);
  let dqHead = 0;
  let dqTail = 0;
  let setup: Setup | undefined;
  let position: Position | undefined;
  let pendingBuffered: BufferedSignal | undefined;
  let continuationActive = false;
  let continuationHigh = 0;
  let continuationStart = -1;
  let realized = 0;
  let setupCount = 0;

  // D1's (and Study 8's interestOn) formula and operation order: investment × rate × (calendar seconds ÷ year).
  const interestAt = (pos: Position, s: number) =>
    N * settings.rate * ((sessions.time[s]! - pos.entrySessionTime) / secondsPerYear);

  const firstTradeFrom = (i: number, t: number): Fill | undefined => {
    for (let b = clock.barStart[i]!; b < clock.barEnd[i]!; b++) {
      if (time[b]! >= t) return { price: open[b]!, time: time[b]!, bar: b, execution: 'first trade after decision' };
    }

    const print = clock.closingPrint[i]!;

    return Number.isNaN(print)
      ? undefined
      : { price: print, time: clock.closeTime[i]!, bar: clock.barEnd[i]!, execution: 'closing print' };
  };

  const firstTradeAfterDecision = (i: number, decisionTime: number) => {
    const fill = firstTradeFrom(i, decisionTime);

    return fill?.execution === 'closing print' && decisionTime >= clock.closeTime[i]! ? undefined : fill;
  };

  // evaluateSessionExit, per period.
  const evaluateExit = (i: number, pos: Position, interest: number): ExitDecision | undefined => {
    const shares = pos.lot.shares;
    const stop = pos.stopPrice;
    const isStopActive = shares * stop - N - interest > 0;
    const held = clock.t[i]! - pos.entryT;
    const isMaximumHoldDue = held >= hold && shares * clock.open[i]! - N - interest < 0;
    const b0 = clock.barStart[i]!;

    if (isStopActive && clock.open[i]! <= stop) {
      return {
        reason: 'trailing stop gap',
        price: clock.open[i]!,
        time: time[b0]!,
        bar: b0,
        execution: 'opening trade',
        isMaximumHoldDue,
        stopActive: true,
        signalTime: NaN
      };
    }

    if (isMaximumHoldDue) {
      const fill = firstTradeFrom(i, time[b0]! + secondsPerMinute);

      return fill && { ...fill, reason: 'maximum hold', isMaximumHoldDue, stopActive: isStopActive, signalTime: NaN };
    }

    if (!isStopActive || minBarLow[i]! > stop) {
      return undefined;
    }

    for (let b = b0; b < clock.barEnd[i]!; b++) {
      if (open[b]! <= stop) {
        return {
          reason: 'trailing stop',
          price: open[b]!,
          time: time[b]!,
          bar: b,
          execution: 'minute open through stop',
          isMaximumHoldDue,
          stopActive: true,
          signalTime: NaN
        };
      }

      if (low[b]! <= stop) {
        const trigger = { reason: 'trailing stop' as const, isMaximumHoldDue, stopActive: true, signalTime: NaN };

        if (settings.stopFill === 'stop') {
          return { ...trigger, price: stop, time: time[b]!, bar: b, execution: 'stop level' };
        }

        if (settings.stopFill === 'minute-low') {
          return { ...trigger, price: low[b]!, time: time[b]!, bar: b, execution: 'trigger minute low' };
        }

        const fill = firstTradeFrom(i, time[b]! + secondsPerMinute);

        return fill
          ? { ...trigger, ...fill }
          : { ...trigger, price: close[b]!, time: time[b]!, bar: b, execution: 'trigger minute close' };
      }
    }

    return undefined;
  };

  // evaluateBufferedSessionExit, per period.
  const evaluateBuffered = (
    i: number,
    pos: Position,
    interest: number,
    pendingSignal: BufferedSignal | undefined
  ): { exit?: ExitDecision; pendingSignal?: BufferedSignal } => {
    const exit = evaluateExit(i, pos, interest);
    const shares = pos.lot.shares;
    const stop = pos.stopPrice;
    const isStopActive = shares * stop - N - interest > 0;
    const held = clock.t[i]! - pos.entryT;
    const isMaximumHoldDue = held >= hold && shares * clock.open[i]! - N - interest < 0;
    const threshold = -N * buffer;

    if (exit?.reason === 'trailing stop gap') {
      return { exit };
    }

    if (pendingSignal) {
      const fill = firstTradeAfterDecision(i, pendingSignal.decisionTime);

      if (fill) {
        return {
          exit: {
            ...fill,
            execution: 'opening trade',
            reason: 'buffered intraday loss',
            isMaximumHoldDue,
            stopActive: isStopActive,
            signalTime: pendingSignal.decisionTime
          }
        };
      }
    }

    if (held < hold || isMaximumHoldDue) {
      return { exit };
    }

    const b0 = clock.barStart[i]!;
    const b1 = clock.barEnd[i]!;
    let signalBar = -1;

    for (let b = b0; b < b1; b++) {
      if (shares * close[b]! - N - interest <= threshold) {
        signalBar = b;
        break;
      }
    }

    if (signalBar < 0) {
      return { exit };
    }

    let stopBar = -1;

    if (isStopActive) {
      for (let b = b0; b < b1; b++) {
        if (open[b]! <= stop || low[b]! <= stop) {
          stopBar = b;
          break;
        }
      }
    }

    if (exit && stopBar >= 0 && (stopBar <= signalBar || (stopBar === signalBar + 1 && open[stopBar]! <= stop))) {
      return { exit };
    }

    const signal = { decisionTime: time[signalBar]! + secondsPerMinute };
    const fill = firstTradeAfterDecision(i, signal.decisionTime);

    return fill
      ? {
          exit: {
            ...fill,
            reason: 'buffered intraday loss',
            isMaximumHoldDue,
            stopActive: isStopActive,
            signalTime: signal.decisionTime
          }
        }
      : { pendingSignal: signal };
  };

  for (let i = 0; i <= lastPeriod; i++) {
    // The reference high over the previous Lp periods (a monotone deque of period indexes).
    if (i > 0) {
      const h = clock.high[i - 1]!;

      while (dqTail > dqHead && clock.high[deque[dqTail - 1]!]! <= h) dqTail--;
      deque[dqTail++] = i - 1;

      while (deque[dqHead]! < i - Lp) dqHead++;
    }

    const recentHigh = i > 0 ? clock.high[deque[dqHead]!]! : -Infinity;
    const s = clock.session[i]!;
    const b0 = clock.barStart[i]!;
    const b1 = clock.barEnd[i]!;
    const isLast = clock.isLast[i] === 1;

    if (i === 0) {
      // D1 skips its first history session entirely.
      if (isLast) dailyMarks[s] = 0;
      continue;
    }

    const openAtStart = position;
    const realizedAtStart = realized;
    let entered: Position | undefined;
    let fill: Fill | undefined;
    let exit: ExitDecision | undefined;

    if (!openAtStart) {
      if (setup?.pending) {
        const opening = firstTradeAfterDecision(i, setup.decisionTime);

        fill = opening && { ...opening, execution: opening.bar === b0 ? 'opening trade' : opening.execution };
      } else {
        let b = b0;

        // Fast path: a flat period without a setup can arm only if its lowest minute close passes a test (both tests
        // are monotone in the close), so the minute loop is skipped exactly when no minute could arm.
        if (!setup) {
          const armable =
            i >= Lp &&
            s >= window.armFromSession &&
            (1 - minClose[i]! / recentHigh >= X ||
              (continuationActive &&
                i > continuationStart &&
                i - continuationStart <= Wp &&
                minClose[i]! <= continuationHigh * (1 - P)));

          if (!armable) b = b1;
        }

        for (; b < b1; b++) {
          const decisionTime = time[b]! + secondsPerMinute;

          if (!setup) {
            if (i < Lp || s < window.armFromSession) continue;

            let kind: 'deep' | 'continuation' | undefined;
            let anchorHigh = recentHigh;

            if (1 - close[b]! / recentHigh >= X) {
              kind = 'deep';
            } else if (
              continuationActive &&
              i > continuationStart &&
              i - continuationStart <= Wp &&
              close[b]! <= continuationHigh * (1 - P)
            ) {
              kind = 'continuation';
              anchorHigh = continuationHigh;
            }

            if (!kind) continue;

            setup = {
              kind,
              activationTime: decisionTime,
              activationPrice: close[b]!,
              referenceHigh: recentHigh,
              anchorHigh,
              trailingLow: close[b]!,
              trailingLowTime: time[b]!,
              trigger: close[b]! * (1 + Y),
              pending: false,
              carried: false,
              decisionTime: NaN,
              decisionPrice: NaN,
              signalPeriod: -1
            };
            setupCount++;
            continuationActive = false;
            continue;
          }

          if (low[b]! < setup.trailingLow) {
            setup.trailingLow = low[b]!;
            setup.trailingLowTime = time[b]!;
          }

          setup.trigger = setup.trailingLow * (1 + Y);

          if (close[b]! < setup.trigger) continue;

          setup.pending = true;
          setup.decisionTime = decisionTime;
          setup.decisionPrice = close[b]!;
          setup.signalPeriod = i;
          fill = firstTradeAfterDecision(i, decisionTime);

          if (b < b1 - 1 && !fill) {
            throw new Error(`no fill for a decision at ${decisionTime} despite later minutes`);
          }

          break;
        }
      }

      if (fill && setup?.pending) {
        const raw = fill.price;
        const entryPrice = raw * costIn;
        const shares = N / entryPrice;
        let postEntryHigh = Math.max(raw, clock.close[i]!);
        let postEntryLow = Math.min(raw, clock.close[i]!);

        for (let k = fill.bar; k < b1; k++) {
          if (high[k]! > postEntryHigh) postEntryHigh = high[k]!;
          if (low[k]! < postEntryLow) postEntryLow = low[k]!;
        }

        const lot: Lot = {
          id: lots.length + 1,
          setupKind: setup.kind,
          activationTime: setup.activationTime,
          activationPrice: setup.activationPrice,
          referenceHigh: setup.referenceHigh,
          anchorHigh: setup.anchorHigh,
          decisionTime: setup.decisionTime,
          decisionPrice: setup.decisionPrice,
          trigger: setup.trigger,
          trailingLow: setup.trailingLow,
          trailingLowTime: setup.trailingLowTime,
          carried: setup.carried,
          signalPeriod: setup.signalPeriod,
          entryPeriod: i,
          entrySession: s,
          entryTime: fill.time,
          entryRaw: raw,
          entryPrice,
          entryExecution: fill.execution,
          shares,
          investment: N,
          open: true,
          exitPeriod: -1,
          exitSession: -1,
          exitTime: NaN,
          exitRaw: NaN,
          exitPrice: NaN,
          exitReason: '',
          exitExecution: '',
          stopAtExit: NaN,
          stopActiveAtExit: false,
          maximumHoldDue: false,
          bufferSignalTime: NaN,
          interest: 0,
          gross: 0,
          net: 0,
          costs: shares * (entryPrice - raw),
          slippage: 0,
          mae: 0,
          mfe: 0,
          stopFirstActivePeriod: -1,
          stopActivePeriods: 0,
          heldPeriods: 0
        };

        lots.push(lot);
        entered = {
          lot,
          entrySessionTime: sessions.time[s]!,
          entryT: clock.t[i]!,
          postEntryHigh,
          postEntryLow,
          stopPrice: postEntryHigh * (1 - stopPct)
        };
        position = entered;
        setup = undefined;
      } else if (setup?.pending && !setup.carried) {
        setup.carried = true;
      }
    }

    if (openAtStart) {
      const pos = openAtStart;
      const lot = pos.lot;
      const interest = interestAt(pos, s);
      const outcome = evaluateBuffered(i, pos, interest, pendingBuffered);
      const active = lot.shares * pos.stopPrice - N - interest > 0;

      lot.heldPeriods++;

      if (active) {
        lot.stopActivePeriods++;
        if (lot.stopFirstActivePeriod < 0) lot.stopFirstActivePeriod = i;
      }

      exit = outcome.exit;
      pendingBuffered = outcome.pendingSignal;

      if (exit) {
        const isStop = exit.reason === 'trailing stop' || exit.reason === 'trailing stop gap';
        const afterCost = exit.price * costOut;
        const price = afterCost * (isStop ? slip : 1);
        const proceeds = lot.shares * price;
        let lowest = Math.min(pos.postEntryLow, exit.price);
        let highest = Math.max(pos.postEntryHigh, exit.price);

        for (let k = b0; k < exit.bar && k < b1; k++) {
          if (low[k]! < lowest) lowest = low[k]!;
          if (high[k]! > highest) highest = high[k]!;
        }

        lot.open = false;
        lot.exitPeriod = i;
        lot.exitSession = s;
        lot.exitTime = exit.time;
        lot.exitRaw = exit.price;
        lot.exitPrice = price;
        lot.exitReason = exit.reason;
        lot.exitExecution = exit.execution;
        lot.stopAtExit = pos.stopPrice;
        lot.stopActiveAtExit = exit.stopActive;
        lot.maximumHoldDue = exit.isMaximumHoldDue;
        lot.bufferSignalTime = exit.signalTime;
        lot.interest = interest;
        lot.gross = proceeds - N;
        lot.net = proceeds - N - interest;
        lot.costs += lot.shares * (exit.price - price);
        lot.slippage = lot.shares * (afterCost - price);
        lot.mae = lowest / lot.entryRaw - 1;
        lot.mfe = highest / lot.entryRaw - 1;
        realized += lot.net;
        position = undefined;

        if (lot.net > 0) {
          continuationActive = true;
          continuationHigh = exit.price;
          continuationStart = i;
        }
      } else {
        pos.postEntryHigh = Math.max(pos.postEntryHigh, clock.high[i]!);
        pos.stopPrice = Math.max(pos.stopPrice, pos.postEntryHigh * (1 - stopPct));
        pos.postEntryLow = Math.min(pos.postEntryLow, clock.low[i]!);
      }
    }

    // Minute-sampled marks: each minute's close, then the official close in the session's last period. The position
    // counts from its fill's minute until its exit's minute.
    const held = openAtStart ?? entered;

    if (held) {
      const heldFrom = openAtStart ? b0 : fill!.bar;
      const heldUntil = exit ? exit.bar : Infinity;
      const interest = interestAt(held, s);
      const shares = held.lot.shares;

      for (let b = b0; b < b1; b++) {
        const isHeld = b >= heldFrom && b < heldUntil;
        const base = b >= heldUntil ? realized : realizedAtStart;

        mark(base + (isHeld ? shares * close[b]! - N - interest : 0), time[b]!);
      }

      if (isLast) {
        const isHeld = b1 >= heldFrom && b1 < heldUntil;
        const base = b1 >= heldUntil ? realized : realizedAtStart;

        mark(base + (isHeld ? shares * clock.close[i]! - N - interest : 0), clock.closeTime[i]!);
      }
    } else {
      // Nothing held: every mark of the period equals the realized profit.
      mark(realized, time[b0]!);
    }

    if (isLast) {
      const mark = realized + (position ? position.lot.shares * clock.close[i]! - N - interestAt(position, s) : 0);

      dailyDd.update(mark, sessions.time[s]!);
      dailyMarks[s] = mark;
    }

    if (continuationActive) {
      if (i > continuationStart) {
        continuationHigh = Math.max(continuationHigh, clock.high[i]!);
      }

      if (i - continuationStart >= Wp) {
        continuationActive = false;
      }
    }
  }

  let unrealized = 0;
  let accrued = 0;

  if (position) {
    const s = clock.session[lastPeriod]!;
    const lot = position.lot;

    accrued = interestAt(position, s);
    unrealized = lot.shares * clock.close[lastPeriod]! - N - accrued;
    lot.interest = accrued;
    lot.gross = lot.shares * clock.close[lastPeriod]! - N;
    lot.net = unrealized;
    lot.exitRaw = clock.close[lastPeriod]!;
    lot.stopAtExit = position.stopPrice;
    lot.mae = Math.min(position.postEntryLow, clock.close[lastPeriod]!) / lot.entryRaw - 1;
    lot.mfe = position.postEntryHigh / lot.entryRaw - 1;
  }

  const interest = lots.reduce((total, lot) => total + lot.interest, 0);
  const costs = lots.reduce((total, lot) => total + lot.costs, 0);

  return {
    lots,
    realized,
    unrealized,
    net: realized + unrealized,
    interest,
    costs,
    minuteDrawdown: minuteDd.result(),
    dailyDrawdown: dailyDd.result(),
    dailyMarks,
    setups: setupCount,
    setupsAtEnd: setup ? (setup.pending ? 'pending' : 'armed') : '',
    pendingBufferedAtEnd: Boolean(position && pendingBuffered),
    lastPeriod,
    ...(markTimes ? { marks: { time: markTimes, value: markValues!, count: markCount } } : {})
  };
};
