// Walk-forward validation (PROTOCOL.md §13): the sealed PICKS.json of a fold (every procedure's configuration and
// the frozen rankings, written before the validation door opens), the continuous validation run (2016-01-04 through
// the validation end; state, marks, virtual books and any open lot carried across the search end; increments after
// the search-end close), the fold gates F1–F3, and the procedure gate GP after fold-b.
import fs from 'fs-extra';
import { allocationOf } from './allocation.ts';
import { type FoldKey, type RankingKey, foldKeys, log, nowIso, rankingKeys, stageDir, study } from './context.ts';
import { readControls, windowConfigurations } from './controls.ts';
import { doorRecordOf, picksFile, validationUniverse } from './data.ts';
import type { Book, PoolMetrics } from './evaluate.ts';
import { Evaluator } from './evaluator.ts';
import { readSealed, writeSealed } from './freeze.ts';
import { requireFrozen } from './guard.ts';
import { incumbentBooks } from './incumbents.ts';
import { allocationFor, readWindowInputs } from './inputs.ts';
import { readJoint } from './joint.ts';
import { defaultWorkerCount } from './pool.ts';
import { engineRun, fixedFigures, portfolioFigures, windowFromEngine } from './runs.ts';

export const validationFile = (fold: FoldKey) => stageDir('walkforward', fold, 'VALIDATION.json');
export const procedureGateFile = stageDir('walkforward', 'PROCEDURE_GATE.json');
export const procedures = ['B-R1', 'B-R2', 'D-R1', 'D-R2'] as const;
export type ProcedureKey = (typeof procedures)[number];

interface PicksConfiguration {
  id: string;
  role: string;
  procedure: string | null;
  ranking: RankingKey | null;
  policy: 'P0' | 'P0R' | 'P1' | 'P1-B250' | 'P1-B500';
  books: { symbol: string; grid: Book['vector']['grid']; candidateId: string }[];
}

