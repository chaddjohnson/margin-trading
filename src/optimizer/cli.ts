import fs from 'fs-extra';
import path from 'node:path';
import { flagBoolean, flagInteger, flagString, parseArgs } from './args.ts';
import { runDataAudit } from './data/audit.ts';
import { originalFile, originalGitBlob, runGoldenSuite, verifyOriginalUnchanged } from './goldenMaster.ts';
import { type PrepareMode, defaultArchive, prepareData, readManifest, validateCachedData } from './data/prepare.ts';
import { type ExperimentConfig, resultsRoot, runExperiment } from './experiment.ts';
import { benchmark } from './benchmark.ts';
import { freeze, runHoldout, runStress } from './holdout.ts';
import { loadExperiment, writeTopCandidates, writeWalkForward } from './report.ts';
import { defaultFitness } from './fitness.ts';
import { defaultParameterSpace } from './params.ts';
import { LocalEvaluator, WorkerPool, defaultWorkerCount } from './pool.ts';
import { loadProtocol } from './protocol.ts';
import { environment } from './provenance.ts';
import { defaultSearch } from './search.ts';
import { defaultSelection } from './selection.ts';
import { requiredSymbols, resolveSymbols } from './universe.ts';

export const researchDir = 'research/multi-asset-optimizer';

const sortRequiredFirst = (a: string, b: string) => {
  const rank = (symbol: string) => (requiredSymbols.includes(symbol) ? requiredSymbols.indexOf(symbol) : 1000);

  return rank(a) - rank(b) || a.localeCompare(b);
};

const today = () => new Date().toISOString().slice(0, 10);

const usage = `Usage: npm run optimizer -- <command> [options]

Data
  prepare-data      Acquire, transform and validate Stooq daily data
                    --symbols default|VGT,QQQ,...   (default: the 21 required symbols)
                    --start 2005-01-01 --end YYYY-MM-DD (default: today)
                    --refresh            re-acquire even when the cache is valid
                    --offline            no network: cache, inbox and archive only
                    --regenerate         rebuild processed files from saved raw files only
                    --stooq-archive PATH bulk archive (default ${defaultArchive}); --no-archive disables it
                    (writes DATA_AUDIT.md afterwards, also after partial failures)
  validate-data     Check cached raw/processed files against the manifest (no network)
  audit-data        Rewrite DATA_AUDIT.md and the manifest copy from the cached data

Strategy equivalence
  golden-master     Run the original and the working copy on the same bars and compare every output
                    file and console line (all cases end by the research end). Writes
                    baseline/golden-master.json. --variants 12 (random parameter vectors per series)

Performance
  benchmark         Time 4,096 Sobol evaluations on one symbol's 2014-2023 window in-process and with
                    1, 2, 4 and 8 worker threads (--symbols VGT --samples 4096 --repeats 3)

Optimization (research data only: nothing after the protocol's research end is loaded)
  walk-forward      Folds 2019-2023, the final 2014-2023 shortlist and the Sobol/random control
                    --symbols default|VGT,...   --experiment ID (default main)   --seed TEXT
                    --samples 4096 --population 128 --generations 60 --ga-runs 2 --max-evals 6000
                    --top-n 10 (5-10)   --control-seeds 3   --workers N (default ${defaultWorkerCount()})
                    --ticker-concurrency 3   --no-folds   --local (no worker threads)
                    --smoke (tiny budgets, experiment "smoke")   --protocol FILE
                    Completed runs are checkpointed and resumed when the configuration matches.
  report            Regenerate TOP_CANDIDATES.md/.json/.csv and WALK_FORWARD_RESULTS.md (--experiment ID)

Freeze, holdout and stress (in this order)
  freeze            Write the reports and freeze every symbol's shortlist and rank 1 (--experiment ID)
                    --replace-reason TEXT  replace an existing freeze (only before the holdout has run)
  holdout           Verify the freeze, then run each frozen rank 1 once on the holdout
                    --rerun-reason TEXT    required to run it a second time; recorded in the report
  stress            Run frozen rank 1 and the original on 2005-2013 (after the freeze; informational)
`;

