// One training run of the minute optimizer: 4,096 unique scrambled Sobol candidates (or uniform random ones
// for the control), then independent NSGA-II runs seeded from a strong, diverse subset. The exploration
// sampler, the NSGA-II loop, the operators and the Pareto machinery are the daily optimizer's, reused
// unchanged (src/optimizer/search.ts, nsga2.ts, sobol.ts, rng.ts); only the evaluation cache is minute
// specific. Every evaluation goes through that cache, keyed by candidate ID, so a discrete candidate is
// simulated once per window whichever stage produces it.
import type { MinuteParams } from '../app/allIn-minute-optimizable.ts';
import { defaultFitness as dailyFitness } from '../optimizer/fitness.ts';
import type { Scored } from '../optimizer/nsga2.ts';
import {
  type Genome,
  type ParameterSpace,
  candidateId,
  genomeToParams,
  gridSize,
  neighbourGenomes
} from '../optimizer/params.ts';
import { Rng } from '../optimizer/rng.ts';
import {
  type CandidateCache as DailyCandidateCache,
  type SearchConfig,
  type TrainingRunOutput,
  runSearch as runDailySearch
} from '../optimizer/search.ts';
import type { EngineSettings, EvalWindow } from './engine.ts';
import type { MinuteMetrics } from './evaluate.ts';
import { type MinuteFitnessConfig, objectivesOf, violationOf } from './fitness.ts';
import type { MinuteEvaluator } from './pool.ts';

export type Origin =
  | { stage: 'sobol'; index: number }
  | { stage: 'random'; index: number }
  | { stage: 'ga'; run: number; generation: number }
  | { stage: 'neighborhood'; of: string }
  | { stage: 'perturbation'; of: string }
  | { stage: 'control' };

export interface MinuteCandidate extends Scored {
  params: MinuteParams;
  metrics: MinuteMetrics;
  origin: Origin;
}

// The evaluation cache for one dataset, window and engine setting.
export class MinuteCandidateCache {
  readonly entries = new Map<string, MinuteCandidate>();
  simulations = 0;

  constructor(
    private readonly evaluator: MinuteEvaluator,
    private readonly datasetId: string,
    readonly window: EvalWindow,
    private readonly settings: EngineSettings,
    private readonly space: ParameterSpace,
    private readonly fitness: MinuteFitnessConfig,
    private readonly years: number
  ) {}

  async evaluate(genomes: Genome[], origins: Origin[]): Promise<MinuteCandidate[]> {
    const ids = genomes.map((genome) => candidateId(this.space, genomeToParams(this.space, genome)));
    const missing = new Map<string, { genome: Genome; origin: Origin }>();

    ids.forEach((id, index) => {
      if (!this.entries.has(id) && !missing.has(id)) {
        missing.set(id, { genome: genomes[index]!, origin: origins[index]! });
      }
    });

    if (missing.size > 0) {
      const pending = [...missing.entries()];
      const metrics = await this.evaluator.evaluate(
        this.datasetId,
        this.window,
        this.settings,
        pending.map(([, { genome }]) => genomeToParams(this.space, genome))
      );

      this.simulations += pending.length;
      pending.forEach(([id, { genome, origin }], index) => {
        const result = metrics[index]!;

        this.entries.set(id, {
          id,
          genome,
          params: genomeToParams(this.space, genome),
          metrics: result,
          objectives: objectivesOf(result, this.fitness),
          violation: violationOf(result, this.fitness, this.years),
          origin
        });
      });
    }

    return ids.map((id) => this.entries.get(id)!);
  }

  // The one-step neighbours: each parameter moved by its neighbourhood radius to each side.
  async neighbours(candidate: MinuteCandidate) {
    const genomes = neighbourGenomes(this.space, candidate.genome);

    return this.evaluate(
      genomes,
      genomes.map(() => ({ stage: 'neighborhood', of: candidate.id }))
    );
  }

  // Joint perturbations: every parameter moved at once by a uniform integer offset within its radius,
  // clamped to the grid. Deterministic per candidate. Vectors equal to the candidate are skipped.
  async perturbations(candidate: MinuteCandidate, count: number) {
    const rng = Rng.from('minute-perturbation', candidate.id);
    const genomes: Genome[] = [];
    const seen = new Set([candidate.genome.join(',')]);

    for (let attempt = 0; genomes.length < count && attempt < count * 10; attempt++) {
      const genome = this.space.specs.map((spec, dimension) => {
        const offset = rng.int(2 * spec.neighborhoodRadius + 1) - spec.neighborhoodRadius;

        return Math.min(gridSize(spec) - 1, Math.max(0, candidate.genome[dimension]! + offset));
      });
      const key = genome.join(',');

      if (!seen.has(key)) {
        seen.add(key);
        genomes.push(genome);
      }
    }

    return this.evaluate(
      genomes,
      genomes.map(() => ({ stage: 'perturbation', of: candidate.id }))
    );
  }
}

export interface MinuteTrainingRunInput {
  space: ParameterSpace;
  search: SearchConfig;
  cache: MinuteCandidateCache;
  seedLabels: (string | number)[];
  hypervolumeReference: [number, number];
}

// The daily optimizer's runSearch only calls the cache's evaluate() and reads its simulation count, and
// treats candidates as NSGA-II `Scored` records (id, genome, objectives, violation), which the minute cache
// provides; its fitness argument is unused. The cast below is therefore structural, not semantic.
export const runMinuteSearch = (input: MinuteTrainingRunInput): Promise<TrainingRunOutput> =>
  runDailySearch({
    space: input.space,
    search: input.search,
    fitness: dailyFitness,
    cache: input.cache as unknown as DailyCandidateCache,
    seedLabels: input.seedLabels,
    hypervolumeReference: input.hypervolumeReference
  });
