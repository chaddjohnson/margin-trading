// The allIn.ts immediate-entry comparator on matched dates. It runs allIn.ts's own code through its generated
// copy (copies.ts) with the session list injected and arming allowed only from the common eligibility start,
// then attributes its trades with the same accounting as the four families. allIn.ts's parameters stay at its
// checked-in constants (10% / 8% / 15 days / 90 sessions / 1% / 2% / 38%); only the margin rate and the
// stop fill vary, as for every other strategy.
import type { MarketSession } from '#types';
import { type AccountingTrade, replay } from './accounting.ts';
import { type Dataset } from './data.ts';
import type { StopFill } from './engine.ts';
import { type EvalSpec, type Metrics, investmentAmount, summarize } from './evaluate.ts';
import { runSource } from './sourceRun.ts';

export interface ComparatorRun {
  metrics: Metrics;
  trades: (AccountingTrade & { reason: string; entryDate: string; exitDate: string })[];
  dailyMarks: Float64Array;
  sourceSummary: Record<string, unknown>;
}

export const runAllInComparator = async (
  ds: Dataset,
  sessions: MarketSession[],
  spec: EvalSpec,
  options: { stopFill?: StopFill } = {}
): Promise<ComparatorRun> => {
  const indexByDate = new Map(ds.dates.map((date, index) => [date, index]));

  if (sessions.length < spec.endIndex + 1 || sessions[spec.endIndex]!.date !== ds.dates[spec.endIndex]) {
    throw new Error('The comparator sessions must match the dataset');
  }

  const source = await runSource({
    key: 'allIn',
    copy: true,
    endDate: ds.dates[spec.endIndex]!,
    stopFill: options.stopFill ?? spec.stopFill,
    injected: {
      sessions: sessions.slice(0, spec.endIndex + 1),
      marginInterestRate: spec.marginInterestRate,
      armStart: spec.armStart
    }
  });
  const trades = source.trades.map((trade) => {
    const entryIndex = indexByDate.get(trade.entryDate)!;
    const exitDate =
      trade.exitTimestamp === undefined ? '' : new Date(trade.exitTimestamp * 1000).toISOString().slice(0, 10);

    if (trade.investment !== investmentAmount) {
      throw new Error(`Unexpected allIn investment ${trade.investment}`);
    }

    return {
      entryIndex,
      entryBar: trade.entryBar,
      entryTimestamp: trade.entryTimestamp,
      entryPrice: trade.entryPrice,
      investment: trade.investment,
      shares: trade.shares,
      exitIndex: trade.isOpen ? -1 : indexByDate.get(exitDate)!,
      exitBar: trade.exitBar ?? -1,
      exitPrice: trade.exitPrice ?? NaN,
      reason: trade.reason,
      entryDate: trade.entryDate,
      exitDate
    };
  });
  const accounting = replay(ds, trades, {
    firstIndex: 0,
    endIndex: spec.endIndex,
    marginInterestRate: spec.marginInterestRate,
    segments: spec.segments,
    dailyMarks: true
  });
  const metrics = summarize(ds, trades, accounting);

  // The source's own totals must equal the shared accounting's.
  const summary = source.summary as Record<string, number>;

  for (const [label, ours, theirs] of [
    ['net profit', accounting.netProfit, summary.netProfit],
    ['daily drawdown', accounting.dailyDrawdown.maximum, summary.maximumDrawdown],
    ['minute drawdown', accounting.minuteDrawdown.maximum, summary.minuteMaximumDrawdown]
  ] as const) {
    if (!(Math.abs(ours - theirs!) <= 1e-6)) {
      throw new Error(`allIn comparator accounting mismatch on ${label}: ${ours} vs ${theirs}`);
    }
  }

  return { metrics, trades, dailyMarks: accounting.dailyMarks!, sourceSummary: source.summary };
};