const manifestSummary = async (symbols: string[]) => {
  const manifest = await readManifest();

  return Object.fromEntries(
    symbols.map((symbol) => {
      const entry = manifest.entries[symbol];

      return [
        symbol,
        entry
          ? {
              status: entry.status,
              source: entry.source,
              processedSha256: entry.processed?.sha256,
              rawSha256: entry.raw?.sha256
            }
          : { status: 'missing' }
      ];
    })
  );
};

export const experimentConfig = async (args: ReturnType<typeof parseArgs>): Promise<ExperimentConfig> => {
  const smoke = flagBoolean(args, 'smoke');
  const search = {
    ...defaultSearch,
    samples: flagInteger(args, 'samples', smoke ? 64 : defaultSearch.samples, 1),
    populationSize: flagInteger(args, 'population', smoke ? 16 : defaultSearch.populationSize, 4),
    generations: flagInteger(args, 'generations', smoke ? 4 : defaultSearch.generations, 0),
    gaRuns: flagInteger(args, 'ga-runs', smoke ? 1 : defaultSearch.gaRuns, 0),
    maxEvaluationsPerGaRun: flagInteger(args, 'max-evals', smoke ? 200 : defaultSearch.maxEvaluationsPerGaRun, 1)
  };

  return {
    id: flagString(args, 'experiment', smoke ? 'smoke' : 'main')!,
    seed: flagString(args, 'seed', '20261015')!,
    symbols: resolveSymbols(flagString(args, 'symbols', smoke ? 'VGT' : undefined)),
    protocol: await loadProtocol(flagString(args, 'protocol')),
    space: defaultParameterSpace,
    search,
    fitness: defaultFitness,
    selection: { ...defaultSelection, topN: flagInteger(args, 'top-n', defaultSelection.topN, 5, 10) },
    controlSeeds: flagInteger(args, 'control-seeds', smoke ? 1 : 3, 0),
    runFolds: !flagBoolean(args, 'no-folds'),
    tickerConcurrency: flagInteger(args, 'ticker-concurrency', 3, 1)
  };
};

