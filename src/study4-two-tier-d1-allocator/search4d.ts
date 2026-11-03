// Phase 4D: the mandatory joint optimizations (PROTOCOL.md §7.4, SEARCH_PLAN.md §5–6). One generic island-model,
// constrained NSGA-II over the group-structured genome (deep tier, shallow tier with its priority order, allocator),
// with experiment-specific spaces: 4D-A (B5 frozen), 4D-A0P (B5 frozen, P0 only), 4D-B (B5 incumbent or neighbourhood-
// reoptimized), 4D-B0 (its deep-only control), 4D-C (free deep composition), 4D-C0 (its deep-only control). Every
// evaluation runs the real shared-pool replay through the runner; budgets are evaluation counts of distinct genomes.
import { type Policy, policyOf } from './allocator.ts';
import { type BookSpec, type Bounds, gridKey, isB5Symbol } from './books.ts';
import { type Grid, b5Symbols } from './context.ts';
import {
  type Context,
  type Evaluation,
  type ExperimentClass,
  deepBroadBoundsOf,
  neighbourhoodOf,
  shallowBoundsOf
} from './evaluate.ts';
import type { Runner } from './pool.ts';
import {
  type Experiment,
  type Genome,
  gates,
  genomeKey,
  mutateGrid,
  mutatePolicy,
  policyKinds,
  randomGrid,
  remapGrid,
  rngOf
} from './space.ts';
import type { Rng } from '../optimizer/rng.ts';

export interface LibraryMember {
  symbol: string;
  grid: Grid;
  slot: string; // e.g. 'T1:L2'
  net: number; // standalone development net
  idleCleanNet: number;
}

export interface Scored {
  genome: Genome;
  evaluation: Evaluation;
  island: number;
  stage: 'initial' | 'evolution' | 'refinement' | 'selection';
}

export const experimentClass = (experiment: Experiment): ExperimentClass =>
  experiment === '4D-A' || experiment === '4D-A0P' ? 'frozenB5' : 'reoptimized';

export const primaryScore = (e: Evaluation) => (e.feasible ? e.delta : -1e12 - e.violation);

export const budgets: Record<Experiment, { initial: number; generations: number; refinement: number }> = {
  '4D-A': { initial: 40000, generations: 100, refinement: 40000 },
  '4D-A0P': { initial: 40000, generations: 100, refinement: 40000 },
  '4D-B': { initial: 40000, generations: 100, refinement: 40000 },
  '4D-B0': { initial: 40000, generations: 100, refinement: 40000 },
  '4D-C': { initial: 64000, generations: 170, refinement: 64000 },
  '4D-C0': { initial: 64000, generations: 170, refinement: 64000 }
};

export const islands = 4;
export const population = 400;

// ----- the experiment space -----

export interface Space {
  experiment: Experiment;
  ctx: Context;
  shallowSymbols: string[];
  deepSymbols: string[]; // 4D-C: symbols with a non-empty deep band
  library: Map<string, LibraryMember[]>;
  shallowAllowed: boolean;
  policyFixed?: Policy;
  gateFixed?: Policy['gate'];
}

const b5Book = (ctx: Context, symbol: string) => ctx.spec.b5.find((book) => book.symbol === symbol)!;

export const shallowBook = (symbol: string, grid: Grid, origin: string): BookSpec => ({
  id: `S:${symbol}:${gridKey(grid)}`,
  symbol,
  tier: 'shallow',
  grid,
  origin
});

export const deepBook = (symbol: string, grid: Grid, origin: string, mode: 'neighbourhood' | 'broad'): BookSpec => ({
  id: `D:${symbol}:${gridKey(grid)}`,
  symbol,
  tier: 'deep',
  grid,
  origin,
  deepMode: mode
});

