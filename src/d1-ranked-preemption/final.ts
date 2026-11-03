// The final round's decision (PROTOCOL.md §14): nomination gates N1–N6 on the final training window for every
// procedure whose GP passed, at most one nominee, the sealed FROZEN_SELECTION.json; then, only with a nominee, the
// single blocking-only historical check on 2024-01-02 → 2026-10-13 (continuous from 2016, increments after the
// 2023-12-29 close; label: inspected historical confirmation only) and, only if it passes, the prospective
// registration (observations strictly after 2026-10-13: zero today).
import fs from 'fs-extra';
import { allocationOf } from './allocation.ts';
import { type RankingKey, frozenSelectionFile, log, nowIso, rankingKeys, researchRoot, study } from './context.ts';
import { readControls } from './controls.ts';
import { doorRecordOf, historicalCheckRecord, historicalUniverse } from './data.ts';
import type { Book, PoolMetrics } from './evaluate.ts';
import { Evaluator } from './evaluator.ts';
import { readSealed, writeSealed } from './freeze.ts';
import { requireFrozen } from './guard.ts';
import { allocationFor, readWindowInputs } from './inputs.ts';
import { defaultWorkerCount } from './pool.ts';
import { engineRun, fixedFigures, windowFromEngine } from './runs.ts';
import { type ProcedureKey, procedures, readProcedureGate } from './walkforward.ts';

export const historicalFile = historicalCheckRecord;
export const registrationFile = `${researchRoot}/PROSPECTIVE_REGISTRATION.json`;

export interface NominationGates {
  procedure: ProcedureKey;
  configuration: string;
  gp: boolean;
  N1: boolean;
  N2: boolean;
  N3: boolean;
  N4: boolean;
  N5: boolean;
  N6: boolean;
  all: boolean;
  nominable: boolean;
  neighbourhoodMedianScore: number;
  figures: Record<string, number>;
}

