// The reference event engine (BTC_CLOCK_AND_EXECUTION.md): D1's state machine on the BTC clock with spot cash
// accounting, written for clarity, one completed minute at a time, with a full ledger. The optimizer's fast replay
// (./fast.ts) is a separate implementation of the same rules; ./parity.ts proves they agree.
//
// The rules, in the order the engine applies them on each UTC day d (all D1's, on UTC days; the BTC adaptations are
// marked BTC):
// 1. A day that STARTS FLAT may enter; a day that starts with the position open may exit; so there is no exit on the
//    entry day and no entry on an exit day (D1).
// 2. Flat day with an order pending from an earlier day: it fills at the open of the day's first traded minute.
// 3. Flat day otherwise, from d >= armStartDay: each completed minute (its decision is known at its end) either arms
//    a setup (no setup) or updates and tests it (armed):
//    - deep arm: 1 - close / refHigh >= X, refHigh = the highest high of the L completed UTC days d-L..d-1 (D1; BTC:
//      calendar days, the current day never included);
//    - continuation arm: inside the window of a profitable exit (d > its day, d - its day <= W), close <=
//      postExitHigh x (1 - P) (D1; W in UTC days);
//    - the arming minute never buys; the trailing low starts at its close (D1);
//    - armed: trailingLow = min(trailingLow, low), then close >= trailingLow x (1 + Y) sends a buy of a quote
//      notional decided now (BTC: min(100,000, cash / (1 + fee))); it fills at the open of the next traded minute of
//      the same day, or, if none is left, of the next day (rule 2).
// 4. Day starting LONG, before any of its minutes: stopActive = net profit at the stop price > 0, maximum hold due =
//    d - entryDay >= hold and net profit at the day's opening trade < 0 (D1; BTC: profits are net of both sides' fees
//    and impact, there is no interest). Then, as D1 orders them:
//    a. stop active and the day opens at or below the stop: sell at that opening trade;
//    b. a buffered-loss sale carried from the previous day: sell at the opening trade;
//    c. maximum hold due: sell at the open of the next traded minute after the first;
//    d. otherwise the first minute reaching an active stop (open <= stop: its open; low <= stop: the stop fill
//       convention, BTC principal = min(stop, next minute's open)) competes with the first completed minute, from
//       the hold day, whose close puts net profit at or below -notional x buffer; the stop wins at or before the
//       signal minute and at the minute after it when that minute opens through the stop (D1); the buffered sale
//       fills at the next traded minute's open, or at the next day's opening trade.
// 5. After a day the position survives: postEntryHigh = max(postEntryHigh, day high), stop = max(stop,
//    postEntryHigh x (1 - stop%)). On the entry day: postEntryHigh = max(fill, day close, highs from the fill minute).
// 6. End of day: the continuation window's high takes the day's high (days after the exit's), and the window closes
//    once d - its day >= W. Any arming also closes it (D1).
// Marks: the account is marked at every traded minute's close (minute-sampled) and at each day's last close (daily):
// cash plus the BTC's liquidation value (quantity x close x (1 - impact) x (1 - fee)).
import { type Window, dateOf, dayOf, dayStart, isoOf } from './calendar.ts';
import { account, secondsPerMinute } from './context.ts';
import type { ExecutionSettings } from './costs.ts';
import type { D1Params } from './params.ts';
import type { Series } from './snapshot.ts';

export interface Bar {
  index: number; // in the series
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  quoteVolume: number;
}

export interface Day {
  day: number;
  bars: Bar[];
  high: number;
  low: number;
  close: number;
}

// The days of bars [0, endBar). Built once and shared by many runs.
export const buildDays = (series: Series, endBar = series.rows): Day[] => {
  const days: Day[] = [];
  let current: Day | undefined;

  for (let i = 0; i < endBar; i++) {
    const day = dayOf(series.time[i]!);
    const bar: Bar = {
      index: i,
      time: series.time[i]!,
      open: series.open[i]!,
      high: series.high[i]!,
      low: series.low[i]!,
      close: series.close[i]!,
      quoteVolume: series.quoteVolume[i]!
    };

    if (!current || current.day !== day) {
      current = { day, bars: [], high: -Infinity, low: Infinity, close: NaN };
      days.push(current);
    }

    current.bars.push(bar);
    current.high = Math.max(current.high, bar.high);
    current.low = Math.min(current.low, bar.low);
    current.close = bar.close;
  }

  return days;
};

