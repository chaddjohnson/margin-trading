// The neighbourhood instrument (PROTOCOL.md §4): step units on the unchanged D1 box, reflection at the bounds, and
// common random numbers. A draw's step pattern is generated for every symbol of the full candidate universe in
// alphabetical order, from a seed of (study, window, stage, class, draw) only — never a configuration key — so two
// configurations sharing a symbol and a vector receive identical neighbours on it, and comparisons are paired.
//
// Classes: N1 joint (every member, every parameter: −u, 0, +u with probability 1/3 each), N1-A2 (2u), N2 fixed mass
// (3 coordinates of the configuration, ±u), N3 one book (one member perturbed as N1, the others unchanged), N0 the
// one-coordinate probes. The centre is never a draw.
import type { IntParams } from '../d1-refinement/families.ts';
import { box, idOf } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { candidateUniverse, study } from './context.ts';

export interface Vector {
  id: string;
  grid: Grid;
  origin: string;
}

export interface Book {
  symbol: string;
  vector: Vector;
}

export type NeighbourClass = 'N1' | 'N1A2' | 'N2' | 'N3';

const paramKeys = box.map((spec) => spec.key as keyof Grid);
const units = paramKeys.map((key) => study.stepUnits[key]!);

export const stepUnitOf = (key: string) => {
  const unit = study.stepUnits[key];

  if (unit === undefined) {
    throw new Error(`${key} has no step unit`);
  }

  return unit;
};

// θ + s inside the box; else θ − s (reflected inward); else θ.
export const reflect = (value: number, step: number, min: number, max: number) => {
  const forward = value + step;

  if (forward >= min && forward <= max) {
    return forward;
  }

  const backward = value - step;

  return backward >= min && backward <= max ? backward : value;
};

// The collision-free identity of a vector: its eight grid values in box order (the D1 candidate ID is a 40-bit hash
// prefix, kept as a label only; every cache and configuration key in this study uses the grid itself).
export const gridKeyOf = (grid: Grid) => paramKeys.map((key) => grid[key]).join('.');

export const vectorOfGrid = (grid: Grid, origin: string): Vector => ({
  id: idOf(grid as unknown as IntParams),
  grid,
  origin
});

// ----- step patterns (CRN) -----

const patternCache = new Map<string, Map<string, Int8Array>>();

// The N1 step signs (−1, 0, +1) of draw d for every candidate symbol, in box order.
export const stepPattern = (window: string, stage: string, cls: string, draw: number): Map<string, Int8Array> => {
  const key = `${window}|${stage}|${cls}|${draw}`;
  let pattern = patternCache.get(key);

  if (!pattern) {
    const rng = Rng.from(study.seedLabel, window, stage, cls, draw);

    pattern = new Map();

    for (const symbol of candidateUniverse) {
      const signs = new Int8Array(paramKeys.length);

      for (let j = 0; j < paramKeys.length; j++) {
        signs[j] = rng.int(3) - 1;
      }

      pattern.set(symbol, signs);
    }

    if (patternCache.size > 20000) {
      patternCache.clear();
    }

    patternCache.set(key, pattern);
  }

  return pattern;
};

export const applySigns = (grid: Grid, signs: Int8Array, amplitude = 1): Grid => {
  const next = { ...grid };

  box.forEach((spec, j) => {
    const key = spec.key as keyof Grid;

    next[key] = reflect(grid[key], signs[j]! * units[j]! * amplitude, spec.min, spec.max);
  });

  return next;
};

const sortedBooks = (books: readonly Book[]) => [...books].sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

const neighbourBook = (book: Book, grid: Grid, origin: string): Book =>
  grid === book.vector.grid ? book : { symbol: book.symbol, vector: vectorOfGrid(grid, origin) };

// One neighbour of a configuration: class N1 (A1/A2), N2 or N3 (with the member for N3), draw d.
export const neighbourOf = (
  books: readonly Book[],
  window: string,
  stage: string,
  cls: NeighbourClass,
  draw: number,
  member?: string
): Book[] => {
  const members = sortedBooks(books);

  if (cls === 'N1' || cls === 'N1A2') {
    const pattern = stepPattern(window, stage, cls === 'N1' ? 'N1' : 'N1A2', draw);
    const amplitude = cls === 'N1' ? 1 : study.amplitudeA2;

    return members.map((book) =>
      neighbourBook(book, applySigns(book.vector.grid, pattern.get(book.symbol)!, amplitude), `${stage}:${cls}:${draw}`)
    );
  }

  if (cls === 'N3') {
    if (!member || !members.some((book) => book.symbol === member)) {
      throw new Error(`N3 needs a member of the configuration, not ${member}`);
    }

    const pattern = stepPattern(window, stage, 'N3', draw);

    return members.map((book) =>
      book.symbol === member
        ? neighbourBook(book, applySigns(book.vector.grid, pattern.get(book.symbol)!), `${stage}:N3:${member}:${draw}`)
        : book
    );
  }

  // N2: exactly K coordinates among the 8k, chosen uniformly without replacement, each ±u with a uniform sign.
  const rng = Rng.from(study.seedLabel, window, stage, 'N2', draw);
  const total = members.length * paramKeys.length;
  const coordinates = Array.from({ length: total }, (_, index) => index);
  const chosen: number[] = [];

  for (let pick = 0; pick < Math.min(study.fixedMassCoordinates, total); pick++) {
    chosen.push(coordinates.splice(rng.int(coordinates.length), 1)[0]!);
  }

  const signs = chosen.map(() => (rng.int(2) === 0 ? -1 : 1));
  const grids = members.map((book) => ({ ...book.vector.grid }));

  chosen.forEach((coordinate, index) => {
    const b = Math.floor(coordinate / paramKeys.length);
    const j = coordinate % paramKeys.length;
    const spec = box[j]!;
    const key = spec.key as keyof Grid;

    grids[b]![key] = reflect(grids[b]![key], signs[index]! * units[j]!, spec.min, spec.max);
  });

  return members.map((book, b) => neighbourBook(book, grids[b]!, `${stage}:N2:${draw}`));
};

// The N1 neighbours 0..n−1 of a configuration.
export const neighbours = (
  books: readonly Book[],
  window: string,
  stage: string,
  n: number,
  cls: 'N1' | 'N1A2' = 'N1'
) => Array.from({ length: n }, (_, draw) => neighbourOf(books, window, stage, cls, draw));

// The number of moved coordinates of a neighbour.
export const movedCoordinates = (centre: readonly Book[], neighbour: readonly Book[]) => {
  const bySymbol = new Map(centre.map((book) => [book.symbol, book.vector.grid]));
  let moved = 0;

  for (const book of neighbour) {
    const grid = bySymbol.get(book.symbol)!;

    for (const key of paramKeys) {
      if (grid[key] !== book.vector.grid[key]) {
        moved++;
      }
    }
  }

  return moved;
};

// Boundary-sitting coordinates of a configuration (a coordinate at a box bound).
export const boundaryCoordinates = (books: readonly Book[]) => {
  let count = 0;

  for (const book of books) {
    box.forEach((spec) => {
      const value = book.vector.grid[spec.key as keyof Grid];

      if (value === spec.min || value === spec.max) {
        count++;
      }
    });
  }

  return count;
};

export const paramOrder = paramKeys;
