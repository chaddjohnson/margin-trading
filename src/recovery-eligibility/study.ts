// The optimization stages (PROTOCOL.md section 3): the targeted sweeps, the joint search per family and fit,
// the selection policies, the walk-forward validation, the sensitivity probes and the event-exclusion
// diagnostics. Results go under research/vgt-recovery-eligibility/results/.
import path from 'node:path';
import fs from 'fs-extra';
import { ReferenceHighCache } from '../four-family/data.ts';
import {
  type Data,
  type FitKey,
  exists,
  fullSpec,
  minEntries,
  option,
  protocol,
  readJson,
  stageDir,
  trainingSpec,
  validationSpec,
  writeJson
} from './context.ts';
import { type EvalSpec, type Metrics, evaluateCandidate } from './evaluate.ts';
import {
  type Family,
  type IntParams,
  candidateId,
  describeParams,
  families,
  familySpecs,
  set2Params,
  singleMechanismKeys,
  specs
} from './families.ts';
import { type Evaluator, LocalEvaluator, WorkerPool } from './pool.ts';
import { episodeAttribution, episodeMoves, tradeRows } from './report.ts';
import { type CandidateRecord, type StageStats, defaultSearch, runSearchStage, violationOf } from './search.ts';

export const makeEvaluator = (args: string[]): Evaluator => {
  const workers = option(args, 'workers');

  return workers === '0' ? new LocalEvaluator() : new WorkerPool({ size: workers ? Number(workers) : undefined });
};

export interface SweepRow {
  familyKey: string;
  params: IntParams;
  id: string;
  metrics: Metrics;
  r2023: { trades: number; net: number; firstEntry: string; capturedShare: number };
}

// The predeclared sweep lattices (PROTOCOL.md section 3.1).
export const sweepGrids = (): Record<string, IntParams[]> => {
  const grids: Record<string, IntParams[]> = {};
  const product = (lists: Record<string, number[]>): IntParams[] => {
    let out: IntParams[] = [{}];

    for (const [key, values] of Object.entries(lists)) {
      out = out.flatMap((partial) => values.map((value) => ({ ...partial, [key]: value })));
    }

    return out;
  };
  const range = (from: number, to: number, step: number) => {
    const values: number[] = [];

    for (let value = from; value <= to + 1e-9; value += step) {
      values.push(Math.round(value));
    }

    return values;
  };

  grids.latch = product({
    latchDepth: [0, 25, 50, 75, 100, 125, 150, 175, 200, 216, 250],
    episodeReset: range(200, 1000, 50),
    resetPolicy: [0, 1],
    episodeExpiry: [60, 120, 250, 500]
  });
  grids.trough = product({
    troughRecovery: range(10, 300, 10),
    troughRetrace: [0, 100, 200, 300, 400],
    episodeReset: [500, 600, 700, 800, 1000],
    resetPolicy: [0, 1],
    episodeExpiry: [120, 250, 500]
  });
  grids.dual = product({ shallowDepth: range(30, 250, 5), shallowRebound: [1, 3, 5, 10, 20, 30, 50, 100] });
  grids.postExit = product({
    pullback: range(10, 200, 5),
    continuationWindow: [10, 20, 30, 45, 60, 90, 120, 180, 250]
  });

  return grids;
};

