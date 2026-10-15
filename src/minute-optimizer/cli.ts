// Command line for the VGT minute optimizer. See research/vgt-minute-optimizer/README.md.
//
//   npm run minute-optimizer -- <command> [options]
import fs from 'fs-extra';
import path from 'node:path';
import { flagBoolean, flagInteger, flagString, parseArgs } from '../optimizer/args.ts';
import { defaultSearch } from '../optimizer/search.ts';
import { benchmark } from './benchmark.ts';
import { defaultDataFile, loadSessions, researchDataset, sha256File } from './data.ts';
import {
  type MinuteExperimentConfig,
  defaultExperiment,
  researchDir,
  resultsRoot,
  runExperiment
} from './experiment.ts';
import { runGoldenMaster, verifyProtectedFiles } from './goldenMaster.ts';
import { LocalEvaluator, type MinuteEvaluator, WorkerPool, defaultWorkerCount } from './pool.ts';
import { codeHash, environment } from './provenance.ts';
import { defaultMinuteSelection } from './selection.ts';

const help = `VGT minute optimizer (research/vgt-minute-optimizer)

Commands:
  verify-protected            sha256 of src/app/allIn.ts and src/app/allin-original.ts against the recorded values
  golden-master               original vs working copy vs fast engine (writes baseline/golden-master.json)
      --variants N (40)  --engine-vectors N (300)  --fixtures N (4)  --seed N (20261016)
  benchmark                   engine throughput in-process and with 1/2/4/8 workers (writes baseline/benchmark.json)
  run                         walk-forward folds, final development run, replicates and controls
      --experiment ID (main)  --workers N  --local  --seed N  --top-n 5..10
      --samples N  --population N  --generations N  --ga-runs N  --max-evals N
      --folds fold-2020,...  --no-final  --control-seeds N (3)  --replicates N (2)
      --pilot                 a small end-to-end pilot (256 Sobol, population 32, 5 generations, fold-2020)
  diagnose                    score the incumbent and deep-dip controls with the selection policy (development window)
      --experiment ID (main)
  report                      regenerate the markdown reports and the candidate files (refused once frozen)
      --experiment ID (main)
  freeze                      lock the final shortlist and rank 1 before the final evaluation
      --experiment ID (main)
  final-evaluation            the one-time 2024-2025 evaluation of the frozen rank 1 against the incumbent
      --experiment ID (main)  --rerun-reason TEXT (required for a second run)
`;

const writeJson = async (file: string, value: unknown) => {
  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, `${JSON.stringify(value, null, 1)}\n`);
};

