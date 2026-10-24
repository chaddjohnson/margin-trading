// npm run datasets -- migrate [SYMBOL ...] [--dry-run]
//   Replaces the former data/<SYMBOL>/{training,holdout,final,all}/data.csv with data/<SYMBOL>/data.csv (every
//   symbol directory, or the named ones), writing data/partitions.json first if it is missing.
// npm run datasets -- verify [SYMBOL ...]
//   Re-scans canonical files against data/partitions.json; writes only the reports.
// npm run datasets -- import SYMBOL ... [--replace] [--keep-source] [--dry-run]
//   Makes a downloaded data/<SYMBOL>.csv the symbol's canonical file.
// npm run datasets -- config
//   Validates data/partitions.json and prints the partitions.
// Every symbol's report is printed and saved in data/<SYMBOL>/dataset-report.json (a completed migration's in
// data/<SYMBOL>/migration-report.json, which nothing overwrites), and the run's in data/datasets-<command>-run.json. The exit code is 1 when any symbol fails; a failed symbol keeps every original file.
import path from 'node:path';
import fs from 'fs-extra';
import { datasetPartitions, describeInterval, readPartitionConfig } from '#lib';
import {
  type DatasetOptions,
  type DatasetReport,
  discoverSymbols,
  ensurePartitionConfig,
  importSymbol,
  migrateSymbol,
  reportLines,
  verifySymbol
} from './canonical.ts';

const commands = ['migrate', 'verify', 'import', 'config'] as const;

// A migration's record (the former files' hashes) is kept apart from later verifications, which never replace it.
const reportFile = (command: string, report: DatasetReport) =>
  command === 'migrate' && report.status === 'migrated' ? 'migration-report.json' : 'dataset-report.json';
const flags = ['--dry-run', '--replace', '--keep-source'];

export const runDatasetsCli = async (args: string[], dataDir = 'data') => {
  const [command, ...rest] = args;
  const unknown = rest.filter((arg) => arg.startsWith('--') && !flags.includes(arg));

  if (!commands.includes(command as (typeof commands)[number])) {
    throw new Error(`Unknown command '${command ?? ''}'; use ${commands.join(', ')} (see src/data-partition/cli.ts)`);
  }

  if (unknown.length > 0) {
    throw new Error(`Unknown option(s) ${unknown.join(', ')}; the options are ${flags.join(', ')}`);
  }

  const named = rest.filter((arg) => !arg.startsWith('--'));
  const log = (line: string) => console.info(line);
  const config =
    command === 'migrate'
      ? await ensurePartitionConfig(dataDir, log, rest.includes('--dry-run'))
      : readPartitionConfig(dataDir);
  const options: DatasetOptions = {
    dataDir,
    config,
    dryRun: rest.includes('--dry-run'),
    replace: rest.includes('--replace'),
    keepSource: rest.includes('--keep-source'),
    log
  };

  console.info(
    `${config.file} (sha256 ${config.sha256.slice(0, 16)}), New York trading dates, inclusive: ${datasetPartitions.map((partition) => `${partition} ${describeInterval(config.partitions[partition])}`).join('; ')}`
  );

  if (command === 'config') {
    return true;
  }

  if (command === 'import' && named.length === 0) {
    throw new Error('Name the symbols to import, for example `npm run datasets -- import KRE`');
  }

  const symbols = named.length > 0 ? named : await discoverSymbols(dataDir);
  const reports: DatasetReport[] = [];

  for (const symbol of symbols) {
    const report =
      command === 'migrate'
        ? await migrateSymbol(symbol, options)
        : command === 'import'
          ? await importSymbol(symbol, options)
          : await verifySymbol(symbol, options);

    reports.push(report);
    console.info(`\n${reportLines(report).join('\n')}`);

    if (!options.dryRun && (await fs.pathExists(path.join(dataDir, symbol)))) {
      await fs.writeJson(path.join(dataDir, symbol, reportFile(command!, report)), report, { spaces: 1 });
    }
  }

  const failed = reports.filter((report) => report.status === 'failed').map((report) => report.symbol);

  console.info(
    `\n${reports.length - failed.length} of ${reports.length} symbol(s) ${options.dryRun ? 'checked (dry run, nothing written)' : command === 'verify' ? 'verified' : `${command}d`}${failed.length ? `; FAILED: ${failed.join(', ')}` : ''}`
  );

  if (!options.dryRun && reports.length > 0) {
    await fs.writeJson(
      path.join(dataDir, `datasets-${command}-run.json`),
      { command, at: new Date().toISOString(), partitions: config, reports },
      { spaces: 1 }
    );
  }

  return failed.length === 0;
};
