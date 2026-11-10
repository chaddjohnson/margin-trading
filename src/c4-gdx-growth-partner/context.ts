// c4-gdx-growth-partner (Priority 3C): a bounded backend search of GDX Growth ONLY, beside three FIXED anchors in one
// shared $100,000 slot under the current funding lifecycle L0 (Priority 3's engine, reused unchanged):
//   R — C4-refined (Priority 3B's `C24/informed-fixed#1 profit`: VG #2's two D1 books + a refined VGT Growth book), the lead;
//   O — original C4 (VG #2's two D1 books + VGT Growth #4);
//   G — VGT Growth #4 alone (no D1), the smaller companion experiment.
// Every anchor's parameters are frozen; only Growth·GDX is searched. GDX Growth OFF (the unchanged anchor) is a real
// member and the no-improvement fallback of each arm. research/c4-gdx-growth-partner/PROTOCOL.md is the authority;
// this file holds its constants.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'c4-gdx-growth-partner';
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

// Every seed of the study: deriveSeed(STUDY, ...labels). No label of this namespace was used before. Priority 3B's
// instrument (the "archived instrument" here) is reproduced from its own namespace, 'vg-d1-growth-expanded'.
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const symbols = ['GDX', 'VGT'] as const;
export type Sym = (typeof symbols)[number];

// The windows (brief "Funding, dates and economics"; standard §0.3). The common complete endpoint 2026-10-30 is
// re-verified from both canonical files by the door stage; nothing later exists.
export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30',
  nativeD1Arming: '2017-06-15'
} as const;

// Priority 3's economics (part of the reused evaluation code): one fixed $100,000 principal budget, 5 bps per side,
// $0 commission, 11% simple interest on a 365-day year, stops at the stop or the gapped open. The ceiling is the maximum
// minute drawdown of $35,000 on that fixed budget (not on peak equity).
export const economics = { budget: 100_000, ceiling: 35_000, costBps: 5, rate: 0.11 };

// Containment (brief "Verification and resources"; standard §6.2): every heavy unit of this study runs inside ONE parent
// slice with these aggregate limits; no other study's heavy work is running (checked before each launch).
export const resources = {
  slice: 'c4gdx.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  workers: Number(process.env.C4G_WORKERS ?? 14),
  pressureBytes: 36 * 2 ** 30, // stop dispatching (checkpoint and exit 75) above this cgroup memory.current
  coordinatorOldSpaceMb: 6144,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: Number(process.env.C4G_GC_EVERY ?? 64),
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  bookCacheEntries: Number(process.env.VGJ_BOOK_CACHE ?? 1024), // read by Priority 3's evaluate.ts in each worker
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
