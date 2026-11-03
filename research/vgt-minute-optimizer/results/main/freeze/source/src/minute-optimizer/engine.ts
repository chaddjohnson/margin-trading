// The fast evaluator: the decision rules of src/app/allIn.ts, unchanged, over the precomputed session
// index (data.ts) instead of MarketSession objects. It is checked against the literal working copy
// (src/app/allIn-minute-optimizable.ts), and through it against the original, by goldenMaster.ts.
//
// What makes it fast, without changing any decision:
// - Each session is handled in O(1), except a session that starts with an active stop, which finds the
//   first minute reaching the stop by binary search over the running minimum of min(open, low).
// - Entry decision prices, entry fills, the post-entry high after an entry and the maximum-hold fill don't
//   depend on parameters and are read from the index.
// - The minute-sampled mark to market isn't replayed minute by minute. Within a session the marks of a held
//   position are an increasing function of the minute's price, so the largest fall over a span of marks is
//   max(peak before the span - lowest mark, shares x largest price fall within the span), and the new peak
//   is the highest mark; the prefix and entry-span statistics give those in O(1). Flat spans are constant.
//   This equals the original's minute loop up to floating-point rounding (checked to 1e-6 dollars).
// - Reference highs come from a sliding-window maximum over session highs (window.ts).
//
// Extra costs are an accounting layer, as in the working copy: per cost level, an entry pays
// rate x investment at its fill, an exit pays rate x shares x exit price, and an open position is marked
// net of the cost of selling it. Every decision uses the cost-free prices and profits.
import { incumbentParams, type MinuteParams, tenthsToFraction } from '../app/allIn-minute-optimizable.ts';
import { Execution, type MinuteDataset } from './data.ts';

const secondsPerDay = 24 * 60 * 60;
const secondsPerYear = 365 * secondsPerDay;

export const investmentAmount = 100000;
export const marginInterestRate = 0.11;

export type StopFill = 'stop' | 'next-open';

export type ExitReason = 'maximum hold' | 'trailing stop' | 'trailing stop gap';

export interface EngineSettings {
  stopFill: StopFill;
  // Extra costs per side in basis points. Level 0 (no extra cost) is always computed first.
  costBps: readonly number[];
}

export const defaultCostBps = [5, 10, 20] as const;

export const defaultSettings: EngineSettings = { stopFill: 'stop', costBps: defaultCostBps };

// Session indices into the dataset. Sessions from historyStart to startIndex - 1 are history for the
// reference high only; trading, marks and logs run from startIndex to endIndex (inclusive). A session with
// no earlier history at all (index === historyStart) only seeds the window, as the original's first session.
export interface EvalWindow {
  historyStart: number;
  startIndex: number;
  endIndex: number;
}

export interface EngineTrade {
  entryIndex: number;
  exitIndex: number; // -1 while open
  decisionPrice: number;
  referenceHigh: number;
  entryPrice: number;
  entryBar: number;
  entryExecution: number;
  exitPrice: number; // the window's last close while open
  exitBar: number; // -1 while open
  exitExecution: number;
  exitStopPrice: number; // the stop in force for the exit session, NaN while open
  maximumHoldDue: boolean;
  reason: ExitReason | 'open';
  shares: number;
  interest: number;
  profit: number; // cost-free; for an open position, marked at the last close
  holdDays: number;
}

export interface LevelResult {
  bps: number;
  costs: number;
  netProfit: number;
  maximumDrawdown: number; // daily mark to market
  minuteMaximumDrawdown: number;
}

export interface YearResult {
  year: number;
  entries: number;
  net: number[]; // change in the daily mark over the year's sessions in the window, per level
}

export interface EngineResult {
  sessions: number;
  trades: EngineTrade[];
  realizedProfit: number;
  unrealizedProfit: number;
  netProfit: number;
  closedInterest: number;
  accruedInterest: number;
  maximumDrawdown: number; // daily, cost-free
  minuteMaximumDrawdown: number; // minute-sampled, cost-free
  levels: LevelResult[]; // level 0 = cost-free, then settings.costBps in order
  entriesWithoutTrade: number;
  exposureSessions: number;
  restrictions: number;
  lowerPriceReentries: number;
  recoveryResets: number;
  lossesNotRestricted: number;
  turnover: number; // notional bought and sold, including selling an open position at the last close
  years: YearResult[];
  dailyMarks?: Float64Array; // detail mode: cost-free daily marks over the window
}

