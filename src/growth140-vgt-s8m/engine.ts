// The canonical evaluation of one configuration (PROTOCOL.md §7): the Strategy Lab request mapping
// (apps/strategy-lab/runner/growth-params.ts `paramsOf`), the Growth 1.4.0 engine (`runRiseTrading`) and its own
// summary (`summarizeSimulation`, with the browser runner's accounting checks), reduced to a compact record. Nothing is
// retained between evaluations: the minute curve and the trade ledger are rebuilt on demand (`detailOf`).
import { createHash } from 'node:crypto';
import type { MarketSession } from '#types';
import { paramsOf } from '../../apps/strategy-lab/runner/growth-params.ts';
import type { LabRunRequest } from '../../apps/strategy-lab/shared/contract.ts';
import { type LedgerRow, runRiseTrading, summarizeSimulation } from '../growth-trading/riseTrading.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { chronology, episodeGap, resolution, strategyKey, strategyVersion, symbol } from './context.ts';
import { type Config, configId } from './space.ts';

const TOLERANCE_USD = 1e-6; // the browser runner's (apps/strategy-lab/runner/trading-run.ts)

export interface DoorData {
  name: 'development' | 'full' | 'fixture';
  history: MarketSession[];
  warmup: number;
  dataSha256: string;
  from: string;
  to: string;
}

export interface PointRecord {
  id: string;
  net: number; // total marked net (realized + unrealized), after costs and interest
  realized: number;
  unrealized: number;
  dd: number; // maximum minute drawdown of the marked net, dollars
  ddPeak: number; // Unix seconds (NaN without a drawdown)
  ddTrough: number;
  ddRecovery: number; // NaN when not recovered
  ddDaily: number;
  trades: number; // filled positions ("lots")
  closed: number;
  wins: number;
  losses: number;
  breakeven: number;
  open: number;
  episodes: number;
  profitableEpisodes: number;
  lotYears: number; // distinct calendar years with a closed trade (exit year)
  heldDays: number; // calendar days invested (capital-days ÷ $100k)
  perCapitalYear: number;
  top1Share: number; // largest positive trade ÷ net (NaN when net ≤ 0)
  largestWin: number;
  worstLoss: number;
  bestYear: number;
  bestYearKey: string;
  exposure: number; // sessions invested, percent of the window's sessions
  underwater: number; // sessions whose close is below an earlier closing peak, percent
  longestUnderwater: number; // sessions
  halves: Record<string, number>; // marked net attributed to each calendar half-year (e.g. 2016H1)
  signature: string; // sha256(16) of the ledger (entry/exit times and raw prices)
}

export const requestOf = (c: Config, door: Pick<DoorData, 'from' | 'to'>): LabRunRequest =>
  ({
    strategyKey,
    strategyVersion,
    params: c,
    symbols: [symbol],
    from: door.from,
    to: door.to,
    resolution
  }) as unknown as LabRunRequest;

const halfOf = (date: string) => `${date.slice(0, 4)}H${Number(date.slice(5, 7)) <= 6 ? 1 : 2}`;
const r2 = (x: number) => Math.round(x * 100) / 100;

export const ledgerSignature = (rows: readonly LedgerRow[]) =>
  createHash('sha256')
    .update(
      rows
        .map(
          (r) =>
            `${r.trade.entryTime},${r.trade.entryRawPrice},${r.status === 'open' ? 'open' : `${r.trade.exitTime},${r.trade.exitRawPrice}`}`
        )
        .join(';')
    )
    .digest('hex')
    .slice(0, 16);

// One canonical run with its summary and the browser's accounting checks (a run that does not reconcile fails).
export const runOf = (door: DoorData, c: Config, options: { minuteMarks?: boolean } = {}) => {
  const params = paramsOf(requestOf(c, door));
  const run = runRiseTrading(symbol, door.history, door.warmup, params, door.dataSha256, {
    recordMinuteMarks: options.minuteMarks ?? false
  });
  const { rows, metrics } = summarizeSimulation(run.simulation, run.ds);
  const k = metrics.checks;

  if (!(k.fixedLedgerMaxDifferenceUsd <= TOLERANCE_USD && k.identityMaxResidualUsd <= TOLERANCE_USD))
    throw new Error(`accounting check failed ${JSON.stringify(k)}`);
  if (!(k.markedEqualsLedger <= TOLERANCE_USD)) throw new Error('marks differ from the ledger');

  return { params, run, rows, metrics };
};

