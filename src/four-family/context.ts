// The study's fixed settings (PROTOCOL.md) and the research-view loader shared by every command.
import fs from 'fs-extra';
import type { MarketSession } from '#types';
import type { Segment } from './accounting.ts';
import {
  type Dataset,
  defaultDataFile,
  expectedDataHash,
  firstIndexOnOrAfter,
  lastIndexOnOrBefore,
  loadSessions,
  researchDataset,
  sha256File
} from './data.ts';
import type { StopFill } from './engine.ts';
import type { EvalSpec } from './evaluate.ts';

export const resultsRoot = 'research/trailing-buy-four-family-optimization/results';

export const protocol = {
  version: 'four-family-protocol-v1',
  dataFile: defaultDataFile,
  dataHash: expectedDataHash,
  researchEnd: '2023-12-29', // the last development session; nothing later is read before the freeze
  eligibilityIndex: 180, // 2016-09-20: every candidate (L <= 180) has a full lookback; no arming before it
  stopFill: 'stop' as StopFill,
  marginInterestRate: 0.11,
  sensitivityRates: [0.08, 0.14],
  investment: 100000,
  fits: [
    { key: 'fold1', trainEnd: '2019-12-31', validation: { start: '2020-01-01', end: '2021-12-31' } },
    { key: 'fold2', trainEnd: '2021-12-31', validation: { start: '2022-01-01', end: '2022-12-31' } },
    { key: 'fold3', trainEnd: '2022-12-31', validation: { start: '2023-01-01', end: '2023-12-31' } },
    { key: 'final', trainEnd: '2023-12-31', validation: undefined }
  ],
  holdout: { start: '2024-01-01', end: '2025-12-31' },
  minEntriesPerYear: 1
} as const;

export type FitKey = (typeof protocol.fits)[number]['key'];

export interface Research {
  sessions: MarketSession[];
  ds: Dataset;
  dataHash: string;
}

export const loadResearch = async (): Promise<Research> => {
  const dataHash = await sha256File(protocol.dataFile);

  if (dataHash !== protocol.dataHash) {
    throw new Error(`Data hash ${dataHash} differs from the protocol's ${protocol.dataHash}`);
  }

  const sessions = (await loadSessions(protocol.dataFile)).filter((session) => session.date <= protocol.researchEnd);
  const ds = researchDataset(sessions, dataHash, protocol.researchEnd);

  if (ds.dates[protocol.eligibilityIndex] !== '2016-09-20') {
    throw new Error(`Session ${protocol.eligibilityIndex} is ${ds.dates[protocol.eligibilityIndex]}, not 2016-09-20`);
  }

  return { sessions, ds, dataHash };
};

export const fitOf = (key: FitKey) => protocol.fits.find((fit) => fit.key === key)!;

// Training: from the eligibility session to the fit's last session.
export const trainingSpec = (
  ds: Dataset,
  key: FitKey,
  stopFill = protocol.stopFill,
  rate = protocol.marginInterestRate
): EvalSpec => {
  const endIndex = lastIndexOnOrBefore(ds, fitOf(key).trainEnd);

  return {
    label: `${key}-training`,
    stopFill,
    marginInterestRate: rate,
    armStart: protocol.eligibilityIndex,
    endIndex,
    segments: [{ label: 'training', start: protocol.eligibilityIndex, end: endIndex }]
  };
};

// The minimum number of entries: one per calendar year of training, rounded up.
export const minEntries = (ds: Dataset, key: FitKey) => {
  const start = Date.parse(ds.dates[protocol.eligibilityIndex]!);
  const end = Date.parse(ds.dates[lastIndexOnOrBefore(ds, fitOf(key).trainEnd)]!);
  const years = ((end - start) / 86400000 + 1) / 365.25;

  return Math.ceil(years * protocol.minEntriesPerYear);
};

// Validation: the continuous run from the eligibility session, attributed to the validation window, or a
// flat start on the window's first session (arming only from then, nothing carried in).
export const validationSpec = (
  ds: Dataset,
  key: FitKey,
  mode: 'continuous' | 'flat',
  stopFill = protocol.stopFill,
  rate = protocol.marginInterestRate
): EvalSpec => {
  const validation = fitOf(key).validation;

  if (!validation) {
    throw new Error(`${key} has no validation window`);
  }

  const start = firstIndexOnOrAfter(ds, validation.start);
  const endIndex = lastIndexOnOrBefore(ds, validation.end);

  return {
    label: `${key}-validation-${mode}`,
    stopFill,
    marginInterestRate: rate,
    armStart: mode === 'continuous' ? protocol.eligibilityIndex : start,
    endIndex,
    segments: [{ label: 'validation', start, end: endIndex }]
  };
};

// Calendar-year segments within [start, end], plus named months.
export const yearSegments = (ds: Dataset, start: number, end: number): Segment[] => {
  const segments: Segment[] = [];

  for (let s = start; s <= end; s++) {
    const year = ds.dates[s]!.slice(0, 4);
    const last = segments.at(-1);

    if (last?.label === year) {
      last.end = s;
    } else {
      segments.push({ label: year, start: s, end: s });
    }
  }

  return segments;
};

export const monthSegment = (ds: Dataset, month: string): Segment | undefined => {
  const start = firstIndexOnOrAfter(ds, `${month}-01`);
  const end = lastIndexOnOrBefore(ds, `${month}-31`);

  return start <= end && ds.dates[start]!.startsWith(month) ? { label: month, start, end } : undefined;
};

export const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T;

export const writeJson = async (file: string, value: unknown) =>
  fs.outputFile(file, `${JSON.stringify(value, null, 1)}\n`);
