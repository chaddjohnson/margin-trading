// Reproducible Stooq daily-data preparation: acquire, keep the raw bytes, transform, write atomically,
// re-read with the optimizer's loader, and record provenance in a per-symbol manifest.
//
// Sources, in order of preference (each attempt is recorded):
// 1. stooq-http: the historical-data page and its "Download data in csv file..." link (skipped offline).
// 2. stooq-manual-download: a CSV the user saved from that page's link in a browser, placed in
//    data/stooq/inbox/ (for example vgt_us_d.csv, Stooq's default download name).
// 3. stooq-bulk-archive: the symbol's file in a Stooq bulk daily archive (d_us_txt.zip) on disk.
// All three are Stooq data. No other provider is used, and nothing is synthesized.
//
// Modes: 'missing' (default) reuses a valid cached entry and acquires only what's missing or invalid;
// 'refresh' re-acquires every selected symbol; 'offline' never touches the network; 'regenerate' rebuilds
// processed files from the saved raw files only.
import { loadCsvBacktestData } from '#lib';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { type HttpAttempt, type HttpOptions, downloadStooqDaily, historicalPageUrl, stooqSymbol } from './stooq.ts';
import {
  type TransformResult,
  parseProcessedLines,
  transformStooqBulkTxt,
  transformStooqPageCsv,
  transformVersion
} from './transform.ts';
import { extractZipEntry, readZipDirectory } from './zip.ts';

export const stooqDataDir = 'data/stooq';

// Every location derives from one data directory, so tests can use a temporary one.
export const dataPaths = (dataDir = stooqDataDir) => ({
  dataDir,
  manifest: `${dataDir}/manifest.json`,
  inbox: `${dataDir}/inbox`,
  processed: (symbol: string) => `${dataDir}/processed/${symbol}/${symbol}-stooq-daily.csv`,
  raw: (symbol: string, name: string) => `${dataDir}/raw/${symbol}/${name}`
});

export const manifestFile = dataPaths().manifest;
export const inboxDir = dataPaths().inbox;
export const defaultArchive = path.join(os.homedir(), 'development/personal/trading/data/d_us_txt.zip');

export type SourceKind = 'stooq-http' | 'stooq-manual-download' | 'stooq-bulk-archive';
export type PrepareMode = 'missing' | 'refresh' | 'offline' | 'regenerate';

export interface SourceAttempt {
  source: SourceKind;
  status: string;
  detail: string;
  at: string;
  http?: HttpAttempt[];
}

export interface FileRecord {
  path: string;
  sha256: string;
  bytes: number;
}

export interface ManifestEntry {
  symbol: string;
  stooqSymbol: string;
  status: 'ok' | 'failed';
  failureReason?: string;
  source?: SourceKind;
  sourceDescription?: string;
  pageUrl: string;
  resolvedCsvUrl?: string;
  retrievedAtUtc?: string;
  requestedStart: string;
  requestedEnd: string;
  archive?: { path: string; sha256: string; member: string; memberCrc32: string; memberModified: string };
  manualFile?: string;
  raw?: FileRecord & {
    layout: TransformResult['layout'];
    delimiter: string;
    header: string;
    lineEnding: string;
    rows: number;
  };
  processed?: FileRecord & { rows: number; firstDate: string; lastDate: string };
  transformVersion?: string;
  parity?: { checkedWith: string; rows: number; mismatches: number; detail: string };
  adjustment: string;
  warnings: string[];
  attempts: SourceAttempt[];
  preparedAtUtc?: string;
}

export interface Manifest {
  version: 1;
  transformVersion: string;
  generatedAtUtc: string;
  entries: Record<string, ManifestEntry>;
}

export const adjustmentAssumption =
  'Stooq back-adjusts its daily history for splits and, judging by the data, distributions; Stooq does not document the method. Treated as adjusted OHLC with split-adjusted volume, unverified (see DATA_AUDIT.md for the evidence checked).';

export const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

export const fileRecord = async (file: string): Promise<FileRecord> => {
  const data = await fs.readFile(file);

  return { path: file, sha256: sha256(data), bytes: data.length };
};

