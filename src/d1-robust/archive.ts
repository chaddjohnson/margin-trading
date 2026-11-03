// Every configuration evaluated by one arm of one round (PROTOCOL.md §6, §9), keyed by its canonical key: the first
// evaluation is computed and logged (one JSON line), later requests for the key are cache hits that cost nothing
// against a budget. Arm J scores a centre-feasible configuration by its neighbourhood (n_D common-random-number draws,
// stage 'disc'): S = P50 − λk − the calibrated drawdown penalties, J0 = P50 − λk beside it. Arm Q scores the centre:
// Q = net − λk. Infeasible configurations (centre DD at 5 bps above $35,000) are ranked by violation only, and their
// neighbourhoods are not computed.
import fs from 'fs-extra';
import { study } from './context.ts';
import { type Evaluation, keyOf } from './evaluate.ts';
import type { RobustEvaluator } from './evaluator.ts';
import type { Book } from './neighbourhood.ts';
import { type NeighbourhoodStats, type RiskReferences, type ScoreParts, scoreOf, summarize } from './stats.ts';

export type Arm = 'J' | 'Q';

export interface Meta {
  stage: string; // 'D' discovery, 'T' top-up, 'P' promotion, 'R' refinement
  source: string; // island key, 'topup:XLV', 'refine:f2', …
  generation: number;
  operator: string;
}

export interface Entry {
  seq: number;
  key: string;
  arm: Arm;
  meta: Meta;
  config: { symbol: string; id: string; grid: Book['vector']['grid']; origin: string }[];
  e: Evaluation;
  feasible: boolean;
  violation: number;
  nb?: NeighbourhoodStats;
  score?: ScoreParts;
  q: number;
  rankValue: number; // the arm's scalar (S for J, Q for Q); −Infinity when infeasible
}

export const booksOfEntry = (entry: Pick<Entry, 'config'>): Book[] =>
  entry.config.map((book) => ({ symbol: book.symbol, vector: { id: book.id, grid: book.grid, origin: book.origin } }));

export const violationOf = (drawdown: number) => Math.max(0, drawdown - study.drawdownCeiling) / study.drawdownCeiling;

// The arm's constrained ranking: feasible first; infeasible by violation; feasible by the arm's scalar; ties by
// Q25 (J) or the centre drawdown (Q); then the key.
export const compareEntries = (a: Entry, b: Entry) => {
  if (a.feasible !== b.feasible) {
    return a.feasible ? -1 : 1;
  }

  if (!a.feasible) {
    return a.violation - b.violation || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  }

  if (a.rankValue !== b.rankValue) {
    return b.rankValue - a.rankValue;
  }

  if (a.arm === 'J' && a.nb && b.nb && a.nb.q25 !== b.nb.q25) {
    return b.nb.q25 - a.nb.q25;
  }

  if (a.arm === 'Q' && a.e.minuteDrawdown !== b.e.minuteDrawdown) {
    return a.e.minuteDrawdown - b.e.minuteDrawdown;
  }

  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
};

export interface ArchiveSpec {
  arm: Arm;
  round: string;
  draws: number; // n_D (arm J)
  stage: string; // neighbourhood stage label ('disc')
  references: RiskReferences;
}

export const scoreEntry = (
  arm: Arm,
  e: Evaluation,
  nb: NeighbourhoodStats | undefined,
  references: RiskReferences
): Pick<Entry, 'feasible' | 'violation' | 'score' | 'q' | 'rankValue'> => {
  const feasible = e.minuteDrawdown <= study.drawdownCeiling;
  const q = e.net - study.complexityPenalty * e.books;
  const score = nb ? scoreOf(nb, e.books, references) : undefined;

  return {
    feasible,
    violation: violationOf(e.minuteDrawdown),
    score,
    q,
    rankValue: !feasible ? -Infinity : arm === 'Q' ? q : score!.s
  };
};

export class Archive {
  readonly entries = new Map<string, Entry>();
  readonly newBySource = new Map<string, number>();
  hits = 0;
  private buffer: string[] = [];

  constructor(
    readonly evaluator: RobustEvaluator,
    readonly spec: ArchiveSpec,
    private logFile?: string
  ) {
    if (logFile) {
      fs.outputFileSync(logFile, '');
    }
  }

  get size() {
    return this.entries.size;
  }

  get(key: string) {
    return this.entries.get(key);
  }

  has(key: string) {
    return this.entries.has(key);
  }

  newCount(source: string) {
    return this.newBySource.get(source) ?? 0;
  }

  // Evaluates the configurations not yet in the archive (in order, deduplicated), then returns every request's entry.
  async evaluateBatch(requests: { books: Book[]; meta: Meta }[]): Promise<{ entry: Entry; fresh: boolean }[]> {
    const fresh: { key: string; books: Book[]; meta: Meta }[] = [];
    const seen = new Set<string>();

    for (const request of requests) {
      const key = keyOf(request.books);

      if (!this.entries.has(key) && !seen.has(key)) {
        seen.add(key);
        fresh.push({ key, books: request.books, meta: request.meta });
      }
    }

    if (fresh.length > 0) {
      const centres = await this.evaluator.centres(
        fresh.map((item) => item.books),
        study.principalCostBps
      );
      const feasibleIndices = centres.flatMap((e, index) =>
        this.spec.arm === 'J' && e.minuteDrawdown <= study.drawdownCeiling ? [index] : []
      );
      const neighbourhoods = await this.evaluator.neighbourRecords(
        feasibleIndices.map((index) => fresh[index]!.books),
        { stage: this.spec.stage, cls: 'N1', n: this.spec.draws, costBps: study.principalCostBps }
      );
      const stats = new Map(
        feasibleIndices.map((index, i) => [index, summarize(centres[index]!.net, neighbourhoods[i]!)])
      );

      fresh.forEach((item, index) => {
        const e = centres[index]!;
        const nb = stats.get(index);
        const entry: Entry = {
          seq: this.entries.size + 1,
          key: item.key,
          arm: this.spec.arm,
          meta: item.meta,
          config: e.members.map((symbol) => {
            const book = item.books.find((candidate) => candidate.symbol === symbol)!;

            return { symbol, id: book.vector.id, grid: book.vector.grid, origin: book.vector.origin };
          }),
          e,
          ...(nb ? { nb } : {}),
          ...scoreEntry(this.spec.arm, e, nb, this.spec.references)
        } as Entry;

        this.entries.set(entry.key, entry);
        this.newBySource.set(item.meta.source, this.newCount(item.meta.source) + 1);

        if (this.logFile) {
          this.buffer.push(
            JSON.stringify(entry, (_k, value) =>
              typeof value === 'number' && !Number.isFinite(value) ? String(value) : value
            )
          );
        }
      });

      if (this.buffer.length >= 500) {
        this.flush();
      }
    }

    return requests.map((request) => {
      const key = keyOf(request.books);
      const entry = this.entries.get(key)!;
      const isFresh = seen.has(key) && fresh.find((item) => item.key === key)?.meta === request.meta;

      if (!isFresh) {
        this.hits++;
      }

      return { entry, fresh: isFresh };
    });
  }

  flush() {
    if (this.logFile && this.buffer.length > 0) {
      fs.appendFileSync(this.logFile, `${this.buffer.join('\n')}\n`);
      this.buffer = [];
    }
  }

  setLog(file: string) {
    this.flush();
    this.logFile = file;
    fs.outputFileSync(file, '');
  }

  ranked() {
    return [...this.entries.values()].sort(compareEntries);
  }
}
