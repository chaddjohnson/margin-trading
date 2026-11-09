// The dip-recovery engine (PROTOCOL.md §5). One VGT book, one funded $100,000 position at a time, causal on 1-minute
// OHLC bars. It generalizes the Intraday D1 engine (src/intraday-d1/engine.ts, itself canonical D1 statement for
// statement with the session replaced by a period of B minutes) by five rule switches, so each ladder rung changes
// one mechanism:
//
//   stopWhileLosing  false: D1's profit-conditioned stop (active iff shares × stop − investment − interest > 0, decided
//                    before each period); true: the protective stop is actionable from the fill even at a loss.
//   samePeriod       false: entries only in periods that start flat, exits only in periods that start long (D1);
//                    true: a position can exit in its entry period (from its fill minute) and, after an exit, a fresh
//                    setup can arm (from the exit minute's close) and enter within the same period.
//   holdBuffer       the maximum losing hold H (at a period open) and the buffered loss U (after the hold), with D1's
//                    precedence: gap through an active stop, then a carried buffered sale, then the maximum hold (which
//                    suspends the intraday stop for that period), then the stop and the buffered signal minute by minute
//                    (a stop in the signal minute, or an open through the stop in the next minute, wins).
//   continuation     D1's post-profit continuation: a net-profitable exit opens a window of W periods whose high is
//                    raised at each later period's end; a close P below it arms a continuation setup (deep first).
//   ratchet          'period': the stop's high is raised once per period from the period's high (D1); 'minute': after
//                    every completed minute from that minute's high (and the closing print), so a high seen in minute m
//                    can raise the executable stop from minute m + 1 only.
//
// Per minute (bars are sparse; a minute without a trade has no bar; the order of prices inside a bar is unknown):
//   1. flat with a decision taken at an earlier close → buy at this bar's open (the next observed trade);
//   2. long → exits in D1's order; an intrabar stop fills at the stop level (or the open when the bar opens through it;
//      stresses: the next trade, the bar's low, slippage); a fill-minute stop uses the stop known at the fill
//      (entry price × (1 − S)) — the fill minute's own high never raises it;
//   3. flat (also after an exit in this bar, when allowed) → arm on this bar's close (deep, then continuation; the arming
//      minute never buys) or update the trailing low with this bar's low and test this bar's close against
//      low × (1 + Y): a decision at the close fills at the next bar, the closing print (only for a decision before the
//      close) or the next period's opening trade;
//   4. long → raise the stop (minute ratchet), track MAE/MFE; mark the book at the bar's close.
// Interest: principal × rate × calendar days between session dates ÷ 365 (zero for a same-session round trip).
import type { Clock, Market } from '../intraday-d1/periods.ts';
import type { Rules } from './context.ts';

const secondsPerMinute = 60;
const secondsPerYear = 365 * 24 * 60 * 60;

export type StopFill = 'stop' | 'next-open' | 'minute-low';

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap' | 'buffered intraday loss';

export type Execution =
  | 'first trade after decision'
  | 'closing print'
  | 'opening trade'
  | 'stop level'
  | 'minute open through stop'
  | 'trigger minute close'
  | 'trigger minute low';

export interface Params {
  X: number;
  Y: number;
  S: number;
  holdSeconds: number;
  lookbackPeriods: number;
  buffer: number;
  pullback: number;
  continuationPeriods: number;
}

export interface Settings {
  principal: number;
  rate: number;
  costBps: number;
  stopFill: StopFill;
  stopSlippageBps: number;
}

export interface RunWindow {
  armFromSession: number;
  endSession: number;
  blackout?: [number, number]; // sessions (inclusive) in which no new position may be funded
  segmentEnds?: readonly number[]; // sessions at whose close a reset drawdown tracker restarts
}

