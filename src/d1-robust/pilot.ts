// Stage S2 (PROTOCOL.md §7): the training-only pilot of one window. 360 random, unoptimized configurations (nine
// cardinality strata × 40; Tier R × 20) — memberships uniform over U, vectors uniform from the Sobol library, the same
// configurations on every window — each with centres at four costs and the N1-A1, N1-A2, N2, N3 and N0 classes;
// B1/B4/B5 identically (published beside, never pooled). Then the machinery checks, the persistence diagnostic (final
// window) and the predeclared mapping to the window's constants (risk references, discovery draws), written once to
// pilot_freeze.json. No pilot configuration is a candidate.
import fs from 'fs-extra';
import { probeParams } from '../multi-etf-d1/space.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { box } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { type Tier, type WindowKey, log, nowIso, stageDir, study, writeJson } from './context.ts';
import { type Evaluation, canonicalBooks, keyOf } from './evaluate.ts';
import type { RobustEvaluator } from './evaluator.ts';
import { pickDistinct } from './genome.ts';
import { provenance, sha256, writeSealed } from './freeze.ts';
import { sobolLibrary } from './library.ts';
import { type Book, applySigns, neighbourOf, stepPattern, vectorOfGrid } from './neighbourhood.ts';
import {
  type NeighbourRecord,
  type NeighbourhoodStats,
  calibrateReferences,
  chooseDiscoveryDraws,
  median,
  quantile,
  spearman,
  subsampledSe,
  summarize
} from './stats.ts';

export const pilotDir = (window: WindowKey, ...parts: string[]) => stageDir('pilot', window, ...parts);
export const pilotFreezeFile = (window: WindowKey, dir = pilotDir(window)) => `${dir}/pilot_freeze.json`;

export interface PilotConfig {
  key: string;
  stratum: number;
  index: number;
  books: Book[];
}

// The 360 configurations (window-independent).
export const pilotConfigs = (universe: readonly string[], perStratum: number): PilotConfig[] => {
  const library = sobolLibrary().vectors;
  const configs: PilotConfig[] = [];

  for (const stratum of study.strata) {
    for (let index = 0; index < perStratum; index++) {
      const rng = Rng.from(study.seedLabel, 'pilot-config', stratum, index);
      const members = pickDistinct(universe, Math.min(stratum, universe.length), rng).sort();
      const books = members.map((symbol) => ({ symbol, vector: library[rng.int(library.length)]! }));

      configs.push({ key: keyOf(books), stratum, index, books });
    }
  }

  return configs;
};

export interface PilotRecord {
  key: string;
  label: string;
  stratum: number;
  books: number;
  centre: Record<
    string,
    Pick<
      Evaluation,
      | 'net'
      | 'minuteDrawdown'
      | 'dailyDrawdown'
      | 'lots'
      | 'lotYears'
      | 'inertBooks'
      | 'utilization'
      | 'top2'
      | 'regimes'
      | 'years'
      | 'heldDays'
    >
  >;
  a1: NeighbourhoodStats;
  a2: NeighbourhoodStats;
  n2: NeighbourhoodStats;
  n3: NeighbourhoodStats;
  n0: { count: number; median: number; p10: number; feasibleShare: number };
  a1Nets: number[];
  eligible: boolean;
  zeroAmplitudeEqual: boolean;
  persistence?: { netToSplit: number; netAfterSplit: number; p50ToSplit: number };
  bestRegimeShare: number;
}

const centreFields = (e: Evaluation) => ({
  net: e.net,
  minuteDrawdown: e.minuteDrawdown,
  dailyDrawdown: e.dailyDrawdown,
  lots: e.lots,
  lotYears: e.lotYears,
  inertBooks: e.inertBooks,
  utilization: e.utilization,
  top2: e.top2,
  regimes: e.regimes,
  years: e.years,
  heldDays: e.heldDays
});

export const isEligibleControl = (centre5: { net: number; minuteDrawdown: number; lots: number }) =>
  centre5.minuteDrawdown <= study.drawdownCeiling && centre5.lots >= study.riskPenalty.eligibleControlMinimumLots;

