// One search stage (one family on one training fit), as src/four-family/search.ts: 4,096 unique scrambled-Sobol
// lattice candidates plus the anchors (base defaults and Trades2), then two independent NSGA-II runs (population 128, 60 generations, 128 offspring each)
// started from the best 128 of that exploration, on two objectives (maximize net profit, minimize the
// minute-sampled drawdown) with a minimum-entries constraint. Every evaluation goes through one cache keyed by
// candidate ID, so a lattice point is simulated once per stage; attempted, unique and duplicate counts are
// kept separately. Evaluations are appended to a JSONL checkpoint as they complete, and a restarted stage
// reloads them, so a resumed run follows exactly the same deterministic path.
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import {
  type Ranked,
  type Scored,
  hypervolume2d,
  polynomialMutation,
  sbx,
  selectSurvivors,
  tournament
} from '../optimizer/nsga2.ts';
import type { ParameterSpace } from '../optimizer/params.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import type { EvalSpec, Metrics } from './evaluate.ts';
import {
  type Family,
  type IntParams,
  candidateId,
  defaultParams,
  familySpecs,
  genomeToParams,
  gridSize,
  paramsToGenome,
  trades2Params
} from './families.ts';
import type { Evaluator } from './pool.ts';

export interface SearchConfig {
  sobolSamples: number;
  populationSize: number;
  generations: number;
  seeds: number[];
  crossoverProbability: number;
  crossoverEta: number;
  mutationEta: number;
}

export const defaultSearch: SearchConfig = {
  sobolSamples: 4096,
  populationSize: 128,
  generations: 60,
  seeds: [1, 2],
  crossoverProbability: 0.9,
  crossoverEta: 15,
  mutationEta: 20
};

export interface CandidateRecord extends Scored {
  params: IntParams;
  origin: string; // 'anchor-y30', 'sobol-17', 'nsga1-g5', 'random-3', ...
  metrics: Metrics;
}

export interface StageStats {
  attempted: number; // every candidate requested, duplicates included
  unique: number; // distinct lattice points simulated
  duplicates: number;
  rejected: number; // off-lattice or invalid proposals (repairs are counted by NSGA-II separately)
  repairs: number;
  sobolDraws: number;
  sobolUnique: number;
  anchors: number;
  nsga: { seed: number; rngSeed: number[]; offspring: number; newEvaluations: number; hypervolume: number[] }[];
  random?: { draws: number; unique: number };
  runtimeMs: number;
  workers: number;
}

export interface StageContext {
  evaluator: Evaluator;
  datasetId: string;
  family: Family;
  spec: EvalSpec;
  minEntries: number;
  seedLabel: string; // fit name, e.g. 'fold1'
  dir: string; // checkpoint directory
  log?: (message: string) => void;
}

export const objectivesOf = (metrics: Metrics): number[] => [-metrics.net, metrics.minuteDrawdown];

export const violationOf = (metrics: Metrics, minEntries: number) =>
  !Number.isFinite(metrics.net) || !Number.isFinite(metrics.minuteDrawdown)
    ? 1
    : Math.max(0, minEntries - metrics.entries) / minEntries;

// The NSGA-II helpers only read min, max and step of each spec.
const spaceOf = (family: Family) => ({ name: family.key, specs: familySpecs(family) }) as unknown as ParameterSpace;

export class StageArchive {
  readonly records = new Map<string, CandidateRecord>();
  attempted = 0;
  duplicates = 0;
  private readonly file: string;

  constructor(
    private readonly context: StageContext,
    fileName = 'evaluations.jsonl'
  ) {
    this.file = path.join(context.dir, fileName);
  }

  async load() {
    const compressed = (await fs.pathExists(`${this.file}.gz`))
      ? gunzipSync(await fs.readFile(`${this.file}.gz`)).toString('utf8')
      : '';
    const plain = (await fs.pathExists(this.file)) ? await fs.readFile(this.file, 'utf8') : '';
    const text = compressed + plain;

    if (text) {
      const lines = text.split('\n').filter(Boolean);

      for (const line of lines) {
        const { id, params, metrics } = JSON.parse(line) as { id: string; params: IntParams; metrics: Metrics };

        this.cached.set(id, { params, metrics });
      }
    }
  }

