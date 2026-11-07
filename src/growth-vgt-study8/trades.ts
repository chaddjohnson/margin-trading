// Trade-level evidence (PROTOCOL.md §8.3, §9.3): the detailed ledger of one run, the predeclared one-to-one matching of
// winning trades against #4 in the same window, losing-trade comparison, underwater spans, and the split of a
// continuous run at the 2024/2025 boundary (carried-in position, validation-window P&L from the 2024 close mark,
// validation drawdown from a peak initialized at that mark and updated on minute marks).
import { originOf } from '../growth-trading/riseTrading.ts';
import { episodeGap } from './context.ts';
import type { RunOutput } from './adapter.ts';

const iso = (sec: number) => new Date(sec * 1000).toISOString().replace('.000Z', 'Z');
const r2 = (x: number) => Math.round(x * 100) / 100;

export interface TradeRow {
  n: number;
  status: 'closed' | 'open';
  origin: string; // base_growth | continuation:<method>
  entrySession: number;
  lastSession: number; // the exit session, or the run's last session while open
  entryDate: string;
  exitDate: string | null;
  entryTimeUtc: string;
  exitTimeUtc: string | null;
  entryFill: number;
  exitFill: number | null; // null while open
  markPrice: number | null; // the last close while open
  exitReason: string | null;
  net: number; // realized, or marked at the run's last close while open
  calendarDaysHeld: number;
  sessionsHeld: number;
  worstMark: number; // MAE of the trade's own mark (net of interest), $
  bestMark: number; // MFE, $
}

export const tradesOf = (out: RunOutput): TradeRow[] => {
  const ds = out.run.ds;
  const end = out.run.simulation.endSession;

  return out.summary.rows.map((row) => {
    const t = row.trade;
    const open = row.status === 'open';
    const o = originOf(t);

    return {
      n: row.number,
      status: row.status,
      origin: o.origin === 'continuation' ? `continuation:${o.method}` : 'base_growth',
      entrySession: t.entryIndex,
      lastSession: open ? end : t.exitIndex,
      entryDate: ds.dates[t.entryIndex]!,
      exitDate: open ? null : ds.dates[t.exitIndex]!,
      entryTimeUtc: iso(t.entryTime),
      exitTimeUtc: open ? null : iso(t.exitTime),
      entryFill: row.entryRawPrice,
      exitFill: open ? null : row.exitRawPrice,
      markPrice: open ? row.exitRawPrice : null,
      exitReason: open ? null : t.exitReason,
      net: r2(row.net),
      calendarDaysHeld: Math.round(row.calendarDaysHeld * 100) / 100,
      sessionsHeld: row.sessionsHeld,
      worstMark: r2(row.excursion.worst),
      bestMark: r2(row.excursion.best)
    };
  });
};

// ----- the predeclared one-to-one winner matching (PROTOCOL.md §8.3) -----

export interface MatchOptions {
  first: number; // window session indexes (inclusive): trades ENTERED inside the window
  last: number;
  retainedTolerance: number; // sessions (entry and exit both within it → retained)
}

const overlap = (a: TradeRow, b: TradeRow) =>
  Math.max(0, Math.min(a.lastSession, b.lastSession) - Math.max(a.entrySession, b.entrySession) + 1);

// Moves of a trade list: a trade starts a new move when it enters more than 10 sessions after the previous exit
// (Study 8's episode rule), so re-entries into one move are counted once.
export const movesOf = (trades: readonly TradeRow[]) => {
  const moves: TradeRow[][] = [];
  let previous = -Infinity;

  for (const t of trades) {
    if (t.entrySession - previous > episodeGap || moves.length === 0) moves.push([]);
    moves.at(-1)!.push(t);
    previous = t.status === 'open' ? Infinity : t.lastSession;
  }

  return moves;
};