export const runPicks = async (fold: FoldKey) => {
  const guard = await requireFrozen();
  const file = picksFile(fold);

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the ${fold} picks are sealed`);
  }

  const inputs = await readWindowInputs(fold);
  const controls = await readControls(fold);
  const incumbents = await incumbentBooks();
  const configurations = await windowConfigurations(fold, inputs, incumbents);
  const joints = Object.fromEntries(
    await Promise.all(rankingKeys.map(async (key) => [key, (await readJoint(fold, key)).bodyHash] as const))
  );

  // the picks must be exactly the configurations the sealed controls evaluated
  if (JSON.stringify(configurations.map((c) => c.id)) !== JSON.stringify(controls.configurations.map((c) => c.id))) {
    throw new Error(`${fold}: the configurations differ from the sealed controls`);
  }

  const sealed = await writeSealed(file, {
    stage: 'picks',
    window: fold,
    writtenAt: nowIso(),
    guard,
    rankings: Object.fromEntries(
      rankingKeys.map((key) => [key, { bodyHash: inputs.rankings[key].bodyHash, order: inputs.rankings[key].order }])
    ),
    stageA: inputs.stageA.bodyHash,
    joints,
    controls: controls.bodyHash,
    configurations: controls.configurations
  });

  log(`picks ${fold}: sealed ${file} (${sealed.bodyHash.slice(0, 12)}) — the validation door may now open`);

  return sealed;
};

export interface FoldGate {
  procedure: ProcedureKey;
  available: boolean;
  validationNet: number;
  incumbentNet: number;
  validationNet10?: number;
  incumbentNet10?: number;
  minuteDrawdown: number;
  lots: number;
  F1: boolean;
  F2: boolean;
  F3: boolean;
  success: boolean;
}

export const runValidation = async (fold: FoldKey, options: { workers?: number } = {}) => {
  const guard = await requireFrozen();
  const file = validationFile(fold);

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the ${fold} validation is sealed and never rerun`);
  }

  const picks = await readSealed<{
    bodyHash: string;
    window: string;
    rankings: Record<RankingKey, { bodyHash: string; order: string[] }>;
    configurations: PicksConfiguration[];
  }>(picksFile(fold));
  const inputs = await readWindowInputs(fold);

  for (const key of rankingKeys) {
    if (inputs.rankings[key].bodyHash !== picks.rankings[key].bodyHash) {
      throw new Error(`${fold}: the ${key} ranking differs from the one sealed in the picks`);
    }
  }

  const startedAt = nowIso();
  const symbols = [
    ...new Set(['VOOG', 'VGT', ...picks.configurations.flatMap((c) => c.books.map((book) => book.symbol))])
  ].sort();
  const loaded = await validationUniverse(fold, symbols);
  const dates = loaded.universe.dates;
  const searchEnd = study.windows[fold].searchEnd;
  let boundary = -1;

  for (let index = 0; index < dates.length; index++) {
    if (dates[index]! <= searchEnd) {
      boundary = index;
    }
  }

  const books = (c: PicksConfiguration): Book[] =>
    c.books.map((book) => ({
      symbol: book.symbol,
      vector: { id: book.candidateId, grid: book.grid, origin: `picks:${c.id}` }
    }));
  const allocation = (c: PicksConfiguration) =>
    c.policy === 'P0' || !c.ranking
      ? allocationOf('P0')
      : allocationFor(
          inputs,
          c.ranking,
          c.books.map((b) => b.symbol),
          c.policy
        );
  const evaluator = await Evaluator.create(loaded, options.workers ?? defaultWorkerCount());
  const requests = picks.configurations.flatMap((c) =>
    (c.role === 'incumbent' || c.role === 'procedure' ? study.costsBps : [study.principalCostBps]).map((costBps) => ({
      c,
      costBps,
      request: { books: books(c), costBps, allocation: allocation(c), minLots: 0, windowStarts: [boundary] }
    }))
  );
  const metrics = await evaluator.pools(requests.map((item) => item.request));

  await evaluator.close();

  const fixed: Record<string, Record<number, PoolMetrics & { validation: PoolMetrics['windowed'][number] }>> = {};

  requests.forEach((item, index) => {
    const m = metrics[index]!;

    fixed[item.c.id] ??= {};
    fixed[item.c.id]![item.costBps] = { ...m, validation: m.windowed[0]! };
  });

  // the continuity check: the validation run at the search-end close equals the sealed training run at its end
  const controls = await readControls(fold);
  const continuity: Record<string, { trainingNet: number; boundaryMark: number }> = {};

  // the authoritative engine for the procedures and incumbents (fixed cross-check) and the 20% portfolio
  const engine: Record<string, unknown> = {};
  const portfolio: Record<string, unknown> = {};

  for (const c of picks.configurations.filter((entry) => entry.role === 'incumbent' || entry.role === 'procedure')) {
    const run = engineRun(loaded, books(c), 'fixed', study.principalCostBps, allocation(c));
    const figures = fixedFigures(run);
    const replay = fixed[c.id]![study.principalCostBps]!;
    const boundaryRow = run.daily.find((row) => row.index === boundary)!;

    if (figures.net !== replay.net || figures.lots !== replay.lots) {
      throw new Error(`${fold} ${c.id}: the replay differs from the engine in validation`);
    }

    continuity[c.id] = {
      trainingNet: controls.fixed[c.id]![String(study.principalCostBps)]!.engineNet,
      boundaryMark: boundaryRow.strategyMark
    };

    if (Math.abs(continuity[c.id]!.trainingNet - continuity[c.id]!.boundaryMark) > 1e-6) {
      throw new Error(
        `${fold} ${c.id}: the continuous run at the search-end close (${boundaryRow.strategyMark}) differs from the sealed training run (${continuity[c.id]!.trainingNet}) — the study stops`
      );
    }

    engine[c.id] = {
      ...figures,
      validationPreemptions: run.preemptions
        .filter((record) => record.decisionIndex > boundary)
        .map((record) => ({
          id: record.id,
          outcome: record.outcome,
          source: record.sourceSymbol,
          target: record.targetSymbol,
          decisionDate: record.decisionDate,
          executionNet: record.executionNet
        }))
    };

    // the gate inputs (validation increment, windowed daily drawdown, lots) recomputed from the engine at both costs
    for (const costBps of [study.principalCostBps, 10]) {
      const engineRunAtCost =
        costBps === study.principalCostBps ? run : engineRun(loaded, books(c), 'fixed', costBps, allocation(c));
      const fromEngine = windowFromEngine(engineRunAtCost, boundary);
      const fromReplay = fixed[c.id]![costBps]!.validation;

      if (
        Math.abs(fromEngine.net - fromReplay.net) > 1e-6 ||
        Math.abs(fromEngine.dailyDrawdown - fromReplay.dailyDrawdown) > 1e-6 ||
        fromEngine.lots !== fromReplay.lots
      ) {
        throw new Error(`${fold} ${c.id} ${costBps} bps: the engine's validation figures differ from the replay's`);
      }
    }

    const pf = engineRun(loaded, books(c), 'portfolio', study.principalCostBps, allocation(c));

    portfolio[c.id] = { whole: portfolioFigures(pf), validation: portfolioFigures(pf, boundary) };
  }

  // F2 compares with the better incumbent (B5 = A, or B4) at each cost (PROTOCOL.md §13.3)
  const best = (costBps: number) => Math.max(fixed.A![costBps]!.validation.net, fixed.B4![costBps]!.validation.net);
  const gates: FoldGate[] = procedures.map((procedure) => {
    const x = fixed[procedure]?.[study.principalCostBps];

    if (!x) {
      return {
        procedure,
        available: false,
        validationNet: NaN,
        incumbentNet: best(study.principalCostBps),
        minuteDrawdown: NaN,
        lots: 0,
        F1: false,
        F2: false,
        F3: false,
        success: false
      };
    }

    const x10 = fixed[procedure]![10]!;
    const F1 = x.validation.minuteDrawdown <= study.gates.fold.ddCeiling;
    const F2 =
      x.validation.net - best(study.principalCostBps) >= study.gates.fold.margin && x10.validation.net >= best(10);
    const F3 = x.validation.lots >= study.gates.fold.minLots;

    return {
      procedure,
      available: true,
      validationNet: x.validation.net,
      incumbentNet: best(study.principalCostBps),
      validationNet10: x10.validation.net,
      incumbentNet10: best(10),
      minuteDrawdown: x.validation.minuteDrawdown,
      lots: x.validation.lots,
      F1,
      F2,
      F3,
      success: F1 && F2 && F3
    };
  });
  const sealed = await writeSealed(file, {
    stage: 'validation',
    window: fold,
    startedAt,
    finishedAt: nowIso(),
    guard,
    picks: picks.bodyHash,
    door: doorRecordOf('validationUniverse', loaded, fold),
    boundary: { index: boundary, date: dates[boundary] },
    validationEnd: loaded.universe.end,
    fixed,
    engine,
    portfolio,
    continuity,
    gates
  });

  for (const gate of gates) {
    log(
      `validation ${fold} ${gate.procedure}: ${gate.available ? `F1 ${gate.F1} F2 ${gate.F2} F3 ${gate.F3} → ${gate.success ? 'success' : 'fail'}` : 'no configuration'}`
    );
  }

  log(`validation ${fold}: sealed ${file} (${sealed.bodyHash.slice(0, 12)})`);

  return sealed;
};

