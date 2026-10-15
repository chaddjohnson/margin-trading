// One training run: broad exploration with 4,096 unique Sobol candidates (or uniform random ones for the
// control), then independent NSGA-II runs seeded from a well-performing, diverse subset of them. Every
// evaluation goes through one cache keyed by candidate ID, so a discrete candidate is simulated once.
import type { AllInParams } from '../app/allIn-optimizable.ts';
import type { EvalWindow, Metrics } from './evaluate.ts';
import { type FitnessConfig, objectivesOf, violationOf } from './fitness.ts';
import {
  type Ranked,
  type Scored,
  hypervolume2d,
  polynomialMutation,
  sbx,
  selectSurvivors,
  tournament
} from './nsga2.ts';
import {
  type Genome,
  type ParameterSpace,
  candidateId,
  genomeToParams,
  gridSize,
  neighbourGenomes,
  spaceSize
} from './params.ts';
import type { Evaluator } from './pool.ts';
import { Rng, deriveSeed } from './rng.ts';
import { Sobol } from './sobol.ts';

export interface SearchConfig {
  sampler: 'sobol' | 'random';
  samples: number; // unique valid candidates in the exploration stage
  scramble: boolean;
  populationSize: number;
  generations: number;
  maxEvaluationsPerGaRun: number; // new (uncached) simulations per GA run
  gaRuns: number;
  crossoverProbability: number;
  crossoverEta: number;
  mutationEta: number;
  earlyStopPatience: number; // generations without hypervolume gain
  earlyStopTolerance: number; // relative gain that counts as progress
  seedDiversity: number; // minimum normalized L-infinity distance between seeded individuals
}

export const defaultSearch: SearchConfig = {
  sampler: 'sobol',
  samples: 4096,
  scramble: true,
  populationSize: 128,
  generations: 60,
  maxEvaluationsPerGaRun: 6000,
  gaRuns: 2,
  crossoverProbability: 0.9,
  crossoverEta: 15,
  mutationEta: 20,
  earlyStopPatience: 15,
  earlyStopTolerance: 1e-4,
  seedDiversity: 0.02
};

export type Origin =
  | { stage: 'sobol'; index: number }
  | { stage: 'random'; index: number }
  | { stage: 'ga'; run: number; generation: number }
  | { stage: 'neighborhood'; of: string }
  | { stage: 'baseline' };

export interface Candidate extends Scored {
  params: AllInParams;
  metrics: Metrics;
  origin: Origin;
}

export interface GaRunSummary {
  run: number;
  seed: number[];
  generations: number;
  newEvaluations: number;
  hypervolume: number[]; // after each generation, final population
  stopReason: 'generations' | 'budget' | 'stagnation';
  repairs: number;
}

export interface SamplerSummary {
  kind: SearchConfig['sampler'];
  requested: number;
  unique: number;
  drawn: number;
  duplicates: number;
  spaceSize: number;
  exhausted: boolean;
  scrambleSeed?: number[];
}

// The evaluation cache for one dataset and window.
export class CandidateCache {
  readonly entries = new Map<string, Candidate>();
  simulations = 0;

  constructor(
    private readonly evaluator: Evaluator,
    private readonly datasetId: string,
    private readonly window: EvalWindow,
    private readonly space: ParameterSpace,
    private readonly fitness: FitnessConfig,
    private readonly years: number
  ) {}

