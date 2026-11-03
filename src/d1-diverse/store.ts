// One evaluation store per loaded window (PROTOCOL.md §8): the centre at 5 bps (funded lots and block marks
// included) and, for centre-feasible configurations requested by a J or T arm, the n_D `disc` N1 neighbours (block
// marks included). Evaluations are pure functions of (window, configuration, stage), so the store shares them across
// arms: a configuration costs compute once per window, while each arm's archive counts it as its own unique effort.
// The interface is small so that the search can be tested with a synthetic store.
import type { Evaluation } from '../d1-robust/evaluate.ts';
import { keyOf } from '../d1-robust/evaluate.ts';
import type { RobustEvaluator } from '../d1-robust/evaluator.ts';
import type { Book } from '../d1-robust/neighbourhood.ts';
import type { NeighbourRecord } from '../d1-robust/stats.ts';
import { study } from './context.ts';
import type { BlockSpec } from './scores.ts';

export interface StoreRecord {
  centre: Evaluation;
  neighbours?: NeighbourRecord[]; // present for centre-feasible configurations once a J/T arm asked for them
}

export interface EvalStore {
  readonly blocks: BlockSpec;
  readonly discDraws: number;
  readonly evaluations: { centres: number; neighbourhoods: number };
  evaluate(configs: readonly Book[][], withNeighbours: boolean): Promise<StoreRecord[]>;
}

export const feasibleCentre = (centre: Pick<Evaluation, 'minuteDrawdown'>) =>
  centre.minuteDrawdown <= study.drawdownCeiling;

export class WindowStore implements EvalStore {
  private readonly records = new Map<string, StoreRecord>();
  readonly evaluations = { centres: 0, neighbourhoods: 0 };

  constructor(
    readonly evaluator: RobustEvaluator,
    readonly blocks: BlockSpec,
    readonly discDraws: number
  ) {}

  get size() {
    return this.records.size;
  }

  async evaluate(configs: readonly Book[][], withNeighbours: boolean): Promise<StoreRecord[]> {
    const keys = configs.map((books) => keyOf(books));
    const missing: { key: string; books: Book[] }[] = [];
    const queued = new Set<string>();

    keys.forEach((key, index) => {
      if (!this.records.has(key) && !queued.has(key)) {
        queued.add(key);
        missing.push({ key, books: configs[index]! });
      }
    });

    if (missing.length > 0) {
      const centres = await this.evaluator.centres(
        missing.map((item) => item.books),
        study.principalCostBps,
        { markIndices: this.blocks.markIndices, withFunded: true }
      );

      missing.forEach((item, index) => this.records.set(item.key, { centre: centres[index]! }));
      this.evaluations.centres += missing.length;
    }

    if (withNeighbours) {
      const needing: { key: string; books: Book[] }[] = [];
      const seen = new Set<string>();

      keys.forEach((key, index) => {
        const record = this.records.get(key)!;

        if (!record.neighbours && feasibleCentre(record.centre) && !seen.has(key)) {
          seen.add(key);
          needing.push({ key, books: configs[index]! });
        }
      });

      if (needing.length > 0) {
        const neighbourhoods = await this.evaluator.neighbourRecords(
          needing.map((item) => item.books),
          {
            stage: 'disc',
            cls: 'N1',
            n: this.discDraws,
            costBps: study.principalCostBps,
            markIndices: this.blocks.markIndices
          }
        );

        needing.forEach((item, index) => {
          this.records.get(item.key)!.neighbours = neighbourhoods[index]!;
        });
        this.evaluations.neighbourhoods += needing.length;
      }
    }

    return keys.map((key) => this.records.get(key)!);
  }
}