export const runCli = async (argv: string[]) => {
  const args = parseArgs(argv);
  const log = (line: string) => console.log(line);

  switch (args.command) {
    case 'prepare-data': {
      const mode: PrepareMode = flagBoolean(args, 'regenerate')
        ? 'regenerate'
        : flagBoolean(args, 'offline')
          ? 'offline'
          : flagBoolean(args, 'refresh')
            ? 'refresh'
            : 'missing';

      const symbols = resolveSymbols(flagString(args, 'symbols'));
      const manifest = await prepareData({
        symbols,
        startDate: flagString(args, 'start', '2005-01-01')!,
        endDate: flagString(args, 'end', today())!,
        mode,
        archive: flagBoolean(args, 'no-archive') ? undefined : flagString(args, 'stooq-archive', defaultArchive),
        requestSpacingMs: flagInteger(args, 'request-spacing-ms', 1500, 0),
        log
      });

      await runDataAudit(
        manifest,
        Object.keys(manifest.entries).sort(sortRequiredFirst),
        await loadProtocol(flagString(args, 'protocol')),
        researchDir,
        log
      );
      break;
    }

    case 'audit-data': {
      const manifest = await readManifest();

      await runDataAudit(
        manifest,
        Object.keys(manifest.entries).sort(sortRequiredFirst),
        await loadProtocol(flagString(args, 'protocol')),
        researchDir,
        log
      );
      break;
    }

    case 'validate-data': {
      const results = await validateCachedData(resolveSymbols(flagString(args, 'symbols')), log);

      if (results.some((result) => !result.ok)) {
        process.exitCode = 1;
      }

      break;
    }

    case 'golden-master': {
      const protocol = await loadProtocol(flagString(args, 'protocol'));
      const originalSha = await verifyOriginalUnchanged();
      const scratchDir = path.join(researchDir, 'tmp', 'golden');

      await fs.remove(scratchDir);

      const results = await runGoldenSuite({
        manifest: await readManifest(),
        researchEnd: protocol.researchEnd,
        scratchDir,
        variantsPerSymbol: flagInteger(args, 'variants', 12, 0),
        log
      });
      const failed = results.filter((result) => !result.identical);

      await fs.ensureDir(path.join(researchDir, 'baseline'));
      await fs.writeFile(
        path.join(researchDir, 'baseline', 'golden-master.json'),
        `${JSON.stringify(
          {
            generatedAtUtc: new Date().toISOString(),
            original: { file: originalFile, sha256: originalSha, gitBlob: originalGitBlob },
            copy: 'src/app/allIn-optimizable.ts',
            comparison: 'byte-identical output files and console lines; no tolerance applied',
            cases: results.length,
            identical: results.length - failed.length,
            results
          },
          null,
          1
        )}\n`
      );
      log(`${results.length - failed.length}/${results.length} cases identical`);

      if (failed.length) {
        process.exitCode = 1;
      }

      break;
    }

    case 'benchmark': {
      const protocol = await loadProtocol(flagString(args, 'protocol'));
      const symbol = resolveSymbols(flagString(args, 'symbols', 'VGT'))[0]!;
      const result = await benchmark({
        manifest: await readManifest(),
        symbol,
        protocol,
        samples: flagInteger(args, 'samples', 4096, 1),
        repeats: flagInteger(args, 'repeats', 3, 1),
        workerCounts: [1, 2, 4, 8].filter((count) => count <= Math.max(1, defaultWorkerCount() + 2)),
        log
      });

      await fs.ensureDir(path.join(researchDir, 'baseline'));
      await fs.writeFile(path.join(researchDir, 'baseline', 'benchmark.json'), `${JSON.stringify(result, null, 1)}\n`);
      break;
    }

    case 'walk-forward': {
      const config = await experimentConfig(args);
      const outDir = resultsRoot(researchDir, config.id);
      const workers = flagInteger(args, 'workers', defaultWorkerCount(), 1, 256);
      const evaluator = flagBoolean(args, 'local') ? new LocalEvaluator() : new WorkerPool({ size: workers });
      const started = new Date();

      await fs.ensureDir(outDir);
      await fs.writeFile(path.join(outDir, 'experiment.json'), `${JSON.stringify(config, null, 1)}\n`);

      try {
        const env = await environment();
        const result = await runExperiment({
          config,
          manifest: await readManifest(),
          evaluator,
          codeHash: env.codeHash,
          outDir,
          log
        });

        await fs.writeFile(
          path.join(outDir, 'run-manifest.json'),
          `${JSON.stringify(
            {
              experiment: config.id,
              startedAtUtc: started.toISOString(),
              finishedAtUtc: new Date().toISOString(),
              elapsedSeconds: (Date.now() - started.getTime()) / 1000,
              evaluator: evaluator.description,
              environment: env,
              dataManifest: await manifestSummary(config.symbols),
              symbols: result.records,
              failures: result.failures
            },
            null,
            1
          )}\n`
        );

        if (result.failures.length) {
          process.exitCode = 1;
        }
      } finally {
        await evaluator.close();
      }

      break;
    }

    case 'report': {
      const experiment = await loadExperiment(resultsRoot(researchDir, flagString(args, 'experiment', 'main')!));

      if (await fs.pathExists(path.join(experiment.outDir, 'freeze', 'freeze.json'))) {
        throw new Error('This experiment is frozen; its reports are part of the freeze and are not regenerated.');
      }

      await writeTopCandidates(experiment, researchDir);
      await writeWalkForward(experiment, researchDir, await readManifest());
      log('Wrote TOP_CANDIDATES.md, top_candidates.json/.csv, nondominated_archive.csv, WALK_FORWARD_RESULTS.md');
      break;
    }

    case 'freeze': {
      await freeze(
        researchDir,
        resultsRoot(researchDir, flagString(args, 'experiment', 'main')!),
        await readManifest(),
        {
          replaceReason: flagString(args, 'replace-reason'),
          log
        }
      );
      break;
    }

    case 'holdout': {
      await runHoldout(
        researchDir,
        resultsRoot(researchDir, flagString(args, 'experiment', 'main')!),
        await readManifest(),
        {
          rerunReason: flagString(args, 'rerun-reason'),
          log
        }
      );
      log('Wrote FINAL_HOLDOUT_RESULTS.md');
      break;
    }

    case 'stress': {
      await runStress(
        researchDir,
        resultsRoot(researchDir, flagString(args, 'experiment', 'main')!),
        await readManifest(),
        log
      );
      log('Wrote STRESS_TEST_RESULTS.md');
      break;
    }

    default:
      console.log(usage);

      if (args.command && args.command !== 'help') {
        process.exitCode = 1;
      }
  }
};
