// Study 4 (research/study4-two-tier-d1-allocator): two-tier D1 capital allocation — shallow-dip specialists, frozen
// B5, priority/preemption and joint optimization in one shared $100,000 slot. Constants come from the frozen
// EXPERIMENT_MATRIX.json (read here, so code and matrix cannot drift); this file is bound by the code freeze.
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';

// STUDY4_ROOT redirects result files to a scratch tree for tests only; honoured only inside the OS temp directory.
const inTemp = (value: string | undefined) =>
  value && path.resolve(value).startsWith(path.resolve(os.tmpdir())) ? value : undefined;

export const testRoot = inTemp(process.env.STUDY4_ROOT);
export const studyDir = 'research/study4-two-tier-d1-allocator';
export const researchRoot = testRoot ? path.join(testRoot, 'research') : studyDir;
export const resultsRoot = path.join(researchRoot, 'results');
export const resultFile = (...parts: string[]) => path.join(resultsRoot, ...parts);
export const codeRoot = 'src/study4-two-tier-d1-allocator';
export const scriptName = 'study4-allocator';
export const archiveRoot = path.join(resultsRoot, 'archive'); // git-ignored heavy archives

export const files = {
  brief: path.join(studyDir, 'brief', 'CLAUDE_STUDY_4_TWO_TIER_D1_ALLOCATOR_SHALLOW_DEEP_JOINT_OPTIMIZATION.md'),
  protocol: path.join(studyDir, 'PROTOCOL.md'),
  contract: path.join(studyDir, 'ENGINE_CONTRACT.md'),
  searchPlan: path.join(studyDir, 'SEARCH_PLAN.md'),
  matrix: path.join(studyDir, 'EXPERIMENT_MATRIX.json'),
  audit: path.join(studyDir, 'SOURCE_AND_CONFLICTS_AUDIT.md'),
  dispositions: path.join(studyDir, 'reviews', 'PRE_FREEZE_DISPOSITIONS.md'),
  review1: path.join(studyDir, 'reviews', 'PRE_FREEZE_REVIEW_1_METHODOLOGY_LEAKAGE.md'),
  review2: path.join(studyDir, 'reviews', 'PRE_FREEZE_REVIEW_2_EXECUTION_CAUSALITY.md'),
  protocolFreeze: path.join(researchRoot, 'PROTOCOL_FREEZE.json'),
  codeFreeze: path.join(resultsRoot, 'CODE_FREEZE.json'),
  amendments: path.join(resultsRoot, 'amendments.jsonl')
};

export type WindowKey = 'F20' | 'F21' | 'F22' | 'F23' | 'H';
export type FoldKey = Exclude<WindowKey, 'H'>;
export const foldKeys: FoldKey[] = ['F20', 'F21', 'F22', 'F23'];
export const windowKeys: WindowKey[] = [...foldKeys, 'H'];

interface Matrix {
  study: string;
  dataCap: string;
  accountingStart: string;
  armingStart: string;
  control: { pool: string; config: string; configSha256: string };
  execution: { notional: number; interestRate: number; costBpsPerSide: number; stopSlippageBps: number };
  universe: { source: string; sourceSha256: string; symbols: string[]; excluded: Record<string, string> };
  windows: Record<WindowKey, { developmentEnd: string; evaluation: [string, string] | null }>;
  parameterBox: Record<string, [number, number] | string>;
  selection: {
    feasible: {
      minuteDrawdownMax: number;
      minuteDrawdownOverB5Max: number;
      dailyDrawdownMax: number;
      deltaNetMin: number;
      maxYearShare: number;
      leaveOneYearOut: boolean;
      preservation: {
        frozenB5: {
          pnlWeightedMin: number;
          countWeightedMin: number;
          topWinnersNotMissed: number;
          experiments: string[];
        };
        reoptimized: { pnlWeightedRetentionMin: number; topWinnersNotMissed: number; experiments: string[] };
      };
    };
    robust: {
      top: number;
      structurallyDistinct: boolean;
      perturbations: number;
      relative: number;
      medianDeltaMin: number;
      positiveShareMin: number;
    };
  };
  rubric: Record<string, unknown>;
}

const matrixFile = path.join(studyDir, 'EXPERIMENT_MATRIX.json');

export const matrix = fs.readJsonSync(matrixFile) as Matrix;

export const study = {
  id: matrix.study,
  seedLabel: 'study4-v1',
  dataCap: matrix.dataCap,
  accountingStart: matrix.accountingStart,
  armingStart: matrix.armingStart,
  notional: matrix.execution.notional,
  rate: matrix.execution.interestRate,
  costBps: matrix.execution.costBpsPerSide,
  stopSlippageBps: matrix.execution.stopSlippageBps,
  universe: matrix.universe.symbols,
  windows: matrix.windows
} as const;

if (study.universe.length !== 61 || new Set(study.universe).size !== 61) {
  throw new Error(`${matrixFile}: the universe must list 61 distinct symbols`);
}

export const b5Symbols = ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const;
export const b4Symbols = ['VGT', 'XBI', 'XRT', 'KRE'] as const;

// The D1 search box on the frozen grid (tenths of a percentage point, calendar days, sessions); X is set by the role.
export const paramKeys = [
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'maximumHoldDays',
  'tickWindowSize',
  'intradayLossBuffer',
  'pullback',
  'continuationWindow'
] as const;
export type ParamKey = (typeof paramKeys)[number];
export type Grid = Record<ParamKey, number>;

export const box: Record<Exclude<ParamKey, 'targetPercentChange'>, [number, number]> = {
  trailingBuyPercentage: matrix.parameterBox.trailingBuyPercentage as [number, number],
  trailingStopPercentage: matrix.parameterBox.trailingStopPercentage as [number, number],
  maximumHoldDays: matrix.parameterBox.maximumHoldDays as [number, number],
  tickWindowSize: matrix.parameterBox.tickWindowSize as [number, number],
  intradayLossBuffer: matrix.parameterBox.intradayLossBuffer as [number, number],
  pullback: matrix.parameterBox.pullback as [number, number],
  continuationWindow: matrix.parameterBox.continuationWindow as [number, number]
};

// Step units of the selection neighbourhoods and local refinement (PROTOCOL.md §8).
export const stepUnits: Grid = {
  targetPercentChange: 5,
  trailingBuyPercentage: 1,
  trailingStopPercentage: 5,
  maximumHoldDays: 1,
  tickWindowSize: 5,
  intradayLossBuffer: 5,
  pullback: 5,
  continuationWindow: 10
};

export const xGridMin = 30; // the engine grid's smallest dip (3.0%)
export const xGridMax = 300; // 30.0%

export const dataRoot = process.env.STUDY4_DATA_ROOT ?? 'data';
