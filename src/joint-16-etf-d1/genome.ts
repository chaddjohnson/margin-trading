// The mixed genome of PROTOCOL.md §6: a 16-bit membership mask (nonempty) and one D1 vector per ETF (inactive ETFs
// carry a latent vector, used when the ETF is re-added), with the variation operators: per-ETF exchange crossover with
// SBX on shared members, add, remove, swap, one-member and multi-member polynomial mutation, and reset to an
// independent library draw. Every vector stays exactly on the box grid; all randomness comes from a seeded Rng.
import { polynomialMutation, sbx } from '../optimizer/nsga2.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import type { Rng } from '../optimizer/rng.ts';
import { study, universe } from './context.ts';
import { type Book, keyOf } from './evaluator.ts';
import { type Vector, genomeOf, gridOfGenome, idOf, operatorSpace } from './space.ts';
import type { IntParams } from '../d1-refinement/families.ts';

export interface Genome {
  mask: boolean[]; // by universe index
  vectors: Vector[]; // by universe index (latent when inactive)
}

export type Operator = keyof typeof study.islands.operators;

export const membersOf = (genome: Genome) => universe.filter((_, index) => genome.mask[index]);

export const booksOf = (genome: Genome): Book[] =>
  universe.flatMap((symbol, index) => (genome.mask[index] ? [{ symbol, vector: genome.vectors[index]! }] : []));

export const genomeKey = (genome: Genome) => keyOf(booksOf(genome));

export const cloneGenome = (genome: Genome): Genome => ({ mask: [...genome.mask], vectors: [...genome.vectors] });

export const variation = {
  crossoverProbability: study.islands.crossoverProbability,
  crossoverEta: study.islands.crossoverEta,
  mutationEta: study.islands.mutationEta
};

export class Library {
  constructor(readonly vectors: readonly Vector[]) {
    if (vectors.length === 0) {
      throw new Error('An empty library');
    }
  }

  draw(rng: Rng) {
    return this.vectors[rng.int(this.vectors.length)]!;
  }

  // k distinct vectors (without replacement), in draw order.
  drawDistinct(rng: Rng, k: number) {
    const chosen: Vector[] = [];
    const used = new Set<number>();

    while (chosen.length < Math.min(k, this.vectors.length)) {
      const index = rng.int(this.vectors.length);

      if (!used.has(index)) {
        used.add(index);
        chosen.push(this.vectors[index]!);
      }
    }

    return chosen;
  }
}

// A vector produced by an operator: its grid quantized by construction, its ID the D1 candidate ID.
const mutatedVector = (genome: number[], origin: string): Vector => {
  const grid = gridOfGenome(genome);

  return { id: idOf(grid as IntParams), grid, origin };
};

const sameGenome = (a: readonly number[], b: readonly number[]) => a.every((value, index) => value === b[index]);

// Polynomial mutation of one vector (each gene with probability 1/8), with at least one gene changed.
export const mutateVector = (vector: Vector, rng: Rng, origin: string): Vector => {
  const genome = genomeOf(vector.grid);
  let mutated = polynomialMutation(operatorSpace, genome, rng, variation).genome;

  if (sameGenome(mutated, genome)) {
    const dimension = rng.int(genome.length);
    const single = { ...operatorSpace, specs: [operatorSpace.specs[dimension]!] } as ParameterSpace;
    const gene = polynomialMutation(single, [genome[dimension]!], rng, { ...variation, mutationProbability: 1 }).genome;

    mutated = [...genome];
    mutated[dimension] = gene[0]!;
  }

  return mutatedVector(mutated, origin);
};

const indicesWhere = (genome: Genome, active: boolean) =>
  genome.mask.flatMap((value, index) => (value === active ? [index] : []));

const pick = <T>(items: readonly T[], rng: Rng) => items[rng.int(items.length)]!;

const pickDistinct = <T>(items: readonly T[], k: number, rng: Rng) => {
  const pool = [...items];
  const chosen: T[] = [];

  while (chosen.length < k && pool.length > 0) {
    chosen.push(pool.splice(rng.int(pool.length), 1)[0]!);
  }

  return chosen;
};

// The vector an added ETF brings: its latent vector, or (with probability 0.5) a fresh library draw.
const addedVector = (genome: Genome, index: number, library: Library, rng: Rng) =>
  rng.next() < study.islands.addLatentProbability ? genome.vectors[index]! : library.draw(rng);

