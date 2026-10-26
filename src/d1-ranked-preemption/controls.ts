// The controlled comparisons of a window on its training data (PROTOCOL.md §12): A (B5 unchanged, P0), B4 and B1,
// B_Rk (B5 under P1 with the window's frozen ranking; also P0R and the B250/B500 sensitivities), C_Rk (P1; P0
// ablation), D*_Rk (P1; the P0 switch-off ablation; sensitivities) and, in the final window, the exploratory
// incumbent-arm finalist; fixed pool at 0/2/5/10 bps; the 20% portfolio of the main configurations; in the final
// window B5's neighbourhood under P1 for gate N3. Every replay figure of a P1 configuration is cross-checked against
// the derived engine. One sealed record per window.
import fs from 'fs-extra';
import { type PolicyKey, allocationOf } from './allocation.ts';
import { type RankingKey, type WindowKey, log, nowIso, rankingKeys, stageDir, study } from './context.ts';
import { doorRecordOf, trainingUniverse } from './data.ts';
import type { Book, PoolMetrics } from './evaluate.ts';
import { Evaluator } from './evaluator.ts';
import { readSealed, writeSealed } from './freeze.ts';
import { requireFrozen } from './guard.ts';
import { type IncumbentKey, incumbentBooks } from './incumbents.ts';
import { type WindowInputs, allocationFor, assemblyC, readWindowInputs } from './inputs.ts';
import { quantile, readJoint } from './joint.ts';
import { defaultWorkerCount } from './pool.ts';
import { engineRun, fixedFigures, portfolioFigures } from './runs.ts';
import { neighbour } from './space.ts';

export const controlsFile = (window: WindowKey) => stageDir('controls', window, 'CONTROLS.json');

export interface Configuration {
  id: string;
  label: string;
  books: Book[];
  ranking?: RankingKey;
  policy: PolicyKey;
  role: 'incumbent' | 'procedure' | 'ablation' | 'sensitivity' | 'exploratory';
  procedure?: string; // B-R1, C-R1, D-R1, …
}

export const allocationOfConfiguration = (inputs: WindowInputs, configuration: Configuration) =>
  configuration.policy === 'P0' || !configuration.ranking
    ? allocationOf('P0')
    : allocationFor(
        inputs,
        configuration.ranking,
        configuration.books.map((book) => book.symbol),
        configuration.policy
      );

// Every configuration of a window, from its sealed inputs and joint records.
export const windowConfigurations = async (
  window: WindowKey,
  inputs: WindowInputs,
  incumbents: Record<IncumbentKey, Book[]>
): Promise<Configuration[]> => {
  const list: Configuration[] = [
    { id: 'A', label: 'B5 unchanged (P0)', books: incumbents.B5, policy: 'P0', role: 'incumbent' },
    { id: 'B4', label: 'B4 unchanged (P0)', books: incumbents.B4, policy: 'P0', role: 'incumbent' },
    { id: 'B1', label: 'B1 = VGT D1 alone (P0)', books: incumbents.B1, policy: 'P0', role: 'incumbent' }
  ];

  for (const ranking of rankingKeys) {
    const c = assemblyC(inputs, ranking);
    const joint = (await fs.pathExists(stageDir('joint', window, ranking, 'JOINT.json')))
      ? await readJoint(window, ranking)
      : undefined;
    const d = joint?.pick?.books;

    list.push(
      {
        id: `B-${ranking}`,
        label: `B5 vectors, P1 ${ranking}`,
        books: incumbents.B5,
        ranking,
        policy: 'P1',
        role: 'procedure',
        procedure: `B-${ranking}`
      },
      {
        id: `B-${ranking}-P0R`,
        label: `B5 vectors, ranked ties only ${ranking}`,
        books: incumbents.B5,
        ranking,
        policy: 'P0R',
        role: 'ablation'
      },
      {
        id: `B-${ranking}-B250`,
        label: `B5 vectors, P1-B250 ${ranking}`,
        books: incumbents.B5,
        ranking,
        policy: 'P1-B250',
        role: 'sensitivity'
      },
      {
        id: `B-${ranking}-B500`,
        label: `B5 vectors, P1-B500 ${ranking}`,
        books: incumbents.B5,
        ranking,
        policy: 'P1-B500',
        role: 'sensitivity'
      }
    );

    if (c.length > 0) {
      list.push(
        {
          id: `C-${ranking}`,
          label: `standalone-ranked top ${c.length}, P1 ${ranking}`,
          books: c,
          ranking,
          policy: 'P1',
          role: 'procedure',
          procedure: `C-${ranking}`
        },
        {
          id: `C-${ranking}-P0`,
          label: `standalone-ranked top ${c.length}, P0`,
          books: c,
          ranking,
          policy: 'P0',
          role: 'ablation'
        }
      );
    }

    if (d) {
      list.push(
        {
          id: `D-${ranking}`,
          label: `joint pick (arm ${joint!.pick!.arm}), P1 ${ranking}`,
          books: d,
          ranking,
          policy: 'P1',
          role: 'procedure',
          procedure: `D-${ranking}`
        },
        {
          id: `D-${ranking}-P0`,
          label: 'joint pick, P0 (switch-off ablation)',
          books: d,
          ranking,
          policy: 'P0',
          role: 'ablation'
        },
        {
          id: `D-${ranking}-B250`,
          label: `joint pick, P1-B250 ${ranking}`,
          books: d,
          ranking,
          policy: 'P1-B250',
          role: 'sensitivity'
        },
        {
          id: `D-${ranking}-B500`,
          label: `joint pick, P1-B500 ${ranking}`,
          books: d,
          ranking,
          policy: 'P1-B500',
          role: 'sensitivity'
        }
      );
    }

    if (joint && window === 'final') {
      const arms = joint.arms as { arm: string; finalist: { books: Book[] } | null }[];
      const b = arms.find((arm) => arm.arm === 'B')?.finalist;

      if (b) {
        list.push({
          id: `DB-${ranking}`,
          label: `incumbent-arm finalist (exploratory), P1 ${ranking}`,
          books: b.books,
          ranking,
          policy: 'P1',
          role: 'exploratory'
        });
      }
    }
  }

  return list;
};

