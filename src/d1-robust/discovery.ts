// Stage S4 (PROTOCOL.md §9): discovery of one arm on one round. Eight islands over the mixed genome with
// outcome-independent initial populations, (μ + λ) survival and binary tournaments by the arm's scalar ranking (no
// Pareto front, no drawdown or books objective), ring migration, a stall stop, and the predeclared coverage top-up of
// symbols the islands under-explored. Generations are evaluated in batches across all islands (in island order), so
// the worker pool is kept busy; every decision is taken on the main thread from seeded generators, in a fixed order.
import { Rng } from '../optimizer/rng.ts';
import { type Archive, type Entry, compareEntries } from './archive.ts';
import { type TierKey, log, study } from './context.ts';
import { type Genome, type GenomeSpace, type Operator, pickDistinct } from './genome.ts';
import type { Book } from './neighbourhood.ts';

export interface DiscoveryContext {
  space: GenomeSpace;
  archive: Archive;
  round: string;
  armLabel: string; // seed label of the arm ('unseeded', 'seeded'; fold arms J and Q share 'fold')
  budget: number; // configurations per arm (islands + top-up reserve)
  seededBooks?: Book[][]; // B1, B4, B5 for the seeded arm
  tier: TierKey;
  smoke?: { islandCap?: number }; // smaller budgets for the synthetic tests only
  stopAfter?: number; // the determinism re-run: stop once the archive holds this many evaluations
}

interface Individual {
  genome: Genome;
  entry: Entry;
}

const tournament = (ranked: Individual[], rng: Rng) => {
  const a = rng.int(ranked.length);
  const b = rng.int(ranked.length);

  return a < b ? ranked[a]! : ranked[b]!; // ranked is sorted best first: the lower index wins
};

export interface GenerationLog {
  generation: number;
  fresh: number;
  hits: number;
  attempts: number;
  operators: Partial<Record<Operator, number>>;
  feasible: number;
  best: string;
  cardinality: { min: number; median: number; max: number };
}

export class Island {
  readonly rng: Rng;
  population: Individual[] = [];
  generation = 0;
  active = true;
  stall = 0;
  stoppedBy = '';
  readonly generations: GenerationLog[] = [];
  readonly initial = { requested: 0, unique: 0, fresh: 0 };

  constructor(
    readonly key: string,
    readonly label: string,
    readonly ctx: DiscoveryContext,
    readonly cap: number,
    readonly populationSize: number,
    readonly required?: number // top-up islands: the symbol every genome must contain
  ) {
    this.rng = Rng.from(study.seedLabel, ctx.round, 'island', ctx.armLabel, key);
  }

  get fresh() {
    return this.ctx.archive.newCount(this.key);
  }

  ranked() {
    return [...this.population].sort((a, b) => compareEntries(a.entry, b.entry));
  }

  // Unique candidate genomes for one batch, against the population, earlier picks, the archive and `pending` keys
  // already proposed earlier in the same generation by another island.
  propose(genomes: Genome[], pending: Set<string>, stage: string, operator: (g: Genome) => string, generation: number) {
    const keys = new Set(this.population.map((individual) => individual.entry.key));
    const out: { genome: Genome; key: string; books: Book[]; meta: Entry['meta']; fresh: boolean }[] = [];
    let budget = this.cap - this.fresh;

    for (const genome of genomes) {
      if (budget <= 0) {
        break;
      }

      const key = this.ctx.space.keyOf(genome);

      if (keys.has(key)) {
        continue;
      }

      keys.add(key);

      const fresh = !this.ctx.archive.has(key) && !pending.has(key);

      if (fresh) {
        pending.add(key);
        budget--;
      }

      out.push({
        genome,
        key,
        books: this.ctx.space.booksOf(genome),
        meta: { stage, source: this.key, generation, operator: operator(genome) },
        fresh
      });
    }

    return out;
  }
}

const cardinalityOf = (population: Individual[]) => {
  const books = population.map((individual) => individual.entry.e.books).sort((a, b) => a - b);

  return { min: books[0] ?? 0, median: books[books.length >> 1] ?? 0, max: books.at(-1) ?? 0 };
};

