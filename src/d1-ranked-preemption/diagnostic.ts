// The preflight overlap diagnostic (PROTOCOL.md §9), per window after its rankings: B4 and B5 (exact frozen
// vectors) and C_R1 / C_R2 under the original nonpreemptive allocator P0 on the window's training data; every decision
// refused while one funded lot alone held the pool, with the rank tests of the frozen rankings and the preemption P1
// would have attempted at that moment. The frozen material-opportunity criterion decides Stage D's budget.
import fs from 'fs-extra';
import { traceBook, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { type Priority, p0Allocation, resolvePriority } from './allocation.ts';
import { type RankingKey, type WindowKey, log, nowIso, rankingKeys, stageDir, study } from './context.ts';
import { doorRecordOf, trainingUniverse } from './data.ts';
import type { Book } from './evaluate.ts';
import { readSealed, writeSealed } from './freeze.ts';
import { requireFrozen } from './guard.ts';
import { incumbentBooks } from './incumbents.ts';
import { assemblyC, readWindowInputs } from './inputs.ts';
import { traceWindowOf } from './evaluator.ts';
import { type OverlapRecord, replayPreemptive } from './replay.ts';

export const diagnosticFile = (window: WindowKey) => stageDir('diagnostic', window, 'DIAGNOSTIC.json');

export interface Materiality {
  window: WindowKey;
  ranking: RankingKey;
  counts: Record<string, number>; // pool → actionable opportunities under the ranking
  threshold: number;
  material: boolean;
  budgetShare: number;
}

const regimeOf = (date: string) =>
  study.regimes.find((regime) => date >= regime.start && date <= regime.end)?.key ?? '';

export const runDiagnostic = async (window: WindowKey) => {
  const guard = await requireFrozen();
  const file = diagnosticFile(window);

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the ${window} diagnostic is sealed`);
  }

  const inputs = await readWindowInputs(window);
  const incumbents = await incumbentBooks();
  const pools: Record<string, { books: Book[]; diagnose: RankingKey[] }> = {
    B4: { books: incumbents.B4, diagnose: ['R1', 'R2'] },
    B5: { books: incumbents.B5, diagnose: ['R1', 'R2'] }
  };

  for (const key of rankingKeys) {
    const books = assemblyC(inputs, key);

    if (books.length > 0) {
      pools[`C_${key}`] = { books, diagnose: [key] };
    }
  }

  const members = [...new Set(Object.values(pools).flatMap((pool) => pool.books.map((book) => book.symbol)))].sort();
  const loaded = await trainingUniverse(window, { symbols: members });
  const traceWindow = traceWindowOf(loaded);
  const results: Record<
    string,
    {
      members: string[];
      grids: Record<string, string>;
      decisions: number;
      refused: number;
      lots: number;
      heldSessions: number;
      overlaps: OverlapRecord[];
      actionable: Record<string, number>;
      higher: Record<string, number>;
      estimateNonNegative: Record<string, number>;
    }
  > = {};

  for (const [name, pool] of Object.entries(pools)) {
    const priorities: Priority[] = pool.diagnose.map((key) =>
      resolvePriority(
        `${window}/${key}`,
        inputs.rankings[key].order,
        pool.books.map((book) => book.symbol)
      )
    );
    const replayBooks = pool.books.map((book) => ({
      symbol: book.symbol,
      ds: loaded.universe.instruments[book.symbol]!.ds,
      trace: traceBook(
        loaded.universe.instruments[book.symbol]!.ds,
        candidateBook(book.symbol, book.vector.id, book.vector.grid),
        traceSettings(study.principalCostBps),
        traceWindow
      )
    }));
    const result = replayPreemptive(replayBooks, {
      symbols: pool.books.map((book) => book.symbol),
      startIndex: traceWindow.startIndex,
      endIndex: traceWindow.endIndex,
      principal: study.principal,
      rate: study.rate,
      costBps: study.principalCostBps,
      stopSlippageBps: 0,
      detail: false,
      allocation: p0Allocation,
      diagnose: priorities
    });
    const count = (predicate: (record: OverlapRecord) => boolean) => result.overlaps.filter(predicate).length;

    results[name] = {
      members: pool.books.map((book) => book.symbol),
      grids: Object.fromEntries(pool.books.map((book) => [book.symbol, book.vector.id])),
      decisions: result.decisions,
      refused: result.refused,
      lots: result.lots.length,
      heldSessions: result.heldSessions,
      overlaps: result.overlaps,
      actionable: Object.fromEntries(
        priorities.map((p) => [p.rankingId, count((record) => record.actionable[p.rankingId]!)])
      ),
      higher: Object.fromEntries(priorities.map((p) => [p.rankingId, count((record) => record.higher[p.rankingId]!)])),
      estimateNonNegative: Object.fromEntries(
        priorities.map((p) => [p.rankingId, count((record) => record.higher[p.rankingId]! && record.estimateNet >= 0)])
      )
    };
  }

  const threshold = window === 'final' ? study.diagnostic.materialFinal : study.diagnostic.materialFold;
  const countsOf = (key: RankingKey) => {
    const id = `${window}/${key}`;

    return Object.fromEntries(
      Object.entries(results)
        .filter(([, result]) => id in result.actionable)
        .map(([name, result]) => [name, result.actionable[id]!])
    );
  };
  // one decision per window (the brief's equal budgets for R1 and R2): material if any count of either ranking
  // in B4, B5 or C_Rk reaches the threshold; both branches then get the same budget share
  const windowMaterial = rankingKeys.some((key) => Object.values(countsOf(key)).some((value) => value >= threshold));
  const materiality: Materiality[] = rankingKeys.map((key) => ({
    window,
    ranking: key,
    counts: countsOf(key),
    threshold,
    material: windowMaterial,
    budgetShare: windowMaterial ? 1 : study.diagnostic.downscale
  }));
  const perSymbol = (records: readonly OverlapRecord[]) => {
    const table: Record<string, Record<string, number>> = {};

    for (const record of records) {
      table[record.decider] ??= {};
      table[record.decider]![record.holder] = (table[record.decider]![record.holder] ?? 0) + 1;
    }

    return table;
  };
  const sealed = await writeSealed(file, {
    stage: 'diagnostic',
    window,
    generatedAt: nowIso(),
    guard,
    door: doorRecordOf('trainingUniverse', loaded, window),
    rankings: Object.fromEntries(rankingKeys.map((key) => [key, inputs.rankings[key].bodyHash])),
    stageA: inputs.stageA.bodyHash,
    criterion: `the window is material iff actionable opportunities ≥ ${threshold} in at least one of B4, B5 or C_Rk under either ranking; both rankings then run Stage D at the same budget share`,
    materiality,
    pools: Object.fromEntries(
      Object.entries(results).map(([name, result]) => [
        name,
        {
          ...result,
          collisions: perSymbol(result.overlaps),
          regimes: Object.fromEntries(
            study.regimes.map((regime) => [
              regime.key,
              result.overlaps.filter((record) => regimeOf(loaded.universe.dates[record.decisionIndex]!) === regime.key)
                .length
            ])
          ),
          ties: result.overlaps.filter((record) => record.sameMinute > 1).length
        }
      ])
    ),
    cDefinitions: Object.fromEntries(
      rankingKeys.map((key) => [
        key,
        assemblyC(inputs, key).map((book) => ({ symbol: book.symbol, grid: book.vector.grid }))
      ])
    )
  });

  for (const entry of materiality) {
    log(
      `diagnostic ${window}/${entry.ranking}: ${Object.entries(entry.counts)
        .map(([name, n]) => `${name} ${n}`)
        .join(', ')} → ${entry.material ? 'material' : `immaterial (Stage D at ${entry.budgetShare * 100}%)`}`
    );
  }

  log(`diagnostic ${window}: sealed ${file} (${sealed.bodyHash.slice(0, 12)})`);

  return sealed;
};

export const readMateriality = async (window: WindowKey) =>
  (await readSealed<{ bodyHash: string; materiality: Materiality[]; [key: string]: unknown }>(diagnosticFile(window)))
    .materiality;