export type Run = ReturnType<typeof runOf>;

export const recordOf = (c: Config, r: Run): PointRecord => {
  const { rows, metrics, run } = r;
  const sim = run.simulation;
  const dates = run.ds.dates;
  const closed = rows.filter((row) => row.status === 'closed');
  const net = metrics.pnl.totalMarkedNetUsd;
  // episodes: a new one when an entry is > episodeGap sessions after the previous exit
  let episodes = 0;
  let profitableEpisodes = 0;
  let episodeNet = 0;
  let lastExit = -Infinity;

  for (const row of rows) {
    if (row.trade.entryIndex - lastExit > episodeGap) {
      if (episodes > 0 && episodeNet > 0) profitableEpisodes++;
      episodes++;
      episodeNet = 0;
    }

    episodeNet += row.net;
    lastExit = row.status === 'open' ? Infinity : row.trade.exitIndex;
  }

  if (episodes > 0 && episodeNet > 0) profitableEpisodes++;

  // the marked net at each session close → half-year attributions, best year, time underwater
  const halves: Record<string, number> = {};
  const years: Record<string, number> = {};
  let previous = 0;
  let peak = -Infinity;
  let under = 0;
  let run0 = 0;
  let longest = 0;

  for (const d of sim.daily) {
    const h = halfOf(d.date);
    const delta = d.marked - previous;

    halves[h] = (halves[h] ?? 0) + delta;
    years[d.date.slice(0, 4)] = (years[d.date.slice(0, 4)] ?? 0) + delta;
    previous = d.marked;

    if (d.marked < peak - 1e-9) {
      under++;
      run0++;
      longest = Math.max(longest, run0);
    } else {
      run0 = 0;
    }

    peak = Math.max(peak, d.marked);
  }

  let bestYear = 0;
  let bestYearKey = '';

  for (const [year, value] of Object.entries(years))
    if (value > bestYear) {
      bestYear = value;
      bestYearKey = year;
    }

  const positive = rows.map((row) => row.net).filter((x) => x > 0);
  const heldDays = rows.reduce((a, row) => a + row.calendarDaysHeld, 0);
  const dd = metrics.drawdown.minute;

  return {
    id: configId(c),
    net: r2(net),
    realized: r2(metrics.pnl.realizedNetUsd),
    unrealized: r2(net - metrics.pnl.realizedNetUsd),
    dd: r2(dd.maximumUsd),
    ddPeak: dd.peakTime ?? NaN,
    ddTrough: dd.troughTime ?? NaN,
    ddRecovery: dd.recoveryTime ?? NaN,
    ddDaily: r2(metrics.drawdown.daily.maximumUsd),
    trades: rows.length,
    closed: closed.length,
    wins: metrics.trades.wins,
    losses: metrics.trades.losses,
    breakeven: metrics.trades.breakeven,
    open: metrics.trades.open,
    episodes,
    profitableEpisodes,
    lotYears: new Set(closed.map((row) => dates[row.trade.exitIndex]!.slice(0, 4))).size,
    heldDays: Math.round(heldDays * 1000) / 1000,
    perCapitalYear: heldDays > 0 ? r2(net / (heldDays / 365)) : 0,
    top1Share: net > 0 && positive.length ? Math.round((Math.max(...positive) / net) * 1e4) / 1e4 : NaN,
    largestWin: r2(positive.length ? Math.max(...positive) : 0),
    worstLoss: r2(Math.min(0, ...rows.map((row) => row.net))),
    bestYear: r2(bestYear),
    bestYearKey,
    exposure: Math.round((metrics.occupancy.sessionsInvestedPercent ?? 0) * 1000) / 1000,
    underwater: sim.daily.length ? Math.round((under / sim.daily.length) * 1e5) / 1e3 : 0,
    longestUnderwater: longest,
    halves: Object.fromEntries(Object.entries(halves).map(([k, v]) => [k, r2(v)])),
    signature: ledgerSignature(rows)
  };
};

