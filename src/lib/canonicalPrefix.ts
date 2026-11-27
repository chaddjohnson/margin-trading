// Byte-prefix pins of the canonical minute files (data/<SYMBOL>/data.csv), and their coverage.
//
// The canonical files only ever grow by appending rows after their last bar (`npm run datasets -- append`, which
// proves that every earlier byte is unchanged). So a historical input — the file as a study read it, or every row
// through a cutoff — is exactly a byte prefix of today's file, identified by its length and sha256: a BytePin. A loader
// given a pin verifies those bytes and reads nothing after them (src/lib/csv.ts maxBytes, src/lib/evaluation.ts pin), so
// a door is a verified prefix of the one canonical file, never a copy, and appending data changes no pinned input, id or
// cache key. A whole-file sha256 pin of an earlier file is the same pin with the file's earlier length
// (config/market-data/vintages.json records each symbol's verified vintages).
//
// Coverage: the latest COMPLETE session of a file is the latest New York date whose regular session the file holds to
// its close (a bar at or after 4:00 p.m., or 1:00 p.m. on an early-close day, or any bar of a later date), so a session
// appended only in part never counts; the common complete endpoint of several files is the earliest of theirs.
//
// Read-only: files are hashed and scanned; nothing is written.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { nyseCalendarCoverage, nyseEarlyCloses } from './calendar.ts';
import { newYorkOffset } from './session.ts';

export interface BytePin {
  bytes: number; // the prefix's length
  sha256: string; // the sha256 of those bytes
}

export interface PrefixFacts extends BytePin {
  rows: number;
  firstRowUtc: string | null;
  lastRowUtc: string | null;
  lastDate: string | null; // the New York date of the last row
  nextRowUtc: string | null; // the first row after the prefix, if any
  fileBytes: number;
}

const chunkSize = 1 << 20;
const hex64 = /^[0-9a-f]{64}$/;

const rowUtc = (line: string) => line.slice(0, line.indexOf(',')).replaceAll('"', '');
const rowSeconds = (line: string) => Date.parse(rowUtc(line)) / 1000;

// The New York date and minute of the day of a Unix time.
export const newYorkDateMinute = (seconds: number) => {
  const local = seconds + newYorkOffset(seconds);

  return {
    date: new Date(local * 1000).toISOString().slice(0, 10),
    minute: (((local % 86400) + 86400) % 86400) / 60
  };
};

const openMinute = 9 * 60 + 30;
const closeMinuteOf = (date: string) => (nyseEarlyCloses.has(date) ? 13 * 60 : 16 * 60);

export const assertBytePin = (pin: BytePin, what = 'pin') => {
  if (!Number.isSafeInteger(pin?.bytes) || pin.bytes < 1 || !hex64.test(pin?.sha256 ?? ''))
    throw new Error(`${what} must be { bytes: a positive integer, sha256: 64 hex }, not ${JSON.stringify(pin)}`);
};

// The sha256 of the first `bytes` bytes of a file.
export const sha256Prefix = (file: string, bytes: number) => {
  const hash = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(chunkSize);
  let position = 0;

  try {
    while (position < bytes) {
      const n = fs.readSync(fd, buffer, 0, Math.min(chunkSize, bytes - position), position);

      if (n === 0) throw new Error(`${file} has ${position} bytes, fewer than ${bytes}`);
      hash.update(buffer.subarray(0, n));
      position += n;
    }
  } finally {
    fs.closeSync(fd);
  }

  return hash.digest('hex');
};

const byteAt = (fd: number, position: number) => {
  const b = Buffer.alloc(1);

  return fs.readSync(fd, b, 0, 1, position) === 1 ? b[0]! : undefined;
};

// The first line starting at `position` (without its newline), or null at the end of the file.
const lineAt = (fd: number, position: number) => {
  const buffer = Buffer.alloc(256);
  const n = fs.readSync(fd, buffer, 0, buffer.length, position);

  if (n === 0) return null;

  const text = buffer.subarray(0, n).toString('utf8');
  const end = text.indexOf('\n');

  return end < 0 ? text : text.slice(0, end);
};

