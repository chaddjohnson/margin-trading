// Engine outputs for the independent replay (research/trailing-buy-entry/replay/): a fixed list of
// configurations over the development window and four synthetic walks. The replay is written from
// STATE_MACHINE.md alone and compares its own trades, setups and totals with these files.
import fs from 'fs-extra';
import { derivedDir, developmentEnd, researchStart, studyDir } from './constants.ts';
import { loadVgt, sliceBars } from './data.ts';
import { type RunOptions, type StrategyParams, baselineParams, simulate } from './engine.ts';
import { IndicatorCache } from './indicators.ts';
import { barsFrom, volatileWalk, writeFixture } from './tests/helpers.ts';
import { toCsv } from './study.ts';

const fixed = (reboundTenths: number, extra: Partial<StrategyParams> = {}): StrategyParams => ({
  ...baselineParams,
  entryMode: 'fixed',
  reboundTenths,
  ...extra
});

const custom: Partial<StrategyParams> = {
  lookback: 60,
  armTenths: 85,
  stopTenths: 60,
  holdDays: 10,
  materialLossTenths: 7,
  lowerReentryTenths: 40,
  retraceTenths: 500
};

export const replayConfigs: { id: string; params: StrategyParams; options: Partial<RunOptions> }[] = [
  { id: 'B0_close', params: baselineParams, options: {} },
  { id: 'B0_nextOpen', params: baselineParams, options: { execution: 'nextOpen' } },
  { id: 'fixedY30_close', params: fixed(30), options: {} },
  { id: 'fixedY5_close', params: fixed(5), options: {} },
  { id: 'fixedY30_nextOpen', params: fixed(30), options: { execution: 'nextOpen' } },
  { id: 'fixedY30_variantB', params: fixed(30), options: { restrictedFill: 'B' } },
  { id: 'fixedY30_fillHigh', params: fixed(30), options: { frozenHigh: 'fill' } },
  { id: 'fixedY30_maxWait10', params: fixed(30), options: { maxWaitSessions: 10 } },
  {
    id: 'atrSnapshot_K20_N14',
    params: { ...baselineParams, entryMode: 'atrSnapshot', atrMultTenths: 20, atrPeriod: 14 },
    options: {}
  },
  {
    id: 'atrRolling_K15_N10_X12',
    params: { ...baselineParams, entryMode: 'atrRolling', atrMultTenths: 15, atrPeriod: 10, armTenths: 120 },
    options: {}
  },
  { id: 'fixedY12_custom', params: fixed(12, custom), options: {} },
  { id: 'legacy_custom', params: { ...baselineParams, ...custom }, options: {} },
  { id: 'fixedY12_custom_rate14', params: fixed(12, custom), options: { marginRate: 0.14 } }
];

const outputs = (bars: { date: string[] }, result: ReturnType<typeof simulate>) => ({
  trades: toCsv(
    result.trades.map((trade) => ({
      decision_date: bars.date[trade.decisionIndex],
      entry_date: bars.date[trade.entryIndex],
      exit_date: trade.exitIndex >= 0 ? bars.date[trade.exitIndex] : '',
      entry_price: trade.entryPrice,
      exit_price: trade.exitPrice,
      reason: trade.reason,
      interest: trade.interest,
      profit: trade.profit,
      restricted_entry: trade.restrictedEntry
    }))
  ),
  setups: toCsv(
    result.setups.map((setup) => ({
      arm_date: bars.date[setup.armIndex],
      arm_close: setup.armClose,
      trough: setup.trough,
      trough_date: bars.date[setup.troughIndex],
      decision_date: setup.decisionIndex >= 0 ? bars.date[setup.decisionIndex] : '',
      fill_date: setup.fillIndex >= 0 ? bars.date[setup.fillIndex] : '',
      fill_price: Number.isFinite(setup.fillPrice) ? setup.fillPrice : '',
      outcome: setup.outcome,
      blocked_triggers: setup.blockedTriggers
    }))
  ),
  summary: {
    netProfit: result.netProfit,
    maximumDrawdown: result.maximumDrawdown,
    closedInterest: result.closedInterest,
    accruedInterest: result.accruedInterest,
    restrictions: result.restrictions,
    lowerPriceReentries: result.lowerPriceReentries,
    recoveryResets: result.recoveryResets,
    cancelledSetups: result.cancelledSetups
  }
});

export const exportReplayInputs = async () => {
  const outDir = `${studyDir}/replay/engine`;
  const all = await loadVgt();
  const bars = sliceBars(all, 0, all.date.lastIndexOf(developmentEnd));
  const cache = new IndicatorCache(bars);
  const start = bars.date.indexOf(researchStart);
  const manifest: unknown[] = [];

  await fs.ensureDir(outDir);

  const write = async (id: string, files: ReturnType<typeof outputs>) => {
    await fs.writeFile(`${outDir}/${id}_trades.csv`, files.trades);
    await fs.writeFile(`${outDir}/${id}_setups.csv`, files.setups);
    await fs.writeJson(`${outDir}/${id}_summary.json`, files.summary, { spaces: 1 });
  };

  // The development-only bars are written for the replay, so it never sees the holdout either.
  const dataFile = `${derivedDir}/replay/VGT-daily-to-${developmentEnd}.csv`;

  await fs.ensureDir(`${derivedDir}/replay`);
  await fs.writeFile(
    dataFile,
    `${bars.date.map((date, index) => [date, bars.open[index], bars.high[index], bars.low[index], bars.close[index], bars.volume[index]].join('|')).join('\n')}\n`
  );

  for (const config of replayConfigs) {
    const result = simulate(bars, cache, config.params, start, bars.date.length - 1, config.options);

    await write(config.id, outputs(bars, result));
    manifest.push({
      id: config.id,
      dataFile,
      startDate: researchStart,
      endDate: developmentEnd,
      params: config.params,
      options: config.options
    });
  }

  for (const seed of ['a', 'b', 'c', 'd']) {
    const rows = volatileWalk(seed);
    const file = await writeFixture(`walk-${seed}`, rows);
    const walk = barsFrom(rows);

    for (const config of [
      { id: `walk-${seed}_fixedY20`, params: fixed(20), options: {} },
      {
        id: `walk-${seed}_atrSnapshot_K10_N5`,
        params: { ...baselineParams, entryMode: 'atrSnapshot' as const, atrMultTenths: 10, atrPeriod: 5 },
        options: {}
      },
      {
        id: `walk-${seed}_fixedY20_nextOpen_B`,
        params: fixed(20),
        options: { execution: 'nextOpen' as const, restrictedFill: 'B' as const }
      }
    ]) {
      // Synthetic walks start at index 0 (cold): the first bar is skipped, as in the original.
      const result = simulate(walk, new IndicatorCache(walk), config.params, 0, walk.date.length - 1, config.options);

      await write(config.id, outputs(walk, result));
      manifest.push({
        id: config.id,
        dataFile: file,
        startDate: walk.date[0],
        endDate: walk.date.at(-1),
        params: config.params,
        options: config.options
      });
    }
  }

  await fs.writeJson(`${outDir}/manifest.json`, manifest, { spaces: 1 });

  return manifest.length;
};