export const matchWinners = (candidate: readonly TradeRow[], control: readonly TradeRow[], options: MatchOptions) => {
  const inWindow = (t: TradeRow) => t.entrySession >= options.first && t.entrySession <= options.last;
  const c = candidate.filter(inWindow);
  const k = control.filter(inWindow);
  const cw = c.filter((t) => t.net > 0);
  const kw = k.filter((t) => t.net > 0);
  const kl = k.filter((t) => t.net < 0);
  const pairs: { c: TradeRow; k: TradeRow; overlap: number }[] = [];

  for (const a of cw)
    for (const b of kw) {
      const o = overlap(a, b);

      if (o >= 1) pairs.push({ c: a, k: b, overlap: o });
    }

  pairs.sort(
    (x, y) => y.overlap - x.overlap || x.k.entrySession - y.k.entrySession || x.c.entrySession - y.c.entrySession
  );

  const usedC = new Set<TradeRow>();
  const usedK = new Set<TradeRow>();
  const matched: {
    candidate: number;
    control: number;
    overlap: number;
    entryShift: number;
    exitShift: number;
    kind: 'retained' | 'retimed';
    candidateNet: number;
    controlNet: number;
  }[] = [];

  for (const p of pairs) {
    if (usedC.has(p.c) || usedK.has(p.k)) continue;
    usedC.add(p.c);
    usedK.add(p.k);

    const entryShift = p.c.entrySession - p.k.entrySession;
    const exitShift = p.c.lastSession - p.k.lastSession;

    matched.push({
      candidate: p.c.n,
      control: p.k.n,
      overlap: p.overlap,
      entryShift,
      exitShift,
      kind:
        Math.abs(entryShift) <= options.retainedTolerance && Math.abs(exitShift) <= options.retainedTolerance
          ? 'retained'
          : 'retimed',
      candidateNet: p.c.net,
      controlNet: p.k.net
    });
  }

  const unmatched = cw.filter((t) => !usedC.has(t));
  const extra = unmatched.filter((t) => kw.some((b) => overlap(t, b) >= 1));
  const fresh = unmatched.filter((t) => !kw.some((b) => overlap(t, b) >= 1));
  const freshMoves = movesOf(fresh);
  const lost = kw.filter((t) => !usedK.has(t));
  const losses = (list: readonly TradeRow[]) => {
    const l = list.filter((t) => t.status === 'closed' && t.net < 0);

    return {
      count: l.length,
      sum: r2(l.reduce((a, t) => a + t.net, 0)),
      worst: l.length ? Math.min(...l.map((t) => t.net)) : 0
    };
  };
  const cl = losses(c);
  const klosses = losses(k);
  const retained = matched.filter((m) => m.kind === 'retained').length;
  const retimed = matched.filter((m) => m.kind === 'retimed').length;
  const sparse = kw.length < 5 || Math.abs(cw.length - kw.length) <= 1;

  return {
    window: { firstSession: options.first, lastSession: options.last },
    candidateWinners: cw.length,
    controlWinners: kw.length,
    retained,
    retimed,
    extraEntriesInControlMoves: extra.map((t) => t.n),
    newWinningTrades: fresh.map((t) => ({
      n: t.n,
      net: t.net,
      overlapsControlLoss: kl.some((b) => overlap(t, b) >= 1)
    })),
    newWinningMoves: freshMoves.length,
    lostControlWinners: lost.map((t) => ({
      control: t.n,
      entryDate: t.entryDate,
      net: t.net,
      candidateLosingOverlap: c.some((a) => a.net < 0 && overlap(a, t) >= 1)
    })),
    lostControlWinnersNet: r2(lost.reduce((a, t) => a + t.net, 0)),
    matched,
    losses: { candidate: cl, control: klosses, increased: cl.count > klosses.count || cl.sum < klosses.sum },
    verdict: sparse
      ? 'inconclusive (sparse)'
      : cw.length > kw.length
        ? 'more winners'
        : cw.length < kw.length
          ? 'fewer winners'
          : 'same count',
    note: 'winners: trades entered inside the window with net > 0 (closed, or open and marked positive at the window end); one-to-one by largest session overlap; retained = entry and exit within ±2 sessions'
  };
};

// ----- underwater spans of the daily mark -----

export const underwaterOf = (daily: readonly { date: string; marked: number }[], first = 0, startPeak?: number) => {
  let peak = startPeak ?? (first > 0 ? daily[first - 1]!.marked : 0);
  let start = -1;
  let longest = { sessions: 0, from: '', to: '', recovered: true };
  let under = 0;

  for (let i = first; i < daily.length; i++) {
    const m = daily[i]!.marked;

    if (m >= peak) {
      if (start >= 0 && i - start > longest.sessions)
        longest = { sessions: i - start, from: daily[start]!.date, to: daily[i]!.date, recovered: true };
      peak = m;
      start = -1;
    } else {
      under++;
      if (start < 0) start = i;
    }
  }

  if (start >= 0 && daily.length - start > longest.sessions)
    longest = { sessions: daily.length - start, from: daily[start]!.date, to: daily.at(-1)!.date, recovered: false };

  return {
    longest,
    sessionsUnderwater: under,
    share: daily.length - first ? Math.round((under / (daily.length - first)) * 1e4) / 1e4 : 0
  };
};

