// vgt-d1-growth-joint — the command line (run from the repository root):
//
//   npm run vgt-joint -- <command> [options]
//
//   doors | fixtures | parity | freeze-protocol | bench --door D24 --n N --workers W
//   search --cutoff C [--pilot RUN] [--workers W] [--stop-after N] [--kill-worker-after N] [--lanes indep]
//   qualify --cutoff C [--pilot RUN] [--workers W]
//   fold-eval --cutoff C [--pilot RUN]
//   sequential | diagnostics | freeze-selection | validate | report
//   launch --unit NAME [--wait] -- <command and options>   (a transient systemd user unit inside the study slice)
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  STUDY,
  cacheRoot,
  doorSpecs,
  log,
  nodeBinary,
  repoRoot,
  researchDir,
  resources,
  resultsDir
} from './context.ts';
import { buildDoors, sha256File } from './data.ts';
import { type Env, cutoffs, runFoldEval, runQualify, runSearch, studyEnv } from './stages.ts';

const args = process.argv.slice(2);
const command = args[0];
const opt = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1]! : fallback;
};
const flag = (name: string) => args.includes(`--${name}`);

export const ensureSlice = () => {
  const r = spawnSync(
    'systemctl',
    [
      '--user',
      'set-property',
      '--runtime',
      resources.slice,
      `MemoryHigh=${resources.memoryHigh}`,
      `MemoryMax=${resources.memoryMax}`,
      `MemorySwapMax=${resources.memorySwapMax}`
    ],
    { encoding: 'utf8' }
  );

  if (r.status !== 0) throw new Error(`could not set the slice limits: ${r.stderr}`);

  return spawnSync(
    'systemctl',
    ['--user', 'show', resources.slice, '-p', 'MemoryHigh', '-p', 'MemoryMax', '-p', 'MemorySwapMax'],
    {
      encoding: 'utf8'
    }
  ).stdout.trim();
};

export const launch = (unit: string, stageArgs: string[], options: { wait?: boolean } = {}) => {
  const logFile = path.join(resultsDir, 'logs', `${unit}.log`);

  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  const slice = ensureSlice();
  const argv = [
    '--user',
    `--unit=${unit}`,
    `--slice=${resources.slice}`,
    `--description=${STUDY} ${stageArgs.join(' ')}`,
    '--collect',
    '-p',
    `MemoryHigh=${resources.memoryHigh}`,
    '-p',
    `MemoryMax=${resources.memoryMax}`,
    '-p',
    `MemorySwapMax=${resources.memorySwapMax}`,
    '-p',
    'KillMode=mixed',
    '-p',
    'TimeoutStopSec=120',
    '-p',
    'Restart=no',
    '-p',
    `StandardOutput=append:${logFile}`,
    '-p',
    `StandardError=append:${logFile}`,
    `--working-directory=${repoRoot}`,
    ...(options.wait ? ['--wait'] : []),
    nodeBinary,
    '--expose-gc',
    `--max-old-space-size=${resources.coordinatorOldSpaceMb}`,
    '--experimental-transform-types',
    '--disable-warning=ExperimentalWarning',
    path.join(repoRoot, 'src', STUDY, 'main.ts'),
    ...stageArgs
  ];
  const r = spawnSync('systemd-run', argv, { encoding: 'utf8' });

  return { status: r.status, stdout: r.stdout, stderr: r.stderr, logFile, slice };
};

const envOf = (): Env => {
  const workers = Number(opt('workers', '14'));
  const pilot = opt('pilot');

  if (!pilot) {
    if (opt('stop-after') || opt('kill-worker-after')) throw new Error('interruption options are for pilot runs only');
    return studyEnv(workers);
  }

  return {
    schedule: 'pilot',
    prefix: `pilot-${pilot}-`,
    outDir: path.join(cacheRoot, 'pilot', pilot),
    workers,
    stopAfterFresh: opt('stop-after') ? Number(opt('stop-after')) : undefined,
    killWorkerAfter: opt('kill-worker-after') ? Number(opt('kill-worker-after')) : undefined,
    lanes: (opt('lanes') as Env['lanes']) ?? 'all'
  };
};

const cutoffArg = () => {
  const c = opt('cutoff');

  if (!c || !cutoffs[c]) throw new Error(`--cutoff must be one of ${Object.keys(cutoffs).join(', ')}`);
  if (c === 'P18' && !opt('pilot')) throw new Error('P18 is the pilot pseudo-fold');
  return c;
};

const main = async () => {
  switch (command) {
    case 'doors': {
      const pins = buildDoors();

      fs.mkdirSync(resultsDir, { recursive: true });
      fs.writeFileSync(
        path.join(resultsDir, 'doors-pins.json'),
        `${JSON.stringify({ canonical: 'data/VGT/data.csv', doors: { ...doorSpecs }, verified: pins }, null, 1)}\n`
      );
      log('doors built and verified against their pins');
      break;
    }

    case 'fixtures': {
      const { resolveControls, writeFixtures } = await import('./controls.ts');
      const body = writeFixtures(await resolveControls());

      log(`fixtures written (${Object.keys(body.d1).length} D1, ${Object.keys(body.growth).length} Growth)`);
      break;
    }

    case 'parity': {
      const { runParity } = await import('./parityStage.ts');

      await runParity(opt('name', 'parity'));
      break;
    }

    case 'freeze-protocol': {
      const { freezeProtocol } = await import('./freeze.ts');

      freezeProtocol();
      break;
    }

    case 'bench': {
      const { bench } = await import('./bench.ts');

      await bench(
        opt('door', 'D24') as never,
        Number(opt('n', '1000')),
        Number(opt('workers', '14')),
        opt('label', 'bench')!
      );
      break;
    }

    case 'search':
      await runSearch(cutoffArg(), envOf());
      break;

    case 'qualify':
      await runQualify(cutoffArg(), envOf());
      break;

    case 'fold-eval':
      await runFoldEval(cutoffArg(), envOf());
      break;

    case 'sequential': {
      const { runSequential } = await import('./post.ts');

      await runSequential(envOf());
      break;
    }

    case 'diagnostics': {
      const { runDiagnostics } = await import('./post.ts');

      await runDiagnostics(envOf(), opt('part'));
      break;
    }

    case 'freeze-selection': {
      const { freezeSelection } = await import('./post.ts');

      await freezeSelection(opt('pilot') ? envOf() : undefined);
      break;
    }

    case 'validate': {
      const { runValidation } = await import('./post.ts');

      await runValidation(Number(opt('workers', '6')), opt('pilot') ? envOf() : undefined);
      break;
    }

    case 'launch': {
      const unit = opt('unit');
      const rest = args.slice(args.indexOf('--') + 1);

      if (!unit || !args.includes('--')) throw new Error('launch --unit NAME [--wait] -- <command>');

      const r = launch(unit, rest, { wait: flag('wait') });

      console.log(
        JSON.stringify({
          unit,
          status: r.status,
          log: path.relative(repoRoot, r.logFile),
          slice: r.slice,
          stderr: r.stderr.trim()
        })
      );
      process.exit(r.status ?? 1);
      break;
    }

    case 'head':
      console.log(
        execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim(),
        sha256File(path.join(researchDir, 'brief', 'BRIEF.md'))
      );
      break;

    default:
      throw new Error(`unknown command ${command ?? '(none)'}`);
  }
};

await main();
