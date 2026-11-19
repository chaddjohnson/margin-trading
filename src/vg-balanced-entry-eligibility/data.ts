// The study's data doors (PROTOCOL.md §3). Development doors are physical byte prefixes of the canonical VGT and GDX
// files (every row before the New York midnight after the door's last session), so a process that opens one cannot
// read a later bar; their sizes and hashes are pinned in results/doors-pins.json. FULL is the canonical files to the
// validation end; a variant (eligibility ON) may run on it only under the sealed frozen selection (its guard).
// Every opening is appended to results/doors.jsonl with its purpose.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AccessMode, DatasetPartition } from '#lib';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import {
  type DoorName,
  type PrefixDoor,
  canonical,
  chronology,
  doorPinsFile,
  doorRoot,
  doorSpecs,
  resultsDir,
  symbols
} from './context.ts';

export const sha256File = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sha256Buffer = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

export interface DoorPin {
  door: PrefixDoor;
  last: string;
  capUtc: string;
  files: Record<string, { bytes: number; rows: number; sha256: string; lastRowUtc: string }>;
  sessions: number;
  firstSession: string;
  lastSession: string;
}

const rowTime = (line: string) => line.slice(1, 21);

// The byte length of the prefix of `text` holding the header and every row stamped before `capUtc`.
export const prefixLength = (text: Buffer, capUtc: string) => {
  let offset = text.indexOf(10) + 1; // after the header
  let rows = 0;
  let lastRowUtc = '';

  while (offset < text.length) {
    const next = text.indexOf(10, offset);
    const lineEnd = next < 0 ? text.length : next;
    const stamp = text.subarray(offset, Math.min(offset + 22, lineEnd)).toString('latin1');

    if (rowTime(stamp) >= capUtc) break;

    lastRowUtc = rowTime(stamp);
    rows++;
    offset = next < 0 ? text.length : next + 1;
  }

  return { bytes: offset, rows, lastRowUtc };
};

const verifyCanonical = () => {
  for (const symbol of symbols) {
    const { file, sha256 } = canonical[symbol];

    if (sha256File(file) !== sha256) throw new Error(`${file} is not the pinned canonical file`);
  }

  if (sha256File(canonical.partitions.file) !== canonical.partitions.sha256)
    throw new Error('data/partitions.json changed');
};

const loadDoorUniverse = (door: DoorName) => {
  if (door === 'FULL') {
    return loadNUniverse({
      members: [...symbols],
      partition: 'all',
      access: 'manual evaluation',
      warmupSessions: 0,
      endDate: chronology.validationEnd
    });
  }

  const spec = doorSpecs[door];

  return loadNUniverse({
    members: [...symbols],
    partition: spec.partition as DatasetPartition,
    access: spec.access as AccessMode,
    warmupSessions: 0,
    root: doorRoot(door)
  });
};

const checkEligibility = (loaded: LoadedUniverse) => {
  const { dates, eligibilityIndex } = loaded.universe;
  const eligible = chronology.firstEligible;

  if (dates[eligibilityIndex]! < eligible || (eligibilityIndex > 0 && dates[eligibilityIndex - 1]! >= eligible)) {
    throw new Error(`the universe's first eligible session ${dates[eligibilityIndex]} does not follow ${eligible}`);
  }

  if (dates[0] !== chronology.firstSession) throw new Error(`the first session is ${dates[0]}`);
};

