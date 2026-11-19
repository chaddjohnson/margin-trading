// The data doors (PROTOCOL.md §2). Prefix doors D19/D21/D23/D24 are physical byte prefixes of the canonical VGT minute
// file, each verified by size, sha256 and last-row time before a byte is parsed; a process searching at a cutoff opens
// only that cutoff's door. The FULL door (2016-01-04 → 2026-10-30, the browser's path) opens only for the final
// comparison, after FROZEN_SELECTION.json is committed.
import fs from 'node:fs';
import path from 'node:path';
import { resolveDataset } from '../lib/dataset.ts';
import { loadDatasetSessions } from '../lib/evaluation.ts';
import { loadFullDoorUnchecked } from '../growth140-vgt-s8m/data.ts';
import type { DoorData } from '../growth140-vgt-s8m/engine.ts';
import { fixtureDoor } from '../growth140-vgt-s8m/fixture.ts';
import { sha256File, sha256Prefix } from '../growth140-vgt-s8m/data.ts';
import {
  type DoorName,
  type PrefixDoor,
  canonical,
  chronology,
  doorFile,
  doorPinsFile,
  doorSpecs,
  priorDevSha256,
  symbol
} from './context.ts';

export interface DoorPin {
  door: PrefixDoor;
  last: string;
  capUtc: string;
  bytes: number;
  rows: number;
  sha256: string;
  lastRowUtc: string;
  sessions: number;
}

const rowTime = (line: string) => line.slice(0, line.indexOf(',')).replaceAll('"', '');

// Scans the canonical file once: the byte offset of the first row at or after each cap.
const prefixOffsets = () => {
  const text = fs.readFileSync(canonical.file);
  const caps = Object.entries(doorSpecs).map(([door, s]) => ({ door: door as PrefixDoor, ...s }));
  const out = new Map<PrefixDoor, { bytes: number; rows: number; lastRowUtc: string }>();
  let start = 0;
  let rows = 0;
  let last = '';
  let k = 0;

  while (start < text.length && k < caps.length) {
    let end = text.indexOf(10, start);

    if (end < 0) end = text.length;

    const t = rowTime(text.subarray(start, Math.min(end, start + 40)).toString('utf8'));

    while (k < caps.length && t >= caps[k]!.capUtc) {
      out.set(caps[k]!.door, { bytes: start, rows, lastRowUtc: last });
      k++;
    }

    last = t;
    rows++;
    start = end + 1;
  }

  if (out.size !== caps.length) throw new Error('a door cap lies beyond the canonical file');
  return out;
};

const readPins = (): Record<PrefixDoor, DoorPin> | null =>
  fs.existsSync(doorPinsFile) ? JSON.parse(fs.readFileSync(doorPinsFile, 'utf8')).doors : null;

// Builds every prefix door from the canonical file (byte for byte) and writes their pins (once, before the freeze).
export const buildDoors = async () => {
  if (sha256File(canonical.file) !== canonical.sha256) throw new Error('the canonical VGT file changed');

  const offsets = prefixOffsets();
  const doors: Partial<Record<PrefixDoor, DoorPin>> = {};

  for (const [door, o] of offsets) {
    const file = doorFile(door);

    if (!fs.existsSync(file)) {
      const fd = fs.openSync(canonical.file, 'r');
      const buffer = Buffer.alloc(o.bytes);

      fs.readSync(fd, buffer, 0, o.bytes, 0);
      fs.closeSync(fd);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(`${file}.tmp`, buffer);
      fs.renameSync(`${file}.tmp`, file);
    }

    const sha = sha256File(file);

    if (sha !== sha256Prefix(canonical.file, o.bytes)) throw new Error(`${door}: not the canonical prefix`);

    const loaded = await loadPrefix(door, file);

    doors[door] = {
      door,
      ...doorSpecs[door],
      bytes: o.bytes,
      rows: o.rows,
      sha256: sha,
      lastRowUtc: o.lastRowUtc,
      sessions: loaded.history.length
    };
  }

  if (doors.D24!.sha256 !== priorDevSha256)
    throw new Error('D24 differs from the completed study’s development prefix');

  fs.mkdirSync(path.dirname(doorPinsFile), { recursive: true });
  fs.writeFileSync(
    doorPinsFile,
    `${JSON.stringify({ canonical: { file: 'data/VGT/data.csv', sha256: canonical.sha256 }, doors }, null, 1)}\n`
  );
  return doors;
};

const noSplitIn = (from: string, to: string) => {
  const raw = JSON.parse(fs.readFileSync(canonical.splitsFile, 'utf8'));
  const list = (Array.isArray(raw) ? raw : (raw.splits ?? [])) as Record<string, string>[];

  for (const s of list) {
    const d = s.effective ?? s.effectiveDate ?? s.date ?? '';

    if (s.symbol === symbol && d >= from && d <= to)
      throw new Error(`a ${symbol} split (${d}) lies inside ${from} → ${to}`);
  }
};

const loadPrefix = async (door: PrefixDoor, file: string): Promise<DoorData> => {
  const last = doorSpecs[door].last;

  noSplitIn(chronology.firstSession, last);

  const loaded = await loadDatasetSessions({
    dataset: resolveDataset(symbol, file),
    startDate: chronology.firstSession,
    endDate: last,
    warmupSessions: 0
  });
  const h = loaded.history;

  if (loaded.warmup !== 0) throw new Error(`${door}: unexpected warm-up`);
  if (h[0]!.date !== chronology.firstSession || h.at(-1)!.date !== last)
    throw new Error(`${door} covers ${h[0]!.date} → ${h.at(-1)!.date}`);

  return {
    name: 'development',
    history: h,
    warmup: 0,
    dataSha256: '',
    from: chronology.firstSession,
    to: last
  };
};

// Opens a prefix door after verifying size, sha256 and last-row time against its pin.
export const openPrefixDoor = async (door: PrefixDoor): Promise<DoorData> => {
  const pins = readPins();

  if (!pins?.[door]) throw new Error(`door ${door} has no pin (run build-doors)`);

  const pin = pins[door];
  const file = doorFile(door);
  const stat = fs.statSync(file);

  if (stat.size !== pin.bytes) throw new Error(`${door}: ${stat.size} bytes, expected ${pin.bytes}`);

  const sha = sha256File(file);

  if (sha !== pin.sha256) throw new Error(`${door}: sha256 ${sha}, expected ${pin.sha256}`);

  const tail = fs.readFileSync(file).subarray(-200).toString('utf8').trim().split('\n').at(-1)!;

  if (rowTime(tail) !== pin.lastRowUtc || !(rowTime(tail) < pin.capUtc)) throw new Error(`${door}: last row ${tail}`);

  const d = await loadPrefix(door, file);

  if (d.history.length !== pin.sessions) throw new Error(`${door}: ${d.history.length} sessions`);

  // the engine's dataset digest: the door file's own sha256 (D24's equals the completed study's development door)
  return { ...d, dataSha256: sha };
};

export const openDoor = async (door: DoorName): Promise<DoorData> => {
  if (door.startsWith('fixture')) return fixtureDoor(Number(door.split(':')[1] ?? 320));
  if (door === 'FULL') return loadFullDoorUnchecked();
  return openPrefixDoor(door as PrefixDoor);
};

export const doorPins = () => readPins();
