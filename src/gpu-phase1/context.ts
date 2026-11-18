// gpu-phase1-feasibility (research/gpu-phase1-feasibility/PROTOCOL.md): RTX 5090 feasibility and proof of concept.
// RESEARCH ONLY: the CPU engine (RC 2's controlled D1 books, Priority 3's Growth books, pool and compact record) is the
// canonical reference and is never edited; the GPU proof of concept lives in src/gpu-phase1/cuda/ and is never wired
// into a research runner. This file holds the study's constants and its quiet door access.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { MarketSession } from '#types';
import { type Door, fixtureDoorOf, openFullDoor, openPrefixDoor } from '../vg-d1-growth-joint/data.ts';
import { frozenSelectionFile as p3FrozenSelectionFile } from '../vg-d1-growth-joint/context.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'gpu-phase1-feasibility';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const buildDir = path.join(researchDir, 'build'); // git-ignored: compiled CUDA binaries
export const cacheDir = path.join(researchDir, 'cache'); // git-ignored: exported binary bar files
export const cudaDir = path.join(import.meta.dirname, 'cuda');
export const doorLog = path.join(resultsDir, 'doors.jsonl');

export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

// The user-space CUDA 13.2 toolchain (RESEARCH_RECOVERY.md §Environment): never on PATH, never system-wide.
export const cudaHome =
  process.env.GPUP1_CUDA_HOME ??
  '/home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv/lib/python3.14/site-packages/nvidia/cu13';

// Regime windows (PROTOCOL.md §3): contiguous session slices of D24, both symbols, built as fixture doors.
export const windows = {
  'W-QUIET': { from: '2017-01-03', to: '2017-12-29', regime: 'quiet, low volatility' },
  'W-CRASH': { from: '2019-10-01', to: '2020-12-31', regime: 'crash and recovery (2020)' },
  'W-BEAR': { from: '2021-11-01', to: '2023-03-31', regime: 'extended drawdown (2022 bear)' },
  'W-TREND': { from: '2023-01-03', to: '2024-12-31', regime: 'strong trend (2023-2024)' }
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

// Opens a door QUIETLY (Priority 3's door log silenced) and logs the opening in this study's results/doors.jsonl.
// FULL goes through Priority 3's loader and guard (AD3). A window is a contiguous slice of D24's sessions.
export const openDoor = async (name: DoorKey, purpose: string, keepHistory = true): Promise<Door> => {
  const hit = cache.get(name);

  if (hit) return hit;

  let door: Door;

  if (name === 'FULL')
    door = await openFullDoor(purpose, { file: p3FrozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true);
  else if (isWindow(name)) {
    const base = await openDoor('D24', `${purpose} (window base)`);
    const w = windows[name];
    const slice = (h: MarketSession[]) => h.filter((s) => s.date >= w.from && s.date <= w.to);

    door = fixtureDoorOf(name, { GDX: slice(base.sym.GDX.history), VGT: slice(base.sym.VGT.history) });
  } else door = await openPrefixDoor(name, purpose, true);

  logDoor(name, purpose, {
    sha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
    sessions: door.sessions,
    first: door.dates[0],
    last: door.dates.at(-1)
  });
  if (!keepHistory)
    for (const s of ['GDX', 'VGT'] as const) door.sym[s].history = new Array(door.sym[s].history.length);
  cache.set(name, door);
  return door;
};

export const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`);
};

export const median = (xs: number[]) => {
  if (xs.length === 0) return NaN;

  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;

  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

export const quantileOf = (xs: number[], q: number) => {
  if (xs.length === 0) return NaN;

  const s = [...xs].sort((a, b) => a - b);
  const h = (s.length - 1) * q;
  const lo = Math.floor(h);

  return s[lo]! + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)] ?? s[lo]!) - s[lo]!);
};
