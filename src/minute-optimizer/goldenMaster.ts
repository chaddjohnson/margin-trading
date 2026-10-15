// Golden-master equivalence for the VGT minute optimizer, in three layers:
//
// 1. Original vs working copy, at the original's parameters: src/app/allIn.ts and
//    src/app/allIn-minute-optimizable.ts run on the same CSV, dates and stop fill, and every output file
//    (trades.csv, daily.csv, states.csv, episodes.csv, summary.json) and every console line must be
//    byte-identical.
// 2. Original variants vs working copy, away from the defaults: a scratch copy of allIn.ts with only its
//    seven constant declarations replaced is run against the working copy with the same parameters, with
//    the same byte-identical requirement. The original file itself is only ever read.
// 3. Working copy vs fast engine (engine.ts), for many parameter vectors, windows (with and without
//    warmup), both stop fills and the extra-cost levels: every trade field and every total must be
//    identical, except minute-sampled drawdowns, which may differ by 1e-6 dollars (closed form).
//
// Layers 1-3 also run on seeded synthetic minute files (fixtures.ts) built to exercise rare paths.
// Parameter vectors away from the defaults are only run on sessions up to 2023-12-31, so no candidate-like
// vector's 2024-2025 results are seen before the freeze. The incumbent's full-range run is the brief's
// own reference and was known beforehand.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { MarketSession } from '#types';
import { type MinuteParams, incumbentParams, tenthsToFraction } from '../app/allIn-minute-optimizable.ts';
import { genomeToParams, gridSize } from '../optimizer/params.ts';
import { Rng } from '../optimizer/rng.ts';
import {
  type MinuteDataset,
  buildDataset,
  defaultDataFile,
  firstIndexOnOrAfter,
  lastIndexOnOrBefore,
  loadSessions,
  sha256File
} from './data.ts';
import { type StopFill, computeReferenceHighs, simulate } from './engine.ts';
import { writeMinuteFixture } from './fixtures.ts';
import { minuteParameterSpace } from './params.ts';
import { comparableFromEngine, comparableFromReference, compareComparables, runReference } from './reference.ts';

export const protectedFiles = [
  { file: 'src/app/allIn.ts', sha256: '71c5c327e8ef018066ad598ccc8532f68d28fa387b16577815f6782cf9ba70de' },
  // The study ran while this file held an uncommitted edit (sha256 e8473085…, unchanged throughout the
  // study). That edit was later reverted to the committed version, which is what's protected now.
  { file: 'src/app/allin-original.ts', sha256: '42f2b7e7be4ef99e1af6c4fe113dd8da9ed4d329d2fe0564463db80b87f449e2' }
];

export const originalFile = 'src/app/allIn.ts';
export const outputFiles = ['trades.csv', 'daily.csv', 'states.csv', 'episodes.csv', 'summary.json'];
export const goldenResearchEnd = '2023-12-31';
export const costLevels = [5, 10, 20];

export const verifyProtectedFiles = async () => {
  const results = [];

  for (const { file, sha256 } of protectedFiles) {
    const actual = await sha256File(file);

    results.push({ file, expected: sha256, actual, unchanged: actual === sha256 });
  }

  const changed = results.filter((result) => !result.unchanged);

  if (changed.length) {
    throw new Error(
      `Protected files changed: ${changed.map((result) => `${result.file} (${result.actual})`).join(', ')}`
    );
  }

  return results;
};

const captureConsole = async (run: (log: (line: string) => void) => Promise<unknown>) => {
  const lines: string[] = [];
  const info = console.info;

  console.info = (...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  };

  try {
    await run((line) => lines.push(line));
  } finally {
    console.info = info;
  }

  return lines;
};

// A scratch copy of the original with different constants. Only the seven constant declarations change.
export const writeOriginalVariant = async (params: MinuteParams, dir: string) => {
  let source = await fs.readFile(originalFile, 'utf8');
  const replace = (pattern: RegExp, replacement: string) => {
    if (!pattern.test(source)) {
      throw new Error(`Variant pattern not found: ${pattern}`);
    }

    source = source.replace(pattern, replacement);
  };

  replace(/const tickWindowSize = 78;/, `const tickWindowSize = ${params.lookbackSessions};`);
  replace(/const targetPercentChange = 0\.025;/, `const targetPercentChange = ${tenthsToFraction(params.dipTenths)};`);
  replace(
    /const trailingStopPercentage = 0\.021;/,
    `const trailingStopPercentage = ${tenthsToFraction(params.trailingStopTenths)};`
  );
  replace(/const maximumHoldDays = 8;/, `const maximumHoldDays = ${params.maximumHoldDays};`);
  replace(
    /const materialLossThreshold = 0\.022;/,
    `const materialLossThreshold = ${tenthsToFraction(params.materialLossTenths)};`
  );
  replace(
    /const lowerPriceReentry = 0\.04;/,
    `const lowerPriceReentry = ${tenthsToFraction(params.lowerReentryTenths)};`
  );
  replace(/const retraceFraction = 0\.367;/, `const retraceFraction = ${tenthsToFraction(params.retraceTenths)};`);

  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16);
  const file = path.resolve(dir, `allIn-variant-${hash}.ts`);

  await fs.ensureDir(dir);
  await fs.writeFile(file, source);

  return file;
};

