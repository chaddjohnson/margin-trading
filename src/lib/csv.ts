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
