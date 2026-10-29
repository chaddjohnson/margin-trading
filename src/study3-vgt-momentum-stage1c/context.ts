// Study 3, Stage 1c (research/study3-vgt-momentum-stage1c): D1-inspired protection rules for standalone VGT
// momentum over the full entry × exit × own-OUT contract × rule-mask matrix. Every constant comes from the frozen
// EXPERIMENT_MATRIX.json (read here, so code and matrix cannot drift); this file is bound by the code freeze.
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import type { ParamSpec } from '../study3-vgt-momentum/signals.ts';

// STAGE1C_ROOT redirects the study's result files to a scratch tree for the tests only; it is honoured only inside
// the operating system's temporary directory, and every write-once stage refuses it.
const inTemp = (value: string | undefined) =>
  value && path.resolve(value).startsWith(path.resolve(os.tmpdir())) ? value : undefined;

export const testRoot = inTemp(process.env.STAGE1C_ROOT);
export const studyDir = 'research/study3-vgt-momentum-stage1c';
export const researchRoot = testRoot ? path.join(testRoot, 'research') : studyDir;
export const resultsRoot = path.join(researchRoot, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const codeRoot = 'src/study3-vgt-momentum-stage1c';
export const scriptName = 'study3-momentum-stage1c';
export const stage1bDir = 'research/study3-vgt-momentum-stage1b';

export const files = {
  brief: path.join(studyDir, 'brief', 'BRIEF.md'),
  protocol: path.join(studyDir, 'PROTOCOL.md'),
  contract: path.join(studyDir, 'ENGINE_CONTRACT.md'),
  matrix: path.join(studyDir, 'EXPERIMENT_MATRIX.json'),
  catalog: path.join(studyDir, 'MECHANISM_CATALOG.md'),
  protocolFreeze: path.join(researchRoot, 'PROTOCOL_FREEZE.json'),
  codeFreeze: path.join(resultsRoot, 'code_freeze.json'),
  amendments: path.join(resultsRoot, 'amendments.jsonl')
};

export type Mask = '000' | '100' | '010' | '001' | '110' | '101' | '011' | '111';
export type Contract = 'rep' | 'or' | 'ret';
export type HistoryKey = 'A' | 'B' | 'C' | 'D' | 'H';
export type FoldKey = Exclude<HistoryKey, 'H'>;

export interface MatrixCell {
  index: number;
  key: string;
  entry: string;
  exit: string;
  contract: Contract;
  mask: Mask;
  dims: string[];
  dimensions: number;
  firstPassPlanned: number;
  status: string;
}

interface Matrix {
  study: string;
  version: string;
  data: { firstSession: string; firstDecisionClose: string; cap: string; forbiddenFrom: string; barCeilingUtc: string };
  account: {
    principal: number;
    rate: number;
    costBps: number;
    financing: 'net';
    sizing: 'Z0';
    reentry: 'R3F';
    ddReference: number;
    rodFloor: number;
  };
  histories: Record<HistoryKey, { developmentEnd: string; window: [string, string] | null }>;
  pathStart: string;
  entries: Record<string, { kind: string; role: string; mandatory: boolean; dims: ParamSpec[] }>;
  exits: Record<string, { source: string; contracts: Contract[]; dims: ParamSpec[] }>;
  exitOrder: string[];
  rules: Record<'A' | 'B' | 'C', { name: string; dims: ParamSpec[] }>;
  masks: Mask[];
  search: {
    feasibility: {
      maxMinuteDd: number;
      minClosedTrades: number;
      minCampaigns: number;
      minYearsHeld: number;
      minLongShare: number;
    };
    firstPass: { global: number; centers: { byNet: number; byRod: number }; joint: number; jointRadius: number };
    deep: {
      global: number;
      globalFrom: number;
      localSeeds: { byNet: number; byRod: number };
      localPerSeed: number;
      localRadius: number;
      shortlist: { byNet: number; byRod: number };
      joint: number;
      jointRadius: number;
      pairs: { perMask: number; net: number; capPerEntry: number; capPerExit: number };
    };
    widening: { edge: number; extend: number; ruleLimits: Record<string, [number, number]> };
    fixedParent: { global: number; centers: { byNet: number; byRod: number }; joint: number; jointRadius: number };
    championFeasibility: number;
    tenBps: number;
    indices: { reference: number; referenceN8: number; local: number; fixedParent: number };
    caps: {
      firstPass: number;
      deepCellsMax: number;
      deepPerCell: number;
      fixedParentPerMask: number;
      perHistory: number;
      total: number;
    };
  };
  nulls: { paths: number; seedLabel: string; kinds: string[] };
  neighbourhoods: { oatStepFraction: number; oatSteps: number[]; jointDraws: number; jointRadius: number };
  stresses: {
    costs: number[];
    rates: number[];
    stopSlippageBps: number[];
    entrySlippageBps: number[];
    openSlippageBps: number[];
    delayMinutes: number[];
    missingBars: number[];
  };
  rubric: Record<string, number | string | string[]>;
  cellCount: number;
  cells: MatrixCell[];
}

export const matrix = fs.readJsonSync(files.matrix) as Matrix;

export const study = {
  id: matrix.study,
  node: 'v24.21.0',
  symbol: 'VGT',
  firstSession: matrix.data.firstSession,
  firstDecisionClose: matrix.data.firstDecisionClose,
  dataCap: matrix.data.cap, // no Stage 1c computation receives a bar after this session
  forbiddenFrom: matrix.data.forbiddenFrom,
  principal: matrix.account.principal,
  rate: matrix.account.rate,
  costBps: matrix.account.costBps,
  ddReference: matrix.account.ddReference,
  rodFloor: matrix.account.rodFloor,
  pathStart: matrix.pathStart
} as const;

export const histories = matrix.histories;
export const folds: FoldKey[] = ['A', 'B', 'C', 'D'];
export const historyKeys: HistoryKey[] = ['A', 'B', 'C', 'D', 'H'];
export const masks = matrix.masks;
export const cells = matrix.cells;
export const search = matrix.search;
export const neighbourhoods = matrix.neighbourhoods;
export const nulls = matrix.nulls;
export const stresses = matrix.stresses;
export const rubric = matrix.rubric as {
  positiveWindow: number;
  sumMin: number;
  positiveWindowsMin: number;
  minWindow: number;
  windowDd: number;
  chainDd: number;
  excessSumMin: number;
  excessWindow: number;
  excessWindowsMin: number;
  controlMargin: number;
  controls: string[];
  perturbedShareMin: number;
  perturbedMedianShare: number;
  stressSumMin: number;
  stresses: string[];
  flatTolerance2022: number;
  nearMissBand: number;
  pairedPerturbedShare: number;
  minOwnExits: number;
  minFirstEntries: number;
  minFirstEntryWindows: number;
  minWindowsWithPosition: number;
  minLongShare: number;
  protection2022Margin: number;
  trendRetention: number;
  winnerMargin: number;
  givebackShareMax: number;
  givebackPeakMin: number;
  protectionValueMargin: number;
};

// A deterministic 32-bit seed from a label (first 8 hex digits of its sha256), as Stages 1 and 1b.
export const seedOf = (label: string) => parseInt(createHash('sha256').update(label).digest('hex').slice(0, 8), 16);

export const nowIso = () => new Date().toISOString();

export const log = (line: string) => console.info(`[${scriptName}] ${new Date().toISOString().slice(11, 19)} ${line}`);