export const makeSpace = (experiment: Experiment, ctx: Context, library: LibraryMember[]): Space => {
  const shallowSymbols = ctx.spec.symbols.filter((info) => !info.shallow.empty).map((info) => info.symbol);
  const deepSymbols = ctx.spec.symbols.filter((info) => !info.deepBroad.empty).map((info) => info.symbol);
  const bySymbol = new Map<string, LibraryMember[]>();

  for (const member of library) {
    bySymbol.set(member.symbol, [...(bySymbol.get(member.symbol) ?? []), member]);
  }

  return {
    experiment,
    ctx,
    shallowSymbols,
    deepSymbols,
    library: bySymbol,
    shallowAllowed: experiment !== '4D-B0' && experiment !== '4D-C0',
    policyFixed: experiment === '4D-B0' || experiment === '4D-C0' ? policyOf('P0') : undefined,
    gateFixed: experiment === '4D-B0' || experiment === '4D-C0' ? 'G0' : undefined
  };
};

const pick = <T>(rng: Rng, items: readonly T[]) => items[rng.int(items.length)]!;

const randomShallow = (space: Space, rng: Rng, symbol: string, origin: string): BookSpec => {
  const bounds = shallowBoundsOf(space.ctx, symbol)!;
  const members = space.library.get(symbol) ?? [];
  const grid = members.length > 0 && rng.next() < 0.5 ? pick(rng, members).grid : randomGrid(rng, bounds);

  return shallowBook(symbol, grid, origin);
};

const policyFor = (space: Space, rng: Rng, index?: number): Policy => {
  if (space.policyFixed) {
    return space.policyFixed;
  }

  const kind =
    space.experiment === '4D-A0P'
      ? 'P0'
      : policyKinds[index !== undefined ? index % policyKinds.length : rng.int(policyKinds.length)]!;
  const gateIndex = rng.int(gates.length + 2); // G0, G1, G1d, G2 × 3 λ

  return policyOf(kind, {
    budget: kind === 'P3' ? 250 * rng.int(21) : 0,
    filter: kind === 'P3' && rng.next() < 0.5 ? 'deep' : 'any',
    deadline: kind === 'P4' ? rng.int(2) : 0,
    gate: gateIndex < 3 ? (['G0', 'G1', 'G1d'] as const)[gateIndex]! : 'G2',
    lambda: gateIndex < 3 ? 0.75 : ([0.5, 0.75, 0.9] as const)[gateIndex - 3]!
  });
};

const randomDeepB = (space: Space, rng: Rng, origin: string): BookSpec[] =>
  b5Symbols.map((symbol) =>
    rng.next() < 0.5
      ? { ...b5Book(space.ctx, symbol) }
      : deepBook(symbol, randomGrid(rng, neighbourhoodOf(space.ctx, symbol)), origin, 'neighbourhood')
  );

const randomDeepC = (space: Space, rng: Rng, size: number, origin: string): BookSpec[] => {
  const chosen = new Set<string>();
  const books: BookSpec[] = [];

  for (let attempt = 0; books.length < size && attempt < 200; attempt++) {
    const fromB5 = rng.next() < 0.5;
    const symbol = fromB5 ? pick(rng, b5Symbols) : pick(rng, space.deepSymbols);

    if (chosen.has(symbol)) {
      continue;
    }

    if (isB5Symbol(symbol) && rng.next() < 0.5) {
      chosen.add(symbol);
      books.push({ ...b5Book(space.ctx, symbol) });
      continue;
    }

    const bounds = deepBroadBoundsOf(space.ctx, symbol);

    if (!bounds) {
      continue;
    }

    chosen.add(symbol);
    books.push(deepBook(symbol, randomGrid(rng, bounds), origin, 'broad'));
  }

  return books;
};

// The initial design's symbol rotation: a shuffled cycle through every eligible shallow symbol, so each appears in at
// least ⌊books / symbols⌋ initial books.
export const rotation = (symbols: readonly string[], rng: Rng) => {
  const order = [...symbols];

  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);

    [order[i], order[j]] = [order[j]!, order[i]!];
  }

  let next = 0;

  return () => order[next++ % order.length]!;
};

