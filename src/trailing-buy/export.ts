// Output files. `originalFormatFiles` reproduces the five files of src/app/allin-original.ts character for
// character (same columns, same number formatting, same JSON layout), so a legacy run can be compared with
// the original by hash. `extendedFiles` adds the trailing-entry setup log and richer trade columns.
import fs from 'fs-extra';
import type { Bars, SimulationResult } from './engine.ts';

const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);

export const originalFormatFiles = (
  bars: Bars,
  result: SimulationResult,
  meta: { symbol: string; dataFile: string }
): Record<string, string> => {
  const { trades, stateLog, episodes, params } = result;
  const first = result.startIndex;
  const last = result.endIndex;
  const lastClose = bars.close[last]!;
  const tradeLines = [
    'entry_index,exit_index,entry_date,exit_date,entry_price,exit_price,reason,investment,shares,interest,profit'
  ];

  for (const trade of trades) {
    const isOpen = trade.reason === 'open';

    tradeLines.push(
      [
        trade.entryIndex,
        isOpen ? '' : trade.exitIndex,
        formatDate(trade.entryTime),
        isOpen ? '' : formatDate(trade.exitTime),
        trade.entryPrice,
        isOpen ? lastClose : trade.exitPrice,
        isOpen ? 'open' : trade.reason,
        trade.investment,
        trade.shares,
        isOpen ? result.accruedInterest : trade.interest,
        isOpen ? result.unrealizedProfit : trade.profit
      ].join(',')
    );
  }

  const dailyLines = ['index,date,close,borrowed,mtm_pnl'];

  for (let index = first; index <= last; index++) {
    dailyLines.push(
      [
        index,
        bars.date[index],
        bars.close[index],
        result.inPosition[index] ? result.options.investment : 0,
        result.mtm[index]
      ].join(',')
    );
  }

  const stateLines = [
    'index,date,prev_state,new_state,reason,exit_reason,trade_profit,price_return,loss_exit_price,ref_high,lower_level,episode_low,reset_level,close,signal,entry_executed'
  ];

  for (const row of stateLog) {
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

  for (const row of episodes) {
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

  const closedTrades = trades.filter((trade) => trade.reason !== 'open').length;
  const summary = {
    symbol: meta.symbol,
    dataFile: meta.dataFile,
    strategy: 'lower3',
    materialLossThreshold: params.materialLossTenths / 1000,
    lowerPriceReentry: params.lowerReentryTenths / 1000,
    retraceFraction: params.retraceTenths / 1000,
    firstDate: bars.date[first],
    lastDate: bars.date[last],
    sessions: last - first + 1,
    closedTrades,
    openAtEnd: trades.some((trade) => trade.reason === 'open'),
    realizedProfit: result.realizedProfit,
    unrealizedProfit: result.unrealizedProfit,
    netProfit: result.realizedProfit + result.unrealizedProfit,
    marginInterest: result.closedInterest + result.accruedInterest,
    maximumDrawdown: result.maximumDrawdown,
    drawdownPeakDate: bars.date[result.drawdownPeakIndex],
    drawdownTroughDate: bars.date[result.drawdownTroughIndex],
    restrictions: episodes.length,
    lowerPriceReentries: episodes.filter((row) => row.resolution === 'lower_price_reentry').length,
    recoveryResets: episodes.filter((row) => row.resolution === 'recovery_reset').length,
    lossesNotRestricted: stateLog.filter((row) => row.reason === 'loss_not_restricted').length
  };

  return {
    'trades.csv': `${tradeLines.join('\n')}\n`,
    'daily.csv': `${dailyLines.join('\n')}\n`,
    'states.csv': `${stateLines.join('\n')}\n`,
    'episodes.csv': `${episodeLines.join('\n')}\n`,
    'summary.json': `${JSON.stringify(summary, null, 1)}\n`
  };
};

const fixed = (value: number, digits = 6) => (Number.isFinite(value) ? Number(value.toFixed(digits)) : '');

// Richer per-run files for the study: every trade and setup with dates, and the daily curve.
export const extendedFiles = (bars: Bars, result: SimulationResult): Record<string, string> => {
  const date = (index: number) => (index >= 0 ? bars.date[index]! : '');
  const trades = [
    'id,setup_id,decision_date,entry_date,exit_date,entry_price,exit_price,reason,restricted_entry,shares,interest,profit,price_return,reference_high,lowest_low,low_drop,worst_mark,restricted_after'
  ];

  for (const trade of result.trades) {
    trades.push(
      [
        trade.id,
        trade.setupId,
        date(trade.decisionIndex),
        date(trade.entryIndex),
        trade.reason === 'open' ? '' : date(trade.exitIndex),
        trade.entryPrice,
        trade.exitPrice,
        trade.reason,
        trade.restrictedEntry,
        trade.shares,
        trade.interest,
        trade.profit,
        trade.priceReturn,
        trade.referenceHigh,
        trade.lowestLow,
        1 - trade.lowestLow / trade.entryPrice,
        trade.worstMark,
        trade.restrictedAfter
      ].join(',')
    );
  }

  const setups = [
    'id,arm_date,arm_close,arm_reference_high,arm_drawdown,restricted_at_arm,lower_level_at_arm,trough,trough_date,new_troughs,atr_snapshot,blocked_triggers,decision_date,trigger,decision_close,effective_rebound,fill_date,fill_price,end_date,outcome,wait_sessions,fill_vs_arm,fill_vs_trough'
  ];

  for (const setup of result.setups) {
    const decisionClose = setup.decisionIndex >= 0 ? bars.close[setup.decisionIndex]! : NaN;

    setups.push(
      [
        setup.id,
        date(setup.armIndex),
        setup.armClose,
        setup.armReferenceHigh,
        fixed(setup.armDrawdown, 8),
        setup.restrictedAtArm,
        fixed(setup.lowerLevelAtArm, 8),
        setup.trough,
        date(setup.troughIndex),
        setup.newTroughs,
        fixed(setup.atrSnapshot, 8),
        setup.blockedTriggers,
        date(setup.decisionIndex),
        fixed(setup.trigger, 8),
        fixed(decisionClose, 8),
        fixed(decisionClose / setup.trough - 1, 8),
        date(setup.fillIndex),
        fixed(setup.fillPrice, 8),
        date(setup.endIndex),
        setup.outcome,
        setup.decisionIndex >= 0 ? setup.decisionIndex - setup.armIndex : '',
        fixed(setup.fillPrice / setup.armClose - 1, 8),
        fixed(setup.fillPrice / setup.trough - 1, 8)
      ].join(',')
    );
  }

  const daily = ['date,close,in_position,mtm_pnl,interest_cum'];

  for (let index = result.startIndex; index <= result.endIndex; index++) {
    daily.push(
      [
        bars.date[index],
        bars.close[index],
        result.inPosition[index],
        result.mtm[index],
        result.interestCum[index]
      ].join(',')
    );
  }

  return {
    'trades.csv': `${trades.join('\n')}\n`,
    'setups.csv': `${setups.join('\n')}\n`,
    'daily.csv': `${daily.join('\n')}\n`
  };
};

export const writeFiles = async (outDir: string, files: Record<string, string>) => {
  await fs.ensureDir(outDir);

  for (const [name, text] of Object.entries(files)) {
    await fs.writeFile(`${outDir}/${name}`, text);
  }
};
