// Data for the multi-ETF allocator: the minute files of VGT, XBI, XRT, KRE and VOOG loaded exactly as the strategy
// files load them (loadCsvMinuteBacktestData + groupMarketSessions, through the four-family loader), hashed against
// PROTOCOL.md §2, truncated at the run's horizon and turned into the four-family Dataset. The sessions of every file
// must be the same New York dates in the same order through the horizon; nothing is filled, repaired or adjusted.
// The VGT/VOOG distribution ledger is the earlier portfolio studies' file.
import type { MarketSession } from '#types';
import { type Dataset, fixtureDataset, loadSessions } from '../four-family/data.ts';
import { type Distribution, loadDistributions, shiftDataset } from '../shared-margin-portfolio/data.ts';
import { type Security, expectedHashes, files, protocol, securities, sha256File } from './context.ts';

export interface Instrument {
  symbol: Security;
  file: string;
  hash: string;
  ds: Dataset;
}

export interface Universe {
  end: string;
  dates: string[];
  sessionCount: number;
  instruments: Partial<Record<Security, Instrument>>;
  distributions: Distribution[];
  eligibilityIndex: number;
  hashes: Partial<Record<Security | 'distributions', string>>;
}

const sessionCache = new Map<Security, { sessions: MarketSession[]; hash: string }>();

// Every session of a file, loaded once per process. The hash is checked against the protocol unless told not to.
export const loadFileSessions = async (symbol: Security, checkHash = true) => {
  const cached = sessionCache.get(symbol);

  if (cached) {
    return cached;
  }

  const file = files.minute(symbol);
  const hash = await sha256File(file);

  if (checkHash && hash !== expectedHashes[symbol]) {
    throw new Error(`${file}: sha256 ${hash} differs from the protocol's ${expectedHashes[symbol]}`);
  }

  const entry = { sessions: await loadSessions(file, symbol), hash };

  sessionCache.set(symbol, entry);

  return entry;
};

export const instrumentOf = (symbol: Security, sessions: MarketSession[], hash: string, end: string): Instrument => {
  const ds = fixtureDataset(sessions.filter((session) => session.date <= end));

  ds.id = `${symbol}:${hash.slice(0, 16)}:${ds.lastDate}`;
  ds.dataHash = hash;

  return { symbol, file: files.minute(symbol), hash, ds };
};

// Checks the calendars and finds the eligibility session. Shared with the synthetic fixtures of the tests.
export const assembleUniverse = (
  instruments: Partial<Record<Security, Instrument>>,
  distributions: Distribution[],
  end: string,
  hashes: Universe['hashes'] = {},
  eligibilityDate: string = protocol.eligibilityDate
): Universe => {
  const list = Object.values(instruments) as Instrument[];
  const first = list[0];

  if (!first) {
    throw new Error('A universe needs at least one instrument');
  }

  for (const instrument of list) {
    if (instrument.ds.sessionCount !== first.ds.sessionCount) {
      throw new Error(
        `${instrument.symbol} has ${instrument.ds.sessionCount} sessions through ${end}, ${first.symbol} ${first.ds.sessionCount}`
      );
    }

    instrument.ds.dates.forEach((date, s) => {
      if (date !== first.ds.dates[s]) {
        throw new Error(`Session ${s}: ${instrument.symbol} ${date} vs ${first.symbol} ${first.ds.dates[s]}`);
      }
    });

    for (let s = 0; s < instrument.ds.sessionCount; s++) {
      if (instrument.ds.sCloseTime[s] !== first.ds.sCloseTime[s] || instrument.ds.sTime[s] !== first.ds.sTime[s]) {
        throw new Error(`Session ${first.ds.dates[s]}: ${instrument.symbol}'s schedule differs from ${first.symbol}'s`);
      }
    }
  }

  const eligibilityIndex = first.ds.dates.findIndex((date) => date >= eligibilityDate);

  if (eligibilityIndex < 0) {
    throw new Error(`No session on or after the eligibility date ${eligibilityDate}`);
  }

  return {
    end: first.ds.lastDate,
    dates: first.ds.dates,
    sessionCount: first.ds.sessionCount,
    instruments,
    distributions: distributions.filter((row) => row.exDate <= first.ds.lastDate),
    eligibilityIndex,
    hashes
  };
};

// The universe of a run: the named securities (books plus VOOG for the portfolio), all truncated at `end`.
export const loadUniverse = async ({
  members,
  end = protocol.commonEnd,
  checkHashes = true
}: {
  members: readonly Security[];
  end?: string;
  checkHashes?: boolean;
}): Promise<Universe> => {
  const instruments: Partial<Record<Security, Instrument>> = {};
  const hashes: Universe['hashes'] = {};

  for (const symbol of securities.filter((candidate) => members.includes(candidate))) {
    const { sessions, hash } = await loadFileSessions(symbol, checkHashes);

    instruments[symbol] = instrumentOf(symbol, sessions, hash, end);
    hashes[symbol] = hash;
  }

  const distributionsHash = await sha256File(files.distributions);

  if (checkHashes && distributionsHash !== expectedHashes.distributions) {
    throw new Error(`${files.distributions}: sha256 ${distributionsHash} differs from the protocol's`);
  }

  hashes.distributions = distributionsHash;

  return assembleUniverse(instruments, await loadDistributions(files.distributions), end, hashes);
};

// A price shock: every price of each named security from the open of session `index` onwards multiplied by its
// factor (full-path stress replays, PROTOCOL.md §9.3). Times and volumes are unchanged.
export interface Shock {
  index: number;
  factors: Partial<Record<Security, number>>;
}

export const shockedUniverse = (universe: Universe, shocks: Shock[]): Universe => {
  if (shocks.length === 0) {
    return universe;
  }

  const instruments: Partial<Record<Security, Instrument>> = {};

  for (const [symbol, instrument] of Object.entries(universe.instruments) as [Security, Instrument][]) {
    let ds = instrument.ds;

    for (const shock of shocks) {
      const factor = shock.factors[symbol];

      if (factor !== undefined && factor !== 1) {
        ds = shiftDataset(ds, shock.index, factor);
      }
    }

    instruments[symbol] = { ...instrument, ds };
  }

  return { ...universe, instruments };
};
