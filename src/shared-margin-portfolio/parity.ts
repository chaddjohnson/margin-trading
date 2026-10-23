// Regression of the engine's standalone, fixed-$100,000 runs against the strategy files' own outputs (their
// trades.csv and summary.json, written by `npm run app -- <file> VGT - - - <dir>`) and against the D1-refinement
// engine: every trade's entry/exit session and minute, prices, reason, interest and profit, the totals and both
// drawdowns. Nothing is tolerated beyond floating-point noise.
import path from 'node:path';
import fs from 'fs-extra';
import { replay } from '../trailing-buy-variants/accounting.ts';
import { ReferenceLowCache, hasSwingPath, simulate } from '../d1-refinement/engine.ts';
import { ReferenceHighCache } from '../four-family/data.ts';
import { familyOf, toParams, type IntParams } from '../d1-refinement/families.ts';
import type { ProgramData } from './data.ts';
import { type ScenarioResult, defaultConfig, runScenario } from './engine.ts';
import { type StrategyKey, strategies } from './strategy.ts';

export const tolerance = 1e-6;

const nearly = (a: number, b: number) => Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b));

export interface ParityOutcome {
  name: string;
  trades: number;
  net: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  differences: string[];
}

// The standalone fixed-$100,000 run of one strategy through this program's engine, armed from `armStart`.
export const standalone = (
  data: ProgramData,
  key: StrategyKey,
  armStart: number,
  overrides: Record<string, unknown> = {}
): ScenarioResult =>
  runScenario(
    data,
    defaultConfig({
      key: `standalone-${key}`,
      label: `${strategies[key].label} standalone, fixed $100,000`,
      strategies: [key],
      policy: 'single',
      fixedPrincipal: 100000,
      corePolicy: 'none',
      eligibilityIndex: armStart,
      ...overrides
    })
  );

export const summarize = (result: ScenarioResult) => {
  const closed = result.lots.filter((lot) => lot.exitIndex >= 0);
  const open = result.lots.filter((lot) => lot.exitIndex < 0);

  return {
    trades: result.lots.length,
    closed: closed.length,
    open: open.length,
    realized: closed.reduce((total, lot) => total + lot.netProfit, 0),
    unrealized: open.reduce((total, lot) => total + lot.netProfit, 0),
    net: result.lots.reduce((total, lot) => total + lot.netProfit, 0),
    interest: result.lots.reduce((total, lot) => total + lot.interest, 0),
    minuteDrawdown: result.strategyMinuteDrawdown.maximum,
    dailyDrawdown: result.strategyDailyDrawdown.maximum
  };
};

