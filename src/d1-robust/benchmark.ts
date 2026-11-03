// `npm run robust-d1 -- benchmark` (PROTOCOL.md §19): the unit-cost benchmark and the tier choice, before any pilot
// or search outcome. On the loaded eligible universe (final training window) it times trace builds, replays by book
// count and full-engine portfolio runs on 200 random, outcome-independent configurations, the worker pool's scaling
// at 1, 4 and W workers and memory; it projects every tier's wall-clock assuming NO neighbour-trace reuse across
// configurations (conservative) and peak memory, and records the first tier within 20 hours and 13 GB. It prints and
// stores no configuration's P&L, drawdown or ranking: results are compared between runners only by hash.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import os from 'node:os';
import { Rng } from '../optimizer/rng.ts';
import {
  type Tier,
  type TierKey,
  jsonReplacer,
  log,
  nowIso,
  protocolFreezeFile,
  stageDir,
  study,
  tierFile,
  tierOrder,
  tiers,
  writeJson
} from './context.ts';
import { eligibleSymbols, trainingUniverse } from './data.ts';
import { RobustEvaluator } from './evaluator.ts';
import { GenomeSpace, Library } from './genome.ts';
import { sobolLibrary } from './library.ts';
import type { Book } from './neighbourhood.ts';
import { defaultWorkerCount } from './pool.ts';
import { portfolioSpec } from './promote.ts';

const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(value, jsonReplacer)).digest('hex');
const gb = (bytes: number) => bytes / 1024 ** 3;

export interface UnitCosts {
  traceMs: number;
  replayMsByBooks: Record<number, number>;
  engineMs: number;
  speedup: Record<number, number>;
  workers: number;
  rssLoadedGb: number;
  bytesPerTrace: number;
  rssPerWorkerGb: number;
}

// Counts of traces, replays and engine runs per stage under a tier, assuming no neighbour-trace reuse.
export const projectTier = (
  tier: Tier,
  universeSize: number,
  nDiscovery: number,
  k: { pilot: number; search: number }
) => {
  const pilotConfigs = tier.pilotPerStratum * study.strata.length + 3;
  const pilotReplays = pilotConfigs * (4 + 64 + 64 + 32 + 8 * k.pilot + 32 * k.pilot + 1);
  const pilotTraces = pilotConfigs * (4 * k.pilot + 64 * k.pilot + 64 * k.pilot + 32 * 3 + 8 * k.pilot + 32 * k.pilot);
  const libraryTraces = universeSize * (study.library.sobolSamples + 25);
  const discovery = (configs: number, arm: 'J' | 'Q') => ({
    replays: configs * (1 + (arm === 'J' ? nDiscovery : 0)),
    traces: configs * k.search * (1 + (arm === 'J' ? nDiscovery : 0))
  });
  const promotion = (arm: 'J' | 'Q') => ({
    replays: tier.promotionTop * (4 + (arm === 'J' ? tier.promotionDraws : 0)),
    traces: tier.promotionTop * k.search * (4 + (arm === 'J' ? tier.promotionDraws : 0)),
    engines: tier.promotionTop
  });
  const refinement = (families: number, cap: number, arm: 'J' | 'Q') => ({
    replays: families * cap * (2 + (arm === 'J' ? tier.refineDraws : 0)),
    traces: families * cap * k.search * (2 + (arm === 'J' ? tier.refineDraws : 0)),
    engines: families * 4
  });
  const assessmentPer =
    4 + 2 * tier.confirmDraws + 128 + 64 + 8 * k.search + 32 * k.search + k.search * tier.confirmDraws + 4;
  const assessment = (finalists: number) => ({
    replays: (finalists + 3) * assessmentPer,
    traces: (finalists + 3) * assessmentPer * k.search,
    engines: (finalists + 3) * (8 + 16 + 8 + 2) + 5
  });
  const final = tier.finalBudget(universeSize);
  const fold = tier.foldBudget(universeSize);
  const stages: Record<string, { replays: number; traces: number; engines: number }> = {
    pilot: { replays: 3 * pilotReplays, traces: 3 * pilotTraces, engines: 3 * 72 },
    library: { replays: 0, traces: 3 * libraryTraces, engines: 0 },
    discoveryFolds: (['J', 'Q'] as const).reduce(
      (total, arm) => {
        const one = discovery(fold, arm);

        return { replays: total.replays + 2 * one.replays, traces: total.traces + 2 * one.traces, engines: 0 };
      },
      { replays: 0, traces: 0, engines: 0 }
    ),
    discoveryFinal: (() => {
      const arms = tier.seededArmInFinal ? 2 : 1;
      const one = discovery(final, 'J');

      return { replays: arms * one.replays, traces: arms * one.traces, engines: 0 };
    })(),
    promotion: (() => {
      const j = promotion('J');
      const q = promotion('Q');

      return {
        replays: 3 * j.replays + 2 * q.replays,
        traces: 3 * j.traces + 2 * q.traces,
        engines: 3 * j.engines + 2 * q.engines
      };
    })(),
    refinement: (() => {
      const finalJ = refinement(tier.refineFamilies.final, tier.refineCap.final, 'J');
      const foldJ = refinement(tier.refineFamilies.fold, tier.refineCap.fold, 'J');
      const foldQ = refinement(tier.refineFamilies.fold, tier.refineCap.fold, 'Q');

      return {
        replays: finalJ.replays + 2 * (foldJ.replays + foldQ.replays),
        traces: finalJ.traces + 2 * (foldJ.traces + foldQ.traces),
        engines: finalJ.engines + 2 * (foldJ.engines + foldQ.engines)
      };
    })(),
    assessment: (() => {
      const finalOne = assessment(tier.refineFamilies.final);
      const foldOne = assessment(2 * tier.refineFamilies.fold);

      return {
        replays: finalOne.replays + 2 * foldOne.replays,
        traces: finalOne.traces + 2 * foldOne.traces,
        engines: finalOne.engines + 2 * foldOne.engines
      };
    })(),
    validationAndConfirmation: {
      replays: 2 * 400 * 4 + 20 * 256,
      traces: 2 * 400 * 4 * k.pilot + 20 * 256 * k.search,
      engines: 200
    }
  };

  return stages;
};

