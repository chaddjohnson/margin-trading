// Training search for one entry family on one training window: 4,096 unique quantized Sobol candidates
// (or, as the diagnostic control, seeded uniform random ones), the brief's anchors, then independent
// NSGA-II runs on the two co-primary objectives. Every family gets the same budget. All randomness comes
// from label-derived seeds, and every evaluation goes through one cache, so a run is reproducible and
// independent of the worker count. The Sobol generator and the NSGA-II operators are the repository's
// own (src/optimizer/sobol.ts, nsga2.ts, rng.ts), used unchanged.
import {
  type Ranked,
  type Scored,
  hypervolume2d,
  polynomialMutation,
  sbx,
  selectSurvivors,
  tournament
} from '../optimizer/nsga2.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import type { RunOptions, StrategyParams } from './engine.ts';
import type { CompactMetrics, Job } from './evaluate.ts';
import {
  type Genome,
  type Space,
  asOptimizerSpace,
  canonicalParams,
  genomeToParams,
  gridSize,
  paramsId,
  paramsToGenome,
  spaceSize
} from './params.ts';
import type { Evaluator } from './pool.ts';

export interface SearchConfig {
  sampler: 'sobol' | 'random';
  samples: number;
  scramble: boolean;
  populationSize: number;
  generations: number;
  gaRuns: number;
  crossoverProbability: number;
  crossoverEta: number;
  mutationEta: number;
  seedDiversity: number;
}

export const searchConfig: SearchConfig = {
  sampler: 'sobol',
  samples: 4096,
  scramble: true,
  populationSize: 128,
  generations: 100,
  gaRuns: 2,
  crossoverProbability: 0.9,
  crossoverEta: 15,
  mutationEta: 20,
  seedDiversity: 0.02
};

export const allocation = 100000;
export const minEntriesPerYear = 1;

export type Origin =
  | { stage: 'sobol' | 'random'; index: number }
  | { stage: 'anchor'; name: string }
  | { stage: 'ga'; run: number; generation: number }
  | { stage: 'neighbourhood'; of: string };

export interface Candidate extends Scored {
  params: StrategyParams;
  genome: Genome;
  metrics: CompactMetrics;
  signature: string;
  origin: Origin;
}

export interface EvalContext {
  datasetId: string;
  foldId: string;
  startIndex: number;
  endIndex: number;
  years: number; // calendar years of the window, for the minimum-activity constraint
  options?: Partial<RunOptions>;
}

export const minimumEntries = (years: number) => Math.ceil(minEntriesPerYear * years - 1e-9);

export const objectivesOf = (metrics: CompactMetrics) => [
  -metrics.netProfit / allocation,
  metrics.maximumDrawdown / allocation
];

export const violationOf = (metrics: CompactMetrics, years: number) => {
  const required = minimumEntries(years);

  return required > 0 ? Math.max(0, required - metrics.entries) / required : 0;
};

const optionsKey = (options?: Partial<RunOptions>) =>
  JSON.stringify(Object.fromEntries(Object.entries(options ?? {}).sort(([a], [b]) => (a < b ? -1 : 1))));

// One cache for a dataset, fold window and run options. Keys carry all of them plus the full parameter
// vector (which includes the entry family), so nothing is ever reused across contexts.
export class CandidateCache {
  readonly entries = new Map<string, Candidate>();
  simulations = 0;
  private readonly prefix: string;

  constructor(
    private readonly evaluator: Evaluator,
    private readonly space: Space,
    readonly context: EvalContext
  ) {
    this.prefix = `${context.datasetId}|${context.foldId}|${context.startIndex}-${context.endIndex}|${optionsKey(context.options)}`;
  }

  keyOf(params: StrategyParams) {
    return `${this.prefix}|${canonicalParams(params)}`;
  }

  get(params: StrategyParams) {
    return this.entries.get(this.keyOf(params));
  }

  async evaluate(genomes: Genome[], origins: Origin[]): Promise<Candidate[]> {
    const params = genomes.map((genome) => genomeToParams(this.space, genome));
    const keys = params.map((value) => this.keyOf(value));
    const missing = new Map<string, number>();

    keys.forEach((key, index) => {
      if (!this.entries.has(key) && !missing.has(key)) {
        missing.set(key, index);
      }
    });

    if (missing.size > 0) {
      const order = [...missing.entries()];
      const jobs: Job[] = order.map(([, index]) => ({
        params: params[index]!,
        startIndex: this.context.startIndex,
        endIndex: this.context.endIndex,
        windows: [[this.context.startIndex, this.context.endIndex]],
        options: this.context.options
      }));
      const results = await this.evaluator.run(this.context.datasetId, jobs);

      this.simulations += order.length;
      order.forEach(([key, index], position) => {
        const result = results[position]!;
        const metrics = result.windows[0]!;

        this.entries.set(key, {
          id: paramsId(params[index]!),
          params: params[index]!,
          genome: genomes[index]!,
          metrics,
          signature: result.signature,
          objectives: objectivesOf(metrics),
          violation: violationOf(metrics, this.context.years),
          origin: origins[index]!
        });
      });
    }

    return keys.map((key) => this.entries.get(key)!);
  }