// Children of one island for one generation (proposal only; evaluated in the batch).
const breed = (island: Island, pending: Set<string>) => {
  const { space } = island.ctx;
  const size = island.populationSize;
  const ranked = island.ranked();
  const children: { genome: Genome; operator: Operator }[] = [];
  const keys = new Set(island.population.map((individual) => individual.entry.key));
  let attempts = 0;
  let budget = island.cap - island.fresh;
  const proposals: ReturnType<Island['propose']> = [];

  while (children.length < size && attempts < study.islands.attemptFactor * size && budget > 0) {
    const first = tournament(ranked, island.rng);
    const second = tournament(ranked, island.rng);
    const pair =
      island.rng.next() < study.islands.crossoverProbability
        ? space.crossover(first.genome, second.genome, island.rng)
        : [space.clone(first.genome), space.clone(second.genome)];

    for (const child of pair) {
      if (children.length >= size || budget <= 0) {
        break;
      }

      attempts++;
      space.repair(child, [first.genome, second.genome], island.rng, island.required);

      const applied = space.applyOperator(child, space.drawOperator(island.rng), island.rng, island.required);
      const key = space.keyOf(child);

      if (keys.has(key)) {
        continue;
      }

      keys.add(key);
      children.push({ genome: child, operator: applied });

      const proposal = island.propose([child], pending, 'D', () => applied, island.generation + 1);

      for (const item of proposal) {
        if (item.fresh) {
          budget--;
        }
      }

      proposals.push(...proposal);
    }
  }

  return { proposals, attempts };
};

const stepAll = async (islands: Island[], stage: string) => {
  const pending = new Set<string>();
  const plans = islands.map((island) => (island.active ? breed(island, pending) : { proposals: [], attempts: 0 }));
  const requests = plans.flatMap((plan) =>
    plan.proposals.map((item) => ({ books: item.books, meta: { ...item.meta, stage } }))
  );
  const results = await islands[0]!.ctx.archive.evaluateBatch(requests);
  let cursor = 0;

  islands.forEach((island, i) => {
    const plan = plans[i]!;

    if (!island.active) {
      return;
    }

    island.generation++;

    const children: Individual[] = [];
    const operators: Partial<Record<Operator, number>> = {};
    let fresh = 0;
    let hits = 0;

    for (const item of plan.proposals) {
      const { entry } = results[cursor++]!;

      children.push({ genome: item.genome, entry });
      operators[item.meta.operator as Operator] = (operators[item.meta.operator as Operator] ?? 0) + 1;

      if (item.fresh) {
        fresh++;
      } else {
        hits++;
      }
    }

    island.population = [...island.population, ...children]
      .sort((a, b) => compareEntries(a.entry, b.entry))
      .slice(0, island.populationSize);
    island.stall = fresh === 0 ? island.stall + 1 : 0;
    island.generations.push({
      generation: island.generation,
      fresh,
      hits,
      attempts: plan.attempts,
      operators,
      feasible: island.population.filter((individual) => individual.entry.feasible).length,
      best: island.population[0]?.entry.key ?? '',
      cardinality: cardinalityOf(island.population)
    });

    if (island.cap - island.fresh <= 0) {
      island.active = false;
      island.stoppedBy = 'budget';
    } else if (island.stall >= study.islands.stallGenerations) {
      island.active = false;
      island.stoppedBy = `${study.islands.stallGenerations} generations without a new unique child`;
    }
  });
};