export const runCli = async (argv: string[]) => {
  const args = parseArgs(argv);
  const log = (line: string) => console.log(line);

  switch (args.command) {
    case 'verify-protected': {
      const results = await verifyProtectedFiles();

      results.forEach((result) =>
        log(`${result.unchanged ? 'unchanged' : 'CHANGED'}  ${result.file}  ${result.actual}`)
      );
      break;
    }

    case 'golden-master': {
      const report = await runGoldenMaster({
        scratchDir: path.join(researchDir, 'tmp', 'golden-master'),
        variants: flagInteger(args, 'variants', 40, 0),
        engineVectors: flagInteger(args, 'engine-vectors', 300, 0),
        fixtures: flagInteger(args, 'fixtures', 4, 0),
        seed: flagInteger(args, 'seed', 20261016),
        log
      });

      await writeJson(path.join(researchDir, 'baseline', 'golden-master.json'), report);
      log(
        `File cases identical: ${report.fileCases.identical}/${report.fileCases.total}; engine cases identical: ${report.engineCases.identical}/${report.engineCases.total} (largest minute-drawdown gap ${report.engineCases.maximumMinuteDrawdownGap}); ${report.seconds.toFixed(0)} s`
      );

      if (
        report.fileCases.identical !== report.fileCases.total ||
        report.engineCases.identical !== report.engineCases.total
      ) {
        process.exitCode = 1;
      }

      break;
    }

    case 'benchmark': {
      const sessions = (await loadSessions(defaultDataFile)).filter((session) => session.date <= '2023-12-31');
      const dataset = researchDataset(sessions, await sha256File(defaultDataFile), '2023-12-31');
      const report = await benchmark({
        dataset,
        sessions,
        samples: flagInteger(args, 'samples', 4096, 1),
        repeats: flagInteger(args, 'repeats', 3, 1),
        workerCounts: [1, 2, 4, 8],
        log
      });

      await writeJson(path.join(researchDir, 'baseline', 'benchmark.json'), report);
      break;
    }

    case 'run': {
      await verifyProtectedFiles();

      const pilot = flagBoolean(args, 'pilot');
      const experimentId = flagString(args, 'experiment', pilot ? 'pilot' : 'main')!;

      if (await fs.pathExists(path.join(resultsRoot(experimentId), 'freeze', 'freeze.json'))) {
        throw new Error(`Experiment ${experimentId} is frozen; its search can't be rerun`);
      }

      const base = defaultExperiment();
      const search = {
        ...defaultSearch,
        ...(pilot ? { samples: 256, populationSize: 32, generations: 5, gaRuns: 1, maxEvaluationsPerGaRun: 500 } : {})
      };
      const config: MinuteExperimentConfig = defaultExperiment({
        id: experimentId,
        seed: flagInteger(args, 'seed', base.seed),
        search: {
          ...search,
          samples: flagInteger(args, 'samples', search.samples, 1),
          populationSize: flagInteger(args, 'population', search.populationSize, 4),
          generations: flagInteger(args, 'generations', search.generations, 0),
          gaRuns: flagInteger(args, 'ga-runs', search.gaRuns, 0),
          maxEvaluationsPerGaRun: flagInteger(args, 'max-evals', search.maxEvaluationsPerGaRun, 1)
        },
        selection: { ...defaultMinuteSelection, topN: flagInteger(args, 'top-n', pilot ? 5 : 10, 5, 10) },
        folds: (flagString(args, 'folds') ?? (pilot ? 'fold-2020' : base.folds.join(','))).split(','),
        final: !pilot && !flagBoolean(args, 'no-final'),
        controlSeeds: flagInteger(args, 'control-seeds', pilot ? 0 : base.controlSeeds, 0),
        replicateSeeds: flagInteger(args, 'replicates', pilot ? 0 : base.replicateSeeds, 0)
      });
      const started = Date.now();
      const dataHash = await sha256File(defaultDataFile);
      const sessions = (await loadSessions(defaultDataFile)).filter(
        (session) => session.date <= config.protocol.researchEnd
      );
      const dataset = researchDataset(sessions, dataHash, config.protocol.researchEnd);
      const evaluator: MinuteEvaluator = flagBoolean(args, 'local')
        ? new LocalEvaluator()
        : new WorkerPool({ size: flagInteger(args, 'workers', defaultWorkerCount(), 1) });

      evaluator.register(dataset);
      log(
        `Experiment ${config.id}: ${dataset.sessionCount} research sessions to ${dataset.lastDate}, ${evaluator.description}`
      );

      try {
        await runExperiment({ config, dataset, sessions, evaluator, codeHash: await codeHash(), log });
      } finally {
        await evaluator.close();
      }

      await writeJson(path.join(resultsRoot(config.id), 'run-manifest.json'), {
        command: ['run', ...argv.slice(1)].join(' '),
        completedAtUtc: new Date().toISOString(),
        seconds: (Date.now() - started) / 1000,
        evaluator: evaluator.description,
        dataFile: defaultDataFile,
        dataHash,
        researchEnd: config.protocol.researchEnd,
        environment: await environment(),
        protectedFiles: await verifyProtectedFiles()
      });
      log(`Done in ${((Date.now() - started) / 1000).toFixed(0)} s`);
      break;
    }

    case 'diagnose': {
      const { controlDiagnostics } = await import('./diagnostics.ts');

      await controlDiagnostics(flagString(args, 'experiment', 'main')!, log);
      break;
    }

    case 'report': {
      const { writeReports } = await import('./report.ts');

      await writeReports(flagString(args, 'experiment', 'main')!, log);
      break;
    }

    case 'freeze': {
      const { freeze } = await import('./finalEvaluation.ts');

      await freeze(flagString(args, 'experiment', 'main')!, log);
      break;
    }

    case 'final-evaluation': {
      const { finalEvaluation } = await import('./finalEvaluation.ts');

      await finalEvaluation(flagString(args, 'experiment', 'main')!, flagString(args, 'rerun-reason'), log);
      break;
    }

    default:
      console.log(help);
  }
};
