// The minute mark series (PROTOCOL.md §8.5): Study 6's minuteSeries (src/study6-b5-kre-robustness/evaluate.ts), ported
// line for line. The one difference is the replay calendar's first book, taken in the engine's own order (bookOrderOf)
// instead of Study 5's five-symbol order, which has no entry for most of this study's books. The series is rebuilt from
// the replay's funded lots exactly as replayFixedPool marks them and must reproduce its strict tracker (the test stage
// fails otherwise). Study 6's lot-contribution, period-drawdown and episode functions read only the series and are
// imported unchanged. Parity gate P6 requires this port to equal Study 6's on B5-subset configurations.
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { type RealLot, secondsPerYear } from '../multi-etf-allocator/ledger.ts';
import { bookOrderOf } from '../portfolio-aware-d1/nbook/engine.ts';
import type { ReplayResult } from '../portfolio-aware-d1/replay.ts';
import type { TraceWindow } from '../portfolio-aware-d1/trace.ts';
import {
  type MinuteSeries,
  type SeriesPoint,
  drawdownEpisodes,
  lotContributions,
  newYork,
  periodMinuteDrawdown
} from '../study6-b5-kre-robustness/evaluate.ts';
import { type Books, type Lab, type RunSettings, baseSettings } from './engine.ts';

export { drawdownEpisodes, lotContributions, newYork, periodMinuteDrawdown };
export type { MinuteSeries, SeriesPoint };

export interface SeriesLab {
  dsOf: (symbol: string) => Dataset;
  ev: { windowOf: (settings: RunSettings) => TraceWindow };
}

export const seriesLabOf = (lab: Lab): SeriesLab => ({
  dsOf: (symbol) => lab.door.loaded.universe.instruments[symbol]!.ds as unknown as Dataset,
  ev: { windowOf: (settings) => lab.ev.windowOf(settings) }
});

export const minuteSeries = (
  lab: SeriesLab,
  result: ReplayResult,
  books: Books,
  settings: RunSettings = baseSettings
): MinuteSeries => {
  if (!result.full) {
    throw new Error('minuteSeries needs a detailed replay');
  }

  const lots = result.full.lots as unknown as RealLot[];
  // The replay's calendar and first bar are its configuration's first book's (replayFixedPool `anyDs`).
  const anyDs = lab.dsOf(bookOrderOf(Object.keys(books))[0]!);
  const window = lab.ev.windowOf(settings);
  const sTime = anyDs.sTime;
  const closeTimes = anyDs.sCloseTime;
  const firstBarTime = anyDs.bTime[anyDs.sBarStart[window.startIndex]!]!;
  const points: SeriesPoint[] = [];
  const interest = (lot: RealLot, s: number) =>
    lot.principal * settings.rate * ((sTime[s]! - lot.entryTimestamp) / secondsPerYear);
  let realized = 0;
  let next = 0;
  let closedCount = 0;
  let open: RealLot | undefined;

  for (let s = window.startIndex + 1; s <= window.endIndex; s++) {
    for (;;) {
      if (open) {
        const ds = lab.dsOf(open.symbol);
        const start = ds.sBarStart[s]!;
        const count = ds.sBarCount[s]!;
        const exitBar = open.exitIndex === s ? open.exitBar : Infinity;
        const from = open.entryIndex === s ? open.entryBar : 0;
        let closed = false;

        for (let k = from; k < count; k++) {
          const T = ds.bTime[start + k]!;

          if (k === exitBar) {
            realized += open.net;
            closedCount++;
            points.push({
              time: T,
              session: s,
              value: realized,
              realized,
              openLot: -1,
              unrealized: 0,
              closed: closedCount
            });
            open = undefined;
            closed = true;
            break;
          }

          const unrealized = open.shares * ds.bClose[start + k]! - open.principal - interest(open, s);

          points.push({
            time: T,
            session: s,
            value: realized + unrealized,
            realized,
            openLot: open.id,
            unrealized,
            closed: closedCount
          });
        }

        if (!closed) {
          break;
        }

        continue;
      }

      const candidate = lots[next];

      if (!candidate || candidate.entryIndex !== s || candidate.entryBar >= lab.dsOf(candidate.symbol).sBarCount[s]!) {
        break;
      }

      open = candidate;
      next++;
    }

    if (open && open.exitIndex === s) {
      realized += open.net;
      closedCount++;
      open = undefined;
    }

    if (!open) {
      const candidate = lots[next];

      if (candidate && candidate.entryIndex === s) {
        open = candidate;
        next++;
      }
    }

    let unrealized = 0;

    if (open) {
      unrealized = open.shares * lab.dsOf(open.symbol).sClose[s]! - open.principal - interest(open, s);
    }

    points.push({
      time: closeTimes[s]!,
      session: s,
      value: realized + unrealized,
      realized,
      openLot: open ? open.id : -1,
      unrealized,
      closed: closedCount
    });
  }

  const tracker = new Tracker(0, firstBarTime);
  let peak = 0;
  let peakAt = -1;
  let maximum = 0;
  let peakIndex = -1;
  let troughIndex = -1;

  points.forEach((point, index) => {
    tracker.updateStrict(point.value, point.time);

    if (point.value > peak) {
      peak = point.value;
      peakAt = index;
    }

    if (peak - point.value > maximum) {
      maximum = peak - point.value;
      peakIndex = peakAt;
      troughIndex = index;
    }
  });

  return {
    points,
    lots,
    maximum,
    peakIndex,
    troughIndex,
    trackerMaximum: result.minuteDrawdown.maximum,
    matchesTracker: maximum === result.minuteDrawdown.maximum && tracker.maximum === maximum
  };
};