// Initial populations of all islands, evaluated in one batch.
const initializeAll = async (islands: Island[], seeds: Map<string, Genome[]>, stage: string) => {
  const pending = new Set<string>();
  const proposals = islands.map((island) => {
    const genomes = [...(seeds.get(island.key) ?? [])];
    const kind = study.islands.kinds.find((item) => item.key === island.key);
    const generate = (): Genome => {
      if (island.required !== undefined) {
        const genome = island.ctx.space.uniform(island.rng, 1, 5);

        genome.mask[island.required] = true;

        if (genome.mask.filter(Boolean).length > 5) {
          const others = genome.mask.flatMap((value, i) => (value && i !== island.required ? [i] : []));

          genome.mask[pickDistinct(others, 1, island.rng)[0]!] = false;
        }

        return genome;
      }

      return island.key === 'I6'
        ? island.ctx.space.stratified(island.rng, kind!.minBooks, kind!.maxBooks)
        : island.ctx.space.uniform(island.rng, kind?.minBooks ?? 1, kind?.maxBooks ?? 16);
    };
    // The seeds, then generated genomes, until populationSize distinct keys (before anything is marked pending).
    const distinct: Genome[] = [];
    const keys = new Set<string>();
    const consider = (genome: Genome) => {
      const key = island.ctx.space.keyOf(genome);

      if (!keys.has(key) && distinct.length < island.populationSize) {
        keys.add(key);
        distinct.push(genome);
      }
    };

    genomes.forEach(consider);

    for (let attempt = 0; distinct.length < island.populationSize && attempt < island.populationSize * 50; attempt++) {
      consider(generate());
    }

    island.initial.requested = genomes.length + distinct.length;

    return island.propose(distinct, pending, stage, () => 'init', 0);
  });
  const requests = proposals.flatMap((items) => items.map((item) => ({ books: item.books, meta: item.meta })));
  const results = await islands[0]!.ctx.archive.evaluateBatch(requests);
  let cursor = 0;

  islands.forEach((island, i) => {
    for (const item of proposals[i]!) {
      const { entry } = results[cursor++]!;

      island.population.push({ genome: item.genome, entry });
      island.initial.unique++;

      if (item.fresh) {
        island.initial.fresh++;
      }
    }
  });
};

// Ring migration I1 → I2 → … → I8 → I1: 4 genomes drawn from the source's best 12, replacing the destination's worst.
const migrate = (islands: Island[], generation: number, round: string, armLabel: string) => {
  const rng = Rng.from(study.seedLabel, round, 'migration', armLabel, generation);
  const migrants = islands.map((island) =>
    pickDistinct(island.ranked().slice(0, study.islands.migrantPool), study.islands.migrants, rng)
  );
  const moved: { from: string; to: string; keys: string[] }[] = [];

  islands.forEach((island, index) => {
    if (!island.active) {
      return;
    }

    const source = (index - 1 + islands.length) % islands.length;
    const present = new Set(island.population.map((individual) => individual.entry.key));
    const incoming = migrants[source]!.filter((individual) => !present.has(individual.entry.key));
    const keep = island.ranked().slice(0, island.population.length - incoming.length);

    island.population = [
      ...keep,
      ...incoming.map((individual) => ({ genome: island.ctx.space.clone(individual.genome), entry: individual.entry }))
    ];
    moved.push({ from: islands[source]!.key, to: island.key, keys: incoming.map((item) => item.entry.key) });
  });

  return { generation, moved };
};

const runIslands = async (islands: Island[], ctx: DiscoveryContext, migrationRing: boolean, label: string) => {
  const migrations: ReturnType<typeof migrate>[] = [];

  for (let generation = 1; islands.some((island) => island.active); generation++) {
    if (ctx.stopAfter !== undefined && ctx.archive.size >= ctx.stopAfter) {
      break;
    }

    await stepAll(islands, label);

    if (migrationRing && generation % study.islands.migrationInterval === 0) {
      migrations.push(migrate(islands, generation, ctx.round, ctx.armLabel));
    }

    if (generation % 8 === 0) {
      ctx.archive.flush();
      log(
        `${ctx.round} ${ctx.archive.spec.arm}/${ctx.armLabel} generation ${generation}: ${islands.filter((island) => island.active).length} active, ${ctx.archive.size} evaluated`
      );
    }
  }

  return migrations;
};

// Per-symbol coverage of an arm's archive (configurations containing it, distinct vectors on it).
export const coverageOf = (entries: readonly Entry[], universe: readonly string[]) =>
  Object.fromEntries(
    universe.map((symbol) => {
      const containing = entries.filter((entry) => entry.config.some((book) => book.symbol === symbol));

      return [
        symbol,
        {
          configurations: containing.length,
          vectors: new Set(containing.map((entry) => entry.config.find((book) => book.symbol === symbol)!.id)).size,
          feasible: containing.filter((entry) => entry.feasible).length
        }
      ];
    })
  );

