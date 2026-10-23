// The acceptance gates of PROTOCOL.md §11: the seven fixed-$100,000 phenotypes through the shadow books and the
// fixed ledger against their research artifacts, trade by trade, and the $300,000 portfolio scenarios A and B
// against the earlier engine (src/shared-margin-portfolio), run in the same process, at every close and every lot.
import fs from 'fs-extra';
import { parse } from 'csv-parse/sync';
import { formatNewYorkTime } from '#lib';
import { loadProgramData } from '../shared-margin-portfolio/data.ts';
import { runScenario } from '../shared-margin-portfolio/engine.ts';
import { catalogue } from '../shared-margin-portfolio/scenarios.ts';
import {
  type Combination,
  type PhenotypeName,
  type Reference,
  type Sym,
  combinationOf,
  formatDate,
  protocol,
  referenceDir,
  references
} from './context.ts';
import { type Universe, loadUniverse } from './data.ts';
import { type RunConfig, type RunResult, baseRunConfig, runAllocator } from './engine.ts';
import { resolveCombination } from './phenotypes.ts';

export const tolerance = 1e-6;

const near = (a: number, b: number, relative = tolerance) =>
  Math.abs(a - b) <= relative * Math.max(1, Math.abs(a), Math.abs(b));

export interface ReferenceTrade {
  kind: string;
  entryDate: string;
  entryTime: string; // New York minute
  entryPrice: number;
  exitDate: string;
  exitTime: string;
  exitPrice: number;
  reason: string;
  interest: number;
  profit: number;
}

export interface ReferenceRun {
  net: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  trades: ReferenceTrade[];
}

export const loadReferenceRun = async (symbol: Sym, phenotype: PhenotypeName): Promise<ReferenceRun> => {
  const dir = referenceDir(symbol, phenotype);

  if (symbol === 'VGT') {
    const [d1] = await fs.readJson(`${dir}/baseline.json`);

    if (d1.label !== 'D1') {
      throw new Error(`${dir}/baseline.json: the first run is ${d1.label}, not D1`);
    }

    return {
      net: d1.metrics.net,
      minuteDrawdown: d1.metrics.minuteDrawdown,
      dailyDrawdown: d1.metrics.dailyDrawdown,
      trades: d1.trades.map((trade: Record<string, unknown>) => ({
        kind: trade.kind,
        entryDate: trade.entryDate,
        entryTime: trade.entryTime,
        entryPrice: trade.entryPrice,
        exitDate: trade.exitDate ?? '',
        exitTime: trade.exitTime ?? '',
        exitPrice: trade.exitPrice,
        reason: trade.isOpen ? 'open' : trade.reason,
        interest: trade.interest,
        profit: trade.profit
      }))
    };
  }

  const summary = await fs.readJson(`${dir}/summary.json`);
  const rows: Record<string, string>[] = parse(await fs.readFile(`${dir}/trades.csv`), { columns: true });

  return {
    net: summary.metrics.net,
    minuteDrawdown: summary.metrics.minuteDrawdown,
    dailyDrawdown: summary.metrics.dailyDrawdown,
    trades: rows.map((row) => ({
      kind: row.kind!,
      entryDate: row.entry_date!,
      entryTime: row.entry_time_ny!,
      entryPrice: Number(row.entry_price_observed),
      exitDate: row.is_open === 'true' ? '' : row.exit_date!,
      exitTime: row.is_open === 'true' ? '' : row.exit_time_ny!,
      exitPrice: Number(row.exit_price_observed),
      reason: row.is_open === 'true' ? 'open' : row.reason!,
      interest: Number(row.interest),
      profit: Number(row.net_profit)
    }))
  };
};

// One symbol's fixed-$100,000 standalone run through the allocator (one book, one pool, nothing to refuse).
export const fixedControlConfig = async (
  symbol: Sym,
  phenotype: PhenotypeName,
  overrides: Partial<RunConfig> = {}
): Promise<RunConfig> => {
  const combination: Combination = { ...combinationOf('all-primary'), [symbol]: phenotype };

  return baseRunConfig({
    key: `fixed-${symbol}-${phenotype}`,
    label: `${symbol} ${phenotype} alone, fixed $100,000`,
    mode: 'fixed',
    combination,
    phenotypes: await resolveCombination(combination),
    symbols: [symbol],
    policy: 'shadow',
    ...overrides
  });
};

