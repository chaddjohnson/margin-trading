// Stage D (PROTOCOL.md §11): joint search of membership and pool-specific D1 vectors with the window's frozen ranking
// active (P1) in every evaluation. Arms S (standalone-seeded), I (independent) and, in the final window, B
// (incumbent-seeded, exploratory) each evolve their own population, archive and shortlist; the R1 and R2 branches use
// the same arm seeds and budgets. All (ranking × arm) loops advance in lockstep so that each batch fills the worker
// pool. Then per arm: promotion with neighbourhood draws A, one refinement cycle, assessment with independent draws B;
// the branch pick is the best assessed finalist of the nominable arms. One sealed record per (window, ranking).
import { gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import { Rng } from '../optimizer/rng.ts';
import {
  type ArmKey,
  type RankingKey,
  type Tier,
  type WindowKey,
  log,
  nowIso,
  rankingKeys,
  readJson,
  stageDir,
  study,
  tierFile
} from './context.ts';
import { doorRecordOf, trainingUniverse } from './data.ts';
import { readMateriality } from './diagnostic.ts';
import { type Book, type PoolMetrics, configKeyOf } from './evaluate.ts';
import { Evaluator, type PoolEvalRequest } from './evaluator.ts';
import { gitState, readSealed, sha256File, writeSealed } from './freeze.ts';
import { requireFrozen } from './guard.ts';
import { incumbentBooks } from './incumbents.ts';
import { type WindowInputs, allocationFor, assemblyC, readWindowInputs } from './inputs.ts';
import { defaultWorkerCount } from './pool.ts';
import { mutateAll, mutateOne, neighbour, randomVector } from './space.ts';

export const jointFile = (window: WindowKey, ranking: RankingKey) => stageDir('joint', window, ranking, 'JOINT.json');
export const jointArchiveFile = (window: WindowKey, ranking: RankingKey) =>
  stageDir('joint', window, ranking, 'archive.jsonl.gz');

export interface Scored {
  books: Book[];
  key: string;
  origin: string;
  metrics: PoolMetrics;
}

const sortBooks = (books: readonly Book[]) =>
  [...books].sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));

export const byScore = (a: Scored, b: Scored) =>
  b.metrics.score - a.metrics.score || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  return sorted.length % 2 === 1
    ? sorted[(sorted.length - 1) / 2]!
    : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
};

export const quantile = (values: readonly number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  const position = (sorted.length - 1) * q;
  const low = Math.floor(position);
  const high = Math.ceil(position);

  return sorted[low]! + (sorted[high]! - sorted[low]!) * (position - low);
};

export const compact = (scored: Scored) => ({
  key: scored.key,
  origin: scored.origin,
  members: scored.metrics.members,
  books: scored.metrics.books,
  score: scored.metrics.score,
  feasible: scored.metrics.feasible,
  net: scored.metrics.net,
  minuteDrawdown: scored.metrics.minuteDrawdown,
  lots: scored.metrics.lots,
  bestLot: scored.metrics.bestLot,
  preemptions: scored.metrics.preemptions,
  fundedKey: scored.metrics.fundedKey
});

// ----- one arm's evolutionary loop -----

interface Loop {
  ranking: RankingKey;
  arm: ArmKey;
  universe: string[];
  budget: number;
  population: Scored[];
  archive: Map<string, Scored>;
  rng: Rng;
  source: (symbol: string, rng: Rng, origin: string) => Book;
  generation: number;
}

const pick = <T>(items: readonly T[], rng: Rng) => items[rng.int(items.length)]!;

const pickDistinct = <T>(items: readonly T[], k: number, rng: Rng) => {
  const pool = [...items];
  const chosen: T[] = [];

  while (chosen.length < k && pool.length > 0) {
    chosen.push(pool.splice(rng.int(pool.length), 1)[0]!);
  }

  return chosen;
};

const tournament = (population: readonly Scored[], rng: Rng) => {
  const a = pick(population, rng);
  const b = pick(population, rng);

  return byScore(a, b) <= 0 ? a : b;
};

