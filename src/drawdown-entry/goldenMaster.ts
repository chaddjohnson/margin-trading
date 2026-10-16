// Byte-for-byte equivalence between src/app/allin-original.ts (run through its own default export, only
// read) and this study's engine with the baseline policy, same-close execution and zero costs.

import fs from 'fs-extra';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { baselineSettings } from './constants.ts';
import { type DailyBars, firstIndexOnOrAfter, lastIndexOnOrBefore, loadDaily, sliceBars } from './data.ts';
import { type SimulationResult, baselinePolicy, simulate } from './engine.ts';

const originalModule = '../app/allin-original.ts';
export const originalPath = 'src/app/allin-original.ts';
export const originalSha256 = '42f2b7e7be4ef99e1af6c4fe113dd8da9ed4d329d2fe0564463db80b87f449e2';
export const outputFiles = ['trades.csv', 'daily.csv', 'states.csv', 'episodes.csv', 'summary.json'];

const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

// Writes the engine's result in the original's five output formats.
export const writeOriginalFormat = async (
  result: SimulationResult,
  bars: DailyBars,
  dataFile: string,
  outDir: string
) => {
  await fs.ensureDir(outDir);

  const tradeLines = [
    'entry_index,exit_index,entry_date,exit_date,entry_price,exit_price,reason,investment,shares,interest,profit'
  ];

  for (const trade of result.trades) {
    const isOpen = trade.reason === 'open';

    tradeLines.push(
      [
        trade.entryIndex,
        isOpen ? '' : trade.exitIndex,
        formatDate(trade.entryTime),
        isOpen ? '' : formatDate(trade.exitTime),
        trade.entryPrice,
        trade.exitPrice,
        trade.reason,
        trade.investment,
        trade.shares,
        trade.interest,
        trade.profit
      ].join(',')
    );
  }

  const dailyLines = ['index,date,close,borrowed,mtm_pnl'];

  for (let index = result.startIndex; index <= result.endIndex; index++) {
    dailyLines.push(
      [
        index,
        bars.date[index],
        bars.close[index],
        result.inPosition[index] ? result.settings.investment : 0,
        result.mtm[index]
      ].join(',')
    );
  }

  const stateLines = [
    'index,date,prev_state,new_state,reason,exit_reason,trade_profit,price_return,loss_exit_price,ref_high,lower_level,episode_low,reset_level,close,signal,entry_executed'
  ];

  for (const row of result.stateLog) {
    stateLines.push(
      [
        row.index,
        row.date,
        row.prevState,
        row.newState,
        row.reason,
        row.exitReason,
        row.tradeProfit,
        row.priceReturn,
        row.lossExitPrice,
        row.refHigh,
        row.lowerLevel,
        row.episodeLow,
        row.resetLevel,
        row.close,
        row.signal,
        row.entryExecuted
      ].join(',')
    );
  }

  const episodeLines = [
    'exit_index,exit_date,exit_reason,loss,price_return,loss_exit_price,losing_entry_price,ref_high,episode_low,resolution,resolution_date'
  ];

  for (const row of result.episodes) {
    episodeLines.push(
      [
        row.exitIndex,
        row.exitDate,
        row.exitReason,
        row.loss,
        row.priceReturn,
        row.lossExitPrice,
        row.losingEntryPrice,
        row.referenceHigh,
        row.episodeLow,
        row.resolution,
        row.resolutionDate
      ].join(',')
    );
  }

  const settings = result.settings;
  const summary = {
    symbol: bars.symbol,
    dataFile,
    strategy: 'lower3',
    materialLossThreshold: settings.materialLoss,
    lowerPriceReentry: settings.lowerReentry,
    retraceFraction: settings.retrace,
    firstDate: bars.date[result.startIndex],
    lastDate: bars.date[result.endIndex],
    sessions: result.endIndex - result.startIndex + 1,
    closedTrades: result.trades.filter((trade) => trade.reason !== 'open').length,
    openAtEnd: result.trades.some((trade) => trade.reason === 'open'),
    realizedProfit: result.realizedProfit,
    unrealizedProfit: result.unrealizedProfit,
    netProfit: result.netProfit,
    marginInterest: result.closedInterest + result.accruedInterest,
    maximumDrawdown: result.maximumDrawdown,
    drawdownPeakDate: bars.date[result.drawdownPeakIndex],
    drawdownTroughDate: bars.date[result.drawdownTroughIndex],
    restrictions: result.restrictions,
    lowerPriceReentries: result.lowerPriceReentries,
    recoveryResets: result.recoveryResets,
    lossesNotRestricted: result.lossesNotRestricted
  };

  await fs.writeFile(`${outDir}/trades.csv`, `${tradeLines.join('\n')}\n`);
  await fs.writeFile(`${outDir}/daily.csv`, `${dailyLines.join('\n')}\n`);
  await fs.writeFile(`${outDir}/states.csv`, `${stateLines.join('\n')}\n`);
  await fs.writeFile(`${outDir}/episodes.csv`, `${episodeLines.join('\n')}\n`);
  await fs.writeFile(`${outDir}/summary.json`, `${JSON.stringify(summary, null, 1)}\n`);
};

