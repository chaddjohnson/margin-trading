// The robustness battery of PROTOCOL.md sections 9-10, shared by the development (pre-freeze) and holdout
// stages: walk-forward and holdout scoring under each execution model and margin rate, one-at-a-time
// parameter perturbations, start-date ensembles, event-block attribution with an event-level bootstrap,
// and the data-quality variant.
import { Rng } from '../optimizer/rng.ts';
import type { CandidateType } from './candidates.ts';
import { finalFold, walkForwardFolds } from './constants.ts';
import type { DailyBars } from './data.ts';
import { type RunOptions, type StrategyParams, baselineParams, simulate } from './engine.ts';
import type { CompactMetrics, Job } from './evaluate.ts';
import { type AnalysisEpisode, analysisEpisodes, attributionBlocks, blockPnl } from './episodes.ts';
import { classify } from './grids.ts';
import { IndicatorCache } from './indicators.ts';
import { type NumericKey, spaces } from './params.ts';
import { quantile } from './selection.ts';
import { type Study, flatTestJob, foldIndexes, runJobs, testJob } from './study.ts';

export interface Scenario {
  id: string;
  options: Partial<RunOptions>;
}

export const scenarios: Scenario[] = [
  { id: 'close@11%', options: {} },
  { id: 'nextOpen@11%', options: { execution: 'nextOpen' } },
  { id: 'close@8%', options: { marginRate: 0.08 } },
  { id: 'close@9.5%', options: { marginRate: 0.095 } },
  { id: 'close@12.5%', options: { marginRate: 0.125 } },
  { id: 'close@14%', options: { marginRate: 0.14 } },
  { id: 'nextOpen@8%', options: { execution: 'nextOpen', marginRate: 0.08 } },
  { id: 'nextOpen@14%', options: { execution: 'nextOpen', marginRate: 0.14 } }
];

export interface Score {
  net: number;
  dd: number;
  entries: number;
  interest: number;
  perFold?: { fold: string; net: number; dd: number }[];
}

const scoreOf = (metrics: CompactMetrics): Score => ({
  net: metrics.netProfit,
  dd: metrics.maximumDrawdown,
  entries: metrics.entries,
  interest: metrics.interest
});

// Walk-forward aggregate of a candidate type: each fold's own pick on that fold's validation window
// (continuous attribution), summed net and worst drawdown.
export const walkForwardScores = async (study: Study, types: CandidateType[], scenario: Scenario) => {
  const jobs: Job[] = [];

  for (const type of types) {
    for (const fold of walkForwardFolds) {
      jobs.push(testJob(foldIndexes(study, fold), type.perFold[fold.id]!, scenario.options));
    }
  }

  const metrics = await runJobs(study, jobs);
  const result: Record<string, Score> = {};

  types.forEach((type, typeIndex) => {
    const rows = walkForwardFolds.map((fold, foldIndex) => ({
      fold: fold.id,
      metrics: metrics[typeIndex * walkForwardFolds.length + foldIndex]!
    }));

    result[type.id] = {
      net: rows.reduce((total, row) => total + row.metrics.netProfit, 0),
      dd: Math.max(...rows.map((row) => row.metrics.maximumDrawdown)),
      entries: rows.reduce((total, row) => total + row.metrics.entries, 0),
      interest: rows.reduce((total, row) => total + row.metrics.interest, 0),
      perFold: rows.map((row) => ({ fold: row.fold, net: row.metrics.netProfit, dd: row.metrics.maximumDrawdown }))
    };
  });

  return result;
};

// Holdout scores of the FINAL picks: continuous attribution (primary) and flat start.
export const holdoutScores = async (study: Study, types: CandidateType[], scenario: Scenario) => {
  if (study.kind !== 'full') {
    throw new Error('Holdout scores need the full series');
  }

  const folds = foldIndexes(study, finalFold);
  const continuous = await runJobs(
    study,
    types.map((type) => testJob(folds, type.perFold.FINAL!, scenario.options))
  );
  const flat = await runJobs(
    study,
    types.map((type) => flatTestJob(folds, type.perFold.FINAL!, scenario.options))
  );

  return Object.fromEntries(
    types.map((type, index) => [type.id, { continuous: continuous[index]!, flat: flat[index]! }])
  );
};

// One parameter at a time (PROTOCOL.md section 10), clipped to the Phase 4 domain.
const steps: Record<NumericKey, number[]> = {
  lookback: [-10, -5, -2, 2, 5, 10],
  armTenths: [-5, -3, -1, 1, 3, 5],
  reboundTenths: [-5, -3, -1, 1, 3, 5],
  atrMultTenths: [-5, -3, -1, 1, 3, 5],
  atrPeriod: [-4, -2, -1, 1, 2, 4],
  stopTenths: [-5, -3, -1, 1, 3, 5],
  holdDays: [-3, -2, -1, 1, 2, 3],
  materialLossTenths: [-5, -3, -1, 1, 3, 5],
  lowerReentryTenths: [-5, -3, -1, 1, 3, 5],
  retraceTenths: [-5, -3, -1, 1, 3, 5]
};

const bounds = Object.fromEntries(
  spaces.atr.specs.concat(spaces.fixed.specs).map((spec) => [spec.key, [spec.min, spec.max]])
) as Record<NumericKey, [number, number]>;

