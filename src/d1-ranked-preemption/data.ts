// The study's data access (PROTOCOL.md §4.4). Each door refuses what it may not open, before a byte is read:
//
//   trainingUniverse(window)   every Stage A–D read of a window: the audited eligible universe on the training
//                              partition through access 'optimization', loaded only through the window's search end
//                              (the loader stops reading there); the loaded last date is asserted, every file hash
//                              is checked against the audit and every symbol's loaded bars are hashed.
//   validationUniverse(fold)   only after that fold's sealed PICKS.json verifies; through the validation end.
//   benchmarkUniverse          B4/B5 members (VOOG VGT XBI XRT KRE GDX) on `all`, for the P0 regression only.
//   historicalUniverse         only after FROZEN_SELECTION.json verifies and names a nominee; `all`.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import {
  type FoldKey,
  type WindowKey,
  dataRoot,
  frozenSelectionFile,
  protocolFreezeFile,
  readJson,
  stageDir,
  study,
  universeFile
} from './context.ts';
import { readSealed } from './freeze.ts';

export const benchmarkMembers = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;

export interface UniverseRecord {
  eligible: string[];
  symbols: Record<string, { eligible: boolean; cohort: string; dataSha256: string; reasons: string[] }>;
}

export const eligibleSymbols = async (file: string = universeFile): Promise<string[]> => {
  const record = await readJson<UniverseRecord>(file);

  if (!Array.isArray(record.eligible) || record.eligible.length === 0) {
    throw new Error(`${file} has no eligible symbols`);
  }

  return [...record.eligible].sort();
};

export const picksFile = (fold: FoldKey) => stageDir('walkforward', fold, 'PICKS.json');

// sha256 of a loaded dataset's bars and sessions (the bytes an optimizer can read).
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

export interface DoorRecord {
  door: string;
  window?: string;
  partition: string;
  access: string;
  endDate?: string;
  lastDate: string;
  sessions: number;
  symbols: number;
  barsSha256: Record<string, string>;
}

