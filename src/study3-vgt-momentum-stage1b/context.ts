// Study 3, Stage 1b (research/study3-vgt-momentum-stage1b): standalone VGT momentum — an executable chronological
// selector, independently optimised exit families, re-entry rules and optional sizing on one $100,000 borrowed slot.
// Every constant of PROTOCOL.md / EXPERIMENT_MATRIX.json is declared here (a test compares the two); this file is
// bound by the code freeze.
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

// STAGE1B_ROOT redirects the study's files to a scratch tree for the tests only; it is honoured only inside the
// operating system's temporary directory, and every write-once stage refuses it.
const inTemp = (value: string | undefined) =>
  value && path.resolve(value).startsWith(path.resolve(os.tmpdir())) ? value : undefined;

export const testRoot = inTemp(process.env.STAGE1B_ROOT);
export const studyDir = 'research/study3-vgt-momentum-stage1b';
export const researchRoot = testRoot ? path.join(testRoot, 'research') : studyDir;
export const resultsRoot = path.join(researchRoot, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const codeRoot = 'src/study3-vgt-momentum-stage1b';
export const scriptName = 'study3-momentum-stage1b';

export const files = {
  brief: path.join(researchRoot, 'brief', 'BRIEF.md'),
  protocol: path.join(researchRoot, 'PROTOCOL.md'),
  matrix: path.join(researchRoot, 'EXPERIMENT_MATRIX.json'),
  protocolFreeze: path.join(researchRoot, 'PROTOCOL_FREEZE.json'),
  codeFreeze: path.join(resultsRoot, 'code_freeze.json'),
  amendments: path.join(resultsRoot, 'amendments.jsonl')
};

export const study = {
  id: 'study3b-vgt-momentum-exits-exposure-chronology-v1',
  node: 'v24.21.0',
  symbol: 'VGT',
  firstSession: '2016-01-04',
  firstDecisionClose: '2017-01-03',
  dataCap: '2023-12-29', // no Stage 1b run reads a bar after this session
  forbiddenFrom: '2024-01-01',
  principal: 100000,
  rate: 0.11, // simple, 365-day year
  costBps: 5, // per side
  ddReference: 35000, // historical screening reference for the slot's minute drawdown, not a stop
  rodFloor: 10000, // RoD = net / max(minute DD, rodFloor)
  pathStart: '2019-12-31' // the executable paths start flat at this close
} as const;

export type HistoryKey = 'A' | 'B' | 'C' | 'D' | 'H';
export type FoldKey = Exclude<HistoryKey, 'H'>;

export const histories: Record<HistoryKey, { developmentEnd: string; window: [string, string] | null }> = {
  A: { developmentEnd: '2019-12-31', window: ['2019-12-31', '2020-12-31'] },
  B: { developmentEnd: '2020-12-31', window: ['2020-12-31', '2021-12-31'] },
  C: { developmentEnd: '2021-12-31', window: ['2021-12-31', '2022-12-30'] },
  D: { developmentEnd: '2022-12-30', window: ['2022-12-30', '2023-12-29'] },
  H: { developmentEnd: '2023-12-29', window: null }
};

export const folds: FoldKey[] = ['A', 'B', 'C', 'D'];
export const historyKeys: HistoryKey[] = ['A', 'B', 'C', 'D', 'H'];

export const panelEntries = [
  'E01',
  'E02',
  'E03',
  'E04',
  'E05',
  'E06',
  'E07',
  'E08',
  'E09',
  'E10',
  'E11',
  'E12',
  'C-SMA'
] as const;
export const exitControls = ['E06', 'E05', 'E03', 'C-SMA'] as const;

// The layered search (PROTOCOL.md §7).
export const search = {
  feasibility: { maxMinuteDd: 35000, minClosedTrades: 6, minCampaigns: 3, minYearsHeld: 3 },
  exitCell: {
    global: 1024,
    localSeeds: 4,
    localPerSeed: 32,
    localRadius: 0.1,
    shortlist: 16,
    joint: 32,
    jointRadius: 0.1
  },
  pairing: {
    global: 2048,
    localSeeds: 4,
    localPerSeed: 32,
    localRadius: 0.1,
    shortlist: 16,
    joint: 32,
    jointRadius: 0.1
  },
  sizingPairings: 3,
  reentryMinOpportunities: 5,
  championFeasibility: 0.75,
  tenBps: 10,
  wideningEdge: 0.05,
  wideningExtend: 0.5,
  caps: { perHistory: 222293, total: 1111465 }
} as const;

export const neighbourhoods = {
  oatStepFraction: 0.05,
  oatSteps: [-2, -1, 1, 2],
  jointDraws: 128,
  jointRadius: 0.1
} as const;

export const stresses = {
  costs: [0, 2, 10],
  rates: [0.08, 0.14],
  stopSlippageBps: [10, 25, 50],
  entrySlippageBps: [10, 25],
  openSlippageBps: [50],
  delayMinutes: [1, 5],
  missingBars: [0.01, 0.05]
} as const;

export const rubric = {
  positiveWindow: 2000,
  sumMin: 20000,
  positiveWindowsMin: 3,
  minWindow: -15000,
  windowDd: 35000,
  chainDd: 35000,
  excessSumMin: 10000,
  excessWindow: 2000,
  excessWindowsMin: 2,
  controlMargin: 5000,
  controls: ['C-SMA', 'C-DON', 'C-TSM'],
  neighbourhoodShareMin: 0.75,
  minWindowsWithPosition: 3,
  minClosedTrades: 6
} as const;

export const stage1Picks = {
  A: 'E06-9ee2ce7bd5',
  B: 'E04-86b6d59a31',
  C: 'E04-b4a27ac53b',
  D: 'E06-47640253c0',
  H: 'E06-4978efef20'
} as const;

// A deterministic 32-bit seed from a label (first 8 hex digits of its sha256), as Stage 1.
export const seedOf = (label: string) => parseInt(createHash('sha256').update(label).digest('hex').slice(0, 8), 16);

export const nowIso = () => new Date().toISOString();

export const log = (line: string) => console.info(`[${scriptName}] ${new Date().toISOString().slice(11, 19)} ${line}`);
