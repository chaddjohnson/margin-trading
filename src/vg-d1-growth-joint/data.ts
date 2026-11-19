// The data doors (PROTOCOL.md §3). D19/D21/D23/D24 are physical byte prefixes of the canonical VGT and GDX minute
// files, each verified by size, sha256 and last-row time before a byte is parsed; a process searching at a cutoff opens
// only that cutoff's door. FULL (2016-01-04 → 2026-10-30, the browser's path: partition `all`, forward split
// adjustment) opens only after FROZEN_SELECTION.json is committed read-only with the expected sha256 (the guard).
// Every opening is logged in results/doors.jsonl.
//
// One door = the two symbols' Datasets (fixtureDataset of the sessions) and daily signal bars, on ONE common session
// calendar (checked date by date), shared by all four virtual books of every evaluation in a process.
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
  type Sym,
  canonical,
  chronology,
  doorFile,
  doorLog,
  doorSpecs,
  frozenSelectionFile,
  resolution,
  symbols
} from './context.ts';

export const sha256File = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// One symbol on one door.
export interface SymDoor {
  symbol: Sym;
  history: MarketSession[];
  ds: Dataset;
  bars: SignalBar[];
  dataSha256: string;
}

export interface Door {
  name: DoorName | `fixture:${string}`;
  sym: Record<Sym, SymDoor>;
  dates: string[]; // the common session calendar
  from: string;
  to: string;
  sessions: number;
}

const rowTime = (line: string) => line.slice(0, line.indexOf(',')).replaceAll('"', '');

export const verifyDoorFile = (door: PrefixDoor, s: Sym) => {
  const spec = doorSpecs[door];
  const pin = spec.pins[s];
  const file = doorFile(door, s);
  const stat = fs.statSync(file);

  if (stat.size !== pin.bytes) throw new Error(`${file}: ${stat.size} bytes, expected ${pin.bytes}`);

  const sha256 = sha256File(file);

  if (sha256 !== pin.sha256) throw new Error(`${file}: sha256 ${sha256}, expected ${pin.sha256}`);

  const tail = fs.readFileSync(file).subarray(-200).toString('utf8').trim().split('\n').at(-1)!;
  const last = rowTime(tail);

  if (last !== pin.lastRowUtc || !(last < spec.capUtc)) throw new Error(`${file}: last row ${last}`);

  return { bytes: stat.size, sha256, lastRowUtc: last, rows: pin.rows };
};

// Builds every prefix door of both symbols from the canonical files, byte for byte, and checks each against its pin.
export const buildDoors = () => {
  const out: Record<string, Record<string, ReturnType<typeof verifyDoorFile>>> = {};

  for (const s of symbols) {
    if (sha256File(canonical[s].file) !== canonical[s].sha256) throw new Error(`the canonical ${s} file changed`);

    const text = fs.readFileSync(canonical[s].file);

    for (const [door, spec] of Object.entries(doorSpecs) as [PrefixDoor, (typeof doorSpecs)[PrefixDoor]][]) {
      const file = doorFile(door, s);

      if (!fs.existsSync(file)) {
        let start = 0;
        let rows = 0;

        while (start < text.length) {
          let end = text.indexOf(10, start);

          if (end < 0) end = text.length;
          if (rowTime(text.subarray(start, Math.min(end, start + 40)).toString('utf8')) >= spec.capUtc) break;
          rows++;
          start = end + 1;
        }

        if (start !== spec.pins[s].bytes || rows !== spec.pins[s].rows)
          throw new Error(`${s} ${door}: prefix ${start} bytes / ${rows} rows`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(`${file}.tmp`, text.subarray(0, start));
        fs.renameSync(`${file}.tmp`, file);
      }

      (out[door] ??= {})[s] = verifyDoorFile(door, s);
    }
  }

  return out;
};

export const logDoor = (door: string, purpose: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.dirname(doorLog), { recursive: true });
  fs.appendFileSync(
    doorLog,
    `${JSON.stringify({ t: new Date().toISOString(), door, purpose, pid: process.pid, ...extra })}\n`
  );
};

const symDoorOf = (s: Sym, history: MarketSession[], dataSha256: string): SymDoor => {
  const ds = fixtureDataset(history);

  ds.id = `${s}:${dataSha256.slice(0, 16)}:${ds.lastDate}`;
  ds.dataHash = dataSha256;

  return { symbol: s, history, ds, bars: barsFromSessions(history, resolution), dataSha256 };
};

// The two symbols must share one session calendar (dates, session count): the pool runs on common sessions.
export const doorOf = (name: Door['name'], parts: Record<Sym, SymDoor>, from: string, to: string): Door => {
  const a = parts.GDX.ds.dates;
  const b = parts.VGT.ds.dates;

  if (a.length !== b.length || a.some((d, i) => d !== b[i]))
    throw new Error(`${name}: the GDX and VGT session calendars differ`);
  for (const s of symbols)
    if (
      parts[s].ds.sTime.some((t, i) => t !== parts.VGT.ds.sTime[i]) ||
      parts[s].ds.sCloseTime.some((t, i) => t !== parts.VGT.ds.sCloseTime[i])
    )
      throw new Error(`${name}: ${s} session times or closes differ`);

  return { name, sym: parts, dates: b, from, to, sessions: b.length };
};

