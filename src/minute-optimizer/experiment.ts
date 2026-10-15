// Walk-forward orchestration for the VGT minute optimizer: the four expanding folds, the final development
// run, the Sobol-versus-random control and independent-seed replicates, with checkpoints. Everything here
// reads only the research view of the data (sessions up to 2023-12-31).
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import zlib from 'node:zlib';
import type { MarketSession } from '#types';
import { type MinuteParams, incumbentParams } from '../app/allIn-minute-optimizable.ts';
import { hypervolume2d } from '../optimizer/nsga2.ts';
import { type ParameterSpace, candidateId, describeParams, gridSize, paramsToGenome } from '../optimizer/params.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { type SearchConfig, defaultSearch } from '../optimizer/search.ts';
import {
  type MinuteDataset,
  assertResearchView,
  executionLabels,
  firstIndexOnOrAfter,
  lastIndexOnOrBefore
} from './data.ts';
import {
  type EngineResult,
  type EngineSettings,
  type EvalWindow,
  ReferenceHighCache,
  defaultSettings,
  simulate
} from './engine.ts';
import type { MinuteMetrics } from './evaluate.ts';
import { type MinuteFitnessConfig, defaultMinuteFitness, minimumTrades } from './fitness.ts';
import { controls, minuteParameterSpace } from './params.ts';
import type { MinuteEvaluator } from './pool.ts';
import { type DateWindow, type MinuteProtocol, defaultMinuteProtocol } from './protocol.ts';
import { comparableFromEngine, comparableFromReference, compareComparables, runReference } from './reference.ts';
import { type MinuteCandidate, MinuteCandidateCache, type Origin, runMinuteSearch } from './search.ts';
import {
  type MinuteSelectionConfig,
  type RankedCandidate,
  type SelectionResult,
  type ShortlistEntry,
  defaultMinuteSelection
} from './selection.ts';
import { selectShortlist } from './selection.ts';

export const researchDir = 'research/vgt-minute-optimizer';
export const resultsRoot = (id: string) => path.join(researchDir, 'results', id);

export interface MinuteExperimentConfig {
  id: string;
  seed: number;
  space: ParameterSpace;
  search: SearchConfig;
  fitness: MinuteFitnessConfig;
  selection: MinuteSelectionConfig;
  settings: EngineSettings;
  protocol: MinuteProtocol;
  folds: string[]; // fold IDs to run
  final: boolean;
  controlSeeds: number; // Sobol and random seeds each for the control on the final window
  replicateSeeds: number; // extra independent master seeds for the final run (diagnostic)
}

export const defaultExperiment = (overrides: Partial<MinuteExperimentConfig> = {}): MinuteExperimentConfig => ({
  id: 'main',
  seed: 20261016,
  space: minuteParameterSpace,
  search: defaultSearch,
  fitness: defaultMinuteFitness,
  selection: defaultMinuteSelection,
  settings: defaultSettings,
  protocol: defaultMinuteProtocol,
  folds: defaultMinuteProtocol.folds.map((fold) => fold.id),
  final: true,
  controlSeeds: 3,
  replicateSeeds: 2,
  ...overrides
});

export interface WindowInfo extends EvalWindow {
  start: string; // requested
  end: string;
  firstDate: string; // actual sessions
  lastDate: string;
  sessions: number;
  years: number; // calendar span of the sessions, in years of 365.25 days
}

export const windowInfo = (dataset: MinuteDataset, window: DateWindow): WindowInfo => {
  const startIndex = firstIndexOnOrAfter(dataset, window.start);
  const endIndex = lastIndexOnOrBefore(dataset, window.end);

  if (endIndex < startIndex) {
    throw new Error(`No sessions in ${window.start}..${window.end}`);
  }

  return {
    historyStart: 0,
    startIndex,
    endIndex,
    start: window.start,
    end: window.end,
    firstDate: dataset.dates[startIndex]!,
    lastDate: dataset.dates[endIndex]!,
    sessions: endIndex - startIndex + 1,
    years: (dataset.sTime[endIndex]! - dataset.sTime[startIndex]! + 86400) / (365.25 * 86400)
  };
};

const evalWindow = (info: WindowInfo): EvalWindow => ({
  historyStart: info.historyStart,
  startIndex: info.startIndex,
  endIndex: info.endIndex
});

export interface CandidateRecord {
  id: string;
  params: MinuteParams;
  description: string;
  origin: Origin;
  objectives: number[];
  violation: number;
  metrics: MinuteMetrics;
}

