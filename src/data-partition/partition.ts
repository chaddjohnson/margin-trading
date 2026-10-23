// Partitions a downloaded data/<SYMBOL>.csv into data/<SYMBOL>/{training,holdout,final,all}/data.csv, the layout of
// src/lib/dataset.ts. Rows are copied byte for byte (a header row, if any, is dropped); `all` is the three
// partitions' rows in order, written in the same pass. The outputs are written to a temporary directory, checked
// from disk, and only then moved into place; the source is deleted last, after the moved files are checked again.
// Any failure leaves the source and every existing destination untouched.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { type DatasetPartition, datasetFile, datasetPartitions, loadCsvMinuteBacktestData } from '#lib';
import {
  type ScanResult,
  dataPartitions,
  fatalProblems,
  newYorkDateAndMinute,
  partitionBoundaries,
  scanMinuteFile
} from './scan.ts';

export class PartitionError extends Error {}

export interface FileCheck {
  file: string;
  rows: number;
  bytes: number;
  sha256: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  firstDate?: string;
  lastDate?: string;
}

export interface SymbolReport {
  symbol: string;
  mode: 'partition' | 'verify';
  status: 'ok' | 'failed';
  source?: string;
  sourceSha256?: string;
  sourceRemoved?: boolean;
  header?: string;
  files: Partial<Record<DatasetPartition, FileCheck>>;
  // How `all` was proven to be the ordered union of the partitions.
  proof: string[];
  destinations: Partial<Record<DatasetPartition, 'created' | 'unchanged' | 'replaced'>>;
  scan?: Omit<ScanResult, 'file'>;
  errors: string[];
}

export interface PartitionOptions {
  dataDir?: string; // default data
  replace?: boolean; // replace existing destinations that differ (after validation)
  keepSource?: boolean;
  log?: (line: string) => void;
}

const sha256File = async (file: string) => {
  const hash = createHash('sha256');
  let bytes = 0;

  for await (const chunk of fs.createReadStream(file)) {
    hash.update(chunk as Buffer);
    bytes += (chunk as Buffer).length;
  }

  return { sha256: hash.digest('hex'), bytes };
};

// Buffers lines and writes them in large chunks, waiting for the stream to drain.
class LineWriter {
  private readonly stream: fs.WriteStream;
  private buffer: string[] = [];
  private size = 0;

  constructor(file: string) {
    this.stream = fs.createWriteStream(file, { flags: 'wx' });
  }

  async write(line: string) {
    this.buffer.push(line);
    this.size += line.length;

    if (this.size >= 1 << 20) {
      await this.flush();
    }
  }

  private async flush() {
    if (this.size > 0 && !this.stream.write(this.buffer.join(''))) {
      await new Promise<void>((resolve) => this.stream.once('drain', () => resolve()));
    }

    this.buffer = [];
    this.size = 0;
  }

  async close() {
    await this.flush();
    await new Promise<void>((resolve, reject) =>
      this.stream.end((error?: Error | null) => (error ? reject(error) : resolve()))
    );
  }
}

export const discoverSources = async (dataDir = 'data') => {
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  const symbols: string[] = [];
  const skipped: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.csv')) {
      const match = /^([A-Z0-9][A-Z0-9.-]*)\.csv$/.exec(entry.name);

      (match ? symbols : skipped).push(match ? match[1]! : entry.name);
    }
  }

  return { symbols: symbols.sort(), skipped: skipped.sort() };
};

export const destinationsOf = (symbol: string, dataDir = 'data') =>
  Object.fromEntries(
    datasetPartitions.map((partition) => [partition, datasetFile(symbol, partition, dataDir)])
  ) as Record<DatasetPartition, string>;

