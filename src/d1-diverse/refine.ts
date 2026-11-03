// Refinement, member pruning and re-refinement of one shortlisted family (PROTOCOL.md §12).
//
//   refinement   the October 25 study's passes (membership, coordinates, pairs, joint moves) with the ARM'S OWN score at
//                `refine` n = 48 (Q arm: Q); a move is accepted only when the score rises by more than δ = $5,000 and F1
//                holds at 5 and 10 bps; ≤ 3 cycles; a cap of unique evaluations per family.
//   pruning      on the independent `prune` batch (n = 128), each member's marginal m_i = score(C) − score(C ∖ i) with its
//                paired-bootstrap 90% interval; while some member's lower bound is ≤ 0, the one with the lowest point
//                estimate is removed (only if C ∖ i keeps F1 at 5 and 10 bps); marginals are recomputed after each
//                removal. Same objective, perturbation distribution and allocator as the member gate G3.
//   re-refining  one cycle of the parameter passes only, then the pruning rule once more.
//   F-P          the latest post-pruning state whose training portfolio passes is the result.
import { probeParams } from '../multi-etf-d1/space.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { box } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { type Evaluation, keyOf } from '../d1-robust/evaluate.ts';
import type { RobustEvaluator } from '../d1-robust/evaluator.ts';
import { type Library, pickDistinct } from '../d1-robust/genome.ts';
import { type Book, reflect, vectorOfGrid } from '../d1-robust/neighbourhood.ts';
import { portfolioSpec } from '../d1-robust/promote.ts';
import type { NeighbourRecord } from '../d1-robust/stats.ts';
import { type ArmKey, type Score, armSpecs, log, study } from './context.ts';
import {
  type BlockSpec,
  type DifferenceInterval,
  type RiskReferences,
  type ScoreSet,
  pairedScoreDifference,
  qOf,
  scoreDrawsOf,
  scoreSetOf,
  scoreValue,
  seeded
} from './scores.ts';

export interface RefineSpec {
  arm: ArmKey;
  window: string;
  family: string;
  draws: number; // n_refine
  pruneDraws: number;
  references: RiskReferences;
  blocks: BlockSpec;
  cap: number;
  library: Library;
  universe: readonly string[];
}

export interface RefineState {
  key: string;
  books: Book[];
  centre5: Evaluation;
  centre10: Evaluation;
  set?: ScoreSet;
  q: number;
  value: number;
  feasible: boolean;
}

export interface AcceptedMove {
  phase: 'refine' | 're-refine';
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

export interface MemberMarginal {
  symbol: string;
  marginal: number;
  interval?: DifferenceInterval;
  feasibleWithout: boolean;
}

export interface PruneStep {
  phase: 'prune' | 'final-prune';
  from: string;
  members: string[];
  marginals: MemberMarginal[];
  removed?: string;
  to?: string;
  lotsAdded: string[];
  lotsRemoved: string[];
  note?: string;
}

const units = box.map((spec) => study.stepUnits[spec.key]!);

const withVector = (books: readonly Book[], symbol: string, grid: Grid, origin: string): Book[] =>
  books.map((book) => (book.symbol === symbol ? { symbol, vector: vectorOfGrid(grid, origin) } : book));

const f1 = (centre5: Pick<Evaluation, 'minuteDrawdown'>, centre10: Pick<Evaluation, 'minuteDrawdown'>) =>
  centre5.minuteDrawdown <= study.drawdownCeiling && centre10.minuteDrawdown <= study.drawdownCeiling;

export class Refiner {
  readonly cache = new Map<string, RefineState>();
  readonly score: Score;
  unique = 0;

  constructor(
    readonly evaluator: RobustEvaluator,
    readonly spec: RefineSpec
  ) {
    this.score = armSpecs[spec.arm].score;
  }

  get remaining() {
    return this.spec.cap - this.unique;
  }

