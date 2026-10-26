// The pool configuration schema (config/pools/<ID>.json): a named, immutable bundle of D1 books and the funding,
// interest, cost and portfolio settings of the N-book shared-pool engine (src/portfolio-aware-d1/nbook/engine.ts).
// A pool does not define a phenotype: each book references a phenotype in config/phenotypes/D1/<SYMBOL>.json by name
// and pins its eight parameters (and their hash), so an edit of the phenotype file is refused instead of silently
// changing the pool. Only `description`, `status`, `provenance`, `frozenReference` and `regressionAnchors` are
// metadata; everything else enters the algorithmic hash.
import crypto from 'node:crypto';
import { architectureOf, parseParameter } from '../phenotype/architectures.ts';
import { d1Keys, type D1Key } from '../multi-etf-allocator/phenotypes.ts';

export const poolSchemaVersion = 1;
export const poolKind = 'd1-shared-pool';
export const poolIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export type Grid = Record<D1Key, number>;

export interface PoolBook {
  symbol: string;
  phenotype: string; // the phenotype's name in phenotypeFile
  phenotypeFile: string; // config/phenotypes/D1/<SYMBOL>.json
  candidateId: string;
  parameters: Record<D1Key, string | number>; // the phenotype file's own notation ("21.6%", 8, …)
  grid: Grid; // tenths of a percentage point, calendar days or sessions
  parametersSha256: string;
}

export interface PoolConfig {
  schemaVersion: 1;
  kind: typeof poolKind;
  id: string;
  name: string;
  role: string;
  status: string;
  description: string;
  architecture: 'D1';
  books: PoolBook[];
  funding: { policy: 'shadow'; fundedSlots: 1; notionalPerTrade: number; compounding: false };
  interest: { annualRate: number; method: 'simple'; dayCount: 365 };
  costs: { bpsPerSide: number; sensitivityBps: number[]; commission: 0 };
  execution: { stopFill: 'stop'; stopSlippageBps: number; firstEligibleDate: string };
  portfolio: {
    initialCore: { VOOG: number; VGT: number };
    borrowedFraction: number;
    dividends: 'frozen' | 'symmetric';
  };
  frozenReference?: Record<string, unknown>;
  regressionAnchors?: Record<string, unknown>;
  provenance?: Record<string, unknown>;
  file: string;
  configHash: string; // sha256 of the algorithmic part
}

export class PoolConfigError extends Error {}

const fail = (where: string, message: string): never => {
  throw new PoolConfigError(`${where}: ${message}`);
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const allowedKeys = (object: Record<string, unknown>, keys: readonly string[], where: string) => {
  for (const key of Object.keys(object)) {
    if (!keys.includes(key)) {
      fail(where, `unknown key "${key}" (allowed: ${keys.join(', ')})`);
    }
  }
};

const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('hex');

// The hash of one book's eight parameters on the phenotype grid, in the architecture's parameter order.
export const gridHash = (grid: Grid) =>
  sha256(JSON.stringify(Object.fromEntries(d1Keys.map((key) => [key, grid[key]]))));

export const parseRate = (raw: unknown, where: string) => {
  const match = typeof raw === 'string' ? raw.match(/^(\d{1,2}(?:\.\d{1,4})?)%$/) : null;

  if (!match) {
    fail(where, `must be a percentage string such as "11%", not ${JSON.stringify(raw)}`);
  }

  return Number(match![1]) / 100;
};

const parseGrid = (raw: unknown, where: string): { parameters: Record<D1Key, string | number>; grid: Grid } => {
  if (!isObject(raw)) {
    fail(where, 'parameters must be an object of the eight D1 parameters');
  }

  const specs = architectureOf('D1').parameters;
  const parameters = raw as Record<string, unknown>;

  allowedKeys(parameters, d1Keys, where);

  const grid = {} as Grid;

  for (const key of d1Keys) {
    const spec = specs.find((item) => item.name === key)!;

    if (!(key in parameters)) {
      fail(where, `missing parameter ${key}`);
    }

    try {
      grid[key] = parseParameter(spec, parameters[key], where).grid;
    } catch (error) {
      throw new PoolConfigError((error as Error).message);
    }
  }

  return { parameters: parameters as Record<D1Key, string | number>, grid };
};

const number = (raw: unknown, where: string, check: (value: number) => boolean, rule: string) => {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || !check(raw)) {
    fail(where, `must be ${rule}, not ${JSON.stringify(raw)}`);
  }

  return raw as number;
};