// Evaluates a list of configurations under every pilot class (in batches; results in order).
export const evaluatePilotConfigs = async (
  evaluator: RobustEvaluator,
  configs: { key: string; label: string; stratum: number; books: Book[] }[],
  options: { splitIndex?: number } = {}
): Promise<PilotRecord[]> => {
  const books = configs.map((config) => canonicalBooks(config.books));
  const marks = options.splitIndex !== undefined ? [options.splitIndex] : undefined;
  const centres: Record<number, Evaluation[]> = {};

  for (const costBps of study.costsBps) {
    centres[costBps] = await evaluator.centres(
      books,
      costBps,
      costBps === study.principalCostBps ? { markIndices: marks } : {}
    );
  }

  const draws = study.pilot.draws;
  const a1 = await evaluator.neighbourRecords(books, {
    stage: 'pilot',
    cls: 'N1',
    n: draws.A1,
    costBps: study.principalCostBps,
    markIndices: marks
  });
  const a2 = await evaluator.neighbourRecords(books, {
    stage: 'pilot-A2',
    cls: 'N1A2',
    n: draws.A2,
    costBps: study.principalCostBps
  });
  const n2 = await evaluator.neighbourRecords(books, {
    stage: 'pilot-N2',
    cls: 'N2',
    n: draws.N2,
    costBps: study.principalCostBps
  });

  // N3: 8 draws per member, every member of every configuration in one batch.
  const n3Requests: { config: number; member: string }[] = configs.flatMap((_, c) =>
    books[c]!.map((book) => ({ config: c, member: book.symbol }))
  );
  const n3Records = await evaluator.neighbourRecords(
    n3Requests.map((request) => books[request.config]!),
    {
      stage: 'pilot-N3',
      cls: 'N3',
      n: draws.N3PerMember,
      costBps: study.principalCostBps,
      member: n3Requests.map((request) => request.member)
    }
  );

  // N0 probes and the zero-amplitude draw, in one batch.
  const probeSets = books.map((config) =>
    config.flatMap((book) =>
      probeParams(book.vector.grid as unknown as IntParams).map((probe) =>
        config.map((item) =>
          item.symbol === book.symbol
            ? { symbol: item.symbol, vector: vectorOfGrid(probe.params as unknown as Grid, 'probe') }
            : item
        )
      )
    )
  );
  const zero = books.map((config) =>
    config.map((book) => ({
      symbol: book.symbol,
      vector: vectorOfGrid(
        applySigns(book.vector.grid, stepPattern(evaluator.label, 'pilot', 'N1', 0).get(book.symbol)!, 0),
        'zero amplitude'
      )
    }))
  );
  const probeEvaluations = (await evaluator.run([
    ...probeSets
      .flat()
      .map((probe) => ({ mode: 'neighbour' as const, books: probe, costBps: study.principalCostBps, moved: 1 })),
    ...zero.map((config) => ({ mode: 'neighbour' as const, books: config, costBps: study.principalCostBps, moved: 0 }))
  ])) as NeighbourRecord[];
  let probeCursor = 0;
  let n3Cursor = 0;

  return configs.map((config, c) => {
    const five = centres[study.principalCostBps]![c]!;
    const probes = probeEvaluations.slice(probeCursor, probeCursor + probeSets[c]!.length);

    probeCursor += probeSets[c]!.length;

    const memberRecords = books[c]!.flatMap(() => n3Records[n3Cursor++]!);
    const zeroRecord = probeEvaluations[probeSets.flat().length + c]!;
    const probeNets = probes.map((record) => record.net).sort((x, y) => x - y);
    const bestRegime = Math.max(0, ...five.regimes);

    return {
      key: config.key,
      label: config.label,
      stratum: config.stratum,
      books: books[c]!.length,
      centre: Object.fromEntries(study.costsBps.map((costBps) => [costBps, centreFields(centres[costBps]![c]!)])),
      a1: summarize(five.net, a1[c]!),
      a2: summarize(five.net, a2[c]!),
      n2: summarize(five.net, n2[c]!),
      n3: summarize(five.net, memberRecords),
      n0: {
        count: probes.length,
        median: median(probeNets),
        p10: quantile(probeNets, 0.1),
        feasibleShare:
          probes.filter((record) => record.drawdown <= study.drawdownCeiling).length / Math.max(1, probes.length)
      },
      a1Nets: a1[c]!.map((record) => record.net),
      eligible: isEligibleControl(five),
      zeroAmplitudeEqual:
        zeroRecord.net === five.net && zeroRecord.drawdown === five.minuteDrawdown && zeroRecord.lots === five.lots,
      ...(marks
        ? {
            persistence: {
              netToSplit: five.markAt![0]!,
              netAfterSplit: five.net - five.markAt![0]!,
              p50ToSplit: median(a1[c]!.map((record) => record.markAt![0]!))
            }
          }
        : {}),
      bestRegimeShare: five.net > 0 ? bestRegime / five.net : NaN
    };
  });
};

