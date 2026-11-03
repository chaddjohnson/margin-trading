// The search space (PROTOCOL.md §4): Study 8's space.ts, ported line for line. The only differences are the seed
// namespace (seedOf: 'study9-phase-b') and the book order (the engine's bookOrderOf instead of Study 8's five-symbol
// list, identical on B5 subsets). The eight registered D1 parameters of every book on Study 7/8's grid, inside the
// unchanged eight-ETF box of src/multi-etf-d1/context.ts; scrambled-Sobol per-book screens; joint Latin hypercubes; joint
// genomes (each the multi-etf-d1 genome, concatenated in engine book order) for the NSGA-II operators. Parity gate A1
// proves that with Study 8's namespace these functions return exactly Study 8's draws.
import type { IntParams } from '../d1-refinement/families.ts';
import { type Genome, box, genomeToParams, gridSizeOf, operatorSpace, paramsToGenome } from '../multi-etf-d1/space.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { type Grid, d1Keys, shortLabel } from '../portfolio-aware-d1/phenotypes.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { seedOf as p9SeedOf } from './context.ts';
import { type Books, configId, gridKey, orderedOf, vectorId } from './engine.ts';

export { box, configId, d1Keys, gridSizeOf, shortLabel, vectorId };
export type { Genome };

// The namespace hook: the study's own seedOf; parity gate A1 passes Study 8's to reproduce Study 8's draws.
export type SeedOf = (...labels: (string | number)[]) => (string | number)[];
let seedOf: SeedOf = p9SeedOf;

export const withNamespace = <T>(namespaceSeedOf: SeedOf, run: () => T): T => {
  const previous = seedOf;

  seedOf = namespaceSeedOf;

  try {
    const result = run();

    // review m6: synchronous only; an async callback would outlive the switch
    if (result && typeof (result as { then?: unknown }).then === 'function')
      throw new Error('withNamespace accepts synchronous callbacks only');

    return result;
  } finally {
    seedOf = previous;
  }
};

// Every production stage asserts at entry that the live namespace is this study's (review m6).
export const assertStudyNamespace = (stage: string) => {
  if (seedOf('x')[0] !== p9SeedOf('x')[0] || seedOf !== p9SeedOf)
    throw new Error(`${stage}: the seed namespace is not ${String(p9SeedOf('x')[0])}`);
};

// Process-wide namespace switch, for the parity replay process of Study 8's own search only (gate A3).
export const setNamespaceForParityReplay = (namespaceSeedOf: SeedOf) => {
  seedOf = namespaceSeedOf;
};

export const seedValue = (labels: (string | number)[]) => deriveSeed(...seedOf(...labels));
export const rngOf = (labels: (string | number)[]) => Rng.from(...seedOf(...labels));
export const currentSeedOf = () => seedOf;

export const genomeOfGrid = (grid: Grid): Genome => paramsToGenome(grid as unknown as IntParams);
export const gridOfGenome = (genome: Genome): Grid => genomeToParams(genome) as unknown as Grid;

export const jointGenomeOf = (books: Books, symbols: readonly string[]): Genome =>
  symbols.flatMap((symbol) => genomeOfGrid(books[symbol]!));

export const booksOfGenome = (genome: Genome, symbols: readonly string[]): Books =>
  Object.fromEntries(
    symbols.map((symbol, book) => [
      symbol,
      gridOfGenome(genome.slice(book * d1Keys.length, (book + 1) * d1Keys.length))
    ])
  );

export const operatorSpaceFor = (books: number): ParameterSpace =>
  ({
    name: `study8-${books}x8`,
    specs: Array.from({ length: books }, () => (operatorSpace as unknown as { specs: unknown[] }).specs).flat()
  }) as unknown as ParameterSpace;

// A scrambled Sobol stream of unique grid vectors over the box for one book.
export const sobolGrids = (samples: number, labels: (string | number)[]) => {
  const seed = seedValue(labels);
  const sobol = new Sobol({ dimensions: box.length, scramble: { seed } });
  const seen = new Set<string>();
  const grids: Grid[] = [];
  let drawn = 0;

  while (grids.length < samples && drawn < samples * 64) {
    const point = sobol.next();
    const genome = box.map((spec, dimension) =>
      Math.min(gridSizeOf(spec) - 1, Math.floor(point[dimension]! * gridSizeOf(spec)))
    );
    const grid = gridOfGenome(genome);
    const key = gridKey(grid);

    drawn++;

    if (!seen.has(key)) {
      seen.add(key);
      grids.push(grid);
    }
  }

  return { grids, drawn };
};

// A Latin hypercube over the joint box of k books (k × 8 dimensions), each offset mapped to a grid index.
export const lhsBooks = (samples: number, symbols: readonly string[], labels: (string | number)[]) => {
  const dims = symbols.length * box.length;
  const units = latinOffsets(samples, dims, new Rng(seedValue(labels)));
  const seen = new Set<string>();
  const out: Books[] = [];

  for (const unit of units) {
    const genome = unit.map((u, d) => {
      const spec = box[d % box.length]!;

      return Math.min(gridSizeOf(spec) - 1, Math.floor(((u + 1) / 2) * gridSizeOf(spec)));
    });
    const books = booksOfGenome(genome, symbols);
    const key = symbols.map((s) => gridKey(books[s]!)).join('|');

    if (!seen.has(key)) {
      seen.add(key);
      out.push(books);
    }
  }

  return { books: out, drawn: units.length };
};

export const describeBooks = (books: Books) =>
  orderedOf(Object.keys(books))
    .map((symbol) => `${symbol} ${shortLabel(books[symbol]!)}`)
    .join(' | ');
