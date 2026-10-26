// One round of the procedure (PROTOCOL.md §9–§15), in two commands so that a crash after the search never repeats it:
//
//   search --window <w>   every arm of the window: stage A (the frozen schedule), stage B (anchored islands), stage C
//                         (free islands), one shared evaluation store; per-arm logs and coverage reports; then the
//                         sealed search manifest (log hashes, coverage results, door record).
//   select --window <w>   reads and verifies the logs, rebuilds each arm's archive, and per arm: families and
//                         promotion, refinement + pruning + re-refinement, assessment, gates; B1/B4/B5 assessed on the
//                         same draws; folds end with the write-once PICKS.json, the final round with its candidates.
//
// `searchCore` and `selectCore` carry the procedure with every input explicit (the leakage tests run them on fixture
// data); `runSearch` and `runSelect` add the freeze guards, the frozen inputs and the sealed outputs. Nothing here
// opens a validation, holdout or final bar.
import os from 'node:os';
import readline from 'node:readline';
import fs from 'fs-extra';
import { searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { RobustEvaluator } from '../d1-robust/evaluator.ts';
import { GenomeSpace, Library } from '../d1-robust/genome.ts';
import { type Book, gridKeyOf } from '../d1-robust/neighbourhood.ts';
import { pboOf } from '../d1-robust/pbo.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { ArmArchive, type Entry, parseEntry } from './archive.ts';
import {
  type AssessContext,
  type Assessment,
  assessConfig,
  attachComparisons,
  ladderOf,
  scoreDifferenceInterval
} from './assess.ts';
import {
  type ArmKey,
  type StartLabel,
  type Tier,
  type TierKey,
  type WindowKey,
  armClassOf,
  armSpecs,
  armsOf,
  log,
  nowIso,
  readJson,
  scheduleFile,
  stageDir,
  study,
  tierFile,
  tiers,
  writeJson
} from './context.ts';
import { readCalibration } from './controls.ts';
import { coverageOf } from './coverage.ts';
import { doorRecordOf, eligibleSymbols, picksFile, trainingUniverse } from './data.ts';
import { isCredible } from './families.ts';
import { provenance, readSealed, requireFrozen, sha256File, writeSealed } from './freeze.ts';
import { type Procedure, type Ranked, centreGatesOf, gatesOf, pick, procedureValue, rankRows } from './gates.ts';
import { type ArmLibrary, armLibrary, sobolLibrary } from './library.ts';
import { blocksOfLoaded, requireParity } from './parity.ts';
import { type PromotionRecord, promoteArm, reevaluate } from './promote.ts';
import { refineFamily } from './refine.ts';
import { requireReproduced } from './reproduce.ts';
import { type Schedule, buildSchedule } from './schedule.ts';
import { type RiskReferences, qOf } from './scores.ts';
import { runArmSearch } from './search.ts';
import { WindowStore } from './store.ts';

export const roundDir = (window: WindowKey, ...parts: string[]) => stageDir('rounds', window, ...parts);
export const searchManifestFile = (window: WindowKey) => roundDir(window, 'search.json');
export const selectionFile = (window: WindowKey) => roundDir(window, 'selection.json');
export const selectDir = (window: WindowKey, ...parts: string[]) => roundDir(window, 'select', ...parts);
export const archiveLog = (window: WindowKey, arm: ArmKey) => roundDir(window, arm, 'archive.jsonl');

// The tier, the worker count and the trace-cache capacity (speed only: evaluations are pure) chosen by the benchmark.
export const readTier = async () => {
  const record = await readJson<{ tier: TierKey; workers: number; traceCacheCapacity?: number }>(tierFile);

  return { tier: tiers[record.tier] as Tier, workers: record.workers, traceCache: record.traceCacheCapacity ?? 150000 };
};

const gb = (bytes: number) => bytes / 1024 ** 3;

const memoryGuard = (where: string) => {
  const rss = gb(process.memoryUsage().rss);

  if (rss > study.memoryAbortGb) {
    throw new Error(
      `${where}: resident memory ${rss.toFixed(1)} GB exceeds the ${study.memoryAbortGb} GB guard (re-run with a smaller trace cache; results are pure)`
    );
  }

  return rss;
};

const itemsOf = (entries: Iterable<Entry>) =>
  [...entries].map((entry) => ({
    members: entry.c.members,
    vectorBySymbol: Object.fromEntries(entry.config.map((book) => [book.symbol, gridKeyOf(book.grid)])),
    behaviour: entry.c.behaviourKey
  }));

// A crashed partial stage directory is moved aside, never overwritten (PROTOCOL.md §20).
const moveAsideIfPartial = async (dir: string, complete: string) => {
  if ((await fs.pathExists(dir)) && !(await fs.pathExists(complete))) {
    const aside = `${dir}-aborted-${nowIso().replace(/[:.]/g, '-')}`;

    await fs.move(dir, aside);
    log(`moved a partial ${dir} aside to ${aside} (the deterministic re-run is labelled)`);

    return aside;
  }

  return undefined;
};

type Benchmarks = Record<'B1' | 'B4' | 'B5', Book[]>;

// ----- the search -----

export interface SearchInputs {
  window: WindowKey;
  loaded: LoadedUniverse;
  universe: string[];
  tier: Tier;
  workers: number;
  references: RiskReferences;
  benchmarks: Benchmarks;
  schedule: Schedule;
  dir: string;
  arms?: ArmKey[];
  stopAfter?: number;
  library?: (start: StartLabel) => Promise<ArmLibrary>;
  pinLibrary?: boolean;
  traceCache?: number;
}

export const searchCore = async (inputs: SearchInputs) => {
  const { window, loaded, universe, tier, workers, references, benchmarks, schedule, dir } = inputs;
  const started = Date.now();
  const evaluator = await RobustEvaluator.create(
    loaded,
    study.neighbourWindowLabel(window),
    workers,
    inputs.traceCache
  );
  const blocks = blocksOfLoaded(loaded);
  const store = new WindowStore(evaluator, blocks, tier.discDraws);
  const libraryOf = inputs.library ?? armLibrary;

  if (inputs.pinLibrary ?? true) {
    const vectors = (await libraryOf('unseeded')).vectors;

    await evaluator.ensureTraces(
      universe.flatMap((symbol) =>
        vectors.map((vector) => ({ book: { symbol, vector }, costBps: study.principalCostBps }))
      ),
      true
    );
  }

  const arms: Record<
    string,
    {
      log: string;
      logSha256: string;
      entries: number;
      coveragePass: boolean;
      coverageFailures: number;
      summarySha256: string;
      resumed?: boolean;
    }
  > = {};

  for (const arm of inputs.arms ?? armsOf(window)) {
    const armClass = armClassOf(window, arm);
    const { start } = armSpecs[arm];
    const library = await libraryOf(start);
    const space = new GenomeSpace(universe, new Library(library.vectors));
    const logFile = `${dir}/${arm}/archive.jsonl`;
    const armFile = `${dir}/${arm}/search.json`;

    // §20 resume: an arm completed by an interrupted run (its record verifies its own log) is kept — arms are independent
    // because every evaluation is a pure function of (window, configuration, stage); an incomplete arm is moved aside.
    if (await fs.pathExists(armFile)) {
      const done = await readJson<{
        logSha256?: string;
        evaluations: number;
        coverage: { pass: boolean; failures: unknown[] };
      }>(armFile);

      if (done.logSha256 && (await fs.pathExists(logFile)) && (await sha256File(logFile)) === done.logSha256) {
        arms[arm] = {
          log: logFile,
          logSha256: done.logSha256,
          entries: done.evaluations,
          coveragePass: done.coverage.pass,
          coverageFailures: done.coverage.failures.length,
          summarySha256: await sha256File(armFile),
          resumed: true
        };
        log(`${window} ${arm}: kept the completed arm of an interrupted run (log ${done.logSha256.slice(0, 12)})`);
        continue;
      }
    }

    await moveAsideIfPartial(`${dir}/${arm}`, armFile);

    const archive = new ArmArchive(store, { arm, armClass, window, references }, logFile);
    const summary = await runArmSearch(
      {
        space,
        archive,
        window,
        start,
        armClass,
        stageB: tier.stageB[armClass],
        stageC: tier.stageC[armClass],
        ...(start === 'seeded' ? { benchmarks } : {}),
        onProgress: (line) => log(`${window} ${arm}: ${line} (rss ${memoryGuard(`${window} ${arm}`).toFixed(1)} GB)`),
        ...(inputs.stopAfter !== undefined ? { stopAfter: inputs.stopAfter } : {})
      },
      schedule
    );

    archive.flush();

    const entries = [...archive.entries.values()];
    const coverage = coverageOf(itemsOf(entries), universe, armClass);
    const credible = archive.ranked().filter((entry) => isCredible(entry, armClass));
    const pbo = Object.fromEntries(
      study.assessment.pboBlocks.map((blocksCount) => [
        blocksCount,
        pboOf(
          credible.slice(0, study.assessment.pboTop).map((entry) => entry.c.quarters),
          blocksCount
        )
      ])
    );
    const funnel = Object.fromEntries(
      universe.map((symbol) => {
        const containing = entries.filter((entry) => entry.c.members.includes(symbol));

        return [
          symbol,
          {
            configurations: containing.length,
            feasible: containing.filter((entry) => entry.feasible).length,
            scored: containing.filter((entry) => entry.set !== undefined).length,
            credible: containing.filter((entry) => isCredible(entry, armClass)).length
          }
        ];
      })
    );

    const logSha256 = await sha256File(logFile);

    await writeJson(armFile, {
      generatedAt: nowIso(),
      window,
      arm,
      armClass,
      logSha256,
      library: { vectors: library.vectors.length, sobol: library.sobol.length, controls: library.controls.length },
      budgets: { stageA: schedule.configs.length, stageB: tier.stageB[armClass], stageC: tier.stageC[armClass] },
      summary,
      evaluations: archive.size,
      hits: archive.hits,
      feasible: entries.filter((entry) => entry.feasible).length,
      credible: credible.length,
      coverage,
      funnel,
      pbo,
      rss: memoryGuard(`${window} ${arm}`)
    });
    arms[arm] = {
      log: logFile,
      logSha256,
      entries: archive.size,
      coveragePass: coverage.pass,
      coverageFailures: coverage.failures.length,
      summarySha256: await sha256File(armFile)
    };
    log(
      `${window} ${arm}: ${archive.size} configurations, coverage ${coverage.pass ? 'met' : `FAILED (${coverage.failures.length})`}, ${credible.length} credible`
    );
  }

  await evaluator.close();

  return {
    window,
    tier: tier.key,
    workers,
    schedule: { sha256: schedule.sha256, configurations: schedule.configs.length },
    door: doorRecordOf('trainingUniverse', loaded, window),
    blocks,
    arms,
    store: { size: store.size, evaluations: store.evaluations },
    cache: evaluator.cacheStats(),
    seconds: (Date.now() - started) / 1000,
    machine: { cpus: os.cpus().length, node: process.version }
  };
};

export const runSearch = async (
  window: WindowKey,
  options: { stopAfter?: number; logRoot?: string; arms?: ArmKey[]; workers?: number } = {}
) => {
  await requireFrozen();
  await requireReproduced();
  await requireParity();

  const dir = options.logRoot ?? roundDir(window);
  const manifestFile = options.logRoot ? `${dir}/search.json` : searchManifestFile(window);

  if (!options.logRoot && (await fs.pathExists(manifestFile))) {
    throw new Error(`${manifestFile} exists: the ${window} search runs once`);
  }

  const calibration = await readCalibration(window);
  const { tier, workers, traceCache } = await readTier();
  const universe = await eligibleSymbols();
  const loaded = await trainingUniverse(window, { symbols: universe });
  const schedule = buildSchedule(universe, sobolLibrary().vectors);
  const frozenSchedule = await readJson<{ sha256: string }>(scheduleFile);

  if (schedule.sha256 !== frozenSchedule.sha256) {
    throw new Error(
      `The rebuilt schedule ${schedule.sha256.slice(0, 12)} differs from the frozen ${frozenSchedule.sha256.slice(0, 12)}`
    );
  }

  const body = {
    ...(await searchCore({
      window,
      loaded,
      universe,
      tier,
      workers: options.workers ?? workers,
      references: calibration.references,
      benchmarks: await searchBenchmarkBooks(),
      schedule,
      dir,
      traceCache,
      ...(options.arms ? { arms: options.arms } : {}),
      ...(options.stopAfter !== undefined ? { stopAfter: options.stopAfter } : {})
    })),
    generatedAt: nowIso(),
    provenance: await provenance(),
    calibration: calibration.bodyHash
  };

  if (options.logRoot) {
    await writeJson(manifestFile, body);

    return body;
  }

  return writeSealed(manifestFile, body);
};

// ----- the selection -----

const stubStore = (blocks: ReturnType<typeof blocksOfLoaded>) => ({
  blocks,
  discDraws: 0,
  evaluations: { centres: 0, neighbourhoods: 0 },
  evaluate: async () => {
    throw new Error('A reloaded archive never evaluates');
  }
});

export const loadArchive = async (
  window: WindowKey,
  arm: ArmKey,
  file: string,
  expectedSha: string,
  references: RiskReferences,
  blocks: ReturnType<typeof blocksOfLoaded>
) => {
  if ((await sha256File(file)) !== expectedSha) {
    throw new Error(`${file} does not hash to the search manifest`);
  }

  const archive = new ArmArchive(stubStore(blocks), { arm, armClass: armClassOf(window, arm), window, references });

  // streamed line by line (a final-arm log can approach V8's string limit)
  const lines = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });

  for await (const line of lines) {
    if (line) {
      const entry = parseEntry(line);

      archive.entries.set(entry.key, entry);
    }
  }

  return archive;
};