const randomConfigs = (universe: string[], count: number, label: string): Book[][] => {
  const space = new GenomeSpace(universe, new Library(sobolLibrary().vectors));
  const rng = Rng.from(study.seedLabel, 'benchmark', label);

  return Array.from({ length: count }, () => space.booksOf(space.uniform(rng, 1, 16)));
};

export const runBenchmark = async () => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error(`${protocolFreezeFile} exists: this record is frozen and is never rewritten`);
  }

  const started = Date.now();
  const universe = await eligibleSymbols();
  const rssBefore = process.memoryUsage().rss;
  const loadStarted = Date.now();
  const loaded = await trainingUniverse('final', { symbols: universe });
  const loadSeconds = (Date.now() - loadStarted) / 1000;
  const rssLoaded = process.memoryUsage().rss;
  const configs = randomConfigs(universe, 200, 'configs');

  // Single-thread unit costs (fresh caches).
  const local = await RobustEvaluator.create(loaded, 'benchmark', 0);
  const heapBefore = process.memoryUsage().heapUsed;
  const traceStarted = performance.now();
  const traceItems = configs.flatMap((books) => books.map((book) => ({ book, costBps: study.principalCostBps })));
  const held = await local.ensureTraces(traceItems);
  const traceMs = (performance.now() - traceStarted) / Math.max(1, held.size);
  const bytesPerTrace = (process.memoryUsage().heapUsed - heapBefore) / Math.max(1, held.size);
  const replayMsByBooks: Record<number, number> = {};

  for (const books of [1, 4, 8, 16]) {
    const subset = configs.filter((config) => config.length === books).slice(0, 12);
    const pool =
      subset.length > 0 ? subset : configs.filter((config) => Math.abs(config.length - books) <= 1).slice(0, 12);
    const replayStarted = performance.now();
    const results = await local.centres(pool, study.principalCostBps);

    replayMsByBooks[books] = (performance.now() - replayStarted) / Math.max(1, results.length);
  }

  const engineConfigs = configs.slice(0, 6);
  const engineStarted = performance.now();
  const engineResults = await local.engines(
    engineConfigs.map((books, index) => portfolioSpec(local, books, `bench-${index}`))
  );
  const engineMs = (performance.now() - engineStarted) / engineConfigs.length;
  const localHash = hashOf(await local.centres(configs.slice(0, 60), study.principalCostBps));

  await local.close();

  // Pool scaling on the same workload (fresh evaluators: traces and replays of 60 configurations × 9 neighbours).
  const workload = configs.slice(0, 60);
  const scaling: Record<number, { seconds: number; hash: string; rssGb: number }> = {};
  const maxWorkers = defaultWorkerCount();

  for (const workers of [...new Set([0, 4, maxWorkers])]) {
    const evaluator = await RobustEvaluator.create(loaded, 'benchmark', workers);
    const rssWithWorkers = process.memoryUsage().rss;
    const t0 = performance.now();
    const centres = await evaluator.centres(workload, study.principalCostBps);
    const records = await evaluator.neighbourRecords(workload, {
      stage: 'benchmark',
      cls: 'N1',
      n: 8,
      costBps: study.principalCostBps
    });

    scaling[workers] = {
      seconds: (performance.now() - t0) / 1000,
      hash: hashOf([centres, records]),
      rssGb: gb(rssWithWorkers)
    };
    await evaluator.close();
  }

  const identical =
    Object.values(scaling).every((row) => row.hash === scaling[0]!.hash) &&
    hashOf(await (async () => localHash)()) !== '';
  const speedup = Object.fromEntries(
    Object.entries(scaling).map(([workers, row]) => [workers, scaling[0]!.seconds / row.seconds])
  ) as Record<number, number>;
  const workers = maxWorkers;
  const costs: UnitCosts = {
    traceMs,
    replayMsByBooks,
    engineMs,
    speedup,
    workers,
    rssLoadedGb: gb(rssLoaded),
    bytesPerTrace,
    rssPerWorkerGb: Math.max(0, (scaling[maxWorkers]!.rssGb - gb(rssLoaded)) / Math.max(1, maxWorkers))
  };
  const kPilot = study.strata.reduce((total, k) => total + k, 0) / study.strata.length;
  const kSearch = 6;
  const replayMs = (k: number) => {
    const keys = [1, 4, 8, 16];
    const below = [...keys].reverse().find((key) => key <= k) ?? 1;
    const above = keys.find((key) => key >= k) ?? 16;

    return below === above
      ? replayMsByBooks[below]!
      : replayMsByBooks[below]! + ((replayMsByBooks[above]! - replayMsByBooks[below]!) * (k - below)) / (above - below);
  };
  const projections: Record<string, unknown> = {};
  let chosen: TierKey | undefined;

  for (const key of tierOrder) {
    const tier = tiers[key];
    const nDiscovery = tier.nDiscoveryCandidates.at(-1)!;
    const stages = projectTier(tier, universe.length, nDiscovery, { pilot: kPilot, search: kSearch });
    const totals = Object.values(stages).reduce(
      (sum, stage) => ({
        replays: sum.replays + stage.replays,
        traces: sum.traces + stage.traces,
        engines: sum.engines + stage.engines
      }),
      { replays: 0, traces: 0, engines: 0 }
    );
    const singleHours =
      (totals.traces * traceMs + totals.replays * replayMs(kSearch) + totals.engines * engineMs) / 3.6e6;
    const wallHours = singleHours / speedup[workers]!;
    const dynamicCapacity = 150000;
    const residentGb =
      costs.rssLoadedGb +
      gb((universe.length * (study.library.sobolSamples + 25) + dynamicCapacity) * bytesPerTrace) +
      costs.rssPerWorkerGb * workers;
    const fits = wallHours <= study.tierRule.maxWallHours && residentGb <= study.tierRule.maxResidentGb;

    projections[key] = { stages, totals, singleHours, wallHours, residentGb, fits, nDiscoveryAssumed: nDiscovery };

    if (fits && !chosen) {
      chosen = key;
    }
  }

  const record = {
    generatedAt: nowIso(),
    rule: `the first of ${tierOrder.join(', ')} whose conservative projection is ≤ ${study.tierRule.maxWallHours} h wall-clock and ≤ ${study.tierRule.maxResidentGb} GB`,
    chosen: chosen ?? 'R',
    fallbackForced: !chosen,
    machine: { cpus: os.cpus().length, model: os.cpus()[0]?.model, memoryGb: gb(os.totalmem()), node: process.version },
    universe: { symbols: universe.length, loadSeconds, rssBeforeGb: gb(rssBefore), rssLoadedGb: gb(rssLoaded) },
    unitCosts: costs,
    scaling: Object.fromEntries(
      Object.entries(scaling).map(([key, row]) => [key, { seconds: row.seconds, rssGb: row.rssGb }])
    ),
    deterministicAcrossRunners: identical,
    engineRuns: engineResults.length,
    projections,
    note: 'no configuration P&L, drawdown or ranking is printed or stored by the benchmark'
  };

  if (!identical) {
    throw new Error('The worker pool and the in-process runner gave different results');
  }

  await writeJson(stageDir('benchmark', 'benchmark.json'), record);
  await writeJson(tierFile, {
    tier: record.chosen,
    label: tiers[record.chosen as TierKey].label,
    decidedAt: record.generatedAt,
    rule: record.rule,
    benchmarkSha256: hashOf(record),
    workers,
    projection: projections[record.chosen]
  });
  log(
    `benchmark: trace ${traceMs.toFixed(1)} ms, replay ${Object.entries(replayMsByBooks)
      .map(([k, v]) => `${k}:${v.toFixed(1)}`)
      .join(
        ' '
      )} ms, engine ${engineMs.toFixed(0)} ms, speedup ${speedup[workers]!.toFixed(1)}× on ${workers} workers → tier ${record.chosen} (${((Date.now() - started) / 1000).toFixed(0)} s)`
  );

  return record;
};
