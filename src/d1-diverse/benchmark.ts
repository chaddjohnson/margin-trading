// `npm run diverse-d1 -- benchmark` (PROTOCOL.md §19, before the freeze): the unit-cost benchmark and the tier choice.
// On the final training window it times trace builds, replays by book count and full-engine portfolio runs on random,
// outcome-independent configurations, the worker pool's scaling at 1, 4 and W workers, and memory (per trace, per
// store record); it projects each tier with NO trace reuse across configurations (conservative) and records the first
// tier within 20 hours and 13 GB. If none qualifies the study stops as an incomplete breadth study before any outcome.
// It prints and stores no configuration's P&L, drawdown or rank: runners are compared only by hash.
import { createHash } from 'node:crypto';
import os from 'node:os';
import { RobustEvaluator } from '../d1-robust/evaluator.ts';
import { GenomeSpace, Library } from '../d1-robust/genome.ts';
import type { Book } from '../d1-robust/neighbourhood.ts';
import { defaultWorkerCount } from '../d1-robust/pool.ts';
import { portfolioSpec } from '../d1-robust/promote.ts';
import { Rng } from '../optimizer/rng.ts';
import {
  type ArmClass,
  type Tier,
  type TierKey,
  type WindowKey,
  armClassOf,
  armSpecs,
  armsOf,
  jsonReplacer,
  log,
  nowIso,
  stageDir,
  study,
  tierFile,
  tierOrder,
  tiers,
  writeJson
} from './context.ts';
import { eligibleSymbols, trainingUniverse } from './data.ts';
import { codeState, requireCommitted } from './freeze.ts';
import { sobolLibrary } from './library.ts';
import { blocksOfLoaded } from './parity.ts';
import { ArmArchive } from './archive.ts';
import { buildSchedule } from './schedule.ts';
import { WindowStore } from './store.ts';
import { floorReferences } from '../d1-robust/stats.ts';

const hashOf = (value: unknown) => createHash('sha256').update(JSON.stringify(value, jsonReplacer)).digest('hex');
const gb = (bytes: number) => bytes / 1024 ** 3;

interface Counts {
  replays: number;
  traces: number;
  engines: number;
}

const add = (a: Counts, b: Counts): Counts => ({
  replays: a.replays + b.replays,
  traces: a.traces + b.traces,
  engines: a.engines + b.engines
});
const zero: Counts = { replays: 0, traces: 0, engines: 0 };

