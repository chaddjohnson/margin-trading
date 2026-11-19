// gdx-growth-standalone (Priority 4A): a dedicated STANDALONE GDX Growth optimization. One GDX Growth 1.4.0 book alone on
// one fixed $100,000 principal budget (no D1, no VGT, no other symbol competing for capital), searched by an
// INDEPENDENT broad lane at C19, C21, C23 and C24 (canonical Growth boxes, fresh seeds, no prior vector) and a separately
// accounted INFORMED lane at C24 only (Appendix A and the predeclared Priority 3B/3C GDX vectors as controls and seeds).
// The evaluation is Priority 3's pooled engine with only Growth·GDX enabled (reused unchanged): a single Growth book is
// never refused, so the pooled run equals the canonical standalone run (re-verified trade by trade, parity.ts).
// research/gdx-growth-standalone/PROTOCOL.md is the authority; this file holds its constants.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'gdx-growth-standalone';
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

// Every seed of the study: deriveSeed(STUDY, ...labels). No label of this namespace was used before. Priority 5A's
// standalone instrument (report-only) is reproduced from its own namespace, 'vg-growth-funding-lifecycle'.
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const symbols = ['GDX', 'VGT'] as const; // the reused door holds both files; only GDX is ever traded
export type Sym = (typeof symbols)[number];

// The windows (brief "Dates, data access and chronological testing"; standard §0.3). The common complete endpoint
// 2026-10-30 is re-verified from the canonical GDX file by the door stage; nothing later exists.
export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30'
} as const;

// Priority 3's economics (part of the reused evaluation code): one fixed $100,000 principal budget, no compounding, 5 bps
// per side, $0 commission, 11% simple interest on a 365-day year, stops at the stop or the gapped open, fractional
// shares, price only. The ceiling is a maximum minute drawdown of $35,000 on that fixed budget (35% of the fixed
// principal, not of peak equity).
export const economics = { budget: 100_000, ceiling: 35_000, costBps: 5, rate: 0.11 };

// Containment (brief "Verification, safe resources and recovery"; standard §6.2): every heavy unit of this study runs
// inside ONE parent slice with these aggregate limits; units run one at a time; Claude and tmux stay outside.
export const resources = {
  slice: 'gdxg.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  workers: Number(process.env.GDXG_WORKERS ?? 12),
  pressureBytes: 36 * 2 ** 30, // stop dispatching (checkpoint and exit 75) above this cgroup memory.current
  coordinatorOldSpaceMb: 6144,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: Number(process.env.GDXG_GC_EVERY ?? 256),
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  bookCacheEntries: Number(process.env.VGJ_BOOK_CACHE ?? 256), // read by Priority 3's evaluate.ts in each worker
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
