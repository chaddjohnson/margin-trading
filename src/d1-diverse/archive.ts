// The archive of one arm of one round (PROTOCOL.md §6, §8–§10): every unique configuration the arm evaluated, keyed by
// its canonical key. The first request of a key is the arm's fresh effort (logged as one compact JSON line); a later
// request is a cache hit that counts nothing. Evaluations come from the window's shared store. Each entry carries both
// neighbourhood summaries and both scores (J and T, from the same `disc` draws) whatever the arm's score, so arms can be
// compared; the arm ranks by its own score (§6.3: feasible first, exact ties only).
import fs from 'fs-extra';
import type { Evaluation } from '../d1-robust/evaluate.ts';
import { keyOf } from '../d1-robust/evaluate.ts';
import type { Book } from '../d1-robust/neighbourhood.ts';
import { type ArmClass, type ArmKey, type Score, armSpecs, study } from './context.ts';
import {
  type Rankable,
  type RiskReferences,
  type ScoreSet,
  compareRankable,
  q25Value,
  qOf,
  scoreSetOf,
  scoreValue,
  temporalNet
} from './scores.ts';
import { type EvalStore, feasibleCentre } from './store.ts';

export interface Meta {
  stage: string; // 'A' schedule, 'B' anchored island, 'C' free island
  source: string; // band key, 'B:<symbol>', 'C:<island>'
  generation: number;
  operator: string;
}

// The centre fields later stages read (the full Evaluation stays in the store).
export interface CentreSummary {
  net: number;
  netT: number;
  minuteDrawdown: number;
  dailyDrawdown: number;
  lots: number;
  lotYears: number;
  books: number;
  members: string[];
  lotsBySymbol: Record<string, number>;
  netBySymbol: Record<string, number>;
  virtualBySymbol: Record<string, number>;
  inertBooks: number;
  utilization: number;
  top1: number;
  top2: number;
  positiveRegimes: number;
  regimes: number[];
  years: number[];
  quarters: number[];
  markAt: number[];
  funded: string[];
  behaviourKey: string; // hash of the members' trace signatures (identical traces → identical key)
}

export interface Entry extends Rankable {
  seq: number;
  arm: ArmKey;
  meta: Meta;
  config: { symbol: string; id: string; grid: Book['vector']['grid']; origin: string }[];
  c: CentreSummary;
  set?: ScoreSet; // centre-feasible J/T entries
  q: number;
}

export const summaryOf = (e: Evaluation): CentreSummary => ({
  net: e.net,
  netT: temporalNet(e.net, e.markAt),
  minuteDrawdown: e.minuteDrawdown,
  dailyDrawdown: e.dailyDrawdown,
  lots: e.lots,
  lotYears: e.lotYears,
  books: e.books,
  members: [...e.members].sort(),
  lotsBySymbol: e.lotsBySymbol,
  netBySymbol: e.netBySymbol,
  virtualBySymbol: e.virtualBySymbol,
  inertBooks: e.inertBooks,
  utilization: e.utilization,
  top1: e.top1,
  top2: e.top2,
  positiveRegimes: e.positiveRegimes,
  regimes: e.regimes,
  years: e.years,
  quarters: e.quarters,
  markAt: e.markAt ?? [],
  funded: e.funded ?? [],
  behaviourKey: e.behaviourKey
});

export const booksOfEntry = (entry: Pick<Entry, 'config'>): Book[] =>
  entry.config.map((book) => ({ symbol: book.symbol, vector: { id: book.id, grid: book.grid, origin: book.origin } }));

export const violationOf = (drawdown: number) => Math.max(0, drawdown - study.drawdownCeiling) / study.drawdownCeiling;

export const compareEntries = (a: Entry, b: Entry) => compareRankable(a, b);

// The rankable fields of an evaluated configuration under one score.
export const rankFields = (
  score: Score,
  key: string,
  c: Pick<CentreSummary, 'net' | 'minuteDrawdown' | 'books'>,
  set: ScoreSet | undefined
) => {
  const feasible = feasibleCentre(c) && (score === 'Q' || set !== undefined);

  return {
    key,
    feasible,
    violation: violationOf(c.minuteDrawdown),
    value: feasible ? scoreValue(score, set, c.net, c.books) : -Infinity,
    tie: score === 'Q' ? -c.minuteDrawdown : q25Value(score, set),
    books: c.books
  };
};

export interface ArchiveSpec {
  arm: ArmKey;
  armClass: ArmClass;
  window: string;
  references: RiskReferences;
}

export class ArmArchive {
  readonly entries = new Map<string, Entry>();
  readonly newBySource = new Map<string, number>();
  readonly score: Score;
  hits = 0;
  private buffer: string[] = [];

  constructor(
    readonly store: EvalStore,
    readonly spec: ArchiveSpec,
    private logFile?: string
  ) {
    this.score = armSpecs[spec.arm].score;

    if (logFile) {
      fs.outputFileSync(logFile, '');
    }
  }

  get size() {
    return this.entries.size;
  }

  has(key: string) {
    return this.entries.has(key);
  }

  get(key: string) {
    return this.entries.get(key);
  }

  newCount(source: string) {
    return this.newBySource.get(source) ?? 0;
  }

  // Evaluates the requests (in order); the first request of a key new to the archive is fresh.
  async evaluateBatch(requests: readonly { books: Book[]; meta: Meta }[]): Promise<{ entry: Entry; fresh: boolean }[]> {
    const keys = requests.map((request) => keyOf(request.books));
    const firstIndex = new Map<string, number>();

    keys.forEach((key, index) => {
      if (!this.entries.has(key) && !firstIndex.has(key)) {
        firstIndex.set(key, index);
      }
    });

    const freshIndices = [...firstIndex.values()];

    if (freshIndices.length > 0) {
      const records = await this.store.evaluate(
        freshIndices.map((index) => requests[index]!.books),
        this.score !== 'Q'
      );

      freshIndices.forEach((index, i) => {
        const request = requests[index]!;
        const record = records[i]!;
        const c = summaryOf(record.centre);
        const set =
          this.score !== 'Q' && record.neighbours
            ? scoreSetOf(c.net, c.markAt, record.neighbours, c.books, this.spec.references)
            : undefined;
        const entry: Entry = {
          seq: this.entries.size + 1,
          arm: this.spec.arm,
          meta: request.meta,
          config: c.members.map((symbol) => {
            const book = request.books.find((candidate) => candidate.symbol === symbol)!;

            return { symbol, id: book.vector.id, grid: book.vector.grid, origin: book.vector.origin };
          }),
          c,
          ...(set ? { set } : {}),
          q: qOf(c.net, c.books),
          ...rankFields(this.score, keys[index]!, c, set)
        };

        this.entries.set(entry.key, entry);
        this.newBySource.set(request.meta.source, this.newCount(request.meta.source) + 1);

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

    return keys.map((key, index) => {
      const fresh = firstIndex.get(key) === index;

      if (!fresh) {
        this.hits++;
      }

      return { entry: this.entries.get(key)!, fresh };
    });
  }

  flush() {
    if (this.logFile && this.buffer.length > 0) {
      fs.appendFileSync(this.logFile, `${this.buffer.join('\n')}\n`);
      this.buffer = [];
    }
  }

  ranked() {
    return [...this.entries.values()].sort(compareEntries);
  }
}

// An entry read back from a log line (non-finite numbers were written as strings).
export const parseEntry = (line: string): Entry =>
  JSON.parse(line, (_k, value) =>
    value === 'Infinity' ? Infinity : value === '-Infinity' ? -Infinity : value === 'NaN' ? NaN : value
  ) as Entry;