// Against a strategy file's output directory.
export const compareWithFile = async (
  data: ProgramData,
  key: StrategyKey,
  fileDir: string,
  armStart: number
): Promise<ParityOutcome> => {
  const { ds } = data;
  const result = standalone(data, key, armStart);
  const summary = JSON.parse(await fs.readFile(path.join(fileDir, 'summary.json'), 'utf8')) as Record<string, number>;
  const tradeLines = (await fs.readFile(path.join(fileDir, 'trades.csv'), 'utf8')).trim().split('\n');
  const header = tradeLines[0]!.split(',');
  const column = (name: string) => header.indexOf(name);
  const fileTrades = tradeLines.slice(1).map((line) => line.split(','));
  const differences: string[] = [];
  const check = (label: string, a: number | string, b: number | string) => {
    const same = typeof a === 'number' && typeof b === 'number' ? nearly(a, b) : String(a) === String(b);

    if (!same) {
      differences.push(`${label}: engine ${String(a)} vs file ${String(b)}`);
    }
  };

  check('trade count', result.lots.length, fileTrades.length);

  result.lots.forEach((lot, index) => {
    const row = fileTrades[index];

    if (!row) {
      return;
    }

    const field = (name: string) => row[column(name)] ?? '';
    const n = (name: string) => Number(field(name));

    check(`trade ${index + 1} entry session`, ds.dates[lot.entryIndex]!, field('entry_date'));
    check(`trade ${index + 1} entry time`, new Date(lot.entryTime * 1000).toISOString(), field('entry_time'));
    check(`trade ${index + 1} entry price`, lot.entryPrice, n('entry_price'));
    check(`trade ${index + 1} entry execution`, lot.entryExecution, field('entry_execution'));
    check(`trade ${index + 1} shares`, lot.shares, n('shares'));
    check(`trade ${index + 1} decision time`, new Date(lot.decisionTime * 1000).toISOString(), field('decision_time'));

    if (column('setup_kind') >= 0 && field('setup_kind')) {
      check(`trade ${index + 1} kind`, lot.setupKind, field('setup_kind'));
    }

    if (lot.exitIndex >= 0) {
      check(`trade ${index + 1} exit session`, ds.dates[lot.exitIndex]!, field('exit_date'));
      check(`trade ${index + 1} exit time`, new Date(lot.exitTime * 1000).toISOString(), field('exit_time'));
      check(`trade ${index + 1} exit price`, lot.exitPrice, n('exit_price'));
      check(`trade ${index + 1} reason`, lot.exitReason, field('reason'));
      check(`trade ${index + 1} interest`, lot.interest, n('interest'));
      check(`trade ${index + 1} profit`, lot.netProfit, n('profit'));
      check(`trade ${index + 1} exit execution`, lot.exitExecution, field('exit_execution'));
    } else {
      check(`trade ${index + 1} open`, 'open', field('reason'));
      check(`trade ${index + 1} unrealized`, lot.netProfit, n('profit'));
    }
  });

  const totals = summarize(result);

  check('net profit', totals.net, summary.netProfit!);
  check('realized profit', totals.realized, summary.realizedProfit!);
  check('unrealized profit', totals.unrealized, summary.unrealizedProfit!);
  check('margin interest', totals.interest, summary.marginInterest!);
  check('daily drawdown', totals.dailyDrawdown, summary.maximumDrawdown!);
  check('minute drawdown', totals.minuteDrawdown, summary.minuteMaximumDrawdown!);

  // Every daily mark.
  const dailyText = await fs.readFile(path.join(fileDir, 'daily.csv'), 'utf8');
  const marks = dailyText
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => Number(line.split(',')[4]));
  let markDifferences = 0;

  marks.forEach((mark, index) => {
    const row = result.daily[index];

    if (!row || !nearly(mark, row.strategyMark)) {
      markDifferences++;
    }
  });

  if (marks.length !== result.daily.length) {
    differences.push(`daily mark count: engine ${result.daily.length} vs file ${marks.length}`);
  }

  if (markDifferences > 0) {
    differences.push(`${markDifferences} daily marks differ`);
  }

  return {
    name: `${key} vs file output ${fileDir}`,
    trades: result.lots.length,
    net: totals.net,
    minuteDrawdown: totals.minuteDrawdown,
    dailyDrawdown: totals.dailyDrawdown,
    differences
  };
};

const familyKeyOf: Record<StrategyKey, string> = {
  d1: 'd1',
  'd1.breakeven': 'd1.breakeven',
  'd1.p86': 'd1',
  swing: 'swing',
  set2: 'base'
};

// The D1-refinement engine's integer parameters for a strategy.
export const refinementParams = (key: StrategyKey): IntParams => {
  const p = strategies[key];
  const params: IntParams = {
    trailingStopPercentage: Math.round(p.trailingStopPercentage * 1000),
    maximumHoldDays: p.maximumHoldDays,
    intradayLossBuffer: Math.round(p.intradayLossBuffer * 1000)
  };

  if (p.entryMode === 'deep') {
    params.targetPercentChange = Math.round(p.targetPercentChange * 1000);
    params.trailingBuyPercentage = Math.round(p.trailingBuyPercentage * 1000);
    params.tickWindowSize = p.tickWindowSize;

    if (p.postExit) {
      params.pullback = Math.round(p.pullback * 1000);
      params.continuationWindow = p.continuationWindow;
    }
  } else {
    params.swingLookback = p.swingLookback;
    params.swingRebound = Math.round(p.trailingBuyPercentage * 1000);
    params.swingProximity = Math.round(p.swingProximity * 1000);
  }

  return params;
};

