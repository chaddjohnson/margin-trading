// The search of one arm of one round (PROTOCOL.md §9): stage A evaluates the quota schedule; stage B runs one anchored
// island per eligible symbol (every genome contains it) with an equal budget of fresh unique configurations, completed
// by random genomes containing the anchor whenever breeding stalls, so the budget is always spent; stage C runs eight
// free islands started from the anchored islands' elites, with ring migration and a stall stop. Generations of all
// islands of a stage are evaluated in one batch (islands in order; a key proposed earlier in the batch is a hit for
// later islands). Every decision is taken on the main thread from seeded generators in a fixed order.
import { type Genome, type GenomeSpace, type Operator, pickDistinct } from '../d1-robust/genome.ts';
import type { Book } from '../d1-robust/neighbourhood.ts';
import { Rng } from '../optimizer/rng.ts';
import { type ArmArchive, type Entry, booksOfEntry, compareEntries } from './archive.ts';
import { type ArmClass, type StartLabel, type WindowKey, log, study } from './context.ts';
import type { Schedule } from './schedule.ts';

export interface SearchContext {
  space: GenomeSpace;
  archive: ArmArchive;
  window: WindowKey;
  start: StartLabel;
  armClass: ArmClass;
  stageB: number; // fresh configurations per anchored island
  stageC: number; // fresh configurations per free island
  benchmarks?: Record<'B1' | 'B4' | 'B5', Book[]>; // seeded arms only
  scheduleBatch?: number;
  stopAfter?: number; // the determinism re-run: stop once the archive holds this many configurations
  onProgress?: (line: string) => void;
}

const stopped = (ctx: SearchContext) => ctx.stopAfter !== undefined && ctx.archive.size >= ctx.stopAfter;

interface Individual {
  genome: Genome;
  entry: Entry;
}

interface Proposal {
  genome: Genome;
  key: string;
  books: Book[];
  operator: string;
  fresh: boolean;
}

export interface GenerationLog {
  generation: number;
  fresh: number;
  hits: number;
  filled: number;
  attempts: number;
  best: string;
}

export class Island {
  readonly rng: Rng;
  population: Individual[] = [];
  generation = 0;
  active = true;
  stall = 0;
  stoppedBy = '';
  filledTotal = 0;
  readonly generations: GenerationLog[] = [];
  readonly initial = { proposed: 0, fresh: 0 };

  constructor(
    readonly key: string,
    readonly ctx: SearchContext,
    readonly cap: number,
    readonly populationSize: number,
    readonly stage: 'B' | 'C',
    readonly required?: number // stage B: the anchor's universe index
  ) {
    this.rng = Rng.from(study.seedLabel, ctx.window, stage === 'B' ? 'stageB' : 'stageC', ctx.start, key);
  }

  get fresh() {
    return this.ctx.archive.newCount(this.source);
  }

  get source() {
    return `${this.stage}:${this.key}`;
  }

  ranked() {
    return [...this.population].sort((a, b) => compareEntries(a.entry, b.entry));
  }

  // Classifies candidate genomes against the population, the archive and the batch's pending keys.
  propose(genomes: Genome[], pending: Set<string>, operator: (genome: Genome) => string, budget: { left: number }) {
    const keys = new Set(this.population.map((individual) => individual.entry.key));
    const out: Proposal[] = [];

    for (const genome of genomes) {
      const key = this.ctx.space.keyOf(genome);

      if (keys.has(key)) {
        continue;
      }

      const fresh = !this.ctx.archive.has(key) && !pending.has(key);

      if (fresh && budget.left <= 0) {
        continue;
      }

      keys.add(key);

      if (fresh) {
        pending.add(key);
        budget.left--;
      }

      out.push({ genome, key, books: this.ctx.space.booksOf(genome), operator: operator(genome), fresh });
    }

    return out;
  }

  // A random genome: stage B the anchor plus 0–5 others; stage C 1–8 books.
  random(): Genome {
    const { space } = this.ctx;

    if (this.required === undefined) {
      return space.uniform(this.rng, 1, study.stageC.randomMaxBooks);
    }

    const genome = space.uniform(this.rng, 1, 1);
    const others = space.universe.map((_, i) => i).filter((i) => i !== this.required);

    genome.mask = genome.mask.map(() => false);
    genome.mask[this.required] = true;

    for (const i of pickDistinct(others, this.rng.int(study.stageB.randomOthersMax + 1), this.rng)) {
      genome.mask[i] = true;
    }

    return genome;
  }
}