export const readManifest = async (file = dataPaths().manifest): Promise<Manifest> => {
  if (await fs.pathExists(file)) {
    return (await fs.readJson(file)) as Manifest;
  }

  return { version: 1, transformVersion, generatedAtUtc: new Date().toISOString(), entries: {} };
};

export const writeJsonAtomic = async (file: string, value: unknown) => {
  await fs.ensureDir(path.dirname(file));

  const temporary = `${file}.tmp-${process.pid}`;

  await fs.writeFile(temporary, `${JSON.stringify(value, null, 1)}\n`);
  await fs.rename(temporary, file);
};

export const writeTextAtomic = async (file: string, text: string) => {
  await fs.ensureDir(path.dirname(file));

  const temporary = `${file}.tmp-${process.pid}`;

  await fs.writeFile(temporary, text);
  await fs.rename(temporary, file);
};

// Raw files are immutable: named by content hash and never overwritten.
const saveRaw = async (dataDir: string, symbol: string, prefix: string, extension: string, data: Buffer) => {
  const hash = sha256(data);
  const file = dataPaths(dataDir).raw(symbol, `${prefix}-${hash.slice(0, 12)}.${extension}`);

  if (await fs.pathExists(file)) {
    const existing = await fileRecord(file);

    if (existing.sha256 !== hash) {
      throw new Error(`${file} exists with different content; raw files are never overwritten`);
    }
  } else {
    await fs.ensureDir(path.dirname(file));
    await fs.writeFile(file, data, { flag: 'wx' });
  }

  return { path: file, sha256: hash, bytes: data.length };
};

const transformRaw = (layout: TransformResult['layout'], text: string, symbol: string) =>
  layout === 'stooq-bulk-txt'
    ? transformStooqBulkTxt(text, stooqSymbol(symbol).toUpperCase())
    : transformStooqPageCsv(text);

// Parses the raw file independently of the transform, for the parity check.
const parseRawValues = (layout: TransformResult['layout'], text: string) => {
  const rows = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((row) => row !== '')
    .slice(1);

  return rows.map((row) => {
    if (layout === 'stooq-bulk-txt') {
      const fields = row.split(',');
      const date = fields[2]!;

      return {
        date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
        values: fields.slice(4, 9).map(Number)
      };
    }

    const fields = row.split(row.includes(';') ? ';' : ',');

    return { date: fields[0]!, values: fields.slice(1, 6).map(Number) };
  });
};

// Writes the processed file atomically, then re-reads it with loadCsvBacktestData, the loader the optimizer
// uses, and compares every session with the raw file's values.
export const writeAndVerifyProcessed = async (
  dataDir: string,
  symbol: string,
  layout: TransformResult['layout'],
  rawText: string,
  transformed: TransformResult
) => {
  const file = dataPaths(dataDir).processed(symbol);

  await writeTextAtomic(file, transformed.text);

  const ticks = await loadCsvBacktestData(symbol, file);
  const raw = parseRawValues(layout, rawText);
  const expected = parseProcessedLines(transformed.lines);
  let mismatches = 0;
  let detail = '';

  if (ticks.length !== raw.length || ticks.length !== expected.length) {
    mismatches++;
    detail = `row counts: loader ${ticks.length}, raw ${raw.length}, transformed ${expected.length}`;
  }

  for (let index = 0; index < Math.min(ticks.length, raw.length); index++) {
    const tick = ticks[index]!;
    const source = raw[index]!;
    const loaded = [tick.open, tick.high, tick.low, tick.close, tick.volume];
    const time = new Date(source.date).getTime() / 1000;

    if (tick.time !== time || loaded.some((value, column) => !Object.is(value, source.values[column]))) {
      mismatches++;
      detail ||= `first mismatch at ${source.date}`;
    }

    if (index > 0 && tick.time <= ticks[index - 1]!.time) {
      mismatches++;
      detail ||= `dates not strictly ascending at ${source.date}`;
    }
  }

  const processed = await fileRecord(file);

  return {
    processed: {
      ...processed,
      rows: ticks.length,
      firstDate: expected[0]?.date ?? '',
      lastDate: expected.at(-1)?.date ?? ''
    },
    parity: {
      checkedWith: 'loadCsvBacktestData (src/lib/csv.ts)',
      rows: ticks.length,
      mismatches,
      detail: detail || 'every session matches the raw file exactly (date, open, high, low, close, volume)'
    }
  };
};

