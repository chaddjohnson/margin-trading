// The study context: which bars are loaded, how fold dates map to bar indexes, and helpers that run jobs
// through the evaluator. Development work loads the VGT bars truncated at the development end, so holdout
// prices are not even in memory; only holdout.ts opens the full series, after the freeze.
import os from 'node:os';
import fs from 'fs-extra';
import { type Fold, developmentEnd, finalFold, researchStart, resultsDir, walkForwardFolds } from './constants.ts';
import { type DailyBars, firstIndexOnOrAfter, lastIndexOnOrBefore, loadVgt, sliceBars } from './data.ts';
import { type RunOptions, type StrategyParams, baselineParams, checkedInParams, simulate } from './engine.ts';
import type { CompactMetrics, Job } from './evaluate.ts';
import { IndicatorCache } from './indicators.ts';
import { type WindowMetrics, windowMetrics } from './metrics.ts';
import { type Evaluator, LocalEvaluator, WorkerPool } from './pool.ts';

export interface Study {
  kind: 'development' | 'full';
  bars: DailyBars;
  datasetId: string;
  evaluator: Evaluator;
  cache: IndicatorCache;
  start: number; // index of the research start (2014-01-02)
  index(date: string): number; // first session on or after the date
  lastIndex(date: string): number; // last session on or before the date
  close(): Promise<void>;
}

export const workerCount = () => {
  const requested = Number(process.env.TBE_WORKERS);

  return Number.isInteger(requested) && requested >= 0 ? requested : Math.max(1, os.availableParallelism() - 2);
};

const open = async (kind: Study['kind'], bars: DailyBars, workers: number): Promise<Study> => {
  const datasetId = `${bars.symbol}|${bars.sha256.slice(0, 16)}|${bars.date.at(-1)}`;
  const evaluator = workers > 0 ? new WorkerPool(workers, 16) : new LocalEvaluator();

  evaluator.register({
    id: datasetId,
    date: bars.date,
    time: bars.time,
    open: bars.open,
    high: bars.high,
    low: bars.low,
    close: bars.close
  });

  return {
    kind,
    bars,
    datasetId,
    evaluator,
    cache: new IndicatorCache(bars),
    start: firstIndexOnOrAfter(bars, researchStart),
    index: (date) => firstIndexOnOrAfter(bars, date),
    lastIndex: (date) => lastIndexOnOrBefore(bars, date),
    close: () => evaluator.close()
  };
};

export const openDevelopment = async (workers = workerCount()) => {
  const bars = await loadVgt();
  const end = lastIndexOnOrBefore(bars, developmentEnd);

  return open('development', sliceBars(bars, 0, end), workers);
};

// Only the holdout and post-freeze reporting may call this (holdout.ts checks the freeze first).
export const openFullUnchecked = async (workers = workerCount()) => open('full', await loadVgt(), workers);

export interface FoldIndexes {
  fold: Fold;
  trainStart: number;
  trainEnd: number;
  testStart: number;
  testEnd: number;
}

export const foldIndexes = (study: Study, fold: Fold): FoldIndexes => {
  const result = {
    fold,
    trainStart: study.index(fold.trainStart),
    trainEnd: study.lastIndex(fold.trainEnd),
    testStart: study.index(fold.testStart),
    testEnd: study.lastIndex(fold.testEnd)
  };

  if (study.kind === 'development' && fold.testEnd > developmentEnd) {
    // The FINAL fold's test window is the holdout: not available in a development study.
    return { ...result, testStart: -1, testEnd: -1 };
  }

  return result;
};

export const developmentFolds = [...walkForwardFolds, finalFold];

export const yearsBetween = (study: Study, first: number, last: number) =>
  (study.bars.time[last]! - study.bars.time[first]!) / (365.25 * 86400);

// Training metrics: a run from the research start that stops at the training end.
export const trainingJob = (folds: FoldIndexes, params: StrategyParams, options?: Partial<RunOptions>): Job => ({
  params,
  startIndex: folds.trainStart,
  endIndex: folds.trainEnd,
  windows: [[folds.trainStart, folds.trainEnd]],
  options
});

// Validation metrics, continuous attribution: a run from the research start to the test end, scored over
// the test window only.
export const testJob = (folds: FoldIndexes, params: StrategyParams, options?: Partial<RunOptions>): Job => ({
  params,
  startIndex: folds.trainStart,
  endIndex: folds.testEnd,
  windows: [[folds.testStart, folds.testEnd]],
  options
});

// Validation metrics, flat start: a fresh run over the test window (indicators use earlier history).
export const flatTestJob = (folds: FoldIndexes, params: StrategyParams, options?: Partial<RunOptions>): Job => ({
  params,
  startIndex: folds.testStart,
  endIndex: folds.testEnd,
  windows: [[folds.testStart, folds.testEnd]],
  options
});

export const runJobs = async (study: Study, jobs: Job[]): Promise<CompactMetrics[]> =>
  (await study.evaluator.run(study.datasetId, jobs)).map((result) => result.windows[0]!);

// A full, recorded run (trades, setups, logs) in the main thread, for reports and charts.
export const recordedRun = (
  study: Study,
  params: StrategyParams,
  first: number,
  last: number,
  options?: Partial<RunOptions>
) => simulate(study.bars, study.cache, params, first, last, { ...options, record: true });

export const recordedWindow = (
  study: Study,
  params: StrategyParams,
  runStart: number,
  first: number,
  last: number,
  options?: Partial<RunOptions>
): { result: ReturnType<typeof simulate>; metrics: WindowMetrics } => {
  const result = recordedRun(study, params, runStart, last, options);

  return { result, metrics: windowMetrics(study.bars, result, first, last) };
};

export const named = { B0: baselineParams, B0c: checkedInParams };

export const writeJson = async (relative: string, value: unknown) => {
  const file = `${resultsDir}/${relative}`;

  await fs.ensureDir(file.slice(0, file.lastIndexOf('/')));
  await fs.writeFile(file, `${JSON.stringify(value, null, 1)}\n`);

  return file;
};

export const writeText = async (relative: string, text: string) => {
  const file = `${resultsDir}/${relative}`;

  await fs.ensureDir(file.slice(0, file.lastIndexOf('/')));
  await fs.writeFile(file, text);

  return file;
};

export const toCsv = (rows: Record<string, unknown>[]) => {
  if (rows.length === 0) {
    return '';
  }

  const columns = Object.keys(rows[0]!);
  const cell = (value: unknown) => {
    if (value === undefined || value === null || (typeof value === 'number' && Number.isNaN(value))) {
      return '';
    }

    const text = String(value);

    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return `${[columns.join(','), ...rows.map((row) => columns.map((column) => cell(row[column])).join(','))].join('\n')}\n`;
};
