// The canonical dataset layout, data/<SYMBOL>/data.csv plus data/partitions.json (src/lib/dataset.ts), and the tools
// that create and check it:
//
// - migrate: replaces the former physical partitions, data/<SYMBOL>/{training,holdout,final,all}/data.csv. It first
//   proves that `all` is training ‖ holdout ‖ final byte for byte (sha256 and row counts), scans `all` (CSV syntax,
//   six fields, UTC timestamps, strictly ascending, no duplicates) and checks that each physical file holds exactly
//   the rows partitions.json assigns to its partition. It then copies `all` to a temporary file beside the target,
//   checks its sha256, and renames it to data/<SYMBOL>/data.csv. Only then are the four partition files removed (a
//   partition directory is removed only when nothing else is in it). Any failure stops that symbol and leaves every
//   original file in place. Rerunning it resumes or re-verifies.
// - verify: re-scans data/<SYMBOL>/data.csv against partitions.json; nothing is written except the report.
// - import: makes data/<SYMBOL>.csv (a fresh download) the symbol's canonical file after the same scan, writing the
//   data rows exactly (a header row, if any, is left out). A new symbol needs nothing else: partitions are dates.
//
// Bytes are never rewritten: no re-encoding, delimiter change, resampling, interpolation or adjustment.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import {
  type PartitionConfig,
  type SegmentPartition,
  canonicalDataFile,
  datasetPartitions,
  defaultPartitionConfigText,
  partitionsFile,
  readPartitionConfig,
  segmentPartitions
} from '#lib';
import { type PartitionStats, type ScanResult, fatalProblems, scanMinuteFile } from './scan.ts';

const symbolPattern = /^[A-Z0-9][A-Z0-9.-]*$/;
const formerPartitions = datasetPartitions;

export interface FileFacts {
  file: string;
  bytes: number;
  rows: number;
  sha256: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
}

export interface DatasetReport {
  symbol: string;
  command: 'migrate' | 'verify' | 'import';
  status: 'migrated' | 'verified' | 'imported' | 'unchanged' | 'failed' | 'dry run';
  file: string;
  partitionsFile: string;
  partitionsSha256: string;
  before?: Partial<Record<(typeof formerPartitions)[number], FileFacts>>;
  after?: FileFacts;
  partitions?: Record<SegmentPartition, PartitionStats>;
  proof: string[];
  removed: string[];
  kept: string[];
  anomalies: string[];
  errors: string[];
  scan?: Omit<ScanResult, 'file'>;
}

export interface DatasetOptions {
  dataDir?: string;
  dryRun?: boolean;
  replace?: boolean;
  keepSource?: boolean;
  log?: (line: string) => void;
  // The validated metadata; read from the data directory when absent.
  config?: PartitionConfig;
}

const sha256File = async (file: string) => {
  const hash = createHash('sha256');

  for await (const chunk of fs.createReadStream(file)) {
    hash.update(chunk as Buffer);
  }

  return hash.digest('hex');
};

