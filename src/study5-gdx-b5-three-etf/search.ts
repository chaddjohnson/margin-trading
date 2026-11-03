// The NSGA-II loop of the earlier programs (src/portfolio-aware-d1/stageB.ts runSearch, line for line: seeding by
// constrained domination with a normalized-L∞ diversity rule, tournament + SBX + polynomial mutation with the
// duplicate-retry, survivor selection, 2-D hypervolume early stop), generalized to any number of concatenated D1
// books and any evaluation function. The operators are src/optimizer/nsga2.ts, unchanged.
import {
  type Ranked,
  type Scored,
  type VariationConfig,
  hypervolume2d,
  polynomialMutation,
  sbx,
  selectSurvivors,
  tournament
} from '../optimizer/nsga2.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { Rng } from '../optimizer/rng.ts';
import type { Genome } from './grid.ts';

export interface Candidate<T> extends Scored {
  origin: string;
  payload: T;
}

export interface SearchSettings {
  populationSize: number;
  maxNewVectors: number;
  maxGenerations: number;
  patience: number;
  tolerance: number;
  seedDiversity: number;
  variation: VariationConfig;
  reference: [number, number];
  seed: number[];
  space: ParameterSpace;
  label: string; // origin prefix of offspring, e.g. 'ga:A:r1'
}

export interface SearchSummary {
  label: string;
  seed: number[];
  seeded: number;
  generations: number;
  newVectors: number;
  hypervolume: number[];
  stopReason: 'generations' | 'budget' | 'stagnation';
  repairs: number;
  seconds: number;
}

const sizeOf = (space: ParameterSpace, dimension: number) => {
  const spec = space.specs[dimension]! as unknown as { min: number; max: number };

  return spec.max - spec.min + 1;
};

export const genomeDistance = (space: ParameterSpace, a: Genome, b: Genome) => {
  let distance = 0;

  for (let dimension = 0; dimension < a.length; dimension++) {
    distance = Math.max(distance, Math.abs(a[dimension]! - b[dimension]!) / Math.max(1, sizeOf(space, dimension) - 1));
  }

  return distance;
};

// NSGA-II order, skipping members closer than the diversity threshold, then topped up (the eight-ETF seeding rule).
export const seedPopulation = <T>(space: ParameterSpace, scored: Candidate<T>[], size: number, minDistance: number) => {
  const ordered = selectSurvivors(scored, scored.length).map((ranked) => ranked.member);
  const chosen: Candidate<T>[] = [];

  for (const candidate of ordered) {
    if (chosen.length >= size) {
      break;
    }

    if (chosen.every((other) => genomeDistance(space, candidate.genome, other.genome) >= minDistance)) {
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

// One NSGA-II run. `archive` holds every evaluated candidate by id (the initial ones included) and receives the
// offspring; `evaluate` scores a new genome (its id is `idOf(genome)`).
export const runNsga2 = <T>(
  settings: SearchSettings,
  initial: Candidate<T>[],
  archive: Map<string, Candidate<T>>,
  idOf: (genome: Genome) => string,
  evaluate: (genome: Genome, id: string, origin: string) => Candidate<T>
): SearchSummary => {
  const started = Date.now();
  const rng = new Rng(settings.seed);
  const seeded = seedPopulation(settings.space, initial, settings.populationSize, settings.seedDiversity);
  let population: Ranked<Candidate<T>>[] = selectSurvivors(seeded, settings.populationSize);
  const hypervolume: number[] = [];
  let best = hypervolume2d(
    population.map((ranked) => ranked.member),
    settings.reference
  );
  let stopReason: SearchSummary['stopReason'] = 'generations';
  let stagnant = 0;
  let repairs = 0;
  let newVectors = 0;
  let generation = 0;

  for (generation = 1; generation <= settings.maxGenerations; generation++) {
    const room = settings.maxNewVectors - newVectors;
    const target = Math.min(settings.populationSize, room);
    const offspring: Genome[] = [];
    const offspringIds = new Set<string>();
    let attempts = 0;

    while (offspring.length < target && attempts < 100 * settings.populationSize) {
      attempts++;

      const parentA = tournament(population, rng).member;
      const parentB = tournament(population, rng).member;
      const crossed = sbx(settings.space, parentA.genome, parentB.genome, rng, settings.variation);

      repairs += crossed.repairs;

      for (const child of crossed.children) {
        if (offspring.length >= target) {
          break;
        }

        let mutated = polynomialMutation(settings.space, child, rng, settings.variation);
        let id = idOf(mutated.genome);

        for (let retry = 0; retry < 5 && archive.has(id); retry++) {
          mutated = polynomialMutation(settings.space, mutated.genome, rng, {
            ...settings.variation,
            mutationProbability: 0.5
          });
          id = idOf(mutated.genome);
        }

        repairs += mutated.repairs;

        if (!archive.has(id) && !offspringIds.has(id)) {
          offspring.push(mutated.genome);
          offspringIds.add(id);
        }
      }
    }

    const children: Candidate<T>[] = [];

    for (const genome of offspring) {
      const id = idOf(genome);
      const child = evaluate(genome, id, `${settings.label}:${generation}`);

      archive.set(id, child);
      children.push(child);
      newVectors++;
    }

    const combined = new Map<string, Candidate<T>>();

    for (const member of [...population.map((ranked) => ranked.member), ...children]) {
      combined.set(member.id, member);
    }

    population = selectSurvivors([...combined.values()], settings.populationSize);

    const volume = hypervolume2d(
      population.map((ranked) => ranked.member),
      settings.reference
    );

    hypervolume.push(volume);
    stagnant = volume > best * (1 + settings.tolerance) + 1e-12 ? 0 : stagnant + 1;
    best = Math.max(best, volume);

    if (newVectors >= settings.maxNewVectors) {
      stopReason = 'budget';
      break;
    }

    if (stagnant >= settings.patience) {
      stopReason = 'stagnation';
      break;
    }
  }

  return {
    label: settings.label,
    seed: settings.seed,
    seeded: seeded.length,
    generations: Math.min(generation, settings.maxGenerations),
    newVectors,
    hypervolume,
    stopReason,
    repairs,
    seconds: (Date.now() - started) / 1000
  };
};
