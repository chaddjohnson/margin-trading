// The Study 7 data doors (PROTOCOL.md §4.2). Every strategy result of the study is computed on a universe opened here,
// and every opening is appended to results/doors.jsonl. Search and fold-test doors load the repository's training
// partition with access 'optimization' and an end date, so no bar after the door's end exists in the process. A fold's
// test door opens only after that fold's sealed shortlist exists; `diag` (Phase A) and `final` load the full history,
// and `final` is refused unless FROZEN_SELECTION.json exists and its body hash verifies.
import fs from 'fs-extra';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { splitsSha256 } from '../portfolio-aware-d1/data.ts';
import { sealBody, sha256, verifySealed } from '../study5-gdx-b5-three-etf/data.ts';
import { type FoldKey, type WindowKey, bookOrder, doorsLog, execution, folds, frozenSelectionFile, windows } from './context.ts';
import { doorGate } from './gates.ts';

export { sealBody, sha256, verifySealed };

export type DoorKey =
  | 'pilot'
  | 'smoke-F19'
  | 'parity'
  | 'parity-M'
  | 'parity-F19'
  | 'diag'
  | `search-${FoldKey}`
  | `test-${FoldKey}`
  | 'final';

export interface Door {
  key: DoorKey;
  window: string;
  purpose: string;
  loaded: LoadedUniverse;
  members: string[];
  dates: string[];
  lastIndex: number;
  eligibilityIndex: number;
  id: string; // identity of the loaded data (members, partition, end, data hashes): part of every cache key
  indexOf: (date: string) => number; // first session on or after the date
  lastIndexOn: (date: string) => number; // last session on or before the date
}

const specOf = (key: DoorKey): { partition: 'all' | 'training'; end?: string } => {
  if (key === 'pilot' || key === 'parity-M') return { partition: 'training', end: windows.WDEV };
  if (key === 'smoke-F19' || key === 'parity-F19') return { partition: 'training', end: folds.F19.trainEnd };
  if (key === 'diag' || key === 'final' || key === 'parity') return { partition: 'all' };

  const [kind, fold] = key.split('-') as ['search' | 'test', FoldKey];
  const spec = folds[fold];

  if (!spec) throw new Error(`unknown door ${key}`);
  if (kind === 'search') return { partition: 'training', end: spec.trainEnd };
  if (fold === 'L') throw new Error('fold L has no pre-final test door (its test window is read only by the final door)');

  return { partition: 'training', end: spec.testEnd };
};

export const readVerifiedSelection = async () => {
  if (!(await fs.pathExists(frozenSelectionFile))) {
    throw new Error(`the final door is closed: ${frozenSelectionFile} does not exist (run freeze-selection first)`);
  }

  const manifest = (await fs.readJson(frozenSelectionFile)) as Record<string, unknown>;

  if (!verifySealed(manifest)) {
    throw new Error(`the final door is closed: ${frozenSelectionFile}'s body hash does not verify`);
  }

  return manifest;
};

// Every configuration of this study is a subset of the B5 universe.
export const assertFive = (symbols: readonly string[]) => {
  const bad = symbols.filter((symbol) => !(bookOrder as readonly string[]).includes(symbol));

  if (bad.length || new Set(symbols).size !== symbols.length || symbols.length === 0) {
    throw new Error(`universe guard: ${symbols.join(' ')} is not a subset of ${bookOrder.join(' ')}`);
  }
};

// `windowKey` narrows the diag, parity and final doors to a truncated run; search/test doors have fixed ends. The door
// key's own precondition (gates.ts doorGate) is checked before any data is read; `gate` adds a caller's precondition.
export const openDoor = async (
  key: DoorKey,
  members: readonly string[],
  purpose: string,
  { windowKey, gate }: { windowKey?: WindowKey; gate?: () => Promise<unknown> } = {}
): Promise<Door> => {
  const spec = specOf(key);

  assertFive(members);

  await doorGate(key);

  if (key === 'final') {
    await readVerifiedSelection();
  }

  if (gate) {
    await gate();
  }

  if (windowKey && spec.end) {
    throw new Error(`door ${key} has a fixed end ${spec.end}; a window is not accepted`);
  }

  const end = spec.end ?? (windowKey && windowKey !== 'W29' ? windows[windowKey] : undefined);
  const loaded: LoadedUniverse = await loadNUniverse({
    members: [...members],
    partition: spec.partition,
    access: spec.partition === 'training' ? 'optimization' : 'manual evaluation',
    warmupSessions: 0,
    ...(end ? { endDate: end } : {})
  });
  const { dates, eligibilityIndex } = loaded.universe;
  const last = dates[dates.length - 1]!;

  if (end && last > end) {
    throw new Error(`door ${key}: loaded ${last}, after its end ${end}`);
  }

  if (dates[eligibilityIndex] !== execution.eligibilityDate) {
    throw new Error(`door ${key}: eligibility session ${dates[eligibilityIndex]} ≠ ${execution.eligibilityDate}`);
  }

  if (!end && last !== windows.W29) {
    throw new Error(`door ${key}: the full history ends ${last}, not ${windows.W29} (the audited data)`);
  }

  const dataSha256 = Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!.hash]));
  const entry = {
    at: new Date().toISOString(),
    door: key,
    window: windowKey ?? (end ? `end ${end}` : 'W29'),
    purpose,
    partition: spec.partition,
    end: end ?? null,
    members,
    firstDate: dates[0],
    lastDate: last,
    sessions: dates.length,
    dataSha256,
    distributionLedgerSha256: loaded.distributions.sha256,
    pid: process.pid
  };

  await fs.ensureFile(doorsLog);
  await fs.appendFile(doorsLog, `${JSON.stringify(entry)}\n`);

  const indexOf = (date: string) => {
    const index = dates.findIndex((day) => day >= date);

    return index < 0 ? dates.length : index;
  };
  const lastIndexOn = (date: string) => {
    let index = -1;

    for (let i = 0; i < dates.length && dates[i]! <= date; i++) {
      index = i;
    }

    return index;
  };

  return {
    key,
    window: entry.window,
    purpose,
    loaded,
    members: [...members],
    dates,
    lastIndex: dates.length - 1,
    eligibilityIndex,
    id: sha256(
      JSON.stringify({
        members: [...members].sort(),
        partition: spec.partition,
        first: dates[0],
        last,
        dataSha256,
        splits: splitsSha256(),
        distributions: loaded.distributions.sha256
      })
    ).slice(0, 24),
    indexOf,
    lastIndexOn
  };
};
