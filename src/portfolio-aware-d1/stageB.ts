// Stage B (PROTOCOL.md §5): for each finalist ETF, the two tracks' NSGA-II refinements with identical designs and
// budgets, each seeded from the common pool and seeing only its own offspring; then each track's robust selection
// (R1–R5, with the one-parameter probes) and the full-engine confirmation of the champions (E4). Training only.
import path from 'node:path';
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
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { operatorSpace } from '../multi-etf-d1/space.ts';
import { type Track, baselineBooks, log, readJson, stageDir, study, writeJson } from './context.ts';
import { trainingUniverse } from './data.ts';
import { type VectorResult, StudyEvaluator } from './evaluate.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { replayAgainstFull } from './parity.ts';
import { candidateBook, type Grid, s0Books } from './phenotypes.ts';
import { type Genome, box, genomeOf, gridOfGenome, gridSizeOf, idOf, probesOf } from './space.ts';
import { type PoolRecord, readFinalists, readPool } from './stageA.ts';
import {
  drawdownOf,
  feasibleOf,
  foldsOf,
  median,
  objectiveOf,
  regimesOf,
  violationOf,
  withoutBestRegime
} from './tracks.ts';
import type { IntParams } from '../d1-refinement/families.ts';

const principal = study.principalCostBps;

export interface Evaluated {
  id: string;
  grid: Grid;
  origin: string; // pool origin, or 'ga:<track>:<generation>', or 'probe', or 'cost'
  results: Record<number, VectorResult>;
}

interface ScoredVector extends Scored {
  evaluated: Evaluated;
}

const scoreOf = (track: Track, evaluated: Evaluated): ScoredVector => {
  const result = evaluated.results[principal]!;

  return {
    id: evaluated.id,
    genome: genomeOf(evaluated.grid),
    objectives: [-objectiveOf(track, result), drawdownOf(track, result)],
    violation: Number.isFinite(objectiveOf(track, result)) ? violationOf(track, result) : 1e9,
    evaluated
  };
};

const normalizedLinf = (a: Genome, b: Genome) => {
  let distance = 0;

  box.forEach((spec, dimension) => {
    distance = Math.max(distance, Math.abs(a[dimension]! - b[dimension]!) / Math.max(1, gridSizeOf(spec) - 1));
  });

  return distance;
};

