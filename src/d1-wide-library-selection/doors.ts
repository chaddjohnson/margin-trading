// The study's data access (PROTOCOL.md §3). Each door refuses what it may not open before a byte is read, and every
// load passes the calendar door (assertCalendar: no load ends after an earlier fold's or triple's unsealed choice):
//
//   trainingUniverse(fold)      every search, archive reconstruction, library and training-only selection of a fold:
//                               the audited eligible universe on the training partition (access 'optimization'),
//                               loaded only through the fold's cutoff; the loaded last date is asserted, every file
//                               hash equals the source study's audit, every symbol's loaded bars are hashed.
//   evaluationUniverse(...)     a fold's chronological evaluation (or a nested window): never after 2023-12-29, the
//                               code freeze, never after the fold's cutoff unless the fold's sealed SELECTION verifies,
//                               never after a triple's selection end unless that triple's sealed nested SELECTION
//                               verifies; every candidate's provenance (source caps, the fold's own archive, a later
//                               window's pools).
//   sourceTrainingUniverse(w)   a source window's own training span (archive reconstruction and census only).
//   sourceCap(window, end)      a source (archived) vector of a window is never evaluated after its own door's last
//                               date (fold-a 2021-12-31, fold-b 2023-12-29); a final-window vector is never evaluated.
//   fullHistoryUniverse()       the unchanged incumbents' anchors only (the standalone audit's door, unchanged).
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { loadedBarsHash } from '../d1-ranked-preemption/data.ts';
import { type Sealed, readSealed } from '../d1-ranked-preemption/freeze.ts';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import {
  type Fold,
  type FoldKey,
  type PoolKey,
  type SourceWindow,
  type TripleKey,
  dataRoot,
  folds,
  protocolFreezeFile,
  readJson,
  resultFile,
  source,
  study,
  testData,
  testRoot,
  triples
} from './context.ts';
import { assertStamped, requireCodeFrozen } from './freeze.ts';

export interface UniverseRecord {
  eligible: string[];
  symbols: Record<string, { eligible: boolean; cohort: string; dataSha256: string; reasons: string[] }>;
}

export const eligibleSymbols = async (): Promise<string[]> => {
  const record = await readJson<UniverseRecord>(source.universeFile);

  if (!Array.isArray(record.eligible) || record.eligible.length !== 61) {
    throw new Error(`${source.universeFile}: expected 61 eligible symbols`);
  }

  return [...record.eligible].sort();
};

export const selectionFile = (fold: FoldKey) => resultFile('libraries', fold, 'SELECTION.json');
export const nestedSelectionFile = (triple: TripleKey) => resultFile('nested', triple, 'SELECTION.json');

export interface DoorRecord {
  door: string;
  fold: string;
  endDate: string;
  firstDate: string;
  lastDate: string;
  sessions: number;
  eligibilityDate: string;
  symbols: number;
  dataSha256: Record<string, string>;
  loadedBarsSha256: Record<string, string>;
  digest: string; // sha256 of the per-symbol loaded-bars hashes
}

export const doorRecordOf = (door: string, fold: string, endDate: string, loaded: LoadedUniverse): DoorRecord => {
  const symbols = Object.keys(loaded.universe.instruments).sort();
  const loadedBarsSha256 = Object.fromEntries(symbols.map((symbol) => [symbol, loadedBarsHash(loaded, symbol)]));

  return {
    door,
    fold,
    endDate,
    firstDate: loaded.universe.dates[0]!,
    lastDate: loaded.universe.end,
    sessions: loaded.universe.sessionCount,
    eligibilityDate: loaded.universe.dates[loaded.universe.eligibilityIndex]!,
    symbols: symbols.length,
    dataSha256: Object.fromEntries(symbols.map((symbol) => [symbol, loaded.universe.instruments[symbol]!.hash])),
    loadedBarsSha256,
    digest: createHash('sha256').update(JSON.stringify(loadedBarsSha256)).digest('hex')
  };
};

const assertAudited = async (loaded: LoadedUniverse) => {
  if (testData) {
    return; // synthetic fixture data in the OS temporary directory (tests only)
  }

  const record = await readJson<UniverseRecord>(source.universeFile);

  for (const [symbol, window] of Object.entries(loaded.windows)) {
    const expected = record.symbols[symbol]?.dataSha256;

    if (!expected || window.dataSha256 !== expected) {
      throw new Error(
        `${symbol}: the canonical file does not hash to the audited ${expected?.slice(0, 12) ?? '(none)'}`
      );
    }
  }
};