export const initialGenome = (
  space: Space,
  rng: Rng,
  index: number,
  origin: string,
  nextSymbol: () => string
): Genome => {
  const { experiment, ctx } = space;
  const cardinality = space.shallowAllowed ? index % 5 : 0;
  const shallow: BookSpec[] = [];

  for (let j = 0; j < cardinality; j++) {
    shallow.push(randomShallow(space, rng, nextSymbol(), origin));
  }

  const deep =
    experiment === '4D-B' || experiment === '4D-B0'
      ? randomDeepB(space, rng, origin)
      : experiment === '4D-C' || experiment === '4D-C0'
        ? randomDeepC(space, rng, 1 + (Math.floor(index / 5) % 6), origin)
        : ctx.spec.b5.map((book) => ({ ...book }));

  return normalize(space, { deep, shallow, policy: policyFor(space, rng, Math.floor(index / 30)) });
};

// Dedupe books, keep the cardinality caps and the fixed parts of the experiment.
export const normalize = (space: Space, genome: Genome): Genome => {
  const seen = new Set<string>();
  const shallow = genome.shallow.filter((book) => {
    if (seen.has(book.id) || !shallowBoundsOf(space.ctx, book.symbol)) {
      return false;
    }

    seen.add(book.id);
    return true;
  });
  const deepSeen = new Set<string>();
  const deep = genome.deep.filter((book) => {
    if (deepSeen.has(book.symbol)) {
      return false;
    }

    deepSeen.add(book.symbol);
    return true;
  });

  return {
    deep: deep.length > 0 ? deep : space.ctx.spec.b5.map((book) => ({ ...book })),
    shallow: space.shallowAllowed ? shallow.slice(0, 4) : [],
    policy: space.policyFixed ?? (space.gateFixed ? { ...genome.policy, gate: space.gateFixed } : genome.policy)
  };
};

const boundsOfBook = (space: Space, book: BookSpec): Bounds | undefined =>
  book.tier === 'shallow'
    ? shallowBoundsOf(space.ctx, book.symbol)
    : book.deepMode === 'neighbourhood'
      ? neighbourhoodOf(space.ctx, book.symbol)
      : book.deepMode === 'broad'
        ? deepBroadBoundsOf(space.ctx, book.symbol)
        : undefined;

const searchedBooks = (genome: Genome) => [...genome.shallow, ...genome.deep.filter((book) => book.origin !== 'B5')];

