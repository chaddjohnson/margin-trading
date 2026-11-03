// The program's fixed settings (PROTOCOL.md) on top of the four-family protocol: the same data, research view,
// eligibility session, fits and windows. Everything that reads prices goes through the four-family data
// module, so the research view is still physically truncated at 2023-12-29 until the holdout unlocks the file.
import path from 'node:path';
import fs from 'fs-extra';
import type { Segment } from './accounting.ts';
import type { EvalSpec } from './evaluate.ts';
import type { Dataset } from '../four-family/data.ts';
import { lastIndexOnOrBefore } from '../four-family/data.ts';
import { protocol as fourFamilyProtocol, yearSegments } from '../four-family/context.ts';

export {
  type FitKey,
  type Research,
  fitOf,
  loadResearch,
  minEntries,
  monthSegment,
  trainingSpec,
  validationSpec,
  yearSegments,
  readJson,
  writeJson
} from '../four-family/context.ts';

export const resultsRoot = 'research/trailing-buy-variants/results';
export const fitsRoot = path.join(resultsRoot, 'fits');
export const stageDir = (fit: string, familyKey: string) => path.join(fitsRoot, fit, familyKey);
export const freezeFile = path.join(fitsRoot, 'final', 'freeze.json');

export const protocol = {
  version: 'trailing-buy-variants-protocol-v1',
  dataFile: fourFamilyProtocol.dataFile,
  dataHash: fourFamilyProtocol.dataHash,
  researchEnd: fourFamilyProtocol.researchEnd,
  eligibilityIndex: fourFamilyProtocol.eligibilityIndex,
  stopFill: fourFamilyProtocol.stopFill,
  marginInterestRate: fourFamilyProtocol.marginInterestRate,
  sensitivityRates: fourFamilyProtocol.sensitivityRates,
  investment: fourFamilyProtocol.investment,
  fits: fourFamilyProtocol.fits,
  // Reused from the previous program: previously inspected, not independent.
  reusedWindow: { start: '2024-01-01', end: '2025-12-31', label: 'previously inspected / reused' },
  drawdownCeiling: 35000,
  minEntriesPerYear: fourFamilyProtocol.minEntriesPerYear
} as const;

export const developmentSpec = (ds: Dataset, fill: EvalSpec['stopFill'], rate: number): EvalSpec => {
  const endIndex = lastIndexOnOrBefore(ds, protocol.researchEnd);

  return {
    label: `development-${fill}-${rate}`,
    stopFill: fill,
    marginInterestRate: rate,
    armStart: protocol.eligibilityIndex,
    endIndex,
    segments: [
      { label: 'development', start: protocol.eligibilityIndex, end: endIndex },
      ...(yearSegments(ds, protocol.eligibilityIndex, endIndex) as Segment[])
    ]
  };
};

export const option = (args: string[], name: string) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 ? args[index + 1] : undefined;
};

export const parseList = (value: string | undefined, all: readonly string[]) =>
  value ? value.split(',').filter((item) => all.includes(item)) : [...all];

export const exists = (file: string) => fs.pathExists(file);
