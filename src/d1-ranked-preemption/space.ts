// The study's D1 parameter space (PROTOCOL.md §6.1): the existing eight-parameter box and grid of
// src/multi-etf-d1/space.ts (tenths of a percentage point, calendar days, sessions), the October 25 study's step units
// and reflection (src/d1-robust/neighbourhood.ts), and this study's own seeded streams: per-symbol scrambled Sobol
// designs (the same design for a symbol in every window, so the windows' searches are paired), uniform random
// vectors, single-coordinate and joint mutations. Every vector stays exactly on the grid.
import type { IntParams } from '../d1-refinement/families.ts';
import { type Book, type Vector, neighbourOf, reflect, vectorOfGrid } from '../d1-robust/neighbourhood.ts';
import { box, genomeToParams, gridSizeOf, idOf, spaceSize } from '../multi-etf-d1/space.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { study } from './context.ts';
import { gridKey } from './evaluate.ts';

export type { Book, Grid, Vector };

export const paramKeys = box.map((spec) => spec.key as keyof Grid);

const stepUnits: Record<string, number> = {
  targetPercentChange: 5,
  trailingBuyPercentage: 1,
  trailingStopPercentage: 5,
  maximumHoldDays: 1,
  tickWindowSize: 5,
  intradayLossBuffer: 5,
  pullback: 5,
  continuationWindow: 10
};

export const units = paramKeys.map((key) => stepUnits[key]!);

export const gridOfGenome = (genome: readonly number[]): Grid => genomeToParams([...genome]) as unknown as Grid;

export const vectorOf = (grid: Grid, origin: string): Vector => ({
  id: idOf(grid as unknown as IntParams),
  grid,
  origin
});

export const inBox = (grid: Grid) =>
  box.every((spec) => {
    const value = grid[spec.key as keyof Grid];

    return Number.isInteger(value) && value >= spec.min && value <= spec.max;
  });

// The first n unique grid vectors of a symbol's scrambled Sobol stream (seeded by the study and the symbol only).
export const sobolVectors = (symbol: string, n: number, label = 'standalone'): Vector[] => {
  const sobol = new Sobol({ dimensions: box.length, scramble: { seed: deriveSeed(study.seedLabel, label, symbol) } });
  const seen = new Set<string>();
  const vectors: Vector[] = [];
  const target = Math.min(n, spaceSize());
  let drawn = 0;

  while (vectors.length < target && drawn < Math.max(target * 64, 1 << 16)) {
    const point = sobol.next();
    const genome = box.map((spec, dimension) =>
      Math.min(gridSizeOf(spec) - 1, Math.floor(point[dimension]! * gridSizeOf(spec)))
    );
    const grid = gridOfGenome(genome);
    const key = gridKey(grid);

    drawn++;

    if (!seen.has(key)) {
      seen.add(key);
      vectors.push(vectorOf(grid, `sobol:${label}:${symbol}:${vectors.length}`));
    }
  }

  return vectors;
};

export const randomVector = (rng: Rng, origin: string): Vector =>
  vectorOf(gridOfGenome(box.map((spec) => rng.int(gridSizeOf(spec)))), origin);

// One coordinate moved by ±1..maxUnits step units (reflected inside the box); never the same grid.
export const mutateOne = (vector: Vector, rng: Rng, origin: string, maxUnits = 3): Vector => {
  for (let attempt = 0; attempt < 32; attempt++) {
    const j = rng.int(paramKeys.length);
    const spec = box[j]!;
    const key = paramKeys[j]!;
    const step = (1 + rng.int(maxUnits)) * units[j]! * (rng.int(2) === 0 ? -1 : 1);
    const value = reflect(vector.grid[key], step, spec.min, spec.max);

    if (value !== vector.grid[key]) {
      return vectorOf({ ...vector.grid, [key]: value }, origin);
    }
  }

  return vector;
};

// Every coordinate moves −u/0/+u with probability ⅓ each (at least one moves).
export const mutateAll = (vector: Vector, rng: Rng, origin: string): Vector => {
  for (let attempt = 0; attempt < 32; attempt++) {
    const grid = { ...vector.grid };
    let moved = false;

    box.forEach((spec, j) => {
      const sign = rng.int(3) - 1;
      const key = paramKeys[j]!;
      const value = reflect(grid[key], sign * units[j]!, spec.min, spec.max);

      if (value !== grid[key]) {
        moved = true;
      }

      grid[key] = value;
    });

    if (moved) {
      return vectorOf(grid, origin);
    }
  }

  return vector;
};

// The neighbourhood instrument: N1 (or N1A2) draw d of a configuration, common random numbers per (stage, draw):
// the October 25 study's neighbourOf with this study's stage labels (its seed label is the earlier study's; the
// stage label makes the streams this study's own).
export const neighbour = (books: readonly Book[], stage: string, cls: 'N1' | 'N1A2', draw: number) =>
  neighbourOf(books, study.seedLabel, stage, cls, draw);

export { Rng, vectorOfGrid };
