// vg-l0-session-hold: the New L0 trading-session re-optimization (research/vg-l0-session-hold/brief/BRIEF.md). The
// VGT + GDX D1 + Growth portfolio of New L0 (Priority 5B `C24/L0/informed/R1#1 profit`: D1·GDX + D1·VGT + Growth·VGT,
// Growth·GDX OFF, one shared $100,000 slot, Growth lifecycle L0) is re-optimized with the recovered reference method
// NL0 1.0.0 (docs/research/methods/NEW_L0_METHOD.md) under the EXPERIMENTAL maximum-hold unit "sessions" (NYSE trading
// sessions after the entry session) instead of calendar days. research/vg-l0-session-hold/PROTOCOL.md is the
// authority; this file holds its constants.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'vg-l0-session-hold';
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

// Every seed of the study: deriveSeed(STUDY, ...labels) — this study's own namespace (5B's labels, a new namespace).
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const symbols = ['GDX', 'VGT'] as const;
export type Sym = (typeof symbols)[number];

// The maximum-hold unit of an evaluation: 'cal' = calendar days (the frozen default; New L0 as selected), 'ses' = NYSE
// trading sessions (the experimental convention under test). The search runs under 'ses' only; controls and the A/B/C
// comparison run under both. The archive key carries the unit (lab.ts).
export type Unit = 'cal' | 'ses';
export const units: readonly Unit[] = ['cal', 'ses'];
export const searchUnit: Unit = 'ses';

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

// The planning ceiling of fresh backend simulations (the original 5B ceiling, kept): engineering, pilot, searches,
// qualifications, folds, cross-tests, diagnostics and the final stage. Archive hits are counted apart. Each job has a
// frozen cap (budgets.ts `simulationCaps`); their sum stays below this ceiling.
export const simulationCeiling = 3_000_000;

// Containment (standard §6.2): every heavy unit runs inside one parent slice with these aggregate limits.
export const resources = {
  slice: 'vgl0sh.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  workers: Number(process.env.VGL0SH_WORKERS ?? 14),
  pressureBytes: 36 * 2 ** 30, // stop dispatching (checkpoint and exit 75) above this cgroup memory.current
  coordinatorOldSpaceMb: 6144,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: Number(process.env.VGL0SH_GC_EVERY ?? 64),
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  bookCacheEntries: Number(process.env.VGL0SH_BOOK_CACHE ?? 48), // read by Priority 3's evaluate.ts in each worker
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
