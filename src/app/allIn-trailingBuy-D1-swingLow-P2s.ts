// D1 + swing-low on one shared $100,000 margin allocation, first signal wins, paper-book semantics (P2s)
//
// A standalone, fixed-allocation backtest of the P2s policy of research/vgt-shared-margin-portfolio (one VGT margin
// allocation shared by the frozen D1 strategy, src/app/allIn-trailingBuy-postExitContinuation.ts, and the frozen
// swing-low C2 strategy, src/app/allIn-trailingBuy-swingLow.ts), run through the research program's engine
// (src/shared-margin-portfolio/) with no VOOG/VGT core portfolio, no dividends, no compounding and no reinvestment:
// the ledger holds nothing but the trading lots, so its marks are the strategies' own P&L.
//
// Semantics (PROTOCOL.md §5.2 and §5.5 of the research directory, unchanged):
// - Each strategy runs its complete standalone state machine on its own paper book: arming, trailing low, rebound,
//   fill, and its exits, including positions the shared allocation could not fund (phantom positions). Only a
//   standalone trade whose fill minute finds the allocation free is executed for real; it is then held to that
//   trade's standalone exit under its own rules. Paper trades never enter realized P&L, interest or drawdown.
// - First signal wins: whoever holds the lot keeps it; the other strategy's fill is declined while the allocation
//   is occupied. Two fills on the same minute go to D1 (slot order). There are never two funded positions.
// - Every executed trade borrows exactly $100,000 (shares = $100,000 / fill price), at 11% simple annual interest
//   accrued per calendar day from the entry session's date, none on the entry day, paid at exit. Profits stay as
//   cash and are never reinvested; losses are a liability until later profits cover them. Nothing is compounded.
// - Common eligibility: no strategy arms before 2017-06-15 (session 365), as in the research.
//
// Phenotypes (the shipped constants, read from src/shared-margin-portfolio/strategy.ts, which parity-checks them
// against the files): D1 X 21.6%, Y 0.3%, stop 7.3%, hold 8 calendar days, L 74 sessions, buffer 2.9%, P 9%,
// W 60 sessions; swing-low K 55 sessions, rebound 0.6%, stop 4%, hold 26 calendar days, buffer 0.4%, Z 0%.
//
// Regression: with `--d1-only` the same path runs D1 alone and must print $183,044 net / $19,331 minute drawdown.
//
// Usage: npm run app -- allIn-trailingBuy-D1-swingLow-P2s [VGT] [startDate] [endDate] [dataFile] [outDir] [--d1-only]
//   The engine always runs the whole file (the research dataset); startDate/endDate/dataFile are accepted for the
//   command-line shape of the other strategy files and must be '-' or omitted. outDir receives trades.csv, daily.csv
//   and summary.json in the other files' layout.
import fs from 'fs-extra';
import path from 'node:path';
import { formatNewYorkTime } from '#lib';
import { loadProgramData } from '../shared-margin-portfolio/data.ts';
import { type ScenarioResult, defaultConfig, formatTime, runScenario } from '../shared-margin-portfolio/engine.ts';
import { adverseExcursion, toCsv } from '../shared-margin-portfolio/metrics.ts';
import { shadowTradesOf } from '../shared-margin-portfolio/scenarios.ts';
import { type StrategyKey, interestOn, strategies } from '../shared-margin-portfolio/strategy.ts';

const investmentAmount = 100000;
const marginInterestRate = 0.11;
const eligibilityIndex = 365; // 2017-06-15
const owners: Record<string, string> = { d1: 'D1', swing: 'swing-low' };

export interface P2sOptions {
  symbol?: string;
  outDir?: string;
  d1Only?: boolean;
}

