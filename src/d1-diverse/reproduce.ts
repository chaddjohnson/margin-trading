// `npm run diverse-d1 -- reproduce` (PROTOCOL.md §18, before the freeze): the frozen comparators reproduced before any
// candidate figure. B1/B4/B5/C0 (frozen books) on the N-book engine, fixed and portfolio, 0/2/5/10 bps, on training in
// the full eligible load and on `all` through the benchmark door, equal field for field to the 16-ETF study's records;
// the vector-named view of the benchmark books equals the frozen books on the replay; the symmetric-convention
// training portfolios are recorded. Any difference stops the study.
import { runFrozen } from '../joint-16-etf-d1/controls.ts';
import { searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { JointEvaluator } from '../joint-16-etf-d1/evaluator.ts';
import { summaryOf } from '../joint-16-etf-d1/figures.ts';
import { RobustEvaluator } from '../d1-robust/evaluator.ts';
import { portfolioSpec } from '../d1-robust/promote.ts';
import { compareValues } from '../portfolio-aware-d1/compare.ts';
import { figuresOfRun } from '../portfolio-aware-d1/stageC.ts';
import { jsonReplacer, legacy, log, nowIso, readJson, stageDir, study, writeJson } from './context.ts';
import { benchmarkUniverse, doorRecordOf, trainingUniverse } from './data.ts';
import { codeState, requireCommitted } from './freeze.ts';

type Previous = {
  training: Record<string, Record<string, { figures: unknown }>>;
  all: Record<string, Record<string, { summary: unknown }>>;
};

export const reproduceFile = stageDir('reproduce', 'reproduce.json');

const same = (a: unknown, b: unknown) =>
  compareValues(JSON.parse(JSON.stringify(a, jsonReplacer)), JSON.parse(JSON.stringify(b, jsonReplacer)), {
    maxDifferences: 5
  });

export const runReproduce = async () => {
  await requireCommitted();

  const previous = await readJson<Previous>(legacy.controlsFile);
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

        records.training![`${key}-${mode}-${costBps}`] = { differences };
      }
    }
  }

  const evaluator = await RobustEvaluator.create(training, study.neighbourWindowLabel('final'), 0);
  const searchBooks = await searchBenchmarkBooks();

  for (const key of ['B1', 'B4', 'B5'] as const) {
    for (const costBps of study.costsBps) {
      const [evaluation] = await evaluator.centres([searchBooks[key]], costBps);
      const summary = summaryOf(await runFrozen(training, key, 'fixed', costBps));
      const equal =
        evaluation!.net === summary.net &&
        evaluation!.minuteDrawdown === summary.minuteDrawdown &&
        evaluation!.lots === summary.lots;

      if (!equal) {
        failures.push(`the vector-named view of ${key} at ${costBps} bps differs from the frozen books`);
      }

      records.naming![`${key}-${costBps}`] = { equal };
    }

    const [symmetric] = await evaluator.engines([portfolioSpec(evaluator, searchBooks[key], `${key}-symmetric`)]);

    records.symmetric![key] = { dailyPercent: symmetric!.dailyPercent, minutePercent: symmetric!.minutePercent };
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
        const summary = summaryOf(await runFrozen(all, key, mode, costBps), key === 'B5' ? ['GDX'] : []);
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
      }
    }
  }

  const record = {
    generatedAt: nowIso(),
    codeState: await codeState(),
    node: process.version,
    reference: legacy.controlsFile,
    note: 'the benchmarks are inspected comparators; these anchors are reproduction checks, not projected returns',
    trainingDoor: doorRecordOf('trainingUniverse', training, 'final'),
    allLastSession: all.universe.end,
    records,
    failures,
    passed: failures.length === 0
  };

  await writeJson(reproduceFile, record);
  log(`reproduce: ${failures.length} failures`);

  if (failures.length > 0) {
    throw new Error(`The benchmark reproduction failed (study stopped): ${failures.slice(0, 3).join('; ')}`);
  }

  return record;
};

export const requireReproduced = async () => {
  const record = await readJson<{ passed: boolean }>(reproduceFile).catch(() => undefined);

  if (!record?.passed) {
    throw new Error('The benchmark reproduction has not passed');
  }
};
