// The vector libraries (PROTOCOL.md §8): 1,024 unique quantized vectors from one scrambled Sobol stream over the
// unchanged D1 box, seeded ('diverse-d1', 'library', 'sobol-scramble') — a fresh sample, not the October 25 study's —
// identical in every round. Unseeded arms use these only. Seeded arms (final round only) add the earlier studies'
// inspected control vectors, flagged; R1/R4 and October 25 finalist vectors are never added.
import type { IntParams } from '../d1-refinement/families.ts';
import { type ControlVector, controlVectors } from '../joint-16-etf-d1/space.ts';
import { gridOfGenome } from '../d1-robust/library.ts';
import type { Vector } from '../d1-robust/neighbourhood.ts';
import { box, gridSizeOf, idOf, spaceSize } from '../multi-etf-d1/space.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { type StartLabel, study } from './context.ts';

export const librarySeed = () => deriveSeed(study.seedLabel, 'library', 'sobol-scramble');

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

export interface ArmLibrary {
  start: StartLabel;
  vectors: Vector[];
  sobol: Vector[];
  controls: ControlVector[];
}

export const armLibrary = async (start: StartLabel): Promise<ArmLibrary> => {
  const sobol = sobolLibrary().vectors;

  if (start === 'unseeded') {
    return { start, vectors: sobol, sobol, controls: [] };
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

  return { start, vectors, sobol, controls };
};

export const isInspectedControl = (vector: Pick<Vector, 'origin'>) => vector.origin.startsWith('control:');