export const mutate = (space: Space, rng: Rng, parent: Genome, origin: string): Genome => {
  const g: Genome = {
    deep: parent.deep.map((b) => ({ ...b })),
    shallow: parent.shallow.map((b) => ({ ...b })),
    policy: { ...parent.policy }
  };
  const { experiment, ctx } = space;
  const ops: (() => void)[] = [];
  const searched = searchedBooks(g);

  if (searched.length > 0) {
    ops.push(() => {
      const book = pick(rng, searched);
      const bounds = boundsOfBook(space, book)!;
      const grid = mutateGrid(book.grid, rng, bounds, 1 + rng.int(3), 3);
      const replacement =
        book.tier === 'shallow'
          ? shallowBook(book.symbol, grid, origin)
          : deepBook(book.symbol, grid, origin, book.deepMode!);

      if (book.tier === 'shallow') {
        g.shallow[g.shallow.indexOf(book)] = replacement;
      } else {
        g.deep[g.deep.indexOf(book)] = replacement;
      }
    });
  }

  if (space.shallowAllowed) {
    if (g.shallow.length > 0) {
      ops.push(() => {
        const index = rng.int(g.shallow.length);
        const book = g.shallow[index]!;
        const symbol = pick(rng, space.shallowSymbols);
        const grid = remapGrid(book.grid, shallowBoundsOf(ctx, book.symbol)!, shallowBoundsOf(ctx, symbol)!);

        g.shallow[index] = shallowBook(symbol, grid, origin);
      });
      ops.push(() => {
        g.shallow.splice(rng.int(g.shallow.length), 1);
      });
    }

    if (g.shallow.length < 4) {
      ops.push(() => {
        g.shallow.push(randomShallow(space, rng, pick(rng, space.shallowSymbols), origin));
      });
    }

    if (g.shallow.length >= 2) {
      ops.push(() => {
        const a = rng.int(g.shallow.length);
        const b = (a + 1 + rng.int(g.shallow.length - 1)) % g.shallow.length;

        [g.shallow[a], g.shallow[b]] = [g.shallow[b]!, g.shallow[a]!];
      });
    }
  }

  if (!space.policyFixed) {
    ops.push(() => {
      const next =
        experiment === '4D-A0P'
          ? { ...g.policy, gate: policyFor(space, rng).gate, lambda: policyFor(space, rng).lambda }
          : mutatePolicy(g.policy, rng);

      g.policy = experiment === '4D-A0P' ? policyOf('P0', { gate: next.gate, lambda: next.lambda }) : next;
    });
  }

  if (experiment === '4D-B' || experiment === '4D-B0') {
    ops.push(() => {
      const symbol = pick(rng, b5Symbols);
      const index = g.deep.findIndex((book) => book.symbol === symbol);
      const book = g.deep[index]!;

      g.deep[index] =
        book.origin === 'B5'
          ? deepBook(
              symbol,
              mutateGrid(book.grid, rng, neighbourhoodOf(ctx, symbol), 1 + rng.int(3), 3),
              origin,
              'neighbourhood'
            )
          : { ...b5Book(ctx, symbol) };
    });
  }

  if (experiment === '4D-C' || experiment === '4D-C0') {
    ops.push(() => {
      const r = rng.next();

      if (r < 0.35 && g.deep.length < 6) {
        const extra = randomDeepC(space, rng, 1, origin).filter(
          (book) => !g.deep.some((d) => d.symbol === book.symbol)
        );

        g.deep.push(...extra);
      } else if (r < 0.6 && g.deep.length > 1) {
        g.deep.splice(rng.int(g.deep.length), 1);
      } else {
        const index = rng.int(g.deep.length);
        const book = g.deep[index]!;

        if (isB5Symbol(book.symbol) && book.origin === 'B5') {
          const bounds = deepBroadBoundsOf(ctx, book.symbol);

          if (bounds) {
            g.deep[index] = deepBook(book.symbol, randomGrid(rng, bounds), origin, 'broad');
          }
        } else if (isB5Symbol(book.symbol)) {
          g.deep[index] = { ...b5Book(ctx, book.symbol) };
        } else {
          const replacement = randomDeepC(space, rng, 1, origin).filter(
            (d) => !g.deep.some((other) => other.symbol === d.symbol)
          );

          if (replacement.length > 0) {
            g.deep[index] = replacement[0]!;
          }
        }
      }
    });
  }

  pick(rng, ops)();
  return normalize(space, g);
};

export const crossover = (space: Space, rng: Rng, a: Genome, b: Genome): Genome => {
  const pool = [...a.shallow, ...b.shallow];
  const size = Math.min(
    4,
    Math.max(a.shallow.length, b.shallow.length) === 0
      ? 0
      : Math.min(a.shallow.length, b.shallow.length) + rng.int(Math.abs(a.shallow.length - b.shallow.length) + 1)
  );
  const shallow: BookSpec[] = [];

  while (shallow.length < size && pool.length > 0) {
    shallow.push(pool.splice(rng.int(pool.length), 1)[0]!);
  }

  let deep: BookSpec[];

  if (space.experiment === '4D-B' || space.experiment === '4D-B0') {
    deep = b5Symbols.map((symbol) => ({ ...(rng.next() < 0.5 ? a : b).deep.find((book) => book.symbol === symbol)! }));
  } else if (space.experiment === '4D-C' || space.experiment === '4D-C0') {
    const union = [...a.deep, ...b.deep];
    const target = Math.min(
      6,
      Math.max(1, Math.min(a.deep.length, b.deep.length) + rng.int(Math.abs(a.deep.length - b.deep.length) + 1))
    );

    deep = [];

    while (deep.length < target && union.length > 0) {
      const book = union.splice(rng.int(union.length), 1)[0]!;

      if (!deep.some((other) => other.symbol === book.symbol)) {
        deep.push({ ...book });
      }
    }
  } else {
    deep = a.deep.map((book) => ({ ...book }));
  }

  return normalize(space, { deep, shallow, policy: { ...(rng.next() < 0.5 ? a : b).policy } });
};