// Stage counts of one tier (conservative: every centre treated as feasible, so every scored configuration gets its
// discovery neighbours; no trace is reused across configurations).
export const projectTier = (
  tier: Tier,
  universeSize: number,
  schedule: { configurations: number; meanBooks: number }
) => {
  const k = { B: 3.5, C: 6, assessed: 5 };
  const perAssessment =
    4 +
    2 * tier.confirmDraws +
    study.draws.confirmA2 +
    study.draws.confirmN2 +
    8 * k.assessed +
    32 * k.assessed +
    k.assessed * tier.confirmDraws +
    4;
  const stages: Record<string, Counts> = {};
  let distinctMax = 0;
  let armEntriesMax = 0;

  for (const window of ['fold-a', 'fold-b', 'final'] as WindowKey[]) {
    const arms = armsOf(window);
    let windowCounts: Counts = {
      replays: schedule.configurations * (1 + tier.discDraws),
      traces: schedule.configurations * (1 + tier.discDraws) * schedule.meanBooks,
      engines: 0
    };
    let distinct = schedule.configurations;

    for (const arm of arms) {
      const cls: ArmClass = armClassOf(window, arm);
      const scored = armSpecs[arm].score !== 'Q';
      const b = universeSize * tier.stageB[cls];
      const c = study.stageC.islands * tier.stageC[cls];
      const draws = scored ? 1 + tier.discDraws : 1;
      const slots = study.shortlist[cls].length;

      distinct += b + c;
      armEntriesMax = Math.max(armEntriesMax, schedule.configurations + b + c);
      windowCounts = add(windowCounts, { replays: (b + c) * draws, traces: (b * k.B + c * k.C) * draws, engines: 0 });
      // promotion (1.5 attempts per slot)
      windowCounts = add(windowCounts, {
        replays: slots * 1.5 * tier.promoMembers * (4 + (scored ? tier.promoDraws : 0)),
        traces: slots * 1.5 * tier.promoMembers * (4 + (scored ? tier.promoDraws : 0)) * k.C,
        engines: slots * 1.5 * tier.promoMembers
      });
      // refinement and pruning (3 pruning rounds of k + 1 configurations)
      windowCounts = add(windowCounts, {
        replays:
          slots *
          (tier.refineCap[cls] * (2 + (scored ? tier.refineDraws : 0)) +
            (scored ? 3 * (k.assessed + 1) * tier.pruneDraws : 0)),
        traces:
          slots *
          (tier.refineCap[cls] * (2 + (scored ? tier.refineDraws : 0)) +
            (scored ? 3 * (k.assessed + 1) * tier.pruneDraws : 0)) *
          k.assessed,
        engines: slots * 4
      });
      // assessment
      windowCounts = add(windowCounts, {
        replays: slots * perAssessment,
        traces: slots * perAssessment * k.assessed,
        engines: slots * 30
      });
    }

    // benchmarks, ladder, controls, library pin
    windowCounts = add(windowCounts, {
      replays: 3 * perAssessment,
      traces: 3 * perAssessment * 4,
      engines: 3 * 30 + 5
    });
    windowCounts = add(windowCounts, {
      replays: 576 * (4 + study.draws.calib + 1),
      traces: 576 * (4 + study.draws.calib + 1) * 6.33,
      engines: 72
    });
    windowCounts = add(windowCounts, { replays: 0, traces: universeSize * study.library.sobolSamples, engines: 0 });

    if (window !== 'final') {
      windowCounts = add(windowCounts, {
        replays: 4 * 620 + 64 * 9 + 150,
        traces: (4 * 620 + 64 * 9 + 150) * 6,
        engines: 24
      });
    }

    stages[window] = windowCounts;
    distinctMax = Math.max(distinctMax, distinct);
  }

  stages['confirm-B'] = { replays: 38 * tier.confirmDraws, traces: 38 * tier.confirmDraws * k.assessed, engines: 0 };

  return { stages, totals: Object.values(stages).reduce(add, zero), distinctMax, armEntriesMax };
};

const randomConfigs = (universe: string[], count: number, label: string): Book[][] => {
  const space = new GenomeSpace(universe, new Library(sobolLibrary().vectors));
  const rng = Rng.from(study.seedLabel, 'benchmark', label);

  return Array.from({ length: count }, () => space.booksOf(space.uniform(rng, 1, 16)));
};

const heapAfterGc = () => {
  (globalThis as { gc?: () => void }).gc?.();

  return process.memoryUsage().heapUsed;
};

