// vg-growth-funding-lifecycle (Priority 5A, brought forward): a bounded fixed-arm comparison of Growth funding
// lifecycles (L0 current virtual book, L1 actual funding with fresh canonical opportunities only, L2 L1 plus one
// retained refused base opportunity) on UNCHANGED phenotypes, with matched development neighbourhoods and a standalone
// neighbourhood assessment. research/vg-growth-funding-lifecycle/PROTOCOL.md is the authority; this file holds its
// constants. No search, no selection, no tuning of the L2 constants.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'vg-growth-funding-lifecycle';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');
export const manifestFile = path.join(researchDir, 'STUDY_MANIFEST.json');
export const fullManifestFile = path.join(researchDir, 'FULL_MANIFEST.json');
export const codeDir = import.meta.dirname;

export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

// The windows (the brief §7; standard §0.3): development 2016-01-04 → 2024-12-31 (door D24 of Priority 3), validation
// reporting 2025-01-02 → 2026-10-30 (the verified common complete endpoint; FULL, continuous from 2016-01-04).
export const windows = {
  development: { from: '2016-01-04', to: '2024-12-31' },
  validation: { from: '2025-01-02', to: '2026-10-30' },
  boundary: '2024-12-31',
  prefixDoor: 'D23' // the shortened-prefix causality check (2016-01-04 → 2023-12-29)
} as const;

export const economics = { budget: 100_000, ceiling: 35_000 };

// The frozen ceilings (the brief §9; ceilings, not targets), counted in code across every sealed stage record.
// development: fresh complete pooled simulations on a prefix door (D24 or D23), any lifecycle, centres, neighbours,
// parity, causality and invariance checks included; full: fresh complete simulations on FULL. Archive reads, consistency
// rounds inside one L1/L2 evaluation and Growth book re-simulations are counted apart (compute disclosure).
export const ceilings = { development: 20_000, full: 200 };

// Containment (the user's limits; standard §6.2): every heavy stage is one transient user unit in this slice.
export const resources = {
  slice: 'vgflc.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  workers: 12, // child processes (each loads the door once); 8-core host, Priority 3's bench saturated at ≈ 12–16
  gcEvery: 64, // forced gc() per worker every 64 evaluations (Priority 3's bench), or above 256 MiB of ArrayBuffers
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  pressureBytes: 36 * 2 ** 30 // stop dispatching (checkpoint and exit) above this cgroup memory.current
};

export const r2 = (x: number) => Math.round(x * 100) / 100;

let quiet = false;
export const setQuiet = (v: boolean) => {
  quiet = v;
};
export const log = (message: string) => {
  if (!quiet) console.log(`[${STUDY} ${new Date().toISOString().slice(11, 19)}Z] ${message}`);
};
