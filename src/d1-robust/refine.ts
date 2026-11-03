// Stage S6 (PROTOCOL.md §11): joint refinement of a promoted family with the SAME objective as discovery — arm J the
// risk-aware score S at n_refine common-random-number draws ('refine'), arm Q the centre Q — accepting a move only
// when the objective rises by more than δ = $5,000 (arm J: a paired comparison, since every candidate is scored on the
// identical draws) and F1 holds at 5 and 10 bps. One cycle: membership moves (remove, add, swap), the coordinate pass
// (each member's in-box ±u/±2u probes, best improving accepted before the next member), 32 pair moves and 16 joint
// moves; at most 3 cycles; a cap of unique evaluations per family. After refinement the full-engine portfolio check
// F-P is applied, walking back through accepted states if needed. Every accepted move is logged with its lot changes.
import { probeParams } from '../multi-etf-d1/space.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { box } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import type { Arm } from './archive.ts';
import { log, study } from './context.ts';
import { type Evaluation, keyOf } from './evaluate.ts';
import type { RobustEvaluator } from './evaluator.ts';
import { type Library, pickDistinct } from './genome.ts';
import { type Book, reflect, vectorOfGrid } from './neighbourhood.ts';
import { portfolioSpec } from './promote.ts';
import { type NeighbourhoodStats, type RiskReferences, type ScoreParts, scoreOf, summarize } from './stats.ts';

export interface RefineSpec {
  arm: Arm;
  round: string;
  family: string;
  draws: number;
  references: RiskReferences;
  cap: number;
  library: Library;
  universe: readonly string[];
}

export interface RefineState {
  key: string;
  books: Book[];
  centre5: Evaluation;
  centre10: Evaluation;
  nb?: NeighbourhoodStats;
  score?: ScoreParts;
  q: number;
  value: number;
  feasible: boolean;
}

export interface AcceptedMove {
  cycle: number;
  pass: string;
  move: string;
  from: string;
  to: string;
  before: number;
  after: number;
  lotsAdded: string[];
  lotsRemoved: string[];
}

const units = box.map((spec) => study.stepUnits[spec.key]!);

const withVector = (books: readonly Book[], symbol: string, grid: Grid, origin: string): Book[] =>
  books.map((book) => (book.symbol === symbol ? { symbol, vector: vectorOfGrid(grid, origin) } : book));

export class Refiner {
  readonly cache = new Map<string, RefineState>();
  unique = 0;

  constructor(
    readonly evaluator: RobustEvaluator,
    readonly spec: RefineSpec
  ) {}

  get remaining() {
    return this.spec.cap - this.unique;
  }

  // Evaluates the candidates (in order, unique, within the remaining cap); returns their states (cached ones too).
  async evaluate(candidates: Book[][]): Promise<RefineState[]> {
    const fresh: Book[][] = [];
    const keys = new Set<string>();

    for (const books of candidates) {
      const key = keyOf(books);

      if (!this.cache.has(key) && !keys.has(key) && fresh.length < this.remaining) {
        keys.add(key);
        fresh.push(books);
      }
    }

    if (fresh.length > 0) {
      const five = await this.evaluator.centres(fresh, study.principalCostBps, { withFunded: true });
      const ten = await this.evaluator.centres(fresh, 10);
      const neighbourhoods =
        this.spec.arm === 'J'
          ? await this.evaluator.neighbourRecords(fresh, {
              stage: 'refine',
              cls: 'N1',
              n: this.spec.draws,
              costBps: study.principalCostBps
            })
          : [];

      fresh.forEach((books, index) => {
        const centre5 = five[index]!;
        const centre10 = ten[index]!;
        const feasible =
          centre5.minuteDrawdown <= study.drawdownCeiling && centre10.minuteDrawdown <= study.drawdownCeiling;
        const nb = this.spec.arm === 'J' ? summarize(centre5.net, neighbourhoods[index]!) : undefined;
        const score = nb ? scoreOf(nb, centre5.books, this.spec.references) : undefined;
        const q = centre5.net - study.complexityPenalty * centre5.books;

        this.cache.set(centre5.key, {
          key: centre5.key,
          books,
          centre5,
          centre10,
          ...(nb ? { nb, score } : {}),
          q,
          value: !feasible ? -Infinity : this.spec.arm === 'J' ? score!.s : q,
          feasible
        });
        this.unique++;
      });
    }

    return candidates.flatMap((books) => {
      const state = this.cache.get(keyOf(books));

      return state ? [state] : [];
    });
  }
}

