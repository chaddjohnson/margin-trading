// Stage D (PROTOCOL.md §6): unrestricted subset discovery on training, fixed $100,000, 5 bps. Sixteen independent
// greedy forward paths (one from each ETF), then eight NSGA-II islands over the mixed genome (membership mask + one D1
// vector per ETF) with outcome-independent initial populations, ring migration, and the objectives (−net, minute
// drawdown, books) under the $35,000 drawdown constraint. Every evaluation is the causal replay of the subset's
// funded shared-pool sequence; single-threaded and deterministic.
import { type Ranked, type Scored, selectSurvivors, tournament } from '../optimizer/nsga2.ts';
import { Rng } from '../optimizer/rng.ts';
import { type Archive, type Entry, feasible, scoredOf } from './archive.ts';
import type { BenchmarkKey } from './benchmarks.ts';
import { log, study, universe } from './context.ts';
import type { Book } from './evaluator.ts';
import {
  type Genome,
  type Library,
  type Operator,
  applyOperator,
  booksOf,
  cloneGenome,
  crossover,
  drawOperator,
  genomeFromBooks,
  genomeKey,
  repair,
  uniformGenome
} from './genome.ts';

export interface SearchContext {
  library: Library;
  archive: Archive;
  benchmarks: Record<BenchmarkKey, Book[]>;
  // Smaller budgets for the synthetic smoke test only; the study runs with the protocol's.
  limits?: { islandEvaluations?: number; contenderEvaluations?: number; jointPerturbations?: number };
}

// ----- greedy forward paths -----

// The better of two entries for the greedy start: feasible first, then net, then the lower drawdown, then the key.
const betterStart = (a: Entry, b: Entry) =>
  feasible(a) !== feasible(b)
    ? feasible(a)
    : feasible(a)
      ? a.e.net !== b.e.net
        ? a.e.net > b.e.net
        : a.key < b.key
      : a.e.minuteDrawdown !== b.e.minuteDrawdown
        ? a.e.minuteDrawdown < b.e.minuteDrawdown
        : a.key < b.key;

const greedyValue = (entry: Entry) => (feasible(entry) ? entry.e.net : -Infinity);

export interface GreedyPath {
  etf: string;
  steps: { step: number; key: string; books: number; net: number; minuteDrawdown: number; added: string }[];
  final: string;
  evaluations: number;
  stoppedBy: 'no qualifying addition' | 'all 16 books';
}

export const greedyPath = (ctx: SearchContext, etf: string): { path: GreedyPath; genomes: Genome[] } => {
  const rng = Rng.from(study.seedLabel, 'greedy', etf);
  const source = `greedy:${etf}`;
  const meta = (generation: number, operator: string) => ({ stage: 'D', source, generation, operator });
  let current: { books: Book[]; entry: Entry } | undefined;

  for (const vector of ctx.library.drawDistinct(rng, study.greedy.startVectors)) {
    const books = [{ symbol: etf, vector }];
    const { entry } = ctx.archive.evaluate(books, meta(0, 'start'));

    if (!current || betterStart(entry, current.entry)) {
      current = { books, entry };
    }
  }

  const accepted = [current!];

  while (current!.books.length < universe.length) {
    const members = new Set(current!.books.map((book) => book.symbol));
    let best: { books: Book[]; entry: Entry; added: string } | undefined;

    for (const symbol of universe) {
      if (members.has(symbol)) {
        continue;
      }

      for (const vector of ctx.library.drawDistinct(rng, study.greedy.stepVectors)) {
        const books = [...current!.books, { symbol, vector }];
        const { entry } = ctx.archive.evaluate(books, meta(accepted.length, 'add'));

        if (
          feasible(entry) &&
          (!best || entry.e.net > best.entry.e.net || (entry.e.net === best.entry.e.net && entry.key < best.entry.key))
        ) {
          best = { books, entry, added: symbol };
        }
      }
    }

    if (best && greedyValue(best.entry) >= greedyValue(current!.entry) + study.greedy.minGain) {
      current = best;
      accepted.push(best);
    } else {
      break;
    }
  }

  const latent = Rng.from(study.seedLabel, 'greedy-latent', etf);
  const genomes = accepted.map((item) => genomeFromBooks(item.books, ctx.library, latent));

  return {
    path: {
      etf,
      steps: accepted.map((item, step) => ({
        step,
        key: item.entry.key,
        books: item.books.length,
        net: item.entry.e.net,
        minuteDrawdown: item.entry.e.minuteDrawdown,
        added: step === 0 ? etf : item.books.at(-1)!.symbol
      })),
      final: current!.entry.key,
      evaluations: ctx.archive.newCount(source),
      stoppedBy: current!.books.length === universe.length ? 'all 16 books' : 'no qualifying addition'
    },
    genomes
  };
};

// ----- islands -----

interface Individual {
  genome: Genome;
  entry: Entry;
}

