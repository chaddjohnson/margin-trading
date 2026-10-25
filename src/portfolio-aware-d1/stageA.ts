// Stage A (PROTOCOL.md §4): the common pool evaluated on every candidate, at four costs, in both tracks' modes; then
// the mechanical choice of up to three ETFs for the deeper search (§4.7). Training partition only.
import path from 'node:path';
import fs from 'fs-extra';
import { type Candidate, candidates, log, readJson, stageDir, study, writeJson, writeText } from './context.ts';
import { trainingUniverse } from './data.ts';
import { type VectorResult, StudyEvaluator } from './evaluate.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { type PoolVector, commonSobolPool, poolFor } from './space.ts';
import { byObjective, feasibleP, feasibleS, median } from './tracks.ts';

export const poolDir = () => stageDir('stageA', 'evaluations');
export const poolFile = (symbol: string) => path.join(poolDir(), `${symbol}.jsonl`);

export interface PoolRecord {
  vector: PoolVector;
  results: Record<number, VectorResult>; // by cost
}

const jsonLine = (value: unknown) =>
  JSON.stringify(value, (_key, item) => (typeof item === 'number' && !Number.isFinite(item) ? String(item) : item));

const revive = (_key: string, value: unknown) =>
  value === 'Infinity' ? Infinity : value === '-Infinity' ? -Infinity : value === 'NaN' ? NaN : value;

export const readPool = async (symbol: string): Promise<PoolRecord[]> =>
  (await fs.readFile(poolFile(symbol), 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line, revive) as PoolRecord);

export const runStageAPool = async () => {
  await requireProtocolFrozen();

  const loaded = await trainingUniverse();
  const evaluator = await StudyEvaluator.create(loaded);
  const sobol = commonSobolPool();
  const pools: Record<string, PoolVector[]> = {};
  const started = Date.now();

  for (const symbol of candidates) {
    pools[symbol] = await poolFor(symbol, sobol.vectors);
  }

  await writeJson(stageDir('stageA', 'pool.json'), {
    seed: sobol.seed,
    drawn: sobol.drawn,
    duplicates: sobol.duplicates,
    sobol: sobol.vectors,
    controls: Object.fromEntries(
      candidates.map((symbol) => [symbol, pools[symbol]!.filter((vector) => vector.origin.startsWith('control:'))])
    ),
    sizes: Object.fromEntries(candidates.map((symbol) => [symbol, pools[symbol]!.length]))
  });

  for (const symbol of candidates) {
    const lines: string[] = [];
    const symbolStarted = Date.now();

    for (const vector of pools[symbol]!) {
      const results: Record<number, VectorResult> = {};

      for (const costBps of study.costsBps) {
        results[costBps] = evaluator.evaluateVector(symbol, vector.grid, costBps);

        if (
          results[costBps]!.pool.decompositionResidual > 1e-6 ||
          results[costBps]!.pool.decompositionResidual < -1e-6
        ) {
          throw new Error(
            `${symbol} ${vector.id}: the Δ decomposition leaves ${results[costBps]!.pool.decompositionResidual}`
          );
        }
      }

      lines.push(jsonLine({ vector, results }));
    }

    await fs.outputFile(poolFile(symbol), `${lines.join('\n')}\n`);
    log(
      `${symbol}: ${pools[symbol]!.length} vectors × ${study.costsBps.length} costs in ${((Date.now() - symbolStarted) / 1000).toFixed(1)} s`
    );
  }

  await writeJson(stageDir('stageA', 'run.json'), {
    finishedAt: new Date().toISOString(),
    seconds: (Date.now() - started) / 1000,
    traces: evaluator.traces,
    replays: evaluator.replays,
    frozenTraceCache: { hits: evaluator.frozenCache.hits, misses: evaluator.frozenCache.misses },
    s0: Object.fromEntries(
      study.costsBps.map((costBps) => {
        const s0 = evaluator.s0Result(costBps);

        return [costBps, { net: s0.net, minuteDrawdown: s0.minuteDrawdown.maximum, lots: s0.lots.length }];
      })
    )
  });
};

// ----- §4.7 the finalists -----

export interface EtfScore {
  symbol: Candidate;
  vectors: number;
  feasibleS: number;
  feasibleP: number;
  positiveFeasibleP: number;
  eligible: boolean;
  potential: number;
  breadth: number;
  cost: number;
  standalone: number;
  ranks: Record<string, number>;
  composite: number;
  topP: { id: string; origin: string; delta5: number; delta10: number; regimesPositive: number }[];
  topS: { id: string; origin: string; net5: number; minuteDrawdown: number }[];
}

