// `npm run study5 -- pool fixed <ID> [--dataset all|training|holdout|final] [--end YYYY-MM-DD] [--cost-bps N]
// [--out DIR] [--json]`: a research pool of this study (config/research-pools/study5-gdx-d1-b5-three-etf/<ID>.json)
// run by the unchanged pools engine and report (src/pools/run.ts runPoolOn, report.ts runRecordOf/writeRunRecord/
// formatReport — the code of `npm run pools -- fixed`). A research pool uses the d1-shared-pool schema; its books
// may reference the study's research phenotype files (config/research-phenotypes/study5-gdx-d1-b5-three-etf/D1/)
// instead of the frozen registry, which is never edited. Only VGT, KRE and GDX books are accepted.
import path from 'node:path';
import fs from 'fs-extra';
import { d1Keys, paramsOf, shortLabel } from '../multi-etf-allocator/phenotypes.ts';
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';
import { selectPhenotype } from '../phenotype/phenotypes.ts';
import { option, runOptionsOf } from '../pools/cli.ts';
import type { LoadedPool } from '../pools/load.ts';
import { assertOutsideResearch, formatReport, runRecordOf, writeRunRecord } from '../pools/report.ts';
import { loadPoolUniverse, runPoolOn } from '../pools/run.ts';
import { PoolConfigError, gridHash, parsePoolConfig, poolIdPattern } from '../pools/schema.ts';
import { assertUniverse, sha256 } from './data.ts';

export const researchPoolsDir = 'config/research-pools/study5-gdx-d1-b5-three-etf';
export const researchPhenotypesDir = 'config/research-phenotypes/study5-gdx-d1-b5-three-etf/D1';

const registryFile = (symbol: string) => `config/phenotypes/D1/${symbol}.json`;
const researchFile = (symbol: string) => `${researchPhenotypesDir}/${symbol}.json`;

export const loadResearchPool = async (id: string): Promise<LoadedPool> => {
  if (!poolIdPattern.test(id)) {
    throw new PoolConfigError(`"${id}" is not a pool id`);
  }

  const file = path.join(researchPoolsDir, `${id}.json`);

  if (!(await fs.pathExists(file))) {
    const known = (await fs.pathExists(researchPoolsDir))
      ? (await fs.readdir(researchPoolsDir)).filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -5))
      : [];

    throw new PoolConfigError(`no research pool "${id}" (${file}); known: ${known.join(', ') || 'none'}`);
  }

  const raw = (await fs.readJson(file)) as { books: { symbol: string; phenotypeFile: string }[] };
  const declared = raw.books.map((book) => book.phenotypeFile);

  raw.books.forEach((book) => {
    if (book.phenotypeFile !== registryFile(book.symbol) && book.phenotypeFile !== researchFile(book.symbol)) {
      throw new PoolConfigError(
        `${file} ${book.symbol}: phenotypeFile must be ${registryFile(book.symbol)} or ${researchFile(book.symbol)}`
      );
    }
  });

  // The pools schema validates every other field; it requires registry paths, so they are checked above and restored.
  const config = parsePoolConfig(
    { ...raw, books: raw.books.map((book) => ({ ...book, phenotypeFile: registryFile(book.symbol) })) },
    file
  );

  config.books.forEach((book, index) => {
    book.phenotypeFile = declared[index]!;
  });

  if (config.id !== id) {
    throw new PoolConfigError(`${file}: id "${config.id}" must equal the file name "${id}"`);
  }

  assertUniverse(config.books.map((book) => book.symbol));

  const phenotypes: Record<string, BookPhenotype> = {};
  const phenotypeFiles: LoadedPool['phenotypeFiles'] = {};

  for (const book of config.books) {
    const explicit = book.phenotypeFile === registryFile(book.symbol) ? undefined : book.phenotypeFile;
    const selection = await selectPhenotype({
      architecture: 'D1',
      symbol: book.symbol,
      name: book.phenotype,
      file: explicit
    });
    const registered = Object.fromEntries(
      selection.phenotype.parameters.map((parameter) => [parameter.name, parameter.grid])
    );

    for (const key of d1Keys) {
      if (registered[key] !== book.grid[key]) {
        throw new PoolConfigError(
          `${file} ${book.symbol}: ${key} ${book.grid[key]} ≠ ${selection.file.path} ${book.phenotype} ${registered[key]}`
        );
      }
    }

    if (gridHash(book.grid) !== book.parametersSha256) {
      throw new PoolConfigError(`${file} ${book.symbol}: parametersSha256 does not match the grid`);
    }

    if (String(selection.phenotype.provenance?.candidateId ?? '') !== book.candidateId) {
      throw new PoolConfigError(`${file} ${book.symbol}: candidateId differs from ${selection.file.path}`);
    }

    phenotypes[book.symbol] = {
      symbol: book.symbol,
      name: book.phenotype,
      params: paramsOf(book.symbol, book.phenotype, book.grid),
      short: shortLabel(book.grid)
    };
    phenotypeFiles[book.symbol] = {
      file: selection.file.path,
      sha256: sha256(await fs.readFile(selection.file.path)),
      phenotype: book.phenotype,
      candidateId: book.candidateId
    };
  }

  return { config, phenotypes, phenotypeFiles, frozenCheck: 'none (Study 5 research pool; not a frozen benchmark)' };
};

export const runResearchPool = async (args: string[]) => {
  const [mode, id] = args;

  if (mode !== 'fixed' || !id) {
    throw new Error(
      'usage: npm run study5 -- pool fixed <ID> [--dataset …] [--end …] [--cost-bps …] [--out DIR] [--json]'
    );
  }

  const pool = await loadResearchPool(id);
  const options = runOptionsOf(args.slice(2), 'fixed', {
    costBps: pool.config.costs.bpsPerSide,
    dividends: pool.config.portfolio.dividends
  });
  const outDir =
    option(args, 'out') ??
    path.join(
      'evaluations',
      'study5-pools',
      options.dataset,
      `${id}-fixed-${options.costBps}bps${options.end ? `-to-${options.end}` : ''}`
    );

  assertOutsideResearch(outDir);

  const loaded = await loadPoolUniverse(pool, options);
  const result = runPoolOn(pool, loaded, options);
  const record = await runRecordOf(pool, loaded, result, options, outDir);

  for (const symbol of new Set(result.lots.map((lot) => lot.symbol))) {
    assertUniverse([symbol]);
  }

  await writeRunRecord(record, result);

  if (args.includes('--json')) {
    const rest: Partial<typeof record> = { ...record };

    delete rest.trades;
    delete rest.tradeLedgerText;
    delete rest.months;
    console.log(JSON.stringify(rest, null, 2));
  } else {
    process.stdout.write(formatReport(record));
  }

  console.info(`[study5 pool] → ${outDir}`);
};