// Boundary move frequency on a corner pseudo-configuration (every coordinate at a bound) under the pilot's labels,
// plus the pilot's own boundary-sitting coordinates.
const boundaryFrequency = (window: string, configs: PilotConfig[]) => {
  let moves = 0;
  let total = 0;
  let outOfBox = 0;
  const corner = Object.fromEntries(
    box.map((spec, j) => [spec.key, j % 2 === 0 ? spec.min : spec.max])
  ) as unknown as Grid;

  for (let draw = 0; draw < study.pilot.draws.A1; draw++) {
    for (const symbol of ['VGT', 'XBI', 'GDX', 'TLT']) {
      const next = applySigns(corner, stepPattern(window, 'pilot', 'N1', draw).get(symbol)!);

      box.forEach((spec) => {
        const key = spec.key as keyof Grid;

        total++;
        moves += next[key] !== corner[key] ? 1 : 0;
        outOfBox += next[key] < spec.min || next[key] > spec.max ? 1 : 0;
      });
    }
  }

  let pilotBoundary = 0;
  let pilotBoundaryMoves = 0;

  for (const config of configs) {
    for (let draw = 0; draw < study.pilot.draws.A1; draw++) {
      const neighbour = neighbourOf(config.books, window, 'pilot', 'N1', draw);

      for (const book of config.books) {
        const moved = neighbour.find((item) => item.symbol === book.symbol)!.vector.grid;

        box.forEach((spec) => {
          const key = spec.key as keyof Grid;
          const value = book.vector.grid[key];

          if (moved[key] < spec.min || moved[key] > spec.max) {
            outOfBox++;
          }

          if (value === spec.min || value === spec.max) {
            pilotBoundary++;
            pilotBoundaryMoves += moved[key] !== value ? 1 : 0;
          }
        });
      }
    }
  }

  return {
    cornerFrequency: moves / total,
    cornerSamples: total,
    pilotBoundarySamples: pilotBoundary,
    pilotBoundaryFrequency: pilotBoundary > 0 ? pilotBoundaryMoves / pilotBoundary : NaN,
    outOfBox
  };
};