export interface GoldenCase {
  name: string;
  dataFile: string;
  startDate?: string;
  endDate?: string;
  stopFill: StopFill;
  params?: MinuteParams; // omitted: the original file itself at its own constants
}

export interface FileCaseResult {
  name: string;
  params: MinuteParams;
  usedVariant: boolean;
  identical: boolean;
  differences: string[];
  consoleLines: number;
  fileBytes: Record<string, number>;
  trades: number;
  netProfit: number;
}

const firstDifference = (label: string, a: string, b: string) => {
  const linesA = a.split('\n');
  const linesB = b.split('\n');

  for (let index = 0; index < Math.max(linesA.length, linesB.length); index++) {
    if (linesA[index] !== linesB[index]) {
      return `${label}: line ${index + 1}: original ${JSON.stringify(linesA[index])} vs copy ${JSON.stringify(linesB[index])}`;
    }
  }

  return `${label}: differs`;
};

type OriginalRunner = (options: {
  symbol?: string;
  startDate?: string;
  endDate?: string;
  dataFile?: string;
  outDir?: string;
  stopFill?: string;
}) => Promise<unknown>;

// Layer 1 or 2: the original (or a variant of it) against the working copy, through their own entry points.
export const runFileCase = async (
  testCase: GoldenCase,
  scratchDir: string,
  sessionsFor: (file: string) => Promise<MarketSession[]>
): Promise<FileCaseResult> => {
  const params = testCase.params ?? incumbentParams;
  const usedVariant = testCase.params !== undefined;
  const moduleFile = usedVariant
    ? await writeOriginalVariant(params, path.join(scratchDir, 'variants'))
    : path.resolve(originalFile);
  const original = (await import(pathToFileURL(moduleFile).href)) as { runAllIn: OriginalRunner };
  const caseDir = path.join(scratchDir, testCase.name.replace(/[^a-z0-9-]+/gi, '_'));
  const originalDir = path.join(caseDir, 'original');
  const copyDir = path.join(caseDir, 'copy');

  await fs.remove(caseDir);

  const originalLines = await captureConsole(async () => {
    await original.runAllIn({
      symbol: 'VGT',
      startDate: testCase.startDate,
      endDate: testCase.endDate,
      dataFile: testCase.dataFile,
      outDir: originalDir,
      stopFill: testCase.stopFill
    });
  });
  const allSessions = await sessionsFor(testCase.dataFile);
  let copySummary: Record<string, unknown> = {};
  const copyLines = await captureConsole(async (log) => {
    const result = await runReference(allSessions, {
      params,
      startDate: testCase.startDate,
      endDate: testCase.endDate,
      stopFill: testCase.stopFill,
      outDir: copyDir,
      dataFile: testCase.dataFile,
      log
    });

    copySummary = result.summary;
  });
  const differences: string[] = [];
  const normalize = (lines: string[], dir: string) => lines.map((line) => line.replaceAll(dir, '<outDir>'));
  const normalizedOriginal = normalize(originalLines, originalDir);
  const normalizedCopy = normalize(copyLines, copyDir);

  if (normalizedOriginal.join('\n') !== normalizedCopy.join('\n')) {
    differences.push(firstDifference('console', normalizedOriginal.join('\n'), normalizedCopy.join('\n')));
  }

  const fileBytes: Record<string, number> = {};

  for (const name of outputFiles) {
    const a = await fs.readFile(path.join(originalDir, name), 'utf8').catch(() => '<missing>');
    const b = await fs.readFile(path.join(copyDir, name), 'utf8').catch(() => '<missing>');

    fileBytes[name] = a.length;

    if (a !== b) {
      differences.push(firstDifference(name, a, b));
    }
  }

  await fs.remove(caseDir);

  return {
    name: testCase.name,
    params,
    usedVariant,
    identical: differences.length === 0,
    differences,
    consoleLines: originalLines.length,
    fileBytes,
    trades: Number(copySummary.closedTrades ?? 0) + (copySummary.openAtEnd ? 1 : 0),
    netProfit: Number(copySummary.netProfit ?? NaN)
  };
};

