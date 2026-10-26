// Loads a pool by name from config/pools/<ID>.json and resolves its books into the N-book engine's phenotypes. Every
// book's pinned grid must equal its referenced phenotype in config/phenotypes/D1/, and a pool that names a frozen
// benchmark (frozenReference.benchmark B1/B4/B5) must equal the books that reproduced the frozen controls
// (src/joint-16-etf-d1/benchmarks.ts) parameter for parameter. Nothing here writes a file.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { benchmarkSymbols, frozenBenchmarkPhenotypes, type BenchmarkKey } from '../joint-16-etf-d1/benchmarks.ts';
import { d1Keys, paramsOf, shortLabel } from '../multi-etf-allocator/phenotypes.ts';
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';
import { selectPhenotype } from '../phenotype/phenotypes.ts';
import { type PoolConfig, PoolConfigError, parsePoolConfig } from './schema.ts';

export const poolsRoot = 'config/pools';

export interface LoadedPool {
  config: PoolConfig;
  phenotypes: Record<string, BookPhenotype>;
  phenotypeFiles: Record<string, { file: string; sha256: string; phenotype: string; candidateId: string }>;
  frozenCheck: string; // what the books were checked against
}

const sha256File = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

export const poolFileOf = (id: string, root = poolsRoot) => path.join(root, `${id}.json`);

export const listPoolIds = async (root = poolsRoot) =>
  (await fs.readdir(root))
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .sort();

export const readPoolConfig = async (id: string, root = poolsRoot): Promise<PoolConfig> => {
  const file = poolFileOf(id, root);

  if (!(await fs.pathExists(file))) {
    const known = (await fs.pathExists(root)) ? await listPoolIds(root) : [];

    throw new PoolConfigError(`no pool "${id}" (${file}); known pools: ${known.join(', ') || 'none'}`);
  }

  const config = parsePoolConfig(await fs.readJson(file), file);

  if (config.id !== id) {
    throw new PoolConfigError(`${file}: id "${config.id}" must equal the file name "${id}"`);
  }

  return config;
};

const paramsEqual = (a: BookPhenotype, b: BookPhenotype) => {
  const strip = (book: BookPhenotype) => JSON.stringify({ ...book.params, label: undefined });

  return a.symbol === b.symbol && strip(a) === strip(b);
};

export const loadPool = async (id: string, root = poolsRoot): Promise<LoadedPool> => {
  const config = await readPoolConfig(id, root);
  const phenotypes: Record<string, BookPhenotype> = {};
  const phenotypeFiles: LoadedPool['phenotypeFiles'] = {};

  for (const book of config.books) {
    const { file, phenotype } = await selectPhenotype({
      architecture: 'D1',
      symbol: book.symbol,
      name: book.phenotype
    });
    const registered = Object.fromEntries(phenotype.parameters.map((parameter) => [parameter.name, parameter.grid]));

    for (const key of d1Keys) {
      if (registered[key] !== book.grid[key]) {
        throw new PoolConfigError(
          `${config.file} ${book.symbol}: ${key} is pinned at ${book.grid[key]} but ${file.path} ${book.phenotype} has ${registered[key]} (the phenotype changed; the pool is refused)`
        );
      }
    }

    const candidateId = String(phenotype.provenance?.candidateId ?? '');

    if (candidateId !== book.candidateId) {
      throw new PoolConfigError(
        `${config.file} ${book.symbol}: candidateId ${book.candidateId} differs from ${file.path} (${candidateId})`
      );
    }

    phenotypes[book.symbol] = {
      symbol: book.symbol,
      name: book.phenotype,
      params: paramsOf(book.symbol, book.phenotype, book.grid),
      short: shortLabel(book.grid)
    };
    phenotypeFiles[book.symbol] = {
      file: file.path,
      sha256: await sha256File(file.path),
      phenotype: book.phenotype,
      candidateId
    };
  }

  let frozenCheck = 'none (no frozenReference.benchmark)';
  const benchmark = config.frozenReference?.benchmark as BenchmarkKey | undefined;

  if (benchmark !== undefined) {
    if (!(benchmark in benchmarkSymbols)) {
      throw new PoolConfigError(
        `${config.file}: frozenReference.benchmark must be one of ${Object.keys(benchmarkSymbols).join(', ')}`
      );
    }

    const symbols = config.books.map((book) => book.symbol);
    const expected = benchmarkSymbols[benchmark];

    if (symbols.length !== expected.length || expected.some((symbol) => !symbols.includes(symbol))) {
      throw new PoolConfigError(
        `${config.file}: ${benchmark} holds ${expected.join(' ')}, the pool ${symbols.join(' ')}`
      );
    }

    const frozen = await frozenBenchmarkPhenotypes();

    for (const symbol of expected) {
      if (!paramsEqual(phenotypes[symbol]!, frozen[symbol]!)) {
        throw new PoolConfigError(
          `${config.file}: ${symbol} differs from the frozen ${benchmark} book (${frozen[symbol]!.short})`
        );
      }
    }

    frozenCheck = `equal, parameter for parameter, to the frozen ${benchmark} books of src/joint-16-etf-d1/benchmarks.ts`;
  }

  return { config, phenotypes, phenotypeFiles, frozenCheck };
};
