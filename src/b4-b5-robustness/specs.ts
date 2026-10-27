// Every run of the audit as a plain, serializable specification (PROTOCOL.md §3–§8): the frozen pools' books and grids
// read through the pools loader, the one-at-a-time points, the Latin-hypercube neighbourhoods, the leave-one-book-out
// pools, the cost scenarios and the controls. A specification carries grids only, never machine parameters, so a
// worker converts them exactly as the registry does (paramsOf). Generation is deterministic: the same protocol gives
// the same list, in the same order, with the same keys.
import crypto from 'node:crypto';
import { type D1Key, d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { loadPool } from '../pools/load.ts';
import {
  type CostScenario,
  type OffsetLabel,
  type PoolId,
  base,
  bookSamples,
  boundaryProbes,
  costScenarios,
  distancesOf,
  jointSamples,
  jointSeeds,
  legal,
  offsetLabels,
  poolIds,
  studyLabel
} from './context.ts';

export type Grid = Record<D1Key, number>;
export type Mode = 'fixed' | 'portfolio';
export type Family = 'base' | 'oat' | 'boundary' | 'joint' | 'book' | 'ablation' | 'cost' | 'control' | 'dividends';

export interface BookSpec {
  symbol: string;
  phenotype: string; // the pool's phenotype name, suffixed '~diag' for a perturbed book (labels only)
  grid: Grid;
}

export interface RunSpec {
  key: string;
  family: Family;
  pool: PoolId | 'C0';
  mode: Mode;
  books: BookSpec[]; // in the pool's order
  rate: number;
  costBps: number;
  stopSlippageBps: number;
  stopFill: 'stop' | 'next-open';
  dividends: 'frozen' | 'symmetric';
  diagnostic: boolean; // every non-frozen configuration is diagnostic-only
  detail: boolean; // keep the full lot and daily ledgers
  meta: Record<string, string | number | boolean>;
}

export interface FrozenPool {
  id: PoolId;
  books: BookSpec[];
}

export const loadFrozenPools = async (): Promise<Record<PoolId, FrozenPool>> => {
  const pools = {} as Record<PoolId, FrozenPool>;

  for (const id of poolIds) {
    const loaded = await loadPool(id);

    pools[id] = {
      id,
      books: loaded.config.books.map((book) => ({
        symbol: book.symbol,
        phenotype: book.phenotype,
        grid: Object.fromEntries(d1Keys.map((key) => [key, book.grid[key]])) as Grid
      }))
    };
  }

  return pools;
};

export const gridLabel = (grid: Grid) => d1Keys.map((key) => `${key}=${grid[key]}`).join(',');

const hashOf = (value: unknown) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 12);

// The algorithmic content of a specification (what determines its result): its hash keys the cache.
export const specHash = (spec: RunSpec) =>
  hashOf({
    mode: spec.mode,
    books: spec.books.map((book) => ({ symbol: book.symbol, grid: book.grid })),
    rate: spec.rate,
    costBps: spec.costBps,
    stopSlippageBps: spec.stopSlippageBps,
    stopFill: spec.stopFill,
    dividends: spec.dividends
  });

const runOf = (
  partial: Omit<RunSpec, 'rate' | 'costBps' | 'stopSlippageBps' | 'stopFill' | 'dividends' | 'detail'> &
    Partial<Pick<RunSpec, 'rate' | 'costBps' | 'stopSlippageBps' | 'stopFill' | 'dividends' | 'detail'>>
): RunSpec => ({
  rate: base.rate,
  costBps: base.costBps,
  stopSlippageBps: base.stopSlippageBps,
  stopFill: base.stopFill,
  dividends: base.dividends,
  detail: false,
  ...partial
});

const withGrid = (books: BookSpec[], symbol: string, grid: Grid): BookSpec[] =>
  books.map((book) => (book.symbol === symbol ? { ...book, phenotype: `${book.phenotype}~diag`, grid } : book));

// ----- one-at-a-time -----

export interface OatPoint {
  pool: PoolId;
  symbol: string;
  key: D1Key;
  offset: OffsetLabel;
  frozen: number;
  value: number;
  distance: number;
  rule: string;
  feasible: boolean;
  reason: string;
  boundary: boolean; // a supplementary out-of-grid boundary probe
}

