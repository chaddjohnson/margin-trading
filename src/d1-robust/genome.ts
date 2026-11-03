// The mixed genome of PROTOCOL.md §9 over the frozen eligible universe U: a membership mask (nonempty) and one D1
// vector per symbol (latent when inactive), with the 16-ETF study's variation operators generalized to any |U|:
// per-symbol exchange crossover with SBX on shared members, add, remove, swap, one-member and multi-member polynomial
// mutation, and reset to a library draw. Every vector stays exactly on the box grid; all randomness comes from a
// seeded Rng; nothing depends on the order of symbols beyond the alphabetical universe.
import type { IntParams } from '../d1-refinement/families.ts';
import { genomeToParams, idOf, operatorSpace, paramsToGenome } from '../multi-etf-d1/space.ts';
import { polynomialMutation, sbx } from '../optimizer/nsga2.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import type { Rng } from '../optimizer/rng.ts';
import { type Grid, gridOf } from '../portfolio-aware-d1/phenotypes.ts';
import { categoryOf, study } from './context.ts';
import { keyOf } from './evaluate.ts';
import type { Book, Vector } from './neighbourhood.ts';

export interface Genome {
  mask: boolean[]; // by universe index
  vectors: Vector[]; // by universe index (latent when inactive)
}

export type Operator = keyof typeof study.islands.operators;