export const variation = (
  parent: Scored,
  other: () => Scored,
  universe: readonly string[],
  rng: Rng,
  source: Loop['source'],
  origin: string
): Book[] => {
  const ops = study.joint.operators;
  const roll = rng.next();
  const books = parent.books.map((book) => ({ ...book }));
  const members = new Set(books.map((book) => book.symbol));
  const outside = universe.filter((symbol) => !members.has(symbol));
  let threshold = 0;
  const choose = (key: keyof typeof ops) => {
    threshold += ops[key];
    return roll < threshold;
  };

  if (choose('paramOne')) {
    const index = rng.int(books.length);

    books[index] = {
      symbol: books[index]!.symbol,
      vector: mutateOne(books[index]!.vector, rng, origin, study.joint.paramOneMaxUnits)
    };
    return books;
  }

  if (choose('paramMulti')) {
    const index = rng.int(books.length);

    books[index] = { symbol: books[index]!.symbol, vector: mutateAll(books[index]!.vector, rng, origin) };
    return books;
  }

  if (choose('add') && books.length < study.joint.maxBooks && outside.length > 0) {
    return [...books, source(pick(outside, rng), rng, origin)];
  }

  if (choose('remove') && books.length > study.joint.minBooks) {
    books.splice(rng.int(books.length), 1);
    return books;
  }

  if (choose('swap') && outside.length > 0) {
    books[rng.int(books.length)] = source(pick(outside, rng), rng, origin);
    return books;
  }

  if (roll < threshold + ops.crossover) {
    const mate = other();
    const union = new Map<string, Book[]>();

    for (const book of [...books, ...mate.books]) {
      union.set(book.symbol, [...(union.get(book.symbol) ?? []), book]);
    }

    let child: Book[] = [];

    for (const [, options] of [...union].sort(([a], [b]) => (a < b ? -1 : 1))) {
      if (options.length === 2) {
        child.push(options[rng.int(2)]!);
      } else if (rng.int(2) === 0) {
        child.push(options[0]!);
      }
    }

    if (child.length === 0) {
      child = [books[0]!];
    }

    while (child.length > study.joint.maxBooks) {
      child.splice(rng.int(child.length), 1);
    }

    return child;
  }

  // an operator that could not apply (add at the size cap, remove at one book, …): a one-coordinate move instead
  const index = rng.int(books.length);

  books[index] = {
    symbol: books[index]!.symbol,
    vector: mutateOne(books[index]!.vector, rng, origin, study.joint.paramOneMaxUnits)
  };
  return books;
};

// ----- the stage -----

