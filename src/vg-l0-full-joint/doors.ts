// The doors (PROTOCOL.md §3): Priority 3's verified byte-prefix doors D19, D21, D23 and D24 (size, sha256 and last row
// verified before a byte is parsed), and FULL (2016-01-04 → 2026-10-30, the common complete endpoint) only behind this
// study's guard — FROZEN_SELECTION.json sealed (read-only), committed, unchanged — plus Priority 3's own guard, which its
// FULL loader requires. ONE pre-registered exception (PROTOCOL.md AD3, the foundation's precedent): stage V opens FULL
// to reproduce the frozen New L0 under legacy defaults only (its full-history figures are published), through
// `openFullForBaseline`, never through a worker. Every opening is logged in this study's doors.jsonl.
import { execSync } from 'node:child_process';
import { type Door, openFullDoor, openPrefixDoor, verifyDoorFile } from '../vg-d1-growth-joint/data.ts';
import {
  canonical as p3Canonical,
  doorSpecs,
  frozenSelectionFile as p3FrozenSelectionFile
} from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { STUDY, chronology, frozenSelectionFile, repoRoot, symbols } from './context.ts';
import { isSealed, logDoor, readJson, rel, sha256File } from './records.ts';

export type PrefixDoor = 'D19' | 'D21' | 'D23' | 'D24';
export type DoorKey = PrefixDoor | 'FULL';
export { doorSpecs };

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

const openFull = async (purpose: string, extra: Record<string, unknown>) => {
  const door = await openFullDoor(purpose, { file: p3FrozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true);

  logDoor('FULL', purpose, { ...extra, sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } });
  return door;
};

export const openStudyDoor = async (name: DoorKey, purpose: string): Promise<Door> => {
  if (name === 'FULL') return openFull(purpose, { guard: checkFullGuard() });

  const door = await openPrefixDoor(name, purpose, true);

  logDoor(name, purpose, { sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } });
  return door;
};

// Stage V only (AD3): New L0 under legacy defaults; refused once any search record exists.
export const openFullForBaseline = async (purpose: string, searchesStarted: boolean): Promise<Door> => {
  if (searchesStarted) throw new Error('the baseline exception of FULL is closed: a search has started');
  return openFull(`${purpose} [AD3: New L0 under legacy defaults only]`, { guard: 'AD3 baseline exception (stage V)' });
};

// The door stage's verification: the canonical files' sha256, every prefix door's pin, and the endpoint.
export const verifyDoors = () => {
  const out: Record<string, unknown> = {};

  for (const s of symbols) {
    const sha = sha256File(p3Canonical[s].file);

    if (sha !== p3Canonical[s].sha256) throw new Error(`the canonical ${s} file changed: ${sha}`);
    out[`canonical:${s}`] = { file: rel(p3Canonical[s].file), sha256: sha };
    for (const d of Object.keys(doorSpecs) as PrefixDoor[]) out[`${d}:${s}`] = verifyDoorFile(d, s);
  }

  out.endpoint = chronology.validationEnd;
  return out;
};
