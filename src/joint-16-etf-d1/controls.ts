// The benchmark reproduction (PROTOCOL.md §12), before any outcome claim:
//
// - training: B4 and B5 (frozen books) on the full N-book engine, fixed and portfolio, 0/2/5/10 bps, equal field for
//   field to the previous study's Stage C records (research/portfolio-aware-d1-optimization/results/stageC/stageC.json);
//   B1 and C0 recorded;
// - the full `all` history through the benchmark door (B1/B4/B5 members only): B4 and B5 in both modes at four costs
//   equal field for field to the previous continuous evaluation (results/evaluation/evaluation.json); B1 and C0
//   recorded;
// - the search view of the benchmark books (named by vector ID, as every searched book is) gives exactly the frozen
//   books' numbers on the replay.
import { compareValues } from '../portfolio-aware-d1/compare.ts';
import { baseNRunConfig, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { figuresOfRun } from '../portfolio-aware-d1/stageC.ts';
import { type BenchmarkKey, benchmarkSymbols, frozenBenchmarkPhenotypes, searchBenchmarkBooks } from './benchmarks.ts';
import { jsonReplacer, log, previousEvaluationFile, readJson, stageDir, study, writeJson } from './context.ts';
import { benchmarkUniverse, trainingUniverse } from './data.ts';
import { JointEvaluator } from './evaluator.ts';
import { summaryOf } from './figures.ts';
import { requireProtocolFrozen } from './freeze.ts';

const previousStageCFile = 'research/portfolio-aware-d1-optimization/results/stageC/stageC.json';
const previousKeys: Partial<Record<BenchmarkKey, string>> = { B4: 'S0', B5: 'P-add-GDX' };

export const runFrozen = async (
  loaded: LoadedUniverse,
  key: BenchmarkKey | 'C0',
  mode: 'fixed' | 'portfolio',
  costBps: number,
  fraction: number = study.fraction
) => {
  const phenotypes = await frozenBenchmarkPhenotypes();
  const symbols = key === 'C0' ? [] : benchmarkSymbols[key];
  const members = [...new Set(mode === 'portfolio' ? ['VOOG', 'VGT', ...symbols] : symbols)];

  return runNAllocator(
    {
      ...loaded.universe,
      instruments: Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!]))
    },
    baseNRunConfig({
      key: `${key}-${mode}-${costBps}bps-f${fraction}`,
      label: `${key} ${mode} ${costBps} bps`,
      mode,
      symbols,
      phenotypes,
      costBps,
      fraction,
      eligibilityIndex: loaded.universe.eligibilityIndex,
      accountingStartIndex: loaded.warmup
    })
  );
};

