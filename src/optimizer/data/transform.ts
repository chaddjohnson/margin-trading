// Converts Stooq daily CSVs into the repository's daily format: no header, pipe-delimited
// `YYYY-MM-DD|open|high|low|close|volume`, ascending dates, the exact format `loadCsvBacktestData` reads.
//
// Two Stooq source layouts are supported:
// - The historical-data page's CSV download ("Download data in csv file..."): a header row
//   `Date,Open,High,Low,Close,Volume` (or the Polish-locale `Data;Otwarcie;...`), then one row per session.
//   Exactly the first row (the header) is removed. With `;` as the delimiter every `;` in the data rows is
//   replaced with `|`, as is; with `,` the rows go through a CSV parser and are re-joined with `|`, so a
//   quoted field can never be split. Field text is kept verbatim (no re-rounding of prices or volumes).
// - Stooq's bulk-archive text files (`<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,
//   <OPENINT>`): the header row is removed, the ticker and period are checked, DATE (YYYYMMDD) becomes
//   YYYY-MM-DD, and TIME and OPENINT are dropped.
import { parse } from 'csv-parse/sync';

export const transformVersion = 'stooq-transform-v1';

export interface TransformResult {
  lines: string[]; // processed rows without line endings
  text: string; // lines joined with \n plus a final newline
  layout: 'stooq-page-csv' | 'stooq-bulk-txt';
  delimiter: ';' | ',';
  header: string;
  lineEnding: 'LF' | 'CRLF' | 'none';
  sourceRows: number; // data rows, header excluded
  warnings: string[];
}

export class StooqFormatError extends Error {}

const numberPattern = /^-?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const englishHeader = ['date', 'open', 'high', 'low', 'close', 'volume'];
const polishHeader = ['data', 'otwarcie', 'najwyzszy', 'najnizszy', 'zamkniecie', 'wolumen'];

// Splits into rows, accepting LF or CRLF and one optional newline at the end of the file. Blank rows
// inside the file are an error.
export const splitRows = (text: string) => {
  const body = text.startsWith('\uFEFF') ? text.slice(1) : text;
  const lineEnding: TransformResult['lineEnding'] = body.includes('\r\n')
    ? 'CRLF'
    : body.includes('\n')
      ? 'LF'
      : 'none';
  const rows = body.split(/\r?\n/);

  if (rows.at(-1) === '') {
    rows.pop();
  }

  rows.forEach((row, index) => {
    if (row.trim() === '') {
      throw new StooqFormatError(`blank row ${index + 1}`);
    }
  });

  return { rows, lineEnding };
};

// Recognizes responses that are not CSV data at all.
export const classifyNonCsv = (text: string): string | undefined => {
  const head = text.slice(0, 2000).toLowerCase();

  if (text.trim() === '') {
    return 'empty response';
  }

  if (head.includes('verify your browser') || head.includes('/__verify')) {
    return 'browser-verification challenge (JavaScript proof of work) instead of data';
  }

  if (head.includes('exceeded the daily hits limit') || head.includes('przekroczony dzienny limit')) {
    return 'Stooq daily request limit exceeded';
  }

  // Stooq's bulk files start with `<TICKER>`, so only real markup counts.
  if (/<!doctype html|<html[\s>]|<head[\s>]|<body[\s>]/.test(head)) {
    return 'HTML page instead of CSV';
  }

  if (head.trim() === 'no data' || head.startsWith('brak danych')) {
    return 'Stooq returned "No data"';
  }

  return undefined;
};

const checkRow = (fields: string[], rowNumber: number) => {
  if (fields.length !== 6) {
    throw new StooqFormatError(`row ${rowNumber}: expected 6 fields, found ${fields.length}`);
  }

  if (!datePattern.test(fields[0]!)) {
    throw new StooqFormatError(`row ${rowNumber}: date ${JSON.stringify(fields[0])} is not YYYY-MM-DD`);
  }

  fields.slice(1).forEach((field, column) => {
    if (!numberPattern.test(field)) {
      throw new StooqFormatError(
        `row ${rowNumber}: ${englishHeader[column + 1]} ${JSON.stringify(field)} is not a plain decimal number`
      );
    }
  });
};

