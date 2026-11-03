// Point evaluation, neighbourhood summaries and diagnostic replays on one door (PROTOCOL.md §3, §5.5, §6). Pool runs go
// through the unchanged Study 5 evaluator (traceBook + replayFixedPool). Counterfactuals (a book recorded but never
// funded, a funding blackout) replay the same unchanged traces with some trades withheld from funding — under shadow
// semantics a book's trades never depend on the allocator, so nothing else changes. The minute mark series is rebuilt
// from the replay's funded lots exactly as replayFixedPool marks them, and checked against its tracker.
import type { Dataset } from '../four-family/data.ts';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { type RealLot, secondsPerYear } from '../multi-etf-allocator/ledger.ts';
import type { VirtualTrade } from '../multi-etf-allocator/shadow.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { type ReplayResult, replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import {
  type RunMetrics,
  type RunSettings,
  Evaluator,
  baseSettings,
  orderedSymbols,
  settingsWith
} from '../study5-gdx-b5-three-etf/engine.ts';
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { devFolds, execution, periods, years } from './context.ts';
import { type Door, assertFive, sha256 } from './data.ts';
import { type Books, booksKey } from './designs.ts';

export { baseSettings, settingsWith, type RunSettings };

const round2 = (value: number) => (Number.isFinite(value) ? Math.round(value * 100) / 100 : value);

export interface PointRecord {
  net: number;
  dd: number;
  ddPct: number; // % of the $100,000 allocation
  ddDaily: number;
  ddPeak: string;
  ddTrough: string;
  ddRecovery: string;
  ddDailyPeak: string;
  ddDailyTrough: string;
  realized: number;
  unrealized: number;
  interest: number;
  gross: number;
  costs: number;
  lots: number;
  open: number;
  closedYears: number;
  bestLot: number;
  worstLot: number;
  top1Share: number;
  top3Share: number;
  bySymbol: Record<string, { lots: number; net: number }>;
  kreLots: number;
  kreNet: number;
  occupancy: number;
  heldSessions: number;
  heldDays: number;
  decisions: number;
  granted: number;
  refused: number;
  kreRefused: number; // KRE decisions refused
  refusedByKre: number; // other books' decisions refused while KRE held the slot
  periods: Record<string, number>;
  signature: string; // sha256 (16) of the funded ledger
}

export const ledgerSignature = (result: ReplayResult) =>
  sha256(
    JSON.stringify(result.lots.map((lot) => [lot.symbol, lot.entryTime, lot.exitTime, Math.round(lot.net * 1e6)]))
  ).slice(0, 16);

const periodKeys = [...periods.map((period) => period.key), ...devFolds.map((fold) => fold.key), ...years.map(String)];

export const pointOf = (metrics: RunMetrics, result: ReplayResult): PointRecord => ({
  net: round2(metrics.net),
  dd: round2(metrics.minuteDrawdown),
  ddPct: Math.round((metrics.minuteDrawdown / execution.principal) * 1e6) / 1e4,
  ddDaily: round2(metrics.dailyDrawdown),
  ddPeak: metrics.minuteDrawdownPeak,
  ddTrough: metrics.minuteDrawdownTrough,
  ddRecovery: metrics.minuteDrawdownRecovery,
  ddDailyPeak: metrics.dailyDrawdownPeak,
  ddDailyTrough: metrics.dailyDrawdownTrough,
  realized: round2(metrics.realized),
  unrealized: round2(metrics.unrealized),
  interest: round2(metrics.interest),
  gross: round2(metrics.gross),
  costs: round2(metrics.costs),
  lots: metrics.lots,
  open: metrics.open,
  closedYears: metrics.closedYears,
  bestLot: round2(metrics.bestLot),
  worstLot: round2(metrics.worstLot),
  top1Share: Math.round(metrics.top1Share * 1e4) / 1e4,
  top3Share: Math.round(metrics.top3Share * 1e4) / 1e4,
  bySymbol: Object.fromEntries(
    Object.entries(metrics.bySymbol).map(([symbol, value]) => [symbol, { lots: value.lots, net: round2(value.net) }])
  ),
  kreLots: metrics.bySymbol.KRE?.lots ?? 0,
  kreNet: round2(metrics.bySymbol.KRE?.net ?? 0),
  occupancy: Math.round(metrics.exposure * 1e6) / 1e6,
  heldSessions: metrics.heldSessions,
  heldDays: Math.round(metrics.heldDays * 1000) / 1000,
  decisions: metrics.decisions,
  granted: metrics.granted,
  refused: metrics.refused,
  kreRefused: Object.entries(metrics.refusalsBy)
    .filter(([key]) => key.startsWith('KRE<'))
    .reduce((total, [, count]) => total + count, 0),
  refusedByKre: Object.entries(metrics.refusalsBy)
    .filter(([key]) => key.endsWith('<KRE') && !key.startsWith('KRE<'))
    .reduce((total, [, count]) => total + count, 0),
  periods: Object.fromEntries(
    periodKeys.filter((key) => key in metrics.periods).map((key) => [key, round2(metrics.periods[key]!)])
  ),
  signature: ledgerSignature(result)
});