  // Evaluates the candidates (in order, unique, within the remaining cap unless `force`); returns their states.
  async evaluate(candidates: Book[][], force = false): Promise<RefineState[]> {
    const fresh: Book[][] = [];
    const keys = new Set<string>();

    for (const books of candidates) {
      const key = keyOf(books);

      if (!this.cache.has(key) && !keys.has(key) && (force || fresh.length < this.remaining)) {
        keys.add(key);
        fresh.push(books);
      }
    }

    if (fresh.length > 0) {
      const options = { markIndices: this.spec.blocks.markIndices, withFunded: true };
      const five = await this.evaluator.centres(fresh, study.principalCostBps, options);
      const ten = await this.evaluator.centres(fresh, 10);
      const neighbourhoods =
        this.score !== 'Q'
          ? await this.evaluator.neighbourRecords(fresh, {
              stage: 'refine',
              cls: 'N1',
              n: this.spec.draws,
              costBps: study.principalCostBps,
              markIndices: this.spec.blocks.markIndices
            })
          : [];

      fresh.forEach((books, index) => {
        const centre5 = five[index]!;
        const centre10 = ten[index]!;
        const feasible = f1(centre5, centre10);
        const set =
          this.score !== 'Q'
            ? scoreSetOf(centre5.net, centre5.markAt, neighbourhoods[index]!, centre5.books, this.spec.references)
            : undefined;

        this.cache.set(centre5.key, {
          key: centre5.key,
          books,
          centre5,
          centre10,
          ...(set ? { set } : {}),
          q: qOf(centre5.net, centre5.books),
          value: feasible ? scoreValue(this.score, set, centre5.net, centre5.books) : -Infinity,
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

const lotChanges = (before: Pick<RefineState, 'centre5'>, after: Pick<RefineState, 'centre5'>) => {
  const a = new Set(before.centre5.funded ?? []);
  const b = new Set(after.centre5.funded ?? []);

  return { lotsAdded: [...b].filter((item) => !a.has(item)), lotsRemoved: [...a].filter((item) => !b.has(item)) };
};

// ----- §12.2 member marginals on the prune batch -----

export interface MarginalContext {
  evaluator: RobustEvaluator;
  arm: ArmKey;
  window: string;
  draws: number;
  references: RiskReferences;
  blocks: BlockSpec;
}

const pruneRecords = async (ctx: MarginalContext, configs: Book[][]) =>
  ctx.evaluator.neighbourRecords(configs, {
    stage: 'prune',
    cls: 'N1',
    n: ctx.draws,
    costBps: study.principalCostBps,
    markIndices: ctx.blocks.markIndices
  });

// Each member's marginal (score(C) − score(C ∖ i), the empty pool scoring 0) with its paired 90% interval; Q arm: the
// centre marginal Q(C) − Q(C ∖ i) without draws. `feasibleWithout`: C ∖ i keeps F1 at 5 and 10 bps.
export const memberMarginals = async (ctx: MarginalContext, books: Book[]): Promise<MemberMarginal[]> => {
  const score = armSpecs[ctx.arm].score;
  const members = books.map((book) => book.symbol).sort();
  const without = members.map((symbol) => books.filter((book) => book.symbol !== symbol));
  const nonEmpty = without.filter((list) => list.length > 0);
  const five = await ctx.evaluator.centres(nonEmpty, study.principalCostBps);
  const ten = await ctx.evaluator.centres(nonEmpty, 10);
  const feasibleOf = (index: number) => (without[index]!.length === 0 ? true : f1(five[index]!, ten[index]!));

  if (score === 'Q') {
    const [centre] = await ctx.evaluator.centres([books], study.principalCostBps);

    return members.map((symbol, index) => ({
      symbol,
      marginal:
        qOf(centre!.net, books.length) - (without[index]!.length === 0 ? 0 : qOf(five[index]!.net, books.length - 1)),
      feasibleWithout: feasibleOf(index)
    }));
  }

  const records = (await pruneRecords(ctx, [books, ...nonEmpty])) as NeighbourRecord[][];
  const draws = scoreDrawsOf(score, records[0]!);

  return members.map((symbol, index) => {
    const others = without[index]!.length === 0 ? undefined : scoreDrawsOf(score, records[1 + index]!);
    const interval = pairedScoreDifference(
      { draws, books: books.length },
      { draws: others, books: books.length - 1 },
      ctx.references,
      seeded(ctx.window, 'prune-bootstrap', keyOf(books), symbol),
      study.bootstrapResamples,
      1 - 2 * study.prune.lowerQuantile
    );

    return { symbol, marginal: interval.estimate, interval, feasibleWithout: feasibleOf(index) };
  });
};

// The pruning rule, repeated until every member's lower bound is > 0 (J/T) or every centre marginal is > 0 (Q).
// `marginalsOf` and `evaluate` are the real ones in a round and synthetic ones in the tests.
export interface PruneDependencies {
  score: Score;
  marginalsOf: (books: Book[]) => Promise<MemberMarginal[]>;
  evaluate: (books: Book[]) => Promise<RefineState>;
}

export const pruneWith = async (
  deps: PruneDependencies,
  start: RefineState,
  phase: PruneStep['phase']
): Promise<{ state?: RefineState; steps: PruneStep[]; blocked: boolean }> => {
  const { score } = deps;
  // J/T: the 90% interval's lower bound (the 5th percentile, study.prune.lowerQuantile) is ≤ 0; Q: the centre marginal.
  const failing = (item: MemberMarginal) => (score === 'Q' ? !(item.marginal > 0) : !(item.interval!.lower > 0));
  const steps: PruneStep[] = [];
  let current: RefineState | undefined = start;

  while (current) {
    const marginals = await deps.marginalsOf(current.books);
    const candidates = marginals
      .filter(failing)
      .sort((a, b) => a.marginal - b.marginal || (a.symbol < b.symbol ? -1 : 1));

    if (candidates.length === 0) {
      steps.push({
        phase,
        from: current.key,
        members: current.books.map((book) => book.symbol).sort(),
        marginals,
        lotsAdded: [],
        lotsRemoved: []
      });

      return { state: current, steps, blocked: false };
    }

    const removable = candidates.find((item) => item.feasibleWithout);

    if (!removable) {
      steps.push({
        phase,
        from: current.key,
        members: current.books.map((book) => book.symbol).sort(),
        marginals,
        lotsAdded: [],
        lotsRemoved: [],
        note: 'prune blocked by F1: no member with a non-positive bound can be removed while keeping F1 at 5 and 10 bps'
      });

      return { state: current, steps, blocked: true };
    }

    const remaining = current.books.filter((book) => book.symbol !== removable.symbol);

    if (remaining.length === 0) {
      steps.push({
        phase,
        from: current.key,
        members: current.books.map((book) => book.symbol).sort(),
        marginals,
        removed: removable.symbol,
        lotsAdded: [],
        lotsRemoved: current.centre5.funded ?? [],
        note: 'pruned to empty'
      });

      return { state: undefined, steps, blocked: false };
    }

    const next = await deps.evaluate(remaining);

    steps.push({
      phase,
      from: current.key,
      members: current.books.map((book) => book.symbol).sort(),
      marginals,
      removed: removable.symbol,
      to: next.key,
      ...lotChanges(current, next)
    });
    current = next;
  }

  return { state: undefined, steps, blocked: false };
};

export const prune = (ctx: MarginalContext & { refiner: Refiner }, start: RefineState, phase: PruneStep['phase']) =>
  pruneWith(
    {
      score: armSpecs[ctx.arm].score,
      marginalsOf: (books) => memberMarginals(ctx, books),
      evaluate: async (books) => (await ctx.refiner.evaluate([books], true))[0]!
    },
    start,
    phase
  );

// ----- the refinement passes -----

type Candidate = { books: Book[]; move: string };

const membershipCandidates = (current: RefineState, spec: RefineSpec, rng: Rng): Candidate[] => {
  const members = current.books.map((book) => book.symbol).sort();
  const inactive = spec.universe.filter((symbol) => !members.includes(symbol));
  const candidates: Candidate[] = [];

  if (current.books.length >= 2) {
    for (const symbol of members) {
      candidates.push({ books: current.books.filter((book) => book.symbol !== symbol), move: `remove ${symbol}` });
    }
  }

  for (const symbol of inactive) {
    const vector = spec.library.draw(rng);

    candidates.push({ books: [...current.books, { symbol, vector }], move: `add ${symbol}:${vector.id}` });
  }

  for (const symbol of members) {
    for (const target of pickDistinct(inactive, study.refinement.swapTargets, rng)) {
      const vector = spec.library.draw(rng);

      candidates.push({
        books: [...current.books.filter((book) => book.symbol !== symbol), { symbol: target, vector }],
        move: `swap ${symbol} → ${target}:${vector.id}`
      });
    }
  }

  return candidates;
};

const pairCandidates = (current: RefineState, rng: Rng): Candidate[] => {
  const members = current.books.map((book) => book.symbol).sort();
  const candidates: Candidate[] = [];

  if (members.length < 2) {
    return candidates;
  }

  for (let index = 0; index < study.refinement.pairMoves; index++) {
    const [a, b] = pickDistinct(members, 2, rng) as [string, string];
    let books = current.books;
    const parts: string[] = [];

    for (const symbol of [a, b]) {
      const j = rng.int(box.length);
      const sign = rng.int(2) === 0 ? -1 : 1;
      const spec = box[j]!;
      const grid = { ...books.find((item) => item.symbol === symbol)!.vector.grid };
      const key = spec.key as keyof Grid;

      grid[key] = reflect(grid[key], sign * units[j]!, spec.min, spec.max);
      books = withVector(books, symbol, grid, 'refine pair');
      parts.push(`${symbol} ${spec.short} ${sign > 0 ? '+' : '−'}u`);
    }

    candidates.push({ books, move: `pair ${parts.join(', ')}` });
  }

  return candidates;
};

const jointCandidates = (current: RefineState, rng: Rng): Candidate[] => {
  const members = current.books.map((book) => book.symbol).sort();
  const candidates: Candidate[] = [];

  for (let index = 0; index < study.refinement.jointMoves; index++) {
    const symbol = members[rng.int(members.length)]!;
    const grid = { ...current.books.find((item) => item.symbol === symbol)!.vector.grid };

    box.forEach((spec, j) => {
      const key = spec.key as keyof Grid;

      grid[key] = reflect(grid[key], (rng.int(2) === 0 ? -1 : 1) * units[j]!, spec.min, spec.max);
    });
    candidates.push({ books: withVector(current.books, symbol, grid, 'refine joint'), move: `joint ${symbol}` });
  }

  return candidates;
};

export const refineFamily = async (evaluator: RobustEvaluator, start: Book[], spec: RefineSpec) => {
  const refiner = new Refiner(evaluator, spec);
  const [initial] = await refiner.evaluate([start], true);
  let current = initial!;
  const moves: AcceptedMove[] = [];
  const cycles: { phase: string; cycle: number; evaluated: number; accepted: number }[] = [];

  const tryMoves = async (phase: AcceptedMove['phase'], cycle: number, pass: string, candidates: Candidate[]) => {
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
      phase,
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

    return true;
  };

  const parameterPasses = async (phase: AcceptedMove['phase'], cycle: number, rng: Rng) => {
    let accepted = 0;

    for (const symbol of current.books.map((book) => book.symbol).sort()) {
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

      accepted += (await tryMoves(phase, cycle, 'coordinate', candidates)) ? 1 : 0;
    }

    accepted += (await tryMoves(phase, cycle, 'pair', pairCandidates(current, rng))) ? 1 : 0;
    accepted += (await tryMoves(phase, cycle, 'joint', jointCandidates(current, rng))) ? 1 : 0;

    return accepted;
  };

  // §12.1 refinement
  for (let cycle = 1; cycle <= study.refinement.maxCycles && refiner.remaining > 0; cycle++) {
    const rng = Rng.from(study.seedLabel, spec.window, 'refine', spec.arm, spec.family, cycle);
    const before = refiner.unique;
    let accepted = (await tryMoves('refine', cycle, 'membership', membershipCandidates(current, spec, rng))) ? 1 : 0;

    accepted += await parameterPasses('refine', cycle, rng);
    cycles.push({ phase: 'refine', cycle, evaluated: refiner.unique - before, accepted });
    log(
      `${spec.window} ${spec.arm} refine ${spec.family} cycle ${cycle}: ${accepted} accepted, ${refiner.unique} evaluated`
    );

    if (accepted === 0) {
      break;
    }
  }

  const refined = current;
  const marginalContext = {
    evaluator,
    arm: spec.arm,
    window: spec.window,
    draws: spec.pruneDraws,
    references: spec.references,
    blocks: spec.blocks,
    refiner
  };

  // §12.2 pruning
  const first = await prune(marginalContext, refined, 'prune');
  let finalPrune: Awaited<ReturnType<typeof prune>> | undefined;

  if (first.state) {
    current = first.state;

    // §12.3 one cycle of parameter passes, then the pruning rule once more
    if (refiner.remaining > 0) {
      const rng = Rng.from(study.seedLabel, spec.window, 'refine', spec.arm, spec.family, 're-refine');
      const before = refiner.unique;
      const accepted = await parameterPasses('re-refine', 1, rng);

      cycles.push({ phase: 're-refine', cycle: 1, evaluated: refiner.unique - before, accepted });
    }

    finalPrune = await prune(marginalContext, current, 'final-prune');
    current = finalPrune.state ?? current;
  }

  // F-P on the result, walking back only through states that satisfied a pruning rule: the final prune's result, then
  // the first prune's result (a re-refined state before the final prune is never a fallback).
  let result: RefineState | undefined;
  const portfolioChecks: { key: string; dailyPercent: number }[] = [];
  const terminal = finalPrune && !finalPrune.state ? undefined : current;
  const candidates = terminal ? [terminal, ...(first.state && first.state !== terminal ? [first.state] : [])] : [];

  for (const state of candidates) {
    const [summary] = await evaluator.engines([portfolioSpec(evaluator, state.books, `refine-${spec.family}`)]);

    portfolioChecks.push({ key: state.key, dailyPercent: summary!.dailyPercent });

    if (summary!.dailyPercent <= study.portfolioDailyCeiling) {
      result = state;
      break;
    }
  }

  const stoppedBy = !first.state
    ? 'pruned to empty'
    : finalPrune && !finalPrune.state
      ? 'pruned to empty (final prune)'
      : !result
        ? 'F-P after pruning'
        : '';

  return {
    family: spec.family,
    arm: spec.arm,
    start: initial!.key,
    refined: refined.key,
    result: result?.key ?? '',
    resultState: result,
    startState: initial!,
    refinedState: refined,
    unique: refiner.unique,
    cycles,
    moves,
    pruneSteps: [...first.steps, ...(finalPrune?.steps ?? [])],
    pruneBlocked: first.blocked || (finalPrune?.blocked ?? false),
    portfolioChecks,
    walkedBack: result !== undefined && result !== terminal,
    stoppedBy
  };
};