export type ExitReason =
  'trailing stop' | 'trailing stop gap' | 'maximum hold' | 'buffered intraday loss' | 'open at end (marked)';

export type Execution =
  | 'next minute open'
  | 'day opening trade'
  | 'carried to next day opening trade'
  | 'stop level'
  | 'minute open through stop'
  | 'adverse: next minute open below stop'
  | 'adverse: stop level'
  | 'worst: min(stop, trigger low, next minute open)'
  | 'mark at last close';

// A decision and the bar whose data produced it (the lookahead tests compare these before a cutoff).
export type SignalType =
  'arm deep' | 'arm continuation' | 'buy' | 'cancel' | 'stop gap' | 'maximum hold' | 'stop' | 'buffered loss';

export interface Signal {
  bar: number;
  type: SignalType;
}

export interface Trade {
  number: number;
  setupId: number;
  setupKind: 'deep' | 'continuation';
  activationTime: number; // end of the arming minute
  activationPrice: number;
  anchorHigh: number; // the reference high (deep) or the post-exit high (continuation)
  trailingLow: number;
  trailingLowTime: number;
  reboundTrigger: number;
  decisionTime: number; // end of the minute that confirmed the rebound
  decisionPrice: number;
  availableQuote: number; // USDT cash when the order was sized
  topUp: number; // fixed-notional mode only: outside USDT added to fund this entry
  entryTime: number; // start of the fill minute
  entryDay: number;
  entryBar: number;
  entryExecution: Execution;
  entryPrice: number; // the observed trade price
  entryFillPrice: number; // after impact
  quantity: number; // BTC
  notional: number; // gross USDT spent on BTC (quantity x entryFillPrice)
  entryFee: number;
  entryImpact: number; // quantity x (entryFillPrice - entryPrice)
  entryParticipation: number; // notional / the fill minute's quote volume
  exitTime: number;
  exitDay: number;
  exitBar: number; // the minute the exit executes in (the last bar for an open position)
  exitReason: ExitReason;
  exitExecution: Execution;
  stopAtExit: number;
  exitPrice: number;
  exitFillPrice: number;
  exitProceeds: number; // quantity x exitFillPrice
  exitFee: number;
  exitImpact: number; // quantity x (exitPrice - exitFillPrice)
  exitParticipation: number;
  grossPnl: number; // quantity x (exitPrice - entryPrice)
  netPnl: number; // after both fees and impacts; interest and funding are zero (spot, no borrowing)
  cumulativeRealized: number; // realized net of closed trades through this one (open: unchanged)
  status: 'closed' | 'open';
  elapsedDays: number; // exitDay - entryDay (UTC calendar days)
  durationMinutes: number; // (exitTime - entryTime) / 60
  maxFavorable: number; // highest high of the held minutes [entry minute, exit minute) and the exit price, vs entry
  maxAdverse: number; // lowest low of the same minutes and the exit price, vs entry
}

interface Setup {
  id: number;
  kind: 'deep' | 'continuation';
  status: 'armed' | 'pending';
  activationTime: number;
  activationPrice: number;
  anchorHigh: number;
  trailingLow: number;
  trailingLowTime: number;
  reboundTrigger: number;
  decision?: { time: number; price: number; notional: number; availableQuote: number; topUp: number };
}

interface Position {
  trade: Trade;
  quantity: number;
  notional: number;
  entryFee: number;
}

export interface Tracker {
  peak: number;
  drawdown: number; // USDT, largest peak-to-trough fall
  drawdownPeakTime: number;
  drawdownTroughTime: number;
  percent: number; // largest (1 - equity / running peak)
  percentPeakTime: number;
  percentTroughTime: number;
}

const newTracker = (equity: number, time: number): Tracker => ({
  peak: equity,
  drawdown: 0,
  drawdownPeakTime: time,
  drawdownTroughTime: time,
  percent: 0,
  percentPeakTime: time,
  percentTroughTime: time
});