export interface Lot {
  id: number;
  setupKind: 'deep' | 'continuation';
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  anchorHigh: number;
  decisionTime: number;
  decisionPrice: number;
  trigger: number;
  trailingLow: number;
  carried: boolean;
  signalPeriod: number;
  entryPeriod: number;
  entrySession: number;
  entryBar: number; // global bar index of the fill (barEnd of the period for the closing print)
  entryTime: number;
  entryRaw: number;
  entryPrice: number;
  entryExecution: Execution;
  shares: number;
  open: boolean;
  exitPeriod: number;
  exitSession: number;
  exitBar: number;
  exitTime: number;
  exitRaw: number;
  exitPrice: number;
  exitReason: ExitReason | '';
  exitExecution: Execution | '';
  stopAtExit: number;
  stopActiveAtExit: boolean;
  maximumHoldDue: boolean;
  bufferSignalTime: number;
  interest: number;
  gross: number; // after costs, before interest
  net: number;
  costs: number;
  slippage: number;
  mae: number;
  mfe: number;
  stopFirstActivePeriod: number;
  stopActivePeriods: number;
  heldPeriods: number;
}

export interface Drawdown {
  maximum: number;
  peakTime: number;
  troughTime: number;
}

export interface Segment {
  endSession: number; // the session whose close ends it (−1: the run's end)
  startMark: number;
  endMark: number;
  drawdown: Drawdown;
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
  dailyMarks: Float64Array;
  segments: Segment[];
  setups: number;
  refused: number;
  setupsAtEnd: '' | 'armed' | 'pending';
  pendingBufferedAtEnd: boolean;
  lastPeriod: number;
  marks?: { time: Float64Array; value: Float64Array; count: number };
}

class Tracker {
  peak = 0;
  peakTime: number;
  maximum = 0;
  ddPeak: number;
  ddTrough: number;

  constructor(start: number, peak = 0) {
    this.peak = peak;
    this.peakTime = start;
    this.ddPeak = start;
    this.ddTrough = start;
  }

  update(value: number, time: number) {
    if (value > this.peak) {
      this.peak = value;
      this.peakTime = time;
    }

    if (this.peak - value > this.maximum) {
      this.maximum = this.peak - value;
      this.ddPeak = this.peakTime;
      this.ddTrough = time;
    }
  }

  result(): Drawdown {
    return { maximum: this.maximum, peakTime: this.ddPeak, troughTime: this.ddTrough };
  }
}

// Per-period lowest minute close (a flat period without a setup can arm only if this passes a monotone test).
const minCloses = new WeakMap<Clock, Float64Array>();

