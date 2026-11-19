// The canonical evaluation (PROTOCOL.md §5): the completed study's verified path — the Strategy Lab request mapping,
// Growth 1.4.0's `runRiseTrading` and `summarizeSimulation` with the browser runner's accounting checks — reused
// unchanged (src/growth140-vgt-s8m/engine.ts), and its compact record extended with the market-move (episode)
// statistics this study ranks and reports. Nothing is retained between evaluations.
import {
  type DoorData,
  type PointRecord,
  type Run,
  detailOf as priorDetailOf,
  recordOf as priorRecordOf,
  runOf
} from '../growth140-vgt-s8m/engine.ts';
import type { Config } from '../growth140-vgt-s8m/space.ts';
import { rules } from './context.ts';

export type { DoorData, PointRecord, Run };

export interface EpisodeStats {
  moves: number; // episodes (market moves): trades grouped while each entry is ≤ episodeGap sessions after the last exit
  winningMoves: number;
  losingMoves: number;
  topMove: number; // the largest winning episode's net (0 without one)
  topMoveFirst: string; // its first entry and last exit dates ('' without one; 'open' while open)
  topMoveLast: string;
  secondMove: number;
  topMoveShare: number; // topMove ÷ net (NaN when net ≤ 0)
  netExTopMove: number; // ARITHMETIC: net − topMove (not an engine replay)
  netHaircutTopMove: number; // ARITHMETIC: net − haircut × topMove
  worstMove: number;
  lossSum: number; // sum of the closed losing trades' net (dollar losses, ≤ 0)
  maxLosingHoldDays: number; // the longest calendar hold of a closed losing trade
  openNet: number; // the open position's net at the last close (0 when flat)
}

export type StableRecord = PointRecord & EpisodeStats & { error?: string };

const r2 = (x: number) => Math.round(x * 100) / 100;

export const episodesOfRows = (r: Run) => {
  const dates = r.run.ds.dates;
  const out: { first: string; last: string; net: number; trades: number; open: boolean }[] = [];
  let lastExit = -Infinity;

  for (const row of r.rows) {
    if (row.trade.entryIndex - lastExit > rules.episodeGap || out.length === 0)
      out.push({ first: dates[row.trade.entryIndex]!, last: '', net: 0, trades: 0, open: false });

    const e = out.at(-1)!;

    e.net += row.net;
    e.trades++;
    e.open = row.status === 'open';
    e.last = row.status === 'open' ? 'open' : dates[row.trade.exitIndex]!;
    lastExit = row.status === 'open' ? Infinity : row.trade.exitIndex;
  }

  return out;
};

export const episodeStats = (r: Run, net: number): EpisodeStats => {
  const moves = episodesOfRows(r);
  const winners = moves.filter((m) => m.net > 0).sort((a, b) => b.net - a.net);
  const top = winners[0];
  const closed = r.rows.filter((row) => row.status === 'closed');
  const losing = closed.filter((row) => row.net < 0);
  const open = r.rows.filter((row) => row.status === 'open');

  return {
    moves: moves.length,
    winningMoves: winners.length,
    losingMoves: moves.filter((m) => m.net < 0).length,
    topMove: r2(top?.net ?? 0),
    topMoveFirst: top?.first ?? '',
    topMoveLast: top?.last ?? '',
    secondMove: r2(winners[1]?.net ?? 0),
    topMoveShare: net > 0 && top ? Math.round((top.net / net) * 1e4) / 1e4 : NaN,
    netExTopMove: r2(net - (top?.net ?? 0)),
    netHaircutTopMove: r2(net - rules.haircut * (top?.net ?? 0)),
    worstMove: r2(Math.min(0, ...moves.map((m) => m.net))),
    lossSum: r2(losing.reduce((a, row) => a + row.net, 0)),
    maxLosingHoldDays: Math.round(Math.max(0, ...losing.map((row) => row.calendarDaysHeld)) * 1000) / 1000,
    openNet: r2(open.reduce((a, row) => a + row.net, 0))
  };
};

export const recordOf = (c: Config, r: Run): StableRecord => {
  const base = priorRecordOf(c, r);

  return { ...base, ...episodeStats(r, r.metrics.pnl.totalMarkedNetUsd) };
};

export const evaluate = (door: DoorData, c: Config): StableRecord => recordOf(c, runOf(door, c));

// The decision log of a run: every base or continuation decision with its outcome (filled, rejected, vetoed by a gate,
// deferred into a latched opportunity, unfilled at the end) — the blocked and latched events behind a ledger change.
export const decisionEvents = (r: Run) =>
  r.run.simulation.outcomes.map((o) => ({
    date: r.run.ds.dates[o.decision.sessionIndex]!,
    status: o.status,
    reason: o.reason ?? null,
    trade: o.trade ? r.run.ds.dates[o.trade.entryIndex]! : null
  }));

// The completed study's detail (trades, daily marks, drawdowns, the boundary split) plus the episodes and decision
// events, for selected configurations only.
export const detailOf = (door: DoorData, c: Config, boundaryDate?: string, withEvents = false) => {
  const d = priorDetailOf(door, c, boundaryDate);
  const r = runOf(door, c);

  return {
    ...d,
    record: recordOf(c, r),
    episodes: episodesOfRows(r).map((e) => ({ ...e, net: r2(e.net) })),
    events: withEvents ? decisionEvents(r) : undefined
  };
};

export type Detail = ReturnType<typeof detailOf>;
