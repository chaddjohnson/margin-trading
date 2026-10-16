import fs from 'fs-extra';
import { proxySymbols, stooqFile, vgtFile, vixFile } from './constants.ts';

// Daily bars in the repository's `date|open|high|low|close|volume` format. `time` is midnight UTC of the
// session date in Unix seconds, exactly as src/lib/csv.ts produces it.
export interface DailyBars {
  symbol: string;
  file: string;
  date: string[];
  time: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export const parseDailyCsv = (symbol: string, file: string, text: string): DailyBars => {
  const bars: DailyBars = { symbol, file, date: [], time: [], open: [], high: [], low: [], close: [], volume: [] };

  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    const [date, open, high, low, close, volume] = line.split('|');

    if (!date || (bars.date.length > 0 && date <= bars.date.at(-1)!)) {
      throw new Error(`${file}: row ${date} is out of order`);
    }

    bars.date.push(date);
    bars.time.push(new Date(date).getTime() / 1000);
    bars.open.push(parseFloat(open!));
    bars.high.push(parseFloat(high!));
    bars.low.push(parseFloat(low!));
    bars.close.push(parseFloat(close!));
    bars.volume.push(parseFloat(volume!));
  }

  return bars;
};

export const loadDaily = async (symbol: string, file: string) =>
  parseDailyCsv(symbol, file, await fs.readFile(file, 'utf8'));

export const sliceBars = (bars: DailyBars, from: number, to: number): DailyBars => ({
  symbol: bars.symbol,
  file: bars.file,
  date: bars.date.slice(from, to + 1),
  time: bars.time.slice(from, to + 1),
  open: bars.open.slice(from, to + 1),
  high: bars.high.slice(from, to + 1),
  low: bars.low.slice(from, to + 1),
  close: bars.close.slice(from, to + 1),
  volume: bars.volume.slice(from, to + 1)
});

export const firstIndexOnOrAfter = (bars: DailyBars, date: string) => {
  const index = bars.date.findIndex((value) => value >= date);

  return index === -1 ? bars.date.length : index;
};

export const lastIndexOnOrBefore = (bars: DailyBars, date: string) => {
  for (let index = bars.date.length - 1; index >= 0; index--) {
    if (bars.date[index]! <= date) {
      return index;
    }
  }

  return -1;
};

// A proxy series aligned to the target's calendar by exact date. A target session the proxy lacks is NaN:
// nothing is forward-filled.
export interface AlignedSeries {
  symbol: string;
  close: number[];
  high: number[];
  // The proxy's own index for each target session, or -1, so indicators can be computed on the proxy's
  // own calendar and then looked up.
  ownIndex: number[];
  own: DailyBars;
}

export const alignTo = (target: DailyBars, own: DailyBars): AlignedSeries => {
  const byDate = new Map(own.date.map((date, index) => [date, index]));
  const ownIndex = target.date.map((date) => byDate.get(date) ?? -1);

  return {
    symbol: own.symbol,
    own,
    ownIndex,
    close: ownIndex.map((index) => (index === -1 ? NaN : own.close[index]!)),
    high: ownIndex.map((index) => (index === -1 ? NaN : own.high[index]!))
  };
};

// CBOE's official VIX history (MM/DD/YYYY,OPEN,HIGH,LOW,CLOSE).
export const loadVix = async (file = vixFile) => {
  const text = await fs.readFile(file, 'utf8');
  const closes = new Map<string, number>();

  for (const line of text.split('\n').slice(1)) {
    const [mdy, , , , close] = line.trim().split(',');

    if (!mdy || !close) {
      continue;
    }

    const [month, day, year] = mdy.split('/');

    closes.set(`${year}-${month}-${day}`, parseFloat(close));
  }

  return closes;
};

export interface StudyData {
  vgt: DailyBars;
  proxies: AlignedSeries[];
  vix?: Map<string, number>;
}

export const loadTarget = async (symbol: string) =>
  symbol === 'VGT' ? loadDaily('VGT', vgtFile) : loadDaily(symbol, stooqFile(symbol));

// The target plus its cross-ETF universe: the five VGT proxies, with VGT taking the target's place when the
// target is itself one of them.
export const loadStudyData = async (symbol = 'VGT', withVix = true): Promise<StudyData> => {
  const target = await loadTarget(symbol);
  const universe = symbol === 'VGT' ? proxySymbols : ['VGT', ...proxySymbols.filter((value) => value !== symbol)];
  const proxies: AlignedSeries[] = [];

  for (const proxy of universe) {
    const own = proxy === 'VGT' ? await loadDaily('VGT', vgtFile) : await loadDaily(proxy, stooqFile(proxy));

    proxies.push(alignTo(target, own));
  }

  const vix = withVix && (await fs.pathExists(vixFile)) ? await loadVix() : undefined;

  return { vgt: target, proxies, vix };
};