export interface ShortlistRecord extends CandidateRecord {
  selection: ShortlistEntry;
  boundFlags: string[];
}

export interface TrainingRecord {
  runId: string;
  kind: 'fold' | 'final' | 'control' | 'replicate';
  configHash: string;
  seedLabels: (string | number)[];
  sampler: Awaited<ReturnType<typeof runMinuteSearch>>['sampler'];
  gaRuns: Awaited<ReturnType<typeof runMinuteSearch>>['gaRuns'];
  window: WindowInfo;
  minimumTrades: number;
  simulations: number; // distinct vectors simulated, including neighbourhood probes
  searchSimulations: number; // distinct vectors from Sobol/random and the GA
  archiveSize: number;
  hypervolume: { exploration: number; archive: number };
  selection: Omit<SelectionResult, 'ranked' | 'shortlist'> & { rankedTop: RankedCandidate[] };
  shortlist: ShortlistRecord[];
  controls: { id: string; label: string; params: MinuteParams; metrics: MinuteMetrics }[];
}

export interface ValidationEntry {
  role: 'rank-1' | 'shortlist' | 'control';
  rank?: number;
  id: string;
  params: MinuteParams;
  metrics: MinuteMetrics;
  nextOpen: MinuteMetrics;
}

export interface ValidationRecord {
  foldId: string;
  configHash: string;
  trainRunId: string;
  window: WindowInfo;
  entries: ValidationEntry[];
}

export const stableHash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Bound flags: a parameter within 2% of its grid span of either end.
export const boundFlags = (space: ParameterSpace, params: MinuteParams) =>
  space.specs.flatMap((spec) => {
    const value = params[spec.key];
    const span = spec.max - spec.min;
    const near = Math.max(1, Math.round(span * 0.02));

    if (value - spec.min <= near) {
      return [`${spec.key} at/near lower bound (${value} vs ${spec.min})`];
    }

    if (spec.max - value <= near) {
      return [`${spec.key} at/near upper bound (${value} vs ${spec.max})`];
    }

    return [];
  });

const toRecord = (space: ParameterSpace, candidate: MinuteCandidate): CandidateRecord => ({
  id: candidate.id,
  params: candidate.params,
  description: describeParams(space, candidate.params),
  origin: candidate.origin,
  objectives: candidate.objectives,
  violation: candidate.violation,
  metrics: candidate.metrics
});

const evaluationsCsv = (space: ParameterSpace, candidates: MinuteCandidate[], levels: number[]) => {
  const header = [
    'id',
    'stage',
    'origin',
    ...space.specs.map((spec) => spec.key),
    'violation',
    'entries',
    'exposure',
    'interest',
    'net_0bp',
    ...levels.map((bps) => `net_${bps}bp`),
    'daily_dd_0bp',
    'minute_dd_0bp',
    ...levels.map((bps) => `minute_dd_${bps}bp`),
    'turnover',
    'restrictions',
    'signature'
  ];
  const lines = [header.join(',')];

  for (const candidate of candidates) {
    const metrics = candidate.metrics;
    const origin = candidate.origin;

    lines.push(
      [
        candidate.id,
        origin.stage,
        'index' in origin
          ? origin.index
          : 'run' in origin
            ? `${origin.run}:${origin.generation}`
            : 'of' in origin
              ? origin.of
              : '',
        ...space.specs.map((spec) => candidate.params[spec.key]),
        candidate.violation,
        metrics.entries,
        metrics.exposure,
        metrics.interest,
        metrics.netProfit,
        ...metrics.levels.slice(1).map((level) => level.netProfit),
        metrics.dailyDrawdown,
        metrics.minuteDrawdown,
        ...metrics.levels.slice(1).map((level) => level.minuteDrawdown),
        metrics.turnover,
        metrics.restrictions,
        metrics.signature
      ].join(',')
    );
  }

  return zlib.gzipSync(`${lines.join('\n')}\n`, { level: 9, mtime: 0 } as zlib.ZlibOptions);
};

