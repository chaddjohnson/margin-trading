// The final round and the selection (PROTOCOL.md §14–§15): `search` runs the unseeded and benchmark-seeded J arms on
// the full training window, pools them for promotion, refines and assesses, and records the gated ranking and the
// nominations (empty when G-WF failed); `freeze-selection` writes FROZEN_SELECTION.json once, whatever the outcome;
// `confirm-b` (after the freeze, training only) computes the independent reporting batch for every finalist, nominee
// and benchmark, and the inspect-only R1/R4 training comparison, none of which can change the frozen selection.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { sha256FileSync } from '#lib';
import { searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { readVerifiedSelection } from '../portfolio-aware-d1/freeze.ts';
import { traceCodeFiles } from '../portfolio-aware-d1/trace.ts';
import { Rng } from '../optimizer/rng.ts';
import {
  contextFile,
  frozenSelectionFile,
  log,
  nowIso,
  protocolFile,
  readJson,
  stageDir,
  study,
  tierFile,
  universeFile,
  writeJson
} from './context.ts';
import { doorRecordOf, eligibleSymbols, trainingUniverse } from './data.ts';
import { canonicalBooks, keyOf } from './evaluate.ts';
import { RobustEvaluator } from './evaluator.ts';
import { type Assessment, type GateResult, nominate, rankPassing } from './assess.ts';
import { codeManifest, gitState, provenance, readSealed, requireProtocolFrozen, writeSealed } from './freeze.ts';
import { requireControls } from './controls.ts';
import { librarySeed } from './library.ts';
import type { Book } from './neighbourhood.ts';
import { requireParity } from './parity.ts';
import { pilotFreezeFile } from './pilot.ts';
import { booksOfPick, readPilotFreeze, runRound } from './round.ts';
import { bootstrapInterval, medianOf, pairedBootstrap, q25Of, scoreOf, summarize } from './stats.ts';
import { gwfFile, readTier } from './walkforward.ts';

export const finalDir = (...parts: string[]) => stageDir('final', ...parts);

export const runFinalSearch = async () => {
  await requireProtocolFrozen();
  await requireControls();
  await requireParity();

  for (const file of [frozenSelectionFile, finalDir('selection-candidates.json')]) {
    if (await fs.pathExists(file)) {
      throw new Error(`${file} exists: the final round runs once`);
    }
  }

  if (!(await fs.pathExists(gwfFile))) {
    throw new Error(`${gwfFile} is missing: the final round runs after both folds' procedure gate is decided`);
  }

  // An earlier run that stopped before selection-candidates.json is kept, never overwritten (amendment 2).
  if (await fs.pathExists(finalDir('round.json'))) {
    const aside = stageDir(`final-aborted-${nowIso().replace(/[:.]/g, '-')}`);

    await fs.move(finalDir(), aside);
    log(`an incomplete earlier final round was moved to ${aside}`);
  }

  const gwf = (await readSealed(gwfFile)) as unknown as { passed: boolean; bodyHash: string };
  const { tier, workers } = await readTier();
  const universe = await eligibleSymbols();
  const pilot = await readPilotFreeze('final');
  const loaded = await trainingUniverse('final', { symbols: universe });
  const evaluator = await RobustEvaluator.create(loaded, 'final', workers);
  const benchmarks = await searchBenchmarkBooks();

  try {
    const outcome = await runRound(
      evaluator,
      loaded,
      { round: 'final', tier, universe, benchmarks, outDir: finalDir() },
      pilot
    );
    const pooled = outcome.results.pooled!;

    await writeJson(finalDir('selection-candidates.json'), {
      generatedAt: nowIso(),
      gwf: { passed: gwf.passed, bodyHash: gwf.bodyHash },
      passing: pooled.order.map((row) => row.assessment.key),
      nominees: gwf.passed ? pooled.nominees : [],
      nomineesIfGwfIgnored: pooled.nominees,
      finalists: pooled.ranked.map((row) => ({
        key: row.assessment.key,
        provenance: row.assessment.provenance,
        pass: row.pass,
        value: row.value,
        failed: row.gates.filter((gate) => !gate.pass).map((gate) => gate.gate),
        labels: row.assessment.labels
      })),
      door: doorRecordOf('trainingUniverse', loaded, 'final'),
      evaluations: Object.fromEntries(Object.entries(outcome.archives).map(([arm, archive]) => [arm, archive.size])),
      cache: evaluator.cacheStats(),
      seconds: outcome.seconds
    });
    log(
      `final round: ${pooled.order.length} passing finalists; nominees ${gwf.passed ? pooled.nominees.map((n) => n.role).join(', ') || 'none' : 'none (G-WF failed)'}`
    );
  } finally {
    await evaluator.close();
  }
};

// Every file the freeze binds must exist (amendment 3: a missing one was silently dropped before).
const fileHashes = (files: readonly string[]) => {
  const missing = files.filter((file) => !fs.existsSync(file));

  if (missing.length > 0) {
    throw new Error(`Missing at the selection freeze: ${missing.join(', ')}`);
  }

  return Object.fromEntries(files.map((file) => [file, sha256FileSync(file)]));
};

const retrospectiveCommands = (['R1', 'R4'] as const).flatMap((config) =>
  (['fixed', 'portfolio'] as const).map(
    (mode) =>
      `npm run robust-d1 -- research-run --config ${config} --mode ${mode} --dataset all --cost 5 --acknowledge-retrospective`
  )
);

export const runFreezeSelection = async () => {
  await requireProtocolFrozen();
  await requireControls();
  await requireParity();

  const sealedGwf = (await readSealed(gwfFile)) as unknown as { passed: boolean; bodyHash: string };
  const candidates = await readJson<{
    gwf: { passed: boolean; bodyHash: string };
    nominees: { role: string; key: string }[];
    nomineesIfGwfIgnored: { role: string; key: string }[];
    passing: string[];
    finalists: unknown[];
    evaluations: Record<string, number>;
  }>(finalDir('selection-candidates.json'));

  // G-WF comes from its sealed record, never from the unsealed candidates file.
  if (candidates.gwf.bodyHash !== sealedGwf.bodyHash || candidates.gwf.passed !== sealedGwf.passed) {
    throw new Error('selection-candidates.json disagrees with the sealed GWF.json');
  }

  candidates.gwf = { passed: sealedGwf.passed, bodyHash: sealedGwf.bodyHash };
  candidates.nominees = sealedGwf.passed ? candidates.nomineesIfGwfIgnored : [];
  const assessment = await readJson<{
    finalists: {
      key: string;
      books: Book['vector'][] & never;
      members: string[];
      gates: unknown;
      pass: boolean;
      labels: string[];
      value: number;
      scoreA: unknown;
      confirmA: unknown;
    }[];
    nominees: { role: string; key: string; note?: string }[];
  }>(finalDir('pooled', 'assessment.json'));

  // The nominations are recomputed from the assessed finalists' gates and values with the §14 ranking and nomination
  // rules, and must equal both stored lists (amendment 3).
  const nominated = (list: { role: string; key: string }[]) =>
    JSON.stringify(list.map((nominee) => [nominee.role, nominee.key]));
  const recomputed = nominate(
    rankPassing(
      assessment.finalists.map((row) => ({
        assessment: row as unknown as Assessment,
        gates: row.gates as GateResult[],
        pass: row.pass,
        value: row.value
      }))
    )
  ).map((nominee) => ({ role: nominee.role, key: nominee.row.assessment.key }));

  if (
    nominated(recomputed) !== nominated(assessment.nominees) ||
    nominated(recomputed) !== nominated(candidates.nomineesIfGwfIgnored)
  ) {
    throw new Error('The recomputed nominations disagree with assessment.json or selection-candidates.json');
  }

  const round = await readJson<{ budgetPerArm: number; tier: string; discoveryDraws: number; pilotFreeze: string }>(
    finalDir('round.json')
  );
  const benchmarkBooks = await searchBenchmarkBooks();
  const universe = await readJson<{ eligible: string[] }>(universeFile);
  const outcome = !candidates.gwf.passed
    ? 'no advancement — the selection procedure showed no forward persistence inside training (G-WF failed)'
    : candidates.nominees.length === 0
      ? 'no advancement — no finalist passed G1–G8'
      : 'nominees frozen for the locked confirmation';
  const nominees = candidates.gwf.passed
    ? candidates.nominees.map((nominee) => {
        const row = assessment.finalists.find((item) => item.key === nominee.key)!;

        return {
          role: nominee.role,
          note: assessment.nominees.find((item) => item.key === nominee.key)?.note,
          key: nominee.key,
          members: row.members,
          books: (row as unknown as { books: unknown[] }).books,
          tieOrder: [...row.members].sort(),
          value: row.value,
          labels: row.labels,
          gates: row.gates,
          scoreA: row.scoreA,
          confirmA: row.confirmA
        };
      })
    : [];
  const engineFiles = [
    ...traceCodeFiles,
    'src/portfolio-aware-d1/replay.ts',
    'src/portfolio-aware-d1/nbook/engine.ts',
    'src/portfolio-aware-d1/nbook/ledger.ts',
    'src/portfolio-aware-d1/nbook/margin.ts',
    'src/portfolio-aware-d1/nbook/universe.ts',
    'src/multi-etf-allocator/ledger.ts',
    'src/multi-etf-allocator/engine.ts'
  ];
  const dataFiles = universe.eligible.flatMap((symbol) => [`data/${symbol}/data.csv`]);
  const manifest = await writeSealed(frozenSelectionFile, {
    version: study.version,
    frozenAt: nowIso(),
    outcome,
    nominees,
    gwf: candidates.gwf,
    passing: candidates.passing,
    finalists: candidates.finalists,
    benchmarks: {
      B1: 'VGT D1 alone (primary)',
      B4: 'All-lowDd shadow (VGT primary, XBI/XRT/KRE lowDd)',
      B5: 'All-lowDd + GDX portfolioAware',
      C0: 'empty trading pool (60/40 VOOG/VGT core)'
    },
    benchmarkBooks: Object.fromEntries(
      (['B1', 'B4', 'B5'] as const).map((key) => [
        key,
        benchmarkBooks[key].map((book) => ({ symbol: book.symbol, id: book.vector.id, grid: book.vector.grid }))
      ])
    ),
    budgets: {
      tier: round.tier,
      perArm: round.budgetPerArm,
      discoveryDraws: round.discoveryDraws,
      pilotFreeze: round.pilotFreeze
    },
    evaluations: candidates.evaluations,
    seeds: {
      label: study.seedLabel,
      streams: "Rng.from('robust-d1', window, stage, …) for every stochastic element (PROTOCOL.md §4.2, §18)",
      library: String(librarySeed())
    },
    pilotFreezes: Object.fromEntries(
      await Promise.all(
        (['fold-a', 'fold-b', 'final'] as const).map(async (window) => [
          window,
          (await readSealed(pilotFreezeFile(window))).bodyHash
        ])
      )
    ),
    lastCommonSession: study.lastCommonSession,
    hashes: {
      protocol: sha256FileSync(protocolFile),
      context: sha256FileSync(contextFile),
      universe: sha256FileSync(universeFile),
      tier: sha256FileSync(tierFile),
      partitions: sha256FileSync('data/partitions.json'),
      splits: sha256FileSync('config/market-events/splits.json'),
      ledger: sha256FileSync('config/market-events/distributions.csv'),
      engine: fileHashes(engineFiles),
      data: fileHashes(dataFiles),
      records: fileHashes([
        stageDir('controls', 'controls.json'),
        stageDir('parity', 'parity.json'),
        gwfFile,
        stageDir('walkforward', 'fold-a', 'PICKS.json'),
        stageDir('walkforward', 'fold-b', 'PICKS.json'),
        stageDir('walkforward', 'fold-a', 'validation.json'),
        stageDir('walkforward', 'fold-b', 'validation.json'),
        finalDir('round.json'),
        finalDir('unseeded', 'discovery.json'),
        finalDir('unseeded', 'discovery.jsonl'),
        finalDir('seeded', 'discovery.json'),
        finalDir('seeded', 'discovery.jsonl'),
        finalDir('pooled', 'promotion.json'),
        ...fs
          .readdirSync(finalDir('pooled'))
          .filter((name) => name.startsWith('refine-'))
          .sort()
          .map((name) => finalDir('pooled', name)),
        ...(['fold-a', 'fold-b', 'final'] as const).flatMap((window) => [
          stageDir('pilot', window, 'pilot.json'),
          stageDir('pilot', window, 'controls.jsonl')
        ]),
        stageDir('determinism', 'determinism.json'),
        finalDir('selection-candidates.json'),
        finalDir('pooled', 'assessment.json'),
        finalDir('benchmarks.json')
      ]),
      code: codeManifest()
    },
    provenance: await provenance(),
    node: process.version,
    git: gitState(),
    authorizedCommands:
      nominees.length > 0
        ? [
            'npm run robust-d1 -- confirm-b',
            'npm run robust-d1 -- evaluate',
            'npm run robust-d1 -- evaluate --confirm',
            ...retrospectiveCommands
          ]
        : [
            'npm run robust-d1 -- confirm-b',
            'npm run robust-d1 -- evaluate  (writes the no-advancement record only)',
            ...retrospectiveCommands
          ]
  });

  log(`selection frozen (${manifest.bodyHash.slice(0, 12)}): ${outcome}`);

  return manifest;
};

// The inspect-only R1/R4 books (training vectors of the 16-ETF study), for the confirm-b comparison only.
export const inspectOnlyBooks = async (): Promise<Record<'R1' | 'R4', Book[]>> => {
  const robustFile = 'research/joint-16-etf-d1/results/robust/robust.json';
  const prior = await readVerifiedSelection('research/joint-16-etf-d1/FROZEN_SELECTION.json');

  if ((prior.records as Record<string, string>)['robust/robust.json'] !== sha256FileSync(robustFile)) {
    throw new Error(`${robustFile} does not hash to the 16-ETF FROZEN_SELECTION.json record`);
  }

  const robust = await readJson<{
    gated: { battery: { label: string; books: { symbol: string; id: string; grid: Book['vector']['grid'] }[] } }[];
  }>(robustFile);
  const books = (label: string) =>
    robust.gated
      .find((item) => item.battery.label === label)!
      .battery.books.map((book) => ({
        symbol: book.symbol,
        vector: { id: book.id, grid: book.grid, origin: `inspect-only ${label}` }
      }));

  return { R1: books('R1 (refined c1)'), R4: books('R4 (refined c4)') };
};

export const runConfirmB = async () => {
  await requireProtocolFrozen();
  await requireControls();
  await requireParity();

  const manifest = (await readSealed(frozenSelectionFile)) as unknown as {
    bodyHash: string;
    hashes: { records: Record<string, string> };
  };
  const file = stageDir('confirmB', 'confirmB.json');

  for (const input of [finalDir('pooled', 'assessment.json'), finalDir('benchmarks.json')]) {
    if (sha256FileSync(input) !== manifest.hashes.records[input]) {
      throw new Error(`${input} does not hash to the frozen selection's record`);
    }
  }

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the reporting batch is computed once`);
  }

  const { tier, workers } = await readTier();
  const universe = await eligibleSymbols();
  const pilot = await readPilotFreeze('final');
  const loaded = await trainingUniverse('final', { symbols: universe });
  const evaluator = await RobustEvaluator.create(loaded, 'final', workers);
  const benchmarks = await searchBenchmarkBooks();
  const assessment = await readJson<{
    finalists: {
      key: string;
      label: string;
      books: { symbol: string; id: string; grid: Book['vector']['grid']; origin: string }[];
      confirmANets: number[];
      confirmA: { p50: number };
    }[];
  }>(finalDir('pooled', 'assessment.json'));
  const bench = await readJson<{ benchmarks: Record<string, { confirmANets: number[]; confirmA: { p50: number } }> }>(
    finalDir('benchmarks.json')
  );
  const inspect = await inspectOnlyBooks();
  const configs: { label: string; kind: string; books: Book[]; confirmA?: { p50: number; nets: number[] } }[] = [
    ...assessment.finalists.map((row) => ({
      label: row.label,
      kind: 'finalist',
      books: booksOfPick(row.books),
      confirmA: { p50: row.confirmA.p50, nets: row.confirmANets }
    })),
    ...(['B1', 'B4', 'B5'] as const).map((key) => ({
      label: key,
      kind: 'benchmark',
      books: benchmarks[key],
      confirmA: { p50: bench.benchmarks[key]!.confirmA.p50, nets: bench.benchmarks[key]!.confirmANets }
    })),
    ...(['R1', 'R4'] as const).map((key) => ({
      label: key,
      kind: 'inspect-only (16-ETF training peak; never a candidate)',
      books: inspect[key]
    }))
  ];
  const canonical = configs.map((config) => canonicalBooks(config.books));
  const centres = await evaluator.centres(canonical, study.principalCostBps);
  const confirmB = await evaluator.neighbourRecords(canonical, {
    stage: 'confirm-B',
    cls: 'N1',
    n: tier.confirmDraws,
    costBps: study.principalCostBps
  });
  const inspectA = await evaluator.neighbourRecords(canonical.slice(-2), {
    stage: 'confirm-A',
    cls: 'N1',
    n: tier.confirmDraws,
    costBps: study.principalCostBps
  });
  const rows = configs.map((config, index) => {
    const stats = summarize(centres[index]!.net, confirmB[index]!);
    const nets = confirmB[index]!.map((record) => record.net);
    const aNets = config.confirmA?.nets ?? inspectA[index - (configs.length - 2)]!.map((record) => record.net);
    const aP50 = config.confirmA?.p50 ?? summarize(centres[index]!.net, inspectA[index - (configs.length - 2)]!).p50;
    const se = (values: number[], batch: string) =>
      bootstrapInterval(
        values,
        medianOf,
        Rng.from(study.seedLabel, 'final', 'bootstrap', `${batch}-se`, keyOf(config.books))
      ).se;
    const pooledSe = Math.sqrt(se(nets, 'confirm-B') ** 2 + se(aNets, 'confirm-A') ** 2);

    return {
      label: config.label,
      kind: config.kind,
      key: keyOf(config.books),
      centreNet: centres[index]!.net,
      confirmB: stats,
      intervals: {
        p50: bootstrapInterval(
          nets,
          medianOf,
          Rng.from(study.seedLabel, 'final', 'bootstrap', 'confirm-B', keyOf(config.books), 'p50')
        ),
        q25: bootstrapInterval(
          nets,
          q25Of,
          Rng.from(study.seedLabel, 'final', 'bootstrap', 'confirm-B', keyOf(config.books), 'q25')
        )
      },
      scoreB: scoreOf(stats, config.books.length, pilot.references),
      confirmAP50: aP50,
      disagreement: stats.p50 - aP50,
      pooledSe,
      withinTwoSe: Math.abs(stats.p50 - aP50) <= 2 * pooledSe,
      versusB4: pairedBootstrap(
        nets,
        confirmB[configs.findIndex((item) => item.label === 'B4')]!.map((record) => record.net),
        medianOf,
        Rng.from(study.seedLabel, 'final', 'bootstrap', 'confirm-B', keyOf(config.books), 'B4')
      ),
      versusB5: pairedBootstrap(
        nets,
        confirmB[configs.findIndex((item) => item.label === 'B5')]!.map((record) => record.net),
        medianOf,
        Rng.from(study.seedLabel, 'final', 'bootstrap', 'confirm-B', keyOf(config.books), 'B5')
      )
    };
  });

  await writeJson(file, {
    generatedAt: nowIso(),
    manifestHash: manifest.bodyHash,
    note: 'confirm-B: drawn after FROZEN_SELECTION.json; reported only; it cannot re-rank, rescue or change any selection. R1/R4 are inspect-only.',
    draws: tier.confirmDraws,
    rows,
    digest: createHash('sha256').update(JSON.stringify(rows)).digest('hex')
  });
  await evaluator.close();
  log(`confirm-b: ${rows.length} configurations`);
};