export const evaluate = (door: DoorData, c: Config): PointRecord => recordOf(c, runOf(door, c));

// ----- on-demand detail (selected candidates only) -----

const iso = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString().replace('.000Z', 'Z') : null); // the browser runner's format

export interface TradeRow {
  n: number;
  status: 'closed' | 'open';
  origin: string;
  entryDate: string;
  entryTime: string;
  entryPrice: number;
  exitDate: string | null;
  exitTime: string | null;
  exitPrice: number;
  exitReason: string | null;
  entryIndex: number;
  exitIndex: number; // -1 while open
  sessionsHeld: number;
  calendarDaysHeld: number;
  gross: number;
  costs: number;
  interest: number;
  net: number;
}

export const tradesOf = (r: Run): TradeRow[] =>
  r.rows.map((row) => ({
    n: row.number,
    status: row.status,
    origin: String(row.trade.setupKind),
    entryDate: r.run.ds.dates[row.trade.entryIndex]!,
    entryTime: iso(row.trade.entryTime)!,
    entryPrice: row.entryRawPrice,
    exitDate: row.status === 'open' ? null : r.run.ds.dates[row.trade.exitIndex]!,
    exitTime: row.status === 'open' ? null : iso(row.trade.exitTime),
    exitPrice: row.exitRawPrice,
    exitReason: row.status === 'open' ? null : String(row.trade.exitReason),
    entryIndex: row.trade.entryIndex,
    exitIndex: row.status === 'open' ? -1 : row.trade.exitIndex,
    sessionsHeld: row.sessionsHeld,
    calendarDaysHeld: Math.round(row.calendarDaysHeld * 1000) / 1000,
    gross: r2(row.grossBeforeCosts),
    costs: r2(row.entryFriction + row.exitFriction),
    interest: r2(row.interest),
    net: r2(row.net)
  }));

export interface DrawdownView {
  maximumUsd: number;
  percentOfNotional: number;
  peakTime: string | null;
  troughTime: string | null;
  recoveryTime: string | null;
  recovered: boolean;
}

const ddView = (s: { maximum: number; peakTime: number; troughTime: number; recoveryTime: number }): DrawdownView => ({
  maximumUsd: r2(s.maximum),
  percentOfNotional: Math.round((s.maximum / 100000) * 1e6) / 1e4,
  peakTime: s.maximum > 0 ? iso(s.peakTime) : null,
  troughTime: s.maximum > 0 ? iso(s.troughTime) : null,
  recoveryTime: Number.isFinite(s.recoveryTime) ? iso(s.recoveryTime) : null,
  recovered: s.maximum === 0 || Number.isFinite(s.recoveryTime)
});

// The minute-marked net's maximum drawdown inside [fromTime, ∞) of a run with minute marks, its peak initialized at
// `startEquity` (the boundary's marked equity), with the engine's own strict tracker. With fromTime = −∞ and
// startEquity = 0 it must reproduce the run's own minute drawdown (checked by `detailOf`).
export const drawdownFrom = (r: Run, fromTime: number, startEquity: number, startTime: number) => {
  const marks = r.run.simulation.markChanges!;
  const tracker = new Tracker(startEquity, startTime);

  for (let i = 0; i < marks.t.length; i++)
    if (marks.t[i]! > fromTime) tracker.updateStrict(marks.marked[i]!, marks.t[i]!);

  return tracker.stats();
};