export interface ArmSelection {
  arm: ArmKey;
  promotion: PromotionRecord;
  refined: { family: string; slot: string; stoppedBy: string; result: string }[];
  rows: Ranked[];
}

const centreMarginalsQ = async (evaluator: RobustEvaluator, books: Book[], net: number) => {
  const members = books.map((book) => book.symbol).sort();
  const without = members.map((symbol) => books.filter((book) => book.symbol !== symbol));
  const nonEmpty = without.filter((list) => list.length > 0);
  const centres = nonEmpty.length > 0 ? await evaluator.centres(nonEmpty, study.principalCostBps) : [];
  let cursor = 0;

  return Object.fromEntries(
    members.map((symbol, i) => [
      symbol,
      qOf(net, books.length) - (without[i]!.length === 0 ? 0 : qOf(centres[cursor++]!.net, books.length - 1))
    ])
  );
};

const summaryOfRow = (row: Ranked) => ({
  key: row.assessment.key,
  label: row.assessment.label,
  arm: row.arm,
  members: row.assessment.members,
  books: row.assessment.books,
  value: row.value,
  pass: row.pass,
  failed: row.gates.filter((gate) => !gate.pass).map((gate) => gate.gate),
  labels: row.assessment.labels
});

export interface SelectInputs {
  window: WindowKey;
  loaded: LoadedUniverse;
  universe: string[];
  tier: Tier;
  workers: number;
  references: RiskReferences;
  benchmarks: Benchmarks;
  arms: Record<string, { log: string; logSha256: string; coveragePass: boolean }>;
  dir: string;
  capacity?: AssessContext['capacity'];
  inspectedGrids?: Set<string>;
  inspectedReferences?: AssessContext['inspectedReferences'];
  library?: (start: StartLabel) => Promise<ArmLibrary>;
  traceCache?: number;
}

