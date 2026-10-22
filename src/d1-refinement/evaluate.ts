// One candidate on one evaluation window: engine decisions, then the trailing-buy-variants accounting (which
// reproduces the files' accounting), reduced to the compact metrics the sweeps, the selection and the reports use.
// Detail mode also returns the trades, their outcomes, the setups, the session and stop traces and the daily marks.
import { createHash } from 'node:crypto';
import type { Dataset, ReferenceHighCache } from '../four-family/data.ts';
import { type AccountingResult, type Segment, replay } from '../trailing-buy-variants/accounting.ts';
import {
  type EngineCounts,
  type ReferenceLowCache,
  type SessionTrace,
  type SetupKind,
  type SetupRecord,
  type StopFill,
  type StopTraceRow,
  type Trade,
  hasDeepPath,
  hasSwingPath,
  setupKinds,
  simulate
} from './engine.ts';
import { type Family, type IntParams, familyOf, toParams } from './families.ts';

export const engineVersion = 'd1-refinement-engine-v1';
export const investmentAmount = 100000;

export interface EvalSpec {
  label: string;
  stopFill: StopFill;
  marginInterestRate: number;
  armStart: number;
  endIndex: number;
  segments: Segment[]; // segments[0] is the main window (its trades define the phenotype)
}

export interface SegmentSummary {
  label: string;
  startDate: string;
  endDate: string;
  net: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  interest: number;
  entries: number;
  exits: number;
  wins: number;
  losses: number;
  heldAtCloseSessions: number;
  sessions: number;
}

export interface Metrics {
  net: number;
  gross: number; // net plus interest
  minuteDrawdown: number;
  dailyDrawdown: number;
  interest: number;
  entries: number;
  closedTrades: number;
  wins: number;
  losses: number;
  openAtEnd: boolean;
  exposure: number; // share of the main window's sessions with a position held at the close
  heldDays: number;
  averageHoldDays: number;
  bestTrade: number;
  worstTrade: number;
  maximumLosingStreak: number;
  worstEpisodeLoss: number; // the most negative run of consecutive losing trades
  worstAdverseExcursion: number; // the most negative minute mark of any trade relative to its entry (dollars)
  netWithoutBestTrade: number;
  entriesByKind: Record<SetupKind, number>;
  netByKind: Record<SetupKind, number>;
  signature: string;
  minuteDrawdownPeak: number;
  minuteDrawdownTrough: number;
  stopNeverActiveTrades: number;
  stopSwitchOffSessions: number;
  counts: Pick<
    EngineCounts,
    | 'setupActivations'
    | 'overnightOrders'
    | 'bufferedLossExits'
    | 'protectiveStopExits'
    | 'entriesWithoutTrade'
    | 'upgrades'
    | 'continuationWindows'
    | 'continuationExpiries'
  >;
  exitReasons: Record<string, number>;
  segments: SegmentSummary[];
}

export interface Detail {
  trades: Trade[];
  accounting: AccountingResult;
  setups: SetupRecord[];
  trace: SessionTrace[];
  stopTrace: StopTraceRow[];
}

const tradeSignature = (ds: Dataset, trades: Trade[]) =>
  createHash('sha1')
    .update(
      trades
        .map(
          (trade) =>
            `${ds.dates[trade.entryIndex]}|${trade.entryBar}|${trade.entryPrice}|${trade.exitIndex < 0 ? 'open' : ds.dates[trade.exitIndex]}|${trade.exitBar}|${trade.exitPrice}|${trade.reason}`
        )
        .join(';')
    )
    .digest('hex')
    .slice(0, 16);

const kindZero = (): Record<SetupKind, number> =>
  Object.fromEntries(setupKinds.map((kind) => [kind, 0])) as Record<SetupKind, number>;

// The worst minute-sampled mark of each trade relative to its own entry: the lowest minute low while held, net
// of interest through that session. The adverse excursion the holder would have seen, not the strategy drawdown.
const worstAdverseExcursion = (ds: Dataset, trades: Trade[], main: Segment, rate: number) => {
  let worst = 0;

  for (const trade of trades) {
    if (trade.entryIndex < main.start || trade.entryIndex > main.end) {
      continue;
    }

    const last = trade.exitIndex < 0 ? main.end : Math.min(trade.exitIndex, main.end);

    for (let s = trade.entryIndex; s <= last; s++) {
      const interest = trade.investment * rate * ((ds.sTime[s]! - trade.entryTimestamp) / (365 * 86400));
      const start = ds.sBarStart[s]!;
      const from = s === trade.entryIndex ? trade.entryBar : 0;
      const to = s === trade.exitIndex ? trade.exitBar : ds.sBarCount[s]!;
      let low = s === trade.exitIndex ? trade.exitPrice : Infinity;

      for (let k = from; k < to; k++) {
        low = Math.min(low, ds.bLow[start + k]!);
      }

      if (Number.isFinite(low)) {
        worst = Math.min(worst, trade.shares * low - trade.investment - interest);
      }
    }
  }

  return worst;
};

