// growth-etf-screening (Priority 7A): a bounded STANDALONE Growth suitability screening across the repository's
// inventoried ETFs. Each eligible ETF gets the same small independent Growth 1.4.0 search (two paired seeds × two
// protected entry cells) at C19, C21, C23 and C24, the same qualification instrument and, at C24 only, a separately
// accounted informed TRANSFER lane of predeclared exact VGT/GDX Growth vectors. Every ETF simulation is an alternative
// use of one fixed $100,000 principal budget; results are never summed across ETFs.
//
// The evaluation is Priority 3's pooled engine, unchanged (src/vg-d1-growth-joint/evaluate.ts; 4A's path), with only its
// Growth "slot" enabled and THE ETF's own door in that slot (the engine's symbol is a label; a single Growth book is
// never refused, so the pooled run is the canonical standalone run — re-verified trade by trade against the canonical
// runRiseTrading + summarizeSimulation on every ETF, parity.ts).
// research/growth-etf-screening/PROTOCOL.md is the authority; this file holds its constants.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'growth-etf-screening';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');
export const frozenSelectionFile = path.join(researchDir, 'FROZEN_SELECTION.json');
export const universeFile = path.join(researchDir, 'UNIVERSE_MANIFEST.json');
export const transferManifestFile = path.join(researchDir, 'TRANSFER_MANIFEST.json');
export const doorManifestFile = path.join(resultsDir, 'doors', 'DOORS.json');
export const ledgerFile = path.join(resultsDir, 'budget-ledger.jsonl');

// Every seed of the study: deriveSeed(STUDY, ...labels). No label of this namespace was used before.
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

// The windows (brief "Dates, accounting and scope"; standard §0.3). The common complete endpoint 2026-10-30 is verified
// from the eligible files' metadata (dataset reports, sha256, last timestamps); nothing later exists.
export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30'
} as const;

// The physical byte-prefix doors of every eligible ETF's canonical file: every row whose New York date is ≤ the door's
// last session (Priority 3's caps: the next day 05:00 UTC = New York midnight in winter). Pins (bytes, rows, sha256,
// last row) are computed once from the canonical files and sealed in results/doors/DOORS.json; every opening verifies
// them before a byte is parsed.
export const doorSpecs = {
  D19: { last: '2019-12-31', capUtc: '2020-01-01T05:00:00Z', sessions: 1006 },
  D21: { last: '2021-12-31', capUtc: '2022-01-01T05:00:00Z', sessions: 1511 },
  D23: { last: '2023-12-29', capUtc: '2024-01-01T05:00:00Z', sessions: 2012 },
  D24: { last: '2024-12-31', capUtc: '2025-01-01T05:00:00Z', sessions: 2264 }
} as const;
export type PrefixDoor = keyof typeof doorSpecs;
export type DoorKey = PrefixDoor | 'FULL';
export const prefixDoors = Object.keys(doorSpecs) as PrefixDoor[];
export const fullSessions = 2723; // 2016-01-04 → 2026-10-30
export const doorFile = (sym: string, d: PrefixDoor) => path.join(cacheRoot, 'doors', sym, `${d}.csv`);

// The cutoffs (standard §1.8): each fold's training door, its evaluation door and slice. P18 is the engineering pilot's
// pseudo-fold (4A's): its search reads the whole D19 door and it treats 2019 as its "slice" — mechanics only, never a
// study result.
export interface CutoffSpec {
  key: string;
  door: PrefixDoor;
  end: string;
  evalDoor: DoorKey;
  slice: [string, string];
}

export const cutoffs: Record<string, CutoffSpec> = {
  C19: { key: 'C19', door: 'D19', end: '2019-12-31', evalDoor: 'D21', slice: ['2020-01-02', '2021-12-31'] },
  C21: { key: 'C21', door: 'D21', end: '2021-12-31', evalDoor: 'D23', slice: ['2022-01-03', '2023-12-29'] },
  C23: { key: 'C23', door: 'D23', end: '2023-12-29', evalDoor: 'D24', slice: ['2024-01-02', '2024-12-31'] },
  C24: { key: 'C24', door: 'D24', end: '2024-12-31', evalDoor: 'FULL', slice: ['2025-01-02', '2026-10-30'] },
  P18: { key: 'P18', door: 'D19', end: '2018-12-31', evalDoor: 'D19', slice: ['2019-01-02', '2019-12-31'] }
};
export const foldCutoffs = ['C19', 'C21', 'C23'] as const;
export const finalCutoff = (cut: string) => cut === 'C24' || cut === 'P18';

// Priority 3's economics (part of the reused evaluation code): one fixed $100,000 principal budget, no compounding, 5 bps
// per side, $0 commission, 11% simple interest on a 365-day year, stops at the stop or the gapped open, fractional
// shares, price only (no dividends or distributions). The ceiling is a maximum minute drawdown of $35,000 on that fixed
// budget (35% of the fixed principal, not of peak equity).
export const economics = { budget: 100_000, ceiling: 35_000, costBps: 5, rate: 0.11 };

// The hard compute ceiling (brief "Screening search"): fresh backend simulations of every kind (pilot, bench, parity,
// centres, neighbours, earlier cutoffs, stresses, fold, diagnostics and validation runs). Archive hits are counted apart.
export const hardCeiling = 2_000_000;

// Containment (brief "Correctness, resources and isolation"; standard §6.2): every heavy unit of this study runs inside
// ONE parent slice with these aggregate limits; Claude, tmux and the Strategy Lab server stay outside.
export const resources = {
  slice: 'getf.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  workers: Number(process.env.GETF_WORKERS ?? 12),
  pressureBytes: 36 * 2 ** 30, // stop dispatching (checkpoint and exit 75) above this cgroup memory.current
  coordinatorOldSpaceMb: 6144,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: Number(process.env.GETF_GC_EVERY ?? 256),
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  bookCacheEntries: Number(process.env.VGJ_BOOK_CACHE ?? 256), // read by Priority 3's evaluate.ts in each worker
  startBatch: Number(process.env.GETF_START_BATCH ?? 8), // workers parse their door this many at a time
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
