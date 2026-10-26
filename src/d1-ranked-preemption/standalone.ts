// Stage A (PROTOCOL.md §6–§7): standalone D1 discovery for every eligible symbol in one window — the paired Sobol
// design, the local search, the neighbourhood check, the representative, the library — and the screening (survivor,
// uncertain, screened-down, reserve, rejected). Writes every symbol's profile and every library phenotype as its own
// JSON and seals the stage record. Reads only trainingUniverse(window).
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import type { IntParams } from '../d1-refinement/families.ts';
import { describe } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import {
  type Tier,
  type WindowKey,
  log,
  minimumTrades,
  nowIso,
  readJson,
  sampleLabel,
  stageDir,
  standaloneRoot,
  study,
  tierFile,
  universeFile,
  writeJson
} from './context.ts';
import { doorRecordOf, trainingUniverse } from './data.ts';
import {
  type Book,
  type StandaloneMetrics,
  type Vector,
  entrySessionsOf,
  gridKey,
  heldSessionsOf
} from './evaluate.ts';
import { Evaluator } from './evaluator.ts';
import { gitState, readSealed, sha256File, writeSealed } from './freeze.ts';
import { requireFrozen } from './guard.ts';
import { defaultWorkerCount } from './pool.ts';
import { mutateAll, mutateOne, neighbour, sobolVectors } from './space.ts';

export const stageAFile = (window: WindowKey) => stageDir('standalone', window, 'STAGE_A.json');
export const archiveFile = (window: WindowKey) => stageDir('standalone', window, 'archive.jsonl.gz');
export const profileFile = (window: WindowKey, symbol: string) => path.join(standaloneRoot, window, `${symbol}.json`);
export const phenotypeFileOf = (window: WindowKey, symbol: string, role: string, candidateId: string) =>
  path.join(standaloneRoot, window, 'phenotypes', `${symbol}-${role}-${candidateId}.json`);

export type ScreeningStatus = 'survivor' | 'screened-down' | 'reserve' | 'rejected';

export interface Evaluated {
  vector: Vector;
  metrics: StandaloneMetrics;
}

export interface Neighbourhood {
  draws: number;
  median: number;
  credibleShare: number;
  scores: number[];
}

export interface SymbolResult {
  symbol: string;
  evaluated: number;
  credibleCount: number;
  representative?: Evaluated & { neighbourhood?: Neighbourhood; credible: boolean };
  library: (Evaluated & { role: string })[];
  checked: (Evaluated & { neighbourhood: Neighbourhood })[];
  status: ScreeningStatus;
  uncertain: boolean;
  sample: string;
  idleShare: number;
  reasons: string[];
}

const byScore = (a: Evaluated, b: Evaluated) =>
  b.metrics.score - a.metrics.score || (a.metrics.gridKey < b.metrics.gridKey ? -1 : 1);

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);

  if (sorted.length === 0) {
    return NaN;
  }

  return sorted.length % 2 === 1
    ? sorted[(sorted.length - 1) / 2]!
    : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
};

const jaccardDistance = (a: readonly number[], b: readonly number[]) => {
  const left = new Set(a);
  const right = new Set(b);
  let both = 0;

  for (const value of left) {
    if (right.has(value)) {
      both++;
    }
  }

  const union = left.size + right.size - both;

  return union === 0 ? 0 : 1 - both / union;
};

export const parametersOf = (grid: Vector['grid']) =>
  Object.fromEntries(
    Object.entries(grid).map(([key, value]) => [
      key,
      key === 'maximumHoldDays' || key === 'tickWindowSize' || key === 'continuationWindow'
        ? value
        : `${(value / 10).toFixed(1)}%`
    ])
  );

// The per-vector figures written to the JSON files (entry sessions and held sessions omitted).
export const summaryOf = (metrics: StandaloneMetrics) => {
  const { intervals, grid, ...rest } = metrics;

  void intervals;
  void grid;
  return rest;
};

