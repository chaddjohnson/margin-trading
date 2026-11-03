// The vector library (PROTOCOL.md §8): 1,024 unique quantized vectors from one scrambled Sobol stream over the
// unchanged D1 box, seeded ('robust-d1', 'library', 'sobol-scramble') and identical in every round; in the final round
// only, the 16-ETF study's control set (D1's shipped constants, the eight-ETF nominations, the portfolio-aware frozen
// vectors incl. B5's GDX vector) is added with `inspectedPostTraining: true`. R1/R4 vectors are never added. The
// single-book traces of the library are pinned; their figures are diagnostics no stage reads.
import type { IntParams } from '../d1-refinement/families.ts';
import { type ControlVector, controlVectors } from '../joint-16-etf-d1/space.ts';
import { box, genomeToParams, gridSizeOf, idOf, inBox, spaceSize } from '../multi-etf-d1/space.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { type Grid, gridOf } from '../portfolio-aware-d1/phenotypes.ts';
import { type WindowKey, study } from './context.ts';
import type { Vector } from './neighbourhood.ts';

export const librarySeed = () => deriveSeed(study.seedLabel, 'library', 'sobol-scramble');

export const gridOfGenome = (genome: number[]): Grid => gridOf(genomeToParams(genome) as Record<string, number>);

export const vectorOf = (grid: Grid, origin: string): Vector => {
  if (!inBox(grid as unknown as IntParams)) {
    throw new Error(`${origin}: ${JSON.stringify(grid)} is outside the box`);
  }

  return { id: idOf(grid as unknown as IntParams), grid, origin };
};

export const sobolLibrary = (samples: number = study.library.sobolSamples) => {
  const seed = librarySeed();
  const sobol = new Sobol({ dimensions: box.length, scramble: { seed } });
  const seen = new Set<string>();
  const vectors: Vector[] = [];
  let drawn = 0;
  const target = Math.min(samples, spaceSize());

  while (vectors.length < target && drawn < Math.max(target * 64, 1 << 16)) {
    const point = sobol.next();
    const genome = box.map((spec, dimension) =>
      Math.min(gridSizeOf(spec) - 1, Math.floor(point[dimension]! * gridSizeOf(spec)))
    );
    const grid = gridOfGenome(genome);
    const id = idOf(grid as unknown as IntParams);

    drawn++;

    if (!seen.has(id)) {
      seen.add(id);
      vectors.push({ id, grid, origin: `sobol:${vectors.length + 1}` });
    }
  }

  return { vectors, seed, drawn, duplicates: drawn - vectors.length };
};

export interface RoundLibrary {
  round: WindowKey;
  vectors: Vector[];
  sobol: Vector[];
  controls: ControlVector[];
}

// Fold rounds: the Sobol vectors only (the controls were chosen on years the folds validate on). Final round: the
// controls first (flagged), then the Sobol vectors, each ID once.
export const roundLibrary = async (round: WindowKey): Promise<RoundLibrary> => {
  const sobol = sobolLibrary().vectors;

  if (round !== 'final') {
    return { round, vectors: sobol, sobol, controls: [] };
  }

  const controls = await controlVectors();
  const seen = new Set<string>();
  const vectors: Vector[] = [];

  for (const vector of [...controls, ...sobol]) {
    if (!seen.has(vector.id)) {
      seen.add(vector.id);
      vectors.push({ id: vector.id, grid: vector.grid, origin: vector.origin });
    }
  }

  return { round, vectors, sobol, controls };
};

export const isInspectedControl = (vector: Vector) => vector.origin.startsWith('control:');
