// D1 vectors on the phenotype grid (tenths of a point, days, sessions) inside the eight-ETF box, and the study's
// deterministic designs: scrambled Sobol screens, one-parameter probes, Latin-hypercube neighbourhoods (PROTOCOL.md
// §4). The box, the probes, the IDs and the genome mapping are the multi-etf-d1 ones, unchanged.
import type { IntParams } from '../d1-refinement/families.ts';
import {
  type Genome,
  box,
  genomeToParams,
  gridSizeOf,
  idOf,
  operatorSpace,
  paramsToGenome,
  probeParams
} from '../multi-etf-d1/space.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { type Grid, d1Keys, shortLabel } from '../portfolio-aware-d1/phenotypes.ts';
import { radius, seedOf } from './context.ts';

export type { Grid, Genome };
export { box, d1Keys, shortLabel };

export const vectorId = (grid: Grid) => idOf(grid as unknown as IntParams);
export const gridKey = (grid: Grid) => d1Keys.map((key) => grid[key]).join('/');
export const genomeOfGrid = (grid: Grid): Genome => paramsToGenome(grid as unknown as IntParams);
export const gridOfGenome = (genome: Genome): Grid => genomeToParams(genome) as unknown as Grid;

export const inBox = (grid: Grid) =>
  box.every((spec) => {
    const value = grid[spec.key as keyof Grid];

    return Number.isInteger(value) && value >= spec.min && value <= spec.max;
  });

export const clipToBox = (grid: Grid): Grid =>
  Object.fromEntries(
    box.map((spec) => [spec.key, Math.min(spec.max, Math.max(spec.min, Math.round(grid[spec.key as keyof Grid])))])
  ) as Grid;

// Normalized L∞ distance (per-dimension difference ÷ (grid points − 1)), the seeding/diversity metric of the earlier
// programs.
export const distance = (a: Grid, b: Grid) =>
  Math.max(
    ...box.map(
      (spec) => Math.abs(a[spec.key as keyof Grid] - b[spec.key as keyof Grid]) / Math.max(1, gridSizeOf(spec) - 1)
    )
  );

export const jointDistance = (a: Record<string, Grid>, b: Record<string, Grid>) =>
  Math.max(...Object.keys(a).map((symbol) => distance(a[symbol]!, b[symbol]!)));

// One-parameter probes (±1/±2 increments, in-box only).
export const probesOf = (grid: Grid) =>
  probeParams(grid as unknown as IntParams).map((probe) => ({
    key: probe.key as keyof Grid,
    offset: probe.offset,
    grid: probe.params as unknown as Grid
  }));

// A scrambled Sobol screen of unique grid vectors over the box.
export const sobolGrids = (samples: number, ...labels: (string | number)[]) => {
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

  return { grids, seed, drawn };
};

// A Latin hypercube over the box-clipped hyper-rectangle centre ± scale × radius (§4.2): per dimension, n strata in
// [−1, 1] randomly permuted, a uniform draw inside each stratum, the offset rounded to the grid and clipped.
export const latinOffsets = (n: number, dimensions: number, rng: Rng) => {
  const columns = Array.from({ length: dimensions }, () => {
    const order = Array.from({ length: n }, (_value, index) => index);

    for (let i = n - 1; i > 0; i--) {
      const j = rng.int(i + 1);

      [order[i], order[j]] = [order[j]!, order[i]!];
    }

    return order.map((stratum) => -1 + (2 * (stratum + rng.next())) / n);
  });

  return Array.from({ length: n }, (_value, row) => columns.map((column) => column[row]!));
};

export const neighbourhoodOf = (centre: Grid, n: number, scale: number, ...labels: (string | number)[]): Grid[] => {
  const rng = new Rng(deriveSeed(...seedOf('nbhd', ...labels)));

  return latinOffsets(n, d1Keys.length, rng).map((unit) =>
    clipToBox(
      Object.fromEntries(
        d1Keys.map((key, dimension) => [key, centre[key] + Math.round(unit[dimension]! * scale * radius[key])])
      ) as Grid
    )
  );
};

// Joint neighbourhood of a multi-book configuration: one LHS over all books' dimensions.
export const jointNeighbourhoodOf = (
  centre: Record<string, Grid>,
  symbols: readonly string[],
  n: number,
  scale: number,
  ...labels: (string | number)[]
): Record<string, Grid>[] => {
  const rng = new Rng(deriveSeed(...seedOf('joint-nbhd', ...labels)));

  return latinOffsets(n, d1Keys.length * symbols.length, rng).map((unit) =>
    Object.fromEntries(
      symbols.map((symbol, book) => [
        symbol,
        clipToBox(
          Object.fromEntries(
            d1Keys.map((key, dimension) => [
              key,
              centre[symbol]![key] + Math.round(unit[book * d1Keys.length + dimension]! * scale * radius[key])
            ])
          ) as Grid
        )
      ])
    )
  );
};

// The NSGA-II operator space for k concatenated books (each the multi-etf-d1 box).
export const operatorSpaceFor = (books: number): ParameterSpace =>
  ({
    name: `study5-${books}x8`,
    specs: Array.from({ length: books }, () => (operatorSpace as unknown as { specs: unknown[] }).specs).flat()
  }) as unknown as ParameterSpace;

export const jointGenomeOf = (grids: Record<string, Grid>, symbols: readonly string[]): Genome =>
  symbols.flatMap((symbol) => genomeOfGrid(grids[symbol]!));

export const jointGridsOf = (genome: Genome, symbols: readonly string[]): Record<string, Grid> =>
  Object.fromEntries(
    symbols.map((symbol, book) => [
      symbol,
      gridOfGenome(genome.slice(book * d1Keys.length, (book + 1) * d1Keys.length))
    ])
  );

export const describe = (grid: Grid) => shortLabel(grid);

export const quantile = (values: readonly number[], q: number) => {
  if (values.length === 0) {
    return NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
};

export const median = (values: readonly number[]) => quantile(values, 0.5);