export class Lab {
  readonly door: Door;
  readonly ev: Evaluator;
  runs = 0;

  constructor(door: Door) {
    this.door = door;
    this.ev = new Evaluator(door);
  }

  replay(books: Books, settings: RunSettings = baseSettings, detail = false) {
    assertFive(Object.keys(books));
    this.runs++;
    return this.ev.replay(books, settings, detail);
  }

  point(books: Books, settings: RunSettings = baseSettings): PointRecord {
    const result = this.replay(books, settings);

    return pointOf(this.ev.metricsOf(result, settings), result);
  }

  metricsOf(result: ReplayResult, settings: RunSettings = baseSettings) {
    return this.ev.metricsOf(result, settings);
  }

  // The replay with some virtual trades withheld from funding (the book still records them; they never hold the slot).
  replayWithheld(
    books: Books,
    withhold: (symbol: string, trade: VirtualTrade) => boolean,
    settings: RunSettings = baseSettings,
    detail = false
  ): ReplayResult {
    const symbols = orderedSymbols(books);

    assertFive(symbols);

    const window = this.ev.windowOf(settings);

    this.runs++;

    return replayFixedPool(
      symbols.map((symbol) => {
        const trace = this.ev.trace(symbol, books[symbol]!, settings);

        return {
          symbol,
          ds: this.door.loaded.universe.instruments[symbol]!.ds,
          trace: { ...trace, trades: trace.trades.filter((trade) => !withhold(symbol, trade)) }
        };
      }),
      {
        symbols,
        startIndex: window.startIndex,
        endIndex: window.endIndex,
        principal: execution.principal,
        rate: settings.rate,
        costBps: settings.costBps,
        stopSlippageBps: settings.stopSlippageBps,
        detail
      }
    );
  }

  pointWithheld(books: Books, withhold: (symbol: string, trade: VirtualTrade) => boolean, settings = baseSettings) {
    const result = this.replayWithheld(books, withhold, settings);

    return pointOf(this.ev.metricsOf(result, settings), result);
  }

  dsOf(symbol: string): Dataset {
    return this.door.loaded.universe.instruments[symbol]!.ds;
  }

  dateOf(index: number) {
    return this.door.dates[index] ?? '';
  }
}

// ----- summaries (§5.5) -----

export const ceiling = execution.drawdownCeiling;

export const shareBelow = (values: readonly number[]) =>
  values.length ? values.filter((value) => value < ceiling).length / values.length : NaN;