export const transformStooqPageCsv = (text: string): TransformResult => {
  const problem = classifyNonCsv(text);

  if (problem) {
    throw new StooqFormatError(problem);
  }

  const { rows, lineEnding } = splitRows(text);
  const header = rows[0]!;
  const delimiter = header.includes(';') ? ';' : header.includes(',') ? ',' : undefined;

  if (!delimiter) {
    throw new StooqFormatError(`header ${JSON.stringify(header)} has no ';' or ',' delimiter`);
  }

  const columns = header.split(delimiter).map((column) => column.trim().toLowerCase());
  const matches = (expected: string[]) =>
    columns.length === expected.length && columns.every((column, index) => column === expected[index]);

  if (!matches(englishHeader) && !matches(polishHeader)) {
    throw new StooqFormatError(
      `header ${JSON.stringify(header)} is not Date,Open,High,Low,Close,Volume (a volume column is required)`
    );
  }

  // Remove exactly the first row, the header.
  const dataRows = rows.slice(1);

  if (dataRows.length === 0) {
    throw new StooqFormatError('no data rows after the header');
  }

  const lines = dataRows.map((row, index) => {
    const rowNumber = index + 2;

    if (row === header) {
      throw new StooqFormatError(`row ${rowNumber} repeats the header`);
    }

    let line: string;

    if (delimiter === ';') {
      if (row.includes(',') || row.includes('|') || row.includes('"')) {
        throw new StooqFormatError(`row ${rowNumber} contains ',', '|' or a quote in ';'-delimited data`);
      }

      line = row.replaceAll(';', '|');
    } else {
      const records = parse(row, { delimiter: ',', relax_quotes: false }) as string[][];

      if (records.length !== 1) {
        throw new StooqFormatError(`row ${rowNumber} did not parse as one CSV record`);
      }

      if (records[0]!.some((field) => field.includes('|'))) {
        throw new StooqFormatError(`row ${rowNumber} contains '|'`);
      }

      line = records[0]!.join('|');
    }

    checkRow(line.split('|'), rowNumber);

    return line;
  });

  return {
    lines,
    text: `${lines.join('\n')}\n`,
    layout: 'stooq-page-csv',
    delimiter,
    header,
    lineEnding,
    sourceRows: dataRows.length,
    warnings: []
  };
};

const bulkHeader = '<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,<OPENINT>';

export const transformStooqBulkTxt = (text: string, expectedTicker: string): TransformResult => {
  const problem = classifyNonCsv(text);

  if (problem) {
    throw new StooqFormatError(problem);
  }

  const { rows, lineEnding } = splitRows(text);
  const header = rows[0]!;

  if (header.trim() !== bulkHeader) {
    throw new StooqFormatError(`bulk header ${JSON.stringify(header)} is not ${bulkHeader}`);
  }

  const warnings: string[] = [];
  const dataRows = rows.slice(1);

  if (dataRows.length === 0) {
    throw new StooqFormatError('no data rows after the header');
  }

  const lines = dataRows.map((row, index) => {
    const rowNumber = index + 2;
    const fields = row.split(',');

    if (fields.length !== 10) {
      throw new StooqFormatError(`row ${rowNumber}: expected 10 fields, found ${fields.length}`);
    }

    const [ticker, period, date, , openField, highField, lowField, closeField, volumeField] = fields as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string
    ];

    if (ticker !== expectedTicker) {
      throw new StooqFormatError(`row ${rowNumber}: ticker ${ticker}, expected ${expectedTicker}`);
    }

    if (period !== 'D') {
      throw new StooqFormatError(`row ${rowNumber}: period ${period} is not daily`);
    }

    if (!/^\d{8}$/.test(date)) {
      throw new StooqFormatError(`row ${rowNumber}: date ${date} is not YYYYMMDD`);
    }

    const line = [
      `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
      openField,
      highField,
      lowField,
      closeField,
      volumeField
    ].join('|');

    checkRow(line.split('|'), rowNumber);

    return line;
  });

  return {
    lines,
    text: `${lines.join('\n')}\n`,
    layout: 'stooq-bulk-txt',
    delimiter: ',',
    header,
    lineEnding,
    sourceRows: dataRows.length,
    warnings
  };
};

// Parses processed rows back into numbers, the reference for raw-versus-processed parity checks.
export interface ParsedRow {
  date: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const parseProcessedLines = (lines: string[]): ParsedRow[] =>
  lines.map((line) => {
    const [date, open, high, low, close, volume] = line.split('|') as [string, string, string, string, string, string];

    return {
      date,
      time: new Date(date).getTime() / 1000,
      open: parseFloat(open),
      high: parseFloat(high),
      low: parseFloat(low),
      close: parseFloat(close),
      volume: parseFloat(volume)
    };
  });