const findInboxFile = async (inboxDir: string, symbol: string) => {
  if (!(await fs.pathExists(inboxDir))) {
    return undefined;
  }

  const lower = symbol.toLowerCase();
  const names = new Set([`${lower}_us_d.csv`, `${lower}.us.csv`, `${lower}.csv`, `${lower}_us.csv`]);
  const match = (await fs.readdir(inboxDir)).filter((name) => names.has(name.toLowerCase())).sort();

  return match[0] ? path.join(inboxDir, match[0]) : undefined;
};

const archiveCache = new Map<string, { sha256: string; entries: Awaited<ReturnType<typeof readZipDirectory>> }>();

const openArchive = async (file: string) => {
  let cached = archiveCache.get(file);

  if (!cached) {
    const hash = createHash('sha256');

    for await (const chunk of fs.createReadStream(file)) {
      hash.update(chunk as Buffer);
    }

    cached = { sha256: hash.digest('hex'), entries: await readZipDirectory(file) };
    archiveCache.set(file, cached);
  }

  return cached;
};

const isEntryValid = async (entry: ManifestEntry | undefined) => {
  if (
    !entry ||
    entry.status !== 'ok' ||
    !entry.raw ||
    !entry.processed ||
    entry.transformVersion !== transformVersion
  ) {
    return false;
  }

  for (const record of [entry.raw, entry.processed]) {
    if (!(await fs.pathExists(record.path)) || (await fileRecord(record.path)).sha256 !== record.sha256) {
      return false;
    }
  }

  return true;
};

export interface PrepareOptions {
  dataDir?: string; // default data/stooq
  symbols: string[];
  startDate: string; // requested start, YYYY-MM-DD
  endDate: string; // requested end, YYYY-MM-DD
  mode: PrepareMode;
  archive?: string; // Stooq bulk archive; undefined disables that source
  http?: HttpOptions;
  requestSpacingMs?: number; // minimum time between HTTP symbol requests
  log?: (line: string) => void;
}

// Rebuilds the processed file from the saved raw file, without any network or archive access.
const regenerateEntry = async (
  dataDir: string,
  symbol: string,
  entry: ManifestEntry | undefined,
  log: (line: string) => void
) => {
  if (!entry?.raw) {
    log(`${symbol}: nothing to regenerate (no raw file recorded)`);

    return entry!;
  }

  const raw = await fileRecord(entry.raw.path);

  if (raw.sha256 !== entry.raw.sha256) {
    throw new Error(`${symbol}: raw file ${entry.raw.path} no longer matches its recorded hash`);
  }

  const rawText = await fs.readFile(entry.raw.path, 'utf8');
  const transformed = transformRaw(entry.raw.layout, rawText, symbol);
  const verified = await writeAndVerifyProcessed(dataDir, symbol, entry.raw.layout, rawText, transformed);
  const unchanged = entry.processed?.sha256 === verified.processed.sha256;

  log(
    `${symbol}: regenerated ${verified.processed.rows} sessions; processed file ${unchanged ? 'identical' : 'CHANGED'}`
  );

  return {
    ...entry,
    processed: verified.processed,
    parity: verified.parity,
    transformVersion,
    status: verified.parity.mismatches === 0 ? 'ok' : 'failed'
  } satisfies ManifestEntry;
};