export interface SetSummary {
  n: number;
  unique: number;
  duplicates: number;
  behaviouralDuplicates: number;
  sameAsCentre: number;
  share: number; // unique points, DD < $35,000
  shareAll: number; // every point (Study 5's convention)
  shareSe: number;
  breaches: number; // unique points with DD ≥ $35,000
  ddMedian: number;
  ddP10: number;
  ddP90: number;
  ddP90All: number;
  ddWorst: number;
  netMedian: number;
  netP10: number;
  netP90: number;
  netWorst: number;
  netBest: number;
  positive: number;
  atLeastHalf: number;
  atLeastThreeQuarters: number;
  centrePercentile: number; // share of unique neighbours with net below the centre's
  interestMedian: number;
  grossMedian: number;
  costsMedian: number;
  occupancyMedian: number;
  lotsMedian: number;
  kreLotsMedian: number;
  refusedMedian: number;
  gate: { centre: boolean; share: boolean; p90: boolean; pass: boolean };
}

export const summarize = (
  records: readonly PointRecord[],
  unique: readonly boolean[],
  centre: PointRecord
): SetSummary => {
  const kept = records.filter((_record, index) => unique[index]);
  const dd = kept.map((record) => record.dd);
  const net = kept.map((record) => record.net);
  const signatures = new Map<string, number>();

  for (const record of kept) {
    signatures.set(record.signature, (signatures.get(record.signature) ?? 0) + 1);
  }

  const share = shareBelow(dd);
  const p90 = quantile(dd, 0.9);
  const median = (values: number[]) => quantile(values, 0.5);

  return {
    n: records.length,
    unique: kept.length,
    duplicates: records.length - kept.length,
    behaviouralDuplicates: [...signatures.values()].reduce((total, count) => total + count - 1, 0),
    sameAsCentre: kept.filter((record) => record.signature === centre.signature).length,
    share,
    shareAll: shareBelow(records.map((record) => record.dd)),
    shareSe: Math.sqrt((share * (1 - share)) / Math.max(1, kept.length)),
    breaches: dd.filter((value) => value >= ceiling).length,
    ddMedian: median(dd),
    ddP10: quantile(dd, 0.1),
    ddP90: p90,
    ddP90All: quantile(
      records.map((record) => record.dd),
      0.9
    ),
    ddWorst: Math.max(...dd),
    netMedian: median(net),
    netP10: quantile(net, 0.1),
    netP90: quantile(net, 0.9),
    netWorst: Math.min(...net),
    netBest: Math.max(...net),
    positive: net.filter((value) => value > 0).length / Math.max(1, net.length),
    atLeastHalf: net.filter((value) => value >= 0.5 * centre.net).length / Math.max(1, net.length),
    atLeastThreeQuarters: net.filter((value) => value >= 0.75 * centre.net).length / Math.max(1, net.length),
    centrePercentile: net.filter((value) => value < centre.net).length / Math.max(1, net.length),
    interestMedian: median(kept.map((record) => record.interest)),
    grossMedian: median(kept.map((record) => record.gross)),
    costsMedian: median(kept.map((record) => record.costs)),
    occupancyMedian: median(kept.map((record) => record.occupancy)),
    lotsMedian: median(kept.map((record) => record.lots)),
    kreLotsMedian: median(kept.map((record) => record.kreLots)),
    refusedMedian: median(kept.map((record) => record.refused)),
    gate: {
      centre: centre.dd < ceiling,
      share: share >= 0.9,
      p90: p90 < ceiling,
      pass: centre.dd < ceiling && share >= 0.9 && p90 < ceiling
    }
  };
};

