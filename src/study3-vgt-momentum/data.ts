// The study's only market-data access (PROTOCOL.md §2): data/VGT/data.csv through the shared loader on the training
// partition with access 'optimization' (the loader refuses holdout, final and all before a byte is read), an explicit
// end date no later than 2023-12-29, regular-session bars and closing prints, recorded splits forward-adjusted (none
// falls inside 2016–2023 for VGT). Every load returns its door record: end, first and last dates, sessions, bars, the
// file's sha256 and the sha256 of every array a run reads.
import { createHash } from 'node:crypto';
import { loadDatasetSessions, readSplits, resolveDataset } from '#lib';
import { type Dataset, fixtureDataset } from '../four-family/data.ts';
import { study } from './context.ts';

export interface DoorRecord {
  symbol: string;
  endDate: string;
  firstDate: string;
  lastDate: string;
  sessions: number;
  bars: number;
  dataFile: string;
  dataSha256: string;
  loadedBarsSha256: string;
  access: 'optimization';
  partition: 'training';
  splitAdjustments: number;
}

export const loadedBarsHash = (ds: Dataset) => {
  const hash = createHash('sha256');

  for (const array of [
    ds.sTime,
    ds.sCloseTime,
    ds.sOpen,
    ds.sHigh,
    ds.sLow,
    ds.sClose,
    ds.sClosingPrint,
    ds.sBarStart,
    ds.sBarCount,
    ds.bTime,
    ds.bOpen,
    ds.bHigh,
    ds.bLow,
    ds.bClose
  ]) {
    hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
  }

  return hash.update(ds.dates.join(',')).digest('hex');
};

export const assertEndAllowed = (end: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error(`not a date: ${end}`);
  }

  if (end > study.researchCap) {
    throw new Error(`refused: ${end} is after the Stage 1 research cap ${study.researchCap}`);
  }
};

const cache = new Map<string, { ds: Dataset; door: DoorRecord }>();

export const loadVgt = async (end: string, root = 'data'): Promise<{ ds: Dataset; door: DoorRecord }> => {
  assertEndAllowed(end);

  const key = `${root}|${end}`;
  const cached = cache.get(key);

  if (cached) {
    return cached;
  }

  const dataset = resolveDataset(study.symbol, 'training', root);
  const run = await loadDatasetSessions({
    dataset,
    endDate: end,
    warmupSessions: 0,
    splits: readSplits(),
    access: 'optimization'
  });
  const report = run.report!;
  const ds = fixtureDataset(run.history);

  ds.dataHash = report.dataSha256!;
  ds.id = `${study.symbol}:${report.dataSha256!.slice(0, 16)}:${ds.lastDate}`;

  if (ds.firstDate !== study.firstSession) {
    throw new Error(`the data start ${ds.firstDate}, not ${study.firstSession}`);
  }

  if (ds.lastDate !== end) {
    throw new Error(`the data end ${ds.lastDate}, not the requested session ${end}`);
  }

  const door: DoorRecord = {
    symbol: study.symbol,
    endDate: end,
    firstDate: ds.firstDate,
    lastDate: ds.lastDate,
    sessions: ds.sessionCount,
    bars: ds.barCount,
    dataFile: dataset.file,
    dataSha256: report.dataSha256!,
    loadedBarsSha256: loadedBarsHash(ds),
    access: 'optimization',
    partition: 'training',
    splitAdjustments: report.splitAdjustments.length
  };
  const value = { ds, door };

  cache.set(key, value);
  return value;
};

export const indexOfDate = (ds: Dataset, date: string) => {
  const index = ds.dates.indexOf(date);

  if (index < 0) {
    throw new Error(`${date} is not a session of ${ds.id}`);
  }

  return index;
};
