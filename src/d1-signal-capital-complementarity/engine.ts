// Every reported figure comes from the frozen N-book engine (src/portfolio-aware-d1/nbook/engine.ts runNAllocator),
// imported read-only and configured exactly as `npm run pools` configures a pool run (src/pools/run.ts runPoolOn) and
// the completed audits configure a book run (src/b4-b5-robustness/run.ts runSpec): one shared $100,000 slot or the
// 20% portfolio, 11% simple interest, the per-side cost, stops at the stop, the frozen dividend convention, books
// arming at the universe's first eligible session (2017-06-15), accounting from the first session's close.
import {
  type BookPhenotype,
  type NRunResult,
  type NUniverse,
  baseNRunConfig,
  runNAllocator
} from '../portfolio-aware-d1/nbook/engine.ts';
import { study } from './context.ts';

export type { BookPhenotype, NRunResult, NUniverse };

export interface RunOptions {
  key: string;
  mode: 'fixed' | 'portfolio';
  costBps: number;
  stopSlippageBps?: number;
  rate?: number;
}

export const membersOf = (symbols: readonly string[], mode: 'fixed' | 'portfolio') =>
  mode === 'portfolio' ? [...new Set(['VOOG', 'VGT', ...symbols])] : [...symbols];

export const runBooks = (
  universe: NUniverse,
  phenotypes: Record<string, BookPhenotype>,
  options: RunOptions
): NRunResult => {
  const symbols = Object.keys(phenotypes);
  const members = membersOf(symbols, options.mode);

  return runNAllocator(
    {
      ...universe,
      instruments: Object.fromEntries(
        members.map((symbol) => {
          const instrument = universe.instruments[symbol];

          if (!instrument) {
            throw new Error(`${options.key}: ${symbol} is not loaded`);
          }

          return [symbol, instrument];
        })
      )
    },
    baseNRunConfig({
      key: options.key,
      label: options.key,
      mode: options.mode,
      symbols,
      phenotypes,
      costBps: options.costBps,
      fraction: study.portfolio.fraction,
      fixedPrincipal: study.principal,
      rate: options.rate ?? study.rate,
      stopFill: 'stop',
      stopSlippageBps: options.stopSlippageBps ?? 0,
      lotDividends: true,
      initial: { ...study.portfolio.initial },
      eligibilityIndex: universe.eligibilityIndex,
      accountingStartIndex: 0
    })
  );
};

// The core-only C0 control: the portfolio with no book.
export const runCore = (universe: NUniverse, key = 'C0') =>
  runBooks(universe, {}, { key, mode: 'portfolio', costBps: study.costBps });
