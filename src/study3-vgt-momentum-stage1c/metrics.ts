// Run summaries (one archive row per evaluated configuration), center feasibility and the selection scores
// (PROTOCOL.md §7.1), the rule counters, and small statistics helpers. Nothing here runs the engine.
import { search, study } from './context.ts';
import type { RunResult } from './types.ts';

export interface Summary {
  net: number; // the end liquidation mark
  priceGain: number;
  interest: number;
  friction: number;
  trades: number;
  closedTrades: number;
  ownExits: number; // exits by the policy's own rules
  losingTrades: number; // closed trades with net < 0
  campaigns: number;
  reentries: number;
  yearsHeld: number;
  minuteDd: number;
  dailyDd: number;
  sessionsLong: number;
  sessions: number;
  avgGross: number;
  peakGross: number;
  worstTrade: number;
  bestTrade: number;
  exits: Record<string, number>;
  aChecks: number;
  aDue: number;
  aExits: number;
  aCancelled: number;
  bBlocks: number;
  cBlocks: number;
  bcBoth: number;
  cFillsBelow: number;
  pathHash: string;
  yearly: number[]; // window increments when windows were given (diagnostics only; never used to select)
}

const ownRule = new Set([
  'stop',
  'stop gap',
  'own out',
  'trend',
  'damage',
  'structural',
  'stale',
  'max hold',
  'stall',
  'losing hold'
]);

export const summarise = (run: RunResult): Summary => {
  const exits: Record<string, number> = {};
  let priceGain = 0;
  let interest = 0;
  let friction = 0;
  let worst = Infinity;
  let best = -Infinity;
  let closed = 0;
  let own = 0;
  let losing = 0;
  let aExits = 0;

  for (const trade of run.trades) {
    exits[trade.exitReason] = (exits[trade.exitReason] ?? 0) + 1;
    priceGain += trade.priceGain;
    interest += trade.interest;
    friction += trade.friction;
    worst = Math.min(worst, trade.net);
    best = Math.max(best, trade.net);

    if (trade.exitIndex >= 0) {
      closed++;

      if (trade.net < 0) {
        losing++;
      }
    }

    if (ownRule.has(trade.exitReason)) {
      own++;
    }

    if (trade.exitReason === 'losing hold') {
      aExits++;
    }
  }

  return {
    net: run.endLiquidation,
    priceGain,
    interest,
    friction,
    trades: run.trades.length,
    closedTrades: closed,
    ownExits: own,
    losingTrades: losing,
    campaigns: run.campaigns,
    reentries: run.reentries,
    yearsHeld: run.yearsHeld,
    minuteDd: run.minuteDd.maximum,
    dailyDd: run.dailyDd,
    sessionsLong: run.sessionsLong,
    sessions: run.sessions,
    avgGross: run.calendarDays > 0 ? run.grossDollarDays / run.calendarDays : 0,
    peakGross: run.peakGross,
    worstTrade: run.trades.length ? worst : 0,
    bestTrade: run.trades.length ? best : 0,
    exits,
    aChecks: run.aChecks,
    aDue: run.aDue,
    aExits,
    aCancelled: run.aCancelled,
    bBlocks: run.bBlocks,
    cBlocks: run.cBlocks,
    bcBoth: run.bcBoth,
    cFillsBelow: run.cFillsBelow,
    pathHash: run.pathHash,
    yearly: run.windows.map((w) => w.increment)
  };
};

export const feasibleCenter = (s: Summary) =>
  s.minuteDd <= search.feasibility.maxMinuteDd &&
  s.closedTrades >= search.feasibility.minClosedTrades &&
  s.campaigns >= search.feasibility.minCampaigns &&
  s.yearsHeld >= search.feasibility.minYearsHeld &&
  s.sessionsLong >= search.feasibility.minLongShare * s.sessions &&
  s.net > 0;

export const rodOf = (s: { net: number; minuteDd: number }) => s.net / Math.max(s.minuteDd, study.rodFloor);

export const bothOk = (s: { net: number; minuteDd: number }) => s.net > 0 && s.minuteDd <= study.ddReference;

// Whether each active rule acted on the run (a rule that never acts leaves the mask-000 parent's path unchanged).
export const ruleActivity = (s: Summary) => ({
  A: s.aDue > 0,
  B: s.bBlocks + s.bcBoth > 0,
  C: s.cBlocks + s.bcBoth > 0
});

export const median = (values: number[]) => quantile(values, 0.5);

// Linear-interpolation quantile (type 7) of a non-empty list.
export const quantile = (values: number[], q: number) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
};

export const distribution = (values: number[]) => ({
  n: values.length,
  min: values.length ? Math.min(...values) : NaN,
  p10: quantile(values, 0.1),
  p25: quantile(values, 0.25),
  median: quantile(values, 0.5),
  p75: quantile(values, 0.75),
  p90: quantile(values, 0.9),
  max: values.length ? Math.max(...values) : NaN
});