const reasons: ExitReason[] = ['maximum hold', 'trailing stop', 'trailing stop gap'];

// The first minute of the session (relative index) whose running min(open, low) reaches the stop, or -1.
const firstTrigger = (triggerMin: Float64Array, start: number, count: number, stop: number) => {
  if (!(triggerMin[start + count - 1]! <= stop)) {
    return -1;
  }

  let low = 0;
  let high = count - 1;

  while (low < high) {
    const middle = (low + high) >> 1;

    if (triggerMin[start + middle]! <= stop) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
};

export const simulate = (
  ds: MinuteDataset,
  referenceHighs: Float64Array,
  params: MinuteParams = incumbentParams,
  window: EvalWindow,
  settings: EngineSettings = defaultSettings,
  detail = false
): EngineResult => {
  const { historyStart, startIndex, endIndex } = window;
  const targetPercentChange = tenthsToFraction(params.dipTenths);
  const trailingStopPercentage = tenthsToFraction(params.trailingStopTenths);
  const maximumHoldDays = params.maximumHoldDays;
  const materialLossThreshold = tenthsToFraction(params.materialLossTenths);
  const lowerPriceReentry = tenthsToFraction(params.lowerReentryTenths);
  const retraceFraction = tenthsToFraction(params.retraceTenths);
  const nextOpen = settings.stopFill === 'next-open';
  const levelBps = [0, ...settings.costBps];
  const levelCount = levelBps.length;
  const rates = levelBps.map((bps) => bps / 10000);

  if (startIndex < historyStart || endIndex >= ds.sessionCount) {
    throw new Error(`Window ${historyStart}/${startIndex}/${endIndex} is outside the dataset`);
  }

  const trades: EngineTrade[] = [];
  const years: YearResult[] = [];
  const paid = new Float64Array(levelCount);
  const minutePeak = new Float64Array(levelCount);
  const minuteDrawdown = new Float64Array(levelCount);
  const dailyPeak = new Float64Array(levelCount);
  const dailyDrawdown = new Float64Array(levelCount);
  const lastMark = new Float64Array(levelCount);
  const yearStart = new Float64Array(levelCount);
  const dailyMarks = detail ? new Float64Array(Math.max(0, endIndex - startIndex + 1)) : undefined;

  let open = false;
  let shares = 0;
  let entryTime = 0;
  let postEntryHigh = 0;
  let stopPrice = 0;
  let realizedProfit = 0;
  let entryReferenceHigh = 0;
  let current: EngineTrade | undefined;

  let restricted = false;
  let restrictionHigh = 0;
  let lowerLevel = 0;
  let episodeLow = 0;

  let entriesWithoutTrade = 0;
  let exposureSessions = 0;
  let restrictions = 0;
  let lowerPriceReentries = 0;
  let recoveryResets = 0;
  let lossesNotRestricted = 0;
  let turnover = 0;
  let year: YearResult | undefined;

  // Minute marks of a held span: the cost-free mark is realized + (shares x price - investment - interest),
  // as in the original; each cost level subtracts what it has paid and the cost of selling at the mark.
  const heldSpan = (
    level: number,
    base: number,
    interest: number,
    minPrice: number,
    maxPrice: number,
    drop: number
  ) => {
    const rate = rates[level]!;
    const lowMark = base + (shares * minPrice - investmentAmount - interest - rate * shares * minPrice);
    const highMark = base + (shares * maxPrice - investmentAmount - interest - rate * shares * maxPrice);
    const peak = minutePeak[level]!;

    minuteDrawdown[level] = Math.max(minuteDrawdown[level]!, peak - lowMark, shares * (1 - rate) * drop);
    minutePeak[level] = Math.max(peak, highMark);
  };

  const flatSpan = (level: number, mark: number) => {
    minutePeak[level] = Math.max(minutePeak[level]!, mark);
    minuteDrawdown[level] = Math.max(minuteDrawdown[level]!, minutePeak[level]! - mark);
  };

  for (let index = startIndex; index <= endIndex; index++) {
    const sessionTime = ds.sTime[index]!;
    const sessionClose = ds.sClose[index]!;
    const sessionYear = ds.sYear[index]!;

    if (year?.year !== sessionYear) {
      if (year) {
        yearStart.set(lastMark);
      }

      year = { year: sessionYear, entries: 0, net: Array.from({ length: levelCount }, () => 0) };
      years.push(year);
    }

    // The original's first session, with no earlier session for the reference high, only seeds the window.
    if (index === historyStart) {
      if (dailyMarks) {
        dailyMarks[index - startIndex] = 0;
      }

      continue;
    }

    const recentHigh = referenceHighs[index]!;
    const decisionPrice = ds.decisionPrice[index]!;
    const percentChange = 1 - decisionPrice / recentHigh;
    const signal = percentChange >= targetPercentChange;
    const barStart = ds.sBarStart[index]!;
    const barCount = ds.sBarCount[index]!;
    const markStart = ds.sMarkStart[index]!;
    let enteredToday = false;

    if (!open) {
      let buy = signal;

      if (buy && restricted) {
        const provisionalLow = Math.min(episodeLow, decisionPrice);
        const resetLevel = provisionalLow + retraceFraction * (restrictionHigh - provisionalLow);

        if (decisionPrice >= resetLevel || decisionPrice > lowerLevel) {
          buy = false;
        }
      }

      if (buy) {
        const fillPrice = ds.entryFillPrice[index]!;

        if (Number.isNaN(fillPrice)) {
          entriesWithoutTrade++;
        } else {
          const fillBar = ds.entryFillBar[index]!;

          shares = investmentAmount / fillPrice;
          entryTime = sessionTime;
          entryReferenceHigh = recentHigh;
          postEntryHigh = ds.entryPostHigh[index]!;
          stopPrice = postEntryHigh * (1 - trailingStopPercentage);
          open = true;
          enteredToday = true;
          year.entries++;
          turnover += investmentAmount;
          current = {
            entryIndex: index,
            exitIndex: -1,
            decisionPrice,
            referenceHigh: recentHigh,
            entryPrice: fillPrice,
            entryBar: fillBar,
            entryExecution: ds.entryFillExec[index]!,
            exitPrice: NaN,
            exitBar: -1,
            exitExecution: Execution.none,
            exitStopPrice: NaN,
            maximumHoldDue: false,
            reason: 'open',
            shares,
            interest: 0,
            profit: 0,
            holdDays: 0
          };
          trades.push(current);

          // Marks from the fill's minute to the close; no interest on the entry day.
          for (let level = 0; level < levelCount; level++) {
            flatSpan(level, realizedProfit - paid[level]!);
            paid[level] = paid[level]! + rates[level]! * investmentAmount;
            heldSpan(
              level,
              realizedProfit - paid[level]!,
              0,
              ds.entrySegMin[index]!,
              ds.entrySegMax[index]!,
              ds.entrySegDrop[index]!
            );
          }
        }
      }
    } else {
      // The position held since an earlier session.
      const interest = investmentAmount * marginInterestRate * ((sessionTime - entryTime) / secondsPerYear);
      const sessionOpen = ds.sOpen[index]!;
      const isStopActive = shares * stopPrice - investmentAmount - interest > 0;
      const daysHeld = (sessionTime - entryTime) / secondsPerDay;
      const isMaximumHoldDue = daysHeld >= maximumHoldDays && shares * sessionOpen - investmentAmount - interest < 0;
      let exitPrice = NaN;
      let exitBar = -1;
      let exitExecution: number = Execution.none;
      let reason = -1;

      if (isStopActive && sessionOpen <= stopPrice) {
        exitPrice = sessionOpen;
        exitBar = 0;
        exitExecution = Execution.openingTrade;
        reason = 2;
      } else if (isMaximumHoldDue) {
        const holdPrice = ds.holdFillPrice[index]!;

        if (!Number.isNaN(holdPrice)) {
          exitPrice = holdPrice;
          exitBar = ds.holdFillBar[index]!;
          exitExecution = ds.holdFillExec[index]!;
          reason = 0;
        }
      } else if (isStopActive) {
        const trigger = firstTrigger(ds.bTriggerMin, barStart, barCount, stopPrice);

        if (trigger >= 0) {
          const minuteOpen = ds.bOpen[barStart + trigger]!;

          reason = 1;

          if (minuteOpen <= stopPrice) {
            exitPrice = minuteOpen;
            exitBar = trigger;
            exitExecution = Execution.minuteOpenThroughStop;
          } else if (!nextOpen) {
            exitPrice = stopPrice;
            exitBar = trigger;
            exitExecution = Execution.stopLevel;
          } else if (ds.bNextBar[barStart + trigger]! >= 0) {
            exitPrice = ds.bNextPrice[barStart + trigger]!;
            exitBar = ds.bNextBar[barStart + trigger]!;
            exitExecution = ds.bNextExec[barStart + trigger]!;
          } else {
            exitPrice = ds.bClose[barStart + trigger]!;
            exitBar = trigger;
            exitExecution = Execution.triggerMinuteClose;
          }
        }
      }

      if (reason >= 0) {
        const profit = shares * exitPrice - investmentAmount - interest;
        const realizedAtStart = realizedProfit;
        const exitNotional = shares * exitPrice;

        realizedProfit += profit;
        turnover += exitNotional;

        // Held marks before the exit's minute, then flat marks from it.
        for (let level = 0; level < levelCount; level++) {
          if (exitBar > 0) {
            heldSpan(
              level,
              realizedAtStart - paid[level]!,
              interest,
              ds.mPrefMin[markStart + exitBar]!,
              ds.mPrefMax[markStart + exitBar]!,
              ds.mPrefDrop[markStart + exitBar]!
            );
          }

          paid[level] = paid[level]! + rates[level]! * shares * exitPrice;
          flatSpan(level, realizedProfit - paid[level]!);
        }

        const priceReturn = exitPrice / current!.entryPrice - 1;

        Object.assign(current!, {
          exitIndex: index,
          exitPrice,
          exitBar,
          exitExecution,
          exitStopPrice: stopPrice,
          maximumHoldDue: isMaximumHoldDue,
          reason: reasons[reason]!,
          interest,
          profit,
          holdDays: daysHeld
        });
        open = false;
        current = undefined;

        if (priceReturn <= -materialLossThreshold) {
          restricted = true;
          restrictions++;
          restrictionHigh = entryReferenceHigh;
          lowerLevel = exitPrice * (1 - lowerPriceReentry);
          episodeLow = sessionClose;
        } else if (profit < 0) {
          lossesNotRestricted++;
        }
      } else {
        for (let level = 0; level < levelCount; level++) {
          heldSpan(
            level,
            realizedProfit - paid[level]!,
            interest,
            ds.mPrefMin[markStart + barCount + 1]!,
            ds.mPrefMax[markStart + barCount + 1]!,
            ds.mPrefDrop[markStart + barCount + 1]!
          );
        }

        // After the session, raise the high and the stop for the next session. The stop never moves down.
        postEntryHigh = Math.max(postEntryHigh, ds.sHigh[index]!);
        stopPrice = Math.max(stopPrice, postEntryHigh * (1 - trailingStopPercentage));
      }
    }

    // The daily mark at the close.
    const unrealized = open
      ? shares * sessionClose -
        investmentAmount -
        investmentAmount * marginInterestRate * ((sessionTime - entryTime) / secondsPerYear)
      : 0;
    const markedProfit = realizedProfit + unrealized;

    for (let level = 0; level < levelCount; level++) {
      const mark = markedProfit - paid[level]! - (open ? rates[level]! * shares * sessionClose : 0);

      dailyPeak[level] = Math.max(dailyPeak[level]!, mark);
      dailyDrawdown[level] = Math.max(dailyDrawdown[level]!, dailyPeak[level]! - mark);
      lastMark[level] = mark;
      year.net[level] = mark - yearStart[level]!;
    }

    if (dailyMarks) {
      dailyMarks[index - startIndex] = markedProfit;
    }

    exposureSessions += open ? 1 : 0;

    // End of the session: resolve the restriction.
    if (restricted) {
      episodeLow = Math.min(episodeLow, sessionClose);

      if (open && enteredToday) {
        restricted = false;
        lowerPriceReentries++;
      } else if (!open && sessionClose >= episodeLow + retraceFraction * (restrictionHigh - episodeLow)) {
        restricted = false;
        recoveryResets++;
      }
    }
  }

  let unrealizedProfit = 0;
  let accruedInterest = 0;
  const lastClose = endIndex >= startIndex ? ds.sClose[endIndex]! : NaN;

  if (open && current) {
    const lastTime = ds.sTime[endIndex]!;

    accruedInterest = investmentAmount * marginInterestRate * ((lastTime - entryTime) / secondsPerYear);
    unrealizedProfit = shares * lastClose - investmentAmount - accruedInterest;
    current.exitPrice = lastClose;
    current.interest = accruedInterest;
    current.profit = unrealizedProfit;
    current.holdDays = (lastTime - entryTime) / secondsPerDay;
    turnover += shares * lastClose;
  }

  const closedInterest = trades.reduce((total, trade) => total + (trade.reason === 'open' ? 0 : trade.interest), 0);
  const netProfit = realizedProfit + unrealizedProfit;
  const levels = levelBps.map((bps, level) => {
    const openCost = open ? rates[level]! * shares * lastClose : 0;

    return {
      bps,
      costs: paid[level]! + openCost,
      netProfit: netProfit - paid[level]! - openCost,
      maximumDrawdown: dailyDrawdown[level]!,
      minuteMaximumDrawdown: minuteDrawdown[level]!
    };
  });

  return {
    sessions: Math.max(0, endIndex - startIndex + 1),
    trades,
    realizedProfit,
    unrealizedProfit,
    netProfit,
    closedInterest,
    accruedInterest,
    maximumDrawdown: dailyDrawdown[0]!,
    minuteMaximumDrawdown: minuteDrawdown[0]!,
    levels,
    entriesWithoutTrade,
    exposureSessions,
    restrictions,
    lowerPriceReentries,
    recoveryResets,
    lossesNotRestricted,
    turnover,
    years,
    dailyMarks
  };
};

// The highest session high of the `lookback` sessions before each session, never reaching back before
// historyStart, or -Infinity without any (Math.max() of an empty window, as in the original).
export const computeReferenceHighs = (high: ArrayLike<number>, lookback: number, historyStart = 0) => {
  const result = new Float64Array(high.length).fill(-Infinity);
  const deque = new Int32Array(high.length);
  let head = 0;
  let tail = 0;

  for (let index = historyStart; index < high.length; index++) {
    while (head < tail && deque[head]! < index - lookback) {
      head++;
    }

    result[index] = head < tail ? high[deque[head]!]! : -Infinity;

    while (head < tail && high[deque[tail - 1]!]! <= high[index]!) {
      tail--;
    }

    deque[tail++] = index;
  }

  return result;
};

// Reference highs per (lookback, history start), least recently used evicted first, to bound memory.
export class ReferenceHighCache {
  private readonly cache = new Map<string, Float64Array>();

  constructor(
    private readonly high: ArrayLike<number>,
    private readonly capacity = 96
  ) {}

  get(lookback: number, historyStart: number) {
    const key = `${lookback}:${historyStart}`;
    let highs = this.cache.get(key);

    if (highs) {
      this.cache.delete(key);
    } else {
      highs = computeReferenceHighs(this.high, lookback, historyStart);

      if (this.cache.size >= this.capacity) {
        this.cache.delete(this.cache.keys().next().value!);
      }
    }

    this.cache.set(key, highs);

    return highs;
  }
}