export const oatPoints = (pool: FrozenPool): OatPoint[] => {
  const points: OatPoint[] = [];

  for (const book of pool.books) {
    for (const key of d1Keys) {
      const v = book.grid[key];
      const { small, moderate, rule } = distancesOf(key, v);
      const { min, max } = legal(key);

      for (const offset of offsetLabels) {
        const distance = offset.endsWith('m') ? moderate : small;
        const value = v + (offset.startsWith('-') ? -distance : distance);
        const feasible = value >= min && value <= max;
        const boundary =
          !feasible && value > max && boundaryProbes.some((probe) => probe.symbol === book.symbol && probe.key === key);

        points.push({
          pool: pool.id,
          symbol: book.symbol,
          key,
          offset,
          frozen: v,
          value,
          distance,
          rule,
          feasible,
          reason: feasible
            ? ''
            : `${value < min ? 'below' : 'above'} the engine grid ${value < min ? 'minimum' : 'maximum'} ${value < min ? min : max}${boundary ? ' (run as a supplementary boundary probe)' : ' (not run, not replaced)'}`,
          boundary
        });
      }
    }
  }

  return points;
};

// ----- Latin-hypercube neighbourhoods -----

export interface Dimension {
  symbol: string;
  key: D1Key;
  frozen: number;
  values: number[]; // the legal grid values inside [v − m, v + m]
}

export const dimensionsOf = (books: BookSpec[], only?: string): Dimension[] =>
  books
    .filter((book) => !only || book.symbol === only)
    .flatMap((book) =>
      d1Keys.map((key) => {
        const v = book.grid[key];
        const { moderate } = distancesOf(key, v);
        const { min, max } = legal(key);
        const values: number[] = [];

        for (let value = Math.max(min, v - moderate); value <= Math.min(max, v + moderate); value++) {
          values.push(value);
        }

        return { symbol: book.symbol, key, frozen: v, values };
      })
    );

// A Latin hypercube: per dimension a random permutation of the N strata and a uniform point inside each stratum,
// mapped onto the dimension's legal values. Deterministic in its labels.
export const latinHypercube = (dimensions: Dimension[], samples: number, ...labels: (string | number)[]) => {
  const rng = new Rng(deriveSeed(studyLabel, ...labels));
  const columns = dimensions.map((dimension) => {
    const permutation = Array.from({ length: samples }, (_, index) => index);

    for (let index = samples - 1; index > 0; index--) {
      const other = rng.int(index + 1);

      [permutation[index], permutation[other]] = [permutation[other]!, permutation[index]!];
    }

    return permutation.map((stratum) => {
      const u = (stratum + rng.next()) / samples;

      return dimension.values[Math.min(dimension.values.length - 1, Math.floor(u * dimension.values.length))]!;
    });
  });

  return Array.from({ length: samples }, (_, sample) => dimensions.map((_, d) => columns[d]![sample]!));
};

export const applySample = (books: BookSpec[], dimensions: Dimension[], values: number[]): BookSpec[] => {
  const grids = new Map(books.map((book) => [book.symbol, { ...book.grid }]));

  dimensions.forEach((dimension, index) => {
    grids.get(dimension.symbol)![dimension.key] = values[index]!;
  });

  return books.map((book) => {
    const grid = grids.get(book.symbol)!;
    const changed = d1Keys.some((key) => grid[key] !== book.grid[key]);

    return changed ? { ...book, phenotype: `${book.phenotype}~diag`, grid } : book;
  });
};

// ----- the full run list -----

export const modes: Mode[] = ['fixed', 'portfolio'];

export const scenarioRun = (pool: FrozenPool, scenario: CostScenario, mode: Mode): RunSpec =>
  runOf({
    key: `cost:${pool.id}:${scenario.id}:${mode}`,
    family: scenario.id === 'base' ? 'base' : 'cost',
    pool: pool.id,
    mode,
    books: pool.books,
    rate: scenario.rate,
    costBps: scenario.costBps,
    stopSlippageBps: scenario.stopSlippageBps,
    stopFill: scenario.stopFill,
    diagnostic: scenario.id !== 'base',
    detail: scenario.id === 'base',
    meta: { scenario: scenario.id }
  });

export const baseRun = (pool: FrozenPool, mode: Mode) => scenarioRun(pool, costScenarios[0]!, mode);

