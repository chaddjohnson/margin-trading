// P8-GDX's data doors (PROTOCOL.md §3). The canonical GDX file data/GDX/data.csv (Alpaca SIP 1-minute, raw prices; the
// program's verified GDX history, imported and verified by `npm run datasets`; sha256 pinned in data/DOOR_PINS.json) is
// cut into FIVE physical byte prefixes — D19, D21, D23, D24 (through 2019-12-31, 2021-12-31, 2023-12-29, 2024-12-31) and
// FULL (through the study's endpoint 2026-10-30) — each holding every row whose UTC time is before the New York midnight
// after its last session; each is verified by size, sha256 and last-row time BEFORE a byte is parsed. A door is loaded
// through the canonical session grouping (src/lib/evaluation.ts loadDatasetSessions on the explicit file: the regular
// session and the official closing print only; pre- and post-market rows are never a bar) and forward split-adjusted by
// the canonical function (src/lib/corporateActions.ts adjustSessionsForSplits) with the CENTRAL split ledger
// config/market-events/splits.json (sha256 pinned): it lists no GDX split, and the data audit verifies that GDX had none
// in 2016-01-04 → 2026-10-30 (GDX_DATA_AUDIT.json). The door is built into the engine's Door exactly as Priority 3's
// symDoorOf / doorOf do: BOTH engine slots hold this one GDX SymDoor (context.ts).
//
// The order of openings (fold discipline) is strict, C19 → C21 → C23 → C24:
//   D19  C19 training; engineering at any time
//   D21  C19's slice: after selection/C19.json is sealed AND committed; C21's training: after slices/C19.json
//   D23  C21's slice: after selection/C21.json; C23's training: after slices/C21.json
//   D24  C23's slice: after selection/C23.json; C24's training: after slices/C23.json AND sequential.json
//   FULL C24's slice 2025-01-02 → 2026-10-30 (previously examined market history): only after selection/C24.json,
//        FROZEN_SELECTION.json and doors/FULL-authorization.json are sealed AND committed; the validation job opens it
//        ONCE; afterwards only report-only diagnostics of the frozen subjects.
//   Engineering BEFORE the protocol freeze: D19–D24 (parity, causality, pilot) and FULL only for data-integrity checks
//   whose output is equality counts and hashes (never a strategy outcome).
// Every opening is logged in results/doors.jsonl. Data after the endpoint (if the canonical file holds any) is outside
// every door.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { MarketSession } from '#types';
import { barsFromSessions } from '../entry-signals/bars.ts';
import { fixtureDataset } from '../four-family/data.ts';
import { adjustSessionsForSplits, readSplits, splitsFile, type SplitEvent } from '../lib/corporateActions.ts';
import { resolveDataset } from '../lib/dataset.ts';
import { loadDatasetSessions } from '../lib/evaluation.ts';
import { resolution } from '../vg-d1-growth-joint/context.ts';
import { type Door, type SymDoor, doorOf } from '../vg-d1-growth-joint/data.ts';
import {
  type CutoffKey,
  type DoorName,
  SYMBOL,
  cacheDir,
  chronology,
  doorLog,
  freezeFile,
  repoRoot,
  researchDir,
  resultsDir
} from './context.ts';
import { isCommitted, isSealed, rel } from './records.ts';

export const canonicalFile = path.join(repoRoot, 'data', SYMBOL, 'data.csv');
export const splitsLedgerFile = splitsFile; // the central ledger (no GDX event; verified by the data audit)
export const doorPinsFile = path.join(researchDir, 'data', 'DOOR_PINS.json');
export const doorFile = (d: DoorName) => path.join(cacheDir, 'doors', `${SYMBOL}-${d}.csv`);

export const doorSpecs: Record<DoorName, { last: string; capUtc: string }> = {
  D19: { last: '2019-12-31', capUtc: '2020-01-01T05:00:00Z' },
  D21: { last: '2021-12-31', capUtc: '2022-01-01T05:00:00Z' },
  D23: { last: '2023-12-29', capUtc: '2024-01-01T05:00:00Z' },
  D24: { last: '2024-12-31', capUtc: '2025-01-01T05:00:00Z' },
  FULL: { last: chronology.endpoint, capUtc: '2026-10-31T04:00:00Z' }
};
export const doorNames: readonly DoorName[] = ['D19', 'D21', 'D23', 'D24', 'FULL'];

export interface Pin {
  bytes: number;
  rows: number;
  sha256: string;
  lastRowUtc: string;
  sessions: number;
}
export interface DoorPins {
  kind: 'P8-GDX door pins';
  canonical: { file: string; bytes: number; rows: number; sha256: string; firstRowUtc: string; lastRowUtc: string };
  splitsLedger: { file: string; sha256: string };
  doors: Record<DoorName, Pin>;
}

