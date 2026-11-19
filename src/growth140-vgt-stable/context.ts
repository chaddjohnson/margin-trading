// growth140-vgt-stable: a follow-up of growth140-vgt-s8m (Growth 1.4.0 on VGT) — an audit of its development archive,
// a sensitivity diagnosis of #4, an independent and an informed search per entry family, chronological (expanding
// window) tests of the selection procedure, and one frozen comparison on 2025–2026.
// research/growth140-vgt-stable/PROTOCOL.md is the authority; this file holds its numeric rulebook.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'growth140-vgt-stable';
export const PRIOR = 'growth140-vgt-s8m'; // the completed study (read only)
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;
export const priorResearchDir = path.join(repoRoot, 'research', PRIOR);
export const priorCacheDir = path.join(repoRoot, '.cache', PRIOR);

// Every seed of the study: deriveSeed(STUDY, ...labels) (PROTOCOL.md §6.6).
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const symbol = 'VGT';
export const strategyKey = 'rise-from-recent-low-trading';
export const strategyVersion = '1.4.0';
export const resolution = '1d';
export const costBps = 5;
export const stressCosts = [10, 20] as const;

export const chronology = {
  firstSession: '2016-01-04',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-02',
  validationEnd: '2026-10-30'
} as const;

export const canonical = {
  file: path.join(repoRoot, 'data', symbol, 'data.csv'),
  sha256: '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e',
  partitionsFile: path.join(repoRoot, 'data', 'partitions.json'),
  splitsFile: path.join(repoRoot, 'config', 'market-events', 'splits.json')
} as const;

// PROTOCOL.md §2: the physical doors. Each is the byte prefix of the canonical file holding every row whose New York
// date is ≤ its last session (every row before the next New York midnight, in UTC). Their sizes and hashes are measured
// by `build-doors` and pinned in results/doors-pins.json (frozen with the protocol).
export const doorSpecs = {
  D19: { last: '2019-12-31', capUtc: '2020-01-01T05:00:00Z' },
  D21: { last: '2021-12-31', capUtc: '2022-01-01T05:00:00Z' },
  D23: { last: '2023-12-29', capUtc: '2024-01-01T05:00:00Z' },
  D24: { last: '2024-12-31', capUtc: '2025-01-01T05:00:00Z' }
} as const;

export type PrefixDoor = keyof typeof doorSpecs;
export type DoorName = PrefixDoor | 'FULL' | `fixture:${number}`;
export const doorFile = (d: PrefixDoor) => path.join(cacheRoot, 'doors', `${symbol}-${d}.csv`);
export const doorPinsFile = path.join(resultsDir, 'doors-pins.json');
// The completed study's development prefix: D24 must be byte-identical to it.
export const priorDevSha256 = 'c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb';

// PROTOCOL.md §7: the cutoffs. C19–C23 are the chronological folds inside development; C24 is the final development
// selection, compared once on 2025–2026 (the FULL door).
export interface Cutoff {
  key: 'C19' | 'C21' | 'C23' | 'C24' | 'P18';
  train: PrefixDoor;
  evalDoor: PrefixDoor | 'FULL';
  boundary: string; // the last training session (the slice starts after its close)
  evalFirst: string;
  evalLast: string;
}

export const cutoffs: Cutoff[] = [
  {
    key: 'C19',
    train: 'D19',
    evalDoor: 'D21',
    boundary: '2019-12-31',
    evalFirst: '2020-01-02',
    evalLast: '2021-12-31'
  },
  {
    key: 'C21',
    train: 'D21',
    evalDoor: 'D23',
    boundary: '2021-12-31',
    evalFirst: '2022-01-03',
    evalLast: '2023-12-29'
  },
  {
    key: 'C23',
    train: 'D23',
    evalDoor: 'D24',
    boundary: '2023-12-29',
    evalFirst: '2024-01-02',
    evalLast: '2024-12-31'
  },
  {
    key: 'C24',
    train: 'D24',
    evalDoor: 'FULL',
    boundary: '2024-12-31',
    evalFirst: '2025-01-02',
    evalLast: '2026-10-30'
  }
];

// The engineering pilot's pseudo-fold (inside D19: no data beyond 2019 is opened by the pilot).
export const pilotCutoff: Cutoff = {
  key: 'P18',
  train: 'D19',
  evalDoor: 'D19',
  boundary: '2018-12-31',
  evalFirst: '2019-01-02',
  evalLast: '2019-12-31'
};

export const cutoffOf = (key: string) => {
  const c = [...cutoffs, pilotCutoff].find((x) => x.key === key);

  if (!c) throw new Error(`unknown cutoff ${key}`);
  return c;
};