export const prepareData = async (options: PrepareOptions): Promise<Manifest> => {
  const log = options.log ?? (() => {});
  const paths = dataPaths(options.dataDir);
  const manifest = await readManifest(paths.manifest);
  let lastRequest = 0;

  for (const symbol of options.symbols) {
    const previous = manifest.entries[symbol];

    if (options.mode === 'regenerate') {
      manifest.entries[symbol] = await regenerateEntry(paths.dataDir, symbol, previous, log);
      continue;
    }

    if (options.mode !== 'refresh' && (await isEntryValid(previous))) {
      log(
        `${symbol}: cached (${previous!.source}, ${previous!.processed!.firstDate}..${previous!.processed!.lastDate})`
      );
      continue;
    }

    const entry: ManifestEntry = {
      symbol,
      stooqSymbol: stooqSymbol(symbol),
      status: 'failed',
      pageUrl: historicalPageUrl(symbol, options.startDate, options.endDate),
      requestedStart: options.startDate,
      requestedEnd: options.endDate,
      adjustment: adjustmentAssumption,
      warnings: [],
      attempts: []
    };
    let rawText: string | undefined;
    let rawData: Buffer | undefined;
    let layout: TransformResult['layout'] = 'stooq-page-csv';

    // 1. HTTP.
    if (options.mode !== 'offline') {
      const wait = lastRequest + (options.requestSpacingMs ?? 1500) - Date.now();

      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }

      lastRequest = Date.now();

      const result = await downloadStooqDaily(symbol, options.startDate, options.endDate, options.http);

      entry.attempts.push({
        source: 'stooq-http',
        status: result.ok ? 'ok' : (result.failure ?? 'failed'),
        detail: result.ok ? `downloaded ${result.csvUrl}` : (result.attempts.at(-1)?.detail ?? 'failed'),
        at: new Date().toISOString(),
        http: result.attempts
      });

      if (result.ok) {
        try {
          transformStooqPageCsv(result.body!);
          rawText = result.body!;
          rawData = Buffer.from(rawText);
          entry.source = 'stooq-http';
          entry.sourceDescription = 'Stooq historical-data page, "Download data in csv file..." link';
          entry.resolvedCsvUrl = result.csvUrl;
          entry.retrievedAtUtc = result.attempts.at(-1)?.at;
        } catch (error) {
          entry.attempts.at(-1)!.status = 'invalid_csv';
          entry.attempts.at(-1)!.detail = (error as Error).message;
        }
      }
    } else {
      entry.attempts.push({
        source: 'stooq-http',
        status: 'skipped',
        detail: 'offline mode',
        at: new Date().toISOString()
      });
    }

    // 2. A browser download in the inbox.
    if (!rawText) {
      const file = await findInboxFile(paths.inbox, symbol);

      if (file) {
        const data = await fs.readFile(file);

        try {
          transformStooqPageCsv(data.toString('utf8'));
          rawData = data;
          rawText = data.toString('utf8');
          entry.source = 'stooq-manual-download';
          entry.sourceDescription = 'Stooq page CSV downloaded in a browser and placed in data/stooq/inbox';
          entry.manualFile = file;
          entry.retrievedAtUtc = (await fs.stat(file)).mtime.toISOString();
          entry.attempts.push({
            source: 'stooq-manual-download',
            status: 'ok',
            detail: file,
            at: new Date().toISOString()
          });
        } catch (error) {
          entry.attempts.push({
            source: 'stooq-manual-download',
            status: 'invalid_csv',
            detail: `${file}: ${(error as Error).message}`,
            at: new Date().toISOString()
          });
        }
      } else {
        entry.attempts.push({
          source: 'stooq-manual-download',
          status: 'absent',
          detail: `no ${symbol.toLowerCase()}_us_d.csv in ${paths.inbox}`,
          at: new Date().toISOString()
        });
      }
    }

    // 3. The bulk archive.
    if (!rawText && options.archive) {
      if (await fs.pathExists(options.archive)) {
        const archive = await openArchive(options.archive);
        const memberName = `/${stooqSymbol(symbol)}.txt`;
        const members = archive.entries.filter((member) => member.name.toLowerCase().endsWith(memberName));

        if (members.length === 1) {
          const member = members[0]!;
          const data = await extractZipEntry(options.archive, member);

          rawData = data;
          rawText = data.toString('utf8');
          layout = 'stooq-bulk-txt';
          entry.source = 'stooq-bulk-archive';
          entry.sourceDescription = 'Stooq bulk daily archive (d_us_txt), member file extracted unmodified';
          entry.retrievedAtUtc = (await fs.stat(options.archive)).mtime.toISOString();
          entry.archive = {
            path: options.archive,
            sha256: archive.sha256,
            member: member.name,
            memberCrc32: member.crc32.toString(16).padStart(8, '0'),
            memberModified: member.modified
          };
          entry.attempts.push({
            source: 'stooq-bulk-archive',
            status: 'ok',
            detail: `${member.name} in ${options.archive}`,
            at: new Date().toISOString()
          });
        } else {
          entry.attempts.push({
            source: 'stooq-bulk-archive',
            status: members.length === 0 ? 'absent' : 'ambiguous',
            detail: `${members.length} members named ${memberName}`,
            at: new Date().toISOString()
          });
        }
      } else {
        entry.attempts.push({
          source: 'stooq-bulk-archive',
          status: 'absent',
          detail: `archive ${options.archive} not found`,
          at: new Date().toISOString()
        });
      }
    }

    if (!rawText || !rawData) {
      entry.failureReason = entry.attempts
        .map((attempt) => `${attempt.source}: ${attempt.status} (${attempt.detail})`)
        .join('; ');
      manifest.entries[symbol] = previous?.status === 'ok' && (await isEntryValid(previous)) ? previous : entry;
      log(`${symbol}: FAILED ${entry.failureReason}`);
      continue;
    }

    try {
      const transformed = transformRaw(layout, rawText, symbol);
      const prefix = entry.source === 'stooq-bulk-archive' ? 'bulk' : entry.source === 'stooq-http' ? 'http' : 'manual';
      const raw = await saveRaw(paths.dataDir, symbol, prefix, layout === 'stooq-bulk-txt' ? 'txt' : 'csv', rawData);
      const verified = await writeAndVerifyProcessed(paths.dataDir, symbol, layout, rawText, transformed);

      entry.raw = {
        ...raw,
        layout,
        delimiter: transformed.delimiter,
        header: transformed.header,
        lineEnding: transformed.lineEnding,
        rows: transformed.sourceRows
      };
      entry.processed = verified.processed;
      entry.parity = verified.parity;
      entry.transformVersion = transformVersion;
      entry.preparedAtUtc = new Date().toISOString();
      entry.status = verified.parity.mismatches === 0 ? 'ok' : 'failed';
      entry.failureReason =
        verified.parity.mismatches === 0 ? undefined : `parity check failed: ${verified.parity.detail}`;
      entry.warnings.push(...transformed.warnings);

      if (entry.source === 'stooq-bulk-archive') {
        entry.warnings.push(
          `Bulk archive dated ${entry.archive?.memberModified.slice(0, 10)}: history ends at ${verified.processed.lastDate}, before the requested end ${options.endDate}.`
        );
      }

      log(
        `${symbol}: ${entry.status} from ${entry.source}, ${verified.processed.rows} sessions ${verified.processed.firstDate}..${verified.processed.lastDate}`
      );
    } catch (error) {
      entry.status = 'failed';
      entry.failureReason = `transform: ${(error as Error).message}`;
      log(`${symbol}: FAILED ${entry.failureReason}`);
    }

    manifest.entries[symbol] = entry;
  }

  manifest.generatedAtUtc = new Date().toISOString();
  manifest.transformVersion = transformVersion;
  await writeJsonAtomic(paths.manifest, manifest);

  return manifest;
};

// Checks every cached entry against its recorded hashes and re-runs the loader parity check.
export const validateCachedData = async (
  symbols: string[],
  log: (line: string) => void = () => {},
  dataDir?: string
) => {
  const manifest = await readManifest(dataPaths(dataDir).manifest);
  const results: { symbol: string; ok: boolean; detail: string }[] = [];

  for (const symbol of symbols) {
    const entry = manifest.entries[symbol];

    if (!(await isEntryValid(entry))) {
      results.push({
        symbol,
        ok: false,
        detail: entry ? `invalid or changed (${entry.status})` : 'not in the manifest'
      });
      continue;
    }

    const rawText = await fs.readFile(entry!.raw!.path, 'utf8');
    const transformed = transformRaw(entry!.raw!.layout, rawText, symbol);
    const processedText = await fs.readFile(entry!.processed!.path, 'utf8');
    const ok = processedText === transformed.text;

    results.push({
      symbol,
      ok,
      detail: ok ? 'hashes match; re-transform identical' : 'processed file differs from re-transform'
    });
  }

  for (const result of results) {
    log(`${result.symbol}: ${result.ok ? 'valid' : 'INVALID'} - ${result.detail}`);
  }

  return results;
};
