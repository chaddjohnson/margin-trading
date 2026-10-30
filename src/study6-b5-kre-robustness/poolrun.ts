// Research pools of this study (PROTOCOL.md §12): `npm run study6 -- pool fixed <ID> [--dataset all|training|holdout|final]
// [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--json]` runs config/research-pools/study6-b5-kre-robustness/<ID>.json
// through the unchanged pools engine and report (src/pools/run.ts runPoolOn, report.ts — the code of
// `npm run pools -- fixed`), exactly as Study 5's research-pool runner does, with the five-ETF universe. A book may
// reference the frozen registry (config/phenotypes/D1/<SYMBOL>.json) or this study's research phenotype file
// (config/research-phenotypes/study6-b5-kre-robustness/D1/<SYMBOL>.json); the registry is never edited.
// `npm run study6 -- research-configs` writes those files from the sealed final record (labelled research only).
import path from 'node:path';
import fs from 'fs-extra';
import { d1Keys, paramsOf, shortLabel } from '../multi-etf-allocator/phenotypes.ts';
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { selectPhenotype } from '../phenotype/phenotypes.ts';
import { option, runOptionsOf } from '../pools/cli.ts';
import type { LoadedPool } from '../pools/load.ts';
import { assertOutsideResearch, formatReport, runRecordOf, writeRunRecord } from '../pools/report.ts';
import { loadPoolUniverse, runPoolOn } from '../pools/run.ts';
import { PoolConfigError, gridHash, parsePoolConfig, poolIdPattern } from '../pools/schema.ts';
import { vectorId } from '../study5-gdx-b5-three-etf/grid.ts';
import { bookOrder, frozenGrids, frozenPhenotypes, frozenSelectionFile, resultFile } from './context.ts';
import { assertFive, sha256 } from './data.ts';
import { log, readSealed } from './records.ts';

export const researchPoolsDir = 'config/research-pools/study6-b5-kre-robustness';
export const researchPhenotypesDir = 'config/research-phenotypes/study6-b5-kre-robustness/D1';

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

  assertFive(config.books.map((book) => book.symbol));

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

  return { config, phenotypes, phenotypeFiles, frozenCheck: 'none (Study 6 research pool; not a frozen benchmark)' };
};