const minCloseOf = (market: Market, clock: Clock) => {
  let cached = minCloses.get(clock);

  if (!cached) {
    cached = new Float64Array(clock.count);

    for (let p = 0; p < clock.count; p++) {
      let c = Infinity;

      for (let b = clock.barStart[p]!; b < clock.barEnd[p]!; b++) if (market.bars.close[b]! < c) c = market.bars.close[b]!;

      cached[p] = c;
    }

    minCloses.set(clock, cached);
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

interface Setup {
  kind: 'deep' | 'continuation';
  activationTime: number;
  activationPrice: number;
  referenceHigh: number;
  anchorHigh: number;
  trailingLow: number;
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
  stopHigh: number; // the high the stop is computed from
  stop: number;
  minSeen: number; // MAE/MFE trackers (held bars before the exit bar, closing prints, the exit price)
  maxSeen: number;
}

export interface TraceOptions {
  marks?: boolean;
}

export const simulate = (
  market: Market,
  clock: Clock,
  rules: Rules,
  params: Params,
  settings: Settings,
  window: RunWindow,
  trace: TraceOptions = {}
): RunResult => {
  const { bars, sessions } = market;
  const { time, open, high, low, close } = bars;
  const { X, Y, S, holdSeconds: hold, lookbackPeriods: Lp, buffer, pullback: P, continuationPeriods: Wp } = params;
  const N = settings.principal;
  const costIn = 1 + settings.costBps / 10000;
  const costOut = 1 - settings.costBps / 10000;
  const slip = 1 - settings.stopSlippageBps / 10000;
  const stopFill = settings.stopFill;
  const minClose = minCloseOf(market, clock);
  const { stopWhileLosing, samePeriod, holdBuffer, continuation } = rules;
  const minuteRatchet = rules.ratchet === 'minute';
  const threshold = -N * buffer;

  if (!(Lp >= 1) || !(Wp >= 1) || !Number.isInteger(Lp) || !Number.isInteger(Wp))
    throw new Error(`lookback ${Lp} and continuation ${Wp} must be whole numbers of periods ≥ 1`);

  const lastPeriod = lastPeriodOf(clock, window.endSession);
  const blackoutFrom = window.blackout?.[0] ?? Infinity;
  const blackoutTo = window.blackout?.[1] ?? -Infinity;
  const segmentEnds = new Set(window.segmentEnds ?? []);
  const trackSegments = segmentEnds.size > 0;
  const dailyMarks = new Float64Array(sessions.count).fill(NaN);
  const start = sessions.time[0] ?? 0;
  const minuteDd = new Tracker(start);
  const dailyDd = new Tracker(start);
  const segments: Segment[] = [];
  let segment = new Tracker(start);
  let segmentStart = 0;
  const markTimes = trace.marks ? new Float64Array(bars.count + 2 * sessions.count + clock.count) : undefined;
  const markValues = trace.marks ? new Float64Array(bars.count + 2 * sessions.count + clock.count) : undefined;
  let markCount = 0;
  const mark = (value: number, t: number) => {
    minuteDd.update(value, t);
    if (trackSegments) segment.update(value, t);

    if (markTimes) {
      markTimes[markCount] = t;
      markValues![markCount++] = value;
    }
  };
  const lots: Lot[] = [];
  const deque = new Int32Array(clock.count);
  let dqHead = 0;
  let dqTail = 0;

  // The run's state.
  let setup: Setup | undefined;
  let position: Position | undefined;
  let pendingBuffered = NaN; // decision time of a buffered sale carried to the next period
  let carriedExit: 0 | 2 | 3 = 0; // L2+: a stop (next-trade fill) or maximum-hold sale carried to the next period
  let continuationActive = false;
  let continuationHigh = 0;
  let continuationStart = -1;
  let realized = 0;
  let setupCount = 0;
  let refused = 0;
  let lastExitBar = -1;

  // The current period's context.
  let i = 0;
  let s = 0;
  let b1 = 0;
  let isLast = false;
  let print = NaN;
  let hasPrint = false;
  let closeTime = 0;
  let fromStart: Position | undefined; // the position held at the period's start
  let active = false; // its stop is actionable this period
  let maxHoldDue = false;
  let interestNow = 0; // its interest through this session
  let posInterest = 0; // the interest of the position currently held, through this session
  let maxHoldPending = false; // decided at the open; suspends the intraday stop for the period
  let scheduledExitBar = -1; // a sale decided at an earlier close of this period, filled at this bar (b1: the print)
  let scheduledKind: 0 | 1 | 2 | 3 = 0; // 1 buffered, 2 stop (next trade), 3 maximum hold
  let scheduledSignal = NaN;
  let periodHeldHigh = -Infinity; // the period's high while held (the period ratchet of a position entered in it)
  let entryBlocked = false;

  const interestAt = (pos: Position, session: number) =>
    N * settings.rate * ((sessions.time[session]! - pos.entrySessionTime) / secondsPerYear);

  const continuationOpen = () =>
    continuation &&
    continuationActive &&
    (samePeriod ? i >= continuationStart : i > continuationStart) &&
    i - continuationStart <= Wp;

  const closeLot = (
    pos: Position,
    price: number,
    t: number,
    bar: number,
    reason: ExitReason,
    execution: Execution,
    signalTime: number
  ) => {
    const lot = pos.lot;
    const isStop = reason === 'trailing stop' || reason === 'trailing stop gap';
    const afterCost = price * costOut;
    const net = afterCost * (isStop ? slip : 1);
    const proceeds = lot.shares * net;
    const interest = interestAt(pos, s);
    const isFromStart = pos === fromStart;

    lot.open = false;
    lot.exitPeriod = i;
    lot.exitSession = s;
    lot.exitBar = bar;
    lot.exitTime = t;
    lot.exitRaw = price;
    lot.exitPrice = net;
    lot.exitReason = reason;
    lot.exitExecution = execution;
    lot.stopAtExit = pos.stop;
    lot.stopActiveAtExit = isFromStart ? active : stopWhileLosing;
    lot.maximumHoldDue = isFromStart ? maxHoldDue : false;
    lot.bufferSignalTime = signalTime;
    lot.interest = interest;
    lot.gross = proceeds - N;
    lot.net = proceeds - N - interest;
    lot.costs += lot.shares * (price - net);
    lot.slippage = lot.shares * (afterCost - net);
    lot.mae = Math.min(pos.minSeen, price) / lot.entryRaw - 1;
    lot.mfe = Math.max(pos.maxSeen, price) / lot.entryRaw - 1;
    realized += lot.net;
    position = undefined;
    lastExitBar = bar;
    scheduledExitBar = -1;
    scheduledKind = 0;
    maxHoldPending = false;
    if (isFromStart) {
      pendingBuffered = NaN;
      carriedExit = 0;
    }

    if (lot.net > 0) {
      continuationActive = true;
      continuationHigh = price;
      continuationStart = i;
    }

    if (!samePeriod) entryBlocked = true;
  };

  const openLot = (price: number, t: number, bar: number, execution: Execution) => {
    const su = setup!;
    const entryPrice = price * costIn;
    const shares = N / entryPrice;
    const lot: Lot = {
      id: lots.length + 1,
      setupKind: su.kind,
      activationTime: su.activationTime,
      activationPrice: su.activationPrice,
      referenceHigh: su.referenceHigh,
      anchorHigh: su.anchorHigh,
      decisionTime: su.decisionTime,
      decisionPrice: su.decisionPrice,
      trigger: su.trigger,
      trailingLow: su.trailingLow,
      carried: su.carried,
      signalPeriod: su.signalPeriod,
      entryPeriod: i,
      entrySession: s,
      entryBar: bar,
      entryTime: t,
      entryRaw: price,
      entryPrice,
      entryExecution: execution,
      shares,
      open: true,
      exitPeriod: -1,
      exitSession: -1,
      exitBar: -1,
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
      costs: shares * (entryPrice - price),
      slippage: 0,
      mae: 0,
      mfe: 0,
      stopFirstActivePeriod: -1,
      stopActivePeriods: 0,
      heldPeriods: 0
    };

    lots.push(lot);
    position = {
      lot,
      entrySessionTime: sessions.time[s]!,
      entryT: clock.t[i]!,
      stopHigh: price,
      stop: price * (1 - S),
      minSeen: price,
      maxSeen: price
    };
    posInterest = interestAt(position, s);
    setup = undefined;
    periodHeldHigh = price;
  };

  const blackedOut = () => s >= blackoutFrom && s <= blackoutTo;

  // A decision with no later bar in this period: the closing print (the session's last period, a decision before the
  // close), else carried to the next period's opening trade.
  const entryAtPrintOrCarry = (decisionTime: number) => {
    if (isLast && hasPrint && decisionTime < closeTime) {
      if (blackedOut()) {
        refused++;
        setup = undefined;
      } else openLot(print, closeTime, b1, 'closing print');
    } else if (setup && !setup.carried) setup.carried = true;
  };

  for (i = 0; i <= lastPeriod; i++) {
    if (i > 0) {
      const h = clock.high[i - 1]!;

      while (dqTail > dqHead && clock.high[deque[dqTail - 1]!]! <= h) dqTail--;
      deque[dqTail++] = i - 1;

      while (deque[dqHead]! < i - Lp) dqHead++;
    }

    const recentHigh = i > 0 ? clock.high[deque[dqHead]!]! : -Infinity;
    const b0 = clock.barStart[i]!;

    s = clock.session[i]!;
    b1 = clock.barEnd[i]!;
    isLast = clock.isLast[i] === 1;
    print = clock.closingPrint[i]!;
    hasPrint = !Number.isNaN(print);
    closeTime = clock.closeTime[i]!;

    if (i === 0) {
      // D1 skips its first history session entirely.
      if (isLast) {
        dailyMarks[s] = 0;

        if (trackSegments && segmentEnds.has(s)) {
          segments.push({ endSession: s, startMark: 0, endMark: 0, drawdown: segment.result() });
          segment = new Tracker(closeTime, 0);
          segmentStart = 0;
        }
      }

      continue;
    }

    const canArm = i >= Lp && s >= window.armFromSession;

    fromStart = position;
    active = stopWhileLosing;
    maxHoldDue = false;
    interestNow = 0;
    maxHoldPending = false;
    scheduledExitBar = -1;
    scheduledKind = 0;
    scheduledSignal = NaN;
    periodHeldHigh = -Infinity;
    entryBlocked = fromStart !== undefined && !samePeriod; // D1: no entry in a period that starts long

    let held = 0;

    if (fromStart) {
      const lot = fromStart.lot;

      interestNow = interestAt(fromStart, s);
      posInterest = interestNow;
      active = stopWhileLosing || lot.shares * fromStart.stop - N - interestNow > 0;
      held = clock.t[i]! - fromStart.entryT;
      maxHoldDue = holdBuffer && held >= hold && lot.shares * clock.open[i]! - N - interestNow < 0;
      maxHoldPending = maxHoldDue;
      lot.heldPeriods++;

      if (active) {
        lot.stopActivePeriods++;
        if (lot.stopFirstActivePeriod < 0) lot.stopFirstActivePeriod = i;
      }
    }

    let marked = false;

    // Fast path: flat at the start, no setup, and no minute can arm (both tests are monotone in the close).
    if (!position && !setup) {
      const armable =
        canArm && (1 - minClose[i]! / recentHigh >= X || (continuationOpen() && minClose[i]! <= continuationHigh * (1 - P)));

      if (!armable) {
        mark(realized, time[b0]!);
        marked = true;
      }
    }

    if (!marked) {
      for (let b = b0; b < b1; b++) {
        // 1. A decision taken at an earlier close buys at this bar's open (the next observed trade).
        if (!position && setup?.pending && !entryBlocked) {
          if (blackedOut()) {
            refused++;
            setup = undefined;
          } else openLot(open[b]!, time[b]!, b, b === b0 ? 'opening trade' : 'first trade after decision');
        }

        // 2. Exits, in D1's order.
        const pos = position as Position | undefined;

        if (pos && (pos === fromStart || samePeriod)) {
          const isFromStart = pos === fromStart;
          const isActive = isFromStart ? active : stopWhileLosing;
          const stop = pos.stop;

          if (isFromStart && b === b0) {
            if (isActive && open[b]! <= stop) closeLot(pos, open[b]!, time[b]!, b, 'trailing stop gap', 'opening trade', NaN);
            else if (carriedExit === 2) closeLot(pos, open[b]!, time[b]!, b, 'trailing stop', 'opening trade', NaN);
            else if (!Number.isNaN(pendingBuffered))
              closeLot(pos, open[b]!, time[b]!, b, 'buffered intraday loss', 'opening trade', pendingBuffered);
            else if (carriedExit === 3) closeLot(pos, open[b]!, time[b]!, b, 'maximum hold', 'opening trade', NaN);
            else if (maxHoldPending && b + 1 < b1) {
              scheduledExitBar = b + 1;
              scheduledKind = 3;
            }
          } else if (scheduledExitBar === b) {
            if (scheduledKind === 3) closeLot(pos, open[b]!, time[b]!, b, 'maximum hold', 'first trade after decision', NaN);
            else if (scheduledKind === 2)
              closeLot(pos, open[b]!, time[b]!, b, 'trailing stop', 'first trade after decision', NaN);
            else if (isActive && open[b]! <= stop)
              closeLot(pos, open[b]!, time[b]!, b, 'trailing stop', 'minute open through stop', NaN);
            else closeLot(pos, open[b]!, time[b]!, b, 'buffered intraday loss', 'first trade after decision', scheduledSignal);
          }

          if (position === pos && !maxHoldPending && scheduledExitBar < 0 && isActive) {
            if (open[b]! <= stop) {
              closeLot(pos, open[b]!, time[b]!, b, 'trailing stop', 'minute open through stop', NaN);
            } else if (low[b]! <= stop) {
              if (stopFill === 'stop') closeLot(pos, stop, time[b]!, b, 'trailing stop', 'stop level', NaN);
              else if (stopFill === 'minute-low')
                closeLot(pos, low[b]!, time[b]!, b, 'trailing stop', 'trigger minute low', NaN);
              else if (b + 1 < b1) {
                scheduledExitBar = b + 1;
                scheduledKind = 2;
              } else if (isLast && hasPrint) {
                scheduledExitBar = b1;
                scheduledKind = 2;
              } else if (samePeriod) {
                scheduledExitBar = b1 + 1; // carried: filled at the next period's opening trade
                scheduledKind = 2;
              } else closeLot(pos, close[b]!, time[b]!, b, 'trailing stop', 'trigger minute close', NaN);
            }
          }

          // The buffered signal on this bar's close (after the hold, not when the maximum hold is due).
          if (
            holdBuffer &&
            position === pos &&
            isFromStart &&
            scheduledExitBar < 0 &&
            !maxHoldDue &&
            held >= hold &&
            pos.lot.shares * close[b]! - N - interestNow <= threshold
          ) {
            const decisionTime = time[b]! + secondsPerMinute;

            if (b + 1 < b1) {
              scheduledExitBar = b + 1;
              scheduledKind = 1;
              scheduledSignal = decisionTime;
            } else if (isLast && hasPrint && decisionTime < closeTime) {
              scheduledExitBar = b1;
              scheduledKind = 1;
              scheduledSignal = decisionTime;
            } else pendingBuffered = decisionTime;
          }
        }

        // 3. Flat: arm, trail and decide on this bar's close.
        if (!position && !entryBlocked && !setup?.pending) {
          if (!setup) {
            if (canArm) {
              let kind: 'deep' | 'continuation' | undefined;
              let anchorHigh = recentHigh;

              if (1 - close[b]! / recentHigh >= X) kind = 'deep';
              else if (continuationOpen() && close[b]! <= continuationHigh * (1 - P)) {
                kind = 'continuation';
                anchorHigh = continuationHigh;
              }

              if (kind) {
                setup = {
                  kind,
                  activationTime: time[b]! + secondsPerMinute,
                  activationPrice: close[b]!,
                  referenceHigh: recentHigh,
                  anchorHigh,
                  trailingLow: close[b]!,
                  trigger: close[b]! * (1 + Y),
                  pending: false,
                  carried: false,
                  decisionTime: NaN,
                  decisionPrice: NaN,
                  signalPeriod: -1
                };
                setupCount++;
                continuationActive = false;
              }
            }
          } else {
            if (low[b]! < setup.trailingLow) setup.trailingLow = low[b]!;

            setup.trigger = setup.trailingLow * (1 + Y);

            if (close[b]! >= setup.trigger) {
              const decisionTime = time[b]! + secondsPerMinute;

              setup.pending = true;
              setup.decisionTime = decisionTime;
              setup.decisionPrice = close[b]!;
              setup.signalPeriod = i;

              if (b + 1 >= b1) entryAtPrintOrCarry(decisionTime);
            }
          }
        }

        // 4. Long at this bar's close: track, ratchet, mark.
        if (position) {
          const p = position as Position;
          const h = high[b]!;

          if (low[b]! < p.minSeen) p.minSeen = low[b]!;
          if (h > p.maxSeen) p.maxSeen = h;
          if (h > periodHeldHigh) periodHeldHigh = h;

          if (minuteRatchet && h > p.stopHigh) {
            p.stopHigh = h;
            p.stop = Math.max(p.stop, h * (1 - S));
          }

          mark(realized + (p.lot.shares * close[b]! - N - posInterest), time[b]!);
          marked = true;
        } else if (!marked || lastExitBar === b) {
          mark(realized, time[b]!);
          marked = true;
        }
      }

      // The closing print: a scheduled sale (a decision before the close; a stop's next trade) or the maximum hold of a
      // period whose only bar was its first minute.
      if (isLast && hasPrint && position) {
        const pos = position as Position;

        if (scheduledExitBar === b1) {
          if (scheduledKind === 2) closeLot(pos, print, closeTime, b1, 'trailing stop', 'closing print', NaN);
          else closeLot(pos, print, closeTime, b1, 'buffered intraday loss', 'closing print', scheduledSignal);
        } else if (maxHoldPending && pos === fromStart && b1 - b0 === 1) {
          closeLot(pos, print, closeTime, b1, 'maximum hold', 'closing print', NaN);
        }
      }

      // L2+: an exit decided at the period's last trade with no closing print waits for the next trade (the next
      // period's opening trade) instead of being dropped (maximum hold) or filled at the trigger minute's close.
      if (samePeriod && position) {
        if (scheduledExitBar === b1 + 1 && scheduledKind === 2) carriedExit = 2;
        else if (maxHoldPending && position === fromStart && b1 - b0 === 1 && !(isLast && hasPrint)) carriedExit = 3;
      }
    }

    // The period's end: the closing print while held, the period ratchet, the marks.
    if (position) {
      const p = position as Position;

      if (isLast && hasPrint) {
        if (print < p.minSeen) p.minSeen = print;
        if (print > p.maxSeen) p.maxSeen = print;
        if (print > periodHeldHigh) periodHeldHigh = print;

        if (minuteRatchet && print > p.stopHigh) {
          p.stopHigh = print;
          p.stop = Math.max(p.stop, print * (1 - S));
        }
      }

      if (!minuteRatchet) {
        // D1: the post-entry high and the stop are raised at the period's end, never lowered. A position entered in
        // this period counts its high from its fill (and the period's close), as in D1's entry period.
        const highThisPeriod = p.lot.entryPeriod === i ? Math.max(periodHeldHigh, clock.close[i]!) : clock.high[i]!;

        p.stopHigh = Math.max(p.stopHigh, highThisPeriod);
        p.stop = Math.max(p.stop, p.stopHigh * (1 - S));
      }
    }

    if (isLast) {
      const value =
        realized + (position ? (position as Position).lot.shares * clock.close[i]! - N - posInterest : 0);

      if (position || lastExitBar === b1) mark(value, closeTime);

      dailyDd.update(value, sessions.time[s]!);
      dailyMarks[s] = value;

      if (trackSegments && segmentEnds.has(s)) {
        segments.push({ endSession: s, startMark: segmentStart, endMark: value, drawdown: segment.result() });
        segment = new Tracker(closeTime, value);
        segmentStart = value;
      }
    }

    if (continuationActive) {
      if (i > continuationStart) continuationHigh = Math.max(continuationHigh, clock.high[i]!);
      if (i - continuationStart >= Wp) continuationActive = false;
    }
  }

  let unrealized = 0;

  if (position) {
    const p = position as Position;
    const ls = clock.session[lastPeriod]!;
    const lot = p.lot;
    const accrued = interestAt(p, ls);
    const last = clock.close[lastPeriod]!;

    unrealized = lot.shares * last - N - accrued;
    lot.interest = accrued;
    lot.gross = lot.shares * last - N;
    lot.net = unrealized;
    lot.exitRaw = last;
    lot.stopAtExit = p.stop;
    lot.mae = Math.min(p.minSeen, last) / lot.entryRaw - 1;
    lot.mfe = p.maxSeen / lot.entryRaw - 1;
  }

  const finalValue = realized + unrealized;

  if (trackSegments)
    segments.push({ endSession: -1, startMark: segmentStart, endMark: finalValue, drawdown: segment.result() });

  return {
    lots,
    realized,
    unrealized,
    net: finalValue,
    interest: lots.reduce((t, l) => t + l.interest, 0),
    costs: lots.reduce((t, l) => t + l.costs, 0),
    minuteDrawdown: minuteDd.result(),
    dailyDrawdown: dailyDd.result(),
    dailyMarks,
    segments,
    setups: setupCount,
    refused,
    setupsAtEnd: setup ? ((setup as Setup).pending ? 'pending' : 'armed') : '',
    pendingBufferedAtEnd: Boolean(position && !Number.isNaN(pendingBuffered)),
    lastPeriod,
    ...(markTimes ? { marks: { time: markTimes, value: markValues!, count: markCount } } : {})
  };
};