const tournament = (ranked: Individual[], rng: Rng) => {
  const a = rng.int(ranked.length);
  const b = rng.int(ranked.length);

  return a < b ? ranked[a]! : ranked[b]!;
};

const attemptFactor = (island: Island) =>
  island.stage === 'B' ? study.stageB.attemptFactor : study.stageC.attemptFactor;

// One generation's proposals of one island (breeding, then — stage B only — the fill rule).
const breed = (island: Island, pending: Set<string>) => {
  const { space } = island.ctx;
  const size = island.populationSize;
  const ranked = island.ranked();
  const budget = { left: island.cap - island.fresh };
  const proposals: Proposal[] = [];
  const seen = new Set(island.population.map((individual) => individual.entry.key));
  let children = 0;
  let attempts = 0;

  while (children < size && attempts < attemptFactor(island) * size && budget.left > 0) {
    const first = tournament(ranked, island.rng);
    const second = tournament(ranked, island.rng);
    const pair =
      island.rng.next() < study.genome.crossoverProbability
        ? space.crossover(first.genome, second.genome, island.rng)
        : [space.clone(first.genome), space.clone(second.genome)];

    for (const child of pair) {
      if (children >= size || budget.left <= 0) {
        break;
      }

      attempts++;
      space.repair(child, [first.genome, second.genome], island.rng, island.required);

      const applied: Operator = space.applyOperator(child, space.drawOperator(island.rng), island.rng, island.required);
      const key = space.keyOf(child);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      // §9.3–§9.4: only keys new to the arm's archive and to the batch's pending set are children; a cache hit is
      // dropped (it neither counts towards μ nor enters survival).
      const proposal = island.propose([child], pending, () => applied, budget).filter((item) => item.fresh);

      if (proposal.length > 0) {
        children++;
        proposals.push(...proposal);
      }
    }
  }

  // Stage B fill rule: complete the generation's fresh children with random genomes containing the anchor.
  let filled = 0;

  if (island.stage === 'B') {
    const target = Math.min(size, island.cap - island.fresh);
    let fresh = proposals.filter((proposal) => proposal.fresh).length;

    for (let tries = 0; fresh < target && tries < 1000 * size; tries++) {
      const added = island.propose([island.random()], pending, () => 'fill', budget);

      if (added.length > 0 && added[0]!.fresh) {
        fresh++;
        filled++;
        proposals.push(...added);
      }
    }

    if (fresh < target) {
      throw new Error(`Anchored island ${island.key} cannot produce fresh configurations (library too small?)`);
    }
  }

  return { proposals, attempts, filled };
};

const evaluateProposals = async (islands: Island[], plans: { proposals: Proposal[] }[], generation: number) => {
  const requests = islands.flatMap((island, i) =>
    plans[i]!.proposals.map((proposal) => ({
      books: proposal.books,
      meta: { stage: island.stage, source: island.source, generation, operator: proposal.operator }
    }))
  );

  return islands[0]!.ctx.archive.evaluateBatch(requests);
};

const initialize = async (islands: Island[], seeds: Map<string, Genome[]>) => {
  const pending = new Set<string>();
  const plans = islands.map((island) => {
    const distinct: Genome[] = [];
    const keys = new Set<string>();
    const consider = (genome: Genome) => {
      const key = island.ctx.space.keyOf(genome);

      if (!keys.has(key) && distinct.length < island.populationSize) {
        keys.add(key);
        distinct.push(genome);
      }
    };

    (seeds.get(island.key) ?? []).forEach(consider);

    for (let attempt = 0; distinct.length < island.populationSize && attempt < island.populationSize * 50; attempt++) {
      consider(island.random());
    }

    const budget = { left: island.cap - island.fresh };

    return { proposals: island.propose(distinct, pending, () => 'init', budget) };
  });
  const results = await evaluateProposals(islands, plans, 0);
  let cursor = 0;

  islands.forEach((island, i) => {
    for (const proposal of plans[i]!.proposals) {
      const { entry } = results[cursor++]!;

      island.population.push({ genome: proposal.genome, entry });
      island.initial.proposed++;

      if (proposal.fresh) {
        island.initial.fresh++;
      }
    }

    island.population = island.ranked().slice(0, island.populationSize);
  });
};

