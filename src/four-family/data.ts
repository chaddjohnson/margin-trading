// The minute data for the four-family trailing-buy optimization. The CSV is loaded once with the repository's
// own loader (loadCsvMinuteBacktestData) and session grouping (groupMarketSessions), exactly as the four
// strategy files load it, then copied into typed arrays on SharedArrayBuffers so that worker threads read the
// same memory. Nothing here depends on a candidate's parameters, and nothing is repaired or adjusted.
//
// The research view is physically truncated at the research end (the last development session), so the
// search, the selection and the walk-forward can't read a later price. A dataset beyond it can only be built
// with the capability that holdout.ts takes once.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { groupMarketSessions, loadCsvMinuteBacktestData, optimizationDatasetFile } from '#lib';
import type { MarketSession } from '#types';

// The research ran on the legacy data/VGT/VGT-2016-2025-1-minute.csv (its sha256 is kept below as provenance). The
// program now reads the training partition, the only one an optimizer may read (src/lib/dataset.ts), so the
// hash checks refuse its frozen stages rather than mix datasets.
export const defaultDataFile = optimizationDatasetFile('VGT');
export const expectedDataHash = '600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f';

export interface Dataset {
  id: string; // data hash prefix and last session
  dataHash: string;
  firstDate: string;
  lastDate: string;
  sessionCount: number;
  barCount: number;
  dates: string[];
  // Per session, as MarketSession.
  sTime: Float64Array; // midnight UTC of the New York date
  sCloseTime: Float64Array;
  sOpen: Float64Array;
  sHigh: Float64Array;
  sLow: Float64Array;
  sClose: Float64Array;
  sClosingPrint: Float64Array; // NaN without a closing print
  sYear: Int16Array;
  sBarStart: Int32Array;
  sBarCount: Int32Array;
  sMinClose: Float64Array; // lowest regular-session minute close, for skipping sessions that can't arm
  // Per regular-session minute, in session order.
  bTime: Float64Array;
  bOpen: Float64Array;
  bHigh: Float64Array;
  bLow: Float64Array;
  bClose: Float64Array;
}

const sharedFloat64 = (length: number) => new Float64Array(new SharedArrayBuffer(Math.max(1, length) * 8));
const sharedInt32 = (length: number) => new Int32Array(new SharedArrayBuffer(Math.max(1, length) * 4));
const sharedInt16 = (length: number) => new Int16Array(new SharedArrayBuffer(Math.max(1, length) * 2));

export const sha256File = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

// Loads and groups the whole file, exactly as the strategy files do.
export const loadSessions = async (file = defaultDataFile, symbol = 'VGT') =>
  groupMarketSessions(await loadCsvMinuteBacktestData(symbol, file));

const buildDataset = (sessions: MarketSession[], dataHash: string): Dataset => {
  const sessionCount = sessions.length;
  const barCount = sessions.reduce((total, session) => total + session.bars.length, 0);
  const ds: Dataset = {
    id: `${dataHash.slice(0, 16)}:${sessions.at(-1)?.date ?? ''}`,
    dataHash,
    firstDate: sessions[0]?.date ?? '',
    lastDate: sessions.at(-1)?.date ?? '',
    sessionCount,
    barCount,
    dates: sessions.map((session) => session.date),
    sTime: sharedFloat64(sessionCount),
    sCloseTime: sharedFloat64(sessionCount),
    sOpen: sharedFloat64(sessionCount),
    sHigh: sharedFloat64(sessionCount),
    sLow: sharedFloat64(sessionCount),
    sClose: sharedFloat64(sessionCount),
    sClosingPrint: sharedFloat64(sessionCount),
    sYear: sharedInt16(sessionCount),
    sBarStart: sharedInt32(sessionCount),
    sBarCount: sharedInt32(sessionCount),
    sMinClose: sharedFloat64(sessionCount),
    bTime: sharedFloat64(barCount),
    bOpen: sharedFloat64(barCount),
    bHigh: sharedFloat64(barCount),
    bLow: sharedFloat64(barCount),
    bClose: sharedFloat64(barCount)
  };
  let offset = 0;

  sessions.forEach((session, s) => {
    if (session.bars.length === 0) {
      throw new Error(`Session ${session.date} has no regular-session minute`);
    }

    ds.sTime[s] = session.time;
    ds.sCloseTime[s] = session.closeTime;
    ds.sOpen[s] = session.open;
    ds.sHigh[s] = session.high;
    ds.sLow[s] = session.low;
    ds.sClose[s] = session.close;
    ds.sClosingPrint[s] = session.closingPrint ?? NaN;
    ds.sYear[s] = Number(session.date.slice(0, 4));
    ds.sBarStart[s] = offset;
    ds.sBarCount[s] = session.bars.length;

    let minClose = Infinity;

    session.bars.forEach((bar, b) => {
      ds.bTime[offset + b] = bar.time;
      ds.bOpen[offset + b] = bar.open;
      ds.bHigh[offset + b] = bar.high;
      ds.bLow[offset + b] = bar.low;
      ds.bClose[offset + b] = bar.close;
      minClose = Math.min(minClose, bar.close);
    });

    ds.sMinClose[s] = minClose;
    offset += session.bars.length;
  });

  return ds;
};

