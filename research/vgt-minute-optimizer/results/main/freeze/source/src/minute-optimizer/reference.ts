// Runs the literal working copy (src/app/allIn-minute-optimizable.ts) and reduces its result to the same
// comparable record as the fast engine, so the two can be checked trade for trade.
import type { MarketSession } from '#types';
import {
  type AllInResult,
  type MinuteParams,
  incumbentParams,
  runAllInMinute
} from '../app/allIn-minute-optimizable.ts';
import { Execution, executionLabels } from './data.ts';
import type { EngineResult, StopFill } from './engine.ts';

export interface ComparableTrade {
  entryDate: string;
  exitDate: string; // '' while open
  decisionPrice: number;
  referenceHigh: number;
  entryPrice: number;
  entryBar: number;
  entryExecution: string;
  exitPrice: number;
  exitBar: number;
  exitExecution: string;
  exitStopPrice: number;
  maximumHoldDue: boolean;
  reason: string;
  shares: number;
  interest: number;
  profit: number;
}

export interface Comparable {
  firstDate: string;
  lastDate: string;
  sessions: number;
  trades: ComparableTrade[];
  realizedProfit: number;
  unrealizedProfit: number;
  netProfit: number;
  interest: number;
  maximumDrawdown: number;
  minuteMaximumDrawdown: number;
  entriesWithoutTrade: number;
  exposureSessions: number;
  restrictions: number;
  lowerPriceReentries: number;
  recoveryResets: number;
  lossesNotRestricted: number;
  levels: { bps: number; costs: number; netProfit: number; maximumDrawdown: number; minuteMaximumDrawdown: number }[];
  years: { year: number; net: number[] }[];
}

export interface ReferenceRun {
  params?: MinuteParams;
  startDate?: string;
  endDate?: string;
  warmup?: boolean;
  stopFill?: StopFill;
  costBps?: number[];
  outDir?: string;
  dataFile?: string; // only labels the outputs; the sessions are passed in
  log?: (line: string) => void;
}

export const runReference = async (allSessions: MarketSession[], run: ReferenceRun) =>
  runAllInMinute({
    allSessions,
    params: run.params ?? incumbentParams,
    startDate: run.startDate,
    endDate: run.endDate,
    warmup: run.warmup,
    stopFill: run.stopFill,
    costBps: run.costBps ?? [],
    outDir: run.outDir,
    dataFile: run.dataFile,
    log: run.log ?? (() => {})
  });

export const comparableFromReference = (result: AllInResult, costBps: number[]): Comparable => {
  const { sessions, positions, summary } = result;
  const lastSession = sessions.at(-1)!;
  const trades = positions.map((position): ComparableTrade => {
    const entryFill = result.entryFills.get(position)!;
    const exitFill = result.exitFills.get(position);
    const isOpen = position.isOpen;

    return {
      entryDate: sessions[result.entryIndexes.get(position)!]!.date,
      exitDate: isOpen ? '' : sessions[result.exitIndexes.get(position)!]!.date,
      decisionPrice: entryFill.decisionPrice,
      referenceHigh: NaN,
      entryPrice: position.entryPrice,
      entryBar: entryFill.barIndex,
      entryExecution: entryFill.execution,
      exitPrice: isOpen ? lastSession.close : position.exitPrice!,
      exitBar: exitFill?.barIndex ?? -1,
      exitExecution: exitFill?.execution ?? '',
      exitStopPrice: exitFill?.stopPrice ?? NaN,
      maximumHoldDue: exitFill?.isMaximumHoldDue ?? false,
      reason: isOpen ? 'open' : exitFill!.reason,
      shares: position.shares,
      interest: isOpen ? NaN : position.interest!,
      profit: isOpen ? (summary.unrealizedProfit as number) : position.profit!
    };
  });
  let previous: number[] | undefined;
  const years = result.yearMarks.map((mark) => {
    const marks = [mark.mark, ...mark.costMarks];
    const net = marks.map((value, level) => value - (previous ? previous[level]! : 0));

    previous = marks;

    return { year: mark.year, net };
  });

  return {
    firstDate: summary.firstDate as string,
    lastDate: summary.lastDate as string,
    sessions: summary.sessions as number,
    trades,
    realizedProfit: summary.realizedProfit as number,
    unrealizedProfit: summary.unrealizedProfit as number,
    netProfit: summary.netProfit as number,
    interest: summary.marginInterest as number,
    maximumDrawdown: summary.maximumDrawdown as number,
    minuteMaximumDrawdown: summary.minuteMaximumDrawdown as number,
    entriesWithoutTrade: summary.entriesWithoutTrade as number,
    exposureSessions: result.exposureSessions,
    restrictions: summary.restrictions as number,
    lowerPriceReentries: summary.lowerPriceReentries as number,
    recoveryResets: summary.recoveryResets as number,
    lossesNotRestricted: summary.lossesNotRestricted as number,
    levels: [
      {
        bps: 0,
        costs: 0,
        netProfit: summary.netProfit as number,
        maximumDrawdown: summary.maximumDrawdown as number,
        minuteMaximumDrawdown: summary.minuteMaximumDrawdown as number
      },
      ...result.costResults.filter((level) => costBps.includes(level.bps))
    ],
    years
  };
};

