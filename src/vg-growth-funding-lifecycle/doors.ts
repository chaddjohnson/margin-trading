// The doors (PROTOCOL.md §3): Priority 3's verified byte-prefix doors D24 (development) and D23 (the shortened-prefix
// causality check), and FULL (2016-01-04 → 2026-10-30) only behind this study's FULL guard: FULL_MANIFEST.json sealed
// (read-only), committed and unchanged, listing the sealed development records that existed before it — plus Priority
// 3's own frozen-selection guard, which its FULL loader requires. Every opening is logged in this study's doors.jsonl.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { type Door, openFullDoor, openPrefixDoor } from '../vg-d1-growth-joint/data.ts';
import { frozenSelectionFile } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { fullManifestFile, repoRoot } from './context.ts';
import { isSealed, logDoor, readJson, rel, sha256File } from './records.ts';

export type DoorKey = 'D24' | 'D23' | 'FULL';

export const checkFullGuard = () => {
  if (!isSealed(fullManifestFile)) throw new Error('FULL is closed: FULL_MANIFEST.json is not sealed');

  const file = rel(fullManifestFile);

  if (execSync(`git ls-files -- ${file}`, { cwd: repoRoot }).toString().trim() !== file)
    throw new Error('FULL is closed: FULL_MANIFEST.json is not committed');
  if (execSync(`git status --porcelain -- ${file}`, { cwd: repoRoot }).toString().trim())
    throw new Error('FULL is closed: FULL_MANIFEST.json differs from its commit');

  const m = readJson<{ kind: string; sealedBefore: Record<string, string> }>(fullManifestFile);

  if (!m.kind.startsWith('FULL MANIFEST')) throw new Error('FULL is closed: not a FULL manifest');
  for (const [f, sha] of Object.entries(m.sealedBefore))
    if (sha256File(`${repoRoot}/${f}`) !== sha) throw new Error(`FULL is closed: ${f} changed`);
  return sha256File(fullManifestFile);
};

export const openStudyDoor = async (name: DoorKey, purpose: string): Promise<Door> => {
  if (name === 'FULL') {
    const guard = checkFullGuard();

    if (!fs.existsSync(frozenSelectionFile)) throw new Error("Priority 3's frozen selection is missing");

    const door = await openFullDoor(purpose, { file: frozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true);

    logDoor('FULL', purpose, { guard });
    return door;
  }

  const door = await openPrefixDoor(name, purpose, true);

  logDoor(name, purpose, { sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 } });
  return door;
};