export const perturbationsOf = (params: StrategyParams) => {
  const keys: NumericKey[] = [
    'lookback',
    'armTenths',
    'stopTenths',
    'holdDays',
    'materialLossTenths',
    'lowerReentryTenths',
    'retraceTenths'
  ];

  if (params.entryMode === 'fixed') {
    keys.push('reboundTenths');
  }

  if (params.entryMode === 'atrSnapshot' || params.entryMode === 'atrRolling') {
    keys.push('atrMultTenths', 'atrPeriod');
  }

  const result: { key: NumericKey; step: number; params: StrategyParams }[] = [];

  for (const key of keys) {
    for (const step of steps[key]) {
      const [min, max] = bounds[key];
      const value = Math.min(max, Math.max(min, params[key] + step));

      if (value !== params[key]) {
        result.push({ key, step, params: { ...params, [key]: value } });
      }
    }
  }

  return result;
};

export const perturbationScores = async (
  study: Study,
  params: StrategyParams,
  first: number,
  last: number,
  runStart: number
) => {
  const list = perturbationsOf(params);
  const metrics = await runJobs(
    study,
    list.map((entry) => ({ params: entry.params, startIndex: runStart, endIndex: last, windows: [[first, last]] }))
  );
  const rows = list.map((entry, index) => ({
    key: entry.key,
    step: entry.step,
    net: metrics[index]!.netProfit,
    dd: metrics[index]!.maximumDrawdown
  }));

  return {
    rows,
    medianNet: quantile(
      rows.map((row) => row.net),
      0.5
    ),
    medianDd: quantile(
      rows.map((row) => row.dd),
      0.5
    ),
    p25Net: quantile(
      rows.map((row) => row.net),
      0.25
    ),
    p75Dd: quantile(
      rows.map((row) => row.dd),
      0.75
    ),
    worstNet: Math.min(...rows.map((row) => row.net)),
    worstDd: Math.max(...rows.map((row) => row.dd))
  };
};

export const startDateScores = async (study: Study, list: StrategyParams[], starts: number[], last: number) => {
  const jobs = list.flatMap((params) =>
    starts.map((start) => ({
      params,
      startIndex: start,
      endIndex: last,
      windows: [[start, last]] as [number, number][]
    }))
  );
  const metrics = await runJobs(study, jobs);

  return list.map((_params, listIndex) =>
    starts.map((start, startIndex) => ({
      start: study.bars.date[start]!,
      ...scoreOf(metrics[listIndex * starts.length + startIndex]!)
    }))
  );
};

export const firstSessionOfMonths = (study: Study, fromMonth: string, toMonth: string) => {
  const result: number[] = [];

  for (let index = 0; index < study.bars.date.length; index++) {
    const month = study.bars.date[index]!.slice(0, 7);

    if (month >= fromMonth && month <= toMonth && (index === 0 || study.bars.date[index - 1]!.slice(0, 7) !== month)) {
      result.push(index);
    }
  }

  return result;
};

export interface BlockDifference {
  window: string;
  block: string;
  depth: number;
  speed: string;
  candidate: number;
  baseline: number;
  difference: number;
}

// Per-block P&L of a candidate and B0, from continuous runs from `runStart`, inside [first, last].
export const blockDifferences = (
  study: Study,
  candidate: StrategyParams,
  window: string,
  runStart: number,
  first: number,
  last: number,
  episodes: AnalysisEpisode[],
  options: Partial<RunOptions> = {}
): BlockDifference[] => {
  const cand = simulate(study.bars, study.cache, candidate, runStart, last, { ...options, record: false });
  const base = simulate(study.bars, study.cache, baselineParams, runStart, last, { ...options, record: false });

  return attributionBlocks(study.bars, episodes, first, last).map((block) => ({
    window,
    block: block.label,
    depth: block.episode?.depth ?? NaN,
    speed: block.episode?.speed ?? '',
    candidate: blockPnl(cand, block),
    baseline: blockPnl(base, block),
    difference: blockPnl(cand, block) - blockPnl(base, block)
  }));
};

// Event-level bootstrap of the mean block difference: blocks resampled with replacement.
export const bootstrap = (differences: number[], label: string, resamples = 10000) => {
  const rng = Rng.from('trailing-buy-entry', 'bootstrap', label);
  const means: number[] = [];
  const sums: number[] = [];

  for (let sample = 0; sample < resamples; sample++) {
    let total = 0;

    for (let draw = 0; draw < differences.length; draw++) {
      total += differences[rng.int(differences.length)]!;
    }

    sums.push(total);
    means.push(total / differences.length);
  }

  const observed = differences.reduce((a, b) => a + b, 0);

  return {
    blocks: differences.length,
    observedSum: observed,
    observedMean: observed / differences.length,
    mean90: [quantile(means, 0.05), quantile(means, 0.95)],
    sum90: [quantile(sums, 0.05), quantile(sums, 0.95)],
    pSumPositive: sums.filter((value) => value > 0).length / resamples
  };
};

// The data-quality variant: 2015-08-24's dislocated low replaced by min(open, close).
export const withRepairedLow = (bars: DailyBars) => {
  const index = bars.date.indexOf('2015-08-24');
  const low = [...bars.low];

  low[index] = Math.min(bars.open[index]!, bars.close[index]!);

  return { ...bars, low, repaired: { date: '2015-08-24', from: bars.low[index]!, to: low[index]! } };
};

export const runOn = (
  bars: DailyBars,
  params: StrategyParams,
  first: number,
  last: number,
  options: Partial<RunOptions> = {}
) => simulate(bars, new IndicatorCache(bars), params, first, last, { ...options, record: false });

export const classifyAgainst = (score: { net: number; dd: number }, baseline: { net: number; dd: number }) =>
  classify(score, baseline);

export const episodesIn = (study: Study, first: number, last: number) => analysisEpisodes(study.bars, first, last);
