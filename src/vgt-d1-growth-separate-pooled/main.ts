// vgt-d1-growth-separate-pooled — the command line (run from the repository root):
//
//   npm run vgt-pair -- preflight                       the optimization-standard adoption check
//   npm run vgt-pair -- manifest --dry-run              print the manifest that would be sealed (evaluates nothing)
//   npm run vgt-pair -- manifest                        seal COMPARISON_MANIFEST.json (once; then commit it)
//   npm run vgt-pair -- compare                         the six cases and the comparators on D24 and FULL (guarded)
//   npm run vgt-pair -- neighbourhood [--workers W]     the development neighbourhood instrument (D24, guarded)
//   npm run vgt-pair -- neighbourhood --pilot NAME [--kill-worker-after N]   interruption tests (nothing sealed)
//   npm run vgt-pair -- verify                          recompute every sealed record's sha256 against seals.jsonl
//   npm run vgt-pair -- launch --unit NAME [--wait] -- <command and options>   a transient unit inside the study slice
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { checkAdoption } from '../research-standard/preflight.ts';
import { STUDY, repoRoot, researchDir, resources, resultsDir, sealsLog } from './context.ts';
import { rel, sha256File } from './records.ts';

const args = process.argv.slice(2);
const command = args[0];
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string) => args.includes(`--${name}`);

const ensureSlice = () => {
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

const launch = (unit: string, stageArgs: string[], wait: boolean) => {
  const logFile = path.join(resultsDir, 'logs', `${unit}.log`);

  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  const slice = ensureSlice();
  const r = spawnSync(
    'systemd-run',
    [
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
      ...(wait ? ['--wait'] : []),
      process.execPath,
      '--expose-gc',
      `--max-old-space-size=${resources.coordinatorOldSpaceMb}`,
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      path.join(repoRoot, 'src', STUDY, 'main.ts'),
      ...stageArgs
    ],
    { encoding: 'utf8' }
  );

  return { status: r.status, stderr: r.stderr.trim(), log: rel(logFile), slice };
};

const main = async () => {
  switch (command) {
    case 'preflight': {
      const r = checkAdoption(researchDir, { repoRoot });

      console.log(JSON.stringify(r, null, 1));
      process.exit(r.ok ? 0 : 1);
      break;
    }

    case 'manifest': {
      const { buildManifest, sealManifest } = await import('./manifest.ts');

      if (flag('dry-run')) console.log(JSON.stringify(buildManifest(), null, 1));
      else {
        const { sha } = sealManifest();

        console.log(`sealed ${rel(path.join(researchDir, 'COMPARISON_MANIFEST.json'))} sha256 ${sha}`);
      }
      break;
    }

    case 'compare': {
      const { runComparison } = await import('./compare.ts');

      await runComparison();
      break;
    }

    case 'neighbourhood': {
      const { runNeighbourhood } = await import('./neighbourhood.ts');

      await runNeighbourhood({
        workers: Number(opt('workers') ?? resources.workers),
        pilot: opt('pilot'),
        killWorkerAfter: opt('kill-worker-after') ? Number(opt('kill-worker-after')) : undefined
      });
      break;
    }

    case 'verify': {
      const seals = fs
        .readFileSync(sealsLog, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l) as { file: string; sha256: string });
      const bad = seals.filter((s) => sha256File(path.join(repoRoot, s.file)) !== s.sha256);

      for (const s of seals) console.log(`${bad.includes(s) ? 'MISMATCH' : 'ok'} ${s.sha256.slice(0, 16)} ${s.file}`);
      process.exit(bad.length ? 1 : 0);
      break;
    }

    case 'launch': {
      const unit = opt('unit');

      if (!unit || !args.includes('--')) throw new Error('launch --unit NAME [--wait] -- <command>');

      const r = launch(unit, args.slice(args.indexOf('--') + 1), flag('wait'));

      console.log(JSON.stringify({ unit, ...r }));
      process.exit(r.status ?? 1);
      break;
    }

    default:
      throw new Error(`unknown command ${command ?? '(none)'}`);
  }
};

await main();
