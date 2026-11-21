// gpu-phase6 (research/gpu-phase6/PROTOCOL.md): the study's constants and its quiet door access — a copy of
// src/gpu-phase5/context.ts with this study's namespace (door log, seeds, caches), so that no completed study's records
// are appended to. RESEARCH CODE: the TypeScript/CPU
// engine is the canonical reference and is never edited; the GPU backend lives in src/gpu-backend/. Doors are opened
// through Priority 3's loaders with its door log silenced and logged in this study's own results/doors.jsonl.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { MarketSession } from '#types';
import { type Door, fixtureDoorOf, openFullDoor, openPrefixDoor } from '../vg-d1-growth-joint/data.ts';
import { frozenSelectionFile as p3FrozenSelectionFile } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'gpu-phase6';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const buildDir = path.join(researchDir, 'build'); // git-ignored: compiled CUDA binaries
export const cacheDir = path.join(researchDir, 'cache'); // git-ignored: exported datasets, job archives
export const doorLog = path.join(resultsDir, 'doors.jsonl');

export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

// Phase 1's regime windows (contiguous session slices of D24) and the brief's episodes (slices of FULL)
export const windows = {
  'W-QUIET': { from: '2017-01-03', to: '2017-12-29', base: 'D24' },
  'W-CRASH': { from: '2019-10-01', to: '2020-12-31', base: 'D24' },
  'W-BEAR': { from: '2021-11-01', to: '2023-03-31', base: 'D24' },
  'W-TREND': { from: '2023-01-03', to: '2024-12-31', base: 'D24' },
  'E-2020': { from: '2020-01-02', to: '2020-12-31', base: 'D24' },
  'E-2022': { from: '2022-01-03', to: '2022-12-30', base: 'D24' },
  'E-2025': { from: '2025-01-02', to: '2025-12-31', base: 'FULL' }
} as const;
export type WindowKey = keyof typeof windows;
export type PrefixKey = 'D19' | 'D21' | 'D23' | 'D24';
export type DoorKey = PrefixKey | 'FULL' | WindowKey;
export const isWindow = (k: string): k is WindowKey => k in windows;

export const sha256File = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export const logDoor = (door: string, purpose: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.dirname(doorLog), { recursive: true });
  fs.appendFileSync(
    doorLog,
    `${JSON.stringify({ t: new Date().toISOString(), door, purpose, pid: process.pid, ...extra })}\n`
  );
};

const cache = new Map<string, Door>();

export const openDoor = async (name: DoorKey, purpose: string): Promise<Door> => {
  const hit = cache.get(name);

  if (hit) return hit;

  let door: Door;

  if (name === 'FULL')
    door = await openFullDoor(purpose, { file: p3FrozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true);
  else if (isWindow(name)) {
    const w = windows[name];
    const base = await openDoor(w.base, `${purpose} (window base)`);
    const slice = (h: MarketSession[]) => h.filter((s) => s.date >= w.from && s.date <= w.to);

    door = fixtureDoorOf(name, { GDX: slice(base.sym.GDX.history), VGT: slice(base.sym.VGT.history) });
  } else door = await openPrefixDoor(name, purpose, true);

  logDoor(name, purpose, {
    sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
    sessions: door.sessions,
    first: door.dates[0],
    last: door.dates.at(-1)
  });
  cache.set(name, door);
  return door;
};

// bigint → hex; ±Infinity / NaN → "__Inf" / "__-Inf" / "__NaN" (the store's encoding, as every sealed study record
// writes them — plain JSON.stringify would turn them into null and lose the sign)
export const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      value,
      (_k, v) =>
        typeof v === 'bigint'
          ? `0x${v.toString(16)}`
          : typeof v === 'number' && !Number.isFinite(v)
            ? Number.isNaN(v)
              ? '__NaN'
              : v > 0
                ? '__Inf'
                : '__-Inf'
            : v,
      1
    )}\n`
  );
};
