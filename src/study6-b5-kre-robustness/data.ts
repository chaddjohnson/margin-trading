// The Study 6 data doors (PROTOCOL.md §10.1). Every strategy result of the study is computed on a universe opened
// here, and every opening is appended to results/doors.jsonl. `diag` is Part A's (any window of the full history);
// the search and validation doors load the repository's training partition with access 'optimization' and an end
// date, so no bar after the door's end exists in the process; `final` is refused unless FROZEN_SELECTION.json exists
// and its body hash verifies. The doors return the Study 5 evaluator's Door shape (src/study5-gdx-b5-three-etf/data.ts),
// so the unchanged Study 5 Evaluator runs on them.
import fs from 'fs-extra';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { type Door as Study5Door, sealBody, sha256, verifySealed } from '../study5-gdx-b5-three-etf/data.ts';
import { type WindowKey, bookOrder, doorsLog, execution, frozenSelectionFile, windows } from './context.ts';

export { sealBody, sha256, verifySealed };

export type DoorKey = 'diag' | 'search-wf19' | 'search-wf20' | 'search' | 'validation' | 'final';

const doorSpecs: Record<DoorKey, { partition: 'all' | 'training'; end?: string }> = {
  diag: { partition: 'all' },
  'search-wf19': { partition: 'training', end: '2019-12-31' },
  'search-wf20': { partition: 'training', end: '2020-12-31' },
  search: { partition: 'training', end: '2021-12-31' },
  validation: { partition: 'training', end: '2023-12-29' },
  final: { partition: 'all' }
};

export type Door = Study5Door & { study6Key: DoorKey; window: string };

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

// The five-ETF guard: every pool of this study is a subset of the B5 universe (ablations and single books included).
export const assertFive = (symbols: readonly string[]) => {
  const bad = symbols.filter((symbol) => !(bookOrder as readonly string[]).includes(symbol));

  if (bad.length || new Set(symbols).size !== symbols.length || symbols.length === 0) {
    throw new Error(`universe guard: ${symbols.join(' ')} is not a subset of ${bookOrder.join(' ')}`);
  }
};

// `endDate` narrows the diag and final doors to a window (W13, W23, WDEV); the Part B doors have fixed ends.
export const openDoor = async (
  key: DoorKey,
  members: readonly string[],
  purpose: string,
  windowKey?: WindowKey
): Promise<Door> => {
  const spec = doorSpecs[key];

  assertFive(members);

  if (key === 'final') {
    await readVerifiedSelection();
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
    dataSha256: Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!.hash])),
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
    key: key as unknown as Study5Door['key'],
    study6Key: key,
    window: entry.window,
    purpose,
    loaded,
    members: [...members],
    dates,
    lastIndex: dates.length - 1,
    eligibilityIndex,
    indexOf,
    lastIndexOn
  };
};
