// The deterministic perturbation designs of PROTOCOL.md §5: Latin hypercubes over any subset of the five books
// (joint 40-D, per-book 8-D, pair 16-D), in the Study 5 "clip" form (centre + round(offset × scale × r), clipped to the
// box) and the "inbox" form (offsets mapped onto the in-box part of each interval); paired variants (a coordinate or a
// book reset to the centre); one-parameter probes and lines; duplicate and clipping accounting. The LHS generator and
// the box are the Study 5 / multi-etf-d1 ones, unchanged; only the seed labels are this study's.
import { box, probeParams } from '../multi-etf-d1/space.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { type Grid, d1Keys } from '../portfolio-aware-d1/phenotypes.ts';
import { latinOffsets } from '../study5-gdx-b5-three-etf/grid.ts';
import { bookOrder, radius, seedOf } from './context.ts';

export type Key = (typeof d1Keys)[number];
export type Books = Record<string, Grid>;

export const specOf = (key: Key) => {
  const spec = box.find((item) => item.key === key);

  if (!spec) {
    throw new Error(`no box spec for ${key}`);
  }

  return spec;
};

export const orderedOf = (symbols: readonly string[]) =>
  (bookOrder as readonly string[]).filter((symbol) => symbols.includes(symbol));

export interface Clip {
  symbol: string;
  key: Key;
  bound: 'min' | 'max';
}

export interface DesignPoint {
  index: number; // 0-based position in the design
  books: Books; // every book of the configuration (perturbed or not)
  clipped: Clip[];
  distance: number; // L∞ of |value − centre| ÷ r over the perturbed coordinates
  unit?: number[]; // the LHS offsets (kept for paired variants; dropped from stored records)
}

export type Mode = 'clip' | 'inbox';

export interface DesignSpec {
  centre: Books;
  perturb: readonly string[]; // the books whose coordinates vary
  n: number;
  labels: (string | number)[];
  mode: Mode;
  scale: number;
  radiusOf?: (symbol: string, key: Key) => number; // default: the study radius
}

const unitsOf = (n: number, dimensions: number, labels: (string | number)[]) =>
  latinOffsets(n, dimensions, new Rng(deriveSeed(...seedOf(...labels))));

export const seedValueOf = (labels: (string | number)[]) => deriveSeed(...seedOf(...labels));

// One coordinate from an offset u ∈ [−1, 1].
export const coordinate = (centre: number, u: number, key: Key, mode: Mode, scale: number, r: number) => {
  const spec = specOf(key);

  if (mode === 'clip') {
    const raw = centre + Math.round(u * scale * r);
    const value = Math.min(spec.max, Math.max(spec.min, raw));

    return { value, clipped: raw > spec.max ? ('max' as const) : raw < spec.min ? ('min' as const) : undefined };
  }

  const lo = Math.max(spec.min, centre - Math.round(scale * r));
  const hi = Math.min(spec.max, centre + Math.round(scale * r));

  return { value: Math.round(lo + ((u + 1) / 2) * (hi - lo)), clipped: undefined };
};

export const pointFromUnits = (spec: DesignSpec, unit: number[], index: number): DesignPoint => {
  const symbols = orderedOf(spec.perturb);
  const books: Books = Object.fromEntries(Object.entries(spec.centre).map(([symbol, grid]) => [symbol, { ...grid }]));
  const clipped: Clip[] = [];
  let distance = 0;

  symbols.forEach((symbol, book) => {
    d1Keys.forEach((key, dimension) => {
      const r = spec.radiusOf ? spec.radiusOf(symbol, key) : radius[key];
      const centre = spec.centre[symbol]![key];
      const result = coordinate(centre, unit[book * d1Keys.length + dimension]!, key, spec.mode, spec.scale, r);

      books[symbol]![key] = result.value;

      if (result.clipped) {
        clipped.push({ symbol, key, bound: result.clipped });
      }

      distance = Math.max(distance, r > 0 ? Math.abs(result.value - centre) / r : 0);
    });
  });

  return { index, books, clipped, distance, unit };
};

export const design = (spec: DesignSpec): DesignPoint[] => {
  const dimensions = orderedOf(spec.perturb).length * d1Keys.length;

  return unitsOf(spec.n, dimensions, spec.labels).map((unit, index) => pointFromUnits(spec, unit, index));
};