// ----- constrained non-dominated sorting -----

const objectives = (cls: ExperimentClass, e: Evaluation) => [
  e.delta,
  -e.minuteDD,
  cls === 'frozenB5' ? e.pnlWeighted : e.retention
];

const dominates = (cls: ExperimentClass, x: Evaluation, y: Evaluation) => {
  if (x.feasible !== y.feasible) {
    return x.feasible;
  }

  if (!x.feasible) {
    return x.violation < y.violation;
  }

  const ox = objectives(cls, x);
  const oy = objectives(cls, y);
  let better = false;

  for (let i = 0; i < ox.length; i++) {
    if (ox[i]! < oy[i]!) {
      return false;
    }

    if (ox[i]! > oy[i]!) {
      better = true;
    }
  }

  return better;
};

export const rankAndCrowd = (cls: ExperimentClass, items: Scored[]) => {
  const n = items.length;
  const rank = new Int32Array(n);
  const dominatedBy = new Int32Array(n);
  const dominating: number[][] = Array.from({ length: n }, () => []);
  let front: number[] = [];

  for (let p = 0; p < n; p++) {
    for (let q = p + 1; q < n; q++) {
      if (dominates(cls, items[p]!.evaluation, items[q]!.evaluation)) {
        dominating[p]!.push(q);
        dominatedBy[q]!++;
      } else if (dominates(cls, items[q]!.evaluation, items[p]!.evaluation)) {
        dominating[q]!.push(p);
        dominatedBy[p]!++;
      }
    }
  }

  for (let p = 0; p < n; p++) {
    if (dominatedBy[p] === 0) {
      front.push(p);
    }
  }

  const fronts: number[][] = [];
  let level = 0;

  while (front.length > 0) {
    fronts.push(front);

    const next: number[] = [];

    for (const p of front) {
      rank[p] = level;

      for (const q of dominating[p]!) {
        dominatedBy[q]!--;

        if (dominatedBy[q] === 0) {
          next.push(q);
        }
      }
    }

    front = next;
    level++;
  }

  const crowd = new Float64Array(n);

  for (const f of fronts) {
    for (let m = 0; m < 3; m++) {
      const sorted = [...f].sort(
        (a, b) => objectives(cls, items[a]!.evaluation)[m]! - objectives(cls, items[b]!.evaluation)[m]!
      );
      const lo = objectives(cls, items[sorted[0]!]!.evaluation)[m]!;
      const hi = objectives(cls, items[sorted.at(-1)!]!.evaluation)[m]!;

      crowd[sorted[0]!] = Infinity;
      crowd[sorted.at(-1)!] = Infinity;

      for (let i = 1; i < sorted.length - 1; i++) {
        crowd[sorted[i]!]! +=
          hi > lo
            ? (objectives(cls, items[sorted[i + 1]!]!.evaluation)[m]! -
                objectives(cls, items[sorted[i - 1]!]!.evaluation)[m]!) /
              (hi - lo)
            : 0;
      }
    }
  }

  return { rank, crowd, fronts };
};

// 2-D hypervolume of the feasible front in (Δnet ≥ 0, minute DD ≤ $35,000).
export const hypervolume = (items: Evaluation[]) => {
  const points = items
    .filter((e) => e.feasible && e.delta > 0 && e.minuteDD < 35000)
    .map((e) => [e.delta, e.minuteDD] as const)
    .sort((a, b) => b[0] - a[0]);
  let volume = 0;
  let bestDD = 35000;

  for (const [delta, dd] of points) {
    if (dd < bestDD) {
      volume += delta * (bestDD - dd);
      bestDD = dd;
    }
  }

  return volume;
};

// ----- the search -----

export interface SearchRecord {
  experiment: Experiment;
  budget: {
    initial: number;
    generations: number;
    refinement: number;
    population: number;
    islands: number;
    scale: number;
  };
  evaluated: number;
  duplicates: number;
  roleFailures: number;
  feasible: number;
  perIsland: { island: number; initial: number; evolution: number; refinement: number; generations: number }[];
  extended: boolean;
  hypervolume: number[][]; // per island, per generation
  bestByGeneration: number[][];
}