const stepAll = async (islands: Island[]) => {
  const pending = new Set<string>();
  const plans = islands.map((island) =>
    island.active ? breed(island, pending) : { proposals: [] as Proposal[], attempts: 0, filled: 0 }
  );
  const generation = Math.max(...islands.map((island) => island.generation)) + 1;
  const results = await evaluateProposals(islands, plans, generation);
  let cursor = 0;

  islands.forEach((island, i) => {
    const plan = plans[i]!;

    if (!island.active) {
      return;
    }

    island.generation++;

    const children: Individual[] = [];
    let fresh = 0;

    for (const proposal of plan.proposals) {
      const { entry } = results[cursor++]!;

      children.push({ genome: proposal.genome, entry });
      fresh += proposal.fresh ? 1 : 0;
    }

    island.population = [...island.population, ...children]
      .sort((a, b) => compareEntries(a.entry, b.entry))
      .slice(0, island.populationSize);
    island.stall = fresh === 0 ? island.stall + 1 : 0;
    island.filledTotal += plan.filled;
    island.generations.push({
      generation: island.generation,
      fresh,
      hits: plan.proposals.length - fresh,
      filled: plan.filled,
      attempts: plan.attempts,
      best: island.population[0]?.entry.key ?? ''
    });

    if (island.cap - island.fresh <= 0) {
      island.active = false;
      island.stoppedBy = 'budget';
    } else if (island.stage === 'C' && island.stall >= study.stageC.stallGenerations) {
      island.active = false;
      island.stoppedBy = `${study.stageC.stallGenerations} generations without a fresh child`;
    }
  });
};

