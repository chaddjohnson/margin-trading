// Stage 3–4 execution (PROTOCOL.md §6–§8): every frozen run not yet stored, resumable mid-stage (a run is appended as
// it completes and skipped on a rerun while its specification hash matches). Refuses unless the protocol freeze
// verifies. The outcome-blind benchmark (before the freeze) times incumbent runs only and stores timings, never a
// figure.
import path from 'node:path';
import fs from 'fs-extra';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import {
  type FoldKey,
  base,
  candidateCutoff,
  foldKeys,
  incumbentGrid,
  incumbentPhenotypeFile,
  log,
  nowIso,
  poolMembers,
  protocolFreezeFile,
  readJson,
  resultDir,
  sha256Of,
  shortlistFile,
  sourceResults,
  sourceStandaloneRoot,
  windows
} from './context.ts';
import { candidateUniverse, foldUniverse } from './data.ts';
import { requireFrozen } from './freeze.ts';
import type { Grid } from './inventory.ts';
import { loadPoolBooks } from './parity.ts';
import { LocalRunner, type Runner, WorkerRunner, defaultWorkerCount } from './pool.ts';
import type { Family, Spec } from './run.ts';
import {
  type Phenotype,
  assertUniqueKeys,
  atCost,
  gridKeyOf,
  incumbentSpecs,
  phenotypeSpecs,
  specHashOf,
  specOf,
  vgtPrimary
} from './specs.ts';
import { appendRun, readFamily, toStored } from './store.ts';
import { readSealed } from '../d1-ranked-preemption/freeze.ts';
import { storedChecks } from './parity.ts';
import type { StoredMetrics } from './inventory.ts';

export const procedureMatchedId = 'VGT:research-representative';
export const controlIds: readonly string[] = [procedureMatchedId, 'VGT-primary'];

// The shortlisted research phenotypes (SHORTLIST.json) and VGT primary, each verified against its file.
export const loadPhenotypes = async (): Promise<Phenotype[]> => {
  const shortlist = await readJson<{
    phenotypes: { id: string; symbol: string; role: string; candidateId: string; file: string; sha256: string }[];
  }>(shortlistFile);
  const phenotypes: Phenotype[] = [];

  for (const entry of shortlist.phenotypes) {
    if ((await sha256Of(entry.file)) !== entry.sha256) {
      throw new Error(`${entry.file} does not hash to the shortlist's ${entry.sha256.slice(0, 12)}`);
    }

    const file = await readJson<{ grid: Grid; window: string; training: { searchEnd: string } }>(entry.file);

    if (file.window !== 'final' || file.training.searchEnd !== candidateCutoff) {
      throw new Error(`${entry.id}: not a final-window phenotype (searchEnd ${file.training.searchEnd})`);
    }

    phenotypes.push({
      id: entry.id,
      symbol: entry.symbol,
      role: entry.role,
      window: 'final',
      candidateId: entry.candidateId,
      grid: Object.fromEntries(d1Keys.map((key) => [key, file.grid[key]])) as Grid,
      file: entry.file,
      sha256: entry.sha256,
      researchOnly: true
    });
  }

  // VGT primary: the registry's parameters must equal the frozen grid (tenths of a point, days, sessions).
  const registered = await readJson<{ phenotypes: { primary: { parameters: Record<string, string | number> } } }>(
    incumbentPhenotypeFile
  );
  const fromRegistry = Object.fromEntries(
    d1Keys.map((key) => {
      const value = registered.phenotypes.primary.parameters[key]!;

      return [key, typeof value === 'string' ? Math.round(Number.parseFloat(value) * 10) : value];
    })
  ) as Grid;

  if (gridKeyOf(fromRegistry) !== gridKeyOf({ ...incumbentGrid })) {
    throw new Error(`${incumbentPhenotypeFile} primary differs from the frozen VGT primary grid`);
  }

  // The procedure-matched control (PROTOCOL.md §2): VGT's own final-window research representative, chosen by the
  // same source procedure on the same window. Research-only, never a candidate.
  const vgtProfile = await readJson<{
    representative: { candidateId: string; phenotypeFile: string; phenotypeSha256: string };
  }>(path.join(sourceStandaloneRoot, 'final', 'VGT.json'));

  if ((await sha256Of(vgtProfile.representative.phenotypeFile)) !== vgtProfile.representative.phenotypeSha256) {
    throw new Error('the VGT final representative file does not hash as its profile records');
  }

  const vgtResearch = await readJson<{ grid: Grid }>(vgtProfile.representative.phenotypeFile);

  return [
    ...phenotypes,
    {
      id: procedureMatchedId,
      symbol: 'VGT',
      role: 'procedure-matched control',
      window: 'final',
      candidateId: vgtProfile.representative.candidateId,
      grid: Object.fromEntries(d1Keys.map((key) => [key, vgtResearch.grid[key]])) as Grid,
      file: vgtProfile.representative.phenotypeFile,
      sha256: vgtProfile.representative.phenotypeSha256,
      researchOnly: true
    },
    { ...vgtPrimary, sha256: await sha256Of(incumbentPhenotypeFile) }
  ];
};

