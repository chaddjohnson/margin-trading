// Sequential versus parallel evaluation speed on real data, with a check that every evaluator returns
// identical metrics.
import os from 'node:os';
import type { Manifest } from './data/prepare.ts';
import type { DatasetArrays } from './evaluate.ts';
import { windowInfo } from './experiment.ts';
import { defaultParameterSpace, genomeToParams } from './params.ts';
import { type Evaluator, LocalEvaluator, WorkerPool } from './pool.ts';
import type { Protocol } from './protocol.ts';
import { defaultSearch, explorationGenomes } from './search.ts';
import { assertResearchView, researchSeries } from './series.ts';

export interface BenchmarkOptions {
  manifest: Manifest;
  symbol: string;
  protocol: Protocol;
  samples: number;
  repeats: number;
  workerCounts: number[];
  log?: (line: string) => void;
}

export const benchmark = async (options: BenchmarkOptions) => {
  const log = options.log ?? (() => {});
  const series = await researchSeries(options.symbol, options.manifest, options.protocol.researchEnd);

  assertResearchView(series, options.protocol.researchEnd);

  const dataset: DatasetArrays = {
    id: `bench:${options.symbol}`,
    symbol: options.symbol,
    time: series.time,
    open: series.open,
    high: series.high,
    low: series.low,
    close: series.close,
    years: series.years
  };
  const window = windowInfo(series, options.protocol.final.train);
  const params = explorationGenomes(defaultParameterSpace, { ...defaultSearch, samples: options.samples }, [
    'benchmark'
  ]).genomes.map((genome) => genomeToParams(defaultParameterSpace, genome));
  const runs: { evaluator: string; workers: number; seconds: number[]; evaluationsPerSecond: number; rssMb: number }[] =
    [];
  let reference: string | undefined;
  let identical = true;

  const measure = async (evaluator: Evaluator, workers: number) => {
    const seconds: number[] = [];

    evaluator.register(dataset);

    // One warm-up pass (worker start-up, dataset transfer, JIT), then timed repeats.
    const first = JSON.stringify(await evaluator.evaluate(dataset.id, window, params));

    reference ??= first;
    identical &&= first === reference;

    for (let repeat = 0; repeat < options.repeats; repeat++) {
      const started = performance.now();

      await evaluator.evaluate(dataset.id, window, params);
      seconds.push((performance.now() - started) / 1000);
    }

    await evaluator.close();

    const best = Math.min(...seconds);

    runs.push({
      evaluator: evaluator.description,
      workers,
      seconds,
      evaluationsPerSecond: params.length / best,
      rssMb: process.memoryUsage().rss / 1e6
    });
    log(
      `${evaluator.description}: best ${best.toFixed(2)} s for ${params.length} evaluations (${Math.round(params.length / best)}/s)`
    );
  };

  await measure(new LocalEvaluator(), 0);

  for (const workers of options.workerCounts) {
    await measure(new WorkerPool({ size: workers }), workers);
  }

  return {
    measuredAtUtc: new Date().toISOString(),
    symbol: options.symbol,
    window: { start: window.firstSession, end: window.lastSession, sessions: window.endIndex - window.startIndex + 1 },
    evaluations: params.length,
    cpu: os.cpus()[0]?.model,
    availableParallelism: os.availableParallelism(),
    node: process.version,
    identicalAcrossEvaluators: identical,
    runs
  };
};