export const runP2s = async ({ symbol = 'VGT', outDir, d1Only = false }: P2sOptions = {}): Promise<ScenarioResult> => {
  if (symbol !== 'VGT') {
    throw new Error('Only VGT is supported: the shared-margin engine loads the VGT research dataset');
  }

  const loaded = await loadProgramData();
  // No dividends: the ledger is the strategies alone.
  const data = { ...loaded, distributions: [] };
  const keys: StrategyKey[] = d1Only ? ['d1'] : ['d1', 'swing'];
  const config = defaultConfig({
    key: d1Only ? 'D1-fixed100k' : 'P2s-fixed100k',
    label: d1Only
      ? 'D1 alone, fixed $100,000'
      : 'D1 + swing-low, first signal wins, paper-book semantics, fixed $100,000',
    strategies: keys,
    policy: d1Only ? 'single' : 'firstWins',
    semantics: d1Only ? 'hold' : 'shadow',
    fixedPrincipal: investmentAmount,
    corePolicy: 'none',
    rate: marginInterestRate,
    initial: { voog: 0, vgt: 0 },
    eligibilityIndex,
    regTCheck: false
  });
  const shadows = config.semantics === 'shadow' ? shadowTradesOf(data, keys, eligibilityIndex) : undefined;
  const result = runScenario(data, config, shadows);
  const { ds } = data;
  const lastIndex = result.endIndex;
  const lastSession = ds.dates[lastIndex]!;
  const closed = result.lots.filter((lot) => lot.exitIndex >= 0);
  const open = result.lots.find((lot) => lot.exitIndex < 0);
  const realizedProfit = closed.reduce((total, lot) => total + lot.netProfit, 0);
  const unrealizedProfit = open?.netProfit ?? 0;
  const closedInterest = closed.reduce((total, lot) => total + lot.interest, 0);
  const accruedInterest = open?.interest ?? 0;
  const wins = closed.filter((lot) => lot.netProfit > 0).length;
  const losses = closed.length - wins;
  const heldSessions = result.daily.filter((row) => row.openLots > 0).length;
  const eligibleSessions = result.daily.filter((row) => row.index >= eligibilityIndex).length;
  const exposure = heldSessions / eligibleSessions;
  const byOwner = (key: StrategyKey) => result.lots.filter((lot) => lot.owner === key);
  const formatDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format;
  const formatPrice = (value: number) => value.toFixed(2);
  const formatPercent = (value: number) => `${(100 * value).toFixed(2)}%`;
  const signalCounts = {
    granted: result.signals.filter((signal) => signal.outcome === 'granted').length,
    declined: result.signals.filter((signal) => signal.outcome === 'declined').length
  };

  for (const lot of result.lots) {
    const isOpen = lot.exitIndex < 0;
    const exitPrice = isOpen ? ds.sClose[lastIndex]! : lot.exitPrice;
    const monthsHeld = (ds.sTime[isOpen ? lastIndex : lot.exitIndex]! - lot.entryTimestamp) / ((365 / 12) * 86400);

    console.info(
      `${owners[lot.owner]} entered on setup ${lot.setupId} (${lot.setupKind}) at ${formatTime(lot.entryTime)} (${formatNewYorkTime(lot.entryTime)}) at ${formatPrice(lot.entryPrice)}; decision at ${formatNewYorkTime(lot.decisionTime)} on a close of ${formatPrice(lot.decisionPrice)}; $${investmentAmount.toLocaleString('en-US')} borrowed, ${lot.shares.toFixed(4)} shares`
    );

    if (isOpen) {
      console.info(
        `Still open on ${lastSession}: marked at the close of ${formatPrice(exitPrice)} for an unrealized profit of ${formatDollars(lot.netProfit)} after ${formatDollars(lot.interest)} in accrued interest\n`
      );
    } else {
      console.info(
        `Exited at ${formatTime(lot.exitTime)} (${formatNewYorkTime(lot.exitTime)}) from ${formatPrice(lot.entryPrice)} to ${formatPrice(exitPrice)} for a profit of ${formatDollars(lot.netProfit)} after ${formatDollars(lot.interest)} in interest`
      );
      console.info(
        `Exit reason: ${lot.exitReason}; exit price: ${lot.exitExecution}, stop at ${formatPrice(lot.exitStopPrice)}`
      );
      console.info(`Held for ${monthsHeld.toFixed(1)} months\n`);
    }
  }

  for (const signal of result.signals.filter((candidate) => candidate.outcome === 'declined')) {
    console.info(
      `${owners[signal.strategy]} standalone fill at ${formatNewYorkTime(signal.decisionTime)} (setup ${signal.setupId}, ${signal.setupKind}) declined: ${signal.reason}; the holder's net at the decision was ${formatDollars(signal.otherLotProfit)} (paper trade, excluded from P&L)`
    );
  }

  console.info(
    `\nSymbol: ${symbol}, from ${ds.dates[0]} to ${lastSession}; strategies eligible from ${ds.dates[eligibilityIndex]}`
  );
  console.info(
    `Strategy: ${config.label}; data file: data/VGT/VGT-2016-2025-1-minute.csv (sha256 ${data.hashes.vgtMinute.slice(0, 16)}…)`
  );
  console.info(
    'Execution: one-minute bars; each strategy runs its own paper book; a standalone fill executes only when the shared $100,000 allocation is free (first signal wins, D1 on a tie) and exits at its own standalone exit; intraday stops filled at the stop price'
  );
  console.info(
    `Closed trades: ${closed.length}${open ? ', plus 1 still open' : ''} (D1 ${byOwner('d1').length}, swing-low ${byOwner('swing').length})`
  );
  console.info(`Realized profit: ${formatDollars(realizedProfit)}`);
  console.info(`Unrealized profit on the open position: ${formatDollars(unrealizedProfit)}`);
  console.info(`Total net profit: ${formatDollars(realizedProfit + unrealizedProfit)}`);
  console.info(
    `Margin interest: ${formatDollars(closedInterest + accruedInterest)} (${formatDollars(closedInterest)} on closed trades, ${formatDollars(accruedInterest)} accrued on the open position)`
  );
  console.info(`Wins / losses: ${wins} / ${losses}`);
  console.info(
    `Exposure: ${formatPercent(exposure)} of the ${eligibleSessions} eligible sessions held a position at the close`
  );
  console.info(
    `Maximum drawdown (daily mark-to-market): ${formatDollars(result.strategyDailyDrawdown.maximum)}, from ${formatTime(result.strategyDailyDrawdown.peakTime).slice(0, 10)} to ${formatTime(result.strategyDailyDrawdown.troughTime).slice(0, 10)}`
  );
  console.info(
    `Maximum drawdown (minute-sampled mark-to-market): ${formatDollars(result.strategyMinuteDrawdown.maximum)}, from ${formatNewYorkTime(result.strategyMinuteDrawdown.peakTime)} to ${formatNewYorkTime(result.strategyMinuteDrawdown.troughTime)}`
  );
  console.info(
    `Maximum drawdown as a capital-allocation reference: ${formatPercent(result.strategyDailyDrawdown.maximum / investmentAmount)} of the ${formatDollars(investmentAmount)} shared allocation`
  );
  console.info(
    `Standalone fills offered: ${signalCounts.granted} executed, ${signalCounts.declined} declined while the allocation was occupied (paper trades)`
  );

  for (const key of keys) {
    const p = strategies[key];

    console.info(
      key === 'swing'
        ? `Swing-low: K ${p.swingLookback} sessions, rebound ${formatPercent(p.trailingBuyPercentage)}, Z ${formatPercent(p.swingProximity)}, stop ${formatPercent(p.trailingStopPercentage)}, hold ${p.maximumHoldDays} days, buffer ${formatPercent(p.intradayLossBuffer)}`
        : `D1: X ${formatPercent(p.targetPercentChange)}, Y ${formatPercent(p.trailingBuyPercentage)}, stop ${formatPercent(p.trailingStopPercentage)}, hold ${p.maximumHoldDays} days, L ${p.tickWindowSize} sessions, buffer ${formatPercent(p.intradayLossBuffer)}, P ${formatPercent(p.pullback)}, W ${p.continuationWindow} sessions`
    );
  }

  if (outDir) {
    await fs.ensureDir(outDir);

    const trades = result.lots.map((lot) => {
      const isOpen = lot.exitIndex < 0;
      const excursion = adverseExcursion(ds, lot, marginInterestRate, lastIndex);

      return {
        entry_index: lot.entryIndex,
        exit_index: isOpen ? '' : lot.exitIndex,
        entry_date: ds.dates[lot.entryIndex],
        exit_date: isOpen ? '' : ds.dates[lot.exitIndex],
        owner: owners[lot.owner],
        entry_price: lot.entryPrice,
        exit_price: isOpen ? ds.sClose[lastIndex] : lot.exitPrice,
        reason: isOpen ? 'open' : lot.exitReason,
        investment: lot.principal,
        shares: lot.shares,
        interest: isOpen ? interestOn(lot, marginInterestRate, ds.sTime[lastIndex]!) : lot.interest,
        profit: lot.netProfit,
        entry_time: formatTime(lot.entryTime),
        entry_execution: lot.entryExecution,
        decision_time: formatTime(lot.decisionTime),
        decision_price: lot.decisionPrice,
        exit_time: formatTime(lot.exitTime),
        exit_execution: lot.exitExecution,
        exit_stop_price: lot.exitStopPrice,
        setup_id: lot.setupId,
        setup_kind: lot.setupKind,
        adverse_excursion: excursion.worst
      };
    });
    const daily = result.daily.map((row) => ({
      index: row.index,
      date: row.date,
      close: row.vgtClose,
      borrowed: row.principal,
      mtm_pnl: row.strategyMark,
      realized: row.realizedStrategyProfit,
      unrealized: row.unrealizedStrategyProfit,
      owner: row.owners
    }));
    const summary = {
      symbol,
      dataFile: 'data/VGT/VGT-2016-2025-1-minute.csv',
      dataHash: data.hashes.vgtMinute,
      strategy: config.label,
      policy: config.policy,
      semantics: config.semantics,
      stopFill: config.stopFill,
      investment: investmentAmount,
      marginInterestRate,
      eligibilityDate: ds.dates[eligibilityIndex],
      firstDate: ds.dates[0],
      lastDate: lastSession,
      sessions: ds.sessionCount,
      closedTrades: closed.length,
      openAtEnd: Boolean(open),
      tradesByOwner: { D1: byOwner('d1').length, 'swing-low': byOwner('swing').length },
      wins,
      losses,
      exposure,
      realizedProfit,
      unrealizedProfit,
      netProfit: realizedProfit + unrealizedProfit,
      marginInterest: closedInterest + accruedInterest,
      maximumDrawdown: result.strategyDailyDrawdown.maximum,
      drawdownPeakDate: formatTime(result.strategyDailyDrawdown.peakTime).slice(0, 10),
      drawdownTroughDate: formatTime(result.strategyDailyDrawdown.troughTime).slice(0, 10),
      minuteMaximumDrawdown: result.strategyMinuteDrawdown.maximum,
      minuteDrawdownPeakTime: formatTime(result.strategyMinuteDrawdown.peakTime),
      minuteDrawdownTroughTime: formatTime(result.strategyMinuteDrawdown.troughTime),
      standaloneFillsExecuted: signalCounts.granted,
      standaloneFillsDeclined: signalCounts.declined,
      parameters: Object.fromEntries(keys.map((key) => [key, strategies[key]]))
    };

    await fs.writeFile(path.join(outDir, 'trades.csv'), toCsv(trades));
    await fs.writeFile(path.join(outDir, 'daily.csv'), toCsv(daily));
    await fs.writeFile(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    console.info(`\nWrote ${path.join(outDir, 'trades.csv')}, daily.csv and summary.json`);
  }

  return result;
};

export default async (
  symbol = 'VGT',
  startDate?: string,
  endDate?: string,
  dataFile?: string,
  outDir?: string,
  ...flags: string[]
) => {
  const optional = (value?: string) => (value === undefined || value === '-' || value === '' ? undefined : value);

  if (optional(startDate) || optional(endDate) || optional(dataFile)) {
    throw new Error('This backtest always runs the whole research dataset; pass - for startDate, endDate and dataFile');
  }

  await runP2s({ symbol, outDir: optional(outDir), d1Only: flags.includes('--d1-only') || outDir === '--d1-only' });
};
