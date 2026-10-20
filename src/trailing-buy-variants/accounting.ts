// Mark-to-market accounting from a trade list, as src/four-family/accounting.ts (which reproduces the strategy
// files' accounting expression by expression), generalized to trades made of several legs (the staged add).
// A single-leg trade gives exactly the four-family result (tests/equivalence.test.ts).
//
// - Interest is simple interest on each leg's investment, accrued per calendar day from the leg's entry
//   session's date, nothing on that date.
// - A closed trade's profit is the sum over its legs of shares x exit price - investment - interest through
//   the exit session's date.
// - Minute-sampled marks: at each regular-session minute's close and then at the official close, the realized
//   profit plus every leg held at that minute (from its fill's minute until the exit's minute) marked at that
//   price, net of interest through the session's date.
// - Daily marks: the realized profit plus the legs open at the close, marked at the close.
// - Drawdown: the largest fall from an earlier peak, with the peak starting at 0 on the run's first session.
// Segments attribute one continuous run (see the four-family accounting); nothing is reset or re-based.
import type { Dataset } from '../four-family/data.ts';

const secondsPerDay = 24 * 60 * 60;
const secondsPerYear = 365 * secondsPerDay;

export interface AccountingLeg {
  entryIndex: number;
  entryBar: number;
  entryTimestamp: number;
  investment: number;
  shares: number;
}

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
  legs?: AccountingLeg[]; // absent: one leg from the fields above
}

export interface Segment {
  label: string;
  start: number;
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
  capitalDays: number; // sum over legs of investment x calendar days held inside the segment
  openAtEnd: boolean;
}

export interface TradeOutcome {
  profit: number; // closed: realized; open: marked at the run's last close
  interest: number;
  holdDays: number;
  capitalDays: number; // sum over legs of investment x calendar days held
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
  outcomes: TradeOutcome[];
  segments: SegmentMetrics[];
  dailyMarks?: Float64Array;
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
  firstIndex: number;
  endIndex: number;
  marginInterestRate: number;
  segments?: Segment[];
  dailyMarks?: boolean;
}

export const legsOf = (trade: AccountingTrade): AccountingLeg[] =>
  trade.legs ?? [
    {
      entryIndex: trade.entryIndex,
      entryBar: trade.entryBar,
      entryTimestamp: trade.entryTimestamp,
      investment: trade.investment,
      shares: trade.shares
    }
  ];

export const replay = (ds: Dataset, trades: readonly AccountingTrade[], options: ReplayOptions): AccountingResult => {
  const { firstIndex, endIndex, marginInterestRate } = options;
  const segments = options.segments ?? [];
  const { sTime, sCloseTime, sClose, sBarStart, sBarCount, bTime, bClose } = ds;
  const legInterest = (leg: AccountingLeg, time: number) =>
    leg.investment * marginInterestRate * ((time - leg.entryTimestamp) / secondsPerYear);
  const outcomes: TradeOutcome[] = trades.map(() => ({
    profit: 0,
    interest: 0,
    holdDays: 0,
    capitalDays: 0,
    isOpen: true
  }));
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
  let tradeIndex = 0;
  const activeSegments: number[] = [];

  if (dailyMarks) {
    dailyMarks[firstIndex] = 0;
  }

  for (let s = firstIndex + 1; s <= endIndex; s++) {
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
    let heldUntil = Infinity;
    let openAtClose = false;
    // The legs entered by this session, with their interest through its date.
    const legs = position ? legsOf(position).filter((leg) => leg.entryIndex <= s) : [];
    const interests = legs.map((leg) => legInterest(leg, sTime[s]!));

    if (position) {
      if (position.exitIndex === s) {
        heldUntil = position.exitBar;

        let profit = 0;
        let interest = 0;
        let capitalDays = 0;

        legs.forEach((leg, index) => {
          profit += leg.shares * position.exitPrice - leg.investment - interests[index]!;
          interest += interests[index]!;
          capitalDays += (leg.investment * (sTime[s]! - leg.entryTimestamp)) / secondsPerDay;
        });

        const outcome = outcomes[tradeIndex]!;

        outcome.profit = profit;
        outcome.interest = interest;
        outcome.holdDays = (sTime[s]! - position.entryTimestamp) / secondsPerDay;
        outcome.capitalDays = capitalDays;
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
        const base = k >= heldUntil ? realized : realizedAtStart;
        let legSum = 0;

        if (k < heldUntil) {
          legs.forEach((leg, index) => {
            if (leg.entryIndex < s || k >= leg.entryBar) {
              legSum += leg.shares * price - leg.investment - interests[index]!;
            }
          });
        }

        update(base + legSum, time);
      }
    } else {
      update(realized, sCloseTime[s]!);
    }

    let legSumAtClose = 0;

    if (openAtClose) {
      legs.forEach((leg, index) => {
        legSumAtClose += leg.shares * sClose[s]! - leg.investment - interests[index]!;
      });
    }

    const daily = realized + legSumAtClose;

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

    for (let active = activeSegments.length - 1; active >= 0; active--) {
      const index = activeSegments[active]!;

      if (segments[index]!.end === s) {
        segmentState[index]!.closingMark = daily;
        activeSegments.splice(active, 1);
      }
    }
  }

  const lastTime = sTime[endIndex]!;
  let unrealizedProfit = 0;
  let accruedInterest = 0;

  trades.forEach((trade, index) => {
    const outcome = outcomes[index]!;

    if (outcome.isOpen && trade.entryIndex <= endIndex) {
      let profit = 0;
      let interest = 0;
      let capitalDays = 0;

      for (const leg of legsOf(trade)) {
        if (leg.entryIndex <= endIndex) {
          const legAccrued = legInterest(leg, lastTime);

          profit += leg.shares * sClose[endIndex]! - leg.investment - legAccrued;
          interest += legAccrued;
          capitalDays += (leg.investment * (lastTime - leg.entryTimestamp)) / secondsPerDay;
        }
      }

      outcome.interest = interest;
      outcome.profit = profit;
      outcome.holdDays = (lastTime - trade.entryTimestamp) / secondsPerDay;
      outcome.capitalDays = capitalDays;
      unrealizedProfit += profit;
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
    let capitalDays = 0;
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

      const to = trade.exitIndex >= 0 && trade.exitIndex <= segment.end ? sTime[trade.exitIndex]! : sTime[segment.end]!;

      for (const leg of legsOf(trade)) {
        if (leg.entryIndex > segment.end) {
          continue;
        }

        const from = Math.max(leg.entryTimestamp, previousTime);
        const span = Math.max(0, to - from);

        segmentInterest += leg.investment * marginInterestRate * (span / secondsPerYear);
        capitalDays += (leg.investment * span) / secondsPerDay;
      }
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
      capitalDays,
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
