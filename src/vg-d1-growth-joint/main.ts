// vg-d1-growth-joint — the command line (run from the repository root):
//
//   npm run vg-joint -- <command> [options]
//
//   doors | fixtures | parity [--dry] | freeze-protocol | bench --door D24 --centres N --workers W [--label L]
//   search --cutoff C --arm indep|gpair|informed [--pilot RUN] [--workers W] [--stop-after N] [--kill-worker-after N]
//   qualify-gpair --cutoff C [--pilot RUN] | qualify --cutoff C [--pilot RUN] | fold-eval --cutoff C [--pilot RUN]
//   sequential | diagnostics | freeze-selection | validate [--pilot RUN] [--workers W]
//   verify (every sealed record against results/seals.jsonl)
//   launch --unit NAME [--wait] -- <command and options>   (a transient systemd user unit inside the study slice)
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Arm } from './budgets.ts';
import { STUDY, cacheRoot, doorSpecs, log, nodeBinary, repoRoot, resources, resultsDir, sealsLog } from './context.ts';
import { buildDoors, sha256File } from './data.ts';
import {
  type Env,
  cutoffs,
  finalCutoff,
  runFoldEval,
  runQualify,
  runQualifyGpair,
  runSearch,
  studyEnv
} from './stages.ts';

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

export const launch = (
  unit: string,
  stageArgs: string[],
  options: { wait?: boolean; env?: Record<string, string> } = {}
) => {
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
    ...Object.entries(options.env ?? {}).flatMap(([k, v]) => ['-E', `${k}=${v}`]),
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
  const workers = Number(opt('workers', '15'));
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
    killWorkerAfter: opt('kill-worker-after') ? Number(opt('kill-worker-after')) : undefined
  };
};

const cutoffArg = () => {
  const c = opt('cutoff');

  if (!c || !cutoffs[c]) throw new Error(`--cutoff must be one of ${Object.keys(cutoffs).join(', ')}`);
  if (c === 'P18' && !opt('pilot')) throw new Error('P18 is the pilot pseudo-fold');
  if (c === 'C24' && opt('pilot')) throw new Error('a pilot uses the pseudo-fold P18, never C24');
  return c;
};

const armArg = (cut: string): Arm => {
  const a = opt('arm') as Arm | undefined;

  if (a !== 'indep' && a !== 'gpair' && a !== 'informed') throw new Error('--arm must be indep, gpair or informed');
  if (a !== 'indep' && !finalCutoff(cut)) throw new Error(`arm ${a} runs at the final cutoff only`);
  return a;
};

// Every sealed record still matches the sha256 it was sealed with (the last entry per file).
export const verifySeals = () => {
  const lines = fs.existsSync(sealsLog) ? fs.readFileSync(sealsLog, 'utf8').trim().split('\n').filter(Boolean) : [];
  const last = new Map<string, string>();

  for (const l of lines) {
    const x = JSON.parse(l) as { file: string; sha256: string };

    if (!x.file.startsWith('.cache/')) last.set(x.file, x.sha256);
  }

  const out = [...last.entries()].map(([file, sha]) => {
    const abs = path.join(repoRoot, file);
    const ok = fs.existsSync(abs) && sha256File(abs) === sha && (fs.statSync(abs).mode & 0o222) === 0;

    return { file, ok };
  });

  for (const x of out) console.log(`${x.ok ? 'ok  ' : 'FAIL'} ${x.file}`);
  if (out.some((x) => !x.ok)) process.exit(1);
};

const main = async () => {
  switch (command) {
    case 'doors': {
      const pins = buildDoors();

      fs.mkdirSync(resultsDir, { recursive: true });
      fs.writeFileSync(
        path.join(resultsDir, 'doors-pins.json'),
        `${JSON.stringify({ canonical: { GDX: 'data/GDX/data.csv', VGT: 'data/VGT/data.csv' }, doors: doorSpecs, verified: pins }, null, 1)}\n`
      );
      log('doors built and verified against their pins');
      break;
    }

    case 'fixtures': {
      const { resolveControls, writeFixtures } = await import('./controls.ts');

      writeFixtures(await resolveControls());
      log('fixtures written');
      break;
    }

    case 'parity': {
      const { runParity } = await import('./parityStage.ts');

      await runParity(opt('name', 'parity'), flag('dry'));
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
        Number(opt('centres', '64')),
        Number(opt('workers', '15')),
        opt('label', 'bench')!
      );
      break;
    }

    case 'search': {
      const cut = cutoffArg();

      await runSearch(cut, armArg(cut), envOf());
      break;
    }

    case 'qualify-gpair':
      await runQualifyGpair(cutoffArg(), envOf());
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

      await runDiagnostics(envOf());
      break;
    }

    case 'freeze-selection': {
      const { freezeSelection } = await import('./post.ts');

      await freezeSelection(envOf());
      break;
    }

    case 'validate': {
      const { runValidation } = await import('./post.ts');

      await runValidation(Number(opt('workers', '15')), envOf());
      break;
    }

    case 'verify':
      verifySeals();
      break;

    case 'launch': {
      const unit = opt('unit');
      const rest = args.slice(args.indexOf('--') + 1);

      if (!unit || !args.includes('--')) throw new Error('launch --unit NAME [--wait] -- <command>');

      const r = launch(unit, rest, {
        wait: flag('wait'),
        env: Object.fromEntries(
          ['VGJ_BOOK_CACHE', 'VGJ_GC_EVERY'].filter((k) => process.env[k]).map((k) => [k, process.env[k]!])
        )
      });

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
      console.log(execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim());
      break;

    default:
      throw new Error(`unknown command ${command ?? '(none)'}`);
  }
};

await main();