  evaluateParams(list: StrategyParams[], origins: Origin[]) {
    return this.evaluate(
      list.map((params) => paramsToGenome(this.space, params)),
      origins
    );
  }
}

const toGenome = (space: Space, point: number[]): Genome =>
  space.specs.map((spec, dimension) => Math.min(gridSize(spec) - 1, Math.floor(point[dimension]! * gridSize(spec))));

export interface SamplerSummary {
  kind: SearchConfig['sampler'];
  requested: number;
  unique: number;
  drawn: number;
  duplicates: number;
  spaceSize: number;
  scrambleSeed?: number[];
}

export const explorationGenomes = (space: Space, config: SearchConfig, labels: (string | number)[]) => {
  const target = Math.min(config.samples, spaceSize(space));
  const scrambleSeed = config.scramble ? deriveSeed(...labels, 'sobol-scramble') : undefined;
  const sobol = new Sobol({
    dimensions: space.specs.length,
    scramble: scrambleSeed ? { seed: scrambleSeed } : undefined
  });
  const rng = Rng.from(...labels, 'random-sampler');
  const seen = new Set<string>();
  const genomes: Genome[] = [];
  let drawn = 0;

  while (genomes.length < target && drawn < target * 64) {
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
    spaceSize: spaceSize(space),
    scrambleSeed: config.sampler === 'sobol' ? scrambleSeed : undefined
  };

  return { genomes, summary };
};

const normalizedLinf = (space: Space, a: Genome, b: Genome) =>
  Math.max(
    ...space.specs.map((spec, dimension) => Math.abs(a[dimension]! - b[dimension]!) / Math.max(1, gridSize(spec) - 1))
  );

export const seedPopulation = (space: Space, explored: Candidate[], size: number, minDistance: number) => {
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

export interface GaRunSummary {
  run: number;
  seed: number[];
  generations: number;
  newEvaluations: number;
  hypervolume: number[];
  repairs: number;
}

export interface SearchOutput {
  config: SearchConfig;
  sampler: SamplerSummary;
  initialHypervolume: number;
  anchors: string[];
  gaRuns: GaRunSummary[];
  simulations: number;
  nominalBudget: number;
}

export const hypervolumeReference: [number, number] = [0, 1]; // zero profit, $100,000 drawdown

export const runSearch = async (
  space: Space,
  cache: CandidateCache,
  config: SearchConfig,
  labels: (string | number)[],
  anchors: { name: string; params: StrategyParams }[]
): Promise<SearchOutput> => {
  const optimizerSpace = asOptimizerSpace(space);
  const { genomes, summary } = explorationGenomes(space, config, labels);
  const explored = await cache.evaluate(
    genomes,
    genomes.map((_genome, index) => ({ stage: config.sampler, index }))
  );
  const anchored = await cache.evaluateParams(
    anchors.map((anchor) => anchor.params),
    anchors.map((anchor) => ({ stage: 'anchor', name: anchor.name }))
  );
  const initial = [...explored, ...anchored];
  const initialHypervolume = hypervolume2d(initial, hypervolumeReference);
  const seeded = seedPopulation(space, initial, config.populationSize, config.seedDiversity);
  const gaRuns: GaRunSummary[] = [];

  for (let run = 0; run < config.gaRuns; run++) {
    const seed = deriveSeed(...labels, 'ga', run);
    const rng = new Rng(seed);
    const startSimulations = cache.simulations;
    let population: Ranked<Candidate>[] = selectSurvivors(seeded, config.populationSize);
    const hypervolume: number[] = [];
    let repairs = 0;

    for (let generation = 1; generation <= config.generations; generation++) {
      const taken = new Set(population.map((ranked) => ranked.member.id));
      const offspring: Genome[] = [];

      while (offspring.length < config.populationSize) {
        const parentA = tournament(population, rng).member;
        const parentB = tournament(population, rng).member;
        const crossed = sbx(optimizerSpace, parentA.genome, parentB.genome, rng, config);

        repairs += crossed.repairs;

        for (const child of crossed.children) {
          if (offspring.length >= config.populationSize) {
            break;
          }

          let mutated = polynomialMutation(optimizerSpace, child, rng, config);
          let id = paramsId(genomeToParams(space, mutated.genome));

          for (let attempt = 0; attempt < 5 && taken.has(id); attempt++) {
            mutated = polynomialMutation(optimizerSpace, mutated.genome, rng, { ...config, mutationProbability: 0.5 });
            id = paramsId(genomeToParams(space, mutated.genome));
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

      population = selectSurvivors([...combined.values()], config.populationSize);
      hypervolume.push(
        hypervolume2d(
          population.map((ranked) => ranked.member),
          hypervolumeReference
        )
      );
    }

    gaRuns.push({
      run,
      seed,
      generations: config.generations,
      newEvaluations: cache.simulations - startSimulations,
      hypervolume,
      repairs
    });
  }

  return {
    config,
    sampler: summary,
    initialHypervolume,
    anchors: anchored.map((candidate) => candidate.id),
    gaRuns,
    simulations: cache.simulations,
    nominalBudget: config.samples + anchors.length + config.gaRuns * config.generations * config.populationSize
  };
};