export const selectCore = async (inputs: SelectInputs) => {
  const { window, loaded, universe, tier, workers, references, benchmarks, arms, dir } = inputs;
  const started = Date.now();
  const evaluator = await RobustEvaluator.create(
    loaded,
    study.neighbourWindowLabel(window),
    workers,
    inputs.traceCache
  );
  const blocks = blocksOfLoaded(loaded);
  const fold = window !== 'final';
  const libraryOf = inputs.library ?? armLibrary;
  const ctx: AssessContext = {
    evaluator,
    window,
    confirmDraws: tier.confirmDraws,
    references,
    blocks,
    benchmarks,
    universe,
    searchEnd: study.windows[window].searchEnd,
    ...(inputs.capacity ? { capacity: inputs.capacity } : {}),
    ...(inputs.inspectedGrids ? { inspectedGrids: inputs.inspectedGrids } : {}),
    ...(inputs.inspectedReferences ? { inspectedReferences: inputs.inspectedReferences } : {})
  };
  const benchmarkAssessments = {} as Record<'B1' | 'B4' | 'B5', Assessment>;

  for (const key of ['B1', 'B4', 'B5'] as const) {
    benchmarkAssessments[key] = await assessConfig(ctx, benchmarks[key], key, 'benchmark', 'benchmark');
  }

  const ladder = await ladderOf(ctx);
  const selections: ArmSelection[] = [];

  for (const arm of Object.keys(arms) as ArmKey[]) {
    const armClass = armClassOf(window, arm);
    const score = armSpecs[arm].score;
    const archive = await loadArchive(window, arm, arms[arm]!.log, arms[arm]!.logSha256, references, blocks);
    const spec = { arm, armClass, draws: tier.promoDraws, membersPerFamily: tier.promoMembers, references, blocks };
    const promotion = await promoteArm(archive, spec, (entries) => reevaluate(evaluator, entries, spec));

    await writeJson(`${dir}/${arm}/promotion.json`, { generatedAt: nowIso(), ...promotion });
    log(
      `${window} ${arm}: ${promotion.credible} credible, ${promotion.families.length} families, ${promotion.promoted.length} promoted`
    );

    const library = await libraryOf(armSpecs[arm].start);
    const rows: Ranked[] = [];
    const refined: ArmSelection['refined'] = [];

    for (const [index, family] of promotion.promoted.entries()) {
      const label = `${arm}-f${index + 1}`;
      const result = await refineFamily(evaluator, family.representative.books, {
        arm,
        window,
        family: label,
        draws: tier.refineDraws,
        pruneDraws: tier.pruneDraws,
        references,
        blocks,
        cap: tier.refineCap[armClass],
        library: new Library(library.vectors),
        universe
      });

      await writeJson(`${dir}/${arm}/refine-f${index + 1}.json`, {
        generatedAt: nowIso(),
        slot: family.slot,
        familyIndex: family.family,
        ...result,
        resultState: result.resultState
          ? { key: result.resultState.key, books: result.resultState.books, value: result.resultState.value }
          : null,
        startState: { key: result.startState.key, value: result.startState.value },
        refinedState: { key: result.refinedState.key, value: result.refinedState.value }
      });
      // A family that converged to an earlier family's final configuration is recorded and not assessed twice.
      const duplicate = result.resultState
        ? rows.find((row) => row.assessment.key === result.resultState!.key)
        : undefined;

      refined.push({
        family: label,
        slot: family.slot,
        stoppedBy: duplicate
          ? `converged to the same configuration as ${duplicate.assessment.label}`
          : result.stoppedBy,
        result: result.result
      });

      if (!result.resultState || duplicate) {
        continue;
      }

      const assessment = await assessConfig(ctx, result.resultState.books, label, 'finalist', arm);

      attachComparisons(ctx, assessment, { B4: benchmarkAssessments.B4, B5: benchmarkAssessments.B5 }, ladder);

      const five = assessment.centre[study.principalCostBps]!;
      const gates =
        score === 'Q'
          ? centreGatesOf(assessment, universe, await centreMarginalsQ(evaluator, result.resultState.books, five.net))
          : gatesOf(assessment, universe, score, fold);

      rows.push({
        assessment,
        arm,
        gates,
        pass: gates.every((gate) => gate.pass),
        value: score === 'Q' ? qOf(five.net, assessment.members.length) : procedureValue(assessment, score)
      });
    }

    await writeJson(`${dir}/${arm}/assessment.json`, {
      generatedAt: nowIso(),
      arm,
      finalists: rows.map((row) => ({ ...row.assessment, gates: row.gates, pass: row.pass, value: row.value }))
    });
    selections.push({ arm, promotion, refined, rows });
    memoryGuard(`${window} ${arm} selection`);
  }

  await writeJson(`${dir}/benchmarks.json`, { generatedAt: nowIso(), benchmarks: benchmarkAssessments, ladder });

  const byArm = Object.fromEntries(selections.map((selection) => [selection.arm, selection]));
  const runnerUp = (order: Ranked[], procedure: Procedure) => {
    const passing = order.filter((row) => row.pass);

    return passing.length >= 2
      ? scoreDifferenceInterval(procedure, passing[0]!.assessment, passing[1]!.assessment, references, window)
      : undefined;
  };
  // §14.4, in this order: (c) a pick exists; else (a) fewer than 3 credible families; else (b) economics.
  const categoryOf = (arm: ArmKey) => {
    const selection = byArm[arm]!;

    if (selection.rows.some((row) => row.pass)) {
      return { category: 'c', reason: 'pick' };
    }

    if (selection.promotion.families.length < study.searchFamiliesMinimum) {
      return {
        category: 'a',
        reason: `${selection.promotion.families.length} credible families (< ${study.searchFamiliesMinimum})`,
        coverageMet: arms[arm]!.coveragePass
      };
    }

    const failed = selection.rows
      .map(
        (row) =>
          `${row.assessment.label} failed ${row.gates
            .filter((gate) => !gate.pass)
            .map((gate) => gate.gate)
            .join('/')}`
      )
      .join('; ');

    return {
      category: 'b',
      reason:
        selection.promotion.promoted.length === 0
          ? 'no family passed promotion feasibility (F1 at 5/10 bps and F-P)'
          : selection.rows.length === 0
            ? `no promoted family survived refinement and pruning (${selection.refined.map((item) => `${item.family}: ${item.stoppedBy || 'converged'}`).join('; ')})`
            : `no finalist passed the gates: ${failed}`
    };
  };
  const pickOf = (arm: ArmKey, procedure: Procedure | 'Q') => {
    const order = rankRows(byArm[arm]!.rows, procedure);
    const nominees = pick(order, 'fold');
    const primary = nominees.find((nominee) => nominee.role === 'primary');

    return {
      arm,
      procedure,
      ...categoryOf(arm),
      order: order.map(summaryOfRow),
      primary: primary ? summaryOfRow(primary.row) : null,
      alternates: nominees
        .filter((nominee) => nominee.role !== 'primary')
        .map((nominee) => ({ role: nominee.role, ...summaryOfRow(nominee.row) })),
      runnerUp: procedure === 'Q' ? undefined : runnerUp(order, procedure)
    };
  };
  const common = {
    window,
    coverage: Object.fromEntries(Object.entries(arms).map(([arm, item]) => [arm, item.coveragePass])),
    finalists: selections.flatMap((selection) => selection.rows.map(summaryOfRow)),
    refinements: Object.fromEntries(selections.map((selection) => [selection.arm, selection.refined])),
    benchmarks: Object.fromEntries(
      (['B1', 'B4', 'B5'] as const).map((key) => [
        key,
        { key: benchmarkAssessments[key].key, books: benchmarkAssessments[key].books }
      ])
    ),
    seconds: (Date.now() - started) / 1000,
    cache: evaluator.cacheStats()
  };

  await evaluator.close();

  if (fold) {
    return {
      ...common,
      picks: { J: pickOf('J-u', 'J'), T: pickOf('T-u', 'T'), ...(byArm['Q-u'] ? { Q: pickOf('Q-u', 'Q') } : {}) }
    };
  }

  // Final round: both procedures' rankings over both of their arms; nominations are decided at the selection freeze.
  const procedures = Object.fromEntries(
    (['J', 'T'] as const).map((procedure) => {
      const rows = [...(byArm[`${procedure}-u`]?.rows ?? []), ...(byArm[`${procedure}-s`]?.rows ?? [])];
      const order = rankRows(rows, procedure);

      return [
        procedure,
        {
          order: order.map(summaryOfRow),
          wouldNominate: pick(order, 'final').map((nominee) => ({
            role: nominee.role,
            note: nominee.note ?? '',
            ...summaryOfRow(nominee.row)
          })),
          runnerUp: runnerUp(order, procedure)
        }
      ];
    })
  );

  return { ...common, procedures };
};

