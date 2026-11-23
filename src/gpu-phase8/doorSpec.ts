// gpu-phase8 (a copy of src/gpu-phase5/doorSpec.ts with this study's namespace): a door named so that a child process can rebuild the identical door (a market door or window, or a
// seeded adversarial fixture).
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type DoorKey, openDoor } from './context.ts';
import { fixtureDoor } from '../gpu-phase5/fixtures.ts';
import { stagedFixtureDoor } from './stagedFixtures.ts';

// gpu-phase8 adds the staged-stop exactness fixtures (set T, src/gpu-phase8/stagedFixtures.ts)
export type DoorSpec =
  | { kind: 'market'; name: DoorKey }
  | { kind: 'fixture'; seed: number; sessions: number }
  | { kind: 'staged'; name: string };

export const doorLabel = (d: DoorSpec) => (d.kind === 'market' ? d.name : d.kind === 'staged' ? d.name : `S${d.seed}`);
export const resolveDoor = async (d: DoorSpec, purpose: string): Promise<Door> =>
  d.kind === 'market'
    ? openDoor(d.name, purpose)
    : d.kind === 'staged'
      ? stagedFixtureDoor(d.name)
      : fixtureDoor(d.seed, d.sessions);
