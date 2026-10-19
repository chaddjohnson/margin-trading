// Mark-to-market accounting from a trade list, shared by the four trailing-buy families and the allIn.ts
// comparator, so every strategy's profit, interest and drawdowns come from the same code.
//
// It reproduces the strategy files' own accounting, expression by expression:
// - Interest is simple interest on the investment, accrued per calendar day from the entry session's date:
//   investment x rate x (session time - entry time) / 365 days, with nothing on the entry session.
// - A closed trade's profit is shares x exit price - investment - interest through the exit session's date,
//   added to the realized profit in exit order.
// - Minute-sampled marks: at each regular-session minute's close and then at the official close, the realized
//   profit plus the held position marked at that price, net of interest through the session's date. The
//   position counts from its fill's minute (all minutes when open at the start) until its exit's minute, and
//   the realized profit switches to the post-exit value from the exit's minute on.
// - Daily marks: the realized profit plus any position open at the close, marked at the close.
// - Drawdown: the largest fall from an earlier peak, with the peak starting at 0 on the run's first session.
//
// Segments (calendar years, walk-forward windows, the holdout) attribute the same continuous run: a segment's
// net profit is the change in the daily mark from the close before its first session to the close of its last,
// and its drawdowns start from a peak equal to that opening mark. Nothing is reset or re-based: a position
// open across a boundary stays open, and its profit lands in whichever segment the prices moved in.
import type { Dataset } from './data.ts';

const secondsPerDay = 24 * 60 * 60;
const secondsPerYear = 365 * secondsPerDay;

// The fields of a trade that accounting needs; engine.ts's Trade and the allIn comparator's trades have them.
export interface AccountingTrade {
  entryIndex: number;
  entryBar: number;
  entryTimestamp: number;
  entryPrice: number;
  investment: number;
  shares: number;
  exitIndex: number; // -1 while open
  exitBar: number;
  exitPrice: number;
}

export interface Segment {
  label: string;
  start: number; // session indices, inclusive
  end: number;
}

export interface DrawdownStats {
  maximum: number;
  peakTime: number;
  troughTime: number;
}

export interface SegmentMetrics {
  label: string;
  start: number;
  end: number;
  startDate: string;
  endDate: string;
  sessions: number;
  openingMark: number;
  closingMark: number;
  net: number;
  interest: number;
  minuteDrawdown: DrawdownStats;
  dailyDrawdown: DrawdownStats;
  entries: number;
  exits: number;
  wins: number;
  losses: number;
  heldAtCloseSessions: number;
  openAtEnd: boolean;
}

export interface TradeOutcome {
  profit: number; // closed: realized; open: marked at the run's last close
  interest: number;
  holdDays: number;
  isOpen: boolean;
}

export interface AccountingResult {
  realizedProfit: number;
  unrealizedProfit: number;
  netProfit: number;
  closedInterest: number;
  accruedInterest: number;
  minuteDrawdown: DrawdownStats;
  dailyDrawdown: DrawdownStats;
  outcomes: TradeOutcome[]; // per trade, in trade order
  segments: SegmentMetrics[];
  dailyMarks?: Float64Array; // per session index, NaN outside the run
}

class Tracker {
  peak: number;
  peakTime: number;
  maximum = 0;
  ddPeakTime: number;
  troughTime: number;

  constructor(peak: number, time: number) {
    this.peak = peak;
    this.peakTime = time;
    this.ddPeakTime = time;
    this.troughTime = time;
  }

  update(mark: number, time: number) {
    if (mark > this.peak) {
      this.peak = mark;
      this.peakTime = time;
    }

    if (this.peak - mark > this.maximum) {
      this.maximum = this.peak - mark;
      this.ddPeakTime = this.peakTime;
      this.troughTime = time;
    }
  }

  stats(): DrawdownStats {
    return { maximum: this.maximum, peakTime: this.ddPeakTime, troughTime: this.troughTime };
  }
}