export const runJoint = async (window: WindowKey, options: { workers?: number } = {}) => {
  const guard = await requireFrozen();
  const todo: RankingKey[] = [];

  for (const ranking of rankingKeys) {
    if (await fs.pathExists(jointFile(window, ranking))) {
      log(`joint ${window}/${ranking}: sealed already, not rerun`);
    } else {
      todo.push(ranking);
    }
  }

  if (todo.length === 0) {
    return;
  }

  const startedAt = nowIso();
  const tier = (await readJson<{ tier: Tier }>(tierFile)).tier;
  const inputs = await readWindowInputs(window);
  const materiality = await readMateriality(window);
  const incumbents = await incumbentBooks();
  const arms = study.windows[window].arms;
  const extra = arms.includes('B') ? incumbents.B5.map((book) => book.symbol) : [];
  const loadSymbols = [...new Set([...inputs.universe, ...extra])].sort();

  if (inputs.universe.length === 0) {
    for (const ranking of todo) {
      await writeSealed(jointFile(window, ranking), {
        stage: 'D',
        window,
        ranking,
        startedAt,
        finishedAt: nowIso(),
        guard,
        note: 'the Stage D universe (survivors ∪ reserve) is empty: no joint search',
        arms: [],
        pick: null
      });
    }

    return;
  }

  const loaded = await trainingUniverse(window, { symbols: loadSymbols });
  const door = doorRecordOf('trainingUniverse', loaded, window);
  const evaluator = await Evaluator.create(loaded, options.workers ?? defaultWorkerCount());

  evaluator.poolChunk = 12;

  const minLots = study.joint.minLots[window];
  const evaluate = async (items: { ranking: RankingKey; books: Book[]; stage: string }[]) => {
    const requests: PoolEvalRequest[] = items.map((item) => ({
      books: item.books,
      costBps: study.principalCostBps,
      allocation: allocationFor(
        inputs,
        item.ranking,
        item.books.map((book) => book.symbol)
      ),
      minLots
    }));

    return evaluator.pools(requests);
  };

  const libraryOf = (symbol: string) =>
    inputs.library[symbol] && inputs.library[symbol]!.length > 0 ? inputs.library[symbol]! : undefined;
  const sources: Record<ArmKey, Loop['source']> = {
    S: (symbol, rng) => pick(libraryOf(symbol) ?? [inputs.representative[symbol]!], rng),
    I: (symbol, rng, origin) => ({ symbol, vector: randomVector(rng, origin) }),
    B: (symbol, rng) => {
      const library = libraryOf(symbol);

      return library ? pick(library, rng) : incumbents.B5.find((book) => book.symbol === symbol)!;
    }
  };

  // initial populations (paired across rankings: the same seed per arm)
  const initialOf = (ranking: RankingKey, arm: ArmKey, universe: string[]): { books: Book[]; origin: string }[] => {
    const rng = Rng.from(study.seedLabel, 'joint-init', window, arm);
    const out: { books: Book[]; origin: string }[] = [];
    const seen = new Set<string>();
    const push = (books: Book[], origin: string) => {
      const key = configKeyOf(books);

      if (books.length > 0 && !seen.has(key)) {
        seen.add(key);
        out.push({ books: sortBooks(books), origin });
      }
    };
    const randomSize = () =>
      Math.min(
        universe.length,
        study.joint.initialBooks[0] + rng.int(study.joint.initialBooks[1] - study.joint.initialBooks[0] + 1)
      );

    if (arm === 'S') {
      const c = assemblyC(inputs, ranking);

      if (c.length > 0) {
        push(c, `C_${ranking}`);
      }
    }

    if (arm === 'B') {
      push(incumbents.B4, 'B4');
      push(incumbents.B5, 'B5');
    }

    let attempts = 0;

    if (arm === 'B' && study.joint.population - 2 !== study.joint.incumbentMutants) {
      throw new Error('the incumbent arm holds B4, B5 and incumbentMutants mutants: the population must be their sum');
    }

    while (out.length < study.joint.population && attempts++ < study.joint.population * study.joint.attemptFactor) {
      if (arm === 'B') {
        const base = out.length % 2 === 0 ? incumbents.B5 : incumbents.B4;
        const parent = { books: base, key: configKeyOf(base), origin: 'incumbent', metrics: {} as PoolMetrics };
        const child = variation(parent, () => parent, universe, rng, sources.B, `init:B:${out.length}`);

        push(child, `mutant:${base === incumbents.B5 ? 'B5' : 'B4'}`);
        continue;
      }

      const members = pickDistinct(universe, randomSize(), rng);
      const books = members.map((symbol) => {
        if (arm === 'I') {
          return sources.I(symbol, rng, `init:I:${out.length}`);
        }

        const library = libraryOf(symbol) ?? [inputs.representative[symbol]!];

        return rng.int(2) === 0 || library.length === 1 ? library[0]! : pick(library.slice(1), rng);
      });

      push(books, `init:${arm}`);
    }

    return out;
  };

  const loops: Loop[] = [];

  for (const ranking of todo) {
    const share = materiality.find((entry) => entry.ranking === ranking)!.budgetShare;

    for (const arm of arms) {
      const universe = arm === 'B' ? loadSymbols : inputs.universe;

      loops.push({
        ranking,
        arm,
        universe,
        budget: Math.round(tier.jointBudget[window] * share),
        population: [],
        archive: new Map(),
        rng: Rng.from(study.seedLabel, 'joint', window, arm),
        source: sources[arm],
        generation: 0
      });
    }
  }

  const archiveRows: string[] = [];
  const record = (loop: Loop, scored: Scored, stage: string) => {
    loop.archive.set(scored.key, scored);
    archiveRows.push(
      JSON.stringify({ ranking: loop.ranking, arm: loop.arm, stage, generation: loop.generation, ...compact(scored) })
    );
  };

  // generation 0
  {
    const proposals = loops.flatMap((loop) =>
      initialOf(loop.ranking, loop.arm, loop.universe).map((item) => ({ loop, ...item }))
    );
    const metrics = await evaluate(proposals.map((p) => ({ ranking: p.loop.ranking, books: p.books, stage: 'init' })));

    proposals.forEach((proposal, index) => {
      const scored: Scored = {
        books: proposal.books,
        key: configKeyOf(proposal.books),
        origin: proposal.origin,
        metrics: metrics[index]!
      };

      record(proposal.loop, scored, 'init');
      proposal.loop.population.push(scored);
    });

    for (const loop of loops) {
      loop.population.sort(byScore);
    }
  }

  // generations until every loop has spent its budget
  for (;;) {
    const active = loops.filter((loop) => loop.archive.size < loop.budget);

    if (active.length === 0) {
      break;
    }

    const proposals: { loop: Loop; books: Book[]; origin: string }[] = [];

    for (const loop of active) {
      loop.generation++;

      const wanted = Math.min(study.joint.population, loop.budget - loop.archive.size);
      const fresh = new Set<string>();

      for (let child = 0; child < wanted; child++) {
        for (let attempt = 0; attempt < study.joint.attemptFactor; attempt++) {
          const origin = `g${loop.generation}:${child}`;
          const books = sortBooks(
            variation(
              tournament(loop.population, loop.rng),
              () => tournament(loop.population, loop.rng),
              loop.universe,
              loop.rng,
              loop.source,
              origin
            )
          );
          const key = configKeyOf(books);

          if (!loop.archive.has(key) && !fresh.has(key)) {
            fresh.add(key);
            proposals.push({ loop, books, origin });
            break;
          }
        }
      }
    }

    if (proposals.length === 0) {
      break; // every loop is out of new configurations (never expected)
    }

    const metrics = await evaluate(
      proposals.map((p) => ({ ranking: p.loop.ranking, books: p.books, stage: 'search' }))
    );
    const offspring = new Map<Loop, Scored[]>();

    proposals.forEach((proposal, index) => {
      const scored: Scored = {
        books: proposal.books,
        key: configKeyOf(proposal.books),
        origin: proposal.origin,
        metrics: metrics[index]!
      };

      record(proposal.loop, scored, 'search');
      offspring.set(proposal.loop, [...(offspring.get(proposal.loop) ?? []), scored]);
    });

    for (const loop of active) {
      loop.population = [...loop.population, ...(offspring.get(loop) ?? [])]
        .sort(byScore)
        .slice(0, study.joint.population);
    }

    if (loops[0]!.generation % 25 === 0) {
      log(
        `joint ${window}: generation ${loops[0]!.generation}, ${loops.map((loop) => `${loop.ranking}/${loop.arm} ${loop.archive.size}`).join(', ')}`
      );
    }
  }

  log(`joint ${window}: search done (${evaluator.poolEvals} evaluations, ${evaluator.traceBuilds} traces)`);

  // ----- promotion, refinement, assessment (per loop) -----

  const neighbourhood = async (
    items: { ranking: RankingKey; centre: Scored; stage: string; cls: 'N1' | 'N1A2'; draws: number }[]
  ) => {
    const flat = items.flatMap((item, i) =>
      Array.from({ length: item.draws }, (_, d) => ({
        i,
        ranking: item.ranking,
        books: neighbour(item.centre.books, item.stage, item.cls, d)
      }))
    );
    const metrics = await evaluate(flat.map((f) => ({ ranking: f.ranking, books: f.books, stage: 'neighbourhood' })));

    return items.map((_, i) => metrics.filter((__, index) => flat[index]!.i === i));
  };

  const summary = (draws: readonly PoolMetrics[]) => ({
    draws: draws.length,
    medianScore: median(draws.map((m) => m.score)),
    shareDrawdownOk: draws.filter((m) => m.minuteDrawdown <= study.joint.ddCeiling).length / Math.max(1, draws.length),
    netP10: quantile(
      draws.map((m) => m.net),
      0.1
    ),
    netP25: quantile(
      draws.map((m) => m.net),
      0.25
    ),
    netP50: quantile(
      draws.map((m) => m.net),
      0.5
    ),
    drawdownP90: quantile(
      draws.map((m) => m.minuteDrawdown),
      0.9
    ),
    drawdownMax: Math.max(...draws.map((m) => m.minuteDrawdown)),
    preemptionsMedian: median(draws.map((m) => m.preemptions.executed))
  });

  const promoted = new Map<Loop, Scored[]>();

  for (const loop of loops) {
    const list: Scored[] = [];
    const funded = new Set<string>();
    const memberships = new Map<string, number>();

    for (const scored of [...loop.archive.values()].sort(byScore)) {
      if (list.length >= study.joint.promotionTop || !scored.metrics.feasible) {
        break;
      }

      const membership = scored.metrics.members.join(',');

      if (
        funded.has(scored.metrics.fundedKey) ||
        (memberships.get(membership) ?? 0) >= study.joint.promotionSameMembership
      ) {
        continue;
      }

      funded.add(scored.metrics.fundedKey);
      memberships.set(membership, (memberships.get(membership) ?? 0) + 1);
      list.push(scored);
    }

    promoted.set(loop, list);
  }

  const promotionItems = loops.flatMap((loop) =>
    promoted.get(loop)!.map((centre) => ({
      loop,
      ranking: loop.ranking,
      centre,
      stage: `promotion:${window}:${loop.ranking}`,
      cls: 'N1' as const,
      draws: tier.promotionDraws
    }))
  );
  const promotionDraws = await neighbourhood(promotionItems);
  const promotionStats = promotionItems.map((item, i) => ({ item, stats: summary(promotionDraws[i]!) }));

  log(`joint ${window}: promotion done (${evaluator.poolEvals} evaluations)`);

  // keep the best 3 per loop by the promotion neighbourhood median
  const kept = new Map<Loop, { centre: Scored; promotion: ReturnType<typeof summary> }[]>();

  for (const loop of loops) {
    kept.set(
      loop,
      promotionStats
        .filter((entry) => entry.item.loop === loop)
        .sort((a, b) => b.stats.medianScore - a.stats.medianScore || byScore(a.item.centre, b.item.centre))
        .slice(0, study.joint.promotionKeep)
        .map((entry) => ({ centre: entry.item.centre, promotion: entry.stats }))
    );
  }

  // refinement: one cycle of single-coordinate moves per member and removals; accept the best if ≥ δ better
  const refineItems = loops.flatMap((loop) =>
    kept.get(loop)!.flatMap((entry, k) => {
      const moves: Book[][] = [];

      for (const book of entry.centre.books) {
        const rng = Rng.from(study.seedLabel, 'refine', window, loop.ranking, loop.arm, k, book.symbol);

        for (let m = 0; m < study.joint.refinementMoves; m++) {
          moves.push(
            sortBooks(
              entry.centre.books.map((other) =>
                other.symbol === book.symbol
                  ? {
                      symbol: other.symbol,
                      vector: mutateOne(other.vector, rng, `refine:${k}:${m}`, study.joint.paramOneMaxUnits)
                    }
                  : other
              )
            )
          );
        }

        if (entry.centre.books.length > 1) {
          moves.push(entry.centre.books.filter((other) => other.symbol !== book.symbol));
        }
      }

      return moves.map((books) => ({ loop, k, books }));
    })
  );
  const refineMetrics = await evaluate(
    refineItems.map((item) => ({ ranking: item.loop.ranking, books: item.books, stage: 'refine' }))
  );
  const refined = new Map<
    Loop,
    { centre: Scored; original: Scored; refinedBy: number; promotion: ReturnType<typeof summary> }[]
  >();

  for (const loop of loops) {
    refined.set(
      loop,
      kept.get(loop)!.map((entry, k) => {
        const candidates = refineItems
          .map((item, index) => ({ item, metrics: refineMetrics[index]! }))
          .filter(({ item }) => item.loop === loop && item.k === k)
          .map(({ item, metrics }) => ({
            books: item.books,
            key: configKeyOf(item.books),
            origin: `refine:${k}`,
            metrics
          }))
          .sort(byScore);
        const best = candidates[0];

        return best && best.metrics.score >= entry.centre.metrics.score + study.joint.refinementDelta
          ? {
              centre: best,
              original: entry.centre,
              refinedBy: best.metrics.score - entry.centre.metrics.score,
              promotion: entry.promotion
            }
          : { centre: entry.centre, original: entry.centre, refinedBy: 0, promotion: entry.promotion };
      })
    );
  }

  // assessment with independent draws B (N1) and B2 (N1 at double amplitude)
  const assessItems = loops.flatMap((loop) =>
    refined.get(loop)!.flatMap((entry, k) => [
      {
        loop,
        k,
        ranking: loop.ranking,
        centre: entry.centre,
        stage: `assessment:${window}:${loop.ranking}`,
        cls: 'N1' as const,
        draws: tier.assessmentDraws
      },
      {
        loop,
        k,
        ranking: loop.ranking,
        centre: entry.centre,
        stage: `assessment:${window}:${loop.ranking}`,
        cls: 'N1A2' as const,
        draws: tier.assessmentA2Draws
      }
    ])
  );
  const assessDraws = await neighbourhood(assessItems);

  log(`joint ${window}: assessment done (${evaluator.poolEvals} evaluations)`);

  await evaluator.close();

  const archivePath = (ranking: RankingKey) => jointArchiveFile(window, ranking);

  for (const ranking of todo) {
    const rankingLoops = loops.filter((loop) => loop.ranking === ranking);
    const armRecords = rankingLoops.map((loop) => {
      const assessed = refined.get(loop)!.map((entry, k) => {
        const n1 =
          assessDraws[assessItems.findIndex((item) => item.loop === loop && item.k === k && item.cls === 'N1')]!;
        const a2 =
          assessDraws[assessItems.findIndex((item) => item.loop === loop && item.k === k && item.cls === 'N1A2')]!;

        return { ...entry, assessment: summary(n1), amplitude2: summary(a2) };
      });
      const finalist = [...assessed].sort(
        (a, b) => b.assessment.medianScore - a.assessment.medianScore || byScore(a.centre, b.centre)
      )[0];
      const archive = [...loop.archive.values()];
      const symbolCounts: Record<string, number> = {};
      const sizes: Record<string, number> = {};

      for (const scored of archive) {
        sizes[scored.metrics.books] = (sizes[scored.metrics.books] ?? 0) + 1;

        for (const symbol of scored.metrics.members) {
          symbolCounts[symbol] = (symbolCounts[symbol] ?? 0) + 1;
        }
      }

      return {
        arm: loop.arm,
        nominable: loop.arm !== 'B',
        budget: loop.budget,
        evaluations: archive.length,
        generations: loop.generation,
        universe: loop.universe,
        feasible: archive.filter((scored) => scored.metrics.feasible).length,
        coverage: { symbols: symbolCounts, sizes },
        top: archive.sort(byScore).slice(0, 20).map(compact),
        promoted: promotionStats
          .filter((entry) => entry.item.loop === loop)
          .map((entry) => ({ ...compact(entry.item.centre), promotion: entry.stats })),
        assessed: assessed.map((entry) => ({
          centre: { ...compact(entry.centre), books: entry.centre.books, metrics: entry.centre.metrics },
          original: entry.original.key,
          refinedBy: entry.refinedBy,
          promotion: entry.promotion,
          assessment: entry.assessment,
          amplitude2: entry.amplitude2
        })),
        finalist: finalist
          ? {
              key: finalist.centre.key,
              books: finalist.centre.books,
              metrics: finalist.centre.metrics,
              assessment: finalist.assessment
            }
          : null
      };
    });
    const nominable = armRecords
      .filter((arm) => arm.nominable && arm.finalist)
      .sort(
        (a, b) =>
          b.finalist!.assessment.medianScore - a.finalist!.assessment.medianScore ||
          b.finalist!.metrics.score - a.finalist!.metrics.score ||
          (a.finalist!.key < b.finalist!.key ? -1 : 1)
      );
    const pick = nominable[0]
      ? {
          arm: nominable[0].arm,
          key: nominable[0].finalist!.key,
          books: nominable[0].finalist!.books,
          metrics: nominable[0].finalist!.metrics,
          assessment: nominable[0].finalist!.assessment
        }
      : null;
    const rows = archiveRows.filter((row) => row.startsWith(`{"ranking":"${ranking}"`));

    await fs.outputFile(archivePath(ranking), gzipSync(`${rows.join('\n')}\n`));

    const sealed = await writeSealed(jointFile(window, ranking), {
      stage: 'D',
      window,
      ranking,
      rankingBodyHash: inputs.rankings[ranking].bodyHash,
      startedAt,
      finishedAt: nowIso(),
      guard,
      git: gitState(),
      door,
      tier: tier.key,
      budgetShare: materiality.find((entry) => entry.ranking === ranking)!.budgetShare,
      universe: inputs.universe,
      survivors: inputs.survivors,
      reserve: inputs.reserve,
      arms: armRecords,
      pick,
      archive: { file: archivePath(ranking), sha256: await sha256File(archivePath(ranking)), rows: rows.length },
      counters: { poolEvals: evaluator.poolEvals, traceBuilds: evaluator.traceBuilds, traceHits: evaluator.traceHits }
    });

    log(
      `joint ${window}/${ranking}: pick ${
        pick
          ? `${pick.arm} ${pick.key
              .split('|')
              .map((part) => part.split(':')[0])
              .join(' ')}`
          : 'none'
      }; sealed ${sealed.bodyHash.slice(0, 12)}`
    );
  }
};

export const readJoint = async (window: WindowKey, ranking: RankingKey) =>
  readSealed<{
    bodyHash: string;
    pick: { arm: ArmKey; key: string; books: Book[]; metrics: PoolMetrics } | null;
    arms: unknown[];
    [key: string]: unknown;
  }>(jointFile(window, ranking));

export type { WindowInputs };
