// Period attribution of ONE continuous allocator run: for each partition of data/partitions.json that the run covers
// (training is reported as `development`) and for the full run, the change of marked equity, of the strategy mark
// (realized plus unrealized net of interest), of cumulative interest and dividends, the lots entered, and the largest
// daily drawdown within the period. Nothing is reset at a boundary: a period's opening value is the previous close of
// the same run. This is not an isolated backtest of the period, which starts flat and generally differs.
import { type PartitionConfig, intervalContains, segmentPartitions } from '#lib';
import type { RunResult } from './engine.ts';

export interface SegmentRow {
  segment: string;
  firstDate: string;
  lastDate: string;
  sessions: number;
  startEquity: number; // the previous close (the run's starting value for the first period)
  endEquity: number;
  equityChange: number;
  equityReturn: number;
  strategyPnl: number;
  interest: number;
  dividends: number;
  lotsEntered: number;
  lotsExited: number;
  // Two drawdowns of the daily closing equity within the period, which can be different episodes: the largest in
  // dollars (the engine's convention, whose summary percent is this episode's depth) and the largest in percent.
  maxDrawdown: number;
  maxDrawdownPercent: number; // the depth of the largest-dollar episode
  drawdownPeak: string;
  drawdownTrough: string;
  maxPercentDrawdown: number; // the largest peak-to-trough fall in percent
  maxPercentDrawdownDollars: number;
  percentDrawdownPeak: string;
  percentDrawdownTrough: string;
}

const names: Record<string, string> = { training: 'development', holdout: 'holdout', final: 'final' };

export const segmentRows = (result: RunResult, config: PartitionConfig, startValue: number): SegmentRow[] => {
  const { daily, lots } = result;
  const periods = [
    ...segmentPartitions.map((partition) => ({ name: names[partition]!, interval: config.partitions[partition] })),
    { name: 'full', interval: { start: null, end: null } }
  ];
  const rows: SegmentRow[] = [];

  for (const { name, interval } of periods) {
    const first = daily.findIndex((row) => intervalContains(interval, row.date));

    if (first < 0) {
      continue;
    }

    let last = first;

    while (last + 1 < daily.length && intervalContains(interval, daily[last + 1]!.date)) {
      last++;
    }

    const before = daily[first - 1];
    const start = {
      equity: before?.equity ?? startValue,
      strategyMark: before?.strategyMark ?? 0,
      interest: before?.cumulativeInterest ?? 0,
      dividends: before?.cumulativeDividends ?? 0
    };
    const end = daily[last]!;
    let peak = start.equity;
    let peakDate = before?.date ?? daily[first]!.date;
    let worst = { drawdown: 0, percent: 0, peak: '', trough: '' };
    let deepest = { drawdown: 0, percent: 0, peak: '', trough: '' };

    for (const row of daily.slice(first, last + 1)) {
      if (row.equity > peak) {
        peak = row.equity;
        peakDate = row.date;
      }

      const fall = {
        drawdown: peak - row.equity,
        percent: peak > 0 ? (peak - row.equity) / peak : 0,
        peak: peakDate,
        trough: row.date
      };

      if (fall.drawdown > worst.drawdown) {
        worst = fall;
      }

      if (fall.percent > deepest.percent) {
        deepest = fall;
      }
    }

    const inPeriod = (index: number) => index >= daily[first]!.index && index <= end.index;

    rows.push({
      segment: name,
      firstDate: daily[first]!.date,
      lastDate: end.date,
      sessions: last - first + 1,
      startEquity: start.equity,
      endEquity: end.equity,
      equityChange: end.equity - start.equity,
      equityReturn: start.equity > 0 ? end.equity / start.equity - 1 : NaN,
      strategyPnl: end.strategyMark - start.strategyMark,
      interest: end.cumulativeInterest - start.interest,
      dividends: end.cumulativeDividends - start.dividends,
      lotsEntered: lots.filter((lot) => inPeriod(lot.entryIndex)).length,
      lotsExited: lots.filter((lot) => lot.exitIndex >= 0 && inPeriod(lot.exitIndex)).length,
      maxDrawdown: worst.drawdown,
      maxDrawdownPercent: worst.percent,
      drawdownPeak: worst.peak,
      drawdownTrough: worst.trough,
      maxPercentDrawdown: deepest.percent,
      maxPercentDrawdownDollars: deepest.drawdown,
      percentDrawdownPeak: deepest.peak,
      percentDrawdownTrough: deepest.trough
    });
  }

  return rows;
};
