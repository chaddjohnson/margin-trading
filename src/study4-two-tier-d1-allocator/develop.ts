// The development stage of one window (PROTOCOL.md §4, §7, §8, §10.5–10.6): open the window's door (development end
// only), write the window SPEC (σ, bands, B5's development run), then 4A → 4B → 4C → the six 4D searches, each sealed
// write-once (a sealed stage is never rerun; an interrupted window resumes at its first unsealed stage from the sealed
// records), and finally the window's SELECTION: every pick with its exact genome, the secondary picks, each island's
// pick, the selection-skill sets and the random-champion null picks. Nothing here can read an evaluation year.
import path from 'node:path';
import fs from 'fs-extra';
import { type Policy, policyOf } from './allocator.ts';
import { type BookSpec, loadB5 } from './books.ts';
import { type WindowKey, files, resultFile, study } from './context.ts';
import { openDoor } from './doors.ts';
import { type Context, type ExperimentClass, makeContext, windowSpecOf } from './evaluate.ts';
import { type Discovery, run4A, run4B, run4C } from './phases.ts';
import { WorkerRunner } from './pool.ts';
import {
  assertNode,
  assertRealRoot,
  assertScope,
  codeFreezeBody,
  nowIso,
  protocolFreezeBody,
  readSealed,
  sha256File,
  verifySealed,
  writeArchive,
  writeSealed
} from './records.ts';
import { type LibraryMember, type Scored, experimentClass, makeSpace, runSearch } from './search4d.ts';
import { type Selection, describeGenome, selectFrom } from './selection.ts';
import { type Experiment, type Genome, rngOf } from './space.ts';
import { baseSettings } from './trace.ts';

export const experiments: Experiment[] = ['4D-A', '4D-A0P', '4D-B', '4D-B0', '4D-C', '4D-C0'];

const stageFile = (window: WindowKey, stage: string) => resultFile(window, stage, 'RECORD.json');
const archiveFile = (window: WindowKey, stage: string) => resultFile('archive', window, `${stage}.jsonl.gz`);

export const compactScored = (item: Scored) => ({
  ...describeGenome(item.genome),
  evaluation: item.evaluation,
  island: item.island,
  stage: item.stage
});

const selectionSummary = (selection: Selection) => ({
  label: selection.label,
  cls: selection.cls,
  evaluated: selection.evaluated,
  feasible: selection.feasible,
  perturbationEvaluations: selection.perturbationEvaluations,
  noFill: selection.noFill,
  pick: selection.pick
    ? {
        ...describeGenome(selection.pick.genome),
        evaluation: selection.pick.evaluation,
        perturbations: selection.pick.perturbations
      }
    : null,
  sRaw: selection.sRaw ? compactScored(selection.sRaw) : null,
  sRisk: selection.sRisk ? compactScored(selection.sRisk) : null,
  candidates: selection.candidates.map((c) => ({
    ...describeGenome(c.genome),
    evaluation: c.evaluation,
    perturbations: { ...c.perturbations, deltas: undefined }
  }))
});

const genomeOfDescription = (d: ReturnType<typeof describeGenome>): Genome => ({
  deep: d.deep.map(
    (book) =>
      ({
        id: book.id,
        symbol: book.symbol,
        tier: 'deep',
        grid: book.grid,
        origin: book.origin,
        ...(book.deepMode ? { deepMode: book.deepMode } : {})
      }) as BookSpec
  ),
  shallow: d.shallow.map(
    (book) => ({ id: book.id, symbol: book.symbol, tier: 'shallow', grid: book.grid, origin: book.origin }) as BookSpec
  ),
  policy: d.policy as Policy
});

// The random-champion null (PROTOCOL.md §10.6): 100 one-tenth subsamples of the evaluated configurations, each with the
// selection rule scaled to the subsample (top 5 structurally distinct × 24 perturbations).
const nullPicks = async (
  ctx: Context,
  runner: WorkerRunner,
  items: Scored[],
  cls: ExperimentClass,
  label: string,
  replicates = 100
) => {
  const picks: (ReturnType<typeof describeGenome> | null)[] = [];

  for (let r = 0; r < replicates; r++) {
    const rng = rngOf('null', label, r);
    const subsample = items.filter(() => rng.next() < 0.1);
    const selection = await selectFrom(ctx, runner, subsample, cls, `${label}:null:${r}`, {
      top: 5,
      perturbations: 24
    });

    picks.push(selection.pick ? describeGenome(selection.pick.genome) : null);
  }

  return picks;
};