type ScoredIndividual = Scored & { individual: Individual };

const scored = (individual: Individual): ScoredIndividual => ({ ...scoredOf(individual.entry), individual });

export interface GenerationLog {
  generation: number;
  fresh: number;
  hits: number;
  attempts: number;
  operators: Partial<Record<Operator, number>>;
  frontSize: number;
  feasible: number;
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
  readonly initial: { requested: number; unique: number; fresh: number } = { requested: 0, unique: 0, fresh: 0 };

  constructor(
    readonly kind: (typeof study.islands.kinds)[number],
    readonly ctx: SearchContext
  ) {
    this.rng = Rng.from(study.seedLabel, 'island', kind.key);
  }

  get key() {
    return this.kind.key;
  }

  get fresh() {
    return this.ctx.archive.newCount(this.key);
  }

  get budgetLeft() {
    return (this.ctx.limits?.islandEvaluations ?? study.islands.evaluationsPerIsland) - this.fresh;
  }

  ranked(): Ranked<ScoredIndividual>[] {
    return selectSurvivors(this.population.map(scored), this.population.length);
  }

  // The initial population (64 unique genomes), from the island's outcome-independent rule.
  initialize(seeds: Genome[]) {
    const size = study.islands.populationSize;
    const keys = new Set<string>();
    const add = (genome: Genome) => {
      if (this.population.length >= size || this.budgetLeft <= 0) {
        return;
      }

      this.initial.requested++;

      const key = genomeKey(genome);

      if (keys.has(key)) {
        return;
      }

      const before = this.fresh;
      const { entry } = this.ctx.archive.evaluate(booksOf(genome), {
        stage: 'D',
        source: this.key,
        generation: 0,
        operator: 'init'
      });

      keys.add(key);
      this.population.push({ genome, entry });
      this.initial.unique++;
      this.initial.fresh += this.fresh - before;
    };

    for (const genome of seeds) {
      add(genome);
    }

    for (let attempt = 0; this.population.length < size && attempt < size * 50; attempt++) {
      add(uniformGenome(this.ctx.library, this.rng, this.kind.minBooks, this.kind.maxBooks));
    }
  }

  step() {
    if (!this.active) {
      return;
    }

    const size = study.islands.populationSize;
    const ranked = this.ranked();
    const children: Individual[] = [];
    const keys = new Set(this.population.map((individual) => individual.entry.key));
    const operators: Partial<Record<Operator, number>> = {};
    let attempts = 0;
    let fresh = 0;
    let hits = 0;

    this.generation++;

    while (children.length < size && attempts < study.islands.attemptFactor * size && this.budgetLeft > 0) {
      const first = tournament(ranked, this.rng).member.individual;
      const second = tournament(ranked, this.rng).member.individual;
      const pair =
        this.rng.next() < study.islands.crossoverProbability
          ? crossover(first.genome, second.genome, this.rng)
          : [cloneGenome(first.genome), cloneGenome(second.genome)];

      for (const child of pair) {
        if (children.length >= size || this.budgetLeft <= 0) {
          break;
        }

        attempts++;
        repair(child, [first.genome, second.genome], this.rng);

        const applied = applyOperator(child, drawOperator(this.rng), this.ctx.library, this.rng);

        const key = genomeKey(child);

        if (keys.has(key)) {
          continue;
        }

        const { entry, fresh: isFresh } = this.ctx.archive.evaluate(booksOf(child), {
          stage: 'D',
          source: this.key,
          generation: this.generation,
          operator: applied
        });

        keys.add(key);
        children.push({ genome: child, entry });
        operators[applied] = (operators[applied] ?? 0) + 1;

        if (isFresh) {
          fresh++;
        } else {
          hits++;
        }
      }
    }

    const survivors = selectSurvivors([...this.population, ...children].map(scored), size);

    this.population = survivors.map((item) => item.member.individual);
    this.stall = fresh === 0 ? this.stall + 1 : 0;

    const books = this.population.map((individual) => individual.entry.e.books).sort((a, b) => a - b);

    this.generations.push({
      generation: this.generation,
      fresh,
      hits,
      attempts,
      operators,
      frontSize: survivors.filter((item) => item.rank === 0).length,
      feasible: this.population.filter((individual) => feasible(individual.entry)).length,
      cardinality: { min: books[0]!, median: books[books.length >> 1]!, max: books.at(-1)! }
    });

    if (this.budgetLeft <= 0) {
      this.active = false;
      this.stoppedBy = 'budget';
    } else if (this.stall >= study.islands.stallGenerations) {
      this.active = false;
      this.stoppedBy = `${study.islands.stallGenerations} generations without a new unique child`;
    }
  }
}