export interface EngineCase {
  name: string;
  params: MinuteParams;
  startDate: string;
  endDate: string;
  warmup: boolean;
  stopFill: StopFill;
}

export interface EngineCaseResult {
  name: string;
  params: MinuteParams;
  startDate: string;
  endDate: string;
  warmup: boolean;
  stopFill: StopFill;
  identical: boolean;
  differences: string[];
  trades: number;
  netProfit: number;
  minuteDrawdownGap: number;
  executions: string[];
  reasons: string[];
  restrictions: number;
  lowerPriceReentries: number;
  recoveryResets: number;
  entriesWithoutTrade: number;
}

// Layer 3: the working copy against the fast engine on one window.
export const runEngineCase = async (
  allSessions: MarketSession[],
  dataset: MinuteDataset,
  testCase: EngineCase
): Promise<EngineCaseResult> => {
  const reference = await runReference(allSessions, {
    params: testCase.params,
    startDate: testCase.startDate,
    endDate: testCase.endDate,
    warmup: testCase.warmup,
    stopFill: testCase.stopFill,
    costBps: costLevels
  });
  const startIndex = firstIndexOnOrAfter(dataset, testCase.startDate);
  const endIndex = lastIndexOnOrBefore(dataset, testCase.endDate);
  const historyStart = testCase.warmup ? 0 : startIndex;
  const highs = computeReferenceHighs(dataset.sHigh, testCase.params.lookbackSessions, historyStart);
  const result = simulate(
    dataset,
    highs,
    testCase.params,
    { historyStart, startIndex, endIndex },
    { stopFill: testCase.stopFill, costBps: costLevels }
  );
  const expected = comparableFromReference(reference, costLevels);
  const actual = comparableFromEngine(result, dataset.dates, startIndex);
  const differences = compareComparables(expected, actual);
  const gap = Math.max(
    ...expected.levels.map((level, index) =>
      Math.abs(level.minuteMaximumDrawdown - (actual.levels[index]?.minuteMaximumDrawdown ?? NaN))
    )
  );

  return {
    name: testCase.name,
    params: testCase.params,
    startDate: testCase.startDate,
    endDate: testCase.endDate,
    warmup: testCase.warmup,
    stopFill: testCase.stopFill,
    identical: differences.length === 0,
    differences: differences.slice(0, 20),
    trades: expected.trades.length,
    netProfit: expected.netProfit,
    minuteDrawdownGap: gap,
    executions: [...new Set(expected.trades.flatMap((trade) => [trade.entryExecution, trade.exitExecution]))].filter(
      Boolean
    ),
    reasons: [...new Set(expected.trades.map((trade) => trade.reason))],
    restrictions: expected.restrictions,
    lowerPriceReentries: expected.lowerPriceReentries,
    recoveryResets: expected.recoveryResets,
    entriesWithoutTrade: expected.entriesWithoutTrade
  };
};

// Random grid vectors from the minute search space, plus its corners and the 10%/8% diagnostic family.
export const goldenVectors = (seed: number, count: number): MinuteParams[] => {
  const rng = Rng.from('minute-golden-master', seed);
  const space = minuteParameterSpace;
  const vectors: MinuteParams[] = [];

  for (let index = 0; index < count; index++) {
    vectors.push(
      genomeToParams(
        space,
        space.specs.map((spec) => rng.int(gridSize(spec)))
      )
    );
  }

  return vectors;
};

export const cornerVectors = (): MinuteParams[] => {
  const space = minuteParameterSpace;
  const low = genomeToParams(
    space,
    space.specs.map(() => 0)
  );
  const high = genomeToParams(
    space,
    space.specs.map((spec) => gridSize(spec) - 1)
  );

  return [
    low,
    high,
    { ...incumbentParams, retraceTenths: 0 },
    { ...incumbentParams, materialLossTenths: 0, lowerReentryTenths: 0 },
    { ...incumbentParams, retraceTenths: 1000, lowerReentryTenths: 150 },
    { ...incumbentParams, maximumHoldDays: 1, trailingStopTenths: 5 },
    { ...incumbentParams, dipTenths: 5, lookbackSessions: 10 },
    {
      dipTenths: 100,
      trailingStopTenths: 80,
      maximumHoldDays: 15,
      lookbackSessions: 90,
      materialLossTenths: 10,
      lowerReentryTenths: 20,
      retraceTenths: 380
    }
  ];
};

