// npm run partition-data -- [SYMBOL ...] [--replace] [--keep-source]
//   Partitions every downloaded data/<SYMBOL>.csv (or the named ones) into data/<SYMBOL>/<partition>/data.csv.
// npm run partition-data -- verify [SYMBOL ...]
//   Re-checks partition files already in place (all symbols with a partition directory, or the named ones).
// The exit code is 1 when any symbol fails; a failed symbol keeps its source and its existing destinations.
import fs from 'fs-extra';
import {
  type PartitionOptions,
  type SymbolReport,
  discoverSources,
  partitionSymbol,
  partitionedSymbols,
  reportLines,
  verifySymbol
} from './partition.ts';
import { partitionBoundaries } from './scan.ts';

const flags = ['--replace', '--keep-source'];

export const runPartitionCli = async (args: string[], dataDir = 'data') => {
  const unknown = args.filter((arg) => arg.startsWith('--') && !flags.includes(arg));

  if (unknown.length > 0) {
    throw new Error(`Unknown option(s) ${unknown.join(', ')}; the options are ${flags.join(', ')}`);
  }

  const verify = args[0] === 'verify';
  const named = args.filter((arg, index) => !arg.startsWith('--') && !(verify && index === 0));
  const options: PartitionOptions = {
    dataDir,
    replace: args.includes('--replace'),
    keepSource: args.includes('--keep-source'),
    log: (line) => console.info(line)
  };
  const reports: SymbolReport[] = [];

  console.info(
    `Partitions (New York trading dates, inclusive): ${partitionBoundaries.map(({ partition, first, last }) => `${partition} ${first} → ${last ?? 'end'}`).join('; ')}; all = training + holdout + final`
  );

  if (verify) {
    const symbols = named.length > 0 ? named : await partitionedSymbols(dataDir);

    for (const symbol of symbols) {
      reports.push(await verifySymbol(symbol, options));
    }
  } else {
    const { symbols: found, skipped } = await discoverSources(dataDir);
    const missing = named.filter((symbol) => !found.includes(symbol));

    if (skipped.length > 0) {
      console.info(`Skipped ${skipped.join(', ')}: not named like data/<SYMBOL>.csv with an upper-case symbol`);
    }

    if (missing.length > 0) {
      throw new Error(`No ${missing.map((symbol) => `${dataDir}/${symbol}.csv`).join(', ')} to partition`);
    }

    const symbols = named.length > 0 ? named : found;

    if (symbols.length === 0) {
      console.info(
        `No ${dataDir}/<SYMBOL>.csv files to partition; \`npm run partition-data -- verify\` re-checks existing ones`
      );
    }

    for (const symbol of symbols) {
      reports.push(await partitionSymbol(symbol, options));
    }
  }

  for (const report of reports) {
    console.info(`\n${reportLines(report).join('\n')}`);
  }

  const failed = reports.filter((report) => report.status === 'failed').map((report) => report.symbol);

  console.info(
    `\n${reports.length - failed.length} of ${reports.length} symbol(s) ${verify ? 'verified' : 'partitioned'}${failed.length ? `; FAILED: ${failed.join(', ')}` : ''}`
  );

  if (!verify && reports.length > 0) {
    await fs.writeJson(`${dataDir}/partition-run.json`, reports, { spaces: 1 });
  }

  return failed.length === 0;
};
