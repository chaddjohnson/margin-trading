// The study's only data access (PROTOCOL.md §3.3). Every load goes through the shared loader on the training partition
// with access 'optimization' (the loader refuses holdout, final and all before a byte is read), an explicit end date
// no later than the provenance's cap, and the audited file hashes of the 61-symbol universe. Nothing after
// 2023-12-29 is ever requested.
import { createHash } from 'node:crypto';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { type ViewKey, caps, dataRoot, readJson, source, study } from './context.ts';

export interface UniverseRecord {
  eligible: string[];
  symbols: Record<
    string,
    {
      eligible: boolean;
      category: string;
      dataSha256: string;
      coverageMedian: number;
      trainingMedianDollarVolume: number;
      trainingP10DollarVolume: number;
      trainingMedianBarsPerSession: number;
      splitsRegistered: unknown[];
      tier: string;
    }
  >;
}

let universeCache: UniverseRecord | undefined;

export const readUniverseRecord = async (): Promise<UniverseRecord> => {
  if (!universeCache) {
    universeCache = await readJson<UniverseRecord>(source.universeFile);

    if (universeCache.eligible.length !== 61) {
      throw new Error(`${source.universeFile} lists ${universeCache.eligible.length} eligible symbols, not 61`);
    }
  }

  return universeCache;
};

export const universeSymbols = async () => [...(await readUniverseRecord()).eligible].sort();

export interface DoorRecord {
  provenance: ViewKey | 'I';
  endDate: string;
  firstDate: string;
  lastDate: string;
  sessions: number;
  eligibilityDate: string;
  symbols: string[];
  dataSha256: Record<string, string>;
  loadedBarsSha256: Record<string, string>;
}

// sha256 of the arrays a run reads for one symbol (the ranked-preemption study's loadedBarsHash, restated).
export const loadedBarsHash = (loaded: LoadedUniverse, symbol: string) => {
  const ds = loaded.universe.instruments[symbol]!.ds;
  const hash = createHash('sha256');

  for (const array of [
    ds.sTime,
    ds.sCloseTime,
    ds.sOpen,
    ds.sHigh,
    ds.sLow,
    ds.sClose,
    ds.sClosingPrint,
    ds.sMinClose,
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

export const assertEndAllowed = (provenance: ViewKey | 'I', end: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error(`not a date: ${end}`);
  }

  if (end > study.researchCap) {
    throw new Error(`refused: ${end} is after the study's research cap ${study.researchCap}`);
  }

  if (end > caps[provenance]) {
    throw new Error(`refused: ${provenance} vectors may not be evaluated after ${caps[provenance]} (requested ${end})`);
  }
};

// Loads the given symbols through `end` for the most restrictive provenance among `provenances`.
export const loadUniverse = async (
  symbols: readonly string[],
  end: string,
  provenances: readonly (ViewKey | 'I')[],
  root = dataRoot
): Promise<{ loaded: LoadedUniverse; door: DoorRecord }> => {
  for (const provenance of provenances) {
    assertEndAllowed(provenance, end);
  }

  const record = await readUniverseRecord();
  const unknown = symbols.filter((symbol) => !record.eligible.includes(symbol));

  if (unknown.length > 0) {
    throw new Error(`refused: ${unknown.join(' ')} not in the audited 61-symbol universe`);
  }

  const loaded = await loadNUniverse({
    members: [...symbols],
    partition: 'training',
    access: 'optimization',
    warmupSessions: 0,
    endDate: end,
    root
  });
  const { universe } = loaded;

  if (universe.end !== end || universe.dates.at(-1) !== end) {
    throw new Error(`the universe ends ${universe.end}, not the requested ${end}`);
  }

  if (universe.dates[0] !== study.firstSession) {
    throw new Error(`the universe starts ${universe.dates[0]}, not ${study.firstSession}`);
  }

  if (universe.dates[universe.eligibilityIndex] !== study.armingDate) {
    throw new Error(
      `the first eligible session is ${universe.dates[universe.eligibilityIndex]}, not ${study.armingDate}`
    );
  }

  for (const symbol of symbols) {
    const window = loaded.windows[symbol]!;

    if (root === dataRoot && window.dataSha256 !== record.symbols[symbol]!.dataSha256) {
      throw new Error(
        `${symbol}: the canonical file does not hash to the audited ${record.symbols[symbol]!.dataSha256}`
      );
    }

    if (universe.instruments[symbol]!.ds.lastDate > end) {
      throw new Error(`${symbol} has bars after ${end}`);
    }
  }

  const sorted = [...symbols].sort();
  const door: DoorRecord = {
    provenance: provenances.join('+') as DoorRecord['provenance'],
    endDate: end,
    firstDate: universe.dates[0]!,
    lastDate: universe.end,
    sessions: universe.sessionCount,
    eligibilityDate: universe.dates[universe.eligibilityIndex]!,
    symbols: sorted,
    dataSha256: Object.fromEntries(sorted.map((symbol) => [symbol, loaded.windows[symbol]!.dataSha256!])),
    loadedBarsSha256: Object.fromEntries(sorted.map((symbol) => [symbol, loadedBarsHash(loaded, symbol)]))
  };

  return { loaded, door };
};
