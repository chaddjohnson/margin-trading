// The deterministic perturbation designs of PROTOCOL.md §5: Latin hypercubes over the coordinates of any subset of a
// configuration's books, in the Study 5/6 "clip" form (centre + round(offset × scale × r), clipped to the box, the
// decisive form) and the "inbox" form (offsets mapped onto the in-box part of each interval; never decisive); the
// dimension-matched variants (count-matched: only k randomly chosen coordinates move; norm-matched: every coordinate
// at scale √(k/d)); one-parameter probes; duplicate and clipping accounting. Point construction is Study 6's
// `pointFromUnits` (unchanged); only the seed namespace (this study's) and the variants are new. Offsets never
// depend on the centre, so two centres evaluated under the same labels share common random numbers.
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { type Grid, d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import {
  type DesignPoint,
  type DesignSpec,
  atBound,
  boundMass,
  clippingSummary,
  normalizedDistance,
  pointFromUnits,
  probesOf,
  specOf
} from '../study6-b5-kre-robustness/designs.ts';
import { seedOf } from './context.ts';
import { type Books, booksKey, orderedOf } from './evaluate.ts';

export type { DesignPoint };
export { atBound, boundMass, clippingSummary, normalizedDistance, probesOf, specOf };

export type Key = (typeof d1Keys)[number];
export type Mode = 'clip' | 'inbox';

export interface Design {
  centre: Books;
  perturb: readonly string[];
  n: number;
  labels: (string | number)[];
  mode: Mode;
  scale: number;
  matchCount?: number; // count-matched: only this many coordinates (chosen per point) move
}

export const seedValue = (labels: (string | number)[]) => deriveSeed(...seedOf(...labels));

export const unitsOf = (n: number, dimensions: number, labels: (string | number)[]) =>
  latinOffsets(n, dimensions, new Rng(seedValue(labels)));

export const design = (spec: Design): DesignPoint[] => {
  const symbols = orderedOf(spec.perturb);
  const dimensions = symbols.length * d1Keys.length;
  const units = unitsOf(spec.n, dimensions, spec.labels);
  const base: DesignSpec = {
    centre: spec.centre,
    perturb: symbols,
    n: spec.n,
    labels: spec.labels,
    mode: spec.mode,
    scale: spec.scale
  };

  if (spec.matchCount !== undefined && spec.matchCount < dimensions) {
    const chooser = new Rng(seedValue([...spec.labels, 'subset']));

    for (const unit of units) {
      const order = Array.from({ length: dimensions }, (_v, i) => i);

      for (let i = dimensions - 1; i > 0; i--) {
        const j = chooser.int(i + 1);

        [order[i], order[j]] = [order[j]!, order[i]!];
      }

      const keep = new Set(order.slice(0, spec.matchCount));

      for (let d = 0; d < dimensions; d++) {
        if (!keep.has(d)) unit[d] = 0;
      }
    }
  }

  return units.map((unit, index) => {
    const point = pointFromUnits(base, unit, index);

    delete point.unit;
    return point;
  });
};

// Exact duplicates: a point equal to the centre or to an earlier point of the same set.
export const uniqueMask = (points: readonly DesignPoint[], centre: Books) => {
  const seen = new Set<string>([booksKey(centre)]);

  return points.map((point) => {
    const key = booksKey(point.books);

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

export const uniquePoints = (points: readonly DesignPoint[], centre: Books) => {
  const mask = uniqueMask(points, centre);

  return points.filter((_p, i) => mask[i]);
};

// Normalized L∞ distance between two configurations over the given books (per-dimension difference ÷ (grid points − 1)).
export const configDistance = (a: Books, b: Books, symbols: readonly string[]) => normalizedDistance(a, b, symbols);

export const boundCount = (books: Books, symbols: readonly string[]) =>
  symbols.reduce((total, symbol) => total + atBound(books[symbol]!).length, 0);

export const inBox = (grid: Grid) =>
  d1Keys.every((key) => {
    const spec = specOf(key);
    const value = grid[key];

    return Number.isInteger(value) && value >= spec.min && value <= spec.max;
  });

// The neighbourhood families (PROTOCOL.md §5.3). `fam` names the seed family; `rep` the replicate.
export const familyDesign = (
  centre: Books,
  perturb: readonly string[],
  family: { n: number; labels: (string | number)[]; mode?: Mode; scale?: number; matchCount?: number }
) =>
  design({
    centre,
    perturb,
    n: family.n,
    labels: family.labels,
    mode: family.mode ?? 'clip',
    scale: family.scale ?? 1,
    ...(family.matchCount !== undefined ? { matchCount: family.matchCount } : {})
  });
