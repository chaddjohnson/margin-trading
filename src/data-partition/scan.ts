// One pass over a minute file in the canonical format (src/lib/csv.ts): every row is parsed as CSV, validated,
// given its New York trading date and partition, and handed to `onRow` with its exact text, while the audit
// (ordering, duplicates, out-of-range rows, missing sessions, intraday gaps) is accumulated. Nothing is sorted,
// dropped or repaired: problems are counted with examples, and the caller decides what fails.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { parse } from 'csv-parse';
import { type DatasetPartition, newYorkOffset, nyseEarlyCloses, nyseHolidays, ohlcvCsvColumns } from '#lib';

// The partitions' inclusive New York trading dates. These are the only copy of the boundaries in the repository;
// the application selects partitions by name (src/lib/dataset.ts).
export const partitionBoundaries: readonly {
  partition: Exclude<DatasetPartition, 'all'>;
  first: string;
  last?: string;
}[] = [
  { partition: 'training', first: '2016-01-01', last: '2023-12-31' },
  { partition: 'holdout', first: '2024-01-01', last: '2025-10-16' },
  { partition: 'final', first: '2025-10-17' }
];

export type DataPartition = (typeof partitionBoundaries)[number]['partition'];

export const dataPartitions: readonly DataPartition[] = partitionBoundaries.map(({ partition }) => partition);

export const partitionOf = (date: string): DataPartition | undefined =>
  partitionBoundaries.find(({ first, last }) => date >= first && (last === undefined || date <= last))?.partition;

const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const numberPattern = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
const maxExamples = 10;
const openMinute = 9 * 60 + 30;
const closeMinute = 16 * 60;
const earlyCloseMinute = 13 * 60;

// The New York trading date of a Unix timestamp, and its minute of the day. Daylight saving is handled by
// newYorkOffset, which reads the time zone database.
export const newYorkDateAndMinute = (timestamp: number) => {
  const local = timestamp + newYorkOffset(timestamp);

  return {
    date: new Date(local * 1000).toISOString().slice(0, 10),
    minute: Math.floor((((local % 86400) + 86400) % 86400) / 60)
  };
};

export interface Examples {
  count: number;
  examples: string[];
}

const examples = (): Examples => ({ count: 0, examples: [] });

const note = (bucket: Examples, example: string) => {
  bucket.count++;

  if (bucket.examples.length < maxExamples) {
    bucket.examples.push(example);
  }
};

export interface PartitionStats {
  rows: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
  firstDate?: string;
  lastDate?: string;
}

interface DayStats {
  regularBars: number;
  extendedBars: number;
  afterEarlyClose: number; // bars from 13:01 to 16:00 on an early-close date
  previousMinute?: number;
  firstMinute?: number;
  lastMinute?: number;
  largestGap: number; // minutes between consecutive regular-session bars
  largestGapFrom?: number;
}

export interface Gap {
  date: string;
  from: string;
  to: string;
  minutes: number;
}

export interface ScanAudit {
  firstDate?: string;
  lastDate?: string;
  expectedSessions: number; // weekdays from the first to the last date that are not NYSE holidays
  sessionsWithRegularBars: number;
  missingSessions: string[]; // expected sessions without a regular-session bar
  sessionsOnClosedDays: string[]; // holidays and weekends with regular-session bars
  extendedHoursBars: number;
  earlyCloseLateBars: { date: string; bars: number }[]; // early-close dates with bars after 1:00 p.m.
  coverage: { median: number; below50: number; below90: number }; // regular minutes with a bar / scheduled minutes
  largestGaps: Gap[];
}

export interface ScanResult {
  file: string;
  header?: string; // the header row, when the first row is one; it is never written out
  dataRows: number;
  rowsSha256: string; // of the data rows' exact text, each ending in '\n'
  endsWithNewline: boolean;
  partitions: Record<DataPartition, PartitionStats>;
  // Problems that fail validation.
  malformed: Examples;
  outOfOrder: Examples;
  duplicates: Examples;
  outOfRange: Examples;
  // Anomalies that are only reported.
  unalignedSeconds: Examples;
  inconsistentPrices: Examples;
  audit: ScanAudit;
}

export const fatalProblems = (scan: ScanResult) =>
  (['malformed', 'outOfOrder', 'duplicates', 'outOfRange'] as const).filter((key) => scan[key].count > 0);