export const sha256File = (file: string) => {
  const h = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(1 << 22);

  try {
    for (let n = fs.readSync(fd, buf, 0, buf.length, null); n > 0; n = fs.readSync(fd, buf, 0, buf.length, null)) h.update(buf.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return h.digest('hex');
};
const rowTime = (line: string) => line.slice(0, line.indexOf(',')).replaceAll('"', '');

export const readPins = (): DoorPins => JSON.parse(fs.readFileSync(doorPinsFile, 'utf8')) as DoorPins;

// GDX's events in the central split ledger (canonical parser and schema), the file verified against the pin: none (the
// data audit verifies that GDX had no split in the study's window; a GDX event appearing there fails the doors closed)
export const gdxSplits = (pins: DoorPins = readPins()): SplitEvent[] => {
  const sha = sha256File(splitsLedgerFile);

  if (sha !== pins.splitsLedger.sha256) throw new Error(`${rel(splitsLedgerFile)}: sha256 ${sha} ≠ pinned ${pins.splitsLedger.sha256}`);

  const s = readSplits(splitsLedgerFile).filter((x) => x.symbol === SYMBOL);

  if (s.length) throw new Error(`the central split ledger lists ${s.length} GDX event(s): the study's frozen data treatment assumes none`);
  return s;
};

// Cuts every prefix door from the canonical file (byte prefixes; written atomically once) and returns their pins.
export const cutDoors = (): { canonical: DoorPins['canonical']; doors: Record<DoorName, Omit<Pin, 'sessions'>> } => {
  const text = fs.readFileSync(canonicalFile);
  const lines = text.toString('utf8').trimEnd().split('\n');
  const doors = {} as Record<DoorName, Omit<Pin, 'sessions'>>;

  for (const d of doorNames) {
    const spec = doorSpecs[d];
    let start = 0;
    let rows = 0;

    while (start < text.length) {
      let end = text.indexOf(10, start);

      if (end < 0) end = text.length;
      if (rowTime(text.subarray(start, Math.min(end, start + 40)).toString('utf8')) >= spec.capUtc) break;
      rows++;
      start = end + 1;
    }

    const file = doorFile(d);
    const bytes = text.subarray(0, start);

    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file)) {
      if (!fs.readFileSync(file).equals(bytes)) throw new Error(`${rel(file)} exists with other bytes`);
    } else {
      fs.writeFileSync(`${file}.tmp`, bytes);
      fs.renameSync(`${file}.tmp`, file);
    }
    doors[d] = {
      bytes: start,
      rows,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      lastRowUtc: rowTime(lines[rows - 1]!)
    };
  }

  return {
    canonical: {
      file: rel(canonicalFile),
      bytes: text.length,
      rows: lines.length,
      sha256: createHash('sha256').update(text).digest('hex'),
      firstRowUtc: rowTime(lines[0]!),
      lastRowUtc: rowTime(lines.at(-1)!)
    },
    doors
  };
};

export const verifyDoorFile = (d: DoorName, pins: DoorPins = readPins()) => {
  const pin = pins.doors[d];
  const file = doorFile(d);
  const stat = fs.statSync(file);

  if (stat.size !== pin.bytes) throw new Error(`${rel(file)}: ${stat.size} bytes, expected ${pin.bytes}`);

  const sha = sha256File(file);

  if (sha !== pin.sha256) throw new Error(`${rel(file)}: sha256 ${sha}, expected ${pin.sha256}`);

  const fd = fs.openSync(file, 'r');
  const tailBuf = Buffer.alloc(Math.min(200, stat.size));

  fs.readSync(fd, tailBuf, 0, tailBuf.length, stat.size - tailBuf.length);
  fs.closeSync(fd);

  const last = rowTime(tailBuf.toString('utf8').trim().split('\n').at(-1)!);

  if (last !== pin.lastRowUtc || !(last < doorSpecs[d].capUtc)) throw new Error(`${rel(file)}: last row ${last}`);
  return { bytes: stat.size, sha256: sha, lastRowUtc: last, rows: pin.rows };
};

// One GDX SymDoor (Priority 3's symDoorOf, unexported there: the same construction)
export const symDoorOf = (history: MarketSession[], dataSha256: string): SymDoor => {
  const ds = fixtureDataset(history);

  ds.id = `${SYMBOL}:${dataSha256.slice(0, 16)}:${ds.lastDate}`;
  ds.dataHash = dataSha256;

  return { symbol: 'VGT', history, ds, bars: barsFromSessions(history, resolution), dataSha256 };
};

// The sessions of a door file: canonical grouping of the explicit file, then the canonical forward split adjustment.
export const doorSessions = async (d: DoorName, pins: DoorPins = readPins()) => {
  const loaded = await loadDatasetSessions({
    dataset: resolveDataset(SYMBOL, doorFile(d)),
    startDate: chronology.firstSession,
    endDate: doorSpecs[d].last,
    warmupSessions: 0
  });

  if (loaded.warmup !== 0) throw new Error(`${d}: unexpected warm-up sessions`);

  const adjusted = adjustSessionsForSplits(loaded.history, SYMBOL, gdxSplits(pins));

  return { history: adjusted.sessions, applied: adjusted.applied };
};