const assertShape = (loaded: LoadedUniverse, end: string, label: string) => {
  const universe = loaded.universe;

  if (universe.dates[0] !== study.firstSession) {
    throw new Error(`${label}: the universe starts ${universe.dates[0]}, not ${study.firstSession}`);
  }

  if (universe.end > end || universe.dates.at(-1)! > end) {
    throw new Error(`${label}: the universe ends ${universe.end}, after its authorized ${end}`);
  }

  for (const [symbol, instrument] of Object.entries(universe.instruments)) {
    if (instrument.ds.lastDate > end) {
      throw new Error(`${label}: ${symbol} has bars after ${end}`);
    }
  }

  if (universe.dates[universe.eligibilityIndex] !== study.armingDate) {
    throw new Error(`${label}: the first eligible session is ${universe.dates[universe.eligibilityIndex]}`);
  }
};

export const isSealedFile = async (file: string) =>
  (await fs.pathExists(file)) &&
  (await readSealed(file).then(
    () => true,
    () => false
  ));

const freezeBody = async () =>
  (await fs.pathExists(protocolFreezeFile)) ? (await readSealed(protocolFreezeFile)).bodyHash : undefined;

// A fold's sealed SELECTION verifies, is that fold's, was built on the fold's training door and, outside the tests,
// under the current protocol freeze.
export const verifiedSelection = async (fold: FoldKey) => {
  const file = selectionFile(fold);

  if (!(await isSealedFile(file))) {
    return undefined;
  }

  const record = await readSealed<
    Sealed & { fold?: string; door?: { lastDate?: string; door?: string }; guard?: { protocolBody?: string } }
  >(file);
  const body = await freezeBody();

  if (
    record.fold !== fold ||
    record.door?.lastDate !== folds[fold].cutoff ||
    (!testRoot && record.door?.door !== 'training')
  ) {
    throw new Error(`${file} is not fold ${fold}'s selection on its training door`);
  }

  if (!testRoot && record.guard?.protocolBody !== body) {
    throw new Error(`${file} was not sealed under the current protocol freeze`);
  }

  await assertStamped(file, record as never);

  return { file, bodyHash: record.bodyHash };
};

export const verifiedNested = async (triple: TripleKey) => {
  const file = nestedSelectionFile(triple);

  if (!(await isSealedFile(file))) {
    return undefined;
  }

  const record = await readSealed<Sealed & { triple?: string; guard?: { protocolBody?: string } }>(file);

  if (record.triple !== triple || (!testRoot && record.guard?.protocolBody !== (await freezeBody()))) {
    throw new Error(`${file} is not ${triple}'s nested selection under the current protocol freeze`);
  }

  await assertStamped(file, record as never);

  return { file, bodyHash: record.bodyHash };
};