const exact = <T>(raw: unknown, expected: T, where: string): T => {
  if (raw !== expected) {
    fail(
      where,
      `must be ${JSON.stringify(expected)} (the only value the shared-pool engine implements), not ${JSON.stringify(raw)}`
    );
  }

  return expected;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

// The algorithmic content only: books (symbol, phenotype name, grid), funding, interest, costs, execution, portfolio.
export const algorithmicPart = (
  config: Pick<PoolConfig, 'id' | 'books' | 'funding' | 'interest' | 'costs' | 'execution' | 'portfolio'>
) => ({
  id: config.id,
  books: config.books.map((book) => ({ symbol: book.symbol, phenotype: book.phenotype, grid: book.grid })),
  funding: config.funding,
  interest: config.interest,
  costs: { bpsPerSide: config.costs.bpsPerSide, commission: config.costs.commission },
  execution: config.execution,
  portfolio: config.portfolio
});

export const configHashOf = (config: Parameters<typeof algorithmicPart>[0]) =>
  sha256(JSON.stringify(algorithmicPart(config)));

// Validates a parsed pool JSON. The phenotype references are resolved and compared by the loader (load.ts).
export const parsePoolConfig = (json: unknown, file: string): PoolConfig => {
  if (!isObject(json)) {
    fail(file, 'a pool configuration must be a JSON object');
  }

  const raw = json as Record<string, unknown>;

  allowedKeys(
    raw,
    [
      'schemaVersion',
      'kind',
      'id',
      'name',
      'role',
      'status',
      'description',
      'architecture',
      'books',
      'funding',
      'interest',
      'costs',
      'execution',
      'portfolio',
      'frozenReference',
      'regressionAnchors',
      'provenance'
    ],
    file
  );
  exact(raw.schemaVersion, poolSchemaVersion, `${file} schemaVersion`);
  exact(raw.kind, poolKind, `${file} kind`);
  exact(raw.architecture, 'D1', `${file} architecture`);

  const id = String(raw.id ?? '');

  if (!poolIdPattern.test(id)) {
    fail(file, `id ${JSON.stringify(raw.id)} must match ${poolIdPattern}`);
  }

  for (const key of ['name', 'role', 'status', 'description'] as const) {
    if (typeof raw[key] !== 'string' || !(raw[key] as string).trim()) {
      fail(file, `${key} must be a non-empty string`);
    }
  }

  if (!Array.isArray(raw.books) || raw.books.length === 0) {
    fail(file, 'books must be a non-empty array');
  }

  const symbols = new Set<string>();
  const books = (raw.books as unknown[]).map((item, index): PoolBook => {
    const where = `${file} books[${index}]`;

    if (!isObject(item)) {
      fail(where, 'a book must be an object');
    }

    const book = item as Record<string, unknown>;

    allowedKeys(book, ['symbol', 'phenotype', 'phenotypeFile', 'candidateId', 'parameters', 'parametersSha256'], where);

    const symbol = String(book.symbol ?? '');

    if (!/^[A-Z][A-Z0-9.]*$/.test(symbol)) {
      fail(where, `symbol ${JSON.stringify(book.symbol)} must be an upper-case ticker`);
    }

    if (symbols.has(symbol)) {
      fail(where, `${symbol} appears twice: a pool holds each symbol once`);
    }

    symbols.add(symbol);

    if (book.phenotypeFile !== `config/phenotypes/D1/${symbol}.json`) {
      fail(where, `phenotypeFile must be config/phenotypes/D1/${symbol}.json`);
    }

    for (const key of ['phenotype', 'candidateId', 'parametersSha256'] as const) {
      if (typeof book[key] !== 'string' || !(book[key] as string)) {
        fail(where, `${key} must be a non-empty string`);
      }
    }

    const { parameters, grid } = parseGrid(book.parameters, `${where} (${symbol})`);
    const hash = gridHash(grid);

    if (book.parametersSha256 !== hash) {
      fail(where, `parametersSha256 ${book.parametersSha256} does not match its parameters (${hash})`);
    }

    return {
      symbol,
      phenotype: book.phenotype as string,
      phenotypeFile: book.phenotypeFile as string,
      candidateId: book.candidateId as string,
      parameters,
      grid,
      parametersSha256: hash
    };
  });

  const funding = isObject(raw.funding) ? raw.funding : fail(file, 'funding must be an object');

  allowedKeys(funding, ['policy', 'fundedSlots', 'notionalPerTrade', 'compounding'], `${file} funding`);

  const interest = isObject(raw.interest) ? raw.interest : fail(file, 'interest must be an object');

  allowedKeys(interest, ['annualRate', 'method', 'dayCount'], `${file} interest`);

  const costs = isObject(raw.costs) ? raw.costs : fail(file, 'costs must be an object');

  allowedKeys(costs, ['bpsPerSide', 'sensitivityBps', 'commission'], `${file} costs`);

  const execution = isObject(raw.execution) ? raw.execution : fail(file, 'execution must be an object');

  allowedKeys(execution, ['stopFill', 'stopSlippageBps', 'firstEligibleDate'], `${file} execution`);

  const portfolio = isObject(raw.portfolio) ? raw.portfolio : fail(file, 'portfolio must be an object');

  allowedKeys(portfolio, ['initialCore', 'borrowedFraction', 'dividends'], `${file} portfolio`);

  const core = isObject(portfolio.initialCore)
    ? portfolio.initialCore
    : fail(file, 'portfolio.initialCore must be an object');

  allowedKeys(core, ['VOOG', 'VGT'], `${file} portfolio.initialCore`);

  const bps = (value: unknown, where: string) =>
    number(value, where, (item) => item >= 0 && item <= 100, 'a number of basis points per side from 0 to 100');
  const sensitivity = Array.isArray(costs.sensitivityBps)
    ? (costs.sensitivityBps as unknown[]).map((item, index) => bps(item, `${file} costs.sensitivityBps[${index}]`))
    : fail(file, 'costs.sensitivityBps must be an array');
  const firstEligibleDate = String(execution.firstEligibleDate ?? '');

  if (!datePattern.test(firstEligibleDate)) {
    fail(file, 'execution.firstEligibleDate must be YYYY-MM-DD');
  }

  if (portfolio.dividends !== 'frozen' && portfolio.dividends !== 'symmetric') {
    fail(
      file,
      'portfolio.dividends must be "frozen" (open VGT lots receive VGT distributions) or "symmetric" (no lot does)'
    );
  }

  const config: Omit<PoolConfig, 'file' | 'configHash'> = {
    schemaVersion: 1,
    kind: poolKind,
    id,
    name: raw.name as string,
    role: raw.role as string,
    status: raw.status as string,
    description: raw.description as string,
    architecture: 'D1',
    books,
    funding: {
      policy: exact(funding.policy, 'shadow', `${file} funding.policy`),
      fundedSlots: exact(funding.fundedSlots, 1, `${file} funding.fundedSlots`),
      notionalPerTrade: number(
        funding.notionalPerTrade,
        `${file} funding.notionalPerTrade`,
        (value) => value > 0,
        'a positive number of dollars'
      ),
      compounding: exact(funding.compounding, false, `${file} funding.compounding`)
    },
    interest: {
      annualRate: parseRate(interest.annualRate, `${file} interest.annualRate`),
      method: exact(interest.method, 'simple', `${file} interest.method`),
      dayCount: exact(interest.dayCount, 365, `${file} interest.dayCount`)
    },
    costs: {
      bpsPerSide: bps(costs.bpsPerSide, `${file} costs.bpsPerSide`),
      sensitivityBps: sensitivity,
      commission: exact(costs.commission, 0, `${file} costs.commission`)
    },
    execution: {
      stopFill: exact(execution.stopFill, 'stop', `${file} execution.stopFill`),
      stopSlippageBps: bps(execution.stopSlippageBps, `${file} execution.stopSlippageBps`),
      firstEligibleDate
    },
    portfolio: {
      initialCore: {
        VOOG: number(
          core.VOOG,
          `${file} portfolio.initialCore.VOOG`,
          (value) => value > 0,
          'a positive number of dollars'
        ),
        VGT: number(core.VGT, `${file} portfolio.initialCore.VGT`, (value) => value > 0, 'a positive number of dollars')
      },
      borrowedFraction: number(
        portfolio.borrowedFraction,
        `${file} portfolio.borrowedFraction`,
        (value) => value > 0 && value <= 0.5,
        'a fraction of marked equity in (0, 0.5]'
      ),
      dividends: portfolio.dividends as 'frozen' | 'symmetric'
    },
    ...(isObject(raw.frozenReference) ? { frozenReference: raw.frozenReference } : {}),
    ...(isObject(raw.regressionAnchors) ? { regressionAnchors: raw.regressionAnchors } : {}),
    ...(isObject(raw.provenance) ? { provenance: raw.provenance } : {})
  };

  return { ...config, file, configHash: configHashOf(config) };
};
