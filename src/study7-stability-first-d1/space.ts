// The search space (PROTOCOL.md §2.3, §8): the eight registered D1 parameters of every searched book on their grid,
// inside the unchanged eight-ETF box of src/multi-etf-d1/context.ts; scrambled-Sobol screens with this study's seeds;
// joint genomes for k books (each the multi-etf-d1 genome, concatenated in B5 book order) for the NSGA-II operators.
import { type Genome, box, genomeToParams, gridSizeOf, idOf, operatorSpace, paramsToGenome } from '../multi-etf-d1/space.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { type Grid, d1Keys, shortLabel } from '../portfolio-aware-d1/phenotypes.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { seedOf } from './context.ts';
import { type Books, gridKey, orderedOf } from './evaluate.ts';

export { box, d1Keys, gridSizeOf, shortLabel };
export type { Genome };

export const vectorId = (grid: Grid) => idOf(grid as unknown as IntParams);
export const genomeOfGrid = (grid: Grid): Genome => paramsToGenome(grid as unknown as IntParams);
export const gridOfGenome = (genome: Genome): Grid => genomeToParams(genome) as unknown as Grid;

export const configId = (books: Books) =>
  orderedOf(Object.keys(books))
    .map((symbol) => `${symbol}:${vectorId(books[symbol]!)}`)
    .join('+');

export const jointGenomeOf = (books: Books, symbols: readonly string[]): Genome =>
  symbols.flatMap((symbol) => genomeOfGrid(books[symbol]!));

export const booksOfGenome = (genome: Genome, symbols: readonly string[]): Books =>
  Object.fromEntries(
    symbols.map((symbol, book) => [symbol, gridOfGenome(genome.slice(book * d1Keys.length, (book + 1) * d1Keys.length))])
  );

export const operatorSpaceFor = (books: number): ParameterSpace =>
  ({
    name: `study7-${books}x8`,
    specs: Array.from({ length: books }, () => (operatorSpace as unknown as { specs: unknown[] }).specs).flat()
  }) as unknown as ParameterSpace;

// A scrambled Sobol stream of unique grid vectors over the box for one book.
export const sobolGrids = (samples: number, labels: (string | number)[]) => {
  const seed = deriveSeed(...seedOf(...labels));
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

// A Latin hypercube over the joint box of k books (k × 8 dimensions; the repository's Sobol generator stops at 16
// dimensions), each offset mapped to a grid index of its dimension.
export const lhsBooks = (samples: number, symbols: readonly string[], labels: (string | number)[]) => {
  const dims = symbols.length * box.length;
  const units = latinOffsets(samples, dims, new Rng(deriveSeed(...seedOf(...labels))));
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