// PROTOCOL.md §4: the rules. The ceiling is inclusive (≤ $35,000 on the fixed $100,000 notional).
export const rules = {
  notional: 100000,
  ceiling: 35000,
  p10Floor: 0, // neighbourhood p10 net must be > 0
  band: 0.05, // the drawdown-preferring ranking band: 5% of the best remaining robust net
  confirmReps: 3,
  confirmN: 128,
  selectReps: 2,
  selectN: 128,
  episodeGap: 10, // a market move (episode): consecutive trades whose entry is ≤ 10 sessions after the previous exit
  haircut: 0.5 // the arithmetic diagnostic: the largest winning episode's profit reduced by 50%
} as const;

export const ga = { crossoverProbability: 0.9, crossoverEta: 15, mutationEta: 20 };

// PROTOCOL.md §6: the per-cell search budgets (one cell = one source × one entry family at one cutoff).
export interface GlobalBudget {
  screen: number;
  promote: number;
  r1: number;
  islands: number;
  islandsMax: number;
  population: number;
  newPerIsland: number;
  generations: number;
  patience: number;
  tolerance: number;
  saturation: number;
  r2: number;
  r2Keep: number;
  r2Distinct: number;
  r3: number;
  r3Keep: number;
  r3Distinct: number;
  refineN: number;
  refineStarts: number;
  refinePasses: number;
  refineDistinct: number;
  shortlist: number;
  distinct: number;
}

export interface InformedBudget extends Omit<GlobalBudget, 'screen' | 'promote'> {
  seeds: number;
  local: number;
  localScale: number;
}

export const budgets: Record<'study' | 'pilot', { global: GlobalBudget; informed: InformedBudget }> = {
  study: {
    global: {
      screen: 4096,
      promote: 640,
      r1: 16,
      islands: 2,
      islandsMax: 3,
      population: 128,
      newPerIsland: 2560,
      generations: 40,
      patience: 8,
      tolerance: 1e-3,
      saturation: 0.05,
      r2: 64,
      r2Keep: 64,
      r2Distinct: 0.02,
      r3: 128,
      r3Keep: 16,
      r3Distinct: 0.03,
      refineN: 32,
      refineStarts: 3,
      refinePasses: 2,
      refineDistinct: 0.05,
      shortlist: 5,
      distinct: 0.1
    },
    informed: {
      seeds: 6,
      local: 96,
      localScale: 1.5,
      r1: 16,
      islands: 1,
      islandsMax: 1,
      population: 64,
      newPerIsland: 1280,
      generations: 40,
      patience: 8,
      tolerance: 1e-3,
      saturation: 0.05,
      r2: 64,
      r2Keep: 24,
      r2Distinct: 0.02,
      r3: 128,
      r3Keep: 8,
      r3Distinct: 0.03,
      refineN: 32,
      refineStarts: 2,
      refinePasses: 2,
      refineDistinct: 0.05,
      shortlist: 4,
      distinct: 0.1
    }
  },
  pilot: {
    global: {
      screen: 256,
      promote: 48,
      r1: 16,
      islands: 2,
      islandsMax: 2,
      population: 16,
      newPerIsland: 64,
      generations: 6,
      patience: 8,
      tolerance: 1e-3,
      saturation: 0.05,
      r2: 64,
      r2Keep: 8,
      r2Distinct: 0.02,
      r3: 128,
      r3Keep: 3,
      r3Distinct: 0.03,
      refineN: 32,
      refineStarts: 1,
      refinePasses: 1,
      refineDistinct: 0.05,
      shortlist: 2,
      distinct: 0.1
    },
    informed: {
      seeds: 2,
      local: 8,
      localScale: 1.5,
      r1: 16,
      islands: 1,
      islandsMax: 1,
      population: 8,
      newPerIsland: 32,
      generations: 4,
      patience: 8,
      tolerance: 1e-3,
      saturation: 0.05,
      r2: 64,
      r2Keep: 4,
      r2Distinct: 0.02,
      r3: 128,
      r3Keep: 2,
      r3Distinct: 0.03,
      refineN: 32,
      refineStarts: 1,
      refinePasses: 1,
      refineDistinct: 0.05,
      shortlist: 2,
      distinct: 0.1
    }
  }
};

// PROTOCOL.md §3: the resource contract (the user's 2026-11-07 limits, enforced on a shared parent slice).
export const resources = {
  slice: 'growth140-stable.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  pressure: '16G', // stop-and-checkpoint threshold (the completed study's measured peak was 8.38 GiB with 12 workers)
  coordinatorOldSpaceMb: 3072,
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