const lotChanges = (before: RefineState, after: RefineState) => {
  const a = new Set(before.centre5.funded ?? []);
  const b = new Set(after.centre5.funded ?? []);

  return {
    lotsAdded: [...b].filter((item) => !a.has(item)),
    lotsRemoved: [...a].filter((item) => !b.has(item))
  };
};

export const refineFamily = async (evaluator: RobustEvaluator, start: Book[], spec: RefineSpec) => {
  const refiner = new Refiner(evaluator, spec);
  const [initial] = await refiner.evaluate([start]);
  let current = initial!;
  const accepted: RefineState[] = [current];
  const moves: AcceptedMove[] = [];
  const cycles: { cycle: number; evaluated: number; accepted: number }[] = [];

  // Accepts the best candidate improving the objective by more than δ; returns whether one was accepted.
  const tryMoves = async (cycle: number, pass: string, candidates: { books: Book[]; move: string }[]) => {
    if (candidates.length === 0 || refiner.remaining <= 0) {
      return false;
    }

    const states = await refiner.evaluate(candidates.map((candidate) => candidate.books));
    const byKey = new Map(states.map((state) => [state.key, state]));
    let best: { state: RefineState; move: string } | undefined;

    for (const candidate of candidates) {
      const state = byKey.get(keyOf(candidate.books));

      if (!state || !state.feasible || !(state.value > current.value + study.refinement.acceptance)) {
        continue;
      }

      if (!best || state.value > best.state.value || (state.value === best.state.value && state.key < best.state.key)) {
        best = { state, move: candidate.move };
      }
    }

    if (!best) {
      return false;
    }

    moves.push({
      cycle,
      pass,
      move: best.move,
      from: current.key,
      to: best.state.key,
      before: current.value,
      after: best.state.value,
      ...lotChanges(current, best.state)
    });
    current = best.state;
    accepted.push(current);

    return true;
  };

  for (let cycle = 1; cycle <= study.refinement.maxCycles && refiner.remaining > 0; cycle++) {
    const rng = Rng.from(study.seedLabel, spec.round, 'refine', spec.arm, spec.family, cycle);
    const before = refiner.unique;
    let acceptedInCycle = 0;
    const members = () => current.books.map((book) => book.symbol).sort();
    const inactive = () => spec.universe.filter((symbol) => !members().includes(symbol));

    // (i)–(iii) membership: remove each member, add each inactive symbol with one library vector, swap each member
    // for 4 random inactive symbols with one library vector each.
    {
      const candidates: { books: Book[]; move: string }[] = [];

      if (current.books.length >= 2) {
        for (const symbol of members()) {
          candidates.push({ books: current.books.filter((book) => book.symbol !== symbol), move: `remove ${symbol}` });
        }
      }

      for (const symbol of inactive()) {
        const vector = spec.library.draw(rng);

        candidates.push({ books: [...current.books, { symbol, vector }], move: `add ${symbol}:${vector.id}` });
      }

      for (const symbol of members()) {
        for (const target of pickDistinct(inactive(), study.refinement.swapTargets, rng)) {
          const vector = spec.library.draw(rng);

          candidates.push({
            books: [...current.books.filter((book) => book.symbol !== symbol), { symbol: target, vector }],
            move: `swap ${symbol} → ${target}:${vector.id}`
          });
        }
      }

      acceptedInCycle += (await tryMoves(cycle, 'membership', candidates)) ? 1 : 0;
    }

    // (iv) coordinates: each member alphabetically, its in-box probes; the best improving probe before the next member.
    for (const symbol of members()) {
      if (refiner.remaining <= 0) {
        break;
      }

      const book = current.books.find((item) => item.symbol === symbol);

      if (!book) {
        continue;
      }

      const candidates = probeParams(book.vector.grid as unknown as IntParams).map((probe) => ({
        books: withVector(current.books, symbol, probe.params as unknown as Grid, 'refine probe'),
        move: `${symbol} ${probe.key} ${probe.offset > 0 ? '+' : ''}${probe.offset}`
      }));

      acceptedInCycle += (await tryMoves(cycle, 'coordinate', candidates)) ? 1 : 0;
    }

    // (v) pairs: one step unit on one coordinate of each of two different members.
    if (current.books.length >= 2) {
      const candidates: { books: Book[]; move: string }[] = [];

      for (let index = 0; index < study.refinement.pairMoves; index++) {
        const [a, b] = pickDistinct(members(), 2, rng) as [string, string];
        let books = current.books;
        const parts: string[] = [];

        for (const symbol of [a, b]) {
          const j = rng.int(box.length);
          const sign = rng.int(2) === 0 ? -1 : 1;
          const spec_ = box[j]!;
          const grid = { ...books.find((item) => item.symbol === symbol)!.vector.grid };
          const key = spec_.key as keyof Grid;

          grid[key] = reflect(grid[key], sign * units[j]!, spec_.min, spec_.max);
          books = withVector(books, symbol, grid, 'refine pair');
          parts.push(`${symbol} ${spec_.short} ${sign > 0 ? '+' : '−'}u`);
        }

        candidates.push({ books, move: `pair ${parts.join(', ')}` });
      }

      acceptedInCycle += (await tryMoves(cycle, 'pair', candidates)) ? 1 : 0;
    }

    // (vi) joint: one step unit on every coordinate of one member (uniform signs, reflected).
    {
      const candidates: { books: Book[]; move: string }[] = [];

      for (let index = 0; index < study.refinement.jointMoves; index++) {
        const symbol = members()[rng.int(members().length)]!;
        const grid = { ...current.books.find((item) => item.symbol === symbol)!.vector.grid };

        box.forEach((spec_, j) => {
          const key = spec_.key as keyof Grid;

          grid[key] = reflect(grid[key], (rng.int(2) === 0 ? -1 : 1) * units[j]!, spec_.min, spec_.max);
        });
        candidates.push({ books: withVector(current.books, symbol, grid, 'refine joint'), move: `joint ${symbol}` });
      }

      acceptedInCycle += (await tryMoves(cycle, 'joint', candidates)) ? 1 : 0;
    }

    cycles.push({ cycle, evaluated: refiner.unique - before, accepted: acceptedInCycle });
    log(
      `${spec.round} ${spec.arm} refine ${spec.family} cycle ${cycle}: ${acceptedInCycle} accepted, ${refiner.unique} evaluated`
    );

    if (acceptedInCycle === 0) {
      break;
    }
  }

  // F-P: the latest accepted state whose training portfolio passes.
  let result = current;
  const portfolioChecks: { key: string; dailyPercent: number }[] = [];

  for (const state of [...accepted].reverse()) {
    const [summary] = await evaluator.engines([portfolioSpec(evaluator, state.books, `refine-${spec.family}`)]);

    portfolioChecks.push({ key: state.key, dailyPercent: summary!.dailyPercent });

    if (summary!.dailyPercent <= study.portfolioDailyCeiling) {
      result = state;
      break;
    }
  }

  return {
    family: spec.family,
    arm: spec.arm,
    start: initial!.key,
    result: result.key,
    resultState: result,
    startState: initial!,
    unique: refiner.unique,
    cycles,
    moves,
    portfolioChecks,
    walkedBack: result !== current
  };
};
