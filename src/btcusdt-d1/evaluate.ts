// One candidate on one window (SEARCH_AND_NEIGHBORHOOD.md §2): the fast replay on the bars before the window's
// cutoff only (the series is sliced, so nothing at or after the cutoff can be read), summarised into the metrics the
// gates and the ranking use. Selection windows start flat at the arming day; a validation window is the incremental
// part of one continuous run (the state and any position carried across its start).
import { type DayIndex, type Window, barsBefore, dayIndexOf } from './calendar.ts';
import { account, secondsPerDay, secondsPerMinute } from './context.ts';
import type { ExecutionSettings } from './costs.ts';
import { type FastResult, type FastTrade, runFast } from './fast.ts';
import { type D1Grid, gridKey, paramsOfGrid } from './params.ts';
import { type Series, sliceSeries } from './snapshot.ts';

export interface EvalRequest {
  grid: D1Grid;
  settings: ExecutionSettings;
  armStartDay: number;
  window: Window; // the window the metrics describe; the run sees bars before window.endDay only
  dataEndDay?: number; // the run's data cutoff when it is later than window.endDay (never earlier)
}

export const subperiodCount = 3;

// Three consecutive subperiods of a window, split at whole days.
export const subperiodsOf = (window: Window): Window[] => {
  const length = window.endDay - window.startDay;

  return Array.from({ length: subperiodCount }, (_value, k) => ({
    label: `${window.label} third ${k + 1}`,
    startDay: window.startDay + Math.floor((k * length) / subperiodCount),
    endDay: window.startDay + Math.floor(((k + 1) * length) / subperiodCount)
  }));
};

export interface Metrics {
  key: string;
  grid: D1Grid;
  window: Window;
  settingsLabel: string;
  net: number; // marked equity change over the window (USDT)
  returnOnCap: number; // net / 100,000
  startEquity: number;
  endEquity: number;
  minuteDrawdown: number; // USDT, largest peak-to-trough of the minute marks in the window
  minutePercent: number; // largest (1 - equity / running peak), minute marks
  dailyDrawdown: number;
  dailyPercent: number;
  entries: number; // trades entered in the window
  exits: number; // trades closed in the window
  carriedIn: boolean; // a position was open at the window's start
  openAtEnd: boolean;
  wins: number; // closed trades entered in the window with net > 0
  losses: number;
  tradeNets: number[]; // trades entered in the window, an open one at its marked net
  topTwo: number; // the two largest positive trade nets
  topOne: number; // the largest positive trade net
  subNets: number[]; // marked net of each of the window's three consecutive equal subperiods (G6)
  netExTopTwo: number; // net - topTwo
  best: number;
  worst: number;
  gross: number; // price P&L of the trades entered in the window
  fees: number;
  impact: number;
  exposureDays: number; // window days with the position held at some minute
  exposureMinutes: number;
  windowDays: number;
  maxParticipation: number; // largest fill notional / that minute's quote volume
  medianParticipation: number;
  deepSetups: number;
  continuationSetups: number;
  schedule: number[]; // [entryDay, exitDay] pairs of the trades held in the window, clipped to it
  signature: string; // entry and exit bars of the window's trades: identical signatures are the same schedule
}

const median = (values: number[]) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