export const tradesOf = (result: RunResult): ReferenceTrade[] =>
  result.lots.map((lot) => {
    const isOpen = lot.exitIndex < 0;

    return {
      kind: lot.trade.setupKind,
      entryDate: formatDate(lot.entryTimestamp),
      entryTime: formatNewYorkTime(lot.entryTime),
      entryPrice: lot.entryPrice,
      exitDate: isOpen ? '' : result.universe.dates[lot.exitIndex]!,
      exitTime: isOpen ? '' : formatNewYorkTime(lot.exitTime),
      exitPrice: isOpen ? lot.exitRawPrice : lot.exitPrice,
      reason: isOpen ? 'open' : lot.exitReason,
      interest: lot.interest,
      profit: lot.net
    };
  });

export interface ParityOutcome {
  name: string;
  reference: string;
  end: string;
  trades: number;
  expectedTrades: number;
  net: number;
  expectedNet: number;
  minuteDrawdown: number;
  expectedMinuteDrawdown: number;
  dailyDrawdown: number;
  expectedDailyDrawdown: number;
  publishedNet: number;
  publishedMinuteDrawdown: number;
  differences: string[];
}

export const compareFixed = (result: RunResult, reference: ReferenceRun, published: Reference): ParityOutcome => {
  const actual = tradesOf(result);
  const differences: string[] = [];
  const net = result.lots.reduce((total, lot) => total + lot.net, 0);

  if (actual.length !== reference.trades.length) {
    differences.push(`trade count ${actual.length} vs ${reference.trades.length}`);
  }

  actual.forEach((trade, index) => {
    const expected = reference.trades[index];

    if (!expected) {
      return;
    }

    for (const key of ['kind', 'entryDate', 'entryTime', 'exitDate', 'exitTime', 'reason'] as const) {
      if (trade[key] !== expected[key]) {
        differences.push(`trade ${index + 1} ${key}: ${trade[key]} vs ${expected[key]}`);
      }
    }

    for (const key of ['entryPrice', 'exitPrice', 'interest', 'profit'] as const) {
      if (!near(trade[key], expected[key])) {
        differences.push(`trade ${index + 1} ${key}: ${trade[key]} vs ${expected[key]}`);
      }
    }
  });

  for (const [label, a, b] of [
    ['net', net, reference.net],
    ['minute drawdown', result.minuteDrawdown.maximum, reference.minuteDrawdown],
    ['daily drawdown', result.dailyDrawdown.maximum, reference.dailyDrawdown]
  ] as [string, number, number][]) {
    if (!near(a, b)) {
      differences.push(`${label}: ${a} vs ${b}`);
    }
  }

  for (const [label, a, b] of [
    ['published net', net, published.net],
    ['published minute drawdown', result.minuteDrawdown.maximum, published.minuteDrawdown]
  ] as [string, number, number][]) {
    if (Math.abs(a - b) > 0.005 + 1e-9) {
      differences.push(`${label}: ${a.toFixed(4)} vs ${b.toFixed(2)}`);
    }
  }

  if (actual.length !== published.entries) {
    differences.push(`published entries: ${actual.length} vs ${published.entries}`);
  }

  return {
    name: `${published.symbol} ${published.phenotype}`,
    reference: published.source,
    end: result.universe.end,
    trades: actual.length,
    expectedTrades: reference.trades.length,
    net,
    expectedNet: reference.net,
    minuteDrawdown: result.minuteDrawdown.maximum,
    expectedMinuteDrawdown: reference.minuteDrawdown,
    dailyDrawdown: result.dailyDrawdown.maximum,
    expectedDailyDrawdown: reference.dailyDrawdown,
    publishedNet: published.net,
    publishedMinuteDrawdown: published.minuteDrawdown,
    differences
  };
};

// The seven standalone controls (PROTOCOL.md §11.1).
export const runFixedParity = async () => {
  const outcomes: ParityOutcome[] = [];
  const results: RunResult[] = [];

  for (const published of references) {
    const universe = await loadUniverse({ members: [published.symbol], end: published.end });
    const result = runAllocator(universe, await fixedControlConfig(published.symbol, published.phenotype));
    const outcome = compareFixed(result, await loadReferenceRun(published.symbol, published.phenotype), published);

    outcomes.push(outcome);
    results.push(result);
  }

  return { outcomes, results };
};

// ----- portfolio A and B against the earlier engine -----

export interface PortfolioParity {
  scenario: 'A' | 'B';
  sessions: number;
  endEquity: number;
  oldEndEquity: number;
  dailyDrawdown: number;
  dailyDrawdownPercent: number;
  oldDailyDrawdown: number;
  oldDailyDrawdownPercent: number;
  minuteDrawdown: number;
  oldMinuteDrawdown: number;
  lots: number;
  oldLots: number;
  maxDailyEquityDifference: number;
  maxLotNetDifference: number;
  differences: string[];
}