export const stageCSymbols = (phenotypes: readonly Phenotype[]) => [
  ...new Set([...poolMembers, ...phenotypes.map((phenotype) => phenotype.symbol)])
];

export const stageCSpecs = async (phenotypes: readonly Phenotype[]) => {
  const pools = await loadPoolBooks();
  const specs = [...phenotypes.flatMap(phenotypeSpecs), ...incumbentSpecs(pools)];

  assertUniqueKeys(specs);

  return specs;
};

// Stage D: every fold representative of the 61 symbols, run once from 2016-01-04 through its fold's validation end
// (the source study's inspection door), at 5 and 10 bps; the windowed figures start at the fold's search-end close.
export const foldSpecs = async (fold: FoldKey) => {
  const universe = await readJson<{ eligible: string[] }>('research/d1-ranked-preemption/results/audit/universe.json');
  const specs: Spec[] = [];

  for (const symbol of [...universe.eligible].sort()) {
    const profile = await readJson<{ representative: { candidateId: string; grid: Grid; credible: boolean } | null }>(
      path.join(sourceStandaloneRoot, fold, `${symbol}.json`)
    );

    if (!profile.representative) {
      continue;
    }

    const spec = specOf({
      key: `fold:${fold}:${symbol}:representative`,
      family: 'fold',
      subject: `${symbol}:${fold}:representative`,
      window: fold,
      mode: 'fixed',
      books: [{ symbol, phenotype: profile.representative.candidateId, grid: profile.representative.grid }],
      boundaryDate: windows[fold].searchEnd,
      meta: { symbol, fold, credible: profile.representative.credible, candidateId: profile.representative.candidateId }
    });

    specs.push({ ...spec, key: `${spec.key}:5bps` }, { ...atCost(spec, 10), family: 'fold' });
  }

  assertUniqueKeys(specs);

  return specs;
};

const execute = async (runner: Runner, specs: readonly Spec[], family: Family) => {
  const stored = await readFamily(family);
  const pending = specs.filter((spec) => {
    const found = stored.get(spec.key);

    return !found || found.specHash !== specHashOf(spec);
  });
  let done = 0;
  const started = Date.now();

  log(
    `${family}: ${specs.length} specified, ${specs.length - pending.length} stored, ${pending.length} to run (${runner.description})`
  );

  await Promise.all(
    pending.map(async (spec) => {
      const record = await runner.run(spec);

      await appendRun(toStored(record, specHashOf(spec)));
      done++;

      if (done % 50 === 0 || done === pending.length) {
        log(`${family}: ${done}/${pending.length} (${((Date.now() - started) / 1000).toFixed(0)} s)`);
      }
    })
  );
};

export const stageCFamilies: readonly Family[] = ['base', 'incumbent', 'cost', 'oat', 'joint'];

// The Stage 3 precondition (PROTOCOL.md §6, review C3): every tested vector's base fixed run reproduces its stored
// record — each research phenotype its source Stage A metrics, VGT primary the sealed same-window control B1 — to the
// cent, before any cost, neighbourhood or analysis output exists. A failure stops the study.
export const baseParityFile = resultDir('parity', 'BASE_PARITY.json');

