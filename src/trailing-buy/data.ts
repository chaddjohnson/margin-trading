// Daily bars in the repository's `date|open|high|low|close|volume` format. `time` is midnight UTC of the
// session date in Unix seconds, exactly as src/lib/csv.ts produces it for the original strategy.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import {
  derivedDir,
  vgt2026File,
  vgt2026Sha256,
  vgtCombinedFile,
  vgtHistoryFile,
  vgtHistorySha256
} from './constants.ts';

export interface DailyBars {
  symbol: string;
  file: string;
  sha256: string;
  date: string[];
  time: number[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export const sha256Of = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

export const parseDailyCsv = (symbol: string, file: string, text: string): DailyBars => {
  const bars: DailyBars = {
    symbol,
    file,
    sha256: sha256Of(text),
    date: [],
    time: [],
    open: [],
    high: [],
    low: [],
    close: [],
    volume: []
  };

  for (const line of text.split('\n')) {
    if (!line.trim()) {
      continue;
    }

    const [date, open, high, low, close, volume] = line.trim().split('|');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || (bars.date.length > 0 && date <= bars.date.at(-1)!)) {
      throw new Error(`${file}: row ${date} is malformed or out of order`);
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
  ...bars,
  date: bars.date.slice(from, to + 1),
  time: bars.time.slice(from, to + 1),
  open: bars.open.slice(from, to + 1),
  high: bars.high.slice(from, to + 1),
  low: bars.low.slice(from, to + 1),
  close: bars.close.slice(from, to + 1),
  volume: bars.volume.slice(from, to + 1)
});

export const firstIndexOnOrAfter = (bars: { date: string[] }, date: string) => {
  const index = bars.date.findIndex((value) => value >= date);

  return index === -1 ? bars.date.length : index;
};

export const lastIndexOnOrBefore = (bars: { date: string[] }, date: string) => {
  for (let index = bars.date.length - 1; index >= 0; index--) {
    if (bars.date[index]! <= date) {
      return index;
    }
  }

  return -1;
};

export interface CombinedDataManifest {
  output: string;
  outputSha256: string;
  sessions: number;
  firstDate: string;
  lastDate: string;
  inputs: { file: string; sha256: string; rows: number; firstDate: string; lastDate: string }[];
  appendedFrom2026File: string[];
  overlapRowsCompared: number;
  overlapRowsDiffering: number;
}

// The primary research series: every row of the continuous history file, then any later rows of the 2026
// file. Rows the two files share must be identical, otherwise this throws: nothing is silently mixed.
export const buildCombinedVgt = async (): Promise<CombinedDataManifest> => {
  const historyText = await fs.readFile(vgtHistoryFile, 'utf8');
  const recentText = await fs.readFile(vgt2026File, 'utf8');

  if (sha256Of(historyText) !== vgtHistorySha256 || sha256Of(recentText) !== vgt2026Sha256) {
    throw new Error('A VGT input file changed since the protocol was registered');
  }

  const history = parseDailyCsv('VGT', vgtHistoryFile, historyText);
  const recent = parseDailyCsv('VGT', vgt2026File, recentText);
  const historyRows = new Map(
    historyText
      .split('\n')
      .filter(Boolean)
      .map((line) => [line.split('|')[0]!, line])
  );
  const recentLines = recentText.split('\n').filter(Boolean);
  const appended: string[] = [];
  let compared = 0;
  let differing = 0;

  for (const line of recentLines) {
    const date = line.split('|')[0]!;
    const existing = historyRows.get(date);

    if (existing !== undefined) {
      compared++;
      differing += existing.trim() === line.trim() ? 0 : 1;
    } else if (date > history.date.at(-1)!) {
      appended.push(line.trim());
    } else {
      throw new Error(`${vgt2026File}: ${date} is missing from ${vgtHistoryFile}`);
    }
  }

  if (differing > 0) {
    throw new Error(`${differing} overlapping VGT rows differ between the two input files`);
  }

  const text = `${[
    ...historyText
      .split('\n')
      .filter(Boolean)
      .map((line) => line.trim()),
    ...appended
  ].join('\n')}\n`;

  await fs.ensureDir(derivedDir);
  await fs.writeFile(vgtCombinedFile, text);

  const combined = parseDailyCsv('VGT', vgtCombinedFile, text);

  return {
    output: vgtCombinedFile,
    outputSha256: combined.sha256,
    sessions: combined.date.length,
    firstDate: combined.date[0]!,
    lastDate: combined.date.at(-1)!,
    inputs: [history, recent].map((bars) => ({
      file: bars.file,
      sha256: bars.sha256,
      rows: bars.date.length,
      firstDate: bars.date[0]!,
      lastDate: bars.date.at(-1)!
    })),
    appendedFrom2026File: appended.map((line) => line.split('|')[0]!),
    overlapRowsCompared: compared,
    overlapRowsDiffering: differing
  };
};

export const loadVgt = async () => {
  if (!(await fs.pathExists(vgtCombinedFile))) {
    await buildCombinedVgt();
  }

  return loadDaily('VGT', vgtCombinedFile);
};
