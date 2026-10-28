// Risk figures of one run over one window (PROTOCOL.md §8), in matched units: per trade, per price-catalog episode
// (falling-knife episodes: Study 1's definition — an eligible episode with at least one lot entered at or before its
// trough whose attributed episode net is ≤ 0), per cumulative window, and the portfolio's peak-to-trough.
import { type Spec, compactLotsOf } from '../d1-standalone-opportunity-audit/run.ts';
import { capturesOf, catalogOf } from '../d1-standalone-opportunity-audit/events.ts';
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';
import { study } from './context.ts';
import { dailyDrawdownOf, fixedMinuteDrawdowns, rollingWorst, windowIncrementOf } from './marks.ts';

const asSpec = (costBps: number) => ({ rate: study.rate, costBps }) as unknown as Spec;

export const fixedRiskOf = (result: NRunResult, costBps: number, boundary?: string) => {
  const universe = result.universe;
  const b = boundary ? universe.dates.indexOf(boundary) : -1;
  const lots = compactLotsOf(universe, result, asSpec(costBps));
  const entered = lots.filter((lot) => lot.entryIndex > b);
  const closed = entered.filter((lot) => lot.exitIndex >= 0);
  const losing = closed.filter((lot) => lot.net <= 0);
  const byExit = [...closed].sort((x, y) => x.exitTime - y.exitTime);
  let run = 0;
  let longest = 0;

  for (const lot of byExit) {
    run = lot.net <= 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  const reasons: Record<string, number> = {};

  for (const lot of entered) {
    reasons[lot.exitReason] = (reasons[lot.exitReason] ?? 0) + 1;
  }

  // Falling-knife episodes among the funded lots entered in the window, per symbol's own price catalog.
  let fallingKnifeEpisodes = 0;
  let fallingKnifeNet = 0;
  let declineEntryEpisodes = 0;
  const knives: { symbol: string; episode: string; peak: string; trough: string; net: number; entries: number }[] = [];

  for (const symbol of [...new Set(entered.map((lot) => lot.symbol))].sort()) {
    const ds = universe.instruments[symbol]!.ds;
    const catalog = catalogOf(symbol, universe.dates, ds.sClose, universe.eligibilityIndex, result.endIndex);
    const captures = capturesOf(
      catalog,
      entered.filter((lot) => lot.symbol === symbol),
      new Uint8Array(ds.sessionCount)
    );

    for (const capture of captures) {
      if (capture.eligible && capture.declineEntries > 0) {
        declineEntryEpisodes++;

        if (capture.net <= 0) {
          const episode = catalog.find((item) => item.id === capture.episode)!;

          fallingKnifeEpisodes++;
          fallingKnifeNet += capture.net;
          knives.push({
            symbol,
            episode: capture.episode,
            peak: episode.peakDate,
            trough: episode.troughDate,
            net: capture.net,
            entries: capture.entries
          });
        }
      }
    }
  }

  const minute = fixedMinuteDrawdowns(result, boundary);
  const daily = dailyDrawdownOf(result, boundary);
  const increment = windowIncrementOf(result, costBps, boundary);
  const rowsIn = result.daily.filter((row) => row.index > b);
  const interestRows = result.daily;
  const interestAt = (s: number) => (s < 0 ? 0 : interestRows.find((row) => row.index === s)!.cumulativeInterest);
  const windowInterest = interestAt(result.endIndex) - interestAt(b);
  const borrowingDollarDays = (windowInterest * 365) / study.rate;
  const eligibleRows = rowsIn.filter((row) => row.index >= universe.eligibilityIndex);

  return {
    increment: increment.increment,
    lotsEntered: entered.length,
    closed: closed.length,
    wins: closed.filter((lot) => lot.net > 0).length,
    losses: losing.length,
    open: entered.length - closed.length,
    gross: entered.reduce((total, lot) => total + lot.gross, 0),
    interest: entered.reduce((total, lot) => total + lot.interest, 0),
    friction: entered.reduce((total, lot) => total + lot.friction, 0),
    lotNet: entered.reduce((total, lot) => total + lot.net, 0),
    worstClosed: closed.length > 0 ? Math.min(...closed.map((lot) => lot.net)) : null,
    worstClosedGross: closed.length > 0 ? closed.reduce((w, lot) => (lot.net < w.net ? lot : w)).gross : null,
    worstClosedInterest: closed.length > 0 ? closed.reduce((w, lot) => (lot.net < w.net ? lot : w)).interest : null,
    lossSum: losing.reduce((total, lot) => total + lot.net, 0),
    worstMaeDollars: entered.length > 0 ? Math.min(...entered.map((lot) => lot.maeDollars)) : null,
    worstMaePercent: entered.length > 0 ? Math.min(...entered.map((lot) => lot.maePercent)) : null,
    worstMark: entered.length > 0 ? Math.min(...entered.map((lot) => lot.worstMark)) : null,
    maeToLoss:
      losing.length > 0
        ? losing.reduce((total, lot) => total + lot.maeDollars, 0) / losing.reduce((total, lot) => total + lot.net, 0)
        : null,
    exitReasons: reasons,
    maxConsecutiveLosses: longest,
    rolling: [30, 60, 90].map((days) => rollingWorst(result, days, boundary)),
    minuteDrawdown: minute.windowed,
    minuteDrawdownWholeRun: minute.whole.maximum,
    dailyDrawdown: daily,
    fallingKnifeEpisodes,
    fallingKnifeNet,
    declineEntryEpisodes,
    knives,
    sessions: eligibleRows.length,
    sessionsWithLot: eligibleRows.filter((row) => row.openLots > 0).length,
    timeInMarket:
      eligibleRows.length > 0 ? eligibleRows.filter((row) => row.openLots > 0).length / eligibleRows.length : 0,
    windowInterest,
    borrowingDollarDays,
    netPerMillionBorrowingDollarDays: borrowingDollarDays > 0 ? (increment.increment / borrowingDollarDays) * 1e6 : null
  };
};

export type FixedRisk = ReturnType<typeof fixedRiskOf>;

export const portfolioRiskOf = (result: NRunResult, boundary?: string) => {
  const b = boundary ? result.universe.dates.indexOf(boundary) : -1;
  const startRow = b >= 0 ? result.daily.find((row) => row.index === b)! : undefined;
  const last = result.daily.at(-1)!;
  const daily = dailyDrawdownOf(result, boundary, 'equity');
  const closes = last.closes;

  return {
    startEquity: startRow ? startRow.equity : study.portfolio.initial.voog + study.portfolio.initial.vgt,
    endEquity: last.equity,
    equityIncrement:
      last.equity - (startRow ? startRow.equity : study.portfolio.initial.voog + study.portfolio.initial.vgt),
    windowedDailyPercentDrawdown: daily.maxPercent,
    windowedDailyPeak: daily.percentPeakDate,
    windowedDailyTrough: daily.percentTroughDate,
    wholeRunDailyPercentDrawdown: result.dailyPercentDrawdown?.maximumPercent ?? NaN,
    wholeRunMinutePercentDrawdown: result.minutePercentDrawdown?.maximumPercent ?? NaN,
    coreValueAtEnd: last.voogShares * closes.VOOG! + last.vgtCoreShares * closes.VGT!,
    lots: result.lots.filter((lot) => lot.entryIndex > b).length,
    refusedForMargin: result.signals.filter(
      (signal) => signal.outcome === 'refused' && !/^pool (occupied|reserved)/.test(signal.reason)
    ).length
  };
};

export type PortfolioRisk = ReturnType<typeof portfolioRiskOf>;