// Bytes, newline-terminated rows, sha256 and the first and last rows' timestamps of a file, in one pass.
export const factsOf = async (file: string): Promise<FileFacts> => {
  const hash = createHash('sha256');
  let bytes = 0;
  let rows = 0;
  let first = '';
  let tail = '';

  for await (const chunk of fs.createReadStream(file)) {
    const buffer = chunk as Buffer;

    hash.update(buffer);
    bytes += buffer.length;

    for (const byte of buffer) {
      if (byte === 10) {
        rows++;
      }
    }

    if (first.length < 64) {
      first += buffer.toString('utf8', 0, Math.min(buffer.length, 64));
    }

    tail = (tail + buffer.toString('utf8', Math.max(0, buffer.length - 128))).slice(-256);
  }

  const timestampOf = (line?: string) => line?.split(',')[0]?.replace(/"/g, '') || undefined;
  const lastLine = tail.replace(/\n$/, '').split('\n').at(-1);

  return {
    file,
    bytes,
    rows,
    sha256: hash.digest('hex'),
    firstTimestamp: timestampOf(first.split('\n')[0]),
    lastTimestamp: timestampOf(lastLine)
  };
};

// sha256 of several files read one after the other.
const sha256Concatenation = async (files: string[]) => {
  const hash = createHash('sha256');

  for (const file of files) {
    for await (const chunk of fs.createReadStream(file)) {
      hash.update(chunk as Buffer);
    }
  }

  return hash.digest('hex');
};

const formerFile = (dataDir: string, symbol: string, partition: string) =>
  path.join(dataDir, symbol, partition, 'data.csv');

// Writes data/partitions.json from the shipped default when there is none, and returns the validated metadata.
export const ensurePartitionConfig = async (dataDir: string, log: (line: string) => void, dryRun = false) => {
  const file = partitionsFile(dataDir);

  if (!(await fs.pathExists(file))) {
    if (dryRun) {
      log(`Would write ${file} (dry run)`);
      const temporary = path.join(dataDir, `.partitions-dry-run-${process.pid}`);

      await fs.outputFile(path.join(temporary, 'partitions.json'), defaultPartitionConfigText);

      try {
        return { ...readPartitionConfig(temporary), file };
      } finally {
        await fs.remove(temporary);
      }
    }

    await fs.outputFile(`${file}.tmp-${process.pid}`, defaultPartitionConfigText, { flag: 'wx' });
    await fs.rename(`${file}.tmp-${process.pid}`, file);
    log(`Wrote ${file}`);
  }

  return readPartitionConfig(dataDir);
};

// Symbol directories: those holding a canonical file or the former partition files.
export const discoverSymbols = async (dataDir = 'data') => {
  const symbols: string[] = [];

  for (const name of (await fs.readdir(dataDir)).sort()) {
    if (!symbolPattern.test(name) || !(await fs.stat(path.join(dataDir, name))).isDirectory()) {
      continue;
    }

    const canonical = await fs.pathExists(canonicalDataFile(name, dataDir));
    const former = await Promise.all(formerPartitions.map((p) => fs.pathExists(formerFile(dataDir, name, p))));

    if (canonical || former.some(Boolean)) {
      symbols.push(name);
    }
  }

  return symbols;
};

const emptyReport = (
  symbol: string,
  command: DatasetReport['command'],
  dataDir: string,
  config: PartitionConfig
): DatasetReport => ({
  symbol,
  command,
  status: 'failed',
  file: canonicalDataFile(symbol, dataDir),
  partitionsFile: config.file,
  partitionsSha256: config.sha256,
  proof: [],
  removed: [],
  kept: [],
  anomalies: [],
  errors: []
});

const withoutFile = (scan: ScanResult): Omit<ScanResult, 'file'> => {
  const copy: Partial<ScanResult> = { ...scan };

  delete copy.file;
  return copy as Omit<ScanResult, 'file'>;
};

// The anomalies a scan reports without failing.
const anomaliesOf = (scan: ScanResult) => {
  const lines: string[] = [];
  const { audit } = scan;

  if (scan.unalignedSeconds.count) lines.push(`${scan.unalignedSeconds.count} timestamps not on a whole minute`);
  if (scan.inconsistentPrices.count) lines.push(`${scan.inconsistentPrices.count} bars with inconsistent OHLC`);
  if (audit.missingSessions.length)
    lines.push(
      `${audit.missingSessions.length} expected NYSE sessions without a regular-session bar (${audit.missingSessions.slice(0, 5).join(', ')}${audit.missingSessions.length > 5 ? ', …' : ''})`
    );
  if (audit.sessionsOnClosedDays.length)
    lines.push(`regular-session bars on closed days: ${audit.sessionsOnClosedDays.join(', ')}`);
  if (audit.earlyCloseLateBars.length)
    lines.push(`bars after 1:00 p.m. on ${audit.earlyCloseLateBars.length} early-close days`);
  if (audit.coverage.below50)
    lines.push(`${audit.coverage.below50} sessions with fewer than half their regular minutes (sparse bars)`);
  if (!scan.endsWithNewline) lines.push('the last row has no trailing newline');
  if (scan.header) lines.push(`a header row (${scan.header}) that is not data`);

  return lines;
};

const scanErrors = (scan: ScanResult) =>
  fatalProblems(scan).map((key) => `${scan[key].count} ${key} rows, e.g. ${scan[key].examples.slice(0, 3).join('; ')}`);

const checkScan = (report: DatasetReport, scan: ScanResult, label: string) => {
  report.scan = withoutFile(scan);
  report.partitions = scan.partitions;
  report.anomalies = anomaliesOf(scan);

  for (const error of scanErrors(scan)) {
    report.errors.push(`${label}: ${error}`);
  }

  if (scan.header) {
    report.errors.push(`${label}: a header row; canonical files have none`);
  }

  if (!scan.endsWithNewline) {
    report.errors.push(`${label}: the last row has no trailing newline`);
  }

  if (scan.dataRows === 0) {
    report.errors.push(`${label}: no data rows`);
  }
};

// Re-scans data/<SYMBOL>/data.csv against partitions.json.
export const verifySymbol = async (symbol: string, options: DatasetOptions = {}): Promise<DatasetReport> => {
  const dataDir = options.dataDir ?? 'data';
  const config = options.config ?? readPartitionConfig(dataDir);
  const report = emptyReport(symbol, 'verify', dataDir, config);

  try {
    if (!(await fs.pathExists(report.file))) {
      throw new Error(`${report.file} does not exist`);
    }

    report.after = await factsOf(report.file);

    const scan = await scanMinuteFile(report.file, config);

    checkScan(report, scan, report.file);

    if (scan.rowsSha256 !== report.after.sha256) {
      report.errors.push(`the data rows hash to ${scan.rowsSha256}, not the file's ${report.after.sha256}`);
    }

    const leftovers = [];

    for (const partition of formerPartitions) {
      if (await fs.pathExists(formerFile(dataDir, symbol, partition))) {
        leftovers.push(formerFile(dataDir, symbol, partition));
      }
    }

    if (leftovers.length > 0) {
      report.anomalies.push(`former partition files still present (run migrate): ${leftovers.join(', ')}`);
    }

    report.status = report.errors.length === 0 ? 'verified' : 'failed';
  } catch (error) {
    report.errors.push((error as Error).message);
  }

  return report;
};

// Migrates one symbol from the former four files to data/<SYMBOL>/data.csv. See the header.
export const migrateSymbol = async (symbol: string, options: DatasetOptions = {}): Promise<DatasetReport> => {
  const dataDir = options.dataDir ?? 'data';
  const log = options.log ?? (() => {});
  const config = options.config ?? readPartitionConfig(dataDir);
  const report = emptyReport(symbol, 'migrate', dataDir, config);
  const target = report.file;
  const files = Object.fromEntries(formerPartitions.map((p) => [p, formerFile(dataDir, symbol, p)])) as Record<
    (typeof formerPartitions)[number],
    string
  >;
  const present = await Promise.all(formerPartitions.map((p) => fs.pathExists(files[p])));

  try {
    if (!present.some(Boolean)) {
      if (!(await fs.pathExists(target))) {
        throw new Error(`neither ${target} nor the former partition files exist`);
      }

      const verified = await verifySymbol(symbol, { ...options, dataDir });

      return { ...verified, command: 'migrate', status: verified.status === 'verified' ? 'unchanged' : 'failed' };
    }

    const missing = formerPartitions.filter((_, index) => !present[index]);

    if (missing.length > 0) {
      throw new Error(`incomplete former layout: ${missing.map((p) => files[p]).join(', ')} missing`);
    }

    log(`${symbol}: checking the former partition files`);
    report.before = {};

    for (const partition of formerPartitions) {
      report.before[partition] = await factsOf(files[partition]);
    }

    const before = report.before as Record<(typeof formerPartitions)[number], FileFacts>;
    const union = await sha256Concatenation(segmentPartitions.map((p) => files[p]));
    const unionRows = segmentPartitions.reduce((sum, p) => sum + before[p].rows, 0);

    report.proof.push(
      `rows: training ${before.training.rows} + holdout ${before.holdout.rows} + final ${before.final.rows} = ${unionRows}; all ${before.all.rows}`,
      `sha256(training ‖ holdout ‖ final) = ${union}`,
      `sha256(all)                         = ${before.all.sha256}`
    );

    if (union !== before.all.sha256 || unionRows !== before.all.rows) {
      throw new Error('all is not training ‖ holdout ‖ final byte for byte');
    }

    const scan = await scanMinuteFile(files.all, config);

    checkScan(report, scan, files.all);

    for (const partition of segmentPartitions) {
      if (scan.partitions[partition].rows !== before[partition].rows) {
        report.errors.push(
          `${files[partition]} has ${before[partition].rows} rows, but ${config.file} assigns ${scan.partitions[partition].rows} rows of all to ${partition}`
        );
      }
    }

    if (scan.rowsSha256 !== before.all.sha256) {
      report.errors.push(`the scanned data rows hash to ${scan.rowsSha256}, not the file's ${before.all.sha256}`);
    }

    report.proof.push(
      `partitions.json assigns ${segmentPartitions.map((p) => `${p} ${scan.partitions[p].rows}`).join(', ')} rows of all (${scan.partitions.training.firstDate} → ${scan.partitions.final.lastDate ?? scan.partitions.holdout.lastDate})`
    );

    if (report.errors.length > 0) {
      throw new Error('validation failed');
    }

    if (options.dryRun) {
      report.status = 'dry run';
      report.proof.push(`would promote ${files.all} to ${target} and remove the four partition files`);
      return report;
    }

    if (await fs.pathExists(target)) {
      const existing = await sha256File(target);

      if (existing !== before.all.sha256) {
        throw new Error(`${target} exists with sha256 ${existing}, not all's ${before.all.sha256}; it was left alone`);
      }

      report.proof.push(`${target} already holds all's bytes (resumed)`);
    } else {
      const temporary = path.join(dataDir, symbol, `.data.csv.tmp-${process.pid}`);

      await fs.copyFile(files.all, temporary, fs.constants.COPYFILE_EXCL);

      const copied = await sha256File(temporary);

      if (copied !== before.all.sha256) {
        await fs.remove(temporary);
        throw new Error(`the copy hashes to ${copied}, not ${before.all.sha256}`);
      }

      await fs.rename(temporary, target);
    }

    report.after = await factsOf(target);

    if (report.after.sha256 !== before.all.sha256 || report.after.rows !== before.all.rows) {
      throw new Error(`${target} does not match all after the move; the former files were kept`);
    }

    report.proof.push(`sha256(${target}) = ${report.after.sha256} = sha256(all)`);

    for (const partition of formerPartitions) {
      await fs.remove(files[partition]);
      report.removed.push(files[partition]);

      const dir = path.dirname(files[partition]);
      const rest = await fs.readdir(dir);

      if (rest.length === 0) {
        await fs.rmdir(dir);
      } else {
        report.kept.push(...rest.map((name) => path.join(dir, name)));
      }
    }

    report.status = 'migrated';
  } catch (error) {
    report.errors.push((error as Error).message);
    report.status = 'failed';
  }

  return report;
};

// Makes data/<SYMBOL>.csv the canonical file. See the header.
export const importSymbol = async (symbol: string, options: DatasetOptions = {}): Promise<DatasetReport> => {
  const dataDir = options.dataDir ?? 'data';
  const config = options.config ?? readPartitionConfig(dataDir);
  const report = emptyReport(symbol, 'import', dataDir, config);
  const source = path.join(dataDir, `${symbol}.csv`);
  const temporary = path.join(dataDir, symbol, `.data.csv.tmp-${process.pid}`);

  try {
    if (!symbolPattern.test(symbol)) {
      throw new Error(`'${symbol}' is not a symbol`);
    }

    if (!(await fs.pathExists(source))) {
      throw new Error(`${source} does not exist`);
    }

    const existing = (await fs.pathExists(report.file)) ? await verifySymbol(symbol, options) : undefined;

    if (existing && !options.replace) {
      throw new Error(`${report.file} exists; pass --replace to replace it (the report shows which partitions change)`);
    }

    await fs.mkdirp(path.dirname(report.file));

    const out = fs.createWriteStream(temporary, { flags: 'wx' });
    const scan = await scanMinuteFile(source, config, async (_partition, line) => {
      if (!out.write(line)) {
        await new Promise<void>((resolve) => out.once('drain', () => resolve()));
      }
    });

    await new Promise<void>((resolve, reject) =>
      out.end((error?: Error | null) => (error ? reject(error) : resolve()))
    );
    checkScan(report, { ...scan, header: undefined }, source);

    if (scan.header) {
      report.anomalies.push(`the source's header row (${scan.header}) was left out`);
    }

    if (report.errors.length > 0) {
      throw new Error('validation failed');
    }

    report.after = await factsOf(temporary);

    if (report.after.sha256 !== scan.rowsSha256) {
      throw new Error(`the written rows hash to ${report.after.sha256}, not the scanned ${scan.rowsSha256}`);
    }

    if (existing?.partitions) {
      for (const partition of segmentPartitions) {
        const was = existing.partitions[partition];
        const now = scan.partitions[partition];

        report.proof.push(
          `${partition}: ${was.sha256 === now.sha256 ? 'unchanged' : `CHANGED (${was.rows} → ${now.rows} rows)`}`
        );
      }
    }

    if (options.dryRun) {
      await fs.remove(temporary);
      report.status = 'dry run';
      return report;
    }

    await fs.rename(temporary, report.file);
    report.after = { ...report.after, file: report.file };
    report.proof.push(`sha256(${report.file}) = ${report.after.sha256} = sha256(data rows of ${source})`);

    if (!options.keepSource) {
      await fs.remove(source);
      report.removed.push(source);
    }

    report.status = 'imported';
  } catch (error) {
    report.errors.push((error as Error).message);
    report.status = 'failed';
    await fs.remove(temporary);
  }

  return report;
};

export const reportLines = (report: DatasetReport): string[] => {
  const lines = [`${report.symbol}: ${report.status.toUpperCase()} (${report.command}) → ${report.file}`];

  for (const [partition, facts] of Object.entries(report.before ?? {})) {
    lines.push(
      `  before ${partition.padEnd(8)} ${String(facts.rows).padStart(9)} rows  ${facts.sha256}  ${facts.firstTimestamp} → ${facts.lastTimestamp}`
    );
  }

  if (report.after) {
    lines.push(
      `  canonical        ${String(report.after.rows).padStart(9)} rows  ${report.after.sha256}  ${report.after.firstTimestamp} → ${report.after.lastTimestamp}`
    );
  }

  for (const [partition, stats] of Object.entries(report.partitions ?? {})) {
    lines.push(
      `  ${partition.padEnd(8)} dates ${stats.firstDate ?? '-'} → ${stats.lastDate ?? '-'}  ${String(stats.rows).padStart(9)} rows  sha256 ${stats.sha256?.slice(0, 16)}`
    );
  }

  lines.push(...report.proof.map((line) => `  proof: ${line}`));
  lines.push(...report.anomalies.map((line) => `  note: ${line}`));
  lines.push(...report.removed.map((line) => `  removed: ${line}`));
  lines.push(...report.kept.map((line) => `  kept: ${line}`));
  lines.push(...report.errors.map((line) => `  ERROR: ${line}`));

  return lines;
};
