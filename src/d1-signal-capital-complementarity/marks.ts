// Window marks, lot shares and drawdowns (PROTOCOL.md §3.2, §7.3, §8).
//
// - A window (b, e]'s increment V = liquidation-equivalent mark at e's close − the same at b's close (the source
//   convention: an open lot at its liquidation value, exit friction and interest to that session); the whole run has
//   b = none (mark 0).
// - Each lot's in-window share = its contribution at e − its contribution at b, where a lot contributes 0 before its
//   entry session, its net once closed, and its liquidation value while open at a close. The shares sum exactly to V
//   (checked).
// - Fixed-mode minute marks are re-derived from the lots and the minute bars in the frozen engine's own order (the
//   funded lot marked at its symbol's bar closes and at every session close, realized P&L in exit order) and fed to
//   the frozen Tracker; the whole-run maximum must equal the engine's minute drawdown (checked), the windowed one
//   restarts the peak at b's close. Daily drawdowns come from the engine's own daily rows.
import { Tracker } from '../multi-etf-allocator/engine.ts';
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';
import { study } from './context.ts';

const secondsPerYear = 365 * 86400;

export interface LotLike {
  id: number;
  symbol: string;
  entryIndex: number;
  entryBar: number;
  exitIndex: number;
  exitBar: number;
  shares: number;
  principal: number;
  net: number;
}

export const lotsOf = (result: NRunResult): LotLike[] =>
  result.lots.map((lot) => ({
    id: lot.id,
    symbol: lot.symbol,
    entryIndex: lot.entryIndex,
    entryBar: lot.entryBar,
    exitIndex: lot.exitIndex,
    exitBar: lot.exitBar,
    shares: lot.shares,
    principal: lot.originalPrincipal,
    net: lot.net
  }));

// A lot's liquidation-equivalent contribution to the mark at the close of session s.
export const contributionAt = (result: NRunResult, lot: LotLike, s: number, costBps: number, rate = study.rate) => {
  if (s < 0 || lot.entryIndex > s) {
    return 0;
  }

  if (lot.exitIndex >= 0 && lot.exitIndex <= s) {
    return lot.net;
  }

  const ds = result.universe.instruments[lot.symbol]!.ds;
  const proceeds = lot.shares * ds.sClose[s]! * (1 - costBps / 10000);
  const interest = lot.principal * rate * ((ds.sTime[s]! - ds.sTime[lot.entryIndex]!) / secondsPerYear);

  return proceeds - lot.principal - interest;
};

export const windowIndices = (result: NRunResult, boundary?: string) => {
  const end = result.endIndex;
  const b = boundary ? result.universe.dates.indexOf(boundary) : -1;

  if (boundary && b < 0) {
    throw new Error(`the boundary ${boundary} is not a session of the run`);
  }

  return { boundaryIndex: b, endIndex: end };
};

export interface LotShare {
  id: number;
  symbol: string;
  share: number;
  atBoundary: number;
  atEnd: number;
}

export const lotSharesOf = (result: NRunResult, costBps: number, boundary?: string) => {
  const { boundaryIndex, endIndex } = windowIndices(result, boundary);
  const shares: LotShare[] = lotsOf(result).map((lot) => {
    const atBoundary = contributionAt(result, lot, boundaryIndex, costBps);
    const atEnd = contributionAt(result, lot, endIndex, costBps);

    return { id: lot.id, symbol: lot.symbol, share: atEnd - atBoundary, atBoundary, atEnd };
  });
  const increment = shares.reduce((total, item) => total + item.share, 0);

  return { shares, increment, boundaryIndex, endIndex };
};

// The liquidation-equivalent mark at a session close from the engine's own daily row (strategy mark less the exit
// friction of the lots open at that close) — the identity the shares must satisfy.
export const liquidationMark = (result: NRunResult, s: number, costBps: number) => {
  if (s < 0) {
    return 0;
  }

  const row = result.daily.find((item) => item.index === s);

  if (!row) {
    throw new Error(`no daily row for session ${s}`);
  }

  let friction = 0;

  for (const lot of result.lots) {
    if (lot.entryIndex <= s && (lot.exitIndex < 0 || lot.exitIndex > s)) {
      friction += lot.shares * result.universe.instruments[lot.symbol]!.ds.sClose[s]! * (costBps / 10000);
    }
  }

  return row.strategyMark - friction;
};

