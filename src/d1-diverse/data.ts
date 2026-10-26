// The study's data access (PROTOCOL.md §4.4). Each door refuses what it may not open, before a byte is read:
//
//   trainingUniverse(window)  every control, search, promotion, refinement, pruning, assessment and pick read: the
//                             frozen eligible universe on the training partition (access 'optimization'), loaded only
//                             through the window's search end; the loaded last date is asserted and every file is
//                             checked against this study's audited hash.
//   validationUniverse(fold)  only after that fold's sealed PICKS.json verifies; through the validation end.
//   benchmarkUniverse         B1/B4/B5/C0 members on `all`, for the controls reproduction only.
//   evaluationUniverse        only after FROZEN_SELECTION.json verifies AND names a nominee.
import fs from 'fs-extra';
import { doorRecordOf, loadedBarsHash } from '../d1-robust/data.ts';
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

export { doorRecordOf, loadedBarsHash };

export const benchmarkMembers = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;

export interface UniverseRecord {
  eligible: string[];
  symbols: Record<string, { eligible: boolean; cohort: string; reasons: string[]; dataSha256: string }>;
}

export const eligibleSymbols = async (file: string = universeFile): Promise<string[]> => {
  const record = await readJson<UniverseRecord>(file);

  if (!Array.isArray(record.eligible) || record.eligible.length === 0) {
    throw new Error(`${file} has no eligible symbols`);
  }

  return [...record.eligible].sort();
};

export const picksFile = (fold: FoldKey) => stageDir('walkforward', fold, 'PICKS.json');

export const searchEndOf = (window: WindowKey) => study.windows[window].searchEnd;

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

export const trainingUniverse = async (
  window: WindowKey,
  options: { root?: string; symbols?: readonly string[]; universeFile?: string } = {}
): Promise<LoadedUniverse> => {
  const symbols = options.symbols ?? (await eligibleSymbols(options.universeFile));
  const endDate = searchEndOf(window);
  const loaded = await loadNUniverse({
    members: symbols,
    partition: 'training',
    access: 'optimization',
    warmupSessions: 0,
    endDate,
    root: options.root ?? 'data'
  });

  if (loaded.universe.end > endDate || loaded.universe.end > study.trainingLastSession) {
    throw new Error(`The ${window} universe ends ${loaded.universe.end}, after its search end ${endDate}`);
  }

  for (const [symbol, instrument] of Object.entries(loaded.universe.instruments)) {
    if (instrument.ds.lastDate > endDate) {
      throw new Error(`${symbol}: bars after ${endDate} were loaded`);
    }
  }

  for (const [symbol, record] of Object.entries(loaded.windows)) {
    if (record.partition !== 'training' || record.access !== 'optimization') {
      throw new Error(`${symbol}: not an optimization read of the training partition`);
    }
  }

  if (!options.root || options.root === 'data') {
    await assertAudited(loaded, options.universeFile);
  }

  return loaded;
};

export const validationUniverse = async (
  fold: FoldKey,
  symbols: readonly string[],
  options: { root?: string; picks?: string } = {}
): Promise<LoadedUniverse> => {
  const picks = await readSealed(options.picks ?? picksFile(fold)); // throws unless the picks were frozen first

  if (picks.window !== fold) {
    throw new Error(`The picks file is for ${String(picks.window)}, not ${fold}`);
  }

  const loaded = await loadNUniverse({
    members: symbols,
    partition: 'training',
    access: 'manual evaluation',
    warmupSessions: 0,
    endDate: study.windows[fold].validationEnd,
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

  const loaded = await loadNUniverse({
    members,
    partition: 'all',
    access: 'manual evaluation',
    warmupSessions: 0,
    endDate
  });

  await assertAudited(loaded);

  return loaded;
};

export const evaluationUniverse = async (members: readonly string[], manifest: string = frozenSelectionFile) => {
  if (!(await fs.pathExists(manifest))) {
    throw new Error(`${manifest} does not exist: nothing after training may be read before the selection freeze`);
  }

  const selection = await readSealed(manifest);
  const nominees = (selection.nominees as unknown[] | undefined) ?? [];

  if (nominees.length === 0) {
    throw new Error('The frozen selection names no nominee: nothing after training may be read');
  }

  const loaded = await loadNUniverse({ members, partition: 'all', access: 'manual evaluation', warmupSessions: 0 });

  await assertAudited(loaded);

  return loaded;
};
