// Throughput and memory of the fast engine on the real minute data, in-process and with 1/2/4/8 worker
// threads, with a check that every evaluator returns identical metrics, plus the literal working copy's
// speed for comparison and a projection of the full research budget.
import os from 'node:os';
import type { MarketSession } from '#types';
import { genomeToParams } from '../optimizer/params.ts';
import { defaultSearch, explorationGenomes } from '../optimizer/search.ts';
import type { MinuteDataset } from './data.ts';
import { defaultSettings } from './engine.ts';
import { windowInfo } from './experiment.ts';
import { minuteParameterSpace } from './params.ts';
import { LocalEvaluator, type MinuteEvaluator, WorkerPool } from './pool.ts';
import { defaultMinuteProtocol } from './protocol.ts';
import { runReference } from './reference.ts';

export const benchmark = async (options: {
  dataset: MinuteDataset;
  sessions: MarketSession[];
  samples: number;
  repeats: number;
  workerCounts: number[];
  log?: (line: string) => void;
}) => {
  const log = options.log ?? (() => {});
  const { dataset } = options;
  const train = defaultMinuteProtocol.final.train;
  const info = windowInfo(dataset, train);
  const window = { historyStart: info.historyStart, startIndex: info.startIndex, endIndex: info.endIndex };
  const params = explorationGenomes(minuteParameterSpace, { ...defaultSearch, samples: options.samples }, [
    'minute-benchmark'
  ]).genomes.map((genome) => genomeToParams(minuteParameterSpace, genome));
  const runs: { evaluator: string; workers: number; seconds: number[]; evaluationsPerSecond: number; rssMb: number }[] =
    [];
  let reference: string | undefined;
  let identical = true;

  const measure = async (evaluator: MinuteEvaluator, workers: number) => {
    const seconds: number[] = [];

    evaluator.register(dataset);

    const first = JSON.stringify(await evaluator.evaluate(dataset.id, window, defaultSettings, params));

    reference ??= first;
    identical &&= first === reference;

    for (let repeat = 0; repeat < options.repeats; repeat++) {
      const started = performance.now();
      const result = JSON.stringify(await evaluator.evaluate(dataset.id, window, defaultSettings, params));

      seconds.push((performance.now() - started) / 1000);
      identical &&= result === reference;
    }

    const best = Math.min(...seconds);
    const run = {
      evaluator: evaluator.description,
      workers,
      seconds,
      evaluationsPerSecond: params.length / best,
      rssMb: Math.round(process.memoryUsage().rss / 2 ** 20)
    };

    runs.push(run);
    log(
      `${run.evaluator}: best ${best.toFixed(2)} s, ${Math.round(run.evaluationsPerSecond)} evaluations/s, RSS ${run.rssMb} MB`
    );
    await evaluator.close();
  };

  await measure(new LocalEvaluator(), 0);

  for (const workers of options.workerCounts) {
    await measure(new WorkerPool({ size: workers }), workers);
  }

  // The literal working copy, on a handful of the same vectors, for comparison.
  const literalSeconds: number[] = [];

  for (const candidate of params.slice(0, 8)) {
    const started = performance.now();

    await runReference(options.sessions, {
      params: candidate,
      startDate: train.start,
      endDate: train.end,
      warmup: true,
      costBps: [...defaultSettings.costBps]
    });
    literalSeconds.push((performance.now() - started) / 1000);
  }

  const literalPerEvaluation = literalSeconds.reduce((total, value) => total + value, 0) / literalSeconds.length;
  const inProcess = runs[0]!.evaluationsPerSecond;

  log(
    `literal working copy: ${literalPerEvaluation.toFixed(3)} s per evaluation (${(1 / literalPerEvaluation).toFixed(1)}/s)`
  );

  return {
    generatedAtUtc: new Date().toISOString(),
    window: info,
    samples: params.length,
    repeats: options.repeats,
    identicalAcrossEvaluators: identical,
    cpu: os.cpus()[0]?.model ?? 'unknown',
    cores: os.availableParallelism(),
    node: process.version,
    runs,
    literalWorkingCopy: { secondsPerEvaluation: literalPerEvaluation, samples: literalSeconds.length },
    speedupOverLiteral: inProcess * literalPerEvaluation,
    datasetMb: Math.round(
      (dataset.barCount * (8 * 6 + 4 + 1) + (dataset.barCount + 2 * dataset.sessionCount) * 8 * 3) / 2 ** 20
    )
  };
};
