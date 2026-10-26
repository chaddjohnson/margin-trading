// Authoritative runs of the derived engine (PROTOCOL.md §5.1, §15): a configuration of search-view books on a loaded
// universe in fixed or portfolio mode under an allocation; and the figures the reports and gates read from a run —
// the fixed pool's liquidation-equivalent net and drawdowns, and the 20% portfolio's end equity, daily % drawdown,
// strategy net, borrowing dollar-days and productivity, over the whole run or after a boundary session.
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';
import { baseNRunConfig } from '../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { type Allocation, fixedLiquidation } from './allocation.ts';
import { study } from './context.ts';
import { type PRunResult, runPAllocator } from './engine.ts';
import type { Book } from './evaluate.ts';

export const phenotypesOf = (books: readonly Book[]): Record<string, BookPhenotype> =>
  Object.fromEntries(books.map((book) => [book.symbol, candidateBook(book.symbol, book.vector.id, book.vector.grid)]));

export const engineRun = (
  loaded: LoadedUniverse,
  books: readonly Book[],
  mode: 'fixed' | 'portfolio',
  costBps: number,
  allocation: Allocation,
  options: { phenotypes?: Record<string, BookPhenotype>; key?: string; lotDividends?: boolean } = {}
): PRunResult => {
  const symbols = books.map((book) => book.symbol);
  const members = mode === 'portfolio' ? [...new Set(['VOOG', 'VGT', ...symbols])] : symbols;

  return runPAllocator(
    {
      ...loaded.universe,
      instruments: Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!]))
    },
    {
      ...baseNRunConfig({
        key: options.key ?? `${symbols.join('+')}-${mode}-${costBps}bps-${allocation.policy.key}`,
        label: options.key ?? symbols.join('+'),
        mode,
        symbols,
        phenotypes: options.phenotypes ?? phenotypesOf(books),
        costBps,
        fraction: study.fraction,
        fixedPrincipal: study.principal,
        rate: study.rate,
        lotDividends: options.lotDividends ?? true,
        initial: { ...study.initialCore },
        eligibilityIndex: loaded.universe.eligibilityIndex,
        accountingStartIndex: loaded.warmup
      }),
      allocation
    }
  );
};

// The fixed pool's figures from an engine run (an open lot at its liquidation value for `net`).
export const fixedFigures = (result: PRunResult) => {
  const { sTime } = Object.values(result.universe.instruments)[0]!.ds;
  const last = sTime[result.endIndex]!;
  let net = 0;

  for (const lot of result.lots) {
    net +=
      lot.exitIndex >= 0
        ? lot.net
        : fixedLiquidation(lot as never, lot.exitRawPrice, last, result.config.rate, result.config.costBps).net;
  }

  return {
    net,
    engineNet: result.lots.reduce((total, lot) => total + lot.net, 0),
    lots: result.lots.length,
    minuteDrawdown: result.minuteDrawdown.maximum,
    dailyDrawdown: result.dailyDrawdown.maximum,
    interest: result.lots.reduce((total, lot) => total + lot.interest, 0),
    preemptions: {
      executed: result.preemptions.filter((record) => record.outcome === 'executed').length,
      superseded: result.preemptions.filter((record) => record.outcome === 'superseded').length,
      aborted: result.preemptions.filter((record) => record.outcome === 'aborted').length,
      declined: result.declines.length
    }
  };
};

// The portfolio's figures, over the whole run or after the close of `boundary` (peak reset to the boundary equity).
export const portfolioFigures = (result: PRunResult, boundary?: number) => {
  const rows = result.daily;
  const startRow = boundary === undefined ? undefined : rows.find((row) => row.index === boundary);

  if (boundary !== undefined && !startRow) {
    throw new Error(`no daily row at the boundary session ${boundary}`);
  }

  const after = boundary === undefined ? rows : rows.filter((row) => row.index > boundary);
  const end = rows.at(-1)!;
  const startEquity = startRow ? startRow.equity : study.initialCore.voog + study.initialCore.vgt;
  let peak = startEquity;
  let worst = 0;

  for (const row of after) {
    peak = Math.max(peak, row.equity);
    worst = Math.max(worst, peak > 0 ? (peak - row.equity) / peak : 0);
  }

  const interest = end.cumulativeInterest - (startRow ? startRow.cumulativeInterest : 0);
  const borrowingDollarDays = (interest * 365) / study.rate;
  const strategyNet = end.strategyMark - (startRow ? startRow.strategyMark : 0);

  return {
    endEquity: end.equity,
    startEquity,
    equityReturn: end.equity / startEquity - 1,
    dailyPercentDrawdown: boundary === undefined ? (result.dailyPercentDrawdown?.maximumPercent ?? worst) : worst,
    dailyPercentDrawdownRows: worst,
    strategyNet,
    interest,
    borrowingDollarDays,
    productivity: borrowingDollarDays > 0 ? (strategyNet / borrowingDollarDays) * 1e6 : NaN,
    lots: boundary === undefined ? result.lots.length : result.lots.filter((lot) => lot.entryIndex > boundary).length
  };
};

// The validation figures recomputed from an engine run's own daily marks (fixed mode): the increment after the close of
// `boundary` under the liquidation convention at both ends (an open lot's exit friction deducted), and the daily
// drawdown from the boundary mark (PROTOCOL.md §13.2) — the gate inputs the replay must reproduce.
export const windowFromEngine = (result: PRunResult, boundary: number) => {
  const rows = result.daily;
  const start = rows.find((row) => row.index === boundary);
  const end = rows.at(-1)!;
  const costBps = result.config.costBps;

  if (!start) {
    throw new Error(`no daily row at the boundary session ${boundary}`);
  }

  const exitFriction = (row: (typeof rows)[number]) =>
    Object.entries(row.lotShares).reduce((total, [symbol, shares]) => {
      const close = row.closes[symbol]!;

      return shares > 0 ? total + (shares * close - shares * (close * (1 - costBps / 10000))) : total;
    }, 0);
  let peak = start.strategyMark;
  let dailyDrawdown = 0;

  for (const row of rows.filter((entry) => entry.index > boundary)) {
    peak = Math.max(peak, row.strategyMark);
    dailyDrawdown = Math.max(dailyDrawdown, peak - row.strategyMark);
  }

  return {
    net: end.strategyMark - exitFriction(end) - (start.strategyMark - exitFriction(start)),
    dailyDrawdown,
    lots: result.lots.filter((lot) => lot.entryIndex > boundary).length
  };
};
