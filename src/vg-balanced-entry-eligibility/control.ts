// The control: Study 8 rank #2 VG Balanced (runner alias s8-vg-balanced, configuration S8-VG-F24-3), resolved through
// the Study 8 runner's resolver (which checks the sealed F24 records and the research configuration), and the run
// configuration that src/pools/run.ts runPoolOn builds for it, so the control engine and the adapter receive the same
// object. The variant configurations only add `eligibility` (and report-only fields) to it.
import type { LoadedPool } from '../pools/load.ts';
import { type PoolRunOptions, runPoolOn } from '../pools/run.ts';
import { type BookPhenotype, baseNRunConfig } from '../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { resolveAlias } from '../study8-runners/resolve.ts';
import { chronology, controlAlias, controlId, costBps, notional, symbols } from './context.ts';
import type { VRunConfig } from './engine.ts';

// The brief's table (PROTOCOL.md §2), in the phenotype grid's units (tenths of a percentage point, days, sessions).
export const expectedBooks = {
  VGT: {
    candidateId: 'd1-bd80e32ee4',
    grid: {
      targetPercentChange: 235,
      trailingBuyPercentage: 9,
      trailingStopPercentage: 74,
      maximumHoldDays: 15,
      tickWindowSize: 78,
      intradayLossBuffer: 44,
      pullback: 110,
      continuationWindow: 55
    }
  },
  GDX: {
    candidateId: 'd1-7b99d2833d',
    grid: {
      targetPercentChange: 276,
      trailingBuyPercentage: 1,
      trailingStopPercentage: 57,
      maximumHoldDays: 12,
      tickWindowSize: 243,
      intradayLossBuffer: 29,
      pullback: 152,
      continuationWindow: 12
    }
  }
} as const;

export const resolveControl = async () => {
  const resolved = await resolveAlias(controlAlias);
  const { pool } = resolved;
  const { config } = pool;

  if (config.id !== controlId) throw new Error(`${controlAlias} resolved to ${config.id}, not ${controlId}`);

  const books = config.books.map((book) => book.symbol);

  if (JSON.stringify(books) !== JSON.stringify(symbols)) throw new Error(`control books ${books.join(',')}`);

  for (const book of config.books) {
    const expected = expectedBooks[book.symbol as keyof typeof expectedBooks];

    if (book.candidateId !== expected.candidateId) throw new Error(`${book.symbol}: candidate ${book.candidateId}`);

    for (const [key, value] of Object.entries(expected.grid)) {
      if ((book.grid as Record<string, number>)[key] !== value)
        throw new Error(`${book.symbol}: ${key} ${(book.grid as Record<string, number>)[key]} ≠ ${value}`);
    }
  }

  const conventions = {
    fundedSlots: config.funding.fundedSlots,
    notionalPerTrade: config.funding.notionalPerTrade,
    compounding: config.funding.compounding,
    policy: config.funding.policy,
    annualRate: config.interest.annualRate,
    method: config.interest.method,
    dayCount: config.interest.dayCount,
    bpsPerSide: config.costs.bpsPerSide,
    commission: config.costs.commission,
    stopFill: config.execution.stopFill,
    stopSlippageBps: config.execution.stopSlippageBps,
    firstEligibleDate: config.execution.firstEligibleDate
  };
  const expectedConventions = {
    fundedSlots: 1,
    notionalPerTrade: notional,
    compounding: false,
    policy: 'shadow',
    annualRate: 0.11,
    method: 'simple',
    dayCount: 365,
    bpsPerSide: costBps,
    commission: 0,
    stopFill: 'stop',
    stopSlippageBps: 0,
    firstEligibleDate: chronology.firstEligible
  };

  if (JSON.stringify(conventions) !== JSON.stringify(expectedConventions))
    throw new Error(`control conventions ${JSON.stringify(conventions)}`);

  return { resolved, pool, conventions };
};

export const poolOptions = (end: string | undefined, cost = costBps): PoolRunOptions => ({
  mode: 'fixed',
  dataset: 'all',
  costBps: cost,
  dividends: 'frozen',
  ...(end ? { end } : {})
});

export interface Overrides {
  costBps?: number;
  rate?: number;
  stopFill?: 'stop' | 'next-open';
  stopSlippageBps?: number;
  phenotypes?: Record<string, BookPhenotype>;
}

// runPoolOn's configuration for the control (src/pools/run.ts), with optional friction/D1 overrides.
export const controlConfig = (pool: LoadedPool, loaded: LoadedUniverse, overrides: Overrides = {}): VRunConfig => {
  const { config } = pool;
  const cost = overrides.costBps ?? costBps;

  return baseNRunConfig({
    key: `${config.id}-fixed-${cost}bps`,
    label: `${config.id} fixed ${cost} bps`,
    mode: 'fixed',
    symbols: config.books.map((book) => book.symbol),
    phenotypes: overrides.phenotypes ?? pool.phenotypes,
    costBps: cost,
    fraction: config.portfolio.borrowedFraction,
    fixedPrincipal: config.funding.notionalPerTrade,
    rate: overrides.rate ?? config.interest.annualRate,
    stopFill: overrides.stopFill ?? config.execution.stopFill,
    stopSlippageBps: overrides.stopSlippageBps ?? config.execution.stopSlippageBps,
    lotDividends: config.portfolio.dividends === 'frozen',
    initial: { voog: config.portfolio.initialCore.VOOG, vgt: config.portfolio.initialCore.VGT },
    eligibilityIndex: loaded.universe.eligibilityIndex,
    accountingStartIndex: loaded.warmup
  });
};

// The control engine itself, exactly as the runner calls it.
export const runControl = (pool: LoadedPool, loaded: LoadedUniverse, end: string | undefined) =>
  runPoolOn(pool, loaded, poolOptions(end));