export const runResearchPool = async (args: string[]) => {
  const [mode, id] = args;

  if (mode !== 'fixed' || !id) {
    throw new Error(
      'usage: npm run study6 -- pool fixed <ID> [--dataset …] [--end …] [--cost-bps …] [--out DIR] [--json]'
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
      'study6-pools',
      options.dataset,
      `${id}-fixed-${options.costBps}bps${options.end ? `-to-${options.end}` : ''}`
    );

  assertOutsideResearch(outDir);

  const loaded = await loadPoolUniverse(pool, options);
  const result = runPoolOn(pool, loaded, options);
  const record = await runRecordOf(pool, loaded, result, options, outDir);

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

  console.info(`[study6 pool] → ${outDir}`);
};

// ----- research configuration files (after the final stage) -----

const percent = (value: number) => `${(value / 10).toFixed(1)}%`;
const integerKeys = new Set(['maximumHoldDays', 'tickWindowSize', 'continuationWindow']);
const parametersOf = (grid: Grid) =>
  Object.fromEntries(d1Keys.map((key) => [key, integerKeys.has(key) ? grid[key] : percent(grid[key])]));

export const writeResearchConfigs = async () => {
  const selection = await readSealed<{
    bodyHash: string;
    shortlist: {
      key: string;
      track: string;
      books: Record<string, Grid>;
      searched: string[];
      source: string;
      gates: { q: Record<string, boolean>; e: Record<string, boolean>; partial: { improves: boolean } };
    }[];
  }>(frozenSelectionFile);
  const final = await readSealed<{
    bodyHash: string;
    classification: { key: string; status: string; role: string }[];
    decision: string;
    rows: { key: string; w29: { net: number; dd: number } }[];
  }>(resultFile('partB', 'final', 'final.json'));
  const statusOf = (key: string) => {
    const classified = final.classification.find((item) => item.key === key)?.status;
    const gates = selection.shortlist.find((item) => item.key === key)?.gates;
    const failing = gates
      ? [...Object.entries(gates.q), ...Object.entries(gates.e)].filter(([, pass]) => !pass).map(([gate]) => gate)
      : [];

    return (
      classified ??
      `not nominated: fails ${failing.join(', ')} at validation${gates?.partial.improves ? ' (meets the partial-improvement rule)' : ''}`
    );
  };
  const phenotypeFiles: Record<
    string,
    { schemaVersion: 1; architecture: 'D1'; symbol: string; execution: string; phenotypes: Record<string, unknown> }
  > = {};
  const written: string[] = [];

  for (const candidate of selection.shortlist) {
    const id = `S6-${candidate.key}`;
    const books = bookOrder.map((symbol) => {
      const grid = candidate.books[symbol]!;
      const changed = d1Keys.some((key) => grid[key] !== frozenGrids[symbol][key]);

      if (!changed) {
        return {
          symbol,
          phenotype: frozenPhenotypes[symbol].name,
          phenotypeFile: registryFile(symbol),
          candidateId: frozenPhenotypes[symbol].candidateId,
          parameters: parametersOf(grid),
          parametersSha256: gridHash(grid)
        };
      }

      const name = `s6${candidate.key.replace(/[^A-Za-z0-9]/g, '')}`;
      const candidateId = vectorId(grid);

      phenotypeFiles[symbol] ??= {
        schemaVersion: 1,
        architecture: 'D1',
        symbol,
        execution: 'multi-etf-d1',
        phenotypes: {}
      };
      phenotypeFiles[symbol].phenotypes[name] = {
        description: `RESEARCH ONLY — ${statusOf(candidate.key).toUpperCase()} (research/study6-b5-kre-robustness-2026-10/RECOMMENDATION.md). Study 6 ${candidate.source}. Not a frozen phenotype; not forward validated; never deploy without the user's review.`,
        parameters: parametersOf(grid),
        provenance: {
          program: 'study6-b5-kre-robustness',
          manifest: frozenSelectionFile,
          manifestBodyHash: selection.bodyHash,
          finalBodyHash: final.bodyHash,
          candidateId,
          status: `research only; ${statusOf(candidate.key)}`
        }
      };

      return {
        symbol,
        phenotype: name,
        phenotypeFile: researchFile(symbol),
        candidateId,
        parameters: parametersOf(grid),
        parametersSha256: gridHash(grid)
      };
    });
    const pool = {
      schemaVersion: 1,
      kind: 'd1-shared-pool',
      id,
      name: `B5 with Study 6 ${candidate.key} (${candidate.track})`,
      role: `Study 6 Part B candidate ${candidate.key}`,
      status: `RESEARCH ONLY — ${statusOf(candidate.key).toUpperCase()}`,
      description: `${candidate.source}. All five B5 books; only the searched book(s) (${candidate.searched.join(', ')}) differ from frozen B5. Research configuration for inspection only; frozen B5 remains the benchmark.`,
      architecture: 'D1',
      books,
      funding: { policy: 'shadow', fundedSlots: 1, notionalPerTrade: 100000, compounding: false },
      interest: { annualRate: '11%', method: 'simple', dayCount: 365 },
      costs: { bpsPerSide: 5, sensitivityBps: [0, 2, 5, 10], commission: 0 },
      execution: { stopFill: 'stop', stopSlippageBps: 0, firstEligibleDate: '2017-06-15' },
      portfolio: { initialCore: { VOOG: 180000, VGT: 120000 }, borrowedFraction: 0.2, dividends: 'frozen' },
      provenance: {
        createdAt: new Date().toISOString().slice(0, 10),
        createdBy: 'research/study6-b5-kre-robustness-2026-10 (research-configs)',
        selectionBodyHash: selection.bodyHash,
        finalBodyHash: final.bodyHash
      }
    };

    await fs.outputFile(path.join(researchPoolsDir, `${id}.json`), `${JSON.stringify(pool, null, 2)}\n`);
    written.push(path.join(researchPoolsDir, `${id}.json`));
  }

  for (const [symbol, file] of Object.entries(phenotypeFiles)) {
    await fs.outputFile(researchFile(symbol), `${JSON.stringify(file, null, 2)}\n`);
    written.push(researchFile(symbol));
  }

  log(`research configs: ${written.join(', ')}`);
};
