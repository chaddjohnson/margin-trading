// The raw BTCUSDT minute file, parsed byte by byte without changing it. The file has no header and ten '|'-separated
// fields per line; their meaning is inferred and verified by the data audit (./audit.ts, DATA_AUDIT.md), not assumed:
//   0 open time (UNIX seconds, UTC, start of the minute)   5 base volume (BTC)
//   1 open (USDT per BTC)                                   6 taker-buy quote volume (USDT)
//   2 high                                                  7 taker-buy base volume (BTC)
//   3 low                                                   8 quote volume (USDT)
//   4 close                                                 9 number of trades
// Decimal fields are converted exactly: an integer mantissa below 2^53 divided by an exact power of ten is the
// correctly rounded double, the same value Number() gives for the text; anything else falls back to Number().
import { createHash } from 'node:crypto';
import fs from 'node:fs';

export const rawColumns = [
  'time',
  'open',
  'high',
  'low',
  'close',
  'volume',
  'takerBuyQuoteVolume',
  'takerBuyVolume',
  'quoteVolume',
  'trades'
] as const;

export type RawColumn = (typeof rawColumns)[number];

export interface RawFile {
  file: string;
  bytes: number;
  sha256: string;
  rows: number;
  columns: Record<RawColumn, Float64Array>;
  // Byte offset of the start of each line, for the snapshot's prefix hash.
  lineStarts: Float64Array;
  malformed: { line: number; text: string }[];
  carriageReturns: number;
  maxFractionDigits: Record<RawColumn, number>;
}

const pow10 = Array.from({ length: 23 }, (_value, index) => 10 ** index);
const exactLimit = 2 ** 53;

// `maxBytes` parses only the file's first bytes (the snapshot prefix of a file that has grown since).
export const parseRawFile = (file: string, maxBytes?: number): RawFile => {
  const whole = fs.readFileSync(file);
  const buffer = maxBytes === undefined ? whole : whole.subarray(0, maxBytes);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  let lines = 0;

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 10) {
      lines++;
    }
  }

  if (buffer.length > 0 && buffer[buffer.length - 1] !== 10) {
    lines++;
  }

  const columns = Object.fromEntries(rawColumns.map((name) => [name, new Float64Array(lines)])) as Record<
    RawColumn,
    Float64Array
  >;
  const columnList = rawColumns.map((name) => columns[name]);
  const maxFractionDigits = Object.fromEntries(rawColumns.map((name) => [name, 0])) as Record<RawColumn, number>;
  const lineStarts = new Float64Array(lines + 1);
  const malformed: { line: number; text: string }[] = [];
  let carriageReturns = 0;
  let row = 0;
  let position = 0;

  while (position < buffer.length) {
    const lineStart = position;
    let field = 0;
    let ok = true;

    lineStarts[row] = lineStart;

    while (position < buffer.length && buffer[position] !== 10) {
      const fieldStart = position;
      let mantissa = 0;
      let fraction = -1;
      let digits = 0;
      let negative = false;
      let exact = true;
      let foreign = false; // a byte that is not a digit, '.', a leading '-' or '\r'

      while (position < buffer.length && buffer[position] !== 124 && buffer[position] !== 10) {
        const byte = buffer[position]!;

        if (byte >= 48 && byte <= 57) {
          mantissa = mantissa * 10 + (byte - 48);
          digits++;

          if (fraction >= 0) {
            fraction++;
          }

          if (mantissa >= exactLimit) {
            exact = false;
          }
        } else if (byte === 46 && fraction < 0) {
          fraction = 0;
        } else if (byte === 45 && position === fieldStart) {
          negative = true;
        } else if (byte === 13) {
          carriageReturns++;
        } else {
          exact = false;
          foreign = true;
        }

        position++;
      }

      let value: number;

      if (exact && digits > 0 && (fraction < 0 || fraction <= 22)) {
        value = fraction > 0 ? mantissa / pow10[fraction]! : mantissa;
        value = negative ? -value : value;
      } else {
        value = Number(buffer.toString('latin1', fieldStart, position).replace('\r', ''));
      }

      if (field < columnList.length) {
        columnList[field]![row] = value;

        const name = rawColumns[field]!;

        if (fraction > maxFractionDigits[name]) {
          maxFractionDigits[name] = fraction;
        }
      }

      // An empty field or a foreign byte (a space, a letter) makes the line malformed instead of a silent 0.
      if (!Number.isFinite(value) || digits === 0 || foreign) {
        ok = false;
      }

      field++;

      if (buffer[position] === 124) {
        position++;
      }
    }

    if (field !== rawColumns.length || !ok) {
      malformed.push({
        line: row + 1,
        text: buffer.toString('latin1', lineStart, Math.min(position, lineStart + 200))
      });
    }

    position++; // the newline
    row++;
  }

  lineStarts[row] = buffer.length;

  return {
    file,
    bytes: buffer.length,
    sha256,
    rows: row,
    columns,
    lineStarts,
    malformed,
    carriageReturns,
    maxFractionDigits
  };
};

// The sha256 of the file's first `bytes` bytes: the snapshot's raw lines are a byte prefix of the sorted file, so
// later appended minutes leave this hash unchanged.
export const prefixSha256 = (file: string, bytes: number) => {
  const descriptor = fs.openSync(file, 'r');
  const hash = createHash('sha256');
  const chunk = Buffer.alloc(1 << 24);
  let offset = 0;

  try {
    while (offset < bytes) {
      const read = fs.readSync(descriptor, chunk, 0, Math.min(chunk.length, bytes - offset), offset);

      if (read <= 0) {
        throw new Error(`${file} is shorter than the snapshot's ${bytes} bytes`);
      }

      hash.update(chunk.subarray(0, read));
      offset += read;
    }
  } finally {
    fs.closeSync(descriptor);
  }

  return hash.digest('hex');
};
