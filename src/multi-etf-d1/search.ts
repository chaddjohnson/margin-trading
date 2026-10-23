// The per-ticker staged search (PROTOCOL.md section 4). One continuous development run per candidate, evaluated
// once and cached by candidate ID (checkpoint: results/search/<ticker>/evaluations.jsonl, resumable):
//   1. coverage: the ticker's scrambled-Sobol design of unique quantized candidates over the common box, plus the
//      frozen D1 vector as the control;
//   2. per chronological fold, one NSGA-II run (src/optimizer/nsga2.ts operators on the integer grid) whose
//      objectives are the fold's TRAINING window only (maximize net, minimize minute drawdown; the $35,000 ceiling and
//      the minimum entry count as constraints), seeded from every candidate already evaluated in earlier stages;
//   3. the selection rule of selection.ts applied to the fold's pool on the training window, probed for plateaus,
//      and attributed to the fold's validation window (walk-forward); the final fold's picks are the nominations.
// Nothing after the last 2023 session exists in the dataset the search runs on.
import path from 'node:path';
import fs from 'fs-extra';
import type { Metrics } from '../d1-refinement/evaluate.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { type Evaluator, LocalEvaluator, WorkerPool } from '../d1-refinement/pool.ts';
import {
  type Ranked,
  type Scored,
  hypervolume2d,
  polynomialMutation,
  sbx,
  selectSurvivors,
  tournament
} from '../optimizer/nsga2.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { type Ticker, log, option, protocol, stageDir, tickersOf, writeJson } from './context.ts';
import { type TickerData, loadDevelopment } from './data.ts';
import { developmentSpec, foldWindows, minEntriesFor, trainLabel } from './evaluation.ts';
import {
  type FoldSelection,
  type View,
  finalizeSelection,
  selectOnFold,
  viewOf,
  writeCandidatesCsv
} from './selection.ts';
import {
  type Genome,
  d1Id,
  d1Params,
  genomeToParams,
  gridSizeOf,
  box,
  idOf,
  operatorSpace,
  paramsToGenome,
  sobolDesign
} from './space.ts';

export interface Candidate {
  id: string;
  genome: Genome;
  params: IntParams;
  origin: string; // d1 | sobol | ga:<fold> | probe:<fold>
  foldIndex: number; // the stage at which the candidate was first evaluated (0: coverage)
  metrics: Metrics;
}

export interface GaSummary {
  fold: string;
  seed: number[];
  seeded: number;
  generations: number;
  newEvaluations: number;
  hypervolume: number[];
  stopReason: 'generations' | 'budget' | 'stagnation';
  repairs: number;
  minEntries: number;
}

export const searchDir = (ticker: string) => stageDir('search', ticker);
export const checkpointFile = (ticker: string) => path.join(searchDir(ticker), 'evaluations.jsonl');

export const makeEvaluator = (args: string[]): Evaluator => {
  const workers = option(args, 'workers');

  return workers === '0' ? new LocalEvaluator() : new WorkerPool({ size: workers ? Number(workers) : undefined });
};

// The evaluation cache of one ticker, backed by the checkpoint file.
export class SearchCache {
  readonly entries = new Map<string, Candidate>();
  simulations = 0;
  private readonly spec;

  constructor(
    private readonly evaluator: Evaluator,
    private readonly data: TickerData,
    private readonly file: string
  ) {
    this.spec = developmentSpec(data);
  }

  async load() {
    if (!(await fs.pathExists(this.file))) {
      return 0;
    }

    const text = await fs.readFile(this.file, 'utf8');

    for (const line of text.split('\n')) {
      if (line.trim().length === 0) {
        continue;
      }

      const candidate = JSON.parse(line) as Candidate;

      this.entries.set(candidate.id, candidate);
    }

    return this.entries.size;
  }

