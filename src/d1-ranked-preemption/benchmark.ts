// The outcome-blind benchmark (PROTOCOL.md §16): unit costs of a standalone evaluation and of a preemptive pool
// replay on the final window, single-threaded and on the worker pool, and the resident memory; projections of every
// tier; the first tier whose conservative projection fits the frozen rule is chosen and written to tier.json. Only
// timings and memory are recorded or printed — no P&L, drawdown or trade count of any configuration.
import fs from 'fs-extra';
import { Rng } from '../optimizer/rng.ts';
import { allocationOf } from './allocation.ts';
import {
  type Tier,
  type WindowKey,
  log,
  nowIso,
  study,
  tierFile,
  tierOrder,
  tiers,
  windowKeys,
  writeJson
} from './context.ts';
import { trainingUniverse } from './data.ts';
import { Evaluator } from './evaluator.ts';
import { gitState } from './freeze.ts';
import { defaultWorkerCount } from './pool.ts';
import { randomVector, sobolVectors } from './space.ts';

const rssGb = () => process.memoryUsage().rss / 1024 ** 3;

const time = async <T>(work: () => Promise<T>) => {
  const start = performance.now();
  const value = await work();

  return { value, ms: performance.now() - start };
};

// Stage evaluations of one window under a tier (standalone, pool replays incl. neighbourhoods and controls).
export const workOf = (tier: Tier, window: WindowKey, symbols: number) => {
  const s = study.standalone;
  const standalone =
    symbols *
    (tier.sobol + s.localStarts * tier.localRounds * s.localMovesPerRound + s.neighbourhoodTop * tier.standaloneDraws);
  const arms = study.windows[window].arms.length;
  const branches = 2; // R1, R2
  const j = study.joint;
  const search = branches * arms * tier.jointBudget[window];
  const promotion = branches * arms * j.promotionTop * tier.promotionDraws;
  const refinement = branches * arms * j.promotionKeep * j.refinementCycles * (8 * j.refinementMoves + 8);
  const assessment = branches * arms * j.promotionKeep * (tier.assessmentDraws + tier.assessmentA2Draws) * 4; // 4 costs
  const controls = 64 * 4 * 5; // A/B/C/D, ablations, policies × costs (generous)

  return { standalone, pools: search + promotion + refinement + assessment + controls };
};

