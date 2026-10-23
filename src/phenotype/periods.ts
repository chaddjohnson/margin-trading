// Development, holdout and full-history figures of one continuous run. The run is never restarted at a period
// boundary: positions, trailing highs, armed setups, continuation windows and interest carry across it, and a
// period's net is the change of the marked equity (realized profit plus the open position at the close, net of
// interest) from the close before its first session to its last close. The accounting is the research programs'
// own replay (src/trailing-buy-variants/accounting.ts), which reproduces the strategy files' marks; the trades
// come from the strategy run itself.
import { fixtureDataset, firstIndexOnOrAfter, lastIndexOnOrBefore } from '../four-family/data.ts';
import {
  type AccountingResult,
  type AccountingTrade,
  type Segment,
  type SegmentMetrics,
  replay
} from '../trailing-buy-variants/accounting.ts';
import { PhenotypeError } from './architectures.ts';
import type { Period } from './execution.ts';
import type { StrategyResult } from './injection.ts';

export interface PeriodReport {
  periods: SegmentMetrics[];
  notes: { label: string; note: string }[];
  accounting: AccountingResult;
  // Largest difference between a closed trade's profit in the strategy and in the replay.
  closedTradeMismatch: number;
}

// The strategy's positions as accounting trades, indexed into the run's own session list.
export const accountingTradesOf = (result: StrategyResult): AccountingTrade[] => {
  const indexOf = new Map(result.sessions.map((session, index) => [session.time, index]));
  const sessionIndex = (timestamp: number, what: string) => {
    const index = indexOf.get(timestamp);

    if (index === undefined) {
      throw new PhenotypeError(`No session at ${new Date(timestamp * 1000).toISOString()} for a trade's ${what}`);
    }

    return index;
  };

  return result.positions.map((position) => {
    const entry = result.entryFills.get(position);
    const exit = result.exitFills.get(position);

    if (!entry) {
      throw new PhenotypeError(`A position entered at ${position.entryTimestamp} has no entry fill`);
    }

    const legs = result.legs?.get(position)?.map((leg) => ({
      entryIndex: leg.index,
      entryBar: leg.barIndex,
      entryTimestamp: leg.entryTimestamp,
      investment: leg.investment,
      shares: leg.shares
    }));

    return {
      entryIndex: sessionIndex(position.entryTimestamp, 'entry'),
      entryBar: entry.barIndex,
      entryTimestamp: position.entryTimestamp,
      entryPrice: position.entryPrice,
      investment: position.investment,
      shares: position.shares,
      exitIndex: position.isOpen ? -1 : sessionIndex(position.exitTimestamp!, 'exit'),
      exitBar: exit?.barIndex ?? -1,
      exitPrice: position.exitPrice ?? 0,
      legs
    };
  });
};

// `periods` are clipped to the run; the full period runs from `fullStart` (the first eligible session) on.
export const periodReport = (
  result: StrategyResult,
  periods: Period[],
  fullStart: string,
  marginInterestRate: number
): PeriodReport => {
  const { sessions } = result;

  if (sessions.length < 2) {
    throw new PhenotypeError('The run has fewer than two sessions, so there is nothing to report');
  }

  // The unguarded dataset builder: this report reads the whole run on purpose (it is a view of a finished run,
  // not a search, so no research window applies).
  const ds = fixtureDataset(sessions);
  const endIndex = sessions.length - 1;
  const notes: PeriodReport['notes'] = [];
  const segments: Segment[] = [];
  const add = (label: string, start: string, end: string | undefined) => {
    // The first session is never marked by the strategies (it only seeds the reference high), so a period
    // starts at the second session at the earliest.
    const first = Math.max(1, firstIndexOnOrAfter(ds, start));
    const last = end === undefined ? endIndex : lastIndexOnOrBefore(ds, end);

    if (first > endIndex || last < first) {
      notes.push({ label, note: `not reported: the run has no sessions in ${start} → ${end ?? 'the end'}` });
      return;
    }

    if (ds.dates[1]! > start || (end !== undefined && ds.lastDate < end)) {
      notes.push({
        label,
        note: `only partly covered by the run: ${ds.dates[first]} → ${ds.dates[last]} of ${start} → ${end ?? 'the end'}`
      });
    }

    segments.push({ label, start: first, end: last });
  };

  for (const period of periods) {
    add(period.label, period.start, period.end);
  }

  add('full', fullStart, undefined);

  const trades = accountingTradesOf(result);
  const accounting = replay(ds, trades, { firstIndex: 0, endIndex, marginInterestRate, segments });
  let closedTradeMismatch = 0;

  result.positions.forEach((position, index) => {
    if (!position.isOpen) {
      closedTradeMismatch = Math.max(
        closedTradeMismatch,
        Math.abs((position.profit ?? NaN) - accounting.outcomes[index]!.profit)
      );
    }
  });

  return { periods: accounting.segments, notes, accounting, closedTradeMismatch };
};