export const checkBaseParity = async (phenotypes: readonly Phenotype[]) => {
  const base = await readFamily('base');
  const checks: { group: string; name: string; pass: boolean; detail: string }[] = [];

  for (const phenotype of phenotypes) {
    const run = base.get(`base:${phenotype.id}:base:fixed`);

    if (!run) {
      throw new Error(`no stored base run for ${phenotype.id}`);
    }

    if (phenotype.researchOnly) {
      const stored = await readJson<{ metrics: StoredMetrics }>(phenotype.file);

      checks.push(...storedChecks(phenotype.id, run, stored.metrics));
    } else {
      const controls = await readSealed<{
        fixed: Record<string, Record<string, Record<string, number>>>;
        bodyHash: string;
      }>(sourceResults('controls', 'final', 'CONTROLS.json'));
      const b1 = controls.fixed.B1!['5']!;
      const pairs: [string, number, number][] = [
        ['net', run.view.net, b1.net!],
        ['lots', run.view.trades, b1.lots!],
        ['minute drawdown', run.view.minuteDrawdown, b1.minuteDrawdown!],
        ['daily drawdown', run.view.dailyDrawdown, b1.dailyDrawdown!],
        ['interest', run.view.interest, b1.interest!],
        ['friction', run.view.friction, b1.costs!]
      ];

      for (const [name, ours, theirs] of pairs) {
        checks.push({
          group: 'stored',
          name: `VGT-primary ${name} = CONTROLS B1 5 bps`,
          pass: Math.abs(ours - theirs) <= 0.01,
          detail: `${ours} vs ${theirs}`
        });
      }
    }
  }

  const failed = checks.filter((check) => !check.pass);

  await fs.outputFile(
    baseParityFile,
    `${JSON.stringify({ writtenAt: nowIso(), phenotypes: phenotypes.length, checks, passed: checks.length - failed.length, failed: failed.length }, null, 1)}\n`
  );
  log(`base parity: ${checks.length - failed.length}/${checks.length} → ${baseParityFile}`);

  if (failed.length > 0) {
    for (const check of failed) {
      log(`FAIL ${check.name}: ${check.detail}`);
    }

    throw new Error('base-run parity failed: no other Stage 3 family may run (fail closed)');
  }
};

export const requireBaseParity = async () => {
  if (!(await fs.pathExists(baseParityFile))) {
    throw new Error('the base-run parity has not passed yet: run --family base first');
  }

  const record = await readJson<{ failed: number; passed: number }>(baseParityFile);

  if (record.failed !== 0 || record.passed === 0) {
    throw new Error('the base-run parity failed: no other Stage 3 family may run');
  }
};

export const runBatch = async (options: { families?: Family[]; workers?: number; local?: boolean }) => {
  const freeze = await requireFrozen();

  log(`protocol freeze verifies (${Object.keys(freeze.files).length} files, ${freeze.amendments.length} amendments)`);

  const families = options.families ?? [...stageCFamilies, 'fold'];
  const phenotypes = await loadPhenotypes();
  const stageC = families.filter((family) => stageCFamilies.includes(family));

  if (stageC.length > 0) {
    const specs = await stageCSpecs(phenotypes);
    const { universe, door } = await candidateUniverse(stageCSymbols(phenotypes));

    await fs.outputFile(resultDir('runs', 'door-final.json'), `${JSON.stringify(door, null, 1)}\n`);

    const runner = options.local ? new LocalRunner(universe) : new WorkerRunner(universe, options.workers);

    try {
      for (const family of stageC) {
        // The base runs come first; every other Stage 3 family waits for their parity (PROTOCOL.md §6).
        if (family !== 'base') {
          await requireBaseParity();
        }

        await execute(
          runner,
          specs.filter((spec) => spec.family === family),
          family
        );

        if (family === 'base') {
          await checkBaseParity(phenotypes);
        }
      }
    } finally {
      await runner.close();
    }
  }

  if (families.includes('fold')) {
    for (const fold of foldKeys) {
      const specs = await foldSpecs(fold);
      const symbols = [...new Set(specs.map((spec) => spec.books[0]!.symbol))];

      // Batches of 12 symbols bound the memory of one loaded universe.
      for (let start = 0; start < symbols.length; start += 12) {
        const batch = symbols.slice(start, start + 12);
        const { universe, door } = await foldUniverse(fold, batch);

        await fs.outputFile(
          resultDir('runs', `door-${fold}-${String(start / 12 + 1).padStart(2, '0')}.json`),
          `${JSON.stringify(door, null, 1)}\n`
        );

        const runner = options.local ? new LocalRunner(universe) : new WorkerRunner(universe, options.workers);

        try {
          await execute(
            runner,
            specs.filter((spec) => batch.includes(spec.books[0]!.symbol)),
            'fold'
          );
        } finally {
          await runner.close();
        }
      }
    }
  }
};

