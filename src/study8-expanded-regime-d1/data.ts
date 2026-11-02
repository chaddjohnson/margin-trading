// The Study 8 data doors (PROTOCOL.md §3.2). Every strategy result of the study is computed on a universe opened here,
// and every opening is appended to results/doors.jsonl. A door loads data only up to its own last session, so no bar
// after a fold's cutoff exists in a search process or its caches. Doors ending on or before 2023-12-31 load the
// repository's training partition with access 'optimization'; doors ending in 2024 or later load the `all` partition
// with an explicit end date (the brief authorizes optimization on 2016–2024) and the door asserts the last loaded
// session. Each door key's precondition (gates.ts doorGate) is checked before any bar is read.
import fs from 'fs-extra';
import { splitsSha256 } from '../portfolio-aware-d1/data.ts';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { sealBody, sha256, verifySealed } from '../study5-gdx-b5-three-etf/data.ts';
import { type FoldKey, type WindowKey, bookOrder, doorsLog, execution, folds, windows } from './context.ts';
import { doorGate } from './gates.ts';
import { chainHead, fileSha256, readChain } from './records.ts';

export { sealBody, sha256, verifySealed };

export type DoorKey = 'pilot-F24' | 'parity' | 'parity-cut' | 'parity-F19' | `search-${FoldKey}` | `test-${FoldKey}`;

export interface Door {
  key: DoorKey;
  window: string;
  purpose: string;
  loaded: LoadedUniverse;
  members: string[];
  dates: string[];
  lastIndex: number;
  eligibilityIndex: number;
  id: string;
  indexOf: (date: string) => number;
  lastIndexOn: (date: string) => number;
}

const partitionFor = (end: string | undefined) => (end && end <= '2023-12-31' ? 'training' : 'all');

export const doorSpecOf = (key: DoorKey): { end?: string; anyWindow?: boolean } => {
  if (key === 'pilot-F24' || key === 'parity-cut') return { end: windows.W24 };
  if (key === 'parity-F19') return { end: folds.F19.trainEnd };
  if (key === 'parity') return { anyWindow: true };

  const [kind, fold] = key.split('-') as ['search' | 'test', FoldKey];
  const spec = folds[fold];

  if (!spec) throw new Error(`unknown door ${key}`);
  if (kind === 'search') return { end: spec.trainEnd };
  if (fold === 'F24') return {}; // the final door: the full history to 2026-10-29

  return { end: spec.testEnd };
};

export const assertFive = (symbols: readonly string[]) => {
  const bad = symbols.filter((symbol) => !(bookOrder as readonly string[]).includes(symbol));

  if (bad.length || new Set(symbols).size !== symbols.length || symbols.length === 0) {
    throw new Error(`universe guard: ${symbols.join(' ')} is not a subset of ${bookOrder.join(' ')}`);
  }
};

export const openDoor = async (
  key: DoorKey,
  members: readonly string[],
  purpose: string,
  { windowKey }: { windowKey?: WindowKey } = {}
): Promise<Door> => {
  const spec = doorSpecOf(key);

  assertFive(members);
  await doorGate(key);

  if (windowKey && !spec.anyWindow) throw new Error(`door ${key} has a fixed end; a window is not accepted`);

  const end = spec.end ?? (windowKey && windowKey !== 'W29' ? windows[windowKey] : undefined);
  const partition = partitionFor(end);
  // the repository loader's access label (it only accepts 'optimization' on the training partition); the door's real
  // purpose is the `purpose` field of the door log
  const loaderAccess = partition === 'training' ? 'optimization' : 'manual evaluation';
  const partitionsSha256 = await fileSha256('data/partitions.json');
  const loaded: LoadedUniverse = await loadNUniverse({
    members: [...members],
    partition,
    access: loaderAccess,
    warmupSessions: 0,
    ...(end ? { endDate: end } : {})
  });
  const { dates, eligibilityIndex } = loaded.universe;
  const last = dates[dates.length - 1]!;

  if (end && last > end) throw new Error(`door ${key}: loaded ${last}, after its end ${end}`);
  if (dates[eligibilityIndex] !== execution.eligibilityDate) {
    throw new Error(`door ${key}: eligibility session ${dates[eligibilityIndex]} ≠ ${execution.eligibilityDate}`);
  }
  if (!end && last !== windows.W29) throw new Error(`door ${key}: the full history ends ${last}, not ${windows.W29}`);

  const dataSha256 = Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!.hash]));
  const entry = {
    at: new Date().toISOString(),
    door: key,
    window: windowKey ?? (end ? `end ${end}` : 'W29'),
    purpose,
    partition,
    loaderAccess,
    end: end ?? null,
    members,
    firstDate: dates[0],
    lastDate: last,
    sessions: dates.length,
    dataSha256,
    distributionLedgerSha256: loaded.distributions.sha256,
    partitionsSha256,
    chainHead: chainHead(await readChain()),
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

    for (let i = 0; i < dates.length && dates[i]! <= date; i++) index = i;

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
        partition,
        first: dates[0],
        last,
        dataSha256,
        splits: splitsSha256(),
        distributions: loaded.distributions.sha256,
        partitions: partitionsSha256
      })
    ).slice(0, 24),
    indexOf,
    lastIndexOn
  };
};