export const runSearch = async (
  space: Space,
  runner: Runner,
  window: string,
  log: (line: string) => void = () => {},
  scale = 1 // < 1 only in synthetic smoke tests
): Promise<{ all: Scored[]; record: SearchRecord }> => {
  const { experiment } = space;
  const cls = experimentClass(experiment);
  const full = budgets[experiment];
  const budget = {
    initial: Math.max(islands, Math.round(full.initial * scale)),
    generations: Math.max(4, Math.round(full.generations * scale)),
    refinement: Math.max(1, Math.round(full.refinement * scale))
  };
  const populationSize = scale < 1 ? Math.max(8, Math.round(population * scale)) : population;
  const all: Scored[] = [];
  const byKey = new Map<string, Scored>();
  let duplicates = 0;
  const perIsland: SearchRecord['perIsland'] = [];
  const hv: number[][] = [];
  const bestByGeneration: number[][] = [];

  const evaluate = async (genomes: Genome[], island: number, stage: Scored['stage']) => {
    const fresh: Genome[] = [];
    const freshKeys = new Set<string>();

    for (const genome of genomes) {
      const key = genomeKey(genome);

      if (byKey.has(key) || freshKeys.has(key)) {
        duplicates++;
        continue;
      }

      freshKeys.add(key);
      fresh.push(genome);
    }

    const results = await runner.genomes(fresh, cls);
    const scored = fresh.map((genome, index) => ({ genome, evaluation: results[index]!, island, stage }));

    for (const item of scored) {
      byKey.set(item.evaluation.key, item);
      all.push(item);
    }

    return scored;
  };

  // generate n distinct, not yet evaluated genomes
  const distinct = (n: number, make: (attempt: number) => Genome) => {
    const out: Genome[] = [];
    const keys = new Set<string>();

    for (let attempt = 0; out.length < n && attempt < n * 20; attempt++) {
      const genome = make(attempt);
      const key = genomeKey(genome);

      if (!byKey.has(key) && !keys.has(key)) {
        keys.add(key);
        out.push(genome);
      }
    }

    return out;
  };

  const islandRuns = Array.from({ length: islands }, (_, island) => island);
  let extended = false;

  // islands run one after another (each uses every worker); their results are pooled for selection
  const islandPopulations: Scored[][] = [];

  for (const island of islandRuns) {
    const rng = rngOf('4D', window, experiment, 'island', island);
    const initialN = budget.initial / islands;
    const nextSymbol = rotation(space.shallowSymbols, rng);
    const initial = await evaluate(
      distinct(initialN, (attempt) =>
        initialGenome(space, rng, island * initialN + attempt, `${experiment}:${window}:i${island}`, nextSymbol)
      ),
      island,
      'initial'
    );
    let populationNow = [...initial];
    const hvTrace: number[] = [];
    const bestTrace: number[] = [];
    const generations = budget.generations;
    let evolved = 0;

    const select = (items: Scored[]) => {
      const { rank, crowd } = rankAndCrowd(cls, items);
      const order = items.map((_, index) => index).sort((a, b) => rank[a]! - rank[b]! || crowd[b]! - crowd[a]!);

      return { order, rank, crowd };
    };

    // start from the best `population` of the initial design
    populationNow = select(populationNow)
      .order.slice(0, populationSize)
      .map((index) => populationNow[index]!);

    for (let generation = 0; generation < generations; generation++) {
      const { rank, crowd } = rankAndCrowd(cls, populationNow);
      const tournament = () => {
        const a = rng.int(populationNow.length);
        const b = rng.int(populationNow.length);

        return rank[a]! < rank[b]! || (rank[a] === rank[b] && crowd[a]! >= crowd[b]!)
          ? populationNow[a]!
          : populationNow[b]!;
      };
      const children = distinct(populationSize, () => {
        const origin = `${experiment}:${window}:i${island}:g${generation}`;
        const parent = tournament();
        const base = rng.next() < 0.6 ? crossover(space, rng, parent.genome, tournament().genome) : parent.genome;

        return mutate(space, rng, base, origin);
      });
      const evaluatedChildren = await evaluate(children, island, 'evolution');

      evolved += evaluatedChildren.length;

      const merged = [...populationNow, ...evaluatedChildren];
      const { order } = select(merged);

      populationNow = order.slice(0, populationSize).map((index) => merged[index]!);
      hvTrace.push(hypervolume(populationNow.map((item) => item.evaluation)));

      const best = Math.max(...populationNow.map((item) => primaryScore(item.evaluation)));

      bestTrace.push(best);

      if (generation % 10 === 0) {
        log(
          `${experiment} ${window} island ${island} gen ${generation}: evaluated ${all.length}, best ${best.toFixed(0)}, hv ${hvTrace.at(-1)!.toExponential(3)}`
        );
      }
    }

    islandPopulations.push(populationNow);
    hv.push(hvTrace);
    bestByGeneration.push(bestTrace);
    perIsland.push({ island, initial: initial.length, evolution: evolved, refinement: 0, generations });
  }

  // the predeclared training-only extension: the pooled best feasible score improved by more than $5,000 during the
  // last 25% of the generations → every island continues for 50% more generations
  {
    const q = Math.floor(budget.generations * 0.75) - 1;
    const before = Math.max(...bestByGeneration.map((trace) => trace[q] ?? -Infinity));
    const after = Math.max(...bestByGeneration.map((trace) => trace.at(-1) ?? -Infinity));

    if (after > 0 && after - Math.max(0, before) > 5000) {
      extended = true;
      log(
        `${experiment} ${window}: best improved ${(after - Math.max(0, before)).toFixed(0)} in the last quarter; extension +50%`
      );
    }
  }

  if (extended) {
    for (const island of islandRuns) {
      const rng = rngOf('4D', window, experiment, 'island', island, 'extension');
      let populationNow = islandPopulations[island]!;
      const extra = Math.floor(budget.generations / 2);

      for (let generation = 0; generation < extra; generation++) {
        const { rank, crowd } = rankAndCrowd(cls, populationNow);
        const tournament = () => {
          const a = rng.int(populationNow.length);
          const b = rng.int(populationNow.length);

          return rank[a]! < rank[b]! || (rank[a] === rank[b] && crowd[a]! >= crowd[b]!)
            ? populationNow[a]!
            : populationNow[b]!;
        };
        const children = distinct(populationSize, () => {
          const parent = tournament();
          const base = rng.next() < 0.6 ? crossover(space, rng, parent.genome, tournament().genome) : parent.genome;

          return mutate(space, rng, base, `${experiment}:${window}:i${island}:x${generation}`);
        });
        const evaluatedChildren = await evaluate(children, island, 'evolution');
        const merged = [...populationNow, ...evaluatedChildren];
        const { rank: r2, crowd: c2 } = rankAndCrowd(cls, merged);
        const order = merged.map((_, index) => index).sort((a, b) => r2[a]! - r2[b]! || c2[b]! - c2[a]!);

        populationNow = order.slice(0, populationSize).map((index) => merged[index]!);
        perIsland[island]!.evolution += evaluatedChildren.length;
        hv[island]!.push(hypervolume(populationNow.map((item) => item.evaluation)));
        bestByGeneration[island]!.push(Math.max(...populationNow.map((item) => primaryScore(item.evaluation))));
      }

      perIsland[island]!.generations += extra;
    }
  }

  // refinement: a floor of 100 one-coordinate neighbours around the best of every cell, then the 50 best equally
  const rngR = rngOf('4D', window, experiment, 'refinement');
  const cellOf = (g: Genome) =>
    `${g.shallow.length}|${g.policy.kind}|${g.policy.gate}${g.policy.gate === 'G2' ? g.policy.lambda : ''}`;
  const bestByCell = new Map<string, Scored>();

  for (const item of all) {
    const cell = cellOf(item.genome);
    const current = bestByCell.get(cell);

    if (!current || primaryScore(item.evaluation) > primaryScore(current.evaluation)) {
      bestByCell.set(cell, item);
    }
  }

  // A neighbour at a radius: 1 = one coordinate ±1..2 units (the plan's refinement step), 2 = two coordinates ±1..2,
  // 3 = 1–3 coordinates ±1..3, ≥ 4 = any structural mutation of the target (amendment A4: used only when the smaller
  // neighbourhoods of the targets are exhausted, so that the refinement floor is always spent).
  const neighbour = (g: Genome, origin: string, radius = 1) => {
    const searched = searchedBooks(g);

    if (radius >= 4) {
      return mutate(space, rngR, g, origin);
    }

    if (searched.length === 0 || (g.policy.kind === 'P3' && rngR.next() < 0.2)) {
      if (g.policy.kind === 'P3') {
        return normalize(space, {
          ...g,
          policy: {
            ...g.policy,
            budget: Math.max(
              0,
              Math.min(5000, g.policy.budget + (rngR.next() < 0.5 ? -250 : 250) * (1 + rngR.int(radius)))
            )
          }
        });
      }

      return mutate(space, rngR, g, origin);
    }

    const book = pick(rngR, searched);
    const bounds = boundsOfBook(space, book)!;
    const grid =
      radius === 1
        ? mutateGrid(book.grid, rngR, bounds, 1, 2)
        : radius === 2
          ? mutateGrid(book.grid, rngR, bounds, 2, 2)
          : mutateGrid(book.grid, rngR, bounds, 1 + rngR.int(3), 3);
    const replacement =
      book.tier === 'shallow'
        ? shallowBook(book.symbol, grid, origin)
        : deepBook(book.symbol, grid, origin, book.deepMode!);

    return normalize(space, {
      deep: g.deep.map((b) => (b === book ? replacement : b)),
      shallow: g.shallow.map((b) => (b === book ? replacement : b)),
      policy: g.policy
    });
  };

  // n distinct new neighbours of the targets (round robin), escalating the radius when a neighbourhood is exhausted
  const fill = async (targets: Genome[], n: number, origin: string) => {
    let done = 0;

    for (let radius = 1; done < n && radius <= 8 && targets.length > 0; radius++) {
      const jobs = distinct(n - done, (attempt) => neighbour(targets[attempt % targets.length]!, origin, radius));

      done += (await evaluate(jobs, -1, 'refinement')).length;
    }

    return done;
  };

  // the floor of 100 per cell, then the 50 best share the rest, then (if still short) the 200 and 1,000 best; the target
  // is the whole experiment floor (initial + every planned generation, extension included, + refinement), so any
  // shortfall of the earlier stages is spent here too (amendment A4)
  const plannedGenerations = budget.generations + (extended ? Math.floor(budget.generations / 2) : 0);
  const floorTotal = budget.initial + plannedGenerations * populationSize * islands + budget.refinement;
  const refinementTarget = Math.max(budget.refinement, floorTotal - all.length);
  let refinementDone = 0;

  for (const [, item] of [...bestByCell.entries()].sort()) {
    if (refinementDone >= refinementTarget) {
      break;
    }

    refinementDone += await fill(
      [item.genome],
      Math.min(100, refinementTarget - refinementDone),
      `${experiment}:${window}:r-cell`
    );
  }

  for (const width of [50, 200, 1000]) {
    if (refinementDone >= refinementTarget) {
      break;
    }

    const targets = [...all]
      .sort((a, b) => primaryScore(b.evaluation) - primaryScore(a.evaluation))
      .slice(0, width)
      .map((item) => item.genome);

    refinementDone += await fill(targets, refinementTarget - refinementDone, `${experiment}:${window}:r-top${width}`);
  }

  const record: SearchRecord = {
    experiment,
    budget: { ...budget, population: populationSize, islands, scale },
    evaluated: all.length,
    duplicates,
    roleFailures: all.filter((item) => item.evaluation.roleFailure).length,
    feasible: all.filter((item) => item.evaluation.feasible).length,
    perIsland: perIsland.map((entry) => ({ ...entry, refinement: 0 })),
    extended,
    hypervolume: hv,
    bestByGeneration
  };

  return { all, record };
};