const looksLikeHeader = (fields: string[]) =>
  fields.length === ohlcvCsvColumns.length && fields.every((field) => /^[A-Za-z_][A-Za-z0-9_ ]*$/.test(field));

const formatMinute = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

const weekdaysBetween = (first: string, last: string) => {
  const dates: string[] = [];

  for (let time = Date.parse(first); time <= Date.parse(last); time += 86400000) {
    const day = new Date(time).getUTCDay();

    if (day !== 0 && day !== 6) {
      dates.push(new Date(time).toISOString().slice(0, 10));
    }
  }

  return dates;
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted.length === 0 ? NaN : sorted[Math.floor(sorted.length / 2)]!;
};

interface ParsedRecord {
  record: string[];
  raw: string;
  info: { lines: number };
}

// The parser's records, with its own errors (bad quoting, typically) given the file and a hint.
async function* recordsOf(file: string, parser: AsyncIterable<unknown>): AsyncGenerator<ParsedRecord> {
  try {
    for await (const record of parser) {
      yield record as ParsedRecord;
    }
  } catch (error) {
    const message = (error as Error).message;
    const hint = message.includes('"|"') ? '; the file looks pipe-delimited, but minute data is comma-delimited' : '';

    throw new Error(`${file} is not valid comma-delimited CSV: ${message}${hint}`);
  }
}

