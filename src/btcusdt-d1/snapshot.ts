// The study's data snapshot and its canonical series (DATA_AUDIT.md §5). Two deterministic rules, both from data
// quality and the file's own timestamps only:
// - snapshot end: 00:00 UTC after the last complete UTC day of the raw file (its last minute's day is partial);
// - history start: 00:00 UTC of the first day after the last row whose open time is not on a minute boundary (the
//   irregular December 2017 and February 2018 segments, see the audit), so every canonical bar is a regular minute.
// The canonical series keeps the rows in [history start, snapshot end) that have at least one trade. Rows with no
// trade are flat at the previous close with zero volume (the audit checks all 24,025): they carry no trade price, so
// they are left out rather than used as fills. Missing minutes stay missing; nothing is filled in or repaired.
// The series is staged as a binary file inside the research namespace (git-ignored) and verified by its sha256.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { secondsPerDay, secondsPerMinute, study } from './context.ts';
import { type RawFile, parseRawFile, prefixSha256 } from './raw.ts';

export const snapshotVersion = 'btcusdt-d1-snapshot-v1';

export const seriesColumns = ['time', 'open', 'high', 'low', 'close', 'volume', 'quoteVolume', 'trades'] as const;

export type SeriesColumn = (typeof seriesColumns)[number];

export interface SnapshotDefinition {
  version: string;
  rawFile: string;
  rawBytesAtSnapshot: number; // the whole file when the snapshot was taken
  rawSha256AtSnapshot: string;
  snapshotEnd: number; // UNIX seconds, exclusive
  snapshotPrefixBytes: number; // bytes of the raw lines with time < snapshotEnd
  snapshotPrefixSha256: string;
  lastIrregularRowTime: number;
  historyStart: number; // UNIX seconds, inclusive (00:00 UTC)
  rawRowsInHistory: number;
  zeroTradeRowsDropped: number;
  rows: number; // canonical bars
  seriesSha256: string; // of the binary columns, in seriesColumns order, little-endian float64
}

export interface Series {
  rows: number;
  time: Float64Array;
  open: Float64Array;
  high: Float64Array;
  low: Float64Array;
  close: Float64Array;
  volume: Float64Array;
  quoteVolume: Float64Array;
  trades: Float64Array;
  buffer: SharedArrayBuffer;
}

const seriesFile = () => path.join(study.cacheDir, `${snapshotVersion}.bin`);
const definitionFile = () => path.join(study.cacheDir, `${snapshotVersion}.json`);

export const seriesOfBuffer = (buffer: SharedArrayBuffer, rows: number): Series => {
  const column = (index: number) => new Float64Array(buffer, index * rows * 8, rows);

  return {
    rows,
    time: column(0),
    open: column(1),
    high: column(2),
    low: column(3),
    close: column(4),
    volume: column(5),
    quoteVolume: column(6),
    trades: column(7),
    buffer
  };
};

// The first `rows` bars as views over the same memory: what a run limited to data before a cutoff may see.
export const sliceSeries = (series: Series, rows: number): Series => ({
  rows,
  time: series.time.subarray(0, rows),
  open: series.open.subarray(0, rows),
  high: series.high.subarray(0, rows),
  low: series.low.subarray(0, rows),
  close: series.close.subarray(0, rows),
  volume: series.volume.subarray(0, rows),
  quoteVolume: series.quoteVolume.subarray(0, rows),
  trades: series.trades.subarray(0, rows),
  buffer: series.buffer
});

// An independent copy (its own buffer).
export const copySeries = (series: Series): Series => {
  const copy = seriesOfBuffer(new SharedArrayBuffer(series.rows * 8 * seriesColumns.length), series.rows);

  for (const name of seriesColumns) {
    copy[name].set(series[name]);
  }

  return copy;
};

const sha256Of = (buffer: SharedArrayBuffer) => createHash('sha256').update(new Uint8Array(buffer)).digest('hex');

// Applies the two rules to a parsed raw file.
export const defineSnapshot = (raw: RawFile) => {
  const { time, trades } = raw.columns;
  const last = time[raw.rows - 1]!;
  // The last row's day is complete only if that row is its 23:59 minute; otherwise the snapshot ends at its start.
  const snapshotEnd = Math.floor((last + secondsPerMinute) / secondsPerDay) * secondsPerDay;
  let lastIrregularRowTime = -Infinity;
  let endRow = 0;

  // Both rules read only rows before the snapshot end.
  for (let i = 0; i < raw.rows && time[i]! < snapshotEnd; i++) {
    endRow = i + 1;

    if (time[i]! % secondsPerMinute !== 0) {
      lastIrregularRowTime = time[i]!;
    }
  }

  for (let i = 1; i < raw.rows; i++) {
    if (!(time[i]! > time[i - 1]!)) {
      throw new Error(`raw row ${i + 1} is not after the previous row: the snapshot needs strictly increasing times`);
    }
  }

  const historyStart = (Math.floor(lastIrregularRowTime / secondsPerDay) + 1) * secondsPerDay;
  const keep: number[] = [];
  let rawRowsInHistory = 0;
  let zeroTradeRowsDropped = 0;

  for (let i = 0; i < endRow; i++) {
    if (time[i]! < historyStart) {
      continue;
    }

    rawRowsInHistory++;

    if (trades[i]! > 0) {
      keep.push(i);
    } else {
      zeroTradeRowsDropped++;
    }
  }

  const rows = keep.length;
  const buffer = new SharedArrayBuffer(rows * 8 * seriesColumns.length);
  const series = seriesOfBuffer(buffer, rows);
  const source: Record<SeriesColumn, Float64Array> = {
    time: raw.columns.time,
    open: raw.columns.open,
    high: raw.columns.high,
    low: raw.columns.low,
    close: raw.columns.close,
    volume: raw.columns.volume,
    quoteVolume: raw.columns.quoteVolume,
    trades: raw.columns.trades
  };

  for (const name of seriesColumns) {
    const target = series[name];
    const from = source[name];

    keep.forEach((rawIndex, index) => {
      target[index] = from[rawIndex]!;
    });
  }

  const definition: SnapshotDefinition = {
    version: snapshotVersion,
    rawFile: raw.file,
    rawBytesAtSnapshot: raw.bytes,
    rawSha256AtSnapshot: raw.sha256,
    snapshotEnd,
    snapshotPrefixBytes: raw.lineStarts[endRow]!,
    snapshotPrefixSha256: '',
    lastIrregularRowTime,
    historyStart,
    rawRowsInHistory,
    zeroTradeRowsDropped,
    rows,
    seriesSha256: sha256Of(buffer)
  };

  definition.snapshotPrefixSha256 = prefixSha256(raw.file, definition.snapshotPrefixBytes);

  return { definition, series };
};