export const openPrefixDoor = async (door: PrefixDoor, purpose: string, quietLog = false): Promise<Door> => {
  const spec = doorSpecs[door];
  const parts = {} as Record<Sym, SymDoor>;
  const shas: Record<string, string> = {};

  for (const s of symbols) {
    const v = verifyDoorFile(door, s);
    const loaded = await loadDatasetSessions({
      dataset: resolveDataset(s, doorFile(door, s)),
      startDate: chronology.firstSession,
      endDate: spec.last,
      warmupSessions: 0
    });

    if (loaded.warmup !== 0) throw new Error(`${s} ${door}: unexpected warm-up sessions`);
    if (loaded.history[0]!.date !== chronology.firstSession || loaded.history.at(-1)!.date !== spec.last)
      throw new Error(`${s} ${door} covers ${loaded.history[0]!.date} → ${loaded.history.at(-1)!.date}`);
    if (loaded.history.length !== spec.sessions) throw new Error(`${s} ${door}: ${loaded.history.length} sessions`);
    parts[s] = symDoorOf(s, loaded.history, v.sha256);
    shas[s] = v.sha256;
  }

  if (!quietLog) logDoor(door, purpose, { sha256: shas });

  return doorOf(door, parts, chronology.firstSession, spec.last);
};

// The guard of FULL: the committed, read-only frozen selection with the expected sha256.
export const checkGuard = (guard: { file: string; sha256: string }) => {
  if (path.resolve(guard.file) !== path.resolve(frozenSelectionFile)) throw new Error('FULL: wrong guard file');
  if (!fs.existsSync(guard.file)) throw new Error('FULL: the frozen selection does not exist');
  if ((fs.statSync(guard.file).mode & 0o222) !== 0) throw new Error('FULL: the frozen selection is writable');
  if (sha256File(guard.file) !== guard.sha256) throw new Error('FULL: the frozen selection sha256 differs');
};

// The FULL door (the browser's loading path), only under the guard.
export const openFullDoor = async (
  purpose: string,
  guard: { file: string; sha256: string },
  quietLog = false
): Promise<Door> => {
  checkGuard(guard);

  const parts = {} as Record<Sym, SymDoor>;
  const shas: Record<string, string> = {};

  for (const s of symbols) {
    const sha = sha256File(canonical[s].file);

    if (sha !== canonical[s].sha256) throw new Error(`canonical ${s} sha256 ${sha}, expected ${canonical[s].sha256}`);

    const loaded = await loadDatasetSessions({
      dataset: resolveDataset(s, 'all'),
      startDate: chronology.firstSession,
      endDate: chronology.validationEnd,
      warmupSessions: 0,
      access: 'manual evaluation'
    });

    if (loaded.history[0]!.date !== chronology.firstSession || loaded.history.at(-1)!.date !== chronology.validationEnd)
      throw new Error(`${s} FULL covers ${loaded.history[0]!.date} → ${loaded.history.at(-1)!.date}`);
    parts[s] = symDoorOf(s, loaded.history, loaded.report!.dataSha256!);
    shas[s] = sha;
  }

  if (!quietLog) logDoor('FULL', purpose, { sha256: shas, guard: guard.sha256 });

  return doorOf('FULL', parts, chronology.firstSession, chronology.validationEnd);
};

export const openDoor = (name: DoorName, purpose: string, guard?: { file: string; sha256: string }) => {
  if (name !== 'FULL') return openPrefixDoor(name, purpose);
  if (!guard) throw new Error('FULL needs the frozen selection guard');
  return openFullDoor(purpose, guard);
};

// A synthetic door from given sessions per symbol (tests).
export const fixtureDoorOf = (label: string, histories: Record<Sym, MarketSession[]>): Door =>
  doorOf(
    `fixture:${label}`,
    { GDX: symDoorOf('GDX', histories.GDX, 'fixture'), VGT: symDoorOf('VGT', histories.VGT, 'fixture') },
    histories.VGT[0]!.date,
    histories.VGT.at(-1)!.date
  );

// The session index of a date on a door (the first session on or after it).
export const indexOnOrAfter = (door: Pick<Door, 'dates'>, date: string) => {
  const i = door.dates.findIndex((d) => d >= date);

  return i < 0 ? door.dates.length : i;
};

export const indexOf = (door: Pick<Door, 'dates' | 'name'>, date: string) => {
  const i = door.dates.indexOf(date);

  if (i < 0) throw new Error(`${date} is not a session of ${door.name}`);
  return i;
};