// The engine door: both engine slots carry the one GDX SymDoor (only the VGT-slot books ever trade).
export const buildDoor = async (d: DoorName, pins: DoorPins = readPins()): Promise<Door> => {
  const v = verifyDoorFile(d, pins);
  const { history } = await doorSessions(d, pins);

  if (history[0]!.date !== chronology.firstSession || history.at(-1)!.date !== doorSpecs[d].last)
    throw new Error(`${d} covers ${history[0]!.date} → ${history.at(-1)!.date}`);
  if (history.length !== pins.doors[d].sessions) throw new Error(`${d}: ${history.length} sessions, pinned ${pins.doors[d].sessions}`);

  const sd = symDoorOf(history, v.sha256);

  return doorOf(d, { GDX: sd, VGT: sd }, chronology.firstSession, doorSpecs[d].last);
};

// ----- the guard of every opening -----

export const selectionFile = (cut: CutoffKey) => path.join(resultsDir, 'selection', `${cut}.json`);
export const sliceFile = (cut: CutoffKey) =>
  cut === 'C24' ? path.join(resultsDir, 'validation', 'validation.json') : path.join(resultsDir, 'slices', `${cut}.json`);
export const sequentialFile = path.join(resultsDir, 'sequential.json');
export const frozenSelectionFile = path.join(researchDir, 'FROZEN_SELECTION.json');
export const fullAuthorizationFile = path.join(resultsDir, 'doors', 'FULL-authorization.json');

export type DoorUse = 'training' | 'slice' | 'validation' | 'engineering' | 'diagnostic';

export interface DoorState {
  exists: (file: string) => boolean;
  sealed: (file: string) => boolean;
  committed: (file: string) => boolean;
}
export const fsState: DoorState = { exists: (f) => fs.existsSync(f), sealed: (f) => isSealed(f), committed: (f) => isCommitted(f) };

const trainingPrereq: Record<DoorName, CutoffKey | null> = { D19: null, D21: 'C19', D23: 'C21', D24: 'C23', FULL: null };
const sliceOf: Partial<Record<DoorName, CutoffKey>> = { D21: 'C19', D23: 'C21', D24: 'C23' };

export const doorGuard = (name: DoorName, use: DoorUse, purpose: string, st: DoorState = fsState) => {
  const sealedCommitted = (file: string) => st.sealed(file) && st.committed(file);
  const require_ = (file: string, why: string) => {
    if (!st.sealed(file)) throw new Error(`${why}: ${rel(file)} is not sealed`);
    if (!st.committed(file)) throw new Error(`${why}: ${rel(file)} is not committed unchanged`);
  };

  if (!purpose) throw new Error('a door opening needs its purpose');
  if (use === 'engineering') {
    if (name === 'D19') return;
    if (st.exists(freezeFile)) throw new Error(`engineering reads ${name} only before the protocol freeze`);
    if (name === 'FULL' && !/^data integrity:/.test(purpose)) throw new Error('before the freeze FULL is read only for data-integrity checks');
    return;
  }
  if (use === 'training') {
    if (name === 'FULL') throw new Error('FULL is never a training door');

    const prev = trainingPrereq[name];

    if (prev) require_(sliceFile(prev), `${name} (training)`);
    if (name === 'D24') require_(sequentialFile, 'D24 (C24 training)');
    return;
  }
  if (use === 'slice') {
    const cut = sliceOf[name];

    if (!cut) throw new Error(`${name} is not a slice door`);
    require_(selectionFile(cut), `${name} (${cut} next slice)`);
    if (st.exists(sliceFile(cut))) throw new Error(`${name}: the ${cut} slice record is sealed; the official slice evaluation is not repeated`);
    return;
  }
  if (use === 'validation') {
    if (name !== 'FULL') throw new Error('the validation reads FULL');
    require_(selectionFile('C24'), 'FULL (C24 next slice)');
    require_(frozenSelectionFile, 'FULL (C24 next slice)');
    require_(fullAuthorizationFile, 'FULL (C24 next slice)');
    if (st.exists(sliceFile('C24'))) throw new Error('FULL: the validation is sealed; it is opened once');
    return;
  }
  // report-only diagnostics of frozen subjects: a door only after the sealed, committed record that last opened it
  if (name === 'FULL') {
    if (!sealedCommitted(sliceFile('C24'))) throw new Error('FULL: diagnostics read it only after the sealed, committed validation');
  } else {
    const cut = sliceOf[name];

    if (cut && !sealedCommitted(sliceFile(cut))) throw new Error(`${name}: diagnostics only after the sealed ${cut} slice record`);
  }
};

export const logDoor = (door: string, purpose: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.dirname(doorLog), { recursive: true });
  fs.appendFileSync(doorLog, `${JSON.stringify({ t: new Date().toISOString(), door, purpose, pid: process.pid, ...extra })}\n`);
};

const doorCache = new Map<DoorName, Door>();

export const openGdxDoor = async (name: DoorName, use: DoorUse, purpose: string): Promise<Door> => {
  doorGuard(name, use, purpose);

  const door = doorCache.get(name) ?? (await buildDoor(name));

  doorCache.set(name, door);
  logDoor(name, `${use}: ${purpose}`, { sha256: door.sym.VGT.dataSha256, sessions: door.sessions, first: door.dates[0], last: door.dates.at(-1) });
  return door;
};