// Against the D1-refinement engine on the same arm start, rate and stop fill.
export const compareWithRefinementEngine = (
  data: ProgramData,
  key: StrategyKey,
  armStart: number,
  rate = 0.11,
  stopFill: 'stop' | 'next-open' = 'stop'
): ParityOutcome => {
  const { ds } = data;
  const family = familyOf(familyKeyOf[key]);
  const params = toParams(family, refinementParams(key), false);
  const highs = new ReferenceHighCache(ds).get(params.tickWindowSize);
  const lows = hasSwingPath(family.architecture.entryMode)
    ? new ReferenceLowCache(ds).get(params.swingLookback)
    : undefined;
  const engine = simulate(ds, highs, lows, family.architecture, params, {
    stopFill,
    marginInterestRate: rate,
    investment: 100000,
    firstIndex: 0,
    armStart,
    endIndex: ds.sessionCount - 1
  });
  const accounting = replay(ds, engine.trades, {
    firstIndex: 0,
    endIndex: ds.sessionCount - 1,
    marginInterestRate: rate,
    dailyMarks: true
  });
  const result = standalone(data, key, armStart, { rate, stopFill });
  const differences: string[] = [];
  const check = (label: string, a: number | string, b: number | string) => {
    const same = typeof a === 'number' && typeof b === 'number' ? nearly(a, b) : String(a) === String(b);

    if (!same) {
      differences.push(`${label}: engine ${String(a)} vs refinement ${String(b)}`);
    }
  };

  check('trade count', result.lots.length, engine.trades.length);

  result.lots.forEach((lot, index) => {
    const trade = engine.trades[index];
    const outcome = accounting.outcomes[index];

    if (!trade || !outcome) {
      return;
    }

    check(`trade ${index + 1} entry session`, lot.entryIndex, trade.entryIndex);
    check(`trade ${index + 1} entry bar`, lot.entryBar, trade.entryBar);
    check(`trade ${index + 1} entry price`, lot.entryPrice, trade.entryPrice);
    check(`trade ${index + 1} decision time`, lot.decisionTime, trade.decisionTime);
    check(`trade ${index + 1} kind`, lot.setupKind, trade.kind);
    check(`trade ${index + 1} open`, lot.exitIndex < 0 ? 'open' : 'closed', trade.exitIndex < 0 ? 'open' : 'closed');

    if (lot.exitIndex >= 0) {
      check(`trade ${index + 1} exit session`, lot.exitIndex, trade.exitIndex);
      check(`trade ${index + 1} exit bar`, lot.exitBar, trade.exitBar);
      check(`trade ${index + 1} exit price`, lot.exitPrice, trade.exitPrice);
      check(`trade ${index + 1} reason`, lot.exitReason, trade.reason);
      check(`trade ${index + 1} profit`, lot.netProfit, outcome.profit);
      check(`trade ${index + 1} interest`, lot.interest, outcome.interest);
    }
  });

  const totals = summarize(result);

  check('net profit', totals.net, accounting.netProfit);
  check('daily drawdown', totals.dailyDrawdown, accounting.dailyDrawdown.maximum);
  check('minute drawdown', totals.minuteDrawdown, accounting.minuteDrawdown.maximum);

  let markDifferences = 0;

  accounting.dailyMarks!.forEach((mark, index) => {
    if (!nearly(mark, result.daily[index]!.strategyMark)) {
      markDifferences++;
    }
  });

  if (markDifferences > 0) {
    differences.push(`${markDifferences} daily marks differ`);
  }

  return {
    name: `${key} vs D1-refinement engine (arm ${armStart}, ${rate}, ${stopFill})`,
    trades: result.lots.length,
    net: totals.net,
    minuteDrawdown: totals.minuteDrawdown,
    dailyDrawdown: totals.dailyDrawdown,
    differences
  };
};
