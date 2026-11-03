// Books, D1 grids, role bands and the frozen B5 control (PROTOCOL.md §5). A book is a D1 phenotype on one symbol with
// a tier. B5's books come from `loadPool('B5')` (checked parameter for parameter against the frozen benchmark books);
// new vectors live on the frozen grid (tenths of a percentage point, calendar days, sessions) and are converted to
// machine parameters exactly as the registry converts them (`paramsOf`).
import { loadPool } from '../pools/load.ts';
import { paramsOf, shortLabel } from '../multi-etf-allocator/phenotypes.ts';
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';
import type { StrategyParams } from '../shared-margin-portfolio/strategy.ts';
import type { Dataset } from '../four-family/data.ts';
import { type Grid, type ParamKey, b5Symbols, box, paramKeys, xGridMax, xGridMin } from './context.ts';
import { sha256 } from './records.ts';

export type Tier = 'deep' | 'shallow';

export interface BookSpec {
  id: string; // unique in a configuration; B5 books are `B5:<SYMBOL>`
  symbol: string;
  tier: Tier;
  grid: Grid;
  origin: string; // 'B5', '4A:<window>:sobol:<n>', '4D-A:<window>:<eval>', …
  deepMode?: 'neighbourhood' | 'broad'; // a new deep vector: 4D-B neighbourhood or 4D-C broad band
}

const percentKeys = new Set<ParamKey>([
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'intradayLossBuffer',
  'pullback'
]);

export const gridKey = (grid: Grid) => paramKeys.map((key) => grid[key]).join('.');

export const gridLabel = (grid: Grid) => shortLabel(grid);

export const vectorId = (symbol: string, grid: Grid) => `${symbol}:${gridKey(grid)}`;

export const bookKey = (book: Pick<BookSpec, 'symbol' | 'tier' | 'grid'>) =>
  `${book.tier}:${book.symbol}:${gridKey(book.grid)}`;

export const paramsOfGrid = (symbol: string, grid: Grid, name = 'study4'): StrategyParams =>
  paramsOf(symbol, name, grid as never);

export const phenotypeOf = (book: Pick<BookSpec, 'symbol' | 'grid' | 'id'>): BookPhenotype => ({
  symbol: book.symbol,
  name: book.id,
  params: paramsOfGrid(book.symbol, book.grid, book.id),
  short: gridLabel(book.grid)
});

export const isOnGrid = (grid: Grid) => paramKeys.every((key) => Number.isInteger(grid[key]));

export const inBox = (grid: Grid) =>
  isOnGrid(grid) &&
  grid.targetPercentChange >= xGridMin &&
  grid.targetPercentChange <= xGridMax &&
  (Object.keys(box) as (keyof typeof box)[]).every((key) => grid[key] >= box[key][0] && grid[key] <= box[key][1]);

// The grid of registered machine parameters (fractions for percentages), verified to convert back exactly.
export const gridOfParams = (symbol: string, params: StrategyParams): Grid => {
  const grid = Object.fromEntries(
    paramKeys.map((key) => {
      const value = params[key] as number;

      return [key, percentKeys.has(key) ? Math.round(value * 1000) : value];
    })
  ) as Grid;
  const back = paramsOfGrid(symbol, grid);

  for (const key of paramKeys) {
    if (back[key] !== params[key]) {
      throw new Error(`${symbol}: ${key} ${params[key]} is not exactly on the grid`);
    }
  }

  return grid;
};

export interface B5Control {
  books: BookSpec[];
  phenotypes: Record<string, BookPhenotype>;
  configFile: string;
  configSha256: string;
  frozenCheck: string;
  phenotypeFiles: Record<string, { file: string; sha256: string; phenotype: string; candidateId: string }>;
}

export const loadB5 = async (): Promise<B5Control> => {
  const pool = await loadPool('B5');
  const books: BookSpec[] = [];

  for (const symbol of b5Symbols) {
    const phenotype = pool.phenotypes[symbol];

    if (!phenotype) {
      throw new Error(`B5 has no ${symbol} book`);
    }

    const grid = gridOfParams(symbol, phenotype.params);

    // the book must execute exactly the registered machine parameters
    if (JSON.stringify(paramsOfGrid(symbol, grid, phenotype.name)) !== JSON.stringify({ ...phenotype.params })) {
      const a = paramsOfGrid(symbol, grid, phenotype.name) as unknown as Record<string, unknown>;
      const b = phenotype.params as unknown as Record<string, unknown>;
      const diff = Object.keys(b).filter((key) => key !== 'label' && a[key] !== b[key]);

      if (diff.length > 0) {
        throw new Error(`B5 ${symbol}: grid conversion differs in ${diff.join(', ')}`);
      }
    }

    books.push({ id: `B5:${symbol}`, symbol, tier: 'deep', grid, origin: 'B5' });
  }

  return {
    books,
    phenotypes: pool.phenotypes,
    configFile: pool.config.file,
    configSha256: (pool.config as unknown as { sha256?: string }).sha256 ?? '',
    frozenCheck: pool.frozenCheck,
    phenotypeFiles: pool.phenotypeFiles
  };
};

// ----- role bands (PROTOCOL.md §5) -----

