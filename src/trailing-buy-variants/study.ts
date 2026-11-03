// Orchestration of the variants program (PROTOCOL.md sections 5–8): search and selection per family and fit,
// walk-forward validation, Trades2-anchored sweeps, freeze, and the reused-window evaluation. Everything but
// the last runs on the research view (sessions up to 2023-12-29).
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import { paretoRanks2d } from '../optimizer/nsga2.ts';
import {
  type Dataset,
  ReferenceHighCache,
  firstIndexOnOrAfter,
  issueUnlockCapability,
  lastIndexOnOrBefore,
  loadSessions,
  sha256File,
  unlockedDataset
} from '../four-family/data.ts';
import type { Segment } from './accounting.ts';
import { runAllInComparator } from './comparators.ts';
import {
  type FitKey,
  type Research,
  developmentSpec,
  fitOf,
  fitsRoot,
  freezeFile,
  loadResearch,
  minEntries,
  monthSegment,
  option,
  parseList,
  protocol,
  readJson,
  resultsRoot,
  stageDir,
  trainingSpec,
  validationSpec,
  writeJson,
  yearSegments
} from './context.ts';
import type { StopFill } from './engine.ts';
import { type EvalSpec, type Metrics, engineVersion, evaluateCandidate } from './evaluate.ts';
import {
  type Family,
  type IntParams,
  type MechanismKey,
  allParamKeys,
  baseFamilyKeys,
  candidateId,
  defaultParams,
  describeParams,
  families,
  familySpecs,
  formatValue,
  gridSize,
  makeFamily,
  mechanismParams,
  registerFamily,
  specs,
  trades2Params
} from './families.ts';
import { type Evaluator, LocalEvaluator, WorkerPool, defaultWorkerCount } from './pool.ts';
import { type CandidateRecord, type StageContext, StageArchive, defaultSearch, runSearchStage } from './search.ts';
import { type Pick, buildPool, groupPhenotypes, jaccard, pickTopTen, probePool, selectionConfig } from './selection.ts';

export interface StudyOptions {
  workers?: number;
  log: (message: string) => void;
}

export const combinationsFile = path.join(resultsRoot, 'combinations.json');

// Combination families (PROTOCOL.md amendments) are registered from results/combinations.json.
export const loadCombinations = async (evaluator?: Evaluator) => {
  if (!(await fs.pathExists(combinationsFile))) {
    return [];
  }

  const list =
    await readJson<{ key: string; number: number; base: Family['base']; mechanisms: MechanismKey[] }[]>(
      combinationsFile
    );

  for (const entry of list) {
    const family = makeFamily(entry.key, entry.number, entry.base, entry.mechanisms);

    registerFamily(family);
    evaluator?.registerFamily(family);
  }

  return list.map((entry) => entry.key);
};

export const familyList = () => Object.values(families);