export const costIds = (configuration: Configuration) =>
  configuration.role === 'incumbent' || configuration.role === 'procedure';

export const runControls = async (window: WindowKey, options: { workers?: number } = {}) => {
  const guard = await requireFrozen();
  const file = controlsFile(window);

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the ${window} controls are sealed`);
  }

  // both rankings' Stage D records must be sealed first (a configuration missing here could never be added later)
  for (const ranking of rankingKeys) {
    await readJoint(window, ranking).catch(() => {
      throw new Error(`the ${window} ${ranking} Stage D record is not sealed: run \`joint --window ${window}\` first`);
    });
  }

  const startedAt = nowIso();
  const inputs = await readWindowInputs(window);
  const incumbents = await incumbentBooks();
  const configurations = await windowConfigurations(window, inputs, incumbents);
  const symbols = [
    ...new Set(['VOOG', 'VGT', ...configurations.flatMap((c) => c.books.map((book) => book.symbol))])
  ].sort();
  const loaded = await trainingUniverse(window, { symbols });
  const evaluator = await Evaluator.create(loaded, options.workers ?? defaultWorkerCount());
  const minLots = study.joint.minLots[window];
  const requests = configurations.flatMap((configuration) =>
    (costIds(configuration) ? study.costsBps : [study.principalCostBps]).map((costBps) => ({
      configuration,
      costBps,
      request: {
        books: configuration.books,
        costBps,
        allocation: allocationOfConfiguration(inputs, configuration),
        minLots
      }
    }))
  );
  const metrics = await evaluator.pools(requests.map((item) => item.request));
  const fixed: Record<string, Record<number, PoolMetrics>> = {};

  requests.forEach((item, index) => {
    fixed[item.configuration.id] ??= {};
    fixed[item.configuration.id]![item.costBps] = metrics[index]!;
  });

  // N3 (final window): fresh N1 draws, never used by any selection, of the B and D configurations under P1 with their
  // ranking (stage `nomination:final:<ranking>`; common random numbers, so B and D are perturbed alike per symbol)
  const neighbourhoods: Record<string, unknown> = {};

  if (window === 'final') {
    for (const configuration of configurations.filter((c) => c.role === 'procedure' && c.id[0] !== 'C')) {
      const ranking = configuration.ranking!;
      const draws = Array.from({ length: study.gates.nominationDraws }, (_, d) =>
        neighbour(configuration.books, `nomination:final:${ranking}`, 'N1', d)
      );
      const drawMetrics = await evaluator.pools(
        draws.map((books) => ({
          books,
          costBps: study.principalCostBps,
          allocation: allocationFor(
            inputs,
            ranking,
            books.map((book) => book.symbol)
          ),
          minLots
        }))
      );

      neighbourhoods[configuration.id] = {
        stage: `nomination:final:${ranking}`,
        draws: drawMetrics.length,
        medianScore: quantile(
          drawMetrics.map((m) => m.score),
          0.5
        ),
        medianNet: quantile(
          drawMetrics.map((m) => m.net),
          0.5
        ),
        netP10: quantile(
          drawMetrics.map((m) => m.net),
          0.1
        ),
        netP25: quantile(
          drawMetrics.map((m) => m.net),
          0.25
        ),
        shareDrawdownOk:
          drawMetrics.filter((m) => m.minuteDrawdown <= study.joint.ddCeiling).length / drawMetrics.length,
        drawdownP90: quantile(
          drawMetrics.map((m) => m.minuteDrawdown),
          0.9
        )
      };
    }
  }

  await evaluator.close();

  // the derived engine: authoritative fixed runs of the main configurations (cross-check) and the 20% portfolio
  const engine: Record<string, unknown> = {};
  const portfolio: Record<string, unknown> = {};

  for (const configuration of configurations.filter((c) => c.role === 'incumbent' || c.role === 'procedure')) {
    const allocation = allocationOfConfiguration(inputs, configuration);
    const run = engineRun(loaded, configuration.books, 'fixed', study.principalCostBps, allocation);
    const figures = fixedFigures(run);
    const replay = fixed[configuration.id]![study.principalCostBps]!;

    if (
      figures.net !== replay.net ||
      figures.lots !== replay.lots ||
      figures.minuteDrawdown !== replay.minuteDrawdown
    ) {
      throw new Error(
        `${window} ${configuration.id}: the replay (${replay.net}, ${replay.lots}, ${replay.minuteDrawdown}) differs from the engine (${figures.net}, ${figures.lots}, ${figures.minuteDrawdown})`
      );
    }

    // the latency assumption's reach (PROTOCOL.md §5.3.4): executed switches whose replacement was bought in the
    // very minute the incumbent was sold
    const executed = run.preemptions.filter((record) => record.outcome === 'executed');
    const sameMinute = executed.filter(
      (record) => run.lots.find((lot) => lot.id === record.replacementLotId)?.entryTime === record.executionTime
    ).length;

    engine[configuration.id] = {
      ...figures,
      equalsReplay: true,
      executedSwitches: executed.length,
      sameMinuteSwitches: sameMinute
    };

    const pf = engineRun(loaded, configuration.books, 'portfolio', study.principalCostBps, allocation);

    portfolio[configuration.id] = { ...portfolioFigures(pf), preemptions: fixedFigures(pf).preemptions };
    log(`controls ${window} ${configuration.id}: engine = replay; portfolio done`);
  }

  const sealed = await writeSealed(file, {
    stage: 'controls',
    window,
    startedAt,
    finishedAt: nowIso(),
    guard,
    door: doorRecordOf('trainingUniverse', loaded, window),
    rankings: Object.fromEntries(rankingKeys.map((key) => [key, inputs.rankings[key].bodyHash])),
    configurations: configurations.map((c) => ({
      id: c.id,
      label: c.label,
      role: c.role,
      procedure: c.procedure ?? null,
      ranking: c.ranking ?? null,
      policy: c.policy,
      books: c.books.map((book) => ({ symbol: book.symbol, grid: book.vector.grid, candidateId: book.vector.id }))
    })),
    fixed,
    engine,
    portfolio,
    neighbourhoods
  });

  log(`controls ${window}: sealed ${file} (${sealed.bodyHash.slice(0, 12)})`);

  return sealed;
};

export const readControls = async (window: WindowKey) =>
  readSealed<{
    bodyHash: string;
    configurations: {
      id: string;
      role: string;
      procedure: string | null;
      ranking: RankingKey | null;
      policy: PolicyKey;
      books: { symbol: string; grid: Book['vector']['grid']; candidateId: string }[];
    }[];
    fixed: Record<string, Record<string, PoolMetrics>>;
    portfolio: Record<string, ReturnType<typeof portfolioFigures>>;
    neighbourhoods: Record<string, { medianNet: number; shareDrawdownOk: number; medianScore: number }>;
    [key: string]: unknown;
  }>(controlsFile(window));
