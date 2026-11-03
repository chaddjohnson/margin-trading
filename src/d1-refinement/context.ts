// The program's fixed settings (research/vgt-d1-refinement/PROTOCOL.md) and the data loader shared by every
// command. There is no untouched holdout: 2023 was the inspected problem of the previous program and 2024–2025 was
// examined by the programs before it. The chronological folds are development/validation-style diagnostics.
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

export const resultsRoot = 'research/vgt-d1-refinement/results';
export const stageDir = (...parts: string[]) => path.join(resultsRoot, ...parts);

export const protocol = {
  version: 'd1-refinement-protocol-v1',
  dataFile: defaultDataFile,
  dataHash: expectedDataHash,
  // Every engine run arms from this session (2017-06-15), as the previous program, so that lookbacks up to 365
  // are comparable and the always/swing paths start on the same session as the deep path. D1's first trade
  // (2018-12-21) is unaffected (asserted by `baseline`).
  eligibilityIndex: 365,
  eligibilityDate: '2017-06-15',
  stopFill: 'stop' as StopFill,
  marginInterestRate: 0.11,
  sensitivityRates: [0.08, 0.14],
  investment: 100000,
  drawdownCeiling: 35000,
  fits: [
    { key: 'fold1', trainEnd: '2019-12-31', validation: { start: '2020-01-01', end: '2021-12-31' } },
    { key: 'fold2', trainEnd: '2021-12-31', validation: { start: '2022-01-01', end: '2022-12-31' } },
    { key: 'fold3', trainEnd: '2022-12-31', validation: { start: '2023-01-01', end: '2023-12-31' } },
    { key: 'fold4', trainEnd: '2023-12-29', validation: { start: '2024-01-01', end: '2025-10-13' } },
    { key: 'final', trainEnd: '2025-10-13', validation: undefined }
  ],
  developmentEnd: '2023-12-29',
  reusedWindow: { start: '2024-01-01', end: '2025-12-31', label: 'previously inspected / reused' },
  // Market regimes for the per-regime tables.
  regimes: [
    { key: 'r2017_18', label: '2017-06 → 2018-09 (advance)', start: '2017-06-15', end: '2018-09-30' },
    { key: 'r2018_19', label: '2018 Q4 correction → 2019', start: '2018-10-01', end: '2019-12-31' },
    { key: 'r2020', label: '2020 selloff / recovery', start: '2020-01-01', end: '2020-12-31' },
    { key: 'r2021', label: '2021 advance', start: '2021-01-01', end: '2021-12-31' },
    { key: 'r2022', label: '2022 bear market', start: '2022-01-01', end: '2022-12-31' },
    { key: 'r2023', label: '2023 recovery', start: '2023-01-01', end: '2023-12-31' },
    { key: 'r2024_25', label: '2024–2025 (reused window)', start: '2024-01-01', end: '2025-10-13' }
  ]
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

export const regimeSegments = (ds: Dataset, armStart: number, endIndex: number): Segment[] =>
  protocol.regimes
    .map((regime) => ({
      label: regime.key,
      start: Math.max(armStart + 1, firstIndexOnOrAfter(ds, regime.start)),
      end: Math.min(endIndex, lastIndexOnOrBefore(ds, regime.end))
    }))
    .filter((segment) => segment.end >= segment.start);

// The common full-history run: from the eligibility session to the end of the file, with the development /
// reused split, yearly and regime segments.
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
      { label: 'development', start: armStart, end: lastIndexOnOrBefore(ds, protocol.developmentEnd) },
      { label: 'reused', start: firstIndexOnOrAfter(ds, protocol.reusedWindow.start), end: endIndex },
      ...yearSegments(ds, armStart, endIndex),
      ...regimeSegments(ds, armStart, endIndex)
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

export const writeText = async (file: string, text: string) =>
  fs.outputFile(file, text.endsWith('\n') ? text : `${text}\n`);

export const exists = (file: string) => fs.pathExists(file);

export const formatDollars = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';

export const formatSignedDollars = (value: number) =>
  Number.isFinite(value) ? `${value < 0 ? '−' : '+'}$${Math.round(Math.abs(value)).toLocaleString('en-US')}` : 'n/a';