export interface ReplayOptions {
  firstIndex: number; // the run's first session (skipped by the strategies, always flat)
  endIndex: number;
  marginInterestRate: number;
  segments?: Segment[];
  dailyMarks?: boolean;
}

export const replay = (ds: Dataset, trades: readonly AccountingTrade[], options: ReplayOptions): AccountingResult => {
  const { firstIndex, endIndex, marginInterestRate } = options;
  const segments = options.segments ?? [];
  const { sTime, sCloseTime, sClose, sBarStart, sBarCount, bTime, bClose } = ds;
  const interestAt = (trade: AccountingTrade, time: number) =>
    trade.investment * marginInterestRate * ((time - trade.entryTimestamp) / secondsPerYear);
  const outcomes: TradeOutcome[] = trades.map(() => ({ profit: 0, interest: 0, holdDays: 0, isOpen: true }));
  const dailyMarks = options.dailyMarks ? new Float64Array(ds.sessionCount).fill(NaN) : undefined;
  const minuteTracker = new Tracker(0, ds.bTime[ds.sBarStart[firstIndex]!] ?? 0);
  const dailyTracker = new Tracker(0, sTime[firstIndex] ?? 0);

  for (const segment of segments) {
    if (segment.start <= firstIndex || segment.end > endIndex || segment.end < segment.start) {
      throw new Error(`Segment ${segment.label} ${segment.start}..${segment.end} is outside the run`);
    }
  }

  const segmentState = segments.map(() => ({
    minute: undefined as Tracker | undefined,
    daily: undefined as Tracker | undefined,
    openingMark: 0,
    closingMark: 0,
    heldAtClose: 0
  }));

  let realized = 0;
  let previousDaily = 0;
  let tradeIndex = 0; // the first trade not yet closed
  const activeSegments: number[] = [];

  if (dailyMarks) {
    dailyMarks[firstIndex] = 0;
  }

  for (let s = firstIndex + 1; s <= endIndex; s++) {
    // Segments opening this session start from the previous close's mark.
    segments.forEach((segment, index) => {
      if (segment.start === s) {
        const state = segmentState[index]!;

        state.openingMark = previousDaily;
        state.minute = new Tracker(previousDaily, sCloseTime[s - 1]!);
        state.daily = new Tracker(previousDaily, sTime[s - 1]!);
        activeSegments.push(index);
      }
    });

    while (tradeIndex < trades.length && trades[tradeIndex]!.exitIndex >= 0 && trades[tradeIndex]!.exitIndex < s) {
      tradeIndex++;
    }

    const candidate = trades[tradeIndex];
    const position = candidate && candidate.entryIndex <= s ? candidate : undefined;
    const realizedAtStart = realized;
    const count = sBarCount[s]!;
    const start = sBarStart[s]!;
    let heldFrom = Infinity;
    let heldUntil = Infinity;
    let interest = 0;
    let openAtClose = false;

    if (position) {
      heldFrom = position.entryIndex === s ? position.entryBar : 0;
      interest = interestAt(position, sTime[s]!);

      if (position.exitIndex === s) {
        heldUntil = position.exitBar;

        const profit = position.shares * position.exitPrice - position.investment - interest;
        const outcome = outcomes[tradeIndex]!;

        outcome.profit = profit;
        outcome.interest = interest;
        outcome.holdDays = (sTime[s]! - position.entryTimestamp) / secondsPerDay;
        outcome.isOpen = false;
        realized += profit;
      } else {
        openAtClose = true;
      }
    }

    const update = (mark: number, time: number) => {
      minuteTracker.update(mark, time);

      for (const index of activeSegments) {
        segmentState[index]!.minute!.update(mark, time);
      }
    };

    if (position) {
      for (let k = 0; k <= count; k++) {
        const price = k < count ? bClose[start + k]! : sClose[s]!;
        const time = k < count ? bTime[start + k]! : sCloseTime[s]!;
        const isHeld = k >= heldFrom && k < heldUntil;
        const base = k >= heldUntil ? realized : realizedAtStart;

        update(base + (isHeld ? position.shares * price - position.investment - interest : 0), time);
      }
    } else {
      update(realized, sCloseTime[s]!);
    }

    const daily = realized + (openAtClose ? position!.shares * sClose[s]! - position!.investment - interest : 0);

    dailyTracker.update(daily, sTime[s]!);

    if (dailyMarks) {
      dailyMarks[s] = daily;
    }

    for (const index of activeSegments) {
      const state = segmentState[index]!;

      state.daily!.update(daily, sTime[s]!);

      if (openAtClose) {
        state.heldAtClose++;
      }
    }

    previousDaily = daily;

    for (let position = activeSegments.length - 1; position >= 0; position--) {
      const index = activeSegments[position]!;

      if (segments[index]!.end === s) {
        segmentState[index]!.closingMark = daily;
        activeSegments.splice(position, 1);
      }
    }
  }

  // A position still open at the end is marked at the last close.
  const lastTime = sTime[endIndex]!;
  let unrealizedProfit = 0;
  let accruedInterest = 0;

  trades.forEach((trade, index) => {
    const outcome = outcomes[index]!;

    if (outcome.isOpen && trade.entryIndex <= endIndex) {
      const interest = interestAt(trade, lastTime);

      outcome.interest = interest;
      outcome.profit = trade.shares * sClose[endIndex]! - trade.investment - interest;
      outcome.holdDays = (lastTime - trade.entryTimestamp) / secondsPerDay;
      unrealizedProfit += outcome.profit;
      accruedInterest += interest;
    }
  });

  const closedInterest = outcomes.reduce((total, outcome) => total + (outcome.isOpen ? 0 : outcome.interest), 0);

  const segmentMetrics = segments.map((segment, index): SegmentMetrics => {
    const state = segmentState[index]!;
    const previousTime = sTime[segment.start - 1]!;
    let entries = 0;
    let exits = 0;
    let wins = 0;
    let losses = 0;
    let segmentInterest = 0;
    let openAtEnd = false;

    trades.forEach((trade, tradeIndex) => {
      const outcome = outcomes[tradeIndex]!;

      if (trade.entryIndex >= segment.start && trade.entryIndex <= segment.end) {
        entries++;
      }

      if (!outcome.isOpen && trade.exitIndex >= segment.start && trade.exitIndex <= segment.end) {
        exits++;

        if (outcome.profit > 0) {
          wins++;
        } else {
          losses++;
        }
      }

      if (trade.entryIndex <= segment.end && (trade.exitIndex < 0 || trade.exitIndex > segment.end)) {
        openAtEnd = true;
      }

      if (trade.entryIndex > segment.end || (trade.exitIndex >= 0 && trade.exitIndex < segment.start)) {
        return;
      }

      const from = Math.max(trade.entryTimestamp, previousTime);
      const to = trade.exitIndex >= 0 && trade.exitIndex <= segment.end ? sTime[trade.exitIndex]! : sTime[segment.end]!;

      segmentInterest += Math.max(0, trade.investment * marginInterestRate * ((to - from) / secondsPerYear));
    });

    return {
      label: segment.label,
      start: segment.start,
      end: segment.end,
      startDate: ds.dates[segment.start]!,
      endDate: ds.dates[segment.end]!,
      sessions: segment.end - segment.start + 1,
      openingMark: state.openingMark,
      closingMark: state.closingMark,
      net: state.closingMark - state.openingMark,
      interest: segmentInterest,
      minuteDrawdown: state.minute!.stats(),
      dailyDrawdown: state.daily!.stats(),
      entries,
      exits,
      wins,
      losses,
      heldAtCloseSessions: state.heldAtClose,
      openAtEnd
    };
  });

  return {
    realizedProfit: realized,
    unrealizedProfit,
    netProfit: realized + unrealizedProfit,
    closedInterest,
    accruedInterest,
    minuteDrawdown: minuteTracker.stats(),
    dailyDrawdown: dailyTracker.stats(),
    outcomes,
    segments: segmentMetrics,
    dailyMarks
  };
};