export const comparableFromEngine = (result: EngineResult, dates: string[], startIndex: number): Comparable => ({
  firstDate: dates[startIndex] ?? '',
  lastDate: dates[startIndex + result.sessions - 1] ?? '',
  sessions: result.sessions,
  trades: result.trades.map((trade) => ({
    entryDate: dates[trade.entryIndex]!,
    exitDate: trade.exitIndex < 0 ? '' : dates[trade.exitIndex]!,
    decisionPrice: trade.decisionPrice,
    referenceHigh: NaN,
    entryPrice: trade.entryPrice,
    entryBar: trade.entryBar,
    entryExecution: executionLabels[trade.entryExecution]!,
    exitPrice: trade.exitPrice,
    exitBar: trade.exitBar,
    exitExecution: trade.exitExecution === Execution.none ? '' : executionLabels[trade.exitExecution]!,
    exitStopPrice: trade.exitStopPrice,
    maximumHoldDue: trade.maximumHoldDue,
    reason: trade.reason,
    shares: trade.shares,
    interest: trade.reason === 'open' ? NaN : trade.interest,
    profit: trade.profit
  })),
  realizedProfit: result.realizedProfit,
  unrealizedProfit: result.unrealizedProfit,
  netProfit: result.netProfit,
  interest: result.closedInterest + result.accruedInterest,
  maximumDrawdown: result.maximumDrawdown,
  minuteMaximumDrawdown: result.minuteMaximumDrawdown,
  entriesWithoutTrade: result.entriesWithoutTrade,
  exposureSessions: result.exposureSessions,
  restrictions: result.restrictions,
  lowerPriceReentries: result.lowerPriceReentries,
  recoveryResets: result.recoveryResets,
  lossesNotRestricted: result.lossesNotRestricted,
  levels: result.levels.map((level) => ({ ...level })),
  years: result.years.map((year) => ({ year: year.year, net: [...year.net] }))
});

// Field-by-field comparison. Everything must be identical (Object.is, so NaN equals NaN) except the
// minute-sampled drawdowns, which the engine computes in closed form: those may differ by `tolerance`.
export const compareComparables = (expected: Comparable, actual: Comparable, tolerance = 1e-6) => {
  const differences: string[] = [];
  const exact = (label: string, a: unknown, b: unknown) => {
    if (!Object.is(a, b)) {
      differences.push(`${label}: reference ${String(a)} vs engine ${String(b)}`);
    }
  };
  const close = (label: string, a: number, b: number) => {
    if (!(Math.abs(a - b) <= tolerance)) {
      differences.push(`${label}: reference ${a} vs engine ${b} (beyond ${tolerance})`);
    }
  };

  for (const key of [
    'firstDate',
    'lastDate',
    'sessions',
    'realizedProfit',
    'unrealizedProfit',
    'netProfit',
    'interest',
    'maximumDrawdown',
    'entriesWithoutTrade',
    'exposureSessions',
    'restrictions',
    'lowerPriceReentries',
    'recoveryResets',
    'lossesNotRestricted'
  ] as const) {
    exact(key, expected[key], actual[key]);
  }

  close('minuteMaximumDrawdown', expected.minuteMaximumDrawdown, actual.minuteMaximumDrawdown);
  exact('trades.length', expected.trades.length, actual.trades.length);
  expected.trades.forEach((trade, index) => {
    const other = actual.trades[index];

    if (!other) {
      return;
    }

    for (const key of Object.keys(trade) as (keyof ComparableTrade)[]) {
      exact(`trades[${index}].${key}`, trade[key], other[key]);
    }
  });
  exact('levels.length', expected.levels.length, actual.levels.length);
  expected.levels.forEach((level, index) => {
    const other = actual.levels[index];

    if (!other) {
      return;
    }

    exact(`levels[${index}].bps`, level.bps, other.bps);
    exact(`levels[${index}].costs`, level.costs, other.costs);
    exact(`levels[${index}].netProfit`, level.netProfit, other.netProfit);
    exact(`levels[${index}].maximumDrawdown`, level.maximumDrawdown, other.maximumDrawdown);
    close(`levels[${index}].minuteMaximumDrawdown`, level.minuteMaximumDrawdown, other.minuteMaximumDrawdown);
  });
  exact('years.length', expected.years.length, actual.years.length);
  expected.years.forEach((year, index) => {
    const other = actual.years[index];

    if (!other) {
      return;
    }

    exact(`years[${index}].year`, year.year, other.year);
    year.net.forEach((value, level) => exact(`years[${index}].net[${level}]`, value, other.net[level]));
  });

  return differences;
};
