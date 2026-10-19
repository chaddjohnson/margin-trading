// Orchestration of the study (PROTOCOL.md sections 6–8): benchmark, search, selection, walk-forward
// validation, random control, freeze and the development-period robustness pass. Everything here runs on the
// research view (sessions up to 2023-12-29); the holdout is holdout.ts.
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import { paretoRanks2d } from '../optimizer/nsga2.ts';
import { runAllInComparator } from './allInComparator.ts';
import { sourceFiles, sourceHashes } from './copies.ts';
import {
  type FitKey,
  type Research,
  fitOf,
  loadResearch,
  minEntries,
  protocol,
  readJson,
  resultsRoot,
  trainingSpec,
  validationSpec,
  writeJson,
  yearSegments
} from './context.ts';
import { ReferenceHighCache, lastIndexOnOrBefore } from './data.ts';
import type { StopFill } from './engine.ts';
import { type EvalSpec, type Metrics, engineVersion, evaluateCandidate } from './evaluate.ts';
import {
  type Family,
  type FamilyKey,
  type IntParams,
  allParamKeys,
  candidateId,
  defaultParams,
  describeParams,
  families,
  familyKeys,
  familySpecs,
  formatValue
} from './families.ts';
import { type Evaluator, LocalEvaluator, WorkerPool, defaultWorkerCount } from './pool.ts';
import {
  type CandidateRecord,
  type StageContext,
  StageArchive,
  defaultSearch,
  hypervolume2d,
  runRandomControl,
  runSearchStage
} from './search.ts';
import { type Pick, buildPool, groupPhenotypes, jaccard, pickTopTen, probePool, selectionConfig } from './selection.ts';

export interface StudyOptions {
  workers?: number;
  log: (message: string) => void;
}

export const familyList = familyKeys.map((key) => families[key]);
export const fitsRoot = path.join(resultsRoot, 'fits');
export const stageDir = (fit: FitKey, familyKey: FamilyKey) => path.join(fitsRoot, fit, familyKey);
export const freezeFile = path.join(fitsRoot, 'final', 'freeze.json');

const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

const openEvaluator = (research: Research, workers?: number): Evaluator => {
  const evaluator = workers === 0 ? new LocalEvaluator() : new WorkerPool({ size: workers ?? defaultWorkerCount() });

  evaluator.register(research.ds);

  return evaluator;
};

