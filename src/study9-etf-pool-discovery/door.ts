// The Phase A data door (PROTOCOL.md §4). Every strategy computation of the study runs on a universe opened here:
//
//   - the root is the physically truncated training projection (data/vintages/study9-train-2024), never data/; the
//     only other root accepted is a leakage-test copy under data/vintages/study9-leakage-test (parity gate N2);
//   - the end is a New York date ≤ 2024-12-31 (the door refuses anything later before a byte is read), loaded through
//     the repository loader with an explicit end date (the `all` partition; loader access label 'manual evaluation',
//     the only label it accepts there — the door log's `purpose` states the real purpose);
//   - the door asserts its first session (2016-01-04), its eligibility session (2017-06-15) and that no loaded session
//     lies after its end;
//   - no distribution ledger is loaded: the fixed one-slot engine books no distributions (only its portfolio mode
//     does), so the user's modified config/market-events/distributions.csv cannot enter any computation;
//   - the door id hashes the bytes actually loaded (each file's prefix through the end date), not whole files, so
//     appending later bars to a file leaves every id and cache key unchanged (gate N2 proves it).
//
// Every opening is appended to results/doors.jsonl.
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { splitsSha256 } from '../portfolio-aware-d1/data.ts';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import type { DistributionLedger } from '../multi-etf-allocator/dataset.ts';
import { doorsLog, execution, firstSession, nowIso, projectionRoot, trainEnd } from './context.ts';
import { prefixLengthThrough } from './s0.ts';

export const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

export const emptyLedger: DistributionLedger = {
  file: 'none (fixed one-slot mode books no distributions)',
  sha256: 'none',
  distributions: [],
  coverage: { VGT: '0000-00-00', VOOG: '0000-00-00' }
};

export interface S9Door {
  key: string;
  window: string;
  purpose: string;
  root: string;
  end: string;
  loaded: LoadedUniverse;
  members: string[];
  dates: string[];
  lastIndex: number;
  eligibilityIndex: number;
  prefixSha256: Record<string, string>;
  id: string;
  indexOf: (date: string) => number;
  lastIndexOn: (date: string) => number;
}

const testRootPrefix = 'data/vintages/study9-leakage-test';

// The sha256 of a file's bytes through the last row of New York date `end`.
export const prefixHash = async (file: string, end: string) => {
  const bytes = await fs.readFile(file);
  const cut = prefixLengthThrough(bytes, end);

  return { sha256: sha256(bytes.subarray(0, cut.bytes)), bytes: cut.bytes, fileBytes: bytes.length };
};

export const openDoor = async (
  members: readonly string[],
  purpose: string,
  { end = trainEnd, root = projectionRoot, key = 'train' }: { end?: string; root?: string; key?: string } = {}
): Promise<S9Door> => {
  if (!(end <= trainEnd)) throw new Error(`door refused: end ${end} is after the Phase A training end ${trainEnd}`);
  if (path.normalize(root) !== path.normalize(projectionRoot) && !path.normalize(root).startsWith(testRootPrefix)) {
    throw new Error(`door refused: root ${root} is neither the training projection nor a leakage-test copy`);
  }
  if (new Set(members).size !== members.length || members.length === 0) throw new Error('door: bad member list');

  const prefixSha256: Record<string, string> = {};

  for (const symbol of members) {
    prefixSha256[symbol] = (await prefixHash(path.join(root, symbol, 'data.csv'), end)).sha256;
  }

  const loaded = await loadNUniverse({
    members: [...members],
    partition: 'all',
    access: 'manual evaluation',
    warmupSessions: 0,
    endDate: end,
    root,
    ledger: emptyLedger
  });
  const { dates, eligibilityIndex } = loaded.universe;
  const last = dates[dates.length - 1]!;

  if (last > end) throw new Error(`door: loaded ${last}, after its end ${end}`);
  if (dates[0] !== firstSession) throw new Error(`door: first session ${dates[0]} ≠ ${firstSession}`);
  if (dates[eligibilityIndex] !== execution.eligibilityDate) {
    throw new Error(`door: eligibility session ${dates[eligibilityIndex]} ≠ ${execution.eligibilityDate}`);
  }

  const partitionsSha256 = sha256(await fs.readFile(path.join(root, 'partitions.json')));
  const id = sha256(
    JSON.stringify({
      members: [...members].sort(),
      first: dates[0],
      last,
      prefixSha256: Object.fromEntries(Object.entries(prefixSha256).sort(([a], [b]) => a.localeCompare(b))),
      splits: splitsSha256(),
      partitions: partitionsSha256,
      ledger: emptyLedger.sha256
    })
  ).slice(0, 24);
  const entry = {
    at: nowIso(),
    door: key,
    purpose,
    root,
    end,
    members,
    firstDate: dates[0],
    lastDate: last,
    sessions: dates.length,
    id,
    pid: process.pid
  };

  if (path.normalize(root) === path.normalize(projectionRoot)) {
    await fs.ensureFile(doorsLog);
    await fs.appendFile(doorsLog, `${JSON.stringify(entry)}\n`);
  }

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
    window: `end ${end}`,
    purpose,
    root,
    end,
    loaded,
    members: [...members],
    dates,
    lastIndex: dates.length - 1,
    eligibilityIndex,
    prefixSha256,
    id,
    indexOf,
    lastIndexOn
  };
};