export const engineTradesCsv = (result: EngineResult, dates: string[]) => {
  const lines = [
    'entry_date,exit_date,reason,decision_price,reference_high,entry_price,entry_execution,exit_price,exit_execution,exit_stop_price,maximum_hold_due,shares,interest,profit,hold_days'
  ];

  for (const trade of result.trades) {
    lines.push(
      [
        dates[trade.entryIndex],
        trade.exitIndex < 0 ? '' : dates[trade.exitIndex],
        trade.reason,
        trade.decisionPrice,
        trade.referenceHigh,
        trade.entryPrice,
        executionLabels[trade.entryExecution],
        trade.exitPrice,
        executionLabels[trade.exitExecution],
        trade.exitStopPrice,
        trade.maximumHoldDue,
        trade.shares,
        trade.interest,
        trade.profit,
        trade.holdDays
      ].join(',')
    );
  }

  return `${lines.join('\n')}\n`;
};

export interface ExperimentContext {
  config: MinuteExperimentConfig;
  dataset: MinuteDataset;
  sessions: MarketSession[]; // research sessions, for the literal reference replays
  evaluator: MinuteEvaluator;
  codeHash: string;
  log: (line: string) => void;
}

const runConfigHash = (context: ExperimentContext, extra: Record<string, unknown>) =>
  stableHash({
    dataHash: context.dataset.dataHash,
    datasetId: context.dataset.id,
    space: context.config.space,
    fitness: context.config.fitness,
    selection: context.config.selection,
    settings: context.config.settings,
    codeHash: context.codeHash,
    ...extra
  });

const readJson = async <T>(file: string): Promise<T | undefined> =>
  (await fs.pathExists(file)) ? ((await fs.readJson(file)) as T) : undefined;

const writeJson = async (file: string, value: unknown) => {
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, `${JSON.stringify(value, null, 1)}\n`);
};

// One training run: search, selection, controls on the training window. Resumes from run.json when the
// configuration hash matches.
export const runTraining = async (
  context: ExperimentContext,
  runId: string,
  kind: TrainingRecord['kind'],
  window: DateWindow,
  search: SearchConfig,
  seedLabels: (string | number)[]
): Promise<TrainingRecord> => {
  const { config, dataset, evaluator, log } = context;
  const dir = path.join(resultsRoot(config.id), runId);
  const info = windowInfo(dataset, window);
  const configHash = runConfigHash(context, { window: info, search, seedLabels, kind });
  const existing = await readJson<TrainingRecord>(path.join(dir, 'run.json'));

  if (existing?.configHash === configHash) {
    log(`${runId}: complete (resumed from run.json)`);

    return existing;
  }

  assertResearchView(dataset, config.protocol.researchEnd);

  const started = Date.now();
  const cache = new MinuteCandidateCache(
    evaluator,
    dataset.id,
    evalWindow(info),
    config.settings,
    config.space,
    config.fitness,
    info.years
  );
  const hypervolumeReference: [number, number] = [0, config.fitness.drawdownLimit];
  const searchOutput = await runMinuteSearch({ space: config.space, search, cache, seedLabels, hypervolumeReference });
  const searchSimulations = cache.simulations;
  const archive = [...cache.entries.values()];
  const exploration = archive.filter((candidate) => candidate.origin.stage === search.sampler);
  const hypervolume = {
    exploration: hypervolume2d(exploration, hypervolumeReference),
    archive: hypervolume2d(archive, hypervolumeReference)
  };

  log(
    `${runId}: ${searchSimulations} search simulations (${searchOutput.gaRuns.map((run) => `GA ${run.run}: ${run.generations} gens, ${run.stopReason}`).join('; ')}), ${((Date.now() - started) / 1000).toFixed(1)} s`
  );

  const selection = await selectShortlist(cache, config.space, config.fitness, info.years, config.selection);
  const shortlist: ShortlistRecord[] = selection.shortlist.map((entry) => {
    const candidate = cache.entries.get(entry.id)!;

    return {
      ...toRecord(config.space, candidate),
      selection: entry,
      boundFlags: boundFlags(config.space, candidate.params)
    };
  });
  const controlMetrics = await evaluator.evaluate(
    dataset.id,
    evalWindow(info),
    config.settings,
    controls.map((control) => control.params)
  );
  const record: TrainingRecord = {
    runId,
    kind,
    configHash,
    seedLabels,
    sampler: searchOutput.sampler,
    gaRuns: searchOutput.gaRuns,
    window: info,
    minimumTrades: minimumTrades(config.fitness, info.years),
    simulations: cache.simulations,
    searchSimulations,
    archiveSize: archive.length,
    hypervolume,
    selection: {
      config: selection.config,
      evaluated: selection.evaluated,
      gated: selection.gated,
      pool: selection.pool,
      passedAll: selection.passedAll,
      rejectionCounts: selection.rejectionCounts,
      notes: selection.notes,
      rankedTop: selection.ranked.slice(0, 50)
    },
    shortlist,
    controls: controls.map((control, index) => ({
      id: control.id,
      label: control.label,
      params: { ...control.params },
      metrics: controlMetrics[index]!
    }))
  };

  await fs.ensureDir(dir);
  await fs.writeFile(
    path.join(dir, 'evaluations.csv.gz'),
    evaluationsCsv(
      config.space,
      [...cache.entries.values()],
      config.settings.costBps.map((bps) => bps)
    )
  );
  await writeJson(path.join(dir, 'run.json'), record);
  await writeJson(path.join(dir, 'timing.json'), {
    seconds: (Date.now() - started) / 1000,
    evaluator: evaluator.description
  });

  const rankOne = shortlist[0];

  log(
    `${runId}: ${selection.gated} gated, ${selection.passedAll} ranked, shortlist ${shortlist.length}; rank 1 ${rankOne ? `${rankOne.description} merit $${Math.round(rankOne.selection.merit)}` : 'none'} (${((Date.now() - started) / 1000).toFixed(1)} s total, ${cache.simulations} simulations)`
  );

  return record;
};

