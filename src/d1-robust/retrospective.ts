// The R1/R4 retrospective runner (PROTOCOL.md §21; research/d1-robust-design-review/R1_R4_RESEARCH_RUN_DESIGN.md):
//
//   npm run robust-d1 -- research-run --config R1|R4 --mode fixed|portfolio --dataset all --cost 5
//     --acknowledge-retrospective [--dividends frozen|symmetric]
//
// An opt-in, read-only inspection of two training peaks of the 16-ETF study that were never accepted. The vectors are
// read from that study's archived robust.json (cross-checked against refine.json; both hashes must equal its verified
// FROZEN_SELECTION.json records); the archived training figures are reproduced on the full engine first (exact), then
// one continuous `all` run is written to evaluations/robust-d1/retrospective/. Every output begins with the evidence
// label. No search, pilot, promotion, refinement, assessment or selection module imports this file, and nothing it
// writes is read by the study.
import path from 'node:path';
import fs from 'fs-extra';
import { sha256FileSync } from '#lib';
import type { IntParams } from '../d1-refinement/families.ts';
import { type BenchmarkKey, benchmarkSymbols, frozenBenchmarkPhenotypes } from '../joint-16-etf-d1/benchmarks.ts';
import { bridgeOf, extrasOf, lotDays, summaryOf } from '../joint-16-etf-d1/figures.ts';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import { idOf } from '../multi-etf-d1/space.ts';
import { readVerifiedSelection } from '../portfolio-aware-d1/freeze.ts';
import { baseNRunConfig, bookOrderOf, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import { type LoadedUniverse, loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { candidateBook, type Grid } from '../portfolio-aware-d1/phenotypes.ts';
import {
  frozenSelectionFile,
  hasFlag,
  log,
  nowIso,
  option,
  readJson,
  retrospectiveRoot,
  stageDir,
  study,
  writeJson
} from './context.ts';
import { type EngineSpec, runEngine } from './evaluate.ts';
import { codeManifest, gitState, readSealed, requireProtocolFrozen, sha256 } from './freeze.ts';

export const retrospectiveLabel = 'RETROSPECTIVE — INSPECTED HISTORY — NOT AN INDEPENDENT HOLDOUT — NOT ACCEPTED.';
export const retrospectiveNote = `${retrospectiveLabel}
This configuration was the leading training result of research/joint-16-etf-d1 (frozen "no advancement", 2026-10-25),
failed its preregistered gates and was never nominated. Post-2023 figures below are a historical inspection of a
training-optimized peak on data examined repeatedly by this research programme; they validate nothing and must not
inform any training fitness, ranking or shortlist.`;

const priorRoot = 'research/joint-16-etf-d1';

// sha256 of every file under the 16-ETF study's directory (amendment 3: the runner checks the whole directory, not
// three files, before the run and after its outputs are written).
const priorStudyDigest = () => {
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);

      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else {
        files[full] = sha256FileSync(full);
      }
    }
  };

  walk(priorRoot);

  return sha256(JSON.stringify(files));
};
const priorManifest = `${priorRoot}/FROZEN_SELECTION.json`;
const robustFile = `${priorRoot}/results/robust/robust.json`;
const refineFile = `${priorRoot}/results/refine/refine.json`;
const labels = { R1: 'R1 (refined c1)', R4: 'R4 (refined c4)' } as const;
const slots = { R1: 1, R4: 4 } as const;

export type RetrospectiveKey = keyof typeof labels;

interface Battery {
  label: string;
  key: string;
  books: { symbol: string; id: string; grid: Grid; short: string }[];
  costs: Record<string, { net: number; minuteDrawdown: number; dailyDrawdown: number; lots: number }>;
  full: {
    portfolio: {
      endEquity: number;
      dailyPercent: number;
      minutePercent: number;
      borrowingDollarDays: number;
      lots: number;
    };
  };
}