// The paired variants of PROTOCOL.md §6.4: a design point with some coordinates or books reset to the centre.
export const resetCoordinate = (point: DesignPoint, centre: Books, symbol: string, key: Key): DesignPoint => {
  const books: Books = Object.fromEntries(Object.entries(point.books).map(([s, grid]) => [s, { ...grid }]));

  books[symbol]![key] = centre[symbol]![key];

  return { ...point, books, clipped: point.clipped.filter((clip) => !(clip.symbol === symbol && clip.key === key)) };
};

export const resetBook = (point: DesignPoint, centre: Books, symbol: string): DesignPoint => ({
  ...point,
  books: { ...point.books, [symbol]: { ...centre[symbol]! } },
  clipped: point.clipped.filter((clip) => clip.symbol !== symbol)
});

export const onlyBook = (point: DesignPoint, centre: Books, symbol: string): DesignPoint => ({
  ...point,
  books: Object.fromEntries(
    Object.keys(point.books).map((s) => [s, s === symbol ? { ...point.books[s]! } : { ...centre[s]! }])
  ),
  clipped: point.clipped.filter((clip) => clip.symbol === symbol)
});

export const booksKey = (books: Books) =>
  orderedOf(Object.keys(books))
    .map((symbol) => `${symbol}:${d1Keys.map((key) => books[symbol]![key]).join('/')}`)
    .join('|');

// Exact duplicates: a point equal to the centre or to an earlier point of the same set.
export const uniqueMask = (points: readonly DesignPoint[], centre: Books) => {
  const seen = new Set<string>([booksKey(centre)]);

  return points.map((point) => {
    const key = booksKey(point.books);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const clippingSummary = (points: readonly DesignPoint[]) => {
  const byCoordinate: Record<string, { min: number; max: number }> = {};

  for (const point of points) {
    for (const clip of point.clipped) {
      const key = `${clip.symbol}.${clip.key}`;

      byCoordinate[key] ??= { min: 0, max: 0 };
      byCoordinate[key][clip.bound]++;
    }
  }

  return {
    pointsWithClip: points.filter((point) => point.clipped.length > 0).length,
    byCoordinate
  };
};

// Mass on each bound per coordinate of the perturbed books (clip or inbox), for the boundary audit.
export const boundMass = (points: readonly DesignPoint[], symbols: readonly string[]) => {
  const out: Record<string, { atMin: number; atMax: number }> = {};

  for (const symbol of symbols) {
    for (const key of d1Keys) {
      const spec = specOf(key);
      const values = points.map((point) => point.books[symbol]![key]);

      out[`${symbol}.${key}`] = {
        atMin: values.filter((value) => value === spec.min).length,
        atMax: values.filter((value) => value === spec.max).length
      };
    }
  }

  return out;
};

// One-parameter probes (±1/±2 increments of the repository's probe set), in-box only; the out-of-box ones listed.
export const probesOf = (grid: Grid) => {
  const inBox = probeParams(grid as unknown as IntParams).map((probe) => ({
    key: probe.key as Key,
    offset: probe.offset,
    grid: probe.params as unknown as Grid
  }));
  const dropped: { key: Key; offset: number; value: number }[] = [];

  for (const spec of box) {
    for (const offset of spec.probes) {
      const value = grid[spec.key as Key] + offset;

      if (value < spec.min || value > spec.max) {
        dropped.push({ key: spec.key as Key, offset, value });
      }
    }
  }

  return { probes: inBox, dropped };
};

// Every grid value of one parameter inside centre ± scale × r (in-box).
export const lineOf = (grid: Grid, key: Key, scale: number, from?: number) => {
  const spec = specOf(key);
  const lo = Math.max(spec.min, from ?? grid[key] - Math.round(scale * radius[key]));
  const hi = Math.min(spec.max, grid[key] + Math.round(scale * radius[key]));
  const values: number[] = [];

  for (let value = lo; value <= hi; value++) {
    values.push(value);
  }

  return values.map((value) => ({ value, grid: { ...grid, [key]: value } }));
};

// Normalized L∞ distance (per-dimension difference ÷ (grid points − 1)) over some books (the diversity metric).
export const normalizedDistance = (a: Books, b: Books, symbols: readonly string[]) =>
  Math.max(
    ...symbols.flatMap((symbol) =>
      d1Keys.map((key) => {
        const spec = specOf(key);

        return Math.abs(a[symbol]![key] - b[symbol]![key]) / Math.max(1, spec.max - spec.min);
      })
    )
  );

export const atBound = (grid: Grid) =>
  d1Keys.filter((key) => {
    const spec = specOf(key);

    return grid[key] === spec.min || grid[key] === spec.max;
  });