export const runDiscovery = async (ctx: DiscoveryContext) => {
  const started = Date.now();
  const { space } = ctx;
  const reserve = Math.floor(ctx.budget * study.coverage.topUpShare);
  const islandCap = ctx.smoke?.islandCap ?? Math.floor((ctx.budget - reserve) / study.islands.count);
  const islands = study.islands.kinds.map(
    (kind) => new Island(kind.key, kind.label, ctx, islandCap, study.islands.populationSize)
  );
  const seeds = new Map<string, Genome[]>();
  const seedRng = Rng.from(study.seedLabel, ctx.round, 'island-seeds', ctx.armLabel);

  // I7: 48 distinct symbols in a seeded order, one library vector each.
  const order = pickDistinct(space.universe, Math.min(study.islands.populationSize, space.universe.length), seedRng);

  seeds.set(
    'I7',
    order.map((symbol) => space.singleton(symbol, space.library.draw(seedRng), seedRng))
  );

  // I8: unseeded → uniform 2–6 (filled by the island); seeded → B1, B4, B5, 29 one-move mutants, then uniform 1–16.
  if (ctx.seededBooks) {
    const benchmarks = ctx.seededBooks.map((books) => space.fromBooks(books, seedRng));
    const mutants: Genome[] = [];

    for (let index = 0; index < study.islands.seededMutants; index++) {
      const mutant = space.clone(benchmarks[index % benchmarks.length]!);

      space.applyOperator(mutant, (['add', 'swap', 'reset'] as const)[Math.floor(index / 3) % 3]!, seedRng);
      mutants.push(mutant);
    }

    const fill = Array.from({ length: study.islands.populationSize }, () => space.uniform(seedRng, 1, 16));

    seeds.set('I8', [...benchmarks, ...mutants, ...fill]);
  }

  await initializeAll(islands, seeds, 'D');
  ctx.archive.flush();

  for (const island of islands) {
    log(
      `${ctx.round} ${ctx.archive.spec.arm}/${ctx.armLabel} ${island.key}: ${island.population.length} initial genomes, ${island.initial.fresh} new`
    );
  }

  const migrations = await runIslands(islands, ctx, true, 'D');

  if (ctx.stopAfter !== undefined && ctx.archive.size >= ctx.stopAfter) {
    return { stoppedAfter: ctx.archive.size } as never;
  }

  const entriesAfterIslands = [...ctx.archive.entries.values()];
  const scale = ctx.budget / study.budgetBase;
  const floor = {
    configurations: Math.round(study.coverage.configurations * scale),
    vectors: Math.round(study.coverage.vectors * scale)
  };
  const before = coverageOf(entriesAfterIslands, space.universe);
  const under = space.universe.filter(
    (symbol) => before[symbol]!.configurations < floor.configurations || before[symbol]!.vectors < floor.vectors
  );

  // The reserve shared equally (≥ 100, ≤ 1,000 each; beyond capacity at 100 each, alphabetically).
  const share = under.length > 0 ? Math.min(study.coverage.topUpMax, Math.floor(reserve / under.length)) : 0;
  const served =
    share >= study.coverage.topUpMin ? under : under.slice(0, Math.floor(reserve / study.coverage.topUpMin));
  const each = share >= study.coverage.topUpMin ? share : study.coverage.topUpMin;
  const topUps = served.map(
    (symbol) =>
      new Island(
        `topup:${symbol}`,
        `coverage top-up ${symbol}`,
        ctx,
        each,
        study.coverage.topUpPopulation,
        space.index.get(symbol)
      )
  );

  if (topUps.length > 0) {
    await initializeAll(topUps, new Map(), 'T');
    await runIslands(topUps, ctx, false, 'T');
  }

  ctx.archive.flush();

  const entries = [...ctx.archive.entries.values()];

  return {
    seconds: (Date.now() - started) / 1000,
    budget: ctx.budget,
    islandCap,
    reserve,
    floor,
    islands: islands.map((island) => ({
      key: island.key,
      label: island.label,
      generations: island.generation,
      freshEvaluations: island.fresh,
      stoppedBy: island.stoppedBy,
      initial: island.initial,
      log: island.generations,
      finalPopulation: island.population.map((individual) => individual.entry.key)
    })),
    migrations,
    topUp: {
      under,
      served,
      perSymbol: each,
      islands: topUps.map((island) => ({
        key: island.key,
        generations: island.generation,
        freshEvaluations: island.fresh,
        stoppedBy: island.stoppedBy
      }))
    },
    coverageBefore: before,
    coverageAfter: coverageOf(entries, space.universe),
    evaluations: entries.length,
    hits: ctx.archive.hits
  };
};
