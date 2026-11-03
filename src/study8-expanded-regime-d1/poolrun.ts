// Research pools of Study 8 (PROTOCOL.md §13), adapted from Study 6's runner: `npm run study8 -- pool fixed <ID> [--dataset all|training|holdout|final]
// [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--json]` runs config/research-pools/study8-expanded-regime-d1/<ID>.json
// through the unchanged pools engine and report (src/pools/run.ts runPoolOn, report.ts — the code of
// `npm run pools -- fixed`), exactly as Study 5's research-pool runner does, with the five-ETF universe. A book may
// reference the frozen registry (config/phenotypes/D1/<SYMBOL>.json) or this study's research phenotype file
// (config/research-phenotypes/study8-expanded-regime-d1/D1/<SYMBOL>.json); the registry is never edited.
// `npm run study8 -- research-configs` writes those files from the sealed final record (labelled research only).
// A Study 8 pool holds any subset of the five B5 ETFs (1–5 books).
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
import { bookOrder, frozenGrids, frozenPhenotypes, frozenSelectionFile } from './context.ts';
import { assertFive, sha256 } from './data.ts';
import { log, readSealed } from './records.ts';
import { vectorId } from './space.ts';
import { primaryFold, testFile } from './context.ts';

export const researchPoolsDir = 'config/research-pools/study8-expanded-regime-d1';
export const researchPhenotypesDir = 'config/research-phenotypes/study8-expanded-regime-d1/D1';

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

  return { config, phenotypes, phenotypeFiles, frozenCheck: 'none (Study 8 research pool; not a frozen benchmark)' };
};