// Applies one operator; returns the operator actually applied ('paramOne' replaces an impossible one).
export const applyOperator = (genome: Genome, operator: Operator, library: Library, rng: Rng): Operator => {
  const active = indicesWhere(genome, true);
  const inactive = indicesWhere(genome, false);

  if (active.length === 0) {
    throw new Error('An operator needs a nonempty mask: repair the child first');
  }

  switch (operator) {
    case 'add': {
      if (inactive.length === 0) {
        return applyOperator(genome, 'paramOne', library, rng);
      }

      const index = pick(inactive, rng);

      genome.vectors[index] = addedVector(genome, index, library, rng);
      genome.mask[index] = true;
      return 'add';
    }
    case 'remove': {
      if (active.length < 2) {
        return applyOperator(genome, 'paramOne', library, rng);
      }

      genome.mask[pick(active, rng)] = false;
      return 'remove';
    }
    case 'swap': {
      if (inactive.length === 0) {
        return applyOperator(genome, 'paramOne', library, rng);
      }

      const out = pick(active, rng);
      const into = pick(inactive, rng);

      genome.mask[out] = false;
      genome.vectors[into] = addedVector(genome, into, library, rng);
      genome.mask[into] = true;
      return 'swap';
    }
    case 'paramOne': {
      const index = pick(active, rng);

      genome.vectors[index] = mutateVector(genome.vectors[index]!, rng, 'paramOne');
      return 'paramOne';
    }
    case 'paramMulti': {
      if (active.length < 2) {
        return applyOperator(genome, 'paramOne', library, rng);
      }

      const k = Math.min(active.length, 2 + rng.int(2));

      for (const index of pickDistinct(active, k, rng)) {
        genome.vectors[index] = mutateVector(genome.vectors[index]!, rng, 'paramMulti');
      }

      return 'paramMulti';
    }
    case 'reset': {
      const index = pick(active, rng);

      genome.vectors[index] = library.draw(rng);
      return 'reset';
    }
    case 'crossoverOnly':
      return 'crossoverOnly';
  }
};

export const drawOperator = (rng: Rng): Operator => {
  const weights = Object.entries(study.islands.operators) as [Operator, number][];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let x = rng.next() * total;

  for (const [operator, weight] of weights) {
    x -= weight;

    if (x < 0) {
      return operator;
    }
  }

  return weights.at(-1)![0];
};

// Per-ETF exchange of (membership bit, vector) pairs; SBX on the vectors of ETFs active in both parents.
export const crossover = (a: Genome, b: Genome, rng: Rng): [Genome, Genome] => {
  const first = cloneGenome(a);
  const second = cloneGenome(b);

  for (let index = 0; index < universe.length; index++) {
    if (rng.next() < 0.5) {
      first.mask[index] = b.mask[index]!;
      first.vectors[index] = b.vectors[index]!;
      second.mask[index] = a.mask[index]!;
      second.vectors[index] = a.vectors[index]!;
    }
  }

  for (let index = 0; index < universe.length; index++) {
    if (a.mask[index] && b.mask[index] && rng.next() < study.islands.sbxOnSharedProbability) {
      const { children } = sbx(operatorSpace, genomeOf(a.vectors[index]!.grid), genomeOf(b.vectors[index]!.grid), rng, {
        ...variation,
        crossoverProbability: 1
      });

      first.vectors[index] = mutatedVector(children[0]!, 'sbx');
      second.vectors[index] = mutatedVector(children[1]!, 'sbx');
    }
  }

  return [first, second];
};

// An empty mask activates one ETF that either parent held (with the child's vector there).
export const repair = (genome: Genome, parents: readonly Genome[], rng: Rng) => {
  if (genome.mask.some(Boolean)) {
    return false;
  }

  const held = [...new Set(parents.flatMap((parent) => indicesWhere(parent, true)))].sort((x, y) => x - y);

  genome.mask[held.length > 0 ? pick(held, rng) : rng.int(universe.length)] = true;

  return true;
};

// A uniform genome: cardinality uniform on [min, max], members uniform, every vector a library draw.
export const uniformGenome = (library: Library, rng: Rng, minBooks: number, maxBooks: number): Genome => {
  const cardinality = minBooks + rng.int(maxBooks - minBooks + 1);
  const vectors = universe.map(() => library.draw(rng));
  const members = new Set(
    pickDistinct(
      universe.map((_, index) => index),
      cardinality,
      rng
    )
  );

  return { mask: universe.map((_, index) => members.has(index)), vectors };
};

export const genomeFromBooks = (books: readonly Book[], library: Library, rng: Rng): Genome => {
  const vectors = universe.map(() => library.draw(rng));
  const mask = universe.map(() => false);

  for (const book of books) {
    const index = universe.indexOf(book.symbol as (typeof universe)[number]);

    if (index < 0) {
      throw new Error(`${book.symbol} is not in the universe`);
    }

    mask[index] = true;
    vectors[index] = book.vector;
  }

  return { mask, vectors };
};

// Membership distance: 1 − |A ∩ B| ÷ |A ∪ B|.
export const jaccardDistance = (a: readonly string[], b: readonly string[]) => {
  const left = new Set(a);
  const right = new Set(b);
  const union = new Set([...left, ...right]);
  let shared = 0;

  for (const symbol of left) {
    if (right.has(symbol)) {
      shared++;
    }
  }

  return union.size === 0 ? 0 : 1 - shared / union.size;
};