// The fold's selected parameters on its validation year, plus the controls, with the default and the
// next-open stop fill. Run only after the training record exists.
export const runValidation = async (
  context: ExperimentContext,
  foldId: string,
  training: TrainingRecord,
  window: DateWindow
): Promise<ValidationRecord> => {
  const { config, dataset, evaluator } = context;
  const dir = path.join(resultsRoot(config.id), foldId);
  const info = windowInfo(dataset, window);

  if (info.startIndex <= training.window.endIndex) {
    throw new Error(`${foldId}: validation overlaps training`);
  }

  const configHash = stableHash({ trainingHash: training.configHash, info, settings: config.settings });
  const existing = await readJson<ValidationRecord>(path.join(dir, 'validation.json'));

  if (existing?.configHash === configHash) {
    return existing;
  }

  const members = [
    ...training.shortlist.map((entry) => ({
      role: (entry.selection.rank === 1 ? 'rank-1' : 'shortlist') as ValidationEntry['role'],
      rank: entry.selection.rank,
      id: entry.id,
      params: entry.params
    })),
    ...controls.map((control) => ({
      role: 'control' as const,
      rank: undefined,
      id: control.id,
      params: { ...control.params }
    }))
  ];
  const params = members.map((member) => member.params);
  const stopMetrics = await evaluator.evaluate(dataset.id, evalWindow(info), config.settings, params);
  const nextOpenMetrics = await evaluator.evaluate(
    dataset.id,
    evalWindow(info),
    { ...config.settings, stopFill: 'next-open' },
    params
  );
  const record: ValidationRecord = {
    foldId,
    configHash,
    trainRunId: training.runId,
    window: info,
    entries: members.map((member, index) => ({
      ...member,
      metrics: stopMetrics[index]!,
      nextOpen: nextOpenMetrics[index]!
    }))
  };

  await writeJson(path.join(dir, 'validation.json'), record);

  // Trade logs for the fold's rank 1 and the controls on the validation year.
  const highs = new ReferenceHighCache(dataset.sHigh);

  for (const member of members.filter((entry) => entry.role !== 'shortlist')) {
    const result = simulate(
      dataset,
      highs.get(member.params.lookbackSessions, info.historyStart),
      member.params,
      evalWindow(info),
      config.settings,
      true
    );

    await fs.writeFile(
      path.join(dir, `validation-trades-${member.role === 'rank-1' ? 'rank-1' : member.id}.csv`),
      engineTradesCsv(result, dataset.dates)
    );
  }

  return record;
};