// The research view: sessions up to and including `researchEnd` only.
const researchViews = new WeakSet<Dataset>();

export const researchDataset = (sessions: MarketSession[], dataHash: string, researchEnd: string) => {
  const dataset = buildDataset(
    sessions.filter((session) => session.date <= researchEnd),
    dataHash
  );

  researchViews.add(dataset);

  return dataset;
};

export const assertResearchView = (dataset: Dataset, researchEnd: string) => {
  if (!researchViews.has(dataset) || dataset.lastDate > researchEnd) {
    throw new Error(`Dataset ${dataset.id} is not a research view ending on or before ${researchEnd}`);
  }
};

let unlockIssued = false;
const unlockTokens = new WeakSet<object>();

// The one capability that can build a dataset beyond the research end. holdout.ts takes it when it runs; a
// second request in the same process throws.
export const issueUnlockCapability = () => {
  if (unlockIssued) {
    throw new Error('The holdout unlock capability has already been issued');
  }

  const token = Object.freeze({});

  unlockIssued = true;
  unlockTokens.add(token);

  return token;
};

export const unlockedDataset = (sessions: MarketSession[], dataHash: string, token: object) => {
  if (!unlockTokens.has(token)) {
    throw new Error('A dataset beyond the research end needs the holdout capability');
  }

  return buildDataset(sessions, dataHash);
};

// For synthetic fixtures and tests only: any sessions, no research guard.
export const fixtureDataset = (sessions: MarketSession[]) => buildDataset(sessions, 'fixture');

// First session index on or after a date, or the session count.
export const firstIndexOnOrAfter = (dataset: Dataset, date: string) => {
  const index = dataset.dates.findIndex((value) => value >= date);

  return index < 0 ? dataset.sessionCount : index;
};

// Last session index on or before a date, or -1.
export const lastIndexOnOrBefore = (dataset: Dataset, date: string) => {
  for (let index = dataset.sessionCount - 1; index >= 0; index--) {
    if (dataset.dates[index]! <= date) {
      return index;
    }
  }

  return -1;
};

// The reference high of each session as the strategy files compute it on a session list that starts at
// `firstIndex`: the highest session high of the previous `lookback` sessions, never including the session
// itself or any session before `firstIndex` (-Infinity for the first session, as Math.max() of nothing).
export const computeReferenceHighs = (dataset: Dataset, lookback: number, firstIndex = 0) => {
  const highs = new Float64Array(dataset.sessionCount).fill(NaN);
  const deque = new Int32Array(dataset.sessionCount);
  let head = 0;
  let tail = 0;

  for (let s = firstIndex; s < dataset.sessionCount; s++) {
    // The window is [max(firstIndex, s - lookback), s - 1].
    while (head < tail && deque[head]! < s - lookback) {
      head++;
    }

    highs[s] = head < tail ? dataset.sHigh[deque[head]!]! : -Infinity;

    while (head < tail && dataset.sHigh[deque[tail - 1]!]! <= dataset.sHigh[s]!) {
      tail--;
    }

    deque[tail++] = s;
  }

  return highs;
};

// Reference highs per lookback for datasets whose sessions all count (firstIndex 0), computed once.
export class ReferenceHighCache {
  private readonly cache = new Map<number, Float64Array>();

  constructor(private readonly dataset: Dataset) {}

  get(lookback: number, firstIndex = 0) {
    if (firstIndex !== 0) {
      return computeReferenceHighs(this.dataset, lookback, firstIndex);
    }

    let highs = this.cache.get(lookback);

    if (!highs) {
      highs = computeReferenceHighs(this.dataset, lookback);
      this.cache.set(lookback, highs);
    }

    return highs;
  }
}
