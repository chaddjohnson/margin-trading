// The optimizer adapter (PROTOCOL.md §5): one effective Growth 1.4.0 configuration on one door → the canonical
// backtester, through exactly the path a Strategy Lab run takes after loading its sessions:
//   effective values → LabRunRequest (1.4.0, VGT, 1d) → paramsOf (apps/strategy-lab/runner/growth-params.ts)
//   → runRiseTrading (src/growth-trading/riseTrading.ts) → summarizeSimulation (the run's metrics and accounting checks)
// and then into Study 8's PointRecord shape so Study 8's own fitness functions apply unchanged. Nothing here changes
// fills, gaps, costs, financing or marks: those are the engine's. A run whose accounting does not reconcile throws.
import { createHash } from 'node:crypto';
import type { MarketSession } from '#types';
import { paramsOf } from '../../apps/strategy-lab/runner/growth-params.ts';
import type { LabRunRequest } from '../../apps/strategy-lab/shared/contract.ts';
import { type RiseTradingRun, runRiseTrading, summarizeSimulation } from '../growth-trading/riseTrading.ts';
import type { PointRecord } from '../study8-expanded-regime-d1/evaluate.ts';
import { episodeGap, resolution, strategyKey, strategyVersion, symbol } from './context.ts';
import type { Effective } from './space.ts';

export const TOLERANCE_USD = 1e-6; // the Strategy Lab runner's own reconciliation tolerance

export const requestOf = (effective: Effective, from: string, to: string): LabRunRequest => ({
  strategyKey,
  strategyVersion,
  params: effective,
  symbols: [symbol],
  from,
  to,
  resolution
});

export interface Range {
  key: string;
  first: number; // session indexes, inclusive
  last: number;
}

export interface GrowthRecord extends PointRecord {
  closed: number;
  losses: number;
  breakeven: number;
  winsNet: number; // Σ net of winning closed trades
  lossesNet: number; // Σ net of losing closed trades (≤ 0)
  exposure: number; // sessions invested ÷ sessions, percent (Strategy Lab "Sessions invested")
  calendarExposure: number; // calendar time invested, percent
  profitableEpisodes: number;
  netExTop: number; // net − the largest positive trade
  underwaterLongest: number; // longest run of sessions whose daily mark is below the running peak
  underwaterShare: number; // share of sessions below the running peak
  minuteDdPercent: number;
}

const r2 = (value: number) => (Number.isFinite(value) ? Math.round(value * 100) / 100 : value);
const iso = (seconds: number) =>
  seconds > 0 && Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : '';

export const runConfig = (
  sessions: MarketSession[],
  dataSha256: string,
  effective: Effective,
  options: { recordMinuteMarks?: boolean } = {}
) => {
  const request = requestOf(effective, sessions[0]!.date, sessions.at(-1)!.date);
  const params = paramsOf(request);
  const run = runRiseTrading(symbol, sessions, 0, params, dataSha256, { recordMinuteMarks: options.recordMinuteMarks });
  const summary = summarizeSimulation(run.simulation, run.ds);
  const c = summary.metrics.checks;

  if (!(c.fixedLedgerMaxDifferenceUsd <= TOLERANCE_USD && c.identityMaxResidualUsd <= TOLERANCE_USD))
    throw new Error(`accounting check failed ${JSON.stringify(c)}`);
  if (!(c.markedEqualsLedger <= TOLERANCE_USD)) throw new Error('marks differ from the ledger');

  return { request, params, run, summary };
};

export type RunOutput = ReturnType<typeof runConfig>;

export const ledgerSignature = (run: RiseTradingRun) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        run.simulation.trades.map((t) => [t.entryTime, t.exitIndex < 0 ? 'open' : t.exitTime, Math.round(t.net * 1e6)])
      )
    )
    .digest('hex')
    .slice(0, 16);

// Episodes (Study 8 §5): a trade starts a new episode when it enters more than 10 sessions after the previous exit.
export const episodesOf = (run: RiseTradingRun) => {
  const episodes: { first: number; trades: number; net: number }[] = [];
  let previousExit = -Infinity;

  for (const t of run.simulation.trades) {
    if (t.entryIndex - previousExit > episodeGap || episodes.length === 0)
      episodes.push({ first: t.entryIndex, trades: 0, net: 0 });

    const e = episodes.at(-1)!;

    e.trades++;
    e.net += t.net;
    previousExit = t.exitIndex < 0 ? Infinity : t.exitIndex;
  }

  return episodes;
};

// Calendar years of the run (a year the run ends inside before Dec 24 is `<year>~partial`) and the named ranges.
export const yearRanges = (dates: readonly string[]): Range[] => {
  const ranges: Range[] = [];
  let start = 0;

  for (let s = 1; s <= dates.length; s++) {
    if (s === dates.length || dates[s]!.slice(0, 4) !== dates[start]!.slice(0, 4)) {
      const year = dates[start]!.slice(0, 4);
      const partial = s === dates.length && dates[s - 1]! < `${year}-12-24`;

      ranges.push({ key: partial ? `${year}~partial` : year, first: start, last: s - 1 });
      start = s;
    }
  }

  return ranges;
};

