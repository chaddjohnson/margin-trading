// The program's fixed settings (research/vgt-recovery-eligibility/PROTOCOL.md) and the data loader shared by
// every command. Unlike the previous programs there is no physically truncated research view: 2023 is the
// inspected problem and 2024–2025 was examined before, so no part of the file is untouched; the walk-forward
// folds and the window attribution are the discipline that remains, and the reports say so.
import path from 'node:path';
import fs from 'fs-extra';
import type { MarketSession } from '#types';
import type { Segment } from '../trailing-buy-variants/accounting.ts';
import {
  type Dataset,
  defaultDataFile,
  expectedDataHash,
  firstIndexOnOrAfter,
  fixtureDataset,
  lastIndexOnOrBefore,
  loadSessions,
  sha256File
} from '../four-family/data.ts';
import type { StopFill } from './engine.ts';
import type { EvalSpec } from './evaluate.ts';

export const resultsRoot = 'research/vgt-recovery-eligibility/results';
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);

export const protocol = {
  version: 'recovery-eligibility-protocol-v1',
  dataFile: defaultDataFile,
  dataHash: expectedDataHash,
  // Every candidate (L <= 365) has a full lookback from this session; no arming before it. Session 365 is
  // 2017-06-15 (checked by loadData).
  eligibilityIndex: 365,
  eligibilityDate: '2017-06-15',
  stopFill: 'stop' as StopFill,
  marginInterestRate: 0.11,
  investment: 100000,
  drawdownCeiling: 35000,
  fits: [
    { key: 'fold1', trainEnd: '2019-12-31', validation: { start: '2020-01-01', end: '2021-12-31' } },
    { key: 'fold2', trainEnd: '2021-12-31', validation: { start: '2022-01-01', end: '2022-12-31' } },
    { key: 'fold3', trainEnd: '2022-12-31', validation: { start: '2023-01-01', end: '2023-12-31' } },
    { key: 'final', trainEnd: '2023-12-29', validation: undefined }
  ],
  developmentEnd: '2023-12-29',
  // Previously inspected by the two earlier programs; not an independent holdout.
  reusedWindow: { start: '2024-01-01', end: '2025-12-31', label: 'previously inspected / reused' },
  minEntriesPerYear: 1
} as const;

export type FitKey = (typeof protocol.fits)[number]['key'];

export interface Data {
  sessions: MarketSession[];
  ds: Dataset;
  dataHash: string;
}

export const loadData = async (): Promise<Data> => {
  const dataHash = await sha256File(protocol.dataFile);

  if (dataHash !== protocol.dataHash) {
    throw new Error(`Data hash ${dataHash} differs from the protocol's ${protocol.dataHash}`);
  }

  const sessions = await loadSessions(protocol.dataFile);
  const ds = fixtureDataset(sessions);

  // The whole file, identified by its hash and last session.
  ds.id = `${dataHash.slice(0, 16)}:${ds.lastDate}`;
  ds.dataHash = dataHash;

  if (ds.dates[protocol.eligibilityIndex] !== protocol.eligibilityDate) {
    throw new Error(
      `Session ${protocol.eligibilityIndex} is ${ds.dates[protocol.eligibilityIndex]}, not ${protocol.eligibilityDate}`
    );
  }

  return { sessions, ds, dataHash };
};

export const fitOf = (key: FitKey) => protocol.fits.find((fit) => fit.key === key)!;

// Calendar-year segments within [start, end].
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

// The common full-history run: from the eligibility session to the end of the file, with yearly segments.
export const fullSpec = (
  ds: Dataset,
  stopFill: StopFill = protocol.stopFill,
  rate: number = protocol.marginInterestRate,
  armStart: number = protocol.eligibilityIndex
): EvalSpec => {
  const endIndex = ds.sessionCount - 1;

  return {
    label: `full-${stopFill}-${rate}-arm${armStart}`,
    stopFill,
    marginInterestRate: rate,
    armStart,
    endIndex,
    segments: [
      { label: 'full', start: armStart, end: endIndex },
      {
        label: 'development',
        start: armStart,
        end: lastIndexOnOrBefore(ds, protocol.developmentEnd)
      },
      {
        label: 'reused',
        start: firstIndexOnOrAfter(ds, protocol.reusedWindow.start),
        end: endIndex
      },
      ...yearSegments(ds, armStart, endIndex)
    ]
  };
};

// Training: from the eligibility session to the fit's last session.
export const trainingSpec = (ds: Dataset, key: FitKey): EvalSpec => {
  const endIndex = lastIndexOnOrBefore(ds, fitOf(key).trainEnd);

  return {
    label: `${key}-training`,
    stopFill: protocol.stopFill,
    marginInterestRate: protocol.marginInterestRate,
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

// Validation: the continuous run from the eligibility session, attributed to the validation window.
export const validationSpec = (ds: Dataset, key: FitKey): EvalSpec => {
  const validation = fitOf(key).validation;

  if (!validation) {
    throw new Error(`${key} has no validation window`);
  }

  const start = firstIndexOnOrAfter(ds, validation.start);
  const endIndex = lastIndexOnOrBefore(ds, validation.end);

  return {
    label: `${key}-validation`,
    stopFill: protocol.stopFill,
    marginInterestRate: protocol.marginInterestRate,
    armStart: protocol.eligibilityIndex,
    endIndex,
    segments: [{ label: 'validation', start, end: endIndex }]
  };
};

export const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

export const hasFlag = (args: string[], name: string) => args.includes(`--${name}`);

export const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, 'utf8')) as T;

export const writeJson = async (file: string, value: unknown) =>
  fs.outputFile(file, `${JSON.stringify(value, null, 1)}\n`);

export const exists = (file: string) => fs.pathExists(file);

export const formatDollars = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;

export const formatSignedDollars = (value: number) =>
  `${value < 0 ? '−' : '+'}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
