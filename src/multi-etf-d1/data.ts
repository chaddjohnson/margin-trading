// Per-ticker data: the minute file loaded exactly as the strategy files load it (loadCsvMinuteBacktestData +
// groupMarketSessions, via the four-family loader), hashed, and turned into the four-family Dataset (typed arrays on
// shared memory). Development commands only ever see the research view, physically truncated at the last 2023
// session; the holdout command builds the full dataset with the one unlock capability of src/four-family/data.ts.
import type { MarketSession } from '#types';
import {
  type Dataset,
  firstIndexOnOrAfter,
  fixtureDataset,
  lastIndexOnOrBefore,
  loadSessions,
  researchDataset,
  sha256File,
  unlockedDataset
} from '../four-family/data.ts';
import { type Ticker, protocol, readJson, stageDir } from './context.ts';

export interface TickerData {
  ticker: string;
  dataFile: string;
  dataHash: string;
  sessions: MarketSession[]; // the sessions the dataset holds (development: through the last 2023 session)
  ds: Dataset;
  eligibility: number; // the session index of the common eligibility date
  developmentEnd: number; // the last development session index
}

export const hashesFile = stageDir('audit', 'hashes.json');

// The hashes recorded by the audit; every later command refuses a file whose hash has changed.
export const expectedHashes = async (): Promise<Record<string, string>> => readJson(hashesFile);

export const verifyHash = async (ticker: string, dataFile: string) => {
  const dataHash = await sha256File(dataFile);
  const expected = (await expectedHashes())[ticker];

  if (!expected) {
    throw new Error(`No audited hash for ${ticker}; run the audit first`);
  }

  if (expected !== dataHash) {
    throw new Error(`${dataFile}: hash ${dataHash} differs from the audited ${expected}`);
  }

  return dataHash;
};

export const eligibilityIndexOf = (ds: Dataset) => {
  const index = firstIndexOnOrAfter(ds, protocol.eligibilityDate);

  if (ds.dates[index] !== protocol.eligibilityDate) {
    throw new Error(
      `${ds.id}: the eligibility session ${protocol.eligibilityDate} is missing (first session on or after it: ${ds.dates[index] ?? 'none'})`
    );
  }

  return index;
};

const finish = (
  ticker: string,
  dataFile: string,
  dataHash: string,
  sessions: MarketSession[],
  ds: Dataset,
  view: string
) => {
  ds.id = `${ticker}:${dataHash.slice(0, 16)}:${view}:${ds.lastDate}`;
  ds.dataHash = dataHash;

  const developmentEnd = lastIndexOnOrBefore(ds, protocol.developmentEnd);

  if (developmentEnd < 0) {
    throw new Error(`${ticker}: no session on or before ${protocol.developmentEnd}`);
  }

  return { ticker, dataFile, dataHash, sessions, ds, eligibility: eligibilityIndexOf(ds), developmentEnd };
};

// The development view: sessions on or before the development end only. The dataset cannot hold a later price.
export const loadDevelopment = async (ticker: Ticker | string): Promise<TickerData> => {
  const dataFile = protocol.dataFile(ticker);
  const dataHash = await verifyHash(ticker, dataFile);
  const all = await loadSessions(dataFile, ticker);
  const sessions = all.filter((session) => session.date <= protocol.developmentEnd);
  const ds = researchDataset(sessions, dataHash, protocol.developmentEnd);

  return finish(ticker, dataFile, dataHash, sessions, ds, 'dev');
};

// The full file, for the holdout command only: needs the unlock capability.
export const loadFull = async (ticker: Ticker | string, token: object): Promise<TickerData> => {
  const dataFile = protocol.dataFile(ticker);
  const dataHash = await verifyHash(ticker, dataFile);
  const sessions = await loadSessions(dataFile, ticker);
  const ds = unlockedDataset(sessions, dataHash, token);

  return finish(ticker, dataFile, dataHash, sessions, ds, 'full');
};

// The VGT regression control: not one of the eight instruments and no holdout of this program (its 2024-2025
// window was examined by earlier programs), so it is built without the research guard.
export const loadReference = async (): Promise<TickerData> => {
  const { symbol, dataFile, dataHash: expected } = protocol.reference;
  const dataHash = await sha256File(dataFile);

  if (dataHash !== expected) {
    throw new Error(`${dataFile}: hash ${dataHash} differs from the reference ${expected}`);
  }

  const sessions = await loadSessions(dataFile, symbol);
  const ds = fixtureDataset(sessions);

  return finish(symbol, dataFile, dataHash, sessions, ds, 'reference');
};

export const holdoutStartIndex = (ds: Dataset) => firstIndexOnOrAfter(ds, protocol.holdout.start);