export const uniqueOf = (configurations: readonly Books[], centre: Books) => {
  const seen = new Set<string>([booksKey(centre)]);

  return configurations.map((books) => {
    const key = booksKey(books);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

// ----- the minute mark series (§3.2, §6.7) -----

export interface SeriesPoint {
  time: number; // seconds (UTC)
  session: number;
  value: number; // realized + unrealized
  realized: number;
  openLot: number; // ledger lot id held at this mark, or -1
  unrealized: number;
  closed: number; // funded lots closed so far (lots open and close in ledger order: one slot)
}

export interface MinuteSeries {
  points: SeriesPoint[];
  lots: RealLot[];
  maximum: number;
  peakIndex: number;
  troughIndex: number;
  trackerMaximum: number;
  matchesTracker: boolean;
}

export const minuteSeries = (
  lab: Lab,
  result: ReplayResult,
  books: Books,
  settings: RunSettings = baseSettings
): MinuteSeries => {
  if (!result.full) {
    throw new Error('minuteSeries needs a detailed replay');
  }

  const lots = result.full.lots as unknown as RealLot[];
  // The replay's calendar and first bar are its configuration's first book's (replayFixedPool `anyDs`).
  const anyDs = lab.dsOf(orderedSymbols(books)[0]!);
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

// The contribution of each funded lot to the mark change between two series points (sums to the change exactly up to
// floating-point rounding): closed by then → its net; open → its unrealized; not yet opened → 0.
export const lotContributions = (series: MinuteSeries, fromIndex: number, toIndex: number) => {
  const at = (index: number) => {
    const point = series.points[index];
    const state = new Map<number, number>();

    if (!point) {
      return state;
    }

    series.lots.forEach((lot, ordinal) => {
      if (point.openLot === lot.id) {
        state.set(lot.id, point.unrealized);
      } else if (ordinal < point.closed) {
        state.set(lot.id, lot.net);
      }
    });

    return state;
  };
  const before = at(fromIndex);
  const after = at(toIndex);
  const ids = new Set([...before.keys(), ...after.keys()]);
  const rows = [...ids]
    .map((id) => {
      const lot = series.lots.find((item) => item.id === id)!;

      return {
        lot: id,
        symbol: lot.symbol,
        entryTime: lot.entryTime,
        exitTime: lot.exitTime,
        exitReason: lot.exitReason,
        net: lot.net,
        contribution: (after.get(id) ?? 0) - (before.get(id) ?? 0)
      };
    })
    .filter((row) => Math.abs(row.contribution) > 1e-9);
  const change = (series.points[toIndex]?.value ?? 0) - (series.points[fromIndex]?.value ?? 0);

  return { rows, change, residual: change - rows.reduce((total, row) => total + row.contribution, 0) };
};

// Per-period minute drawdown from the series (peak reset to the last mark before the period's first session).
export const periodMinuteDrawdown = (series: MinuteSeries, dates: readonly string[], start: string, end: string) => {
  let peak = NaN;
  let worst = 0;
  let previous = 0;

  for (const point of series.points) {
    const date = dates[point.session]!;

    if (date < start) {
      previous = point.value;
      continue;
    }

    if (date > end) {
      break;
    }

    if (Number.isNaN(peak)) {
      peak = previous;
    }

    if (point.value > peak) {
      peak = point.value;
    }

    worst = Math.max(worst, peak - point.value);
  }

  return worst;
};

// The largest non-overlapping drawdown episodes of the series (peak → trough, recovery = the first mark above the peak).
export const drawdownEpisodes = (series: MinuteSeries, top = 5) => {
  const episodes: { peakIndex: number; troughIndex: number; recoveryIndex: number; depth: number }[] = [];
  let peak = 0;
  let peakIndex = -1;
  let trough = 0;
  let troughIndex = -1;

  series.points.forEach((point, index) => {
    if (point.value > peak) {
      if (troughIndex >= 0 && peak - trough > 0) {
        episodes.push({ peakIndex, troughIndex, recoveryIndex: index, depth: peak - trough });
      }

      peak = point.value;
      peakIndex = index;
      trough = point.value;
      troughIndex = -1;
    } else if (point.value < trough) {
      trough = point.value;
      troughIndex = index;
    }
  });

  if (troughIndex >= 0 && peak - trough > 0) {
    episodes.push({ peakIndex, troughIndex, recoveryIndex: -1, depth: peak - trough });
  }

  return episodes.sort((a, b) => b.depth - a.depth).slice(0, top);
};

export const newYork = (seconds: number) =>
  seconds > 0 && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toLocaleString('sv-SE', { timeZone: 'America/New_York', hour12: false }).slice(0, 16)
    : '';

export const quarterOf = (seconds: number) => {
  const date = newYork(seconds);

  return date ? `${date.slice(0, 4)}-Q${Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1}` : '';
};

export type { Grid };