const rankScores = (values: number[]) => {
  const n = values.length;

  return values.map((value) => {
    const rank = 1 + values.filter((other) => other > value).length; // ties share the better rank

    return n === 1 ? 1 : (n - rank) / (n - 1);
  });
};

export const selectFinalists = async () => {
  await requireProtocolFrozen();

  const cost = study.principalCostBps;
  const rules = study.finalists;
  const scores: EtfScore[] = [];

  for (const symbol of candidates) {
    const records = await readPool(symbol);
    const at = (record: PoolRecord, bps: number) => record.results[bps]!;
    const feasiblePs = records.filter((record) => feasibleP(at(record, cost).pool));
    const feasibleSs = records.filter((record) => feasibleS(at(record, cost).standalone));
    const positive = feasiblePs.filter((record) => at(record, cost).pool.delta > 0);
    const topP = [...feasiblePs].sort((a, b) => byObjective('P')(at(a, cost), at(b, cost))).slice(0, rules.topN);
    const topS = [...feasibleSs].sort((a, b) => byObjective('S')(at(a, cost), at(b, cost))).slice(0, rules.topN);

    scores.push({
      symbol,
      vectors: records.length,
      feasibleS: feasibleSs.length,
      feasibleP: feasiblePs.length,
      positiveFeasibleP: positive.length,
      eligible: positive.length >= rules.minPositiveFeasible,
      potential: median(topP.map((record) => at(record, cost).pool.delta)),
      breadth: median(topP.map((record) => at(record, cost).pool.regimes.filter((value) => value > 0).length)),
      cost: median(topP.map((record) => at(record, 10).pool.delta)),
      standalone: topS.length > 0 ? median(topS.map((record) => at(record, cost).standalone.net)) : -Infinity,
      ranks: {},
      composite: NaN,
      topP: topP.map((record) => ({
        id: record.vector.id,
        origin: record.vector.origin,
        delta5: at(record, cost).pool.delta,
        delta10: at(record, 10).pool.delta,
        regimesPositive: at(record, cost).pool.regimes.filter((value) => value > 0).length
      })),
      topS: topS.map((record) => ({
        id: record.vector.id,
        origin: record.vector.origin,
        net5: at(record, cost).standalone.net,
        minuteDrawdown: at(record, cost).standalone.minuteDrawdown
      }))
    });
  }

  const eligible = scores.filter((score) => score.eligible);
  const criteria = ['potential', 'breadth', 'cost', 'standalone'] as const;

  for (const criterion of criteria) {
    const values = rankScores(eligible.map((score) => score[criterion]));

    eligible.forEach((score, index) => {
      score.ranks[criterion] = values[index]!;
    });
  }

  for (const score of eligible) {
    score.composite = criteria.reduce(
      (total, criterion) => total + rules.weights[criterion] * score.ranks[criterion]!,
      0
    );
  }

  const priority = (symbol: string) => {
    const order = [...rules.priorityOrder, 'XLE', 'XLU', 'GLD'] as string[];

    return order.indexOf(symbol);
  };
  const ordered = [...eligible].sort((a, b) => b.composite - a.composite || b.potential - a.potential);
  const swaps: string[] = [];

  for (let index = 1; index < ordered.length; index++) {
    const above = ordered[index - 1]!;
    const below = ordered[index]!;

    if (above.composite - below.composite < rules.tieMargin && priority(below.symbol) < priority(above.symbol)) {
      ordered[index - 1] = below;
      ordered[index] = above;
      swaps.push(
        `${below.symbol} above ${above.symbol} (composites ${below.composite.toFixed(3)} / ${above.composite.toFixed(3)})`
      );
    }
  }

  const finalists = ordered.slice(0, rules.maxFinalists).map((score) => score.symbol);
  const record = {
    generatedAt: new Date().toISOString(),
    costBps: cost,
    rules,
    scores,
    order: ordered.map((score) => score.symbol),
    swaps,
    finalists,
    excluded: scores
      .filter((score) => !score.eligible)
      .map((score) => ({
        symbol: score.symbol,
        reason: `${score.positiveFeasibleP} Track-P-feasible pool vectors with Δ@5 > 0 (needs ≥ ${rules.minPositiveFeasible}); ${score.feasibleP} feasible`
      }))
  };

  await writeJson(stageDir('stageA', 'finalists.json'), record);
  log(`finalists: ${finalists.join(', ') || 'none'}; order ${record.order.join(' > ')}`);

  return record;
};

export const readFinalists = () =>
  readJson<Awaited<ReturnType<typeof selectFinalists>>>(stageDir('stageA', 'finalists.json'));

export { writeText };
