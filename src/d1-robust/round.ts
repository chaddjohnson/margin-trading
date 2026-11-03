// One round of the procedure (PROTOCOL.md §8–§14): the library pinned, discovery of each arm, promotion, refinement,
// assessment, the gates and the picks. Fold rounds run arms J and Q (identical seeds and budgets) and end with the
// write-once PICKS.json; the final round runs the unseeded and benchmark-seeded J arms, pools their archives for
// promotion, and ends with the gated ranking and nominations (frozen later by selection.ts). Every artifact is written
// under the round's directory; nothing here opens a validation, holdout or final bar.
import fs from 'fs-extra';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { Archive, type Arm, type Entry, booksOfEntry, compareEntries } from './archive.ts';
import {
  type Assessment,
  type AssessContext,
  type Ranked,
  assessConfig,
  attachComparisons,
  centreGatesOf,
  gatesOf,
  ladderOf,
  nominate,
  rankPassing,
  rankQ
} from './assess.ts';
import { type Tier, type WindowKey, log, nowIso, study, writeJson } from './context.ts';
import { doorRecordOf } from './data.ts';
import { runDiscovery } from './discovery.ts';
import { keyOf } from './evaluate.ts';
import type { RobustEvaluator } from './evaluator.ts';
import { readSealed, writeSealed } from './freeze.ts';
import { GenomeSpace, Library } from './genome.ts';
import { type RoundLibrary, roundLibrary } from './library.ts';
import type { Book } from './neighbourhood.ts';
import { pilotFreezeFile } from './pilot.ts';
import { pboOf } from './pbo.ts';
import { type Promoted, familiesOf, promoteFamilies, reevaluate } from './promote.ts';
import { refineFamily } from './refine.ts';
import type { RiskReferences } from './stats.ts';

export interface RoundOptions {
  round: WindowKey;
  tier: Tier;
  universe: string[];
  benchmarks: Record<'B1' | 'B4' | 'B5', Book[]>;
  outDir: string;
  smoke?: { budget?: number; islandCap?: number; promotionTop?: number; refineCap?: number; families?: number };
  capacity?: AssessContext['capacity'];
}

export interface PilotFreeze {
  window: WindowKey;
  references: RiskReferences;
  discoveryDraws: number;
  bodyHash: string;
}

export const readPilotFreeze = async (round: WindowKey, file = pilotFreezeFile(round)) =>
  (await readSealed(file)) as unknown as PilotFreeze;

export const armsOf = (round: WindowKey, tier: Tier) =>
  round === 'final'
    ? tier.seededArmInFinal
      ? (['unseeded', 'seeded'] as const)
      : (['unseeded'] as const)
    : (['J', 'Q'] as const);

// The library's traces at 5 bps on every symbol, pinned (diagnostic records only).
export const pinLibrary = async (evaluator: RobustEvaluator, library: RoundLibrary, universe: readonly string[]) => {
  const started = Date.now();

  await evaluator.ensureTraces(
    universe.flatMap((symbol) =>
      library.vectors.map((vector) => ({ book: { symbol, vector }, costBps: study.principalCostBps }))
    ),
    true
  );

  return {
    seconds: (Date.now() - started) / 1000,
    traces: universe.length * library.vectors.length,
    cache: evaluator.cacheStats()
  };
};

