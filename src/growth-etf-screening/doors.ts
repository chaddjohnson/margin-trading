// The doors (PROTOCOL.md §3). Per eligible ETF: physical byte prefixes D19, D21, D23 and D24 of its canonical minute file
// (every row whose New York date is ≤ the door's last session), pinned once (bytes, rows, sha256, last row) in the
// sealed results/doors/DOORS.json and verified at every opening before a byte is parsed; FULL (2016-01-04 → 2026-10-30,
// the canonical partition `all`) only behind THIS study's guard (FROZEN_SELECTION.json sealed read-only, committed,
// unchanged). Every opening is logged in this study's doors.jsonl.
//
// SPLITS. The canonical price convention is the partition loader's: raw SIP prices, FORWARD split adjustment (every price
// on or after a registered split's effective date × its ratio, volumes ÷; config/market-events/splits.json). The
// explicit-file loader used for a byte-prefix door does not adjust (src/lib/evaluation.ts), so a prefix door applies the
// identical `adjustSessionsForSplits` with the same registry; a split after the door's last session is not applied, so
// earlier prices never change (causal prefixes). No dividend or distribution is applied anywhere (price only).
//
// One door = ONE ETF's Dataset and daily signal bars, placed in Priority 3's Growth slot (`GDX` key of its Door shape;
// the VGT key holds the same object so the shape's calendar check is trivial). The slot key is a label of the reused
// engine, never the instrument: records carry the true symbol beside it.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { MarketSession } from '#types';
import { barsFromSessions } from '../entry-signals/bars.ts';
import { fixtureDataset } from '../four-family/data.ts';
import { adjustSessionsForSplits, readSplits, splitsFile } from '../lib/corporateActions.ts';
import { resolveDataset } from '../lib/dataset.ts';
import { loadDatasetSessions } from '../lib/evaluation.ts';
import { resolution } from '../vg-d1-growth-joint/context.ts';
import type { Door, SymDoor } from '../vg-d1-growth-joint/data.ts';
import {
  type DoorKey,
  type PrefixDoor,
  STUDY,
  chronology,
  doorFile,
  doorManifestFile,
  doorSpecs,
  frozenSelectionFile,
  fullSessions,
  prefixDoors,
  repoRoot
} from './context.ts';
import { isSealed, logDoor, readJson, rel, sha256File } from './records.ts';

export type { Door, SymDoor };

export interface Pin {
  bytes: number;
  rows: number;
  sha256: string;
  lastRowUtc: string;
}

export interface DoorManifest {
  kind: string;
  splits: { file: string; sha256: string };
  symbols: Record<string, { canonical: { file: string; sha256: string; bytes: number }; doors: Record<PrefixDoor, Pin> }>;
}

const rowTime = (line: string) => line.slice(0, line.indexOf(',')).replaceAll('"', '');
export const canonicalFile = (sym: string) => path.join(repoRoot, 'data', sym, 'data.csv');

let manifestCache: DoorManifest | null = null;

export const doorManifest = (): DoorManifest => {
  if (manifestCache) return manifestCache;
  if (!isSealed(doorManifestFile)) throw new Error('the door manifest results/doors/DOORS.json is not sealed');
  manifestCache = readJson<DoorManifest>(doorManifestFile);
  return manifestCache;
};