// Runs the original with its console output silenced.
export const runOriginal = async (symbol: string, dataFile: string, outDir: string, startDate = '-', endDate = '-') => {
  const module = await import(originalModule);
  const run = module.default as (...args: string[]) => Promise<void>;
  const info = console.info;
  const lines: string[] = [];

  console.info = (...args: unknown[]) => {
    lines.push(args.join(' '));
  };

  try {
    await run(symbol, startDate, endDate, dataFile, outDir);
  } finally {
    console.info = info;
  }

  return lines;
};

const sha256 = (buffer: Buffer | string) => crypto.createHash('sha256').update(buffer).digest('hex');

export interface GoldenCase {
  name: string;
  symbol: string;
  dataFile: string;
  startDate?: string;
  endDate?: string;
}

export interface GoldenResult extends GoldenCase {
  identical: boolean;
  files: Record<string, { original: string; engine: string }>;
  closedTrades: number;
  netProfit: number;
}

export const runGoldenCase = async (testCase: GoldenCase, workDir?: string): Promise<GoldenResult> => {
  const dir = workDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'drawdown-golden-')));
  const originalDir = path.join(dir, `${testCase.name}-original`);
  const engineDir = path.join(dir, `${testCase.name}-engine`);
  const all = await loadDaily(testCase.symbol, testCase.dataFile);
  const from = testCase.startDate ? firstIndexOnOrAfter(all, testCase.startDate) : 0;
  const to = testCase.endDate ? lastIndexOnOrBefore(all, testCase.endDate) : all.date.length - 1;
  const bars = sliceBars(all, from, to);

  await runOriginal(
    testCase.symbol,
    testCase.dataFile,
    originalDir,
    testCase.startDate ?? '-',
    testCase.endDate ?? '-'
  );

  const result = simulate({ bars, policy: baselinePolicy(), settings: baselineSettings, execution: 'close' });

  await writeOriginalFormat(result, bars, testCase.dataFile, engineDir);

  const files: GoldenResult['files'] = {};
  let identical = true;

  for (const file of outputFiles) {
    const original = sha256(await fs.readFile(path.join(originalDir, file)));
    const engine = sha256(await fs.readFile(path.join(engineDir, file)));

    files[file] = { original, engine };
    identical &&= original === engine;
  }

  if (!workDir) {
    await fs.remove(dir);
  }

  return {
    ...testCase,
    identical,
    files,
    closedTrades: result.trades.filter((trade) => trade.reason !== 'open').length,
    netProfit: result.netProfit
  };
};

export const goldenCases: GoldenCase[] = [
  { name: 'repo-default-VGT-2016-2026', symbol: 'VGT', dataFile: 'data/VGT/VGT-2016-2026.csv' },
  { name: 'VGT-2005-2026-full', symbol: 'VGT', dataFile: 'data/VGT/VGT-2005-2026.csv' },
  { name: 'VGT-2014-start', symbol: 'VGT', dataFile: 'data/VGT/VGT-2005-2026.csv', startDate: '2014-01-02' },
  {
    name: 'VGT-2014-2022',
    symbol: 'VGT',
    dataFile: 'data/VGT/VGT-2005-2026.csv',
    startDate: '2014-01-02',
    endDate: '2022-12-30'
  },
  {
    name: 'VGT-2020-only',
    symbol: 'VGT',
    dataFile: 'data/VGT/VGT-2005-2026.csv',
    startDate: '2020-01-02',
    endDate: '2020-12-31'
  },
  {
    name: 'QQQ-stooq',
    symbol: 'QQQ',
    dataFile: 'data/stooq/processed/QQQ/QQQ-stooq-daily.csv',
    startDate: '2014-01-02'
  },
  {
    name: 'SOXX-stooq',
    symbol: 'SOXX',
    dataFile: 'data/stooq/processed/SOXX/SOXX-stooq-daily.csv',
    startDate: '2014-01-02'
  },
  {
    name: 'IWN-stooq',
    symbol: 'IWN',
    dataFile: 'data/stooq/processed/IWN/IWN-stooq-daily.csv',
    startDate: '2014-01-02'
  }
];

export const verifyOriginalUnchanged = async () => {
  const actual = sha256(await fs.readFile(originalPath));

  return { path: originalPath, expected: originalSha256, actual, unchanged: actual === originalSha256 };
};
