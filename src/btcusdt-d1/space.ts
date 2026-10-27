// Candidate generation on the integer grid (PROTOCOL.md §7): a scrambled Sobol design, joint neighbourhood draws and
// the refinement mutation. Every stream is seeded by labels only (src/optimizer/rng.ts), so a rerun with the same
// labels regenerates the same vectors; nothing depends on the clock or Math.random().
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { type D1Grid, gridKey, paramSpecs } from './params.ts';

export const seedRoot = 'btcusdt-d1-v1';

// The first n distinct grid vectors of the study's Sobol stream. The same stream serves every selection window, so
// the windows' designs are paired.
export const sobolGrids = (n: number): D1Grid[] => {
  const sobol = new Sobol({ dimensions: paramSpecs.length, scramble: { seed: deriveSeed(seedRoot, 'sobol') } });
  const seen = new Set<string>();
  const grids: D1Grid[] = [];
  let draws = 0;

  while (grids.length < n) {
    const point = sobol.next();
    const grid = Object.fromEntries(
      paramSpecs.map((spec, dimension) => [
        spec.key,
        Math.min(spec.max, spec.min + Math.floor(point[dimension]! * (spec.max - spec.min + 1)))
      ])
    ) as D1Grid;
    const key = gridKey(grid);

    draws++;

    if (!seen.has(key)) {
      seen.add(key);
      grids.push(grid);
    }

    if (draws > n * 4) {
      throw new Error('The Sobol stream repeats too often for the grid');
    }
  }

  return grids;
};

const reflect = (value: number, min: number, max: number) => {
  let v = value;

  if (v < min) {
    v = 2 * min - v;
  }

  if (v > max) {
    v = 2 * max - v;
  }

  return Math.min(max, Math.max(min, v));
};

// A joint neighbour: every parameter moved by a uniform integer offset in [-radius x step, radius x step].
export const neighbour = (grid: D1Grid, rng: Rng, radius: number): D1Grid =>
  Object.fromEntries(
    paramSpecs.map((spec) => {
      const reach = radius * spec.step;
      const offset = rng.int(2 * reach + 1) - reach;

      return [spec.key, reflect(grid[spec.key] + offset, spec.min, spec.max)];
    })
  ) as D1Grid;

// The refinement mutation: one to three parameters, each moved by a non-zero integer offset of at most two steps.
export const mutate = (grid: D1Grid, rng: Rng): D1Grid => {
  const next = { ...grid };
  const count = 1 + rng.int(3);
  const order = paramSpecs.map((_spec, index) => index);

  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);

    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  for (const index of order.slice(0, count)) {
    const spec = paramSpecs[index]!;
    const reach = 2 * spec.step;
    let offset = 0;

    while (offset === 0) {
      offset = rng.int(2 * reach + 1) - reach;
    }

    next[spec.key] = reflect(grid[spec.key] + offset, spec.min, spec.max);
  }

  return next;
};

export const rngFor = (...labels: (string | number)[]) => Rng.from(seedRoot, ...labels);