// Writes every missing prefix of one symbol from its canonical file (byte for byte, the rows before each cap; only the
// row timestamps are read to find the cut) and returns the pins. The canonical sha256 must equal the universe manifest's.
export const buildSymbolDoors = (sym: string, expectedSha256: string) => {
  const file = canonicalFile(sym);
  const text = fs.readFileSync(file);
  const sha = sha256File(file);

  if (sha !== expectedSha256) throw new Error(`${sym}: canonical sha256 ${sha}, expected ${expectedSha256}`);

  const pins = {} as Record<PrefixDoor, Pin>;
  let start = 0;
  let rows = 0;

  for (const d of prefixDoors) {
    const cap = doorSpecs[d].capUtc;

    while (start < text.length) {
      let end = text.indexOf(10, start);

      if (end < 0) end = text.length;
      if (rowTime(text.subarray(start, Math.min(end, start + 40)).toString('utf8')) >= cap) break;
      rows++;
      start = end + 1;
    }

    const out = doorFile(sym, d);

    if (!fs.existsSync(out)) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(`${out}.tmp`, text.subarray(0, start));
      fs.renameSync(`${out}.tmp`, out);
    }

    const stat = fs.statSync(out);

    if (stat.size !== start) throw new Error(`${rel(out)}: ${stat.size} bytes, expected ${start}`);

    const tail = text
      .subarray(Math.max(0, start - 200), start)
      .toString('utf8')
      .trim()
      .split('\n')
      .at(-1)!;

    pins[d] = { bytes: start, rows, sha256: sha256File(out), lastRowUtc: rowTime(tail) };
  }

  return { canonical: { file: rel(file), sha256: sha, bytes: text.length }, doors: pins };
};

export const splitsPin = () => ({ file: splitsFile, sha256: sha256File(path.join(repoRoot, splitsFile)) });

export const verifyDoorFile = (sym: string, d: PrefixDoor) => {
  const m = doorManifest();
  const pin = m.symbols[sym]?.doors[d];

  if (!pin) throw new Error(`${sym} has no ${d} pin`);

  const file = doorFile(sym, d);
  const stat = fs.statSync(file);

  if (stat.size !== pin.bytes) throw new Error(`${rel(file)}: ${stat.size} bytes, expected ${pin.bytes}`);

  const sha = sha256File(file);

  if (sha !== pin.sha256) throw new Error(`${rel(file)}: sha256 ${sha}, expected ${pin.sha256}`);

  const tail = fs.readFileSync(file).subarray(-200).toString('utf8').trim().split('\n').at(-1)!;
  const last = rowTime(tail);

  if (last !== pin.lastRowUtc || !(last < doorSpecs[d].capUtc)) throw new Error(`${rel(file)}: last row ${last}`);
  return { bytes: stat.size, sha256: sha, lastRowUtc: last };
};

// The FULL guard: this study's frozen selection sealed (read-only), committed and unchanged.
export const checkFullGuard = () => {
  if (!isSealed(frozenSelectionFile)) throw new Error('FULL is closed: FROZEN_SELECTION.json is not sealed');

  const file = rel(frozenSelectionFile);

  if (execSync(`git ls-files -- ${file}`, { cwd: repoRoot }).toString().trim() !== file)
    throw new Error('FULL is closed: FROZEN_SELECTION.json is not committed');
  if (execSync(`git status --porcelain -- ${file}`, { cwd: repoRoot }).toString().trim())
    throw new Error('FULL is closed: FROZEN_SELECTION.json differs from its commit');

  const m = readJson<{ kind: string }>(frozenSelectionFile);

  if (!m.kind.startsWith(`${STUDY} frozen selection`)) throw new Error('FULL is closed: not this study’s frozen selection');
  return sha256File(frozenSelectionFile);
};

export const symDoorOf = (sym: string, history: MarketSession[], dataSha256: string): SymDoor => {
  const ds = fixtureDataset(history);

  ds.id = `${sym}:${dataSha256.slice(0, 16)}:${ds.lastDate}`;
  ds.dataHash = dataSha256;
  // the Growth slot's label (Priority 3's engine keys its Growth book by it); the instrument is `sym`
  return { symbol: 'GDX', history, ds, bars: barsFromSessions(history, resolution), dataSha256 } as SymDoor;
};

// A Priority 3 Door shape holding ONE ETF in its Growth slot.
export const doorOfSessions = (name: string, sym: string, history: MarketSession[], dataSha256: string): Door => {
  const sd = symDoorOf(sym, history, dataSha256);

  return {
    name: `fixture:${name}`,
    sym: { GDX: sd, VGT: sd },
    dates: sd.ds.dates,
    from: history[0]!.date,
    to: history.at(-1)!.date,
    sessions: sd.ds.dates.length
  } as Door;
};