// Checks a set of partition files against the scan of the rows they should hold: each partition file parses with
// the application's loader, holds exactly the scan's rows for it and stays inside its boundaries, and the bytes of
// training, holdout and final, concatenated in that order, are the bytes of `all` and of the scanned rows.
export const checkPartitionFiles = async (
  files: Record<DatasetPartition, string>,
  scan: ScanResult,
  symbol: string
): Promise<{ checks: Record<DatasetPartition, FileCheck>; proof: string[]; errors: string[] }> => {
  const errors: string[] = [];
  const checks = {} as Record<DatasetPartition, FileCheck>;
  const concatenation = createHash('sha256');

  for (const partition of datasetPartitions) {
    const file = files[partition];
    const hash = createHash('sha256');
    let bytes = 0;

    for await (const chunk of fs.createReadStream(file)) {
      hash.update(chunk as Buffer);
      bytes += (chunk as Buffer).length;

      if (partition !== 'all') {
        concatenation.update(chunk as Buffer);
      }
    }

    // The application's own reader: comma-delimited, headerless, UTC, strictly ascending.
    let ticks: Awaited<ReturnType<typeof loadCsvMinuteBacktestData>> = [];

    try {
      ticks = await loadCsvMinuteBacktestData(symbol, file);
    } catch (error) {
      errors.push(`${partition}: the application loader refused ${file}: ${(error as Error).message}`);
    }

    const first = ticks[0];
    const last = ticks.at(-1);
    const check: FileCheck = {
      file,
      rows: ticks.length,
      bytes,
      sha256: hash.digest('hex'),
      firstTimestamp: first && new Date(first.time * 1000).toISOString(),
      lastTimestamp: last && new Date(last.time * 1000).toISOString(),
      firstDate: first && newYorkDateAndMinute(first.time).date,
      lastDate: last && newYorkDateAndMinute(last.time).date
    };

    checks[partition] = check;

    const expectedRows = partition === 'all' ? scan.dataRows : scan.partitions[partition].rows;

    if (check.rows !== expectedRows) {
      errors.push(`${partition}: ${check.rows} rows on disk, ${expectedRows} expected`);
    }

    const boundary = partitionBoundaries.find((entry) => entry.partition === partition);

    if (boundary && check.firstDate && check.lastDate) {
      if (check.firstDate < boundary.first || (boundary.last !== undefined && check.lastDate > boundary.last)) {
        errors.push(
          `${partition}: trading dates ${check.firstDate} → ${check.lastDate} leave ${boundary.first} → ${boundary.last ?? 'open'}`
        );
      }
    }
  }

  // Consecutive partitions don't overlap: each starts after the previous one ends.
  const filled = dataPartitions.map((partition) => checks[partition]).filter((check) => check.rows > 0);

  for (let index = 1; index < filled.length; index++) {
    if (filled[index]!.firstTimestamp! <= filled[index - 1]!.lastTimestamp!) {
      errors.push(`${filled[index]!.file} starts before ${filled[index - 1]!.file} ends`);
    }
  }

  const concatenated = concatenation.digest('hex');
  const proof = [
    `rows: training ${checks.training.rows} + holdout ${checks.holdout.rows} + final ${checks.final.rows} = ${checks.training.rows + checks.holdout.rows + checks.final.rows}; all ${checks.all.rows}; source data rows ${scan.dataRows}`,
    `sha256(training ‖ holdout ‖ final) = ${concatenated}`,
    `sha256(all)                         = ${checks.all.sha256}`,
    `sha256(source data rows)            = ${scan.rowsSha256}`
  ];

  if (checks.training.rows + checks.holdout.rows + checks.final.rows !== checks.all.rows) {
    errors.push("the partitions' row counts do not add up to all");
  }

  if (concatenated !== checks.all.sha256) {
    errors.push('all is not byte-for-byte the concatenation of training, holdout and final');
  }

  if (checks.all.sha256 !== scan.rowsSha256) {
    errors.push('all is not byte-for-byte the scanned data rows');
  }

  return { checks, proof, errors };
};

const withoutFile = (scan: ScanResult): Omit<ScanResult, 'file'> => {
  const copy: Partial<ScanResult> = { ...scan };

  delete copy.file;
  return copy as Omit<ScanResult, 'file'>;
};

const failIf = (report: SymbolReport) => {
  if (report.errors.length > 0) {
    report.status = 'failed';
    throw new PartitionError(report.errors.join('; '));
  }
};

const fatalErrors = (scan: ScanResult) =>
  fatalProblems(scan).map(
    (key) => `${scan[key].count} ${key} row(s), e.g. ${scan[key].examples.slice(0, 3).join(' | ')}`
  );