// The calendar door (PROTOCOL.md §3.4, §8.2): a load ending at E refuses unless every fold SELECTION whose cutoff is
// before E and every nested SELECTION whose selection end is before E is sealed and verifies — the paired designs make
// a later cutoff's training figures an earlier fold's evaluation figures, so no later bar opens before every earlier
// choice is sealed. Returns the seals it verified (stamped into each stage record).
export const assertCalendar = async (end: string) => {
  const verified: { file: string; bodyHash: string }[] = [];
  const missing: string[] = [];

  for (const fold of Object.values(folds)) {
    if (fold.cutoff < end) {
      const seal = await verifiedSelection(fold.key);

      if (seal) {
        verified.push(seal);
      } else {
        missing.push(selectionFile(fold.key));
      }
    }
  }

  for (const triple of Object.values(triples)) {
    if (triple.selectionEnd < end) {
      const seal = await verifiedNested(triple.key);

      if (seal) {
        verified.push(seal);
      } else {
        missing.push(nestedSelectionFile(triple.key));
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`the calendar door refuses a load through ${end}: not yet sealed ${missing.join(', ')}`);
  }

  return verified;
};

const load = async (members: readonly string[], end: string, access: 'optimization' | 'manual evaluation') => {
  if (end > study.researchCap) {
    throw new Error(`no bar after ${study.researchCap} is read in this study: ${end} refused`);
  }

  const seals = await assertCalendar(end);
  const loaded = await loadNUniverse({
    members: [...new Set(members)].sort(),
    partition: 'training',
    access,
    warmupSessions: 0,
    endDate: end,
    root: dataRoot
  });

  return { loaded, seals };
};

// The training door of a fold: through its cutoff only; for folds A and B the loaded bars must equal the source's own
// Stage A door records.
export const trainingUniverse = async (fold: FoldKey, members?: readonly string[]) => {
  const spec: Fold = folds[fold];
  const symbols = members ?? (await eligibleSymbols());
  const { loaded, seals } = await load(symbols, spec.cutoff, 'optimization');

  assertShape(loaded, spec.cutoff, `training door ${fold}`);

  if (loaded.universe.end !== spec.cutoff) {
    throw new Error(`training door ${fold}: the universe ends ${loaded.universe.end}, not the cutoff ${spec.cutoff}`);
  }

  await assertAudited(loaded);

  const door = doorRecordOf('training', fold, spec.cutoff, loaded);

  if (spec.sourceWindow && !testData) {
    const stageA = await readSealed<Sealed & { door: { barsSha256: Record<string, string> } }>(
      source.stageA(spec.sourceWindow)
    );

    for (const [symbol, hash] of Object.entries(door.loadedBarsSha256)) {
      if (stageA.door.barsSha256[symbol] !== hash) {
        throw new Error(`${symbol}: fold ${fold}'s loaded training bars differ from the source's Stage A door`);
      }
    }
  }

  return { loaded, door: { ...door, seals } };
};

// A source window's own training span, for the archive reconstruction and census only: fold-a and fold-b are folds A
// and B; the final window is read through its own search end (2023-12-29), is never a fold of this study, and by the
// calendar door opens only after every selection is sealed.
export const sourceTrainingUniverse = async (window: SourceWindow) => {
  if (window === 'fold-a') {
    return trainingUniverse('A');
  }

  if (window === 'fold-b') {
    return trainingUniverse('B');
  }

  const end = source.evaluationCap.final;
  const { loaded, seals } = await load(await eligibleSymbols(), end, 'optimization');

  assertShape(loaded, end, 'source training door final');
  await assertAudited(loaded);

  const door = doorRecordOf('source-training', 'final', end, loaded);
  const stageA = await readSealed<Sealed & { door: { barsSha256: Record<string, string> } }>(source.stageA('final'));

  for (const [symbol, hash] of Object.entries(door.loadedBarsSha256)) {
    if (stageA.door.barsSha256[symbol] !== hash) {
      throw new Error(`${symbol}: the final window's loaded bars differ from the source's Stage A door`);
    }
  }

  return { loaded, door: { ...door, seals } };
};

// The latest date a source (archived) vector of a window may be evaluated on. Doors apply per provenance row
// (window, stage, row): the same grid evaluated under another provenance is another row, and no figure computed
// under one provenance is ever attributed to another (PROTOCOL.md §3.4).
export const sourceCap = (window: SourceWindow, end: string) => {
  if (window === 'final') {
    throw new Error('a final-window source vector is never evaluated in this study');
  }

  if (end > source.evaluationCap[window]) {
    throw new Error(
      `${window} source vectors may be evaluated through ${source.evaluationCap[window]} only (their own door): ${end} refused`
    );
  }
};

export interface DoorCandidate {
  symbol: string;
  key: string;
  provenance: 'archive' | 'new' | 'reference';
  pools: readonly PoolKey[];
  window?: SourceWindow; // an archived row's source window (it must be the fold's own)
}

// The evaluation door: the calendar door, the fold's own sealed SELECTION for any date after its cutoff, a triple's
// sealed nested SELECTION for any date after its selection end; each candidate's provenance: an archived row only
// within its source window's door and only from the fold's own archive, a triple's later window only for the
// triple's pools; the code freeze (outside the tests).
export const evaluationUniverse = async (
  fold: FoldKey,
  end: string,
  members: readonly string[],
  candidates: readonly DoorCandidate[] = []
) => {
  const spec = folds[fold];

  if (end > study.researchCap) {
    throw new Error(`no bar after ${study.researchCap} is read in this study: ${end} refused`);
  }

  if (!testRoot) {
    await requireCodeFrozen();
  }

  if (end > spec.cutoff && !(await verifiedSelection(fold))) {
    throw new Error(`fold ${fold}: nothing after ${spec.cutoff} opens before its sealed ${selectionFile(fold)}`);
  }

  const laterTriples = Object.values(triples).filter((t) => t.fold === fold && end > t.selectionEnd);

  for (const triple of laterTriples) {
    if (!(await verifiedNested(triple.key))) {
      throw new Error(
        `${triple.key}: nothing after ${triple.selectionEnd} opens for fold ${fold} before its sealed nested selection`
      );
    }
  }

  if (end > spec.evaluationEnd && !Object.values(triples).some((t) => t.fold === fold && end <= t.laterEnd)) {
    throw new Error(`fold ${fold} is evaluated through ${spec.evaluationEnd} only: ${end} refused`);
  }

  for (const candidate of candidates) {
    if (candidate.provenance === 'archive') {
      if (!spec.sourceWindow || (candidate.window && candidate.window !== spec.sourceWindow)) {
        throw new Error(`${candidate.symbol} ${candidate.key}: not an archived row of fold ${fold}'s own archive`);
      }

      sourceCap(spec.sourceWindow, end);
    }

    if (end > spec.evaluationEnd) {
      const allowed = laterTriples.flatMap((t) => t.pools);

      if (candidate.provenance !== 'reference' && !candidate.pools.every((pool) => allowed.includes(pool))) {
        throw new Error(
          `${candidate.symbol} ${candidate.key}: pools ${candidate.pools.join(' ')} are not the later window's ${allowed.join(' ')}`
        );
      }
    }
  }

  const { loaded, seals } = await load(members, end, 'manual evaluation');

  assertShape(loaded, end, `evaluation door ${fold}`);
  await assertAudited(loaded);

  return { loaded, door: { ...doorRecordOf('evaluation', fold, end, loaded), seals } };
};

export { loadedBarsHash };