export const scanMinuteFile = async (
  file: string,
  onRow?: (partition: DataPartition, line: string) => void | Promise<void>
): Promise<ScanResult> => {
  const hash = createHash('sha256');
  const partitions = Object.fromEntries(dataPartitions.map((partition) => [partition, { rows: 0 }])) as Record<
    DataPartition,
    PartitionStats
  >;
  const result: Omit<ScanResult, 'rowsSha256' | 'audit'> = {
    file,
    dataRows: 0,
    endsWithNewline: true,
    partitions,
    malformed: examples(),
    outOfOrder: examples(),
    duplicates: examples(),
    outOfRange: examples(),
    unalignedSeconds: examples(),
    inconsistentPrices: examples()
  };
  const days = new Map<string, DayStats>();
  let extendedHoursBars = 0;
  let previous: { time: number; text: string; line: number } | undefined;
  let firstRecord = true;

  // `raw` is each record's exact text including its line ending; relaxing the column count lets a wrong field
  // count be reported here with its line rather than as a parser error.
  const parser = fs
    .createReadStream(file)
    .pipe(parse({ delimiter: ',', raw: true, info: true, relax_column_count: true, skip_empty_lines: false }));

  for await (const { record, raw, info } of recordsOf(file, parser)) {
    const where = `line ${info.lines}`;
    const isFirst = firstRecord;

    firstRecord = false;

    if (isFirst && looksLikeHeader(record)) {
      result.header = raw.replace(/\r?\n$/, '');
      continue;
    }

    if (raw.includes('\r')) {
      note(result.malformed, `${where}: carriage return (CRLF line endings are not supported)`);
      continue;
    }

    if (record.length !== ohlcvCsvColumns.length) {
      const pipe = record.some((field) => field.includes('|'))
        ? ' (pipe-delimited? minute data is comma-delimited)'
        : '';

      note(result.malformed, `${where}: ${record.length} fields${pipe}: ${raw.trim().slice(0, 80)}`);
      continue;
    }

    const [timeText, ...numberTexts] = record as [string, ...string[]];

    if (!timestampPattern.test(timeText) || Number.isNaN(Date.parse(timeText))) {
      note(result.malformed, `${where}: timestamp ${JSON.stringify(timeText)} is not ISO 8601 with a UTC offset`);
      continue;
    }

    const badNumber = numberTexts.findIndex((text) => !numberPattern.test(text));

    if (badNumber >= 0) {
      note(
        result.malformed,
        `${where}: ${ohlcvCsvColumns[badNumber + 1]} ${JSON.stringify(numberTexts[badNumber])} is not a number`
      );
      continue;
    }

    const time = Date.parse(timeText) / 1000;
    const line = raw.endsWith('\n') ? raw : `${raw}\n`;

    if (!raw.endsWith('\n')) {
      result.endsWithNewline = false;
    }

    if (previous && time === previous.time) {
      note(
        result.duplicates,
        `${where} repeats ${timeText} from line ${previous.line}${previous.text === line ? ' (identical row)' : ' (different values)'}`
      );
    } else if (previous && time < previous.time) {
      note(
        result.outOfOrder,
        `${where}: ${timeText} is before ${previous.text.split(',')[0]} on line ${previous.line}`
      );
    }

    previous = { time, text: line, line: info.lines };

    const { date, minute } = newYorkDateAndMinute(time);
    const partition = partitionOf(date);

    if (!partition) {
      note(result.outOfRange, `${where}: ${timeText} trades on ${date}, outside every partition`);
      continue;
    }

    if (time % 60 !== 0) {
      note(result.unalignedSeconds, `${where}: ${timeText}`);
    }

    const [open, high, low, close, volume] = numberTexts.map(Number) as [number, number, number, number, number];

    if (!(high >= Math.max(open, close, low) && low <= Math.min(open, close) && low > 0 && volume >= 0)) {
      note(result.inconsistentPrices, `${where}: ${raw.trim()}`);
    }

    const stats = partitions[partition];

    stats.rows++;
    stats.firstTimestamp ??= timeText;
    stats.firstDate ??= date;
    stats.lastTimestamp = timeText;
    stats.lastDate = date;
    result.dataRows++;
    hash.update(line);

    let day = days.get(date);

    if (!day) {
      day = { regularBars: 0, extendedBars: 0, afterEarlyClose: 0, largestGap: 0 };
      days.set(date, day);
    }

    const sessionClose = nyseEarlyCloses.has(date) ? earlyCloseMinute : closeMinute;

    if (minute >= openMinute && minute < sessionClose) {
      day.regularBars++;
      day.firstMinute ??= minute;
      day.lastMinute = minute;

      if (day.previousMinute !== undefined && minute - day.previousMinute > day.largestGap) {
        day.largestGap = minute - day.previousMinute;
        day.largestGapFrom = day.previousMinute;
      }

      day.previousMinute = minute;
    } else {
      day.extendedBars++;
      extendedHoursBars++;

      if (sessionClose === earlyCloseMinute && minute > earlyCloseMinute && minute <= closeMinute) {
        day.afterEarlyClose++;
      }
    }

    await onRow?.(partition, line);
  }

  const dates = [...days.keys()];
  const firstDate = dates[0];
  const lastDate = dates.at(-1);
  const expected =
    firstDate && lastDate ? weekdaysBetween(firstDate, lastDate).filter((date) => !nyseHolidays.has(date)) : [];
  const expectedSet = new Set(expected);
  const coverages: number[] = [];
  const gaps: Gap[] = [];

  for (const date of expected) {
    const day = days.get(date);

    if (day && day.regularBars > 0) {
      const scheduled = (nyseEarlyCloses.has(date) ? earlyCloseMinute : closeMinute) - openMinute;

      coverages.push(day.regularBars / scheduled);

      if (day.largestGapFrom !== undefined) {
        gaps.push({
          date,
          from: formatMinute(day.largestGapFrom),
          to: formatMinute(day.largestGapFrom + day.largestGap),
          minutes: day.largestGap
        });
      }
    }
  }

  gaps.sort((a, b) => b.minutes - a.minutes || a.date.localeCompare(b.date));

  const audit: ScanAudit = {
    firstDate,
    lastDate,
    expectedSessions: expected.length,
    sessionsWithRegularBars: [...days.values()].filter((day) => day.regularBars > 0).length,
    missingSessions: expected.filter((date) => !((days.get(date)?.regularBars ?? 0) > 0)),
    sessionsOnClosedDays: dates.filter((date) => !expectedSet.has(date) && days.get(date)!.regularBars > 0),
    extendedHoursBars,
    earlyCloseLateBars: dates
      .filter((date) => days.get(date)!.afterEarlyClose > 0)
      .map((date) => ({ date, bars: days.get(date)!.afterEarlyClose })),
    coverage: {
      median: median(coverages),
      below50: coverages.filter((value) => value < 0.5).length,
      below90: coverages.filter((value) => value < 0.9).length
    },
    largestGaps: gaps.slice(0, 5)
  };

  return { ...result, rowsSha256: hash.digest('hex'), audit };
};