export const partitionSymbol = async (symbol: string, options: PartitionOptions = {}): Promise<SymbolReport> => {
  const { dataDir = 'data', replace = false, keepSource = false, log = () => {} } = options;
  const source = path.join(dataDir, `${symbol}.csv`);
  const destinations = destinationsOf(symbol, dataDir);
  const report: SymbolReport = {
    symbol,
    mode: 'partition',
    status: 'ok',
    source,
    files: {},
    proof: [],
    destinations: {},
    errors: []
  };
  const temporary = path.join(dataDir, symbol, `.partition-tmp-${process.pid}-${Date.now()}`);
  const temporaryFiles = Object.fromEntries(
    datasetPartitions.map((partition) => [partition, path.join(temporary, `${partition}.csv`)])
  ) as Record<DatasetPartition, string>;

  try {
    if (!(await fs.pathExists(source))) {
      report.errors.push(`${source} does not exist`);
      failIf(report);
    }

    const sourceHash = await sha256File(source);

    report.sourceSha256 = sourceHash.sha256;
    await fs.mkdirp(temporary);

    const writers = Object.fromEntries(
      datasetPartitions.map((partition) => [partition, new LineWriter(temporaryFiles[partition])])
    ) as Record<DatasetPartition, LineWriter>;

    log(`${symbol}: scanning ${source}`);

    let scan: ScanResult;

    try {
      scan = await scanMinuteFile(source, async (partition, line) => {
        await writers[partition].write(line);
        await writers.all.write(line);
      });
    } finally {
      await Promise.all(Object.values(writers).map((writer) => writer.close()));
    }

    report.scan = withoutFile(scan);
    report.header = scan.header;
    report.errors.push(...fatalErrors(scan));

    if (scan.dataRows === 0) {
      report.errors.push('no data rows');
    }

    failIf(report);

    log(`${symbol}: checking the written files`);

    const checked = await checkPartitionFiles(temporaryFiles, scan, symbol);

    report.files = checked.checks;
    report.proof = checked.proof;
    report.errors.push(...checked.errors);

    // Without a header and with a final newline, the source is exactly the data rows, so `all` must equal it.
    if (!scan.header && scan.endsWithNewline) {
      if (sourceHash.sha256 !== checked.checks.all.sha256) {
        report.errors.push('all differs from the source file');
      } else {
        report.proof.push(
          `sha256(${source})${' '.repeat(Math.max(1, 23 - source.length))}= ${sourceHash.sha256} (all is the source, byte for byte)`
        );
      }
    }

    failIf(report);

    // Existing destinations: identical ones are left alone, different ones are only replaced with --replace.
    for (const partition of datasetPartitions) {
      const destination = destinations[partition];

      if (await fs.pathExists(destination)) {
        const existing = await sha256File(destination);

        if (existing.sha256 === checked.checks[partition].sha256) {
          report.destinations[partition] = 'unchanged';
        } else if (replace) {
          report.destinations[partition] = 'replaced';
        } else {
          report.errors.push(`${destination} exists with different content (pass --replace to replace it)`);
        }
      } else {
        report.destinations[partition] = 'created';
      }
    }

    failIf(report);

    for (const partition of datasetPartitions) {
      if (report.destinations[partition] !== 'unchanged') {
        await fs.mkdirp(path.dirname(destinations[partition]));
        await fs.rename(temporaryFiles[partition], destinations[partition]);
      }

      report.files[partition]!.file = destinations[partition];
    }

    // The moved files once more, before the source goes.
    for (const partition of datasetPartitions) {
      if ((await sha256File(destinations[partition])).sha256 !== checked.checks[partition].sha256) {
        report.errors.push(`${destinations[partition]} changed while it was moved into place`);
      }
    }

    failIf(report);
    await fs.writeJson(path.join(dataDir, symbol, 'partition-report.json'), report, { spaces: 1 });

    if (!keepSource) {
      await fs.remove(source);
      report.sourceRemoved = true;
    }

    return report;
  } catch (error) {
    report.status = 'failed';

    if (!(error instanceof PartitionError)) {
      report.errors.push((error as Error).message);
    }

    return report;
  } finally {
    await fs.remove(temporary);
  }
};