  async evaluate(genomes: Genome[], origin: string, foldIndex: number): Promise<Candidate[]> {
    const ids = genomes.map((genome) => idOf(genomeToParams(genome)));
    const missing = new Map<string, Genome>();

    ids.forEach((id, index) => {
      if (!this.entries.has(id) && !missing.has(id)) {
        missing.set(id, genomes[index]!);
      }
    });

    if (missing.size > 0) {
      const pending = [...missing.entries()];
      const metricsList = await this.evaluator.evaluate(
        this.data.ds.id,
        'd1',
        this.spec,
        pending.map(([, genome]) => genomeToParams(genome))
      );
      const lines: string[] = [];

      this.simulations += pending.length;
      pending.forEach(([id, genome], index) => {
        const candidate: Candidate = {
          id,
          genome,
          params: genomeToParams(genome),
          origin,
          foldIndex,
          metrics: metricsList[index]!
        };

        this.entries.set(id, candidate);
        lines.push(JSON.stringify(candidate));
      });
      await fs.ensureDir(path.dirname(this.file));
      await fs.appendFile(this.file, `${lines.join('\n')}\n`);
    }

    return ids.map((id) => this.entries.get(id)!);
  }

  pool(foldIndex: number) {
    return [...this.entries.values()].filter((candidate) => candidate.foldIndex <= foldIndex);
  }
}

const normalizedLinf = (a: Genome, b: Genome) => {
  let distance = 0;

  box.forEach((spec, dimension) => {
    distance = Math.max(distance, Math.abs(a[dimension]! - b[dimension]!) / Math.max(1, gridSizeOf(spec) - 1));
  });

  return distance;
};

interface ScoredCandidate extends Scored {
  candidate: Candidate;
}

const score = (candidate: Candidate, label: string, minEntries: number): ScoredCandidate => {
  const view = viewOf(candidate.metrics, label);
  const ceiling = protocol.drawdownCeiling;
  const violation =
    Math.max(0, view.minuteDrawdown - ceiling) / ceiling +
    Math.max(0, minEntries - view.entries) / Math.max(1, minEntries);

  return {
    id: candidate.id,
    genome: candidate.genome,
    objectives: [-view.net, view.minuteDrawdown],
    violation: Number.isFinite(view.net) ? violation : 1e9,
    candidate
  };
};

// The initial population: the pool in NSGA-II order on the training window, skipping candidates closer than the
// diversity threshold to one already chosen; topped up in the same order.
const seedPopulation = (scored: ScoredCandidate[], size: number, minDistance: number) => {
  const ordered = selectSurvivors(scored, scored.length).map((ranked) => ranked.member);
  const chosen: ScoredCandidate[] = [];

  for (const candidate of ordered) {
    if (chosen.length >= size) {
      break;
    }

    if (chosen.every((other) => normalizedLinf(candidate.genome, other.genome) >= minDistance)) {
      chosen.push(candidate);
    }
  }

  for (const candidate of ordered) {
    if (chosen.length >= size) {
      break;
    }

    if (!chosen.includes(candidate)) {
      chosen.push(candidate);
    }
  }

  return chosen;
};

const hypervolumeReference: [number, number] = [0, protocol.drawdownCeiling];