export const windowIncrementOf = (result: NRunResult, costBps: number, boundary?: string) => {
  const { boundaryIndex, endIndex } = windowIndices(result, boundary);
  const atBoundary = liquidationMark(result, boundaryIndex, costBps);
  const atEnd = liquidationMark(result, endIndex, costBps);
  const fromShares = lotSharesOf(result, costBps, boundary).increment;

  if (Math.abs(atEnd - atBoundary - fromShares) > 1e-6) {
    throw new Error(`window identity: mark change ${atEnd - atBoundary} ≠ Σ lot shares ${fromShares}`);
  }

  return { atBoundary, atEnd, increment: atEnd - atBoundary, boundaryIndex, endIndex };
};

// ----- fixed-mode minute marks -----

export interface Mark {
  time: number;
  value: number;
}

export const fixedMinuteMarks = (result: NRunResult, rate = study.rate): Mark[] => {
  if (result.config.mode !== 'fixed') {
    throw new Error('minute marks are re-derived for fixed mode only');
  }

  const marks: Mark[] = [];
  const lots = lotsOf(result).sort((a, b) => a.entryIndex - b.entryIndex || a.entryBar - b.entryBar);
  const anyDs = result.universe.instruments[result.config.symbols[0]!]!.ds;
  const endIndex = result.endIndex;
  let realized = 0;
  let next = 0; // the next lot to enter (in a one-slot pool lots never overlap in time)
  let open: LotLike | undefined;

  const markOf = (lot: LotLike, price: number, s: number) => {
    const ds = result.universe.instruments[lot.symbol]!.ds;

    return (
      lot.shares * price -
      lot.principal -
      (0 + lot.principal * rate * ((ds.sTime[s]! - ds.sTime[lot.entryIndex]!) / secondsPerYear))
    );
  };

  for (let s = 1; s <= endIndex; s++) {
    // Lots active in this session, in time order: the one open at the session's start, then any entering in it.
    for (;;) {
      if (!open) {
        if (next < lots.length && lots[next]!.entryIndex === s) {
          open = lots[next]!;
          next++;
        } else {
          break;
        }
      }

      const lot = open;
      const ds = result.universe.instruments[lot.symbol]!.ds;
      const start = ds.sBarStart[s]!;
      const count = ds.sBarCount[s]!;
      const first = lot.entryIndex === s ? lot.entryBar : 0;
      const exitsHere = lot.exitIndex === s;
      let closed = false;

      for (let k = first; k < count; k++) {
        if (exitsHere && k === lot.exitBar) {
          realized += lot.net;
          marks.push({ time: ds.bTime[start + k]!, value: realized });
          closed = true;
          break;
        }

        marks.push({ time: ds.bTime[start + k]!, value: realized + markOf(lot, ds.bClose[start + k]!, s) });
      }

      if (!closed && exitsHere && lot.exitBar >= count) {
        realized += lot.net; // a closing-print exit: realized before the close's mark
        closed = true;
      }

      if (closed) {
        open = undefined;
        continue; // another lot may enter later in the session
      }

      break; // still open at the close
    }

    const value = open ? realized + markOf(open, result.universe.instruments[open.symbol]!.ds.sClose[s]!, s) : realized;

    marks.push({ time: anyDs.sCloseTime[s]!, value });
  }

  return marks;
};

export interface DrawdownStats {
  maximum: number;
  peakTime: number;
  troughTime: number;
  peakValue: number;
  troughValue: number;
  recoveryTime: number;
}

const statsOf = (tracker: Tracker): DrawdownStats => ({
  maximum: tracker.maximum,
  peakTime: tracker.ddPeakTime,
  troughTime: tracker.troughTime,
  peakValue: tracker.peakValue,
  troughValue: tracker.troughValue,
  recoveryTime: tracker.recoveryTime
});