export const batchStatus = async () => {
  const phenotypes = await loadPhenotypes();
  const specs = [...(await stageCSpecs(phenotypes)), ...(await foldSpecs('fold-a')), ...(await foldSpecs('fold-b'))];
  const rows: { family: string; specified: number; stored: number }[] = [];

  for (const family of [...stageCFamilies, 'fold'] as Family[]) {
    const stored = await readFamily(family);
    const mine = specs.filter((spec) => spec.family === family);

    rows.push({
      family,
      specified: mine.length,
      stored: mine.filter((spec) => stored.get(spec.key)?.specHash === specHashOf(spec)).length
    });
  }

  for (const row of rows) {
    log(`${row.family}: ${row.stored}/${row.specified}`);
  }

  return rows;
};

// Outcome-blind compute benchmark (before the freeze): timings of incumbent runs only — VGT primary (fixed and
// portfolio) and B5 (fixed) on the final window — repeated; no figure is written or printed.
export const benchmark = async (options: { workers?: number; repeats?: number }) => {
  if (await fs.pathExists(protocolFreezeFile)) {
    throw new Error('the benchmark is outcome-blind and runs only before the protocol freeze');
  }

  const workers = options.workers ?? defaultWorkerCount();
  const repeats = options.repeats ?? 16;
  const pools = await loadPoolBooks();
  const loadStart = Date.now();
  const { universe } = await candidateUniverse([...poolMembers]);
  const loadSeconds = (Date.now() - loadStart) / 1000;
  const runner = new WorkerRunner(universe, workers);
  const timings: Record<string, number> = {};
  const vgt = [{ symbol: 'VGT', phenotype: vgtPrimary.id, grid: { ...incumbentGrid } }];

  try {
    for (const [label, mode, books] of [
      ['vgt-primary fixed', 'fixed', vgt],
      ['vgt-primary portfolio', 'portfolio', vgt],
      ['B5 fixed', 'fixed', pools.B5]
    ] as const) {
      const specs = Array.from({ length: repeats }, (_, index) =>
        specOf({
          key: `benchmark:${label}:${index}`,
          family: 'parity',
          subject: 'benchmark',
          window: 'final',
          mode,
          books: [...books],
          meta: {}
        })
      );
      const start = Date.now();

      await Promise.all(specs.map((spec) => runner.run(spec)));
      timings[label] = (Date.now() - start) / 1000 / repeats; // wall-clock seconds per run with the pool busy
    }
  } finally {
    await runner.close();
  }

  const record = {
    schema: 'd1-standalone-opportunity-benchmark',
    writtenAt: nowIso(),
    node: process.version,
    workers,
    repeats,
    loadSeconds,
    secondsPerRun: timings,
    rate: base.rate,
    note: 'timings of incumbent runs only (VGT primary, B5); no figure of any run was written or printed'
  };

  await fs.outputFile(resultDir('benchmark', 'benchmark.json'), `${JSON.stringify(record, null, 1)}\n`);
  log(`benchmark: ${JSON.stringify(timings)} s per run (wall, ${workers} workers); load ${loadSeconds.toFixed(1)} s`);

  return record;
};

export { gridKeyOf };
