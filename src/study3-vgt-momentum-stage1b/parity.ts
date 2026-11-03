// Field-by-field comparison of two runs (PROTOCOL.md §12 parity): Stage 1b's fast engine against Stage 1's engine
// (Stage 1 configurations) or against the independent reference. Only field names, difference counts and the
// largest |difference| are returned — never a net, mark, drawdown or P&L level.
import type { RunResult as Stage1Result } from '../study3-vgt-momentum/engine.ts';
import type { RunResult } from './types.ts';

const close = (a: number, b: number, tolerance: number) =>
  (Number.isNaN(a) && Number.isNaN(b)) ||
  a === b ||
  Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

export interface ParityOutcome {
  differences: number;
  fields: Record<string, number>; // field -> difference count
  maxAbs: number;
}

export class ParityTally {
  differences = 0;
  fields: Record<string, number> = {};
  maxAbs = 0;
  runs = 0;
  failedRuns: string[] = [];

  add(id: string, outcome: ParityOutcome) {
    this.runs++;

    if (outcome.differences > 0) {
      this.failedRuns.push(id);
    }

    this.differences += outcome.differences;
    this.maxAbs = Math.max(this.maxAbs, outcome.maxAbs);

    for (const [field, count] of Object.entries(outcome.fields)) {
      this.fields[field] = (this.fields[field] ?? 0) + count;
    }
  }

  summary() {
    return {
      runs: this.runs,
      differences: this.differences,
      fields: this.fields,
      maxAbs: this.maxAbs,
      failedRuns: this.failedRuns.slice(0, 50),
      failedRunCount: this.failedRuns.length
    };
  }
}

const compareFields = (pairs: [string, number, number][], tolerance: number): ParityOutcome => {
  const fields: Record<string, number> = {};
  let differences = 0;
  let maxAbs = 0;

  for (const [name, a, b] of pairs) {
    if (!close(a, b, tolerance)) {
      fields[name] = (fields[name] ?? 0) + 1;
      differences++;
    }

    if (Number.isFinite(a) && Number.isFinite(b)) {
      maxAbs = Math.max(maxAbs, Math.abs(a - b));
    }
  }

  return { differences, fields, maxAbs };
};

const stage1Reason = (reason: string) => (reason === 'damage' ? 'trend' : reason);

// Stage 1 engine (Z0 configurations) against the Stage 1b fast engine.
export const compareWithStage1 = (a: Stage1Result, b: RunResult, tolerance = 1e-9): ParityOutcome => {
  const pairs: [string, number, number][] = [
    ['tradeCount', a.trades.length, b.trades.length],
    ['endMark', a.endMark, b.endMark],
    ['endLiquidation', a.endLiquidation, b.endLiquidation],
    ['realized', a.realized, b.realized],
    ['minuteDd', a.minuteDrawdown.maximum, b.minuteDd.maximum],
    ['dailyDd', a.dailyDrawdown.maximum, b.dailyDd],
    ['loanDollarDays', a.borrowedDollarDays, b.loanDollarDays]
  ];
  const reasons: [string, number, number][] = [];

  if (a.window && b.windows[0]) {
    pairs.push(['windowIncrement', a.window.increment, b.windows[0].increment]);
    pairs.push(['windowMinuteDd', a.window.minuteDrawdown.maximum, b.windows[0].minuteDd.maximum]);
    pairs.push(['windowDailyDd', a.window.dailyDrawdown, b.windows[0].dailyDd]);
  }

  a.trades.forEach((ta, i) => {
    const tb = b.trades[i];

    if (!tb) {
      return;
    }

    pairs.push(
      ['entryIndex', ta.entryIndex, tb.entryIndex],
      ['entryBar', ta.entryBar, tb.entryBar],
      ['exitIndex', ta.exitIndex, tb.exitIndex],
      ['exitBar', ta.exitBar, tb.exitBar],
      ['entryRaw', ta.entryRaw, tb.entryRaw],
      ['exitRaw', ta.exitRaw, tb.exitRaw],
      ['shares', ta.shares, tb.shares],
      ['net', ta.net, tb.net],
      ['interest', ta.interest, tb.interest],
      ['friction', ta.friction, tb.friction],
      ['priceGain', ta.priceGain, tb.priceGain],
      ['maeLow', ta.maeLow, tb.maeLow],
      ['mfeHigh', ta.mfeHigh, tb.mfeHigh]
    );
    reasons.push(['exitReason', ta.exitReason === stage1Reason(tb.exitReason) ? 0 : 1, 0]);
    reasons.push(['kind', ta.kind === tb.kind ? 0 : 1, 0]);
  });

  return compareFields([...pairs, ...reasons], tolerance);
};

