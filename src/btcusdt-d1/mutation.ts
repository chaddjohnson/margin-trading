// Lookahead mutation tests (ENGINE_PARITY_AND_TESTS.md §4): every bar at or after a cutoff is replaced (its four
// prices scaled by a random factor in [0.7, 1.3], its volume shuffled), the run is repeated, and everything recorded
// before the cutoff must be identical: each trade's entry (time, price, quantity, notional, fee) if it entered before
// the cutoff, its exit (time, price, fee, net, reason) if it exited before it, every decision (arming, buy trigger,
// cancellation, stop, gap, maximum hold, buffered-loss signal) made from a bar before it, and, for a cutoff at a day
// boundary, every reporting window that ends there. A runner that reads one bar ahead is included to prove the test can fail.
import { type DayIndex, dayIndexOf, dayOf } from './calendar.ts';
import type { ExecutionSettings } from './costs.ts';
import { type Signal, buildDays, runReference } from './engine.ts';
import { runFast } from './fast.ts';
import type { D1Params } from './params.ts';
import { type Series, copySeries, sliceSeries } from './snapshot.ts';
import { Rng } from '../optimizer/rng.ts';

export interface ComparableTrade {
  closed: boolean; // an open trade's exit fields are its end-of-data mark, not an exit
  entryBar: number;
  exitBar: number;
  entryTime: number;
  entryPrice: number;
  quantity: number;
  notional: number;
  entryFee: number;
  exitTime: number;
  exitPrice: number;
  exitFee: number;
  netPnl: number;
}

export interface ComparableRun {
  signals: Signal[];
  trades: ComparableTrade[];
  windows: {
    label: string;
    endDay: number;
    net: number;
    minute: number;
    daily: number;
    entries: number;
    exits: number;
  }[];
}

export type Runner = (series: Series) => ComparableRun;

export const mutateAfter = (series: Series, cutoffBar: number, seed: string): Series => {
  const copy = copySeries(series);
  const rng = Rng.from('btcusdt-d1-mutation', seed, cutoffBar);

  for (let i = cutoffBar; i < copy.rows; i++) {
    const factor = 0.7 + 0.6 * rng.next();

    copy.open[i] = series.open[i]! * factor;
    copy.high[i] = series.high[i]! * factor;
    copy.low[i] = series.low[i]! * factor;
    copy.close[i] = series.close[i]! * factor;
    copy.quoteVolume[i] = series.quoteVolume[copy.rows - 1 - (i - cutoffBar)]! || 1;
  }

  return copy;
};

const before = (run: ComparableRun, cutoffBar: number, cutoffTime: number) => {
  const lines: string[] = run.signals
    .filter((signal) => signal.bar < cutoffBar)
    .map((signal) => `signal ${signal.type} ${signal.bar}`);

  run.trades.forEach((trade, index) => {
    if (trade.entryBar < cutoffBar) {
      lines.push(
        `entry ${index} ${trade.entryTime} ${trade.entryPrice} ${trade.quantity} ${trade.notional} ${trade.entryFee}`
      );
    }

    if (trade.closed && trade.exitBar < cutoffBar) {
      lines.push(`exit ${index} ${trade.exitTime} ${trade.exitPrice} ${trade.exitFee} ${trade.netPnl}`);
    }
  });

  for (const window of run.windows) {
    if (window.endDay * 86400 <= cutoffTime) {
      lines.push(
        `window ${window.label} ${window.net} ${window.minute} ${window.daily} ${window.entries} ${window.exits}`
      );
    }
  }

  return lines;
};

// The lines recorded before the cutoff that differ between the original and the mutated series.
export const lookaheadViolations = (
  runner: Runner,
  series: Series,
  cutoffBar: number,
  seed = 'a',
  originalRun: ComparableRun = runner(series),
  mode: 'scale' | 'truncate' = 'scale'
) => {
  const cutoffTime = series.time[cutoffBar]!;
  const original = before(originalRun, cutoffBar, cutoffTime);
  // 'truncate' deletes every bar from the cutoff on (later times, missing bars and the end of data all change).
  const changed = mode === 'truncate' ? sliceSeries(series, cutoffBar) : mutateAfter(series, cutoffBar, seed);
  const mutated = before(runner(changed), cutoffBar, cutoffTime);
  const violations: string[] = [];

  for (let i = 0; i < Math.max(original.length, mutated.length); i++) {
    if (original[i] !== mutated[i]) {
      violations.push(`original ${original[i] ?? '(none)'} | mutated ${mutated[i] ?? '(none)'}`);
    }
  }

  return violations;
};

export const fastRunner =
  (
    params: D1Params,
    settings: ExecutionSettings,
    armStartDay: number,
    windowEnds: number[] = [],
    cheat: false | 'next-minute-low' | 'same-day-high' = false
  ): Runner =>
  (series) => {
    let index: DayIndex = dayIndexOf(series);
    let run = series;

    if (cheat === 'next-minute-low') {
      // Deliberate lookahead: each minute's low includes the next minute's low.
      run = copySeries(series);

      for (let i = 0; i + 1 < run.rows; i++) {
        run.low[i] = Math.min(series.low[i]!, series.low[i + 1]!);
      }

      index = dayIndexOf(run);
    } else if (cheat === 'same-day-high') {
      // Deliberate lookahead: each day's high includes the next day's, so a reference high (days d-L..d-1) contains
      // the current day's complete high and the stop update the next day's.
      const high = Float64Array.from(index.high);

      for (let d = 0; d + 1 < index.days; d++) {
        high[d] = Math.max(index.high[d]!, Number.isNaN(index.high[d + 1]!) ? -Infinity : index.high[d + 1]!);
      }

      index = { ...index, high };
    }

    const result = runFast({
      series: run,
      index,
      params,
      settings,
      armStartDay,
      windows: windowEnds.map((endDay) => ({ label: `to-${endDay}`, startDay: armStartDay, endDay }))
    });

    return {
      signals: result.signals,
      trades: result.trades.map((trade) => ({ ...trade, closed: trade.reason !== 'open' })),
      windows: result.windows.map((window) => ({
        label: window.label,
        endDay: window.endDay,
        net: window.net,
        minute: window.minuteDrawdown,
        daily: window.dailyDrawdown,
        entries: window.entries,
        exits: window.exits
      }))
    };
  };

export const referenceRunner =
  (params: D1Params, settings: ExecutionSettings, armStartDay: number, windowEnds: number[] = []): Runner =>
  (series) => {
    const result = runReference({
      days: buildDays(series),
      params,
      settings,
      armStartDay,
      windows: windowEnds.map((endDay) => ({ label: `to-${endDay}`, startDay: armStartDay, endDay }))
    });

    return {
      signals: result.signals,
      trades: result.trades.map((trade) => ({ ...trade, closed: trade.status === 'closed' })),
      windows: result.windows.map((window) => ({
        label: window.label,
        endDay: window.endDay,
        net: window.net,
        minute: window.minute.drawdown,
        daily: window.daily.drawdown,
        entries: window.entries,
        exits: window.exits
      }))
    };
  };

export const dayBoundaryBar = (series: Series, day: number) => {
  let i = 0;

  while (i < series.rows && dayOf(series.time[i]!) < day) {
    i++;
  }

  return i;
};