export const runProcedureGate = async () => {
  const guard = await requireFrozen();

  if (await fs.pathExists(procedureGateFile)) {
    throw new Error(`${procedureGateFile} exists: the procedure gate is sealed`);
  }

  const folds = await Promise.all(
    foldKeys.map(async (fold) => readSealed<{ bodyHash: string; gates: FoldGate[] }>(validationFile(fold)))
  );
  const result = procedures.map((procedure) => {
    const perFold = folds.map((record) => record.gates.find((gate) => gate.procedure === procedure)!);

    return {
      procedure,
      folds: Object.fromEntries(foldKeys.map((fold, i) => [fold, perFold[i]!.success])),
      pass: perFold.every((gate) => gate.success)
    };
  });
  const sealed = await writeSealed(procedureGateFile, {
    stage: 'procedure-gate',
    writtenAt: nowIso(),
    guard,
    validations: Object.fromEntries(foldKeys.map((fold, i) => [fold, folds[i]!.bodyHash])),
    rule: 'GP(X, Rk) passes iff the fold gate F1 ∧ F2 ∧ F3 succeeds in both folds (F2: V(X) − max(V(B5), V(B4)) ≥ $5,000 at 5 bps and V(X) ≥ max(V(B5), V(B4)) at 10 bps)',
    result
  });

  for (const entry of result) {
    log(`procedure gate ${entry.procedure}: ${entry.pass ? 'PASS' : 'fail'} (${JSON.stringify(entry.folds)})`);
  }

  return sealed;
};

export const readProcedureGate = async () =>
  readSealed<{ bodyHash: string; result: { procedure: ProcedureKey; pass: boolean }[] }>(procedureGateFile);
