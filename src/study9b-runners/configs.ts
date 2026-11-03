// Research configurations of Study 9 Phase B (after the one-time F24 test): one research pool per F24 shortlist
// member, `config/research-pools/study9-phase-b/S9B-<TRACK>-F24-<n>.json` (n = its order in the track's sealed
// shortlist), with its books in this study's research phenotype files
// `config/research-phenotypes/study9-phase-b/D1/<SYMBOL>.json`, labelled RESEARCH ONLY / NOT DEPLOYED with its
// training rank, role, qualification and one-time T status. A port of Study 8's writeResearchConfigs and
// loadResearchPool (src/study8-expanded-regime-d1/poolrun.ts) with this study's paths and symbols (Study 8's loader
// accepted only its five ETFs); the pools schema and engine are unchanged, and the registry is never edited.
import path from 'node:path';
import fs from 'fs-extra';
import { d1Keys, paramsOf, shortLabel } from '../multi-etf-allocator/phenotypes.ts';
import { selectPhenotype } from '../phenotype/phenotypes.ts';
import type { BookPhenotype } from '../portfolio-aware-d1/nbook/engine.ts';
import { bookOrderOf } from '../portfolio-aware-d1/nbook/engine.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import type { LoadedPool } from '../pools/load.ts';
import { PoolConfigError, gridHash, parsePoolConfig, poolIdPattern } from '../pools/schema.ts';
import { sha256 } from '../study5-gdx-b5-three-etf/data.ts';
import { allSymbols, frozenSelectionFile, primaryFold } from '../study9-phase-b/context.ts';
import { vectorId } from '../study9-phase-b/engine.ts';
import { readSealed, requirePhase } from '../study9-phase-b/records.ts';
import { testFile } from '../study9-phase-b/test.ts';

export const researchPoolsDir = 'config/research-pools/study9-phase-b';
export const researchPhenotypesDir = 'config/research-phenotypes/study9-phase-b/D1';

const registryFile = (symbol: string) => `config/phenotypes/D1/${symbol}.json`;
const researchFile = (symbol: string) => `${researchPhenotypesDir}/${symbol}.json`;
const percent = (value: number) => `${(value / 10).toFixed(1)}%`;
const integerKeys = new Set(['maximumHoldDays', 'tickWindowSize', 'continuationWindow']);
const parametersOf = (grid: Grid) =>
  Object.fromEntries(d1Keys.map((key) => [key, integerKeys.has(key) ? grid[key] : percent(grid[key])]));

export const poolIdOf = (track: string, order: number) => `S9B-${track}-F24-${order}`;

