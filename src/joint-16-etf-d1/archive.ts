// Every evaluated configuration of the training search, keyed by its canonical key (PROTOCOL.md §6 "dedup and
// budget"): the first evaluation is computed and logged (one JSON line), any later request for the same key is a cache
// hit that returns the recorded result and costs nothing against a budget. Budgets count new keys per source.
import fs from 'fs-extra';
import type { Scored } from '../optimizer/nsga2.ts';
import { study } from './context.ts';
import { type Book, type Evaluation, JointEvaluator, keyOf } from './evaluator.ts';
import type { Grid } from './space.ts';

export interface Entry {
  seq: number;
  key: string;
  stage: string; // 'D' discovery, 'R' refinement
  source: string; // 'greedy:EWZ', 'I3', 'refine:c2', …
  generation: number;
  operator: string;
  config: { symbol: string; id: string; grid: Grid; origin: string }[];
  e: Evaluation;
}

export const scoredOf = (entry: Entry): Scored & { entry: Entry } => ({
  id: entry.key,
  genome: [],
  objectives: [-entry.e.net, entry.e.minuteDrawdown, entry.e.books],
  violation: Math.max(0, entry.e.minuteDrawdown - study.drawdownCeiling) / study.drawdownCeiling,
  entry
});

export const feasible = (entry: Entry) => entry.e.minuteDrawdown <= study.drawdownCeiling;

export const booksOfEntry = (entry: Entry): Book[] =>
  entry.config.map((book) => ({ symbol: book.symbol, vector: { id: book.id, grid: book.grid, origin: book.origin } }));

export class Archive {
  readonly entries = new Map<string, Entry>();
  readonly newBySource = new Map<string, number>();
  hits = 0;
  private buffer: string[] = [];

  constructor(
    readonly evaluator: JointEvaluator,
    private logFile?: string
  ) {
    if (logFile) {
      fs.outputFileSync(logFile, '');
    }
  }

  // Later entries go to another log (the refinement's), after the current buffer is written.
  setLog(file: string) {
    this.flush();
    this.logFile = file;
    fs.outputFileSync(file, '');
  }

  get size() {
    return this.entries.size;
  }

  get(key: string) {
    return this.entries.get(key);
  }

  newCount(source: string) {
    return this.newBySource.get(source) ?? 0;
  }

  evaluate(
    books: readonly Book[],
    meta: { stage: string; source: string; generation: number; operator: string }
  ): { entry: Entry; fresh: boolean } {
    const existing = this.entries.get(keyOf(books));

    if (existing) {
      this.hits++;
      return { entry: existing, fresh: false };
    }

    const { evaluation } = this.evaluator.evaluate(books, study.principalCostBps);
    const entry: Entry = {
      seq: this.entries.size + 1,
      key: evaluation.key,
      ...meta,
      config: evaluation.members.map((symbol) => {
        const book = books.find((item) => item.symbol === symbol)!;

        return { symbol, id: book.vector.id, grid: book.vector.grid, origin: book.vector.origin };
      }),
      e: evaluation
    };

    this.entries.set(entry.key, entry);
    this.newBySource.set(meta.source, this.newCount(meta.source) + 1);

    if (this.logFile) {
      this.buffer.push(JSON.stringify(entry));

      if (this.buffer.length >= 500) {
        this.flush();
      }
    }

    return { entry, fresh: true };
  }

  // A cache lookup before evaluating: the key is computed from the books alone.
  lookup(key: string) {
    const entry = this.entries.get(key);

    if (entry) {
      this.hits++;
    }

    return entry;
  }

  flush() {
    if (this.logFile && this.buffer.length > 0) {
      fs.appendFileSync(this.logFile, `${this.buffer.join('\n')}\n`);
      this.buffer = [];
    }
  }

  // Entries recorded earlier (from the JSON lines of a previous run of the same stage).
  static readEntries(file: string): Entry[] {
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Entry);
  }

  load(entries: readonly Entry[]) {
    for (const entry of entries) {
      if (!this.entries.has(entry.key)) {
        this.entries.set(entry.key, entry);
      }
    }
  }
}
