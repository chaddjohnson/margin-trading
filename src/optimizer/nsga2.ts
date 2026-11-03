// NSGA-II (Deb et al., 2002) on integer grid genomes: constrained domination, fast non-dominated sorting,
// crowding distance, binary crowded tournaments, (mu + lambda) elitism, and SBX crossover and polynomial
// mutation applied in grid-index space and rounded back to the grid, so every child is exactly quantized.
// All ties are broken by candidate ID, and all randomness comes from a seeded Rng, so a run is
// reproducible regardless of the order in which worker threads finish.
import { type Genome, type ParameterSpace, gridSize, repairGenome } from './params.ts';
import type { Rng } from './rng.ts';

export interface Scored {
  id: string;
  genome: Genome;
  objectives: number[]; // minimized
  violation: number; // 0 when feasible
}

export const constrainedDominates = (a: Scored, b: Scored) => {
  if (a.violation === 0 && b.violation > 0) {
    return true;
  }

  if (a.violation > 0 && b.violation > 0) {
    return a.violation < b.violation;
  }

  if (a.violation > 0) {
    return false;
  }

  let strictlyBetter = false;

  for (let index = 0; index < a.objectives.length; index++) {
    if (a.objectives[index]! > b.objectives[index]!) {
      return false;
    }

    if (a.objectives[index]! < b.objectives[index]!) {
      strictlyBetter = true;
    }
  }

  return strictlyBetter;
};

const byId = (a: Scored, b: Scored) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

// Fronts of indices into `population`, best first; each front sorted by ID.
export const fastNonDominatedSort = <T extends Scored>(population: T[]): T[][] => {
  const dominatedBy: number[][] = population.map(() => []);
  const dominationCount = new Int32Array(population.length);
  const fronts: number[][] = [[]];

  for (let p = 0; p < population.length; p++) {
    for (let q = p + 1; q < population.length; q++) {
      if (constrainedDominates(population[p]!, population[q]!)) {
        dominatedBy[p]!.push(q);
        dominationCount[q]!++;
      } else if (constrainedDominates(population[q]!, population[p]!)) {
        dominatedBy[q]!.push(p);
        dominationCount[p]!++;
      }
    }
  }

  for (let p = 0; p < population.length; p++) {
    if (dominationCount[p] === 0) {
      fronts[0]!.push(p);
    }
  }

  for (let front = 0; fronts[front]!.length > 0; front++) {
    const next: number[] = [];

    for (const p of fronts[front]!) {
      for (const q of dominatedBy[p]!) {
        dominationCount[q]!--;

        if (dominationCount[q] === 0) {
          next.push(q);
        }
      }
    }

    fronts.push(next);
  }

  return fronts.filter((front) => front.length > 0).map((front) => front.map((index) => population[index]!).sort(byId));
};

// Crowding distance within one front; boundary points get Infinity.
export const crowdingDistances = <T extends Scored>(front: T[]): Map<string, number> => {
  const distances = new Map(front.map((member) => [member.id, 0]));

  if (front.length === 0) {
    return distances;
  }

  const objectives = front[0]!.objectives.length;

  for (let objective = 0; objective < objectives; objective++) {
    const sorted = [...front].sort((a, b) => a.objectives[objective]! - b.objectives[objective]! || byId(a, b));
    const low = sorted[0]!.objectives[objective]!;
    const high = sorted.at(-1)!.objectives[objective]!;

    distances.set(sorted[0]!.id, Infinity);
    distances.set(sorted.at(-1)!.id, Infinity);

    if (high === low) {
      continue;
    }

    for (let index = 1; index < sorted.length - 1; index++) {
      const id = sorted[index]!.id;

      distances.set(
        id,
        distances.get(id)! +
          (sorted[index + 1]!.objectives[objective]! - sorted[index - 1]!.objectives[objective]!) / (high - low)
      );
    }
  }

  return distances;
};

export interface Ranked<T> {
  member: T;
  rank: number;
  crowding: number;
}

// Ranks a population and keeps the best `size`: whole fronts first, then the last front by crowding.
export const selectSurvivors = <T extends Scored>(population: T[], size: number): Ranked<T>[] => {
  const survivors: Ranked<T>[] = [];
  const fronts = fastNonDominatedSort(population);

  for (let rank = 0; rank < fronts.length && survivors.length < size; rank++) {
    const front = fronts[rank]!;
    const crowding = crowdingDistances(front);
    const ordered = [...front].sort((a, b) => crowding.get(b.id)! - crowding.get(a.id)! || byId(a, b));

    for (const member of ordered.slice(0, size - survivors.length)) {
      survivors.push({ member, rank, crowding: crowding.get(member.id)! });
    }
  }

  return survivors;
};

export const crowdedBetter = <T>(a: Ranked<T & Scored>, b: Ranked<T & Scored>) =>
  a.rank !== b.rank ? a.rank < b.rank : a.crowding !== b.crowding ? a.crowding > b.crowding : a.member.id < b.member.id;

export const tournament = <T extends Scored>(ranked: Ranked<T>[], rng: Rng) => {
  const a = ranked[rng.int(ranked.length)]!;
  const b = ranked[rng.int(ranked.length)]!;

  return crowdedBetter(a, b) ? a : b;
};

export interface VariationConfig {
  crossoverProbability: number;
  crossoverEta: number;
  mutationEta: number;
  mutationProbability?: number; // per gene; default 1 / dimensions
}