export const runControls = async () => {
  await requireProtocolFrozen();

  const failures: string[] = [];
  const training = await trainingUniverse();
  const evaluator = new JointEvaluator(training);
  const previousStageC = await readJson<{ runs: Record<string, Record<string, Record<string, unknown>>> }>(
    previousStageCFile
  );
  const trainingRecords: Record<string, Record<string, unknown>> = {};

  // Training.
  for (const key of ['B1', 'B4', 'B5', 'C0'] as const) {
    trainingRecords[key] = {};

    for (const mode of ['fixed', 'portfolio'] as const) {
      if (key === 'C0' && mode === 'fixed') {
        continue;
      }

      for (const costBps of study.costsBps) {
        const result = await runFrozen(training, key, mode, costBps);
        const figures = figuresOfRun(result, key === 'B5' ? ['GDX'] : [], {
          folds: evaluator.folds,
          regimes: evaluator.regimes,
          years: evaluator.years
        });
        const previous = previousKeys[key as BenchmarkKey]
          ? previousStageC.runs[previousKeys[key as BenchmarkKey]!]?.[`${mode}-${costBps}`]
          : undefined;
        const differences = previous
          ? compareValues(JSON.parse(JSON.stringify(previous)), JSON.parse(JSON.stringify(figures, jsonReplacer)), {
              maxDifferences: 5
            })
          : [];

        if (differences.length > 0) {
          failures.push(`training ${key} ${mode} ${costBps} bps: ${differences.join('; ')}`);
        }

        trainingRecords[key]![`${mode}-${costBps}`] = {
          figures,
          reference: previous
            ? `${previousStageCFile} runs.${previousKeys[key as BenchmarkKey]}.${mode}-${costBps}`
            : 'none',
          differences
        };
        log(`training ${key} ${mode} ${costBps} bps: ${previous ? `${differences.length} differences` : 'recorded'}`);
      }
    }
  }

  // The search view of the benchmark books equals the frozen books on the replay (every cost).
  const searchBooks = await searchBenchmarkBooks();
  const naming: Record<string, unknown>[] = [];

  for (const key of ['B1', 'B4', 'B5'] as const) {
    for (const costBps of study.costsBps) {
      const fixed = (trainingRecords[key]![`fixed-${costBps}`] as { figures: ReturnType<typeof figuresOfRun> }).figures;
      const { evaluation } = evaluator.evaluate(searchBooks[key], costBps);
      const equal =
        evaluation.net === fixed.net &&
        evaluation.minuteDrawdown === fixed.minuteDrawdown &&
        evaluation.dailyDrawdown === fixed.dailyDrawdown &&
        evaluation.lots === fixed.lots;

      if (!equal) {
        failures.push(`search view of ${key} at ${costBps} bps differs from the frozen books`);
      }

      naming.push({ key, costBps, equal, net: evaluation.net, lots: evaluation.lots });
    }
  }

  // The full `all` history (benchmark door).
  const all = await benchmarkUniverse(['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX']);
  const previousEvaluation = await readJson<{
    window: unknown;
    summaries: Record<string, Record<string, Record<string, unknown>>>;
  }>(previousEvaluationFile);
  const allRecords: Record<string, Record<string, unknown>> = {};

  for (const key of ['B1', 'B4', 'B5', 'C0'] as const) {
    allRecords[key] = {};

    for (const mode of ['fixed', 'portfolio'] as const) {
      if (key === 'C0' && mode === 'fixed') {
        continue;
      }

      for (const costBps of study.costsBps) {
        const result = await runFrozen(all, key, mode, costBps);
        const summary = summaryOf(result, key === 'B5' ? ['GDX'] : []);
        const previous = previousKeys[key as BenchmarkKey]
          ? previousEvaluation.summaries[previousKeys[key as BenchmarkKey]!]?.[`${mode}-${costBps}`]
          : undefined;
        const differences = previous
          ? compareValues(JSON.parse(JSON.stringify(previous)), JSON.parse(JSON.stringify(summary, jsonReplacer)), {
              maxDifferences: 5
            })
          : [];

        if (differences.length > 0) {
          failures.push(`all ${key} ${mode} ${costBps} bps: ${differences.join('; ')}`);
        }

        allRecords[key]![`${mode}-${costBps}`] = {
          summary,
          reference: previous
            ? `${previousEvaluationFile} summaries.${previousKeys[key as BenchmarkKey]}.${mode}-${costBps}`
            : 'none',
          differences
        };
        log(`all ${key} ${mode} ${costBps} bps: ${previous ? `${differences.length} differences` : 'recorded'}`);
      }
    }
  }

  const record = {
    generatedAt: new Date().toISOString(),
    lastSession: all.universe.end,
    training: trainingRecords,
    searchNaming: naming,
    all: allRecords,
    failures,
    passed: failures.length === 0
  };

  await writeJson(stageDir('controls', 'controls.json'), record);
  log(`controls: ${failures.length} failures`);

  if (failures.length > 0) {
    throw new Error(`The benchmark reproduction failed: ${failures.slice(0, 3).join('; ')}`);
  }
};
