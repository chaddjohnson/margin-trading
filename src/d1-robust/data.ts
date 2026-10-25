// The study's data access (PROTOCOL.md §3.6). Each door refuses what it may not open, before a byte is read:
//
//   trainingUniverse(round)   every library, pilot, discovery, promotion, refinement, assessment and selection read:
//                             the eligible universe on the training partition through access 'optimization', loaded
//                             only through the round's search end (the loader stops reading there); the loaded last
//                             date is asserted and every symbol's loaded bars are hashed.
//   validationUniverse(fold)  only after the fold's PICKS.json exists and verifies; through the validation end.
//   benchmarkUniverse         B1/B4/B5/C0 members (VOOG VGT XBI XRT KRE GDX) on `all`, for the controls.
//   evaluationUniverse        only after FROZEN_SELECTION.json verifies.
// The R1/R4 door lives in retrospective.ts, which no search module imports.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import {
  type FoldKey,
  type WindowKey,
  frozenSelectionFile,
  readJson,
  stageDir,
  study,
  universeFile
} from './context.ts';
import { readSealed } from './freeze.ts';

export const benchmarkMembers = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;

export interface UniverseRecord {
  eligible: string[];
  symbols: Record<string, { eligible: boolean; cohort: string; reasons: string[] }>;
}

export const eligibleSymbols = async (file: string = universeFile): Promise<string[]> => {
  const record = await readJson<UniverseRecord>(file);

  if (!Array.isArray(record.eligible) || record.eligible.length === 0) {
    throw new Error(`${file} has no eligible symbols`);
  }

  return [...record.eligible].sort();
};

export const picksFile = (fold: FoldKey) => stageDir('walkforward', fold, 'PICKS.json');

// sha256 of a loaded dataset's bars and sessions (the bytes the optimizer can read).
export const loadedBarsHash = (loaded: LoadedUniverse, symbol: string) => {
  const ds = loaded.universe.instruments[symbol]!.ds;
  const hash = createHash('sha256');

  for (const array of [
    ds.sTime,
    ds.sClose,
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

export interface DoorRecord {
  door: string;
  round?: string;
  partition: string;
  access: string;
  endDate?: string;
  lastDate: string;
  sessions: number;
  symbols: number;
  barsSha256: Record<string, string>;
}

export const doorRecordOf = (door: string, loaded: LoadedUniverse, round?: string): DoorRecord => ({
  door,
  round,
  partition: loaded.partition,
  access: loaded.access,
  endDate: loaded.endDate,
  lastDate: loaded.universe.end,
  sessions: loaded.universe.sessionCount,
  symbols: Object.keys(loaded.universe.instruments).length,
  barsSha256: Object.fromEntries(
    Object.keys(loaded.universe.instruments)
      .sort()
      .map((symbol) => [symbol, loadedBarsHash(loaded, symbol)])
  )
});

export const searchEndOf = (round: WindowKey) => study.windows[round].searchEnd;

// Every loaded file must hash to the file the frozen audit verified.
export const assertAudited = async (loaded: LoadedUniverse, file: string = universeFile) => {
  const record = await readJson<{ symbols: Record<string, { dataSha256: string }> }>(file);

  for (const [symbol, window] of Object.entries(loaded.windows)) {
    const expected = record.symbols[symbol]?.dataSha256;

    if (!expected || window.dataSha256 !== expected) {
      throw new Error(
        `${symbol}: the canonical file does not hash to the audited ${expected?.slice(0, 12) ?? '(none)'}`
      );
    }
  }
};

export const trainingUniverse = async (
  round: WindowKey,
  options: { root?: string; symbols?: readonly string[] } = {}
): Promise<LoadedUniverse> => {
  const symbols = options.symbols ?? (await eligibleSymbols());
  const endDate = searchEndOf(round);
  const loaded = await loadNUniverse({
    members: symbols,
    partition: 'training',
    access: 'optimization',
    warmupSessions: 0,
    endDate,
    root: options.root ?? 'data'
  });

  if (loaded.universe.end > endDate || loaded.universe.end > study.trainingEnd) {
    throw new Error(`The ${round} universe ends ${loaded.universe.end}, after its search end ${endDate}`);
  }

  for (const [symbol, instrument] of Object.entries(loaded.universe.instruments)) {
    if (instrument.ds.lastDate > endDate) {
      throw new Error(`${symbol}: bars after ${endDate} were loaded`);
    }
  }

  for (const [symbol, window] of Object.entries(loaded.windows)) {
    if (window.partition !== 'training' || window.access !== 'optimization') {
      throw new Error(`${symbol}: not an optimization read of the training partition`);
    }
  }

  if (!options.root || options.root === 'data') {
    await assertAudited(loaded);
  }

  return loaded;
};

export const validationUniverse = async (
  fold: FoldKey,
  symbols: readonly string[],
  options: { root?: string; picks?: string } = {}
): Promise<LoadedUniverse> => {
  const picks = await readSealed(options.picks ?? picksFile(fold)); // throws unless the picks were frozen first

  if (picks.round !== fold) {
    throw new Error(`The picks file is for ${String(picks.round)}, not ${fold}`);
  }

  const window = study.windows[fold];
  const loaded = await loadNUniverse({
    members: symbols,
    partition: 'training',
    access: 'manual evaluation',
    warmupSessions: 0,
    endDate: window.validationEnd,
    root: options.root ?? 'data'
  });

  if (!options.root || options.root === 'data') {
    await assertAudited(loaded);
  }

  return loaded;
};

export const benchmarkUniverse = async (members: readonly string[], endDate?: string): Promise<LoadedUniverse> => {
  for (const symbol of members) {
    if (!(benchmarkMembers as readonly string[]).includes(symbol)) {
      throw new Error(
        `${symbol} is not a benchmark member: the benchmark door opens ${benchmarkMembers.join(', ')} only`
      );
    }
  }

  return loadNUniverse({ members, partition: 'all', access: 'manual evaluation', warmupSessions: 0, endDate });
};

export const evaluationUniverse = async (
  members: readonly string[],
  manifest: string = frozenSelectionFile
): Promise<LoadedUniverse> => {
  if (!(await fs.pathExists(manifest))) {
    throw new Error(`${manifest} does not exist: nothing after training may be read before the selection freeze`);
  }

  await readSealed(manifest);

  const loaded = await loadNUniverse({ members, partition: 'all', access: 'manual evaluation', warmupSessions: 0 });

  await assertAudited(loaded);

  return loaded;
};