export const runRound = async (
  evaluator: RobustEvaluator,
  loaded: LoadedUniverse,
  options: RoundOptions,
  pilot: PilotFreeze
) => {
  const { round, tier, universe, benchmarks, outDir } = options;
  const started = Date.now();
  const library = await roundLibrary(round);
  const pinned = await pinLibrary(evaluator, library, universe);
  const space = new GenomeSpace(universe, new Library(library.vectors));
  const fold = round !== 'final';
  const budget = options.smoke?.budget ?? (fold ? tier.foldBudget(universe.length) : tier.finalBudget(universe.length));

  await writeJson(`${outDir}/round.json`, {
    generatedAt: nowIso(),
    round,
    tier: tier.key,
    universe,
    budgetPerArm: budget,
    pilotFreeze: pilot.bodyHash,
    discoveryDraws: pilot.discoveryDraws,
    door: doorRecordOf('trainingUniverse', loaded, round),
    library: { vectors: library.vectors.length, sobol: library.sobol.length, controls: library.controls.length, pinned }
  });

  // ----- discovery, per arm -----

  const archives: Record<string, Archive> = {};
  const discoveries: Record<string, Awaited<ReturnType<typeof runDiscovery>>> = {};

  for (const armLabel of armsOf(round, tier)) {
    const arm: Arm = armLabel === 'Q' ? 'Q' : 'J';
    const archive = new Archive(
      evaluator,
      { arm, round, draws: pilot.discoveryDraws, stage: 'disc', references: pilot.references },
      `${outDir}/${armLabel}/discovery.jsonl`
    );
    const discovery = await runDiscovery({
      space,
      archive,
      round,
      armLabel: fold ? 'fold' : armLabel,
      budget,
      seededBooks: armLabel === 'seeded' ? [benchmarks.B1, benchmarks.B4, benchmarks.B5] : undefined,
      tier: tier.key,
      smoke: options.smoke ? { islandCap: options.smoke.islandCap } : undefined
    });

    archive.flush();
    archives[armLabel] = archive;
    discoveries[armLabel] = discovery;

    // The descriptive PBO of the arm's archive: the best 1,000 feasible configurations by the arm's ranking.
    const top = archive
      .ranked()
      .filter((entry) => entry.feasible)
      .slice(0, study.assessment.pboTop);
    const pbo = Object.fromEntries(
      study.assessment.pboBlocks.map((blocks) => [
        blocks,
        pboOf(
          top.map((entry) => entry.e.quarters),
          blocks
        )
      ])
    );

    await writeJson(`${outDir}/${armLabel}/discovery.json`, {
      generatedAt: nowIso(),
      arm,
      armLabel,
      ...discovery,
      pbo,
      cache: evaluator.cacheStats()
    });
    log(`${round} ${armLabel}: discovery ${discovery.evaluations} configurations in ${discovery.seconds.toFixed(0)} s`);
  }

  // ----- promotion: per arm in a fold round; pooled in the final round -----

  const promotionGroups: { label: string; arm: Arm; candidates: { entry: Entry; provenance: string }[] }[] = fold
    ? (['J', 'Q'] as const).map((arm) => ({
        label: arm,
        arm,
        candidates: archives[arm]!.ranked()
          .filter((entry) => entry.feasible)
          .slice(0, options.smoke?.promotionTop ?? tier.promotionTop)
          .map((entry) => ({ entry, provenance: 'fold' }))
      }))
    : [
        {
          label: 'pooled',
          arm: 'J' as Arm,
          candidates: Object.entries(archives)
            .flatMap(([armLabel, archive]) =>
              [...archive.entries.values()]
                .filter((entry) => entry.feasible)
                .map((entry) => ({ entry, provenance: armLabel }))
            )
            .sort((a, b) => compareEntries(a.entry, b.entry))
            .filter((item, index, all) => all.findIndex((other) => other.entry.key === item.entry.key) === index)
            .slice(0, options.smoke?.promotionTop ?? tier.promotionTop)
        }
      ];
  const finalists: Record<string, { promoted: Promoted; refined: Awaited<ReturnType<typeof refineFamily>> }[]> = {};

  for (const group of promotionGroups) {
    const promoted = await reevaluate(evaluator, group.candidates, {
      arm: group.arm,
      draws: tier.promotionDraws,
      references: pilot.references,
      stage: 'promo'
    });
    // Families are formed among the configurations that pass F1 at 5/10 bps and F-P (infeasible ones cannot link
    // feasible families); the infeasible are recorded beside them.
    const families = familiesOf(promoted.filter((item) => item.feasible));
    const representatives = families.map((members) => members[0]!);
    const refineCount = options.smoke?.families ?? (fold ? tier.refineFamilies.fold : tier.refineFamilies.final);
    const { refined: toRefine, promoted: chosen, order, notes } = promoteFamilies(representatives, round, refineCount);

    await writeJson(`${outDir}/${group.label}/promotion.json`, {
      generatedAt: nowIso(),
      arm: group.arm,
      candidates: promoted.length,
      feasible: promoted.filter((item) => item.feasible).length,
      families: families.map((members, index) => ({
        family: index,
        size: members.length,
        representative: members[0]!.key,
        members: members.map((item) => item.key),
        promoted: chosen.includes(members[0]!),
        refined: toRefine.includes(members[0]!),
        required: members[0]!.required ?? ''
      })),
      infeasible: promoted.filter((item) => !item.feasible).map((item) => ({ key: item.key, failures: item.failures })),
      order: order.map((item) => item.key),
      refinedOrder: toRefine.map((item) => item.key),
      notes,
      promoted
    });

    // ----- refinement of the first families -----

    finalists[group.label] = [];

    for (const [index, representative] of toRefine.entries()) {
      const refined = await refineFamily(evaluator, representative.books, {
        arm: group.arm,
        round,
        family: `${group.label}-f${index + 1}`,
        draws: tier.refineDraws,
        references: pilot.references,
        cap: options.smoke?.refineCap ?? (fold ? tier.refineCap.fold : tier.refineCap.final),
        library: space.library,
        universe
      });

      finalists[group.label]!.push({ promoted: representative, refined });
      await writeJson(`${outDir}/${group.label}/refine-f${index + 1}.json`, {
        generatedAt: nowIso(),
        representative: representative.key,
        provenance: representative.provenance,
        ...refined,
        resultState: { ...refined.resultState, books: refined.resultState.books },
        startState: { ...refined.startState }
      });
    }
  }

  // ----- assessment -----

  const ctx: AssessContext = {
    evaluator,
    round,
    tier,
    references: pilot.references,
    benchmarks,
    universe,
    searchEnd: study.windows[round].searchEnd,
    capacity: options.capacity
  };
  const benchmarkAssessments: Record<'B1' | 'B4' | 'B5', Assessment> = {} as never;

  for (const key of ['B1', 'B4', 'B5'] as const) {
    benchmarkAssessments[key] = await assessConfig(ctx, benchmarks[key], key, 'benchmark', 'J', 'benchmark');
  }

  const ladder = await ladderOf(ctx);
  const results: Record<
    string,
    { ranked: Ranked[]; order: Ranked[]; nominees: { role: string; key: string; note?: string }[] }
  > = {};

  for (const group of promotionGroups) {
    const rows: Ranked[] = [];

    for (const [index, item] of finalists[group.label]!.entries()) {
      const books = item.refined.resultState.books;
      const assessment = await assessConfig(
        ctx,
        books,
        `${group.label}-f${index + 1}`,
        'finalist',
        group.arm,
        item.promoted.provenance
      );

      attachComparisons(ctx, assessment, { B4: benchmarkAssessments.B4, B5: benchmarkAssessments.B5 }, ladder);

      let gates;

      if (group.arm === 'Q') {
        const five = assessment.centre[study.principalCostBps]!;
        const marginals: Record<string, number> = {};
        const without = assessment.members.map((symbol) => books.filter((book) => book.symbol !== symbol));
        const centres = await evaluator.centres(
          without.filter((list) => list.length > 0),
          study.principalCostBps
        );
        let cursor = 0;

        assessment.members.forEach((symbol, i) => {
          const q = five.net - study.complexityPenalty * five.books;

          marginals[symbol] =
            without[i]!.length === 0
              ? q
              : q - (centres[cursor]!.net - study.complexityPenalty * centres[cursor++]!.books);
        });
        gates = centreGatesOf(assessment, universe, marginals);
      } else {
        gates = gatesOf(assessment, universe, fold);
      }

      rows.push({
        assessment,
        gates,
        pass: gates.every((gate) => gate.pass),
        value:
          group.arm === 'Q'
            ? assessment.centre[study.principalCostBps]!.net - study.complexityPenalty * assessment.members.length
            : assessment.scoreA.s
      });
    }

    const order = group.arm === 'Q' ? rankQ(rows) : rankPassing(rows);
    const nominees = nominate(order, fold).map((nominee) => ({
      role: nominee.role,
      key: nominee.row.assessment.key,
      ...(nominee.note ? { note: nominee.note } : {})
    }));

    results[group.label] = { ranked: rows, order, nominees };
    await writeJson(`${outDir}/${group.label}/assessment.json`, {
      generatedAt: nowIso(),
      arm: group.arm,
      finalists: rows.map((row) => ({ ...row.assessment, gates: row.gates, pass: row.pass, value: row.value })),
      order: order.map((row) => row.assessment.key),
      nominees
    });
  }

  await writeJson(`${outDir}/benchmarks.json`, { generatedAt: nowIso(), benchmarks: benchmarkAssessments, ladder });

  return {
    seconds: (Date.now() - started) / 1000,
    archives,
    discoveries,
    finalists,
    results,
    benchmarkAssessments,
    ladder,
    cache: evaluator.cacheStats()
  };
};

