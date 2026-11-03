// The search spaces (SEARCH_PLAN.md §3, §5–6): band-restricted Sobol designs for 4A, grid mutations, and the 4D
// genome (deep tier, shallow tier, allocator) with its group-aware operators. Every vector stays exactly on the grid
// (tenths of a percentage point, integer days and sessions) and inside its role bounds.
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import { type Policy, type PolicyKind, policyOf } from './allocator.ts';
import { type Bounds, type BookSpec, clampToBounds, gridKey, inBounds } from './books.ts';
import { type Grid, paramKeys, stepUnits, study } from './context.ts';

export const seedOf = (...labels: (string | number)[]) => deriveSeed(study.seedLabel, ...labels);
export const rngOf = (...labels: (string | number)[]) => new Rng(seedOf(...labels));

const span = (bounds: Bounds, key: (typeof paramKeys)[number]) => bounds.hi[key] - bounds.lo[key] + 1;

export const gridOfUnit = (point: readonly number[], bounds: Bounds): Grid =>
  Object.fromEntries(
    paramKeys.map((key, d) => [
      key,
      bounds.lo[key] + Math.min(span(bounds, key) - 1, Math.floor(point[d]! * span(bounds, key)))
    ])
  ) as Grid;

// The first n unique grid vectors of a scrambled Sobol stream seeded by (phase, symbol) only, mapped into `bounds`.
export const sobolGrids = (label: string, symbol: string, n: number, bounds: Bounds): Grid[] => {
  const sobol = new Sobol({ dimensions: paramKeys.length, scramble: { seed: seedOf(label, symbol) } });
  const seen = new Set<string>();
  const grids: Grid[] = [];
  let drawn = 0;

  while (grids.length < n && drawn < n * 64) {
    const grid = gridOfUnit(sobol.next(), bounds);
    const key = gridKey(grid);

    drawn++;

    if (!seen.has(key)) {
      seen.add(key);
      grids.push(grid);
    }
  }

  return grids;
};

export const randomGrid = (rng: Rng, bounds: Bounds): Grid =>
  Object.fromEntries(paramKeys.map((key) => [key, bounds.lo[key] + rng.int(span(bounds, key))])) as Grid;

// Move 1..coordinates coordinates by ±1..maxUnits step units, reflected into the bounds; never the same grid.
export const mutateGrid = (grid: Grid, rng: Rng, bounds: Bounds, coordinates = 1, maxUnits = 3): Grid => {
  for (let attempt = 0; attempt < 64; attempt++) {
    const next = { ...grid };
    const keys = [...paramKeys].sort(() => rng.next() - 0.5).slice(0, coordinates);

    for (const key of keys) {
      const units = 1 + rng.int(maxUnits);
      const sign = rng.next() < 0.5 ? -1 : 1;

      next[key] = grid[key] + sign * units * stepUnits[key];
    }

    const clamped = clampToBounds(next, bounds);

    if (gridKey(clamped) !== gridKey(grid)) {
      return clamped;
    }
  }

  return grid;
};

// Map a vector into another band: X keeps its relative position, the other coordinates are clamped.
export const remapGrid = (grid: Grid, from: Bounds, to: Bounds): Grid => {
  const position =
    (grid.targetPercentChange - from.lo.targetPercentChange) / Math.max(1, span(from, 'targetPercentChange') - 1);
  const x = to.lo.targetPercentChange + Math.round(position * (span(to, 'targetPercentChange') - 1));

  return clampToBounds({ ...grid, targetPercentChange: x }, to);
};

// Normalized L1 distance between two grids within bounds (0..1).
export const distance = (a: Grid, b: Grid, bounds: Bounds) =>
  paramKeys.reduce((total, key) => total + Math.abs(a[key] - b[key]) / Math.max(1, span(bounds, key) - 1), 0) /
  paramKeys.length;

// ----- the 4D genome -----

export type Experiment = '4D-A' | '4D-A0P' | '4D-B' | '4D-B0' | '4D-C' | '4D-C0';

export interface Genome {
  deep: BookSpec[]; // B5 books (exact) and/or new deep books
  shallow: BookSpec[];
  policy: Policy;
}

export const genomeKey = (g: Genome) =>
  [
    g.deep
      .map((book) => `${book.symbol}:${book.origin === 'B5' ? 'B5' : gridKey(book.grid)}`)
      .sort()
      .join(','),
    g.shallow
      .map((book) => `${book.symbol}:${gridKey(book.grid)}`)
      .sort()
      .join(','),
    policyKey(g.policy)
  ].join('|');

export const policyKey = (p: Policy) =>
  `${p.kind}:${p.kind === 'P3' ? `${p.budget}:${p.filter}` : p.kind === 'P4' ? p.deadline : ''}:${p.gate}:${p.replacement}:${p.latency}`;

export const policyKinds: PolicyKind[] = ['P0', 'P1', 'P2', 'P3', 'P4'];
export const gates = ['G0', 'G1', 'G2'] as const;

export const randomPolicy = (rng: Rng, index?: number): Policy => {
  const kind = policyKinds[index !== undefined ? index % policyKinds.length : rng.int(policyKinds.length)]!;
  const gate = gates[rng.int(gates.length)]!;

  return policyOf(kind, {
    budget: kind === 'P3' ? 250 * rng.int(21) : 0,
    filter: kind === 'P3' && rng.next() < 0.5 ? 'deep' : 'any',
    deadline: kind === 'P4' ? rng.int(2) : 0,
    gate
  });
};

export const mutatePolicy = (p: Policy, rng: Rng): Policy => {
  const r = rng.next();

  if (r < 0.35) {
    return randomPolicy(rng);
  }

  if (r < 0.55) {
    return { ...p, gate: gates[rng.int(gates.length)]! };
  }

  if (p.kind === 'P3') {
    return r < 0.85
      ? { ...p, budget: Math.max(0, Math.min(5000, p.budget + (rng.next() < 0.5 ? -250 : 250) * (1 + rng.int(3)))) }
      : { ...p, filter: p.filter === 'any' ? 'deep' : 'any' };
  }

  if (p.kind === 'P4') {
    return { ...p, deadline: 1 - p.deadline };
  }

  return randomPolicy(rng);
};

// One-step neighbour of a policy parameter (the selection's robust step: P3 budget ±$250; otherwise unchanged).
export const neighbourPolicy = (p: Policy, rng: Rng): Policy =>
  p.kind === 'P3' ? { ...p, budget: Math.max(0, Math.min(5000, p.budget + (rng.next() < 0.5 ? -250 : 250))) } : p;

export const isValidGrid = (grid: Grid, bounds: Bounds) => inBounds(grid, bounds);