// Simulated binary crossover (bounded form) on grid indices, then rounded and clamped.
export const sbx = (space: ParameterSpace, a: Genome, b: Genome, rng: Rng, config: VariationConfig) => {
  const childA = [...a];
  const childB = [...b];
  let repairs = 0;

  if (rng.next() > config.crossoverProbability) {
    return { children: [childA, childB], repairs };
  }

  space.specs.forEach((spec, dimension) => {
    const upper = gridSize(spec) - 1;
    const x1 = Math.min(a[dimension]!, b[dimension]!);
    const x2 = Math.max(a[dimension]!, b[dimension]!);

    if (rng.next() > 0.5 || x2 - x1 < 1e-12 || upper === 0) {
      return;
    }

    const random = rng.next();
    const spread = (beta: number) => {
      const alpha = 2 - beta ** -(config.crossoverEta + 1);

      return random <= 1 / alpha
        ? (random * alpha) ** (1 / (config.crossoverEta + 1))
        : (1 / (2 - random * alpha)) ** (1 / (config.crossoverEta + 1));
    };
    const betaLow = 1 + (2 * (x1 - 0)) / (x2 - x1);
    const betaHigh = 1 + (2 * (upper - x2)) / (x2 - x1);
    const c1 = 0.5 * (x1 + x2 - spread(betaLow) * (x2 - x1));
    const c2 = 0.5 * (x1 + x2 + spread(betaHigh) * (x2 - x1));
    const swap = rng.next() < 0.5;

    childA[dimension] = swap ? c2 : c1;
    childB[dimension] = swap ? c1 : c2;
  });

  const repairedA = repairGenome(space, childA);
  const repairedB = repairGenome(space, childB);

  repairs += repairedA.repairs + repairedB.repairs;

  return { children: [repairedA.genome, repairedB.genome], repairs };
};

// Polynomial mutation (Deb's bounded form) on grid indices. A mutation that rounds back to the same index
// moves one grid step instead, so a mutated gene always changes.
export const polynomialMutation = (space: ParameterSpace, genome: Genome, rng: Rng, config: VariationConfig) => {
  const probability = config.mutationProbability ?? 1 / space.specs.length;
  const mutated = [...genome];

  space.specs.forEach((spec, dimension) => {
    const upper = gridSize(spec) - 1;

    if (upper === 0 || rng.next() >= probability) {
      return;
    }

    const x = mutated[dimension]!;
    const delta1 = x / upper;
    const delta2 = (upper - x) / upper;
    const random = rng.next();
    const power = 1 / (config.mutationEta + 1);
    let deltaQ: number;

    if (random < 0.5) {
      const value = 2 * random + (1 - 2 * random) * (1 - delta1) ** (config.mutationEta + 1);

      deltaQ = value ** power - 1;
    } else {
      const value = 2 * (1 - random) + 2 * (random - 0.5) * (1 - delta2) ** (config.mutationEta + 1);

      deltaQ = 1 - value ** power;
    }

    let next = Math.round(Math.min(upper, Math.max(0, x + deltaQ * upper)));

    if (next === x) {
      next = x === 0 ? 1 : x === upper ? upper - 1 : x + (random < 0.5 ? -1 : 1);
    }

    mutated[dimension] = next;
  });

  return repairGenome(space, mutated);
};

// Two-objective hypervolume of the feasible points against a reference point (both objectives
// minimized): the area of the staircase of non-dominated points.
export const hypervolume2d = (points: Scored[], reference: [number, number]) => {
  const sorted = points
    .filter((point) => point.violation === 0)
    .map((point) => [point.objectives[0]!, point.objectives[1]!] as [number, number])
    .filter(([f1, f2]) => f1 < reference[0] && f2 < reference[1])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const front: [number, number][] = [];

  for (const point of sorted) {
    if (front.length === 0 || point[1] < front.at(-1)![1]) {
      front.push(point);
    }
  }

  let volume = 0;

  for (let index = 0; index < front.length; index++) {
    const [f1, f2] = front[index]!;
    const nextF1 = front[index + 1]?.[0] ?? reference[0];

    volume += (nextF1 - f1) * (reference[1] - f2);
  }

  return volume;
};

// Pareto front ranks for many two-objective points (O(n log n) per front by sorting). Infeasible points
// get rank Infinity.
export const paretoRanks2d = (points: Scored[]): Map<string, number> => {
  const ranks = new Map<string, number>();
  let remaining = points.filter((point) => point.violation === 0);

  for (const point of points) {
    if (point.violation > 0) {
      ranks.set(point.id, Infinity);
    }
  }

  for (let rank = 0; remaining.length > 0; rank++) {
    const sorted = [...remaining].sort(
      (a, b) => a.objectives[0]! - b.objectives[0]! || a.objectives[1]! - b.objectives[1]! || byId(a, b)
    );
    const front = new Set<string>();
    let bestF2 = Infinity;
    let bestF1 = -Infinity;

    for (const point of sorted) {
      const [f1, f2] = point.objectives as [number, number];
      // Dominated by the best earlier point unless strictly lower in f2, or an exact duplicate of it.
      const isDuplicate = f1 === bestF1 && f2 === bestF2;

      if (f2 < bestF2 || isDuplicate) {
        front.add(point.id);

        if (f2 < bestF2) {
          bestF2 = f2;
          bestF1 = f1;
        }
      }
    }

    for (const id of front) {
      ranks.set(id, rank);
    }

    remaining = remaining.filter((point) => !front.has(point.id));
  }

  return ranks;
};