export const runBenchmark = async () => {
  await requireCommitted();

  const started = Date.now();
  const gcExposed = typeof (globalThis as { gc?: () => void }).gc === 'function';
  const universe = await eligibleSymbols();
  const rssBefore = process.memoryUsage().rss;
  const loaded = await trainingUniverse('final', { symbols: universe });
  const rssLoaded = process.memoryUsage().rss;
  const blocks = blocksOfLoaded(loaded);
  const configs = randomConfigs(universe, 200, 'configs');
  const label = 'diverse-d1:benchmark';
  const local = await RobustEvaluator.create(loaded, label, 0);
  const heapBefore = heapAfterGc();
  const traceStarted = performance.now();
  const held = await local.ensureTraces(
    configs.flatMap((books) => books.map((book) => ({ book, costBps: study.principalCostBps })))
  );
  const traceMs = (performance.now() - traceStarted) / Math.max(1, held.size);
  const bytesPerTrace = (heapAfterGc() - heapBefore) / Math.max(1, held.size);
  const replayMsByBooks: Record<number, number> = {};

  for (const books of [1, 4, 8, 16]) {
    const subset = configs.filter((config) => config.length === books).slice(0, 12);
    const pool =
      subset.length > 0 ? subset : configs.filter((config) => Math.abs(config.length - books) <= 1).slice(0, 12);
    const t0 = performance.now();
    const results = await local.centres(pool, study.principalCostBps, {
      markIndices: blocks.markIndices,
      withFunded: true
    });

    replayMsByBooks[books] = (performance.now() - t0) / Math.max(1, results.length);
  }

  // The memory of one store record and of one archive entry, with every trace already cached (a warm-up pass builds
  // the neighbours' traces first, so the measured heap growth is the retained records only).
  const sample = configs.slice(0, 100);
  const warmStore = new WindowStore(local, blocks, 16);

  await warmStore.evaluate(sample, true);

  const heapStore = heapAfterGc();
  const store = new WindowStore(local, blocks, 16);
  const records = await store.evaluate(sample, true);
  const bytesPerStoreRecord = Math.max(1024, (heapAfterGc() - heapStore) / sample.length);
  const heapArchive = heapAfterGc();
  const archive = new ArmArchive(store, {
    arm: 'T-u',
    armClass: 'final',
    window: 'final',
    references: floorReferences()
  });

  await archive.evaluateBatch(
    sample.map((books) => ({ books, meta: { stage: 'A', source: 'benchmark', generation: 0, operator: 'benchmark' } }))
  );

  const bytesPerEntry = Math.max(512, (heapAfterGc() - heapArchive) / sample.length);

  void records;

  const engineConfigs = configs.slice(0, 6);
  const t1 = performance.now();

  await local.engines(engineConfigs.map((books, index) => portfolioSpec(local, books, `bench-${index}`)));

  const engineMs = (performance.now() - t1) / engineConfigs.length;

  await local.close();

  const workload = configs.slice(0, 60);
  const scaling: Record<number, { seconds: number; hash: string; rssGb: number }> = {};
  const maxWorkers = defaultWorkerCount();

  for (const workers of [...new Set([0, 4, maxWorkers])]) {
    const evaluator = await RobustEvaluator.create(loaded, label, workers);
    const t0 = performance.now();
    const centres = await evaluator.centres(workload, study.principalCostBps, {
      markIndices: blocks.markIndices,
      withFunded: true
    });
    const neighbours = await evaluator.neighbourRecords(workload, {
      stage: 'benchmark',
      cls: 'N1',
      n: 8,
      costBps: study.principalCostBps,
      markIndices: blocks.markIndices
    });

    // resident memory under load (the workers have just served the workload)
    scaling[workers] = {
      seconds: (performance.now() - t0) / 1000,
      hash: hashOf([centres, neighbours]),
      rssGb: gb(process.memoryUsage().rss)
    };
    await evaluator.close();
  }

  const identical = Object.values(scaling).every((row) => row.hash === scaling[0]!.hash);

  if (!identical) {
    throw new Error('The worker pool and the in-process runner gave different results');
  }

  const speedup = Object.fromEntries(
    Object.entries(scaling).map(([workers, row]) => [workers, scaling[0]!.seconds / row.seconds])
  ) as Record<number, number>;
  const rssPerWorkerGb = Math.max(0, (scaling[maxWorkers]!.rssGb - scaling[0]!.rssGb) / Math.max(1, maxWorkers));
  const schedule = buildSchedule(universe, sobolLibrary().vectors);
  const meanBooks =
    schedule.configs.reduce((total, config) => total + config.books.length, 0) / schedule.configs.length;
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
  let chosenCapacity = 0;

  for (const key of tierOrder) {
    const tier = tiers[key];
    const { stages, totals, distinctMax, armEntriesMax } = projectTier(tier, universe.length, {
      configurations: schedule.configs.length,
      meanBooks
    });
    const singleHours = (totals.traces * traceMs + totals.replays * replayMs(5) + totals.engines * engineMs) / 3.6e6;
    const wallHours = singleHours / speedup[maxWorkers]!;
    // Resident memory without the trace cache; the cache capacity (speed only — evaluations are pure) is then the
    // largest that fits the ceiling with a 5% margin, between 20,000 and 150,000 traces.
    const fixedGb =
      gb(rssLoaded) +
      gb(universe.length * study.library.sobolSamples * bytesPerTrace) +
      gb(distinctMax * bytesPerStoreRecord) +
      gb(armEntriesMax * bytesPerEntry) +
      rssPerWorkerGb * maxWorkers;
    const capacity = Math.min(
      150000,
      Math.floor(((0.95 * study.tierRule.maxResidentGb - fixedGb) * 1024 ** 3) / Math.max(1, bytesPerTrace))
    );
    const residentGb = fixedGb + gb(Math.max(0, capacity) * bytesPerTrace);
    const fits =
      wallHours <= study.tierRule.maxWallHours && capacity >= 20000 && residentGb <= study.tierRule.maxResidentGb;

    projections[key] = {
      stages,
      totals,
      singleHours,
      wallHours,
      fixedGb,
      traceCacheCapacity: capacity,
      residentGb,
      distinctConfigurationsMax: distinctMax,
      armEntriesMax,
      fits
    };

    if (fits && !chosen) {
      chosen = key;
      chosenCapacity = capacity;
    }
  }

  const record = {
    generatedAt: nowIso(),
    codeState: await codeState(),
    rule: `the first of ${tierOrder.join(', ')} whose conservative projection is ≤ ${study.tierRule.maxWallHours} h wall-clock and ≤ ${study.tierRule.maxResidentGb} GB with a trace cache of ≥ 20,000; none → stop`,
    chosen: chosen ?? null,
    machine: { cpus: os.cpus().length, model: os.cpus()[0]?.model, memoryGb: gb(os.totalmem()), node: process.version },
    universe: { symbols: universe.length, rssBeforeGb: gb(rssBefore), rssLoadedGb: gb(rssLoaded) },
    unitCosts: {
      traceMs,
      replayMsByBooks,
      engineMs,
      speedup,
      workers: maxWorkers,
      bytesPerTrace,
      bytesPerStoreRecord,
      bytesPerEntry,
      rssPerWorkerGb,
      gcExposed
    },
    schedule: { configurations: schedule.configs.length, meanBooks, sha256: schedule.sha256 },
    scaling: Object.fromEntries(
      Object.entries(scaling).map(([key, row]) => [key, { seconds: row.seconds, rssGb: row.rssGb }])
    ),
    deterministicAcrossRunners: identical,
    projections,
    seconds: (Date.now() - started) / 1000,
    note: 'no configuration P&L, drawdown or rank is printed or stored by the benchmark'
  };

  await writeJson(stageDir('benchmark', 'benchmark.json'), record);

  if (!chosen) {
    throw new Error(
      'No tier fits 20 hours and 13 GB: the study stops as an incomplete breadth study (no outcome exists)'
    );
  }

  await writeJson(tierFile, {
    codeState: await codeState(),
    tier: chosen,
    label: tiers[chosen].label,
    decidedAt: record.generatedAt,
    rule: record.rule,
    benchmarkSha256: hashOf(record),
    workers: maxWorkers,
    traceCacheCapacity: chosenCapacity,
    projection: projections[chosen]
  });
  log(
    `benchmark: trace ${traceMs.toFixed(1)} ms (${(bytesPerTrace / 1024).toFixed(1)} KB), store record ${(bytesPerStoreRecord / 1024).toFixed(1)} KB, entry ${(bytesPerEntry / 1024).toFixed(1)} KB, replay ${Object.entries(
      replayMsByBooks
    )
      .map(([k, v]) => `${k}:${v.toFixed(1)}`)
      .join(
        ' '
      )} ms, engine ${engineMs.toFixed(0)} ms, speedup ${speedup[maxWorkers]!.toFixed(1)}× on ${maxWorkers} workers → tier ${chosen}, trace cache ${chosenCapacity}`
  );

  return record;
};