export const runSelection = async () => {
  const guard = await requireFrozen();

  if (await fs.pathExists(frozenSelectionFile)) {
    throw new Error(`${frozenSelectionFile} exists: the selection is sealed`);
  }

  const gate = await readProcedureGate();
  const controls = await readControls('final');
  const gates: NominationGates[] = [];

  for (const procedure of procedures) {
    const fixed = controls.fixed[procedure];
    const a = controls.fixed.A!;
    const gp = gate.result.find((entry) => entry.procedure === procedure)!.pass;

    if (!fixed) {
      gates.push({
        procedure,
        configuration: procedure,
        gp,
        N1: false,
        N2: false,
        N3: false,
        N4: false,
        N5: false,
        N6: false,
        all: false,
        nominable: false,
        neighbourhoodMedianScore: NaN,
        figures: {}
      });
      continue;
    }

    const x5 = fixed['5']!;
    const x10 = fixed['10']!;
    // every incumbent comparison uses the better of B5 (A) and B4 (PROTOCOL.md §14.2)
    const b4 = controls.fixed.B4!;
    const best5 = Math.max(a['5']!.net, b4['5']!.net);
    const best10 = Math.max(a['10']!.net, b4['10']!.net);
    const bestTrimmed = Math.max(a['5']!.net - a['5']!.bestLot, b4['5']!.net - b4['5']!.bestLot);
    // N3: the fresh nomination draws of the final controls (never used by a selection)
    const neighbourhood = controls.neighbourhoods[procedure]!;
    const pf = controls.portfolio[procedure]!;
    const bestProductivity = Math.max(controls.portfolio.A!.productivity, controls.portfolio.B4!.productivity);
    const N1 = x5.minuteDrawdown <= study.gates.final.ddCeiling && x10.minuteDrawdown <= study.gates.final.ddCeiling;
    const N2 =
      x5.net - best5 >= study.gates.final.materiality && x10.net - best10 > 0 && x5.net - x5.bestLot >= bestTrimmed;
    const N3 =
      neighbourhood.shareDrawdownOk >= study.gates.final.neighbourhoodShare && neighbourhood.medianNet >= best5;
    const N4 =
      pf.dailyPercentDrawdown <= study.gates.final.portfolioDailyCeiling &&
      pf.productivity >= bestProductivity - study.gates.final.borrowingProductivity * Math.abs(bestProductivity);
    const N5 =
      x5.lots >= study.gates.final.minLots &&
      x5.lotYears >= study.gates.final.minYears &&
      x10.net >= study.gates.final.costRetention * x5.net;
    const N6 = x5.top2 <= study.gates.final.top2Share * x5.net;
    const all = N1 && N2 && N3 && N4 && N5 && N6;

    gates.push({
      procedure,
      configuration: procedure,
      gp,
      N1,
      N2,
      N3,
      N4,
      N5,
      N6,
      all,
      nominable: gp && all,
      neighbourhoodMedianScore: neighbourhood.medianScore,
      figures: {
        net5: x5.net,
        net10: x10.net,
        incumbentNet5: best5,
        incumbentNet10: best10,
        b5Net5: a['5']!.net,
        b4Net5: b4['5']!.net,
        minuteDrawdown5: x5.minuteDrawdown,
        minuteDrawdown10: x10.minuteDrawdown,
        bestLot: x5.bestLot,
        incumbentTrimmedNet: bestTrimmed,
        top2: x5.top2,
        lots: x5.lots,
        lotYears: x5.lotYears,
        neighbourhoodMedianNet: neighbourhood.medianNet,
        neighbourhoodShareDrawdownOk: neighbourhood.shareDrawdownOk,
        portfolioDailyDrawdown: pf.dailyPercentDrawdown,
        portfolioProductivity: pf.productivity,
        incumbentPortfolioProductivity: bestProductivity
      }
    });
  }

  const order = (g: NominationGates) => [
    g.neighbourhoodMedianScore,
    g.procedure[0] === 'D' ? 1 : 0,
    g.procedure.endsWith('R1') ? 1 : 0
  ];
  const nominee = gates
    .filter((g) => g.nominable)
    .sort((a, b) => {
      const [x, y] = [order(a), order(b)];

      return y[0]! - x[0]! || y[1]! - x[1]! || y[2]! - x[2]!;
    })[0];
  const sealed = await writeSealed(frozenSelectionFile, {
    stage: 'selection',
    writtenAt: nowIso(),
    guard,
    procedureGate: gate.bodyHash,
    controls: controls.bodyHash,
    gates,
    nominees: nominee
      ? [
          {
            procedure: nominee.procedure,
            configuration: controls.configurations.find((c) => c.id === nominee.procedure)!
          }
        ]
      : [],
    decision: nominee
      ? `one nominee (${nominee.procedure}) for the single blocking-only historical check`
      : 'no advancement: no procedure passed both its procedure gate and every nomination gate; B4 stays the default and B5 the leading incumbent'
  });

  log(
    `selection: ${nominee ? `nominee ${nominee.procedure}` : 'no advancement'}; sealed ${frozenSelectionFile} (${sealed.bodyHash.slice(0, 12)})`
  );

  return sealed;
};

