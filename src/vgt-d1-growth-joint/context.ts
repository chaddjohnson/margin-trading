// vgt-d1-growth-joint (Priority 2): a joint optimization of D1 + Growth 1.4.0 on VGT in ONE shared $100,000 capital
// pool. research/vgt-d1-growth-joint/PROTOCOL.md is the authority; this file holds its numeric rulebook.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'vgt-d1-growth-joint';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;

// Every seed of the study: deriveSeed(STUDY, ...labels).
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const symbol = 'VGT';
export const growthKey = 'rise-from-recent-low-trading';
export const growthVersion = '1.4.0';
export const resolution = '1d';

// Economics (PROTOCOL.md §3): one fixed $100,000 principal budget, no compounding, 5 bps per executed side, $0
// commission, 11% simple annual interest on outstanding principal by calendar day on a 365-day year, stops at the stop
// or the gapped open, no extra slippage.
export const economics = {
  budget: 100_000,
  notional: 100_000, // every virtual book's position size (decisions never depend on it)
  costBps: 5,
  rate: 0.11,
  stopFill: 'stop' as const,
  stopSlippageBps: 0,
  ceiling: 35_000 // the maximum minute drawdown ceiling: 35% of the $100,000 budget
};

export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30',
  nativeD1Eligibility: '2017-06-15', // Study 8's arming date (native reproduction and the prespecified sensitivity)
  sensitivityFunding: '2017-06-15' // the common later funding start (prespecified sensitivity, PROTOCOL.md §3.3)
} as const;

export const canonical = {
  file: path.join(repoRoot, 'data', symbol, 'data.csv'),
  sha256: '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e',
  splitsFile: path.join(repoRoot, 'config', 'market-events', 'splits.json')
} as const;

// The physical doors: byte prefixes of the canonical file holding every row whose New York date is ≤ the door's last
// session. The pins equal growth140-vgt-stable's (research/growth140-vgt-stable/results/doors-pins.json), recomputed
// and checked when this study builds its own copies.
export const doorSpecs = {
  D19: {
    last: '2019-12-31',
    capUtc: '2020-01-01T05:00:00Z',
    bytes: 18374863,
    rows: 319486,
    sha256: 'a2e4c721eee98fd0ad1f96f413c99c953b3804fdfe033c4e44e866d31dce81d1',
    lastRowUtc: '2019-12-31T21:00:00Z',
    sessions: 1006
  },
  D21: {
    last: '2021-12-31',
    capUtc: '2022-01-01T05:00:00Z',
    bytes: 28414685,
    rows: 495874,
    sha256: '681742034cde1b9d52580b50b8f0c7f02d3c6bc54b9428f3f427a788f9a2a60e',
    lastRowUtc: '2021-12-31T21:57:00Z',
    sessions: 1511
  },
  D23: {
    last: '2023-12-29',
    capUtc: '2024-01-01T05:00:00Z',
    bytes: 37879762,
    rows: 663135,
    sha256: '920f3a20299b3241759fcc70b15045f4634ff3b7d423125c8abe87edbb5a812c',
    lastRowUtc: '2023-12-29T21:28:00Z',
    sessions: 2012
  },
  D24: {
    last: '2024-12-31',
    capUtc: '2025-01-01T05:00:00Z',
    bytes: 42469694,
    rows: 743918,
    sha256: 'c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb',
    lastRowUtc: '2024-12-31T21:11:00Z',
    sessions: 2264
  }
} as const;

export type PrefixDoor = keyof typeof doorSpecs;
export type DoorName = PrefixDoor | 'FULL';
export const doorFile = (d: PrefixDoor) => path.join(cacheRoot, 'doors', `${symbol}-${d}.csv`);
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const frozenSelectionFile = path.join(researchDir, 'FROZEN_SELECTION.json');

// The job's resource contract (the user's 2026-11-07 limits; PROTOCOL.md §10).
export const resources = {
  slice: 'vgtjoint.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  pressureBytes: 16 * 2 ** 30, // checkpoint-and-exit threshold of the job cgroup
  coordinatorOldSpaceMb: 3072,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: 8,
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  bookCacheEntries: 48, // per worker: D1 and Growth virtual books, each (compact trade lists only)
  lruCapacity: 50000,
  storeCommitRows: 500,
  storeCommitMs: 2000,
  checkpointEveryMs: 60000,
  sampleEveryMs: 10000
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