export const runStageA = async (window: WindowKey, options: { workers?: number } = {}) => {
  const guard = await requireFrozen();
  const file = stageAFile(window);

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: Stage A of ${window} is sealed and never rerun`);
  }

  const startedAt = nowIso();
  const tier = (await readJson<{ tier: Tier }>(tierFile)).tier;
  const loaded = await trainingUniverse(window);
  const door = doorRecordOf('trainingUniverse', loaded, window);
  const symbols = Object.keys(loaded.universe.instruments).sort();
  const anyDs = loaded.universe.instruments[symbols[0]!]!.ds;
  const armStart = loaded.universe.eligibilityIndex;
  const last = loaded.universe.sessionCount - 1;
  const eligibleYears = (anyDs.sTime[last]! - anyDs.sTime[armStart]!) / (365.25 * 86400);
  const minTrades = minimumTrades(eligibleYears);
  const evaluator = await Evaluator.create(loaded, options.workers ?? defaultWorkerCount());
  const evaluated = new Map<string, Map<string, Evaluated>>(symbols.map((symbol) => [symbol, new Map()]));
  const archive: string[] = [];

  log(
    `Stage A ${window}: ${symbols.length} symbols, last ${loaded.universe.end}, min trades ${minTrades}, tier ${tier.key}`
  );

  const evaluate = async (items: { symbol: string; vector: Vector; stage: string }[]) => {
    const fresh = items.filter((item) => !evaluated.get(item.symbol)!.has(gridKey(item.vector.grid)));
    const unique = [...new Map(fresh.map((item) => [`${item.symbol}|${gridKey(item.vector.grid)}`, item])).values()];
    const metrics = await evaluator.standalone(
      unique.map((item) => ({
        book: { symbol: item.symbol, vector: item.vector },
        costBps: study.principalCostBps,
        minTrades
      }))
    );

    unique.forEach((item, index) => {
      const m = metrics[index]!;

      evaluated.get(item.symbol)!.set(m.gridKey, { vector: item.vector, metrics: m });
      archive.push(
        JSON.stringify({
          stage: item.stage,
          symbol: item.symbol,
          grid: m.gridKey,
          origin: item.vector.origin,
          trades: m.trades,
          net: Math.round(m.net * 100) / 100,
          best: Math.round(m.bestTrade * 100) / 100,
          dd: Math.round(m.minuteDrawdown * 100) / 100,
          score: Math.round(m.score * 100) / 100,
          credible: m.credible,
          r1: Math.round(m.meanNet * 100) / 100,
          r2: Math.round(m.netPerDay * 100) / 100
        })
      );
    });

    return items.map((item) => evaluated.get(item.symbol)!.get(gridKey(item.vector.grid))!);
  };

  // 1. the paired Sobol designs
  for (const symbol of symbols) {
    await evaluate(sobolVectors(symbol, tier.sobol).map((vector) => ({ symbol, vector, stage: 'sobol' })));
  }

  log(`Stage A ${window}: Sobol done (${evaluator.standaloneEvals} evaluations)`);

  // 2. local search, every symbol's starts in parallel, round by round
  const s = study.standalone;
  const starts = new Map<string, Evaluated[]>();

  for (const symbol of symbols) {
    const all = [...evaluated.get(symbol)!.values()].sort(byScore);
    const credible = all.filter((entry) => entry.metrics.credible);
    const picked = [...credible, ...all.filter((entry) => !entry.metrics.credible)].slice(0, s.localStarts);

    starts.set(symbol, picked);
  }

  const current = new Map([...starts].flatMap(([symbol, list]) => list.map((entry, k) => [`${symbol}#${k}`, entry])));
  const stall = new Map([...current.keys()].map((key) => [key, 0]));

  for (let round = 0; round < tier.localRounds; round++) {
    const active = [...current.keys()].filter((key) => stall.get(key)! < s.localStallRounds);

    if (active.length === 0) {
      break;
    }

    const moves = active.flatMap((key) => {
      const [symbol, k] = key.split('#') as [string, string];
      const rng = Rng.from(study.seedLabel, 'local', window, symbol, k, round);
      const centre = current.get(key)!.vector;

      return Array.from({ length: s.localMovesPerRound }, (_, m) => ({
        key,
        symbol,
        vector:
          m < s.localSingleMoves
            ? mutateOne(centre, rng, `local:${window}:${k}:${round}:${m}`)
            : mutateAll(centre, rng, `local:${window}:${k}:${round}:${m}`),
        stage: 'local'
      }));
    });
    const results = await evaluate(moves);
    const best = new Map<string, Evaluated>();

    moves.forEach((move, index) => {
      const entry = results[index]!;
      const seen = best.get(move.key);

      if (!seen || byScore(entry, seen) < 0) {
        best.set(move.key, entry);
      }
    });

    for (const key of active) {
      const candidate = best.get(key);

      if (candidate && candidate.metrics.score > current.get(key)!.metrics.score) {
        current.set(key, candidate);
        stall.set(key, 0);
      } else {
        stall.set(key, stall.get(key)! + 1);
      }
    }
  }

  log(`Stage A ${window}: local search done (${evaluator.standaloneEvals} evaluations)`);

  // 3. neighbourhood check of the top credible vectors (distinct trade signatures)
  const checkedOf = new Map<string, Evaluated[]>();

  for (const symbol of symbols) {
    const seen = new Set<string>();
    const list = [...evaluated.get(symbol)!.values()]
      .filter((entry) => entry.metrics.credible)
      .sort(byScore)
      .filter((entry) => {
        if (seen.has(entry.metrics.signature)) {
          return false;
        }

        seen.add(entry.metrics.signature);
        return true;
      })
      .slice(0, s.neighbourhoodTop);

    checkedOf.set(symbol, list);
  }

  const draws = [...checkedOf].flatMap(([symbol, list]) =>
    list.flatMap((entry, c) =>
      Array.from({ length: tier.standaloneDraws }, (_, d) => {
        const moved = neighbour([{ symbol, vector: entry.vector }], `standalone:${window}`, 'N1', d)[0]!;

        return { symbol, centre: c, vector: moved.vector, stage: 'neighbourhood' };
      })
    )
  );
  // neighbour draws are evaluated but not archived as search candidates (they are measurements of a centre)
  const drawMetrics = await evaluator.standalone(
    draws.map((draw) => ({
      book: { symbol: draw.symbol, vector: draw.vector },
      costBps: study.principalCostBps,
      minTrades
    }))
  );

  log(`Stage A ${window}: neighbourhoods done (${evaluator.standaloneEvals} evaluations)`);

  const results: SymbolResult[] = symbols.map((symbol) => {
    const all = [...evaluated.get(symbol)!.values()];
    const credible = all.filter((entry) => entry.metrics.credible).sort(byScore);
    const checked = checkedOf.get(symbol)!.map((entry, c) => {
      const scores = drawMetrics
        .filter((_, index) => draws[index]!.symbol === symbol && draws[index]!.centre === c)
        .map((metrics) => metrics.score);
      const credibleShare =
        drawMetrics.filter((m, index) => draws[index]!.symbol === symbol && draws[index]!.centre === c && m.credible)
          .length / Math.max(1, scores.length);

      return { ...entry, neighbourhood: { draws: scores.length, median: median(scores), credibleShare, scores } };
    });
    let representative: SymbolResult['representative'];

    if (checked.length > 0) {
      const best = [...checked].sort(
        (a, b) =>
          b.neighbourhood.median - a.neighbourhood.median ||
          b.metrics.score - a.metrics.score ||
          (a.metrics.gridKey < b.metrics.gridKey ? -1 : 1)
      )[0]!;

      representative = { ...best, credible: true };
    } else {
      const traded = all.filter((entry) => entry.metrics.trades >= 1).sort(byScore);

      representative = traded[0] ? { ...traded[0], credible: false } : undefined;
    }

    const library: (Evaluated & { role: string })[] = representative?.credible
      ? [{ vector: representative.vector, metrics: representative.metrics, role: 'representative' }]
      : [];

    if (representative?.credible) {
      for (const entry of credible.slice(0, s.libraryPool)) {
        if (library.length >= s.libraryMax) {
          break;
        }

        if (entry.metrics.gridKey === representative.metrics.gridKey) {
          continue;
        }

        if (
          library.every(
            (chosen) =>
              jaccardDistance(entrySessionsOf(chosen.metrics), entrySessionsOf(entry.metrics)) >= s.libraryJaccard
          )
        ) {
          library.push({ ...entry, role: `alternative-${library.length}` });
        }
      }
    }

    const survivor = Boolean(
      representative?.credible && representative.neighbourhood!.median > 0 && representative.metrics.score > 0
    );
    const reasons: string[] = [];

    if (credible.length === 0) {
      reasons.push(`no credible vector among ${all.length} (trades ≥ ${minTrades}, minute DD ≤ $35,000, net > 0)`);
    } else if (!survivor) {
      reasons.push(
        `representative J_nb ${representative!.neighbourhood!.median.toFixed(0)}, J_s ${representative!.metrics.score.toFixed(0)} (survivor needs both > 0)`
      );
    }

    return {
      symbol,
      evaluated: all.length,
      credibleCount: credible.length,
      representative,
      library,
      checked,
      status: survivor ? 'survivor' : credible.length > 0 ? 'screened-down' : 'rejected',
      uncertain: survivor && (representative?.metrics.trades ?? 0) < s.adequateTrades,
      sample: sampleLabel(representative?.metrics.trades ?? 0),
      idleShare: NaN,
      reasons
    };
  });

  // 4. the exploration reserve: screened-down symbols holding when no survivor representative does
  const survivorHeld = new Set<number>();
  for (const result of results.filter((entry) => entry.status === 'survivor')) {
    for (const session of heldSessionsOf(result.representative!.metrics)) {
      survivorHeld.add(session);
    }
  }

  for (const result of results.filter((entry) => entry.status === 'screened-down')) {
    const sessions = heldSessionsOf(result.representative!.metrics);

    result.idleShare =
      sessions.length > 0 ? sessions.filter((session) => !survivorHeld.has(session)).length / sessions.length : 0;
  }

  const reserve = results
    .filter((entry) => entry.status === 'screened-down' && entry.idleShare >= study.screening.reserveMinIdleShare)
    .sort(
      (a, b) =>
        b.idleShare - a.idleShare ||
        b.representative!.neighbourhood!.median - a.representative!.neighbourhood!.median ||
        (a.symbol < b.symbol ? -1 : 1)
    )
    .slice(0, study.screening.reserveMax);

  for (const entry of reserve) {
    entry.status = 'reserve';
  }

  await evaluator.close();

  // 5. files: every library phenotype, every profile, the archive, the sealed record
  const files: Record<string, string> = {};
  const universeSha256 = await sha256File(universeFile);
  const dataSha256 = Object.fromEntries(Object.entries(loaded.windows).map(([symbol, w]) => [symbol, w.dataSha256!]));

  for (const result of results) {
    const phenotypes = [];

    // The library's phenotypes; a symbol without a credible vector gets its non-credible ranking representative only.
    const written =
      result.library.length > 0
        ? result.library
        : result.representative
          ? [{ ...result.representative, role: 'ranking-representative' }]
          : [];

    for (const entry of written) {
      const candidateId = entry.vector.id;
      const phenotypeFile = phenotypeFileOf(window, result.symbol, entry.role, candidateId);
      const body = {
        schema: 'ranked-preemption-standalone-phenotype',
        schemaVersion: 1,
        id: `${study.version}:${window}:${result.symbol}:${entry.role}:${candidateId}`,
        study: study.version,
        window,
        symbol: result.symbol,
        role: entry.role,
        candidateId,
        architecture: 'D1',
        grid: entry.vector.grid,
        parameters: parametersOf(entry.vector.grid),
        description: describe(entry.vector.grid as unknown as IntParams),
        training: {
          partition: 'training',
          first: study.firstSession,
          arming: study.eligibilityDate,
          searchEnd: study.windows[window].searchEnd,
          lastLoaded: loaded.universe.end,
          dataSha256: dataSha256[result.symbol],
          loadedBarsSha256: door.barsSha256[result.symbol],
          universeRecord: { file: universeFile, sha256: universeSha256 }
        },
        grid_version: 'src/multi-etf-d1/space.ts box (tenths of a percentage point, calendar days, sessions)',
        budget: { tier: tier.key, sobol: tier.sobol, localRounds: tier.localRounds, draws: tier.standaloneDraws },
        seeds: { sobol: `${study.seedLabel}|standalone|${result.symbol}`, origin: entry.vector.origin },
        costs: { bpsPerSide: study.principalCostBps, interest: study.rate, notional: study.principal },
        metrics: summaryOf(entry.metrics),
        neighbourhood: entry.role === 'representative' ? (result.representative?.neighbourhood ?? null) : null,
        provenance: { stage: `Stage A ${window}`, record: stageAFile(window), status: result.status }
      };

      await writeJson(phenotypeFile, body);
      files[phenotypeFile] = await sha256File(phenotypeFile);
      phenotypes.push({ role: entry.role, file: phenotypeFile, sha256: files[phenotypeFile], candidateId });
    }

    const profile = {
      schema: 'ranked-preemption-standalone-profile',
      schemaVersion: 1,
      study: study.version,
      window,
      symbol: result.symbol,
      status: result.status,
      uncertain: result.uncertain,
      sample: result.sample,
      reasons: result.reasons,
      minTrades,
      eligibleYears,
      evaluated: result.evaluated,
      credibleVectors: result.credibleCount,
      idleShare: result.idleShare,
      representative: result.representative
        ? {
            credible: result.representative.credible,
            candidateId: result.representative.vector.id,
            grid: result.representative.vector.grid,
            parameters: parametersOf(result.representative.vector.grid),
            metrics: summaryOf(result.representative.metrics),
            neighbourhood: result.representative.neighbourhood ?? null,
            phenotypeFile:
              phenotypes.find((entry) => entry.role === 'representative' || entry.role === 'ranking-representative')
                ?.file ?? null,
            phenotypeSha256:
              phenotypes.find((entry) => entry.role === 'representative' || entry.role === 'ranking-representative')
                ?.sha256 ?? null
          }
        : null,
      library: phenotypes,
      neighbourhoodChecked: result.checked.map((entry) => ({
        candidateId: entry.vector.id,
        grid: gridKey(entry.vector.grid),
        score: entry.metrics.score,
        net: entry.metrics.net,
        trades: entry.metrics.trades,
        median: entry.neighbourhood.median,
        credibleShare: entry.neighbourhood.credibleShare
      })),
      data: { dataSha256: dataSha256[result.symbol], loadedBarsSha256: door.barsSha256[result.symbol] }
    };
    const target = profileFile(window, result.symbol);

    await writeJson(target, profile);
    files[target] = await sha256File(target);
  }

  const archivePath = archiveFile(window);

  await fs.outputFile(archivePath, gzipSync(`${archive.join('\n')}\n`));

  const record = await writeSealed(file, {
    stage: 'A',
    window,
    startedAt,
    finishedAt: nowIso(),
    guard,
    git: gitState(),
    door,
    tier: tier.key,
    eligibleYears,
    minTrades,
    evaluations: evaluator.standaloneEvals,
    counts: {
      explored: results.length,
      survivors: results.filter((entry) => entry.status === 'survivor').length,
      uncertainSurvivors: results.filter((entry) => entry.status === 'survivor' && entry.uncertain).length,
      reserve: results.filter((entry) => entry.status === 'reserve').length,
      screenedDown: results.filter((entry) => entry.status === 'screened-down').length,
      rejected: results.filter((entry) => entry.status === 'rejected').length,
      unrankable: results.filter((entry) => !entry.representative).length
    },
    symbols: Object.fromEntries(
      results.map((entry) => [
        entry.symbol,
        {
          status: entry.status,
          uncertain: entry.uncertain,
          sample: entry.sample,
          idleShare: entry.idleShare,
          representative: entry.representative
            ? {
                credible: entry.representative.credible,
                grid: entry.representative.vector.grid,
                candidateId: entry.representative.vector.id,
                metrics: summaryOf(entry.representative.metrics),
                neighbourhoodMedian: entry.representative.neighbourhood?.median ?? null,
                phenotypeFile: phenotypeFileOf(
                  window,
                  entry.symbol,
                  entry.representative.credible ? 'representative' : 'ranking-representative',
                  entry.representative.vector.id
                )
              }
            : null,
          library: entry.library.map((item) => ({
            role: item.role,
            candidateId: item.vector.id,
            grid: item.vector.grid
          })),
          reasons: entry.reasons
        }
      ])
    ),
    files,
    archive: { file: archivePath, sha256: await sha256File(archivePath), rows: archive.length }
  });

  log(`Stage A ${window}: sealed ${file} (${record.bodyHash.slice(0, 12)})`);

  return record;
};

export const readStageA = async (window: WindowKey) => readSealed(stageAFile(window));

export type { Book };