  // After a stage completes: the checkpoint is kept gzipped (the loader reads either form).
  async compress() {
    if (await fs.pathExists(this.file)) {
      const existing = (await fs.pathExists(`${this.file}.gz`))
        ? gunzipSync(await fs.readFile(`${this.file}.gz`)).toString('utf8')
        : '';

      await fs.writeFile(`${this.file}.gz`, gzipSync(existing + (await fs.readFile(this.file, 'utf8')), { level: 9 }));
      await fs.remove(this.file);
    }
  }

  // Results loaded from a checkpoint, not yet requested in this run.
  private readonly cached = new Map<string, { params: IntParams; metrics: Metrics }>();

  // Evaluates candidates in order; returns their records. A candidate already in this stage is a duplicate.
  async evaluate(params: IntParams[], origins: string[]): Promise<CandidateRecord[]> {
    const { family, minEntries } = this.context;
    const ids = params.map((candidate) => candidateId(family, candidate));
    const pending: { id: string; params: IntParams; origin: string }[] = [];
    const seen = new Set<string>();

    ids.forEach((id, index) => {
      this.attempted++;

      if (this.records.has(id) || seen.has(id)) {
        this.duplicates++;

        return;
      }

      seen.add(id);
      pending.push({ id, params: params[index]!, origin: origins[index]! });
    });

    const fresh = pending.filter(({ id }) => !this.cached.has(id));
    const results = fresh.length
      ? await this.context.evaluator.evaluate(
          this.context.datasetId,
          family.key,
          this.context.spec,
          fresh.map(({ params: candidate }) => candidate)
        )
      : [];
    const freshMetrics = new Map(fresh.map(({ id }, index) => [id, results[index]!]));
    const lines: string[] = [];

    for (const { id, params: candidate, origin } of pending) {
      const metrics = freshMetrics.get(id) ?? this.cached.get(id)!.metrics;

      if (freshMetrics.has(id)) {
        lines.push(JSON.stringify({ id, params: candidate, metrics }));
      }

      this.records.set(id, {
        id,
        genome: paramsToGenome(family, candidate),
        params: candidate,
        origin,
        metrics,
        objectives: objectivesOf(metrics),
        violation: violationOf(metrics, minEntries)
      });
    }

    if (lines.length > 0) {
      await fs.ensureDir(this.context.dir);
      await fs.appendFile(this.file, `${lines.join('\n')}\n`);
    }

    return ids.map((id) => this.records.get(id)!);
  }
}

