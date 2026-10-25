// Summaries of one continuous full-engine run (the previous study's evaluation summary, field for field, so the
// benchmark reproduction can compare them exactly), segment attribution from the marked state at the partition
// boundaries, and the trade bridge of a configuration against a benchmark.
import { readPartitionConfig } from '#lib';
import { segmentRows } from '../multi-etf-allocator/segments.ts';
import type { NRunResult } from '../portfolio-aware-d1/nbook/engine.ts';

export const segmentsOf = (result: NRunResult) =>
  segmentRows(
    result as never,
    readPartitionConfig(),
    result.config.mode === 'portfolio' ? result.config.initial.voog + result.config.initial.vgt : 0
  );

export const lotDays = (result: NRunResult, lot: NRunResult['lots'][number]) => {
  const { sTime } = Object.values(result.universe.instruments)[0]!.ds;

  return (sTime[lot.exitIndex >= 0 ? lot.exitIndex : result.endIndex]! - lot.entryTimestamp) / 86400;
};

// The previous study's evaluation summary (src/portfolio-aware-d1/evaluation.ts summaryOf), with no "new" symbols.
export const summaryOf = (result: NRunResult, newSymbols: readonly string[] = []) => {
  const lots = result.lots;
  const last = result.daily.at(-1)!;

  return {
    lots: lots.length,
    virtualTrades: result.trades.length,
    net: lots.reduce((total, lot) => total + lot.net, 0),
    interest: lots.reduce((total, lot) => total + lot.interest, 0),
    openAtEnd: lots.filter((lot) => lot.exitIndex < 0).length,
    newLots: lots.filter((lot) => newSymbols.includes(lot.symbol)).length,
    newLotDays: lots
      .filter((lot) => newSymbols.includes(lot.symbol))
      .reduce((total, lot) => total + lotDays(result, lot), 0),
    worstLot: Math.min(0, ...lots.map((lot) => lot.net)),
    borrowingDollarDays: lots.reduce((total, lot) => total + lot.originalPrincipal * lotDays(result, lot), 0),
    minuteDrawdown: result.minuteDrawdown.maximum,
    minuteDrawdownPeak: result.minuteDrawdown.peakTime,
    minuteDrawdownTrough: result.minuteDrawdown.troughTime,
    dailyDrawdown: result.dailyDrawdown.maximum,
    endEquity: result.config.mode === 'portfolio' ? last.equity : NaN,
    dailyPercent: result.dailyPercentDrawdown?.maximumPercent ?? NaN,
    dailyPercentPeak: result.dailyPercentDrawdown?.peakTime ?? NaN,
    dailyPercentTrough: result.dailyPercentDrawdown?.troughTime ?? NaN,
    minutePercent: result.minutePercentDrawdown?.maximumPercent ?? NaN,
    segments: segmentsOf(result)
  };
};

export type RunSummary = ReturnType<typeof summaryOf>;