export const portfolioConfig = async (
  key: string,
  label: string,
  overrides: Partial<RunConfig> = {}
): Promise<RunConfig> => {
  const combination = combinationOf('all-primary');

  return baseRunConfig({
    key,
    label,
    mode: 'portfolio',
    combination,
    phenotypes: await resolveCombination(combination),
    ...overrides
  });
};

export const scenarioAConfig = () => portfolioConfig('A', 'A — 60/40 VOOG/VGT buy and hold', { symbols: [] });
export const scenarioBConfig = (overrides: Partial<RunConfig> = {}) =>
  portfolioConfig('B', 'B — VGT D1 alone, 20% of equity', { symbols: ['VGT'], ...overrides });

export const runPortfolioParity = async (universe: Universe) => {
  const oldData = await loadProgramData();
  const outcomes: PortfolioParity[] = [];
  const results: RunResult[] = [];

  for (const scenario of ['A', 'B'] as const) {
    const oldResult = runScenario(oldData, catalogue[scenario]!());
    const result = runAllocator(universe, scenario === 'A' ? await scenarioAConfig() : await scenarioBConfig());
    const differences: string[] = [];
    let maxDaily = 0;
    let maxLot = 0;

    // The old daily rows start with the 2016-01-04 row; ours start at session 1.
    const oldDaily = oldResult.daily.slice(1);

    if (oldDaily.length !== result.daily.length) {
      differences.push(`daily rows ${result.daily.length} vs ${oldDaily.length}`);
    }

    result.daily.forEach((row, index) => {
      const old = oldDaily[index];

      if (!old) {
        return;
      }

      if (old.date !== row.date) {
        differences.push(`daily row ${index}: ${row.date} vs ${old.date}`);
      }

      maxDaily = Math.max(maxDaily, Math.abs(row.equity - old.equity));
    });

    if (result.lots.length !== oldResult.lots.length) {
      differences.push(`lots ${result.lots.length} vs ${oldResult.lots.length}`);
    }

    result.lots.forEach((lot, index) => {
      const old = oldResult.lots[index];

      if (!old) {
        return;
      }

      if (lot.entryIndex !== old.entryIndex || lot.entryBar !== old.entryBar || lot.exitIndex !== old.exitIndex) {
        differences.push(`lot ${index + 1}: sessions/bars differ`);
      }

      if (!near(lot.originalPrincipal, old.principal, 1e-9) || !near(lot.shares, old.shares, 1e-9)) {
        differences.push(`lot ${index + 1}: principal ${lot.originalPrincipal} vs ${old.principal}`);
      }

      maxLot = Math.max(maxLot, Math.abs(lot.net - old.netProfit));
    });

    if (maxDaily > 0.01) {
      differences.push(`largest daily equity difference ${maxDaily}`);
    }

    if (maxLot > 0.01) {
      differences.push(`largest lot net difference ${maxLot}`);
    }

    const endEquity = result.daily.at(-1)!.equity;
    const oldEndEquity = oldResult.daily.at(-1)!.equity;

    if (!near(result.dailyDrawdown.maximum, oldResult.dailyDrawdown.maximum, 1e-9)) {
      differences.push(`daily drawdown ${result.dailyDrawdown.maximum} vs ${oldResult.dailyDrawdown.maximum}`);
    }

    if (!near(result.minuteDrawdown.maximum, oldResult.minuteDrawdown.maximum, 1e-9)) {
      differences.push(`minute drawdown ${result.minuteDrawdown.maximum} vs ${oldResult.minuteDrawdown.maximum}`);
    }

    outcomes.push({
      scenario,
      sessions: result.daily.length + 1,
      endEquity,
      oldEndEquity,
      dailyDrawdown: result.dailyDrawdown.maximum,
      dailyDrawdownPercent: result.dailyDrawdown.maximumPercent,
      oldDailyDrawdown: oldResult.dailyDrawdown.maximum,
      oldDailyDrawdownPercent: oldResult.dailyDrawdown.maximumPercent,
      minuteDrawdown: result.minuteDrawdown.maximum,
      oldMinuteDrawdown: oldResult.minuteDrawdown.maximum,
      lots: result.lots.length,
      oldLots: oldResult.lots.length,
      maxDailyEquityDifference: maxDaily,
      maxLotNetDifference: maxLot,
      differences
    });
    results.push(result);
  }

  return { outcomes, results };
};

export const publishedPortfolio = {
  A: { endEquity: 1784588, dailyDrawdownPercent: 0.339 },
  B: { endEquity: 2346272, dailyDrawdownPercent: 0.253 }
};

export const horizonEnd = protocol.commonEnd;
