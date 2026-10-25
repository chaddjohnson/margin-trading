// The training search in one process (PROTOCOL.md §5–§9): Stage L (the library traces, pinned), Stage D (greedy paths
// and islands), Stage R (contenders and joint refinement), Stage S (shortlist, battery, gates, nominations and their
// full-engine confirmation). Training data only, through the optimization door; refused unless the protocol is frozen
// and the parity matrix passed. `determinism` re-runs Stages L and D and compares their logs byte for byte.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { Archive, booksOfEntry } from './archive.ts';
import { searchBenchmarkBooks } from './benchmarks.ts';
import { log, readJson, stageDir, study, writeJson } from './context.ts';
import { coverageOf } from './coverage.ts';
import { trainingUniverse } from './data.ts';
import { runDiscovery } from './discovery.ts';
import { JointEvaluator } from './evaluator.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { Library } from './genome.ts';
import { runLibrary } from './library.ts';
import { lotChanges, refineContender, selectContenders } from './refine.ts';
import { buildShortlist, confirmNominees, rollingOrigin, runShortlist } from './robust.ts';
import { libraryVectors } from './space.ts';

export const requireParityPassed = async () => {
  const file = stageDir('parity', 'parity.json');

  if (!(await fs.pathExists(file)) || !(await readJson<{ passed: boolean }>(file)).passed) {
    throw new Error(`${file} is missing or failed: the replay may not select anything before the parity matrix passes`);
  }
};

const sha256OfFile = async (file: string) =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

const stagesLD = async (logs: { library: string; discovery: string }) => {
  const loaded = await trainingUniverse();
  const evaluator = new JointEvaluator(loaded);
  const { vectors, controls, sobol } = await libraryVectors();
  const libraryRun = runLibrary(evaluator, vectors, logs.library);
  const archive = new Archive(evaluator, logs.discovery);
  const library = new Library(vectors);
  const benchmarks = await searchBenchmarkBooks();
  const ctx = { library, archive, benchmarks };
  const discovery = runDiscovery(ctx);

  return { loaded, evaluator, vectors, controls, sobol, libraryRun, archive, library, benchmarks, ctx, discovery };
};