export const maxLosingStreak = (trades: readonly TradeRow[]) => {
  let best = 0;
  let run = 0;

  for (const t of trades.filter((x) => x.status === 'closed')) {
    run = t.net < 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }

  return best;
};

// ----- the continuous run split at the development/validation boundary -----

export const boundarySplit = (out: RunOutput, boundaryDate: string) => {
  const sim = out.run.simulation;
  const ds = out.run.ds;
  const daily = sim.daily;
  const b = ds.dates.lastIndexOf(boundaryDate);

  if (b < 0) throw new Error(`boundary ${boundaryDate} is not a session of the run`);
  if (!sim.markChanges) throw new Error('boundarySplit needs recordMinuteMarks');

  const atB = daily[b]!;
  const end = daily.at(-1)!;
  const trades = tradesOf(out);
  const carried = trades.find((t) => t.entrySession <= b && t.lastSession > b) ?? null;
  const carriedClosed = carried?.status === 'closed';
  const carriedDev = carried ? r2(atB.unrealized) : 0;
  const realized = r2(end.realized - atB.realized - (carried && carriedClosed ? atB.unrealized : 0));
  const open = r2(end.unrealized - (carried && !carriedClosed ? atB.unrealized : 0));
  // validation drawdown: peak initialized at the boundary equity, updated on minute marks after the 2024 close
  const boundaryClose = ds.sCloseTime[b]!;
  let peak = atB.marked;
  let peakTime = boundaryClose;
  let dd = 0;
  let ddPeakTime = boundaryClose;
  let ddTroughTime = boundaryClose;
  let ddPeakValue = peak;
  let recovered: number | null = null;
  const { t, marked } = sim.markChanges;

  for (let i = 0; i < t.length; i++) {
    if (t[i]! <= boundaryClose) continue;

    const m = marked[i]!;

    if (m > peak) {
      peak = m;
      peakTime = t[i]!;
    }

    if (peak - m > dd) {
      dd = peak - m;
      ddPeakTime = peakTime;
      ddTroughTime = t[i]!;
      ddPeakValue = peak;
      recovered = null;
    } else if (recovered === null && dd > 0 && m >= ddPeakValue && t[i]! > ddTroughTime) recovered = t[i]!;
  }

  const newEntries = trades.filter((x) => x.entrySession > b);

  return {
    boundary: {
      date: boundaryDate,
      session: b,
      markedAtClose: r2(atB.marked),
      realizedAtClose: r2(atB.realized),
      unrealizedAtClose: r2(atB.unrealized)
    },
    development: { net: r2(atB.marked), realized: r2(atB.realized), open: r2(atB.unrealized) },
    validation: {
      net: r2(end.marked - atB.marked),
      realized,
      open,
      minuteDrawdownUsd: dd,
      minuteDrawdownPercent: (dd / 100000) * 100,
      peakTime: dd > 0 ? iso(ddPeakTime) : null,
      troughTime: dd > 0 ? iso(ddTroughTime) : null,
      recoveredAt: recovered === null ? null : iso(recovered),
      recoveryStatus: dd === 0 ? 'no drawdown' : recovered === null ? 'not recovered by the end' : 'recovered',
      newEntries: newEntries.length,
      newEntriesClosed: newEntries.filter((x) => x.status === 'closed').length,
      newWins: newEntries.filter((x) => x.status === 'closed' && x.net > 0).length,
      newLosses: newEntries.filter((x) => x.status === 'closed' && x.net < 0).length,
      newBreakeven: newEntries.filter((x) => x.status === 'closed' && x.net === 0).length,
      newEntriesNet: r2(newEntries.reduce((a, x) => a + x.net, 0)),
      openAtEnd: trades.some((x) => x.status === 'open'),
      sessions: daily.length - 1 - b,
      sessionsInvested: daily.slice(b + 1).filter((d) => d.investedDuringSession).length,
      exposurePercent:
        daily.length - 1 - b > 0
          ? (daily.slice(b + 1).filter((d) => d.investedDuringSession).length / (daily.length - 1 - b)) * 100
          : 0
    },
    carriedIn: carried
      ? {
          trade: carried.n,
          entryDate: carried.entryDate,
          status: carried.status,
          exitDate: carried.exitDate,
          developmentPart: carriedDev,
          validationPart: r2(carried.net - carriedDev),
          net: carried.net
        }
      : null
  };
};
