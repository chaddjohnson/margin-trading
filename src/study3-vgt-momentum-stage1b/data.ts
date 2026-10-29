// The study's only market-data access (PROTOCOL.md §2): data/VGT/data.csv through the shared loader on the training
// partition with access 'optimization', an explicit end no later than 2023-12-29 (refused before any byte is read),
// and a door check on the retained bars (no session after the request, no bar at or after 2023-12-30T00:00Z). Every
// load returns its door record. Missing-bar stress datasets are derived in memory from a loaded dataset.
import { createHash } from 'node:crypto';
import { loadDatasetSessions, readSplits, resolveDataset } from '#lib';
import { type Dataset, fixtureDataset } from '../four-family/data.ts';
import { mulberry32 } from '../study3-vgt-momentum/engine.ts';
import { study } from './context.ts';

export interface DoorRecord {
  symbol: string;
  endDate: string;
  firstDate: string;
  lastDate: string;
  sessions: number;
  bars: number;
  lastBarTime: string;
  dataFile: string;
  dataSha256: string;
  loadedBarsSha256: string;
  access: 'optimization';
  partition: 'training';
  splitAdjustments: number;
}

const barCeiling = Date.parse(`2023-12-30T00:00:00Z`) / 1000;

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

  if (end > study.dataCap) {
    throw new Error(`refused: ${end} is after the Stage 1b data cap ${study.dataCap}`);
  }
};

// The in-memory door: nothing after the request and nothing on or after 2023-12-30 UTC.
export const assertDoor = (ds: Dataset, end: string) => {
  if (ds.lastDate > end || ds.lastDate > study.dataCap) {
    throw new Error(`door: the dataset ends ${ds.lastDate}, after ${end}`);
  }

  const lastBar = ds.barCount > 0 ? ds.bTime[ds.barCount - 1]! : -Infinity;
  const lastClose = ds.sessionCount > 0 ? ds.sCloseTime[ds.sessionCount - 1]! : -Infinity;

  if (lastBar >= barCeiling || lastClose >= barCeiling) {
    throw new Error('door: a retained bar is at or after 2023-12-30T00:00Z');
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

  assertDoor(ds, end);

  const door: DoorRecord = {
    symbol: study.symbol,
    endDate: end,
    firstDate: ds.firstDate,
    lastDate: ds.lastDate,
    sessions: ds.sessionCount,
    bars: ds.barCount,
    lastBarTime: new Date(ds.bTime[ds.barCount - 1]! * 1000).toISOString(),
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

// A stress dataset with a seeded share of each session's non-first minutes removed (the first minute, the session
// fields and the closing print are kept; session high/low stay those of the data).
export const withMissingBars = (ds: Dataset, rate: number, seed: number): Dataset => {
  const random = mulberry32(seed);
  const keep: number[] = [];
  const sBarStart = new Int32Array(new SharedArrayBuffer(ds.sessionCount * 4));
  const sBarCount = new Int32Array(new SharedArrayBuffer(ds.sessionCount * 4));

  for (let s = 0; s < ds.sessionCount; s++) {
    sBarStart[s] = keep.length;

    for (let k = 0; k < ds.sBarCount[s]!; k++) {
      if (k === 0 || random() >= rate) {
        keep.push(ds.sBarStart[s]! + k);
      }
    }

    sBarCount[s] = keep.length - sBarStart[s]!;
  }

  const pick = (array: Float64Array) => {
    const out = new Float64Array(new SharedArrayBuffer(Math.max(1, keep.length) * 8));

    keep.forEach((b, i) => {
      out[i] = array[b]!;
    });

    return out;
  };

  return {
    ...ds,
    id: `${ds.id}:missing${rate}`,
    barCount: keep.length,
    sBarStart,
    sBarCount,
    bTime: pick(ds.bTime),
    bOpen: pick(ds.bOpen),
    bHigh: pick(ds.bHigh),
    bLow: pick(ds.bLow),
    bClose: pick(ds.bClose)
  };
};

// The dataset's first sessions 0..last (a prefix): used by the prefix-invariance guards (PROTOCOL.md §12).
export const truncate = (ds: Dataset, last: number): Dataset => {
  const sessions = last + 1;
  const bars = ds.sBarStart[last]! + ds.sBarCount[last]!;
  const f64 = (a: Float64Array, n: number) => a.slice(0, n);

  return {
    ...ds,
    id: `${ds.id}:prefix${ds.dates[last]}`,
    lastDate: ds.dates[last]!,
    sessionCount: sessions,
    barCount: bars,
    dates: ds.dates.slice(0, sessions),
    sTime: f64(ds.sTime, sessions),
    sCloseTime: f64(ds.sCloseTime, sessions),
    sOpen: f64(ds.sOpen, sessions),
    sHigh: f64(ds.sHigh, sessions),
    sLow: f64(ds.sLow, sessions),
    sClose: f64(ds.sClose, sessions),
    sClosingPrint: f64(ds.sClosingPrint, sessions),
    sYear: ds.sYear.slice(0, sessions),
    sBarStart: ds.sBarStart.slice(0, sessions),
    sBarCount: ds.sBarCount.slice(0, sessions),
    sMinClose: f64(ds.sMinClose, sessions),
    bTime: f64(ds.bTime, bars),
    bOpen: f64(ds.bOpen, bars),
    bHigh: f64(ds.bHigh, bars),
    bLow: f64(ds.bLow, bars),
    bClose: f64(ds.bClose, bars)
  };
};

// A copy whose every price after session `after` is multiplied by a seeded random walk factor (the poisoned-future
// guard: decisions through `after` must not change).
export const poisonAfter = (ds: Dataset, after: number, seed: number): Dataset => {
  const random = mulberry32(seed);
  const copy = (a: Float64Array) => a.slice();
  const out: Dataset = {
    ...ds,
    id: `${ds.id}:poison${ds.dates[after]}`,
    sOpen: copy(ds.sOpen),
    sHigh: copy(ds.sHigh),
    sLow: copy(ds.sLow),
    sClose: copy(ds.sClose),
    sClosingPrint: copy(ds.sClosingPrint),
    bOpen: copy(ds.bOpen),
    bHigh: copy(ds.bHigh),
    bLow: copy(ds.bLow),
    bClose: copy(ds.bClose)
  };
  let factor = 1;

  for (let s = after + 1; s < ds.sessionCount; s++) {
    factor *= 1 + (random() - 0.5) * 0.08;

    for (const a of [out.sOpen, out.sHigh, out.sLow, out.sClose, out.sClosingPrint]) {
      a[s] = a[s]! * factor;
    }

    for (let b = ds.sBarStart[s]!; b < ds.sBarStart[s]! + ds.sBarCount[s]!; b++) {
      for (const a of [out.bOpen, out.bHigh, out.bLow, out.bClose]) {
        a[b] = a[b]! * factor;
      }
    }
  }

  return out;
};