// σ = √252 × sample standard deviation of daily log close-to-close returns over sessions [1, last].
export const volatilityOf = (ds: Dataset, last = ds.sessionCount - 1) => {
  const returns: number[] = [];

  for (let s = 1; s <= last; s++) {
    returns.push(Math.log(ds.sClose[s]! / ds.sClose[s - 1]!));
  }

  const mean = returns.reduce((total, r) => total + r, 0) / returns.length;
  const variance = returns.reduce((total, r) => total + (r - mean) ** 2, 0) / (returns.length - 1);

  return Math.sqrt(252 * variance);
};

export interface Band {
  lo: number; // tenths of a percentage point, inclusive
  hi: number;
  empty: boolean;
  reason: string;
}

const band = (lo: number, hi: number, minimumWidth: number, reason: string): Band =>
  hi - lo < minimumWidth ? { lo, hi, empty: true, reason } : { lo, hi, empty: false, reason: '' };

// Shallow band: [max(3.0%, 0.15σ), min(0.45σ, 15.0%)], and ≤ 0.6 × the B5 book's X on a B5 symbol; empty when
// narrower than 1.0 pp.
export const shallowBand = (sigma: number, b5X?: number): Band => {
  const lo = Math.max(xGridMin, Math.ceil(150 * sigma - 1e-9));
  let hi = Math.min(150, Math.floor(450 * sigma + 1e-9));

  if (b5X !== undefined) {
    hi = Math.min(hi, Math.floor(0.6 * b5X + 1e-9));
  }

  hi = Math.min(hi, xGridMax);
  return band(lo, hi, 10, `shallow band ${lo}..${hi} narrower than 1.0 pp (σ ${(sigma * 100).toFixed(2)}%)`);
};

// 4D-C broad deep band: [max(8.0%, ⌈ρσ⌉), 30.0%] (ρ = the smallest X0/σ of B5's books in the window).
export const deepBroadBand = (sigma: number, rho: number): Band => {
  const lo = Math.max(80, Math.ceil(1000 * rho * sigma - 1e-9));

  return band(lo, xGridMax, 0, `deep band empty: ρσ = ${(100 * rho * sigma).toFixed(1)}% > 30.0%`);
};

// 4D-B neighbourhood of an incumbent B5 vector.
export const neighbourhoodUnits: Record<Exclude<ParamKey, 'targetPercentChange'>, number> = {
  trailingBuyPercentage: 5,
  trailingStopPercentage: 15,
  maximumHoldDays: 3,
  tickWindowSize: 25,
  intradayLossBuffer: 10,
  pullback: 20,
  continuationWindow: 20
};

export interface Bounds {
  lo: Grid;
  hi: Grid;
}

export const shallowBounds = (b: Band): Bounds => ({
  lo: { targetPercentChange: b.lo, ...boxLo() },
  hi: { targetPercentChange: b.hi, ...boxHi() }
});

export const deepBroadBounds = (b: Band): Bounds => shallowBounds(b);

// X ∈ [max(⌈ρσ⌉, X0 − 3.0 pp), min(30.0%, X0 + 3.0 pp)], always containing X0 (PROTOCOL.md §5).
export const neighbourhoodBounds = (incumbent: Grid, sigma: number, rho: number): Bounds => {
  const xLo = Math.max(Math.ceil(1000 * rho * sigma - 1e-9), incumbent.targetPercentChange - 30, xGridMin);
  const xHi = Math.min(xGridMax, incumbent.targetPercentChange + 30);
  const lo = { targetPercentChange: Math.min(xLo, incumbent.targetPercentChange) } as Grid;
  const hi = { targetPercentChange: Math.max(xHi, incumbent.targetPercentChange) } as Grid;

  for (const key of Object.keys(neighbourhoodUnits) as (keyof typeof neighbourhoodUnits)[]) {
    lo[key] = Math.max(box[key][0], incumbent[key] - neighbourhoodUnits[key]);
    hi[key] = Math.min(box[key][1], incumbent[key] + neighbourhoodUnits[key]);
  }

  return { lo, hi };
};

function boxLo() {
  return Object.fromEntries(Object.entries(box).map(([key, [lo]]) => [key, lo])) as Omit<Grid, 'targetPercentChange'>;
}

function boxHi() {
  return Object.fromEntries(Object.entries(box).map(([key, [, hi]]) => [key, hi])) as Omit<Grid, 'targetPercentChange'>;
}

export const inBounds = (grid: Grid, bounds: Bounds) =>
  isOnGrid(grid) && paramKeys.every((key) => grid[key] >= bounds.lo[key] && grid[key] <= bounds.hi[key]);

// Reflect an integer coordinate into [lo, hi].
export const reflect = (value: number, lo: number, hi: number) => {
  if (hi <= lo) {
    return lo;
  }

  const span = hi - lo;
  let v = value - lo;

  v = ((v % (2 * span)) + 2 * span) % (2 * span);
  return lo + (v <= span ? v : 2 * span - v);
};

export const clampToBounds = (grid: Grid, bounds: Bounds): Grid =>
  Object.fromEntries(
    paramKeys.map((key) => [key, reflect(Math.round(grid[key]), bounds.lo[key], bounds.hi[key])])
  ) as Grid;

export const configHash = (value: unknown) => sha256(JSON.stringify(value)).slice(0, 16);

export const isB5Symbol = (symbol: string) => (b5Symbols as readonly string[]).includes(symbol);
