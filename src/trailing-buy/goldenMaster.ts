// Baseline parity (Phase 0 gate). The untouched original, src/app/allin-original.ts, is run through its own
// default export, and this study's engine in legacy mode over the same bars; all five output files must be
// byte-identical (SHA-256), with no tolerance. The brief's baseline uses 1.0% / 2.0% where the checked-in
// file has 0.5% / 3.0%, so a literal copy of the original with exactly those two constants changed is
// generated (git-ignored) and checked the same way. Nothing in the original is edited.
import fs from 'fs-extra';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { derivedDir, originalFile, originalSha256 } from './constants.ts';
import { type DailyBars, loadDaily, sha256Of, sliceBars } from './data.ts';
import { type StrategyParams, baselineParams, checkedInParams, simulate } from './engine.ts';
import { originalFormatFiles } from './export.ts';
import { IndicatorCache } from './indicators.ts';

export const fileNames = ['trades.csv', 'daily.csv', 'states.csv', 'episodes.csv', 'summary.json'];

export const variantFile = `${derivedDir}/reference/allin-original-1pct-2pct.ts`;

// The only edits: the two constant lines. Each must occur exactly once in the original.
export const variantEdits: [string, string][] = [
  ['const materialLossThreshold = 0.005;', 'const materialLossThreshold = 0.01;'],
  ['const lowerPriceReentry = 0.03;', 'const lowerPriceReentry = 0.02;']
];

export const checkOriginalUntouched = async () => {
  const text = await fs.readFile(originalFile, 'utf8');
  const hash = sha256Of(text);

  if (hash !== originalSha256) {
    throw new Error(`${originalFile} changed: sha256 ${hash}, expected ${originalSha256}`);
  }

  return text;
};

export const writeVariant = async () => {
  let text = await checkOriginalUntouched();

  for (const [from, to] of variantEdits) {
    if (text.split(from).length !== 2) {
      throw new Error(`Expected exactly one "${from}" in ${originalFile}`);
    }

    text = text.replace(from, to);
  }

  await fs.ensureDir(path.dirname(variantFile));
  await fs.writeFile(variantFile, text);

  return { file: variantFile, sha256: sha256Of(text) };
};

// Runs an original-style module quietly (it logs every trade) and returns its five files.
export const runOriginalModule = async (
  modulePath: string,
  symbol: string,
  dataFile: string,
  outDir: string,
  startDate = '-',
  endDate = '-'
) => {
  const info = console.info;
  const module = await import(pathToFileURL(path.resolve(modulePath)).href);

  await fs.remove(outDir);
  console.info = () => {};

  try {
    await module.default(symbol, startDate, endDate, dataFile, outDir);
  } finally {
    console.info = info;
  }

  const files: Record<string, string> = {};

  for (const name of fileNames) {
    files[name] = await fs.readFile(`${outDir}/${name}`, 'utf8');
  }

  return files;
};

// The engine's legacy run over exactly the bars the original sees: the file filtered to the inclusive
// dates (a cold start, index 0 = the first filtered bar).
export const runEngineLikeOriginal = (
  bars: DailyBars,
  params: StrategyParams,
  symbol: string,
  dataFile: string,
  startDate?: string,
  endDate?: string
) => {
  const from = startDate ? bars.date.findIndex((date) => date >= startDate) : 0;
  let to = bars.date.length - 1;

  if (endDate) {
    while (to >= 0 && bars.date[to]! > endDate) {
      to--;
    }
  }

  const slice = sliceBars(bars, from, to);
  const result = simulate(slice, new IndicatorCache(slice), params, 0, slice.date.length - 1);

  return { slice, result, files: originalFormatFiles(slice, result, { symbol, dataFile }) };
};

export interface GoldenCase {
  id: string;
  reference: 'checked-in' | '1pct-2pct';
  symbol: string;
  dataFile: string;
  startDate?: string;
  endDate?: string;
}

export interface GoldenOutcome extends GoldenCase {
  identical: boolean;
  files: { name: string; original: string; engine: string; identical: boolean }[];
  closedTrades: number;
  openAtEnd: boolean;
  netProfit: number;
  maximumDrawdown: number;
  marginInterest: number;
}

export const runGoldenCase = async (testCase: GoldenCase, workDir: string): Promise<GoldenOutcome> => {
  const modulePath = testCase.reference === 'checked-in' ? originalFile : (await writeVariant()).file;
  const params = testCase.reference === 'checked-in' ? checkedInParams : baselineParams;
  const originalDir = `${workDir}/${testCase.id}/original`;
  const original = await runOriginalModule(
    modulePath,
    testCase.symbol,
    testCase.dataFile,
    originalDir,
    testCase.startDate ?? '-',
    testCase.endDate ?? '-'
  );
  const bars = await loadDaily(testCase.symbol, testCase.dataFile);
  const engine = runEngineLikeOriginal(
    bars,
    params,
    testCase.symbol,
    testCase.dataFile,
    testCase.startDate,
    testCase.endDate
  );
  const files = fileNames.map((name) => {
    const a = sha256Of(original[name]!);
    const b = sha256Of(engine.files[name]!);

    return { name, original: a, engine: b, identical: a === b };
  });
  const summary = JSON.parse(original['summary.json']!);

  return {
    ...testCase,
    identical: files.every((file) => file.identical),
    files,
    closedTrades: summary.closedTrades,
    openAtEnd: summary.openAtEnd,
    netProfit: summary.netProfit,
    maximumDrawdown: summary.maximumDrawdown,
    marginInterest: summary.marginInterest
  };
};
