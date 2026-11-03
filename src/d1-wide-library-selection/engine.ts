// The canonical full-minute engine for every reported figure: the frozen N-book allocator through the completed
// audits' pure runner (src/d1-standalone-opportunity-audit/run.ts executeSpec → src/b4-b5-robustness/run.ts runSpec),
// unchanged and imported read-only. A standalone phenotype is a one-book pool (every signal funded, one $100,000 lot
// at a time, 11% simple interest, the per-side cost, stops at the stop, accounting from 2016-01-04, arming
// 2017-06-15). A lot open at the end counts at its liquidation value (the source's Stage A definition). The audit's
// worker pool runs specifications in parallel; results return per specification whatever the scheduling.
import { LocalRunner, type Runner, WorkerRunner } from '../d1-standalone-opportunity-audit/pool.ts';
import { type Book, type RunRecord, type Spec } from '../d1-standalone-opportunity-audit/run.ts';
import { atCost, specOf } from '../d1-standalone-opportunity-audit/specs.ts';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { study } from './context.ts';
import { type Grid, gridKeyOf, workers } from './fast.ts';

export type { Book, RunRecord, Spec };

export const engineSpec = (fields: {
  key: string;
  subject: string;
  books: { symbol: string; grid: Grid; phenotype?: string }[];
  costBps?: number;
  boundaryDate?: string;
  mode?: 'fixed' | 'portfolio';
  keepDaily?: boolean;
  meta?: Record<string, string | number | boolean>;
}): Spec => {
  const spec = specOf({
    key: fields.key,
    family: 'base',
    subject: fields.subject,
    window: 'final',
    mode: fields.mode ?? 'fixed',
    books: fields.books.map((book) => ({
      symbol: book.symbol,
      phenotype: book.phenotype ?? `${book.symbol}:${gridKeyOf(book.grid)}`,
      grid: { ...book.grid } as Book['grid']
    })),
    boundaryDate: fields.boundaryDate,
    keepDaily: fields.keepDaily ?? false,
    meta: fields.meta ?? {}
  });

  return atCost(spec, fields.costBps ?? study.costBps);
};

export const engineRunner = (universe: NUniverse, count?: number): Runner =>
  count === 0 ? new LocalRunner(universe) : new WorkerRunner(universe, workers(count));

export const runAll = async (runner: Runner, specs: readonly Spec[]) =>
  Promise.all(specs.map((spec) => runner.run(spec)));