// Two Stage 1b results (fast against the independent reference).
export const compareRuns = (a: RunResult, b: RunResult, tolerance = 1e-9): ParityOutcome => {
  const pairs: [string, number, number][] = [
    ['tradeCount', a.trades.length, b.trades.length],
    ['endMark', a.endMark, b.endMark],
    ['endLiquidation', a.endLiquidation, b.endLiquidation],
    ['realized', a.realized, b.realized],
    ['minuteDd', a.minuteDd.maximum, b.minuteDd.maximum],
    ['dailyDd', a.dailyDd, b.dailyDd],
    ['loanDollarDays', a.loanDollarDays, b.loanDollarDays],
    ['grossDollarDays', a.grossDollarDays, b.grossDollarDays],
    ['peakGross', a.peakGross, b.peakGross],
    ['sessionsLong', a.sessionsLong, b.sessionsLong],
    ['campaigns', a.campaigns, b.campaigns],
    ['reentries', a.reentries, b.reentries],
    ['windowCount', a.windows.length, b.windows.length]
  ];

  a.windows.forEach((wa, i) => {
    const wb = b.windows[i];

    if (wb) {
      pairs.push(
        ['window.increment', wa.increment, wb.increment],
        ['window.minuteDd', wa.minuteDd.maximum, wb.minuteDd.maximum],
        ['window.dailyDd', wa.dailyDd, wb.dailyDd],
        ['window.interest', wa.interest, wb.interest],
        ['window.grossDollarDays', wa.grossDollarDays, wb.grossDollarDays]
      );
    }
  });

  a.trades.forEach((ta, i) => {
    const tb = b.trades[i];

    if (!tb) {
      return;
    }

    pairs.push(
      ['entryIndex', ta.entryIndex, tb.entryIndex],
      ['entryBar', ta.entryBar, tb.entryBar],
      ['exitIndex', ta.exitIndex, tb.exitIndex],
      ['exitBar', ta.exitBar, tb.exitBar],
      ['entryRaw', ta.entryRaw, tb.entryRaw],
      ['exitRaw', ta.exitRaw, tb.exitRaw],
      ['shares', ta.shares, tb.shares],
      ['trims', ta.trims.length, tb.trims.length],
      ['proceeds', ta.proceeds, tb.proceeds],
      ['net', ta.net, tb.net],
      ['interest', ta.interest, tb.interest],
      ['friction', ta.friction, tb.friction],
      ['priceGain', ta.priceGain, tb.priceGain],
      ['exitReason', ta.exitReason === tb.exitReason ? 0 : 1, 0],
      ['stopComponent', ta.stopComponent === tb.stopComponent ? 0 : 1, 0],
      ['kind', ta.kind === tb.kind ? 0 : 1, 0]
    );
  });

  if (a.daily && b.daily) {
    pairs.push(['dailyRows', a.daily.length, b.daily.length]);
    a.daily.forEach((row, i) => {
      const other = b.daily![i];

      if (other) {
        pairs.push(['daily.mark', row.mark, other.mark], ['daily.shares', row.shares, other.shares]);
      }
    });
  }

  return compareFields(pairs, tolerance);
};
