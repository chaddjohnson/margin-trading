// vg-balanced-entry-eligibility: Priority 1 — a bounded entry eligibility for D1 signals refused for capital, on the
// fixed VG #2 Balanced pool (Study 8 S8-VG-F24-3, runner alias s8-vg-balanced), D1 parameters fixed.
// research/vg-balanced-entry-eligibility/PROTOCOL.md is the authority; this file holds its numeric rulebook.
import path from 'node:path';
import { deriveSeed } from '../optimizer/rng.ts';

export const STUDY = 'vg-balanced-entry-eligibility';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;
export const protocolFile = path.join(researchDir, 'PROTOCOL.md');
export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');

// Every seed of the study: deriveSeed(STUDY, ...labels) (PROTOCOL.md §7).
export const seedOf = (...labels: (string | number)[]) => deriveSeed(STUDY, ...labels);

export const controlAlias = 's8-vg-balanced';
export const controlId = 'S8-VG-F24-3';
export const symbols = ['VGT', 'GDX'] as const;
export type Etf = (typeof symbols)[number];
export const costBps = 5;
export const ceiling = 35000; // the fixed-notional minute drawdown budget: strictly below $35,000 (35% of $100,000)
export const notional = 100000;

export const chronology = {
  firstSession: '2016-01-04',
  firstEligible: '2017-06-15',
  developmentEnd: '2024-12-31',
  validationStart: '2025-01-01',
  validationEnd: '2026-10-30'
} as const;

export const canonical = {
  VGT: {
    file: path.join(repoRoot, 'data', 'VGT', 'data.csv'),
    sha256: '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e'
  },
  GDX: {
    file: path.join(repoRoot, 'data', 'GDX', 'data.csv'),
    sha256: '77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049'
  },
  partitions: {
    file: path.join(repoRoot, 'data', 'partitions.json'),
    sha256: '43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6'
  }
} as const;

// The physical doors (PROTOCOL.md §3): byte prefixes of each canonical file holding every row before the New York
// midnight that follows the door's last session. FULL is the canonical files themselves, to the validation end.
export const doorSpecs = {
  D19: { last: '2019-12-31', capUtc: '2020-01-01T05:00:00Z', partition: 'training', access: 'optimization' },
  D21: { last: '2021-12-31', capUtc: '2022-01-01T05:00:00Z', partition: 'training', access: 'optimization' },
  D23: { last: '2023-12-29', capUtc: '2024-01-01T05:00:00Z', partition: 'training', access: 'optimization' },
  D24: { last: '2024-12-31', capUtc: '2025-01-01T05:00:00Z', partition: 'all', access: 'manual evaluation' }
} as const;

export type PrefixDoor = keyof typeof doorSpecs;
export type DoorName = PrefixDoor | 'FULL';
export const doorRoot = (door: PrefixDoor) => path.join(cacheRoot, 'doors', door);
export const doorPinsFile = path.join(resultsDir, 'doors-pins.json');

// PROTOCOL.md §6: the bounded grid.
export const ages = [1, 3, 5, 10, 20] as const;
export const extensions = [0, 0.01, 0.03, 0.05] as const;
export const etfSets = ['VGT', 'GDX', 'VGT+GDX'] as const;
export type EtfSet = (typeof etfSets)[number];

// PROTOCOL.md §8: the chronological folds (selection cutoff → the following non-overlapping evaluation period) and
// the primary development selection, evaluated once on 2025–2026 (the FULL door).
export const folds = [
  { name: 'C19', door: 'D19', evaluation: { first: '2020-01-01', last: '2021-12-31' }, evaluationDoor: 'D21' },
  { name: 'C21', door: 'D21', evaluation: { first: '2022-01-01', last: '2023-12-29' }, evaluationDoor: 'D23' },
  { name: 'C23', door: 'D23', evaluation: { first: '2024-01-01', last: '2024-12-31' }, evaluationDoor: 'D24' },
  { name: 'C24', door: 'D24', evaluation: { first: '2025-01-01', last: '2026-10-30' }, evaluationDoor: 'FULL' }
] as const;

// Report periods (calendar years and the two study windows); period drawdowns reset at each period's start.
export const reportPeriods = [
  ...Array.from({ length: 11 }, (_v, i) => ({
    name: String(2016 + i),
    first: `${2016 + i}-01-01`,
    last: `${2016 + i}-12-31`
  })),
  { name: 'development', first: '2016-01-01', last: '2024-12-31' },
  { name: 'validation', first: '2025-01-01', last: '2026-10-30' },
  { name: 'C19-eval', first: '2020-01-01', last: '2021-12-31' },
  { name: 'C21-eval', first: '2022-01-01', last: '2023-12-29' },
  { name: 'C23-eval', first: '2024-01-01', last: '2024-12-31' }
];

export const resources = {
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  pressure: '12G', // checkpoint-and-exit threshold for one job's cgroup (set from the pilot's measured peak)
  workerOldSpaceMb: 3072,
  gcEveryEvaluations: 8,
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 1,
  lruCapacity: 20000,
  storeCommitRows: 50,
  storeCommitMs: 2000,
  checkpointEveryMs: 30000,
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