// Ring migration C1 → C2 → … → C8 → C1: 4 genomes drawn from the source's best 12 replace the destination's worst.
const migrate = (islands: Island[], generation: number, ctx: SearchContext) => {
  const rng = Rng.from(study.seedLabel, ctx.window, 'migration', ctx.start, generation);
  const migrants = islands.map((island) =>
    pickDistinct(island.ranked().slice(0, study.stageC.migrantPool), study.stageC.migrants, rng)
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

const islandSummary = (island: Island) => ({
  key: island.key,
  generations: island.generation,
  fresh: island.fresh,
  filled: island.filledTotal,
  initial: island.initial,
  stoppedBy: island.stoppedBy,
  best: island.ranked()[0]?.entry.key ?? '',
  log: island.generations
});

// ----- the three stages -----

export const runStageA = async (ctx: SearchContext, schedule: Schedule) => {
  const started = Date.now();
  const batch = ctx.scheduleBatch ?? 2000;
  let fresh = 0;

  for (let index = 0; index < schedule.configs.length; index += batch) {
    const slice = schedule.configs.slice(index, index + batch);
    const results = await ctx.archive.evaluateBatch(
      slice.map((config) => ({
        books: config.books,
        meta: { stage: 'A', source: `A:${config.band}`, generation: config.pass, operator: 'schedule' }
      }))
    );

    fresh += results.filter((result) => result.fresh).length;
    ctx.archive.flush();
    ctx.onProgress?.(`stage A ${Math.min(index + batch, schedule.configs.length)}/${schedule.configs.length}`);
  }

  return { configurations: schedule.configs.length, fresh, seconds: (Date.now() - started) / 1000 };
};

export const runStageB = async (ctx: SearchContext) => {
  const started = Date.now();
  const { space, archive } = ctx;
  const islands = space.universe.map(
    (symbol, index) => new Island(symbol, ctx, ctx.stageB, study.stageB.population, 'B', index)
  );
  const ranked = archive.ranked();
  const seeds = new Map<string, Genome[]>();

  for (const island of islands) {
    const seedRng = Rng.from(study.seedLabel, ctx.window, 'stageB-seeds', ctx.start, island.key);
    const best = ranked
      .filter((entry) => entry.c.members.includes(island.key))
      .slice(0, study.stageB.fromArchive)
      .map((entry) => space.fromBooks(booksOfEntry(entry), seedRng));
    const benchmarks = ctx.benchmarks
      ? (['B1', 'B4', 'B5'] as const)
          .map((key) => ctx.benchmarks![key])
          .filter((books) => books.some((book) => book.symbol === island.key))
          .map((books) => space.fromBooks(books, seedRng))
      : [];
    const random = Array.from({ length: study.stageB.population }, () => island.random());

    // the archive's best, then the benchmarks containing the anchor (seeded arms), then random fill
    seeds.set(island.key, [...best, ...benchmarks, ...random]);
  }

  await initialize(islands, seeds);
  archive.flush();

  while (islands.some((island) => island.active) && !stopped(ctx)) {
    await stepAll(islands);

    const generation = Math.max(...islands.map((island) => island.generation));

    if (generation % 4 === 0) {
      archive.flush();
      ctx.onProgress?.(
        `stage B generation ${generation}: ${islands.filter((island) => island.active).length} active, ${archive.size} in archive`
      );
    }
  }

  archive.flush();

  return { seconds: (Date.now() - started) / 1000, islands: islands.map(islandSummary), elites: islands };
};

export const runStageC = async (ctx: SearchContext, anchored: Island[]) => {
  const started = Date.now();
  const { space, archive } = ctx;

  if (ctx.stageC <= 0) {
    return { seconds: 0, islands: [], migrations: [] };
  }
  const count = study.stageC.islands;
  const islands = Array.from(
    { length: count },
    (_, index) => new Island(`C${index + 1}`, ctx, ctx.stageC, study.stageC.population, 'C')
  );
  const seeds = new Map<string, Genome[]>(islands.map((island) => [island.key, []]));
  const elites = anchored
    .map((island) => island.ranked()[0]!)
    .filter(Boolean)
    .sort((a, b) => compareEntries(a.entry, b.entry));
  const seededIsland = ctx.benchmarks ? islands[study.stageC.seededIsland - 1]! : undefined;
  const receivers = islands.filter((island) => island !== seededIsland);

  elites.forEach((elite, index) => {
    seeds.get(receivers[index % receivers.length]!.key)!.push(space.clone(elite.genome));
  });

  if (seededIsland && ctx.benchmarks) {
    const seedRng = Rng.from(study.seedLabel, ctx.window, 'stageC-seeds', ctx.start, seededIsland.key);
    const benchmarks = (['B1', 'B4', 'B5'] as const).map((key) => space.fromBooks(ctx.benchmarks![key], seedRng));
    const mutants: Genome[] = [];

    for (let index = 0; index < study.stageC.seededMutants; index++) {
      const mutant = space.clone(benchmarks[index % benchmarks.length]!);

      space.applyOperator(mutant, (['add', 'swap', 'reset'] as const)[Math.floor(index / 3) % 3]!, seedRng);
      mutants.push(mutant);
    }

    seeds.set(seededIsland.key, [...benchmarks, ...mutants]);
  }

  await initialize(islands, seeds);
  archive.flush();

  const migrations: ReturnType<typeof migrate>[] = [];

  for (let generation = 1; islands.some((island) => island.active) && !stopped(ctx); generation++) {
    await stepAll(islands);

    if (generation % study.stageC.migrationInterval === 0) {
      migrations.push(migrate(islands, generation, ctx));
    }

    if (generation % 8 === 0) {
      archive.flush();
      ctx.onProgress?.(
        `stage C generation ${generation}: ${islands.filter((island) => island.active).length} active, ${archive.size} in archive`
      );
    }
  }

  archive.flush();

  return { seconds: (Date.now() - started) / 1000, islands: islands.map(islandSummary), migrations };
};

export const runArmSearch = async (ctx: SearchContext, schedule: Schedule) => {
  const a = await runStageA(ctx, schedule);

  log(`${ctx.window} ${ctx.archive.spec.arm}: stage A ${a.fresh} configurations`);

  if (stopped(ctx)) {
    return { stageA: a, stopped: ctx.archive.size };
  }

  const b = await runStageB(ctx);

  log(`${ctx.window} ${ctx.archive.spec.arm}: stage B done, ${ctx.archive.size} in archive`);

  if (stopped(ctx)) {
    return { stageA: a, stageB: { seconds: b.seconds, islands: b.islands }, stopped: ctx.archive.size };
  }

  const c = await runStageC(ctx, b.elites);

  log(`${ctx.window} ${ctx.archive.spec.arm}: stage C done, ${ctx.archive.size} in archive`);

  return {
    stageA: a,
    stageB: { seconds: b.seconds, islands: b.islands },
    stageC: c,
    evaluations: ctx.archive.size,
    hits: ctx.archive.hits
  };
};
