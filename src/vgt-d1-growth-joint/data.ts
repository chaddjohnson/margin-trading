// The data doors (PROTOCOL.md §2). D19/D21/D23/D24 are physical byte prefixes of the canonical VGT minute file, each
// verified by size, sha256 and last-row time before a byte is parsed; a process searching at a cutoff opens only that
// cutoff's door. FULL (2016-01-04 → 2026-10-30, the browser's path: partition `all`, forward split adjustment) opens
// before the freeze only for the fixed controls' known parity targets, and for a joint candidate only after
// FROZEN_SELECTION.json is committed read-only with the expected sha256 (the guard). Every opening is logged.
//
// One door = one Dataset (fixtureDataset of the sessions) and one list of daily signal bars, shared by the D1 and the
// Growth virtual books of every evaluation in a process (both canonical engines build exactly these from the same
// sessions; the parity checks compare against the canonical loaders).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { MarketSession } from '#types';
import { type SignalBar, barsFromSessions } from '../entry-signals/bars.ts';
import { type Dataset, fixtureDataset } from '../four-family/data.ts';
import { resolveDataset } from '../lib/dataset.ts';
import { loadDatasetSessions } from '../lib/evaluation.ts';
import {
  type DoorName,
  type PrefixDoor,
  canonical,
  chronology,
  doorFile,
  doorLog,
  doorSpecs,
  frozenSelectionFile,
  resolution,
  symbol
} from './context.ts';

export const sha256File = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export interface Door {
  name: DoorName | `fixture:${string}`;
  history: MarketSession[];
  ds: Dataset;
  bars: SignalBar[];
  dataSha256: string;
  from: string;
  to: string;
  sessions: number;
}

const rowTime = (line: string) => line.slice(0, line.indexOf(',')).replaceAll('"', '');

// Builds every prefix door from the canonical file, byte for byte, and checks it against its pin.
export const buildDoors = () => {
  if (sha256File(canonical.file) !== canonical.sha256) throw new Error('the canonical VGT file changed');

  const text = fs.readFileSync(canonical.file);
  const out: Record<string, { bytes: number; sha256: string; lastRowUtc: string; rows: number }> = {};

  for (const [door, spec] of Object.entries(doorSpecs) as [PrefixDoor, (typeof doorSpecs)[PrefixDoor]][]) {
    const file = doorFile(door);

    if (!fs.existsSync(file)) {
      // the first row at or after the cap
      let start = 0;
      let rows = 0;

      while (start < text.length) {
        let end = text.indexOf(10, start);

        if (end < 0) end = text.length;
        if (rowTime(text.subarray(start, Math.min(end, start + 40)).toString('utf8')) >= spec.capUtc) break;
        rows++;
        start = end + 1;
      }

      if (start !== spec.bytes || rows !== spec.rows) throw new Error(`${door}: prefix ${start} bytes / ${rows} rows`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(`${file}.tmp`, text.subarray(0, start));
      fs.renameSync(`${file}.tmp`, file);
    }

    out[door] = verifyDoorFile(door);
  }

  return out;
};

export const verifyDoorFile = (door: PrefixDoor) => {
  const spec = doorSpecs[door];
  const file = doorFile(door);
  const stat = fs.statSync(file);

  if (stat.size !== spec.bytes) throw new Error(`${file}: ${stat.size} bytes, expected ${spec.bytes}`);

  const sha256 = sha256File(file);

  if (sha256 !== spec.sha256) throw new Error(`${file}: sha256 ${sha256}, expected ${spec.sha256}`);

  const tail = fs.readFileSync(file).subarray(-200).toString('utf8').trim().split('\n').at(-1)!;
  const last = rowTime(tail);

  if (last !== spec.lastRowUtc || !(last < spec.capUtc)) throw new Error(`${file}: last row ${last}`);

  return { bytes: stat.size, sha256, lastRowUtc: last, rows: spec.rows };
};

export const logDoor = (door: string, purpose: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.dirname(doorLog), { recursive: true });
  fs.appendFileSync(
    doorLog,
    `${JSON.stringify({ t: new Date().toISOString(), door, purpose, pid: process.pid, ...extra })}\n`
  );
};

