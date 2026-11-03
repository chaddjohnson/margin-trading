// Walk-forward experiment orchestration. Everything here works on research views of the data, which end
// at the protocol's research end: the final holdout is not reachable from this module.
//
// Per symbol:
// - Each walk-forward fold: a training run (Sobol + NSGA-II + selection) on the fold's expanding training
//   window, then the fold's rank-1 and top-N candidates, and the original parameters, evaluated on the
//   following calendar year. The validation simulator receives parameters fixed before it runs.
// - The final development run on 2014-2023: the shortlist that gets frozen.
// - Controls on the final window: Sobol versus uniform random exploration at the same budgets.
//
// Window policy: every window starts flat (no position, no re-entry restriction) on its first session,
// with earlier sessions available only as history for the reference high; a position still open on the
// window's last session is marked to market at that close, net of interest accrued through it.
import fs from 'fs-extra';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { type AllInParams, originalParams } from '../app/allIn-optimizable.ts';
import type { Manifest } from './data/prepare.ts';
import {
  type DatasetArrays,
  type EvalWindow,
  type Metrics,
  ReferenceHighCache,
  simulateWindow,
  summarize
} from './evaluate.ts';
import { type FitnessConfig, violationOf } from './fitness.ts';
import { hypervolume2d, paretoRanks2d } from './nsga2.ts';
import { type ParameterSpace, describeParams } from './params.ts';
import type { Evaluator } from './pool.ts';
import type { Protocol, Window } from './protocol.ts';
import { stableHash } from './provenance.ts';
import { type Candidate, CandidateCache, type SearchConfig, runSearch } from './search.ts';
import { type SelectionConfig, type SelectionResult, baseGates, selectShortlist } from './selection.ts';
import {
  type Series,
  assertResearchView,
  firstIndexOnOrAfter,
  lastIndexOnOrBefore,
  researchSeries,
  toDate
} from './series.ts';

const gzip = promisify(zlib.gzip);

export interface ExperimentConfig {
  id: string;
  seed: string;
  symbols: string[];
  protocol: Protocol;
  space: ParameterSpace;
  search: SearchConfig;
  fitness: FitnessConfig;
  selection: SelectionConfig;
  controlSeeds: number; // per sampler on the final window; 0 disables the control
  runFolds: boolean;
  tickerConcurrency: number;
}

export interface WindowInfo extends EvalWindow {
  start: string;
  end: string;
  firstSession: string;
  lastSession: string;
  years: number;
  warmupSessions: number;
}

export interface ShortlistCandidate {
  rank: number;
  id: string;
  params: AllInParams;
  origin: Candidate['origin'];
  metrics: Metrics;
  objectives: number[];
  violation: number;
  meritRank: number;
  merit: number;
  paretoRank: number;
  neighbourhood: SelectionResult['shortlist'][number]['neighbourhood'];
  positiveYearShare: number;
  inclusion: string;
  behaviouralDuplicates: number;
  reason: string;
}

export interface TrainingRunRecord {
  runId: string;
  symbol: string;
  kind: 'fold' | 'final' | 'control';
  configHash: string;
  window: WindowInfo;
  search: SearchConfig;
  sampler: Awaited<ReturnType<typeof runSearch>>['sampler'];
  gaRuns: Awaited<ReturnType<typeof runSearch>>['gaRuns'];
  seededPopulation: string[];
  simulations: number;
  archiveSize: number;
  archiveHypervolume: number;
  explorationHypervolume: number;
  bestGatedNet?: number;
  selection: Omit<SelectionResult, 'ranked'> & { ranked: SelectionResult['ranked'] };
  shortlist: ShortlistCandidate[];
  baseline: { params: AllInParams; metrics: Metrics; violation: number };
  validation?: ValidationRecord;
  seconds: number;
}

export interface ValidationRecord {
  window: WindowInfo;
  policyAbstained: boolean;
  rank1?: { id: string; params: AllInParams; metrics: Metrics };
  shortlist: { rank: number; id: string; metrics: Metrics }[];
  original: Metrics;
}

export interface SymbolRecord {
  symbol: string;
  dataSha256: string;
  researchSessions: number;
  foldEligibility: Record<string, { eligible: boolean; reason: string }>;
  runs: string[];
}

export const resultsRoot = (researchDir: string, id: string) => path.join(researchDir, 'results', id);

const datasetOf = (series: Series): DatasetArrays => ({
  id: `${series.symbol}:${series.dataSha256.slice(0, 12)}:${series.visibleEnd}`,
  symbol: series.symbol,
  time: series.time,
  open: series.open,
  high: series.high,
  low: series.low,
  close: series.close,
  years: series.years
});