export const runBenchmark = async (options: { workers?: number } = {}) => {
  if (await fs.pathExists(tierFile)) {
    throw new Error(`${tierFile} exists: the tier is chosen once`);
  }

  const workers = options.workers ?? defaultWorkerCount();
  const rssBefore = rssGb();
  const load = await time(() => trainingUniverse('final', { beforeProtocolFreeze: true }));
  const loaded = load.value;
  const symbols = Object.keys(loaded.universe.instruments).sort();
  const rssLoaded = rssGb();
  const rng = Rng.from(study.seedLabel, 'benchmark');
  const standaloneItems = (n: number) =>
    Array.from({ length: n }, (_, index) => {
      const symbol = symbols[rng.int(symbols.length)]!;
      const vector = sobolVectors(symbol, 64, 'benchmark')[index % 64]!;

      return { book: { symbol, vector }, costBps: 5, minTrades: 1 };
    });
  const poolRequests = (n: number) =>
    Array.from({ length: n }, (_, index) => {
      const size = 2 + rng.int(7);
      const members = [...symbols].sort(() => rng.next() - 0.5).slice(0, size);
      const order = [...members].sort(() => rng.next() - 0.5);

      return {
        books: members.map((symbol) => ({ symbol, vector: randomVector(rng, `benchmark:${index}`) })),
        costBps: 5,
        allocation: allocationOf('P1', { rankingId: 'benchmark', order }),
        minLots: 1
      };
    });

  // single-threaded
  const local = await Evaluator.create(loaded, 0);
  const localStandalone = await time(() => local.standalone(standaloneItems(48)));
  const localPools = await time(() => local.pools(poolRequests(48)));
  const cachedRequests = poolRequests(16);

  await local.pools(cachedRequests);

  const localReplays = await time(() => local.pools(cachedRequests));

  await local.close();

  // the worker pool
  const pool = await Evaluator.create(loaded, workers);
  const poolStandalone = await time(() => pool.standalone(standaloneItems(512)));
  const poolPools = await time(() => pool.pools(poolRequests(384)));
  const rssPool = rssGb();

  await pool.close();

  const unit = {
    loadSeconds: load.ms / 1000,
    standaloneMsSingle: localStandalone.ms / 48,
    poolMsSingle: localPools.ms / 48,
    replayMsSingleCached: localReplays.ms / 16,
    standaloneMsPool: poolStandalone.ms / 512,
    poolMsPool: poolPools.ms / 384
  };
  // window cost relative to the final window: sessions after arming
  const finalSessions = loaded.universe.sessionCount - loaded.universe.eligibilityIndex;
  const ratio: Record<WindowKey, number> = { 'fold-a': 0, 'fold-b': 0, final: 1 };

  for (const window of windowKeys) {
    const end = study.windows[window].searchEnd;
    const sessions = loaded.universe.dates.filter((date) => date >= study.eligibilityDate && date <= end).length;

    ratio[window] = sessions / finalSessions;
  }

  // Conservative: 1.5 × measured unit costs, the fold windows at their whole-history share plus a fixed 25%.
  const safety = study.benchmark.safety;
  const projections = Object.fromEntries(
    tierOrder.map((key) => {
      const tier = tiers[key];
      let seconds = 0;

      for (const window of windowKeys) {
        const work = workOf(tier, window, symbols.length);
        const scale = Math.min(1, ratio[window] + study.benchmark.foldShareMargin);

        seconds += (safety * scale * (work.standalone * unit.standaloneMsPool + work.pools * unit.poolMsPool)) / 1000;
      }

      // portfolio engine runs of the controls and shortlists: 400 runs at 4 s each on one thread
      seconds += 400 * 4;

      const residentGb = rssPool + 1.5; // the trace cache at capacity on top of the measured pool

      return [
        key,
        {
          wallHours: seconds / 3600,
          residentGb,
          fits: seconds / 3600 <= study.tierRule.maxWallHours && residentGb <= study.tierRule.maxResidentGb,
          work: Object.fromEntries(windowKeys.map((window) => [window, workOf(tier, window, symbols.length)]))
        }
      ];
    })
  );
  const chosen = tierOrder.find((key) => projections[key]!.fits);

  if (!chosen) {
    throw new Error('No tier fits the frozen rule: the study stops');
  }

  const record = {
    generatedAt: nowIso(),
    git: gitState(),
    rule: `the first of ${tierOrder.join(', ')} whose conservative projection is ≤ ${study.tierRule.maxWallHours} h wall-clock and ≤ ${study.tierRule.maxResidentGb} GB resident; none → stop`,
    machine: {
      cpus: (await import('node:os')).cpus().length,
      model: (await import('node:os')).cpus()[0]?.model ?? '',
      memoryGb: (await import('node:os')).totalmem() / 1024 ** 3,
      node: process.version
    },
    workers,
    universe: {
      symbols: symbols.length,
      sessions: loaded.universe.sessionCount,
      rssBeforeGb: rssBefore,
      rssLoadedGb: rssLoaded
    },
    unit,
    windowRatio: ratio,
    rssPoolGb: rssPool,
    projections,
    chosen,
    tier: tiers[chosen]
  };

  await writeJson(tierFile, record);
  log(
    `benchmark: standalone ${unit.standaloneMsPool.toFixed(2)} ms, pool ${unit.poolMsPool.toFixed(2)} ms (${workers} workers); tier ${chosen} (${projections[chosen]!.wallHours.toFixed(2)} h projected) → ${tierFile}`
  );

  return record;
};