// Selection skill (PROTOCOL.md §10.6): the 100 best development configurations and 100 random initial-design ones.
const skillSets = (items: Scored[], label: string) => {
  const rng = rngOf('skill', label);
  const best = [...items]
    .filter((item) => item.evaluation.feasible)
    .sort((a, b) => b.evaluation.delta - a.evaluation.delta)
    .slice(0, 100)
    .map((item) => ({ ...describeGenome(item.genome), delta: item.evaluation.delta }));
  const initial = items.filter((item) => item.stage === 'initial');
  const random: (ReturnType<typeof describeGenome> & { delta: number })[] = [];

  for (let i = 0; i < 100 && initial.length > 0; i++) {
    const item = initial[rng.int(initial.length)]!;

    random.push({ ...describeGenome(item.genome), delta: item.evaluation.delta });
  }

  return { best, random };
};

export const runDevelopment = async (
  window: WindowKey,
  options: { workers?: number; log?: (line: string) => void } = {}
) => {
  const log = options.log ?? ((line: string) => console.log(`${nowIso()} ${line}`));

  assertNode();
  assertRealRoot();

  const scope = assertScope();
  const protocolBody = protocolFreezeBody();
  const codeBody = codeFreezeBody();
  const guard = { protocolBody, codeBody, head: scope.head, branch: scope.branch, node: process.version };
  const selectionFileOf = resultFile('selections', window, 'SELECTION.json');

  if (fs.existsSync(selectionFileOf)) {
    throw new Error(`refused: ${selectionFileOf} is sealed; the ${window} development stage is complete`);
  }

  const door = await openDoor({ purpose: 'development', window, symbols: study.universe });
  const b5 = await loadB5();
  const spec = windowSpecOf(window, door.datasets, door.symbols, b5.books, door.armStart);
  const settings = baseSettings();
  const ctx = makeContext(spec, door.datasets, settings);
  const doorLog = sha256File(resultFile('doors.jsonl'));

  log(
    `${window}: door ${door.end}, ${door.symbols.length} symbols, ${door.sessionCount} sessions, arming index ${door.armStart}; B5 development net ${ctx.b5Result.net.toFixed(2)}, minute DD ${ctx.b5Result.minuteDrawdown.maximum.toFixed(2)}`
  );

  const specFile = stageFile(window, 'SPEC');

  if (!fs.existsSync(specFile)) {
    writeSealed(specFile, {
      stage: 'SPEC',
      window,
      guard,
      door: {
        end: door.end,
        sessions: door.sessionCount,
        armStart: door.armStart,
        records: door.records,
        doorLogSha256: doorLog
      },
      b5: {
        configFile: b5.configFile,
        frozenCheck: b5.frozenCheck,
        phenotypeFiles: b5.phenotypeFiles,
        books: b5.books
      },
      spec: { ...spec, symbols: spec.symbols },
      b5Development: {
        net: ctx.b5Result.net,
        minuteDrawdown: ctx.b5Result.minuteDrawdown,
        dailyDrawdown: ctx.b5Result.dailyDrawdown,
        lots: ctx.b5Result.lots.length,
        decisions: ctx.b5Result.decisions,
        refused: ctx.b5Result.refused,
        interest: ctx.b5Result.interest,
        yearly: spec.b5Run.yearly
      }
    });
  }

  const runner = new WorkerRunner(spec, door.datasets, settings, options.workers);

  await runner.ready;
  log(`${window}: ${runner.description} ready`);

  try {
    // ----- 4A -----
    const fileA = stageFile(window, '4A');
    let library: LibraryMember[];

    if (!fs.existsSync(fileA)) {
      const started = nowIso();
      const discovery: Discovery = await run4A(ctx, runner, window, log);
      const archive = writeArchive(archiveFile(window, '4A'), discovery.evaluations);

      writeSealed(fileA, {
        stage: '4A',
        window,
        guard,
        startedAt: started,
        finishedAt: nowIso(),
        evaluated: discovery.evaluations.length,
        symbols: discovery.symbols,
        library: discovery.library,
        archive
      });
      library = discovery.library;
    } else {
      library = readSealed<{ library: LibraryMember[] }>(fileA).library;
    }

    // ----- 4B and 4C (4C needs 4B's pick, so they are sealed in order) -----
    const fileB = stageFile(window, '4B');
    const fileC = stageFile(window, '4C');

    if (!fs.existsSync(fileB) || !fs.existsSync(fileC)) {
      const started = nowIso();
      const discoveryLite: Discovery = { symbols: [], library, evaluations: [] };
      const integration = await run4B(ctx, runner, window, discoveryLite, log);

      if (!fs.existsSync(fileB)) {
        writeSealed(fileB, {
          stage: '4B',
          window,
          guard,
          startedAt: started,
          finishedAt: nowIso(),
          configurations: integration.all.map(compactScored),
          greedy: integration.greedy.map((g) => ({
            variant: g.variant,
            rounds: g.rounds.map((r) => r.evaluation.key)
          })),
          sa: compactScored(integration.sa),
          selection: selectionSummary(integration.selection),
          skill: skillSets(integration.all, `4B:${window}`),
          nullPicks: await nullPicks(ctx, runner, integration.all, 'frozenB5', `4B:${window}`)
        });
      }

      const startedC = nowIso();
      const preemption = await run4C(ctx, runner, window, integration, log);

      writeSealed(fileC, {
        stage: '4C',
        window,
        guard,
        startedAt: startedC,
        finishedAt: nowIso(),
        sets: preemption.sets.map((set) => ({
          label: set.label,
          gate: set.gate,
          lambda: set.lambda,
          shallow: set.shallow.map((b) => b.id)
        })),
        runs: preemption.runs.map(compactScored),
        selection: selectionSummary(preemption.selection),
        skill: skillSets(preemption.runs, `4C:${window}`),
        nullPicks: await nullPicks(ctx, runner, preemption.runs, 'frozenB5', `4C:${window}`)
      });
    }

    // ----- 4D (mandatory: every experiment runs to its floor) -----
    for (const experiment of experiments) {
      const fileD = stageFile(window, experiment);

      if (fs.existsSync(fileD)) {
        continue;
      }

      const started = nowIso();
      const space = makeSpace(experiment, ctx, library);
      const { all, record } = await runSearch(space, runner, window, log);
      const cls = experimentClass(experiment);
      const selection = await selectFrom(ctx, runner, all, cls, `${experiment}:${window}`);
      const islandPicks: (ReturnType<typeof selectionSummary> | null)[] = [];

      for (let island = 0; island < 4; island++) {
        const own = all.filter((item) => item.island === island);
        const islandSelection = await selectFrom(ctx, runner, own, cls, `${experiment}:${window}:island${island}`);

        islandPicks.push(selectionSummary(islandSelection));
      }

      const archive = writeArchive(
        archiveFile(window, experiment),
        all.map((item) => ({ key: item.evaluation.key, island: item.island, stage: item.stage, e: item.evaluation }))
      );
      const top = [...all]
        .sort(
          (a, b) =>
            (b.evaluation.feasible ? b.evaluation.delta : -1e12 - b.evaluation.violation) -
            (a.evaluation.feasible ? a.evaluation.delta : -1e12 - a.evaluation.violation)
        )
        .slice(0, 200)
        .map(compactScored);
      // the feasible (Δnet ↑, minute DD ↓) front by one sweep (sorted by Δnet descending, keep strictly lower DD)
      const pareto: Scored[] = [];
      let bestDD = Infinity;

      for (const item of all
        .filter((entry) => entry.evaluation.feasible)
        .sort((a, b) => b.evaluation.delta - a.evaluation.delta || a.evaluation.minuteDD - b.evaluation.minuteDD)) {
        if (item.evaluation.minuteDD < bestDD) {
          pareto.push(item);
          bestDD = item.evaluation.minuteDD;
        }
      }

      writeSealed(fileD, {
        stage: experiment,
        window,
        guard,
        startedAt: started,
        finishedAt: nowIso(),
        search: record,
        selection: selectionSummary(selection),
        islandPicks,
        top,
        pareto: pareto.slice(0, 300).map(compactScored),
        skill: skillSets(all, `${experiment}:${window}`),
        nullPicks: await nullPicks(ctx, runner, all, cls, `${experiment}:${window}`),
        archive
      });
      log(
        `${experiment} ${window}: sealed (${record.evaluated} evaluated, ${record.feasible} feasible, pick ${selection.noFill ? 'no-fill' : selection.pick!.key})`
      );
    }
  } finally {
    await runner.close();
  }

  // ----- the window's sealed selection -----
  const picks: Record<string, unknown> = {};

  for (const stage of ['4B', '4C', ...experiments]) {
    const record = readSealed<{ selection: ReturnType<typeof selectionSummary>; bodyHash: string }>(
      stageFile(window, stage)
    );

    picks[stage] = {
      record: path.relative('.', stageFile(window, stage)),
      recordBodyHash: record.bodyHash,
      pick: record.selection.pick,
      noFill: record.selection.noFill,
      sRaw: record.selection.sRaw,
      sRisk: record.selection.sRisk
    };
  }

  const recordB = readSealed<{ sa: ReturnType<typeof compactScored> }>(stageFile(window, '4B'));

  writeSealed(selectionFileOf, {
    stage: 'SELECTION',
    window,
    guard,
    developmentEnd: study.windows[window].developmentEnd,
    specBodyHash: readSealed(stageFile(window, 'SPEC')).bodyHash,
    b5Books: b5.books,
    sa: recordB.sa,
    picks,
    protocolFreeze: files.protocolFreeze,
    codeFreeze: files.codeFreeze
  });
  log(`${window}: SELECTION sealed`);

  return { verified: verifySealed(selectionFileOf) };
};

export { genomeOfDescription, policyOf };