const csvCell = (value: unknown) => {
  const text = value === undefined || value === null ? '' : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (header: string[], rows: unknown[][]) =>
  `${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`;

export const paramColumns = (family: Family, params: IntParams) =>
  allParamKeys.map((key) => (family.paramKeys.includes(key) ? formatValue(key, params[key]) : 'N/A'));

const stageContext = (
  evaluator: Evaluator,
  research: Research,
  fit: FitKey,
  family: Family,
  log: StudyOptions['log']
): StageContext => ({
  evaluator,
  datasetId: research.ds.id,
  family,
  spec: trainingSpec(research.ds, fit),
  minEntries: minEntries(research.ds, fit),
  seedLabel: fit,
  dir: stageDir(fit, family.key),
  log
});

// ---------------------------------------------------------------------------------------------------------
// Benchmark

const runBenchmark = async (research: Research, options: StudyOptions) => {
  const results: Record<string, unknown>[] = [];

  for (const workers of [0, options.workers ?? defaultWorkerCount()]) {
    const evaluator = openEvaluator(research, workers);
    const family = families.bufferedLoss;
    const spec = trainingSpec(research.ds, 'final');
    const specs = familySpecs(family);
    const count = workers === 0 ? 300 : 2048;
    const candidates: IntParams[] = Array.from({ length: count }, (_value, index) =>
      Object.fromEntries(
        specs.map((spec, dimension) => [
          spec.key,
          spec.min + ((index * 7919 + dimension * 104729) % (spec.max - spec.min + 1))
        ])
      )
    );
    const started = performance.now();

    await evaluator.evaluate(research.ds.id, family.key, spec, candidates);

    const elapsed = performance.now() - started;

    await evaluator.close();
    results.push({
      evaluator: evaluator.description,
      candidates: count,
      ms: elapsed,
      perSecond: (count / elapsed) * 1000
    });
    options.log(`${evaluator.description}: ${count} evaluations in ${(elapsed / 1000).toFixed(1)} s`);
  }

  const parallel = results.at(-1)!.perSecond as number;
  const perFit = 4096 + 2 + 2 * 60 * 128;
  const nominal = perFit * 4 * protocol.fits.length + perFit * 4 + 4 * protocol.fits.length * 60 * 54;
  const report = {
    generatedAt: new Date().toISOString(),
    results,
    nominalEvaluations: nominal,
    projectedSeconds: nominal / parallel,
    note: 'Nominal = 16 search stages + 4 random controls + up to 60 probed pool members x up to 54 probes per stage (upper bound; duplicates are cached).'
  };

  await writeJson(path.join(resultsRoot, 'benchmark.json'), report);
  options.log(`Projected wall clock for the full study: ${(report.projectedSeconds / 60).toFixed(1)} min`);
};

// ---------------------------------------------------------------------------------------------------------
// Search and selection

const writeCandidates = async (dir: string, family: Family, records: CandidateRecord[]) => {
  const ranks = paretoRanks2d(records);
  const groupSizes = new Map<string, number>();

  for (const record of records) {
    if (record.violation === 0) {
      groupSizes.set(record.metrics.signature, (groupSizes.get(record.metrics.signature) ?? 0) + 1);
    }
  }

  const header = [
    'id',
    'origin',
    ...allParamKeys,
    'feasible',
    'violation',
    'pareto_rank',
    'net',
    'minute_drawdown',
    'daily_drawdown',
    'interest',
    'entries',
    'wins',
    'losses',
    'open_at_end',
    'exposure',
    'average_hold_days',
    'maximum_hold_days',
    'best_trade',
    'worst_trade',
    'signature',
    'clone_group_size'
  ];
  const rows = records.map((record) => [
    record.id,
    record.origin,
    ...paramColumns(family, record.params),
    record.violation === 0,
    record.violation,
    Number.isFinite(ranks.get(record.id)) ? ranks.get(record.id) : '',
    record.metrics.net,
    record.metrics.minuteDrawdown,
    record.metrics.dailyDrawdown,
    record.metrics.interest,
    record.metrics.entries,
    record.metrics.wins,
    record.metrics.losses,
    record.metrics.openAtEnd,
    record.metrics.exposure,
    record.metrics.averageHoldDays,
    record.metrics.maximumHoldDays,
    record.metrics.bestTrade,
    record.metrics.worstTrade,
    record.metrics.signature,
    record.violation === 0 ? groupSizes.get(record.metrics.signature) : ''
  ]);

  await fs.outputFile(path.join(dir, 'candidates.csv.gz'), gzipSync(toCsv(header, rows), { level: 9 }));
};

export const runStage = async (
  evaluator: Evaluator,
  research: Research,
  fit: FitKey,
  family: Family,
  log: StudyOptions['log']
) => {
  const context = stageContext(evaluator, research, fit, family, log);
  const { records, stats, reference } = await runSearchStage(context, defaultSearch);
  const dir = context.dir;
  const stageFile = path.join(dir, 'stage.json');
  const previous = (await fs.pathExists(stageFile)) ? await readJson<{ stats: typeof stats }>(stageFile) : undefined;

  // A replay from the checkpoint keeps the original run's runtime and worker count.
  const finalStats = previous
    ? { ...stats, runtimeMs: previous.stats.runtimeMs, workers: previous.stats.workers, replayedMs: stats.runtimeMs }
    : stats;

  await writeJson(stageFile, {
    fit,
    family: family.key,
    dimensions: family.paramKeys.length,
    paramKeys: family.paramKeys,
    spec: context.spec,
    minEntries: context.minEntries,
    search: defaultSearch,
    engineVersion,
    datasetId: research.ds.id,
    hypervolumeReference: reference,
    feasible: records.filter((record) => record.violation === 0).length,
    stats: finalStats
  });
  await writeCandidates(dir, family, records);

  return { records, stats: finalStats, context };
};

export const runSelectionFor = async (
  evaluator: Evaluator,
  research: Research,
  fit: FitKey,
  family: Family,
  records: CandidateRecord[],
  log: StudyOptions['log']
) => {
  const context = stageContext(evaluator, research, fit, family, log);
  const feasible = records.filter((record) => record.violation === 0);
  const groups = groupPhenotypes(family, feasible);
  // Held sessions (a position open at the close) over the training window, for the behavioural-clone rule.
  const highs = new ReferenceHighCache(research.ds);
  const heldSets = new Map<string, Set<number>>();
  const heldOf = (record: CandidateRecord) => {
    let held = heldSets.get(record.id);

    if (!held) {
      const { detail } = evaluateCandidate(research.ds, highs, family.key, record.params, context.spec, true);

      held = new Set<number>();

      for (const trade of detail!.trades) {
        const last = trade.exitIndex < 0 ? context.spec.endIndex : trade.exitIndex - 1;

        for (let s = trade.entryIndex; s <= last; s++) {
          held.add(s);
        }
      }

      heldSets.set(record.id, held);
    }

    return held;
  };
  const { pool, eligibleGroups, scanned } = buildPool(groups, heldOf);
  const probeArchive = new StageArchive(context, 'probes.jsonl');

  await probeArchive.load();

  const members = await probePool(family, pool, new Map(records.map((record) => [record.id, record])), probeArchive);

  await probeArchive.compress();

  const picks = pickTopTen(members, (id) => heldSets.get(id)!);
  const pairwiseOverlap = picks.map((a) =>
    picks.map((b) => Number(jaccard(heldSets.get(a.id)!, heldSets.get(b.id)!).toFixed(3)))
  );
  const selection = {
    fit,
    family: family.key,
    selectionConfig,
    minEntries: context.minEntries,
    candidates: records.length,
    feasible: feasible.length,
    feasiblePositive: feasible.filter((record) => record.metrics.net > 0).length,
    phenotypes: groups.length,
    eligiblePhenotypes: eligibleGroups,
    poolScanned: scanned,
    probeEvaluations: { attempted: probeArchive.attempted, unique: probeArchive.records.size },
    pairwiseHeldSessionOverlap: pairwiseOverlap,
    pool: members.map((member) => ({
      id: member.group.representative.id,
      params: member.group.representative.params,
      paretoRank: member.paretoRank,
      clusterFollowers: member.followers,
      cloneGroupSize: member.group.size,
      signature: member.group.signature,
      metrics: member.group.representative.metrics,
      robustness: member.robustness,
      probes: member.probeList.map(
        ({ param, steps, id, net, minuteDrawdown, entries, feasible: isFeasible, sameSignature }) => ({
          param,
          steps,
          id,
          net,
          minuteDrawdown,
          entries,
          feasible: isFeasible,
          sameSignature
        })
      )
    })),
    picks
  };

  await writeJson(path.join(context.dir, 'selection.json'), selection);
  log(
    `${fit} ${family.key}: ${feasible.length} feasible, ${groups.length} phenotypes, pool ${members.length}, picks ${picks.length}: ${picks
      .map((pick) => `${pick.category}:${pick.id}`)
      .join(' ')}`
  );

  return selection;
};

// ---------------------------------------------------------------------------------------------------------
// Walk-forward validation

export interface Contender {
  label: string; // 'pick-3', 'default-own', 'default-y30', 'default-y40'
  id: string;
  params: IntParams;
  category?: string;
}

export const baselineContenders = (family: Family): Contender[] => {
  const own = defaultParams(family);
  const contenders: Contender[] = [
    { label: `default (file Y ${family.fileY / 10}%)`, id: candidateId(family, own), params: own }
  ];

  for (const y of [30, 40]) {
    if (y !== family.fileY) {
      const params = defaultParams(family, y);

      contenders.push({ label: `default at Y ${y / 10}%`, id: candidateId(family, params), params });
    }
  }

  return contenders;
};

export const pickContenders = (picks: Pick[]): Contender[] =>
  picks.map((pick) => ({ label: `pick ${pick.rank}`, id: pick.id, params: pick.params, category: pick.category }));

const evaluateContenders = async (
  evaluator: Evaluator,
  research: Research,
  family: Family,
  contenders: Contender[],
  spec: EvalSpec
) => {
  const metrics = await evaluator.evaluate(
    research.ds.id,
    family.key,
    spec,
    contenders.map((contender) => contender.params)
  );

  return contenders.map((contender, index) => ({ ...contender, metrics: metrics[index]! }));
};

const runValidation = async (evaluator: Evaluator, research: Research, fit: FitKey, log: StudyOptions['log']) => {
  const modes = ['continuous', 'flat'] as const;
  const fills: StopFill[] = ['stop', 'next-open'];
  const output: Record<string, unknown> = {
    fit,
    validation: fitOf(fit).validation,
    families: {} as Record<string, unknown>,
    allIn: {}
  };

  for (const family of familyList) {
    const selection = await readJson<{ picks: Pick[] }>(path.join(stageDir(fit, family.key), 'selection.json'));
    const contenders = [...pickContenders(selection.picks), ...baselineContenders(family)];
    const runs: Record<string, unknown> = {};

    // Training metrics for the same contenders (stop, 11%), for the train-vs-validation comparison.
    runs.training = await evaluateContenders(evaluator, research, family, contenders, trainingSpec(research.ds, fit));

    for (const mode of modes) {
      for (const fill of fills) {
        runs[`${mode}-${fill}`] = await evaluateContenders(
          evaluator,
          research,
          family,
          contenders,
          validationSpec(research.ds, fit, mode, fill)
        );
      }
    }

    (output.families as Record<string, unknown>)[family.key] = runs;
  }

  const allIn: Record<string, Metrics> = {};

  allIn.training = (await runAllInComparator(research.ds, research.sessions, trainingSpec(research.ds, fit))).metrics;

  for (const mode of modes) {
    for (const fill of fills) {
      allIn[`${mode}-${fill}`] = (
        await runAllInComparator(research.ds, research.sessions, validationSpec(research.ds, fit, mode, fill))
      ).metrics;
    }
  }

  output.allIn = allIn;
  await writeJson(path.join(fitsRoot, fit, 'validation.json'), output);
  log(`${fit}: validation written`);
};

// ---------------------------------------------------------------------------------------------------------
// Random control (final development fit)

const runControl = async (evaluator: Evaluator, research: Research, family: Family, log: StudyOptions['log']) => {
  const context = stageContext(evaluator, research, 'final', family, log);
  const stage = await readJson<{
    stats: { unique: number; attempted: number };
    hypervolumeReference: [number, number];
  }>(path.join(context.dir, 'stage.json'));
  const control = await runRandomControl(context, stage.stats.unique);
  // The main stage's records, rebuilt from its checkpoint without re-running the search.
  const mainRecords = (await runSearchStage(context, defaultSearch)).records;
  const feasible = (records: CandidateRecord[]) => records.filter((record) => record.violation === 0);
  const allDrawdowns = [...feasible(mainRecords), ...feasible(control.records)].map((record) => record.objectives[1]!);
  const reference: [number, number] = [0, 1.1 * Math.max(1, ...allDrawdowns)];
  const frontOf = (records: CandidateRecord[]) => {
    const ranks = paretoRanks2d(records);

    return records.filter((record) => ranks.get(record.id) === 0);
  };
  const mainFront = frontOf(mainRecords);
  const controlFront = frontOf(control.records);
  const dominatedBy = (point: CandidateRecord, front: CandidateRecord[]) =>
    front.some(
      (other) =>
        other.objectives[0]! <= point.objectives[0]! &&
        other.objectives[1]! <= point.objectives[1]! &&
        (other.objectives[0]! < point.objectives[0]! || other.objectives[1]! < point.objectives[1]!)
    );
  const summary = (records: CandidateRecord[], front: CandidateRecord[], other: CandidateRecord[]) => ({
    unique: records.length,
    feasible: feasible(records).length,
    hypervolume: hypervolume2d(records, reference),
    bestNet: Math.max(...feasible(records).map((record) => record.metrics.net)),
    frontSize: front.length,
    frontDominatedByOther: front.filter((point) => dominatedBy(point, other)).length
  });
  const result = {
    family: family.key,
    reference,
    sobolNsga: summary(mainRecords, mainFront, controlFront),
    random: {
      ...summary(control.records, controlFront, mainFront),
      draws: control.stats.draws,
      attempted: control.stats.attempted
    }
  };

  await writeJson(path.join(context.dir, 'control.json'), result);
  log(
    `final ${family.key} control: HV Sobol+NSGA ${result.sobolNsga.hypervolume.toExponential(4)} vs random ${result.random.hypervolume.toExponential(4)}`
  );
};

// ---------------------------------------------------------------------------------------------------------
// Freeze

const hashFile = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

const codeFiles = async () => {
  const dir = 'src/four-family';
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.ts')).map((file) => path.join(dir, file));
  const tests = (await fs.readdir(path.join(dir, 'tests'))).map((file) => path.join(dir, 'tests', file));

  return [
    ...files,
    ...tests,
    'src/optimizer/nsga2.ts',
    'src/optimizer/sobol.ts',
    'src/optimizer/rng.ts',
    'src/lib/csv.ts',
    'src/lib/session.ts',
    'src/app/fourFamily.ts'
  ].sort();
};

const runFreeze = async (args: string[], log: StudyOptions['log']) => {
  if ((await fs.pathExists(freezeFile)) && !option(args, 'rerun-reason')) {
    throw new Error(`${freezeFile} exists; a new freeze needs --rerun-reason "<why>"`);
  }

  const picks: Record<string, Pick[]> = {};

  for (const family of familyList) {
    picks[family.key] = (
      await readJson<{ picks: Pick[] }>(path.join(stageDir('final', family.key), 'selection.json'))
    ).picks;
  }

  const files = await codeFiles();
  const body = {
    frozenAt: new Date().toISOString(),
    rerunReason: option(args, 'rerun-reason') ?? null,
    protocol,
    protocolHash: await hashFile('research/trailing-buy-four-family-optimization/PROTOCOL.md'),
    dataHash: await hashFile(protocol.dataFile),
    sourceHashes: await sourceHashes(),
    sourceFiles,
    codeHashes: Object.fromEntries(await Promise.all(files.map(async (file) => [file, await hashFile(file)]))),
    engineVersion,
    search: defaultSearch,
    selectionConfig,
    seeds: {
      sobol: 'deriveSeed("four-family", "sobol", fit, family)',
      nsga: 'deriveSeed("four-family", "nsga", fit, family, seed) for seed 1 and 2',
      randomControl: 'Rng.from("four-family", "random-control", fit, family)',
      goldenMaster: 'Rng.from("four-family", "golden-master", "v1")'
    },
    picks: Object.fromEntries(
      Object.entries(picks).map(([key, list]) => [
        key,
        list.map((pick) => ({
          rank: pick.rank,
          category: pick.category,
          id: pick.id,
          params: pick.params,
          description: describeParams(families[key as FamilyKey], pick.params),
          signature: pick.signature,
          trainingNet: pick.metrics.net,
          trainingMinuteDrawdown: pick.metrics.minuteDrawdown
        }))
      ])
    )
  };
  const freezeHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');

  await writeJson(freezeFile, { ...body, freezeHash });
  log(`Frozen ${Object.values(picks).flat().length} picks at ${body.frozenAt}, freeze hash ${freezeHash}`);
};

// ---------------------------------------------------------------------------------------------------------
// Development-period robustness and detail (finalists, baselines, allIn), before the holdout

export const developmentSpec = (research: Research, fill: StopFill, rate: number): EvalSpec => {
  const endIndex = lastIndexOnOrBefore(research.ds, protocol.researchEnd);

  return {
    label: `development-${fill}-${rate}`,
    stopFill: fill,
    marginInterestRate: rate,
    armStart: protocol.eligibilityIndex,
    endIndex,
    segments: [
      { label: 'development', start: protocol.eligibilityIndex, end: endIndex },
      ...yearSegments(research.ds, protocol.eligibilityIndex, endIndex)
    ]
  };
};

export const writeDetail = async (
  dir: string,
  ds: Research['ds'],
  detail: NonNullable<ReturnType<typeof evaluateCandidate>['detail']>
) => {
  const iso = (time: number) => (Number.isFinite(time) ? new Date(time * 1000).toISOString() : '');
  const tradeRows = detail.trades.map((trade, index) => {
    const outcome = detail.accounting.outcomes[index]!;

    return [
      ds.dates[trade.entryIndex],
      iso(trade.entryTime),
      trade.entryPrice,
      trade.entryExecution,
      iso(trade.decisionTime),
      trade.decisionPrice,
      iso(trade.activationTime),
      trade.activationPrice,
      trade.referenceHigh,
      trade.trailingLow,
      trade.reboundTrigger,
      trade.restrictedAtActivation,
      trade.exitIndex >= 0 ? ds.dates[trade.exitIndex] : '',
      iso(trade.exitTime),
      Number.isFinite(trade.exitPrice) ? trade.exitPrice : '',
      trade.exitExecution,
      trade.reason,
      Number.isFinite(trade.exitStopPrice) ? trade.exitStopPrice : '',
      trade.maximumHoldDue,
      iso(trade.bufferSignalTime),
      trade.shares,
      trade.investment,
      outcome.interest,
      outcome.profit,
      outcome.holdDays,
      outcome.isOpen
    ];
  });

  await fs.outputFile(
    path.join(dir, 'trades.csv'),
    toCsv(
      [
        'entry_date',
        'entry_time',
        'entry_price',
        'entry_execution',
        'decision_time',
        'decision_price',
        'activation_time',
        'activation_price',
        'reference_high',
        'trailing_low',
        'rebound_trigger',
        'restricted_at_activation',
        'exit_date',
        'exit_time',
        'exit_price',
        'exit_execution',
        'reason',
        'exit_stop_price',
        'maximum_hold_due',
        'buffer_signal_time',
        'shares',
        'investment',
        'interest',
        'profit',
        'hold_days',
        'open_at_end'
      ],
      tradeRows
    )
  );
  await fs.outputFile(
    path.join(dir, 'setups.csv'),
    toCsv(
      [
        'setup_id',
        'status',
        'status_reason',
        'activation_date',
        'activation_time',
        'activation_price',
        'reference_high',
        'trailing_low',
        'suppressed_signals',
        'signal_date',
        'signal_time',
        'signal_price',
        'carried_overnight',
        'fill_date',
        'fill_time',
        'fill_price',
        'end_date'
      ],
      detail.setups.map((setup) => [
        setup.id,
        setup.status,
        setup.statusReason,
        ds.dates[setup.activationIndex],
        iso(setup.activationTime),
        setup.activationPrice,
        setup.referenceHigh,
        setup.trailingLow,
        setup.suppressedSignals,
        setup.signalIndex >= 0 ? ds.dates[setup.signalIndex] : '',
        iso(setup.signalTime),
        Number.isFinite(setup.signalPrice) ? setup.signalPrice : '',
        setup.carriedOvernight,
        setup.fillIndex >= 0 ? ds.dates[setup.fillIndex] : '',
        iso(setup.fillTime),
        Number.isFinite(setup.fillPrice) ? setup.fillPrice : '',
        setup.endIndex >= 0 ? ds.dates[setup.endIndex] : ''
      ])
    )
  );

  const marks = detail.accounting.dailyMarks!;
  const equityRows: unknown[][] = [];

  for (let s = 0; s < marks.length; s++) {
    if (Number.isFinite(marks[s]!)) {
      equityRows.push([ds.dates[s], ds.sClose[s], marks[s]]);
    }
  }

  await fs.outputFile(path.join(dir, 'equity.csv'), toCsv(['date', 'close', 'mtm_pnl'], equityRows));
};

const runDevelopment = async (evaluator: Evaluator, research: Research, log: StudyOptions['log']) => {
  const freeze = await readJson<{ picks: Record<string, Pick[]> }>(freezeFile);
  const fills: StopFill[] = ['stop', 'next-open'];
  const rates = [protocol.marginInterestRate, ...protocol.sensitivityRates];
  const output: Record<string, unknown> = { families: {}, allIn: {} };
  const highs = new ReferenceHighCache(research.ds);

  for (const family of familyList) {
    const contenders = [...pickContenders(freeze.picks[family.key] as Pick[]), ...baselineContenders(family)];
    const runs: Record<string, unknown> = {};

    for (const fill of fills) {
      for (const rate of rates) {
        runs[`${fill}-${rate}`] = await evaluateContenders(
          evaluator,
          research,
          family,
          contenders,
          developmentSpec(research, fill, rate)
        );
      }
    }

    (output.families as Record<string, unknown>)[family.key] = runs;

    for (const contender of contenders) {
      const { detail } = evaluateCandidate(
        research.ds,
        highs,
        family.key,
        contender.params,
        developmentSpec(research, 'stop', protocol.marginInterestRate),
        true
      );

      await writeDetail(
        path.join(resultsRoot, 'traces', 'development', family.key, contender.id),
        research.ds,
        detail!
      );
    }
  }

  const allIn: Record<string, Metrics> = {};

  for (const fill of fills) {
    for (const rate of rates) {
      const comparator = await runAllInComparator(
        research.ds,
        research.sessions,
        developmentSpec(research, fill, rate)
      );

      allIn[`${fill}-${rate}`] = comparator.metrics;

      if (fill === 'stop' && rate === protocol.marginInterestRate) {
        await fs.outputFile(
          path.join(resultsRoot, 'traces', 'development', 'allIn', 'trades.csv'),
          toCsv(
            ['entry_date', 'entry_price', 'exit_date', 'exit_price', 'reason', 'shares'],
            comparator.trades.map((trade) => [
              trade.entryDate,
              trade.entryPrice,
              trade.exitDate,
              trade.exitPrice,
              trade.reason,
              trade.shares
            ])
          )
        );
      }
    }
  }

  output.allIn = allIn;
  await writeJson(path.join(fitsRoot, 'final', 'development.json'), output);
  log('Development robustness written');
};

// ---------------------------------------------------------------------------------------------------------

// The optimization may only run on an engine whose parity audit passed (PROTOCOL.md section 3): the audit must
// exist, have passed, and have been run on the current engine, accounting and copy-generator code.
const assertParityPassed = async () => {
  const file = path.join(resultsRoot, 'parity', 'parity.json');

  if (!(await fs.pathExists(file))) {
    throw new Error('No parity audit: run `npm run four-family -- parity` first');
  }

  const parity = await readJson<{ passed: boolean; codeHashes?: Record<string, string> }>(file);

  if (!parity.passed) {
    throw new Error('The parity audit failed; the optimization does not run on a non-equivalent engine');
  }

  for (const [codeFile, hash] of Object.entries(parity.codeHashes ?? {})) {
    if ((await hashFile(codeFile)) !== hash) {
      throw new Error(`${codeFile} changed since the parity audit; re-run \`npm run four-family -- parity\``);
    }
  }
};

const parseList = <T extends string>(value: string | undefined, all: readonly T[]) =>
  value ? (value.split(',') as T[]).filter((item) => all.includes(item)) : [...all];

export const runStudyCommand = async (command: string, args: string[], options: StudyOptions) => {
  const { log } = options;
  const fits = parseList(
    option(args, 'fits'),
    protocol.fits.map((fit) => fit.key)
  );
  const selectedFamilies = parseList(option(args, 'families'), familyKeys).map((key) => families[key]);

  if (command === 'freeze') {
    await runFreeze(args, log);

    return;
  }

  if (command === 'holdout') {
    const { runHoldout } = await import('./holdout.ts');

    await runHoldout(args, options);

    return;
  }

  if (command === 'report') {
    const { writeReports } = await import('./report.ts');

    await writeReports(log);

    return;
  }

  const research = await loadResearch();
  const evaluator = openEvaluator(research, options.workers);

  try {
    switch (command) {
      case 'benchmark':
        await evaluator.close();
        await runBenchmark(research, options);
        break;

      case 'search':
        await assertParityPassed();

        for (const fit of fits) {
          for (const family of selectedFamilies) {
            const { records, stats } = await runStage(evaluator, research, fit, family, log);

            log(
              `${fit} ${family.key}: ${stats.unique} unique of ${stats.attempted} attempted (${stats.duplicates} duplicates) in ${(stats.runtimeMs / 1000).toFixed(1)} s`
            );
            await runSelectionFor(evaluator, research, fit, family, records, log);
          }
        }

        break;

      case 'validate':
        for (const fit of fits.filter((fit) => fit !== 'final')) {
          await runValidation(evaluator, research, fit, log);
        }

        break;

      case 'control':
        for (const family of selectedFamilies) {
          await runControl(evaluator, research, family, log);
        }

        break;

      case 'development':
        await runDevelopment(evaluator, research, log);
        break;

      default:
        throw new Error(`Unknown command ${command}`);
    }
  } finally {
    await evaluator.close();
  }
};