const openEvaluator = (research: { ds: Dataset }, workers?: number): Evaluator => {
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
// Search and selection

const writeCandidates = async (dir: string, family: Family, records: CandidateRecord[]) => {
  const ranks = paretoRanks2d(records);
  const header = [
    'id',
    'origin',
    ...allParamKeys,
    'feasible',
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
    'deployed_fraction',
    'best_trade',
    'worst_trade',
    'signature'
  ];
  const rows = records.map((record) => [
    record.id,
    record.origin,
    ...paramColumns(family, record.params),
    record.violation === 0,
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
    record.metrics.deployedFraction,
    record.metrics.bestTrade,
    record.metrics.worstTrade,
    record.metrics.signature
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
  const finalStats = previous
    ? { ...stats, runtimeMs: previous.stats.runtimeMs, workers: previous.stats.workers, replayedMs: stats.runtimeMs }
    : stats;
  const feasible = records.filter((record) => record.violation === 0);

  await writeJson(stageFile, {
    fit,
    family: family.key,
    dimensions: family.paramKeys.length,
    paramKeys: family.paramKeys,
    domains: familySpecs(family).map((spec) => ({
      key: spec.key,
      min: spec.min,
      max: spec.max,
      step: spec.step,
      points: gridSize(spec)
    })),
    spec: context.spec,
    minEntries: context.minEntries,
    search: defaultSearch,
    engineVersion,
    datasetId: research.ds.id,
    hypervolumeReference: reference,
    feasible: feasible.length,
    aboveCeiling: feasible.filter((record) => record.metrics.minuteDrawdown > protocol.drawdownCeiling).length,
    bestNetAboveCeiling: Math.max(
      0,
      ...feasible
        .filter((record) => record.metrics.minuteDrawdown > protocol.drawdownCeiling)
        .map((record) => record.metrics.net)
    ),
    stats: finalStats
  });
  await writeCandidates(dir, family, records);

  return { records, stats: finalStats, context };
};

export const heldSessionsOf = (
  ds: Dataset,
  familyKey: string,
  params: IntParams,
  spec: EvalSpec,
  highs: ReferenceHighCache
) => {
  const { detail } = evaluateCandidate(ds, highs, familyKey, params, spec, true);
  const held = new Set<number>();

  for (const trade of detail!.trades) {
    const last = trade.exitIndex < 0 ? spec.endIndex : trade.exitIndex - 1;

    for (let s = trade.entryIndex; s <= last; s++) {
      held.add(s);
    }
  }

  return held;
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
  const highs = new ReferenceHighCache(research.ds);
  const heldSets = new Map<string, Set<number>>();
  const heldOf = (record: CandidateRecord) => {
    let held = heldSets.get(record.id);

    if (!held) {
      held = heldSessionsOf(research.ds, family.key, record.params, context.spec, highs);
      heldSets.set(record.id, held);
    }

    return held;
  };
  const { pool, eligibleGroups, scanned, aboveCeiling } = buildPool(groups, heldOf);
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
    aboveCeiling,
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
    `${fit} ${family.key}: ${feasible.length} feasible, ${groups.length} phenotypes (${aboveCeiling.phenotypes} above the ceiling), pool ${members.length}, picks ${picks.length}`
  );

  return selection;
};

// ---------------------------------------------------------------------------------------------------------
// Contenders and validation

export interface Contender {
  label: string;
  id: string;
  params: IntParams;
  category?: string;
}

export const baselineContenders = (family: Family): Contender[] => {
  const contenders: Contender[] = [];
  const own = defaultParams(family);

  contenders.push({ label: `default (file Y ${family.fileY / 10}%)`, id: candidateId(family, own), params: own });

  for (const y of [30, 40]) {
    if (y !== family.fileY) {
      const params = defaultParams(family, y);

      contenders.push({ label: `default at Y ${y / 10}%`, id: candidateId(family, params), params });
    }
  }

  const trades2 = trades2Params(family);

  contenders.push({ label: 'Trades2 phenotype', id: candidateId(family, trades2), params: trades2 });

  return contenders;
};

export const pickContenders = (picks: Pick[]): Contender[] =>
  picks.map((pick) => ({ label: `pick ${pick.rank}`, id: pick.id, params: pick.params, category: pick.category }));

const evaluateContenders = async (
  evaluator: Evaluator,
  ds: Dataset,
  family: Family,
  contenders: Contender[],
  spec: EvalSpec
) => {
  const metrics = await evaluator.evaluate(
    ds.id,
    family.key,
    spec,
    contenders.map((contender) => contender.params)
  );

  return contenders.map((contender, index) => ({ ...contender, metrics: metrics[index]! }));
};

const runValidation = async (
  evaluator: Evaluator,
  research: Research,
  fit: FitKey,
  selected: Family[],
  log: StudyOptions['log']
) => {
  const modes = ['continuous', 'flat'] as const;
  const fills: StopFill[] = ['stop', 'next-open'];
  const file = path.join(fitsRoot, fit, 'validation.json');
  const output: Record<string, unknown> = (await fs.pathExists(file))
    ? await readJson<Record<string, unknown>>(file)
    : { fit, validation: fitOf(fit).validation, families: {}, allIn: {} };

  for (const family of selected) {
    const selectionFile = path.join(stageDir(fit, family.key), 'selection.json');

    if (!(await fs.pathExists(selectionFile))) {
      log(`${fit} ${family.key}: no selection, skipped`);
      continue;
    }

    const selection = await readJson<{ picks: Pick[] }>(selectionFile);
    const contenders = [...pickContenders(selection.picks), ...baselineContenders(family)];
    const runs: Record<string, unknown> = {};

    runs.training = await evaluateContenders(
      evaluator,
      research.ds,
      family,
      contenders,
      trainingSpec(research.ds, fit)
    );

    for (const mode of modes) {
      for (const fill of fills) {
        runs[`${mode}-${fill}`] = await evaluateContenders(
          evaluator,
          research.ds,
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
  await writeJson(file, output);
  log(`${fit}: validation written`);
};

// ---------------------------------------------------------------------------------------------------------
// Trades2-anchored mechanism sweeps (PROTOCOL.md section 6)

const sweepGrid = (family: Family): { params: IntParams; values: Partial<Record<string, number>> }[] => {
  const base = trades2Params(family);
  const keys = family.mechanisms.flatMap((mechanism) => mechanismParams[mechanism]);
  const coarse: Partial<Record<string, number>> = {
    episodeLossBudget: 10,
    episodeResetRetrace: 50,
    addTrigger: 5,
    progressThreshold: 5,
    holdExtensionDays: 5
  };
  const valuesOf = (key: (typeof keys)[number]) => {
    const spec = specs[key];
    const step = keys.length > 1 ? (coarse[key] ?? spec.step) : spec.step;
    const values: number[] = [];

    for (let value = spec.min; value <= spec.max; value += step) {
      values.push(value);
    }

    if (key === 'holdExtensionDays' && !values.includes(1)) {
      values.unshift(1);
    }

    return values;
  };
  let grid: { params: IntParams; values: Partial<Record<string, number>> }[] = [{ params: { ...base }, values: {} }];

  for (const key of keys) {
    const next: typeof grid = [];

    for (const point of grid) {
      for (const value of valuesOf(key)) {
        next.push({ params: { ...point.params, [key]: value }, values: { ...point.values, [key]: value } });
      }
    }

    grid = next;
  }

  return grid;
};

const runSweeps = async (evaluator: Evaluator, research: Research, selected: Family[], log: StudyOptions['log']) => {
  const file = path.join(resultsRoot, 'sweeps.json');
  const output: Record<string, unknown> = (await fs.pathExists(file))
    ? await readJson<Record<string, unknown>>(file)
    : {};

  for (const family of selected.filter((family) => family.mechanisms.length > 0)) {
    const grid = sweepGrid(family);
    const baseFamily = families[family.base]!;
    const baseParams = trades2Params(baseFamily);
    const fits: Record<string, unknown> = {};

    for (const fit of protocol.fits) {
      const training = trainingSpec(research.ds, fit.key);
      const metrics = await evaluator.evaluate(
        research.ds.id,
        family.key,
        training,
        grid.map((point) => point.params)
      );
      const [baseTraining] = await evaluator.evaluate(research.ds.id, baseFamily.key, training, [baseParams]);
      const rows = grid.map((point, index) => ({
        values: point.values,
        id: candidateId(family, point.params),
        net: metrics[index]!.net,
        minuteDrawdown: metrics[index]!.minuteDrawdown,
        entries: metrics[index]!.entries,
        exposure: metrics[index]!.exposure
      }));
      const feasible = rows.filter((row) => row.minuteDrawdown <= protocol.drawdownCeiling);
      const best = [...feasible].sort((a, b) => b.net - a.net || a.minuteDrawdown - b.minuteDrawdown)[0];
      const record: Record<string, unknown> = {
        gridPoints: grid.length,
        base: {
          id: candidateId(baseFamily, baseParams),
          net: baseTraining!.net,
          minuteDrawdown: baseTraining!.minuteDrawdown
        },
        best,
        betterThanBaseInTraining: rows.filter(
          (row) => row.net > baseTraining!.net && row.minuteDrawdown <= protocol.drawdownCeiling
        ).length,
        rows
      };

      if (fit.validation && best) {
        const validation = validationSpec(research.ds, fit.key, 'continuous');
        const bestParams = grid.find((point) => candidateId(family, point.params) === best.id)!.params;
        const [bestValidation] = await evaluator.evaluate(research.ds.id, family.key, validation, [bestParams]);
        const [baseValidation] = await evaluator.evaluate(research.ds.id, baseFamily.key, validation, [baseParams]);

        record.validation = {
          window: fit.validation,
          best: {
            id: best.id,
            values: best.values,
            net: bestValidation!.net,
            minuteDrawdown: bestValidation!.minuteDrawdown,
            entries: bestValidation!.entries
          },
          base: {
            net: baseValidation!.net,
            minuteDrawdown: baseValidation!.minuteDrawdown,
            entries: baseValidation!.entries
          }
        };
      }

      fits[fit.key] = record;
    }

    output[family.key] = { family: family.key, base: family.base, mechanisms: family.mechanisms, fits };
    log(`sweeps ${family.key}: ${grid.length} grid points x ${protocol.fits.length} fits`);
  }

  await writeJson(file, output);
};

// ---------------------------------------------------------------------------------------------------------
// Freeze and the reused-window evaluation

const hashFile = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

const codeFiles = async () => {
  const dir = 'src/trailing-buy-variants';
  const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.ts')).map((file) => path.join(dir, file));

  return [
    ...files,
    'src/four-family/data.ts',
    'src/four-family/context.ts',
    'src/optimizer/nsga2.ts',
    'src/optimizer/sobol.ts',
    'src/optimizer/rng.ts',
    'src/lib/csv.ts',
    'src/lib/session.ts'
  ].sort();
};

const runFreeze = async (args: string[], selected: Family[], log: StudyOptions['log']) => {
  if ((await fs.pathExists(freezeFile)) && !option(args, 'rerun-reason')) {
    throw new Error(`${freezeFile} exists; a new freeze needs --rerun-reason "<why>"`);
  }

  const picks: Record<string, Pick[]> = {};

  for (const family of selected) {
    const file = path.join(stageDir('final', family.key), 'selection.json');

    if (await fs.pathExists(file)) {
      picks[family.key] = (await readJson<{ picks: Pick[] }>(file)).picks;
    }
  }

  const files = await codeFiles();
  const body = {
    frozenAt: new Date().toISOString(),
    rerunReason: option(args, 'rerun-reason') ?? null,
    protocol,
    protocolHash: await hashFile('research/trailing-buy-variants/PROTOCOL.md'),
    dataHash: await hashFile(protocol.dataFile),
    codeHashes: Object.fromEntries(await Promise.all(files.map(async (file) => [file, await hashFile(file)]))),
    engineVersion,
    search: defaultSearch,
    selectionConfig,
    families: Object.fromEntries(
      Object.keys(picks).map((key) => [
        key,
        { base: families[key]!.base, mechanisms: families[key]!.mechanisms, paramKeys: families[key]!.paramKeys }
      ])
    ),
    picks: Object.fromEntries(
      Object.entries(picks).map(([key, list]) => [
        key,
        list.map((pick) => ({
          rank: pick.rank,
          category: pick.category,
          id: pick.id,
          params: pick.params,
          description: describeParams(families[key]!, pick.params),
          signature: pick.signature,
          trainingNet: pick.metrics.net,
          trainingMinuteDrawdown: pick.metrics.minuteDrawdown
        }))
      ])
    )
  };
  const freezeHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');

  await writeJson(freezeFile, { ...body, freezeHash });
  log(
    `Frozen ${Object.values(picks).flat().length} picks in ${Object.keys(picks).length} families, hash ${freezeHash}`
  );
};

export const writeDetail = async (
  dir: string,
  ds: Dataset,
  detail: NonNullable<ReturnType<typeof evaluateCandidate>['detail']>
) => {
  const iso = (time: number) => (Number.isFinite(time) ? new Date(time * 1000).toISOString() : '');
  const rows = detail.trades.map((trade, index) => {
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
      trade.legs.length,
      trade.legs.length > 1 ? ds.dates[trade.legs[1]!.entryIndex] : '',
      trade.legs.length > 1 ? trade.legs[1]!.entryPrice : '',
      trade.investment,
      trade.shares,
      trade.exitIndex >= 0 ? ds.dates[trade.exitIndex] : '',
      iso(trade.exitTime),
      Number.isFinite(trade.exitPrice) ? trade.exitPrice : '',
      trade.exitExecution,
      trade.reason,
      Number.isFinite(trade.exitStopPrice) ? trade.exitStopPrice : '',
      trade.maximumHoldDue,
      iso(trade.bufferSignalTime),
      Number.isFinite(trade.invalidationLevel) ? trade.invalidationLevel : '',
      Number.isFinite(trade.effectiveHoldAtExit) ? trade.effectiveHoldAtExit : '',
      outcome.interest,
      outcome.profit,
      outcome.holdDays,
      outcome.capitalDays,
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
        'legs',
        'add_date',
        'add_price',
        'investment',
        'shares',
        'exit_date',
        'exit_time',
        'exit_price',
        'exit_execution',
        'reason',
        'exit_stop_price',
        'maximum_hold_due',
        'signal_time',
        'invalidation_level',
        'effective_hold',
        'interest',
        'profit',
        'hold_days',
        'capital_days',
        'open_at_end'
      ],
      rows
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

interface Freeze {
  freezeHash: string;
  frozenAt: string;
  dataHash: string;
  codeHashes: Record<string, string>;
  picks: Record<string, Pick[]>;
  [key: string]: unknown;
}

const verifyFreeze = async () => {
  if (!(await fs.pathExists(freezeFile))) {
    throw new Error('No freeze: run `npm run trailing-buy-variants -- freeze` first');
  }

  const freeze = await readJson<Freeze>(freezeFile);
  const { freezeHash, ...body } = freeze;
  const recomputed = createHash('sha256').update(JSON.stringify(body)).digest('hex');

  if (recomputed !== freezeHash) {
    throw new Error(`The freeze hash does not verify (${recomputed} vs ${freezeHash})`);
  }

  if ((await sha256File(protocol.dataFile)) !== freeze.dataHash) {
    throw new Error('The data file changed after the freeze');
  }

  for (const file of [
    'src/trailing-buy-variants/engine.ts',
    'src/trailing-buy-variants/accounting.ts',
    'src/trailing-buy-variants/families.ts',
    'src/trailing-buy-variants/evaluate.ts',
    'src/four-family/data.ts',
    'src/lib/csv.ts',
    'src/lib/session.ts'
  ]) {
    if (freeze.codeHashes[file] !== (await hashFile(file))) {
      throw new Error(`${file} changed after the freeze`);
    }
  }

  return freeze;
};

export const holdoutDir = path.join(resultsRoot, 'holdout');

const runHoldout = async (args: string[], options: StudyOptions) => {
  const { log } = options;
  const freeze = await verifyFreeze();
  const attemptsFile = path.join(holdoutDir, 'attempts.json');
  const attempts = (await fs.pathExists(attemptsFile)) ? await readJson<Record<string, unknown>[]>(attemptsFile) : [];
  const rerunReason = option(args, 'rerun-reason');

  if (attempts.length > 0 && !rerunReason) {
    throw new Error(
      `The reused-window evaluation already ran ${attempts.length} time(s); a rerun needs --rerun-reason "<why>"`
    );
  }

  const attempt = {
    attempt: attempts.length + 1,
    startedAt: new Date().toISOString(),
    freezeHash: freeze.freezeHash,
    frozenAt: freeze.frozenAt,
    rerunReason: rerunReason ?? null
  };

  await writeJson(attemptsFile, [...attempts, attempt]);
  log(`Reused-window evaluation attempt ${attempt.attempt} on freeze ${freeze.freezeHash}`);

  const unlock = issueUnlockCapability();
  const sessions = await loadSessions(protocol.dataFile);
  const ds = unlockedDataset(sessions, freeze.dataHash, unlock);
  const eligibility = protocol.eligibilityIndex;
  const endIndex = ds.sessionCount - 1;
  const windowStart = firstIndexOnOrAfter(ds, protocol.reusedWindow.start);
  const researchEndIndex = lastIndexOnOrBefore(ds, protocol.researchEnd);
  const april = monthSegment(ds, '2025-04');
  const continuousSegments: Segment[] = [
    { label: 'reused', start: windowStart, end: endIndex },
    { label: 'development', start: eligibility, end: researchEndIndex },
    { label: 'combined', start: eligibility, end: endIndex },
    ...yearSegments(ds, eligibility, endIndex),
    ...(april ? [april] : [])
  ];
  const continuous = (fill: StopFill, rate: number): EvalSpec => ({
    label: `reused-continuous-${fill}-${rate}`,
    stopFill: fill,
    marginInterestRate: rate,
    armStart: eligibility,
    endIndex,
    segments: continuousSegments
  });
  const flat = (fill: StopFill, rate: number): EvalSpec => ({
    label: `reused-flat-${fill}-${rate}`,
    stopFill: fill,
    marginInterestRate: rate,
    armStart: windowStart,
    endIndex,
    segments: [{ label: 'reused', start: windowStart, end: endIndex }, ...(april ? [april] : [])]
  });
  const specsByKey: Record<string, EvalSpec> = {};

  for (const fill of ['stop', 'next-open'] as const) {
    for (const rate of [protocol.marginInterestRate, ...protocol.sensitivityRates]) {
      specsByKey[`continuous-${fill}-${rate}`] = continuous(fill, rate);
    }

    specsByKey[`flat-${fill}-${protocol.marginInterestRate}`] = flat(fill, protocol.marginInterestRate);
  }

  const evaluator = openEvaluator({ ds }, options.workers);
  const highs = new ReferenceHighCache(ds);

  // Combination families must reach the worker threads too.
  await loadCombinations(evaluator);

  const output: Record<string, unknown> = {
    attempt: attempt.attempt,
    freezeHash: freeze.freezeHash,
    dataLastDate: ds.lastDate,
    windowStartDate: ds.dates[windowStart],
    label: protocol.reusedWindow.label,
    specs: Object.fromEntries(
      Object.entries(specsByKey).map(([key, spec]) => [
        key,
        {
          ...spec,
          segments: spec.segments.map((segment) => ({
            ...segment,
            startDate: ds.dates[segment.start],
            endDate: ds.dates[segment.end]
          }))
        }
      ])
    ),
    families: {} as Record<string, unknown>,
    allIn: {} as Record<string, Metrics>
  };

  try {
    for (const key of Object.keys(freeze.picks)) {
      const family = families[key]!;
      const contenders: Contender[] = [...pickContenders(freeze.picks[key]!), ...baselineContenders(family)];
      const runs: Record<string, unknown> = {};

      for (const [specKey, spec] of Object.entries(specsByKey)) {
        runs[specKey] = await evaluateContenders(evaluator, ds, family, contenders, spec);
      }

      (output.families as Record<string, unknown>)[key] = runs;

      for (const contender of contenders) {
        const { detail } = evaluateCandidate(
          ds,
          highs,
          key,
          contender.params,
          specsByKey[`continuous-stop-${protocol.marginInterestRate}`]!,
          true
        );

        await writeDetail(path.join(resultsRoot, 'traces', 'full', key, contender.id), ds, detail!);
      }

      log(`Reused window evaluated for ${family.name}`);
    }

    for (const [specKey, spec] of Object.entries(specsByKey)) {
      const comparator = await runAllInComparator(ds, sessions, spec);

      (output.allIn as Record<string, Metrics>)[specKey] = comparator.metrics;

      if (specKey === `continuous-stop-${protocol.marginInterestRate}`) {
        await writeDetail(path.join(resultsRoot, 'traces', 'full', 'allIn', 'allIn'), ds, {
          trades: comparator.trades,
          accounting: comparator.accounting,
          setups: []
        });
      }
    }
  } finally {
    await evaluator.close();
  }

  await writeJson(path.join(holdoutDir, 'holdout.json'), output);
  await writeJson(attemptsFile, [...attempts, { ...attempt, completedAt: new Date().toISOString() }]);
  log(`Reused-window evaluation written (attempt ${attempt.attempt})`);
};

// ---------------------------------------------------------------------------------------------------------
// Development traces for the final picks (before the freeze is fine: development data only)

const runDevelopment = async (
  evaluator: Evaluator,
  research: Research,
  selected: Family[],
  log: StudyOptions['log']
) => {
  const highs = new ReferenceHighCache(research.ds);
  const fills: StopFill[] = ['stop', 'next-open'];
  const rates = [protocol.marginInterestRate, ...protocol.sensitivityRates];
  const file = path.join(fitsRoot, 'final', 'development.json');
  const output: Record<string, unknown> = (await fs.pathExists(file))
    ? await readJson<Record<string, unknown>>(file)
    : { families: {}, allIn: {} };

  for (const family of selected) {
    const selectionFile = path.join(stageDir('final', family.key), 'selection.json');

    if (!(await fs.pathExists(selectionFile))) {
      continue;
    }

    const selection = await readJson<{ picks: Pick[] }>(selectionFile);
    const contenders = [...pickContenders(selection.picks), ...baselineContenders(family)];
    const runs: Record<string, unknown> = {};

    for (const fill of fills) {
      for (const rate of rates) {
        runs[`${fill}-${rate}`] = await evaluateContenders(
          evaluator,
          research.ds,
          family,
          contenders,
          developmentSpec(research.ds, fill, rate)
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
        developmentSpec(research.ds, 'stop', protocol.marginInterestRate),
        true
      );

      await writeDetail(
        path.join(resultsRoot, 'traces', 'development', family.key, contender.id),
        research.ds,
        detail!
      );
    }

    log(`development traces written for ${family.key}`);
  }

  const allIn: Record<string, Metrics> = {};

  for (const fill of fills) {
    for (const rate of rates) {
      allIn[`${fill}-${rate}`] = (
        await runAllInComparator(research.ds, research.sessions, developmentSpec(research.ds, fill, rate))
      ).metrics;
    }
  }

  output.allIn = allIn;
  await writeJson(file, output);
};

// ---------------------------------------------------------------------------------------------------------

export const runStudyCommand = async (command: string, args: string[], options: StudyOptions) => {
  const { log } = options;
  const fits = parseList(
    option(args, 'fits'),
    protocol.fits.map((fit) => fit.key)
  ) as FitKey[];

  await loadCombinations();

  const selected = parseList(option(args, 'families'), Object.keys(families)).map((key) => families[key]!);

  if (command === 'freeze') {
    await runFreeze(args, selected, log);

    return;
  }

  if (command === 'holdout') {
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

  await loadCombinations(evaluator);

  try {
    switch (command) {
      case 'search':
        for (const fit of fits) {
          for (const family of selected) {
            const { records, stats } = await runStage(evaluator, research, fit, family, log);

            log(
              `${fit} ${family.key}: ${stats.unique} unique of ${stats.attempted} attempted in ${(stats.runtimeMs / 1000).toFixed(1)} s`
            );
            await runSelectionFor(evaluator, research, fit, family, records, log);
          }
        }

        break;

      case 'validate':
        for (const fit of fits.filter((fit) => fit !== 'final')) {
          await runValidation(evaluator, research, fit, selected, log);
        }

        break;

      case 'sweeps':
        await runSweeps(evaluator, research, selected, log);
        break;

      case 'development':
        await runDevelopment(evaluator, research, selected, log);
        break;

      default:
        throw new Error(`Unknown command ${command}`);
    }
  } finally {
    await evaluator.close();
  }
};

export { baseFamilyKeys };