// Verifies that `file` begins with exactly the pinned bytes, ending at a row boundary, and returns what follows them.
// Throws (naming the file) otherwise: a shorter file, a changed byte anywhere in the prefix, or a cut inside a row.
export const verifyBytePin = (file: string, pin: BytePin, what = file) => {
  assertBytePin(pin, `${what}: the pin`);

  const fileBytes = fs.statSync(file).size;

  if (fileBytes < pin.bytes)
    throw new Error(`${what}: ${fileBytes} bytes, fewer than the pinned prefix of ${pin.bytes}`);

  const fd = fs.openSync(file, 'r');

  try {
    if (byteAt(fd, pin.bytes - 1) !== 0x0a)
      throw new Error(`${what}: the pinned prefix of ${pin.bytes} bytes does not end at a row boundary`);

    const sha256 = sha256Prefix(file, pin.bytes);

    if (sha256 !== pin.sha256)
      throw new Error(
        `${what}: its first ${pin.bytes} bytes hash to ${sha256.slice(0, 16)}…, not the pinned ${pin.sha256.slice(0, 16)}… (the historical rows changed)`
      );

    const next = lineAt(fd, pin.bytes);

    return { fileBytes, laterBytes: fileBytes - pin.bytes, nextRowUtc: next ? rowUtc(next) : null };
  } finally {
    fs.closeSync(fd);
  }
};

// Streams the rows of a file from its start while `keep(line, seconds)` holds; returns the facts of that prefix. The
// first refused row stops the scan: its bytes are not hashed and it is reported only by its timestamp.
const scanPrefix = (file: string, keep: (seconds: number) => boolean): PrefixFacts => {
  const fileBytes = fs.statSync(file).size;
  const hash = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(chunkSize);
  let carry = Buffer.alloc(0);
  let position = 0;
  let bytes = 0;
  let rows = 0;
  let first: string | null = null;
  let last: string | null = null;
  let next: string | null = null;

  try {
    scan: for (;;) {
      const n = fs.readSync(fd, buffer, 0, chunkSize, position);

      if (n === 0) break;
      position += n;

      const data = carry.length ? Buffer.concat([carry, buffer.subarray(0, n)]) : buffer.subarray(0, n);
      let start = 0;

      for (let i = data.indexOf(0x0a); i >= 0; i = data.indexOf(0x0a, start)) {
        const line = data.subarray(start, i).toString('utf8');

        if (line.trim() !== '') {
          if (!keep(rowSeconds(line))) {
            next = rowUtc(line);
            break scan;
          }

          first ??= rowUtc(line);
          last = rowUtc(line);
          rows++;
        }

        hash.update(data.subarray(start, i + 1));
        bytes += i + 1 - start;
        start = i + 1;
      }

      carry = Buffer.from(data.subarray(start));
    }

    if (next === null && carry.length > 0) throw new Error(`${file}: the last row has no trailing newline`);
  } finally {
    fs.closeSync(fd);
  }

  return {
    bytes,
    sha256: hash.digest('hex'),
    rows,
    firstRowUtc: first,
    lastRowUtc: last,
    lastDate: last === null ? null : newYorkDateMinute(Date.parse(last) / 1000).date,
    nextRowUtc: next,
    fileBytes
  };
};

// The byte prefix holding every row whose New York date is ≤ lastDate (the data a stage that ends on lastDate may
// read), with its pin. Rows are in strictly ascending time order (src/lib/csv.ts), so it is one contiguous prefix.
export const prefixThroughDate = (file: string, lastDate: string): PrefixFacts =>
  scanPrefix(file, (seconds) => newYorkDateMinute(seconds).date <= lastDate);

// The facts of a whole file (the prefix that is all of it).
export const fileFacts = (file: string): PrefixFacts => scanPrefix(file, () => true);

export interface TailStatus {
  file: string;
  bytes: number;
  lastRowUtc: string;
  lastRowDate: string;
  latestCompleteSession: string | null;
  // the latest date with regular-session bars that the file does NOT yet hold to its close (a partial append), if any
  incomplete: { date: string; lastRowUtc: string } | null;
  beyondCalendar: boolean; // rows dated after the shared calendar's last date exist (they are never used)
}