export const loadResearchPool = async (id: string): Promise<LoadedPool> => {
  if (!poolIdPattern.test(id)) throw new PoolConfigError(`"${id}" is not a pool id`);

  const file = path.join(researchPoolsDir, `${id}.json`);

  if (!(await fs.pathExists(file))) {
    throw new PoolConfigError(
      `no research pool "${id}" (${file}); write them with \`npm run study9b-run -- research-configs\``
    );
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

  // the pools schema validates every other field; it requires registry paths, so they are checked above and restored
  const config = parsePoolConfig(
    { ...raw, books: raw.books.map((book) => ({ ...book, phenotypeFile: registryFile(book.symbol) })) },
    file
  );

  config.books.forEach((book, index) => {
    book.phenotypeFile = declared[index]!;
  });

  if (config.id !== id) throw new PoolConfigError(`${file}: id "${config.id}" must equal the file name "${id}"`);

  const foreign = config.books.map((book) => book.symbol).filter((symbol) => !allSymbols.includes(symbol));

  if (foreign.length) throw new PoolConfigError(`${file}: ${foreign.join(' ')} outside the study's symbols`);

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
    const registered = Object.fromEntries(selection.phenotype.parameters.map((p) => [p.name, p.grid]));

    for (const key of d1Keys) {
      if (registered[key] !== book.grid[key])
        throw new PoolConfigError(
          `${file} ${book.symbol}: ${key} ${book.grid[key]} ≠ ${selection.file.path} ${book.phenotype} ${registered[key]}`
        );
    }

    if (gridHash(book.grid) !== book.parametersSha256)
      throw new PoolConfigError(`${file} ${book.symbol}: parametersSha256 does not match the grid`);
    if (String(selection.phenotype.provenance?.candidateId ?? '') !== book.candidateId)
      throw new PoolConfigError(`${file} ${book.symbol}: candidateId differs from ${selection.file.path}`);

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

  return {
    config,
    phenotypes,
    phenotypeFiles,
    frozenCheck: 'none (Study 9 Phase B research pool; not a frozen benchmark)'
  };
};

// Writes the research configurations from the sealed records (needs the sealed F24 test and its confirmation).
export const writeResearchConfigs = async () => {
  await requirePhase('test-F24-confirm');

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

  for (const item of selection.testPlan[primaryFold]!.shortlists) {
    const holder = selection.rankedByFold[primaryFold]!.find((r) => r.id === item.id && r.track === item.track);
    const flagged = test.members.find((m) => m.id === item.id && m.track === item.track);

    if (!flagged) throw new Error(`the sealed F24 test record has no member ${item.track}/${item.id}`);

    const gates = `2025–2026 one-time T gates: ${flagged.gates.status.toUpperCase()}${flagged.gates.failed.length ? ` (failed ${flagged.gates.failed.join(', ')})` : ''}`;
    const status = holder
      ? `training rank ${holder.rank} (tier ${holder.tier}, role ${holder.role}); ${gates}`
      : `shortlist member without a role (training-qualified: ${item.qualified ? 'yes' : 'no'}; never a nominee); ${gates}`;
    const id = poolIdOf(item.track, item.order);
    const books = bookOrderOf(Object.keys(item.books)).map((symbol) => {
      const grid = item.books[symbol]!;
      const candidateId = vectorId(grid);
      const name = `s9b${candidateId.replace(/[^A-Za-z0-9]/g, '')}`;

      phenotypeFiles[symbol] ??= {
        schemaVersion: 1,
        architecture: 'D1',
        symbol,
        execution: 'multi-etf-d1',
        phenotypes: {}
      };
      phenotypeFiles[symbol].phenotypes[name] = {
        description: `RESEARCH ONLY — NOT DEPLOYED — ${status} (research/study9-phase-b/RECOMMENDATION.md). Study 9 Phase B track ${item.track}, fold F24 (trained 2016–2024). Never deploy without the user's review.`,
        parameters: parametersOf(grid),
        provenance: {
          program: 'study9-phase-b',
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
      name: `Study 9 Phase B ${item.track} F24 #${item.order}`,
      role: `Study 9 Phase B primary-fold candidate (${item.id})`,
      status: `RESEARCH ONLY — NOT DEPLOYED — ${status.toUpperCase()}`,
      description: `Study 9 Phase B track ${item.track}, primary fold F24 (search on 2016-01-04 → 2024-12-31) shortlist member ${item.id}. Research configuration for inspection only; Study 8 VG #2 balanced, B1 and B5 remain the comparators.`,
      architecture: 'D1',
      books,
      funding: { policy: 'shadow', fundedSlots: 1, notionalPerTrade: 100000, compounding: false },
      interest: { annualRate: '11%', method: 'simple', dayCount: 365 },
      costs: { bpsPerSide: 5, sensitivityBps: [0, 2, 5, 10], commission: 0 },
      execution: { stopFill: 'stop', stopSlippageBps: 0, firstEligibleDate: '2017-06-15' },
      portfolio: { initialCore: { VOOG: 180000, VGT: 120000 }, borrowedFraction: 0.2, dividends: 'frozen' },
      provenance: {
        createdAt: new Date().toISOString().slice(0, 10),
        createdBy: 'src/study9b-runners (research-configs)',
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

  return written;
};
