// The multi-ETF allocator's commands: `npm run multi-etf-allocator -- <command> [options]`.
//
//   freeze-protocol                         hash and record PROTOCOL.md before any allocator result (once)
//   audit                                   data, calendar, distribution and fresh-data coverage audit → results/audit/
//   parity                                  the seven fixed controls and portfolio A/B against their references
//   fixed --policy P --config C             one fixed-$100k run → results/runs/single/<key>/
//   portfolio --policy P --config C         one 20%-portfolio run → results/runs/single/<key>/
//     --dataset training|holdout|final|all  instead: an explicit evaluation on the canonical data/<SYMBOL>/data.csv
//                                           over that partition (src/multi-etf-allocator/dataset.ts), outside the
//                                           frozen protocol → evaluations/multi-etf-allocator/<dataset>/<key>/;
//                                           with --out DIR, --dry-run (windows and hashes only, no run),
//                                           --end YYYY-MM-DD (a diagnostic endpoint inside the partition, e.g. the
//                                           frozen 2025-10-13 for a parity run) and, exceptionally,
//                                           --allow-uncovered-distributions (a portfolio window past the verified
//                                           distribution ledger; the record says later distributions are missing)
//     --json                                print the summary as JSON instead of the readable report; either way the
//                                           report is also written to report.txt beside the run's other files
//   run [--keys K1,K2]                      the whole catalogue (controls, 8 combinations × policies, both modes)
//   stress [--only static,paths,sensitivities]   the margin and execution stress program → results/stress/
//   illustration                            amendment A1: beyond-grid call mechanics on the real ledger (post hoc)
//   audit-ledger                            independent recomputation of the principal runs' ledgers
//   final-validation                        post hoc All-lowDd shadow cost / gap / March 2020 / streak checks
//                                           → results/final-validation/ (not part of `all`)
//   compare                                 the comparison tables from the catalogue's summaries
//   report                                  every generated table → results/tables/
//   forward-freeze                          FORWARD_TEST_FREEZE.json: what a genuine forward test must hold fixed
//   manifest                                results/MANIFEST.json: every result file with its size and sha256
//   all                                     audit, parity, run, audit-ledger, stress, illustration, report, forward-freeze, manifest
import path from 'node:path';
import { auditData } from './audit.ts';
import { auditLedgers } from './ledgerAudit.ts';
import {
  type Policy,
  combinationOf,
  hasFlag,
  log,
  option,
  policies,
  protocol,
  resultsRoot,
  stageDir,
  writeJson
} from './context.ts';
import { loadUniverse } from './data.ts';
import { writeManifest, writeRun } from './export.ts';
import { checkProtocolFrozen, freezeProtocol, writeForwardFreeze } from './freeze.ts';
import { runFixedParity, runPortfolioParity } from './parity.ts';
import { renderReports } from './report.ts';
import { allocatorConfig, catalogue, runCatalogue, writeSummaries } from './scenarios.ts';
import fs from 'fs-extra';
import { readPartitionConfig } from '#lib';
import { toCsv } from './metrics.ts';
import { segmentRows } from './segments.ts';
import {
  assertOutsideResearch,
  coverageRefusal,
  datasetOutDir,
  datasetRunConfig,
  describeDatasetUniverse,
  evaluationRecord,
  loadDatasetUniverse,
  parseDatasetOption,
  parseEndOption,
  warmupSessionsOf,
  writeEvaluationRecord
} from './dataset.ts';
import { runFinalValidation } from './finalValidation.ts';
import { runIllustration } from './illustration.ts';
import { runStress } from './stress.ts';
import { runAllocator } from './engine.ts';
import { formatRunReport, runDrawdowns } from './runReport.ts';

