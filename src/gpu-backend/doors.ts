// gpu-backend: opens a data door for the GPU path on behalf of a study — Priority 3's prefix doors (D19, D21, D23, D24:
// byte prefixes verified by size, sha256 and last row before parsing) or its FULL door (2016-01-04 → 2026-10-30, behind
// Priority 3's frozen-selection guard) — quietly (no write into Priority 3's directory) and logs the opening in the
// calling study's own research/<study>/results/doors.jsonl. The official preflight tool uses it, so a preflight never
// writes into another study's records.
import fs from 'node:fs';
import path from 'node:path';
import { type Door, openFullDoor, openPrefixDoor } from '../vg-d1-growth-joint/data.ts';
import { frozenSelectionFile as p3FrozenSelectionFile } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { repoRoot } from './toolchain.ts';

export type StudyDoor = 'D19' | 'D21' | 'D23' | 'D24' | 'FULL';
export const studyDoors: readonly StudyDoor[] = ['D19', 'D21', 'D23', 'D24', 'FULL'];

export const openStudyDoor = async (study: string, name: StudyDoor, purpose: string): Promise<Door> => {
  if (!studyDoors.includes(name)) throw new Error(`unknown door ${name} (${studyDoors.join(', ')})`);

  const door =
    name === 'FULL'
      ? await openFullDoor(purpose, { file: p3FrozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true)
      : await openPrefixDoor(name, purpose, true);
  const log = path.join(repoRoot, study, 'results', 'doors.jsonl');

  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.appendFileSync(
    log,
    `${JSON.stringify({ t: new Date().toISOString(), door: name, purpose, pid: process.pid, sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 }, sessions: door.sessions, first: door.dates[0], last: door.dates.at(-1) })}\n`
  );
  return door;
};