const track = (tracker: Tracker, equity: number, time: number, peakTime: { value: number }) => {
  if (equity > tracker.peak) {
    tracker.peak = equity;
    peakTime.value = time;
  }

  if (tracker.peak - equity > tracker.drawdown) {
    tracker.drawdown = tracker.peak - equity;
    tracker.drawdownPeakTime = peakTime.value;
    tracker.drawdownTroughTime = time;
  }

  const percent = tracker.peak > 0 ? 1 - equity / tracker.peak : 0;

  if (percent > tracker.percent) {
    tracker.percent = percent;
    tracker.percentPeakTime = peakTime.value;
    tracker.percentTroughTime = time;
  }
};

export interface WindowResult {
  label: string;
  startDay: number;
  endDay: number;
  startEquity: number; // marked equity at the last mark before the window (initial equity if none)
  endEquity: number;
  startContributions: number;
  endContributions: number;
  net: number; // endEquity - startEquity - contributions added inside the window
  minute: Tracker;
  daily: Tracker;
  entries: number; // trades entered in the window
  exits: number; // closed trades exited in the window
  marks: number;
}

export interface RunOptions {
  days: Day[];
  params: D1Params;
  settings: ExecutionSettings;
  armStartDay: number;
  mode?: 'cash' | 'fixed'; // fixed: every entry is 100,000 USDT, outside top-ups recorded (analytical only)
  windows?: Window[];
  events?: boolean;
}

export interface RunResult {
  trades: Trade[];
  closedTrades: number;
  setups: { deep: number; continuation: number; cancelled: number; armedAtEnd: boolean; pendingAtEnd: boolean };
  pendingBufferedAtEnd: boolean;
  windows: WindowResult[];
  cash: number;
  quantity: number;
  contributions: number;
  equity: number; // cash + liquidation value at the last close
  realized: number;
  unrealized: number;
  lastTime: number;
  signals: Signal[];
  events: string[];
}

const fmt = (value: number) => value.toFixed(2);