const doorOf = (name: Door['name'], history: MarketSession[], dataSha256: string, from: string, to: string): Door => {
  const ds = fixtureDataset(history);

  ds.id = `${symbol}:${dataSha256.slice(0, 16)}:${ds.lastDate}`;
  ds.dataHash = dataSha256;

  return {
    name,
    history,
    ds,
    bars: barsFromSessions(history, resolution),
    dataSha256,
    from,
    to,
    sessions: history.length
  };
};

export const openPrefixDoor = async (door: PrefixDoor, purpose: string, quietLog = false): Promise<Door> => {
  const v = verifyDoorFile(door);
  const spec = doorSpecs[door];
  const loaded = await loadDatasetSessions({
    dataset: resolveDataset(symbol, doorFile(door)),
    startDate: chronology.firstSession,
    endDate: spec.last,
    warmupSessions: 0
  });

  if (loaded.warmup !== 0) throw new Error(`${door}: unexpected warm-up sessions`);
  if (loaded.history[0]!.date !== chronology.firstSession || loaded.history.at(-1)!.date !== spec.last)
    throw new Error(`${door} covers ${loaded.history[0]!.date} → ${loaded.history.at(-1)!.date}`);
  if (loaded.history.length !== spec.sessions) throw new Error(`${door}: ${loaded.history.length} sessions`);
  if (!quietLog) logDoor(door, purpose, { sha256: v.sha256 });

  return doorOf(door, loaded.history, v.sha256, chronology.firstSession, spec.last);
};

// The guard of a joint candidate on FULL: the committed, read-only frozen selection with the expected sha256.
export const checkGuard = (guard: { file: string; sha256: string }) => {
  if (path.resolve(guard.file) !== path.resolve(frozenSelectionFile)) throw new Error('FULL: wrong guard file');
  if (!fs.existsSync(guard.file)) throw new Error('FULL: the frozen selection does not exist');
  if ((fs.statSync(guard.file).mode & 0o222) !== 0) throw new Error('FULL: the frozen selection is writable');
  if (sha256File(guard.file) !== guard.sha256) throw new Error('FULL: the frozen selection sha256 differs');
};

// The FULL door (the browser's loading path). `purpose` says why it opens: 'parity' (fixed controls, known targets)
// before the freeze; anything else needs the guard.
export const openFullDoor = async (
  purpose: string,
  guard: { file: string; sha256: string } | 'parity-known-targets',
  quietLog = false
): Promise<Door> => {
  if (guard !== 'parity-known-targets') checkGuard(guard);

  const sha = sha256File(canonical.file);

  if (sha !== canonical.sha256) throw new Error(`canonical file sha256 ${sha}, expected ${canonical.sha256}`);

  const loaded = await loadDatasetSessions({
    dataset: resolveDataset(symbol, 'all'),
    startDate: chronology.firstSession,
    endDate: chronology.validationEnd,
    warmupSessions: 0,
    access: 'manual evaluation'
  });

  if (loaded.history[0]!.date !== chronology.firstSession || loaded.history.at(-1)!.date !== chronology.validationEnd)
    throw new Error(`FULL covers ${loaded.history[0]!.date} → ${loaded.history.at(-1)!.date}`);
  if (!quietLog)
    logDoor('FULL', purpose, {
      sha256: sha,
      guard: guard === 'parity-known-targets' ? guard : guard.sha256
    });

  return doorOf('FULL', loaded.history, loaded.report!.dataSha256!, chronology.firstSession, chronology.validationEnd);
};

export const openDoor = (name: DoorName, purpose: string, guard?: { file: string; sha256: string }) =>
  name === 'FULL' ? openFullDoor(purpose, guard ?? 'parity-known-targets') : openPrefixDoor(name, purpose);

// A synthetic door from given sessions (tests and the pipeline pilot's synthetic cases).
export const fixtureDoorOf = (label: string, history: MarketSession[]): Door =>
  doorOf(`fixture:${label}`, history, 'fixture', history[0]!.date, history.at(-1)!.date);

// The session index of a date on a door (the first session on or after it).
export const indexOnOrAfter = (door: Door, date: string) => {
  const i = door.ds.dates.findIndex((d) => d >= date);

  return i < 0 ? door.ds.sessionCount : i;
};

export const indexOf = (door: Door, date: string) => {
  const i = door.ds.dates.indexOf(date);

  if (i < 0) throw new Error(`${date} is not a session of ${door.name}`);
  return i;
};
