// The fast replay used by the search: the reference engine's rules (./engine.ts, BTC_CLOCK_AND_EXECUTION.md) on
// typed arrays, without objects per bar. It differs from the reference only in how it gets there:
// - the rolling reference high comes from a monotonic deque over day highs, not a scan of L days;
// - a flat day with no setup is skipped without visiting its minutes when even its lowest close cannot arm (both
//   arming tests are monotone in the close, so the day minimum decides exactly);
// - on a long day the stop and buffer searches are skipped when the day's low / lowest close cannot reach them.
// Every day with a setup or a position is walked minute by minute, so the marks and both drawdowns are exact.
// ./parity.ts compares it with the reference trade by trade and mark by mark.
import { type DayIndex, type Window } from './calendar.ts';
import { account, secondsPerMinute } from './context.ts';
import type { ExecutionSettings } from './costs.ts';
import type { Signal } from './engine.ts';
import type { D1Params } from './params.ts';
import type { Series } from './snapshot.ts';

export const reasonCodes = [
  'trailing stop gap',
  'trailing stop',
  'maximum hold',
  'buffered intraday loss',
  'open'
] as const;

export interface FastTrade {
  entryTime: number;
  entryDay: number;
  entryBar: number;
  entryPrice: number;
  quantity: number;
  notional: number;
  entryFee: number;
  exitTime: number;
  exitDay: number;
  exitBar: number;
  exitPrice: number;
  exitFee: number;
  grossPnl: number;
  netPnl: number;
  reason: (typeof reasonCodes)[number];
  kind: 'deep' | 'continuation';
  entryParticipation: number;
  exitParticipation: number;
}

export interface FastWindow {
  label: string;
  startDay: number;
  endDay: number;
  opened: boolean;
  startEquity: number;
  endEquity: number;
  net: number;
  minuteDrawdown: number;
  minutePercent: number;
  dailyDrawdown: number;
  dailyPercent: number;
  entries: number;
  exits: number;
  marks: number;
  // internal running state
  minutePeak: number;
  dailyPeak: number;
}

export interface FastResult {
  trades: FastTrade[];
  windows: FastWindow[];
  cash: number;
  quantity: number;
  equity: number;
  realized: number;
  unrealized: number;
  deepSetups: number;
  continuationSetups: number;
  cancelled: number;
  signals: Signal[];
}

export interface FastOptions {
  series: Series;
  index: DayIndex; // built on the bars the run may see
  params: D1Params;
  settings: ExecutionSettings;
  armStartDay: number;
  windows: Window[];
}

// Rolling max of the L previous days' highs for every day of the index (NaN-high days are absent).
export const referenceHighs = (index: DayIndex, lookback: number) => {
  const result = new Float64Array(index.days).fill(-Infinity);
  const queue = new Int32Array(index.days);
  let head = 0;
  let tail = 0;

  for (let d = 0; d < index.days; d++) {
    while (head < tail && queue[head]! < d - lookback) {
      head++;
    }

    if (head < tail) {
      result[d] = index.high[queue[head]!]!;
    }

    const high = index.high[d]!;

    if (!Number.isNaN(high)) {
      while (head < tail && index.high[queue[tail - 1]!]! <= high) {
        tail--;
      }

      queue[tail++] = d;
    }
  }

  return result;
};