// Windows for the engine checks, all ending by the research end.
export const engineWindows = [
  { startDate: '2016-10-07', endDate: '2019-12-31' },
  { startDate: '2016-10-07', endDate: '2023-12-31' },
  { startDate: '2020-01-01', endDate: '2020-12-31' },
  { startDate: '2021-01-01', endDate: '2021-12-31' },
  { startDate: '2022-01-01', endDate: '2022-12-31' },
  { startDate: '2023-01-01', endDate: '2023-12-31' },
  { startDate: '2016-11-01', endDate: '2017-03-31' },
  { startDate: '2018-10-01', endDate: '2019-01-31' },
  { startDate: '2019-08-01', endDate: '2019-09-30' },
  { startDate: '2020-02-01', endDate: '2020-06-30' }
];

export interface GoldenMasterOptions {
  scratchDir: string;
  variants: number;
  engineVectors: number;
  fixtures: number;
  seed: number;
  log?: (line: string) => void;
}

export const runGoldenMaster = async (options: GoldenMasterOptions) => {
  const log = options.log ?? console.log;
  const started = Date.now();
  const protectedBefore = await verifyProtectedFiles();
  const dataHash = await sha256File(defaultDataFile);
  const allSessions = await loadSessions(defaultDataFile);
  const researchSessions = allSessions.filter((session) => session.date <= goldenResearchEnd);
  const researchData = buildDataset(researchSessions, 'VGT', dataHash);
  const sessionsCache = new Map<string, MarketSession[]>([[defaultDataFile, allSessions]]);
  const sessionsFor = async (file: string) => {
    let sessions = sessionsCache.get(file);

    if (!sessions) {
      sessions = await loadSessions(file);
      sessionsCache.set(file, sessions);
    }

    return sessions;
  };
  const fileCases: GoldenCase[] = [
    {
      name: 'default-full-range-stop',
      dataFile: defaultDataFile,
      startDate: '2016-10-07',
      endDate: '2025-10-13',
      stopFill: 'stop'
    },
    {
      name: 'default-full-range-next-open',
      dataFile: defaultDataFile,
      startDate: '2016-10-07',
      endDate: '2025-10-13',
      stopFill: 'next-open'
    },
    { name: 'default-whole-file', dataFile: defaultDataFile, stopFill: 'stop' },
    ...[2017, 2018, 2019, 2020, 2021, 2022, 2023].map((year) => ({
      name: `default-${year}`,
      dataFile: defaultDataFile,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      stopFill: (year % 2 ? 'stop' : 'next-open') as StopFill
    })),
    {
      name: 'default-2016-2019-next-open',
      dataFile: defaultDataFile,
      startDate: '2016-10-07',
      endDate: '2019-12-31',
      stopFill: 'next-open'
    },
    {
      name: 'default-early-close-dst-2016',
      dataFile: defaultDataFile,
      startDate: '2016-11-01',
      endDate: '2017-03-31',
      stopFill: 'stop'
    },
    {
      name: 'default-2018-12',
      dataFile: defaultDataFile,
      startDate: '2018-12-01',
      endDate: '2019-01-15',
      stopFill: 'stop'
    },
    {
      name: 'default-no-fill-2019-08',
      dataFile: defaultDataFile,
      startDate: '2019-08-01',
      endDate: '2019-09-15',
      stopFill: 'stop'
    },
    {
      name: 'default-2020-crash-stop',
      dataFile: defaultDataFile,
      startDate: '2020-02-01',
      endDate: '2020-05-29',
      stopFill: 'stop'
    },
    {
      name: 'default-2020-crash-next-open',
      dataFile: defaultDataFile,
      startDate: '2020-02-01',
      endDate: '2020-05-29',
      stopFill: 'next-open'
    }
  ];
  const variantVectors = [...cornerVectors(), ...goldenVectors(options.seed, options.variants)];

  variantVectors.forEach((params, index) => {
    const window = engineWindows[index % engineWindows.length]!;

    fileCases.push({
      name: `variant-${index}`,
      dataFile: defaultDataFile,
      startDate: window.startDate,
      endDate: window.endDate,
      stopFill: index % 3 === 2 ? 'next-open' : 'stop',
      params
    });
  });

  // Synthetic fixtures: each is run at the defaults and at a few vectors, against the original itself.
  const fixtureSummaries = [];
  const fixtureVectors = [incumbentParams, ...cornerVectors().slice(2), ...goldenVectors(options.seed + 1, 6)];

  for (let fixture = 0; fixture < options.fixtures; fixture++) {
    const summary = await writeMinuteFixture(path.join(options.scratchDir, 'fixtures'), {
      seed: options.seed + fixture,
      start: ['2017-02-20', '2017-06-15', '2018-10-15', '2017-10-25'][fixture % 4]!,
      sessions: 160,
      // Every other fixture is harsher: many sessions without a trade after the decision and many
      // missing minutes, which reaches the rarest fill paths.
      ...(fixture % 2
        ? { noTradeAfterDecisionProbability: 0.35, missingMinuteProbability: 0.25, gapProbability: 0.2 }
        : {})
    });

    fixtureSummaries.push(summary);
    fixtureVectors.forEach((params, index) => {
      fileCases.push({
        name: `fixture-${fixture}-vector-${index}`,
        dataFile: summary.file,
        stopFill: index % 2 ? 'next-open' : 'stop',
        params: index === 0 ? undefined : params
      });
    });
  }

  const fileResults: FileCaseResult[] = [];

  for (const testCase of fileCases) {
    const result = await runFileCase(testCase, options.scratchDir, sessionsFor);

    fileResults.push(result);
    log(`${result.identical ? 'identical' : 'DIFFERENT'}  ${testCase.name}  trades=${result.trades}`);

    if (!result.identical) {
      result.differences.forEach((difference) => log(`    ${difference}`));
    }
  }

  // Layer 3 on real data (research period only, plus the incumbent's full range) and on the fixtures.
  const engineResults: EngineCaseResult[] = [];
  const engineVectors = [
    incumbentParams,
    ...cornerVectors(),
    ...goldenVectors(options.seed + 2, options.engineVectors)
  ];
  const rng = Rng.from('minute-golden-engine-cases', options.seed);

  for (const [index, params] of engineVectors.entries()) {
    const window = engineWindows[index % engineWindows.length]!;
    const result = await runEngineCase(researchSessions, researchData, {
      name: `engine-${index}`,
      params,
      startDate: window.startDate,
      endDate: window.endDate,
      warmup: rng.next() < 0.6,
      stopFill: rng.next() < 0.3 ? 'next-open' : 'stop'
    });

    engineResults.push(result);

    if (!result.identical) {
      log(`DIFFERENT  ${result.name}`);
      result.differences.forEach((difference) => log(`    ${difference}`));
    }
  }

  const fullData = buildDataset(allSessions, 'VGT', dataHash);

  for (const stopFill of ['stop', 'next-open'] as const) {
    engineResults.push(
      await runEngineCase(allSessions, fullData, {
        name: `engine-incumbent-full-range-${stopFill}`,
        params: incumbentParams,
        startDate: '2016-10-07',
        endDate: '2025-10-13',
        warmup: false,
        stopFill
      })
    );
  }

  for (const summary of fixtureSummaries) {
    const sessions = await sessionsFor(summary.file);
    const dataset = buildDataset(sessions, 'FIXTURE', await sha256File(summary.file));
    const middle = sessions[Math.floor(sessions.length / 2)]!.date;

    for (const [index, params] of fixtureVectors.entries()) {
      for (const warmup of [false, true]) {
        engineResults.push(
          await runEngineCase(sessions, dataset, {
            name: `engine-${path.basename(summary.file)}-${index}-${warmup ? 'warm' : 'cold'}`,
            params,
            startDate: warmup ? middle : sessions[0]!.date,
            endDate: sessions.at(-1)!.date,
            warmup,
            stopFill: index % 2 ? 'next-open' : 'stop'
          })
        );
      }
    }
  }

  const protectedAfter = await verifyProtectedFiles();
  const coverage = {
    executions: [...new Set(engineResults.flatMap((result) => result.executions))].sort(),
    reasons: [...new Set(engineResults.flatMap((result) => result.reasons))].sort(),
    casesWithRestrictions: engineResults.filter((result) => result.restrictions > 0).length,
    casesWithLowerPriceReentries: engineResults.filter((result) => result.lowerPriceReentries > 0).length,
    casesWithRecoveryResets: engineResults.filter((result) => result.recoveryResets > 0).length,
    casesWithEntriesWithoutTrade: engineResults.filter((result) => result.entriesWithoutTrade > 0).length
  };

  return {
    generatedAtUtc: new Date().toISOString(),
    seconds: (Date.now() - started) / 1000,
    dataFile: defaultDataFile,
    dataHash,
    protectedBefore,
    protectedAfter,
    fileCases: {
      total: fileResults.length,
      identical: fileResults.filter((result) => result.identical).length,
      results: fileResults
    },
    engineCases: {
      total: engineResults.length,
      identical: engineResults.filter((result) => result.identical).length,
      maximumMinuteDrawdownGap: Math.max(...engineResults.map((result) => result.minuteDrawdownGap)),
      results: engineResults
    },
    fixtures: fixtureSummaries,
    coverage
  };
};