// The provenance of R1 and R4: manifest hash verified; robust.json and refine.json hash to the manifest's records;
// each key equals the refine run of its slot; each vector ID is the D1 candidate ID of its grid.
export const readProvenance = async () => {
  const manifest = await readVerifiedSelection(priorManifest);
  const records = manifest.records as Record<string, string>;
  const problems: string[] = [];
  const robustSha = sha256FileSync(robustFile);
  const refineSha = sha256FileSync(refineFile);

  if (records['robust/robust.json'] !== robustSha) {
    problems.push(`robust.json hashes to ${robustSha}, not the manifest's ${records['robust/robust.json']}`);
  }

  if (records['refine/refine.json'] !== refineSha) {
    problems.push(`refine.json hashes to ${refineSha}, not the manifest's ${records['refine/refine.json']}`);
  }

  const robust = await readJson<{ gated: { battery: Battery }[] }>(robustFile);
  const refine = await readJson<{ runs: { slot: number; result: string }[] }>(refineFile);
  const configs = {} as Record<RetrospectiveKey, Battery>;

  for (const key of ['R1', 'R4'] as const) {
    const battery = robust.gated.find((item) => item.battery.label === labels[key])?.battery;

    if (!battery) {
      problems.push(`${labels[key]} is not in robust.json`);
      continue;
    }

    const run = refine.runs.find((item) => item.slot === slots[key]);

    if (run?.result !== battery.key) {
      problems.push(
        `${key}: robust.json key ${battery.key} differs from refine.json slot ${slots[key]} ${run?.result}`
      );
    }

    for (const book of battery.books) {
      if (idOf(book.grid as unknown as IntParams) !== book.id) {
        problems.push(`${key} ${book.symbol}: ${book.id} is not the candidate ID of its grid`);
      }
    }

    configs[key] = battery;
  }

  if (problems.length > 0) {
    throw new Error(`Provenance check failed; nothing is run: ${problems.join('; ')}`);
  }

  return {
    manifestHash: manifest.manifestHash,
    records: { 'robust/robust.json': robustSha, 'refine/refine.json': refineSha },
    configs
  };
};

// The retrospective door: R1/R4 members only, `all` only, only with the acknowledgement.
export const retrospectiveUniverse = async (
  key: RetrospectiveKey,
  members: readonly string[],
  args: string[],
  partition: string
) => {
  if (!hasFlag(args, 'acknowledge-retrospective')) {
    throw new Error(`${retrospectiveLabel}\nPass --acknowledge-retrospective to run this inspection.`);
  }

  if (partition !== 'all') {
    throw new Error('The retrospective runner accepts --dataset all only');
  }

  if (key !== 'R1' && key !== 'R4') {
    throw new Error('The retrospective runner accepts --config R1 or R4 only');
  }

  return loadNUniverse({ members, partition: 'all', access: 'manual evaluation', warmupSessions: 0 });
};

// B4 and B5 with their frozen phenotypes (as the 16-ETF controls), in the same dividend convention as the inspected
// configuration (amendment 2: `--dividends symmetric` compared against frozen-convention benchmarks before).
const runBenchmark = async (
  loaded: LoadedUniverse,
  key: BenchmarkKey,
  mode: 'fixed' | 'portfolio',
  costBps: number,
  lotDividends: boolean
) => {
  const phenotypes = await frozenBenchmarkPhenotypes();
  const symbols = benchmarkSymbols[key];
  const members = [...new Set(mode === 'portfolio' ? ['VOOG', 'VGT', ...symbols] : symbols)];

  return runNAllocator(
    {
      ...loaded.universe,
      instruments: Object.fromEntries(members.map((symbol) => [symbol, loaded.universe.instruments[symbol]!]))
    },
    baseNRunConfig({
      key: `${key}-${mode}-${costBps}bps-f${study.fraction}${lotDividends ? '' : '-symmetric'}`,
      label: `${key} ${mode} ${costBps} bps`,
      mode,
      symbols,
      phenotypes,
      costBps,
      fraction: study.fraction,
      lotDividends,
      eligibilityIndex: loaded.universe.eligibilityIndex,
      accountingStartIndex: loaded.warmup
    })
  );
};

const specOf = (
  loaded: LoadedUniverse,
  battery: Battery,
  mode: 'fixed' | 'portfolio',
  costBps: number,
  lotDividends: boolean
): EngineSpec => ({
  label: battery.label,
  mode,
  books: battery.books.map((book) => ({
    symbol: book.symbol,
    phenotype: candidateBook(book.symbol, book.id, book.grid)
  })),
  costBps,
  fraction: study.fraction,
  lotDividends,
  eligibilityIndex: loaded.universe.eligibilityIndex,
  accountingStartIndex: loaded.warmup
});

