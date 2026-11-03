// Phase 0: dataset audit, byte-for-byte parity with the immutable original, and the saved baseline runs.
import fs from 'fs-extra';
import {
  crossAssetSymbols,
  derivedDir,
  developmentEnd,
  holdoutEnd,
  repoDefaultFile,
  researchStart,
  resultsDir,
  stooqDir,
  vgtCombinedFile
} from './constants.ts';
import { buildCombinedVgt, loadDaily, loadVgt } from './data.ts';
import { baselineParams, checkedInParams, simulate } from './engine.ts';
import { extendedFiles, writeFiles } from './export.ts';
import { type GoldenCase, fileNames, runGoldenCase, runOriginalModule, writeVariant } from './goldenMaster.ts';
import { IndicatorCache } from './indicators.ts';
import { windowMetrics } from './metrics.ts';
import { writeJson } from './study.ts';

export const auditBars = (bars: Awaited<ReturnType<typeof loadVgt>>) => {
  const gaps: { after: string; next: string; calendarDays: number }[] = [];
  const invalid: string[] = [];
  const bigMoves: { date: string; closeChange: number }[] = [];
  const lowOutliers: { date: string; lowVsPreviousClose: number }[] = [];
  const sessionsPerYear: Record<string, number> = {};

  for (let index = 0; index < bars.date.length; index++) {
    const [open, high, low, close] = [bars.open[index]!, bars.high[index]!, bars.low[index]!, bars.close[index]!];
    const year = bars.date[index]!.slice(0, 4);

    sessionsPerYear[year] = (sessionsPerYear[year] ?? 0) + 1;

    if (
      !(low > 0) ||
      !(low <= Math.min(open, close)) ||
      !(high >= Math.max(open, close)) ||
      ![open, high, low, close].every(Number.isFinite)
    ) {
      invalid.push(bars.date[index]!);
    }

    if (index > 0) {
      const days = (bars.time[index]! - bars.time[index - 1]!) / 86400;

      if (days > 4) {
        gaps.push({ after: bars.date[index - 1]!, next: bars.date[index]!, calendarDays: days });
      }

      const change = close / bars.close[index - 1]! - 1;

      if (Math.abs(change) > 0.08) {
        bigMoves.push({ date: bars.date[index]!, closeChange: change });
      }

      const lowDrop = low / bars.close[index - 1]! - 1;

      if (lowDrop < -0.1) {
        lowOutliers.push({ date: bars.date[index]!, lowVsPreviousClose: lowDrop });
      }
    }
  }

  return {
    sessions: bars.date.length,
    firstDate: bars.date[0],
    lastDate: bars.date.at(-1),
    gaps,
    invalid,
    bigMoves,
    lowOutliers,
    sessionsPerYear
  };
};

