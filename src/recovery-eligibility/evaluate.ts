// One candidate on one evaluation window: engine decisions, then the trailing-buy-variants accounting (which
// reproduces file 4's accounting), reduced to the compact metrics the search, the selection and the reports
// use. Detail mode also returns the trades, their outcomes, the setups, the session trace and the daily marks.
import { createHash } from 'node:crypto';
import type { Dataset, ReferenceHighCache } from '../four-family/data.ts';
import { type AccountingResult, type Segment, replay } from '../trailing-buy-variants/accounting.ts';
import {
  type EngineCounts,
  type SessionTrace,
  type SetupKind,
  type SetupRecord,
  type StopFill,
  type Trade,
  simulate
} from './engine.ts';
import { type Family, type IntParams, families, toParams } from './families.ts';

export const engineVersion = 'recovery-eligibility-engine-v1';
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
  minuteDrawdown: number;
  dailyDrawdown: number;
  interest: number;
  entries: number;
  closedTrades: number;
  wins: number;
  losses: number;
  openAtEnd: boolean;
  exposure: number; // share of the main window's sessions with a position held at the close
  heldDays: number; // calendar days with a position, summed over trades in the main window
  averageHoldDays: number;
  bestTrade: number;
  worstTrade: number;
  maximumLosingStreak: number;
  worstEpisodeLoss: number; // the most negative run of consecutive losing trades
  netWithoutBestTrade: number;
  entriesByKind: Record<SetupKind, number>;
  netByKind: Record<SetupKind, number>;
  signature: string;
  minuteDrawdownPeak: number;
  minuteDrawdownTrough: number;
  counts: Pick<
    EngineCounts,
    | 'setupActivations'
    | 'overnightOrders'
    | 'bufferedLossExits'
    | 'entriesWithoutTrade'
    | 'episodesStarted'
    | 'episodeResets'
    | 'episodeExpiries'
    | 'shallowUpgrades'
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

export const familyOf = (familyKey: string): Family => {
  const family = families[familyKey];

  if (!family) {
    throw new Error(`Unknown family ${familyKey}`);
  }

  return family;
};

const kindZero = (): Record<SetupKind, number> => ({ deep: 0, latch: 0, trough: 0, shallow: 0, continuation: 0 });

export const summarize = (
  ds: Dataset,
  trades: Trade[],
  accounting: AccountingResult,
  counts: EngineCounts
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

  for (const { trade, outcome } of inMain) {
    exitReasons[trade.reason] = (exitReasons[trade.reason] ?? 0) + 1;
    entriesByKind[trade.kind]++;
    netByKind[trade.kind] += outcome.profit;
    heldDays += outcome.holdDays;

    if (!outcome.isOpen) {
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
    netWithoutBestTrade: main.net - bestTrade,
    entriesByKind,
    netByKind,
    signature: tradeSignature(
      ds,
      inMain.map(({ trade }) => trade)
    ),
    minuteDrawdownPeak: main.minuteDrawdown.peakTime,
    minuteDrawdownTrough: main.minuteDrawdown.troughTime,
    counts: {
      setupActivations: counts.setupActivations,
      overnightOrders: counts.overnightOrders,
      bufferedLossExits: counts.bufferedLossExits,
      entriesWithoutTrade: counts.entriesWithoutTrade,
      episodesStarted: counts.episodesStarted,
      episodeResets: counts.episodeResets,
      episodeExpiries: counts.episodeExpiries,
      shallowUpgrades: counts.shallowUpgrades,
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

export const evaluateCandidate = (
  ds: Dataset,
  highs: ReferenceHighCache,
  familyKey: string,
  intParams: IntParams,
  spec: EvalSpec,
  detail = false
): { metrics: Metrics; detail?: Detail } => {
  const family = familyOf(familyKey);
  const params = toParams(family, intParams);
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
    detail: detail
      ? { trades: result.trades, accounting, setups: result.setups ?? [], trace: result.trace ?? [] }
      : undefined
  };
};