export const dateRange = (dates: readonly string[], key: string, from: string, to: string): Range | null => {
  const first = dates.findIndex((d) => d >= from);
  let last = -1;

  dates.forEach((d, i) => {
    if (d <= to) last = i;
  });

  return first < 0 || last < first ? null : { key, first, last };
};

export const recordOf = (out: RunOutput, ranges: readonly Range[]): GrowthRecord => {
  const { run, summary } = out;
  const sim = run.simulation;
  const m = summary.metrics;
  const rows = summary.rows;
  const closed = rows.filter((r) => r.status === 'closed');
  const nets = rows.map((r) => r.net);
  const positive = nets.filter((v) => v > 0).sort((a, b) => b - a);
  const net = m.pnl.totalMarkedNetUsd;
  const marks = sim.daily.map((d) => d.marked);
  const periods: Record<string, number> = {};

  for (const range of ranges) {
    const before = range.first > 0 ? marks[range.first - 1]! : 0;

    periods[range.key] = r2(marks[range.last]! - before);
  }

  let bestYear = 0;
  let bestYearKey = '';

  for (const range of ranges) {
    if (!/^\d{4}(~partial)?$/.test(range.key)) continue;

    const value = periods[range.key]!;

    if (value > bestYear) {
      bestYear = value;
      bestYearKey = range.key;
    }
  }

  let peak = 0;
  let run_ = 0;
  let longest = 0;
  let under = 0;

  for (const mark of marks) {
    if (mark >= peak) {
      peak = mark;
      run_ = 0;
    } else {
      run_++;
      under++;
      longest = Math.max(longest, run_);
    }
  }

  const heldDays = rows.reduce((a, r) => a + r.calendarDaysHeld, 0);
  const heldSessions = sim.daily.filter((d) => d.investedDuringSession).length;
  const episodes = episodesOf(run);
  const wins = closed.filter((r) => r.net > 0);
  const losses = closed.filter((r) => r.net < 0);

  return {
    net: r2(net),
    realized: r2(m.pnl.realizedNetUsd),
    unrealized: r2(net - m.pnl.realizedNetUsd),
    interest: r2(m.pnl.totalInterestUsd),
    costs: r2(m.pnl.totalCostsUsd),
    gross: r2(net + m.pnl.totalInterestUsd + m.pnl.totalCostsUsd),
    dd: sim.minuteDrawdown.maximum,
    ddDaily: sim.dailyDrawdown.maximum,
    ddPeak: iso(sim.minuteDrawdown.peakTime),
    ddTrough: iso(sim.minuteDrawdown.troughTime),
    lots: rows.length,
    open: rows.length - closed.length,
    wins: wins.length,
    bestLot: r2(nets.length ? Math.max(...nets) : 0),
    worstLot: r2(nets.length ? Math.min(...nets) : 0),
    top1Share: net > 0 && positive.length ? Math.round((positive[0]! / net) * 1e4) / 1e4 : NaN,
    lotYears: new Set(closed.map((r) => run.ds.dates[r.trade.exitIndex]!.slice(0, 4))).size,
    episodes: episodes.length,
    heldDays: Math.round(heldDays * 1000) / 1000,
    heldSessions,
    occupancy: sim.daily.length ? Math.round((heldSessions / sim.daily.length) * 1e6) / 1e6 : 0,
    perCapitalYear: heldDays > 0 ? r2(net / (heldDays / 365)) : 0,
    decisions: sim.outcomes.length,
    granted: rows.length,
    refused: 0,
    books: {
      [symbol]: { lots: rows.length, net: r2(net), wins: wins.length, heldDays: Math.round(heldDays * 1000) / 1000 }
    },
    refusalsBy: {},
    periods,
    bestYear: r2(bestYear),
    bestYearKey,
    signature: ledgerSignature(run),
    closed: closed.length,
    losses: losses.length,
    breakeven: closed.length - wins.length - losses.length,
    winsNet: r2(wins.reduce((a, r) => a + r.net, 0)),
    lossesNet: r2(losses.reduce((a, r) => a + r.net, 0)),
    exposure: m.occupancy.sessionsInvestedPercent ?? 0,
    calendarExposure: m.occupancy.calendarTimeInvestedPercent ?? 0,
    profitableEpisodes: episodes.filter((e) => e.net > 0).length,
    netExTop: r2(net - (positive[0] ?? 0)),
    underwaterLongest: longest,
    underwaterShare: marks.length ? Math.round((under / marks.length) * 1e4) / 1e4 : 0,
    minuteDdPercent: m.drawdown.minute.percentOfNotional
  };
};