export const runSelect = async (window: WindowKey) => {
  await requireFrozen();

  const manifest = await readSealed(searchManifestFile(window));
  const outFile = window === 'final' ? selectionFile(window) : picksFile(window);

  if (await fs.pathExists(outFile)) {
    throw new Error(`${outFile} exists: the ${window} selection runs once`);
  }

  await moveAsideIfPartial(selectDir(window), outFile);

  const calibration = await readCalibration(window);
  const { tier, workers, traceCache } = await readTier();
  const universe = await eligibleSymbols();
  const body = {
    ...(await selectCore({
      window,
      loaded: await trainingUniverse(window, { symbols: universe }),
      universe,
      tier,
      workers,
      references: calibration.references,
      benchmarks: await searchBenchmarkBooks(),
      arms: manifest.arms as SelectInputs['arms'],
      dir: selectDir(window),
      traceCache
    })),
    generatedAt: nowIso(),
    provenance: await provenance(),
    searchManifest: manifest.bodyHash,
    calibration: calibration.bodyHash
  };

  if (window !== 'final') {
    const record = await writeSealed(outFile, body);

    log(`${window}: PICKS.json sealed ${record.bodyHash.slice(0, 12)}`);

    return record;
  }

  const record = await writeSealed(outFile, body);

  log(`final: selection candidates sealed ${record.bodyHash.slice(0, 12)}`);

  return record;
};
