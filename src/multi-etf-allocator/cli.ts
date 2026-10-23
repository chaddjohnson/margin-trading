// The multi-ETF allocator's commands: `npm run multi-etf-allocator -- <command> [options]`.
//
//   freeze-protocol                         hash and record PROTOCOL.md before any allocator result (once)
//   audit                                   data, calendar, distribution and fresh-data coverage audit → results/audit/
//   parity                                  the seven fixed controls and portfolio A/B against their references
//   fixed --policy P --config C             one fixed-$100k run → results/runs/single/<key>/
//   portfolio --policy P --config C         one 20%-portfolio run → results/runs/single/<key>/
//   run [--keys K1,K2]                      the whole catalogue (controls, 8 combinations × policies, both modes)
//   stress [--only static,paths,sensitivities]   the margin and execution stress program → results/stress/
//   illustration                            amendment A1: beyond-grid call mechanics on the real ledger (post hoc)
//   audit-ledger                            independent recomputation of the principal runs' ledgers
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
import { runIllustration } from './illustration.ts';
import { runStress } from './stress.ts';
import { runAllocator } from './engine.ts';

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

const runSingle = async (mode: 'fixed' | 'portfolio', args: string[]) => {
  await requireFrozen();

  const policy = (option(args, 'policy') ?? 'shadow') as Policy;

  if (!policies.includes(policy)) {
    throw new Error(`Unknown policy ${policy}; use ${policies.join(', ')}`);
  }

  const config = await allocatorConfig(mode, combinationOf(option(args, 'config') ?? 'all-primary'), policy);
  const result = runAllocator(await universeAll(), config);
  const summary = await writeRun(stageDir('runs', 'single', config.key), result);

  log(JSON.stringify(summary, null, 1));
};

export const run = async (args: string[]) => {
  const [command] = args;
  const started = Date.now();

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