export const runReference = (options: RunOptions): RunResult => {
  const { days, params, settings, armStartDay } = options;
  const mode = options.mode ?? 'cash';
  const fee = settings.costs.feeBps / 10000;
  const impact = settings.costs.impactBps / 10000;
  const sellFactor = (1 - impact) * (1 - fee);
  const events: string[] = [];
  const signals: Signal[] = [];
  const log = (text: string) => {
    if (options.events) {
      events.push(text);
    }
  };
  const trades: Trade[] = [];
  const setupCounts = { deep: 0, continuation: 0, cancelled: 0 };
  let setupId = 0;
  let cash: number = account.initialEquity;
  let contributions = 0;
  let realized = 0;
  let position: Position | undefined;
  let setup: Setup | undefined;
  let pendingBuffered: { time: number; price: number } | undefined;
  // An adverse/worst stop triggered on a day's last minute: it sells at the next day's first trade, at most `limit`.
  let pendingStop: { limit: number; execution: Execution } | undefined;
  let postEntryHigh = 0;
  let stop = 0;
  let continuation: { high: number; day: number } | undefined;
  let lastTime = NaN;
  let lastClose = NaN;
  const dayHighs = new Map<number, number>(days.map((day) => [day.day, day.high]));

  // Reporting windows: each opens at the last mark before it and tracks the marks inside it.
  const windowStates = (options.windows ?? []).map((window) => ({
    window,
    result: undefined as WindowResult | undefined,
    minutePeakTime: { value: 0 },
    dailyPeakTime: { value: 0 }
  }));
  let markedEquity: number = account.initialEquity;
  const openWindows = (day: number, time: number) => {
    for (const state of windowStates) {
      if (!state.result && day >= state.window.startDay && day < state.window.endDay) {
        state.result = {
          label: state.window.label,
          startDay: state.window.startDay,
          endDay: state.window.endDay,
          startEquity: markedEquity,
          endEquity: markedEquity,
          startContributions: contributions,
          endContributions: contributions,
          net: 0,
          minute: newTracker(markedEquity - contributions, time),
          daily: newTracker(markedEquity - contributions, time),
          entries: 0,
          exits: 0,
          marks: 0
        };
        state.minutePeakTime.value = time;
        state.dailyPeakTime.value = time;
      }
    }
  };
  const inWindow = (day: number) =>
    windowStates.filter((state) => state.result && day >= state.window.startDay && day < state.window.endDay);

  // Net profit of the open position if sold at `price` (both fees and impacts; no interest).
  const netAt = (price: number) => position!.quantity * price * sellFactor - position!.notional - position!.entryFee;
  const liquidation = (price: number) => (position ? position.quantity * price * sellFactor : 0);

  const enter = (bar: Bar, day: Day, execution: Execution) => {
    const decision = setup!.decision!;
    const fillPrice = bar.open * (1 + impact);
    const quantity = decision.notional / fillPrice;
    const entryFee = decision.notional * fee;

    if (decision.topUp > 0) {
      cash += decision.topUp;
      contributions += decision.topUp;
    }

    cash -= decision.notional + entryFee;

    if (cash < -1e-6) {
      throw new Error(`Cash went negative (${cash}) at ${isoOf(bar.time)}`);
    }

    const trade: Trade = {
      number: trades.length + 1,
      setupId: setup!.id,
      setupKind: setup!.kind,
      activationTime: setup!.activationTime,
      activationPrice: setup!.activationPrice,
      anchorHigh: setup!.anchorHigh,
      trailingLow: setup!.trailingLow,
      trailingLowTime: setup!.trailingLowTime,
      reboundTrigger: setup!.reboundTrigger,
      decisionTime: decision.time,
      decisionPrice: decision.price,
      availableQuote: decision.availableQuote,
      topUp: decision.topUp,
      entryTime: bar.time,
      entryDay: day.day,
      entryBar: bar.index,
      entryExecution: execution,
      entryPrice: bar.open,
      entryFillPrice: fillPrice,
      quantity,
      notional: decision.notional,
      entryFee,
      entryImpact: quantity * (fillPrice - bar.open),
      entryParticipation: bar.quoteVolume > 0 ? decision.notional / bar.quoteVolume : Infinity,
      exitTime: NaN,
      exitDay: NaN,
      exitBar: NaN,
      exitReason: 'open at end (marked)',
      exitExecution: 'mark at last close',
      stopAtExit: NaN,
      exitPrice: NaN,
      exitFillPrice: NaN,
      exitProceeds: NaN,
      exitFee: NaN,
      exitImpact: NaN,
      exitParticipation: NaN,
      grossPnl: NaN,
      netPnl: NaN,
      cumulativeRealized: realized,
      status: 'open',
      elapsedDays: NaN,
      durationMinutes: NaN,
      maxFavorable: NaN,
      maxAdverse: NaN
    };

    trades.push(trade);
    position = { trade, quantity, notional: decision.notional, entryFee };

    for (const state of inWindow(day.day)) {
      state.result!.entries++;
    }

    log(
      `${isoOf(bar.time)} BUY ${quantity.toFixed(8)} BTC at ${fmt(bar.open)} (fill ${fmt(fillPrice)}, ${execution}), notional ${fmt(decision.notional)} USDT, fee ${fmt(entryFee)}`
    );
    setup = undefined;
  };

  const exitAt = (bar: Bar, day: Day, price: number, reason: ExitReason, execution: Execution) => {
    const { trade, quantity } = position!;
    const fillPrice = price * (1 - impact);
    const proceeds = quantity * fillPrice;
    const exitFee = proceeds * fee;

    cash += proceeds - exitFee;

    const net = proceeds - exitFee - position!.notional - position!.entryFee;

    realized += net;
    Object.assign(trade, {
      exitTime: bar.time,
      exitDay: day.day,
      exitBar: bar.index,
      exitReason: reason,
      exitExecution: execution,
      stopAtExit: stop,
      exitPrice: price,
      exitFillPrice: fillPrice,
      exitProceeds: proceeds,
      exitFee,
      exitImpact: quantity * (price - fillPrice),
      exitParticipation: bar.quoteVolume > 0 ? proceeds / bar.quoteVolume : Infinity,
      grossPnl: quantity * (price - trade.entryPrice),
      netPnl: net,
      cumulativeRealized: realized,
      status: 'closed',
      elapsedDays: day.day - trade.entryDay,
      durationMinutes: (bar.time - trade.entryTime) / secondsPerMinute
    });

    for (const state of inWindow(day.day)) {
      state.result!.exits++;
    }

    log(
      `${isoOf(bar.time)} SELL (${reason}, ${execution}) at ${fmt(price)} (fill ${fmt(fillPrice)}), net ${fmt(net)} USDT, stop ${fmt(stop)}`
    );

    if (net > 0) {
      continuation = { high: price, day: day.day };
    }

    position = undefined;
    pendingBuffered = undefined;
    pendingStop = undefined;
  };

  const sizeOrder = (time: number, price: number) => {
    if (mode === 'fixed') {
      const needed = account.notionalCap * (1 + fee);

      return { notional: account.notionalCap, availableQuote: cash, topUp: Math.max(0, needed - cash), time, price };
    }

    const notional = Math.min(account.notionalCap, cash / (1 + fee));

    return { notional, availableQuote: cash, topUp: 0, time, price };
  };

  for (const day of days) {
    const startedFlat = !position;
    let entryBar = -1; // index in day.bars of the fill minute
    let exitBar = -1; // index in day.bars of the exit minute
    const cashAtStart = cash;
    const quantityAtStart = position?.quantity ?? 0;
    let cashAfterEvent = cash;

    openWindows(day.day, day.bars[0]!.time);

    if (startedFlat) {
      if (setup?.status === 'pending') {
        // Rule 2: carried order, the first traded minute of the day (its start is after the decision).
        enter(day.bars[0]!, day, 'carried to next day opening trade');
        entryBar = 0;
      } else if (day.day >= armStartDay) {
        let refHigh = -Infinity;

        for (let d = day.day - params.tickWindowSize; d < day.day; d++) {
          refHigh = Math.max(refHigh, dayHighs.get(d) ?? -Infinity);
        }

        for (let k = 0; k < day.bars.length; k++) {
          const bar = day.bars[k]!;
          const decisionTime = bar.time + secondsPerMinute;

          if (!setup) {
            let kind: 'deep' | 'continuation' | undefined;
            let anchorHigh = refHigh;

            if (Number.isFinite(refHigh) && 1 - bar.close / refHigh >= params.targetPercentChange) {
              kind = 'deep';
            } else if (
              continuation &&
              day.day > continuation.day &&
              day.day - continuation.day <= params.continuationWindow &&
              bar.close <= continuation.high * (1 - params.pullback)
            ) {
              kind = 'continuation';
              anchorHigh = continuation.high;
            }

            if (kind) {
              setup = {
                id: ++setupId,
                kind,
                status: 'armed',
                activationTime: decisionTime,
                activationPrice: bar.close,
                anchorHigh,
                trailingLow: bar.close,
                trailingLowTime: bar.time,
                reboundTrigger: bar.close * (1 + params.trailingBuyPercentage)
              };
              setupCounts[kind]++;
              signals.push({ bar: bar.index, type: kind === 'deep' ? 'arm deep' : 'arm continuation' });
              continuation = undefined;
              log(
                `${isoOf(decisionTime)} ARM ${kind} #${setup.id} at close ${fmt(bar.close)} (anchor ${fmt(anchorHigh)})`
              );
            }

            continue;
          }

          if (bar.low < setup.trailingLow) {
            setup.trailingLow = bar.low;
            setup.trailingLowTime = bar.time;
          }

          setup.reboundTrigger = setup.trailingLow * (1 + params.trailingBuyPercentage);

          if (bar.close < setup.reboundTrigger) {
            continue;
          }

          const order = sizeOrder(decisionTime, bar.close);

          if (!(order.notional >= settings.minOrderNotional)) {
            log(`${isoOf(decisionTime)} CANCEL #${setup.id}: ${fmt(order.notional)} USDT is below the order floor`);
            setupCounts.cancelled++;
            signals.push({ bar: bar.index, type: 'cancel' });
            setup = undefined;
            break;
          }

          setup.status = 'pending';
          signals.push({ bar: bar.index, type: 'buy' });
          setup.decision = order;
          log(`${isoOf(decisionTime)} TRIGGER #${setup.id} at close ${fmt(bar.close)} >= ${fmt(setup.reboundTrigger)}`);

          const next = day.bars[k + 1];

          if (next) {
            enter(next, day, 'next minute open');
            entryBar = k + 1;
          }

          break;
        }
      }

      if (entryBar >= 0) {
        cashAfterEvent = cash;
        postEntryHigh = -Infinity;

        for (let k = entryBar; k < day.bars.length; k++) {
          postEntryHigh = Math.max(postEntryHigh, day.bars[k]!.high);
        }

        postEntryHigh = Math.max(postEntryHigh, position!.trade.entryPrice, day.close);
        stop = postEntryHigh * (1 - params.trailingStopPercentage);
      }
    } else {
      const bars = day.bars;
      const first = bars[0]!;
      const daysHeld = day.day - position!.trade.entryDay;
      const stopActive = netAt(stop) > 0;
      const holdDue = daysHeld >= params.maximumHoldDays && netAt(first.open) < 0;
      const threshold = -position!.notional * params.intradayLossBuffer;

      if (pendingStop) {
        exitAt(
          first,
          day,
          Math.min(pendingStop.limit, first.open),
          'trailing stop',
          'carried to next day opening trade'
        );
        exitBar = 0;
      } else if (stopActive && first.open <= stop) {
        signals.push({ bar: first.index, type: 'stop gap' });
        exitAt(first, day, first.open, 'trailing stop gap', 'day opening trade');
        exitBar = 0;
      } else if (pendingBuffered) {
        exitAt(first, day, first.open, 'buffered intraday loss', 'carried to next day opening trade');
        exitBar = 0;
      } else if (holdDue) {
        signals.push({ bar: first.index, type: 'maximum hold' });

        const k = bars.findIndex((bar) => bar.time >= first.time + secondsPerMinute);

        if (k >= 0) {
          exitAt(bars[k]!, day, bars[k]!.open, 'maximum hold', 'next minute open');
          exitBar = k;
        }
      } else {
        const stopIndex = stopActive ? bars.findIndex((bar) => bar.open <= stop || bar.low <= stop) : -1;
        const signalIndex =
          daysHeld >= params.maximumHoldDays ? bars.findIndex((bar) => netAt(bar.close) <= threshold) : -1;
        const stopWins =
          stopIndex >= 0 &&
          (signalIndex < 0 ||
            stopIndex <= signalIndex ||
            (stopIndex === signalIndex + 1 && bars[stopIndex]!.open <= stop));

        if (stopWins) {
          const bar = bars[stopIndex]!;

          signals.push({ bar: bar.index, type: 'stop' });

          if (bar.open <= stop) {
            exitAt(bar, day, bar.open, 'trailing stop', 'minute open through stop');
            exitBar = stopIndex;
          } else if (settings.stopFill === 'stop') {
            exitAt(bar, day, stop, 'trailing stop', 'stop level');
            exitBar = stopIndex;
          } else {
            // Adverse (principal) and worst: priced with the next traded minute's open, so recorded at that minute,
            // when the price is observed; with no minute left in the day, at the next day's first trade. Worst also
            // caps the price at the trigger minute's low, so it never fills above adverse.
            const limit = settings.stopFill === 'low' ? Math.min(stop, bar.low) : stop;
            const next = bars[stopIndex + 1];
            const execution: Execution =
              settings.stopFill === 'low'
                ? 'worst: min(stop, trigger low, next minute open)'
                : next && next.open < stop
                  ? 'adverse: next minute open below stop'
                  : 'adverse: stop level';

            if (next) {
              exitAt(next, day, Math.min(limit, next.open), 'trailing stop', execution);
              exitBar = stopIndex + 1;
            } else {
              pendingStop = { limit, execution };
              log(`${isoOf(bar.time + secondsPerMinute)} STOP SALE carried to the next day's first trade`);
            }
          }
        } else if (signalIndex >= 0) {
          const next = bars[signalIndex + 1];

          signals.push({ bar: bars[signalIndex]!.index, type: 'buffered loss' });

          if (next) {
            exitAt(next, day, next.open, 'buffered intraday loss', 'next minute open');
            exitBar = signalIndex + 1;
          } else {
            pendingBuffered = { time: bars[signalIndex]!.time + secondsPerMinute, price: bars[signalIndex]!.close };
            log(`${isoOf(pendingBuffered.time)} BUFFERED SALE carried to the next day`);
          }
        }
      }

      if (exitBar >= 0) {
        cashAfterEvent = cash;
      }
    }

    // Marks. Before the fill (entry day) or from the exit minute on (exit day) the account is the cash; while held,
    // cash plus the liquidation value at the minute's close.
    const held = (k: number) => (startedFlat ? entryBar >= 0 && k >= entryBar : exitBar < 0 || k < exitBar);

    for (let k = 0; k < day.bars.length; k++) {
      const bar = day.bars[k]!;
      let equity: number;

      if (startedFlat) {
        equity = held(k) ? cashAfterEvent + liquidation(bar.close) : cashAtStart;
      } else if (held(k)) {
        equity = cashAtStart + quantityAtStart * bar.close * sellFactor;
      } else {
        equity = cashAfterEvent;
      }

      markedEquity = equity;

      for (const state of inWindow(day.day)) {
        const result = state.result!;

        track(result.minute, equity - contributions, bar.time, state.minutePeakTime);
        result.marks++;

        if (k === day.bars.length - 1) {
          track(result.daily, equity - contributions, bar.time, state.dailyPeakTime);
        }

        result.endEquity = equity;
        result.endContributions = contributions;
      }

      lastTime = bar.time;
      lastClose = bar.close;
    }

    // Rule 5: the surviving position's high and stop for the next day.
    if (position && !startedFlat && !pendingStop) {
      postEntryHigh = Math.max(postEntryHigh, day.high);
      stop = Math.max(stop, postEntryHigh * (1 - params.trailingStopPercentage));
    }

    // Rule 6: the continuation window.
    if (continuation) {
      if (day.day > continuation.day) {
        continuation.high = Math.max(continuation.high, day.high);
      }

      if (day.day - continuation.day >= params.continuationWindow) {
        continuation = undefined;
      }
    }
  }

  // Excursions: the held minutes [entry minute, exit minute) plus the exit price (or the last close when open).
  const flat = days.flatMap((day) => day.bars);
  const offset = flat[0]?.index ?? 0;

  for (const trade of trades) {
    const end = trade.status === 'closed' ? trade.exitBar : flat.at(-1)!.index + 1;
    const exitPrice = trade.status === 'closed' ? trade.exitPrice : lastClose;
    let high = exitPrice;
    let low = exitPrice;

    for (let i = trade.entryBar; i < end; i++) {
      const bar = flat[i - offset]!;

      high = Math.max(high, bar.high);
      low = Math.min(low, bar.low);
    }

    trade.maxFavorable = high / trade.entryPrice - 1;
    trade.maxAdverse = low / trade.entryPrice - 1;
  }

  let unrealized = 0;

  if (position) {
    const { trade } = position;

    unrealized = netAt(lastClose);
    Object.assign(trade, {
      exitTime: lastTime,
      exitDay: dayOf(lastTime),
      exitBar: days[days.length - 1]!.bars.at(-1)!.index,
      exitPrice: lastClose,
      exitFillPrice: lastClose * (1 - impact),
      exitProceeds: trade.quantity * lastClose * (1 - impact),
      exitFee: trade.quantity * lastClose * (1 - impact) * fee,
      exitImpact: trade.quantity * lastClose * impact,
      grossPnl: trade.quantity * (lastClose - trade.entryPrice),
      netPnl: unrealized,
      elapsedDays: dayOf(lastTime) - trade.entryDay,
      durationMinutes: (lastTime - trade.entryTime) / secondsPerMinute,
      stopAtExit: stop
    });
  }

  const windows = windowStates.map(({ window, result }) => {
    const empty = result ?? {
      label: window.label,
      startDay: window.startDay,
      endDay: window.endDay,
      startEquity: markedEquity,
      endEquity: markedEquity,
      startContributions: contributions,
      endContributions: contributions,
      net: 0,
      minute: newTracker(markedEquity, lastTime),
      daily: newTracker(markedEquity, lastTime),
      entries: 0,
      exits: 0,
      marks: 0
    };

    empty.net = empty.endEquity - empty.startEquity - (empty.endContributions - empty.startContributions);

    return empty;
  });

  return {
    trades,
    closedTrades: trades.filter((trade) => trade.status === 'closed').length,
    setups: {
      ...setupCounts,
      armedAtEnd: setup?.status === 'armed',
      pendingAtEnd: setup?.status === 'pending'
    },
    pendingBufferedAtEnd: Boolean((pendingBuffered || pendingStop) && position),
    windows,
    cash,
    quantity: position?.quantity ?? 0,
    contributions,
    equity: cash + liquidation(lastClose),
    realized,
    unrealized,
    lastTime,
    signals,
    events
  };
};

export const describeDay = (day: number) => `${dateOf(day)} (${isoOf(dayStart(day))})`;