export const controlRun = (): RunSpec =>
  runOf({
    key: 'control:C0:portfolio',
    family: 'control',
    pool: 'C0',
    mode: 'portfolio',
    books: [],
    diagnostic: false,
    detail: true,
    meta: {}
  });

export const allSpecs = (pools: Record<PoolId, FrozenPool>) => {
  const specs: RunSpec[] = [controlRun()];
  const oat: OatPoint[] = [];
  const samples: { pool: PoolId; design: string; index: number; values: number[]; dimensions: Dimension[] }[] = [];

  for (const id of poolIds) {
    const pool = pools[id];

    // Base and cost scenarios (the base runs are the scenario 'base').
    for (const scenario of costScenarios) {
      for (const mode of modes) {
        specs.push(scenarioRun(pool, scenario, mode));
      }
    }

    // The symmetric-dividend sensitivity of the base portfolio.
    specs.push(
      runOf({
        key: `dividends:${id}:symmetric:portfolio`,
        family: 'dividends',
        pool: id,
        mode: 'portfolio',
        books: pool.books,
        dividends: 'symmetric',
        diagnostic: false,
        detail: true,
        meta: { dividends: 'symmetric' }
      })
    );

    // Leave-one-book-out.
    for (const book of pool.books) {
      for (const mode of modes) {
        specs.push(
          runOf({
            key: `ablation:${id}:-${book.symbol}:${mode}`,
            family: 'ablation',
            pool: id,
            mode,
            books: pool.books.filter((other) => other.symbol !== book.symbol),
            diagnostic: true,
            detail: false,
            meta: { removed: book.symbol }
          })
        );
      }
    }

    // One-at-a-time points (feasible ones, and the supplementary boundary probes).
    for (const point of oatPoints(pool)) {
      oat.push(point);

      if (!point.feasible && !point.boundary) {
        continue;
      }

      const book = pool.books.find((item) => item.symbol === point.symbol)!;

      for (const mode of modes) {
        specs.push(
          runOf({
            key: `${point.boundary ? 'boundary' : 'oat'}:${id}:${point.symbol}:${point.key}:${point.offset}:${mode}`,
            family: point.boundary ? 'boundary' : 'oat',
            pool: id,
            mode,
            books: withGrid(pool.books, point.symbol, { ...book.grid, [point.key]: point.value }),
            diagnostic: true,
            detail: false,
            meta: { symbol: point.symbol, parameter: point.key, offset: point.offset, value: point.value }
          })
        );
      }
    }

    // Joint neighbourhoods over every book (two seeds).
    const allDimensions = dimensionsOf(pool.books);

    for (const seed of jointSeeds) {
      latinHypercube(allDimensions, jointSamples, 'joint', id, seed).forEach((values, index) => {
        const design = `joint-s${seed}`;

        samples.push({ pool: id, design, index, values, dimensions: allDimensions });

        for (const mode of modes) {
          specs.push(
            runOf({
              key: `joint:${id}:s${seed}:${String(index).padStart(2, '0')}:${mode}`,
              family: 'joint',
              pool: id,
              mode,
              books: applySample(pool.books, allDimensions, values),
              diagnostic: true,
              detail: false,
              meta: { design, seed, sample: index }
            })
          );
        }
      });
    }

    // Per-book neighbourhoods (seed 1).
    for (const book of pool.books) {
      const dimensions = dimensionsOf(pool.books, book.symbol);

      latinHypercube(dimensions, bookSamples, 'book', id, book.symbol, 1).forEach((values, index) => {
        const design = `book-${book.symbol}`;

        samples.push({ pool: id, design, index, values, dimensions });

        for (const mode of modes) {
          specs.push(
            runOf({
              key: `book:${id}:${book.symbol}:${String(index).padStart(2, '0')}:${mode}`,
              family: 'book',
              pool: id,
              mode,
              books: applySample(pool.books, dimensions, values),
              diagnostic: true,
              detail: false,
              meta: { design, symbol: book.symbol, sample: index }
            })
          );
        }
      });
    }
  }

  const keys = new Set<string>();

  for (const spec of specs) {
    if (keys.has(spec.key)) {
      throw new Error(`duplicate run key ${spec.key}`);
    }

    keys.add(spec.key);
  }

  return { specs, oat, samples };
};
