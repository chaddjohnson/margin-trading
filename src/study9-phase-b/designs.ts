// The deterministic perturbation designs (PROTOCOL.md §5): Study 8's designs.ts and Study 6's pointFromUnits, ported
// line for line. Differences: the seed namespace (space.ts seedValue, 'study9-phase-b') and the book order (bookOrderOf;
// Study 6/8 filtered to their five symbols and would silently drop new ones). The geometry is Study 8's exactly: Latin
// hypercubes over the coordinates of any subset of a configuration's books; the "clip" form (centre + round(offset ×
// scale × r), clipped to the box: the decisive form) and the "inbox" form (offsets mapped onto the in-box part of each
// interval); count-matched (only k randomly chosen coordinates move) and norm-matched variants; de-duplication against
// the centre and earlier points. Coordinates come from Study 6's coordinate(), the radius from Study 8's context,
// imported unchanged. Offsets never depend on the centre (common random numbers across centres of one family).
import { Rng } from '../optimizer/rng.ts';
import { d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import {
  type Clip,
  type DesignPoint,
  atBound,
  boundMass,
  clippingSummary,
  coordinate,
  normalizedDistance,
  probesOf,
  specOf
} from '../study6-b5-kre-robustness/designs.ts';
import { radius } from './context.ts';
import { type Books, booksKey, orderedOf } from './engine.ts';
import { seedValue } from './space.ts';

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
  matchCount?: number;
}

export const unitsOf = (n: number, dimensions: number, labels: (string | number)[]) =>
  latinOffsets(n, dimensions, new Rng(seedValue(labels)));

// Study 6's pointFromUnits (unchanged arithmetic; the engine's book order).
export const pointFromUnits = (
  spec: { centre: Books; perturb: readonly string[]; mode: Mode; scale: number },
  unit: number[],
  index: number
): DesignPoint => {
  const symbols = orderedOf(spec.perturb);
  const books: Books = Object.fromEntries(Object.entries(spec.centre).map(([symbol, grid]) => [symbol, { ...grid }]));
  const clipped: Clip[] = [];
  let distance = 0;

  symbols.forEach((symbol, book) => {
    d1Keys.forEach((key, dimension) => {
      const r = radius[key];
      const centre = spec.centre[symbol]![key];
      const result = coordinate(centre, unit[book * d1Keys.length + dimension]!, key, spec.mode, spec.scale, r);

      books[symbol]![key] = result.value;

      if (result.clipped) clipped.push({ symbol, key, bound: result.clipped });

      distance = Math.max(distance, r > 0 ? Math.abs(result.value - centre) / r : 0);
    });
  });

  return { index, books, clipped, distance, unit };
};

export const design = (spec: Design): DesignPoint[] => {
  const symbols = orderedOf(spec.perturb);
  const dimensions = symbols.length * d1Keys.length;
  const units = unitsOf(spec.n, dimensions, spec.labels);

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
    const point = pointFromUnits(
      { centre: spec.centre, perturb: symbols, mode: spec.mode, scale: spec.scale },
      unit,
      index
    );

    delete point.unit;
    return point;
  });
};

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

export const configDistance = (a: Books, b: Books, symbols: readonly string[]) => normalizedDistance(a, b, symbols);

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

// Coordinates within one radius of a bound (Q2b/T2b in-box gate applies).
export const nearBound = (books: Books) =>
  orderedOf(Object.keys(books)).flatMap((symbol) =>
    d1Keys
      .filter((key) => {
        const spec = specOf(key);
        const value = books[symbol]![key];

        return value - spec.min < radius[key] || spec.max - value < radius[key];
      })
      .map((key) => `${symbol}.${key}`)
  );