export const windowInfo = (series: Series, window: Window): WindowInfo => {
  const startIndex = firstIndexOnOrAfter(series, window.start);
  const endIndex = lastIndexOnOrBefore(series, window.end);
  const years = new Set<number>();

  for (let index = startIndex; index <= endIndex; index++) {
    years.add(series.years[index]!);
  }

  return {
    start: window.start,
    end: window.end,
    startIndex,
    endIndex,
    firstSession: series.dates[startIndex] ?? '',
    lastSession: series.dates[endIndex] ?? '',
    years: years.size,
    warmupSessions: startIndex
  };
};

// A window is usable when it is covered within the tolerance and, for training and validation, has the
// full warmup before its start.
export const windowEligibility = (series: Series, info: WindowInfo, protocol: Protocol) => {
  const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

  if (info.endIndex < info.startIndex) {
    return { eligible: false, reason: 'no sessions in the window' };
  }

  if (days(info.start, info.firstSession) > protocol.coverageToleranceDays) {
    return { eligible: false, reason: `data starts ${info.firstSession}, after ${info.start}` };
  }

  if (days(info.lastSession, info.end) > protocol.coverageToleranceDays) {
    return { eligible: false, reason: `data ends ${info.lastSession}, before ${info.end}` };
  }

  if (info.warmupSessions < protocol.warmupSessions) {
    return {
      eligible: false,
      reason: `only ${info.warmupSessions} sessions before ${info.start}; ${protocol.warmupSessions} needed for the largest lookback`
    };
  }

  return { eligible: true, reason: 'covered, with full warmup' };
};

const formatNumber = (value: number) =>
  Number.isFinite(value) ? String(value) : value > 0 ? 'Infinity' : value < 0 ? '-Infinity' : 'NaN';