// Fails closed unless every bar is a regular minute after the previous one with low <= min(open, close) <= max(open,
// close) <= high and positive prices: the fast replay's day-level skips rely on it (ENGINE_PARITY_AND_TESTS.md §1).
export const assertValidSeries = (series: Series) => {
  for (let i = 0; i < series.rows; i++) {
    const o = series.open[i]!;
    const h = series.high[i]!;
    const l = series.low[i]!;
    const c = series.close[i]!;
    const t = series.time[i]!;

    if (
      !(l > 0 && l <= Math.min(o, c) && Math.max(o, c) <= h) ||
      t % secondsPerMinute !== 0 ||
      (i > 0 && !(t > series.time[i - 1]!)) ||
      !(series.trades[i]! > 0)
    ) {
      throw new Error(`canonical bar ${i} (${new Date(t * 1000).toISOString()}) is not a valid traded minute`);
    }
  }
};

// Builds the canonical series from the raw file and stages it in the cache. Never touches the raw file. With a pinned
// definition (the sealed audit's) only the snapshot's prefix bytes are read, they must hash to the pinned prefix, and
// the series must reproduce the pinned series hash; so later appended rows can never change the study's data.
export const buildSnapshot = (pinned?: SnapshotDefinition) => {
  if (pinned && prefixSha256(pinned.rawFile, pinned.snapshotPrefixBytes) !== pinned.snapshotPrefixSha256) {
    throw new Error(
      `${pinned.rawFile}: the first ${pinned.snapshotPrefixBytes} bytes no longer match the sealed snapshot`
    );
  }

  const raw = parseRawFile(pinned?.rawFile ?? study.rawFile, pinned?.snapshotPrefixBytes);
  const { definition: derived, series } = defineSnapshot(raw);
  const definition: SnapshotDefinition = pinned
    ? { ...derived, rawBytesAtSnapshot: pinned.rawBytesAtSnapshot, rawSha256AtSnapshot: pinned.rawSha256AtSnapshot }
    : derived;

  if (pinned && JSON.stringify(definition) !== JSON.stringify(pinned)) {
    throw new Error('The rebuilt snapshot differs from the sealed definition');
  }

  assertValidSeries(series);
  fs.mkdirSync(study.cacheDir, { recursive: true });
  fs.writeFileSync(seriesFile(), new Uint8Array(series.buffer));
  fs.writeFileSync(definitionFile(), `${JSON.stringify(definition, null, 2)}\n`);

  return { definition, series, raw };
};

// Loads the staged series and checks it against the expected definition (the frozen protocol's, once frozen): the
// series hash always, and the raw file's snapshot prefix when `checkRaw` is set.
export const loadSnapshot = (expected?: Pick<SnapshotDefinition, 'seriesSha256' | 'rows'>, checkRaw = false) => {
  if (!fs.existsSync(seriesFile()) || !fs.existsSync(definitionFile())) {
    throw new Error(`The canonical series is not staged: run \`npm run btc-d1 -- snapshot\` (${seriesFile()})`);
  }

  const definition = JSON.parse(fs.readFileSync(definitionFile(), 'utf8')) as SnapshotDefinition;
  const bytes = fs.readFileSync(seriesFile());
  const buffer = new SharedArrayBuffer(bytes.length);

  new Uint8Array(buffer).set(bytes);

  const sha = sha256Of(buffer);

  if (sha !== definition.seriesSha256 || (expected && sha !== expected.seriesSha256)) {
    throw new Error(
      `The staged series ${seriesFile()} has sha256 ${sha}, expected ${expected?.seriesSha256 ?? definition.seriesSha256}`
    );
  }

  if (bytes.length !== definition.rows * 8 * seriesColumns.length || (expected && expected.rows !== definition.rows)) {
    throw new Error(`The staged series ${seriesFile()} has the wrong length`);
  }

  const series = seriesOfBuffer(buffer, definition.rows);

  assertValidSeries(series);

  if (checkRaw) {
    const prefix = prefixSha256(definition.rawFile, definition.snapshotPrefixBytes);

    if (prefix !== definition.snapshotPrefixSha256) {
      throw new Error(`${definition.rawFile}: the snapshot's first ${definition.snapshotPrefixBytes} bytes changed`);
    }
  }

  return { definition, series };
};
