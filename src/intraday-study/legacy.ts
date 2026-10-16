// Writes a run in the exact output format of src/app/allIn.ts (trades.csv, daily.csv, states.csv,
// episodes.csv, summary.json), so the golden master can compare files byte for byte.
import type { MarketSession } from '#types';
import fs from 'fs-extra';
import path from 'node:path';
import { incumbent } from './constants.ts';
import type { RunResult } from './engine.ts';

const formatDate = (timestamp: number) => new Date(timestamp * 1000).toISOString().slice(0, 10);
const formatTime = (timestamp: number) => new Date(timestamp * 1000).toISOString();

export interface LegacyFiles {
  'trades.csv': string;
  'daily.csv': string;
  'states.csv': string;
  'episodes.csv': string;
  'summary.json': string;
}

export const legacyFiles = (
  result: RunResult,
  sessions: readonly MarketSession[],
  options: { dataFile: string; strategy?: string; symbol?: string }
): LegacyFiles => {
  const zero = result.costsBps.indexOf(0);

  if (zero < 0) {
    throw new Error('The legacy output needs the 0 bp cost level');
  }

  const first = sessions[result.firstIndex]!;
  const last = sessions[result.input.endIndex]!;
  const openTrade = result.trades.find((trade) => trade.exitReason === 'open');
  const closed = result.trades.filter((trade) => trade.exitReason !== 'open');
  const closedInterest = closed.reduce((total, trade) => total + trade.interest, 0);
  // The engine sets an open trade's interest to the accrual through the last session.
  const accruedInterest = openTrade ? openTrade.interest : 0;
  const unrealizedProfit = openTrade ? openTrade.profit : 0;
  const tradeLines = [
    'entry_index,exit_index,entry_date,exit_date,entry_price,exit_price,reason,investment,shares,interest,profit,entry_time,entry_execution,decision_time,decision_price,entry_session_close,exit_time,exit_execution,exit_stop_price,maximum_hold_due'
  ];

  for (const trade of result.trades) {
    const isOpen = trade.exitReason === 'open';
    const entryFill = result.legacyEntryFills.get(trade)!;

    tradeLines.push(
      [
        trade.entryIndex,
        isOpen ? '' : trade.exitIndex,
        formatDate(sessions[trade.entryIndex]!.time),
        isOpen ? '' : formatDate(sessions[trade.exitIndex]!.time),
        trade.entryPrice,
        isOpen ? last.close : trade.exitPrice,
        trade.exitReason,
        trade.investment,
        trade.shares,
        isOpen ? accruedInterest : trade.interest,
        isOpen ? unrealizedProfit : trade.profit,
        formatTime(entryFill.time),
        entryFill.execution,
        formatTime(entryFill.decisionTime),
        entryFill.decisionPrice,
        entryFill.sessionClose,
        isOpen ? '' : formatTime(trade.exitTime),
        isOpen ? '' : trade.exitExecution,
        isOpen ? '' : trade.exitStopPrice,
        isOpen ? '' : trade.isMaximumHoldDue
      ].join(',')
    );
  }

  const dailyLines = ['index,date,close,borrowed,mtm_pnl,recent_high,decision_price,signal'];

  for (const row of result.daily) {
    dailyLines.push(
      [row.index, row.date, row.close, row.borrowed, row.mtmProfit, row.recentHigh, row.decisionPrice, row.signal].join(
        ','
      )
    );
  }

  const stateLines = [
    'index,date,prev_state,new_state,reason,exit_reason,trade_profit,price_return,loss_exit_price,ref_high,lower_level,episode_low,reset_level,close,signal,entry_executed,decision_price'
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
        row.entryExecuted,
        row.decisionPrice
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

  const minute = result.minuteDrawdown[zero]!;
  const daily = result.dailyDrawdown[zero]!;
  const summary = {
    symbol: options.symbol ?? 'VGT',
    dataFile: options.dataFile,
    strategy: options.strategy ?? 'material1-lower2-retrace38',
    stopFill: result.input.stopFill,
    materialLossThreshold: incumbent.materialLossThreshold,
    lowerPriceReentry: incumbent.lowerPriceReentry,
    retraceFraction: incumbent.retraceFraction,
    firstDate: first.date,
    lastDate: last.date,
    sessions: result.input.endIndex - result.firstIndex + 1,
    closedTrades: closed.length,
    openAtEnd: Boolean(openTrade),
    realizedProfit: result.realizedProfit,
    unrealizedProfit,
    netProfit: result.realizedProfit + unrealizedProfit,
    marginInterest: closedInterest + accruedInterest,
    maximumDrawdown: daily.maximumDrawdown,
    drawdownPeakDate: formatDate(daily.peakTimestamp),
    drawdownTroughDate: formatDate(daily.troughTimestamp),
    minuteMaximumDrawdown: minute.maximumDrawdown,
    minuteDrawdownPeakTime: formatTime(minute.peakTimestamp),
    minuteDrawdownTroughTime: formatTime(minute.troughTimestamp),
    entriesWithoutTrade: result.entriesWithoutTrade,
    restrictions: result.episodes.length,
    lowerPriceReentries: result.episodes.filter((row) => row.resolution === 'lower_price_reentry').length,
    recoveryResets: result.episodes.filter((row) => row.resolution === 'recovery_reset').length,
    lossesNotRestricted: result.stateLog.filter((row) => row.reason === 'loss_not_restricted').length
  };

  return {
    'trades.csv': `${tradeLines.join('\n')}\n`,
    'daily.csv': `${dailyLines.join('\n')}\n`,
    'states.csv': `${stateLines.join('\n')}\n`,
    'episodes.csv': `${episodeLines.join('\n')}\n`,
    'summary.json': `${JSON.stringify(summary, null, 1)}\n`
  };
};

export const writeLegacyFiles = async (dir: string, files: LegacyFiles) => {
  await fs.ensureDir(dir);

  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(dir, name), content);
  }
};
