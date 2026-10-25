// `npm run robust-d1 -- controls` (PROTOCOL.md §18): the frozen comparators reproduced before any candidate figure.
// B4 and B5 (frozen books) on the N-book engine, fixed and portfolio, 0/2/5/10 bps, on training in the EXPANDED load
// (every eligible symbol loaded) and on `all` through the benchmark door, equal field for field to the 16-ETF study's
// records (research/joint-16-etf-d1/results/controls/controls.json, which reproduced the portfolio-aware study's);
// B1 and C0 likewise; the search view of the benchmark books (vector-named) equals the frozen books on the replay;
// and the symmetric-dividend portfolio figures (new, recorded).
import { runFrozen } from '../joint-16-etf-d1/controls.ts';
import { searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { JointEvaluator } from '../joint-16-etf-d1/evaluator.ts';
import { summaryOf } from '../joint-16-etf-d1/figures.ts';
import { compareValues } from '../portfolio-aware-d1/compare.ts';
import { figuresOfRun } from '../portfolio-aware-d1/stageC.ts';
import { jsonReplacer, log, nowIso, readJson, stageDir, study, writeJson } from './context.ts';
import { benchmarkUniverse, doorRecordOf, trainingUniverse } from './data.ts';
import { RobustEvaluator } from './evaluator.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { portfolioSpec } from './promote.ts';

export const previousControlsFile = 'research/joint-16-etf-d1/results/controls/controls.json';

type Previous = {
  training: Record<string, Record<string, { figures: unknown }>>;
  all: Record<string, Record<string, { summary: unknown }>>;
};

const same = (a: unknown, b: unknown) =>
  compareValues(JSON.parse(JSON.stringify(a, jsonReplacer)), JSON.parse(JSON.stringify(b, jsonReplacer)), {
    maxDifferences: 5
  });

export const runControls = async () => {
  await requireProtocolFrozen();

  const previous = await readJson<Previous>(previousControlsFile);
  const failures: string[] = [];
  const training = await trainingUniverse('final');
  const periods = new JointEvaluator(training);
  const records: Record<string, Record<string, unknown>> = { training: {}, all: {}, naming: {}, symmetric: {} };

  for (const key of ['B1', 'B4', 'B5', 'C0'] as const) {
    for (const mode of ['fixed', 'portfolio'] as const) {
      if (key === 'C0' && mode === 'fixed') {
        continue;
      }

      for (const costBps of study.costsBps) {
        const result = await runFrozen(training, key, mode, costBps);
        const figures = figuresOfRun(result, key === 'B5' ? ['GDX'] : [], {
          folds: periods.folds,
          regimes: periods.regimes,
          years: periods.years
        });
        const reference = previous.training[key]?.[`${mode}-${costBps}`]?.figures;
        const differences = reference ? same(reference, figures) : ['no reference'];

        if (differences.length > 0) {
          failures.push(`training ${key} ${mode} ${costBps}: ${differences.join('; ')}`);
        }

        records.training![`${key}-${mode}-${costBps}`] = {
          differences,
          net: figures.net,
          endEquity: figures.endEquity
        };
      }
    }
  }

  // The search view (vector-named books) equals the frozen books on the replay.
  const evaluator = await RobustEvaluator.create(training, 'final', 0);
  const searchBooks = await searchBenchmarkBooks();

  for (const key of ['B1', 'B4', 'B5'] as const) {
    for (const costBps of study.costsBps) {
      const [evaluation] = await evaluator.centres([searchBooks[key]], costBps);
      const frozen = await runFrozen(training, key, 'fixed', costBps);
      const summary = summaryOf(frozen);
      const equal =
        evaluation!.net === summary.net &&
        evaluation!.minuteDrawdown === summary.minuteDrawdown &&
        evaluation!.lots === summary.lots;

      if (!equal) {
        failures.push(`search view of ${key} at ${costBps} bps differs from the frozen books`);
      }

      records.naming![`${key}-${costBps}`] = { equal };
    }

    // The symmetric-dividend training portfolio (new figures, recorded; the frozen convention is above).
    const [symmetric] = await evaluator.engines([portfolioSpec(evaluator, searchBooks[key], `${key}-symmetric`)]);

    records.symmetric![key] = symmetric;
  }

  await evaluator.close();

  const all = await benchmarkUniverse(['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX']);

  if (all.universe.end !== study.lastCommonSession) {
    failures.push(`the all window ends ${all.universe.end}, not ${study.lastCommonSession}`);
  }

  for (const key of ['B1', 'B4', 'B5', 'C0'] as const) {
    for (const mode of ['fixed', 'portfolio'] as const) {
      if (key === 'C0' && mode === 'fixed') {
        continue;
      }

      for (const costBps of study.costsBps) {
        const result = await runFrozen(all, key, mode, costBps);
        const summary = summaryOf(result, key === 'B5' ? ['GDX'] : []);
        const reference = previous.all[key]?.[`${mode}-${costBps}`]?.summary;
        const differences = reference ? same(reference, summary) : ['no reference'];

        if (differences.length > 0) {
          failures.push(`all ${key} ${mode} ${costBps}: ${differences.join('; ')}`);
        }

        records.all![`${key}-${mode}-${costBps}`] = {
          differences,
          net: summary.net,
          endEquity: summary.endEquity,
          dailyPercent: summary.dailyPercent,
          minuteDrawdown: summary.minuteDrawdown
        };
        log(`all ${key} ${mode} ${costBps} bps: ${differences.length} differences`);
      }
    }
  }

  const record = {
    generatedAt: nowIso(),
    node: process.version,
    reference: previousControlsFile,
    trainingDoor: doorRecordOf('trainingUniverse', training, 'final'),
    allLastSession: all.universe.end,
    records,
    failures,
    passed: failures.length === 0
  };

  await writeJson(stageDir('controls', 'controls.json'), record);
  log(`controls: ${failures.length} failures`);

  if (failures.length > 0) {
    throw new Error(`The benchmark reproduction failed: ${failures.slice(0, 3).join('; ')}`);
  }

  return record;
};

// "Controls first" (§18): every outcome stage requires the reproduction to have passed.
export const requireControls = async () => {
  const record = await readJson<{ passed: boolean }>(stageDir('controls', 'controls.json')).catch(() => undefined);

  if (!record?.passed) {
    throw new Error('The benchmark reproduction has not passed: run `npm run robust-d1 -- controls` first');
  }
};