export const runResearchRun = async (args: string[]) => {
  const key = (option(args, 'config') ?? '') as RetrospectiveKey;
  const mode = (option(args, 'mode') ?? 'fixed') as 'fixed' | 'portfolio';
  const partition = option(args, 'dataset') ?? '';
  const costBps = Number(option(args, 'cost') ?? study.principalCostBps);
  const dividends = (option(args, 'dividends') ?? 'frozen') as 'frozen' | 'symmetric';

  console.info(retrospectiveNote);

  if (!hasFlag(args, 'acknowledge-retrospective')) {
    console.info('\nPass --acknowledge-retrospective to run this inspection.');
    return;
  }

  if (
    !['R1', 'R4'].includes(key) ||
    !['fixed', 'portfolio'].includes(mode) ||
    partition !== 'all' ||
    ![0, 2, 5, 10].includes(costBps) ||
    !['frozen', 'symmetric'].includes(dividends)
  ) {
    throw new Error(
      '--config R1|R4 --mode fixed|portfolio --dataset all --cost 0|2|5|10 [--dividends frozen|symmetric] --acknowledge-retrospective'
    );
  }

  // Ordering (§20 M4): only after this study's selection freeze, its reporting batch and its locked confirmation
  // record — the one written against this freeze (amendment 3).
  await requireProtocolFrozen();

  const selection = await readSealed(frozenSelectionFile);
  const evaluationFile = stageDir('evaluation', 'evaluation.json');

  if (!(await fs.pathExists(evaluationFile))) {
    throw new Error(
      'The retrospective runs come after `evaluate` (the locked confirmation, or its no-advancement record)'
    );
  }

  if ((await readJson<{ manifestHash: string }>(evaluationFile)).manifestHash !== selection.bodyHash) {
    throw new Error(`${evaluationFile} was not written against the frozen selection ${selection.bodyHash}`);
  }

  if (!(await fs.pathExists(stageDir('confirmB', 'confirmB.json')))) {
    throw new Error('The retrospective runs come after confirm-b');
  }

  const before = priorStudyDigest();
  const provenance = await readProvenance();
  const battery = provenance.configs[key];
  const symbols = battery.books.map((book) => book.symbol);
  const outDir = path.join(retrospectiveRoot, `${key}-${mode}-all-${costBps}bps-${dividends}`);

  // Each run is written once (amendment 3).
  if (await fs.pathExists(path.join(outDir, 'summary.json'))) {
    throw new Error(`${outDir} exists: each retrospective run is written once`);
  }

  const provenanceFile = path.join(retrospectiveRoot, 'PROVENANCE.json');
  const provenanceBody = {
    label: retrospectiveLabel,
    note: retrospectiveNote,
    priorManifest,
    manifestHash: provenance.manifestHash,
    records: provenance.records,
    study: {
      frozenSelection: selection.bodyHash,
      evaluation: sha256FileSync(evaluationFile),
      protocol: sha256FileSync('research/d1-robust-pool-discovery/PROTOCOL.md'),
      code: codeManifest().digest
    },
    configurations: Object.fromEntries(
      (['R1', 'R4'] as const).map((item) => [
        item,
        {
          key: provenance.configs[item].key,
          books: provenance.configs[item].books,
          training5: provenance.configs[item].costs['5'],
          portfolio5: provenance.configs[item].full.portfolio
        }
      ])
    )
  };

  if (await fs.pathExists(provenanceFile)) {
    const existing = await readJson<typeof provenanceBody & { runs: unknown[] }>(provenanceFile);
    const { runs, ...body } = existing;

    void runs;

    if (JSON.stringify(body) !== JSON.stringify(provenanceBody)) {
      throw new Error(`${provenanceFile} exists with different provenance; nothing is run`);
    }
  }

  // 1. Training reproduction on the full engine (exact equality with the archive).
  const training = await loadNUniverse({
    members: [...new Set(['VOOG', 'VGT', ...symbols])],
    partition: 'training',
    access: 'manual evaluation',
    warmupSessions: 0
  });
  const trainingFixed = summaryOf(
    runEngine(training.universe, specOf(training, battery, 'fixed', study.principalCostBps, true))
  );
  const trainingPortfolio = summaryOf(
    runEngine(training.universe, specOf(training, battery, 'portfolio', study.principalCostBps, true))
  );
  const archived = battery.costs['5']!;
  const portfolio5 = battery.full.portfolio;
  const phenotypes = Object.fromEntries(
    battery.books.map((book) => [book.symbol, candidateBook(book.symbol, book.id, book.grid)])
  );
  const trainingParity = replayAgainstFull(training, bookOrderOf(symbols), phenotypes, study.principalCostBps);
  const reproduction = {
    fixed: {
      net: [trainingFixed.net, archived.net],
      minuteDrawdown: [trainingFixed.minuteDrawdown, archived.minuteDrawdown],
      dailyDrawdown: [trainingFixed.dailyDrawdown, archived.dailyDrawdown],
      lots: [trainingFixed.lots, archived.lots]
    },
    portfolio: {
      endEquity: [trainingPortfolio.endEquity, portfolio5.endEquity],
      dailyPercent: [trainingPortfolio.dailyPercent, portfolio5.dailyPercent],
      minutePercent: [trainingPortfolio.minutePercent, portfolio5.minutePercent],
      borrowingDollarDays: [trainingPortfolio.borrowingDollarDays, portfolio5.borrowingDollarDays]
    },
    replayParityDifferences: trainingParity.differences.length
  };
  const exact =
    Object.values(reproduction.fixed).every(([a, b]) => a === b) &&
    Object.values(reproduction.portfolio).every(([a, b]) => a === b) &&
    reproduction.replayParityDifferences === 0;

  if (!exact) {
    await writeJson(path.join(outDir, 'reproduction-failure.json'), { label: retrospectiveLabel, reproduction });
    throw new Error(`${key}: the training reproduction is not exact; nothing further is computed`);
  }

  // 2. The continuous `all` run.
  const members = [
    ...new Set([...(mode === 'portfolio' ? ['VOOG', 'VGT'] : []), ...symbols, 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'])
  ];
  const all = await retrospectiveUniverse(key, members, args, partition);

  if (all.universe.end !== study.lastCommonSession) {
    throw new Error(`The all window ends ${all.universe.end}, not ${study.lastCommonSession}`);
  }
  const result = runEngine(all.universe, specOf(all, battery, mode, costBps, dividends === 'frozen'));
  const summary = summaryOf(result);
  const extras = extrasOf(result);
  const b4 = await runBenchmark(all, 'B4', mode, costBps, dividends === 'frozen');
  const b5 = await runBenchmark(all, 'B5', mode, costBps, dividends === 'frozen');
  const bridgeB4 = bridgeOf(result, b4);
  const bridgeB5 = bridgeOf(result, b5);
  const postRows = bridgeB5.rows.filter((row) => row.segment === 'holdout' || row.segment === 'final');
  const topTwo = postRows
    .map((row) => row.contribution)
    .filter((value) => value > 0)
    .sort((a, b) => b - a)
    .slice(0, 2);
  const allParity =
    mode === 'fixed' ? replayAgainstFull(all, bookOrderOf(symbols), phenotypes, costBps).differences.length : null;
  const lotDayRows = Object.fromEntries(
    symbols.map((symbol) => [
      symbol,
      result.lots.filter((lot) => lot.symbol === symbol).reduce((total, lot) => total + lotDays(result, lot), 0)
    ])
  );
  const omitted = Object.fromEntries(
    [0.01, 0.03, 0.06].map((yieldRate) => [
      yieldRate,
      Object.fromEntries(
        Object.entries(lotDayRows).map(([symbol, days]) => [symbol, (study.principal * yieldRate * days) / 365])
      )
    ])
  );
  if (priorStudyDigest() !== before) {
    throw new Error('A 16-ETF study file changed during the run; nothing is written');
  }

  const record = {
    label: retrospectiveLabel,
    note: retrospectiveNote,
    generatedAt: nowIso(),
    config: key,
    key: battery.key,
    mode,
    dataset: partition,
    costBps,
    dividends: mode === 'portfolio' ? dividends : 'price-only (fixed mode)',
    window: { first: all.universe.dates[0], last: all.universe.end, sessions: all.universe.sessionCount },
    trainingReproduction: { exact, ...reproduction },
    summary,
    extras,
    versus: {
      B4: { summary: summaryOf(b4), bridge: { bySegment: bridgeB4.bySegment, residual: bridgeB4.residual } },
      B5: {
        summary: summaryOf(b5),
        bridge: { bySegment: bridgeB5.bySegment, residual: bridgeB5.residual },
        postTrainingTopTwoContributions: topTwo
      }
    },
    replayParityOnAll: allParity,
    omittedDistributionBound: omitted,
    benchmarksDividends: mode === 'portfolio' ? dividends : 'price-only (fixed mode)',
    priorStudyDigest: before,
    frozenFilesUnchanged: true
  };

  await writeJson(path.join(outDir, 'summary.json'), record);
  await fs.outputFile(
    path.join(outDir, 'lots.csv'),
    `# ${retrospectiveLabel}\n${toCsv(result.lots.map((lot) => ({ lot: lot.id, symbol: lot.symbol, decision: new Date(lot.decisionTime * 1000).toISOString(), entry: new Date(lot.entryTime * 1000).toISOString(), exit: lot.exitIndex >= 0 ? new Date(lot.exitTime * 1000).toISOString() : 'open', reason: lot.exitReason, principal: lot.originalPrincipal, shares: lot.shares, lot_days: lotDays(result, lot), interest: lot.interest, net: lot.net })))}`
  );
  await fs.outputFile(
    path.join(outDir, 'daily.csv'),
    `# ${retrospectiveLabel}\n${toCsv(result.daily.map((row) => ({ date: row.date, equity: row.equity, strategy_mark: row.strategyMark, realized: row.realized, unrealized: row.unrealized, principal: row.principal, open_lots: row.openLots, owners: row.owners })))}`
  );
  await fs.outputFile(
    path.join(outDir, 'signals.csv'),
    `# ${retrospectiveLabel}\n${toCsv(result.signals.map((signal) => ({ symbol: signal.symbol, date: signal.date, decision: new Date(signal.decisionTime * 1000).toISOString(), outcome: signal.outcome, reason: signal.reason, funded_lot: signal.trade?.fundedLotId ?? -1 })))}`
  );
  await fs.outputFile(path.join(outDir, 'bridge-B5.csv'), `# ${retrospectiveLabel}\n${toCsv(bridgeB5.rows)}`);
  await fs.outputFile(path.join(outDir, 'bridge-B4.csv'), `# ${retrospectiveLabel}\n${toCsv(bridgeB4.rows)}`);

  const segments = summary.segments
    .map(
      (row) =>
        `  ${row.segment.padEnd(12)} strategy P&L ${row.strategyPnl.toFixed(2)}${mode === 'portfolio' ? `, equity return ${(100 * row.equityReturn).toFixed(2)}%` : ''}`
    )
    .join('\n');
  const report = `${retrospectiveNote}

${key} = ${battery.key}
${mode} mode, all (${record.window.first} → ${record.window.last}), ${costBps} bps per side${mode === 'portfolio' ? `, ${dividends} dividends` : ''}
training reproduction exact: ${exact}
net ${summary.net.toFixed(2)}, lots ${summary.lots}, interest ${summary.interest.toFixed(2)}, costs ${extras.costs.toFixed(2)}
minute DD $${summary.minuteDrawdown.toFixed(2)}, daily DD $${summary.dailyDrawdown.toFixed(2)}${mode === 'portfolio' ? `, end equity ${summary.endEquity.toFixed(2)}, daily % DD ${(100 * summary.dailyPercent).toFixed(2)}%, minute % DD ${(100 * summary.minutePercent).toFixed(2)}%` : ''}
segments:
${segments}
`;

  await fs.outputFile(path.join(outDir, 'report.txt'), report);

  // The 16-ETF directory is checked again after every output is written.
  const after = priorStudyDigest();

  if (after !== before) {
    throw new Error('A 16-ETF study file changed while the outputs were written');
  }

  const run = {
    at: nowIso(),
    config: key,
    mode,
    costBps,
    dividends,
    outDir,
    priorStudyDigest: { before, after },
    git: gitState().head,
    node: process.version
  };

  await writeJson(path.join(outDir, 'PROVENANCE.json'), { ...provenanceBody, run });

  const existing = (await fs.pathExists(provenanceFile))
    ? await readJson<{ runs: unknown[] }>(provenanceFile)
    : { runs: [] };

  await writeJson(provenanceFile, {
    ...provenanceBody,
    runs: [...existing.runs, run]
  });
  console.info(`\n${report}`);
  log(`${key} ${mode} all ${costBps} bps: written to ${outDir}`);
};