// One NSGA-II run on one fold's training window.
export const runGa = async (
  ticker: string,
  cache: SearchCache,
  foldKey: string,
  foldIndex: number,
  minEntries: number
): Promise<GaSummary> => {
  const { search } = protocol;
  const label = trainLabel(foldKey);
  const seed = deriveSeed('multi-etf-d1', ticker, 'ga', foldKey);
  const rng = new Rng(seed);
  const scoreOf = (candidate: Candidate) => score(candidate, label, minEntries);
  const seeded = seedPopulation(cache.pool(foldIndex - 1).map(scoreOf), search.populationSize, search.seedDiversity);
  const startSimulations = cache.simulations;
  let population: Ranked<ScoredCandidate>[] = selectSurvivors(seeded, search.populationSize);
  const hypervolume: number[] = [];
  let best = hypervolume2d(
    population.map((ranked) => ranked.member),
    hypervolumeReference
  );
  let stopReason: GaSummary['stopReason'] = 'generations';
  let stagnant = 0;
  let repairs = 0;
  let generation = 0;
  const variation = {
    crossoverProbability: search.crossoverProbability,
    crossoverEta: search.crossoverEta,
    mutationEta: search.mutationEta
  };

  for (generation = 1; generation <= search.generations; generation++) {
    const taken = new Set(cache.pool(foldIndex).map((candidate) => candidate.id));
    const offspring: Genome[] = [];

    while (offspring.length < search.populationSize) {
      const parentA = tournament(population, rng).member;
      const parentB = tournament(population, rng).member;
      const crossed = sbx(operatorSpace, parentA.genome, parentB.genome, rng, variation);

      repairs += crossed.repairs;

      for (const child of crossed.children) {
        if (offspring.length >= search.populationSize) {
          break;
        }

        let mutated = polynomialMutation(operatorSpace, child, rng, variation);
        let id = idOf(genomeToParams(mutated.genome));

        for (let attempt = 0; attempt < 5 && taken.has(id); attempt++) {
          mutated = polynomialMutation(operatorSpace, mutated.genome, rng, { ...variation, mutationProbability: 0.5 });
          id = idOf(genomeToParams(mutated.genome));
        }

        repairs += mutated.repairs;

        if (!taken.has(id)) {
          taken.add(id);
          offspring.push(mutated.genome);
        }
      }
    }

    const children = (await cache.evaluate(offspring, `ga:${foldKey}`, foldIndex)).map(scoreOf);
    const combined = new Map<string, ScoredCandidate>();

    for (const member of [...population.map((ranked) => ranked.member), ...children]) {
      combined.set(member.id, member);
    }

    population = selectSurvivors([...combined.values()], search.populationSize);

    const volume = hypervolume2d(
      population.map((ranked) => ranked.member),
      hypervolumeReference
    );

    hypervolume.push(volume);
    stagnant = volume > best * (1 + search.earlyStopTolerance) + 1e-12 ? 0 : stagnant + 1;
    best = Math.max(best, volume);

    if (cache.simulations - startSimulations >= search.maxEvaluationsPerFold) {
      stopReason = 'budget';
      break;
    }

    if (stagnant >= search.earlyStopPatience) {
      stopReason = 'stagnation';
      break;
    }
  }

  return {
    fold: foldKey,
    seed,
    seeded: seeded.length,
    generations: Math.min(generation, search.generations),
    newEvaluations: cache.simulations - startSimulations,
    hypervolume,
    stopReason,
    repairs,
    minEntries
  };
};

export interface SearchRecord {
  ticker: string;
  dataHash: string;
  datasetId: string;
  startedAt: string;
  completedAt?: string;
  eligibilityDate: string;
  developmentEndDate: string;
  sobol: ReturnType<typeof sobolDesign>['summary'];
  folds: {
    key: string;
    trainEndDate: string;
    validationStartDate?: string;
    validationEndDate?: string;
    minEntries: number;
  }[];
  ga: GaSummary[];
  selections: FoldSelection[];
  candidates: number;
  simulations: number;
}

export const runSearch = async (args: string[]) => {
  const evaluator = makeEvaluator(args);
  const samples = option(args, 'samples') ? Number(option(args, 'samples')) : protocol.search.sobolSamples;

  try {
    for (const ticker of tickersOf(args)) {
      await searchTicker(ticker, evaluator, samples);
    }
  } finally {
    await evaluator.close();
  }
};

