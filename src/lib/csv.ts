import type { Tick } from '#types';
import fs from 'fs-extra';
import { parse } from 'csv-parse';

// The canonical market-data format, that of every data/<SYMBOL>/data.csv (src/lib/dataset.ts):
// one-minute bars exported from Alpaca, comma-delimited, no header row, in this column order. The timestamp
// is ISO 8601 UTC for the start of the minute and may be quoted, for example
// "2016-01-04T14:30:00Z",106.31,106.31,105.77,105.77,21114
export const minuteCsvDelimiter = ',';
export const ohlcvCsvColumns = ['time', 'open', 'high', 'low', 'close', 'volume'] as const;

// The legacy daily format, `YYYY-MM-DD|open|high|low|close|volume`, kept only for the inputs still written in
// it: the Stooq daily cache (data/stooq/processed/, src/optimizer/data/) and the trailing-buy research's daily
// files (data/trailing-buy-entry/, src/trailing-buy/). Minute data is never pipe-delimited.
export const legacyDailyCsvDelimiter = '|';

const numberPattern = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;

// One minute bar from its comma-separated fields; `where` locates the row in error messages. Numeric text is
// read with parseFloat, so a value is exactly the number its text denotes.
export const parseMinuteBar = (fields: readonly string[], where: string): Tick => {
  if (fields.length !== ohlcvCsvColumns.length) {
    const hint = fields.some((field) => field.includes(legacyDailyCsvDelimiter))
      ? ': the row looks pipe-delimited, but minute data is comma-delimited'
      : '';

    throw new Error(
      `${where}: expected ${ohlcvCsvColumns.length} fields (${ohlcvCsvColumns.join(', ')}), found ${fields.length}${hint}`
    );
  }

  const [timeText, ...numbers] = fields as [string, ...string[]];
  // An ISO timestamp without an offset would be parsed in the local time zone, so insist on UTC.
  const time = timeText.endsWith('Z') ? Date.parse(timeText) / 1000 : NaN;

  if (Number.isNaN(time)) {
    throw new Error(
      `${where}: timestamp ${JSON.stringify(timeText)} is not an ISO 8601 UTC time (the files have no header row)`
    );
  }

  numbers.forEach((text, index) => {
    if (!numberPattern.test(text)) {
      throw new Error(`${where}: ${ohlcvCsvColumns[index + 1]} ${JSON.stringify(text)} is not a number`);
    }
  });

  const [open, high, low, close, volume] = numbers.map(parseFloat) as [number, number, number, number, number];

  return { time, open, high, low, close, volume, trades: NaN };
};

// Reads the legacy pipe-delimited daily format (see legacyDailyCsvDelimiter).
export const loadCsvBacktestData = async (symbol: string, filename: string): Promise<Tick[]> => {
  return new Promise((resolve, reject) => {
    try {
      const processor = (error: any, ticks: any[]) => {
        if (error) {
          return reject(error);
        }

        const transformedTicks = ticks.map((tick) => ({
          time: new Date(tick.time).getTime() / 1000,
          open: parseFloat(tick.open),
          high: parseFloat(tick.high),
          low: parseFloat(tick.low),
          close: parseFloat(tick.close),
          volume: parseFloat(tick.volume),
          trades: parseInt(tick.trades)
        }));

        resolve(transformedTicks);
      };

      const parser = parse(
        {
          delimiter: legacyDailyCsvDelimiter,
          columns: [...ohlcvCsvColumns]
        },
        processor
      );

      fs.createReadStream(filename).pipe(parser);
    } catch (error: any) {
      reject(error);
    }
  });
};

export interface MinuteLoadBounds {
  // Only bars with fromTime <= time < toTime are kept (Unix seconds). Every row is still parsed and checked.
  fromTime?: number;
  toTime?: number;
  // Filled with the number of rows left out on each side.
  stats?: { before: number; after: number };
}

// Loads a file in the canonical minute format (see ohlcvCsvColumns). The file has no trade counts. Every row
// is data, the first included; rows are streamed rather than collected first, and must be in strictly
// ascending time order. Quoted fields are parsed as CSV, so a comma inside quotes never splits a field.
// `bounds` keeps only a time range (src/lib/evaluation.ts), so a run of one period doesn't hold the whole file.
export const loadCsvMinuteBacktestData = async (
  symbol: string,
  filename: string,
  { fromTime = -Infinity, toTime = Infinity, stats }: MinuteLoadBounds = {}
): Promise<Tick[]> => {
  const parser = fs
    .createReadStream(filename)
    .pipe(parse({ delimiter: minuteCsvDelimiter, relax_column_count: true, info: true }));
  const ticks: Tick[] = [];
  let previousTime = -Infinity;

  for await (const { record, info } of parser as AsyncIterable<{ record: string[]; info: { lines: number } }>) {
    const where = `${filename}:${info.lines}`;
    const tick = parseMinuteBar(record, where);

    if (tick.time <= previousTime) {
      throw new Error(`${where}: timestamp ${record[0]} is not after the previous row`);
    }

    previousTime = tick.time;

    if (tick.time < fromTime) {
      if (stats) stats.before++;
    } else if (tick.time >= toTime) {
      if (stats) stats.after++;
    } else {
      ticks.push(tick);
    }
  }

  return ticks;
};
