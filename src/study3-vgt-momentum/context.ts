// Study 3, Stage 1 (research/study3-vgt-momentum): standalone VGT long momentum / trend-participation mechanisms on
// one fixed $100,000 borrowed slot. Every constant of PROTOCOL.md is declared here so code and protocol can be
// compared line by line; this file is bound by the code freeze.
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

// STUDY3_ROOT redirects the study's files to a scratch tree for the tests only; it is honoured only inside the
// operating system's temporary directory, and every write-once stage refuses it.
const inTemp = (value: string | undefined) =>
  value && path.resolve(value).startsWith(path.resolve(os.tmpdir())) ? value : undefined;

export const testRoot = inTemp(process.env.STUDY3_ROOT);
export const researchRoot = testRoot ? path.join(testRoot, 'research') : 'research/study3-vgt-momentum';
export const resultsRoot = path.join(researchRoot, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const codeRoot = 'src/study3-vgt-momentum';
export const scriptName = 'study3-momentum';

export const files = {
  brief: path.join(researchRoot, 'brief', 'BRIEF.md'),
  protocol: path.join(researchRoot, 'PROTOCOL.md'),
  catalog: path.join(researchRoot, 'MECHANISM_CATALOG.json'),
  matrix: path.join(researchRoot, 'EXPERIMENT_MATRIX.json'),
  protocolFreeze: path.join(researchRoot, 'PROTOCOL_FREEZE.json'),
  codeFreeze: path.join(resultsRoot, 'code_freeze.json'),
  amendments: path.join(resultsRoot, 'amendments.jsonl')
};

export const study = {
  id: 'study3-vgt-independent-momentum-v1',
  node: 'v24.21.0',
  symbol: 'VGT',
  firstSession: '2016-01-04',
  firstDecisionClose: '2017-01-03', // the first close that may decide an entry; accounting starts at its close
  researchCap: '2023-12-29', // no Stage 1 run reads a bar after this session
  principal: 100000,
  rate: 0.11, // simple, 365-day year
  costBps: 5, // per side
  ddReference: 35000, // historical screening reference for the fixed slot's minute drawdown, not a stop
  gateDdLimit: 50000, // M1 gate (g3)
  maxLookback: 250,
  minClosedTrades: 6,
  minEntryYears: 3
} as const;

export type HistoryKey = 'A' | 'B' | 'C' | 'D' | 'H';
export type FoldKey = Exclude<HistoryKey, 'H'>;

export interface HistorySpec {
  key: HistoryKey;
  developmentEnd: string;
  window?: { boundary: string; end: string };
  purpose: string;
}

export const histories: Record<HistoryKey, HistorySpec> = {
  A: {
    key: 'A',
    developmentEnd: '2019-12-31',
    window: { boundary: '2019-12-31', end: '2020-12-31' },
    purpose: 'shock and recovery'
  },
  B: {
    key: 'B',
    developmentEnd: '2020-12-31',
    window: { boundary: '2020-12-31', end: '2021-12-31' },
    purpose: 'continuation, chop'
  },
  C: {
    key: 'C',
    developmentEnd: '2021-12-31',
    window: { boundary: '2021-12-31', end: '2022-12-30' },
    purpose: 'extended decline, false recoveries'
  },
  D: {
    key: 'D',
    developmentEnd: '2022-12-30',
    window: { boundary: '2022-12-30', end: '2023-12-29' },
    purpose: 'new advance while D1 is idle'
  },
  H: { key: 'H', developmentEnd: '2023-12-29', purpose: 'in-sample exploratory reference' }
};

export const folds: FoldKey[] = ['A', 'B', 'C', 'D'];
export const historyKeys: HistoryKey[] = ['A', 'B', 'C', 'D', 'H'];

// M3 budget (PROTOCOL.md §8), code-enforced.
export const search = {
  global: 1024,
  localSeeds: 4,
  localPerSeed: 32,
  localRadius: 0.1, // fraction of each parameter's range
  shortlist: 16,
  neighbourhoodStep: 0.1, // fraction of each parameter's range
  neighbourhoodFeasibility: 0.75,
  capPerHistory: 16000, // ≥ 4 × 1,328 + 6 × 1,296 + 2 × 1,264 = 15,616 if all twelve families pass M1
  capTotal: 80000,
  tenBps: 10
} as const;

// M5 settings (PROTOCOL.md §10).
export const robustness = {
  costs: [0, 2, 5, 10],
  rates: [0.08, 0.11, 0.14],
  stopSlippageBps: [10, 25, 50],
  entrySlippageBps: [10, 25],
  delayMinutes: [1, 5],
  missingBars: [0.01, 0.05],
  oatStep: 0.05,
  jointDraws: 64,
  jointRadius: 0.1,
  placeboDraws: 200,
  maxFinalists: 5
} as const;

// A deterministic 32-bit seed from a label (first 8 hex digits of its sha256).
export const seedOf = (label: string) => parseInt(createHash('sha256').update(label).digest('hex').slice(0, 8), 16);

export const nowIso = () => new Date().toISOString();

export const log = (line: string) => console.info(`[${scriptName}] ${line}`);