export const sweeps = async (data: Data, args: string[]) => {
  const { ds } = data;
  const evaluator = makeEvaluator(args);
  const highs = new ReferenceHighCache(ds);
  const moves = episodeMoves(ds);
  const spec = fullSpec(ds);
  const dir = stageDir('sweeps');
  const grids = sweepGrids();
  const summary: Record<string, { points: number; runtimeMs: number }> = {};

  evaluator.register(ds);
  await fs.ensureDir(dir);

  for (const familyKey of singleMechanismKeys) {
    const family = families[familyKey]!;
    const started = Date.now();
    const paramsList = grids[familyKey]!.map((overrides) => set2Params(family, overrides));
    const metricsList = await evaluator.evaluate(ds.id, familyKey, spec, paramsList);
    const rows: SweepRow[] = paramsList.map((params, index) => {
      const metrics = metricsList[index]!;
      // The 2023 attribution needs the trades: recompute in detail only for rows that trade in the window.
      const detail = evaluateCandidate(ds, highs, familyKey, params, spec, true).detail!;
      const attribution = episodeAttribution(tradeRows(ds, detail.trades, detail.accounting), moves);
      const r2023 = attribution.find((row) => row.key === 'r2023')!;

      return {
        familyKey,
        params,
        id: candidateId(family, params),
        metrics,
        r2023: {
          trades: r2023.trades,
          net: r2023.net,
          firstEntry: r2023.firstEntry,
          capturedShare: r2023.capturedShare
        }
      };
    });

    summary[familyKey] = { points: rows.length, runtimeMs: Date.now() - started };
    await writeJson(path.join(dir, `${familyKey}.json`), rows);

    const keys = family.paramKeys.filter(
      (key) =>
        ![
          'targetPercentChange',
          'trailingBuyPercentage',
          'trailingStopPercentage',
          'maximumHoldDays',
          'tickWindowSize',
          'intradayLossBuffer'
        ].includes(key)
    );
    const csv = [
      [
        ...keys,
        'id',
        'net',
        'minute_dd',
        'daily_dd',
        'entries',
        'wins',
        'losses',
        'worst_trade',
        'worst_streak',
        'interest',
        'r2023_trades',
        'r2023_net',
        'r2023_first_entry',
        'signature'
      ].join(',')
    ];

    for (const row of rows) {
      csv.push(
        [
          ...keys.map((key) => row.params[key]),
          row.id,
          row.metrics.net,
          row.metrics.minuteDrawdown,
          row.metrics.dailyDrawdown,
          row.metrics.entries,
          row.metrics.wins,
          row.metrics.losses,
          row.metrics.worstTrade,
          row.metrics.worstEpisodeLoss,
          row.metrics.interest,
          row.r2023.trades,
          row.r2023.net,
          row.r2023.firstEntry,
          row.metrics.signature
        ].join(',')
      );
    }

    await fs.writeFile(path.join(dir, `${familyKey}.csv`), `${csv.join('\n')}\n`);
    console.info(`${familyKey}: ${rows.length} sweep points in ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }

  await writeJson(path.join(dir, 'summary.json'), { protocol: protocol.version, datasetId: ds.id, summary });
  await evaluator.close();
};

// Selection policies (PROTOCOL.md section 3.4) on a stage's records.
export interface Pick {
  policy: string;
  id: string;
  params: IntParams;
  metrics: Metrics;
}

export const paretoFront = (records: CandidateRecord[]) => {
  const feasible = records.filter((record) => record.violation === 0);
  const sorted = [...feasible].sort(
    (a, b) => b.metrics.net - a.metrics.net || a.metrics.minuteDrawdown - b.metrics.minuteDrawdown
  );
  const front: CandidateRecord[] = [];
  let bestDrawdown = Infinity;

  for (const record of sorted) {
    if (record.metrics.minuteDrawdown < bestDrawdown) {
      front.push(record);
      bestDrawdown = record.metrics.minuteDrawdown;
    }
  }

  return front;
};

export const selectPicks = (records: CandidateRecord[]): { picks: Pick[]; top10: Pick[]; front: CandidateRecord[] } => {
  const front = paretoFront(records);
  const feasible = records.filter((record) => record.violation === 0);
  const byNet = [...feasible].sort((a, b) => b.metrics.net - a.metrics.net || a.id.localeCompare(b.id));
  const maxNet = byNet[0];
  const balanced = byNet.find((record) => record.metrics.minuteDrawdown <= 25000);
  const lowDd = maxNet
    ? [...feasible]
        .filter((record) => record.metrics.net >= 0.75 * maxNet.metrics.net)
        .sort(
          (a, b) =>
            a.metrics.minuteDrawdown - b.metrics.minuteDrawdown ||
            b.metrics.net - a.metrics.net ||
            a.id.localeCompare(b.id)
        )[0]
    : undefined;
  const asPick = (policy: string, record: CandidateRecord | undefined): Pick[] =>
    record ? [{ policy, id: record.id, params: record.params, metrics: record.metrics }] : [];
  const top10: Pick[] = [];
  const signatures = new Set<string>();

  for (const record of byNet) {
    if (signatures.has(record.metrics.signature)) {
      continue;
    }

    signatures.add(record.metrics.signature);
    top10.push({ policy: `top${top10.length + 1}`, id: record.id, params: record.params, metrics: record.metrics });

    if (top10.length === 10) {
      break;
    }
  }

  return {
    picks: [...asPick('maxNet', maxNet), ...asPick('balanced', balanced), ...asPick('lowDd', lowDd)],
    top10,
    front
  };
};

export interface StageResult {
  familyKey: string;
  fit: FitKey;
  stats: StageStats;
  picks: Pick[];
  top10: Pick[];
  front: { id: string; params: IntParams; net: number; minuteDrawdown: number; entries: number }[];
  feasible: number;
}

export const search = async (data: Data, args: string[]) => {
  const { ds } = data;
  const evaluator = makeEvaluator(args);
  const familyKeys = option(args, 'families')?.split(',') ?? Object.keys(families);
  const fitKeys = (option(args, 'fits')?.split(',') ?? protocol.fits.map((fit) => fit.key)) as FitKey[];
  const quick = args.includes('--quick');
  const config = quick ? { ...defaultSearch, sobolSamples: 512, generations: 10, populationSize: 64 } : defaultSearch;

  evaluator.register(ds);

  for (const fit of fitKeys) {
    const spec = trainingSpec(ds, fit);
    const required = minEntries(ds, fit);

    for (const familyKey of familyKeys) {
      const family = families[familyKey]!;
      const dir = stageDir('search', fit, familyKey);
      const resultFile = path.join(dir, 'stage.json');

      if (await exists(resultFile)) {
        console.info(`${fit} ${familyKey}: already done (${resultFile})`);
        continue;
      }

      const { records, stats } = await runSearchStage(
        { evaluator, datasetId: ds.id, family, spec, minEntries: required, seedLabel: fit, dir, log: console.info },
        config
      );
      const { picks, top10, front } = selectPicks(records);
      const result: StageResult = {
        familyKey,
        fit,
        stats,
        picks,
        top10,
        front: front.map((record) => ({
          id: record.id,
          params: record.params,
          net: record.metrics.net,
          minuteDrawdown: record.metrics.minuteDrawdown,
          entries: record.metrics.entries
        })),
        feasible: records.filter((record) => record.violation === 0).length
      };

      await writeJson(resultFile, result);
      console.info(
        `${fit} ${familyKey}: ${stats.unique} unique evaluations, ${result.feasible} feasible, front ${front.length}; ${picks.map((pick) => `${pick.policy} ${describeParams(family, pick.params)} → ${Math.round(pick.metrics.net)} / ${Math.round(pick.metrics.minuteDrawdown)}`).join('; ')}`
      );
    }
  }

  await evaluator.close();
};

// Walk-forward: every fold's picks (and top10) on the fold's validation window, plus Set 2 frozen.
export interface ValidationRow {
  fit: FitKey;
  familyKey: string;
  policy: string;
  id: string;
  params: IntParams;
  training: { net: number; minuteDrawdown: number; entries: number };
  validation: Metrics;
}

export const validate = async (data: Data, args: string[]) => {
  const { ds } = data;
  const highs = new ReferenceHighCache(ds);
  const familyKeys = option(args, 'families')?.split(',') ?? Object.keys(families);
  const rows: ValidationRow[] = [];

  for (const fit of ['fold1', 'fold2', 'fold3'] as FitKey[]) {
    const spec = validationSpec(ds, fit);

    // Set 2 frozen, as the unoptimized reference on every window.
    const set2 = evaluateCandidate(ds, highs, 'base', set2Params(families.base!), spec).metrics;

    rows.push({
      fit,
      familyKey: 'set2',
      policy: 'frozen',
      id: 'set2',
      params: set2Params(families.base!),
      training: { net: NaN, minuteDrawdown: NaN, entries: NaN },
      validation: set2
    });

    for (const familyKey of familyKeys) {
      const file = stageDir('search', fit, familyKey, 'stage.json');

      if (!(await exists(file))) {
        console.info(`${fit} ${familyKey}: no stage result`);
        continue;
      }

      const stage = await readJson<StageResult>(file);

      for (const pick of [...stage.picks, ...stage.top10]) {
        const validation = evaluateCandidate(ds, highs, familyKey, pick.params, spec).metrics;

        rows.push({
          fit,
          familyKey,
          policy: pick.policy,
          id: pick.id,
          params: pick.params,
          training: {
            net: pick.metrics.net,
            minuteDrawdown: pick.metrics.minuteDrawdown,
            entries: pick.metrics.entries
          },
          validation
        });
      }
    }
  }

  await writeJson(stageDir('validation', 'rows.json'), rows);
  console.info(`Wrote ${rows.length} validation rows`);
};

// The one-parameter neighbourhood of a candidate on a window.
export const neighbourhood = (data: Data, familyKey: string, params: IntParams, spec: EvalSpec) => {
  const { ds } = data;
  const highs = new ReferenceHighCache(ds);
  const family = families[familyKey]!;
  const centre = evaluateCandidate(ds, highs, familyKey, params, spec).metrics;
  const probes: { key: string; value: number; metrics: Metrics }[] = [];

  for (const spec_ of familySpecs(family)) {
    for (const offset of spec_.probes) {
      const value = params[spec_.key]! + offset * spec_.step;

      if (value < spec_.min || value > spec_.max) {
        continue;
      }

      probes.push({
        key: spec_.key,
        value,
        metrics: evaluateCandidate(ds, highs, familyKey, { ...params, [spec_.key]: value }, spec).metrics
      });
    }
  }

  const within = probes.filter(
    (probe) =>
      Math.abs(probe.metrics.net - centre.net) <= 0.2 * Math.abs(centre.net) &&
      probe.metrics.minuteDrawdown <= protocol.drawdownCeiling
  ).length;

  return { centre, probes, stability: probes.length > 0 ? within / probes.length : 0 };
};

export { specs, violationOf, type Family };
