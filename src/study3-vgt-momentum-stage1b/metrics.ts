// Run summaries (one archive row per evaluated configuration), center feasibility and the selection scores
// (PROTOCOL.md §7.1), plus small statistics helpers. Nothing here runs the engine.
import { search, study } from './context.ts';
import type { RunResult } from './types.ts';

export interface WindowSummary {
  increment: number;
  minuteDd: number;
  dailyDd: number;
  avgGross: number;
  peakGross: number;
  sessionsLong: number;
  sessions: number;
  interest: number;
  loanDollarDays: number;
  grossDollarDays: number;
  calendarDays: number;
}

export interface Summary {
  net: number; // the end liquidation mark
  mark: number;
  priceGain: number;
  interest: number;
  friction: number;
  trades: number;
  closedTrades: number;
  campaigns: number;
  reentries: number;
  reentryOpportunities: number;
  yearsHeld: number;
  minuteDd: number;
  dailyDd: number;
  sessionsLong: number;
  sessions: number;
  avgGross: number; // time-weighted average gross exposure
  peakGross: number;
  grossDollarDays: number;
  loanDollarDays: number;
  worstTrade: number;
  bestTrade: number;
  trims: number;
  exits: Record<string, number>;
  pathHash: string;
  windows: WindowSummary[];
}

export const summarise = (run: RunResult): Summary => {
  const exits: Record<string, number> = {};
  let priceGain = 0;
  let interest = 0;
  let friction = 0;
  let worst = Infinity;
  let best = -Infinity;
  let trims = 0;

  for (const trade of run.trades) {
    exits[trade.exitReason] = (exits[trade.exitReason] ?? 0) + 1;
    priceGain += trade.priceGain;
    interest += trade.interest;
    friction += trade.friction;
    worst = Math.min(worst, trade.net);
    best = Math.max(best, trade.net);
    trims += trade.trims.length;
  }

  return {
    net: run.endLiquidation,
    mark: run.endMark,
    priceGain,
    interest,
    friction,
    trades: run.trades.length,
    closedTrades: run.trades.filter((trade) => trade.exitIndex >= 0).length,
    campaigns: run.campaigns,
    reentries: run.reentries,
    reentryOpportunities: run.reentryOpportunities,
    yearsHeld: run.yearsHeld,
    minuteDd: run.minuteDd.maximum,
    dailyDd: run.dailyDd,
    sessionsLong: run.sessionsLong,
    sessions: run.sessions,
    avgGross: run.calendarDays > 0 ? run.grossDollarDays / run.calendarDays : 0,
    peakGross: run.peakGross,
    grossDollarDays: run.grossDollarDays,
    loanDollarDays: run.loanDollarDays,
    worstTrade: run.trades.length ? worst : 0,
    bestTrade: run.trades.length ? best : 0,
    trims,
    exits,
    pathHash: run.pathHash,
    windows: run.windows.map((w) => ({
      increment: w.increment,
      minuteDd: w.minuteDd.maximum,
      dailyDd: w.dailyDd,
      avgGross: w.calendarDays > 0 ? w.grossDollarDays / w.calendarDays : 0,
      peakGross: w.peakGross,
      sessionsLong: w.sessionsLong,
      sessions: w.sessions,
      interest: w.interest,
      loanDollarDays: w.loanDollarDays,
      grossDollarDays: w.grossDollarDays,
      calendarDays: w.calendarDays
    }))
  };
};

export const feasibleCenter = (s: Summary) =>
  s.minuteDd <= search.feasibility.maxMinuteDd &&
  s.closedTrades >= search.feasibility.minClosedTrades &&
  s.campaigns >= search.feasibility.minCampaigns &&
  s.yearsHeld >= search.feasibility.minYearsHeld &&
  s.net > 0;

export const feasibilityFlags = (s: Summary) => ({
  dd: s.minuteDd <= search.feasibility.maxMinuteDd,
  trades: s.closedTrades >= search.feasibility.minClosedTrades,
  campaigns: s.campaigns >= search.feasibility.minCampaigns,
  years: s.yearsHeld >= search.feasibility.minYearsHeld,
  net: s.net > 0
});

export const rodOf = (s: { net: number; minuteDd: number }) => s.net / Math.max(s.minuteDd, study.rodFloor);

export const bothOk = (s: { net: number; minuteDd: number }) => s.net > 0 && s.minuteDd <= study.ddReference;

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