export const runFast = (options: FastOptions): FastResult => {
  const { series, index, params, settings } = options;
  const { time, open, high, low, close, quoteVolume } = series;
  const fee = settings.costs.feeBps / 10000;
  const impact = settings.costs.impactBps / 10000;
  const sell = (1 - impact) * (1 - fee);
  const X = params.targetPercentChange;
  const Y = params.trailingBuyPercentage;
  const S = params.trailingStopPercentage;
  const hold = params.maximumHoldDays;
  const P = params.pullback;
  const W = params.continuationWindow;
  const refHighs = referenceHighs(index, params.tickWindowSize);
  const armStart = options.armStartDay - index.firstDay;
  const trades: FastTrade[] = [];
  const windows: FastWindow[] = options.windows.map((window) => ({
    label: window.label,
    startDay: window.startDay,
    endDay: window.endDay,
    opened: false,
    startEquity: 0,
    endEquity: 0,
    net: 0,
    minuteDrawdown: 0,
    minutePercent: 0,
    dailyDrawdown: 0,
    dailyPercent: 0,
    entries: 0,
    exits: 0,
    marks: 0,
    minutePeak: 0,
    dailyPeak: 0
  }));
  let cash: number = account.initialEquity;
  let realized = 0;
  let marked: number = account.initialEquity;
  // position
  let long = false;
  let quantity = 0;
  let notional = 0;
  let entryFee = 0;
  let entryDay = 0;
  let stop = 0;
  let postEntryHigh = 0;
  let current: FastTrade | undefined;
  let carriedSale = false;
  let carriedStop = NaN; // the limit of a stop sale carried to the next day's first trade
  // setup: 0 none, 1 armed, 2 pending
  let setupState = 0;
  let setupKind: 'deep' | 'continuation' = 'deep';
  let trailingLow = 0;
  let pendingNotional = 0;
  let deepSetups = 0;
  let continuationSetups = 0;
  let cancelled = 0;
  const signals: Signal[] = [];
  // continuation window (day offsets into the index)
  let windowOpen = false;
  let windowHigh = 0;
  let windowDay = 0;
  let active: FastWindow[] = [];

  const mark = (equity: number, last: boolean) => {
    for (const w of active) {
      if (equity > w.minutePeak) {
        w.minutePeak = equity;
      }

      if (w.minutePeak - equity > w.minuteDrawdown) {
        w.minuteDrawdown = w.minutePeak - equity;
      }

      if (w.minutePeak > 0 && 1 - equity / w.minutePeak > w.minutePercent) {
        w.minutePercent = 1 - equity / w.minutePeak;
      }

      if (last) {
        if (equity > w.dailyPeak) {
          w.dailyPeak = equity;
        }

        if (w.dailyPeak - equity > w.dailyDrawdown) {
          w.dailyDrawdown = w.dailyPeak - equity;
        }

        if (w.dailyPeak > 0 && 1 - equity / w.dailyPeak > w.dailyPercent) {
          w.dailyPercent = 1 - equity / w.dailyPeak;
        }
      }

      w.endEquity = equity;
    }

    marked = equity;
  };

  const buy = (bar: number, d: number) => {
    const fillPrice = open[bar]! * (1 + impact);

    quantity = pendingNotional / fillPrice;
    notional = pendingNotional;
    entryFee = notional * fee;
    cash -= notional + entryFee;
    entryDay = d;
    long = true;
    setupState = 0;
    current = {
      entryTime: time[bar]!,
      entryDay: index.firstDay + d,
      entryBar: bar,
      entryPrice: open[bar]!,
      quantity,
      notional,
      entryFee,
      exitTime: NaN,
      exitDay: NaN,
      exitBar: NaN,
      exitPrice: NaN,
      exitFee: NaN,
      grossPnl: NaN,
      netPnl: NaN,
      reason: 'open',
      kind: setupKind,
      entryParticipation: quoteVolume[bar]! > 0 ? notional / quoteVolume[bar]! : Infinity,
      exitParticipation: NaN
    };
    trades.push(current);

    for (const w of active) {
      w.entries++;
    }

    // The entry day's high and stop, from the fill minute on.
    let h = Math.max(open[bar]!, close[index.barEnd[d]! - 1]!);

    for (let i = bar; i < index.barEnd[d]!; i++) {
      if (high[i]! > h) {
        h = high[i]!;
      }
    }

    postEntryHigh = h;
    stop = h * (1 - S);
  };

  const sellAt = (bar: number, d: number, price: number, reason: FastTrade['reason']) => {
    const fillPrice = price * (1 - impact);
    const proceeds = quantity * fillPrice;
    const exitFee = proceeds * fee;
    const net = proceeds - exitFee - notional - entryFee;

    cash += proceeds - exitFee;
    realized += net;
    current!.exitTime = time[bar]!;
    current!.exitDay = index.firstDay + d;
    current!.exitBar = bar;
    current!.exitPrice = price;
    current!.exitFee = exitFee;
    current!.grossPnl = quantity * (price - current!.entryPrice);
    current!.netPnl = net;
    current!.reason = reason;
    current!.exitParticipation = quoteVolume[bar]! > 0 ? proceeds / quoteVolume[bar]! : Infinity;

    for (const w of active) {
      w.exits++;
    }

    if (net > 0) {
      windowOpen = true;
      windowHigh = price;
      windowDay = d;
    }

    long = false;
    carriedSale = false;
    carriedStop = NaN;
    quantity = 0;
  };

  for (let d = 0; d < index.days; d++) {
    const s = index.barStart[d]!;
    const e = index.barEnd[d]!;

    if (s === e) {
      continue;
    }

    const day = index.firstDay + d;

    for (const w of windows) {
      if (!w.opened && day >= w.startDay && day < w.endDay) {
        w.opened = true;
        w.startEquity = marked;
        w.endEquity = marked;
        w.minutePeak = marked;
        w.dailyPeak = marked;
      }
    }

    active = windows.filter((w) => w.opened && day < w.endDay);

    for (const w of active) {
      w.marks += e - s;
    }

    if (!long) {
      const before = cash;
      let entry = -1;

      if (setupState === 2) {
        entry = s;
        buy(s, d);
      } else if (d >= armStart) {
        const ref = refHighs[d]!;
        const canDeep = Number.isFinite(ref) && 1 - index.minClose[d]! / ref >= X;
        const canContinue =
          windowOpen && d > windowDay && d - windowDay <= W && index.minClose[d]! <= windowHigh * (1 - P);

        if (setupState === 1 || canDeep || canContinue) {
          for (let i = s; i < e; i++) {
            if (setupState === 0) {
              if (Number.isFinite(ref) && 1 - close[i]! / ref >= X) {
                setupKind = 'deep';
              } else if (windowOpen && d > windowDay && d - windowDay <= W && close[i]! <= windowHigh * (1 - P)) {
                setupKind = 'continuation';
              } else {
                continue;
              }

              setupState = 1;
              trailingLow = close[i]!;
              windowOpen = false;

              if (setupKind === 'deep') {
                deepSetups++;
              } else {
                continuationSetups++;
              }

              signals.push({ bar: i, type: setupKind === 'deep' ? 'arm deep' : 'arm continuation' });

              continue;
            }

            if (low[i]! < trailingLow) {
              trailingLow = low[i]!;
            }

            if (close[i]! < trailingLow * (1 + Y)) {
              continue;
            }

            const size = Math.min(account.notionalCap, cash / (1 + fee));

            if (!(size >= settings.minOrderNotional)) {
              cancelled++;
              signals.push({ bar: i, type: 'cancel' });
              setupState = 0;
              break;
            }

            pendingNotional = size;
            signals.push({ bar: i, type: 'buy' });
            setupState = 2;

            if (i + 1 < e) {
              entry = i + 1;
              buy(i + 1, d);
            }

            break;
          }
        }
      }

      // Marks: cash before the fill, then cash plus the BTC's liquidation value.
      if (entry < 0) {
        mark(cash, false);
        mark(cash, true);
      } else {
        for (let i = s; i < e; i++) {
          mark(i < entry ? before : cash + quantity * close[i]! * sell, i === e - 1);
        }
      }
    } else {
      const startCash = cash;
      const startQuantity = quantity;
      const netAt = (price: number) => quantity * price * sell - notional - entryFee;
      const held = d - entryDay;
      const stopActive = netAt(stop) > 0;
      const holdDue = held >= hold && netAt(open[s]!) < 0;
      let exit = -1;

      if (!Number.isNaN(carriedStop)) {
        sellAt(s, d, Math.min(carriedStop, open[s]!), 'trailing stop');
        exit = s;
      } else if (stopActive && open[s]! <= stop) {
        signals.push({ bar: s, type: 'stop gap' });
        sellAt(s, d, open[s]!, 'trailing stop gap');
        exit = s;
      } else if (carriedSale) {
        sellAt(s, d, open[s]!, 'buffered intraday loss');
        exit = s;
      } else if (holdDue) {
        signals.push({ bar: s, type: 'maximum hold' });

        for (let i = s; i < e; i++) {
          if (time[i]! >= time[s]! + secondsPerMinute) {
            sellAt(i, d, open[i]!, 'maximum hold');
            exit = i;
            break;
          }
        }
      } else {
        let stopIndex = -1;
        let signalIndex = -1;
        const threshold = -notional * params.intradayLossBuffer;

        if (stopActive && index.low[d]! <= stop) {
          for (let i = s; i < e; i++) {
            if (open[i]! <= stop || low[i]! <= stop) {
              stopIndex = i;
              break;
            }
          }
        }

        if (held >= hold && netAt(index.minClose[d]!) <= threshold) {
          for (let i = s; i < e; i++) {
            if (netAt(close[i]!) <= threshold) {
              signalIndex = i;
              break;
            }
          }
        }

        if (
          stopIndex >= 0 &&
          (signalIndex < 0 || stopIndex <= signalIndex || (stopIndex === signalIndex + 1 && open[stopIndex]! <= stop))
        ) {
          let price = NaN;
          let at = stopIndex;

          signals.push({ bar: stopIndex, type: 'stop' });

          if (open[stopIndex]! <= stop) {
            price = open[stopIndex]!;
          } else if (settings.stopFill === 'stop') {
            price = stop;
          } else {
            // priced (and recorded) at the next traded minute's open, the next day's first trade if none is left
            const limit = settings.stopFill === 'low' ? Math.min(stop, low[stopIndex]!) : stop;

            if (stopIndex + 1 < e) {
              at = stopIndex + 1;
              price = Math.min(limit, open[at]!);
            } else {
              carriedStop = limit;
              at = -1;
            }
          }

          if (at >= 0) {
            sellAt(at, d, price, 'trailing stop');
            exit = at;
          }
        } else if (signalIndex >= 0) {
          signals.push({ bar: signalIndex, type: 'buffered loss' });

          if (signalIndex + 1 < e) {
            sellAt(signalIndex + 1, d, open[signalIndex + 1]!, 'buffered intraday loss');
            exit = signalIndex + 1;
          } else {
            carriedSale = true;
          }
        }
      }

      for (let i = s; i < e; i++) {
        mark(exit < 0 || i < exit ? startCash + startQuantity * close[i]! * sell : cash, i === e - 1);
      }

      if (long && Number.isNaN(carriedStop)) {
        if (index.high[d]! > postEntryHigh) {
          postEntryHigh = index.high[d]!;
        }

        stop = Math.max(stop, postEntryHigh * (1 - S));
      }
    }

    if (windowOpen) {
      if (d > windowDay && index.high[d]! > windowHigh) {
        windowHigh = index.high[d]!;
      }

      if (d - windowDay >= W) {
        windowOpen = false;
      }
    }
  }

  let unrealized = 0;
  const lastBar = index.barEnd[index.days - 1]! - 1;

  if (long && current) {
    const price = close[lastBar]!;

    unrealized = quantity * price * sell - notional - entryFee;
    current.exitTime = time[lastBar]!;
    current.exitDay = index.firstDay + index.days - 1;
    current.exitBar = lastBar;
    current.exitPrice = price;
    current.exitFee = quantity * price * (1 - impact) * fee;
    current.grossPnl = quantity * (price - current.entryPrice);
    current.netPnl = unrealized;
  }

  for (const w of windows) {
    if (!w.opened) {
      w.startEquity = marked;
      w.endEquity = marked;
    }

    w.net = w.endEquity - w.startEquity;
  }

  return {
    trades,
    windows,
    cash,
    quantity: long ? quantity : 0,
    equity: cash + (long ? quantity * close[lastBar]! * sell : 0),
    realized,
    unrealized,
    deepSetups,
    continuationSetups,
    cancelled,
    signals
  };
};
