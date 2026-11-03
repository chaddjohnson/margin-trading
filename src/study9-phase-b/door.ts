// The Phase B data doors (PROTOCOL.md §3.2). Every strategy result of the study is computed on a universe opened here,
// and every opening is appended to results/doors.jsonl with the chain head it saw.
//
//   pilot            projection, end 2024-12-31 (pre-freeze timing only)
//   parity*          projection (or the leakage-test copy), any end ≤ 2024-12-31
//   search-<fold>    projection, end = the fold's training end (search and in-sample qualification)
//   test-F19…F23     projection, end = the fold's test end (all ≤ 2024-12-31)
//   test-F24         canonical files, end 2026-10-29 (the one-time primary evaluation)
//   slice            canonical files, end 2026-10-30 (after test-F24-confirm; report-only)
//   post             canonical files, end 2026-10-29 (after test-F24-confirm; report-only analyses)
//
// The door refuses any other root or end before a byte is read, loads through the repository loader with an explicit
// end date (the `all` partition; loader label 'manual evaluation', the only one it accepts there; the log's `purpose`
// states the real purpose), books no distributions (the fixed one-slot engine books none, so the user's modified
// distributions.csv enters no computation), and asserts its first session, its arming session and that no loaded
// session lies after its end. Its id hashes each member file's byte prefix through the end, so appending later bars to
// a file changes no id and no cache key (parity gate N2 proves it).
import path from 'node:path';
import fs from 'fs-extra';
import { splitsSha256 } from '../portfolio-aware-d1/data.ts';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { emptyLedger, prefixHash } from '../study9-etf-pool-discovery/door.ts';
import {
  type FoldKey,
  allSymbols,
  canonicalRoot,
  doorsLog,
  evaluationEnd,
  execution,
  firstSession,
  folds,
  foldKeys,
  nowIso,
  projectionEnd,
  projectionRoot,
  sliceDate,
  smoke
} from './context.ts';
import { doorGate } from './gates.ts';
import { chainHead, readChain, sha256 } from './records.ts';

export const leakRoot = 'data/vintages/study9b-leakage-test';

export interface P9Door {
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

// The root and end a door key may use; `requested` is the end asked for by parity/smoke doors only.
export const doorSpecOf = (key: string, requested?: string): { root: string; end: string; exact: boolean } => {
  if (key === 'pilot') return { root: projectionRoot, end: projectionEnd, exact: false };
  if (key.startsWith('parity') || key.startsWith('smoke-')) {
    const end = requested ?? projectionEnd;

    if (!(end <= projectionEnd)) throw new Error(`door ${key} refused: end ${end} is after ${projectionEnd}`);
    return { root: projectionRoot, end, exact: false };
  }
  if (key.startsWith('search-')) {
    const fold = key.slice('search-'.length) as FoldKey;

    if (!(foldKeys as readonly string[]).includes(fold)) throw new Error(`unknown door ${key}`);
    return { root: projectionRoot, end: folds[fold].trainEnd, exact: false };
  }
  if (key.startsWith('test-')) {
    const fold = key.slice('test-'.length) as FoldKey;

    if (!(foldKeys as readonly string[]).includes(fold)) throw new Error(`unknown door ${key}`);
    if (fold === 'F24') return { root: canonicalRoot, end: evaluationEnd, exact: true };
    return { root: projectionRoot, end: folds[fold].testEnd, exact: false };
  }
  if (key === 'slice') return { root: canonicalRoot, end: sliceDate, exact: true };
  if (key === 'post') return { root: canonicalRoot, end: evaluationEnd, exact: true };

  throw new Error(`unknown door ${key}`);
};

export const openDoor = async (
  asked: string,
  members: readonly string[],
  purpose: string,
  { end: requested, root: rootOverride }: { end?: string; root?: string } = {}
): Promise<P9Door> => {
  // smoke mode (pre-freeze code-path tests): every door becomes a smoke door on the projection, never past 2024
  const base = doorSpecOf(asked, asked.startsWith('parity') || asked.startsWith('smoke-') ? requested : undefined);
  const key = smoke && !asked.startsWith('smoke-') ? `smoke-${asked}` : asked;

  if (smoke && base.root !== projectionRoot) throw new Error(`smoke mode: door ${asked} reads beyond the projection`);

  const spec = smoke ? { root: projectionRoot, end: base.end, exact: false } : base;

  if (requested && !(asked.startsWith('parity') || asked.startsWith('smoke-')))
    throw new Error(`door ${key} has a fixed end; an end is not accepted`);
  if (rootOverride && !(key.startsWith('parity') && path.normalize(rootOverride).startsWith(leakRoot)))
    throw new Error(`door ${key}: only parity doors may read the leakage-test copy`);
  if (new Set(members).size !== members.length || members.length === 0) throw new Error('door: bad member list');

  const foreign = members.filter((symbol) => !allSymbols.includes(symbol));

  if (foreign.length) throw new Error(`door ${key}: ${foreign.join(' ')} outside the study's symbols`);

  const root = rootOverride ?? spec.root;
  const { end } = spec;

  // the training doors never see a byte after 2024-12-31: their root physically ends there
  if (root !== canonicalRoot && !(end <= projectionEnd))
    throw new Error(`door ${key}: end ${end} beyond the projection`);
  if (root === canonicalRoot && !(end > projectionEnd))
    throw new Error(`door ${key}: the canonical root is for test-F24 and later`);

  await doorGate(key);

  const prefixSha256: Record<string, string> = {};

  for (const symbol of [...members].sort()) {
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

  if (last > end) throw new Error(`door ${key}: loaded ${last}, after its end ${end}`);
  if (spec.exact && last !== end) throw new Error(`door ${key}: the history ends ${last}, not ${end}`);
  if (dates[0] !== firstSession) throw new Error(`door ${key}: first session ${dates[0]} ≠ ${firstSession}`);

  // review M3: every instrument individually ends on or before the door's end, its last bar inside its last session
  for (const symbol of members) {
    const ds = loaded.universe.instruments[symbol]!.ds;

    if (ds.lastDate > end) throw new Error(`door ${key}: ${symbol} loaded through ${ds.lastDate}, after ${end}`);
    if (ds.bTime[ds.barCount - 1]! > ds.sCloseTime[ds.sessionCount - 1]!)
      throw new Error(`door ${key}: ${symbol} has a bar after its last session's close`);
  }
  if (dates[eligibilityIndex] !== execution.eligibilityDate)
    throw new Error(`door ${key}: arming session ${dates[eligibilityIndex]} ≠ ${execution.eligibilityDate}`);

  const partitionsSha256 = sha256(await fs.readFile(path.join(root, 'partitions.json')));
  const id = sha256(
    JSON.stringify({
      members: [...members].sort(),
      first: dates[0],
      last,
      prefixSha256,
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
    chainHead: smoke ? null : chainHead(await readChain()),
    pid: process.pid
  };

  if (!path.normalize(root).startsWith(leakRoot)) {
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