// The latest complete session of one minute file, read backwards from its end.
export const tailStatus = (file: string): TailStatus => {
  const { size } = fs.statSync(file);
  const fd = fs.openSync(file, 'r');
  let position = size;
  let carry = '';
  let lastBar: number | undefined;
  let latest: string | null = null;
  let incomplete: TailStatus['incomplete'] = null;
  let beyondCalendar = false;

  try {
    scan: while (position > 0) {
      const length = Math.min(chunkSize, position);
      const buffer = Buffer.alloc(length);

      position -= length;
      fs.readSync(fd, buffer, 0, length, position);

      const lines = (buffer.toString('utf8') + carry).split('\n');

      carry = position > 0 ? lines.shift()! : '';

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]!.trim();

        if (!line) continue;

        const time = rowSeconds(line);

        if (!Number.isFinite(time)) throw new Error(`${file}: unreadable row "${line.slice(0, 40)}"`);
        lastBar ??= time;

        const { date, minute } = newYorkDateMinute(time);

        if (date > nyseCalendarCoverage.last) {
          beyondCalendar = true;
          continue;
        }
        // only a regular-session bar opens a session (as in groupMarketSessions)
        if (minute < openMinute || minute >= closeMinuteOf(date)) continue;

        const closeTime = Date.parse(`${date}T00:00:00Z`) / 1000 + closeMinuteOf(date) * 60 - newYorkOffset(time);

        if (lastBar >= closeTime) {
          latest = date;
          break scan;
        }

        incomplete ??= { date, lastRowUtc: new Date(lastBar * 1000).toISOString() };
      }
    }
  } finally {
    fs.closeSync(fd);
  }

  if (lastBar === undefined) throw new Error(`${file} holds no rows`);

  return {
    file,
    bytes: size,
    lastRowUtc: new Date(lastBar * 1000).toISOString(),
    lastRowDate: newYorkDateMinute(lastBar).date,
    latestCompleteSession: latest,
    incomplete,
    beyondCalendar
  };
};

// The latest session every given symbol's canonical file holds completely, and which files limit it.
export const commonCompleteEndpoint = (symbols: readonly string[], root = 'data') => {
  if (symbols.length === 0) throw new Error('commonCompleteEndpoint needs at least one symbol');

  const files = symbols.map((symbol) => ({ symbol, ...tailStatus(path.join(root, symbol, 'data.csv')) }));
  const none = files.filter((f) => f.latestCompleteSession === null);

  if (none.length) throw new Error(`no complete session in ${none.map((f) => f.file).join(', ')}`);

  const endpoint = files.map((f) => f.latestCompleteSession!).sort()[0]!;

  return { endpoint, limitedBy: files.filter((f) => f.latestCompleteSession === endpoint).map((f) => f.symbol), files };
};

// ----- the vintage registry: each symbol's verified earlier files, as byte prefixes of today's file -----

export const vintagesFile = path.join(import.meta.dirname, '..', '..', 'config', 'market-data', 'vintages.json');

export interface Vintage extends BytePin {
  rows: number;
  lastRowUtc: string;
  latestCompleteSession: string;
  recorded: string; // when and how the vintage was recorded or verified
}

export interface VintageRegistry {
  kind: 'canonical data vintages';
  schema: 1;
  description: string;
  symbols: Record<string, Vintage[]>; // oldest first; each one a byte prefix of the next and of today's file
}

export const readVintages = (file = vintagesFile): VintageRegistry => {
  const v = JSON.parse(fs.readFileSync(file, 'utf8')) as VintageRegistry;

  if (v.kind !== 'canonical data vintages' || v.schema !== 1 || typeof v.symbols !== 'object')
    throw new Error(`${file} is not a canonical data vintage registry (schema 1)`);
  for (const [symbol, list] of Object.entries(v.symbols))
    list.forEach((x, i) => {
      assertBytePin(x, `${file}: ${symbol} vintage ${i}`);
      if (i > 0 && !(x.bytes > list[i - 1]!.bytes)) throw new Error(`${file}: ${symbol} vintages must grow`);
    });
  return v;
};

// A recorded vintage of a symbol by its whole-file sha256 (for example a study's pin), or undefined.
export const vintageOf = (symbol: string, sha256: string, registry = readVintages()) =>
  registry.symbols[symbol]?.find((x) => x.sha256 === sha256);

// The pin of a historical input captured as a whole-file sha256: the whole file while it is unchanged, else the
// recorded vintage with that sha256 when today's file still begins with it (verified); undefined when the file no
// longer holds that input. Golden masters and replays use it to keep running on exactly the captured bytes after an
// append, instead of skipping (standard 4.0.0 §1.14).
export const historicalPin = (
  file: string,
  symbol: string,
  sha256: string,
  registry?: VintageRegistry
): BytePin | undefined => {
  const bytes = fs.statSync(file).size;

  if (sha256Prefix(file, bytes) === sha256) return { bytes, sha256 };

  const v = vintageOf(symbol, sha256, registry ?? readVintages());

  if (!v) return undefined;
  try {
    verifyBytePin(file, v);
    return { bytes: v.bytes, sha256: v.sha256 };
  } catch {
    return undefined;
  }
};