  async evaluate(genomes: Genome[], origins: Origin[]): Promise<Candidate[]> {
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

  async neighbours(candidate: Candidate) {
    const genomes = neighbourGenomes(this.space, candidate.genome);

    return this.evaluate(
      genomes,
      genomes.map(() => ({ stage: 'neighborhood', of: candidate.id }))
    );
  }
}

const toGenome = (space: ParameterSpace, point: number[]): Genome =>
  space.specs.map((spec, dimension) => Math.min(gridSize(spec) - 1, Math.floor(point[dimension]! * gridSize(spec))));

// The exploration stage: unique grid candidates from a Sobol (or random) stream, continuing past
// duplicates until `samples` unique candidates or the whole space.
export const explorationGenomes = (space: ParameterSpace, config: SearchConfig, seedLabels: (string | number)[]) => {
  const total = spaceSize(space);
  const target = Math.min(config.samples, total);
  const scrambleSeed = config.scramble ? deriveSeed(...seedLabels, 'sobol-scramble') : undefined;
  const sobol = new Sobol({
    dimensions: space.specs.length,
    scramble: scrambleSeed ? { seed: scrambleSeed } : undefined
  });
  const rng = Rng.from(...seedLabels, 'random-sampler');
  const seen = new Set<string>();
  const genomes: Genome[] = [];
  let drawn = 0;
  const maxDraws = Math.max(target * 64, 1 << 16);

  while (genomes.length < target && drawn < maxDraws) {
    const point = config.sampler === 'sobol' ? sobol.next() : space.specs.map(() => rng.next());
    const genome = toGenome(space, point);
    const key = genome.join(',');

    drawn++;

    if (!seen.has(key)) {
      seen.add(key);
      genomes.push(genome);
    }
  }

  const summary: SamplerSummary = {
    kind: config.sampler,
    requested: config.samples,
    unique: genomes.length,
    drawn,
    duplicates: drawn - genomes.length,
    spaceSize: total,
    exhausted: genomes.length < config.samples,
    scrambleSeed: config.sampler === 'sobol' ? scrambleSeed : undefined
  };

  return { genomes, summary };
};

const normalizedLinf = (space: ParameterSpace, a: Genome, b: Genome) => {
  let distance = 0;

  space.specs.forEach((spec, dimension) => {
    distance = Math.max(distance, Math.abs(a[dimension]! - b[dimension]!) / Math.max(1, gridSize(spec) - 1));
  });

  return distance;
};

// The initial GA population: candidates in NSGA-II order (front, then crowding), skipping any closer than
// `seedDiversity` to one already chosen; topped up in the same order if that leaves too few.
export const seedPopulation = (space: ParameterSpace, explored: Candidate[], size: number, minDistance: number) => {
  const ordered = selectSurvivors(explored, explored.length).map((ranked) => ranked.member);
  const chosen: Candidate[] = [];

  for (const candidate of ordered) {
    if (chosen.length >= size) {
      break;
    }

    if (chosen.every((other) => normalizedLinf(space, candidate.genome, other.genome) >= minDistance)) {
      chosen.push(candidate);
    }
  }

  for (const candidate of ordered) {
    if (chosen.length >= size) {
      break;
    }

    if (!chosen.includes(candidate)) {
      chosen.push(candidate);
    }
  }

  return chosen;
};

export interface TrainingRunInput {
  space: ParameterSpace;
  search: SearchConfig;
  fitness: FitnessConfig;
  cache: CandidateCache;
  seedLabels: (string | number)[];
  hypervolumeReference: [number, number];
}

export interface TrainingRunOutput {
  sampler: SamplerSummary;
  gaRuns: GaRunSummary[];
  seeded: string[]; // IDs of the initial GA population
}

export const runSearch = async (input: TrainingRunInput): Promise<TrainingRunOutput> => {
  const { space, search, cache, seedLabels } = input;
  const { genomes, summary } = explorationGenomes(space, search, seedLabels);
  const explored = await cache.evaluate(
    genomes,
    genomes.map((_genome, index) => ({ stage: search.sampler, index }))
  );
  const seeded = seedPopulation(space, explored, search.populationSize, search.seedDiversity);
  const gaRuns: GaRunSummary[] = [];

  for (let run = 0; run < search.gaRuns; run++) {
    const seed = deriveSeed(...seedLabels, 'ga', run);
    const rng = new Rng(seed);
    const startSimulations = cache.simulations;
    let population: Ranked<Candidate>[] = selectSurvivors(seeded, search.populationSize);
    const hypervolume: number[] = [];
    let stopReason: GaRunSummary['stopReason'] = 'generations';
    let best = hypervolume2d(
      population.map((ranked) => ranked.member),
      input.hypervolumeReference
    );
    let stagnant = 0;
    let repairs = 0;
    let generation = 0;

    for (generation = 1; generation <= search.generations; generation++) {
      const taken = new Set(population.map((ranked) => ranked.member.id));
      const offspring: Genome[] = [];

      while (offspring.length < search.populationSize) {
        const parentA = tournament(population, rng).member;
        const parentB = tournament(population, rng).member;
        const crossed = sbx(space, parentA.genome, parentB.genome, rng, search);

        repairs += crossed.repairs;

        for (const child of crossed.children) {
          if (offspring.length >= search.populationSize) {
            break;
          }

          let mutated = polynomialMutation(space, child, rng, search);
          let id = candidateId(space, genomeToParams(space, mutated.genome));

          for (let attempt = 0; attempt < 5 && taken.has(id); attempt++) {
            mutated = polynomialMutation(space, mutated.genome, rng, { ...search, mutationProbability: 0.5 });
            id = candidateId(space, genomeToParams(space, mutated.genome));
          }

          repairs += mutated.repairs;
          taken.add(id);
          offspring.push(mutated.genome);
        }
      }

      const children = await cache.evaluate(
        offspring,
        offspring.map(() => ({ stage: 'ga', run, generation }))
      );
      const combined = new Map<string, Candidate>();

      for (const candidate of [...population.map((ranked) => ranked.member), ...children]) {
        combined.set(candidate.id, candidate);
      }

      population = selectSurvivors([...combined.values()], search.populationSize);

      const volume = hypervolume2d(
        population.map((ranked) => ranked.member),
        input.hypervolumeReference
      );

      hypervolume.push(volume);
      stagnant = volume > best * (1 + search.earlyStopTolerance) + 1e-12 ? 0 : stagnant + 1;
      best = Math.max(best, volume);

      if (cache.simulations - startSimulations >= search.maxEvaluationsPerGaRun) {
        stopReason = 'budget';
        break;
      }

      if (stagnant >= search.earlyStopPatience) {
        stopReason = 'stagnation';
        break;
      }
    }

    gaRuns.push({
      run,
      seed,
      generations: Math.min(generation, search.generations),
      newEvaluations: cache.simulations - startSimulations,
      hypervolume,
      stopReason,
      repairs
    });
  }

  return { sampler: summary, gaRuns, seeded: seeded.map((candidate) => candidate.id) };
};
