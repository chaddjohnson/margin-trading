// Recorded runs for reporting: full metrics, setups, the daily curve, and the per-episode comparison of a
// candidate with B0 (when each bought, at what price relative to the episode's trough, and what each
// earned over the episode's attribution block).
import type { RunOptions, SimulationResult, StrategyParams } from './engine.ts';
import { type AnalysisEpisode, attributionBlocks, blockPnl, entriesDuring } from './episodes.ts';
import { type WindowMetrics, windowMetrics } from './metrics.ts';
import { describeParams } from './params.ts';
import { type Study, recordedRun } from './study.ts';

export interface DetailEntry {
  label: string;
  params: StrategyParams;
  options?: Partial<RunOptions>;
}

export interface DetailRun extends DetailEntry {
  result: SimulationResult;
  metrics: WindowMetrics;
}

export const detailRuns = (
  study: Study,
  entries: DetailEntry[],
  first: number,
  last: number,
  runStart = first
): DetailRun[] =>
  entries.map((entry) => {
    const result = recordedRun(study, entry.params, runStart, last, entry.options);

    return { ...entry, result, metrics: windowMetrics(study.bars, result, first, last) };
  });

export const metricsRow = (run: DetailRun) => ({
  label: run.label,
  params: describeParams(run.params),
  execution: run.result.options.execution,
  window: `${run.metrics.firstDate}..${run.metrics.lastDate}`,
  net: run.metrics.netProfit,
  maxDrawdown: run.metrics.maximumDrawdown,
  drawdownPct: run.metrics.maximumDrawdown / run.result.options.investment,
  drawdownPeak: run.metrics.drawdownPeakDate,
  drawdownTrough: run.metrics.drawdownTroughDate,
  interest: run.metrics.interest,
  entries: run.metrics.entries,
  closedTrades: run.metrics.closedTrades,
  winRate: run.metrics.winRate,
  timeInMarket: run.metrics.timeInMarket,
  worstTradeMark: run.metrics.worstTradeMark,
  worstTradeLowDrop: run.metrics.worstTradeLowDrop,
  setupsArmed: run.metrics.setupsArmed,
  setupsFilled: run.metrics.setupsFilled,
  setupsCancelled: run.metrics.setupsCancelled,
  setupsExpired: run.metrics.setupsExpired,
  setupsPendingAtEnd: run.metrics.setupsPendingAtEnd,
  meanWaitSessions: run.metrics.meanWaitSessions,
  medianWaitSessions: run.metrics.medianWaitSessions,
  restrictedEntries: run.metrics.restrictedEntries,
  openAtEnd: run.metrics.openAtEnd,
  openMarkAtEnd: run.metrics.openMarkAtEnd
});

export const episodeComparison = (
  study: Study,
  baseline: DetailRun,
  candidate: DetailRun,
  episodes: AnalysisEpisode[],
  first: number,
  last: number
) => {
  const date = (index: number) => (index >= 0 ? study.bars.date[index]! : '');

  return attributionBlocks(study.bars, episodes, first, last).map((block) => {
    const episode = block.episode;
    const base = episode ? entriesDuring(baseline.result, episode) : undefined;
    const cand = episode ? entriesDuring(candidate.result, episode) : undefined;
    const trough = episode ? study.bars.close[episode.troughIndex]! : NaN;
    const baseBlock = blockPnl(baseline.result, block);
    const candBlock = blockPnl(candidate.result, block);

    return {
      candidate: candidate.label,
      block: block.label,
      blockEnd: date(block.last),
      depth: episode?.depth ?? NaN,
      speed: episode?.speed ?? '',
      depthClass: episode?.depthClass ?? '',
      shape: episode?.shape ?? '',
      failedRallies: episode?.failedRallies ?? NaN,
      troughDate: episode ? date(episode.troughIndex) : '',
      baseFirstEntry: base ? date(base.firstEntryIndex) : '',
      baseEntryPrice: base?.firstEntryPrice ?? NaN,
      baseEntryToTrough: base && Number.isFinite(base.firstEntryPrice) ? trough / base.firstEntryPrice - 1 : NaN,
      candFirstEntry: cand ? date(cand.firstEntryIndex) : '',
      candEntryPrice: cand?.firstEntryPrice ?? NaN,
      candEntryAboveTrough: cand && Number.isFinite(cand.firstEntryPrice) ? cand.firstEntryPrice / trough - 1 : NaN,
      relativeEntryPrice:
        base && cand && Number.isFinite(base.firstEntryPrice) && Number.isFinite(cand.firstEntryPrice)
          ? cand.firstEntryPrice / base.firstEntryPrice - 1
          : NaN,
      baseEntries: base?.entries ?? 0,
      candEntries: cand?.entries ?? 0,
      tradeDisappeared: Boolean(base && cand && base.entries > 0 && cand.entries === 0),
      tradeAppeared: Boolean(base && cand && base.entries === 0 && cand.entries > 0),
      baseProfitOfEntries: base?.profitOfEntries ?? NaN,
      candProfitOfEntries: cand?.profitOfEntries ?? NaN,
      baseBlockPnl: baseBlock,
      candBlockPnl: candBlock,
      blockDifference: candBlock - baseBlock
    };
  });
};

export const tradesRows = (study: Study, run: DetailRun) =>
  run.result.trades.map((trade) => ({
    label: run.label,
    setup: trade.setupId,
    decision: study.bars.date[trade.decisionIndex],
    entry: study.bars.date[trade.entryIndex],
    exit: trade.exitIndex >= 0 ? study.bars.date[trade.exitIndex] : '',
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice,
    reason: trade.reason,
    restrictedEntry: trade.restrictedEntry,
    interest: trade.interest,
    profit: trade.profit,
    priceReturn: trade.priceReturn,
    worstMark: trade.worstMark,
    lowDrop: 1 - trade.lowestLow / trade.entryPrice,
    restrictedAfter: trade.restrictedAfter
  }));

export const setupsRows = (study: Study, run: DetailRun) =>
  run.result.setups.map((setup) => {
    const date = (index: number) => (index >= 0 ? study.bars.date[index] : '');
    const decisionClose = setup.decisionIndex >= 0 ? study.bars.close[setup.decisionIndex]! : NaN;

    return {
      label: run.label,
      id: setup.id,
      armed: date(setup.armIndex),
      armClose: setup.armClose,
      armDrawdown: setup.armDrawdown,
      restrictedAtArm: setup.restrictedAtArm,
      trough: setup.trough,
      troughDate: date(setup.troughIndex),
      newTroughs: setup.newTroughs,
      declineAfterArm: 1 - setup.trough / setup.armClose,
      atrSnapshot: setup.atrSnapshot,
      decision: date(setup.decisionIndex),
      trigger: setup.trigger,
      effectiveRebound: setup.decisionIndex >= 0 ? decisionClose / setup.trough - 1 : NaN,
      triggerRebound: setup.trigger / setup.trough - 1,
      fill: date(setup.fillIndex),
      fillPrice: setup.fillPrice,
      fillVsArm: setup.fillPrice / setup.armClose - 1,
      fillVsTrough: setup.fillPrice / setup.trough - 1,
      waitSessions: setup.decisionIndex >= 0 ? setup.decisionIndex - setup.armIndex : setup.endIndex - setup.armIndex,
      blockedTriggers: setup.blockedTriggers,
      outcome: setup.outcome
    };
  });
