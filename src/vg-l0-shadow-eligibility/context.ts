// vg-l0-shadow-eligibility: New L0 shadow-position entry eligibility (research/vg-l0-shadow-eligibility/brief/BRIEF.md).
// New L0's VGT + GDX D1 + Growth portfolio (Priority 5B `C24/L0/informed/R1#1 profit`: D1·GDX + D1·VGT + Growth·VGT,
// Growth·GDX OFF, one shared $100,000 slot, Growth lifecycle L0, calendar-day maximum holds) gains an EXPERIMENTAL,
// allocator-level shadow-position entry eligibility with three independent toggles (allocator.ts, evaluate.ts), and is
// re-optimized in four tracks with the recovered reference method NL0 1.0.0 (docs/research/methods/NEW_L0_METHOD.md):
// A1 incumbent-informed joint, A2 incumbent-informed sequential, B1 from-scratch joint, B2 from-scratch sequential.
// research/vg-l0-shadow-eligibility/PROTOCOL.md is the authority; this file holds its constants.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'vg-l0-shadow-eligibility';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');
export const frozenSelectionFile = path.join(researchDir, 'FROZEN_SELECTION.json');
export const controlManifestFile = path.join(researchDir, 'CONTROL_MANIFEST.json');

// Every seed of the study: deriveSeed(STUDY, ...labels) — this study's own namespace.
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const symbols = ['GDX', 'VGT'] as const;
export type Sym = (typeof symbols)[number];

// ----- the four tracks (PROTOCOL.md §7) and their steps -----
//   A1 informed · joint      — NL0's informed lane over every gene of the three books and the three toggles (C24 only)
//   A2 informed · sequential — step d1: the informed lane over the D1 pair and its two toggles (Growth OFF); step g: the
//                              informed lane over Growth·VGT and its toggle beside each frozen D1 finalist (C24 only)
//   B1 fresh · joint         — NL0's independent lanes over the whole joint genome (C19, C21, C23, C24)
//   B2 fresh · sequential    — step d1 then step g as in A2, with NL0's independent lanes (C19, C21, C23, C24)
export type Track = 'A1' | 'A2' | 'B1' | 'B2';
export const tracks: readonly Track[] = ['A1', 'A2', 'B1', 'B2'];
export type Step = 'joint' | 'd1' | 'g';
export const informedTrack = (t: Track) => t === 'A1' || t === 'A2';
export const sequentialTrack = (t: Track) => t === 'A2' || t === 'B2';
export const stepsOf = (t: Track): Step[] => (sequentialTrack(t) ? ['d1', 'g'] : ['joint']);
// a search job = (cutoff, track, step); its key
export const searchKey = (t: Track, step: Step) => (step === 'joint' ? t : `${t}-${step}`);

// The windows (standard §0.3). The common complete endpoint 2026-10-30 is re-verified from both canonical files by the
// door stage; nothing later exists.
export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30',
  nativeD1Arming: '2017-06-15'
} as const;

// The economics are Priority 3's (src/vg-d1-growth-joint/context.ts, part of the reused evaluation code): one fixed
// $100,000 principal budget, 5 bps per side, $0 commission, 11% simple interest on a 365-day year, stops at the stop or
// the gapped open. The ceiling is the maximum minute drawdown of $35,000 on that fixed budget (not on peak equity).
export const economics = { budget: 100_000, ceiling: 35_000, costBps: 5, rate: 0.11 };

// Containment (standard §6.2): every heavy unit runs inside one parent slice with these aggregate limits.
export const resources = {
  slice: 'vgl0se.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  workers: Number(process.env.VGL0SE_WORKERS ?? 14),
  pressureBytes: 36 * 2 ** 30, // stop dispatching (checkpoint and exit 75) above this cgroup memory.current
  coordinatorOldSpaceMb: 8192,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: Number(process.env.VGL0SE_GC_EVERY ?? 64),
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  bookCacheEntries: Number(process.env.VGL0SE_BOOK_CACHE ?? 48), // read by Priority 3's evaluate.ts in each worker
  lruCapacity: 100_000,
  storeCommitRows: 500,
  storeCommitMs: 2000,
  checkpointEveryMs: 60_000,
  sampleEveryMs: 10_000,
  queueChunk: 4096
};

export const nodeBinary = process.execPath;

let quiet = false;
export const setQuiet = (value: boolean) => {
  quiet = value;
};
export const log = (message: string) => {
  if (!quiet) console.log(`[${STUDY} ${new Date().toISOString().slice(11, 19)}Z] ${message}`);
};

export const r2 = (x: number) => Math.round(x * 100) / 100;
