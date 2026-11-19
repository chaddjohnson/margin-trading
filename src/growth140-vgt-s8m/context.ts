// growth140-vgt-s8m: a Study 8–style (V track, F24 chronology) optimization of Growth 1.4.0
// (rise-from-recent-low-trading@1.4.0) on VGT, with bounded memory, a contained job and resumable checkpoints.
// research/growth140-vgt-s8m/PROTOCOL.md is the authority; this file holds its numeric rulebook.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'growth140-vgt-s8m';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;

// Every seed of the study: deriveSeed(STUDY, ...labels) (PROTOCOL.md §6).
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const symbol = 'VGT';
export const strategyKey = 'rise-from-recent-low-trading';
export const strategyVersion = '1.4.0';
export const resolution = '1d';
export const costBps = 5;

// PROTOCOL.md §2: the two chronological windows (New York regular-session dates).
export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30'
} as const;

// PROTOCOL.md §2.2: the development door is a physical byte prefix of the canonical file (every row whose New York
// date is ≤ 2024-12-31, i.e. every row before 2025-01-01T05:00:00Z).
export const data = {
  canonicalFile: path.join(repoRoot, 'data', symbol, 'data.csv'),
  canonicalSha256: '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e',
  devFile: path.join(cacheRoot, 'dev', `${symbol}-dev.csv`),
  devSha256: 'c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb',
  devBytes: 42469694,
  devRows: 743918,
  devSessions: 2264,
  devFirstExcludedUtc: '2025-01-01T05:00:00Z',
  partitionsFile: path.join(repoRoot, 'data', 'partitions.json'),
  partitionsSha256: '43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6',
  splitsFile: path.join(repoRoot, 'config', 'market-events', 'splits.json'),
  splitsSha256: 'e5bde427182fea627e38aba69c14ae16cf8b7e428e75bf4153e55db1d1cb5ba2'
} as const;

// PROTOCOL.md §7: fixed economics (the engine's EXECUTION: $100,000 fixed notional, 11% simple interest on a 365-day
// year, stops at the stop or the gapped open; $0 commission) and the cost stresses.
export const stressCosts = [10, 20] as const;

// PROTOCOL.md §5: eligibility (Study 8's rulebook; C4 and E3 do not apply to one book).
export const eligibility = {
  ceiling: 35000, // strict: a minute drawdown must be < $35,000
  share: 0.9,
  lotsPerYear: 1.5,
  episodesPerYear: 0.5,
  minLotYears: 3,
  medianPerYear: 10000,
  p10Floor: 0,
  perCapitalYear: 11000,
  topLotShare: 0.25,
  topYearShare: 0.75,
  exBestPerYear: 5000,
  confirmationOfCentre: 0.6, // Q8
  marginalShare: 0.93,
  marginalCentreDd: 33000
} as const;

export const episodeGap = 10; // a new episode starts when an entry is > 10 sessions after the previous exit

// PROTOCOL.md §6: the search schedule (Study 8 §7.1 with the dimension scale of §6.1). `pilot` is the engineering
// pilot's scaled-down schedule (never used for a study result).
export interface Schedule {
  screen: number;
  r1: number;
  r1Cap: number;
  islands: number;
  islandsMax: number;
  population: number;
  newPerIsland: number;
  generations: number;
  patience: number;
  tolerance: number;
  r2: number;
  r2Keep: number;
  r2Distinct: number;
  r3: number;
  r3Keep: number;
  r3Distinct: number;
  refineN: number;
  refineStarts: number;
  refineDistinct: number;
  refinePasses: number;
  refineMinGain: number;
  shortlist: number;
  distinct: number;
  select: number;
  selectReps: number;
  confirm: number;
  confirmReps: number;
  t1: boolean;
}

export const ga = { crossoverProbability: 0.9, crossoverEta: 15, mutationEta: 20 };

export const schedules: Record<'study' | 'pilot', Schedule> = {
  study: {
    screen: 16384,
    r1: 16,
    r1Cap: 2560,
    islands: 4,
    islandsMax: 8,
    population: 160,
    newPerIsland: 5120,
    generations: 40,
    patience: 10,
    tolerance: 1e-3,
    r2: 64,
    r2Keep: 192,
    r2Distinct: 0.02,
    r3: 128,
    r3Keep: 48,
    r3Distinct: 0.03,
    refineN: 64,
    refineStarts: 6,
    refineDistinct: 0.05,
    refinePasses: 2,
    refineMinGain: 1000,
    shortlist: 6,
    distinct: 0.1,
    select: 128,
    selectReps: 2,
    confirm: 128,
    confirmReps: 3,
    t1: true
  },
  pilot: {
    screen: 512,
    r1: 16,
    r1Cap: 48,
    islands: 2,
    islandsMax: 2,
    population: 16,
    newPerIsland: 96,
    generations: 8,
    patience: 10,
    tolerance: 1e-3,
    r2: 64,
    r2Keep: 12,
    r2Distinct: 0.02,
    r3: 128,
    r3Keep: 4,
    r3Distinct: 0.03,
    refineN: 64,
    refineStarts: 1,
    refineDistinct: 0.05,
    refinePasses: 1,
    refineMinGain: 1000,
    shortlist: 2,
    distinct: 0.1,
    select: 128,
    selectReps: 2,
    confirm: 128,
    confirmReps: 3,
    t1: false
  }
};

// PROTOCOL.md §4.4: the radius of every numeric gene, in its own grid steps: max(1, round(0.1 × (levels − 1))).
export const radiusFraction = 0.1;

// The job's resource contract (PROTOCOL.md §3; the user's 2026-11-07 limits).
export const resources = {
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  pressure: '16G', // checkpoint-and-exit threshold: ≈ 2× the pilot's measured 12-worker working set (6.5 GiB peak)
  coordinatorOldSpaceMb: 2048,
  workerOldSpaceMb: 1024,
  gcEveryEvaluations: 8,
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
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