export const runSearchStage = async (context: StageContext, config: SearchConfig = defaultSearch) => {
  const started = Date.now();
  const { family, seedLabel } = context;
  const log = context.log ?? (() => {});
  const specs = familySpecs(family);
  const space = spaceOf(family);
  const archive = new StageArchive(context);

  await archive.load();

  // Anchors: the base file defaults at Y 3% and 4%, and the Trades2 phenotype (PROTOCOL.md section 4).
  const anchors = [defaultParams(family, 30), defaultParams(family, 40), trades2Params(family)];

  await archive.evaluate(anchors, ['anchor-y30', 'anchor-y40', 'anchor-trades2']);

  // Exploration: unique quantized scrambled-Sobol points.
  const sobol = new Sobol({
    dimensions: specs.length,
    scramble: { seed: deriveSeed('trailing-buy-variants', 'sobol', seedLabel, family.key) }
  });
  const sobolGenomes = new Map<string, number[]>();
  let sobolDraws = 0;

  while (sobolGenomes.size < config.sobolSamples) {
    if (sobolDraws > config.sobolSamples * 64) {
      throw new Error(`${family.key}: could not draw ${config.sobolSamples} unique Sobol points`);
    }

    const point = sobol.next();
    const genome = specs.map((spec, dimension) =>
      Math.min(gridSize(spec) - 1, Math.floor(point[dimension]! * gridSize(spec)))
    );

    sobolDraws++;
    sobolGenomes.set(genome.join(','), genome);
  }

  const sobolList = [...sobolGenomes.values()];

  for (let start = 0; start < sobolList.length; start += 512) {
    const batch = sobolList.slice(start, start + 512);

    await archive.evaluate(
      batch.map((genome) => genomeToParams(family, genome)),
      batch.map((_genome, index) => `sobol-${start + index}`)
    );
  }

  log(
    `${seedLabel} ${family.key}: Sobol ${sobolList.length} unique of ${sobolDraws} draws, ${archive.records.size} evaluated`
  );

  const exploration = [...archive.records.values()];
  const feasibleDrawdowns = exploration
    .filter((record) => record.violation === 0)
    .map((record) => record.objectives[1]!);
  const reference: [number, number] = [0, 1.1 * Math.max(1, ...feasibleDrawdowns)];
  const nsgaStats: StageStats['nsga'] = [];
  let repairs = 0;

  for (const seed of config.seeds) {
    const rngSeed = deriveSeed('trailing-buy-variants', 'nsga', seedLabel, family.key, seed);
    const rng = new Rng(rngSeed);
    let population: Ranked<CandidateRecord>[] = selectSurvivors(exploration, config.populationSize);
    const hypervolume: number[] = [];
    const sizeBefore = archive.records.size;
    let offspringCount = 0;

    for (let generation = 1; generation <= config.generations; generation++) {
      const children: number[][] = [];

      while (children.length < config.populationSize) {
        const a = tournament(population, rng).member;
        const b = tournament(population, rng).member;
        const crossed = sbx(space, a.genome, b.genome, rng, {
          crossoverProbability: config.crossoverProbability,
          crossoverEta: config.crossoverEta,
          mutationEta: config.mutationEta
        });

        repairs += crossed.repairs;

        for (const child of crossed.children) {
          if (children.length < config.populationSize) {
            const mutated = polynomialMutation(space, child, rng, {
              crossoverProbability: config.crossoverProbability,
              crossoverEta: config.crossoverEta,
              mutationEta: config.mutationEta
            });

            repairs += mutated.repairs;
            children.push(mutated.genome);
          }
        }
      }

      offspringCount += children.length;

      const records = await archive.evaluate(
        children.map((genome) => genomeToParams(family, genome)),
        children.map(() => `nsga${seed}-g${generation}`)
      );
      const combined = new Map<string, CandidateRecord>();

      for (const member of [...population.map((ranked) => ranked.member), ...records]) {
        combined.set(member.id, member);
      }

      population = selectSurvivors([...combined.values()], config.populationSize);
      hypervolume.push(
        hypervolume2d(
          population.map((ranked) => ranked.member),
          reference
        )
      );
    }

    nsgaStats.push({
      seed,
      rngSeed,
      offspring: offspringCount,
      newEvaluations: archive.records.size - sizeBefore,
      hypervolume
    });
    log(
      `${seedLabel} ${family.key}: NSGA-II seed ${seed} done, ${archive.records.size - sizeBefore} new of ${offspringCount} offspring, hypervolume ${hypervolume.at(-1)?.toExponential(4)}`
    );
  }

  const stats: StageStats = {
    attempted: archive.attempted,
    unique: archive.records.size,
    duplicates: archive.duplicates,
    rejected: 0,
    repairs,
    sobolDraws,
    sobolUnique: sobolList.length,
    anchors: anchors.length,
    nsga: nsgaStats,
    runtimeMs: Date.now() - started,
    workers: context.evaluator.workers
  };

  await archive.compress();

  return { records: [...archive.records.values()], stats, reference };
};

// The equal-budget random-sampling control: uniform lattice draws until as many unique candidates as the
// Sobol + NSGA-II stage simulated (anchors included in both).
export const runRandomControl = async (context: StageContext, uniqueTarget: number) => {
  const started = Date.now();
  const { family, seedLabel } = context;
  const specs = familySpecs(family);
  const archive = new StageArchive(context, 'random-evaluations.jsonl');
  const rng = Rng.from('trailing-buy-variants', 'random-control', seedLabel, family.key);

  await archive.load();
  await archive.evaluate(
    [defaultParams(family, 30), defaultParams(family, 40), trades2Params(family)],
    ['anchor-y30', 'anchor-y40', 'anchor-trades2']
  );

  let draws = 0;

  while (archive.records.size < uniqueTarget) {
    const batch: IntParams[] = [];
    const seen = new Set<string>();

    while (batch.length < Math.min(512, uniqueTarget - archive.records.size)) {
      const genome = specs.map((spec) => rng.int(gridSize(spec)));
      const params = genomeToParams(family, genome);
      const id = candidateId(family, params);

      draws++;

      if (!archive.records.has(id) && !seen.has(id)) {
        seen.add(id);
        batch.push(params);
      }
    }

    await archive.evaluate(
      batch,
      batch.map((_params, index) => `random-${archive.records.size + index}`)
    );
  }

  await archive.compress();

  return {
    records: [...archive.records.values()],
    stats: { draws, unique: archive.records.size, attempted: archive.attempted, runtimeMs: Date.now() - started }
  };
};

export { hypervolume2d };