const csvEscape = (value: string) => (/[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);

export const tradesCsv = (result: ReturnType<typeof simulateWindow>) => {
  const lines = ['entry_date,exit_date,entry_price,exit_price,reason,investment,shares,interest,profit,hold_days'];

  for (const trade of result.trades) {
    lines.push(
      [
        toDate(trade.entryTime),
        trade.reason === 'open' ? `${toDate(trade.exitTime)} (open)` : toDate(trade.exitTime),
        trade.entryPrice,
        trade.exitPrice,
        trade.reason,
        trade.investment,
        trade.shares,
        trade.interest,
        trade.profit,
        (trade.exitTime - trade.entryTime) / 86400
      ].join(',')
    );
  }

  return `${lines.join('\n')}\n`;
};

export const equityCsv = (result: ReturnType<typeof simulateWindow>) => {
  const lines = ['date,close,borrowed,mtm_pnl'];

  for (const row of result.dailyRows) {
    lines.push([row.date, row.close, row.borrowed, row.mtmProfit].join(','));
  }

  return `${lines.join('\n')}\n`;
};

const evaluationsCsv = (
  space: ParameterSpace,
  cache: CandidateCache,
  fitness: FitnessConfig,
  years: number,
  selection: SelectionConfig
) => {
  const header = [
    'id',
    'origin',
    ...space.specs.map((spec) => spec.key),
    'net_profit',
    'gross_profit',
    'interest',
    'max_drawdown',
    'entries',
    'closed_trades',
    'win_rate',
    'profit_factor',
    'exposure',
    'median_hold_days',
    'worst_trade',
    'f1',
    'f2',
    'violation',
    'rejections',
    'signature',
    'year_net'
  ];
  const lines = [header.join(',')];
  const sorted = [...cache.entries.values()].sort((a, b) => (a.id < b.id ? -1 : 1));

  for (const candidate of sorted) {
    const gates = baseGates(candidate, fitness, years, selection);
    const rejections = Object.entries(gates)
      .filter(([, passed]) => !passed)
      .map(([gate]) => gate)
      .join(';');
    const origin =
      candidate.origin.stage === 'ga'
        ? `ga:run${candidate.origin.run}:gen${candidate.origin.generation}`
        : candidate.origin.stage === 'neighborhood'
          ? `neighborhood:${candidate.origin.of}`
          : candidate.origin.stage === 'baseline'
            ? 'baseline'
            : `${candidate.origin.stage}:${candidate.origin.index}`;
    const metrics = candidate.metrics;

    lines.push(
      [
        candidate.id,
        origin,
        ...space.specs.map((spec) => candidate.params[spec.key]),
        metrics.netProfit,
        metrics.grossProfit,
        metrics.interest,
        metrics.maximumDrawdown,
        metrics.entries,
        metrics.closedTrades,
        formatNumber(metrics.winRate),
        formatNumber(metrics.profitFactor),
        metrics.exposure,
        formatNumber(metrics.medianHoldDays),
        formatNumber(metrics.worstTrade),
        candidate.objectives[0],
        candidate.objectives[1],
        candidate.violation,
        csvEscape(rejections),
        metrics.signature,
        csvEscape(metrics.years.map((year) => `${year.year}:${Math.round(year.netProfit * 100) / 100}`).join(';'))
      ].join(',')
    );
  }

  return `${lines.join('\n')}\n`;
};

export interface ExperimentContext {
  config: ExperimentConfig;
  manifest: Manifest;
  evaluator: Evaluator;
  codeHash: string;
  outDir: string;
  log: (line: string) => void;
}

const runTraining = async (
  context: ExperimentContext,
  series: Series,
  dataset: DatasetArrays,
  runId: string,
  kind: TrainingRunRecord['kind'],
  window: Window,
  search: SearchConfig,
  seedLabels: (string | number)[],
  writeArchive: boolean
): Promise<{ record: TrainingRunRecord; cache?: CandidateCache; resumed: boolean }> => {
  const { config, evaluator } = context;
  const info = windowInfo(series, window);
  const runDir = path.join(context.outDir, series.symbol, runId);
  const recordFile = path.join(runDir, 'run.json');
  const configHash = stableHash({
    runId,
    dataSha256: series.dataSha256,
    visibleEnd: series.visibleEnd,
    window: info,
    space: config.space,
    search,
    fitness: config.fitness,
    selection: config.selection,
    seedLabels,
    codeHash: context.codeHash
  });

  if (await fs.pathExists(recordFile)) {
    const existing = (await fs.readJson(recordFile)) as TrainingRunRecord;

    if (existing.configHash === configHash) {
      context.log(`${series.symbol} ${runId}: resumed from checkpoint`);

      return { record: existing, resumed: true };
    }
  }

  const started = performance.now();
  const cache = new CandidateCache(evaluator, dataset.id, info, config.space, config.fitness, info.years);
  const reference: [number, number] = [0, config.fitness.drawdownLimit];
  const searched = await runSearch({
    space: config.space,
    search,
    fitness: config.fitness,
    cache,
    seedLabels,
    hypervolumeReference: reference
  });
  const explored = [...cache.entries.values()].filter((candidate) => candidate.origin.stage === search.sampler);
  const selection = await selectShortlist(cache, config.space, config.fitness, info.years, config.selection);
  const [baselineMetrics] = await evaluator.evaluate(dataset.id, info, [originalParams]);
  const searchedCandidates = [...cache.entries.values()].filter(
    (candidate) => candidate.origin.stage !== 'neighborhood'
  );
  const gatedNets = searchedCandidates
    .filter((candidate) => {
      const gates = baseGates(candidate, config.fitness, info.years, config.selection);

      return gates.drawdown && gates.trades && gates.profitable && gates.yearConsistency;
    })
    .map((candidate) => candidate.metrics.netProfit);

  const shortlist: ShortlistCandidate[] = selection.shortlist.map((entry) => {
    const candidate = cache.entries.get(entry.id)!;

    return {
      rank: entry.rank,
      id: entry.id,
      params: candidate.params,
      origin: candidate.origin,
      metrics: candidate.metrics,
      objectives: candidate.objectives,
      violation: candidate.violation,
      meritRank: entry.meritRank,
      merit: entry.merit,
      paretoRank: entry.paretoRank,
      neighbourhood: entry.neighbourhood,
      positiveYearShare: entry.positiveYearShare,
      inclusion: entry.inclusion,
      behaviouralDuplicates: entry.behaviouralDuplicates,
      reason: entry.reason
    };
  });

  const record: TrainingRunRecord = {
    runId,
    symbol: series.symbol,
    kind,
    configHash,
    window: info,
    search,
    sampler: searched.sampler,
    gaRuns: searched.gaRuns,
    seededPopulation: searched.seeded,
    simulations: cache.simulations,
    archiveSize: searchedCandidates.length,
    archiveHypervolume: hypervolume2d(searchedCandidates, reference),
    explorationHypervolume: hypervolume2d(explored, reference),
    bestGatedNet: gatedNets.length ? Math.max(...gatedNets) : undefined,
    selection: { ...selection, ranked: selection.ranked.slice(0, 50) },
    shortlist,
    baseline: {
      params: { ...originalParams },
      metrics: baselineMetrics!,
      violation: violationOf(baselineMetrics!, config.fitness, info.years)
    },
    seconds: (performance.now() - started) / 1000
  };

  await fs.ensureDir(runDir);

  if (writeArchive) {
    await fs.writeFile(
      path.join(runDir, 'evaluations.csv.gz'),
      await gzip(evaluationsCsv(config.space, cache, config.fitness, info.years, config.selection), { level: 9 })
    );
  }

  context.log(
    `${series.symbol} ${runId}: ${cache.simulations} simulations, ${selection.gated} gated, shortlist ${shortlist.length}, rank 1 ${shortlist[0] ? describeParams(config.space, shortlist[0].params) : 'none'} (${record.seconds.toFixed(1)} s)`
  );

  return { record, cache, resumed: false };
};

const writeRecord = async (context: ExperimentContext, record: TrainingRunRecord) => {
  const file = path.join(context.outDir, record.symbol, record.runId, 'run.json');
  // Elapsed time is kept in a separate file so run.json is identical across reruns.
  await fs.writeFile(file, `${JSON.stringify({ ...record, seconds: 0 }, null, 1)}\n`);
  await fs.writeFile(path.join(path.dirname(file), 'timing.json'), `${JSON.stringify({ seconds: record.seconds })}\n`);
};

const writeDetail = async (
  dir: string,
  name: string,
  dataset: DatasetArrays,
  highs: ReferenceHighCache,
  params: AllInParams,
  window: EvalWindow,
  withEquity: boolean
) => {
  const result = simulateWindow(dataset, highs, params, window, { detail: true });

  await fs.ensureDir(dir);
  await fs.writeFile(path.join(dir, `${name}-trades.csv`), tradesCsv(result));

  if (withEquity) {
    await fs.writeFile(path.join(dir, `${name}-equity.csv`), equityCsv(result));
  }

  return summarize(result);
};

// The non-dominated feasible candidates of the final development run (net P&L versus drawdown).
const writeParetoArchive = async (runDir: string, cache: CandidateCache) => {
  const searched = [...cache.entries.values()].filter((candidate) => candidate.origin.stage !== 'neighborhood');
  const ranks = paretoRanks2d(searched);
  const front = searched
    .filter((candidate) => ranks.get(candidate.id) === 0)
    .sort((a, b) => a.objectives[1]! - b.objectives[1]! || (a.id < b.id ? -1 : 1));
  const rows = front.map((candidate) => ({
    id: candidate.id,
    params: candidate.params,
    origin: candidate.origin,
    netProfit: candidate.metrics.netProfit,
    maximumDrawdown: candidate.metrics.maximumDrawdown,
    entries: candidate.metrics.entries,
    interest: candidate.metrics.interest,
    winRate: candidate.metrics.winRate,
    objectives: candidate.objectives
  }));

  await fs.writeFile(path.join(runDir, 'pareto-front.json'), `${JSON.stringify(rows, null, 1)}\n`);
};

export const runSymbol = async (context: ExperimentContext, symbol: string): Promise<SymbolRecord> => {
  const { config, evaluator } = context;
  const series = await researchSeries(symbol, context.manifest, config.protocol.researchEnd);

  assertResearchView(series, config.protocol.researchEnd);

  const dataset = datasetOf(series);
  const highs = new ReferenceHighCache(series.high);
  const symbolRecord: SymbolRecord = {
    symbol,
    dataSha256: series.dataSha256,
    researchSessions: series.dates.length,
    foldEligibility: {},
    runs: []
  };

  evaluator.register(dataset);

  try {
    if (config.runFolds) {
      for (const fold of config.protocol.folds) {
        const trainInfo = windowInfo(series, fold.train);
        const validationInfo = windowInfo(series, fold.validation);
        const trainEligibility = windowEligibility(series, trainInfo, config.protocol);
        const validationEligibility = windowEligibility(series, validationInfo, config.protocol);
        const eligible = trainEligibility.eligible && validationEligibility.eligible;

        symbolRecord.foldEligibility[fold.id] = {
          eligible,
          reason: eligible
            ? 'eligible'
            : `train: ${trainEligibility.reason}; validation: ${validationEligibility.reason}`
        };

        if (!eligible) {
          context.log(`${symbol} ${fold.id}: skipped (${symbolRecord.foldEligibility[fold.id]!.reason})`);
          continue;
        }

        const { record, resumed } = await runTraining(
          context,
          series,
          dataset,
          fold.id,
          'fold',
          fold.train,
          config.search,
          [config.seed, symbol, fold.id],
          true
        );

        if (!resumed || !record.validation) {
          // Parameters are fixed here, from the training run alone, before the validation year is simulated.
          const frozen = record.shortlist.map((entry) => ({ rank: entry.rank, id: entry.id, params: entry.params }));
          const validationMetrics = await evaluator.evaluate(dataset.id, validationInfo, [
            originalParams,
            ...frozen.map((entry) => entry.params)
          ]);
          const runDir = path.join(context.outDir, symbol, fold.id);

          record.validation = {
            window: validationInfo,
            policyAbstained: frozen.length === 0,
            rank1: frozen[0]
              ? { id: frozen[0].id, params: frozen[0].params, metrics: validationMetrics[1]! }
              : undefined,
            shortlist: frozen.map((entry, index) => ({
              rank: entry.rank,
              id: entry.id,
              metrics: validationMetrics[index + 1]!
            })),
            original: validationMetrics[0]!
          };

          if (frozen[0]) {
            await writeDetail(runDir, 'validation-rank1', dataset, highs, frozen[0].params, validationInfo, true);
            await writeDetail(runDir, 'training-rank1', dataset, highs, frozen[0].params, trainInfo, false);
          }

          await writeDetail(runDir, 'validation-original', dataset, highs, originalParams, validationInfo, false);
          await writeRecord(context, record);
        }

        symbolRecord.runs.push(fold.id);
      }
    }

    const finalInfo = windowInfo(series, config.protocol.final.train);
    const finalEligibility = windowEligibility(series, finalInfo, config.protocol);

    symbolRecord.foldEligibility[config.protocol.final.id] = { ...finalEligibility };

    if (finalEligibility.eligible) {
      const finalId = config.protocol.final.id;
      const { record, cache, resumed } = await runTraining(
        context,
        series,
        dataset,
        finalId,
        'final',
        config.protocol.final.train,
        config.search,
        [config.seed, symbol, finalId],
        true
      );

      if (!resumed) {
        const runDir = path.join(context.outDir, symbol, finalId);

        for (const entry of record.shortlist) {
          await writeDetail(
            runDir,
            `rank${entry.rank}-${entry.id}`,
            dataset,
            highs,
            entry.params,
            finalInfo,
            entry.rank === 1
          );
        }

        await writeDetail(runDir, 'original', dataset, highs, originalParams, finalInfo, true);
        await writeParetoArchive(runDir, cache!);
        await writeRecord(context, record);
      }

      symbolRecord.runs.push(finalId);

      for (let seedIndex = 0; seedIndex < config.controlSeeds; seedIndex++) {
        for (const sampler of ['sobol', 'random'] as const) {
          const runId = `control-${sampler}-${seedIndex}`;
          const controlSearch: SearchConfig = { ...config.search, sampler, earlyStopPatience: Number.MAX_SAFE_INTEGER };
          const control = await runTraining(
            context,
            series,
            dataset,
            runId,
            'control',
            config.protocol.final.train,
            controlSearch,
            [config.seed, symbol, 'control', seedIndex],
            false
          );

          if (!control.resumed) {
            await writeRecord(context, control.record);
          }

          symbolRecord.runs.push(runId);
        }
      }
    }
  } finally {
    evaluator.release(dataset.id);
  }

  await fs.writeFile(path.join(context.outDir, symbol, 'symbol.json'), `${JSON.stringify(symbolRecord, null, 1)}\n`);

  return symbolRecord;
};

// Runs symbols with bounded concurrency; each symbol's results are independent of the others and of
// scheduling.
export const runExperiment = async (context: ExperimentContext) => {
  const queue = [...context.config.symbols];
  const records: SymbolRecord[] = [];
  const failures: { symbol: string; error: string }[] = [];

  const workerLoop = async () => {
    while (queue.length > 0) {
      const symbol = queue.shift()!;

      try {
        records.push(await runSymbol(context, symbol));
      } catch (error) {
        failures.push({ symbol, error: (error as Error)?.stack ?? String(error) });
        context.log(`${symbol}: FAILED ${(error as Error)?.message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, context.config.tickerConcurrency) }, workerLoop));

  records.sort((a, b) => context.config.symbols.indexOf(a.symbol) - context.config.symbols.indexOf(b.symbol));

  return { records, failures };
};