export const runPilot = async (
  evaluator: RobustEvaluator,
  window: WindowKey,
  universe: readonly string[],
  tier: Tier,
  benchmarks: Record<'B1' | 'B4' | 'B5', Book[]>,
  dir: string = pilotDir(window)
) => {
  if (await fs.pathExists(pilotFreezeFile(window, dir))) {
    throw new Error(`${pilotFreezeFile(window, dir)} exists: the pilot of ${window} is frozen once`);
  }

  const started = Date.now();
  const configs = pilotConfigs(universe, tier.pilotPerStratum);
  const splitIndex =
    window === 'final' ? evaluator.dates.filter((date) => date <= study.pilot.persistenceSplit).length - 1 : undefined;
  const records: PilotRecord[] = [];

  for (let index = 0; index < configs.length; index += 40) {
    const slice = configs.slice(index, index + 40);

    records.push(
      ...(await evaluatePilotConfigs(
        evaluator,
        slice.map((config) => ({
          key: config.key,
          label: `control ${config.stratum}/${config.index}`,
          stratum: config.stratum,
          books: config.books
        })),
        { splitIndex }
      ))
    );
    log(
      `pilot ${window}: ${records.length} of ${configs.length} controls (${((Date.now() - started) / 1000).toFixed(0)} s)`
    );
  }

  const benchmarkRecords = await evaluatePilotConfigs(
    evaluator,
    (['B1', 'B4', 'B5'] as const).map((key) => ({
      key: keyOf(benchmarks[key]),
      label: key,
      stratum: benchmarks[key].length,
      books: benchmarks[key]
    })),
    { splitIndex }
  );

  // Machinery checks.
  const eligible = records.filter((record) => record.eligible);
  // Pooled over ACTIVE controls (≥ 4 centre funded lots, any centre drawdown: Fable's NEIGHBORHOOD §8.3 definition,
  // restored by amendment 1 — pooling only drawdown-feasible centres selects lucky centres and biases the share low),
  // exact ties (neighbours whose net equals the base) counted one half. The other pools are reported beside it.
  const pooledShare = (records: PilotRecord[]) => {
    const n = records.reduce((total, record) => total + record.a1.n, 0);

    return {
      midRank:
        records.reduce((total, record) => total + (record.a1.shareAbove + record.a1.shareTied / 2) * record.a1.n, 0) /
        Math.max(1, n),
      strict: records.reduce((total, record) => total + record.a1.shareAbove * record.a1.n, 0) / Math.max(1, n),
      tied: records.reduce((total, record) => total + record.a1.shareTied * record.a1.n, 0) / Math.max(1, n),
      controls: records.length
    };
  };
  const active = records.filter(
    (record) => record.centre[study.principalCostBps]!.lots >= study.riskPenalty.eligibleControlMinimumLots
  );
  const shareActive = pooledShare(active);
  const shareAbove = shareActive.midRank;
  const shareTied = shareActive.tied;
  const boundary = boundaryFrequency(window, configs);
  const parityRng = Rng.from(study.seedLabel, window, 'pilot-parity');
  const parity: { stratum: number; key: string; draw: number; differences: number }[] = [];

  for (const stratum of study.strata) {
    const own = configs.filter((config) => config.stratum === stratum);

    for (let check = 0; check < study.pilot.parityNeighboursPerStratum; check++) {
      const config = own[parityRng.int(own.length)]!;
      const draw = parityRng.int(study.pilot.draws.A1);
      const neighbour = canonicalBooks(neighbourOf(config.books, window, 'pilot', 'N1', draw));
      const outcome = replayAgainstFull(
        evaluator.loaded,
        neighbour.map((book) => book.symbol),
        evaluator.phenotypes(neighbour),
        study.principalCostBps
      );

      parity.push({ stratum, key: keyOf(neighbour), draw, differences: outcome.differences.length });
    }
  }

  const checks = {
    shareAbove: {
      value: shareAbove,
      strictlyAbove: shareActive.strict,
      tied: shareTied,
      pass: Math.abs(shareAbove - 0.5) <= study.pilot.shareAboveTolerance,
      controls: active.length,
      pool: 'active controls (≥ 4 centre funded lots), amendment 1',
      otherPools: {
        allControls: pooledShare(records),
        eligibleDrawdownFeasible: pooledShare(eligible),
        activeDrawdownInfeasible: pooledShare(active.filter((record) => !record.eligible))
      }
    },
    zeroAmplitude: {
      pass:
        records.every((record) => record.zeroAmplitudeEqual) &&
        benchmarkRecords.every((record) => record.zeroAmplitudeEqual)
    },
    parity: { pass: parity.every((row) => row.differences === 0), comparisons: parity.length, rows: parity },
    reflection: {
      ...boundary,
      pass:
        boundary.outOfBox === 0 &&
        Math.abs(boundary.cornerFrequency - 2 / 3) <= study.pilot.boundaryMoveTolerance &&
        (!(boundary.pilotBoundarySamples >= 100) ||
          Math.abs(boundary.pilotBoundaryFrequency - 2 / 3) <= study.pilot.boundaryMoveTolerance)
    }
  };
  const passed = Object.values(checks).every((check) => check.pass);

  // The predeclared mapping (§7.5).
  const references = calibrateReferences(
    eligible.map((record) => ({ stratum: record.stratum, ddMedian: record.a1.ddMedian, dd90: record.a1.dd90 }))
  );
  const seByN: Record<number, number> = {};
  const small = eligible.filter((record) => record.books <= 6);

  for (const n of tier.nDiscoveryCandidates) {
    const values = small.map((record) =>
      subsampledSe(
        record.a1Nets,
        n,
        Rng.from(study.seedLabel, window, 'pilot-se', record.key, n),
        study.pilot.subsamples
      )
    );

    seByN[n] = values.length > 0 ? median(values) : Infinity;
  }

  const nD =
    small.length > 0
      ? chooseDiscoveryDraws(seByN, tier.nDiscoveryCandidates, tier.seTarget)
      : tier.nDiscoveryCandidates.at(-1)!;

  // Severity of Fable's uncalibrated hard F2 (diagnosis only).
  const failsF2 = (record: PilotRecord) => !(record.a1.ddMedian <= 35000 && record.a1.dd90 <= 45000);
  const severity = {
    eligibleControls: eligible.length,
    eligibleFailingF2: eligible.filter(failsF2).length,
    byStratum: Object.fromEntries(
      study.strata.map((stratum) => {
        const own = eligible.filter((record) => record.stratum === stratum);

        return [stratum, { eligible: own.length, failingF2: own.filter(failsF2).length }];
      })
    ),
    benchmarks: Object.fromEntries(
      benchmarkRecords.map((record) => [
        record.label,
        { failsF2: failsF2(record), ddMedian: record.a1.ddMedian, dd90: record.a1.dd90 }
      ])
    )
  };

  const persistence =
    window === 'final'
      ? (() => {
          const rows = eligible.filter((record) => record.persistence);
          const raw = spearman(
            rows.map((record) => record.persistence!.netToSplit),
            rows.map((record) => record.persistence!.netAfterSplit)
          );
          const smoothed = spearman(
            rows.map((record) => record.persistence!.p50ToSplit),
            rows.map((record) => record.persistence!.netAfterSplit)
          );

          return {
            controls: rows.length,
            raw,
            smoothed,
            supportsSmoothed: smoothed - raw >= study.pilot.persistenceMargin
          };
        })()
      : undefined;

  await fs.outputFile(
    `${dir}/controls.jsonl`,
    `${[...records, ...benchmarkRecords].map((record) => JSON.stringify(record)).join('\n')}\n`
  );

  const summary = {
    generatedAt: nowIso(),
    window,
    tier: tier.key,
    seconds: (Date.now() - started) / 1000,
    configurations: configs.length,
    checks,
    passed,
    severity,
    persistence,
    strata: Object.fromEntries(
      study.strata.map((stratum) => {
        const own = records.filter((record) => record.stratum === stratum);
        const feasibleOwn = own.filter((record) => record.eligible);
        const stat = (values: number[]) => ({
          p25: quantile(values, 0.25),
          median: median(values),
          p75: quantile(values, 0.75)
        });

        return [
          stratum,
          {
            configurations: own.length,
            centrallyFeasible: own.filter(
              (record) => record.centre[study.principalCostBps]!.minuteDrawdown <= study.drawdownCeiling
            ).length,
            eligible: feasibleOwn.length,
            base: stat(own.map((record) => record.centre[study.principalCostBps]!.net)),
            p50: stat(own.map((record) => record.a1.p50)),
            mad: stat(own.map((record) => record.a1.mad)),
            shareAbove: stat(own.map((record) => record.a1.shareAbove)),
            ddMedianEligible: stat(feasibleOwn.map((record) => record.a1.ddMedian)),
            dd90Eligible: stat(feasibleOwn.map((record) => record.a1.dd90)),
            feasShareEligible: stat(feasibleOwn.map((record) => record.a1.feasShare)),
            lots: stat(own.map((record) => record.centre[study.principalCostBps]!.lots)),
            a2p50: stat(own.map((record) => record.a2.p50)),
            n2p50: stat(own.map((record) => record.n2.p50)),
            madBelow1000: own.filter((record) => record.eligible && record.a1.mad < 1000).length
          }
        ];
      })
    ),
    benchmarks: benchmarkRecords.map((record) => ({
      label: record.label,
      key: record.key,
      centre: record.centre[study.principalCostBps],
      a1: record.a1,
      a2: record.a2,
      n2: record.n2,
      n3: record.n3,
      n0: record.n0
    })),
    cache: evaluator.cacheStats()
  };

  await writeJson(`${dir}/pilot.json`, summary);

  if (!passed) {
    throw new Error(
      `The ${window} pilot machinery checks failed: ${JSON.stringify(Object.fromEntries(Object.entries(checks).map(([key, check]) => [key, check.pass])))}`
    );
  }

  const freeze = await writeSealed(pilotFreezeFile(window, dir), {
    window,
    tier: tier.key,
    frozenAt: nowIso(),
    rule: 'PROTOCOL.md §6.3 and §7.5, applied mechanically',
    references,
    discoveryDraws: nD,
    seByN,
    seTarget: tier.seTarget,
    eligibleControls: eligible.length,
    eligibleSmallControls: small.length,
    machineryChecks: Object.fromEntries(Object.entries(checks).map(([key, check]) => [key, check.pass])),
    pilotSummarySha256: sha256(await fs.readFile(`${dir}/pilot.json`)),
    controlsSha256: sha256(await fs.readFile(`${dir}/controls.jsonl`)),
    provenance: await provenance()
  });

  log(
    `pilot ${window}: frozen (n_D = ${nD}; references ${study.strata.map((s) => `${s}:${Math.round(references[s]!.median / 1000)}k/${Math.round(references[s]!.tail / 1000)}k`).join(' ')})`
  );

  return { summary, freeze };
};