export interface EtfDoor {
  sym: string;
  key: DoorKey;
  door: Door;
  sessions: MarketSession[];
  splitsApplied: { effectiveDate: string; ratio: number }[];
  dataSha256: string;
}

export const doorName = (sym: string, key: DoorKey) => `${sym}:${key}`;
export const parseDoorName = (name: string) => {
  const [sym, key] = name.split(':') as [string, DoorKey];

  if (!sym || !key || (key !== 'FULL' && !(key in doorSpecs))) throw new Error(`bad door name ${name}`);
  return { sym, key };
};

// The sessions of one ETF on one door (verified, split-adjusted), without logging (the caller logs).
export const loadEtfSessions = async (sym: string, key: DoorKey) => {
  if (key === 'FULL') {
    checkFullGuard();

    const m = doorManifest();
    const sha = sha256File(canonicalFile(sym));

    if (sha !== m.symbols[sym]?.canonical.sha256) throw new Error(`${sym}: the canonical file changed (${sha})`);

    const loaded = await loadDatasetSessions({
      dataset: resolveDataset(sym, 'all'),
      startDate: chronology.firstSession,
      endDate: chronology.validationEnd,
      warmupSessions: 0,
      access: 'manual evaluation'
    });

    if (loaded.history[0]!.date !== chronology.firstSession || loaded.history.at(-1)!.date !== chronology.validationEnd)
      throw new Error(`${sym} FULL covers ${loaded.history[0]!.date} → ${loaded.history.at(-1)!.date}`);
    if (loaded.history.length !== fullSessions) throw new Error(`${sym} FULL: ${loaded.history.length} sessions`);

    return {
      sessions: loaded.history,
      splitsApplied: (loaded.report?.splitAdjustments ?? []).map((s) => ({ effectiveDate: s.effectiveDate, ratio: s.ratio })),
      dataSha256: sha
    };
  }

  const v = verifyDoorFile(sym, key);
  const spec = doorSpecs[key];
  const loaded = await loadDatasetSessions({
    dataset: resolveDataset(sym, doorFile(sym, key)),
    startDate: chronology.firstSession,
    endDate: spec.last,
    warmupSessions: 0
  });

  if (loaded.warmup !== 0) throw new Error(`${sym} ${key}: unexpected warm-up sessions`);
  if (loaded.history[0]!.date !== chronology.firstSession || loaded.history.at(-1)!.date !== spec.last)
    throw new Error(`${sym} ${key} covers ${loaded.history[0]!.date} → ${loaded.history.at(-1)!.date}`);
  if (loaded.history.length !== spec.sessions) throw new Error(`${sym} ${key}: ${loaded.history.length} sessions`);

  const adjusted = adjustSessionsForSplits(loaded.history, sym, readSplits());

  return {
    sessions: adjusted.sessions,
    splitsApplied: adjusted.applied.map((s) => ({ effectiveDate: s.effectiveDate, ratio: s.ratio })),
    dataSha256: v.sha256
  };
};

export const openEtfDoor = async (sym: string, key: DoorKey, purpose: string, quietLog = false): Promise<EtfDoor> => {
  const x = await loadEtfSessions(sym, key);
  const name = doorName(sym, key);

  if (!quietLog)
    logDoor(name, purpose, {
      sha256: x.dataSha256,
      ...(key === 'FULL' ? { guard: sha256File(frozenSelectionFile) } : {})
    });
  return {
    sym,
    key,
    door: doorOfSessions(name, sym, x.sessions, x.dataSha256),
    sessions: x.sessions,
    splitsApplied: x.splitsApplied,
    dataSha256: x.dataSha256
  };
};

// The study's binding of an archive to a door (its pin): the prefix door's sha256 or, for FULL, the canonical file's.
export const doorPinOf = (sym: string, key: DoorKey) =>
  key === 'FULL' ? `${sym}:FULL:${doorManifest().symbols[sym]!.canonical.sha256}` : `${sym}:${key}:${doorManifest().symbols[sym]!.doors[key].sha256}`;
