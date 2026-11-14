// vg-l0-risk-families: Assignment 2 of the New L0 risk-aware successor programme (research/vg-l0-risk-families/
// brief/BRIEF.md) — D1 risk-control families (RC 2: src/d1-risk-controls-rc2/) optimized over all 64 RC 1 base cells and
// the 132 entry-day activation cells of the two D1 books, with New L0's Growth·VGT frozen, and the original NL0 versus a
// precommitted risk-aware candidate selection on identical candidate populations. research/vg-l0-risk-families/
// PROTOCOL.md is the authority; this file holds its constants.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'vg-l0-risk-families';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');
export const frozenSelectionFile = path.join(researchDir, 'FROZEN_SELECTION.json');

// Every seed of the study: deriveSeed(STUDY, ...labels) — this study's own namespace (never NL0's or 5B's).
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const symbols = ['GDX', 'VGT'] as const;
export type Sym = (typeof symbols)[number];

// The windows (standard §0.3). The common complete endpoint 2026-10-30 is re-verified from both canonical files.
export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30'
} as const;

// Priority 3's economics (unchanged): one fixed $100,000 principal, 5 bps per side, 11% simple interest by calendar day
// (365-day year); the research ceiling is a maximum minute drawdown of $35,000 on that fixed principal.
export const economics = { budget: 100_000, ceiling: 35_000, costBps: 5, rate: 0.11 };

// Containment (standard §6.2): every heavy unit runs inside one parent slice with these aggregate limits.
export const resources = {
  slice: 'vgl0rf.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  workers: Number(process.env.VGL0RF_WORKERS ?? 14),
  pressureBytes: 36 * 2 ** 30, // stop dispatching (checkpoint and exit 75) above this cgroup memory.current
  coordinatorOldSpaceMb: 12288,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: Number(process.env.VGL0RF_GC_EVERY ?? 64),
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  bookCacheEntries: Number(process.env.VGL0RF_BOOK_CACHE ?? 48), // Priority 3's Growth cache (one book: Growth·VGT)
  d1CacheEntries: Number(process.env.VGL0RF_D1_CACHE ?? 64), // RC 2's controlled D1 book cache per worker
  lruCapacity: 200_000,
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