export const doorRecordOf = (door: string, loaded: LoadedUniverse, window?: string): DoorRecord => ({
  door,
  window,
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

export const searchEndOf = (window: WindowKey) => study.windows[window].searchEnd;

// Every loaded file must hash to the file the study's audit verified.
export const assertAudited = async (loaded: LoadedUniverse, file: string = universeFile) => {
  const record = await readJson<UniverseRecord>(file);

  for (const [symbol, window] of Object.entries(loaded.windows)) {
    const expected = record.symbols[symbol]?.dataSha256;

    if (!expected || window.dataSha256 !== expected) {
      throw new Error(
        `${symbol}: the canonical file does not hash to the audited ${expected?.slice(0, 12) ?? '(none)'}`
      );
    }
  }
};

// The chronology of the windows (PROTOCOL.md §4.4, §13.6): fold-b's data contain fold-a's validation years and the
// final window's contain both folds', so fold-b opens only after fold-a's validation is sealed and the final window
// only after the sealed procedure gate. Before the protocol freeze, the outcome-blind benchmark may read the final
// window for timings only.
export const validationRecordOf = (fold: FoldKey) => stageDir('walkforward', fold, 'VALIDATION.json');
export const procedureGateRecord = stageDir('walkforward', 'PROCEDURE_GATE.json');

export const assertChronology = async (window: WindowKey) => {
  if (window === 'fold-b') {
    await readSealed(validationRecordOf('fold-a')).catch(() => {
      throw new Error('fold-b opens only after fold-a’s validation is sealed (PROTOCOL.md §13.6)');
    });
  }

  if (window === 'final') {
    await readSealed(procedureGateRecord).catch(() => {
      throw new Error('the final window opens only after the sealed procedure gate (PROTOCOL.md §13.6)');
    });
  }
};

export const trainingUniverse = async (
  window: WindowKey,
  options: {
    root?: string;
    symbols?: readonly string[];
    universeRecord?: string;
    beforeProtocolFreeze?: boolean; // the outcome-blind benchmark only
  } = {}
): Promise<LoadedUniverse> => {
  if (options.beforeProtocolFreeze) {
    if (await fs.pathExists(protocolFreezeFile)) {
      throw new Error('the outcome-blind exception ends at the protocol freeze');
    }
  } else if (!options.root) {
    await assertChronology(window);
  }

  const symbols = options.symbols ?? (await eligibleSymbols(options.universeRecord));
  const endDate = searchEndOf(window);
  const loaded = await loadNUniverse({
    members: symbols,
    partition: 'training',
    access: 'optimization',
    warmupSessions: 0,
    endDate,
    root: options.root ?? dataRoot
  });

  if (loaded.universe.end > endDate || loaded.universe.end > study.trainingLastSession) {
    throw new Error(`The ${window} universe ends ${loaded.universe.end}, after its search end ${endDate}`);
  }

  for (const [symbol, instrument] of Object.entries(loaded.universe.instruments)) {
    if (instrument.ds.lastDate > endDate) {
      throw new Error(`${symbol}: bars after ${endDate} were loaded`);
    }
  }

  for (const [symbol, report] of Object.entries(loaded.windows)) {
    if (report.partition !== 'training' || report.access !== 'optimization') {
      throw new Error(`${symbol}: not an optimization read of the training partition`);
    }
  }

  if (!options.root) {
    await assertAudited(loaded, options.universeRecord);
  }

  return loaded;
};

export const validationUniverse = async (
  fold: FoldKey,
  symbols: readonly string[],
  options: { root?: string; picks?: string } = {}
): Promise<LoadedUniverse> => {
  const picks = await readSealed(options.picks ?? picksFile(fold)); // throws unless the picks were sealed first

  if (picks.window !== fold) {
    throw new Error(`The picks file is for ${String(picks.window)}, not ${fold}`);
  }

  const window = study.windows[fold];
  const loaded = await loadNUniverse({
    members: symbols,
    partition: 'training',
    access: 'manual evaluation',
    warmupSessions: 0,
    endDate: window.validationEnd,
    root: options.root ?? dataRoot
  });

  if (loaded.universe.end > window.validationEnd!) {
    throw new Error(`The ${fold} validation universe ends ${loaded.universe.end}, after ${window.validationEnd}`);
  }

  if (!options.root) {
    await assertAudited(loaded);
  }

  return loaded;
};

// The read-only CLI's door to a window's training data: the chronology, and no date after the window's search end
// unless that fold's validation is sealed (then through its validation end); the final window through 2023-12-29.
export const allowedEndOf = async (window: WindowKey) => {
  if (window === 'final') {
    return study.trainingLastSession;
  }

  const sealed = await readSealed(validationRecordOf(window as FoldKey)).then(
    () => true,
    () => false
  );

  return sealed ? study.windows[window].validationEnd! : study.windows[window].searchEnd;
};

export const inspectionUniverse = async (
  window: WindowKey,
  members: readonly string[],
  endDate?: string
): Promise<LoadedUniverse> => {
  await assertChronology(window);

  const allowed = await allowedEndOf(window);

  if (endDate && endDate > allowed) {
    throw new Error(`${window} may be read through ${allowed} only (PROTOCOL.md §4.4)`);
  }

  const loaded = await loadNUniverse({
    members,
    partition: 'training',
    access: 'manual evaluation',
    warmupSessions: 0,
    endDate: endDate ?? allowed,
    root: dataRoot
  });

  await assertAudited(loaded);

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

  return loadNUniverse({
    members,
    partition: 'all',
    access: 'manual evaluation',
    warmupSessions: 0,
    endDate,
    root: dataRoot
  });
};

// The 2024–2026 door (PROTOCOL.md §14.4): only after FROZEN_SELECTION.json verifies and names a nominee; members only
// the nominee's, B5's, B4's and the core's (VOOG, VGT). The single check itself opens it once; afterwards (its sealed
// record existing) the CLI may re-read the same inspected figures for the nominee.
export const historicalCheckRecord = stageDir('historical', 'HISTORICAL_CHECK.json');

export const historicalUniverse = async (
  members: readonly string[],
  options: { purpose?: 'check'; manifest?: string } = {}
): Promise<LoadedUniverse> => {
  const manifest = options.manifest ?? frozenSelectionFile;

  if (!(await fs.pathExists(manifest))) {
    throw new Error(`${manifest} does not exist: nothing after training may be read before the selection freeze`);
  }

  const selection = await readSealed(manifest);
  const nominees = (selection.nominees as { configuration: { books: { symbol: string }[] } }[] | undefined) ?? [];

  if (nominees.length === 0) {
    throw new Error(`${manifest} names no nominee: the 2024–2026 window stays closed`);
  }

  const allowed = new Set<string>([
    'VOOG',
    'VGT',
    ...benchmarkMembers,
    ...nominees.flatMap((nominee) => nominee.configuration.books.map((book) => book.symbol))
  ]);

  for (const symbol of members) {
    if (!allowed.has(symbol)) {
      throw new Error(`${symbol} is neither the nominee's, B5's, B4's nor the core's: the 2024–2026 door refuses it`);
    }
  }

  const checked = await fs.pathExists(historicalCheckRecord);

  if (options.purpose === 'check' ? checked : !checked) {
    throw new Error(
      options.purpose === 'check'
        ? 'the historical check runs once'
        : 'the 2024–2026 window opens to the CLI only after the sealed historical check'
    );
  }

  const loaded = await loadNUniverse({
    members,
    partition: 'all',
    access: 'manual evaluation',
    warmupSessions: 0,
    root: dataRoot
  });

  await assertAudited(loaded);

  return loaded;
};