export const searchTicker = async (ticker: Ticker, evaluator: Evaluator, samples: number) => {
  const data = await loadDevelopment(ticker);
  const { ds } = data;
  const dir = searchDir(ticker);
  const recordFile = path.join(dir, 'search.json');
  const cache = new SearchCache(evaluator, data, checkpointFile(ticker));
  const loaded = await cache.load();

  evaluator.register(ds);

  const windows = foldWindows(data);
  const record: SearchRecord = (await fs.pathExists(recordFile))
    ? JSON.parse(await fs.readFile(recordFile, 'utf8'))
    : {
        ticker,
        dataHash: data.dataHash,
        datasetId: ds.id,
        startedAt: new Date().toISOString(),
        eligibilityDate: ds.dates[data.eligibility]!,
        developmentEndDate: ds.lastDate,
        sobol: sobolDesign(ticker, samples).summary,
        folds: windows.map((fold) => ({
          key: fold.key,
          trainEndDate: ds.dates[fold.trainEnd]!,
          validationStartDate: fold.validation ? ds.dates[fold.validation.start] : undefined,
          validationEndDate: fold.validation ? ds.dates[fold.validation.end] : undefined,
          minEntries: minEntriesFor(ds, data.eligibility, fold.trainEnd)
        })),
        ga: [],
        selections: [],
        candidates: 0,
        simulations: 0
      };

  if (record.dataHash !== data.dataHash) {
    throw new Error(`${ticker}: the search record was made on data ${record.dataHash}, not ${data.dataHash}`);
  }

  if (record.completedAt) {
    log(`${ticker}: search already complete (${record.completedAt}); delete ${dir} to rerun`);

    return record;
  }

  log(
    `${ticker}: ${ds.sessionCount} sessions ${ds.firstDate} → ${ds.lastDate}, eligibility ${ds.dates[data.eligibility]} (index ${data.eligibility}); ${loaded} cached evaluations`
  );

  // Stage 1: coverage.
  const design = sobolDesign(ticker, samples);
  const started = performance.now();

  await cache.evaluate([paramsToGenome(d1Params())], 'd1', 0);
  await cache.evaluate(design.genomes, 'sobol', 0);
  log(
    `${ticker}: coverage ${design.summary.unique} unique Sobol candidates (${design.summary.duplicates} duplicates skipped) + D1; ${cache.simulations} new simulations in ${((performance.now() - started) / 1000).toFixed(0)} s`
  );

  // Stages 2 and 3, fold by fold.
  for (const [index, fold] of windows.entries()) {
    const foldIndex = index + 1;
    const minEntries = record.folds[index]!.minEntries;

    if (!record.ga.some((summary) => summary.fold === fold.key)) {
      const gaStarted = performance.now();
      const summary = await runGa(ticker, cache, fold.key, foldIndex, minEntries);

      record.ga.push(summary);
      await writeJson(recordFile, record);
      log(
        `${ticker}: ${fold.key} GA ${summary.generations} generations, ${summary.newEvaluations} new simulations, stop: ${summary.stopReason}, hypervolume ${summary.hypervolume.at(-1)?.toExponential(3)} (${((performance.now() - gaStarted) / 1000).toFixed(0)} s)`
      );
    }

    if (!record.selections.some((selection) => selection.fold === fold.key)) {
      const selection = await selectOnFold(ticker, data, cache, fold, foldIndex, minEntries);

      record.selections.push(selection);
      await writeJson(recordFile, record);
      log(
        `${ticker}: ${fold.key} selection — ${selection.policies.map((policy) => `${policy.policy}: ${policy.pick ? `${policy.pick.id} train net ${Math.round(policy.pick.train.net)} DD ${Math.round(policy.pick.train.minuteDrawdown)}` : 'none'}`).join('; ')}`
      );
    }
  }

  record.candidates = cache.entries.size;
  record.simulations += cache.simulations;
  record.completedAt = new Date().toISOString();
  await writeJson(recordFile, record);
  await writeCandidatesCsv(
    path.join(dir, 'candidates.csv'),
    [...cache.entries.values()],
    windows.map((fold) => fold.key)
  );
  await finalizeSelection(ticker, data, record, [...cache.entries.values()]);
  log(`${ticker}: search complete, ${record.candidates} candidates, ${cache.simulations} simulations this run`);

  return record;
};

export const d1ControlId = d1Id;
export type { View };
