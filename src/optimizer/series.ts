// Daily series and the data-access guard.
//
// The optimizer never sees a full series. `researchSeries` returns a physically truncated copy whose last
// session is on or before the protocol's research end, and the experiment code accepts only those views.
// Sessions after the research end (the final holdout) are reachable only through `unlockedSeries`, which
// requires a verified freeze record (see holdout.ts).
import { loadCsvBacktestData } from '#lib';
import type { Manifest } from './data/prepare.ts';

export type SeriesPhase = 'research' | 'unlocked';

export interface Series {
  symbol: string;
  phase: SeriesPhase;
  visibleEnd: string; // last date that may appear in this view
  dataSha256: string; // processed file hash, for provenance
  dates: string[];
  time: Float64Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  volume: Float64Array;
  years: Int16Array;
}

export class HoldoutLockedError extends Error {}

const researchViews = new WeakSet<Series>();

export const toDate = (time: number) => new Date(time * 1000).toISOString().slice(0, 10);

const loadFull = async (symbol: string, manifest: Manifest) => {
  const entry = manifest.entries[symbol];

  if (!entry || entry.status !== 'ok' || !entry.processed) {
    throw new Error(`${symbol}: no validated processed data in the manifest`);
  }

  const ticks = await loadCsvBacktestData(symbol, entry.processed.path);

  return { ticks, sha256: entry.processed.sha256 };
};

export const buildSeries = (
  symbol: string,
  ticks: { time: number; open: number; high: number; low: number; close: number; volume: number }[],
  phase: SeriesPhase,
  visibleEnd: string,
  dataSha256: string
): Series => {
  const visible = ticks.filter((tick) => toDate(tick.time) <= visibleEnd);
  const series: Series = {
    symbol,
    phase,
    visibleEnd,
    dataSha256,
    dates: visible.map((tick) => toDate(tick.time)),
    time: Float64Array.from(visible, (tick) => tick.time),
    open: Float64Array.from(visible, (tick) => tick.open),
    high: Float64Array.from(visible, (tick) => tick.high),
    low: Float64Array.from(visible, (tick) => tick.low),
    close: Float64Array.from(visible, (tick) => tick.close),
    volume: Float64Array.from(visible, (tick) => tick.volume),
    years: Int16Array.from(visible, (tick) => new Date(tick.time * 1000).getUTCFullYear())
  };

  if (phase === 'research') {
    researchViews.add(series);
  }

  return series;
};

export const researchSeries = async (symbol: string, manifest: Manifest, researchEnd: string) => {
  const { ticks, sha256 } = await loadFull(symbol, manifest);

  return buildSeries(symbol, ticks, 'research', researchEnd, sha256);
};

// Throws unless the series is a research view that ends on or before the research end.
export const assertResearchView = (series: Series, researchEnd: string) => {
  if (!researchViews.has(series) || series.phase !== 'research') {
    throw new HoldoutLockedError(`${series.symbol}: the optimizer accepts only research views of a series`);
  }

  if (series.visibleEnd > researchEnd || (series.dates.at(-1) ?? '') > researchEnd) {
    throw new HoldoutLockedError(`${series.symbol}: research view extends past ${researchEnd}`);
  }
};

// The capability to read past the research end is issued exactly once, to holdout.ts, which uses it only
// after verifying a freeze record. Any other caller gets an error.
const holdoutCapability = Symbol('holdout-capability');
let isCapabilityIssued = false;

export const issueHoldoutCapability = () => {
  if (isCapabilityIssued) {
    throw new HoldoutLockedError('The holdout capability has already been issued');
  }

  isCapabilityIssued = true;

  return holdoutCapability;
};

// The full series, for the frozen holdout and stress evaluations only.
export const unlockedSeries = async (symbol: string, manifest: Manifest, capability: symbol) => {
  if (capability !== holdoutCapability) {
    throw new HoldoutLockedError('Holdout data requires the capability held by holdout.ts');
  }

  const { ticks, sha256 } = await loadFull(symbol, manifest);

  return buildSeries(symbol, ticks, 'unlocked', '9999-12-31', sha256);
};

// Index of the first session on or after a date, or the length when none.
export const firstIndexOnOrAfter = (series: Series, date: string) => {
  let low = 0;
  let high = series.dates.length;

  while (low < high) {
    const middle = (low + high) >> 1;

    if (series.dates[middle]! < date) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
};

// Index of the last session on or before a date, or -1 when none.
export const lastIndexOnOrBefore = (series: Series, date: string) => firstIndexOnOrAfter(series, `${date}￿`) - 1;