export const runHistoricalCheck = async (options: { workers?: number } = {}) => {
  const guard = await requireFrozen();

  if (await fs.pathExists(historicalFile)) {
    throw new Error(`${historicalFile} exists: the historical check runs once`);
  }

  const selection = await readSealed<{
    bodyHash: string;
    nominees: {
      procedure: ProcedureKey;
      configuration: {
        books: { symbol: string; grid: Book['vector']['grid']; candidateId: string }[];
        ranking: RankingKey;
        policy: 'P1';
      };
    }[];
  }>(frozenSelectionFile);
  const nominee = selection.nominees[0];

  if (!nominee) {
    throw new Error('No nominee: the 2024–2026 window stays closed and the historical check is not run');
  }

  const inputs = await readWindowInputs('final');
  const controls = await readControls('final');
  const a = controls.configurations.find((c) => c.id === 'A')!;
  const b4 = controls.configurations.find((c) => c.id === 'B4')!;
  const toBooks = (list: { symbol: string; grid: Book['vector']['grid']; candidateId: string }[]): Book[] =>
    list.map((book) => ({
      symbol: book.symbol,
      vector: { id: book.candidateId, grid: book.grid, origin: 'selection' }
    }));
  const symbols = [
    ...new Set([...nominee.configuration.books, ...a.books, ...b4.books].map((book) => book.symbol))
  ].sort();
  const loaded = await historicalUniverse(symbols, { purpose: 'check' });
  const dates = loaded.universe.dates;
  let boundary = -1;

  for (let index = 0; index < dates.length; index++) {
    if (dates[index]! <= study.trainingLastSession) {
      boundary = index;
    }
  }

  const evaluator = await Evaluator.create(loaded, options.workers ?? defaultWorkerCount());
  const [n, base, four] = await evaluator.pools([
    {
      books: toBooks(nominee.configuration.books),
      costBps: study.principalCostBps,
      allocation: allocationFor(
        inputs,
        nominee.configuration.ranking,
        nominee.configuration.books.map((book) => book.symbol)
      ),
      minLots: 0,
      windowStarts: [boundary]
    },
    {
      books: toBooks(a.books),
      costBps: study.principalCostBps,
      allocation: allocationOf('P0'),
      minLots: 0,
      windowStarts: [boundary]
    },
    {
      books: toBooks(b4.books),
      costBps: study.principalCostBps,
      allocation: allocationOf('P0'),
      minLots: 0,
      windowStarts: [boundary]
    }
  ]);

  await evaluator.close();

  // the authoritative engine must agree with the replay for the nominee and the incumbents
  const engine: Record<string, ReturnType<typeof fixedFigures>> = {};

  for (const [name, books, allocation, metrics] of [
    [
      'nominee',
      toBooks(nominee.configuration.books),
      allocationFor(
        inputs,
        nominee.configuration.ranking,
        nominee.configuration.books.map((book) => book.symbol)
      ),
      n!
    ],
    ['B5', toBooks(a.books), allocationOf('P0'), base!],
    ['B4', toBooks(b4.books), allocationOf('P0'), four!]
  ] as const) {
    const run = engineRun(loaded, books, 'fixed', study.principalCostBps, allocation);
    const figures = fixedFigures(run);
    const fromEngine = windowFromEngine(run, boundary);

    if (
      figures.net !== metrics.net ||
      figures.lots !== metrics.lots ||
      figures.minuteDrawdown !== metrics.minuteDrawdown ||
      Math.abs(fromEngine.net - metrics.windowed[0]!.net) > 1e-6 ||
      Math.abs(fromEngine.dailyDrawdown - metrics.windowed[0]!.dailyDrawdown) > 1e-6
    ) {
      throw new Error(`historical check: the replay differs from the engine for ${name}`);
    }

    engine[name] = figures;
  }

  const window = (m: PoolMetrics) => m.windowed[0]!;
  const pass =
    window(n!).net >= Math.max(window(base!).net, window(four!).net) - study.gates.historical.tolerance &&
    window(n!).minuteDrawdown <= study.gates.historical.ddCeiling;
  const sealed = await writeSealed(historicalFile, {
    stage: 'historical-check',
    label: 'inspected historical confirmation only (E3); blocking-only; never used for any choice',
    writtenAt: nowIso(),
    guard,
    selection: selection.bodyHash,
    door: doorRecordOf('historicalUniverse', loaded),
    boundary: { index: boundary, date: dates[boundary] },
    nominee: {
      procedure: nominee.procedure,
      window: window(n!),
      whole: { net: n!.net, minuteDrawdown: n!.minuteDrawdown }
    },
    B5: { window: window(base!), whole: { net: base!.net, minuteDrawdown: base!.minuteDrawdown } },
    B4: { window: window(four!), whole: { net: four!.net, minuteDrawdown: four!.minuteDrawdown } },
    engine,
    pass
  });

  if (pass) {
    await writeSealed(registrationFile, {
      kind: 'ranked-preemption-prospective-registration',
      study: study.version,
      registeredAt: nowIso(),
      historicalCheck: sealed.bodyHash,
      candidate: nominee,
      cutoff: study.lastCommonSession,
      observations: 0,
      note: 'prospective shadow monitoring of this candidate begins with verified bars strictly after 2026-10-13; the B4/B5 prospective freeze is separate and unchanged'
    });
  }

  log(`historical check: ${pass ? 'pass → registered' : 'fail → research-only'}`);

  return sealed;
};

export { rankingKeys };
