// npm run datasets -- migrate [SYMBOL ...] [--dry-run]
//   Replaces the former data/<SYMBOL>/{training,holdout,final,all}/data.csv with data/<SYMBOL>/data.csv (every
//   symbol directory, or the named ones), writing data/partitions.json first if it is missing.
// npm run datasets -- verify [SYMBOL ...]
//   Re-scans canonical files against data/partitions.json; writes only the reports.
// npm run datasets -- import SYMBOL ... [--replace] [--keep-source] [--dry-run]
//   Makes a downloaded data/<SYMBOL>.csv the symbol's canonical file.
// npm run datasets -- append SYMBOL ... [--keep-source] [--dry-run]
//   Appends the rows of a download of only the newest sessions (data/<SYMBOL>.csv) after the canonical file's last bar.
// npm run datasets -- config
//   Validates data/partitions.json and prints the partitions.
// npm run datasets -- prefix SYMBOL --through YYYY-MM-DD | --bytes N --sha256 HEX
//   The byte-prefix pin of every row through a New York date, or the verification of a pin (src/lib/canonicalPrefix.ts).
// npm run datasets -- vintages [SYMBOL ...]
//   Verifies every recorded vintage (config/market-data/vintages.json) as a byte prefix of today's file.
// prefix and vintages write nothing.
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
  appendSymbol,
  importSymbol,
  migrateSymbol,
  prefixCheck,
  reportLines,
  verifySymbol,
  verifyVintages
} from './canonical.ts';

const commands = ['migrate', 'verify', 'import', 'append', 'config', 'prefix', 'vintages'] as const;
const valued = ['--through', '--bytes', '--sha256'];

// A migration's record (the former files' hashes) is kept apart from later verifications, which never replace it.
const reportFile = (command: string, report: DatasetReport) =>
  command === 'migrate' && report.status === 'migrated' ? 'migration-report.json' : 'dataset-report.json';
const flags = ['--dry-run', '--replace', '--keep-source'];

export const runDatasetsCli = async (args: string[], dataDir = 'data') => {
  const [command, ...all] = args;
  const values: Record<string, string> = {};
  const rest = all.filter((arg, i) => {
    if (valued.includes(arg)) {
      values[arg] = all[i + 1] ?? '';
      return false;
    }
    return !valued.includes(all[i - 1] ?? '');
  });
  const unknown = rest.filter((arg) => arg.startsWith('--') && !flags.includes(arg));

  if (!commands.includes(command as (typeof commands)[number])) {
    throw new Error(`Unknown command '${command ?? ''}'; use ${commands.join(', ')} (see src/data-partition/cli.ts)`);
  }

  if (unknown.length > 0) {
    throw new Error(`Unknown option(s) ${unknown.join(', ')}; the options are ${[...flags, ...valued].join(', ')}`);
  }

  const named = rest.filter((arg) => !arg.startsWith('--'));

  if (command === 'vintages') {
    const rows = await verifyVintages(named, { dataDir });

    for (const r of rows)
      console.info(
        `${r.ok ? 'ok  ' : 'FAIL'} ${r.symbol} ${r.bytes} bytes ${r.sha256.slice(0, 16)}…${r.ok ? `: a byte prefix of ${r.file} (${r.laterBytes} later bytes${r.nextRowUtc ? `, next row ${r.nextRowUtc}` : ''})` : `: ${r.error}`}`
      );
    console.info(`${rows.filter((r) => r.ok).length} of ${rows.length} recorded vintage(s) verified`);
    return rows.every((r) => r.ok);
  }

  if (command === 'prefix') {
    if (named.length !== 1) throw new Error('prefix takes one symbol');

    const pin = values['--bytes'] !== undefined ? { bytes: Number(values['--bytes']), sha256: values['--sha256'] ?? '' } : undefined;

    console.info(JSON.stringify(prefixCheck(named[0]!, { through: values['--through'], pin }, { dataDir }), null, 1));
    return true;
  }
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

  if ((command === 'import' || command === 'append') && named.length === 0) {
    throw new Error(`Name the symbols to ${command}, for example \`npm run datasets -- ${command} KRE\``);
  }

  const symbols = named.length > 0 ? named : await discoverSymbols(dataDir);
  const reports: DatasetReport[] = [];

  for (const symbol of symbols) {
    const report =
      command === 'migrate'
        ? await migrateSymbol(symbol, options)
        : command === 'import'
          ? await importSymbol(symbol, options)
          : command === 'append'
            ? await appendSymbol(symbol, options)
            : await verifySymbol(symbol, options);

    reports.push(report);
    console.info(`\n${reportLines(report).join('\n')}`);

    if (!options.dryRun && (await fs.pathExists(path.join(dataDir, symbol)))) {
      await fs.writeJson(path.join(dataDir, symbol, reportFile(command!, report)), report, { spaces: 1 });
    }
  }

  const failed = reports.filter((report) => report.status === 'failed').map((report) => report.symbol);

  console.info(
    `\n${reports.length - failed.length} of ${reports.length} symbol(s) ${options.dryRun ? 'checked (dry run, nothing written)' : command === 'verify' ? 'verified' : command === 'append' ? 'appended' : command === 'import' ? 'imported' : `${command}d`}${failed.length ? `; FAILED: ${failed.join(', ')}` : ''}`
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
