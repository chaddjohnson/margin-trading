// Forward figures of one continuous run after a cutoff session (PROTOCOL.md §3, §5, §6): baselines at the cutoff's
// close, per-lot attribution (a carried lot from its mark at the cutoff), accrual-based interest, friction of fills
// after the cutoff, drawdowns with the peak reset at the cutoff, and borrowing dollar-days from accrued interest.
// Pure functions of an engine result; every total is checked against its parts.
import { windowedMinuteDrawdown } from '../../d1-robust/walkforward.ts';
import type { RealLot } from '../../multi-etf-allocator/ledger.ts';
import type { NDailyRow, NRunResult } from '../../portfolio-aware-d1/nbook/engine.ts';
import type { ReplayBook } from '../../portfolio-aware-d1/replay.ts';

const tolerance = 1e-6;

export const cutoffIndexOf = (result: NRunResult, cutoff: string) => {
  const index = result.universe.dates.indexOf(cutoff);

  if (index < 0) {
    throw new Error(`the run has no session ${cutoff}`);
  }

  return index;
};

const rowsByIndex = (result: NRunResult) => new Map(result.daily.map((row) => [row.index, row]));

// The run's state at a session's close (the forward baseline): marks, interest, dividends and the lots open there.
export const stateAt = (result: NRunResult, index: number) => {
  const row = rowsByIndex(result).get(index);

  if (!row) {
    throw new Error(`no daily row at session index ${index}`);
  }

  const open = result.lots.filter((lot) => lot.entryIndex <= index && (lot.exitIndex < 0 || lot.exitIndex > index));

  return {
    date: row.date,
    strategyMark: row.strategyMark,
    realized: row.realized,
    unrealized: row.unrealized,
    equity: row.equity,
    cumulativeInterest: row.cumulativeInterest,
    cumulativeDividends: row.cumulativeDividends,
    lotsEntered: result.lots.filter((lot) => lot.entryIndex <= index).length,
    lotsClosed: result.lots.filter((lot) => lot.exitIndex >= 0 && lot.exitIndex <= index).length,
    openLots: open.map((lot) => ({
      symbol: lot.symbol,
      entryUtc: new Date(lot.entryTime * 1000).toISOString(),
      entryPrice: lot.entryPrice,
      shares: lot.shares,
      principal: lot.originalPrincipal
    })),
    decisions: result.signals.filter((signal) => signal.date <= row.date).length
  };
};

export type CutoffState = ReturnType<typeof stateAt>;

// The maximum fall from a running peak that starts at the baseline, over the given values.
// Drawdowns from a running peak that starts at the baseline: the largest fall in dollars and, separately, the largest
// fall in percent of its running peak (the engine's PercentTracker definition; the two need not be the same episode).
export const drawdownFrom = (baseline: number, values: { value: number; date: string }[]) => {
  let peak = baseline;
  let peakDate = 'cutoff';
  let dollars = { dollars: 0, peakDate: '', troughDate: '' };
  let percent = { percent: 0, peakDate: '', troughDate: '' };

  for (const item of values) {
    if (item.value > peak) {
      peak = item.value;
      peakDate = item.date;
    }

    const fall = peak - item.value;

    if (fall > dollars.dollars) {
      dollars = { dollars: fall, peakDate, troughDate: item.date };
    }

    if (peak > 0 && fall / peak > percent.percent) {
      percent = { percent: fall / peak, peakDate, troughDate: item.date };
    }
  }

  return {
    ...dollars,
    percent: percent.percent,
    percentPeakDate: percent.peakDate,
    percentTroughDate: percent.troughDate
  };
};

const lotFriction = (lot: RealLot | NRunResult['lots'][number]) => ({
  entry: lot.shares * (lot.entryPrice - lot.entryRawPrice),
  exit: lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0
});