export const runSearch = async () => {
  await requireProtocolFrozen();
  await requireParityPassed();

  const started = Date.now();
  const { loaded, evaluator, vectors, controls, sobol, libraryRun, archive, benchmarks, ctx, discovery } =
    await stagesLD({
      library: stageDir('library', 'library.jsonl'),
      discovery: stageDir('discovery', 'evaluations.jsonl')
    });

  await writeJson(stageDir('library', 'library.json'), {
    generatedAt: new Date().toISOString(),
    seconds: libraryRun.seconds,
    vectorsPerEtf: vectors.length,
    sobol: {
      requested: study.library.sobolSamples,
      unique: sobol.vectors.length,
      drawn: sobol.drawn,
      seed: sobol.seed
    },
    controls: controls.map((control) => ({
      id: control.id,
      origin: control.origin,
      grid: control.grid,
      ...control.provenance
    })),
    note: 'the single-book figures in library.jsonl are diagnostics only; no stage reads them',
    coverage: libraryRun.coverage,
    cache: evaluator.cacheStats()
  });

  const discoveryEntries = [...archive.entries.values()];

  await writeJson(stageDir('discovery', 'discovery.json'), {
    generatedAt: new Date().toISOString(),
    ...discovery,
    evaluations: discoveryEntries.length,
    cacheHits: archive.hits,
    coverage: coverageOf(discoveryEntries),
    cache: evaluator.cacheStats()
  });
  log(`discovery: ${discoveryEntries.length} unique evaluations in ${discovery.seconds.toFixed(0)} s`);

  // Stage R.
  archive.setLog(stageDir('refine', 'evaluations.jsonl'));

  const contenders = selectContenders(discoveryEntries);
  const refined = contenders.map((contender) => refineContender(ctx, contender));
  const refineRecord = refined.map((run) => ({
    ...run,
    lotChanges: lotChanges(evaluator, booksOfEntry(archive.get(run.start)!), booksOfEntry(archive.get(run.result)!))
  }));

  await writeJson(stageDir('refine', 'refine.json'), {
    generatedAt: new Date().toISOString(),
    contenders: contenders.map((item) => ({ slot: item.slot, rule: item.rule, key: item.entry.key, e: item.entry.e })),
    runs: refineRecord,
    evaluations: archive.size - discoveryEntries.length
  });

  // Stage S.
  const entries = [...archive.entries.values()];
  const shortlist = buildShortlist(entries, refined, (key) => archive.get(key)!);
  const outcome = runShortlist(evaluator, loaded, shortlist, benchmarks);
  const nomineeBooks = outcome.nominees.map((nominee) => ({
    role: nominee.role,
    books: nominee.item.battery.books.map((book) => ({
      symbol: book.symbol,
      vector: { id: book.id, grid: book.grid, origin: 'nominee' }
    }))
  }));
  const confirmations = confirmNominees(evaluator, loaded, nomineeBooks);
  const rolling = rollingOrigin(entries);
  const coverage = coverageOf(
    entries,
    outcome.batteries
      .filter((battery) => battery.kind !== 'benchmark')
      .map((battery) => battery.books.map((book) => book.symbol)),
    nomineeBooks.map((nominee) => nominee.books.map((book) => book.symbol))
  );

  await writeJson(stageDir('robust', 'robust.json'), {
    generatedAt: new Date().toISOString(),
    shortlist: shortlist.map((item) => ({ key: item.entry.key, kind: item.kind, label: item.label })),
    ladder: outcome.ladder,
    gated: outcome.gated,
    passing: outcome.passing.map((item) => item.battery.key),
    nominees: outcome.nominees.map((nominee) => ({
      role: nominee.role,
      rule: nominee.rule,
      key: nominee.item.battery.key,
      label: nominee.item.battery.label,
      score: nominee.item.outcome.score
    })),
    confirmations,
    rollingOrigin: rolling,
    coverage,
    totals: {
      evaluations: entries.length,
      discovery: discoveryEntries.length,
      refinement: entries.length - discoveryEntries.length,
      archiveHits: archive.hits,
      cache: evaluator.cacheStats(),
      seconds: (Date.now() - started) / 1000
    }
  });

  for (const nominee of outcome.nominees) {
    log(`nominee ${nominee.role}: ${nominee.item.battery.key}`);
  }

  if (outcome.nominees.length === 0) {
    log('no shortlisted configuration passed every training gate: the no-advancement outcome');
  }

  const unchanged = confirmations.every((confirmation) =>
    Object.values(confirmation.runs).every((run) => (run.parityDifferences ?? 0) === 0)
  );

  if (!unchanged) {
    throw new Error('A nominee differs between the replay and the full engine (E4)');
  }

  log(`search done in ${((Date.now() - started) / 1000).toFixed(0)} s`);
};

export const runDeterminism = async () => {
  await requireProtocolFrozen();
  await requireParityPassed();

  const logs = {
    library: stageDir('determinism', 'library.jsonl'),
    discovery: stageDir('determinism', 'evaluations.jsonl')
  };

  await stagesLD(logs);

  const pairs = {
    library: [stageDir('library', 'library.jsonl'), logs.library],
    discovery: [stageDir('discovery', 'evaluations.jsonl'), logs.discovery]
  } as const;
  const record: Record<string, unknown> = { generatedAt: new Date().toISOString() };
  let identical = true;

  for (const [name, [original, rerun]] of Object.entries(pairs)) {
    const a = await sha256OfFile(original);
    const b = await sha256OfFile(rerun);

    record[name] = { original: a, rerun: b, identical: a === b };
    identical &&= a === b;
  }

  record.identical = identical;
  await writeJson(stageDir('determinism', 'determinism.json'), record);
  await fs.remove(logs.library);
  await fs.remove(logs.discovery);
  log(`determinism: ${identical ? 'identical' : 'DIFFERENT'}`);

  if (!identical) {
    throw new Error('The re-run of Stages L and D differs from the original');
  }
};
