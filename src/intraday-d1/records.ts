// A run's point record in Study 8's PointRecord shape (S8/evaluate.ts:98-131, 297-403), so Study 8's own fitness
// functions (centreView, nbView, violationOf, objectivesOf, summarize) are applied unchanged. Two definitions are
// adapted for one intraday book (PROTOCOL.md §6): `episodes` counts distinct calendar quarters with an entry (Study 8's
// 10-session-gap count is kept as `episodesS8`, report-only), and there is no allocator (decisions = granted = lots,
// refused 0). heldDays is Study 8's: Σ wall-clock fill-to-exit days.
import { createHash } from 'node:crypto';
import type { PointRecord } from '../study8-expanded-regime-d1/evaluate.ts';
import { studyEightEpisodeGap, symbol } from './context.ts';
import type { Lot, RunResult } from './engine.ts';
import type { Market } from './periods.ts';

export interface RunWindow {
  armFromSession: number;
  endSession: number;
}

export interface Range {
  key: string;
  first: number; // session indexes, inclusive
  last: number;
}

export interface IntradayRecord extends PointRecord {
  episodesS8: number;
  closedLots: number;
  sessionsWithEntry: number;
}

const r2 = (value: number) => Math.round(value * 100) / 100;

// Calendar years inside [0, endSession] (a year the run ends inside before Dec 24 is `<year>~partial`), plus the named
// windows given.
export const rangesOf = (market: Market, endSession: number, named: Range[] = []): Range[] => {
  const { date } = market.sessions;
  const ranges: Range[] = [];
  let start = 0;

  for (let s = 1; s <= endSession + 1; s++) {
    if (s === endSession + 1 || date[s]!.slice(0, 4) !== date[start]!.slice(0, 4)) {
      const year = date[start]!.slice(0, 4);
      const partial = s === endSession + 1 && date[endSession]! < `${year}-12-24`;

      ranges.push({ key: partial ? `${year}~partial` : year, first: start, last: s - 1 });
      start = s;
    }
  }

  return [...ranges, ...named];
};

export const ledgerSignature = (lots: readonly Lot[]) =>
  createHash('sha256')
    .update(
      lots
        .map((lot) => `${symbol},${lot.entryTime},${lot.open ? 'open' : lot.exitTime},${Math.round(lot.net * 1e6)}`)
        .join(';')
    )
    .digest('hex')
    .slice(0, 16);

export const recordOf = (
  market: Market,
  result: RunResult,
  window: RunWindow,
  ranges: readonly Range[]
): IntradayRecord => {
  const { sessions } = market;
  const lots = result.lots;
  const nets = lots.map((lot) => lot.net);
  const positive = nets.filter((net) => net > 0).sort((a, b) => b - a);
  const closed = lots.filter((lot) => !lot.open);
  const endClose = sessions.closeTime[window.endSession]!;
  let heldDays = 0;
  const heldSessionSet = new Set<number>();
  const quarters = new Set<string>();
  const entrySessions = new Set<number>();
  let episodesS8 = 0;
  let previousExit = -Infinity;

  for (const lot of lots) {
    const end = lot.open ? endClose : lot.exitTime;

    heldDays += Math.max(0, end - lot.entryTime) / 86400;

    const last = lot.open ? window.endSession : lot.exitSession;

    for (let s = lot.entrySession; s <= last; s++) heldSessionSet.add(s);

    const date = sessions.date[lot.entrySession]!;

    quarters.add(`${date.slice(0, 4)}Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}`);
    entrySessions.add(lot.entrySession);

    if (lot.entrySession - previousExit > studyEightEpisodeGap) episodesS8++;

    previousExit = lot.open ? Infinity : lot.exitSession;
  }

  const periods: Record<string, number> = {};
  const marks = result.dailyMarks;

  for (const range of ranges) {
    const before = range.first > 0 ? marks[range.first - 1]! : 0;

    periods[range.key] = r2(marks[range.last]! - (Number.isNaN(before) ? 0 : before));
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

  const eligible = window.endSession - window.armFromSession + 1;
  const net = result.net;
  const books = {
    [symbol]: {
      lots: lots.length,
      net: r2(net),
      wins: closed.filter((lot) => lot.net > 0).length,
      heldDays: Math.round(heldDays * 1000) / 1000
    }
  };

  return {
    net: r2(net),
    realized: r2(result.realized),
    unrealized: r2(result.unrealized),
    interest: r2(result.interest),
    costs: r2(result.costs),
    gross: r2(net + result.interest + result.costs),
    dd: result.minuteDrawdown.maximum,
    ddDaily: result.dailyDrawdown.maximum,
    ddPeak: new Date(result.minuteDrawdown.peakTime * 1000).toISOString(),
    ddTrough: new Date(result.minuteDrawdown.troughTime * 1000).toISOString(),
    lots: lots.length,
    open: lots.length - closed.length,
    wins: closed.filter((lot) => lot.net > 0).length,
    bestLot: r2(nets.length ? Math.max(...nets) : 0),
    worstLot: r2(nets.length ? Math.min(...nets) : 0),
    top1Share: net > 0 && positive.length ? Math.round((positive[0]! / net) * 1e4) / 1e4 : NaN,
    lotYears: new Set(closed.map((lot) => sessions.date[lot.exitSession]!.slice(0, 4))).size,
    episodes: quarters.size,
    episodesS8,
    heldDays: Math.round(heldDays * 1000) / 1000,
    heldSessions: heldSessionSet.size,
    occupancy: eligible > 0 ? Math.round((heldSessionSet.size / eligible) * 1e6) / 1e6 : 0,
    perCapitalYear: heldDays > 0 ? r2(net / (heldDays / 365)) : 0,
    decisions: lots.length,
    granted: lots.length,
    refused: 0,
    books,
    refusalsBy: {},
    periods,
    bestYear: r2(bestYear),
    bestYearKey,
    signature: ledgerSignature(lots),
    closedLots: closed.length,
    sessionsWithEntry: entrySessions.size
  };
};