export const forwardFiguresOf = (
  result: NRunResult,
  cutoff: string,
  options: { rate: number; costBps: number; notional: number }
) => {
  const cIndex = cutoffIndexOf(result, cutoff);
  const rows = result.daily.filter((row) => row.index > cIndex);
  const base = stateAt(result, cIndex);

  if (rows.length === 0) {
    return { observations: 0 as const, cutoff, base };
  }

  const portfolio = result.config.mode === 'portfolio';
  const last: NDailyRow = rows.at(-1)!;
  const endIndex = last.index;
  const forwardNet = last.strategyMark - base.strategyMark;
  const carried = result.lots.filter(
    (lot) => lot.entryIndex <= cIndex && (lot.exitIndex < 0 || lot.exitIndex > cIndex)
  );

  if (carried.length > 1) {
    throw new Error(`${carried.length} lots open at the cutoff: the single-slot pool holds at most one`);
  }

  const lots = result.lots
    .filter((lot) => lot.exitIndex < 0 || lot.exitIndex > cIndex)
    .map((lot) => {
      const isCarried = lot.entryIndex <= cIndex;
      const friction = lotFriction(lot);

      return {
        lot: lot.id,
        symbol: lot.symbol,
        carried: isCarried,
        entryUtc: new Date(lot.entryTime * 1000).toISOString(),
        exitUtc: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open',
        principal: lot.originalPrincipal,
        markAtCutoff: isCarried ? base.unrealized : 0,
        netAtEnd: lot.net,
        forwardPnl: lot.net - (isCarried ? base.unrealized : 0),
        forwardFriction: (lot.entryIndex > cIndex ? friction.entry : 0) + (lot.exitIndex > cIndex ? friction.exit : 0),
        open: lot.exitIndex < 0
      };
    });
  const attributed = lots.reduce((total, lot) => total + lot.forwardPnl, 0);

  if (Math.abs(attributed - forwardNet) > tolerance) {
    throw new Error(`the per-lot forward attribution ${attributed} does not sum to the forward net ${forwardNet}`);
  }

  const forwardInterest = last.cumulativeInterest - base.cumulativeInterest;
  const borrowingDollarDays = (forwardInterest * 365) / options.rate;
  const bySymbol: Record<string, { lots: number; forwardPnl: number }> = {};

  for (const lot of lots) {
    bySymbol[lot.symbol] ??= { lots: 0, forwardPnl: 0 };
    bySymbol[lot.symbol]!.lots++;
    bySymbol[lot.symbol]!.forwardPnl += lot.forwardPnl;
  }

  const largest = [...lots].sort((a, b) => b.forwardPnl - a.forwardPnl)[0];
  const decisions = result.signals.filter((signal) => signal.date > cutoff);
  const months = new Map<
    string,
    { month: string; strategyChange: number; equityChange: number; interest: number; lotsEntered: number }
  >();
  let previous = rowsByIndex(result).get(cIndex)!;

  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const item = months.get(month) ?? { month, strategyChange: 0, equityChange: 0, interest: 0, lotsEntered: 0 };

    item.strategyChange += row.strategyMark - previous.strategyMark;
    item.equityChange += row.equity - previous.equity;
    item.interest += row.cumulativeInterest - previous.cumulativeInterest;
    months.set(month, item);
    previous = row;
  }

  for (const lot of result.lots.filter((item) => item.entryIndex > cIndex)) {
    months.get(result.universe.dates[lot.entryIndex]!.slice(0, 7))!.lotsEntered++;
  }

  const years = new Map<
    string,
    { year: string; strategyChange: number; equityChange: number; interest: number; lotsEntered: number }
  >();

  for (const item of months.values()) {
    const year = item.month.slice(0, 4);
    const total = years.get(year) ?? { year, strategyChange: 0, equityChange: 0, interest: 0, lotsEntered: 0 };

    total.strategyChange += item.strategyChange;
    total.equityChange += item.equityChange;
    total.interest += item.interest;
    total.lotsEntered += item.lotsEntered;
    years.set(year, total);
  }

  // The windowed minute drawdown marks lots at the frozen 11% (src/d1-robust/walkforward.ts); a rate scenario reports
  // its daily drawdown only.
  const fixedRisk = portfolio
    ? undefined
    : options.rate !== 0.11
      ? (() => {
          const daily = drawdownFrom(
            base.strategyMark,
            rows.map((row) => ({ value: row.strategyMark, date: row.date }))
          );

          return {
            minuteDrawdown: NaN,
            minuteDrawdownPercentOfNotional: NaN,
            dailyDrawdown: daily.dollars,
            dailyDrawdownPercentOfNotional: daily.dollars / options.notional,
            dailyDrawdownPeak: daily.peakDate,
            dailyDrawdownTrough: daily.troughDate
          };
        })()
      : (() => {
          // The minute-sampled drawdown with its peak reset at the cutoff, from the lots and the minute bars, after
          // checking that the same computation over the whole run equals the engine's own figure.
          const marks = new Float64Array(result.universe.sessionCount);

          for (const row of result.daily) {
            marks[row.index] = row.strategyMark;
          }

          const books = Object.values(result.universe.instruments).map((instrument) => ({
            symbol: instrument.symbol,
            ds: instrument.ds
          })) as unknown as ReplayBook[];
          const start = result.config.accountingStartIndex ?? 0;
          const whole = windowedMinuteDrawdown(
            result.lots as unknown as RealLot[],
            books,
            marks,
            start,
            result.endIndex,
            options.costBps
          );

          if (Math.abs(whole - result.minuteDrawdown.maximum) > tolerance) {
            throw new Error(
              `the windowed minute drawdown ${whole} differs from the engine's ${result.minuteDrawdown.maximum}`
            );
          }

          const minute = windowedMinuteDrawdown(
            result.lots as unknown as RealLot[],
            books,
            marks,
            cIndex,
            endIndex,
            options.costBps
          );
          const daily = drawdownFrom(
            base.strategyMark,
            rows.map((row) => ({ value: row.strategyMark, date: row.date }))
          );

          return {
            minuteDrawdown: minute,
            minuteDrawdownPercentOfNotional: minute / options.notional,
            dailyDrawdown: daily.dollars,
            dailyDrawdownPercentOfNotional: daily.dollars / options.notional,
            dailyDrawdownPeak: daily.peakDate,
            dailyDrawdownTrough: daily.troughDate
          };
        })();
  const portfolioRisk = portfolio
    ? (() => {
        const daily = drawdownFrom(
          base.equity,
          rows.map((row) => ({ value: row.equity, date: row.date }))
        );

        return {
          equityAtCutoff: base.equity,
          equityAtEnd: last.equity,
          equityChange: last.equity - base.equity,
          forwardReturn: last.equity / base.equity - 1,
          dailyPercentDrawdown: daily.percent,
          dailyPercentDrawdownPeak: daily.percentPeakDate,
          dailyPercentDrawdownTrough: daily.percentTroughDate,
          dailyDrawdownDollars: daily.dollars,
          dailyDrawdownPeak: daily.peakDate,
          dailyDrawdownTrough: daily.troughDate,
          // Normalized by each pool's own cutoff equity, so pools with different equity are comparable.
          strategyReturnOnCutoffEquity: forwardNet / base.equity,
          borrowingIntensity: borrowingDollarDays / base.equity,
          forwardDividends: last.cumulativeDividends - base.cumulativeDividends,
          minutePercentDrawdown: 'not available for the forward window (the engine tracks it for the whole run only)',
          wholeRunMinutePercentDrawdown: result.minutePercentDrawdown?.maximumPercent ?? NaN
        };
      })()
    : undefined;

  return {
    observations: rows.length,
    cutoff,
    base,
    first: rows[0]!.date,
    last: last.date,
    forwardNet,
    realizedInWindow: lots.filter((lot) => !lot.open).reduce((total, lot) => total + lot.forwardPnl, 0),
    unrealizedAtEnd: lots.filter((lot) => lot.open).reduce((total, lot) => total + lot.forwardPnl, 0),
    forwardInterest,
    forwardFriction: lots.reduce((total, lot) => total + lot.forwardFriction, 0),
    forwardFrictionBpsPerSide: options.costBps,
    borrowingDollarDays,
    netPerMillionBorrowingDollarDays: borrowingDollarDays > 0 ? (forwardNet / borrowingDollarDays) * 1e6 : NaN,
    decisions: decisions.length,
    granted: decisions.filter((signal) => signal.outcome === 'granted').length,
    refused: decisions.filter((signal) => signal.outcome === 'refused').length,
    lotsCarried: carried.length,
    lotsNew: lots.filter((lot) => !lot.carried).length,
    lotsClosedInWindow: lots.filter((lot) => !lot.open).length,
    lotsOpenAtEnd: lots.filter((lot) => lot.open).length,
    timeInMarket: rows.filter((row) => row.openLots > 0).length / rows.length,
    largestLot: largest
      ? {
          lot: largest.lot,
          symbol: largest.symbol,
          forwardPnl: largest.forwardPnl,
          shareOfNet: forwardNet !== 0 ? largest.forwardPnl / forwardNet : NaN
        }
      : null,
    bySymbol,
    months: [...months.values()],
    years: [...years.values()],
    lots,
    ...(fixedRisk ? { fixed: fixedRisk } : {}),
    ...(portfolioRisk ? { portfolio: portfolioRisk } : {})
  };
};

export type ForwardFigures = ReturnType<typeof forwardFiguresOf>;
export type ForwardObserved = Exclude<ForwardFigures, { observations: 0 }>;