// Full evidence of one configuration: trades, the daily marks, minute drawdowns (whole run and, with a boundary, the
// part after it), split at the boundary close. Used for finalists, #4 and the parity runs only.
export const detailOf = (door: DoorData, c: Config, boundaryDate?: string) => {
  const r = runOf(door, c, { minuteMarks: true });
  const sim = r.run.simulation;
  const whole = drawdownFrom(r, -Infinity, 0, r.run.ds.bTime[r.run.ds.sBarStart[sim.firstSession]!]!);

  if (Math.abs(whole.maximum - sim.minuteDrawdown.maximum) > 1e-9)
    throw new Error(
      `minute marks do not reproduce the run's drawdown (${whole.maximum} vs ${sim.minuteDrawdown.maximum})`
    );

  const record = recordOf(c, r);
  const trades = tradesOf(r);
  const daily = sim.daily.map((d) => ({
    date: d.date,
    marked: r2(d.marked),
    held: d.heldAtClose,
    invested: d.investedDuringSession
  }));
  let boundary: Record<string, unknown> | null = null;

  if (boundaryDate) {
    const b = sim.daily.findIndex((d) => d.date === boundaryDate);

    if (b < 0) throw new Error(`boundary ${boundaryDate} is not a session of the run`);

    const equity = sim.daily[b]!.marked;
    const closeTime = r.run.ds.sCloseTime[sim.daily[b]!.index]!;
    const after = drawdownFrom(r, closeTime, equity, closeTime);
    const before = (() => {
      const marks = sim.markChanges!;
      const tracker = new Tracker(0, r.run.ds.bTime[r.run.ds.sBarStart[sim.firstSession]!]!);

      for (let i = 0; i < marks.t.length && marks.t[i]! <= closeTime; i++)
        tracker.updateStrict(marks.marked[i]!, marks.t[i]!);
      return tracker.stats();
    })();
    const boundaryIndex = sim.daily[b]!.index;
    const crossing = r.rows.filter(
      (row) => row.trade.entryIndex <= boundaryIndex && (row.status === 'open' || row.trade.exitIndex > boundaryIndex)
    );
    // The engine's own marks: the crossing position's part up to the boundary is the boundary's marked equity minus
    // the net of every trade closed on or before it (all-in: at most one position crosses).
    const closedBefore = r.rows
      .filter((row) => row.status === 'closed' && row.trade.exitIndex <= boundaryIndex)
      .reduce((a, row) => a + row.net, 0);

    if (crossing.length > 1) throw new Error('more than one position crosses the boundary');

    const crossingPart = equity - closedBefore;

    boundary = {
      date: boundaryDate,
      equity: r2(equity),
      finalEquity: r2(sim.daily.at(-1)!.marked),
      validationNet: r2(sim.daily.at(-1)!.marked - equity),
      developmentDrawdown: ddView(before),
      validationDrawdown: ddView(after),
      carriedIn: crossing.map((row) => {
        const atBoundary = r2(crossingPart);

        return {
          n: row.number,
          entryDate: r.run.ds.dates[row.trade.entryIndex],
          exitDate: row.status === 'open' ? null : r.run.ds.dates[row.trade.exitIndex],
          status: row.status,
          net: r2(row.net),
          developmentPart: atBoundary,
          validationPart: r2(row.net - atBoundary)
        };
      }),
      newEntries: r.rows.filter((row) => row.trade.entryIndex > boundaryIndex).map((row) => row.number)
    };
  }

  return {
    record,
    trades,
    daily,
    minuteDrawdown: ddView(sim.minuteDrawdown),
    dailyDrawdown: ddView(sim.dailyDrawdown),
    metrics: {
      totalMarkedNetUsd: r.metrics.pnl.totalMarkedNetUsd,
      realizedNetUsd: r.metrics.pnl.realizedNetUsd,
      unrealizedNetUsd: r.metrics.pnl.totalMarkedNetUsd - r.metrics.pnl.realizedNetUsd,
      totalInterestUsd: r.metrics.pnl.totalInterestUsd,
      totalCostsUsd: r.metrics.pnl.totalCostsUsd,
      trades: r.metrics.trades,
      occupancy: r.metrics.occupancy,
      sessions: r.metrics.sessions,
      window: r.metrics.window
    },
    boundary,
    minuteMarkChanges: sim.markChanges!.t.length,
    params: r.params
  };
};

export const developmentDoorDates = { from: chronology.firstSession, to: chronology.developmentEnd };
