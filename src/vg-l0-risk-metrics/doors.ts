// The doors this study opens (PROTOCOL.md §3): Priority 3's verified byte-prefix doors D19/D21/D23/D24 and FULL
// (2016-01-04 → 2026-10-30) through Priority 3's own loaders and guard, with Priority 3's door log SILENCED (quietLog) and
// every opening logged in THIS study's results/doors.jsonl instead. FULL is previously examined history: every audited
// configuration is a fixed, sealed selection of a completed study whose own FULL guard is sealed and committed.
import { type Door, openFullDoor, openPrefixDoor } from '../vg-d1-growth-joint/data.ts';
import { frozenSelectionFile as p3FrozenSelectionFile } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { fullJoint } from './context.ts';
import { isSealed, logDoor, sha256File } from './records.ts';

export type DoorKey = 'D19' | 'D21' | 'D23' | 'D24' | 'FULL';

const cache = new Map<DoorKey, Door>();

export const openDoor = async (name: DoorKey, purpose: string): Promise<Door> => {
  const hit = cache.get(name);

  if (hit) return hit;

  let door: Door;

  if (name === 'FULL') {
    // the audited study's guard: its frozen selection sealed (read-only) with the pinned sha256
    if (!isSealed(fullJoint.frozenSelection) || sha256File(fullJoint.frozenSelection) !== fullJoint.frozenSelectionSha256)
      throw new Error('FULL: Assignment 3’s frozen selection is not the sealed, pinned file');
    door = await openFullDoor(purpose, { file: p3FrozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true);
  } else door = await openPrefixDoor(name, purpose, true);

  logDoor(name, purpose, { sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 }, sessions: door.sessions, last: door.dates.at(-1) });
  cache.set(name, door);
  return door;
};
