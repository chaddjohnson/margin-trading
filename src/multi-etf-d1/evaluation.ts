// Evaluation windows and the thin wrapper around the d1-refinement evaluator (engine + accounting + metrics). One
// continuous run per candidate from the common eligibility session; every window of the protocol is a segment of
// that run. A segment that starts at the eligibility session reports exactly what a run truncated at its end would
// (the engine is causal and the accounting carries nothing across a segment start), which tests/segments.test.ts
// asserts, so the training folds never need a separate truncated dataset.
import { type Dataset, firstIndexOnOrAfter, lastIndexOnOrBefore } from '../four-family/data.ts';
import type { Segment } from '../trailing-buy-variants/accounting.ts';
import type { StopFill } from '../d1-refinement/engine.ts';
import { type Caches, type Detail, type EvalSpec, type Metrics, evaluateCandidate } from '../d1-refinement/evaluate.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { makeCaches } from '../d1-refinement/pool.ts';
import { protocol } from './context.ts';
import type { TickerData } from './data.ts';
import { d1Family } from './space.ts';

export const yearSegments = (ds: Dataset, start: number, end: number): Segment[] => {
  const segments: Segment[] = [];

  for (let s = start; s <= end; s++) {
    const year = ds.dates[s]!.slice(0, 4);
    const last = segments.at(-1);

    if (last?.label === year) {
      last.end = s;
    } else {
      segments.push({ label: year, start: s, end: s });
    }
  }

  return segments;
};

export const trainLabel = (fold: string) => `train:${fold}`;
export const validLabel = (fold: string) => `valid:${fold}`;

// The fold windows as session indexes of a dataset.
export const foldWindows = (data: TickerData) => {
  const { ds, eligibility } = data;

  return protocol.folds.map((fold) => {
    const trainEnd = Math.min(data.developmentEnd, lastIndexOnOrBefore(ds, fold.trainEnd));
    const validation = fold.validation
      ? {
          start: firstIndexOnOrAfter(ds, fold.validation.start),
          end: Math.min(data.developmentEnd, lastIndexOnOrBefore(ds, fold.validation.end))
        }
      : undefined;

    if (trainEnd <= eligibility) {
      throw new Error(`${fold.key}: the training window ends before the eligibility session`);
    }

    if (validation && (validation.start <= trainEnd || validation.end < validation.start)) {
      throw new Error(
        `${fold.key}: the validation window ${validation.start}..${validation.end} is not after the training window`
      );
    }

    return { key: fold.key, trainEnd, validation };
  });
};

// Years of a training window, for the minimum entry count.
export const windowYears = (ds: Dataset, start: number, end: number) =>
  ((Date.parse(ds.dates[end]!) - Date.parse(ds.dates[start]!)) / 86400000 + 1) / 365.25;

export const minEntriesFor = (ds: Dataset, start: number, end: number) =>
  Math.ceil(windowYears(ds, start, end) * protocol.minEntriesPerYear);

// The development run: eligibility → last development session, with the development window first (the main
// window of the metrics), the training and validation windows of every fold, and the calendar years.
export const developmentSpec = (
  data: TickerData,
  stopFill: StopFill = protocol.stopFill,
  marginInterestRate: number = protocol.marginInterestRate,
  costPerSide?: number
): EvalSpec => {
  const { ds, eligibility, developmentEnd } = data;

  if (ds.sessionCount - 1 !== developmentEnd || ds.lastDate > protocol.developmentEnd) {
    throw new Error(`${ds.id} is not a development view ending on the last development session`);
  }

  const segments: Segment[] = [{ label: 'development', start: eligibility, end: developmentEnd }];

  for (const fold of foldWindows(data)) {
    segments.push({ label: trainLabel(fold.key), start: eligibility, end: fold.trainEnd });

    if (fold.validation) {
      segments.push({ label: validLabel(fold.key), start: fold.validation.start, end: fold.validation.end });
    }
  }

  segments.push(...yearSegments(ds, eligibility, developmentEnd));

  return {
    label: `development-${stopFill}-${marginInterestRate}${costPerSide ? `-cost${costPerSide}` : ''}`,
    stopFill,
    marginInterestRate,
    armStart: eligibility,
    endIndex: developmentEnd,
    segments,
    costPerSide
  };
};

// The holdout run (holdout command only): eligibility → the last session of the full file, with the combined
// window first, then development, holdout, the holdout years and every calendar year.
export const holdoutSpec = (
  data: TickerData,
  holdoutStart: number,
  stopFill: StopFill = protocol.stopFill,
  marginInterestRate: number = protocol.marginInterestRate,
  costPerSide?: number
): EvalSpec => {
  const { ds, eligibility, developmentEnd } = data;
  const endIndex = ds.sessionCount - 1;

  if (holdoutStart !== developmentEnd + 1) {
    throw new Error(
      `The holdout must start on the session after the development end (${developmentEnd + 1}), not ${holdoutStart}`
    );
  }

  const segments: Segment[] = [
    { label: 'combined', start: eligibility, end: endIndex },
    { label: 'development', start: eligibility, end: developmentEnd },
    { label: 'holdout', start: holdoutStart, end: endIndex },
    ...yearSegments(ds, eligibility, endIndex)
  ];

  return {
    label: `holdout-${stopFill}-${marginInterestRate}${costPerSide ? `-cost${costPerSide}` : ''}`,
    stopFill,
    marginInterestRate,
    armStart: eligibility,
    endIndex,
    segments,
    costPerSide
  };
};

// A run from the file's own arming convention (session 74 = tickWindowSize), for the file parity of the benchmark.
export const fileNativeSpec = (data: TickerData, armStart: number): EvalSpec => ({
  label: `file-native-arm${armStart}`,
  stopFill: protocol.stopFill,
  marginInterestRate: protocol.marginInterestRate,
  armStart,
  endIndex: data.developmentEnd,
  segments: [{ label: 'development', start: data.eligibility, end: data.developmentEnd }]
});

export const segmentOf = (metrics: Metrics, label: string) =>
  metrics.segments.find((segment) => segment.label === label);

export const cachesFor = (ds: Dataset): Caches => makeCaches(ds);

export const evaluateOne = (
  ds: Dataset,
  caches: Caches,
  params: IntParams,
  spec: EvalSpec,
  detail = false
): { metrics: Metrics; detail?: Detail } => evaluateCandidate(ds, caches, d1Family, params, spec, detail);

export const dateOf = (ds: Dataset, index: number) => ds.dates[index] ?? '';