export const buildDoors = async () => {
  verifyCanonical();

  const pins: Partial<Record<PrefixDoor, DoorPin>> = {};
  const texts = Object.fromEntries(symbols.map((symbol) => [symbol, fs.readFileSync(canonical[symbol].file)]));

  for (const door of Object.keys(doorSpecs) as PrefixDoor[]) {
    const spec = doorSpecs[door];
    const root = doorRoot(door);
    const files: DoorPin['files'] = {};

    fs.mkdirSync(root, { recursive: true });
    fs.copyFileSync(canonical.partitions.file, path.join(root, 'partitions.json'));

    for (const symbol of symbols) {
      const text = texts[symbol]!;
      const prefix = prefixLength(text, spec.capUtc);
      const buffer = text.subarray(0, prefix.bytes);
      const file = path.join(root, symbol, 'data.csv');

      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(`${file}.tmp`, buffer);
      fs.renameSync(`${file}.tmp`, file);
      fs.chmodSync(file, 0o444);
      files[symbol] = {
        bytes: prefix.bytes,
        rows: prefix.rows,
        sha256: sha256Buffer(buffer),
        lastRowUtc: prefix.lastRowUtc
      };
    }

    const loaded = await loadDoorUniverse(door);

    checkEligibility(loaded);

    const dates = loaded.universe.dates;

    if (dates.at(-1) !== spec.last) throw new Error(`${door}: last session ${dates.at(-1)}, expected ${spec.last}`);

    pins[door] = {
      door,
      last: spec.last,
      capUtc: spec.capUtc,
      files,
      sessions: dates.length,
      firstSession: dates[0]!,
      lastSession: dates.at(-1)!
    };
  }

  fs.mkdirSync(path.dirname(doorPinsFile), { recursive: true });
  fs.writeFileSync(doorPinsFile, `${JSON.stringify({ canonical, pins }, null, 2)}\n`);

  return pins;
};

const readPins = (): Record<PrefixDoor, DoorPin> => JSON.parse(fs.readFileSync(doorPinsFile, 'utf8')).pins;

const verifyDoor = (door: PrefixDoor) => {
  const pin = readPins()[door];

  if (!pin) throw new Error(`door ${door} has no pin (run build-doors)`);

  for (const symbol of symbols) {
    const file = path.join(doorRoot(door), symbol, 'data.csv');
    const expected = pin.files[symbol]!;

    if (fs.statSync(file).size !== expected.bytes) throw new Error(`${door} ${symbol}: size differs from its pin`);
    if (sha256File(file) !== expected.sha256) throw new Error(`${door} ${symbol}: sha256 differs from its pin`);
  }

  return pin;
};

export interface OpenedDoor {
  door: DoorName;
  loaded: LoadedUniverse;
  lastSession: string;
  sessions: number;
  dataSha256: Record<string, string>;
}

export const logDoor = (entry: Record<string, unknown>) => {
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.appendFileSync(
    path.join(resultsDir, 'doors.jsonl'),
    `${JSON.stringify({ t: new Date().toISOString(), pid: process.pid, ...entry })}\n`
  );
};

// Opens a door. `purpose` is logged; `guard` (FULL with eligibility ON) must be the read-only sealed selection.
export const openDoor = async (
  door: DoorName,
  purpose: string,
  guard?: { file: string; sha256: string }
): Promise<OpenedDoor> => {
  if (guard) {
    if (!fs.existsSync(guard.file)) throw new Error(`guard ${guard.file} does not exist`);
    if ((fs.statSync(guard.file).mode & 0o222) !== 0) throw new Error(`guard ${guard.file} is writable`);
    if (sha256File(guard.file) !== guard.sha256) throw new Error(`guard ${guard.file} has another sha256`);
  }

  let dataSha256: Record<string, string>;

  if (door === 'FULL') {
    verifyCanonical();
    dataSha256 = Object.fromEntries(symbols.map((symbol) => [symbol, canonical[symbol].sha256]));
  } else {
    const pin = verifyDoor(door);

    dataSha256 = Object.fromEntries(symbols.map((symbol) => [symbol, pin.files[symbol]!.sha256]));
  }

  const loaded = await loadDoorUniverse(door);

  checkEligibility(loaded);

  const lastSession = loaded.universe.dates.at(-1)!;

  if (door !== 'FULL' && lastSession !== doorSpecs[door].last) throw new Error(`${door}: last session ${lastSession}`);
  if (door === 'FULL' && lastSession !== chronology.validationEnd) throw new Error(`FULL: last session ${lastSession}`);

  for (const symbol of symbols) {
    const window = loaded.windows[symbol]!;

    if (window.dataSha256 !== dataSha256[symbol]) throw new Error(`${door} ${symbol}: loaded another file`);
  }

  logDoor({ door, purpose, lastSession, guard: guard?.sha256 ?? null });

  return { door, loaded, lastSession, sessions: loaded.universe.dates.length, dataSha256 };
};
