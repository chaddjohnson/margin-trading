// vg-d1-growth-joint (Priority 3): D1 + Growth 1.4.0 on VGT and GDX in ONE shared $100,000 capital pool, four
// components (D1·GDX, D1·VGT, Growth·GDX, Growth·VGT). research/vg-d1-growth-joint/PROTOCOL.md is the authority; this
// file holds its numeric rulebook.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'vg-d1-growth-joint';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;

// Every seed of the study: deriveSeed(STUDY, ...labels).
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

// The two ETFs, alphabetically (the shadow policy's tie order inside a family, VG #2's native order).
export const symbols = ['GDX', 'VGT'] as const;
export type Sym = (typeof symbols)[number];

export const growthKey = 'rise-from-recent-low-trading';
export const growthVersion = '1.4.0';
export const resolution = '1d';

// Economics (PROTOCOL.md §5): one fixed $100,000 principal budget, no compounding, 5 bps per executed side, $0
// commission, 11% simple annual interest on outstanding principal by calendar day on a 365-day year, stops at the stop
// or the gapped open, no extra slippage, price only (no dividends), fractional shares.
export const economics = {
  budget: 100_000,
  notional: 100_000, // every virtual book's position size (decisions never depend on it)
  costBps: 5,
  rate: 0.11,
  stopFill: 'stop' as const,
  stopSlippageBps: 0,
  ceiling: 35_000 // the maximum minute drawdown ceiling: 35% of the fixed $100,000 budget
};

export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30', // the common complete endpoint of VGT and GDX (verified from both files)
  nativeD1Eligibility: '2017-06-15', // Study 8's arming date (VG #2's native reproduction)
  sensitivityFunding: '2017-06-15' // the prespecified common later funding start (report-only)
} as const;

export const canonical: Record<Sym, { file: string; sha256: string }> = {
  GDX: {
    file: path.join(repoRoot, 'data', 'GDX', 'data.csv'),
    sha256: '77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049'
  },
  VGT: {
    file: path.join(repoRoot, 'data', 'VGT', 'data.csv'),
    sha256: '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e'
  }
};

export const splitsFile = path.join(repoRoot, 'config', 'market-events', 'splits.json');

// The physical doors: byte prefixes of each canonical file holding every row whose New York date is ≤ the door's last
// session. The VGT pins equal Priority 2's (src/vgt-d1-growth-joint/context.ts); the GDX pins are this study's,
// computed from the canonical file (D23's equals the GDX training partition's sha256 in data/GDX/dataset-report.json).
interface Pin {
  bytes: number;
  rows: number;
  sha256: string;
  lastRowUtc: string;
}

export const doorSpecs = {
  D19: {
    last: '2019-12-31',
    capUtc: '2020-01-01T05:00:00Z',
    sessions: 1006,
    pins: {
      GDX: {
        bytes: 27600084,
        rows: 512707,
        sha256: '528786451a8fa1ab40c3ba784937581d8a74d6ec088c9110f8655f64c3ac1e48',
        lastRowUtc: '2020-01-01T00:59:00Z'
      },
      VGT: {
        bytes: 18374863,
        rows: 319486,
        sha256: 'a2e4c721eee98fd0ad1f96f413c99c953b3804fdfe033c4e44e866d31dce81d1',
        lastRowUtc: '2019-12-31T21:00:00Z'
      }
    }
  },
  D21: {
    last: '2021-12-31',
    capUtc: '2022-01-01T05:00:00Z',
    sessions: 1511,
    pins: {
      GDX: {
        bytes: 42003277,
        rows: 781678,
        sha256: '3f98c79b4f8d20b50a15e7d6951936b47cb00872dd27484f6dff9299a5402e84',
        lastRowUtc: '2021-12-31T23:00:00Z'
      },
      VGT: {
        bytes: 28414685,
        rows: 495874,
        sha256: '681742034cde1b9d52580b50b8f0c7f02d3c6bc54b9428f3f427a788f9a2a60e',
        lastRowUtc: '2021-12-31T21:57:00Z'
      }
    }
  },
  D23: {
    last: '2023-12-29',
    capUtc: '2024-01-01T05:00:00Z',
    sessions: 2012,
    pins: {
      GDX: {
        bytes: 56299545,
        rows: 1047761,
        sha256: 'a9ea93aaace8f2a7cc29988c366b8ea1c7888bee5e2072a0703ec4a16a71b002',
        lastRowUtc: '2023-12-30T00:56:00Z'
      },
      VGT: {
        bytes: 37879762,
        rows: 663135,
        sha256: '920f3a20299b3241759fcc70b15045f4634ff3b7d423125c8abe87edbb5a812c',
        lastRowUtc: '2023-12-29T21:28:00Z'
      }
    }
  },
  D24: {
    last: '2024-12-31',
    capUtc: '2025-01-01T05:00:00Z',
    sessions: 2264,
    pins: {
      GDX: {
        bytes: 63940594,
        rows: 1189831,
        sha256: 'f78dbe2a1f88666b0095bde886903af4453df79147bc96da7dc916011ff5094c',
        lastRowUtc: '2025-01-01T00:56:00Z'
      },
      VGT: {
        bytes: 42469694,
        rows: 743918,
        sha256: 'c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb',
        lastRowUtc: '2024-12-31T21:11:00Z'
      }
    }
  }
} as const satisfies Record<string, { last: string; capUtc: string; sessions: number; pins: Record<Sym, Pin> }>;

export type PrefixDoor = keyof typeof doorSpecs;
export type DoorName = PrefixDoor | 'FULL';
export const doorFile = (d: PrefixDoor, s: Sym) => path.join(cacheRoot, 'doors', `${s}-${d}.csv`);
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const frozenSelectionFile = path.join(researchDir, 'FROZEN_SELECTION.json');

// The job's resource contract (the user's limits; PROTOCOL.md §13). Execution settings are set from the pilot bench.
export const resources = {
  slice: 'vgjoint.slice',
  workers: 15, // the pilot bench's choice: throughput saturates at ≈ 12–16 workers on the 8-core host
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  pressureBytes: 24 * 2 ** 30, // checkpoint-and-exit threshold of the job cgroup (well below MemoryHigh)
  coordinatorOldSpaceMb: 4096,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: Number(process.env.VGJ_GC_EVERY ?? 64), // the pilot bench's choice (8 → 64: +27% throughput, same memory)
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  // per worker and per book (D1·GDX, D1·VGT, Growth·GDX, Growth·VGT): compact trade lists only; the bench may override
  // it (VGJ_BOOK_CACHE) — the size changes speed and memory, never a result
  bookCacheEntries: Number(process.env.VGJ_BOOK_CACHE ?? 48),
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