// The whole-run minute drawdown from the re-derived marks (must equal the engine's), and the windowed one.
export const fixedMinuteDrawdowns = (result: NRunResult, boundary?: string) => {
  const marks = fixedMinuteMarks(result);
  const anyDs = result.universe.instruments[result.config.symbols[0]!]!.ds;
  const firstBarTime = anyDs.bTime[anyDs.sBarStart[0]!]!;
  const whole = new Tracker(0, firstBarTime);

  for (const mark of marks) {
    whole.updateStrict(mark.value, mark.time);
  }

  if (Math.abs(whole.maximum - result.minuteDrawdown.maximum) > 1e-6) {
    throw new Error(
      `minute-drawdown re-derivation ${whole.maximum} ≠ engine ${result.minuteDrawdown.maximum} (${result.config.key})`
    );
  }

  let windowed: DrawdownStats = statsOf(whole);

  if (boundary) {
    const b = result.universe.dates.indexOf(boundary);
    const closeB = anyDs.sCloseTime[b]!;
    const atB = [...marks].reverse().find((mark) => mark.time <= closeB)?.value ?? 0;
    const tracker = new Tracker(atB, closeB);

    for (const mark of marks) {
      if (mark.time > closeB) {
        tracker.updateStrict(mark.value, mark.time);
      }
    }

    windowed = statsOf(tracker);
  }

  return { whole: statsOf(whole), windowed, marks: marks.length };
};

// The daily drawdown of the engine's daily strategy marks (fixed) or equity (portfolio), restarted at b's close.
export const dailyDrawdownOf = (
  result: NRunResult,
  boundary?: string,
  field: 'strategyMark' | 'equity' = 'strategyMark'
) => {
  const rows = result.daily;
  const b = boundary ? result.universe.dates.indexOf(boundary) : -1;
  const startRow = rows.find((row) => row.index === b);
  const startValue = startRow ? startRow[field] : field === 'equity' ? rows[0]!.equity : 0;
  const tracker = new Tracker(startValue, b); // daily stats' times are session indices
  let maxPercent = 0;
  let percentPeak = startValue;
  let percentPeakDate = startRow?.date ?? rows[0]!.date;
  let percentTroughDate = percentPeakDate;
  let percentPeakAtMax = percentPeakDate;

  for (const row of rows) {
    if (row.index <= b) {
      continue;
    }

    const value = row[field];

    if (field === 'equity') {
      tracker.update(value, row.index);

      if (value >= percentPeak) {
        percentPeak = value;
        percentPeakDate = row.date;
      }

      const depth = percentPeak > 0 ? 1 - value / percentPeak : 0;

      if (depth > maxPercent) {
        maxPercent = depth;
        percentPeakAtMax = percentPeakDate;
        percentTroughDate = row.date;
      }
    } else {
      tracker.updateStrict(value, row.index);
    }
  }

  return {
    ...statsOf(tracker),
    maxPercent: field === 'equity' ? maxPercent : NaN,
    percentPeakDate: field === 'equity' ? percentPeakAtMax : '',
    percentTroughDate: field === 'equity' ? percentTroughDate : ''
  };
};

// The worst change of the daily mark over k calendar days (k = 30/60/90), inside (b, e].
export const rollingWorst = (result: NRunResult, days: number, boundary?: string) => {
  const rows = result.daily;
  const b = boundary ? result.universe.dates.indexOf(boundary) : -1;
  const times = result.universe.instruments[result.config.symbols[0] ?? 'VGT']!.ds.sTime;
  let worst = 0;
  let worstEnd = '';
  let u = 0;

  for (let t = 0; t < rows.length; t++) {
    const row = rows[t]!;

    if (row.index <= b) {
      continue;
    }

    const limit = times[row.index]! - days * 86400;

    while (u + 1 < rows.length && times[rows[u + 1]!.index]! <= limit) {
      u++;
    }

    const base = times[rows[u]!.index]! <= limit ? rows[u]! : undefined;
    const from =
      base && base.index >= b ? base.strategyMark : b >= 0 ? rows.find((item) => item.index === b)!.strategyMark : 0;
    const change = row.strategyMark - from;

    if (change < worst) {
      worst = change;
      worstEnd = row.date;
    }
  }

  return { days, worst, worstEnd };
};