export const summarize = (
  ds: Dataset,
  trades: Trade[],
  accounting: AccountingResult,
  counts: EngineCounts,
  rate: number
): Metrics => {
  const main = accounting.segments[0]!;
  const inMain = trades
    .map((trade, index) => ({ trade, outcome: accounting.outcomes[index]! }))
    .filter(({ trade }) => trade.entryIndex >= main.start && trade.entryIndex <= main.end);
  const profits = inMain.map(({ outcome }) => outcome.profit);
  const holds = inMain.map(({ outcome }) => outcome.holdDays);
  const exitReasons: Record<string, number> = {};
  const entriesByKind = kindZero();
  const netByKind = kindZero();
  let streak = 0;
  let streakLoss = 0;
  let maximumLosingStreak = 0;
  let worstEpisodeLoss = 0;
  let heldDays = 0;
  let stopNeverActiveTrades = 0;
  let stopSwitchOffSessions = 0;

  for (const { trade, outcome } of inMain) {
    exitReasons[trade.reason] = (exitReasons[trade.reason] ?? 0) + 1;
    entriesByKind[trade.kind]++;
    netByKind[trade.kind] += outcome.profit;
    heldDays += outcome.holdDays;
    stopSwitchOffSessions += trade.stopSwitchOffSessions;

    if (!outcome.isOpen) {
      if (trade.stopFirstActiveIndex < 0) {
        stopNeverActiveTrades++;
      }

      if (outcome.profit > 0) {
        streak = 0;
        streakLoss = 0;
      } else {
        streak++;
        streakLoss += outcome.profit;
        maximumLosingStreak = Math.max(maximumLosingStreak, streak);
        worstEpisodeLoss = Math.min(worstEpisodeLoss, streakLoss);
      }
    }
  }

  const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
  const closed = inMain.filter(({ outcome }) => !outcome.isOpen);

  return {
    net: main.net,
    gross: main.net + main.interest,
    minuteDrawdown: main.minuteDrawdown.maximum,
    dailyDrawdown: main.dailyDrawdown.maximum,
    interest: main.interest,
    entries: main.entries,
    closedTrades: closed.length,
    wins: closed.filter(({ outcome }) => outcome.profit > 0).length,
    losses: closed.filter(({ outcome }) => !(outcome.profit > 0)).length,
    openAtEnd: main.openAtEnd,
    exposure: main.heldAtCloseSessions / main.sessions,
    heldDays,
    averageHoldDays: holds.length > 0 ? holds.reduce((total, value) => total + value, 0) / holds.length : 0,
    bestTrade,
    worstTrade: profits.length > 0 ? Math.min(...profits) : 0,
    maximumLosingStreak,
    worstEpisodeLoss,
    worstAdverseExcursion: worstAdverseExcursion(ds, trades, main, rate),
    netWithoutBestTrade: main.net - bestTrade,
    entriesByKind,
    netByKind,
    signature: tradeSignature(
      ds,
      inMain.map(({ trade }) => trade)
    ),
    minuteDrawdownPeak: main.minuteDrawdown.peakTime,
    minuteDrawdownTrough: main.minuteDrawdown.troughTime,
    stopNeverActiveTrades,
    stopSwitchOffSessions,
    counts: {
      setupActivations: counts.setupActivations,
      overnightOrders: counts.overnightOrders,
      bufferedLossExits: counts.bufferedLossExits,
      protectiveStopExits: counts.protectiveStopExits,
      entriesWithoutTrade: counts.entriesWithoutTrade,
      upgrades: counts.upgrades,
      continuationWindows: counts.continuationWindows,
      continuationExpiries: counts.continuationExpiries
    },
    exitReasons,
    segments: accounting.segments.map((segment) => ({
      label: segment.label,
      startDate: segment.startDate,
      endDate: segment.endDate,
      net: segment.net,
      minuteDrawdown: segment.minuteDrawdown.maximum,
      dailyDrawdown: segment.dailyDrawdown.maximum,
      interest: segment.interest,
      entries: segment.entries,
      exits: segment.exits,
      wins: segment.wins,
      losses: segment.losses,
      heldAtCloseSessions: segment.heldAtCloseSessions,
      sessions: segment.sessions
    }))
  };
};

export interface Caches {
  highs: ReferenceHighCache;
  lows: ReferenceLowCache;
}

const noHighs = new Float64Array(0);

export const evaluateCandidate = (
  ds: Dataset,
  caches: Caches,
  family: Family | string,
  intParams: IntParams,
  spec: EvalSpec,
  detail = false
): { metrics: Metrics; detail?: Detail } => {
  const resolved = typeof family === 'string' ? familyOf(family) : family;
  const params = toParams(resolved, intParams);
  const { entryMode } = resolved.architecture;
  const result = simulate(
    ds,
    hasDeepPath(entryMode) ? caches.highs.get(params.tickWindowSize) : noHighs,
    hasSwingPath(entryMode) ? caches.lows.get(params.swingLookback) : undefined,
    resolved.architecture,
    params,
    {
      stopFill: spec.stopFill,
      marginInterestRate: spec.marginInterestRate,
      investment: investmentAmount,
      firstIndex: 0,
      armStart: spec.armStart,
      endIndex: spec.endIndex
    },
    detail
  );
  const accounting = replay(ds, result.trades, {
    firstIndex: 0,
    endIndex: spec.endIndex,
    marginInterestRate: spec.marginInterestRate,
    segments: spec.segments,
    dailyMarks: detail
  });

  return {
    metrics: summarize(ds, result.trades, accounting, result.counts, spec.marginInterestRate),
    detail: detail
      ? {
          trades: result.trades,
          accounting,
          setups: result.setups ?? [],
          trace: result.trace ?? [],
          stopTrace: result.stopTrace ?? []
        }
      : undefined
  };
};