// Re-checks partition files already in place, from `all`: every row of `all` is scanned and assigned to its
// partition again, and the partition files must hold exactly those rows.
export const verifySymbol = async (symbol: string, options: PartitionOptions = {}): Promise<SymbolReport> => {
  const { dataDir = 'data', log = () => {} } = options;
  const files = destinationsOf(symbol, dataDir);
  const report: SymbolReport = {
    symbol,
    mode: 'verify',
    status: 'ok',
    files: {},
    proof: [],
    destinations: {},
    errors: []
  };

  try {
    for (const partition of datasetPartitions) {
      if (!(await fs.pathExists(files[partition]))) {
        report.errors.push(`${files[partition]} does not exist`);
      }
    }

    failIf(report);
    log(`${symbol}: scanning ${files.all}`);

    const scan = await scanMinuteFile(files.all);

    report.scan = withoutFile(scan);
    report.errors.push(...fatalErrors(scan));

    if (scan.header) {
      report.errors.push(`${files.all} has a header row`);
    }

    if (!scan.endsWithNewline) {
      report.errors.push(`${files.all} does not end with a newline`);
    }

    const checked = await checkPartitionFiles(files, scan, symbol);

    report.files = checked.checks;
    report.proof = checked.proof;
    report.errors.push(...checked.errors);
    failIf(report);
    return report;
  } catch (error) {
    report.status = 'failed';

    if (!(error instanceof PartitionError)) {
      report.errors.push((error as Error).message);
    }

    return report;
  }
};

// Symbols with a complete or partial partition directory.
export const partitionedSymbols = async (dataDir = 'data') => {
  const entries = await fs.readdir(dataDir, { withFileTypes: true });
  const symbols: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && /^[A-Z0-9][A-Z0-9.-]*$/.test(entry.name)) {
      const exists = await Promise.all(
        Object.values(destinationsOf(entry.name, dataDir)).map((file) => fs.pathExists(file))
      );

      if (exists.some(Boolean)) {
        symbols.push(entry.name);
      }
    }
  }

  return symbols.sort();
};

export const reportLines = (report: SymbolReport): string[] => {
  const lines = [`## ${report.symbol} (${report.mode}): ${report.status.toUpperCase()}`];
  const scan = report.scan;

  if (report.source) {
    lines.push(
      `source ${report.source}${report.sourceSha256 ? ` sha256 ${report.sourceSha256}` : ''}${report.sourceRemoved ? ' (removed after validation)' : ''}`
    );
  }

  if (report.header) {
    lines.push(`header row omitted: ${report.header}`);
  }

  for (const partition of datasetPartitions) {
    const check = report.files[partition];

    if (check) {
      lines.push(
        `${partition.padEnd(8)} ${String(check.rows).padStart(9)} rows  ${check.firstTimestamp ?? '-'} → ${check.lastTimestamp ?? '-'}  (trading dates ${check.firstDate ?? '-'} → ${check.lastDate ?? '-'})${report.destinations[partition] ? `  ${report.destinations[partition]}` : ''}`
      );
    }
  }

  lines.push(...report.proof.map((line) => `proof: ${line}`));

  if (scan) {
    const { audit } = scan;

    lines.push(
      `ordering: ${scan.outOfOrder.count} out of order, ${scan.duplicates.count} duplicate timestamps, ${scan.malformed.count} malformed, ${scan.outOfRange.count} outside the partitions`,
      `sessions: ${audit.sessionsWithRegularBars} with regular-session bars of ${audit.expectedSessions} expected NYSE sessions ${audit.firstDate} → ${audit.lastDate}; missing ${audit.missingSessions.length}${audit.missingSessions.length ? ` (${audit.missingSessions.slice(0, 12).join(', ')}${audit.missingSessions.length > 12 ? ', …' : ''})` : ''}`,
      `closed days with regular-session bars: ${audit.sessionsOnClosedDays.length ? audit.sessionsOnClosedDays.join(', ') : 'none'}; early closes with bars after 13:00: ${audit.earlyCloseLateBars.length ? audit.earlyCloseLateBars.map(({ date, bars }) => `${date} (${bars})`).join(', ') : 'none'}`,
      `intraday: median regular-minute coverage ${(audit.coverage.median * 100).toFixed(1)}%, ${audit.coverage.below90} sessions below 90%, ${audit.coverage.below50} below 50%; ${audit.extendedHoursBars} extended-hours bars`,
      `largest intraday gaps (ET): ${audit.largestGaps.map((gap) => `${gap.date} ${gap.from}→${gap.to} (${gap.minutes} min)`).join(', ') || 'none'}`,
      `anomalies reported only: ${scan.unalignedSeconds.count} timestamps off the minute, ${scan.inconsistentPrices.count} rows with inconsistent OHLC/volume${scan.inconsistentPrices.count ? ` (e.g. ${scan.inconsistentPrices.examples.slice(0, 2).join(' | ')})` : ''}`
    );
  }

  lines.push(...report.errors.map((error) => `ERROR: ${error}`));
  return lines;
};
