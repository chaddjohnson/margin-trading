// gpu-phase4 (a copy of src/gpu-phase3/doorSpec.ts with this study's namespace): a door named so that a child process can rebuild the identical door (a market door or window, or a
// seeded adversarial fixture).
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type DoorKey, openDoor } from './context.ts';
import { fixtureDoor } from './fixtures.ts';

export type DoorSpec = { kind: 'market'; name: DoorKey } | { kind: 'fixture'; seed: number; sessions: number };

export const doorLabel = (d: DoorSpec) => (d.kind === 'market' ? d.name : `S${d.seed}`);
export const resolveDoor = async (d: DoorSpec, purpose: string): Promise<Door> =>
  d.kind === 'market' ? openDoor(d.name, purpose) : fixtureDoor(d.seed, d.sessions);