const variation = {
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

const genomeOfGrid = (grid: Grid) => paramsToGenome(grid as unknown as IntParams);
const gridOfGenome = (genome: number[]): Grid => gridOf(genomeToParams(genome) as Record<string, number>);
const mutatedVector = (genome: number[], origin: string): Vector => {
  const grid = gridOfGenome(genome);

  return { id: idOf(grid as unknown as IntParams), grid, origin };
};
const sameGenome = (a: readonly number[], b: readonly number[]) => a.every((value, index) => value === b[index]);

export const mutateVector = (vector: Vector, rng: Rng, origin: string): Vector => {
  const genome = genomeOfGrid(vector.grid);
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

const pick = <T>(items: readonly T[], rng: Rng) => items[rng.int(items.length)]!;

export const pickDistinct = <T>(items: readonly T[], k: number, rng: Rng) => {
  const pool = [...items];
  const chosen: T[] = [];

  while (chosen.length < k && pool.length > 0) {
    chosen.push(pool.splice(rng.int(pool.length), 1)[0]!);
  }

  return chosen;
};

export class GenomeSpace {
  readonly index: Map<string, number>;

  constructor(
    readonly universe: readonly string[],
    readonly library: Library
  ) {
    const sorted = [...universe].sort();

    if (sorted.join(',') !== universe.join(',')) {
      throw new Error('The universe must be alphabetical');
    }

    this.index = new Map(universe.map((symbol, i) => [symbol, i]));
  }

  membersOf(genome: Genome) {
    return this.universe.filter((_, i) => genome.mask[i]);
  }

  booksOf(genome: Genome): Book[] {
    return this.universe.flatMap((symbol, i) => (genome.mask[i] ? [{ symbol, vector: genome.vectors[i]! }] : []));
  }

  keyOf(genome: Genome) {
    return keyOf(this.booksOf(genome));
  }

  clone(genome: Genome): Genome {
    return { mask: [...genome.mask], vectors: [...genome.vectors] };
  }

  private where(genome: Genome, active: boolean) {
    return genome.mask.flatMap((value, i) => (value === active ? [i] : []));
  }

  private addedVector(genome: Genome, i: number, rng: Rng) {
    return rng.next() < study.islands.addLatentProbability ? genome.vectors[i]! : this.library.draw(rng);
  }

  // Applies one operator; returns the operator actually applied ('paramOne' replaces an impossible one). `required`
  // (top-up islands) is a symbol that must stay a member.
  applyOperator(genome: Genome, operator: Operator, rng: Rng, required?: number): Operator {
    const active = this.where(genome, true);
    const inactive = this.where(genome, false);
    const removable = active.filter((i) => i !== required);

    if (active.length === 0) {
      throw new Error('An operator needs a nonempty mask: repair the child first');
    }

    switch (operator) {
      case 'add': {
        if (inactive.length === 0) {
          return this.applyOperator(genome, 'paramOne', rng, required);
        }

        const i = pick(inactive, rng);

        genome.vectors[i] = this.addedVector(genome, i, rng);
        genome.mask[i] = true;
        return 'add';
      }
      case 'remove': {
        if (active.length < 2 || removable.length === 0) {
          return this.applyOperator(genome, 'paramOne', rng, required);
        }

        genome.mask[pick(removable, rng)] = false;
        return 'remove';
      }
      case 'swap': {
        if (inactive.length === 0 || removable.length === 0) {
          return this.applyOperator(genome, 'paramOne', rng, required);
        }

        const out = pick(removable, rng);
        const into = pick(inactive, rng);

        genome.mask[out] = false;
        genome.vectors[into] = this.addedVector(genome, into, rng);
        genome.mask[into] = true;
        return 'swap';
      }
      case 'paramOne': {
        const i = pick(active, rng);

        genome.vectors[i] = mutateVector(genome.vectors[i]!, rng, 'paramOne');
        return 'paramOne';
      }
      case 'paramMulti': {
        if (active.length < 2) {
          return this.applyOperator(genome, 'paramOne', rng, required);
        }

        const k = Math.min(active.length, 2 + rng.int(2));

        for (const i of pickDistinct(active, k, rng)) {
          genome.vectors[i] = mutateVector(genome.vectors[i]!, rng, 'paramMulti');
        }

        return 'paramMulti';
      }
      case 'reset': {
        const i = pick(active, rng);

        genome.vectors[i] = this.library.draw(rng);
        return 'reset';
      }
      case 'crossoverOnly':
        return 'crossoverOnly';
    }
  }

  drawOperator(rng: Rng): Operator {
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
  }

  crossover(a: Genome, b: Genome, rng: Rng): [Genome, Genome] {
    const first = this.clone(a);
    const second = this.clone(b);

    for (let i = 0; i < this.universe.length; i++) {
      if (rng.next() < 0.5) {
        first.mask[i] = b.mask[i]!;
        first.vectors[i] = b.vectors[i]!;
        second.mask[i] = a.mask[i]!;
        second.vectors[i] = a.vectors[i]!;
      }
    }

    for (let i = 0; i < this.universe.length; i++) {
      if (a.mask[i] && b.mask[i] && rng.next() < study.islands.sbxOnSharedProbability) {
        const { children } = sbx(
          operatorSpace,
          genomeOfGrid(a.vectors[i]!.grid),
          genomeOfGrid(b.vectors[i]!.grid),
          rng,
          {
            ...variation,
            crossoverProbability: 1
          }
        );

        first.vectors[i] = mutatedVector(children[0]!, 'sbx');
        second.vectors[i] = mutatedVector(children[1]!, 'sbx');
      }
    }

    return [first, second];
  }

  // An empty mask (or one without the required symbol) activates a symbol either parent held.
  repair(genome: Genome, parents: readonly Genome[], rng: Rng, required?: number) {
    if (required !== undefined && !genome.mask[required]) {
      genome.mask[required] = true;
      return true;
    }

    if (genome.mask.some(Boolean)) {
      return false;
    }

    const held = [...new Set(parents.flatMap((parent) => this.where(parent, true)))].sort((x, y) => x - y);

    genome.mask[held.length > 0 ? pick(held, rng) : rng.int(this.universe.length)] = true;

    return true;
  }

  uniform(rng: Rng, minBooks: number, maxBooks: number): Genome {
    const max = Math.min(maxBooks, this.universe.length);
    const min = Math.min(minBooks, max);
    const cardinality = min + rng.int(max - min + 1);
    const vectors = this.universe.map(() => this.library.draw(rng));
    const members = new Set(
      pickDistinct(
        this.universe.map((_, i) => i),
        cardinality,
        rng
      )
    );

    return { mask: this.universe.map((_, i) => members.has(i)), vectors };
  }

  // One member from each of k distinct categories (k uniform in [min, max]).
  stratified(rng: Rng, minBooks: number, maxBooks: number): Genome {
    const byCategory = new Map<string, number[]>();

    this.universe.forEach((symbol, i) => {
      const category = categoryOf[symbol] ?? 'none';

      byCategory.set(category, [...(byCategory.get(category) ?? []), i]);
    });

    const categories = [...byCategory.keys()].sort();
    const k = Math.min(categories.length, minBooks + rng.int(maxBooks - minBooks + 1));
    const vectors = this.universe.map(() => this.library.draw(rng));
    const members = new Set(pickDistinct(categories, k, rng).map((category) => pick(byCategory.get(category)!, rng)));

    return { mask: this.universe.map((_, i) => members.has(i)), vectors };
  }

  singleton(symbol: string, vector: Vector, rng: Rng): Genome {
    const vectors = this.universe.map(() => this.library.draw(rng));
    const i = this.index.get(symbol);

    if (i === undefined) {
      throw new Error(`${symbol} is not in the universe`);
    }

    vectors[i] = vector;

    return { mask: this.universe.map((_, j) => j === i), vectors };
  }

  fromBooks(books: readonly Book[], rng: Rng): Genome {
    const vectors = this.universe.map(() => this.library.draw(rng));
    const mask = this.universe.map(() => false);

    for (const book of books) {
      const i = this.index.get(book.symbol);

      if (i === undefined) {
        throw new Error(`${book.symbol} is not in the universe`);
      }

      mask[i] = true;
      vectors[i] = book.vector;
    }

    return { mask, vectors };
  }
}

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