// Ring migration I1 → I2 → … → I8 → I1: each active destination receives 4 genomes drawn uniformly from its source's
// first front (topped up in rank/crowding order), replacing its 4 worst; snapshots are taken before any replacement.
export const migrate = (islands: Island[], generation: number) => {
  const rng = Rng.from(study.seedLabel, 'migration', generation);
  const migrants = islands.map((island) => {
    const ranked = island.ranked();
    const front = ranked.filter((item) => item.rank === 0);
    const chosen: Individual[] = [];
    const pool = [...front];

    while (chosen.length < study.islands.migrants && pool.length > 0) {
      chosen.push(pool.splice(rng.int(pool.length), 1)[0]!.member.individual);
    }

    for (const item of ranked) {
      if (chosen.length >= study.islands.migrants) {
        break;
      }

      if (!chosen.includes(item.member.individual)) {
        chosen.push(item.member.individual);
      }
    }

    return chosen;
  });
  const moved: { from: string; to: string; keys: string[] }[] = [];

  islands.forEach((island, index) => {
    if (!island.active) {
      return;
    }

    const source = (index - 1 + islands.length) % islands.length;
    const present = new Set(island.population.map((individual) => individual.entry.key));
    const incoming = migrants[source]!.filter((individual) => !present.has(individual.entry.key));
    const ranked = island.ranked();
    const keep = ranked.slice(0, ranked.length - incoming.length).map((item) => item.member.individual);

    island.population = [
      ...keep,
      ...incoming.map((individual) => ({ genome: cloneGenome(individual.genome), entry: individual.entry }))
    ];
    moved.push({ from: islands[source]!.key, to: island.key, keys: incoming.map((item) => item.entry.key) });
  });

  return { generation, moved };
};

export const runDiscovery = (ctx: SearchContext) => {
  const started = Date.now();
  const paths: GreedyPath[] = [];
  const greedyGenomes: { finals: Genome[]; intermediates: Genome[] } = { finals: [], intermediates: [] };

  for (const etf of universe) {
    const { path, genomes } = greedyPath(ctx, etf);

    paths.push(path);
    greedyGenomes.finals.push(genomes.at(-1)!);
    greedyGenomes.intermediates.push(...genomes.slice(0, -1));
    log(
      `greedy ${etf}: ${path.steps.length} accepted step(s), ${path.evaluations} evaluations (${ctx.archive.size} in the archive)`
    );
  }

  ctx.archive.flush();

  const islands = study.islands.kinds.map((kind) => new Island(kind, ctx));
  const benchmarkRng = Rng.from(study.seedLabel, 'island-seeds', 'I8');
  const benchmarkGenomes = (['B1', 'B4', 'B5'] as const).map((key) =>
    genomeFromBooks(ctx.benchmarks[key], ctx.library, benchmarkRng)
  );
  const mutants: Genome[] = [];

  for (let index = 0; index < 29; index++) {
    const mutant = cloneGenome(benchmarkGenomes[index % 3]!);

    applyOperator(mutant, (['add', 'swap', 'reset'] as const)[Math.floor(index / 3) % 3]!, ctx.library, benchmarkRng);
    mutants.push(mutant);
  }

  for (const island of islands) {
    const seeds: Genome[] = [];

    if (island.key === 'I6') {
      for (const [index] of universe.entries()) {
        for (const vector of ctx.library.drawDistinct(island.rng, 4)) {
          const genome = uniformGenome(ctx.library, island.rng, 1, 1);

          genome.mask = universe.map((_, other) => other === index);
          genome.vectors[index] = vector;
          seeds.push(genome);
        }
      }
    } else if (island.key === 'I7') {
      seeds.push(...greedyGenomes.finals, ...greedyGenomes.intermediates);
    } else if (island.key === 'I8') {
      seeds.push(...benchmarkGenomes, ...mutants);

      for (let index = 0; index < 32; index++) {
        seeds.push(uniformGenome(ctx.library, island.rng, 1, 16));
      }
    }

    island.initialize(seeds);
    log(
      `${island.key} (${island.kind.label}): ${island.population.length} initial genomes, ${island.initial.fresh} new evaluations`
    );
  }

  ctx.archive.flush();

  const migrations: ReturnType<typeof migrate>[] = [];

  for (let generation = 1; islands.some((island) => island.active); generation++) {
    for (const island of islands) {
      island.step();
    }

    if (generation % study.islands.migrationInterval === 0) {
      migrations.push(migrate(islands, generation));
    }

    if (generation % 8 === 0) {
      ctx.archive.flush();
      log(
        `generation ${generation}: ${islands.filter((island) => island.active).length} active islands, ${ctx.archive.size} configurations evaluated`
      );
    }
  }

  ctx.archive.flush();

  return {
    seconds: (Date.now() - started) / 1000,
    paths,
    islands: islands.map((island) => ({
      key: island.key,
      label: island.kind.label,
      generations: island.generation,
      freshEvaluations: island.fresh,
      stoppedBy: island.stoppedBy,
      initial: island.initial,
      log: island.generations,
      finalPopulation: island.population.map((individual) => individual.entry.key)
    })),
    migrations
  };
};
