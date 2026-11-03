// One candidate on one evaluation window: engine decisions, then accounting, reduced to the compact metrics
// the search, the selection and the reports use. Detail mode also returns the trades, their outcomes, the
// setups and the daily marks (finalists and comparators only).
import { createHash } from 'node:crypto';
import { type AccountingResult, type Segment, replay } from './accounting.ts';
import type { Dataset, ReferenceHighCache } from './data.ts';
import { type EngineCounts, type SetupRecord, type StopFill, type Trade, simulate } from './engine.ts';
import { type FamilyKey, type IntParams, families, toStrategyParams } from './families.ts';

export const engineVersion = 'four-family-engine-v1';
export const investmentAmount = 100000;

export interface EvalSpec {
  label: string;
  stopFill: StopFill;
  marginInterestRate: number;
  armStart: number; // first session index where a setup may arm
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
  minuteDrawdown: number;
  dailyDrawdown: number;
  interest: number;
  entries: number;
  closedTrades: number;
  wins: number;
  losses: number;
  openAtEnd: boolean;
  exposure: number; // share of the main window's sessions with a position held at the close
  averageHoldDays: number;
  maximumHoldDays: number;
  bestTrade: number;
  worstTrade: number;
  maximumLosingStreak: number;
  bestTradeShare: number; // best trade's profit / net profit (concentration)
  netWithoutBestTrade: number;
  signature: string; // hash of the main window's trade list
  minuteDrawdownPeak: number;
  minuteDrawdownTrough: number;
  counts: Pick<
    EngineCounts,
    | 'setupActivations'
    | 'overnightOrders'
    | 'restrictions'
    | 'recoveryResets'
    | 'bufferedLossExits'
    | 'entriesWithoutTrade'
  >;
  exitReasons: Record<string, number>;
  segments: SegmentSummary[];
}

export interface Detail {
  trades: Trade[];
  accounting: AccountingResult;
  setups: SetupRecord[];
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

export const evaluateCandidate = (
  ds: Dataset,
  highs: ReferenceHighCache,
  familyKey: FamilyKey,
  intParams: IntParams,
  spec: EvalSpec,
  detail = false
): { metrics: Metrics; detail?: Detail } => {
  const family = families[familyKey];
  const params = toStrategyParams(family, intParams);
  const result = simulate(
    ds,
    highs.get(params.tickWindowSize),
    family.flags,
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
    metrics: summarize(ds, result.trades, accounting, result.counts),
    detail: detail ? { trades: result.trades, accounting, setups: result.setups ?? [] } : undefined
  };
};

// The compact metrics of a run whose segments[0] is the main window. Shared with the allIn comparator.
export const summarize = (
  ds: Dataset,
  trades:
    | Trade[]
    | {
        entryIndex: number;
        exitIndex: number;
        entryBar: number;
        exitBar: number;
        entryPrice: number;
        exitPrice: number;
        reason: string;
      }[],
  accounting: AccountingResult,
  counts?: EngineCounts
): Metrics => {
  const main = accounting.segments[0]!;
  const inMain = trades
    .map((trade, index) => ({ trade, outcome: accounting.outcomes[index]! }))
    .filter(({ trade }) => trade.entryIndex >= main.start && trade.entryIndex <= main.end);
  const profits = inMain.map(({ outcome }) => outcome.profit);
  const holds = inMain.map(({ outcome }) => outcome.holdDays);
  const exitReasons: Record<string, number> = {};
  let streak = 0;
  let maximumLosingStreak = 0;

  for (const { trade, outcome } of inMain) {
    exitReasons[trade.reason] = (exitReasons[trade.reason] ?? 0) + 1;

    if (!outcome.isOpen) {
      streak = outcome.profit > 0 ? 0 : streak + 1;
      maximumLosingStreak = Math.max(maximumLosingStreak, streak);
    }
  }

  const bestTrade = profits.length > 0 ? Math.max(...profits) : 0;
  const closed = inMain.filter(({ outcome }) => !outcome.isOpen);

  return {
    net: main.net,
    minuteDrawdown: main.minuteDrawdown.maximum,
    dailyDrawdown: main.dailyDrawdown.maximum,
    interest: main.interest,
    entries: main.entries,
    closedTrades: closed.length,
    wins: closed.filter(({ outcome }) => outcome.profit > 0).length,
    losses: closed.filter(({ outcome }) => !(outcome.profit > 0)).length,
    openAtEnd: main.openAtEnd,
    exposure: main.heldAtCloseSessions / main.sessions,
    averageHoldDays: holds.length > 0 ? holds.reduce((total, value) => total + value, 0) / holds.length : 0,
    maximumHoldDays: holds.length > 0 ? Math.max(...holds) : 0,
    bestTrade,
    worstTrade: profits.length > 0 ? Math.min(...profits) : 0,
    maximumLosingStreak,
    bestTradeShare: main.net !== 0 ? bestTrade / main.net : 0,
    netWithoutBestTrade: main.net - bestTrade,
    signature: tradeSignature(ds, inMain.map(({ trade }) => trade) as Trade[]),
    minuteDrawdownPeak: main.minuteDrawdown.peakTime,
    minuteDrawdownTrough: main.minuteDrawdown.troughTime,
    counts: {
      setupActivations: counts?.setupActivations ?? 0,
      overnightOrders: counts?.overnightOrders ?? 0,
      restrictions: counts?.restrictions ?? 0,
      recoveryResets: counts?.recoveryResets ?? 0,
      bufferedLossExits: counts?.bufferedLossExits ?? 0,
      entriesWithoutTrade: counts?.entriesWithoutTrade ?? 0
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