// Detailed development-window replays of the final shortlist and the controls with the literal working
// copy (src/app/allIn-minute-optimizable.ts): exact minute-sampled drawdowns, full trade, daily-equity,
// state and episode files, and the stop-fill and cost sensitivities.
export const replayShortlist = async (context: ExperimentContext, training: TrainingRecord) => {
  const { config, sessions } = context;
  const dir = path.join(resultsRoot(config.id), training.runId, 'replays');
  const members = [
    ...training.shortlist.map((entry) => ({
      key: `rank-${String(entry.selection.rank).padStart(2, '0')}-${entry.id}`,
      id: entry.id,
      params: entry.params
    })),
    ...controls.map((control) => ({ key: `control-${control.id}`, id: control.id, params: { ...control.params } }))
  ];
  const replays = [];

  for (const member of members) {
    const variants = [];

    for (const stopFill of ['stop', 'next-open'] as const) {
      const outDir = path.join(dir, member.key, stopFill);
      const result = await runReference(sessions, {
        params: member.params,
        startDate: training.window.start,
        endDate: training.window.end,
        warmup: true,
        stopFill,
        costBps: [...config.settings.costBps],
        outDir
      });

      // The fast engine must agree with the literal copy on this exact replay.
      const info = training.window;
      const engine = simulate(
        context.dataset,
        new ReferenceHighCache(context.dataset.sHigh).get(member.params.lookbackSessions, info.historyStart),
        member.params,
        evalWindow(info),
        { ...config.settings, stopFill },
        true
      );
      const differences = compareComparables(
        comparableFromReference(result, [...config.settings.costBps]),
        comparableFromEngine(engine, context.dataset.dates, info.startIndex)
      );

      if (differences.length) {
        throw new Error(
          `Engine and working copy disagree on ${member.key} (${stopFill}): ${differences.slice(0, 5).join('; ')}`
        );
      }

      variants.push({
        stopFill,
        engineMatchesReference: true,
        summary: result.summary,
        costResults: result.costResults,
        yearMarks: result.yearMarks,
        exposureSessions: result.exposureSessions
      });
    }

    replays.push({ key: member.key, id: member.id, params: member.params, variants });
  }

  await writeJson(path.join(dir, 'replays.json'), replays);

  return replays;
};

export const runExperiment = async (context: ExperimentContext) => {
  const { config, log } = context;
  const root = resultsRoot(config.id);
  const records: { folds: { training: TrainingRecord; validation: ValidationRecord }[]; final?: TrainingRecord } = {
    folds: []
  };

  await writeJson(path.join(root, 'experiment.json'), {
    ...config,
    space: config.space,
    codeHash: context.codeHash,
    dataset: {
      id: context.dataset.id,
      dataHash: context.dataset.dataHash,
      firstDate: context.dataset.firstDate,
      lastDate: context.dataset.lastDate,
      sessions: context.dataset.sessionCount,
      minutes: context.dataset.barCount
    }
  });

  for (const fold of config.protocol.folds.filter((entry) => config.folds.includes(entry.id))) {
    const training = await runTraining(context, fold.id, 'fold', fold.train, config.search, [
      config.seed,
      'VGT',
      fold.id
    ]);
    const validation = await runValidation(context, fold.id, training, fold.validation);
    const rankOne = validation.entries.find((entry) => entry.role === 'rank-1');
    const incumbent = validation.entries.find((entry) => entry.id === 'incumbent');

    log(
      `${fold.id} validation ${validation.window.firstDate}..${validation.window.lastDate}: rank 1 $${Math.round(rankOne?.metrics.levels[1]?.netProfit ?? NaN)} vs incumbent $${Math.round(incumbent?.metrics.levels[1]?.netProfit ?? NaN)} at ${config.settings.costBps[0]} bp`
    );
    records.folds.push({ training, validation });
  }

  if (config.final) {
    const final = config.protocol.final;

    records.final = await runTraining(context, final.id, 'final', final.train, config.search, [
      config.seed,
      'VGT',
      final.id
    ]);
    await replayShortlist(context, records.final);

    // Independent master seeds (diagnostic: does the same procedure find the same rank 1?).
    for (let replicate = 1; replicate <= config.replicateSeeds; replicate++) {
      await runTraining(context, `replicate-${replicate}`, 'replicate', final.train, config.search, [
        config.seed,
        'VGT',
        final.id,
        'replicate',
        replicate
      ]);
    }

    // Sobol versus random seeding on the final window, same budget, early stopping off for both.
    for (let seed = 0; seed < config.controlSeeds; seed++) {
      for (const sampler of ['sobol', 'random'] as const) {
        await runTraining(
          context,
          `control-${sampler}-${seed}`,
          'control',
          final.train,
          { ...config.search, sampler, earlyStopPatience: 1e9 },
          [config.seed, 'VGT', final.id, 'control', seed]
        );
      }
    }
  }

  return records;
};

// Every grid vector's ID, for checks.
export const incumbentId = () => candidateId(minuteParameterSpace, incumbentParams);
export const seedOf = (...labels: (string | number)[]) => deriveSeed(...labels);
export const gridPoints = () => minuteParameterSpace.specs.map((spec) => gridSize(spec));
export const incumbentOnGrid = () => paramsToGenome(minuteParameterSpace, incumbentParams);
