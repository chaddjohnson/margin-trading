import type { Tick } from '#types';
import fs from 'fs-extra';
import { parse } from 'csv-parse';

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
          delimiter: '|',
          columns: ['time', 'open', 'high', 'low', 'close', 'volume']
        },
        processor
      );

      fs.createReadStream(filename).pipe(parser);
    } catch (error: any) {
      reject(error);
    }
  });
};

// Loads one-minute bars exported from Alpaca: comma-separated, no header, an ISO 8601 UTC timestamp for
// the start of each minute, then open, high, low, close and volume. The file has no trade counts. Rows
// are streamed rather than collected first, and must be in strictly ascending time order.
export const loadCsvMinuteBacktestData = async (symbol: string, filename: string): Promise<Tick[]> => {
  const parser = fs.createReadStream(filename).pipe(
    parse({
      columns: ['time', 'open', 'high', 'low', 'close', 'volume']
    })
  );
  const ticks: Tick[] = [];

  for await (const record of parser) {
    // An ISO timestamp without an offset would be parsed in the local time zone, so insist on UTC.
    const time = record.time.endsWith('Z') ? Date.parse(record.time) / 1000 : NaN;
    const previous = ticks.at(-1);

    if (Number.isNaN(time) || (previous && time <= previous.time)) {
      throw new Error(`${filename}: timestamp ${record.time} is not UTC or not after the previous row`);
    }

    ticks.push({
      time,
      open: parseFloat(record.open),
      high: parseFloat(record.high),
      low: parseFloat(record.low),
      close: parseFloat(record.close),
      volume: parseFloat(record.volume),
      trades: NaN
    });
  }

  return ticks;
};