const universeAll = () => loadUniverse({ members: ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE'], end: protocol.commonEnd });

const requireFrozen = async () => {
  const status = await checkProtocolFrozen();

  if (status.amended) {
    log(
      `NOTE: PROTOCOL.md changed after its freeze (${status.freeze.protocolSha256.slice(0, 12)} → ${status.current.slice(0, 12)}); the change must be in §14`
    );
  }

  return status;
};

const runParity = async () => {
  const fixed = await runFixedParity();

  for (const outcome of fixed.outcomes) {
    log(
      `${outcome.name} to ${outcome.end}: ${outcome.trades} trades, net ${outcome.net.toFixed(2)}, minute DD ${outcome.minuteDrawdown.toFixed(2)}, daily DD ${outcome.dailyDrawdown.toFixed(2)}; ${outcome.differences.length} differences`
    );
  }

  const universe = await loadUniverse({ members: ['VOOG', 'VGT'], end: protocol.commonEnd });
  const portfolio = await runPortfolioParity(universe);

  for (const outcome of portfolio.outcomes) {
    log(
      `${outcome.scenario}: end equity ${outcome.endEquity.toFixed(2)} (old engine ${outcome.oldEndEquity.toFixed(2)}), daily DD ${(outcome.dailyDrawdownPercent * 100).toFixed(2)}%, largest daily difference ${outcome.maxDailyEquityDifference}; ${outcome.differences.length} differences`
    );
  }

  await writeJson(stageDir('parity', 'parity.json'), {
    fixed: fixed.outcomes,
    portfolio: portfolio.outcomes
  });

  const failures = [...fixed.outcomes, ...portfolio.outcomes].filter((outcome) => outcome.differences.length > 0);

  if (failures.length > 0) {
    throw new Error(`Parity failed for ${failures.length} control(s)`);
  }
};

// The readable report on the console (or the summary JSON with --json), and report.txt beside the run's files.
const printReport = async (outDir: string, report: string, summary: unknown, args: string[]) => {
  await fs.outputFile(path.join(outDir, 'report.txt'), report);

  if (hasFlag(args, 'json')) {
    log(JSON.stringify(summary, null, 1));
  } else {
    console.info(`\n${report}`);
  }
};

// An explicit --dataset evaluation (src/multi-etf-allocator/dataset.ts); runSingle below runs the frozen protocol path.
const runDatasetEvaluation = async (
  base: Awaited<ReturnType<typeof allocatorConfig>>,
  dataset: NonNullable<ReturnType<typeof parseDatasetOption>>,
  args: string[]
) => {
  const members = base.mode === 'portfolio' ? (['VOOG', ...base.symbols] as const) : base.symbols;
  const endDate = parseEndOption(option(args, 'end'));
  const loaded = await loadDatasetUniverse({
    members,
    partition: dataset,
    warmupSessions: warmupSessionsOf(base),
    mode: base.mode,
    endDate
  });
  const config = datasetRunConfig(base, loaded);
  const outDir = datasetOutDir(dataset, config.key.replace('@', '-'), option(args, 'out'));

  assertOutsideResearch(outDir);

  for (const line of describeDatasetUniverse(loaded)) {
    log(line);
  }

  const allowUncovered = hasFlag(args, 'allow-uncovered-distributions');
  const refusal = coverageRefusal(loaded, allowUncovered);
  const record = {
    ...(await evaluationRecord(loaded, config, outDir, args)),
    uncoveredDistributionsAllowed: loaded.distributions.used && !loaded.distributions.covered && allowUncovered
  };

  if (record.uncoveredDistributionsAllowed) {
    log('WARNING: --allow-uncovered-distributions: distributions after the ledger coverage are NOT modelled');
  }

  if (hasFlag(args, 'dry-run')) {
    log(
      `Dry run: ${config.key} would write ${outDir}${refusal ? ', but would be refused: ' + refusal : ''}; nothing was run`
    );
    log(JSON.stringify(record, null, 1));
    return;
  }

  if (refusal) {
    throw new Error(refusal);
  }

  const result = runAllocator(loaded.universe, config);
  const summary = await writeRun(outDir, result);
  const segments = segmentRows(
    result,
    readPartitionConfig(),
    config.mode === 'portfolio' ? config.initial.voog + config.initial.vgt : 0
  );

  await fs.outputFile(path.join(outDir, 'segments.csv'), toCsv(segments as unknown as Record<string, unknown>[]));
  await writeEvaluationRecord(outDir, { ...record, summary, segments, drawdowns: runDrawdowns(result) });
  await printReport(outDir, formatRunReport({ result, summary, dataset, segments, outDir }), summary, args);
};

const runSingle = async (mode: 'fixed' | 'portfolio', args: string[]) => {
  await requireFrozen();

  const policy = (option(args, 'policy') ?? 'shadow') as Policy;

  if (!policies.includes(policy)) {
    throw new Error(`Unknown policy ${policy}; use ${policies.join(', ')}`);
  }

  const config = await allocatorConfig(mode, combinationOf(option(args, 'config') ?? 'all-primary'), policy);
  const dataset = parseDatasetOption(option(args, 'dataset'));

  if (dataset) {
    await runDatasetEvaluation(config, dataset, args);
    return;
  }

  const result = runAllocator(await universeAll(), config);
  const outDir = stageDir('runs', 'single', config.key);
  const summary = await writeRun(outDir, result);

  await printReport(outDir, formatRunReport({ result, summary, outDir }), summary, args);
};

// The frozen studies run only on the protocol's inputs.
const datasetCommands = ['fixed', 'portfolio'];

export const run = async (args: string[]) => {
  const [command] = args;
  const started = Date.now();

  if (option(args, 'dataset') !== undefined && !datasetCommands.includes(command ?? '')) {
    throw new Error(
      `--dataset applies to fixed and portfolio only; ${command} is a frozen protocol study and runs on its archived inputs`
    );
  }

  switch (command) {
    case 'freeze-protocol': {
      const freeze = await freezeProtocol();

      log(`Protocol frozen at ${freeze.frozenAt}: sha256 ${freeze.protocolSha256}, git HEAD ${freeze.gitHead}`);
      break;
    }
    case 'audit':
      await auditData();
      break;
    case 'parity':
      await runParity();
      break;
    case 'fixed':
    case 'portfolio':
      await runSingle(command, args);
      break;
    case 'run': {
      await requireFrozen();

      const keys = option(args, 'keys')?.split(',');
      const specs = catalogue().filter((spec) => !keys || keys.includes(spec.key));
      const { summaries } = await runCatalogue(await universeAll(), specs, () => false);

      if (!keys) {
        await writeSummaries(summaries);
      }

      break;
    }
    case 'illustration':
      await requireFrozen();
      await runIllustration(await universeAll());
      break;
    case 'audit-ledger':
      await requireFrozen();
      await auditLedgers(await universeAll());
      break;
    case 'stress':
      await requireFrozen();
      await runStress(await universeAll(), option(args, 'only')?.split(','));
      break;
    case 'final-validation':
      await requireFrozen();
      await runFinalValidation(await universeAll());
      break;
    case 'compare':
    case 'report':
      await renderReports();
      break;
    case 'all': {
      await requireFrozen();
      await auditData();
      await runParity();

      const universe = await universeAll();
      const { summaries } = await runCatalogue(universe, catalogue(), () => false);

      await writeSummaries(summaries);
      await auditLedgers(universe);
      await runStress(universe);
      await runIllustration(universe);
      await renderReports();
      await writeForwardFreeze();
      await writeManifest(resultsRoot, path.join(resultsRoot, 'MANIFEST.json'));
      break;
    }
    case 'forward-freeze': {
      const record = await writeForwardFreeze();

      log(`Forward-test freeze written: ${Object.keys(record.frozen.code).length} code files hashed`);
      break;
    }
    case 'manifest': {
      const count = await writeManifest(resultsRoot, path.join(resultsRoot, 'MANIFEST.json'));

      log(`Manifest of ${count} files`);
      break;
    }
    default:
      throw new Error(`Unknown command ${command ?? '(none)'}; see src/multi-etf-allocator/cli.ts`);
  }

  log(`${command} done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
};