// The eight-ETF program's seeding: NSGA-II order, skipping vectors closer than the diversity threshold, then topped up.
const seedPopulation = (scored: ScoredVector[], size: number, minDistance: number) => {
  const ordered = selectSurvivors(scored, scored.length).map((ranked) => ranked.member);
  const chosen: ScoredVector[] = [];

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

export interface SearchSummary {
  symbol: string;
  track: Track;
  seed: number[];
  seeded: number;
  generations: number;
  newVectors: number;
  hypervolume: number[];
  stopReason: 'generations' | 'budget' | 'stagnation';
  repairs: number;
  seconds: number;
}

const trackDir = (symbol: string, track: Track) => stageDir('stageB', symbol, `track-${track}`);

const jsonLine = (value: unknown) =>
  JSON.stringify(value, (_key, item) => (typeof item === 'number' && !Number.isFinite(item) ? String(item) : item));

const revive = (_key: string, value: unknown) =>
  value === 'Infinity' ? Infinity : value === '-Infinity' ? -Infinity : value === 'NaN' ? NaN : value;

export const readEvaluated = async (symbol: string, track: Track): Promise<Evaluated[]> =>
  (await fs.readFile(path.join(trackDir(symbol, track), 'evaluations.jsonl'), 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line, revive) as Evaluated);

// One track's NSGA-II run on one ETF (§5.2).
const runSearch = (
  evaluator: StudyEvaluator,
  symbol: string,
  track: Track,
  pool: PoolRecord[],
  evaluated: Map<string, Evaluated>
): SearchSummary => {
  const { search } = study;
  const started = Date.now();
  const seed = deriveSeed('portfolio-aware-d1', symbol, track, 'nsga2');
  const rng = new Rng(seed);
  const reference: [number, number] = [0, study.drawdownCeiling];

  for (const record of pool) {
    evaluated.set(record.vector.id, {
      id: record.vector.id,
      grid: record.vector.grid,
      origin: record.vector.origin,
      results: record.results
    });
  }

  const seeded = seedPopulation(
    [...evaluated.values()].map((item) => scoreOf(track, item)),
    search.populationSize,
    search.seedDiversity
  );
  let population: Ranked<ScoredVector>[] = selectSurvivors(seeded, search.populationSize);
  const hypervolume: number[] = [];
  let best = hypervolume2d(
    population.map((ranked) => ranked.member),
    reference
  );
  let stopReason: SearchSummary['stopReason'] = 'generations';
  let stagnant = 0;
  let repairs = 0;
  let newVectors = 0;
  let generation = 0;
  const variation = {
    crossoverProbability: search.crossoverProbability,
    crossoverEta: search.crossoverEta,
    mutationEta: search.mutationEta
  };

  for (generation = 1; generation <= search.maxGenerations; generation++) {
    const room = search.maxNewVectors - newVectors;
    const target = Math.min(search.populationSize, room);
    const offspring: Genome[] = [];
    let attempts = 0;

    while (offspring.length < target && attempts < 100 * search.populationSize) {
      attempts++;

      const parentA = tournament(population, rng).member;
      const parentB = tournament(population, rng).member;
      const crossed = sbx(operatorSpace, parentA.genome, parentB.genome, rng, variation);

      repairs += crossed.repairs;

      for (const child of crossed.children) {
        if (offspring.length >= target) {
          break;
        }

        let mutated = polynomialMutation(operatorSpace, child, rng, variation);
        let id = idOf(gridOfGenome(mutated.genome) as IntParams);

        for (let retry = 0; retry < 5 && evaluated.has(id); retry++) {
          mutated = polynomialMutation(operatorSpace, mutated.genome, rng, { ...variation, mutationProbability: 0.5 });
          id = idOf(gridOfGenome(mutated.genome) as IntParams);
        }

        repairs += mutated.repairs;

        if (!evaluated.has(id) && !offspring.some((genome) => idOf(gridOfGenome(genome) as IntParams) === id)) {
          offspring.push(mutated.genome);
        }
      }
    }

    const children: ScoredVector[] = [];

    for (const genome of offspring) {
      const grid = gridOfGenome(genome);
      const item: Evaluated = {
        id: idOf(grid as IntParams),
        grid,
        origin: `ga:${track}:${generation}`,
        results: { [principal]: evaluator.evaluateVector(symbol, grid, principal) }
      };

      evaluated.set(item.id, item);
      children.push(scoreOf(track, item));
      newVectors++;
    }

    const combined = new Map<string, ScoredVector>();

    for (const member of [...population.map((ranked) => ranked.member), ...children]) {
      combined.set(member.id, member);
    }

    population = selectSurvivors([...combined.values()], search.populationSize);

    const volume = hypervolume2d(
      population.map((ranked) => ranked.member),
      reference
    );

    hypervolume.push(volume);
    stagnant = volume > best * (1 + search.earlyStopTolerance) + 1e-12 ? 0 : stagnant + 1;
    best = Math.max(best, volume);

    if (newVectors >= search.maxNewVectors) {
      stopReason = 'budget';
      break;
    }

    if (stagnant >= search.earlyStopPatience) {
      stopReason = 'stagnation';
      break;
    }
  }

  return {
    symbol,
    track,
    seed,
    seeded: seeded.length,
    generations: Math.min(generation, search.maxGenerations),
    newVectors,
    hypervolume,
    stopReason,
    repairs,
    seconds: (Date.now() - started) / 1000
  };
};

// ----- §5.3 robust selection -----

export interface RobustCheck {
  id: string;
  origin: string;
  grid: Grid;
  objective: Record<number, number>; // by cost
  drawdown: number;
  folds: number[];
  foldsPositive: number;
  withoutBestRegime: number;
  probes: { key: string; offset: number; id: string; feasible: boolean; objective: number }[];
  probeFeasibleShare: number;
  probeMedian: number;
  netPerDrawdown?: number;
  r: { R1: boolean; R2: boolean; R3: boolean; R4: boolean; R5: boolean };
  robust: boolean;
}

const ensureCosts = (evaluator: StudyEvaluator, symbol: string, item: Evaluated) => {
  for (const costBps of study.costsBps) {
    if (!item.results[costBps]) {
      item.results[costBps] = evaluator.evaluateVector(symbol, item.grid, costBps);
    }
  }
};

export const robustSelection = (
  evaluator: StudyEvaluator,
  symbol: string,
  track: Track,
  evaluated: Map<string, Evaluated>,
  probeCache: Map<string, VectorResult>
) => {
  const s0 = evaluator.s0Result(principal);
  const s0NetPerDrawdown = s0.net / s0.minuteDrawdown.maximum;
  const feasible = [...evaluated.values()]
    .filter((item) => feasibleOf(track, item.results[principal]!))
    .sort(
      (a, b) =>
        objectiveOf(track, b.results[principal]!) - objectiveOf(track, a.results[principal]!) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );
  const checks: RobustCheck[] = [];
  const check = (item: Evaluated): RobustCheck => {
    ensureCosts(evaluator, symbol, item);

    const result = item.results[principal]!;
    const objective = Object.fromEntries(
      study.costsBps.map((costBps) => [costBps, objectiveOf(track, item.results[costBps]!)])
    );
    const folds = foldsOf(track, result);
    const probes = probesOf(item.grid).map((probe) => {
      const probeId = idOf(probe.grid as IntParams);
      let probeResult = evaluated.get(probeId)?.results[principal] ?? probeCache.get(probeId);

      if (!probeResult) {
        probeResult = evaluator.evaluateVector(symbol, probe.grid, principal);
        probeCache.set(probeId, probeResult);
      }

      return {
        key: probe.key,
        offset: probe.offset,
        id: probeId,
        feasible: feasibleOf(track, probeResult),
        objective: objectiveOf(track, probeResult)
      };
    });
    const probeFeasibleShare = probes.length ? probes.filter((probe) => probe.feasible).length / probes.length : 0;
    const probeMedian = median(probes.map((probe) => probe.objective));
    const foldsPositive = folds.filter((value) => value > 0).length;
    const without = withoutBestRegime(objectiveOf(track, result), regimesOf(track, result));
    const r = {
      R1: objective[0]! > 0 && objective[2]! > 0 && objective[10]! > 0,
      R2: foldsPositive >= study.selection.minFoldsPositive,
      R3: without > 0,
      R4:
        probeFeasibleShare >= study.selection.plateauFeasibleShare &&
        probeMedian > 0 &&
        probeMedian >= study.selection.plateauMedianShare * objective[principal]!,
      R5: track === 'S' || result.pool.netPerDrawdown >= study.selection.riskEfficiencyShare * s0NetPerDrawdown
    };

    return {
      id: item.id,
      origin: item.origin,
      grid: item.grid,
      objective,
      drawdown: drawdownOf(track, result),
      folds,
      foldsPositive,
      withoutBestRegime: without,
      probes,
      probeFeasibleShare,
      probeMedian,
      netPerDrawdown: track === 'P' ? result.pool.netPerDrawdown : undefined,
      r,
      robust: r.R1 && r.R2 && r.R3 && r.R4 && r.R5
    };
  };

  let selected: RobustCheck | undefined;
  let shortlist: number = study.selection.shortlist;

  for (const item of feasible.slice(0, study.selection.shortlist)) {
    checks.push(check(item));
  }

  selected = checks.find((row) => row.robust);

  if (!selected) {
    shortlist = study.selection.extendedShortlist;

    for (const item of feasible.slice(study.selection.shortlist, study.selection.extendedShortlist)) {
      checks.push(check(item));
    }

    selected = checks.find((row) => row.robust);
  }

  return { feasibleCount: feasible.length, shortlist, checks, selected, s0NetPerDrawdown };
};

// ----- the stage -----

export const runStageB = async () => {
  await requireProtocolFrozen();

  const { finalists } = await readFinalists();
  const loaded = await trainingUniverse();
  const evaluator = await StudyEvaluator.create(loaded);
  const books = await s0Books();
  const champions: Record<string, Record<Track, unknown>> = {};

  for (const symbol of finalists) {
    const pool = await readPool(symbol);

    champions[symbol] = {} as Record<Track, unknown>;

    for (const track of ['S', 'P'] as const) {
      const evaluated = new Map<string, Evaluated>();
      const summary = runSearch(evaluator, symbol, track, pool, evaluated);
      const probeCache = new Map<string, VectorResult>();
      const selection = robustSelection(evaluator, symbol, track, evaluated, probeCache);
      const dir = trackDir(symbol, track);

      await fs.outputFile(
        path.join(dir, 'evaluations.jsonl'),
        `${[...evaluated.values()].map((item) => jsonLine(item)).join('\n')}\n`
      );
      await fs.outputFile(
        path.join(dir, 'probes.jsonl'),
        `${[...probeCache.entries()].map(([id, result]) => jsonLine({ id, result })).join('\n')}\n`
      );
      await writeJson(path.join(dir, 'search.json'), summary);
      await writeJson(path.join(dir, 'selection.json'), selection);

      // E4: the champion on the full engine (addition and standalone, four costs).
      let fullEngine: unknown = null;

      if (selection.selected) {
        const phenotype = candidateBook(symbol, selection.selected.id, selection.selected.grid);
        const phenotypes = { ...books, [symbol]: phenotype };
        const rows = [];

        for (const costBps of study.costsBps) {
          for (const [kind, symbols] of [
            ['addition', [...baselineBooks, symbol]],
            ['standalone', [symbol]]
          ] as const) {
            const outcome = replayAgainstFull(loaded, [...symbols], phenotypes, costBps);

            rows.push({
              costBps,
              kind,
              differences: outcome.differences.length,
              first: outcome.differences.slice(0, 3)
            });
          }
        }

        fullEngine = { rows, passed: rows.every((row) => row.differences === 0) };

        if (!rows.every((row) => row.differences === 0)) {
          throw new Error(`E4: the ${symbol} track ${track} champion differs on the full engine`);
        }
      }

      champions[symbol]![track] = {
        selected: selection.selected
          ? { id: selection.selected.id, origin: selection.selected.origin, grid: selection.selected.grid }
          : null,
        feasible: selection.feasibleCount,
        robustInShortlist: selection.checks.filter((row) => row.robust).length,
        shortlistChecked: selection.checks.length,
        search: summary,
        fullEngine
      };
      log(
        `${symbol} track ${track}: ${summary.newVectors} new vectors (${summary.stopReason}); ${selection.checks.filter((row) => row.robust).length} robust of ${selection.checks.length}; selected ${selection.selected?.id ?? 'none'}`
      );
    }
  }

  await writeJson(stageDir('stageB', 'champions.json'), {
    generatedAt: new Date().toISOString(),
    finalists,
    evaluatorCounts: { traces: evaluator.traces, replays: evaluator.replays },
    champions
  });
};

export const readChampions = () =>
  readJson<{
    finalists: string[];
    champions: Record<string, Record<Track, { selected: { id: string; origin: string; grid: Grid } | null }>>;
  }>(stageDir('stageB', 'champions.json'));