export const runResearchPool = async (args: string[]) => {
  const [mode, id] = args;

  if (mode !== 'fixed' || !id) {
    throw new Error(
      'usage: npm run study8 -- pool fixed <ID> [--dataset …] [--end …] [--cost-bps …] [--out DIR] [--json]'
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
      'study8-pools',
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

  console.info(`[study8 pool] → ${outDir}`);
};

// ----- research configuration files (after the final stage) -----

const percent = (value: number) => `${(value / 10).toFixed(1)}%`;
const integerKeys = new Set(['maximumHoldDays', 'tickWindowSize', 'continuationWindow']);
const parametersOf = (grid: Grid) =>
  Object.fromEntries(d1Keys.map((key) => [key, integerKeys.has(key) ? grid[key] : percent(grid[key])]));

// One research pool per primary-fold (F24) shortlist member, named S8-<track>-F24-<n> (n = its order in the track's
// shortlist), labelled NOT DEPLOYED with its training rank (if a role holder), its training qualification and its
// one-time 2025–2026 T-gate status from the sealed test record (only role holders can be nominees).
export const writeResearchConfigs = async () => {
  const selection = await readSealed<{
    bodyHash: string;
    rankedByFold: Record<
      string,
      { rank: number; track: string; role: string; id: string; books: Record<string, Grid>; tier: string }[]
    >;
    testPlan: Record<
      string,
      { shortlists: { track: string; id: string; order: number; qualified: boolean; books: Record<string, Grid> }[] }
    >;
  }>(frozenSelectionFile);
  const test = await readSealed<{
    bodyHash: string;
    members: { id: string; track: string; gates: { status: string; failed: string[] } }[];
  }>(testFile(primaryFold));
  const phenotypeFiles: Record<
    string,
    { schemaVersion: 1; architecture: 'D1'; symbol: string; execution: string; phenotypes: Record<string, unknown> }
  > = {};
  const written: string[] = [];
  const items = selection.testPlan[primaryFold]!.shortlists.map((item) => ({ ...item, n: item.order }));

  for (const item of items) {
    const holder = selection.rankedByFold[primaryFold]!.find((r) => r.id === item.id && r.track === item.track);
    const flagged = test.members.find((h) => h.id === item.id && h.track === item.track);

    if (!flagged) throw new Error(`the sealed F24 test record has no member ${item.track}/${item.id}`);

    const gates = `2025–2026 one-time T gates: ${flagged.gates.status.toUpperCase()}${flagged.gates.failed.length ? ` (failed ${flagged.gates.failed.join(', ')})` : ''}`;
    const status = holder
      ? `training rank ${holder.rank} (tier ${holder.tier}, role ${holder.role}); ${gates}`
      : `shortlist member without a role (training-qualified: ${item.qualified ? 'yes' : 'no'}; never a nominee); ${gates}`;
    const id = `S8-${item.track}-F24-${item.n}`;
    const symbols = (bookOrder as readonly string[]).filter((s) => s in item.books);
    const books = symbols.map((symbol) => {
      const grid = item.books[symbol]!;
      const frozen = frozenGrids[symbol as keyof typeof frozenGrids];
      const changed = d1Keys.some((key) => grid[key] !== frozen[key]);

      if (!changed) {
        return {
          symbol,
          phenotype: frozenPhenotypes[symbol as keyof typeof frozenPhenotypes].name,
          phenotypeFile: registryFile(symbol),
          candidateId: frozenPhenotypes[symbol as keyof typeof frozenPhenotypes].candidateId,
          parameters: parametersOf(grid),
          parametersSha256: gridHash(grid)
        };
      }

      const candidateId = vectorId(grid);
      const name = `s8${candidateId.replace(/[^A-Za-z0-9]/g, '')}`;

      phenotypeFiles[symbol] ??= {
        schemaVersion: 1,
        architecture: 'D1',
        symbol,
        execution: 'multi-etf-d1',
        phenotypes: {}
      };
      phenotypeFiles[symbol].phenotypes[name] = {
        description: `RESEARCH ONLY — NOT DEPLOYED — ${status} (research/study8-expanded-regime-d1/RECOMMENDATION.md). Study 8 Track ${item.track}, fold F24 (trained 2016–2024). Never deploy without the user's review.`,
        parameters: parametersOf(grid),
        provenance: {
          program: 'study8-expanded-regime-d1',
          manifest: frozenSelectionFile,
          manifestBodyHash: selection.bodyHash,
          testBodyHash: test.bodyHash,
          candidateId,
          status: `research only; NOT DEPLOYED; ${status}`
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
      name: `Study 8 ${item.track} F24 #${item.n}`,
      role: `Study 8 primary-fold candidate (${item.id})`,
      status: `RESEARCH ONLY — NOT DEPLOYED — ${status.toUpperCase()}`,
      description: `Study 8 Track ${item.track}, primary fold F24 (search on 2016-01-04 → 2024-12-31) shortlist member ${item.id}. Research configuration for inspection only; frozen B1 and B5 remain the benchmarks.`,
      architecture: 'D1',
      books,
      funding: { policy: 'shadow', fundedSlots: 1, notionalPerTrade: 100000, compounding: false },
      interest: { annualRate: '11%', method: 'simple', dayCount: 365 },
      costs: { bpsPerSide: 5, sensitivityBps: [0, 2, 5, 10], commission: 0 },
      execution: { stopFill: 'stop', stopSlippageBps: 0, firstEligibleDate: '2017-06-15' },
      portfolio: { initialCore: { VOOG: 180000, VGT: 120000 }, borrowedFraction: 0.2, dividends: 'frozen' },
      provenance: {
        createdAt: new Date().toISOString().slice(0, 10),
        createdBy: 'research/study8-expanded-regime-d1 (research-configs)',
        selectionBodyHash: selection.bodyHash,
        testBodyHash: test.bodyHash
      }
    };

    await fs.outputFile(path.join(researchPoolsDir, `${id}.json`), `${JSON.stringify(pool, null, 2)}\n`);
    written.push(path.join(researchPoolsDir, `${id}.json`));
  }

  for (const [symbol, file] of Object.entries(phenotypeFiles)) {
    await fs.outputFile(researchFile(symbol), `${JSON.stringify(file, null, 2)}\n`);
    written.push(researchFile(symbol));
  }

  log(`research configs: ${written.length} files`);

  return written;
};