export const metricsOf = (request: EvalRequest, result: FastResult, windowIndex = 0): Metrics => {
  const window = result.windows[windowIndex]!;
  const { startDay, endDay } = window;
  const inWindow = (trade: FastTrade) => trade.entryDay >= startDay && trade.entryDay < endDay;
  const entered = result.trades.filter(inWindow);
  const held = result.trades.filter((trade) => trade.entryDay < endDay && trade.exitDay >= startDay);
  const tradeNets = entered.map((trade) => trade.netPnl);
  const positive = tradeNets.filter((net) => net > 0).sort((a, b) => b - a);
  const topTwo = (positive[0] ?? 0) + (positive[1] ?? 0);
  const closed = entered.filter((trade) => trade.reason !== 'open');
  const participation = entered.flatMap((trade) =>
    trade.reason === 'open' ? [trade.entryParticipation] : [trade.entryParticipation, trade.exitParticipation]
  );
  const schedule: number[] = [];
  let exposureDays = 0;
  let exposureMinutes = 0;

  for (const trade of held) {
    const from = Math.max(trade.entryDay, startDay);
    const to = Math.min(trade.exitDay, endDay - 1);

    schedule.push(from, to);
    exposureDays += to - from + 1;
    exposureMinutes +=
      (Math.min(trade.exitTime, endDay * secondsPerDay) - Math.max(trade.entryTime, startDay * secondsPerDay)) /
      secondsPerMinute;
  }

  const gross = entered.reduce((total, trade) => total + trade.grossPnl, 0);
  const fees = entered.reduce((total, trade) => total + trade.entryFee + trade.exitFee, 0);
  const net = window.net;

  return {
    key: gridKey(request.grid),
    grid: request.grid,
    window: { label: request.window.label, startDay, endDay },
    settingsLabel: `${request.settings.costs.label}-stop-${request.settings.stopFill}`,
    net,
    returnOnCap: net / account.notionalCap,
    startEquity: window.startEquity,
    endEquity: window.endEquity,
    minuteDrawdown: window.minuteDrawdown,
    minutePercent: window.minutePercent,
    dailyDrawdown: window.dailyDrawdown,
    dailyPercent: window.dailyPercent,
    entries: entered.length,
    exits: window.exits,
    carriedIn: result.trades.some((trade) => trade.entryDay < startDay && trade.exitDay >= startDay),
    openAtEnd: result.trades.some((trade) => trade.reason === 'open' && trade.entryDay < endDay),
    wins: closed.filter((trade) => trade.netPnl > 0).length,
    losses: closed.filter((trade) => trade.netPnl <= 0).length,
    tradeNets,
    topTwo,
    topOne: positive[0] ?? 0,
    subNets: result.windows.slice(windowIndex + 1, windowIndex + 1 + subperiodCount).map((sub) => sub.net),
    netExTopTwo: net - topTwo,
    best: tradeNets.length ? Math.max(...tradeNets) : 0,
    worst: tradeNets.length ? Math.min(...tradeNets) : 0,
    gross,
    fees,
    impact: gross - fees - tradeNets.reduce((total, value) => total + value, 0),
    exposureDays,
    exposureMinutes,
    windowDays: endDay - startDay,
    maxParticipation: participation.length ? Math.max(...participation) : 0,
    medianParticipation: participation.length ? median(participation) : 0,
    deepSetups: result.deepSetups,
    continuationSetups: result.continuationSetups,
    schedule,
    signature: entered.map((trade) => `${trade.entryBar}-${trade.reason === 'open' ? 'open' : trade.exitBar}`).join(',')
  };
};

export class Evaluator {
  private readonly indices = new Map<number, { series: Series; index: DayIndex }>();

  constructor(readonly series: Series) {}

  private dataBefore(day: number) {
    let cached = this.indices.get(day);

    if (!cached) {
      const series = sliceSeries(this.series, barsBefore(this.series, day));

      cached = { series, index: dayIndexOf(series) };
      this.indices.set(day, cached);
    }

    return cached;
  }

  run(request: EvalRequest, extraWindows: Window[] = []): FastResult {
    const end = Math.max(request.window.endDay, request.dataEndDay ?? request.window.endDay);
    const { series, index } = this.dataBefore(end);

    return runFast({
      series,
      index,
      params: paramsOfGrid(request.grid),
      settings: request.settings,
      armStartDay: request.armStartDay,
      windows: [request.window, ...extraWindows]
    });
  }

  // The metrics with the window's three subperiods (G6), run as extra windows of the same continuous run.
  evaluate(request: EvalRequest): Metrics {
    return metricsOf(request, this.run(request, subperiodsOf(request.window)));
  }
}

// Exposure-day Jaccard distance between two schedules (disjoint, sorted [from, to] day intervals): 1 - |A ∩ B| /
// |A ∪ B|, 0 for two empty schedules.
export const scheduleDistance = (a: readonly number[], b: readonly number[]) => {
  const size = (s: readonly number[]) => {
    let total = 0;

    for (let i = 0; i < s.length; i += 2) {
      total += s[i + 1]! - s[i]! + 1;
    }

    return total;
  };
  let i = 0;
  let j = 0;
  let overlap = 0;

  while (i < a.length && j < b.length) {
    const from = Math.max(a[i]!, b[j]!);
    const to = Math.min(a[i + 1]!, b[j + 1]!);

    if (to >= from) {
      overlap += to - from + 1;
    }

    if (a[i + 1]! < b[j + 1]!) {
      i += 2;
    } else {
      j += 2;
    }
  }

  const union = size(a) + size(b) - overlap;

  return union === 0 ? 0 : 1 - overlap / union;
};