export const runPhase0 = async () => {
  const manifest = await buildCombinedVgt();
  const bars = await loadVgt();
  const audit = auditBars(bars);
  const crossAsset: Record<string, unknown> = {};

  for (const symbol of crossAssetSymbols) {
    const file = `${stooqDir}/${symbol}/${symbol}-stooq-daily.csv`;
    const series = await loadDaily(symbol, file);
    const result = auditBars(series);

    crossAsset[symbol] = { file, sha256: series.sha256, ...result, sessionsPerYear: undefined };
  }

  await writeJson('phase0/data_manifest.json', { manifest, audit, crossAsset });

  // Byte-for-byte parity. Every case runs the original module itself.
  const variant = await writeVariant();
  const cases: GoldenCase[] = [
    { id: 'repo-default-checked-in', reference: 'checked-in', symbol: 'VGT', dataFile: repoDefaultFile },
    { id: 'repo-default-1pct-2pct', reference: '1pct-2pct', symbol: 'VGT', dataFile: repoDefaultFile },
    { id: 'research-file-whole-checked-in', reference: 'checked-in', symbol: 'VGT', dataFile: vgtCombinedFile },
    { id: 'research-file-whole-1pct-2pct', reference: '1pct-2pct', symbol: 'VGT', dataFile: vgtCombinedFile },
    {
      id: 'research-window-checked-in',
      reference: 'checked-in',
      symbol: 'VGT',
      dataFile: vgtCombinedFile,
      startDate: researchStart
    },
    {
      id: 'research-window-1pct-2pct',
      reference: '1pct-2pct',
      symbol: 'VGT',
      dataFile: vgtCombinedFile,
      startDate: researchStart
    },
    {
      id: 'development-1pct-2pct',
      reference: '1pct-2pct',
      symbol: 'VGT',
      dataFile: vgtCombinedFile,
      startDate: researchStart,
      endDate: developmentEnd
    },
    {
      id: 'year-2020-1pct-2pct',
      reference: '1pct-2pct',
      symbol: 'VGT',
      dataFile: vgtCombinedFile,
      startDate: '2020-01-01',
      endDate: '2020-12-31'
    },
    ...['QQQ', 'SOXX', 'IWN'].map((symbol) => ({
      id: `${symbol}-1pct-2pct`,
      reference: '1pct-2pct' as const,
      symbol,
      dataFile: `${stooqDir}/${symbol}/${symbol}-stooq-daily.csv`,
      startDate: researchStart
    }))
  ];
  const outcomes = [];

  for (const testCase of cases) {
    outcomes.push(await runGoldenCase(testCase, `${derivedDir}/golden`));
  }

  // Warm start (history before 2014 available) against the original's cold start, over the research
  // window and the development window.
  const cache = new IndicatorCache(bars);
  const start = bars.date.indexOf(researchStart);
  const devEnd = bars.date.lastIndexOf(developmentEnd);
  const warmCold = [];

  for (const [label, params] of [
    ['B0', baselineParams],
    ['B0c', checkedInParams]
  ] as const) {
    for (const [window, end] of [
      ['development', devEnd],
      ['research', bars.date.length - 1]
    ] as const) {
      const warm = simulate(bars, cache, params, start, end, { record: false });
      const slice = {
        ...bars,
        date: bars.date.slice(start, end + 1),
        time: bars.time.slice(start, end + 1),
        open: bars.open.slice(start, end + 1),
        high: bars.high.slice(start, end + 1),
        low: bars.low.slice(start, end + 1),
        close: bars.close.slice(start, end + 1)
      };
      const cold = simulate(slice, new IndicatorCache(slice), params, 0, slice.date.length - 1, { record: false });
      const key = (trades: typeof warm.trades, offset: number) =>
        trades
          .map(
            (trade) =>
              `${trade.entryIndex - offset}:${trade.exitIndex === -1 ? -1 : trade.exitIndex - offset}:${trade.entryPrice}:${trade.exitPrice}`
          )
          .join('|');

      warmCold.push({
        baseline: label,
        window,
        identicalTrades: key(warm.trades, start) === key(cold.trades, 0),
        warmNet: warm.netProfit,
        coldNet: cold.netProfit,
        warmDrawdown: warm.maximumDrawdown,
        coldDrawdown: cold.maximumDrawdown
      });
    }
  }

  await writeJson('phase0/golden_master.json', {
    variant,
    fileNames,
    allIdentical: outcomes.every((outcome) => outcome.identical),
    outcomes,
    warmCold
  });

  // The saved baseline runs: the original's own five files (research window, cold start as the original
  // runs it), and the engine's extended files for the warm-start development and research windows.
  for (const [label, modulePath] of [
    ['B0', variant.file],
    ['B0c', 'src/app/allin-original.ts']
  ] as const) {
    await runOriginalModule(
      modulePath,
      'VGT',
      vgtCombinedFile,
      `${resultsDir}/phase0/baseline/${label}_original_${researchStart}_${holdoutEnd}`,
      researchStart,
      '-'
    );
  }

  const summaries = [];

  for (const [label, params] of [
    ['B0', baselineParams],
    ['B0c', checkedInParams]
  ] as const) {
    for (const [window, end] of [
      ['development', devEnd],
      ['research', bars.date.length - 1]
    ] as const) {
      const result = simulate(bars, cache, params, start, end);
      const metrics = windowMetrics(bars, result, start, end);

      await writeFiles(`${resultsDir}/phase0/baseline/${label}_engine_${window}`, extendedFiles(bars, result));
      summaries.push({ baseline: label, window, ...metrics, annual: metrics.annual });
    }
  }

  await writeJson('phase0/baseline_summaries.json', summaries);

  const sizes = await Promise.all(
    fileNames.map(
      async (name) =>
        (await fs.stat(`${resultsDir}/phase0/baseline/B0_original_${researchStart}_${holdoutEnd}/${name}`)).size
    )
  );

  return { manifest, audit, outcomes, warmCold, summaries, sizes };
};