// A fold's picks (write-once, before any validation bar is opened).
export const writePicks = async (
  file: string,
  round: WindowKey,
  outcome: Awaited<ReturnType<typeof runRound>>,
  provenance: Record<string, unknown>
) => {
  const pickOf = (arm: 'J' | 'Q') => {
    const result = outcome.results[arm]!;
    const primary = result.nominees.find((nominee) => nominee.role === 'primary');
    const rowOf = (key: string) => result.ranked.find((row) => row.assessment.key === key)!;

    return {
      primary: primary
        ? {
            key: primary.key,
            role: primary.role,
            books: rowOf(primary.key).assessment.books,
            value: rowOf(primary.key).value,
            labels: rowOf(primary.key).assessment.labels
          }
        : null,
      alternates: result.nominees
        .filter((nominee) => nominee !== primary)
        .map((nominee) => ({ key: nominee.key, role: nominee.role, books: rowOf(nominee.key).assessment.books })),
      finalists: result.ranked.map((row) => ({
        key: row.assessment.key,
        pass: row.pass,
        value: row.value,
        failed: row.gates.filter((gate) => !gate.pass).map((gate) => gate.gate)
      }))
    };
  };

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the picks are frozen once`);
  }

  return writeSealed(file, {
    round,
    frozenAt: nowIso(),
    J: pickOf('J'),
    Q: pickOf('Q'),
    ...provenance
  });
};

export const booksOfPick = (
  books: { symbol: string; id: string; grid: Book['vector']['grid']; origin: string }[]
): Book[] => booksOfEntry({ config: books });

export const keyOfBooks = keyOf;