// Extra figures of a run this study reports beyond the previous summary.
export const extrasOf = (result: NRunResult) => {
  const lots = result.lots;
  const bySymbol: Record<string, { lots: number; net: number; wins: number; lotDays: number }> = {};

  for (const lot of lots) {
    bySymbol[lot.symbol] ??= { lots: 0, net: 0, wins: 0, lotDays: 0 };
    bySymbol[lot.symbol]!.lots++;
    bySymbol[lot.symbol]!.net += lot.net;
    bySymbol[lot.symbol]!.wins += lot.net > 0 ? 1 : 0;
    bySymbol[lot.symbol]!.lotDays += lotDays(result, lot);
  }

  const refusals: Record<string, Record<string, number>> = {};

  for (const signal of result.signals) {
    if (signal.outcome === 'refused') {
      const holder = signal.occupiedBy.split('+')[0]!.split(' ')[0]!;

      refusals[signal.symbol] ??= {};
      refusals[signal.symbol]![holder] = (refusals[signal.symbol]![holder] ?? 0) + 1;
    }
  }

  return {
    wins: lots.filter((lot) => lot.net > 0).length,
    losses: lots.filter((lot) => lot.net <= 0).length,
    costs: lots.reduce(
      (total, lot) =>
        total +
        lot.shares * (lot.entryPrice - lot.entryRawPrice) +
        (lot.exitIndex >= 0 ? lot.shares * (lot.exitRawPrice - lot.exitPrice) : 0),
      0
    ),
    signals: result.signals.length,
    refused: result.signals.filter((signal) => signal.outcome === 'refused').length,
    sameMinuteSignals: result.signals.filter((signal) => signal.sameMinuteCandidates > 1).length,
    lotDividends: result.dividends.filter((row) => row.source === 'lot').reduce((total, row) => total + row.value, 0),
    coreDividends: result.dividends.filter((row) => row.source === 'core').reduce((total, row) => total + row.value, 0),
    bySymbol,
    refusals,
    minimumRatio: Object.fromEntries(Object.entries(result.minimum).map(([key, value]) => [key, value?.ratio ?? NaN])),
    reservationsAtEnd: result.reservationsAtEnd.length
  };
};

// Funded lots of a configuration against a benchmark run (same mode and cost), matched by (symbol, decision time):
// the lots only the configuration funded, the lots only the benchmark funded, and the lots both funded (whose net can
// differ only in portfolio mode, through sizing), by segment. The differences add up exactly to the net difference.
export const bridgeOf = (result: NRunResult, benchmark: NRunResult) => {
  const dates = Object.values(result.universe.instruments)[0]!.ds.dates;
  const partitions = readPartitionConfig();
  const segmentOf = (index: number) =>
    (['training', 'holdout', 'final'] as const).find((name) => {
      const interval = partitions.partitions[name];

      return (!interval.start || dates[index]! >= interval.start) && (!interval.end || dates[index]! <= interval.end);
    }) ?? 'all';
  const key = (lot: NRunResult['lots'][number]) => `${lot.symbol}@${lot.decisionTime}`;
  const ours = new Map(result.lots.map((lot) => [key(lot), lot]));
  const theirs = new Map(benchmark.lots.map((lot) => [key(lot), lot]));
  const row = (kind: string, lot: NRunResult['lots'][number], contribution: number) => ({
    kind,
    symbol: lot.symbol,
    segment: segmentOf(lot.entryIndex),
    decision: new Date(lot.decisionTime * 1000).toISOString(),
    entry: new Date(lot.entryTime * 1000).toISOString(),
    exit: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open',
    reason: lot.exitReason,
    net: lot.net,
    contribution
  });
  const rows = [
    ...result.lots.filter((lot) => !theirs.has(key(lot))).map((lot) => row('only configuration', lot, lot.net)),
    ...benchmark.lots.filter((lot) => !ours.has(key(lot))).map((lot) => row('only benchmark', lot, -lot.net)),
    ...result.lots
      .filter((lot) => theirs.has(key(lot)))
      .map((lot) => row('both (net difference)', lot, lot.net - theirs.get(key(lot))!.net))
  ];
  const total = (segment: string, kind: string) =>
    rows
      .filter((item) => item.segment === segment && item.kind === kind)
      .reduce((sum, item) => sum + item.contribution, 0);

  return {
    rows,
    bySegment: Object.fromEntries(
      ['training', 'holdout', 'final'].map((segment) => [
        segment,
        {
          onlyConfiguration: total(segment, 'only configuration'),
          onlyBenchmark: total(segment, 'only benchmark'),
          both: total(segment, 'both (net difference)')
        }
      ])
    ),
    residual:
      result.lots.reduce((sum, lot) => sum + lot.net, 0) -
      benchmark.lots.reduce((sum, lot) => sum + lot.net, 0) -
      rows.reduce((sum, item) => sum + item.contribution, 0)
  };
};
